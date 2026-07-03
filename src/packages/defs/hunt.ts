// ---------------------------------------------------------------------------
// HUNT — a roving monster-hunter event. Footprints in the zones reveal a great
// BEAST's lair; travel there, bloody it, and it FLEES across zones (its health
// preserved) until a final stand. Showcases the AI-package layer (flee phases +
// charge impulses) and cross-zone entity remembrance. Seeded with the Wilds'
// Gorehorn Behemoth; any faction's beast is one more HuntBeast entry.
// ---------------------------------------------------------------------------

import { HuntField, type HuntSurge } from '../overlays/hunt';
import type { ContentPackage } from '../types';

const HUNT_SURGE: HuntSurge = {
  triggerChance: 0.006,   // per 0.5s step (×pressure) — a hunt opens now and then
  trackStages: [1, 3],    // times the tracks are FOUND (incl. the first) before the beast is located
  dwellSeconds: 0.9,      // linger by the tracks this long to read the trail
  beasts: [
    { faction: 'wild', defId: 'wilds_behemoth', weight: 1 },
    // Add a beast for any faction here — one line each (e.g. an undead colossus).
  ],
};

export const HUNT: ContentPackage = {
  id: 'hunt',
  label: 'The Hunt',
  blurb: 'Footprints in the wilds lead to a great beast — bloody it and it flees across the zones, health and all, until you run it down for the kill.',
  cost: 110,
  // DISCOVERED in play (runs at defaults from level 8); the Vault unlock gates
  // TUNING, surfacing once you've tracked down a beast.
  unlock: {
    id: 'hunt_unlock',
    label: 'Track a beast to its lair (hunts appear from level 8)',
    test: (ctx) => (ctx.ledger.hunt_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'hunt_tracker', label: 'Master Tracker', requirement: 'Slay 2 hunted beasts', cost: 150,
      test: (ctx) => (ctx.ledger.hunt_beasts_slain ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'hunt_warden', label: 'Beast-Warden', requirement: 'Slay 5 hunted beasts', cost: 260,
      test: (ctx) => (ctx.ledger.hunt_beasts_slain ?? 0) >= 5,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'hunt_start', kind: 'startLevel', label: 'Hunts begin at level', min: 8, max: 8, step: 1, defaultValue: 8 },
    { id: 'hunt_weight', kind: 'weight', label: 'Hunt frequency', min: 25, max: 55, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 8,
  defaultEnabled: true,
  world: { overlay: (ctx) => new HuntField(ctx, HUNT_SURGE) },
};
