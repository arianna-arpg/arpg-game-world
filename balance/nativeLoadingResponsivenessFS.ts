/** Exact fcbfefd7 source boundary; unrelated filesystem exports remain native. */
export * from 'node:fs';
export {readNativeLoadingResponsiveness as readFileSync,openNativeLoadingResponsiveness as openSync,closeNativeLoadingResponsiveness as closeSync} from './nativeLoadingResponsivenessFixture';
