// ---------------------------------------------------------------------------
// THE MOONLIT MERE — the meadow's secret under-lake (batch 35; her ratified
// design, 2026-08-05, near-verbatim: "one entryway into the rootways can
// occasionally spawn in a meadows area, leading to an underground, ephemeral,
// fantasy-based lake"). Deliberately NOT the garden/downs worm-runs — no
// structural twinning with the lattice countries: this is the under-tier
// vocabulary's first GROTTO lane (UnderTierSpec.grotto, engine/tiers.ts),
// whose payload is ONE set-piece chamber, dual-generated IN-ZONE (one mint,
// two layers), entered down ONE stair.
//
//   · THE MERE (the set piece): a wobble-rimmed chamber under the lea's own
//     floor, a luminous pool at its heart, a shore ring the court and the
//     kit stand on. Carved by the grotto form; dialed per meadow face via
//     `underTier: 'mere'` + `underTierChance` (data/tilesets.ts).
//   · THE EPHEMERALITY (ratified: CONDITION-HELD): the water region is an
//     ordinary span target — the meadow theme's ZoneTheme.spans row holds
//     `mere_water` full while `{ phases: ['dusk','night'] }` holds (the
//     lea's own firefly hours — FLAGGED, one lever if she re-points to
//     night alone), lets it EBB through `mere_water_fading`, and drains it
//     to the walkable `mere_bed` by day. Drawn == tested through every
//     phase by the span fabric's own fillRegion law; nothing here reads
//     the sky.
//   · THE FAUNA (a NEW branch): the merefolk (data/monsters.ts) — fey,
//     luminous, the meadow's palette rather than the aether's — seeded by
//     the grotto as tier-stamped base population. Faction 'merefolk'
//     debuts diplomacy-silent (the jotun/coven law: natives claim ground,
//     not wars).
//   · THE COURT (the lair): a LairSeat row wearing the new `underLane`
//     axis — the claim on the land folds through engine/lairs.ts verbatim
//     (interior + level + a deliberately RAISED chance), and the grotto's
//     carve is the one moment the story's floor exists to seat it on.
//
// THE LAYER-HONESTY SEAL (her QA ask, the pass's heart — probe
// balance/probe_meadowmere.ts): the mere region rows carry NO gameplay
// fields — no standStatus, no pathCost, no severity, no surface visual —
// so nothing about the lake can reach a surface walker through a
// tier-blind read even in principle; the surface keeps its face (the lid
// law) and the standing same-tier combat/veil laws seal the rest. The
// wading flavor (standStatus on the water) is DEFERRED until the region
// sense audit says it is layer-honest — see the pass file.
// ---------------------------------------------------------------------------

import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { registerLair } from '../engine/lairs';
import { registerUnderTier } from '../engine/tiers';
import { registerRegion } from '../world/regions';

// --- THE MERE REGIONS -------------------------------------------------------------
// The crypt/root family in moon-water: walkable means the LID stands (the
// lea above keeps its face — none of these rows carries a surface visual,
// none carries a gameplay field), tier 1 means the story below owns the
// floor. The well alone shows from above: the one entryway must READ.
registerRegion({ id: 'mere_shore', walkable: true, blocks: false, label: 'the mere shore',
  tier: 1,
  tierVisual: { fill: '#101a16', edge: '#3f6a58' } });
// THE WATER, full: the moonlit face (held while the theme's span row holds).
registerRegion({ id: 'mere_water', walkable: true, blocks: false, label: 'the moonlit mere',
  tier: 1,
  tierVisual: { fill: '#1d4a4e', edge: '#7fd8d0' } });
// THE EBB: the leaving-warning shimmer (the span fabric's fading twin).
registerRegion({ id: 'mere_water_fading', walkable: true, blocks: false, label: 'the ebbing mere',
  tier: 1,
  tierVisual: { fill: '#18333a', edge: '#5da8a4' } });
// THE DRAINED BED: day's face — dry silt, still the story's floor (a drained
// mere is walked, never fallen through; the span row's voidRegion).
registerRegion({ id: 'mere_bed', walkable: true, blocks: false, label: 'the drained mere-bed',
  tier: 1,
  tierVisual: { fill: '#141d1a', edge: '#4a5c50' } });
