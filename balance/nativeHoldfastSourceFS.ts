/** Exact pre-Holdfast reads for historical proofs only; never imported by production. */
export * from 'node:fs';
export {readNativeHoldfastSource as readFileSync,openNativeHoldfastSource as openSync,closeNativeHoldfastSource as closeSync} from './nativeHoldfastSourceFixture';
