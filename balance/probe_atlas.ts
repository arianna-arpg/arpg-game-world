// THE ATLAS PROBE — the world map's SHOWN ground and the MAP FEATURES the
// zones minted on them inherit (world/atlas.ts + data/atlasFeatures.ts + the
// worldgen fold), pinned so the foreordained-feature contract holds by
// assertion.
//
//   A. THE SEED IS THE PLAN — features are pure per seed (the same rect twice
//      is byte-identical; seeds differ), stand on LAND, obey their finders
//      (summits at or above the floor and apart; lodes on high ground; lakes
//      at a traced river's inland end), name themselves stably, answer
//      featuresAt at their own seat and NOT past their reach, and vanish
//      without an installed seed.
//   B. THE PIXEL LAW — flat ground keeps its biome tint exactly; a face
//      turned to the light lifts, one turned away sinks; snow pales the
//      heights; the sea deepens off its shelf; relief off = the tint at any
//      slope; the climate bands' own words.
//   C. THE MINT FOLD — a random-frontier mint under a summit bakes the id,
//      the lone_mountain roll and the relief lift, and LOADS sound; a lode
//      mint stands the harvest bounty at load; a lake mint rolls the mere;
//      THE FRONTIER LAW (a directed mint at the same seat carries nothing);
//      THE BYTE-IDENTITY LAW (a feature-less frontier mint with the fabric
//      installed equals the same mint with it uninstalled, byte for byte).
//
//   D. THE KNOWLEDGE LAW — every graph mint is born veiled and unseen; a mint
//      beside walked ground is seen at once (structural); a knowledge act
//      lifts it for good; `veiled: false` opts out; and over a lived world
//      every zone the chart shows is walked, beside walked ground, or
//      surveyed (THE KNOWLEDGE INVARIANT).
//
//   npx tsx balance/probe_atlas.ts [-- --verbose]

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import '../src/data/atlasFeatures';
import {
  atlasSeedInstalled, atlasShade, climateWords, featureNameOf, featuresAt, featuresInRect, hexRgb,
  mapFeatureKind, mapFeatureKinds, setAtlasSeed, type MapFeature, type RGB,
} from '../src/world/atlas';
import { BIOMES, OCEAN_BIOME } from '../src/world/biomes';
import { installGeography } from '../src/world/geography';
import { climateAt, setClimateOrigin } from '../src/world/climate';
import { continentAt, continentSeedFrom } from '../src/world/continents';
import { RELIEF_CFG, elevationAt, riverPathsInRect, setReliefSeed } from '../src/world/relief';
import { placeZoneAt } from '../src/engine/worldgen';
import { HARVEST_CFG } from '../src/engine/harvest';
import { harvestRowsFor } from '../src/data/harvest';
import { HUB_ZONE, START_ZONE, ZONES, type ZoneDef } from '../src/data/zones';
import type { World } from '../src/engine/world';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

bootSimEngine();
seedGlobalRandom(0xa71a5);

