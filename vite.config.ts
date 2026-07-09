// ---------------------------------------------------------------------------
// Vite config — adds a DISK-SAVE plugin so the game can persist to real files
// in <project>/saves/ (survives the browser AND the dev server closing). The
// client write-throughs to localStorage too, and falls back to it if these
// endpoints are absent (e.g. a static production host with no plugin).
//
//   GET  /__save/:slot  → reads  saves/save_<slot>.json   (404 → '{}')
//   POST /__save/:slot  → writes saves/save_<slot>.json   (body IS the save)
//
// Slot 0 = account, 1 = character, 2 = settings. The plugin is schema-blind:
// the body is the client's serialized save, stored verbatim.
// ---------------------------------------------------------------------------

import { defineConfig } from 'vite';
import type { Connect, ViteDevServer, PreviewServer } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function diskSavePlugin() {
  const dir = join(process.cwd(), 'saves');
  const slotPath = (slot: string): string => join(dir, `save_${slot}.json`);

  // DEV-only: the passive-tree editor writes the regenerated tree source back to
  // src/data/passives.ts (backing up the prior file to passives.ts.bak first).
  const passivesFile = join(process.cwd(), 'src', 'data', 'passives.ts');
  const devPassivesHandler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    if (!/^\/__dev\/passives(?:\?.*)?$/.test(url)) { next(); return; }
    if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      // Sanity-guard: only accept something that looks like the tree source, so a
      // stray/empty POST can't blank the file.
      if (body.length < 200 || !body.includes('PASSIVE_NODES') || !body.includes('const nodes')) {
        res.statusCode = 400; res.end('{"ok":false,"error":"body does not look like passives.ts"}'); return;
      }
      try {
        if (existsSync(passivesFile)) writeFileSync(passivesFile + '.bak', readFileSync(passivesFile, 'utf-8'));
        writeFileSync(passivesFile, body);
        res.statusCode = 200; res.end('{"ok":true}');
      } catch (e) {
        res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
  };

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    const m = /^\/__save\/(\d+)(?:\?.*)?$/.exec(url);
    if (!m) { next(); return; }
    const file = slotPath(m[1]);
    if (req.method === 'GET') {
      if (!existsSync(file)) { res.statusCode = 404; res.end('{}'); return; }
      res.setHeader('content-type', 'application/json');
      res.end(readFileSync(file, 'utf-8'));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try { JSON.parse(body); writeFileSync(file, body); res.statusCode = 200; res.end('{"ok":true}'); }
        catch { res.statusCode = 400; res.end('{"ok":false}'); }
      });
      return;
    }
    res.statusCode = 405; res.end();
  };

  const ensure = (): void => { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); };

  return {
    name: 'disk-save',
    configureServer(server: ViteDevServer) { ensure(); server.middlewares.use(devPassivesHandler); server.middlewares.use(handler); },
    configurePreviewServer(server: PreviewServer) { ensure(); server.middlewares.use(devPassivesHandler); server.middlewares.use(handler); },
  };
}

export default defineConfig({
  plugins: [diskSavePlugin()],
  // saves/ writes are DATA, not source — without this ignore, every zone-hop's
  // autosave tripped the watcher into a FULL RELOAD (killing the live world
  // mid-play and mid-QA; the long-standing "reload ate my test" gotcha).
  server: {
    watch: { ignored: ['**/saves/**', '**/*.bak'] },
    // Enables the JS Self-Profiling API (`new Profiler(...)`) in dev — the
    // sampling profiler perf passes lean on; inert for normal play.
    headers: { 'Document-Policy': 'js-profiling' },
  },
});
