import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import type { Actor } from '../engine/actor';
import type { Doodad } from '../engine/levelgen';
import type { NativeProcessionConfig, NativeProcessionSpec } from '../engine/processionObjectives';
import type { MassAddress } from './address';

/** Type-only leaf shared by the pure route compiler and native controller. */
export interface NativeMassProcessionSource {
  id: string; source: string; tileset?: string; weight: number; totalWeight: number;
  objective: NativeProcessionSpec;
}
export interface MassProcessionContext {
  source: string;
  zone: ZoneDef;
  recipe?: NativeMassProcessionSource;
  config: NativeProcessionConfig;
}
/** Complete native road doodad, with its position made geographically durable. */
export interface MassProcessionRoadRow { at: MassAddress; doodad: Omit<Doodad, 'pos'> }
export interface MassProcessionCartBirth {
  owner: string; seed: number; zone: Readonly<ZoneDef>; config: NativeProcessionConfig; at: Vec2;
}
export interface MassProcessionAmbushBirth extends MassProcessionCartBirth {
  sequence: number; cart: Actor; heading: number; count: number;
}
