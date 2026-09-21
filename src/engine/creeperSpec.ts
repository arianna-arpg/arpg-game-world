import { STAT_DEFS, type SkillTag } from './stats';

/** Autonomous carried burrowers: movement, leash and eruptions are data. */
export interface CreeperDef {
  id: string; name: string; description: string; skill: string; tags: SkillTag[];
  bodyRadius: number; speed: number; returnSpeed: number;
  acquire: number; leash: number; home: number; wander: number;
  wanderMin: number; wanderMax: number; arm: number; windup: number; recovery: number;
  flash: number; recall: number; trailSpacing: number; trailLife: number;
  color: string; soil: string;
}
export const CREEPERS: Record<string, CreeperDef> = {};
export const CREEPER_IDS: string[] = [];
export const CREEPER_CFG = { maxPerActor: 3, maxFrame: 0.25, teleport: 128, maxTrail: 18 };
export const creeperCountStat = (id: string): string => `creeperCount_${id}`;
export function registerCreeper(def: CreeperDef): void {
  if (!CREEPERS[def.id]) CREEPER_IDS.push(def.id);
  CREEPERS[def.id] = def;
  STAT_DEFS[creeperCountStat(def.id)] = { label: `${def.name} Count`, desc: def.description,
    base: 0, min: 0, max: CREEPER_CFG.maxPerActor };
}
STAT_DEFS.creeperSpeed = { label: 'Creeper Travel Speed', base: 1, min: 0, max: 3, percent: true };
export function creeperErrors(delivery: (id: string) => string | undefined): string[] {
  return Object.entries(CREEPERS).flatMap(([id, d]) => d.id !== id || !d.name || !d.description
    || !d.color || !d.soil || !d.tags.includes('creeper') || !d.tags.includes(`creeper:${id}`)
    || delivery(d.skill) !== 'ground'
    || ![d.bodyRadius, d.speed, d.returnSpeed, d.acquire, d.leash, d.home, d.wander,
      d.wanderMin, d.wanderMax, d.arm, d.windup, d.recovery, d.flash, d.recall,
      d.trailSpacing, d.trailLife].every(n => Number.isFinite(n) && n > 0)
    || d.home >= d.wander || d.wander >= d.acquire || d.acquire >= d.leash || d.wanderMin > d.wanderMax
    ? [`creeper ${id}: invalid definition or missing ground payload`] : []);
}
