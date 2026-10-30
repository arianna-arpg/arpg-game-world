import {ownNativeRewardStorage} from './nativeAreaSceneRewardStorage';
/** Actual retained native reward sink. Rendering, pickup and combat dispatch remain external. */
import type {World} from '../engine/world';
import type {NativeSceneCensus} from './nativeAreaScenePopulation';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
import type {NativeAreaScenePhysical} from './nativeAreaScenePhysical';
import type {NativeAreaSceneSettlement} from './nativeAreaSceneSettlement';
import {gemFloorFor} from '../engine/loot';
import * as native from '../engine/nativeSceneLoot';
export type NativeSceneLootCampaign=Pick<native.NativeSceneLootHost,
 'account'|'accountDirty'|'time'|'dropRuleOf'|'questSeat'|'metaProgressionActive'|'questHand'|'sameParty'|'seatHero'>;
export interface NativeSceneLootState {spoilStory:World['spoilStory'];orbs:World['orbs']}
export function freshSceneLootState():NativeSceneLootState{return {spoilStory:undefined,orbs:[]};}
export interface NativeSceneLootInput {
 scenePresence:{readonly scene:NativeSceneCensus;readonly seats:World['seats']};
 scene:NativeSceneCensus;geometry:NativeAreaSceneGeometry;physical:NativeAreaScenePhysical;
 settlement:NativeAreaSceneSettlement;campaign:NativeSceneLootCampaign;state:NativeSceneLootState;
}
export class NativeAreaSceneLoot {
 readonly input:NativeSceneLootInput;
 readonly host:native.NativeSceneLootHost;
 constructor(raw:NativeSceneLootInput){
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','physical','settlement','campaign','state','scenePresence']){
   const d=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object')throw Error('Native loot requires an own object binding: '+key);
   bindings[key]=d.value;
  }
  const input:NativeSceneLootInput=this.input=Object.freeze(bindings),host={} as native.NativeSceneLootHost,self=this;
  if(input.scenePresence.scene!==input.scene||input.geometry.state!==input.scene||input.physical.input.scene!==input.scene||input.physical.input.geometry!==input.geometry
   ||input.settlement.input.scene!==input.scene||input.settlement.input.geometry!==input.geometry
   ||input.physical.input.settlement!==input.settlement||(input.physical.input.campaign as object)!==input.campaign||(input.settlement.input.campaign as object)!==input.campaign)
   throw Error('Native loot requires identical scene, geometry, physical, settlement and campaign owners');
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(value){(provider() as Record<string,unknown>)[key]=value;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];
   if(typeof fn!=='function')throw Error('Missing native loot capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.scene,['zone']);fields(()=>input.geometry,['flashes']);
  // Native memory restoration replaces this array; the sink follows that exact owner.
  fields(()=>input.physical.input.state,['drops']);fields(()=>input.state,['spoilStory','orbs']);
  fields(()=>input.campaign,['account','accountDirty','time','questSeat']);
  Object.defineProperty(host,'seats',{enumerable:true,get:()=>input.scenePresence.seats});
  Object.defineProperty(host,'dropRuleOf',{enumerable:true,get(){const fn=input.campaign.dropRuleOf;
   return fn?(...args:Parameters<NonNullable<native.NativeSceneLootHost['dropRuleOf']>>)=>fn.apply(input.campaign,args):fn;
  },set(value){input.campaign.dropRuleOf=value;}});
  methods(()=>input.campaign,['metaProgressionActive','questHand','sameParty','seatHero']);
  methods(()=>input.geometry,['clampPos']);methods(()=>input.settlement,['rollSkillGem','rollSupportDropGated']);
  methods(()=>self,["dropEssenceAt","dropAbilityEssenceAt","dropVestigeAt","dropGearAt","lootDropCue","spoilClamp","ownSpoils","dropGemAt","mintGemAt","dropPinnedGem","dropMemoryUnit","mintLootResult","shedOrb","noteContainerFind","noteGemDrop","spoilsSealed","zoneGemFloor","lootLevelAt"]);
  this.host=Object.freeze(host);
  ownNativeRewardStorage(input.state,['orbs']);
  for(const key of ['input','host'])Object.defineProperty(this,key,{writable:false,configurable:false});
 }
 /** Full native areas use their own authored level; explicit contextZone still overrides at the mint. */
 lootLevelAt:World['lootLevelAt']=(_at)=>this.input.scene.zone.level;
 zoneGemFloor:World['zoneGemFloor']=()=>gemFloorFor(this.input.scene.zone.tileset);
 spoilsSealed:World['spoilsSealed']=()=>this.input.scene.zone.spoils==='none';
 dropEssenceAt:World['dropEssenceAt']=(...args)=>native.sceneDropEssenceAt(this.host,...args);
 dropAbilityEssenceAt:World['dropAbilityEssenceAt']=(...args)=>native.sceneDropAbilityEssenceAt(this.host,...args);
 dropVestigeAt:World['dropVestigeAt']=(...args)=>native.sceneDropVestigeAt(this.host,...args);
 dropGearAt:World['dropGearAt']=(...args)=>native.sceneDropGearAt(this.host,...args);
 lootDropCue:World['lootDropCue']=(...args)=>native.sceneLootDropCue(this.host,...args);
 spoilClamp:World['spoilClamp']=(...args)=>native.sceneSpoilClamp(this.host,...args);
 ownSpoils:World['ownSpoils']=(...args)=>native.sceneOwnSpoils(this.host,...args);
 dropGemAt:World['dropGemAt']=(...args)=>native.sceneDropGemAt(this.host,...args);
 mintGemAt:World['mintGemAt']=(...args)=>native.sceneMintGemAt(this.host,...args);
 dropPinnedGem:World['dropPinnedGem']=(...args)=>native.sceneDropPinnedGem(this.host,...args);
 dropMemoryUnit:World['dropMemoryUnit']=(...args)=>native.sceneDropMemoryUnit(this.host,...args);
 noteGemDrop:World['noteGemDrop']=(...args)=>native.sceneNoteGemDrop(this.host,...args);
 noteContainerFind:World['noteContainerFind']=(...args)=>native.sceneNoteContainerFind(this.host,...args);
 mintLootResult:World['mintLootResult']=(...args)=>native.sceneMintLootResult(this.host,...args);
 shedOrb:World['shedOrb']=(...args)=>native.sceneShedOrb(this.host,...args);
}
