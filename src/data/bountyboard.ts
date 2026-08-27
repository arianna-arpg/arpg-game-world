// ---------------------------------------------------------------------------
// THE BOUNTY BOARD — generated, player-selected quest POSTINGS on a beat
// (docs/design/bounty-board.md, M0 "the board stands").
//
// A POSTING is a small persisted instance (kind row id + claimed target +
// pay + provenance) minted by the board at its beat's seeded arm; ACCEPTING
// one derives an ordinary QuestDef (postingQuestDef — the quest fabric's own
// header: "Bounty boards are the same primitive with a different giver") so
// the journal, map markers, field-clear hook and payout site all serve it
// through World.questDefOf. Pay resolves at THE TURN-IN back at the board
// (walk-1's collect ruling — the QuestTurnIn withhold lane is the default).
//
// KINDS are an open registry (registerBountyKind — the puzzle-kinds idiom):
// each row rolls its own target off the live world through the seat fabric,
// answers done()/failed()/annulled() as pure READS (the predicate is the
// law; hooks are UX), and speaks its card copy in the precision register.
// M0 ships ONE kind — THE CHARGE ("complete the objective of the place");
// the M1 spread (errand/cull) and M2's live-census answers join as rows.
//
// THE PER-BOARD LAW (walk 1, unhardcoded by ruling): every posting records
// its issuing boardId and the one-hand cap FOLDS per board — today's single
// Lastlight board collapses the fold to the global cap of 1, and regional
// boards (the writ kinship, post-M4) become a dial's turn, never a rewrite.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';
import type { ItemCategory } from '../engine/items';
import type { MemoryKind } from '../engine/memories';
import type { World } from '../engine/world';
import type { QuestDef } from '../quests/types';
import { QUEST_CATEGORY_COLORS } from '../quests/types';
import { registerOmenSource } from '../world/omens';
import type { OverlayView } from '../world/overlay';
import { pickSeat, type SeatTuning } from '../world/seats';
import { ESSENCES, essenceUnitsForValue, type EssenceCost, type EssenceId } from './essences';
import { ITEM_BASES } from './itembases';
import { SKILLS } from './skills';
import { UNIQUE_LIST } from './uniques';
import { OBJECTIVE_READS, type ZoneDef } from './zones';

/** ⚠ EVERY number here is UNBLESSED (2026-08-24) — the charter's open dials;
 *  her walks retune them. The offer count is HER walk-1 number (five). */
