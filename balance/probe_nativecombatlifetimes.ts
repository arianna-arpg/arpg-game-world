/** Lifetime courses are ordinary native law oracles until the real retained
 * operation owner is connected. No structural record is an admission receipt. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {makeSkillInstance} from '../src/engine/skills';
import {mod} from '../src/engine/stats';
import {SKILLS} from '../src/data/skills';
import {STATUS_DEFS} from '../src/engine/status';
import {DeedTracker} from '../src/engine/deeds';
import {vec} from '../src/core/math';
import {withSeededRandom} from '../src/core/rng';
import {combatHash,countedCombatRandom,refuseWorldCombat,COMBAT_WORLD_METHODS,writeCombatProof} from './probe_nativecombatcycle';

function native(world:World,key:string,args:unknown[]){const method:unknown=Reflect.get(world,key);assert.equal(typeof method,'function');return Reflect.apply(method as (...xs:unknown[])=>unknown,world,args);}
function fixture(seed:number,skill:string){
 const world=makeSimWorld('warrior',seed),source=world.createMonster('skeleton_warrior',12,'player'),target=world.createMonster('skeleton_warrior',12,'enemy');
 world.player.pos=vec(200,200);source.pos=vec(700,600);target.pos=vec(800,600);source.facing=0;source.sheet.setSource('controlled oracle resource budget',[mod('maxMana','flat',10000)]);source.mana=source.maxMana();
 const inst=makeSkillInstance(SKILLS[skill],12);source.skills=[inst];world.actors.push(source,target);return{world,source,target,inst};
}
function start(f:ReturnType<typeof fixture>){assert.equal(f.world.useSkill(f.source,f.inst,{...f.target.pos}),true);for(let i=0;i<240&&f.source.casting;i++){f.world.time+=1/60;native(f.world,'updateCasting',[f.source,1/60]);}assert.equal(f.source.casting,null);}
const oracles:{name:string;run:()=>unknown}[]=[
 {name:'actual projectile retains a removed source and native on-hit writes',run:()=>withSeededRandom(44401,()=>{
  const f=fixture(44401,'fireball');f.source.sheet.setSource('detached native on-hit grant',[mod('lifeOnHit','flat',17)]);f.source.life=f.source.maxLife()/2;start(f);assert.ok(f.world.projectiles.length);const p=f.world.projectiles[0];assert.equal(p.caster,f.source);f.world.actors=f.world.actors.filter(a=>a!==f.source);const life=f.source.life,targetLife=f.target.life;
  return countedCombatRandom(44411,()=>{for(let i=0;i<180;i++){f.world.time+=1/60;native(f.world,'updateProjectiles',[1/60]);}assert.ok(f.target.life<targetLife);assert.ok(f.source.life>life,'detached source still receives actual native on-hit gain');return{sourceAbsent:!f.world.actors.includes(f.source),sourceGain:f.source.life-life,targetLoss:targetLife-f.target.life,remaining:f.world.projectiles.length};});
 })},
 {name:'actual follow-up is popped before execution and preserves selected detached source',run:()=>withSeededRandom(44402,()=>{
  const f=fixture(44402,'harvest_stroke');f.target.pos=vec(730,600);start(f);assert.ok(f.world.pendingFollowUps.length);const record=f.world.pendingFollowUps[0],original=Reflect.get(f.world,'executeSkill') as (...args:unknown[])=>unknown,observed:{popped:boolean;source:boolean;instance:boolean}[]=[];
  Object.defineProperty(f.world,'executeSkill',{configurable:true,value:function(...args:unknown[]){observed.push({popped:!f.world.pendingFollowUps.includes(record),source:args[0]===record.caster,instance:args[1]===record.inst});return Reflect.apply(original,f.world,args);}});
  f.world.actors=f.world.actors.filter(a=>a!==f.source);
  return countedCombatRandom(44412,()=>{native(f.world,'updateFollowUps',[2]);assert.equal(f.world.pendingFollowUps.length,0);assert.deepEqual(observed,[{popped:true,source:true,instance:true}]);return{observed,sourceAbsent:!f.world.actors.includes(f.source),targetLife:f.target.life,meta:[...f.source.metaInsts.keys()]};});
 })},
 {name:'native follow-up consumes selected record when its later execution throws',run:()=>withSeededRandom(44403,()=>{
  const f=fixture(44403,'harvest_stroke');f.target.pos=vec(730,600);start(f);assert.ok(f.world.pendingFollowUps.length);const record=f.world.pendingFollowUps[0],error=new Error('observer after native record pop');let calls=0;
  // Failure injection at the selected native call boundary, not a runtime provider.
  Object.defineProperty(f.world,'executeSkill',{configurable:true,value:function(){calls++;assert.ok(!f.world.pendingFollowUps.includes(record));throw error;}});
  assert.throws(()=>native(f.world,'updateFollowUps',[2]),e=>e===error);assert.equal(f.world.pendingFollowUps.length,0);return{calls,recordConsumed:true,timer:record.timer};
 })},
 {name:'status merge retains first credit while strongest magnitude changes',run:()=>withSeededRandom(44404,()=>{
  const f=fixture(44404,'fireball'),later=f.world.createMonster('skeleton_warrior',12,'player');f.world.actors.push(later);const id=Object.entries(STATUS_DEFS).find(([,d])=>d.stackPolicy==='strongest')![0];
  f.target.applyStatus(id,10,1,'first',{casterId:f.source.id});const status=f.target.statuses.find(s=>s.id===id)!;f.target.applyStatus(id,30,2,'later stronger',{casterId:later.id});assert.equal(f.target.statuses.find(s=>s.id===id),status);assert.equal(status.dps,30);assert.equal(status.casterId,f.source.id);f.target.applyStatus(id,2,.2,'later weaker',{casterId:later.id});assert.equal(status.dps,30);assert.equal(status.casterId,f.source.id);return{id,firstCredit:true,dps:status.dps,remaining:status.remaining,total:status.total,sourceName:status.sourceName};
 })},
 {name:'refreshCaster status switches to newest attribution but casterless refresh retains it',run:()=>withSeededRandom(44405,()=>{
  const f=fixture(44405,'fireball'),later=f.world.createMonster('skeleton_warrior',12,'player');f.world.actors.push(later);const id=Object.entries(STATUS_DEFS).find(([,d])=>d.refreshCaster)![0];
  f.target.applyStatus(id,0,1,'first',{casterId:f.source.id});const status=f.target.statuses.find(s=>s.id===id)!;f.target.applyStatus(id,0,2,'later',{casterId:later.id});assert.equal(status.casterId,later.id);f.target.applyStatus(id,0,3,'terrain');assert.equal(status.casterId,later.id);return{id,latestCredit:true,remaining:status.remaining,sourceName:status.sourceName};
 })},
 {name:'actual enemy wound then healing consumes the native deed budget exactly once',run:()=>withSeededRandom(44407,()=>{
  const f=fixture(44407,'claw'),oldTarget=f.target;f.world.actors=f.world.actors.filter(a=>a!==oldTarget);f.source.team='enemy';f.target=f.world.player;f.target.pos=vec(730,600);const before=f.target.life;start(f);assert.ok(f.target.life<before,'genuine enemy cast wounds hero');
  const tracker=Reflect.get(f.world,'combatDeeds') as DeedTracker;assert.ok(tracker instanceof DeedTracker);const wounds=Reflect.get(tracker,'wounds') as number;assert.equal(wounds,before-f.target.life);const ledgerBefore={...f.world.account.ledger};
  const healed=f.target.healBy(wounds/2);assert.ok(healed>0);assert.equal(Reflect.get(tracker,'wounds'),wounds-healed);const ledgerAfter={...f.world.account.ledger};assert.notDeepEqual(ledgerAfter,ledgerBefore,'real eligible heal records campaign deed');
  f.target.refillLife();assert.equal(Reflect.get(tracker,'wounds'),0);assert.deepEqual(f.world.account.ledger,ledgerAfter,'silent full restore consumes credit without another heal deed');f.target.life-=5;f.target.healBy(5);assert.deepEqual(f.world.account.ledger,ledgerAfter,'self-created gap cannot spend the old wound twice');
  return{wounds,healed,healLedgerDelta:Object.fromEntries(Object.keys(ledgerAfter).filter(k=>ledgerAfter[k]!==ledgerBefore[k]).map(k=>[k,ledgerAfter[k]-(ledgerBefore[k]??0)])),woundsAfter:Reflect.get(tracker,'wounds')};
 })},
 {name:'actual healing callback failure follows the life write and precedes tracker mutation',run:()=>withSeededRandom(44407,()=>{
  const f=fixture(44407,'claw'),oldTarget=f.target;f.world.actors=f.world.actors.filter(a=>a!==oldTarget);f.source.team='enemy';f.target=f.world.player;f.target.pos=vec(730,600);start(f);const tracker=Reflect.get(f.world,'combatDeeds') as DeedTracker,life=f.target.life,wounds=Reflect.get(tracker,'wounds'),ledger={...f.world.account.ledger},error=new Error('callback entry refused');let calls=0;
  // Labeled boundary failure: the retained course will produce this refusal
  // through actual transferred authority, never substitute a runtime callback.
  assert.ok(f.target.life<f.target.maxLife(),'actual native attack landed before callback failure test');assert.ok(typeof wounds==='number'&&wounds>0);f.target.onLifeHealed=()=>{calls++;throw error;};assert.throws(()=>f.target.healBy(3),e=>e===error);assert.equal(f.target.life,life+3);assert.equal(Reflect.get(tracker,'wounds'),wounds);assert.deepEqual(f.world.account.ledger,ledger);return{calls,lifeDelta:f.target.life-life,woundsUnchanged:true,ledgerUnchanged:true};
 })},
 {name:'late status option getter failure retains already performed native merge writes',run:()=>withSeededRandom(44406,()=>{
  const f=fixture(44406,'fireball');f.target.applyStatus('burn',10,1,'first',{casterId:f.source.id});const status=f.target.statuses.find(s=>s.id==='burn')!,before=status.dps,error=new Error('late propagation option');let reads=0;
  const opts:NonNullable<Parameters<typeof f.target.applyStatus>[4]>={casterId:f.source.id};Object.defineProperty(opts,'propagates',{get(){reads++;throw error;}});
  assert.throws(()=>f.target.applyStatus('burn',30,2,'later',opts),e=>e===error);assert.equal(status.dps,30);assert.ok(status.dps>before);assert.equal(reads,1);return{reads,dps:status.dps,remaining:status.remaining,originalCredit:status.casterId===f.source.id};
 })},
];
function selfTestWorldTrap(){
 const world=makeSimWorld('warrior',44400),descriptors=COMBAT_WORLD_METHODS.map(name=>[name,Object.getOwnPropertyDescriptor(World.prototype,name)] as const);
 assert.throws(()=>refuseWorldCombat([world],()=>world.useSkill(world.player,makeSkillInstance(SKILLS.cleave,1),world.player.pos)),/Retained combat called World driver: useSkill/);
 for(const[name,before]of descriptors)assert.deepEqual(Object.getOwnPropertyDescriptor(World.prototype,name),before,'restore '+name);
 // Own instance drivers are trapped too; a successful callback cannot swallow
 // the driver failure and falsely count as independent retained execution.
 Object.defineProperty(world,'executeSkill',{configurable:true,writable:true,value:World.prototype.executeSkill});
 assert.throws(()=>refuseWorldCombat([world],()=>{try{world.executeSkill(world.player,makeSkillInstance(SKILLS.cleave,1),world.player.pos);}catch{/* observed then checked outside */}}),/retained lane never used World combat/);
 return{prototypeNegative:true,ownNegative:true,swallowedNegative:true,restored:true};
}
function oracleDevelopment(){const receipts=oracles.map(c=>{const first=c.run(),repeat=c.run();assert.deepEqual(repeat,first,c.name+' ordinary native repeat');console.log('PASS lifetime oracle '+c.name);return{name:c.name,value:first};});const trap=selfTestWorldTrap();const report={mode:'ordinary native lifetime oracle development; retained operation acceptance pending',courses:receipts.length,receipts,trap,receipt:combatHash(JSON.stringify({receipts,trap}))};writeCombatProof('native-combat-lifetime-oracle-development.json',report);console.log(JSON.stringify({mode:report.mode,courses:report.courses,receipt:report.receipt}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.includes('--oracle-development'))oracleDevelopment();else throw Error('Actual operation owner is still being authored; oracle-only success is not retained lifetime acceptance');}
