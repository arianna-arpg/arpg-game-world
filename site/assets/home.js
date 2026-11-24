/* Landing-page controls. Atmosphere and the cinema retain their own owners. */
import { createClassDeck } from './class-deck.js';
import { getClassArtwork } from './class-art.js?v=hw11';
import { mountWorldStories } from './world-stories.js?v=hw25';
mountWorldStories(document.querySelector('[data-world-feature]'));
const vocationGallery=document.querySelector('[data-vocation-gallery]');
let vocationLoading=false, vocationController=null;
let selectedClass=document.querySelector('[data-class][aria-selected="true"]');
let vocationClass={id:selectedClass?.dataset.class,name:selectedClass?.querySelector('.class-name')?.textContent};
vocationGallery?.addEventListener('toggle',async()=>{
  if(!vocationGallery.open||vocationLoading||vocationGallery.dataset.vocationReady)return;
  vocationLoading=true;
  const status=vocationGallery.querySelector('[data-vocation-status]');
  status.textContent='Opening the callings…';
  try {
    const { mountVocationGallery }=await import('./vocation-gallery.js?v=hw25');
    status.textContent='';vocationController=mountVocationGallery(vocationGallery,{classId:vocationClass.id,className:vocationClass.name});
  } catch (_) { status.textContent='The preview could not load. Close and reopen to try again.'; }
  finally { vocationLoading=false; }
});
(function () {
  'use strict';
  var tabs = Array.from(document.querySelectorAll('[data-class]'));
  // Keep the approved featured-class copy when these classes return in a draw.
  var classCopy = new Map(Array.from(document.querySelectorAll('[data-class-description]'), function (el) {
    return [el.dataset.classDescription, el.textContent];
  }));
  var artwork = document.querySelector('.class-art img');
  var stage = document.querySelector('[data-class-stage]'), art = artwork.parentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var classesNear = false, warmed = new Map(), classEntries = new Map();
  var selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  var selectedId = selectedTab.dataset.class;
  var pending = null, animations = [];
  function warmArtwork(src, priority) {
    if (warmed.has(src)) return warmed.get(src);
    var image = new Image(); image.fetchPriority = priority; image.src = src;
    warmed.set(src, image);
    if (warmed.size > 6) warmed.delete(warmed.keys().next().value);
    return image;
  }
  function warmClassChoices() {
    if (!classesNear || window.HWLoading?.economical) return;
    tabs.filter(tab => !tab.hidden).forEach(tab => {
      var src = getClassArtwork(tab.dataset.class).src;
      if (src === artwork.getAttribute('src') || warmed.has(src)) return;
      warmArtwork(src, 'low');
    });
  }
  window.HWLoading?.near(document.querySelector('#classes'), () => {
    classesNear = true; artwork.loading = 'eager'; warmClassChoices();
  });
  artwork.addEventListener('error', function () {
    var fallback = getClassArtwork(undefined);
    if (artwork.getAttribute('src') === fallback.src) return;
    artwork.alt = fallback.alt;
    artwork.style.objectPosition = fallback.position;
    artwork.src = fallback.src;
  });
  function setArtwork(painting) {
    artwork.alt = painting.alt;
    // Keep companions in the narrow-screen crop; otherwise use the responsive CSS.
    artwork.style.objectPosition = painting.position || '';
    if (artwork.getAttribute('src') !== painting.src) artwork.src = painting.src;
  }
  function showPanel(request) {
    var panel = document.getElementById(request.tab.getAttribute('aria-controls'));
    var data = request.data;
    // Shuffle reuses the tab elements. Update the visible copy only while faded,
    // and capture the dealt entry so a later draw cannot overwrite this intent.
    if (data) {
      panel.querySelector('h3').textContent = data.name;
      panel.querySelector('.kicker').textContent = (data.primary || 'Your path') + ' / Starting discipline';
      panel.querySelector('[data-class-description]').textContent = classCopy.get(data.id) || data.description || 'Discover this path in the class database.';
      panel.querySelector('a').href = 'database/?type=class&id=' + encodeURIComponent(data.id);
    }
    tabs.forEach(other => {
      document.getElementById(other.getAttribute('aria-controls')).hidden = other !== request.tab;
    });
  }
  function clearAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function animateView(opacity, offset, duration, from) {
    var targets = [art, stage.querySelector('.class-panel:not([hidden]) .class-copy')].filter(Boolean);
    // Read once per selection, never per frame. Preserve the current position
    // and opacity when an interrupted slide returns to rest during a slow load.
    var translate = (x, i) => 'translate3d(' + x * (i ? .5 : 1) + 'px,0,0)';
    var starts = targets.map((el, i) => {
      if (from) return {opacity:from.opacity, transform:translate(from.offset, i)};
      var style = getComputedStyle(el);
      return {opacity:style.opacity, transform:style.transform};
    });
    clearAnimations();
    var batch = targets.map((el, i) => el.animate([starts[i], {opacity, transform:translate(offset, i)}], {
      duration, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards'
    }));
    animations = batch;
    return Promise.all(batch.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (opacity === 1 && offset === 0 && animations === batch) clearAnimations();
    });
  }
  function settleSelection() {
    if (pending) {
      setArtwork(pending.painting || getClassArtwork(pending.id));
      showPanel(pending);
      pending = null;
    }
    clearAnimations();
    stage.removeAttribute('aria-busy');
  }
  async function transition(request) {
    var painting = getClassArtwork(request.id);
    try { await warmArtwork(painting.src, 'auto').decode(); }
    catch (_) {
      warmed.delete(painting.src);
      if (pending !== request) return;
      painting = getClassArtwork(undefined);
      await warmArtwork(painting.src, 'auto').decode().catch(() => {});
    }
    if (pending !== request) return;
    request.painting = painting;
    // A restrained handoff keeps the painting present rather than disappearing
    // into a blank stage. Move the single image/canvas host, never its crop.
    await animateView(.6, -request.direction * 6, 120);
    if (pending !== request) return;
    setArtwork(painting);
    showPanel(request);
    // Commit painting and copy together at their incoming position. A new
    // selection may interrupt decode and restore this coherent view.
    var arrival = request.direction * 18;
    animateView(.6, arrival, 0, {opacity:.6, offset:arrival});
    // The same img and memory canvas change source during the handoff. Wait
    // for decoding before revealing, including a renderer's static fallback.
    await artwork.decode().catch(() => {});
    if (pending !== request) return;
    await animateView(1, 0, 420);
    if (pending !== request) return;
    pending = null;
    stage.removeAttribute('aria-busy');
  }
  function selectClass(tab, focus, animate = true) {
    if (focus) tab.focus();
    if (animate && tab.dataset.class === selectedId && tab === selectedTab) return;
    var direction = tabs.indexOf(tab) < tabs.indexOf(selectedTab) ? -1 : 1;
    selectedId = tab.dataset.class;
    selectedTab = tab;
    tabs.forEach(function (other) {
      var selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
    });
    vocationClass={id:tab.dataset.class,name:tab.querySelector('.class-name').textContent};
    vocationController?.setClass(vocationClass.id,vocationClass.name);
    pending = {tab, id:selectedId, data:classEntries.get(selectedId), direction};
    var rect = stage.getBoundingClientRect();
    if (!animate || reduced.matches || document.hidden || rect.bottom <= 0 || rect.top >= innerHeight || !art.animate) {
      settleSelection();
      return;
    }
    stage.setAttribute('aria-busy', 'true');
    // Keep the current view readable during a slow load, even if this click
    // interrupts a previous slide. Each completed effect releases its layer.
    if (animations.length) animateView(1, 0, 140);
    transition(pending);
  }
  reduced.addEventListener('change', () => { if (reduced.matches) settleSelection(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settleSelection(); });
  window.addEventListener('pagehide', settleSelection);
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectClass(tab, false); });
    tab.addEventListener('keydown', function (event) {
      var next;
      var available = tabs.filter(function (item) { return !item.hidden; });
      var current = available.indexOf(tab);
      if (event.key === 'ArrowRight') next = (current + 1) % available.length;
      if (event.key === 'ArrowLeft') next = (current + available.length - 1) % available.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = available.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectClass(available[next], true);
    });
  });
  // A fresh deck each visit, drawn from every class in the published game.
  // Keep the authored tabs usable if the data request fails.
  fetch('data/classes.json', { cache: 'no-cache' }).then(function (r) {
    return r.ok ? r.json() : [];
  }).then(function (classes) {
    if (!Array.isArray(classes)) return;
    var deal = createClassDeck(classes);
    var shuffle = document.querySelector('[data-class-shuffle]');
    var status = document.querySelector('[data-class-status]');
    function discover(announce) {
      var cards = deal(tabs.length);
      if (!cards.length) return;
      tabs.forEach(function (tab, i) {
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        var data = cards[i];
        tab.hidden = !data;
        if (!data) { panel.hidden = true; return; }
        tab.dataset.class = data.id;
        tab.dataset.primary = data.primary || '';
        tab.querySelector('.class-name').textContent = data.name;
        classEntries.set(data.id, data);
      });
      selectClass(tabs[0], false, announce);
      warmClassChoices();
      shuffle.hidden = false;
      if (announce) status.textContent = 'New paths: ' + cards.map(function (c) { return c.name; }).join(', ') + '.';
    }
    shuffle.addEventListener('click', function () { discover(true); });
    discover(false);
  }).catch(function () { /* The authored introduction remains usable offline. */ });
  fetch('data/meta.json', { cache: 'no-cache' }).then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (meta) {
    if (!meta || !meta.version) return;
    document.querySelectorAll('[data-meta-version]').forEach(function (el) {
      el.textContent = '· v' + meta.version;
    });
  }).catch(function () { /* Version is optional; never invent a fallback. */ });
})();
