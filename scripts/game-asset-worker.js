// Only immutable files admitted to the publisher's shared pool use this path.
// Leave entries, catalogs, saves, explicit reloads and partial requests alone.
const assets = new URL('builds/shared-v1/assets/', self.registration.scope);
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode === 'navigate' || request.headers.has('Range')
      || request.headers.has('Cache-Control') || request.headers.has('Pragma')
      || !['default', 'force-cache'].includes(request.cache)) return;
  const url = new URL(request.url);
  if (url.origin !== assets.origin || !url.pathname.startsWith(assets.pathname) || url.search) return;
  event.respondWith(fetch(request, { cache: 'force-cache' }).then(response =>
    response.ok ? response : fetch(request, { cache: 'reload' })));
});
