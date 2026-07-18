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
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import {
  registerDoodadRule, unregisterDoodadRule, type DoodadRule,
} from '../engine/levelgen';
import {
  registerGlyphPart, unregisterGlyphPart,
  type GlyphDef, type LookDef,
} from '../render/vis/parts';
import type { DoodadVisualDef } from '../render/vis/painters';
import { clearBakes } from '../render/vis/sprites';
import { diskGet, diskPut } from './persistence';
import '../render/vis/glyphDoodad'; // the 'glyph' doodad brush must exist before any workshop doodad renders

export const WORKSHOP_PREFIX = 'custom_';
export const WORKSHOP_SLOT = 'workshop';
const KEY = 'arpg_workshop_v1';
// v2 grew the DRAWN-PART rows (the glyph fabric) beside the entities; a v1
// file is still adopted whole — additive arrays default empty, nothing wipes.
const SCHEMA_VERSION = 2;

export interface WorkshopEntity {
  def: MonsterDef;
  /** The entity's own composed look — registered in LOOKS under the def's id
   *  (graft keeps def.look pointed there). Absent = the def wears an authored
   *  look id (def.look) or the legacy shape silhouette. */
  look?: LookDef;
}

/** A hand-drawn part kind (the Part Forge's rows): registered into
 *  PART_PAINTERS at graft, usable in ANY look — shipped or workshop. */
export interface WorkshopGlyphPart {
  kind: string;
  glyph: GlyphDef;
}

/** A hand-drawn DOODAD kind (the Doodad Forge's rows): the drawn body plus
 *  its look dials become the DOODAD_VISUALS row (painter 'glyph'), and
 *  `rule` — the WHOLE DoodadRule vocabulary, not a curated subset — goes
 *  through registerDoodadRule, so a drawn kind can wear any placement/
 *  collision/hazard word shipped kinds can. Collision is the hit-surface
 *  fabric: rule.surface / rule.bodyScale (deriveGlyphSurface computes them
 *  from the drawn geometry; the forge lets you override). */
export interface WorkshopDoodadKind {
  kind: string;
  glyph: GlyphDef;
  /** Palette seed — plain hex or the theme spec ('theme:tree|#2c4424'). */
  color: string;
  material?: string;
  order?: number;
  shadow?: number;
  longShadow?: number;
  light?: { radius: number; color: string; intensity: number; flicker?: number };
  rule: DoodadRule;
}

export interface WorkshopSave {
  schemaVersion: number;
  entities: WorkshopEntity[];
  glyphParts?: WorkshopGlyphPart[];
  doodads?: WorkshopDoodadKind[];
}

/** The live lists — the Forges read and mutate these, then persist via
 *  upsert/remove (which graft + save). Never reassigned; shared-ref safe. */
export const workshop: {
  entities: WorkshopEntity[];
  glyphParts: WorkshopGlyphPart[];
  doodads: WorkshopDoodadKind[];
} = { entities: [], glyphParts: [], doodads: [] };

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

/** Graft a drawn doodad kind: the DOODAD_VISUALS row (painter 'glyph') plus
 *  the runtime rule — the same two registries every shipped kind lives in.
 *  The quiet unregister-first makes re-grafts warn-free. */
export function graftWorkshopDoodad(row: WorkshopDoodadKind): string | null {
  if (!isWorkshopId(row.kind)) return `workshop doodad kind must start with '${WORKSHOP_PREFIX}' (got '${row.kind || '<empty>'}')`;
  if (!row.glyph || !Array.isArray(row.glyph.ops)) return 'doodad needs a drawn glyph (ops array)';
  if (!row.rule || typeof row.rule.overlap !== 'string') return 'doodad needs a rule with an overlap class';
  const visual: DoodadVisualDef = {
    painter: 'glyph',
    order: row.order ?? 50,
    params: { glyph: row.glyph, color: row.color, material: row.material },
  };
  if (row.shadow !== undefined) visual.shadow = row.shadow;
  if (row.longShadow !== undefined) visual.longShadow = row.longShadow;
  if (row.light) visual.light = row.light;
  DOODAD_VISUALS[row.kind] = visual;
  unregisterDoodadRule(row.kind);
  registerDoodadRule(row.kind, row.rule);
  return null;
}

/** Remove a drawn doodad kind from both registries (prefix-guarded; only
 *  RUNTIME rules are removable, so shipped kinds are untouchable twice
 *  over). Standing instances of a deleted kind degrade honestly: walkable
 *  ground rule default + the renderer's warned fallback disc. */
export function ungraftWorkshopDoodadKind(kind: string): void {
  if (!isWorkshopId(kind)) return;
  delete DOODAD_VISUALS[kind];
  unregisterDoodadRule(kind);
}

/** The normalized store payload every load path speaks. */
export interface WorkshopData {
  entities: WorkshopEntity[];
  glyphParts: WorkshopGlyphPart[];
  doodads: WorkshopDoodadKind[];
}

/** Replace the whole grafted population (boot + disk reconcile): un-graft
 *  dropped rows, graft the incoming set — parts first, so an entity look
 *  naming a drawn kind paints on its very first bake. */
