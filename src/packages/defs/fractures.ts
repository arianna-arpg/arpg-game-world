// ---------------------------------------------------------------------------
// FRACTURES — a player-driven CHASE/TIMER pressure module. A volatile fracture
// you RUN OVER unleashes a fissure that crawls (only while you chase its head),
// tearing open chasms that spew faction foes against a nested timer; clear each
// in time and the fracture diverts zone to zone until it collapses or runs out.
//
// TWO variants, color-coded per faction:
//   • ABYSSAL — a NET-NEW faction grafted here, contexts:['fractures'] so it
//     NEVER spawns in ordinary world gen; only a fracture fields it.
//   • LEYLINE — the existing Elemental faction (its traits now list 'fractures'),
//     reusing its roster for an elemental flavour.
//
// The whole loop — zone span, chasms per zone, timers, crawl speed, chasm
// cadence + clear count, rewards — is DATA on the surge below; the Vault tunes
// purely via pressure, and difficulty scales on the live zone level.
// ---------------------------------------------------------------------------

import { FractureField, type FractureSurge } from '../overlays/fractures';
import type { ContentPackage, FactionSpec } from '../types';

/** The Abyssal — fracture-only horrors that climb up out of the earth. Grafted
 *  at boot by the faction generator; contexts:['fractures'] keeps them out of
 *  baseline generation (the spawn-context gate in world/traits.ts). */
const ABYSSAL_FACTION: FactionSpec = {
  id: 'abyssal',
  name: 'the Abyssal',
  color: '#8a4ae0',
  traits: { roaming: 1, aggression: 1.2, warlordHome: 'capital', contexts: ['fractures'] },
  roster: [
    { id: 'abyssal_crawler', weight: 4 },
    { id: 'abyssal_wretch', weight: 3 },
    { id: 'abyssal_seer', weight: 2 },
    { id: 'abyssal_render', weight: 2 },
    { id: 'abyssal_vanguard', weight: 2 },
    { id: 'abyssal_horror', weight: 1 },
  ],
  warlord: 'abyssal_horror',
  // An intrusion from below: hostile to nearly everything it surfaces among (so a
  // fracture opening in occupied ground touches off a brawl). seedWar is auto-
  // suppressed for a fracture-only faction (factionGen), so these never spawn an
  // ordinary procedural war zone. The Elemental kindred (Leyline) is left neutral.
  relations: [
    { a: 'abyssal', b: 'goblin', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'gnoll', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'undead', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'sylvan', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'wild', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'demon', kind: 'hostile', strength: 1 },
    { a: 'abyssal', b: 'crusade', kind: 'hostile', strength: 1 },
  ],
};

/** The chase/timer loop as data — every number is a knob. */
const FRACTURE_SURGE: FractureSurge = {
  triggerChance: 0.006,   // per 0.5s step (×pressure) — a fracture opens now and then
  variants: [
    // Each variant carries its CAPSTONE rift (boss + themed chamber). Adding a
    // faction's capstone = one variant entry + a boss def + a tileset, no engine
    // change. The rift only ever opens for a FULL max-span run (see `capstone`).
    { variant: 'abyssal', faction: 'abyssal', weight: 3,
      capstone: { boss: 'abyssal_tyrant', tileset: 'abyssal_rift', levelBonus: 3, rewardMul: 3.0 } },
    { variant: 'leyline', faction: 'elemental', weight: 2,
      // The chamber rolls an ELEMENT FACE per dive (leyline_nexus variants:
      // pyre/gale/rime/stone confluences — re-themed, re-hazarded, one kit).
      capstone: { boss: 'leyline_sovereign', tileset: 'leyline_nexus', levelBonus: 3, rewardMul: 3.0,
        arena: { rollVariant: true } } },
    { variant: 'hellion', faction: 'demon', weight: 1,
      capstone: { boss: 'hellion_tyrant', tileset: 'hellion_rift', levelBonus: 3, rewardMul: 3.2 } },
  ],
  // STACKED RNG (PoE-Abyss): only a fracture that runs its FULL span AND reached
  // minSpan (= the zoneSpan max, the longest 4-zone chain) gets portalChance to
  // tear open its variant's reward rift. Rare gate × a generous roll = climactic.
  capstone: { minSpan: 4, portalChance: 0.5 },
  zoneSpan: [2, 4],         // origin + diverts — the fracture crosses 2-4 zones
  chasmsPerZone: [2, 3],    // chasms to clear in a zone before it diverts onward
  baseTimer: 30,            // the origin zone's nested timer (s)
  divertTimer: 40,          // a diverted zone refreshes to this (longer) timer
  fissureSpeed: 72,         // px/s the head crawls while you chase it
  chaseRadius: 155,         // stay within this of the head to advance it / pause the timer
  fissureSpawnInterval: [1.6, 2.6], // trickle of crawl-out foes by the moving head
  chasm: {
    radius: 132,
    spawnInterval: [0.7, 1.2],
    spawnBatch: [2, 3],
    clearKills: 8,          // base foes to slay to seal a chasm…
    clearPerLevel: 0.22,    // …+ this per zone level (scales with depth)
  },
  chasmRewardXp: 42,        // per-chasm seal XP base (final/divert seal multiplies it)
  chasmXpPerLevel: 6,       // + this per zone level on every chasm seal
  divertRewardMul: 1.5,     // the divert-seal premium over the chasm reward
  sealReward: { xpBase: 140, xpPerLevel: 24, gems: 3 }, // the run-through bounty
  idleLife: 480,            // an unengaged fracture recycles after this (touch resets it)
};

export const FRACTURES: ContentPackage = {
  id: 'fractures',
  label: 'Fractures',
  blurb: 'A volatile rift you trip by running over it — a fissure crawls as you chase it, tearing open foe-spewing chasms against a nested timer, then diverts zone to zone until it collapses.',
  cost: 120,
  // DISCOVERED in play (runs at defaults from level 10); the Vault unlock gates
  // TUNING, surfacing once you've tripped your first fracture.
  unlock: {
    id: 'fractures_unlock',
    label: 'Trip a fracture (they appear from level 10)',
    test: (ctx) => (ctx.ledger.fractures_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'fracture_delver', label: 'Fracture Delver', requirement: 'Seal 5 fracture chasms', cost: 160,
      test: (ctx) => (ctx.ledger.fracture_chasms_cleared ?? 0) >= 5,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'fracture_breaker', label: 'Abyss-Breaker', requirement: 'Run 3 fractures to their end', cost: 280,
      test: (ctx) => (ctx.ledger.fractures_sealed ?? 0) >= 3,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
    { id: 'fracture_warden', label: 'Rift Warden', requirement: 'Slay a rift champion', cost: 320,
      test: (ctx) => (ctx.ledger.fracture_boss_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'fracture_start', kind: 'startLevel', label: 'Fractures begin at level', min: 10, max: 10, step: 1, defaultValue: 10 },
    { id: 'fracture_weight', kind: 'weight', label: 'Fracture frequency', min: 25, max: 55, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 10,
  defaultEnabled: true,
  world: { overlay: (ctx) => new FractureField(ctx, FRACTURE_SURGE) },
  factions: [ABYSSAL_FACTION],
};
