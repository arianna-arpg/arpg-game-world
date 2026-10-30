import './nativeBootstrap';
import { prepareNativeFeature, type NativeCompileJob } from './nativePreparation';

// Keep this entrypoint isolated: no World, DOM, save store or main-loop import.
const scope=globalThis as unknown as {
  onmessage:((event:MessageEvent<NativeCompileJob>)=>void)|null;
  postMessage(message:unknown):void;
};
scope.onmessage=event=>scope.postMessage(prepareNativeFeature(event.data));
