import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import type { OverlayBuildCtx } from '../types';
import { NO_BIAS, type OverlayView, type WorldOverlay } from '../../world/overlay';
import { pickSeat, type SeatTuning } from '../../world/seats';
import { eventTargetable } from '../../world/zonePolicy';

/** A Titan is a durable journey, not an announced encounter. Local scenery
 * is a projection of this small record; no modified terrain enters a save. */
export interface TitanDef {
  id: string; name: string; monster: string; color: string; glyph: string;
  minLevel: number; levelBonus: number;
  body: { kind: string; radius: number; length: number; spacing: number };
  wake: { kind: string; radius: number; spacing: number; gaps?: number[];
    gapWidth?: number; drift?: { radius: number; period: number } }[];
  reward: { xp: number; gems: number; tables: string[] };
  description: string;
}
export interface TitanTuning {
  defs: TitanDef[]; firstDelay: number; cooldown: number; chancePerSecond: number;
  maxConcurrent: number; secondsPerZone: number; pathLength: [number, number];
  seat: SeatTuning; warningSeconds: number; discoveryRadius: number;
  combatHoldSeconds: number; combatRadius: number;
}
export interface TitanJourney {
  id: string; defId: string; path: string[]; head: number; tail: number;
  life: number; seen: string[];
}
export class TitanField implements WorldOverlay {
  readonly id = 'titans';
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Titan wakes';
  readonly journeys: TitanJourney[] = [];
  private clock = 0;
  private next = 0;
  private serial = 0;
  private step = 0;
  private fraction = 0;
  private engaged = new Set<string>();
  constructor(private ctx: OverlayBuildCtx, readonly tuning: TitanTuning) {
    this.next = tuning.firstDelay;
  }
  def(j: TitanJourney): TitanDef { return this.tuning.defs.find(d => d.id === j.defId)!; }
  at(zid: string): TitanJourney[] {
    return this.journeys.filter(j => { const i = j.path.indexOf(zid); return i >= 0 && i <= j.head; });
  }
  engage(id: string, value: boolean): void { value ? this.engaged.add(id) : this.engaged.delete(id); }
  discover(id: string, zid: string): boolean {
    const j = this.journeys.find(x => x.id === id);
    if (!j || j.seen.includes(zid)) return false;
    j.seen.push(zid); return true;
  }
  slay(id: string): TitanDef | undefined {
    const i = this.journeys.findIndex(j => j.id === id);
    if (i < 0) return;
    const d = this.def(this.journeys[i]);
    this.journeys.splice(i, 1); this.engaged.delete(id);
    this.next = this.clock + this.tuning.cooldown;
    return d;
  }
  update(dt: number, view: OverlayView): void {
    const gate = this.ctx.gate();
    // Weight/level gates stop births, not an already discovered hunt.
    this.clock += dt;
    for (const j of this.journeys) {
      const d = this.def(j);
      if (!this.engaged.has(j.id)) j.head = Math.min(j.path.length - 0.4, j.head + dt / this.tuning.secondsPerZone);
      const settled = j.head >= j.path.length - 0.4;
      // Once resting, draw the tail into its own ground: a transient body
      // may delay a bridge crossing, but cannot permanently strand a hunt.
      const tail = settled ? j.head : Math.max(0, j.head - d.body.length);
      j.tail = Math.min(tail, j.tail + dt / this.tuning.secondsPerZone);
    }
    this.fraction += dt;
    while (this.fraction >= 1) {
      this.fraction -= 1;
      const rng = new Rng(this.ctx.seed ^ ++this.step);
      if (!gate.active || this.clock < this.next ||
        this.journeys.length >= Math.max(1, Math.round(this.tuning.maxConcurrent * gate.concurrencyMul)) ||
        !rng.chance(this.tuning.chancePerSecond * gate.ignitionMul)) continue;
      this.ignite(view, rng);
    }
  }
  /** Also the deterministic developer/probe entry point. Never bypasses
   * terrain policy or invents uncharted node identities. */
  ignite(view: OverlayView, rng = new Rng(this.ctx.seed ^ this.step), defId?: string, startId?: string): TitanJourney | undefined {
    const choices = this.tuning.defs.filter(d => d.minLevel <= view.charLevel &&
      (!defId || d.id === defId) && !this.journeys.some(j => j.defId === d.id));
    if (!choices.length) return;
    const def = rng.pick(choices);
    const occupied = new Set(this.journeys.flatMap(j => j.path));
    const admits = (z: ZoneDef) => !z.boundless && !z.tiers && eventTargetable(this.id, z);
    const start = startId ? view.byId[startId] : pickSeat(view, { event: this.id, ...this.tuning.seat,
      filter: z => !occupied.has(z.id) && admits(z) }, rng);
    if (!start || occupied.has(start.id) || !admits(start)) return;
    const path = [start.id];
    const length = rng.int(...this.tuning.pathLength);
    while (path.length < length) {
      const last = view.byId[path[path.length - 1]];
      const choices = last.exits.map(e => view.byId[e.to]).filter((z): z is ZoneDef =>
        !!z && !path.includes(z.id) && !occupied.has(z.id) && admits(z) &&
        z.exits.some(e => e.to === last.id));
      if (!choices.length) break;
      // Walk toward the explored frontier: unannounced distant births must
      // eventually press ground a player can find, not wander into infinity.
      const hero = view.byId[view.currentZoneId]?.map;
      choices.sort((a, b) => hero ? Math.hypot(a.map.x - hero.x, a.map.y - hero.y) -
        Math.hypot(b.map.x - hero.x, b.map.y - hero.y) : a.id.localeCompare(b.id));
      path.push(choices[0].id);
    }
    if (path.length < this.tuning.pathLength[0]) return;
    const j: TitanJourney = { id: `titan:${++this.serial}`, defId: def.id, path,
      head: 0.35, tail: 0, life: 1, seen: [] };
    this.journeys.push(j); this.next = this.clock + this.tuning.cooldown;
    return j;
  }
  devIgnite(view: OverlayView, zoneId: string, defId: string): boolean {
    return !!this.ignite({ ...view, charLevel: Infinity }, new Rng(this.ctx.seed ^ this.serial), defId, zoneId);
  }
  onNodeCharted(): void {}
  affectSpawns() { return NO_BIAS; }
  activityAt(zid: string): number { return this.at(zid).length; }
  renderMap(nodes: ZoneDef[]) {
    const byId = new Map(nodes.filter(n => !n.veiled).map(n => [n.id, n]));
    const pieces: string[] = [];
    for (const j of this.journeys) {
      const d = this.def(j);
      for (let i = 0; i <= Math.floor(j.head); i++) {
        const a = byId.get(j.path[i]);
        if (!a || !j.seen.includes(a.id)) continue;
        pieces.push(`<circle cx="${a.map.x}" cy="${a.map.y}" r="10" fill="${d.color}" opacity="0.65"/>`);
        const b = byId.get(j.path[i + 1]);
        // BOTH ends must be discovered; never draw a bearing into fog.
        if (b && j.seen.includes(b.id)) pieces.push(`<path d="M${a.map.x},${a.map.y} L${b.map.x},${b.map.y}" fill="none" stroke="${d.color}" stroke-width="7" stroke-dasharray="10 4" opacity="0.8"/>`);
      }
    }
    return { under: pieces.join(''), over: '' };
  }
  snapshot() { return { clock: this.clock, next: this.next, serial: this.serial,
    step: this.step, fraction: this.fraction, journeys: this.journeys.map(j => ({ ...j, path: [...j.path], seen: [...j.seen] })) }; }
  restore(raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const s = raw as ReturnType<TitanField['snapshot']>;
    const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
    this.clock = finite(s.clock) ? s.clock : 0;
    this.next = finite(s.next) ? s.next : this.clock + this.tuning.firstDelay;
    this.serial = finite(s.serial) ? Math.floor(s.serial) : 0;
    this.step = finite(s.step) ? Math.floor(s.step) : 0;
    this.fraction = finite(s.fraction) ? s.fraction % 1 : 0;
    this.journeys.length = 0; this.engaged.clear();
    const ids = new Set<string>();
    for (const j of Array.isArray(s.journeys) ? s.journeys : []) {
      if (!j || typeof j.id !== 'string' || !j.id || ids.has(j.id) || !this.tuning.defs.some(d => d.id === j.defId) ||
        !Array.isArray(j.path) || j.path.length < 2 || j.path.length > 32 ||
        !j.path.every(p => typeof p === 'string' && p.length > 0) || new Set(j.path).size !== j.path.length ||
        !finite(j.head) || !finite(j.tail) || j.tail > j.head || j.head > j.path.length - 0.4 ||
        !finite(j.life) || j.life <= 0 || j.life > 1) continue;
      ids.add(j.id);
      this.journeys.push({ id: j.id, defId: j.defId, path: [...j.path], head: j.head, tail: j.tail, life: j.life,
        seen: Array.isArray(j.seen) ?
        j.seen.filter(p => j.path.includes(p)) : [] });
    }
  }
  pruneZones(has: (id: string) => boolean): void {
    for (const j of [...this.journeys]) if (!j.path.every(has)) this.slay(j.id);
  }
}
