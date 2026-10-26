// The browser and desktop resolve the same atomic Pages catalog. The game URL
// remains /play/ (or its preview alias), preserving joining links and bookmarks.
(async () => {
  try {
    const config = window.__HOLLOW_WAKE_RELEASE_LOADER__;
    const catalogUrl = new URL(config.catalog, location.href);
    catalogUrl.searchParams.set('catalog', String(Date.now()));
    const response = await fetch(catalogUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Release catalog unavailable.');
    const catalog = await response.json();
    const entry = catalog.entries?.find(row => row.identity?.branch === config.branch);
    if (catalog.format !== 1 || !entry || !/^[a-f0-9]{24}$/.test(entry.identity.buildId)
        || entry.browser !== `builds/${entry.identity.buildId}/game/index.html`
        || entry.desktop?.path !== `builds/${entry.identity.buildId}/desktop.json.gz`
        || !/^sha256:[a-f0-9]{64}$/.test(entry.desktop.digest)) throw new Error('No complete release is available for this branch.');
    const url = new URL(entry.browser, catalogUrl);
    const game = await fetch(url, { cache: 'no-cache' });
    if (!game.ok) throw new Error('The released game is not available yet. Please reload in a moment.');
    const html = await game.text();
    const meta = /<meta name="hollow-wake-build" content="([a-f0-9]{24})">/.exec(html);
    if (meta?.[1] !== entry.identity.buildId) throw new Error('Release identity mismatch. Please reload.');
    const base = new URL('./', url).href;
    document.open();
    document.write(html.replace('<head>', `<head><base href="${base}">`));
    document.close();
  } catch (error) {
    document.getElementById('release-status').textContent = String(error.message || error);
  }
})();
