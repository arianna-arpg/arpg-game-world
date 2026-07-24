// ---------------------------------------------------------------------------
// THE GLOAMING — package def: the surge (every knob as data), the Gloamborn
// (the dark's own bodies, context-locked to the front), and the package row.
//
// Distinctness ledger (docs/engine/gloaming.md): Descent keeps the
// underground; Long Night is the Court feeding under a night sky; Long Candle
// is two courts warring over candle-light. THE GLOAMING IS THE DARK ITSELF
// ARRIVING — no faction owns it, noon gloom is gloom, and it eats light:
// yours (the LIGHT survival meter) and its own sources' (finite lightwells).
// ---------------------------------------------------------------------------

import { GloamingField, type GloamingSurge } from '../overlays/gloaming';
import type { ContentPackage, FactionSpec } from '../types';

export const GLOAMING_SURGE: GloamingSurge = {
  igniteChance: 0.016,           // per 0.5s step, dusk/night only — ~a front per long while
  beginPhases: ['dusk', 'night'],
  originBiome: 'gloamwood',
  advanceEverySec: 45,           // one ring of zones per ~45s: a march you can watch
  maxRing: 4,                    // the wood + four rings of the web
  holdSec: 150,
  recedeEverySec: 30,            // the retreat comes a little quicker than the rise
  rampHops: 2.5,                 // rim → full dark over ~2.5 hops of depth
  cooldownSec: [420, 660],

  drainPerSec: 6,                // ~17s from full in deep gloom outside light
  recoverPerSec: 18,             // the eyes recover fast once the dark lifts
  easeSec: 2.2,
  gloomDark: 0.86,               // deeper than any natural night (nightDark 0.66)
  wash: { color: '#241e3c', alpha: 0.16 },
  wells: { kind: 'gloomwell', cap: 5, firstSec: 2.5, everySec: [7, 13], nearR: [260, 620], minSep: 300 },
  grants: [
    // Everyone in the dark outside light: sight shrinks AND you are harder to
    // see (brush stealth composes multiplicatively — near-invisibility is the
    // intended payoff). The dark's own kin hunt unimpaired.
    { status: 'gloomveiled', notFactions: ['gloamborn', 'nightkin'] },
  ],
  spawnBias: [
    { faction: 'nightkin', mulAtFull: 2.0 },
    { faction: 'undead', mulAtFull: 1.3 },
  ],
  injectFactions: ['gloamborn', 'nightkin'],
  injectFrom: 0.35,
  // The world map's territory read: covered ground fuses into one dark
  // country (tiles never stack), roads between covered zones run as tendrils.
  map: { cellSpan: 9, nodeR: 34, roadR: 13, maxAlpha: 0.55 },
  // CO-OCCURRENCE flavor (announced once per front, detection generic by
  // overlay id): a candle-war fought under the risen dark is the promised
  // three-way light war — the courts war OVER light while the dark EATS it.
  pairs: {
    longcandle: { text: 'Candle-war under the gloaming — three sides now, and the dark eats what they fight for.', color: '#e8c060' },
  },
  color: '#6a5a9c',
};

/** THE GLOAMBORN — the dark's own bodies. contexts:['gloaming'] keeps them out
 *  of ordinary generation entirely: they arrive ONLY where the front stands
 *  (injectFactions above). No warlord ambitions, no relations — the dark is
 *  not a nation. Four silhouettes, four defense textures, one glance each:
 *  the drifting mote-swarm that DRINKS the lamps (snuffwick, wellDrain), the
 *  low lean thing that hunts in it (murk_prowler, evasion), the robed thief
 *  wearing a STOLEN light (wick_keeper, ES-glass), and the tall unlit warden
 *  with the dead lantern on a crook (hollow_shepherd, poise wall). */
const GLOAMBORN_FACTION: FactionSpec = {
  id: 'gloamborn',
  name: 'the Gloamborn',
  color: '#6a5a9c',
  traits: { roaming: 0.5, aggression: 1.15, warlordHome: 'capital', contexts: ['gloaming'] },
  roster: [
    { id: 'snuffwick', weight: 4, presence: { to: 14, fadeOut: 6 } },
    { id: 'murk_prowler', weight: 3, presence: { from: 4, fadeIn: 3 } },
    { id: 'wick_keeper', weight: 2, presence: { from: 7, fadeIn: 3 } },
    { id: 'hollow_shepherd', weight: 1, presence: { from: 9, fadeIn: 4 } },
    // The muster pass: the angler in the murk, the sexton who marks
    // whose light is NEXT, and the warden of the hush.
    { id: 'murk_angler', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'dusk_sexton', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'hush_warden', weight: 1, presence: { from: 8, fadeIn: 4 } },
  ],
};

export const GLOAMING: ContentPackage = {
  id: 'gloaming',
  label: 'The Gloaming',
  color: '#6a5a9c',
  blurb: 'Some evenings the gloamwood does not keep its dark to itself. A gloaming gathers over the wood and walks outward zone by zone — not night, not weather you can wait out: a dark that EATS light. Under it your own light is a draining meter, and the only refuge is light with a body to it — the lamps of the roads, the hearths of camps, and the gloomwells that flare up through the murk. Every light holds a finite store: stand in it and you drink it dim, share it and it dims twice as fast, and the Gloamborn come drinking too. When a light gutters out, the dark closes over the spot like water. Carry the front, or outlast it — it recedes the way it came, wood-ward, rim first.',
  cost: 120,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once you have stood in the deep dark and felt it drink.
  unlock: {
    id: 'gloaming_unlock',
    label: 'Stand in the deep of a gloaming (the dark rises from the gloamwood)',
    test: (ctx) => (ctx.ledger.gloaming_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'gloaming_lampwarden', label: 'Lampwarden', requirement: 'Outlast 2 gloamings', cost: 180,
      test: (ctx) => (ctx.ledger.gloaming_survived ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'gloaming_dark_astray', label: 'Walker in the Dark', requirement: 'Outlast 5 gloamings', cost: 280,
      test: (ctx) => (ctx.ledger.gloaming_survived ?? 0) >= 5,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'gloaming_start', kind: 'startLevel', label: 'The Gloaming stirs at level', min: 4, max: 4, step: 1, defaultValue: 4 },
    { id: 'gloaming_weight', kind: 'weight', label: 'Gloaming frequency', min: 15, max: 45, step: 5, defaultValue: 25 },
  ],
  defaultWeight: 25,
  defaultStartLevel: 4,
  defaultEnabled: true,
  world: { overlay: (ctx) => new GloamingField(ctx, GLOAMING_SURGE) },
  factions: [GLOAMBORN_FACTION],
  // The Court hunts best under a borrowed dark: a risen gloaming feeds the
  // Long Night's whole calendar, and the candle-courts war harder for light
  // the dark is eating (the three-way light war — the pairs row above
  // announces it; these rows make runs COMPOSE it more often).
  relationships: [
    { a: 'gloaming', b: 'long_night', kind: 'amplifies', strength: 1.15 },
    { a: 'gloaming', b: 'longcandle', kind: 'amplifies', strength: 1.1 },
  ],
  validate: (look) => [
    ...GLOAMBORN_FACTION.roster.filter(e => !look.monster(e.id)).map(e => `gloamborn '${e.id}' unknown`),
    ...GLOAMING_SURGE.spawnBias.filter(r => !look.faction(r.faction)).map(r => `spawn-bias faction '${r.faction}' unknown`),
    ...(look.biome(GLOAMING_SURGE.originBiome) ? [] : [`origin biome '${GLOAMING_SURGE.originBiome}' unknown`]),
  ],
};
