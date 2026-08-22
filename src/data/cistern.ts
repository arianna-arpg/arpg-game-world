// ---------------------------------------------------------------------------
// THE CISTERN — the scald lake's secret under-story and the lair of THE
// CISTERN CRONE (Scald Basin M3 coda; charter docs/design/scald-basin.md §0
// seventh walk — "give the scald its own distinct sort of side zone" — §8
// the Cistern Crone line, §13 M3). The moonlit mere's GROTTO FORM reused
// (data/merelake.ts + engine/tiers.ts carveUnderGrotto) on the basin seat:
//
//   · THE SHAPE (her "side zone" word steered the read): an under-tier
//     GROTTO beneath the lake's GREAT SHOAL — engine/lake.ts mints one broad
//     isle at the widest shelf bearing whenever a lane is dialed under the
//     lake and holds it out (GenCtx.underSeats); this lane's grotto spec
//     says `seat: 'offered'`, so the chamber sinks ONLY under that shoal
//     (clamped to fit wholly beneath it — no shelf cell ever repainted, the
//     lake keeps every drop of its water) and refuses honestly, byte-flat,
//     when the shoal is too narrow. ONE well + stair on the shoal — the one
//     entryway, reached by WADING the stinging shelf (the lake prices the
//     door); below, a wobble-rimmed chamber, a pool at its heart, a shore
//     ring, the court. Dialed on the sulphur_pools face (data/tilesets.ts
//     `underTier: 'cistern', underTierChance` — a DIAL).
//   · THE SEAL (the mere's layer-honesty law, verbatim): these region rows
//     carry NO gameplay field (no standStatus, pathCost, severity, douse,
//     survival) and NO surface visual but the well's — verified this pass:
//     World's GRID region-sense path is tier-BLIND (walk.regionAt under a
//     body, whatever story it stands on), so a gameplay field on a story row
//     WOULD reach the surface walker on the lid. Leak-proof by construction
//     instead; the crone's verbs are sealed by hostileTo's TIER LAW (layers
//     share a screen, never a fight) — THE BOIL is a skill zone, never a
//     region swap. `cistern_entered` rides UnderTierSpec.ledgerOnDescend.
//   · THE COURT (the lair): a LairSeat row on the `underLane` rung (biomes
//     scald × the heart face × a level envelope × chance — all DIAL),
//     resolved only by this lane's carve; the landmark is the den_mouth
//     builder with an INERT centerpiece (the scalded font — the pool is the
//     destination, no door) seated at the waterline, and THE LIQUID SEAT ON A
//     REGION (`liquidSeat: 'cistern_water'`, engine/landmarkBuilders.ts):
//     the crone spawns IN the water she is rooted on, never wilted on the
//     shore. Exactly one crone (count [1,1]); her court the chamber's own
//     resident fauna — brood matrons (their clutches hatch on her boil: the
//     warm hatch), kettle minnows (frenzy on `scalded` — her boil is their
//     tide), a vent lamprey or two.
//   · THE CRONE (data/monsters.ts `cistern_crone`, looks.ts, data/skills.ts):
//     a scalded naiad-crone, faction coven (diplomacy-silent; the hex tongue
//     already in both mills; her beast court reads neutral to her), lair
//     alpha tier (bossBar, NOT a boss — the mere_sovereign / naiad model),
//     ROOTED on `cistern_water` (the wellspring naiad's grammar on the basin
//     seat — drawn wilt off the water through the rooted tells), a duty post
//     (she returns to her pool), THE NO-TAG LAW (a finite kite budget: she
//     commits or the fight comes to her). Kit: THE BOIL (`cistern_boil` — the
//     GROUNDED storm strike: a ~2s telegraph where the pool visibly broils
//     — the geyser fabric's one roil — then the water scalds whoever stands
//     IN it; the shore inside the ring is dry), a scald undertow (the naiad's
//     drag, fire-typed — reeled INTO the water she stands in), a steam veil
//     (a conjured steam cloud that fog-veils her and her court), firebolt,
//     claw. Pays the lean repeatable `lair_hoard`.
//
// Every number is a DIAL (unblessed — she blesses via playthroughs).
// Probe: balance/probe_cistern.ts. Docs: docs/engine/cistern.md.
// ---------------------------------------------------------------------------

