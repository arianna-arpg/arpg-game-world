// ---------------------------------------------------------------------------
// THE VESSEL WIRE: the rows THE SHARD's vessel and death covenant speak
// (docs/engine/shard.md "The vessel and the corpse"; the charter's §3.5 and
// card 6, docs/design/shard-world.md). Both ends of the wire share them:
// server/vessel.ts and server/corpses.ts WRITE them, the client
// (meta/shardVessel.ts) READS them, and every read goes through a sanitizer
// below, because a row off the wire is untrusted on either end.
//
// Browser-safe: types and pure functions only.
// ---------------------------------------------------------------------------

import { ESSENCES, type EssenceId } from '../data/essences';
import type { SavedCaveRung, SavedPlayerSpot } from '../meta/worldstate';

/** Where a fallen vessel's body lies on the shard: the `corpse` row's note. */
export interface ShardCorpseNote {
  /** The corpse record's id. Absent when the fall left nothing to reclaim
   *  (no worn gear, or a cave: the corpse run's own exemptions). */
  id?: string;
  charId: string;
  name: string;
  classId: string;
  level: number;
  zoneId: string;
  zoneName: string;
  pos: { x: number; y: number };
  /** Pieces the body holds for its reclaim (0 = no body stands). */
  pieces: number;
  /** Wall-clock ms of the fall. */
  diedAt: number;
}

/** THE RECKONING as the shard appraised it: the fallen vessel's carried
 *  essence at the strict mortal exchange times its stage's payout rate (the
 *  World.reckonRunEssence fold, read for ONE seat), plus the chronicle's
 *  journey numbers. The client mints these into its own account. */
export interface ShardReckoning {
  rows: { id: EssenceId; count: number; worth: number; value: number }[];
  carried: number;
  mult: number;
  minted: number;
  renown: number;
  level: number;
  /** Zones the vessel walked on the shard. */
  zones: number;
  /** Kills the party made while the vessel stood in the world (M0: the
   *  party travels together, so these are the vessel's fights too). */
  kills: number;
  /** The life-contract it fell under; the client reads the stage's policy
   *  through its own registry (meta/modes.ts stageOf). */
  modeId: string;
  modeStage: number;
}

/** One of a seat's OWN standing bodies in its current zone, drawn by the
 *  client's render shell as an ordinary player corpse. */
export interface ShardBodyRow {
  id: string;
  x: number;
  y: number;
  classId: string;
  level: number;
  /** Seconds dwelt toward the reclaim (drawn == dwelt: the shard's clock). */
  dwell: number;
}

/** THE RETURN (card 26 B, her ruling 2026-10-10; W7): where a hero stood when it
 *  last left a hosted world, the only place it logs back in. Every mirror carries it
 *  (`CharacterSave.stand`: the farewell, the beat), the shard keeps it for a leave its
 *  client never heard (the dormant release, a closed tab), and the next login lands
 *  the hero there under THE SPAWN GRACE (server/shardHost.ts returnLanding). */
export interface ShardStand {
  /** THE HOSTED SEED of the world it stood in: a stand from another world is foreign. */
  seed: number;
  /** The seat's SAVED SPOT (engine/shardRoads.ts shardSpotOf): the zone underfoot, or
   *  under ground the surface anchor at the pocket's outermost mouth plus the pocket
   *  and its descent (`cave`). */
  spot: SavedPlayerSpot;
  /** The story at the spot (in a pocket: the outermost mouth's own story). */
  tier: number;
  /** Under ground: the pocket it stood in, its spot and its story. A pocket still
   *  standing takes the hero back to that spot; a pocket gone lands it at the mouth
   *  (the spot's surface anchor). */
  pocket?: { zoneId: string; x: number; y: number; tier: number };
  /** The unit it stood in (a record for the log; the landing reads the spot). */
  unit?: string;
}

