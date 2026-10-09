/** Test-only transfer at the real native post-arrival boundary. It deliberately
 * lacks source-session/publication authority; local birth must never read the
 * donor World's scene or call its local implementations after construction. */
import assert from 'node:assert/strict';
import {World,NAV_CFG,PARTY_LAND_CFG} from '../src/engine/world';
import {MIN_PORTAL_SEP} from '../src/engine/worldgen';
import {climateAt} from '../src/world/climate';
import {continentAt,continentSeedFrom} from '../src/world/continents';
import {ZONE_MEMORY_CFG} from '../src/engine/zonecontents';
import {applyScenePartyScale,scenePartyScaleCount} from '../src/engine/nativeScenePopulation';
import {NativeResidentSession} from '../src/worldmass/nativeResidentSession';
import {NativeAreaSceneSky,bindNativeSceneSky} from '../src/worldmass/nativeAreaSceneSky';
import {sceneObjectiveServices,bindNativeSceneObjectives} from '../src/worldmass/nativeSceneObjectives';
import {freshSceneObjectiveState} from '../src/worldmass/nativeSceneState';
import {freshSceneBirthState,composeNativeSceneBirth} from '../src/worldmass/nativeSceneBirthComposition';
import {freshSceneEnvironmentState} from '../src/worldmass/nativeAreaSceneEnvironment';
import {freshSceneEcologyState} from '../src/worldmass/nativeAreaSceneEcology';
import {freshSceneOccurrenceState} from '../src/worldmass/nativeAreaSceneOccurrences';
import {freshScenePhysicalState} from '../src/worldmass/nativeAreaScenePhysical';
import {freshSceneRuntimeBirthState} from '../src/worldmass/nativeAreaSceneRuntimeBirth';
import {freshSceneRuntimeRegistryState} from '../src/worldmass/nativeAreaSceneRuntimeRegistry';
import {NativeAreaSceneGeometry} from '../src/worldmass/nativeAreaSceneGeometry';
import {NativeAreaScenePopulation} from '../src/worldmass/nativeAreaScenePopulation';
import {NativeAreaSceneEnvironment} from '../src/worldmass/nativeAreaSceneEnvironment';
import {NativeAreaSceneEcology} from '../src/worldmass/nativeAreaSceneEcology';
import {NativeAreaSceneSettlement} from '../src/worldmass/nativeAreaSceneSettlement';
import {NativeAreaSceneOccurrences} from '../src/worldmass/nativeAreaSceneOccurrences';
import {NativeAreaSceneBounty} from '../src/worldmass/nativeAreaSceneBounty';
import {NativeAreaScenePhysical} from '../src/worldmass/nativeAreaScenePhysical';
import {NativeAreaSceneHarbor} from '../src/worldmass/nativeAreaSceneHarbor';
import {NativeAreaSceneOpenings} from '../src/worldmass/nativeAreaSceneOpenings';
import {NativeAreaSceneTheater} from '../src/worldmass/nativeAreaSceneTheater';
import {NativeAreaSceneEncounterBirth} from '../src/worldmass/nativeAreaSceneEncounterBirth';
import {NativeAreaSceneSites} from '../src/worldmass/nativeAreaSceneSites';
import {NativeAreaSceneHistory} from '../src/worldmass/nativeAreaSceneHistory';
import {NativeAreaSceneDescent} from '../src/worldmass/nativeAreaSceneDescent';
import {NativeAreaSceneCoast} from '../src/worldmass/nativeAreaSceneCoast';
import {NativeAreaSceneArrival} from '../src/worldmass/nativeAreaSceneArrival';
import {NativeAreaSceneAdoption} from '../src/worldmass/nativeAreaSceneAdoption';
import {NativeAreaSceneGeneration} from '../src/worldmass/nativeAreaSceneGeneration';
import {NativeAreaSceneRuntimeBirth} from '../src/worldmass/nativeAreaSceneRuntimeBirth';
import {NativeAreaSceneTitans} from '../src/worldmass/nativeAreaSceneTitans';
import {NativeAreaSceneRuntimeRegistry} from '../src/worldmass/nativeAreaSceneRuntimeRegistry';
const birthKeys={
 campaign:['account','annexFound','time','zoneMemory','completedObjectives','stationArmed','discoveredWaypoints','sim','ledger','manifest','zoneMap','caveMap','nextGenId','surveyed','visited','crossDimWarned','vendorHolds','mercSheets','charDirty','seats','descentRun','descentStocks','holdMissingWarned','vendorArmedBeat','chandlerStock','vendorRestockAt','activeQuests','accountDirty','localSeat','questImbues','massSettlementDay','meta','charDeaths','hiredMercs','lastSagaFlushAt','manifestedThisRun','bountyHands','clientActionHook'],
 population:['bombardMintRev','zoneGenTagging','magicPackEffects','magicPackResolving','magicPackRefreshPending'],
 settlement:['townTierIdx','mercOutpost'],
 transition:['inCave','entryFrom','zoneHasVendorCounter','descentStock','descentSpawnTimer','voyage','encounters','encRng','charBorn','charRegrowAcc','crusadeWorksAt'],
 openings:['annexOpen'],
 theater:['theaterVisit','theaterSpots','theaterRuns','theaterPour','theaterAmbientBudget'],
 sites:['vocationSites'],
 history:['playerCorpses'],
};
const pick=(w:any,keys:string[])=>Object.fromEntries(keys.map(k=>[k,w[k]]));
const transfer=(w:any,example:object):any=>pick(w,Object.keys(example));
const unavailable=(name:string)=>(..._args:any[]):never=>{throw Error('Unowned post-birth service: '+name);};
export function completeBirthFixture(w:any,policy:{arrivalGrace:number}){
 const scene={zone:w.zone,actors:w.actors,player:w.player};
 const campaign:any=pick(w,birthKeys.campaign);
 campaign.massRuntime=null;
 const calls:unknown[]=[];campaign.text=(...a:any[])=>calls.push(['text',a]);campaign.notice=(...a:any[])=>calls.push(['notice',a]);
 for(const key of ['questStanding','questDefOf','metaProgressionActive','reliquaryLesson','mireilleLessonLived','mireilleGiftOwed','mireilleGiftLesson'])campaign[key]=w[key].bind(w);
 const environmentState=transfer(w,freshSceneEnvironmentState()),objectives=transfer(w,freshSceneObjectiveState(scene.zone.id,campaign.completedObjectives));
 const sky=new NativeAreaSceneSky({scene,environment:environmentState,campaign} as any);
 let population:NativeAreaScenePopulation;
 const geometryCampaign=bindNativeSceneSky({ledger:campaign.ledger,seasSeen:w.seasSeen,oceanBearing:w.oceanBearing.bind(w),seaNameOf:w.seaNameOf.bind(w),notice:campaign.notice,text:campaign.text,get time(){return campaign.time;},seats:campaign.seats,seatOf:w.seatOf.bind(w),drainSurvival:unavailable('drainSurvival'),createMonster:(...a:Parameters<World['createMonster']>)=>population.createMonster(...a)},sky);
 const geometry=new NativeAreaSceneGeometry(scene,w.arena,geometryCampaign,{navigationPad:NAV_CFG.pad,eventSpacing:240,minPortalSeparation:MIN_PORTAL_SEP});
 // World has already adopted the full layout at this boundary. Transfer it
 // exactly once; re-running adoption could repeat breach/dressing side effects.
 for(const k of Object.keys(geometry))if(!['state','campaign','arena','arenaHull','navigationPad','eventSpacing','minPortalSeparation'].includes(k)&&Object.hasOwn(w,k)&&typeof w[k]!=='function')(geometry as any)[k]=w[k];
 const local:any={census:scene,get exits(){return geometry.exits;},massRuntime:null,scene:w.scene,clientActionHook:w.clientActionHook,localZoneAt:()=>scene.zone,isSafeAt:()=>scene.zone.objective.kind==='safe',viewRectFor:unavailable('resident viewRectFor'),lineOfSight:geometry.lineOfSight.bind(geometry)};
 const residents=new NativeResidentSession({campaign,area:{census:scene,local}});
 // Test-only boundary transfer preserves the existing session, while every
 // selected dialogue callback continues to read the new local census.
 for(const key of ['speakerRows','speechMemory','speechFocus'])for(const [k,v]of w[key])((residents as any)[key] as Map<unknown,unknown>).set(k,v);
 residents.dialogueScene=w.dialogueScene;residents.speechFocusSpeaker=w.speechFocusSpeaker;
 for(const key of Object.keys(w.npcDialogues))if(key!=='w')(residents.npcDialogues as any)[key]=w.npcDialogues[key];
 const nativeAmbient=w.nativeAmbientHost();
 const ambient={...pick(nativeAmbient,['config','rand','randInt','monster','rollPackSize','rollRarity','magicPackPool','magicPackSize','rollMagicPack','storyTable','tierFloorAt','encounterGroupContext','rollEncounterGroup','presenceMul']),get random(){return Math.random;},weightedPick:w.weightedPick,packageActive:(id:string,level:number)=>campaign.sim.packageActive(id,level),notice:campaign.notice};
 const sources={ambient,groups:w.nativeEncounterGroupHost(),factory:w.nativeMonsterFactorySources(),promotion:w.nativeMonsterPromotionSources(),hostility:(World as any).nativeHostilitySources(),relay:(World as any).nativeStatusRelaySources()};
 campaign.continentFor=(c:any)=>continentAt(c,continentSeedFrom(campaign.sim.biomeField.fieldSeed));
 population=new NativeAreaScenePopulation({scene,geometry,campaign,sources,populationSources:(World as any).nativePopulationSources(),context:{get time(){return campaign.time;},npcDialogues:residents.npcDialogues,applyPartyScale:(a:import('../src/engine/actor').Actor)=>applyScenePartyScale({partyScaleCount:()=>scenePartyScaleCount({player:scene.player,seats:campaign.seats})},a),opaqueAt:(x:number,y:number)=>geometry.opaqueAt(x,y),sanctuaryBlocksCombat:()=>scene.zone.objective.kind==='safe',resolveHit:unavailable('resolveHit')},state:{...pick(w,birthKeys.population),squadSequence:w.squadSeq}} as any);
 const environment=new NativeAreaSceneEnvironment({scene,geometry,population,services:bindNativeSceneObjectives({get time(){return campaign.time;},timeflow:w.timeflow,completePuzzle:unavailable('completePuzzle')},objectives as any),sources:(World as any).nativeSceneEnvironmentSources,state:environmentState} as any);
 const ecology=new NativeAreaSceneEcology({scene,geometry,population,environment:environmentState,services:bindNativeSceneSky({get time(){return campaign.time;},seats:campaign.seats,throngClaimed:w.throngClaimed},sky),sources:(World as any).nativeSceneEcologySources,state:transfer(w,freshSceneEcologyState())} as any);
 const settlement=new NativeAreaSceneSettlement({scene,geometry,campaign,state:pick(w,birthKeys.settlement)} as any);
 const occurrences=new NativeAreaSceneOccurrences({scene,geometry,population,services:{get time(){return campaign.time;},traceRuns:w.traceRuns,timeflow:w.timeflow},state:transfer(w,freshSceneOccurrenceState())});
 const objectiveContext:any={get zoneEntry(){return geometry.zoneEntry;},get sim(){return campaign.sim;},get walk(){return geometry.walk;},get structures(){return geometry.structures;},get arena(){return geometry.arena;},get time(){return campaign.time;},notice:campaign.notice,text:campaign.text};
 for(const k of ['pathField','farPoint','pointInSolid','farthestStand'])objectiveContext[k]=(geometry as any)[k].bind(geometry);
 const objectiveHost=sceneObjectiveServices(population,objectives as any,objectiveContext);
 const bounty=new NativeAreaSceneBounty({scene,geometry,population,environment,campaign,objectives:objectiveHost});
 const physical=new NativeAreaScenePhysical({scene,geometry,population,settlement,campaign,state:transfer(w,freshScenePhysicalState())} as any);
 // The classic host retains its derived altar-body WeakMap across returns.
 // Reconstruct that prior-owner bookkeeping through the real native sync on
 // SCRATCH roots, then restore the exact donor roots before birth. No source,
 // actor, random draw, or current-area scenery is created or changed here.
 const cacheKeys=['doodads','doodadsRev','famEpoch','famRevs'] as const;
 const prior=pick(geometry,[...cacheKeys]);
 try{geometry.doodads=[];geometry.doodadsRev=0;geometry.famEpoch=-1;geometry.famRevs=[];physical.syncAltarBodies();}
 finally{for(const key of cacheKeys)(geometry as any)[key]=prior[key];}
 const transition:any=pick(w,birthKeys.transition);
 const harbor=new NativeAreaSceneHarbor({scene,geometry,population,settlement,run:campaign,state:transition,services:campaign,config:{partyLand:PARTY_LAND_CFG}});
 const openings=new NativeAreaSceneOpenings({scene,geometry,population,state:pick(w,birthKeys.openings),campaign,rewards:{text:campaign.text,dropGemAt:unavailable('opening dropGemAt'),shedOrb:unavailable('opening shedOrb')}} as any);
 const theaterServices=bindNativeSceneSky({geyserMode:w.geyserMode,notice:campaign.notice,imminentThreatTo:unavailable('imminentThreatTo'),plantDressAt:unavailable('plantDressAt'),dropGemAt:unavailable('dropGemAt'),moveActor:unavailable('moveActor'),slipAway:unavailable('slipAway')},sky);
 const theater=new NativeAreaSceneTheater({scene,geometry,population,environment,ecology,campaign,state:pick(w,birthKeys.theater),services:theaterServices} as any);
 const encounters=new NativeAreaSceneEncounterBirth({scene,geometry,population,campaign,state:transition});
 const sites=new NativeAreaSceneSites({scene,geometry,population,settlement,campaign,state:pick(w,birthKeys.sites)} as any);
 const history=new NativeAreaSceneHistory({scene,geometry,population,campaign,services:{notice:campaign.notice,text:campaign.text,events:w.events},state:pick(w,birthKeys.history)} as any);
 const descent=new NativeAreaSceneDescent({scene,geometry,population,settlement,campaign,state:transition,services:campaign});
 const coast=new NativeAreaSceneCoast({scene,geometry,campaign,state:transition,sources:{...w.nativeSceneCoastSources(),climateAt,continentAt,continentSeedFrom,ZONE_MEMORY_CFG,exitPreparation:w.nativeExitPreparationSources()}});
 const arrival=new NativeAreaSceneArrival({scene,geometry,campaign,policy});
 const runtimeState=transfer(w,freshSceneRuntimeBirthState());
 const adoption=new NativeAreaSceneAdoption({scene,geometry,campaign,state:runtimeState} as any);
 const generation=new NativeAreaSceneGeneration({scene,geometry,campaign,state:transition});
 const runtimeBirth=new NativeAreaSceneRuntimeBirth({scene,geometry,population,generation,theater,campaign,state:runtimeState,sources:w.nativeRuntimeBirthSources()} as any);
 const titans=new NativeAreaSceneTitans({scene,geometry,population,campaign});
 const registry=new NativeAreaSceneRuntimeRegistry({scene,geometry,birth:runtimeBirth,titans,descentState:transition,state:transfer(w,freshSceneRuntimeRegistryState())} as any);
 const input:any={scene,geometry,population,environment,ecology,settlement,occurrences,bounty,physical,residents,objectives,sources:{nativeInhabitantSources:(World as any).nativeInhabitantSources},campaign,state:transfer(w,freshSceneBirthState()),harbor,openings,theater,encounters,sites,history,descent,coast,arrival,adoption,registry,sky};
 const host=composeNativeSceneBirth(input);
 assert.equal(host.zoneRuntimes.length,36);
 return {host,input,calls,local};
}

