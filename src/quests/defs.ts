// ---------------------------------------------------------------------------
// QUEST REGISTRY — the authored quest chains. Adding a quest is one entry here.
// All content referenced (crypt tileset → grave biome, the undead roster, the
// gravecaller boss) is verified to exist in the data registries.
// ---------------------------------------------------------------------------

import type { QuestDef } from './types';
import { vocationQuestDefs } from './vocations';

/** The level-5 exemplar: "go slay the rising undead to the south" — a crypt zone
 *  placed south of town, undead horde + gravecaller boss, always a waypoint. */
export const Q_UNDEAD_SOUTH: QuestDef = {
  id: 'undead_south_l5',
  giver: 'townsfolk_questgiver',
  offerLabel: 'Slay the rising undead to the south',
  offerAtLevel: 5,
  zone: {
    tileset: 'crypt', direction: 's', distance: 1, level: 'character',
    objective: { kind: 'boss', id: 'gravecaller' },
    packsOverride: {
      count: [6, 8], size: [3, 5], table: [
        { id: 'zombie', weight: 3 },
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'crypt_warden', weight: 2 },
        { id: 'bone_serpent', weight: 1 },
      ],
    },
    forceWaypoint: true,
  },
  reward: { xp: 400, gems: 3, passivePoints: 1, ledger: { quests_completed: 1, undead_south_cleared: 1 } },
  // DO-THEN-RETURN: clear the crypt, then come home to the quartermaster for the
  // reward (the passive point is withheld until you return — town as a hub).
  turnIn: {
    giver: 'townsfolk_questgiver',
    prompt: 'The gravecaller is felled — return to the quartermaster to claim your reward.',
  },
  // next: 'rift_east_l10', // (a future chain link, gated on requiresLedger: 'undead_south_cleared')
};

/** A FLOATING find-it: the relic's resting place mints UNCHARTED + DISCONNECTED
 *  to the east — you must EXPLORE toward the "?" on the map until a road forms on
 *  approach. Clear it, then return. Its reward opens the chained follow-up below. */
export const Q_RELIC_EAST: QuestDef = {
  id: 'relic_east_l8',
  giver: 'townsfolk_questgiver',
  offerLabel: 'Find the lost relic, somewhere to the east',
  offerAtLevel: 8,
  zone: {
    tileset: 'crypt', direction: 'e', distance: 2, level: 'character',
    objective: { kind: 'clear' },
    forceWaypoint: true,
    floating: true, // fog-of-war: no road until you explore near it
  },
  reward: { xp: 500, gems: 4, ledger: { quests_completed: 1, relic_recovered: 1 } },
  turnIn: {
    giver: 'townsfolk_questgiver',
    prompt: 'The relic is in hand — return to the quartermaster.',
  },
  next: 'relic_depths_l8',
};

/** The chained follow-up: gated behind relic_recovered (the prior reward's key).
 *  Force-connected (a known path now), boss-capped, and likewise turn-in. */
export const Q_RELIC_DEPTHS: QuestDef = {
  id: 'relic_depths_l8',
  giver: 'townsfolk_questgiver',
  offerLabel: 'Descend into the relic\'s guarded depths',
  offerAtLevel: 8,
  requiresLedger: 'relic_recovered', // only after Q_RELIC_EAST pays out
  zone: {
    tileset: 'crypt', direction: 'e', distance: 1, level: 'character',
    objective: { kind: 'boss', id: 'gravecaller' },
    forceWaypoint: true,
  },
  reward: { xp: 800, gems: 6, passivePoints: 1, ledger: { quests_completed: 1, relic_depths_cleared: 1 } },
  turnIn: {
    giver: 'townsfolk_questgiver',
    prompt: 'The depths are silent — return to the quartermaster for your due.',
  },
};

/** THE UNMADE — the level-20 "uber" boss quest. Offered the moment the character hits
 *  L20 (once Quests are unlocked; no prior-chain gate). FLOATING-mints the Hollow Vault
 *  arena far to the north as an UNCHARTED node — you must EXPLORE toward the "?" until a
 *  road forms (no waypoint AT the arena, and wpExclusionRadius seals nearby waypoints,
 *  so each run is a multi-zone trek — Mephisto-style farming, even after a Campfire
 *  refresh). The full fight rides layoutType:'unmade_vault' (the dais/flood/cracks/ward
 *  choreography). Repeatable: objective.uber is UNSET, and un-Crowned (objective.promote
 *  unset → ~9k HP at lvl 22; add promote:{rarity:'crowned'} for a future spike). */
export const Q_UNMADE: QuestDef = {
  id: 'unmade_l20',
  giver: 'townsfolk_questgiver',
  offerLabel: 'Confront the Unmade in the Hollow Vault',
  offerAtLevel: 20,
  zone: {
    tileset: 'wasteland', direction: 'n', level: 20,
    bandPlacement: true,    // location dictated by the LEVEL field (the lvl-20 band), not a fixed distance
    special: true,          // a clean arena: ignores biome/doodads/events/faction spawns
    layoutType: 'unmade_vault',
    objective: { kind: 'boss', id: 'unmade_chronophage', levelBonus: 2 },
    forceWaypoint: false,   // no waypoint AT the arena — trek to it each run
    floating: true,         // uncharted: explore toward the "?" until a road forms
    wpExclusionRadius: 240,  // ~3-zone buffer: the nearest waypoint stays a trek away
  },
  reward: { xp: 2400, gems: 8, passivePoints: 1, ledger: { quests_completed: 1, unmade_slain: 1 } },
  turnIn: {
    giver: 'townsfolk_questgiver',
    prompt: 'The Unmade is undone — return to the quartermaster.',
  },
};

export const QUESTS: Record<string, QuestDef> = {
  [Q_UNDEAD_SOUTH.id]: Q_UNDEAD_SOUTH,
  [Q_RELIC_EAST.id]: Q_RELIC_EAST,
  [Q_RELIC_DEPTHS.id]: Q_RELIC_DEPTHS,
  [Q_UNMADE.id]: Q_UNMADE,
  // VOCATION CHAINS — generated from data/vocations.ts (one sequential chain
  // per vocation; class-thematic zones; the final step grants the vocation).
  ...Object.fromEntries(vocationQuestDefs().map(q => [q.id, q])),
};
