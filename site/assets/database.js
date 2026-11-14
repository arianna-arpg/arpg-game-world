/* Hollow Wake · Database
   Loads the exported JSON (generated from src/data/) and renders a searchable,
   filterable catalog. No game facts are hard-coded here. */
(function () {
  'use strict';

  var DATA_DIR = '../data/';
  var PALETTE = { skill: '#ff8a4c', support: '#a98bff', unique: '#c98b3c', monster: '#ef6b6b', class: '#e9c46a' };
  var TYPE_LABEL = { all: 'All', skill: 'Skills', support: 'Supports', unique: 'Uniques', monster: 'Monsters', class: 'Classes' };
  // Monster portraits (assets/portraits.js: the game's own painters, bundled).
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
  // that instead; no server required.
  function loadAll() {
    if (window.__HW_DATA) {
      var d = window.__HW_DATA;
      return Promise.resolve([d.meta, d.skills, d.supports, d.monsters, d.classes, d.uniques]);
    }
    return Promise.all([
      fetchJSON('meta'), fetchJSON('skills'), fetchJSON('supports'), fetchJSON('monsters'), fetchJSON('classes'), fetchJSON('uniques'),
    ]);
  }
  loadAll().then(function (res) {
    var meta = res[0], skills = res[1] || [], supports = res[2] || [], monsters = res[3] || [], classes = res[4] || [], uniques = res[5] || [];
    DB.meta = meta;

    if (!skills.length && !monsters.length && !supports.length && !classes.length && !uniques.length) {
      el.rescount.textContent = '';
      el.grid.innerHTML = '';
      el.empty.hidden = false;
      el.empty.innerHTML = '<h3>The database could not load</h3><p>Refresh the page to try again. If it is still unavailable, please check back later.</p>';
      el.filters.innerHTML = '';
      el.filters.hidden = true;
      return;
    }

    DB.all = []
      .concat(skills.map(function (s) { return tag(s, 'skill'); }))
      .concat(supports.map(function (s) { return tag(s, 'support'); }))
      .concat(uniques.map(function (u) { return tag(u, 'unique'); }))
      .concat(monsters.map(function (m) { return tag(m, 'monster'); }))
      .concat(classes.map(function (c) { return tag(c, 'class'); }));

    if (meta) {
      if (meta.sample) {
        el.banner.innerHTML = '<div class="databanner"><span class="tag">Sample data</span><span>This preview contains sample entries. Use the published database for current game data.</span></div>';
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

  // ---- skill clips: the skill itself, cast in the game by the game ---------
  // A generated index (media/clips/index.json: built by the capture harness,
  // pulled in at deploy beside the site's films) names every skill that has a
  // clip. Each registers with the site cinema as `skill:<id>`, so the drawer's
  // loop opens in the theater with one click. No index, no clips: the drawer
  // leads with the facts, as it always has.
  var CLIPS = {};
  function clipURL(p) { return window.HWCinema ? window.HWCinema.url(p) : '../' + p; }
  fetch('../media/clips/index.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (ix) {
      if (!ix || !ix.clips) return;
      Object.keys(ix.clips).forEach(function (id) {
        var c = ix.clips[id];
        CLIPS[id] = c;
        if (window.HWCinema) window.HWCinema.register('skill:' + id, {
          title: (c.name || id) + ' · in the game', aspect: c.aspect || ix.aspect || 16 / 9, duration: c.duration,
          sources: c.sources, poster: c.poster, loop: true, silent: true, record: false,
          exit: { kind: 'fade' }, words: { next: 'Click to close', nextTouch: 'Tap to close' },
        });
      });
      /* a drawer opened before the index landed learns its clip now */
      if (selType === 'skill' && selId && CLIPS[selId] && !el.drawer.hidden) openDetail(selType, selId, true);
    });
  function clipHTML(e) {
    var c = CLIPS[e.id];
    if (!c || !c.sources || !c.sources.length) return '';
    return '<div class="dclip"><button class="dclip-v" type="button" data-cinema="skill:' + esc(e.id) + '" aria-label="Watch ' + esc(e.name) + ' in the theater">' +
      '<video muted loop playsinline autoplay preload="metadata"' + (c.poster ? ' poster="' + esc(clipURL(c.poster)) + '"' : '') + '>' +
      c.sources.map(function (s) { return '<source src="' + esc(clipURL(s.src)) + '"' + (s.type ? ' type="' + esc(s.type) + '"' : '') + '>'; }).join('') +
      '</video></button><div class="dportcap">cast in the game, by the game</div></div>';
  }

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
    var c = { all: DB.all.length, skill: 0, support: 0, unique: 0, monster: 0, class: 0 };
    DB.all.forEach(function (e) { c[e.type]++; });
    return c;
  }
  function renderTabs() {
    var c = counts();
    var order = ['all', 'skill', 'support', 'unique', 'monster', 'class'];
    el.tabs.innerHTML = order.map(function (t) {
      return '<button role="tab" data-type="' + t + '" aria-selected="' + (state.type === t) + '">' +
        TYPE_LABEL[t] + '<span class="n">' + (c[t] || 0) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(el.tabs.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        state.type = b.getAttribute('data-type');
        state.tags.clear(); state.dmg.clear(); state.faction.clear();
        pushURL(); renderTabs(); render();
        el.tabs.querySelector('[aria-selected="true"]').focus({ preventScroll: true });
      });
    });
    revealActiveTab();
  }
  function revealActiveTab() {
    var tab = el.tabs.querySelector('[aria-selected="true"]');
    if (!tab) return;
    var box = tab.getBoundingClientRect(), rail = el.tabs.getBoundingClientRect();
    if (box.left < rail.left) el.tabs.scrollLeft -= rail.left - box.left;
    else if (box.right > rail.right) el.tabs.scrollLeft += box.right - rail.right;
  }

  // ---- filters (context aware) -------------------------------------------
  function pool() { return state.type === 'all' ? DB.all : DB.all.filter(function (e) { return e.type === state.type; }); }
  function uniqVals(items, fn) {
    var s = {};
    items.forEach(function (it) { (fn(it) || []).forEach(function (v) { if (v) s[v] = (s[v] || 0) + 1; }); });
    return Object.keys(s).sort(function (a, b) { return s[b] - s[a] || a.localeCompare(b); });
  }
  var compactFilters = window.matchMedia('(max-width:1050px)'), filtersOpen = null, filterType = null;
  function fitFilters() {
    var panel = el.filters.querySelector('.filter-panel');
    if (panel && filtersOpen === null) panel.open = !compactFilters.matches;
    revealActiveTab();
  }
  compactFilters.addEventListener('change', fitFilters);
  // Keep the controls mounted while results change: focus, scroll position and
  // the reader's open groups should survive every selection and search.
  el.filters.addEventListener('click', function (event) {
    if (event.target.closest('.filter-summary')) {
      filtersOpen = !el.filters.querySelector('.filter-panel').open;
      return;
    }
    var b = event.target.closest('.facet button');
    if (b) {
      var set = state[b.dataset.set], v = b.dataset.val;
      if (set.has(v)) set.delete(v); else set.add(v);
      render();
    } else if (event.target.closest('#clearf')) {
      state.tags.clear(); state.dmg.clear(); state.faction.clear(); render();
    }
  });
  function renderFilters() {
    if (filterType === state.type) { syncFilters(); return; }
    filterType = state.type;
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
    el.filters.hidden = !html;
    el.filters.innerHTML = html ? '<details class="filter-panel"' + ((filtersOpen === null ? !compactFilters.matches : filtersOpen) ? ' open' : '') + '>' +
      '<summary class="filter-summary"><span>Refine results<small class="filter-status"></small></span><span class="filter-chevron" aria-hidden="true"></span></summary>' +
      '<div class="filter-body">' + html + '<button type="button" class="clearf" id="clearf">Clear filters</button></div></details>' : '';
    syncFilters();
  }
  function syncFilters() {
    var count = state.tags.size + state.dmg.size + state.faction.size;
    var status = el.filters.querySelector('.filter-status');
    if (status) status.textContent = count ? count + ' selected' : 'Narrow your search';
    el.filters.querySelectorAll('.facet button').forEach(function (b) { b.setAttribute('aria-pressed', state[b.dataset.set].has(b.dataset.val)); });
    el.filters.querySelectorAll('[data-filter-count]').forEach(function (badge) { var n = state[badge.dataset.filterCount].size; badge.textContent = n ? n + ' selected' : ''; });
    var clear = el.filters.querySelector('#clearf');
    if (clear) clear.disabled = !count;
  }
  function facetGroup(title, setName, vals, cls) {
    var set = state[setName];
    return '<details class="grp" open><summary>' + esc(title) + '<span data-filter-count="' + setName + '"></span><span class="filter-chevron" aria-hidden="true"></span></summary><div class="facet" role="group" aria-label="' + esc(title) + '">' + vals.map(function (v) {
      return '<button type="button" class="' + cls + '" data-set="' + setName + '" data-val="' + esc(v) + '" aria-pressed="' + set.has(v) + '">' + esc(v) + '</button>';
    }).join('') + '</div></details>';
  }

  // ---- filter + render grid ----------------------------------------------
  function matches(e) {
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = (e.name + ' ' + e.id + ' ' + (e.description || '') + ' ' + (e.tags || []).join(' ') + ' ' + (e.faction || '') + ' ' + (e.baseName||'') + ' ' + (e.flavor||'') + ' ' + (e.mods||[]).map(function(m){return m.text;}).join(' ')).toLowerCase();
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
    window.HWIcons?.watch(el.grid);
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
    var icon=window.HWIcons&&['skill','support','unique'].includes(e.type)?window.HWIcons.html(e,e.type):'';
    return '<button class="card' + (port ? ' has-port' : '') + (icon?' has-icon':'') + '" data-type="' + e.type + '" data-id="' + esc(e.id) + '" style="--accent:' + ac + '">' +
      port + icon +
      '<div class="cname"><span class="dot" style="background:' + ac + '"></span>' + esc(e.name) +
      '<span class="kindpill">' + e.type + '</span></div>' +
      (e.description||e.flavor ? '<div class="cdesc">' + esc(e.description||e.flavor) + '</div>' : '<div class="cdesc"></div>') +
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
    if(e.type==='unique')return '<span>'+esc(e.baseName||e.category||'Unique')+'</span>';
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
    window.HWIcons?.watch(el.drawer);
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
    if(e.type==='unique'){row('Base',esc(e.baseName||''));row('Category',esc(e.category||''));row('Minimum item level',e.minIlvl);}
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

    // The monster itself, drawn by the game's own painters; the drawer leads
    // with the creature, then the facts.
    var portrait = '';
    if (e.type === 'monster' && portraitsReady() && e.raw) {
      var px = Math.round(PORTRAIT.detail * portraitOS());
      portrait = '<div class="dportrait"><canvas class="mport-detail" data-mport="' + esc(e.id) + '" width="' + px + '" height="' + px + '"></canvas>' +
        '<div class="dportcap">as it walks the world, drawn by the game\'s own painters</div></div>';
    }

    return '<div class="dhead">' +
      (window.HWIcons&&['skill','support','unique'].includes(e.type)?window.HWIcons.html(e,e.type):'') +
      '<div class="titles"><div class="dk" style="color:' + ac + '">' + e.type + '</div>' +
      '<h2 id="drawer-title" tabindex="-1">' + esc(e.name) + '</h2>' +
      '<div class="idline">' + esc(e.id) + '</div></div>' +
      '<button class="close" aria-label="Close">✕</button></div>' +
      '<div class="dbody">' +
      portrait + (e.type === 'skill' ? clipHTML(e) : '') +
      (e.description ? '<p class="desc">' + esc(e.description) + '</p>' : '') +
      (e.type==='unique'?'<ul class="db-unique-mods">'+(e.mods||[]).map(function(m){return '<li>'+esc(m.text)+'</li>';}).join('')+'</ul>'+(e.flavor?'<p class="db-unique-flavor">'+esc(e.flavor)+'</p>':''):'') +
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
