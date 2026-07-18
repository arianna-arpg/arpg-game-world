// ---------------------------------------------------------------------------
// THE SETTLED-BELT KIT — farmland + metropolis dressing as data.
//
// Doodad rules, stamps, clusters and formations for the worked country:
// crops that HIDE you (the veil fabric worn at ankle height — walk-through,
// shoot-through, sight-eating wheat), the paved way (the road kind's civic
// sibling — same clearway law, broader gauge), street lamps (light rows +
// a lightwell row so the lit road is real Gloaming infrastructure), the
// windmill (a live canopy turns its sails — no track lane, no payload: a
// decoration is never a hazard), and the city's stair mouths (the manor's
// floors pattern worn by burgher townhouses — their SidezoneDefs live in
// data/sidezones.ts; the RULES live here so the generation graph knows the
// kinds without importing the door registry).
//
// Everything composes the existing grammars: registerDoodadRule /
// registerStamp(stampSingle) / registerCluster / registerFormation /
// registerLightwell. The gloamwood harvest kit (rail fences, scarecrow
// rows, pumpkin patches, lantern posts) is reused wholesale by the
// farmland tileset — this file only adds what did not exist.
// ---------------------------------------------------------------------------

import '../engine/settled'; // side-effect: the 'fields'/'district' recipes + the 'block' mass shape
import {
  registerCluster, registerDoodadRule, registerFormation, registerStamp, stampSingle,
} from '../engine/levelgen';
import { registerLightwell } from '../engine/lightwells';
import { registerDormantTag } from '../engine/ai';

// THE VILLAGE WATCH is a SENTRY (the holdfast wardens' civil cousin): planted
// at its post, dormant until a wound turns the watch out (World.rouseRules
// row 'freehold_watch'), forgiving once you break off — a watchman's grudge
// lasts exactly as long as the fight does.
registerDormantTag('freehold_watch', { coolDownSecs: 7, disengageDist: 340 });

// --- CROPS (the vision-obscuring calm) -----------------------------------------
// The Grim-Dawn field read, composed from three independent levers:
//   blocksMove:false + blocksShot:false — you and your arrows pass freely;
//   blocksSight:true                    — AI perception rays cut at the crown;
//   veil:{...}                          — the patch conceals (aim assist drops
//                                         foes inside, `canopied` detectability
//                                         rides anyone standing in the crop).
// Overlapping crowns union-find into ONE field patch (group 'crop' so a
// hedge-line oak never fuses the wheat to the woods). The visual obscuring is
// the canopy over-draw; sightShadow stays off (a field is not a wall).

