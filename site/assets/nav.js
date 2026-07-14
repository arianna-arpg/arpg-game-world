/* Hollow Wake — the shared site navigation widget.
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

  // ── markup ────────────────────────────────────────────────────────────────
  var GH = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  /* THE INSIGNIA — canonical geometry (ring, HOLLOW core, three points in
     teal / violet / ember). The hero lockup and the home footer carry hand-
     tuned copies of the same design; keep the three in sync. */
  var MARK = '<svg class="hwnav-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="12" stroke="url(#hwNavGrad)" stroke-width="1.4" opacity=".9"/><path d="M16 11.6V6.2M19.8 18.2l4.7 2.7M12.2 18.2l-4.7 2.7" stroke="url(#hwNavGrad)" stroke-width="1.1" opacity=".55"/><circle cx="16" cy="16" r="4.4" stroke="url(#hwNavGrad)" stroke-width="1.5"/><circle cx="16" cy="4" r="2.2" fill="#4fd6c4"/><circle cx="26.4" cy="22" r="2.2" fill="#a98bff"/><circle cx="5.6" cy="22" r="2.2" fill="#ff8a4c"/><defs><linearGradient id="hwNavGrad" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#7ff0e1"/><stop offset="1" stop-color="#a98bff"/></linearGradient></defs></svg>';

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
    if (a.cta)  return '<a class="hwnav-cta" href="' + a.href + '" target="_blank" rel="noopener">' + a.label + '</a>';
    return '<a href="' + a.href + '" target="_blank" rel="noopener">' + a.label + '</a>';
  }

  var homeHref = prefix || '#top';
  var inner =
    '<div class="hwnav-wrap">' +
      '<a class="hwnav-brand" href="' + homeHref + '" aria-label="Hollow Wake home">' + MARK + '<span>HOLLOW WAKE</span></a>' +
      '<nav class="hwnav-links" aria-label="Primary">' +
        PAGES.map(pageLink).join('') +
        '<span class="hwnav-sep" aria-hidden="true"></span>' +
        ACTIONS.map(actionLink).join('') +
      '</nav>' +
    '</div>';

  // ── styles (injected once, scoped to .hwnav) ──────────────────────────────
  var CSS =
  '.hwnav{position:sticky;top:0;z-index:60;transition:background .3s,border-color .3s,backdrop-filter .3s;border-bottom:1px solid transparent}' +
  '.hwnav.scrolled{background:rgba(8,9,14,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom-color:var(--line,rgba(255,255,255,.08))}' +
  '.hwnav-wrap{max-width:var(--maxw,1220px);margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}' +
  '.hwnav-brand{display:flex;align-items:center;gap:11px;font-family:var(--font-display,"Cinzel",serif);font-weight:700;letter-spacing:.13em;font-size:14.5px;color:var(--ink,#e9eaf2);white-space:nowrap;text-decoration:none}' +
  '.hwnav-mark{width:24px;height:24px;flex:0 0 auto}' +
  '.hwnav-links{display:flex;align-items:center;gap:22px;font-size:14px;font-family:var(--font-body,system-ui,sans-serif);min-width:0}' +
  '.hwnav-links a{color:var(--ink-dim,#a3a9bd);transition:color .2s;position:relative;white-space:nowrap;text-decoration:none}' +
  '.hwnav-links a:hover,.hwnav-links a.active{color:var(--ink,#e9eaf2)}' +
  '.hwnav-links a.active::after{content:"";position:absolute;left:0;right:0;bottom:-21px;height:2px;background:linear-gradient(90deg,var(--teal,#4fd6c4),var(--violet,#a98bff))}' +
  '.hwnav-sep{width:1px;height:20px;background:var(--line-2,rgba(255,255,255,.14));flex:0 0 auto}' +
  '.hwnav-gh{display:inline-flex;align-items:center;gap:7px;color:var(--ink,#e9eaf2)!important}' +
  '.hwnav-gh:hover{color:var(--teal,#4fd6c4)!important}' +
  '.hwnav-cta{border:1px solid var(--line-2,rgba(255,255,255,.14));padding:7px 15px;border-radius:999px;font-weight:600;font-size:13px;color:var(--ink,#e9eaf2)!important;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));transition:border-color .2s,transform .2s}' +
  '.hwnav-cta:hover{border-color:var(--teal,#4fd6c4);transform:translateY(-1px)}' +
  '.hwnav-short{display:none}' +
  '@media(max-width:680px){' +
    '.hwnav-wrap{gap:10px;padding:0 14px}' +
    '.hwnav-links{gap:15px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}' +
    '.hwnav-links::-webkit-scrollbar{display:none}' +
    '.hwnav-full{display:none}.hwnav-short{display:inline}' +
    '.hwnav-ghtext{display:none}' +
    '.hwnav-brand span{display:none}' +
    '.hwnav-links a.active::after{bottom:-19px}' +
  '}';

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
