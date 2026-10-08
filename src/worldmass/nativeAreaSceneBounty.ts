/** Native bounty-generated site and entry owner. Campaign ledgers remain shared;
 * scene census, geometry and harvest collections belong to this actual area. */
import type { World } from '../engine/world';
import type { NativeSceneCensus, NativeAreaScenePopulation } from '../worldmass/nativeAreaScenePopulation';
import type { NativeAreaSceneEnvironment } from '../worldmass/nativeAreaSceneEnvironment';
import * as native from '../engine/nativeSceneBounty';
export type NativeSceneBountyGeometry=Pick<native.NativeSceneBountyHost,'currentZoneSeed'|'doodads'|'interactSpot'|'clampPos'|'markDoodadsChanged'>;
export type NativeSceneBountyCampaign=Pick<native.NativeSceneBountyHost,
 'bountyHands'|'activeQuests'|'charDirty'|'clientActionHook'|'zoneMap'|'visited'|'ledger'|'sim'|'massRuntime'|'completedObjectives'|'notice'>;
export interface NativeSceneBountyInput {
 scene:NativeSceneCensus; geometry:NativeSceneBountyGeometry; population:NativeAreaScenePopulation;
 environment:NativeAreaSceneEnvironment; campaign:NativeSceneBountyCampaign;
 objectives:Pick<native.NativeSceneBountyHost,'spawnPoint'|'countedEnemies'>;
}
/** These operations allocate no separate quest ledger and reset no campaign
 * flags. The real run's accepted postings, active quests and dirty bit are live. */
export class NativeAreaSceneBounty {
 readonly input:NativeSceneBountyInput; readonly host:native.NativeSceneBountyHost;
 constructor(raw:NativeSceneBountyInput) {
  const bindings=Object.create(null);
  for(const key of ['scene','geometry','population','environment','campaign','objectives']){
   const descriptor=raw&&Object.getOwnPropertyDescriptor(raw,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.value||typeof descriptor.value!=='object')
    throw Error('Native bounty needs own object binding: '+key);
   bindings[key]=descriptor.value;
  }
  const input:NativeSceneBountyInput=this.input=Object.freeze(bindings),host={} as native.NativeSceneBountyHost,self=this;
  if(input.population.input.scene!==input.scene||(input.population.input.geometry as object)!==input.geometry
    ||input.environment.input.population!==input.population
    ||input.environment.input.scene!==input.scene||(input.environment.input.geometry as object)!==input.geometry)
   throw Error('Native bounty needs identical scene and geometry owners');
  function fields(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,
   get(){return (provider() as Record<string,unknown>)[key];},set(v){(provider() as Record<string,unknown>)[key]=v;}});}
  function methods(provider:()=>object,keys:readonly string[]){for(const key of keys)Object.defineProperty(host,key,{enumerable:true,get(){
   const owner=provider() as Record<string,Function>,fn=owner[key];
   if(typeof fn!=='function')throw Error('Missing native bounty capability: '+key);
   return (...args:unknown[])=>fn.apply(owner,args);
  }});}
  fields(()=>input.scene,['actors']);fields(()=>input.geometry,['currentZoneSeed','doodads']);
  fields(()=>input.environment.input.state,['harvestNodes']);
  fields(()=>input.campaign,['bountyHands','activeQuests','charDirty','clientActionHook','zoneMap','visited','ledger','sim','massRuntime','completedObjectives']);
  methods(()=>input.population,['effectiveSpawn','baseTable','createMonster','promoteRarityStacked']);
  methods(()=>input.population.input.sources.ambient,['weightedPick']);
  methods(()=>input.objectives,['spawnPoint','countedEnemies']);
  methods(()=>input.environment,['harvestRowPick']);methods(()=>input.geometry,['interactSpot','clampPos','markDoodadsChanged']);
  methods(()=>input.campaign,['notice']);methods(()=>self,['handState','noteBountyReady','objectiveDoneAt','questDefOf']);
  this.host=Object.freeze(host);
  Object.defineProperty(this,'input',{value:input,writable:false,configurable:false,enumerable:false});
  Object.defineProperty(this,'host',{value:this.host,writable:false,configurable:false,enumerable:false});
 }
 seedCullMarks(...a:Parameters<World['seedCullMarks']>){return native.sceneSeedCullMarks(this.host,...a);}
 seedGatherNodes(...a:Parameters<World['seedGatherNodes']>){return native.sceneSeedGatherNodes(this.host,...a);}
 noteBountyArrivals(...a:Parameters<World['noteBountyArrivals']>){return native.sceneNoteBountyArrivals(this.host,...a);}
 handState(...a:Parameters<World['handState']>){return native.sceneHandState(this.host,...a);}
 noteBountyReady(...a:Parameters<World['noteBountyReady']>){return native.sceneNoteBountyReady(this.host,...a);}
 objectiveDoneAt(...a:Parameters<World['objectiveDoneAt']>){return native.sceneObjectiveDoneAt(this.host,...a);}
 questDefOf(...a:Parameters<World['questDefOf']>){return native.sceneQuestDefOf(this.host,...a);}
}
