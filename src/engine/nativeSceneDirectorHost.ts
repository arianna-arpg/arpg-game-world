/** The actual scene director capability surface; shared by native World and
 * retained area's real scene/controller owners. No gameplay implementation. */
import type {World,Seat} from './world';
export type NativeSceneDirectorHost=Pick<World,"manifest"|"account"|"accountDirty"|"actors"|"ambientCamShift"|"applyWaveFrenzy"|"arena"|"caveMap"|"caveReturn"|"charDirty"|"clampPos"|"createMonster"|"doodads"|"loadZone"|"markDoodadsChanged"|"player"|"playerIdle"|"recalcPlayer"|"scene"|"screenFade"|"shake"|"swarmEntryPoint"|"text"|"time"|"timeflow"|"useSkill"|"zone"> & {readonly seats:readonly Seat[];readonly nativeSceneBodies?:NativeSceneDirectorBodies};
export interface NativeSceneDirectorBodies {
 spawnBody(...args:Tail<Parameters<typeof import('./scenes').nativeSceneSpawnBody>>):ReturnType<typeof import('./scenes').nativeSceneSpawnBody>;
 spawnColossus(...args:Tail<Parameters<typeof import('./scenes').nativeSceneSpawnColossus>>):ReturnType<typeof import('./scenes').nativeSceneSpawnColossus>;
 spawnApparitions(...args:Tail<Parameters<typeof import('./scenes').nativeSceneSpawnApparitions>>):ReturnType<typeof import('./scenes').nativeSceneSpawnApparitions>;
 emptyField():void;
}
type Tail<T extends unknown[]> = T extends [unknown,...infer R] ? R : never;