/** The wire's sanity rails: what a row may carry before it is refused. */
export const VESSEL_WIRE_CFG = {
  /** Longest id/name string a row may carry. */
  maxText: 96,
  /** Ceiling on any count or appraisal a row may carry. */
  maxValue: 1e9,
  /** Bodies one `corpses` row may draw. */
  maxBodies: 32,
  /** THE RETURN: rungs a stand's descent may carry (the save's own WORLDSTATE_CFG.caveRungCap). */
  maxRungs: 8,
  /** THE RETURN: the highest story a stand may name. */
  maxTier: 8,
};

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const text = (v: unknown): string | null =>
  typeof v === 'string' && v.length <= VESSEL_WIRE_CFG.maxText ? v : null;

/** A reckoning off the wire, or null. Rows naming an unknown essence drop
 *  (the death screen indexes the registry by id); every number is finite. */
export function sanitizeReckoning(raw: unknown): ShardReckoning | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const cap = VESSEL_WIRE_CFG.maxValue;
  const carried = num(r.carried, 0, cap), mult = num(r.mult, 0, cap), minted = num(r.minted, 0, cap);
  const renown = num(r.renown, 0, cap), level = num(r.level, 1, cap);
  const zones = num(r.zones, 0, cap), kills = num(r.kills, 0, cap), modeStage = num(r.modeStage, 0, 64);
  const modeId = text(r.modeId);
  if (carried === null || mult === null || minted === null || renown === null || level === null
    || zones === null || kills === null || modeStage === null || modeId === null) return null;
  const rows: ShardReckoning['rows'] = [];
  for (const row of Array.isArray(r.rows) ? r.rows.slice(0, 16) : []) {
    const o = row as Record<string, unknown> | null;
    if (!o || typeof o.id !== 'string' || !Object.hasOwn(ESSENCES, o.id)) continue;
    const count = num(o.count, 0, cap), worth = num(o.worth, 0, cap), value = num(o.value, 0, cap);
    if (count === null || worth === null || value === null) continue;
    rows.push({ id: o.id as EssenceId, count, worth, value });
  }
  return {
    rows, carried, mult, minted: Math.floor(minted), renown: Math.floor(renown), level: Math.floor(level),
    zones: Math.floor(zones), kills: Math.floor(kills), modeId, modeStage: Math.floor(modeStage),
  };
}

/** A corpse note off the wire, or null. */
export function sanitizeCorpseNote(raw: unknown): ShardCorpseNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pos = r.pos as Record<string, unknown> | null;
  const charId = text(r.charId), name = text(r.name), classId = text(r.classId);
  const zoneId = text(r.zoneId), zoneName = text(r.zoneName);
  const level = num(r.level, 1, VESSEL_WIRE_CFG.maxValue), pieces = num(r.pieces, 0, 1024);
  const diedAt = num(r.diedAt, 0, Number.MAX_SAFE_INTEGER);
  const x = pos ? num(pos.x, -1e9, 1e9) : null, y = pos ? num(pos.y, -1e9, 1e9) : null;
  if (!charId || name === null || !classId || !zoneId || zoneName === null || level === null
    || pieces === null || diedAt === null || x === null || y === null) return null;
  const id = r.id === undefined ? undefined : text(r.id) ?? undefined;
  return {
    ...(id ? { id } : {}), charId, name, classId, level: Math.floor(level), zoneId, zoneName,
    pos: { x, y }, pieces: Math.floor(pieces), diedAt,
  };
}

/** THE RETURN: a stand off the wire or out of a save, or null (a malformed stand is
 *  no stand: the hero wakes at the hearth, never at a guessed place). */
