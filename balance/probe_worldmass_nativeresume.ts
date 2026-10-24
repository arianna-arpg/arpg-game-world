import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import type {Actor} from '../src/engine/actor';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {massAdventure,MASS_ZONE,type MassAdventure} from '../src/worldmass/preset';
import {stageNativeCohort,hydrateNativeCohortData,type NativeCohortPage} from '../src/worldmass/nativePaging';
import {selectNativeCheckpoint,type CharacterPageEntry,type CharacterNativePage} from '../src/meta/characterPages';
import type {MassResidentResume} from '../src/meta/characterResume';
import type {MassBirths} from '../src/worldmass/birth';
import {MassGeographicGameplay} from '../src/worldmass/geographicGameplay';
import {MassNativeCountry} from '../src/worldmass/nativeCountry';
import {MassNativeResidency,type NativeFeaturePlacement} from '../src/worldmass/nativeResidency';
import {MassNativeHost,nativeWorldCapabilities} from '../src/worldmass/nativeHost';
import {address,moveAddress} from '../src/worldmass/address';
import {serializeCharacter,writeCharacterMirrorRaw,CHAR_SLOT,readCharacterResume,applyCharacterResumeFields,
 bindCharacterResumePages,characterNativeSessionToken,characterNativeSessionCurrent} from '../src/meta/character';

// This is a controlled transport/runtime test. BrowserRunStore authority,
// immutable-page digests and real cold reopen are covered by native-resume-ui.
interface Inspect {
 natives:Map<string,Actor>;paged:Map<string,CharacterPageEntry>;births:MassBirths;
 attached:boolean;pagingReads:Map<string,Promise<void>>;pagingRetry:Map<string,number>;
 readNativePage(page:CharacterPageEntry):Promise<CharacterNativePage>;
}
const inspect=(m:WorldMassRuntime)=>m as unknown as Inspect;
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const undo=seedGlobalRandom(513713),full=massAdventure();
const cfg:MassAdventure={terrain:{...full.terrain,places:[]},theme:full.theme,content:[],startRadius:256,
 populationRadius:1300,maxPopulation:96,pageRadius:1,samplesPerTick:1,
 nativeBirthSource:'native-resume-runtime-proof',dormancy:{source:'resume-proof',wakeRadius:1600,sleepRadius:3200,quietSeconds:12}};
// The transport fixture deliberately has no generated content owners.
delete cfg.terrain.nativeRegional;delete cfg.terrain.regionalDiscoveries;
const source=makeSimWorld('warrior',513713),original=new WorldMassRuntime(513713,'resume-proof',cfg);original.attach(source);source.time=100;
for(let i=0;i<6;i++){
 const id='resume-body/'+i,a=inspect(original).births.create(source,id,'gnoll_prowler',3);
 a.fromZoneGen=true;a.pos={x:i<3?i*70:10000+i*70,y:60};a.aiAnchor={...a.pos};a.life*=.45+i*.04;
 inspect(original).natives.set(id,a);source.actors.push(a);
}
source.player.pos={x:30000,y:0};original.dormancy!.update(source,inspect(original).natives);
const saved=original.snapshot(source);assert.equal(saved.dormancy!.sleeping.length,6);
const entries:CharacterPageEntry[]=[],data=new Map<string,CharacterNativePage>();
for(let i=0;i<4;i++){
 const id='resume-body/'+i,enemy=saved.enemies.find(e=>e.id===id)!;
 const lease=stageNativeCohort(saved.state.run.runId,'cohort/'+i,saved.origin,cfg.terrain.addressSpan,source,
  inspect(original).natives,[id],original.dormancy!,(id,a)=>({id,monster:a.defId!,level:a.level,provenance:enemy}));
 const cohort=JSON.parse(lease.body) as NativeCohortPage,run=cohort.run,page=cohort.page,revision='1';
 const entry={ref:{run,page,revision,key:JSON.stringify([run,page,revision]),digest:'0'.repeat(64),bytes:lease.body.length},ids:[id],positions:[{x:enemy.x,y:enemy.y}]};
 entries.push(entry);data.set(entry.ref.key,{characterNativePage:1,configHash:saved.configHash,cohort,enemies:[enemy]});
}
const {enemies:_enemies,dormancy:_dormancy,...definition}=saved;
const kept=new Set(saved.enemies.slice(4).map(e=>e.id));
const resident:MassResidentResume={definition:{...definition,player:{x:0,y:60}},
 residentEnemies:saved.enemies.filter(e=>kept.has(e.id)),residentDormancy:selectNativeCheckpoint(saved.dormancy!,kept)};
