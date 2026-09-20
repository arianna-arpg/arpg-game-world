import type { Actor } from './actor';
import type { SkillInstance } from './skills';
import type { Vec2 } from '../core/math';

/** Host services shared by independent carried-effect conductors. */
export interface CarriedEffectContext {
  active(a: Actor): boolean;
  elapsed(a: Actor, dt: number): number;
  enemies(a: Actor, reach: number, at?: Vec2): Actor[];
  hostile(a: Actor, b: Actor): boolean;
  clear(a: Vec2, b: Vec2, tier: number): boolean;
  instance(a: Actor, skill: string): SkillInstance | undefined;
  hit(a: Actor, inst: SkillInstance, victim: Actor): void;
  radius(a: Actor, inst: SkillInstance): number;
  launch(a: Actor, inst: SkillInstance, from: Vec2, dir: number): void;
}
export const carriedAllegiance = (a: Actor): string => `${a.team}:${a.faction}:${a.owner?.id ?? ''}`;
