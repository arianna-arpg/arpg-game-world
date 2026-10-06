import { makeSimWorld } from '../src/sim/arena';
import { townStationFeatures } from '../src/data/townBuild';
import type { World, ZoneExit } from '../src/engine/world';
import { seedGlobalRandom } from '../src/sim/rng';
import { saveCharacter, characterPagingAvailable, loadCharacterAsync, loadCharacter, flushCharacterSaves,
  clearCharacter, savedCharacterPatronId, applySavedCharacter, charKeyFor, characterNativePages,
  loadCharacterNativePage, commitCharacterNativeCohort } from '../src/meta/character';
import { releaseMercsOf, MERC_SCHEMA } from '../src/meta/mercs';
import { mintCharId } from '../src/meta/modes';
import { buildSaveEnvelope, planSaveImport, applySaveImport } from '../src/meta/portage';
import { stageNativeCohort } from '../src/worldmass/nativePaging';
import { BrowserNativePages } from '../src/meta/browserNativePages';
import { BrowserRunStore } from '../src/meta/browserRunStore';
import { storageKey } from '../src/buildProfile';
import type { Actor } from '../src/engine/actor';
import type { WorldMassRuntime } from '../src/worldmass/runtime';
const ok=(v:unknown,message:string)=>{if(!v)throw Error(message);};
// The real New Run controller mints an identity before World construction;
// the isolated sim factory intentionally leaves this controller field empty.
const patronId=mintCharId();
const undo=seedGlobalRandom(994422);
let world=makeSimWorld('warrior',99);world.meta.charId=patronId;for(const feature of townStationFeatures())world.account.features.add(feature);world.startWorldMass(99);
let trips=0;const weak=new Map<string,WeakRef<Actor>>(),wounds=new Map<string,number>();
const natives=(m:WorldMassRuntime)=>(m as unknown as {natives:Map<string,Actor>}).natives;
export async function travel(count:number){for(let i=0;i<count;i++){
 const m=world.massRuntime!;
 // Wound new bodies before their next settled checkpoint; no combat behavior
 // is invented, and each native keeps the actual minted birth descriptor.
 for(const [id,a]of natives(m))if(!weak.has(id)){a.life*=.63;weak.set(id,new WeakRef(a));wounds.set(id,a.life);}
 world.time+=13;world.player.pos={x:5000+trips*3200,y:4000};m.update(world,true);trips++;
 await m.flushNativePaging();
 }return stats();}
export function stats(){const m=world.massRuntime!;return {...m.nativePagingStats,trips,total:weak.size,
 available:characterPagingAvailable(),sameHero:world.player===world.seatHero(world.localSeat),zone:world.zone.id,sleeping:[...natives(m).values()].filter(a=>m.dormancy?.isSleeping(a)).length,
 weakAlive:[...weak.values()].filter(w=>w.deref()).length,sessionPages:characterNativePages(world).length};}
