/* ============================================================================
   cell-bg.js — "Nucleoplasm"
   Living-chromatin background for biopelayo.github.io.
   Drop-in replacement for js/nucleosome-bg.js: same canvas (#nucleosome-canvas),
   same histone palette, same ~180 px mouse radius, same reduced-motion promise.
   Plain ES5, no dependencies, no build step.

   WHAT IS ON SCREEN
     - Chromatin fibres. Nucleosomes threaded on real linker DNA ("beads on a
       string", the 10 nm fibre). Two morphologies coexist, as in a nucleus:
       open euchromatin (long linkers, loose sway) and condensed
       heterochromatin (short linkers, two-start zigzag, dimmer, slower).
     - Nucleosome core particles as 3D objects, not circles with a ring. Each
       is a histone octamer (2x H2A, 2x H2B, 2x H3, 2x H4 -> eight lobes placed
       on the pseudo-two-fold: central (H3-H4)2 tetramer, one H2A-H2B dimer on
       each flank) wrapped by 147 bp of DNA in ~1.65 LEFT-handed superhelical
       turns, so TWO GYRES, depth-sorted front and back against the octamer.
       Particle 10.6 nm across, ~6.0 nm tall, drawn at a spread of 3D tilts.
     - H3 and H4 N-terminal tails leaving between the gyres, intrinsically
       disordered, wiggling. Some carry a PTM mark: this is where H3K27me3,
       H4K20me1 and the acetylations live.
     - DNA breathing. The terminal turns of the wrap unpeel and re-wrap, and
       the linker follows, so the fibre is tugged by it.
     - A transcription event. A polymerase-like complex tracks along a fibre,
       evicting nucleosomes ahead of it, with re-deposition behind; a nascent
       RNA trails from it.
     - Molecular crowding. Diffusing H2A-H2B and H3-H4 dimers (never mixed
       pairs) plus neutral non-histone factor complexes.
     - A drifting condensate / nucleolus-like density.

   GEOMETRY IS TO SCALE. Everything below is in nanometres and every on-screen
   size derives from it, linker length included: linkers are specified in base
   pairs and converted at 0.34 nm/bp.

   PERFORMANCE
     - Nucleosomes and crowders are pre-rendered sprites; per frame they cost
       one drawImage each. No shadowBlur anywhere. Blur is baked once into the
       far-layer sprites.
     - Object counts scale with viewport area and are capped.
     - devicePixelRatio capped at 2.
     - The loop stops when the document is hidden and when the canvas leaves
       the viewport (IntersectionObserver), and never starts under
       prefers-reduced-motion, which instead gets one static frame.

   Debug: window.__cellbg reports live counts (read-only, for the integrator).
   ============================================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('nucleosome-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var docEl = document.documentElement;
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------------- */
  /* 0. Palette. Brand-locked: this IS the site identity, do not substitute. */
  /* ---------------------------------------------------------------------- */
  var C_H2A = [52, 217, 110];    /* green  */
  var C_H2B = [34, 211, 238];    /* cyan   */
  var C_H3 = [94, 170, 255];     /* blue   */
  var C_H4 = [244, 114, 182];    /* pink   */
  var C_DNA = [100, 170, 255];   /* soft blue */
  var C_FAC = [201, 219, 240];   /* neutral steel: non-histone factors only */

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* ---------------------------------------------------------------------- */
  /* 1. Nucleosome geometry (nanometres).                                    */
  /* ---------------------------------------------------------------------- */
  var SH_R = 4.30;       /* DNA superhelix radius, centre line              */
  var SH_PITCH = 2.40;   /* rise per superhelical turn                      */
  var TURNS = 1.65;      /* 147 bp = ~1.65 turns, LEFT-handed               */
  var DNA_W = 2.00;      /* B-DNA duplex diameter                           */
  var CORE_R = 3.35;     /* histone octamer radius                          */
  var CORE_H = 4.40;     /* histone octamer height                          */
  var PARTICLE = 2 * SH_R + DNA_W;      /* 10.6 nm across the disc          */
  var S_END = TURNS * TAU;
  var TH0 = S_END / 2;   /* puts the dyad at theta = 0                      */
  var RISE = SH_PITCH * TURNS;          /* 3.96 nm; +DNA -> 5.96 nm tall    */
  var BP_NM = 0.34;      /* B-DNA rise per base pair                        */
  var PEEL_S = 0.34 * TAU;              /* terminal wrap drawn dynamically  */
  var PEEL_N = 7;

  var SPR_NM = 13.6;     /* nm spanned by one sprite square                 */
  var SPR_CSS = 62;      /* canonical sprite square, CSS px                 */
  var SPR_K = SPR_NM / PARTICLE;        /* sprite width per particle width  */

  /* ---------------------------------------------------------------------- */
  /* 2. Small maths helpers.                                                 */
  /* ---------------------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var _p = [0, 0, 0];
  /* Project a model point. Camera looks down -depth; canvas y is down and
     model y is up, so the on-screen frame stays right-handed and the
     superhelix really does read left-handed. phi 0 = face-on, PI/2 = edge-on. */
  function project(x, y, z, cs, sn) {
    _p[0] = x;
    _p[1] = -y * cs + z * sn;
    _p[2] = y * sn + z * cs;
    return _p;
  }

  var _h = [0, 0, 0];
  /* Point on the DNA superhelix at arc parameter s. dr swells the radius and
     zs flattens the rise: together they unpeel a terminal turn. */
  function helix(s, dr, zs, cs, sn) {
    var th = TH0 - s;                       /* LEFT-handed: theta falls with s */
    var r = SH_R + dr;
    var p = project(r * Math.cos(th), r * Math.sin(th),
                    ((SH_PITCH / TAU) * s - RISE / 2) * zs, cs, sn);
    _h[0] = p[0]; _h[1] = p[1]; _h[2] = p[2];
    return _h;
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Per-tilt metadata: DNA ends, peeling arcs, tail anchors.             */
  /*    Coordinates in nm, projected. World = centre + rot(roll) * nm * ppn. */
  /* ---------------------------------------------------------------------- */
  var TAILS = [
    { th: Math.PI * 0.86, z: 0.15, kind: 0 },   /* H3 N-tail, between gyres   */
    { th: -Math.PI * 0.86, z: -0.15, kind: 0 },
    { th: Math.PI * 0.60, z: 1.55, kind: 1 },   /* H4 N-tail                  */
    { th: -Math.PI * 0.60, z: -1.55, kind: 1 }
  ];

  function buildMeta(phi) {
    var cs = Math.cos(phi), sn = Math.sin(phi);
    var meta = { peel: [], tails: [] }, e, j, u, s, g, p;

    /* index 0 = DNA entry (s = 0), index 1 = DNA exit (s = S_END).
       Samples run from the truncation point outward to the DNA end, so the
       last sample is the end and (last - previous) is the outward tangent. */
    for (e = 0; e < 2; e++) {
      var sTip = e === 0 ? 0 : S_END;
      var sCut = e === 0 ? PEEL_S : S_END - PEEL_S;
      var rest = [], lift = [];
      for (j = 0; j <= PEEL_N; j++) {
        u = j / PEEL_N;
        s = sCut + (sTip - sCut) * u;
        p = helix(s, 0, 1, cs, sn); rest.push(p[0], p[1]);
        g = smooth(u);
        p = helix(s, 2.5 * g, 1 - 0.36 * g, cs, sn); lift.push(p[0], p[1]);
      }
      meta.peel.push({ rest: rest, lift: lift });
    }

    for (j = 0; j < TAILS.length; j++) {
      var d = TAILS[j];
      var r0 = SH_R + 0.4;
      var a = project(r0 * Math.cos(d.th), r0 * Math.sin(d.th), d.z, cs, sn);
      var ax = a[0], ay = a[1], ad = a[2];
      var b = project((r0 + 1) * Math.cos(d.th), (r0 + 1) * Math.sin(d.th), d.z, cs, sn);
      var nx = b[0] - ax, ny = b[1] - ay;
      var nl = Math.sqrt(nx * nx + ny * ny) || 1;
      meta.tails.push({ x: ax, y: ay, nx: nx / nl, ny: ny / nl, kind: d.kind, depth: ad });
    }
    return meta;
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Nucleosome sprite painter.                                           */
  /* ---------------------------------------------------------------------- */

  /* The eight histone subunits, in model coordinates. Every subunit has a
     partner at (theta + PI, -z): that is the nucleosome pseudo-two-fold.
     The (H3-H4)2 tetramer sits at the centre organising the dyad-proximal
     DNA; the two H2A-H2B dimers flank it, one per half of the wrap. */
  var OCTAMER = [
    { r: 1.50, th: 0.50, z: 0.50, c: C_H3, s: 1.75 },
    { r: 1.50, th: 0.50 + Math.PI, z: -0.50, c: C_H3, s: 1.75 },
    { r: 2.20, th: -0.50, z: 1.15, c: C_H4, s: 1.50 },
    { r: 2.20, th: -0.50 + Math.PI, z: -1.15, c: C_H4, s: 1.50 },
    { r: 2.30, th: 2.00, z: 1.50, c: C_H2A, s: 1.42 },
    { r: 2.30, th: 2.58, z: 0.95, c: C_H2B, s: 1.42 },
    { r: 2.30, th: 2.00 + Math.PI, z: -1.50, c: C_H2A, s: 1.42 },
    { r: 2.30, th: 2.58 + Math.PI, z: -0.95, c: C_H2B, s: 1.42 }
  ];

  function paintOctamer(g, cs, sn, ppn) {
    var R = CORE_R * ppn;
    var cA = (CORE_H / 2) * sn * ppn;   /* +z projects downward on canvas */
    var ry = Math.max(0.6, R * cs);
    var i, p;

    g.save();
    /* Silhouette of a cylinder seen at tilt phi: a rectangle capped by two
       half ellipses. Face-on it degenerates to a circle, edge-on to a bar. */
    g.beginPath();
    g.ellipse(0, cA, R, ry, 0, 0, Math.PI);
    g.lineTo(-R, -cA);
    g.ellipse(0, -cA, R, ry, 0, Math.PI, TAU);
    g.closePath();
    g.save();
    g.clip();

    var bg = g.createLinearGradient(0, -cA - ry, 0, cA + ry);
    bg.addColorStop(0, 'rgba(26,38,56,0.94)');
    bg.addColorStop(1, 'rgba(8,13,22,0.96)');
    g.fillStyle = bg;
    g.fillRect(-R - 2, -cA - ry - 2, 2 * R + 4, 2 * (cA + ry) + 4);

    /* Two passes: the four far-side subunits, then the four near-side ones,
       so the octamer reads as a solid body rather than eight decals. */
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < OCTAMER.length; i++) {
        var u = OCTAMER[i];
        p = project(u.r * Math.cos(u.th), u.r * Math.sin(u.th), u.z, cs, sn);
        if ((p[2] >= 0) !== (pass === 1)) continue;
        var lx = p[0] * ppn, ly = p[1] * ppn, lr = u.s * ppn * 1.18;
        var a = 0.52 + 0.42 * smooth(p[2] / 3 + 0.5);   /* far side recedes */
        var lg = g.createRadialGradient(lx - lr * 0.2, ly - lr * 0.2, 0, lx, ly, lr);
        lg.addColorStop(0, rgba(u.c, a));
        lg.addColorStop(0.5, rgba(u.c, a * 0.62));
        lg.addColorStop(1, rgba(u.c, 0));
        g.fillStyle = lg;
        g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
      }
    }

    /* one soft top light so the disc reads as a solid, not a decal */
    var hl = g.createLinearGradient(0, -cA - ry, 0, 0);
    hl.addColorStop(0, 'rgba(232,244,255,0.20)');
    hl.addColorStop(1, 'rgba(232,244,255,0)');
    g.fillStyle = hl;
    g.fillRect(-R - 2, -cA - ry - 2, 2 * R + 4, cA + ry + 2);
    g.restore();

    g.lineWidth = Math.max(0.5, 0.15 * ppn);
    g.strokeStyle = 'rgba(180,214,250,0.26)';
    g.stroke();
    g.restore();
  }

  /* Stroke the runs of the wrap that lie on one side of the octamer. */
  function strokeWrap(g, xs, ys, ds, side, ppn, front) {
    var i, run = null, runs = [];
    for (i = 0; i < ds.length; i++) {
      var on = side > 0 ? (ds[i] >= 0) : (ds[i] < 0);
      if (on) {
        if (!run) { run = []; runs.push(run); if (i > 0) run.push(xs[i - 1], ys[i - 1]); }
        run.push(xs[i], ys[i]);
      } else if (run) {
        run.push(xs[i], ys[i]);
        run = null;
      }
    }
    var w = DNA_W * ppn;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (var k = 0; k < runs.length; k++) {
      var r = runs[k];
      if (r.length < 4) continue;
      g.beginPath();
      g.moveTo(r[0], r[1]);
      for (i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
      if (front) {
        /* thin dark carve so the near gyre separates from the far one,
           without painting over the histone colour underneath */
        g.lineWidth = w + 1.1;
        g.strokeStyle = 'rgba(5,9,16,0.38)';
        g.stroke();
        g.lineWidth = w;
        g.strokeStyle = rgba(C_DNA, 0.60);
        g.stroke();
        g.lineWidth = w * 0.30;
        g.strokeStyle = 'rgba(200,228,255,0.40)';
        g.stroke();
      } else {
        g.lineWidth = w;
        g.strokeStyle = rgba(C_DNA, 0.22);
        g.stroke();
        g.lineWidth = w * 0.30;
        g.strokeStyle = 'rgba(160,200,248,0.12)';
        g.stroke();
      }
    }
  }

  function paintNucleosome(g, phi, ppn, shortWrap) {
    var cs = Math.cos(phi), sn = Math.sin(phi);
    var s0 = shortWrap ? PEEL_S : 0;
    var s1 = shortWrap ? S_END - PEEL_S : S_END;
    var N = 78, i, p;
    var xs = [], ys = [], ds = [];
    for (i = 0; i <= N; i++) {
      p = helix(s0 + (s1 - s0) * i / N, 0, 1, cs, sn);
      xs.push(p[0] * ppn); ys.push(p[1] * ppn); ds.push(p[2]);
    }
    strokeWrap(g, xs, ys, ds, -1, ppn, false);
    paintOctamer(g, cs, sn, ppn);
    strokeWrap(g, xs, ys, ds, 1, ppn, true);
  }

  /* ---------------------------------------------------------------------- */
  /* 5. Sprite sheets.                                                       */
  /* ---------------------------------------------------------------------- */
  var TILTS = [];        /* radians */
  var sprFull = [];      /* full 1.65-turn wrap, used by the far layer       */
  var sprShort = [];     /* wrap truncated at both ends: near + mid layers   */
  var metas = [];
  var sprCrowd = [];     /* [type][sizeBucket]                               */
  var sprBlob = [];
  var spriteDpr = 0;

  function newCanvas(cssSize, d) {
    var cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.ceil(cssSize * d));
    cv.height = cv.width;
    var g = cv.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.translate(cssSize / 2, cssSize / 2);
    return { cv: cv, g: g };
  }

  function buildNucSheet(phi, cssSize, d, shortWrap, blur) {
    var o = newCanvas(cssSize, d);
    if (blur) { try { o.g.filter = 'blur(' + blur + 'px)'; } catch (e) {} }
    paintNucleosome(o.g, phi, cssSize / SPR_NM, shortWrap);
    return o.cv;
  }

  function buildCrowdSprite(type, cssSize, d) {
    var o = newCanvas(cssSize, d), g = o.g;
    var lobes;
    if (type === 0) lobes = [[-0.22, -0.06, C_H2A, 0.36], [0.22, 0.06, C_H2B, 0.36]];
    else if (type === 1) lobes = [[-0.20, 0.05, C_H3, 0.36], [0.20, -0.05, C_H4, 0.36]];
    else lobes = [[-0.16, -0.10, C_FAC, 0.30], [0.18, 0.02, C_FAC, 0.34], [-0.02, 0.20, C_FAC, 0.24]];
    for (var i = 0; i < lobes.length; i++) {
      var L = lobes[i];
      var x = L[0] * cssSize, y = L[1] * cssSize, r = L[3] * cssSize;
      var gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
      gr.addColorStop(0, rgba(L[2], 0.62));
      gr.addColorStop(0.55, rgba(L[2], 0.26));
      gr.addColorStop(1, rgba(L[2], 0));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return o.cv;
  }

  function buildBlobSprite(seed, cssSize, d) {
    var o = newCanvas(cssSize, d), g = o.g;
    for (var i = 0; i < 4; i++) {
      var a = seed * 1.7 + i * 1.9;
      var x = Math.cos(a) * cssSize * 0.10;
      var y = Math.sin(a * 1.3) * cssSize * 0.09;
      var r = cssSize * (0.30 + 0.10 * Math.sin(a * 2.1));
      var gr = g.createRadialGradient(x, y, r * 0.10, x, y, r);
      gr.addColorStop(0, 'rgba(126,184,255,0.30)');
      gr.addColorStop(0.42, 'rgba(96,150,224,0.16)');
      gr.addColorStop(0.82, 'rgba(84,134,206,0.05)');
      gr.addColorStop(1, 'rgba(80,130,200,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return o.cv;
  }

  function buildSprites(d, isSmall) {
    if (spriteDpr === d && sprFull.length) return;
    spriteDpr = d;
    TILTS = isSmall ? [0.30, 0.62, 0.94, 1.26] : [0.24, 0.48, 0.72, 0.96, 1.20, 1.42];
    var base = isSmall ? SPR_CSS * 0.72 : SPR_CSS;
    sprFull = []; sprShort = []; metas = [];
    for (var i = 0; i < TILTS.length; i++) {
      metas.push(buildMeta(TILTS[i]));
      /* far layer: half resolution and pre-blurred, it is never drawn large */
      sprFull.push(buildNucSheet(TILTS[i], base * 0.5, d, false, 0.9));
      sprShort.push(buildNucSheet(TILTS[i], base, d, true, 0));
    }
    sprCrowd = [];
    for (var ty = 0; ty < 3; ty++) {
      var row = [];
      for (var s = 0; s < 3; s++) row.push(buildCrowdSprite(ty, 16 + s * 9, d));
      sprCrowd.push(row);
    }
    sprBlob = [buildBlobSprite(1, 190, d * 0.5), buildBlobSprite(4, 190, d * 0.5)];
  }

  /* ---------------------------------------------------------------------- */
  /* 6. World.                                                               */
  /* ---------------------------------------------------------------------- */
  var W = 0, H = 0, dpr = 1, small = false;
  var fibres = [], crowders = [], blobs = [], pol = null;
  var LAYER = [
    /* 0 near */ { alpha: 0.27, par: 0.016, scr: 0.055, dia: [30, 42] },
    /* 1 mid  */ { alpha: 0.20, par: 0.008, scr: 0.030, dia: [16, 24] },
    /* 2 far  */ { alpha: 0.12, par: 0.003, scr: 0.012, dia: [8, 13] }
  ];
  var MAX_BEADS = 15;
  var LAYER_SPEED = [1.0, 0.72, 0.45];

  function makeNucleosome(f, v, idx) {
    var L = LAYER[f.layer];
    var dia = rnd(L.dia[0], L.dia[1]) * f.scale;
    return {
      v: v, v0: v, dia: dia, ppn: dia / PARTICLE,
      tilt: rnd(0, TILTS.length - 1.001),
      tiltAmp: f.layer === 0 ? rnd(0.25, 0.8) : 0,
      tiltW: rnd(0.10, 0.28), tiltPh: rnd(0, TAU),
      roll: rnd(0, TAU), rollW: rnd(-0.09, 0.09),
      side: idx % 2 === 0 ? 1 : -1,
      slide: rnd(0.10, 0.30) * f.spacing, slideW: rnd(0.12, 0.34), slidePh: rnd(0, TAU),
      breathPh: rnd(0, TAU), breathW: rnd(0.25, 0.7),
      breathBias: Math.random() < 0.3 ? rnd(0.1, 0.4) : 0,
      tailPh: rnd(0, TAU),
      marks: [Math.random() < 0.6, Math.random() < 0.5, Math.random() < 0.45, Math.random() < 0.4],
      evict: 0,
      x: 0, y: 0, ang: 0, hot: 0,
      ends: [0, 0, 0, 0, 0, 0, 0, 0]
    };
  }

  function seedFibre(f, layer, initial) {
    var L = LAYER[layer];
    f.layer = layer;
    f.het = Math.random() < (layer === 2 ? 0.45 : 0.34);
    f.scale = rnd(0.85, 1.15);
    /* linker DNA: 20-80 bp in open chromatin, ~20 bp when condensed */
    f.linkerBp = f.het ? rnd(18, 26) : rnd(34, 80);
    var dia = (L.dia[0] + L.dia[1]) * 0.5 * f.scale;
    var ppn = dia / PARTICLE;
    f.spacing = dia * 0.92 + f.linkerBp * BP_NM * ppn;
    f.len = rnd(260, 620) * (layer === 2 ? 1.25 : 1);
    f.a0 = rnd(0, TAU);
    f.curv = rnd(-1.1, 1.1) / f.len;
    f.ox = initial ? rnd(-0.1 * W, 1.1 * W)
                   : (Math.random() < 0.5 ? rnd(-f.len, -40) : rnd(W + 40, W + f.len));
    f.oy = rnd(-0.15 * H, 1.15 * H);
    if (!initial && Math.random() < 0.5) {
      f.ox = rnd(-0.1 * W, 1.1 * W);
      f.oy = Math.random() < 0.5 ? rnd(-f.len, -40) : rnd(H + 40, H + f.len);
    }
    var sp = rnd(2.5, 7.5) * LAYER_SPEED[layer];
    var ang = rnd(0, TAU);
    f.vx = Math.cos(ang) * sp; f.vy = Math.sin(ang) * sp;
    /* two travelling transverse waves: neighbours move together, so the fibre
       breathes as a whole instead of every bead jittering on its own */
    var amp = f.het ? rnd(3, 8) : rnd(7, 16);
    f.a1 = amp; f.k1 = TAU / rnd(210, 380); f.p1 = rnd(0, TAU);
    f.w1 = rnd(0.16, 0.40) * (f.het ? 0.6 : 1);
    f.a2 = amp * 0.45; f.k2 = TAU / rnd(90, 170); f.p2 = rnd(0, TAU);
    f.w2 = rnd(0.25, 0.62) * (f.het ? 0.6 : 1);
    f.zig = f.het ? rnd(0.60, 0.95) : rnd(0.05, 0.30);
    f.zigOff = f.het ? rnd(0.30, 0.46) * dia : rnd(0.05, 0.16) * dia;
    f.dim = f.het ? rnd(0.62, 0.80) : 1;

    var n = clamp(Math.floor(f.len / f.spacing), 3, MAX_BEADS);
    f.len = Math.min(f.len, (n + 0.6) * f.spacing);
    f.nucs = [];
    for (var i = 0; i < n; i++) f.nucs.push(makeNucleosome(f, (i + 0.5) * f.spacing, i));
    /* cheap bbox for whole-fibre culling */
    f.rad = f.len + f.a1 + f.a2 + 60;
    return f;
  }

  var _sp = { x: 0, y: 0, a: 0 };
  function spinePoint(f, v, tt, hotAmp) {
    var k = f.curv, a0 = f.a0, ax, ay;
    if (Math.abs(k) < 1e-7) { ax = f.ox + Math.cos(a0) * v; ay = f.oy + Math.sin(a0) * v; }
    else {
      ax = f.ox + (Math.sin(a0 + k * v) - Math.sin(a0)) / k;
      ay = f.oy - (Math.cos(a0 + k * v) - Math.cos(a0)) / k;
    }
    var th = a0 + k * v;
    var m = 1 + hotAmp;
    var q1 = f.k1 * v + f.p1 + tt * f.w1;
    var q2 = f.k2 * v + f.p2 - tt * f.w2;
    var w = (f.a1 * Math.sin(q1) + f.a2 * Math.sin(q2)) * m;
    var dw = (f.a1 * f.k1 * Math.cos(q1) + f.a2 * f.k2 * Math.cos(q2)) * m;
    _sp.x = ax - Math.sin(th) * w;
    _sp.y = ay + Math.cos(th) * w;
    _sp.a = th + Math.atan(dw);
    return _sp;
  }

  function makeCrowder(layer) {
    var b = layer === 0 ? 2 : (layer === 1 ? 1 : 0);
    return {
      layer: layer, type: rint(0, 2), bucket: b,
      x: rnd(0, W), y: rnd(0, H),
      vx: rnd(-6, 6), vy: rnd(-6, 6), hot: 0,
      ph: rnd(0, TAU), rot: rnd(0, TAU), rotW: rnd(-0.5, 0.5),
      size: (16 + b * 9) * rnd(0.7, 1.15) * (layer === 0 ? 1 : (layer === 1 ? 0.8 : 0.6))
    };
  }

  function build() {
    var area = W * H;
    /* Layer mix is 1 near : 2 mid : 2 far. Far and mid beads are small, so the
       crowd comes from them; the near layer stays sparse to protect legibility
       and to keep the biggest sprites off the fill budget. */
    var nFib = clamp(Math.round(area / 78000), 4, 20);
    var nCrowd = clamp(Math.round(area / 10500), 14, 112);
    var mix = [0, 1, 2, 1, 2];
    fibres = [];
    for (var i = 0; i < nFib; i++) fibres.push(seedFibre({}, mix[i % 5], true));
    crowders = [];
    for (var c = 0; c < nCrowd; c++) crowders.push(makeCrowder(c % 3));
    blobs = [];
    var nb = area > 700000 ? 2 : 1;
    for (var b = 0; b < nb; b++) {
      blobs.push({
        i: b % 2, x: rnd(0, W), y: rnd(0, H),
        /* a nuclear body is compact, not a haze: keeps the fill cost sane too */
        r: rnd(105, 175) * (small ? 0.72 : 1),
        vx: rnd(-2.2, 2.2), vy: rnd(-2.2, 2.2),
        ph: rnd(0, TAU), a: rnd(0.5, 0.9)
      });
    }
    pol = { fib: null, v: 0, speed: 0, wait: rnd(1.5, 5), rna: 0, ph: rnd(0, TAU) };
    exposeStats();
  }

  function exposeStats() {
    var n = 0, i;
    for (i = 0; i < fibres.length; i++) n += fibres[i].nucs.length;
    window.__cellbg = {
      w: W, h: H, dpr: dpr, fibres: fibres.length, nucleosomes: n,
      crowders: crowders.length, blobs: blobs.length,
      sprites: sprFull.length + sprShort.length + 9 + 2,
      reduced: reduced
    };
  }

  /* ---------------------------------------------------------------------- */
  /* 7. Input: the cursor is a local energy source, not a repeller.          */
  /*    Within ~180 px it raises the local temperature, which (a) speeds up  */
  /*    diffusion of nearby complexes, (b) loosens the chromatin fibre       */
  /*    (local decondensation), (c) drives DNA breathing, (d) sharpens       */
  /*    nucleosomes and reveals their tails and PTM marks.                   */
  /* ---------------------------------------------------------------------- */
  var MOUSE_R = 180;
  var mx = -9999, my = -9999, tmx = -9999, tmy = -9999, mouseOn = false;
  var rect = { left: 0, top: 0 }, needRect = true;
  var scrollY = 0;
  var parX = 0, parY = 0, tParX = 0, tParY = 0;

  function heat(x, y) {
    if (!mouseOn) return 0;
    var dx = x - mx, dy = y - my;
    var d2 = dx * dx + dy * dy;
    if (d2 > MOUSE_R * MOUSE_R) return 0;
    return smooth(1 - Math.sqrt(d2) / MOUSE_R);
  }

  /* ---------------------------------------------------------------------- */
  /* 8. Simulation step.                                                     */
  /* ---------------------------------------------------------------------- */
  var t = 0;
  var themeMul = 1;

  function step(dt) {
    t += dt;
    var i, j, f, n;

    if (mouseOn) {
      var lp = Math.min(1, dt * 9);
      mx += (tmx - mx) * lp; my += (tmy - my) * lp;
    }

    for (i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -b.r) b.x = W + b.r; else if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r; else if (b.y > H + b.r) b.y = -b.r;
    }

    var damp = Math.pow(0.86, dt * 60);
    for (i = 0; i < crowders.length; i++) {
      var c = crowders[i];
      var hc = heat(c.x, c.y);
      /* raised temperature = larger diffusive steps near the cursor */
      var kick = (12 + 70 * hc) * dt;
      c.vx = (c.vx + (Math.random() - 0.5) * kick) * damp;
      c.vy = (c.vy + (Math.random() - 0.5) * kick) * damp;
      c.x += c.vx * dt * (1 + hc * 1.6);
      c.y += c.vy * dt * (1 + hc * 1.6);
      c.rot += c.rotW * dt * (1 + hc * 2);
      var m = c.size;
      if (c.x < -m) c.x = W + m; else if (c.x > W + m) c.x = -m;
      if (c.y < -m) c.y = H + m; else if (c.y > H + m) c.y = -m;
      c.hot = hc;
    }

    for (i = 0; i < fibres.length; i++) {
      f = fibres[i];
      f.ox += f.vx * dt; f.oy += f.vy * dt;
      var pad = f.len + 160;
      if ((f.ox < -pad && f.vx < 0) || (f.ox > W + pad && f.vx > 0) ||
          (f.oy < -pad && f.vy < 0) || (f.oy > H + pad && f.vy > 0)) {
        seedFibre(f, f.layer, false);
        continue;
      }
      for (j = 0; j < f.nucs.length; j++) {
        n = f.nucs[j];
        /* remodelling: the nucleosome slides along its own linker */
        n.v = n.v0 + Math.sin(t * n.slideW + n.slidePh) * n.slide;
        n.roll += n.rollW * dt;
      }
    }

    stepPolymerase(dt);
  }

  function stepPolymerase(dt) {
    if (!pol) return;
    if (!pol.fib) {
      pol.wait -= dt;
      if (pol.wait > 0) return;
      var cands = [];
      for (var i = 0; i < fibres.length; i++) {
        if (!fibres[i].het && fibres[i].layer < 2) cands.push(fibres[i]);
      }
      if (!cands.length) { pol.wait = 3; return; }
      pol.fib = pick(cands);
      pol.v = -40;
      pol.speed = rnd(26, 46);
      pol.rna = 0;
      return;
    }
    pol.v += pol.speed * dt;
    pol.rna = Math.min(1, pol.rna + dt * 0.22);
    if (pol.v > pol.fib.len + 60) { pol.fib = null; pol.wait = rnd(6, 16); return; }
    var f = pol.fib;
    for (var k = 0; k < f.nucs.length; k++) {
      var n = f.nucs[k];
      var d = n.v - pol.v;
      /* evicted just ahead of the complex, re-deposited well behind it */
      var target = (d > -26 && d < 58) ? 1 : 0;
      var rate = target > n.evict ? 3.2 : 0.55;
      n.evict += (target - n.evict) * Math.min(1, dt * rate);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 9. Render.                                                              */
  /* ---------------------------------------------------------------------- */
  function drawLinker(x0, y0, tx0, ty0, x1, y1, tx1, ty1, w, a) {
    var dx = x1 - x0, dy = y1 - y0;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.5) return;
    var L = clamp(d * 0.34, 3, 46);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + tx0 * L, y0 + ty0 * L, x1 + tx1 * L, y1 + ty1 * L, x1, y1);
    ctx.lineWidth = w;
    ctx.strokeStyle = rgba(C_DNA, a);
    ctx.stroke();
    if (w > 2.2) {
      ctx.lineWidth = w * 0.34;
      ctx.strokeStyle = 'rgba(196,224,255,' + (a * 0.5) + ')';
      ctx.stroke();
    }
  }

  function drawTails(n, meta, cosR, sinR, alpha, hot) {
    for (var i = 0; i < meta.tails.length; i++) {
      var a = meta.tails[i];
      var ax = n.x + (a.x * cosR - a.y * sinR) * n.ppn;
      var ay = n.y + (a.x * sinR + a.y * cosR) * n.ppn;
      var dx = a.nx * cosR - a.ny * sinR;
      var dy = a.nx * sinR + a.ny * cosR;
      /* intrinsically disordered: the tail wanders, it does not point */
      var ph = t * (1.1 + i * 0.17) + n.tailPh + i;
      var len = n.dia * (0.62 + 0.12 * Math.sin(ph * 0.7)) * (1 + hot * 0.35);
      var sw = Math.sin(ph) * n.dia * 0.26;
      var sw2 = Math.sin(ph * 1.7 + 1.1) * n.dia * 0.20;
      var px1 = ax + dx * len * 0.5 - dy * sw;
      var py1 = ay + dy * len * 0.5 + dx * sw;
      var px2 = ax + dx * len - dy * (sw + sw2);
      var py2 = ay + dy * len + dx * (sw + sw2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(px1, py1, px2, py2);
      ctx.lineWidth = Math.max(0.7, n.dia * 0.055);
      ctx.strokeStyle = rgba(a.kind === 0 ? C_H3 : C_H4, alpha * 0.95);
      ctx.stroke();
      if (n.marks[i]) {
        /* the PTM: H3K4/K9/K27, H4K20. Small, but it is the point of the site */
        var mr = Math.max(0.9, n.dia * 0.075);
        ctx.beginPath();
        ctx.arc(px2, py2, mr, 0, TAU);
        ctx.fillStyle = 'rgba(240,248,255,' + (alpha * (0.55 + 0.45 * hot)) + ')';
        ctx.fill();
      }
    }
  }

  /* Terminal wrap, lerped between wrapped (breath 0) and unpeeled (breath 1).
     Also hands back the DNA end position and outward tangent so the linker
     stays attached while the nucleosome breathes. */
  function drawPeel(n, meta, cosR, sinR, breath, alpha) {
    var e, j, w = DNA_W * n.ppn;
    ctx.lineCap = 'round';
    for (e = 0; e < 2; e++) {
      var P = meta.peel[e], rst = P.rest, lft = P.lift;
      var lx = 0, ly = 0, px = 0, py = 0;
      ctx.beginPath();
      for (j = 0; j <= PEEL_N; j++) {
        var mxn = rst[j * 2] + (lft[j * 2] - rst[j * 2]) * breath;
        var myn = rst[j * 2 + 1] + (lft[j * 2 + 1] - rst[j * 2 + 1]) * breath;
        var wx = n.x + (mxn * cosR - myn * sinR) * n.ppn;
        var wy = n.y + (mxn * sinR + myn * cosR) * n.ppn;
        if (j === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
        px = lx; py = ly; lx = wx; ly = wy;
      }
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(C_DNA, alpha * 0.62);
      ctx.stroke();
      if (w > 3) {
        ctx.lineWidth = w * 0.30;
        ctx.strokeStyle = 'rgba(200,228,255,' + (alpha * 0.40) + ')';
        ctx.stroke();
      }
      var tx = lx - px, ty = ly - py;
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;
      n.ends[e * 4] = lx; n.ends[e * 4 + 1] = ly;
      n.ends[e * 4 + 2] = tx / tl; n.ends[e * 4 + 3] = ty / tl;
    }
  }

  function drawFibre(f) {
    var L = LAYER[f.layer];
    var base = L.alpha * themeMul * f.dim;
    var far = f.layer === 2;
    var detail = f.layer === 0;
    var ox = parX * L.par, oy = parY * L.par - scrollY * L.scr;
    var i, j, n, p;

    /* whole-fibre cull before any per-bead work */
    var cx = f.ox + ox, cy = f.oy + oy;
    if (cx < -f.rad || cx > W + f.rad || cy < -f.rad || cy > H + f.rad) return;

    /* place every bead first: linkers need both neighbours */
    for (i = 0; i < f.nucs.length; i++) {
      n = f.nucs[i];
      p = spinePoint(f, n.v, t, 0);
      n.x = p.x + ox; n.y = p.y + oy;
      var hot = heat(n.x, n.y);
      if (hot > 0.01) {
        /* local decondensation: the fibre loosens where it is warm */
        p = spinePoint(f, n.v, t, hot * 0.85);
        n.x = p.x + ox; n.y = p.y + oy;
      }
      n.hot = hot;
      n.ang = p.a;
      /* zigzag: alternate beads sit on opposite sides of the fibre axis,
         which is what a short linker forces (two-start 30 nm-like packing) */
      var zo = f.zigOff * f.zig * n.side;
      n.x += -Math.sin(p.a) * zo;
      n.y += Math.cos(p.a) * zo;
    }

    if (far) {
      /* one polyline for the whole string: the beads cover it anyway */
      ctx.beginPath();
      var steps = Math.max(6, Math.round(f.len / 26));
      for (j = 0; j <= steps; j++) {
        var q = spinePoint(f, (j / steps) * f.len, t, 0);
        if (j === 0) ctx.moveTo(q.x + ox, q.y + oy); else ctx.lineTo(q.x + ox, q.y + oy);
      }
      ctx.lineWidth = Math.max(0.8, f.nucs.length ? f.nucs[0].dia * 0.14 : 1.2);
      ctx.strokeStyle = rgba(C_DNA, base * 0.55);
      ctx.stroke();
    }

    var prev = null;
    for (i = 0; i < f.nucs.length; i++) {
      n = f.nucs[i];
      var w = n.dia * SPR_K;
      if (n.x < -w * 2 || n.x > W + w * 2 || n.y < -w * 2 || n.y > H + w * 2) {
        if (n.evict < 0.5) prev = null;
        continue;
      }
      var a = base * (1 - 0.72 * n.evict) * (1 + n.hot * 0.9);
      if (a <= 0.004) continue;

      var ex = 0, ey = 0;
      if (n.evict > 0.001) {
        /* evicted ahead of the polymerase, drifting off the fibre */
        ex = -Math.sin(n.ang) * n.side * n.evict * n.dia * 1.15;
        ey = Math.cos(n.ang) * n.side * n.evict * n.dia * 1.15;
        n.x += ex; n.y += ey;
      }

      var roll = n.roll + n.ang;
      var cosR = Math.cos(roll), sinR = Math.sin(roll);

      if (far) {
        var ti = Math.round(clamp(n.tilt, 0, TILTS.length - 1));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(n.x, n.y);
        ctx.rotate(roll);
        ctx.drawImage(sprFull[ti], -w / 2, -w / 2, w, w);
        ctx.restore();
      } else {
        var tf = clamp(n.tilt + n.tiltAmp * Math.sin(t * n.tiltW + n.tiltPh),
                       0, TILTS.length - 1.001);
        var k0 = Math.floor(tf), fr = tf - k0;
        var meta = metas[fr > 0.5 ? Math.min(k0 + 1, TILTS.length - 1) : k0];

        /* DNA breathing: the last turns unpeel, more often when it is warm */
        var br = 0.5 + 0.5 * Math.sin(t * n.breathW + n.breathPh) + n.breathBias;
        br = clamp((br - 0.62) * 2.6, 0, 1) * (0.4 + 0.6 * n.hot) + n.hot * 0.22;
        drawPeel(n, meta, cosR, sinR, clamp(br, 0, 1), a);

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(roll);
        ctx.globalAlpha = a * (1 - fr);
        ctx.drawImage(sprShort[k0], -w / 2, -w / 2, w, w);
        if (fr > 0.01 && k0 + 1 < TILTS.length) {
          ctx.globalAlpha = a * fr;
          ctx.drawImage(sprShort[k0 + 1], -w / 2, -w / 2, w, w);
        }
        ctx.restore();

        if (detail || n.hot > 0.05) {
          drawTails(n, meta, cosR, sinR, a * (detail ? 0.8 : n.hot), n.hot);
        }

        /* linker DNA back to the previous bead still sitting on the fibre */
        if (prev && n.evict < 0.5 && prev.evict < 0.5) {
          drawLinker(prev.ends[4], prev.ends[5], prev.ends[6], prev.ends[7],
                     n.ends[0], n.ends[1], n.ends[2], n.ends[3],
                     DNA_W * n.ppn, a * 0.62);
        }
      }
      if (n.evict > 0.001) { n.x -= ex; n.y -= ey; }
      if (n.evict < 0.5) prev = n;
    }
  }

  function drawPolymerase() {
    if (!pol || !pol.fib) return;
    var f = pol.fib, L = LAYER[f.layer];
    var ox = parX * L.par, oy = parY * L.par - scrollY * L.scr;
    var p = spinePoint(f, pol.v, t, 0);
    var x = p.x + ox, y = p.y + oy;
    if (x < -90 || x > W + 90 || y < -90 || y > H + 90) return;
    var s = (f.nucs.length ? f.nucs[0].dia : 20) * 0.95;
    var a = L.alpha * themeMul * 1.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.a);

    /* nascent RNA: single stranded, so a thinner line, and it trails */
    if (pol.rna > 0.02) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      var n = 9, len = s * 3.4 * pol.rna;
      for (var i = 1; i <= n; i++) {
        var u = i / n;
        ctx.lineTo(-len * u, Math.sin(u * 6 + t * 2.2 + pol.ph) * s * 0.42 * u);
      }
      ctx.lineWidth = Math.max(0.7, s * 0.07);
      ctx.strokeStyle = rgba(C_H4, a * 0.5);
      ctx.stroke();
    }

    var g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    g1.addColorStop(0, rgba(C_FAC, a * 1.5));
    g1.addColorStop(0.5, rgba(C_FAC, a * 0.7));
    g1.addColorStop(1, rgba(C_FAC, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.beginPath();
    ctx.ellipse(s * 0.22, -s * 0.12, s * 0.42, s * 0.32, 0.4, 0, TAU);
    ctx.fillStyle = rgba(C_FAC, a * 1.1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-s * 0.20, s * 0.10, s * 0.34, s * 0.26, -0.3, 0, TAU);
    ctx.fillStyle = rgba(C_FAC, a * 0.85);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    var i, c;

    parX += (tParX - parX) * 0.06;
    parY += (tParY - parY) * 0.06;

    /* condensate / nucleolus-like density */
    for (i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var r = b.r * (1 + 0.05 * Math.sin(t * 0.15 + b.ph));
      ctx.globalAlpha = b.a * themeMul * 0.9;
      ctx.drawImage(sprBlob[b.i],
                    b.x - r + parX * 0.004,
                    b.y - r + parY * 0.004 - scrollY * 0.02,
                    r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    /* far to near, so depth reads correctly */
    for (var layer = 2; layer >= 0; layer--) {
      for (i = 0; i < fibres.length; i++) {
        if (fibres[i].layer === layer) drawFibre(fibres[i]);
      }
      var L = LAYER[layer];
      for (i = 0; i < crowders.length; i++) {
        c = crowders[i];
        if (c.layer !== layer) continue;
        var cx = c.x + parX * L.par, cy = c.y + parY * L.par - scrollY * L.scr;
        if (cx < -40 || cx > W + 40 || cy < -40 || cy > H + 40) continue;
        var sz = c.size * (1 + 0.06 * Math.sin(t * 1.3 + c.ph));
        ctx.save();
        ctx.globalAlpha = L.alpha * themeMul * (0.85 + 0.7 * c.hot);
        ctx.translate(cx, cy);
        ctx.rotate(c.rot);
        ctx.drawImage(sprCrowd[c.type][c.bucket], -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      if (layer === 0) drawPolymerase();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------------- */
  /* 10. Sizing, themes, lifecycle.                                          */
  /* ---------------------------------------------------------------------- */
  var reduced = false, running = false, raf = 0, inView = true, last = 0;

  function readTheme() {
    /* Dark: the canvas is fixed behind the whole page, so it also sits under
       body prose. Light: it is caged in a hero that stays dark and carries
       only display type, so a little more presence is safe. */
    themeMul = docEl.getAttribute('data-theme') === 'light' ? 1.22 : 1;
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    var cw = Math.max(1, Math.round(r.width));
    var ch = Math.max(1, Math.round(r.height));
    if (cw < 2 || ch < 2) return false;
    var d = Math.min(2, window.devicePixelRatio || 1);
    var changed = (cw !== W || ch !== H || d !== dpr);
    W = cw; H = ch; dpr = d;
    small = Math.min(W, H) < 560;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildSprites(dpr, small);
    return changed;
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = last ? (now - last) / 1000 : 0.016;
    last = now;
    if (dt > 0.06) dt = 0.06;      /* never fast-forward after a stall */
    if (needRect) {
      var r = canvas.getBoundingClientRect();
      rect.left = r.left; rect.top = r.top;
      needRect = false;
    }
    scrollY = docEl.getAttribute('data-theme') === 'light' ? 0 : (window.pageYOffset || 0);
    step(dt);
    render();
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced || !inView || document.hidden) return;
    running = true;
    last = 0;
    needRect = true;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  }

  function staticFrame() {
    /* prefers-reduced-motion: one composed still, never an empty background */
    t = 6.2;
    parX = parY = tParX = tParY = 0;
    scrollY = 0;
    mouseOn = false;
    render();
  }

  /* ---- boot ---- */
  var mqReduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  reduced = !!(mqReduce && mqReduce.matches);

  readTheme();
  resize();
  build();
  if (reduced) staticFrame(); else start();

  var rzTimer = 0;
  window.addEventListener('resize', function () {
    needRect = true;
    if (rzTimer) clearTimeout(rzTimer);
    rzTimer = setTimeout(function () {
      rzTimer = 0;
      if (resize()) build();
      if (reduced) staticFrame();
    }, 140);
  }, { passive: true });

  window.addEventListener('scroll', function () { needRect = true; }, { passive: true });

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (needRect) {
      var r = canvas.getBoundingClientRect();
      rect.left = r.left; rect.top = r.top;
      needRect = false;
    }
    var nx = e.clientX - rect.left, ny = e.clientY - rect.top;
    if (!mouseOn) { mx = nx; my = ny; }
    tmx = nx; tmy = ny;
    mouseOn = true;
    tParX = -(nx - W / 2);
    tParY = -(ny - H / 2);
  }
  function onLeave() { mouseOn = false; tParX = 0; tParY = 0; }

  if (window.PointerEvent) {
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
  } else {
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });
  }
  window.addEventListener('blur', onLeave, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) inView = entries[i].isIntersecting;
      if (inView) start(); else stop();
    }, { rootMargin: '120px' });
    io.observe(canvas);
  }

  /* theme: the button is the fast path, the observer is the safety net */
  var themeBtn = document.getElementById('theme-btn');
  function afterThemeChange() {
    readTheme();
    needRect = true;
    setTimeout(function () {
      if (resize()) build();
      if (reduced) staticFrame();
    }, 60);
  }
  if (themeBtn) themeBtn.addEventListener('click', afterThemeChange);
  if (window.MutationObserver) {
    new MutationObserver(afterThemeChange).observe(docEl, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  if (mqReduce) {
    var onReduce = function () {
      reduced = mqReduce.matches;
      if (reduced) { stop(); staticFrame(); } else start();
      exposeStats();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }
})();
