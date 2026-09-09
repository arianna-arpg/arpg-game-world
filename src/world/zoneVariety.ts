import { Rng } from '../core/rng';
import { localeProgram, localeSeed } from './locales';

/** Common exploration size policy; deliberate arenas and saved sizes bypass it. */
export const ZONE_VARIETY = {
  surfaceScale: 1.12,
  caveScale: 1.12,
  maxExpandedAxis: 6000,
};
export function expandExplorationSize(size: { w: number; h: number }, place: 'surface' | 'cave') {
  const scale = place === 'surface' ? ZONE_VARIETY.surfaceScale : ZONE_VARIETY.caveScale;
  const axis = (n: number) => Math.round(Math.min(n * scale, Math.max(n, ZONE_VARIETY.maxExpandedAxis)));
  return { w: axis(size.w), h: axis(size.h) };
}

export interface ExplorationLocalePool {
  id: string;
  biomes: string[];
  /** Existing biome layout recipes retain this share of ordinary exploration. */
  fallbackWeight: number;
  locales: { program: string; weight: number }[];
}
const POOLS: ExplorationLocalePool[] = [];
export function registerExplorationLocalePool(pool: ExplorationLocalePool): void {
  if (!pool.id || !pool.biomes.length || !pool.locales.length || !Number.isFinite(pool.fallbackWeight) || pool.fallbackWeight <= 0
    || new Set(pool.locales.map(r => r.program)).size !== pool.locales.length
    || pool.locales.some(r => !localeProgram(r.program) || !Number.isFinite(r.weight) || r.weight <= 0)) throw new Error(`invalid exploration locale pool ${pool.id}`);
  if (POOLS.some(p => p.id !== pool.id && p.biomes.some(b => pool.biomes.includes(b)))) throw new Error(`overlapping exploration locale pool ${pool.id}`);
  const old = POOLS.findIndex(p => p.id === pool.id);
  if (old >= 0) POOLS.splice(old, 1);
  POOLS.push(structuredClone(pool));
}
export const explorationLocalePools = () => POOLS;
export function pickExplorationLocale(biome: string | undefined, seed: number): string | undefined {
  const pool = POOLS.find(p => p.biomes.includes(biome ?? ''));
  if (!pool) return undefined;
  let pick = new Rng(localeSeed(`${seed}/${pool.id}/exploration`)).next()
    * (pool.fallbackWeight + pool.locales.reduce((n, r) => n + r.weight, 0)) - pool.fallbackWeight;
  if (pick < 0) return undefined;
  return pool.locales.find(r => (pick -= r.weight) < 0)?.program;
}
