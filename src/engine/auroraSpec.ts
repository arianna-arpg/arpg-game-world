import { STAT_DEFS, type SkillTag } from './stats';
import type { OrbPaint } from './skills';

/** A rechargeable carried reservoir, independent of satellite counts and orbits. */
export interface AuroraDef {
  id: string; name: string; description: string; skill: string; tags: SkillTag[];
  recharge: number; cascade: number; ready: number; range: number;
  orbit: number; ringSpacing: number; perRing: number; turnSpeed: number;
  color: string; orbPaint: OrbPaint;
}
export const AURORAS: Record<string, AuroraDef> = {};
export const AURORA_IDS: string[] = [];
export const AURORA_CFG = { maxCapacity: 24, maxPerActor: 32, maxFrame: 0.25, teleport: 128 };
export const auroraCapacityStat = (id: string): string => `auroraCapacity_${id}`;
export function registerAurora(def: AuroraDef): void {
  if (!AURORAS[def.id]) AURORA_IDS.push(def.id);
  AURORAS[def.id] = def;
  STAT_DEFS[auroraCapacityStat(def.id)] = {
    label: `${def.name} Capacity`, desc: def.description, base: 0, min: 0, max: AURORA_CFG.maxCapacity,
  };
}
STAT_DEFS.auroraCapacity = { label: 'Additional Aurora Capacity', desc: 'Adds storage to aurora reservoirs you already carry.', base: 0, min: 0, max: AURORA_CFG.maxCapacity };
STAT_DEFS.auroraRecharge = { label: 'Aurora Recharge Rate', desc: 'Scales how quickly your aurora reservoirs replenish stored projectiles.', base: 1, min: 0, max: 4, percent: true };
export function auroraErrors(delivery: (id: string) => string | undefined): string[] {
  return Object.entries(AURORAS).flatMap(([id, d]) => d.id !== id || !d.name || !d.description
    || !d.color || !d.tags.includes('aurora') || !d.tags.includes(`aurora:${id}`)
    || delivery(d.skill) !== 'projectile'
    || ![d.recharge, d.cascade, d.ready, d.range, d.orbit, d.ringSpacing].every(n => Number.isFinite(n) && n > 0)
    || !Number.isSafeInteger(d.perRing) || d.perRing < 1 || !Number.isFinite(d.turnSpeed)
    || ![d.orbPaint.fill, d.orbPaint.rim].every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    ? [`aurora ${id}: invalid definition or missing projectile payload`] : []);
}