/** All mutable birth-owner roots, plus shared campaign and body graphs. The
 * original/current lanes read World directly; no local owner is constructed. */
export function completeBirthRoots(w:any,local:ReturnType<typeof completeBirthFixture>|null,notices:unknown[]){
 const i=local?.input;
 const group=(keys:string[],owner?:any)=>pick(i?owner:w,keys);
 const roots:any={
  scene:{zone:i?i.scene.zone:w.zone,actors:i?i.scene.actors:w.actors,player:i?i.scene.player:w.player},
  campaign:group(birthKeys.campaign,i?.campaign),
  population:group(birthKeys.population,i?.population.input.state),
  squadSequence:i?i.population.input.state.squadSequence:w.squadSeq,
  environment:group(Object.keys(freshSceneEnvironmentState()),i?.environment.input.state),
  ecology:group(Object.keys(freshSceneEcologyState()),i?.ecology.input.state),
  objectives:group(Object.keys(freshSceneObjectiveState('',new Set())),i?.objectives),
  occurrences:group(Object.keys(freshSceneOccurrenceState()),i?.occurrences.input.state),
  physical:group(Object.keys(freshScenePhysicalState()),i?.physical.input.state),
  birth:group(Object.keys(freshSceneBirthState()),i?.state),
  transition:group(birthKeys.transition,i?.descent.input.state),
  runtimeBirth:group(Object.keys(freshSceneRuntimeBirthState()),i?.registry.input.birth.input.state),
  registry:group(Object.keys(freshSceneRuntimeRegistryState()),i?.registry.input.state),
  residents:group(['speakerRows','speechMemory','speechFocus','speechFocusSpeaker','dialogueScene'],i?.residents),
  notices:i?local!.calls:notices,
  traceRuns:i?i.occurrences.input.services.traceRuns:w.traceRuns,
  timeflow:w.timeflow,
 };
 for(const part of ['settlement','openings','theater','sites','history'] as const)roots[part]=group(birthKeys[part],i?.[part].input.state);
 const geometry=i?.geometry??new NativeAreaSceneGeometry(roots.scene,w.arena,{} as any,{navigationPad:NAV_CFG.pad,eventSpacing:240,minPortalSeparation:MIN_PORTAL_SEP});
 roots.geometry=pick(i?geometry:w,Object.keys(geometry).filter(k=>!['state','campaign','navigationPad','eventSpacing','minPortalSeparation'].includes(k)));
 roots.titans=Object.fromEntries(Object.entries(i?i.registry.input.titans.runtime:w.titans).filter(([k])=>k!=='world'));
 roots.dialogues=Object.fromEntries(Object.entries(i?i.residents.npcDialogues:w.npcDialogues).filter(([k])=>k!=='w'));
 // Actor references stay IDs in the graph; their actual property values share
 // the SAME serialization map as controllers, other actors, campaign and player.
 const actors=[...new Set([...roots.scene.actors,roots.scene.player])] as import('../src/engine/actor').Actor[];
 roots.bodies=actors.map(a=>({id:a.id,fields:pick(a,Object.keys(a))}));
 return roots;
}
