import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { serializeCharacter, charKeyFor, readCharacterResume, readCharacterContinueSummary, characterResumeAuthority,
  characterResumeCurrent, applyCharacterResumeFields, bindCharacterResumePages, characterNativeSessionToken,
  characterNativeSessionCurrent, writeCharacterMirrorRaw, clearCharacter, loadCharacterPortable, savedCharacterPatronId } from '../src/meta/character';
import { preparePagedCharacterResume, encodeCharacterPages, decodeCharacterPages, type CharacterPageEntry,
  type CharacterNativePage, type CharacterPagesEnvelope } from '../src/meta/characterPages';
import { MassDormancy, captureNativeActorState, validateNativeActorState, validateNativeDormancyCheckpoint, restoreNativeActorState, unpackNativeCheckpoint } from '../src/worldmass/dormancy';
import { applyEncounterGroup } from '../src/engine/encounterGroups';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { stageNativeCohort } from '../src/worldmass/nativePaging';
import type { Actor } from '../src/engine/actor';
import type { NativePageRef } from '../src/meta/browserNativePages';

const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const w=makeSimWorld('warrior',913);w.startWorldMass(713);w.time=100;w.player.pos={x:50000,y:0};
const save=serializeCharacter(w),mass=save.world!.worldmass!,policy=mass.config.dormancy!;
mass.enemies=[];mass.dormancy=new MassDormancy(policy).snapshot(new Map(),w);
const pages:CharacterPageEntry[]=[],bodies=new Map<string,string>();
for(let n=0;n<3;n++){
  const owned=new Map<string,Actor>(),sleep=new MassDormancy(policy);
  for(let i=0;i<2;i++){
    const a=w.createMonster('gnoll_prowler',3,'enemy');a.pos={x:-20000+1000*n+70*i,y:40};a.aiAnchor={...a.pos};a.fromZoneGen=true;a.life*=.6;
    owned.set('resume-body/'+n+'/'+i,a);w.actors.push(a);
  }
  sleep.update(w,owned);assert.equal([...owned.values()].filter(a=>sleep.isSleeping(a)).length,2);
  const lease=stageNativeCohort(mass.state.run.runId,'resume-page/'+n,mass.origin,mass.config.terrain.addressSpan,w,owned,[...owned.keys()],sleep,
    (id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:{seed:123}}}));
  const page:CharacterNativePage={characterNativePage:1,configHash:mass.configHash,cohort:JSON.parse(lease.body),
    enemies:[...owned].map(([id,a])=>({id,monster:a.defId!,level:a.level,x:a.pos.x,y:a.pos.y,life:a.life,scale:1,birth:{seed:123}}))};
  const body=JSON.stringify(page),ref:NativePageRef={run:mass.state.run.runId,page:'resume-page/'+n,revision:'1',
    key:JSON.stringify([mass.state.run.runId,'resume-page/'+n,'1']),digest:'0'.repeat(64),bytes:body.length};
  bodies.set(ref.key,body);pages.push({ref,ids:[...owned.keys()],positions:[...owned.values()].map(a=>({...a.pos}))});
}
const envelope=JSON.parse(encodeCharacterPages(save,pages,pages.flatMap(p=>p.ids))) as CharacterPagesEnvelope;
let inFlight=0,maxInFlight=0,reads=0,factories=0;
const create=w.createMonster;w.createMonster=(...args)=>{factories++;return create.apply(w,args);};
const storage={readPage:async(ref:NativePageRef)=>{
  inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);reads++;await Promise.resolve();inFlight--;
  const body=bodies.get(ref.key);if(!body)throw Error('Missing immutable page');return body;
}};
const prepared=await preparePagedCharacterResume(clone(envelope),storage);
assert.equal(prepared.kind,'browser-native-pages');assert.equal(prepared.mass.residentEnemies.length,0);
assert.equal(prepared.pages.pages.length,3);assert.equal(maxInFlight,1);assert.equal(reads,3);assert.equal(factories,0);
assert.ok(Object.isFrozen(prepared.pages.pages[0].ids));
assert.equal('worldmass' in prepared.world,false);assert.equal('world' in prepared.character,false);
const expanded=await decodeCharacterPages(clone(envelope),storage);
assert.deepEqual(expanded.world!.worldmass!.enemies.map(e=>e.id),pages.flatMap(p=>p.ids));
assert.equal(factories,0);
console.log('PASS typed resident resume sequentially verifies every page without factories; portable decoder retains all history');

