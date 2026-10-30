/** Independent ordinary-World oracle and actual retained-combat acceptance.
 * Development oracle mode is deliberately separate from aggregate acceptance.
 * No World scene/queue replacement and no World combat callback in the retained lane. */
import '../src/engine/world';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {World} from '../src/engine/world';
import {Actor} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {Rng,withSeededRandom} from '../src/core/rng';
import {vec} from '../src/core/math';
import {mod} from '../src/engine/stats';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {MONSTERS} from '../src/data/monsters';
import {PROCS} from '../src/data/procs';
import {nextItemUid} from '../src/engine/itemgen';

export const COMBAT_PROOF_PIN='42f95716294995cbdd83785f0a0782ddda971f76';
export const COMBAT_PROOF_OVERLAY='9dc13b3a39d1217be5b47501c0219d6b2b5c0bfe22ad70217ac029ce5853780d';
export const combatHash=(value:string)=>createHash('sha256').update(value).digest('hex');
/** Frozen pure149 source inventory; later operation hooks require a new explicit binding. */
export const SHARED_COMBAT_WORLD_METHODS=[
 "resolveTargeting",
 "useSkill",
 "executeSkill",
 "recordCast",
 "activateAura",
 "tryTame",
 "hivecallPayload",
 "hivecallDeath",
 "hivecallReturn",
 "birthAt",
 "clutchOnDeath",
 "hatchPod",
 "dismissExclusiveSummons",
 "spawnMinion",
 "spawnEchoRiders",
 "buildEchoRider",
 "spawnConstruct",
 "releaseStruckSummons",
 "endCarom",
 "throngEvolutionHit",
 "throngEvolutionBurst",
 "assaultDoomCull",
 "grabThrowRelease",
 "ringBell",
 "strikeSurfaces",
 "attuneCrystal",
 "knockFixtures",
 "tryShellBlock",
 "tryGuardBlock",
 "guardBash",
 "moveBlast",
 "applyThorns",
 "explodeActor",
 "burstDamage",
 "resolveHit",
 "rollStatusProcs",
 "rollOwnProcs",
 "sweepDefenseEvents",
 "executeProc",
 "castProcPayload",
 "fireProcRiders",
 "ruptureBank",
 "ruptureStatus",
 "killCtx",
 "kill",
 "onPartBroken",
 "triggerAmbush",
 "rollTriggers",
 "bankStatusTriggers",
 "bankDamageTakenTriggers",
 "rollSurfaceProcs",
 "popBrittle",
 "popBrittleNative",
 "applyRecovery",
 "applyEnvDamage",
 "affordedDest",
 "castSealed",
 "clampGroundTarget",
 "companionBondsOfSkill",
 "companionsOfSkill",
 "conjurationLifeline",
 "conjureGrantsFor",
 "corpseSpawn",
 "echoToClones",
 "hivecallMeta",
 "guardianFor",
 "hoverSlotPos",
 "layFissure",
 "liteCarve",
 "litePourAt",
 "litePromoteNearest",
 "minionServes",
 "minionsOf",
 "minionsOfGroup",
 "mirageSource",
 "releasePrimedPours",
 "removeCorpse",
 "spawnAftershocks",
 "springAmbush",
 "tameCompanion",
 "throngDirect",
 "throngKeepMinimum",
 "throngOnHit",
 "throngOnKill",
 "promoteCommandThrong",
 "triggerEligible",
 "weightedPick",
 "addTempGround",
 "dissolveBreak",
 "hivecallRoster",
 "hivecallTransform",
 "liteNoteDeath",
 "litePocketDisturb",
 "promoteLite",
 "minionAreaAvoidanceOf",
 "mintThrongFind",
 "throngBodiesOf",
 "throngCapOf",
 "throngGain",
 "throngRosterCount",
 "throngStandNear",
 "throngYieldCount",
 "updateCasting",
 "aiHoldOf",
 "aiNeedsFireLine",
 "castPress",
 "castTurnRate",
 "actorTurnRate",
 "plantSpiritTotem",
 "tickChannelSupports",
 "explodeProjectile",
 "resolveParryDamage",
 "hivecallCap",
 "mintThrongBody",
 "throngRecruitCap",
 "syncHivecallFormDamage",
 "updateProjectiles",
 "updateZones",
 "updateFollowUps",
 "updateDeathBursts",
 "updatePendingSummons",
 "carriedEffectContext",
 "advanceProjectile",
 "viewRectFor",
 "enterReturn",
 "returnTarget",
 "shedFlightShrapnel",
 "projTouches",
 "projNose",
 "interceptProjectileDomes",
 "projTouchesBody",
 "liteProjectileSweep",
 "accumulateDotText",
 "kinkProjectile",
 "forkProjectile",
 "noteLightningTravel",
 "zoneVictims",
 "underRoofAt",
 "zoneSees",
 "strikeZoneSurfaces",
 "plantImpactDress",
 "zoneHas",
 "detonateFissureSegment",
 "updateZoneDomain",
 "nearestSeatPos",
 "burstContact",
 "guidePointOf",
 "nearestProjTarget",
 "afflictionSeat"
] as const;
export const OTHER_LOCAL_WORLD_DRIVERS=[
 "arenaRadiusOf",
 "bankCouchWipe",
 "beginModeFall",
 "beginModeRespawn",
 "beginPitDescent",
 "beginSkyfall",
 "beginTraversal",
 "castReqRefusal",
 "claimGarrisonSlot",
 "concludeWipe",
 "crackArena",
 "despawnPartsOf",
 "dismissMercenary",
 "distinctNameOf",
 "drainSurvival",
 "fellVessel",
 "finalizeGarrison",
 "garrisonSlotById",
 "grabHandoff",
 "grabSeize",
 "grantEssence",
 "imminentThreatTo",
 "indexSeats",
 "loseBagRelicsOnDeath",
 "markSeatMoved",
 "modeDef",
 "moveActor",
 "nearestExit",
 "nemesisEligible",
 "onBeastFleeBegin",
 "onBrainPhaseEnter",
 "onPlayerDown",
 "onRunEnded",
 "openTownPortal",
 "paintSink",
 "plantDressAt",
 "possessSeize",
 "reckonRunEssence",
 "recordDeath",
 "recordNemesisFall",
 "recordSeatDeath",
 "removeSeat",
 "reqShortfall",
 "resolveBoundary",
 "restoreAccountRelics",
 "restoreArena",
 "resurfaceFromDescent",
 "routePitFall",
 "routeSkyFalls",
 "sailing",
 "scatterPitArrival",
 "seatEject",
 "seatEmbody",
 "shapeshiftPress",
 "shrinkArenaPockets",
 "sinkArena",
 "sinkRecordOf",
 "slipAway",
 "snowCoverAt",
 "spawnSummonOffspring",
 "startBurrow",
 "steppedClamp",
 "stripCarryOf",
 "stripCarryOnDeath",
 "survivalDrainRate",
 "townPortalRefusal",
 "updateTraversal",
 "voyageShip",
 "windAt",
 "zoneWind"
] as const;
export const COMBAT_WORLD_METHODS=[...new Set<string>([...SHARED_COMBAT_WORLD_METHODS,...OTHER_LOCAL_WORLD_DRIVERS,
 'text','createMonster','recalcSeat','resyncMercenary','completeObjective','captureZoneMemory',
 'resolveTargeting','useSkill','executeSkill','recordCast','activateAura','tryTame','hivecallPayload','hivecallDeath','hivecallReturn','birthAt','clutchOnDeath','hatchPod','dismissExclusiveSummons','spawnMinion','spawnEchoRiders','buildEchoRider','spawnConstruct','releaseStruckSummons','endCarom','throngEvolutionHit','throngEvolutionBurst','assaultDoomCull','grabThrowRelease','ringBell','strikeSurfaces','attuneCrystal','knockFixtures','tryShellBlock','tryGuardBlock','guardBash','moveBlast','applyThorns','explodeActor','burstDamage','resolveHit','rollStatusProcs','rollOwnProcs','sweepDefenseEvents','executeProc','castProcPayload','fireProcRiders','ruptureBank','ruptureStatus','killCtx','kill','onPartBroken','triggerAmbush','rollTriggers','bankStatusTriggers','bankDamageTakenTriggers','rollSurfaceProcs','popBrittle','popBrittleNative','applyRecovery','applyEnvDamage',
 'updateCasting','updateProjectiles','updateZones','updateFollowUps','updateDeathBursts','spawnProjectile','addTether','attachObjectTethers','rollKillOrbs','rollKillRemnants','spawnDeathBurst',
])];
/** Callability check and receiver selection belong only to the oracle adapter. */
function worldMethod(world:World,name:string,args:unknown[]):unknown {
 const selected:unknown=Reflect.get(world,name);
 assert.equal(typeof selected,'function','ordinary World method '+name);
 return Reflect.apply(selected as (...xs:unknown[])=>unknown,world,args);
}
/** Install before constructing any retained providers. This does not supply a
 * behavior: every forbidden call fails and the exact descriptors restore. */
