// ---------------------------------------------------------------------------
// LEDGER — the per-run trigger counters, promoted to the account on death.
//
// A RunLedger is the only MUTABLE per-run package state (the manifest is frozen).
// It counts events the unlock predicates care about — crowned_killed, sieges,
// warlords_killed — and is merged into account.ledger when the character dies,
// so a Crowned kill permanently flips the Warbands unlock true exactly the way
// credits become permanent. The run copy is wiped with the character.
// ---------------------------------------------------------------------------

import type { Ledger } from './types';

export const EMPTY_LEDGER = (): Ledger => ({});

/** Bump a counter (creating it at 0 first). */
export function bumpLedger(l: Ledger, key: string, by = 1): void {
  l[key] = (l[key] ?? 0) + by;
}

/** Fold the per-run counters into the durable account ledger (on death). */
export function mergeLedger(into: Ledger, from: Readonly<Ledger>): void {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
}
