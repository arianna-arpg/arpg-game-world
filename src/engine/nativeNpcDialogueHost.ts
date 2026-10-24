/** Complete currently installed director and NPC_DIALOGUE_FACTS read contract.
 * Native callbacks retain their semantics; future registered facts must declare
 * any additional capability here. No partial World object or hidden fallback. */
import type { World } from './world';
export interface NativeNpcDialogueHost {
 activeQuests:World['activeQuests'];
 questStanding:World['questStanding'];
 account:World['account'];
 ledger:World['ledger'];
 localZoneAt:World['localZoneAt'];
 player:World['player'];
 clientActionHook?:World['clientActionHook'];
 actors:World['actors'];
 manifest:World['manifest'];
 metaProgressionActive:World['metaProgressionActive'];
 accountDirty:World['accountDirty'];
 charDirty:World['charDirty'];
 scene:World['scene'];
 isSafeAt:World['isSafeAt'];
 time:World['time'];
 exits:World['exits'];
 massRuntime:World['massRuntime'];
 viewRectFor:World['viewRectFor'];
 lineOfSight:World['lineOfSight'];
 localSeat:World['localSeat'];
 questDefOf:World['questDefOf'];
 reliquaryLesson:World['reliquaryLesson'];
 mireilleLessonLived:World['mireilleLessonLived'];
 mireilleGiftOwed:World['mireilleGiftOwed'];
 mireilleGiftLesson:World['mireilleGiftLesson'];
 questImbues:World['questImbues'];
}
