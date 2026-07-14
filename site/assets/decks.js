/* Hollow Wake — the exploration decks.
   A self-contained sibling to the loot showcase: drop a
     <div data-deck="biomes|events|classes" data-count="5"></div>
   on a page, include this script, and it renders a random spread of real
   cards — each with a colour indicator drawn from the game's own data — and
   one shared PoE-style tooltip that reveals a DIFFERENT set of facts per card
   (a biome's living fabrics, an event's unlock, a class's kit). Everything is
   fed by the exported JSON (site/data/*.json), so it can never drift from the
   game, and a "shuffle" re-rolls the spread so you rarely see the same five.

   Config via data-attributes on the mount:
     data-deck   biomes | events | classes   (which collection)
     data-count  how many cards to show at once (default per kind)
     data-min    min card width in px, drives the responsive column count
     data-shuffle  present = show the shuffle control (re-rolls the spread) */
(function () {
  'use strict';

  var mounts = Array.prototype.slice.call(document.querySelectorAll('[data-deck]'));
  if (!mounts.length) return;

  var page = (document.documentElement.getAttribute('data-page') || 'home').toLowerCase();
  var DATA_DIR = (page === 'home' ? '' : '../') + 'data/';
  var NEUTRAL = '#9fb2c9';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function cap(s) { s = String(s == null ? '' : s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function isHex(c) { return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c); }
  function accentOf(c) { return isHex(c) ? c : NEUTRAL; }

  var cache = {};
  function fetchJSON(name) {
    if (cache[name]) return cache[name];
    return (cache[name] = fetch(DATA_DIR + name + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }));
  }

  // Fisher–Yates → a fresh random spread each shuffle (client-side Math.random
  // is fine here; nothing seeded or deterministic depends on it).
  function sample(list, n) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, Math.min(n, a.length));
  }

  function pills(arr, max) {
    return (arr || []).slice(0, max || 8).map(function (t) { return '<span class="hwdk-pill">' + esc(t) + '</span>'; }).join('');
  }
  function section(label, body) {
    return body ? '<div class="hwdk-row"><span class="hwdk-k">' + esc(label) + '</span><span class="hwdk-v">' + body + '</span></div>' : '';
  }

  // ---- per-kind renderers (tooltip surfaces a different fact set each time) --
  function biomeTip(e) {
    var ac = accentOf(e.accent);
    var kind = e.frontier ? 'Frontier biome' : 'Landmark set-piece';
    var tag = e.biomeTag ? cap(String(e.biomeTag).replace(/_/g, ' ')) : null;
    return '<div class="hwdk-thead" style="color:' + ac + '">' + esc(e.title) + '</div>' +
      '<div class="hwdk-tsub">' + esc(kind) + (tag ? ' · ' + esc(tag) : '') + '</div>' +
      (e.blurb ? '<div class="hwdk-desc">' + esc(e.blurb) + '</div>' : '') +
      section('Fabrics', pills(e.fabrics, 6)) +
      section('Ambience', pills(e.ambientFx, 6)) +
      section('Objectives', pills(e.objectives, 8)) +
      (e.variants ? section('Variants', '<span class="hwdk-v-num">' + e.variants + '</span> sub-biome face' + (e.variants === 1 ? '' : 's')) : '');
  }
  function eventTip(e) {
    var ac = accentOf(e.color);
    var kindLabel = e.kind === 'substrate' ? 'Always-on substrate' : e.kind === 'place' ? 'A place, not an event' : 'World-event overlay';
    var facts = '';
    if (e.factions && e.factions.length) facts += section('Fields', pills(e.factions.map(cap), 5));
    if (e.encounters) facts += section('Encounters', '<span class="hwdk-v-num">' + e.encounters + '</span>');
    if (e.holdfasts) facts += section('Holdfasts', '<span class="hwdk-v-num">' + e.holdfasts + '</span>');
    if (e.dimensions && e.dimensions.length && !(e.dimensions.length === 1 && e.dimensions[0] === 'surface')) facts += section('Runs in', pills(e.dimensions.map(cap), 4));
    if (e.tiers) facts += section('Investment', '<span class="hwdk-v-num">' + e.tiers + '</span> tier' + (e.tiers === 1 ? '' : 's'));
    return '<div class="hwdk-thead" style="color:' + ac + '">' + esc(e.name) + '</div>' +
      '<div class="hwdk-tsub">' + esc(kindLabel) + '</div>' +
      (e.blurb ? '<div class="hwdk-desc">' + esc(e.blurb) + '</div>' : '') +
      (e.unlock ? section('Unlocks when', esc(e.unlock)) : '') +
      facts;
  }
  function classTip(e, skillName) {
    var ac = accentOf(e.color);
    var attrs = e.attributes && typeof e.attributes === 'object' ? e.attributes : {};
    var spread = Object.keys(attrs)
      .filter(function (k) { return typeof attrs[k] === 'number' && attrs[k] > 0; })
      .sort(function (a, b) { return attrs[b] - attrs[a]; })
      .slice(0, 5)
      .map(function (k) { return '<span class="hwdk-pill">' + esc(cap(k)) + ' <b>' + attrs[k] + '</b></span>'; }).join('');
    var kit = (e.skills || []).map(function (id) { return '<span class="hwdk-pill">' + esc(skillName(id)) + '</span>'; }).join('');
    return '<div class="hwdk-thead" style="color:' + ac + '">' + esc(e.name) + '</div>' +
      '<div class="hwdk-tsub">' + esc(e.primary || '') + (e.primary ? ' focus' : '') + '</div>' +
      (e.description ? '<div class="hwdk-desc">' + esc(e.description) + '</div>' : '') +
      section('Attributes', spread) +
      section('Signature kit', kit);
  }

  var KINDS = {
    biomes: {
      files: ['biomes'], count: 5, min: 200, noun: 'biomes',
      accent: function (e) { return e.accent; },
      title: function (e) { return e.title; },
      facet: function (e) { return e.frontier ? (e.biomeTag ? cap(String(e.biomeTag).replace(/_/g, ' ')) : 'Frontier') : 'Landmark'; },
      line: function (e) { return e.blurb; },
      tip: function (e) { return biomeTip(e); },
    },
    events: {
      files: ['events'], count: 8, min: 244, noun: 'world-events',
      accent: function (e) { return e.color; },
      title: function (e) { return e.name; },
      facet: function (e) { return e.kind === 'substrate' ? 'Always on' : e.kind === 'place' ? 'Place' : 'Event'; },
      line: function (e) { return e.blurb; },
      tip: function (e) { return eventTip(e); },
    },
    classes: {
      files: ['classes', 'skills'], count: 9, min: 300, noun: 'classes',
      accent: function (e) { return e.color; },
      title: function (e) { return e.name; },
      facet: function (e) { return e.primary; },
      line: function (e) { return e.description; },
      tip: function (e, ctx) { return classTip(e, ctx.skillName); },
    },
  };

  // one shared tooltip for every deck on the page
  var tip = document.createElement('div');
  tip.className = 'hwdk-tip'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  var canHover = !window.matchMedia || window.matchMedia('(hover: hover)').matches;
  function hideTip() { tip.classList.remove('on'); }
  window.addEventListener('scroll', hideTip, { passive: true });

  mounts.forEach(function (mount) {
    var kindKey = (mount.getAttribute('data-deck') || '').toLowerCase();
    var K = KINDS[kindKey];
    if (!K) return;
    var count = parseInt(mount.getAttribute('data-count'), 10) || K.count;
    var min = parseInt(mount.getAttribute('data-min'), 10) || K.min;
    var wantShuffle = mount.hasAttribute('data-shuffle');

    Promise.all(K.files.map(fetchJSON)).then(function (res) {
      var list = res[0] || [];
      if (!list.length) { mount.innerHTML = '<p class="hwdk-empty">Run the data export to populate this section.</p>'; return; }
      // classes resolve their signature skill ids → names via skills.json
      var skillMap = {};
      (res[1] || []).forEach(function (s) { if (s && s.id) skillMap[s.id] = s.name || s.id; });
      var ctx = { skillName: function (id) { return skillMap[id] || cap(String(id).replace(/_/g, ' ')); } };

      var shown = [];
      function draw() {
        shown = sample(list, count);
        var head = '<div class="hwdk-head">' +
          '<span class="hwdk-count"><b>' + shown.length + '</b> of ' + list.length + ' ' + esc(K.noun) + '</span>' +
          (wantShuffle ? '<button type="button" class="hwdk-shuffle" aria-label="Show a different spread">Shuffle <span aria-hidden="true">↻</span></button>' : '') +
          '</div>';
        var grid = '<div class="hwdk-grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,' + min + 'px),1fr))">' +
          shown.map(function (e, i) {
            var ac = accentOf(K.accent(e)), fac = K.facet(e);
            return '<button type="button" class="hwdk-card" data-i="' + i + '" style="--c:' + ac + '">' +
              '<span class="hwdk-cardhead"><span class="hwdk-dot"></span><span class="hwdk-nm">' + esc(K.title(e)) + '</span>' +
              (fac ? '<span class="hwdk-facet">' + esc(fac) + '</span>' : '') + '</span>' +
              '<span class="hwdk-line">' + esc(K.line(e) || '') + '</span>' +
              '</button>';
          }).join('') + '</div>';
        mount.innerHTML = '<div class="hwdk">' + head + grid + '<div class="hwdk-hint">Hover a card for the full read — real data, straight from the game.</div></div>';
      }

      function showTip(cardEl) {
        var e = shown[parseInt(cardEl.getAttribute('data-i'), 10)];
        if (!e) return;
        tip.innerHTML = K.tip(e, ctx);
        tip.classList.add('on');
        var r = cardEl.getBoundingClientRect(), tw = Math.min(320, window.innerWidth - 20);
        var x = window.scrollX + Math.max(10, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 10));
        tip.style.left = x + 'px'; tip.style.width = tw + 'px'; tip.style.top = '0px';
        var th = tip.offsetHeight;
        if (r.top - th - 10 > 8) tip.style.top = (window.scrollY + r.top - th - 10) + 'px';
        else tip.style.top = (window.scrollY + r.bottom + 12) + 'px';
      }

      // hover only on real hover pointers; click toggles (sole toggle on touch)
      if (canHover) {
        mount.addEventListener('mouseover', function (ev) { var c = ev.target.closest('.hwdk-card'); if (c) showTip(c); });
        mount.addEventListener('mouseout', function (ev) { var c = ev.target.closest('.hwdk-card'); if (c) hideTip(); });
        mount.addEventListener('focusin', function (ev) { var c = ev.target.closest('.hwdk-card'); if (c) showTip(c); });
        mount.addEventListener('focusout', function (ev) { if (ev.target.closest('.hwdk-card')) hideTip(); });
      }
      mount.addEventListener('click', function (ev) {
        if (ev.target.closest('.hwdk-shuffle')) { hideTip(); draw(); return; }
        var c = ev.target.closest('.hwdk-card');
        if (c) { if (tip.classList.contains('on')) hideTip(); else showTip(c); }
      });

      draw();
    });
  });

  // ---- styles ----
  var CSS =
  '.hwdk-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}' +
  '.hwdk-count{font-family:var(--font-mono,"Space Grotesk",monospace);font-size:12.5px;letter-spacing:.04em;color:var(--ink-faint,#6b7189)}' +
  '.hwdk-count b{color:var(--ink-dim,#a3a9bd);font-weight:600}' +
  '.hwdk-shuffle{font-family:var(--font-head,sans-serif);font-size:12.5px;font-weight:600;letter-spacing:.02em;color:var(--ink-dim,#a3a9bd);background:rgba(255,255,255,.03);border:1px solid var(--line-2,rgba(255,255,255,.14));padding:6px 13px;border-radius:999px;cursor:pointer;transition:color .2s,border-color .2s,background .2s,transform .15s}' +
  '.hwdk-shuffle:hover{color:var(--ink,#e9eaf2);border-color:var(--teal,#4fd6c4);background:rgba(79,214,196,.07)}' +
  '.hwdk-shuffle:active{transform:scale(.96)}' +
  '.hwdk-shuffle span{display:inline-block;transition:transform .3s}' +
  '.hwdk-shuffle:hover span{transform:rotate(180deg)}' +
  '.hwdk-grid{display:grid;gap:12px}' +
  '.hwdk-card{display:flex;flex-direction:column;gap:8px;text-align:left;background:var(--panel,#11131d);border:1px solid var(--line,rgba(255,255,255,.08));border-left:3px solid var(--c,#9fb2c9);border-radius:var(--r-sm,11px);padding:15px 16px;cursor:pointer;transition:transform .16s,border-color .16s,background .16s;position:relative;overflow:hidden}' +
  '.hwdk-card::after{content:"";position:absolute;inset:0;background:radial-gradient(130px 80px at 100% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 70%);opacity:.6;pointer-events:none}' +
  '.hwdk-card:hover,.hwdk-card:focus-visible{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 45%,var(--line-2,rgba(255,255,255,.14)));background:var(--panel-2,#161926);outline:none}' +
  '.hwdk-cardhead{display:flex;align-items:center;gap:9px;position:relative;z-index:1}' +
  '.hwdk-dot{width:8px;height:8px;border-radius:50%;background:var(--c,#9fb2c9);flex:0 0 auto;box-shadow:0 0 10px color-mix(in srgb,var(--c) 70%,transparent)}' +
  '.hwdk-nm{font-family:var(--font-head,"Cinzel",serif);font-weight:600;font-size:15.5px;color:var(--ink,#e9eaf2);line-height:1.15}' +
  '.hwdk-facet{margin-left:auto;font-family:var(--font-mono,"Space Grotesk",sans-serif);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--c,#9fb2c9);border:1px solid color-mix(in srgb,var(--c) 34%,transparent);background:color-mix(in srgb,var(--c) 12%,transparent);padding:3px 8px;border-radius:999px;white-space:nowrap;flex:0 0 auto}' +
  '.hwdk-line{position:relative;z-index:1;color:var(--ink-dim,#a3a9bd);font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
  '.hwdk-hint{margin-top:14px;font-size:12px;color:var(--ink-faint,#6b7189)}' +
  '.hwdk-empty{color:var(--ink-faint,#6b7189);font-size:14px}' +
  /* tooltip (shares the loot-showcase look) */
  '.hwdk-tip{position:absolute;z-index:95;pointer-events:none;max-width:calc(100vw - 16px);background:var(--panel-2,#161926);border:1px solid var(--line-2,rgba(255,255,255,.14));border-radius:12px;padding:14px 16px;box-shadow:0 24px 60px -20px rgba(0,0,0,.8);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}' +
  '.hwdk-tip.on{opacity:1;transform:none}' +
  '.hwdk-thead{font-family:var(--font-head,"Cinzel",serif);font-weight:700;font-size:16px;margin-bottom:4px}' +
  '.hwdk-tsub{font-family:var(--font-mono,"Space Grotesk",sans-serif);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint,#6b7189);margin-bottom:9px}' +
  '.hwdk-desc{font-size:13px;line-height:1.55;color:var(--ink,#e9eaf2);margin-bottom:4px}' +
  '.hwdk-row{display:flex;gap:10px;margin-top:9px;align-items:baseline}' +
  '.hwdk-k{flex:0 0 auto;font-family:var(--font-mono,"Space Grotesk",sans-serif);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint,#6b7189);width:82px;padding-top:1px}' +
  '.hwdk-v{flex:1 1 auto;display:flex;flex-wrap:wrap;gap:5px;font-size:12.5px;color:var(--ink-dim,#a3a9bd);line-height:1.5}' +
  '.hwdk-v-num{color:var(--teal-hi,#7ff0e1);font-weight:600}' +
  '.hwdk-pill{font-family:var(--font-mono,"Space Grotesk",sans-serif);font-size:10.5px;letter-spacing:.03em;color:var(--ink-dim,#a3a9bd);border:1px solid var(--line,rgba(255,255,255,.08));background:rgba(255,255,255,.03);padding:2px 8px;border-radius:999px}' +
  '.hwdk-pill b{color:var(--teal-hi,#7ff0e1);font-weight:600}';

  var style = document.createElement('style');
  style.setAttribute('data-hwdk-style', '');
  style.textContent = CSS;
  document.head.appendChild(style);
})();
