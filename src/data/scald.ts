// ---------------------------------------------------------------------------
// THE SCALD BASIN KIT — content for the scald country (charter
// docs/design/scald-basin.md; M1 THE COUNTRY). A hydrothermal basin where
// the deep heat never reaches the surface as melt — it arrives as WATER:
// boiling springs, sinter terraces in mineral prismatics, mudpots, sulphur
// pools, and geysers that erupt on a beat you can learn (engine/geysers.ts,
// M0's spine). THE VOLCANIC INVERSE (charter §7): volcanic ground threatens
// constantly and randomly — the basin is safe almost always and lethal on
// schedule; its palette is travertine white / pool cyan-to-orange / sulphur
// yellow / steam white — never char, ember, basalt.
//
// Everything here is registry rows on existing fabrics (the garden.ts /
// merelake.ts single-file doctrine): the region rows (world/regions.ts
// registry), doodad rules + stamps + visuals (the tracks.ts visuals-row
// precedent — DOODAD_VISUALS is an open record), clusters + compositions,
// the meld, the liquid name, both weather kinds (the packages' registerWeather
// lane), and the ONE engine dial block the scald heat sweep reads
// (SCALD_CFG + BaskSpec — World.updateScaldHeat). No engine edits beyond that
// sweep. The faces live in data/tilesets.ts; the kin + looks in
// data/monsters.ts / data/looks.ts (faction 'geyserkin'); the biome row in
// world/biomes.ts; weather LOOKS in render/vis/weatherFx.ts; docs in
// docs/engine/scald.md; probe balance/probe_scald.ts.
//
// Every number is a DIAL (unblessed — she blesses via playthroughs).
// ---------------------------------------------------------------------------

import {
  registerCluster, registerComposition, registerDoodadRule, registerStamp, stampSingle,
} from '../engine/levelgen';
import { registerLiquid } from '../engine/genkit'; // the lake's two waters (M2a)
import { registerCreep } from '../engine/creep'; // the runoff row (M2b)
import { registerEventFront } from '../engine/eventWeather'; // THE SURGE HOUR's steam (M3)
import type { World } from '../engine/world';
import { registerRegion } from '../world/regions';
import { registerWeather } from '../world/weather';
import { registerMeld } from './melds';
import { DOODAD_VISUALS } from './doodadVisuals';

// --- THE SCALD HEAT DIALS (World.updateScaldHeat — the entity seam) ---------

/** THE SCALD'S SOURCES for THE SCORCH BAR (charter §10 — zero ambient, every
 *  source a drawn point phenomenon, entities and players alike through
 *  World.scorchFeed): the eruption column, the broiling mouth (hot ground),
 *  and sulphur-pool PROXIMITY (her "being near"). Scald mist deliberately
 *  feeds NOTHING (concealment stays pure). Units are scorch-bar units
 *  (one unit == one sunscorch stack, SURVIVAL_RESOURCES.scorch). */
export const SCALD_CFG = {
  /** Sweep cadence, seconds (the geyser fabric's applyEvery idiom). */
  sweepEvery: 0.1,
  /** The ERUPTING COLUMN: units/sec fed to every grounded body in the
   *  column's own disc while the erupt phase holds (× eruptSec ≈ units per
   *  eruption — ~0.9 / ~2.4 / ~4.6 per class at the shipped windows). */
  column: { hiss: 1.5, geyser: 3.0, great: 4.0 },
  /** The BROILING MOUTH (hot ground): standing ON a vent's mouth disc while
   *  it broils or erupts — the basker's lounging seat. */
  mouth: { broilPerSec: 0.6 },
  /** SULPHUR-POOL PROXIMITY: within `reach` px of a pool's rim (wading IN it
   *  also rides the region row's own survival feed, seats only). Note the
   *  hold law: any feed stands the out-of-source decay down that frame, so
   *  loitering at a rim climbs the bar slowly but SURELY — step away and it
   *  breathes out at SURVIVAL_RESOURCES.scorch.regen. */
  pool: { reach: 40, perSec: 0.2 },
  /** THE RUNOFF's wash (M2b — the scald_runoff creep row a great vent
   *  pours from its spill side): units/sec fed to a grounded body standing
   *  its live cover. The brood clutches hatch on this same seam (the warm
   *  hatch, ConstructDelivery.hatch.onScorch). */
  runoff: { perSec: 1.2 },
  /** Ceiling on the summed per-sweep feed rate (units/sec) — three sources
   *  stacked on one body never spike past a great column's own heat. */
  maxPerSec: 4.5,
  /** THE BASKER's worn-state safety TTL (the sweep re-stamps it; the band
   *  sync idiom — the world owns the clock). */
  baskTtl: 1.5,
} as const;

