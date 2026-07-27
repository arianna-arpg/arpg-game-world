// ---------------------------------------------------------------------------
// Vite config — adds a DISK-SAVE plugin so the game can persist to real files
// in <project>/saves/ (survives the browser AND the dev server closing). The
// client write-throughs to localStorage too, and falls back to it if these
// endpoints are absent (e.g. a static production host with no plugin).
//
//   GET  /__save/:slot  → reads  saves/save_<slot>.json   (404 → '{}')
//   POST /__save/:slot  → writes saves/save_<slot>.json   (body IS the save)
//
// Slot 0 = account, 1 = character, 2 = settings; short lowercase NAMES are
// tool stores ('workshop' = the Entity Forge). The slot charset (digits, or
// [a-z][a-z0-9_-]{0,31}) is the path-safety guarantee — no dots, no
// separators, so a slot can never escape saves/. Keep the regex in lockstep
// with launcher/server.cjs. The plugin is schema-blind: the body is the
// client's serialized save, stored verbatim.
// ---------------------------------------------------------------------------

import { defineConfig } from 'vite';
import type { Connect, HmrContext, ViteDevServer, PreviewServer } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// ---------------------------------------------------------------------------
// THE RELOAD TREES — source trees that may NEVER take a partial HMR update.
//
// src/engine holds LONG-LIVED CLASS INSTANCES (the live `World`, its actors,
// the zone graph) and src/data holds the registries those instances close
// over. A partial accept re-evaluates the module — minting a NEW class object
// — while the already-constructed instance keeps its PRE-EDIT prototype: the
// next call throws `<method> is not a function` (e.g. `this.groundInsured is
// not a function`) and the run is wedged. The page keeps painting; the world
// is dead, and the QA session has to be restarted.
//
// So: a change under any of these prefixes forces a FULL PAGE RELOAD and the
// hook returns an empty module list, so Vite never attempts propagation for
// these trees at all. Every other tree (src/ui, src/render, …) is left
// untouched — whatever Vite decided for it before, it still decides (in
// practice usually its own full reload, since nothing in src/ accepts).
//
// This is the cheap MITIGATION. Why the partial accept happens at all — no
// module in src/ calls `import.meta.hot.accept`, so this is entirely Vite's
// default propagation — is a separate, unsolved question.
//
// Prefixes are project-root-relative, posix-separated (the tested path is
// normalized first — this is a Windows repo and `ctx.file` arrives with
// backslashes). ONE declared table, tested at the hook; never inline string
// comparisons scattered through the config.
// ---------------------------------------------------------------------------
const HMR_FULL_RELOAD_PREFIXES: readonly string[] = ['src/engine/', 'src/data/'];

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
    // Numeric slots OR short lowercase names — the charset IS the traversal
    // guard (mirrored in launcher/server.cjs; keep in lockstep).
    const m = /^\/__save\/(\d+|[a-z][a-z0-9_-]{0,31})(?:\?.*)?$/.exec(url);
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

// Forces a full page reload for edits under HMR_FULL_RELOAD_PREFIXES (see the
// table's comment for why). Dev-only by nature: `handleHotUpdate` never runs
// during a build or preview.
function reloadTreesPlugin() {
  return {
    name: 'hmr-full-reload-trees',
    handleHotUpdate(ctx: HmrContext): [] | undefined {
      // ctx.file is absolute and, on Windows, backslash-separated — fold both
      // to the posix shape the prefix table is written in.
      const rel = relative(ctx.server.config.root, ctx.file).replace(/\\/g, '/');
      if (!HMR_FULL_RELOAD_PREFIXES.some((p) => rel.startsWith(p))) return undefined;
      ctx.server.ws.send({ type: 'full-reload' });
      ctx.server.config.logger.info(`page reload ${rel} (reload tree — no partial HMR)`, { timestamp: true });
      return []; // no modules handed back → Vite skips partial propagation entirely
    },
  };
}

export default defineConfig({
  plugins: [diskSavePlugin(), reloadTreesPlugin()],
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
