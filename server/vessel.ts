// ---------------------------------------------------------------------------
// THE VESSEL desk: card 6 as ruled (docs/design/shard-world.md §3.5; her word
// 2026-10-07) — "the server's world is persistent ... when a (mortal) player
// dies, they drop their corpse at the death location on the server and the
// run ends ... the player itself is client-based and it's equivalent to
// having their character die in a normal run." Contract:
// docs/engine/shard.md "The vessel and the corpse".
//
//   THE VESSEL   the client keeps its hero save and uploads it at login on
//                its `join` (the couch guest's shape: a CharacterSave with NO
//                world half). The shard JUDGES it (judgeVessel: shape, size,
//                schema, class, id) and grafts it onto the joiner's seat the
//                way a couch guest's vessel grafts (rebuildSavedMeta +
//                World.adoptSeatMeta) plus the seat-scoped half of the local
//                resume (the seated heal, flask banks, primed pours, guard
//                clocks, fielded bonds and rosters). A vessel that fails the
//                judgment joins as the fresh hero it would have been, with
//                one log line.
//   THE MIRROR   on the shard's persistence beat, at the client's farewell
//                and at a clean shutdown the shard serializes each vessel
//                seat (serializeCouchGuest's shape, no world) and ships it
//                home as `session heroSave`, to that seat alone.
//   THE DEATH    a MORTAL vessel (its stage's onDeath ends the run — read
//   COVENANT     from meta/modes.ts, never a mode id) whose down only THE
//                MERCY would answer FALLS instead: its worn gear stays on the
//                shard as a corpse keyed by its account (server/corpses.ts),
//                its fall is TOMBSTONED, the client hears `corpse` (where it
//                lies + the reckoning appraised here) then `runEnd`, and the
//                seat leaves the world. Immortal vessels and fresh heroes
//                keep THE MERCY as M0 shipped it: updateDownedSeats' law is
//                untouched; the covenant only acts before it would.
// ---------------------------------------------------------------------------

