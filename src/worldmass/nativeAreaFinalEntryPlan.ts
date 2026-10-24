/** Type-only shape for one synchronous private operation plan; no registrar or runtime exports. */
import type {Actor} from '../engine/actor';
import type {NativeAreaActorSelection} from './nativeAreaActorAuthority';
export interface NativeFinalEntryPlan {
 readonly physical:readonly Actor[];
 readonly invoke:(rows:readonly NativeAreaActorSelection<object>[],run:(action:()=>unknown)=>unknown)=>unknown;
}
