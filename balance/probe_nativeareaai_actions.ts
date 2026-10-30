import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {withSeededRandom} from '../src/core/rng';
import {ARENA_BOSS_PATTERNS} from '../src/data/arenaBosses';
import {MONSTERS} from '../src/data/monsters';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const names=['claimRingSlot','fallHazardAt','finalizeGarrison','fleeIntoRefuge','garrisonSlotById','losCached','lureFor','onFleeArrive','pathProfileFor','pressUsable','recentTierCrossing','requestEngage','sanctuaryRetreat','seekLoot','seekPrey','tierLinkToward','onBeastEscape','comboQueuedStep','tierLinkSeats'];
const result=withSeededRandom(46139,()=>{const setup=nativeCampaignFixture(),saved=new Map<string,PropertyDescriptor>(),drivers:string[]=[];for(const name of names){const d=Object.getOwnPropertyDescriptor(World.prototype,name);assert(d);saved.set(name,d);Object.defineProperty(World.prototype,name,{...d,value(){drivers.push(name);throw Error('World AI provider used '+name);}});}try{return refuseWorldCombat([setup.writer],worldDrivers=>{
 const {ongoing:a,coordinator,authority}=birthActualNativeArea(setup),combat=a.combat,scene=a.assembly.input.scene,hero=setup.writer.player;
 const source=scene.actors.find(x=>x.team==='enemy'&&!x.passive&&!x.dead&&!x.construct&&!x.owner);assert(source);
 source.ambushArmed=false;source.emergeUntil=undefined;source.aiAwakened=true;source.burrow=undefined;source.leap=undefined;source.aiScriptIdx=-1;
 source.brain={type:'basic',script:[{onEnter:[{do:'summon',monster:'skeleton_warrior',count:2,ring:12},{do:'summon',monster:'charnel_glutton',count:1,ring:12},{do:'summon',monster:'goblin_skirmisher',count:1,ring:12},{do:'attackPattern',skill:'arena_boss_bass',pattern:ARENA_BOSS_PATTERNS.bass,at:'anchor',bearing:0}]}]};
 const prior=new Set(scene.actors),zonesBefore=new Set(combat.state.zones);
 coordinator.runFrom(a,()=>combat.updateAIActor(source,1/60));
 const born=scene.actors.filter(x=>!prior.has(x));assert.equal(born.length,4);for(const body of born)assert.equal(authority.require(body).combat,combat);
 const zones=combat.state.zones.filter(z=>!zonesBefore.has(z));assert(zones.length>0,'installed attack pattern emits actual zones');assert(zones.every(z=>z.caster===source&&z.inst.def.id==='arena_boss_bass'));
 coordinator.runFrom(a,()=>combat.updateZones(2));assert(zones.every(z=>z.exploded||!combat.state.zones.includes(z)),'all native attack marks consumed');
 const skeleton=born.find(x=>x.defId==='skeleton_warrior')!,second=born.filter(x=>x.defId==='skeleton_warrior')[1];
 coordinator.runFrom(a,()=>combat.updateAIActor(skeleton,1/60));assert(skeleton.aiAnchor);
 let angle1=0,angle2=0;coordinator.runFrom(a,()=>{angle1=combat.ai.claimRingSlot(skeleton,source,2);angle2=combat.ai.claimRingSlot(second,source,2);assert.notEqual(angle1,angle2);const claims=combat.runtimeState.frame.ringClaims.get(source.id);assert.equal(claims?.length,2);assert.equal(combat.ai.losCached(source,skeleton),combat.ai.losCached(source,skeleton));assert(combat.ai.losMemo.size>0);});
 const ghoul=born.find(x=>x.defId==='charnel_glutton')!,meal=born.find(x=>x.defId==='goblin_skirmisher')!;assert(MONSTERS[ghoul.defId!].carrion);meal.noBounty=false;meal.pos={...ghoul.pos};
 coordinator.runFrom(a,()=>combat.kill(meal));const corpse=combat.runtimeState.corpses.find(c=>c.defId===meal.defId);assert(corpse,'actual native kill issues meal row');
 ghoul.life=ghoul.maxLife()/3;ghoul.brain={type:'basic'};ghoul.aiTargetId=undefined;ghoul.aggroed=false;ghoul.threat.clear();
 // The feeder uses its native basic behavior and actual installed carrion definition.
 const life=ghoul.life;coordinator.runFrom(a,()=>combat.updateAIActor(ghoul,4));assert(ghoul.life>life,'actual native carrion heals');assert(!combat.runtimeState.corpses.includes(corpse),'native meal consumed');
 const forged={...corpse,pos:{...ghoul.pos}},before=ghoul.life;combat.runtimeState.corpses.push(forged);assert.throws(()=>coordinator.runFrom(a,()=>combat.updateAIActor(ghoul,1)),/record|issued|selected|nominal/);assert.equal(ghoul.life,before);assert(combat.runtimeState.corpses.includes(forged));combat.runtimeState.corpses.splice(combat.runtimeState.corpses.indexOf(forged),1);
 const flashes=a.assembly.input.geometry.flashes.length;coordinator.runFrom(a,()=>combat.ai.fleeIntoRefuge(second,{...second.pos}));assert(!scene.actors.includes(second));assert.throws(()=>authority.require(second));authority.assertUnclaimed(second);assert(a.assembly.input.geometry.flashes.length>flashes);assert.throws(()=>coordinator.runFrom(a,()=>combat.updateAIActor(second,1/60)));assert.equal(scene.player,hero);

 const partialError=Error('native selected push failure'),queue=combat.state.zones,nativePush=queue.push;let selectedPush=0;
 Object.defineProperty(queue,'push',{configurable:true,value:function(this:typeof queue,...rows:typeof queue){assert.equal(this,queue);selectedPush++;Reflect.apply(nativePush,this,rows);throw partialError;}});
 source.aiScriptIdx=-1;source.brain={type:'basic',script:[{onEnter:[{do:'attackPattern',skill:'arena_boss_bass',pattern:ARENA_BOSS_PATTERNS.bass,at:'anchor',bearing:0}]}]};const qBefore=queue.length;
 try{assert.throws(()=>coordinator.runFrom(a,()=>combat.updateAIActor(source,1/60)),e=>e===partialError);}finally{Reflect.deleteProperty(queue,'push');}
 assert.equal(selectedPush,1);assert.equal(queue.length,qBefore+1);const unissued=queue.at(-1)!,delay=unissued.delay;assert.throws(()=>coordinator.runFrom(a,()=>combat.updateZones(1)),/record|issued|nominal/);assert.equal(unissued.delay,delay);queue.splice(queue.indexOf(unissued),1);
 source.aiScriptIdx=-1;source.brain={type:'basic',script:[{onEnter:[{do:'attackPattern',skill:'arena_boss_bass',pattern:ARENA_BOSS_PATTERNS.bass,at:'anchor',bearing:0}]}]};coordinator.runFrom(a,()=>combat.updateAIActor(source,1/60));coordinator.runFrom(a,()=>combat.updateZones(2));
 const cueError=Error('native departure cue failure'),cues=a.assembly.input.geometry.flashes;Object.defineProperty(cues,'push',{configurable:true,value(){throw cueError;}});try{assert.throws(()=>coordinator.runFrom(a,()=>combat.ai.fleeIntoRefuge(skeleton,{...skeleton.pos})),e=>e===cueError);}finally{Reflect.deleteProperty(cues,'push');}assert(!scene.actors.includes(skeleton));authority.assertUnclaimed(skeleton);
 assert.deepEqual(drivers,[]);assert.deepEqual(worldDrivers,[]);return{born:born.map(x=>x.defId),patternZones:zones.length,ringSlotsDistinct:angle1!==angle2,mealConsumed:true,forgedMealRefused:true,retirementReleased:true,partialFailures:2,worldDrivers};
 });}finally{for(const[name,d]of saved)Object.defineProperty(World.prototype,name,d);}});
const report={scope:'Genuine native AI script actions, installed pattern, physical tactical slots, actual kill-issued carrion selection and retreat retirement. No World AI/combat driver.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-area-ai-actions.json',report);console.log(JSON.stringify(report));