function graftAll(data: WorkshopData): void {
  for (const p of workshop.glyphParts) {
    if (!data.glyphParts.some(x => x.kind === p.kind)) unregisterGlyphPart(p.kind);
  }
  workshop.glyphParts = data.glyphParts.slice();
  workshop.glyphParts.forEach(p => registerGlyphPart(p.kind, p.glyph));
  for (const d of workshop.doodads) {
    if (!data.doodads.some(x => x.kind === d.kind)) ungraftWorkshopDoodadKind(d.kind);
  }
  workshop.doodads = data.doodads.slice();
  workshop.doodads.forEach(d => graftWorkshopDoodad(d));
  for (const e of workshop.entities) {
    if (!data.entities.some(x => x.def.id === e.def.id)) ungraftWorkshopId(e.def.id);
  }
  workshop.entities = data.entities.slice();
  workshop.entities.forEach(e => graftWorkshopEntity(e));
}

// --- persistence (the account pattern: sync mirror + async disk authority) --

/** Pure save-shape gate (exported for probes/importers). Accepts the current
 *  schema AND v1 (entity-only) files — additive arrays default empty, an
 *  upgrade never wipes a workshop. Rows are filtered per the law: anything
 *  malformed or unprefixed is dropped (wipe-on-mismatch stays per-row). */
export function parseWorkshopSave(s: unknown): WorkshopData | null {
  const save = s as WorkshopSave | null;
  if (!save || !Array.isArray(save.entities)) return null;
  if (save.schemaVersion !== SCHEMA_VERSION && save.schemaVersion !== 1) return null;
  return {
    entities: save.entities.filter(e =>
      e && e.def && typeof e.def.id === 'string' && isWorkshopId(e.def.id)),
    glyphParts: (Array.isArray(save.glyphParts) ? save.glyphParts : []).filter(p =>
      p && typeof p.kind === 'string' && isWorkshopId(p.kind)
      && p.glyph && Array.isArray(p.glyph.ops)),
    doodads: (Array.isArray(save.doodads) ? save.doodads : []).filter(d =>
      d && typeof d.kind === 'string' && isWorkshopId(d.kind)
      && d.glyph && Array.isArray(d.glyph.ops)
      && d.rule && typeof d.rule.overlap === 'string'),
  };
}

function serialize(): string {
  const save: WorkshopSave = {
    schemaVersion: SCHEMA_VERSION,
    entities: workshop.entities,
    glyphParts: workshop.glyphParts,
    doodads: workshop.doodads,
  };
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
    const data = parseWorkshopSave(JSON.parse(raw));
    if (data) graftAll(data);
  } catch { /* corrupt mirror — the disk reconcile may still restore */ }
}

/** Boot (async): the disk file is the cross-session authority — when it
 *  differs from the mirror, adopt it, re-graft, warm the mirror, and flush
 *  bakes. Returns true when anything changed (caller decides re-lint). */
