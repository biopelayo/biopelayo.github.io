/* biopelayo.github.io — chromatin background.
   Drawn after Pelayo's own chromatin illustration: nucleosomes whose DNA
   really wraps (two gyres passing in front of the core and leaving as linker
   DNA), histone tails carrying PTM badges, remodelling complexes, mRNA, free
   double helix and pale background fibres. Three depth layers, giant
   foreground particles, pointer-driven parallax. */
(function () {
  'use strict';

  var canvas = document.getElementById('nucleosome-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var mx = -9999, my = -9999, tx = -9999, ty = -9999;
  var running = true, visible = true, raf = null, t0 = 0;

  /* palette lifted from the illustration */
  var THEMES = {
    dark: {
      ink: '176,206,182', fill: '86,120,98', lobe: '150,166,200', dna: '150,196,168',
      pale: '120,150,135', badge: '176,209,183', label: '15,26,20',
      inkA: 0.34, fillA: 0.14, lobeA: 0.15, dnaA: 0.30, paleA: 0.10, badgeA: 0.38
    },
    light: {
      ink: '166,202,178', fill: '120,164,134', lobe: '160,175,208', dna: '158,203,176',
      pale: '150,185,165', badge: '198,228,206', label: '20,40,30',
      inkA: 0.44, fillA: 0.18, lobeA: 0.20, dnaA: 0.40, paleA: 0.14, badgeA: 0.50
    }
  };
  var P = THEMES.dark;
  function readTheme() {
    P = document.documentElement.getAttribute('data-theme') === 'light' ? THEMES.light : THEMES.dark;
  }
  readTheme();
  if (window.MutationObserver) {
    new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  function rgba(c, a) { return 'rgba(' + c + ',' + a + ')'; }

  var MARKS = ['Ac', 'Me', 'Ub', 'P'];
  var fibres = [], complexes = [], mrnas = [], helices = [], backdrop = [], giants = [];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function makeTails(n, markRate) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({
        a: rnd(0, 6.28), len: rnd(0.5, 1.0), curl: rnd(-0.9, 0.9),
        wag: rnd(0.4, 1.1), ph: rnd(0, 6.28),
        mark: Math.random() < markRate ? pick(MARKS) : null
      });
    }
    return out;
  }

  function build() {
    var small = Math.min(W, H) < 760;
    var i, l, b;
    fibres = []; complexes = []; mrnas = []; helices = []; backdrop = []; giants = [];

    for (i = 0; i < (small ? 4 : 6); i++) {
      backdrop.push({
        x: rnd(-0.2, 1.2) * W, y: rnd(-0.1, 1.1) * H,
        len: rnd(0.7, 1.5) * Math.max(W, H),
        ang: rnd(0, 6.28), bend: rnd(-0.5, 0.5),
        w: rnd(1.2, 3.0), d: rnd(0.05, 0.3), ph: rnd(0, 6.28)
      });
    }

    for (i = 0; i < (small ? 2 : 3); i++) {
      var beads = [], nbead = small ? 4 : Math.round(rnd(5, 7));
      var depth = rnd(0.25, 0.55);
      var r = (small ? 24 : 34) * (0.6 + depth);
      var x = rnd(-0.1, 1.05) * W, y = rnd(0.02, 0.98) * H;
      var ang = rnd(0, 6.28), condensed = Math.random() < 0.4;
      for (b = 0; b < nbead; b++) {
        var step = condensed ? r * 2.3 : r * rnd(3.2, 4.4);
        ang += rnd(-0.5, 0.5);
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        beads.push({
          x: x, y: y, r: r * rnd(0.88, 1.12), rot: ang + rnd(-0.4, 0.4),
          spin: rnd(-0.07, 0.07), ph: rnd(0, 6.28), variant: Math.floor(rnd(0, 3))
        });
      }
      fibres.push({ beads: beads, d: depth, vx: rnd(-3, 3), vy: rnd(-3, 3), ph: rnd(0, 6.28) });
    }

    for (i = 0; i < (small ? 2 : 4); i++) {
      var lobes = [], nl = Math.round(rnd(4, 6));
      for (l = 0; l < nl; l++) {
        lobes.push({ a: rnd(0, 6.28), d: rnd(0.25, 0.95), r: rnd(0.40, 0.72), blue: Math.random() < 0.45 });
      }
      complexes.push({
        x: rnd(0, 1) * W, y: rnd(0, 1) * H, r: rnd(small ? 22 : 32, small ? 38 : 62),
        lobes: lobes, ph: rnd(0, 6.28), vx: rnd(-4, 4), vy: rnd(-4, 4), d: rnd(0.3, 0.7)
      });
    }

    for (i = 0; i < (small ? 2 : 4); i++) {
      mrnas.push({ x: rnd(0, 1) * W, y: rnd(0, 1) * H, len: rnd(90, 240), ang: rnd(0, 6.28), ph: rnd(0, 6.28), d: rnd(0.2, 0.6), amp: rnd(4, 10) });
    }
    for (i = 0; i < (small ? 1 : 2); i++) {
      helices.push({ x: rnd(0, 1) * W, y: rnd(0, 1) * H, len: rnd(200, 430), ang: rnd(0, 6.28), ph: rnd(0, 6.28), d: rnd(0.15, 0.5), amp: rnd(9, 15) });
    }

    /* Giants: the close-up. Kept to the right half on wide screens so the
       headline keeps a clean field to sit on. */
    var ng = 1;
    for (i = 0; i < ng; i++) {
      var gx = small ? rnd(0.2, 0.8) : rnd(0.52, 0.94);
      giants.push({
        bx: gx * W, by: rnd(0.12, 0.88) * H, x: 0, y: 0,
        r: Math.min(W, H) * (small ? 0.20 : rnd(0.15, 0.19)),
        rot: rnd(0, 6.28), spin: rnd(-0.03, 0.03), ph: rnd(0, 6.28),
        d: rnd(0.85, 1.0), tails: makeTails(5, 0.8)
      });
    }
  }

  /* The static half of a nucleosome (core, dimer lobe, gyres, linker stubs)
     is painted once into an offscreen sprite per radius bucket. Per frame we
     only blit the sprite and draw the tails, which are the parts that move.
     This is the difference between 15 fps and a smooth 60. */
  var sprites = {}, spriteTheme = '';
  var SPAN = 4.4;                     /* sprite width in units of r */

  function bodySprite(r, variant, withTails) {
    var key = Math.max(8, Math.round(r / 6) * 6);
    var themeName = P === THEMES.light ? 'light' : 'dark';
    if (spriteTheme !== themeName) { sprites = {}; spriteTheme = themeName; }
    var ck = key + '_' + variant + '_' + (withTails ? 1 : 0);
    if (sprites[ck]) return sprites[ck];

    var s = Math.ceil(key * SPAN * DPR);
    var c = document.createElement('canvas');
    c.width = s; c.height = s;
    var g = c.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.translate(key * SPAN / 2, key * SPAN / 2);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    var rr = key, lw = Math.max(1, rr * 0.030), gw = Math.max(1.6, rr * 0.115);

    g.lineWidth = gw;
    g.strokeStyle = rgba(P.dna, P.dnaA * 0.8);
    g.beginPath();
    g.moveTo(-rr * 2.05, -rr * 0.30);
    g.quadraticCurveTo(-rr * 1.15, -rr * 0.36, -rr * 0.72, -rr * 0.16);
    g.moveTo(rr * 2.05, rr * 0.30);
    g.quadraticCurveTo(rr * 1.15, rr * 0.36, rr * 0.72, rr * 0.16);
    g.stroke();

    g.beginPath();
    g.ellipse(rr * 0.30, rr * 0.20, rr * 0.66, rr * 0.60, 0.5, 0, 6.2832);
    g.fillStyle = rgba(P.lobe, P.lobeA);
    g.fill();
    g.lineWidth = lw * 0.8;
    g.strokeStyle = rgba(P.lobe, P.inkA * 0.8);
    g.stroke();

    g.beginPath();
    g.ellipse(0, 0, rr, rr * 0.94, 0, 0, 6.2832);
    g.fillStyle = rgba(P.fill, P.fillA);
    g.fill();
    g.lineWidth = lw;
    g.strokeStyle = rgba(P.ink, P.inkA);
    g.stroke();

    g.beginPath();
    g.moveTo(-rr * 0.40, -rr * 0.16);
    g.bezierCurveTo(-rr * 0.08, -rr * 0.56, rr * 0.22, -rr * 0.26, rr * 0.08, rr * 0.06);
    g.bezierCurveTo(-rr * 0.04, rr * 0.36, -rr * 0.42, rr * 0.26, -rr * 0.40, -rr * 0.16);
    g.lineWidth = lw * 0.6;
    g.strokeStyle = rgba(P.ink, P.inkA * 0.5);
    g.stroke();

    for (var i = 0; i < 2; i++) {
      var off = (i === 0 ? -0.26 : 0.20) * rr;
      g.beginPath();
      g.ellipse(0, off, rr * 0.92, rr * 0.30, -0.30, Math.PI * 0.06, Math.PI * 0.94);
      g.lineWidth = gw;
      g.strokeStyle = rgba(P.dna, P.dnaA);
      g.stroke();
      g.lineWidth = Math.max(0.6, gw * 0.26);
      g.strokeStyle = rgba(P.ink, P.inkA * 0.8);
      g.stroke();
    }

    if (withTails) {
      var seed = variant * 2.3999632;              /* angulo aureo: reparto parejo */
      for (var k = 0; k < 3; k++) {
        var ta = seed + k * 2.0944, L = rr * (0.62 + (k % 2) * 0.22);
        var tx1 = Math.cos(ta) * rr * 0.94, ty1 = Math.sin(ta) * rr * 0.90;
        var tcx = Math.cos(ta + 0.35) * (rr + L * 0.5), tcy = Math.sin(ta + 0.35) * (rr + L * 0.5);
        var tx2 = Math.cos(ta + 0.7) * (rr + L), ty2 = Math.sin(ta + 0.7) * (rr + L);
        g.beginPath();
        g.moveTo(tx1, ty1);
        g.quadraticCurveTo(tcx, tcy, tx2, ty2);
        g.lineWidth = Math.max(0.8, rr * 0.024);
        g.strokeStyle = rgba(P.ink, P.inkA * 0.85);
        g.stroke();
        if (k < 2) {
          var tbr = Math.min(Math.max(4, rr * 0.13), 18);
          g.beginPath();
          g.arc(tx2, ty2, tbr, 0, 6.2832);
          g.fillStyle = rgba(P.badge, P.badgeA);
          g.fill();
          g.lineWidth = Math.max(0.6, tbr * 0.14);
          g.strokeStyle = rgba(P.ink, P.inkA);
          g.stroke();
        }
      }
    }

    sprites[ck] = { c: c, key: key };
    return sprites[ck];
  }

  function nucleosome(x, y, r, rot, t, tails, a, variant) {
    var live = !!tails;
    var sp = bodySprite(r, live ? 0 : (variant || 0), !live);
    var side = sp.key * SPAN;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (a < 0.995) ctx.globalAlpha = a;
    ctx.drawImage(sp.c, -side / 2, -side / 2);
    ctx.globalAlpha = 1;

    if (!live) { ctx.restore(); return; }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var i = 0; i < tails.length; i++) {
      var tl = tails[i];
      var ang = tl.a + Math.sin(t * tl.wag + tl.ph) * 0.26;
      var L = r * tl.len;
      var x1 = Math.cos(ang) * r * 0.94, y1 = Math.sin(ang) * r * 0.90;
      var cx = Math.cos(ang + tl.curl * 0.5) * (r + L * 0.5);
      var cy = Math.sin(ang + tl.curl * 0.5) * (r + L * 0.5);
      var x2 = Math.cos(ang + tl.curl) * (r + L), y2 = Math.sin(ang + tl.curl) * (r + L);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.lineWidth = Math.max(0.8, r * 0.024);
      ctx.strokeStyle = rgba(P.ink, P.inkA * a * 0.85);
      ctx.stroke();

      if (tl.mark) {
        var br = Math.min(Math.max(5, r * 0.13), 24);
        ctx.beginPath();
        ctx.arc(x2, y2, br, 0, 6.2832);
        ctx.fillStyle = rgba(P.badge, P.badgeA * a);
        ctx.fill();
        ctx.lineWidth = Math.max(0.7, br * 0.14);
        ctx.strokeStyle = rgba(P.ink, P.inkA * a);
        ctx.stroke();
        if (br > 10) {
          ctx.save();
          ctx.translate(x2, y2);
          ctx.rotate(-rot);
          ctx.font = '600 ' + Math.round(br * 0.9) + 'px "Work Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = rgba(P.label, Math.min(0.7, a * 0.8));
          ctx.fillText(tl.mark, 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  function drawFibre(f, t, px, py) {
    var a = 0.35 + f.d * 0.65;
    var ox = px * f.d * 30 + Math.sin(t * 0.18 + f.ph) * 10;
    var oy = py * f.d * 30 + Math.cos(t * 0.15 + f.ph) * 10;
    var bs = f.beads, i;

    ctx.beginPath();
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      var bx = b.x + ox + f.vx * Math.sin(t * 0.1 + b.ph);
      var by = b.y + oy + f.vy * Math.cos(t * 0.1 + b.ph);
      if (i === 0) { ctx.moveTo(bx, by); }
      else {
        var p = bs[i - 1];
        var pxx = p.x + ox + f.vx * Math.sin(t * 0.1 + p.ph);
        var pyy = p.y + oy + f.vy * Math.cos(t * 0.1 + p.ph);
        var mxp = (pxx + bx) / 2 + Math.sin(t * 0.5 + i + f.ph) * b.r * 0.6;
        var myp = (pyy + by) / 2 + Math.cos(t * 0.5 + i + f.ph) * b.r * 0.6;
        ctx.quadraticCurveTo(mxp, myp, bx, by);
      }
    }
    ctx.lineWidth = Math.max(1.4, bs[0].r * 0.14);
    ctx.strokeStyle = rgba(P.dna, P.dnaA * a * 0.8);
    ctx.stroke();

    for (i = 0; i < bs.length; i++) {
      var d = bs[i];
      nucleosome(d.x + ox + f.vx * Math.sin(t * 0.1 + d.ph),
                 d.y + oy + f.vy * Math.cos(t * 0.1 + d.ph),
                 d.r, d.rot + t * d.spin, t, null, a, d.variant);
    }
  }

  function drawComplex(c, t, px, py) {
    var a = 0.3 + c.d * 0.7;
    var x = c.x + px * c.d * 24 + Math.sin(t * 0.21 + c.ph) * c.vx;
    var y = c.y + py * c.d * 24 + Math.cos(t * 0.19 + c.ph) * c.vy;
    var breathe = 1 + Math.sin(t * 0.9 + c.ph) * 0.05;
    for (var i = 0; i < c.lobes.length; i++) {
      var l = c.lobes[i];
      var la = l.a + Math.sin(t * 0.35 + i + c.ph) * 0.12;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(la) * c.r * l.d * 0.7, y + Math.sin(la) * c.r * l.d * 0.7,
                  c.r * l.r * breathe, c.r * l.r * 0.8 * breathe, la, 0, 6.2832);
      ctx.fillStyle = rgba(l.blue ? P.lobe : P.fill, (l.blue ? P.lobeA : P.fillA) * a);
      ctx.fill();
      ctx.lineWidth = Math.max(0.9, c.r * 0.03);
      ctx.strokeStyle = rgba(l.blue ? P.lobe : P.ink, P.inkA * a * 0.75);
      ctx.stroke();
    }
  }

  function drawMRNA(m, t, px, py) {
    var a = 0.25 + m.d * 0.75;
    var x = m.x + px * m.d * 18, y = m.y + py * m.d * 18;
    ctx.beginPath();
    for (var i = 0; i <= 24; i++) {
      var f = i / 24, along = f * m.len;
      var w = Math.sin(along * 0.09 + t * 1.4 + m.ph) * m.amp;
      var xx = x + Math.cos(m.ang) * along - Math.sin(m.ang) * w;
      var yy = y + Math.sin(m.ang) * along + Math.cos(m.ang) * w;
      if (i === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
    }
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(P.ink, P.inkA * a * 0.6);
    ctx.stroke();
  }

  function drawHelix(h, t, px, py) {
    var a = 0.22 + h.d * 0.7;
    var x = h.x + px * h.d * 16, y = h.y + py * h.d * 16;
    var ca = Math.cos(h.ang), sa = Math.sin(h.ang), steps = 36, i, f, along, w, xx, yy;
    for (var s = 0; s < 2; s++) {
      ctx.beginPath();
      for (i = 0; i <= steps; i++) {
        f = i / steps; along = f * h.len;
        w = Math.sin(along * 0.055 + t * 0.6 + h.ph + s * Math.PI) * h.amp;
        xx = x + ca * along - sa * w; yy = y + sa * along + ca * w;
        if (i === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
      }
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = rgba(P.dna, P.dnaA * a * 0.9);
      ctx.stroke();
    }
    ctx.beginPath();
    for (i = 0; i <= steps; i += 4) {
      f = i / steps; along = f * h.len;
      var w1 = Math.sin(along * 0.055 + t * 0.6 + h.ph) * h.amp;
      var w2 = Math.sin(along * 0.055 + t * 0.6 + h.ph + Math.PI) * h.amp;
      ctx.moveTo(x + ca * along - sa * w1, y + sa * along + ca * w1);
      ctx.lineTo(x + ca * along - sa * w2, y + sa * along + ca * w2);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(P.dna, P.dnaA * a * 0.5);
    ctx.stroke();
  }

  function drawBackdrop(t, px, py) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(P.pale, P.paleA);
    for (var i = 0; i < backdrop.length; i++) {
      var b = backdrop[i];
      var x = b.x + px * b.d * 10, y = b.y + py * b.d * 10;
      var ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      ctx.beginPath();
      for (var s = 0; s <= 18; s++) {
        var f = s / 18, along = f * b.len;
        var w = Math.sin(f * 3.1 + t * 0.12 + b.ph) * b.len * 0.05 * b.bend;
        var xx = x + ca * along - sa * w, yy = y + sa * along + ca * w;
        if (s === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
      }
      ctx.lineWidth = b.w;
      ctx.stroke();
    }
  }

  function scene(t, px, py) {
    ctx.clearRect(0, 0, W, H);
    drawBackdrop(t, px, py);
    var i;
    for (i = 0; i < helices.length; i++) drawHelix(helices[i], t, px, py);
    for (i = 0; i < mrnas.length; i++) drawMRNA(mrnas[i], t, px, py);
    for (i = 0; i < fibres.length; i++) drawFibre(fibres[i], t, px, py);
    for (i = 0; i < complexes.length; i++) drawComplex(complexes[i], t, px, py);
    for (i = 0; i < giants.length; i++) {
      var g = giants[i];
      g.x = g.bx + px * 110 * g.d + Math.sin(t * 0.13 + g.ph) * 22;
      g.y = g.by + py * 110 * g.d + Math.cos(t * 0.11 + g.ph) * 22;
      nucleosome(g.x, g.y, g.r, g.rot + t * g.spin, t, g.tails, 1);
    }
  }

  function frame(now) {
    raf = null;
    if (!running || !visible) return;
    var t = (now - t0) / 1000;
    if (mx > -9000) { tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06; }
    scene(t, tx > -9000 ? (tx / W - 0.5) * 2 : 0, ty > -9000 ? (ty / H - 0.5) * 2 : 0);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (raf || !running || !visible) return;
    raf = window.requestAnimationFrame(frame);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = document.documentElement.getAttribute('data-theme') === 'light' && canvas.parentElement
      ? canvas.parentElement.offsetHeight
      : window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sprites = {};
    build();
  }

  resize();
  var rt = null;
  window.addEventListener('resize', function () {
    if (rt) clearTimeout(rt);
    rt = setTimeout(resize, 180);
  }, { passive: true });

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (tx < -9000) { tx = mx; ty = my; }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

  if (reduced) { scene(0, 0, 0); return; }

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { t0 = performance.now() - 1; start(); }
  });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0 }).observe(canvas);
  }

  t0 = performance.now();
  start();
})();
