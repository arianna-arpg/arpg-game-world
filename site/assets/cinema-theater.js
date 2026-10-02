/* Hollow Wake · the cinema theater.
   The heavy half of the site cinema; assets/cinema.js holds the registry, the
   arrival gate and the triggers, and loads this file on demand. It lays a
   blanket of darkness over the page, raises the film out of it, and ends by
   breaking the screen: cracks race out from the viewer's click, the pieces
   fall away, and light pours through onto the page beneath.

   Registers window.HWCinemaTheater = { open(film, opts, api) }.
   Contract: docs/design/site-cinema.md */
(function () {
  'use strict';
  if (window.HWCinemaTheater) return;

  var TAU = Math.PI * 2;
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TOUCH = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  var RIM_PAD = 4;   // CSS px the mind's-eye canvas overhangs the stage on every side
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* the insignia, breathing in the dark while a film finds its feet */
  var MARK = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="12" stroke="url(#hwcineG)" stroke-width="1.1" opacity=".85"/><path d="M16 11.6V6.2M19.8 18.2l4.7 2.7M12.2 18.2l-4.7 2.7" stroke="url(#hwcineG)" stroke-width=".9" opacity=".5"/><circle cx="16" cy="16" r="4.4" stroke="url(#hwcineG)" stroke-width="1.2"/><circle cx="16" cy="4" r="1.9" fill="#4fd6c4"/><circle cx="26.4" cy="22" r="1.9" fill="#a98bff"/><circle cx="5.6" cy="22" r="1.9" fill="#ff8a4c"/><defs><linearGradient id="hwcineG" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#b0c6e4"/><stop offset="1" stop-color="#8fa8d8"/></linearGradient></defs></svg>';
  var ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var ICON_LOW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/></svg>';

  // ── styles (injected once, scoped to .hwcine) ───────────────────────────────
  var styled = false;
  function injectCSS(T) {
    if (styled) return;
    styled = true;
    var b = T.blanket;
    var css =
      '.hwcine{position:fixed;inset:0;z-index:2147483001;outline:none;cursor:default;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;overscroll-behavior:contain;touch-action:none}' +
      '.hwcine.hwcine-idle{cursor:none}' +
      '.hwcine-blanket{position:absolute;inset:0;background:rgba(' + b[0] + ',' + b[1] + ',' + b[2] + ',' + b[3] + ');opacity:0;transition:opacity ' + (T.openSeconds || 0.7) + 's ease,clip-path ' + (T.openSeconds || 0.7) * 1.25 + 's cubic-bezier(.25,.7,.2,1)}' +
      '.hwcine-open .hwcine-blanket{opacity:1}' +
      '.hwcine-splash .hwcine-blanket{transition:none}' +
      '.hwcine-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity ' + (T.revealSeconds || 1.1) + 's ease}' +
      '.hwcine-live .hwcine-stage{opacity:1}' +
      '.hwcine-video{display:block;width:100%;height:100%;object-fit:contain;background:transparent;transition:filter .35s}' +
      '.hwcine-paused .hwcine-video{filter:brightness(.55)}' +
      /* THE MIND'S EYE: the living rim over the picture, under the captions;
         without WebGL2 a still, soft-edged window stands in for it */
      '.hwcine-rim{position:absolute;left:-' + RIM_PAD + 'px;top:-' + RIM_PAD + 'px;width:calc(100% + ' + 2 * RIM_PAD + 'px);height:calc(100% + ' + 2 * RIM_PAD + 'px);pointer-events:none}' +
      '.hwcine-rimcss{position:absolute;pointer-events:none}' +
      '.hwcine-cap{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity .35s ease}' +
      '.hwcine-cap.on{opacity:1}' +
      '.hwcine-cap span{font-family:"Cinzel",Georgia,serif;font-weight:500;letter-spacing:.06em;line-height:1.3;color:#e6e2d6;text-align:center;padding:0 7%;text-shadow:0 0 14px rgba(0,0,0,.95),0 1px 3px rgba(0,0,0,.95)}' +
      '.hwcine-breath{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;opacity:0;transition:opacity .9s ease;pointer-events:none}' +
      '.hwcine-breath.on{opacity:.55}' +
      '.hwcine-breath svg{display:block;width:100%;height:100%;animation:hwcine-breathe 3.6s ease-in-out infinite}' +
      '@keyframes hwcine-breathe{0%,100%{transform:scale(.94);opacity:.55}50%{transform:scale(1.05);opacity:1}}' +
      '.hwcine-play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:1px solid rgba(176,198,228,.4);opacity:0;transition:opacity .3s;pointer-events:none}' +
      '.hwcine-play::after{content:"";position:absolute;left:26px;top:21px;border-style:solid;border-width:11px 0 11px 17px;border-color:transparent transparent transparent rgba(233,234,242,.85)}' +
      '.hwcine-paused .hwcine-play{opacity:1}' +
      '.hwcine-bar{position:absolute;left:0;right:0;bottom:0;height:2px;opacity:0;transition:opacity .6s;pointer-events:none}' +
      '.hwcine-live .hwcine-bar{opacity:.6}' +
      '.hwcine-bar i{position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,rgba(143,168,216,.1),rgba(176,198,228,.85))}' +
      '.hwcine-next{position:absolute;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);margin:0;padding:10px 16px;border:0;background:none;font:600 11px/1 "Space Grotesk",system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;white-space:nowrap;color:rgba(233,234,242,.46);cursor:pointer;opacity:0;transition:opacity 1s ease,color .2s}' +
      '.hwcine-next.on{opacity:1}' +
      '.hwcine-next:hover,.hwcine-next:focus-visible{color:rgba(233,234,242,.92)}' +
      '.hwcine-next:focus-visible,.hwcine-sound:focus-visible{outline:2px solid #4fd6c4;outline-offset:3px;border-radius:999px}' +
      /* THE SOUND PILL: a speaker (mute) and a level slider that opens on
         hover or keyboard focus, and stays open on touch screens */
      '.hwcine-audio{position:absolute;right:calc(18px + env(safe-area-inset-right,0px));top:calc(16px + env(safe-area-inset-top,0px));display:flex;align-items:center;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(10,11,18,.55);opacity:0;transition:opacity .45s ease,border-color .2s,background .2s}' +
      '.hwcine-audio.on{opacity:.85}' +
      '.hwcine-audio:hover,.hwcine-audio:focus-within{opacity:1;border-color:rgba(79,214,196,.45);background:rgba(10,11,18,.8)}' +
      '.hwcine-audio.ask{opacity:1;border-color:rgba(143,168,216,.5)}' +
      '.hwcine-audio.ask.pulse{animation:hwcine-ask 2.2s ease-out 3}' +
      '.hwcine-sound{display:flex;align-items:center;gap:9px;margin:0;padding:9px 11px;border:0;border-radius:999px;background:none;color:#e9eaf2;font:600 11.5px/1 "Space Grotesk",system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}' +
      '.hwcine-sound .lbl{display:none;padding-right:2px}' +
      '.hwcine-audio.ask .hwcine-sound .lbl{display:inline}' +
      '.hwcine-vol{-webkit-appearance:none;appearance:none;width:0;height:26px;margin:0;padding:0;opacity:0;background:transparent;cursor:pointer;transition:width .28s ease,opacity .2s ease,margin .28s ease}' +
      '.hwcine-audio:hover .hwcine-vol,.hwcine-audio:focus-within .hwcine-vol{width:96px;opacity:1;margin:0 15px 0 1px}' +
      '@media (hover:none){.hwcine-audio.on .hwcine-vol{width:88px;opacity:1;margin:0 15px 0 1px}}' +
      '.hwcine-vol:focus{outline:none}' +
      '.hwcine-vol::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,#b0c6e4 0,#b0c6e4 var(--v,80%),rgba(255,255,255,.18) var(--v,80%))}' +
      '.hwcine-vol::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-4.5px;border:0;border-radius:50%;background:#e9eaf2;box-shadow:0 0 0 3px rgba(143,168,216,.22)}' +
      '.hwcine-vol:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #4fd6c4}' +
      '.hwcine-vol::-moz-range-track{height:3px;border-radius:2px;background:rgba(255,255,255,.18)}' +
      '.hwcine-vol::-moz-range-progress{height:3px;border-radius:2px;background:#b0c6e4}' +
      '.hwcine-vol::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:#e9eaf2;box-shadow:0 0 0 3px rgba(143,168,216,.22)}' +
      '.hwcine-vol:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px #4fd6c4}' +
      '@keyframes hwcine-ask{0%{box-shadow:0 0 0 0 rgba(143,168,216,.4)}100%{box-shadow:0 0 0 16px rgba(143,168,216,0)}}' +
      '.hwcine-exit .hwcine-next,.hwcine-exit .hwcine-audio,.hwcine-exit .hwcine-bar,.hwcine-exit .hwcine-cap,.hwcine-exit .hwcine-breath,.hwcine-exit .hwcine-play{transition:none;opacity:0!important}' +
      '.hwcine-gl{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
      '.hwcine-fade .hwcine-stage{transition:opacity .55s ease;opacity:0}' +
      '.hwcine-fade .hwcine-blanket{transition:opacity .95s ease .15s;opacity:0}' +
      '.hwcine-wash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(60% 55% at var(--x,50%) var(--y,50%),rgba(214,228,255,.34),rgba(143,168,216,.1) 45%,transparent 75%);transition:opacity .35s ease}' +
      '.hwcine-fade .hwcine-wash{opacity:1;transition:opacity 1.1s ease .2s;opacity:0}' +
      'html.hwcine-lock{overflow:hidden;scrollbar-gutter:stable}' +
      '@media (prefers-reduced-motion:reduce){.hwcine-breath svg,.hwcine-audio.ask.pulse{animation:none}}';
    var st = document.createElement('style');
    st.setAttribute('data-hwcine-theater', '');
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── choosing a rendition ────────────────────────────────────────────────────
  var probe = null;
  function playable(s) {
    if (!s || !s.src) return false;
    if (!s.type) return true;
    probe = probe || document.createElement('video');
    try { return probe.canPlayType(s.type) !== ''; } catch (e) { return false; }
  }
  function pickSource(f, needH) {
    var list = (f.sources || []).filter(playable);
    if (!list.length) return null;
    var fam = list[0].family || list[0].type || '';
    var same = list.filter(function (s) { return (s.family || s.type || '') === fam; })
      .sort(function (a, b) { return (a.height || 0) - (b.height || 0); });
    var conn = navigator.connection || {};
    var lean = conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '') || (conn.downlink && conn.downlink < 2);
    if (lean) return same[0];
    for (var i = 0; i < same.length; i++) if ((same[i].height || 0) >= needH * 0.9) return same[i];
    return same[same.length - 1];
  }

  // ── the theater ─────────────────────────────────────────────────────────────
  function Theater(f, opts, api, resolve) {
    this.f = f;
    this.opts = opts || {};
    this.api = api;
    this.T = api.registry.theater;
    this.resolve = resolve;
    this.splash = this.opts.mode === 'splash';
    this.preview = !!this.opts.preview;
    this.state = 'opening';
    this.started = false;
    this.timers = [];
    this.listeners = [];
    this.raf = 0;
  }
  var P = Theater.prototype;

  /* the theater's words, with a film's own words over them (a clip closes, a trailer continues) */
  P.words = function () {
    var out = {}, k, base = this.T.words || {}, own = this.f.words || {};
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in own) if (Object.prototype.hasOwnProperty.call(own, k)) out[k] = own[k];
    return out;
  };
  P.later = function (fn, sec) { var id = setTimeout(fn, sec * 1000); this.timers.push(id); return id; };
  P.on = function (target, type, fn, o) { target.addEventListener(type, fn, o || false); this.listeners.push([target, type, fn, o || false]); };

  P.build = function () {
    var f = this.f, T = this.T, W = this.words();
    var R = this.rimR = rimSpec(f, T);
    injectCSS(T);
    var el = this.el = document.createElement('div');
    el.className = 'hwcine' + (this.splash ? ' hwcine-splash' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', f.title || 'Film');
    el.tabIndex = -1;
    el.innerHTML =
      '<div class="hwcine-blanket"></div>' +
      '<div class="hwcine-stage"><video class="hwcine-video" playsinline webkit-playsinline preload="auto" disablepictureinpicture disableremoteplayback x-webkit-airplay="deny"></video>' +
      (R ? '<canvas class="hwcine-rim" aria-hidden="true"></canvas>' : '') +
      '<div class="hwcine-cap" aria-hidden="true"><span></span></div><div class="hwcine-play" aria-hidden="true"></div></div>' +
      '<div class="hwcine-wash" aria-hidden="true"></div>' +
      '<div class="hwcine-breath" aria-hidden="true">' + MARK + '</div>' +
      (T.progress !== false ? '<div class="hwcine-bar" aria-hidden="true"><i></i></div>' : '') +
      '<div class="hwcine-audio" role="group"><button class="hwcine-sound" type="button" aria-pressed="false"><span class="ico"></span><span class="lbl"></span></button>' +
      '<input class="hwcine-vol" type="range" min="0" max="100" step="1" value="80"></div>' +
      '<button class="hwcine-next" type="button"></button>';
    this.blanket = el.querySelector('.hwcine-blanket');
    this.stage = el.querySelector('.hwcine-stage');
    this.video = el.querySelector('.hwcine-video');
    this.cap = el.querySelector('.hwcine-cap');
    this.capText = this.cap.querySelector('span');
    this.breath = el.querySelector('.hwcine-breath');
    this.bar = el.querySelector('.hwcine-bar i');
    this.sound = el.querySelector('.hwcine-sound');
    this.audio = el.querySelector('.hwcine-audio');
    this.volEl = el.querySelector('.hwcine-vol');
    this.next = el.querySelector('.hwcine-next');
    this.wash = el.querySelector('.hwcine-wash');
    /* the mind's eye: the living rim, or its still stand-in without WebGL2 */
    if (R) {
      var rc = el.querySelector('.hwcine-rim');
      this.rim = MindsEye.create(rc, R);
      if (this.rim) this.rim.watch(this.video);   // the film's own bars, measured as it plays
      if (!this.rim) {
        rc.parentNode.removeChild(rc);
        this.rimCss = document.createElement('div');
        this.rimCss.className = 'hwcine-rimcss';
        this.rimCss.setAttribute('aria-hidden', 'true');
        this.stage.insertBefore(this.rimCss, this.cap);
      }
    }
    this.next.textContent = TOUCH ? (W.nextTouch || W.next || 'Continue') : (W.next || 'Continue');
    this.sound.querySelector('.lbl').textContent = W.soundOn || 'Sound on';
    this.audio.setAttribute('aria-label', W.sound || 'Sound');
    this.volEl.setAttribute('aria-label', W.volume || 'Volume');
    /* the viewer's own level, remembered between visits */
    this.level = typeof this.api.volume === 'function' ? this.api.volume() : 0.8;
    this.video.muted = !!f.silent;
    this.video.volume = this.level;
    /* a looping film (a skill clip) plays until the viewer leaves; a silent
       one wears no sound pill at all, and plays muted, so no browser ever
       holds it for a gesture */
    if (f.loop) this.video.loop = true;
    if (f.silent) this.audio.style.display = 'none';
    if (f.cors) this.video.crossOrigin = 'anonymous';
    if (f.poster) this.video.poster = this.api.url(f.poster);
    /* the darkness spills from the place the viewer clicked */
    var at = this.opts.at;
    if (!this.splash && at && !REDUCE && 'clipPath' in document.documentElement.style) {
      this.blanket.style.clipPath = 'circle(0px at ' + at.x + 'px ' + at.y + 'px)';
    }
    document.body.appendChild(el);
    document.documentElement.classList.add('hwcine-lock');
    this.layout();
  };

  P.layout = function () {
    var f = this.f, T = this.T;
    /* the overlay's own box: a reserved scrollbar gutter sits outside it */
    var vw = this.el.clientWidth || window.innerWidth, vh = this.el.clientHeight || window.innerHeight, a = f.aspect || 16 / 9;
    var mw = vw * (T.stage ? T.stage[0] : 0.9), mh = vh * (T.stage ? T.stage[1] : 0.84);
    if (vw < 700) mw = vw;   // phones: the film takes the full width
    var w = Math.min(mw, mh * a), h = w / a;
    this.stage.style.width = w + 'px';
    this.stage.style.height = h + 'px';
    var band = (f.captions && f.captions.band) || [0.86, 1];
    /* a line centers in its band; a long one on a small screen grows down
       into the dark rather than up over the picture */
    this.cap.style.top = (band[0] * h) + 'px';
    this.cap.style.minHeight = ((band[1] - band[0]) * h) + 'px';
    this.capText.style.fontSize = clamp(h * 0.034, 12, 26) + 'px';
    this.w = w; this.h = h;
    if (this.rim) this.rim.resize(w, h);
    if (this.rimCss) {
      /* the still stand-in: a rounded window on the picture's edge, a soft
         inner shadow, and the ink reaching past the square corners */
      var R = this.rimR, pic = R.picture, ph = (pic[3] - pic[1]) * h, ink = R.ink.map(function (c) { return Math.round(c * 255); }).join(',');
      var s = this.rimCss.style;
      s.left = pic[0] * w + 'px'; s.top = pic[1] * h + 'px';
      s.width = (pic[2] - pic[0]) * w + 'px'; s.height = ph + 'px';
      s.borderRadius = (R.round || 0) * ph + 'px';
      s.boxShadow = '0 0 0 ' + Math.ceil(ph * 0.5) + 'px rgb(' + ink + '),inset 0 0 ' + Math.round((R.feather || 0.15) * ph * 1.6) + 'px ' + Math.round((R.feather || 0.15) * ph * 0.35) + 'px rgb(' + ink + ')';
    }
  };

  P.stageRect = function () {
    var r = this.stage.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  P.start = function () {
    var self = this, f = this.f, T = this.T, v;
    this.build();
    v = this.video;
    if (this.splash) {
      this.el.classList.add('hwcine-open');
      this.api.disarm();          // the arrival darkness hands over, same color, same frame
    } else {
      /* one frame at rest, then the darkness settles (and spills, if it can) */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          self.el.classList.add('hwcine-open');
          if (self.blanket.style.clipPath) {
            var at = self.opts.at, far = Math.hypot(Math.max(at.x, window.innerWidth - at.x), Math.max(at.y, window.innerHeight - at.y));
            self.blanket.style.clipPath = 'circle(' + Math.ceil(far + 40) + 'px at ' + at.x + 'px ' + at.y + 'px)';
          }
        });
      });
    }
    this.prevFocus = document.activeElement;
    try { this.el.focus({ preventScroll: true }); } catch (e) { this.el.focus(); }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var src = pickSource(f, this.h * dpr);
    if (!src) { this.abort('no playable source'); return; }
    this.source = src;
    v.src = this.api.url(src.src);
    this.captions();
    this.bind();
    this.tryPlay();

    this.later(function () { if (!self.started && self.state === 'opening') self.breath.classList.add('on'); }, 0.9);
    this.later(function () { if (!self.started && self.state === 'opening') self.abort('the film did not start'); }, T.stallSeconds || 9);
    /* the shatter compiles while the film plays, so the break never hitches */
    if (!REDUCE && (!f.exit || f.exit.kind !== 'fade')) this.later(function () { self.gl = Shatter.create(); }, 0.8);
  };

  P.tryPlay = function () {
    var self = this, v = this.video, p;
    v.muted = !!this.f.silent;
    try { p = v.play(); } catch (e) { p = null; }
    if (!p || !p.then) return;
    p.then(null, function (err) {
      if (self.state !== 'opening' && self.state !== 'playing') return;
      if (err && err.name === 'NotAllowedError') {
        /* the browser wants a gesture before sound: play muted, offer sound */
        v.muted = true;
        self.askSound();
        var q;
        try { q = v.play(); } catch (e) { q = null; }
        if (q && q.then) q.then(null, function () { self.abort('playback refused'); });
      } else if (!err || err.name !== 'AbortError') {
        self.abort(err && err.message ? err.message : 'playback failed');
      }
    });
  };

  P.captions = function () {
    var self = this, c = this.f.captions;
    if (!c || !c.src || c.show === 'never') return;
    var tr = document.createElement('track');
    tr.kind = 'captions';
    tr.srclang = c.lang || 'en';
    tr.label = c.label || 'Narration';
    tr.src = this.api.url(c.src);
    tr.default = true;
    this.video.appendChild(tr);
    var tt = tr.track;
    if (!tt) return;
    tt.mode = 'hidden';
    this.track = tt;
    var draw = function () {
      var cues = tt.activeCues, text = cues && cues.length ? cues[cues.length - 1].text : '';
      if (text) self.capText.textContent = text;
      self.capOn = !!text;
      self.showCaption();
    };
    tt.addEventListener('cuechange', draw);
  };
  P.showCaption = function () {
    var c = this.f.captions;
    if (!c) return;
    var want = this.capOn && (c.show === 'always' || this.video.muted);
    this.cap.classList.toggle('on', !!want);
  };

  P.askSound = function () {
    var a = this.audio;
    a.classList.add('on', 'ask', 'pulse');
    this.syncSound();
    this.later(function () { a.classList.remove('pulse'); }, 7);
  };
  P.syncSound = function () {
    var W = this.words(), v = this.video, silent = v.muted || v.volume < 0.005;
    this.sound.querySelector('.ico').innerHTML = silent ? ICON_OFF : v.volume < 0.4 ? ICON_LOW : ICON_ON;
    this.sound.setAttribute('aria-pressed', silent ? 'false' : 'true');
    this.sound.setAttribute('aria-label', silent ? (W.unmute || 'Unmute') : (W.mute || 'Mute'));
    var shown = silent ? 0 : Math.round(v.volume * 100);
    this.volEl.value = String(shown);
    this.volEl.style.setProperty('--v', shown + '%');
    this.volEl.setAttribute('aria-valuetext', shown + '%');
    if (!silent) this.audio.classList.remove('ask', 'pulse');
    this.showCaption();
  };
  /* a level from the slider or the arrow keys: zero is silence, anything
     above it speaks; the choice is remembered once the hand settles */
  P.setLevel = function (x) {
    var v = this.video, self = this;
    x = clamp(x, 0, 1);
    v.volume = x;
    v.muted = x < 0.005;
    if (x >= 0.005) this.level = x;
    if (!v.muted && v.paused && this.state === 'playing' && !this.pausedByViewer) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    this.syncSound();
    this.wake();
    clearTimeout(this.levelT);
    this.levelT = setTimeout(function () { if (typeof self.api.volume === 'function') self.api.volume(x); }, 300);
  };
  P.toggleSound = function () {
    var v = this.video;
    if (v.muted || v.volume < 0.005) this.setLevel(this.level >= 0.05 ? this.level : 0.8);
    else { v.muted = true; this.syncSound(); this.wake(); }
  };
  P.togglePause = function () {
    var v = this.video;
    if (this.state !== 'playing') return;
    if (v.paused) { this.pausedByViewer = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); this.el.classList.remove('hwcine-paused'); }
    else { this.pausedByViewer = true; v.pause(); this.el.classList.add('hwcine-paused'); }
  };

  /* pointer activity wakes the controls; stillness hides them and the cursor */
  P.wake = function () {
    var self = this;
    if (this.state !== 'playing') return;
    this.el.classList.remove('hwcine-idle');
    this.audio.classList.add('on');
    clearTimeout(this.idleT);
    this.idleT = setTimeout(function () {
      if (self.state !== 'playing') return;
      /* a hand on the pill keeps it awake */
      if (self.audio.matches(':hover') || self.audio.contains(document.activeElement)) { self.wake(); return; }
      self.el.classList.add('hwcine-idle');
      if (!self.video.muted) self.audio.classList.remove('on');
    }, 2400);
  };

  P.bind = function () {
    var self = this, v = this.video, el = this.el;
    this.on(v, 'playing', function () {
      self.breath.classList.remove('on');
      if (self.started) return;
      self.started = true;
      self.state = 'playing';
      el.classList.add('hwcine-live');
      if (self.rim) self.rim.live();   // the eye opens with the first live frame
      /* a film marked record: false (a skill clip) never touches the splash's memory */
      if (!self.preview && self.f.record !== false) self.api.seen(self.f.id);
      self.syncSound();
      self.showCaption();
      self.later(function () { if (self.state === 'playing') self.next.classList.add('on'); }, self.T.hintSeconds || 1.8);
      self.wake();
      self.tick();
    });
    this.on(v, 'waiting', function () {
      if (!self.started) return;
      clearTimeout(self.waitT);
      self.waitT = setTimeout(function () { if (self.state === 'playing' && v.readyState < 3) self.breath.classList.add('on'); }, 1200);
    });
    this.on(v, 'canplay', function () { clearTimeout(self.waitT); self.breath.classList.remove('on'); });
    this.on(v, 'ended', function () { self.exit(null); });
    this.on(v, 'error', function () { if (!self.started) self.abort('the film could not load'); });
    this.on(this.sound, 'click', function (e) { e.stopPropagation(); self.toggleSound(); });
    this.on(this.volEl, 'input', function () { self.setLevel(Number(self.volEl.value) / 100); });
    this.on(this.audio, 'click', function (e) { e.stopPropagation(); });
    /* a slider drag that ends outside the pill still clicks the overlay;
       a press that began on the pill never means "continue" */
    this.on(el, 'pointerdown', function (e) { self.pillPress = self.audio.contains(e.target); }, true);
    this.on(this.next, 'click', function (e) {
      e.stopPropagation();
      var pointer = e.detail > 0 && (e.clientX || e.clientY);
      self.exit(pointer ? { x: e.clientX, y: e.clientY } : null);
    });
    this.on(el, 'click', function (e) {
      if (self.pillPress) { self.pillPress = false; return; }
      self.exit({ x: e.clientX, y: e.clientY });
    });
    this.on(el, 'pointermove', function () { self.wake(); });
    this.on(window, 'wheel', function (e) { e.preventDefault(); }, { passive: false });
    this.on(window, 'touchmove', function (e) { e.preventDefault(); }, { passive: false });
    this.on(document, 'keydown', function (e) { self.key(e); }, true);
    this.on(window, 'resize', function () { if (self.state === 'opening' || self.state === 'playing') self.layout(); });
    this.on(document, 'visibilitychange', function () {
      if (self.state !== 'playing') return;
      if (document.hidden) { if (!v.paused) { self.hiddenPause = true; v.pause(); } }
      else if (self.hiddenPause) { self.hiddenPause = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  };

  P.key = function (e) {
    if (this.state === 'closed') return;
    var k = e.key;
    if (k === 'Escape' || k === 'Esc') { e.preventDefault(); e.stopPropagation(); this.exit(null); return; }
    if (this.state !== 'playing' && this.state !== 'opening') { e.preventDefault(); return; }
    if (k === 'Tab') {
      var items = [this.sound, this.volEl, this.next].filter(function (b) { return b.offsetParent !== null; });
      var i = items.indexOf(document.activeElement);
      e.preventDefault();
      if (!items.length) return;
      i = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
      items[i].focus();
      this.wake();
      return;
    }
    var onButton = document.activeElement === this.sound || document.activeElement === this.next;
    if ((k === ' ' || k === 'Spacebar' || k === 'Enter') && onButton) return;   // the button acts
    if (k === ' ' || k === 'Spacebar' || k === 'k' || k === 'K') { e.preventDefault(); this.togglePause(); return; }
    if (k === 'm' || k === 'M') { e.preventDefault(); this.toggleSound(); return; }
    /* the focused slider takes its own arrows; elsewhere up/down turn the level */
    if (document.activeElement === this.volEl) return;
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      var cur = this.video.muted ? 0 : this.video.volume;
      this.setLevel(Math.round((cur + (k === 'ArrowUp' ? 0.1 : -0.1)) * 10) / 10);
      return;
    }
    if (/^(Arrow|Page|Home|End)/.test(k)) e.preventDefault();
  };

  P.tick = function () {
    var self = this, v = this.video;
    if (this.state !== 'playing') return;
    if (this.bar && v.duration) this.bar.style.transform = 'scaleX(' + clamp(v.currentTime / v.duration, 0, 1).toFixed(4) + ')';
    if (this.rim) this.rim.draw();
    this.raf = requestAnimationFrame(function () { self.tick(); });
  };

  // ── the exit ────────────────────────────────────────────────────────────────
  P.exitPoint = function () {
    var r = this.stageRect(), a = (this.f.exit && this.f.exit.at) || [0.5, 0.5];
    return { x: r.x + a[0] * r.w, y: r.y + a[1] * r.h };
  };
  P.exit = function (at) {
    if (this.state !== 'opening' && this.state !== 'playing') return;
    var self = this, v = this.video;
    /* an ended film reports paused; it still spoke to the very end */
    var spoke = this.started && !v.muted && (!v.paused || v.ended);
    var level = v.muted ? 0 : v.volume;   // read before the duck below lowers it
    var rim = this.rim ? this.rim.state() : null;   // the rim as the viewer last saw it: the break bakes it in
    this.state = 'exiting';
    cancelAnimationFrame(this.raf);
    this.el.classList.add('hwcine-exit');
    this.el.classList.remove('hwcine-idle', 'hwcine-paused');
    var kind = (this.f.exit && this.f.exit.kind) || 'shatter';
    var S = kind === 'shatter' && !REDUCE ? (this.gl || Shatter.create()) : null;
    var p = at || this.exitPoint();
    /* the film's own sound bows out in a breath rather than a click */
    this.duck(0.14);
    if (S && S.ok) {
      var pace = (this.f.exit && this.f.exit.pace) || 1;
      var sound = spoke;
      S.run({
        host: this.el,
        video: this.started ? v : null,
        rect: this.stageRect(),
        blanket: this.T.blanket,
        rim: rim,
        at: p,
        pace: pace,
        cover: function () { self.stage.style.visibility = 'hidden'; self.blanket.style.visibility = 'hidden'; },
        done: function () { self.close(true); },
      });
      if (sound) shatterSound(pace, null, level);
    } else {
      this.fadeOut(p);
    }
  };
  P.duck = function (sec) {
    var v = this.video, from = v.volume, t0 = now(), self = this;
    if (v.muted || v.paused) { v.pause(); return; }
    (function step() {
      var k = (now() - t0) / (sec * 1000);
      if (k >= 1) { v.volume = 0; v.pause(); return; }
      v.volume = from * (1 - k);
      requestAnimationFrame(step);
    })();
    this.later(function () { v.pause(); }, sec + 0.1);
  };
  P.fadeOut = function (p, failed) {
    var self = this;
    if (p) {
      this.wash.style.setProperty('--x', p.x + 'px'); this.wash.style.setProperty('--y', p.y + 'px');
      this.wash.style.opacity = '1';
    }
    requestAnimationFrame(function () { self.el.classList.add('hwcine-fade'); self.wash.style.opacity = ''; });
    this.later(function () { self.close(!failed); }, 1.25);
  };
  P.abort = function (why) {
    if (this.state === 'closed' || this.state === 'exiting') return;
    if (window.console) console.warn('[cinema]', why);
    if (!this.started && !this.preview) this.api.failed();
    this.state = 'exiting';
    this.el.classList.add('hwcine-exit');
    try { this.video.pause(); } catch (e) { /* already gone */ }
    this.api.disarm();
    this.fadeOut(null, true);
  };
  P.close = function (ok) {
    if (this.state === 'closed') return;
    this.state = 'closed';
    this.timers.forEach(clearTimeout);
    clearTimeout(this.idleT); clearTimeout(this.waitT);
    cancelAnimationFrame(this.raf);
    this.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    try { this.video.removeAttribute('src'); this.video.load(); } catch (e) { /* released */ }
    if (this.gl) this.gl.release();
    if (this.rim) this.rim.release();
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    document.documentElement.classList.remove('hwcine-lock');
    var back = this.opts.from && this.opts.from.querySelector ? (this.opts.from.querySelector('.hwcine-voice') || null) : null;
    var target = document.activeElement === document.body || !document.activeElement ? (back && back === this.prevFocus ? back : this.prevFocus) : null;
    if (target && target.focus && document.contains(target)) { try { target.focus({ preventScroll: true }); } catch (e) { /* not focusable */ } }
    this.resolve(!!ok);
  };

  // ── the mind's eye: the picture held in the dark like a thought ────────────
  /* ONE function, two consumers: the rim's own canvas over the playing film,
     and the shatter's bake of the frozen frame, so the break starts on
     exactly the picture the viewer saw. The window is a rounded "eye" on the
     picture's own edge; its border creeps and swirls through slow,
     domain-warped noise that turns about the centre (faster toward the rim),
     and the band between clear and dark breathes like smoke. */
  var RIM_GLSL =
    'uniform vec4 uPic; uniform vec2 uStage; uniform vec4 uRimA; uniform vec4 uRimB; uniform float uOpen; uniform float uRimV;\n' +
    'float rimH(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }\n' +
    'float rimN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
    '  float a = mix(mix(rimH(i), rimH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(rimH(i + vec3(0.0, 1.0, 0.0)), rimH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);\n' +
    '  float b = mix(mix(rimH(i + vec3(0.0, 0.0, 1.0)), rimH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(rimH(i + vec3(0.0, 1.0, 1.0)), rimH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);\n' +
    '  return mix(a, b, f.z) * 2.0 - 1.0; }\n' +
    'float rimF(vec3 p, int oct){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { if (k >= oct) break; s += a * rimN(p); p = p * 2.03 + vec3(17.1, 5.3, 3.7); a *= 0.5; } return s; }\n' +
    /* the dark over this point of the stage (uv 0..1, y down): uPic is the
       picture's rect in the stage, lengths are in picture heights */
    'float rimDark(vec2 uv){\n' +
    '  vec2 lo = uPic.xy * uStage, hi = uPic.zw * uStage;\n' +
    '  float ph = max(1.0, hi.y - lo.y);\n' +
    '  vec2 p = (uv * uStage - (lo + hi) * 0.5) / ph, b = (hi - lo) * 0.5 / ph;\n' +
    /* the window is measured with its height stretched by 1 / uRimV, so the
       top and bottom bands (and their creep) run uRimV as deep as the sides:
       a wide picture keeps its height */
    '  vec2 kv = vec2(1.0, 1.0 / max(0.05, uRimV)), pk = p * kv, bk = b * kv;\n' +
    /* the eye opening: like eyelids, the window's height opens from a thin,
       wide slit (uOpen is the share of its height open), its width from
       three quarters of the picture */
    '  vec2 bo = bk * vec2(mix(0.75, 1.0, uOpen), uOpen);\n' +
    '  float r = min(uRimA.z, min(bo.x, bo.y));\n' +
    '  vec2 q = abs(pk) - (bo - r);\n' +
    '  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;\n' +
    '  if (d < -(uRimA.x + 2.1 * uRimA.y)) return 0.0;\n' +
    '  float t = uRimB.x, ang = uRimB.y + uRimB.z * length(p);\n' +
    '  vec2 sw = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * p * uRimA.w;\n' +
    '  vec3 s = vec3(sw, t);\n' +
    /* the border moves on broad octaves (soft wisps, never a torn edge); the
       smoke inside the band keeps the fine ones */
    '  vec2 w = vec2(rimF(s + vec3(1.7, 9.2, 0.0), 3), rimF(s + vec3(8.3, 2.8, 0.0), 3));\n' +
    '  float n = rimF(s + vec3(1.6 * w, 0.0), 3);\n' +
    '  float a = smoothstep(-uRimA.x, 0.0, d + uRimA.y * n * 2.2);\n' +
    '  float m = rimF(vec3(sw * 2.4, t * 1.6 + 4.0), 4);\n' +
    '  return clamp(a + uRimB.w * m * a * (1.0 - a) * 2.4, 0.0, 1.0);\n' +
    '}\n';
  var FS_RIM =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv;\n' +
    'uniform vec3 uInk; uniform vec2 uPad;\n' +
    RIM_GLSL +
    'out vec4 o;\n' +
    'void main(){\n' +
    /* the canvas overhangs the stage by uPad (stage units) on every side, so
       no layer snapping can ever show the video's own edge past the dark */
    '  float a = rimDark(vec2(vUv.x, 1.0 - vUv.y) * (1.0 + 2.0 * uPad) - uPad);\n' +
    /* a hair of dither so the dark's long ramp never bands */
    '  if (a > 0.0) a = clamp(a + (rimH(vec3(gl_FragCoord.xy, 7.0)) - 0.5) / 160.0, 0.0, 1.0);\n' +
    '  o = vec4(uInk * a, a);\n' +
    '}\n';
  /* the shatter's bake: the frozen frame with the rim laid in (uv = texture
     space; the frame was uploaded unflipped, so its rows already run down) */
  var FS_RIMBAKE =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv;\n' +
    'uniform sampler2D uSrc; uniform vec3 uInk;\n' +
    RIM_GLSL +
    'out vec4 o;\n' +
    'void main(){ o = vec4(mix(texture(uSrc, vUv).rgb, uInk, rimDark(vUv)), 1.0); }\n';

  /* the film's rim, or null. Every film the policy names wears it
     (theater.rim.apply: 'trailers' = films that do not loop, 'all', 'none')
     unless it says rim: false; rim: true or an object opts any film in, and
     an object's dials sit over the theater's. A film may name its picture's
     share of the frame; otherwise the rim measures the film's own bars as it
     plays (MindsEye.watch), so a new film needs no setting at all. */
  function rimSpec(f, T) {
    var base = T.rim || {}, apply = base.apply || 'trailers';
    var on = f.rim === false ? false : f.rim ? true : apply === 'all' || (apply === 'trailers' && !f.loop);
    if (!on) return null;
    var out = {}, k, own = typeof f.rim === 'object' ? f.rim : {};
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in own) if (Object.prototype.hasOwnProperty.call(own, k)) out[k] = own[k];
    var b = T.blanket || [0, 0, 0, 1];
    out.fixed = !!f.picture;
    out.picture = (f.picture || [0, 0, 1, 1]).slice();
    out.ink = [b[0] / 255, b[1] / 255, b[2] / 255];
    out.open = out.open || [1, 0];
    return out;
  }
  /* secs: the rim's own clock in seconds; it sets both the noise's depth
     (drift) and the field's turn (swirl), so the two dials stay independent.
     pic: the picture rect to draw with (the shatter passes the one it froze) */
  function rimUniforms(gl, u, R, w, h, secs, open, pic) {
    var P = pic || R.picture;
    gl.uniform4f(u.uPic, P[0], P[1], P[2], P[3]);
    gl.uniform2f(u.uStage, Math.max(1, w), Math.max(1, h));
    gl.uniform4f(u.uRimA, R.feather || 0.15, R.creep || 0, R.round || 0, R.grain || 2);
    gl.uniform4f(u.uRimB, secs * (R.drift || 0), secs * (R.swirl || 0), R.twist || 0, R.mist || 0);
    gl.uniform1f(u.uOpen, open);
    gl.uniform1f(u.uRimV, R.vertical || 1);
    gl.uniform3fv(u.uInk, R.ink);
  }

  /* THE BARS, MEASURED: a film's picture is wherever its frame is not black.
     A tiny copy of the frame (taller than wide: the edge that matters is
     usually top and bottom) is read a few times a second; every row and
     column whose mean rises above the threshold belongs to the picture, the
     extent only grows (dark scenes cannot shrink it), and the edge is taken
     at the inner side of the boundary sample, so any error falls inside the
     picture, where the rim's dark already covers the true edge. */
  var BARS = { w: 128, h: 288, every: 250, lum: 6, settle: 3000, quit: 15000 };
  function measureBars(video, ctx) {
    var W = BARS.w, H = BARS.h, d;
    ctx.drawImage(video, 0, 0, W, H);
    try { d = ctx.getImageData(0, 0, W, H).data; } catch (e) { return null; }   // a cross-origin film without CORS
    var rows = new Float32Array(H), cols = new Float32Array(W), x, y, i, l;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        i = (y * W + x) * 4;
        l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        rows[y] += l; cols[x] += l;
      }
    }
    var top = -1, bot = -1, left = -1, right = -1;
    for (y = 0; y < H; y++) if (rows[y] / W > BARS.lum) { if (top < 0) top = y; bot = y; }
    for (x = 0; x < W; x++) if (cols[x] / H > BARS.lum) { if (left < 0) left = x; right = x; }
    if (top < 0 || left < 0) return null;   // a black frame says nothing
    return [left === 0 ? 0 : (left + 1) / W, top === 0 ? 0 : (top + 1) / H,
      right === W - 1 ? 1 : right / W, bot === H - 1 ? 1 : bot / H];
  }
  var MindsEye = {
    create: function (cv, R) {
      var gl = null, prog = null;
      try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
      if (!gl) return null;
      try { prog = compile(gl, VS_FULL, FS_RIM); } catch (e) {
        if (window.console) console.warn('[cinema] rim shader', e && e.message);
        return null;
      }
      var E = { gl: gl, cv: cv, R: R, vao: gl.createVertexArray(), t0: now(), liveAt: 0, w: 0, h: 0, drawn: false,
        target: R.picture.slice(), detected: false, video: null, bars: null, probeAt: 0, firstProbe: 0, grewAt: 0, lastT: now() };
      /* the film's bars, measured while it plays (unless the film named its picture) */
      E.watch = function (video) {
        if (R.fixed || !video) return;
        var c = document.createElement('canvas');
        c.width = BARS.w; c.height = BARS.h;
        E.video = video;
        E.bars = c.getContext('2d', { willReadFrequently: true });
      };
      /* one step of the measuring and the easing; true when the picture moved */
      E.measure = function () {
        var tn = now(), v = E.video;
        if (E.bars && v && v.readyState >= 2 && !v.paused && tn - E.probeAt >= BARS.every) {
          if (!E.firstProbe) E.firstProbe = tn;
          E.probeAt = tn;
          var m = null;
          try { m = measureBars(v, E.bars); } catch (e) { m = null; }
          if (m) {
            var t = E.target, grew = !E.detected;
            if (!E.detected) { E.target = m; E.detected = true; }
            else {
              if (m[0] < t[0]) { t[0] = m[0]; grew = true; }
              if (m[1] < t[1]) { t[1] = m[1]; grew = true; }
              if (m[2] > t[2]) { t[2] = m[2]; grew = true; }
              if (m[3] > t[3]) { t[3] = m[3]; grew = true; }
            }
            if (grew) E.grewAt = tn;
          }
          /* the extent has held long enough (or the film is long past its opening): stop reading */
          if ((E.detected && tn - E.grewAt > BARS.settle) || tn - E.firstProbe > BARS.quit) E.bars = null;
        }
        var dt = Math.min(0.1, (tn - E.lastT) / 1000), moved = false, P = R.picture, j, k;
        E.lastT = tn;
        if (R.fixed) return false;
        k = REDUCE ? 1 : 1 - Math.exp(-dt / 0.25);   // reduced motion: snap, never slide
        for (j = 0; j < 4; j++) {
          var dlt = E.target[j] - P[j];
          if (Math.abs(dlt) > 1e-4) { P[j] += dlt * k; moved = true; } else P[j] = E.target[j];
        }
        return moved;
      };
      E.picture = function () { return R.picture.slice(); };
      /* the dark's clock in seconds: one still moment under reduced motion */
      E.time = function () { return REDUCE ? 23 : (now() - E.t0) / 1000; };
      /* the eye opening, eased from the first live frame */
      E.open = function () {
        var o = R.open;
        if (REDUCE || !(o[1] > 0)) return 1;
        if (!E.liveAt) return o[0];
        var k = smooth((now() - E.liveAt) / 1000 / o[1]);
        return o[0] + (1 - o[0]) * k;
      };
      E.live = function () { if (!E.liveAt) E.liveAt = now(); };
      E.resize = function (w, h) {
        E.w = w; E.h = h;
        var s = R.scale || 0.5;
        cv.width = Math.max(2, Math.round((w + 2 * RIM_PAD) * s));
        cv.height = Math.max(2, Math.round((h + 2 * RIM_PAD) * s));
        E.drawn = false;
        E.draw();
      };
      E.draw = function () {
        var moved = E.measure();
        if (REDUCE && E.drawn && !moved) return;
        gl.viewport(0, 0, cv.width, cv.height);
        gl.disable(gl.BLEND);
        gl.useProgram(prog.p);
        rimUniforms(gl, prog.u, R, E.w, E.h, E.time(), E.open());
        gl.uniform2f(prog.u.uPad, RIM_PAD / Math.max(1, E.w), RIM_PAD / Math.max(1, E.h));
        gl.bindVertexArray(E.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        E.drawn = true;
      };
      /* the rim as it stands this moment, for the shatter's bake */
      E.state = function () { return { R: R, secs: E.time(), open: E.open(), picture: R.picture.slice() }; };
      E.release = function () {
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      };
      return E;
    },
  };

  // ── the shatter: cracks, the break, and the light behind the screen ────────
  var VS_SHARD =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 aPos; in vec2 aCtr; in float aEdge; in vec4 aRnd; in float aDist; in float aSeam;\n' +
    'uniform vec2 uView; uniform vec2 uImpact; uniform float uBreak; uniform float uWave; uniform float uCam;\n' +
    'uniform float uShake; uniform float uTime; uniform float uCrack; uniform float uSettle; uniform float uFar;\n' +
    'out vec2 vRest; out float vEdge; out vec3 vN; out float vFade; out float vLife; out float vDist; out float vSeam;\n' +
    'mat3 rot(vec3 a, float t){ float s = sin(t), c = cos(t), o = 1.0 - c;\n' +
    '  return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,\n' +
    '              o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,\n' +
    '              o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }\n' +
    'void main(){\n' +
    '  float t = max(0.0, uBreak - aDist * uWave);\n' +
    '  vec2 out2 = aCtr - uImpact; float ol = length(out2);\n' +
    '  vec2 dir = ol > 0.5 ? out2 / ol : normalize(aRnd.xy - 0.5 + 1e-3);\n' +
    /* near the strike the glass bursts toward the viewer; out at the rim the
       long panes mostly drop and turn under their own weight */
    '  float near = 1.0 - aDist;\n' +
    '  float speed = mix(80.0, 860.0, near * near) * (0.6 + 0.8 * aRnd.z);\n' +
    '  float zv = mix(50.0, 950.0, near * near) * (0.5 + aRnd.w);\n' +
    '  vec3 axis = normalize(vec3(aRnd.x - 0.5, aRnd.y - 0.5, (aRnd.z - 0.5) * 0.5) + vec3(1e-4));\n' +
    '  float spin = (1.1 + 5.5 * aRnd.w) * (aRnd.x > 0.5 ? 1.0 : -1.0) * mix(0.35, 1.0, near);\n' +
    '  mat3 R = rot(axis, spin * t);\n' +
    '  vec3 local = R * vec3(aPos - aCtr, 0.0);\n' +
    '  vec3 p = vec3(aCtr, 0.0) + local + vec3(dir * speed * t + vec2(0.0, 640.0 * t * t), zv * t);\n' +
    '  float reached = step(length(aCtr - uImpact), uCrack);\n' +
    '  p.xy += (aRnd.yz - 0.5) * 2.4 * uSettle * reached;\n' +
    '  p.xy += uShake * near * vec2(sin(uTime * 83.0 + aRnd.x * 40.0), cos(uTime * 71.0 + aRnd.y * 40.0));\n' +
    '  vec2 c = uView * 0.5;\n' +
    '  float z = min(p.z, uCam * 0.9);\n' +
    '  vec2 sp = c + (p.xy - c) * (uCam / (uCam - z));\n' +
    '  gl_Position = vec4(sp / uView * 2.0 - 1.0, 0.5 - 0.5 * z / uCam, 1.0);\n' +
    '  gl_Position.y = -gl_Position.y;\n' +
    '  vRest = aPos; vEdge = aEdge; vN = R * vec3(0.0, 0.0, 1.0); vLife = t; vDist = aDist; vSeam = aSeam;\n' +
    '  vFade = (1.0 - smoothstep(uCam * 0.55, uCam * 0.88, p.z)) * (1.0 - smoothstep(1.4, 1.95, t));\n' +
    '}\n';
  var FS_SHARD =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vRest; in float vEdge; in vec3 vN; in float vFade; in float vLife; in float vDist; in float vSeam;\n' +
    'uniform sampler2D uFrame; uniform float uHasFrame; uniform vec4 uRect; uniform vec4 uBlanket;\n' +
    'uniform vec2 uImpact; uniform float uCrack; uniform float uGlow; uniform float uFlare; uniform vec3 uLight;\n' +
    'out vec4 o;\n' +
    'void main(){\n' +
    '  vec2 q = (vRest - uRect.xy) / uRect.zw;\n' +
    '  vec4 base = vec4(uBlanket.rgb * uBlanket.a, uBlanket.a);\n' +
    '  float dark = 1.0;\n' +
    '  if (q.x >= 0.0 && q.y >= 0.0 && q.x <= 1.0 && q.y <= 1.0) { dark = 0.0; if (uHasFrame > 0.5) base = vec4(texture(uFrame, q).rgb, 1.0); }\n' +
    /* the seam: a hairline core and a soft halo, both in screen pixels */
    '  float w = max(fwidth(vEdge), 1e-4);\n' +
    '  float rim = 1.0 - smoothstep(0.0, w * 0.95, vEdge);\n' +
    '  float halo = 1.0 - smoothstep(0.0, w * 5.5, vEdge);\n' +
    '  float d = length(vRest - uImpact);\n' +
    '  float reached = 1.0 - smoothstep(uCrack - 30.0, uCrack, d);\n' +
    '  float tip = exp(-pow((d - uCrack) / 46.0, 2.0)) * step(0.001, uCrack);\n' +
    '  float crack = ((rim * 0.95 + halo * 0.2) * reached * uGlow + rim * tip * 1.5) * vSeam;\n' +
    '  vec3 n = normalize(vN);\n' +
    '  float tilt = clamp(1.0 - abs(n.z), 0.0, 1.0);\n' +
    /* the half vector sits well off the screen normal: a resting pane never
       glints, a falling one flashes as it turns through the light */
    '  vec3 h = normalize(vec3(0.45, -0.7, 1.0));\n' +
    '  float glint = pow(max(dot(n, h), 0.0), 60.0) * step(0.001, vLife);\n' +
    /* in flight: a thin lit edge, and a faint sheen as a pane turns, so the
       dark pieces read as glass rather than paper */
    '  float edgeLit = rim * (0.12 + 0.55 * tilt) * uFlare;\n' +
    '  float sheen = tilt * 0.07 * step(0.001, vLife);\n' +
    '  vec3 lit = uLight * (crack + glint * 1.2 + edgeLit + sheen);\n' +
    /* the darkness thins as it flies (glass, not card), so the light and the
       page read through it; the picture's own pieces stay solid */
    '  float keep = 1.0 - dark * smoothstep(0.05, 0.9, vLife) * 0.7;\n' +
    '  vec3 surf = base.rgb * (1.0 - 0.42 * tilt) * keep;\n' +
    '  o = vec4((surf + lit) * vFade, base.a * keep * vFade);\n' +
    '}\n';
  var VS_FULL =
    '#version 300 es\n' +
    'out vec2 vUv;\n' +
    'void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }\n';
  var FS_LIGHT =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv;\n' +
    'uniform vec2 uView; uniform vec2 uImpact; uniform float uFlash; uniform float uRays; uniform float uRing; uniform float uRingA;\n' +
    'uniform float uTime; uniform float uSeed; uniform vec3 uLight; uniform vec3 uRay;\n' +
    'uniform float uOver; uniform float uStrike;\n' +
    'out vec4 o;\n' +
    'void main(){\n' +
    '  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;\n' +
    '  vec2 d = p - uImpact; float r = length(d); float a = atan(d.y, d.x);\n' +
    '  float m = max(uView.x, uView.y);\n' +
    '  float fall = 1.0 / (1.0 + pow(r / (m * 0.3), 1.7));\n' +
    '  float core = exp(-pow(r / (m * 0.075), 2.0));\n' +
    '  if (uOver > 0.5) {\n' +
    /* over the glass: the strike, its ring, and the glare of the break */
    '    float ring = exp(-pow((r - uRing) / (m * 0.006 + 3.0), 2.0)) * uRingA;\n' +
    '    float strike = exp(-pow(r / (m * 0.016 + 5.0), 2.0)) * uStrike;\n' +
    '    o = vec4(uLight * (ring * 0.45 + strike * 1.5 + uFlash * core * 0.35), 0.0);\n' +
    '    return;\n' +
    '  }\n' +
    /* behind the glass: the light that pours through every gap */
    '  float rays = pow(0.5 + 0.5 * sin(a * 7.0 + uSeed + uTime * 0.35), 7.0)\n' +
    '             + 0.75 * pow(0.5 + 0.5 * sin(a * 13.0 - uSeed * 1.7 - uTime * 0.22), 11.0)\n' +
    '             + 0.5 * pow(0.5 + 0.5 * sin(a * 31.0 + uSeed * 3.1 + uTime * 0.1), 18.0);\n' +
    '  vec3 col = uLight * (uFlash * (0.45 * fall + 0.7 * core)) + uRay * (uRays * rays * fall * 0.85);\n' +
    '  o = vec4(col, 0.0);\n' +
    '}\n';
  var VS_DUST =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 aO; in vec2 aV; in vec4 aP; in vec3 aC;\n' +
    'uniform vec2 uView; uniform float uT; uniform float uDpr;\n' +
    'out vec3 vC;\n' +
    'void main(){\n' +
    '  float t = uT - aP.z; float k = t / aP.x;\n' +
    '  if (t < 0.0 || k > 1.0) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; vC = vec3(0.0); return; }\n' +
    '  vec2 p = aO + aV * t + vec2(0.0, aP.w) * t * t;\n' +
    '  gl_Position = vec4(p / uView * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y;\n' +
    '  gl_PointSize = aP.y * uDpr * (1.0 - 0.35 * k);\n' +
    '  float tw = 0.55 + 0.45 * sin(t * 31.0 + aP.z * 173.0);\n' +
    '  float life = (1.0 - k) * (1.0 - k) * smoothstep(0.0, 0.06, t);\n' +
    '  vC = aC * tw * life;\n' +
    '}\n';
  var FS_DUST =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec3 vC; out vec4 o;\n' +
    'void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q, q) * 4.0; float a = exp(-d * 3.2); o = vec4(vC * a, 0.0); }\n';

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* THE CRACK PATTERN: radial cracks from the impact crossed by rings that
     widen outward, as struck glass breaks: dust at the point, long panes at
     the rim. Every seam is shared by the two shards on either side. */
  function crackPattern(W, H, P, rnd) {
    var far = Math.max(Math.hypot(P.x, P.y), Math.hypot(W - P.x, P.y), Math.hypot(P.x, H - P.y), Math.hypot(W - P.x, H - P.y)) * 1.03;
    var NR = 13 + Math.floor(rnd() * 6), base = rnd() * TAU, ang = [], i, j, uid = 1;
    for (i = 0; i < NR; i++) ang.push(base + (i + (rnd() - 0.5) * 0.62) * TAU / NR);
    var rings = [0], r = 9 + rnd() * 9;
    while (r < far) { rings.push(r); r *= 1.36 + rnd() * 0.5; }
    rings.push(far * 1.06);
    function pt(x, y) { return { x: x, y: y, k: uid++ }; }
    var C = pt(P.x, P.y);
    var V = [];   // V[j][i]: ring j, radial i
    for (j = 1; j < rings.length; j++) {
      V[j] = [];
      for (i = 0; i < NR; i++) {
        var a = ang[i] + (rnd() - 0.5) * 0.2, rr = rings[j] * (1 + (rnd() - 0.5) * 0.22);
        V[j][i] = pt(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr);
      }
    }
    /* a bent midpoint on each long ring seam, shared by both neighbours */
    var M = [];
    for (j = 1; j < rings.length; j++) {
      M[j] = [];
      for (i = 0; i < NR; i++) {
        var A = V[j][i], B = V[j][(i + 1) % NR], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        if (len > 70) {
          var s = 0.35 + rnd() * 0.3, off = (rnd() - 0.5) * Math.min(30, len * 0.14);
          M[j][i] = pt(A.x + dx * s - dy / len * off, A.y + dy * s + dx / len * off);
        } else M[j][i] = null;
      }
    }
    /* THE SEAMS: every edge is one seam, lit (or not) the same from both
       sides. Radial cracks always show; the rings show mostly near the
       strike and thin out toward the rim, as struck glass does. */
    var seams = {};
    function seam(a, b, kind, ring) {
      var key = a.k < b.k ? a.k + '_' + b.k : b.k + '_' + a.k;
      if (seams[key] != null) return seams[key];
      var v;
      if (kind === 'radial') v = 0.65 + 0.35 * rnd();
      else if (kind === 'ring') v = rnd() < (ring <= 2 ? 0.9 : ring <= 4 ? 0.62 : 0.34) ? 0.4 + 0.6 * rnd() : 0;
      else v = rnd() < 0.3 ? 0.3 + 0.4 * rnd() : 0;
      seams[key] = v;
      return v;
    }
    /* a polygon's edges carry their seam's light: [vertex, light of the edge to the next] */
    function ringRun(list, from, mid, to, ring) {
      if (mid) { list.push([from, seam(from, mid, 'ring', ring)], [mid, seam(mid, to, 'ring', ring)]); }
      else list.push([from, seam(from, to, 'ring', ring)]);
    }
    var polys = [];
    for (i = 0; i < NR; i++) {
      var i2 = (i + 1) % NR;
      var inner = [[C, seam(C, V[1][i], 'radial')]];
      ringRun(inner, V[1][i], M[1][i], V[1][i2], 1);
      inner.push([V[1][i2], seam(V[1][i2], C, 'radial')]);
      polys.push(inner);
      for (j = 1; j < rings.length - 1; j++) {
        var a0 = V[j][i], a1 = V[j][i2], b1 = V[j + 1][i2], b0 = V[j + 1][i];
        var mi = M[j][i], mo = M[j + 1][i];
        var outer = [];   // b1 → (mo) → b0, walked backward along the outer ring
        if (mo) outer.push([b1, seam(b1, mo, 'ring', j + 1)], [mo, seam(mo, b0, 'ring', j + 1)]);
        else outer.push([b1, seam(b1, b0, 'ring', j + 1)]);
        if (j > 1 && rnd() < 0.3) {
          var p1 = [];
          ringRun(p1, a0, mi, a1, j);
          p1.push([a1, seam(a1, b1, 'radial')], [b1, seam(b1, a0, 'split')]);
          var p2 = [[a0, seam(a0, b1, 'split')]].concat(outer).concat([[b0, seam(b0, a0, 'radial')]]);
          polys.push(p1, p2);
        } else {
          var q = [];
          ringRun(q, a0, mi, a1, j);
          q.push([a1, seam(a1, b1, 'radial')]);
          q = q.concat(outer);
          q.push([b0, seam(b0, a0, 'radial')]);
          polys.push(q);
        }
      }
    }
    var out = [];
    polys.forEach(function (poly) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, cx = 0, cy = 0;
      poly.forEach(function (e) { var p = e[0]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); cx += p.x; cy += p.y; });
      if (x1 < -2 || y1 < -2 || x0 > W + 2 || y0 > H + 2) return;
      cx /= poly.length; cy /= poly.length;
      out.push({ poly: poly, c: [cx, cy], d: Math.hypot(cx - P.x, cy - P.y) / far });
    });
    /* dust leaves from lit junctions */
    var joints = [];
    for (j = 1; j < rings.length - 1; j++) for (i = 0; i < NR; i++) {
      var q2 = V[j][i];
      if (q2.x > -20 && q2.y > -20 && q2.x < W + 20 && q2.y < H + 20) joints.push([q2.x, q2.y]);
      if (M[j][i] && rnd() < 0.5) joints.push([M[j][i].x, M[j][i].y]);
    }
    return { shards: out, joints: joints, far: far };
  }

  var Shatter = {
    create: function () {
      var cv = document.createElement('canvas');
      cv.className = 'hwcine-gl';
      var gl = null;
      try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
      if (!gl) return { ok: false, release: function () {} };
      var S;
      try {
        S = {
          ok: true, cv: cv, gl: gl,
          shard: compile(gl, VS_SHARD, FS_SHARD),
          light: compile(gl, VS_FULL, FS_LIGHT),
          dust: compile(gl, VS_DUST, FS_DUST),
        };
      } catch (e) {
        if (window.console) console.warn('[cinema] shatter shaders', e && e.message);
        return { ok: false, release: function () {} };
      }
      /* the mind's eye bake compiles with the rest, so the break never hitches;
         if it cannot, the frozen frame simply goes in without its rim */
      try { S.rimBake = compile(gl, VS_FULL, FS_RIMBAKE); } catch (e) { S.rimBake = null; }
      S.vao = gl.createVertexArray();
      S.dvao = gl.createVertexArray();
      S.lvao = gl.createVertexArray();
      S.tex = gl.createTexture();
      S.run = function (o) { run(S, o); };
      S.release = function () {
        var ext = gl.getExtension('WEBGL_lose_context');
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (ext) ext.loseContext();
      };
      return S;
    },
  };

  function attrib(gl, prog, name, buf, size, stride, offset) {
    var loc = gl.getAttribLocation(prog, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
  }

  function run(S, o) {
    var gl = S.gl, cv = S.cv;
    var W = o.host.clientWidth || window.innerWidth, H = o.host.clientHeight || window.innerHeight;
    /* the backing store rides the device ratio, capped so a 4K screen stays smooth */
    var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.6e6 / Math.max(1, W * H)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    o.host.appendChild(cv);
    var pace = o.pace || 1, seed = (Math.random() * 1e9) | 0, rnd = mulberry(seed);
    var pat = crackPattern(W, H, o.at, rnd);

    // shards → one interleaved triangle list: pos2 ctr2 edge1 rnd4 dist1 seam1
    // (one fan triangle per polygon edge, so each triangle owns one seam)
    var F = 11, data = [], n = 0;
    pat.shards.forEach(function (s) {
      var r4 = [rnd(), rnd(), rnd(), rnd()], poly = s.poly;
      for (var k = 0; k < poly.length; k++) {
        var a = poly[k][0], b = poly[(k + 1) % poly.length][0], lit = poly[k][1];
        data.push(s.c[0], s.c[1], s.c[0], s.c[1], 1, r4[0], r4[1], r4[2], r4[3], s.d, lit);
        data.push(a.x, a.y, s.c[0], s.c[1], 0, r4[0], r4[1], r4[2], r4[3], s.d, lit);
        data.push(b.x, b.y, s.c[0], s.c[1], 0, r4[0], r4[1], r4[2], r4[3], s.d, lit);
        n += 3;
      }
    });
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindVertexArray(S.vao);
    var sp = S.shard.p;
    attrib(gl, sp, 'aPos', buf, 2, F, 0);
    attrib(gl, sp, 'aCtr', buf, 2, F, 2);
    attrib(gl, sp, 'aEdge', buf, 1, F, 4);
    attrib(gl, sp, 'aRnd', buf, 4, F, 5);
    attrib(gl, sp, 'aDist', buf, 1, F, 9);
    attrib(gl, sp, 'aSeam', buf, 1, F, 10);

    // glass dust from the seams, and a few lights in the insignia's three colors
    var TRIO = [[0.31, 0.84, 0.77], [0.66, 0.55, 1.0], [1.0, 0.54, 0.3]];
    var DF = 11, dd = [], dn = 0;
    function mote(x, y, vx, vy, life, size, delay, grav, c) { dd.push(x, y, vx, vy, life, size, delay, grav, c[0], c[1], c[2]); dn++; }
    pat.joints.forEach(function (pt) {
      var dx = pt[0] - o.at.x, dy = pt[1] - o.at.y, dl = Math.hypot(dx, dy) || 1, near = 1 - clamp(dl / pat.far, 0, 1);
      for (var k = 0; k < 2; k++) {
        var sp2 = (120 + 620 * near * near) * (0.4 + rnd()), jit = (rnd() - 0.5) * 1.2;
        var ux = dx / dl * Math.cos(jit) - dy / dl * Math.sin(jit), uy = dx / dl * Math.sin(jit) + dy / dl * Math.cos(jit);
        var tint = rnd() < 0.14 ? TRIO[(rnd() * 3) | 0] : [0.92, 0.95, 1.0];
        mote(pt[0], pt[1], ux * sp2, uy * sp2 - 60 * rnd(), 0.5 + rnd() * 0.9, 2 + rnd() * 3.2, 0.44 + near * 0.02 + rnd() * 0.12, 700, tint.map(function (c) { return c * (1.3 + rnd()); }));
      }
    });
    /* the lights left drifting where the glass was: the chart's own three
       colors, so the break hands over to the page's stars */
    for (var m = 0; m < 70; m++) {
      var c = TRIO[m % 3];
      mote(rnd() * W, rnd() * H, (rnd() - 0.5) * 40, -10 - rnd() * 30, 1.2 + rnd() * 0.6, 3 + rnd() * 5, 0.5 + rnd() * 0.3, 0, [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9]);
    }
    var dbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dd), gl.STATIC_DRAW);
    gl.bindVertexArray(S.dvao);
    var dp = S.dust.p;
    attrib(gl, dp, 'aO', dbuf, 2, DF, 0);
    attrib(gl, dp, 'aV', dbuf, 2, DF, 2);
    attrib(gl, dp, 'aP', dbuf, 4, DF, 4);
    attrib(gl, dp, 'aC', dbuf, 3, DF, 8);
    gl.bindVertexArray(null);

    // the frozen frame: the film's picture at the moment of the break
    var hasFrame = 0;
    gl.bindTexture(gl.TEXTURE_2D, S.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (o.video && o.video.readyState >= 2) {
      try {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, o.video);
        hasFrame = 1;
      } catch (e) { hasFrame = 0; }   // a film served without CORS: the dark breaks alone
    }
    if (!hasFrame) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    /* the mind's eye goes into the frozen frame exactly as it stood (the same
       function, the same clock), so the first frame of the break is the
       picture the viewer saw, soft edges and all */
    var frameTex = S.tex, rimBaked = 0;
    if (hasFrame && o.rim && S.rimBake) {
      var fw = o.video.videoWidth || 2, fh = o.video.videoHeight || 2;
      var baked = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, baked);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, baked, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        gl.viewport(0, 0, fw, fh);
        gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
        gl.useProgram(S.rimBake.p);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, S.tex);
        gl.uniform1i(S.rimBake.u.uSrc, 0);
        rimUniforms(gl, S.rimBake.u, o.rim.R, o.rect.w, o.rect.h, o.rim.secs, o.rim.open, o.rim.picture);
        gl.bindVertexArray(S.lvao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        frameTex = baked; rimBaked = 1;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
    }

    var CR = 0.24, BR = 0.46, END = 2.7;
    var cam = 1.15 * Math.max(W, H);
    var LIGHT = [0.86, 0.91, 1.0], RAY = [0.6, 0.72, 0.86];
    var t0 = now(), covered = false;
    var bl = o.blanket, blanket = [bl[0] / 255, bl[1] / 255, bl[2] / 255, bl[3]];

    /* QA: HWCinemaTheater.freeze = seconds holds the break at that moment */
    var Q = window.HWCinemaTheater;
    function frame() {
      var frozen = !!Q && Q.freeze != null;
      var te = frozen ? Q.freeze : (now() - t0) / 1000 / pace;
      var crack = pat.far * (1 - Math.pow(1 - clamp(te / CR, 0, 1), 3));
      var tension = clamp((te - CR) / (BR - CR), 0, 1);
      var tb = te - BR;
      var glow = te < BR ? 0.75 + 0.55 * smooth(tension) : 1.3 * Math.exp(-tb * 2.6);
      var flash = te < BR ? 0.05 * smooth(tension) : (tb < 0.07 ? 0.05 + 0.95 * smooth(tb / 0.07) : Math.exp(-(tb - 0.07) * 2.4));
      var rays = te < BR ? 0.12 * smooth(tension) : Math.exp(-tb * 1.5) * (tb < 0.1 ? smooth(tb / 0.1) : 1);
      var flare = te < BR ? 0 : Math.exp(-tb * 1.2);
      var ring = te * 1800, ringA = te < 0.2 ? Math.pow(1 - te / 0.2, 2) : 0;

      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);

      // 1. the light behind the glass (additive, alpha stays with the page)
      gl.disable(gl.DEPTH_TEST);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(S.light.p);
      var lu = S.light.u;
      gl.uniform2f(lu.uView, W, H);
      gl.uniform2f(lu.uImpact, o.at.x, o.at.y);
      gl.uniform1f(lu.uFlash, flash);
      gl.uniform1f(lu.uRays, rays);
      gl.uniform1f(lu.uRing, ring);
      gl.uniform1f(lu.uRingA, ringA);
      gl.uniform1f(lu.uTime, te);
      gl.uniform1f(lu.uSeed, (seed % 1000) / 97);
      gl.uniform3fv(lu.uLight, LIGHT);
      gl.uniform3fv(lu.uRay, RAY);
      gl.uniform1f(lu.uOver, 0);
      gl.uniform1f(lu.uStrike, 0);
      gl.bindVertexArray(S.lvao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. the shards over it (premultiplied; nearer pieces win)
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(S.shard.p);
      var su = S.shard.u;
      gl.uniform2f(su.uView, W, H);
      gl.uniform2f(su.uImpact, o.at.x, o.at.y);
      gl.uniform1f(su.uBreak, tb);
      gl.uniform1f(su.uWave, 0.24);
      gl.uniform1f(su.uCam, cam);
      gl.uniform1f(su.uShake, te < BR ? 1.3 * tension : 0);
      gl.uniform1f(su.uTime, te);
      gl.uniform1f(su.uCrack, crack);
      gl.uniform1f(su.uSettle, smooth(te / CR));
      gl.uniform1f(su.uFar, pat.far);
      gl.uniform1f(su.uGlow, glow);
      gl.uniform1f(su.uFlare, flare);
      gl.uniform3fv(su.uLight, LIGHT);
      gl.uniform4f(su.uRect, o.rect.x, o.rect.y, o.rect.w, o.rect.h);
      gl.uniform4fv(su.uBlanket, blanket);
      gl.uniform1f(su.uHasFrame, hasFrame);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frameTex);
      gl.uniform1i(su.uFrame, 0);
      gl.bindVertexArray(S.vao);
      gl.drawArrays(gl.TRIANGLES, 0, n);

      // 3. over the glass: the strike, its ring, the glare of the break (additive)
      gl.disable(gl.DEPTH_TEST);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(S.light.p);
      gl.uniform1f(lu.uOver, 1);
      gl.uniform1f(lu.uStrike, Math.exp(-te * 13));
      gl.bindVertexArray(S.lvao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 4. the dust and the lights (additive)
      gl.useProgram(S.dust.p);
      var du = S.dust.u;
      gl.uniform2f(du.uView, W, H);
      gl.uniform1f(du.uT, te);
      gl.uniform1f(du.uDpr, dpr);
      gl.bindVertexArray(S.dvao);
      gl.drawArrays(gl.POINTS, 0, dn);
      gl.bindVertexArray(null);

      /* the canvas now shows exactly what the page did: hand the picture over */
      if (!covered) { covered = true; o.cover(); }
      if (frozen || te < END) requestAnimationFrame(frame);
      else o.done();
    }
    frame();
    if (window.HWCinemaTheater) window.HWCinemaTheater._last = { shards: pat.shards.length, joints: pat.joints.length, verts: n, dust: dn, hasFrame: hasFrame, rim: rimBaked, dpr: dpr };
  }

  // ── the sound of it: a crack, the break, and the light (Web Audio, no files)
  var actx = null;
  /* into: an OfflineAudioContext for QA renders; the live context otherwise */
  /* level: the viewer's own volume (0..1); the break never outshouts it */
  function shatterSound(pace, into, level) {
    var ctx = into;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { actx = actx || new AC(); } catch (e) { return; }
      ctx = actx;
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    }
    pace = pace || 1;
    if (!into && window.HWCinemaTheater) window.HWCinemaTheater.sounded = (window.HWCinemaTheater.sounded || 0) + 1;
    var t0 = ctx.currentTime + 0.015, rnd = Math.random;
    /* sits at the trailer's own level: glue, make-up, then a brickwall at -3 dBFS */
    var out = ctx.createGain(); out.gain.value = 1.0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    var make = ctx.createGain(); make.gain.value = 1.65;
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.09;
    var ceil = ctx.createGain(); ceil.gain.value = 0.8 * (level == null ? 1 : clamp(level, 0, 1));
    out.connect(comp); comp.connect(make); make.connect(lim); lim.connect(ceil); ceil.connect(ctx.destination);
    var sr = ctx.sampleRate;
    var noise = ctx.createBuffer(1, sr * 2, sr), nd = noise.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
    var ir = ctx.createBuffer(2, Math.floor(sr * 2.6), sr);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.4); }
    var verb = ctx.createConvolver(); verb.buffer = ir;
    var wet = ctx.createGain(); wet.gain.value = 0.5;
    verb.connect(wet); wet.connect(out);
    function pan(x) { if (!ctx.createStereoPanner) return null; var p = ctx.createStereoPanner(); p.pan.value = clamp(x, -1, 1); return p; }
    function send(node, g, x, dry) {
      var p = pan(x), end = p || null;
      if (p) { node.connect(p); end = p; } else end = node;
      var d = ctx.createGain(); d.gain.value = dry == null ? 1 : dry; end.connect(d); d.connect(out);
      var s = ctx.createGain(); s.gain.value = g; end.connect(s); s.connect(verb);
    }
    function burst(at, dur, freq, q, gain, x, wetG) {
      var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(f); f.connect(g); send(g, wetG == null ? 0.35 : wetG, x || 0);
      s.start(at, rnd() * 1.5); s.stop(at + dur + 0.05);
    }
    /* a shard landing: glass rings in inharmonic modes (plate-like ratios,
       each higher mode dying faster), opened by a tiny noisy contact click;
       one pure tone would read as a beep */
    var MODES = [[1, 1, 1], [2.32, 0.55, 0.7], [4.25, 0.3, 0.45]];
    function ping(at, freq, dur, gain, x) {
      var mix = ctx.createGain(); mix.gain.value = 1;
      MODES.forEach(function (m) {
        var fq = freq * m[0] * (1 + (rnd() - 0.5) * 0.02);
        if (fq > sr * 0.45) return;
        var oc = ctx.createOscillator(); oc.type = 'sine'; oc.frequency.value = fq;
        var g = ctx.createGain(), d = Math.max(0.012, dur * m[2]);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain * m[1], at + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
        oc.connect(g); g.connect(mix);
        oc.start(at); oc.stop(at + d + 0.03);
      });
      var click = ctx.createBufferSource(); click.buffer = noise;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
      var cg = ctx.createGain();
      cg.gain.setValueAtTime(gain * 0.8, at); cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.004);
      click.connect(hp); hp.connect(cg); cg.connect(mix);
      click.start(at, rnd() * 1.5); click.stop(at + 0.01);
      send(mix, 0.45, x);
    }
    var CR = 0.24 * pace, BR = 0.46 * pace;
    // the strike
    burst(t0, 0.035, 4200, 0.9, 0.8, 0, 0.2);
    ping(t0, 5300, 0.09, 0.2, 0);
    // the cracks running
    for (i = 0; i < 28; i++) burst(t0 + CR * Math.pow(i / 28, 0.75), 0.006 + rnd() * 0.012, 1600 + rnd() * 3800, 1.3, 0.22 + 0.25 * rnd(), rnd() * 1.6 - 0.8, 0.15);
    burst(t0 + CR, BR - CR, 520, 3, 0.05, 0, 0.3);
    // the break: body, crunch, weight
    var tb = t0 + BR;
    /* the crash itself: a broadband crack over the glass body and its crunch */
    var crash = ctx.createBufferSource(); crash.buffer = noise;
    var chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 1800;
    var cgn = ctx.createGain();
    cgn.gain.setValueAtTime(0.0001, tb); cgn.gain.exponentialRampToValueAtTime(0.9, tb + 0.003); cgn.gain.exponentialRampToValueAtTime(0.0001, tb + 0.09);
    crash.connect(chp); chp.connect(cgn); send(cgn, 0.4, 0);
    crash.start(tb, rnd()); crash.stop(tb + 0.12);
    burst(tb, 0.7, 3300, 0.55, 0.75, 0, 0.5);
    burst(tb, 0.3, 950, 0.8, 0.45, 0, 0.3);
    var th = ctx.createOscillator(), tg = ctx.createGain(), sub = ctx.createBiquadFilter();
    sub.type = 'highpass'; sub.frequency.value = 32; sub.Q.value = 0.7;
    th.frequency.setValueAtTime(84, tb); th.frequency.exponentialRampToValueAtTime(44, tb + 0.3);
    tg.gain.setValueAtTime(0.0001, tb); tg.gain.exponentialRampToValueAtTime(0.36, tb + 0.01); tg.gain.exponentialRampToValueAtTime(0.0001, tb + 0.38);
    th.connect(tg); tg.connect(sub); sub.connect(out); th.start(tb); th.stop(tb + 0.45);
    // the pieces landing
    for (i = 0; i < 130; i++) ping(tb + 0.02 + Math.pow(rnd(), 1.9) * 1.35 * pace, 2300 + rnd() * 6800, 0.03 + rnd() * 0.24, 0.035 + 0.075 * rnd(), rnd() * 2 - 1);
    // the light: an airy swell and a chord in D, the major third answering the trailer's minor
    var air = ctx.createBufferSource(); air.buffer = noise; air.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(300, tb); lp.frequency.exponentialRampToValueAtTime(5200, tb + 0.7); lp.frequency.exponentialRampToValueAtTime(900, tb + 2.2);
    var ag = ctx.createGain();
    ag.gain.setValueAtTime(0.0001, tb); ag.gain.exponentialRampToValueAtTime(0.11, tb + 0.25); ag.gain.exponentialRampToValueAtTime(0.0001, tb + 2.3);
    air.connect(lp); lp.connect(ag); send(ag, 0.6, 0);
    air.start(tb); air.stop(tb + 2.4);
    [293.66, 440, 587.33, 739.99, 880].forEach(function (fq, k) {
      var oc = ctx.createOscillator(); oc.type = 'sine'; oc.frequency.value = fq; oc.detune.value = (rnd() - 0.5) * 8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tb + 0.05); g.gain.exponentialRampToValueAtTime(0.028 - k * 0.003, tb + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, tb + 2.9);
      oc.connect(g); send(g, 1.1, (k % 2 ? 0.35 : -0.35), 0.4);
      oc.start(tb + 0.05); oc.stop(tb + 3);
    });
  }

  // ── the door ────────────────────────────────────────────────────────────────
  window.HWCinemaTheater = {
    version: 'cine1',
    open: function (f, opts, api) {
      return new Promise(function (resolve) {
        var th = new Theater(f, opts, api, resolve);
        window.HWCinemaTheater.current = th;
        th.start();
      });
    },
    /* QA handles: drive nothing on their own */
    shatter: Shatter,
    sound: shatterSound,
    pattern: crackPattern,
  };
})();