import { MAX_LEARNED_SKILLS, type Seat, type World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { recentIndex } from '../src/engine/recency';
import { COOP_SCALING } from '../src/data/coop';
import { dist } from '../src/core/math';
import { MASS_ZONE } from '../src/worldmass/preset';
import { CLASSES, type ClassDef } from '../src/data/classes';
import { MONSTERS } from '../src/data/monsters';
import { walletBreakdown, walletMortalValue } from '../src/data/essences';
import { ITEM_RARITIES } from '../src/engine/items';
import { SKILL_RARITIES } from '../src/engine/skills';
import { RARITY_DEFS } from '../src/engine/rarity';
import { flaskChargeBanks, restoreFlaskChargeBanks } from '../src/engine/flaskState';
import type { CompanionSaved } from '../src/engine/companionSpec';
import { RemoteInput } from '../src/net/remote';
import type { PeerInfo } from '../src/net/transport';
import type { ShardCorpseNote, ShardReckoning } from '../src/net/vesselWire';
import { isCurrentCharacterSave } from '../src/meta/saveCompatibility';
import { rebuildSavedMeta, serializeCouchGuest, throngRowsOf, type CharacterSave } from '../src/meta/character';
import { captureLoot } from '../src/meta/death';
import { stageOf } from '../src/meta/modes';
import { isAccountId, renownForRun } from '../src/meta/account';
import type { SeatSend, ShardCorpses } from './corpses';
import type { SeatWorlds } from './simUnits';

export const VESSEL_CFG = {
  /** The largest vessel (JSON characters) a join may graft. The wire's own
   *  frame cap (SHARD_WIRE_CFG.maxClientMessage) bounds the whole join first. */
  maxBytes: 240 * 1024,
  /** THE JUDGMENT's structural rails: no hostile upload ever grafts. */
  maxLevel: 999,
  maxDepth: 24,
  maxNodes: 60_000,
  maxString: 4096,
  maxName: 64,
  maxCharId: 64,
  maxBar: 32,
  /** Item uids stay under the process's safe floor (rebuildItem bumps the
   *  uid counter above every uid it restores). */
  maxItemUid: 0x7fffffff,
  /** THE COVENANT's moment. 'mercy' = a mortal vessel falls when its down is
   *  one only the keeper's mercy would answer (no other player stands to
   *  kneel, THE MERCY's own read): co-op's revive law stays whole while one
   *  does. 'down' = every down of a mortal vessel is its death. */
  covenantAt: 'down' as 'mercy' | 'down', // her ruling 2026-10-08 (card 14 C): every lethal down is the death, as in single player
  /** THE FRESH HERO'S END (card 14 C): a seat with no vessel (an old build's join, a
   *  refused upload) that falls ends the same way — `runEnd` to its client and the
   *  seat gone — with no body to reclaim (it carried nothing of its own). Immortal
   *  contracts keep THE MERCY either way. */
  freshHeroDies: true,
  /** THE FAREWELL's throttle: a seat's requested mirror (`session leaving`)
   *  is honored at most once per this many world seconds. */
  farewellEverySec: 2,
  /** THE ACTING SEAT (the death beat): seconds a fallen body stands dead and
   *  untargetable on the wire before its client hears `runEnd` and the seat
   *  leaves, so the killing blow is seen; 0 = at once. */
  deathBeatSec: 1.5,
  /** THE ACTING SEAT (the leave mid-fight): a deliberate leave by a standing
   *  hero hurt, or hurting, within this many seconds goes DORMANT like a
   *  dropped socket (never the farewell mirror). */
  combatLeaveSec: 8,
  /** THE ACTING SEAT (places walked): on the Unbroken Wilds (one zone) a place
   *  is a surface cell this wide, about a classic zone's span; elsewhere a
   *  place is a zone. */
  placeCellPx: 2000,
};

/** THE ACTING SEAT (a refused hero): the refusals that are the player's door
 *  and never the vessel's fault. Their client hears the word and stays home;
 *  any other refusal sends the hero back to Mu to wake one that can travel. */
const REFUSAL = {
  twin: 'this hero already walks this world',
  noAccount: 'this client keeps no account to carry a hero by',
};
/** The recency ledger's counters the leave mid-fight reads (engine/recency.ts). */
const HURT = recentIndex('hurt'), HIT = recentIndex('hit');
/** A seat's own hero (World.seatHero's fold, which reads no World). */
const heroOf = (seat: Seat): Actor => seat.home ?? seat.actor;

/** A judged vessel: the save (its world half dropped) and the rebuilt build. */
type Built = NonNullable<ReturnType<typeof rebuildSavedMeta>>;
export type VesselJudgment = { save: CharacterSave; built: Built } | { refused: string };

const plainObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nonNeg = (v: unknown): boolean => num(v) && v >= 0;
const strArray = (v: unknown): boolean => Array.isArray(v) && v.every(x => typeof x === 'string');
const numRecord = (v: unknown): boolean => plainObj(v) && Object.values(v).every(num);
const optional = (v: unknown, ok: (x: unknown) => boolean): boolean => v === undefined || ok(v);

/** The whole tree, once: depth, node count, string length, finite numbers
 *  (JSON can carry 1e999, which parses to Infinity). */
function scanRefusal(root: unknown): string | null {
  let nodes = 0;
  const walk = (v: unknown, depth: number): string | null => {
    if (++nodes > VESSEL_CFG.maxNodes) return 'too many parts';
    if (depth > VESSEL_CFG.maxDepth) return 'nested too deep';
    if (typeof v === 'number') return Number.isFinite(v) ? null : 'a number that is not finite';
    if (typeof v === 'string') return v.length > VESSEL_CFG.maxString ? 'a string too long' : null;
    if (!v || typeof v !== 'object') return null;
    for (const child of Array.isArray(v) ? v : Object.values(v)) {
      const why = walk(child, depth + 1);
      if (why) return why;
    }
    return null;
  };
  return walk(root, 0);
}

const MOD_KINDS = new Set(['flat', 'increased', 'more', 'override', 'link']);
const socketOk = (s: unknown): boolean => s === null || (plainObj(s) && typeof s.supportId === 'string' && num(s.level)
  && optional(s.rolled, r => plainObj(r) && Object.values(r).every(x => typeof x === 'string')));
const savedSkillOk = (s: unknown): boolean => plainObj(s) && typeof s.skillId === 'string' && num(s.level)
  && Array.isArray(s.sockets) && s.sockets.every(socketOk) && optional(s.treeNodes, strArray)
  && optional(s.rarity, r => typeof r === 'string' && Object.hasOwn(SKILL_RARITIES, r));
const itemOk = (i: unknown): boolean => plainObj(i) && Number.isSafeInteger(i.uid) && (i.uid as number) > 0
  && (i.uid as number) <= VESSEL_CFG.maxItemUid && typeof i.baseId === 'string'
  && typeof i.rarity === 'string' && Object.hasOwn(ITEM_RARITIES, i.rarity)
  && num(i.ilvl) && num(i.tier) && num(i.baseRoll) && Array.isArray(i.implicitRolls) && i.implicitRolls.every(num)
  && Array.isArray(i.affixes) && i.affixes.every(a => plainObj(a) && typeof a.id === 'string' && num(a.tier))
  && optional(i.sockets, Array.isArray) && optional(i.uniqueRolls, r => Array.isArray(r) && r.every(num))
  && optional(i.gem, plainObj) && optional(i.mem, Array.isArray) && optional(i.grantState, plainObj)
  && optional(i.uniqueChoices, plainObj) && optional(i.name, n => typeof n === 'string');
const modOk = (m: unknown): boolean => plainObj(m) && typeof m.stat === 'string' && typeof m.kind === 'string'
  && MOD_KINDS.has(m.kind) && num(m.value) && optional(m.fromStat, x => typeof x === 'string')
  && optional(m.gauge, x => typeof x === 'string') && optional(m.gaugeAt, num) && optional(m.tags, strArray)
  && optional(m.when, x => typeof x === 'string');
const companionOk = (c: unknown): boolean => plainObj(c) && typeof c.defId === 'string' && Object.hasOwn(MONSTERS, c.defId)
  && num(c.level) && typeof c.skillId === 'string' && optional(c.downed, x => typeof x === 'boolean')
  && optional(c.reviveRemaining, num) && optional(c.name, x => typeof x === 'string')
  && optional(c.radius, x => num(x) && x > 0) && optional(c.spawnScale, x => num(x) && x > 0)
  && optional(c.rarity, r => typeof r === 'string' && Object.hasOwn(RARITY_DEFS, r))
  && optional(c.raritySources, rs => Array.isArray(rs) && rs.every(p => Array.isArray(p) && p.length === 2
    && typeof p[0] === 'string' && Array.isArray(p[1]) && p[1].every(modOk)));
const throngOk = (r: unknown): boolean => plainObj(r) && typeof r.skillId === 'string' && typeof r.defId === 'string'
  && num(r.level) && nonNeg(r.count);

/** The shape a CharacterSave must hold before rebuildSavedMeta may read it
 *  (every field the rebuild, the graft and the recalc dereference). */
function shapeRefusal(s: CharacterSave): string | null {
  const scan = scanRefusal(s);
  if (scan) return scan;
  if (JSON.stringify(s).length > VESSEL_CFG.maxBytes) return 'too large';
  if (!isCurrentCharacterSave(s)) return 'a save from another version';
  if (typeof s.classId !== 'string' || !CLASSES.some(c => c.id === s.classId)) return 'an unknown class';
  if (typeof s.charId !== 'string' || !s.charId || s.charId.length > VESSEL_CFG.maxCharId) return 'no character id';
  if (!Number.isInteger(s.level) || s.level < 1 || s.level > VESSEL_CFG.maxLevel) return 'a level out of range';
  if (!nonNeg(s.xp) || !nonNeg(s.xpNeeded) || !nonNeg(s.passivePoints) || !optional(s.vocationPoints, nonNeg)) return 'bad points';
  if (!numRecord(s.baseAttrs)) return 'bad attributes';
  if (!strArray(s.allocated)) return 'a bad allocation';
  const barOk = (b: unknown): boolean => Array.isArray(b) && b.length <= VESSEL_CFG.maxBar && b.every(x => x === null || typeof x === 'string');
  if (!barOk(s.bar) || !optional(s.opening, barOk)) return 'a bad bar';
  if (!Array.isArray(s.knownSkills) || !s.knownSkills.every(savedSkillOk)) return 'bad skills';
  if (!optional(s.skillInv, v => Array.isArray(v) && v.every(savedSkillOk))) return 'bad legacy skills';
  if (!optional(s.inventory, v => Array.isArray(v) && v.every(x => x !== null && socketOk(x)))) return 'bad legacy supports';
  if (!optional(s.items, v => Array.isArray(v) && v.every(itemOk))) return 'a bad bag';
  if (!optional(s.equipped, v => plainObj(v) && Object.values(v).every(itemOk))) return 'a bad doll';
  if (!optional(s.containers, v => plainObj(v) && Object.values(v).every(h => Array.isArray(h) && h.every(itemOk)))) return 'bad boards';
  if (!optional(s.stash, v => plainObj(v) && Array.isArray(v.items) && v.items.every(itemOk))) return 'a bad stash';
  for (const wallet of [s.essences, s.abilityEssences, s.vestiges, s.realmPoints, s.flaskCharges, s.guardIntervention]) {
    if (!optional(wallet, numRecord)) return 'a bad wallet';
  }
  if (!optional(s.choices, v => plainObj(v) && Object.values(v).every(strArray))) return 'bad choices';
  if (!optional(s.grafts, v => plainObj(v) && Object.values(v).every(x => x === null || typeof x === 'string'))) return 'bad grafts';
  if (!optional(s.vocations, strArray) || !optional(s.stances, plainObj)) return 'bad vocations or stances';
  if (!optional(s.companions, v => Array.isArray(v) && v.every(companionOk))) return 'bad companions';
  if (!optional(s.throng, v => Array.isArray(v) && v.every(throngOk))) return 'a bad throng';
  if (!optional(s.primedPours, Array.isArray) || !optional(s.deaths, Array.isArray)) return 'bad pours or corpse ring';
  if (!optional(s.modeId, x => typeof x === 'string') || !optional(s.modeStage, x => Number.isInteger(x) && (x as number) >= 0)) return 'a bad life-contract';
  if (!optional(s.name, x => typeof x === 'string' && x.length <= VESSEL_CFG.maxName)) return 'a bad name';
  return null;
}

/** THE JUDGMENT: every vessel passes here before anything grafts. The world
 *  half never travels (dropped first, unread); the rest must hold its shape
 *  and rebuild against the live registries. */
export function judgeVessel(raw: unknown): VesselJudgment {
  if (!plainObj(raw)) return { refused: 'not a character' };
  const { world: _ground, ...save } = raw as unknown as CharacterSave;
  const why = shapeRefusal(save);
  if (why) return { refused: why };
  let built: ReturnType<typeof rebuildSavedMeta> = null;
  try { built = rebuildSavedMeta(save); } catch (e) { return { refused: `a build that will not rebuild (${String(e)})` }; }
  return built ? { save, built } : { refused: 'an unknown class' };
}

const classOf = (id: string | undefined): ClassDef => CLASSES.find(c => c.id === id) ?? CLASSES[0];

/** The word a fall owes its client: where the body lies and what it minted. */
type FallWord = { note: ShardCorpseNote; reckoning: ShardReckoning };

/** One vessel seat's standing record. */
export interface VesselSeat {
  seatId: string;
  accountId: string;
  charId: string;
  /** The judged upload: what the shard never fields rides home verbatim. */
  upload: CharacterSave;
  /** Bonds the shard did not field (their skill unknown to the build): they
   *  sleep through the session and ride home as they came. */
  dormant: CompanionSaved[];
  /** THE ACTING SEAT: the places this vessel walked on the shard (zones; on
   *  the wilds, surface cells of VESSEL_CFG.placeCellPx). Its kills are the
   *  seat's own tally (World.seatKills), never the server's. */
  places: Set<string>;
  /** Mirrors shipped home (the probe's read). */
  mirrors: number;
  /** World time of the last requested mirror (THE FAREWELL's throttle). */
  askedAt: number;
}

export class VesselDesk {
  private readonly vessels = new Map<string, VesselSeat>();
  /** Every seat that named an account at its join (rejoins re-read it). */
  private readonly accounts = new Map<string, string>();
  private beat: number;
  /** Mortal vessels the covenant has taken since boot (the probe's read). */
  falls = 0;
  /** Fresh (vessel-less) heroes whose down ended them since boot (THE FRESH HERO'S END). */
  freshFalls = 0;
  /** THE ACTING SEAT (the death beat): seats whose fall is decided, their body
   *  standing dead on the wire until `until` (the desk's clock); then the word
   *  goes home (`tell`: `corpse` when a body was recorded, then `runEnd`) and
   *  the seat leaves. */
  private readonly beats = new Map<string, { until: number; tell: boolean; word?: FallWord }>();
  /** The desk's own seconds (summed tick dt: a beat ends even on a world whose frame faults). */
  private clock = 0;

  constructor(
    /** THE DESKS PER UNIT (shard M1): every read that was the one World reads the seat's own unit. */
    private readonly units: SeatWorlds,
    private readonly send: SeatSend,
    private readonly corpses: ShardCorpses,
    private readonly opts: {
      beatSec: number; log: (line: string) => void;
      /** THE GROUP LAW (card 14 clarified / card 23): a seat's party mates, itself included. */
      party?: (seatId: string) => readonly string[];
      /** A seat the covenant removed from the world (the party desk drops it). */
      onSeatGone?: (seatId: string) => void;
    },
  ) {
    this.beat = opts.beatSec;
  }

  /** The account a connected seat named at its join (rejoins keep it). */
  accountOf(seatId: string): string | undefined { return this.accounts.get(seatId); }
  /** The vessel record standing on a seat, if one traveled. */
  vesselOf(seatId: string): Readonly<VesselSeat> | undefined { return this.vessels.get(seatId); }

  /** THE JOIN: seat the peer as its uploaded vessel when the judgment allows;
   *  a join with no vessel is the fresh hero of its chosen class (M0's join).
   *  Null = THE LATE WORD (the upload is a vessel that already fell here and
   *  its client never heard; it hears now, `corpse` then `runEnd`, and joins
   *  no seat until its class pick's `rejoin`) or THE ACTING SEAT's refusal (a
   *  vessel the shard will not seat is never seated fresh: `refused`). */
  seat(peer: PeerInfo, rawVessel: unknown): Seat | null {
    const w = this.units.keeperWorld(); // THE HEARTH WAKE: a join lands in the keeper
    const accountId = isAccountId(peer.accountId) ? peer.accountId : undefined;
    if (accountId) this.accounts.set(peer.id, accountId); else this.accounts.delete(peer.id);
    let judged: VesselJudgment | null = rawVessel === undefined || rawVessel === null ? null : judgeVessel(rawVessel);
    if (judged && 'save' in judged) {
      const charId = judged.built.meta.charId;
      const word = accountId ? this.corpses.fallenWord(accountId, charId) : undefined;
      if (word) {
        this.send({ t: 'corpse', note: word.note, reckoning: word.reckoning }, peer.id);
        this.send({ t: 'runEnd' }, peer.id);
        this.opts.log(`[shard] ${peer.id} uploaded ${word.note.name}, who fell here; it hears the word now`);
        return null;
      }
      if (!accountId) judged = { refused: REFUSAL.noAccount };
      else if (this.corpses.hasFallen(accountId, charId)) judged = { refused: 'this vessel already fell on this shard' };
      else if ([...this.vessels.values()].some(v => v.accountId === accountId && v.charId === charId)) judged = { refused: REFUSAL.twin };
    }
    if (judged && 'refused' in judged) { this.refuse(peer.id, judged.refused); return null; }
    const vessel = judged && 'save' in judged ? judged : null;
    const seat = w.addSeat(peer.id, classOf(vessel?.save.classId ?? peer.classId), new RemoteInput(peer.id),
      vessel ? { startingCompanions: false, startingFlasks: false } : undefined);
    if (vessel && accountId) {
      try {
        this.graft(seat, vessel.save, vessel.built, accountId);
      } catch (e) {
        // A graft that will not stand leaves no half-built hero behind.
        this.vessels.delete(peer.id);
        w.removeSeat(peer.id);
        this.refuse(peer.id, `a build that will not stand (${String(e)})`);
        return null;
      }
    }
    this.corpses.join(peer.id, accountId);
    return seat;
  }

  /** The graft: the couch guest's (rebuildSavedMeta + adoptSeatMeta) plus the
   *  seat-scoped half of applySavedCharacter. The run ledger, objective
   *  clears, corpse spawning, annex and claim ledgers are the WORLD's here. */
  private graft(seat: Seat, save: CharacterSave, built: Built, accountId: string): void {
    const w = this.units.keeperWorld();
    // THE SEATED HEAL (the local resume's own): learned skills off the bar take free seats.
    const bar = [...save.bar];
    while (bar.length < MAX_LEARNED_SKILLS) bar.push(null);
    for (const id of built.meta.knownSkills.keys()) {
      if (bar.includes(id)) continue;
      const free = bar.findIndex(b => b === null);
      if (free >= 0) bar[free] = id;
    }
    w.adoptSeatMeta(seat, built.meta, bar, save.level);
    seat.couchDeaths = built.deaths; // the vessel's own corpse ring rides through (the couch precedent)
    const hero = w.seatHero(seat);
    hero.guardIntervention = Object.fromEntries(Object.entries(save.guardIntervention ?? {})
      .filter(([, left]) => Number.isFinite(left) && left > 0));
    restoreFlaskChargeBanks(hero, save.flaskCharges);
    // THE ACTING SEAT (the traveller's flasks): a traveller who left home before
    // the innkeep's welcome gift is dealt it here (this world's innkeep answers
    // only its keeper); its OWN ledger decides and remembers, never the shard's.
    w.dealTravellerFlasks(seat, save.ledger ??= {});
    // The bonds whose skill the build knows take the field beside it; the
    // rest sleep through the session (the local resume's stash rule).
    const fielded: CompanionSaved[] = [], dormant: CompanionSaved[] = [];
    for (const c of save.companions ?? []) (built.meta.knownSkills.has(c.skillId) ? fielded : dormant).push(c);
    if (fielded.length) w.restoreCompanions(fielded, hero);
    if (save.throng?.length) w.restoreThrong(save.throng, hero);
    hero.primedPours = (save.primedPours ?? []).filter(e => e && typeof e.skillId === 'string')
      .map(e => ({ skillId: e.skillId, chargesSpent: Math.max(0, Math.floor(e.chargesSpent ?? 0)),
        ...(e.aim && Number.isFinite(e.aim.x) && Number.isFinite(e.aim.y) ? { aim: { x: e.aim.x, y: e.aim.y } } : {}) }));
    const life = hero.maxLife();
    if (!Number.isFinite(life) || life <= 0 || !Number.isFinite(hero.life)) throw new Error('the build does not stand');
    this.vessels.set(seat.id, {
      seatId: seat.id, accountId, charId: built.meta.charId, upload: save, dormant,
      places: new Set(), mirrors: 0, askedAt: -Infinity, // (places fill from the tick: the graft stands the seat beside the keeper, the hearth wake moves it after)
    });
  }

  // ---- THE MIRROR -----------------------------------------------------------
  /** The vessel as it stands, in the couch guest's shape (no world half): the
   *  build and carry live off the seat; what the shard never fielded (its run
   *  ledger and config, its contracts, its sleeping bonds) rides home as it
   *  came; what the shard fielded (bonds, rosters, flask banks, pours, guard
   *  clocks) comes home as it stands. */
  serialize(seatId: string): CharacterSave | null {
    const rec = this.vessels.get(seatId);
    const seat = rec ? this.units.seatOf(seatId) : undefined;
    if (!rec || !seat) return null;
    // THE DESKS PER UNIT: the vessel mirrors home from the unit it stands in, its companions with it.
    return this.units.within(seatId, w => this.serializeIn(w, seat, rec)) ?? null;
  }
  private serializeIn(w: World, seat: Seat, rec: VesselSeat): CharacterSave {
    const hero = w.seatHero(seat), up = rec.upload;
    const save: CharacterSave = {
      ...serializeCouchGuest(w, seat, { companions: [], throng: [], throngClaimed: up.throngClaimed ?? [] }),
      // THE PASS-THROUGH: the vessel's own, never the shard's.
      ledger: { ...(up.ledger ?? {}) },
      completedObjectives: [],
      // THE LIVE HALF: as the shard holds it.
      companions: [
        ...w.actors.filter(a => a.companion && !a.dead && a.owner === hero && a.defId).map(a => w.companionBonds.saved(a)),
        ...rec.dormant.map(c => ({ ...c })),
      ],
      throng: throngRowsOf(w, hero),
      flaskCharges: flaskChargeBanks(hero),
      guardIntervention: { ...hero.guardIntervention },
      ...(hero.primedPours.length ? { primedPours: hero.primedPours.map(e => ({ ...e })) } : {}),
      ...(up.mercenaries ? { mercenaries: up.mercenaries } : {}),
      ...(up.mercenary ? { mercenary: up.mercenary } : {}),
    };
    // Its run config and reveal ledger are its own too (the shard's manifest
    // and annex finds belong to the shard).
    if (up.expedition) save.expedition = up.expedition; else delete save.expedition;
    if (up.annexFound) save.annexFound = [...up.annexFound]; else delete save.annexFound;
    return save;
  }

  /** Ship one vessel's mirror home (`session heroSave`, to that seat alone). */
  mirror(seatId: string): boolean {
    let save: CharacterSave | null;
    try { save = this.serialize(seatId); }
    catch (e) { this.opts.log(`[shard] ${seatId}'s mirror failed: ${String(e)}`); return false; }
    if (!save) return false;
    this.send({ t: 'heroSave', save }, seatId);
    this.vessels.get(seatId)!.mirrors++;
    return true;
  }

  /** Every vessel home at once (the beat, a clean shutdown). */
  mirrorAll(): number {
    let n = 0;
    for (const id of [...this.vessels.keys()]) if (this.mirror(id)) n++;
    return n;
  }

  /** THE FAREWELL (`session leaving`): the client asks for its last mirror
   *  before its socket closes; honored once per VESSEL_CFG.farewellEverySec. */
  requestMirror(seatId: string): boolean {
    const rec = this.vessels.get(seatId);
    const now = this.units.keeperWorld().time; // THE ONE CLOCK
    if (!rec || now - rec.askedAt < VESSEL_CFG.farewellEverySec) return false;
    rec.askedAt = now;
    return this.mirror(seatId);
  }

  /** A connection closed: forget its seat (the world despawns it). A mortal
   *  vessel that leaves while DOWN has fallen: leaving is never the road out
   *  of a death (its body and tombstone are banked; its client hears THE LATE
   *  WORD at its next upload of that vessel). A seat already in its death
   *  beat has fallen too: its word waits in the tombstone. */
  leave(seatId: string): void {
    const rec = this.vessels.get(seatId);
    const seat = rec ? this.units.seatOf(seatId) : undefined;
    if (rec && seat && this.downed(seat) && this.endsTheRun(seat)) this.fall(seat, rec, false);
    this.beats.delete(seatId);
    this.vessels.delete(seatId);
    this.accounts.delete(seatId);
    this.corpses.leave(seatId);
  }

  /** A join the desk will not seat (THE ACTING SEAT: never a fresh hero in its
   *  place). A door refusal (REFUSAL) is the word alone; any other sends the
   *  hero back to Mu bound for this world (`mu`). */
  private refuse(seatId: string, why: string): void {
    const door = why === REFUSAL.twin || why === REFUSAL.noAccount;
    this.send(door ? { t: 'refused', word: why } : { t: 'refused', word: `this hero cannot travel to this world (${why})`, mu: true }, seatId);
    this.opts.log(`[shard] ${seatId}'s vessel refused (${why}); ${door ? 'it hears the word' : 'it goes back to Mu'}`);
  }

  /** THE ACTING SEAT (the leave mid-fight): a standing hero hurt, or hurting,
   *  within VESSEL_CFG.combatLeaveSec (the actor's recency ledger) is in a
   *  fight, and its deliberate leave sleeps like a lost socket
   *  (ShardTransport.leaveHolds) with no farewell mirror. A downed or dead
   *  hero keeps the older laws (a leave while down is the fall). */
  inCombat(seatId: string): boolean {
    const seat = this.units.seatOf(seatId);
    if (!seat || this.downed(seat)) return false;
    const fought = (a: Actor): boolean => Math.min(a.since[HURT], a.since[HIT]) < VESSEL_CFG.combatLeaveSec;
    return fought(seat.actor) || fought(heroOf(seat));
  }

  /** THE ACTING SEAT (places walked): where a seat stands, as the reckoning
   *  counts places (a zone; on the Unbroken Wilds, a surface cell). */
  private placeOf(seat: Seat): string {
    const zone = (this.units.worldOf(seat.id) ?? this.units.keeperWorld()).zone.id; // the seat's own unit
    if (zone !== MASS_ZONE) return zone;
    const p = heroOf(seat).pos, c = VESSEL_CFG.placeCellPx;
    return `${zone}@${Math.floor(p.x / c)},${Math.floor(p.y / c)}`;
  }

  // ---- the tick ---------------------------------------------------------------
  /** After the engine step: the places walked, THE DEATH COVENANT (before THE
   *  MERCY's clock could ever stand a mortal vessel back up: the covenant
   *  reads the down the same tick it lands, the mercy needs reviveSec), the
   *  death beats that ran out, then the mirror beat. */
  tick(dt: number): void {
    this.clock += dt;
    for (const rec of this.vessels.values()) {
      const seat = this.units.seatOf(rec.seatId);
      if (seat && !this.downed(seat)) rec.places.add(this.placeOf(seat));
    }
    // THE DEATH COVENANT across units: every seat judged in its own unit.
    for (const rec of [...this.vessels.values()]) {
      const seat = this.units.seatOf(rec.seatId);
      if (seat && this.covenantDue(seat)) this.fall(seat, rec);
    }
    // THE FRESH HERO'S END (card 14 C): a vessel-less seat whose stage ends on death
    // ends here too — no mercy clock ever stands a mortal back up on a shard.
    if (VESSEL_CFG.freshHeroDies) {
      for (const seat of this.units.allSeats()) {
        if (seat.keeper || this.vessels.has(seat.id) || this.beats.has(seat.id)
          || !this.downed(seat) || !this.endsTheRun(seat) || this.partyHolds(seat)) continue;
        this.freshFall(seat);
      }
    }
    // THE DEATH BEAT runs out: the word goes home and the seat leaves.
    for (const [id, beat] of [...this.beats]) {
      if (this.clock < beat.until) continue;
      this.beats.delete(id);
      const seat = this.units.seatOf(id);
      if (seat) this.endFall(seat, beat.tell, beat.word);
    }
    this.beat -= dt;
    if (this.beat <= 0) {
      this.beat = this.opts.beatSec;
      this.mirrorAll();
    }
  }

  /** THE GROUP LAW (her word 2026-10-09): inside a party a lethal down is a DOWN while a
   *  mate who could kneel stands, and the covenant fells the downed only when none does
   *  (THE PARTY WIPE); an ungrouped seat is single player's. THE ACTING SEAT: "could
   *  kneel" is a standing mate within the near radius (COOP_SCALING.shareRadius, the
   *  killer's due's own reach), never one a continent away. */
  private partyHolds(seat: Seat): boolean {
    const mates = this.opts.party?.(seat.id) ?? [seat.id];
    if (mates.length <= 1) return false;
    return this.units.allSeats().some(o => o !== seat && mates.includes(o.id) && this.couldKneel(o, seat));
  }
  /** A standing player within the near radius of a down (radius 0 = anywhere), and
   *  IN THE SAME UNIT (THE DESKS PER UNIT: positions in two Worlds are not comparable). */
  private couldKneel(o: Seat, down: Seat): boolean {
    if (o.keeper || o.actor.dead || o.actor.downed || !this.units.together(o.id, down.id)) return false;
    const r = COOP_SCALING.shareRadius;
    return r <= 0 || dist(heroOf(o).pos, heroOf(down).pos) <= r;
  }

  /** Is this seat's down a mortal vessel's death? The stage's own policy
   *  decides (a contract that survives death keeps THE MERCY); a party mate
   *  who could kneel keeps it a down (THE GROUP LAW), and under 'mercy' so
   *  does any player who could. */
  private covenantDue(seat: Seat): boolean {
    if (!this.downed(seat) || !this.endsTheRun(seat)) return false;
    if (this.partyHolds(seat)) return false; // THE GROUP LAW: a mate stands to kneel
    if (VESSEL_CFG.covenantAt === 'mercy' && this.units.allSeats().some(o => o !== seat && this.couldKneel(o, seat))) return false;
    return true;
  }
  private downed(seat: Seat): boolean {
    const hero = heroOf(seat);
    return seat.actor.downed || seat.actor.dead || hero.downed || hero.dead;
  }
  /** The stage's own policy: does a death from it END the run? */
  private endsTheRun(seat: Seat): boolean {
    return stageOf(seat.meta.modeId, seat.meta.modeStage).onDeath === 'end';
  }

  /** THE FRESH HERO'S END: the client hears `runEnd` (its run was never a save) after
   *  THE DEATH BEAT and the seat leaves the world; nothing is recorded: a fresh hero
   *  owns no body worth a walk. */
  private freshFall(seat: Seat): void {
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld();
    this.opts.log(`[shard] ${seat.id}'s fresh hero ${seat.meta.name} fell in ${w.zone.name}: the run ends, nothing to reclaim`);
    this.freshFalls++;
    this.corpses.leave(seat.id);
    this.accounts.delete(seat.id);
    this.beginBeat(seat, true);
  }

  /** THE DEATH COVENANT, decided whole in one frame. `heard` = the client is
   *  still connected to hear its word: THE DEATH BEAT stands the body dead on
   *  the wire first, then the word goes home and the seat leaves (endFall);
   *  unheard (a leave while down), the seat goes at once and the tombstone
   *  keeps the word. */
  private fall(seat: Seat, rec: VesselSeat, heard = true): void {
    // THE DESKS PER UNIT: the body records the seat's own unit (its zone, its spot, its pocket).
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld(), m = seat.meta, hero = w.seatHero(seat), zone = w.zone;
    const stage = stageOf(m.modeId, m.modeStage);
    // THE ACTING SEAT: the seat's own kills and places, never the server's.
    const kills = w.seatKills(seat), zones = Math.max(1, rec.places.size);
    // 1. THE APPRAISAL: this seat's carried essence at the strict mortal
    //    exchange times the dying stage's rate (World.reckonRunEssence's
    //    fold, read for ONE seat), before anything leaves the world.
    const carried = walletMortalValue(m.essences);
    const reckoning: ShardReckoning = {
      rows: walletBreakdown(m.essences), carried, mult: stage.deathPayoutMult,
      minted: Math.floor(carried * stage.deathPayoutMult), renown: renownForRun(hero.level, zones, kills),
      level: hero.level, zones, kills, modeId: m.modeId, modeStage: m.modeStage,
    };
    // 2. THE BODY: the worn and side-board gear, captured as a DeathRecord
    //    captures it; a cave or an empty carry leaves none (the corpse run's law).
    const loot = captureLoot(m);
    const pos = { x: hero.pos.x, y: hero.pos.y }, diedAt = Date.now();
    const body = !w.inCave && loot.items.length ? this.corpses.record({
      accountId: rec.accountId, charId: rec.charId, name: m.name, classId: m.classDef.id, level: hero.level,
      zoneId: zone.id, zoneName: zone.name, pos, map: { x: zone.map.x, y: zone.map.y }, loot, diedAt,
    }) : null;
    // 3. THE WORD it is owed: where it lies and what the fall minted.
    const note: ShardCorpseNote = {
      ...(body ? { id: body.id } : {}), charId: rec.charId, name: m.name, classId: m.classDef.id, level: hero.level,
      zoneId: zone.id, zoneName: zone.name, pos, pieces: body ? loot.items.length : 0, diedAt,
    };
    // 4. THE TOMBSTONE: this vessel never walks onto this shard again, and
    //    the word stays owed beside it (re-spoken at a stale re-upload).
    this.corpses.markFallen(rec.accountId, rec.charId, { note, reckoning });
    // 5. The record closes; the seat leaves the world after THE DEATH BEAT
    //    (heard) or at once, and the body stands instead.
    this.vessels.delete(seat.id);
    this.corpses.leave(seat.id);
    this.falls++;
    this.opts.log(`[shard] ${seat.id}'s vessel ${m.name} fell in ${zone.name}${heard ? '' : ' (leaving while down)'}: `
      + `${body ? `${loot.items.length} pieces lie there` : 'nothing to reclaim'}, ${reckoning.minted} minted`);
    this.beginBeat(seat, heard, { note, reckoning });
  }

  /** THE DEATH BEAT (THE ACTING SEAT): the fallen body stands DEAD and
   *  untargetable on the wire for VESSEL_CFG.deathBeatSec, home in its own
   *  flesh and beyond any revive or mercy (a dead seat is neither downed nor
   *  struck again), so its player and every neighbour see the blow land;
   *  then endFall. A fall no client will hear, or a beat of 0, ends at once. */
  private beginBeat(seat: Seat, tell: boolean, word?: FallWord): void {
    if (!tell || VESSEL_CFG.deathBeatSec <= 0) { this.endFall(seat, tell, word); return; }
    if (seat.home) { try { this.units.within(seat.id, w => w.seatEject(seat, 'released')); } catch { /* the hero falls in its own flesh either way */ } }
    const a = seat.actor;
    a.downed = false; a.dead = true; a.life = 0; a.casting = null; a.untargetable = true;
    seat.reviveDwellBy.clear();
    this.beats.set(seat.id, { until: this.clock + VESSEL_CFG.deathBeatSec, tell, ...(word ? { word } : {}) });
  }

  /** The fall's end: the word home (a recorded fall's `corpse`, then `runEnd`;
   *  the client runs its reckoning and wipes its run slot), then the seat
   *  leaves the world. */
  private endFall(seat: Seat, tell: boolean, word?: FallWord): void {
    if (tell) {
      if (word) this.send({ t: 'corpse', note: word.note, reckoning: word.reckoning }, seat.id);
      this.send({ t: 'runEnd' }, seat.id);
    }
    // THE DESKS PER UNIT: the seat leaves the unit it stands in.
    this.units.within(seat.id, w => {
      if (seat.home) { try { w.seatEject(seat, 'released'); } catch { /* the seat leaves either way */ } }
      w.removeSeat(seat.id);
    });
    this.opts.onSeatGone?.(seat.id);
  }
}
