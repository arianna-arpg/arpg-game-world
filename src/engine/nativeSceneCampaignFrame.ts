import * as steps from './nativeSceneCampaignFrameSteps';
/** Exact native campaign/interleaved area frame sections. The retained scheduler
 * must supply genuine providers and one campaign clock before activation. */
import {ensureMovementTether} from './movementTether';
import {dist,vec} from '../core/math';
import {Actor} from './actor';
import type {NativeSceneDirectorHost} from './nativeSceneDirectorHost';
import {LEYLINE_CFG} from '../data/leyline';
import {type Doodad} from './levelgen';
import {deathPresentationPose} from './deathPresentation';
import {eyecatchElapsed,ULT_CFG} from './ultimates';
import {dwellOf,sidezoneOf} from '../data/sidezones';
import {transitDwell,transitReach} from '../data/transit';
import {pressingDoor} from './doorPress';
import {connectFloatingZone,placeZoneAt,nearestNode} from './worldgen';
import {Rng} from '../core/rng';
import {biomesForFaction} from '../world/biomes';
import {type TraversalCapture} from './traversal';
import {dimensionDef} from '../world/dimensions';
import {bumpLedger} from '../packages/ledger';
import {INCURSION_ARCHETYPES} from '../packages/overlays/incursion';
import {collectBulletins,pushNotice,type NativeBulletinHost} from '../world/bulletins';
import {MERC_CFG} from '../meta/mercs';

import {hashStr} from './nativeSceneConfig';
import type {World} from './world';
import type {NativeFrameMethod} from './nativeSceneCampaignFrameClosureHost';
import type * as nativeRoad from './nativeSceneFrameTravel';
const DOOR_REACH = 26;
const APPROACH_RADIUS = 150;
export interface NativeFrameTiming {dt:number;rawDt:number;doorPressIntents:World["doorPressIntents"]}
export interface NativeFrameBeginHost {
 deathPresentation:World["deathPresentation"];
 doorPressIntents:World["doorPressIntents"];
 eyecatch:World["eyecatch"];
 flashes:World["flashes"];
 gameOver:World["gameOver"];
 nativeWorldReady:World["nativeWorldReady"];
 screenFade:World["screenFade"];
 texts:World["texts"];
 time:World["time"];
 timeflow:World["timeflow"];
}

export interface NativeFrameRawAreaHost extends NativeSceneDirectorHost {
 scene:World["scene"];
 updateHarvest:World["updateHarvest"];
}

export interface NativeFrameClockHost {
 time:World["time"];
}

export interface NativeFramePrepareHost {
 updateMassRuntimeFrame?:()=>void;
 actorGridRev:World["actorGridRev"];
 actors:World["actors"];
 convexNav:World["convexNav"];
 massRuntime:World["massRuntime"];
 walk:World["walk"];
}

export interface NativeFramePendingTransitionsHost {
 massRuntime:World["massRuntime"];
 nativeWorldReady:World["nativeWorldReady"];
 pendingRespawn:World["pendingRespawn"];
 traversal:World["traversal"];
 updateModeRespawn:World["updateModeRespawn"];
 updateTraversal:World["updateTraversal"];
}

export interface NativeFrameFadesHost {
 lowLifeHitFlash:World["lowLifeHitFlash"];
 mireilleXpBuff:World["mireilleXpBuff"];
}

export interface NativeFrameInteractionsBeforeHarborHost {
 armBuyerShelves:World["armBuyerShelves"];
 clientActionHook:World["clientActionHook"];
 localSeat:World["localSeat"];
 restockVendor:World["restockVendor"];
 time:World["time"];
 updateBountyBoard:World["updateBountyBoard"];
 updateCampfire:World["updateCampfire"];
 updateCaravan:World["updateCaravan"];
 updateFont:World["updateFont"];
 updateHarborBoard:World["updateHarborBoard"];
 updateHoldDefense:World["updateHoldDefense"];
 updateMireille:World["updateMireille"];
 updateMusterHorn:World["updateMusterHorn"];
 updateOracle:World["updateOracle"];
 updateSail:World["updateSail"];
 updateSalvage:World["updateSalvage"];
 updateTraces:World["updateTraces"];
 updateTracker:World["updateTracker"];
 updateTreePips:World["updateTreePips"];
 updateVendors:World["updateVendors"];
 vendorRestockAt:World["vendorRestockAt"];
 zoneHasVendorCounter:World["zoneHasVendorCounter"];
}

export interface NativeFrameHarborholdsHost {
 updateHarborholds:World["updateHarborholds"];
}

export interface NativeFrameInteractionsAfterHarborHost {
 attackSequences:World["attackSequences"];
 challenges:World["challenges"];
 companionBonds:World["companionBonds"];
 guardArts:World["guardArts"];
 updateAmalgamation:World["updateAmalgamation"];
 updateDelver:World["updateDelver"];
 updateDescent:World["updateDescent"];
 updateDownedCompanions:World["updateDownedCompanions"];
 updateDownedSeats:World["updateDownedSeats"];
 updateGloaming:World["updateGloaming"];
 updateLightwells:World["updateLightwells"];
 updateMercOutpost:World["updateMercOutpost"];
 updatePlayerCorpses:World["updatePlayerCorpses"];
 updateQuestGiver:World["updateQuestGiver"];
 updateSailing:World["updateSailing"];
 updateVocationSites:World["updateVocationSites"];
}

export interface NativeFrameWipeHost {
 concludeWipe:World["concludeWipe"];
 gameOver:World["gameOver"];
 pendingRespawn:World["pendingRespawn"];
 scene:World["scene"];
 seats:World["seats"];
}

export interface NativeFrameWorldRoleHost {
 shardWorld:Pick<NonNullable<World['shardWorld']>,'role'>|undefined;
}

export interface NativeFrameWorldSimHost {
 feedMyceliaActivity:World["feedMyceliaActivity"];
 massRuntime:World["massRuntime"];
 odyssey:World["odyssey"];
 sim:World["sim"];
 simView:World["simView"];
}

export interface NativeFrameQuestRescuesHost {
 questRescues:World["questRescues"];
}

export interface NativeFrameWorldLedgerHost {
 drainMyceliaLedger:World["drainMyceliaLedger"];
 graphWorkAvailable:World["graphWorkAvailable"];
 sweepClassClaims:World["sweepClassClaims"];
 updateDeedRecovery:World["updateDeedRecovery"];
 updateForechart:World["updateForechart"];
 updateOmens:World["updateOmens"];
 updateWebSettle:World["updateWebSettle"];
}

export interface NativeFrameContagionHost {
 updateContagionInfection:World["updateContagionInfection"];
}

export interface NativeFrameDeepwinterHost {
 reconcileDeepwinter:World["reconcileDeepwinter"];
}

export interface NativeFrameLocalStreamsHost {
 maybeOpenCrusadePortal:World["maybeOpenCrusadePortal"];
 maybeOpenDemonPortal:World["maybeOpenDemonPortal"];
 pruneEngageTokens:World["pruneEngageTokens"];
 titans:World["titans"];
 updateBombardment:World["updateBombardment"];
 updateBrigandRaid:World["updateBrigandRaid"];
 updateClutch:World["updateClutch"];
 updateDeadwakeStream:World["updateDeadwakeStream"];
 updateDemonStorm:World["updateDemonStorm"];
 updateDroveScene:World["updateDroveScene"];
 updateHauntStream:World["updateHauntStream"];
 updateLongNight:World["updateLongNight"];
 updateLooters:World["updateLooters"];
 updateMigrationStream:World["updateMigrationStream"];
 updateNecropolis:World["updateNecropolis"];
 updateNeutralCooldown:World["updateNeutralCooldown"];
 updateQuickening:World["updateQuickening"];
 updateStorm:World["updateStorm"];
 updateStrayingScene:World["updateStrayingScene"];
 updateSwarmStream:World["updateSwarmStream"];
 updateWispScene:World["updateWispScene"];
 updateWorldBosses:World["updateWorldBosses"];
 updateWraithsailDock:World["updateWraithsailDock"];
}

