import type { NativeAreaBirthHost } from '../engine/nativeAreaBirth';
import type { World } from '../engine/world';
import { WAVE_CFG } from '../data/waves';
/** Fresh-scene objective state, from the original load reset BEFORE birth.
 * completedObjectives is the real run-long ledger; do not invent an empty set.
 * Memory waves/charges/cull/procession are applied later by birthNativeArea. */
export interface NativeSceneObjectiveState extends Pick<NativeAreaBirthHost,
  'objectiveDone'|'objectiveLost'|'spires'|'rifts'|'pyres'|'digs'|'procession'|'offering'|'cull'|'wave'|'waveActive'> {
  waveTimer:World['waveTimer'];
  spireReinforceAt:World['spireReinforceAt'];
  heldFixture:World['heldFixture'];
  objectiveLatch:World['objectiveLatch'];
}
export function freshSceneObjectiveState(zoneId:string,completedObjectives:ReadonlySet<string>):NativeSceneObjectiveState {
  return {objectiveDone:completedObjectives.has(zoneId),objectiveLost:false,
    spires:[],rifts:[],pyres:[],digs:[],procession:null,offering:null,cull:null,
    wave:0,waveTimer:WAVE_CFG.firstDelay,waveActive:false,spireReinforceAt:0,heldFixture:null,objectiveLatch:null};
}
