/** Exact predecessor reads for historical proofs only; never imported by production. */
export * from 'node:fs';
export {readNativeVerminfallSource as readFileSync,openNativeVerminfallSource as openSync,closeNativeVerminfallSource as closeSync} from './nativeVerminfallSourceFixture';
