import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { withSeededRandom } from '../src/core/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { compositionDefs, doodadRuleOf, type Doodad } from '../src/engine/levelgen';
import { STATUS_DEFS } from '../src/engine/status';
import { address } from '../src/worldmass/address';
import { massDigest, massRandom } from '../src/worldmass/random';
import { captureNativeEffectSources, nativeEffectRegistryHash, nativeEffectRequirements } from '../src/worldmass/nativeEffectSources';
import { MassNativeEffects, type MassNativeEffectsSave } from '../src/worldmass/nativeEffects';
import { compileNativeFeature, nativeFeatureAdmission, nativeFeatureSourceIdentity, resolveNativeFeature,
  type NativeFeatureDescriptor, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';
import { prepareNativeFeature, validateNativePreparation } from '../src/worldmass/nativePreparation';
import { MassNativeHost, nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeResidency, translateNativeFeature, type NativeFeatureInstance, type NativeFeaturePlacement } from '../src/worldmass/nativeResidency';

const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value)) as T;
const rehash = (d:NativeFeatureDescriptor):NativeFeatureDescriptor => { const {hash:_hash,...body}=d;return {...body,hash:massDigest(body)}; };
const request = (id='effect-source',tileset='overpass'):NativeFeatureRequest => ({id,seed:713,level:15,
  size:{w:1800,h:1800},source:{kind:'composition',id:'drover_waystation',tileset}});
const world = ():World => { const w=makeSimWorld('warrior',81333);w.time=1000;w.actors=[w.player];w.doodads=[];
  w.player.invulnerable=false;w.player.pos={x:0,y:0};return w; };
