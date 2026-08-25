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
import type { World } from '../engine/world';
import type { QuestDef } from '../quests/types';
import { QUEST_CATEGORY_COLORS } from '../quests/types';
import type { OverlayView } from '../world/overlay';
import { pickSeat, type SeatTuning } from '../world/seats';
import { ESSENCES, essenceUnitsForValue, type EssenceCost, type EssenceId } from './essences';
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
} as const;

/** One generated posting — the persisted instance (pure JSON; the derived
 *  QuestDef is rebuilt from this + the registries at read time, the
 *  live-registry mandate). `failed` is THE FAIL LANE's latch (horizon open
 *  — walk 1): it resolves at the board like a turn-in, paying nothing. */
export interface BountyPosting {
  id: string;
  kind: string;
  boardId: string;
  zoneId: string;
  beat: number;
  pay: { essence: EssenceCost[] };
  failed?: boolean;
}

/** Deep-copy a posting (save writes; slate snapshots). */
export function clonePosting(p: BountyPosting): BountyPosting {
  return {
    id: p.id, kind: p.kind, boardId: p.boardId, zoneId: p.zoneId, beat: p.beat,
    pay: { essence: p.pay.essence.map(c => ({ ...c })) },
    ...(p.failed ? { failed: true } : {}),
  };
}

/** What a kind's roll may read — a narrow host so rolls stay pure over the
 *  seeded rng (World assembles it at the arm; probes can too). */
export interface BountyRollHost {
  view: OverlayView;
  zoneMap: Record<string, ZoneDef>;
  /** Zone ids whose objective is already complete (a charge never posts
   *  finished work). */
  objectiveDone(zoneId: string): boolean;
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

/** One line describing a pay spec (card faces + notices — the visible
 *  price law: the exact pay, printed). */
export function describeBountyPay(pay: BountyPosting['pay']): string {
  return pay.essence.map(c => `${c.count} ${ESSENCES[c.essence].label}`).join(' · ');
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
      zoneId: z.id, beat: host.beat, pay: { essence: bountyChargePay(z.level) },
    };
  },
  done: (world, p) => world.objectiveDoneAt(p.zoneId),
  // No failed() read at M0: a charge's ground re-arms on revisit, so no
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
    reward: { essence: p.pay.essence },
    turnIn: {
      giver: BOUNTY_BOARD_GIVER,
      prompt: 'The charge is met — return to the bounty board to claim the pay.',
    },
  };
}
