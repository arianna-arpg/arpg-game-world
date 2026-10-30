import { regionKind } from '../world/regions';
import type { MassAddress } from './address';
import { planGeographicAccess as plan,MASS_ACCESS_POLICY,type MassAccessTarget,type MassAccessEnvironment as CoreEnvironment } from './geographicAccessCore';
export { MASS_ACCESS_POLICY,discTerrainClear,validateGeographicAccess,geographicAccessPoints,GeographicAccessIndex } from './geographicAccessCore';
export type { MassAccessProof,MassAccessTarget } from './geographicAccessCore';
export interface MassAccessEnvironment extends Omit<CoreEnvironment,'isDry'> {isDry?(region:string):boolean}
const dry=(id:string)=>{const r=regionKind(id);return !!r?.walkable&&!r.standStatusDeep&&!['water','lava','chasm','bog','swamp'].includes(id);};
/** Native callers use the registered terrain rules. The isolated worker uses
 * the core directly with those exact rules snapshotted in its frozen input. */
export function planGeographicAccess(center:MassAddress,targets:readonly MassAccessTarget[],span:number,environment:MassAccessEnvironment,halfSpan:number=MASS_ACCESS_POLICY.halfSpan):ReturnType<typeof plan>{
  return plan(center,targets,span,{...environment,isDry:environment.isDry??dry},halfSpan);
}
