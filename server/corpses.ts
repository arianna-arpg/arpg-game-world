// ---------------------------------------------------------------------------
// THE CORPSE RETURNS: a hosted world REMEMBERS where a mortal vessel fell
// (docs/engine/shard.md "The vessel and the corpse"; her ruling 2026-10-07:
// "the server 'remembers' the player's death location, but the player itself
// is client-based and it's equivalent to having their character die in a
// normal run").
//
// The shard keeps a small RECORD STORE beside its world save
// (saves/shard_<seed>.records.json): every fallen vessel's body (its worn and
// side-board gear, captured exactly as a DeathRecord captures it) keyed by
// the ACCOUNT that owned it, plus THE TOMBSTONES (accountId:charId of every
// vessel that fell here, so a stale upload can never walk a dead hero back
// in). The store writes on every change and loads at boot, independent of the
// world half: an ephemeral or --worldmass world re-rolls its ground, its dead
// stay remembered.
//
// THE STANDING BODY: a seat that named an account sees that account's bodies
// in the zone it stands in (the couch guest's "seeded at join" precedent: the
// ring follows the seat), matched by the corpse run's own law
// (world.ts spawnPlayerCorpses / corpseZoneOf): a static zone by its stable
// id, a generated id by map coordinate inside CORPSE_MATCH_RADIUS once its own
// zone is gone. The reclaim is the corpse run's dwell (the 'corpse_reclaim'
// transit row's reach, discipline and clock, owner-gated by SEAT: no other
// player stands in its ring), and the gear comes home into THAT seat's bag:
// ground drops are not owner-gated on a shared world, so the shard's reclaim
// pays the claimant directly (a full bag spills at its own feet as OWED
// property). The client draws its own bodies from `session corpses` rows
// (to that seat alone: no other account even learns a body is there).
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { dist, vec, type Vec2 } from '../src/core/math';
import type { Seat, World } from '../src/engine/world';
import type { ZoneDef } from '../src/data/zones';
import { SUPPORTS } from '../src/data/supports';
import { transitDwell, transitRadius, transitReach, transitRing } from '../src/data/transit';
import { CORPSE_MATCH_RADIUS, MAX_DEATH_RECORDS, type LootPayload, type SavedLoot } from '../src/meta/death';
import { rebuildSkill } from '../src/meta/character';
import { isAccountId } from '../src/meta/account';
import { stageOf } from '../src/meta/modes';
import { makeSkillGemItem, makeSupportGemItem, rebuildAnyItem } from '../src/engine/gemitems';
import { autoPlace } from '../src/engine/inventory';
import { ITEM_RARITIES, type ItemInstance } from '../src/engine/items';
import { notePickup } from '../src/world/bulletins';
import type { SessionMsg } from '../src/net/transport';
import {
  sanitizeCorpseNote, sanitizeReckoning, type ShardBodyRow, type ShardCorpseNote, type ShardReckoning,
} from '../src/net/vesselWire';
import type { SeatWorlds } from './simUnits';

export const SHARD_CORPSE_CFG = {
  /** Bodies a shard remembers per account: the account ring's own size
   *  (meta/death.ts MAX_DEATH_RECORDS); the oldest is let go. */
  perAccount: MAX_DEATH_RECORDS,
  /** Fallen vessels remembered per account (THE TOMBSTONES). */
  fallenPerAccount: 64,
  /** The records file's own schema (a mismatch starts the store empty). */
  schema: 1,
  /** The reclaim's reach and clock when the 'corpse_reclaim' transit row is
   *  absent (the engine's CORPSE_RADIUS / CORPSE_DWELL). */
  reclaimRadius: 110,
  reclaimDwell: 1.0,
  /** A standing body's arena clamp (the engine's corpse spawn clamp). */
  clampRadius: 16,
  /** Re-send a seat's rows when a reclaim dwell moves this fraction of its
   *  clock, so the client's ring fills as the shard's does (drawn == dwelt). */
  dwellStep: 0.1,
  /** The reclaim's shown beat: the engine reclaim's own flash at the body. */
  flash: { radius: 64, life: 0.5, color: '#d8b048' },
};

