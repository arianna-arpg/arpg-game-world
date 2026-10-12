import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneCombatState} from '../src/worldmass/nativeAreaSceneCombatState';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {DIG_CFG} from '../src/data/digsites';
import {withSeededRandom} from '../src/core/rng';
import {nativeBirthLifetimeArchive as archive,nativeBirthLifetimeArchiveHash,nativeBirthLifetimeWorldPin} from './nativeBirthLifetimeArchive';
import {beforeNativeBirthLifetime} from './nativeBirthLifetimeFixture';
/** Actual retained births and registered progression/combat-state insertion effects.
 * Full movement and field-reward scheduling remain outside this fixture. */
import assert from 'node:assert/strict';
import {Actor} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneBirthAdmission} from '../src/worldmass/nativeAreaSceneBirthAdmission';
import {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState} from '../src/worldmass/nativeAreaSceneObjectiveWatching';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeSceneQuestRewardRuntime} from '../src/worldmass/nativeAreaSceneQuests';
import {sceneObjectiveServices} from '../src/worldmass/nativeSceneObjectives';
import {nativeBeaconConfig} from '../src/engine/beaconObjectives';
import {nativeProcessionConfig} from '../src/engine/processionObjectives';
import {QUESTS} from '../src/quests/defs';
import {newQuestLedger} from '../src/engine/questLedger';

function fixture(){
 const w=makeSimWorld('warrior',92717);w.time=100;(w as any).questSeat=null;w.ownQuestLedger=newQuestLedger();w.ledger={};w.account.ledger={};
 const definition={...w.zone,id:'admission-area',level:1,objective:{kind:'clear'},packs:{table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]}} as typeof w.zone;
 w.zoneMap[definition.id]=definition;
 const raw=freshAssemblyInput(w,definition),campaign=raw.campaign as any;
 for(const key of [...Object.keys(campaign),'ownQuestLedger','questLedgerOverride','questSeat','seatNoteAt','accountDirty','actingSeat','odyssey']){
  if(typeof (w as any)[key]==='function'||key==='massRuntime'||key==='nativeResidentHistory')continue;
  Object.defineProperty(campaign,key,{configurable:true,enumerable:true,get(){return (w as any)[key];},set(v){(w as any)[key]=v;}});
 }
 for(const key of ['notice','markMetaDirty','sameParty','seatHero','seatHudOf','seatOf','questLedgerOf','forechartSounding','invalidateZonesSaveMemo','presentWorlds','keeperCampaign','odysseyLeads'])campaign[key]=(...args:any[])=>(w as any)[key](...args);
 const area=new NativeAreaSceneAssembly(raw),i=area.input,scene=i.scene,geometry=i.geometry;
 scene.player.pos={x:500,y:500};
 const authority=new NativeAreaActorAuthority<NativeSceneQuestRewardRuntime & {progression:NativeAreaSceneProgression}>(campaign);
 const progression=new NativeAreaSceneProgression({scene,population:i.population,ecology:i.ecology,geometry,runtime:i.registry.input.birth,loot:area.lootController,campaign,state:freshSceneProgressionState(),authority:authority as unknown as NativeSceneProgressionAuthority});
 const binding=authority.register(scene,{loot:area.lootController,objective:area.objectiveController,progression});authority.claim(binding,scene.actors);area.scenePresence.activate(authority);
 const combatState=new NativeAreaSceneCombatState({scene,population:i.population,campaign,progression,authority});
 const admission=new NativeAreaSceneBirthAdmission({authority,scene,population:i.population});
 const os=sceneObjectiveServices(i.population,i.objectives,{get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},notice:geometry.notice.bind(geometry),text:geometry.text.bind(geometry),pathField:geometry.pathField.bind(geometry),farPoint:geometry.farPoint.bind(geometry),pointInSolid:geometry.pointInSolid.bind(geometry),farthestStand:geometry.farthestStand.bind(geometry)});
 const watcher=new NativeAreaSceneObjectiveWatching({authority,scene,geometry,population:i.population,objectives:i.objectives,state:freshSceneObjectiveWatchingState(0),birthState:i.state,environment:i.environment,physical:i.physical,completion:area.objectiveController,loot:area.lootController,graph:area.graph,coast:i.coast,theater:i.theater,adoption:i.adoption,objectiveServices:os,campaign,quests:{nearestHand:()=>w.localSeat},movement:{moveActor(){throw Error('Test did not supply movement');}}});
 const quests=new NativeAreaSceneQuests({authority,scene,geometry,population:i.population,physical:i.physical,loot:area.lootController,bounty:i.bounty,graph:area.graph,coast:i.coast,runtimeBirth:i.registry.input.birth,campaign,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,progression:raw.services.objectiveProgression,interaction:geometry,characterWriter:w});
 const stone=()=>({pos:{x:500,y:500},doodad:{kind:'rift_tear',pos:{x:500,y:500},radius:20,tier:0},charge:0,recoup:0,pourAt:1});
 const rescue=()=>{const q=Object.values(QUESTS).find(q=>q.rescue)!;w.questLedgerOf(w.localSeat).active.push({questId:q.id,zoneId:scene.zone.id,fieldDone:false});return q;};
 function checkBirth(operation:()=>unknown,tag?:string){const before=new Set(scene.actors);const result=operation(),born=scene.actors.filter(a=>!before.has(a));assert.ok(born.length,'native operation must really insert bodies');for(const a of born){assert.equal(authority.require(a).scene,scene);if(tag)assert.equal(a.tag,tag);}authority.assertAdmitted(scene);return {result,born};}
 return {w,area,i,scene,geometry,campaign,authority,binding,admission,watcher,quests,stone,rescue,checkBirth,progression,combatState};
}

