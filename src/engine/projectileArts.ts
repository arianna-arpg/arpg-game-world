import type { Actor } from './actor';
import type { Projectile, World } from './world';
import { angleDiff, angleTo, dist, type Vec2 } from '../core/math';
import { instanceDelivery, instanceMods, skillContextTags, type SkillInstance, type ProjectileDelivery } from './skills';
import { PROJECTILE_ART_LIMITS, projectileArtsLiveLimit, projectileArtsCount, projectileArtsOf, type ProjectileArtsSpec } from './projectileArtsSpec';
import { ailmentWoundBasis, type DamagePacket } from './damage';
import { STATUS_DEFS, type ActiveStatus } from './status';
import { sameStory } from './tiers';
import { SATELLITE_CFG } from './satelliteSpec';

interface ArtState {
  owner: Actor; host: SkillInstance; bonus: number; pillarAt: number; retired: boolean; markKey: string;
  focus?: { target: Actor; inst: SkillInstance; left: number; timer: number };
}
export interface ProjectileArtCast {
  state: ArtState; spec: ProjectileArtsSpec; bonus: number; childrenLeft: number;
}
export interface ProjectileOrbit {
  turn: number; radius: number; phase: number; offset: Vec2; heading: number;
  emitAt: number; novaAt: number; team: Actor['team'];
  path: Vec2[]; hitAt?: Vec2;
}
type Hit = (caster: Actor, inst: SkillInstance, target: Actor, power: number, origin: Vec2, tier: number) => void;

/** Native satellite and ailment contracts share ordinary projectile hits,
 * stats, clocks and attribution. Runtime state belongs to an actor + instance. */
export class ProjectileArts {
  private states = new Set<ArtState>();
  private serial = 0;
  constructor(private w: World, private hit: Hit,
    private payBank: (source: Actor, target: Actor, amount: number, type: import('./stats').DamageType | undefined) => void) {}

