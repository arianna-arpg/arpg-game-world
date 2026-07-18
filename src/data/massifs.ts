// ---------------------------------------------------------------------------
// MASS KINDS — content for THE MASSIF FABRIC (engine/massif.ts).
//
// The engine ships the reference stone country (tor / bluff / fold); this
// file is where the WORLD'S mass vocabulary grows. A kind is one registration:
// name a REGISTERED region (world/regions.ts carries collision, shot/sight
// policy and the whole drawn look), pick silhouettes from the shape registry,
// band skirt/crest dressing rows — and every biome can then mix it into its
// own massifMasses layoutParams. No engine edits, ever (the doodadVisuals
// doctrine, applied to terrain masses).
//
// The three block TEXTURES in play (the configurability axis — same fabric,
// three different fights):
//   crag / ruin_wall  TRUE WALL      bodies, shots and sight all stop
//   hedgewall         BLIND COVER    bodies and sight stop — shots thread it
//   drystone          PARAPET        bodies stop — you duel ACROSS the wall
// ---------------------------------------------------------------------------

import { registerMassKind, registerMassShape } from '../engine/massif';
import { registerDoodadRule, registerStamp, stampSingle } from '../engine/levelgen';
import { bearingNoise, disc, radial } from '../engine/genkit';

// THE HEDGE — bocage: grown boundary lines and block-plots (D2's Act-1 fields
// read). Ridge-heavy so hedges run in LINES you walk along hunting the end;
// brush and flowers bank the foot, full crowns ride the line (trees IN the
// hedgerow — the classic silhouette). Region 'hedgewall': sight stops, shots
// thread — flushing what waits behind the green is the play.
registerMassKind({
  id: 'hedge',
  region: 'hedgewall',
  shapes: [{ shape: 'ridge', weight: 3 }, { shape: 'slab', weight: 1.5 }],
  lobe: 0.26,
  skirt: [
    { kind: 'brush', weight: 3, radius: [14, 24] },
    { kind: 'flowers', weight: 2, radius: [12, 20] },
    { kind: 'grass', weight: 2, radius: [14, 26] },
  ],
  skirtChance: 0.4,
  skirtSpacing: 48,
  crest: [
    { kind: 'tree', weight: 3, radius: [18, 28] },
    { kind: 'dead_tree', weight: 1, radius: [14, 22] },
  ],
  crestChance: 0.24,
  crestSpacing: 74,
});

// THE RUIN COURT — a swallowed steading: root-riven masonry (the ruin_wall
// region — a TRUE wall) standing as courts and foundation slabs. The court
// mouth is a doorway someone once built; the interior POI is what they left.
// Rubble spills at the foot AND across the crown (broken coursing).
registerMassKind({
  id: 'ruincourt',
  region: 'ruin_wall',
  shapes: [{ shape: 'court', weight: 2 }, { shape: 'slab', weight: 1 }],
  lobe: 0.2,
  mouths: [1, 2],
  skirt: [
    { kind: 'rubble', weight: 3, radius: [14, 24] },
    { kind: 'rock', weight: 1, radius: [12, 20] },
  ],
  skirtChance: 0.3,
  crest: [{ kind: 'rubble', weight: 1, radius: [12, 20] }],
  crestChance: 0.12,
  crestSpacing: 110,
});

// THE BARROW — the burial mound: a low round crag body (lobe kept gentle so
// it reads HEAPED, not knuckled), crowned with standing stones and markers.
// The graveland's massif and the downs' old dead. Whatever dens in a
// barrowfield, the mounds themselves never ask anything — they only watch.
registerMassKind({
  id: 'barrow',
  region: 'crag',
  shapes: [{ shape: 'blob', weight: 1 }],
  lobe: 0.18,
  skirt: [
    { kind: 'grass', weight: 3, radius: [14, 26] },
    { kind: 'scree', weight: 2, radius: [14, 24] },
  ],
  skirtChance: 0.3,
  crest: [
    { kind: 'standing_stone', weight: 2, radius: [12, 18] },
    { kind: 'tombstone', weight: 2, radius: [10, 14] },
    { kind: 'rock', weight: 1, radius: [12, 20] },
  ],
  crestChance: 0.16,
  crestSpacing: 96,
});

// --- THE SETTLED BELT (engine/settled.ts recipes) ------------------------------