/** THE BASKER (charter §8/§10 — her pitch): a cold-blooded plated lounger
 *  whose temper IS the scorch bar read entity-side. World.updateScaldHeat
 *  wears exactly ONE of two statuses off the body's own meter: COOL below
 *  `coolAt` = `coolStatus` (placid and armored — plates sealed), WARM at or
 *  above `warmAt` = `warmStatus` (fierce and soft — plates open); the gap
 *  between is hysteresis, so a body that warmed stays fierce until it has
 *  honestly cooled. The bar itself strips fire res on whoever wears it, so
 *  the warm window is ALSO the fire-vulnerable window by construction.
 *  `quench` is cold's answer: while the body wears the named status (the
 *  def's onHitByType cold → status row — cold does NOT auto-chill), the bar
 *  bleeds `perSec` extra units — fight it cold, or bait the window. The
 *  tells fabric draws tint + posture off 'status:sunscorched' — the bar's
 *  own quantized band, the SAME map the sweep reads (drawn == tested). */
export interface BaskSpec {
  /** Bar units (0..max) at which the warm state engages. */
  warmAt: number;
  /** Bar units below which a warm body settles back to cool. */
  coolAt: number;
  warmStatus: string;
  coolStatus: string;
  quench?: { status: string; perSec: number };
}

// --- THE REGROWTH CYCLE (M2b — charter §5, the Char's honest second half) --

/** THE REGROWTH CYCLE (World.updateCharRegrowth): ASHFIELD relaxes toward
 *  THE GREEN FLUSH and then THE MEADOW over minutes — drawn ecology, no
 *  text — zone-memory-persisted (ZoneMemory.charBorn: a walked Char zone
 *  is visibly further along when you return). Stage swaps the ground kind
 *  in place (the tint bands below); the meadow stands FIRE-FOLLOWER flora
 *  up through the dress/evap fabric (fireweed — kindling FUEL, so the next
 *  fire eats it). The wildfire's own affinity (data/creeps.ts — ashfield
 *  0.4: fresh burn STARVES the next fire; untouched) closes the loop on
 *  standing law. Every number a DIAL. */
export const REGROWTH_CFG = {
  /** Sweep cadence (seconds) and the most pieces advanced per sweep. */
  sweepEvery: 2.0,
  perSweep: 6,
  /** The cycle's kinds (region rows + visuals below). */
  ash: 'ashfield', flush: 'regrowth_flush', meadow: 'regrowth_meadow',
  /** Age (seconds since laid / since the zone's charBorn) at which ash
   *  relaxes to the flush, and the flush to the meadow. */
  flushAfter: 150,
  meadowAfter: 300,
  /** THE FIRE-FOLLOWERS stood up around each meadow piece: kind, count,
   *  radius, how long they stand before drying away (the evap fabric —
   *  never a permanent repaint), and the dry pace. */
  flora: { kind: 'fireweed', count: [1, 3] as const, radius: [9, 16] as const, dwell: [420, 720] as const, evapRate: 6 },
} as const;

// THE GREEN FLUSH + THE MEADOW: ashfield's grammar relaxing — walkable, no
// slog, no hazard, not fuel (the meadow's flora carry the fuel).
registerRegion({ id: 'regrowth_flush', walkable: true, blocks: false, label: 'the green flush', moveScale: 1 });
registerDoodadRule('regrowth_flush', { overlap: 'ground', walkOnly: true });
registerStamp('regrowth_flush', stampSingle('regrowth_flush', [34, 64]));
registerRegion({ id: 'regrowth_meadow', walkable: true, blocks: false, label: 'the regrowth', moveScale: 1 });
registerDoodadRule('regrowth_meadow', { overlap: 'ground', walkOnly: true });
registerStamp('regrowth_meadow', stampSingle('regrowth_meadow', [34, 64]));
// THE AUTHORED BURN: the Char lays ashfield at mint (the wildfire's runtime
// wake gets a gen-time stamp of its own so the face reads as burn country
// before any front has marched — the regrowth sweep ages it off charBorn).
registerStamp('ashfield', stampSingle('ashfield', [40, 80]));
// FIREWEED — the fire-follower: a walk-through bloom that IS kindling (the
// next fire eats it — the cycle's fuel half), spun per piece like brush.
registerDoodadRule('fireweed', { overlap: 'ground', walkOnly: true, spin: true, fuel: 'kindling', spacing: 14 });
registerStamp('fireweed', stampSingle('fireweed', [9, 16]));