export interface NativeFrameBulletinsHost extends NativeBulletinHost {
 notices:World["notices"];
 time:World["time"];
}

export interface NativeFrameWorldBridgesHost {
 atZone<T>(zoneId:string,fn:(area:{spawnWarband:World["spawnWarband"]})=>T):T|undefined;
 ledger:World["ledger"];
 sim:World["sim"];
 zoneMap:World["zoneMap"];
}

export interface NativeFrameWarbandMarchesHost {
 updateWarbandMarches:World["updateWarbandMarches"];
}

export interface NativeFrameWorldMintsHost {
 biomeDepthFor:World["biomeDepthFor"];
 biomeFor:World["biomeFor"];
 climateFor:World["climateFor"];
 dimensionBiomeDepthFor:World["dimensionBiomeDepthFor"];
 dimensionBiomeFor:World["dimensionBiomeFor"];
 eventLevel:World["eventLevel"];
 manifest:World["manifest"];
 nextGenId:World["nextGenId"];
 notice:World["notice"];
 noticeOccupied:World["noticeOccupied"];
 occupiedAudience:World["occupiedAudience"];
 player:World["player"];
 presentWorlds():readonly Pick<World,'zone'>[];
 pullToLand:World["pullToLand"];
 relocateToFactionBiome:World["relocateToFactionBiome"];
 sim:World["sim"];
 simView:World["simView"];
 surfaceAnchor:World["surfaceAnchor"];
 visited:World["visited"];
 warpSweepAcc:World["warpSweepAcc"];
 zoneMap:World["zoneMap"];
}

export interface NativeFrameRoadTailHost {
 frameSeats():readonly import('./world').Seat[];
 isPresentLocalPlayer():boolean;
 scanShardRoads():void;
 account:World["account"];
 accountDirty:World["accountDirty"];
 arenaWard:World["arenaWard"];
 beginTraversal:World["beginTraversal"];
 breakArenaSeal:World["breakArenaSeal"];
 caveDwellIdx:World["caveDwellIdx"];
 caveDwellStart:World["caveDwellStart"];
 caveEntrances:World["caveEntrances"];
 caveExitGrace:World["caveExitGrace"];
 discoveredWaypoints:World["discoveredWaypoints"];
 doodads:World["doodads"];
 doorDwellId:World["doorDwellId"];
 doorDwellPos:World["doorDwellPos"];
 doorDwellStart:World["doorDwellStart"];
 doorRefusalAt:World["doorRefusalAt"];
 dwellReachable:World["dwellReachable"];
 encounters:World["encounters"];
 enterSidezone:World["enterSidezone"];
 exitDwellIdx:World["exitDwellIdx"];
 exitDwellStart:World["exitDwellStart"];
 exitLockHint:World["exitLockHint"];
 exitUnder:World["exitUnder"];
 flashes:World["flashes"];
 fractureRun:World["fractureRun"];
 gateUnder:NativeFrameMethod<typeof nativeRoad.sceneGateUnder>;
 holdfastDwellKey:World["holdfastDwellKey"];
 holdfastDwellPos:World["holdfastDwellPos"];
 holdfastDwellStart:World["holdfastDwellStart"];
 holdfastNear:World["holdfastNear"];
 lockHint:World["lockHint"];
 mintSidezone:World["mintSidezone"];
 mouthRefusalUnder:World["mouthRefusalUnder"];
 mouthUnder:World["mouthUnder"];
 onHoldfastDwell:World["onHoldfastDwell"];
 openEncounter:World["openEncounter"];
 player:World["player"];
 playerIdle:World["playerIdle"];
 realmDwellKey:World["realmDwellKey"];
 realmDwellKind:World["realmDwellKind"];
 realmDwellPos:World["realmDwellPos"];
 realmDwellStart:World["realmDwellStart"];
 realmGates:NativeFrameMethod<typeof nativeRoad.sceneRealmGates>;
 seatIdle:World["seatIdle"];
 seats:World["seats"];
 setDoorState:World["setDoorState"];
 shardWorld:Pick<NonNullable<World['shardWorld']>,'role'>|undefined;
 springTrapwork:World["springTrapwork"];
 storyPair:World["storyPair"];
 text:World["text"];
 time:World["time"];
 touchers:World["touchers"];
 trapworks:World["trapworks"];
 travelThrough:World["travelThrough"];
 traversal:World["traversal"];
 triggerFracture:World["triggerFracture"];
 updateTownPortals:World["updateTownPortals"];
 wardDwellSeal:World["wardDwellSeal"];
 wardDwellStart:World["wardDwellStart"];
 wardSealUnder:World["wardSealUnder"];
 waypointBesieged:World["waypointBesieged"];
 waypointPos:World["waypointPos"];
 wpRefusedAt:World["wpRefusedAt"];
 zone:World["zone"];
}

export function sceneNativeFrameBegin(nativeFrame:NativeFrameBeginHost,dt: number):NativeFrameTiming|undefined {
    if (!nativeFrame.gameOver && !nativeFrame.nativeWorldReady()) return;
    const doorPressIntents = nativeFrame.doorPressIntents;
    nativeFrame.doorPressIntents = null;
    if (nativeFrame.gameOver) {
      // Continue the visual aftermath on raw seconds, even under a stale menu
      // hold. Never re-enter combat, AI, rewards, respawns, or input handling.
      if (nativeFrame.deathPresentation && !deathPresentationPose(nativeFrame.deathPresentation.elapsed).complete) {
        const step = Math.max(0, dt);
        nativeFrame.deathPresentation.elapsed += step;
        nativeFrame.screenFade = deathPresentationPose(nativeFrame.deathPresentation.elapsed).fade;
        nativeFrame.time += step; // ambient painters keep breathing behind the epilogue
        for (let i = nativeFrame.flashes.length - 1; i >= 0; i--) {
          nativeFrame.flashes[i].life -= step;
          if (nativeFrame.flashes[i].life <= 0) nativeFrame.flashes.splice(i, 1);
        }
        for (let i = nativeFrame.texts.length - 1; i >= 0; i--) {
          nativeFrame.texts[i].life -= step;
          nativeFrame.texts[i].pos.y -= 28 * step;
          if (nativeFrame.texts[i].life <= 0) nativeFrame.texts.splice(i, 1);
        }
      }
      return;
    }
    // THE TIMEFLOW GATE (engine/timeflow.ts): holds age on RAW seconds
    // first (a freeze must be able to expire out of the very clock it
    // stops), then the folded WORLD scale bends this whole frame — 0 holds
    // the world (the pause menu, an Ultimatum-style choice), fractions are
    // world slow-motion. A held world still RENDERS (the loop keeps
    // drawing); it just stops mutating, wholesale and drift-free.
    const rawDt = dt;
    dt *= nativeFrame.timeflow.beginFrame(rawDt);
    // THE EYECATCH sweep: a spent pane is nulled a beat after it ends, so
    // the co-op wire never ships a stale row forever (engine/ultimates.ts).
    if (nativeFrame.eyecatch
      && eyecatchElapsed(nativeFrame.eyecatch, nativeFrame.timeflow.age)
        > nativeFrame.eyecatch.paneSec + ULT_CFG.expireSlackSec) {
      nativeFrame.eyecatch = null;
    }
    return {dt,rawDt,doorPressIntents};
}

