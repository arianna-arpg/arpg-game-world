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
import {saveCharacter,readCharacterResume,CHAR_SLOT,type CharacterSave} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {address} from '../src/worldmass/address';
import type {MassNativeMapping} from '../src/worldmass/nativeGeography';
import {mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const nativeFetch=globalThis.fetch;bootSimEngine();const restoreRandom=seedGlobalRandom(66020),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{const promise=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(promise);void promise.finally(()=>pending.delete(promise));return promise;}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const child=process.argv.indexOf('--child'),require=createRequire(import.meta.url),snapshot=fileURLToPath(new URL('../',import.meta.url));
if(child>=0){transport(process.argv[child+1]);const output=process.argv[child+2],expected=JSON.parse(readFileSync(output+'.expected.json','utf8'));
 assert.equal(memory.size,0);const account=await loadAccount(),read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No actual disk lease');
 const result=await refuseWorldContinue(async calls=>{const prepared=await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true}),made=prepared.publish(),w=made.writer,r=made.runtime;assert.equal(w.zone.id,expected.zoneId);assert.equal(w.sim.warlord.lords.size,0,'transient crowns are not accepted from saved public tags');const c=r.current.combat.input.coordinator,travel=(id:string)=>c.runFrom(r.current,()=>c.loadZone(id));r.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});const lord=w.sim.warlord.lords.get('goblin')!;assert(lord);assert(w.sim.warlord.crownOf(lord));assert.equal(lord.capitalId,expected.zoneId);travel('lastlight');travel(lord.capitalId);const body=w.actors.find(a=>a.tag==='warlord'&&a.faction==='goblin'&&!a.dead)!;assert(body);assert.equal(w.actors.filter(a=>a.tag==='warlord'&&a.faction==='goblin'&&!a.dead).length,1);const count=w.ledger.warlords_killed??0;r.current.combat.kill(body,false,w.player);assert.equal(w.ledger.warlords_killed,count+1);assert.equal(lord.alive,false);const row={emptyInitialMirror:true,diskLease:true,derivedActualCrown:true,realReturnBody:true,actualKillSuppressed:true,worldDrivers:calls};r.retire();return row;});writeFileSync(output+'.result.json',JSON.stringify(result));console.log(JSON.stringify(result));restoreRandom();
}else{
 const {startGameServer}=require('../launcher/server.cjs') as {startGameServer:(o:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};const directory=resolve(snapshot,'../warlord-cold-'+process.pid);mkdirSync(directory,{recursive:true});const output=resolve(directory,'crown'),server=await startGameServer({root:snapshot,savesDir:directory,port:0});transport(server.url);
 try{const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 await refuseWorldContinue(async calls=>{const account=makeAccount(),start=new NativeClientStart(account,mapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,45927),prologue:'skip'});assert(made);await flush();const w=made.writer,r=made.runtime,setup={writer:w,geography:r.geography,definition:w.zone},A=mintAdditionalNativeArea(setup,{x:-55,y:160}),B=mintAdditionalNativeArea(setup,{x:455,y:160}),c=r.current.combat.input.coordinator,travel=(id:string)=>c.runFrom(r.current,()=>c.loadZone(id));travel(A.id);travel(B.id);for(const [z,power] of [[A,100],[B,90]] as const){const snap=w.sim.faction.snapshot() as {field:Record<string,Record<string,number>>};for(const f of Object.keys(snap.field[z.id]??{}))w.sim.faction.bleed(z.id,f,100);w.sim.faction.reinforce(z.id,'goblin',power);}w.sim.warlord.update(0,w.devOverlayView());travel(A.id);assert(w.actors.some(a=>a.tag==='warlord'&&a.faction==='goblin'));const expected={zoneId:A.id,worldDrivers:calls};saveCharacter(w);await flush();const disk=JSON.parse(readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')) as CharacterSave;assert(disk.world!.nativeRetained);assert(!Object.keys(disk.world!.overlays??{}).some(k=>k==='warlord'));writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(expected));start.cancel();});
 await new Promise<void>((ok,reject)=>{const processChild=spawn(process.execPath,[require.resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',server.url,output],{cwd:snapshot,stdio:['ignore','pipe','pipe']});let log='';processChild.stdout.on('data',b=>{log+=b;});processChild.stderr.on('data',b=>{log+=b;});processChild.on('error',reject);processChild.on('close',code=>{writeFileSync(output+'.child.log',log);if(code!==0)reject(Error('Warlord cold child failed '+code+'; '+log));else ok();});});const result=JSON.parse(readFileSync(output+'.result.json','utf8')),report={scope:'Actual launcher save and independent empty-mirror Continue. Warlords remain native transient state; the genuine post-hydration campaign frame derives the current crown, and a real retained return creates its body. Territory fixture uses native reinforcement; no saved tag or row grants crown identity.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-warlord-cold-first.json',report);console.log(JSON.stringify(report));
 }finally{await flush();await new Promise<void>((ok,reject)=>server.server.close(error=>error?reject(error):ok()));restoreRandom();}
}
