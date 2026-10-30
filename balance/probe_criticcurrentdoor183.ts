/** Supplemental182: unchanged native actions with explicit spent, pending-event/plan and saved-door boundaries. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount} from '../src/meta/account';
import {loadAccount} from '../src/meta/persistence';
import {serializeCharacter,saveCharacter,readCharacterResume,CHAR_SLOT,type CharacterSave} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {address} from '../src/worldmass/address';
import type {MassNativeMapping} from '../src/worldmass/nativeGeography';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {prepareCharacterWorld} from '../src/meta/resumeWorld';
import type {Actor} from '../src/engine/actor';
import {readNativeCrusadeFixtureMemory} from '../src/engine/nativeCrusadeFixtureMemory';
import {STRUCTURES} from '../src/data/structures';void STRUCTURES;
import {nativeStructurePlan} from '../src/engine/structurePlans';void nativeStructurePlan;
const nativeFetch=globalThis.fetch;bootSimEngine();const restoreRandom=seedGlobalRandom(991),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{const promise=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(promise);void promise.finally(()=>pending.delete(promise));return promise;}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const mode=process.argv.includes('--event-change')?'event-change':process.argv.includes('--plan-change')?'plan-change':'spent-both';
const fault=process.argv.includes('--body')?'body':'getter';
const spent='critic-door-selection-'+fault+'-'+mode;
const child=process.argv.indexOf('--child'),require=createRequire(import.meta.url),snapshot=fileURLToPath(new URL('../',import.meta.url));
if(child>=0){transport(process.argv[child+1]);const output=process.argv[child+2],expected=JSON.parse(readFileSync(output+'.expected.json','utf8'));
 assert.equal(memory.size,0);const account=await loadAccount(),read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No actual disk lease');
 const lane=process.argv[child+3];
 const run=async(calls:string[])=>{
  const prepared=lane==='original'?await prepareCharacterWorld(account,read.resume,{spawn:'exact',fallbackSeed:991,isCurrent:()=>true}):await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true});
  const published=prepared.publish(),made=lane==='retained'?published as ReturnType<Awaited<ReturnType<typeof prepareNativeCharacterContinue>>['publish']>:undefined;
  const w=made?made.writer:published as import('../src/engine/world').World,cf=w.sim.crusadeField!;
  assert.equal(w.zone.id,expected.zoneId);
  const furniture=()=>w.actors.filter(a=>!a.dead&&a.fromZoneGen&&expected.fixtureKinds.includes(a.defId));
  const facts=()=>({event:cf.crusadeOn(expected.zoneId)?.crusadeId??null,structures:w.structures.length,furniture:furniture().map(a=>({id:a.id,kind:a.defId,life:a.life,pos:{...a.pos}}))});
  const before=facts(),cold=furniture();
  assert.equal(cold.length,expected.furniture.length,'Actual current-zone memory restores exactly the saved furniture');
  if(made)made.runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});else w.update(1/60);
  const afterFrame=facts();assert.equal(afterFrame.event,expected.crusadeId,'First real frame binds original campaign field');
  let killedAfter:number|undefined;if(mode==='spent-both'){const victim=furniture()[0];assert(victim);killedAfter=victim.id;if(made)made.runtime.current.combat.kill(victim,false,w.player);else w.kill(victim,false,w.player);assert(victim.dead||!w.actors.includes(victim));}
  const travel=(zone:string)=>{if(made){const a=made.runtime.current,c=a.combat.input.coordinator;c.runFrom(a,()=>c.loadZone(zone));}else w.loadZone(zone);};
  let selectedEvent=expected.crusadeId;let noKeyCount:number|undefined;
  if(mode==='event-change'){cf.resolveCrusade(selectedEvent);travel('lastlight');travel(expected.zoneId);assert.equal(cf.crusadeOn(expected.zoneId),null);noKeyCount=furniture().length;assert.equal(noKeyCount,cold.length);travel('lastlight');const view=w.devOverlayView();assert(cf.devIgnite(view,expected.zoneId,cf.surge().power.anchorAt,'undead'));cf.update(0,view);selectedEvent=cf.crusadeOn(expected.zoneId)!.crusadeId;assert.notEqual(selectedEvent,expected.crusadeId);travel(expected.zoneId);}
  else {
   assert(made);const held=made.runtime.current;travel('lastlight');
   const g=held.assembly.input.geometry,original=g.setDoorState,descriptor=Object.getOwnPropertyDescriptor(g,'setDoorState');
   let gets=0,doorCalls=0,applyReads=0,receiver=false,beforeOpen:boolean|undefined,afterOpen:boolean|undefined,selectedId:string|undefined;
   const invoke=function(this:typeof g,...args:Parameters<typeof original>){doorCalls++;receiver=this===g;selectedId=args[0];const door=g.doodads.find(d=>d.door?.id===args[0]);assert(door?.door);beforeOpen=door.door.open;const result=Reflect.apply(original,this,args);afterOpen=door.door.open;if(fault==='body')cf.resolveCrusade(selectedEvent);return result;};
   Object.defineProperty(invoke,'apply',{get(){applyReads++;throw Error('Selected callable own apply must not run');}});
   Object.defineProperty(g,'setDoorState',{configurable:true,get(){gets++;if(fault==='getter')cf.resolveCrusade(selectedEvent);return invoke;}});
   let error:unknown;try{travel(expected.zoneId);}catch(e){error=e;}finally{if(descriptor)Object.defineProperty(g,'setDoorState',descriptor);else Reflect.deleteProperty(g,'setDoorState');}
   const event=cf.crusadeOn(expected.zoneId)?.crusadeId??null;
   const report={lane,fault,gets,calls:doorCalls,applyReads,receiver,selectedId,beforeOpen,afterOpen,event,error:error instanceof Error?error.message:String(error),structures:g.structures.length,ownedFurniture:held.combat.scene.actors.filter(a=>readNativeCrusadeFixtureMemory(a)).length,worldDrivers:calls};
   writeFileSync(output+'.'+lane+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
   made.runtime.retire();
   assert.equal(gets,1);assert.equal(event,null);assert(error instanceof Error);assert.equal(applyReads,0);
   assert.equal(doorCalls,fault==='getter'?0:1,'Selected getter must refuse before calling a door writer after the actual event ends');
   if(fault==='body'){assert(receiver);assert.notEqual(beforeOpen,true);assert.equal(afterOpen,true);}
   return report;
  }
  let restoredDoors=0;if(made&&(mode as string)==='spent-both')for(const id of expected.doors){const d:import('../src/engine/levelgen').Doodad|undefined=made.runtime.current.assembly.input.geometry.doodads.find(d=>d.door?.id===id);assert(d,'Saved stable door has its actual delayed works row');assert.equal(d.door!.open,true,'Saved opened door applied before guard birth');assert(!w.actors.some(a=>a.doorId===id&&!a.dead),'Opened saved door does not regain a guard');restoredDoors++;}
  if(made)assert(cold.every(a=>!readNativeCrusadeFixtureMemory(a)),'Full memory completion grants no retroactive fixture retirement ownership');
  const afterReturn=facts(),surviving=cold.filter(a=>w.actors.includes(a)).length;
  cf.resolveCrusade(selectedEvent);travel('lastlight');travel(expected.zoneId);
  const expired=facts();const report={lane,mode,spent,killedAfter,noKeyCount,restoredDoors,selectedEvent,scope:'Actual current-zone disk Save/Continue, first real frame, same-event departure/return, then completed-event return',before,afterFrame,afterReturn,coldIdentitiesSurviving:surviving,expired,worldDrivers:calls};
  writeFileSync(output+'.'+lane+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));made?.runtime.retire();return report;
 };
 try{if(lane==='retained')await refuseWorldContinue(run);else await run([]);}finally{restoreRandom();}

}else{
 const {startGameServer}=require('../launcher/server.cjs') as {startGameServer:(o:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};const directory=resolve(snapshot,'../current-spent-'+spent+'-'+process.pid);mkdirSync(directory,{recursive:true});const output=resolve(directory,'furniture'),server=await startGameServer({root:snapshot,savesDir:directory,port:0});transport(server.url);
 try{const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 await refuseWorldContinue(async calls=>{const account=makeAccount(),start=new NativeClientStart(account,mapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,991),prologue:'skip'});assert(made);await flush();const w=made.writer,c=made.runtime.current.combat.input.coordinator;
  const def=mintAdditionalNativeArea({writer:w,geography:made.runtime.geography,definition:w.zone},{x:-55,y:160});
  const cf=w.sim.crusadeField!,view=w.devOverlayView();assert(cf.devIgnite(view,def.id,cf.surge().power.anchorAt,'undead'));cf.update(0,view);const info=cf.crusadeOn(def.id);assert(info?.structure);c.runFrom(made.runtime.current,()=>c.loadZone(def.id));const area=made.runtime.current,capture=area.assembly.generation.crusadeLayout.read().record;assert(capture,'Actual first native fixture pass observed');
  const rows=capture.after.breakables.filter(b=>!capture.before.breakables.includes(b));const furniture=rows.map(row=>{const body=w.actors.find(a=>a.fromZoneGen&&a.defId===row.id&&Math.hypot(a.pos.x-row.pos.x,a.pos.y-row.pos.y)<60);assert(body,'Actual native injected furniture exists');return body;});assert(furniture.length>0,'Witness needs actual injected furniture');assert.equal(new Set(furniture).size,furniture.length);
  furniture.forEach((a,i)=>{a.life=Math.max(1,a.maxLife()*(.31+i*.03));});
  const unrelated=w.actors.find(a=>a.team==='enemy'&&a.fromZoneGen&&!a.dead&&!a.doorId&&!furniture.includes(a)&&!a.tag?.startsWith('crusade_'))!;assert(unrelated);unrelated.life=Math.max(1,unrelated.maxLife()*.27);
  if(mode==='spent-both'){area.combat.kill(furniture[0],false,w.player);assert(furniture[0].dead||!w.actors.includes(furniture[0]));}
  const doors=area.assembly.input.geometry.doodads.filter(d=>d.door?.id.includes('#crusade:'+info.crusadeId+':'));assert(doors.length);for(const d of doors)area.assembly.input.geometry.setDoorState(d.door!.id,'open',{silent:true});
  const encode=(a:Actor)=>({kind:a.defId,name:a.name,pos:{...a.pos},life:a.life});const expected={doors:doors.map(d=>d.door!.id),zoneId:def.id,crusadeId:info.crusadeId,fixtureKinds:[...new Set(furniture.map(a=>a.defId))],furniture:furniture.filter(a=>!a.dead).map(encode),unrelated:encode(unrelated)};
  const save=serializeCharacter(w);assert(save.world?.nativeRetained);saveCharacter(w);await flush();const disk=JSON.parse(readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')) as CharacterSave;const remembered=disk.world!.memory!.find(m=>m.zoneId===def.id)!;assert(remembered);for(const f of expected.furniture)assert(remembered.enemies.some(a=>a.defId===f.kind&&a.name===f.name&&a.life===f.life));writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(expected));console.log(JSON.stringify({parent:expected,output}));start.cancel();});
 for(const lane of ['retained'])await new Promise<void>((ok,reject)=>{const processChild=spawn(process.execPath,[require.resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',server.url,output,lane,...process.argv.filter(a=>a==='--event-change'||a==='--plan-change'||a==='--body')],{cwd:snapshot,stdio:['ignore','pipe','pipe']});let log='';processChild.stdout.on('data',b=>{log+=b;});processChild.stderr.on('data',b=>{log+=b;});processChild.on('error',reject);processChild.on('close',code=>{writeFileSync(output+'.'+lane+'.child.log',log);if(code!==0)reject(Error('Cold furniture child failed '+code+'; '+log));else ok();});});
 const retained=JSON.parse(readFileSync(output+'.retained.json','utf8'));writeFileSync(resolve(snapshot,'../CRITIC-DOOR-'+fault+'-RESULT.json'),JSON.stringify({output,retained},null,2));

 }finally{await flush();server.server.closeAllConnections();await new Promise<void>((ok,reject)=>server.server.close(error=>error?reject(error):ok()));restoreRandom();}
}
