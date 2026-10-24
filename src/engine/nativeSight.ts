import type {Vec2} from '../core/math';
import type {ZoneDef} from '../data/zones';
import type {OccEnv,RayElev} from './los';
/** Native channels and elevation, with no movement-clearance substitution. */
export interface NativeSightHost extends OccEnv {
 readonly zone:Pick<ZoneDef,'tiers'>;
 floorElevAt(p:Vec2):number;
 rayElev(from:Vec2,to:Vec2,fromTier?:number,toTier?:number):RayElev|undefined;
 shotElev(from:Vec2,story?:number):RayElev|undefined;
}
export interface NativeSightSources {
 readonly LOS_CFG:typeof import('./los').LOS_CFG;
 readonly castRay:typeof import('./los').castRay;
 readonly tierElevOf:typeof import('./tiers').tierElevOf;
 readonly dist:typeof import('../core/math').dist;
 readonly vec:typeof import('../core/math').vec;
}

export function nativeFloorElevAt(host:NativeSightHost,sources:NativeSightSources,p:Vec2):number {
    const e = host.walk?.regionAt ? (0, sources.tierElevOf)(host.walk.regionAt(p.x, p.y)) : null;
    return e ?? 0;
  }

export function nativeRayElev(host:NativeSightHost,sources:NativeSightSources,from:Vec2,to:Vec2,fromTier?:number,toTier?:number):RayElev|undefined {
    if (!host.zone.tiers) return undefined;
    const eye = sources.LOS_CFG.elev.eye;
    return {
      from: (fromTier ?? host.floorElevAt(from)) + eye,
      to: (toTier ?? host.floorElevAt(to)) + eye,
    };
  }

export function nativeShotElev(host:NativeSightHost,sources:NativeSightSources,from:Vec2,story?:number):RayElev|undefined {
    if (!host.zone.tiers) return undefined;
    const h = (story ?? host.floorElevAt(from)) + sources.LOS_CFG.elev.eye;
    return { from: h, to: h };
  }

export function nativeLineOfSight(host:NativeSightHost,sources:NativeSightSources,from:Vec2,to:Vec2,fromTier?:number,toTier?:number):boolean {
    return (0, sources.castRay)(host, from, to, 'sight', host.rayElev(from, to, fromTier, toTier)) === null;
  }

export function nativeSightClipD(host:NativeSightHost,sources:NativeSightSources,from:Vec2,to:Vec2,fromTier?:number,toTier?:number):number {
    const hit = (0, sources.castRay)(host, from, to, 'sight', host.rayElev(from, to, fromTier, toTier));
    return hit ? hit.d : Infinity;
  }

export function nativeLineOfFire(host:NativeSightHost,sources:NativeSightSources,from:Vec2,to:Vec2,story?:number):boolean {
    return (0, sources.castRay)(host, from, to, 'shot', host.shotElev(from, story)) === null;
  }

export function nativeClipShot(host:NativeSightHost,sources:NativeSightSources,from:Vec2,to:Vec2,story?:number):Vec2 {
    const hit = (0, sources.castRay)(host, from, to, 'shot', host.shotElev(from, story));
    if (!hit) return to;
    const back = Math.max(0, hit.d - sources.LOS_CFG.clipBackoff);
    const len = (0, sources.dist)(from, to) || 1;
    return (0, sources.vec)(from.x + (to.x - from.x) * (back / len),
               from.y + (to.y - from.y) * (back / len));
  }