/** Generated / quest / cave ids churn with their mint; a static id never does
 *  (the corpse run's own split, world.ts spawnPlayerCorpses). */
const CHURNING_ZONE = /^(gen_|quest_|cave_)/;

/** One fallen vessel's body, remembered by the shard. */
export interface ShardCorpse {
  id: string;
  /** The account that owned the vessel: THE key (only its seats ever see it). */
  accountId: string;
  charId: string;
  name: string;
  classId: string;
  level: number;
  zoneId: string;
  zoneName: string;
  /** Where the body lies, in the zone's own frame. */
  pos: { x: number; y: number };
  /** The zone's world-graph coordinate (a churned generated id re-binds by it). */
  map?: { x: number; y: number };
  /** What the body holds: meta/death.ts captureLoot under the default policy
   *  (worn gear and side boards, the DeathRecord's own capture). */
  loot: LootPayload;
  diedAt: number;
  /** THE IMMORTAL'S COVENANT ON A SHARD (card 30): 'own' = the dying stage's corpseRing was
   *  the character's own (meta/modes.ts): only that character's seats ever see it (self-only,
   *  as the solo own ring rides its save). Absent = the account ring (every mortal body). */
  ring?: 'own';
}

/** THE TOMBSTONE: a vessel that fell here, and THE WORD its client is owed
 *  (the corpse note + the reckoning), kept so a client that never heard it
 *  (a crash, a dropped socket, a leave while downed) hears it at its next
 *  upload of that vessel, then runs its reckoning and wipes its slot.
 *  THE IMMORTAL'S COVENANT ON A SHARD (card 30) keeps two more rows here, by `kind`:
 *  'fall' = THE FALL RECORD (an Undying fell: `level` its level; a resurrection later
 *  than `at` lifts it, every other upload hears `fell` again and is refused 'fallen'),
 *  'cross' = THE OWED CROSSING (a crossing its client never heard: `stage` the stage it
 *  reached; the next upload crosses on arrival and hears its word). Absent = the mortal's
 *  tombstone, forever. */
export interface FallenRow {
  accountId: string;
  charId: string;
  at: number;
  word?: { note: ShardCorpseNote; reckoning: ShardReckoning };
  kind?: 'fall' | 'cross';
  level?: number;
  stage?: number;
}

/** The records file (saves/shard_<seed>.records.json). */
export interface ShardRecordsSave {
  schemaVersion: number;
  seed: number;
  savedAt: number;
  corpses: ShardCorpse[];
  fallen: FallenRow[];
}

/** Where a shard's records live: beside the world save, keyed by the seed, and
 *  independent of whether the world half is written (ephemeral / worldmass). */
export function shardRecordsPath(saveDir: string | null, seed: number): string | null {
  return saveDir === null ? null : join(saveDir, `shard_${(seed >>> 0).toString(16).padStart(8, '0')}.records.json`);
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 256;

/** A remembered body read back from disk, or null (per-record tolerance: a
 *  malformed row drops, the store never refuses whole). */
function sanitizeCorpse(raw: unknown): ShardCorpse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pos = r.pos as Record<string, unknown> | null, map = r.map as Record<string, unknown> | null | undefined;
  const loot = r.loot as Record<string, unknown> | null;
  if (!str(r.id) || !isAccountId(r.accountId) || !str(r.charId) || typeof r.name !== 'string' || !str(r.classId)
    || !finite(r.level) || !str(r.zoneId) || typeof r.zoneName !== 'string' || !finite(r.diedAt)
    || !pos || !finite(pos.x) || !finite(pos.y) || !loot || !Array.isArray(loot.items)) return null;
  const items = (loot.items as unknown[]).filter((it): it is SavedLoot =>
    !!it && typeof it === 'object' && ['gear', 'skill', 'support'].includes((it as { kind?: string }).kind ?? ''));
  return {
    id: r.id, accountId: r.accountId, charId: r.charId, name: r.name, classId: r.classId, level: r.level,
    zoneId: r.zoneId, zoneName: r.zoneName, pos: { x: pos.x, y: pos.y },
    ...(map && finite(map.x) && finite(map.y) ? { map: { x: map.x, y: map.y } } : {}),
    loot: { items }, diedAt: r.diedAt,
    ...(r.ring === 'own' ? { ring: 'own' as const } : {}), // card 30: a self-only body stays self-only
  };
}

