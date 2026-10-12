/** The actual retained-area directory surface, not a structural World. */
import type {World,Seat} from '../engine/world';
import type {Actor} from '../engine/actor';
export interface NativeAreaDirectoryView {
 readonly zone:World['zone'];readonly actors:World['actors'];readonly seats:readonly Seat[];
 /** No departed campaign actor is a local representative. */
 readonly presentationActor:Actor|null;
 /** Native callers must establish presentationActor before reading this required view. */
 readonly player:Actor;
 readonly structures:World['structures'];readonly holdDefense:World['holdDefense'];readonly theaterRuns:World['theaterRuns'];readonly encounters:World['encounters'];readonly seatQuests:World['seatQuests'];
 readonly text:World['text'];readonly notice:World['notice'];readonly resealDoor:World['resealDoor'];readonly refreshHoldDress:World['refreshHoldDress'];readonly refreshHoldServices:World['refreshHoldServices'];
 readonly spawnWarband:World['spawnWarband'];readonly dissipateHauntSpawns:World['dissipateHauntSpawns'];readonly realmArenaWake:World['realmArenaWake'];readonly clearWaypointLanding:World['clearWaypointLanding'];readonly nearBountyBoard:World['nearBountyBoard'];
}
