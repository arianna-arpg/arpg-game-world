import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {MassHierarchy} from '../src/worldmass/hierarchy';
import {canonical} from '../src/worldmass/random';

const restore=seedGlobalRandom(901743),world=makeSimWorld('warrior',901743);world.startWorldMass(901743);
try{
 const mass=world.massRuntime!,h=mass.geography!.hierarchy;
 const at=mass.walk.at(world.player.pos.x,world.player.pos.y),unborn=h.at(at).zone;
 assert.equal(h.at(at).zone,unborn,'unborn immutable geography retains bounded-cache identity');
 const input=structuredClone(unborn),nativeName=input.native!.zone.name;
 const def={source:'original',nested:{value:1}},state={counter:0,nested:{value:1}};
 h.enroll(input,'identity-probe','probe/native-owner',def,state,world.time);
 input.bounds.minX='-999999';input.native!.zone.name='caller changed';def.nested.value=99;state.nested.value=99;
 const owned=h.owner(unborn.id)!;assert.equal(owned.native!.zone.name,nativeName);assert.equal(owned.bounds.minX,unborn.bounds.minX);
 const parse=JSON.parse,identities=new Set<object>();let copies=0;
 JSON.parse=((...args:Parameters<typeof JSON.parse>)=>{copies++;return parse(...args);}) as typeof JSON.parse;
 const begin=performance.now();
 try{for(let i=0;i<200;i++){identities.add(h.owner(owned.id)!);identities.add(h.at(owned.center).zone);identities.add(h.intersections('zone',owned.bounds)[0]);}}
 finally{JSON.parse=parse;}
 const ms=performance.now()-begin;console.log(JSON.stringify({reads:600,uniqueOwnerObjects:identities.size,jsonCopies:copies,diagnosticMs:ms,nativeSource:owned.native!.id,ownerBytes:canonical(owned).length}));
 if(process.argv.includes('--observe-before')){assert.equal(identities.size,600);assert.equal(copies,600);console.log('PASS before-fix real native owner allocates/copies the full source600times');}
 else{
  assert.equal(identities.size,1);assert.equal(copies,0,'repeated owner reads must not copy the source');
  assert.equal(h.owner(owned.id),owned);assert.ok(Object.isFrozen(owned)&&Object.isFrozen(owned.bounds)&&Object.isFrozen(owned.native!.zone.theme));
  assert.equal(Reflect.set(owned.bounds,'minX','-1'),false);assert.equal(Reflect.set(owned.native!.zone,'name','mutation'),false);
  const first=h.controller(owned.id,'identity-probe')!;assert.equal((first.state as typeof state).nested.value,1);assert.equal((first.definition as typeof def).nested.value,1);
  assert.notEqual(h.controller(owned.id,first.id),first,'controller copy-on-read remains unchanged');
  assert.equal(Reflect.set((first.state as typeof state).nested,'value',999),false);
  const next={counter:1,nested:{value:3}};assert.ok(h.update(owned.id,first.id,first.revision,world.time,next,'active'));next.nested.value=999;
  assert.equal(h.owner(owned.id),owned);assert.equal(h.at(owned.center).zone,owned);assert.equal((h.controller(owned.id,first.id)!.state as typeof state).nested.value,3);
  const pristine=h.snapshot(),snapshot=h.snapshot(),row=snapshot.owners.find(r=>r.owner.id===owned.id)!;
  row.owner.native!.zone.name='snapshot caller changed';(row.controllers.find(c=>c.id===first.id)!.state as typeof state).nested.value=777;
  assert.equal(owned.native!.zone.name,nativeName);assert.equal((h.controller(owned.id,first.id)!.state as typeof state).nested.value,3);
  const newerSources=structuredClone(h.sources);for(const source of newerSources)source.zone.name='new live source';
  const savedInput=structuredClone(pristine),continued=new MassHierarchy(h.run,h.seed,h.addressSpan,h.policy,newerSources,savedInput);
  const resumed=continued.owner(owned.id)!;assert.equal(resumed.native!.zone.name,nativeName,'saved source wins over changed live source');assert.deepEqual(continued.snapshot(),pristine);
  savedInput.owners.find(r=>r.owner.id===owned.id)!.owner.native!.zone.name='saved input changed';savedInput.sources.forEach(s=>s.zone.name='saved source changed');
  assert.equal(resumed.native!.zone.name,nativeName);assert.equal(continued.at(resumed.center).zone,resumed);assert.equal(continued.intersections('zone',resumed.bounds)[0],resumed);
  assert.ok(Object.isFrozen(resumed.native!.zone.theme));assert.equal(Reflect.set(resumed.center,'x',9),false);
  assert.equal(continued.owner('missing'),undefined);
  console.log('PASS real owner zero-copy identity, deep immutable data, caller/snapshot isolation, mutable controller progress, source-old JSON Continue and original source fidelity');
 }
}finally{world.massRuntime?.dispose();restore();}
