// ---------------------------------------------------------------------------
// POCKET FORMS — the shapes PURCHASED GROUND can take (DATA).
//
// A pocket (ZoneSpec.pocket — a Holdfast's earned cul-de-sac today; any future
// purchased or earned dead-end) rolls ONE form at mint. The form declares the
// footprint, the objective policy, the population scale, and the treasure
// litter — so "a tiny outcropping littered with loot" and "a whole hidden
// country whose only road is the way in" are both one data row, and a third
// shape (a vault, a menagerie, a shrine-hollow) is one more entry with zero
// engine edits.
//
// WHY FORMS EXIST: before them a pocket was always a full-size mint — and a
// carve-layout roll (dungeon/mycelia faces walk 10-25% of their rect) minted
// what READ as a tiny cavern while still budgeting spawns for the whole rect,
// cramming a full zone's population against the one portal the player arrives
// by. A form makes the small pocket DELIBERATE (small budget, big loot) and
// the large pocket honest (full zone, one road home) — the toll always buys
// something legible.
//
// Pure leaf: declarative types + the registry. Consumed by
// World.mintHoldfastPocket (roll + bake onto the ZoneDef as `pocketForm`) and
// World.loadZone (the treasure litter + ambient-event gate).
// ---------------------------------------------------------------------------

import type { ObjectiveSpec } from './zones';

export interface PocketFormDef {
  id: string;
  /** The parley pitch — WHY this ground is worth the toll, spoken where the
   *  player decides (the keeper's prompt, the zone-info panel). A form earns
   *  its place by being legible: name the mechanic, the loot, or the feel. */
  pitch: string;
  /** Map-name suffix ("Sunken Grove Hoard") so the node reads as what it is.
   *  Absent = the tileset name stands alone (a delve reads like any zone). */
  nameWord?: string;
  /** Footprint band override in px (TilesetDef.sizeW/sizeH convention).
   *  Absent = the tileset's own footprint (a full zone). */
  size?: { w: [number, number]; h: [number, number] };
  /** Authored objective (wins outright). Absent = the tileset's own roll,
   *  filtered through `objectivePool`. */
  objective?: ObjectiveSpec;
  /** Tileset-roll filter: only these objective kinds may come up when
   *  `objective` is absent — a dead-end never rolls an arena mode that wants
   *  room or a way onward. An emptied pool degrades to 'clear'. */
  objectivePool?: string[];
  /** Ambient pack budget scale (stamped as ZoneDef.packDensity). */
  packDensity?: number;
  /** Kill-drop bounty FLOOR (ZoneDef.bounty) — a guardian's own
   *  PocketSpec.bounty may still raise it. */
  bounty?: number;
  /** Feature floors merged with the guardian's own (PocketSpec.features
   *  shape): raise a layout row to at least `min` of `kind`. */
  features?: { kind: string; min: number; max?: number }[];
  /** TREASURE LITTER at load: [min, max] gem-cache bodies seeded on POIs —
   *  the "littered with plunder" read. */
  caches?: [number, number];
  /** A guaranteed chest: 'objective' stakes the sealed treasure on the zone's
   *  own ask (fell the guard, take the hoard); 'timed' plants the lockpick
   *  chest. Absent = only the ordinary per-zone rolls. */
  chest?: 'objective' | 'timed';
  /** May ambient flavour events (patrols, caravans, sieges) stage here?
   *  Absent/true = yes; a closet-sized cache turns them off. */
  ambientEvents?: boolean;
  /** May the mint roll a faction war? Absent/true = yes (a big delve can host
   *  a brawl); false keeps a small hollow quiet. */
  factionWar?: boolean;
}

export const POCKET_FORMS: Record<string, PocketFormDef> = {};

export function registerPocketForm(def: PocketFormDef): void {
  POCKET_FORMS[def.id] = def;
}

/** Every pocket wears a form; defs minted before forms existed (or naming an
 *  unregistered id) degrade to the default — the full-zone delve. */
export const DEFAULT_POCKET_FORM = 'delve';

export function pocketFormOf(id: string | undefined): PocketFormDef {
  return (id !== undefined ? POCKET_FORMS[id] : undefined) ?? POCKET_FORMS[DEFAULT_POCKET_FORM];
}

// --- stock forms ---------------------------------------------------------------

// THE DELVE — an actual zone whose only exitway is the entry: full footprint,
// full population, and the guardian's bounty/feature promises on top. The
// objective pool bans the modes a cul-de-sac can't honor: 'escape' asks for a
// way onward, 'waves' is an arena mode that spawns AT the population's backs
// (a closet-sized carve put that on the arrival portal). Everything else —
// including the procession, which already degrades to its roadless far-POI
// run in a dead end — plays as authored.
registerPocketForm({
  id: 'delve',
  pitch: 'a whole hidden reach lies past the bar — rich ground, and one road home',
  objectivePool: ['clear', 'spawners', 'bounty', 'offering', 'beacon', 'circuit', 'procession'],
  packDensity: 1,
});

// THE HOARD — the tiny outcropping littered with loot, made DELIBERATE: a
// cave-scale footprint, a light guard commensurate with the ground (walkable-
// area budgeting does the rest), and the plunder is the point — gem caches on
// the POIs, a chest staked on clearing the guard, and every kill's drop gates
// tripled. No patrols, no wars, no arena modes: you bought a strongroom.
registerPocketForm({
  id: 'hoard',
  pitch: 'the wardens camp over a hoard — a small hollow littered with plunder, lightly held',
  nameWord: 'Hoard',
  size: { w: [1020, 1260], h: [840, 1060] },
  objective: { kind: 'clear' },
  packDensity: 0.45,
  bounty: 3,
  caches: [2, 3],
  chest: 'objective',
  ambientEvents: false,
  factionWar: false,
});
