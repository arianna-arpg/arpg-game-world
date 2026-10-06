import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { bootPlacedOccSites, driveOccSites, type OccHost } from '../src/engine/occurrences';
import type { Doodad } from '../src/engine/levelgen';
import { address, moveAddress } from '../src/worldmass/address';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';
import { MassNativeHost, nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeResidency, type NativeFeatureHost, type NativeFeatureInstance, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { massOccurrenceSupported, type MassOccurrencesSave } from '../src/worldmass/occurrences';
import { canonical, massRandom } from '../src/worldmass/random';

const restore = seedGlobalRandom(89312);
try {
  const config = structuredClone(massAdventure()); delete config.nativeCountry; delete config.geography;
  const world = makeSimWorld('warrior', 89312), runtime = new WorldMassRuntime(99, 'occurrence-kernel', config);
  runtime.attach(world); world.time = 1000;
  const span = 960, frame = address('surface', runtime.origin.cx, runtime.origin.cy, 0, 0, span);
  const placement: NativeFeaturePlacement = { id: 'native-fracture-kernel', origin: moveAddress(frame, { x: 6000, y: 6000 }, span),
    request: { id: 'native-fracture-kernel', seed: 23, level: 5,
      source: { kind: 'massif', id: 'well_court', tileset: 'courtland', scope: 'landform', poolIndex: 1 } } };
  let budget = 7, foreignPopulation = 0, instance: NativeFeatureInstance | undefined;
  const host: MassNativeHost = new MassNativeHost(world, { population: () => host.population + foreignPopulation,
    maxPopulation: () => budget, zoneOwner: () => 'physical-zone', quietSeconds: 12, retainRadius: 512 });
  const observedHost: NativeFeatureHost = { get clock() { return world.time; },
    canInstall: (i, s) => { instance = i; return host.canInstall(i, s); }, install: (i, s) => host.install(i, s) };
  const residency = new MassNativeResidency({ run: 'occurrence-kernel', addressSpan: span,
    maxBlueprints: 2, maxResidents: 1, maxCandidates: 1 }, () => [], nativeWorldCapabilities(), () => frame);
  runtime.nativeFeatures = residency;
  const save = (): MassOccurrencesSave => (residency.snapshot(world.time).born[0].changes.native as { occurrences: MassOccurrencesSave }).occurrences;
  const scene = { actors: [...world.actors], doodads: [...world.doodads] };
  assert.ok(residency.sync([placement], observedHost).deferred.includes(placement.id));
  assert.deepEqual(world.actors, scene.actors); assert.deepEqual(world.doodads, scene.doodads);
  assert.equal(host.population, 0);
  budget = 8; assert.ok(residency.sync([placement], observedHost).admitted.includes(placement.id));
  assert.equal(host.population, 8); assert.ok(instance);
  assert.equal(instance.blueprint.descriptor.sidechannels!.occurrences.length, 1);
  const source = instance.blueprint.descriptor.sidechannels!.occurrences[0];
  const site = host.occurrences.views()[0]; world.player.pos = { ...site.pos };
  const initial = save(), actorsBefore = world.actors.length, doodadsBefore = world.doodads.length, xp = world.meta.xp;
  foreignPopulation = 1; host.updateOccurrences(60, [{ ...site.pos, tier: 0 }]);
  assert.deepEqual(save(), initial, 'an overfull shared cap cannot progress native bank, RNG, cues or spring');
  assert.equal(world.actors.length, actorsBefore); assert.equal(world.doodads.length, doodadsBefore);
  foreignPopulation = 0; world.player.tier = 1; host.updateOccurrences(60, [{ ...site.pos, tier: 1 }]);
  assert.deepEqual(save(), initial, 'a hero on another physical story cannot bank the surface occurrence');
  world.player.tier = 0;
  console.log('PASS real generated seed23 fracture: atomic maximum-wave reservation, defensive external-overfill freeze and same-story trigger admission');

  // Run the ordinary native driver independently with a recording host. Its
  // exact geometry/cues/wave requests are compared with the real World binding.
  const expected = bootPlacedOccSites(instance.zone.id, [{ ...source.site, x: site.pos.x, y: site.pos.y }], [source.definition]);
  let draws = 0, tagCount = 0, expectedShake = 0;
  const dress: Doodad[] = [], waves: { spec: unknown; at: { x: number; y: number }; band: [number, number]; count: number }[] = [];
  const announcements: string[] = [], flashes: { pos: { x: number; y: number }; radius: number; color: string; life: number; maxLife: number }[] = [];
  const draw = () => massRandom(placement.request.seed, [placement.id, 'native-occurrence/draw', draws++]);
  const recorder: OccHost = {
    timeOf: () => world.time, zoneLevel: () => instance!.zone.level,
    heroDist: (x, y) => Math.hypot(world.player.pos.x - x, world.player.pos.y - y), disturbedNear: () => false,
    dice: (lo, hi) => draw().range(lo, hi), diceInt: (lo, hi) => draw().int(lo, hi),
    plant: d => dress.push({ pos: { x: d.x, y: d.y }, radius: d.r, kind: d.kind,
      ...(d.rot === undefined ? {} : { rot: d.rot }), ...(d.fall ? { fall: true } : {}) }),
    pour: (spec, x, y, band, count) => { waves.push({ spec, at: { x, y }, band, count }); tagCount += count; return count; },
    tagCount: () => tagCount, announce: (_x, _y, text) => announcements.push(text),
    rumble: n => { expectedShake = Math.max(expectedShake, n); },
    flash: (x, y, radius, color) => flashes.push({ pos: { x, y }, radius, color, life: .5, maxLife: .5 }),
  };
  const actualText: string[] = [], nativeText = world.text.bind(world);
  world.text = (p, text, color, size, options) => { actualText.push(text); nativeText(p, text, color, size, options); };
  const beforeFlashes = world.flashes.length;
  const compare = () => {
    const actual = save(), e = expected[0];
    assert.deepEqual(actual.sites[0], { geographicZone: 'physical-zone', state: e.state, bank: e.bank,
      told: e.told, cracked: e.cracked, pourAt: e.pourAt, clockMark: e.clockMark });
    assert.equal(actual.draws, draws); assert.deepEqual(actual.decor, dress);
    assert.deepEqual(actual.births.map(b => ({ spec: b.request.spec, at: b.request.at, band: b.request.band, count: b.request.count })), waves);
    assert.deepEqual(actualText, [], 'local native scars, rumble and bodies show the event without explanatory text');
    assert.equal(world.shake, expectedShake);
    assert.deepEqual(world.flashes.slice(beforeFlashes), flashes);
    assert.equal(world.meta.xp, xp, 'native occurrences never grant an invented objective-completion award');
  };
  for (const dt of [13, .5, 15.5, 1, 20, 20]) {
    world.time += dt; driveOccSites(recorder, expected, dt); host.updateOccurrences(dt, []); compare();
  }
  assert.equal(save().sites[0].state, 'sprung');
  assert.deepEqual(announcements, [source.definition.telegraph!.text!, source.definition.spring.text!],
    'native source announcements remain frozen; suppressing local text is the explicit presentation override');
  assert.equal(save().births[0].bodies.length, waves[0].count);
  assert.ok(waves[0].count >= 5 && waves[0].count <= 8);
  console.log('PASS native driver bridge parity: exact telegraph threshold, scar geometry, visual cues, full wave, clocks, tag cap and no local explanatory text or objective XP');

  const unsupported = (edit: (copy: NativeFeatureInstance) => void) => {
    const copy: NativeFeatureInstance = { ...instance!, zone: structuredClone(instance!.zone),
      blueprint: { ...instance!.blueprint, descriptor: structuredClone(instance!.blueprint.descriptor) } };
    edit(copy); assert.equal(massOccurrenceSupported(copy), false);
  };
  unsupported(i => { i.blueprint.descriptor.sidechannels!.occurrences[0].definition.id = 'caldera_wake'; });
  unsupported(i => { i.blueprint.descriptor.sidechannels!.occurrences[0].definition.aftermath!.kind = 'rouseResident'; });
  unsupported(i => { i.blueprint.descriptor.sidechannels!.occurrences[0].definition.spring.dress![0].kind = 'ritual_circle'; });
  unsupported(i => { i.zone = { ...i.zone, theme: { ...i.zone.theme, pitfall: { kind: 'descend' } } }; });
  unsupported(i => { i.zone = { ...i.zone, spoils: 'none' }; });
  unsupported(i => { i.zone = { ...i.zone, bounty: 2 }; });
  unsupported(i => { i.zone = { ...i.zone, castSeal: {} }; });
  unsupported(i => { i.zone = { ...i.zone, quickened: { key: 'foreign', baseLevel: 1, until: world.time + 10 } }; });
  unsupported(i => { i.zone = { ...i.zone, objective: { kind: 'clear' } }; });
  const corrupt = structuredClone(save()); corrupt.births[0].request.zone = { ...corrupt.births[0].request.zone, level: corrupt.births[0].request.zone.level + 1 };
  assert.throws(() => host.occurrences.requiredPopulation(instance!, corrupt), /source changed/);
  const duplicate = structuredClone(save()); duplicate.births.push(structuredClone(duplicate.births[0]));
  assert.throws(() => host.occurrences.requiredPopulation(instance!, duplicate), /Invalid native occurrence birth/);
  assert.throws(() => bootPlacedOccSites('source', [source.site], []), /zip mismatch/);
  assert.throws(() => bootPlacedOccSites('source', [source.site], [{ ...source.definition, id: 'other' }]), /identity mismatch/);
  assert.ok(canonical(save()).includes('abyssal_fracture'));
  console.log('PASS whole-mechanism refusals for caldera/unknown aftermath/dress, vertical or unbound reward contexts, malformed source and duplicate birth receipts');
} finally { restore(); }
