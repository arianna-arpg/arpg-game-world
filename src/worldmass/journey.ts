import type { Vec2 } from '../core/math';
import { regionKind } from '../world/regions';
import type { MassPlace } from './contracts';
import type { MassGenerator } from './generator';
import type { MassWalk } from './walk';
import type { MassState } from './state';
import type { MassSettlement } from './settlement';
import { localOffset, type MassCell } from './address';
import { canonical, freezeData, massRandom } from './random';
export interface MassJourneyExtension {
  id: string; from: string; content: string;
  offset: { x: number; y: number }; radius: number; jitter: number;
}
export interface MassJourneySpec {
  /** Optional ordered branches from a destination or preceding branch identity. */
  extensions?: MassJourneyExtension[];
  source: string;
  width: number;
  color: string;
  clearingColor: string;
  destinations: {
    id: string;
    content: string;
    edge: 'north' | 'east' | 'south' | 'west';
    distance: number;
    radius: number;
    jitter: number;
  }[];
}
export interface MassTrail {
  id: string;
  points: readonly Vec2[];
  width: number;
}
export function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
/** An opening region planned from a settlement footprint, not camera arrival.
* Descriptors own the route spacing/content. Native settlement floors are never
* carved; beyond them, graded paths are physical ground before any actor spawns.
* This is a finite opening network; the wider country remains procedural. */
export class MassJourney {
  readonly places: readonly MassPlace[];
  readonly trails: readonly MassTrail[];
  /** Physical departures resolved from this run's native settlement footprint. */
  readonly departurePoints: readonly Vec2[];
  constructor(readonly spec: MassJourneySpec, readonly town: MassSettlement, private readonly generator: MassGenerator, private readonly walk: MassWalk) {
    if (!spec.source || !Number.isFinite(spec.width) || spec.width < 90 || spec.width > 240
      || !/^#[0-9a-f]{6}$/i.test(spec.color) || !/^#[0-9a-f]{6}$/i.test(spec.clearingColor)
      || !spec.destinations.length || spec.destinations.length > 4
      || new Set(spec.destinations.map(d => d.id)).size !== spec.destinations.length
      || new Set(spec.destinations.map(d => d.edge)).size !== spec.destinations.length)
      throw new Error('Invalid frontier route descriptor');
    const places: MassPlace[] = [], trails: MassTrail[] = [], w = town.zone.size.w, h = town.zone.size.h;
    for (const d of spec.destinations) {
      if (!d.id || !d.content || !['north', 'east', 'south', 'west'].includes(d.edge)
        || !Number.isFinite(d.distance) || d.distance < town.spec.apron + town.spec.blend + d.radius + 120 || d.distance > 6000
        || !Number.isFinite(d.radius) || d.radius < 160 || d.radius > 512
        || !Number.isFinite(d.jitter) || d.jitter < 0 || d.jitter > .3)
        throw new Error('Invalid frontier destination');
      const rng = massRandom(generator.run.seed, [spec.source, d.id]);
      const horizontal = d.edge === 'east' || d.edge === 'west';
      const normal = { x: d.edge === 'west' ? -1 : d.edge === 'east' ? 1 : 0,
        y: d.edge === 'north' ? -1 : d.edge === 'south' ? 1 : 0 };
      // Prefer an existing native path at the edge; otherwise the closest
      // walkable edge cell. No door, wall or interior is erased to make an exit.
      const extent = horizontal ? h : w, cs = town.grid.cellSize;
      const candidates: {
        pos: Vec2;
        score: number;
      }[] = [];
      for (let t = cs * 2.5; t < extent - cs * 2; t += cs) {
        const pos = horizontal ? { x: d.edge === 'east' ? w - cs / 2 : cs / 2, y: t }
          : { x: t, y: d.edge === 'south' ? h - cs / 2 : cs / 2 };
        const kind = town.foundationRegion(pos.x, pos.y);
        if (!kind || !regionKind(kind)?.walkable)
          continue;
        candidates.push({ pos, score: Math.abs(t - extent / 2) + (kind === 'path' || kind === 'road' ? -extent : 0) });
      }
      candidates.sort((a, b) => a.score - b.score);
      if (!candidates.length)
        throw new Error('Settlement has no traversable frontier edge');
      const start = candidates[0].pos;
      const tangent = rng.range(-d.jitter, d.jitter) * extent;
      const end = { x: start.x + normal.x * d.distance + (horizontal ? 0 : tangent),
        y: start.y + normal.y * d.distance + (horizontal ? tangent : 0) };
      const points = [start];
      for (const t of [.25, .5, .75]) {
        const bend = rng.range(-100, 100) * Math.sin(t * Math.PI);
        points.push({ x: start.x + (end.x - start.x) * t + (horizontal ? 0 : bend),
          y: start.y + (end.y - start.y) * t + (horizontal ? bend : 0) });
      }
      points.push(end);
      const id = canonical([generator.run.runId, spec.source, d.id]);
      places.push({ id, content: d.content, recipe: d.id, radius: d.radius, center: walk.at(end.x, end.y),
        source: { generator: generator.spec.id, version: generator.spec.version,
          rule: d.id, source: spec.source, stream: canonical([spec.source, d.id]) } });
      trails.push({ id: id + '/approach', points, width: spec.width });
    }
    this.departurePoints = freezeData(trails.map(t => ({ ...t.points[0] })));
    // Neighbouring destinations connect outside the town, providing a return
    // circuit and alternate approaches instead of four disconnected dead ends.
    const cx = w / 2, cy = h / 2, ordered = places.map(p => ({ p, q: this.local(p) }))
      .sort((a, b) => Math.atan2(a.q.y - cy, a.q.x - cx) - Math.atan2(b.q.y - cy, b.q.x - cx));
    if (ordered.length > 2)
      for (let i = 0; i < ordered.length; i++) {
        const a = ordered[i], b = ordered[(i + 1) % ordered.length];
        const corner = { x: a.q.x < 0 || b.q.x < 0 ? Math.min(a.q.x, b.q.x) : Math.max(a.q.x, b.q.x),
          y: a.q.y < 0 || b.q.y < 0 ? Math.min(a.q.y, b.q.y) : Math.max(a.q.y, b.q.y) };
        trails.push({ id: a.p.id + '/circuit', points: [a.q, corner, b.q], width: spec.width });
      }
    const extensionIds=new Set(spec.destinations.map(d=>d.id));
    if (spec.extensions!==undefined && (!Array.isArray(spec.extensions)||spec.extensions.length>12))
      throw new Error('Invalid frontier extensions');
    for (const e of spec.extensions ?? []) {
      const parent=places.find(p=>p.recipe===e.from);
      const length=Math.hypot(e.offset?.x,e.offset?.y);
      if (!e.id || extensionIds.has(e.id) || !parent || !e.content
        || !Number.isFinite(length) || length<parent.radius+e.radius+spec.width+60 || length>6000
        || !Number.isFinite(e.radius) || e.radius<160 || e.radius>512
        || !Number.isFinite(e.jitter) || e.jitter<0 || e.jitter>.2)
        throw new Error('Invalid frontier extension');
      extensionIds.add(e.id);
      const rng=massRandom(generator.run.seed,[spec.source,e.id]),start=this.local(parent);
      const side={x:-e.offset.y/length,y:e.offset.x/length},bend=rng.range(-e.jitter,e.jitter)*length;
      const end={x:start.x+e.offset.x+side.x*bend,y:start.y+e.offset.y+side.y*bend};
      const middle={x:(start.x+end.x)/2+side.x*rng.range(-80,80),
        y:(start.y+end.y)/2+side.y*rng.range(-80,80)};
      const points=[start,middle,end];
      // Extensions cannot punch a second path through the settlement. They
      // start from already connected places and remain outside its reserve.
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/generator.spec.terrainCell);
        for(let n=0;n<=steps;n++)
          if(town.reserves(a.x+(b.x-a.x)*n/steps,a.y+(b.y-a.y)*n/steps,spec.width/2))
            throw new Error('Frontier extension crosses settlement reserve');
      }
      if(town.reserves(end.x,end.y,e.radius))throw new Error('Frontier extension overlaps settlement');
      const id=canonical([generator.run.runId,spec.source,e.id]);
      places.push({id,content:e.content,recipe:e.id,radius:e.radius,center:walk.at(end.x,end.y),
        source:{generator:generator.spec.id,version:generator.spec.version,rule:e.id,
          source:spec.source,stream:canonical([spec.source,e.id])}});
      trails.push({id:id+'/approach',points,width:spec.width});
    }
    this.places = freezeData(places);
    this.trails = freezeData(trails);
    for (let i = 0; i < places.length; i++)
      for (let j = i + 1; j < places.length; j++)
        if (Math.hypot(this.local(places[i]).x - this.local(places[j]).x, this.local(places[i]).y - this.local(places[j]).y)
          < places[i].radius + places[j].radius + spec.width)
          throw new Error('Overlapping frontier destinations');
  }
  local(p: MassPlace): Vec2 { return localOffset(p.center, { ...this.walk.origin, x: 0, y: 0 }, this.generator.spec.addressSpan); }
  distance(pos: Vec2): number {
    let distance = Infinity;
    for (const t of this.trails)
      for (let i = 1; i < t.points.length; i++)
        distance = Math.min(distance, segmentDistance(pos, t.points[i - 1], t.points[i]));
    return distance;
  }
  reserves(pos: Vec2, radius = 0): boolean {
    return this.distance(pos) < this.spec.width / 2 + radius + 30
      || this.places.some(p => Math.hypot(this.local(p).x - pos.x, this.local(p).y - pos.y) < p.radius + radius + 60);
  }
  inCell(cell: MassCell): readonly MassPlace[] {
    const o = localOffset({ ...cell, x: 0, y: 0 }, { ...this.walk.origin, x: 0, y: 0 }, this.generator.spec.addressSpan);
    const s = this.generator.spec.addressSpan;
    return this.places.filter(p => {
      const q = this.local(p);
      return Math.hypot(Math.max(0, o.x - q.x, q.x - o.x - s), Math.max(0, o.y - q.y, q.y - o.y - s)) <= p.radius;
    });
  }
  /** Paint only on creation. On Continue sparse player edits remain authoritative. */
  establish(state: MassState): void {
    const cs = this.generator.spec.terrainCell, painted = new Set<string>();
    const paint = (x: number, y: number, color: string, cause: string) => {
      if (this.town.contains(x + cs / 2, y + cs / 2))
        return;
      state.paint({ address: this.walk.at(x, y), region: 'ground', color, cause });
    };
    for (const p of this.places) {
      const q = this.local(p);
      for (let y = Math.floor((q.y - p.radius) / cs) * cs; y < q.y + p.radius; y += cs)
        for (let x = Math.floor((q.x - p.radius) / cs) * cs; x < q.x + p.radius; x += cs)
          if (Math.hypot(x + cs / 2 - q.x, y + cs / 2 - q.y) < p.radius)
            paint(x, y, this.spec.clearingColor, p.source.source + '/' + p.recipe + '/foundation');
    }
    for (const trail of this.trails)
      for (let i = 1; i < trail.points.length; i++) {
        const a = trail.points[i - 1], b = trail.points[i], r = trail.width / 2, steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cs / 2));
        for (let n = 0; n <= steps; n++) {
          const q = { x: a.x + (b.x - a.x) * n / (steps || 1), y: a.y + (b.y - a.y) * n / (steps || 1) };
          for (let y = Math.floor((q.y - r) / cs) * cs; y < q.y + r; y += cs)
            for (let x = Math.floor((q.x - r) / cs) * cs; x < q.x + r; x += cs) {
              const key = x + ',' + y;
              if (painted.has(key) || segmentDistance({ x: x + cs / 2, y: y + cs / 2 }, a, b) > r)
                continue;
              painted.add(key);
              paint(x, y, this.spec.color, this.spec.source + '/trail');
            }
        }
      }
  }
}
