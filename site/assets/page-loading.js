/* Prepare sections before they arrive. Disclosure content also accepts clear
   pointer/keyboard intent; nothing here opens a disclosure for the visitor. */
(function () {
  var connection = navigator.connection;
  var economical = !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType)));
  function near(target, start, distance) {
    if (!target) return;
    if (!('IntersectionObserver' in window)) { start(); return; }
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect(); start();
    }, { rootMargin: (distance || (economical ? 400 : 1200)) + 'px 0px' });
    observer.observe(target);
  }
  function disclosure(details, start) {
    var started = false, summary = details.querySelector('summary');
    function prepare() { if (!started) { started = true; start(); } }
    details.addEventListener('toggle', function () { if (details.open) prepare(); });
    summary.addEventListener('pointerenter', prepare, {once:true});
    summary.addEventListener('focus', prepare, {once:true});
    summary.addEventListener('pointerdown', prepare, {once:true, passive:true});
    if (details.open) prepare();
  }
  window.HWLoading = {near:near, disclosure:disclosure, economical:economical};
})();
