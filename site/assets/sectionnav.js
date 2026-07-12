/* Hollow Wake — the section dot-rail.
   A self-contained vertical rail of small dots that snap-scroll between a
   page's in-page sections. Fully dynamic: it reads every element carrying a
   [data-nav="Label"] attribute, so adding a section adds a dot automatically —
   nothing here is hard-coded. Renders nothing on pages with fewer than two
   marked sections (e.g. the single-view Database/Tree tools), so it can be
   included everywhere for parity without cluttering app pages.

   Each dot is unlabeled until hovered/active (the label slides out on hover),
   matching the "little circle dots that snap to a location" brief. */
(function () {
  'use strict';

  var secs = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  if (secs.length < 2) return;

  // ── build the rail ───────────────────────────────────────────────────────
  secs.forEach(function (s, i) { if (!s.id) s.id = 'sec-' + i; });
  var rail = document.createElement('nav');
  rail.className = 'hwdots';
  rail.setAttribute('aria-label', 'Section navigation');
  rail.innerHTML = secs.map(function (s) {
    var label = s.getAttribute('data-nav') || s.id;
    return '<a class="hwdot" href="#' + s.id + '" aria-label="Jump to ' + label.replace(/"/g, '') + '">' +
             '<span class="hwdot-label">' + label + '</span><span class="hwdot-mark"></span>' +
           '</a>';
  }).join('');
  document.body.appendChild(rail);
  var dots = Array.prototype.slice.call(rail.querySelectorAll('.hwdot'));

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  dots.forEach(function (d, i) {
    d.addEventListener('click', function (e) {
      e.preventDefault();
      secs[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + secs[i].id);
    });
  });

  // ── scroll-spy (highlight the section you're in) ──────────────────────────
  function setActive(idx) { dots.forEach(function (d, j) { d.classList.toggle('active', j === idx); }); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setActive(secs.indexOf(en.target));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    secs.forEach(function (s) { io.observe(s); });
  } else {
    setActive(0);
  }

  // ── styles ────────────────────────────────────────────────────────────────
  var CSS =
  /* keep the sticky top nav from covering a section we snap to */
  '[data-nav]{scroll-margin-top:78px}' +
  '.hwdots{position:fixed;right:16px;top:50%;transform:translateY(-50%);z-index:55;display:flex;flex-direction:column;gap:13px;align-items:flex-end}' +
  '.hwdot{display:flex;align-items:center;gap:9px;cursor:pointer;text-decoration:none;justify-content:flex-end}' +
  '.hwdot-mark{width:10px;height:10px;border-radius:50%;border:1.6px solid var(--ink-faint,#6b7189);background:transparent;transition:transform .2s,background .2s,border-color .2s,box-shadow .2s;flex:0 0 auto}' +
  '.hwdot:hover .hwdot-mark{border-color:var(--teal,#4fd6c4);transform:scale(1.25)}' +
  '.hwdot.active .hwdot-mark{background:var(--teal,#4fd6c4);border-color:var(--teal,#4fd6c4);box-shadow:0 0 10px rgba(79,214,196,.55)}' +
  '.hwdot-label{font-family:var(--font-head,"Space Grotesk",sans-serif);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-dim,#a3a9bd);' +
    'background:rgba(17,19,29,.92);border:1px solid var(--line,rgba(255,255,255,.08));padding:4px 10px;border-radius:999px;white-space:nowrap;' +
    'opacity:0;transform:translateX(8px);transition:opacity .18s,transform .18s;pointer-events:none}' +
  '.hwdot:hover .hwdot-label,.hwdot.active .hwdot-label{opacity:1;transform:none}' +
  '.hwdot.active .hwdot-label{color:var(--ink,#e9eaf2)}' +
  '@media(max-width:1040px){.hwdots{right:11px;gap:11px}.hwdot-label{display:none}}' +
  '@media(max-width:560px){.hwdots{display:none}}' +
  '@media(prefers-reduced-motion:reduce){.hwdot-mark,.hwdot-label{transition:none}}';

  var style = document.createElement('style');
  style.setAttribute('data-hwdots-style', '');
  style.textContent = CSS;
  document.head.appendChild(style);
})();