// --- THE SHELTER SEAT (M2b — the burn rain's roofed counterplay) -----------
// A sinter overhang: a travertine shelf whose LIP reaches past its small
// solid body (bodyScale) — bodies under the lip count as roofed
// (DoodadRule.shelter → World.underRoofAt): the rain passes over, the gale
// becalms, the heat-shade holds. Blocks feet at the body only; shots and
// sight pass (a low shelf, not a wall); never a sight-veil shadow.
registerDoodadRule('sinter_overhang', {
  overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false, sightShadow: false,
  bodyScale: 0.42, spacing: 70, shelter: true, forbidOn: ['water', 'chasm', 'lava'],
});
registerStamp('sinter_overhang', stampSingle('sinter_overhang', [34, 50]));

// --- THE POOL KIT: region rows (the ground's truth) -------------------------
// The region id IS the doodad kind id (world.ts groundAt reads the registry
// by kind) — four parallel registrations per pool kind: the RegionKind row,
// the DoodadRule, the stamp, the visuals row.

// THE SULPHUR POOL (charter §6 — a contained hazard in the brine/lava
// family): wadeable, a scald STING on entry wearing its OWN status id (the
// brine_burn lesson — never the combat vignette), a standing fire DoT
// through RESISTANCE only (the lava doctrine — capping fire res is the
// build answer), at THE MIRE BAND (severity 30: it speaks over mud and
// standing water, defers to the melt), the detour priced honestly, and the
// scorch bar FED while you stand in it (the fill route — seats only; the
// heat sweep's proximity trickle warms entities too). NO douse row,
// deliberately: hot caustic soup is not refuge (the brine-sink law, pinned
// by probe_scald) — water stops being refuge the moment you cross into the
// basin (charter §7/§9).
registerRegion({ id: 'sulphur_pool', walkable: true, blocks: false, label: 'the sulphur pool',
  standStatus: 'wading', surfaceWake: 'ripple', pathCost: 6, severity: 30,
  standDamage: { dps: 4.5, dpsPerLevel: 0.8, type: 'fire' },
  enterStatus: { id: 'sulphur_sting', amount: 1.2, amountPerLevel: 0.6, duration: 1 },
  enterText: { text: 'the pool scalds!', color: '#d8e04a' },
  survival: { resource: 'scorch', drain: 0.5 } });
registerDoodadRule('sulphur_pool', { overlap: 'ground', hazardGround: true });
registerStamp('sulphur_pool', stampSingle('sulphur_pool', [26, 50]));

// --- THE LAKE'S TWO WATERS (charter §6 THE LAKE — M2a; engine/lake.ts) -----
// The sulphur_pools heart face pins the `lake` recipe (data/tilesets.ts) and
// names these through its layoutParams (`lakeLiquid: 'sulphur'`,
// `deepLiquid: 'sulphur_deep'`) — the liquids are REGISTERED HERE the day a
// recipe pours them (the orphan census sees the face's params; M1 left them
// out on purpose). Both are GRID regions (the soulriver/harborcove pour
// discipline): the walk grid's cells ARE the water — World.applyRegionEffects
// reads them off `walk.regionAt` every frame, the renderer bakes/animates
// them off the same cells (drawn == tested through one read).
//
// THE SHELF — `sulphur_shelf`: the sulphur_pool row's MILDER cousin ringing
// the deep. Wadeable (standStatus wading — the water row's grammar), the same
// sting id at a lighter amount, a lighter fire DoT through RESISTANCE only,
// the scorch bar FED while a seat wades (the fill route — like the pools), a
// priced pathCost (wading the shallows is a choice, not a stroll), and NO
// douse (the brine-sink law: no basin water is refuge). Caustic yellow-green,
// blot-baked so the waterline sinks into the crust instead of stamping.
registerRegion({ id: 'sulphur_shelf', walkable: true, blocks: false, label: 'the sulphur shallows',
  standStatus: 'wading', surfaceWake: 'ripple', pathCost: 4, severity: 30,
  standDamage: { dps: 2.5, dpsPerLevel: 0.45, type: 'fire' },
  enterStatus: { id: 'sulphur_sting', amount: 0.8, amountPerLevel: 0.4, duration: 1 },
  enterText: { text: 'the shallows scald!', color: '#d8e04a' },
  survival: { resource: 'scorch', drain: 0.35 },
  visual: { fill: '#8fb04a', alpha: 0.5, blot: true } });
