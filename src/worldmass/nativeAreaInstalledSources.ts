import './nativeBootstrap';
import '../engine/nativeSceneBootstrap';
import '../engine/nativeSceneRegistration';
/** Production source assembly from the installed registries, never from World scene adapters. */
import * as installed from '../engine/nativeSceneSources';
import {climateAt} from '../world/climate';
import {continentAt,continentSeedFrom} from '../world/continents';
import {NAV_CFG,PARTY_LAND_CFG,EVENT_SPACING} from '../engine/nativeSceneConfig';
import {POCKET_CFG} from '../engine/nativePopulationRules';
import {MIN_PORTAL_SEP} from '../engine/worldgen';
import type {NativeAreaAssemblyInput} from './nativeAreaSceneAssembly';
import {ZONE_MEMORY_CFG} from '../engine/zonecontents';
import type {NativeAreaAssemblySources,NativeAreaAssemblyCampaign} from './nativeAreaSceneAssembly';
export function installedNativeAreaSources(campaign:Pick<NativeAreaAssemblyCampaign,'sim'|'notice'>):NativeAreaAssemblySources {
 return {
  population:{ambient:installed.installedNativeAmbientSources({packageActive:(id,level)=>campaign.sim.packageActive(id,level),notice:(...args)=>campaign.notice(...args)}),
   groups:installed.installedNativeGroupSources(),factory:installed.installedNativeFactorySources(),promotion:installed.installedNativePromotionSources(),hostility:installed.installedNativeHostilitySources(),relay:installed.installedNativeRelaySources()},
  populationResolution:installed.installedNativePopulationSources(),environment:installed.installedNativeEnvironmentSources(),ecology:installed.installedNativeEcologySources(),
  coast:Object.defineProperties(installed.installedNativeCoastSources(),{
   climateAt:{enumerable:true,get:()=>climateAt},continentAt:{enumerable:true,get:()=>continentAt},continentSeedFrom:{enumerable:true,get:()=>continentSeedFrom},
   ZONE_MEMORY_CFG:{enumerable:true,get:()=>ZONE_MEMORY_CFG},exitPreparation:{enumerable:true,value:installed.installedNativeExitSources()},
  }) as NativeAreaAssemblySources['coast'],
  runtime:installed.installedNativeRuntimeSources(),inhabitants:{nativeInhabitantSources:installed.installedNativeInhabitantSources()},
 };
}

export function installedNativeAreaConfig():NativeAreaAssemblyInput['config'] {
 return {get navigationPad(){return NAV_CFG.pad;},get eventSpacing(){return EVENT_SPACING;},get minPortalSeparation(){return MIN_PORTAL_SEP;},get partyLand(){return PARTY_LAND_CFG;},get arrivalGrace(){return POCKET_CFG.arrivalGrace;}};
}
