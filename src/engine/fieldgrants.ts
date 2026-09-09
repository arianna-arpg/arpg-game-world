import type { DropZoneSpec, SkillInstance } from './skills';
import { STAT_DEFS, type Modifier } from './stats';
import type { Actor } from './actor';
import { Rng } from '../core/rng';

export interface TrailGrant {
  id: string; name: string; skillId: string;
  everyDist: number; patch: DropZoneSpec; maxPatches: number;
}
export const TRAIL_GRANTS: Record<string, TrailGrant> = {};
export const TRAIL_GRANT_IDS: string[] = [];
export const trailGrantStat = (id: string): string => `trailGrant_${id}`;
export function registerTrailGrant(def: TrailGrant): void {
  if (!TRAIL_GRANTS[def.id]) TRAIL_GRANT_IDS.push(def.id);
  TRAIL_GRANTS[def.id] = def;
  STAT_DEFS[trailGrantStat(def.id)] = { label: def.name, base: 0, min: 0 };
}
export interface TrailMemory { x: number; y: number; tier: number; odo: number; inst: SkillInstance }

export interface PocketGrant {
  id: string; name: string; regionId: string; resource?: string;
  count: number; radius: number; minRadius?: number; cellSize: number; seed: number;
  inside: Modifier[]; outside: Modifier[];
  color: string;
}
export interface GrantedPocket { x: number; y: number; r: number; tier: number; grantId: string; color: string }
export const POCKET_GRANTS: Record<string, PocketGrant> = {};
export const POCKET_GRANT_IDS: string[] = [];
export const pocketGrantStat = (id: string): string => `pocketGrant_${id}`;
export function registerPocketGrant(def: PocketGrant): void {
  if (!POCKET_GRANTS[def.id]) POCKET_GRANT_IDS.push(def.id);
  POCKET_GRANTS[def.id] = def;
  STAT_DEFS[pocketGrantStat(def.id)] = { label: def.name, base: 0, min: 0 };
}

/** Zone-wide, bounded candidate field. Identical seed/story/grant means the
 * same pockets on host, client, reload and re-equip; walking never moves them.
 * The host's standing-surface predicate prevents pockets through solid walls. */
export function placeGrantedPockets(def: PocketGrant, seed: number, tier: number, w: number, h: number,
  open: (x: number, y: number) => boolean): GrantedPocket[] {
  const rng = new Rng(seed ^ def.seed ^ Math.imul(tier + 1, 0x9e3779b9));
  if (def.count <= 0 || def.radius <= 0) return [];
  const fitsAt = (x: number, y: number, radius: number): boolean => {
    if (!open(x, y)) return false;
    // Sample the interior as well as the rim: a pillar inside a circle must
    // not masquerade as clear ground. The host predicate includes solid padding.
    for (let r = Math.min(12, radius); ; r = Math.min(radius, r + 12)) {
      const n = Math.ceil(2 * Math.PI * r / 12);
      for (let i = 0; i < n; i++) {
        const a = i * 2 * Math.PI / n;
        if (!open(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
      }
      if (r >= radius) return true;
    }
  };
  const candidates: { x: number; y: number; score: number }[] = [];
  const margin = def.radius + 12;
  const spacing = Math.max(64, def.cellSize, Math.sqrt(w * h / 256));
  for (let y = margin; y <= h - margin; y += spacing) {
    for (let x = margin; x <= w - margin; x += spacing) {
      const px = Math.max(margin, Math.min(w - margin, x + rng.range(-spacing * 0.3, spacing * 0.3)));
      const py = Math.max(margin, Math.min(h - margin, y + rng.range(-spacing * 0.3, spacing * 0.3)));
      const score = rng.next();
      if (fitsAt(px, py, def.radius)) candidates.push({ x: px, y: py, score });
    }
  }
  const out: GrantedPocket[] = [];
  for (const p of candidates.sort((a, b) => a.score - b.score)) {
    if (out.some(q => Math.hypot(q.x - p.x, q.y - p.y) < def.radius * 3)) continue;
    out.push({ x: p.x, y: p.y, r: def.radius, tier, grantId: def.id, color: def.color });
    if (out.length >= def.count) break;
  }
  // Cramped interiors can have no full-size clearings. Search a finer bounded
  // lattice for smaller refuges; never invent walkable space or move a wall.
  if (!out.length && def.minRadius && def.minRadius < def.radius) {
    const r = def.minRadius, pad = r + 4;
    const stride = Math.max(r, Math.sqrt(w * h / 16384));
    const small: { x: number; y: number; score: number }[] = [];
    for (let y = pad; y <= h - pad; y += stride) {
      for (let x = pad; x <= w - pad; x += stride) {
        if (fitsAt(x, y, r)) small.push({ x, y, score: rng.next() });
      }
    }
    for (const p of small.sort((a, b) => a.score - b.score)) {
      if (out.some(q => Math.hypot(q.x - p.x, q.y - p.y) < r * 3)) continue;
      out.push({ x: p.x, y: p.y, r, tier, grantId: def.id, color: def.color });
      if (out.length >= def.count) break;
    }
  }
  return out;
}

export interface ThrongSubstitution { id: string; name: string; monsterId: string }
export const THRONG_SUBSTITUTIONS: Record<string, ThrongSubstitution> = {};
export const THRONG_SUBSTITUTION_IDS: string[] = [];
export const throngMorphStat = (id: string): string => `throngMorph_${id}`;
export function registerThrongSubstitution(def: ThrongSubstitution): void {
  if (!THRONG_SUBSTITUTIONS[def.id]) THRONG_SUBSTITUTION_IDS.push(def.id);
  THRONG_SUBSTITUTIONS[def.id] = def;
  STAT_DEFS[throngMorphStat(def.id)] = { label: `Throng finds become ${def.name}`, base: 0, min: 0, percent: true };
}
export function substituteThrongKind(original: string, keeper: Actor, inst: SkillInstance,
  rng: () => number, getChance: (stat: string, inst: SkillInstance) => number): string {
  const pool = Object.values(THRONG_SUBSTITUTIONS).filter(d => d.monsterId !== original)
    .map(def => ({ def, chance: Math.max(0, getChance(throngMorphStat(def.id), inst)) })).filter(d => d.chance > 0);
  const total = pool.reduce((n, r) => n + r.chance, 0);
  if (!total || keeper.dead || rng() >= Math.min(1, total)) return original;
  let pick = rng() * total;
  return (pool.find(r => (pick -= r.chance) < 0) ?? pool[pool.length - 1]).def.monsterId;
}