/** THE IMMORTAL'S COVENANT ON A SHARD (card 30): may this seat see this body? A self-only body
 *  ('own' ring) is its character's alone; an account body is every seat's of that account whose
 *  stage spawns the account ring (an Undying, corpseSource 'own', sees only its own falls). */
function bodyVisibleTo(c: ShardCorpse, seat: Seat | undefined): boolean {
  if (c.ring === 'own') return !!seat && seat.meta.charId === c.charId;
  return !seat || stageOf(seat.meta.modeId, seat.meta.modeStage).corpseSource !== 'own';
}

/** A body standing for one seat in its current zone. */
interface Standing { corpse: ShardCorpse; pos: Vec2; dwell: number; sentDwell: number }
/** One seat's view of its account's dead. */
interface SeatBodies {
  accountId: string | undefined;
  /** The zone these bodies were stood up for (null = not yet). */
  zoneId: string | null;
  bodies: Standing[];
  /** The account's records moved: re-stand before the next dwell. */
  stale: boolean;
  /** The client's drawn rows lag the shard's: send at the sweep's end. */
  unsent: boolean;
  /** Reclaims completed since the last row (the client's account deed). */
  reclaimed: number;
  /** THE DORMANT SEAT: its socket is lost; no dwell runs and no row ships until it wakes. */
  asleep: boolean;
}

/** The SessionMsg sink (ShardTransport.sendSession to one seat). */
export type SeatSend = (msg: SessionMsg, to: string) => void;

export class ShardCorpses {
  private corpses: ShardCorpse[] = [];
  private fallen: FallenRow[] = [];
  private readonly seats = new Map<string, SeatBodies>();
  private serial = 0;
  /** Bodies reclaimed since boot (the probe's read). */
  reclaims = 0;

  constructor(
    /** THE DESKS PER UNIT (shard M1): each seat's bodies stand in the seat's own unit. */
    private readonly units: SeatWorlds,
    private readonly send: SeatSend,
    readonly path: string | null,
    private readonly seed: number,
    private readonly log: (line: string) => void,
  ) {
    this.load();
  }

  // ---- the record store ---------------------------------------------------
  /** Every remembered body (read-only view). */
  all(): readonly ShardCorpse[] { return this.corpses; }
  /** One account's bodies, oldest first. */
  forAccount(accountId: string | undefined): ShardCorpse[] {
    return accountId ? this.corpses.filter(c => c.accountId === accountId) : [];
  }
  /** One account's bodies as one seat may see them (card 30: a self-only body is its
   *  character's alone; an Undying sees only its own falls). */
  forSeat(accountId: string | undefined, seat: Seat | undefined): ShardCorpse[] {
    return this.forAccount(accountId).filter(c => bodyVisibleTo(c, seat));
  }
  /** Did this vessel already fall on this shard? (THE TOMBSTONE: the mortal's, forever.) */
  hasFallen(accountId: string, charId: string): boolean {
    return this.fallen.some(f => f.accountId === accountId && f.charId === charId && f.kind === undefined);
  }
  /** The word a fallen vessel's client is owed (absent on a legacy row). */
  fallenWord(accountId: string, charId: string): FallenRow['word'] {
    return this.fallen.find(f => f.accountId === accountId && f.charId === charId && f.kind === undefined)?.word;
  }

