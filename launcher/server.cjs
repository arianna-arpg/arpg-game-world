// ---------------------------------------------------------------------------
// EMBEDDED GAME SERVER — serves the built game (dist/) to the Electron game
// window over loopback HTTP, and re-implements the Vite disk-save plugin's
// endpoints so saves work IDENTICALLY in dev (vite), preview, and the
// desktop app — same routes, same semantics, same saves/ folder:
//
//   GET  /__save/:slot  → reads  saves/save_<slot>.json   (404 → '{}')
//   POST /__save/:slot  → writes saves/save_<slot>.json   (body IS the save;
//                          parsed as JSON regardless of content-type, because
//                          sendBeacon posts text/plain — see persistence.ts)
//
// Slots are numeric (account/character/settings/roster) or short lowercase
// NAMES for tool stores ('workshop' = the Entity Forge). The slot charset
// (digits, or [a-z][a-z0-9_-]{0,31}) is the path-safety guarantee — no dots,
// no separators, so a slot can never leave savesDir. Keep the regex in
// lockstep with vite.config.ts.
//
// Serving over http://127.0.0.1 (not file://) keeps the game's absolute asset
// paths, same-origin fetch/sendBeacon saves, and WebRTC co-op all working
// with zero changes to game code. The dev-only /__dev/passives endpoint is
// deliberately absent: the passive-tree editor writes SOURCE, which is a dev-
// server concern; in the desktop app the editor's save simply reports failure.
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

/** Content types for everything a vite build can emit (fallback: octet-stream). */
const MIME = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
});

/** Save bodies are whole serialized runs — generous cap, only there so a
 *  runaway client can't balloon memory. The Vite plugin has no cap at all. */
const MAX_SAVE_BYTES = 128 * 1024 * 1024;

/**
 * @param {{ root: string, savesDir: string, host?: string, port?: number }} opts
 *   root — the built game directory (dist/); savesDir — shared saves/ folder.
 * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}
 */
function startGameServer(opts) {
  const root = path.resolve(opts.root);
  const savesDir = path.resolve(opts.savesDir);
  fs.mkdirSync(savesDir, { recursive: true });
  /** @param {string} slot */
  const slotPath = (slot) => path.join(savesDir, `save_${slot}.json`);

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    // --- /__save/:slot — byte-compatible with the Vite disk-save plugin ---
    // (numeric slots or short lowercase names; charset = traversal guard)
    const m = /^\/__save\/(\d+|[a-z][a-z0-9_-]{0,31})(?:\?.*)?$/.exec(url);
    if (m) {
      const file = slotPath(m[1]);
      if (req.method === 'GET') {
        if (!fs.existsSync(file)) { res.statusCode = 404; res.end('{}'); return; }
        res.setHeader('content-type', 'application/json');
        res.end(fs.readFileSync(file, 'utf-8'));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        let size = 0;
        req.on('data', (c) => {
          size += c.length;
          if (size > MAX_SAVE_BYTES) { res.statusCode = 413; res.end('{"ok":false}'); req.destroy(); return; }
          body += c;
        });
        req.on('end', () => {
          if (res.writableEnded) return;
          try { JSON.parse(body); fs.writeFileSync(file, body); res.statusCode = 200; res.end('{"ok":true}'); }
          catch { res.statusCode = 400; res.end('{"ok":false}'); }
        });
        return;
      }
      res.statusCode = 405; res.end();
      return;
    }

    // --- static game files ---
    if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
    let p;
    try { p = decodeURIComponent(url.split('?')[0]); }
    catch { res.statusCode = 400; res.end(); return; }
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(root, p));
    if (file !== root && !file.startsWith(root + path.sep)) { res.statusCode = 403; res.end(); return; }
    let stat;
    try { stat = fs.statSync(file); } catch { res.statusCode = 404; res.end('Not found'); return; }
    if (!stat.isFile()) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('content-type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache'); // dist swaps under us on update
    fs.createReadStream(file).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? 0, opts.host ?? '127.0.0.1', () => {
      const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
      resolve({ server, port: addr.port, url: `http://${opts.host ?? '127.0.0.1'}:${addr.port}/` });
    });
  });
}

module.exports = { startGameServer };