  private state(owner: Actor, host: SkillInstance): ArtState {
    let state = [...this.states].find(s => s.owner === owner && s.host === host);
    if (!state) { state = { owner, host, bonus: 0, pillarAt: 0, retired: false, markKey: `projectile-focus:${++this.serial}` }; this.states.add(state); }
    return state;
  }
  prepare(owner: Actor, host: SkillInstance, realUse: boolean): SkillInstance {
    if (host.projectileRole) return host;
    const spec = projectileArtsOf(host); if (!spec) return host;
    const state = this.state(owner, host);
    const cast: ProjectileArtCast = { state, spec, bonus: state.bonus, childrenLeft: spec.cascade?.budget ?? 0 };
    if (realUse && spec.ailmentRamp) state.bonus = Math.min(spec.ailmentRamp.max, state.bonus + spec.ailmentRamp.perCast);
    return { ...host, def: { ...host.def, delivery: instanceDelivery(host), tags: [...skillContextTags(host)] },
      sockets: [...host.sockets], grafts: host.grafts && [...host.grafts], treeNodes: [...(host.treeNodes ?? [])],
      projectileHost: host, projectileRole: 'primary', projectileSpec: spec, projectileCast: cast };
  }
  count(owner: Actor, inst: SkillInstance): number {
    return projectileArtsCount(owner, inst);
  }
  limit(inst: SkillInstance): number { return projectileArtsLiveLimit(inst); }
  configure(p: Projectile): void { configureProjectileArt(p, this.w.projectiles); }
  valid(p: Projectile): boolean {
    const cast = p.inst.projectileCast;
    if (cast?.state.retired) return false;
    if (!p.projectileOrbit) return true;
    return !p.caster.dead && !p.caster.downed && !p.caster.untargetable
      && sameStory(p, p.caster) && p.caster.team === p.projectileOrbit.team;
  }
  private nearest(p: Projectile, at: Vec2, radius: number): Actor | undefined {
    let best: Actor | undefined, distance = radius;
    for (const enemy of this.w.enemiesOf(p.caster, p.tier ?? 0)) {
      const d = dist(at, enemy.pos);
      if (d > distance || !this.w.lineOfFire(at, enemy.pos, p.tier)) continue;
      if (d === distance && best && best.id < enemy.id) continue;
      best = enemy; distance = d;
    }
    return best;
  }
  move(p: Projectile, dt: number): Vec2 | undefined {
    const orbit = p.projectileOrbit; if (!orbit) return undefined;
    const spec = projectileArtsOf(p.inst); if (!spec) return undefined;
    const oldAngle = p.angle, oldOffset = { ...orbit.offset }, oldAnchor = { ...p.anchor };
    // Integrate exponential orbit growth analytically so update rate does not
    // change its end phase. A capped angular rate keeps extreme duration sane.
    const growth = Math.log1p(spec.orbitGrowth ?? 0);
    const before = p.age - dt, cap = PROJECTILE_ART_LIMITS.maxOrbitSpeed;
    const integral = (t: number): number => {
      if (!growth) return Math.min(cap, orbit.turn) * t;
      const atCap = orbit.turn > 0 ? Math.max(0, Math.log(cap / orbit.turn) / growth) : Infinity;
      const ramp = Math.min(t, atCap);
      return orbit.turn / growth * Math.expm1(growth * ramp) + Math.max(0, t - atCap) * cap;
    };
    const phaseAt = (t: number) => oldAngle + integral(before + dt * t) - integral(before);
    p.angle = phaseAt(1);
    const home = { x: p.caster.pos.x + Math.cos(p.angle) * orbit.radius,
      y: p.caster.pos.y + Math.sin(p.angle) * orbit.radius };
    const roam = spec.wander;
    if (roam) {
      const prey = this.nearest(p, home, roam.leash);
      const desired = prey ? { x: prey.pos.x - home.x, y: prey.pos.y - home.y } : { x: 0, y: 0 };
      const delta = angleDiff(orbit.heading, angleTo(orbit.offset, desired));
      orbit.heading += Math.max(-roam.turnSpeed * dt, Math.min(roam.turnSpeed * dt, delta));
      // Smooth deterministic jitter, independent of frame RNG consumption.
      orbit.heading += Math.sin(p.age * 7 + orbit.phase * 3) * roam.jitter * dt;
      const step = Math.min(roam.speed * dt, dist(orbit.offset, desired));
      orbit.offset.x += Math.cos(orbit.heading) * step; orbit.offset.y += Math.sin(orbit.heading) * step;
      const length = Math.hypot(orbit.offset.x, orbit.offset.y);
      if (length > roam.leash) { orbit.offset.x *= roam.leash / length; orbit.offset.y *= roam.leash / length; }
    }
    const final = { x: home.x + orbit.offset.x, y: home.y + orbit.offset.y };
    const travel = Math.abs(p.angle - oldAngle) * orbit.radius + dist(oldAnchor, p.caster.pos) + dist(oldOffset, orbit.offset);
    orbit.path = []; orbit.hitAt = undefined;
    // Walk the ARC, never the center chord. Teleports reset to the destination
    // instead of dragging a damaging line across the whole room.
    if (dist(oldAnchor, p.caster.pos) > SATELLITE_CFG.maxSweepDistance) orbit.path.push(final);
    else {
      const count = Math.min(SATELLITE_CFG.maxSweepSteps, Math.max(1, Math.ceil(travel / SATELLITE_CFG.sweepSpacing)));
      for (let i = 0; i <= count; i++) {
        const t = i / count, angle = phaseAt(t);
        orbit.path.push({ x: oldAnchor.x + (p.caster.pos.x - oldAnchor.x) * t + Math.cos(angle) * orbit.radius
          + oldOffset.x + (orbit.offset.x - oldOffset.x) * t,
          y: oldAnchor.y + (p.caster.pos.y - oldAnchor.y) * t + Math.sin(angle) * orbit.radius
          + oldOffset.y + (orbit.offset.y - oldOffset.y) * t });
      }
    }
    p.anchor = { ...p.caster.pos };
    return final;
  }
  touches(p: Projectile, x: number, y: number, radius: number): boolean {
    const orbit = p.projectileOrbit; if (!orbit) return false;
    for (const point of orbit.path) {
      if (Math.hypot(point.x - x, point.y - y) > p.radius + radius) continue;
      if (!this.w.lineOfFire(p.caster.pos, point, p.tier) || !this.w.lineOfFire(point, { x, y }, p.tier)) continue;
      orbit.hitAt = point; return true;
    }
    return false;
  }
  impact(p: Projectile): Vec2 {
    return p.projectileOrbit?.hitAt ?? p.pos;
  }
  private payload(inst: SkillInstance, delivery: SkillInstance['def']['delivery']): SkillInstance {
    // Keep level, sockets, extra modifiers and tree investment exactly once.
    // The payload role suppresses native art recursion, not ordinary supports.
    return { ...inst, def: { ...inst.def, delivery }, projectileRole: 'payload', projectileContact: undefined,
      procChainDepth: Math.max(1, inst.procChainDepth ?? 0) };
  }
  private burst(p: Projectile, radius: number, power: number, fx?: string): void {
    const inst = this.payload(p.inst, { type: 'nova', radius });
    radius *= p.caster.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst));
    this.w.flashes.push({ pos: { ...p.pos }, radius, color: p.color, life: 0.35, maxLife: 0.35,
      fx, recoveryCueTier: p.tier });
    for (const enemy of this.w.enemiesOf(p.caster, p.tier ?? 0)) {
      if (dist(p.pos, enemy.pos) - enemy.radius > radius || !this.w.lineOfFire(p.pos, enemy.pos, p.tier)) continue;
      this.hit(p.caster, inst, enemy, p.mult * power, p.pos, p.tier ?? 0);
    }
  }
  private standard(p: Projectile, radius?: number): SkillInstance {
    const host = p.inst.projectileHost ?? p.inst;
    const base = host.def.delivery as ProjectileDelivery;
    return this.payload(p.inst, { ...base, ...(radius === undefined ? {} : { radius }) });
  }
  tick(p: Projectile): void {
    const orbit = p.projectileOrbit; if (!orbit) return;
    const spec = projectileArtsOf(p.inst);
    if (!spec || !this.w.lineOfFire(p.caster.pos, p.pos, p.tier)) return;
    if (spec.emit && p.age >= orbit.emitAt) {
      orbit.emitAt += spec.emit.interval;
      const enemy = this.nearest(p, p.pos, spec.emit.range);
      if (enemy) this.w.spawnProjectile(p.caster, this.standard(p, spec.emit.radius), { ...p.pos }, angleTo(p.pos, enemy.pos),
        { tier: p.tier, mult: p.mult * spec.emit.power, depth: p.depth + 1 });
    }
    if (spec.nova && p.age >= orbit.novaAt) {
      orbit.novaAt += spec.nova.interval; this.burst(p, spec.nova.radius, spec.nova.power, spec.nova.fx);
    }
  }
  expire(p: Projectile): void {
    if (!p.projectileOrbit) return;
    const spec = projectileArtsOf(p.inst);
    if (!spec || p.dissolved || !p.projectileOrbit || !this.valid(p)
      || p.maxAge === undefined || p.age < p.maxAge || !this.w.lineOfFire(p.caster.pos, p.pos, p.tier)) return;
    if (spec.expireBurst) this.burst(p, spec.expireBurst.radius, spec.expireBurst.power, spec.expireBurst.fx);
    if (spec.release) this.w.spawnProjectile(p.caster, this.standard(p), { ...p.pos }, angleTo(p.caster.pos, p.pos),
      { tier: p.tier, mult: p.mult, depth: p.depth + 1 });
  }
  bounce(p: Projectile): void {
    const flight = p.inst.projectileSpec?.flight;
    if (flight) p.mult *= 1 + flight.bounceMore;
  }
  contact(p: Projectile): SkillInstance {
    if (!p.inst.projectileCast) return p.inst;
    return { ...p.inst, projectileContact: { direction: p.dir, depth: p.depth, hits: [...p.hits.keys()], power: p.mult } };
  }
  chance(inst: SkillInstance, id: string): number {
    return inst.projectileCast?.spec.ailmentRamp?.status === id ? inst.projectileCast.bonus : 0;
  }
  basis(caster: Actor, inst: SkillInstance, target: Actor, packet: DamagePacket, dealt: number, id: string): number {
    const spec = inst.projectileCast?.spec.whiteHeat ?? projectileArtsOf(inst)?.whiteHeat;
    if (spec?.status !== id || dealt <= 0) return dealt;
    const extra = instanceMods(inst);
    const ordinary = ailmentWoundBasis(target, packet.amounts, caster, packet.tags, extra);
    const neutral = ailmentWoundBasis(target, packet.amounts, caster, packet.tags, extra, spec.element);
    // Preserve every other landed-hit adjustment (block, absorption, caps,
    // partitions). Only the resistance contribution changes for this wound.
    return ordinary > 0 ? dealt * neutral / ordinary : dealt;
  }
  applied(inst: SkillInstance, target: Actor, id: string, before?: { status?: ActiveStatus; dps?: number; remaining?: number }): void {
    const cast = inst.projectileCast; if (!cast || cast.state.retired) return;
    const after = target.statuses.find(s => s.id === id && !s.sourceKey && !s.challengeField);
    if (!after || (after === before?.status && after.dps === before.dps && after.remaining === before.remaining)) return;
    if (cast.spec.ailmentRamp?.status === id) cast.state.bonus = 0;
    const white = cast.spec.whiteHeat;
    if (white?.status === id) after.visual = white.visual;
  }
  /** Runs before this hit applies fresh ailments: an unignited victim cannot
   * trigger an "already ignited" reward from the very same blow. */
  landed(caster: Actor, inst: SkillInstance, target: Actor, dealt: number, depth: number, mult: number): void {
    const cast = inst.projectileCast;
    if (!cast || cast.state.retired || depth > 0 || dealt <= 0) return;
    const spec = projectileArtsOf(inst); if (!spec) return;
    const state = cast.state, tags = skillContextTags(inst), extra = instanceMods(inst);
    const area = caster.sheet.get('aoeRadius', tags, extra);
    if (spec.pillar && target.statuses.some(s => s.id === spec.pillar!.status && s.remaining > 0) && this.w.time >= state.pillarAt) {
      const s = spec.pillar; state.pillarAt = this.w.time + s.cooldown;
      const payload = this.payload(inst, { type: 'ground', radius: s.radius, castRange: 0,
        lingerDuration: s.duration, tickInterval: s.interval });
      this.w.zones.push({ pos: { ...target.pos }, tier: target.tier, radius: s.radius * area, caster, inst: payload,
        color: inst.def.color, delay: 0, exploded: true,
        linger: s.duration * caster.sheet.get('effectDuration', tags, extra), tickInterval: s.interval, tickTimer: 0,
        shape: 0, facing: 0, dmgMult: s.power * mult, depth: 1,
        skillVisualId: s.visual, fieldCue: { form: s.fx } });
    }
    if (spec.rupture) {
      const s = spec.rupture, wounds = target.statuses.filter(x => x.id === s.status && x.remaining > 0 && x.dps > 0);
      const paid = wounds.reduce((n, wound) => n + wound.dps * wound.stacks * wound.remaining * s.fraction, 0);
      if (paid > 0) {
        for (const wound of wounds) wound.dps *= 1 - s.fraction;
        const radius = s.radius * area, type = STATUS_DEFS[s.status]?.dotType;
        this.w.flashes.push({ pos: { ...target.pos }, radius, color: inst.def.color, life: 0.25, maxLife: 0.25,
          recoveryCueTier: target.tier, fx: s.fx });
        for (const enemy of this.w.enemiesOf(caster, target.tier)) {
          if (dist(target.pos, enemy.pos) - enemy.radius > radius || !this.w.lineOfFire(target.pos, enemy.pos, target.tier)) continue;
          // The bank is already mitigated at application. Paying it through
          // the DoT path avoids taking fire resistance a second time.
          this.payBank(caster, enemy, paid, type);
          if (enemy.life <= 0 && !enemy.dead && enemy !== target) this.w.kill(enemy, false, caster);
        }
      }
    }
    if (spec.attract && !target.dead && target.life > 0) {
      const current = state.focus?.target;
      const stronger = !current || current.dead || target.maxLife() > current.maxLife()
        || (target.maxLife() === current.maxLife() && target.id < current.id);
      if (stronger || current === target) {
        if (current && current !== target) this.unmark(state);
        state.focus = { target, inst, left: spec.attract.duration * caster.sheet.get('effectDuration', tags, extra), timer: 0 };
        target.applyStatus(spec.attract.mark, 0, state.focus.left / STATUS_DEFS[spec.attract.mark].duration, caster.name, { casterId: caster.id, sourceKey: state.markKey });
      }
    }
    const split = spec.cascade, contact = inst.projectileContact;
    if (split && contact && contact.depth < split.maxDepth && cast.childrenLeft > 0) {
      for (let n = 0; n < split.count && cast.childrenLeft > 0; n++) {
        cast.childrenLeft--;
        const dir = contact.direction + (split.count === 1 ? 0 : n / (split.count - 1) - 0.5) * split.spreadDeg * Math.PI / 180;
        const at = { x: target.pos.x + Math.cos(contact.direction) * (target.radius + 2),
          y: target.pos.y + Math.sin(contact.direction) * (target.radius + 2) };
        const child = { ...inst, projectileContact: undefined };
        this.w.spawnProjectile(caster, child, at, dir, { tier: target.tier, depth: contact.depth + 1, mult: contact.power * split.power });
        const shot = this.w.projectiles[this.w.projectiles.length - 1];
        for (const id of contact.hits) shot.hits.set(id, Infinity);
        shot.hits.set(target.id, Infinity);
      }
    }
  }
  update(dt: number): void {
    for (const state of this.states) {
      if (state.owner.dead || !this.w.actors.includes(state.owner)) {
        if (projectileArtsOf(state.host)?.orbit) this.clear(state.owner, state.host);
        else { this.unmark(state); this.states.delete(state); }
        continue;
      }
      const focus = state.focus, spec = focus && projectileArtsOf(focus.inst)?.attract;
      if (!focus || !spec) continue;
      const delta = dt * this.w.timeflow.actorScale(state.owner);
      focus.left -= delta; focus.timer -= delta;
      if (focus.left <= 0 || focus.target.dead || !sameStory(state.owner, focus.target)
        || !this.w.enemiesOf(state.owner).includes(focus.target)) {
        this.unmark(state); state.focus = undefined; continue;
      }
      if (focus.timer > 0) continue;
      focus.timer = spec.interval;
      const radius = spec.radius * state.owner.sheet.get('aoeRadius', skillContextTags(focus.inst), instanceMods(focus.inst));
      let slots = spec.maxWounds - focus.target.statuses.filter(s => s.gathered).length;
      for (const enemy of this.w.enemiesOf(state.owner, focus.target.tier)) {
        if (enemy === focus.target || dist(enemy.pos, focus.target.pos) > radius
          || !this.w.lineOfFire(enemy.pos, focus.target.pos, focus.target.tier)) continue;
        for (const wound of [...enemy.statuses]) {
          if (slots <= 0 || wound.id !== spec.status || wound.gathered || wound.remaining <= 0 || wound.dps <= 0) continue;
          if (focus.target.sheet.get('debuffImmunity') > 0) continue;
          const i = enemy.statuses.indexOf(wound); if (i < 0) continue;
          enemy.statuses.splice(i, 1);
          focus.target.statuses.push({ ...wound, gathered: true, sourceKey: `gathered:${++this.serial}` });
          if (!enemy.statuses.some(s => s.id === wound.id)) enemy.sheet.removeSource('status:' + wound.id);
          slots--;
          this.w.flashes.push({ pos: { ...enemy.pos }, radius: dist(enemy.pos, focus.target.pos),
            facing: angleTo(enemy.pos, focus.target.pos), color: wound.visual ? '#fff2d0' : '#ff7a2a',
            fx: spec.fx, recoveryCueTier: enemy.tier, life: 0.25, maxLife: 0.25 });
        }
      }
    }
  }
  private unmark(state: ArtState): void {
    const target = state.focus?.target;
    if (target) target.statuses = target.statuses.filter(s => s.sourceKey !== state.markKey);
  }
  clear(owner: Actor, host: SkillInstance): void {
    for (const state of this.states) if (state.owner === owner && state.host === host) {
      state.retired = true;
      this.unmark(state);
      this.states.delete(state);
    }
  }
  clearAll(): void { for (const s of [...this.states]) this.clear(s.owner, s.host); }
}

