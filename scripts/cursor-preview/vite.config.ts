import { defineConfig } from 'vite';

// Deliberately omit the game's disk-save and editor plugins. Preview writes
// are refused even if a client accidentally bypasses its in-memory storage.
export default defineConfig({
  cacheDir: 'balance/reports/cursor-preview/vite-cache',
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
  plugins: [{ name: 'cursor-preview-isolation', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/^\/__(save|dev)(\/|\?|$)/.test(req.url ?? '')) {
        res.statusCode = 404; res.end('{}'); return;
      }
      next();
    });
  } }],
});
