import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { localePrograms, compileLocale, validateLocaleProgram, localeProgram } from '../src/world/locales';
import { generateLayout, hasDoodadRule } from '../src/engine/levelgen';
import { hasDistrictBuilder } from '../src/engine/localeGen';
import { Rng } from '../src/core/rng';
import { regionKind } from '../src/world/regions';
import { featuresAt, featuresInRect, mapFeatureKind, registerMapFeature } from '../src/world/atlas';
import { riverPathsInRect } from '../src/world/relief';
import { placeZoneAt, settleWeb, type ZoneSpec } from '../src/engine/worldgen';
import { serializeZone, applyZone } from '../src/net/snapshot';
import { sanitizeWorldZones } from '../src/meta/worldstate';
import type { ZoneDef } from '../src/data/zones';

const world = makeSimWorld('warrior', 0xa71a501);
const theme = world.zone.theme;
assert.throws(() => registerMapFeature({ ...mapFeatureKind('river_citadel')!, id: 'qa_invalid_locale',
  find: { kind: 'river-sites', minRun: 1, progress: [0.2, 0.8], chance: 1, salt: 1 } }), /invalid river-sites/);
const shapes = new Set<string>();
for (const program of localePrograms()) {
  assert.deepEqual(validateLocaleProgram(program, { builder: hasDistrictBuilder, doodad: hasDoodadRule,
    region: id => !!regionKind(id), walkable: id => !!regionKind(id)?.walkable }), []);
  const invalid = structuredClone(program);
  invalid.variants[0].links = [];
  assert.ok(validateLocaleProgram(invalid).some(e => e.includes('disconnected')));
  const unknown = structuredClone(program);
  unknown.variants[0].districts[0].builder = 'missing';
  assert.ok(validateLocaleProgram(unknown, { builder: hasDistrictBuilder }).some(e => e.includes('unknown builder')));
  for (const variant of program.variants) for (const seed of [17, 3000026, 90011, 81933]) {
    const locale = compileLocale(program, seed, variant.id);
    assert.deepEqual(compileLocale(program, seed, variant.id), locale);
    for (const riverSides of (locale.river ? [['w', 'e'], ['n', 's']] : [['w', 'e']])) {
      const def: ZoneDef = { id: 'qa_locale', name: program.label, level: 5, size: program.size,
        theme, locale, layoutType: 'districts', layoutParams: { riverSides }, layout: [],
        seed, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 } };
      const entry = { x: 120, y: def.size.h / 2 }, exits = [{ x: def.size.w - 120, y: def.size.h / 2 }, { x: def.size.w / 2, y: 120 }];
      const generated = generateLayout(def, def.size, new Rng(seed), entry, exits);
      const grid = generated.walk!;
      assert.ok(generated.localeReport);
      for (const p of [...exits, ...generated.localeReport!.districts.map(d => d.center)]) assert.ok(grid.reachable!(entry, p), `${program.id}/${variant.id}: required destination reachable after all final passes`);
      const caves = generated.doodads.filter(d => d.kind === 'cave_entrance');
      assert.equal(caves.length, locale.districts.filter(d => d.cave).length);
      assert.equal(caves.length, generated.caveSeeds.length);
      for (const cave of caves) assert.ok(grid.reachable!(entry, cave.pos));
      if (locale.river) assert.ok(generated.localeReport!.crossings.length > 0, 'routes cross the actual water');
      if (locale.river) assert.ok(generated.localeReport!.crossings.some(p => grid.regionAt!(p.x, p.y) === locale.river!.crossing), 'crossing terrain survives final passes');
      let water = 0;
      const mask: string[] = [];
      for (let y = 15; y < def.size.h; y += 30) for (let x = 15; x < def.size.w; x += 30) {
        const kind = grid.regionAt!(x, y); mask.push(kind);
        if (kind === locale.river?.region) water++;
      }
      if (locale.river) assert.ok(water > 40, 'river remains actual water outside the crossings');
      shapes.add(mask.join(','));
      const replay = generateLayout(JSON.parse(JSON.stringify(def)), def.size, new Rng(seed), entry, exits);
      assert.deepEqual(replay.localeReport, generated.localeReport);
      assert.deepEqual(replay.doodads, generated.doodads);
    }
  }
}
assert.equal(shapes.size, localePrograms().flatMap(p => p.variants).reduce((n, v) => n + (v.river ? 8 : 4), 0), 'different route graphs, orientations and seeds produce different terrain');
console.log('PASS locale programs validate, diversify geometry, preserve waterways and replay reachable routes and caves');

const fieldSeed = world.sim.biomeField.fieldSeed, origin = world.zone.map;
const min = { x: origin.x - 40000, y: origin.y - 40000 }, max = { x: origin.x + 40000, y: origin.y + 40000 };
const sites = featuresInRect(min, max).filter(f => mapFeatureKind(f.kind)?.destination);
assert.ok(sites.some(f => f.kind === 'river_citadel') && sites.some(f => f.kind === 'river_arches'), 'fixed seed must exercise both site families');
const site = sites.find(f => f.kind === 'river_citadel')!;
assert.ok(riverPathsInRect(site.seat, site.seat, fieldSeed).some(path => path.some(p => Math.hypot(p.x - site.seat.x, p.y - site.seat.y) < 1)), 'atlas destination stands on the drawn river');
for (const f of sites.slice(0, 12)) {
  assert.deepEqual(featuresAt(f.seat).find(h => h.feature.id === f.id)?.feature, f, 'mint and chart find the same full feature');
  assert.ok(featuresInRect(f.seat, f.seat).some(other => other.id === f.id), 'query window does not move or lose a site');
}
const anchor = (id: string, dx: number, dy: number): ZoneDef => ({ ...structuredClone(world.zone), id, objective: { kind: 'clear' },
  map: { x: site.seat.x + dx, y: site.seat.y + dy }, exits: [], veiled: true });
