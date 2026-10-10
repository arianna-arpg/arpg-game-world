// ---------------------------------------------------------------------------
// THE SPOILS' OWNER (charter card 27, RULED 2026-10-10: A as the default, a drop
// belongs to one player, with the FOUNDATION for B: a party sets its own drop rule;
// docs/engine/shard.md "THE SPOILS' OWNER"): who may take a drop on a hosted world,
// both halves of the wire. Browser-safe: types and pure functions only.
//
//   THE RULE         a party's drop rule ('owner' the owner's forever, 'timed' the
//                    owner's for freeAfterSec then anyone's, 'free' no owner at all)
//                    and its allocation ('killer' the credited seat, 'rotate' the
//                    party's members in reach of the kill in turn); an ungrouped
//                    seat reads the shard's default (SHARD_CFG.spoils). The leader
//                    sets it with the `party` word's 'rule' op (server/party.ts).
//   THE OWNER STAMP  World.ownSpoils, through THE SPOILS STAMP's own marks: a kill's
//                    drops wear the credited seat, a chest's its opener, a breakable's
//                    its breaker, a dig's its digger, an act's (a discard, a quest's
//                    pay) the acting seat. Orbs are never owned.
//   THE TOUCH LAW    World.dropHolder / pickupSeat: no other seat takes a held drop;
//                    a departed owner's drops are anyone's (THE OWNER'S ABSENCE).
//   THE WIRE         DropW.o (the holding seat) and DropW.fa (whole seconds until
//                    free) ride the hosted wire alone (stampDropOwners, the host's own
//                    statement after serializeSnapshot; the co-op broadcast never
//                    calls it), and the shell adopts them (adoptDropOwners).
//   THE DRAW         another seat's held drop draws ghosted (dropAlpha), its label
//                    unchanged; when `fa` runs out it draws full for everyone. Shown,
//                    never told.
// ---------------------------------------------------------------------------

import type { GemDrop, World } from '../engine/world';
import type { PartyRow } from './partyWire';
import type { StateSnapshot } from './snapshot';

/** A party's drop rule. */
export type DropRuleKind = 'owner' | 'timed' | 'free';
/** Whose a kill's drops are: the credited seat, or the party's members in reach in turn. */
export type DropAllocation = 'killer' | 'rotate';

export const DROP_RULES: readonly DropRuleKind[] = ['owner', 'timed', 'free'];
export const DROP_ALLOCATIONS: readonly DropAllocation[] = ['killer', 'rotate'];

export const isDropRule = (v: unknown): v is DropRuleKind => typeof v === 'string' && (DROP_RULES as readonly string[]).includes(v);
export const isDropAllocation = (v: unknown): v is DropAllocation => typeof v === 'string' && (DROP_ALLOCATIONS as readonly string[]).includes(v);

/** What World.dropRuleOf answers for a seat (the host resolves it from the seat's party). */
export interface DropRule {
  rule: DropRuleKind;
  /** 'timed': seconds a drop stays its owner's before it is anyone's. */
  freeAfterSec: number;
  allocation: DropAllocation;
  /** 'rotate': the next member among `inReach` (the party desk keeps the cursor); null with none. */
  deal?: (inReach: readonly string[]) => string | null;
}

export const SPOILS_CFG = {
  /** THE DRAW: another seat's held drop on a hosted shell draws at this alpha (its label unchanged). */
  ghostAlpha: 0.35,
};

/** THE WIRE, the host's half (the shard's own statement after serializeSnapshot, beside
 *  stampAudiences): each drop row wears its holder (`o`) and, under a timer, the whole seconds
 *  until it is anyone's (`fa`, rounded up). A free or absent owner leaves the row as it was.
 *  Inert off a hosted world (no rule hook), so no other lane's rows ever carry either field. */
export function stampDropOwners(world: World, snap: StateSnapshot): void {
  if (!world.dropRuleOf) return;
  const n = Math.min(snap.drops.length, world.drops.length);
  for (let i = 0; i < n; i++) {
    const d = world.drops[i], holder = world.dropHolder(d);
    if (holder === undefined) continue;
    const row = snap.drops[i];
    row.o = holder;
    if (d.freeAt !== undefined) row.fa = Math.max(1, Math.ceil(d.freeAt - world.time));
  }
}

/** THE WIRE, the shell's half (applySnapshot, after the drops are re-minted from the rows): a
 *  row's holder and its free time (the snapshot's own clock plus `fa`) onto the shell's drop. */
export function adoptDropOwners(world: World, snap: StateSnapshot): void {
  const n = Math.min(snap.drops.length, world.drops.length);
  for (let i = 0; i < n; i++) {
    const row = snap.drops[i];
    if (typeof row.o !== 'string') continue;
    const d = world.drops[i];
    d.owner = row.o;
    if (typeof row.fa === 'number' && Number.isFinite(row.fa)) d.freeAt = snap.time + row.fa;
  }
}

/** THE DRAW: the alpha a drop wears on this client. Another seat's held drop is ghosted; its
 *  own, a free one and one whose timer ran out draw full. Every other lane reads 1. */
export function dropAlpha(world: World, d: GemDrop): number {
  const holder = world.dropHolder(d);
  return holder !== undefined && holder !== world.clientSeatId ? SPOILS_CFG.ghostAlpha : 1;
}

/** THE PARTY PANEL's drop-rule row: the standing rule of a party row (absent fields read the
 *  ruled defaults, 'owner' and 'killer'), and whether this seat leads it (it may change it). */
export interface SpoilsRow { rule: DropRuleKind; freeAfterSec: number; allocation: DropAllocation; lead: boolean }
export function spoilsRowOf(row: PartyRow, me: string): SpoilsRow {
  return {
    rule: isDropRule(row.rule) ? row.rule : 'owner',
    freeAfterSec: typeof row.freeAfterSec === 'number' && Number.isFinite(row.freeAfterSec) ? row.freeAfterSec : 0,
    allocation: isDropAllocation(row.allocation) ? row.allocation : 'killer',
    lead: row.leader === me,
  };
}
