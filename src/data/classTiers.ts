// ---------------------------------------------------------------------------
// THE MASTERY LADDER + THE OBJECTIVE WEB's dials — class progression as data.
//
// A class is never BOUGHT: it is EARNED, claimed by the world the moment one
// of its authored OBJECTIVES completes (meta/unlocks.ts ClassUnlockSpec —
// counted gatework avenues: reclaim twenty of your own corpses, put down
// five bosses of the undead, play the parent class to ten…). The Vault's
// Mortal Essence buys something else: MASTERY. Each class carries the SAME
// ladder of rungs below — Novice / Adept / Expert / Master — and a rung
// surfaces in the Vault only once a character of that class has reached
// the rung's level AND the previous rung is owned (bought strictly in
// sequence; nothing un-investable ever shows — the moot law at rung
// grain). What a rung SELLS is an ALTERNATE OPENING for that class
// (data/classes.ts ClassDef.kit rows): a skill that may stand in for one of
// the class's three starters at the wake, or — the Master's gift — a fourth
// starter granted outright. Horizontal options, bought with the vertical.
//
// Every number here is a dial. The ladder is one list: add a rung, and every
// class with a kit row for it grows a card; a class with no kit row for a
// rung sells no card for it (nothing moot ever surfaces).
// ---------------------------------------------------------------------------

export interface ClassTierDef {
  /** The rung id (the kit rows and the catalog ids name it). */
  id: string;
  /** The rung's spoken rank: the card reads `${label} ${className}`. */
  label: string;
  /** The CLASS level that unveils the rung (classLevelLedgerKey stamps it —
   *  the catalog derivation registers the milestone, so the stamp exists). */
  level: number;
  /** Mortal Essence. */
  cost: number;
}

/** THE LADDER, ascending. Bought strictly in sequence. */
export const CLASS_TIERS: readonly ClassTierDef[] = [
  { id: 'novice', label: 'Novice', level: 10,  cost: 90 },
  { id: 'adept',  label: 'Adept',  level: 30,  cost: 180 },
  { id: 'expert', label: 'Expert', level: 60,  cost: 320 },
  { id: 'master', label: 'Master', level: 100, cost: 600 },
];

export const CLASS_TIER_BY_ID: Readonly<Record<string, ClassTierDef>> =
  Object.fromEntries(CLASS_TIERS.map(t => [t.id, t]));

/** The catalog id a rung wears — ONE spelling for the ladder's sequencing,
 *  ownership (Account.unlockedClassTiers) and every reader. */
export const classTierId = (classId: string, tierId: string): string => `tier_${classId}_${tierId}`;

/** THE OBJECTIVE WEB's dials (meta/unlocks.ts reads them). */
export const CLASS_WEB_CFG = {
  /** THE REVEAL: a shrouded class card's objectives stay written in runes
   *  until ANY one of them stands at least this far along (0..1); then the
   *  objectives — and only the objectives — read plain, with progress. The
   *  name stays runes until the class is claimed. */
  revealFrac: 0.25,
  /** THE SWEEP: how often (world seconds) a live run re-reads the objective
   *  web against the merged ledger view, so a class claimed mid-run lands
   *  the moment its deed completes (its gems drop from the next kill). */
  sweepSec: 2,
};
