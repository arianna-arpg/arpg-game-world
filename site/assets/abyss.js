/* ============================================================
   Hollow Wake · the abyss backdrop (shared)
   The Mu pane, live behind every page: a depth well low on the
   first viewport, vast faint nebular lobes, and three strata of
   drifting motes whose scroll parallax reads as depth. Mounts a
   canvas inside the existing .bg-veil layer; pages without one
   skip cleanly. Honors prefers-reduced-motion with one still
   frame. Zero deps, zero state beyond the clock.
   ============================================================ */
(function () {
  var veil = document.querySelector('.bg-veil');
  if (!veil) return;
  var cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  cv.setAttribute('aria-hidden', 'true');
  veil.appendChild(cv);
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var ETHER = [154, 184, 220]; // the pale ether ink of the space between lives
  var W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = veil.clientWidth; H = veil.clientHeight;
    cv.width = Math.max(1, Math.round(W * DPR));
    cv.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function h01(i, s) { // tiny deterministic hash, matched to the game's idiom
    var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function wrap(v, span) { return ((v % span) + span) % span; }
  function rgba(a) { return 'rgba(' + ETHER[0] + ',' + ETHER[1] + ',' + ETHER[2] + ',' + a + ')'; }

  var STRATA = [
    { n: 30, par: 0.06, size: 0.9, a: 0.14, salt: 3 },
    { n: 20, par: 0.14, size: 1.5, a: 0.22, salt: 101 },
    { n: 12, par: 0.26, size: 2.2, a: 0.32, salt: 211 },
  ];

  function paint(t) {
    if (!(W > 0) || !(H > 0)) return;
    var sy = window.scrollY || 0;
    ctx.clearRect(0, 0, W, H);
    // THE ONE GLOW (the flip, her word): the chart's own ether starlight
    // hugging the BOTTOM of the view — a breathing lift that says there is
    // more below. The rim past it sinks to true dark.
    var vh = Math.min(H, window.innerHeight);
    var cx = W / 2, cy = vh * 1.06 - sy * 0.05;
    var breathe = 1 + 0.07 * Math.sin(t * 0.35);
    var well = ctx.createRadialGradient(cx, cy, Math.min(W, 600) * 0.05, cx, cy, Math.max(W, 900) * 0.55);
    well.addColorStop(0, rgba((0.13 * breathe).toFixed(3)));
    well.addColorStop(0.55, 'rgba(0,0,0,0)');
    well.addColorStop(1, 'rgba(2,2,6,0.45)');
    ctx.fillStyle = well;
    ctx.fillRect(0, 0, W, H);
    // The nebular lobes: vast, slow, barely there.
    for (var i = 0; i < 3; i++) {
      var r = 200 + h01(i, 41) * 260;
      var sx = W + r * 2, syn = H + r * 2;
      var x = wrap(h01(i, 43) * sx + t * (1.2 + h01(i, 45) * 1.6) + sy * 0.03, sx) - r;
      var y = wrap(h01(i, 47) * syn + Math.sin(t * 0.05 + i * 2.1) * 26 - sy * 0.05, syn) - r;
      var lobe = ctx.createRadialGradient(x, y, 0, x, y, r);
      lobe.addColorStop(0, rgba('0.03'));
      lobe.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lobe;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Three mote strata: deeper drifts slower against the scroll.
    for (var s = 0; s < STRATA.length; s++) {
      var st = STRATA[s];
      for (var j = 0; j < st.n; j++) {
        var mx = wrap(h01(j, st.salt) * (W + 40) + t * (2 + h01(j, st.salt + 2) * 5), W + 40) - 20;
        var my = wrap(h01(j, st.salt + 4) * (H + 40) + t * (1 + h01(j, st.salt + 6) * 3)
          + Math.sin(t * (0.3 + h01(j, st.salt + 8) * 0.4) + j) * 9 - sy * st.par, H + 40) - 20;
        var tw = 0.6 + 0.4 * Math.sin(t * (0.4 + h01(j, st.salt + 10) * 0.8) + j * 1.7);
        ctx.globalAlpha = st.a * tw;
        ctx.fillStyle = rgba('1');
        ctx.beginPath();
        ctx.arc(mx, my, st.size * (0.8 + h01(j, st.salt + 12) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { paint(3.7); return; } // one considered frame, no animation
  var t0 = performance.now();
  (function loop(now) {
    paint((now - t0) / 1000);
    requestAnimationFrame(loop);
  })(t0);
})();
