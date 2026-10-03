import type { Shrine, World } from '../engine/world';
import type { MassPlace } from './contracts';
import { SHRINES, type ShrineDef } from '../data/shrines';
import { STAT_DEFS } from '../engine/stats';
import { canonical } from './random';
import { siteOffset } from './sites';

export interface MassShrineSpec { id: string; source: string; x: number; y: number; def: ShrineDef }
export interface MassShrineSave { id: string; pos: { x: number; y: number }; used: boolean }
/** Finite journey ownership until repeated shrine residency has its own contract. */
export const MASS_SHRINE_LIMIT = 16;
export function nativeMassShrine(id: string, x: number, y: number): MassShrineSpec {
  const def = SHRINES.find(d => d.id === id);
  if (!def) throw Error('Unknown native shrine: ' + id);
  return { id, source: 'shrines/' + id, x, y, def: JSON.parse(JSON.stringify(def)) };
}
export function validateMassShrine(row: MassShrineSpec, radius: number): void {
  const d = row?.def, text = (s: string) => typeof s === 'string' && s.length > 0 && s.length <= 256;
  if (!row || !text(row.id) || !text(row.source) || ![row.x, row.y].every(Number.isFinite)
    || Math.hypot(row.x, row.y) + 32 >= radius || !d || !SHRINES.some(s => s.id === d.id)
    || !text(d.name) || !/^#[0-9a-f]{6}$/i.test(d.color) || !Number.isFinite(d.duration) || d.duration <= 0 || d.duration > 3600
    || !Array.isArray(d.mods) || d.mods.length > 16
    || d.mods.some(m => !STAT_DEFS[m.stat] || !['flat', 'increased', 'more', 'override'].includes(m.kind) || !Number.isFinite(m.value)))
    throw Error('Unsupported worldmass shrine');
}
const shrineId = (place: Pick<MassPlace, 'id'>, row: MassShrineSpec): string => canonical([place.id, 'shrine', row.id]);
type Context = { rows: readonly MassShrineSpec[]; center: { x: number; y: number } };

/** Own placement and one-shot consumption only. The native touch/buff/expiry
 * pipeline remains the sole executor; no buff is reconstructed from a used stand. */
export class MassShrines {
  private live = new Map<string, Shrine>();
  private saved = new Map<string, MassShrineSave>();
  constructor(saved: readonly MassShrineSave[] = []) {
    if (!Array.isArray(saved) || saved.length > MASS_SHRINE_LIMIT) throw Error('Invalid worldmass shrine count');
    for (const s of saved) {
      if (!s || typeof s.id !== 'string' || !s.id || this.saved.has(s.id) || typeof s.used !== 'boolean'
        || !s.pos || ![s.pos.x, s.pos.y].every(Number.isFinite)) throw Error('Invalid worldmass shrine checkpoint');
      this.saved.set(s.id, JSON.parse(canonical(s)));
    }
  }
  restoreAdmitted(world: World, places: readonly MassPlace[], resolve: (place: MassPlace) => Context): void {
    const known = new Map<string, { place: MassPlace; row: MassShrineSpec; center: Context['center'] }>();
    for (const place of places) {
      const { rows, center } = resolve(place);
      for (const row of rows) known.set(shrineId(place, row), { place, row, center });
    }
    for (const s of this.saved.values()) {
      const owner = known.get(s.id);
      if (!owner || Math.hypot(s.pos.x - owner.center.x, s.pos.y - owner.center.y) + 14 >= owner.place.radius)
        throw Error('Unknown or displaced worldmass shrine');
    }
    for (const s of this.saved.values()) {
      const { row } = known.get(s.id)!;
      const shrine: Shrine = { pos: { ...s.pos }, def: row.def, used: s.used, massSource: s.id };
      this.live.set(s.id, shrine); world.shrines.push(shrine);
    }
  }
  admit(world: World, place: MassPlace, rows: readonly MassShrineSpec[], center: Context['center']): void {
    for (const row of rows) {
      const id = shrineId(place, row);
      if (this.live.has(id)) continue;
      if (this.live.size >= MASS_SHRINE_LIMIT) throw Error('Worldmass shrine capacity exceeded');
      const offset = siteOffset(place, row.x, row.y);
      const pos = world.findFreeSpot({ x: center.x + offset.x, y: center.y + offset.y }, 14);
      if (!world.walk?.isWalkable(pos.x, pos.y) || world.pointInSolid(pos.x, pos.y, 14)
        || Math.hypot(pos.x - center.x, pos.y - center.y) + 14 >= place.radius) continue;
      const shrine: Shrine = { pos: { ...pos }, def: row.def, used: false, massSource: id };
      this.live.set(id, shrine); world.shrines.push(shrine);
    }
  }
  snapshot(): MassShrineSave[] {
    return [...this.live].map(([id, s]) => ({ id, pos: { ...s.pos }, used: s.used })).sort((a,b) => a.id.localeCompare(b.id));
  }
}
