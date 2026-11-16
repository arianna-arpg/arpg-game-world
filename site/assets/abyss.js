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
    var ratio = Math.min(2, window.devicePixelRatio || 1), width = veil.clientWidth, height = veil.clientHeight;
    if (W === width && H === height && DPR === ratio) return false;
    DPR = ratio; W = width; H = height;
    cv.width = Math.max(1, Math.round(W * DPR));
    cv.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return true;
  }
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
  // The deterministic seeds never change; only their time/scroll offsets do.
  var lobes = Array.from({ length: 3 }, function (_, i) {
    return { r: 200 + h01(i,41)*260, x: h01(i,43), vx: 1.2+h01(i,45)*1.6, y: h01(i,47) };
  });
  STRATA.forEach(function (st) {
    st.motes = Array.from({ length: st.n }, function (_, j) {
      return { x:h01(j,st.salt), vx:2+h01(j,st.salt+2)*5, y:h01(j,st.salt+4), vy:1+h01(j,st.salt+6)*3,
        sway:.3+h01(j,st.salt+8)*.4, twinkle:.4+h01(j,st.salt+10)*.8, radius:st.size*(.8+h01(j,st.salt+12)*.5) };
    });
  });

  function paint(t) {
    if (!(W > 0) || !(H > 0)) return;
    var sy = window.scrollY || 0;
    ctx.clearRect(0, 0, W, H);
    // THE ONE GLOW (the flip, her word): the chart's own ether starlight
    // ANCHORED at the bottom of the view: pinned to the viewport exactly
    // like the old corner radials were (no scroll coupling at all): the
    // breathing lift that says there is more below, staying below.
    // THE HONEST CUE (her word): the light DISSOLVES over the last stretch
    // of scroll: a promise of more below must go dark when there is
    // nothing below; at the page's true end (and on pages too short to
    // scroll) only the void's rim remains.
    var vh = Math.min(H, window.innerHeight);
    var maxScroll = Math.max(0,
      (document.documentElement.scrollHeight || 0) - window.innerHeight);
    var remaining = Math.max(0, maxScroll - sy);
    var span = Math.max(1, vh * 0.9);
    var cue = Math.min(1, remaining / span);
    cue = cue * cue * (3 - 2 * cue); // smoothstep: a gentle going-out
    var cx = W / 2, cy = vh * 1.06;
    var breathe = 1 + 0.07 * Math.sin(t * 0.35);
    var well = ctx.createRadialGradient(cx, cy, Math.min(W, 600) * 0.05, cx, cy, Math.max(W, 900) * 0.55);
    well.addColorStop(0, rgba((0.13 * breathe * cue).toFixed(3)));
    well.addColorStop(0.55, 'rgba(0,0,0,0)');
    well.addColorStop(1, 'rgba(2,2,6,0.45)');
    ctx.fillStyle = well;
    ctx.fillRect(0, 0, W, H);
    // The nebular lobes: vast, slow, barely there.
    for (var i = 0; i < 3; i++) {
      var seed = lobes[i], r = seed.r;
      var sx = W + r * 2, syn = H + r * 2;
      var x = wrap(seed.x * sx + t * seed.vx + sy * 0.03, sx) - r;
      var y = wrap(seed.y * syn + Math.sin(t * 0.05 + i * 2.1) * 26 - sy * 0.05, syn) - r;
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
        var mote = st.motes[j];
        var mx = wrap(mote.x * (W + 40) + t * mote.vx, W + 40) - 20;
        var my = wrap(mote.y * (H + 40) + t * mote.vy + Math.sin(t * mote.sway + j) * 9 - sy * st.par, H + 40) - 20;
        var tw = 0.6 + 0.4 * Math.sin(t * mote.twinkle + j * 1.7);
        ctx.globalAlpha = st.a * tw;
        ctx.fillStyle = rgba('1');
        ctx.beginPath();
        ctx.arc(mx, my, mote.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  var motion = matchMedia('(prefers-reduced-motion: reduce)'), still = motion.matches;
  var covered = document.documentElement.classList.contains('hwcine-covered'), away = false, raf = 0;
  var elapsed = 0, previous = 0, dirty = true;
  function available() { return !covered && !away && !document.hidden; }
  function wake() { if (!raf && available() && (!still || dirty)) raf = requestAnimationFrame(loop); }
  function suspend() { cancelAnimationFrame(raf); raf = 0; previous = 0; }
  function loop(now) {
    raf = 0;
    if (!available()) return;
    if (!still && previous) elapsed += Math.min(100, now-previous)/1000;
    previous = now;
    paint(still ? 3.7 : elapsed); dirty = false;
    wake();
  }
  window.addEventListener('resize', function () { if (resize()) { dirty = true; wake(); } });
  window.addEventListener('scroll', function () { if (still) { dirty = true; wake(); } }, {passive:true});
  document.addEventListener('hw:cinema-coverage', function (event) { covered = event.detail.covered; suspend(); wake(); });
  document.addEventListener('visibilitychange', function () { suspend(); wake(); });
  window.addEventListener('pagehide', function () { away = true; suspend(); });
  window.addEventListener('pageshow', function () { away = false; wake(); });
  motion.addEventListener('change', function (event) { still = event.matches; dirty = true; suspend(); wake(); });
  wake();
})();
