// Nucleosome particle background — ported verbatim from v1 scripts.js (module 11).
// Four layers: DNA double helices, nucleosome discs with histone tails, dust, icon silhouettes.
// Mouse-reactive (180px radius). Skips entirely under prefers-reduced-motion.
(function(){
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // ===== 11. NUCLEOSOME PARTICLE SYSTEM =====
    // Thousands of nucleosome-like particles with histone tails wrapped around DNA strands
    (function() {
      if (prefersReducedMotion) return;
      const canvas = document.getElementById('nucleosome-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let W, H;
      let mouseX = -9999, mouseY = -9999;
      const MOUSE_RADIUS = 180;
      const MOUSE_FORCE = 1.2;

      function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
      }
      resize();
      window.addEventListener('resize', resize, { passive: true });

      document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }, { passive: true });
      document.addEventListener('mouseleave', function() {
        mouseX = -9999;
        mouseY = -9999;
      });

      // Histone color palette
      var H2A = { r: 52, g: 217, b: 110 };   // muted green – H2A
      var H2B = { r: 34, g: 211, b: 238 };   // cyan – H2B
      var H3  = { r: 94, g: 170, b: 255 };   // blue – H3
      var H4  = { r: 244, g: 114, b: 182 };  // pink – H4
      var DNA_COLOR = { r: 100, g: 170, b: 255 }; // soft blue – DNA strand
      var HISTONE_COLORS = [H2A, H2B, H3, H4];

      // --- DNA STRANDS ---
      // Several flowing double-helix-like strands that drift across the screen
      var NUM_STRANDS = Math.max(3, Math.floor(W / 400));
      var strands = [];
      for (var s = 0; s < NUM_STRANDS; s++) {
        strands.push({
          x: Math.random() * W,
          y: Math.random() * H,
          len: 300 + Math.random() * 500,
          angle: Math.random() * Math.PI * 2,
          speed: 0.1 + Math.random() * 0.15,
          amplitude: 20 + Math.random() * 30,
          frequency: 0.02 + Math.random() * 0.015,
          phase: Math.random() * Math.PI * 2,
          drift: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 },
        });
      }

      // --- NUCLEOSOME PARTICLES ---
      // Hundreds of nucleosome discs that drift along or near DNA strands
      var NUM_NUCLEOSOMES = Math.min(600, Math.max(150, Math.floor(W * H / 3000)));
      var nucleosomes = [];
      for (var i = 0; i < NUM_NUCLEOSOMES; i++) {
        var ci = Math.floor(Math.random() * HISTONE_COLORS.length);
        var isLarge = Math.random() < 0.12; // ~12% are large "octamer" nucleosomes
        var r = isLarge ? (8 + Math.random() * 6) : (2 + Math.random() * 4);
        nucleosomes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: r,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          color: HISTONE_COLORS[ci],
          baseAlpha: isLarge ? (0.06 + Math.random() * 0.12) : (0.03 + Math.random() * 0.06),
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.003 + Math.random() * 0.008,
          isLarge: isLarge,
          tailLen: isLarge ? (3 + Math.floor(Math.random() * 4)) : 0,
          tailAngle: Math.random() * Math.PI * 2,
          tailWag: 0.02 + Math.random() * 0.03,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.008,
        });
      }

      // --- TINY FLOATING PARTICLES (dust / free histones) ---
      var NUM_DUST = Math.min(800, Math.max(200, Math.floor(W * H / 2500)));
      var dust = [];
      for (var d = 0; d < NUM_DUST; d++) {
        var dc = HISTONE_COLORS[Math.floor(Math.random() * HISTONE_COLORS.length)];
        dust.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.5 + Math.random() * 1.5,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          color: dc,
          alpha: 0.02 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }

      // --- FLOATING ICON SILHOUETTES ---
      var NUM_ICONS = Math.min(18, Math.max(6, Math.floor(W * H / 80000)));
      var iconShapes = [];
      var ICON_TYPES = ['nucleosome', 'flask', 'helix', 'leaf', 'terminal', 'bracket'];
      for (var fi = 0; fi < NUM_ICONS; fi++) {
        var ic = HISTONE_COLORS[Math.floor(Math.random() * HISTONE_COLORS.length)];
        iconShapes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 14 + Math.random() * 22,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          color: ic,
          alpha: 0.015 + Math.random() * 0.025,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.002,
          type: ICON_TYPES[Math.floor(Math.random() * ICON_TYPES.length)],
          phase: Math.random() * Math.PI * 2,
        });
      }

      function drawIconShape(p, t) {
        var pulse = Math.sin(t * 0.5 + p.phase) * 0.3 + 0.7;
        var alpha = p.alpha * pulse;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.strokeStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        var s = p.size;
        switch(p.type) {
          case 'nucleosome':
            ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-s * 0.6, -s * 0.2);
            ctx.quadraticCurveTo(0, -s * 0.8, s * 0.6, -s * 0.2);
            break;
          case 'flask':
            ctx.moveTo(-s * 0.15, -s * 0.4);
            ctx.lineTo(-s * 0.15, -s * 0.1);
            ctx.lineTo(-s * 0.35, s * 0.4);
            ctx.lineTo(s * 0.35, s * 0.4);
            ctx.lineTo(s * 0.15, -s * 0.1);
            ctx.lineTo(s * 0.15, -s * 0.4);
            ctx.closePath();
            break;
          case 'helix':
            for (var hi = 0; hi < 20; hi++) {
              var hy = -s * 0.5 + hi * s / 20;
              var hx = Math.sin(hi * 0.8 + t * 0.3) * s * 0.3;
              if (hi === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            }
            break;
          case 'leaf':
            ctx.moveTo(0, -s * 0.5);
            ctx.quadraticCurveTo(s * 0.4, -s * 0.1, 0, s * 0.5);
            ctx.quadraticCurveTo(-s * 0.4, -s * 0.1, 0, -s * 0.5);
            break;
          case 'terminal':
            ctx.rect(-s * 0.4, -s * 0.3, s * 0.8, s * 0.6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-s * 0.25, 0);
            ctx.lineTo(-s * 0.05, s * 0.1);
            ctx.lineTo(-s * 0.25, s * 0.2);
            break;
          case 'bracket':
            ctx.moveTo(-s * 0.2, -s * 0.3);
            ctx.lineTo(-s * 0.35, 0);
            ctx.lineTo(-s * 0.2, s * 0.3);
            ctx.moveTo(s * 0.2, -s * 0.3);
            ctx.lineTo(s * 0.35, 0);
            ctx.lineTo(s * 0.2, s * 0.3);
            break;
        }
        ctx.stroke();
        ctx.restore();
      }

      function drawDNAStrand(strand, t) {
        var seg = 4; // px per segment step
        var steps = Math.floor(strand.len / seg);
        var cosA = Math.cos(strand.angle);
        var sinA = Math.sin(strand.angle);
        var ph = strand.phase + t * strand.speed;

        // Two intertwined strands (double helix)
        for (var helix = 0; helix < 2; helix++) {
          var helixOff = helix * Math.PI; // 180° offset
          ctx.beginPath();
          for (var j = 0; j <= steps; j++) {
            var frac = j / steps;
            var along = j * seg;
            var wave = Math.sin(along * strand.frequency + ph + helixOff) * strand.amplitude;
            var px = strand.x + along * cosA - wave * sinA;
            var py = strand.y + along * sinA + wave * cosA;
            // fade at edges
            var edgeFade = Math.sin(frac * Math.PI);
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          var strandAlpha = 0.04 + Math.sin(t * 0.5 + strand.phase) * 0.015;
          ctx.strokeStyle = 'rgba(' + DNA_COLOR.r + ',' + DNA_COLOR.g + ',' + DNA_COLOR.b + ',' + strandAlpha + ')';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Draw "base pair" rungs between the two strands
        for (var j = 0; j <= steps; j += 6) {
          var frac = j / steps;
          var along = j * seg;
          var wave1 = Math.sin(along * strand.frequency + ph) * strand.amplitude;
          var wave2 = Math.sin(along * strand.frequency + ph + Math.PI) * strand.amplitude;
          var x1 = strand.x + along * cosA - wave1 * sinA;
          var y1 = strand.y + along * sinA + wave1 * cosA;
          var x2 = strand.x + along * cosA - wave2 * sinA;
          var y2 = strand.y + along * sinA + wave2 * cosA;
          var edgeFade = Math.sin(frac * Math.PI);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(' + DNA_COLOR.r + ',' + DNA_COLOR.g + ',' + DNA_COLOR.b + ',' + (0.02 * edgeFade) + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      function drawNucleosome(p, t) {
        // Pulsing alpha
        var pulse = Math.sin(t * p.pulseSpeed * 60 + p.phase) * 0.3 + 0.7;
        var alpha = p.baseAlpha * pulse;

        // Main nucleosome disc (slightly oval)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Radial gradient for 3D sphere appearance
        var grad = ctx.createRadialGradient(-p.r * 0.25, -p.r * 0.25, p.r * 0.05, 0, 0, p.r);
        grad.addColorStop(0, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + (alpha * 2) + ')');
        grad.addColorStop(0.5, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0)');

        ctx.beginPath();
        if (p.isLarge) {
          // Slightly flattened disc shape for large nucleosomes
          ctx.ellipse(0, 0, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // DNA wrapping ring around large nucleosomes
        if (p.isLarge) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.9, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + DNA_COLOR.r + ',' + DNA_COLOR.g + ',' + DNA_COLOR.b + ',' + (alpha * 0.4) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Second wrap
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 1.5, p.r * 1.1, 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + DNA_COLOR.r + ',' + DNA_COLOR.g + ',' + DNA_COLOR.b + ',' + (alpha * 0.25) + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        // Histone tails (wiggly lines extending from large nucleosomes)
        if (p.tailLen > 0) {
          for (var ti = 0; ti < p.tailLen; ti++) {
            var tailBaseAngle = (Math.PI * 2 / p.tailLen) * ti + p.tailAngle;
            var tailLength = p.r * (1.5 + Math.random() * 0.5);
            ctx.beginPath();
            var tx0 = Math.cos(tailBaseAngle) * p.r * 0.8;
            var ty0 = Math.sin(tailBaseAngle) * p.r * 0.5;
            ctx.moveTo(tx0, ty0);
            // Wiggly tail with 3 control points
            var wag = Math.sin(t * 2 + p.phase + ti) * p.tailWag * 40;
            var tx1 = tx0 + Math.cos(tailBaseAngle) * tailLength * 0.5 + wag;
            var ty1 = ty0 + Math.sin(tailBaseAngle) * tailLength * 0.5 - wag * 0.5;
            var tx2 = tx0 + Math.cos(tailBaseAngle) * tailLength + wag * 0.7;
            var ty2 = ty0 + Math.sin(tailBaseAngle) * tailLength + wag * 0.3;
            ctx.quadraticCurveTo(tx1, ty1, tx2, ty2);
            // Use the histone color but lighter for tail
            var tailAlpha = alpha * 0.6;
            ctx.strokeStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + tailAlpha + ')';
            ctx.lineWidth = 0.7;
            ctx.stroke();
            // Tiny PTM dot at tail end (acetylation / methylation mark)
            if (Math.random() < 0.5) {
              ctx.beginPath();
              ctx.arc(tx2, ty2, 1, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,255,255,' + (tailAlpha * 0.8) + ')';
              ctx.fill();
            }
          }
        }

        ctx.restore();
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        var t = performance.now() * 0.001;

        // Draw DNA strands first (background layer)
        for (var s = 0; s < strands.length; s++) {
          var strand = strands[s];
          // Drift strands slowly
          strand.x += strand.drift.x;
          strand.y += strand.drift.y;
          // Wrap
          if (strand.x < -strand.len) strand.x = W + 50;
          if (strand.x > W + strand.len) strand.x = -50;
          if (strand.y < -strand.len) strand.y = H + 50;
          if (strand.y > H + strand.len) strand.y = -50;
          drawDNAStrand(strand, t);
        }

        // Draw nucleosomes
        for (var i = 0; i < nucleosomes.length; i++) {
          var p = nucleosomes[i];

          // Mouse repulsion
          var dx = p.x - mouseX;
          var dy = p.y - mouseY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            var force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }

          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.985;
          p.vy *= 0.985;
          p.vx += (Math.random() - 0.5) * 0.015;
          p.vy += (Math.random() - 0.5) * 0.015;
          p.rotation += p.rotSpeed;

          // Wrap
          if (p.x < -p.r * 2) p.x = W + p.r;
          if (p.x > W + p.r * 2) p.x = -p.r;
          if (p.y < -p.r * 2) p.y = H + p.r;
          if (p.y > H + p.r * 2) p.y = -p.r;

          drawNucleosome(p, t);
        }

        // Draw dust / free histones
        for (var d = 0; d < dust.length; d++) {
          var dp = dust[d];
          // Mouse interaction
          var ddx = dp.x - mouseX;
          var ddy = dp.y - mouseY;
          var ddist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (ddist < MOUSE_RADIUS * 0.8 && ddist > 0) {
            var df = (1 - ddist / (MOUSE_RADIUS * 0.8)) * MOUSE_FORCE * 0.5;
            dp.vx += (ddx / ddist) * df;
            dp.vy += (ddy / ddist) * df;
          }

          dp.x += dp.vx;
          dp.y += dp.vy;
          dp.vx *= 0.99;
          dp.vy *= 0.99;
          dp.vx += (Math.random() - 0.5) * 0.008;
          dp.vy += (Math.random() - 0.5) * 0.008;

          // Wrap
          if (dp.x < -5) dp.x = W + 5;
          if (dp.x > W + 5) dp.x = -5;
          if (dp.y < -5) dp.y = H + 5;
          if (dp.y > H + 5) dp.y = -5;

          var dAlpha = dp.alpha * (0.6 + 0.4 * Math.sin(t * 1.5 + dp.phase));
          ctx.beginPath();
          ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + dp.color.r + ',' + dp.color.g + ',' + dp.color.b + ',' + dAlpha + ')';
          ctx.fill();
        }

        // Draw floating icon silhouettes
        for (var fi = 0; fi < iconShapes.length; fi++) {
          var ip = iconShapes[fi];
          ip.x += ip.vx;
          ip.y += ip.vy;
          ip.rotation += ip.rotSpeed;
          if (ip.x < -50) ip.x = W + 50;
          if (ip.x > W + 50) ip.x = -50;
          if (ip.y < -50) ip.y = H + 50;
          if (ip.y > H + 50) ip.y = -50;
          var dix = ip.x - mouseX;
          var diy = ip.y - mouseY;
          var diDist = Math.sqrt(dix * dix + diy * diy);
          if (diDist < MOUSE_RADIUS && diDist > 0) {
            var dif = (1 - diDist / MOUSE_RADIUS) * MOUSE_FORCE * 0.3;
            ip.x += (dix / diDist) * dif;
            ip.y += (diy / diDist) * dif;
          }
          drawIconShape(ip, t);
        }

        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    })();
})();
