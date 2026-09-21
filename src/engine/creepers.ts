import type { Actor } from './actor';
import type { Vec2 } from '../core/math';
import type { SkillInstance } from './skills';
import { carriedAllegiance, type CarriedEffectContext } from './carriedEffects';
import { CREEPERS, CREEPER_IDS, CREEPER_CFG, creeperCountStat, type CreeperDef } from './creeperSpec';

export interface CreeperContext extends Pick<CarriedEffectContext,
  'active' | 'elapsed' | 'enemies' | 'hostile' | 'clear' | 'instance' | 'hit' | 'radius'> {
  move(a: Actor, from: Vec2, to: Vec2, radius: number, distance: number): Vec2;
}
export interface CreeperVisual {
  owner: number; family: string; slot: number; tier: number; x: number; y: number;
  angle: number; radius: number; phase: 'arm' | 'roam' | 'hunt' | 'return' | 'windup' | 'strike';
  progress: number; strikeRadius: number;
  trail: { x: number; y: number; life: number }[];
}
interface Creep {
  pos: Vec2; angle: number; age: number; mode: 'roam' | 'hunt' | 'return';
  target?: Actor; goal: Vec2; offset: Vec2; wanderAt: number; rng: number;
  cooldown: number; bite?: { age: number; radius: number }; flash: number; strikeRadius: number;
  stuck: number; trail: { x: number; y: number; life: number }[];
}
interface Brood {
  def: CreeperDef; count: number; center: Vec2; tier: number; allegiance: string;
  inst: SkillInstance; level: number; creeps: Creep[];
}
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (a: Actor) => !a.dead && !a.downed;
// Local PRNG: wandering never consumes the combat/loot RNG stream.
function random(c: Creep): number {
  c.rng = (Math.imul(c.rng, 1664525) + 1013904223) >>> 0;
  return c.rng / 4294967296;
}
function fresh(a: Actor, id: string, slot: number): Creep {
  let seed = a.id ^ Math.imul(slot + 1, 2654435761);
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return { pos: { ...a.pos }, angle: 0, age: 0, mode: 'roam', goal: { ...a.pos }, offset: { x: 0, y: 0 },
    wanderAt: 0, rng: seed >>> 0, cooldown: 0, flash: 0, strikeRadius: 0, stuck: 0, trail: [] };
}