import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { registerLair } from '../engine/lairs';
import { registerUnderTier } from '../engine/tiers';
import { registerRegion } from '../world/regions';
import { DOODAD_VISUALS } from './doodadVisuals';

// --- THE CISTERN REGIONS ----------------------------------------------------------
// The mere's family in the basin's mineral register: walkable means the LID
// stands (the shoal above keeps its crust — no surface visual, no gameplay
// field on any story row: THE SEAL), tier 1 means the story below owns the
// floor. The well alone shows from above: the one entryway must READ.
registerRegion({ id: 'cistern_shore', walkable: true, blocks: false, label: 'the cistern shore',
  tier: 1,
  tierVisual: { fill: '#2a2e22', edge: '#8a8a52' } });
// THE WATER: the crone's pool — sulphur-teal, warm, and (while her boil is
// telegraphed) the roil's own cells. Drawn == tested for the boil through
// World.updateZones' onGround read of these very cells.
registerRegion({ id: 'cistern_water', walkable: true, blocks: false, label: 'the cistern pool',
  tier: 1,
  tierVisual: { fill: '#1f5c5a', edge: '#7fd8c8' } });
// THE CISTERN WELL: the one crossing — a crusted kerb on the shoal, the only
// row of the family that shows on the surface (the door must read from
// above — a find, never a hazard).
registerRegion({ id: 'cistern_well', walkable: true, blocks: false, label: 'the cistern well',
  tier: 1, tierLink: true,
  visual: { fill: '#1a2420', alpha: 0.95, edge: { color: '#c8c070', width: 4 } },
  tierVisual: { fill: '#203a38', edge: '#9fe0d4' } });

// --- THE PROPS (rules + visuals — in-file, the scald kit's idiom) ----------------
// The stair: the one entryway's crossing prop — a crusted kerb, a dark
// throat, a steam-pale breath (the mere stair's role on a sulphur shoal).
registerDoodadRule('cistern_stair', { overlap: 'inert', spacing: 40 });
DOODAD_VISUALS['cistern_stair'] = {
  painter: 'caveMouth', order: 23, bakeWhole: 'static', bakeScope: 3.2,
  params: {
    color: '#2a2c1c', edge: '#b8b060', material: 'stone',
    throat: '#0a0e0c',
    apron: { scale: 2.0, flecks: '#8a9a4a' },
  },
};
// The font: the crone's centerpiece — a scalded spring-mouth at the pool's
// rim (the vent painter's bones: travertine rim, a dark teal throat, sulphur
// heat, a pale core). INERT: the pool is the destination, never a door. No
// light spec on any cistern piece (the light layer's story audit is the
// mere's deferred thread — the glow lives in painter fills).
registerDoodadRule('cistern_font', { overlap: 'inert', spacing: 60 });
DOODAD_VISUALS['cistern_font'] = {
  painter: 'vent', order: 54, shadow: 0.4, longShadow: 0.8,
  params: { rim: '#d8d0b0', throat: '#1f4a48', hot: '#c8d862', core: '#eef8e0' },
};
// The bloom: a steam-fed mineral bud lighting the shore from its own skin
// (the mere bloom's pod grammar in sulphur) — the story's own dress.
registerDoodadRule('cistern_bloom', { overlap: 'inert', spacing: 24 });
DOODAD_VISUALS['cistern_bloom'] = {
  painter: 'pod', order: 50,
  params: { body: '#1c2e2a', glow: '#d8e870', aspectY: 0.9, glowY: -0.2, glowR: 0.5, pulseRate: 0.35 },
};

