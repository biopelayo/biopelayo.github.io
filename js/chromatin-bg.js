/* biopelayo.github.io — chromatin background.
   Every object is cut from Pelayo's own chromatin illustration and animated:
   each sprite ships as a strip of frames (img/sprites/*.webp) that the canvas
   plays like a loop, so the nucleosomes breathe, the complexes pulse, the
   envelope ripples and the helix turns. On top of that the scene moves:
   chromatin fibres sway, a remodeller tracks along one fibre evicting the
   nucleosomes in its path and trailing nascent RNA, and depth parallax follows
   the pointer with one giant nucleosome in the foreground. */
(function () {
  'use strict';

  var canvas = document.getElementById('nucleosome-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var mx = -9999, my = -9999, tx = -9999, ty = -9999;
  var running = true, visible = true, raf = null, t0 = 0, last = 0;

  var BASE = 'img/sprites/';
  /* name: [file, frames in the strip] */
  var SRC = {
    cell: ['celula.webp', 8],
    solenoid: ['solenoide.webp', 8],
    nucBig: ['nucleosoma_big.webp', 8],
    nucA: ['nucleosoma_a.webp', 8],
    nucB: ['nucleosoma_b.webp', 8],
    nucC: ['nucleosoma_c.webp', 8],
    nucD: ['nucleosoma_d.webp', 8],
    pol: ['complejo_a.webp', 8],
    cplxA: ['complejo_b.webp', 8],
    cplxB: ['prot_lila.webp', 8],
    cplxC: ['prot_verde.webp', 8],
    helix: ['helice.webp', 8],
    /* virus, bacterias y organulos, generados en el mismo estilo */
    phage: ['phage.webp', 8],
    virusSpike: ['virusSpike.webp', 8],
    virusIco: ['virusIco.webp', 8],
    bacillus: ['bacillus.webp', 8],
    cocci: ['cocci.webp', 8],
    spiro: ['spiro.webp', 8],
    mito: ['mito.webp', 8],
    ribo: ['ribo.webp', 8]
  };
  var SP = {};
  for (var k in SRC) {
    if (!SRC.hasOwnProperty(k)) continue;
    (function (key) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { start(); };
      im.src = BASE + SRC[key][0];
      SP[key] = { img: im, frames: SRC[key][1] };
    })(k);
  }
  function ready(sp) { return sp && sp.img.complete && sp.img.naturalWidth > 0; }

  var DNA = { dark: '150,190,163', light: '120,160,132' };
  var RNA = { dark: '186,170,205', light: '150,136,176' };
  function themeLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function dnaColor(a) { return 'rgba(' + (themeLight() ? DNA.light : DNA.dark) + ',' + a + ')'; }
  function rnaColor(a) { return 'rgba(' + (themeLight() ? RNA.light : RNA.dark) + ',' + a + ')'; }

  var fibres = [], complexes = [], helices = [], giants = [];
  var cell = null, solenoid = null, pol = null;

  /* El puntero es una fuente de agitacion local: empuja lo que tiene cerca,
     lo hace girar y le acelera su propio ciclo. Radio amplio para que se note
     antes de llegar encima de la pieza. */
  var PUSH_R = 300, PUSH_F = 26000;
  function pushAt(x, y) {
    if (mx < -9000) return null;
    var dx = x - tx, dy = y - ty;
    var d2 = dx * dx + dy * dy;
    if (d2 > PUSH_R * PUSH_R) return null;
    var d = Math.sqrt(d2) + 12;
    var f = PUSH_F / (d * d);
    return { fx: (dx / d) * f, fy: (dy / d) * f, near: 1 - d / PUSH_R };
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* Draw one frame of a strip. `cyc` is the object's own loop position. */
  var canFilter = typeof ctx.filter === 'string';
  function blit(sp, x, y, w, rot, alpha, cyc, blur) {
    if (!ready(sp)) return;
    var fw = sp.img.naturalWidth / sp.frames, fh = sp.img.naturalHeight;
    var pos = (((cyc % 1) + 1) % 1) * sp.frames;
    var i0 = Math.floor(pos) % sp.frames, mix = pos - Math.floor(pos);
    var h = w * fh / fw;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (blur && canFilter) ctx.filter = 'blur(' + blur + 'px)';
    if (w < 40) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sp.img, i0 * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    } else {
      var i1 = (i0 + 1) % sp.frames;
      ctx.globalAlpha = alpha * (1 - mix);
      ctx.drawImage(sp.img, i0 * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = alpha * mix;
      ctx.drawImage(sp.img, i1 * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function build() {
    var small = Math.min(W, H) < 760;
    var i, b;
    fibres = []; complexes = []; helices = []; giants = [];

    cell = {
      x: rnd(0.10, 0.30) * W, y: rnd(0.08, 0.30) * H,
      w: Math.min(W, H) * rnd(0.16, 0.22),
      ph: rnd(0, 1), rate: 0.50, a: 0.24
    };

    solenoid = {
      x: rnd(0.55, 0.95) * W, y: rnd(0.02, 0.30) * H,
      w: Math.min(W, H) * rnd(0.08, 0.12),
      rot: rnd(-0.6, 0.6), ph: rnd(0, 1), rate: 1.10, a: 0.22, d: 0.22
    };

    var keys = ['nucA', 'nucB', 'nucC', 'nucD'];
    var nfib = small ? 7 : Math.round(Math.min(20, W * H / 62000));
    for (i = 0; i < nfib; i++) {
      var beads = [], nbead = small ? 6 : Math.round(rnd(6, 13));
      var depth = rnd(0.20, 0.75);
      var size = (small ? 15 : 20) * (0.55 + depth);
      var x = rnd(-0.05, 1.0) * W, y = rnd(0.05, 0.95) * H;
      var ang = rnd(0, 6.28), condensed = Math.random() < 0.3;
      for (b = 0; b < nbead; b++) {
        var step = size * (condensed ? 0.85 : rnd(1.5, 2.1));
        ang += rnd(-0.5, 0.5);
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        beads.push({
          x: x, y: y, w: size * rnd(0.85, 1.15), key: pick(keys),
          rot: rnd(0, 6.28), spin: rnd(-0.10, 0.10),
          ph: rnd(0, 1), rate: rnd(1.7, 2.6), wob: rnd(0, 6.28),
          evict: 0, wx: 0, wy: 0
        });
      }
      fibres.push({ beads: beads, d: depth, sway: rnd(5, 14), phw: rnd(0, 6.28) });
    }

    function onScreen(bd) { return bd.x > -60 && bd.x < W + 60 && bd.y > -60 && bd.y < H + 60; }
    var host = 0, bestSeen = -1, firstSeen = 0;
    for (i = 0; i < fibres.length; i++) {
      var seen = 0, first = -1;
      for (b = 0; b < fibres[i].beads.length; b++) {
        if (onScreen(fibres[i].beads[b])) { seen++; if (first < 0) first = b; }
      }
      if (seen > bestSeen) { bestSeen = seen; host = i; firstSeen = first < 0 ? 0 : first; }
    }
    pol = {
      f: host, s: Math.max(-0.6, firstSeen - 0.6), speed: rnd(0.16, 0.26),
      w: small ? 26 : 34, trail: [], ph: rnd(0, 1), rate: 3.6, phw: rnd(0, 6.28)
    };

    var ck = ['cplxA', 'cplxB', 'cplxC', 'nucC', 'nucA'];
    if (SP.phage) ck = ck.concat(['phage', 'virusSpike', 'virusIco', 'bacillus',
                                  'cocci', 'spiro', 'mito', 'ribo']);
    var MODES = ['drift', 'orbit', 'brownian', 'swim', 'tumble'];
    var ncplx = small ? 26 : Math.round(Math.min(90, W * H / 14000));
    for (i = 0; i < ncplx; i++) {
      var mode = pick(MODES);
      var spd = rnd(6, 26) * (mode === 'swim' ? 2.2 : 1);
      var head = rnd(0, 6.28);
      var key = pick(ck);
      /* virus y bacterias piden algo mas de cuerpo para reconocerse */
      var bicho = key === 'phage' || key === 'virusSpike' || key === 'virusIco' ||
                  key === 'bacillus' || key === 'cocci' || key === 'spiro' ||
                  key === 'mito' || key === 'ribo';
      complexes.push({
        x: rnd(-0.05, 1.05) * W, y: rnd(-0.05, 1.05) * H, key: key,
        w: (small ? 13 : 17) * rnd(0.55, 1.6) * (bicho ? 1.8 : 1), rot: rnd(0, 6.28),
        spin: rnd(-0.5, 0.5), ph: rnd(0, 1), rate: rnd(1.4, 4.2),
        phw: rnd(0, 6.28), d: rnd(0.25, 0.85),
        mode: mode,
        vx: Math.cos(head) * spd, vy: Math.sin(head) * spd,
        ox: 0, oy: 0,                       /* desplazamiento por el raton */
        orbR: rnd(20, 90), orbW: rnd(-0.9, 0.9),
        cx: 0, cy: 0,
        next: rnd(0.6, 3.0),                /* cuando cambia de rumbo */
        faces: Math.random() < 0.5          /* algunas se orientan al avanzar */
      });
      var c = complexes[complexes.length - 1];
      c.cx = c.x; c.cy = c.y;
    }

    for (i = 0; i < (small ? 4 : 10); i++) {
      helices.push({
        x: rnd(0.02, 0.98) * W, y: rnd(0.02, 0.98) * H,
        w: (small ? 18 : 24) * rnd(0.7, 1.5), rot: rnd(0, 6.28),
        ph: rnd(0, 1), rate: rnd(2.5, 4.0), phw: rnd(0, 6.28),
        d: rnd(0.18, 0.5), a: 0.20
      });
    }

    giants.push({
      bx: (small ? rnd(0.2, 0.8) : rnd(0.58, 0.95)) * W,
      by: rnd(0.15, 0.85) * H, x: 0, y: 0,
      w: Math.min(W, H) * (small ? 0.10 : rnd(0.09, 0.13)),
      rot: rnd(-0.5, 0.5), spin: rnd(-0.08, 0.08),
      ph: rnd(0, 1), rate: 1.5, phw: rnd(0, 6.28), a: 0.30
    });
  }

  /* Cinco maneras distintas de moverse, para que ninguna pieza vaya a compas
     con la de al lado: deriva recta, orbita, browniano, nado de bacteria y
     giro brusco ocasional. El raton se suma a todas ellas. */
  function updateFloater(c, t, dt) {
    var m = c.mode;
    if (m === 'drift') {
      c.x += c.vx * dt; c.y += c.vy * dt;
    } else if (m === 'orbit') {
      c.orbA = (c.orbA || rnd(0, 6.28)) + c.orbW * dt;
      c.x = c.cx + Math.cos(c.orbA) * c.orbR;
      c.y = c.cy + Math.sin(c.orbA) * c.orbR * 0.7;
    } else if (m === 'brownian') {
      c.vx += rnd(-90, 90) * dt; c.vy += rnd(-90, 90) * dt;
      c.vx *= 0.96; c.vy *= 0.96;
      c.x += c.vx * dt; c.y += c.vy * dt;
    } else if (m === 'swim') {
      c.x += c.vx * dt; c.y += c.vy * dt;
      var wig = Math.sin(t * 6 + c.phw) * 26 * dt;
      c.x += -c.vy * 0.02 * wig; c.y += c.vx * 0.02 * wig;
    } else {                                   /* tumble */
      c.next -= dt;
      if (c.next <= 0) {
        var a = Math.atan2(c.vy, c.vx) + rnd(-2.2, 2.2);
        var s = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 12;
        c.vx = Math.cos(a) * s; c.vy = Math.sin(a) * s;
        c.next = rnd(0.5, 2.4);
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
    }

    /* el raton empuja y agita */
    c.hit = pushAt(c.x, c.y);
    if (c.hit) {
      c.ox += c.hit.fx * dt; c.oy += c.hit.fy * dt;
      c.rot += c.hit.near * 2.2 * dt;
    }
    c.ox *= 0.93; c.oy *= 0.93;                /* vuelve despacio a su sitio */

    if (c.faces) c.rot = Math.atan2(c.vy, c.vx);
    else c.rot += c.spin * dt;

    /* el nucleoplasma no tiene bordes: lo que sale, vuelve a entrar */
    var mgn = c.w * 1.5;
    if (c.x < -mgn) { c.x = W + mgn; c.cx = c.x; }
    if (c.x > W + mgn) { c.x = -mgn; c.cx = c.x; }
    if (c.y < -mgn) { c.y = H + mgn; c.cy = c.y; }
    if (c.y > H + mgn) { c.y = -mgn; c.cy = c.y; }
  }

  function fibrePositions(f, t, px, py) {
    var ox = px * f.d * 34 + Math.sin(t * 0.42 + f.phw) * f.sway;
    var oy = py * f.d * 34 + Math.cos(t * 0.36 + f.phw) * f.sway;
    for (var i = 0; i < f.beads.length; i++) {
      var b = f.beads[i];
      b.wx = b.x + ox + Math.sin(t * 0.9 + b.wob) * 4;
      b.wy = b.y + oy + Math.cos(t * 0.8 + b.wob) * 4;
      var h = pushAt(b.wx, b.wy);
      b.near = h ? h.near : 0;
      if (h) { b.px2 = (b.px2 || 0) + h.fx * 0.0012; b.py2 = (b.py2 || 0) + h.fy * 0.0012; }
      b.px2 = (b.px2 || 0) * 0.90; b.py2 = (b.py2 || 0) * 0.90;
      b.wx += b.px2; b.wy += b.py2;
    }
  }

  function drawFibre(f, t) {
    var a = 0.16 + f.d * 0.34;
    var bs = f.beads, i;

    ctx.beginPath();
    for (i = 0; i < bs.length; i++) {
      if (i === 0) { ctx.moveTo(bs[i].wx, bs[i].wy); }
      else {
        var p = bs[i - 1], b = bs[i];
        var mxp = (p.wx + b.wx) / 2 + Math.sin(t * 0.45 + i + f.phw) * b.w * 0.22;
        var myp = (p.wy + b.wy) / 2 + Math.cos(t * 0.45 + i + f.phw) * b.w * 0.22;
        ctx.quadraticCurveTo(mxp, myp, b.wx, b.wy);
      }
    }
    ctx.lineWidth = Math.max(2, bs[0].w * 0.075);
    ctx.lineCap = 'round';
    ctx.strokeStyle = dnaColor(a * 0.85);
    ctx.stroke();

    for (i = 0; i < bs.length; i++) {
      var d = bs[i];
      var lift = d.evict * d.w * 0.55;
      /* an evicted nucleosome also speeds up its own loop: it is being shoved */
      var nr = d.near || 0;
      blit(SP[d.key], d.wx, d.wy - lift, d.w * (1 - d.evict * 0.08) * (1 + nr * 0.22),
           d.rot + t * d.spin + d.evict * 0.9 + nr * 0.8,
           a * (1 - d.evict * 0.6) * (1 + nr * 0.9),
           d.ph + t * (d.rate + d.evict * 4 + nr * 6));
    }
  }

  function updatePol(dt) {
    var f = fibres[pol.f];
    if (!f) return;
    pol.s += pol.speed * dt;
    if (pol.s > f.beads.length - 1 + 1.6) { pol.s = -1.6; pol.trail.length = 0; }
    for (var i = 0; i < f.beads.length; i++) {
      var d = Math.abs(i - pol.s);
      var target = d < 1.15 ? (1 - d / 1.15) : 0;
      var b = f.beads[i];
      var rate = target > b.evict ? 6 : 1.1;
      b.evict += (target - b.evict) * Math.min(1, rate * dt);
    }
  }

  function drawPol(t) {
    var f = fibres[pol.f];
    if (!f || pol.s < -0.8) return;
    var n = f.beads.length;
    var s = Math.max(0, Math.min(n - 1.001, pol.s));
    var i0 = Math.floor(s), i1 = Math.min(n - 1, i0 + 1), u = s - i0;
    var A = f.beads[i0], B = f.beads[i1];
    var x = A.wx + (B.wx - A.wx) * u, y = A.wy + (B.wy - A.wy) * u;
    var ang = Math.atan2(B.wy - A.wy, B.wx - A.wx);
    var a = 0.26 + f.d * 0.34;
    var w = pol.w * (0.7 + f.d * 0.5);

    pol.trail.push({ x: x + Math.cos(ang - 1.5) * w * 0.42, y: y + Math.sin(ang - 1.5) * w * 0.42 });
    if (pol.trail.length > 52) pol.trail.shift();
    if (pol.trail.length > 2) {
      ctx.beginPath();
      for (var i = 0; i < pol.trail.length; i++) {
        var q = pol.trail[i];
        var wob = Math.sin(i * 0.55 + t * 2.2 + pol.phw) * w * 0.09;
        var xx = q.x + Math.cos(ang + 1.57) * wob;
        var yy = q.y + Math.sin(ang + 1.57) * wob;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.lineWidth = Math.max(1.6, w * 0.045);
      ctx.lineCap = 'round';
      ctx.strokeStyle = rnaColor(a * 0.8);
      ctx.stroke();
    }

    blit(SP.pol, x, y, w, ang + Math.sin(t * 1.6 + pol.phw) * 0.05, a, pol.ph + t * pol.rate);
  }

  function scene(t, dt, px, py) {
    ctx.clearRect(0, 0, W, H);
    var i;

    blit(SP.cell, cell.x + px * 10 + Math.sin(t * 0.05) * 8,
         cell.y + py * 10 + Math.cos(t * 0.04) * 8, cell.w, 0, cell.a,
         cell.ph + t * cell.rate, 2.5);

    blit(SP.solenoid, solenoid.x + px * 18 + Math.sin(t * 0.07) * 10,
         solenoid.y + py * 18 + Math.cos(t * 0.06) * 10, solenoid.w,
         solenoid.rot + Math.sin(t * 0.09) * 0.05, solenoid.a,
         solenoid.ph + t * solenoid.rate, 1.5);

    for (i = 0; i < helices.length; i++) {
      var h = helices[i];
      blit(SP.helix, h.x + px * h.d * 26 + Math.sin(t * 0.13 + h.phw) * 9,
           h.y + py * h.d * 26 + Math.cos(t * 0.11 + h.phw) * 9,
           h.w, h.rot + Math.sin(t * 0.2 + h.phw) * 0.08, h.a,
           h.ph + t * h.rate);
    }

    for (i = 0; i < fibres.length; i++) fibrePositions(fibres[i], t, px, py);
    if (pol) updatePol(dt);
    for (i = 0; i < fibres.length; i++) drawFibre(fibres[i], t);
    if (pol) drawPol(t);

    for (i = 0; i < complexes.length; i++) {
      var c = complexes[i];
      updateFloater(c, t, dt);
      var agitado = c.hit ? c.hit.near : 0;
      blit(SP[c.key],
           c.x + c.ox + px * c.d * 30,
           c.y + c.oy + py * c.d * 30,
           c.w * (1 + agitado * 0.18),
           c.rot,
           (0.14 + c.d * 0.26) * (1 + agitado * 0.8),
           c.ph + t * c.rate * (1 + agitado * 2.5));
    }

    for (i = 0; i < giants.length; i++) {
      var g = giants[i];
      g.x = g.bx + px * 60 + Math.sin(t * 0.12 + g.phw) * 12;
      g.y = g.by + py * 60 + Math.cos(t * 0.10 + g.phw) * 12;
      blit(SP.nucBig, g.x, g.y, g.w, g.rot + t * g.spin, g.a, g.ph + t * g.rate);
    }
  }

  function frame(now) {
    raf = null;
    if (!running || !visible) return;
    var t = (now - t0) / 1000;
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (mx > -9000) { tx += (mx - tx) * 0.22; ty += (my - ty) * 0.22; }
    scene(t, dt, tx > -9000 ? (tx / W - 0.5) * 2 : 0, ty > -9000 ? (ty / H - 0.5) * 2 : 0);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (raf || !running || !visible || reduced) return;
    raf = window.requestAnimationFrame(frame);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = themeLight() && canvas.parentElement ? canvas.parentElement.offsetHeight : window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  resize();
  var rt = null;
  window.addEventListener('resize', function () {
    if (rt) clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduced) scene(0, 0, 0, 0); }, 180);
  }, { passive: true });

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (tx < -9000) { tx = mx; ty = my; }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

  if (reduced) {
    var tries = 0;
    (function settle() {
      scene(0, 0, 0, 0);
      if (tries++ < 40) setTimeout(settle, 150);
    })();
    return;
  }

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { t0 = performance.now() - 1; last = 0; start(); }
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { last = 0; start(); }
    }, { threshold: 0 }).observe(canvas);
  }

  t0 = performance.now();
  start();
})();