// THE MERE WELL: the one crossing — a moon-pale kerbed descent, the only row
// of the family that shows on the surface (the door must read from above).
registerRegion({ id: 'mere_well', walkable: true, blocks: false, label: 'the mere well',
  tier: 1, tierLink: true,
  visual: { fill: '#0f1a18', alpha: 0.95, edge: { color: '#5a8a7c', width: 4 } },
  tierVisual: { fill: '#16262a', edge: '#7fd8d0' } });

// --- THE MERE LANE (the grotto form's debut) --------------------------------------
// Same registry as the drains/roots/crypts (engine/tiers.ts), a different
// FORM: the grotto block makes the payload one chamber, one pool, one stair.
// packSplit 0 is deliberate: the mere's population is AUTHORED (the fauna
// rows) — no surface packs are dealt down into a set piece.
registerDoodadRule('mere_stair', { overlap: 'inert', spacing: 40 });
registerDoodadRule('mere_bloom', { overlap: 'inert', spacing: 26 });
registerUnderTier('mere', {
  duct: 'mere_shore', well: 'mere_well', stairKind: 'mere_stair',
  label: 'the moonlit mere', packSplit: 0,
  forbid: ['water', 'bog', 'swamp', 'lava', 'chasm', 'ice'],
  kit: [
    { kind: 'mere_bloom', count: [5, 9], radius: [9, 13] },
    { kind: 'rock', count: [2, 4], radius: [12, 18] },
    { kind: 'standing_stone', count: [0, 2], radius: [12, 18] },
  ],
  grotto: {
    water: 'mere_water',
    // radius / waterFrac ride TIER_CFG.grotto's defaults (FLAGGED numbers).
    fauna: [
      { id: 'mere_wisp', count: [3, 5] },
      { id: 'mere_dancer', count: [1, 2] },
      { id: 'mere_leaper', count: [2, 4] },
    ],
  },
});

// --- THE MERE COURT (the lair — LairSeat.underLane's debut row) -------------------
// The sovereign's ring at the waterline: an inert monolith (no door — the
// lake IS the destination), moon-blooms and old stones around it, the court
// seeded on the story's own floor (siteTier 1: the aloft law stamps every
// piece and every spawn). The seat row claims the land through the standing
// fold — interior (the lea leaning into the wood), level, and a chance
// RAISED well above the wild-lair norm (her word), resolved only by the
// mere's own carve (underLane): the standing chokepoints refuse it, so the
// court can never seat on a lakeless lea.
registerDoodadRule('mere_court_stone', { overlap: 'inert', spacing: 60 });
registerLandmark({
  id: 'mere_court', builder: 'den_mouth', size: [150, 200], clearSite: true,
  siteTier: 1,
  params: {
    mouthKind: 'mere_court_stone',
    dress: [
      { kind: 'mere_bloom', count: [3, 5], radius: [9, 13] },
      { kind: 'standing_stone', count: [2, 3], radius: [12, 18] },
    ],
  },
  spawns: {
    table: [
      { id: 'mere_sovereign', weight: 3 },
      { id: 'mere_dancer', weight: 2 },
      { id: 'mere_wisp', weight: 2 },
    ],
    count: [4, 6], where: 'interior',
  },
});
registerLair({
  id: 'mere_court',
  landmark: 'mere_court',
  seat: {
    biomes: ['grove'],
    place: 'surface',
    tilesets: ['meadow'],
    underLane: 'mere',
    // The court gathers where the lea leans into the wood (the meadow band
    // runs the grove's rim, biomeDepth ≲ 0.46 — this asks its deeper half).
    interior: { from: 0.12, fadeIn: 0.1 },
    level: { from: 4, fadeIn: 2 },
    // RAISED (her word): roughly double the wild-lair norm (barrow watch
    // 0.22, hag 0.2) — a mere that stands usually keeps its court. FLAGGED.
    chance: 0.45,
  },
});