export function sanitizeStand(raw: unknown): ShardStand | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const seed = num(r.seed, 0, 0xffffffff), tier = num(r.tier, 0, VESSEL_WIRE_CFG.maxTier);
  const s = r.spot as Record<string, unknown> | null;
  if (seed === null || tier === null || !s || typeof s !== 'object') return null;
  const zoneId = text(s.zoneId), x = num(s.x, -1e9, 1e9), y = num(s.y, -1e9, 1e9);
  if (!zoneId || x === null || y === null) return null;
  const entryFrom = typeof s.entryFrom === 'string' ? text(s.entryFrom) : null;
  const spot: SavedPlayerSpot = { zoneId, x, y, ...(entryFrom ? { entryFrom } : {}) };
  const c = s.cave as Record<string, unknown> | null | undefined;
  if (c && typeof c === 'object') {
    const caveId = text(c.zoneId), cx = num(c.x, -1e9, 1e9), cy = num(c.y, -1e9, 1e9);
    const rungs: SavedCaveRung[] = [];
    const raws = Array.isArray(c.rungs) ? c.rungs : [];
    for (const row of raws.length <= VESSEL_WIRE_CFG.maxRungs ? raws : []) {
      const o = row as Record<string, unknown> | null;
      if (!o || typeof o !== 'object') break;
      const rz = text(o.zoneId), rx = num(o.x, -1e9, 1e9), ry = num(o.y, -1e9, 1e9), kind = text(o.kind);
      const rseed = num(o.seed, -0x80000000, 0xffffffff), rt = o.tier === undefined ? 0 : num(o.tier, 0, VESSEL_WIRE_CFG.maxTier);
      if (!rz || rx === null || ry === null || !kind || rseed === null || rt === null) break;
      const ef = typeof o.entryFrom === 'string' ? text(o.entryFrom) : null, span = typeof o.underSpan === 'string' ? text(o.underSpan) : null;
      rungs.push({ zoneId: rz, x: rx, y: ry, kind, seed: rseed, ...(ef ? { entryFrom: ef } : {}), ...(span ? { underSpan: span } : {}), ...(rt ? { tier: rt } : {}) });
    }
    if (caveId && cx !== null && cy !== null && rungs.length && rungs.length === raws.length) spot.cave = { zoneId: caveId, x: cx, y: cy, rungs };
  }
  const p = r.pocket as Record<string, unknown> | null | undefined;
  let pocket: ShardStand['pocket'];
  if (p && typeof p === 'object') {
    const pz = text(p.zoneId), px = num(p.x, -1e9, 1e9), py = num(p.y, -1e9, 1e9), pt = num(p.tier, 0, VESSEL_WIRE_CFG.maxTier);
    if (!pz || px === null || py === null || pt === null) return null;
    pocket = { zoneId: pz, x: px, y: py, tier: Math.floor(pt) };
  }
  const unit = typeof r.unit === 'string' ? text(r.unit) : null;
  return { seed: seed >>> 0, spot, tier: Math.floor(tier), ...(pocket ? { pocket } : {}), ...(unit ? { unit } : {}) };
}

/** A `corpses` row's bodies off the wire (malformed rows drop, the count is capped). */
export function sanitizeBodyRows(raw: unknown): ShardBodyRow[] {
  const out: ShardBodyRow[] = [];
  for (const row of Array.isArray(raw) ? raw.slice(0, VESSEL_WIRE_CFG.maxBodies) : []) {
    const o = row as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') continue;
    const id = text(o.id), classId = text(o.classId);
    const x = num(o.x, -1e9, 1e9), y = num(o.y, -1e9, 1e9), level = num(o.level, 1, VESSEL_WIRE_CFG.maxValue);
    const dwell = num(o.dwell, 0, 3600);
    if (!id || !classId || x === null || y === null || level === null || dwell === null) continue;
    out.push({ id, x, y, classId, level: Math.floor(level), dwell });
  }
  return out;
}

/** THE IMMORTAL'S COVENANT ON A SHARD (card 30): a `stageDeath` word's stage reached
 *  (the ladder's index, 0..64), or null. */
export function sanitizeStageReached(v: unknown): number | null {
  const n = num(v, 0, 64);
  return n === null || !Number.isInteger(n) ? null : n;
}

/** THE FALL (card 30): a `fell` word's vessel level and its fall record's time (the shard's
 *  wall clock, ms), or null. */
export function sanitizeFell(level: unknown, at: unknown): { level: number; at: number } | null {
  const l = num(level, 1, VESSEL_WIRE_CFG.maxValue), t = num(at, 0, Number.MAX_SAFE_INTEGER);
  return l === null || t === null ? null : { level: Math.floor(l), at: t };
}
