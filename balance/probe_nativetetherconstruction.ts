import {beforeNativeSceneGroundFollowUps,groundFollowUpsHistoricalHunk} from './nativeSceneGroundFollowUpsIntegrationFixture';
import {beforeNativeMainVisualSource} from './nativeMainVisualSourceFixture';
import {nativeMainVisualSourceArchive as visualArchive} from './nativeMainVisualSourceArchive';
/** Native tether construction only. Actual actors, population, queues and World
 * methods are exercised; fixture census/source tags do not claim summon birth,
 * tether damage/healing/ticking, staged lifetimes or area publication. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {makeSimWorld} from '../src/sim/arena';
import {World} from '../src/engine/world';
import {Actor} from '../src/engine/actor';
import {massDormancyPins} from '../src/worldmass/dormancy';
import {dist} from '../src/core/math';
import {withSeededRandom} from '../src/core/rng';
import {applyConversion} from '../src/engine/damage';
import {DAMAGE_COLOR,mod,conversionStat} from '../src/engine/stats';
import {instanceMods,instanceTethers,skillContextTags,makeSkillInstance,supportFitsInst,type SkillInstance,type TetherSpec} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneTethers,freshSceneTetherState,type NativeSceneTetherRuntime} from '../src/worldmass/nativeAreaSceneTethers';
import * as core from '../src/engine/nativeSceneTethers';
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
import {nativeSceneTetherArchive as archive,nativeSceneTetherArchiveHash} from './nativeSceneTetherArchive';
import {beforeNativeSceneTethers} from './nativeSceneTetherFixture';
import {beforeNativeMainContent} from './nativeMainContentFixture';
assert.equal(sha(JSON.stringify(archive)),nativeSceneTetherArchiveHash,'immutable tether integration archive');
const integratedWorld=fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8');
const integrationBefore=beforeNativeSceneTethers(integratedWorld);
assert.equal(sha(integrationBefore),archive.sourceHash,'exact complete World reconstruction');
assert.equal(integrationBefore,execFileSync('git',['show',archive.integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),'immutable integration source');
assert.equal(sha(beforeNativeMainContent(integratedWorld)),archive.priorMainContentHash,'complete historical extraction chain');

// Map an older integration mutation through only the declared visual source
// changes. Overlapping exact hunks now belong to the stricter visual guard;
// every untouched hunk must still reach its original historical guard.
function visualWorldHunk(raw:string,historical:string,legacy:RegExp){
 let text=beforeNativeMainVisualSource('src/engine/world.ts',raw),start=text.indexOf(historical),end=start+historical.length,overlap=false;
 assert.equal(text.split(historical).length,2,'unique historical mutation hunk');
 for(const edit of [...visualArchive.files.find(r=>r.file==='src/engine/world.ts')!.edits].reverse()){
  const at=text.indexOf(edit.before),stop=at+edit.before.length,delta=edit.after.length-edit.before.length;assert.equal(text.split(edit.before).length,2,'exact visual forward context');
  if(stop<=start){start+=delta;end+=delta;}else if(at<end){start=Math.min(start,at);end=Math.max(end,stop)+delta;overlap=true;}
  text=text.slice(0,at)+edit.after+text.slice(stop);
 }
 assert.equal(text,beforeNativeSceneGroundFollowUps(raw),'whole visual source after exact forward mapping');
 const mapped=text.slice(start,end);
 // An expanded overlap may begin in an unchanged older delegate. Mutate a
 // byte inside an exact visual after-hunk, not merely the expanded prefix.
 const visualEdit=overlap?visualArchive.files.find(r=>r.file==='src/engine/world.ts')!.edits.find(edit=>mapped.includes(edit.after)):undefined;
 if(overlap)assert.ok(visualEdit,'overlap includes a complete declared visual after-hunk');
 const target=visualEdit?.after??mapped,at=mapped.indexOf(target),letter=target.search(/[A-Za-z]/);
 assert.ok(letter>=0,'mutation has a source letter');
 const changed=at+letter,mutated=mapped.slice(0,changed)+'!'+mapped.slice(changed+1);
 return groundFollowUpsHistoricalHunk(raw,mapped,mutated,overlap?/unique exact native main visual source/:legacy);
}

const hostChange=archive.integration.find(row=>row.after.startsWith('declare private nativeSceneTetherView'))!;
assert.ok(hostChange);
const drift=integratedWorld.replace('get tethers(){return world.tethers;}','get tethers(){return [];}');assert.notEqual(drift,integratedWorld);assert.throws(()=>beforeNativeSceneTethers(drift),/unique exact native tether integration/);
for(const row of archive.integration){const h=visualWorldHunk(integratedWorld,row.after,/unique exact native tether integration/),drift=integratedWorld.replace(h.text,h.mutated);assert.notEqual(drift,integratedWorld);assert.throws(()=>beforeNativeSceneTethers(drift),h.guard);}
console.log('PASS exact integrated World reversal, byte-checked changes and complete historical chain');
const source=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n');
const src=ts.createSourceFile('world.ts',source,99,true),wc=src.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const text=fs.readFileSync(new URL('../src/engine/nativeSceneTethers.ts',import.meta.url),'utf8'),sf=ts.createSourceFile('core.ts',beforeNativeMainVisualSource('src/engine/nativeSceneTethers.ts',text),99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
for(const row of archive.rows){
 const before=wc.members.find(m=>ts.isMethodDeclaration(m)&&m.name.getText(src)===row.name) as ts.MethodDeclaration;
 assert.equal(before.getText(src),row.before);assert.equal(sha(row.before),row.hash);
 const after=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;
 assert.equal(emit('function p()'+before.body!.getText(src).replace(/\bthis\b/g,'host')),emit('function p()'+after.body!.getText(sf)));
}
for(const c of archive.config){assert.ok(source.includes(c));assert.ok(sf.statements.some(n=>n.getText(sf).replace(/^export /,'')===c));}
const lexical={Actor,dist,instanceMods,instanceTethers,skillContextTags,applyConversion,DAMAGE_COLOR};
const original=Function(...Object.keys(lexical),emit(archive.config.join('\n')+'\nclass Original{'+archive.rows.map((r:any)=>r.before).join('\n')+'}\nreturn Original.prototype;'))(...Object.values(lexical));
// Historical source bodies remain immutable. Only these explicitly named
// methods use the separately pinned main successor in the behavior lane.
const visualMain='ea56c7ac4f5f4963dc6ad8ce3cb86bc12b66fa0b';
assert.equal(visualArchive.main,visualMain);
const visualMainText=execFileSync('git',['show',visualMain+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
const visualMainFile=ts.createSourceFile('main-world.ts',visualMainText,99,true),visualMainWorld=visualMainFile.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const visualReferenceEvidence:{name:string;sha256:string}[]=[];
function visualReference(historical:Record<string,Function>,names:string[],bindings:Record<string,unknown>){
 const rows=names.map(name=>{const m=visualMainWorld.members.find(n=>n.name?.getText(visualMainFile)===name);assert(m&&ts.isMethodDeclaration(m));const body=m.getText(visualMainFile);visualReferenceEvidence.push({name,sha256:createHash('sha256').update(body).digest('hex')});return body;});
 const js=ts.transpileModule('class VisualNative{'+rows.join('\n')+'}\nreturn VisualNative.prototype;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const overrides=Function(...Object.keys(bindings),js)(...Object.values(bindings));return Object.defineProperties(Object.create(historical),Object.fromEntries(names.map(name=>[name,Object.getOwnPropertyDescriptor(overrides,name)!]))) as Record<string,Function>;
}

const nativeReference=visualReference(original,['addTether'],{...lexical,TETHER_TICK:core.TETHER_TICK});

function plain(v:any,seen=new Map<object,number>()):any{if(v instanceof Actor)return {actor:v.id};if(v===undefined)return {$undefined:1};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};if(v===null||typeof v!=='object')return v;if(seen.has(v))return {$ref:seen.get(v)};seen.set(v,seen.size);if(v instanceof Map)return {$map:[...v].map(([k,x])=>[plain(k,seen),plain(x,seen)])};if(v instanceof Set)return {$set:[...v].map(x=>plain(x,seen))};if(Array.isArray(v))return v.map(x=>plain(x,seen));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x,seen)]));}
const checks:string[]=[],receipts:any[]=[],historicalReceipts:any[]=[];
function checked(name:string,fn:()=>void){fn();checks.push(name);console.log('PASS '+name);}
withSeededRandom(31671,()=>{
 const w=makeSimWorld('warrior',31671),raw=freshAssemblyInput(w,w.zone),campaign=raw.campaign,area=new NativeAreaSceneAssembly(raw),scene=area.input.scene;
 const authority=new NativeAreaActorAuthority<NativeSceneTetherRuntime>(campaign),state=freshSceneTetherState(),owner=new NativeAreaSceneTethers({scene,campaign,state,authority});
 const binding=authority.register(scene,{tethers:owner});authority.claim(binding,scene.actors);
 const player=scene.player;
 const body=(team:Actor['team']='player',keeper:Actor|null=player)=>{
  const a=area.input.population.createMonster('skeleton_warrior',5,team,keeper??undefined);scene.actors.push(a);authority.claim(binding,[a]);return a;
 };
 const spawned=body(),near=body(),edge=body(),far=body(),dead=body(),different=body(),unowned=body('enemy',null);
 // Source identity/positions are explicit fixture inputs, not a replacement
 // native summon implementation. All bodies are created by the real factory.
 spawned.pos={x:100,y:100};near.pos={x:150,y:100};dead.pos={x:155,y:100};different.pos={x:160,y:100};unowned.pos={x:165,y:100};dead.dead=true;
 const hosts={
  historical:{get actors(){return scene.actors;},get tethers(){return state.tethers;},set tethers(v:World['tethers']){state.tethers=v;},addTether(...args:Parameters<World['addTether']>){original.addTether.apply(this,args);}},
  native:{get actors(){return scene.actors;},get tethers(){return state.tethers;},set tethers(v:World['tethers']){state.tethers=v;},addTether(...args:Parameters<World['addTether']>){nativeReference.addTether.apply(this,args);}},
  core:{get actors(){return scene.actors;},get tethers(){return state.tethers;},set tethers(v:World['tethers']){state.tethers=v;},addTether(...args:Parameters<World['addTether']>){core.sceneAddTether(this,...args);}},
 };
 type Op='addTether'|'attachObjectTethers';
 type Args=Parameters<World['addTether']>|Parameters<World['attachObjectTethers']>;
 function invoke(op:Op,lane:string,args:Args){
  if(lane==='historical')return Reflect.apply(original[op],hosts.historical,args);
  if(lane==='native')return Reflect.apply(nativeReference[op],hosts.native,args);
  if(lane==='core')return Reflect.apply(op==='addTether'?core.sceneAddTether:core.sceneAttachObjectTethers,undefined,[hosts.core,...args]);
  if(lane==='owner')return Reflect.apply(owner[op],owner,args);
  const previousActors=w.actors,previousTethers=w.tethers;
  try{w.actors=scene.actors;w.tethers=state.tethers;return Reflect.apply(w[op],w,args);}
  finally{state.tethers=w.tethers;w.actors=previousActors;w.tethers=previousTethers;}
 }
 function compare(label:string,op:Op,args:Args,initial:World['tethers']=[],expectError?:RegExp){
  const outcomes=[];
  for(const lane of ['historical','native','core','world','owner']){
   state.tethers=[...initial];const previousQueue=state.tethers;
   const outcome=withSeededRandom(4441,()=>{
    let error:string|undefined;try{invoke(op,lane,args);}catch(e){error=(e as Error).message;}
    if(expectError)assert.match(error??'',expectError,label+' '+lane);else assert.equal(error,undefined,label+' '+lane);
    return {queue:plain(state.tethers),oldQueue:plain(previousQueue),replaced:state.tethers!==previousQueue,next:Math.random(),error};
   });
   if(lane==='historical')historicalReceipts.push([label,outcome]);else outcomes.push(outcome);
  }
  for(let i=1;i<outcomes.length;i++)assert.deepEqual(outcomes[i],outcomes[0],label+' lane '+i);
  // Only two known new top-level tether-row fields are projected here.
  // Full unprojected successor rows already match all four native lanes above.
  const old=historicalReceipts.at(-1)![1],project=(o:any)=>({...o,queue:o.queue.map(({visual,visualAge,...row}:any)=>row),oldQueue:o.oldQueue.map(({visual,visualAge,...row}:any)=>row)});
  assert.deepEqual(project(outcomes[0]),project(old),label+' unchanged native tether construction outside the two declared presentation fields');
  receipts.push([label,outcomes[0]]);return state.tethers;
 }
 const skills=Object.values(SKILLS),supportDefs=Object.values(SUPPORTS).filter(s=>s.tether),nativeDefs=skills.filter(s=>s.tether);
 const instances=[...nativeDefs.map(d=>makeSkillInstance(d,20)),...supportDefs.map(s=>{
  const d=skills.find(d=>supportFitsInst(s,makeSkillInstance(d,20)));assert.ok(d,'real fitted host for '+s.id);
  const inst=makeSkillInstance(d,20);inst.sockets[0]={def:s,level:7};return inst;
 })];
 function family(inst:SkillInstance,radius:number){
  for(const a of [spawned,near,edge,far,dead,unowned])a.sourceSkillId=inst.def.id;
  different.sourceSkillId=inst.def.id+':other';edge.pos={x:100+radius,y:100};far.pos={x:100+radius+.001,y:100};
 }
 checked('all native tether supports and innate specs match pinned-native/core/World/owner',()=>{
  assert.ok(instances.length);
  for(const inst of instances)for(const rich of [false,true]){
   if(rich)player.sheet.setSource('tether-proof',[mod('damage','increased',.2),mod('tetherDamage','increased',.5),mod('aoeRadius','increased',.3),mod('tetherWidth','increased',.4),mod('effectDuration','increased',.25)]);
   try{for(const [i,spec] of instanceTethers(inst).entries()){
    const label=inst.def.id+':'+inst.sockets[0]?.def.id+':'+i+':'+rich;
    const direct=compare(label+' direct','addTether',[spawned,near,spec,inst,player]);assert.equal(direct.length,1);
    assert.equal(direct[0].a,spawned);assert.equal(direct[0].b,near);assert.equal(direct[0].owner,player);assert.equal(direct[0].inst,inst);assert.equal(direct[0].tickTimer,core.TETHER_TICK);
    assert.equal(direct[0].remaining===Infinity,spec.link!=='target');
    family(inst,spec.radius??360);
    const attached=compare(label+' attach','attachObjectTethers',[spawned,inst,player]);
    if(spec.link==='caster'){assert.equal(attached.length,1);assert.equal(attached[0].b,player);}
    else if(spec.link==='network'){assert.equal(attached.length,2);assert.deepEqual(attached.map(t=>t.b),[near,edge]);}
    else assert.equal(attached.length,0,'target bonds are not object attachments');
   }}finally{player.sheet.removeSource('tether-proof');}
  }
 });
 const inst=makeSkillInstance(SKILLS.fireball,20),physical:TetherSpec={link:'target',dps:20,damageType:'physical'};
 const seed=(calls:Parameters<World['addTether']>[]):World['tethers']=>{state.tethers=[];for(const args of calls)nativeReference.addTether.apply(hosts.native,args);return state.tethers;};
 checked('native multi-support slot order replaces repeated pairs without losing network links',()=>{
  const defs=[SUPPORTS.tripwire,SUPPORTS.transient_inferno,SUPPORTS.tripwire_web];
  const def=skills.find(d=>defs.every(s=>supportFitsInst(s,makeSkillInstance(d,20))));assert.ok(def);
  const multi=makeSkillInstance(def,20);multi.sockets=defs.map(d=>({def:d,level:1}));family(multi,380);
  const queue=compare('mixed native supports','attachObjectTethers',[spawned,multi,player]);assert.equal(queue.length,3);
  assert.equal(queue[0].b,player);assert.ok(queue[0].amounts.fire!>0);assert.equal(queue[0].amounts.physical,undefined);assert.deepEqual(queue.slice(1).map(t=>t.b),[near,edge]);
 });
 checked('actual local hostile and unowned targets remain legal endpoints',()=>{
  assert.equal(unowned.owner,undefined);assert.equal(unowned.team,'enemy');
  const queue=compare('local unowned hostile target','addTether',[player,unowned,physical,inst,player]);assert.equal(queue[0].b,unowned);assert.equal(queue[0].owner,player);
 });
 checked('recast reverses endpoints and replaces only the same pair and skill',()=>{
  const otherInst=makeSkillInstance(SKILLS.cleave,20),initial=seed([[spawned,near,physical,inst,player],[spawned,edge,physical,inst,player],[spawned,near,physical,otherInst,player]]);
  const queue=compare('replacement reverse pair','addTether',[near,spawned,{...physical,dps:30},inst,player],initial);
  assert.equal(queue.length,3);assert.equal(queue[0],initial[1]);assert.equal(queue[1],initial[2]);assert.equal(queue[2].a,near);assert.equal(queue[2].b,spawned);
 });
 checked('identical or dead endpoints preserve the actual queue and RNG',()=>{
  const initial=seed([[spawned,near,physical,inst,player]]);
  for(const [a,b,label] of [[spawned,spawned,'self'],[dead,near,'dead a'],[spawned,dead,'dead b']] as const){
   const result=compare(label,'addTether',[a,b,physical,inst,player],initial);assert.equal(result[0],initial[0]);
   const row=receipts.at(-1)[1];assert.equal(row.replaced,false);assert.equal(row.next,withSeededRandom(4441,()=>Math.random()));
  }
 });
 checked('conversion colors, explicit tint, healing and default target duration stay native',()=>{
  player.sheet.setSource('conversion-proof',[mod(conversionStat('physical','fire'),'flat',.75)]);
  try{let queue=compare('converted dominant','addTether',[spawned,near,physical,inst,player]);assert.equal(queue[0].color,DAMAGE_COLOR.fire);assert.ok(queue[0].amounts.fire!>queue[0].amounts.physical!);assert.equal(queue[0].remaining,8*player.sheet.get('effectDuration',skillContextTags(inst,['physical']),instanceMods(inst)));
   queue=compare('explicit color','addTether',[spawned,near,{...physical,color:'#123456'},inst,player]);assert.equal(queue[0].color,'#123456');
   queue=compare('pure healing defaults','addTether',[spawned,near,{link:'target',healPerSec:13,affects:'allies'},inst,player]);assert.deepEqual(queue[0].amounts,{});assert.equal(queue[0].color,'#7ec88a');assert.equal(queue[0].heal,13);assert.equal(queue[0].affects,'allies');
  }finally{player.sheet.removeSource('conversion-proof');}
 });
 checked('actual queue replacement is live and older arrays remain untouched',()=>{
  const old=state.tethers,empty:World['tethers']=[];state.tethers=empty;
  owner.addTether(spawned,near,physical,inst,player);assert.notEqual(state.tethers,empty);assert.equal(empty.length,0);assert.equal(state.tethers.length,1);assert.notEqual(state.tethers,old);
 });
 checked('native failure after replacement preserves its earlier queue removal',()=>{
  const initial=seed([[spawned,near,physical,inst,player],[spawned,edge,physical,inst,player]]),read=player.sheet.get;
  player.sheet.get=function(){throw Error('native sheet failure');};
  try{const queue=compare('replacement then failure','addTether',[spawned,near,physical,inst,player],initial,/native sheet failure/);assert.equal(queue.length,1);assert.equal(queue[0],initial[1]);}
  finally{player.sheet.get=read;}
 });
 checked('native network partial failure keeps earlier successful links',()=>{
  const network=instances.find(i=>instanceTethers(i).some(s=>s.link==='network'))!;family(network,380);
  const prior=Object.getOwnPropertyDescriptor(edge,'sourceSkillId')!;Object.defineProperty(edge,'sourceSkillId',{configurable:true,get(){throw Error('later sibling source failure');}});
  try{const queue=compare('network partial failure','attachObjectTethers',[spawned,network,player],[],/later sibling source failure/);assert.equal(queue.length,1);assert.equal(queue[0].b,near);}
  finally{Object.defineProperty(edge,'sourceSkillId',prior);}
 });
 function refuses(fn:()=>void,match:RegExp,states=[state]){
  const queues=states.map(s=>s.tethers),values=queues.map(q=>[...q]),read=player.sheet.get;let reads=0;
  player.sheet.get=function(...args:Parameters<typeof read>){reads++;return Reflect.apply(read,this,args);};
  try{withSeededRandom(9221,()=>{assert.throws(fn,match);assert.equal(Math.random(),withSeededRandom(9221,()=>Math.random()));});assert.equal(reads,0);states.forEach((s,i)=>{assert.equal(s.tethers,queues[i]);assert.deepEqual(s.tethers,values[i]);});}
  finally{player.sheet.get=read;}
 }
 checked('same-scene unregistered owner cannot write an orphan tether queue',()=>{
  const secondState=freshSceneTetherState(),second=new NativeAreaSceneTethers({scene,campaign,state:secondState,authority});
  refuses(()=>second.addTether(spawned,near,physical,inst,player),/registered queue owner/,[state,secondState]);
  refuses(()=>second.attachObjectTethers(spawned,inst,player),/registered queue owner/,[state,secondState]);
 });
 checked('exclusive retained queue rejects an initial alias before any native append',()=>{
  const shared:World['tethers']=[];state.tethers=shared;
  const peerArea=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign)),peerScene=peerArea.input.scene;peerScene.actors=[];
  const peerState={tethers:shared};
  assert.throws(()=>new NativeAreaSceneTethers({scene:peerScene,campaign,state:peerState,authority}),/exclusively owned initial array/);
  assert.equal(peerState.tethers,shared);assert.equal(shared.length,0);
  // A rejected constructor must not consume the actual state replacement slot.
  peerState.tethers=[];const peer=new NativeAreaSceneTethers({scene:peerScene,campaign,state:peerState,authority}),pb=authority.register(peerScene,{tethers:peer});
  const a=peerArea.input.population.createMonster('skeleton_warrior',5,'enemy'),b=peerArea.input.population.createMonster('skeleton_warrior',5,'enemy');peerScene.actors.push(a,b);authority.claim(pb,[a,b]);
  assert.equal(peer.input.state,peerState);
  assert.throws(()=>{peerState.tethers=shared;},/another area owner/);
  owner.addTether(spawned,near,physical,inst,player);assert.notEqual(state.tethers,shared);
  assert.equal(shared.length,0);assert.equal(peerState.tethers.length,0);
  peer.addTether(a,b,physical,inst,a);assert.equal(peerState.tethers.length,1);assert.equal(peerState.tethers[0].a,a);assert.equal(shared.length,0);
 });
 checked('foreign equal-coordinate endpoints and owners refuse before native effects',()=>{
  const peerArea=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign)),peerScene=peerArea.input.scene;peerScene.actors=[];
  const peerState=freshSceneTetherState(),peer=new NativeAreaSceneTethers({scene:peerScene,campaign,state:peerState,authority}),pb=authority.register(peerScene,{tethers:peer});
  const foreign=peerArea.input.population.createMonster('skeleton_warrior',5,'player');foreign.pos={...near.pos};peerScene.actors.push(foreign);authority.claim(pb,[foreign]);
  refuses(()=>owner.addTether(foreign,near,physical,inst,player),/physical endpoints/);
  refuses(()=>owner.addTether(spawned,foreign,physical,inst,player),/physical endpoints/);
  refuses(()=>owner.addTether(spawned,near,physical,inst,foreign),/physical endpoints/);
  refuses(()=>owner.attachObjectTethers(spawned,inst,foreign),/physical endpoints/);
  const parent=spawned.owner;spawned.owner=foreign;try{refuses(()=>owner.attachObjectTethers(spawned,inst,player),/actual caster/);}finally{spawned.owner=parent;}
  scene.actors.push(foreign);try{refuses(()=>owner.addTether(spawned,near,physical,inst,player),/unowned or borrowed/);}finally{scene.actors.pop();}
 });
 checked('constructors preserve exact binding and state requirements',()=>{
  assert.throws(()=>new NativeAreaSceneTethers(Object.create({scene,campaign,state,authority})),/own object binding/);
  assert.throws(()=>new NativeAreaSceneTethers({scene,campaign:{seats:campaign.seats},state,authority}),/identical campaign/);
  assert.throws(()=>new NativeAreaSceneTethers({scene,campaign,state:Object.create(state),authority}),/actual configurable mutable queue slot/);
  assert.throws(()=>new NativeAreaSceneTethers({scene,campaign,state:Object.freeze(freshSceneTetherState()),authority}),/actual configurable mutable queue slot/);
  assert.throws(()=>new NativeAreaSceneTethers({scene,campaign,state,authority}),/fresh local queue state/);
  // A failed constructor must not consume a valid fresh slot.
  const available=freshSceneTetherState();assert.throws(()=>new NativeAreaSceneTethers({scene,campaign:{seats:campaign.seats},state:available,authority}),/identical campaign/);
  assert.doesNotThrow(()=>new NativeAreaSceneTethers({scene,campaign,state:available,authority}));
 });
 checked('real carried shapeshift refuses hidden flesh and accepts physical form',()=>{
  const flesh=w.localSeat.actor;w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);
  const form=w.localSeat.actor;assert.notEqual(form,flesh);assert.equal(w.localSeat.home,flesh);assert.equal(form.possession?.huskMode,'carried');assert.equal(w.actors.includes(flesh),false);
  authority.release(binding,[flesh]);scene.actors=scene.actors.filter(a=>a!==flesh);scene.player=form;scene.actors.push(form);authority.claim(binding,[form]);
  assert.equal(authority.require(flesh).scene,scene);
  refuses(()=>owner.addTether(flesh,near,physical,inst,form),/physical endpoints/);
  refuses(()=>owner.addTether(form,near,physical,inst,flesh),/physical endpoints/);
  const queue=compare('physical form tether','addTether',[form,near,physical,inst,form]);assert.equal(queue[0].owner,form);assert.equal(queue[0].a,form);
 });
 checked('integrated World host keeps actual receiver and live actor/queue replacement',()=>{
  const host=w['nativeSceneTetherHost']();assert.equal(w['nativeSceneTetherHost'](),host);assert.equal(Object.isFrozen(host),true);
  const oldActors=w.actors,oldQueue=w.tethers,oldAdd=w['addTether'],selected=w.localSeat.actor;
  const subjects=[spawned,near,edge],prior=subjects.map(a=>({owner:a.owner,source:a.sourceSkillId,pos:a.pos}));
  const network=instances.find(i=>instanceTethers(i).some(s=>s.link==='network'))!,calls:Parameters<World['addTether']>[]=[];
  try{
   for(const a of subjects){a.owner=selected;a.sourceSkillId=network.def.id;}spawned.pos={x:100,y:100};near.pos={x:110,y:100};edge.pos={x:120,y:100};
   w['addTether']=function(...args:Parameters<World['addTether']>){assert.equal(this,w);calls.push(args);return Reflect.apply(oldAdd,this,args);};
   const fresh:World['tethers']=[];host.tethers=fresh;assert.equal(w.tethers,fresh);w.actors=[selected,spawned,near];assert.equal(host.actors,w.actors);
   w['attachObjectTethers'](spawned,network,selected);assert.equal(calls.length,1);assert.equal(calls[0][0],spawned);assert.equal(calls[0][1],near);assert.equal(calls[0][4],selected);
   const first=w.tethers;assert.notEqual(first,fresh);assert.equal(fresh.length,0);assert.equal(host.tethers,first);assert.equal(first[0].b,near);
   let secondCalls=0;w['addTether']=function(...args:Parameters<World['addTether']>){assert.equal(this,w);secondCalls++;return Reflect.apply(oldAdd,this,args);};
   const next:World['tethers']=[];w.tethers=next;w.actors=[selected,spawned,edge];assert.equal(host.actors,w.actors);assert.equal(host.tethers,next);
   w['attachObjectTethers'](spawned,network,selected);assert.equal(secondCalls,1);assert.equal(calls.length,1);assert.equal(w.tethers[0].b,edge);assert.equal(w.tethers[0].tickTimer,core.TETHER_TICK);assert.equal(first.length,1);assert.equal(first[0].b,near);assert.equal(next.length,0);
  }finally{w.actors=oldActors;w.tethers=oldQueue;w['addTether']=oldAdd;subjects.forEach((a,i)=>{a.owner=prior[i].owner;a.sourceSkillId=prior[i].source;a.pos=prior[i].pos;});}
 });
 checked('World adapter cache does not pin unrelated actors while genuine live tether endpoints remain pinned',()=>{
  const dormant=makeSimWorld('warrior',39171),unlinked=new Actor('dormancy sentinel','enemy',{x:20,y:30}),a=new Actor('tether endpoint a','enemy',{x:40,y:30}),b=new Actor('tether endpoint b','enemy',{x:60,y:30});
  dormant.actors.push(unlinked,a,b);const owned=new Map([['unlinked',unlinked],['a',a],['b',b]]);
  assert.deepEqual([...massDormancyPins(dormant,owned)].map(actor=>actor.id),[],'before any tether cache');
  // A native self-link no-op creates the World adapter without a gameplay band.
  dormant['addTether'](a,a,physical,inst,dormant.player);assert.equal(dormant.tethers.length,0);
  assert.deepEqual([...massDormancyPins(dormant,owned)].map(actor=>actor.id),[],'cached adapter must not pin the census');
  assert.equal(Object.getOwnPropertyDescriptor(dormant,'nativeSceneTetherView')?.enumerable,false);
  dormant['addTether'](a,b,physical,inst,dormant.player);assert.equal(dormant.tethers.length,1);
  const pins=massDormancyPins(dormant,owned);assert.equal(pins.has(a),true);assert.equal(pins.has(b),true);assert.equal(pins.has(unlinked),false);assert.equal(pins.size,2);
  // The real queue remains visible to dependency scanning, then releases its
  // leases when ordinary native lifecycle work replaces it with an empty queue.
  dormant.tethers=[];assert.deepEqual([...massDormancyPins(dormant,owned)].map(actor=>actor.id),[],'cleared queue releases only real tether dependencies');
 });
 // The historical golden included whole skill/support definitions. It remains
 // immutable evidence for its original catalogue, not a replacement baseline.
 const frozenOriginalReceipt='7b7d745f20f2f8bbc824964b7ff104eb8809d1b133c4948f7ffeb9efd3e3aba7';
 const historicalProbe=execFileSync('git',['show','24738cdebae049ef9b5f263334bb4da6f84882bc:balance/probe_nativetetherconstruction.ts'],{encoding:'utf8'});
 assert.ok(historicalProbe.includes("assert.equal(sha(JSON.stringify(receipts)),'"+frozenOriginalReceipt+"','frozen original four-way receipt');"),'exact immutable historical receipt assertion');
 const report={frozenOriginalReceipt,historicalBodyCurrentCatalogueReceipt:sha(JSON.stringify(historicalReceipts)),visualMain,visualReferenceEvidence,integrationCommit:archive.integrationCommit,integrationSourceHash:archive.sourceHash,archiveCommit:archive.commit,innateSkills:nativeDefs.length,tetherSupports:supportDefs.length,fourLaneCases:receipts.length,checks,receipt:sha(JSON.stringify(receipts)),boundaries:'construction only; native actors with fixture census/source tags; no summon birth, damage, healing, ticking, crossing, staged/detached caster lifetime or runtime publication claim'};
 fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-tether-construction.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS native tether construction',report);
});
