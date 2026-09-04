// ---------------------------------------------------------------------------
// THE ATLAS — dev-authored MAPS as data (the Map Forge's store).
//
// Editor-authored AuthoredMapDefs live OUTSIDE the source tree as one JSON
// document, hybrid-persisted exactly like the Workshop (a synchronous
// localStorage mirror + the /__save disk lane's named 'atlas' slot →
// saves/save_atlas.json), and are GRAFTED into the live AUTHORED_MAPS
// registry at boot — BEFORE validateContent() — so an atlas map is linted,
// minted, generated and walked through EXACTLY the fabric shipped maps ride.
// Nothing anywhere special-cases an atlas map: the 'authored' layout resolves
// its map by id re-lookup at generation time, so registration is the whole
// trick (and an edit shows on the next zone load).
//
// THE NAMESPACE LAW (the Workshop's, shared): every atlas id starts with
// 'custom_' — a graft may create or replace ONLY prefixed ids, so no
// authoring session can shadow a shipped map, and shipped maps never claim
// the prefix (findAtlasSquatters pins the other half).
//
// PROMOTION: serializeMapTS() emits the map as a TypeScript literal in
// data/authoredMaps.ts' house style plus a ready QuestZoneSpec snippet —
// the atlas is the sketchbook; the source tree stays the authored roster.
//
// A save referencing a deleted atlas map degrades honestly: the zone
// re-mints as the dress tileset's plains scatter with one warning (the
// unregistered-layout law) — deletion is always safe.
// ---------------------------------------------------------------------------

import {
  AUTHORED_MAPS, registerAuthoredMap, unregisterAuthoredMap, validateAuthoredMap,
  type AuthoredMapDef,
} from '../engine/authoredMaps';
import { WORKSHOP_PREFIX } from './workshop';
import { diskGet, diskPut } from './persistence';

export const ATLAS_PREFIX = WORKSHOP_PREFIX;
export const ATLAS_SLOT = 'atlas';
const KEY = 'arpg_atlas_v1';
const SCHEMA_VERSION = 1;

export interface AtlasSave {
  schemaVersion: number;
  maps: AuthoredMapDef[];
}

/** The live list — the Forge reads and mutates it, then persists via
 *  upsert/remove (which graft + save). Never reassigned; shared-ref safe. */
export const atlas: { maps: AuthoredMapDef[] } = { maps: [] };

export function isAtlasId(id: string): boolean {
  return id.startsWith(ATLAS_PREFIX);
}

export function atlasMap(id: string): AuthoredMapDef | undefined {
  return atlas.maps.find(m => m.id === id);
}

/** Deep-detach plain data (maps are JSON by construction). */
export function cloneMap<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// --- registry graft -----------------------------------------------------------

/** The structural shape gate — what a row must be to graft at all (the
 *  content lint judges the rest: validateAuthoredMap). */
function wellFormed(m: unknown): m is AuthoredMapDef {
  const x = m as AuthoredMapDef | null;
  return !!x && typeof x === 'object'
    && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.tileset === 'string'
    && Number.isInteger(x.cols) && Number.isInteger(x.rows) && x.cols > 0 && x.rows > 0
    && Array.isArray(x.grid) && x.grid.every(r => typeof r === 'string');
}

/** Graft one map into the live registry. Enforces THE NAMESPACE LAW and the
 *  shape gate. Returns an error string, or null on success. */
export function graftAtlasMap(m: AuthoredMapDef): string | null {
  const id = m?.id ?? '';
  if (!isAtlasId(id)) return `atlas id must start with '${ATLAS_PREFIX}' (got '${id || '<empty>'}')`;
  if (!wellFormed(m)) return 'map is malformed (id/name/tileset/cols/rows/grid)';
  registerAuthoredMap(m);
  return null;
}

/** Remove an atlas id from the live registry (prefix-guarded — shipped maps
 *  are untouchable through this seam by construction). */
export function ungraftAtlasId(id: string): void {
  if (!isAtlasId(id)) return;
  unregisterAuthoredMap(id);
}

function graftAll(maps: AuthoredMapDef[]): void {
  for (const m of atlas.maps) {
    if (!maps.some(x => x.id === m.id)) ungraftAtlasId(m.id);
  }
  atlas.maps = maps.slice();
  atlas.maps.forEach(m => graftAtlasMap(m));
}

// --- persistence (the account pattern: sync mirror + async disk authority) ----

/** Pure save-shape gate (exported for probes/importers): rows filtered per
 *  the law — malformed or unprefixed rows drop, the rest stand. */
export function parseAtlasSave(s: unknown): AuthoredMapDef[] | null {
  const save = s as AtlasSave | null;
  if (!save || !Array.isArray(save.maps)) return null;
  if (save.schemaVersion !== SCHEMA_VERSION) return null;
  return save.maps.filter(m => wellFormed(m) && isAtlasId(m.id));
}

function serialize(): string {
  const save: AtlasSave = { schemaVersion: SCHEMA_VERSION, maps: atlas.maps };
  return JSON.stringify(save);
}

/** Persist to both stores (fire-and-forget disk; the mirror is the sync truth). */
export function saveAtlas(): void {
  const body = serialize();
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  diskPut(ATLAS_SLOT, body);
}

/** Boot (sync): localStorage mirror → registry. Call BEFORE validateContent()
 *  so atlas maps ride the same one boot lint as shipped content. */