// THE DEEP — `sulphur_deep`: THE DEEP-MIDDLE REFUSAL under deepPolicy
// 'block'. Not walkable, not blocking (shots and sight SAIL ACROSS — the
// lake's occlusion-free firing lane is its tactical signature), an EJECT
// boundary (a step in is shoved back out, scalded — "too deep", never a
// fall: fall-family rows become pit doors under ground), jump/blink crosses
// it like a chasm, and THE BROIL LAW's permanent face: `animate: 'broil'` —
// the renderer's lake pass draws the geyser fabric's OWN roil (the same
// drawn word a vent wears for two seconds before it bursts) over these
// cells forever. A warning that never resolves is a refusal; nobody asks
// why they can't swim water that is cooking. Mineral cyan at depth, a
// prism-crust rim where the shelf drops off (the edge bakes toward the
// walkable shelf). No floaters, no labels (the show-don't-tell law).
registerRegion({
  id: 'sulphur_deep', walkable: false, blocks: false, label: 'the boiling deep',
  boundaryPolicy: { kind: 'eject', to: 'edge', damage: { amount: 0, pctMaxLife: 0.1, type: 'fire', canKill: true } },
  crossableBy: (d) => !!d.ignoreFall || !!d.ignoreConfine,
  visual: { fill: '#2f8f9c', alpha: 0.72, animate: 'broil', edge: { color: '#e8e0a0', width: 4 } },
});
registerLiquid('sulphur', { region: 'sulphur_shelf' });         // the lake's wadeable caustic shelf
registerLiquid('sulphur_deep', { region: 'sulphur_deep' });     // the lake's boiling, refused middle

// THE PRISM POOL (the sinter terraces' jewel): a warm mineral pool in banded
// color — wadeable and gentle (no sting), at THE WET SEAT (20), mirror-still
// — and, like every basin water, NO douse: the mineral gate teaches the
// country's one inversion for free.
registerRegion({ id: 'prism_pool', walkable: true, blocks: false, label: 'the prism pool',
  standStatus: 'wading', surfaceWake: 'ripple', surfaceMirror: true, pathCost: 1.4, severity: 20 });
registerDoodadRule('prism_pool', { overlap: 'ground', hazardGround: true });
registerStamp('prism_pool', stampSingle('prism_pool', [18, 34]));

// THE MUDPOT: a bubbling mud kettle — the mud row's slog in the basin's
// register (the deposit band, no overruns: a mudpot is a place, never a
// splash on a road).
registerRegion({ id: 'mudpot', walkable: true, blocks: false, label: 'the mudpot',
  standStatus: 'mired', pathCost: 2.4, severity: 10 });
registerDoodadRule('mudpot', { overlap: 'ground' });
registerStamp('mudpot', stampSingle('mudpot', [16, 30]));

// --- THE MINERAL FURNITURE (decoration — walk-over crusts, one solid cone) --

// Travertine shelf: pale mineral sheeting stepped around the pools (the
// flowstone grammar — a walkable crust, never a wall).
registerDoodadRule('sinter_shelf', { overlap: 'ground', walkOnly: true, forbidOn: ['water', 'chasm', 'lava'] });
registerStamp('sinter_shelf', stampSingle('sinter_shelf', [30, 58]));
// Sulphur crust: the yellow bloom the heart wears (the ashfield grammar).
registerDoodadRule('sulphur_crust', { overlap: 'ground', walkOnly: true, spacing: 20 });
registerStamp('sulphur_crust', stampSingle('sulphur_crust', [24, 46]));
// Sinter cone: a dead spring's heaved crust rim — the vent painter's bones
// in cold pale stone; the one SOLID the kit plants (blocks feet, not shots).
registerDoodadRule('sinter_cone', { overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 40,
  bodyScale: 0.7, forbidOn: ['water', 'chasm', 'lava'] });
registerStamp('sinter_cone', stampSingle('sinter_cone', [14, 24]));
// Steam pocket: a low hollow where the ground breathes — a faint white
// wash (the mist_pool grammar in steam). Pure dressing; the meld's wisp.
registerDoodadRule('steam_pocket', { overlap: 'ground', walkOnly: true, spacing: 30 });
registerStamp('steam_pocket', stampSingle('steam_pocket', [18, 32]));
// Prism sheen: the mineral rain's drying pock (weather dress plants it,
// rollDressPieces — never gen-stamped, so no stamp row).
registerDoodadRule('prism_sheen', { overlap: 'ground', walkOnly: true, spacing: 24 });
// THE SCALD SHEEN (M2b): the runoff's evaporating wake — a thin hot film the
// scald_runoff row stamps behind its crest (convert.fade) and dries away.
// Walkable, no status of its own (the live run stings; the sheen is what it
// leaves) — a region row so groundAt senses it and the fade lane can dry it.
registerRegion({ id: 'scald_sheen', walkable: true, blocks: false, label: 'the scald sheen', moveScale: 1 });
registerDoodadRule('scald_sheen', { overlap: 'ground', walkOnly: true });
// EMBER LITTER (M2b): the cinderwind's brief ember fall — weather dress
// (WeatherDef.dress plants it, evaps as the front passes); NOT fuel (embers
// are what already burned) and never gen-stamped.
registerDoodadRule('ember_litter', { overlap: 'ground', walkOnly: true, spacing: 26 });

