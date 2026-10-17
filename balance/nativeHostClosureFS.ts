/** Explicit historical source-read boundary; ordinary filesystem exports are unchanged. */
export * from 'node:fs';
export {readNativeHostClosure as readFileSync} from './nativeHostClosureFixture';
