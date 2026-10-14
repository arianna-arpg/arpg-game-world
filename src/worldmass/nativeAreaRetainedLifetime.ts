/** Terminal writer lifetime. Closing never rolls native mutations back or grants a new session. */
import type {World} from '../engine/world';
const retired=new WeakSet<World>();
const cancellation=new WeakMap<World,AbortSignal>();
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted')!.get!;
/** One-way restriction only: a writer cannot replace or remove its actual signal. */
export function bindNativeRetainedWriterCancellation(writer:World,signal:AbortSignal):void {
 if(cancellation.has(writer))throw Error('Native retained cancellation is already bound');
 Reflect.apply(aborted,signal,[]); // Intrinsic validation precedes the first binding.
 cancellation.set(writer,signal);
}
export function assertNativeRetainedWriterLive(writer:World):void {if(retired.has(writer))throw Error('Native retained writer is retired');const signal=cancellation.get(writer);if(signal&&Reflect.apply(aborted,signal,[]))throw Error('Native retained writer is cancelled');}
/** Used by the real coordinator after its synchronous idle preflight. */
export function retireNativeRetainedWriter(writer:World):void {retired.add(writer);}
