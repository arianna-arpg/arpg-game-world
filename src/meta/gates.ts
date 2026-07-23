// ---------------------------------------------------------------------------
// THE GATEWORK — an open AVENUE vocabulary for meta-progression gates.
//
// A GateRow names ONE account-durable fact that can open a lock: a ledger
// milestone, any-key-with-prefix tally, an owned catalog unlock, an owned
// feature flag — or the spoken sugars (a character level reached, a vocation
// completed, a quest done) that lower onto those same ledger contracts. Rows
// compose into gates two ways:
//
//   ANY-OF (the family law): a rung of an unlock FAMILY may open along
//   several independent avenues — reach level 15, OR finish a vocation, OR
//   turn in a quest — whichever the player's own play crosses first. The
//   ORDER of avenues is the player's; the FAMILY's progress is what gates.
//   ALL-OF: the plain conjunction, for gates that genuinely stack.
//
// The vocabulary is deliberately tiny and closed over account state only —
// resolvers take the Account (plus an unlock-ownership closure so this leaf
// never imports the catalog) and return booleans; describers return the
// avenue's spoken line so every UI prints the same words. Adding an avenue
// KIND = one field + one arm in gateRowMet/gateRowLabel; adding an avenue to
// a gate = one data row wherever that gate is authored. Nothing here counts,
// names, or orders any specific chain — chains are data in their own homes
// (VENDOR_CFG.wares.ladder, unlocks.ts rows).
//
// THE MILESTONE DERIVATION (the reached_level_15 lesson): a level avenue is
// only honest if something STAMPS its key. gateLevelNeeds() extracts every
// level a set of rows asks about, and meta/unlocks.ts folds the whole
// catalog's needs into CATALOG_LEVEL_MILESTONES — which the XP sweep stamps.
// Author a level gate anywhere in the catalog and its milestone stamp exists
// BY DERIVATION; a gate whose signal never fires is structurally impossible.
// ---------------------------------------------------------------------------

import {
  LEDGER_QUESTS_COMPLETED, LEDGER_QUEST_DONE_PREFIX, LEDGER_VOCATION_PREFIX,
  questDoneKey, reachedLevelKey, vocationUnlockKey, type Account,
} from './account';

/** One avenue. Exactly one of the WHAT fields should be set per row
 *  (ledger / ledgerPrefix / unlock / feature / level / vocation / quest);
 *  `n` scales the counted forms, `label` overrides the spoken line. */
export interface GateRow {
  /** account.ledger[key] ≥ n (n defaults 1). */
  ledger?: string;
  /** ANY account.ledger key starting with this prefix holds ≥ n — the
   *  "one applicable X" form (a gem seen `need`+ times, any vocation done). */
  ledgerPrefix?: string;
  /** Threshold for the counted forms above (default 1). */
  n?: number;
  /** Another CATALOG unlock owned (by id) — resolved through the closure the
   *  caller passes, so this leaf never imports the catalog. */
  unlock?: string;
  /** An account feature flag owned (FEATURE.*). */
  feature?: string;
  /** Sugar: any character has REACHED this level — reads reachedLevelKey(n);
   *  the catalog derivation (gateLevelNeeds) guarantees the stamp exists. */
  level?: number;
  /** Sugar: a vocation completed — true = ANY (prefix scan over
   *  LEDGER_VOCATION_PREFIX), or one specific vocation id. */
  vocation?: true | string;
  /** Sugar: a quest turned in — true = ANY (quest_done:* prefix, with the
   *  lifetime quests_completed counter honored for accounts whose deeds
   *  predate the per-quest keys), or one specific quest id. */
  quest?: true | string;
  /** The spoken avenue line (else derived per kind). One spelling: the Vault
   *  card, the tooltip, and any probe print THIS. */
  label?: string;
}

/** Does the account hold any ledger key under `prefix` at ≥ n? */
export function ledgerPrefixHeld(a: Account, prefix: string, n = 1): boolean {
  for (const k in a.ledger) {
    if (k.startsWith(prefix) && (a.ledger[k] ?? 0) >= n) return true;
  }
  return false;
}

/** Is this one avenue held? `ownedUnlock` resolves `unlock` rows (pass the
 *  catalog's own ownership predicate; a bare `() => false` is honest where no
 *  catalog is in scope). */
export function gateRowMet(a: Account, row: GateRow, ownedUnlock: (id: string) => boolean): boolean {
  const n = row.n ?? 1;
  if (row.ledger !== undefined) return (a.ledger[row.ledger] ?? 0) >= n;
  if (row.ledgerPrefix !== undefined) return ledgerPrefixHeld(a, row.ledgerPrefix, n);
  if (row.unlock !== undefined) return ownedUnlock(row.unlock);
  if (row.feature !== undefined) return a.features.has(row.feature);
  if (row.level !== undefined) return (a.ledger[reachedLevelKey(row.level)] ?? 0) >= 1;
  if (row.vocation !== undefined) {
    return row.vocation === true
      ? ledgerPrefixHeld(a, LEDGER_VOCATION_PREFIX)
      : (a.ledger[vocationUnlockKey(row.vocation)] ?? 0) >= 1;
  }
  if (row.quest !== undefined) {
    if (row.quest !== true) return (a.ledger[questDoneKey(row.quest)] ?? 0) >= 1;
    // ANY quest: the per-quest presence keys, OR the lifetime counter (the
    // pre-gatework spelling — old accounts' finished quests still speak).
    return ledgerPrefixHeld(a, LEDGER_QUEST_DONE_PREFIX)
      || (a.ledger[LEDGER_QUESTS_COMPLETED] ?? 0) >= 1;
  }
  return true; // an empty row gates nothing
}

/** The avenue's spoken line. */
export function gateRowLabel(row: GateRow): string {
  if (row.label) return row.label;
  const n = row.n ?? 1;
  if (row.level !== undefined) return `reach level ${row.level}`;
  if (row.vocation !== undefined) {
    return row.vocation === true ? 'complete a vocation' : `complete the ${row.vocation} vocation`;
  }
  if (row.quest !== undefined) return row.quest === true ? 'complete a quest' : `complete "${row.quest}"`;
  if (row.feature !== undefined) return `own ${row.feature.replace(/_/g, ' ')}`;
  if (row.unlock !== undefined) return `own ${row.unlock.replace(/_/g, ' ')}`;
  if (row.ledgerPrefix !== undefined) return `${row.ledgerPrefix.replace(/[_:]+$/, '').replace(/_/g, ' ')} ×${n}`;
  if (row.ledger !== undefined) return n > 1 ? `${row.ledger.replace(/_/g, ' ')} ×${n}` : row.ledger.replace(/_/g, ' ');
  return '';
}

/** A whole gate: 'any' = one held row opens it (the family law; an EMPTY list
 *  is open), 'all' = every row must hold. */
export function gateMet(
  a: Account, rows: readonly GateRow[] | undefined, mode: 'any' | 'all',
  ownedUnlock: (id: string) => boolean,
): boolean {
  if (!rows || rows.length === 0) return true;
  return mode === 'any'
    ? rows.some(r => gateRowMet(a, r, ownedUnlock))
    : rows.every(r => gateRowMet(a, r, ownedUnlock));
}

/** Every level the given rows gate on — the milestone-derivation feed (see
 *  header): whoever authors `level` avenues, the XP sweep learns to stamp
 *  their keys from THIS extraction, never from a hand-kept list. */
export function gateLevelNeeds(rows: readonly GateRow[] | undefined): number[] {
  return (rows ?? []).map(r => r.level).filter((n): n is number => typeof n === 'number');
}