  // ---- THE IMMORTAL'S COVENANT ON A SHARD (card 30) ------------------------
  /** THE FALL RECORD standing for this vessel (an Undying that fell here), if any. */
  fallRecord(accountId: string, charId: string): FallenRow | undefined {
    return this.fallen.find(f => f.accountId === accountId && f.charId === charId && f.kind === 'fall');
  }
  /** THE FALL RECORD: an Undying fell here; its word (the note, the appraisal, its level) is
   *  kept for THE LATE WORD. A newer fall replaces an older record. Returns the row. */
  markFall(accountId: string, charId: string, word: NonNullable<FallenRow['word']>, level: number): FallenRow {
    this.fallen = this.fallen.filter(f => !(f.accountId === accountId && f.charId === charId && f.kind === 'fall'));
    const row: FallenRow = { accountId, charId, at: Date.now(), word, kind: 'fall', level };
    this.keep(row);
    return row;
  }
  /** A resurrection later than the fall lifts its record: the vessel walks this shard again. */
  liftFall(accountId: string, charId: string): void {
    const n = this.fallen.length;
    this.fallen = this.fallen.filter(f => !(f.accountId === accountId && f.charId === charId && f.kind === 'fall'));
    if (this.fallen.length !== n) this.persist();
  }
  /** THE OWED CROSSING standing for this vessel (a crossing its client never heard), if any. */
  owedCrossing(accountId: string, charId: string): FallenRow | undefined {
    return this.fallen.find(f => f.accountId === accountId && f.charId === charId && f.kind === 'cross');
  }
  /** THE OWED CROSSING: a crossing its client never heard (a leave while down, a dormant
   *  socket); the next upload crosses on arrival and hears the word. A newer one replaces it. */
  markOwedCrossing(accountId: string, charId: string, word: NonNullable<FallenRow['word']>, stage: number): void {
    this.fallen = this.fallen.filter(f => !(f.accountId === accountId && f.charId === charId && f.kind === 'cross'));
    this.keep({ accountId, charId, at: Date.now(), word, kind: 'cross', stage });
  }
  /** The owed crossing was heard (or enforced): its row goes. */
  clearOwedCrossing(accountId: string, charId: string): void {
    const n = this.fallen.length;
    this.fallen = this.fallen.filter(f => !(f.accountId === accountId && f.charId === charId && f.kind === 'cross'));
    if (this.fallen.length !== n) this.persist();
  }
  /** One row in, the account's oldest past fallenPerAccount out, the file written. */
  private keep(row: FallenRow): void {
    this.fallen.push(row);
    const mine = this.fallen.filter(f => f.accountId === row.accountId);
    while (mine.length > SHARD_CORPSE_CFG.fallenPerAccount) this.fallen.splice(this.fallen.indexOf(mine.shift()!), 1);
    this.persist();
  }

  /** Bank a fallen vessel's body (THE DEATH COVENANT's write). An account keeps
   *  its newest perAccount bodies; the file writes now. */
  record(c: Omit<ShardCorpse, 'id'>): ShardCorpse {
    // Ids never draw Math.random: the shard's engine stream stays the seed's.
    const corpse: ShardCorpse = { ...c, id: `${c.accountId.slice(0, 8)}-${Date.now().toString(36)}-${(++this.serial).toString(36)}` };
    this.corpses.push(corpse);
    const mine = this.corpses.filter(x => x.accountId === c.accountId);
    while (mine.length > SHARD_CORPSE_CFG.perAccount) this.corpses.splice(this.corpses.indexOf(mine.shift()!), 1);
    this.touch(c.accountId);
    this.persist();
    return corpse;
  }

