// ---------------------------------------------------------------------------
// BRIGANDS — a NOMADIC bandit RAID that strikes one zone (a net-new package).
//
// A Warband-like mechanic that needs NO territory: a single band of thieves musters at one
// charted place and MARCHES across the world toward ONE target zone — shown "invading" on
// the map (a marching arrowhead bearing down on the mark, like a war host). On arrival it
// becomes ONE pack that WANDERS that zone looking for marks — NOT a stream of bodies, and
// no marching-on to a destination. They are NEUTRAL until a player strays within their
// aggro range — then the cohort turns and robs you; back off and they lose interest (the
// engine's neutral-reset). Avoid them and leave, and they've moved on by your return.
//
// Reuses the existing 'bandit' faction + monster defs (grafted by the Holdfast package),
// so this declares NO faction of its own. Discovered in play (runs at defaults, like
// Migration/Deadwake); the Vault unlock gates TUNING. The whole mechanic — ignition
// cadence, muster/march timings, the linger window, pack sizes, aggro radius, the roster,
// the variants — is DATA on the surge below, so it tunes + extends without touching the
// engine. The march-to-a-target / strike-on-arrival shape is reusable for future "X
// invades a zone" events.
// ---------------------------------------------------------------------------

import { BrigandField, type BrigandSurge } from '../overlays/brigands';
import type { ContentPackage } from '../types';

/** The whole nomadic-raid mechanic as data — every number is a knob. */
const BRIGAND_SURGE: BrigandSurge = {
  igniteChance: 0.02,    // per 0.5s step — an occasional raid (gated by ≥2 charted nodes)
  maxConcurrent: 2,
  musterSeconds: [25, 55], // they gather at the origin before setting out…
  marchSpeed: 8,           // …then march across the map toward ONE target zone (node-units/sec)
  presentSeconds: [45, 90],// linger on the struck zone this long, waiting for a mark to wander in
  lingerSeconds: [80, 140],// once landed, the pack prowls this long (calm) before drifting off
  radius: 11,              // map-glyph ring size (the marching arrow / arrival pulse)
  faction: 'bandit',
  // The pack's ROSTER — the existing bandit monster defs (cutthroats are the
  // bulk; the powder kin ride along so raids crackle with gunfire).
  roster: [
    { id: 'bandit_cutthroat', weight: 5 },
    { id: 'bandit_bruiser', weight: 2 },
    { id: 'bandit_keeper', weight: 1 },
    { id: 'bandit_fusilier', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'bandit_grenadier', weight: 1, presence: { from: 7, fadeIn: 4 } },
    // Seasoned warbands march behind a shield-wall (and its taunt).
    { id: 'bulwark_thane', weight: 1, presence: { from: 5, fadeIn: 3 } },
    { id: 'bandit_wardcaster', weight: 1, presence: { from: 6, fadeIn: 3 } },
    // The parity-pass wing: the new class kits, worn by the warband — a
    // snare-layer, a pit fighter, a singer keeping the raid's meter, and a
    // bannerman whose standard rallies THEM.
    { id: 'bandit_trapsmith', weight: 1, presence: { from: 5, fadeIn: 3 } },
    { id: 'pit_champion', weight: 1, presence: { from: 7, fadeIn: 4 } },
    { id: 'warband_skald', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'camp_bannerman', weight: 1, presence: { from: 8, fadeIn: 4 } },
  ],
  levelBonus: 0,
  aggroRadius: 300,        // stray within this of a brigand and the band turns hostile…
  rouseRadius: 240,        // …and kin within this wake with it (the cohort robs you together)
  // The FLAVOURS a fresh raid rolls — a big Marauder Column vs a few Lone Outlaws (one pack each).
  variants: [
    { id: 'column', name: 'Marauder Column', weight: 2, packSize: 9, color: '#a87440' },
    { id: 'party', name: 'Raiding Party', weight: 4, packSize: 6, color: '#9a6a3a' },
    { id: 'outlaws', name: 'Lone Outlaws', weight: 3, packSize: 3, color: '#8a5e34' },
  ],
  color: '#9a6a3a',
  minSpan: 220,            // origin + target must be ≥ this apart (a real march in)
  arriveDist: 16,          // this close to the mark = arrived (map-space slack)
};

export const BRIGANDS: ContentPackage = {
  id: 'brigands',
  label: 'Brigands',
  blurb: 'No throne, no banner, no ground to hold — only the road and what travels it. A band of thieves musters in the wilds and marches on some unlucky stretch of the map, then prowls it for marks. Stay clear and they let you pass; stray too close and the whole band turns to rob you. Give them distance and they lose interest soon enough — their trade is the purse, not the grave.',
  cost: 110,
  unlock: {
    id: 'brigands_unlock',
    label: 'Be set upon by a roving band (they march the wilds from low levels)',
    test: (ctx) => (ctx.ledger.brigands_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'brigands_marked', label: 'Marked', requirement: 'Survive 3 brigand bands', cost: 150,
      test: (ctx) => (ctx.ledger.brigands_seen ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'brigands_hunted', label: 'Hunted', requirement: 'Survive 8 brigand bands', cost: 220,
      test: (ctx) => (ctx.ledger.brigands_seen ?? 0) >= 8,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'brigands_start', kind: 'startLevel', label: 'Brigands begin at level', min: 2, max: 2, step: 1, defaultValue: 2 },
    { id: 'brigands_weight', kind: 'weight', label: 'Brigand frequency', min: 15, max: 50, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 2,
  defaultEnabled: true,
  world: { overlay: (ctx) => new BrigandField(ctx, BRIGAND_SURGE) },
  validate: (look) => [
    ...(look.faction(BRIGAND_SURGE.faction) ? [] : [`band faction '${BRIGAND_SURGE.faction}' unknown`]),
    ...BRIGAND_SURGE.roster.filter(e => !look.monster(e.id)).map(e => `band monster '${e.id}' unknown`),
  ],
};