export async function checkpoint(){
 saveCharacter(world);await flushCharacterSaves();
 const loaded=await loadCharacterAsync();ok(loaded?.world?.worldmass,'actual Continue loader must expand committed native pages');
 const enemies=loaded!.world!.worldmass!.enemies;
 for(const e of enemies)if(wounds.has(e.id))ok(e.life===wounds.get(e.id),'paged root changed wound state '+e.id);
 const store=new BrowserRunStore({dbName:storageKey('arpg_run_snapshots_v1')}),raw=await store.read(charKeyFor(1));
 ok(raw.status==='value','game authoritative slot missing');
 const envelope=raw.status==='value'?JSON.parse(raw.body):null;
 ok(envelope?.characterPages===1&&envelope.pages.length>0,'actual slot must own the page manifest');
 ok(envelope.character.world.worldmass.enemies.length<enemies.length,'page graph remains in root');
 const expected=enemies.map(e=>[e.id,e.monster,e.life,e.birth]);
 sessionStorage.setItem('native-page-receipts',JSON.stringify(expected));
 await store.close();return {count:enemies.length,pages:envelope.pages.length,rootNatives:envelope.character.world.worldmass.enemies.length,
 rootBytes:raw.status==='value'?raw.body.length:0};
}
export async function revisit(){
 const m=world.massRuntime!,entry=characterNativePages(world)[0];ok(entry,'no paged native to revisit');
 const before=await loadCharacterNativePage(entry),ids=[...entry.ids];
 const p=entry.positions[0];world.time+=13;world.player.pos={...p};m.update(world,true);await m.flushNativePaging();
 for(const id of ids){const a=natives(m).get(id),e=before.enemies.find(e=>e.id===id)!;
  ok(a&&a.life===e.life,'physical return lost exact native wound');
  ok(!m.state.claimed('fallen',id),'paging forged a kill');}
 ok(!characterNativePages(world).some(p=>p.ref.key===entry.ref.key),'hydrated page retained ownership');
 return {restored:ids.length,stats:stats()};
}
export async function reload(){
 ok(savedCharacterPatronId()===undefined,'cold transport reference must not masquerade as validated identity');
 const loaded=await loadCharacterAsync();ok(loaded?.world?.worldmass,'cold loader refused actual page root');
 ok(savedCharacterPatronId()===loaded!.charId,'async boot did not make patron metadata available');
 const receipts=loaded!.world!.worldmass!.enemies.map(e=>[e.id,e.monster,e.life,e.birth]);
 ok(JSON.stringify(receipts)===sessionStorage.getItem('native-page-receipts'),'cold CharacterSave changed birth/wound receipts');
 const next=makeSimWorld('warrior',111);ok(applySavedCharacter(next,loaded!),'meta restore refused');
 ok(next.adoptWorldState(loaded!.world!),'world restore refused');next.startWorldMass(99,loaded!.world!.worldmass);
 const after=next.massRuntime!.snapshot(next).enemies.map(e=>[e.id,e.monster,e.life,e.birth]);
 // Native boot may admit deferred nearby slots. Every original survivor must
 // remain identical and exactly once; new slots must have new identities.
 const byId=new Map(after.map(row=>[row[0],row]));
 ok(byId.size===after.length&&receipts.every(row=>JSON.stringify(byId.get(row[0]))===JSON.stringify(row)),'actual native Continue changed original birth/wound receipts');
 world=next;const exported=await buildSaveEnvelope();
 ok(exported.characters['1']?.world?.worldmass?.enemies.length===receipts.length,'portable export lost native pages');
 ok(!('characterPages' in exported.characters['1']),'portable export leaked browser references');
 sessionStorage.setItem('native-page-portable',JSON.stringify(exported));
 const bad=structuredClone(exported);(bad.characters as unknown as Record<string,unknown>)['1']={characterPages:1,character:exported.characters['1'],pages:[]};
 ok(!planSaveImport(JSON.stringify(bad)).ok,'import accepted foreign page references');
 return {count:receipts.length,continued:next.massRuntime!.nativePagingStats.resident};
}
export async function deletion(){
 clearCharacter();ok(loadCharacter()===null,'synchronous deletion barrier missing');ok(savedCharacterPatronId()===undefined,'deleted patron metadata leaked');
 ok(await loadCharacterAsync()===null,'async deletion barrier missing');
 await flushCharacterSaves();ok(await loadCharacterAsync()===null,'tombstone resurrected paged save');
 return true;
}
export async function reimport(){
 const plan=planSaveImport(sessionStorage.getItem('native-page-portable')!);ok(plan.ok,'inline exported pages not portable');
 if(plan.ok)await applySaveImport(plan.plan);
 return true;
}
export async function imported(){
 const loaded=await loadCharacterAsync();ok(loaded?.world?.worldmass,'inline reimport failed');ok(savedCharacterPatronId()===loaded!.charId,'inline patron metadata missing');
 const expected=JSON.parse(sessionStorage.getItem('native-page-receipts')!) as unknown[];
 ok(loaded!.world!.worldmass!.enemies.length===expected.length,'reimport native count changed');
 const store=new BrowserRunStore({dbName:storageKey('arpg_run_snapshots_v1')}),row=await store.read(charKeyFor(1));
 ok(row.status==='value'&&!('characterPages' in JSON.parse(row.body)),'inline import retained a paged root');await store.close();undo();return true;
}