export const BOUNTY_BOARD_CFG = {
  /** THE BEAT — the board's OWN clock (never the vendor restock quantum:
   *  a Rush Order rung must not silently re-pace the board). Future board
   *  rush rungs fold into World.bountyBeatSeconds, floored here. */
  beatSec: 900,
  minBeatSec: 120,
  /** Offers per slate (walk 1: opens at FIVE; ONE dial, retuned at walks).
   *  M0 fields one kind, so no per-kind diversity guarantee is enforced
   *  yet — that law arrives with the M1 spread. */
  offers: 5,
  /** The board's dwell (the salvage-bench register). */
  dwell: { radius: 120, sec: 0.9 },
  /** The Lastlight board's id — postings record their issuing board (THE
   *  PER-BOARD LAW). Regional boards mint their own ids (the kinship). */
  boardId: 'lastlight',
  /** The board's accent IS the reserved bounty category badge — one truth. */
  accent: QUEST_CATEGORY_COLORS.bounty,
  /** THE CHARGE kind's dials. */
  charge: {
    /** Seat envelope over the live map (the seat fabric's data half):
     *  standing ground near the hero's reach, a thumb on veiled country
     *  (a charge on a veiled zone LIFTS the veil at accept — ruled). */
    seat: { range: { min: 1, max: 480 }, knownMul: 1, unknownMul: 1.2, veiledMul: 1.35, prefer: 'flat' } as SeatTuning,
    /** Level band around the hero (target zone level within [-below,+above]). */
    band: { below: 6, above: 3 },
    /** Objective kinds a charge can never honestly ask (no completion route
     *  through completeObjective: 'escape' never routes there, 'none' asks
     *  nothing; 'safe' + event-quiet ground are already floored out by the
     *  seat fabric's eventTargetable). */
    refuse: ['none', 'escape'] as readonly string[],
  },
  /** R1 pay — the essence fold: value = base + perLevel × zone level (in
   *  Mortal-Essence worth), minted as ONE tint chosen by the zone's level
   *  (the harvest fabric's tierAt idiom, index-aligned with ESSENCE_IDS). */
  pay: { base: 6, perLevel: 1.6, tierAt: [0, 8, 16, 26] as readonly number[] },
  /** THE ERRAND kind (M1) — "reach the place". Target: standing UNVISITED
   *  ground, a heavy thumb on the veiled frontier (the exploration ask);
   *  entry is the deed. THE VEIL is per-posting flavor (walk-1 card 4):
   *  the default face keeps discovery the ask (an aging OMEN, no lift);
   *  `liftShare` of postings roll the deed-lift face instead. */
  errand: {
    seat: { range: { min: 140, max: 720 }, knownMul: 0.4, unknownMul: 2, veiledMul: 3, prefer: 'flat' } as SeatTuning,
    band: { below: 5, above: 5 },
    liftShare: 0.25,
  },
  /** THE CULL kind (M1) — "kill the named": the writ grammar sent remote.
   *  On first entry with the hand held, the board posts `count` writ marks
   *  through the standing promote-and-name path; done = all claimed
   *  (credited on the posting itself, so the read works from anywhere and
   *  survives wipes — a re-entry re-posts the remainder, self-healing).
   *  Targets never overlap the writ fabric's own boards: zones whose
   *  OBJECTIVE is 'bounty' and harborhold ground are excluded, so every
   *  mark in a cull zone belongs to the posting (the mixed-lane guard). */
  cull: {
    seat: { range: { min: 1, max: 520 }, knownMul: 1.2, unknownMul: 1, veiledMul: 0.6, prefer: 'flat' } as SeatTuning,
    band: { below: 6, above: 3 },
    count: [3, 5] as [number, number],
  },
  /** THE PAY LANES (M1 — her reward-targeting agency): each posting rolls
   *  ONE lane at the arm, weights below; the card prints the exact pay
   *  (the visible price law). Unique lane: unseen uniques POST (ruled) and
   *  R2 is split named/category (her amendment — "a unique ring"). */
  lanes: {
    weights: { essence: 0.55, pouch: 0.2, lot: 0.15, unique: 0.1 },
    unique: {
      namedShare: 0.5,
      /** Category-face pool (filtered at arm to categories that actually
       *  hold a unique at the target's level — never a hollow card). */
      categories: ['ring', 'amulet', 'belt', 'boots', 'gloves', 'helmet', 'chest', 'weapon', 'offhand'] as readonly ItemCategory[],
      /** Named pool reaches this many levels above the target zone. */
      reachAbove: 2,
    },
    lot: {
      count: [2, 3] as [number, number],
      rarityWeights: { common: 0, magic: 45, rare: 55 },
      categories: ['weapon', 'chest', 'helmet', 'gloves', 'boots', 'belt', 'ring', 'amulet', 'offhand'] as readonly ItemCategory[],
    },
    pouch: { roughCount: [3, 5] as [number, number] },
    /** The gem face rides the pouch lane's weight: this share of pouch-lane
     *  rolls names a TRUE skill Memory from the account's own drop pool at
     *  the target's level (THE MINT LAW stamps it at pay). */
    gemShare: 0.35,
  },
  /** THE ANSWER kind (M2) — "resolve what stands": targets drawn from the
   *  live census (BOUNTY_SOURCES — worldboss decrees, the fracture, the
   *  revealed hunt, a besieged harborhold's muster). Events are the world's
   *  own scale, so the band opens wider than the minted-ground kinds. */
  answer: {
    band: { below: 8, above: 6 },
  },
  /** The errand's omen (the findability guarantee without the veil lift):
   *  whispered near, revealed close, aging wider — the omen fabric's own
   *  dials. */
  omen: { whisper: 150, reveal: 70, widenPerMin: 8 },
  /** Slate composition: no kind may take more than this many of the
   *  slate's seats (the diversity guarantee, card 6's shape). */
  slate: { maxPerKind: 2 },
} as const;

