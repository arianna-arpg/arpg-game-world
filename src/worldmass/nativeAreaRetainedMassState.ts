/** Whole retained areas do not import the legacy Mass bootstrap/away lifecycle.
 * Read the actual writer slots before any retained entry; never erase or mask it. */
import {isNativeWorld,type World} from '../engine/world';
import {assertNativeRetainedWriterLive} from './nativeAreaRetainedLifetime';
import type {NativeAreaSceneGeometry} from './nativeAreaSceneGeometry';
function actualNull(owner:object,key:PropertyKey):null {
 const descriptor=Object.getOwnPropertyDescriptor(owner,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value')||descriptor.value!==null)throw Error('Retained native areas cannot import legacy Mass state: '+String(key));
 return descriptor.value;
}
export function assertNativeRetainedMassState(writer:World):void {
 if(!isNativeWorld(writer))throw Error('Retained Mass validation needs the actual character writer');
 assertNativeRetainedWriterLive(writer);actualNull(writer,'massRuntime');actualNull(writer,'massAway');
}
export function readNativeRetainedMassAway(writer:World):null {
 assertNativeRetainedMassState(writer);return actualNull(writer,'massAway');
}
export function readNativeRetainedMassRuntime(writer:World,geometry:NativeAreaSceneGeometry):null {
 assertNativeRetainedMassState(writer);return actualNull(geometry,'massRuntime');
}