// --- THE VISUALS (reused honest painters — the charred-snag doctrine) -------

// The sulphur pool: caustic yellow-green banding to mineral cyan at depth,
// a sulphur-crust rim, the simmer's bubbles (brine_sink's liquid grammar).
DOODAD_VISUALS['sulphur_pool'] = {
  painter: 'liquid', order: 22,
  blend: { strength: 0.42, feather: 22, color: '#8a9a4a' },
  params: {
    rim: { color: '#e8e0a0', alpha: 0.7, grow: 5 },
    core: { color: '#9ab83c', alpha: 0.8 },
    heart: { color: '#5ea8a0', alpha: 0.35 },
    bubbles: { color: '#eef4b0', density: 0.6 },
    sheen: { color: '#f4ffe0' },
  },
};
// The prism pool: travertine rim, pool cyan banding to orange at the heart
// (the §7 palette — bright water color on pale crusts).
DOODAD_VISUALS['prism_pool'] = {
  painter: 'liquid', order: 23,
  blend: { strength: 0.36, feather: 18, color: '#9ab8b0' },
  params: {
    rim: { color: '#f0ead8', alpha: 0.75, grow: 5 },
    core: { color: '#2f97a4', alpha: 0.78 },
    heart: { color: '#e0a050', alpha: 0.38 },
    sheen: { color: '#eafcff' },
  },
};
// The mudpot: mud's blotch with a slow swelling bubble that pops.
DOODAD_VISUALS['mudpot'] = {
  painter: 'liquid', order: 16,
  blend: { strength: 0.42, feather: 20, color: '#4e4432' },
  params: {
    core: { color: '#5a4a36', alpha: 0.6 },
    blotch: { color: '#2a2218' },
    bubbles: { color: '#8a7a5c', density: 1.0 },
  },
};
// The sinter shelf: flowstone's mound in travertine white.
DOODAD_VISUALS['sinter_shelf'] = {
  painter: 'mound', order: 30,
  params: { color: '#d8d0b8', edge: '#f0ead8' },
  blend: { strength: 0.3, feather: 16, color: '#c8c0a8' },
};
// The sulphur crust: ashfield's grammar in yellow, dried cracks on top.
DOODAD_VISUALS['sulphur_crust'] = {
  painter: 'liquid', order: 17,
  blend: { strength: 0.4, feather: 24, color: '#a89a3a' },
  params: {
    core: { color: '#c8b83a', alpha: 0.42 },
    blotch: { color: '#8a7a20' },
    crackle: { color: '#e8dc80' },
  },
};
// The sinter cone: the vent painter's crater in cold pale stone — a dead
// spring (no light: it is not a mouth; the beat_vent row is the live one).
DOODAD_VISUALS['sinter_cone'] = {
  painter: 'vent', order: 50, longShadow: 0.5,
  params: { rim: '#d8d0b8', throat: '#6a7a70', hot: '#9ccfcf', core: '#dff6f0' },
};
// The steam pocket: mist_pool's faint wash in white.
DOODAD_VISUALS['steam_pocket'] = {
  painter: 'liquid', order: 46,
  blend: { strength: 0.26, feather: 22, color: '#e6eef0' },
  params: {
    core: { color: '#eef6f8', alpha: 0.22 },
    tufts: { color: '#dfe9ec', flower: '#ffffff' },
  },
};
// The prism sheen: a brief iridescent wet patch (the mineral rain's pock).
DOODAD_VISUALS['prism_sheen'] = {
  painter: 'liquid', order: 24,
  params: {
    core: { color: '#bfe8f0', alpha: 0.3 },
    heart: { color: '#f0b070', alpha: 0.25 },
    sheen: { color: '#ffffff' },
  },
};
// --- M2b — THE CHAR'S TEETH + THE DOWNSTREAM's dress -----------------------
// The scald sheen: the runoff's drying film — pale hot water over the crust,
// a steam-white sheen, no rim (a film, not a pool).
DOODAD_VISUALS['scald_sheen'] = {
  painter: 'liquid', order: 24,
  blend: { strength: 0.3, feather: 18, color: '#9ad0d4' },
  params: {
    core: { color: '#bfeaf0', alpha: 0.34 },
    heart: { color: '#e8fbfd', alpha: 0.22 },
    sheen: { color: '#ffffff' },
  },
};
// The green flush: ashfield's grammar warming toward green — the tint band
// (charter §5: "ashfield cells relax toward regrowth ground").
DOODAD_VISUALS['regrowth_flush'] = {
  painter: 'liquid', order: 17,
  blend: { strength: 0.42, feather: 26, color: '#30362a' },
  params: {
    core: { color: '#2c3426', alpha: 0.44 },
    blotch: { color: '#1a2016' },
    tufts: { color: '#587a3c', flower: '#7ca050' },
  },
};
// The meadow: the flush fully green — the ground the fireweed stands in.
DOODAD_VISUALS['regrowth_meadow'] = {
  painter: 'liquid', order: 17,
  blend: { strength: 0.4, feather: 26, color: '#3e4e30' },
  params: {
    core: { color: '#3a4a2c', alpha: 0.4 },
    blotch: { color: '#243018' },
    tufts: { color: '#6a8e48', flower: '#a8c870' },
  },
};
// Fireweed: the fire-follower's rose-magenta bloom (flowers' grammar).
DOODAD_VISUALS['fireweed'] = {
  painter: 'liquid', order: 46,
  params: {
    core: { color: '#4a3a3c', alpha: 0.14 },
    tufts: { color: '#6a8a46', flower: '#e070a8' },
  },
};
// Ember litter: the cinderwind's fall — dark cinder specks, an ember glow
// that dies as it dries (cinder's grammar, dimmer; a small breathing light).
DOODAD_VISUALS['ember_litter'] = {
  painter: 'liquid', order: 24,
  params: {
    core: { color: '#2a1a12', alpha: 0.4 },
    embers: { color: '#ff8a3a', density: 0.4 },
  },
  light: { radius: -1.3, color: '#ff7a2a', intensity: 0.14, flicker: 2.2 },
};
// The sinter overhang: flowstone's mound as a travertine shelf — pale, a
// long shadow (a lip the sky cannot see under), drawn at the full radius
// the shelter reads (drawn == tested).
DOODAD_VISUALS['sinter_overhang'] = {
  painter: 'mound', order: 53, shadow: 0.55, longShadow: 1.1,
  params: { color: '#ded6bc', edge: '#f4eedc' },
  blend: { strength: 0.22, feather: 14, color: '#c8c0a8' },
};

