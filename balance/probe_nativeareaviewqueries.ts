import {townStationFeatures} from '../src/data/townBuild';
import {counterZoneOf,COUNTER_SITES} from '../src/net/journalWire';
import {World} from '../src/engine/world';
import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {NATIVE_AREA_VIEW_QUERIES} from '../src/worldmass/nativeAreaViewQueries';
import type {NativeAreaSceneOngoing} from '../src/worldmass/nativeAreaSceneOngoing';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
const result=withSeededRandom(45121,()=>{
 const setup=nativeCampaignFixture(45121),defB=mintAdditionalNativeArea(setup),townId=setup.writer.zone.id;
 // Establish the genuine fully unlocked bootstrap layout before retained ownership.
 for(const feature of townStationFeatures())setup.writer.account.features.add(feature);setup.writer['refoldTownStations']();
 return refuseWorldCombat([setup.writer],calls=>{
  const {writer,coordinator,ongoing:a}=birthActualNativeArea(setup),hero=writer.localSeat.actor,inst=hero.skills.find(s=>s)!;assert.ok(inst);
  const queryCalls:{area:string;queries:number;chests:number;exits:number}[]=[];
  const run=(area:NativeAreaSceneOngoing)=>{
   if(!area.assembly.input.physical.input.state.drops.length)area.assembly.lootController.dropGemAt(hero.pos,undefined,true);
   const args:Record<string,unknown[]>={emergeOf:[hero],movementLocked:[hero],doodadFamilyRev:['tree'],lineOfSight:[hero.pos,hero.pos],sightClipD:[hero.pos,hero.pos],doodadsNear:[hero.pos.x,hero.pos.y,100],roofedStructureAt:[hero.pos],dropHolder:[area.assembly.input.physical.input.state.drops[0]],publishViewFrame:[123,456,789,654],seatModeDef:[writer.localSeat],seatStageDef:[writer.localSeat],bossBarInfo:[hero],survivalRowVisible:['life'],sameSeatParty:[writer.localSeat.id,writer.localSeat.id],seatIdOfActor:[hero],pingVisibleTo:[writer.localSeat.id,{seat:writer.localSeat.id,pos:hero.pos,tier:hero.tier??0,at:writer.time,until:writer.time+1}],isPressingFoe:[hero,hero.pos],slotFaceOf:[hero,inst],selfStacksOf:[inst],unleashSealsOf:[hero,inst],grantedPocketsFor:[hero],throngBodiesOf:[hero,inst.def.id],memorySecondaryRefusal:[inst.def.id],minionsOfSkill:[hero,inst.def.id],spoilStoryAt:[hero.pos],skillUsable:[hero,inst],levelAt:[hero.pos],finishNpcDialogue:[hero.id],npcDialogueReachable:[hero.id]};
   const chests=area.assembly.input.physical.input.state.chests,exits=area.assembly.input.geometry.exits;
   if(chests.length)args.chestObjectiveDone=[chests[0]];if(exits.length)args.isExitLocked=[exits[0]];
   let count=0;for(const key of NATIVE_AREA_VIEW_QUERIES){if((key==='chestObjectiveDone'&&!chests.length)||(key==='isExitLocked'&&!exits.length))continue;try{Reflect.apply(writer[key],writer,args[key]??[]);count++;}catch(error){throw new Error('Query '+key+' in '+area.combat.scene.zone.id,{cause:error});}}
   assert.deepEqual(area.combat.runtimeState.viewFrame,{x:123,y:456,w:789,h:654});assert.equal(area.combat.runtimeState.viewFrameAt,writer.time);
   area.assembly.input.geometry.markDoodadsChanged();
   const originalGeyser=area.combat.runtimeState.motion.geyserMode;area.combat.runtimeState.motion.geyserMode='solo';assert.equal(writer.geyserMode,'solo');writer.geyserMode='bands';assert.equal(area.combat.runtimeState.motion.geyserMode,'bands');area.combat.runtimeState.motion.geyserMode=originalGeyser;
   assert.equal(writer.pendingAmbushes,area.combat.runtimeState.pendingAmbushes);assert.equal(writer.geyserMode,area.combat.runtimeState.motion.geyserMode);assert.equal(writer.doodadRev,area.assembly.input.geometry.doodadsRev);
   assert.equal(writer.deathBurstsView(),area.combat.killAftermath.input.state.deathBursts);assert.deepEqual(writer.couchHeroes(),[hero]);assert.equal(writer.npcDialogues,area.assembly.input.residents.npcDialogues);
   queryCalls.push({area:area.combat.scene.zone.id,queries:count,chests:chests.length,exits:exits.length});
  };
  run(a);const sourceFrame=a.combat.runtimeState.viewFrame,selected=writer.publishViewFrame,sourceMemory=a.assembly.input.residents.speechMemory;
  const nativeQuery=a.combat.queryView;let selectedCalls=0,shadowCalls=0;
  const forwarding:typeof nativeQuery=function(this:typeof a.combat,...args){assert.equal(this,a.combat);selectedCalls++;return Reflect.apply(nativeQuery,this,args);};Object.defineProperty(forwarding,'apply',{value:()=>{shadowCalls++;throw Error('Own apply shadow must not run');}});
  a.combat.queryView=forwarding;const captured=writer.objectiveText;a.combat.queryView=nativeQuery;captured();assert.equal(selectedCalls,1);assert.equal(shadowCalls,0);
  coordinator.runFrom(a,()=>coordinator.loadZone(defB.id,a.combat.scene.zone.id));const b=coordinator.published;run(b);
  assert.notEqual(b.combat.runtimeState.viewFrame,sourceFrame);assert.equal(a.combat.runtimeState.viewFrame,sourceFrame);assert.equal(a.assembly.input.residents.speechMemory,sourceMemory);
  assert.throws(()=>selected(1,2,3,4),/published physical area/);assert.deepEqual(sourceFrame,{x:123,y:456,w:789,h:654});
  const foreign=a.combat.scene.actors.find(x=>x!==hero)!;assert.ok(foreign);assert.throws(()=>writer.bossBarInfo(foreign),/Native combat needs actual local subject authority/);assert.throws(()=>Reflect.apply(b.combat.queryView,b.combat,['kill',hero]),/published physical area/);
  const obj=b.assembly.input.objectives,prior={done:obj.objectiveDone,lost:obj.objectiveLost,latch:obj.objectiveLatch};obj.objectiveDone=true;obj.objectiveLost=false;obj.objectiveLatch=null;assert.equal(writer.objectiveText(),'Cleared');obj.objectiveDone=prior.done;obj.objectiveLost=prior.lost;obj.objectiveLatch=prior.latch;
  const director=b.assembly.input.residents.npcDialogues,refresh=director.refreshAppearances,sentinel=Error('actual dialogue view failure');director.refreshAppearances=()=>{throw sentinel;};assert.throws(()=>writer.npcSpeechView(),error=>error===sentinel);director.refreshAppearances=refresh;
  coordinator.runFrom(b,()=>coordinator.loadZone(townId,defB.id));const town=coordinator.published;run(town);assert.ok(town.assembly.input.geometry.structures.length);
  const stationPrototype=Object.getOwnPropertyDescriptor(World.prototype,'stationAnchor')!,oldTier=writer['townTierIdx'];let keeperAnchors=0;const selectedStation=writer.stationAnchor;
  Object.defineProperty(World.prototype,'stationAnchor',{...stationPrototype,value:()=>{throw Error('World station layout fallback');}});writer.localSeat.keeper={reviveSec:8};writer['townTierIdx']=999;
  try{const row=counterZoneOf(writer);keeperAnchors=row.anchors!.length;assert.ok(keeperAnchors>0,'actual town anchors serialize for keeper');for(const site of COUNTER_SITES){const anchor=writer.stationAnchor(site);if(anchor)assert.ok(town.assembly.input.geometry.doodads.includes(anchor.doodad));}}finally{Object.defineProperty(World.prototype,'stationAnchor',stationPrototype);delete writer.localSeat.keeper;writer['townTierIdx']=oldTier;}
  const anchorBefore=selectedStation('campfire');assert.ok(anchorBefore);
  coordinator.runFrom(town,()=>coordinator.loadZone(a.combat.scene.zone.id,townId));run(a);assert.deepEqual(selectedStation('campfire'),anchorBefore,'empty retained town keeps its actor-independent layout query');selected(9,8,7,6);assert.equal(a.combat.runtimeState.viewFrame,sourceFrame);assert.deepEqual(sourceFrame,{x:9,y:8,w:7,h:6});
  return{queryCalls,selectedCalls,shadowCalls,keeperAnchors,worldDrivers:calls};
 });
});
const report={mode:'Actual published retained renderer query closure across generated A/B, authored Lastlight and revisit; main activation and full browser rendering remain separate.',result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-area-view-queries.json',report);console.log(JSON.stringify(report));