const pulse = (w:World,dt:number):void => { w.time+=dt;Reflect.get(w,'updateDoodadEffects').call(w,dt); };
const instance = (descriptor:Readonly<NativeFeatureDescriptor>,offset={x:6000,y:6000}):NativeFeatureInstance => {
  const blueprint=compileNativeFeature(descriptor),placement:NativeFeaturePlacement={id:descriptor.id,
    origin:address('surface','0','0',offset.x,offset.y,960),request:request(descriptor.id)};
  return {id:descriptor.id,placement,blueprint,offset,grid:{id:descriptor.id,grid:blueprint.grid!,offset},
    layout:translateNativeFeature(blueprint,descriptor.id,offset),entrances:[],zone:clone(descriptor.zone)};
};
const scoped = <T>(random:()=>number,fn:()=>T):T => {const original=Math.random;Math.random=random;try{return fn();}finally{Math.random=original;}};
const restore=seedGlobalRandom(81333);
try {
  const w=world();
  const descriptor=resolveNativeFeature(request()), source=descriptor.effectSources!.rows[0];
  assert.equal(descriptor.effectSources!.rows.length,1);assert.equal(source.origin,'rule');assert.equal(source.kind,'haven_stone');
  assert.equal(descriptor.geometry.layout.doodads[source.index].effect,undefined,'compiler must not prematurely hydrate a runtime clock');
  assert.ok(Object.isFrozen(source.effect)&&Object.isFrozen(source.status!.definition));
  for(const tileset of ['farmland','foothills','highland','overpass','snowcrown','stonecrown']) {
    const d=resolveNativeFeature(request('waystation/'+tileset,tileset));
    assert.deepEqual(nativeFeatureAdmission(compileNativeFeature(d),nativeWorldCapabilities()),{ok:true,missing:[],unsupported:[]});
    assert.deepEqual(d.authored.feature,clone(compositionDefs().find(c=>c.id==='drover_waystation')),
      'the full native composition remains the source; individual furniture may fail native siting');
  }
  const identity=nativeFeatureSourceIdentity(request()),job={protocol:1 as const,token:1,request:request(),identity,maxBytes:2097152};
  const prepared=prepareNativeFeature(job).preparation;
  assert.equal(validateNativePreparation(request(),prepared)!.descriptor.hash,descriptor.hash);
  const old:NativeFeatureDescriptor=clone(descriptor);delete old.effectSources;
  assert.ok(nativeFeatureAdmission(compileNativeFeature(rehash(old)),nativeWorldCapabilities()).unsupported.includes('native-effect-source-contract'));
  const stripped=clone(descriptor);Reflect.set(stripped.effectSources!,'rows',[]);
  assert.throws(()=>compileNativeFeature(rehash(stripped)),/lost scenery mechanism/);
  const changed=clone(descriptor);changed.effectSources!.rows[0].effect.power=999;
  assert.equal(nativeFeatureAdmission(compileNativeFeature(rehash(changed)),nativeWorldCapabilities()).ok,false);
  const originalStatus=STATUS_DEFS.cloudhaven.duration,registry=nativeEffectRegistryHash();
  try {STATUS_DEFS.cloudhaven.duration=2;assert.notEqual(nativeEffectRegistryHash(),registry);
    assert.equal(nativeFeatureAdmission(compileNativeFeature(descriptor),nativeWorldCapabilities()).ok,false);
    assert.throws(()=>validateNativePreparation(request(),prepared),/identity|source/);
  } finally {STATUS_DEFS.cloudhaven.duration=originalStatus;}
  const stamp=performance.now();for(let n=0;n<20;n++)nativeEffectRegistryHash();
  console.log('PASS complete original waystations, frozen rule/status payload, worker identity and pre-collision incompatibility refusal; registry mean ms '+((performance.now()-stamp)/20).toFixed(3));

  const i=instance(descriptor),manager=new MassNativeEffects(w),binding=manager.prepare(i)!;
  const removeScene=w.installMassNativeScene(i);binding.mount();
  const stone=i.layout.doodads[source.index],finite=world(),plain: Doodad=clone(stone);
  finite.doodads=[plain];let expectedDraws=0;
  const draw=()=>massRandom(descriptor.seed,[descriptor.id,'native-effect/draw',source.index,expectedDraws++]).range(0,1);
  // This is native finite loadZone's rule-attach loop, under the same source
  // random stream; subsequent execution calls the actual finite World driver.
  plain.effect={...clone(doodadRuleOf('haven_stone').effect!),cd:draw()*.8};
  assert.equal(stone.effect!.cd,plain.effect.cd);assert.equal(binding.capture().slots[0].draws,1);
  const targets=(v:World):Actor[]=>{
    v.player.pos={...stone.pos};const out=[v.player];
    for(const flag of ['enemy','passive','downed','untargetable','flying','tier','invulnerable','dead','construct','outside']) {
      const a=withSeededRandom(4200+out.length,()=>v.createMonster('plains_wolf',15,'enemy'));a.pos={...stone.pos};
      if(flag==='tier')a.tier=1;else if(flag==='construct')Reflect.set(a,'construct',{kind:'probe-filter'});
      else if(flag==='outside')a.pos.x+=stone.radius+52+.1;
      else if(flag!=='enemy')Reflect.set(a,flag,true);
      out.push(a);
    }
    v.actors=out;v.actorGridRev++;return out;
  };
  const ours=targets(w),control=targets(finite);w.flashes=[];finite.flashes=[];w.texts=[];finite.texts=[];
  for(const dt of [.013,.07,.51,1.9,.01,.79]) {
    const before=binding.capture().slots[0].draws;
    pulse(w,dt);scoped(draw,()=>pulse(finite,dt));
    assert.equal(stone.effect!.cd,plain.effect.cd);assert.equal(binding.capture().slots[0].draws,expectedDraws);
    assert.ok(expectedDraws-before===0||expectedDraws-before===6,'one chance draw for each of six native eligible bodies, even at chance1');
    assert.deepEqual(ours.map(a=>a.statuses),control.map(a=>a.statuses));
    assert.deepEqual(w.flashes,finite.flashes);
  }
  assert.ok(ours.slice(0,6).every(a=>a.statuses.some(s=>s.id==='cloudhaven'&&s.sourceName==='haven_stone'&&s.remaining===2.5)));
  assert.ok(ours.slice(6).every(a=>!a.statuses.some(s=>s.id==='cloudhaven')));
  assert.equal(w.texts.length,0);assert.equal(w.flashes.length%6,0);
  const away=ours[0];away.endStatus('cloudhaven');w.actors=[away];away.pos={x:0,y:0};w.actorGridRev++;
  const paused=binding.capture(),left=stone.effect!.cd!;
  binding.detach();removeScene();assert.equal(w.doodads.includes(stone),false);
  const resumed=world();resumed.time=w.time+200;const again=instance(descriptor);again.layout.doodads[source.index].effect=clone(stone.effect!);
  const restoreBinding=new MassNativeEffects(resumed).prepare(again,paused)!;const removeAgain=resumed.installMassNativeScene(again);restoreBinding.mount();
  assert.equal(again.layout.doodads[source.index].effect!.cd,left,'unobserved absence does not catch up or reroll');
  assert.equal(restoreBinding.capture().slots[0].draws,paused.slots[0].draws);
  resumed.player.pos={...stone.pos};pulse(resumed,left/2);assert.equal(resumed.player.statuses.some(s=>s.id==='cloudhaven'),false);
  pulse(resumed,left/2+.001);assert.ok(resumed.player.statuses.some(s=>s.id==='cloudhaven'));
  assert.equal(restoreBinding.capture().slots[0].draws,paused.slots[0].draws+1);
  restoreBinding.detach();removeAgain();
  console.log('PASS actual finite/native scheduler, all distinct native target filters, chance draws, flashes/refresh, irregular dt and saved absence clocks');

  for(const cd of [undefined,.31]) {
    const explicit:NativeFeatureDescriptor=clone(descriptor);explicit.geometry.layout.doodads[source.index].effect={...clone(source.effect),...(cd===undefined?{}:{cd})};
    explicit.effectSources=captureNativeEffectSources(explicit.geometry.layout.doodads);
    explicit.requirements=[...new Set([...explicit.requirements,...nativeEffectRequirements(explicit.effectSources)])].sort();
    const def=rehash(explicit),ev=world(),ei=instance(def),em=new MassNativeEffects(ev),eb=em.prepare(ei)!;
    const detach=ev.installMassNativeScene(ei);eb.mount();const snap=eb.capture();assert.equal(snap.slots[0].draws,0);
    assert.equal(ei.layout.doodads[source.index].effect!.cd,cd);
    eb.detach();detach();const savedInstance=instance(def);savedInstance.layout.doodads[source.index].effect=clone(ei.layout.doodads[source.index].effect!);
    const next=em.prepare(savedInstance,snap)!;const drop=ev.installMassNativeScene(savedInstance);next.mount();
    ev.player.pos={...savedInstance.layout.doodads[source.index].pos};pulse(ev,cd===undefined?.001:cd+.001);
    assert.equal(next.capture().slots[0].draws,1);assert.ok(ev.player.statuses.some(s=>s.id==='cloudhaven'));next.detach();drop();
  }
  console.log('PASS explicit native effects retain authored or absent cd, spend no hydration draw, and survive immediate pre-first-tick saves');

  const atomic=world(),ai=instance(descriptor),am=new MassNativeEffects(atomic),ab=am.prepare(ai)!;
  assert.throws(()=>ab.mount(),/enrollment/);assert.equal(ai.layout.doodads[source.index].effect,undefined);
  const retry=am.prepare(ai)!,clear=atomic.installMassNativeScene(ai);retry.mount();retry.rollbackMount();
  assert.equal(ai.layout.doodads[source.index].effect,undefined);clear();
  const third=am.prepare(ai)!,clear2=atomic.installMassNativeScene(ai);third.mount();
  ai.layout.doodads[source.index].contactSource=atomic.player;assert.equal(third.canRetire(),false);delete ai.layout.doodads[source.index].contactSource;
  assert.equal(third.canRetire(),true);third.detach();clear2();
  const oldPiece: Doodad={kind:'haven_stone',pos:{x:20,y:20},radius:20,effect:clone(source.effect)};atomic.doodads=[oldPiece];
  const oldDispose=atomic.installMassNativeEffects('scene-id',[{doodad:oldPiece,invoke:fn=>fn()}]);
  atomic.loadZone(atomic.zone.id);const newPiece: Doodad={...oldPiece,effect:clone(source.effect)};atomic.doodads=[newPiece];let pulses=0;
  const newDispose=atomic.installMassNativeEffects('scene-id',[{doodad:newPiece,invoke:fn=>{pulses++;fn();}}]);
  oldDispose();pulse(atomic,.01);assert.equal(pulses,1);newDispose();
  console.log('PASS publication failure rollback, exact retry, dependency pins, and an old-scene disposer cannot erase a newer same-owner registration');

  const publication=world(),publicationHost:MassNativeHost=new MassNativeHost(publication,{population:()=>publicationHost.population,maxPopulation:()=>64});
  const inspect=()=>({actors:[...publication.actors],doodads:[...publication.doodads],structures:[...publication.structures],
    entrances:[...Reflect.get(publication,'caveEntrances')],dwell:Reflect.get(publication,'caveDwellIdx'),
    grounds:[...Reflect.get(publication,'grounds')],bridges:[...Reflect.get(publication,'bridges')],
    regrowing:[...Reflect.get(publication,'regrowing')],effects:[...Reflect.get(publication,'massNativeEffectInvokers')],
    owners:[...Reflect.get(publication,'massNativeEffectOwners')]});
  const originalScene=inspect(),rebuild=Reflect.get(publication,'rebuildClientTerrain');
  Reflect.set(publication,'rebuildClientTerrain',()=>{rebuild.call(publication);throw Error('injected late terrain rebuild');});
  try {assert.throws(()=>publicationHost.install(instance(descriptor)),/injected late terrain rebuild/);assert.deepEqual(inspect(),originalScene);}
  finally {Reflect.set(publication,'rebuildClientTerrain',rebuild);}
  const malformed=instance(descriptor);
  malformed.layout.doodads[0].felled={at:publication.time,wake:publication.time+80};
  malformed.layout.doodads[1].felled={at:publication.time,wake:NaN};
  assert.throws(()=>publicationHost.install(malformed),/felling clock/);assert.deepEqual(inspect(),originalScene);
  const valid=instance(descriptor),published=publicationHost.install(valid);
  assert.equal((published.capture() as {effects:MassNativeEffectsSave}).effects.slots[0].draws,1,'failed publication spends no durable birth draws');
  assert.equal(valid.layout.doodads[source.index].effect!.cd,massRandom(descriptor.seed,[descriptor.id,'native-effect/draw',source.index,0]).range(0,1)*.8);
  published.detach();assert.deepEqual(inspect(),originalScene);
  console.log('PASS native scene late-rebuild and second-felling failures roll back every exact registration; retry keeps the original hydration draw and clock');

  const dw=world(),mouth=(x:number)=>({pos:{x,y:120},seed:x,kind:'cave_entrance',parent:clone(dw.zone)});
  dw.setMassEntrances('earlier-mouth',[mouth(140)]);dw.setMassEntrances('dwelled-mouth',[mouth(420)]);
  const mouths=Reflect.get(dw,'caveEntrances') as {massOwner?:string}[];
  Reflect.set(dw,'caveDwellIdx',mouths.findIndex(e=>e.massOwner==='dwelled-mouth'));Reflect.set(dw,'caveDwellStart',dw.time-.25);
  const dwellView=dw.caveDwellView();assert.ok(dwellView&&dwellView.frac>0);
  const priorIndex=Reflect.get(dw,'caveDwellIdx');dw.setMassEntrances('earlier-mouth',[]);
  assert.equal(Reflect.get(dw,'caveDwellIdx'),priorIndex-1);assert.deepEqual(dw.caveDwellView(),dwellView);
  const removeEmpty=dw.installMassNativeScene(instance(descriptor));assert.deepEqual(dw.caveDwellView(),dwellView);
  removeEmpty();assert.deepEqual(dw.caveDwellView(),dwellView);assert.equal(Reflect.get(dw,'caveDwellStart'),dw.time-.25);
  dw.setMassEntrances('dwelled-mouth',[]);assert.equal(dw.caveDwellView(),null);
  console.log('PASS unrelated waystation publication/retirement and earlier-mouth removal preserve the exact live cave dwell; actual mouth removal resets it');

  const overlap=world(),om=new MassNativeEffects(overlap),leftInstance=instance(descriptor),rightDescriptor=resolveNativeFeature(request('neighbor-effect'));
  const rightSource=rightDescriptor.effectSources!.rows[0],rightLocal=rightDescriptor.geometry.layout.doodads[rightSource.index];
  const leftStone=leftInstance.layout.doodads[source.index],rightInstance=instance(rightDescriptor,
    {x:leftStone.pos.x+50-rightLocal.pos.x,y:leftStone.pos.y-rightLocal.pos.y});
  const lb=om.prepare(leftInstance)!,rb=om.prepare(rightInstance)!,ld=overlap.installMassNativeScene(leftInstance),rd=overlap.installMassNativeScene(rightInstance);
  lb.mount();rb.mount();overlap.player.pos={x:leftStone.pos.x+25,y:leftStone.pos.y};pulse(overlap,.81);
  const status=overlap.player.statuses.filter(s=>s.id==='cloudhaven');assert.equal(status.length,1);assert.equal(status[0].sourceKey,undefined);
  const neighborClock=rightInstance.layout.doodads[rightSource.index].effect!.cd,neighborDraw=rb.capture().slots[0].draws;
  lb.detach();ld();assert.equal(rightInstance.layout.doodads[rightSource.index].effect!.cd,neighborClock);
  assert.equal(rb.capture().slots[0].draws,neighborDraw);assert.equal(overlap.player.statuses.filter(s=>s.id==='cloudhaven').length,1);
  rightInstance.layout.doodads[rightSource.index].gone=true;pulse(overlap,2);assert.equal(rb.capture().slots[0].draws,neighborDraw,'gone scenery never pulses invisibly');
  rb.detach();rd();
  console.log('PASS overlapping physical owners share native status refresh; retiring one preserves its neighbor and gone scenery stops drawing/pulsing');

  const full=world(),span=960,frame=address('surface','0','0',0,0,span),placement:NativeFeaturePlacement={id:descriptor.id,
    origin:address('surface','6','6',240,240,span),request:request()};
  const policy={run:'native-effects',addressSpan:span,maxResidents:1,maxBlueprints:2,maxCandidates:1};
  const host:MassNativeHost=new MassNativeHost(full,{population:()=>host.population,maxPopulation:()=>64});
  const residency=new MassNativeResidency(policy,()=>[],nativeWorldCapabilities(),()=>frame);
  assert.deepEqual(residency.sync([placement],host).admitted,[placement.id]);
  const live=full.doodads.find(d=>d.kind==='haven_stone')!;full.player.pos={...live.pos};pulse(full,.17);
  const saved=residency.snapshot(full.time),native=(saved.born[0].changes.native as {effects:MassNativeEffectsSave}).effects;
  assert.ok(saved.born[0].changes.doodads.some(([index,d])=>index===source.index&&d?.effect));
  assert.equal('cd' in native.slots[0],false,'there is only one cooldown authority');
  full.player.pos={x:-10000,y:-10000};full.time+=100;assert.deepEqual(residency.sync([],host).retired,[placement.id]);
  const cold=world();cold.time=full.time;const coldHost:MassNativeHost=new MassNativeHost(cold,{population:()=>coldHost.population,maxPopulation:()=>64});
  const continued=new MassNativeResidency(policy,()=>[],nativeWorldCapabilities(),()=>frame,saved);
  assert.deepEqual(continued.sync([placement],coldHost).admitted,[placement.id]);
  const coldStone=cold.doodads.find(d=>d.kind==='haven_stone')!;
  assert.equal(coldStone.effect!.cd,live.effect!.cd);assert.equal(cold.player.statuses.some(s=>s.id==='cloudhaven'),false);
  assert.equal(cold.doodads.filter(d=>d.kind==='haven_stone').length,1);
  console.log('PASS actual composite host + sparse scenery checkpoint, retirement and cold reconstruction: one stone, one cd, no player-status resurrection');
} finally {restore();}