// --- CLUSTERS + COMPOSITIONS (the terrace stair, the mudpot field) ---------

// A SINTER TERRACE: prism pools stepped in travertine shelves — the
// country's beauty shot, one cluster (packed: the shelves lap the pools).
registerCluster({
  id: 'sinter_terrace',
  anchor: { radius: 40, kind: 'prism_pool' },
  pieces: [
    { kind: 'prism_pool', radius: [22, 34], count: [1, 1], ring: [0, 1], centerpiece: true, packed: true },
    { kind: 'sinter_shelf', radius: [34, 52], count: [3, 5], ring: [22, 64], packed: true },
    { kind: 'prism_pool', radius: [12, 20], count: [2, 4], ring: [40, 96], packed: true },
    { kind: 'sinter_shelf', radius: [26, 40], count: [2, 4], ring: [80, 130], packed: true },
  ],
  poi: true,
});
// A MUDPOT FIELD: kettles of bubbling mud with the sulphur bloom between.
registerCluster({
  id: 'mudpot_field',
  anchor: { radius: 30, kind: 'mudpot' },
  pieces: [
    { kind: 'mudpot', radius: [16, 28], count: [3, 6], ring: [0, 90], packed: true },
    { kind: 'sulphur_crust', radius: [20, 34], count: [1, 3], ring: [40, 120], packed: true },
  ],
});
// THE SULPHUR POCKS: the heart's pool-pocked ground — contained hazards in
// a loose constellation, crusts and a breathing pocket between.
registerCluster({
  id: 'sulphur_pocks',
  anchor: { radius: 40, kind: 'sulphur_pool' },
  pieces: [
    { kind: 'sulphur_pool', radius: [22, 44], count: [2, 4], ring: [0, 110], packed: true },
    { kind: 'sulphur_crust', radius: [24, 44], count: [2, 4], ring: [30, 150], packed: true },
    { kind: 'steam_pocket', radius: [18, 30], count: [1, 2], ring: [60, 160], packed: true },
  ],
});
// THE TERRACE STAIR: a sited terrace cluster (a POI the spawners nest at).
registerComposition({
  id: 'terrace_stair',
  sites: [{ id: 'stair', radius: [140, 190] }],
  post: [{ kind: 'cluster', cluster: 'sinter_terrace', at: 'stair', count: [1, 1] }],
});
// THE KETTLE FLAT: a mudpot field off the ways (gated on the damp belt the
// basin claims — a dry mint rolls no kettles).
registerComposition({
  id: 'kettle_flat',
  when: { moisture: { min: 0.35 } },
  post: [{ kind: 'cluster', cluster: 'mudpot_field', count: [1, 2] }],
});

