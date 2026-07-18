// ---------------------------------------------------------------------------
// THE WORKSHOP — dev-authored entities as data (the Entity Forge's store).
//
// Editor-authored MonsterDefs (each optionally carrying its own composed
// LookDef) live OUTSIDE the source tree as one JSON document, hybrid-persisted
// exactly like the account (a synchronous localStorage mirror + the /__save
// disk lane's named 'workshop' slot → saves/save_workshop.json), and are
// GRAFTED into the live MONSTERS/LOOKS registries at boot — BEFORE
// validateContent() — so a workshop def is linted, spawned, portrait-drawn
// and fought through EXACTLY the fabric shipped content rides. Nothing
// anywhere special-cases a workshop def: the engine resolves defs by id
// re-lookup, so registration is the whole trick.
//
// THE NAMESPACE LAW: every workshop id starts with 'custom_'. A graft may
// create or replace ONLY ids under the prefix — no authoring session can ever
// shadow shipped content (the registerFactions collision stance, sharpened:
// shipped ids REFUSE, workshop ids REPLACE-BY-ID). The other half of the law
// (shipped content never claims the prefix) is pinned by probe_workshop.
//
// PROMOTION: serializeEntityTS() emits the def (+ look) as TypeScript
// literals in the data files' house style for deliberate hand-promotion into
// src/data — the workshop is the sketchbook; the source tree stays the
// authored roster. (The passive editor's whole-file rewrite lane is wrong
// here: monsters.ts is 11k hand-authored lines, not an editor-owned file.)
//
// A stale character save referencing a deleted workshop id simply skips that
// spawn (createMonster guards MONSTERS[id]) — deletion is always safe.
// ---------------------------------------------------------------------------

import { MONSTERS, type MonsterDef } from '../data/monsters';
import { LOOKS } from '../data/looks';
import type { LookDef } from '../render/vis/parts';
import { clearBakes } from '../render/vis/sprites';
import { diskGet, diskPut } from './persistence';

export const WORKSHOP_PREFIX = 'custom_';
export const WORKSHOP_SLOT = 'workshop';
const KEY = 'arpg_workshop_v1';
const SCHEMA_VERSION = 1;

export interface WorkshopEntity {
  def: MonsterDef;
  /** The entity's own composed look — registered in LOOKS under the def's id
   *  (graft keeps def.look pointed there). Absent = the def wears an authored
   *  look id (def.look) or the legacy shape silhouette. */
  look?: LookDef;
}

export interface WorkshopSave {
  schemaVersion: number;
  entities: WorkshopEntity[];
}

/** The live list — the Forge reads and mutates this, then persists via
 *  upsert/remove (which graft + save). Never reassigned; shared-ref safe. */
export const workshop: { entities: WorkshopEntity[] } = { entities: [] };

export function isWorkshopId(id: string): boolean {
  return id.startsWith(WORKSHOP_PREFIX);
}

export function workshopEntity(id: string): WorkshopEntity | undefined {
  return workshop.entities.find(e => e.def.id === id);
}

/** Deep-detach plain data (defs are JSON-safe by construction — Modifier,
 *  BrainDef, WormSpec etc. are all literal data). The store never shares an
 *  object graph with the editor's working copy. */
export function cloneData<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// --- registry graft ---------------------------------------------------------

/** Graft one entity into the live registries. Enforces the NAMESPACE LAW and
 *  keeps the def↔look invariant (a composed look is worn under the def's own
 *  id). Returns an error string, or null on success. */
export function graftWorkshopEntity(e: WorkshopEntity): string | null {
  const id = e.def?.id ?? '';
  if (!isWorkshopId(id)) return `workshop id must start with '${WORKSHOP_PREFIX}' (got '${id || '<empty>'}')`;
  if (e.def.name === undefined || e.def.name === '') return 'entity needs a name';
  if (e.look) {
    LOOKS[id] = e.look;
    e.def.look = id;
  } else if (e.def.look === id) {
    // The def pointed at its own composed look, since removed — clear both.
    delete LOOKS[id];
    e.def.look = undefined;
  }
  MONSTERS[id] = e.def;
  return null;
}

