import {beforeNativeMainVisualSource} from './nativeMainVisualSourceFixture';
import {nativeMainVisualSourceArchive as visualArchive} from './nativeMainVisualSourceArchive';
import {skillMovementVoice} from '../src/data/skillMovementVisuals';
import {beforeNativeSceneRestoration} from './nativeSceneRestorationIntegrationFixture';
/** Impulse/release/saddle/policy proof. Native creation and genuine area providers
 * are used. Controlled link setup courses are identified; ticking, damage,
 * continuous movement, staged/detached actors and publication are not claimed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {makeSimWorld} from '../src/sim/arena';
import {World} from '../src/engine/world';
import {Actor,type CastingState} from '../src/engine/actor';
import {rand,vec} from '../src/core/math';
import {withSeededRandom} from '../src/core/rng';
import {STATUS_DEFS} from '../src/engine/status';
import {shoveAuthority} from '../src/engine/mass';
import {isDormant} from '../src/engine/ai';
import {instanceMods,instanceChannel,skillContextTags,makeSkillInstance,type SkillInstance} from '../src/engine/skills';
import {MONSTERS} from '../src/data/monsters';
import {SKILLS} from '../src/data/skills';
import {CLING_CFG} from '../src/engine/cling';
import {GRAB_CFG,type GrabVerb} from '../src/engine/grab';
import {MOUNT_CFG,seatCount} from '../src/engine/mounts';
import {mod} from '../src/engine/stats';
import {GridWalkField} from '../src/world/gridWalk';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneDisplacement,type NativeSceneDisplacementRuntime} from '../src/worldmass/nativeAreaSceneDisplacement';
import * as core from '../src/engine/nativeSceneDisplacement';
import {massDormancyPins,nativeActorQuietRefusal} from '../src/worldmass/dormancy';
import {beforeNativeSceneDisplacement} from './nativeSceneDisplacementIntegrationFixture';
import {nativeSceneDisplacementIntegrationArchive as integrationArchive,nativeSceneDisplacementIntegrationArchiveHash} from './nativeSceneDisplacementIntegrationArchive';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
import {nativeSceneDisplacementArchive as archive,nativeSceneDisplacementArchiveHash} from './nativeSceneDisplacementArchive';
import {beforeNativeSceneSummonPreparation} from './nativeSceneSummonPreparationIntegrationFixture';
assert.equal(sha(JSON.stringify(archive)),nativeSceneDisplacementArchiveHash);
const source=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n');
assert.equal(sha(source),archive.worldHash);
const originalSource=ts.createSourceFile('world.ts',source,99,true),wc=originalSource.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const current=fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(beforeNativeSceneSummonPreparation(current),source,'exact displacement and summon restoration reaches immutable native World');
const coreText=fs.readFileSync(new URL('../src/engine/nativeSceneDisplacement.ts',import.meta.url),'utf8'),sf=ts.createSourceFile('core.ts',beforeNativeMainVisualSource('src/engine/nativeSceneDisplacement.ts',coreText),99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
for(const row of archive.rows){
 const before=wc.members.find(m=>ts.isMethodDeclaration(m)&&m.name.getText(originalSource)===row.name) as ts.MethodDeclaration;
 assert.equal(before.getText(originalSource),row.before);assert.equal(sha(row.before),row.hash);
 const after=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;
 const body=before.body!,edits:{start:number;end:number}[]=[];function walk(n:ts.Node){if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({start:n.getStart(originalSource)-body.getStart(originalSource),end:n.end-body.getStart(originalSource)});ts.forEachChild(n,walk);}walk(body);let exact=body.getText(originalSource);for(const e of edits.reverse())exact=exact.slice(0,e.start)+'host'+exact.slice(e.end);assert.equal(after.body!.getText(sf),exact,row.name+' exact token-only extraction');
}
for(const c of archive.config){assert.ok(source.includes(c));assert.ok(sf.statements.some(n=>n.getText(sf).replace(/^export /,'')===c));}
const lexical={Actor,rand,vec,STATUS_DEFS,shoveAuthority,isDormant,instanceMods,instanceChannel,skillContextTags,MONSTERS,CLING_CFG,GRAB_CFG,MOUNT_CFG,seatCount};
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

const nativeReference=visualReference(original,['teleportActor'],{...lexical,skillMovementVoice});

const names=archive.rows.map((r:any)=>r.name) as (keyof core.NativeSceneDisplacementApi)[],checks:string[]=[],receipts:any[]=[];
const checked=(name:string,fn:()=>void)=>{fn();checks.push(name);console.log('PASS '+name);};
withSeededRandom(32013,()=>{
 const w=makeSimWorld('warrior',32013),raw=freshAssemblyInput(w,w.zone),campaign=raw.campaign,area=new NativeAreaSceneAssembly(raw);
 const {scene,geometry,population,registry}=area.input,runtimeBirth=registry.input.birth;
 const authority=new NativeAreaActorAuthority<NativeSceneDisplacementRuntime>(campaign),owner=new NativeAreaSceneDisplacement({scene,geometry,runtimeBirth,campaign,authority});
 const binding=authority.register(scene,{displacement:owner});authority.claim(binding,scene.actors);
 const player=scene.player,initialActors=[...scene.actors];
 let labels=new Map<Actor,string>(),created:Actor[]=[];
 const label=(a:Actor)=>labels.get(a)??(a===player?'player':'unknown');
 const id=(n:number|undefined)=>n===undefined?undefined:label(scene.actors.find(a=>a.id===n)!)==='unknown'?'missing':label(scene.actors.find(a=>a.id===n)!);
 function plain(v:any,seen=new Set<object>()):any{if(v instanceof Actor)return {$actor:label(v)};if(v===undefined)return {$undefined:1};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};if(v===null||typeof v!=='object')return v;if(seen.has(v))return {$ref:true};seen.add(v);if(v instanceof Map)return [...v].map(([k,x])=>[k,plain(x,seen)]);if(v instanceof Set)return [...v];if(Array.isArray(v))return v.map(x=>plain(x,seen));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x,seen)]));}
 function body(name:string,def='skeleton_warrior',team:Actor['team']='enemy'){
  const a=population.createMonster(def,5,team);a.pos=vec(400+created.length*50,400);a.poise=0;a.aggroed=true;a.aiAwakened=true;
  labels.set(a,name);created.push(a);scene.actors.push(a);authority.claim(binding,[a]);return a;
 }
 const fire=makeSkillInstance(SKILLS.fireball,20);
 const makeHost=(lane:'native'|'core')=>{
  const h:any={get actors(){return scene.actors;},get flashes(){return geometry.flashes;},get time(){return campaign.time;},actorById:(...a:Parameters<World['actorById']>)=>runtimeBirth.actorById(...a),clampPos:(...a:Parameters<World['clampPos']>)=>geometry.clampPos(...a)};
  for(const name of names)h[name]=(...args:any[])=>lane==='native'?nativeReference[name].apply(h,args):(core as any)['scene'+name[0].toUpperCase()+name.slice(1)](h,...args);return h;
 };
 const hosts={native:makeHost('native'),core:makeHost('core')};
 // The World lane uses the actual native World methods and geometry adapter.
 // Matching geometric values are test inputs; no retained callback substitutes it.
 const geometryKeys=['walk','doodads','bridges','grounds','tierViews','tierCrossings','tierNavs','tierSeats','airPockets','structures','doodadsRev'] as const;
 function worldScope<T>(fn:()=>T):T{
  const keys=['actors','flashes','time','arena',...geometryKeys],saved=new Map(keys.map(k=>[k,(w as any)[k]]));
  try{w.actors=scene.actors;w.flashes=geometry.flashes;w.time=campaign.time;(w as any).arena=geometry.arena;for(const k of geometryKeys)(w as any)[k]=geometry[k];return fn();}
  finally{for(const [k,v]of saved)(w as any)[k]=v;}
 }
 type Lane='native'|'core'|'world'|'owner';
 function invoke(lane:Lane,name:keyof core.NativeSceneDisplacementApi,args:any[]){return lane==='owner'?(owner[name] as Function).apply(owner,args):lane==='world'?worldScope(()=>((w as any)[name] as Function).apply(w,args)):(hosts[lane][name] as Function).apply(hosts[lane],args);}
 function snapshot(){return {actors:scene.actors.map(label),flashes:plain(geometry.flashes),bodies:created.map(a=>({name:label(a),pos:plain(a.pos),push:plain(a.push),grip:a.gripping?{...plain(a.gripping),id:id(a.gripping.id)}:null,heldBy:id(a.heldBy),cling:a.clingTo?{...plain(a.clingTo),id:id(a.clingTo.id)}:null,cooldown:a.clingCooldownUntil,proof:a.grabProofUntil,untargetable:a.untargetable,tier:a.tier,dash:plain(a.dash),mount:id(a.mountId),seat:a.mountSeat,riders:a.riderIds?.map(id),fromZoneGen:a.fromZoneGen,status:plain(a.statuses),sources:['seized','swallowed','burrowed','unhorsed','horrified'].map(s=>[s,plain(a.sheet.getSourceMods('status:'+s))])}))};}
 type Course={op:keyof core.NativeSceneDisplacementApi;args:any[];observe?:()=>any;verify?:(value:any)=>void;cleanup?:()=>void;error?:RegExp};
 function compare(name:string,prepare:(lane:Lane)=>Course){const results=[];for(const lane of ['native','core','world','owner'] as const){
  labels=new Map();created=[];scene.actors=[...initialActors];geometry.flashes=[];geometry.walk=null;geometry.doodads=[];geometry.doodadsRev++;(campaign as {time:number}).time=60;
  const outcome=withSeededRandom(9313,()=>{const c=prepare(lane);try{let value:any,error:string|undefined;try{value=invoke(lane,c.op,c.args);}catch(e){error=(e as Error).message;}if(c.error)assert.match(error??'',c.error,name+' '+lane);else assert.equal(error,undefined,name+' '+lane);c.verify?.(value);return {value:plain(value),error,state:snapshot(),observe:plain(c.observe?.()),next:Math.random()};}finally{c.cleanup?.();}});
  results.push(outcome);authority.release(binding,created);scene.actors=[...initialActors];
 }for(let i=1;i<results.length;i++)assert.deepEqual(results[i],results[0],name+' lane '+i);receipts.push([name,results[0]]);return results[0];}
 function grip(holder:Actor,victim:Actor,verb:GrabVerb='carry'){
  const ok=worldScope(()=>(w as any).grabSeize(holder,fire,victim,{verb,releaseGrace:2.3}));assert.equal(ok,true,'real native grab seizure');geometry.flashes=[];return holder.gripping!;
 }
 function casting(a:Actor,inst:SkillInstance,mode:CastingState['mode']){a.casting={inst,mode,aim:vec(10,10),elapsed:0,total:1,held:true,baseMult:1};return a.casting;}
 checked('native impulse weight, authority, raw references and stacked cap match four lanes',()=>{
  for(const stacked of [false,true])for(const spent of [false,true])compare('push '+stacked+'/'+spent,()=>{
   const a=body('target'),b=body('caster','skeleton_warrior','player');a.sheet.setSource('test',[mod('weight','flat',2)]);b.sheet.setSource('test',[mod('weight','flat',5)]);if(stacked)a.push={vx:2200,vy:900,collided:true};const ref=a.push;
   return {op:'pushActor',args:[a,.4,2000,b,fire,{noAuthority:spent}],observe:()=>({same:ref===a.push,inst:a.push?.inst===fire,caster:a.push?.caster===b}),verify:()=>{assert.equal(a.push?.caster,b);assert.equal(a.push?.inst,fire);assert.equal(a.push===ref,stacked);if(stacked)assert.ok(Math.hypot(a.push!.vx,a.push!.vy)<=core.PUSH_MAX_SPEED+.001);}};
  });
  compare('wind impulse keeps prior credit',()=>{const a=body('target'),b=body('prior');a.push={vx:2,vy:3,caster:b,inst:fire,collided:true};return {op:'pushActor',args:[a,0,4],verify:()=>{assert.equal(a.push?.caster,b);assert.equal(a.push?.collided,true);}};});
 });
 checked('native rooted, dormant, leaping and massed-construct branches remain distinct',()=>{
  for(const mode of ['anchored','dormant','leap','construct','massed'] as const)compare(mode,()=>{const a=body('target');if(mode==='anchored')a.anchored=true;if(mode==='dormant'){a.tag='migrant';a.aiAwakened=false;}if(mode==='leap')a.leap={from:vec(0,0),dest:vec(1,1),total:1,timer:0,radius:10,inst:fire,dmgMult:1,wasUntargetable:false};if(mode==='construct'||mode==='massed')a.construct={massed:mode==='massed'} as Actor['construct'];return {op:'pushActor',args:[a,1,50],verify:()=>assert.equal(!!a.push,mode==='massed')};});
 });
 checked('actual grabs release every verb and held pushes feed the original grip object',()=>{
  for(const verb of ['carry','drag','pin','swallow'] as const)compare('grab '+verb,()=>{const a=body('holder','yoke_mauler','player'),b=body('victim');const hold=grip(a,b,verb);return {op:'grabRelease',args:[a],observe:()=>({oldId:id(hold.id),sameSpec:hold.spec.verb===verb}),verify:()=>{assert.equal(a.gripping,undefined);assert.equal(b.heldBy,undefined);assert.equal(b.grabProofUntil,62.3);assert.equal(b.statuses.some(s=>s.id==='seized'||s.id==='swallowed'),false);}};});
  compare('held push feed',()=>{const a=body('holder','yoke_mauler','player'),b=body('victim');const hold=grip(a,b);return {op:'pushActor',args:[b,0,20],observe:()=>a.gripping===hold,verify:()=>{assert.equal(hold.struggle,20*GRAB_CFG.break.shoveFeed);assert.equal(b.push,null);}};});
  compare('holder shoved free',()=>{const a=body('holder','yoke_mauler','player'),b=body('victim');grip(a,b,'swallow');return {op:'pushActor',args:[a,0,GRAB_CFG.release.shove],verify:()=>{assert.equal(b.heldBy,undefined);assert.ok(a.push);}};});
  compare('stale held id absorbs push',()=>{const a=body('target');a.heldBy=-123;return {op:'pushActor',args:[a,0,200],verify:()=>assert.equal(a.push,null)};});
  compare('stale grip clears only holder',()=>{const a=body('target');a.gripping={id:-123,verb:'carry'} as Actor['gripping'];return {op:'grabRelease',args:[a],verify:()=>assert.equal(a.gripping,undefined)};});
 });
 checked('native latch acquisition, drop, burrow and flop release preserve status and random cursor',()=>{
  const clingers=Object.values(MONSTERS).filter(d=>d.cling);assert.ok(clingers.length);
  for(const def of clingers)for(const cause of ['drop','shake'] as const)compare('cling '+def.id+'/'+cause,()=>{
   const a=body('rider',def.id),b=body('host','yoke_mauler','player');b.radius=100;a.pos={x:b.pos.x+10,y:b.pos.y};a.aiTargetId=b.id;a.passive=false;a.clingCooldownUntil=0;
   worldScope(()=>(w as any).updateClings(0));assert.equal(a.clingTo?.id,b.id,'native latch for '+def.id);const ride=a.clingTo!;a.applyStatus('burrowed',0,1,'proof');geometry.flashes=[];
   return {op:'clingRelease',args:[a,cause],observe:()=>({rideId:id(ride.id),oldAngle:ride.ang}),verify:()=>{assert.equal(a.clingTo,undefined);assert.equal(a.statuses.some(s=>s.id==='burrowed'),false);}};
  });
  compare('no ride still sets cooldown',()=>{const a=body('rider');a.applyStatus('burrowed',0,1,'proof');return {op:'clingRelease',args:[a],verify:()=>{assert.equal(a.clingCooldownUntil,60+CLING_CFG.reattachGrace);assert.equal(a.statuses.length,0);}};});
 });
 checked('real saddle catalogs, occupancy, roster order and widow policy match four lanes',()=>{
  for(const def of Object.values(MONSTERS).filter(d=>d.mountSlot))compare('seat '+def.id,()=>{const a=body('rider'),b=body('steed',def.id),roster=scene.actors;return {op:'mountSeatRider',args:[a,b],observe:()=>({rosterRetained:scene.actors===roster}),verify:v=>{assert.equal(v,true);assert.equal(scene.actors.indexOf(a),scene.actors.indexOf(b)+1);assert.equal(a.mountId,b.id);}};});
  compare('full saddle refuses',()=>{const a=body('rider'),b=body('steed','warg'),c=body('seated');b.riderIds=[c.id];c.mountId=b.id;c.mountSeat=0;return {op:'mountSeatRider',args:[a,b],verify:v=>assert.equal(v,false)};});
  compare('stale and dead rider seats reused',()=>{const b=body('steed','warg'),c=body('dead');c.dead=true;c.mountId=b.id;b.riderIds=[-123,c.id];return {op:'mountFreeSeat',args:[b,MONSTERS.warg.mountSlot],verify:v=>assert.equal(v,0)};});
  for(const died of [false,true])for(const owned of [false,true])compare('unlink '+died+'/'+owned,()=>{const a=body('rider'),b=body('steed','warg');if(owned)b.owner=player;a.mountId=b.id;a.mountSeat=0;b.riderIds=[a.id,a.id];b.fromZoneGen=false;return {op:'mountUnlink',args:[a,died],verify:()=>{assert.equal(b.riderIds,undefined);assert.equal(b.fromZoneGen,!owned);}};});
  compare('unhorse actual effects',()=>{const a=body('rider'),b=body('steed','warg');a.mountId=b.id;a.mountSeat=0;b.riderIds=[a.id];b.dead=true;return {op:'mountUnhorse',args:[a,b],verify:()=>{assert.equal(a.mountId,undefined);assert.ok(a.push);assert.ok(a.statuses.some(s=>s.id===MOUNT_CFG.unhorse.status));assert.equal(geometry.flashes.length,1);}};});
  compare('missing steed native unlink',()=>{const a=body('rider');a.mountId=-9;a.mountSeat=2;return {op:'mountUnlink',args:[a,true],verify:()=>assert.equal(a.mountId,undefined)};});
 });
 checked('teleport uses real local bounds, wall grid, policy, story and live effect queue',()=>{
  for(const phased of [false,true])for(const story of [undefined,1])compare('teleport '+phased+'/'+story,()=>{const a=body('traveler');a.dash={dir:1,speed:5,remaining:3};const pos=a.pos,queue=geometry.flashes,g=new GridWalkField(1000,1000);g.fillRect(0,0,1000,1000);g.fillRect(500,300,650,600,false);geometry.walk=g;
   return {op:'teleportActor',args:[a,{x:575,y:450},'#abcdef',phased?{ignoreConfine:true}:undefined,story],observe:()=>({queueSame:queue===geometry.flashes,posSame:a.pos===pos}),verify:()=>{assert.equal(a.dash,null);assert.equal(geometry.flashes.length,2);if(phased)assert.deepEqual(a.pos,{x:575,y:450});else assert.notDeepEqual(a.pos,{x:575,y:450});if(story!==undefined)assert.equal(a.tier,story);}};
  });
  compare('out of bounds teleport',()=>{const a=body('traveler');return {op:'teleportActor',args:[a,{x:-999,y:-999}],verify:()=>{assert.ok(a.pos.x>=0&&a.pos.y>=0);}};});
 });
 checked('movement locks and native channel/cast mobility use real installed skills and stats',()=>{
  for(const mode of ['free','dash','leap','carom','dead','anchored','passive','driven','stun'] as const)compare('lock '+mode,()=>{const a=body('actor');if(mode==='dash')a.dash={dir:0,speed:1,remaining:1};if(mode==='leap')a.leap={from:vec(0,0),dest:vec(1,1),total:1,timer:0,radius:10,inst:fire,dmgMult:1,wasUntargetable:false};if(mode==='carom')a.caromRun={dir:0,speed:1,status:'probe'};if(mode==='dead')a.dead=true;if(mode==='anchored')a.anchored=true;if(mode==='passive'||mode==='driven'){a.passive=true;a.driven=mode==='driven';}if(mode==='stun')a.applyStatus('stun',0,1,'proof');return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,mode!=='free'&&mode!=='driven')};});
  const haunt=Object.values(MONSTERS).find(d=>d.brain?.behavior?.haunt);assert.ok(haunt);compare('native passive haunt',()=>{const a=body('haunt',haunt.id);a.passive=true;return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,false)};});
  for(const inst of Object.values(SKILLS).filter(s=>s.channel||s.castMove!==undefined).map(d=>makeSkillInstance(d,5)))for(const mobility of [0,.5,2])compare('cast '+inst.def.id+'/'+mobility,()=>{const a=body('caster');a.sheet.setSource('mobility',[mod('castMobility','flat',mobility),mod('channelMobility','flat',mobility)]);casting(a,inst,inst.def.channel?'channel':'cast');return {op:'movementLocked',args:[a]};});
  compare('live gathered spec overrides immobile channel',()=>{const a=body('caster'),inst=makeSkillInstance(Object.values(SKILLS).find(d=>d.channel?.move==='immobile')!,5);const c=casting(a,inst,'channel');c.gather={...instanceChannel(inst)!,move:'slowed'};return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,false)};});
  compare('guard can move',()=>{const a=body('guard');casting(a,fire,'guard');return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,false)};});
  for(const innate of [false,true])compare('levitation '+innate,()=>{const a=body('floating');if(innate)a.levitates=true;else a.sheet.setSource('float',[mod('levitation','flat',1)]);return {op:'levitating',args:[a],verify:v=>assert.equal(v,true)};});
 });
 checked('positive widow rout, aura roots, magic-pack locks and exact mobility values',()=>{
  // No installed steed currently chooses rout; this explicitly authored policy
  // fixture exercises native status behavior without claiming catalog coverage.
  const prior=MONSTERS.warg;assert.ok(prior.mountSlot);MONSTERS.warg={...prior,mountSlot:{...prior.mountSlot,onRiderDeath:'rout'}};
  try{compare('authored widow rout policy',()=>{const a=body('steed','warg');return {op:'mountWidowed',args:[a],verify:()=>assert.ok(a.statuses.some(s=>s.id==='horrified'))};});}finally{MONSTERS.warg=prior;}
  const rooted=Object.values(SKILLS).find(d=>d.delivery.type==='aura'&&d.delivery.moveFactor===0);assert.ok(rooted);
  compare('installed rooted aura',()=>{const a=body('rooted');a.activeAuras.set(rooted.id,{inst:makeSkillInstance(rooted,5),radius:10,sourceKey:'root',allies:[]} as any);return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,true)};});
  for(const source of ['magicPack:beamChannel','magicPack:eventChannel'])compare(source,()=>{const a=body('pack');a.magicPack={} as Actor['magicPack'];a.sheet.setSource(source,[]);return {op:'movementLocked',args:[a],verify:v=>assert.equal(v,true)};});
  for(const stat of ['castMobility','channelMobility'] as const)for(const amount of [0,.5,2])compare(stat+' value '+amount,()=>{const a=body('caster');a.sheet.setSource('mobility',[mod(stat,'flat',amount)]);return {op:stat==='castMobility'?'castMoveFactor':'channelMobility',args:[a,fire],verify:v=>assert.equal(v,stat==='castMobility'?Math.min(1,(fire.def.castMove??0)+amount):amount)};});
 });
 checked('native nested callbacks keep receiver identity and earlier effects on throw',()=>{
  for(const throwing of [false,true])compare('nested clamp '+throwing,lane=>{const a=body('traveler'),b=body('nearby'),provider:any=lane==='world'?w:geometry,prior=provider.clampPos;let entered=false;
   provider.clampPos=function(...args:any[]){assert.equal(this,provider);if(!entered){entered=true;invoke(lane,'pushActor',[b,0,7]);if(throwing)throw Error('nested clamp failure');}return Reflect.apply(prior,this,args);};
   return {op:'teleportActor',args:[a,vec(100,100)],error:throwing?/nested clamp failure/:undefined,observe:()=>({entered,impulse:!!b.push}),verify:()=>{assert.ok(b.push);assert.equal(geometry.flashes.length,throwing?1:2);},cleanup:()=>provider.clampPos=prior};
  });
  compare('unlink nested status failure',()=>{const a=body('rider'),b=body('steed','warg');a.mountId=b.id;b.riderIds=[a.id];a.applyStatus=function(){assert.equal(this,a);throw Error('unhorse status failure');};return {op:'mountUnhorse',args:[a,b],error:/unhorse status failure/,verify:()=>{assert.equal(a.mountId,undefined);assert.equal(b.riderIds,undefined);assert.equal(a.push,null);assert.equal(geometry.flashes.length,0);}};});
 });
 checked('native failures retain exact earlier releases, departure flash and tier assignment',()=>{
  compare('teleport clamp throw',lane=>{const a=body('traveler');a.dash={dir:1,speed:2,remaining:3};const pos=a.pos,provider:any=lane==='world'?w:geometry,prior=provider.clampPos;provider.clampPos=function(){assert.equal(this,provider);throw Error('clamp failure');};return {op:'teleportActor',args:[a,vec(3,4),'#abc',undefined,2],error:/clamp failure/,observe:()=>({samePos:pos===a.pos}),verify:()=>{assert.equal(a.tier,2);assert.equal(geometry.flashes.length,1);assert.ok(a.dash);},cleanup:()=>provider.clampPos=prior};});
  compare('grip clears before lookup failure',lane=>{const a=body('holder','yoke_mauler','player'),b=body('victim');grip(a,b);const provider:any=lane==='world'?w:runtimeBirth,prior=provider.actorById;provider.actorById=function(){assert.equal(this,provider);throw Error('lookup failure');};return {op:'grabRelease',args:[a],error:/lookup failure/,verify:()=>{assert.equal(a.gripping,undefined);assert.equal(b.heldBy,a.id);},cleanup:()=>provider.actorById=prior};});
  compare('push failure after real grip release',()=>{const a=body('holder','yoke_mauler','player'),b=body('victim');grip(a,b);a.effectiveWeight=()=>{throw Error('weight failure');};return {op:'pushActor',args:[a,0,GRAB_CFG.release.shove],error:/weight failure/,verify:()=>{assert.equal(a.gripping,undefined);assert.equal(b.heldBy,undefined);assert.equal(a.push,null);}};});
 });
 // Authority courses are intentionally outside the native behavior receipt.
 // Rejection is the retained-area boundary, not a new native combat rule.
 checked('same-scene orphan owner and foreign bodies refuse before effects',()=>{
  labels=new Map();created=[];const a=body('local'),before=a.pos,queue=geometry.flashes,orphan=new NativeAreaSceneDisplacement({scene,geometry,runtimeBirth,campaign,authority});
  assert.throws(()=>orphan.teleportActor(a,vec(2,3)),/registered owner/);assert.equal(a.pos,before);assert.equal(geometry.flashes,queue);
  const peer=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));peer.input.scene.actors=[];const other=new NativeAreaSceneDisplacement({scene:peer.input.scene,geometry:peer.input.geometry,runtimeBirth:peer.input.registry.input.birth,campaign,authority}),pb=authority.register(peer.input.scene,{displacement:other});
  const b=peer.input.population.createMonster('skeleton_warrior',5,'enemy');b.pos={...a.pos};peer.input.scene.actors.push(b);authority.claim(pb,[b]);
  for(const fn of [()=>owner.pushActor(b,0,5),()=>owner.pushActor(a,0,5,b),()=>owner.mountSeatRider(a,b),()=>owner.mountUnhorse(a,b),()=>owner.teleportActor(b,vec(1,2)),()=>owner.movementLocked(b)])assert.throws(fn,/physical body/);
  scene.actors.push(b);assert.throws(()=>owner.teleportActor(a,vec(1,2)),/unowned or borrowed/);scene.actors.pop();assert.equal(a.pos,before);assert.equal(a.push,null);
  authority.release(binding,created);scene.actors=[...initialActors];
 });
 checked('foreign linked ids remain local lookups and control transfer invalidates the old owner',()=>{
  labels=new Map();created=[];const a=body('local');
  const peer=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));peer.input.scene.actors=[];
  const other=new NativeAreaSceneDisplacement({scene:peer.input.scene,geometry:peer.input.geometry,runtimeBirth:peer.input.registry.input.birth,campaign,authority}),pb=authority.register(peer.input.scene,{displacement:other});
  const b=peer.input.population.createMonster('warg',5,'enemy');b.pos={...a.pos};peer.input.scene.actors.push(b);authority.claim(pb,[b]);
  a.gripping={id:b.id,verb:'swallow'} as Actor['gripping'];b.heldBy=a.id;b.untargetable=true;
  owner.grabRelease(a);assert.equal(a.gripping,undefined);assert.equal(b.heldBy,a.id);assert.equal(b.untargetable,true);
  a.mountId=b.id;a.mountSeat=0;b.riderIds=[a.id];owner.mountUnlink(a,true);assert.equal(a.mountId,undefined);assert.deepEqual(b.riderIds,[a.id]);assert.equal(b.statuses.length,0);
  const oldPos=a.pos;scene.actors=scene.actors.filter(x=>x!==a);peer.input.scene.actors.push(a);authority.transfer(a,binding,pb);
  assert.throws(()=>owner.teleportActor(a,vec(5,6)),/physical body/);assert.equal(a.pos,oldPos);other.teleportActor(a,vec(80,90));assert.deepEqual(a.pos,vec(80,90));
  authority.release(pb,[a]);created=[];scene.actors=[...initialActors];
 });
 checked('reentrant transfer after unhorse status preserves prior effects and refuses the next old-area impulse',()=>{
  labels=new Map();created=[];const a=body('rider'),b=body('steed','warg');a.mountId=b.id;b.riderIds=[a.id];geometry.flashes=[];
  const peer=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));peer.input.scene.actors=[];
  const other=new NativeAreaSceneDisplacement({scene:peer.input.scene,geometry:peer.input.geometry,runtimeBirth:peer.input.registry.input.birth,campaign,authority}),pb=authority.register(peer.input.scene,{displacement:other});
  const apply=a.applyStatus;a.applyStatus=function(...args:Parameters<Actor['applyStatus']>){const v=Reflect.apply(apply,this,args);scene.actors=scene.actors.filter(x=>x!==a);peer.input.scene.actors.push(a);authority.transfer(a,binding,pb);return v;};
  assert.throws(()=>owner.mountUnhorse(a,b),/physical body/);assert.equal(a.mountId,undefined);assert.equal(b.riderIds,undefined);assert.ok(a.statuses.some(s=>s.id===MOUNT_CFG.unhorse.status));assert.equal(a.push,null);assert.equal(geometry.flashes.length,0);
  authority.release(pb,[a]);authority.release(binding,[b]);created=[];scene.actors=[...initialActors];
  // Nothing is left in a scoped adapter after the exception.
  labels=new Map();const c=body('subsequent');owner.pushActor(c,0,5);assert.ok(c.push);authority.release(binding,[c]);created=[];scene.actors=[...initialActors];
 });
 checked('binding validation refuses foreign providers and recipe rebinding cannot redirect effects',()=>{
  assert.throws(()=>new NativeAreaSceneDisplacement(Object.create({scene,geometry,runtimeBirth,campaign,authority})),/own object binding/);
  assert.throws(()=>new NativeAreaSceneDisplacement({scene,geometry,runtimeBirth,campaign:{...campaign},authority}),/identical campaign/);
  const peer=new NativeAreaSceneAssembly(freshAssemblyInput(w,w.zone,campaign));assert.throws(()=>new NativeAreaSceneDisplacement({scene,geometry:peer.input.geometry,runtimeBirth,campaign,authority}),/identical local/);
  const foreignCampaign={...campaign},foreignAuthority=new NativeAreaActorAuthority<NativeSceneDisplacementRuntime>(foreignCampaign);assert.throws(()=>new NativeAreaSceneDisplacement({scene,geometry,runtimeBirth,campaign:foreignCampaign,authority:foreignAuthority}),/actual local campaign/);
  const raw={scene,geometry,runtimeBirth,campaign,authority},test=new NativeAreaSceneDisplacement(raw);raw.geometry=peer.input.geometry;assert.equal(test.input.geometry,geometry);assert.equal(Object.getOwnPropertyDescriptor(test,'host')?.enumerable,false);
 });
 checked('physical carried form is supported while the hidden flesh remains refused',()=>{
  const flesh=w.localSeat.actor;w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);const form=w.localSeat.actor;assert.notEqual(form,flesh);assert.equal(form.possession?.huskMode,'carried');assert.equal(w.localSeat.home,flesh);
  authority.release(binding,[flesh]);scene.actors=scene.actors.filter(a=>a!==flesh);scene.actors.push(form);scene.player=form;authority.claim(binding,[form]);assert.equal(authority.require(flesh).scene,scene);
  assert.throws(()=>owner.pushActor(flesh,0,5),/physical body/);assert.throws(()=>owner.teleportActor(flesh,vec(10,10)),/physical body/);owner.pushActor(form,0,5);assert.ok(form.push);assert.equal(owner.movementLocked(form),false);
 });
 const report={visualMain,visualReferenceEvidence,archiveCommit:archive.commit,methods:names.length,catalog:{clingers:Object.values(MONSTERS).filter(d=>d.cling).length,mountSlots:Object.values(MONSTERS).filter(d=>d.mountSlot).length,installedWidowRout:Object.values(MONSTERS).filter(d=>d.mountSlot?.onRiderDeath==='rout').length,mobilitySkills:Object.values(SKILLS).filter(d=>d.channel||d.castMove!==undefined).length},checks,fourLaneCases:receipts.length,receipt:sha(JSON.stringify(receipts)),boundaries:'native impulses/releases/teleports/saddles/policy only; actual factory actors with explicit local admission; no movement stepping, boundary recovery, damage, scheduling, detached/staged lifetime or publication'};
 fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativedisplacement.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS native displacement',report);
});

// Separate adapter checks remain outside the 210-case successor receipt.
// The original source and its historical receipt are not rewritten by this proof.
const integrationChecks:string[]=[];
const integrationCheck=(name:string,fn:()=>void)=>{withSeededRandom(32901+integrationChecks.length,fn);integrationChecks.push(name);console.log('PASS '+name);};
const restoreDisplacement=(text:string)=>{const restored=beforeNativeSceneDisplacement(text);assert.equal(sha(restored),integrationArchive.sourceHash,'complete displacement integration preimage');return restored;};
integrationCheck('immutable archive restores the complete committed summon World and bootstrap order',()=>{
 assert.equal(sha(JSON.stringify(integrationArchive)),nativeSceneDisplacementIntegrationArchiveHash);
 assert.equal(integrationArchive.originalArchiveHash,nativeSceneDisplacementArchiveHash);
 assert.equal(sha(beforeNativeSceneRestoration(current)),integrationArchive.afterHash);
 assert.equal(restoreDisplacement(current),execFileSync('git',['show',integrationArchive.integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'));
 const statements=ts.createSourceFile('current.ts',current,99,true).statements;
 assert.equal(statements[0].getText(),"import './nativeSceneBootstrap';");
 assert(beforeNativeSceneRestoration(current).startsWith("import './nativeSceneBootstrap';\nimport {sceneAddTether,sceneAttachObjectTethers,TETHER_TICK,type NativeSceneTetherHost} from './nativeSceneTethers';\nimport {sceneRollSummonType,sceneForwardSummonSockets} from './nativeSceneSummonPreparation';\n"));
});

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
 assert.equal(text,raw.replaceAll('\r\n','\n'),'whole current source after exact forward mapping');
 return {text:text.slice(start,end),guard:overlap?/unique exact native main visual source/:legacy};
}

const guardCore=(text:string)=>{
 const parsed=ts.createSourceFile('core.ts',beforeNativeMainVisualSource('src/engine/nativeSceneDisplacement.ts',text),99,true);
 for(const row of archive.rows){const old=wc.members.find(n=>n.name?.getText(originalSource)===row.name) as ts.MethodDeclaration,fn=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1)) as ts.FunctionDeclaration;assert.ok(fn);assert.deepEqual(fn.parameters.slice(1).map(p=>p.getText(parsed)),old.parameters.map(p=>p.getText(originalSource)),row.name+' defaults/signature');assert.equal(fn.type?.getText(parsed),old.type?.getText(originalSource));const edits:{start:number;end:number}[]=[];const body=old.body!;function visit(n:ts.Node){if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({start:n.getStart(originalSource)-body.getStart(originalSource),end:n.end-body.getStart(originalSource)});ts.forEachChild(n,visit);}visit(body);let exact=body.getText(originalSource);for(const e of edits.reverse())exact=exact.slice(0,e.start)+'host'+exact.slice(e.end);assert.equal(fn.body!.getText(parsed),exact);}
 for(const constant of archive.config)assert(parsed.statements.some(n=>n.getText(parsed).replace(/^export /,'')===constant),'exact shared native push constant');
};
integrationCheck('all thirteen World delegates preserve original defaults and shared core source refuses mutation',()=>{
 const parsed=ts.createSourceFile('world.ts',beforeNativeMainVisualSource('src/engine/world.ts',current),99,true),worldClass=parsed.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
 for(const row of archive.rows){const old=wc.members.find(n=>n.name?.getText(originalSource)===row.name) as ts.MethodDeclaration,method=worldClass.members.find(n=>n.name?.getText(parsed)===row.name) as ts.MethodDeclaration;assert.deepEqual(method.parameters.map(p=>p.getText(parsed)),old.parameters.map(p=>p.getText(originalSource)));assert.equal(method.type?.getText(parsed),old.type?.getText(originalSource));assert.deepEqual(method.modifiers?.map(m=>m.getText(parsed)),old.modifiers?.map(m=>m.getText(originalSource)));const signature=row.before.slice(0,old.body!.getStart(originalSource)-old.getStart(originalSource)),args=old.parameters.map(p=>p.name.getText(originalSource)).join(',');assert.equal(method.getText(parsed),signature+'{ return scene'+row.name[0].toUpperCase()+row.name.slice(1)+'(this.nativeSceneDisplacementHost(),'+args+'); }');}
 guardCore(coreText);
 for(const [before,after]of [['export const PUSH_DAMPING = 5.5;','export const PUSH_DAMPING = 5.6;'],['export const PUSH_MAX_SPEED = 1500;','export const PUSH_MAX_SPEED = 1501;'],['if (target.heldBy !== undefined)','if (target.heldBy === undefined)'],["cause: 'shake' | 'drop' = 'drop'","cause: 'shake' | 'drop' = 'shake'"]]){const mutant=coreText.replace(before,after);assert.notEqual(mutant,coreText);assert.throws(()=>guardCore(mutant));}
});
integrationCheck('every integration hunk duplicate and cache mutation refuses while unrelated drift survives',()=>{
 for(const row of integrationArchive.integration){const h=visualWorldHunk(current,row.after,/unique exact native displacement integration/);assert.equal(current.split(h.text).length,2);const mutant=current.replace(h.text,h.text.replace(/[A-Za-z]/,'!'));assert.notEqual(mutant,current);assert.throws(()=>beforeNativeSceneDisplacement(mutant),h.guard);assert.throws(()=>beforeNativeSceneDisplacement(current+'\n'+h.text),h.guard);}
 const host=integrationArchive.integration.find(row=>row.name==='pushActor')!,changed=current.replace(host.after,host.after.replace('enumerable:false','enumerable:true'));assert.notEqual(changed,current);assert.throws(()=>beforeNativeSceneDisplacement(changed),/unique exact native displacement integration/);
 const unrelated=current+'\n// unrelated-displacement-source-change\n';assert(beforeNativeSceneDisplacement(unrelated).endsWith('// unrelated-displacement-source-change\n'));assert.throws(()=>restoreDisplacement(unrelated),/complete displacement integration preimage/);
});
integrationCheck('actual World cached host reads replaced queues clock and selected provider with its live receiver',()=>{
 const w=makeSimWorld('warrior',32401),getHost=Reflect.get(w,'nativeSceneDisplacementHost') as ()=>core.NativeSceneDisplacementHost,host=getHost.call(w);
 assert.equal(getHost.call(w),host);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneDisplacementView')?.enumerable,false);assert.equal(Object.keys(w).includes('nativeSceneDisplacementView'),false);
 const census=[...w.actors];w.actors=census;assert.equal(host.actors,census);w.time+=3;assert.equal(host.time,w.time);
 const oldClamp=w.clampPos,events:string[]=[];
 w.clampPos=function(...args:Parameters<World['clampPos']>){assert.equal(this,w);events.push('selected');return oldClamp.apply(this,args);};
 const selected=host.clampPos;
 w.clampPos=function(...args:Parameters<World['clampPos']>){assert.equal(this,w);events.push('live');return oldClamp.apply(this,args);};
 selected(vec(100,100),w.player.radius);host.clampPos(vec(110,110),w.player.radius);assert.deepEqual(events,['selected','live']);
 const departure:World['flashes']=[],arrival:World['flashes']=[];w.flashes=departure;
 w.clampPos=function(...args:Parameters<World['clampPos']>){assert.equal(this,w);assert.equal(departure.length,1);w.flashes=arrival;return oldClamp.apply(this,args);};
 w.teleportActor(w.player,vec(180,180),'#345678');assert.equal(departure.length,1);assert.equal(arrival.length,1);assert.equal(host.flashes,arrival);assert.equal(arrival[0].color,'#345678');assert.deepEqual(w.player.pos,vec(180,180));
 w.clampPos=oldClamp;
});
integrationCheck('actual World native nested methods keep lookup timing receiver and partial mutation order',()=>{
 const w=makeSimWorld('warrior',32403),getHost=Reflect.get(w,'nativeSceneDisplacementHost') as ()=>core.NativeSceneDisplacementHost,host=getHost.call(w),rider=new Actor('integration rider','enemy',vec(250,250)),mount=new Actor('integration mount','enemy',vec(270,250));mount.defId='warg';w.actors.push(rider,mount);
 const nativeSeat=w.mountFreeSeat,calls:string[]=[];w.mountFreeSeat=function(...args:Parameters<World['mountFreeSeat']>){assert.equal(this,w);calls.push('held');return nativeSeat.apply(this,args);};const selected=host.mountFreeSeat;
 w.mountFreeSeat=function(...args:Parameters<World['mountFreeSeat']>){assert.equal(this,w);calls.push('current');return nativeSeat.apply(this,args);};assert.equal(selected(mount,MONSTERS.warg.mountSlot),0);assert.equal(Reflect.get(w,'mountSeatRider').call(w,rider,mount),true);assert.deepEqual(calls,['held','current']);assert.equal(w.actors.indexOf(rider),w.actors.indexOf(mount)+1);assert.equal(rider.mountId,mount.id);
 const nativePush=w.pushActor;w.pushActor=function(...args:Parameters<World['pushActor']>){assert.equal(this,w);assert.equal(rider.mountId,undefined);assert(rider.statuses.some(s=>s.id===MOUNT_CFG.unhorse.status));throw Error('native nested impulse refusal');};
 assert.throws(()=>Reflect.get(w,'mountUnhorse').call(w,rider,mount),/native nested impulse refusal/);assert.equal(rider.mountId,undefined);assert.equal(mount.riderIds,undefined);assert.equal(rider.push,null);w.pushActor=nativePush;w.mountFreeSeat=nativeSeat;
 const initial=rider.pos,queue:World['flashes']=[];w.flashes=queue;const clamp=w.clampPos;w.clampPos=function(){assert.equal(this,w);assert.equal(rider.tier,2);throw Error('native clamp partial');};assert.throws(()=>w.teleportActor(rider,vec(300,300),'#123456',undefined,2),/native clamp partial/);assert.equal(rider.pos,initial);assert.equal(rider.tier,2);assert.equal(queue.length,1);w.clampPos=clamp;
});
integrationCheck('World cache adds no dormancy pins while actual impulses and saddle relationships retain dependencies',()=>{
 const w=makeSimWorld('warrior',32407),unlinked=new Actor('unlinked displacement sentinel','enemy',vec(20,20)),caster=new Actor('impulse creditor','enemy',vec(40,20)),mount=new Actor('saddle dependency','enemy',vec(60,20));mount.defId='warg';w.actors.push(unlinked,caster,mount);const owned=new Map([['unlinked',unlinked],['caster',caster],['mount',mount]]);
 assert.equal(massDormancyPins(w,owned).size,0);Reflect.get(w,'levitating').call(w,unlinked);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneDisplacementView')?.enumerable,false);assert.equal(massDormancyPins(w,owned).size,0);
 const inst=makeSkillInstance(SKILLS.fireball,5);w.pushActor(w.player,0,40,caster,inst);assert.equal(w.player.push?.caster,caster);assert.equal(w.player.push?.inst,inst);let pins=massDormancyPins(w,owned);assert(pins.has(caster));assert(!pins.has(unlinked));assert(!pins.has(mount));w.player.push=null;assert.equal(massDormancyPins(w,owned).size,0);
 assert.equal(Reflect.get(w,'mountSeatRider').call(w,w.player,mount),true);pins=massDormancyPins(w,owned);assert(pins.has(mount));assert(!pins.has(unlinked));assert(!pins.has(caster));Reflect.get(w,'mountUnlink').call(w,w.player);assert.equal(massDormancyPins(w,owned).size,0);
 w.pushActor(unlinked,0,20);assert.equal(nativeActorQuietRefusal(unlinked,w,0),'committed movement or action');unlinked.push=null;assert.equal(massDormancyPins(w,owned).size,0);
});
integrationCheck('existing actual World impulse ticking consumes the same shared damping constant',()=>{
 const w=makeSimWorld('warrior',32411),a=w.player;w.pushActor(a,0,25);const push=a.push!;assert(push);const vx=push.vx,from=a.pos.x,time=w.time;w.update(1/60);const elapsed=w.time-time;assert(elapsed>0,'actual native World update advanced');assert.equal(a.push,push);assert(Math.abs(push.vx-vx*Math.exp(-core.PUSH_DAMPING*elapsed))<1e-8);assert(a.pos.x>from);
 assert(current.includes('const decay = Math.exp(-PUSH_DAMPING * dt);'));
});
const integrationReport={commit:integrationArchive.integrationCommit,sourceHash:integrationArchive.sourceHash,worldHash:sha(current),count:integrationChecks.length,checks:integrationChecks,receipt:sha(JSON.stringify(integrationChecks)),boundaries:['original210-case course mirrors native World scene values explicitly as fixture setup','separate actual World integration courses use its own state without retained-area field swaps','actual World impulse tick is existing runtime evidence, not retained movement/ticking activation','no full moveActor recovery damage scheduler or client publication']};fs.writeFileSync(new URL('./reports/nativedisplacement-integration.json',import.meta.url),JSON.stringify(integrationReport,null,2)+'\n');console.log('PASS native displacement integration',integrationReport);