const beforeReads=reads,duplicate=clone(envelope);duplicate.pages[1].ids[0]=duplicate.pages[0].ids[0];
await assert.rejects(preparePagedCharacterResume(duplicate,storage),/Invalid/);assert.equal(reads,beforeReads);
const forgotten=pages[2].ref.key,original=bodies.get(forgotten)!;bodies.delete(forgotten);
await assert.rejects(preparePagedCharacterResume(clone(envelope),storage),/Missing/);assert.equal(factories,0);bodies.set(forgotten,original);
const malformed=JSON.parse(original) as CharacterNativePage;
malformed.cohort.checkpoint.actors[0].state.nodes[0]=999999;
bodies.set(forgotten,JSON.stringify(malformed));
await assert.rejects(preparePagedCharacterResume(clone(envelope),storage),/dictionary/);assert.equal(factories,0);bodies.set(forgotten,original);
const codec=JSON.parse(original) as CharacterNativePage;
codec.cohort.checkpoint.dictionary.push(['owner',{actor:999999}]);
const root=codec.cohort.checkpoint.actors[0].state.nodes[0];
codec.cohort.checkpoint.nodeDictionary[root].entries.push(codec.cohort.checkpoint.dictionary.length-1);
assert.throws(()=>validateNativeDormancyCheckpoint(codec.cohort.checkpoint,codec.enemies,true),/Invalid/);
for(const key of ['aiTargetId','aiHitById','lastFoeId']){
  const altered=JSON.parse(original) as CharacterNativePage,cp=altered.cohort.checkpoint;
  const rootNode=cp.nodeDictionary[cp.actors[0].state.nodes[0]],existing=rootNode.entries.find(i=>cp.dictionary[i][0]===key);
  if(existing!==undefined)cp.dictionary[existing]=[key,{entity:999999}];
  else{cp.dictionary.push([key,{entity:999999}]);rootNode.entries.push(cp.dictionary.length-1);}
  if(key==='aiTargetId')assert.throws(()=>validateNativeDormancyCheckpoint(cp,altered.enemies,true),/Invalid/);
  else assert.doesNotThrow(()=>validateNativeDormancyCheckpoint(cp,altered.enemies,true));
}
// A valid digest is not proof that a codec is decodable. Mutate the last,
// distant page so every refusal must happen during preflight, before factories.
const malformedFar = async (label: string, edit: (page: CharacterNativePage) => void): Promise<void> => {
  const page = JSON.parse(original) as CharacterNativePage; edit(page);
  bodies.set(forgotten, JSON.stringify(page));
  await assert.rejects(preparePagedCharacterResume(clone(envelope), storage), /Invalid/, label);
  assert.equal(factories, 0, label + ' must refuse before any native factory');
  bodies.set(forgotten, original);
};
const appendNode = (page: CharacterNativePage, kind: 'array' | 'float64' | 'object' | 'sheet', pair: [unknown,unknown]): void => {
  const cp=page.cohort.checkpoint;
  const index=cp.actors[0].state.nodes.find(i=>cp.nodeDictionary[i].kind===kind)!;
  assert.notEqual(index,undefined);
  cp.dictionary.push(pair as typeof cp.dictionary[number]);cp.nodeDictionary[index].entries.push(cp.dictionary.length-1);
};
for (const [label,kind,pair] of [
  ['negative array length','array',['length',-1]],
  ['array index not emitted by Object.entries','array',[0,1]],
  ['readonly typed array length','float64',['length',0]],
  ['out-of-order typed array index','float64',[-1,0]],
  ['typed array object coercion','float64',[999,{ref:0}]],
  ['typed array string coercion','float64',[999,'3']],
  ['sheet method override','sheet',['get',0]],
  ['Actor getter override','object',['absorbTotal',0]],
  ['inherited Actor behavior override','object',['toString',0]],
] as const) await malformedFar(label,page=>appendNode(page,kind,[...pair]));
await malformedFar('duplicate own property',page=>{
  const cp=page.cohort.checkpoint,n=cp.nodeDictionary[cp.actors[0].state.nodes[0]];n.entries.push(n.entries[0]);
});
await malformedFar('typed value reference at a valid index',page=>{
  const cp=page.cohort.checkpoint,n=cp.nodeDictionary[cp.actors[0].state.nodes.find(i=>cp.nodeDictionary[i].kind==='float64')!];
  cp.dictionary[n.entries[0]]=[0,{ref:0}];
});
await malformedFar('invented native formation identity',page=>{
  page.cohort.checkpoint.identities[0].squadId=77;page.cohort.checkpoint.actors[0].squadId=77;
});
await malformedFar('coherent codec formation without baseline',page=>{
  const cp=page.cohort.checkpoint;cp.identities[0].squadId=77;cp.actors[0].squadId=77;
  const root=cp.nodeDictionary[cp.actors[0].state.nodes[0]],slot=root.entries.find(i=>cp.dictionary[i][0]==='squadId');
  if(slot!==undefined)cp.dictionary[slot]=['squadId',{squad:77}];
  else{cp.dictionary.push(['squadId',{squad:77}]);root.entries.push(cp.dictionary.length-1);}
});
await malformedFar('far metadata hiding near exact body',page=>{
  const cp=page.cohort.checkpoint,row=cp.actors[0],root=cp.nodeDictionary[row.state.nodes[0]];
  const pos=cp.dictionary[root.entries.find(i=>cp.dictionary[i][0]==='pos')!][1] as {ref:number};
  const point=cp.nodeDictionary[row.state.nodes[pos.ref]],x=point.entries.find(i=>cp.dictionary[i][0]==='x')!;
  cp.dictionary[x]=['x',w.player.pos.x];
});
// Valid sparse arrays, aliased graphs and native non-finite typed clocks must
// retain the encoder's existing semantics; validation allocates no Actor.
const control=create.call(w,'gnoll_prowler',3,'enemy'),copyBody=create.call(w,'gnoll_prowler',3,'enemy');
control.since[0]=NaN;control.since[1]=Infinity;control.since[2]=-Infinity;
const sparse: unknown[]=[];sparse[3]='kept';Reflect.set(sparse,'note','native own property');
Reflect.set(control,'codecSparse',sparse);Reflect.set(control,'codecAlias',sparse);
const exact=captureNativeActorState(control)!;
validateNativeActorState(exact,{monster:control.defId!,team:control.team,actors:new Set([control.id]),squads:new Set()});
restoreNativeActorState(copyBody,clone(exact),new Map([[control.id,copyBody]]));
assert.ok(Number.isNaN(copyBody.since[0]));assert.equal(copyBody.since[1],Infinity);assert.equal(copyBody.since[2],-Infinity);
assert.equal(Reflect.get(copyBody,'codecSparse'),Reflect.get(copyBody,'codecAlias'));
assert.equal(Reflect.get(copyBody,'codecSparse')[3],'kept');assert.equal(Reflect.get(copyBody,'codecSparse').note,'native own property');
const badDirect=clone(exact);badDirect.nodes.find(n=>n.kind==='array')!.entries.push(['length',-1]);
const beforeDirect=captureNativeActorState(copyBody);
assert.throws(()=>restoreNativeActorState(copyBody,badDirect,new Map([[control.id,copyBody]])),/Invalid native actor checkpoint/);
assert.deepEqual(captureNativeActorState(copyBody),beforeDirect,'shared decode gate refuses before touching the destination');
console.log('PASS distant malformed collection keys/coercions, prototype overrides, formation lies and hidden near positions refuse before factories; legitimate codec graphs round-trip');