export function sceneNativeFrameRawArea(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {
    steps.sceneNativeFrameStep007(nativeFrame,rawDt,dt);
    steps.sceneNativeFrameStep008(nativeFrame,rawDt,dt);
}

export function sceneNativeFrameClock(nativeFrame:NativeFrameClockHost,dt:number):boolean {
    if (dt <= 0) return false;
    nativeFrame.time += dt;
    return true;
}

export function sceneNativeFramePrepare(nativeFrame:NativeFramePrepareHost):void {
    for (const a of nativeFrame.actors) if (!a.dead) ensureMovementTether(a);
    // Fresh actor-grid epoch: the AI phase just moved monsters (kernels call
    // moveActor directly), so spatial queries from here read current bodies.
    nativeFrame.actorGridRev++;
    // Walk-field tick housekeeping (the WalkField seam): resets the stale
    // path-field refresh budget on whichever grid is steering feet this zone
    // (the layout's own, or the convex nav rake).
    nativeFrame.walk?.beginFrame?.();
    if (nativeFrame.massRuntime) nativeFrame.updateMassRuntimeFrame!();
    nativeFrame.convexNav?.beginFrame?.();
}

export function sceneNativeFramePendingTransitions(nativeFrame:NativeFramePendingTransitionsHost,dt:number):boolean {
    // A survived death's fade/wake sequence (character modes). The world keeps
    // simulating beneath the dark — the death itself was already banked.
    const massBeforeTransition = nativeFrame.massRuntime;
    if (nativeFrame.pendingRespawn) nativeFrame.updateModeRespawn(dt);
    // A live VERTICAL CROSSING (geyser launch / cloud fall): the traversal
    // owns the player until the veil clears; the world keeps simulating.
    if (nativeFrame.traversal) nativeFrame.updateTraversal(dt);
    if (nativeFrame.massRuntime !== massBeforeTransition && !nativeFrame.nativeWorldReady()) return false;
    return true;
}

export function sceneNativeFrameFades(nativeFrame:NativeFrameFadesHost,dt:number):void {
    if (nativeFrame.lowLifeHitFlash > 0) nativeFrame.lowLifeHitFlash = Math.max(0, nativeFrame.lowLifeHitFlash - dt);
    if (nativeFrame.mireilleXpBuff > 0) nativeFrame.mireilleXpBuff = Math.max(0, nativeFrame.mireilleXpBuff - dt);
}

export function sceneNativeFrameInteractionsBeforeHarbor(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {
    steps.sceneNativeFrameStep022(nativeFrame,dt);
    steps.sceneNativeFrameStep023(nativeFrame,dt);
    steps.sceneNativeFrameStep024(nativeFrame,dt);
    steps.sceneNativeFrameStep025(nativeFrame,dt);
    steps.sceneNativeFrameStep026(nativeFrame,dt);
    steps.sceneNativeFrameStep027(nativeFrame,dt);
    steps.sceneNativeFrameStep028(nativeFrame,dt);
    steps.sceneNativeFrameStep029(nativeFrame,dt);
    steps.sceneNativeFrameStep030(nativeFrame,dt);
    steps.sceneNativeFrameStep031(nativeFrame,dt);
    steps.sceneNativeFrameStep032(nativeFrame,dt);
    steps.sceneNativeFrameStep033(nativeFrame,dt);
    steps.sceneNativeFrameStep034(nativeFrame,dt);
    steps.sceneNativeFrameStep035(nativeFrame,dt);
    steps.sceneNativeFrameStep036(nativeFrame,dt);
    steps.sceneNativeFrameStep037(nativeFrame,dt);
    steps.sceneNativeFrameStep038(nativeFrame,dt);
}

export function sceneNativeFrameHarborholds(nativeFrame:NativeFrameHarborholdsHost):void {
    nativeFrame.updateHarborholds();
}

export function sceneNativeFrameInteractionsAfterHarbor(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {
    steps.sceneNativeFrameStep040(nativeFrame,dt);
    steps.sceneNativeFrameStep041(nativeFrame,dt);
    steps.sceneNativeFrameStep042(nativeFrame,dt);
    steps.sceneNativeFrameStep043(nativeFrame,dt);
    steps.sceneNativeFrameStep044(nativeFrame,dt);
    steps.sceneNativeFrameStep045(nativeFrame,dt);
    steps.sceneNativeFrameStep046(nativeFrame,dt);
    steps.sceneNativeFrameStep047(nativeFrame,dt);
    steps.sceneNativeFrameStep048(nativeFrame,dt);
    steps.sceneNativeFrameStep049(nativeFrame,dt);
    steps.sceneNativeFrameStep050(nativeFrame,dt);
    steps.sceneNativeFrameStep051(nativeFrame,dt);
    steps.sceneNativeFrameStep052(nativeFrame,dt);
    steps.sceneNativeFrameStep053(nativeFrame,dt);
    steps.sceneNativeFrameStep054(nativeFrame,dt);
    steps.sceneNativeFrameStep055(nativeFrame,dt);
}

export function sceneNativeFrameWipe(nativeFrame:NativeFrameWipeHost):void {
    // ALL-DOWN terminator: once no seat is left standing, the wipe concludes
    // (per mode: resurface / respawn / run over). Guarded on !gameOver so
    // single-player — where onPlayerDown already concluded this same frame —
    // never double-fires, and on !pendingRespawn so a mode respawn mid-fade
    // (every seat still flagged dead until the wake) isn't re-concluded.
    // THE SCENE COVENANT stands it down whole: on scripted ground the scene
    // owns every fall — the reckoning's felled field lies DOWNED under the
    // director's fade by design (engine/scenes.ts fellSeats), and its later
    // stages stand the party back up; a wipe here would end a run that has
    // not yet begun.
    if (!nativeFrame.gameOver && !nativeFrame.pendingRespawn && !nativeFrame.scene && nativeFrame.seats.length > 0
      && !nativeFrame.seats.some(s => !s.actor.dead && !s.actor.downed
        && (!s.merc || MERC_CFG.mercsCanRevive))) {
      for (const s of nativeFrame.seats) { s.actor.downed = false; s.actor.dead = true; }
      nativeFrame.concludeWipe();
    }
}

export function sceneNativeFrameWorldRole(nativeFrame:NativeFrameWorldRoleHost):boolean {

    // MYCELIA: feed the bloom per-zone event activity (it can't reach the sim) BEFORE the
    // overlay ticks, then reconcile the biome warps it has saturated.
    // THE PRIMARY GATE (shard M1, engine/shardUnits.ts): a sim unit skips the
    // keeper's world sweeps below (the keeper ticks first and drains every world
    // queue); off a shard there is no link and every sweep runs as it always did.
    const unitWorld = nativeFrame.shardWorld?.role === 'unit';
    return unitWorld;
}

export function sceneNativeFrameWorldSim(nativeFrame:NativeFrameWorldSimHost,dt:number,unitWorld:boolean):void {
    if (!unitWorld) nativeFrame.feedMyceliaActivity();
    // Advance the living world (day/night, weather drift, faction territory).
    if (!unitWorld) nativeFrame.sim.update(dt, nativeFrame.simView());
    if (!unitWorld && !nativeFrame.massRuntime) nativeFrame.odyssey.update();
}

export function sceneNativeFrameQuestRescues(nativeFrame:NativeFrameQuestRescuesHost):void { // worldmass places have not adopted graph campaign targets yet
    nativeFrame.questRescues.update();
}

export function sceneNativeFrameWorldLedger(nativeFrame:NativeFrameWorldLedgerHost,unitWorld:boolean):void {
    // THE FORECHART: keep the veiled halo minted ahead of the walker, and grow
    // any far soundings the overlays have requested (world/forechart.ts).
    if (!unitWorld && nativeFrame.graphWorkAvailable()) nativeFrame.updateForechart();
    // THE SETTLE SWEEP: mint-time settles are local — chained displacement
    // can leave a pair past the hover floor across a pool edge; the slow
    // whole-chart pass self-heals it (no-op scan on a clean chart).
    if (!unitWorld) nativeFrame.updateWebSettle();
    // THE OMENS: the world murmurs about what waits unfound (world/omens.ts).
    if (!unitWorld) nativeFrame.updateOmens();
    // THE OBJECTIVE WEB: a class earned mid-run lands mid-run.
    if (!unitWorld) nativeFrame.updateDeedRecovery();
    if (!unitWorld) nativeFrame.sweepClassClaims();
    if (!unitWorld) nativeFrame.drainMyceliaLedger();
}

export function sceneNativeFrameContagion(nativeFrame:NativeFrameContagionHost):void {
    nativeFrame.updateContagionInfection();
}

export function sceneNativeFrameDeepwinter(nativeFrame:NativeFrameDeepwinterHost,unitWorld:boolean):void {
    if (!unitWorld) nativeFrame.reconcileDeepwinter();
}

export function sceneNativeFrameLocalStreams(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {
    steps.sceneNativeFrameStep070(nativeFrame,dt);
    steps.sceneNativeFrameStep071(nativeFrame,dt);
    steps.sceneNativeFrameStep072(nativeFrame,dt);
    steps.sceneNativeFrameStep073(nativeFrame,dt);
    steps.sceneNativeFrameStep074(nativeFrame,dt);
    steps.sceneNativeFrameStep075(nativeFrame,dt);
    steps.sceneNativeFrameStep076(nativeFrame,dt);
    steps.sceneNativeFrameStep077(nativeFrame,dt);
    steps.sceneNativeFrameStep078(nativeFrame,dt);
    steps.sceneNativeFrameStep079(nativeFrame,dt);
    steps.sceneNativeFrameStep080(nativeFrame,dt);
    steps.sceneNativeFrameStep081(nativeFrame,dt);
    steps.sceneNativeFrameStep082(nativeFrame,dt);
    steps.sceneNativeFrameStep083(nativeFrame,dt);
    steps.sceneNativeFrameStep084(nativeFrame,dt);
    steps.sceneNativeFrameStep085(nativeFrame,dt);
    steps.sceneNativeFrameStep086(nativeFrame,dt);
    steps.sceneNativeFrameStep087(nativeFrame,dt);
    steps.sceneNativeFrameStep088(nativeFrame,dt);
    steps.sceneNativeFrameStep089(nativeFrame,dt);
    steps.sceneNativeFrameStep090(nativeFrame,dt);
    steps.sceneNativeFrameStep091(nativeFrame,dt);
    steps.sceneNativeFrameStep092(nativeFrame,dt);
}

export function sceneNativeFrameBulletins(nativeFrame:NativeFrameBulletinsHost,unitWorld:boolean):void {
    // WORLD BULLETINS (world/bulletins.ts): every registered source drains its
    // fresh "something happened somewhere" lines — faction conquests, crusade
    // front shifts, and any future overlay's notices — through ONE registry.
    // A new overlay registers a source at import time; no engine edit.
    // Lines land in THE NOTICE FEED (screen-anchored, stacked, per-line
    // clocks, channel-curated at draw) — never in the overhead float lane,
    // where world news used to fight the combat text for the same pixels.
    if (!unitWorld) for (const b of collectBulletins(nativeFrame)) {
      pushNotice(nativeFrame.notices, b, nativeFrame.time);
    }
}

export function sceneNativeFrameWorldBridges(nativeFrame:NativeFrameWorldBridgesHost,unitWorld:boolean):void {

    // THE DEADWAKE collides: charted zones its tide has rolled onto AND won the
    // consume roll on (the roll is the overlay's) have their active world-event
    // CONSUMED outright — the player's OWN zone gets the stream instead, never
    // consumed. The overlay emits the won zones; the engine bridges to the other
    // fields (overlays can't reach each other), gated by the surge's `consume`
    // toggles. Weather is intentionally excluded (a tide of the dead can't snuff
    // the sky), so no weather here.
    const dwf = nativeFrame.sim.deadwakeField;
    if (!unitWorld && dwf && dwf.consumedZones.length) {
      const con = dwf.surge().consume;
      for (const zid of dwf.consumedZones) {
        if (con.demonInvasion) nativeFrame.sim.demonFieldFor(nativeFrame.zoneMap[zid]?.dimension)?.resolveInvasion(zid);
        if (con.crusade) nativeFrame.sim.crusadeField?.resolveCrusadeZone(zid);
      }
      dwf.consumedZones.length = 0;
    }

    // THE SWARMING preys on the herds and plants its roosts. Predation: while
    // a wing is out, every live migration band is offered to the swarm field
    // — the roll, the once-latch and the gorging live on the OVERLAY (its own
    // rng, deterministic); the engine only bridges the two pure fields
    // (overlays can't reach each other) and pays the ledger. Planting: a
    // completed wing's far pole takes root — drained here into KEYED biome
    // warps (restore re-queues them, so a resumed save re-roots).
    const swf = nativeFrame.sim.swarmingField;
    if (!unitWorld && swf) {
      const mf2 = nativeFrame.sim.migrationField;
      if (mf2) {
        for (const herdId of swf.predate(mf2.herdBands())) {
          if (mf2.consume(herdId)) bumpLedger(nativeFrame.ledger, 'swarming_fed');
        }
      }
      for (const p of swf.takeRoostWarps()) {
        nativeFrame.sim.biomeField.setWarp(`swarm_roost_${p.id}`, {
          id: `swarm_roost_${p.id}`,
          center: { x: p.x, y: p.y },
          radius: p.radius, biome: p.biome, strength: p.strength,
          label: 'A Swarming planted a brood ground — the sand takes root',
        });
      }
    }

    // WARBAND ARRIVALS: a host that just reached its target node, while YOU stand
    // in that zone, marches in for real — a coherent pack at the entry it came by.
    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains the arrivals once; the
    // pack lands in the World standing in the target zone, and nowhere else.
    if (!unitWorld) for (const host of nativeFrame.sim.invasion.arrivals) {
      nativeFrame.atZone(host.targetZoneId, w => w.spawnWarband(host));
    }
    if (!unitWorld) nativeFrame.sim.invasion.arrivals.length = 0;
}

export function sceneNativeFrameWarbandMarches(nativeFrame:NativeFrameWarbandMarchesHost):void {
    nativeFrame.updateWarbandMarches();
}

export function sceneNativeFrameWorldMints(nativeFrame:NativeFrameWorldMintsHost,dt:number,unitWorld:boolean):void {

    // DEMON INVASION: mint the epicenter zone at its coordinate (within the visible
    // map) so the player can travel toward it and fight the Balor. Minted FLOATING
    // — no forced road trail; a path forms as the player explores toward it (the
    // floating-zone drain below). The pure overlay can't reach worldgen, so it
    // queues requests we drain here (host/SP only — clients get it via sendZone).
    //
    // EVERY instance drains — each DIMENSION's rifts tear in its own graph:
    // hell's epicenters carry hell's dimension/palette/level pressure and never
    // touch the surface biome field (only surface events scorch the surface wash).
    if (!unitWorld) for (const dfi of nativeFrame.sim.demonFieldsAll()) {
      if (!dfi.mintRequests.length) continue;
      const dfDim = dfi.dimension; // undefined = the surface instance
      for (const req of dfi.mintRequests) {
        if (nativeFrame.zoneMap[req.zoneKey]) { dfi.bindTarget(req.invId, req.zoneKey); continue; }
        // BIOME: steer the rift toward EXISTING demon land (rift/volcanic) —
        // placement preference, never transformation. LEVEL: the radial field
        // at the (relocated) coord, not the player. (Hell needs no steering —
        // its whole field is demon country already.)
        const rl = dfDim ? { coord: req.coord, warpBiome: null as string | null }
          : nativeFrame.relocateToFactionBiome(req.coord, 'demon');
        // THE TRANSIENCE LAW (docs/engine/transience.md): the invasion NEVER
        // warps the biome field. On real demon country the mint field-resolves
        // as ever (local rift-family face); with none near (rl.warpBiome set —
        // the old scorch-warp case) the rift stands as an explicit INTRUSION:
        // spec.tileset wins, wearing its own authored biome, and the land
        // around it stays exactly what it was. Its in-zone presence is the
        // pinned Demon Storm (event weather + dress), which lifts with the
        // invasion — the map's storm ring is the only cartography it gets.
        const anchor = nativeFrame.zoneMap[req.anchorZoneId]
          ?? nearestNode(nativeFrame.zoneMap, rl.coord, undefined, dfDim)
          ?? (dfDim ? nativeFrame.zoneMap[dimensionDef(dfDim).entry?.gate.id ?? ''] : undefined)
          ?? nativeFrame.surfaceAnchor();
        const def = placeZoneAt(rl.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {
          id: req.zoneKey, tileset: req.tileset,
          level: nativeFrame.eventLevel(rl.coord) + (dfDim ? dimensionDef(dfDim).levelBonus ?? 0 : 0),
          objective: { kind: 'clear' }, forceWaypoint: true, forceFrontiers: 1, floating: true,
          ...(rl.warpBiome ? {} : { fieldBiome: true }),
          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,
          biomeFor: dfDim ? nativeFrame.dimensionBiomeFor(dfDim) : nativeFrame.biomeFor,
          biomeDepthFor: dfDim ? nativeFrame.dimensionBiomeDepthFor(dfDim) : nativeFrame.biomeDepthFor,
          climateFor: nativeFrame.climateFor,
          ...(dfDim ? { dimension: dfDim } : {}),
        });
        def.eventOwned = true; // the demon epicenter — no other overlay squats here
        nativeFrame.zoneMap[req.zoneKey] = def;
        // NB: NO sim.onNodeCharted here — a floating zone isn't on the graph yet
        // (it seeds its territory when connectFloatingZone wires it in, below).
        dfi.bindTarget(req.invId, req.zoneKey);
        // Announce only invasions of the plane the player stands in — a hell
        // rift tearing while you walk the surface stays hell's own business.
        // THE OCCUPIED LAW (shard M1-W3): heard by whoever stands in that plane.
        const hearers = nativeFrame.occupiedAudience(z => (dfDim ?? 'surface') === (z.dimension ?? 'surface'));
        if (hearers !== null) {
          nativeFrame.noticeOccupied(hearers, 'A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events');
        }
      }
      dfi.mintRequests.length = 0;
    }

    // (THE WAR BELOW mints NOTHING: thrones are field anchors, the lords
    // manifest only in zones the player explores — the underworld_war
    // zone-runtime row. The war's whole footprint is the field itself.)

    // (CRUSADES mint NOTHING on the overworld: a crusade is a warfield
    // campaign — its territory IS the field, real zones under it raise the
    // faction's works at generation from their local control, and the only
    // minted ground is the throne ARENA through the sanctum gate. The engine's
    // only overworld touch is the anchored biome claim + release in the warp
    // sweep below.)
    const cf = nativeFrame.sim.crusadeField;

    // CONCLAVE → ELDRITCH INCURSION: when the incubation counter maxes, the Conclave
    // hands an ignition to the shared Incursion field (overlays can't reach each
    // other — the engine bridges). The observer LANDS far off in the wilds.
    const ig = unitWorld ? undefined : nativeFrame.sim.conclaveField?.takeIgnition();
    if (ig) {
      // THE OCCUPIED LAW (shard M1-W3): the ignite level reads every occupied
      // zone's level beside the world's character level (solo: the standing zone).
      let level = nativeFrame.player.level;
      for (const w of nativeFrame.presentWorlds()) level = Math.max(level, w.zone.level);
      const info = nativeFrame.sim.incursionField.ignite(ig.archetype, ig.origin, level);
      if (info) nativeFrame.notice(info.announce, info.color, 18, 'events');
    }
    // Drain incursion mints: a CLUSTER of hidden (concealed + floating) epicenter
    // zones far from the charted frontier — the map neither draws them nor zooms to
    // them; a road forms only when the player explores near. Each warps the biome
    // field, locking its ground into the archetype's blight. (Host/SP only.)
    const inc = nativeFrame.sim.incursionField;
    if (!unitWorld && inc.mintRequests.length) {
      for (const req of inc.mintRequests) {
        if (nativeFrame.zoneMap[req.zoneKey]) { inc.bindEpicenter(req.id, req.zoneKey); continue; }
        // Even an alien intrusion needs GROUND to blight — pulled ashore.
        req.coord = nativeFrame.pullToLand(req.coord);
        const anchor = nearestNode(nativeFrame.zoneMap, req.coord) ?? nativeFrame.surfaceAnchor();
        // An Incursion WARPS its ground to the blight (eldritch) — an alien intrusion,
        // not a relocation — so its biome is intentionally fixed. LEVEL still obeys the
        // radial field at its coord (not the player's level at ignition).
        const def = placeZoneAt(req.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {
          id: req.zoneKey, tileset: req.tileset, level: nativeFrame.eventLevel(req.coord),
          objective: { kind: 'clear' }, floating: true, concealed: true, noFactionWar: true,
          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,
        });
        def.eventOwned = true; // incursion epicenter — no other overlay squats here
        nativeFrame.zoneMap[req.zoneKey] = def;
        // Re-anchor the overlay's epicenter (tentacles + intensity capsules) on
        // where the zone ACTUALLY landed — ashore, post anti-crowd.
        inc.bindEpicenter(req.id, req.zoneKey, def.map);
        // KEYED blight warp (the transience law): the halo holds while the
        // epicenter lives — the warp sweep below re-asserts it every beat
        // (which also re-raises it on a resumed save) and RELEASES it when
        // the Observer falls, so the stain fades off the healed land instead
        // of scarring the world forever. Presentation + attribution only:
        // ground minted inside it still comes out its TRUE biome.
        nativeFrame.sim.biomeField.setWarp(`incursion_${req.id}`, {
          center: def.map, radius: req.biomeRadius, biome: req.biome, strength: req.biomeStrength,
          label: 'Eldritch incursion — the ground is blighted',
        });
      }
      inc.mintRequests.length = 0;
    }

    // EVENT WARPS RECEDE WITH THEIR EVENTS (the transience law,
    // docs/engine/transience.md): every warp is keyed + owned, reconciled here
    // against its owner's own liveness (peek) every beat — the live half
    // RE-ASSERTS (which also re-raises warps a resumed save lost with the
    // transient field), the dead half RELEASES (a gradual fade at
    // BIOME_FIELD_CFG.warpFadePerSec — the land HEALS, it never snaps). Every
    // ending — kill, burnout, collapse, package absent — heals by construction.
    if (!unitWorld) nativeFrame.warpSweepAcc += dt;
    if (!unitWorld && nativeFrame.warpSweepAcc >= 1) {
      nativeFrame.warpSweepAcc = 0;
      const bf = nativeFrame.sim.biomeField;
      const liveEps = new Map<string, { coord: { x: number; y: number }; archetype: string }>();
      for (const p of inc.peek()) {
        for (const ep of p.epicenters) liveEps.set(ep.id, { coord: ep.coord, archetype: p.archetype });
      }
      for (const wid of bf.warpIds()) {
        if (wid.startsWith('demon_')) {
          // No producer since the transience pass (invasions never warp the
          // field) — release any stale stain a mid-session module swap left.
          bf.release(wid);
        } else if (wid.startsWith('incursion_')) {
          // The blight fades once its epicenter falls (or the whole landing
          // collapses) — the deliberate inversion of the old permanent scar.
          if (!liveEps.has(wid.slice('incursion_'.length))) bf.release(wid);
        } else if (wid.startsWith('crusade_')) {
          const cid = wid.slice('crusade_'.length);
          if (!cf || !cf.peek().some(c => c.id === cid)) bf.release(wid);
        } else if (wid.startsWith('swarm_roost_')) {
          // A planted roost stands while its field remembers it (standing
          // ecology BY the snapshot — and cullable: a culled roost, or a run
          // without the package, heals within a beat).
          const rid = wid.slice('swarm_roost_'.length);
          if (!nativeFrame.sim.swarmingField?.hasRoost(rid)) bf.release(wid);
        }
      }
      // LIVE INCURSION EPICENTERS KEEP THEIR HALO: re-assert each bound
      // epicenter's keyed warp (idempotent replace; also revives after a
      // resume — the transient field carries nothing across saves itself).
      for (const [epId, at] of liveEps) {
        const a = INCURSION_ARCHETYPES[at.archetype];
        if (!a) continue;
        bf.setWarp(`incursion_${epId}`, {
          center: { x: at.coord.x, y: at.coord.y }, radius: a.biomeWarp.radius,
          biome: a.biome, strength: a.biomeWarp.strength,
          label: 'Eldritch incursion — the ground is blighted',
        });
      }
      // AN ANCHORED CRUSADE CLAIMS ITS GROUND: once the throne stands, the
      // heartland's biome turns to the faction's own country (biomesForFaction
      // — sylvan groves rise, graves spread for the dead). Keyed per crusade;
      // the release branch above heals the land when the war breaks.
      if (cf) {
        const claimed = new Set(bf.warpIds());
        for (const c of cf.peek()) {
          if (!c.anchored || claimed.has(`crusade_${c.id}`)) continue;
          const biome = biomesForFaction(c.faction)[0];
          if (!biome) continue;
          bf.setWarp(`crusade_${c.id}`, {
            center: { x: c.heart.x, y: c.heart.y }, radius: cf.surge().field.wellRange,
            biome, strength: 1, label: 'Crusade — the land turns to its faction\'s country',
          });
        }
      }
    }

    // FLOATING ZONES wire into the charted graph — a road forms (connectFloatingZone),
    // so there's no forced trail at spawn: the player EXPLORES near one (any
    // rift/quest target within APPROACH_RADIUS of the zone they're in) and the
    // path appears as they approach. Host/SP only; new exits stream to clients
    // via the zone snapshot; syncZoneExits() (below) surfaces the portal live
    // if the road landed on the player's zone.
    // THE OCCUPIED LAW (shard M1-W3): "near the player" is near any zone a
    // player's World stands in (solo: the standing zone).
    const posts = unitWorld ? [] : nativeFrame.presentWorlds();
    if (!unitWorld) for (const z of Object.values(nativeFrame.zoneMap)) {
      if (!z.floating) continue;
      // Proximity only counts WITHIN a dimension — the planes share one
      // coordinate space, and a hell rift must not wire in because the player
      // walks surface ground that happens to overlap its numbers.
      const nearPlayer = posts.some(w => (z.dimension ?? 'surface') === (w.zone.dimension ?? 'surface')
        && Math.hypot(z.map.x - w.zone.map.x, z.map.y - w.zone.map.y) <= APPROACH_RADIUS);
      if (!nearPlayer) continue;
      connectFloatingZone(z, nativeFrame.zoneMap, new Rng((nativeFrame.manifest.seed ^ hashStr(z.id)) >>> 0), APPROACH_RADIUS, nativeFrame.visited);
      if (z.floating) continue; // no local road yet; retry as exploration grows
      nativeFrame.sim.onNodeCharted(z, nativeFrame.simView()); // now on the graph — seed its territory
      nativeFrame.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'
          : 'A path opens toward your quest!', '#c8a8e8', 15, 'world');
    }
}

export function sceneNativeFrameRoadTail(nativeFrame:NativeFrameRoadTailHost,dt:number,doorPressIntents:World["doorPressIntents"]):void {

    if (nativeFrame.updateTownPortals(dt)) return; // travel ends this old-zone frame

    // Waypoint attunement: brush against it once and it's yours for the run.
    // A BESIEGED stone (the 'leyline' objective — waypointBesieged, the one
    // predicate) REFUSES the brush while its siphon drinks: the refusal
    // floats throttled, and the moment the thief falls the same brush
    // attunes. Radius is data (LEYLINE_CFG.attuneRadius — the historical 70).
    // THE ACTING SEAT: any standing player's brush attunes it (the touchers).
    const wpAt = nativeFrame.waypointPos;
    if (wpAt && !nativeFrame.discoveredWaypoints.has(nativeFrame.zone.id)
      && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the stone stands on the ground floor (placed on the base grid)
        && dist(h.pos, wpAt) <= LEYLINE_CFG.attuneRadius)) {
      if (nativeFrame.waypointBesieged()) {
        if (nativeFrame.time - nativeFrame.wpRefusedAt > 2.5) {
          nativeFrame.wpRefusedAt = nativeFrame.time;
          nativeFrame.flashes.push({ pos: vec(wpAt.x, wpAt.y),
            radius: LEYLINE_CFG.attuneRadius * 0.5, color: LEYLINE_CFG.beam, life: 0.5, maxLife: 0.5 });
        }
      } else {
        nativeFrame.discoveredWaypoints.add(nativeFrame.zone.id);
        nativeFrame.flashes.push({
          pos: vec(wpAt.x, wpAt.y),
          radius: 50, color: '#5ad8d8', life: 0.5, maxLife: 0.5,
        });
      }
    }

    // Sidezone mouths (data/sidezones.ts): DWELL on one (stand idle) to descend
    // — running OVER a mouth never yanks you under (mirrors the portal dwell).
    // Just after climbing out you stand AT the mouth, so a grace flag holds
    // until you step clear once — otherwise you'd dwell straight back down.
    // Runs INSIDE sidezones too — that's the ladder (a deeper mouth in a cave
    // is dwelled exactly like a surface one; enterSidezone stacks the way home).
    // indoorsOnly kinds (the cellar hatch) also demand the player stand under
    // the SAME ROOF as the mouth — nobody dwells a hatch through a house wall.
    if ((!nativeFrame.isPresentLocalPlayer() || (!nativeFrame.player.dead && !nativeFrame.player.downed)) && !nativeFrame.traversal) {
      // THE LIFT (shard M1 W2): the mouth scan is mouthUnder, shared with the
      // shard scanner (engine/shardRoads.ts), which reads each seat's body.
      const mouthIdx = nativeFrame.isPresentLocalPlayer() ? nativeFrame.mouthUnder(nativeFrame.player) : -1;
      if (nativeFrame.caveExitGrace) {
        if (mouthIdx < 0) nativeFrame.caveExitGrace = false;
        nativeFrame.caveDwellIdx = -1;
      } else {
        // THE CONDITIONED DOOR's refusal read: standing on a door whose cond
        // does NOT hold floats its schedule (throttled) — a closed barrow
        // tells you it is closed, and roughly when it will not be. A SEALED
        // mouth (sealedBy — the exhumation law) floats its own line through
        // the same clock: the shut door names the ring that opens it. A
        // hosted world speaks it per seat instead (the scanner's note row).
        if (!nativeFrame.shardWorld && mouthIdx < 0 && nativeFrame.time - nativeFrame.doorRefusalAt > 2.5 && nativeFrame.isPresentLocalPlayer()) {
          const shut = nativeFrame.mouthRefusalUnder(nativeFrame.player);
          if (shut) {
            nativeFrame.doorRefusalAt = nativeFrame.time;
            nativeFrame.text(vec(shut.pos.x, shut.pos.y - 26), shut.text, '#b8a8d8', 12);
          }
        }
        // Dwell builds only while standing idle AND not being knocked (a knockback
        // onto a mouth must never carry you under).
        if (mouthIdx >= 0 && nativeFrame.playerIdle() && !nativeFrame.player.push) {
          if (nativeFrame.caveDwellIdx !== mouthIdx) { nativeFrame.caveDwellIdx = mouthIdx; nativeFrame.caveDwellStart = nativeFrame.time; }
          const cm = nativeFrame.caveEntrances[mouthIdx];
          if (nativeFrame.time - nativeFrame.caveDwellStart >= dwellOf(cm.kind)) {
            nativeFrame.caveDwellIdx = -1;
            // A TRAVERSAL mouth (SidezoneDef.traversal — the geyser) rides the
            // vertical-crossing cinematic: mint the pocket NOW (its `below`
            // anchor sizes the understory capture), start the crossing, and
            // step in behind the veil. Classic mouths keep the instant step.
            const sz = sidezoneOf(cm.kind);
            if (sz?.traversal) {
              const dest = nativeFrame.mintSidezone(cm);
              const cap: TraversalCapture | undefined = dest?.below ? {
                key: dest.id,
                ox: dest.below.ax - dest.size.w / 2, oy: dest.below.ay - dest.size.h / 2,
                w: dest.size.w, h: dest.size.h,
              } : undefined;
              if (dest && nativeFrame.beginTraversal(sz.traversal, { capture: cap, swap: () => nativeFrame.enterSidezone(cm) })) return;
            }
            nativeFrame.enterSidezone(cm);
            return; // everything else this frame belongs to the old zone
          }
        } else {
          nativeFrame.caveDwellIdx = -1;
        }
        // STRUCTURE DOORS: push (dwell) on a closed openable door and it swings.
        // Idle remains valid; an opted-in slab also accepts deliberate walking
        // toward it. Quiescence/story/mode gates and nearest pairing still win;
        // ANY party seat can push (a co-op remote hero opens a gate the host
        // never walked to). Per-door data may override the dwell time.
        let onDoor: Doodad | null = null; let doorD = Infinity;
        for (const seat of nativeFrame.frameSeats()) {
          const hero = seat.actor;
          if (hero.dead || hero.downed || hero.push || !hero.isQuiescent()) continue;
          const idle = nativeFrame.seatIdle(seat);
          for (const d of nativeFrame.doodads) {
            const dr = d.door;
            if (!dr || dr.open || dr.broken) continue;
            if (dr.mode !== 'dwell' && dr.mode !== 'both') continue;
            if (!idle && !pressingDoor(dr.press, doorPressIntents?.get(seat.id), hero, d)) continue;
            const dd = dist(hero.pos, d.pos);
            // Reach honors the 'door' transit row ('radius' today: a push is
            // contact — the plank itself is the occluder a ray would argue with).
            // THE SAME-STORY LAW: a door swings only for a hero on ITS story
            // (no pushing the inn's door open from the rooms above it).
            if (dd <= d.radius + hero.radius + DOOR_REACH && dd < doorD
              && nativeFrame.dwellReachable(hero.pos, d.pos, transitReach('door'), { from: hero.tier ?? 0, to: d.tier ?? 0 })) { doorD = dd; onDoor = d; }
          }
        }
        if (onDoor?.door) {
          if (nativeFrame.doorDwellId !== onDoor.door.id) {
            nativeFrame.doorDwellId = onDoor.door.id;
            nativeFrame.doorDwellStart = nativeFrame.time;
            nativeFrame.doorDwellPos = vec(onDoor.pos.x, onDoor.pos.y);
          }
          if (nativeFrame.time - nativeFrame.doorDwellStart >= (onDoor.door.dwell ?? transitDwell('door'))) {
            nativeFrame.doorDwellId = '';
            const lesson = onDoor.door.lesson;
            nativeFrame.setDoorState(onDoor.door.id, 'open');
            // A TEACHING door (DoodadDoor.lesson) graduates the ACCOUNT on its
            // first dwell-open — the flask-lesson pattern: any future copy of
            // a door carrying this key mints already open (loadZone). The push
            // was the tutorial; nobody is taught to open a door twice.
            if (lesson && nativeFrame.account && !(nativeFrame.account.ledger[lesson] ?? 0)) {
              nativeFrame.account.ledger[lesson] = 1;
              nativeFrame.accountDirty = true;
            }
          }
        } else {
          nativeFrame.doorDwellId = '';
        }
        // THE SWITCH LANE (the trapworks door lane — engine/trapworks.ts,
        // docs/engine/trapworks.md). Two halves, one door-fabric seat:
        // (1) LEVER PULLS: a lever is a DOOR-RECORD doodad (DoodadDoor.mode
        //     'pull') — the pull IS the door sweep's own dwell grammar
        //     (reach, idle, the ring, one-way persistence, the co-op doors
        //     channel) with an honest verb. The sweep above skips 'pull'
        //     records; the throw lands here: dwell done → the record opens
        //     through THE one door gate (silently — the spring's announce
        //     speaks instead) and every armed lever trapwork naming it
        //     springs with the puller's credit. tw.pullStart is the truth;
        //     the doorDwell trio is fed as a VIEW so the standing ring
        //     draws the pull (the sweep clears the id each frame the hero
        //     stands off dwell doors — feeding after it is the contract,
        //     and render reads after update).
        // (2) SWITCHED DOORS (DoodadDoor.mode 'switched'): the push never
        //     opens them — a hero at one learns there IS a mechanism (the
        //     conditioned-mouth refusal idiom, the shared refusal clock).
        for (const tw of nativeFrame.trapworks) {
          const lt = tw.spec.trigger;
          if (lt.kind !== 'lever' || tw.state !== 'armed' || !lt.door) continue;
          const ld = nativeFrame.doodads.find(x => x.door?.id === lt.door);
          const rec = ld?.door;
          if (!ld || !rec || rec.mode !== 'pull' || rec.open || rec.broken) { tw.pullStart = undefined; continue; }
          let puller: Actor | null = null; let pullD = Infinity;
          for (const seat of nativeFrame.frameSeats()) {
            const hero = seat.actor;
            if (hero.dead || hero.downed || hero.push || !nativeFrame.seatIdle(seat)) continue;
            const dd = dist(hero.pos, ld.pos);
            if (dd <= ld.radius + hero.radius + DOOR_REACH && dd < pullD
              && nativeFrame.dwellReachable(hero.pos, ld.pos, transitReach('door'), nativeFrame.storyPair(hero, ld))) { pullD = dd; puller = hero; }
          }
          if (!puller) { tw.pullStart = undefined; continue; }
          tw.pullStart ??= nativeFrame.time;
          nativeFrame.doorDwellId = rec.id;
          nativeFrame.doorDwellStart = tw.pullStart;
          nativeFrame.doorDwellPos = vec(ld.pos.x, ld.pos.y);
          if (nativeFrame.time - tw.pullStart >= (rec.dwell ?? transitDwell('door'))) {
            tw.pullStart = undefined;
            nativeFrame.doorDwellId = '';
            nativeFrame.setDoorState(rec.id, 'open', { silent: true });
            nativeFrame.springTrapwork(tw, puller);
          }
        }
        if (nativeFrame.time - nativeFrame.doorRefusalAt > 2.5) {
          refuse: for (const seat of nativeFrame.frameSeats()) {
            const hero = seat.actor;
            if (hero.dead || hero.downed) continue;
            for (const d of nativeFrame.doodads) {
              const dr = d.door;
              if (!dr || dr.open || dr.broken || dr.mode !== 'switched') continue;
              if (dist(hero.pos, d.pos) > d.radius + hero.radius + DOOR_REACH) continue;
              nativeFrame.doorRefusalAt = nativeFrame.time;
              nativeFrame.text(vec(d.pos.x, d.pos.y - 26), 'held fast — some mechanism answers elsewhere…', '#c8b47a', 12);
              break refuse;
            }
          }
        }
        // REALM GATES (demon rift / crusade sanctum / necropolis / fracture rift):
        // DWELL on one (stand idle ~0.5s) to step through — so running OVER a gate
        // never yanks you into a realm without meaning to (mirrors the portal + cave
        // dwell; a knockback onto a gate can't carry you in either). Gather the open
        // gates with their enter actions and dwell on the NEAREST one you stand on.
        // THE LIFT (shard M1 W2): the gate list is realmGates and the nearest
        // gate under a body gateUnder, shared with the shard scanner.
        const gates = nativeFrame.realmGates();
        const onGate = nativeFrame.isPresentLocalPlayer() ? nativeFrame.gateUnder(nativeFrame.player, gates) : null;
        if (onGate && nativeFrame.playerIdle() && !nativeFrame.player.push) {
          if (nativeFrame.realmDwellKey !== onGate.key) {
            nativeFrame.realmDwellKey = onGate.key; nativeFrame.realmDwellKind = onGate.kind;
            nativeFrame.realmDwellPos = onGate.pos; nativeFrame.realmDwellStart = nativeFrame.time;
          }
          if (nativeFrame.time - nativeFrame.realmDwellStart >= transitDwell(`realm_gate:${onGate.kind}`)) {
            nativeFrame.realmDwellKey = '';
            onGate.enter();
            return; // entering a realm — the rest of this frame belongs to the old zone
          }
        } else {
          nativeFrame.realmDwellKey = ''; // stepped off / acting / knocked → the dwell resets
        }
        // ARENA WARD SEALS (data/arenas.ts): dwell one to SHATTER it — the same
        // deliberate linger as every transit; the 'ward_seal' transit row sets
        // the feel. Breaking the last seal manifests the warded boss.
        if (nativeFrame.arenaWard) {
          const onSeal = nativeFrame.isPresentLocalPlayer() ? nativeFrame.wardSealUnder(nativeFrame.player) : null; // THE LIFT (shard M1 W2)
          if (onSeal && nativeFrame.playerIdle() && !nativeFrame.player.push) {
            if (nativeFrame.wardDwellSeal !== onSeal) { nativeFrame.wardDwellSeal = onSeal; nativeFrame.wardDwellStart = nativeFrame.time; }
            if (nativeFrame.time - nativeFrame.wardDwellStart >= transitDwell(`ward_seal:${onSeal.kind}`)) {
              nativeFrame.wardDwellSeal = null;
              nativeFrame.breakArenaSeal(onSeal);
            }
          } else {
            nativeFrame.wardDwellSeal = null;
          }
        }
        // HOLDFAST: dwell beside the toll keeper to pay (carried Essence, or a gem
        // seized at random — the guardian's UnlockSpec decides). Only while the gate
        // is sealed + the wardens un-roused — drawing steel cancels the parley. A
        // CONSUMED latch ('done') keeps it from re-firing while you stand; it re-arms
        // ONLY when you step out of the ring (one parley per approach — a refused
        // toll or acting beside the keeper never re-prompts; the Dwell-gate
        // discipline, hand-rolled for the ring).
        const keeper = nativeFrame.isPresentLocalPlayer() ? nativeFrame.holdfastNear(nativeFrame.player) : null; // THE LIFT (shard M1 W2): the keeper when near, else null
        const nearKeeper = !!keeper;
        if (!nearKeeper) {
          nativeFrame.holdfastDwellKey = ''; // stepped out of the ring → re-arm
        } else if (nativeFrame.holdfastDwellKey !== 'done') {
          if (nativeFrame.playerIdle() && !nativeFrame.player.push) {
            if (nativeFrame.holdfastDwellKey !== 'holdfast') { nativeFrame.holdfastDwellKey = 'holdfast'; nativeFrame.holdfastDwellPos = vec(keeper!.pos.x, keeper!.pos.y); nativeFrame.holdfastDwellStart = nativeFrame.time; }
            if (nativeFrame.time - nativeFrame.holdfastDwellStart >= transitDwell('holdfast')) {
              nativeFrame.holdfastDwellKey = 'done'; // consumed — won't re-fire until you move away
              nativeFrame.onHoldfastDwell();
            }
          } else {
            nativeFrame.holdfastDwellKey = ''; // acting/knocked resets PROGRESS — never the consumed latch
          }
        }
      }
    }

    // Encounter diamonds: step onto a dormant one to OPEN it. No return — you
    // keep playing in this zone; the field grows around you and floods with foes.
    // (EXTRACT encounters never step-open: theirs is the DWELL — an act of
    // attention, armed by updateExtraction — a knockback across a seam must
    // not start a defense.)
    // THE ACTING SEAT: any standing player's step opens one (the touchers).
    for (const h of nativeFrame.touchers()) {
      for (const e of nativeFrame.encounters) {
        if (e.phase !== 'dormant' || e.def.extract) continue;
        // (THE SAME-STORY LAW: an encounter seats on the ground floor — a storey walker over it never steps it open.)
        if (h.tier === 0 && dist(h.pos, e.pos) <= h.radius + e.def.trigger.activateRadius) {
          nativeFrame.openEncounter(e);
        }
      }
    }

    // Fractures: RUN OVER the volatile fracture object (no dwell — it's twitchy)
    // to unleash the crawling fissure. No return; you keep playing as it crawls.
    // THE ACTING SEAT: any standing player's run-over springs it.
    const dormantRun = nativeFrame.fractureRun?.phase === 'dormant' ? nativeFrame.fractureRun : null;
    if (dormantRun && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the fracture seats on the ground floor
      && dist(h.pos, dormantRun.origin) <= h.radius + 26)) {
      nativeFrame.triggerFracture();
    }

    // Portals: DWELL on one (stand idle ~0.5s) to step through — so running OVER
    // a boundary no longer yanks you to the next zone (crossing a boundary should
    // never punish you). Sealed exits still nag; the minions follow on travel.
    if (nativeFrame.isPresentLocalPlayer() && !nativeFrame.player.dead && !nativeFrame.player.downed) {
      // THE LIFT (shard M1 W2): the exit scan is exitUnder and the lock's own
      // word exitLockHint, shared with the shard scanner (each seat's own door).
      const { onExit, lockedExit } = nativeFrame.exitUnder(nativeFrame.player);
      if (!nativeFrame.shardWorld && !onExit && lockedExit && nativeFrame.lockHint <= 0) {
        nativeFrame.lockHint = 1.5;
        const hint = nativeFrame.exitLockHint(lockedExit);
        nativeFrame.text(vec(lockedExit.pos.x, lockedExit.pos.y - 40), hint.text, hint.color, 13);
      }
      // Dwell builds only while standing idle AND not being KNOCKED — a knockback
      // onto a portal must never carry you off (it's not your intent). A live
      // traversal owns the player outright — no portal can claim them mid-air.
      if (onExit && nativeFrame.playerIdle() && !nativeFrame.player.push && !nativeFrame.traversal) {
        if (nativeFrame.exitDwellIdx !== onExit.defIndex) { nativeFrame.exitDwellIdx = onExit.defIndex; nativeFrame.exitDwellStart = nativeFrame.time; }
        // A boundary-gate exit dwells on its own transit row (family-chained:
        // 'zone_exit:<gate>' falls back to 'zone_exit' when no row is registered).
        if (nativeFrame.time - nativeFrame.exitDwellStart >= transitDwell(onExit.boundary ? `zone_exit:${onExit.boundary}` : 'zone_exit')) {
          nativeFrame.travelThrough(onExit);
          return; // everything else this frame belongs to the old zone
        }
      } else {
        nativeFrame.exitDwellIdx = -1; // stepped off / acting / knocked → the dwell resets
      }
    }
    if (!nativeFrame.isPresentLocalPlayer()) nativeFrame.exitDwellIdx = -1;
    // THE ROADS PER PLAYER (shard M1 W2): on a hosted world every standing
    // seat's roads are judged with its own body and leave as tickets
    // (engine/shardRoads.ts); the block above reads only the parked warden.
    if (nativeFrame.shardWorld) nativeFrame.scanShardRoads();
}
