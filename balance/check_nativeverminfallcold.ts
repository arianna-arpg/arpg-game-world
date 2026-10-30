/** Actual isolated launcher disk save, fresh child processes and genuine Continue.
 * Each lane loads an independent copy of the same frozen parent account/character bytes.
 * Uses the actual native geography/ignition fixture; direct wounds/kills are fixture shortcuts. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {bootSimEngine} from '../src/sim/arena';
import {loadAccountAsync,saveAccount} from '../src/meta/persistence';
import {ensureAccountId,serializeAccount,type AccountSave} from '../src/meta/account';
import {serializeCharacter,saveCharacter,readCharacterResume,CHAR_SLOT,type CharacterSave} from '../src/meta/character';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {prepareCharacterWorld} from '../src/meta/resumeWorld';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {setupVerminfallDraft,verminfallOutputPath} from './nativeVerminfallFixture';
const nativeFetch=globalThis.fetch;bootSimEngine();
const restoreRandom=seedGlobalRandom(55501),pending=new Set<Promise<Response>>(),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{value:{localStorage:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);},removeItem:(key:string)=>{memory.delete(key);}}},configurable:true});
function transport(url:string){Object.defineProperty(globalThis,'fetch',{configurable:true,value:(input:string|URL|Request,init?:RequestInit)=>{
 const promise=nativeFetch(typeof input==='string'&&input.startsWith('/')?new URL(input,url):input,init);pending.add(promise);void promise.finally(()=>pending.delete(promise));return promise;
}});}
async function flush(){while(pending.size)await Promise.all([...pending]);}
const child=process.argv.indexOf('--child'),require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
interface Expected {account:AccountSave;mode:'nests'|'king';zoneId:string;eventId:string;remaining:number;seen:number;old:{id:number;def?:string;life:number;max:number}[]}
if(child>=0){
 transport(process.argv[child+1]);const output=process.argv[child+2],lane=process.argv[child+3],expected=JSON.parse(readFileSync(output+'.expected.json','utf8')) as Expected;
 assert.equal(memory.size,0);const account=await loadAccountAsync();assert(account.accountId);assert.equal(account.accountId,expected.account.accountId);assert.deepEqual(serializeAccount(account),expected.account,'Fresh child loads the exact persisted account before Continue');const read=await readCharacterResume();if(read.status!=='ready')throw Error('No actual disk saved lease');
 const run=async(worldDrivers:string[])=>{
  const prepared=lane==='original'?await prepareCharacterWorld(account,read.resume,{spawn:'exact',fallbackSeed:1211,isCurrent:()=>true}):await prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true});
  const published=prepared.publish(),made=lane==='retained'?published as ReturnType<Awaited<ReturnType<typeof prepareNativeCharacterContinue>>['publish']>:undefined;
  const w=made?made.writer:published as import('../src/engine/world').World,vf=w.sim.verminfallField;assert(vf);assert.equal(w.zone.id,expected.zoneId);
  const restored=(vf.snapshot() as {infestations:{id:string;zoneId:string;nestsTotal:number;nestsBroken:number;dead:boolean}[]}).infestations.find(x=>!x.dead&&x.zoneId===expected.zoneId);
  assert(restored);assert.equal(restored.id,expected.eventId);assert.equal(restored.nestsTotal-restored.nestsBroken,expected.remaining);
  const nests=()=>w.actors.filter(x=>!x.dead&&x.tag==='warren_nest'),kings=()=>w.actors.filter(x=>!x.dead&&x.tag==='rat_king_manifest');
  assert.equal(nests().length,expected.remaining);assert.equal(kings().length,expected.mode==='king'?1:0);
  const bodies=[...nests(),...kings()];assert(bodies.length);assert(bodies.every(x=>x.life===x.maxLife()),'Cold resume uses native fresh health, not warm body checkpoints');
  assert.equal(w.ledger.infestation_seen,expected.seen,'Durable seen flag prevents duplicate discovery');
  // Assert genuine cold birth before any explicit materializer can repair it.
  if(made)made.runtime.current.combat.verminfallLifetime.materializeLiveZoneEvents();else w['materializeLiveZoneEvents']();
  assert.deepEqual([...nests(),...kings()],bodies,'Live recheck preserves the exact already-born cold cohort');assert([...nests(),...kings()].every((body,index)=>body===bodies[index]),'Cold live recheck retains strict body identity');assert.equal(w.ledger.infestation_seen,expected.seen);
  const kill=(body:typeof w.player)=>made?made.runtime.current.combat.kill(body,false,w.player):w.kill(body,false,w.player);
  const before=w.ledger.infestations_cleared??0;for(const nest of nests())kill(nest);assert.equal(kings().length,1);kill(kings()[0]);
  assert.equal(w.ledger.infestations_cleared,before+1);assert.equal(vf.infestOn(expected.zoneId),null);
  const report={lane,accountId:account.accountId,accountCredits:account.credits,persistedAccountVerified:true,mode:expected.mode,restoredNests:expected.remaining,restoredKing:expected.mode==='king',allFresh:true,seen:w.ledger.infestation_seen,clearDelta:(w.ledger.infestations_cleared??0)-before,worldDrivers};
  writeFileSync(output+'.'+lane+'.json',JSON.stringify(report,null,2));made?.runtime.retire();console.log(JSON.stringify(report));return report;
 };
 try{if(lane==='retained')await refuseWorldContinue(run);else await run([]);}finally{restoreRandom();}
}else{
 const mode=process.argv.includes('--king')?'king':'nests';
 const {startGameServer}=require('../launcher/server.cjs') as {startGameServer:(options:{root:string;savesDir:string;port:number})=>Promise<{url:string;server:import('node:http').Server}>};
 const directory=verminfallOutputPath('cold-'+mode+'-'+process.pid);mkdirSync(directory,{recursive:true});
 const output=resolve(directory,'verminfall'),server=await startGameServer({root,savesDir:directory,port:0});transport(server.url);
 let baseline:{account:string;character:string}|undefined;
 try{
  await refuseWorldContinue(async worldDrivers=>{
   const s=setupVerminfallDraft();try{
    await flush();if(mode==='king'){for(const nest of s.nests())s.kill(nest);assert(s.king());}else{s.kill(s.nests()[0]);assert(s.nests().length>0,'fixture needs a partial warren');}
    const bodies=[...s.nests(),...(s.king()?[s.king()!]:[])];assert(bodies.every(x=>!x.fromZoneGen));for(const body of bodies)body.life=Math.max(1,body.maxLife()*.37);
    const info=s.vf.infestOn(s.def.id);assert(info);
    ensureAccountId(s.account);s.account.credits=73;s.account.namePref='Verminfall cold audit';
    const expected:Expected={account:structuredClone(serializeAccount(s.account)),mode,zoneId:s.def.id,eventId:s.event.id,remaining:info.nestsRemaining,seen:s.w.ledger.infestation_seen??0,old:bodies.map(x=>({id:x.id,def:x.defId,life:x.life,max:x.maxLife()}))};
    assert(serializeCharacter(s.w).world?.nativeRetained);saveAccount(s.account);saveCharacter(s.w);await flush();
    const diskAccount=JSON.parse(readFileSync(resolve(directory,'save_0.json'),'utf8')) as AccountSave;assert.deepEqual(diskAccount,expected.account,'Parent account fixture actually reached disk');
    baseline={account:readFileSync(resolve(directory,'save_0.json'),'utf8'),character:readFileSync(resolve(directory,'save_'+CHAR_SLOT+'.json'),'utf8')};
    const disk=JSON.parse(baseline.character) as CharacterSave;
    const remembered=disk.world!.memory!.find(row=>row.zoneId===s.def.id);assert(remembered);
    assert(remembered.enemies.every(row=>row.tag!=='warren_nest'&&row.tag!=='rat_king_manifest'),'Native durable memory omits transient infestation bodies');
    writeFileSync(output+'.parent-save.json',JSON.stringify(disk));writeFileSync(output+'.expected.json',JSON.stringify(expected));console.log(JSON.stringify({parent:expected,worldDrivers}));
   }finally{s.start.cancel();}
  });
  assert(baseline);
  // Each real child may autosave while continuing. Give each the exact original
  // account/character bytes on its own disk endpoint, never the prior child's writes.
  for(const lane of ['original','retained']){
   const laneDirectory=resolve(directory,lane);mkdirSync(laneDirectory,{recursive:true});
   writeFileSync(resolve(laneDirectory,'save_0.json'),baseline.account);writeFileSync(resolve(laneDirectory,'save_'+CHAR_SLOT+'.json'),baseline.character);
   const laneServer=await startGameServer({root,savesDir:laneDirectory,port:0});
   try{await new Promise<void>((ok,reject)=>{
    const processChild=spawn(process.execPath,[require.resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child',laneServer.url,output,lane],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
    let log='';processChild.stdout.on('data',bytes=>{log+=bytes;});processChild.stderr.on('data',bytes=>{log+=bytes;});processChild.on('error',reject);processChild.on('close',code=>{writeFileSync(output+'.'+lane+'.child.log',log);if(code!==0)reject(Error('Cold Verminfall child failed '+code+'; '+log));else ok();});
   });}finally{laneServer.server.closeAllConnections();await new Promise<void>((ok,reject)=>laneServer.server.close(error=>error?reject(error):ok()));}
  }
  const ordinary=JSON.parse(readFileSync(output+'.original.json','utf8')),retained=JSON.parse(readFileSync(output+'.retained.json','utf8'));
  assert.equal(retained.restoredNests,ordinary.restoredNests);assert.equal(retained.restoredKing,ordinary.restoredKing);assert.equal(retained.clearDelta,ordinary.clearDelta);
  writeFileSync(output+'.comparison.json',JSON.stringify({ordinary,retained},null,2));
 }finally{await flush();server.server.closeAllConnections();await new Promise<void>((ok,reject)=>server.server.close(error=>error?reject(error):ok()));restoreRandom();}
}