  /** THE TOMBSTONE: this vessel fell here and never walks in again; the word
   *  its client is owed is kept beside it. */
  markFallen(accountId: string, charId: string, word?: FallenRow['word']): void {
    if (this.hasFallen(accountId, charId)) return;
    this.fallen.push({ accountId, charId, at: Date.now(), ...(word ? { word } : {}) });
    const mine = this.fallen.filter(f => f.accountId === accountId);
    while (mine.length > SHARD_CORPSE_CFG.fallenPerAccount) this.fallen.splice(this.fallen.indexOf(mine.shift()!), 1);
    this.persist();
  }

  private remove(id: string): void {
    const i = this.corpses.findIndex(c => c.id === id);
    if (i < 0) return;
    const [gone] = this.corpses.splice(i, 1);
    this.touch(gone.accountId);
    this.persist();
  }

  /** Every seat of this account re-stands its bodies. */
  private touch(accountId: string): void {
    for (const sb of this.seats.values()) if (sb.accountId === accountId) sb.stale = true;
  }

  /** Write the store (atomic: a tmp file, then rename). */
  persist(): void {
    if (!this.path) return;
    const save: ShardRecordsSave = {
      schemaVersion: SHARD_CORPSE_CFG.schema, seed: this.seed >>> 0, savedAt: Date.now(),
      corpses: this.corpses, fallen: this.fallen,
    };
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const tmp = this.path + '.tmp';
      writeFileSync(tmp, JSON.stringify(save));
      renameSync(tmp, this.path);
    } catch (e) {
      this.log(`[shard] records write failed: ${String(e)}`);
    }
  }

  private load(): void {
    if (!this.path || !existsSync(this.path)) return;
    let save: Partial<ShardRecordsSave> | null = null;
    try { save = JSON.parse(readFileSync(this.path, 'utf-8')) as Partial<ShardRecordsSave>; } catch { save = null; }
    if (!save || save.schemaVersion !== SHARD_CORPSE_CFG.schema || !Array.isArray(save.corpses)) {
      this.log(`[shard] no usable records at ${this.path}; the dead start forgotten`);
      return;
    }
    this.corpses = save.corpses.map(sanitizeCorpse).filter((c): c is ShardCorpse => !!c);
    this.fallen = (Array.isArray(save.fallen) ? save.fallen : []).flatMap((f): FallenRow[] => {
      if (!f || !isAccountId(f.accountId) || !str(f.charId) || !finite(f.at)) return [];
      const note = sanitizeCorpseNote(f.word?.note), reckoning = sanitizeReckoning(f.word?.reckoning);
      // card 30: a fall record keeps its level, an owed crossing its stage (a malformed one drops whole).
      const kind = f.kind === 'fall' || f.kind === 'cross' ? f.kind : undefined;
      if (kind && (!note || !reckoning || (kind === 'fall' ? !finite(f.level) : !Number.isInteger(f.stage)))) return [];
      return [{ accountId: f.accountId, charId: f.charId, at: f.at, ...(note && reckoning ? { word: { note, reckoning } } : {}),
        ...(kind ? { kind, ...(kind === 'fall' ? { level: f.level } : { stage: f.stage }) } : {}) }];
    });
    this.log(`[shard] remembers ${this.corpses.length} bodies and ${this.fallen.length} fallen vessels`);
  }

  // ---- the standing bodies ------------------------------------------------
  /** A seat joined (or rejoined): its account's bodies will stand where it
   *  stands. A seat without an account still receives (empty) rows, so a
   *  client shell never draws a body the shard does not hold. */
  join(seatId: string, accountId: string | undefined): void {
    this.seats.set(seatId, { accountId, zoneId: null, bodies: [], stale: true, unsent: true, reclaimed: 0, asleep: false });
  }
  leave(seatId: string): void { this.seats.delete(seatId); }
  /** THE DORMANT SEAT: a seat whose socket was lost keeps its view, but a body
   *  with no hand reclaims nothing (its dwell rests at zero) and no row ships
   *  to a socket that is gone (a deed still owed waits for the wake). */
  sleep(seatId: string): void {
    const sb = this.seats.get(seatId);
    if (!sb) return;
    sb.asleep = true;
    for (const b of sb.bodies) b.dwell = 0;
  }
  /** THE RECONNECT TOKEN: the resumed seat's new shell gets its bodies whole on the next sweep. */
  wake(seatId: string): void {
    const sb = this.seats.get(seatId);
    if (sb) { sb.asleep = false; sb.stale = true; }
  }

  /** The bodies standing for one seat right now (the probe's read). */
  standing(seatId: string): readonly { id: string; pos: Vec2; dwell: number }[] {
    return (this.seats.get(seatId)?.bodies ?? []).map(b => ({ id: b.corpse.id, pos: b.pos, dwell: b.dwell }));
  }

  /** Does this body lie in the zone? The corpse run's own match law. */
  private liesIn(c: ShardCorpse, zone: ZoneDef): boolean {
    if (c.zoneId === zone.id) return true;
    // A static id re-matches by its stable id alone; a churned generated id
    // re-binds by map coordinate (an ephemeral world re-mints its frontier),
    // never while its own zone still stands, never into a cave.
    const chart = this.units.keeperWorld().zoneMap; // the shared chart (THE PIN's alias)
    if (!CHURNING_ZONE.test(c.zoneId) || !c.map || chart[c.zoneId]) return false;
    if (!chart[zone.id] || zone.caveDepth != null) return false;
    return Math.hypot(zone.map.x - c.map.x, zone.map.y - c.map.y) <= CORPSE_MATCH_RADIUS;
  }

  private stand(sb: SeatBodies, w: World, seat: Seat): void {
    const prior = new Map(sb.bodies.map(b => [b.corpse.id, b.dwell]));
    const sameZone = sb.zoneId === w.zone.id;
    sb.bodies = this.forSeat(sb.accountId, seat).filter(c => this.liesIn(c, w.zone)).map(c => ({ // card 30: the stage's own ring
      corpse: c, pos: w.clampPos(vec(c.pos.x, c.pos.y), SHARD_CORPSE_CFG.clampRadius),
      dwell: sameZone ? prior.get(c.id) ?? 0 : 0, sentDwell: 0,
    }));
    sb.zoneId = w.zone.id;
    sb.stale = false;
    sb.unsent = true;
  }

  /** The per-tick sweep: re-stand on a zone change or a records change, run
   *  each seat's reclaim dwell, then ship every seat's lagging rows. */
  tick(dt: number): void {
    for (const [seatId, sb] of this.seats) {
      const w = this.units.worldOf(seatId);
      const seat = w?.seats.find(s => s.id === seatId);
      if (!w || !seat || sb.asleep) continue; // THE DORMANT SEAT: no hand, no dwell
      // THE DESKS PER UNIT: a seat's bodies stand in the zone of its own unit, and re-stand
      // when a hand-off (or its unit's road) moves it to another zone.
      if (sb.stale || sb.zoneId !== w.zone.id) this.stand(sb, w, seat);
      this.dwell(seat, sb, dt, w);
    }
    // Ship after EVERY seat swept: a reclaim re-stands its account's other seats.
    for (const [seatId, sb] of this.seats) {
      const w = this.units.worldOf(seatId);
      const seat = w?.seats.find(s => s.id === seatId);
      if (w && seat && !sb.asleep && (sb.stale || sb.unsent)) { if (sb.stale) this.stand(sb, w, seat); this.ship(seat, sb, w); } // a dormant seat hears nothing
    }
  }

  /** THE RECLAIM DWELL: the 'corpse_reclaim' transit row's reach, discipline
   *  and clock (updatePlayerCorpses' own), read for the owning seat. */
  private dwell(seat: Seat, sb: SeatBodies, dt: number, w: World): void {
    const a = seat.actor;
    const radius = transitRadius('corpse_reclaim', SHARD_CORPSE_CFG.reclaimRadius);
    const need = transitDwell('corpse_reclaim', SHARD_CORPSE_CFG.reclaimDwell);
    const reach = transitReach('corpse_reclaim');
    const able = !a.dead && !a.downed && w.seatIdle(seat);
    for (const b of sb.bodies) {
      const near = able && dist(b.pos, a.pos) <= radius && w.dwellReachable(a.pos, b.pos, reach, w.storyPair(a));
      b.dwell = near ? b.dwell + dt : 0;
      if (b.dwell >= need) { this.units.within(seat.id, uw => this.reclaim(seat, sb, b, uw)); return; }
      if (Math.abs(b.dwell - b.sentDwell) >= need * SHARD_CORPSE_CFG.dwellStep || (b.dwell === 0 && b.sentDwell !== 0)) sb.unsent = true;
    }
  }

  /** The gear comes home into the claimant's own bag (a full bag spills at its
   *  feet as OWED property), each piece a pickup-feed row; the body's flash;
   *  the record clears and the file writes. */
  private reclaim(seat: Seat, sb: SeatBodies, b: Standing, w: World): void {
    const hero = w.seatHero(seat);
    for (const it of b.corpse.loot.items) {
      const item = lootItem(it);
      if (!item) continue; // a patched-out base stays lost, as at any load
      if (!autoPlace(seat.meta.items, item)) {
        const d0 = w.drops.length;
        w.dropGearAt(hero.pos, item, undefined, true);
        w.ownSpoils(d0, seat); // THE SPOILS' OWNER (card 27): owed property is the claimant's
      }
      notePickup(w.pickupFeed, seat.id, item.name, ITEM_RARITIES[item.rarity]?.color ?? SHARD_CORPSE_CFG.flash.color, w.time);
    }
    w.markMetaDirty(seat);
    const { radius, life, color } = SHARD_CORPSE_CFG.flash;
    w.flashes.push({ pos: vec(b.pos.x, b.pos.y), radius, color: transitRing('corpse_reclaim').color ?? color, life, maxLife: life });
    // THE OBJECTIVE WEB's corpse deed belongs to the claimant's account: it
    // rides the next row home, stage-gated like every account feed.
    if (stageOf(seat.meta.modeId, seat.meta.modeStage).metaProgression) sb.reclaimed++;
    this.reclaims++;
    this.log(`[shard] ${seat.id} reclaimed ${b.corpse.name}'s body (${b.corpse.loot.items.length} pieces)`);
    this.remove(b.corpse.id); // every seat of this account re-stands
  }

  private ship(seat: Seat, sb: SeatBodies, w: World): void {
    const bodies: ShardBodyRow[] = sb.bodies.map(b => ({
      id: b.corpse.id, x: b.pos.x, y: b.pos.y, classId: b.corpse.classId, level: b.corpse.level, dwell: b.dwell,
    }));
    for (const b of sb.bodies) b.sentDwell = b.dwell;
    this.send({ t: 'corpses', zoneId: sb.zoneId ?? w.zone.id, bodies, ...(sb.reclaimed ? { reclaimed: sb.reclaimed } : {}) }, seat.id);
    sb.reclaimed = 0;
    sb.unsent = false;
  }
}

/** One saved loot piece rebuilt as its EXACT self, as a bag item (the engine
 *  reclaim's dropSavedLoot, delivered to a bag instead of the ground). */
function lootItem(it: SavedLoot): ItemInstance | null {
  if (it.kind === 'gear') return rebuildAnyItem(it.item);
  if (it.kind === 'skill') {
    const inst = rebuildSkill(it);
    return inst ? makeSkillGemItem(inst) : null;
  }
  const def = SUPPORTS[it.supportId];
  return def ? makeSupportGemItem({ def, level: it.level, ...(it.rolled ? { rolled: { ...it.rolled } } : {}) }) : null;
}
