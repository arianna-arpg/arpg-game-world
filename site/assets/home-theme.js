/* Pick once, before the first paint. No mid-visit changes or stored preference. */
(function (scope) {
  'use strict';
  var palettes = Object.freeze({
    eigengrau: Object.freeze({ color: '#16161d', rgb: '22,22,29' }),
    charcoal: Object.freeze({ color: '#090d10', rgb: '9,13,16' })
  });
  function choose(random) { return random < .75 ? 'eigengrau' : 'charcoal'; }
  scope.HollowWakeTheme = Object.freeze({ palettes: palettes, choose: choose });
  if (!scope.document) return;
  var name = choose(Math.random()), palette = palettes[name];
  var root = scope.document.documentElement;
  root.dataset.theme = name;
  root.style.setProperty('--bg-rgb', palette.rgb);
  var meta = scope.document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = palette.color;
})(typeof window === 'undefined' ? globalThis : window);
