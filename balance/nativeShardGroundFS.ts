/** Exact predecessor reads for historical proofs only; never imported by production. */
export * from 'node:fs';
export {readNativeShardGround as readFileSync,openNativeShardGround as openSync,closeNativeShardGround as closeSync} from './nativeShardGroundFixture';
