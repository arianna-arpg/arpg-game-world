/** Actual local population births and native retained drivers; identity admission
 * only. Movement/progression remain explicitly unavailable test boundaries. */
import assert from 'node:assert/strict';
import {Actor} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneBirthAdmission} from '../src/worldmass/nativeAreaSceneBirthAdmission';
import {NativeAreaSceneObjectiveWatching,freshSceneObjectiveWatchingState} from '../src/worldmass/nativeAreaSceneObjectiveWatching';
import {NativeAreaSceneQuests,freshSceneQuestState,type NativeSceneQuestRewardRuntime} from '../src/worldmass/nativeAreaSceneQuests';
import {sceneObjectiveServices} from '../src/worldmass/nativeSceneObjectives';
import {nativeBeaconConfig} from '../src/engine/beaconObjectives';
import {nativeProcessionConfig} from '../src/engine/processionObjectives';
import {QUESTS} from '../src/quests/defs';
import {newQuestLedger} from '../src/engine/questLedger';
let courses=0;
function fixture(){
 const w=makeSimWorld('warrior',92717);w.time=100;(w as any).questSeat=null;w.ownQuestLedger=newQuestLedger();w.ledger={};w.account.ledger={};
 const definition={...w.zone,id:'admission-area',level:1,objective:{kind:'clear'},packs:{table:[{id:'goblin_skirmisher',weight:1}],count:[1,1],size:[1,1]}} as typeof w.zone;
 w.zoneMap[definition.id]=definition;
 const raw=freshAssemblyInput(w,definition),campaign=raw.campaign as any;
 for(const key of [...Object.keys(campaign),'ownQuestLedger','questLedgerOverride','questSeat','seatNoteAt','accountDirty','actingSeat','odyssey']){
  if(typeof (w as any)[key]==='function'||key==='massRuntime'||key==='nativeResidentHistory')continue;
  Object.defineProperty(campaign,key,{configurable:true,enumerable:true,get(){return (w as any)[key];},set(v){(w as any)[key]=v;}});
 }
 for(const key of ['notice','markMetaDirty','sameParty','seatHero','seatHudOf','seatOf','questLedgerOf','forechartSounding','invalidateZonesSaveMemo','presentWorlds','keeperCampaign','odysseyLeads'])campaign[key]=(...args:any[])=>(w as any)[key](...args);
 const area=new NativeAreaSceneAssembly(raw),i=area.input,scene=i.scene,geometry=i.geometry;
 scene.player.pos={x:500,y:500};
 const authority=new NativeAreaActorAuthority<NativeSceneQuestRewardRuntime>(campaign),binding=authority.register(scene,{loot:area.lootController,objective:area.objectiveController});authority.claim(binding,scene.actors);area.scenePresence.activate(authority);
 const admission=new NativeAreaSceneBirthAdmission({authority,scene,population:i.population});
 const os=sceneObjectiveServices(i.population,i.objectives,{get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},notice:geometry.notice.bind(geometry),text:geometry.text.bind(geometry),pathField:geometry.pathField.bind(geometry),farPoint:geometry.farPoint.bind(geometry),pointInSolid:geometry.pointInSolid.bind(geometry),farthestStand:geometry.farthestStand.bind(geometry)});
 const watcher=new NativeAreaSceneObjectiveWatching({authority,scene,geometry,population:i.population,objectives:i.objectives,state:freshSceneObjectiveWatchingState(0),birthState:i.state,environment:i.environment,physical:i.physical,completion:area.objectiveController,loot:area.lootController,graph:area.graph,coast:i.coast,theater:i.theater,adoption:i.adoption,objectiveServices:os,campaign,quests:{nearestHand:()=>w.localSeat},movement:{moveActor(){throw Error('Test did not supply movement');}}});
 const quests=new NativeAreaSceneQuests({authority,scene,geometry,population:i.population,physical:i.physical,loot:area.lootController,bounty:i.bounty,graph:area.graph,coast:i.coast,runtimeBirth:i.registry.input.birth,campaign,state:freshSceneQuestState(),scenePresence:area.scenePresence,objective:area.objectiveController,progression:raw.services.objectiveProgression,interaction:geometry,characterWriter:w});
 const stone=()=>({pos:{x:500,y:500},doodad:{kind:'rift_tear',pos:{x:500,y:500},radius:20,tier:0},charge:0,recoup:0,pourAt:1});
 const rescue=()=>{const q=Object.values(QUESTS).find(q=>q.rescue)!;w.questLedgerOf(w.localSeat).active.push({questId:q.id,zoneId:scene.zone.id,fieldDone:false});return q;};
 function checkBirth(operation:()=>unknown,tag?:string){const before=new Set(scene.actors);const result=operation(),born=scene.actors.filter(a=>!before.has(a));assert.ok(born.length,'native operation must really insert bodies');for(const a of born){assert.equal(authority.require(a).scene,scene);if(tag)assert.equal(a.tag,tag);}authority.assertAdmitted(scene);return {result,born};}
 return {w,area,i,scene,geometry,campaign,authority,binding,admission,watcher,quests,stone,rescue,checkBirth};
}
function course(name:string,run:(f:ReturnType<typeof fixture>)=>void){run(fixture());courses++;console.log('PASS birth admission: '+name);}
course('direct native wave',f=>{f.scene.zone.objective={kind:'waves',waves:2};f.checkBirth(()=>f.watcher.spawnWave());});
course('direct native rift pour',f=>{f.scene.zone.objective={kind:'rifts',sealSec:5};f.i.objectives.rifts.push(f.stone());f.checkBirth(()=>f.watcher.updateRiftPours({kind:'rifts',sealSec:5}),'rift_born');});
course('delayed native beacon callback',f=>{const host=f.watcher.nativeBeaconHost(),cfg=nativeBeaconConfig({kind:'beacon'}).reinforce;assert.ok(cfg);f.checkBirth(()=>host.spawn(f.stone(),2,cfg,{native:[{id:'goblin_skirmisher',weight:1}],mix:[]}),'spire_drawn');});
course('native ambush nests body creation before insertion',f=>{const cfg=nativeProcessionConfig({kind:'procession'});f.checkBirth(()=>f.watcher.spawnProcessionAmbush(f.scene.player,0,2,cfg),'procession_robber');});
course('uninserted native body results stay unowned',f=>{const bodies=f.watcher.nativeProcessionBodies(f.scene.player,0,2,f.scene.zone,nativeProcessionConfig({kind:'procession'}),f.scene.zone.id);assert.equal(bodies.length,2);for(const body of bodies){assert.ok(!f.scene.actors.includes(body));assert.throws(()=>f.authority.require(body),/Missing/);}f.scene.actors.push(bodies[0]);assert.throws(()=>f.admission.run(()=>{}),/unowned or borrowed/);assert.throws(()=>f.authority.require(bodies[0]),/Missing/);});
course('native update nests direct wave admission',f=>{f.scene.zone.objective={kind:'waves',waves:2};f.i.objectives.waveTimer=0;f.checkBirth(()=>f.watcher.updateObjective(1));});
course('partial native callback errors keep exact inserted births admitted',f=>{
 const original=f.i.population.createMonster;let calls=0;
 f.i.population.createMonster=function(...args){assert.equal(this,f.i.population);if(++calls===2)throw Error('factory failed on second body');return original.apply(this,args);};
 const host=f.watcher.nativeBeaconHost(),cfg=nativeBeaconConfig({kind:'beacon'}).reinforce;assert.ok(cfg);const before=new Set(f.scene.actors);
 assert.throws(()=>host.spawn(f.stone(),3,cfg,{native:[{id:'goblin_skirmisher',weight:1}],mix:[]}),/factory failed/);
 const born=f.scene.actors.filter(a=>!before.has(a));assert.equal(born.length,1);assert.equal(f.authority.require(born[0]).scene,f.scene);f.authority.assertAdmitted(f.scene);
});
course('same-area nested controllers share recorded pending identities',f=>{
 f.rescue();const second=new NativeAreaSceneBirthAdmission({authority:f.authority,scene:f.scene,population:f.i.population});
 f.checkBirth(()=>f.admission.run(()=>{const body=f.admission.createMonster('goblin_skirmisher',1,'enemy');f.scene.actors.push(body);second.run(()=>{assert.equal(f.authority.require(body).scene,f.scene);f.quests.rescues.update();});}));
 assert.equal(f.scene.actors.filter(a=>a.tag?.startsWith('quest_rescue:')).length,1);
});
course('native hold completion callback can spawn through a nested controller',f=>{
 const stone=f.stone();f.geometry.doodads.push(stone.doodad);f.geometry.markDoodadsChanged();
 f.checkBirth(()=>f.watcher.driveHoldFixtures(2,{fixtures:[stone],need:1,transitKind:'rift',holdFallback:120,holdRadius:120,reach:'radius',contest:null,doneKind:'rift_tear_sealed',accent:'#fff',flareColor:'#fff',flareR:30,onFill(){f.watcher.spawnProcessionAmbush(f.scene.player,0,1,nativeProcessionConfig({kind:'procession'}));}}),'procession_robber');
 assert.equal(stone.charge,1);
});
course('rescue error after insertion still enrolls that actual NPC',f=>{
 f.rescue();const original=f.i.population.createMonster;let born:Actor|undefined;
 f.i.population.createMonster=function(...args){born=original.apply(this,args);const name=born.name;Object.defineProperty(born,'name',{get:()=>name,set(){throw Error('rescue dressing failed');},configurable:true});return born;};
 assert.throws(()=>f.quests.rescues.update(),/rescue dressing failed/);assert.ok(born);assert.ok(f.scene.actors.includes(born));assert.equal(f.authority.require(born).scene,f.scene);f.authority.assertAdmitted(f.scene);
});
course('native rescues enroll once and keep the original NPC on later updates',f=>{const q=f.rescue(),first=f.checkBirth(()=>f.quests.rescues.update(),'quest_rescue:'+q.id).born[0];const before=f.scene.actors.length;f.quests.rescues.update();assert.equal(f.scene.actors.length,before);assert.equal(f.scene.actors.find(a=>a.tag==='quest_rescue:'+q.id),first);});
course('preexisting borrowed census refuses before native factory mutation',f=>{
 const foreign=new Actor('foreign','enemy',{...f.scene.player.pos});foreign.id=f.scene.player.id;
 const other={zone:{...f.scene.zone,id:'other'},actors:[foreign],player:foreign},binding=f.authority.register(other,f.binding.services);f.authority.claim(binding,[foreign]);f.scene.actors.push(foreign);
 const count=f.scene.actors.length,wave=f.i.objectives.wave;assert.throws(()=>f.watcher.spawnWave(),/unowned or borrowed/);assert.equal(f.scene.actors.length,count);assert.equal(f.i.objectives.wave,wave);assert.equal(f.authority.require(foreign).scene,other);
 const host=f.watcher.nativeBeaconHost(),cfg=nativeBeaconConfig({kind:'beacon'}).reinforce;assert.ok(cfg);assert.throws(()=>host.spawn(f.stone(),1,cfg,{native:[{id:'goblin_skirmisher',weight:1}],mix:[]}),/unowned or borrowed/);
 f.rescue();assert.throws(()=>f.quests.rescues.update(),/unowned or borrowed/);assert.equal(f.scene.actors.length,count);
});
course('arbitrary insertion is never swept into authority',f=>{
 const rogue=f.i.population.createMonster('goblin_skirmisher',1,'enemy');
 assert.throws(()=>f.admission.run(()=>{f.scene.actors.push(rogue);}),/unowned or borrowed/);assert.throws(()=>f.authority.require(rogue),/Missing/);
 f.scene.actors=f.scene.actors.filter(a=>a!==rogue);f.checkBirth(()=>f.watcher.spawnProcessionAmbush(f.scene.player,0,1,nativeProcessionConfig({kind:'procession'})));
});
course('factory scope and exact identities are mandatory',f=>{
 assert.throws(()=>f.admission.createMonster('goblin_skirmisher',1,'enemy'),/active admission/);
 assert.throws(()=>new NativeAreaSceneBirthAdmission({authority:new NativeAreaActorAuthority({seats:[]}),scene:f.scene,population:f.i.population}),/identical campaign/);
 assert.throws(()=>new NativeAreaSceneQuests({...f.quests.input,authority:new NativeAreaActorAuthority<NativeSceneQuestRewardRuntime>({seats:[]})}),/identical campaign authority/);
 assert.throws(()=>new NativeAreaSceneBirthAdmission({authority:f.authority,scene:{...f.scene},population:f.i.population}),/identical population census/);
 const authority=new NativeAreaActorAuthority<object>(f.campaign),unregistered=new NativeAreaSceneBirthAdmission({authority,scene:f.scene,population:f.i.population});let called=false;assert.throws(()=>unregistered.run(()=>{called=true;}),/Unregistered/);assert.equal(called,false);
});
course('rescue attendance cannot follow a player transferred to another area',f=>{
 f.rescue();const player=f.scene.player,other={zone:{...f.scene.zone,id:'other'},actors:[player],player},binding=f.authority.register(other,f.binding.services);f.scene.actors=f.scene.actors.filter(a=>a!==player);f.authority.transfer(player,f.binding,binding);
 assert.throws(()=>f.quests.rescues.update(),/present area player/);assert.equal(f.scene.actors.length,0);f.authority.assertAdmitted(f.scene);
});
course('retired controller does not attach itself to a replacement binding',f=>{
 f.admission.run(()=>{});f.authority.release(f.binding,[...f.scene.actors]);f.authority.unregister(f.binding);const next=f.authority.register(f.scene,f.binding.services);f.authority.claim(next,f.scene.actors);assert.throws(()=>f.admission.run(()=>{}),/retired authority/);
});
console.log('PASS retained birth admission: '+courses+' real population/driver and adversarial identity courses');