type Fixture=ReturnType<typeof fixture>;
const courses:string[]=[],hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');
function course(name:string,run:(f:Fixture)=>void){const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);if(process.argv.some(a=>a.startsWith('--descriptor-only')||a.startsWith('--boundary-only'))||process.argv.includes('--async-only')||(only&&!name.includes(only)))return;withSeededRandom(370001,()=>run(fixture()));courses.push(name);console.log('PASS birth lifetime: '+name);}
const monster=(f:Fixture)=>f.admission.createMonster('goblin_skirmisher',1,'enemy');
const inserted=(f:Fixture,body:Actor)=>{f.scene.actors.push(body);f.admission.admitInserted(body);assert.equal(f.authority.require(body).scene,f.scene);};
const escaped=(f:Fixture)=>{let selected!:typeof f.i.population.createMonster;f.admission.run(()=>{selected=f.admission.createMonster;});const before=f.scene.actors.length;f.admission.run(()=>{assert.throws(()=>selected('skeleton_warrior',1,'enemy'),/exact top frame/,'expired selected factory must refuse inside a later run');});assert.equal(f.scene.actors.length,before);};
const foreign=(f:Fixture)=>{const b=fixture();let body:Actor|undefined;f.i.population.createMonster=()=>body=b.i.population.createMonster('skeleton_warrior',1,'enemy');const before=f.scene.actors.length;f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/,'real foreign factory body must refuse'));assert.ok(body);assert.equal(f.scene.actors.length,before);assert.ok(!b.scene.actors.includes(body));f.authority.assertUnclaimed(body);b.authority.assertUnclaimed(body);};
if(process.argv.includes('--negative-escaped')){course('expired selection refusal',escaped);process.exit(0);}
if(process.argv.includes('--negative-foreign')){course('foreign actual factory refusal',foreign);process.exit(0);}
course('whole original source provenance and exact explicit hook reversal',()=>{
 assert.equal(hash(JSON.stringify(archive)),nativeBirthLifetimeArchiveHash);
 let hooks=0;
 for(const row of archive.files){const prior=execFileSync('git',['show',archive.originalCommit+':'+row.file],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),source=read(row.file);assert.equal(hash(prior),row.beforeHash);assert.equal(prior,row.beforeSource);assert.equal(hash(source),row.afterHash);assert.equal(beforeNativeBirthLifetime(row.file,source),prior);hooks+=(source.match(/\.admitBirth\?\./g)||[]).length;
  for(const edit of row.edits){assert.throws(()=>beforeNativeBirthLifetime(row.file,source.replace(edit.after,edit.after+'\n'+edit.after)),/Exact unique/);assert.throws(()=>beforeNativeBirthLifetime(row.file,source.replace(edit.after,edit.after.replace(/\S/,'~'))),/Exact unique/);}
 }
 assert.equal(hooks,8);const w=execFileSync('git',['show',nativeBirthLifetimeWorldPin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n');assert.equal(read('src/engine/world.ts'),w,'World is unchanged by explicit local insertion hooks');
});
course('expired selection refuses in later operation',escaped);
course('foreign actual factory cannot mint into this area',foreign);
course('selected live wrapper keeps receiver and ignores own apply',f=>{
 const population=f.i.population,native=population.createMonster,tape:string[]=[];
 const before=function(this:NativeAreaScenePopulation,...args:Parameters<typeof native>){assert.equal(this,population);tape.push('old');return Reflect.apply(native,this,args);};
 Object.defineProperty(before,'apply',{get(){throw Error('selected callable apply must not be read');}});
 const after=function(this:NativeAreaScenePopulation,...args:Parameters<typeof native>){assert.equal(this,population);tape.push('new');return Reflect.apply(native,this,args);};
 Object.defineProperty(population,'createMonster',{configurable:true,get(){tape.push('select');return before;}});
 f.admission.run(()=>{const selected=f.admission.createMonster;Object.defineProperty(population,'createMonster',{configurable:true,writable:true,value:after});inserted(f,selected('goblin_skirmisher',1,'enemy'));inserted(f,monster(f));});assert.deepEqual(tape,['select','old','new']);
});
course('factory selection precedes argument evaluation with true live receiver',f=>{
 const population=f.i.population,native=population.createMonster,tape:string[]=[];
 population.createMonster=function(...args){tape.push('old');assert.equal(this,population);return Reflect.apply(native,this,args);};
 f.admission.run(()=>{const body=f.admission.createMonster((tape.push('argument'),population.createMonster=function(...args){tape.push('new');return Reflect.apply(native,this,args);},'goblin_skirmisher'),1,'enemy');inserted(f,body);inserted(f,monster(f));});assert.deepEqual(tape,['argument','old','new']);
});
course('private concrete attestation ignores overridden public attestation method',f=>{
 let called=false;(f.i.population as any).createMonsterForAdmission=()=>{called=true;throw Error('fake attestation');};f.admission.run(()=>inserted(f,monster(f)));assert.equal(called,false);
});
course('factory provenance cannot be copied from old arbitrary or independently captured bodies',f=>{
 const population=f.i.population,actual=population.createMonster;
 const bodies=[new Actor('forged','enemy',{x:500,y:500}),population.createMonster('goblin_skirmisher',1,'enemy'),population.createMonsterForAdmission(actual,['goblin_skirmisher',1,'enemy'])];
 for(const body of bodies){population.createMonster=()=>body;f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));f.authority.assertUnclaimed(body);}
 population.createMonster=actual;
});
course('fresh exact body is unclaimed before insertion and cannot be admitted twice',f=>{
 f.admission.run(()=>{const body=monster(f);f.authority.assertUnclaimed(body);assert.ok(!f.scene.actors.includes(body));assert.throws(()=>f.admission.admitInserted(body),/actual inserted body/);inserted(f,body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);});
});
course('nested frames expire closures while transferring true child bodies to their parent',f=>{
 let outer!:typeof f.i.population.createMonster,child!:typeof outer,body!:Actor;
 f.admission.run(()=>{outer=f.admission.createMonster;body=f.admission.run(()=>{child=f.admission.createMonster;assert.throws(()=>outer('goblin_skirmisher',1,'enemy'),/exact top frame/);return monster(f);});assert.throws(()=>child('goblin_skirmisher',1,'enemy'),/exact top frame/);inserted(f,body);inserted(f,outer('goblin_skirmisher',1,'enemy'));});
 assert.throws(()=>child('goblin_skirmisher',1,'enemy'),/exact top frame/);
});
course('failed nested creation expires unused receipts but preserves prior actual bodies',f=>{
 let body!:Actor;
 f.admission.run(()=>{assert.throws(()=>f.admission.run(()=>{body=monster(f);throw Error('native child failed');}),/native child failed/);f.authority.assertUnclaimed(body);f.scene.actors.push(body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);});
});
course('finished outer operation expires uninserted body receipts',f=>{
 const body=f.admission.run(()=>monster(f));f.authority.assertUnclaimed(body);
 f.admission.run(()=>{f.scene.actors.push(body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);});
});
course('claimed foreign and same numeric identity bodies do not acquire local authority',f=>{
 const other=fixture(),body=other.i.population.createMonster('goblin_skirmisher',1,'enemy');body.id=f.scene.player.id;other.scene.actors.push(body);other.authority.claim(other.binding,[body]);f.i.population.createMonster=()=>body;f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));assert.equal(other.authority.require(body).scene,other.scene);assert.ok(!f.scene.actors.includes(body));
});
course('partial native creation and insertion errors retain exact prior writes',f=>{
 let first!:Actor,uninserted!:Actor;
 assert.throws(()=>f.admission.run(()=>{first=monster(f);inserted(f,first);uninserted=monster(f);uninserted.tag='native-before-error';throw Error('after native creation');}),/after native creation/);
 assert.equal(f.authority.require(first).scene,f.scene);assert.equal(uninserted.tag,'native-before-error');f.authority.assertUnclaimed(uninserted);assert.ok(!f.scene.actors.includes(uninserted));
 let exceptional!:Actor;assert.throws(()=>f.admission.run(()=>{exceptional=monster(f);f.scene.actors.push(exceptional);throw Error('after raw insertion');}),/after raw insertion/);assert.equal(f.authority.require(exceptional).scene,f.scene);f.authority.assertAdmitted(f.scene);
});
course('frozen raw census keeps native push failure and minted body side effects',f=>{
 const raw=f.scene.actors;Object.freeze(raw);let body!:Actor;
 assert.throws(()=>f.admission.run(()=>{body=monster(f);body.tag='before frozen push';f.scene.actors.push(body);}),TypeError);assert.equal(f.scene.actors,raw);assert.equal(body.tag,'before frozen push');f.authority.assertUnclaimed(body);assert.ok(!raw.includes(body));
});
course('child final admission failure cannot transfer uninserted receipts',f=>{
 let body!:Actor;const rogue=new Actor('unowned','enemy',{x:1,y:1});
 f.admission.run(()=>{
  assert.throws(()=>f.admission.run(()=>{body=monster(f);f.scene.actors.push(rogue);return body;}),/unowned or borrowed/);
  f.scene.actors.splice(f.scene.actors.indexOf(rogue),1);f.scene.actors.push(body);
  assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);f.authority.assertUnclaimed(body);
 });
});
course('native dig ambush insertion is admitted through the unchanged objective driver',f=>{
 f.scene.zone.objective={kind:'unearth',digSec:1,contest:false};const stone=f.stone();stone.doodad.kind=DIG_CFG.kind;f.geometry.doodads.push(stone.doodad);f.geometry.markDoodadsChanged();f.i.objectives.digs.push(stone);
 // A second distant mound keeps this course on birth rather than field reward dependencies.
 const remaining=f.stone();remaining.pos={x:1500,y:1500};remaining.doodad.pos=remaining.pos;f.i.objectives.digs.push(remaining);
 const prior=Math.random;Math.random=()=>0;try{f.checkBirth(()=>f.watcher.updateObjective(2));}finally{Math.random=prior;}
 assert.equal(stone.doodad.kind,DIG_CFG.kindDug);
});
const inst=()=>makeSkillInstance(Object.values(SKILLS).find(s=>s.effects.length)!,1);
function guardedBuff(f:Fixture,body:Actor){assert.equal(f.authority.require(body).progression,f.progression);f.combatState.applyBuffEffect(body,inst(),{type:'buff',id:'birth-lifetime-immediate',duration:2,mods:[]},1);assert.ok(body.buffs.has('birth-lifetime-immediate'));}
course('actual native wave body receives registered combat-state effect before next creation',f=>{
 const population=f.i.population,create=population.createMonster,before=new Set(f.scene.actors);let checks=0;
 population.createMonster=function(...args){for(const body of f.scene.actors)if(!before.has(body)&&!body.buffs.has('birth-lifetime-immediate')){guardedBuff(f,body);checks++;}return Reflect.apply(create,this,args);};
 f.scene.zone.objective={kind:'waves',waves:2};f.watcher.spawnWave();assert.ok(checks>0);f.authority.assertAdmitted(f.scene);
});
course('native rescue dressing observes immediate physical admission and actual guarded effect',f=>{
 f.rescue();const population=f.i.population,create=population.createMonster;let checks=0;
 population.createMonster=function(...args){const body=Reflect.apply(create,this,args);let name=body.name;Object.defineProperty(body,'name',{configurable:true,enumerable:true,get:()=>name,set(v){guardedBuff(f,body);checks++;name=v;}});return body;};f.quests.rescues.update();assert.equal(checks,1);
});
course('every existing native spawn path preserves census and gains ownership',f=>{
 const raw=f.scene.actors;f.scene.zone.objective={kind:'escape',interval:[1,1]};f.watcher.input.state.escapeTimer=0;f.checkBirth(()=>f.watcher.updateObjective(1));
 f.scene.zone.objective={kind:'waves',waves:3,bossEveryWaves:1,bossId:'skeleton_warrior'};f.checkBirth(()=>f.watcher.spawnWave());
 f.scene.zone.objective={kind:'rifts',sealSec:5};f.i.objectives.rifts.push(f.stone());f.checkBirth(()=>f.watcher.updateRiftPours({kind:'rifts',sealSec:5}));
 const host=f.watcher.nativeBeaconHost(),cfg=nativeBeaconConfig({kind:'beacon'}).reinforce;assert.ok(cfg);f.checkBirth(()=>host.spawn(f.stone(),2,cfg,{native:[{id:'goblin_skirmisher',weight:1}],mix:[]}));
 f.checkBirth(()=>f.watcher.spawnProcessionAmbush(f.scene.player,0,2,nativeProcessionConfig({kind:'procession'})));
 f.rescue();f.checkBirth(()=>f.quests.rescues.update());assert.equal(f.scene.actors,raw);
});
async function asyncProof(){const events:unknown[]=[],listener=(e:unknown)=>events.push(e);process.on('unhandledRejection',listener);const f=fixture(),raw=f.scene.actors,before=raw.length;let expired!:typeof f.i.population.createMonster,created!:Actor;
 try{
  assert.throws(()=>f.admission.run(async()=>{throw Error('rejected before await');}),/synchronous operation/);
  assert.throws(()=>f.admission.run(async()=>{expired=f.admission.createMonster;created=monster(f);created.tag='native prior effect';await Promise.resolve();expired('goblin_skirmisher',1,'enemy');}),/synchronous operation/);
  assert.throws(()=>f.admission.run(()=>new Promise((_,reject)=>setTimeout(()=>reject(Error('later turn rejection')),2))),/synchronous operation/);
  let getter=0,called=0;const then=function(this:unknown){assert.equal(this,result);called++;assert.throws(()=>expired('goblin_skirmisher',1,'enemy'),/exact top frame/);return Promise.reject(Error('returned then rejection'));};Object.defineProperty(then,'apply',{get(){throw Error('then.apply must not be read');}});const result={get then(){getter++;return then;}};assert.throws(()=>f.admission.run(()=>result),/synchronous operation/);
  const population=f.i.population,actual=population.createMonster;let factoryGetter=0,factoryThen=0;
  population.createMonster=(()=>Promise.reject(Error('async factory immediate rejection'))) as unknown as typeof actual;
  f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));
  population.createMonster=(()=>Promise.resolve().then(()=>expired('goblin_skirmisher',1,'enemy'))) as unknown as typeof actual;
  f.admission.run(()=>{expired=f.admission.createMonster;assert.throws(()=>monster(f),/foreign or reused/);});
  const factoryResult={get then(){factoryGetter++;return function(this:unknown){assert.equal(this,factoryResult);factoryThen++;assert.throws(()=>expired('goblin_skirmisher',1,'enemy'),/exact top frame/);return Promise.reject(Error('factory then return rejected'));};}};
  population.createMonster=(()=>factoryResult) as unknown as typeof actual;f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));population.createMonster=actual;
  await new Promise<void>(r=>setImmediate(r));await new Promise<void>(r=>setTimeout(r,15));await new Promise<void>(r=>setImmediate(r));
  assert.deepEqual(events,[],'caught asynchronous scope misuse must not create unhandled rejection');assert.equal(getter,1);assert.equal(called,1);assert.equal(factoryGetter,1);assert.equal(factoryThen,1);assert.equal(f.scene.actors,raw);assert.equal(raw.length,before);assert.equal(created.tag,'native prior effect');f.authority.assertUnclaimed(created);f.authority.assertAdmitted(f.scene);
 }finally{process.removeListener('unhandledRejection',listener);}
 courses.push('async refusal observes all rejected continuations after exact scope expiry');console.log('PASS birth lifetime: async refusal observes all rejected continuations after exact scope expiry');
}
/** Separate successor evidence: the original twenty-course receipt stays intact. */
async function asyncBoundaryProof(){
 const completed:string[]=[];
 async function boundary(name:string,run:(f:Fixture)=>void){
  const selected=process.argv.find(a=>a.startsWith('--boundary-only='))?.slice('--boundary-only='.length);
  if(selected&&!name.includes(selected))return;
  const events:unknown[]=[],listener=(e:unknown)=>events.push(e),f=fixture(),raw=f.scene.actors,before=[...raw];process.on('unhandledRejection',listener);
  try{
   run(f);
   await new Promise<void>(r=>setImmediate(r));await new Promise<void>(r=>setTimeout(r,15));await new Promise<void>(r=>setImmediate(r));
   assert.deepEqual(events,[],'caught poisoned then must not leave an actual Promise rejection unhandled');
   assert.equal(f.scene.actors,raw);assert.deepEqual(raw,before);f.authority.assertAdmitted(f.scene);
  }finally{process.removeListener('unhandledRejection',listener);}
  completed.push(name);console.log('PASS birth async boundary: '+name);
 }
 await boundary('throwing operation getter preserves exact error and prior body effects',f=>{
  const exact=Error('operation then getter'),p=Promise.reject(Error('hidden operation rejection'));let reads=0,body!:Actor,expired!:typeof f.i.population.createMonster;
  Object.defineProperty(p,'then',{get(){reads++;throw exact;}});
  assert.throws(()=>f.admission.run(()=>{expired=f.admission.createMonster;body=monster(f);body.tag='prior native write';return p;}),e=>e===exact);
  assert.equal(reads,1);assert.equal(body.tag,'prior native write');f.authority.assertUnclaimed(body);assert.throws(()=>expired('goblin_skirmisher',1,'enemy'),/exact top frame/);
 });
 await boundary('throwing factory getter preserves exact error and private creation effects',f=>{
  const population=f.i.population,actual=population.createMonster,exact=Error('factory then getter'),p=Promise.reject(Error('hidden factory rejection'));let reads=0,body!:Actor;
  Object.defineProperty(p,'then',{get(){reads++;throw exact;}});
  population.createMonster=function(...args){body=Reflect.apply(actual,this,args);body.tag='factory prior write';return p as unknown as Actor;};
  f.admission.run(()=>assert.throws(()=>monster(f),e=>e===exact));population.createMonster=actual;
  assert.equal(reads,1);assert.equal(body.tag,'factory prior write');f.authority.assertUnclaimed(body);
 });
 await boundary('noncallable operation then refuses and never transfers nested receipts',f=>{
  for(const hidden of [undefined,null,7]){
   const p=Promise.reject(Error('hidden nested operation rejection'));let reads=0,body!:Actor;Object.defineProperty(p,'then',{get(){reads++;return hidden;}});
   f.admission.run(()=>{
    assert.throws(()=>f.admission.run(()=>{body=monster(f);body.tag='child prior write';return p;}),/requires a synchronous operation/);
    f.scene.actors.push(body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);
   });assert.equal(reads,1);assert.equal(body.tag,'child prior write');f.authority.assertUnclaimed(body);
  }
 });
 await boundary('noncallable factory then is observed and invalid body still refuses',f=>{
  const population=f.i.population,actual=population.createMonster;
  for(const hidden of [undefined,null,7]){const p=Promise.reject(Error('hidden factory rejection'));let reads=0;Object.defineProperty(p,'then',{get(){reads++;return hidden;}});population.createMonster=(()=>p) as unknown as typeof actual;
   f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));assert.equal(reads,1);
  }population.createMonster=actual;
 });
 await boundary('cross realm and altered prototype retain descriptor refusal and intrinsic observation',f=>{
  for(const factory of [false,true])for(const altered of [false,true]){
   const p=runInNewContext('Promise.reject(new Error("cross realm rejection"))') as Promise<unknown>;if(altered)Object.setPrototypeOf(p,null);
   let reads=0;Object.defineProperty(p,'then',{get(){reads++;return undefined;}});
   if(factory){const population=f.i.population,actual=population.createMonster;population.createMonster=(()=>p) as unknown as typeof actual;f.admission.run(()=>assert.throws(()=>monster(f),/foreign or reused/));population.createMonster=actual;}
   else assert.throws(()=>f.admission.run(()=>p),/requires a synchronous operation/);
   assert.equal(reads,1);
  }
  const p=Promise.reject(Error('inherited descriptor rejection'));Object.setPrototypeOf(p,{then:undefined});assert.throws(()=>f.admission.run(()=>p),/requires a synchronous operation/);
 });
 await boundary('constructor and species observation occurs only after every frame expires',f=>{
  let outer!:typeof f.i.population.createMonster,child!:typeof outer,constructorReads=0,speciesReads=0,speciesCalls=0;
  const expired=()=>{assert.throws(()=>outer('goblin_skirmisher',1,'enemy'),/exact top frame/);assert.throws(()=>child('goblin_skirmisher',1,'enemy'),/exact top frame/);};
  class Species extends Promise<unknown>{constructor(executor:ConstructorParameters<typeof Promise<unknown>>[0]){expired();speciesCalls++;super(executor);}}
  const p=Promise.reject(Error('species observed rejection'));Object.defineProperty(p,'then',{value:undefined});Object.defineProperty(p,'constructor',{get(){expired();constructorReads++;return{get [Symbol.species](){expired();speciesReads++;return Species;}};}});
  f.admission.run(()=>{outer=f.admission.createMonster;assert.throws(()=>f.admission.run(()=>{child=f.admission.createMonster;return p;}),/requires a synchronous operation/);assert.equal(constructorReads,0);assert.equal(speciesReads,0);assert.equal(speciesCalls,0);});
  queueMicrotask(()=>{assert.equal(constructorReads,1);assert.equal(speciesReads,1);assert.equal(speciesCalls,1);});
 });
 await boundary('plain native results preserve identity and unsupported stripped Promise is explicit',f=>{
  const array:Actor[]=[],plain={filled:0,contested:0,draining:0,recouping:0};for(const result of [array,plain,undefined,null,0,false,'native'])assert.equal(f.admission.run(()=>result),result);
  const body=f.admission.run(()=>monster(f));f.authority.assertUnclaimed(body);
  // Descriptor presence is a conservative refusal policy, never a brand claim.
  assert.throws(()=>f.admission.run(()=>({then:undefined})),/requires a synchronous operation/);
  // Standard JavaScript has no side-effect-free universal Promise brand test.
  // A completely stripped Promise without then is outside this API's contract.
  const stripped=Promise.resolve(1);Object.setPrototypeOf(stripped,null);assert.equal(f.admission.run(()=>stripped),stripped);
 });
 console.log('PASS native birth async boundary: '+completed.length+' groups; receipt '+hash(JSON.stringify(completed)));
}
/** Separate post-review repair evidence; original20 and boundary7 stay separate. */
async function descriptorRepairProof(){
 const completed:string[]=[];let cases=0;
 for(const [name,shapes] of [['own getter deletion cannot conceal an entered asynchronous result',['own']],['inherited descriptor deletion and prototype replacement cannot conceal an entered asynchronous result',['inherited-delete','prototype-replace']]] as const){
  const selected=process.argv.find(a=>a.startsWith('--descriptor-only='))?.slice('--descriptor-only='.length);if(selected&&!name.includes(selected))continue;
  const f=fixture(),raw=f.scene.actors,before=[...raw],events:unknown[]=[],listener=(e:unknown)=>events.push(e),later:(()=>void)[]=[];let failure:unknown;process.on('unhandledRejection',listener);
  try{
   try{for(const shape of shapes)for(const crossRealm of [false,true])for(const route of ['operation','factory'])for(const throws of [false,true]){
    if(process.argv.includes('--descriptor-factory')&&route!=='factory')continue;
    const p=(crossRealm?runInNewContext('Promise.reject(new Error("hidden descriptor rejection"))'):Promise.reject(Error('hidden descriptor rejection'))) as Promise<unknown>,proto={};Object.setPrototypeOf(p,proto);
    const exact=Error('exact self-removing getter error');let reads=0,constructorReads=0,outer!:typeof f.i.population.createMonster,child!:typeof outer,body!:Actor;
    Object.defineProperty(p,'constructor',{get(){constructorReads++;assert.throws(()=>outer('goblin_skirmisher',1,'enemy'),/exact top frame/);assert.throws(()=>child('goblin_skirmisher',1,'enemy'),/exact top frame/);return Promise;}});
    const target=shape==='own'?p:proto;Object.defineProperty(target,'then',{configurable:true,get(){reads++;if(shape==='prototype-replace')Object.setPrototypeOf(p,null);else Reflect.deleteProperty(target,'then');if(throws)throw exact;return undefined;}});
    if(route==='operation'){
     f.admission.run(()=>{outer=f.admission.createMonster;assert.throws(()=>f.admission.run(()=>{child=f.admission.createMonster;body=monster(f);body.tag='native descriptor prior effect';return p;}),throws?(e:unknown)=>e===exact:/requires a synchronous operation/);
      f.scene.actors.push(body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);assert.equal(constructorReads,0);
     });
    }else{
     const population=f.i.population,actual=population.createMonster;population.createMonster=function(...args){body=Reflect.apply(actual,this,args);body.tag='native descriptor prior effect';return p as unknown as Actor;};
     try{f.admission.run(()=>{outer=child=f.admission.createMonster;assert.throws(()=>monster(f),throws?(e:unknown)=>e===exact:/foreign or reused/);assert.equal(constructorReads,0);
      f.scene.actors.push(body);assert.throws(()=>f.admission.admitInserted(body),/unused body/);f.scene.actors.splice(f.scene.actors.indexOf(body),1);
     });}finally{population.createMonster=actual;}
    }
    assert.equal(reads,1);assert.equal(constructorReads,0);assert.equal(body.tag,'native descriptor prior effect');f.authority.assertUnclaimed(body);
    later.push(()=>{assert.equal(reads,1);assert.equal(constructorReads,1);f.authority.assertUnclaimed(body);});cases++;
   }}catch(error){failure=error;}
   // Even a negative control flushes rejection events before reporting its
   // intended refusal assertion, rather than hiding it behind process shutdown.
   await new Promise<void>(r=>setImmediate(r));await new Promise<void>(r=>setTimeout(r,15));await new Promise<void>(r=>setImmediate(r));
   if(failure)throw failure;assert.deepEqual(events,[],'self-removing then must not leave an actual Promise rejection unhandled');for(const check of later)check();
   assert.equal(f.scene.actors,raw);assert.deepEqual(raw,before);f.authority.assertAdmitted(f.scene);
  }finally{process.removeListener('unhandledRejection',listener);}
  completed.push(name);console.log('PASS birth descriptor repair: '+name);
 }
 console.log('PASS native birth descriptor repair: '+completed.length+' groups; '+cases+' cases; receipt '+hash(JSON.stringify(completed)));
}
(async()=>{if(!process.argv.some(a=>a.startsWith('--descriptor-only'))){if(!process.argv.some(a=>a.startsWith('--boundary-only'))){await asyncProof();console.log('PASS native birth lifetime: '+courses.length+' groups; receipt '+hash(JSON.stringify(courses)));}await asyncBoundaryProof();}if(!process.argv.some(a=>a.startsWith('--boundary-only')))await descriptorRepairProof();})().catch(e=>{console.error(e);process.exitCode=1;});
