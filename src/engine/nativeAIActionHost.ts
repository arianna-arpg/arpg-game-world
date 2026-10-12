/** Actual scene capabilities used by built-in and installed choreography verbs. */
import type {World} from './world';
export type NativeAIActionHost = Pick<World,
 "actors" | "arena" | "arenaWash" | "castChrono" | "claimGarrisonSlot" | "clampPos" | "conjurationLifeline" | "conjured" | "crackArena" | "createMonster" | "creep" | "dropGemAt" | "enemiesOf" | "executeSkill" | "flashes" | "flux" | "fog" | "hostileTo" | "mountFreeSeat" | "mountSeatRider" | "mountUnlink" | "onBrainPhaseEnter" | "promoteMonster" | "pushActor" | "restoreArena" | "shake" | "shrinkArenaPockets" | "sinkArena" | "spawnSummonOffspring" | "startBurrow" | "teleportActor" | "text" | "time" | "useSkill" | "walk" | "zones">;
