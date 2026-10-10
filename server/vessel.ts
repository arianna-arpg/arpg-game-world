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
//                seat leaves the world. Fresh heroes whose stage survives
//                death keep THE MERCY as M0 shipped it: updateDownedSeats' law
//                is untouched; the covenant only acts before it would.
//   THE IMMORTAL'S COVENANT ON A SHARD (card 30, RULED A 2026-10-10): the
//                covenant's moment is THE FINAL DOWN for every stage, and the
//                stage's own policy (meta/modes.ts onDeath) picks the outcome:
//                'end' the mortal's fall above; 'advance' / 'stay' THE CROSSING
//                (the tithe, a body by the stage's ring, the carry strip, the
//                ladder's step, THE DEATH BEAT, then THE WAKE at the hearth;
//                `stageDeath` and the mirror home at once); 'fall' THE FALL (the
//                full covenant, then the vessel leaves with `fell` and a FALL
//                RECORD that a later resurrection lifts). A crossing its client
//                never heard is THE OWED CROSSING, enforced at its next upload.
// ---------------------------------------------------------------------------

import { emptyAbilityEssences, emptyEssences, MAX_LEARNED_SKILLS, type Seat, type World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { recentIndex } from '../src/engine/recency';
import { COOP_SCALING } from '../src/data/coop';
import type { DownView } from '../src/net/partyWire'; // THE PARTY THAT READS: the down's read
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
import { modeById, stageOf } from '../src/meta/modes';
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
   *  leaves (THE CROSSING: before it wakes at the hearth), so the killing blow
   *  is seen; 0 = at once. */
  deathBeatSec: 1.5,
  /** THE BLEED-OUT (card 28, RULED B 2026-10-10, her word: "no player may hold another
   *  downed player hostage"): seconds a grouped down waits on its mates once a mate's
   *  standing holds it; a kneel resets the clock to full, and when it runs out the wait
   *  is over: a vessel takes its stage's own death (card 30: the mortal's fall, the
   *  crossing, the fall), a fresh hero's surviving stage goes to THE MERCY. 0 = no clock
   *  (the wait lasts while a mate stands). */
  bleedOutSec: 60,
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
  /** THE FALL RECORD (card 30): an Undying that fell here and has not risen since (back to Mu). */
  fallen: 'fallen',
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
  if (!optional(s.risenAt, nonNeg)) return 'a bad resurrection stamp'; // card 30: THE FALL RECORD reads it
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

/** THE CARRY STRIP on a save (card 30's late roads, THE FALL RECORD's word and THE OWED
 *  CROSSING): what World.stripCarryOf takes from a seat, taken from an upload the shard did not
 *  see die: the bag, the doll, the side boards and both wallets (and the legacy carriers a
 *  rebuild would fold back into the bag); the build, the locker and the ledger walk on. */
function stripSave(save: CharacterSave): CharacterSave {
  const { inventory: _supports, skillInv: _skills, ...rest } = save;
  return { ...rest, items: [], equipped: {}, containers: {}, essences: emptyEssences(), abilityEssences: emptyAbilityEssences(), vestiges: {} };
}

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
  /** THE IMMORTAL'S COVENANT ON A SHARD (card 30): crossings (a stage that survives death,
   *  woken at the hearth) and Undying falls (FALL RECORDS) since boot (the probe's reads). */
  crossings = 0;
  undyingFalls = 0;
  /** THE ACTING SEAT (the death beat): seats whose fall is decided, their body
   *  standing dead on the wire until `until` (the desk's clock); then the word
   *  goes home (`tell`: `corpse` when a body was recorded, `fell` for an Undying's
   *  FALL, then `runEnd`) and the seat leaves, or (`wake`, THE CROSSING) the hero
   *  stands at the hearth instead. */
  private readonly beats = new Map<string, { until: number; tell: boolean; word?: FallWord; fell?: { level: number; at: number }; wake?: true }>();
  /** The desk's own seconds (summed tick dt: a beat ends even on a world whose frame faults). */
  private clock = 0;
  /** THE BLEED-OUT (card 28): a held down's deadline on the desk's clock, set at the first
   *  tick a mate's standing holds it, reset to full while a mate kneels, gone when it stands. */
  private readonly bleeds = new Map<string, number>();
  /** THE RELEASE: downed seats whose player gave up the wait (the interact press). */
  private readonly released = new Set<string>();

  constructor(
    /** THE DESKS PER UNIT (shard M1): every read that was the one World reads the seat's own unit. */
    private readonly units: SeatWorlds,
    private readonly send: SeatSend,
    private readonly corpses: ShardCorpses,
    private readonly opts: {
      beatSec: number; log: (line: string) => void;
      /** THE GROUP LAW (card 14 clarified / card 23): a seat's party mates, itself included. */
      party?: (seatId: string) => readonly string[];
      /** A seat the covenant removed from the world, with the name it wore (the party desk
       *  holds its place: THE HELD PLACE). */
      onSeatGone?: (seatId: string, name: string) => void;
      /** THE WAKE (card 30, THE CROSSING): the host lands a crossed hero, stood up, at THE
       *  HEARTH SEAT through the landing law a hand-off uses, under THE SPAWN GRACE. */
      wake?: (seat: Seat) => void;
      /** Does this seat's client hear its words now (its socket live, never dormant)? A
       *  crossing it cannot hear is THE OWED CROSSING. Absent = always. */
      connected?: (seatId: string) => boolean;
    },
  ) {
    this.beat = opts.beatSec;
  }

  /** The account a connected seat named at its join (rejoins keep it). */
  accountOf(seatId: string): string | undefined { return this.accounts.get(seatId); }
  /** The vessel record standing on a seat, if one traveled. */
  vesselOf(seatId: string): Readonly<VesselSeat> | undefined { return this.vessels.get(seatId); }
  /** THE IDENTITY's reclaim (THE SMOOTH SHELL): the DORMANT seat this account's character
   *  `charId` stands on, if any (a player come back without its token takes it, never the
   *  twin refusal); null for a live seat, another account's, or none. */
  dormantSeatOf(accountId: string, charId: string, isDormant: (seatId: string) => boolean): string | null {
    if (!accountId || !charId) return null;
    for (const v of this.vessels.values()) {
      if (v.accountId === accountId && v.charId === charId && isDormant(v.seatId)) return v.seatId;
    }
    return null;
  }

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
    let owed: ReturnType<ShardCorpses['owedCrossing']> = undefined; // THE OWED CROSSING (card 30), when one stands for this upload
    if (judged && 'save' in judged) {
      const charId = judged.built.meta.charId;
      const word = accountId ? this.corpses.fallenWord(accountId, charId) : undefined;
      if (word) {
        this.send({ t: 'corpse', note: word.note, reckoning: word.reckoning }, peer.id);
        this.send({ t: 'runEnd' }, peer.id);
        this.opts.log(`[shard] ${peer.id} uploaded ${word.note.name}, who fell here; it hears the word now`);
        return null;
      }
      // THE IMMORTAL'S COVENANT ON A SHARD (card 30). THE FALL RECORD: an Undying that fell here
      // walks again only when risen since (its card's risenAt later than the record's time); any
      // other upload hears its word again and is refused 'fallen' (THE LATE WORD's shape).
      const fallRec = accountId ? this.corpses.fallRecord(accountId, charId) : undefined;
      if (fallRec && accountId) {
        if ((judged.save.risenAt ?? 0) > fallRec.at) {
          this.corpses.liftFall(accountId, charId);
          this.opts.log(`[shard] ${peer.id} uploaded ${judged.built.meta.name}, risen since its fall here; the fall record lifts`);
        } else {
          this.lateFall(peer.id, judged.save, fallRec);
          return null;
        }
      }
      if (!accountId) judged = { refused: REFUSAL.noAccount };
      else if (this.corpses.hasFallen(accountId, charId)) judged = { refused: 'this vessel already fell on this shard' };
      else if ([...this.vessels.values()].some(v => v.accountId === accountId && v.charId === charId)) judged = { refused: REFUSAL.twin };
      else if ((owed = this.corpses.owedCrossing(accountId, charId))) {
        // THE OWED CROSSING (card 30): a crossing its client never heard crosses this upload on
        // arrival (the carry strip, the ladder's step); the word is spoken once the vessel stands.
        const crossed = judgeVessel({ ...stripSave(judged.save), modeStage: owed.stage ?? judged.save.modeStage });
        judged = 'save' in crossed ? crossed : { refused: crossed.refused };
      }
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
      if (owed?.word) {
        // THE OWED CROSSING heard at last: the crossed vessel home at once, then its word.
        this.corpses.clearOwedCrossing(accountId, owed.charId);
        this.mirror(peer.id);
        this.send({ t: 'stageDeath', note: owed.word.note, reckoning: owed.word.reckoning, stage: vessel.save.modeStage ?? 0 }, peer.id);
        this.opts.log(`[shard] ${peer.id} uploaded ${seat.meta.name}, whose crossing here it never heard: it crosses on arrival and hears the word`);
      }
    }
    this.corpses.join(peer.id, accountId);
    return seat;
  }

  /** THE FALL RECORD's late word (card 30, THE LATE WORD's shape): an Undying that fell here and
   *  has not risen since never takes a seat. Its client hears its fall again, the vessel as the
   *  fall left it first (the upload stripped, so its slot holds what resurrection wakes), then
   *  `fell` (its card stamped if it never heard), then the refusal 'fallen' (back to Mu). */
  private lateFall(peerId: string, save: CharacterSave, rec: NonNullable<ReturnType<ShardCorpses['fallRecord']>>): void {
    this.send({ t: 'heroSave', save: stripSave(save) }, peerId);
    if (rec.word) this.send({ t: 'fell', note: rec.word.note, reckoning: rec.word.reckoning, level: rec.level ?? save.level, at: rec.at }, peerId);
    this.send({ t: 'refused', word: REFUSAL.fallen, mu: true }, peerId);
    this.opts.log(`[shard] ${peerId} uploaded ${save.name ?? save.charId}, who fell here and has not risen since; it hears the word and goes back to Mu`);
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
      ...(up.risenAt !== undefined ? { risenAt: up.risenAt } : {}), // card 30: the risen stamp rides home as it came
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
    const rec = this.vessels.get(seatId)!;
    rec.mirrors++;
    // THE OWED CROSSING (card 30): a mirror its client hears carries home the crossing it never
    // heard (a dormant socket's), its word after it, once.
    const owed = this.opts.connected?.(seatId) === false ? undefined : this.corpses.owedCrossing(rec.accountId, rec.charId);
    if (owed?.word) {
      this.corpses.clearOwedCrossing(rec.accountId, rec.charId);
      this.send({ t: 'stageDeath', note: owed.word.note, reckoning: owed.word.reckoning, stage: owed.stage ?? save.modeStage ?? 0 }, seatId);
    }
    return true;
  }

  /** THE RECONNECT TOKEN (the host's onResume): a dormant vessel's player is back; its mirror goes
   *  home at once (with any crossing it never heard). */
  resumed(seatId: string): void {
    if (this.vessels.has(seatId)) this.mirror(seatId);
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
   *  beat has fallen too: its word waits in the tombstone. THE IMMORTAL'S
   *  COVENANT ON A SHARD (card 30): so for every stage, unheard: an Undying's
   *  FALL RECORD keeps its word, a crossing is THE OWED CROSSING. */
  leave(seatId: string): void {
    const rec = this.vessels.get(seatId);
    const seat = rec ? this.units.seatOf(seatId) : undefined;
    if (rec && seat && !this.beats.has(seatId) && this.downed(seat)) this.stageDeath(seat, rec, false);
    this.beats.delete(seatId);
    this.vessels.delete(seatId);
    this.accounts.delete(seatId);
    this.bleeds.delete(seatId); this.released.delete(seatId); // THE BLEED-OUT, THE RELEASE: nothing outlives the seat
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
    this.tendBleeds(); // THE BLEED-OUT (card 28): every held down's clock, before the covenant reads it
    // THE DEATH COVENANT across units: every seat judged in its own unit, its stage's own policy
    // picking the outcome at THE FINAL DOWN (card 30; a crossing's body in its beat is judged no more).
    for (const rec of [...this.vessels.values()]) {
      const seat = this.units.seatOf(rec.seatId);
      if (seat && !this.beats.has(rec.seatId) && this.covenantDue(seat)) this.stageDeath(seat, rec);
    }
    // THE FRESH HERO'S END (card 14 C): a vessel-less seat whose stage ends on death
    // ends here too — no mercy clock ever stands a mortal back up on a shard.
    if (VESSEL_CFG.freshHeroDies) {
      for (const seat of this.units.allSeats()) {
        if (seat.keeper || this.vessels.has(seat.id) || this.beats.has(seat.id)
          || !this.downed(seat) || !this.endsTheRun(seat) || (this.partyHolds(seat) && !this.waitEnded(seat.id))) continue;
        this.freshFall(seat);
      }
    }
    // THE DEATH BEAT runs out: the word goes home and the seat leaves (THE CROSSING: it wakes).
    for (const [id, beat] of [...this.beats]) {
      if (this.clock < beat.until) continue;
      this.beats.delete(id);
      const seat = this.units.seatOf(id);
      if (seat && beat.wake) this.wake(seat);
      else if (seat) this.endFall(seat, beat.tell, beat.word, beat.fell);
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
  /** THE WIPE RADIUS, SHOWN: the seats whose standing holds a down (partyHolds' own reach). */
  private holdersOf(seat: Seat): string[] {
    const mates = this.opts.party?.(seat.id) ?? [seat.id];
    if (mates.length <= 1) return [];
    return this.units.allSeats().filter(o => o !== seat && mates.includes(o.id) && this.couldKneel(o, seat)).map(o => o.id);
  }

  // ---- THE PARTY THAT READS: THE BLEED-OUT and THE RELEASE (card 28) -------------
  /** A body lying downed: downed, not dead (THE DEATH BEAT's body is dead). */
  private lyingDown(seat: Seat): boolean {
    const a = seat.actor, hero = heroOf(seat);
    return (a.downed || hero.downed) && !a.dead && !hero.dead;
  }
  /** Someone kneels by the body: a revive dwell building on it (THE MERCY's clock is no knee). */
  private kneeled(seat: Seat): boolean {
    if (!seat.reviveDwellBy.size) return false;
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld();
    for (const [id, t] of seat.reviveDwellBy) if (t > 0 && !w.seats.some(s => s.id === id && s.keeper)) return true;
    return false;
  }
  /** THE BLEED-OUT (card 28, RULED B): a down a mate's standing holds starts its clock at the
   *  first tick it is held; a kneel holds the clock full (resets it); a seat standing again,
   *  falling or gone forgets its clock and its release. */
  private tendBleeds(): void {
    for (const id of [...this.bleeds.keys(), ...this.released]) {
      const seat = this.units.seatOf(id);
      if (!seat || !this.lyingDown(seat) || this.beats.has(id)) { this.bleeds.delete(id); this.released.delete(id); }
    }
    const sec = VESSEL_CFG.bleedOutSec;
    if (!(sec > 0)) { this.bleeds.clear(); return; }
    for (const seat of this.units.allSeats()) {
      if (seat.keeper || this.beats.has(seat.id) || !this.lyingDown(seat)) continue;
      if (this.kneeled(seat)) this.bleeds.set(seat.id, this.clock + sec); // a kneel resets the clock to full
      else if (!this.bleeds.has(seat.id) && this.partyHolds(seat)) this.bleeds.set(seat.id, this.clock + sec);
    }
  }
  /** The wait on mates is over: the player released it, or THE BLEED-OUT ran out. A mortal
   *  falls by the covenant; a stage that survives death goes to THE MERCY (World.updateDownedSeats
   *  reads it through World.partyDowns). */
  waitEnded(seatId: string): boolean {
    if (this.released.has(seatId)) return true;
    const until = this.bleeds.get(seatId);
    return VESSEL_CFG.bleedOutSec > 0 && until !== undefined && this.clock >= until;
  }
  /** THE RELEASE (card 28): the player's own choice. A downed seat whose down a mate's standing
   *  holds gives up the wait with its interact press (World.applyAction's pickupItem, through
   *  World.partyDowns): a mortal falls by the covenant this very tick, a stage that survives
   *  death goes to THE MERCY. A press with nothing holding the down changes nothing. True =
   *  the press was taken. */
  release(seatId: string): boolean {
    const seat = this.units.seatOf(seatId);
    if (!seat || seat.keeper || this.beats.has(seatId) || this.released.has(seatId) || !this.lyingDown(seat)) return false;
    if (!this.partyHolds(seat)) return false;
    this.released.add(seatId);
    this.opts.log(`[shard] ${seatId} gave up the wait (THE RELEASE)`);
    return true;
  }
  /** THE PARTY THAT READS: a downed seat's read for its revive row (SeatW.rv): THE BLEED-OUT's
   *  seconds left, the seats whose standing holds it and THE NEAR LAW's radius. Null for a
   *  standing seat or a fallen body. */
  downView(seatId: string): DownView | null {
    const seat = this.units.seatOf(seatId);
    if (!seat || seat.keeper || this.beats.has(seatId) || !this.lyingDown(seat)) return null;
    const ended = this.waitEnded(seatId), until = this.bleeds.get(seatId), sec = VESSEL_CFG.bleedOutSec;
    return {
      ...(!ended && sec > 0 && until !== undefined ? { left: Math.max(0, until - this.clock), total: sec } : {}),
      holders: ended ? [] : this.holdersOf(seat),
      radius: COOP_SCALING.shareRadius,
    };
  }
  /** A standing player within the near radius of a down (radius 0 = anywhere), and
   *  IN THE SAME UNIT (THE DESKS PER UNIT: positions in two Worlds are not comparable). */
  private couldKneel(o: Seat, down: Seat): boolean {
    if (o.keeper || o.actor.dead || o.actor.downed || !this.units.together(o.id, down.id)) return false;
    const r = COOP_SCALING.shareRadius;
    return r <= 0 || dist(heroOf(o).pos, heroOf(down).pos) <= r;
  }

  /** THE FINAL DOWN (card 30, every stage; card 14 C's immediate judgment for the ungrouped):
   *  is this vessel's down its death? A party mate who could kneel keeps it a down (THE GROUP
   *  LAW) until the wait is over (THE RELEASE, THE BLEED-OUT: the one door, `waitEnded`), and
   *  under 'mercy' so does any player who could; the stage's own policy then picks the outcome
   *  (stageDeath). Under the shipped 'down' law THE MERCY never answers a vessel's down: the
   *  covenant reads it the tick its wait ends, the mercy's clock needs reviveSec. */
  private covenantDue(seat: Seat): boolean {
    if (!this.downed(seat)) return false;
    if (this.waitEnded(seat.id)) return true; // THE RELEASE / THE BLEED-OUT (card 28): the wait is over
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

  /** THE STAGE'S DEATH ON THE SERVER (card 30, RULED A 2026-10-10): a vessel's final down takes
   *  its stage's own policy (meta/modes.ts onDeath, never a mode id) and mirrors home: 'end' =
   *  THE DEATH COVENANT's fall (card 14 C, byte for byte as before), 'advance' and 'stay' = THE
   *  CROSSING for one seat, 'fall' = THE FALL for one seat. `heard` false = a leave while down
   *  (leaving is never the road out of a death, for any stage). */
  private stageDeath(seat: Seat, rec: VesselSeat, heard = true): void {
    const onDeath = stageOf(seat.meta.modeId, seat.meta.modeStage).onDeath;
    if (onDeath === 'end') this.fall(seat, rec, heard);
    else if (onDeath === 'fall') this.fell(seat, rec, heard);
    else this.cross(seat, rec, heard);
  }

  /** A death's banked half, decided whole before anything leaves the seat: THE APPRAISAL (this
   *  seat's carried essence at the strict mortal exchange times the dying stage's rate:
   *  World.reckonRunEssence's fold, read for ONE seat, the ShardReckoning shape) and THE BODY
   *  (the worn and side-board gear, captured as a DeathRecord captures it, recorded through the
   *  corpse desk by the dying stage's ring: card 30's own ring is self-only; a cave or an empty
   *  carry leaves none, the corpse run's law), and the word it is owed: where it lies and what
   *  the death minted. */
  private bank(seat: Seat, rec: VesselSeat): FallWord {
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
      ...(stage.corpseRing === 'own' ? { ring: 'own' as const } : {}), // card 30: a self-only body
    }) : null;
    // 3. THE WORD it is owed: where it lies and what the fall minted.
    const note: ShardCorpseNote = {
      ...(body ? { id: body.id } : {}), charId: rec.charId, name: m.name, classId: m.classDef.id, level: hero.level,
      zoneId: zone.id, zoneName: zone.name, pos, pieces: body ? loot.items.length : 0, diedAt,
    };
    return { note, reckoning };
  }

  /** THE DEATH COVENANT, decided whole in one frame. `heard` = the client is
   *  still connected to hear its word: THE DEATH BEAT stands the body dead on
   *  the wire first, then the word goes home and the seat leaves (endFall);
   *  unheard (a leave while down), the seat goes at once and the tombstone
   *  keeps the word. */
  private fall(seat: Seat, rec: VesselSeat, heard = true): void {
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld(), m = seat.meta, zone = w.zone;
    // 1-3. THE APPRAISAL, THE BODY and THE WORD it is owed.
    const { note, reckoning } = this.bank(seat, rec);
    // 4. THE TOMBSTONE: this vessel never walks onto this shard again, and
    //    the word stays owed beside it (re-spoken at a stale re-upload).
    this.corpses.markFallen(rec.accountId, rec.charId, { note, reckoning });
    // 5. The record closes; the seat leaves the world after THE DEATH BEAT
    //    (heard) or at once, and the body stands instead.
    this.vessels.delete(seat.id);
    this.corpses.leave(seat.id);
    this.falls++;
    this.opts.log(`[shard] ${seat.id}'s vessel ${m.name} fell in ${zone.name}${heard ? '' : ' (leaving while down)'}: `
      + `${note.id ? `${note.pieces} pieces lie there` : 'nothing to reclaim'}, ${reckoning.minted} minted`);
    this.beginBeat(seat, heard, { note, reckoning });
  }

  /** The carry's price (card 30, a stage that survives death or falls): THAT seat's carry alone
   *  (World.stripCarryOf, the solo strip's own per-seat form: bag, doll, side boards, both
   *  wallets; the build walks on), and the hire concluded (the vessel's passed-through company
   *  goes home released: a survived death ends the contract, as beginModeRespawn's does). */
  private pay(seat: Seat, rec: VesselSeat): void {
    this.units.within(seat.id, w => w.stripCarryOf(seat));
    if (rec.upload.mercenaries || rec.upload.mercenary) {
      const { mercenaries: _company, mercenary: _blade, ...up } = rec.upload;
      rec.upload = up;
    }
  }

  /** THE CROSSING (card 30, onDeath 'advance' | 'stay', for ONE seat): the death banked in the
   *  frame it lands (the tithe at the stage's rate, the body by the stage's ring, the carry
   *  strip), the ladder stepped for 'advance' (the Immortal's first death seals it), then the
   *  vessel's mirror and `stageDeath` home at once (the client books the tithe as a solo
   *  crossing books it; its slot holds the crossed vessel). Heard, THE DEATH BEAT stands the
   *  body dead on the wire, then THE WAKE stands it at the hearth instead of a leave. A client
   *  that cannot hear it (dormant) or that left while down owes it: THE OWED CROSSING. */
  private cross(seat: Seat, rec: VesselSeat, heard = true): void {
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld(), m = seat.meta;
    const stage = stageOf(m.modeId, m.modeStage);
    const word = this.bank(seat, rec);
    this.pay(seat, rec);
    if (stage.onDeath === 'advance') m.modeStage = Math.min(m.modeStage + 1, modeById(m.modeId).stages.length - 1);
    w.markMetaDirty(seat);
    this.crossings++;
    const reached = m.modeStage;
    // THE WORD and THE MIRROR, at once: the mirror first, so a client lost between the two may
    // lose the tithe but never repeat it (THE LATE WORD's own order).
    this.mirror(seat.id);
    this.send({ t: 'stageDeath', note: word.note, reckoning: word.reckoning, stage: reached }, seat.id);
    if (!heard || this.opts.connected?.(seat.id) === false) this.corpses.markOwedCrossing(rec.accountId, rec.charId, word, reached);
    this.opts.log(`[shard] ${seat.id}'s vessel ${m.name} crossed in ${w.zone.name}${heard ? '' : ' (leaving while down)'}: `
      + `${word.note.id ? `${word.note.pieces} pieces lie there` : 'nothing to reclaim'}, ${word.reckoning.minted} minted, stage ${reached}`);
    if (heard) this.beginBeat(seat, true, undefined, { wake: true });
  }

  /** THE FALL (card 30, onDeath 'fall', for ONE seat): the full covenant banked in the frame it
   *  lands (the appraisal at the stage's rate, the body by its ring, the carry strip) and the
   *  stripped vessel mirrored home (its slot holds what resurrection wakes); THE FALL RECORD keeps
   *  the word; after THE DEATH BEAT the vessel leaves with `fell` (its level, the record's time:
   *  the client stamps its own roster card, the fee frozen at receipt) then `runEnd`. */
  private fell(seat: Seat, rec: VesselSeat, heard = true): void {
    const w = this.units.worldOf(seat.id) ?? this.units.keeperWorld(), m = seat.meta;
    const level = w.seatHero(seat).level;
    const word = this.bank(seat, rec);
    this.pay(seat, rec);
    w.markMetaDirty(seat);
    this.mirror(seat.id);
    const row = this.corpses.markFall(rec.accountId, rec.charId, word, level);
    this.vessels.delete(seat.id);
    this.corpses.leave(seat.id);
    this.undyingFalls++;
    this.opts.log(`[shard] ${seat.id}'s vessel ${m.name} fell (Undying) in ${w.zone.name}${heard ? '' : ' (leaving while down)'}: `
      + `${word.note.id ? `${word.note.pieces} pieces lie there` : 'nothing to reclaim'}, level ${level}`);
    this.beginBeat(seat, heard, word, { fell: { level, at: row.at } });
  }

  /** THE DEATH BEAT (THE ACTING SEAT): the fallen body stands DEAD and
   *  untargetable on the wire for VESSEL_CFG.deathBeatSec, home in its own
   *  flesh and beyond any revive or mercy (a dead seat is neither downed nor
   *  struck again), so its player and every neighbour see the blow land;
   *  then endFall. A fall no client will hear, or a beat of 0, ends at once.
   *  THE CROSSING (card 30, `wake`): the beat ends in THE WAKE instead; THE FALL
   *  (`fell`) ends with its own word. */
  private beginBeat(seat: Seat, tell: boolean, word?: FallWord, end: { wake?: true; fell?: { level: number; at: number } } = {}): void {
    if (!tell || VESSEL_CFG.deathBeatSec <= 0) {
      if (end.wake) this.wake(seat); else this.endFall(seat, tell, word, end.fell);
      return;
    }
    if (seat.home) { try { this.units.within(seat.id, w => w.seatEject(seat, 'released')); } catch { /* the hero falls in its own flesh either way */ } }
    const a = seat.actor;
    a.downed = false; a.dead = true; a.life = 0; a.casting = null; a.untargetable = true;
    seat.reviveDwellBy.clear();
    this.bleeds.delete(seat.id); this.released.delete(seat.id); // THE BLEED-OUT, THE RELEASE: the fall settled the wait
    this.beats.set(seat.id, { until: this.clock + VESSEL_CFG.deathBeatSec, tell, ...(word ? { word } : {}),
      ...(end.fell ? { fell: end.fell } : {}), ...(end.wake ? { wake: true as const } : {}) });
  }

  /** THE WAKE (card 30, THE CROSSING's end): instead of a leave the body stands up, every
   *  status shed and its resources full (the solo waking's per-seat half, performModeRespawn),
   *  and the host lands it at THE HEARTH SEAT through the landing law a hand-off uses, under
   *  THE SPAWN GRACE. Its mirror and word already went home at the crossing. */
  private wake(seat: Seat): void {
    this.units.within(seat.id, w => {
      if (seat.home) { try { w.seatEject(seat, 'released'); } catch { /* it wakes in its own flesh either way */ } }
      const a = w.seatHero(seat);
      a.dead = false; a.downed = false; a.casting = null; a.untargetable = true;
      for (const id of new Set(a.statuses.map(st => st.id))) a.endStatus(id);
      seat.reviveDwellBy.clear();
      a.fillResources();
      w.markMetaDirty(seat);
    });
    this.bleeds.delete(seat.id); this.released.delete(seat.id);
    this.opts.wake?.(seat);
    this.opts.log(`[shard] ${seat.id}'s vessel ${seat.meta.name} wakes at the hearth`);
  }

  /** The fall's end: the word home (a recorded fall's `corpse`, then `runEnd`;
   *  the client runs its reckoning and wipes its run slot; an Undying's FALL its
   *  `fell`, then `runEnd`), then the seat leaves the world. */
  private endFall(seat: Seat, tell: boolean, word?: FallWord, fell?: { level: number; at: number }): void {
    if (tell) {
      if (word && fell) this.send({ t: 'fell', note: word.note, reckoning: word.reckoning, level: fell.level, at: fell.at }, seat.id);
      else if (word) this.send({ t: 'corpse', note: word.note, reckoning: word.reckoning }, seat.id);
      this.send({ t: 'runEnd' }, seat.id);
    }
    // THE DESKS PER UNIT: the seat leaves the unit it stands in.
    this.units.within(seat.id, w => {
      if (seat.home) { try { w.seatEject(seat, 'released'); } catch { /* the seat leaves either way */ } }
      w.removeSeat(seat.id);
    });
    this.bleeds.delete(seat.id); this.released.delete(seat.id);
    this.opts.onSeatGone?.(seat.id, heroOf(seat).name); // THE HELD PLACE: the name the party's dim row wears
  }
}
