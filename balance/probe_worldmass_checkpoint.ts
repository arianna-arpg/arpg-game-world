import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { compactMass, hydrateMass, hydrateMassWorld, massCheckpointLand } from '../src/worldmass/checkpoint';

const undo=seedGlobalRandom(901743),world=makeSimWorld('warrior',901743);
try{
  world.startWorldMass(901743);const mass=world.massRuntime!;
  massCheckpointLand(901743,'expedition:901743');
  mass.state.claim('fallen','probe-checkpoint-consequence');
  let start=performance.now();const full=world.serializeWorldState(),fullMs=performance.now()-start;
  start=performance.now();const compact=world.serializeWorldState({massCheckpoint:true}),compactMs=performance.now()-start;
  assert.ok(compact.worldmass&&!('config'in compact.worldmass));
  const fullBytes=JSON.stringify(full).length,compactBytes=JSON.stringify(compact).length;
  assert.ok(fullBytes-compactBytes>1_000_000,'generated land is absent from the checkpoint');
  assert.deepEqual(JSON.parse(JSON.stringify(hydrateMassWorld(compact))),JSON.parse(JSON.stringify(full)),'all mutable world consequences survive hydration exactly');
  const poisoned=structuredClone(full.worldmass!);
  Object.defineProperty(poisoned.config,'toJSON',{value:()=>{throw Error('land was serialized');}});
  assert.doesNotThrow(()=>JSON.stringify(compactMass(poisoned)),'land is removed before serialization');
  const foreign=structuredClone(compact.worldmass);foreign.configHash='other-land';assert.throws(()=>hydrateMass(foreign));
  assert.throws(()=>compactMass({...full.worldmass!,configHash:'custom-land'}),'custom land cannot silently lose its definition');
  assert.equal(hydrateMass(full.worldmass!),full.worldmass,'portable saves keep their exact authored definition');
  const restored=makeSimWorld('warrior',901744),hydrated=hydrateMassWorld(compact);
  try{
    assert.ok(restored.adoptWorldState(hydrated));restored.startWorldMass(901743,hydrated.worldmass,{restoreOnly:true});
    await restored.massRuntime!.prepareResumeNeighborhood(restored,{isCurrent:()=>true});restored.massRuntime!.finishResume(restored);
    assert.ok(restored.massRuntime!.state.claimed('fallen','probe-checkpoint-consequence'));
    assert.equal(restored.massRuntime!.snapshot(restored).configHash,full.worldmass!.configHash);
  }finally{restored.massRuntime?.dispose();}
  console.log('PASS compact world checkpoint, exact consequences, cold restoration, land refusal and portable compatibility',JSON.stringify({fullBytes,compactBytes,fullMs,compactMs}));
}finally{world.massRuntime?.dispose();undo();}
