/** One campaign's original writer-owned frame state. No local combat or scene
 * methods are delegated to World. Area-local queues, actors, controllers and
 * caches remain on their genuine retained area owners. */
import {isNativeWorld,type World} from '../engine/world';
const frames=new WeakMap<World,NativeAreaCampaignFrameState>();
export class NativeAreaCampaignFrameState {
 readonly #writer:World;
 private constructor(writer:World){this.#writer=writer;}
 static forWriter(writer:World):NativeAreaCampaignFrameState{
  if(!isNativeWorld(writer))throw Error('Native campaign frame needs its actual character writer');
  let state=frames.get(writer);if(!state){state=new NativeAreaCampaignFrameState(writer);frames.set(writer,state);}return state;
 }
 get ambientCamShift():World['ambientCamShift']{return Reflect.get(this.#writer,'ambientCamShift') as World['ambientCamShift'];}
 set ambientCamShift(value:World['ambientCamShift']){if(!Reflect.set(this.#writer,'ambientCamShift',value))throw new TypeError('Native campaign frame field is not writable: ambientCamShift');}
 get chartsBought():World['chartsBought']{return Reflect.get(this.#writer,'chartsBought') as World['chartsBought'];}
 set chartsBought(value:World['chartsBought']){if(!Reflect.set(this.#writer,'chartsBought',value))throw new TypeError('Native campaign frame field is not writable: chartsBought');}
 get classClaimNextAt():World['classClaimNextAt']{return Reflect.get(this.#writer,'classClaimNextAt') as World['classClaimNextAt'];}
 set classClaimNextAt(value:World['classClaimNextAt']){if(!Reflect.set(this.#writer,'classClaimNextAt',value))throw new TypeError('Native campaign frame field is not writable: classClaimNextAt');}
 get clientOptimistic():World['clientOptimistic']{return Reflect.get(this.#writer,'clientOptimistic') as World['clientOptimistic'];}
 set clientOptimistic(value:World['clientOptimistic']){if(!Reflect.set(this.#writer,'clientOptimistic',value))throw new TypeError('Native campaign frame field is not writable: clientOptimistic');}
 get couchConfine():World['couchConfine']{return Reflect.get(this.#writer,'couchConfine') as World['couchConfine'];}
 set couchConfine(value:World['couchConfine']){if(!Reflect.set(this.#writer,'couchConfine',value))throw new TypeError('Native campaign frame field is not writable: couchConfine');}
 get couchDirty():World['couchDirty']{return Reflect.get(this.#writer,'couchDirty') as World['couchDirty'];}
 set couchDirty(value:World['couchDirty']){if(!Reflect.set(this.#writer,'couchDirty',value))throw new TypeError('Native campaign frame field is not writable: couchDirty');}
 get deathPresentation():World['deathPresentation']{return Reflect.get(this.#writer,'deathPresentation') as World['deathPresentation'];}
 set deathPresentation(value:World['deathPresentation']){if(!Reflect.set(this.#writer,'deathPresentation',value))throw new TypeError('Native campaign frame field is not writable: deathPresentation');}
 get deepwinterEyeWarped():World['deepwinterEyeWarped']{return Reflect.get(this.#writer,'deepwinterEyeWarped') as World['deepwinterEyeWarped'];}
 set deepwinterEyeWarped(value:World['deepwinterEyeWarped']){if(!Reflect.set(this.#writer,'deepwinterEyeWarped',value))throw new TypeError('Native campaign frame field is not writable: deepwinterEyeWarped');}
 get deepwinterWarped():World['deepwinterWarped']{return Reflect.get(this.#writer,'deepwinterWarped') as World['deepwinterWarped'];}
 set deepwinterWarped(value:World['deepwinterWarped']){if(!Reflect.set(this.#writer,'deepwinterWarped',value))throw new TypeError('Native campaign frame field is not writable: deepwinterWarped');}
 get descentDeepest():World['descentDeepest']{return Reflect.get(this.#writer,'descentDeepest') as World['descentDeepest'];}
 set descentDeepest(value:World['descentDeepest']){if(!Reflect.set(this.#writer,'descentDeepest',value))throw new TypeError('Native campaign frame field is not writable: descentDeepest');}
 get descentSpent():World['descentSpent']{return Reflect.get(this.#writer,'descentSpent') as World['descentSpent'];}
 set descentSpent(value:World['descentSpent']){if(!Reflect.set(this.#writer,'descentSpent',value))throw new TypeError('Native campaign frame field is not writable: descentSpent');}
 get discoveredDimensions():World['discoveredDimensions']{return Reflect.get(this.#writer,'discoveredDimensions') as World['discoveredDimensions'];}
 set discoveredDimensions(value:World['discoveredDimensions']){if(!Reflect.set(this.#writer,'discoveredDimensions',value))throw new TypeError('Native campaign frame field is not writable: discoveredDimensions');}
 get doorPressIntents():World['doorPressIntents']{return Reflect.get(this.#writer,'doorPressIntents') as World['doorPressIntents'];}
 set doorPressIntents(value:World['doorPressIntents']){if(!Reflect.set(this.#writer,'doorPressIntents',value))throw new TypeError('Native campaign frame field is not writable: doorPressIntents');}
 get forechartNextAt():World['forechartNextAt']{return Reflect.get(this.#writer,'forechartNextAt') as World['forechartNextAt'];}
 set forechartNextAt(value:World['forechartNextAt']){if(!Reflect.set(this.#writer,'forechartNextAt',value))throw new TypeError('Native campaign frame field is not writable: forechartNextAt');}
 get forechartTurn():World['forechartTurn']{return Reflect.get(this.#writer,'forechartTurn') as World['forechartTurn'];}
 set forechartTurn(value:World['forechartTurn']){if(!Reflect.set(this.#writer,'forechartTurn',value))throw new TypeError('Native campaign frame field is not writable: forechartTurn');}
 get gameOver():World['gameOver']{return Reflect.get(this.#writer,'gameOver') as World['gameOver'];}
 set gameOver(value:World['gameOver']){if(!Reflect.set(this.#writer,'gameOver',value))throw new TypeError('Native campaign frame field is not writable: gameOver');}
 get gearVacuum():World['gearVacuum']{return Reflect.get(this.#writer,'gearVacuum') as World['gearVacuum'];}
 set gearVacuum(value:World['gearVacuum']){if(!Reflect.set(this.#writer,'gearVacuum',value))throw new TypeError('Native campaign frame field is not writable: gearVacuum');}
 get gloamPrevPhase():World['gloamPrevPhase']{return Reflect.get(this.#writer,'gloamPrevPhase') as World['gloamPrevPhase'];}
 set gloamPrevPhase(value:World['gloamPrevPhase']){if(!Reflect.set(this.#writer,'gloamPrevPhase',value))throw new TypeError('Native campaign frame field is not writable: gloamPrevPhase');}
 get holdSweepAt():World['holdSweepAt']{return Reflect.get(this.#writer,'holdSweepAt') as World['holdSweepAt'];}
 set holdSweepAt(value:World['holdSweepAt']){if(!Reflect.set(this.#writer,'holdSweepAt',value))throw new TypeError('Native campaign frame field is not writable: holdSweepAt');}
 get lastRespawnPayout():World['lastRespawnPayout']{return Reflect.get(this.#writer,'lastRespawnPayout') as World['lastRespawnPayout'];}
 set lastRespawnPayout(value:World['lastRespawnPayout']){if(!Reflect.set(this.#writer,'lastRespawnPayout',value))throw new TypeError('Native campaign frame field is not writable: lastRespawnPayout');}
 get longNightWarped():World['longNightWarped']{return Reflect.get(this.#writer,'longNightWarped') as World['longNightWarped'];}
 set longNightWarped(value:World['longNightWarped']){if(!Reflect.set(this.#writer,'longNightWarped',value))throw new TypeError('Native campaign frame field is not writable: longNightWarped');}
 get massAway():World['massAway']{return Reflect.get(this.#writer,'massAway') as World['massAway'];}
 set massAway(value:World['massAway']){if(!Reflect.set(this.#writer,'massAway',value))throw new TypeError('Native campaign frame field is not writable: massAway');}
 get massCaveIds():World['massCaveIds']{return Reflect.get(this.#writer,'massCaveIds') as World['massCaveIds'];}
 set massCaveIds(value:World['massCaveIds']){if(!Reflect.set(this.#writer,'massCaveIds',value))throw new TypeError('Native campaign frame field is not writable: massCaveIds');}
 get massSideareaRoots():World['massSideareaRoots']{return Reflect.get(this.#writer,'massSideareaRoots') as World['massSideareaRoots'];}
 set massSideareaRoots(value:World['massSideareaRoots']){if(!Reflect.set(this.#writer,'massSideareaRoots',value))throw new TypeError('Native campaign frame field is not writable: massSideareaRoots');}
 get materializedSwarmings():World['materializedSwarmings']{return Reflect.get(this.#writer,'materializedSwarmings') as World['materializedSwarmings'];}
 set materializedSwarmings(value:World['materializedSwarmings']){if(!Reflect.set(this.#writer,'materializedSwarmings',value))throw new TypeError('Native campaign frame field is not writable: materializedSwarmings');}
 get memoryRecallLast():World['memoryRecallLast']{return Reflect.get(this.#writer,'memoryRecallLast') as World['memoryRecallLast'];}
 set memoryRecallLast(value:World['memoryRecallLast']){if(!Reflect.set(this.#writer,'memoryRecallLast',value))throw new TypeError('Native campaign frame field is not writable: memoryRecallLast');}
 get mercHintAt():World['mercHintAt']{return Reflect.get(this.#writer,'mercHintAt') as World['mercHintAt'];}
 set mercHintAt(value:World['mercHintAt']){if(!Reflect.set(this.#writer,'mercHintAt',value))throw new TypeError('Native campaign frame field is not writable: mercHintAt');}
 get mireilleAfterglow():World['mireilleAfterglow']{return Reflect.get(this.#writer,'mireilleAfterglow') as World['mireilleAfterglow'];}
 set mireilleAfterglow(value:World['mireilleAfterglow']){if(!Reflect.set(this.#writer,'mireilleAfterglow',value))throw new TypeError('Native campaign frame field is not writable: mireilleAfterglow');}
 get mireilleCd():World['mireilleCd']{return Reflect.get(this.#writer,'mireilleCd') as World['mireilleCd'];}
 set mireilleCd(value:World['mireilleCd']){if(!Reflect.set(this.#writer,'mireilleCd',value))throw new TypeError('Native campaign frame field is not writable: mireilleCd');}
 get netCounters():World['netCounters']{return Reflect.get(this.#writer,'netCounters') as World['netCounters'];}
 set netCounters(value:World['netCounters']){if(!Reflect.set(this.#writer,'netCounters',value))throw new TypeError('Native campaign frame field is not writable: netCounters');}
 get netMemoryAccess():World['netMemoryAccess']{return Reflect.get(this.#writer,'netMemoryAccess') as World['netMemoryAccess'];}
 set netMemoryAccess(value:World['netMemoryAccess']){if(!Reflect.set(this.#writer,'netMemoryAccess',value))throw new TypeError('Native campaign frame field is not writable: netMemoryAccess');}
 get netStationAnchors():World['netStationAnchors']{return Reflect.get(this.#writer,'netStationAnchors') as World['netStationAnchors'];}
 set netStationAnchors(value:World['netStationAnchors']){if(!Reflect.set(this.#writer,'netStationAnchors',value))throw new TypeError('Native campaign frame field is not writable: netStationAnchors');}
 get notices():World['notices']{return Reflect.get(this.#writer,'notices') as World['notices'];}
 set notices(value:World['notices']){if(!Reflect.set(this.#writer,'notices',value))throw new TypeError('Native campaign frame field is not writable: notices');}
 get omenNextAt():World['omenNextAt']{return Reflect.get(this.#writer,'omenNextAt') as World['omenNextAt'];}
 set omenNextAt(value:World['omenNextAt']){if(!Reflect.set(this.#writer,'omenNextAt',value))throw new TypeError('Native campaign frame field is not writable: omenNextAt');}
 get omenRevealed():World['omenRevealed']{return Reflect.get(this.#writer,'omenRevealed') as World['omenRevealed'];}
 set omenRevealed(value:World['omenRevealed']){if(!Reflect.set(this.#writer,'omenRevealed',value))throw new TypeError('Native campaign frame field is not writable: omenRevealed');}
 get omenWhisperedAt():World['omenWhisperedAt']{return Reflect.get(this.#writer,'omenWhisperedAt') as World['omenWhisperedAt'];}
 set omenWhisperedAt(value:World['omenWhisperedAt']){if(!Reflect.set(this.#writer,'omenWhisperedAt',value))throw new TypeError('Native campaign frame field is not writable: omenWhisperedAt');}
 get omenWhisperN():World['omenWhisperN']{return Reflect.get(this.#writer,'omenWhisperN') as World['omenWhisperN'];}
 set omenWhisperN(value:World['omenWhisperN']){if(!Reflect.set(this.#writer,'omenWhisperN',value))throw new TypeError('Native campaign frame field is not writable: omenWhisperN');}
 get partyDowns():World['partyDowns']{return Reflect.get(this.#writer,'partyDowns') as World['partyDowns'];}
 set partyDowns(value:World['partyDowns']){if(!Reflect.set(this.#writer,'partyDowns',value))throw new TypeError('Native campaign frame field is not writable: partyDowns');}
 get partyMates():World['partyMates']{return Reflect.get(this.#writer,'partyMates') as World['partyMates'];}
 set partyMates(value:World['partyMates']){if(!Reflect.set(this.#writer,'partyMates',value))throw new TypeError('Native campaign frame field is not writable: partyMates');}
 get pendingTreePips():World['pendingTreePips']{return Reflect.get(this.#writer,'pendingTreePips') as World['pendingTreePips'];}
 set pendingTreePips(value:World['pendingTreePips']){if(!Reflect.set(this.#writer,'pendingTreePips',value))throw new TypeError('Native campaign frame field is not writable: pendingTreePips');}
 get pickupFeed():World['pickupFeed']{return Reflect.get(this.#writer,'pickupFeed') as World['pickupFeed'];}
 set pickupFeed(value:World['pickupFeed']){if(!Reflect.set(this.#writer,'pickupFeed',value))throw new TypeError('Native campaign frame field is not writable: pickupFeed');}
 get provisioningFlaskSlots():World['provisioningFlaskSlots']{return Reflect.get(this.#writer,'provisioningFlaskSlots') as World['provisioningFlaskSlots'];}
 set provisioningFlaskSlots(value:World['provisioningFlaskSlots']){if(!Reflect.set(this.#writer,'provisioningFlaskSlots',value))throw new TypeError('Native campaign frame field is not writable: provisioningFlaskSlots');}
 get quickenSweepAcc():World['quickenSweepAcc']{return Reflect.get(this.#writer,'quickenSweepAcc') as World['quickenSweepAcc'];}
 set quickenSweepAcc(value:World['quickenSweepAcc']){if(!Reflect.set(this.#writer,'quickenSweepAcc',value))throw new TypeError('Native campaign frame field is not writable: quickenSweepAcc');}
 get screenFade():World['screenFade']{return Reflect.get(this.#writer,'screenFade') as World['screenFade'];}
 set screenFade(value:World['screenFade']){if(!Reflect.set(this.#writer,'screenFade',value))throw new TypeError('Native campaign frame field is not writable: screenFade');}
 get seatQuests():World['seatQuests']{return Reflect.get(this.#writer,'seatQuests') as World['seatQuests'];}
 set seatQuests(value:World['seatQuests']){if(!Reflect.set(this.#writer,'seatQuests',value))throw new TypeError('Native campaign frame field is not writable: seatQuests');}
 get soundings():World['soundings']{return Reflect.get(this.#writer,'soundings') as World['soundings'];}
 set soundings(value:World['soundings']){if(!Reflect.set(this.#writer,'soundings',value))throw new TypeError('Native campaign frame field is not writable: soundings');}
 get stashedCompanions():World['stashedCompanions']{return Reflect.get(this.#writer,'stashedCompanions') as World['stashedCompanions'];}
 set stashedCompanions(value:World['stashedCompanions']){if(!Reflect.set(this.#writer,'stashedCompanions',value))throw new TypeError('Native campaign frame field is not writable: stashedCompanions');}
 get townPortalArrival():World['townPortalArrival']{return Reflect.get(this.#writer,'townPortalArrival') as World['townPortalArrival'];}
 set townPortalArrival(value:World['townPortalArrival']){if(!Reflect.set(this.#writer,'townPortalArrival',value))throw new TypeError('Native campaign frame field is not writable: townPortalArrival');}
 get townPortalClientViews():World['townPortalClientViews']{return Reflect.get(this.#writer,'townPortalClientViews') as World['townPortalClientViews'];}
 set townPortalClientViews(value:World['townPortalClientViews']){if(!Reflect.set(this.#writer,'townPortalClientViews',value))throw new TypeError('Native campaign frame field is not writable: townPortalClientViews');}
 get townPortalDwell():World['townPortalDwell']{return Reflect.get(this.#writer,'townPortalDwell') as World['townPortalDwell'];}
 set townPortalDwell(value:World['townPortalDwell']){if(!Reflect.set(this.#writer,'townPortalDwell',value))throw new TypeError('Native campaign frame field is not writable: townPortalDwell');}
 get townPortals():World['townPortals']{return Reflect.get(this.#writer,'townPortals') as World['townPortals'];}
 set townPortals(value:World['townPortals']){if(!Reflect.set(this.#writer,'townPortals',value))throw new TypeError('Native campaign frame field is not writable: townPortals');}
 get treePopupRequested():World['treePopupRequested']{return Reflect.get(this.#writer,'treePopupRequested') as World['treePopupRequested'];}
 set treePopupRequested(value:World['treePopupRequested']){if(!Reflect.set(this.#writer,'treePopupRequested',value))throw new TypeError('Native campaign frame field is not writable: treePopupRequested');}
 get treePopupSeatId():World['treePopupSeatId']{return Reflect.get(this.#writer,'treePopupSeatId') as World['treePopupSeatId'];}
 set treePopupSeatId(value:World['treePopupSeatId']){if(!Reflect.set(this.#writer,'treePopupSeatId',value))throw new TypeError('Native campaign frame field is not writable: treePopupSeatId');}
 get treePopupSkillId():World['treePopupSkillId']{return Reflect.get(this.#writer,'treePopupSkillId') as World['treePopupSkillId'];}
 set treePopupSkillId(value:World['treePopupSkillId']){if(!Reflect.set(this.#writer,'treePopupSkillId',value))throw new TypeError('Native campaign frame field is not writable: treePopupSkillId');}
 get uiActionSeatId():World['uiActionSeatId']{return Reflect.get(this.#writer,'uiActionSeatId') as World['uiActionSeatId'];}
 set uiActionSeatId(value:World['uiActionSeatId']){if(!Reflect.set(this.#writer,'uiActionSeatId',value))throw new TypeError('Native campaign frame field is not writable: uiActionSeatId');}
 get warpSweepAcc():World['warpSweepAcc']{return Reflect.get(this.#writer,'warpSweepAcc') as World['warpSweepAcc'];}
 set warpSweepAcc(value:World['warpSweepAcc']){if(!Reflect.set(this.#writer,'warpSweepAcc',value))throw new TypeError('Native campaign frame field is not writable: warpSweepAcc');}
 get webSettleNextAt():World['webSettleNextAt']{return Reflect.get(this.#writer,'webSettleNextAt') as World['webSettleNextAt'];}
 set webSettleNextAt(value:World['webSettleNextAt']){if(!Reflect.set(this.#writer,'webSettleNextAt',value))throw new TypeError('Native campaign frame field is not writable: webSettleNextAt');}
 get webSettleSeenSeq():World['webSettleSeenSeq']{return Reflect.get(this.#writer,'webSettleSeenSeq') as World['webSettleSeenSeq'];}
 set webSettleSeenSeq(value:World['webSettleSeenSeq']){if(!Reflect.set(this.#writer,'webSettleSeenSeq',value))throw new TypeError('Native campaign frame field is not writable: webSettleSeenSeq');}
 get bountyWatchAccum():World['bountyWatchAccum']{return Reflect.get(this.#writer,'bountyWatchAccum') as World['bountyWatchAccum'];}
 set bountyWatchAccum(value:World['bountyWatchAccum']){if(!Reflect.set(this.#writer,'bountyWatchAccum',value))throw new TypeError('Native campaign frame field is not writable: bountyWatchAccum');}
 get campfireCd():World['campfireCd']{return Reflect.get(this.#writer,'campfireCd') as World['campfireCd'];}
 set campfireCd(value:World['campfireCd']){if(!Reflect.set(this.#writer,'campfireCd',value))throw new TypeError('Native campaign frame field is not writable: campfireCd');}
 get traceRests():World['traceRests']{return Reflect.get(this.#writer,'traceRests') as World['traceRests'];}
 set traceRests(value:World['traceRests']){if(!Reflect.set(this.#writer,'traceRests',value))throw new TypeError('Native campaign frame field is not writable: traceRests');}
 get pingClocks():World['pingClocks']{return Reflect.get(this.#writer,'pingClocks') as World['pingClocks'];}
 set pingClocks(value:World['pingClocks']){if(!Reflect.set(this.#writer,'pingClocks',value))throw new TypeError('Native campaign frame field is not writable: pingClocks');}
 get bountyReceipt():World['bountyReceipt']{return Reflect.get(this.#writer,'bountyReceipt') as World['bountyReceipt'];}
 set bountyReceipt(value:World['bountyReceipt']){if(!Reflect.set(this.#writer,'bountyReceipt',value))throw new TypeError('Native campaign frame field is not writable: bountyReceipt');}
 get wraithsailSighted():World['wraithsailSighted']{return Reflect.get(this.#writer,'wraithsailSighted') as World['wraithsailSighted'];}
 set wraithsailSighted(value:World['wraithsailSighted']){if(!Reflect.set(this.#writer,'wraithsailSighted',value))throw new TypeError('Native campaign frame field is not writable: wraithsailSighted');}
 get shelfBuyer():World['shelfBuyer']{return Reflect.get(this.#writer,'shelfBuyer') as World['shelfBuyer'];}
 set shelfBuyer(value:World['shelfBuyer']){if(!Reflect.set(this.#writer,'shelfBuyer',value))throw new TypeError('Native campaign frame field is not writable: shelfBuyer');}
 get lowLifeHitFlash():World['lowLifeHitFlash']{return Reflect.get(this.#writer,'lowLifeHitFlash') as World['lowLifeHitFlash'];}
 set lowLifeHitFlash(value:World['lowLifeHitFlash']){if(!Reflect.set(this.#writer,'lowLifeHitFlash',value))throw new TypeError('Native campaign presentation field is not writable: lowLifeHitFlash');}
 get eyecatch():World['eyecatch']{return Reflect.get(this.#writer,'eyecatch') as World['eyecatch'];}
 set eyecatch(value:World['eyecatch']){if(!Reflect.set(this.#writer,'eyecatch',value))throw new TypeError('Native campaign presentation field is not writable: eyecatch');}
 get ultFlashAt():World['ultFlashAt']{return Reflect.get(this.#writer,'ultFlashAt') as World['ultFlashAt'];}
 set ultFlashAt(value:World['ultFlashAt']){if(!Reflect.set(this.#writer,'ultFlashAt',value))throw new TypeError('Native campaign presentation field is not writable: ultFlashAt');}
 get ultFlashLastAt():World['ultFlashLastAt']{return Reflect.get(this.#writer,'ultFlashLastAt') as World['ultFlashLastAt'];}
 set ultFlashLastAt(value:World['ultFlashLastAt']){if(!Reflect.set(this.#writer,'ultFlashLastAt',value))throw new TypeError('Native campaign presentation field is not writable: ultFlashLastAt');}
}