async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(storageKey('arpg_native_pages_v1'),1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
export async function missing(){
 const m=world.massRuntime!,entry=characterNativePages(world)[0],db=await database();
 const original=await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction('pages','readwrite'),store=tx.objectStore('pages'),q=store.get(entry.ref.key);let row:unknown;
  q.onsuccess=()=>{row=q.result;store.delete(entry.ref.key);};tx.oncomplete=()=>resolve(row);tx.onabort=()=>reject(tx.error);});
 ok(await loadCharacterAsync()===null,'missing native page fell through to a stale character cache');
 world.time+=13;world.player.pos={...entry.positions[0]};m.update(world,true);try{await m.flushNativePaging();}catch{/* expected exact-read refusal */}
 ok(entry.ids.every(id=>!natives(m).has(id)&&!m.state.claimed('fallen',id)),'missing native page regenerated a body or forged a kill');
 ok(characterNativePages(world).some(p=>p.ref.key===entry.ref.key),'missing page lost its durable ownership');
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('pages','readwrite');tx.objectStore('pages').add(original);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});db.close();
 return true;
}
export async function rootFailure(){
 const m=world.massRuntime!,ids=[...natives(m).keys()];
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='runs')throw new DOMException('fixture abort','QuotaExceededError');return put.apply(this,args);};
 let failed=false;
 try{world.time+=20;world.player.pos={x:world.player.pos.x+10000,y:world.player.pos.y};m.update(world,true);await m.flushNativePaging();await flushCharacterSaves();}catch{failed=true;}
 finally{IDBObjectStore.prototype.put=put;}
 ok(failed,'actual character root abort was not exercised');
 ok(ids.every(id=>natives(m).has(id))&&characterNativePages(world).length===0,'failed CharacterSave root released native actors');
 const prior=await loadCharacterAsync();ok(prior?.world?.worldmass,'failed commit damaged prior durable character');
 saveCharacter(world);await flushCharacterSaves();return true;
}

export async function overlap(rootInFlight=false){
 const m=world.massRuntime!,entry=characterNativePages(world)[0],owned=natives(m),a=[...owned.values()].find(a=>m.dormancy!.isSleeping(a))!;
 ok(a&&entry,'overlap needs resident sleepers and a paged cohort');
 const ids=[...owned].filter(([,body])=>body===a||a.squadId!==undefined&&body.squadId===a.squadId).map(([id])=>id);
 const lease=stageNativeCohort(m.generator.run.runId,'overlap/'+crypto.randomUUID(),m.origin,m.config.terrain.addressSpan,
  world,owned,ids,m.dormancy!,(id,actor)=>({id,monster:actor.defId!,level:actor.level,provenance:{probe:'overlap'}}));
 let resume!:()=>void,started!:()=>void;
 const gate=new Promise<void>(r=>{resume=r;}),reached=new Promise<void>(r=>{started=r;});
 const write=BrowserNativePages.prototype.writePage,rootWrite=BrowserRunStore.prototype.write;
 if(rootInFlight)BrowserRunStore.prototype.write=async function(...args:Parameters<BrowserRunStore['write']>){const commit=await rootWrite.apply(this,args);started();await gate;return commit;};
 else BrowserNativePages.prototype.writePage=async function(...args:Parameters<BrowserNativePages['writePage']>){const ref=await write.apply(this,args);started();await gate;return ref;};
 let released=0;
 const task=commitCharacterNativeCohort(world,lease,()=>{released++;});
 try{
  await reached;world.time+=13;world.player.pos={...entry.positions[0]};m.update(world,true);await m.flushNativePaging();
  ok(entry.ids.every(id=>owned.has(id)),'overlap did not physically hydrate cohort A');
  resume();ok(await task===false&&released===0,'cohort B released across a changed manifest');
  ok(ids.every(id=>owned.has(id)),'stale writer discarded cohort B');
  const loaded=await loadCharacterAsync(),savedIds=new Set(loaded?.world?.worldmass?.enemies.map(e=>e.id));
  ok([...entry.ids,...ids].every(id=>savedIds.has(id)),'authoritative root lost A or B across read/write overlap');
 }finally{resume();BrowserNativePages.prototype.writePage=write;BrowserRunStore.prototype.write=rootWrite;await task;}
 return true;
}
export async function deathDuringPage(){
 const m=world.massRuntime!,ids=[...natives(m).keys()],add=IDBObjectStore.prototype.add;let injected=false,immediate=false;
 IDBObjectStore.prototype.add=function(...args:Parameters<IDBObjectStore['add']>){if(this.name==='pages'&&!injected){injected=true;clearCharacter();immediate=loadCharacter()===null;}return add.apply(this,args);};
 try{world.time+=20;world.player.pos={x:world.player.pos.x+10000,y:world.player.pos.y};m.update(world,true);await m.flushNativePaging();await flushCharacterSaves();}
 finally{IDBObjectStore.prototype.add=add;}
 ok(injected&&immediate,'death was not injected during an actual page write');
 ok(ids.every(id=>natives(m).has(id))&&await loadCharacterAsync()===null,'pending page writer resurrected the deleted root or released natives');
 return true;
}