const a = anchor('qa_approach_a', -350, 0), b = anchor('qa_approach_b', 0, 350);
const map = { [a.id]: a, [b.id]: b };
const spec: ZoneSpec = { fieldBiome: true, tileset: 'meadow', biomeFor: () => 'plains', level: 5, forceFrontiers: 2, linkBack: true };
const def = placeZoneAt({ x: site.seat.x + 15, y: site.seat.y }, a, map, 91, spec);
map[def.id] = def;
assert.equal(def.destination?.feature, site.id);
assert.deepEqual(def.map, site.seat);
assert.equal(def.name, site.name);
assert.deepEqual(def.layoutParams?.riverSides, site.riverSides);
assert.equal(def.veiled, true);
const plan = structuredClone(def.locale);
const fromOther = placeZoneAt({ x: site.seat.x, y: site.seat.y + 15 }, b, map, 92, spec);
assert.equal(fromOther, def, 'second approach returns the same object and node');
assert.ok(def.exits.some(e => e.to === a.id) && def.exits.some(e => e.to === b.id));
assert.ok(b.exits.some(e => e.to === def.id));
assert.ok(!def.exits.some(e => e.to === def.id));
const count = def.exits.length;
placeZoneAt(site.seat, b, map, 93, spec);
assert.equal(def.exits.length, count, 'repeat approach does not duplicate roads');
assert.deepEqual(def.locale, plan);
settleWeb(map, null, { around: def.map });
assert.deepEqual(def.map, site.seat, 'settling cannot move a landmark off its atlas seat');
const next = placeZoneAt(site.seat, def, map, 94, { ...spec, linkBack: false });
map[next.id] = next;
assert.notEqual(next.id, def.id, 'leaving a landmark cannot lead back into itself');
assert.equal(placeZoneAt(site.seat, a, structuredClone(map), 95, { ...spec, linkBack: false, fieldBiome: false }).destination, undefined);
assert.equal(placeZoneAt(site.seat, a, structuredClone(map), 96, { ...spec, linkBack: false, layoutType: 'plains' }).destination, undefined);
assert.equal(placeZoneAt(site.seat, a, structuredClone(map), 97, { ...spec, linkBack: false, dimension: 'hell' }).destination, undefined);
console.log('PASS real atlas rivers create stable destinations, distinct approaches reconnect, directed mints stay explicit');

// The real exploration chokepoint must honor a destination before ordinary
// nearest-node/expanse consolidation, and must not re-chart an existing site.
const realA = anchor('qa_real_a', -86, 0), realB = anchor('qa_real_b', 0, 78);
realA.exits = [{ to: '?', side: 'e', tileset: 'meadow' }];
realB.exits = [{ to: '?', side: 'n', tileset: 'meadow' }];
world.zoneMap[realA.id] = realA;
world.zoneMap[realB.id] = realB;
const chart = world as unknown as { chartFrontier(source: ZoneDef, exit: ZoneDef['exits'][number]): ZoneDef; caveEntrances: unknown[] };
const real = chart.chartFrontier(realA, realA.exits[0]);
realA.exits[0].to = real.id;
assert.equal(real.destination?.feature, site.id, 'real exploration reaches the atlas feature');
real.veiled = false;
const again = chart.chartFrontier(realB, realB.exits[0]);
realB.exits[0].to = again.id;
assert.equal(again, real);
assert.equal(again.veiled, false, 'a later approach cannot hide an already discovered destination');
world.loadZone(real.id, realA.id);
assert.ok(chart.caveEntrances.length > 0, 'the promised grotto is a real explorable entrance');
console.log('PASS real frontier travel prioritizes destinations and preserves discovery on reconnect');

Object.assign(world.zoneMap, map);
world.loadZone(def.id);
assert.equal(world.zone.id, def.id);
const packet = serializeZone(world), client = makeSimWorld('warrior', 0x8a7);
applyZone(client, packet);
assert.deepEqual(client.zone.locale, plan);
assert.deepEqual(client.zone.destination, def.destination);
assert.notEqual(client.zone.locale, packet.locale);
const state = JSON.parse(JSON.stringify(world.serializeWorldState()));
const saved = sanitizeWorldZones(state.zones, new Set())!;
assert.deepEqual(saved[def.id].locale, plan);
assert.deepEqual(saved[def.id].destination, def.destination);
const program = localeProgram(def.destination!.program)!;
const old = program.variants[0].districts[0].at[0];
try {
  program.variants[0].districts[0].at[0] += 0.01;
  world.loadZone(def.id);
  assert.deepEqual(world.zone.locale, plan, 'existing layout stays baked after registry edits');
} finally { program.variants[0].districts[0].at[0] = old; }
delete packet.locale; delete packet.destination;
applyZone(client, packet);
assert.equal(client.zone.locale, undefined);
assert.equal(client.zone.destination, undefined);
console.log('PASS real zone boot, saved plans, co-op isolation and legacy message clearing');