// Actual native baseline groups still pass the explicit page formation gate.
// Both families keep their own native constructor/formation semantics.
for(const family of ['magic','encounter'] as const){
  const owned=new Map<string,Actor>(),sleep=new MassDormancy(policy),squad=w.nextSquadId();
  const recipe=ENCOUNTER_GROUPS.gnoll_road_foragers;
  const slots=family==='magic'?[0,1]:recipe.members.map((_,i)=>i);
  for(const i of slots){
    const a=create.call(w,family==='magic'?'gnoll_prowler':recipe.members[i].monster!,3,'enemy');
    a.fromZoneGen=true;a.pos={x:-30000+i*70,y:40};a.aiAnchor={...a.pos};
    if(family==='magic'){
      a.magicPack={id:squad,mechanic:'skirmishers',size:2,fallen:0,slot:i,...(i===0?{leader:1 as const}:{})};
      a.squadId=squad;a.squadLeader=i===0;w.promoteMonster(a,'magic',1,{distinctName:'Native page pack'});
    }else applyEncounterGroup(a,{id:squad,recipe:recipe.id,slot:recipe.members[i].slot});
    owned.set(family+'/'+i,a);w.actors.push(a);
  }
  sleep.update(w,owned);assert.equal([...owned.values()].filter(a=>sleep.isSleeping(a)).length,owned.size);
  const lease=stageNativeCohort(mass.state.run.runId,family,mass.origin,mass.config.terrain.addressSpan,w,owned,[...owned.keys()],sleep,
    (id,a)=>({id,monster:a.defId!,level:a.level,provenance:{birth:{seed:123}}}));
  const page:CharacterNativePage={characterNativePage:1,configHash:mass.configHash,cohort:JSON.parse(lease.body),
    enemies:[...owned].map(([id,a])=>({id,monster:a.defId!,level:a.level,x:a.pos.x,y:a.pos.y,life:a.life,scale:1,birth:{seed:123},name:a.name,
      ...(a.magicPack?{magicPack:a.magicPack}:{}),...(a.encounterGroup?{encounterGroup:a.encounterGroup}:{})}))};
  const ref={...pages[0].ref,page:family,key:JSON.stringify([mass.state.run.runId,family,'1'])};
  const entry={ref,ids:[...owned.keys()],positions:[...owned.values()].map(a=>({...a.pos}))};
  const groupedEnvelope=JSON.parse(encodeCharacterPages(save,[entry],entry.ids));
  await assert.doesNotReject(preparePagedCharacterResume(groupedEnvelope,{readPage:async()=>JSON.stringify(page)}));
  if(family==='encounter'){
    const changed=clone(page),cp=changed.cohort.checkpoint,oldMonster=changed.enemies[0].monster;
    changed.enemies[0].monster='skeleton_warrior';changed.cohort.bodies[0].monster='skeleton_warrior';
    const root=cp.nodeDictionary[cp.actors[0].state.nodes[0]],def=root.entries.find(i=>cp.dictionary[i][0]==='defId')!;
    cp.dictionary[def]=['defId','skeleton_warrior'];assert.notEqual(oldMonster,'skeleton_warrior');
    await assert.rejects(preparePagedCharacterResume(groupedEnvelope,{readPage:async()=>JSON.stringify(changed)}),/Invalid/);
  }
  const body=page.enemies[0],row=page.cohort.checkpoint.actors[0];
  assert.doesNotThrow(()=>validateNativeActorState(unpackNativeCheckpoint(page.cohort.checkpoint,row.state),{
    monster:body.monster,team:'enemy',actors:new Set([page.cohort.checkpoint.playerId,...page.cohort.checkpoint.identities.map(i=>i.actorId)]),squads:new Set([squad])}));
}
assert.equal(factories,0);
console.log('PASS genuine native magic packs and encounter formations preflight; valid recipe with wrong native species is refused');