// --- THE MELD (charter §11: the steam before the ground turns) -------------
// Inert dressing only (the census law: no active hazard, no water-habitat
// kind on a dry border band) — steam pockets, a sinter shelf, a crust bloom,
// reeds at the damp edge.
registerMeld({
  id: 'scald_meld',
  label: 'steam drifts over the ground ahead',
  rows: [
    { kind: 'steam_pocket', count: [1, 2] },
    { kind: 'sinter_shelf', count: [0, 1], radius: [26, 40] },
    { kind: 'sulphur_crust', count: [0, 1] },
    { kind: 'reeds', count: [1, 2] },
  ],
});

// --- THE WEATHER (charter §11) -----------------------------------------------
// Born over the basin's own climate (warm ∧ damp ∧ LOW — the elevation axis
// is the basin gate; the charter's "the climate claim IS the weather gate"),
// then drifting where the sky argues. Looks in render/vis/weatherFx.ts.

// THE SCALD MIST — the country's own front: fog-family, barely dimming
// (radiance ~0.75), lingering long over the wet heart. Deliberately NO
// scorch-bar feed inside a bank: mist stays pure concealment (§10).
registerWeather('scald_mist', {
  label: 'Scald Mist', color: '#b8ccd0', countMul: 1.1, factionMul: { geyserkin: 1.3 },
  rampFrac: 0.5, wind: 0.1,
  radiance: { mul: 0.75 },
  skyWeight: { dawn: 3, day: 1.5, dusk: 3, night: 2 },
  birthGeo: { temperature: { min: 0.5 }, moisture: { min: 0.42 }, elevation: { max: 0.52 } },
  lingerGeo: { moisture: { min: 0.55, mul: 1.4 } },
});
// MINERAL RAIN — light and pretty: a rain whose dress rows leave brief
// prism-sheen pocks (the petalfall model) — spectacle-grade.
registerWeather('mineral_rain', {
  label: 'Mineral Rain', color: '#9fd8d4', countMul: 1, factionMul: {},
  rampFrac: 0.45, wind: 0.3,
  radiance: { mul: 0.9 },
  skyWeight: { day: 1.4, dusk: 1, dawn: 1 },
  birthGeo: { temperature: { min: 0.5 }, moisture: { min: 0.42 }, elevation: { max: 0.52 } },
  dress: { rows: [{ doodad: 'prism_sheen', count: [3, 6], radius: [14, 22], minGap: 150 }] },
  // THE WET SKY (the scald kit): a body under the mineral rain is rain-wet —
  // the scald bank folds ×wetMul onto it (the basin's own rain arms its
  // own scald; charter docs/design/scald-kit.md §3.1).
  wets: true,
});
// THE SURGE HOUR's STEAM (M3 coda — charter §0 seventh walk, her cascade:
// surge → eruptions → steam → wisps): while the basin's vents run hot
// (engine/geysers.ts GEYSER_CFG.surge — World.geyserSurge, pure f(world
// clock, zone key)) the zone's air reads as ITS OWN WEATHER — the transience
// doctrine's presentation lane: an eventOnly row the sky never births,
// pinned over the CURRENT zone by the event-front source below (the
// quickened_air idiom), folded at World.skyFront like any front, gone the
// breath the window closes. The look (render/vis/weatherFx.ts) is the scald
// mist's, denser and rising; the DRESS rows plant transient steam pockets
// while it holds and dissolve them as it lifts (Doodad.evap) — "the
// mineral mist rises", never a floater. UNANNOUNCED by construction: no
// omen, no bulletin, no map mark — this file imports none of those.
// Sheltered ground (the steam galleries) gets no sky front by the skyFront
// law; the wisp tide still pours there.
export const SURGE_STEAM = {
  /** Seconds the pinned front ramps in at the open and out at the close
   *  (intensity = min(elapsed, remaining) / ramp, capped 1). */
  ramp: 18,
  /** A faint floor while held, so the front never reads as "clear" mid-hour. */
  floor: 0.2,
} as const;
registerWeather('scald_surge_steam', {
  label: 'Surge Steam', color: '#c9dde0', countMul: 1.05, factionMul: { geyserkin: 1.2 },
  rampFrac: 0.3, wind: 0.12,
  radiance: { mul: 0.7 },
  eventOnly: true,
  dress: { rows: [{ doodad: 'steam_pocket', count: [3, 7], radius: [16, 30], minGap: 120 }] },
});
registerEventFront({
  id: 'scald_surge',
  sample: (world: World) => {
    const s = world.geyserSurge();
    if (!s || !s.held) return null;
    const t = world.time;
    const edge = Math.min(t - s.t0, s.t1 - t);
    const intensity = Math.max(SURGE_STEAM.floor, Math.min(1, edge / SURGE_STEAM.ramp));
    return { kind: 'scald_surge_steam', intensity };
  },
});
// THE CINDERWIND (M2b — charter §5 "fire weather"): the Char's front. Born
// over HOT ∧ LOW ∧ the basin's DRY FLANK (the moisture band's lower half —
// the sandstorm's birth-geography grammar; cinderwind never rises off the
// wet heart), storm-grade wind carrying ember streaks (render/vis/
// weatherFx.ts), a SPARSE strike row (falling cinders through the shared
// strike machinery — the blizzard/hellsear precedent; roofs shelter), and
// dress rows of brief ember litter that evap as it passes. Under it the
// Char's wildfire lanes LEAN UP (data/tilesets.ts char_reach: the lane gated
// `when: { weather: ['cinderwind'] }` — the cometfall's radiance-gate
// precedent, keyed to the standing weather).
registerWeather('cinderwind', {
  label: 'Cinderwind', color: '#d8743a', countMul: 1.1, factionMul: { geyserkin: 1.15 },
  rampFrac: 0.35, wind: 0.85,
  radiance: { mul: 0.82 },
  skyWeight: { day: 1.1, dusk: 1.4, night: 0.6, dawn: 0.8 },
  birthGeo: { temperature: { min: 0.5 }, moisture: { min: 0.36, max: 0.58 }, elevation: { max: 0.52 } },
  lingerGeo: { moisture: { max: 0.45, mul: 1.25 } },
  strike: { skillId: 'cinder_fall', radius: 44, telegraph: 0.7, ratePerSec: 0.12, fx: 'blast' },
  dress: { rows: [{ doodad: 'ember_litter', count: [3, 6], radius: [12, 20], minGap: 140 }] },
});