export async function caveRoundtrip(){
 type Mouth={pos:{x:number;y:number};kind:string;seed:number};
 const access=world as unknown as {caveEntrances:Mouth[];enterSidezone(m:Mouth):void;travelThrough(e:ZoneExit):void};
 const mouth=access.caveEntrances.find(m=>m.kind==='cellar_hatch');ok(mouth,'real settlement cellar missing');
 const entries=[...characterNativePages(world)],ids=entries.flatMap(e=>e.ids),hero=world.player;
 world.landPartyAt(mouth!.pos);world.massRuntime!.update(world,true);await world.massRuntime!.flushNativePaging();
 access.enterSidezone(mouth!);ok(world.massRuntime===null&&world.player===hero,'native cellar suspension failed');
 saveCharacter(world);await flushCharacterSaves();const loaded=await loadCharacterAsync();
 ok(loaded?.world?.massSideareas?.active,'cave save lost native return ladder');
 const saved=loaded!.world!.worldmass!;ok(ids.every(id=>saved.enemies.some(e=>e.id===id)),'cave save lost paged surface natives');
 ok(Math.hypot(saved.player.x-mouth!.pos.x,saved.player.y-mouth!.pos.y)<90,'interior coordinates replaced surface page frame');
 const exit=world.exits.find(e=>e.to==='worldmass_expedition');ok(exit,'cellar return missing');access.travelThrough(exit!);
 const returned=(world as World).massRuntime!;ok(returned&&world.player===hero,'native surface return failed');
 const present=new Set([...natives(returned).keys(),...characterNativePages(world).flatMap(e=>e.ids)]);
 ok(ids.every(id=>present.has(id)&&!returned.state.claimed('fallen',id)),'surface reconstruction lost paged identities');
 await returned.flushNativePaging();return true;
}

export async function patron(){
 const saved=await loadCharacterAsync(),id=savedCharacterPatronId();ok(id&&id===saved?.charId,'paged patron identity missing');
 ok(loadCharacter()===null,'paged metadata escaped as a resumable partial character');
 const c=saved!,snapshot={classId:c.classId,level:c.level,baseAttrs:c.baseAttrs,allocated:c.allocated,knownSkills:c.knownSkills,bar:c.bar};
 const prior=world.account.mercRoster;
 world.account.mercRoster=[{schema:MERC_SCHEMA,mercId:'paged-patron-test',name:'Native veteran',classId:c.classId,retiredLevel:1,retiredAt:1,snapshot,engagedBy:id},
  {schema:MERC_SCHEMA,mercId:'other-patron-test',name:'Other veteran',classId:c.classId,retiredLevel:1,retiredAt:1,snapshot,engagedBy:'other-patron'}];
 try{ok(releaseMercsOf(world.account,id!)===1&&!world.account.mercRoster[0].engagedBy&&world.account.mercRoster[1].engagedBy==='other-patron','New Run native cleanup stranded or stole a patron contract');}
 finally{world.account.mercRoster=prior;}
 return true;
}