// --- THE CISTERN LANE (the grotto form, seat 'offered') ----------------------------
// Same registry as the drains/roots/crypts/mere (engine/tiers.ts), the
// grotto FORM, and the one difference that makes it the lake's: the chamber
// seats ONLY under the shoal the lake held out. packSplit 0 is deliberate:
// the cistern's population is AUTHORED (the fauna rows + the court) — no
// surface packs dealt down into a set piece. The forbid list names every
// water the basin pours (the lake's two, the kit's pools, the generic
// lake/deep rows, the wet six): a chamber bores under crust, never under
// water — so no shelf cell is ever repainted and the lake keeps its face.
registerUnderTier('cistern', {
  duct: 'cistern_shore', well: 'cistern_well', stairKind: 'cistern_stair',
  label: 'the cistern', packSplit: 0,
  forbid: [
    'water', 'bog', 'swamp', 'lava', 'chasm', 'ice',
    'sulphur_shelf', 'sulphur_deep', 'sulphur_pool', 'prism_pool', 'mudpot',
    'lake_shallows', 'lake_deep', 'deep_water',
  ],
  kit: [
    { kind: 'cistern_bloom', count: [3, 6], radius: [8, 12] },
    { kind: 'rock', count: [1, 3], radius: [10, 15] },
    { kind: 'bone_pile', count: [1, 2], radius: [9, 13] },
  ],
  ledgerOnDescend: 'cistern_entered',
  grotto: {
    water: 'cistern_water',
    // A tight grotto (the mere's [230,320] is a hall; a cistern is a pool
    // with a rim) at the grotto form's own floor (five cells — a chamber
    // below it is no chamber); the shoal's fit clamps it further (DIAL).
    radius: [150, 190],
    waterFrac: 0.5,
    seat: 'offered',
    // The court stands at THE BRINK — a shore cell touching the pool — so
    // the font's liquid seat reaches the water and the crone boots in it.
    courtSeat: 'brink',
    // THE RESIDENTS (the shelf's kin gone below — the court she keeps):
    // matrons for the clutches her boil hatches, the shoal for the tide,
    // a lamprey or two in the warm dark (DIAL).
    fauna: [
      { id: 'brood_matron', count: [1, 2] },
      { id: 'kettle_minnow', count: [4, 7] },
      { id: 'vent_lamprey', count: [1, 2] },
    ],
  },
});

// --- THE CRONE'S COURT (the lair — the underLane rung's second row) -----------------
// (landmark id  — THE UNIQUE-ID LAW:  is already the
// ruin compositions' id, and generation ids are unique ACROSS the registries.)
// The crone's seat at the waterline: an inert scalded font (no door — the
// pool IS the destination), blooms and bones around it, the crone seeded IN
// THE WATER (THE LIQUID SEAT ON A REGION — `liquidSeat` + where 'liquid':
// she boots rooted, never wilted on the shore; siteTier 1 stamps every
// piece and the spawn row to the story). Exactly one crone, by count.
registerLandmark({
  id: 'crone_court', builder: 'den_mouth', size: [110, 150], clearSite: true,
  siteTier: 1,
  params: {
    mouthKind: 'cistern_font', mouthRadius: 18,
    liquidSeat: 'cistern_water',
    dress: [
      { kind: 'cistern_bloom', count: [2, 4], radius: [8, 12] },
      { kind: 'bone_pile', count: [1, 2], radius: [9, 13] },
    ],
  },
  spawns: {
    table: [{ id: 'cistern_crone', weight: 1 }],
    count: [1, 1], where: 'liquid',
  },
});
registerLair({
  id: 'cistern_crone',
  landmark: 'crone_court',
  seat: {
    biomes: ['scald'],
    place: 'surface',
    tilesets: ['sulphur_pools'],
    underLane: 'cistern',
    // The lake stands at the country's heart already (the face's own
    // staging); the crone arrives when the world can feed her (DIAL).
    level: { from: 8, fadeIn: 3 },
    // RAISED (the mere court's precedent — a cistern that stands usually
    // keeps its crone; the shoal + the dial already make the cistern rare).
    // DIAL.
    chance: 0.6,
  },
});