let current=true,staleReads=0;
await assert.rejects(preparePagedCharacterResume(clone(envelope),{readPage:async ref=>{
  staleReads++;current=false;return bodies.get(ref.key)!;
}},()=>current),/Stale/);assert.equal(staleReads,1);
console.log('PASS duplicate owners before reads; missing/malformed far pages and foreign codec dependencies refuse without actor creation');

// Synthetic transport scale, not a claim about natural population density.
// Each reply is synthesized from a real native cohort; no array/cache holds
// the 1000 decoded payloads. Identity metadata is intentionally O(history).
const scaleCount=1000,scaleTemplate=JSON.parse(original) as CharacterNativePage;
const scalePages:CharacterPageEntry[]=Array.from({length:scaleCount},(_,n)=>{
  const page='scale/'+n,ref={run:mass.state.run.runId,page,revision:'1',key:JSON.stringify([mass.state.run.runId,page,'1']),digest:'0'.repeat(64),bytes:1};
  return {ref,ids:scaleTemplate.enemies.map((_,i)=>'scale/'+n+'/'+i),positions:scaleTemplate.enemies.map(e=>({x:e.x,y:e.y}))};
});
const scaleEnvelope=JSON.parse(encodeCharacterPages(save,scalePages,scalePages.flatMap(p=>p.ids))) as CharacterPagesEnvelope;
let scaleReads=0,scaleActive=0,scalePeak=0,scaleBytes=0;
const scaleResult=await preparePagedCharacterResume(scaleEnvelope,{readPage:async ref=>{
  scaleActive++;scalePeak=Math.max(scalePeak,scaleActive);
  const n=Number(ref.page.split('/')[1]),entry=scalePages[n],page=clone(scaleTemplate),cp=page.cohort.checkpoint;
  const replace=new Map(page.enemies.map((e,i)=>[e.id,entry.ids[i]]));
  page.cohort.page=ref.page;
  page.enemies.forEach(e=>{e.id=replace.get(e.id)!;});
  page.cohort.bodies.forEach(b=>{b.id=replace.get(b.id)!;});
  cp.identities.forEach(r=>{r.id=replace.get(r.id)!;});cp.actors.forEach(r=>{r.id=replace.get(r.id)!;});
  cp.sleeping=cp.sleeping.map(id=>replace.get(id)!);
  const body=JSON.stringify(page);scaleBytes+=body.length;scaleReads++;await Promise.resolve();scaleActive--;return body;
}});
const retainedBytes=JSON.stringify(scaleResult).length;
assert.equal(scaleReads,scaleCount);assert.equal(scalePeak,1);assert.equal(factories,0);
assert.equal(scaleResult.mass.residentEnemies.length,0);assert.equal(scaleResult.mass.residentDormancy.actors.length,0);
assert.equal(scaleResult.pages.pages.length,1000);assert.equal(scaleResult.pages.order.length,2000);
const metadataBytes=JSON.stringify(scaleResult.pages).length;
assert.deepEqual(scaleResult.mass.definition,prepared.mass.definition,'non-actor root must remain unchanged at transport scale');
assert.deepEqual(scaleResult.world,prepared.world);
assert.ok(metadataBytes<scaleBytes/15,'retained page section contains only identity metadata');
console.log('PASS synthetic1000-page native-codec scale: '+JSON.stringify({reads:scaleReads,maxActiveReads:scalePeak,totalBytes:scaleBytes,retainedResumeBytes:retainedBytes,pageMetadataBytes:metadataBytes,farActorFactories:factories}));


