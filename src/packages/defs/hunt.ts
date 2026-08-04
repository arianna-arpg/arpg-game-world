// ---------------------------------------------------------------------------
// HUNT — a roving monster-hunter event. Footprints in the zones reveal a great
// BEAST's lair; travel there, bloody it, and it FLEES across zones (its health
// preserved) until a final stand. Showcases the AI-package layer (flee phases +
// charge impulses) and cross-zone entity remembrance. Seeded with the Wilds'
// Gorehorn Behemoth; any faction's beast is one more HuntBeast entry.
// ---------------------------------------------------------------------------

import { HuntField, type HuntSurge } from '../overlays/hunt';
import type { ContentPackage } from '../types';

// Exported for QA: the quarry pool is a SEAT (probe_anatomy's census reads
// these rows — a hunt beast is reachable BY the hunt, never a spawn table).
export const HUNT_SURGE: HuntSurge = {
  triggerChance: 0.006,   // per 0.5s step (×pressure) — a hunt opens now and then
  trackStages: [1, 3],    // times the tracks are FOUND (incl. the first) before the beast is located
  dwellSeconds: 0.9,      // linger by the tracks this long to read the trail
  // THE QUARRY POOL (batch 28 — grown from one to seven): each row one great
  // beast, one landed fabric as its whole argument (defs in data/monsters.ts,
  // THE HUNT BESTIARY block), banded to the CHARACTER level so the pool reads
  // as a progression (HuntBeast.level; an emptied band falls back to the full
  // pool). The located map pin wears each quarry's own glyph.
  beasts: [
    { faction: 'wild', defId: 'wilds_behemoth', weight: 1 },                                  // the founding quarry — every band
    { faction: 'wild', defId: 'hunt_knucker', weight: 1, level: [8, 26], glyph: '🐍' },       // the segment fabric — the early river-wyrm
    { faction: 'undead', defId: 'hunt_barghest', weight: 1, level: [10, 42], glyph: '🐺' },   // the watch fabric — it stalks you back
    { faction: 'flesh', defId: 'hunt_wendigo', weight: 1, level: [12, 60], glyph: '🦌' },     // the drive fabric — the hunger that walks
    { faction: 'wild', defId: 'hunt_roc', weight: 1, level: [14, 80], glyph: '🦅' },          // the flight fabric — prints are kill sites
    { faction: 'demon', defId: 'hunt_chimera', weight: 1, level: [16, 100], glyph: '🦁' },    // the anatomy gamut — break the lessons
    { faction: 'undead', defId: 'hunt_draugr', weight: 1, level: [18, 100], glyph: '⚰️' },    // the rampage fabric — the undead colossus
  ],
  // WHERE the lair seats (the seat fabric): off the player's boots, inside
  // the forechart halo's reach, leaning hard into country nobody has walked
  // — the trail pin then leads the hunter out into the unknown. The BIOME
  // lean (SeatTuning.biomeMul): hunts open most often in the FIELDS and the
  // DOWNS — the open running country where a great beast's trail reads —
  // without ever refusing the rest of the world.
  seat: { range: { min: 140, max: 640 }, unknownMul: 2.2, veiledMul: 1.25, biomeMul: { field: 2.2, downs: 2.2 } },
};

export const HUNT: ContentPackage = {
  id: 'hunt',
  label: 'The Hunt',
  color: '#b58a52',
  blurb: 'Footprints in the wilds lead to a great beast: bloody it and it flees across the zones, health and all, until you run it down for the kill.',
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
  validate: (look) => HUNT_SURGE.beasts.flatMap(b => [
    ...(look.faction(b.faction) ? [] : [`beast faction '${b.faction}' unknown`]),
    ...(look.monster(b.defId) ? [] : [`beast '${b.defId}' unknown`]),
  ]),
};
