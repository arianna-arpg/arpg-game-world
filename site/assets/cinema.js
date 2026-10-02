/* Hollow Wake · the site cinema.
   ONE source of truth for every film the site can show: the banner's trailer,
   the landing splash, and any clip a page asks for by name. Re-point a film,
   schedule a release trailer, or split visitors between two cuts by editing
   the registry below; no page markup changes.

   This file loads in <head>, NOT deferred: a visitor who is due the splash
   meets darkness on the very first paint instead of a flash of the page.
   It stays small. Everything heavy (the theater, the film, the shatter) lives
   in assets/cinema-theater.js and loads only when a film is about to play,
   or quietly on idle so a click on a trigger answers at once.

   Contract: docs/design/site-cinema.md */
(function () {
  'use strict';

  // ── THE REGISTRY ──────────────────────────────────────────────────────────
  var CINEMA = {
    /* THE FEATURE: what the banner and the splash play. Rows are read in
       order and the first row whose window is open wins (from / until: ISO
       dates, both optional, so a release trailer can go live on its own).
       A row may split visitors between cuts: pick: [{ play, weight }]; each
       visitor keeps the cut they drew, under the row's name. */
    feature: [
      { play: 'announcement' },
    ],

    /* THE SPLASH: an unprompted showing on arrival. */
    splash: {
      pages: ['home'],        // html[data-page] values that may open with it
      restDays: 7,            // a returning visitor rests this long between showings
      newCuts: true,          // a film (or a raised cut) never seen opens once, rest or not
      reducedMotion: false,   // show it to visitors who ask for reduced motion
      saveData: false,        // show it to visitors on a data saver
      failRestDays: 1,        // after a film fails to start, stay quiet this long
      armSeconds: 7,          // lift the darkness if the theater has not arrived by then
    },

    /* THE TRIGGERS: clicks that open a film. play: a film id, 'feature', or
       '@attr' to read the id from the clicked element. label: what keyboard
       and screen reader visitors hear; the page itself shows nothing new. */
    triggers: [
      { selector: '.hero-lockup', play: 'feature', label: 'Watch the Hollow Wake trailer' },
      { selector: '[data-cinema]', play: '@data-cinema' },
    ],

    /* THE FILMS: every film the site can show, by id. Paths are relative to
       the site root. Sources are listed best codec first; the theater takes
       the first family this browser plays, then the rendition whose height
       suits the screen. Raise cut to show a re-cut to every visitor once. */
    films: {
      announcement: {
        title: 'Hollow Wake · Announcement Trailer',
        cut: 2,               // raised for the third trailer, so every visitor sees it once
        aspect: 16 / 9,
        duration: 60,
        sources: [
          { family: 'av1',  height: 1440, src: 'media/announcement-v3/announcement-v3-1440.av1.mp4',  type: 'video/mp4; codecs="av01.0.12M.10"' },
          { family: 'av1',  height: 1080, src: 'media/announcement-v3/announcement-v3-1080.av1.mp4',  type: 'video/mp4; codecs="av01.0.08M.10"' },
          { family: 'av1',  height: 720,  src: 'media/announcement-v3/announcement-v3-720.av1.mp4',   type: 'video/mp4; codecs="av01.0.05M.10"' },
          { family: 'hevc', height: 1080, src: 'media/announcement-v3/announcement-v3-1080.hevc.mp4', type: 'video/mp4; codecs="hvc1.2.4.L120.B0"' },
          { family: 'h264', height: 720,  src: 'media/announcement-v3/announcement-v3-720.h264.mp4',  type: 'video/mp4; codecs="avc1.64001F"' },
        ],
        /* narration text, shown while the film plays muted (show: 'muted' |
           'always' | 'never'); band: the picture rows it sits in, here the
           lower letterbox bar, so a line never covers the picture */
        captions: { src: 'media/announcement-v3/narration.en.vtt', lang: 'en', show: 'muted', band: [0.872, 1] },
        /* the exit: 'shatter' breaks the screen from the viewer's click (or
           from at, as a share of the picture, when the film ends); 'fade'
           lifts the darkness instead */
        exit: { kind: 'shatter', at: [0.5, 0.44], pace: 1 },   // the insignia's eye, under the title
      },
      /* THE ARCHIVE: the previous cut, kept whole as a fallback. It is in no
         feature row and no trigger, so the site never offers it; it plays at
         ?cinema=announcement-v2, and pointing a feature row at it brings it
         back. Its files stay on the site-media release and in the manifest. */
      'announcement-v2': {
        title: 'Hollow Wake · Announcement Trailer (previous cut)',
        cut: 1,
        aspect: 16 / 9,
        duration: 60,
        sources: [
          { family: 'av1',  height: 1440, src: 'media/announcement-v2/announcement-v2-1440.av1.mp4',  type: 'video/mp4; codecs="av01.0.12M.10"' },
          { family: 'av1',  height: 1080, src: 'media/announcement-v2/announcement-v2-1080.av1.mp4',  type: 'video/mp4; codecs="av01.0.08M.10"' },
          { family: 'av1',  height: 720,  src: 'media/announcement-v2/announcement-v2-720.av1.mp4',   type: 'video/mp4; codecs="av01.0.05M.10"' },
          { family: 'hevc', height: 1080, src: 'media/announcement-v2/announcement-v2-1080.hevc.mp4', type: 'video/mp4; codecs="hvc1.2.4.L120.B0"' },
          { family: 'h264', height: 720,  src: 'media/announcement-v2/announcement-v2-720.h264.mp4',  type: 'video/mp4; codecs="avc1.64001F"' },
        ],
        captions: { src: 'media/announcement-v2/narration.en.vtt', lang: 'en', show: 'muted', band: [0.872, 1] },
        exit: { kind: 'shatter', at: [0.5, 0.44], pace: 1 },
      },
    },

    /* THE THEATER: presentation dials shared by every film. */
    theater: {
      blanket: [0, 0, 0, 0.985],  // rgba of the darkness laid over the page (a film's own black bars melt into it)
      stage: [0.9, 0.84],         // the most of the viewport a film may take (w, h)
      openSeconds: 0.7,           // the darkness settling over the page on a click
      revealSeconds: 1.1,         // the picture rising out of the dark once it plays
      stallSeconds: 9,            // give up quietly if a film cannot start by then
      hintSeconds: 1.8,           // the continue line surfaces after this long
      progress: true,             // a hairline along the bottom edge
      volume: 0.8,                // a first-time viewer's level; each viewer's own choice is remembered
      words: {
        next: 'Click to continue',
        nextTouch: 'Tap to continue',
        soundOn: 'Sound on',
        mute: 'Mute',
        unmute: 'Unmute',
        sound: 'Sound',
        volume: 'Volume',
      },
    },
  };

  // ── plumbing ──────────────────────────────────────────────────────────────
  var RECORD = 'hw.cinema';
  var DAY = 86400;
  var root = document.documentElement;
  var page = (root.getAttribute('data-page') || 'home').toLowerCase();
  var self = document.currentScript;
  /* the theater wears the same cache stamp this file was loaded with, so a
     page's one ?v= tag flips both halves together */
  var VERSION = (self && self.src && (self.src.match(/[?&]v=([^&#]+)/) || [])[1]) || 'cine1';
  /* the site root, read from this file's own address, so every page depth
     (and the /arpg-game-world/ Pages sub-path) resolves the same media */
  var BASE = self && self.src ? self.src.replace(/assets\/cinema\.js(\?[^#]*)?(#.*)?$/, '') : '';
  var extra = {};   // films registered at runtime (HWCinema.register)

  function url(path) {
    if (!path) return path;
    return /^([a-z]+:)?\/\//i.test(path) || path.charAt(0) === '/' || /^(data|blob):/.test(path) ? path : BASE + path;
  }
  function film(id) {
    if (!id) return null;
    var f = extra[id] || (Object.prototype.hasOwnProperty.call(CINEMA.films, id) ? CINEMA.films[id] : null);
    if (f && !f.id) f.id = id;
    return f;
  }
  var params = null;
  try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
  function param(name) { return params ? params.get(name) : null; }
  function nowSec() { return Math.floor(Date.now() / 1000); }
  function stamp(s) { var t = Date.parse(s); return isNaN(t) ? null : t / 1000; }

  // ── the visitor record: what this browser has seen, and when ─────────────
  function openStore() {
    var kinds = ['localStorage', 'sessionStorage'];
    for (var i = 0; i < kinds.length; i++) {
      try {
        var s = window[kinds[i]];
        s.setItem('hw.cinema.probe', '1'); s.removeItem('hw.cinema.probe');
        return s;
      } catch (e) { /* blocked: try the next */ }
    }
    return null;
  }
  var store = openStore();
  function readRecord() {
    var rec = null;
    if (store) { try { rec = JSON.parse(store.getItem(RECORD) || 'null'); } catch (e) { rec = null; } }
    if (!rec || rec.v !== 1) rec = { v: 1, last: 0, fail: 0, seen: {}, picks: {} };
    if (!rec.seen) rec.seen = {};
    if (!rec.picks) rec.picks = {};
    return rec;
  }
  function writeRecord(rec) {
    if (!store) return;
    try { store.setItem(RECORD, JSON.stringify(rec)); } catch (e) { /* full or blocked */ }
  }

  // ── the feature: which film the banner and the splash mean right now ─────
  function weighted(rows) {
    var sum = 0, i;
    for (i = 0; i < rows.length; i++) sum += Math.max(0, rows[i].weight == null ? 1 : rows[i].weight);
    var r = Math.random() * sum;
    for (i = 0; i < rows.length; i++) {
      r -= Math.max(0, rows[i].weight == null ? 1 : rows[i].weight);
      if (r < 0) return rows[i].play;
    }
    return rows.length ? rows[rows.length - 1].play : null;
  }
  function resolveFeature(rec) {
    var now = nowSec();
    for (var i = 0; i < CINEMA.feature.length; i++) {
      var row = CINEMA.feature[i];
      var from = row.from ? stamp(row.from) : null, until = row.until ? stamp(row.until) : null;
      if (from != null && now < from) continue;
      if (until != null && now >= until) continue;
      if (row.pick && row.pick.length) {
        var name = row.name || 'row' + i;
        var kept = rec.picks[name];
        var ok = false;
        for (var k = 0; k < row.pick.length; k++) if (row.pick[k].play === kept) ok = true;
        if (!ok || !film(kept)) {
          kept = weighted(row.pick);
          rec.picks[name] = kept;
          writeRecord(rec);
        }
        if (film(kept)) return kept;
        continue;
      }
      if (film(row.play)) return row.play;
    }
    return null;
  }

  // ── the splash: is this arrival due a showing? ────────────────────────────
  function splashDue(rec) {
    var sp = CINEMA.splash, ask = param('cinema');
    if (ask === 'off') return null;
    /* ?cinema=<film id> previews that film on any page, record untouched */
    if (ask && ask !== 'reset' && film(ask)) return { id: ask, preview: true };
    if (!sp || !sp.pages || sp.pages.indexOf(page) < 0) return null;
    /* never nag a visitor this browser cannot remember */
    if (!store) return null;
    if (!sp.reducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    var conn = navigator.connection;
    if (!sp.saveData && conn && conn.saveData) return null;
    var now = nowSec();
    if (rec.fail && now - rec.fail < (sp.failRestDays || 1) * DAY) return null;
    var id = resolveFeature(rec);
    if (!id) return null;
    var cut = film(id).cut || 1;
    var fresh = sp.newCuts !== false && (rec.seen[id] || 0) < cut;
    var rested = !rec.last || now - rec.last >= (sp.restDays || 7) * DAY;
    return fresh || rested ? { id: id } : null;
  }

  // ── arming: the darkness is down before the first paint ───────────────────
  var armTimer = null;
  function blanketRGBA() {
    var c = CINEMA.theater.blanket;
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')';
  }
  function arm() {
    var st = document.createElement('style');
    st.setAttribute('data-hwcine-arm', '');
    /* THE LOCK rides along: the page cannot scroll under the darkness, and
       the reserved gutter keeps its width, so nothing shifts when it lifts */
    st.textContent = 'html.hwcine-arming::after{content:"";position:fixed;inset:0;z-index:2147483000;background:' + blanketRGBA() + '}' +
      'html.hwcine-arming,html.hwcine-lock{overflow:hidden;scrollbar-gutter:stable}';
    (document.head || root).appendChild(st);
    root.classList.add('hwcine-arming');
    /* a safety net: if the theater never arrives, the page is never lost */
    armTimer = setTimeout(function () { disarm(); noteFail(); }, (CINEMA.splash.armSeconds || 7) * 1000);
  }
  function disarm() {
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    root.classList.remove('hwcine-arming');
  }

  // ── the theater: loaded on demand, once ───────────────────────────────────
  var theaterP = null;
  function loadTheater() {
    if (window.HWCinemaTheater) return Promise.resolve(window.HWCinemaTheater);
    if (theaterP) return theaterP;
    theaterP = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = BASE + 'assets/cinema-theater.js?v=' + VERSION;
      s.async = true;
      s.onload = function () {
        if (window.HWCinemaTheater) resolve(window.HWCinemaTheater);
        else reject(new Error('the theater did not register'));
      };
      s.onerror = function () { theaterP = null; reject(new Error('the theater failed to load')); };
      (document.head || root).appendChild(s);
    });
    return theaterP;
  }

  function noteSeen(id) {
    var f = film(id);
    if (!f) return;
    var rec = readRecord();
    rec.last = nowSec();
    rec.fail = 0;
    rec.seen[id] = Math.max(rec.seen[id] || 0, f.cut || 1);
    writeRecord(rec);
  }
  function noteFail() {
    var rec = readRecord();
    rec.fail = nowSec();
    writeRecord(rec);
  }

  var busy = null;
  function play(idOrFilm, opts) {
    if (busy) return busy;
    opts = opts || {};
    var f = typeof idOrFilm === 'string' ? film(idOrFilm) : idOrFilm;
    if (!f) { if (opts.mode === 'splash') disarm(); return Promise.resolve(false); }
    var run = function (T) { return T.open(f, opts, api); };
    var done = function (r) { busy = null; return r; };
    /* already here: open inside the same task as the click, so browsers that
       tie sound to the gesture itself let the film speak */
    if (window.HWCinemaTheater) {
      try { busy = Promise.resolve(run(window.HWCinemaTheater)).then(done, fail); }
      catch (e) { busy = Promise.resolve(fail(e)); }
      return busy;
    }
    busy = loadTheater().then(run).then(done, fail);
    return busy;
    function fail(e) {
      if (window.console) console.warn('[cinema]', e && e.message ? e.message : e);
      disarm();
      busy = null;
      return false;
    }
  }

  // ── the triggers: one delegated listener serves every page and any element
  //    that appears later (a Database drawer, a skill card) ─────────────────
  function triggerFor(el) {
    for (var i = 0; i < CINEMA.triggers.length; i++) {
      var tr = CINEMA.triggers[i];
      var hit = el && el.closest ? el.closest(tr.selector) : null;
      if (!hit) continue;
      var id = tr.play === 'feature' ? resolveFeature(readRecord())
        : tr.play.charAt(0) === '@' ? hit.getAttribute(tr.play.slice(1)) : tr.play;
      if (id && film(id)) return { id: id, el: hit };
    }
    return null;
  }
  function onClick(e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var hit = triggerFor(e.target);
    if (!hit) return;
    e.preventDefault();
    var pointer = e.detail > 0 && (e.clientX || e.clientY);
    play(hit.id, { mode: 'click', from: hit.el, at: pointer ? { x: e.clientX, y: e.clientY } : null });
  }
  /* keyboard and screen reader visitors get a labelled button inside a
     static trigger; it is visually hidden, and the trigger only wears an
     outline while that button holds keyboard focus */
  function giveVoice() {
    var css = '.hwcine-voice{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}' +
      '.hwcine-voiced{outline:2px solid transparent;outline-offset:10px;border-radius:14px;transition:outline-color .2s}' +
      '.hwcine-voiced.hwcine-focus{outline-color:var(--teal,#4fd6c4)}';
    var st = document.createElement('style');
    st.setAttribute('data-hwcine-voice', '');
    st.textContent = css;
    (document.head || root).appendChild(st);
    CINEMA.triggers.forEach(function (tr) {
      if (!tr.label) return;
      Array.prototype.forEach.call(document.querySelectorAll(tr.selector), function (host) {
        if (host.querySelector('.hwcine-voice')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hwcine-voice';
        b.textContent = tr.label;
        b.addEventListener('focus', function () { if (b.matches(':focus-visible')) host.classList.add('hwcine-focus'); });
        b.addEventListener('blur', function () { host.classList.remove('hwcine-focus'); });
        host.classList.add('hwcine-voiced');
        host.appendChild(b);
      });
    });
  }

  // ── the public face ───────────────────────────────────────────────────────
  var api = window.HWCinema = {
    version: VERSION,
    registry: CINEMA,
    base: BASE,
    page: page,
    url: url,
    film: film,
    feature: function () { return resolveFeature(readRecord()); },
    play: play,
    /* add a film at runtime (a generated clip manifest, a test cut) */
    register: function (id, def) { if (id && def) { def.id = id; extra[id] = def; } return def; },
    record: readRecord,
    /* the viewer's sound level: read, or remember a new one */
    volume: function (v) {
      var rec = readRecord(), fallback = CINEMA.theater.volume == null ? 0.8 : CINEMA.theater.volume;
      if (typeof v === 'number' && isFinite(v)) {
        rec.vol = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
        writeRecord(rec);
      }
      return typeof rec.vol === 'number' && rec.vol > 0.02 ? rec.vol : fallback;
    },
    reset: function () { if (store) { try { store.removeItem(RECORD); } catch (e) { /* blocked */ } } },
    seen: noteSeen,
    failed: noteFail,
    disarm: disarm,
    preload: loadTheater,
    due: null,
  };

  // ── arrival ───────────────────────────────────────────────────────────────
  if (param('cinema') === 'reset') api.reset();
  var due = null;
  try { due = splashDue(readRecord()); } catch (e) { due = null; }
  api.due = due;
  if (due) {
    arm();
    loadTheater().catch(function () { disarm(); });
  }

  function ready() {
    document.addEventListener('click', onClick, false);
    giveVoice();
    if (due) {
      play(due.id, { mode: 'splash', preview: !!due.preview });
    } else {
      /* warm the theater while the visitor reads, so a click answers at once */
      var warm = function () { loadTheater().catch(function () { /* retried on click */ }); };
      if ('requestIdleCallback' in window) window.addEventListener('load', function () { window.requestIdleCallback(warm, { timeout: 5000 }); });
      else window.addEventListener('load', function () { setTimeout(warm, 2500); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