/** ONE pay lane per posting (the visible price law: the card prints the
 *  exact pay). `essence` is R1; `unique` is R2's two faces (named by id, or
 *  a category — "a unique ring", her amendment); `lot` is R3 (a seeded
 *  assortment); `pouch`/`gem` are R4's two faces (Memory units, or a named
 *  TRUE skill Memory under THE MINT LAW). Exactly one field is set. */
export interface BountyPay {
  essence?: EssenceCost[];
  unique?: { id?: string; category?: ItemCategory };
  lot?: { count: number; category: ItemCategory };
  pouch?: { kind: MemoryKind; count: number };
  gem?: { id: string };
}

/** One generated posting — the persisted instance (pure JSON; the derived
 *  QuestDef is rebuilt from this + the registries at read time, the
 *  live-registry mandate). `failed` is THE FAIL LANE's latch (horizon open
 *  — walk 1): it resolves at the board like a turn-in, paying nothing.
 *  `face` is the errand's veil flavor ('omen' default / 'lift' minority);
 *  `acceptAt` feeds the omen's aging; `cull` is the cull kind's own claim
 *  ledger (credited at the kill chokepoint — readable from anywhere,
 *  wipe-proof: re-entry re-posts the remainder). */
export interface BountyPosting {
  id: string;
  kind: string;
  boardId: string;
  zoneId: string;
  beat: number;
  pay: BountyPay;
  failed?: boolean;
  face?: 'omen' | 'lift';
  acceptAt?: number;
  cull?: { count: number; claimed: number };
  /** THE ANSWER's claim (M2 K4): the source row + the target's stable key,
   *  with the card copy frozen at the arm (the census churns; the card must
   *  still read after the target moves or leaves) and `base` = the source's
   *  resolution-ledger count AT THE ARM. The delta law: a later bump past
   *  the baseline reads as resolved — and because the reconcile strikes any
   *  offer whose ask dies before it is taken, the arm baseline IS the
   *  at-accept baseline by construction. Sources with a standing-state read
   *  (the harborhold's 'open') omit `ledger`. */
  answer?: { source: string; key: string; name: string; ask: string; title?: string; ledger?: string; base: number };
}

/** Deep-copy a posting (save writes; slate snapshots). */
export function clonePosting(p: BountyPosting): BountyPosting {
  return {
    id: p.id, kind: p.kind, boardId: p.boardId, zoneId: p.zoneId, beat: p.beat,
    pay: {
      ...(p.pay.essence ? { essence: p.pay.essence.map(c => ({ ...c })) } : {}),
      ...(p.pay.unique ? { unique: { ...p.pay.unique } } : {}),
      ...(p.pay.lot ? { lot: { ...p.pay.lot } } : {}),
      ...(p.pay.pouch ? { pouch: { ...p.pay.pouch } } : {}),
      ...(p.pay.gem ? { gem: { ...p.pay.gem } } : {}),
    },
    ...(p.failed ? { failed: true } : {}),
    ...(p.face ? { face: p.face } : {}),
    ...(p.acceptAt !== undefined ? { acceptAt: p.acceptAt } : {}),
    ...(p.cull ? { cull: { ...p.cull } } : {}),
    ...(p.answer ? { answer: { ...p.answer } } : {}),
  };
}

// ---------------------------------------------------------------------------
// THE SOURCE REGISTRY (M2 — charter §7, the live-world reader): the
// world-grain sibling of registerPackageAsk. A source row publishes a live
// CENSUS of answerable asks; THE COMPOUNDING LAW is the whole point — the
// board never hardcodes a package list. Every fabric that registers a row
// becomes board content the day it ships (rows live in the fabric's own
// module, registered on import — the registerMarkerSource contract; zero
// edits here), and every future fabric is one row from being a posting.
// ---------------------------------------------------------------------------

