import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {MassDormancy,nativeDormancyRefusal,nativeActorQuietRefusal,captureNativeActorState} from '../src/worldmass/dormancy';
import {nativeQuietAnatomy,nativeQuietAnatomyRadius} from '../src/worldmass/nativeQuietAnatomy';
import {bindMovementTether} from '../src/engine/movementTether';
import {stageNativeCohort,hydrateNativeCohortData} from '../src/worldmass/nativePaging';
import {serializeCharacter} from '../src/meta/character';
import {encodeCharacterPages,decodeCharacterPages,preparePagedCharacterResume,readCharacterNativePage,type CharacterNativePage,type CharacterPageEntry} from '../src/meta/characterPages';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import type {Actor} from '../src/engine/actor';
const undo=seedGlobalRandom(7164),w=makeSimWorld('warrior',7164);w.startWorldMass(713);w.time=100;w.player.pos={x:50000,y:0};
const save=serializeCharacter(w),mass=save.world!.worldmass!,policy=mass.config.dormancy!,owned=new Map<string,Actor>(),d=new MassDormancy(policy);
mass.enemies=[];mass.dormancy=new MassDormancy(policy).snapshot(new Map(),w);
for(const id of ['bone_serpent','rootwild_hingejaw','galvanic_ooze','tide_whelk']){
 const a=w.createMonster(id,3,'enemy');a.pos={x:-20000,y:80};a.aiAnchor={...a.pos};a.fromZoneGen=true;a.squadId=91;a.life*=.6;
 if(a.worm){a.worm.segments=[{x:-20080,y:80},{x:-20160,y:80}];a.worm.woundHp=[10,7];a.worm.wounded=[true,false];a.worm.flash=[0,0];}
 if(a.movementTetherSpec)bindMovementTether(a,a.movementTetherSpec,{x:-20050,y:80});
 assert.equal(nativeDormancyRefusal(a,w,12),null,id);
 assert.match(nativeActorQuietRefusal(a,w,12,captureNativeActorState(a))??'',/native component/,id+' kind-owned requires its own certificate');
 owned.set(id,a);w.actors.push(a);
}
const worm=owned.get('bone_serpent')!,tether=owned.get('rootwild_hingejaw')!,shell=owned.get('tide_whelk')!,ooze=owned.get('galvanic_ooze')!;
worm.worm!.flash![0]=.3;assert.equal(nativeQuietAnatomy(worm,'worm',100,12),false);worm.worm!.flash![0]=0;
worm.segTears=[0];assert.equal(nativeQuietAnatomy(worm,'worm',100,12),false);worm.segTears=undefined;
Reflect.set(worm.worm!,'foreign',true);assert.equal(nativeQuietAnatomy(worm,'worm',100,12),false);Reflect.deleteProperty(worm.worm!,'foreign');
tether.movementTether!.returning=true;assert.equal(nativeQuietAnatomy(tether,'movementTether',100,12),false);tether.movementTether!.returning=false;
tether.movementTether!.anchorId=w.player.id;assert.equal(nativeQuietAnatomy(tether,'movementTether',100,12),false);tether.movementTether!.anchorId=undefined;
shell.shellGuard!.pool--;assert.equal(nativeQuietAnatomy(shell,'shellGuard',100,12),false);shell.shellGuard!.pool++;
ooze.volatileReadyAt=101;assert.equal(nativeQuietAnatomy(ooze,'volatile',100,12),false);ooze.volatileReadyAt=0;
console.log('PASS nativeQuietAnatomy exact factory eligibility and active/foreign anatomy refusals');
// The head can be distant while retained anatomy is still beside an observer.
const tail={x:50000,y:0};worm.worm!.segments[0]=tail;
d.update(w,owned);assert.ok([...owned.values()].every(a=>!d.isSleeping(a)),'near tail retains complete squad');
w.player.pos={x:80000,y:0};d.update(w,owned);assert.ok([...owned.values()].every(a=>d.isSleeping(a)));
w.player.pos={...tail};d.update(w,owned);assert.ok([...owned.values()].every(a=>!d.isSleeping(a)),'tail wakes complete squad');
w.player.pos={x:80000,y:0};d.update(w,owned);
const lease=stageNativeCohort(mass.state.run.runId,'anatomy',mass.origin,960,w,owned,[...owned.keys()],d,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:{}}));
const page:CharacterNativePage={characterNativePage:1,configHash:mass.configHash,cohort:JSON.parse(lease.body),enemies:[...owned].map(([id,a])=>({id,monster:a.defId!,level:a.level,x:a.pos.x,y:a.pos.y,life:a.life,scale:1,birth:{seed:123},ambientPack:{id:91,leader:a===worm},nativeQuietRadius:nativeQuietAnatomyRadius(a)}))};
const body=JSON.stringify(page),ref={run:mass.state.run.runId,page:'anatomy',revision:'1',key:JSON.stringify([mass.state.run.runId,'anatomy','1']),digest:'0'.repeat(64),bytes:body.length};
const entry:CharacterPageEntry={ref,ids:[...owned.keys()],positions:page.enemies.map(e=>({x:e.x,y:e.y,nativeQuietRadius:e.nativeQuietRadius}))};
const storage={readPage:async()=>body};await readCharacterNativePage(storage,entry);
const envelope=JSON.parse(encodeCharacterPages(save,[entry],entry.ids)),prepared=await preparePagedCharacterResume(envelope,storage);
assert.equal(prepared.pages.pages[0].positions[0].nativeQuietRadius,nativeQuietAnatomyRadius(worm));
const bad=structuredClone(entry);bad.positions[0].nativeQuietRadius=0;await assert.rejects(readCharacterNativePage(storage,bad),/Invalid/);
const runtime=w.massRuntime! as unknown as {paged:Map<string,CharacterPageEntry>;nearNativePages(world:ReturnType<typeof makeSimWorld>,r:number):CharacterPageEntry[]};
runtime.paged.set('test',entry);w.player.pos={...tail};assert.equal(runtime.nearNativePages(w,policy.wakeRadius).length,1,'page readiness includes remote tail');runtime.paged.clear();w.player.pos={x:80000,y:0};
const expanded=await decodeCharacterPages(envelope,storage),em=expanded.world!.worldmass!;
assert.notEqual(em.enemies[0].ambientPack!.id,91,'portable transport remaps squad IDs');
const aw=makeSimWorld('warrior',7165),am=new WorldMassRuntime(em.state.run.seed,em.state.run.runId,em.config,em);am.attach(aw,em);
const restored=(am as unknown as {natives:Map<string,Actor>}).natives;
for(const [id,a]of owned){const b=restored.get(id)!;assert.equal(b.life,a.life);assert.deepEqual(b.worm,a.worm);assert.deepEqual(b.movementTether,a.movementTether);assert.deepEqual(b.shellGuard,a.shellGuard);assert.deepEqual(b.volatile,a.volatile);}
const hydrated=hydrateNativeCohortData(page.cohort,ref,mass.origin,960,w.player,{create:b=>w.createMonster(b.monster,b.level,'enemy'),groups:(_ids,actors)=>{for(const a of actors.values())a.squadId=777;}});
assert.deepEqual(hydrated.actors.get('bone_serpent')!.worm,worm.worm);assert.ok([...hydrated.actors.values()].every(a=>a.squadId===777));
console.log('PASS nativeQuietAnatomy whole-tail wake, exact wounded/page/portable Continue, radius preflight and ambient squad identity remap');
am.dispose();w.massRuntime!.dispose();undo();
