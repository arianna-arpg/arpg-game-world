import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';
import {beforeNativeContinuity} from './nativeContinuityCompositionFixture';
/** Real native birth/owners -> genuine character writer -> staged cold Continue.
 * Physics publication, transient combat checkpoints and departure are outside this proof. */
import assert from 'node:assert/strict';
import {readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';
import {createHash} from 'node:crypto';
import {beforeNativeSceneMemory} from './nativeSceneMemoryFixture';
import ts from 'typescript';
import {World,isNativeWorld} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES,PROGRESSION} from '../src/data/classes';
import {NullInput} from '../src/net/intent';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneMemory} from '../src/worldmass/nativeAreaSceneMemory';
import {NativeAreaMemoryRegistry} from '../src/worldmass/nativeAreaMemoryRegistry';
import {sceneZoneMemorySnapshot,sceneCaptureLiveMemory} from '../src/engine/nativeSceneMemory';
import {nativeSceneMemoryArchive,nativeSceneMemoryArchiveHash} from './nativeSceneMemoryArchive';
import {ZONE_MEMORY_CFG,captureZoneContents,restoreZoneContents} from '../src/engine/zonecontents';
import {savedMovementTether} from '../src/engine/movementTether';
import {saveCharacter,saveCharacterDurable,flushCharacterSaves,readCharacterResume,writeCharacterMirrorRaw,CHAR_SLOT,charKeyFor} from '../src/meta/character';
import {prepareCharacterWorld} from '../src/meta/resumeWorld';
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);},clear:()=>memory.clear(),key:(n:number)=>[...memory.keys()][n]??null,get length(){return memory.size;}};
Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
assert.equal(digest(JSON.stringify(nativeSceneMemoryArchive)),nativeSceneMemoryArchiveHash);
const worldSource=beforeNativeContinuity('production','src/engine/world.ts',rawCampaign("journey58","src/engine/world.ts",readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8'))),normalized=beforeNativeSceneMemory(worldSource);
assert.equal(digest(normalized),nativeSceneMemoryArchive.sourceHash,'exact entire original source is restored');
assert.ok(worldSource.startsWith("import './nativeSceneBootstrap';\n"),'native registration bootstrap remains first');
const coreSource=ts.createSourceFile('nativeSceneMemory.ts',rawCampaign("journey58","src/engine/nativeSceneMemory.ts",readFileSync(new URL('../src/engine/nativeSceneMemory.ts',import.meta.url),'utf8')),99,true);
for(const row of nativeSceneMemoryArchive.rows){assert.equal(digest(row.before),row.hash);const sf=ts.createSourceFile('method.ts','class Native{'+row.before+'}',99,true),member=(sf.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;const name='scene'+row.name[0].toUpperCase()+row.name.slice(1),fn=coreSource.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration;assert.ok(fn);assert.equal(fn.body!.getText(coreSource).replace(/\bhost\b/g,'this'),member.body!.getText(sf),'exact original shared body '+row.name);}
assert.throws(()=>beforeNativeSceneMemory(worldSource.replace('nativeWorldInstances.add(this);','nativeWorldInstances.add(Object.create(this));')),/unique exact/);
console.log('PASS strict entire-source reversal, archive hash and two exact original shared memory bodies');
makeSimWorld('warrior',29031);
const unseed=seedGlobalRandom(29031);
const archiveCode=ts.transpile('class Archived{'+nativeSceneMemoryArchive.rows.map(r=>r.before).join('\n')+'}',{target:ts.ScriptTarget.ES2022});
const Archived=new Function('captureZoneContents','savedMovementTether','ZONE_MEMORY_CFG',archiveCode+';return Archived;')(captureZoneContents,savedMovementTether,ZONE_MEMORY_CFG);
let reader:ReturnType<typeof createNativeGeographyReader>;
let mapping:MassNativeGeography;
function bindMapping(){reader=createNativeGeographyReader(captureNativeGeographySource(991));
mapping=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));}
const json=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const klass=CLASSES.find(c=>c.id==='warrior')!;
function mint(w:any,target:{x:number;y:number},key:string){const request=mapping.ownerContext(key,mapping.physicalAnchor(target));const z=placeZoneAt(target,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});w.zoneMap[z.id]=z;return z;}
function campaignOf(w:any,z:any){const raw:any=freshAssemblyInput(w,z),campaign=raw.campaign;for(const key of Object.keys(campaign)){if(typeof w[key]==='function'||key==='massRuntime'||key==='nativeResidentHistory')continue;Object.defineProperty(campaign,key,{configurable:true,enumerable:true,get:()=>w[key],set:v=>{w[key]=v;}});}return campaign;}
function born(w:any,z:any,campaign:any,authority:NativeAreaActorAuthority<object>,seat:any){
 const raw=freshAssemblyInput(w,z,campaign);raw.initialActors=seat===w.localSeat?[w.player]:[w.player,seat.actor];
 const area=new NativeAreaSceneAssembly(raw),owner=new NativeAreaSceneMemory(area,authority);
 assert.throws(()=>owner.snapshot(),/completed birth/);
 const session=area.sourceSession(mapping);area.prepare(session,session.issue(z.id),{x:z.size.w/2,y:z.size.h/2},false);area.birth();
 if(seat!==w.localSeat){area.input.scene.actors=area.input.scene.actors.filter(a=>a!==w.player);area.input.scene.player=seat.actor;}
 assert.throws(()=>owner.snapshot(),/physical admission/);
 const binding=authority.register(area.input.scene,{});authority.claim(binding,area.input.scene.actors);area.activatePresence(authority);w.visited.add(z.id);
 return {area,owner,binding};
}
function parity(owner:NativeAreaSceneMemory,label:string){const original=Archived.prototype.zoneMemorySnapshot.call(owner.host),core=sceneZoneMemorySnapshot(owner.host),world=(World.prototype as any).zoneMemorySnapshot.call(owner.host),local=owner.snapshot();assert.deepEqual(core,original,label+' core');assert.deepEqual(world,original,label+' World delegate');assert.deepEqual(local,original,label+' local');return local!;}
try{
 let incomplete:World|undefined;class BrokenWorld extends World{override bindGlobalPolicies():void{incomplete=this;throw Error('controlled constructor failure');}}const brokenAccount=makeAccount();assert.throws(()=>new BrokenWorld(brokenAccount,Object.freeze(buildManifest(brokenAccount,991))),/controlled constructor failure/);assert.ok(incomplete);assert.equal(isNativeWorld(incomplete),false);assert.throws(()=>new NativeAreaMemoryRegistry(incomplete!),/real character writer/);
 const account=makeAccount(),w:any=new World(account,Object.freeze(buildManifest(account,991)));w.createPlayer(klass,{startingCompanions:false});w.sim.bindGeographyPolicies();bindMapping();
 const a=mint(w,{x:-55,y:160},'memory-A'),b=mint(w,{x:85,y:180},'memory-B');a.objective={kind:'waves',waves:4};b.objective={kind:'clear'};
 const peer=w.addSeat('memory-peer',klass,new NullInput(),{startingCompanions:false,startingFlasks:false});
 const campaign=campaignOf(w,a),authority=new NativeAreaActorAuthority<object>(campaign),A=born(w,a,campaign,authority,w.localSeat),B=born(w,b,campaign,authority,peer),registry=new NativeAreaMemoryRegistry(w);
 for(const [key,value] of [['id',b.id],['definition',b],['inCave',!A.owner.inCave]] as const)assert.throws(()=>Object.defineProperty(A.owner,key,{value}),/redefine/);
 registry.register(A.owner);registry.register(B.owner);registry.register(A.owner);assert.throws(()=>new NativeAreaMemoryRegistry(w),/already has/);
 assert.throws(()=>new NativeAreaMemoryRegistry(Object.create(w)),/real character writer/,'a prototype facade is never a writer');
 assert.throws(()=>new NativeAreaMemoryRegistry(Object.assign(Object.create(World.prototype),w)),/real character writer/,'a shallow prototype clone is never a writer');
 const secondAuthority=new NativeAreaActorAuthority<object>(campaign),secondBinding=secondAuthority.register(A.area.input.scene,{});secondAuthority.claim(secondBinding,A.area.input.scene.actors);const incorrectOwner=new NativeAreaSceneMemory(A.area,secondAuthority);assert.throws(()=>incorrectOwner.snapshot(),/presence authority differs/);
 const foreignWorld=new World(w.account,Object.freeze(buildManifest(w.account,991))),foreignRegistry=new NativeAreaMemoryRegistry(foreignWorld);assert.throws(()=>foreignRegistry.register(A.owner),/different or stale campaign/);w.sim.bindGeographyPolicies();
 const duplicateOwner=new NativeAreaSceneMemory(A.area,authority);assert.throws(()=>registry.register(duplicateOwner),/different memory owner/);
 const nativeA=parity(A.owner,'actual waves birth'),nativeB=parity(B.owner,'actual clear birth');assert.ok(nativeA.enemies.length+nativeB.enemies.length>0,'real native population exists');
 console.log('PASS exact archive/core/World delegate/actual admitted owner after two full native births');
 // Native snapshot policy and riders are exercised over real owners, without invoking unrelated combat.
 const objective=a.objective,os=A.area.input.objectives,originalObjective={...os};
 const cases:any[]=[{kind:'waves'},{kind:'beacon'},{kind:'rifts'},{kind:'pyres'},{kind:'unearth'},{kind:'offering'},{kind:'clear'},{kind:'procession'}];
 os.wave=2;os.waveActive=true;Object.assign(os,{spires:[{charge:3}],rifts:[{charge:4}],pyres:[{charge:5}],digs:[{charge:6}]});os.offering={offered:7} as any;os.cull={kills:8,need:13} as any;os.objectiveLost=true;
 for(const value of cases){a.objective=value;parity(A.owner,'rider '+value.kind);}a.objective=objective;Object.assign(os,originalObjective);
 w.visited.delete(a.id);assert.equal(A.owner.snapshot(),null);assert.equal(Archived.prototype.zoneMemorySnapshot.call(A.owner.host),null);w.visited.add(a.id);
 a.boundless=true;assert.equal(A.owner.snapshot(),null);delete a.boundless;
 A.area.transition.charBorn=137;A.area.input.geometry.openedHollows.add('hollow-proof');A.area.input.openings.input.state.annexOpen.add('annex-proof');
 A.area.lootController.dropAbilityEssenceAt({x:250,y:270},2,3,()=>.25);B.area.lootController.dropAbilityEssenceAt({x:640,y:660},4,5,()=>.75);
 const stateA=A.area.input.physical.input.state,stateB=B.area.input.physical.input.state,oldDrops=stateB.drops;
 const serialized=captureZoneContents(stateB);restoreZoneContents(stateB,serialized);assert.notEqual(stateB.drops,oldDrops);
 const current=parity(B.owner,'restored live physical array');assert.equal(current.contents?.drops.length,stateB.drops.length);oldDrops.length=0;assert.ok(B.owner.snapshot()!.contents!.drops.length);
 const frozen=structuredClone(A.owner.snapshot());stateA.drops[0].pos.x+=17;assert.notDeepEqual(A.owner.snapshot(),frozen);assert.equal(frozen!.contents!.drops[0].pos.x,stateA.drops[0].pos.x-17);
 console.log('PASS native objective riders, skip gates, copy isolation and actual restored physical-array replacement');
 // Native capture replaces memo identity only for non-null snapshots, never departure policy.
 const sentinel=A.owner.snapshot()!;w.zoneMemory.set(a.id,sentinel);A.owner.captureLiveMemory();assert.notEqual(w.zoneMemory.get(a.id),sentinel);
 const held=w.zoneMemory.get(a.id);w.visited.delete(a.id);sceneCaptureLiveMemory(A.owner.captureHost);assert.equal(w.zoneMemory.get(a.id),held);w.visited.add(a.id);
 let departures=0;w.captureZoneMemory=()=>{departures++;throw Error('departure used');};
 // Same source id as the real writer with intentionally different writer-owned scenery.
 w.zone=a;w.currentZoneSeed=-123;w.time=238;
 const retainedBefore=w.zoneMemory.get(a.id),originalId=a.id;delete w.zoneMap[originalId];a.id=originalId+'_renamed';w.zoneMap[a.id]=a;assert.throws(()=>registry.captureAll(),/source identity changed/);assert.equal(w.zoneMemory.get(originalId),retainedBefore);assert.ok(!w.zoneMemory.has(a.id));delete w.zoneMap[a.id];a.id=originalId;w.zoneMap[a.id]=a;
 w.caveMap[a.id]={...a};assert.throws(()=>registry.captureAll(),/source identity changed/);delete w.caveMap[a.id];
 const realCurrent=w.zone;w.zone={...a};assert.throws(()=>registry.captureAll(),/current memory definition/);w.zone=realCurrent;
 const actualCave=w.caveReturn;w.caveReturn={zoneId:a.id,pos:{x:0,y:0}};assert.throws(()=>registry.captureAll(),/current memory definition/);w.caveReturn=actualCave;
 console.log('PASS immutable owner identity and native namespace; renamed/rekeyed or same-id foreign definition refuses before memo writes');
 const expectedA=A.owner.snapshot()!,expectedB=B.owner.snapshot()!;let countA=0,countB=0;
 const snapA=A.owner.snapshot.bind(A.owner),snapB=B.owner.snapshot.bind(B.owner);A.owner.snapshot=()=>{countA++;return snapA();};B.owner.snapshot=()=>{countB++;return snapB();};
 const saved=w.serializeWorldState();assert.equal(countA,1);assert.equal(countB,1);assert.equal(departures,0);assert.deepEqual(json(saved.memory.find((m:any)=>m.zoneId===a.id)),json({zoneId:a.id,...expectedA}));assert.deepEqual(json(saved.memory.find((m:any)=>m.zoneId===b.id)),json({zoneId:b.id,...expectedB}));
 A.owner.snapshot=snapA;B.owner.snapshot=snapB;
 console.log('PASS genuine writer registry captures each owner once; current-id collision uses retained scenery; no native departure');
 const memoBeforeUnregister=w.zoneMemory.get(a.id);let refusedCaptureCount=0;A.owner.snapshot=()=>{refusedCaptureCount++;return snapA();};
 assert.throws(()=>registry.unregister(A.owner),/writer handoff before unregister/);assert.equal(refusedCaptureCount,0,'refused current unregister performs no capture');assert.equal(w.zoneMemory.get(a.id),memoBeforeUnregister,'refused current unregister keeps the memo identity');
 const afterRefusal=w.serializeWorldState();assert.equal(refusedCaptureCount,1,'refused unregister preserves the actual current owner registration');assert.notEqual(w.zoneMemory.get(a.id),memoBeforeUnregister);assert.deepEqual(json(afterRefusal.memory.find((m:any)=>m.zoneId===a.id)),json({zoneId:a.id,...expectedA}),'later save keeps actual retained content rather than stale World scenery');A.owner.snapshot=snapA;
 console.log('PASS current-owner unregister refuses until writer handoff, preserves memo and registration, and later save captures the actual area');

 const beforeA=w.zoneMemory.get(a.id),beforeB=w.zoneMemory.get(b.id),bad:any=stateB.drops[0];bad.circular=bad;
 assert.throws(()=>registry.unregister(B.owner),/circular/i);assert.throws(()=>w.serializeWorldState(),/circular/i);assert.notEqual(w.zoneMemory.get(a.id),beforeA);assert.equal(w.zoneMemory.get(b.id),beforeB);delete bad.circular;
 const alien=Object.create(campaign);const badAuthority=new NativeAreaActorAuthority<object>(alien);assert.throws(()=>new NativeAreaSceneMemory(A.area,badAuthority),/identical campaign/);
 const stolen=A.area.input.scene.actors[0];authority.release(A.binding,[stolen]);assert.throws(()=>w.serializeWorldState(),/unowned|borrowed/);authority.claim(A.binding,[stolen]);
 console.log('PASS failed later snapshot preserves earlier native replacement; foreign campaign and missing physical authority refuse');
 const reenterA=A.owner.snapshot.bind(A.owner);
 for(const attempt of [()=>registry.register(A.owner),()=>registry.unregister(B.owner),()=>registry.captureAll(),()=>registry.snapshot(a.id)]){A.owner.snapshot=()=>{attempt();return reenterA();};assert.throws(()=>w.serializeWorldState(),/registry is capturing/);A.owner.snapshot=reenterA;registry.captureAll();}
 const timeDescriptor=Object.getOwnPropertyDescriptor(campaign,'time')!;
 for(const operation of [()=>registry.register(A.owner),()=>registry.unregister(B.owner),()=>registry.snapshot(a.id),()=>registry.captureAll()]){Object.defineProperty(campaign,'time',{configurable:true,enumerable:true,get(){registry.register(A.owner);return w.time;}});assert.throws(operation,/registry is capturing/);Object.defineProperty(campaign,'time',timeDescriptor);assert.ok(registry.captureAll().has(b.id),'failed validation cannot unregister or poison the registry');}
 console.log('PASS exact activated authority, nominal writer brand, same-account foreign writer, duplicate owner and reentrant capture refusal');
 // Keep this memory-latch course below a level-up; progression rebuild is covered by the ongoing probe.
 peer.meta.xp=0;peer.meta.xpNeeded=PROGRESSION.xpForLevel(100);
 const beforeReward=peer.meta.xp;B.area.objectiveController.completeObjective('Memory witness');assert.ok(peer.meta.xp>beforeReward);const rewardXp=peer.meta.xp,rewardDrops=stateB.drops.length;B.area.objectiveController.completeObjective('Memory witness');assert.equal(peer.meta.xp,rewardXp);assert.equal(stateB.drops.length,rewardDrops);assert.ok(w.completedObjectives.has(b.id));
 // Actual save functions and current authority, not a serialize-only mirror facade.
 saveCharacter(w);await flushCharacterSaves();const root=memory.get(charKeyFor(CHAR_SLOT));assert.ok(root);const persisted=JSON.parse(root!);
 assert.ok(persisted.world.memory.some((r:any)=>r.zoneId===a.id));assert.ok(persisted.world.memory.some((r:any)=>r.zoneId===b.id));
 saveCharacterDurable(w);await flushCharacterSaves();assert.deepEqual(JSON.parse(memory.get(charKeyFor(CHAR_SLOT))!).world.memory,persisted.world.memory);
 const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Missing real resume authority');
 const prepared=await prepareCharacterWorld(w.account,read.resume,{isCurrent:()=>true,fallbackSeed:991,spawn:'exact'}),restored:any=prepared.publish();restored.bindGlobalPolicies();
 assert.equal(restored.account,w.account);assert.equal(restored.zone.id,a.id);assert.equal(restored.zoneMemory.get(b.id).contents.drops.length,expectedB.contents!.drops.length);
 const restoredCampaign=campaignOf(restored,restored.zoneMap[a.id]),restoredAuthority=new NativeAreaActorAuthority<object>(restoredCampaign);
 const restoredPeer=restored.addSeat('restored-memory-peer',klass,new NullInput(),{startingCompanions:false,startingFlasks:false});
 const RA=born(restored,restored.zoneMap[a.id],restoredCampaign,restoredAuthority,restored.localSeat),RB=born(restored,restored.zoneMap[b.id],restoredCampaign,restoredAuthority,restoredPeer);
 for(const [actual,expected] of [[RA,expectedA],[RB,expectedB]] as const){const memo=actual.owner.snapshot()!;assert.equal(memo.seed,expected.seed);assert.equal(memo.enemies.length,expected.enemies.length,'cold birth cannot duplicate population');assert.deepEqual(memo.contents,expected.contents);assert.deepEqual(memo.enemies,expected.enemies);}
 assert.equal(RA.area.transition.charBorn,137);
 assert.deepEqual(restored.zoneMemory.get(a.id).annexOpen,['annex-proof']);assert.deepEqual(restored.zoneMemory.get(a.id).hollows,['hollow-proof']);
 assert.deepEqual([...RA.area.input.openings.input.state.annexOpen],[],'native reveal refuses an id absent from this generated arena');assert.deepEqual([...RA.area.input.geometry.openedHollows],[],'native hollow revival validates its actual source');
 assert.equal(RB.area.input.objectives.objectiveDone,true);const coldXp=restoredPeer.meta.xp,coldDrops=RB.area.input.physical.input.state.drops.length;RB.area.objectiveController.completeObjective('Cold replay');assert.equal(restoredPeer.meta.xp,coldXp);assert.equal(RB.area.input.physical.input.state.drops.length,coldDrops,'cold completed objective cannot pay twice');
 prepared.discard();console.log('PASS actual character save/durable write -> read authority -> staged Continue -> two fresh real native births retain exact content and survivors');
 // Superseded Continue uses existing root authority; the capture registry does not publish a new writer.
 await writeCharacterMirrorRaw(CHAR_SLOT,root!);const read2=await readCharacterResume();assert.equal(read2.status,'ready');if(read2.status!=='ready')throw Error('Missing second resume authority');
 const pending=await prepareCharacterWorld(restored.account,read2.resume,{isCurrent:()=>true,fallbackSeed:991,spawn:'exact'});const replacement=JSON.stringify({...persisted,xp:persisted.xp+1});await writeCharacterMirrorRaw(CHAR_SLOT,replacement);assert.throws(()=>pending.publish(),/superseded/);pending.discard();assert.equal(memory.get(charKeyFor(CHAR_SLOT)),replacement);
 registry.unregister(B.owner);const released=w.zoneMemory.get(b.id);stateB.drops.length=0;w.serializeWorldState();assert.equal(w.zoneMemory.get(b.id),released);assert.throws(()=>registry.unregister(B.owner),/Foreign/);
 const ttl=ZONE_MEMORY_CFG.ttl;try{ZONE_MEMORY_CFG.ttl=5;w.time+=6;const expired=w.serializeWorldState();assert.ok(!expired.memory.some((r:any)=>r.zoneId===b.id),'unregistered memory expires by the native clock');assert.ok(expired.memory.some((r:any)=>r.zoneId===a.id),'admitted area recapture refreshes memory');}finally{ZONE_MEMORY_CFG.ttl=ttl;}
 console.log('PASS native stale-Continue rollback, completed-reward latch, explicit final-capture unregister and native TTL; no runtime publication implied');
}finally{unseed();}