/** One answerable ask, read from the live world at census time. */
export interface BountyTargetRef {
  /** Stable instance key within the source ('wb:<id>', 'hold:<zoneId>') —
   *  the posting's claim; a ref gone from the census reads as departed. */
  key: string;
  /** Where the ask stands (the posting's zone: markers, band, pay fold). */
  zoneId: string;
  /** The target's noun, precision register (card + courtesy notices). */
  name: string;
  /** The ask spoken plainly — one line, no captions. */
  ask: string;
  /** Card title override (the worldboss lane speaks as THE DECREE); absent
   *  = "The Answer: <name>". */
  title?: string;
  /** Run-ledger key whose count baselines at the arm — a later bump past
   *  the baseline reads as resolved (the delta law). Sources resolved by a
   *  standing-state read (the harborhold) omit it and answer resolved(). */
  ledger?: string;
}

/** One live-census source — registered from the owning fabric's module. */
export interface BountySourceRow {
  id: string;
  /** The live census: every answerable ask this source stands behind right
   *  now. A pure read (never ignites, never mutates); empty when the
   *  package is absent or quiet. */
  census(world: World): BountyTargetRef[];
  /** The standing-state resolution read, for sources without a resolution
   *  ledger (the harborhold's `state === 'open'`). Refs that carry `ledger`
   *  never consult this — the kind's own delta law answers first. */
  resolved?(world: World, p: BountyPosting): boolean;
  /** The fail read (the hold FELL) — resolves at the board like a turn-in,
   *  no pay, per walk-1's fail ruling. A live read, never a latch. */
  failed?(world: World, p: BountyPosting): boolean;
  /** M3 (THE SUMMONS): the directed ignite verb — devIgnite promoted to a
   *  first-class registry hook. Unused by M2's census lane. */
  ignite?(world: World, zoneId: string): boolean;
}

export const BOUNTY_SOURCES: Record<string, BountySourceRow> = {};

export function registerBountySource(row: BountySourceRow): void {
  BOUNTY_SOURCES[row.id] = row; // HMR-safe: replace by id
}

/** Rows in registration-independent order (sorted by id — the
 *  registerPackageAsk determinism law: the census pool, and so the seeded
 *  slate, never depends on import order). */
