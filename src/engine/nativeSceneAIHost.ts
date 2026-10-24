/** Exhaustive native AI capabilities; runtime implementations belong to the actual area. */
import type {World} from './world';
import type {NativeAIActionHost} from './nativeAIActionHost';
import type {NativeEncounterCombatHost} from './encounterCombat';
export type NativeSceneAIHost=Pick<World,"autonomousMetas"|"deviceCommandUseful"|"actorById"|"actors"|"actorsNear"|"aiNeedsFireLine"|"claimGarrisonSlot"|"claimRingSlot"|"clampPos"|"corpses"|"doodads"|"doodadsNear"|"dropGemAt"|"enemiesOf"|"fallHazardAt"|"finalizeGarrison"|"flashes"|"fleeIntoRefuge"|"garrisonSlotById"|"guardArts"|"hostileTo"|"imminentThreatTo"|"kill"|"lineOfFire"|"lineOfSight"|"losCached"|"lureFor"|"moveActor"|"onBrainPhaseEnter"|"onFleeArrive"|"pathField"|"pathProfileFor"|"pressUsable"|"recentTierCrossing"|"requestEngage"|"sanctuaryRetreat"|"seatOf"|"seekLoot"|"seekPrey"|"sim"|"teleportActor"|"text"|"tierLinkToward"|"time"|"timeflow"|"useSkill"|"walk"|"zone"> & NativeAIActionHost & NativeEncounterCombatHost;
