import type { Actor } from './actor';
import type { Vec2 } from '../core/math';
import type { SkillInstance } from './skills';
import { carriedAllegiance, type CarriedEffectContext } from './carriedEffects';
import { AURORAS, AURORA_IDS, AURORA_CFG, auroraCapacityStat, type AuroraDef } from './auroraSpec';

export interface AuroraVisual {
  owner: number; family: string; slot: number; tier: number;
  x: number; y: number; radius: number; charge: number; releasing: boolean;
}
type Context = Pick<CarriedEffectContext, 'active' | 'elapsed' | 'enemies' | 'hostile' | 'clear' | 'instance' | 'launch' | 'radius'>;
interface Reservoir {
  def: AuroraDef; capacity: number; charge: number; ready: number; angle: number;
  released: number; cascade: number; releasing: boolean;
  center: Vec2; tier: number; allegiance: string; inst: SkillInstance; level: number;
}
const tau = Math.PI * 2;
const alive = (a: Actor): boolean => !a.dead && !a.downed;

export class Auroras {
  visuals: AuroraVisual[] = [];
  private states = new Map<Actor, Map<string, Reservoir>>();
  clear(): void { this.states.clear(); this.visuals = []; }
  retire(a: Actor): void {
    this.states.delete(a); this.visuals = this.visuals.filter(v => v.owner !== a.id);
  }
  update(actors: readonly Actor[], dt: number, ctx: Context): void {
    const present = new Set(actors);
    for (const a of this.states.keys()) if (!present.has(a) || !alive(a) || !ctx.active(a)) this.retire(a);
    const visuals: AuroraVisual[] = [];
    for (const a of actors) {
      if (!alive(a) || !ctx.active(a)) continue;
      const grants = a.sheet.armedFamily('auroraCapacity_', AURORA_IDS);
      let families = this.states.get(a);
      if (!grants.length) { if (families) this.retire(a); continue; }
      if (!families) this.states.set(a, families = new Map());
      const kept = new Set<string>(); let budget = AURORA_CFG.maxPerActor;
      const elapsed = Math.max(0, Math.min(AURORA_CFG.maxFrame, ctx.elapsed(a, dt)));
      for (const id of grants) {
        const def = AURORAS[id]; if (!def) continue;
        const tags = new Set(def.tags), grant = a.sheet.get(auroraCapacityStat(id), tags);
        const capacity = grant > 0 ? Math.min(budget, AURORA_CFG.maxCapacity,
          Math.floor(grant + a.sheet.get('auroraCapacity', tags))) : 0;
        if (!Number.isFinite(capacity) || capacity <= 0) continue;
        budget -= capacity; kept.add(id);
        let s = families.get(id);
        const inst = s?.level === a.level && s.def === def ? s.inst : ctx.instance(a, def.skill);
        if (!inst) continue;
        // Reconfiguring capacity cannot refill a reservoir or bank free volleys.
        if (!s || s.def !== def || s.capacity !== capacity || s.tier !== a.tier
          || s.allegiance !== carriedAllegiance(a)
          || Math.hypot(s.center.x - a.pos.x, s.center.y - a.pos.y) > AURORA_CFG.teleport) {
          s = { def, capacity, charge: 0, ready: 0, angle: a.id * 2.399963229728653 % tau,
            released: 0, cascade: 0, releasing: false, center: { ...a.pos }, tier: a.tier,
            allegiance: carriedAllegiance(a), inst, level: a.level };
          families.set(id, s);
        }
        s.inst = inst; s.level = a.level; s.center = { ...a.pos };
        const point = (slot: number) => {
          // Every ring uses a full-circle fan, staggered relative to its neighbor.
          const ring = Math.floor(slot / def.perRing), index = slot % def.perRing;
          const count = Math.min(def.perRing, capacity - ring * def.perRing);
          const angle = s!.angle + tau * (index + ring * 0.5) / count;
          const orbit = a.radius + def.orbit + ring * def.ringSpacing;
          return { x: a.pos.x + Math.cos(angle) * orbit, y: a.pos.y + Math.sin(angle) * orbit, angle };
        };
        if (elapsed > 0 && s.releasing) {
          s.cascade += elapsed;
          // Bounded by the reservoir, never by an unbounded catch-up loop.
          while (s.released < capacity && s.cascade + 1e-9 >= def.cascade) {
            s.cascade -= def.cascade;
            const p = point(s.released++);
            if (ctx.clear(a.pos, p, a.tier)) ctx.launch(a, inst, p, p.angle);
          }
          if (s.released >= capacity) {
            s.releasing = false; s.charge = 0; s.ready = 0; s.released = 0; s.cascade = 0;
          }
        } else if (elapsed > 0) {
          s.angle = (s.angle + elapsed * def.turnSpeed) % tau;
          const wasFull = s.charge + 1e-9 >= capacity;
          s.charge = Math.min(capacity, s.charge + elapsed * a.sheet.get('auroraRecharge', tags) / def.recharge);
          if (wasFull) s.ready += elapsed;
          if (wasFull && s.ready + 1e-9 >= def.ready) {
            const enemies = ctx.enemies(a, def.range);
            if (enemies.some(e => alive(e) && !e.untargetable && e.tier === a.tier && ctx.hostile(a, e)
              && Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y) <= def.range && ctx.clear(a.pos, e.pos, a.tier))) {
              s.releasing = true; s.cascade = 0; s.released = 0;
            }
          }
        }
        const radius = ctx.radius(a, inst);
        for (let slot = s.releasing ? s.released : 0; slot < capacity; slot++) {
          const charge = s.releasing ? 1 : Math.max(0, Math.min(1, s.charge - slot));
          if (charge <= 1e-9) continue;
          const p = point(slot);
          if (!ctx.clear(a.pos, p, a.tier)) continue;
          visuals.push({ owner: a.id, family: id, slot, tier: a.tier, x: p.x, y: p.y,
            radius, charge, releasing: s.releasing });
        }
      }
      for (const id of families.keys()) if (!kept.has(id)) families.delete(id);
      if (!families.size) this.states.delete(a);
    }
    this.visuals = visuals;
  }
}