// --- THE RUNOFF (M2b — charter §4c, card 2: the downstream's third lane) ---
// A great vent's spent water poured from its SPILL SIDE (engine/geysers.ts
// spillBearing — pure per seat, the same side every beat; World.pourRunoff
// at the burst edge): ONE marching section of this row — the brinesurge /
// wildfire family, in the basin's register. `travel` = a finite run that
// disperses (the reach DIAL ~300–500), `flow` = the vessel bore (the runoff
// hugs channels, rebounds out of dead ends), `convert.fade` = the
// evaporating scald sheen (the transience doctrine — the ground forgets),
// `quench` cold, a scald sting on whoever it crosses (the `scalded` row —
// the sulphur_sting family; no screen-fx row, the terrain-stings rule), and
// a gentle along-bearing carry. The safe side of a vent is UPHILL of its
// spill, and the fauna know it (the brood clutches hatch on its wash — the
// warm hatch; the shoal frenzies as it passes).
registerCreep({
  id: 'scald_runoff',
  color: '#2c6a70', rim: '#e6fbfd', glow: '#9fe4ea',
  notAquatic: true, // spent water on land — never under the sea
  alpha: 0.58,
  reach: [44, 70],
  lobing: 0.26,
  spread: 40,
  recede: 90,
  pulse: 1.5,
  skin: 'water',
  edge: { color: '#f2feff', style: 'foam' },
  front: {
    speed: 56,
    affinity: {
      // Downhill is WATER: the run races through standing water and the
      // kettles, wallows a little on the dry crust, refuses the melt.
      ground: { water: 1.35, sulphur_pool: 1.3, prism_pool: 1.25, mudpot: 1.2, mud: 1.1, sinter_shelf: 0.85, lava: 0 },
      default: 1,
    },
    yieldWays: true,
    travel: { range: [300, 500], taper: 0.4 },
    flow: { steer: 2.4, bounce: 0.4, probe: 1.2 },
    convert: { ground: 'scald_sheen', every: 1.6, r: [0.55, 0.8], fade: { after: [6, 12], rate: 9 } },
    drag: { accel: 36 },
    quench: { types: ['cold'], power: 300 },
  },
  grants: [
    { status: 'scalded', notFactions: ['geyserkin'] },
  ],
});
