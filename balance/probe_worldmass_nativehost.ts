import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address,moveAddress,type MassAddress } from '../src/worldmass/address';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';
import { MassNativeHost,nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeResidency,type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { resolveNativeFeature,compileNativeFeature,nativeFeatureAdmission } from '../src/worldmass/nativeFeatures';
import { canonical } from '../src/worldmass/random';
import { doodadRuleOf,type Doodad } from '../src/engine/levelgen';
import { serializeCharacter,applySavedCharacter } from '../src/meta/character';
import type { Actor } from '../src/engine/actor';

const restore=seedGlobalRandom(83811);
try{
  const config=structuredClone(massAdventure());delete config.nativeCountry;delete config.geography;
  const w=makeSimWorld('warrior',83811),runtime=new WorldMassRuntime(42,'native-host-test',config);runtime.attach(w);
  w.player.pos={x:-20000,y:-20000};w.time=1000;
  const span=960,frame=address('surface',runtime.origin.cx,runtime.origin.cy,0,0,span);
  const first:NativeFeaturePlacement={id:'native-dungeon',origin:moveAddress(frame,{x:6000,y:6000},span),
    request:{id:'native-dungeon',seed:42,source:{kind:'structure',id:'dungeon_block',tileset:'grassland'},level:3}};
  const descriptor=resolveNativeFeature(first.request),feature=compileNativeFeature(descriptor);
  assert.deepEqual(nativeFeatureAdmission(feature,nativeWorldCapabilities()),{ok:true,missing:[],unsupported:[]});
  assert.ok(feature.layout.garrisons.length&&feature.layout.breakables.length&&feature.layout.doodads.some(d=>d.door&&['breakable','both'].includes(d.door.mode)));
  const provider=(at:MassAddress)=>{
    const x=Number(BigInt(at.cx)-BigInt(first.origin.cx))*span+at.x-first.origin.x;
    const y=Number(BigInt(at.cy)-BigInt(first.origin.cy))*span+at.y-first.origin.y;
    return x>=-120&&y>=-120&&x<=1920&&y<=1920?[first]:[];
  };
  const spec={run:'native-host-test',addressSpan:span,maxBlueprints:4,maxResidents:1,maxCandidates:2};
  const residency=new MassNativeResidency(spec,provider,nativeWorldCapabilities(),()=>frame);runtime.nativeFeatures=residency;
  let budget=1;
  const host:MassNativeHost=new MassNativeHost(w,{population:()=>host.population,maxPopulation:()=>budget,quietSeconds:12});
  const oldActors=w.actors.slice(),oldPieces=w.doodads.slice();
  assert.ok(residency.sync([first],host).deferred.includes(first.id));
  assert.deepEqual(w.actors,oldActors);assert.deepEqual(w.doodads,oldPieces);assert.equal(host.population,0);
  budget=128;assert.ok(residency.sync([first],host).admitted.includes(first.id));
  const own=w.actors.filter(a=>!oldActors.includes(a));assert.ok(own.length>4);assert.equal(host.population,own.length);
  assert.ok(own.some(a=>a.faction==='undead'&&a.squadId!==undefined),'native faction roster/group comes from actual source');
  assert.ok(own.some(a=>a.defId==='barrel'||a.defId==='crate'));assert.ok(own.some(a=>a.doorId));
  const door=w.doodads.find(d=>d.door?.id.startsWith(first.id+'::'))!;
  assert.ok(w.pointInSolid(door.pos.x,door.pos.y,12));
  w.setDoorState(door.door!.id,'broken',{silent:true});
  assert.equal(door.door!.open,true);assert.equal(residency.gridAt(door.pos)!.grid.regionAt(door.pos.x-6000,door.pos.y-6000),'ground');
  const barrel=own.find(a=>a.defId==='barrel'||a.defId==='crate')!;w.kill(barrel,false,w.player);assert.ok(barrel.dead);
  const survivor=own.find(a=>!a.dead&&!a.doorId&&!a.passive)!;survivor.life*=.6;
  const before={monster:survivor.defId,life:survivor.life,faction:survivor.faction,pos:{...survivor.pos}};
  const drops=canonical(w.drops),actorIds=new Set(own.map(a=>a.id));
  w.player.aiTargetId=survivor.id;
  assert.ok(residency.sync([],host).deferred.includes(first.id),'foreign active target pins actual owner');
  w.player.aiTargetId=undefined;
  w.player.pos={...survivor.pos};assert.ok(residency.sync([],host).deferred.includes(first.id),'near same-story participant pins native geometry');
  w.player.pos={x:-20000,y:-20000};w.time+=20;
  assert.ok(residency.sync([],host).retired.includes(first.id));assert.equal(host.population,0);
  assert.ok(w.actors.every(a=>!actorIds.has(a.id)));assert.equal(canonical(w.drops),drops,'retiring executes no reward or kill');
  assert.ok(oldActors.every(a=>w.actors.includes(a)));assert.ok(oldPieces.every(d=>w.doodads.includes(d)));
  console.log('PASS actual native door, furniture and faction garrison factories; atomic population, native door terrain edit and safe exact-instance retirement');

  const saved=residency.snapshot(w.time),receipt=saved.born[0].changes.native as {bodies:{slot:string;monster:string;dead:boolean;life:number;state?:unknown}[];transient:string[]};
  assert.ok(receipt.bodies.some(b=>b.dead));assert.equal(receipt.transient.length,0);assert.ok(receipt.bodies.filter(b=>!b.dead).every(b=>b.state));
  const resumed=new MassNativeResidency(spec,provider,nativeWorldCapabilities(),()=>frame,structuredClone(saved));runtime.nativeFeatures=resumed;
  assert.ok(resumed.sync([first],host).admitted.includes(first.id));
  const again=w.actors.filter(a=>!oldActors.includes(a));
  assert.equal(again.length,receipt.bodies.filter(b=>!b.dead).length);
  const wounded=again.find(a=>a.defId===before.monster&&a.life===before.life)!;assert.ok(wounded);
  assert.deepEqual(wounded.pos,before.pos);assert.equal(wounded.faction,before.faction);
  assert.equal(canonical(w.drops),drops);assert.equal(w.doodads.find(d=>d.door?.id===door.door!.id)!.door!.broken,true);
  assert.equal(again.some(a=>a.doorId===door.door!.id),false,'opened native door cannot rebirth a guard body');
  console.log('PASS exact safe native wounds/squads, permanent furniture death and door opening across native residency save/remount without reward farming');

  const unsupported=compileNativeFeature(resolveNativeFeature({id:'unsupported-inn',seed:42,source:{kind:'structure',id:'inn',tileset:'grassland'}}));
  const rejected=nativeFeatureAdmission(unsupported,nativeWorldCapabilities());assert.equal(rejected.ok,false);
  assert.ok(rejected.missing.some(r=>['npcs','folk','station-anchors'].includes(r)));
  console.log('PASS native NPC/service mechanisms remain explicit whole-feature refusals');

  resumed.sync([],host);assert.equal(host.population,0);
  const tower:NativeFeaturePlacement={...first,id:'native-tower',request:{id:'native-tower',seed:42,
    source:{kind:'structure',id:'watchtower',tileset:'grassland'},level:3}};
  const towerResidency=new MassNativeResidency(spec,()=>[tower],nativeWorldCapabilities(),()=>frame);runtime.nativeFeatures=towerResidency;
  assert.ok(towerResidency.sync([tower],host).admitted.includes(tower.id));
  const guards=w.actors.filter(a=>!oldActors.includes(a)),guard=guards.find(a=>!a.passive)!;
  const slot=w.structures.flatMap(s=>s.slots).find(s=>s.id.startsWith(tower.id+'::'))!;assert.ok(slot);
  guard.pos={...slot.pos};assert.ok(w.claimGarrisonSlot(guard,100));
  assert.equal(guard.garrison?.slotId,slot.id);assert.equal(guard.anchored,true);
  assert.ok(guard.sheet.getSourceMods('garrison')!.length);assert.ok(slot.occupants.includes(guard.id));
  w.time+=20;assert.ok(towerResidency.sync([],host).retired.includes(tower.id),'exact owner may sleep its settled native slot with full actor state');
  const towerSave=towerResidency.snapshot(w.time),towerResume=new MassNativeResidency(spec,()=>[tower],nativeWorldCapabilities(),()=>frame,towerSave);
  runtime.nativeFeatures=towerResume;towerResume.sync([tower],host);
  const held=w.actors.find(a=>a.garrison?.slotId===slot.id)!;assert.ok(held);
  assert.ok(w.garrisonSlotById(slot.id)!.occupants.includes(held.id));assert.ok(held.sheet.getSourceMods('garrison')!.length);
  w.releaseGarrison(held);assert.equal(held.garrison,undefined);assert.equal(held.anchored,false);
  assert.equal(w.garrisonSlotById(slot.id)!.occupants.length,0);
  towerResume.sync([],host);assert.equal(host.population,0);
  console.log('PASS native tower claim, defensive modifiers and exact owned-slot dormancy/remount/release');

  const brittle:NativeFeaturePlacement={...first,id:'native-brittle',request:{id:'native-brittle',seed:42,
    source:{kind:'composition',id:'formic_earthworks',tileset:'grassland'}}};
  const brittleResidency=new MassNativeResidency(spec,()=>[brittle],nativeWorldCapabilities(),()=>frame);runtime.nativeFeatures=brittleResidency;
  assert.ok(brittleResidency.sync([brittle],host).admitted.includes(brittle.id));
  const pod=w.doodads.find(d=>d.kind==='seed_pod')!;assert.ok(pod&&doodadRuleOf(pod.kind).brittle);
  (w as unknown as {popBrittle(d:Doodad,striker:Actor):void}).popBrittle(pod,w.player);
  assert.ok(pod.gone&&!w.doodads.includes(pod));
  const afterPop=JSON.stringify([w.drops,w.orbs]);brittleResidency.sync([],host);
  const popped=brittleResidency.snapshot(w.time),brittleResume=new MassNativeResidency(spec,()=>[brittle],nativeWorldCapabilities(),()=>frame,popped);
  runtime.nativeFeatures=brittleResume;brittleResume.sync([brittle],host);
  assert.equal(w.doodads.some(d=>d.kind==='seed_pod'&&d.pos.x===pod.pos.x&&d.pos.y===pod.pos.y),false);
  assert.equal(JSON.stringify([w.drops,w.orbs]),afterPop);assert.ok(popped.born[0].changes.doodads.some(([,d])=>d===null));
  assert.equal(nativeWorldCapabilities().has('doodad:burial_urn'),false,'a spawned encounter cannot be accepted as a simple pop');
  console.log('PASS actual native seed-pod pop, sparse destruction receipt and no repeated spill after owner save/remount');

  // Separate production integration: no custom host/provider is substituted.
  const production=makeSimWorld('warrior',713);production.startWorldMass(713);production.player.invulnerable=true;
  const pm=production.massRuntime!,seen=new Set<string>();let target:NativeFeaturePlacement|undefined;
  outer:for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)for(const p of pm.nativeCountry!.near(pm.walk.at(x*5400,y*5400),2700)){
    if(seen.has(p.id))continue;seen.add(p.id);
    pm.nativeFeatures!.regionAt(moveAddress(p.origin,{x:900,y:900},960));
    if(p.request.source.kind==='structure'&&!pm.nativeFeatures!.refusals(p.id).length){target=p;break outer;}
  }
  assert.ok(target,'default country contains a truly admitted native structure');
  const q={x:Number(BigInt(target.origin.cx)-BigInt(pm.origin.cx))*960+target.origin.x+900,
    y:Number(BigInt(target.origin.cy)-BigInt(pm.origin.cy))*960+target.origin.y+900};
  production.landPartyAt(q);pm.update(production,true);
  assert.ok(production.structures.some(s=>s.id.startsWith(target!.id+'::')));assert.ok(pm.nativeFeatures!.stats.resident);
  assert.ok(pm.population<=pm.config.maxPopulation);
  const actual=serializeCharacter(production),continued=makeSimWorld('warrior',714);
  assert.ok(applySavedCharacter(continued,actual));assert.ok(continued.adoptWorldState(actual.world));
  continued.startWorldMass(actual.world!.worldmass!.state.run.seed,actual.world!.worldmass);
  assert.ok(continued.structures.some(s=>s.id.startsWith(target!.id+'::')));
  assert.ok(continued.massRuntime!.population<=continued.massRuntime!.config.maxPopulation);
  console.log('PASS default generated country actual runtime admission, shared native population budget and character Continue');
}finally{restore();}
