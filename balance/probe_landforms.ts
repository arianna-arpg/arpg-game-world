import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { Rng } from '../src/core/rng';
import { featuresInRect, featuresAt, mapFeatureKind } from '../src/world/atlas';
import { localeProgram } from '../src/world/locales';
import { FeatureActivityField, featureCycle, featurePhase, registerFeatureCycle } from '../src/world/featureActivity';
import { dressPlanFor, rollDressPieces, WEATHER_DRESS_CFG } from '../src/engine/weatherDress';
import { mapViewport, mapZoomLimits, mapZoomLabel } from '../src/ui/mapViewport';
import { MAP_CFG } from '../src/ui/mapConfig';
import { placeZoneAt, type ZoneSpec } from '../src/engine/worldgen';
import type { ZoneDef } from '../src/data/zones';
import { eventFrontFor } from '../src/engine/eventWeather';
import type { OverlayView } from '../src/world/overlay';
import { escarpmentRoad } from '../src/world/escarpments';

const world = makeSimWorld('warrior', 0xa71a501);
const arenaZone = structuredClone(world.zone);
const seed = world.sim.biomeField.fieldSeed;
const kinds = ['pond', 'inland_lake', 'tarn', 'headwaters', 'ford', 'gorge', 'river_isles', 'valley', 'hills', 'canyon', 'volcano'];
const sites = featuresInRect({ x: -20000, y: -20000 }, { x: 20000, y: 20000 }, seed, kinds);
for (const kind of kinds) {
  const f = sites.find(f => f.kind === kind);
  assert.ok(f, `fixed-seed census must encounter ${kind}`);
  assert.deepEqual(featuresAt(f.seat, seed).find(h => h.feature.id === f.id)?.feature, f);
  assert.ok(featuresInRect(f.seat, f.seat, seed, [kind]).some(other => other.id === f.id));
  assert.ok(localeProgram(mapFeatureKind(kind)?.destination?.locale));
  const approach = [[-60, 0], [60, 0], [0, -60], [0, 60]].map(([x, y]) => ({ x: f.seat.x + x, y: f.seat.y + y }))
    .find(at => escarpmentRoad(at, f.seat, seed));
  assert.ok(approach, `${kind} has a lawful local approach`);
  const anchor = { ...structuredClone(arenaZone), id: `approach_${kind}`, map: approach, exits: [] };
  const map = { [anchor.id]: anchor };
  const spec: ZoneSpec = { fieldBiome: true, tileset: 'meadow', biomeFor: () => 'plains', level: 5, forceFrontiers: 2, linkBack: true };
  const zone = placeZoneAt(f.seat, anchor, map, 5, spec);
  assert.equal(zone.destination?.feature, f.id, `${kind} claims its own named destination`);
  assert.equal(zone.locale?.program, mapFeatureKind(kind)?.destination?.locale);
  if (['pond', 'inland_lake', 'tarn'].includes(kind)) {
    world.zoneMap[anchor.id] = anchor; world.zoneMap[zone.id] = zone; world.loadZone(zone.id);
    const walk = (world as unknown as { walk: { regionAt(x: number, y: number): string } }).walk;
    let water = 0;
    for (let y = 15; y < zone.size.h; y += 30) for (let x = 15; x < zone.size.w; x += 30) {
      if (walk.regionAt(x, y) === 'water') water++;
    }
    assert.ok(water > 80, `${kind} must contain actual water after real zone boot (found ${water})`);
  }
}
console.log('PASS all landform families are findable and claim appropriate, attributed destinations');

const volcano = sites.find(f => f.kind === 'volcano')!;
const cycle = featureCycle('volcanism')!;
const field = world.sim.overlayFor<FeatureActivityField>('feature_activity')!;
const period = cycle.phases.reduce((n, p) => n + p.seconds, 0);
const moments = new Map<string, number>();
for (let time = 0; time < period * 2; time++) {
  const s = featurePhase(volcano, seed, time, cycle);
  if (!moments.has(s.phase.id) && s.progress > 0.2 && s.progress < 0.8) moments.set(s.phase.id, time);
  assert.equal(featurePhase(volcano, seed, time + period, cycle).phase.id, s.phase.id);
}
assert.equal(moments.size, 4);
assert.throws(() => registerFeatureCycle({ id: 'invalid', phases: [{ ...cycle.phases[0], seconds: NaN }] }));
const zone: ZoneDef = { ...structuredClone(arenaZone), id: 'qa_active_landform', map: { ...volcano.seat },
  objective: { kind: 'clear' }, geo: undefined, kind: undefined, exits: [] };
