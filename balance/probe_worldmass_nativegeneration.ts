import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import '../src/worldmass/nativeBootstrap';
import { Rng } from '../src/core/rng';
import { PUZZLES, COURT_SHRINE_PRESET_PREFIX, type CourtShrineSpec } from '../src/data/puzzles';
import { recordMintedOccurrence, mintedOccurrencesOf } from '../src/engine/occurrences';
import { generateLayout } from '../src/engine/levelgen';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { resolveNativeFeature, compileNativeFeature, nativeFeatureAdmission } from '../src/worldmass/nativeFeatures';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { canonical } from '../src/worldmass/random';

const request = (seed: number) => ({ id: 'native-sidechannel-probe', seed,
  source: { kind: 'massif' as const, id: 'well_court', tileset: 'courtland', scope: 'landform' as const, poolIndex: 1 } });
const zone = structuredClone(resolveNativeFeature(request(23)).zone), key = COURT_SHRINE_PRESET_PREFIX + zone.id;
const priorSpec = PUZZLES[key], prior = { id: 'abyssal_fracture', x: 4, y: 5, floorR: 6 };
recordMintedOccurrence({}, zone.id, prior);
const oldRows = mintedOccurrencesOf(zone.id);
const sentinel: CourtShrineSpec = { kind: 'court_shrine', count: [4, 4], shrine: { x: 1, y: 2, ringR: 80, a0: 0, kind: 'refrain' } };
PUZZLES[key] = sentinel;
try {
  const captured = captureNativeGeneration(zone, () => {
    recordMintedOccurrence({}, zone.id, { id: 'abyssal_fracture', x: 13, y: 17, floorR: 100 });
    PUZZLES[key] = { ...sentinel, mintCtx: {}, reward: { table: 'songline_spoils', washFor: 20 } } as CourtShrineSpec;
    zone.puzzles = [{ id: key, chance: 1 }]; return 42;
  });
  assert.equal(captured.value, 42);
  assert.equal(captured.sidechannels.occurrences[0].definition.trigger.sec, 30);
  assert.equal(captured.sidechannels.occurrences[0].definition.spring?.wave?.count[1], 8);
  assert.equal(captured.sidechannels.occurrences[0].definition.aftermath?.pour?.cap, 6);
  assert.equal(captured.sidechannels.puzzles[0].spec.reward?.table, 'songline_spoils');
  assert.ok(Object.isFrozen(captured.sidechannels.occurrences[0].definition.trigger));
  assert.ok(!canonical(captured.sidechannels).includes('mintCtx'));
  assert.equal(mintedOccurrencesOf(zone.id), oldRows, 'finite scene bundle restored by identity');
  assert.equal(PUZZLES[key], sentinel, 'finite native preset restored by identity');
  const empty = captureNativeGeneration(zone, () => null);
  assert.deepEqual(empty.sidechannels, { occurrences: [], puzzles: [] }, 'same ID zero-row generation cannot inherit the previous pass');
  assert.equal(mintedOccurrencesOf(zone.id), oldRows);
  assert.throws(() => captureNativeGeneration(zone, () => { recordMintedOccurrence({}, zone.id, prior); throw Error('generation failed'); }), /generation failed/);
  assert.equal(mintedOccurrencesOf(zone.id), oldRows); assert.equal(PUZZLES[key], sentinel);
  console.log('PASS exact frozen native event/riddle definitions, zero-row regeneration, failure cleanup and unchanged finite scene registries');

  const compile = (seed: number) => {
    const z = structuredClone(resolveNativeFeature(request(seed)).zone);
    return captureNativeGeneration(z, () => generateLayout(z, z.size, new Rng(seed), { x: 915, y: 105 }, []));
  };
  const occurrence = compile(23);
  assert.ok(occurrence.sidechannels.occurrences.some(r => r.site.id === 'abyssal_fracture'));
  const shrine = compile(2);
  assert.equal(shrine.sidechannels.puzzles.length, 1);
  assert.equal(shrine.sidechannels.puzzles[0].spec.kind, 'court_shrine');
  assert.ok((shrine.sidechannels.puzzles[0].spec as CourtShrineSpec).shrine.ringR > 0);
  assert.equal(canonical(compile(2).sidechannels), canonical(shrine.sidechannels));
  const eventDescriptor = resolveNativeFeature(request(23));
  assert.ok(eventDescriptor.sidechannels!.occurrences.some(row => row.site.id === 'abyssal_fracture'));
  const admission = nativeFeatureAdmission(compileNativeFeature(eventDescriptor), nativeWorldCapabilities());
  assert.equal(admission.ok, false, 'a visible court cannot silently lose its native hidden event');
  assert.ok(admission.missing.includes('occurrences'));
  assert.ok(admission.missing.includes('occurrence:abyssal_fracture'));
  console.log('PASS real native court tenant event and fitted shrine generation survive isolated capture reproducibly');
  const isolated = (normal: boolean) => {
    const script = `${normal ? "import { makeSimWorld } from './src/sim/arena.ts';makeSimWorld('warrior',2917);" : "import './src/worldmass/nativeBootstrap.ts';"}
      import {resolveNativeFeature,nativeFeatureSourceIdentity} from './src/worldmass/nativeFeatures.ts';
      import {prepareNativeFeature,validateNativePreparation} from './src/worldmass/nativePreparation.ts';
      const result=[2,23].map(seed=>{const request={id:'registry-parity/'+seed,seed,source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1}};
        const direct=resolveNativeFeature(request),prepared=prepareNativeFeature({protocol:1,token:1,request,identity:nativeFeatureSourceIdentity(request),maxBytes:2097152}).preparation;
        const compiled=validateNativePreparation(request,prepared);if(!compiled)throw Error('native prepare refused');
        return {hash:direct.hash,prepared:compiled.descriptor.hash,channels:direct.sidechannels,requirements:direct.requirements};});
      console.log('NATIVE_PARITY:'+JSON.stringify(result));`;
    const run = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const line = run.stdout.split(/\r?\n/).find(line => line.startsWith('NATIVE_PARITY:'));
    assert.ok(line); return JSON.parse(line.slice('NATIVE_PARITY:'.length)) as { hash: string; prepared: string; channels: unknown }[];
  };
  const worker = isolated(false), normal = isolated(true);
  assert.deepEqual(worker, normal, 'isolated worker registration and normal World registration produce identical native mechanisms');
  assert.ok(worker.every(row => row.hash === row.prepared));
  console.log('PASS isolated compiler bootstrap versus ordinary World registries and actual preparation validation retain exact native event/shrine hashes');
} finally {
  if (priorSpec) PUZZLES[key] = priorSpec; else delete PUZZLES[key];
}
