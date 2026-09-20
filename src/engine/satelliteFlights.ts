import type { Actor } from './actor';
import type { SkillInstance } from './skills';
import type { Vec2 } from '../core/math';
import { carriedAllegiance, type CarriedEffectContext } from './carriedEffects';
import { SATELLITE_CFG, type SatelliteDef, type SatelliteEmission } from './satelliteSpec';

/** Host geometry only: replica clients never run a flight clock or an impact. */
export interface SatelliteFlightVisual {
  owner: number; family: string; slot: number; tier: number;
  from: Vec2; to: Vec2; radius: number; arc: number;
  phase: 'flight' | 'impact'; progress: number;
}
interface Flight {
  caster: Actor; def: SatelliteDef; spec: Extract<SatelliteEmission, { mode: 'lob' }>; inst: SkillInstance; slot: number; generation: number;
  from: Vec2; to: Vec2; radius: number; tier: number; allegiance: string;
  age: number; fresh: boolean; impacted: boolean;
}

/** A launched payload has a fixed mark and a full warning. Damage still runs
 * through the bearer's ordinary skill hit path, including credit and reflection. */
export class SatelliteFlights {
  visuals: SatelliteFlightVisual[] = [];
  private pending: Flight[] = [];
  clear(): void { this.pending = []; this.visuals = []; }
  retire(a: Actor): void {
    this.pending = this.pending.filter(f => f.caster !== a);
    this.visuals = this.visuals.filter(f => f.owner !== a.id);
  }
  launch(caster: Actor, def: SatelliteDef, inst: SkillInstance, slot: number, generation: number,
    from: Vec2, to: Vec2, radius: number): void {
    if (def.emit?.mode !== 'lob' || radius <= 0 || !Number.isFinite(radius)
      || this.pending.filter(f => f.caster === caster).length >= SATELLITE_CFG.maxFlightsPerActor) return;
    this.pending.push({ caster, def, spec: def.emit, inst, slot, generation, from: { ...from }, to: { ...to },
      radius, tier: caster.tier, allegiance: carriedAllegiance(caster), age: 0, fresh: true, impacted: false });
  }
  update(dt: number, ctx: CarriedEffectContext, live: (a: Actor, id: string, slot: number, generation: number) => boolean): void {
    const valid = (f: Flight) => live(f.caster, f.def.id, f.slot, f.generation)
      && !f.caster.dead && !f.caster.downed && ctx.active(f.caster)
      && f.caster.tier === f.tier && carriedAllegiance(f.caster) === f.allegiance;
    const visuals: SatelliteFlightVisual[] = [];
    // Hit callbacks may retire a bearer. Snapshot the iteration, then reconcile.
    for (const f of [...this.pending]) {
      if (!valid(f)) continue;
      const spec = f.spec;
      if (f.fresh) f.fresh = false;
      else f.age += Math.max(0, Math.min(SATELLITE_CFG.maxFrame, dt));
      if (!f.impacted && f.age + 1e-9 >= spec.flight) {
        f.impacted = true;
        if (ctx.clear(f.from, f.to, f.tier)) {
          for (const e of ctx.enemies(f.caster, f.radius, f.to)) {
            if (!valid(f)) break;
            if (e.dead || e.downed || e.untargetable || e.tier !== f.tier || !ctx.hostile(f.caster, e)
              || Math.hypot(e.pos.x - f.to.x, e.pos.y - f.to.y) > f.radius + e.radius
              || !ctx.clear(f.to, e.pos, f.tier)) continue;
            ctx.hit(f.caster, f.inst, e);
          }
        }
      }
      if (!valid(f) || f.age >= spec.flight + spec.flash) continue;
      visuals.push({ owner: f.caster.id, family: f.def.id, slot: f.slot, tier: f.tier,
        from: { ...f.from }, to: { ...f.to }, radius: f.radius, arc: spec.arc,
        phase: f.impacted ? 'impact' : 'flight',
        progress: f.impacted ? Math.min(1, (f.age - spec.flight) / spec.flash) : Math.min(1, f.age / spec.flight) });
    }
    this.pending = this.pending.filter(f => valid(f) && f.age < f.spec.flight + f.spec.flash);
    this.visuals = visuals.filter(v => this.pending.some(f => f.caster.id === v.owner && f.def.id === v.family && f.slot === v.slot));
  }
}
