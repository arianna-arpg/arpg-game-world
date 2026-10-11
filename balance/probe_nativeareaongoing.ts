import {mod} from '../src/engine/stats';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {STATUS_RELAYS,relayStatusStat} from '../src/engine/reception';
/** Actual full birth -> admitted quest/progression/objective composition.
 * Combat death and movement remain explicit native-World test boundaries. */
import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES,PROGRESSION} from '../src/data/classes';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneOngoing,freshAreaOngoingState,type NativeAreaOngoingRuntime} from '../src/worldmass/nativeAreaSceneOngoing';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {QUESTS} from '../src/quests/defs';
import {questDoneKey} from '../src/meta/account';
import {NullInput} from '../src/net/intent';
makeSimWorld('warrior',28031); // Install the existing native test environment.
for(const carried of [false,true])withSeededRandom(28031,()=>{
 const account=makeAccount(),w:any=new World(account,Object.freeze(buildManifest(account,991)));
 w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
 const flesh=w.player;
 if(carried){w.executeSkill(flesh,makeSkillInstance(SKILLS.form_of_the_dire_wolf,1),flesh.pos);assert.notEqual(w.player,flesh);assert.equal(w.localSeat.home,flesh);assert.equal(w.player.possession?.huskMode,'carried');}
 const reader=createNativeGeographyReader(captureNativeGeographySource(991));
 const mapping=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));
 const target={x:-55,y:160},request=mapping.ownerContext('ongoing-course',mapping.physicalAnchor(target));
 const z=placeZoneAt(target,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});w.zoneMap[z.id]=z;z.objective={kind:'clear'};
 const other=w.addSeat('neighbor',CLASSES.find(c=>c.id==='warrior')!,new NullInput(),{startingCompanions:false,startingFlasks:false});
 const raw:any=freshAssemblyInput(w,z),campaign:any=raw.campaign;
 // Campaign state stays live; no local census, physical store or controller is copied.
 for(const key of [...Object.keys(campaign),'ownQuestLedger','questLedgerOverride','questSeat','seatNoteAt','actingSeat','odyssey','mercSyncedLevel','timeflow','kills']){
  if(typeof w[key]==='function'||key==='massRuntime'||key==='nativeResidentHistory')continue;
  Object.defineProperty(campaign,key,{configurable:true,enumerable:true,get:()=>w[key],set:v=>{w[key]=v;}});
 }
 for(const key of ['notice','markMetaDirty','sameParty','seatHero','seatHudOf','seatOf','questLedgerOf','forechartSounding','invalidateZonesSaveMemo','presentWorlds','keeperCampaign','odysseyLeads'])campaign[key]=(...args:any[])=>w[key](...args);
 const authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign),states=freshAreaOngoingState(campaign.time);
 const combatNames=['kill','guardBash','executeSkill','burstDamage','guardArtHit','litePromoteNearest','companionPulseHit','useSkill','spawnConstruct','spawnProjectile','attackSequenceBurst','challengeBurst','challengeHit'];
 const combatFor=(assembly:any,progression:any)=>{const driver:any={scene:assembly.input.scene,state:progression.input.state};for(const name of combatNames)driver[name]=(...args:any[])=>(World.prototype as any)[name].apply(w,args);return driver;};
 const recipe={...raw,...states,authority,characterWriter:w,combatFor},run=new NativeAreaSceneOngoing(recipe);
 recipe.questState={...states.questState,scene:{foreign:true}} as any;recipe.campaign={...campaign};recipe.services={...raw.services,residents:{...raw.services.residents,scene:{foreign:true}}};
 assert.equal(run.assembly.input.residents.host.scene,states.questState.scene,'recipe rebinding cannot replace a retained provider');
 assert.equal(run.quests.input.progression,run.progression);assert.equal(run.watching.input.quests,run.quests);
 assert.equal(run.quests.input.scenePresence,run.assembly.scenePresence);assert.equal(run.assembly.lootController.input.scenePresence,run.assembly.scenePresence);assert.equal(run.assembly.objectiveController.input.scenePresence,run.assembly.scenePresence);
 assert.throws(()=>run.admit(run.assembly.input.scene.actors),/completed area birth/);assert.throws(()=>run.updateObjective(.1),/admitted attendance/);
 const session=run.assembly.sourceSession(mapping),placement=run.assembly.prepare(session,session.issue(z.id),{x:z.size.w/2,y:z.size.h/2},false);
 w.player.pos=run.assembly.input.geometry.clampPos({...placement.spawnAt??placement.entry},w.player.radius);run.assembly.birth();
 flesh.pos={...w.player.pos};
 const {scene}=run.assembly.input;assert.ok(scene.actors.length>1,'actual native content born');
 assert.throws(()=>run.admit(scene.actors.slice(1)),/exact physical census/);run.admit([...scene.actors]);assert.equal(run.assembly.scenePresence.active,true);authority.assertAdmitted(scene);
 // The neighbor is a real campaign player at identical local coordinates, owned elsewhere.
 other.actor.pos={...w.player.pos};const peerDef={...z,id:'ongoing-peer'};w.zoneMap[peerDef.id]=peerDef;
 const peerRaw=freshAssemblyInput(w,peerDef,campaign);peerRaw.initialActors=[w.player,other.actor];
 const peerArea=new NativeAreaSceneAssembly(peerRaw),peerScene=peerArea.input.scene;
 const peerSession=peerArea.sourceSession(mapping);peerArea.prepare(peerSession,peerSession.issue(peerDef.id),{...w.player.pos},false);peerArea.birth();
 // Native preparation borrows the campaign observer; admission removes it
 // before the actual neighbor takes physical attendance.
 peerScene.actors=peerScene.actors.filter(a=>a!==w.player);peerScene.player=other.actor;
 // The peer has its own actual reward owners. Combat/progression remain the
 // unselected recording boundary in this neighbor-exclusion course.
 const peer=authority.register(peerScene,{progression:run.progression,combat:{...run.combat,scene:peerScene},loot:peerArea.lootController,objective:peerArea.objectiveController});authority.claim(peer,peerScene.actors);peerArea.activatePresence(authority);
 assert.deepEqual(run.assembly.scenePresence.seats,[w.localSeat]);
 const foe=run.assembly.input.population.createMonster('zombie',1,'enemy');foe.pos={x:w.player.pos.x+15,y:w.player.pos.y};scene.actors.push(foe);authority.claim(run.binding,[foe]);
 const decoy=w.createMonster('zombie',1,'enemy');decoy.pos={...w.player.pos};w.actors.push(decoy);
 assert.equal(w.player.statusRelay,run.assembly.input.population.factory.relayStatus,'admission acquires relay before a level-up');
 assert.equal(flesh.statusRelay,run.assembly.input.population.factory.relayStatus,'the carried hero acquires the same local relay before a level-up');
 assert.equal(authority.require(flesh).scene,scene);if(carried)assert.equal(scene.actors.includes(flesh),false,'the carried hero is not a second physical body');
 flesh.sheet.setSource('admitted-relay',[mod(relayStatusStat('grounding'),'flat',1)]);const status=STATUS_RELAYS.grounding.status;flesh.applyStatus(status,8,1,'admission proof');assert.ok(foe.statuses.some(s=>s.id===status));assert.ok(!decoy.statuses.some((s:any)=>s.id===status),'old scene never receives newly admitted relay');
 const q=Object.values(QUESTS).find(q=>!q.turnIn&&!q.collect&&!q.reward.choices?.length&&!q.reward.skillChoice&&!q.reward.imbue&&q.reward.xp)!;
 const entry={questId:q.id,zoneId:z.id,fieldDone:false};w.activeQuests.push(entry);w.meta.xp=PROGRESSION.xpForLevel(flesh.level)-1;w.meta.xpNeeded=PROGRESSION.xpForLevel(flesh.level);
 const beforeLevel=flesh.level,beforePeer=other.meta.xp;
 // Controlled deed setup: this test proves completion routing, not area combat.
 for(const actor of scene.actors)if(actor.team==='enemy')actor.dead=true;
 run.updateObjective(.1);assert.ok(run.assembly.input.objectives.objectiveDone);assert.ok(w.completedObjectives.has(z.id));assert.ok(!w.activeQuests.includes(entry));assert.ok(w.ledger[questDoneKey(q.id)]>0);assert.ok(flesh.level>beforeLevel,'actual native rebuild follows XP threshold');assert.equal(other.meta.xp,beforePeer,'neighbor never receives local rewards');
 const xp=w.meta.xp,level=flesh.level;run.updateObjective(.1);assert.equal(w.meta.xp,xp);assert.equal(flesh.level,level);
 // One live script controller suppresses rescues through the shared area lifecycle.
 states.questState.scene={active:true} as any;assert.equal(run.assembly.input.residents.host.scene,states.questState.scene);
 console.log('PASS ongoing area '+(carried?'carried hero':'standing hero')+': full native birth, explicit admission, shared quest/progression/watch owners, native XP rebuild, quest receipt, neighbor exclusion and repeat completion');
});
