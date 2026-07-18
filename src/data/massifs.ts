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

import { registerMassKind } from '../engine/massif';

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
