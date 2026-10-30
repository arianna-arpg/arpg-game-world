import type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';
/** Nominal ground registration without importing the coordinator into leaf owners. */
import type {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneQuests} from './nativeAreaSceneQuests';
import type {NativeAreaSceneMemory} from './nativeAreaSceneMemory';
import type {NativeOdysseyGroundRefresh} from './nativeOdysseyGroundRefresh';
export interface NativeGroundCoordinatorCalls {
 assertQuests(owner:NativeAreaSceneQuests):void;
 capture(owner:NativeAreaSceneMemory):boolean;
 save():NativeOdysseyGroundRefresh|undefined;
 retirement(owner:NativeAreaSceneMemory):void;
 areaRetirement(owner:NativeAreaSceneOngoing):void;
}
type Resolver=(owner:NativeAreaSceneTransitionCoordinator)=>NativeGroundCoordinatorCalls;
let resolver:Resolver|undefined;
/** Preemption prevents the genuine coordinator module initializing; no fallback. */
export function installNativeGroundCoordinatorResolver(value:Resolver):void {if(resolver||typeof value!=='function')throw Error('Native ground coordinator resolver already installed or invalid');resolver=value;}
export function nativeGroundCoordinatorCalls(owner:NativeAreaSceneTransitionCoordinator):NativeGroundCoordinatorCalls {if(!resolver)throw Error('Native ground coordinator is not initialized');return resolver(owner);}