export function refuseWorldCombat<T>(writers:readonly World[],fn:(calls:string[])=>T):T {
 for(const name of SHARED_COMBAT_WORLD_METHODS)assert.equal(typeof Reflect.get(World.prototype,name),'function','every frozen native driver is trapped: '+name);
 const targets:object[]=[World.prototype,...writers],saved:{target:object;name:string;descriptor:PropertyDescriptor|undefined}[]=[],calls:string[]=[];
 try {
  for(const target of targets)for(const name of COMBAT_WORLD_METHODS){
   const descriptor=Object.getOwnPropertyDescriptor(target,name);
   if(target!==World.prototype&&!descriptor)continue;
   if(!descriptor||(typeof descriptor.value!=='function'&&typeof descriptor.get!=='function'))continue;
   assert.equal(descriptor.configurable,true,'test trap needs configurable method '+name);
   saved.push({target,name,descriptor});
   const refusal=function(){calls.push(name);throw Error('Retained combat called World driver: '+name);};
   Object.defineProperty(target,name,Object.hasOwn(descriptor,'value')?{...descriptor,value:refusal}:{...descriptor,get:refusal});
  }
  const result=fn(calls);assert.deepEqual(calls,[],'retained lane never used World combat');return result;
 } finally {for(const {target,name,descriptor}of saved.reverse()){if(descriptor)Object.defineProperty(target,name,descriptor);else Reflect.deleteProperty(target,name);}}
}
export function countedCombatRandom<T>(seed:number,fn:()=>T):{value:T;draws:number;sentinel:number;cursor:number}{
 const rng=new Rng(seed),before=Math.random;let draws=0;
 Math.random=()=>{draws++;return rng.next();};
 try {const value=fn(),cursor=rng.snapshot(),sentinel=rng.next();return{value,draws,sentinel,cursor};}finally{Math.random=before;}
}
export function combatCatalog(){
 const skills=Object.values(SKILLS).sort((a,b)=>a.id.localeCompare(b.id));
 const supports=Object.values(SUPPORTS).sort((a,b)=>a.id.localeCompare(b.id));
 const monsters=Object.values(MONSTERS).map(d=>({id:d.id,skills:d.skills,brain:d.brain})).sort((a,b)=>a.id.localeCompare(b.id));
 const groups:Record<string,string[]>={};for(const d of skills)(groups[d.delivery.type]??=[]).push(d.id);
 return{skills:skills.length,supports:supports.length,monsters:monsters.length,groups,procs:Object.keys(PROCS).length,procHash:combatHash(JSON.stringify(PROCS)),skillHash:combatHash(JSON.stringify(skills)),supportHash:combatHash(JSON.stringify(supports)),monsterHash:combatHash(JSON.stringify(monsters))};
}
/** Explicit labels retain object identity relationships while ignoring the
 * process-global actor counter that a new ordinary World intentionally resets. */
