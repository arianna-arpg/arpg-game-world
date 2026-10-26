// Embedded with the build, never fetched from a moving "latest" version.
(() => {
  const info = window.__HOLLOW_WAKE_BUILD__;
  if (!info) return;
  // Desktop keeps its existing save namespace while running the SAME game bytes.
  if (typeof window.__HOLLOW_WAKE_STORAGE_SCOPE__ !== 'string') {
    window.__HOLLOW_WAKE_STORAGE_SCOPE__ = info.storageScope || '';
  }
  const show = () => {
    const badge = document.createElement('div');
    badge.id = 'game-build-identity';
    badge.dataset.commit = info.commit;
    badge.style.cssText = 'position:fixed;right:12px;bottom:8px;max-width:90vw;padding:5px 9px;z-index:99999;background:#101218e8;color:#c8c8cd;border:1px solid #444653;border-radius:4px;font:12px/1.4 system-ui;pointer-events:auto;user-select:text';
    const branch = info.branch === 'main' ? 'Main' : info.branch;
    const mode = info.local ? 'Local development' : window.__HOLLOW_WAKE_OFFLINE__ ? 'Offline copy' : 'Released';
    const build = info.commit.slice(0, 8) + (info.buildId ? '.' + info.buildId.slice(0, 8) : '');
    badge.textContent = `${branch} · build ${build}${info.dirty ? ' (modified)' : ''} · ${mode}`;
    badge.title = `${info.version}\n${info.branch}\n${info.commit}\n${info.builtAt}${info.buildId ? '\nRelease ' + info.buildId : ''}`;
    document.body.append(badge);
    // Keep the revision legible on menus without covering combat controls.
    const visibility = () => {
      const menu = document.getElementById('start-menu');
      const pause = document.getElementById('escape-menu');
      badge.hidden = !menu || menu.classList.contains('hidden') && (!pause || pause.classList.contains('hidden'));
    };
    new MutationObserver(visibility).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    visibility();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})();
