/** Terminal writer lifetime. Closing never rolls native mutations back or grants a new session. */
import type {World} from '../engine/world';
const retired=new WeakSet<World>();
export function assertNativeRetainedWriterLive(writer:World):void {if(retired.has(writer))throw Error('Native retained writer is retired');}
/** Used by the real coordinator after its synchronous idle preflight. */
export function retireNativeRetainedWriter(writer:World):void {retired.add(writer);}
