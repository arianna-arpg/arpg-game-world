import type { Actor } from './actor';
import type { SkillInstance } from './skills';
import { pointSegDist, type Vec2 } from '../core/math';
import { SATELLITES, SATELLITE_IDS, SATELLITE_CFG, satelliteCountStat, type SatelliteDef } from './satelliteSpec';
import { SatelliteFlights } from './satelliteFlights';
import { carriedAllegiance, type CarriedEffectContext } from './carriedEffects';

export interface SatelliteVisual {
  owner: number; family: string; slot: number; x: number; y: number;
  cx: number; cy: number; orbit: number; radius: number; angle: number;
  tier: number; armed: boolean; progress: number; blocked: boolean;
  aimX?: number; aimY?: number; aimProgress?: number;
}
interface OrbitState {
  def: SatelliteDef; count: number; angle: number; age: number;
  center: Vec2; tier: number; allegiance: string; radius: number;
  inst: SkillInstance; level: number; hits: Map<number, number>[];
  nextShot: number[]; generation: number;
  aims: ({ at: Vec2; age: number; target: Actor } | undefined)[];
}

const gap = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
const tau = Math.PI * 2;
const alive = (a: Actor): boolean => !a.dead && !a.downed;
const allegiance = carriedAllegiance;

/** One conductor for every bearer. Stat sources retain grant attribution;
 * runtime contains phase, arming, recipient cooldowns and committed flights. */
export class Satellites {
  visuals: SatelliteVisual[] = [];
  readonly flights = new SatelliteFlights();
  private states = new Map<Actor, Map<string, OrbitState>>();

  clear(): void { this.states.clear(); this.visuals = []; this.flights.clear(); }
  retire(a: Actor): void {
    this.states.delete(a);
    this.flights.retire(a);
    this.visuals = this.visuals.filter(v => v.owner !== a.id);
  }

