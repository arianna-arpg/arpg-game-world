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
import {serializeCharacter,saveCharacter,readCharacterResume,charKeyFor,CHAR_SLOT,type CharacterSave} from '../src/meta/character';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';


import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
const nativeFetch=globalThis.fetch;bootSimEngine();const restoreRandom=seedGlobalRandom(48020),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{const p=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(p);void p.finally(()=>pending.delete(p));return p;}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const dimension=process.argv.includes('--aetherial')?'aetherial':'underworld';
const child=process.argv.indexOf('--child');
if(child>=0){transport(process.argv[child+1]);const output=process.argv[child+2],expected=JSON.parse(readFileSync(output+'.expected.json','utf8'));
 assert.equal(memory.size,0,'independent process begins with no browser mirror');const account=await loadAccount(),read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Disk save did not produce a genuine lease');
 const result=await refuseWorldContinue(async worldDrivers=>{const prepared=await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true}),made=prepared.publish(),w=made.writer,area=made.runtime.current;
  assert.equal(w.zone.id,expected.zone);assert.equal(w.player.life,w.player.maxLife()*expected.life);assert.equal(w.player.mana,w.player.maxMana()*expected.mana);assert.equal(w.actors.filter(a=>a.companion&&a.owner===w.player).length,expected.companions);assert(w.completedObjectives.has(expected.zone));assert.deepEqual(area.assembly.input.physical.input.state.drops,expected.drops);const before=w.meta.xp;area.combat.updateObjective(.01);assert.equal(w.meta.xp,before,'restored completed objective cannot pay twice');
  const save=JSON.parse(JSON.stringify(serializeCharacter(w))) as CharacterSave,record=readNativeRetainedSave(save);assert.equal(record.geography.spec.sourceJson,expected.sourceJson);assert.equal(record.geography.identity,expected.identity);assert.equal(record.catalog!.identity,expected.catalogIdentity);assert.equal(save.world!.nativeRetained!.version,2);assert.equal(w.zone.dimension,expected.dimension);assert.deepEqual(save.world!.memory!.find(m=>m.zoneId==='lastlight'),expected.townMemory);
  made.runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});saveCharacter(w);await flush();assert(memory.has(charKeyFor(CHAR_SLOT)));const facts={zone:w.zone.id,dimension:w.zone.dimension,saveVersion:2,catalogExact:true,life:expected.life,mana:expected.mana,companions:expected.companions,drops:expected.drops.length,objectiveNoRepay:true,sourceExact:true,memoryExact:true,diskLease:true,emptyInitialMirror:true,worldDrivers};made.runtime.retire();return facts;
 });writeFileSync(output+'.result.json',JSON.stringify(result));console.log(JSON.stringify(result));restoreRandom();
}else{
 const require=createRequire(import.meta.url),{startGameServer}=require('../launcher/server.cjs') as {startGameServer:(o:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};
 const directory=resolve('balance/reports/dimension-cold-disk-'+dimension+'-'+process.pid);mkdirSync(directory,{recursive:true});const server=await startGameServer({root:resolve('.'),savesDir:directory,port:0});transport(server.url);
 try{
 const output=resolve(directory,'dimension-cold-'+dimension),expected=await refuseWorldContinue(async worldDrivers=>{const account=makeAccount(),start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='tamer')!,manifest:buildManifest(account,1211),prologue:'skip'});assert(made);await flush();const town=made.runtime.current;town.combat.campaignFrame.enterDimension(dimension);const area=made.runtime.current;for(const enemy of [...area.assembly.input.scene.actors])if(enemy.team==='enemy'&&!enemy.dead)area.combat.kill(enemy,false,made.writer.player);area.combat.updateObjective(.01);assert(made.writer.completedObjectives.has(made.writer.zone.id));area.assembly.lootController.dropAbilityEssenceAt({x:230,y:250},2,3,()=>.25);made.writer.player.life=made.writer.player.maxLife()*.37;made.writer.player.mana=made.writer.player.maxMana()*.43;
 const save=JSON.parse(JSON.stringify(serializeCharacter(made.writer))) as CharacterSave,record=readNativeRetainedSave(save),e={zone:made.writer.zone.id,life:save.world!.player!.vitals!.life,mana:save.world!.player!.vitals!.mana,companions:save.companions!.length,drops:JSON.parse(JSON.stringify(area.assembly.input.physical.input.state.drops)),sourceJson:record.geography.spec.sourceJson,identity:record.geography.identity,catalogIdentity:record.catalog!.identity,dimension,townMemory:save.world!.memory!.find(m=>m.zoneId==='lastlight'),worldDrivers};assert(e.companions>0);assert(e.townMemory);saveCharacter(made.writer);await flush();const disk=JSON.parse(readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')) as CharacterSave;assert.equal(readNativeRetainedSave(disk).geography.identity,e.identity);assert.equal(disk.world!.player!.zoneId,e.zone,'final disk generation is the actual gameplay save');assert.deepEqual(disk.world!.player!.vitals,save.world!.player!.vitals);writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(e));start.cancel();return e;});
 const result=await new Promise<string>((resolveRun,reject)=>{const p=spawn(process.execPath,[createRequire(import.meta.url).resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',server.url,output],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',b=>{log+=b;});p.stderr.on('data',b=>{log+=b;});p.on('error',reject);p.on('close',code=>{writeFileSync(output+'.child.log',log);if(code!==0)reject(Error('Actual cold Continue child failed '+code+'; '+log));else resolveRun(log);});});assert(result);const facts=JSON.parse(readFileSync(output+'.result.json','utf8'));assert.equal(facts.zone,expected.zone);const report={scope:'Production catalog dimension save through the unchanged launcher disk endpoint, independent process with empty mirror, actual lease and retained exact Continue. Existing v1 remains a separate unchanged course.',result:facts,receipt:combatHash(JSON.stringify(facts))};writeCombatProof('native-dimension-continue-'+dimension+'.json',report);console.log(JSON.stringify(report));
 }finally{await flush();await new Promise<void>((resolveClose,reject)=>server.server.close(e=>e?reject(e):resolveClose()));restoreRandom();}
}
