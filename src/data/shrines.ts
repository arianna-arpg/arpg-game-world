// ---------------------------------------------------------------------------
// SHRINES & ALTARS — points of interest that touch the modifier system.
//
// A SHRINE is activatable: the first to touch it (the player) drinks a
// timed buff and the shrine goes dark. An ALTAR is a standing field: its
// modifiers apply to EVERYONE inside the radius — you, your minions, and
// the things hunting you — so fights bend around where the altar stands.
// Both are pure modifier bundles; new ones are one data entry.
// ---------------------------------------------------------------------------

import { mod, type Modifier } from '../engine/stats';

export interface ShrineDef {
  id: string;
  name: string;
  color: string;
  duration: number;
  mods: Modifier[];
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
];