  update(actors: readonly Actor[], dt: number, ctx: CarriedEffectContext): void {
    const present = new Set(actors);
    const byId = new Map(actors.map(a => [a.id, a]));
    for (const a of this.states.keys()) if (!present.has(a) || !alive(a) || !ctx.active(a)) this.retire(a);
    const visuals: SatelliteVisual[] = [];
    for (const a of actors) {
      if (!alive(a) || !ctx.active(a)) continue;
      const grants = a.sheet.armedFamily('satelliteCount_', SATELLITE_IDS);
      let families = this.states.get(a);
      if (!grants.length) { if (families) this.retire(a); continue; }
      if (!families) this.states.set(a, families = new Map());
      const kept = new Set<string>();
      let budget = SATELLITE_CFG.maxPerActor;
      const stepDt = Math.max(0, Math.min(SATELLITE_CFG.maxFrame, ctx.elapsed(a, dt)));
      for (const id of grants) {
        const def = SATELLITES[id];
        if (!def || !alive(a) || !ctx.active(a)) continue;
        const tags = new Set(def.tags);
        const granted = a.sheet.get(satelliteCountStat(id), tags);
        const count = granted > 0 ? Math.min(budget, Math.floor(granted + a.sheet.get('satelliteCount', tags))) : 0;
        if (!Number.isFinite(count) || count <= 0) continue;
        budget -= count; kept.add(id);
        const radius = a.radius + def.orbit * a.sheet.get('satelliteOrbit', tags);
        let state = families.get(id);
        const inst = state?.level === a.level && state.def === def ? state.inst : ctx.instance(a, def.skill);
        if (!inst) continue;
        if (!state) {
          state = { def, count, angle: (a.id * 2.399963229728653) % tau, age: 0,
            center: { ...a.pos }, tier: a.tier, allegiance: allegiance(a), radius, inst, level: a.level,
            hits: Array.from({ length: count }, () => new Map()), generation: 0, aims: [],
            nextShot: Array.from({ length: count }, (_, i) => def.armTime + i * (def.emit?.interval ?? 0) / count) };
          families.set(id, state);
        }
        // Re-spacing, teleporting, changing story or changing sides never sweeps
        // an invisible damaging chord. The newly seated ring must arm again.
        const reseat = state.def !== def || state.count !== count || state.tier !== a.tier
          || state.allegiance !== allegiance(a) || Math.abs(state.radius - radius) > 0.01
          || gap(state.center, a.pos) > SATELLITE_CFG.maxSweepDistance;
        if (reseat) {
          state.age = 0; state.center = { ...a.pos };
          state.hits = Array.from({ length: count }, () => new Map());
          state.generation++; state.aims = [];
          state.nextShot = Array.from({ length: count }, (_, i) => def.armTime + i * (def.emit?.interval ?? 0) / count);
        }
        state.inst = inst; state.level = a.level; state.def = def; state.count = count; state.radius = radius;
        state.tier = a.tier; state.allegiance = allegiance(a);
        const startAge = state.age, startAngle = state.angle;
        const turn = def.turnSpeed * a.sheet.get('satelliteSpeed', tags) * stepDt;
        const steps = !def.rehit ? 0 : Math.min(SATELLITE_CFG.maxSweepSteps, Math.max(1,
          Math.ceil(stepDt / SATELLITE_CFG.maxStep),
          Math.ceil((gap(state.center, a.pos) + Math.abs(turn) * radius) / SATELLITE_CFG.sweepSpacing)));
        const reach = radius + Math.max(def.radius, def.emit?.range ?? 0) + gap(state.center, a.pos);
        const enemies = stepDt > 0 && startAge + stepDt + 1e-9 >= def.armTime
          ? ctx.enemies(a, reach).filter(e => e.tier === a.tier && gap(a.pos, e.pos) <= reach + e.radius) : [];
        for (let slot = 0; slot < count; slot++) {
          const hits = state.hits[slot], offset = slot * tau / count;
          let previous = { x: state.center.x + Math.cos(startAngle + offset) * radius,
            y: state.center.y + Math.sin(startAngle + offset) * radius };
          for (let s = 1; s <= steps; s++) {
            const u = s / steps, age = startAge + stepDt * u, angle = startAngle + offset + turn * u;
            const center = { x: state.center.x + (a.pos.x - state.center.x) * u,
              y: state.center.y + (a.pos.y - state.center.y) * u };
            const p = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
            // Both ends must be armed: the arming frame cannot backdate contact.
            if (def.rehit && stepDt > 0 && age - stepDt / steps >= def.armTime && ctx.clear(center, p, a.tier)) {
              for (const e of enemies) {
                if (!alive(a) || !ctx.active(a) || a.sheet.get(satelliteCountStat(id), tags) <= 0) break;
                if (!alive(e) || e.untargetable || e.tier !== a.tier || !ctx.hostile(a, e)
                  || (hits.get(e.id) ?? -Infinity) > age + 1e-9
                  || pointSegDist(e.pos.x, e.pos.y, previous.x, previous.y, p.x, p.y) > def.radius + e.radius
                  || !ctx.clear(previous, p, a.tier) || !ctx.clear(p, e.pos, a.tier)) continue;
                hits.set(e.id, age + def.rehit);
                ctx.hit(a, inst, e);
              }
            }
            previous = p;
          }
          for (const [victim, until] of hits) if (until <= startAge + stepDt) hits.delete(victim);
          const angle = startAngle + offset + turn;
          const point = { x: a.pos.x + Math.cos(angle) * radius, y: a.pos.y + Math.sin(angle) * radius };
          let aim = state.aims[slot];
          if (aim && def.emit) {
            if (!alive(a) || !ctx.active(a) || a.sheet.get(satelliteCountStat(id), tags) <= 0
              || !present.has(aim.target) || !alive(aim.target) || aim.target.untargetable
              || aim.target.tier !== a.tier || !ctx.hostile(a, aim.target)
              || gap(point, aim.at) > def.emit.range || !ctx.clear(a.pos, point, a.tier)
              || !ctx.clear(point, aim.at, a.tier)) {
              state.aims[slot] = aim = undefined;
            } else if (stepDt > 0) {
              aim.age += stepDt;
              if (aim.age + 1e-9 >= def.emit.windup!) {
                if (def.emit.mode === 'lob') this.flights.launch(a, def, inst, slot, state.generation, point, aim.at, ctx.radius(a, inst));
                else ctx.launch(a, inst, point, Math.atan2(aim.at.y - point.y, aim.at.x - point.x));
                state.aims[slot] = aim = undefined;
              }
            }
          }
          if (!aim && def.emit && stepDt > 0 && startAge + stepDt + 1e-9 >= state.nextShot[slot]
            && alive(a) && ctx.active(a) && ctx.clear(a.pos, point, a.tier)) {
            const target = enemies.filter(e => alive(e) && !e.untargetable && ctx.hostile(a, e)
              && gap(point, e.pos) <= def.emit!.range && ctx.clear(point, e.pos, a.tier))
              .sort((b, c) => (def.emit!.target === 'farthest' ? -1 : 1) * (gap(point, b.pos) - gap(point, c.pos)) || b.id - c.id)[0];
            if (target) {
              if (def.emit.windup) state.aims[slot] = aim = { at: { ...target.pos }, age: 0, target };
              else if (def.emit.mode === 'lob') this.flights.launch(a, def, inst, slot, state.generation, point, target.pos, ctx.radius(a, inst));
              else ctx.launch(a, inst, point, Math.atan2(target.pos.y - point.y, target.pos.x - point.x));
              const next = state.nextShot[slot] + def.emit.interval + (def.emit.windup ?? 0);
              state.nextShot[slot] = next > startAge + stepDt ? next : startAge + stepDt + def.emit.interval + (def.emit.windup ?? 0);
            }
          }
          visuals.push({ owner: a.id, family: id, slot, ...point,
            ...(aim ? { aimX: aim.at.x, aimY: aim.at.y, aimProgress: Math.min(1, aim.age / def.emit!.windup!) } : {}), cx: a.pos.x, cy: a.pos.y,
            orbit: radius, radius: def.radius, angle, tier: a.tier,
            armed: startAge + stepDt >= def.armTime,
            progress: Math.min(1, (startAge + stepDt) / def.armTime), blocked: !ctx.clear(a.pos, point, a.tier) });
        }
        state.age += stepDt; state.angle = (startAngle + turn) % tau; state.center = { ...a.pos };
      }
      for (const id of families.keys()) if (!kept.has(id)) families.delete(id);
      if (!families.size) this.states.delete(a);
    }
    // A reflected hit may retire a bearer while the conductor is running.
    this.visuals = visuals.filter(v => {
      const a = byId.get(v.owner);
      return a && alive(a) && ctx.active(a) && this.states.get(a)?.has(v.family)
        && a.sheet.get(satelliteCountStat(v.family), new Set(SATELLITES[v.family].tags)) > 0;
    });
    this.flights.update(dt, ctx, (a, id, slot, generation) => {
      const st = this.states.get(a)?.get(id);
      return present.has(a) && !!st && st.generation === generation && slot < st.count
        && a.sheet.get(satelliteCountStat(id), new Set(st.def.tags)) > 0;
    });
  }
}
