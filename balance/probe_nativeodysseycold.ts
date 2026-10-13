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
import {newOdyssey,defeatOdysseyLeader} from '../src/world/odyssey';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const nativeFetch=globalThis.fetch;bootSimEngine();const restoreRandom=seedGlobalRandom(59004),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{const promise=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(promise);void promise.finally(()=>pending.delete(promise));return promise;}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const child=process.argv.indexOf('--child'),require=createRequire(import.meta.url),snapshot=fileURLToPath(new URL('../',import.meta.url));
if(child>=0){transport(process.argv[child+1]);const output=process.argv[child+2],expected=JSON.parse(readFileSync(output+'.expected.json','utf8'));
 assert.equal(memory.size,0);const account=await loadAccount(),read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No actual disk lease');
 const result=await refuseWorldContinue(async calls=>{const prepared=await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true}),made=prepared.publish(),writer=made.writer;assert.equal(writer.zone.id,'crossroads');assert.equal(writer.odyssey,made.runtime.current.combat.input.campaign.odyssey);assert.deepEqual(writer.odyssey.state!.siege,expected.siege);const source=made.runtime.current,c=source.combat.input.coordinator;c.runFrom(source,()=>c.loadZone('lastlight'));const town=made.runtime.current;
  // Exact owner entry first checks restored native birth fields before ordinary frame recovery.
  town.combat.odyssey.update();const body=writer.actors.find(a=>a.tag===expected.tag)!;assert(body);town.authority.require(body);assert.equal(body.life/body.maxLife(),expected.life);assert.equal(body.defId,expected.kind);const reference=body;made.runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});assert.equal(writer.actors.filter(a=>a.tag===expected.tag).length,1);assert.equal(writer.actors.find(a=>a.tag===expected.tag),reference);assert(body.life<body.maxLife());const next=serializeCharacter(writer);assert.equal(next.world!.odyssey!.siege!.bodies![0].life,body.life/body.maxLife());saveCharacter(writer);await flush();const row={emptyInitialMirror:true,diskLease:true,canonical:true,restoredLife:expected.life,kind:body.defId,retainedOnce:true,worldDrivers:calls};made.runtime.retire();return row;});writeFileSync(output+'.result.json',JSON.stringify(result));console.log(JSON.stringify(result));restoreRandom();
}else{
 const {startGameServer}=require('../launcher/server.cjs') as {startGameServer:(o:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};const directory=resolve(snapshot,'../odyssey-cold-'+process.pid);mkdirSync(directory,{recursive:true});const output=resolve(directory,'pressure'),server=await startGameServer({root:snapshot,savesDir:directory,port:0});transport(server.url);
 try{const mapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
 await refuseWorldContinue(async calls=>{const account=makeAccount(),start=new NativeClientStart(account,mapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,1211),prologue:'skip'});assert(made);await flush();const w=made.writer,s=newOdyssey(w.manifest.seed,w.account.ledger);s.roster=['goblin','bandit','undead','gnoll'];assert(defeatOdysseyLeader(s,'gnoll'));s.initialized=true;s.siege={phase:'active',deadline:10000,wave:1,waves:2,remaining:['odyssey_siege:1:0'],nextWaveAt:0,level:12};w.odyssey.restore(s);made.runtime.dispatch({dt:1/60,wallSeconds:1/60,inputs:new Map()});const town=made.runtime.current,body=w.actors.find(a=>a.tag==='odyssey_siege:1:0')!;assert(body);body.life=body.maxLife()*.37;const coordinator=town.combat.input.coordinator;coordinator.runFrom(town,()=>coordinator.loadZone('crossroads'));const save=JSON.parse(JSON.stringify(serializeCharacter(w))) as CharacterSave,expected={siege:save.world!.odyssey!.siege,life:body.life/body.maxLife(),kind:body.defId,tag:body.tag,worldDrivers:calls};assert.equal(expected.siege!.bodies![0].life,expected.life);saveCharacter(w);await flush();const disk=JSON.parse(readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')) as CharacterSave;assert.deepEqual(disk.world!.odyssey!.siege,expected.siege);writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(expected));start.cancel();});
 await new Promise<void>((ok,reject)=>{const processChild=spawn(process.execPath,[require.resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',server.url,output],{cwd:snapshot,stdio:['ignore','pipe','pipe']});let log='';processChild.stdout.on('data',b=>{log+=b;});processChild.stderr.on('data',b=>{log+=b;});processChild.on('error',reject);processChild.on('close',code=>{writeFileSync(output+'.child.log',log);if(code!==0)reject(Error('Odyssey cold child failed '+code+'; '+log));else ok();});});const result=JSON.parse(readFileSync(output+'.result.json','utf8')),report={scope:'Actual launcher settled disk save while away from retained wounded siege bodies; independent empty-mirror process, genuine Continue lease and native pressure owner birth, then full frame. No new save format.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-odyssey-cold-first.json',report);console.log(JSON.stringify(report));
 }finally{await flush();await new Promise<void>((ok,reject)=>server.server.close(error=>error?reject(error):ok()));restoreRandom();}
}
