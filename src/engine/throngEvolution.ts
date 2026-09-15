import type { Actor } from './actor';
import { treeNodeOf, type SkillInstance } from './skills';

/** Native tree mechanics, independent of socketed source rows. */
export interface ThrongEvolutionSpec {
  accumulateSec?: number;
  minimum?: number;
  overflowCap?: number;
  lifeScale?: number;
  contactScale?: number;
  fullDive?: boolean;
  cluster?: boolean;
  hitFill?: number;
  eggs?: number;
  transitImmune?: boolean;
  damageMore?: number;
  conductFury?: boolean;
  whirlwind?: boolean;
  splashScale?: number;
}

const EMPTY: ThrongEvolutionSpec = Object.freeze({});
const cache = new WeakMap<SkillInstance, { key: string; value: ThrongEvolutionSpec; def: SkillInstance['def'] }>();
export function throngEvolution(inst?: SkillInstance): ThrongEvolutionSpec {
  if (!inst?.def.throng || !inst.treeNodes?.length) return EMPTY;
  const key = inst.treeNodes.join('|'), old = cache.get(inst);
  if (old?.key === key && old.def === inst.def) return old.value;
  const result: ThrongEvolutionSpec = {};
  for (const id of inst.treeNodes ?? []) Object.assign(result, treeNodeOf(inst.def, id)?.throngEvolution);
  cache.set(inst, { key, value: result, def: inst.def });
  return result;
}

export function throngTravelProtected(a: Actor): boolean {
  return !!a.owner && !a.clingTo && !!a.owner.skills.includes(a.summonInst!)
    && !!throngEvolution(a.summonInst).transitImmune;
}

export const THRONG_EVOLUTION = {
  armorFloor: 0.25,
  decayFraction: 0.08,
  decayGrowth: 1.08,
  furyMove: 1, furyHaste: 0.75, furyDamage: 0.25,
  contactInterval: 0.35,
  diveScale: 6, diveRadius: 48,
  eggScale: 4, eggRadius: 64,
  orbitRadius: 80, orbitSpeed: 5,
} as const;

/** One additional ply at 4, 9, 16… units; successive plies cost quadratically. */
export const throngClusterPlies = (units: number): number => Math.max(0, Math.floor(Math.sqrt(units)) - 1);
