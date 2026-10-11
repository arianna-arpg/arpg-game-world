import {beforeNativeSceneProgression} from './nativeSceneProgressionFixture';
import {beforeNativeSceneQuest} from './nativeSceneQuestFixture';
/** Objective watcher parity: native geometry/factories/holds/rewards execute;
 * movement and quest-attribution boundaries are explicit recording test ports. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import * as core from '../src/engine/nativeSceneObjectiveWatching';
import {World} from '../src/engine/world';
import {nextItemUid} from '../src/engine/itemgen';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {PROGRESSION} from '../src/data/classes';
import {registerPackageAsk,registerVentureAsk} from '../src/data/objectives';
import {resetActorIdCounter} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState} from '../src/worldmass/nativeAreaSceneObjectiveWatching';
import {spawnSceneWave} from '../src/engine/nativeScenePopulation';
import {sceneObjectiveServices} from '../src/worldmass/nativeSceneObjectives';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {nativeSceneObjectiveWatchingArchive as archive,nativeSceneObjectiveWatchingArchiveHash} from './nativeSceneObjectiveWatchingArchive';
import {beforeNativeSceneObjectiveWatching} from './nativeSceneObjectiveWatchingFixture';
import {dist,rand,randInt,vec} from "../src/core/math";
import {Actor} from "../src/engine/actor";
import {FACTIONS,MONSTERS} from "../src/data/monsters";
import {BEACON_CFG} from "../src/data/beacons";
import {LEYLINE_CFG} from "../src/data/leyline";
import {RIFT_CFG} from "../src/data/rifts";
import {PYRE_CFG} from "../src/data/pyres";
import {DIG_CFG} from "../src/data/digsites";
import {biasTable,composeBias} from "../src/world/overlay";
import {driveNativeBeacon,nativeBeaconConfig} from "../src/engine/beaconObjectives";
import {driveNativeRiftPours,finishNativeDig,driveHoldObjectives,resolveHoldContest} from "../src/engine/holdObjectives";
import {driveNativeProcession,nativeProcessionConfig,nativeProcessionSteering} from "../src/engine/processionObjectives";
import {OFFERING_CFG,packageAskRow,ventureAskRow} from "../src/data/objectives";
import {sameStory} from "../src/engine/tiers";
import {sidezoneOf} from "../src/data/sidezones";
import {DWELL_CFG,transitDwell} from "../src/data/transit";
import {WAVE_CFG} from "../src/data/waves";
import {Rng} from "../src/core/rng";
import {factionAllowed} from "../src/world/zonePolicy";
import {castRay} from "../src/engine/los";
import {dayCycle} from "../src/world/daynight";

const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const parse=(s:string)=>ts.createSourceFile('proof.ts',s,99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:99,module:99,removeComments:true}}).outputText;
assert.equal(hash(JSON.stringify(archive)),nativeSceneObjectiveWatchingArchiveHash);
const restored=beforeNativeSceneObjectiveWatching(beforeNativeSceneQuest(beforeNativeSceneProgression(read('src/engine/world.ts')))),sf=parse(restored),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
assert.equal(hash(JSON.stringify(cl.members.map(m=>m.getText(sf).replaceAll('\r\n','\n')))),archive.worldHash,'complete pre-watcher World');
const cs=parse(read('src/engine/nativeSceneObjectiveWatching.ts'));
for(const row of archive.rows){const original=parse('class A{'+row.before+'}'),method=(original.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const current=cs.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===row.fn) as ts.FunctionDeclaration;
 const body=method.body!.getText(original).replace(row.prefix||'__no_prefix__','').replace(/\bthis\b/g,'host');
 assert.equal(emit('function body()'+body),emit('function body()'+current.body!.getText(cs)),'complete watcher operation '+row.name);
}
if(process.argv.includes('--provenance')){const old=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:12e6}),os=parse(old),oc=os.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;assert.equal(hash(JSON.stringify(oc.members.map(m=>m.getText(os).replaceAll('\r\n','\n')))),archive.worldHash);for(const row of archive.rows)assert.equal(oc.members.find(m=>m.name?.getText(os)===row.name)?.getText(os).replaceAll('\r\n','\n'),row.before);}
const bindings={dist,rand,randInt,vec,Actor,FACTIONS,MONSTERS,BEACON_CFG,LEYLINE_CFG,RIFT_CFG,PYRE_CFG,DIG_CFG,biasTable,composeBias,driveNativeBeacon,nativeBeaconConfig,driveNativeRiftPours,finishNativeDig,driveHoldObjectives,resolveHoldContest,driveNativeProcession,nativeProcessionConfig,nativeProcessionSteering,OFFERING_CFG,packageAskRow,ventureAskRow,sameStory,sidezoneOf,DWELL_CFG,transitDwell,WAVE_CFG,Rng,factionAllowed,castRay,dayCycle};
const originals=new Function(...Object.keys(bindings),emit('class Archive{'+archive.rows.map(r=>r.before).join('\n')+'}\nreturn Archive.prototype;'))(...Object.values(bindings));
makeSimWorld('warrior',17146);
const rows=archive.rows;
type Lane='original'|'world'|'core'|'owner';
const receipts:any[]=[];let itemUidBase=0;
function graph(v:any,memo=new Map<object,number>()):any {
 if(v instanceof Actor)return {actor:v.id};if(v===null||typeof v!=='object')return typeof v==='function'?'function':v;
 if(memo.has(v))return {ref:memo.get(v)};const id=memo.size;memo.set(v,id);
 if(v instanceof Map)return {id,map:[...v].map(([k,x])=>[graph(k,memo),graph(x,memo)])};
 if(v instanceof Set)return {id,set:[...v].map(x=>graph(x,memo))};
 return {id,values:Object.fromEntries(Object.keys(v).map(k=>[k,k==='uid'&&typeof v[k]==='number'?v[k]-itemUidBase:graph(v[k],memo)]))};
}
function fixture(lane:Lane){
 resetActorIdCounter(930000);itemUidBase=nextItemUid();window.localStorage.clear();const w=makeSimWorld('warrior',17147);w.massRuntime=null;w.time=50;w.kills=0;w.player.level=20;w.meta.xp=0;w.meta.xpNeeded=PROGRESSION.xpForLevel(20);
 const definition={...w.zone,id:'watcher-area',level:1,objective:{kind:'clear'},packs:undefined} as any;
 w.zoneMap[definition.id]=definition;const raw=freshAssemblyInput(w,definition);const campaign=raw.campaign as any;campaign.kills=0;
 const a=new NativeAreaSceneAssembly(raw),i=a.input,scene=i.scene,geometry=i.geometry,objectives=i.objectives;
 scene.player.pos={x:500,y:500};const tape:any[]=[];
 const os=sceneObjectiveServices(i.population,objectives,{get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},notice:geometry.notice.bind(geometry),text:geometry.text.bind(geometry),pathField:geometry.pathField.bind(geometry),farPoint:geometry.farPoint.bind(geometry),pointInSolid:geometry.pointInSolid.bind(geometry),farthestStand:geometry.farthestStand.bind(geometry)});
 const state=freshSceneObjectiveWatchingState(0);const authority=new NativeAreaActorAuthority<object>(campaign),binding=authority.register(scene,{});authority.claim(binding,scene.actors);
 const quests={nearestHand(places:any){tape.push(['nearestHand',graph(places)]);return w.localSeat;}};
 const movement={moveActor(actor:Actor,dx:number,dy:number,dt:number){tape.push(['move',actor.id,dx,dy,dt]);}};
 const owner=new NativeAreaSceneObjectiveWatching({authority,scene,geometry,population:i.population,objectives,state,birthState:i.state,environment:i.environment,physical:i.physical,completion:a.objectiveController,loot:a.lootController,graph:a.graph,coast:i.coast,theater:i.theater,adoption:i.adoption,objectiveServices:os,campaign,quests,movement});
 let driver:any=owner;
 if(lane!=='owner'){
  const h:any={};const extracted=new Set(rows.map(r=>r.name));for(const key of Reflect.ownKeys(owner.host)){if(key==='createMonster'||key==='spawnWave'||typeof key==='string'&&extracted.has(key as any))continue;Object.defineProperty(h,key,Object.getOwnPropertyDescriptor(owner.host,key)!);}
  h.createMonster=i.population.createMonster.bind(i.population);h.spawnWave=()=>spawnSceneWave(os);
  h.nativeSceneObjectiveWatchingHost=lane==='world'?(World.prototype as any).nativeSceneObjectiveWatchingHost:()=>h;
  for(const row of rows)h[row.name]=lane==='original'?originals[row.name]:lane==='world'?(World.prototype as any)[row.name]:function(...args:any[]){return (core as any)[row.fn](h,...args);};driver=h;
 }
 const enemy=(id='goblin_skirmisher')=>{const actor=i.population.createMonster(id,1,'enemy');actor.pos={x:530,y:500};scene.actors.push(actor);authority.claim(binding,[actor]);return actor;};
 const fixture=(key:'spires'|'rifts'|'pyres'|'digs',charge=0)=>{const d:any={kind:'rock',pos:{x:500,y:500},radius:16,tier:0};geometry.doodads.push(d);geometry.markDoodadsChanged();const f:any={pos:d.pos,doodad:d,charge,recoup:0,pourAt:1e6};objectives[key].push(f);return f;};
 function snapshot(){return {zone:graph(scene.zone),actors:scene.actors.map(x=>({id:x.id,state:captureNativeActorState(x)})),objectives:graph(objectives),state:graph(state),engaged:i.state.packageAskEngaged,flashes:graph(geometry.flashes),drops:graph(i.physical.input.state.drops),text:graph(a.objectiveController.input.state.texts),completed:[...campaign.completedObjectives],ledger:graph(campaign.ledger),xp:w.localSeat.meta.xp,tape};}
 return {driver,owner,a,i,authority,binding,scene,geometry,objectives,state,campaign,tape,enemy,fixture,snapshot};
}
type Fixture=ReturnType<typeof fixture>;
function pair(label:string,course:(f:Fixture)=>unknown,seed=8447){
 const run=(lane:Lane)=>{const prior=Math.random,rng=new Rng(seed),draws:number[]=[];Math.random=()=>{const n=rng.next();draws.push(n);return n;};try{const f=fixture(lane);const result=course(f);if(lane==='owner')f.authority.assertAdmitted(f.scene);return {result,snapshot:f.snapshot(),draws,next:Math.random(),itemUidWitness:nextItemUid()-itemUidBase};}finally{Math.random=prior;}};
 const expected=run('original');for(const lane of ['world','core','owner'] as const)assert.deepEqual(run(lane),expected,label+' '+lane);receipts.push({label,receipt:hash(JSON.stringify(expected)),draws:expected.draws.length});
}

for(const kind of ['safe','none'])pair('no-errand:'+kind,f=>{f.scene.zone.objective={kind} as any;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,false);});
for(const mode of ['empty','living','cull-paid','cull-short','already-done'])pair('clear:'+mode,f=>{f.scene.zone.objective={kind:'clear'};if(mode!=='empty')f.enemy();if(mode.startsWith('cull'))f.objectives.cull={need:3,kills:mode==='cull-paid'?3:2};if(mode==='already-done')f.objectives.objectiveDone=true;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,['empty','cull-paid','already-done'].includes(mode));});
for(const alive of [true,false])pair('boss:'+alive,f=>{f.scene.zone.objective={kind:'boss',id:'goblin_brute'};const e=f.enemy('goblin_brute');e.dead=!alive;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,!alive);});
for(const kind of ['bounty','leyline','spawners'])for(const alive of [true,false])pair(kind+':'+alive,f=>{f.scene.zone.objective={kind} as any;const e=f.enemy(kind==='spawners'?Object.values(MONSTERS).find(m=>m.spawner)!.id:'goblin_skirmisher');e.tag=kind==='bounty'?'bounty_mark':kind==='leyline'?'ley_siphon':undefined;if(kind==='spawners')(e as any).spawner={timer:0,spec:{}};e.dead=!alive;f.geometry.waypointPos={x:530,y:500};f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,!alive);});
for(const mode of ['empty','standing','done'])pair('puzzle:'+mode,f=>{f.scene.zone.objective={kind:'puzzle'} as any;if(mode!=='empty')f.i.environment.input.state.puzzles.push({isObjective:true,done:mode==='done',spec:{label:'Ancient lock'},kind:{label:'Lock'}} as any);f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode!=='standing');});
for(const mode of ['hunt-standing','hunt-done','missing-den'])pair('lair:'+mode,f=>{f.scene.zone.objective={kind:'lair',title:'Hidden lair',...(mode==='missing-den'?{mouthKind:'unknown-den'}:{kin:['goblin_brute']})} as any;if(mode==='hunt-standing')f.enemy('goblin_brute');f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode!=='hunt-standing');});
let pkg:any,venture:any;
registerPackageAsk({pkg:'watcher-parity-package',title:'Guest',standing:()=>null,view:(h,z)=>{assert.ok(h.sim);assert.ok(Array.isArray(h.exits));assert.equal(z.id,'watcher-area');return pkg;}});
registerVentureAsk({id:'watcher-parity-venture',title:()=> 'Venture',standing:()=>null,view:(h,z)=>{assert.ok(h.sim);assert.ok(Array.isArray(h.exits));assert.equal(z.id,'watcher-area');return venture;}});
for(const mode of ['untouched','engaged','dead','vanished'])pair('package:'+mode,f=>{f.scene.zone.objective={kind:'package',pkg:mode==='vanished'?'missing':'watcher-parity-package',key:'run',title:'Guest'};pkg={standing:true,engaged:mode!=='untouched',pos:{x:500,y:500},label:'guest'};f.driver.updateObjective(1);if(mode==='vanished'){assert.equal(f.scene.zone.objective.kind,'clear');return;}assert.equal(f.objectives.objectiveDone,false);pkg.standing=false;if(mode==='dead')f.scene.player.dead=true;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='engaged');if(mode!=='engaged')assert.equal(f.scene.zone.objective.kind,'clear');});
for(const mode of ['standing','won','lost','vanished'])pair('venture:'+mode,f=>{f.scene.zone.objective={kind:'venture',venture:mode==='vanished'?'missing':'watcher-parity-venture',key:'run',title:'Gate'};venture={verdict:mode,pos:{x:500,y:500},label:'gate',wonText:'Gate opened',lostText:'Gate lost'};f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='won');if(mode==='lost'||mode==='vanished')assert.equal(f.scene.zone.objective.kind,'clear');if(mode==='won'||mode==='lost')assert.ok(f.objectives.objectiveLatch);});
for(const kind of ['rifts','pyres','unearth'])for(const mode of ['empty','held','contested','dead','different-story'])pair(kind+':'+mode,f=>{f.scene.zone.objective={kind,sealSec:2,kindleSec:2,digSec:2,contest:mode==='contested'?undefined:false} as any;const key=kind==='rifts'?'rifts':kind==='pyres'?'pyres':'digs';if(mode!=='empty'){const r=f.fixture(key);if(mode==='different-story')r.doodad.tier=1;if(mode==='dead')f.scene.player.dead=true;if(mode==='contested')f.enemy();}f.driver.updateObjective(3);assert.equal(f.objectives.objectiveDone,mode==='held');});
for(const mode of ['hungry','sated','missing'])pair('offering:'+mode,f=>{f.scene.zone.objective={kind:'offering'} as any;f.objectives.offering=mode==='missing'?null:{altarIdx:0,need:3,offered:mode==='sated'?3:2};f.i.physical.input.state.altars.push({pos:{x:500,y:500},def:{radius:100}} as any);f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,mode==='sated');});
for(const mode of ['empty','charging','contested','complete'])pair('beacon:'+mode,f=>{f.scene.zone.objective={kind:'beacon',chargeSec:2,reinforce:false,revealRadius:0,revealCount:0,contest:mode==='contested'?undefined:false};if(mode!=='empty')f.fixture('spires');if(mode==='contested')f.enemy();f.driver.updateObjective(mode==='complete'?3:0.5);assert.equal(f.objectives.objectiveDone,mode==='complete');});
for(const mode of ['cooldown','packless','spawn'])pair('escape:'+mode,f=>{f.scene.zone.objective={kind:'escape',interval:[3,3]};f.state.escapeTimer=mode==='cooldown'?4:0;if(mode==='spawn')f.scene.zone.packs={table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]} as any;f.driver.updateObjective(1);assert.equal(f.objectives.objectiveDone,false);if(mode==='spawn')assert.ok(f.scene.actors.length>1);});
for(const mode of ['win','rest','spawn','living'])pair('waves:'+mode,f=>{f.scene.zone.objective={kind:'waves',waves:1};f.objectives.wave=1;f.objectives.waveActive=mode==='win'||mode==='living';if(mode==='living')f.enemy();if(mode==='spawn'){f.scene.zone.packs={table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]} as any;f.objectives.waveTimer=0;}f.driver.updateObjective(0.1);assert.equal(f.objectives.objectiveDone,mode==='win');});
for(const mode of ['missing','dead','rally','rolling','robbed','arrival','ambush'])pair('procession:'+mode,f=>{f.scene.zone.objective={kind:'procession'} as any;const cart=f.i.population.createMonster(nativeProcessionConfig({kind:'procession'}).cartId,1,'player');cart.pos={x:500,y:500};f.scene.actors.push(cart);f.authority.claim(f.binding,[cart]);f.objectives.procession={cartId:mode==='missing'?999:cart.id,rolling:['rolling','robbed','arrival','ambush'].includes(mode),started:false,startPos:{...cart.pos},dest:{x:mode==='arrival'?500:900,y:500},destIdx:0,dwellStart:48,puffAt:mode==='ambush'?0:1e6,heading:0};if(mode==='dead')cart.dead=true;if(mode==='robbed')f.enemy();f.driver.updateObjective(0.1);assert.equal(f.objectives.objectiveDone,mode==='arrival');assert.equal(f.objectives.objectiveLost,mode==='dead'||mode==='missing');});
// A cached source player must never attend A from B's same local coordinates.
{
 const f=fixture('owner');f.scene.zone.objective={kind:'pyres',kindleSec:2,contest:false};const stone=f.fixture('pyres');
 const hero=f.scene.player,other={zone:{...f.scene.zone,id:'neighbor'},actors:[hero],player:hero};const binding=f.authority.register(other,{});
 f.scene.actors=f.scene.actors.filter(a=>a!==hero);f.authority.transfer(hero,f.binding,binding);const before=JSON.stringify(f.snapshot());
 assert.throws(()=>f.driver.updateObjective(3),/present area player/);assert.equal(stone.charge,0);assert.equal(JSON.stringify(f.snapshot()),before);
 f.scene.actors.push(hero);other.actors=[];f.authority.transfer(hero,binding,f.binding);f.driver.updateObjective(3);assert.equal(stone.charge,2);assert.equal(f.objectives.objectiveDone,true);
 const counterfeitPhysical={...f.i.physical,input:{...f.i.physical.input,state:{...f.i.physical.input.state,drops:[]}}};
 assert.throws(()=>new NativeAreaSceneObjectiveWatching({...f.owner.input,physical:counterfeitPhysical as any}),/physical and environment stores/);
 const borrowed=new Actor('borrowed','player',{x:500,y:500});f.scene.actors.push(borrowed);const prior=JSON.stringify(f.snapshot());assert.throws(()=>f.driver.updateObjective(1),/unowned or borrowed/);assert.equal(JSON.stringify(f.snapshot()),prior);
}
// The legacy geographic dispatcher remains outside the retained native watcher.
for(const method of [originals.updateObjective,(World.prototype as any).updateObjective]){
 const calls:any[]=[],h:any={heldFixture:{},massRuntime:{geography:{update(w:any,dt:number){assert.equal(this,h.massRuntime.geography);calls.push([w===h,dt]);}}}};
 method.call(h,0.125);assert.equal(h.heldFixture,null);assert.deepEqual(calls,[[true,0.125]]);
}
console.log('PASS native objective watcher: '+receipts.length+' original/World/core/retained courses; receipt '+hash(JSON.stringify(receipts)));
