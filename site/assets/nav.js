/* Hollow Wake · the shared site navigation widget.
   ONE source of truth for the top nav on every page. Add or rename a page in
   PAGES (or an action in ACTIONS) below and it updates on every page at once.

   Self-contained: the widget injects its own scoped CSS (.hwnav*), renders its
   markup into a <header data-hwnav> (or any <header class="nav">), and wires the
   scroll state + active page. A page only needs to:
     1. include  <script src="…/assets/nav.js"></script>
     2. set      <html data-page="database">   (or tree / play / home)
     3. provide  <header data-hwnav></header>   (a mount point)
   Paths are resolved relative to the site root from the page's depth, so it
   works both locally and under the /arpg-game-world/ GitHub Pages sub-path. */
(function () {
  'use strict';

  // ── single source of truth ───────────────────────────────────────────────
  var REPO = 'https://github.com/arianna-arpg/arpg-game-world';
  var PAGES = [
    { id: 'database', label: 'Database',     href: 'database/' },
    { id: 'tree',     label: 'Passive Tree', href: 'tree/', short: 'Tree' },
    { id: 'play',     label: 'Play',         href: 'play/' },
    { id: 'systems',  label: 'Systems',      href: 'systems/' },
  ];
  var ACTIONS = [
    { id: 'github',   label: 'GitHub',   href: REPO,               icon: true },
    { id: 'download', label: 'Download', href: REPO + '/releases', cta: true },
  ];

  var page = (document.documentElement.getAttribute('data-page') || 'home').toLowerCase();
  var prefix = page === 'home' ? '' : '../';   // subpages sit one level below site root
  if (page === 'home') {
    PAGES = [
      { id: 'world', label: 'The world', href: '#world' },
      { id: 'classes', label: 'Classes', href: '#classes' },
      { id: 'builds', label: 'Your build', href: '#builds' },
      { id: 'database', label: 'Database', href: 'database/' },
      { id: 'tree', label: 'Build planner', href: 'tree/' },
    ];
    ACTIONS = [{ id: 'play', label: 'Play free ↗', href: 'play/', cta: true }];
  }

  // ── markup ────────────────────────────────────────────────────────────────
  var GH = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  /* THE INSIGNIA: canonical geometry (ring, HOLLOW core, three points in
     teal / violet / ember). The hero lockup and the home footer carry hand-
     tuned copies of the same design; keep the three in sync. */
  var MARK = '<img class="hwnav-mark" src="' + prefix + 'assets/brand/hollow-wake.svg" width="600" height="230" alt="" draggable="false">';

  function pageLink(p) {
    var cur = p.id === page ? ' aria-current="page" class="active"' : '';
    var full = p.label.replace(/ /g, '&nbsp;');
    var lbl = p.short
      ? '<span class="hwnav-full">' + full + '</span><span class="hwnav-short">' + p.short + '</span>'
      : full;
    return '<a href="' + prefix + p.href + '"' + cur + '>' + lbl + '</a>';
  }
  function actionLink(a) {
    if (a.icon) return '<a class="hwnav-gh" href="' + a.href + '" target="_blank" rel="noopener" aria-label="' + a.label + ' (opens in a new tab)">' + GH + '<span class="hwnav-ghtext">' + a.label + '</span></a>';
    if (a.cta) return '<a class="hwnav-cta" href="' + a.href + '">' + a.label + '</a>';
    return '<a href="' + a.href + '" target="_blank" rel="noopener">' + a.label + '</a>';
  }

  var homeHref = prefix || '#top';
  var inner =
    '<div class="hwnav-wrap">' +
      '<a class="hwnav-brand" href="' + homeHref + '" aria-label="Hollow Wake home">' + MARK + '</a>' +
      '<button class="hwnav-toggle" type="button" aria-expanded="false" aria-controls="hwnav-menu">Menu <span aria-hidden="true">☰</span></button>' +
      '<nav class="hwnav-links" id="hwnav-menu" aria-label="Primary">' +
        PAGES.map(pageLink).join('') +
        '<span class="hwnav-sep" aria-hidden="true"></span>' +
        ACTIONS.map(actionLink).join('') +
      '</nav>' +
    '</div>';

  // ── styles (injected once, scoped to .hwnav) ──────────────────────────────
  var CSS = `
  .hwnav{position:sticky;top:0;z-index:60;background:rgba(var(--bg-rgb,9,13,16),.5);border-bottom:1px solid rgba(197,207,206,.12);transition:background .25s}
  .hwnav.scrolled{background:rgba(var(--bg-rgb,9,13,16),.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  .hwnav-wrap{max-width:var(--maxw,1280px);margin:auto;padding:0 44px;height:74px;display:flex;align-items:center;justify-content:space-between;gap:30px}
  .hwnav-brand{display:flex;align-items:center;gap:12px;white-space:nowrap;font:600 14px var(--font-display,'Cinzel',serif);letter-spacing:.07em;color:var(--ink,#eeeae1);text-decoration:none}
  .hwnav-mark{display:block;width:125px;height:48px;object-fit:contain;flex:none}
  .hwnav-links{display:flex;align-items:center;gap:27px;font:12px var(--font-body,'Inter',sans-serif)}
  .hwnav-links a{position:relative;color:var(--ink-dim,#abb6bc);text-decoration:none;white-space:nowrap;transition:color .2s}
  .hwnav-links a:hover,.hwnav-links a.active{color:var(--gold,#d6bd89)}
  .hwnav-links a.active::after{content:'';position:absolute;left:0;right:0;bottom:-28px;height:2px;background:var(--gold,#d6bd89)}
  .hwnav-sep{height:20px;width:1px;background:var(--line,rgba(197,207,206,.13))}
  .hwnav-gh{display:inline-flex;align-items:center;gap:7px}
  .hwnav-links .hwnav-cta{padding:11px 19px;min-height:42px;display:inline-flex;align-items:center;justify-content:center;color:#141b1b;background:#d6bd89;border:1px solid #d6bd89;border-radius:2px;font-weight:600;letter-spacing:.025em}
  .hwnav-links .hwnav-cta:hover{background:#ecd5a5;color:#141b1b}
  .hwnav-short{display:none}
  .hwnav-toggle{display:none}
  .hwnav :focus-visible{outline:2px solid #d6bd89;outline-offset:5px}
  @media(max-width:1050px){.hwnav-wrap{padding-inline:28px;gap:20px}.hwnav-links{gap:18px}.hwnav-brand{font-size:12px}}
  @media(max-width:860px){
    .hwnav-wrap{height:66px;padding-inline:24px;position:relative;flex-wrap:wrap;gap:0}
    .hwnav-brand{font-size:13px}.hwnav-mark{width:110px;height:42px}
    .hwnav-toggle{display:flex;align-items:center;gap:13px;background:transparent;border:1px solid rgba(197,207,206,.25);border-radius:2px;min-height:40px;padding:8px 13px;color:#eeeae1;font:11px var(--font-body,system-ui);cursor:pointer}
    .hwnav-links{display:none;position:absolute;top:100%;left:0;right:0;background:rgb(var(--bg-rgb,13,20,25));border-block:1px solid #ffffff20;padding:16px 24px 24px;box-shadow:0 20px 30px #0008}
    .hwnav.open .hwnav-links{display:flex;flex-direction:column;align-items:stretch;gap:0}
    .hwnav-links a{padding:13px 4px;font-size:13px;min-height:44px}.hwnav-links a.active{color:#d6bd89}.hwnav-links a.active::after{display:none}
    .hwnav-sep{width:100%;height:1px;margin:10px 0 15px}.hwnav-links .hwnav-cta{margin-top:8px}
  }
  @media(prefers-reduced-motion:reduce){.hwnav,.hwnav-links a{transition:none}}
  `;

  var style = document.createElement('style');
  style.setAttribute('data-hwnav-style', '');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── mount ─────────────────────────────────────────────────────────────────
  var host = document.querySelector('[data-hwnav]') || document.querySelector('header.nav');
  if (!host) {
    host = document.createElement('header');
    var into = document.querySelector('.page') || document.querySelector('.content') || document.body;
    into.insertBefore(host, into.firstChild);
  }
  host.className = 'hwnav';
  host.setAttribute('role', 'banner');
  host.innerHTML = inner;

  // Mobile menu retains every destination, including keyboard navigation.
  var toggle = host.querySelector('.hwnav-toggle');
  function closeMenu(restoreFocus) {
    host.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', function () {
    var open = !host.classList.contains('open');
    host.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  host.querySelector('nav').addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && host.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', function (event) {
    if (!host.contains(event.target)) closeMenu(false);
  });
  host.addEventListener('focusout', function (event) {
    if (!host.contains(event.relatedTarget)) closeMenu(false);
  });
  window.matchMedia('(max-width:860px)').addEventListener('change', function () { closeMenu(false); });

  // ── scroll state (container-agnostic: window OR an overflow body) ────────
  function scrollTop() {
    return window.scrollY || window.pageYOffset ||
           document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
  function onScroll() { host.classList.toggle('scrolled', scrollTop() > 12); }
  onScroll();
  // capture:true also catches scroll from a non-window scroll container
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
})();
