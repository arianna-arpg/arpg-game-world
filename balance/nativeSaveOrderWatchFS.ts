/** Exact predecessor reads for historical proofs only; never imported by production. */
export * from 'node:fs';
export {readNativeSaveOrderWatch as readFileSync,openNativeSaveOrderWatch as openSync,closeNativeSaveOrderWatch as closeSync} from './nativeSaveOrderWatchFixture';
