// ---------------------------------------------------------------------------
// BREACH — a NET-NEW package, proving the framework absorbs a new feature in one
// def file: a new faction (grafted by the faction generator), a new overlay
// mechanic (BreachField), and one registry line. A base-game feature
// (defaultEnabled true — it runs at defaults from level 10); the Vault unlock
// gates TUNING, and each investment tier widens the sliders. It amplifies
// Demon Invasions while both run (an inter-package relationship).
// ---------------------------------------------------------------------------

import type { EncounterDef } from '../encounters';
import { BreachField } from '../overlays/breach';
import type { ContentPackage, FactionSpec } from '../types';

/** The Riftspawn faction, grafted into the data registries at boot. */
const BREACH_FACTION: FactionSpec = {
  id: 'breach',
  name: 'the Riftspawn',
  color: '#b04ae8',
  traits: { roaming: 0.9, aggression: 1.4, warlordHome: 'capital' },
  roster: [
    { id: 'breach_spawn', weight: 4 },
    { id: 'breach_horror', weight: 2 },
    { id: 'breach_lord', weight: 1 },
  ],
  warlord: 'breach_lord',
  relations: [
    { a: 'breach', b: 'demon', kind: 'ally', strength: 1 },
    { a: 'breach', b: 'undead', kind: 'hostile', strength: 1 },
    { a: 'breach', b: 'goblin', kind: 'hostile', strength: 1 },
    { a: 'breach', b: 'sylvan', kind: 'hostile', strength: 1 },
  ],
};

/** The in-zone Breach encounter: a glowing diamond that opens a growing,
 *  kill-fed field flooding its radius with Riftspawn. Three SCALES encode the
 *  small-window-vs-large-tear variance purely as numbers. */
const BREACH_ENCOUNTER: EncounterDef = {
  id: 'breach',
  packageId: 'breach',
  label: 'Breach',
  factions: ['breach'],
  trigger: { glyph: '◈', color: '#b04ae8', activateRadius: 30 },
  timePerKill: 0.18,   // the minuscule per-kill add that snowballs fast clears
  radiusPerKill: 1.2,
  scales: [
    { id: 'fracture', label: 'Breach Fracture', weight: 6,
      baseTime: 18, maxBonusTime: 25, startRadius: 90, maxRadius: 260, growthPerSec: 6,
      spawnInterval: [1.4, 2.2], spawnBatch: [2, 3], rewardMul: 1 },
    { id: 'rift', label: 'Breach Rift', weight: 3,
      baseTime: 30, maxBonusTime: 60, startRadius: 110, maxRadius: 420, growthPerSec: 9,
      spawnInterval: [1.0, 1.6], spawnBatch: [3, 5], rewardMul: 1.8 },
    { id: 'cataclysm', label: 'Tear in Reality', weight: 1,
      baseTime: 55, maxBonusTime: 120, startRadius: 140, maxRadius: 600, growthPerSec: 12,
      spawnInterval: [0.7, 1.2], spawnBatch: [5, 8], rewardMul: 3.2 },
  ],
  ledger: {
    onEncounter: 'breach_encountered', // first open → "Breach discovered"
    onClose: 'breaches_closed',        // the investment milestone (Investigation @ 5)
    onCollapse: 'breach_variant_entered',
    onChampion: 'breach_champion_seen',
  },
};

export const BREACH: ContentPackage = {
  id: 'breach',
  label: 'Breach',
  blurb: 'Tears in reality split open, flooding a zone with rift-spawn until the breach seals.',
  color: '#a64dd8',
  cost: 80, // the base "Attunement" — grants the minor frequency slider
  // DISCOVERY: the Vault surfaces Breach's config once you've OPENED one (which
  // first happens around level 10, when breaches start appearing). Unlocking it
  // grants only a MINOR frequency band; investing further WIDENS it (tiers below).
  unlock: {
    id: 'breach_attune',
    label: 'Open a Breach (they appear from level 10)',
    test: (ctx) => (ctx.ledger.breach_encountered ?? 0) >= 1,
  },
  tiers: [
    { id: 'breach_invest', label: 'Breach Investigation', requirement: 'Seal 5 Breaches', cost: 120,
      test: (ctx) => (ctx.ledger.breaches_closed ?? 0) >= 5,
      grants: { weight: { min: 0, max: 80 } } },          // widen the frequency band
    { id: 'breach_explore', label: 'Breach Exploration', requirement: 'Seal 15 Breaches or face a Breach Champion', cost: 220,
      // Reachable NOW via a deep seal-count; once the Phase-3 collapse → Champion
      // chain ships (bumping breach_champion_seen), facing one is the faster path.
      test: (ctx) => (ctx.ledger.breach_champion_seen ?? 0) >= 1 || (ctx.ledger.breaches_closed ?? 0) >= 15,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } }, // free reign + enable/disable
  ],
  modifiers: [
    // Base bands are NARROW; the tiers above widen them. startLevel is locked at
    // 10 (the discovery level) until Exploration grants 0..101 (enable/disable).
    { id: 'breach_start', kind: 'startLevel', label: 'Breaches begin at level', min: 10, max: 10, step: 1, defaultValue: 10 },
    { id: 'breach_weight', kind: 'weight', label: 'Breach frequency', min: 30, max: 60, step: 5, defaultValue: 50 },
  ],
  defaultWeight: 50,
  defaultStartLevel: 10,         // breaches begin appearing at character level 10…
  defaultEnabled: true,         // …and they're a base-game feature DISCOVERED in play
                                // (the Vault unlock gates TUNING, not the feature).
  world: { overlay: (ctx) => new BreachField(ctx) },
  encounters: [BREACH_ENCOUNTER],
  factions: [BREACH_FACTION],
  relationships: [
    { a: 'breach', b: 'demon_invasion', kind: 'amplifies', strength: 1.25 },
  ],
};