export function bountySourceRows(): BountySourceRow[] {
  return Object.values(BOUNTY_SOURCES).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** What a kind's roll may read — a narrow host so rolls stay pure over the
 *  seeded rng (World assembles it at the arm; probes can too). */
export interface BountyRollHost {
  view: OverlayView;
  zoneMap: Record<string, ZoneDef>;
  /** Zone ids whose objective is already complete (a charge never posts
   *  finished work). */
  objectiveDone(zoneId: string): boolean;
  /** Ground the player's feet have walked (the errand's exclusion — an
   *  entered zone can never be an exploration ask). */
  visited(zoneId: string): boolean;
  /** Name a TRUE skill Memory from the account's own drop pool at this
   *  level (the R4 gem face — the pool law stays in one place, World's).
   *  Null when the pool is empty. */
  pickGemId(level: number, rng: Rng): string | null;
  /** THE ANSWER pool (M2 K4): every source's live census, gathered in
   *  sorted-row order with each ref's resolution-ledger baseline already
   *  read (World assembles it at the arm — the roll stays a pure fold
   *  over the host). */
  answers(): { source: string; ref: BountyTargetRef; base: number }[];
  playerLevel: number;
  boardId: string;
  beat: number;
  /** Posting index within this slate (id derivation — ids stay unique). */
  seq: number;
}

/** One posting kind — the open registry row. done/failed/annulled are pure
 *  READS (never writes): the predicate is the law, hooks are UX. */
export interface BountyKindRow {
  id: string;
  /** Slate-roll share (M0's single kind makes this moot; the law stands). */
  weight: number;
  roll(host: BountyRollHost, rng: Rng, taken: Set<string>): BountyPosting | null;
  done(world: World, p: BountyPosting): boolean;
  failed?(world: World, p: BountyPosting): boolean;
  /** A reason string ANNULS the posting (the world moved on — the reconcile's
   *  honesty read); null = the ask still stands. */
  annulled?(world: World, p: BountyPosting): string | null;
  /** Card copy — the precision register (names, reads; never captions). */
  copy(world: World, p: BountyPosting): { title: string; ask: string };
}

export const BOUNTY_KINDS: Record<string, BountyKindRow> = {};

export function registerBountyKind(row: BountyKindRow): void {
  BOUNTY_KINDS[row.id] = row; // HMR-safe: replace by id
}

/** The R1 essence fold: one tint (by the zone's level band) covering the
 *  ask's Mortal-Essence worth. */
export function bountyChargePay(zoneLevel: number): EssenceCost[] {
  const cfg = BOUNTY_BOARD_CFG.pay;
  const value = Math.max(1, Math.round(cfg.base + cfg.perLevel * Math.max(1, zoneLevel)));
  const ids = Object.keys(ESSENCES) as EssenceId[];
  let tier = 0;
  for (let t = 0; t < ids.length && t < cfg.tierAt.length; t++) {
    if (zoneLevel >= cfg.tierAt[t]) tier = t;
  }
  const id = ids[tier];
  return [{ essence: id, count: essenceUnitsForValue(id, value) }];
}

/** The named-unique pool at a target level (arm-time selection; unseen
 *  uniques POST — ruled). */
export function bountyUniquePool(level: number): { id: string; name: string; weight: number }[] {
  const reach = level + BOUNTY_BOARD_CFG.lanes.unique.reachAbove;
  return UNIQUE_LIST.filter(u => (u.minIlvl ?? 0) <= reach)
    .map(u => ({ id: u.id, name: u.name, weight: u.weight ?? 100 }));
}

/** Category-face pool at a target level — only categories that actually
 *  hold a rollable unique there (never a hollow card). */
export function bountyUniqueCategories(level: number): ItemCategory[] {
  const reach = level + BOUNTY_BOARD_CFG.lanes.unique.reachAbove;
  return BOUNTY_BOARD_CFG.lanes.unique.categories.filter(cat =>
    UNIQUE_LIST.some(u => (u.minIlvl ?? 0) <= reach
      && ITEM_BASES[u.baseId]?.category === cat));
}

/** Roll ONE pay lane for a posting (seeded — part of the foreordained
 *  arm). Falls back down the ladder to essence whenever a richer lane's
 *  pool is empty at this level, so a card never prints a hollow pay. */
export function rollBountyPay(host: BountyRollHost, rng: Rng, level: number): BountyPay {
  const L = BOUNTY_BOARD_CFG.lanes;
  const w = L.weights;
  const total = w.essence + w.pouch + w.lot + w.unique;
  let r = rng.next() * Math.max(0.0001, total);
  let lane: 'essence' | 'pouch' | 'lot' | 'unique' = 'essence';
  for (const [k, wv] of [['essence', w.essence], ['pouch', w.pouch], ['lot', w.lot], ['unique', w.unique]] as const) {
    r -= wv;
    if (r <= 0) { lane = k; break; }
  }
  if (lane === 'unique') {
    const named = rng.next() < L.unique.namedShare;
    if (named) {
      const pool = bountyUniquePool(level);
      if (pool.length) {
        let t = 0;
        for (const u of pool) t += u.weight;
        let x = rng.next() * t;
        let pick = pool[pool.length - 1];
        for (const u of pool) { x -= u.weight; if (x <= 0) { pick = u; break; } }
        return { unique: { id: pick.id } };
      }
    }
    const cats = bountyUniqueCategories(level);
    if (cats.length) return { unique: { category: cats[rng.int(0, cats.length - 1)] } };
    lane = 'lot'; // no unique stands at this level — fall down the ladder
  }
  if (lane === 'lot') {
    const cats = L.lot.categories;
    return {
      lot: {
        count: rng.int(L.lot.count[0], L.lot.count[1]),
        category: cats[rng.int(0, cats.length - 1)],
      },
    };
  }
  if (lane === 'pouch') {
    if (rng.next() < L.gemShare) {
      const id = host.pickGemId(level, rng);
      if (id) return { gem: { id } };
    }
    return { pouch: { kind: 'rough', count: rng.int(L.pouch.roughCount[0], L.pouch.roughCount[1]) } };
  }
  return { essence: bountyChargePay(level) };
}

/** One line describing a pay spec (card faces + notices — the visible
 *  price law: the exact pay, printed). */
export function describeBountyPay(pay: BountyPay): string {
  if (pay.unique) {
    if (pay.unique.id) return `the unique: ${UNIQUE_LIST.find(u => u.id === pay.unique!.id)?.name ?? pay.unique.id}`;
    return `a unique ${pay.unique.category}`;
  }
  if (pay.lot) return `${pay.lot.count} rare-grade ${pay.lot.category} pieces`;
  if (pay.gem) return `the skill Memory: ${SKILLS[pay.gem.id]?.name ?? pay.gem.id}`;
  if (pay.pouch) return `${pay.pouch.count} Rough Memory units`;
  return (pay.essence ?? []).map(c => `${c.count} ${ESSENCES[c.essence].label}`).join(' · ') || 'nothing';
}

// --- K2 · THE CHARGE — "complete the objective of the place" ---------------
registerBountyKind({
  id: 'charge',
  weight: 1,
  roll(host, rng, taken) {
    const cfg = BOUNTY_BOARD_CFG.charge;
    const z = pickSeat(host.view, {
      event: 'bountyboard',
      ...cfg.seat,
      filter: zz => !taken.has(zz.id)
        && !host.objectiveDone(zz.id)
        && !cfg.refuse.includes(zz.objective.kind)
        && zz.level >= host.playerLevel - cfg.band.below
        && zz.level <= host.playerLevel + cfg.band.above,
    }, rng);
    if (!z) return null;
    return {
      id: `bounty_${host.beat}_${host.seq}`, kind: 'charge', boardId: host.boardId,
      zoneId: z.id, beat: host.beat, pay: {},
    };
  },
  done: (world, p) => world.objectiveDoneAt(p.zoneId),
  // No failed() read here: a charge's ground re-arms on revisit, so no
  // PERMANENT failure case exists at this grain today — the lane stands
  // structurally (BountyPosting.failed + the board's acknowledgment) per
  // walk 1's horizon-open ruling, waiting for a kind that can truly fail.
  annulled: (world, p) => world.zoneMap[p.zoneId] ? null : 'the ground is gone from every chart',
  copy(world, p) {
    const z = world.zoneMap[p.zoneId];
    if (!z) return { title: 'The Charge', ask: 'the ground is gone' };
    const read = OBJECTIVE_READS[z.objective.kind]?.read ?? 'meet the ground\'s ask';
    return {
      title: `The Charge: ${z.name}`,
      ask: `Complete the objective of ${z.name} (level ${z.level}) — ${read}.`,
    };
  },
});

// --- K1 · THE ERRAND — "reach the place" (M1) ------------------------------
registerBountyKind({
  id: 'errand',
  weight: 1,
  roll(host, rng, taken) {
    const cfg = BOUNTY_BOARD_CFG.errand;
    const z = pickSeat(host.view, {
      event: 'bountyboard',
      ...cfg.seat,
      filter: zz => !taken.has(zz.id)
        && !host.visited(zz.id)
        && zz.level >= host.playerLevel - cfg.band.below
        && zz.level <= host.playerLevel + cfg.band.above,
    }, rng);
    if (!z) return null;
    return {
      id: `bounty_${host.beat}_${host.seq}`, kind: 'errand', boardId: host.boardId,
      zoneId: z.id, beat: host.beat, pay: {},
      // THE VEIL is per-posting flavor (card 4, ruled): default = the omen
      // face, discovery stays the ask; a minority rolls the deed-lift.
      face: rng.next() < cfg.liftShare ? 'lift' : 'omen',
    };
  },
  done: (world, p) => world.visited.has(p.zoneId),
  annulled: (world, p) => world.zoneMap[p.zoneId] ? null : 'the ground is gone from every chart',
  copy(world, p) {
    const z = world.zoneMap[p.zoneId];
    if (!z) return { title: 'The Errand', ask: 'the ground is gone' };
    return {
      title: `The Errand: ${z.name}`,
      ask: `Reach ${z.name} (level ${z.level}) — entry is the deed.`,
    };
  },
});

// --- K3 · THE CULL — "kill the named" (M1: the writ grammar sent remote) ---
registerBountyKind({
  id: 'cull',
  weight: 1,
  roll(host, rng, taken) {
    const cfg = BOUNTY_BOARD_CFG.cull;
    const z = pickSeat(host.view, {
      event: 'bountyboard',
      ...cfg.seat,
      // THE MIXED-LANE GUARD: never a zone whose own objective posts writs,
      // never harborhold ground (the plaza board) — every mark in a cull
      // zone then belongs to the posting, and bountyView's per-zone lane
      // inference stays honest without a per-mark stamp.
      filter: zz => !taken.has(zz.id)
        && !host.objectiveDone(zz.id)
        && zz.objective.kind !== 'bounty'
        && !zz.harborhold && !zz.holdAnchor
        && !!zz.packs?.table?.length
        && zz.level >= host.playerLevel - cfg.band.below
        && zz.level <= host.playerLevel + cfg.band.above,
    }, rng);
    if (!z) return null;
    return {
      id: `bounty_${host.beat}_${host.seq}`, kind: 'cull', boardId: host.boardId,
      zoneId: z.id, beat: host.beat, pay: {},
      cull: { count: rng.int(cfg.count[0], cfg.count[1]), claimed: 0 },
    };
  },
  done: (_world, p) => !!p.cull && p.cull.claimed >= p.cull.count,
  annulled: (world, p) => world.zoneMap[p.zoneId] ? null : 'the ground is gone from every chart',
  copy(world, p) {
    const z = world.zoneMap[p.zoneId];
    const n = p.cull?.count ?? 0;
    const left = Math.max(0, n - (p.cull?.claimed ?? 0));
    if (!z) return { title: 'The Cull', ask: 'the ground is gone' };
    return {
      title: `The Cull: ${z.name}`,
      ask: `Put down ${n} marked quarry in ${z.name} (level ${z.level})`
        + (p.cull && p.cull.claimed > 0 ? ` — ${left} still stand.` : ' — the marks post at your arrival.'),
    };
  },
});

// --- K4 · THE ANSWER — "resolve what stands" (M2: the live census) ---------
registerBountyKind({
  id: 'answer',
  weight: 1,
  roll(host, rng, taken) {
    const cfg = BOUNTY_BOARD_CFG.answer;
    // The pool is the census itself (no seat search — the world already
    // placed these asks); the band keeps absurd decrees off a young slate.
    const pool = host.answers().filter(a => {
      const z = host.zoneMap[a.ref.zoneId];
      if (!z || taken.has(a.ref.zoneId)) return false;
      return z.level >= host.playerLevel - cfg.band.below
        && z.level <= host.playerLevel + cfg.band.above;
    });
    if (!pool.length) return null;
    const a = pool[rng.int(0, pool.length - 1)];
    return {
      id: `bounty_${host.beat}_${host.seq}`, kind: 'answer', boardId: host.boardId,
      zoneId: a.ref.zoneId, beat: host.beat, pay: {},
      answer: {
        source: a.source, key: a.ref.key, name: a.ref.name, ask: a.ref.ask,
        ...(a.ref.title ? { title: a.ref.title } : {}),
        ...(a.ref.ledger ? { ledger: a.ref.ledger } : {}),
        base: a.base,
      },
    };
  },
  // THE DELTA LAW: a ref carrying a resolution ledger reads done when the
  // count moves past the arm baseline (worldboss_slain_<def>,
  // fractures_sealed, hunt_beasts_slain — whoever in the party lands it);
  // ledgerless refs ask their source's standing-state read (the hold open).
  done(world, p) {
    const a = p.answer;
    if (!a) return false;
    const src = BOUNTY_SOURCES[a.source];
    if (!src) return false;
    if (a.ledger) return (world.ledger[a.ledger] ?? 0) > a.base;
    return src.resolved?.(world, p) ?? false;
  },
  failed(world, p) {
    const a = p.answer;
    const src = a ? BOUNTY_SOURCES[a.source] : undefined;
    return src?.failed?.(world, p) ?? false;
  },
  // Departed-unresolved ANNULS (the apparition's stay ran out, the hunt
  // waned): the courtesy in the field, the hand freed, no penalty. A
  // resolved ask never annuls (it pays), and a FAILED one never annuls
  // either — the fail lane resolves at the board (walk-1's ruling), even
  // while its census entry is gone.
  annulled(world, p) {
    const a = p.answer;
    if (!a) return 'the posting no longer reads';
    const src = BOUNTY_SOURCES[a.source];
    if (!src) return 'its source is gone from the world';
    if (BOUNTY_KINDS.answer.done(world, p)) return null;
    if (src.failed?.(world, p)) return null;
    if (!src.census(world).some(r => r.key === a.key)) {
      return `${a.name} is gone — the world moved on`;
    }
    return null;
  },
  // THE LIVE CARD: while the target still stands, the census's own line
  // speaks (a diverted fracture's card follows it to fresh ground); once
  // gone, the arm's frozen copy still reads while the reconcile settles.
  copy(world, p) {
    const a = p.answer;
    if (!a) return { title: 'The Answer', ask: 'the posting no longer reads' };
    const live = BOUNTY_SOURCES[a.source]?.census(world).find(r => r.key === a.key);
    const title = live?.title ?? a.title ?? `The Answer: ${live?.name ?? a.name}`;
    return { title, ask: live?.ask ?? a.ask };
  },
});

// THE ERRAND'S OMEN (the findability guarantee without the veil lift): every
// omen-face errand in hand whispers its bearing and finally reveals its seat
// — the omen fabric verbatim, aging from the accept.
registerOmenSource((world: World) => world.bountyOmens());

/** The board-giver sentinel: no NPC carries this id, so the standing
 *  quest-giver dwell can never offer or pay a posting — the board's own
 *  panel is the whole counter. */
export const BOUNTY_BOARD_GIVER = 'bounty_board';

/** Derive the accepted posting's QuestDef — the resolver seam's product
 *  (World.questDefOf = QUESTS[id] ?? this). Zone-spec fields are benign
 *  honest values off the CLAIMED zone (the mint lane never runs for a
 *  claim-lane posting; the fields exist to satisfy the standing type). */
export function postingQuestDef(p: BountyPosting, world: World): QuestDef {
  const z = world.zoneMap[p.zoneId] as ZoneDef | undefined;
  const c = BOUNTY_KINDS[p.kind]?.copy(world, p) ?? { title: p.id, ask: '' };
  return {
    id: p.id,
    giver: BOUNTY_BOARD_GIVER,
    offerLabel: c.title,
    category: 'bounty',
    offerAtLevel: 0,
    zone: {
      tileset: z?.tileset ?? 'field', direction: 'e',
      level: z?.level ?? 1, objective: z?.objective ?? { kind: 'clear' },
    },
    // The essence lane pays through the standing QuestReward field; every
    // richer lane (unique/lot/pouch/gem) pays through the payout site's
    // bounty branch (World.payBountyLanes) — never both.
    reward: { ...(p.pay.essence ? { essence: p.pay.essence } : {}) },
    turnIn: {
      giver: BOUNTY_BOARD_GIVER,
      prompt: 'The ask is met — return to the bounty board to claim the pay.',
    },
  };
}
