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

import { registerMassKind, registerMassShape, registerTenantKind, tenantKindOf } from '../engine/massif';
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
  // Whoever owns the land squats the old walls (patron default), among
  // whatever the owners left (the interior POI's promise, made literal).
  garrison: { chance: 0.35 },
  inner: [
    { kind: 'burial_urn', weight: 2, radius: [11, 15] },
    { kind: 'clay_pots', weight: 1.5, radius: [10, 14] },
    { kind: 'rubble', weight: 1, radius: [12, 20] },
  ],
  innerChance: 0.4,
  // THE CONVERTED TABLE (batch 16): the independent garrison × inner rolls
  // above become the handlers' defaults — this table carries their measured
  // marginals (held 14 / garrison-only 21 / stock-only 26 / neither 39)
  // with the two debuts paid from vacancy: a court shrine among the urns,
  // and a BARROW WATCH posting (barrow_watchman + a gorged aide) on walls
  // someone still minds.
  tenants: [
    { kind: 'held_stock', weight: 14 },
    { kind: 'garrison', weight: 21 },
    { kind: 'stock', weight: 26 },
    { kind: 'shrine', weight: 8 },
    { kind: 'watch_post', weight: 6, params: { detail: 'barrow_watch' } },
    { kind: 'occurrence', weight: 5, params: { id: 'abyssal_fracture' } },
    { kind: 'vacant', weight: 20 },
  ],
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
  // THE CROFT WATCH (batch 17): the croft authored NO garrison and NO inner
  // rows — its measured marginals are pure vacancy — so the living watch post
  // (data/watchposts.ts 'croft_watch': the croft_warden's lantern at a yard
  // fire) is paid from vacancy alone and the worked plots keep ~94% of their
  // emptiness. Interior-bearing paints only (the block's yard; slabs are
  // solid and seat nothing — the handler's own refusal).
  tenants: [
    { kind: 'watch_post', weight: 6, params: { detail: 'croft_watch' } },
    { kind: 'vacant', weight: 94 },
  ],
  skirt: [
    { kind: 'wheat', weight: 2, radius: [24, 34] },
    { kind: 'hay_bale', weight: 1.5, radius: [11, 15] },
    { kind: 'grass', weight: 1, radius: [14, 24] },
  ],
  skirtChance: 0.36,
  skirtSpacing: 54,
});

// --- THE TABLELAND (the desert's massif country) -------------------------------