// --- RIG A: the seed is the plan ---------------------------------------------------
{
  setClimateOrigin({ x: 0, y: 0 });
  const SEEDS = Array.from({ length: 8 }, (_, i) => (0xa71a5 ^ (i * 0x9e3779b9)) >>> 0);
  const MIN = { x: -4200, y: -4200 }, MAX = { x: 4200, y: 4200 };
  const counts: Record<string, number> = {};
  let sameTwice = true, differs = false, allLand = true, peaksOk = true, peaksApart = true;
  let lodesOk = true, lakesOk = true, namesOk = true, atSeat = true, pastReach = true, kindsKnown = true;
  let prevIds: string | null = null;
  const peakDef = mapFeatureKind('peak')!, lodeDef = mapFeatureKind('lode')!;
  const peakSpan = peakDef.find.kind === 'peaks' ? peakDef.find.span : 0;
  const peakFloor = peakDef.find.kind === 'peaks' ? peakDef.find.minElevation : 0;
  const lodeFloor = lodeDef.find.kind === 'strewn' ? (lodeDef.find.gates?.find(g => g.axis === 'elevation')?.min ?? 0) : 0;
  for (const seed of SEEDS) {
    installGeography(seed, 2);
    setReliefSeed(seed);
    setAtlasSeed(seed);
    const feats = featuresInRect(MIN, MAX, seed);
    if (JSON.stringify(feats) !== JSON.stringify(featuresInRect(MIN, MAX, seed))) sameTwice = false;
    const ids = feats.map(f => f.id).join(',');
    if (prevIds !== null && prevIds !== ids) differs = true;
    prevIds = ids;
    const contSeed = continentSeedFrom(seed);
    const inland = new Set<string>();
    for (const p of riverPathsInRect(MIN, MAX, seed)) {
      const last = p[p.length - 1];
      if (p.length < RELIEF_CFG.trace.maxSteps + 1 && continentAt(last, contSeed).kind === 'land') {
        inland.add(`${Math.round(last.x)}_${Math.round(last.y)}`);
      }
    }
    const peaks: MapFeature[] = [];
    for (const f of feats) {
      counts[f.kind] = (counts[f.kind] ?? 0) + 1;
      const def = mapFeatureKind(f.kind);
      if (!def) { kindsKnown = false; continue; }
      if (continentAt(f.seat, contSeed).kind !== 'land') allLand = false;
      if (f.kind === 'peak') {
        peaks.push(f);
        const e = elevationAt(f.seat, seed);
        if (e < peakFloor || Math.abs(e - f.value) > 1e-9) peaksOk = false;
      }
      if (f.kind === 'lode' && elevationAt(f.seat, seed) < lodeFloor - 1e-9) lodesOk = false;
      if (f.kind === 'lake' && !inland.has(`${Math.round(f.seat.x)}_${Math.round(f.seat.y)}`)) lakesOk = false;
      if (!f.name.startsWith('the ') || featureNameOf(f.id, seed) !== f.name) namesOk = false;
      if (!featuresAt(f.seat, seed).some(h => h.feature.id === f.id && h.dist < 1e-6)) atSeat = false;
      if (featuresAt({ x: (f.scarp ? Math.max(f.scarp.a.x, f.scarp.b.x) : f.seat.x) + def.reach + 1, y: f.seat.y }, seed).some(h => h.feature.id === f.id)) pastReach = false;
    }
    for (let i = 0; i < peaks.length; i++) {
      for (let k = i + 1; k < peaks.length; k++) {
        if (Math.hypot(peaks[i].seat.x - peaks[k].seat.x, peaks[i].seat.y - peaks[k].seat.y) < peakSpan * 0.3) peaksApart = false;
      }
    }
    note(`seed ${seed.toString(16)}: ${feats.length} features`);
  }
  const kinds = mapFeatureKinds().map(k => k.id);
  check('A1 every registered kind stands somewhere across the seeds',
    kinds.every(k => (counts[k] ?? 0) > 0), kinds.map(k => `${k} ${counts[k] ?? 0}`).join(', '));
  check('A2 the same rect twice is byte-identical', sameTwice);
  check('A3 different seeds deal different features', differs);
  check('A4 every feature stands on land', allLand);
  check('A5 summits stand at or above the floor, at their own elevation', peaksOk);
  check('A6 summits stand apart (lattice local maxima never neighbour)', peaksApart);
  check('A7 lodes stand on high ground (the elevation gate)', lodesOk);
  check('A8 lakes sit exactly at a traced river\'s inland end', lakesOk);
  check('A9 names are stable ("the X Y", re-derived from the id)', namesOk && kindsKnown);
  check('A10 featuresAt answers at the seat …', atSeat);
  check('A11 … and never past the reach', pastReach);
  setAtlasSeed(null);
  check('A12 no installed seed, no features', featuresInRect(MIN, MAX).length === 0 && featuresAt({ x: 0, y: 0 }).length === 0);
}

// --- RIG B: the pixel law ----------------------------------------------------------------
{
  const lum = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const base = { biome: 'grove', elev: 0.5, kind: 'land' as const, sx: 0, sy: 0, shore: Infinity, relief: true };
  const flat = atlasShade({ ...base }, [0, 0, 0]);
  const tint = hexRgb(BIOMES.grove.mapColor);
  check('B1 flat ground keeps its biome tint exactly',
    Math.max(Math.abs(flat[0] - tint[0]), Math.abs(flat[1] - tint[1]), Math.abs(flat[2] - tint[2])) <= 1,
    `${flat.map(v => v.toFixed(0)).join(',')} vs ${tint.join(',')}`);
  const lit = atlasShade({ ...base, sx: 0.0012, sy: 0.0012 }, [0, 0, 0]);
  const dark = atlasShade({ ...base, sx: -0.0012, sy: -0.0012 }, [0, 0, 0]);
  check('B2 a face turned to the north-west light lifts, one turned away sinks',
    lum(lit) > lum(flat) + 4 && lum(dark) < lum(flat) - 4, `lit ${lum(lit).toFixed(0)} flat ${lum(flat).toFixed(0)} dark ${lum(dark).toFixed(0)}`);
  const snow = atlasShade({ ...base, elev: 0.95 }, [0, 0, 0]);
  check('B3 snow pales the heights', lum(snow) > lum(flat) + 40, `${lum(snow).toFixed(0)} vs ${lum(flat).toFixed(0)}`);
  const shallow = atlasShade({ ...base, kind: 'ocean', shore: 0 }, [0, 0, 0]);
  const deep = atlasShade({ ...base, kind: 'ocean', shore: Infinity }, [0, 0, 0]);
  check('B4 the sea deepens off its shelf, and is blue at both ends',
    lum(shallow) > lum(deep) + 20 && shallow[2] > shallow[0] && deep[2] > deep[0]);
  const off = atlasShade({ ...base, relief: false, elev: 0.95, sx: 0.002, sy: 0.002 }, [0, 0, 0]);
  check('B5 relief off = the biome tint at any height or slope',
    Math.max(Math.abs(off[0] - tint[0]), Math.abs(off[1] - tint[1]), Math.abs(off[2] - tint[2])) <= 1);
  const words = climateWords({ temperature: 0.1, moisture: 0.9 });
  check('B6 the climate bands speak their own words', words[0] === 'frigid' && words[1] === 'drowned', words.join(' '));
}