export function loadAtlasSync(): void {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(KEY); } catch { return; }
  if (!raw) return;
  try {
    const maps = parseAtlasSave(JSON.parse(raw));
    if (maps) graftAll(maps);
  } catch { /* corrupt mirror — the disk reconcile may still restore */ }
}

/** Boot (async): the disk file is the cross-session authority — when it
 *  differs from the mirror, adopt it, re-graft, warm the mirror. Returns
 *  true when anything changed (caller decides re-lint). */
export async function reconcileAtlasFromDisk(): Promise<boolean> {
  const raw = await diskGet<AtlasSave>(ATLAS_SLOT);
  if (!raw) return false;
  const maps = parseAtlasSave(raw);
  if (!maps) return false;
  if (JSON.stringify(maps) === JSON.stringify(atlas.maps)) return false;
  graftAll(maps);
  try { window.localStorage.setItem(KEY, serialize()); } catch { /* ignore */ }
  return true;
}

// --- editor mutations -------------------------------------------------------------

/** Insert or replace by id: graft live, store, persist. Returns an error
 *  string, or null on success. */
export function upsertAtlasMap(m: AuthoredMapDef): string | null {
  const err = graftAtlasMap(m);
  if (err) return err;
  const i = atlas.maps.findIndex(x => x.id === m.id);
  if (i >= 0) atlas.maps[i] = m; else atlas.maps.push(m);
  saveAtlas();
  return null;
}

/** Delete by id: un-graft, drop, persist. */
export function removeAtlasMap(id: string): boolean {
  const i = atlas.maps.findIndex(x => x.id === id);
  if (i < 0) return false;
  atlas.maps.splice(i, 1);
  ungraftAtlasId(id);
  saveAtlas();
  return true;
}

/** The namespace law's other half, exposed for the probe: every prefixed id
 *  in AUTHORED_MAPS must be a grafted atlas row. */
export function findAtlasSquatters(): string[] {
  return Object.keys(AUTHORED_MAPS).filter(id => isAtlasId(id) && !atlas.maps.some(m => m.id === id));
}

/** The lint every atlas row answers (the same lines shipped rows print at boot). */
export function lintAtlasMap(m: AuthoredMapDef): string[] {
  return validateAuthoredMap(m);
}

// --- PROMOTION: atlas → source (TypeScript literal emission) ------------------------

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function tsKey(k: string): string {
  return IDENT.test(k) ? k : `'${k.replace(/'/g, "\\'")}'`;
}

function tsStr(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

/** Emit plain data as a TypeScript literal — single quotes, unquoted
 *  identifier keys, short arrays/objects inline, 2-space nesting. The
 *  `grid` rows always print one per line (the map's readable face). */
function tsVal(v: unknown, indent: string, key = ''): string {
  if (v === null || v === undefined) return 'undefined';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return tsStr(v);
  const deeper = indent + '  ';
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map(x => tsVal(x, deeper));
    const inline = `[${items.join(', ')}]`;
    if (key !== 'grid' && inline.length <= 72 && !inline.includes('\n')) return inline;
    return `[\n${items.map(s => deeper + s).join(',\n')},\n${indent}]`;
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const entries = Object.keys(o).filter(k => o[k] !== undefined)
      .map(k => `${tsKey(k)}: ${tsVal(o[k], deeper, k)}`);
    if (entries.length === 0) return '{}';
    const inline = `{ ${entries.join(', ')} }`;
    if (inline.length <= 72 && !inline.includes('\n')) return inline;
    return `{\n${entries.map(s => deeper + s).join(',\n')},\n${indent}}`;
  }
  return 'undefined';
}

/** The promotion text: the map literal (paste into data/authoredMaps.ts and
 *  add it to AUTHORED_MAP_LIST), a ready QuestZoneSpec snippet, and the
 *  bounty note. Ids keep the 'custom_' prefix — renaming it off is part of
 *  the deliberate promotion act, never automated. */
export function serializeMapTS(m: AuthoredMapDef): string {
  const constName = m.id.replace(/^custom_/, '').replace(/[^a-z0-9]+/gi, '_').toUpperCase() || 'MAP';
  const bar = '-'.repeat(Math.max(8, 58 - m.id.length));
  const objective = m.objective ?? { kind: 'clear' };
  const out: string[] = [
    `// --- ATLAS EXPORT: ${m.id} ${bar}`,
    '// MAP — paste into src/data/authoredMaps.ts and add it to AUTHORED_MAP_LIST',
    "// (renaming the 'custom_' prefix off is part of the deliberate promotion act):",
    `export const ${constName}: AuthoredMapDef = ${tsVal(cloneMap(m), '')};`,
    '',
    '// QUEST — a QuestZoneSpec naming this map (src/quests/defs.ts; the quest\'s',
    '// explicit fields win over the map\'s, undefined ones defer to it):',
    `//   zone: { map: ${tsStr(m.id)}, direction: 'n', level: 'character', objective: ${tsVal(objective, '//   ')}, forceWaypoint: true },`,
  ];
  if (m.bounty) {
    out.push('', `// BOUNTY — this map carries an expedition block: the board posts it to players`,
      `// of level ${m.bounty.level[0]}..${m.bounty.level[1]} once the map is registered (data/bountyExpeditions.ts).`);
  } else {
    out.push('', '// BOUNTY — add a `bounty: { level: [lo, hi], title, ask }` block to let the board post it.');
  }
  return out.join('\n');
}
