/** Launch-only parity. These are actual native queue/population/progression owners,
 * explicitly admitted by the fixture; full birth, combat ticking and detached
 * caster lifetimes are not exercised or supplied by this course. */
import assert from 'node:assert/strict';
import {nativeCaravanExtractedFS as fs} from './nativeCaravanExtractedReadFixture';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {makeSimWorld} from '../src/sim/arena';
import {World} from '../src/engine/world';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionAuthority} from '../src/worldmass/nativeAreaSceneProgression';
import {NativeAreaSceneProjectiles,type NativeSceneProjectileRuntime} from '../src/worldmass/nativeAreaSceneProjectiles';
import * as core from '../src/engine/nativeSceneProjectiles';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {withSeededRandom} from '../src/core/rng';
import {cosmeticSkillPaint,equipCosmetic} from '../src/meta/cosmetics';
import {chance,dist,vec} from '../src/core/math';
import {Actor} from '../src/engine/actor';
import {applyConversion} from '../src/engine/damage';
import {conversionStat,mod} from '../src/engine/stats';
import {effectiveSkillLevel,grantedTags,instanceMods,instanceTrail,instanceFissureTrail,makeSkillInstance,skillContextTags,type SkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {LOS_CFG} from '../src/engine/los';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
import {nativeSceneProjectileArchive as archive,nativeSceneProjectileArchiveHash} from './nativeSceneProjectileArchive';
import {beforeNativeSceneProjectiles} from './nativeSceneProjectileFixture';
assert.equal(sha(JSON.stringify(archive)),nativeSceneProjectileArchiveHash,'immutable projectile archive');
const integratedWorld=fs.readFileSync(new URL('../src/engine/world.ts',import.meta.url),'utf8');
assert.equal(sha(beforeNativeSceneProjectiles(integratedWorld)),archive.sourceHash,'exact whole World restoration');
const hostIntegration=archive.integration.find(row=>row.after.startsWith('declare private nativeSceneProjectileView'))!;
assert.ok(hostIntegration);
const changedHost=integratedWorld.replace(hostIntegration.after,hostIntegration.after.replace('get projectiles(){return world.projectiles;}','get projectiles(){return [];}'));
assert.notEqual(changedHost,integratedWorld);
assert.throws(()=>beforeNativeSceneProjectiles(changedHost),/unique exact native projectile integration/);
assert.equal(beforeNativeSceneProjectiles(integratedWorld),execFileSync('git',['show',archive.integrationCommit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),'immutable integration source');
assert.equal(archive.commit,'7cf5092dae712a1f8baec5d37f559437076701b3');
const archivedWorld=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20e6});
const archivedSource=ts.createSourceFile('world.ts',archivedWorld,99,true);
const archivedClass=archivedSource.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const bindings={cosmeticSkillPaint,chance,dist,vec,Actor,applyConversion,effectiveSkillLevel,grantedTags,instanceMods,instanceTrail,instanceFissureTrail,makeSkillInstance,skillContextTags,SKILLS,LOS_CFG};
const original=Function(...Object.keys(bindings),emit(archive.config.join('\n')+'\nclass Original{'+archive.rows.map((r:any)=>r.before).join('\n')+'}\nreturn Original.prototype;'))(...Object.values(bindings));
const coreText=fs.readFileSync(new URL('../src/engine/nativeSceneProjectiles.ts',import.meta.url),'utf8'),sf=ts.createSourceFile('core.ts',coreText,99,true);
for(const r of archive.rows){
 const originalMethod=archivedClass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(archivedSource)===r.name)!;
 assert.equal(r.before,originalMethod.getText(archivedSource));assert.equal(sha(r.before),r.hash);
 const before=ts.createSourceFile('old.ts','class Old{'+r.before+'}',99,true),m=(before.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const next=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+r.name[0].toUpperCase()+r.name.slice(1)) as ts.FunctionDeclaration;
 assert.equal(emit('function p()'+next.body!.getText(sf)),emit('function p()'+m.body!.getText(before).replace(/\bthis\b/g,'host')));
}
for(const line of archive.config){assert.ok(archivedWorld.includes(line));const declaration=sf.statements.find(n=>ts.isVariableStatement(n)&&n.getText(sf).replace(/^export /,'')===line);assert.ok(declaration,'exact shared constant '+line);}
const cosmeticSource=fs.readFileSync(new URL('../src/meta/cosmetics.ts',import.meta.url),'utf8');
assert.equal(emit(cosmeticSource),emit(execFileSync('git',['show',archive.commit+':src/meta/cosmetics.ts'],{encoding:'utf8'})),'cosmetic changes erase to identical JS');
const checks:string[]=[];
function checked(name:string,fn:()=>void){fn();checks.push(name);console.log('PASS '+name);}
// Seed real monster/shapeshift fixture construction as well as each launch.
withSeededRandom(70151,()=>{
const w=makeSimWorld('warrior',7431),raw:any=freshAssemblyInput(w,w.zone),campaign=raw.campaign,area=new NativeAreaSceneAssembly(raw),scene=area.input.scene;
const authority=new NativeAreaActorAuthority<NativeSceneProjectileRuntime>(campaign),state=freshSceneProgressionState();
// A launch-only fixture needs the actual progression queue owner, but never calls
// progression's combat/rebuild services. This explicit fixture cast does not
// install a substitute combat service or widen the production launch authority.
const launchOnlyProgressionAuthority=authority as unknown as NativeSceneProgressionAuthority;
const makeProgression=(a:NativeAreaSceneAssembly,queue=freshSceneProgressionState())=>new NativeAreaSceneProgression({scene:a.input.scene,population:a.input.population,ecology:a.input.ecology,geometry:a.input.geometry,runtime:a.input.registry.input.birth,loot:a.lootController,campaign,state:queue,authority:launchOnlyProgressionAuthority});
const progression=makeProgression(area,state),owner=new NativeAreaSceneProjectiles({scene,population:area.input.population,campaign,progression,authority});
const foe=area.input.population.createMonster('goblin_skirmisher',8,'enemy');foe.pos={x:scene.player.pos.x+90,y:scene.player.pos.y};scene.actors.push(foe);
const binding=authority.register(scene,{progression});authority.claim(binding,scene.actors);
checked('safe native area retains actual hostility without a mass sanctuary',()=>{
 assert.equal(scene.zone.objective.kind,'safe');assert.equal(w.massRuntime,null);
 assert.equal(area.input.population.hostileTo(scene.player,foe),true);
 assert.ok(area.input.population.enemiesOf(scene.player).includes(foe));
 const prior=w.actors;try{w.actors=scene.actors;assert.equal(w.sanctuaryBlocksCombat(scene.player,foe),false);assert.deepEqual(w.enemiesOf(scene.player),area.input.population.enemiesOf(scene.player));}finally{w.actors=prior;}
});
function plain(v:any,seen=new Map<object,number>()):any{if(v instanceof Actor)return {actor:v.id};if(v===undefined)return {$undefined:1};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};if(typeof v==='function')return {$function:v.name};if(v===null||typeof v!=='object')return v;if(seen.has(v))return {$ref:seen.get(v)};seen.set(v,seen.size);if(v instanceof Map)return {$map:[...v].map(([k,x])=>[plain(k,seen),plain(x,seen)])};if(v instanceof Set)return {$set:[...v].map(x=>plain(x,seen))};if(Array.isArray(v))return v.map(x=>plain(x,seen));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x,seen)]));}
const payloads:any[]=[],expanded:any[]=[],skills=Object.values(SKILLS).filter(s=>s.delivery.type==='projectile');
type LaunchOptions=Parameters<World['spawnProjectile']>[4];
function compareLaunch(label:string,caster:Actor,inst:SkillInstance,opts?:LaunchOptions,record=true):{payload:any;flight:World['projectiles'][number]}{
 const origin={x:caster.pos.x+7,y:caster.pos.y-9},out=[];
 for(const lane of ['original','core','world','owner']){
  state.projectiles=[];
  out.push(withSeededRandom(9431,()=>{
   if(lane==='original')original.spawnProjectile.call(owner.host,caster,inst,origin,.42,opts);
   else if(lane==='core')core.sceneSpawnProjectile(owner.host,caster,inst,origin,.42,opts);
   else if(lane==='world'){
    // Explicit fixture publication into a genuine World, restored immediately.
    // This tests its delegate; it is not the production area publisher.
    const previousActors=w.actors,previousQueue=w.projectiles;
    try{w.actors=scene.actors;w.projectiles=state.projectiles;w.spawnProjectile(caster,inst,origin,.42,opts);}
    finally{w.actors=previousActors;w.projectiles=previousQueue;}
   }else owner.spawnProjectile(caster,inst,origin,.42,opts);
   if(inst.def.delivery.type==='projectile'){
    assert.equal(state.projectiles[0].caster,caster);assert.equal(state.projectiles[0].inst,inst);
   }
   return {flights:plain(state.projectiles),next:Math.random()};
  }));
 }
 assert.deepEqual(out[1],out[0],label+' core');assert.deepEqual(out[2],out[0],label+' World');assert.deepEqual(out[3],out[0],label+' owner');
 if(record)expanded.push([label,out[0]]);return {payload:out[0],flight:state.projectiles[0]};
}
checked('all native projectile definitions preserve payloads, references and raw RNG',()=>{
 for(const def of skills)for(const rich of [false,true]){
  const inst=makeSkillInstance(def,20),caster=scene.player,origin={x:caster.pos.x+7,y:caster.pos.y-9};
  const opts=rich?{inherit:{homing:.4,erratic:.6,spiral:.2,orbit:.1,spin:.3,weave:.7,orbitR0:41,amp:21},depth:1,mult:1.7,flat:{fire:11},dest:{x:origin.x+110,y:origin.y+45},patrol:[{x:origin.x+20,y:origin.y+70},{x:origin.x+80,y:origin.y-20}]}:undefined;
  payloads.push([def.id,rich,compareLaunch(def.id, caster,inst,opts,false).payload]);
 }
});
checked('selective projectile chooses the real hostile body in a safe native area',()=>{
 const flight=compareLaunch('positive heartchaser target',scene.player,makeSkillInstance(SKILLS.heartchaser,20)).flight;assert.equal(flight.preyId,foe.id);
});
let folds=0,emitterCourses=0;
checked('installed occlusion folds preserve native result',()=>{for(const def of Object.values(SKILLS)){
 const inst=makeSkillInstance(def,1),expected=original.skillOcclusion.call(owner.host,scene.player,inst);
 assert.equal(core.sceneSkillOcclusion(owner.host,scene.player,inst),expected);assert.equal(owner.skillOcclusion(scene.player,inst),expected);assert.equal(w['skillOcclusion'](scene.player,inst),expected);folds++;
}});
checked('all native emitters honor child depth zero through three',()=>{
 const emitters=skills.filter(d=>d.delivery.type==='projectile'&&d.delivery.emit);assert.ok(emitters.length);
 for(const def of emitters)for(const depth of [0,1,2,3]){
  const inst=makeSkillInstance(def,20),flight=compareLaunch(def.id+' depth '+depth,scene.player,inst,{depth}).flight;
  assert.equal(flight.depth,depth);if(depth>=2)assert.equal(flight.emit,undefined);
  else{assert.ok(flight.emit);assert.equal(def.delivery.type,'projectile');if(def.delivery.type!=='projectile')throw Error('delivery');assert.equal(flight.emit.inst.def,SKILLS[def.delivery.emit!.skillId]);assert.equal(flight.emit.inst.level,effectiveSkillLevel(inst));}
  emitterCourses++;
 }
});
checked('socketed returns preserve native target and grant a second pass',()=>{
 for(const nativeMode of [undefined,'caster'] as const){
  const def=skills.find(d=>d.delivery.type==='projectile'&&d.delivery.returns===nativeMode);assert.ok(def,'installed '+nativeMode+' return');
  for(const support of [SUPPORTS.returning,SUPPORTS.boomerang]){
   const inst=makeSkillInstance(def,20);inst.sockets[0]={def:support,level:1};
   const flight:World['projectiles'][number]=compareLaunch(def.id+' '+support.id,scene.player,inst).flight;
   assert.equal(flight.returnMode,nativeMode==='caster'?2:support.id==='returning'?1:2);
   assert.equal(flight.returnPasses,nativeMode?2:1);
  }
 }
});
// The installed catalogue has only an innate caster-returner. This explicitly
// synthetic delivery covers the preserved origin-return branch without claiming
// an authored origin skill exists or registering extra game content.
checked('synthetic innate origin branch resists a granted caster return',()=>{
 const source=skills.find(d=>d.delivery.type==='projectile'&&d.delivery.returns==='caster')!;
 if(source.delivery.type!=='projectile')throw Error('delivery');
 const def={...source,delivery:{...source.delivery,returns:'origin' as const}},inst=makeSkillInstance(def,20);
 inst.sockets[0]={def:SUPPORTS.boomerang,level:1};
 const flight=compareLaunch('synthetic innate origin',scene.player,inst).flight;assert.equal(flight.returnMode,1);assert.equal(flight.returnPasses,2);
});
checked('actual phasing support changes blocked flight to free',()=>{
 const def=skills.find(d=>owner.skillOcclusion(scene.player,makeSkillInstance(d,1))==='blocked');assert.ok(def);
 const inst=makeSkillInstance(def,20);assert.equal(compareLaunch('blocked '+def.id,scene.player,inst).flight.phase,undefined);
 inst.sockets[0]={def:SUPPORTS.wraith_passage,level:1};assert.equal(owner.skillOcclusion(scene.player,inst),'free');
 assert.equal(compareLaunch('phasing '+def.id,scene.player,inst).flight.phase,true);
});
checked('native projectile aura conversion applies actual caster stats',()=>{
 const defs=skills.filter(d=>d.delivery.type==='projectile'&&d.delivery.aura);assert.ok(defs.length);
 for(const def of defs){
  if(def.delivery.type!=='projectile')throw Error('delivery');const from=def.delivery.aura!.damageType??'chaos',to=from==='fire'?'cold':'fire';
  const inst=makeSkillInstance(def,20),before=compareLaunch(def.id+' aura base',scene.player,inst).flight.auraAmounts!;
  scene.player.sheet.setSource('projectile-proof-conversion',[mod(conversionStat(from,to),'flat',.5)]);
  try{const after=compareLaunch(def.id+' aura converted',scene.player,inst).flight.auraAmounts!;
   assert.equal(after[from],before[from]!*.5);assert.equal(after[to],before[from]!*.5);assert.equal(Object.values(after).reduce((a,b)=>a+b,0),Object.values(before).reduce((a,b)=>a+b,0));
  }finally{scene.player.sheet.removeSource('projectile-proof-conversion');}
 }
});
checked('local wardrobe paints actual hero and owned summon lineage only',()=>{
 const saved=structuredClone(w.account.cosmetics),inst=makeSkillInstance(SKILLS.fireball,20);
 const summon=area.input.population.createMonster('skeleton_warrior',3,'player',scene.player),child=area.input.population.createMonster('skeleton_warrior',3,'player',summon);
 scene.actors.push(summon,child);authority.claim(binding,[summon,child]);
 try{
  assert.equal(equipCosmetic(w.account,'skillRecolor','moon_tint'),true);assert.equal(equipCosmetic(w.account,'skillSkin','starlit_skills'),true);
  for(const caster of [scene.player,summon,child]){const flight=compareLaunch('wardrobe stars '+caster.id,caster,inst).flight;assert.equal(flight.color,'#91d6ef');assert.equal(flight.cosmeticMotif,'stars');}
  const enemy=compareLaunch('enemy excludes local wardrobe',foe,inst).flight;assert.equal(enemy.color,SKILLS.fireball.color);assert.equal(enemy.cosmeticMotif,undefined);
  assert.equal(equipCosmetic(w.account,'skillSkin','crystal_projectiles'),true);
  assert.equal(compareLaunch('crystal projectile',scene.player,inst).flight.cosmeticProjectile,'crystal_bolt');
  assert.equal(equipCosmetic(w.account,'skillSkin','fireball_comet','fireball'),true);
  assert.equal(compareLaunch('skill-specific comet',scene.player,inst).flight.cosmeticProjectile,'ember_comet');
 }finally{w.account.cosmetics=saved;authority.release(binding,[summon,child]);scene.actors=scene.actors.filter(a=>a!==summon&&a!==child);}
});
const inst=makeSkillInstance(skills[0],3);
checked('launch reads the live replacement queue',()=>{const queue:World['projectiles']=[];state.projectiles=queue;owner.spawnProjectile(scene.player,inst,scene.player.pos,0);assert.equal(queue.length,1);assert.equal(state.projectiles,queue);});
// Reject before native sheet queries or RNG. Recording wrappers below are only
// instrumentation of actual objects, not replacement capability implementations.
function refusesWithoutMutation(action:()=>void,expected:RegExp,queues=[state.projectiles]){
 const saved=queues.map(q=>[...q]),sheet=scene.player.sheet,read=sheet.get;let reads=0;
 sheet.get=function(...args:Parameters<typeof read>){reads++;return Reflect.apply(read,this,args);};
 try{const seed=1767,expectedNext=withSeededRandom(seed,()=>Math.random());withSeededRandom(seed,()=>{assert.throws(action,expected);assert.equal(Math.random(),expectedNext);});assert.equal(reads,0);queues.forEach((q,i)=>assert.deepEqual(q,saved[i]));}
 finally{sheet.get=read;}
}
checked('same scene refuses unregistered P2 queue before all launch effects',()=>{
 const second=makeProgression(area),secondOwner=new NativeAreaSceneProjectiles({scene,population:area.input.population,campaign,progression:second,authority});
 assert.equal(authority.require(scene.player).progression,progression);
 refusesWithoutMutation(()=>secondOwner.spawnProjectile(scene.player,inst,scene.player.pos,0),/registered progression queue/,[state.projectiles,second.input.state.projectiles]);
});
checked('foreign matching coordinates and borrowed census refuse before launch',()=>{
 const peerRaw:any=freshAssemblyInput(w,w.zone,campaign),peer=new NativeAreaSceneAssembly(peerRaw),peerScene=peer.input.scene;peerScene.actors=[];
 const foreign=peer.input.population.createMonster('goblin_skirmisher',4,'enemy');foreign.pos={...scene.player.pos};peerScene.actors.push(foreign);
 const peerProgression=makeProgression(peer),peerBinding=authority.register(peerScene,{progression:peerProgression});authority.claim(peerBinding,peerScene.actors);
 refusesWithoutMutation(()=>owner.spawnProjectile(foreign,inst,foreign.pos,0),/physical caster/);
 scene.actors.push(foreign);try{refusesWithoutMutation(()=>owner.spawnProjectile(scene.player,inst,scene.player.pos,0),/unowned or borrowed/);}finally{scene.actors.pop();}
 assert.throws(()=>new NativeAreaSceneProjectiles({scene:peerScene,population:peer.input.population,campaign,progression,authority}),/identical/);
});
checked('constructors reject inherited binding recipes',()=>{
 const inherited=Object.create({scene,population:area.input.population,campaign,progression,authority});assert.throws(()=>new NativeAreaSceneProjectiles(inherited),/own object binding/);
});
checked('native carried shapeshift refuses hidden flesh but admits actual form',()=>{
 const flesh=w.localSeat.actor;
 w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);
 const form=w.localSeat.actor;assert.notEqual(form,flesh);assert.equal(w.localSeat.home,flesh);assert.equal(form.possession?.huskMode,'carried');assert.equal(w.actors.includes(flesh),false);
 authority.release(binding,[flesh]);scene.actors=scene.actors.filter(a=>a!==flesh);scene.player=form;scene.actors.push(form);authority.claim(binding,[form]);
 assert.equal(authority.require(flesh).scene,scene);assert.equal(scene.actors.includes(flesh),false);
 refusesWithoutMutation(()=>owner.spawnProjectile(flesh,inst,flesh.pos,0),/physical caster/);
 assert.equal(compareLaunch('actual carried form',form,inst).flight.caster,form);
});
const report={archiveCommit:archive.commit,projectileSkills:skills.length,fourLaneLaunches:payloads.length,occlusionFolds:folds,emitterCourses,expandedFourLaneLaunches:expanded.length,checks,receipt:sha(JSON.stringify(payloads)),expandedReceipt:sha(JSON.stringify(expanded)),boundaries:'launch only; actual native owners with explicit fixture physical admission; no full birth, combat ticking, detached effect-caster lifetime or publication claim; progression combat is not invoked'};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-projectile-launch.json',import.meta.url),JSON.stringify(report,null,2));console.log('PASS native projectile launch',report);

});