/** Host-only autonomous follower. No targetable actor or summon ownership slot. */
export class Creepers {
  visuals: CreeperVisual[] = [];
  private states = new Map<Actor, Map<string, Brood>>();
  clear(): void { this.states.clear(); this.visuals = []; }
  retire(a: Actor): void { this.states.delete(a); this.visuals = this.visuals.filter(v => v.owner !== a.id); }
  update(actors: readonly Actor[], dt: number, ctx: CreeperContext): void {
    const present = new Set(actors), visuals: CreeperVisual[] = [];
    for (const a of this.states.keys()) if (!present.has(a) || !alive(a) || !ctx.active(a)) this.retire(a);
    for (const a of actors) {
      if (!alive(a) || !ctx.active(a)) continue;
      const grants = a.sheet.armedFamily('creeperCount_', CREEPER_IDS);
      let families = this.states.get(a);
      if (!grants.length) { if (families) this.retire(a); continue; }
      if (!families) this.states.set(a, families = new Map());
      const kept = new Set<string>(); let budget = CREEPER_CFG.maxPerActor;
      const elapsed = Math.max(0, Math.min(CREEPER_CFG.maxFrame, ctx.elapsed(a, dt)));
      for (const id of grants) {
        const def = CREEPERS[id]; if (!def || !alive(a)) continue;
        const tags = new Set(def.tags), count = Math.min(budget, Math.floor(a.sheet.get(creeperCountStat(id), tags)));
        if (!Number.isFinite(count) || count <= 0) continue;
        budget -= count; kept.add(id);
        let s = families.get(id);
        const inst = s?.def === def && s.level === a.level ? s.inst : ctx.instance(a, def.skill);
        if (!inst) continue;
        if (!s || s.def !== def || s.count !== count || s.tier !== a.tier || s.allegiance !== carriedAllegiance(a)
          || distance(s.center, a.pos) > CREEPER_CFG.teleport) {
          s = { def, count, center: { ...a.pos }, tier: a.tier, allegiance: carriedAllegiance(a), inst, level: a.level,
            creeps: Array.from({ length: count }, (_, slot) => fresh(a, id, slot)) };
          families.set(id, s);
        }
        s.inst = inst; s.level = a.level; s.center = { ...a.pos };
        const live = () => alive(a) && ctx.active(a) && this.states.get(a)?.get(id) === s
          && a.sheet.get(creeperCountStat(id), tags) >= count;
        const enemies = elapsed > 0 ? ctx.enemies(a, def.leash) : [];
        const eligible = (e: Actor) => alive(e) && !e.untargetable && e.tier === a.tier && ctx.hostile(a, e)
          && enemies.includes(e) && distance(a.pos, e.pos) <= def.leash;
        for (let slot = 0; slot < count && live(); slot++) {
          let c = s.creeps[slot];
          // Retire commitments immediately even during a zero-time reconciliation.
          if (distance(c.pos, a.pos) > def.leash || (c.target && (!present.has(c.target) || !alive(c.target)
            || c.target.untargetable || c.target.tier !== a.tier || !ctx.hostile(a, c.target)
            || distance(c.target.pos, a.pos) > def.leash))) {
            c.mode = 'return'; c.target = undefined; c.bite = undefined; c.flash = 0;
          }
          if (elapsed > 0) {
            c.age += elapsed; c.cooldown = Math.max(0, c.cooldown - elapsed); c.flash = Math.max(0, c.flash - elapsed);
            c.trail = c.trail.filter(p => (p.life -= elapsed) > 0);
            if (c.target && (!eligible(c.target) || !ctx.clear(c.pos, c.target.pos, a.tier))) {
              c.mode = 'return'; c.target = undefined; c.bite = undefined; c.flash = 0;
            }
            if (c.mode === 'return' && distance(c.pos, a.pos) <= def.home) {
              c.mode = 'roam'; c.wanderAt = 0;
            }
            if (c.age >= def.arm && c.mode !== 'return' && !c.target) {
              c.target = enemies.filter(e => eligible(e) && distance(a.pos, e.pos) <= def.acquire
                && ctx.clear(c.pos, e.pos, a.tier))
                .sort((b, d) => distance(c.pos, b.pos) - distance(c.pos, d.pos) || b.id - d.id)[0];
              if (c.target) { c.mode = 'hunt'; c.wanderAt = 0; }
            }
            if (c.bite) {
              c.bite.age += elapsed;
              if (c.bite.age + 1e-9 >= def.windup) {
                c.strikeRadius = c.bite.radius; c.bite = undefined; c.flash = def.flash; c.cooldown = def.recovery;
                for (const e of ctx.enemies(a, c.strikeRadius, c.pos)) {
                  if (!live()) break;
                  if (!alive(e) || e.untargetable || e.tier !== a.tier || !ctx.hostile(a, e)
                    || distance(c.pos, e.pos) > c.strikeRadius + e.radius
                    || !ctx.clear(c.pos, e.pos, a.tier)) continue;
                  ctx.hit(a, inst, e);
                }
              }
            } else if (c.flash <= 0) {
              if (c.age >= c.wanderAt || distance(c.pos, c.goal) < def.bodyRadius) {
                const angle = random(c) * Math.PI * 2;
                const reach = c.target ? def.bodyRadius * 2 : def.wander * (0.35 + random(c) * 0.65);
                c.offset = { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
                c.wanderAt = c.age + def.wanderMin + random(c) * (def.wanderMax - def.wanderMin);
              }
              const anchor = c.target?.pos ?? a.pos;
              c.goal = c.mode === 'return' ? { ...a.pos } : { x: anchor.x + c.offset.x, y: anchor.y + c.offset.y };
              // The goal remains inside the leash; return may start outside it after bearer movement.
              const g = distance(a.pos, c.goal);
              if (g > def.leash) c.goal = { x: a.pos.x + (c.goal.x - a.pos.x) * def.leash / g,
                y: a.pos.y + (c.goal.y - a.pos.y) * def.leash / g };
              const speed = (c.mode === 'return' ? def.returnSpeed : def.speed) * a.sheet.get('creeperSpeed', tags);
              const next = ctx.move(a, c.pos, c.goal, def.bodyRadius, speed * elapsed);
              const moved = distance(c.pos, next);
              c.stuck = speed > 0 && moved < speed * elapsed * 0.1 && distance(c.pos, c.goal) > def.bodyRadius
                ? c.stuck + elapsed : 0;
              if (moved > 1e-6) c.angle = Math.atan2(next.y - c.pos.y, next.x - c.pos.x);
              c.pos = next;
              const last = c.trail[c.trail.length - 1];
              if (moved > 0 && (!last || distance(last, c.pos) >= def.trailSpacing)) {
                c.trail.push({ ...c.pos, life: def.trailLife });
                if (c.trail.length > CREEPER_CFG.maxTrail) c.trail.shift();
              }
              // Impassable terrain cannot strand a passive follower forever. Re-burrow
              // at the owner, discard the old wake and require the full emergence again.
              if (c.stuck >= def.recall) { c = s.creeps[slot] = fresh(a, id, slot); }
              const radius = ctx.radius(a, inst);
              if (c.target && c.age >= def.arm && c.mode === 'hunt' && c.cooldown <= 0 && radius > 0
                && distance(c.pos, c.target.pos) <= radius * 0.5 + c.target.radius
                && ctx.clear(c.pos, c.target.pos, a.tier)) c.bite = { age: 0, radius };
            }
          }
          if (!live()) break;
          const phase = c.age < def.arm ? 'arm' : c.bite ? 'windup' : c.flash > 0 ? 'strike' : c.mode;
          visuals.push({ owner: a.id, family: id, slot, tier: a.tier, x: c.pos.x, y: c.pos.y,
            angle: c.angle, radius: def.bodyRadius, phase,
            progress: phase === 'arm' ? c.age / def.arm : c.bite ? c.bite.age / def.windup : c.flash > 0 ? 1 - c.flash / def.flash : 1,
            strikeRadius: c.bite?.radius ?? c.strikeRadius, trail: c.trail.map(p => ({ ...p })) });
        }
      }
      for (const id of families.keys()) if (!kept.has(id)) families.delete(id);
      if (!families.size) this.states.delete(a);
    }
    const byId = new Map(actors.map(a => [a.id, a]));
    this.visuals = visuals.filter(v => {
      const a = byId.get(v.owner);
      return a && alive(a) && ctx.active(a) && this.states.get(a)?.has(v.family)
        && a.sheet.get(creeperCountStat(v.family), new Set(CREEPERS[v.family].tags)) > 0;
    });
  }
}