registerDoodadRule('wheat', {
  overlap: 'inert', blocksMove: false, blocksShot: false, blocksSight: true,
  spacing: 20, walkOnly: true, spin: true,
  occlude: { pad: 10, alpha: 0.32 },
  veil: { group: 'crop', standStatus: 'canopied' },
  fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerDoodadRule('corn_stand', {
  overlap: 'inert', blocksMove: false, blocksShot: false, blocksSight: true,
  spacing: 24, walkOnly: true, spin: true,
  occlude: { pad: 12, alpha: 0.3 },
  veil: { group: 'crop', standStatus: 'canopied' },
  fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('wheat', stampSingle('wheat', [26, 40]));
registerStamp('corn_stand', stampSingle('corn_stand', [24, 36]));

// A WHEAT SEA: one field as one veil patch — crowns packed to overlap so the
// whole stand merges, a bale and a watcher's cross at the headland.
registerCluster({
  id: 'wheat_field',
  anchor: { radius: 90, kind: 'wheat' },
  pieces: [
    { kind: 'wheat', radius: [26, 40], count: [9, 14], ring: [0, 120], packed: true, rot: true },
    { kind: 'hay_bale', radius: [12, 16], count: [0, 2], ring: [90, 150], rot: true },
    { kind: 'scarecrow', radius: [12, 15], count: [0, 1], ring: [40, 120], rot: true },
  ],
  poi: true,
});

// A CORN MAZE ROW: stands marching a furrow — several rows side by side read
// as the field maze the road disappears into.
registerFormation({
  id: 'corn_rows', arrange: 'line', span: [300, 560], step: 42,
  pieces: [
    { kind: 'corn_stand', radius: [24, 34], jitter: 8, rot: true },
    { kind: 'pumpkin_patch', radius: [13, 18], every: 5, jitter: 30 },
  ],
});

// AN ORCHARD WALK: kept fruit trees pacing a lane — the settled cousin of the
// windrow (crowns spaced, never a roof; pickers must reach the boughs).
registerFormation({
  id: 'orchard_walk', arrange: 'line', span: [300, 540], step: 64,
  pieces: [
    { kind: 'fruiting_tower', radius: [14, 20], jitter: 10, rot: true },
    { kind: 'hay_bale', radius: [11, 15], every: 3, jitter: 28, rot: true },
    { kind: 'rail_fence', radius: [20, 26], every: 2, jitter: 6, rot: 'chain' },
  ],
});

// --- THE PAVED WAY ---------------------------------------------------------------
// The road kind's civic sibling: same clearway law verbatim (decks soft wet
// ground, yields to the molten and the void), laid broader by the district
// recipes. A separate KIND so the drawn read (dressed setts vs gravel) and
// any future per-material tuning stay data.
registerDoodadRule('paved_way', {
  overlap: 'ground', walkOnly: true,
  clearway: {
    decks: ['water', 'tide_pool', 'mud', 'bog', 'swamp', 'ice'],
    yieldsTo: ['lava', 'magma_core', 'cinder', 'gore', 'chasm'],
  },
});

// --- STREET FURNITURE -------------------------------------------------------------
registerDoodadRule('street_lamp', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 84, bodyScale: 0.3,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('street_lamp', stampSingle('street_lamp', [9, 12]));
// The lit road is REAL light infrastructure: a civic lightwell row (the
// lantern_post pattern — wide, dim, steady; the Gloaming's bleed slows on a
// lamplit street).
registerLightwell({ kind: 'street_lamp', feed: 4 });

// (fountain + well ship in the core kit — rule, painter and stamp — the
// district recipes and plaza kits reference them as-is.)

// The roofline's silhouette: chimney stacks ride tenement/manor CRESTS (the
// massif dressing lane places them ON the wall mass — inert art, the read is
// the point).
registerDoodadRule('chimney_stack', { overlap: 'inert', spacing: 40 });

// --- THE WINDMILL -----------------------------------------------------------------
// One body, two halves: a solid tower the ground fights around, and LIVE
// SAILS drawn as a canopy crown above the actors (canopy.live — the painter
// reads world time and turns; no track lane, no payload, no warning arcs:
// a decoration is never a hazard).
registerDoodadRule('windmill', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 220, bodyScale: 0.85,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerStamp('windmill', stampSingle('windmill', [26, 32]));

// A MILLSTEAD: the mill on its rise — sacks and cart at the door, the fence
// holding the yard, wheat pressing right up to the headland.
registerCluster({
  id: 'millstead',
  anchor: { radius: 110, kind: 'windmill' },
  pieces: [
    { kind: 'windmill', radius: [26, 32], count: [1, 1], ring: [0, 1] },
    { kind: 'hay_bale', radius: [12, 16], count: [1, 3], ring: [50, 110], rot: true },
    { kind: 'broken_cart', radius: [16, 20], count: [0, 1], ring: [60, 120], rot: true },
    { kind: 'rail_fence', radius: [20, 26], count: [2, 4], ring: [90, 150], rot: true },
    { kind: 'wheat', radius: [26, 38], count: [3, 6], ring: [120, 210], packed: true, rot: true },
  ],
  poi: true,
});

// --- TRADE-YARD PROPS (structure legend kinds) ---------------------------------------
// The skinner's stretched hides and the fletcher's straw butts: thin worked
// frames — bodies stop, arrows pass (shooting THROUGH the range is the range).
registerDoodadRule('hide_rack', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 20,
  surface: { hw: 0.95, hh: 0.28 },
  forbidOn: ['water', 'lava', 'chasm'],
});
registerDoodadRule('target_butt', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 24, bodyScale: 0.7,
  forbidOn: ['water', 'lava', 'chasm'],
});

// --- THE CITY'S STAIR MOUTHS --------------------------------------------------------
// Burgher ascension (the manor floors pattern, generalized): 'city_stair'
// dwells UP into a minted townhouse floor; 'garret_stair' is the floor-to-
// garret rung the minted floors themselves lay. Trigger rules only — the
// doors live in data/sidezones.ts.
registerDoodadRule('city_stair', { overlap: 'trigger', spacing: 20 });
registerDoodadRule('garret_stair', { overlap: 'trigger', spacing: 20 });
registerStamp('garret_stair', stampSingle('garret_stair', [11, 14]));
// The culvert's STAIR PROP (the tier fabric lays it on each joined well,
// rotated INTO its tunnel's first leg): pure art on both-layers ground —
// inert, walk-through, visible from street AND drain alike.
registerDoodadRule('culvert_stair', { overlap: 'inert', spacing: 40 });
// THE SMUGGLERS' CACHE: what only the drains ever carry — a strapped bundle
// stashed where the watch never walks (the spelunker_pack pattern in the
// runners' own colors; knock it open, keep what spills). Laid tier-tagged by
// the sewer carver — street players never see it, duct runners farm it.
registerDoodadRule('smuggler_cache', {
  overlap: 'inert', spacing: 60,
  brittle: { on: ['hit', 'near'], reach: 30, gemChance: 0.9, orbChance: 0.6, text: 'a smuggler’s stash spills open…', color: '#8ac8a0' },
});
registerStamp('smuggler_cache', stampSingle('smuggler_cache', [10, 13]));

// --- THE SEWER MOUTHS ------------------------------------------------------------------
// The city's OTHER ladder (the descend lane's civic door): a street grate
// dwells DOWN into the minted sewerworks — every district keeps its drains.
// Wide spacing on purpose: one or two mouths per ward, never a grate carpet.
registerDoodadRule('sewer_grate', { overlap: 'trigger', spacing: 420 });
registerStamp('sewer_grate', stampSingle('sewer_grate', [15, 18]));
// Grate-light: the shaft of street-day falling into the dark — the sewer's
// one honest lamp (inert art + a cool light pool; placed by the sewer faces).
registerDoodadRule('light_shaft', { overlap: 'inert', spacing: 320 });
registerStamp('light_shaft', stampSingle('light_shaft', [18, 24]));

// --- WAYSIDE COMPOSITE: the village green ------------------------------------------
// The commons every hamlet keeps: the well at the center, benches and lamps,
// a cart come to market. (Structures ring it via the village compositions —
// this cluster is the green itself.)
registerCluster({
  id: 'village_green',
  anchor: { radius: 80, kind: 'well' },
  pieces: [
    { kind: 'well', radius: [16, 20], count: [1, 1], ring: [0, 1] },
    { kind: 'street_lamp', radius: [9, 12], count: [1, 2], ring: [50, 90] },
    { kind: 'hay_bale', radius: [11, 15], count: [0, 2], ring: [60, 110], rot: true },
    { kind: 'broken_cart', radius: [16, 20], count: [0, 1], ring: [70, 120], rot: true },
    { kind: 'flowers', radius: [14, 22], count: [1, 3], ring: [40, 100] },
  ],
  poi: true,
});
