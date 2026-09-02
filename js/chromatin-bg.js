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
    cell: ['celula.webp', 12],
    solenoid: ['solenoide.webp', 12],
    nucBig: ['nucleosoma_big.webp', 14],
    nucA: ['nucleosoma_a.webp', 14],
    nucB: ['nucleosoma_b.webp', 14],
    nucC: ['nucleosoma_c.webp', 14],
    nucD: ['nucleosoma_d.webp', 14],
    pol: ['complejo_a.webp', 14],
    cplxA: ['complejo_b.webp', 14],
    cplxB: ['prot_lila.webp', 14],
    cplxC: ['prot_verde.webp', 14],
    helix: ['helice.webp', 14]
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

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* Draw one frame of a strip. `cyc` is the object's own loop position. */
  function blit(sp, x, y, w, rot, alpha, cyc) {
    if (!ready(sp)) return;
    var fw = sp.img.naturalWidth / sp.frames, fh = sp.img.naturalHeight;
    var fi = Math.floor(((cyc % 1) + 1) % 1 * sp.frames) % sp.frames;
    var h = w * fh / fw;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.img, fi * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function build() {
    var small = Math.min(W, H) < 760;
    var i, b;
    fibres = []; complexes = []; helices = []; giants = [];

    cell = {
      x: rnd(0.02, 0.22) * W, y: rnd(-0.22, -0.02) * H,
      w: Math.max(W, H) * rnd(0.62, 0.85),
      ph: rnd(0, 1), rate: 0.10, a: 0.20
    };

    solenoid = {
      x: rnd(0.55, 0.95) * W, y: rnd(0.02, 0.30) * H,
      w: Math.min(W, H) * rnd(0.22, 0.32),
      rot: rnd(-0.6, 0.6), ph: rnd(0, 1), rate: 0.22, a: 0.22, d: 0.22
    };

    var keys = ['nucA', 'nucB', 'nucC', 'nucD'];
    for (i = 0; i < (small ? 2 : 3); i++) {
      var beads = [], nbead = small ? 5 : Math.round(rnd(6, 9));
      var depth = rnd(0.30, 0.62);
      var size = (small ? 52 : 74) * (0.6 + depth);
      var x = rnd(-0.05, 1.0) * W, y = rnd(0.05, 0.95) * H;
      var ang = rnd(0, 6.28), condensed = Math.random() < 0.3;
      for (b = 0; b < nbead; b++) {
        var step = size * (condensed ? 0.85 : rnd(1.5, 2.1));
        ang += rnd(-0.5, 0.5);
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        beads.push({
          x: x, y: y, w: size * rnd(0.85, 1.15), key: pick(keys),
          rot: rnd(0, 6.28), spin: rnd(-0.10, 0.10),
          ph: rnd(0, 1), rate: rnd(0.34, 0.52), wob: rnd(0, 6.28),
          evict: 0, wx: 0, wy: 0
        });
      }
      fibres.push({ beads: beads, d: depth, sway: rnd(6, 16), phw: rnd(0, 6.28) });
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
      f: host, s: Math.max(-0.6, firstSeen - 0.6), speed: rnd(0.05, 0.08),
      w: small ? 74 : 104, trail: [], ph: rnd(0, 1), rate: 0.75, phw: rnd(0, 6.28)
    };

    var ck = ['cplxA', 'cplxB', 'cplxC'];
    for (i = 0; i < (small ? 2 : 3); i++) {
      complexes.push({
        x: rnd(0, 1) * W, y: rnd(0, 1) * H, key: pick(ck),
        w: (small ? 46 : 66) * rnd(0.7, 1.3), rot: rnd(0, 6.28),
        spin: rnd(-0.06, 0.06), ph: rnd(0, 1), rate: rnd(0.45, 0.7),
        phw: rnd(0, 6.28), d: rnd(0.25, 0.7), vx: rnd(-5, 5), vy: rnd(-5, 5)
      });
    }

    for (i = 0; i < (small ? 1 : 2); i++) {
      helices.push({
        x: rnd(0.05, 0.95) * W, y: rnd(0.05, 0.95) * H,
        w: (small ? 46 : 66) * rnd(0.8, 1.4), rot: rnd(0, 6.28),
        ph: rnd(0, 1), rate: rnd(0.5, 0.8), phw: rnd(0, 6.28),
        d: rnd(0.18, 0.5), a: 0.20
      });
    }

    giants.push({
      bx: (small ? rnd(0.2, 0.8) : rnd(0.58, 0.95)) * W,
      by: rnd(0.15, 0.85) * H, x: 0, y: 0,
      w: Math.min(W, H) * (small ? 0.36 : rnd(0.30, 0.38)),
      rot: rnd(-0.5, 0.5), spin: rnd(-0.022, 0.022),
      ph: rnd(0, 1), rate: 0.30, phw: rnd(0, 6.28), a: 0.30
    });
  }

  function fibrePositions(f, t, px, py) {
    var ox = px * f.d * 34 + Math.sin(t * 0.17 + f.phw) * f.sway;
    var oy = py * f.d * 34 + Math.cos(t * 0.14 + f.phw) * f.sway;
    for (var i = 0; i < f.beads.length; i++) {
      var b = f.beads[i];
      b.wx = b.x + ox + Math.sin(t * 0.35 + b.wob) * 5;
      b.wy = b.y + oy + Math.cos(t * 0.31 + b.wob) * 5;
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
      blit(SP[d.key], d.wx, d.wy - lift, d.w * (1 - d.evict * 0.08),
           d.rot + t * d.spin + d.evict * 0.9,
           a * (1 - d.evict * 0.6),
           d.ph + t * (d.rate + d.evict * 1.6));
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
         cell.ph + t * cell.rate);

    blit(SP.solenoid, solenoid.x + px * 18 + Math.sin(t * 0.07) * 10,
         solenoid.y + py * 18 + Math.cos(t * 0.06) * 10, solenoid.w,
         solenoid.rot + Math.sin(t * 0.09) * 0.05, solenoid.a,
         solenoid.ph + t * solenoid.rate);

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
      blit(SP[c.key],
           c.x + px * c.d * 30 + Math.sin(t * 0.19 + c.phw) * c.vx,
           c.y + py * c.d * 30 + Math.cos(t * 0.17 + c.phw) * c.vy,
           c.w, c.rot + t * c.spin, 0.14 + c.d * 0.26, c.ph + t * c.rate);
    }

    for (i = 0; i < giants.length; i++) {
      var g = giants[i];
      g.x = g.bx + px * 120 + Math.sin(t * 0.12 + g.phw) * 20;
      g.y = g.by + py * 120 + Math.cos(t * 0.10 + g.phw) * 20;
      blit(SP.nucBig, g.x, g.y, g.w, g.rot + t * g.spin, g.a, g.ph + t * g.rate);
    }
  }

  function frame(now) {
    raf = null;
    if (!running || !visible) return;
    var t = (now - t0) / 1000;
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (mx > -9000) { tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06; }
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
