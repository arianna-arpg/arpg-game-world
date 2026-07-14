// ---------------------------------------------------------------------------
// SHRINES & ALTARS — points of interest that touch the modifier system.
//
// A SHRINE is activatable: the first to touch it (the player) drinks a
// timed buff and the shrine goes dark. An ALTAR is a standing field: its
// modifiers apply to EVERYONE inside the radius — you, your minions, and
// the things hunting you — so fights bend around where the altar stands.
//
// Altars also carry BEHAVIOR VERBS beyond flat modifiers, each optional,
// each pure data (the engine runs whichever a row declares):
//   bolts    — a LOCALIZED STORM: telegraphed strikes rain on random points
//              inside the field, frying friend and foe alike (the weather-
//              strike pipeline, altar-local) — risk versus reward made ground.
//   killGems — kills INSIDE the field spill bonus gems (greed with teeth).
//   mend     — a heal pulse to EVERYONE inside, your enemies included.
// New shrines/altars are one data entry; the OFFERING objective
// (data/objectives.ts) borrows any altar row as its hungering centerpiece,
// so a new altar kind is automatically a new objective flavor too.
// ---------------------------------------------------------------------------

import { mod, type Modifier } from '../engine/stats';
import type { WeatherStrike } from '../world/weather';

/** PLACEMENT HYGIENE for interactive stands (shrines, altars, gem caches,
 *  chests, survey spires): the clearance every such placement keeps from the
 *  zone's DOORS — entry pad, exit portals, cave mouths, realm gates, the
 *  waypoint. An altar atop a portal is a misclick machine (the Aetherial's
 *  cramped isles used to stack them); placements prefer a clear point of
 *  interest, then a clear far point, then SLIDE off the doors — placed
 *  farther is fine, placed atop is never. Per-def override: `portalClear`. */
export const INTERACT_PLACE_CFG = {
  /** Default door clearance (world units) for any interactive stand. */
  portalClear: 120,
} as const;

export interface ShrineDef {
  id: string;
  name: string;
  color: string;
  duration: number;
  mods: Modifier[];
  /** Door clearance override for this row (default INTERACT_PLACE_CFG). */
  portalClear?: number;
}

export const SHRINES: ShrineDef[] = [
  {
    id: 'swiftness', name: 'Shrine of Swiftness', color: '#5ad8d8', duration: 20,
    mods: [
      mod('moveSpeed', 'increased', 0.3),
      mod('attackSpeed', 'increased', 0.2),
      mod('castSpeed', 'increased', 0.2),
    ],
  },
  {
    id: 'wrath', name: 'Shrine of Wrath', color: '#e05050', duration: 20,
    mods: [mod('damage', 'increased', 0.45)],
  },
  {
    id: 'stoneskin', name: 'Shrine of Stoneskin', color: '#b8a878', duration: 20,
    mods: [mod('armor', 'flat', 70), mod('damageTaken', 'more', -0.2)],
  },
  {
    id: 'barrage', name: 'Shrine of the Barrage', color: '#b06bd4', duration: 18,
    mods: [
      mod('projectileCount', 'flat', 1),
      mod('projectileSpeed', 'increased', 0.25),
    ],
  },
  {
    id: 'renewal', name: 'Shrine of Renewal', color: '#6fc06f', duration: 25,
    mods: [mod('lifeRegen', 'flat', 6), mod('manaRegen', 'flat', 4)],
  },
];

export interface AltarDef {
  id: string;
  name: string;
  color: string;
  radius: number;
  /** Applied to every actor inside — friend, foe, and minion alike. */
  mods: Modifier[];
  /** LOCALIZED STORM: telegraphed strikes on random points inside the field,
   *  hitting EVERYONE beneath (the weather-strike shape, altar-local — the
   *  telegraph disc is dodgeable and the AI reads it like any blast). */
  bolts?: WeatherStrike;
  /** Kills INSIDE the field spill bonus gems (rolled per death). */
  killGems?: { chance: number; count: [number, number] };
  /** A heal pulse to EVERYONE inside every `every` seconds — your enemies
   *  included (heal = base + perLevel × zone level). Bring burst, or fight
   *  outside the light. */
  mend?: { every: number; base: number; perLevel: number };
  /** POI roll weight (default 1) — rarer altars stand on rarer ground. */
  weight?: number;
  /** Door clearance override for this row (default INTERACT_PLACE_CFG). */
  portalClear?: number;
}

export const ALTARS: AltarDef[] = [
  {
    id: 'wrath_altar', name: 'Altar of Wrath', color: '#d04848', radius: 170,
    mods: [mod('damage', 'more', 0.35), mod('damageTaken', 'more', 0.3)],
  },
  {
    id: 'haste_altar', name: 'Altar of Haste', color: '#e8c848', radius: 160,
    mods: [
      mod('moveSpeed', 'increased', 0.3),
      mod('attackSpeed', 'increased', 0.3),
      mod('castSpeed', 'increased', 0.3),
    ],
  },
  {
    id: 'bulwark_altar', name: 'Altar of the Bulwark', color: '#9aa0b8', radius: 170,
    mods: [mod('armor', 'flat', 80), mod('moveSpeed', 'more', -0.12)],
  },
  {
    id: 'blood_altar', name: 'Altar of Blood', color: '#b03048', radius: 160,
    mods: [mod('lifeLeech', 'flat', 0.06), mod('lifeRegen', 'more', -1)],
  },
  // --- The behavior-verb rows (the parity expansion) -------------------------
  // THE GATHERING STORM: bolts rain inside the field on everyone — the small
  // damage edge is the wager, the sky is the house. Slower and tighter than
  // true weather (the weather front's own storm_call, re-tuned by data).
  {
    id: 'storm_altar', name: 'Altar of the Gathering Storm', color: '#8fb8ff', radius: 180,
    mods: [mod('damage', 'more', 0.12)],
    bolts: { skillId: 'storm_call', radius: 52, telegraph: 0.75, ratePerSec: 0.55 },
    weight: 0.8,
  },
  // GILDED: greed with teeth — kills inside spill bonus gems, but the field
  // sharpens everything's appetite for YOU too.
  {
    id: 'gilded_altar', name: 'Gilded Altar', color: '#ffd76a', radius: 160,
    mods: [mod('damageTaken', 'more', 0.1)],
    killGems: { chance: 0.45, count: [1, 2] },
    weight: 0.9,
  },
  // MENDING: the light heals EVERYONE it touches. Sustain heaven for you —
  // and for the thing you're trying to kill. Bring burst, or step out.
  {
    id: 'mending_altar', name: 'Altar of Mending', color: '#7fd0a0', radius: 170,
    mods: [],
    mend: { every: 2.2, base: 7, perLevel: 1.6 },
    weight: 0.9,
  },
  // STILL HOURS: everyone slows under the pale light — melee heaven, kiting
  // hell; the timeflow feel as pure ground.
  {
    id: 'still_altar', name: 'Altar of Still Hours', color: '#b8c8e8', radius: 170,
    mods: [
      mod('moveSpeed', 'more', -0.15),
      mod('attackSpeed', 'more', -0.15),
      mod('castSpeed', 'more', -0.15),
    ],
    weight: 0.7,
  },
];