/** Same launch contract for shared and delegated projectile queues. */
export function configureProjectileArt(p: Projectile, projectiles: readonly Projectile[]): void {
    const spec = projectileArtsOf(p.inst), orbit = spec?.orbit;
    if (!orbit || p.parryDamage) return;
    const tags = skillContextTags(p.inst), extra = instanceMods(p.inst);
    const radius = p.caster.radius + orbit.radius * (spec.satellite ? p.caster.sheet.get('satelliteOrbit', tags, extra) : 1);
    const turn = orbit.turnSpeed * p.caster.sheet.get('orbitPower', tags, extra, 1)
      * (spec.satellite ? p.caster.sheet.get('satelliteSpeed', tags, extra) : 1);
    p.orbit = 1; p.pierce = Infinity; p.orbRadius = p.orbitR0 = radius;
    p.skillVisualId = orbit.visual;
    // Independent clocks remain deterministic even for a fixed firing phase.
    const stagger = ((p.angle / (Math.PI * 2)) % 1 + 1) % 1;
    p.projectileOrbit = { turn, radius, phase: p.angle, offset: { x: 0, y: 0 }, heading: p.dir,
      emitAt: (spec.emit?.interval ?? Infinity) * (1 + stagger),
      novaAt: (spec.nova?.interval ?? Infinity) * (1 + stagger), team: p.caster.team, path: [] };
    p.pos = { x: p.caster.pos.x + Math.cos(p.angle) * radius, y: p.caster.pos.y + Math.sin(p.angle) * radius };
    p.anchor = { ...p.caster.pos };
    // A shared family limit bounds recast accumulation. Replacing old orbs is
    // quiet retirement: it cannot pay expiry attacks early.
    const cap = projectileArtsLiveLimit(p.inst);
    const siblings = projectiles.filter(q => q !== p && q.caster === p.caster
      && q.inst.projectileHost === p.inst.projectileHost && q.projectileOrbit && !q.dissolved);
    for (const old of siblings.slice(0, Math.max(0, siblings.length + 1 - cap))) old.dissolved = true;
  }
