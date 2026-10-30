/** Exact unchanged save-authority files and bounded transport preimages. */
export const nativeSaveWriteOrderArchive={
  "parentManifest": "C:\\Users\\John\\.codex\\worktrees\\seamless-world\\ARPG Game - World\\.claude\\native-client-continue-phase48.local.work/FROZEN-MANIFEST.json",
  "parentSha256": "0baba21220276ed5dc8ee3baae0dac3f954d3f6288264b371bd89b5b3f973eaf",
  "scope": "Only transport URL ordering + shared endpoint commit guard. Save-body, character lease/account/slot and serialized schema files are unchanged from parent.",
  "files": [
    {
      "file": "src/meta/persistence.ts",
      "beforeSha256": "4cbe338054ef6d06cd7160be68a3eeb4ea8db9ed4a57e4e097205a204fdaa7a4",
      "afterSha256": "3a90cbd6875da213a0f50d51f4d8bc4a9662aab1003612a405b553247988acaf",
      "hunks": [
        {
          "before": "export function diskPut(slot: SaveSlot, body: string): void {\n  if (saveRefused(`disk slot ${slot}`)) return; // the stand-down's structural backstop\n  void diskPutRaw(slot, body);\n}\n\n/** AWAITED, latch-FREE disk write — the save-import lane's primitive\n *  (meta/portage.ts): import stands the ordinary writers down FIRST\n *  (suppressSaves, so a mid-import autosave can't clobber the incoming\n *  slots), then lands the imported bodies through this — and the caller\n *  awaits every write before reloading, else the disk-first loader would\n *  resurrect the pre-import state from a POST the reload dropped. Nothing\n *  else should route here: the stand-down latch exists for a reason. */\nexport function diskPutRaw(slot: SaveSlot, body: string): Promise<void> {\n  if (BUILD_PROFILE.storageScope) return Promise.resolve();\n  return fetch(`/__save/${slot}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })\n    .then(() => undefined)\n    .catch(() => { /* endpoint absent — localStorage is the fallback */ });\n}\n\n/** DURABLE disk write for writes that must survive the tab closing immediately\n *  (the PERMADEATH wipe — a fire-and-forget fetch can be dropped mid-flight when\n *  the player closes the game on the death screen, and the disk-first loader\n *  would then resurrect the dead character). sendBeacon is queued by the browser\n *  and flushed even on unload; we fall back to the plain POST when it's absent. */\nexport function diskBeacon(slot: SaveSlot, body: string): void {\n  if (BUILD_PROFILE.storageScope) return;\n  if (saveRefused(`disk slot ${slot}`)) return; // stand-down: the durable lane refuses too\n  try {\n    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {\n      // A string body is sent as text/plain; the middleware JSON.parses it\n      // regardless of content-type, so '{}' lands correctly.\n      if (navigator.sendBeacon(`/__save/${slot}`, body)) return;\n    }\n  } catch { /* fall through to the fetch path */ }\n  diskPut(slot, body);\n}\n\n// --- ACCOUNT ----------------------------------------------------------------\n\n/** THE IDENTITY (accountId): the id the synchronous boot load minted IN\n",
          "after": "export function diskPut(slot: SaveSlot, body: string): void {\n  if (saveRefused(`disk slot ${slot}`)) return; // the stand-down's structural backstop\n  void diskPutRaw(slot, body);\n}\n\n// One page identity and one sequence per slot cover both fetch and beacon.\n// They do not claim authority over another page/session or change save bytes.\nlet diskWriter: string | undefined;\nconst diskSequences = new Map<string, number>();\nfunction orderedSaveUrl(slot: SaveSlot): string {\n  if (!diskWriter) diskWriter = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');\n  const key = String(slot), sequence = (diskSequences.get(key) ?? 0) + 1;\n  if (!Number.isSafeInteger(sequence)) throw Error('Save write sequence exhausted');\n  diskSequences.set(key, sequence);\n  return `/__save/${slot}?writer=${diskWriter}&sequence=${sequence}`;\n}\nfunction postDiskSave(url: string, body: string): Promise<void> {\n  try {\n    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })\n      .then(() => undefined)\n      .catch(() => { /* endpoint absent — localStorage is the fallback */ });\n  } catch { return Promise.resolve(); }\n}\n/** AWAITED, latch-FREE disk write — the save-import lane's primitive\n *  (meta/portage.ts): import stands the ordinary writers down FIRST\n *  (suppressSaves, so a mid-import autosave can't clobber the incoming\n *  slots), then lands the imported bodies through this — and the caller\n *  awaits every write before reloading, else the disk-first loader would\n *  resurrect the pre-import state from a POST the reload dropped. Nothing\n *  else should route here: the stand-down latch exists for a reason. */\nexport function diskPutRaw(slot: SaveSlot, body: string): Promise<void> {\n  if (BUILD_PROFILE.storageScope) return Promise.resolve();\n  try { return postDiskSave(orderedSaveUrl(slot), body); }\n  catch { return Promise.resolve(); } // keep the established no-throw disk boundary\n}\n\n/** DURABLE disk write: its sequence is selected before sendBeacon, so a late\n * older fetch cannot overwrite a newer unload write. A rejected beacon falls\n * back to fetch with the same sequence and body. */\nexport function diskBeacon(slot: SaveSlot, body: string): void {\n  if (BUILD_PROFILE.storageScope) return;\n  if (saveRefused(`disk slot ${slot}`)) return;\n  let url: string;\n  try { url = orderedSaveUrl(slot); } catch { return; }\n  try {\n    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {\n      if (navigator.sendBeacon(url, body)) return;\n    }\n  } catch { /* fall through with the exact selected write */ }\n  void postDiskSave(url, body);\n}\n\n// --- ACCOUNT ----------------------------------------------------------------\n\n/** THE IDENTITY (accountId): the id the synchronous boot load minted IN\n"
        }
      ]
    },
    {
      "file": "launcher/server.cjs",
      "beforeSha256": "8f846fd74b33ac3824b936de1024ca590e05057dd791351615cd4cbfd05fcf89",
      "afterSha256": "272a2fd428424eb652fc7a50e4b3ff95416ae150fccf18264a4ecd0f0e3e51d7",
      "hunks": [
        {
          "before": "'use strict';\n\nconst http = require('node:http');\nconst fs = require('node:fs');\nconst path = require('node:path');\n\n/** Content types for everything a vite build can emit (fallback: octet-stream). */\nconst MIME = /** @type {Record<string, string>} */ ({\n  '.html': 'text/html; charset=utf-8',\n  '.js': 'text/javascript',\n",
          "after": "'use strict';\n\nconst http = require('node:http');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst {createSaveWriteOrder} = require('./saveWriteOrder.cjs');\n\n/** Content types for everything a vite build can emit (fallback: octet-stream). */\nconst MIME = /** @type {Record<string, string>} */ ({\n  '.html': 'text/html; charset=utf-8',\n  '.js': 'text/javascript',\n"
        },
        {
          "before": " * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}\n */\nfunction startGameServer(opts) {\n  const root = path.resolve(opts.root);\n  const savesDir = path.resolve(opts.savesDir);\n  fs.mkdirSync(savesDir, { recursive: true });\n  /** @param {string} slot */\n  const slotPath = (slot) => path.join(savesDir, `save_${slot}.json`);\n\n  const server = http.createServer((req, res) => {\n",
          "after": " * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}\n */\nfunction startGameServer(opts) {\n  const root = path.resolve(opts.root);\n  const savesDir = path.resolve(opts.savesDir);\n  const saveWriteOrder = createSaveWriteOrder();\n  fs.mkdirSync(savesDir, { recursive: true });\n  /** @param {string} slot */\n  const slotPath = (slot) => path.join(savesDir, `save_${slot}.json`);\n\n  const server = http.createServer((req, res) => {\n"
        },
        {
          "before": "        res.setHeader('content-type', 'application/json');\n        res.end(fs.readFileSync(file, 'utf-8'));\n        return;\n      }\n      if (req.method === 'POST') {\n        let body = '';\n        let size = 0;\n        req.on('data', (c) => {\n          size += c.length;\n          if (size > MAX_SAVE_BYTES) { res.statusCode = 413; res.end('{\"ok\":false}'); req.destroy(); return; }\n          body += c;\n        });\n        req.on('end', () => {\n          if (res.writableEnded) return;\n          try { JSON.parse(body); fs.writeFileSync(file, body); res.statusCode = 200; res.end('{\"ok\":true}'); }\n          catch { res.statusCode = 400; res.end('{\"ok\":false}'); }\n        });\n        return;\n      }\n      res.statusCode = 405; res.end();\n",
          "after": "        res.setHeader('content-type', 'application/json');\n        res.end(fs.readFileSync(file, 'utf-8'));\n        return;\n      }\n      if (req.method === 'POST') {\n        let selected;\n        try { selected = saveWriteOrder.select(m[1], url); }\n        catch { res.statusCode = 400; res.end('{\"ok\":false}'); return; }\n        let body = '';\n        let size = 0;\n        req.on('data', (c) => {\n          size += c.length;\n          if (size > MAX_SAVE_BYTES) { res.statusCode = 413; res.end('{\"ok\":false}'); req.destroy(); return; }\n          body += c;\n        });\n        req.on('end', () => {\n          if (res.writableEnded) return;\n          try { JSON.parse(body); const written = saveWriteOrder.commit(selected, () => fs.writeFileSync(file, body)); res.statusCode = 200; res.end(JSON.stringify({ok:true, written})); }\n          catch { res.statusCode = 400; res.end('{\"ok\":false}'); }\n        });\n        return;\n      }\n      res.statusCode = 405; res.end();\n"
        }
      ]
    },
    {
      "file": "vite.config.ts",
      "beforeSha256": "12ab911a9038a20ea326fef40e202f18f1de49b45104592f9374509fbf90a196",
      "afterSha256": "f3bbdda1675707b378ee97201d729a66321f3b641ee77bff9908280959fd8ee1",
      "hunks": [
        {
          "before": "// with launcher/server.cjs. The plugin is schema-blind: the body is the\n// client's serialized save, stored verbatim.\n// ---------------------------------------------------------------------------\n\nimport { defineConfig } from 'vite';\nimport { loadingFramePlugin } from './scripts/loading-frame-plugin';\nimport type { Connect, HmrContext, ViteDevServer, PreviewServer } from 'vite';\nimport { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';\nimport { join, relative } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n",
          "after": "// with launcher/server.cjs. The plugin is schema-blind: the body is the\n// client's serialized save, stored verbatim.\n// ---------------------------------------------------------------------------\n\nimport { defineConfig } from 'vite';\nimport {createSaveWriteOrder} from './launcher/saveWriteOrder.cjs';\nimport { loadingFramePlugin } from './scripts/loading-frame-plugin';\nimport type { Connect, HmrContext, ViteDevServer, PreviewServer } from 'vite';\nimport { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';\nimport { join, relative } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n"
        },
        {
          "before": "// comparisons scattered through the config.\n// ---------------------------------------------------------------------------\nconst HMR_FULL_RELOAD_PREFIXES: readonly string[] = ['src/engine/', 'src/data/'];\n\nfunction diskSavePlugin() {\n  const dir = join(process.cwd(), 'saves');\n  const slotPath = (slot: string): string => join(dir, `save_${slot}.json`);\n\n  // DEV-only: the passive-tree editor writes the regenerated tree source back to\n  // src/data/passives.ts (backing up the prior file to passives.ts.bak first).\n",
          "after": "// comparisons scattered through the config.\n// ---------------------------------------------------------------------------\nconst HMR_FULL_RELOAD_PREFIXES: readonly string[] = ['src/engine/', 'src/data/'];\n\nfunction diskSavePlugin() {\n  const saveWriteOrder = createSaveWriteOrder();\n  const dir = join(process.cwd(), 'saves');\n  const slotPath = (slot: string): string => join(dir, `save_${slot}.json`);\n\n  // DEV-only: the passive-tree editor writes the regenerated tree source back to\n  // src/data/passives.ts (backing up the prior file to passives.ts.bak first).\n"
        },
        {
          "before": "      res.setHeader('content-type', 'application/json');\n      res.end(readFileSync(file, 'utf-8'));\n      return;\n    }\n    if (req.method === 'POST') {\n      let body = '';\n      req.on('data', (c) => { body += c; });\n      req.on('end', () => {\n        try { JSON.parse(body); writeFileSync(file, body); res.statusCode = 200; res.end('{\"ok\":true}'); }\n        catch { res.statusCode = 400; res.end('{\"ok\":false}'); }\n      });\n      return;\n    }\n    res.statusCode = 405; res.end();\n",
          "after": "      res.setHeader('content-type', 'application/json');\n      res.end(readFileSync(file, 'utf-8'));\n      return;\n    }\n    if (req.method === 'POST') {\n      let selected;\n      try { selected = saveWriteOrder.select(m[1], url); }\n      catch { res.statusCode = 400; res.end('{\"ok\":false}'); return; }\n      let body = '';\n      req.on('data', (c) => { body += c; });\n      req.on('end', () => {\n        try { JSON.parse(body); const written = saveWriteOrder.commit(selected, () => writeFileSync(file, body)); res.statusCode = 200; res.end(JSON.stringify({ok:true, written})); }\n        catch { res.statusCode = 400; res.end('{\"ok\":false}'); }\n      });\n      return;\n    }\n    res.statusCode = 405; res.end();\n"
        }
      ]
    }
  ],
  "newFile": {
    "file": "launcher/saveWriteOrder.cjs",
    "sha256": "9b2b1b28cb3d69b3c8fd4f8ab4610e9d3b6e3f3a1fe6ba5b9fac696bf3fae2bf"
  },
  "unchanged": [
    {
      "file": "src/meta/character.ts",
      "sha256": "23ec93702c614dcb79c19f546e2d28c36c5cf2c6dc7f82dd35ad7c8fa4d11baf"
    },
    {
      "file": "src/meta/characterResume.ts",
      "sha256": "2a823bceff27d4754ac50692f3dd10c06868380a2dea3413f4415178dd8d3304"
    },
    {
      "file": "src/meta/portage.ts",
      "sha256": "2dec6b606c542730d9ecf29ba88e2356eeaaf1651ec7a51756bf4a37e717fe11"
    },
    {
      "file": "src/meta/worldstate.ts",
      "sha256": "18a2e529a85a8b7e66e622534800b13d7bebcab2b24d6f95379c140539c5f5d6"
    },
    {
      "file": "src/worldmass/nativeRetainedSave.ts",
      "sha256": "0b94eb8da795274a91633645b2de42d650ac1424fa1f577fc77c59e64cc7a885"
    }
  ]
};
