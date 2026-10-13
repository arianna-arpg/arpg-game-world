import '../src/engine/world';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,serializeAccount,deserializeAccount} from '../src/meta/account';
import {serializeCharacter,writeCharacterMirrorRaw,readCharacterResume,CHAR_SLOT} from '../src/meta/character';
import {townStationFeatures} from '../src/data/townBuild';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import type {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {refuseWorldContinue} from './nativeClientContinueFixture';
import {seedGlobalRandom} from '../src/sim/rng';
import {combatHash,writeCombatProof} from './probe_nativecombatcycle';
bootSimEngine();const restoreRandom=seedGlobalRandom(46115),memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}}}});
Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
function travel(runtime:NativeClientRuntime,id:string){const from=runtime.current,c=from.combat.input.coordinator;c.runFrom(from,()=>c.loadZone(id,from.assembly.input.scene.zone.id));}
function board(runtime:NativeClientRuntime){const w=runtime.writer,town=runtime.current,a=w.stationAnchor('bounty_board');assert(a);w.player.pos=town.assembly.input.geometry.clampPos({x:a.pos.x+95,y:a.pos.y},w.player.radius);w.player.tier=a.tier;assert(w.nearBountyBoard());}
const bytesArg=process.argv.indexOf('--bytes');
const path=bytesArg>=0?resolve(process.argv[bytesArg+1]):(()=>{const reports=resolve('balance/reports');mkdirSync(reports,{recursive:true});return join(mkdtempSync(join(reports,'native-bounty-cold-')),'bytes.json');})();
if(process.argv.includes('--child')){
 const saved=JSON.parse(readFileSync(path,'utf8')),account=deserializeAccount(saved.account);assert(account);assert.equal(memory.size,0);await writeCharacterMirrorRaw(CHAR_SLOT,JSON.stringify(saved.character));const lease=await readCharacterResume();assert.equal(lease.status,'ready');if(lease.status!=='ready')throw Error('Saved input refused');
 const result=await refuseWorldContinue(async worldDrivers=>{const prepared=await prepareNativeCharacterContinue(account,lease.resume,{spawn:'exact',isCurrent:()=>true}),made=prepared.publish(),w=made.writer,r=made.runtime,field=r.current,raw=field.assembly.input.scene.actors;assert.equal(w.zone.id,saved.target);assert.equal(raw.filter(a=>a.tag==='bounty_mark'&&!a.dead).length,0);travel(r,'lastlight');board(r);const p=w.bountyOffers.find(p=>p.id===saved.posting);assert(p?.cull);r.current.combat.campaignFrame.applyAction(w.localSeat,{t:'bountyAccept',id:p.id});assert(w.bountyHands.includes(p));travel(r,p.zoneId);assert.equal(r.current,field);assert.equal(field.assembly.input.scene.actors,raw);const marks=raw.filter(a=>a.tag==='bounty_mark'&&!a.dead);assert.equal(marks.length,p.cull.count);travel(r,'lastlight');travel(r,p.zoneId);assert.deepEqual(raw.filter(a=>a.tag==='bounty_mark'&&!a.dead),marks);for(const mark of marks)field.combat.kill(mark,false,w.player);assert.equal(p.cull.claimed,p.cull.count);travel(r,'lastlight');board(r);const before=w.ledger.bounty_done??0;r.current.combat.campaignFrame.applyAction(w.localSeat,{t:'bountyTurnIn',id:p.id});assert.equal(w.ledger.bounty_done,before+1);assert(!w.bountyHands.includes(p));const facts={coldProcess:true,emptyInitialMirror:true,originalTarget:saved.target,posting:p.id,marks:marks.length,claimed:p.cull.claimed,sameRestoredArea:true,sameRestoredCensus:true,pay:p.pay,receipt:w.bountyReceipt,worldDrivers};r.retire();prepared.discard();return facts;});writeFileSync(path+'.result.json',JSON.stringify(result));console.log(JSON.stringify(result));
}else{
 await refuseWorldContinue(async worldDrivers=>{const account=makeAccount();for(const f of townStationFeatures())account.features.add(f);const start=new NativeClientStart(account),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,46115),prologue:'skip'});assert(made);const r=made.runtime,w=made.writer;r.current.combat.campaignFrame.tick(1/30);board(r);for(let i=0;i<90&&!w.bountyDwellRequested;i++)r.current.combat.campaignFrame.tick(1/30);assert(w.bountyDwellRequested);const p=w.bountyOffers.find(p=>p.kind==='cull');assert(p?.cull);travel(r,p.zoneId);assert.equal(w.actors.filter(a=>a.tag==='bounty_mark'&&!a.dead).length,0);writeFileSync(path,JSON.stringify({account:serializeAccount(account),character:serializeCharacter(w),posting:p.id,target:p.zoneId,worldDrivers}));start.cancel();});
 await new Promise<void>((ok,fail)=>{const child=spawn(process.execPath,[createRequire(import.meta.url).resolve('tsx/cli'),fileURLToPath(import.meta.url),'--child','--bytes',path],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});let text='';child.stdout.on('data',b=>text+=b);child.stderr.on('data',b=>text+=b);child.on('error',fail);child.on('close',code=>{writeFileSync(path+'.child.log',text);if(code)fail(Error('Cold bounty child failed '+code+': '+text));else ok();});});
 const result=JSON.parse(readFileSync(path+'.result.json','utf8')),report={scope:'Real default-catalog fresh start saved in the already-visited target before accepting its actual posting; independent process receives exact saved bytes through real storage lease and Continue, accepts in town, revisits the same restored area, completes native kills and turns in. Disk/HTTP transport is covered separately by original Continue proofs.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-bounty-arrival-cold.json',report);console.log(JSON.stringify(report));
}restoreRandom();
