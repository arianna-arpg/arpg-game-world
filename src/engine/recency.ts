// ---------------------------------------------------------------------------
// THE RECENCY LEDGER — "if you have X recently" as plain actor state.
//
// The talent fabric's temporal axis (docs/engine/talents.md). Every WoW
// talent and Ascension enchant of the shape "after a kill / after a critical
// strike / while you have not been struck for a while" used to need a proc
// granting a short buff. Now the engine stamps a SECONDS-SINCE counter per
// event kind on the actor itself (Actor.since — ticked in updateTimers,
// zeroed at the engine's own event seams: the hit, the crit, the kill, the
// wound, the block, the evade, the movement cast, the landed heal), and the
// condition mask reads each counter against its window. A recency
// condition is therefore an ordinary ConditionId: any modifier on any
// surface may wear `when: 'recentlyKilled'`, it expires by itself, and no
// per-mod bookkeeping exists anywhere.
//
// THE LAWS:
//  - HITS ARE HITS: 'hurt' is a LANDED HIT taken; DoT ticks never stamp it
//    (a burn is not a blow — the PoE reading, and the one that keeps
//    "not hit recently" meaningful under a bleed).
//  - THE WINDOW IS DATA: one global window with per-kind overrides, read
//    at mask time — retuning a window never touches an actor.
//  - THE INVERSE IS TRUE AT BIRTH: 'notHurtRecently' holds from the first
//    frame (counters start at RECENT_NEVER), the way any fight you have
//    not joined yet reads.
//  - THE EDGE IS AN EVENT: a condition that flips ON is pushed to
//    Actor.condRose, which the world sweeps into 'condition'-trigger procs
//    (data/procs.ts) — "when you drop to low life" is a trigger row, not a
//    poll.
// ---------------------------------------------------------------------------

import type { ConditionId } from './stats';

/** The event kinds the ledger stamps. Declaration order is the counter
 *  index (Actor.since); add a kind here and stamp it at its seam. */
export const RECENT_KINDS = [
  /** A damaging hit the actor LANDED. */
  'hit',
  /** A CRITICAL hit the actor landed. */
  'crit',
  /** A kill credited to the actor's own landed hit. */
  'kill',
  /** A landed hit the actor TOOK (DoT ticks never count). */
  'hurt',
  /** A landed CRITICAL hit the actor took. */
  'critHurt',
  /** A block the actor made (passive, guard or parry). */
  'block',
  /** An evade the actor made. */
  'evade',
  /** A movement-tagged skill the actor completed. */
  'move',
  /** A heal that landed on the actor (any source). */
  'heal',
] as const;
export type RecentKind = typeof RECENT_KINDS[number];

/** Counter value meaning "never" — larger than any window, small enough
 *  that adding dt for hours cannot overflow anything. */
export const RECENT_NEVER = 999;

export const RECENT_CFG = {
  /** The default "recently" window, seconds. */
  windowSec: 4,
  /** Per-kind overrides (absent = windowSec). */
  window: {} as Partial<Record<RecentKind, number>>,
};

export function recentWindow(kind: RecentKind): number {
  return RECENT_CFG.window[kind] ?? RECENT_CFG.windowSec;
}

export function recentIndex(kind: RecentKind): number {
  return RECENT_KINDS.indexOf(kind);
}

/** The recency members of ConditionId — the nine the ledger owns. */
export type RecentConditionId = Extract<ConditionId,
  | 'recentlyHit' | 'recentlyCrit' | 'recentlyKilled'
  | 'recentlyHurt' | 'notHurtRecently'
  | 'recentlyBlocked' | 'recentlyEvaded'
  | 'recentlyMoved' | 'recentlyHealed'>;

/** The recency CONDITIONS — each a ConditionId over one counter. `within`
 *  true reads "the counter is inside the window"; false reads the inverse.
 *  Declared here beside the counters so the condition/counter pairing is
 *  one table (the actor's mask walks it). */
export interface RecentCondition {
  id: RecentConditionId;
  kind: RecentKind;
  within: boolean;
}

export const RECENT_CONDITIONS: readonly RecentCondition[] = [
  { id: 'recentlyHit', kind: 'hit', within: true },
  { id: 'recentlyCrit', kind: 'crit', within: true },
  { id: 'recentlyKilled', kind: 'kill', within: true },
  { id: 'recentlyHurt', kind: 'hurt', within: true },
  { id: 'notHurtRecently', kind: 'hurt', within: false },
  { id: 'recentlyBlocked', kind: 'block', within: true },
  { id: 'recentlyEvaded', kind: 'evade', within: true },
  { id: 'recentlyMoved', kind: 'move', within: true },
  { id: 'recentlyHealed', kind: 'heal', within: true },
];

/** Player-facing words for a recency condition (tooltips, sheet, the
 *  proc validator's messages). */
export const RECENT_CONDITION_LABELS: Record<RecentConditionId, string> = {
  recentlyHit: 'if you have hit recently',
  recentlyCrit: 'if you have dealt a critical strike recently',
  recentlyKilled: 'if you have killed recently',
  recentlyHurt: 'if you have been hit recently',
  notHurtRecently: 'if you have not been hit recently',
  recentlyBlocked: 'if you have blocked recently',
  recentlyEvaded: 'if you have evaded recently',
  recentlyMoved: 'if you have used a movement skill recently',
  recentlyHealed: 'if you have been healed recently',
};
