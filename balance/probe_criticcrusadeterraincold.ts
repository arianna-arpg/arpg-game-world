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
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import type {Actor} from '../src/engine/actor';
const nativeFetch=globalThis.fetch;bootSimEngine();const restoreRandom=seedGlobalRandom(991),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{const promise=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(promise);void promise.finally(()=>pending.delete(promise));return promise;}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const child=process.argv.indexOf('--child'),require=createRequire(import.meta.url),snapshot=fileURLToPath(new URL('../',import.meta.url));
if(child>=0){transport(process.argv[child+1]);const output=process.argv[child+2],expected=JSON.parse(readFileSync(output+'.expected.json','utf8'));
 assert.equal(memory.size,0);const account=await loadAccount(),read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No actual disk lease');
 const descriptor=Object.getOwnPropertyDescriptor(NativeAreaScenePopulation.prototype,'restoreZoneEnemies')!,original=descriptor.value;
 const observed:{before:Actor[];after:Actor[];zone:string}[]=[];
 Object.defineProperty(NativeAreaScenePopulation.prototype,'restoreZoneEnemies',{...descriptor,value:function(this:NativeAreaScenePopulation,...args:Parameters<NativeAreaScenePopulation['restoreZoneEnemies']>){const before=[...this.actors];const result=Reflect.apply(original,this,args);observed.push({before,after:[...this.actors],zone:this.input.scene.zone.id});return result;}});
 try{const result=await refuseWorldContinue(async calls=>{
  const prepared=await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true}),made=prepared.publish(),w=made.writer,initial=made.runtime.current,c=initial.combat.input.coordinator,cf=w.sim.crusadeField!; assert.equal(w.zone.id,expected.resumeAt); cf.update(0,w.devOverlayView()); c.runFrom(initial,()=>c.loadZone(expected.zoneId)); const area=made.runtime.current;
  assert.equal(w.zone.id,expected.zoneId);assert.equal(cf.crusadeOn(expected.zoneId)?.crusadeId,expected.crusadeId);
  const observation=observed.find(v=>v.zone===expected.zoneId);assert(observation,'Actual native enemy restoration ran');
  const cold=expected.furniture.map((e:any)=>{const body=observation.after.find(a=>a.defId===e.kind&&a.name===e.name&&Math.abs(a.life-e.life)<.00001&&Math.hypot(a.pos.x-e.pos.x,a.pos.y-e.pos.y)<60);assert(body,'Saved furniture body rebuilt by actual native memory');assert(!observation.before.includes(body),'Restored furniture has new physical identity');return body as Actor;});
  assert(cold.every((a:Actor)=>area.combat.scene.actors.includes(a)));
  const survivor=w.actors.find(a=>a.defId===expected.unrelated.kind&&a.name===expected.unrelated.name&&Math.abs(a.life-expected.unrelated.life)<.00001)!;assert(survivor,'Unrelated wounded enemy restored');
  const structuresBefore=area.assembly.input.geometry.structures.length;
  cf.resolveCrusade(expected.crusadeId);assert.equal(cf.crusadeOn(expected.zoneId),null);
  c.runFrom(area,()=>c.loadZone('lastlight'));const away=made.runtime.current;assert.notEqual(away,area);c.runFrom(away,()=>c.loadZone(expected.zoneId));assert.equal(made.runtime.current,area);
  const retained=cold.filter((a:Actor)=>area.combat.scene.actors.includes(a)),row={scope:'Pinned mutable162 draft diagnostic; genuine launcher lease, empty-process Continue, actual native restoration then event resolution and genuine unoccupied return. No generation/body fabrication.',zoneId:expected.zoneId,crusadeId:expected.crusadeId,furnitureSaved:expected.furniture.length,furnitureRestoredNewIdentity:cold.length,obsoleteFurnitureStillPresent:retained.length,obsoleteFurniture:retained.map((a:Actor)=>({id:a.id,kind:a.defId,pos:a.pos,life:a.life})),structuresBefore,structuresAfter:area.assembly.input.geometry.structures.length,unrelatedRetained:area.combat.scene.actors.includes(survivor),unrelatedLife:survivor.life,worldDrivers:calls};
  writeFileSync(output+'.result.json',JSON.stringify(row,null,2));console.log(JSON.stringify(row));assert(row.unrelatedRetained);assert.equal(survivor.life,expected.unrelated.life);made.runtime.retire();assert.equal(retained.length,0,'Event-owned cold-restored furniture must retire with obsolete Crusade works');return row;
 });void result;}finally{Object.defineProperty(NativeAreaScenePopulation.prototype,'restoreZoneEnemies',descriptor);restoreRandom();}
}else{
 const {startGameServer}=require('../launcher/server.cjs') as {startGameServer:(o:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};const directory=resolve(snapshot,'../cold-furniture-'+process.pid);mkdirSync(directory,{recursive:true});const output=resolve(directory,'furniture'),server=await startGameServer({root:snapshot,savesDir:directory,port:0});transport(server.url);
 try{const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 await refuseWorldContinue(async calls=>{const account=makeAccount(),start=new NativeClientStart(account,mapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,991),prologue:'skip'});assert(made);await flush();const w=made.writer,c=made.runtime.current.combat.input.coordinator;
  const def=mintAdditionalNativeArea({writer:w,geography:made.runtime.geography,definition:w.zone},{x:-55,y:160});
  const cf=w.sim.crusadeField!,view=w.devOverlayView();assert(cf.devIgnite(view,def.id,cf.surge().power.anchorAt,'undead'));cf.update(0,view);const info=cf.crusadeOn(def.id);assert(info?.structure);c.runFrom(made.runtime.current,()=>c.loadZone(def.id));const area=made.runtime.current,capture=area.assembly.generation.crusadeLayout.read().record;assert(capture,'Actual first native fixture pass observed');
  const rows=capture.after.breakables.filter(b=>!capture.before.breakables.includes(b));const furniture=rows.map(row=>{const body=w.actors.find(a=>a.fromZoneGen&&a.defId===row.id&&Math.hypot(a.pos.x-row.pos.x,a.pos.y-row.pos.y)<60);assert(body,'Actual native injected furniture exists');return body;});assert(furniture.length>0,'Witness needs actual injected furniture');assert.equal(new Set(furniture).size,furniture.length);
  furniture.forEach((a,i)=>{a.life=Math.max(1,a.maxLife()*(.31+i*.03));});
  const unrelated=w.actors.find(a=>a.team==='enemy'&&a.fromZoneGen&&!a.dead&&!a.doorId&&!furniture.includes(a)&&!a.tag?.startsWith('crusade_'))!;assert(unrelated);unrelated.life=Math.max(1,unrelated.maxLife()*.27);
  const encode=(a:Actor)=>({kind:a.defId,name:a.name,pos:{...a.pos},life:a.life});const expected={resumeAt:'lastlight',zoneId:def.id,crusadeId:info.crusadeId,furniture:furniture.map(encode),unrelated:encode(unrelated)};
  c.runFrom(area,()=>c.loadZone('lastlight')); const save=serializeCharacter(w);assert(save.world?.nativeRetained);saveCharacter(w);await flush();const disk=JSON.parse(readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')) as CharacterSave;const remembered=disk.world!.memory!.find(m=>m.zoneId===def.id)!;assert(remembered);for(const f of expected.furniture)assert(remembered.enemies.some(a=>a.defId===f.kind&&a.name===f.name&&a.life===f.life));writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(expected));console.log(JSON.stringify({parent:expected,output}));start.cancel();});
 await new Promise<void>((ok,reject)=>{const processChild=spawn(process.execPath,[require.resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',server.url,output],{cwd:snapshot,stdio:['ignore','pipe','pipe']});let log='';processChild.stdout.on('data',b=>{log+=b;});processChild.stderr.on('data',b=>{log+=b;});processChild.on('error',reject);processChild.on('close',code=>{writeFileSync(output+'.child.log',log);if(code!==0)reject(Error('Cold furniture child failed '+code+'; '+log));else ok();});});
 }finally{await flush();server.server.closeAllConnections();await new Promise<void>((ok,reject)=>server.server.close(error=>error?reject(error):ok()));restoreRandom();}
}
