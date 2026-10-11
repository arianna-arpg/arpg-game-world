/** Native puzzle extraction parity. Geometry/effect recordings below are labeled
 * test boundaries, never runtime publication or neighboring-area loot adapters. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {nativeScenePuzzleArchive as archive,nativeScenePuzzleArchiveHash} from './nativeScenePuzzleArchive';
import {beforeNativeScenePuzzles} from './nativeScenePuzzleFixture';
import * as core from '../src/engine/nativeScenePuzzles';
import {World,SCENERY_CFG} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {Rng} from '../src/core/rng';
import {dist,rand,vec} from '../src/core/math';
import {STATUS_DEFS} from '../src/engine/status';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {resolveLootTable} from '../src/engine/loot';
import {nextItemUid} from '../src/engine/itemgen';
import {attunedStatus,toneTint,TUNE_CFG} from '../src/engine/tuning';
import {sameStory} from '../src/engine/tiers';
import {pickKnockNode,puzzleHumOf,puzzleKnockOf,puzzleRewardOf,puzzleSpillOf,PUZZLE_KINDS,type PuzzleRun} from '../src/engine/puzzles';
import {PUZZLES,SHRINE_INNERS} from '../src/data/puzzles';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {NativeAreaSceneEnvironment,freshSceneEnvironmentState} from '../src/worldmass/nativeAreaSceneEnvironment';
import {NativeAreaScenePuzzles} from '../src/worldmass/nativeAreaScenePuzzles';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const read=(path:string)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const parse=(value:string)=>ts.createSourceFile('proof.ts',value,ts.ScriptTarget.ES2022,true);
const emit=(value:string)=>ts.transpileModule(value,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const cl=(text:string)=>{const sf=parse(text),node=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;assert.ok(node);return {sf,node};};
const members=(text:string)=>{const {sf,node}=cl(text);return node.members.map(m=>m.getText(sf).replaceAll('\r\n','\n'));};
assert.equal(hash(JSON.stringify(archive)),nativeScenePuzzleArchiveHash,'immutable original archive');
assert.equal(hash(JSON.stringify(members(beforeNativeScenePuzzles(read('src/engine/world.ts'))))),archive.worldHash,'all other World members remain exact');
// An optional provenance audit proves the archive against the actual pre-change
// commit; ordinary checks remain durable in exported source trees without Git.
if(process.argv.includes('--provenance')){
 const before=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:8*1024*1024});
 const {sf,node}=cl(before);
 assert.equal(hash(JSON.stringify(members(before))),archive.worldHash);
 for(const row of archive.rows)assert.equal(node.members.find(m=>m.name?.getText(sf)===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.before,'git original '+row.name);
 assert.equal(node.members.find(m=>m.name?.getText(sf)==='spoilsSealed')?.getText(sf).replaceAll('\r\n','\n'),archive.sealing);
}
const source=parse(read('src/engine/nativeScenePuzzles.ts'));
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
for(const row of [...archive.rows,{name:'puzzleSpoilsSealed',before:archive.sealing}]){
 const old=parse('class Archive{'+row.before+'}'),before=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const after=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
 assert.ok(after?.body,row.name);
 assert.equal(emit('function proof(){'+after.body.statements.map(s=>s.getText(source)).join('\n')+'}'),emit('function proof(){'+before.body!.statements.map(s=>s.getText(old)).join('\n').replace(/\bthis\b/g,'owner')+'}'),'exact executable native body '+row.name);
}
const bindings={dist,rand,vec,Actor,STATUS_DEFS,SKILLS,makeSkillInstance,resolveLootTable,attunedStatus,toneTint,TUNE_CFG,sameStory,pickKnockNode,puzzleHumOf,puzzleKnockOf,puzzleRewardOf,puzzleSpillOf};
const archivedJS=emit('class Archive{'+archive.rows.map(r=>r.before).join('\n')+'}\nreturn Archive.prototype;');
const original=new Function(...Object.keys(bindings),archivedJS)(...Object.values(bindings)) as Record<string,Function>;
const factoryWorld=makeSimWorld('warrior',90217);
type Lane='original'|'world'|'core'|'owner';
const methods=archive.rows.map(r=>r.name);
let itemUidBase=0;
const has=(a:Actor,id:string)=>a.statuses.some(s=>s.id===id);
function graph(value:any,seen=new Map<object,number>()):any{
 if(value instanceof Actor)return {actor:value.id};
 if(value===null||typeof value!=='object')return typeof value==='function'?'[function]':value;
 if(seen.has(value))return {ref:seen.get(value)};
 const id=seen.size;seen.set(value,id);
 if(value instanceof Map)return {id,map:[...value].map(([k,v])=>[graph(k,seen),graph(v,seen)])};
 if(value instanceof Set)return {id,set:[...value].map(v=>graph(v,seen))};
 if(ArrayBuffer.isView(value))return {id,type:value.constructor.name,values:Array.from(value as any)};
 return {id,type:value.constructor.name,values:Object.fromEntries(Object.keys(value).map(k=>[k,k==='uid'&&typeof value[k]==='number'?value[k]-itemUidBase:graph(value[k],seen)]))};
}
function fixture(lane:Lane,seed=991,failAt=''){
 resetActorIdCounter(850000);itemUidBase=nextItemUid();
 const w:any=Object.create(World.prototype),time={time:37},state=freshSceneEnvironmentState();
 const actors:Actor[]=[];
 const actor=(name:string,team:'player'|'enemy',x=500,y=500)=>{const a=new Actor(name,team,vec(x,y));actors.push(a);return a;};
 const hero=actor('hero','player'),ally=actor('ally','player'),upper=actor('upper','player'),far=actor('far','player',9000),minion=actor('minion','player'),enemy=actor('enemy','enemy'),dead=actor('dead','player'),construct=actor('construct','player'),passive=actor('passive','player');
 upper.tier=1;minion.kind='minion';dead.life=0;dead.dead=true;construct.construct={kind:'totem',range:100,timer:0};passive.passive=true;
 const scene:any={actors,player:hero,zone:{...factoryWorld.zone,id:'puzzle-local',level:7,seed,objective:{kind:'none'},puzzles:[]}};
 let active=false;
 const tape:any[]=[],geometry:any={state:scene,currentZoneSeed:seed,flashes:[],doodads:[],walk:null,creep:null,arena:{shape:'rect',w:5000,h:5000},
  interactSpot(){assert.equal(this,geometry);return vec(500,500);},
  clampPos(p:any,r:number){assert.equal(this,geometry);tape.push(['clamp',graph(p),r]);if(active&&failAt==='clamp')throw Error('injected clamp');return vec(p.x,p.y);},
  pointInSolid(){return false;},markDoodadsChanged(){},
 };
 const effectPrototype:any={};
 const effects:any=Object.create(effectPrototype);
 for(const name of ['dropGemAt','mintLootResult','executeSkill'])effectPrototype[name]=function(this:any,...args:any[]){
  assert.equal(this,effects,'live inherited effect receiver '+name);
  tape.push([name,graph(args)]);if(active&&failAt===name)throw Error('injected '+name);
 };
 let controller:any;
 const services:any={get time(){return time.time;},objectiveDone:false,timeflow:{release(){throw Error('unexpected harvest effect');}},completePuzzle(run:PuzzleRun){return controller.completePuzzle(run);}};
 const environment=new NativeAreaSceneEnvironment({scene,geometry,population:{createMonster:(...args:any[])=>factoryWorld.createMonster(...args as Parameters<World['createMonster']>)},services,sources:{SCENERY_CFG},state});
 Object.assign(w,{hazardCaster:null});
 for(const [provider,keys] of [[state,['puzzles','puzzleKnocks','puzzleHostCache']],[scene,['zone','actors','player']],[geometry,['flashes']],[time,['time']]] as const)
  for(const key of keys)Object.defineProperty(w,key,{configurable:true,get(){return (provider as any)[key];},set(v){(provider as any)[key]=v;}});
 w.puzzleHost=(run?:PuzzleRun)=>environment.puzzleHost(run);
 w.spoilsSealed=function(){return this.zone.spoils==='none';};
 w.clampPos=(...args:any[])=>geometry.clampPos(...args);
 for(const name of ['dropGemAt','mintLootResult','executeSkill'])Object.defineProperty(w,name,{configurable:true,get(){const fn=effects[name];return (...args:any[])=>fn.apply(effects,args);}});
 if(lane==='owner')controller=new NativeAreaScenePuzzles({scene,geometry,environment,campaign:time,effects});
 else {
  controller=w;
  if(lane==='original')for(const name of methods)w[name]=original[name];
  if(lane==='core')for(const name of methods)w[name]=function(...args:any[]){return (core as any)['scene'+cap(name)](w,...args);};
 }
 const host=lane==='owner'?controller.host:w;
 function snapshot(){
  const all=[...scene.actors,...(host.hazardCaster?[host.hazardCaster]:[])];
  return {state:graph({puzzles:state.puzzles,puzzleKnocks:state.puzzleKnocks,flashes:geometry.flashes}),actors:all.map(a=>({id:a.id,state:captureNativeActorState(a)})),tape:[...tape],hazard:host.hazardCaster?.id,time:time.time};
 }
 return {lane,w,scene,state,geometry,effects,effectPrototype,environment,controller,host,time,tape,hero,ally,upper,far,minion,enemy,dead,construct,passive,snapshot,activate(){active=true;},boot(preset:string){scene.zone.objective={kind:'puzzle',puzzle:preset};environment.bootPuzzles(scene.zone,[]);tape.length=0;active=true;return state.puzzles[0];}};
}
type Fixture=ReturnType<typeof fixture>;
const receipts:any[]=[];
function compare(label:string,course:(f:Fixture)=>unknown,failAt='',seed=731){
 function run(lane:Lane){
  const rng=new Rng(seed),draws:any[]=[],prior=Math.random;
  Math.random=()=>{const before=rng.snapshot(),n=rng.next();draws.push([before,n,rng.snapshot()]);return n;};
  try{const f=fixture(lane,seed,failAt);let result:any,error:string|undefined;
   try{result=course(f);}catch(e){error=(e as Error).message;}
   return {result,error,snapshot:f.snapshot(),draws,sentinel:Math.random(),itemUidWitness:nextItemUid()-itemUidBase};
  }finally{Math.random=prior;}
 }
 const expected=run('original');
 for(const lane of ['world','core','owner'] as const)assert.deepEqual(run(lane),expected,label+' '+lane);
 if(failAt)assert.equal(expected.error,'injected '+failAt,label+' fault reached');else assert.equal(expected.error,undefined,label);
 receipts.push({label,seed,failAt,draws:expected.draws.length,hash:hash(JSON.stringify(expected))});
 return expected;
}
function strike(f:Fixture,run:PuzzleRun,index:number,striker:Actor|null=f.hero,wounding=true){f.controller.puzzleStruck(run.nodes[index],striker,wounding);f.controller.drainPuzzleKnocks();}
function step(f:Fixture,seconds:number){f.time.time+=seconds;f.controller.updatePuzzles(seconds);}
function solve(f:Fixture,run:PuzzleRun){
 switch(run.kind.id){
  case 'chord':for(const n of run.nodes){f.environment.setPuzzleTone(n,run.state.goal as any);f.controller.puzzleTuned(n,run.state.goal,f.hero);}break;
  case 'lattice':{
   const n=run.nodes.length,lit=run.state.lit as boolean[],w=run.state.w as number,h=run.state.h as number;
   const adjacency=(run.state.adj as number[][]|undefined)?.map((row,i)=>[i,...row])??run.nodes.map((_,i)=>[i,...(i%w>0?[i-1]:[]),...(i%w<w-1?[i+1]:[]),...(i>=w?[i-w]:[]),...(i<(h-1)*w?[i+w]:[])]);
   let chosen=-1;
   for(let mask=0;mask<(1<<n);mask++){const trial=[...lit];for(let i=0;i<n;i++)if(mask&(1<<i))for(const j of adjacency[i])trial[j]=!trial[j];if(trial.every(Boolean)){chosen=mask;break;}}
   assert.notEqual(chosen,-1,'native lattice is solvable');
   for(let i=0;i<n;i++)if(chosen&(1<<i)){step(f,1);strike(f,run,i);}break;
  }
  case 'refrain':
   for(let i=0;i<40&&run.state.phase!=='answer';i++)step(f,1);
   assert.equal(run.state.phase,'answer');
   for(const ix of run.state.seq as number[]){step(f,.02);strike(f,run,ix);}break;
  case 'tempo':for(const ix of run.state.order as number[]){step(f,.02);strike(f,run,ix);}break;
  case 'accord':{const pairs=run.nodes.length>>1;for(let i=0;i<pairs;i++){strike(f,run,i);step(f,.02);strike(f,run,i+pairs);}}break;
  case 'ember':for(let i=0;i<run.nodes.length;i++)strike(f,run,i);break;
  case 'exhumation':for(let pass=0;pass<(run.state.need as number);pass++){for(let i=0;i<run.nodes.length;i++)strike(f,run,i);step(f,1);}break;
  case 'iceslide':
   // The shipped, independent geometric reachability proof lives in probe_puzzles.
   // Here an authored genuine catch/slide court exercises this extraction's clock.
   run.spec={...run.spec,pinned:{board:[5,4],rocks:[[0,1],[4,3]],blocks:[[3,1]],sockets:[[1,1]]}};
   run.nodes=run.nodes.slice(0,3);run.hums.clear();run.kind.boot(run,f.environment.puzzleHost(run));
   f.hero.pos=vec(run.nodes[0].pos.x+60,run.nodes[0].pos.y);strike(f,run,0);
   for(let i=0;i<120&&!run.done;i++)step(f,1/60);break;
  default:throw Error('Uncovered registered puzzle kind '+run.kind.id);
 }
 assert.equal(run.done,true,run.id+' resolves through the native lifecycle');
 const after=f.snapshot();f.controller.completePuzzle(run);assert.deepEqual(f.snapshot(),after,'completed puzzle is idempotent');
 return {id:run.id,kind:run.kind.id,done:run.done};
}
for(const id of Object.keys(PUZZLES))for(const seed of [731,991])compare('preset:'+id,f=>{const run=f.boot(id);step(f,.1);return solve(f,run);},'',seed);
for(const inner of SHRINE_INNERS){
 const id='native_puzzle_probe_shrine';PUZZLES[id]={kind:'court_shrine',count:[6,6],shrine:{x:500,y:500,ringR:100,a0:.3,kind:inner.kind},reward:{}} as any;
 try{compare('shrine:'+inner.kind,f=>solve(f,f.boot(id)));}finally{delete PUZZLES[id];}
}
assert.deepEqual(new Set(Object.keys(PUZZLE_KINDS)),new Set([...Object.values(PUZZLES).map(p=>p.kind),'court_shrine']),'every registered kind has a course');

// Actual native routing grammar with an intentionally recording kind: this
// distinguishes side/wounding/hum/aim gates even when a shipped kind would hide it.
function gateCourse(f:Fixture){
 const run=f.boot('ember_ring'),seen:any[]=[];
 run.spec={...run.spec,reward:{},spill:'aim',hum:.9};
 run.kind={...run.kind,struck(r,n,_h,s){seen.push([n.puzzleNode?.idx,s?.id,r.done]);},tuned(_r,n,_h,tone){seen.push(['tuned',n.puzzleNode?.idx,tone]);}};
 f.hero.pos=vec(300,500);f.hero.facing=0;run.nodes[0].pos=vec(400,500);run.nodes[1].pos=vec(400,530);
 f.controller.puzzleStruck(f.hero,null,true);assert.equal(f.state.puzzleKnocks.length,0);
 f.controller.puzzleStruck(run.nodes[1],f.hero,true);f.controller.puzzleStruck(run.nodes[0],f.hero,true);f.controller.puzzleStruck(run.nodes[0],f.hero,true);
 f.controller.drainPuzzleKnocks();assert.equal(seen.length,1);assert.equal(seen[0][0],0);
 step(f,.1);strike(f,run,0);assert.equal(seen.length,1,'hum suppresses echo');
 strike(f,run,1);strike(f,run,0);assert.equal(seen.length,3,'different bell clears standing hum');
 step(f,1);strike(f,run,0);assert.equal(seen.length,4,'expired hum rings');
 run.spec={...run.spec,knock:'wounding'};step(f,1);strike(f,run,1,f.hero,false);assert.equal(seen.length,4);
 strike(f,run,1,f.enemy,true);strike(f,run,1,null,true);assert.equal(seen.length,4,'player-side gate');
 strike(f,run,1,f.minion,true);assert.equal(seen.length,5,'minion is on the player side');
 run.spec={...run.spec,who:'any',spill:'all'};step(f,1);
 for(const n of run.nodes)f.controller.puzzleStruck(n,null,true);f.controller.drainPuzzleKnocks();assert.equal(seen.length,5+run.nodes.length);
 step(f,.1);for(const n of run.nodes)f.controller.puzzleStruck(n,null,true);f.controller.drainPuzzleKnocks();assert.equal(seen.length,5+run.nodes.length,'whole fan-out hum');
 f.controller.puzzleTuned(run.nodes[0],'fire',null);f.controller.puzzleTuned(f.hero,'fire',f.hero);
 run.nodes[0].life=0;run.nodes[0].dead=true;step(f,1);strike(f,run,0);assert.equal(seen.at(-1)[0],'tuned','dead node does not knock');
 run.done=true;f.controller.puzzleTuned(run.nodes[1],'cold',null);strike(f,run,1);
 return seen;
}
compare('native-knock-hum-tuning-gates',gateCourse);

const cast=Object.keys(SKILLS).find(id=>SKILLS[id].id===id)!;assert.ok(cast);
for(const mode of ['local','sealed','override-open','override-sealed','kind-default','empty-override','missing-cast','owner-tier'])compare('reward:'+mode,f=>{
 const run=f.boot('ember_ring');run.spec={...run.spec,reward:{gems:2,table:'ember_spoils',washFor:12,cast}};
 if(mode==='sealed'||mode==='override-open')f.scene.zone.spoils='none';
 if(mode.startsWith('override')){run.rewardZone={...f.scene.zone,id:'pinned-reward',spoils:mode==='override-open'?undefined:'none'};run.rewardLevel=19;run.rewardSource='retained-native-area';}
 if(mode==='kind-default'){run.kind={...run.kind,reward:run.spec.reward};run.spec={...run.spec};delete run.spec.reward;}
 if(mode==='empty-override'){run.kind={...run.kind,reward:run.spec.reward};run.spec={...run.spec,reward:{}};}
 if(mode==='missing-cast')run.spec.reward={cast:'nonexistent-native-puzzle-cast'};
 if(mode==='owner-tier')run.owner='native-place';
 f.controller.completePuzzle(run);
 const paid=f.tape.filter(e=>e[0]==='mintLootResult').length;
 if(mode==='sealed'||mode==='override-sealed')assert.equal(paid,0,'sealed ground skips table resolution');
 if(!['empty-override','missing-cast'].includes(mode)){
  assert.ok(has(f.hero,attunedStatus('lightning')));assert.ok(has(f.minion,attunedStatus('lightning')));
  assert.equal(has(f.upper,attunedStatus('lightning')),mode!=='owner-tier');
  for(const a of [f.far,f.enemy,f.dead,f.construct,f.passive])assert.equal(has(a,attunedStatus('lightning')),false,a.name+' outside reward census');
  assert.ok(f.host.hazardCaster);assert.equal(f.host.hazardCaster.level,mode.startsWith('override')?19:7);
 }
 const after=f.snapshot();f.controller.completePuzzle(run);assert.deepEqual(f.snapshot(),after);
 return {mode,paid};
});
for(const fault of ['dropGemAt','clamp','mintLootResult','executeSkill'])compare('partial:'+fault,f=>{
 const run=f.boot('ember_ring');run.spec={...run.spec,reward:{gems:2,table:'ember_spoils',washFor:12,cast}};f.activate();f.controller.completePuzzle(run);
},fault);

compare('empty-and-nonparticipating',f=>{
 const queue=f.state.puzzleKnocks;queue.push({node:f.hero,striker:null,t:f.time.time,wounding:true});
 f.controller.updatePuzzles(.2);assert.notEqual(f.state.puzzleKnocks,queue);assert.equal(f.state.puzzleKnocks.length,0);
 const run=f.boot('ember_ring');run.kind={...run.kind};delete run.kind.struck;delete run.kind.tuned;
 strike(f,run,0);f.controller.puzzleTuned(run.nodes[0],'cold',null);assert.equal(run.hums.size,0);
 run.done=true;const before=f.snapshot();f.controller.updatePuzzles(.5);assert.deepEqual(f.snapshot(),before);
 return {empty:true,quiet:true};
});
compare('grouping-reentrant-queue-and-completion',f=>{
 const run=f.boot('ember_ring'),events:any[]=[];run.spec={...run.spec,hum:0,spill:'all',reward:{}};
 let enqueued=false;
 run.kind={...run.kind,struck(r,n,_h,s){events.push([n.id,s?.id,f.time.time]);if(!enqueued){enqueued=true;f.controller.puzzleStruck(r.nodes[1],f.hero,true);}}};
 f.controller.puzzleStruck(run.nodes[0],f.hero,true);f.controller.puzzleStruck(run.nodes[0],f.hero,true);
 f.controller.puzzleStruck(run.nodes[0],f.ally,true);f.time.time+=.1;f.controller.puzzleStruck(run.nodes[0],f.hero,true);
 f.controller.drainPuzzleKnocks();assert.equal(events.length,3,'striker/time partition and same-group deduplication');
 assert.equal(f.state.puzzleKnocks.length,1,'knocks emitted during draining survive in the replacement queue');
 f.controller.drainPuzzleKnocks();assert.equal(events.length,4);
 run.kind={...run.kind,struck(r,n,h){events.push(['finish',n.id]);h.complete(r);}};
 for(const n of run.nodes)f.controller.puzzleStruck(n,f.hero,true);
 f.controller.drainPuzzleKnocks();assert.equal(events.filter(e=>e[0]==='finish').length,1,'completion stops the current fan-out');
 return events;
});
for(const fault of ['struck','tick','tuned'])compare('partial-kind:'+fault,f=>{
 const run=f.boot(fault==='tuned'?'great_chord':'ember_ring'),prior=(run.kind as any)[fault];
 run.kind={...run.kind,[fault]:(...args:any[])=>{prior?.(...args);f.tape.push(['partial-kind',fault]);throw Error('injected '+fault);}};
 if(fault==='struck')strike(f,run,0);
 else if(fault==='tick'){strike(f,run,0);step(f,20);}
 else {f.environment.setPuzzleTone(run.nodes[0],run.state.goal as any);f.controller.puzzleTuned(run.nodes[0],run.state.goal,null);}
},fault);
compare('rebound-effect-capability',f=>{
 const run=f.boot('ember_ring');run.spec={...run.spec,reward:{cast}};
 // Populate the World adapter first, then replace an inherited method. Each
 // native operation must read the live capability and preserve its receiver.
 f.controller.updatePuzzles(0);
 f.effectPrototype.executeSkill=function(this:any,...args:any[]){assert.equal(this,f.effects);f.tape.push(['replacement-cast',graph(args)]);};
 f.controller.completePuzzle(run);assert.equal(f.tape.at(-1)?.[0],'replacement-cast');
 return {live:true};
});
// Retained owner boundaries: no World is consulted, input references freeze,
// but campaign values and inherited provider methods must remain live.
{
 const a=fixture('owner'),b=fixture('owner'),ra=a.boot('ember_ring'),rb=b.boot('ember_ring');
 assert.equal(ra.id,rb.id);assert.notEqual(ra,rb);
 const untouched=b.snapshot();
 assert.throws(()=>a.controller.puzzleStruck(rb.nodes[0],a.hero,true),/Foreign native puzzle node/);
 assert.throws(()=>a.controller.puzzleTuned(rb.nodes[0],'fire',a.hero),/Foreign native puzzle node/);
 assert.throws(()=>a.controller.completePuzzle(rb),/Foreign native puzzle run/);
 assert.deepEqual(b.snapshot(),untouched);
 a.state.puzzleKnocks.push({node:rb.nodes[0],striker:a.hero,wounding:true,t:37});
 assert.throws(()=>a.controller.drainPuzzleKnocks(),/Foreign native puzzle node/);assert.equal(a.state.puzzleKnocks.length,1);a.state.puzzleKnocks=[];
 for(const key of ['scene','geometry','environment','campaign','effects']){
  const input:any={...a.controller.input};delete input[key];Object.defineProperty(input,key,{get(){throw Error('must not evaluate input getter');}});
  assert.throws(()=>new NativeAreaScenePuzzles(input),/own object binding/);
 }
 assert.throws(()=>new NativeAreaScenePuzzles({...a.controller.input,scene:b.scene}),/identical scene/);
 assert.throws(()=>new NativeAreaScenePuzzles({...a.controller.input,geometry:b.geometry}),/identical scene/);
 assert.throws(()=>new NativeAreaScenePuzzles({...a.controller.input,environment:b.environment}),/identical scene/);
 const raw:any={...a.controller.input};const owner=new NativeAreaScenePuzzles(raw);raw.effects=b.effects;assert.equal(owner.input.effects,a.effects);
 let liveCalls=0;a.effectPrototype.executeSkill=function(this:any,caster:Actor){assert.equal(this,a.effects);assert.equal(caster,owner.host.hazardCaster);liveCalls++;};
 ra.spec={...ra.spec,reward:{cast}};a.time.time=120;
 owner.puzzleStruck(ra.nodes[0],a.hero,true);assert.equal(a.state.puzzleKnocks[0].t,120);
 owner.completePuzzle(ra);assert.equal(liveCalls,1);assert.equal(b.host.hazardCaster,null);
 assert.deepEqual(b.snapshot(),untouched);
 const priorCaster=owner.host.hazardCaster;ra.done=false;owner.completePuzzle(ra);assert.equal(owner.host.hazardCaster,priorCaster,'caster remains local and retained');
}
console.log('PASS native puzzle archive/core/World/owner parity '+receipts.length+' courses '+hash(JSON.stringify(receipts)));
console.log('PASS all registered kinds, native routing/rewards, local census/caster, live receivers, foreign identities and partial errors');