// THE MESA — the waste's standing tables (massif.ts's founding aspiration made
// real): sheared sandstone slabs, weathered blob stubs, the odd short scarp
// run — region 'sandstone', the TRUE-WALL policy in desert tones. The kind
// carries its own SIZE BAND (the MassKindDef.sizeR debut): tables run big in
// any pool that mixes them, no per-zone retune needed. Scree and thirsty
// scrub bank the foot; spires ride the odd crown.
registerMassKind({
  id: 'mesa',
  region: 'sandstone',
  shapes: [{ shape: 'slab', weight: 2.5 }, { shape: 'blob', weight: 1.5 }, { shape: 'ridge', weight: 0.8 }],
  lobe: 0.18,
  sizeR: [200, 360],
  skirt: [
    { kind: 'scree', weight: 3, radius: [16, 28] },
    { kind: 'rocks', weight: 2, radius: [16, 30] },
    { kind: 'cactus', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.32,
  crest: [
    { kind: 'rock_spire', weight: 1.5, radius: [16, 26] },
    { kind: 'rocks', weight: 1, radius: [14, 22] },
  ],
  crestChance: 0.14,
  crestSpacing: 110,
});

// THE SAND COURT — the ruined city's walled ring: a sandstone court the sand
// half-swallowed, its doorway still a doorway. The Part-A debut author:
// GARRISON (patron default — the waste posts its gnolls, a graveland would
// post its dead; never a hardcoded id) + INNER rows (what the dead city left:
// urns and pots paying through the ordinary brittle/drop chokepoints).
registerMassKind({
  id: 'sand_court',
  region: 'sandstone',
  shapes: [{ shape: 'court', weight: 1 }],
  lobe: 0.12,
  mouths: [1, 2],
  garrison: { chance: 0.55 },
  inner: [
    { kind: 'burial_urn', weight: 2, radius: [11, 15] },
    { kind: 'clay_pots', weight: 2, radius: [10, 14] },
    { kind: 'bone_pile', weight: 1, radius: [12, 18] },
  ],
  innerChance: 0.5,
  innerSpacing: 58,
  skirt: [
    { kind: 'scree', weight: 2, radius: [14, 24] },
    { kind: 'rubble', weight: 2, radius: [12, 20] },
    { kind: 'bone_pile', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.26,
});

// THE HELD STOCK — the first CONTENT tenant kind (the ring-tenant registry's
// door, walked): a garrison keeping a STOCKED ring — one draw, one occupant
// CONCEPT, both core handlers by delegation (tenantKindOf), so a manned well
// never reads as a bare yard. Any table may name it; the row's garrison
// tailoring (size/faction) passes straight through to the garrison handler.
registerTenantKind('held_stock', (ctx, def, grid, cm, rng, kd, row) => {
  tenantKindOf('garrison')?.(ctx, def, grid, cm, rng, kd, row);
  tenantKindOf('stock')?.(ctx, def, grid, cm, rng, kd, row);
});

// --- THE COURTLANDS (the desert's rim of rings — biome 'courtland') -----------
// The Sand Sarcophate's LIVING architecture: where the sepulcher country is
// the dynasty gone under the erg, these are the rings it raised while it
// still farmed the rim. Two kinds beside the shared sand_court vocabulary,
// each one pole of THE THRESHOLD RHYTHM (open = peril, ring = relief).

// THE WELL COURT — the watered ring, the relief made literal: a thinner
// sandstone ring (more floor to the same wall) around the dynasty's old
// plumbing — a cistern still holding, palms on the water, pots at their
// feet. Garrison LOW: the true oases mostly stand quiet; walking in ends
// every open-ground engagement at the mouth (the TRUE-wall funnel), and
// what you find inside is shade and stock, not a fight you didn't pick.
registerMassKind({
  id: 'well_court',
  region: 'sandstone',
  shapes: [{ shape: 'court', weight: 1 }],
  lobe: 0.1,
  ringInner: 0.68,
  mouths: [1, 2],
  // THE RING TENANTS debut (one fork-stream draw per ring — the table IS
  // the occupancy law, replacing the old independent pair of garrison-0.2 +
  // always-stocked). Authored to the measured standing rates: the dynasty
  // still answers at ONE RING IN FIVE exactly (held_stock 14 + garrison 6 —
  // and mostly it mans a ring that kept its stock), the watered stock stays
  // the dominant read, a pot-hoard cache pays where the plumbing did, and
  // the seldom DRY WELL (vacant 12) — the ring whose water failed, standing
  // empty as the rim's quiet memento (the fallen_court is the ruin lane;
  // vacancy here is a whisper, never the theme).
  // THE DESTINATIONS (batch 16): a ring may instead hold a court SHRINE
  // (data/puzzles.ts — a riddle seat the puzzle fabric animates), THE
  // HOLLOWED WELL (data/lairs.ts 'lair_mouth' — the dry well's darker
  // sibling: spoor on the floor, the Scorpion Well below), or a WATCH
  // POST (data/watchposts.ts — one pair of eyes at a fire). The manned
  // share stays exactly one ring in five (held 10 + watch 6 + garrison 4);
  // the shrine is paid from stock + vacancy.
  tenants: [
    { kind: 'stock', weight: 46 },
    { kind: 'held_stock', weight: 10 },
    { kind: 'watch_post', weight: 6, params: { detail: 'rim_sentinel' } },
    { kind: 'garrison', weight: 4 },
    { kind: 'cache', weight: 12, rows: [
      { kind: 'clay_pots', weight: 2, radius: [10, 14] },
      { kind: 'burial_urn', weight: 1, radius: [11, 15] },
    ] },
    { kind: 'shrine', weight: 8 },
    { kind: 'lair_mouth', weight: 4 },
    { kind: 'occurrence', weight: 4, params: { id: 'abyssal_fracture' } },
    { kind: 'vacant', weight: 6 },
  ],
  inner: [
    { kind: 'stone_cistern', weight: 2, radius: [13, 16] },
    { kind: 'palm', weight: 2, radius: [16, 24] },
    { kind: 'clay_pots', weight: 1.5, radius: [10, 14] },
    { kind: 'flowers', weight: 1, radius: [12, 18] },
  ],
  innerChance: 0.7,
  innerSpacing: 52,
  skirt: [
    { kind: 'brush', weight: 2, radius: [14, 22] },
    { kind: 'scree', weight: 2, radius: [14, 24] },
  ],
  skirtChance: 0.24,
});

// THE FALLEN COURT — the breached ring: a court the waste already won,
// its wall a hemicycle (the crescent silhouette — the open chord IS the
// mouth, no interior POI, no tenant, no stock). Free partial cover on the
// crossing, and the country's memento mori: this is what a ring becomes
// when its well gives out. Rubble where the missing arc fell.
registerMassKind({
  id: 'fallen_court',
  region: 'sandstone',
  shapes: [{ shape: 'crescent', weight: 1 }],
  lobe: 0.14,
  skirt: [
    { kind: 'rubble', weight: 3, radius: [12, 20] },
    { kind: 'scree', weight: 2, radius: [14, 24] },
    { kind: 'bone_pile', weight: 1, radius: [12, 18] },
  ],
  skirtChance: 0.3,
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
  // A citadel court is HELD ground: the country's own host posts inside
  // (patron default), the yard lit and stocked as a place still in use.
  garrison: { chance: 0.45 },
  inner: [
    { kind: 'aureate_brazier', weight: 1.5, radius: [11, 15] },
    { kind: 'aether_crystal', weight: 1.5, radius: [12, 18] },
    { kind: 'flowers', weight: 1, radius: [12, 18] },
  ],
  innerChance: 0.35,
  // THE CONVERTED TABLE (batch 17): independent rolls → the handlers'
  // defaults; measured marginals (.45 × .35) with a court SHRINE paid
  // from vacancy — a riddle seat in the marble sky-country (the aether
  // faces author no puzzle rows, so the coexistence gate never fires).
  tenants: [
    { kind: 'held_stock', weight: 16 },
    { kind: 'garrison', weight: 29 },
    { kind: 'stock', weight: 19 },
    { kind: 'shrine', weight: 6 },
    { kind: 'vacant', weight: 30 },
  ],
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
  // The garden behind the rail, made literal: a keeper pack and visible
  // treasures you duel across the parapet for — the see-over promise now
  // has something to see.
  garrison: { chance: 0.3 },
  inner: [
    { kind: 'flowers', weight: 2, radius: [12, 18] },
    { kind: 'aether_crystal', weight: 1.5, radius: [12, 16] },
  ],
  innerChance: 0.45,
  // THE CONVERTED TABLE (batch 17): marginals .3 × .45, shrine from
  // vacancy — the gilt ring keeps its flower-stocked character.
  tenants: [
    { kind: 'held_stock', weight: 14 },
    { kind: 'garrison', weight: 16 },
    { kind: 'stock', weight: 31 },
    { kind: 'shrine', weight: 6 },
    { kind: 'vacant', weight: 33 },
  ],
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
    // ringInner honored (the court's dial, hemicycle default 0.62 — absent
    // stays byte-identical); mouthScale has no business here: the open chord
    // IS the mouth.
    const ri = o.ringInner ?? 0.62;
    const rOf = (a: number): number =>
      Math.min(r * 1.42, r * (1 + bearingNoise(a, o.lobe * 0.5, o.seed)));
    const outer = m.like();
    radial(outer, at.x, at.y, rOf);
    const inner = m.like();
    radial(inner, at.x, at.y, a => rOf(a) * ri);
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

// THE CATHEDRAL KIT (aether_cathedral — the See's own dressing). Interior
// kinds are planted by the 'cathedral' structure generator's legend chars
// (data/structures.ts grand_cathedral) so they carry rules only; the three
// the tileset also scatters as layout rows carry stamps beside them (the
// registry law). Visuals in data/doodadVisuals.ts; the three genuinely new
// painters live in render/vis/paintersAether.ts.
registerDoodadRule('processional_way', {
  overlap: 'ground', walkOnly: true,
  clearway: {
    decks: ['water', 'tide_pool', 'mud', 'bog', 'swamp', 'ice'],
    yieldsTo: ['lava', 'magma_core', 'cinder', 'gore', 'chasm'],
  },
});
registerDoodadRule('votive_bank', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 60, bodyScale: 0.6,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerStamp('votive_bank', stampSingle('votive_bank', [10, 13]));
registerDoodadRule('cathedral_pew', { overlap: 'solid', blocksMove: true, blocksShot: false, bodyScale: 0.85 });
registerDoodadRule('choir_stall', { overlap: 'solid', blocksMove: true, blocksShot: false, bodyScale: 0.85 });
// Chest-high sanctuary furniture: bodies stop, shots and sight carry — the
// sanctum is a duel floor, never a maze.
registerDoodadRule('high_altar', { overlap: 'solid', blocksMove: true, blocksShot: false });
registerDoodadRule('empty_throne', { overlap: 'solid', blocksMove: true, blocksShot: true });
registerDoodadRule('pipe_organ', { overlap: 'solid', blocksMove: true, blocksShot: true });
registerDoodadRule('font_of_light', { overlap: 'solid', blocksMove: true, blocksShot: false });
registerDoodadRule('reliquary_shrine', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 90,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('saint_effigy', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 90,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerStamp('saint_effigy', stampSingle('saint_effigy', [12, 16]));
registerDoodadRule('gonfalon', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 70, bodyScale: 0.3,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('gonfalon', stampSingle('gonfalon', [9, 12]));
// The arch is a THRESHOLD, not a blocker: the parade walks under it.
registerDoodadRule('glory_arch', { overlap: 'ground' });
registerDoodadRule('bell_spire', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 120, bodyScale: 0.5,
  forbidOn: ['water', 'lava', 'chasm'],
});
// THE CITY THAT CLIMBS: 'basilica_stair' is the seraph city's ascension rung
// (the city_stair pattern vested in marble) — cracked out of a pantheon's
// mass by the gallery_hollow, dwelled UP into minted gallery floors that lay
// the next rung themselves (data/sidezones.ts). Trigger rule only; the
// stamp serves the floors' own layout rows.
registerDoodadRule('basilica_stair', { overlap: 'trigger', spacing: 20 });
registerStamp('basilica_stair', stampSingle('basilica_stair', [11, 14]));

// THE COUNTRY DENS' DOORS (mints in data/sidezones.ts): the Vesperlands'
// crescent arch into the Wane, and the Driftways' thunderhead mouth into
// the Storm-Throat — each country's checklist den, rolled on every face's
// layout rows. Wide spacing: one door per meadow, if any.
registerDoodadRule('wane_arch', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 200, bodyScale: 0.55,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('wane_arch', stampSingle('wane_arch', [20, 26]));
registerDoodadRule('storm_funnel', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 200, bodyScale: 0.6,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('storm_funnel', stampSingle('storm_funnel', [22, 28]));
// spent_cell pre-exists (rule + visual with the charge-cell kit) but had no
// layout stamp — the Storm-Throat's 'spent anvil' face is its first scatter
// consumer (genqa's registry net caught the gap).
registerStamp('spent_cell', stampSingle('spent_cell', [9, 12]));

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
  // The temple ring keeps a watch (patron default) over an inlaid, lit floor.
  garrison: { chance: 0.4 },
  inner: [
    { kind: 'mosaic_medallion', weight: 2, radius: [26, 40] },
    { kind: 'aureate_brazier', weight: 1, radius: [11, 15] },
  ],
  innerChance: 0.4,
  innerSpacing: 72,
  // THE CONVERTED TABLE (batch 17): marginals .4 × .4; the temple ring
  // is the shrine's thematic bullseye, so it carries the deepest weight.
  tenants: [
    { kind: 'held_stock', weight: 16 },
    { kind: 'garrison', weight: 24 },
    { kind: 'stock', weight: 24 },
    { kind: 'shrine', weight: 10 },
    { kind: 'vacant', weight: 26 },
  ],
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

// =============================================================================
// THE WYRMFIELDS (the volcanic country's deep-heart face — data/tilesets.ts
// 'wyrmfields'): cooled-melt massif country, and the debut ground of THE
// COLOSSAL ANCHOR LANE (engine/massif.ts massifAnchors). Two kinds: the
// ordinary slag bones the coverage darts scatter, and the caldera mound the
// anchor lane seats FIRST at landmark scale — whose ring floor is the one
// ambiguous grain the uncertainty doctrine asks for: a wyrm's front door,
// a treasury knot, a held yard, or nothing at all, and no way to pre-read
// which from the rim.
// =============================================================================

// THE SLAG TOR — the melt's cooled knuckles: black-glass blobs and fused
// chains (region 'slagcrag', the TRUE-WALL policy in quenched melt). Cinder
// banks the foot; spires and glass ride the odd crown.
registerMassKind({
  id: 'slag_tor',
  region: 'slagcrag',
  shapes: [{ shape: 'blob', weight: 3 }, { shape: 'chain', weight: 2 }],
  lobe: 0.3,
  // Cinder is POURED ground (the fuse guard's jurisdiction): radius ≤ 16 at
  // spacing 76 keeps any same-kind skirt pair ≥ 44px of clear seam — the
  // guard's 25px sliver is unreachable by arithmetic, not by luck.
  skirt: [
    { kind: 'cinder', weight: 3, radius: [12, 16] },
    { kind: 'obsidian', weight: 2, radius: [14, 24] },
    { kind: 'scree', weight: 2, radius: [14, 24] },
  ],
  skirtChance: 0.34,
  skirtSpacing: 76,
  crest: [
    { kind: 'rock_spire', weight: 1.5, radius: [16, 26] },
    { kind: 'obsidian', weight: 1, radius: [14, 22] },
  ],
  crestChance: 0.16,
  crestSpacing: 100,
});

// THE WYRM CALDERA — the colossal itself: a landmark-grade slag ring (the
// anchor lane's sizeR row hands it a band the ordinary dials were never
// meant to hold) with ONE breach for a mouth and a banked-ash floor. The
// mound reads as geology until you notice geology doesn't coil. Ring dials:
// thick rim (ringInner 0.52 — a true crater wall), wide single breach
// (mouthScale past the lane guarantee), high lobe for the ragged melt rim.
// THE AMBIGUOUS GRAIN (tenants, one fork draw per caldera): the kilnhoard's
// door at 40 — spoor and a maw on the floor, the den minted below (data/
// lairs.ts); a treasury CACHE at 22 that pays without a landlord (the
// hoard-that-isn't — exactly why the doctrine works); the emberkin holding
// the bowl at 12 (patron default); and at 26 a caldera that is only a
// caldera. Nothing outside the ring says which you got.
registerMassKind({
  id: 'wyrm_caldera',
  region: 'slagcrag',
  shapes: [{ shape: 'court', weight: 1 }],
  lobe: 0.24,
  ringInner: 0.52,
  mouths: [1, 1],
  mouthScale: 1.25,
  tenants: [
    // THE WAKING CLOCK (batch 19): the den mass SPLITS — 15 of the 40 den
    // draws carry the caldera_wake occurrence (same door, same den, plus a
    // foreordained nightfall die that wakes the landlord below). Paying
    // from vacant would RAISE the total den rate and retune the face; the
    // split keeps dens at exactly 40% and no caldera ever confesses which
    // kind it drew.
    { kind: 'lair_mouth', weight: 25, params: { den: 'kilnhoard' } },
    { kind: 'occurrence', weight: 15, params: { id: 'caldera_wake', den: 'kilnhoard' } },
    { kind: 'cache', weight: 22, count: [4, 7], rows: [
      { kind: 'kiln_urn', weight: 3, radius: [12, 16] },
      { kind: 'clay_pots', weight: 1, radius: [10, 14] },
    ] },
    { kind: 'garrison', weight: 12 },
    { kind: 'occurrence', weight: 8, params: { id: 'abyssal_fracture' } },
    { kind: 'vacant', weight: 18 },
  ],
  skirt: [
    { kind: 'cinder', weight: 3, radius: [12, 16] },
    { kind: 'obsidian', weight: 2, radius: [14, 24] },
    { kind: 'scree', weight: 1, radius: [14, 22] },
  ],
  skirtChance: 0.3,
  skirtSpacing: 76, // the slag_tor's pour-sliver arithmetic (see above)
  crest: [
    { kind: 'rock_spire', weight: 1, radius: [16, 26] },
    { kind: 'obsidian', weight: 1.5, radius: [14, 22] },
  ],
  crestChance: 0.14,
  crestSpacing: 110,
});
