/* Hollow Wake — Database
   Loads the exported JSON (generated from src/data/) and renders a searchable,
   filterable catalog. No game facts are hard-coded here. */
(function () {
  'use strict';

  var DATA_DIR = '../data/';
  var PALETTE = { skill: '#ff8a4c', support: '#a98bff', monster: '#ef6b6b', class: '#e9c46a' };
  var TYPE_LABEL = { all: 'All', skill: 'Skills', support: 'Supports', monster: 'Monsters', class: 'Classes' };
  // Monster portraits (assets/portraits.js — the game's own painters, bundled).
  // Sizes are CSS px; backing stores ride the bundle's oversample factor.
  var PORTRAIT = { card: 44, detail: 132 };
  function portraitsReady() { return typeof window.HWPortraits === 'object' && !!window.HWPortraits; }
  function portraitOS() { try { return window.HWPortraits.oversample() || 2; } catch (e) { return 2; } }

  var state = { type: 'all', q: '', sort: 'name', tags: new Set(), dmg: new Set(), faction: new Set() };
  var DB = { all: [], meta: null };

  var el = {
    tabs: document.getElementById('tabs'),
    filters: document.getElementById('filters'),
    grid: document.getElementById('grid'),
    empty: document.getElementById('empty'),
    rescount: document.getElementById('rescount'),
    q: document.getElementById('q'),
    sort: document.getElementById('sort'),
    banner: document.getElementById('banner'),
    genstamp: document.getElementById('genstamp'),
    scrim: document.getElementById('scrim'),
    drawer: document.getElementById('drawer'),
  };

  function fetchJSON(name) {
    return fetch(DATA_DIR + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); })
      .catch(function (e) { console.warn('[db] could not load', name, e.message); return null; });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function accent(e) {
    var c = e.color || (e.raw && e.raw.color);
    if (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
    return PALETTE[e.type] || '#9fb2c9';
  }

  // ---- load ---------------------------------------------------------------
  // Normally reads the exported JSON via fetch. If the page ships an embedded
  // dataset (window.__HW_DATA, used by the self-contained preview build), use
  // that instead — no server required.
  function loadAll() {
    if (window.__HW_DATA) {
      var d = window.__HW_DATA;
      return Promise.resolve([d.meta, d.skills, d.supports, d.monsters, d.classes]);
    }
    return Promise.all([
      fetchJSON('meta'), fetchJSON('skills'), fetchJSON('supports'), fetchJSON('monsters'), fetchJSON('classes'),
    ]);
  }
  loadAll().then(function (res) {
    var meta = res[0], skills = res[1] || [], supports = res[2] || [], monsters = res[3] || [], classes = res[4] || [];
    DB.meta = meta;

    if (!skills.length && !monsters.length && !supports.length && !classes.length) {
      el.rescount.textContent = '';
      el.grid.innerHTML = '';
      el.empty.hidden = false;
      el.empty.innerHTML = '<h3>No exported data found</h3><p>Run <code class="mono">npx tsx scripts/export-web-data.ts</code> (or let the deploy workflow run) to generate <code class="mono">site/data/*.json</code> from the game.</p>';
      el.filters.innerHTML = '';
      return;
    }

    DB.all = []
      .concat(skills.map(function (s) { return tag(s, 'skill'); }))
      .concat(supports.map(function (s) { return tag(s, 'support'); }))
      .concat(monsters.map(function (m) { return tag(m, 'monster'); }))
      .concat(classes.map(function (c) { return tag(c, 'class'); }));

    if (meta) {
      if (meta.sample) {
        el.banner.innerHTML = '<div class="databanner"><span class="tag">Sample data</span><span>This preview is seeded with <b>sample entries</b> so you can see the catalog working. On deploy, the CI export replaces it with your game\'s <b>real, complete</b> data — this banner disappears automatically.</span></div>';
      }
      if (meta.generatedAt) {
        var d = new Date(meta.generatedAt);
        el.genstamp.textContent = 'generated ' + (isNaN(d) ? meta.generatedAt : d.toISOString().slice(0, 10)) + (meta.version ? ' · v' + meta.version : '');
      }
    }

    initFromURL();
    renderTabs();
    render();
    window.addEventListener('popstate', function () { initFromURL(); renderTabs(); render(); syncDrawerFromURL(); });
    syncDrawerFromURL();
  });

  function tag(e, type) { e.type = type; return e; }

  // ---- URL state ----------------------------------------------------------
  function initFromURL() {
    var p = new URLSearchParams(location.search);
    state.type = p.get('type') || 'all';
    state.q = p.get('q') || '';
    el.q.value = state.q;
    if (!TYPE_LABEL[state.type]) state.type = 'all';
  }
  function pushURL(replace) {
    var p = new URLSearchParams();
    if (state.type !== 'all') p.set('type', state.type);
    if (state.q) p.set('q', state.q);
    var sel = currentDetailId();
    if (sel) { p.set('type', selType || state.type); p.set('id', sel); }
    var url = location.pathname + (p.toString() ? '?' + p.toString() : '');
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  // ---- tabs ---------------------------------------------------------------
  function counts() {
    var c = { all: DB.all.length, skill: 0, support: 0, monster: 0, class: 0 };
    DB.all.forEach(function (e) { c[e.type]++; });
    return c;
  }
  function renderTabs() {
    var c = counts();
    var order = ['all', 'skill', 'support', 'monster', 'class'];
    el.tabs.innerHTML = order.map(function (t) {
      return '<button role="tab" data-type="' + t + '" aria-selected="' + (state.type === t) + '">' +
        TYPE_LABEL[t] + '<span class="n">' + (c[t] || 0) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(el.tabs.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        state.type = b.getAttribute('data-type');
        state.tags.clear(); state.dmg.clear(); state.faction.clear();
        pushURL(); renderTabs(); render();
      });
    });
  }

  // ---- filters (context aware) -------------------------------------------
  function pool() { return state.type === 'all' ? DB.all : DB.all.filter(function (e) { return e.type === state.type; }); }
  function uniqVals(items, fn) {
    var s = {};
    items.forEach(function (it) { (fn(it) || []).forEach(function (v) { if (v) s[v] = (s[v] || 0) + 1; }); });
    return Object.keys(s).sort(function (a, b) { return s[b] - s[a] || a.localeCompare(b); });
  }
  function renderFilters() {
    var p = pool(), html = '';
    var showSkillish = state.type === 'skill' || state.type === 'support' || state.type === 'all';
    var showMonster = state.type === 'monster';

    if (showSkillish) {
      var tags = uniqVals(p.filter(function (e) { return e.type === 'skill' || e.type === 'support'; }), function (e) { return e.tags; });
      if (tags.length) html += facetGroup('Tags', 'tags', tags, '');
      var dts = uniqVals(p.filter(function (e) { return e.type === 'skill'; }), function (e) { return e.damageTypes; });
      if (dts.length) html += facetGroup('Damage', 'dmg', dts, 'dt');
    }
    if (showMonster) {
      var facs = uniqVals(p, function (e) { return e.faction ? [e.faction] : []; });
      if (facs.length) html += facetGroup('Faction', 'faction', facs, '');
      var mtags = uniqVals(p, function (e) { return e.tags; });
      if (mtags.length) html += facetGroup('Tags', 'tags', mtags, '');
    }
    if (!html) html = '<h4>Filters</h4><p style="color:var(--ink-faint);font-size:13px">Search above to narrow ' + esc(TYPE_LABEL[state.type].toLowerCase()) + '.</p>';
    else html += '<button class="clearf" id="clearf">Clear filters</button>';
    el.filters.innerHTML = html;

    Array.prototype.forEach.call(el.filters.querySelectorAll('.facet button'), function (b) {
      b.addEventListener('click', function () {
        var set = state[b.getAttribute('data-set')];
        var v = b.getAttribute('data-val');
        if (set.has(v)) set.delete(v); else set.add(v);
        render();
      });
    });
    var cf = document.getElementById('clearf');
    if (cf) cf.addEventListener('click', function () { state.tags.clear(); state.dmg.clear(); state.faction.clear(); render(); });
  }
  function facetGroup(title, setName, vals, cls) {
    var set = state[setName];
    return '<div class="grp"><h4>' + esc(title) + '</h4><div class="facet">' + vals.map(function (v) {
      return '<button class="' + cls + '" data-set="' + setName + '" data-val="' + esc(v) + '" aria-pressed="' + set.has(v) + '">' + esc(v) + '</button>';
    }).join('') + '</div></div>';
  }

  // ---- filter + render grid ----------------------------------------------
  function matches(e) {
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = (e.name + ' ' + e.id + ' ' + (e.description || '') + ' ' + (e.tags || []).join(' ') + ' ' + (e.faction || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.tags.size) { var et = new Set(e.tags || []); for (var t of state.tags) if (!et.has(t)) return false; }
    if (state.dmg.size) { var ed = new Set(e.damageTypes || []); for (var d of state.dmg) if (!ed.has(d)) return false; }
    if (state.faction.size) { if (!state.faction.has(e.faction)) return false; }
    return true;
  }
  function render() {
    renderFilters();
    var items = pool().filter(matches);
    items.sort(function (a, b) {
      if (state.sort === 'id') return a.id.localeCompare(b.id);
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    el.rescount.textContent = items.length + ' result' + (items.length === 1 ? '' : 's') +
      (state.type === 'all' ? '' : ' · ' + TYPE_LABEL[state.type]);
    el.empty.hidden = items.length !== 0;
    el.grid.innerHTML = items.map(card).join('');
    Array.prototype.forEach.call(el.grid.querySelectorAll('.card'), function (c) {
      c.addEventListener('click', function () { openDetail(c.getAttribute('data-type'), c.getAttribute('data-id')); });
    });
    paintCardPortraits();
  }
  function card(e) {
    var ac = accent(e);
    var tags = (e.tags || []).slice(0, 4).map(function (t) { return '<span class="t">' + esc(t) + '</span>'; }).join('');
    var meta = cardMeta(e);
    // Monster cards wear their portrait (painted lazily as they scroll in).
    var port = '';
    if (e.type === 'monster' && portraitsReady()) {
      var px = Math.round(PORTRAIT.card * portraitOS());
      port = '<canvas class="mport" data-mport="' + esc(e.id) + '" width="' + px + '" height="' + px + '" aria-hidden="true"></canvas>';
    }
    return '<button class="card' + (port ? ' has-port' : '') + '" data-type="' + e.type + '" data-id="' + esc(e.id) + '" style="--accent:' + ac + '">' +
      port +
      '<div class="cname"><span class="dot" style="background:' + ac + '"></span>' + esc(e.name) +
      '<span class="kindpill">' + e.type + '</span></div>' +
      (e.description ? '<div class="cdesc">' + esc(e.description) + '</div>' : '<div class="cdesc"></div>') +
      (tags ? '<div class="ctags">' + tags + '</div>' : '') +
      (meta ? '<div class="cmeta">' + meta + '</div>' : '') +
      '</button>';
  }

  // ---- monster portraits (the game's own painters) -------------------------
  function paintMonsterCanvas(cv, size) {
    if (!portraitsReady()) return;
    var m = find('monster', cv.getAttribute('data-mport'));
    if (!m || !m.raw) return;
    try {
      window.HWPortraits.paintMonsterRow(cv, m,
        function (id) { return find('monster', id); }, { size: size });
    } catch (err) { /* a portrait must never break the catalog */ }
  }
  var portObserver = null;
  function paintCardPortraits() {
    if (portObserver) { portObserver.disconnect(); portObserver = null; }
    var canvases = el.grid.querySelectorAll('canvas.mport');
    if (!canvases.length || !portraitsReady()) return;
    if (typeof IntersectionObserver !== 'function') {
      Array.prototype.forEach.call(canvases, function (c) { paintMonsterCanvas(c, PORTRAIT.card); });
      return;
    }
    portObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        portObserver.unobserve(en.target);
        paintMonsterCanvas(en.target, PORTRAIT.card);
      });
    }, { rootMargin: '200px' });
    Array.prototype.forEach.call(canvases, function (c) { portObserver.observe(c); });
  }
  function cardMeta(e) {
    if (e.type === 'monster') {
      var b = [];
      if (e.life != null) b.push('<span><b>' + e.life + '</b> life</span>');
      if (e.faction) b.push('<span>' + esc(e.faction) + '</span>');
      if (e.xp != null) b.push('<span><b>' + e.xp + '</b> xp</span>');
      return b.join('');
    }
    if (e.type === 'class') {
      var a = e.attributes || {}; var keys = Object.keys(a).sort(function (x, y) { return a[y] - a[x]; }).slice(0, 3);
      return keys.map(function (k) { return '<span><b>' + a[k] + '</b> ' + k.slice(0, 3) + '</span>'; }).join('');
    }
    var m = [];
    if (e.manaCost != null) m.push('<span><b>' + e.manaCost + '</b> mana</span>');
    if (e.cooldown) m.push('<span><b>' + e.cooldown + 's</b> cd</span>');
    if (e.castMode && e.castMode !== 'default') m.push('<span>' + esc(e.castMode) + '</span>');
    return m.join('');
  }

  // ---- detail drawer ------------------------------------------------------
  var selType = null, selId = null;
  function currentDetailId() { return selId; }
  function find(type, id) { return DB.all.find(function (e) { return e.type === type && e.id === id; }); }

  function openDetail(type, id, fromURL) {
    var e = find(type, id); if (!e) return;
    selType = type; selId = id;
    var ac = accent(e);
    el.drawer.innerHTML = detailHTML(e, ac);
    var dcv = el.drawer.querySelector('canvas.mport-detail');
    if (dcv) paintMonsterCanvas(dcv, PORTRAIT.detail);
    el.drawer.hidden = false;
    requestAnimationFrame(function () { el.drawer.classList.add('open'); el.scrim.classList.add('open'); });
    document.body.style.overflow = 'hidden';
    el.drawer.querySelector('.close').addEventListener('click', closeDetail);
    var t = el.drawer.querySelector('#drawer-title'); if (t) t.focus && t.setAttribute('tabindex', '-1');
    if (!fromURL) pushURL();
  }
  function closeDetail() {
    el.drawer.classList.remove('open'); el.scrim.classList.remove('open');
    document.body.style.overflow = '';
    selType = null; selId = null;
    setTimeout(function () { el.drawer.hidden = true; el.drawer.innerHTML = ''; }, 260);
    var p = new URLSearchParams();
    if (state.type !== 'all') p.set('type', state.type);
    if (state.q) p.set('q', state.q);
    history.pushState({}, '', location.pathname + (p.toString() ? '?' + p.toString() : ''));
  }
  el.scrim.addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !el.drawer.hidden) closeDetail(); });

  function detailHTML(e, ac) {
    var kv = [];
    function row(k, v) { if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; kv.push('<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'); }
    function badges(arr) { return '<div class="badges">' + arr.map(function (x) { return '<span class="badge">' + esc(x) + '</span>'; }).join('') + '</div>'; }

    row('ID', '<span class="mono">' + esc(e.id) + '</span>');
    if (e.tags && e.tags.length) row('Tags', badges(e.tags));
    if (e.type === 'skill' || e.type === 'support') {
      if (e.damageTypes && e.damageTypes.length) row('Damage types', badges(e.damageTypes));
      row('Mana cost', e.manaCost); row('Cooldown', e.cooldown != null ? e.cooldown + 's' : null);
      row('Use time', e.useTime != null ? e.useTime + 's' : null); row('Cast mode', e.castMode);
      row('Delivery', e.delivery);
      if (e.requirements) row('Requirements', badges(Object.keys(e.requirements).map(function (k) { return k + ' ' + e.requirements[k]; })));
      if (e.monsterOnly) row('Source', 'Monster-only / component');
    }
    if (e.type === 'monster') {
      row('Faction', e.faction); row('AI', e.aiType); row('Life', e.life); row('Move speed', e.moveSpeed);
      row('XP', e.xp); if (e.boss) row('Type', 'Boss'); if (e.skills && e.skills.length) row('Skills', badges(e.skills));
    }
    if (e.type === 'class') {
      if (e.attributes) row('Attributes', badges(Object.keys(e.attributes).map(function (k) { return k + ' ' + e.attributes[k]; })));
      if (e.skills && e.skills.length) row('Signature skills', badges(e.skills));
    }

    // The monster itself, drawn by the game's own painters — the drawer leads
    // with the creature, then the facts.
    var portrait = '';
    if (e.type === 'monster' && portraitsReady() && e.raw) {
      var px = Math.round(PORTRAIT.detail * portraitOS());
      portrait = '<div class="dportrait"><canvas class="mport-detail" data-mport="' + esc(e.id) + '" width="' + px + '" height="' + px + '"></canvas>' +
        '<div class="dportcap">as it walks the world — drawn by the game\'s own painters</div></div>';
    }

    return '<div class="dhead">' +
      '<div class="titles"><div class="dk" style="color:' + ac + '">' + e.type + '</div>' +
      '<h2 id="drawer-title" tabindex="-1">' + esc(e.name) + '</h2>' +
      '<div class="idline">' + esc(e.id) + '</div></div>' +
      '<button class="close" aria-label="Close">✕</button></div>' +
      '<div class="dbody">' +
      portrait +
      (e.description ? '<p class="desc">' + esc(e.description) + '</p>' : '') +
      '<dl class="kv">' + kv.join('') + '</dl>' +
      '<div class="dsub">Full entry</div>' +
      '<details class="raw" open><summary>raw data (exactly as authored in <span class="mono">src/data/</span>)</summary>' +
      '<pre class="json">' + highlight(e.raw != null ? e.raw : e) + '</pre></details>' +
      '</div>';
  }

  function syncDrawerFromURL() {
    var p = new URLSearchParams(location.search);
    var id = p.get('id'), type = p.get('type');
    if (id && type) openDetail(type, id, true);
    else if (!el.drawer.hidden) closeDetail();
  }

  // ---- JSON syntax highlight ---------------------------------------------
  function highlight(obj) {
    var json = JSON.stringify(obj, function (k, v) { return typeof v === 'function' ? '[fn]' : v; }, 2);
    if (json == null) return '';
    json = json.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; });
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
      function (m) {
        var cls = 'n';
        if (/^"/.test(m)) cls = /:$/.test(m) ? 'k' : 's';
        else if (/true|false|null/.test(m)) cls = 'b';
        return '<span class="' + cls + '">' + m + '</span>';
      });
  }

  // ---- inputs -------------------------------------------------------------
  var qt;
  el.q.addEventListener('input', function () {
    clearTimeout(qt);
    qt = setTimeout(function () { state.q = el.q.value.trim(); pushURL(true); render(); }, 140);
  });
  el.sort.addEventListener('change', function () { state.sort = el.sort.value; render(); });
})();