// --- RIG C: the mint fold ----------------------------------------------------------------
{
  const w: World = makeSimWorld('warrior', 0xa71a501);
  const seed = w.sim.biomeField.fieldSeed;
  check('C0 the sim installs the atlas seed beside the relief seed', atlasSeedInstalled() === seed);
  const town = ZONES[START_ZONE].map;
  const R = 5200;
  const feats = featuresInRect({ x: town.x - R, y: town.y - R }, { x: town.x + R, y: town.y + R }, seed);
  const dist = (f: MapFeature): number => Math.hypot(f.seat.x - town.x, f.seat.y - town.y);
  const byKind = (kind: string): MapFeature[] => feats.filter(f => f.kind === kind).sort((a, b) => dist(a) - dist(b));
  const nextId = (): number => (w as unknown as { nextGenId: number }).nextGenId++;
  const samplers = {
    biomeFor: (c: { x: number; y: number }) => w.sim.biomeField.sampleBiome(c),
    biomeDepthFor: (c: { x: number; y: number }) => w.sim.biomeField.sampleDepth(c),
    climateFor: (c: { x: number; y: number }, dim?: string) => climateAt(c, seed, dim ?? 'surface'),
    levelFor: (c: { x: number; y: number }) => w.sim.levelField.sampleLevel(c),
  };
  const mintAt = (seat: { x: number; y: number }, extra: Record<string, unknown>, genId = nextId()): ZoneDef =>
    placeZoneAt(seat, null, w.zoneMap, genId, {
      level: 3, seed: 0x5ea0be, noBackEdge: true, noWeave: true, fieldBiome: true, ...samplers, ...extra,
    } as never);

  // A summit: the id, the crag roll, the relief lift — and a sound load.
  const peak = byKind('peak')[0];
  check('C1 a summit stands within reach of the town\'s country', !!peak, peak ? `${peak.name} at ${dist(peak).toFixed(0)}u` : 'none within 5200u');
  if (peak) {
    const def = mintAt(peak.seat, {});
    const inh = mapFeatureKind('peak')!.inherit!;
    check('C2 a frontier mint under the summit bakes the feature id', !!def.geo?.features?.includes(peak.id), `${def.geo?.features?.join(',') ?? '—'}`);
    check('C3 … appends the summit\'s landmark roll', !!def.landmarks?.some(r => r.landmark === inh.landmarks![0].landmark));
    check('C4 … and bakes the relief lift', def.geo?.relief?.lift === inh.relief!.lift && def.geo?.relief?.dome === inh.relief!.dome,
      JSON.stringify(def.geo?.relief));
    w.zoneMap[def.id] = def;
    w.loadZone(def.id);
    check('C5 the summit zone loads sound through the real path', w.zone.id === def.id && w.doodads.length > 0, `${w.doodads.length} doodads`);
    // THE FRONTIER LAW: a DIRECTED mint at the same seat carries nothing.
    const directed = placeZoneAt(peak.seat, null, w.zoneMap, nextId(), {
      tileset: 'grassland', level: 3, seed: 0x5ea0be, noBackEdge: true, noWeave: true,
    } as never);
    check('C6 THE FRONTIER LAW — a directed mint at the seat inherits nothing',
      directed.geo?.features === undefined && directed.geo?.relief === undefined);
  }

  // A lode whose country grows harvest rows: the bounty stands at load.
  const lodes = byKind('lode').filter(f => harvestRowsFor(w.sim.biomeField.sampleBiome(f.seat)).length > 0);
  if (!lodes.length) {
    console.log('SKIP  C7 no lode within reach stands in a harvesting country (this seed) — bounty unproven here');
  } else {
    const lode = lodes[0];
    const def = mintAt(lode.seat, {});
    check('C7 a frontier mint on a lode bakes the feature id', !!def.geo?.features?.includes(lode.id));
    w.zoneMap[def.id] = def;
    w.loadZone(def.id);
    const nodes = w.doodads.filter(d => d.kind.startsWith('harvest_')).length;
    const bonus = mapFeatureKind('lode')!.inherit!.harvest!.bonus![0];
    check('C8 THE HARVEST BOUNTY — nodes ALWAYS stand on a lode, and more of them',
      nodes >= HARVEST_CFG.count[0] + bonus, `${nodes} nodes (floor ${HARVEST_CFG.count[0] + bonus}) in ${def.biome}`);
  }

  // A lake basin: the mere rolls.
  const lake = byKind('lake')[0];
  if (!lake) {
    console.log('SKIP  C9 no lake basin within reach of the town (this seed)');
  } else {
    const def = mintAt(lake.seat, {});
    const rolls = mapFeatureKind('lake')!.inherit!.landmarks!.map(r => r.landmark);
    check('C9 a frontier mint at a basin rolls the mere',
      !!def.geo?.features?.includes(lake.id) && rolls.every(l => def.landmarks?.some(r => r.landmark === l)), `${lake.name}`);
  }

  // THE BYTE-IDENTITY LAW: feature-less ground mints the same with or without the fabric.
  let bare: { x: number; y: number } | null = null;
  for (let r = 700; r <= 2400 && !bare; r += 140) {
    for (let k = 0; k < 12; k++) {
      const c = { x: town.x + Math.cos(k / 12 * Math.PI * 2) * r, y: town.y + Math.sin(k / 12 * Math.PI * 2) * r };
      if (w.sim.biomeField.sampleBiome(c) !== OCEAN_BIOME && featuresAt(c, seed).length === 0) { bare = c; break; }
    }
  }
  check('C10 bare ground exists near the town', !!bare);
  if (bare) {
    const gen = nextId();
    const a = mintAt(bare, {}, gen);
    setAtlasSeed(null);
    const b = mintAt(bare, {}, gen);
    setAtlasSeed(seed);
    check('C11 THE BYTE-IDENTITY LAW — a feature-less mint is identical with the fabric installed or not',
      JSON.stringify(a) === JSON.stringify(b) && a.geo?.features === undefined);
  }
}

