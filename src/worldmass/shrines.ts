import type { Shrine, World } from '../engine/world';
import type { MassPlace } from './contracts';
import { SHRINES, type ShrineDef } from '../data/shrines';
import { STAT_DEFS } from '../engine/stats';
import { canonical } from './random';
import { siteOffset } from './sites';
import type { MassFieldResidency } from './fields';
import type { MassAddress } from './address';

export interface MassShrineSpec { id: string; source: string; x: number; y: number; def: ShrineDef }
export interface MassShrineSave {
  id: string; pos: { x: number; y: number }; used: boolean;
  resident?: boolean; place?: { id: string; center: MassAddress };
}
/** Legacy descriptors keep their original finite, always-resident policy. */
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
type Owner = { id: string; center: MassAddress };

/** Own placement and one-shot consumption only. The native touch/buff/expiry
 * pipeline remains the sole executor; no buff is reconstructed from a used stand. */
export class MassShrines {
  massFocusCount=1;
  private live = new Map<string, Shrine>();
  private saved = new Map<string, MassShrineSave>();
  private owners = new Map<string, Owner>();
  constructor(saved: readonly MassShrineSave[] = [], readonly policy?: MassFieldResidency) {
    if (!Array.isArray(saved) || !policy && saved.length > MASS_SHRINE_LIMIT) throw Error('Invalid worldmass shrine count');
    for (const s of saved) {
      if (!s || typeof s.id !== 'string' || !s.id || this.saved.has(s.id) || typeof s.used !== 'boolean'
        || !s.pos || ![s.pos.x, s.pos.y].every(Number.isFinite)
        || s.resident !== undefined && (!policy || typeof s.resident !== 'boolean')
        || s.place !== undefined && (!policy || !s.place || typeof s.place.id !== 'string' || !s.place.id || !s.place.center))
        throw Error('Invalid worldmass shrine checkpoint');
      this.saved.set(s.id, JSON.parse(canonical(s)));
    }
  }
  private needed(world: World, pos: Context['center']): boolean {
    if (!this.policy) return true;
    if ((world.massRuntime?.focusDistance(world,pos,0)??((world.player.tier??0)===0?Math.hypot(world.player.pos.x-pos.x,world.player.pos.y-pos.y):Infinity)) <= this.policy.retainRadius) return true;
    return world.actors.some(a => !a.dead && (a.tier ?? 0) === 0 && Math.hypot(a.pos.x-pos.x,a.pos.y-pos.y) <= a.radius + 160);
  }
  canAdmit(place: Pick<MassPlace, 'id'>, rows: readonly MassShrineSpec[]): boolean {
    return this.live.size + rows.filter(r => !this.live.has(shrineId(place,r))).length <= (this.policy?.maxResident ?? MASS_SHRINE_LIMIT)*this.massFocusCount;
  }
  private remember(id: string, shrine: Shrine): MassShrineSave {
    const owner = this.owners.get(id);
    return { id, pos: {...shrine.pos}, used: shrine.used,
      ...(this.policy && owner ? { resident:true, place:{id:owner.id,center:{...owner.center}} } : {}) };
  }
  sync(world: World): void {
    if (!this.policy) return;
    const removed = new Set<Shrine>();
    for (const [id, shrine] of this.live) {
      if (this.needed(world,shrine.pos)) continue;
      this.saved.set(id,{...this.remember(id,shrine),resident:false});
      this.live.delete(id); removed.add(shrine);
    }
    if (removed.size) world.shrines = world.shrines.filter(s => !removed.has(s));
  }
  restoreAdmitted(world: World, places: readonly MassPlace[], resolve: (place: MassPlace) => Context,
    locate?: (owner: Owner) => MassPlace | undefined): void {
    const known = new Map<string, { place: MassPlace; row: MassShrineSpec; center: Context['center'] }>();
    for (const place of places) {
      const { rows, center } = resolve(place);
      for (const row of rows) known.set(shrineId(place, row), { place, row, center });
    }
    for (const s of this.saved.values()) {
      if (s.place) {
        const place=locate?.(s.place);
        if (!place || place.id !== s.place.id || canonical(place.center) !== canonical(s.place.center)) throw Error('Unknown worldmass shrine owner');
        const {rows,center}=resolve(place), row=rows.find(r=>shrineId(place,r)===s.id);
        if (!row) throw Error('Unknown worldmass shrine');
        known.set(s.id,{place,row,center});
      }
      const owner = known.get(s.id);
      if (!owner || Math.hypot(s.pos.x - owner.center.x, s.pos.y - owner.center.y) + 14 >= owner.place.radius)
        throw Error('Unknown or displaced worldmass shrine');
    }
    for (const s of this.saved.values()) {
      const { place, row, center } = known.get(s.id)!;
      this.owners.set(s.id,{id:place.id,center:{...place.center}});
      if (s.resident !== false && this.needed(world,s.pos)) this.admit(world,place,[row],center);
    }
  }
  admit(world: World, place: MassPlace, rows: readonly MassShrineSpec[], center: Context['center']): void {
    if (!this.canAdmit(place,rows)) throw Error('Worldmass shrine capacity must be reserved before its encounter');
    for (const row of rows) {
      const id = shrineId(place, row);
      if (this.live.has(id)) continue;
      const offset = siteOffset(place, row.x, row.y);
      const saved=this.saved.get(id);
      const pos = saved ? {...saved.pos} : world.findFreeSpot({ x: center.x + offset.x, y: center.y + offset.y }, 14);
      if (!world.walk?.isWalkable(pos.x, pos.y) || world.pointInSolid(pos.x, pos.y, 14)
        || Math.hypot(pos.x - center.x, pos.y - center.y) + 14 >= place.radius) continue;
      const shrine: Shrine = { pos: { ...pos }, def: row.def, used: saved?.used ?? false, massSource: id };
      this.owners.set(id,{id:place.id,center:{...place.center}});
      this.live.set(id, shrine); world.shrines.push(shrine);
    }
  }
  snapshot(): MassShrineSave[] {
    const result=new Map(this.saved);
    for (const [id,s] of this.live) result.set(id,this.remember(id,s));
    return [...result.values()].map(s=>JSON.parse(canonical(s)) as MassShrineSave).sort((a,b) => a.id.localeCompare(b.id));
  }
  get residentCount(): number { return this.live.size; }
  residentOwners(): Owner[] { return [...new Map([...this.live.keys()].map(id=>{const o=this.owners.get(id)!;return [o.id,{id:o.id,center:{...o.center}}] as const;})).values()]; }
}
