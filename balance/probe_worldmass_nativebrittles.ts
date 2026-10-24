import assert from 'node:assert/strict';
import { makeSimWorld, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { withSeededRandom } from '../src/core/rng';
import { NullInput } from '../src/net/intent';
import { DISSOLVE_CFG } from '../src/engine/dissolve';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { possessRefusal } from '../src/engine/possess';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { World } from '../src/engine/world';
import type { Doodad } from '../src/engine/levelgen';
import { address } from '../src/worldmass/address';
import { compileNativeFeature, resolveNativeFeature, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';
import { MassNativeResidency, translateNativeFeature, type NativeFeatureInstance, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';
import { MassNativeHost, nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeBrittles, type MassNativeBrittlesSave } from '../src/worldmass/nativeBrittles';
import { captureNativeActorState, nativeActorQuietRefusal, massDormancyPins } from '../src/worldmass/dormancy';

const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const request=(id='urn-lifecycle'):NativeFeatureRequest=>({id,seed:713,level:15,size:{w:1800,h:1800},
  source:{kind:'composition',id:'family_plot',tileset:'courtland'}});
const makeWorld=():World=>{const w=makeSimWorld('warrior',713);w.time=1000;w.actors=[w.player];w.doodads=[];
  w.player.pos={x:-10000,y:-10000};return w;};
const makeInstance=(id='urn-lifecycle',save?:MassNativeBrittlesSave,override?:NativeFeatureRequest):NativeFeatureInstance=>{
  const req=override??request(id),blueprint=compileNativeFeature(resolveNativeFeature(req)),offset={x:0,y:0};
  const layout=translateNativeFeature(blueprint,id,offset);
  if(save)for(const slot of save.slots)layout.doodads[slot.index].gone=slot.popped;
  return {id,blueprint,offset,layout,placement:{id,request:req,origin:address('surface','0','0',0,0,960)},
    grid:{id,grid:blueprint.grid!,offset},entrances:[],zone:copy(blueprint.descriptor.zone)};
};
const pop=(w:World,d:Doodad):void=>Reflect.get(w,'popBrittle').call(w,d);
// The native handler consumes this explicit chance/count prefix; every factory
// and subsequent motion draw then follows an ordinary seeded native stream.
const twoWakes=<T>(fn:()=>T):T=>withSeededRandom(81471,()=>{
  const rng=Math.random,prefix=[.9,.9,.1,.9];let cursor=0;Math.random=()=>cursor<prefix.length?prefix[cursor++]:rng();
  try{return fn();}finally{Math.random=rng;}
});
const attach=(w:World,i:NativeFeatureInstance,max=128,saved?:MassNativeBrittlesSave)=>{
  let limit=max;const manager:MassNativeBrittles=new MassNativeBrittles(w,{population:()=>manager.population,maxPopulation:()=>limit,retainRadius:512,quietSeconds:15});
  const binding=manager.prepare(i,saved)!;const remove=w.installMassNativeScene(i);binding.mount();
  return {manager,binding,remove,limit:(v:number)=>{limit=v;}};
};
const urns=(i:NativeFeatureInstance)=>i.blueprint.descriptor.brittleSources!.rows.map(r=>i.layout.doodads[r.index]);
const nativeSettle=(w:World):void=>{
  // Actual World.update owns emergence release and dissolution/evaporation
  // pruning. No component/status removal is used to manufacture eligibility.
  for(let n=0;n<6000;n++){w.update(.1);if(n>160&&!w.doodads.some(d=>d.dissolveDebris)&&!w.dissolves.length)break;}
};
const restore=seedGlobalRandom(713);
try{
  const w=makeWorld(),i=makeInstance(),o=attach(w,i,1),[urn,other]=urns(i);assert.equal(urns(i).length,2);
  const untouched={actors:w.actors.slice(),doodads:w.doodads.slice(),drops:w.drops.slice(),orbs:w.orbs.slice(),flashes:w.flashes.slice()};
  const random=Math.random;let calls=0;Math.random=()=>{calls++;return random();};
  try{pop(w,urn);}finally{Math.random=random;}
  assert.equal(calls,0);assert.equal(urn.gone,undefined);assert.equal(o.manager.population,0);
  assert.deepEqual({actors:w.actors,doodads:w.doodads,drops:w.drops,orbs:w.orbs,flashes:w.flashes},untouched);
  o.limit(2);const factory=w.createMonster.bind(w);let nested=false,inflight=false;
  w.createMonster=(monster,level,team)=>{assert.equal(o.manager.population,2,'two native seats are leased before original factories');
    if(!nested){nested=true;const was=Math.random;let extra=0;Math.random=()=>{extra++;return was();};
      try{pop(w,other);}finally{Math.random=was;}assert.equal(extra,0);assert.equal(other.gone,undefined);
      assert.throws(()=>o.binding.capture(),/incomplete pop/);inflight=true;}
    return factory(monster,level,team);};
  try{twoWakes(()=>pop(w,urn));}finally{w.createMonster=factory;}
  assert.ok(inflight&&urn.gone);assert.equal(o.manager.population,2);assert.equal(o.binding.actors().size,2);
  const live=[...o.binding.actors()];assert.ok(live.every(a=>a.defId==='skeleton_warrior'&&a.level===15&&!a.fromZoneGen));
  assert.ok(live.every(a=>w.emergeOf(a)&&a.untargetable));assert.equal(o.binding.canRetire(),false);
  live[0].life*=.63;const active=o.binding.capture();assert.equal(active.slots[0].birthCount,2);assert.equal(active.transient.length,2);
  assert.equal(active.transientDebris,true);assert.ok(active.slots[0].births.every(b=>Array.isArray(b.factoryTape)), 'zero native factory draws is a valid empty tape');
  const effectCounts=[w.drops.length,w.orbs.length,w.flashes.length,w.dissolves.length],sentinel=Math.random;
  twoWakes(()=>pop(w,urn));assert.deepEqual([w.drops.length,w.orbs.length,w.flashes.length,w.dissolves.length],effectCounts);assert.equal(Math.random,sentinel);
  console.log('PASS untouched whole native family, zero-effect capacity refusal, recursive pending leases, in-flight snapshot refusal, native two-body emergence and once-only pop');

  const resumed=makeWorld(),ri=makeInstance(i.id,active);let replayDraws=0;const prior=Math.random;
  Math.random=()=>{replayDraws++;return prior();};let ro:ReturnType<typeof attach>;
  try{ro=attach(resumed,ri,128,active);}finally{Math.random=prior;}
  assert.equal(replayDraws,0,'saved native factory tapes consume no new global draws');
  assert.equal(resumed.drops.length,0);assert.equal(resumed.orbs.length,0);assert.equal(resumed.flashes.length,0);assert.equal(resumed.dissolves.length,0);
  const restored=[...ro.binding.actors()];assert.equal(restored.length,2);assert.equal(restored[0].life,live[0].life);
  assert.deepEqual(restored.map(a=>a.pos),active.slots[0].births.map(b=>b.pos));
  assert.ok(restored.every(a=>!resumed.emergeOf(a)&&!a.untargetable),'Continue uses native transient emergence reset, not an exact active combat claim');
  assert.deepEqual(restored.map(a=>a.maxLife()),live.map(a=>a.maxLife()));
  const quiet=ro.binding.capture();assert.equal(quiet.transient.length,0);
  assert.ok(quiet.slots[0].births.every(b=>b.state));
  console.log('PASS factory-tape replay plus original baseline preserves wounds/stats/positions, no new RNG, pop/rewards/procs/emergence are not replayed');

  const dead=restored[1];resumed.kill(dead,false,resumed.player);assert.ok(dead.dead);
  const beforeDrop=JSON.stringify(resumed.drops),savedDead=ro.binding.capture();assert.equal(savedDead.slots[0].births[1].actorId<0,true);
  const restoreDead=makeWorld(),di=makeInstance(i.id,savedDead),d=attach(restoreDead,di,128,savedDead);
  assert.equal(d.binding.actors().size,1);assert.equal(d.manager.population,1);
  const dsave=d.binding.capture();assert.equal(dsave.slots[0].births[1].dead,true);assert.equal(dsave.slots[0].birthCount,2);
  const again=makeWorld(),ai=makeInstance(i.id,dsave),a=attach(again,ai,128,dsave);
  assert.equal(a.binding.actors().size,1);assert.equal(a.binding.capture().slots[0].births[1].actorId,dsave.slots[0].births[1].actorId);
  assert.equal(JSON.stringify(resumed.drops),beforeDrop,'checkpoint/restore does not invoke native kill rewards');
  for(const removeCount of [1,2]){const bad=copy(active);bad.slots[0].births.splice(0,removeCount);
    assert.throws(()=>new MassNativeBrittles(makeWorld(),{population:()=>0,maxPopulation:()=>128,retainRadius:512,quietSeconds:15}).prepare(makeInstance(i.id,bad),bad),/scenery receipt/);}
  const foreign=copy(quiet);const node=foreign.slots[0].births[0].state!.nodes[0];node.entries.push(['probeActor',{actor:987654321}]);
  assert.throws(()=>new MassNativeBrittles(makeWorld(),{population:()=>0,maxPopulation:()=>128,retainRadius:512,quietSeconds:15}).prepare(makeInstance(i.id,foreign),foreign),/actor|dependency/i);
  const changed=[...a.binding.actors()][0];changed.team='player';assert.throws(()=>a.binding.capture(),/bound identity/);changed.team='enemy';
  console.log('PASS native death reward boundary, durable death-before-save, repeated Continue ID reuse, deleted births and foreign exact-state references fail closed');

  for(const [key,value] of [['untargetable',true],['baseInvulnerable',true],['kind','player'],['passive',true],['driven',true],
    ['look','injected'],['emergeUntil',1001],['emergeHeldTargetable',true],['possession','injected'],['casting','injected'],['movementTether','injected']] as const){
    const bad=copy(active),baseline=bad.slots[0].births[0].factoryState,node=baseline.nodes[0],pair=node.entries.find(([name])=>name===key);
    if(pair)Reflect.set(pair,1,value);else node.entries.push([key,value]);
    const rejected=makeWorld(),originalActors=rejected.actors.slice(),originalDoodads=rejected.doodads.slice();
    assert.throws(()=>attach(rejected,makeInstance(i.id,bad),128,bad),/factory baseline/,'baseline '+key+' must not become permanent native state');
    assert.deepEqual(rejected.actors,originalActors);assert.deepEqual(rejected.doodads,originalDoodads);
  }
  for(const [key,value] of [['untargetable',true],['baseInvulnerable',true],['kind','player'],['passive',true],['driven',true]] as const){
    const bad=copy(quiet),node=bad.slots[0].births[0].state!.nodes[0],pair=node.entries.find(([name])=>name===key);
    if(pair)Reflect.set(pair,1,value);else node.entries.push([key,value]);
    const rejected=makeWorld(),originalActors=rejected.actors.slice();
    assert.throws(()=>attach(rejected,makeInstance(i.id,bad),128,bad),/quiet state/);assert.deepEqual(rejected.actors,originalActors);
  }
  const co=makeWorld();co.addSeat('p1',classById('warrior'),new NullInput(),{startingCompanions:false});
  const coi=makeInstance('urn-coop'),cob=attach(co,coi);twoWakes(()=>pop(co,urns(coi)[0]));
  const coBodies=[...cob.binding.actors()],coSave=cob.binding.capture(),coMax=coBodies[0].maxLife();
  assert.ok(coBodies[0].sheet.getSourceMods('partyScale')?.length);
  const solo=makeWorld(),soloInstance=makeInstance(coi.id,coSave),soloNative=solo.createMonster('skeleton_warrior',15,'enemy');
  assert.ok(soloNative.maxLife()<coMax);const soloOwner=attach(solo,soloInstance,128,coSave);
  assert.equal([...soloOwner.binding.actors()][0].maxLife(),coMax,'actual birth-party scaling survives replay in a different current party');
  assert.deepEqual([...soloOwner.binding.actors()][0].sheet.getSourceMods('partyScale'),coBodies[0].sheet.getSourceMods('partyScale'));
  console.log('PASS complete pristine factory proof rejects injected permanent flags/actions/controllers before publication; real two-seat birth scaling survives solo reconstruction');

  const resizing=makeWorld(),resizeInstance=makeInstance('urn-party-change'),resizeOwner=attach(resizing,resizeInstance);
  twoWakes(()=>pop(resizing,urns(resizeInstance)[0]));const resizeBody=[...resizeOwner.binding.actors()][0],birthMax=resizeBody.maxLife();
  resizeBody.life*=.9;
  for(const phase of ['active','quiet'] as const){
    if(phase==='quiet')nativeSettle(resizing);
    resizing.addSeat('joining',classById('warrior'),new NullInput(),{startingCompanions:false});
    assert.ok(resizeBody.life>birthMax,'a native join makes this wounded survivor exceed its original solo birth max');
    for(const size of [2,1]){
      if(size===1)resizing.removeSeat('joining');
      const current=resizeOwner.binding.capture();assert.equal(current.transient.length,phase==='active'?2:0);
      const target=makeWorld();target.time=current.clock;const targetInstance=makeInstance(resizeInstance.id,current),targetOwner=attach(target,targetInstance,128,current);
      const moved=[...targetOwner.binding.actors()][0];assert.equal(moved.life,resizeBody.life);assert.equal(moved.maxLife(),resizeBody.maxLife());
      assert.deepEqual(moved.sheet.getSourceMods('partyScale'),resizeBody.sheet.getSourceMods('partyScale'));
      assert.equal(current.slots[0].births[0].partyScale===null,size===1);
      assert.deepEqual([...targetOwner.binding.actors()].map(a=>a.life),[...resizeOwner.binding.actors()].map(a=>a.life));
    }
  }
  resizing.addSeat('rapid',classById('warrior'),new NullInput(),{startingCompanions:false});resizing.removeSeat('rapid');
  resizing.addSeat('rapid',classById('warrior'),new NullInput(),{startingCompanions:false});
  const rounded=[...resizeOwner.binding.actors()][1];assert.ok(rounded.life>rounded.maxLife()+.5,'actual repeated native rescale can retain more than half a point above max');
  const rapidSave=resizeOwner.binding.capture(),rapidWorld=makeWorld();rapidWorld.time=rapidSave.clock;const rapidOwner=attach(rapidWorld,makeInstance(resizeInstance.id,rapidSave),128,rapidSave);
  assert.equal([...rapidOwner.binding.actors()][1].life,rounded.life);assert.equal([...rapidOwner.binding.actors()][1].maxLife(),rounded.maxLife());
  console.log('PASS actual post-birth 1-to-2 join and 2-to-1 leave preserve current native max/wounds in active and exact quiet Continue, separate from immutable birth baseline');

  const capped=makeWorld(),cappedInstance=makeInstance('urn-capped'),cappedOwner=attach(capped,cappedInstance);
  const capSpec=cappedInstance.blueprint.descriptor.brittleSources!.definitions[0].dissolve!;
  for(let n=0;n<DISSOLVE_CFG.maxLive;n++)capped.dissolveBreak({kind:'burial_urn',pos:{x:20+n*30,y:20},radius:12},capSpec,null);
  const debrisBefore=capped.doodads.filter(d=>d.dissolveDebris).length,old=Math.random;Math.random=()=>.9;
  try{pop(capped,urns(cappedInstance)[0]);}finally{Math.random=old;}
  assert.equal(capped.dissolves.length,DISSOLVE_CFG.maxLive);assert.equal(capped.doodads.filter(d=>d.dissolveDebris).length,debrisBefore+1);
  assert.equal(cappedOwner.binding.capture().transientDebris,true);assert.equal(cappedOwner.binding.canRetire(),false);
  assert.equal(cappedOwner.binding.capture().slots[0].birthCount,0,'no-wake native outcome is a committed zero birth receipt');
  console.log('PASS capped native dissolution still owns its emitted evaporating debris and prevents premature retirement');

  nativeSettle(w);assert.deepEqual(Reflect.get(w,'separateScratch'),[], 'native separation does not retain its derived scratch output');assert.ok(live.every(x=>!w.emergeOf(x)));assert.equal(o.binding.capture().transientDebris,false);
  const state=live.map(x=>nativeActorQuietRefusal(x,w,15,captureNativeActorState(x),{nativeTellClock:true}));
  assert.deepEqual(state,[null,null],JSON.stringify(state));
  assert.equal(nativeActorQuietRefusal(live[0],w,15,captureNativeActorState(live[0])), 'native deadline tellNextAt');
  assert.equal(nativeActorQuietRefusal(live[0],w,15,null,{nativeTellClock:true}), 'native deadline tellNextAt', 'retained display deadline requires complete codec');
  const otherDeadline=live[0].aiDazeUntil;live[0].aiDazeUntil=w.time+5;assert.equal(o.binding.canRetire(),false);live[0].aiDazeUntil=otherDeadline;
  w.player.aiTargetRef=live[0];assert.equal(o.binding.canRetire(),false);w.player.aiTargetRef=undefined;
  const foreignLease={actor:live[0]};Reflect.set(w,'urnProbeLease',foreignLease);
  assert.equal(massDormancyPins(w,new Map([['wake',live[0]]])).has(live[0]),true);assert.equal(o.binding.canRetire(),false);Reflect.deleteProperty(w,'urnProbeLease');
  const settled=o.binding.capture(),dropBefore=JSON.stringify(w.drops),tells=live.map(x=>({next:x.tellNextAt,rev:x.tellRev,specs:copy(x.tellSpecs),values:copy(x.tells)}));
  assert.equal(o.binding.canRetire(),true,JSON.stringify({player:w.player.pos,actors:w.actors.map(a=>({id:a.id,dead:a.dead,pos:a.pos})),transient:settled.transient,pins:[...massDormancyPins(w,new Map(live.map((a,i)=>[String(i),a])))].map(a=>a.id)}));o.binding.detach();o.remove();assert.equal(o.manager.population,0);
  const returnInstance=makeInstance(i.id,settled),returned=o.manager.prepare(returnInstance,settled)!;
  const removeReturn=w.installMassNativeScene(returnInstance);returned.mount();assert.equal(returned.actors().size,2);
  assert.deepEqual([...returned.actors()].map(x=>({next:x.tellNextAt,rev:x.tellRev,specs:copy(x.tellSpecs),values:copy(x.tells)})),tells);
  assert.deepEqual([...returned.actors()].map(x=>x.life),settled.slots[0].births.map(b=>b.life));assert.equal(JSON.stringify(w.drops),dropBefore);
  returned.detach();removeReturn();
  console.log('PASS native emergence/debris naturally settle, actual foreign target/reference leases retain bodies, exact quiet retirement/remount preserves wounds without rewards');

  const pw=makeWorld(),pi=makeInstance(i.id,quiet),pb=attach(pw,pi,128,quiet),hero=pw.player;
  const borrowed=[...pb.binding.actors()][0];borrowed.life=borrowed.maxLife()*.2;hero.pos={x:borrowed.pos.x-30,y:borrowed.pos.y};
  assert.equal(possessRefusal(borrowed,undefined),null);
  Reflect.get(pw,'possessSeize').call(pw,hero,makeSkillInstance(SKILLS.possession,1),borrowed,undefined);
  assert.equal(pw.player,borrowed);assert.equal(pw.localSeat.home,hero);assert.equal(borrowed.team,'player');
  const possessed=pb.binding.capture(),character=serializeCharacter(pw);
  assert.equal(possessed.playerId,hero.id);assert.equal(possessed.transient.includes(possessed.slots[0].births[0].key),true);
  assert.equal(pw.player,borrowed,'saving never ejects the active seat');assert.equal(borrowed.possession?.kind,'possess');
  assert.equal(pb.binding.canRetire(),false,'a ridden native cannot stream away');
  const cp=makeWorld();assert.equal(applySavedCharacter(cp,character),true);
  const cpi=makeInstance(i.id,possessed),cpb=attach(cp,cpi,128,possessed);
  const unpossessed=[...cpb.binding.actors()][0];assert.equal(cp.localSeat.home,undefined);assert.notEqual(cp.player,unpossessed);
  assert.equal(unpossessed.team,'enemy');assert.equal(unpossessed.possession,undefined);assert.equal(unpossessed.life,borrowed.life);
  assert.equal(unpossessed.skills.some(inst=>inst?.def.id==='possession'),false,'native transient guest gem is not duplicated');
  pw.seatEject(pw.localSeat,'press');assert.equal(pw.player,hero);assert.equal(borrowed.team,'enemy');
  assert.ok(borrowed.statuses.some(status=>status.id==='stun'),'native voluntary-eject stun remains owned by native behavior');
  console.log('PASS actual native possession and CharacterSave preserve hero, exact borrowed wounds and native transient return; streaming pins, Save never ejects or duplicates guest gem');

  const shell=makeWorld(),shellInstance=makeInstance('urn-shell'),shellOwner=attach(shell,shellInstance),oldZone=shell.zone;
  shell.zone={...oldZone,bounty:2};let refusedDraws=0;const oldRandom=Math.random;Math.random=()=>{refusedDraws++;return oldRandom();};
  try{pop(shell,urns(shellInstance)[0]);}finally{Math.random=oldRandom;}
  assert.equal(refusedDraws,0);assert.equal(urns(shellInstance)[0].gone,undefined);
  assert.throws(()=>shellOwner.binding.capture(),/incomplete pop/);
  const harmlessRequest={...request('no-urn-context'),source:{kind:'composition' as const,id:'formic_earthworks',tileset:'grassland'}};
  const harmless=makeInstance(harmlessRequest.id,undefined,harmlessRequest);
  assert.equal(harmless.blueprint.descriptor.brittleSources?.rows.length??0,0);
  assert.equal(shellOwner.manager.requiredPopulation(harmless),0);assert.equal(shellOwner.manager.prepare(harmless),undefined);
  shell.zone=oldZone;shellOwner.binding.rollbackMount();shellOwner.remove();
  console.log('PASS shell reward-context changes refuse urn operation before RNG and checkpoint, without policing unrelated no-urn native owners');

  const failed=makeWorld(),fi=makeInstance('urn-fault'),f=attach(failed,fi);const original=failed.createMonster.bind(failed);
  failed.createMonster=()=>{throw undefined;};let threw=false;try{twoWakes(()=>pop(failed,urns(fi)[0]));}catch{threw=true;}finally{failed.createMonster=original;}
  assert.equal(threw,true);assert.equal(f.manager.population,0);assert.throws(()=>f.binding.capture(),/incomplete/);assert.equal(f.binding.canRetire(),false);
  assert.equal(urns(fi)[0].gone,true,'committed native effects are not rolled back');
  assert.throws(()=>pop(failed,urns(fi)[1]),/Faulted/);
  console.log('PASS unexpected postcommit factory failure latches owner fault even for thrown undefined, frees unused lease and cannot checkpoint/retry');

  const hw=makeWorld(),frame=address('surface','0','0',0,0,960),placement:NativeFeaturePlacement={id:'urn-composite',request:request('urn-composite'),origin:frame};
  const policy={run:'urn-composite',addressSpan:960,maxResidents:1,maxBlueprints:2,maxCandidates:1};
  const host:MassNativeHost=new MassNativeHost(hw,{population:()=>host.population,maxPopulation:()=>128});
  const residency=new MassNativeResidency(policy,()=>[],nativeWorldCapabilities(),()=>frame);
  const originalPrepare=host.occurrences.prepare.bind(host.occurrences),oldActors=hw.actors.slice(),oldDoodads=hw.doodads.slice();
  host.occurrences.prepare=()=>({mount:()=>{throw Error('injected later occurrence enrollment');}} as unknown as ReturnType<typeof host.occurrences.prepare>);
  assert.throws(()=>residency.sync([placement],host),/injected later occurrence/);
  assert.deepEqual(hw.actors,oldActors);assert.deepEqual(hw.doodads,oldDoodads);assert.equal(host.population,0);
  assert.equal((Reflect.get(hw,'massNativeBrittles') as Map<unknown,unknown>).size,0);
  assert.equal((Reflect.get(hw,'massNativeBrittleOwners') as Map<unknown,unknown>).size,0);
  host.occurrences.prepare=originalPrepare;
  assert.deepEqual(residency.sync([placement],host).admitted,[placement.id]);
  const hostUrn=hw.doodads.find(d=>d.kind==='burial_urn')!;twoWakes(()=>pop(hw,hostUrn));
  const checkpoint=residency.snapshot(hw.time),native=checkpoint.born[0].changes.native as {brittles:MassNativeBrittlesSave};
  assert.equal(native.brittles.slots.reduce((n,s)=>n+s.birthCount,0),2);assert.ok(checkpoint.born[0].changes.doodads.some(([,d])=>d===null));
  const cold=makeWorld(),coldHost:MassNativeHost=new MassNativeHost(cold,{population:()=>coldHost.population,maxPopulation:()=>128});
  const coldResidency=new MassNativeResidency(policy,()=>[],nativeWorldCapabilities(),()=>frame,checkpoint);
  const coldBefore=cold.actors.slice(),coldDoodads=cold.doodads.slice(),coldPrepare=coldHost.occurrences.prepare.bind(coldHost.occurrences);
  coldHost.occurrences.prepare=()=>({mount:()=>{throw Error('injected restored owner failure');}} as unknown as ReturnType<typeof coldHost.occurrences.prepare>);
  assert.throws(()=>coldResidency.sync([placement],coldHost),/restored owner failure/);
  assert.deepEqual(cold.actors,coldBefore);assert.deepEqual(cold.doodads,coldDoodads);assert.equal(coldHost.population,0);
  assert.equal((Reflect.get(cold,'massNativeBrittles') as Map<unknown,unknown>).size,0);
  coldHost.occurrences.prepare=coldPrepare;
  assert.deepEqual(coldResidency.sync([placement],coldHost).admitted,[placement.id]);assert.equal(coldHost.brittles.population,2);
  assert.equal(cold.doodads.filter(d=>d.kind==='burial_urn').length,1);assert.equal(cold.drops.length,0);
  console.log('PASS complete unchanged family through real composite host/residency, later-enrollment rollback, sparse pop+birth save and cold Continue');
}finally{restore();}
