/* Landing-page controls. Atmosphere and the cinema retain their own owners. */
import { createClassDeck } from './class-deck.js';
import { getClassArtwork } from './class-art.js?v=hw7';
(function () {
  'use strict';
  // The explicit trailer button follows the same scheduled feature as the logo.
  document.querySelectorAll('[data-cinema="feature"]').forEach(function (button) {
    if (window.HWCinema) button.setAttribute('data-cinema', window.HWCinema.feature());
  });
  var tabs = Array.from(document.querySelectorAll('[data-class]'));
  var artwork = document.querySelector('.class-art img');
  function setArtwork(id) {
    var painting = getClassArtwork(id);
    artwork.alt = painting.alt;
    // Keep companions in the narrow-screen crop; otherwise use the responsive CSS.
    artwork.style.objectPosition = painting.position || '';
    if (artwork.getAttribute('src') !== painting.src) artwork.src = painting.src;
  }
  function selectClass(tab, focus) {
    tabs.forEach(function (other) {
      var selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
    });
    setArtwork(tab.dataset.class);
    if (focus) tab.focus();
  }
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
        panel.querySelector('h3').textContent = data.name;
        panel.querySelector('.kicker').textContent = (data.primary || 'Your path') + ' / A new beginning';
        panel.querySelector('[data-class-description]').textContent = data.description || 'Discover this path in the class database.';
        panel.querySelector('a').href = 'database/?type=class&id=' + encodeURIComponent(data.id);
      });
      selectClass(tabs[0], false);
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
