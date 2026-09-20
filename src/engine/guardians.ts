import type { SkillTag } from './stats';
import type { Actor } from './actor';
import type { Vec2 } from '../core/math';
import { carriedAllegiance, type CarriedEffectContext } from './carriedEffects';
import { GUARDIANS, GUARDIAN_IDS, GUARDIAN_CFG, guardianCountStat, type GuardianDef } from './guardianSpec';

type Context = Pick<CarriedEffectContext, 'active' | 'elapsed' | 'hostile' | 'clear'>;
export interface GuardianVisual {
  owner: number; family: string; slot: number; tier: number;
  x: number; y: number; radius: number; angle: number; progress: number; kind: 'reserve' | 'catch';
}
interface Ward {
  def: GuardianDef; count: number; charge: number[];
  center: Vec2; tier: number; allegiance: string;
}
interface Catch { visual: GuardianVisual; remaining: number; duration: number; }
const alive = (a: Actor) => !a.dead && !a.downed;

/** Fraction of a swept path at its first entry into a ward; inside/outbound
 * shots do not spend a charge. The resolver never turns a near miss into a hit. */
function entry(from: Vec2, to: Vec2, center: Vec2, radius: number): number | undefined {
  const x = from.x - center.x, y = from.y - center.y;
  const dx = to.x - from.x, dy = to.y - from.y, speed2 = dx * dx + dy * dy;
  const c = x * x + y * y - radius * radius, b = x * dx + y * dy;
  if (c <= 0 || speed2 <= 1e-12 || b >= 0) return;
  const disc = b * b - speed2 * c; if (disc < 0) return;
  const t = (-b - Math.sqrt(disc)) / speed2;
  return t >= 0 && t <= 1 ? t : undefined;
}

export class Guardians {
  visuals: GuardianVisual[] = [];
  private states = new Map<Actor, Map<string, Ward>>();
  private catches: Catch[] = [];
  get active(): boolean { return this.states.size > 0; }
  clear(): void { this.states.clear(); this.catches = []; this.visuals = []; }
  retire(a: Actor): void {
    this.states.delete(a); this.catches = this.catches.filter(c => c.visual.owner !== a.id);
    this.visuals = this.visuals.filter(v => v.owner !== a.id);
  }
  update(actors: readonly Actor[], dt: number, ctx: Context): void {
    const present = new Set(actors);
    for (const a of this.states.keys()) if (!present.has(a) || !alive(a) || !ctx.active(a)) this.retire(a);
    this.catches = this.catches.filter(c => {
      c.remaining -= Math.max(0, Math.min(GUARDIAN_CFG.maxFrame, dt));
      c.visual.progress = 1 - c.remaining / c.duration; return c.remaining > 0;
    });
    const visuals: GuardianVisual[] = [];
    for (const a of actors) {
      if (!alive(a) || !ctx.active(a)) continue;
      const grants = a.sheet.armedFamily('guardianCount_', GUARDIAN_IDS);
      let families = this.states.get(a);
      if (!grants.length) { if (families) this.retire(a); continue; }
      if (!families) this.states.set(a, families = new Map());
      const kept = new Set<string>(); let budget = GUARDIAN_CFG.maxPerActor;
      const elapsed = Math.max(0, Math.min(GUARDIAN_CFG.maxFrame, ctx.elapsed(a, dt)));
      for (const id of grants) {
        const def = GUARDIANS[id]; if (!def) continue;
        const tags = new Set<SkillTag>(['guardian', `guardian:${id}`]);
        const count = Math.min(budget, Math.floor(a.sheet.get(guardianCountStat(id), tags)));
        if (!Number.isFinite(count) || count <= 0) continue;
        budget -= count; kept.add(id);
        let s = families.get(id);
        if (!s || s.def !== def || s.count !== count || s.tier !== a.tier || s.allegiance !== carriedAllegiance(a)
          || Math.hypot(s.center.x - a.pos.x, s.center.y - a.pos.y) > GUARDIAN_CFG.teleport) {
          s = { def, count, charge: Array(count).fill(0), center: { ...a.pos }, tier: a.tier, allegiance: carriedAllegiance(a) };
          families.set(id, s);
          this.catches = this.catches.filter(c => c.visual.owner !== a.id || c.visual.family !== id);
        }
        s.center = { ...a.pos };
        for (let slot = 0; slot < count; slot++) {
          s.charge[slot] = Math.min(1, s.charge[slot] + elapsed * a.sheet.get('guardianRecharge', tags) / def.recharge);
          if (s.charge[slot] + 1e-9 >= 1) s.charge[slot] = 1;
          const angle = -Math.PI / 2 + (slot - (count - 1) / 2) * def.moteSpread;
          const r = a.radius + def.moteOffset;
          visuals.push({ owner: a.id, family: id, slot, tier: a.tier,
            x: a.pos.x + Math.cos(angle) * r, y: a.pos.y + Math.sin(angle) * r,
            radius: def.moteRadius, angle, progress: s.charge[slot], kind: 'reserve' });
        }
      }
      for (const id of families.keys()) if (!kept.has(id)) families.delete(id);
      if (!families.size) this.states.delete(a);
    }
    this.catches = this.catches.filter(c => [...this.states].some(([a, families]) => a.id === c.visual.owner && families.has(c.visual.family)));
    this.visuals = [...visuals, ...this.catches.map(c => c.visual)];
  }

  /** First eligible ward along the path wins, regardless of actor-array order. */
  intercept(caster: Actor, tier: number, from: Vec2, to: Vec2, radius: number, ctx: Context): Vec2 | undefined {
    let best: { a: Actor; s: Ward; slot: number; at: Vec2; t: number } | undefined;
    for (const [a, families] of this.states) {
      if (!alive(a) || !ctx.active(a) || a.tier !== tier || !ctx.hostile(caster, a) || ctx.elapsed(a, 1) <= 0) continue;
      for (const [id, s] of families) {
        if (s.tier !== a.tier || s.allegiance !== carriedAllegiance(a)
          || a.sheet.get(guardianCountStat(id), new Set<SkillTag>(['guardian', `guardian:${id}`])) < s.count) continue;
        const slot = s.charge.findIndex(c => c >= 1); if (slot < 0) continue;
        const t = entry(from, to, a.pos, a.radius + s.def.reach + radius);
        if (t === undefined || (best && t >= best.t)) continue;
        const at = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        if (!ctx.clear(from, at, tier) || !ctx.clear(a.pos, at, tier)) continue;
        best = { a, s, slot, at, t };
      }
    }
    if (!best) return;
    const { a, s, slot, at } = best; s.charge[slot] = 0;
    const reserve = this.visuals.find(v => v.kind === 'reserve' && v.owner === a.id && v.family === s.def.id && v.slot === slot);
    if (reserve) reserve.progress = 0;
    const visual: GuardianVisual = { owner: a.id, family: s.def.id, slot, tier,
      x: at.x, y: at.y, radius: s.def.moteRadius * 2.5,
      angle: Math.atan2(at.y - a.pos.y, at.x - a.pos.x), progress: 0, kind: 'catch' };
    this.catches.push({ visual, remaining: s.def.flash, duration: s.def.flash }); this.visuals.push(visual);
    return at;
  }
}