assert.equal(field.sample(zone, moments.get('dormant'))?.kind, undefined);
assert.equal(field.sample(zone, moments.get('unrest'))?.kind, 'ashfall');
assert.equal(field.sample(zone, moments.get('erupting'))?.kind, 'volcanic_eruption');
assert.equal(field.sample(zone, moments.get('cooling'))?.kind, 'ashfall');
assert.equal(field.sample({ ...zone, kind: 'town' }, moments.get('erupting')), null);
assert.equal(field.sample({ ...zone, dimension: 'hell' }, moments.get('erupting')), null);
const plume = { ...zone, map: { x: zone.map.x + 320, y: zone.map.y } };
assert.equal(field.sample(plume, moments.get('erupting'))?.kind, 'ashfall');
field.update(0, { time: moments.get('erupting')! } as OverlayView);
const map = field.renderMap([zone]);
assert.ok(map.under.includes('<path') && map.under.includes('stroke-linecap'));
assert.deepEqual(field.renderMap([]), { under: '', over: '' }, 'unknown country has no activity paint');
const resumed = new FeatureActivityField(seed);
resumed.restore(JSON.parse(JSON.stringify(field.snapshot())));
assert.deepEqual(resumed.renderMap([zone]), map);
assert.deepEqual(resumed.sample(zone), field.sample(zone));
console.log('PASS recurring activity, ash footprint, sanctuary/dimension boundaries, knowledge mask, and resume');

const plan = dressPlanFor('volcanic_eruption')!;
const pieces = rollDressPieces(new Rng(37), plan, 1, { w: 2200, h: 2200 }, () => true);
assert.ok(pieces.length >= 8 && pieces.length <= WEATHER_DRESS_CFG.maxPieces);
assert.deepEqual(pieces, rollDressPieces(new Rng(37), plan, 1, { w: 2200, h: 2200 }, () => true));
assert.deepEqual(rollDressPieces(new Rng(37), plan, 1, { w: 2200, h: 2200 }, () => false), []);
for (let i = 1; i < 8; i++) assert.ok(Math.hypot(pieces[i].x - pieces[i - 1].x, pieces[i].y - pieces[i - 1].y) <= pieces[i].r + pieces[i - 1].r);

world.zoneMap[zone.id] = zone;
world.loadZone(zone.id);
world.time = moments.get('erupting')!;
assert.equal(eventFrontFor(world, world.zone)?.kind, 'volcanic_eruption');
// Exercise the production reconcile without advancing unrelated event clocks.
const live = world as unknown as { updateWeatherDress(dt: number): void };
live.updateWeatherDress(1.1);
const lava = world.doodads.filter(d => d.weatherDress === 'volcanic_eruption');
assert.ok(lava.length > 0, 'real zone receives hazardous lava');
assert.ok(lava.every(d => d.kind === 'lava' && !d.evap));
live.updateWeatherDress(1.1);
assert.equal(world.doodads.filter(d => d.weatherDress === 'volcanic_eruption').length, lava.length, 'standing eruption does not duplicate flows');
world.time = moments.get('dormant')!;
live.updateWeatherDress(1.1);
assert.ok(lava.every(d => d.evap), 'ending activity starts the shared cooling/cleanup path');
console.log('PASS deterministic connected lava trails, placement rejection, real weather pin, and cleanup reconcile');

const base = { minX: -260, minY: -260, w: 520, h: 520 };
const huge = { minX: -50000, minY: -25000, w: 100000, h: 50000 };
assert.equal(mapViewport(base, 1, { x: 0, y: 0 }).side, MAP_CFG.viewport.startSide);
assert.equal(mapViewport(huge, 1, { x: 1200, y: 900 }).side, MAP_CFG.viewport.startSide);
assert.ok(mapZoomLimits(huge).minZoom < 0.01);
assert.equal(mapZoomLabel(mapZoomLimits(huge).minZoom), '0.52%');
assert.equal(mapViewport(huge, 0, { x: 1e9, y: 1e9 }).side, 100000);
assert.equal(mapViewport(huge, 30, { x: 0, y: 0 }).zoom, 1);
assert.deepEqual(mapViewport(huge, 0, { x: 1e9, y: 1e9 }).pan, { x: 0, y: 0 });
console.log('PASS fixed 100% scale, expanding zoom-out range, reset scale, and square pan bounds');
