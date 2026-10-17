import type {NativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';
import type {NativeAreaSceneCombat} from './nativeAreaSceneCombat';
import type {StateSnapshot,ZoneMsg} from '../net/snapshot';
type Serializer=(this:NativeAreaSceneCombat,tick:number)=>{zone:ZoneMsg;snapshot:StateSnapshot};
let installed:Serializer|undefined;
/** The actual aggregate installs its method once after class initialization.
 * Preempting or replaying installation fails closed instead of selecting a fake fallback. */
export function installNativeHostedSerializer(method:Serializer):void{if(installed)throw Error('Native hosted serializer was already installed');installed=method;}
export function serializeNativeHostedArea(owner:NativeAreaSceneCombat,tick:number):{zone:ZoneMsg;snapshot:StateSnapshot}{if(!installed)throw Error('Native hosted serializer is not installed');return Reflect.apply(installed,owner,[tick]);}

type CoordinatorOperations={is(value:unknown):value is NativeAreaSceneTransitionCoordinator;idle:NativeAreaSceneTransitionCoordinator['assertIdleFrame'];ready:NativeAreaSceneTransitionCoordinator['nativeWorldReady'];areaFor:NativeAreaSceneTransitionCoordinator['areaFor']};
let coordinatorOperations:Readonly<CoordinatorOperations>|undefined;
export function installNativeHostedCoordinator(operations:CoordinatorOperations):void{if(coordinatorOperations)throw Error('Native hosted coordinator was already installed');coordinatorOperations=Object.freeze({...operations});}
export function nativeHostedCoordinator():Readonly<CoordinatorOperations>{if(!coordinatorOperations)throw Error('Native hosted coordinator is not installed');return coordinatorOperations;}