function build(input=resident){
 const w=makeSimWorld('warrior',513713);w.time=100;const m=new WorldMassRuntime(513713,'resume-proof',cfg,input);
 m.attach(w,input,{restoreOnly:true});for(const e of entries)for(const id of e.ids)inspect(m).paged.set(id,e);
 let factories=0;const native=w.createMonster.bind(w);w.createMonster=((...args:Parameters<typeof w.createMonster>)=>{factories++;return native(...args);}) as typeof w.createMonster;
 return {w,m,get factories(){return factories;}};
}
const turn=async()=>{await new Promise<void>(resolve=>setImmediate(resolve));};
{
 const r=build();assert.equal(inspect(r.m).attached,false);assert.equal(r.m.resumePending,true);
 const baseline=r.m.snapshot(r.w);r.m.update(r.w,true);assert.deepEqual(r.m.snapshot(r.w),baseline,'restore-only update makes no admissions/exploration');
 const waiting=new Map<string,(value:CharacterNativePage)=>void>();let reads=0,scopes=0;
 inspect(r.m).readNativePage=e=>{reads++;return new Promise(resolve=>waiting.set(e.ref.key,resolve));};
 const policyScope=r.w.withGlobalPolicies.bind(r.w);r.w.withGlobalPolicies=action=>{scopes++;return policyScope(action);};
 const ready=r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>true});await turn();
 assert.equal(reads,2);assert.equal(r.factories,0);assert.equal(r.m.nativeReadiness(r.w).status,'pending');
 waiting.get(entries[1].ref.key)!(clone(data.get(entries[1].ref.key)!));await turn();
 assert.equal(reads,3,'third near cohort waits for one of two read slots');
 waiting.get(entries[0].ref.key)!(clone(data.get(entries[0].ref.key)!));waiting.get(entries[2].ref.key)!(clone(data.get(entries[2].ref.key)!));await ready;
 assert.equal(r.factories,3);assert.equal(reads,3,'distant page never decoded or instantiated');assert.equal(scopes,3);
 assert.equal(inspect(r.m).paged.size,1);assert.equal(inspect(r.m).attached,false,'prepare does not publish gameplay readiness');
 for(const e of saved.enemies.slice(0,3))assert.equal(inspect(r.m).natives.get(e.id)!.life,e.life);
 r.m.finishResume(r.w);assert.equal(r.m.resumePending,false);assert.equal(inspect(r.m).attached,true);assert.equal(r.m.nativeReadiness(r.w).status,'ready');
 assert.equal(r.w.kills,0);r.m.dispose();
 console.log('PASS explicit restore-only keeps claims without births; at most two near reads, detached exact wounds and scoped factories; far page stays metadata-only');
}
{
 const r=build();let reads=0;inspect(r.m).readNativePage=async()=>{reads++;throw Error('immutable page temporarily unavailable');};
 await assert.rejects(r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>true}),/temporarily unavailable/);await turn();
 const refused=r.m.nativeReadiness(r.w);assert.equal(refused.status,'refused');assert.equal(refused.retryable,true);assert.equal(r.factories,0);
 assert.equal(inspect(r.m).paged.size,4);assert.equal(r.m.nativeReadiness(r.w),refused,'stable error state identity');
 const time=r.w.time;r.m.update(r.w,true);assert.equal(r.w.time,time);assert.equal(inspect(r.m).paged.size,4);
 inspect(r.m).readNativePage=async e=>clone(data.get(e.ref.key)!);r.m.retryNativePages(r.w);
 await r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>true});r.m.finishResume(r.w);
 assert.equal(r.w.time,time);assert.equal(r.factories,3);assert.ok(reads>=1);assert.equal(inspect(r.m).paged.size,1);r.m.dispose();
 console.log('PASS missing near bytes retain every claim, no replacement/factories/rewards; explicit retry recovers while the simulation clock is frozen');
}
{
 const r=build();let release:(value:CharacterNativePage)=>void=()=>{};
 inspect(r.m).readNativePage=()=>new Promise(resolve=>{release=resolve;});
 let current=true;const prepared=r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>current});await turn();current=false;
 r.m.dispose();release(clone(data.get(entries[1].ref.key)!));await assert.rejects(prepared,/Stale/);
 assert.equal(r.factories,0);assert.equal(inspect(r.m).paged.size,4);
 console.log('PASS disposed runtime and superseded request cannot publish post-await factories or remove original claims');
}
{
 const r=build();let reads=0;inspect(r.m).readNativePage=async e=>{reads++;return clone(data.get(e.ref.key)!);};
 const surface=r.w.zone;r.w.zone={...surface,id:'native_cave_probe'};r.w.player.pos={x:0,y:60};
 assert.equal(r.m.nativeReadiness(r.w).status,'ready');assert.equal(reads,0);assert.equal(r.m.resumePending,true);
 r.w.zone=surface;r.w.player.pos={x:10210,y:60};assert.equal(r.w.zone.id,MASS_ZONE);
 assert.equal(r.m.nativeReadiness(r.w).status,'pending');await r.m.flushNativePaging();await turn();
 assert.equal(reads,1,'actual return pose only wakes its nearby surface page');assert.equal(r.m.nativeReadiness(r.w).status,'ready');
 assert.equal(r.m.resumePending,false);assert.equal(inspect(r.m).paged.size,3);r.m.dispose();
 console.log('PASS cave coordinates do not hydrate surface cohorts; real surface exit selects near history before automatic readiness finishes');
}
{
 const input=clone(resident);input.definition.player={x:30000,y:0};const r=build(input);
 await r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>true});r.m.finishResume(r.w);
 const releases:((v:CharacterNativePage)=>void)[]=[];inspect(r.m).readNativePage=()=>new Promise(resolve=>releases.push(resolve));
 r.w.player.pos={x:1800,y:60};assert.equal(r.m.nativeReadiness(r.w).status,'ready','read halo alone does not freeze physical play');
 assert.equal(inspect(r.m).pagingReads.size,2);assert.equal(r.factories,0);
 r.w.player.pos={x:1500,y:60};assert.equal(r.m.nativeReadiness(r.w).status,'pending');
 const before={time:r.w.time,pos:{...r.w.player.pos},life:r.w.player.life,xp:r.w.meta.xp};
 r.w.update(.5);assert.deepEqual({time:r.w.time,pos:r.w.player.pos,life:r.w.player.life,xp:r.w.meta.xp},before,'actual World update stops before its clock/actor work');
 assert.equal(inspect(r.m).paged.size,4);r.m.dispose();for(let i=0;i<releases.length;i++)releases[i](clone(data.get(entries[i].ref.key)!));await turn();
 assert.equal(r.factories,0);
 console.log('PASS prefetch halo permits live play; actual wake boundary freezes World time/pose/life/XP until required history exists');
}
{
 // Real one-use slot authorities, controlled page transport. This isolates the
 // same-World replacement race without inventing a production page authority.
 const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorFetch=Object.getOwnPropertyDescriptor(globalThis,'fetch');
 const memory=new Map<string,string>();
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,
  setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}}});
 Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
 try {
  await writeCharacterMirrorRaw(CHAR_SLOT,JSON.stringify(serializeCharacter(source)));
  const input=clone(resident);input.definition.player={x:30000,y:0};const r=build(input);
  await r.m.prepareResumeNeighborhood(r.w,{isCurrent:()=>true});r.m.finishResume(r.w);
  const a=await readCharacterResume();assert.equal(a.status,'ready');if(a.status!=='ready')throw Error('Missing actual inline authority A');
  assert.ok(applyCharacterResumeFields(r.w,a.resume));const undoA=bindCharacterResumePages(r.w,a.resume),tokenA=characterNativeSessionToken(r.w);
  const releases:((v:CharacterNativePage)=>void)[]=[];inspect(r.m).readNativePage=()=>new Promise(resolve=>releases.push(resolve));
  r.w.player.pos={x:0,y:60};assert.equal(r.m.nativeReadiness(r.w).status,'pending');assert.equal(releases.length,2);
  const b=await readCharacterResume();assert.equal(b.status,'ready');if(b.status!=='ready')throw Error('Missing actual inline authority B');
  const undoB=bindCharacterResumePages(r.w,b.resume),tokenB=characterNativeSessionToken(r.w);assert.notEqual(tokenA,tokenB);assert.ok(characterNativeSessionCurrent(r.w));
  for(let i=0;i<releases.length;i++)releases[i](clone(data.get(entries[i].ref.key)!));await r.m.flushNativePaging();await turn();
  assert.equal(r.factories,0,'old session cannot publish into the replacement session on the same World');assert.equal(inspect(r.m).paged.size,4);
  undoA();assert.equal(characterNativeSessionToken(r.w),tokenB,'old rollback does not erase the newer session');
  // The controlled runtime manifest supplies the original order here; browser
  // envelope validation/binding remains a separate transport acceptance gate.
  const order=Reflect.get(tokenB!,'order') as string[];order.push(...saved.enemies.map(e=>e.id));
  const pending=new Map<string,(v:CharacterNativePage)=>void>();inspect(r.m).readNativePage=e=>new Promise(resolve=>pending.set(e.ref.key,resolve));
  r.m.nativeReadiness(r.w);pending.get(entries[1].ref.key)!(clone(data.get(entries[1].ref.key)!));await turn();
  pending.get(entries[0].ref.key)!(clone(data.get(entries[0].ref.key)!));await turn();r.m.nativeReadiness(r.w);
  pending.get(entries[2].ref.key)!(clone(data.get(entries[2].ref.key)!));await r.m.flushNativePaging();await turn();
  assert.deepEqual([...inspect(r.m).natives.keys()],saved.enemies.filter(e=>e.id!=='resume-body/3').map(e=>e.id));
  const nativeIDs=new Map([...inspect(r.m).natives].map(([id,a])=>[a,id]));
  assert.deepEqual(r.w.actors.filter(a=>nativeIDs.has(a)).map(a=>nativeIDs.get(a)),saved.enemies.slice(0,3).map(e=>e.id),'active native slots follow original order despite reversed page completion');
  r.w.player.pos={x:10210,y:60};r.m.nativeReadiness(r.w);pending.get(entries[3].ref.key)!(clone(data.get(entries[3].ref.key)!));await r.m.flushNativePaging();await turn();
  assert.equal(inspect(r.m).paged.size,0);assert.deepEqual(serializeCharacter(r.w).world!.worldmass!.enemies.map(e=>e.id),saved.enemies.map(e=>e.id),'ordinary inline snapshot keeps original creation order after last hydration');
  undoB();r.m.dispose();
 }finally{
  if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');
  if(priorFetch)Object.defineProperty(globalThis,'fetch',priorFetch);else Reflect.deleteProperty(globalThis,'fetch');
 }
 console.log('PASS actual bound slot A→B rejects stale reads; controlled reversed page completion preserves active order and final inline creation order');
}
{
 const r=build(),good=data.get(entries[0].ref.key)!,bad=clone(good.cohort);bad.policy.quietSeconds=0;
 let factories=0;assert.throws(()=>hydrateNativeCohortData(bad,entries[0].ref,saved.origin,cfg.terrain.addressSpan,r.w.player,
 {create:d=>{factories++;return r.w.createMonster(d.monster,d.level,'enemy');},groups:()=>{}}),/dormancy/);assert.equal(factories,0);
 const malformed=clone(good.cohort);malformed.checkpoint.actors[0].state.nodes[0]=999999;
 assert.throws(()=>hydrateNativeCohortData(malformed,entries[0].ref,saved.origin,cfg.terrain.addressSpan,r.w.player,
 {create:d=>{factories++;return r.w.createMonster(d.monster,d.level,'enemy');},groups:()=>{}}));assert.equal(factories,0);r.m.dispose();
 console.log('PASS malformed policy and packed codec reject before all native factories');
}
{
 const spec=clone(full.geography!),mass=new WorldMassRuntime(713,'worker-refusal',cfg);
 mass.nativeCountry=new MassNativeCountry(mass.generator,full.nativeCountry!,()=>false);
 const good=new MassGeographicGameplay(mass,spec,undefined,null),owner=good.hierarchy.at(mass.walk.at(0,0)).zone;
 good.hierarchy.enroll(owner,'physical-intel','worldmass/physical-intel-v1',{},null,0);
 const bad=good.hierarchy.snapshot();good.dispose();
 const prior=Object.getOwnPropertyDescriptor(globalThis,'Worker'),ports:{terminated:boolean}[]=[];
 // Instrument the browser worker port constructor; run the real queue owners'
 // cleanup (no changed validation or disposal guards).
 class WorkerPort {terminated=false;onmessage:unknown=null;onerror:unknown=null;constructor(){ports.push(this);}postMessage(){}terminate(){this.terminated=true;}}
 Object.defineProperty(globalThis,'Worker',{configurable:true,value:WorkerPort});
 try{
  assert.throws(()=>new MassGeographicGameplay(mass,{...spec,maxObjectives:0}),/policy/);assert.equal(ports.length,0);
  assert.throws(()=>new MassGeographicGameplay(mass,spec,bad),/Physical intel/);assert.equal(ports.length,0,'late source/manifest refusal allocates no worker');
  const accepted=new MassGeographicGameplay(mass,spec);assert.equal(ports.length,2);assert.ok(ports.every(p=>!p.terminated));
  accepted.dispose();assert.ok(ports.every(p=>p.terminated));assert.equal(accepted.warmStats.queue!.disposed,true);assert.equal(accepted.caravans.warmStats.queue.disposed,true);
 }finally{if(prior)Object.defineProperty(globalThis,'Worker',prior);else Reflect.deleteProperty(globalThis,'Worker');mass.dispose();}
 console.log('PASS early and late geographic source failures allocate no worker; successful owner disposes both real queue-owned worker ports');
}
{
 // Two real generated native fracture features contend for exactly one native
 // armed-wave reservation. B is a cold descriptor, A an actual saved owner.
 const config={...cfg,nativeCountry:full.nativeCountry,maxPopulation:8,geography:{policy:full.geography!.policy,pyres:[],holds:[],processions:[],maxObjectives:1}},w=makeSimWorld('warrior',715),m=new WorldMassRuntime(715,'saved-owner-priority',config);
 m.attach(w,undefined,{restoreOnly:true});w.time=100;
 const frame=address('surface',m.origin.cx,m.origin.cy,0,0,960);
 const placement=(id:string,x:number):NativeFeaturePlacement=>({id,origin:moveAddress(frame,{x,y:600},960),request:{id,seed:23,
  source:{kind:'massif',id:'well_court',tileset:'courtland',scope:'landform',poolIndex:1},level:1}});
 const a=placement('saved-native-a',600),b=placement('cold-native-b',1400);
 const res=new MassNativeResidency({run:m.generator.run.runId,addressSpan:960,maxBlueprints:4,maxResidents:2,maxCandidates:2},()=>[],nativeWorldCapabilities(),()=>frame);
 const host:MassNativeHost=new MassNativeHost(w,{population:()=>host.population,maxPopulation:()=>8,zoneOwner:pos=>m.geography!.hierarchy.at(m.walk.at(pos.x,pos.y)).zone.id,quietSeconds:12});
 m.nativeFeatures=res;assert.deepEqual(res.sync([a,b],host).admitted,[a.id]);
 w.player.pos={...host.occurrences.views()[0].pos};host.updateOccurrences(15,[]);
 const checkpoint=m.snapshot(w);assert.ok(checkpoint.nativeFeatures!.born.find(r=>r.placement.id===a.id)!.changes.native);
 assert.equal(checkpoint.nativeFeatures!.born.find(r=>r.placement.id===b.id)!.changes.native,undefined);
 const next=makeSimWorld('warrior',716),continued=new WorldMassRuntime(715,'saved-owner-priority',config,checkpoint);
 continued.attach(next,checkpoint,{restoreOnly:true});continued.nativeCountry!.near=()=>[b,a];
 await continued.prepareResumeNeighborhood(next,{isCurrent:()=>true});continued.finishResume(next);
 const rows=continued.snapshot(next).nativeFeatures!.born;
 const stored=rows.find(r=>r.placement.id===a.id)!.changes.native as {occurrences:{sites:{bank:number}[]}};
 assert.equal(stored.occurrences.sites[0].bank,15);assert.equal(rows.find(r=>r.placement.id===b.id)!.changes.native,undefined,'cold B cannot spend the saved owner A reservation first');
 assert.equal(continued.population,8);assert.equal(continued.nativeFeatures!.stats.resident,1);
 continued.dispose();m.dispose();
 console.log('PASS actual saved native fracture restores its exact charge/reservation before an earlier-listed never-mounted cold feature');
}
original.dispose();undo();
