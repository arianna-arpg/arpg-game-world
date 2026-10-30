/** Exact accepted164 source boundary; unrelated filesystem exports are native. */
export * from 'node:fs';
export {readNativeHuntMigration as readFileSync,openNativeHuntMigration as openSync,closeNativeHuntMigration as closeSync} from './nativeHuntMigrationFixture';
