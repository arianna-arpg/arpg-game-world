/** Exact historical source reads only; production never imports this module. */
export * from 'node:fs';
export {readNativeMergeSource as readFileSync,openNativeMergeSource as openSync,closeNativeMergeSource as closeSync} from './nativeMergeSourceFixture';
