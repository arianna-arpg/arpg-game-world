/* Hollow Wake — Passive Tree Builder
   Renders the real passive tree from data/passives.json (generated from
   src/data/passives.ts) and lets you plan a build: allocate outward from a
   class start with connectivity enforced, total every modifier live, and
   share a build as a URL. No game facts are hard-coded here. */
(function () {
  'use strict';

  var DATA_DIR = '../data/';

  // node kind -> {color, radius(world units), label, z}
  var KIND = {
    start:    { color: '#4fd6c4', r: 62, label: 'Class start', z: 6 },
    keystone: { color: '#ff8a4c', r: 58, label: 'Keystone',    z: 5 },
    notable:  { color: '#e9c46a', r: 44, label: 'Notable',     z: 4 },
    choice:   { color: '#7bd88f', r: 40, label: 'Choice',      z: 4 },
    vocation: { color: '#a98bff', r: 38, label: 'Vocation',    z: 3 },
    attr:     { color: '#7fa8d0', r: 30, label: 'Attribute',   z: 2 },
    small:    { color: '#8b93ab', r: 28, label: 'Passive',     z: 1 },
  };
  function kindOf(n) { return KIND[n.kind] ? n.kind : 'small'; }

  var el = {
    canvas: document.getElementById('tree'),
    wrap: document.querySelector('.canvas-wrap'),
    tip: document.getElementById('tip'),
    loading: document.getElementById('loading'),
    classsel: document.getElementById('classsel'),
    levelinp: document.getElementById('levelinp'),
    ptsval: document.getElementById('ptsval'),
    ptsmax: document.getElementById('ptsmax'),
    ptsbox: document.getElementById('ptsbox'),
    totals: document.getElementById('totals'),
    allocsub: document.getElementById('allocsub'),
    legend: document.getElementById('legend'),
    search: document.getElementById('search'),
    nodecount: document.getElementById('nodecount'),
    selcard: document.getElementById('selcard'),
    snkind: document.getElementById('snkind'),
    snname: document.getElementById('snname'),
    sndesc: document.getElementById('sndesc'),
    snid: document.getElementById('snid'),
    snalloc: document.getElementById('snalloc'),
    toast: document.getElementById('toast'),
    banner: document.getElementById('banner'),
  };
  var ctx = el.canvas.getContext('2d');

  var TREE = { nodes: [], byId: {}, adj: {}, starts: {}, bounds: null };
  var CLASSES = [];               // [{id,name,start}]
  var allocated = new Set();
  var curClass = null;
  var startNode = null;
  var selId = null;               // node shown in the side panel
  var hoverId = null;
  var searchHits = new Set();
  var level = 90;                 // budget = level + 1 (PROGRESSION.passivePointsPerLevel = 1)

  var view = { cx: 0, cy: 0, scale: 0.14 };   // world point at canvas center + px/world-unit
  var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  var W = 0, H = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ------------------------------------------------------------------ load
  fetch(DATA_DIR + 'passives.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('passives ' + r.status); return r.json(); })
    .then(function (p) { return fetchClasses().then(function (cls) { boot(p, cls); }); })
    .catch(function (e) {
      el.loading.textContent = 'Could not load the tree data (' + e.message + '). Run the export or let the deploy workflow generate data/passives.json.';
    });

  function fetchClasses() {
    return fetch(DATA_DIR + 'classes.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function boot(p, classesJson) {
    // Scope to the MAIN STAR — the tree a normal character navigates. Vocation
    // subtrees (voc_*, shown only once a vocation is earned) and the locked
    // devotion/pantheon realm scaffolding live on separate coordinate islands
    // with their own point pools; the game hides them from a base character,
    // and here they'd just be unreachable clutter. realm==null && !vocation.
    var all = p.nodes || [];
    TREE.nodes = all.filter(function (n) { return !n.realm && !n.vocation; });
    TREE.starts = p.starts || {};
    var keep = {};
    TREE.nodes.forEach(function (n) { TREE.byId[n.id] = n; keep[n.id] = 1; });
    // adjacency restricted to kept nodes
    TREE.adj = {};
    var srcAdj = p.adjacency || {};
    TREE.nodes.forEach(function (n) {
      TREE.adj[n.id] = (srcAdj[n.id] || []).filter(function (id) { return keep[id]; });
    });
    // tight bounds over the kept nodes
    var xs = TREE.nodes.map(function (n) { return n.x; }), ys = TREE.nodes.map(function (n) { return n.y; });
    TREE.bounds = xs.length
      ? { minX: Math.min.apply(null, xs), maxX: Math.max.apply(null, xs), minY: Math.min.apply(null, ys), maxY: Math.max.apply(null, ys) }
      : (p.bounds || { minX: 0, maxX: 1000, minY: 0, maxY: 1000 });

    // Build the class list from starts (names from classes.json when present).
    var nameById = {};
    (classesJson || []).forEach(function (c) { nameById[c.id] = c.name || c.id; });
    CLASSES = Object.keys(TREE.starts).map(function (id) {
      return { id: id, name: nameById[id] || cap(id), start: TREE.starts[id] };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    el.classsel.innerHTML = CLASSES.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');
    el.nodecount.textContent = TREE.nodes.length + ' nodes on the core tree.';
    el.loading.hidden = true;
    renderLegend();

    // sample-data banner (parity with the Database)
    fetch(DATA_DIR + 'meta.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (meta) {
      if (meta && meta.sample) el.banner.innerHTML = '<div class="databanner"><span class="tag">Sample data</span><span>Seeded preview data — the CI export replaces it with the game\'s real tree on deploy.</span></div>';
    }).catch(function () {});

    initFromURL();
    resize();      // size the canvas first (sets W/H from the wrap's rect)…
    fitView();     // …so fitView reads real dimensions and fits, not the fallback
    wireEvents();
    scheduleDraw();
    refreshUI();
  }

  // ------------------------------------------------------------ allocation
  function setClass(id, keepAlloc) {
    if (!TREE.starts[id]) id = CLASSES[0] && CLASSES[0].id;
    curClass = id;
    startNode = TREE.starts[id];
    el.classsel.value = id;
    if (!keepAlloc) { allocated = new Set(); }
    if (startNode) allocated.add(startNode);
  }

  function neighbors(id) { return TREE.adj[id] || []; }

  function canAllocate(id) {
    if (allocated.has(id)) return false;
    var ns = neighbors(id);
    for (var i = 0; i < ns.length; i++) if (allocated.has(ns[i])) return true;
    return false;
  }

  // component of `allocated` reachable from start — used to prune on refund
  function reachableFromStart() {
    var seen = new Set(), stack = [startNode];
    if (!startNode || !allocated.has(startNode)) return seen;
    seen.add(startNode);
    while (stack.length) {
      var cur = stack.pop();
      neighbors(cur).forEach(function (nb) {
        if (allocated.has(nb) && !seen.has(nb)) { seen.add(nb); stack.push(nb); }
      });
    }
    return seen;
  }

  function allocate(id) {
    if (!canAllocate(id)) return false;
    allocated.add(id);
    return true;
  }
  function deallocate(id) {
    if (id === startNode) { toast('The class start can\'t be refunded.'); return false; }
    if (!allocated.has(id)) return false;
    allocated.delete(id);
    // prune anything now disconnected from start
    var keep = reachableFromStart();
    keep.add(startNode);
    allocated.forEach(function (a) { if (!keep.has(a)) allocated.delete(a); });
    return true;
  }
  function toggle(id) {
    if (allocated.has(id)) return deallocate(id);
    if (canAllocate(id)) return allocate(id);
    toast('Not reachable yet — allocate a path to it first.');
    return false;
  }

  // restore a saved set: greedily allocate any listed node adjacent to the
  // current frontier until nothing more can be added (order-independent).
  function restoreSet(ids) {
    var want = new Set(ids.filter(function (i) { return TREE.byId[i] && i !== startNode; }));
    var progress = true;
    while (progress) {
      progress = false;
      want.forEach(function (id) {
        if (!allocated.has(id) && canAllocate(id)) { allocated.add(id); want.delete(id); progress = true; }
      });
    }
  }

  // -------------------------------------------------------------- URL state
  function initFromURL() {
    var p = new URLSearchParams(location.search);
    var lv = parseInt(p.get('l'), 10);
    if (!isNaN(lv)) level = Math.max(1, Math.min(100, lv));
    if (el.levelinp) el.levelinp.value = level;
    var c = p.get('c');
    setClass(c && TREE.starts[c] ? c : (CLASSES[0] && CLASSES[0].id));
    var n = p.get('n');
    if (n) restoreSet(n.split('.'));
  }
  function pushURL(replace) {
    var ids = [];
    allocated.forEach(function (id) { if (id !== startNode) ids.push(id); });
    ids.sort();
    var p = new URLSearchParams();
    p.set('c', curClass);
    if (level !== 90) p.set('l', level);
    if (ids.length) p.set('n', ids.join('.'));
    var url = location.pathname + '?' + p.toString();
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  // ------------------------------------------------------------ view / math
  function fitView() {
    var b = TREE.bounds, pad = 240;
    var wW = (b.maxX - b.minX) + pad * 2, wH = (b.maxY - b.minY) + pad * 2;
    var sx = W / wW, sy = H / wH;
    view.scale = Math.min(sx, sy) || 0.14;
    view.cx = (b.minX + b.maxX) / 2;
    view.cy = (b.minY + b.maxY) / 2;
    clampScale();
  }
  function clampScale() { view.scale = Math.max(0.05, Math.min(1.6, view.scale)); }
  function w2sx(x) { return (x - view.cx) * view.scale + W / 2; }
  function w2sy(y) { return (y - view.cy) * view.scale + H / 2; }
  function s2wx(x) { return (x - W / 2) / view.scale + view.cx; }
  function s2wy(y) { return (y - H / 2) / view.scale + view.cy; }

  function resize() {
    var rect = el.wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    el.canvas.width = Math.round(W * dpr);
    el.canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scheduleDraw();
  }

  function nodeAt(sx, sy) {
    // topmost (highest z, then nearest) node under a screen point
    var best = null, bestD = Infinity;
    for (var i = 0; i < TREE.nodes.length; i++) {
      var n = TREE.nodes[i];
      var dx = sx - w2sx(n.x), dy = sy - w2sy(n.y);
      var rr = Math.max(9, KIND[kindOf(n)].r * view.scale);
      var d = dx * dx + dy * dy;
      if (d <= rr * rr) {
        var z = KIND[kindOf(n)].z;
        if (!best || z > KIND[kindOf(best)].z || (z === KIND[kindOf(best)].z && d < bestD)) { best = n; bestD = d; }
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ draw
  var drawQueued = false;
  function scheduleDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }

  function draw() {
    drawQueued = false;
    ctx.clearRect(0, 0, W, H);
    var searching = searchHits.size > 0;

    // edges (draw each undirected pair once)
    ctx.lineWidth = 1;
    for (var i = 0; i < TREE.nodes.length; i++) {
      var a = TREE.nodes[i];
      var ns = neighbors(a.id);
      for (var j = 0; j < ns.length; j++) {
        var b = TREE.byId[ns[j]];
        if (!b || a.id >= b.id) continue; // once per pair
        var bothAlloc = allocated.has(a.id) && allocated.has(b.id);
        var oneAlloc = allocated.has(a.id) || allocated.has(b.id);
        ctx.beginPath();
        ctx.moveTo(w2sx(a.x), w2sy(a.y));
        ctx.lineTo(w2sx(b.x), w2sy(b.y));
        if (bothAlloc) { ctx.strokeStyle = 'rgba(127,240,225,.55)'; ctx.lineWidth = 2; }
        else if (oneAlloc) { ctx.strokeStyle = 'rgba(163,169,189,.30)'; ctx.lineWidth = 1.4; }
        else { ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; }
        ctx.stroke();
      }
    }

    // nodes, painted low-z first so notables/keystones sit on top
    var order = TREE.nodes.slice().sort(function (x, y) { return KIND[kindOf(x)].z - KIND[kindOf(y)].z; });
    var labelScale = view.scale > 0.30;
    for (var k = 0; k < order.length; k++) {
      var n = order[k];
      var K = KIND[kindOf(n)];
      var sx = w2sx(n.x), sy = w2sy(n.y);
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue; // cull
      var rr = Math.max(3.5, K.r * view.scale);
      var isAlloc = allocated.has(n.id);
      var isReach = !isAlloc && canAllocate(n.id);
      var dim = searching && !searchHits.has(n.id);

      ctx.globalAlpha = dim ? 0.18 : 1;

      // outer glow for allocated / hovered / selected
      if (isAlloc || n.id === hoverId || n.id === selId) {
        ctx.beginPath(); ctx.arc(sx, sy, rr + 4, 0, 6.283);
        ctx.fillStyle = hexA(K.color, isAlloc ? 0.22 : 0.14); ctx.fill();
      }

      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.283);
      if (isAlloc) { ctx.fillStyle = K.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = hexA('#ffffff', .5); ctx.stroke(); }
      else if (isReach) { ctx.fillStyle = hexA(K.color, .16); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = hexA(K.color, .85); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(18,20,30,.92)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = hexA(K.color, .34); ctx.stroke(); }

      // selected/searched ring
      if (n.id === selId || (searching && searchHits.has(n.id))) {
        ctx.beginPath(); ctx.arc(sx, sy, rr + 3, 0, 6.283);
        ctx.strokeStyle = n.id === selId ? '#7ff0e1' : '#e9c46a'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // labels for big nodes when zoomed in (or allocated/selected/searched)
      var big = n.kind === 'keystone' || n.kind === 'notable' || n.kind === 'start' || n.kind === 'choice';
      if (!dim && (searchHits.has(n.id) || ((big || isAlloc || n.id === selId) && labelScale))) {
        ctx.font = '600 ' + Math.max(10, Math.min(15, rr * 0.6)) + "px 'Space Grotesk', sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = isAlloc ? '#e9eaf2' : 'rgba(233,234,242,.72)';
        ctx.fillText(n.name || n.id, sx, sy + rr + 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  function hexA(hex, a) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // --------------------------------------------------------------- totals
  var STAT_LABEL = {
    damage: 'Damage', damageTaken: 'Damage taken', life: 'Life', mana: 'Mana',
    armor: 'Armor', evasion: 'Evasion', energyShield: 'Energy shield', es: 'Energy shield',
    critChance: 'Crit chance', critMulti: 'Crit multi', statusChance: 'Ailment chance',
    attackSpeed: 'Attack speed', castSpeed: 'Cast speed', moveSpeed: 'Move speed',
    resist: 'Resistance', poise: 'Poise', block: 'Block', area: 'Area', duration: 'Duration',
  };
  function statLabel(s) { return STAT_LABEL[s] || cap(s.replace(/([A-Z])/g, ' $1')); }

  function computeTotals() {
    var attrs = {}, apct = {}, mods = {};   // mods key: stat|kind|tags
    allocated.forEach(function (id) {
      var n = TREE.byId[id]; if (!n) return;
      if (n.attributes) for (var a in n.attributes) attrs[a] = (attrs[a] || 0) + n.attributes[a];
      if (n.attributesPct) for (var b in n.attributesPct) apct[b] = (apct[b] || 0) + n.attributesPct[b];
      (n.mods || []).forEach(function (m) {
        var tagKey = (m.tags && m.tags.length) ? m.tags.slice().sort().join('+') : '';
        // fromStat is part of the identity of a 'link' (conversion) mod — keep
        // it in the key so two different conversions into the same stat don't merge
        var key = m.stat + '|' + m.kind + '|' + tagKey + '|' + (m.fromStat || '');
        if (!mods[key]) mods[key] = { stat: m.stat, kind: m.kind, tags: tagKey, fromStat: m.fromStat || null, val: (m.kind === 'more' ? 1 : 0), ov: null };
        if (m.kind === 'more') mods[key].val *= (1 + m.value);
        else if (m.kind === 'override') mods[key].ov = m.value;
        else mods[key].val += m.value;
      });
    });
    return { attrs: attrs, apct: apct, mods: mods };
  }

  function fmtPct(v) { var p = Math.round(v * 1000) / 10; return (p >= 0 ? '+' : '') + p + '%'; }
  function fmtNum(v) { var r = Math.round(v * 100) / 100; return (r >= 0 ? '+' : '') + r; }

  function renderTotals() {
    var t = computeTotals();
    var rows = [];

    var attrKeys = Object.keys(t.attrs).filter(function (k) { return t.attrs[k]; }).sort();
    if (attrKeys.length) {
      rows.push('<div class="grp-label">Attributes</div>');
      attrKeys.forEach(function (k) { rows.push(rowHTML(cap(k), fmtNum(t.attrs[k]), t.attrs[k] < 0)); });
    }
    var apctKeys = Object.keys(t.apct).filter(function (k) { return t.apct[k]; }).sort();
    apctKeys.forEach(function (k) { rows.push(rowHTML(cap(k) + ' %', fmtPct(t.apct[k]), t.apct[k] < 0)); });

    var modKeys = Object.keys(t.mods);
    if (modKeys.length) {
      rows.push('<div class="grp-label">Modifiers</div>');
      // group display by stat
      modKeys.sort(function (a, b) {
        var A = t.mods[a], B = t.mods[b];
        return statLabel(A.stat).localeCompare(statLabel(B.stat)) || A.kind.localeCompare(B.kind) || A.tags.localeCompare(B.tags);
      }).forEach(function (key) {
        var m = t.mods[key];
        var name = statLabel(m.stat) + (m.tags ? ' <span style="color:var(--ink-faint)">[' + esc(m.tags.replace(/\+/g, ', ')) + ']</span>' : '');
        var val, neg = false, note = '';
        if (m.kind === 'override') { val = '= ' + (Math.round(m.ov * 100) / 100); }
        else if (m.kind === 'more') { var mm = Math.round((m.val - 1) * 1000) / 10; neg = mm < 0; val = (mm >= 0 ? '+' : '') + mm + '%'; note = ' more'; }
        else if (m.kind === 'increased') { neg = m.val < 0; val = fmtPct(m.val); note = ' incr'; }
        else if (m.kind === 'link') { neg = m.val < 0; val = fmtPct(m.val) + ' of ' + statLabel(m.fromStat || '?'); note = ''; }
        else { neg = m.val < 0; val = fmtNum(m.val); note = ' flat'; }
        if (m.kind !== 'override' && Math.abs(m.kind === 'more' ? (m.val - 1) : m.val) < 1e-9) return;
        rows.push(rowHTML(name, val + '<span style="color:var(--ink-faint);font-size:11px">' + note + '</span>', neg));
      });
    }

    var count = allocated.size;
    el.allocsub.textContent = count + ' node' + (count === 1 ? '' : 's');
    if (!rows.length) { el.totals.innerHTML = '<div class="totals-empty">Allocate nodes to see their combined modifiers here.</div>'; return; }
    el.totals.innerHTML = rows.join('');
  }
  function rowHTML(name, val, neg) {
    return '<div class="row"><span>' + name + '</span><span class="v' + (neg ? ' neg' : '') + '">' + val + '</span></div>';
  }

  // ----------------------------------------------------------------- UI sync
  function refreshUI() {
    var spent = Math.max(0, allocated.size - 1); // start is free
    var avail = level + 1;                        // budget = level + 1
    el.ptsval.textContent = spent;
    el.ptsmax.textContent = avail;
    el.ptsbox.classList.toggle('over', spent > avail);
    el.ptsbox.title = spent > avail ? (spent - avail) + ' over budget for level ' + level : '';
    renderTotals();
    renderSelected();
    scheduleDraw();
  }

  function renderLegend() {
    var order = ['start', 'keystone', 'notable', 'choice', 'vocation', 'attr', 'small'];
    el.legend.innerHTML = order.filter(function (k) { return KIND[k]; }).map(function (k) {
      return '<div class="li"><span class="sw" style="background:' + KIND[k].color + '"></span>' + KIND[k].label + '</div>';
    }).join('');
  }

  function renderSelected() {
    if (!selId || !TREE.byId[selId]) { el.selcard.hidden = true; return; }
    var n = TREE.byId[selId], K = KIND[kindOf(n)];
    el.selcard.hidden = false;
    el.snkind.textContent = K.label; el.snkind.style.color = K.color;
    el.snname.textContent = n.name || n.id;
    el.sndesc.textContent = n.description || '(no description)';
    el.snid.textContent = n.id;
    var b = el.snalloc;
    if (n.id === startNode) { b.textContent = 'Class start (fixed)'; b.disabled = true; b.style.opacity = .5; }
    else if (allocated.has(n.id)) { b.textContent = 'Refund this node'; b.disabled = false; b.style.opacity = 1; }
    else if (canAllocate(n.id)) { b.textContent = 'Allocate'; b.disabled = false; b.style.opacity = 1; }
    else { b.textContent = 'Not reachable'; b.disabled = true; b.style.opacity = .5; }
  }

  var toastT;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.toast.classList.remove('on'); }, 1900);
  }

  // -------------------------------------------------------------- interaction
  function wireEvents() {
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el.wrap);

    var dragging = false, moved = false, lastX = 0, lastY = 0, downX = 0, downY = 0;
    el.canvas.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY;
      el.canvas.setPointerCapture(e.pointerId); el.canvas.classList.add('grabbing');
    });
    el.canvas.addEventListener('pointermove', function (e) {
      var rect = el.canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragging) {
        var ddx = e.clientX - lastX, ddy = e.clientY - lastY;
        // measure total displacement from the press origin (a slow drag arrives
        // as many sub-threshold events; a per-event delta would miss it and
        // misfire the release as a node click)
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 3) moved = true;
        view.cx -= ddx / view.scale; view.cy -= ddy / view.scale;
        lastX = e.clientX; lastY = e.clientY; hideTip(); scheduleDraw();
      } else {
        var n = nodeAt(mx, my);
        if (n) { hoverId = n.id; showTip(n, mx, my); } else { hoverId = null; hideTip(); }
        scheduleDraw();
      }
    });
    function endDrag(e) {
      if (dragging && !moved) {
        var rect = el.canvas.getBoundingClientRect();
        var n = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
        if (n) onNodeClick(n);
      }
      dragging = false; el.canvas.classList.remove('grabbing');
    }
    el.canvas.addEventListener('pointerup', endDrag);
    el.canvas.addEventListener('pointercancel', function () { dragging = false; el.canvas.classList.remove('grabbing'); });
    el.canvas.addEventListener('pointerleave', function () { hoverId = null; hideTip(); scheduleDraw(); });

    el.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = el.canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      zoomAt(mx, my, Math.pow(1.0015, -e.deltaY));
    }, { passive: false });

    document.getElementById('zin').addEventListener('click', function () { zoomAt(W / 2, H / 2, 1.3); });
    document.getElementById('zout').addEventListener('click', function () { zoomAt(W / 2, H / 2, 1 / 1.3); });
    document.getElementById('zfit').addEventListener('click', function () { fitView(); scheduleDraw(); });

    el.classsel.addEventListener('change', function () {
      setClass(el.classsel.value); selId = startNode; pushURL(); refreshUI();
    });
    el.levelinp.addEventListener('change', function () {
      var v = parseInt(el.levelinp.value, 10);
      level = isNaN(v) ? 90 : Math.max(1, Math.min(100, v));
      el.levelinp.value = level; pushURL(true); refreshUI();
    });
    document.getElementById('resetbtn').addEventListener('click', function () {
      allocated = new Set(); if (startNode) allocated.add(startNode); pushURL(); refreshUI(); toast('Build reset.');
    });
    document.getElementById('sharebtn').addEventListener('click', shareBuild);
    el.snalloc.addEventListener('click', function () { if (selId) onNodeClick(TREE.byId[selId]); });

    var st;
    el.search.addEventListener('input', function () {
      clearTimeout(st); st = setTimeout(doSearch, 120);
    });
    window.addEventListener('popstate', function () { allocated = new Set(); initFromURL(); refreshUI(); });
  }

  function zoomAt(mx, my, f) {
    var wx = s2wx(mx), wy = s2wy(my);
    view.scale *= f; clampScale();
    // keep the world point under the cursor fixed
    view.cx = wx - (mx - W / 2) / view.scale;
    view.cy = wy - (my - H / 2) / view.scale;
    hideTip(); scheduleDraw();
  }

  function onNodeClick(n) {
    selId = n.id;
    toggle(n.id);
    pushURL(); refreshUI();
  }

  function showTip(n, mx, my) {
    var K = KIND[kindOf(n)];
    var state = n.id === startNode ? 'Class start' : allocated.has(n.id) ? 'Allocated — click to refund' : canAllocate(n.id) ? 'Click to allocate' : 'Locked — no path yet';
    el.tip.innerHTML = '<div class="tk" style="color:' + K.color + '">' + K.label + '</div>' +
      '<div class="tn">' + esc(n.name || n.id) + '</div>' +
      '<div class="td">' + esc(n.description || '') + '</div>' +
      '<div class="thint">' + state + '</div>';
    var tw = 260, x = mx + 16, y = my + 16;
    if (x + tw > W) x = mx - tw - 8;
    if (y + 120 > H) y = my - 120;
    el.tip.style.left = Math.max(6, x) + 'px'; el.tip.style.top = Math.max(6, y) + 'px';
    el.tip.classList.add('on');
  }
  function hideTip() { el.tip.classList.remove('on'); }

  function doSearch() {
    var q = el.search.value.trim().toLowerCase();
    searchHits = new Set();
    if (q) {
      TREE.nodes.forEach(function (n) {
        var hay = (n.name + ' ' + n.id + ' ' + (n.description || '')).toLowerCase();
        if (hay.indexOf(q) !== -1) searchHits.add(n.id);
      });
      // pan to the first hit
      var first = TREE.nodes.find(function (n) { return searchHits.has(n.id); });
      if (first) { view.cx = first.x; view.cy = first.y; if (view.scale < 0.32) view.scale = 0.42; }
    }
    scheduleDraw();
  }

  function shareBuild() {
    pushURL(true);
    var url = location.href;
    var done = function () { toast('Build link copied to clipboard.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this build link:', url); });
    } else { prompt('Copy this build link:', url); }
  }
})();