// THE TENEMENT — the stacked city block (the warrens' body): brick TRUE-WALL
// masses whose leftover ground IS the alley map. 'block' silhouettes carry a
// yard and a doorway (the rectangular court — every block someone still
// lives in has a way in); slabs are the solid infill nobody enters. Refuse
// and cast-off crates bank the foot; the CREST is the roofline — chimney
// stacks reading as a skyline from the street.
registerMassKind({
  id: 'tenement',
  region: 'tenement_wall',
  shapes: [{ shape: 'block', weight: 2.5 }, { shape: 'slab', weight: 1.5 }, { shape: 'chain', weight: 0.6 }],
  lobe: 0.12, // mortar sag, not geology — the blocks stay square-shouldered
  mouths: [1, 1],
  skirt: [
    { kind: 'rubble', weight: 2, radius: [12, 20] },
    { kind: 'broken_cart', weight: 1, radius: [15, 19] },
    { kind: 'firewood_pile', weight: 1, radius: [10, 14] },
  ],
  skirtChance: 0.34,
  skirtSpacing: 52,
  crest: [{ kind: 'chimney_stack', weight: 1, radius: [9, 13] }],
  crestChance: 0.3,
  crestSpacing: 64,
});

// THE MANOR — the high quarter's walled house: pale dressed-stone blocks and
// garden courts (bigger mouths — a gate, not a door), lamps and topiary at
// the foot. The court interior is the GARDEN; the district recipe furnishes
// it (fountains, or a whole townhouse where the plot is grand enough).
registerMassKind({
  id: 'manor',
  region: 'manor_wall',
  shapes: [{ shape: 'block', weight: 2 }, { shape: 'court', weight: 1.2 }, { shape: 'slab', weight: 0.6 }],
  lobe: 0.1,
  mouths: [1, 2],
  skirt: [
    { kind: 'dead_topiary', weight: 2, radius: [14, 20] },
    { kind: 'street_lamp', weight: 1.5, radius: [9, 12] },
    { kind: 'flowers', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.3,
  skirtSpacing: 60,
  crest: [{ kind: 'chimney_stack', weight: 1, radius: [8, 12] }],
  crestChance: 0.2,
  crestSpacing: 84,
});

// THE BUTTE — the needle country's standing tables (THE TIER FABRIC's open
// debut): region 'butte_top' is a TRUE WALL to the valley and FLOOR to
// whoever stands the summit. The needles recipe (engine/tiers.ts) cuts a
// ramp across one rim per butte and strings spans between neighbors — the
// Thousand-Needles read. Scree banks the foot; the crowns stay bare (the
// plateau IS the crown).
registerMassKind({
  id: 'butte',
  region: 'butte_top',
  shapes: [{ shape: 'blob', weight: 2 }, { shape: 'slab', weight: 1.5 }],
  lobe: 0.16,
  skirt: [
    { kind: 'scree', weight: 3, radius: [14, 24] },
    { kind: 'rocks', weight: 2, radius: [14, 26] },
    { kind: 'brush', weight: 1, radius: [14, 22] },
  ],
  skirtChance: 0.34,
});

// THE CROFT — farmland's worked plot: a drystone-bound yard (the PARAPET
// texture — you duel across a croft wall, then walk around to its stile).
// Hay and the odd cart inside the read; wheat presses at the foot.
registerMassKind({
  id: 'croft',
  region: 'drystone',
  shapes: [{ shape: 'block', weight: 2 }, { shape: 'slab', weight: 0.8 }],
  lobe: 0.14,
  mouths: [1, 2],
  skirt: [
    { kind: 'wheat', weight: 2, radius: [24, 34] },
    { kind: 'hay_bale', weight: 1.5, radius: [11, 15] },
    { kind: 'grass', weight: 1, radius: [14, 24] },
  ],
  skirtChance: 0.36,
  skirtSpacing: 54,
});

// =============================================================================
// THE HIGH BASTION (aether_bastion) — the Host's citadel country: ENORMOUS
// silver-and-gold architecture strewn about a rolling cloud continent. The
// masses ARE the citadels (the metropolis massing doctrine at fortress
// scale): silver TRUE walls you walk around, gold statuary riding the
// rooflines, gilt balustrade courts you duel across. Dressing kit below;
// visuals are re-dressed existing painters (data/doodadVisuals.ts).
// =============================================================================
// The kit's rules: statuary is solid architecture; the gleam-lamp is the
// bridge light — a bound flame that may hang past the rim over the void
// (the sky_lantern/star_lantern float precedent — a tether, not a stand).
registerDoodadRule('gilded_seraph', {
  overlap: 'solid', blocksMove: true, spacing: 90,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('triumph_spire', {
  overlap: 'solid', blocksMove: true, spacing: 120,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('gleam_lamp', { overlap: 'ground', spacing: 60, voidOk: true });

// THE BASTION — the citadel keep itself: square-shouldered silver masses and
// long curtain runs, the gold skyline riding the crest (statues and spires
// ON the roofs — the High Heavens read from the street). Lamps and crystal
// gather at the foot where the processions pass.
registerMassKind({
  id: 'bastion',
  region: 'bastion_wall',
  shapes: [{ shape: 'block', weight: 2.5 }, { shape: 'slab', weight: 1.5 }, { shape: 'chain', weight: 0.6 }],
  lobe: 0.1, // dressed coursing, not geology — the walls stay square-shouldered
  skirt: [
    { kind: 'gleam_lamp', weight: 2, radius: [8, 11] },
    { kind: 'aether_crystal', weight: 1.5, radius: [12, 18] },
    { kind: 'flowers', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.36,
  skirtSpacing: 54,
  crest: [
    { kind: 'gilded_seraph', weight: 2, radius: [14, 20] },
    { kind: 'triumph_spire', weight: 1.5, radius: [16, 24] },
    { kind: 'harp_pillar', weight: 1, radius: [12, 16] },
  ],
  crestChance: 0.3,
  crestSpacing: 78,
});

// THE HIGH COURT — a citadel court with a gate or two: the silver ring
// around a held interior (the POI machinery makes the courtyard a PLACE —
// spawns, loot anchors, and the reachability net guarding the way in).
registerMassKind({
  id: 'high_court',
  region: 'bastion_wall',
  shapes: [{ shape: 'court', weight: 2 }, { shape: 'slab', weight: 0.5 }],
  lobe: 0.09,
  mouths: [1, 2],
  skirt: [
    { kind: 'gleam_lamp', weight: 2, radius: [8, 11] },
    { kind: 'flowers', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.3,
  skirtSpacing: 60,
  crest: [{ kind: 'gilded_seraph', weight: 1, radius: [13, 18] }],
  crestChance: 0.16,
  crestSpacing: 96,
});

// THE CURTAIN — the long wall: silver ramparts running the cloud like
// breakwaters (chain/ridge silhouettes — the 'sea of ramparts' face leans on
// it). Sparse crest: a statue paces the wall-walk here and there; the LINE
// is the read, and hunting its end is the play.
registerMassKind({
  id: 'curtain',
  region: 'bastion_wall',
  shapes: [{ shape: 'chain', weight: 2.5 }, { shape: 'ridge', weight: 1.5 }],
  lobe: 0.1,
  skirt: [
    { kind: 'gleam_lamp', weight: 1.5, radius: [8, 11] },
    { kind: 'aether_crystal', weight: 1, radius: [12, 16] },
  ],
  skirtChance: 0.26,
  skirtSpacing: 64,
  crest: [{ kind: 'gilded_seraph', weight: 1, radius: [13, 18] }],
  crestChance: 0.14,
  crestSpacing: 120,
});

// THE GILT RING — the gold balustrade court (the PARAPET texture in precious
// metal): shots and sight sail over the rail, so the garden inside is a
// prize you duel across before you walk the ring to its gate. NO crest —
// the see-over promise is the kind's whole point (the fold's law, gilded).
registerMassKind({
  id: 'gilt_ring',
  region: 'gilt_parapet',
  shapes: [{ shape: 'court', weight: 1 }],
  lobe: 0.08,
  mouths: [1, 2],
  skirt: [
    { kind: 'flowers', weight: 2, radius: [12, 18] },
    { kind: 'aether_crystal', weight: 1, radius: [12, 16] },
  ],
  skirtChance: 0.24,
});

// =============================================================================
// THE SERAPH CITY (the bastion country's deeper faces — aether_gloria /
// aether_seraphal): CIRCULAR and HALF-CIRCULAR architecture, deepening as
// the country does — hemicycle amphitheaters, colonnaded rotundas, pantheon
// domes. The Roman/Olympian read over the same massif fabric: white marble
// and gold where the rim wore silver.
// =============================================================================
// THE CRESCENT — the hemicycle: a court ring with one great bite swallowed
// (the amphitheater's open chord IS its mouth — no punches, no interior POI:
// the bowl is open to the field by construction). One rng draw (the facing).
registerMassShape('crescent', {
  reach: 1.5,
  paint: (m, at, r, rng, o) => {
    const rOf = (a: number): number =>
      Math.min(r * 1.42, r * (1 + bearingNoise(a, o.lobe * 0.5, o.seed)));
    const outer = m.like();
    radial(outer, at.x, at.y, rOf);
    const inner = m.like();
    radial(inner, at.x, at.y, a => rOf(a) * 0.62);
    outer.subtract(inner);
    const dir = rng.range(0, Math.PI * 2);
    const bite = m.like();
    disc(bite, at.x + Math.cos(dir) * r * 1.15, at.y + Math.sin(dir) * r * 1.15, r * 1.3);
    outer.subtract(bite);
    m.union(outer);
  },
});

// The city's dressing kit (visuals in data/doodadVisuals.ts — every painter
// an existing one re-dressed): laurel greens, marble columns, gold fire,
// inlaid pavement medallions.
registerDoodadRule('laurel_topiary', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 56,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('pantheon_column', {
  overlap: 'solid', blocksMove: true, spacing: 84,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
// (aureate_brazier: rule + look already shipped with the aether courts —
// the city's braziers ARE that kind; leverage before mint.)
registerDoodadRule('mosaic_medallion', { overlap: 'ground', spacing: 150 });
// Layout-row stamps (the dead_topiary precedent — a kind a tileset scatters
// as singles needs its stamp beside its rule).
registerStamp('laurel_topiary', stampSingle('laurel_topiary', [13, 19]));
registerStamp('pantheon_column', stampSingle('pantheon_column', [10, 14]));
registerStamp('mosaic_medallion', stampSingle('mosaic_medallion', [26, 40]));

// THE PANTHEON — the dome itself: a near-perfect round mass (lobe barely
// breathes), gold statuary crowning the drum. The city's gravest silhouette.
registerMassKind({
  id: 'pantheon',
  region: 'pantheon_wall',
  shapes: [{ shape: 'blob', weight: 1 }],
  lobe: 0.05,
  skirt: [
    { kind: 'pantheon_column', weight: 2, radius: [10, 14] },
    { kind: 'aureate_brazier', weight: 1.5, radius: [11, 15] },
    { kind: 'laurel_topiary', weight: 1, radius: [13, 18] },
  ],
  skirtChance: 0.4,
  skirtSpacing: 52,
  crest: [
    { kind: 'gilded_seraph', weight: 2, radius: [15, 21] },
    { kind: 'triumph_spire', weight: 1, radius: [16, 24] },
  ],
  crestChance: 0.32,
  crestSpacing: 84,
});

// THE ROTUNDA COURT — the colonnaded temple ring: a marble court whose
// interior is a PLACE (the POI machinery), columns pacing the outer skirt.
registerMassKind({
  id: 'rotunda_court',
  region: 'pantheon_wall',
  shapes: [{ shape: 'court', weight: 1 }],
  lobe: 0.07,
  mouths: [1, 2],
  skirt: [
    { kind: 'pantheon_column', weight: 2.5, radius: [10, 14] },
    { kind: 'laurel_topiary', weight: 1, radius: [13, 18] },
  ],
  skirtChance: 0.38,
  skirtSpacing: 56,
  crest: [{ kind: 'gilded_seraph', weight: 1, radius: [14, 19] }],
  crestChance: 0.14,
  crestSpacing: 100,
});

// THE AMPHITHEATER — the hemicycle: colonnade seating you duel ACROSS (the
// parapet policy — the bowl is a stage, the rim is never a corridor). NO
// crest: the open sweep is the read.
registerMassKind({
  id: 'amphitheater',
  region: 'colonnade',
  shapes: [{ shape: 'crescent', weight: 1 }],
  lobe: 0.09,
  skirt: [
    { kind: 'laurel_topiary', weight: 2, radius: [13, 18] },
    { kind: 'flowers', weight: 1.5, radius: [12, 18] },
  ],
  skirtChance: 0.3,
  skirtSpacing: 60,
});

// THE GRAND COLONNADE — column lines running the forum (the curtain's law
// in marble, SEE-THROUGH: shots and sight thread the columns).
registerMassKind({
  id: 'grand_colonnade',
  region: 'colonnade',
  shapes: [{ shape: 'chain', weight: 2 }, { shape: 'ridge', weight: 1.5 }],
  lobe: 0.08,
  skirt: [
    { kind: 'gleam_lamp', weight: 1.5, radius: [8, 11] },
    { kind: 'laurel_topiary', weight: 1, radius: [12, 16] },
  ],
  skirtChance: 0.24,
  skirtSpacing: 68,
  crest: [{ kind: 'gilded_seraph', weight: 1, radius: [13, 18] }],
  crestChance: 0.1,
  crestSpacing: 130,
});