// --- RIG D: the knowledge law ---------------------------------------------------------
{
  const w: World = makeSimWorld('warrior', 0xa71a509);
  const nextId = (): number => (w as unknown as { nextGenId: number }).nextGenId++;
  const town = ZONES[START_ZONE].map;
  // A directed mint far from anything walked: born veiled, unseen.
  const evt = placeZoneAt(w.pullToLand({ x: town.x + 2600, y: town.y + 1900 }), null, w.zoneMap, nextId(), {
    tileset: 'grassland', level: 4, seed: 0x5ea0c1, noBackEdge: true, noWeave: true,
  } as never);
  check('D1 THE KNOWLEDGE LAW — a directed mint is born veiled', evt.veiled === true);
  check('D2 … and stands unseen on the chart', !w.visible(evt));
  (evt.exits as { to: string; side: string }[]).push({ to: w.zone.id, side: 'n' });
  check('D3 a mint beside walked ground is seen at once (the one-ring preview, structural)', w.visible(evt));
  evt.exits.pop();
  check('D4 … and unseen again once nothing walked stands beside it', !w.visible(evt));
  evt.veiled = false; w.surveyed.add(evt.id);
  check('D5 a knowledge act lifts the veil for good', w.visible(evt));
  const known = placeZoneAt(w.pullToLand({ x: town.x - 2600, y: town.y + 1700 }), null, w.zoneMap, nextId(), {
    tileset: 'grassland', level: 4, seed: 0x5ea0c2, noBackEdge: true, noWeave: true, veiled: false,
  } as never);
  check('D6 `veiled: false` opts a mint out', known.veiled === undefined && w.visible(known));
  // THE KNOWLEDGE INVARIANT over a lived world: after the forechart has swept,
  // every MINTED zone the chart shows is walked, beside walked ground, or surveyed.
  w.loadZone(HUB_ZONE);
  for (let i = 0; i < 300; i++) w.update(0.25);
  const all = Object.values(w.zoneMap);
  const shown = all.filter(z => w.visible(z));
  const knownBy = (z: ZoneDef): boolean => w.visited.has(z.id) || w.surveyed.has(z.id)
    || z.exits.some(e => e.to !== '?' && w.visited.has(e.to));
  const leaks = shown.filter(z => !ZONES[z.id] && z.id !== evt.id && z.id !== known.id && !knownBy(z));
  check('D7 THE KNOWLEDGE INVARIANT — every shown minted zone is walked, beside walked ground, or surveyed',
    leaks.length === 0, `${shown.length} shown of ${all.length}; leaks: ${leaks.slice(0, 4).map(z => z.id).join(', ') || 'none'}`);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
