import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { SIDEZONES, sidezoneOf } from '../src/data/sidezones';
import { CAVE_FACE_IDS, TILESETS } from '../src/data/tilesets';
import { generateLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { resolveNativeFeature } from '../src/worldmass/nativeFeatures';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { address, localOffset } from '../src/worldmass/address';
import { massSideareaId, type MassSideareaRoot } from '../src/worldmass/sideareas';
import { canonical, massDigest } from '../src/worldmass/random';
import { captureNativeGeneration, nativeGenerationRequirements } from '../src/worldmass/nativeGeneration';
import { compileNativeCaveStratum, missingNativeCaveConsumers, NATIVE_CAVE_SCENE_DEPENDENCIES,
  resolveNativeCaveStratum, type NativeCaveStratumRequest } from '../src/worldmass/caveStratum';

const undo = seedGlobalRandom(376429);
try {
  const world = makeSimWorld('warrior', 376429);
  world.startWorldMass(42);
  const surface = world.massRuntime!, walk = world.walk, zone = world.zone, player = world.player;
  const before = canonical(surface.snapshot(world));
  const rock = resolveNativeFeature({ id: 'stratum-proof/real-tor', seed: 43, rockEntrance: true,
    source: { kind: 'massif', id: 'tor', tileset: 'downs', scope: 'landform', variant: 'the grey tors', poolIndex: 0 } });
  const mouth = rock.entrances.find(e => e.kind === 'cave_entrance');
  assert.ok(mouth?.rockBacked, 'fixture begins at a real generated rock mouth');
  const parent = structuredClone(rock.zone), run = surface.generator.run.runId, owner = rock.id + '/' + mouth.id;
  const root: MassSideareaRoot = { id: massSideareaId(run,owner,mouth.kind,mouth.seed), owner, kind: mouth.kind,
    seed: mouth.seed, parent, at: address('surface', '9007199254740993', '-9007199254740993', 951, 7, 960) };
  const request: NativeCaveStratumRequest = { run, root, addressSpan: 960, playerLevel: world.player.level,
    activePackages: [], bodyRadius: world.player.radius };
  const descriptor = resolveNativeCaveStratum(request), cave = compileNativeCaveStratum(descriptor);
  assert.ok(Object.isFrozen(descriptor) && Object.isFrozen(descriptor.zone.theme));
  assert.equal(canonical(resolveNativeCaveStratum(request)), canonical(descriptor), 'native cave compile is deterministic');
  assert.equal(world.massRuntime, surface); assert.equal(world.walk, walk); assert.equal(world.zone, zone); assert.equal(world.player, player);
  assert.equal(canonical(surface.snapshot(world)), before, 'native compiler never installs a shadow World or changes the surface');

  const nativeZone = sidezoneOf('cave_entrance')!.mint({ parent: structuredClone(parent), seed: mouth.seed, id: root.id,
    pos: { x: root.at.x, y: root.at.y }, playerLevel: request.playerLevel, pkgActive: () => false });
  const nativeArena = { ...nativeZone.size, shape: nativeZone.shape!,
    ...(nativeZone.annexes?.length ? { pieces: nativeZone.annexes.map(p => ({ ...p, active: false })) } : {}) };
  const captured = captureNativeGeneration(nativeZone, () => generateLayout(nativeZone, nativeArena,
    new Rng(nativeZone.seed!), descriptor.geometry.entry, [descriptor.geometry.exit]));
  const native = captured.value;
  const { walk: nativeWalk, ...nativeData } = native;
  assert.equal(canonical(descriptor.zone), canonical(nativeZone), 'full native cave source retained, including clear objective, packs and secrets');
  assert.equal(canonical(descriptor.geometry.layout), canonical(JSON.parse(JSON.stringify(nativeData))));
  assert.equal(canonical(cave.grid!.pack()), canonical((nativeWalk as GridWalkField).pack()));
  assert.equal(canonical(descriptor.sidechannels), canonical(captured.sidechannels), 'full native event/riddle side channels retained');
  assert.ok(Object.isFrozen(descriptor.sidechannels));
  for (const requirement of nativeGenerationRequirements(descriptor.sidechannels)) assert.ok(descriptor.requirements.includes(requirement));
  assert.equal(descriptor.zone.objective.kind, 'clear'); assert.ok(Object.keys(descriptor.zone.packs ?? {}).length);
  assert.equal(descriptor.source.packIdentityFace, CAVE_FACE_IDS.find(id => TILESETS[id].packs === nativeZone.packs) ?? null,
    'native pack reference provenance is recorded before immutable JSON loses object identity');
  console.log('PASS real rock-mouth source, exact native cave mint/layout/grid equivalence and untouched active surface runtime');

  const door = cave.addressOf(descriptor.geometry.exit), arrival = cave.addressOf(descriptor.geometry.entry);
  assert.deepEqual(door.at, root.at, 'return opening has exactly the original physical doorway coordinate');
  assert.equal(door.owner, root.id);
  assert.deepEqual(cave.localOf(door), descriptor.geometry.exit);
  assert.deepEqual(cave.localOf(arrival), descriptor.geometry.entry);
  assert.ok(Math.abs(Math.hypot(...Object.values(localOffset(arrival.at, door.at, 960))) - 120) < 1e-8);
  assert.equal(descriptor.corridor.length, 120);
  assert.ok(descriptor.corridor.samples >= 21);
  assert.ok(descriptor.corridor.clear, 'this real native fixture must have a body-clear arrival corridor');
  assert.throws(() => cave.localOf({ ...door, owner: 'different-cave' }), /Foreign cave stratum/);
  console.log('PASS huge signed physical addresses, exact doorway/arrival roundtrips and body-swept native entry corridor');

  const missing = missingNativeCaveConsumers(descriptor, nativeWorldCapabilities());
  for (const dependency of NATIVE_CAVE_SCENE_DEPENDENCIES) assert.ok(missing.includes(dependency));
  assert.ok(missing.includes('scene:objective:clear') && missing.includes('scene:native-population'));
  for (const [key, capability] of [['hollows','hollows'],['annexes','annexes'],['tracks','tracks'],['trapworks','trapworks']] as const)
    if (cave.layout[key]?.length) assert.ok(descriptor.requirements.includes(capability));
  assert.equal(typeof (cave as unknown as { install?: unknown }).install, 'undefined', 'compiler cannot pretend scene admission');
  console.log('PASS native clear/population/loot/walk/visibility/memory remain explicit unbound consumers; no metadata stripping or claimed admission');

  for (const [seed, refusal] of [[42, 'native-convex-cave-walk-unbound'], [44, 'native-arrival-corridor-not-body-clear']] as const) {
    const otherRock = resolveNativeFeature({ ...{ id: rock.id, rockEntrance: true, source: rock.source }, seed });
    const otherMouth = otherRock.entrances.find(e => e.kind === 'cave_entrance')!;
    const otherOwner = otherRock.id + '/' + otherMouth.id;
    const other = resolveNativeCaveStratum({ ...request, root: { ...root, owner: otherOwner, parent: structuredClone(otherRock.zone),
      seed: otherMouth.seed, id: massSideareaId(run, otherOwner, otherMouth.kind, otherMouth.seed) } });
    assert.ok(other.unsupported.includes(refusal), 'actual native source must refuse instead of carving a replacement corridor');
    assert.equal(other.zone.objective.kind, 'clear');
    assert.deepEqual(compileNativeCaveStratum(JSON.parse(JSON.stringify(other))).descriptor.unsupported, other.unsupported);
  }
  console.log('PASS actual convex cave and blocked native arrival remain attributable refusals; no synthetic floor or corridor');

  const saved = JSON.parse(JSON.stringify(descriptor)), originalMint = SIDEZONES.cave_entrance.mint;
  const tileset = TILESETS[descriptor.zone.tileset!], originalLayout = tileset.layout;
  try {
    SIDEZONES.cave_entrance.mint = () => { throw Error('changed registry must not be consulted'); };
    tileset.layout = [];
    const restored = compileNativeCaveStratum(saved);
    assert.equal(canonical(restored.grid!.pack()), canonical(cave.grid!.pack()));
    assert.equal(canonical(restored.layout.doodads), canonical(cave.layout.doodads));
    assert.deepEqual(restored.addressOf(descriptor.geometry.exit), door);
    assert.deepEqual(restored.descriptor.sidechannels, descriptor.sidechannels);
  } finally { SIDEZONES.cave_entrance.mint = originalMint; tileset.layout = originalLayout; }
  cave.grid!.fillRegion(0, 0, 30, 30, 'water');
  cave.layout.doodads[0].gone = true;
  assert.equal(canonical(compileNativeCaveStratum(saved).grid!.pack()), canonical(descriptor.geometry.grid));
  assert.equal(compileNativeCaveStratum(saved).layout.doodads[0].gone, descriptor.geometry.layout.doodads[0].gone);
  const bad = structuredClone(saved); bad.geometry.entry.x += 30;
  assert.throws(() => compileNativeCaveStratum(bad), /identity mismatch/);
  const badOwner = structuredClone(saved); badOwner.root.owner = 'foreign';
  const { hash: _hash, ...badBody } = badOwner; badOwner.hash = massDigest(badBody);
  assert.throws(() => compileNativeCaveStratum(badOwner), /ownership/);
  const missingChannels = structuredClone(saved); delete missingChannels.sidechannels;
  const { hash: _channelHash, ...missingBody } = missingChannels; missingChannels.hash = massDigest(missingBody);
  assert.throws(() => compileNativeCaveStratum(missingChannels), /side channels/);
  assert.throws(() => resolveNativeCaveStratum({ ...request, root: { ...root, kind: 'cellar_hatch',
    id: massSideareaId(run,owner,'cellar_hatch',root.seed) } }), /classic rock mouth/);
  console.log('PASS frozen cave geometry after registry changes, independent native copies, malformed ownership and unsupported-mouth refusal');
} finally { undo(); }
