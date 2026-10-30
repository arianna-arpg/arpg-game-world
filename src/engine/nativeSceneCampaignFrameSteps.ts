/** Native frame statements split only at existing top-level phase boundaries. */
import {updateScene} from './scenes';
import type {NativeFrameRawAreaHost,NativeFrameInteractionsBeforeHarborHost,NativeFrameInteractionsAfterHarborHost,NativeFrameLocalStreamsHost} from './nativeSceneCampaignFrame';

export function sceneNativeFrameStep007(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {
    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,
    // BEFORE the hold gate below — scenes own their freezes (a story card
    // stops the sim under itself; the reckoning frees one actor) and must
    // keep sequencing through them. It yields to 'menu' holds internally.
    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);
}

export function sceneNativeFrameStep008(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {
    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's
    // window must close through the very freeze it stands (the anti-memorize
    // law: no hold, its own included, buys reading time). Arming rides the
    // scaled dt inside, so a held world commits no new nodes.
    nativeFrame.updateHarvest(rawDt, dt);
}

export function sceneNativeFrameStep022(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {

    // Brandt restocks on the world clock (town only — stock is empty elsewhere).
    // THE BEAT LAW's live edge: only where a counter NPC actually stands
    // (the loadZone latch — a standing shelf elsewhere waits frozen for the
    // return arm) and never on a NET client (the host's snapshot is the
    // client's whole truth; accounts may even disagree on the quantum).
    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook
      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();
}

export function sceneNativeFrameStep023(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here
    // holds its own shelf, dealt from the shared beat.
    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();
}

export function sceneNativeFrameStep024(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {

    // Mireille heals you for lingering near her (proximity, not a keypress).
    nativeFrame.updateMireille(dt);
}

export function sceneNativeFrameStep025(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The campfire refreshes the wilds for lingering by it (town, feature-gated).
    nativeFrame.updateCampfire(dt);
}

export function sceneNativeFrameStep026(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).
    nativeFrame.updateSalvage(dt);
}

export function sceneNativeFrameStep027(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The bounty board arms its beat's slate + opens the postings panel on a dwell.
    nativeFrame.updateBountyBoard(dt);
}

export function sceneNativeFrameStep028(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The forge's safety sweep (a dead or downed hand drops the pen).
    nativeFrame.updateTraces();
}

export function sceneNativeFrameStep029(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).
    nativeFrame.updateFont(dt);
}

export function sceneNativeFrameStep030(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // A banked Ability-point pip offers its popup at the next disciplined calm.
    nativeFrame.updateTreePips();
}

export function sceneNativeFrameStep031(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The Oracle stone opens the communion menu on a dwell.
    nativeFrame.updateOracle(dt);
}

export function sceneNativeFrameStep032(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The Tracker's fire opens the Bestiary on a dwell.
    nativeFrame.updateTracker(dt);
}

export function sceneNativeFrameStep033(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.
    nativeFrame.updateVendors(dt);
}

export function sceneNativeFrameStep034(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The Caravanner opens the band-travel menu on a dwell (a UI callback).
    nativeFrame.updateCaravan(dt);
}

export function sceneNativeFrameStep035(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The port dock's linger-to-sail (naval travel menu).
    nativeFrame.updateSail(dt);
}

export function sceneNativeFrameStep036(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The harbor board's linger-to-read (hearsay + passage + charts).
    nativeFrame.updateHarborBoard(dt);
}

export function sceneNativeFrameStep037(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    // The harborhold: the muster horn's linger, the plaza writ board, the
    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring
    // sieges, deadlines).
    nativeFrame.updateMusterHorn(dt);
}

export function sceneNativeFrameStep038(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    nativeFrame.updateHoldDefense(dt);
}

export function sceneNativeFrameStep040(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).
    nativeFrame.updateQuestGiver(dt);
}

export function sceneNativeFrameStep041(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.updateVocationSites();
}

export function sceneNativeFrameStep042(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The mercenary outpost's calm parley dwell (hire blades / retire here).
    nativeFrame.updateMercOutpost(dt);
}

export function sceneNativeFrameStep043(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).
    nativeFrame.updateAmalgamation(dt);
}

export function sceneNativeFrameStep044(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.
    nativeFrame.updateDelver(dt);
}

export function sceneNativeFrameStep045(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.updateDescent(dt);
}

export function sceneNativeFrameStep046(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.
    nativeFrame.updateLightwells(dt);
}

export function sceneNativeFrameStep047(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.
    nativeFrame.updateGloaming(dt);
}

export function sceneNativeFrameStep048(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The boat: stream the coast + watch for a landing dwell (the sailing mode).
    nativeFrame.updateSailing(dt);
}

export function sceneNativeFrameStep049(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // Dwell beside a prior run's corpse to reclaim its lost gems.
    nativeFrame.updatePlayerCorpses(dt);
}

export function sceneNativeFrameStep050(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // Co-op: an ally lingering by a downed seat revives them.
    nativeFrame.updateDownedSeats(dt);
}

export function sceneNativeFrameStep051(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    // The same tending mends a downed COMPANION (the Hunter's bond).
    nativeFrame.companionBonds.update(dt);
}

export function sceneNativeFrameStep052(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.challenges.update(dt);
}

export function sceneNativeFrameStep053(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.attackSequences.update(dt);
}

export function sceneNativeFrameStep054(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.guardArts.update(dt);
}

export function sceneNativeFrameStep055(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    nativeFrame.updateDownedCompanions(dt);
}

export function sceneNativeFrameStep070(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateStorm(dt);
}

export function sceneNativeFrameStep071(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateDemonStorm(dt);
}

export function sceneNativeFrameStep072(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateBombardment();
}

export function sceneNativeFrameStep073(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateClutch(dt);
}

export function sceneNativeFrameStep074(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateDeadwakeStream(dt);
}

export function sceneNativeFrameStep075(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateHauntStream(dt);
}

export function sceneNativeFrameStep076(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateStrayingScene(dt);
}

export function sceneNativeFrameStep077(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateDroveScene(dt);
}

export function sceneNativeFrameStep078(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateWispScene(dt);
}

export function sceneNativeFrameStep079(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateQuickening(dt);
}

export function sceneNativeFrameStep080(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateWraithsailDock();
}

export function sceneNativeFrameStep081(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateLongNight(dt);
}

export function sceneNativeFrameStep082(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateNecropolis();
}

export function sceneNativeFrameStep083(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateMigrationStream(dt);
}

export function sceneNativeFrameStep084(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateSwarmStream(dt);
}

export function sceneNativeFrameStep085(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateWorldBosses(dt);
}

export function sceneNativeFrameStep086(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.titans.update(dt);
}

export function sceneNativeFrameStep087(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateBrigandRaid(dt);
}

export function sceneNativeFrameStep088(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.updateNeutralCooldown();
}

export function sceneNativeFrameStep089(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void { // roused neutrals lose interest + re-dormant on disengage
    nativeFrame.pruneEngageTokens();
}

export function sceneNativeFrameStep090(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {     // stale/dead attack-token holders rotate out
    nativeFrame.updateLooters();
}

export function sceneNativeFrameStep091(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {         // scavengers snatch coveted ground drops
    nativeFrame.maybeOpenDemonPortal();
}

export function sceneNativeFrameStep092(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    nativeFrame.maybeOpenCrusadePortal();
}
