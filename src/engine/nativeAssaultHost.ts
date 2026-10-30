/** Actual actor, local combat and campaign clock capabilities used by Assaults. */
import type {World} from './world';
export type NativeAssaultHost = Pick<World,
 "actorById" | "actors" | "assaultBladeHit" | "assaultDoomCull" | "enemiesOf" | "flashes" | "hostileTo" | "kill" | "seats" | "teleportActor" | "time">;
