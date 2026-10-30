/** Complete installed native theater scope. Local services remain mandatory;
 * this type never supplies an implementation or borrows a standing World. */
import type {World} from './world';
export interface NativeTheaterHost {
 radianceCondHeld:World['radianceCondHeld'];
 geysers:World['geysers'];
 time:World['time'];
 geyserMode:World['geyserMode'];
 walk:World['walk'];
 exits:World['exits'];
 clampPos:World['clampPos'];
 arena:World['arena'];
 actorById:World['actorById'];
 imminentThreatTo:World['imminentThreatTo'];
 plantDressAt:World['plantDressAt'];
 manifest:World['manifest'];
 zone:World['zone'];
 theaterVisit:World['theaterVisit'];
 dropGemAt:World['dropGemAt'];
 theaterPourRoom:World['theaterPourRoom'];
 notice:World['notice'];
 theaterRuns:World['theaterRuns'];
 theaterSpots:World['theaterSpots'];
 theaterSpawn:World['theaterSpawn'];
 clampNear:World['clampNear'];
 anyAliveWithTag:World['anyAliveWithTag'];
 pathField:World['pathField'];
 moveActor:World['moveActor'];
 actors:World['actors'];
 zoneEntryPos:World['zoneEntryPos'];
 slipAway:World['slipAway'];
 doodads:World['doodads'];
}