/** Remove a workshop id from the live registries (prefix-guarded — shipped
 *  content is untouchable through this seam by construction). */
export function ungraftWorkshopId(id: string): void {
  if (!isWorkshopId(id)) return;
  delete MONSTERS[id];
  delete LOOKS[id];
}

/** Replace the whole grafted population with `entities` (boot + disk
 *  reconcile): un-graft dropped ids, graft the incoming set. */
function graftAll(entities: WorkshopEntity[]): void {
  for (const e of workshop.entities) {
    if (!entities.some(x => x.def.id === e.def.id)) ungraftWorkshopId(e.def.id);
  }
  workshop.entities = entities.slice();
  workshop.entities.forEach(e => graftWorkshopEntity(e));
}

// --- persistence (the account pattern: sync mirror + async disk authority) --

/** Pure save-shape gate (exported for probes/importers): schemaVersion must
 *  match, rows must be well-formed AND law-abiding — anything else is null /
 *  dropped (wipe-on-mismatch, the persistence house rule). */
export function parseWorkshopSave(s: unknown): WorkshopEntity[] | null {
  const save = s as WorkshopSave | null;
  if (!save || save.schemaVersion !== SCHEMA_VERSION || !Array.isArray(save.entities)) return null;
  // Wipe-on-mismatch per row: only well-formed, law-abiding rows survive.
  return save.entities.filter(e => e && e.def && typeof e.def.id === 'string' && isWorkshopId(e.def.id));
}

function serialize(): string {
  const save: WorkshopSave = { schemaVersion: SCHEMA_VERSION, entities: workshop.entities };
  return JSON.stringify(save);
}

/** Persist to both stores (fire-and-forget disk; the mirror is the sync truth). */
export function saveWorkshop(): void {
  const body = serialize();
  try { window.localStorage.setItem(KEY, body); } catch { /* ignore */ }
  diskPut(WORKSHOP_SLOT, body);
}

/** Boot (sync): localStorage mirror → registries. Call BEFORE validateContent()
 *  so workshop defs ride the same one boot lint as shipped content. */
export function loadWorkshopSync(): void {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(KEY); } catch { return; }
  if (!raw) return;
  try {
    const entities = parseWorkshopSave(JSON.parse(raw));
    if (entities) graftAll(entities);
  } catch { /* corrupt mirror — the disk reconcile may still restore */ }
}

/** Boot (async): the disk file is the cross-session authority — when it
 *  differs from the mirror, adopt it, re-graft, warm the mirror, and flush
 *  bakes. Returns true when anything changed (caller decides re-lint). */
export async function reconcileWorkshopFromDisk(): Promise<boolean> {
  const data = await diskGet<WorkshopSave>(WORKSHOP_SLOT);
  if (!data) return false;
  const entities = parseWorkshopSave(data);
  if (!entities) return false;
  if (JSON.stringify(entities) === JSON.stringify(workshop.entities)) return false;
  graftAll(entities);
  clearBakes();
  try { window.localStorage.setItem(KEY, serialize()); } catch { /* ignore */ }
  return true;
}

// --- editor mutations -------------------------------------------------------

/** Insert or replace by def id: graft live, store, persist. The bake cache is
 *  flushed so a re-composed look can never serve a stale body sprite. Returns
 *  an error string, or null on success. */
export function upsertWorkshopEntity(e: WorkshopEntity): string | null {
  const err = graftWorkshopEntity(e);
  if (err) return err;
  const i = workshop.entities.findIndex(x => x.def.id === e.def.id);
  if (i >= 0) workshop.entities[i] = e; else workshop.entities.push(e);
  clearBakes();
  saveWorkshop();
  return null;
}

/** Delete by id: un-graft, drop from the store, persist. */
export function removeWorkshopEntity(id: string): boolean {
  const i = workshop.entities.findIndex(x => x.def.id === id);
  if (i < 0) return false;
  workshop.entities.splice(i, 1);
  ungraftWorkshopId(id);
  clearBakes();
  saveWorkshop();
  return true;
}

