import type { Vec2 } from '../core/math';
import type { World } from '../engine/world';
import { cellKey, neighborCell, type MassCell } from './address';

export interface MassFocus { id: string; pos: Vec2; tier: number }
export interface MassPopulationSlot { pos: Vec2; count: number }
export const MASS_FOCUS_LIMIT = 16;
/** Per-sweep broad phase for player/companion observers. Distance remains exact;
 * splitting players across the map no longer multiplies every cohort scan. */
export class MassObserverIndex {
  private cells=new Map<string,Vec2[]>();
  constructor(points:readonly Vec2[],private readonly cellSize:number){
    if(!Number.isFinite(cellSize)||cellSize<=0)throw Error('Invalid observer cell size');
    for(const p of points){const key=this.key(p.x,p.y),rows=this.cells.get(key)??[];rows.push(p);this.cells.set(key,rows);}
  }
  private key(x:number,y:number):string{return Math.floor(x/this.cellSize)+','+Math.floor(y/this.cellSize);}
  distance(pos:Vec2,radius:number):number{
    if(!Number.isFinite(radius)||radius<0)throw Error('Invalid observer radius');
    let best=Infinity;
    for(let y=Math.floor((pos.y-radius)/this.cellSize);y<=Math.floor((pos.y+radius)/this.cellSize);y++)
      for(let x=Math.floor((pos.x-radius)/this.cellSize);x<=Math.floor((pos.x+radius)/this.cellSize);x++)
        for(const p of this.cells.get(x+','+y)??[]){const d=Math.hypot(p.x-pos.x,p.y-pos.y);if(d<=radius)best=Math.min(best,d);}
    return best;
  }
  near(pos:Vec2,radius:number):boolean{return this.distance(pos,radius)!==Infinity;}
}
export function massPlayerFoci(world: World, boot = false): MassFocus[] {
  const seats = world.seats.filter(s => !s.keeper && !s.actor.dead);
  if (!seats.length && (boot || !world.localSeat.keeper) && !world.player.dead)
    return [{ id: world.localSeat.id, pos: { ...world.player.pos }, tier: world.player.tier ?? 0 }];
  return seats.map(s => ({ id: s.id, pos: { ...s.actor.pos }, tier: s.actor.tier ?? 0 }));
}
/** Interleave nearest-first lanes before deduplication; a crowded first lane
 * never consumes every bounded preparation slot ahead of a distant player. */
export function massFocusRoundRobin<T>(lanes: readonly (readonly T[])[], key: (row: T) => string, limit = Infinity): T[] {
  const result: T[] = [], seen = new Set<string>();
  for (let i = 0; lanes.some(l => i < l.length) && result.length < limit; i++) for (const lane of lanes) {
    const row = lane[i]; if (row === undefined) continue;
    const id = key(row); if (seen.has(id)) continue;
    seen.add(id); result.push(row); if (result.length === limit) break;
  }
  return result;
}
/** Connected overlapping neighborhoods share a budget, never duplicate owners.
 * Group identity depends on seat identity, not input order or the keeper's feet. */
export class MassFoci {
  members: readonly MassFocus[] = [];
  groups: readonly (readonly MassFocus[])[] = [];
  private turn = 0;
  set(input: readonly MassFocus[], radius: number): void {
    if (!Number.isFinite(radius)||radius<0||input.length > MASS_FOCUS_LIMIT || new Set(input.map(p => p.id)).size !== input.length
      || input.some(p => !p.id || !Number.isFinite(p.pos.x) || !Number.isFinite(p.pos.y) || !Number.isSafeInteger(p.tier) || p.tier < 0 || p.tier > 6))
      throw Error('Invalid worldmass focus set');
    const rows = input.map(p => Object.freeze({ ...p, pos: Object.freeze({ ...p.pos }) })).sort((a, b) => a.id.localeCompare(b.id));
    const groups: MassFocus[][] = [];
    for (const row of rows) {
      const touching = groups.filter(g => g.some(p => Math.hypot(row.pos.x - p.pos.x, row.pos.y - p.pos.y) <= radius * 2));
      const merged = [row, ...touching.flat()].sort((a, b) => a.id.localeCompare(b.id));
      for (const old of touching) groups.splice(groups.indexOf(old), 1);
      groups.push(merged);
    }
    this.members = Object.freeze(rows); this.groups = Object.freeze(groups.sort((a, b) => a[0].id.localeCompare(b[0].id)).map(g=>Object.freeze(g)));
  }
  distance(pos: Vec2, tier?: number): number {
    let distance = Infinity;
    for (const p of this.members) if (tier === undefined || p.tier === tier) distance = Math.min(distance, Math.hypot(pos.x - p.pos.x, pos.y - p.pos.y));
    return distance;
  }
  groupAt(pos: Vec2): number {
    let best = Infinity, found = -1;
    this.groups.forEach((group, i) => { for (const p of group) { const d = Math.hypot(pos.x - p.pos.x, pos.y - p.pos.y); if (d < best) { best = d; found = i; } } });
    return found;
  }
  populationAt(pos: Vec2, slots: readonly MassPopulationSlot[]): number {
    const group = this.groupAt(pos);
    return slots.reduce((n, row) => n + (this.groupAt(row.pos) === group ? row.count : 0), 0);
  }
  pages(at: (pos: Vec2) => MassCell, radius: number): MassCell[] {
    const offsets: { x: number; y: number }[] = [];
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) offsets.push({ x, y });
    offsets.sort((a, b) => a.x * a.x + a.y * a.y - b.x * b.x - b.y * b.y);
    return massFocusRoundRobin(this.members.map(p => offsets.map(d => neighborCell(at(p.pos), d.x, d.y))), cellKey);
  }
  /** Rotate cluster priority on each birth sweep. Existing identities stay put. */
  order<T>(rows: readonly T[], pos: (row: T) => Vec2, key: (row: T) => string): T[] {
    if (this.groups.length < 2) return [...rows];
    const lanes = this.groups.map(() => [] as T[]);
    for (const row of rows) lanes[this.groupAt(pos(row))].push(row);
    const offset = this.turn++ % lanes.length;
    return massFocusRoundRobin([...lanes.slice(offset), ...lanes.slice(0, offset)], key);
  }
}