export async function reconcileWorkshopFromDisk(): Promise<boolean> {
  const raw = await diskGet<WorkshopSave>(WORKSHOP_SLOT);
  if (!raw) return false;
  const data = parseWorkshopSave(raw);
  if (!data) return false;
  const live: WorkshopData = {
    entities: workshop.entities, glyphParts: workshop.glyphParts, doodads: workshop.doodads,
  };
  if (JSON.stringify(data) === JSON.stringify(live)) return false;
  graftAll(data);
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

/** Insert or replace a DRAWN PART by kind: register live, store, persist.
 *  Bakes flush so every look already wearing the kind repaints redrawn. */
export function upsertWorkshopGlyphPart(row: WorkshopGlyphPart): string | null {
  const err = registerGlyphPart(row.kind, row.glyph);
  if (err) return err;
  const i = workshop.glyphParts.findIndex(x => x.kind === row.kind);
  if (i >= 0) workshop.glyphParts[i] = row; else workshop.glyphParts.push(row);
  clearBakes();
  saveWorkshop();
  return null;
}

/** Delete a drawn part: un-register, drop, persist. Looks still naming the
 *  kind skip it silently (the dispatch guard — same as any unknown kind). */
export function removeWorkshopGlyphPart(kind: string): boolean {
  const i = workshop.glyphParts.findIndex(x => x.kind === kind);
  if (i < 0) return false;
  workshop.glyphParts.splice(i, 1);
  unregisterGlyphPart(kind);
  clearBakes();
  saveWorkshop();
  return true;
}

/** Insert or replace a DRAWN DOODAD KIND: graft both registries, store,
 *  persist. Standing instances re-dress next frame (the renderer reads
 *  DOODAD_VISUALS live). */
export function upsertWorkshopDoodad(row: WorkshopDoodadKind): string | null {
  const err = graftWorkshopDoodad(row);
  if (err) return err;
  const i = workshop.doodads.findIndex(x => x.kind === row.kind);
  if (i >= 0) workshop.doodads[i] = row; else workshop.doodads.push(row);
  saveWorkshop();
  return null;
}

/** Delete a drawn doodad kind: un-graft, drop, persist. */
export function removeWorkshopDoodad(kind: string): boolean {
  const i = workshop.doodads.findIndex(x => x.kind === kind);
  if (i < 0) return false;
  workshop.doodads.splice(i, 1);
  ungraftWorkshopDoodadKind(kind);
  saveWorkshop();
  return true;
}

// --- AUTO-COLLISION: the drawn geometry IS the tested body -------------------

/** Derive the hit-surface words from a glyph's drawn extents: a roughly
 *  round drawing becomes a tightened DISC (rule.bodyScale — the walk-under
 *  trunk lever), an oblong one becomes the RECT surface (fractions of the
 *  instance radius, spun with the seeded rot) — exactly the two data lanes
 *  hitSurfaceOf already resolves, so movement, shots, sight, nav and the
 *  debug overlay all test what was drawn. The forge shows the derived shape
 *  and lets the author override either word. */
export function deriveGlyphSurface(glyph: GlyphDef): {
  bodyScale?: number;
  surface?: NonNullable<DoodadRule['surface']>;
} {
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const op of glyph.ops ?? []) {
    let oMinX = Infinity, oMaxX = -Infinity, oMinY = Infinity, oMaxY = -Infinity;
    const take = (x: number, y: number): void => {
      oMinX = Math.min(oMinX, x); oMaxX = Math.max(oMaxX, x);
      oMinY = Math.min(oMinY, y); oMaxY = Math.max(oMaxY, y);
    };
    if (op.kind === 'disc' || op.kind === 'ring') {
      const rx = Math.abs(op.rx ?? 0.1), ry = Math.abs(op.ry ?? op.rx ?? 0.1);
      take((op.x ?? 0) - rx, (op.y ?? 0) - ry);
      take((op.x ?? 0) + rx, (op.y ?? 0) + ry);
    } else {
      for (const [x, y] of op.pts ?? []) take(x, y);
    }
    if (oMinX > oMaxX) continue; // empty op
    if (op.mirror) { const lo = Math.min(oMinY, -oMaxY); const hi = Math.max(oMaxY, -oMinY); oMinY = lo; oMaxY = hi; }
    minX = Math.min(minX, oMinX); maxX = Math.max(maxX, oMaxX);
    minY = Math.min(minY, oMinY); maxY = Math.max(maxY, oMaxY);
  }
  if (minX > maxX) return { bodyScale: 1 };
  // Centered half-spans (the rect surface has no offset lane — cover the
  // drawn extents symmetrically; generous beats leaky for a standing body).
  const hw = Math.max(Math.abs(minX), Math.abs(maxX));
  const hh = Math.max(Math.abs(minY), Math.abs(maxY));
  const aspect = hw / Math.max(0.01, hh);
  if (aspect > 0.75 && aspect < 1.33) return { bodyScale: clamp(Math.max(hw, hh), 0.2, 2) };
  return { surface: { hw: clamp(hw, 0.1, 4), hh: clamp(hh, 0.1, 4), orient: 'rot' } };
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

/** Promotion text for a DRAWN PART: one GLYPH_PARTS row
 *  (src/data/glyphParts.ts — the shipped glyph roster; registration there
 *  refuses collisions, so a promoted kind can never clobber a painter). */
export function serializeGlyphPartTS(row: WorkshopGlyphPart): string {
  const bar = '-'.repeat(Math.max(8, 55 - row.kind.length));
  return [
    `// --- WORKSHOP EXPORT: drawn part ${row.kind} ${bar}`,
    '// Paste inside GLYPH_PARTS in src/data/glyphParts.ts (renaming the',
    "// 'custom_' prefix off is part of the deliberate promotion act):",
    `  ${tsKey(row.kind)}: ${tsVal(cloneData(row.glyph), '  ')},`,
  ].join('\n');
}

/** Promotion text for a DRAWN DOODAD KIND: the DOODAD_VISUALS row + the
 *  registerDoodadRule call (the package-kit lane) + a ready StampSpec hint
 *  for wiring it into any layout/cluster scatter. */
export function serializeDoodadTS(row: WorkshopDoodadKind): string {
  const bar = '-'.repeat(Math.max(8, 52 - row.kind.length));
  const visual: Record<string, unknown> = {
    painter: 'glyph', order: row.order ?? 50,
    params: { glyph: row.glyph, color: row.color, material: row.material },
    shadow: row.shadow, longShadow: row.longShadow, light: row.light,
  };
  return [
    `// --- WORKSHOP EXPORT: drawn doodad ${row.kind} ${bar}`,
    '// VISUAL — paste inside DOODAD_VISUALS in src/data/doodadVisuals.ts:',
    `  ${tsKey(row.kind)}: ${tsVal(cloneData(visual), '  ')},`,
    '',
    '// RULE — register beside a package kit (engine/levelgen registerDoodadRule),',
    '// or promote into DOODAD_RULES + KnownDoodadKind for tsc-proven coverage:',
    `registerDoodadRule('${row.kind}', ${tsVal(cloneData(row.rule), '')});`,
    '',
    '// SCATTER (optional) — a StampSpec row for a ZoneDef.layout / cluster def:',
    `//   { kind: '${row.kind}', count: [2, 5], radius: [12, 22] },`,
  ].join('\n');
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