/** The namespace law's other half, exposed for the probe: every prefixed id
 *  in MONSTERS must be a grafted workshop row — shipped content squatting on
 *  'custom_' would let a workshop delete take it down. */
export function findPrefixSquatters(): string[] {
  return Object.keys(MONSTERS).filter(id =>
    isWorkshopId(id) && !workshop.entities.some(e => e.def.id === id));
}

// --- PROMOTION: workshop → source (TypeScript literal emission) -------------

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const MOD_KINDS = new Set(['flat', 'increased', 'more', 'override', 'link']);

function tsKey(k: string): string {
  return IDENT.test(k) ? k : `'${k.replace(/'/g, "\\'")}'`;
}

function tsStr(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

/** A row shaped exactly like the mod() constructor's output renders as the
 *  call — the data files' house idiom (object literals stay valid TS either
 *  way; this is a readability courtesy for the paste target). */
function asModCall(v: Record<string, unknown>): string | null {
  const keys = Object.keys(v).filter(k => v[k] !== undefined);
  if (typeof v.stat !== 'string' || typeof v.kind !== 'string' || typeof v.value !== 'number') return null;
  if (!MOD_KINDS.has(v.kind) || v.kind === 'link') return null;
  const extras = keys.filter(k => k !== 'stat' && k !== 'kind' && k !== 'value' && k !== 'tags' && k !== 'when');
  if (extras.length) return null;
  let out = `mod(${tsStr(v.stat)}, ${tsStr(v.kind)}, ${String(v.value)}`;
  if (v.tags !== undefined || v.when !== undefined) out += `, ${v.tags !== undefined ? tsVal(v.tags, '') : 'undefined'}`;
  if (v.when !== undefined) out += `, ${tsStr(String(v.when))}`;
  return out + ')';
}

/** Emit plain data as a TypeScript literal — single quotes, unquoted
 *  identifier keys, short arrays/objects inline, 2-space nesting. */
function tsVal(v: unknown, indent: string): string {
  if (v === null || v === undefined) return 'undefined';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return tsStr(v);
  const deeper = indent + '  ';
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map(x => tsVal(x, deeper));
    const inline = `[${items.join(', ')}]`;
    if (inline.length <= 72 && !inline.includes('\n')) return inline;
    return `[\n${items.map(s => deeper + s).join(',\n')},\n${indent}]`;
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const call = asModCall(o);
    if (call) return call;
    const entries = Object.keys(o).filter(k => o[k] !== undefined)
      .map(k => `${tsKey(k)}: ${tsVal(o[k], deeper)}`);
    if (entries.length === 0) return '{}';
    const inline = `{ ${entries.join(', ')} }`;
    if (inline.length <= 72 && !inline.includes('\n')) return inline;
    return `{\n${entries.map(s => deeper + s).join(',\n')},\n${indent}}`;
  }
  return 'undefined'; // functions can't reach a workshop def by construction
}

/** The promotion text: LOOK block (paste inside LOOKS) + DEF block (paste
 *  inside MONSTERS). Ids keep the 'custom_' prefix — renaming it off is part
 *  of the deliberate promotion act, never automated. */
export function serializeEntityTS(e: WorkshopEntity): string {
  const bar = '-'.repeat(Math.max(8, 61 - e.def.id.length));
  const out: string[] = [`// --- WORKSHOP EXPORT: ${e.def.id} ${bar}`];
  if (e.look) {
    out.push('// LOOK — paste inside LOOKS in src/data/looks.ts:');
    out.push(`  ${tsKey(e.def.id)}: ${tsVal(cloneData(e.look), '  ')},`);
    out.push('');
  }
  const def = cloneData(e.def);
  if (e.look && def.look === def.id) delete (def as unknown as Record<string, unknown>).look; // restored by hand after the paste (the LOOKS key may be renamed)
  out.push('// DEF — paste inside MONSTERS in src/data/monsters.ts');
  out.push(`// (mods rows use the mod() constructor from engine/stats — already imported there${e.look ? '; restore `look` to the pasted LOOKS key' : ''}):`);
  out.push(`  ${tsKey(e.def.id)}: ${tsVal(def, '  ')},`);
  return out.join('\n');
}