// Native/no-IDB slot lane: authority, session rollback and external mutation.
const mem=new Map<string,string>(),oldWindow=globalThis.window,oldFetch=globalThis.fetch;
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{
  getItem:(key:string)=>mem.get(key)??null,setItem:(key:string,value:string)=>{mem.set(key,value);},removeItem:(key:string)=>{mem.delete(key);}
}}});
globalThis.fetch=async()=>new Response('',{status:404});
try{
  const inline=clone(save);inline.charId='resume-probe';mem.set(charKeyFor(1),JSON.stringify(inline));
  const summary=await readCharacterContinueSummary();assert.equal(summary?.classId,'warrior');assert.equal('world' in summary!,false);
  const first=await readCharacterResume();assert.equal(first.status,'ready');if(first.status!=='ready')throw Error('fixture');
  assert.equal(first.resume.kind,'inline');assert.ok(characterResumeAuthority(first.resume));
  const next=makeSimWorld('warrior',115);assert.ok(applyCharacterResumeFields(next,first.resume));
  const rollback=bindCharacterResumePages(next,first.resume),token=characterNativeSessionToken(next);
  assert.ok(token);assert.ok(characterNativeSessionCurrent(next));assert.ok(await characterResumeCurrent(first.resume));
  assert.throws(()=>bindCharacterResumePages(next,first.resume),/already used/);
  rollback();assert.equal(characterNativeSessionToken(next),undefined);assert.equal(characterResumeAuthority(first.resume),false);
  const second=await readCharacterResume();if(second.status!=='ready')throw Error('fixture');
  assert.ok(applyCharacterResumeFields(next,second.resume));const undo=bindCharacterResumePages(next,second.resume);
  rollback();assert.ok(characterNativeSessionToken(next),'old rollback must not erase successor');
  await writeCharacterMirrorRaw(1,JSON.stringify({...inline,name:'new authority'}));
  assert.equal(characterResumeAuthority(second.resume),false);assert.equal(characterNativeSessionCurrent(next),false);undo();
  assert.equal((await loadCharacterPortable())?.name,'new authority');
  const diskSave={...inline,charId:'disk-patron',name:'Disk authority'};
  globalThis.fetch=async()=>new Response(JSON.stringify(diskSave),{status:200});
  assert.equal((await readCharacterContinueSummary())?.charId,'disk-patron');
  assert.equal(savedCharacterPatronId(),'disk-patron','disk metadata must outrank stale local mirror without writing it');
  assert.equal(JSON.parse(mem.get(charKeyFor(1))!).charId,'resume-probe');
  let release!:()=>void,started!:()=>void;
  const gate=new Promise<void>(r=>{release=r;}),reached=new Promise<void>(r=>{started=r;});
  globalThis.fetch=async()=>{started();await gate;return new Response(JSON.stringify(diskSave),{status:200});};
  const pending=readCharacterResume();await reached;
  await writeCharacterMirrorRaw(1,JSON.stringify({...inline,name:'replacement during disk read'}));
  release();assert.equal((await pending).status,'stale');
  globalThis.fetch=async()=>new Response('',{status:404});
  const third=await readCharacterResume();if(third.status!=='ready')throw Error('fixture');
  clearCharacter();assert.equal(characterResumeAuthority(third.resume),false);assert.equal((await readCharacterResume()).status,'deleted');
  assert.equal(await loadCharacterPortable(),null);
  console.log('PASS metadata-only menu, one-use post-bind authority, exact rollback, same-slot replacement and death guards');
}finally{
  globalThis.fetch=oldFetch;Object.defineProperty(globalThis,'window',{configurable:true,value:oldWindow});w.createMonster=create;
}
