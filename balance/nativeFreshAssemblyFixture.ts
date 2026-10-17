import {installedNativeAreaSources,installedNativeAreaConfig} from '../src/worldmass/nativeAreaInstalledSources';
/** Test campaign/service binding only. No World scene, geometry, population or controller state is transferred. */
import {World} from '../src/engine/world';
import {continentAt,continentSeedFrom} from '../src/world/continents';
import {NativeAreaSceneAssembly,type NativeAreaAssemblyInput} from '../src/worldmass/nativeAreaSceneAssembly';
const birthKeys={
 campaign:['account','annexFound','time','zoneMemory','completedObjectives','stationArmed','discoveredWaypoints','sim','ledger','manifest','zoneMap','caveMap','nextGenId','surveyed','visited','crossDimWarned','vendorHolds','mercSheets','charDirty','seats','descentRun','descentStocks','holdMissingWarned','vendorArmedBeat','chandlerStock','vendorRestockAt','activeQuests','accountDirty','localSeat','questImbues','massSettlementDay','meta','charDeaths','hiredMercs','lastSagaFlushAt','manifestedThisRun','bountyHands','clientActionHook','questSeat','dropRuleOf','actingSeat','mireilleSeatBuff','mireilleXpBuff'],
 population:['bombardMintRev','zoneGenTagging','magicPackEffects','magicPackResolving','magicPackRefreshPending'],
 settlement:['townTierIdx','mercOutpost'],
 transition:['inCave','entryFrom','zoneHasVendorCounter','descentStock','descentSpawnTimer','voyage','encounters','encRng','charBorn','charRegrowAcc','crusadeWorksAt'],
 openings:['annexOpen'],
 theater:['theaterVisit','theaterSpots','theaterRuns','theaterPour','theaterAmbientBudget'],
 sites:['vocationSites'],
 history:['playerCorpses'],
};
const pick=(w:any,keys:string[]):any=>Object.fromEntries(keys.map(k=>[k,w[k]]));
const unavailable=(name:string)=>(..._args:any[]):never=>{throw Error('Unowned post-birth service: '+name);};
export function freshAssemblyInput(w:any,definition:World['zone'],campaign?:any):NativeAreaAssemblyInput {
 campaign??=pick(w,[...birthKeys.campaign,'mintVeil','squadSeq','theaterVisitSeq','vendorStock']);campaign.massRuntime=null;campaign.nativeResidentHistory??={dialogueVisits:w.npcDialogues.visits,dialogueScene:w.dialogueScene};
 for(const k of ['markMetaDirty','accountSeat','questHand','sameParty','seatHero','questStanding','questDefOf','metaProgressionActive','reliquaryLesson','mireilleLessonLived','mireilleGiftOwed','mireilleGiftLesson'])campaign[k]??=w[k].bind(w);
 campaign.notice??=w.notice.bind(w);campaign.text??=w.text.bind(w);campaign.continentFor??=(c:any)=>continentAt(c,continentSeedFrom(campaign.sim.biomeField.fieldSeed));
 return {definition,player:w.player,initialActors:[w.player],campaign,
 sources:installedNativeAreaSources(campaign),
 services:{timeflow:w.timeflow,geometry:{seasSeen:w.seasSeen,oceanBearing:w.oceanBearing.bind(w),seaNameOf:w.seaNameOf.bind(w),notice:campaign.notice,seatOf:w.seatOf.bind(w),drainSurvival:unavailable('drainSurvival')},population:{resolveHit:unavailable('resolveHit')},
 residents:{viewRectFor:unavailable('viewRectFor'),scene:w.scene,clientActionHook:w.clientActionHook,get questStanding(){return campaign.questStanding;},get questDefOf(){return campaign.questDefOf;}},puzzleEffects:{executeSkill:unavailable('puzzle executeSkill')},ecology:{throngClaimed:w.throngClaimed},
 theater:{geyserMode:w.geyserMode,notice:campaign.notice,imminentThreatTo:unavailable('imminentThreatTo'),plantDressAt:unavailable('plantDressAt'),moveActor:unavailable('moveActor'),slipAway:unavailable('slipAway')},
 history:{notice:campaign.notice,events:w.events},
 objectiveProgression:{recalcSeat:unavailable('objective recalcSeat'),resyncMercenary:unavailable('objective resyncMercenary')},
 objectiveQuests:{questLedgerOf:w.questLedgerOf.bind(w),onQuestZoneFieldCleared:unavailable('objective quest field payout')}},
 carry:{inCave:!campaign.zoneMap[definition.id],entryFrom:null,voyage:null,charBorn:w.charBorn,charRegrowAcc:w.charRegrowAcc,townTierIdx:w.townTierIdx},
 config:installedNativeAreaConfig()}
}
export {NativeAreaSceneAssembly};
