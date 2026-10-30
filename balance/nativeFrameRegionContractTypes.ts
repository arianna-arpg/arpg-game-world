import type {NativeRegionEffectHost} from '../src/world/regions';
// Compile-only checks: actual local services exist, legacy scene resets are excluded.
export type NativeRegionFrameContract = [
 NativeRegionEffectHost['actors'], NativeRegionEffectHost['time'], NativeRegionEffectHost['moveActor'],
 // @ts-expect-error Region handlers cannot reset the active World.
 NativeRegionEffectHost['loadZone']
];