export function combatProjection(world:World,labels:Map<Actor,string>,uidOrigin:number){
 const known=new Map<object,number>();let next=0;
 const clean=(value:unknown):unknown=>{
  if(value===undefined)return{$undefined:1};if(typeof value==='number'&&!Number.isFinite(value))return{$number:String(value)};
  if(value===null||typeof value!=='object')return typeof value==='function'?'$function':value;
  if(value instanceof Actor)return{$actor:labels.get(value)??'unlabeled:'+value.defId};
  const ref=known.get(value);if(ref!==undefined)return{$ref:ref};known.set(value,next++);
  if(value instanceof Map)return{$map:[...value].map(([k,v])=>[clean(k),clean(v)])};if(value instanceof Set)return{$set:[...value].map(clean)};
  if(value instanceof WeakMap||value instanceof WeakSet)return{$weak:true};
  if(Array.isArray(value))return value.map(clean);
  return Object.fromEntries(Object.entries(value).filter(([,v])=>typeof v!=='function').map(([k,v])=>[k,k==='uid'&&typeof v==='number'?{itemUidOffset:v-uidOrigin}:clean(v)]));
 };
 const actors=world.actors.map((a,index)=>{if(!labels.has(a))labels.set(a,'born:'+index+':'+a.defId);return{label:labels.get(a),def:a.defId,team:a.team,owner:clean(a.owner),dead:a.dead,life:a.life,mana:a.mana,level:a.level,pos:{...a.pos},facing:a.facing,tier:a.tier,casting:clean(a.casting),statuses:clean(a.statuses),cooldowns:clean(a.cooldowns),cooldownTotals:clean(a.cooldownTotals),useLock:a.useLock,meta:clean(a.metaInsts),skills:a.skills.map(i=>i?{id:i.def.id,state:clean(i.state)}:null)};});
 const queues=Object.fromEntries(['projectiles','zones','pendingFollowUps','deathBursts','corpses','orbs','remnants','tethers','drops','flashes','texts'].map(name=>[name,clean(Reflect.get(world,name))]));
 return{actors,queues,objectiveDone:Reflect.get(world,'objectiveDone'),completed:[...world.completedObjectives],xp:world.meta.xp,level:world.player.level,ledger:clean(world.ledger),kills:Reflect.get(world,'kills'),slainLog:clean(Reflect.get(world,'slainLog'))};
}
export interface CombatCourse {name:string;skill:string;seconds:number;distance:number;lethal?:boolean;proc?:string;status?:string;objective?:boolean;}
export const NATIVE_COMBAT_COURSES:readonly CombatCourse[]=[
 {name:'native melee cast through hit',skill:'cleave',seconds:2,distance:35},
 {name:'native projectile cast and impact',skill:'fireball',seconds:3,distance:140},
 {name:'native ground cast and delayed pulse',skill:'earthquake',seconds:3,distance:30},
 {name:'native summon cast and actual insertion',skill:'summon_skeleton',seconds:2,distance:35},
 {name:'native construct cast and actual insertion',skill:'flame_totem',seconds:2,distance:100},
 {name:'native on-hit proc and recursive hit',skill:'cleave',seconds:2,distance:35,proc:'brutal_strike'},
 {name:'native projectile status application',skill:'firebolt',seconds:3,distance:140,status:'burn'},
 {name:'native death to actual clear-objective completion',skill:'cleave',seconds:2,distance:35,lethal:true,objective:true},
 {name:'native melee hit through death and rewards',skill:'cleave',seconds:2,distance:35,lethal:true},
];
export function ordinaryWorldCourse(course:CombatCourse,seed:number){
 return withSeededRandom(seed,()=>{
  const world=makeSimWorld('warrior',seed),caster=world.createMonster('skeleton_warrior',12,'player'),target=world.createMonster('skeleton_warrior',12,'enemy');
  caster.pos=vec(700,600);target.pos=vec(caster.pos.x+course.distance,600);world.player.pos=vec(200,200);
  caster.facing=0;caster.sheet.setSource('controlled combat proof budget',[mod('maxMana','flat',10000),mod('strength','flat',200),mod('dexterity','flat',200),mod('intelligence','flat',200)]);caster.mana=caster.maxMana();
  if(course.proc)caster.sheet.setSource('controlled installed proc chance',[mod('proc_'+course.proc,'flat',100)]);
  if(course.status)caster.sheet.setSource('controlled installed ailment chance',[mod('apply_'+course.status,'flat',1)]);
  if(course.objective)world.zone.objective={kind:'clear'};
  target.life=course.lethal?1:target.maxLife();world.actors.push(caster,target);
  const inst=makeSkillInstance(SKILLS[course.skill],12);caster.skills=[inst];
  const labels=new Map<Actor,string>([[world.player,'hero'],[caster,'caster'],[target,'target']]);
  const initialLife=target.life,trace:string[]=[],descriptors=new Map<string,PropertyDescriptor|undefined>();
  for(const name of ['executeSkill','resolveHit','kill','spawnProjectile','spawnMinion','spawnConstruct','executeProc']){
   descriptors.set(name,Object.getOwnPropertyDescriptor(world,name));const original=Reflect.get(world,name) as (...xs:unknown[])=>unknown;
   Object.defineProperty(world,name,{configurable:true,value:function(...args:unknown[]){trace.push(name);return Reflect.apply(original,world,args);}});
  }
  // Item UIDs are a process-global monotonic counter. Compare exact offsets and
  // allocation count from a native sentinel, not absolute process ordinals.
  const uidOrigin=nextItemUid();
  const result=countedCombatRandom(seed^0x44cc,()=>{
   const accepted=world.useSkill(caster,inst,{...target.pos});assert.equal(accepted,true,course.name+' is accepted by native NPC casting');
   const started=!!caster.casting;
   for(let i=0;i<Math.ceil(course.seconds*60);i++){
    const dt=1/60;world.time+=dt;
    worldMethod(world,'updateCasting',[caster,dt]);
    worldMethod(world,'updateProjectiles',[dt]);worldMethod(world,'updateZones',[dt]);
    worldMethod(world,'updateFollowUps',[dt]);worldMethod(world,'updateDeathBursts',[dt]);
   }
   if(course.objective)worldMethod(world,'updateObjective',[1/60]);
   assert.ok(trace.includes('executeSkill'),course.name+' reaches execution');
   if(course.proc)assert.ok(trace.includes('executeProc'),course.name+' reaches actual native proc');
   if(course.status)assert.ok(target.statuses.some(s=>s.id===course.status),course.name+' applies actual native status');
   if(course.objective){assert.equal(Reflect.get(world,'objectiveDone'),true);assert.ok(world.completedObjectives.has(world.zone.id));}
   if(course.skill==='cleave'||course.skill==='fireball'||course.skill==='earthquake')assert.ok(target.life<initialLife||target.dead,course.name+' reaches a real hit');
   if(course.lethal){assert.equal(target.dead,true);assert.ok(trace.includes('kill'));}
   if(course.skill==='summon_skeleton')assert.ok(world.actors.some(a=>a.owner===caster),'actual summoned body enters native census');
   if(course.skill==='flame_totem')assert.ok(world.actors.some(a=>a.owner===caster&&a.construct),'actual construct enters native census');
   return{accepted,started,trace,projection:combatProjection(world,labels,uidOrigin),itemAllocations:nextItemUid()-uidOrigin-1};
  });
  for(const[name,d]of descriptors){if(d)Object.defineProperty(world,name,d);else Reflect.deleteProperty(world,name);}
  return result;
 });
}
export function writeCombatProof(name:string,value:unknown){const dir=new URL('./reports/',import.meta.url);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(new URL(name,dir),JSON.stringify(value,null,2)+'\n');}
function oracleDevelopment(){
 const receipts=NATIVE_COMBAT_COURSES.map((c,index)=>{const a=ordinaryWorldCourse(c,44001+index),b=ordinaryWorldCourse(c,44001+index);assert.deepEqual(b,a,'ordinary oracle repeat '+c.name);console.log('PASS oracle '+c.name);return{name:c.name,...a};});
 const report={mode:'ordinary World oracle development only; no retained acceptance',pin:COMBAT_PROOF_PIN,phase43:COMBAT_PROOF_OVERLAY,catalog:combatCatalog(),courses:receipts.length,receipts,receipt:combatHash(JSON.stringify(receipts))};
 writeCombatProof('native-combat-oracle-development.json',report);console.log(JSON.stringify({mode:report.mode,courses:report.courses,receipt:report.receipt}));
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){if(process.argv.includes('--oracle-development'))oracleDevelopment();else throw Error('Actual aggregate API is still being authored; oracle-only success is not retained combat acceptance');}
