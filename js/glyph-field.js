/* biopelayo.github.io — glyph field.
   A grid of faint DNA bases (A, T, C, G) that slowly mutate.
   A wave of light drifts across it, the pointer lights up a halo around it,
   and a click sends an expanding ripple that paints each base its own colour
   (A green, T red, C blue, G amber) and leaves a fading coloured wake. */
(function () {
  'use strict';

  var canvas = document.getElementById('glyph-field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CHARS = ['A', 'T', 'C', 'G'];
  var BASE = { A: '46,204,113', T: '239,83,80', C: '66,165,245', G: '255,193,7' };
  var CELL = 16, RADIUS = 170;
  var W = 0, H = 0, DPR = 1, cols = 0, rows = 0, grid = [], heat = [];
  var mx = -9999, my = -9999, ripples = [], raf = null, visible = true;
  var color = '52,217,110';

  function pick() { return CHARS[(Math.random() * CHARS.length) | 0]; }

  function readColor() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    color = light ? '45,106,79' : '52,217,110';
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    CELL = W < 600 ? 13 : 16;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = (CELL - 3) + 'px ui-monospace, "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
    grid = new Array(cols * rows);
    heat = new Float32Array(cols * rows);
    for (var i = 0; i < grid.length; i++) grid[i] = pick();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var s = t * 0.001;
    var n = (grid.length * 0.004) | 0;
    for (var k = 0; k < n; k++) grid[(Math.random() * grid.length) | 0] = pick();

    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].rad += 9;
      if (ripples[r].rad > Math.max(W, H) * 1.3) ripples.splice(r, 1);
    }

    for (var y = 0; y < rows; y++) {
      var py = y * CELL + CELL / 2;
      for (var x = 0; x < cols; x++) {
        var px = x * CELL + CELL / 2;
        // slow drifting wave of light
        var a = 0.05 + 0.05 * (Math.sin(x * 0.12 + s * 0.7) * Math.cos(y * 0.15 - s * 0.5) + 1) / 2;
        // pointer halo
        var dx = px - mx, dy = py - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < RADIUS) a += 0.6 * (1 - d / RADIUS) * (1 - d / RADIUS);
        // click ripples
        for (var j = 0; j < ripples.length; j++) {
          var R = ripples[j], rx = px - R.x, ry = py - R.y;
          var band = Math.abs(Math.sqrt(rx * rx + ry * ry) - R.rad);
          if (band < 26) {
            var f = (1 - band / 26) * Math.max(0, 1 - R.rad / (Math.max(W, H) * 1.3));
            if (f > heat[y * cols + x]) heat[y * cols + x] = f;
            if (f > 0.5 && Math.random() < 0.3) grid[y * cols + x] = pick();
          }
        }
        var i = y * cols + x, ch = grid[i], h = heat[i];
        if (h > 0.03) {
          heat[i] = h * 0.97;
          ctx.fillStyle = 'rgba(' + BASE[ch] + ',' + Math.min(1, a + h).toFixed(3) + ')';
        } else {
          if (a > 1) a = 1;
          ctx.fillStyle = 'rgba(' + color + ',' + a.toFixed(3) + ')';
        }
        ctx.fillText(ch, px, py);
      }
    }
  }

  function loop(t) {
    draw(t);
    raf = visible ? requestAnimationFrame(loop) : null;
  }

  function start() { if (!raf && !reduced) raf = requestAnimationFrame(loop); }

  window.addEventListener('resize', function () { resize(); if (reduced) draw(0); });
  window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', function () { mx = my = -9999; });
  document.addEventListener('mouseleave', function () { mx = my = -9999; });
  window.addEventListener('pointerdown', function (e) {
    ripples.push({ x: e.clientX, y: e.clientY, rad: 0 });
    if (ripples.length > 4) ripples.shift();
    if (reduced) draw(0);
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) start();
  });
  new MutationObserver(readColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  readColor();
  resize();
  if (reduced) draw(0); else start();
})();
