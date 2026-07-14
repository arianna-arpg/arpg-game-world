/* Hollow Wake — the loot showcase.
   A self-contained interactive rack: hover a real skill, support, or unique
   and a PoE-style tooltip reveals its stats/mods/flavor — all fed by the
   exported JSON (site/data/*.json), so it can never drift from the game.

   Drop <div data-showcase></div> on a page and include this script. It injects
   its own scoped CSS (.hwsc*), resolves the data path from <html data-page>,
   builds Skills / Supports / Uniques tabs, and wires one shared tooltip. */
(function () {
  'use strict';

  var mount = document.querySelector('[data-showcase]');
  if (!mount) return;

  var page = (document.documentElement.getAttribute('data-page') || 'home').toLowerCase();
  var DATA_DIR = (page === 'home' ? '' : '../') + 'data/';

  var ELEM = { fire: '#ff8a4c', cold: '#7ff0e1', lightning: '#e9c46a', physical: '#d7d7e0', chaos: '#a98bff' };
  var UNIQUE_COLOR = '#c98b3c';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function fetchJSON(name) {
    return fetch(DATA_DIR + name + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function accent(e) {
    var c = e && (e.color || (e.raw && e.raw.color));
    return (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) ? c : null;
  }

  // pick a diverse featured spread from a big list without hard-coding ids
  function featured(list, n, prefer) {
    if (!list || !list.length) return [];
    var pool = list.slice();
    if (prefer) { var p = pool.filter(prefer); if (p.length >= n) pool = p; }
    if (pool.length <= n) return pool;
    var out = [], step = pool.length / n;
    for (var i = 0; i < n; i++) out.push(pool[Math.floor(i * step)]);
    return out;
  }

  Promise.all([fetchJSON('skills'), fetchJSON('supports'), fetchJSON('uniques')]).then(function (res) {
    var skills = res[0] || [], supports = res[1] || [], uniques = res[2] || [];
    if (!skills.length && !supports.length && !uniques.length) {
      mount.innerHTML = '<p style="color:var(--ink-faint);font-size:14px">Run the data export to populate the showcase.</p>';
      return;
    }

    var PREFER = {
      skills: function (s) { return (s.damageTypes && s.damageTypes.length) && s.description; },
      supports: function (s) { return s.description; },
    };
    var TABS = [
      { key: 'skills',   label: 'Skills',   type: 'skill',   accent: 'var(--ember)', pool: skills,   n: 18,
        items: featured(skills, 18, PREFER.skills) },
      { key: 'supports', label: 'Supports', type: 'support', accent: 'var(--violet)', pool: supports, n: 14,
        items: featured(supports, 14, PREFER.supports) },
      { key: 'uniques',  label: 'Uniques',  type: 'unique',  accent: 'var(--gold)',  pool: uniques,  n: uniques.length,
        items: uniques },
    ].filter(function (t) { return t.items.length; });

    var current = TABS[0].key;

    // Fisher–Yates spread — the shuffle re-deals the current tab from its
    // full pool (same prefer gate as the first deal), so the rack rarely
    // reads the same twice. Mirrors the decks' shuffle.
    function sample(list, n) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a.slice(0, Math.min(n, a.length));
    }
    function reshuffle(t) {
      var pool = t.pool, pref = PREFER[t.key];
      if (pref) { var p = pool.filter(pref); if (p.length >= t.n) pool = p; }
      t.items = sample(pool, t.n);
    }

    mount.innerHTML =
      '<div class="hwsc">' +
        '<div class="hwsc-tabs" role="tablist">' +
          TABS.map(function (t) {
            return '<button class="hwsc-tab" role="tab" data-key="' + t.key + '" aria-selected="' + (t.key === current) + '" style="--tab:' + t.accent + '">' +
              t.label + ' <span class="hwsc-n">' + t.items.length + '</span></button>';
          }).join('') +
          '<button type="button" class="hwsc-shuffle" aria-label="Show a different spread">Shuffle <span aria-hidden="true">↻</span></button>' +
        '</div>' +
        '<div class="hwsc-rack" id="hwsc-rack"></div>' +
        '<div class="hwsc-hint">Hover a chip to inspect it — real data, straight from the game.</div>' +
      '</div>';

    var rack = mount.querySelector('#hwsc-rack');
    var tip = document.createElement('div');
    tip.className = 'hwsc-tip'; tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);

    function chip(e, type) {
      var ac = accent(e) || (type === 'unique' ? UNIQUE_COLOR : type === 'support' ? '#a98bff' : '#ff8a4c');
      return '<button class="hwsc-chip" data-type="' + type + '" data-id="' + esc(e.id) + '" style="--c:' + ac + '">' +
               '<span class="hwsc-dot"></span>' + esc(e.name) + '</button>';
    }
    function renderRack() {
      var t = TABS.filter(function (x) { return x.key === current; })[0];
      rack.innerHTML = t.items.map(function (e) { return chip(e, t.type); }).join('');
    }

    // ---- tooltip content ----
    function elDots(types) {
      if (!types || !types.length) return '';
      return '<span class="hwsc-els">' + types.map(function (d) {
        return '<span class="hwsc-el" title="' + esc(d) + '" style="background:' + (ELEM[d] || '#9fb2c9') + '"></span>';
      }).join('') + '</span>';
    }
    function pills(arr) {
      return (arr || []).slice(0, 6).map(function (t) { return '<span class="hwsc-pill">' + esc(t) + '</span>'; }).join('');
    }
    function statRow(e) {
      var bits = [];
      if (e.manaCost != null) bits.push('<b>' + e.manaCost + '</b> mana');
      if (e.cooldown) bits.push('<b>' + e.cooldown + 's</b> cd');
      if (e.useTime != null) bits.push('<b>' + e.useTime + 's</b> use');
      if (e.castMode && e.castMode !== 'default') bits.push(esc(e.castMode));
      if (e.delivery) bits.push(esc(e.delivery));
      return bits.length ? '<div class="hwsc-stats">' + bits.join('<span class="hwsc-sep">·</span>') + '</div>' : '';
    }
    function tipHTML(e, type) {
      var ac = accent(e) || (type === 'unique' ? UNIQUE_COLOR : type === 'support' ? '#a98bff' : '#ff8a4c');
      if (type === 'unique') {
        var mods = (e.mods || []).map(function (m) {
          var cls = 'hwsc-mod' + (m.min < 0 ? ' neg' : '') + (m.local ? ' local' : '');
          return '<div class="' + cls + '">' + esc(m.text) + '</div>';
        }).join('');
        return '<div class="hwsc-thead" style="color:' + ac + '">' + esc(e.name) + '</div>' +
          '<div class="hwsc-tsub">' + esc(e.baseName || '') + (e.category ? ' · ' + esc(e.category) : '') + '</div>' +
          '<div class="hwsc-mods">' + mods + '</div>' +
          (e.flavor ? '<div class="hwsc-flavor">' + esc(e.flavor) + '</div>' : '');
      }
      // skill / support
      var head = '<div class="hwsc-thead" style="color:' + ac + '">' + esc(e.name) +
        (type === 'support' ? '<span class="hwsc-kind">support</span>' : '') + '</div>';
      var elline = (type === 'skill') ? elDots(e.damageTypes) : '';
      var tagline = (e.tags && e.tags.length) ? '<div class="hwsc-tags">' + pills(e.tags) + elline + '</div>' : elline;
      var reqs = (e.requirements && Object.keys(e.requirements).length)
        ? '<div class="hwsc-req">Requires ' + Object.keys(e.requirements).map(function (k) { return esc(k) + ' ' + esc(e.requirements[k]); }).join(', ') + '</div>' : '';
      var attaches = (type === 'support' && e.raw && e.raw.requiresTags && e.raw.requiresTags.length)
        ? '<div class="hwsc-req">Attaches to ' + esc(e.raw.requiresTags.join(' / ')) + ' skills</div>' : '';
      return head + tagline + (type === 'skill' ? statRow(e) : '') +
        (e.description ? '<div class="hwsc-desc">' + esc(e.description) + '</div>' : '') + reqs + attaches;
    }

    function find(type, id) {
      var t = TABS.filter(function (x) { return x.type === type; })[0];
      return t && t.items.filter(function (e) { return e.id === id; })[0];
    }
    function showTip(chipEl) {
      var e = find(chipEl.getAttribute('data-type'), chipEl.getAttribute('data-id'));
      if (!e) return;
      tip.innerHTML = tipHTML(e, chipEl.getAttribute('data-type'));
      tip.classList.add('on');
      var r = chipEl.getBoundingClientRect(), tw = Math.min(300, window.innerWidth - 20);
      // tip is position:absolute in document space — add scroll offsets on both axes
      var x = window.scrollX + Math.max(10, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 10));
      tip.style.left = x + 'px'; tip.style.width = tw + 'px';
      // place above the chip if room, else below
      var below = r.bottom + 12, above = r.top - 12;
      tip.style.top = '0px';
      var th = tip.offsetHeight;
      if (above - th > 8) tip.style.top = (window.scrollY + r.top - th - 10) + 'px';
      else tip.style.top = (window.scrollY + below) + 'px';
    }
    function hideTip() { tip.classList.remove('on'); }

    // Only wire hover/focus on real hover pointers. On touch, the synthetic
    // mouseover/focus would set '.on' just before the tap's click fires, and
    // the click toggle would then immediately hide it — so click is the SOLE
    // toggle on touch.
    var canHover = !window.matchMedia || window.matchMedia('(hover: hover)').matches;
    if (canHover) {
      rack.addEventListener('mouseover', function (e) { var c = e.target.closest('.hwsc-chip'); if (c) showTip(c); });
      rack.addEventListener('mouseout', function (e) { var c = e.target.closest('.hwsc-chip'); if (c) hideTip(); });
      rack.addEventListener('focusin', function (e) { var c = e.target.closest('.hwsc-chip'); if (c) showTip(c); });
      rack.addEventListener('focusout', hideTip);
    }
    rack.addEventListener('click', function (e) { var c = e.target.closest('.hwsc-chip'); if (c) { if (tip.classList.contains('on')) hideTip(); else showTip(c); } });
    window.addEventListener('scroll', hideTip, { passive: true });

    mount.querySelector('.hwsc-tabs').addEventListener('click', function (e) {
      if (e.target.closest('.hwsc-shuffle')) {
        var t = TABS.filter(function (x) { return x.key === current; })[0];
        if (t) { reshuffle(t); hideTip(); renderRack(); }
        return;
      }
      var b = e.target.closest('.hwsc-tab'); if (!b) return;
      current = b.getAttribute('data-key');
      Array.prototype.forEach.call(mount.querySelectorAll('.hwsc-tab'), function (x) { x.setAttribute('aria-selected', x === b); });
      hideTip(); renderRack();
    });

    renderRack();
  });

  // ---- styles ----
  var CSS =
  '.hwsc{border:1px solid var(--line,rgba(255,255,255,.08));border-radius:var(--r,16px);background:linear-gradient(180deg,var(--panel,#11131d),var(--bg-2,#0c0e15));padding:18px}' +
  '.hwsc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}' +
  '.hwsc-tab{font-family:var(--font-head,sans-serif);font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--ink-dim,#a3a9bd);background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.08));padding:8px 14px;border-radius:999px;cursor:pointer;transition:color .2s,border-color .2s,background .2s}' +
  '.hwsc-tab:hover{color:var(--ink,#e9eaf2)}' +
  '.hwsc-tab[aria-selected="true"]{color:#0b0c11;background:var(--tab,#ff8a4c);border-color:transparent}' +
  '.hwsc-n{opacity:.7;font-size:11px}' +
  '.hwsc-shuffle{margin-left:auto;font-family:var(--font-head,sans-serif);font-size:12.5px;font-weight:600;letter-spacing:.02em;color:var(--ink-dim,#a3a9bd);background:rgba(255,255,255,.03);border:1px solid var(--line-2,rgba(255,255,255,.14));padding:6px 13px;border-radius:999px;cursor:pointer;transition:color .2s,border-color .2s,background .2s,transform .15s}' +
  '.hwsc-shuffle:hover{color:var(--ink,#e9eaf2);border-color:var(--teal,#4fd6c4);background:rgba(79,214,196,.07)}' +
  '.hwsc-shuffle:active{transform:scale(.96)}' +
  '.hwsc-shuffle span{display:inline-block;transition:transform .3s}' +
  '.hwsc-shuffle:hover span{transform:rotate(180deg)}' +
  '.hwsc-rack{display:flex;flex-wrap:wrap;gap:9px;min-height:44px}' +
  '.hwsc-chip{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-body,sans-serif);font-size:13.5px;color:var(--ink,#e9eaf2);background:rgba(255,255,255,.03);border:1px solid var(--line-2,rgba(255,255,255,.14));border-left:3px solid var(--c,#ff8a4c);border-radius:9px;padding:8px 13px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s}' +
  '.hwsc-chip:hover,.hwsc-chip:focus-visible{transform:translateY(-2px);background:rgba(255,255,255,.06);outline:none}' +
  '.hwsc-dot{width:7px;height:7px;border-radius:50%;background:var(--c,#ff8a4c);flex:0 0 auto}' +
  '.hwsc-hint{margin-top:14px;font-size:12px;color:var(--ink-faint,#6b7189)}' +
  /* tooltip */
  '.hwsc-tip{position:absolute;z-index:90;pointer-events:none;background:var(--panel-2,#161926);border:1px solid var(--line-2,rgba(255,255,255,.14));border-radius:12px;padding:13px 15px;box-shadow:0 24px 60px -20px rgba(0,0,0,.8);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}' +
  '.hwsc-tip.on{opacity:1;transform:none}' +
  '.hwsc-thead{font-family:var(--font-head,sans-serif);font-weight:700;font-size:15px;margin-bottom:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
  '.hwsc-kind{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint,#6b7189);border:1px solid var(--line,rgba(255,255,255,.08));padding:2px 7px;border-radius:999px}' +
  '.hwsc-tsub{font-size:12px;color:var(--ink-dim,#a3a9bd);margin-bottom:9px}' +
  '.hwsc-tags{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:9px}' +
  '.hwsc-pill{font-family:var(--font-head,sans-serif);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-dim,#a3a9bd);border:1px solid var(--line,rgba(255,255,255,.08));background:rgba(255,255,255,.03);padding:2px 7px;border-radius:999px}' +
  '.hwsc-els{display:inline-flex;gap:4px;margin-left:2px}' +
  '.hwsc-el{width:9px;height:9px;border-radius:50%}' +
  '.hwsc-stats{font-family:var(--font-mono,monospace);font-size:12px;color:var(--ink-dim,#a3a9bd);margin-bottom:9px;display:flex;flex-wrap:wrap;gap:6px}' +
  '.hwsc-stats b{color:var(--teal-hi,#7ff0e1)}' +
  '.hwsc-sep{opacity:.4}' +
  '.hwsc-desc{font-size:13px;line-height:1.5;color:var(--ink,#e9eaf2)}' +
  '.hwsc-req{font-size:11.5px;color:var(--ink-faint,#6b7189);margin-top:8px}' +
  '.hwsc-mods{display:grid;gap:4px}' +
  '.hwsc-mod{font-size:13px;color:var(--teal-hi,#7ff0e1);line-height:1.4}' +
  '.hwsc-mod.neg{color:var(--crimson,#ef6b6b)}' +
  '.hwsc-mod.local{color:var(--steel,#9fb2c9)}' +
  '.hwsc-flavor{margin-top:10px;padding-top:9px;border-top:1px solid var(--line,rgba(255,255,255,.08));font-style:italic;font-size:12.5px;color:var(--ink-faint,#6b7189);line-height:1.5}' +
  '.hwsc-tip{max-width:calc(100vw - 16px)}';  // fit narrow screens; tap-to-toggle drives it on touch

  var style = document.createElement('style');
  style.setAttribute('data-hwsc-style', '');
  style.textContent = CSS;
  document.head.appendChild(style);
})();
