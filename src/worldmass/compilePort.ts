/** Environment-owned execution, with the same checked envelopes on every host.
 * Browser builds never import Node; a dedicated host installs its adapter before
 * constructing a runtime. A port belongs to one queue and dies with that queue. */
import { canonical, freezeData, isMassFrozenData } from './random';
export type MassCompiler = 'native' | 'geographic' | 'procession';
export interface MassCompilePort {
  onmessage: ((event: MessageEvent<any>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(job: any): void;
  terminate(): void;
}
let factory: ((kind: MassCompiler) => MassCompilePort) | undefined;
const massCompileInputs=new WeakMap<object,Map<string,object>>();
export function installMassCompilePort(create: (kind: MassCompiler) => MassCompilePort): void { factory = create; }
export function massCompilePort(kind: MassCompiler): MassCompilePort | undefined { return factory?.(kind); }
/** Snapshot dynamic input while sharing a genuinely immutable terrain source.
 * Untrusted/mutable callers still receive the ordinary deep-detached copy. */
export function massCompileInput<T extends {terrain:object}>(input:T):Readonly<T>{
  if(isMassFrozenData(input))return input;
  if(!isMassFrozenData(input.terrain))return freezeData(JSON.parse(canonical(input)) as T);
  const {terrain,...dynamic}=input;
  const key=canonical(dynamic),cache=massCompileInputs.get(terrain)??new Map<string,object>();
  const previous=cache.get(key);
  if(previous){cache.delete(key);cache.set(key,previous);return previous as Readonly<T>;}
  canonical(terrain); // memo the large static subtree once per owning generator
  const frozen=freezeData({...JSON.parse(key),terrain} as T);
  cache.set(key,frozen);massCompileInputs.set(terrain,cache);
  if(cache.size>64)cache.delete(cache.keys().next().value!);
  return frozen;
}
