import { OBJECTIVE_SEALS, type ZoneDef } from '../data/zones';
import { sidezoneOf, sidezonePocketId } from '../data/sidezones';
import { WORLDSTATE_CFG, type SavedCaveRung } from '../meta/worldstate';
import type { MassAdventureSave } from './runtime';
import type { MassAddress } from './address';
import { address } from './address';
import { canonical } from './random';
import { MASS_ZONE } from './preset';

/** A native pocket belongs to a physical mouth, never to a rendering page or
 * whichever biome/scene happened to be current when its preview was read. */
export interface MassSideareaRoot {
  id: string; owner: string; kind: string; seed: number; at: MassAddress;
  parent: ZoneDef;
}
export interface MassSideareaSave {
  schema: 1; run: string;
  roots: MassSideareaRoot[];
  /** Native definitions are pinned after minting; their actual zone memory is
   * still owned by the existing WorldStateSave.memory and clear ledger. */
  caves: ZoneDef[];
  active?: {
    root: string; zone: string; x: number; y: number; tier: number;
    rungs: SavedCaveRung[];
    vitals: { life: number; mana: number; es: number };
  };
}
export function massSideareaId(run: string, owner: string, kind: string, seed: number): string {
  // Full structural identity: the sampling hash is not a unique ID.
  return 'cave_mass_' + canonical([run, owner, kind, seed]);
}
export function copyMassSidearea<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

/** Validate the entire return chain before changing scene, ladder or receipts.
 * A corrupt pocket never turns an interior coordinate into a surface address. */
export function savedMassSideareas(raw: unknown, surface: MassAdventureSave): MassSideareaSave | null {
  if (!raw || typeof raw !== 'object') return null;
  try {
    const s = copyMassSidearea(raw) as MassSideareaSave;
    const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    const point = (p: {x:number;y:number} | undefined) => !!p && finite(p.x) && finite(p.y);
    const pair = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every(finite) && p[0] >= 0 && p[1] >= p[0];
    const zoneValid = (z:ZoneDef) => !!z && typeof z === 'object' && typeof z.id === 'string' && typeof z.name === 'string'
      && finite(z.level) && z.level >= 0 && !!z.size && finite(z.size.w) && finite(z.size.h) && z.size.w >= 200 && z.size.h >= 200
      && point(z.map) && !!z.theme && typeof z.theme === 'object' && typeof z.theme.floor === 'string'
      && !!z.objective && typeof z.objective === 'object' && Object.hasOwn(OBJECTIVE_SEALS,z.objective.kind)
      && Array.isArray(z.layout) && z.layout.every(row=>row && typeof row === 'object' && typeof row.kind === 'string'
        && pair(row.count) && (row.radius === undefined || pair(row.radius))
        && (row.path === undefined || Array.isArray(row.path) && row.path.every(point)))
      && Array.isArray(z.exits) && z.exits.every(e=>e && typeof e.to === 'string' && ['n','s','e','w'].includes(e.side)
        && (e.at === undefined || finite(e.at)))
      && (z.caveDepth === undefined || Number.isSafeInteger(z.caveDepth) && z.caveDepth >= 0);
    if (s.schema !== 1 || s.run !== surface.state.run.runId || !Array.isArray(s.roots) || !Array.isArray(s.caves)) return null;
    const roots = new Map<string, MassSideareaRoot>(), caves = new Map<string, ZoneDef>();
    for (const r of s.roots) {
      if (!r || typeof r.owner !== 'string' || !r.owner || !sidezoneOf(r.kind) || !Number.isSafeInteger(r.seed)
        || r.id !== massSideareaId(s.run, r.owner, r.kind, r.seed) || roots.has(r.id)
        || !zoneValid(r.parent) || r.parent.id !== MASS_ZONE || r.parent.level < 1) return null;
      const at = address(r.at.dimension, r.at.cx, r.at.cy, r.at.x, r.at.y, surface.config.terrain.addressSpan);
      if (at.dimension !== surface.origin.dimension || canonical(at) !== canonical(r.at)) return null;
      roots.set(r.id, r);
    }
    for (const z of s.caves) {
      if (!zoneValid(z) || !z.id.startsWith('cave_') || caves.has(z.id)
        || typeof z.name !== 'string' || !finite(z.level) || z.level < 0 || !finite(z.seed)
        || !z.size || !finite(z.size.w) || !finite(z.size.h) || z.size.w <= 0 || z.size.h <= 0
        || !Array.isArray(z.layout) || !Array.isArray(z.exits) || !z.theme || !z.objective) return null;
      caves.set(z.id, z);
    }
    if ([...roots.keys()].some(id => !caves.has(id))) return null;
    if (s.active) {
      const a = s.active;
      if (!roots.has(a.root) || !caves.has(a.zone) || !finite(a.x) || !finite(a.y)
        || !Number.isInteger(a.tier) || a.tier < 0 || a.tier > 6
        || !Array.isArray(a.rungs) || !a.rungs.length || a.rungs.length > WORLDSTATE_CFG.caveRungCap
        || a.rungs[0]?.zoneId !== MASS_ZONE || !a.vitals
        || ![a.vitals.life, a.vitals.mana, a.vitals.es].every(v => finite(v) && v >= 0 && v <= 1)) return null;
      const first = a.rungs[0], root = roots.get(a.root)!;
      if (canonical(address(surface.origin.dimension, surface.origin.cx, surface.origin.cy, first.x, first.y,
        surface.config.terrain.addressSpan)) !== canonical(root.at)) return null;
      for (let i = 0; i < a.rungs.length; i++) {
        const r = a.rungs[i], next = i + 1 < a.rungs.length ? a.rungs[i + 1].zoneId : a.zone;
        if (!r || !sidezoneOf(r.kind) || !Number.isSafeInteger(r.seed) || !finite(r.x) || !finite(r.y)
          || r.tier !== undefined && (!Number.isInteger(r.tier) || r.tier < 0 || r.tier > 6)
          || i === 0 && (next !== a.root || r.kind !== roots.get(a.root)!.kind || r.seed !== roots.get(a.root)!.seed)
          || r.entryFrom !== undefined && typeof r.entryFrom !== 'string'
          || r.underSpan !== undefined && (typeof r.underSpan !== 'string' || !r.underSpan)
          || i > 0 && (!caves.has(r.zoneId) || next !== sidezonePocketId(r.zoneId,r.kind,r.seed,r.underSpan))
          || !caves.get(next)?.exits.some(e => e.to === r.zoneId)) return null;
      }
    }
    return s;
  } catch { return null; }
}
