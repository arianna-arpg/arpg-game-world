import type { Actor } from './actor';
import type { Projectile, World } from './world';
import { dist, type Vec2 } from '../core/math';
import { instanceDelivery, instanceMods, skillContextTags,
  type SkillDef, type SkillInstance, type BuffEffect } from './skills';
import { attackSequenceOf, attackSequencePayload, attackSequenceSweepInstance, type AttackSequenceSpec } from './attackSequenceSpec';
import { mod, type Modifier, type SkillTag } from './stats';
import { baselineStatusDps, STATUS_DEFS } from './status';

interface SequenceState {
  owner: Actor; host: SkillInstance; spec: AttackSequenceSpec; policy: string; key: string;
  stacks: Map<Actor, number>; caught: number; retired: boolean; buffs: Map<Actor, BuffEffect>;
}
interface SequenceCast {
  state: SequenceState; inst: SkillInstance; caught: number; connected: boolean; done: boolean;
  receipt?: { target: Actor; dealt: number; physical: number };
}
interface Recovery {
  cast: SequenceCast; projectile: Projectile; target?: Actor; at: Vec2; from: Vec2;
  elapsed: number; duration: number; marker?: Actor; dealt: number; airborne: boolean;
}
interface Scheduled {
  state: SequenceState; inst: SkillInstance; aim: Vec2; due: number; power: number;
}

/** Actor/instance/target-scoped cycles and recoverable weapons. All damage still
 * enters the shared hit/status/mitigation paths; secondary generations never
 * inherit the recovery contract or advance the originating hit cycle. */
export class AttackSequences {
  private states = new Set<SequenceState>();
  private casts = new WeakMap<SkillInstance, SequenceCast>();
  private active = new Set<SequenceCast>();
  private recoveries: Recovery[] = [];
  private scheduled: Scheduled[] = [];
  private rainAt = new WeakMap<Projectile, number>();
  private deferredContacts: { projectile: Projectile; target: Actor }[] = [];
  private serial = 0;
  constructor(private w: World) {}

  private policy(inst: SkillInstance): string {
    return JSON.stringify([inst.treeNodes, inst.level, inst.sockets.map(s => s && [s.def.id, s.level, s.rolled]),
      inst.grafts?.map(s => [s.def.id, s.level, s.rolled]), inst.def.attackSequence]);
  }
  private state(owner: Actor, inst: SkillInstance): SequenceState | undefined {
    const host = inst.sequenceHost ?? inst;
    const captured = this.casts.get(inst);
    if (captured) return captured.state.retired ? undefined : captured.state;
    const spec = attackSequenceOf(host); if (!spec) return undefined;
    let state = [...this.states].find(s => s.owner === owner && s.host === host);
    const policy = this.policy(host);
    if (state && state.policy !== policy) { this.clear(owner, host); state = undefined; }
    if (!state) {
      state = { owner, host, spec, policy, key: `sequence:${owner.id}:${host.def.id}:${++this.serial}`,
        stacks: new Map(), caught: 0, retired: false, buffs: new Map() };
      this.states.add(state);
    }
    return state;
  }
  stacks(owner: Actor, host: SkillInstance, target: Actor): number {
    return this.state(owner, host)?.stacks.get(target) ?? 0;
  }
  private max(s: SequenceState): number { return s.spec.cycleMax ?? s.spec.hitCycle?.max ?? 1; }

  prepare(owner: Actor, host: SkillInstance, aim: Vec2, power = 1): SkillInstance {
    if (host.sequenceRole || !attackSequenceOf(host)) return host;
    const state = this.state(owner, host)!;
    const delivery = instanceDelivery(host);
    const extraMods: Modifier[] = [...(host.extraMods ?? [])];
    const area = state.spec.cycleArea;
    if (area) {
      // One footprint per swing, read from the enemy the caster aims at. Other
      // bodies keep their own damage cycles; iteration order cannot grow an arc.
      const target = this.w.enemiesOf(owner).filter(a => a.tier === owner.tier)
        .sort((a, b) => dist(a.pos, aim) - dist(b.pos, aim))[0];
      const step = target ? (state.stacks.get(target) ?? 0) + 1 : 1;
      extraMods.push(mod('meleeReach', 'more', area.radiusPerStack * step), mod('swingArc', 'more', area.arcPerStack * step));
    }
    const inst: SkillInstance = { ...host, def: { ...host.def, delivery, tags: [...skillContextTags(host)] },
      sockets: [...host.sockets], grafts: host.grafts && [...host.grafts], treeNodes: [...(host.treeNodes ?? [])],
      extraMods, state: host.state ??= {}, sequenceHost: host, sequenceRole: 'primary' };
    const cast: SequenceCast = { state, inst, caught: 0, connected: false, done: false };
    this.casts.set(inst, cast);
    if (state.spec.recovery) {
      this.active.add(cast); this.lock(state);
      const buff = state.spec.catchBuff;
      if (buff && state.caught) for (let i = 1; i <= state.caught; i++) {
        this.scheduled.push({ state, inst, aim: { ...aim }, due: this.w.time + i * buff.repeatInterval / owner.speedFactor(host), power });
      }
    }
    return inst;
  }

  /** Per-victim increased damage participates in the normal additive stat fold. */
  forTarget(owner: Actor, inst: SkillInstance, target: Actor, depth: number): SkillInstance {
    const cast = this.casts.get(inst), s = cast?.state;
    if (!s || s.owner !== owner || s.retired || !s.spec.hitCycle || depth > 0 || inst.sequenceRole !== 'primary') return inst;
    const step = (s.stacks.get(target) ?? 0) + 1;
    if (s.spec.vulnerability) return inst; // this investment replaces the Cleave-only ramp
    const hit = { ...inst, extraMods: [...(inst.extraMods ?? []), mod('damage', 'increased', step * s.spec.hitCycle.increasedPerStack)] };
    this.casts.set(hit, cast); return hit;
  }

  landed(owner: Actor, inst: SkillInstance, target: Actor, dealt: number, physical: number, depth: number): void {
    const cast = this.casts.get(inst), s = cast?.state;
    if (!cast || !s || s.owner !== owner || s.retired || depth > 0 || dealt <= 0) return;
    cast.receipt = { target, dealt, physical };
    const deferred = this.deferredContacts.find(c => c.projectile.inst === cast.inst && c.target === target);
    if (deferred) {
      this.deferredContacts.splice(this.deferredContacts.indexOf(deferred), 1);
      this.contact(deferred.projectile, target);
    }
    if (!s.spec.hitCycle) return;
    const step = (s.stacks.get(target) ?? 0) + 1, maximum = step >= this.max(s);
    s.stacks.set(target, maximum ? 0 : step);
    const v = s.spec.vulnerability;
    if (v) {
      target.removeBuff(s.key + ':vulnerability');
      if (!maximum && !target.dead && target.life > 0) target.addBuff({ type: 'buff', id: s.key + ':vulnerability',
        label: v.label, duration: v.duration, mods: [mod('damageTaken', 'increased', v.perStack * step)] });
    }
    const rhythm = s.spec.rhythm;
    if (rhythm && !target.dead && target.life > 0) {
      this.ailment(s, inst, target, step % 2 ? 'bleed' : 'impaled', step % 2 ? dealt * rhythm.bleed : physical * rhythm.impale,
        s.key + ':rhythm', !!s.spec.consumeRhythm);
      if (maximum && s.spec.consumeRhythm) {
        let bank = 0;
        target.statuses = target.statuses.filter(st => {
          if (st.sourceKey !== s.key + ':rhythm') return true;
          bank += st.dps * st.stacks * Math.max(0, st.remaining) + (st.rupture ?? 0); return false;
        });
        this.burst(s, inst, target, bank * s.spec.consumeRhythm.multiplier);
      }
    }
    if (maximum && s.spec.cycleBuff && !owner.dead) {
      const buff = { ...s.spec.cycleBuff, id: s.key + ':maximum' };
      owner.addBuff(buff, owner.sheet.get('effectDuration', skillContextTags(inst), instanceMods(inst)));
      s.buffs.set(owner, buff);
    }
    this.w.flashes.push({ pos: { ...target.pos }, radius: target.radius + 3 + step * 3,
      color: maximum ? '#f0b475' : inst.def.color, life: maximum ? 0.3 : 0.13, maxLife: maximum ? 0.3 : 0.13, edgeFrac: 0.85 });
  }

  /** Paid casting sweeps own independent beats; the cast bar governs the throw. */
  opening(owner: Actor, host: SkillInstance, aim: Vec2, power: number): void {
    const s = this.state(owner, host);
    if (!s || host.sequenceRole) return;
    for (const sweep of s.spec.castSweeps ?? []) {
      const inst = attackSequenceSweepInstance(host, sweep.delivery);
      const sweepPower = power * sweep.power;
      if (sweep.delay === 0) this.fire(s, inst, aim, sweepPower);
      else this.scheduled.push({ state: s, inst, aim: { ...aim },
        due: this.w.time + sweep.delay / owner.speedFactor(inst), power: sweepPower });
    }
  }

  private payload(s: SequenceState, host: SkillInstance, delivery: SkillDef['delivery'], tags?: SkillTag[]): SkillInstance {
    const inst = attackSequencePayload(host, delivery, tags);
    inst.sequenceHost = s.host;
    return inst;
  }
  private fire(s: SequenceState, inst: SkillInstance, aim: Vec2, power: number): void {
    const facing = s.owner.facing;
    this.w.executeSkill(s.owner, inst, aim, { noRepeat: true, noCooldown: true, dmgMult: power,
      componentUse: inst.sequenceRole === 'payload' && inst.def.delivery.type === 'melee' });
    s.owner.facing = facing;
  }

  beforeContact(p: Projectile): void {
    const cast = this.casts.get(p.inst); if (cast) cast.receipt = undefined;
  }
  /** True consumes this flight. First landed flesh owns the recovery, like a
   * catch-spot projectile; misses/blocks never strand a weapon in a body. */
  contact(p: Projectile, target: Actor): boolean {
    const cast = this.casts.get(p.inst), s = cast?.state, receipt = cast?.receipt;
    if (!cast || !s?.spec.recovery || s.retired || p.caster !== s.owner) return false;
    if (receipt?.target !== target) {
      if (this.w.pendingFuses.some(f => f.kind === 'hit' && f.inst === p.inst && f.targetId === target.id)) {
        this.deferredContacts.push({ projectile: p, target }); return true;
      }
      return false;
    }
    cast.connected = true;
    if (s.spec.impactBleed) {
      const impact = s.spec.impactBleed, radius = impact.radius * s.owner.sheet.get('aoeRadius', skillContextTags(p.inst), instanceMods(p.inst));
      for (const victim of this.w.enemiesOf(s.owner)) {
        if (victim.tier !== target.tier || dist(victim.pos, target.pos) > radius + victim.radius
          || !this.w.lineOfFire(target.pos, victim.pos, target.tier)) continue;
        this.burst(s, p.inst, victim, receipt.dealt * impact.power);
        if (!victim.dead) this.ailment(s, p.inst, victim, 'bleed', receipt.dealt * impact.bleed, s.key + ':impact');
      }
      this.w.flashes.push({ pos: { ...target.pos }, radius, color: '#b73e36', life: 0.3, maxLife: 0.3, edgeFrac: 0.7 });
    }
    const bounce = s.spec.bounce;
    if (bounce) {
      if (!target.dead) this.ailment(s, p.inst, target, 'bleed', receipt.dealt * s.spec.recovery.bleed, s.key + ':throw');
      s.owner.gainCharge(bounce.charge, bounce.amount, bounce.cap, p.inst);
      const angle = Math.random() * Math.PI * 2;
      let at = this.w.clampPos({ x: s.owner.pos.x + Math.cos(angle) * bounce.distance,
        y: s.owner.pos.y + Math.sin(angle) * bounce.distance }, bounce.radius, s.owner.pos, { tier: s.owner.tier });
      // Confinement preserves the owner's floor; an obstructed fallback lands
      // at their feet instead of stranding required equipment behind masonry.
      if (!this.w.lineOfFire(s.owner.pos, at, s.owner.tier)) at = { ...s.owner.pos };
      const marker = this.marker(s, p.inst, at, bounce.radius);
      if (!marker) return true; // failed placement leaves no axe to recover
      marker.look = bounce.airLook;
      this.recoveries.push({ cast, projectile: p, at, from: { ...target.pos }, elapsed: 0,
        duration: bounce.seconds, marker, dealt: receipt.dealt, airborne: true });
    } else if (!target.dead && target.life > 0) {
      this.recoveries.push({ cast, projectile: p, target, at: { ...target.pos }, from: { ...target.pos },
        elapsed: 0, duration: 0, dealt: receipt.dealt, airborne: false });
    }
    return true;
  }
  private marker(s: SequenceState, inst: SkillInstance, at: Vec2, radius: number): Actor | undefined {
    const body = this.w.spawnConstruct(s.owner, inst, { type: 'construct', kind: 'embed',
      look: s.spec.recovery!.look, range: 0, duration: 0, maxActive: 1000, invulnerable: true, placeRange: 9999 }, at, undefined, at);
    if (body) {
      body.lifespan = 0; body.radius = radius; body.untargetable = true; body.tier = s.owner.tier;
      // A pickup is a floor marking, never an anchored body that shoulders its
      // owner away. Use the existing shared body-pass-through stat.
      body.sheet.setBase('phasing', 1);
    }
    return body ?? undefined;
  }
  private lock(s: SequenceState): void {
    s.owner.skillRecoveryLocks.add(s.host.def.id);
    // A finite, full hotbar sweep is a presentation of the held recovery.
    s.owner.cooldowns.set(s.host.def.id, 1); s.owner.cooldownTotals.set(s.host.def.id, 1);
  }
  private release(s: SequenceState, miss: boolean): void {
    s.owner.skillRecoveryLocks.delete(s.host.def.id);
    s.owner.cooldowns.delete(s.host.def.id); s.owner.cooldownTotals.delete(s.host.def.id);
    if (miss && s.spec.recovery!.missCooldown > 0) {
      s.owner.cooldowns.set(s.host.def.id, s.spec.recovery!.missCooldown);
      s.owner.cooldownTotals.set(s.host.def.id, s.spec.recovery!.missCooldown);
    }
  }

  flight(p: Projectile, paint = true): void {
    if (paint && p.inst.sequenceHost) this.w.flashes.push({ pos: { ...p.pos }, radius: p.radius,
      color: p.color, life: 0.05, maxLife: 0.05, fx: 'recoverableAxe', facing: p.age * 14 });
    const cast = this.casts.get(p.inst), s = cast?.state, rain = s?.spec.flightRain;
    if (!s || s.retired || !rain || p.caster !== s.owner || this.w.time < (this.rainAt.get(p) ?? 0)) return;
    this.rainAt.set(p, this.w.time + rain.interval);
    const d = s.spec.thrown!;
    const inst = this.payload(s, p.inst, { ...d, radius: rain.radius, range: rain.range, count: 1 });
    this.w.spawnProjectile(s.owner, inst, p.pos, Math.random() * Math.PI * 2,
      { mult: p.mult * rain.power, depth: 1, inherit: this.w.inheritedFlight(p) });
  }

  private ailment(s: SequenceState, inst: SkillInstance, target: Actor, id: string, amount: number, sourceKey: string, holdDischarge = false): void {
    if (target.dead || amount <= 0) return;
    const sd = STATUS_DEFS[id], tags = skillContextTags(inst), extra = instanceMods(inst);
    const resist = target.sheet.get('ailmentResist', new Set<SkillTag>(sd.element ? [sd.element] : []));
    if (resist > 0 && Math.random() < resist) return;
    const duration = s.owner.sheet.get('effectDuration', tags, extra);
    const power = s.owner.sheet.get('statusMagnitude', new Set([...tags, ...(sd.element ? [sd.element] : [])]), extra);
    let dps = sd.dotType ? Math.max(amount, baselineStatusDps(id, this.w.zone.level)) * power / Math.max(0.5, duration) : 0;
    const critical = sd.dotType && Math.random() < s.owner.sheet.get('dotCrit', tags, extra) * s.owner.sheet.get('critChance', tags, extra);
    if (critical) dps *= s.owner.sheet.get('critMulti', tags, extra);
    const rupture = sd.dotType ? dps * sd.duration * duration * s.owner.sheet.get('dotRupture', tags, extra) : amount * power;
    target.applyStatus(id, dps, duration, inst.def.name, { casterId: s.owner.id, sourceKey, holdDischarge,
      rupture: rupture > 0 ? rupture : undefined, ruptureType: sd.element,
      stacksBonus: Math.round(s.owner.sheet.get('ailmentStacks', tags, extra)),
      leech: s.owner.sheet.get('dotLeech_' + id, tags, extra),
      propagates: Math.random() < s.owner.sheet.get('dotPropagates', tags, extra) });
  }
  private burst(s: SequenceState, inst: SkillInstance, target: Actor, amount: number): void {
    this.w.attackSequenceBurst(s.owner, inst, target, amount);
  }

  update(dt: number): void {
    for (const s of [...this.states]) {
      const seated = s.owner.skills.includes(s.host) || [...(s.owner.aiActionInsts?.values() ?? [])].includes(s.host)
        || s.owner.construct?.castInst === s.host;
      if (s.owner.dead || !this.w.actors.includes(s.owner) || !seated || s.policy !== this.policy(s.host)) { this.clear(s.owner, s.host); continue; }
      for (const target of s.stacks.keys()) if (target.dead || !this.w.actors.includes(target)) s.stacks.delete(target);
    }
    for (const job of [...this.scheduled]) if (job.due <= this.w.time) {
      this.scheduled.splice(this.scheduled.indexOf(job), 1);
      if (!job.state.retired) this.fire(job.state, job.inst, job.aim, job.power);
    }
    for (const r of [...this.recoveries]) {
      const s = r.cast.state, owner = s.owner, recovery = s.spec.recovery!;
      if (s.retired) continue;
      if (r.marker && (r.marker.dead || !this.w.actors.includes(r.marker))) { this.removeRecovery(r); continue; }
      r.elapsed += dt * this.w.timeflow.actorScale(owner);
      if (r.target) {
        r.at = { ...r.target.pos };
        const gone = r.target.dead || !this.w.actors.includes(r.target);
        const near = owner.tier === r.target.tier && dist(owner.pos, r.target.pos) <= owner.radius + r.target.radius + recovery.meleeRange
          && this.w.lineOfFire(owner.pos, r.target.pos, owner.tier);
        if (gone || near) {
          if (near && !gone) this.ailment(s, r.cast.inst, r.target, 'bleed', r.dealt * recovery.bleed, s.key + ':throw');
          this.removeRecovery(r); continue;
        }
        this.w.flashes.push({ pos: { x: r.at.x, y: r.at.y - r.target.radius }, radius: 8,
          color: r.cast.inst.def.color, life: 0.08, maxLife: 0.08, fx: 'recoverableAxe' });
      } else {
        const b = s.spec.bounce!;
        const near = owner.tier === (r.projectile.tier ?? 0) && dist(owner.pos, r.at) <= b.radius
          && this.w.lineOfFire(owner.pos, r.at, owner.tier);
        if (near) {
          if (r.elapsed < r.duration) {
            r.cast.caught++;
            if (s.spec.catchBuff) {
              s.caught = Math.min(s.spec.catchBuff.max, s.caught + 1);
              owner.addBuff({ type: 'buff', id: s.key + ':catch', label: s.spec.catchBuff.label,
                duration: 999999, maxStacks: s.spec.catchBuff.max, mods: [] });
            }
            const inherited = this.w.inheritedFlight(r.projectile);
            const nova = this.payload(s, r.cast.inst, { ...s.spec.thrown!, count: b.nova.count, ring: { phaseJitter: true },
              trajectory: inherited ? { homing: inherited.homing, erratic: inherited.erratic, spiral: inherited.spiral,
                orbit: inherited.orbit, spin: inherited.spin, weave: inherited.weave, amplitude: inherited.amp, orbitRadius: inherited.orbitR0 } : s.spec.thrown!.trajectory });
            this.fire(s, nova, owner.pos, r.projectile.mult * b.nova.power);
          }
          this.removeRecovery(r); continue;
        }
        if (r.elapsed < r.duration) {
          const t = r.elapsed / r.duration;
          r.projectile.pos = { x: r.from.x + (r.at.x - r.from.x) * t,
            y: r.from.y + (r.at.y - r.from.y) * t };
          this.flight(r.projectile, false);
          this.w.flashes.push({ pos: { x: r.projectile.pos.x, y: r.projectile.pos.y - Math.sin(t * Math.PI) * 90 },
            radius: 10, color: r.cast.inst.def.color, life: 0.08, maxLife: 0.08, fx: 'recoverableAxe', facing: r.elapsed * 12 });
          this.w.flashes.push({ pos: { ...r.at }, radius: b.radius, color: r.cast.inst.def.color,
            life: 0.08, maxLife: 0.08, edgeFrac: 0.9 });
        } else {
          r.airborne = false;
          if (r.marker) r.marker.look = recovery.look;
        }
      }
    }
    this.deferredContacts = this.deferredContacts.filter(c => this.w.pendingFuses.some(f =>
      f.kind === 'hit' && f.inst === c.projectile.inst && f.targetId === c.target.id));
    for (const cast of [...this.active]) {
      const s = cast.state;
      const flying = this.w.projectiles.some(p => this.casts.get(p.inst) === cast && p.caster === s.owner);
      const pending = this.scheduled.some(j => j.inst === cast.inst)
        || this.w.pendingSalvos.some(j => j.inst === cast.inst) || this.w.pendingRepeats.some(j => j.inst === cast.inst)
        || this.w.pendingFuses.some(j => j.inst === cast.inst);
      const objects = this.recoveries.filter(r => r.cast === cast);
      if (!flying && !pending && !objects.some(r => r.airborne) && !cast.done) {
        cast.done = true;
        if (!cast.caught && s.spec.catchBuff) { s.caught = 0; s.owner.removeBuff(s.key + ':catch'); }
      }
      if (!flying && !pending && !objects.length) {
        this.active.delete(cast);
        if (![...this.active].some(c => c.state === s)) this.release(s, !cast.connected);
      } else this.lock(s);
    }
  }
  private removeRecovery(r: Recovery): void {
    if (r.marker) r.marker.dead = true;
    this.recoveries.splice(this.recoveries.indexOf(r), 1);
  }
  clear(owner: Actor, host: SkillInstance): void {
    for (const s of [...this.states]) if (s.owner === owner && s.host === host) {
      s.retired = true; this.states.delete(s);
      for (const target of this.w.actors) {
        target.removeBuff(s.key + ':vulnerability');
        target.statuses = target.statuses.filter(st => !st.sourceKey?.startsWith(s.key + ':'));
      }
      for (const [a, b] of s.buffs) if (a.buffs.get(b.id)?.def === b) a.removeBuff(b.id);
      owner.removeBuff(s.key + ':catch');
      for (const r of [...this.recoveries]) if (r.cast.state === s) this.removeRecovery(r);
      for (const c of [...this.active]) if (c.state === s) this.active.delete(c);
      this.scheduled = this.scheduled.filter(j => j.state !== s);
      this.deferredContacts = this.deferredContacts.filter(j => this.casts.get(j.projectile.inst)?.state !== s);
      if (s.spec.recovery) this.release(s, false);
      const owned = (inst: SkillInstance) => inst.sequenceHost === host;
      this.w.projectiles = this.w.projectiles.filter(p => p.caster !== owner || !owned(p.inst));
      this.w.pendingRepeats = this.w.pendingRepeats.filter(p => p.caster !== owner || !owned(p.inst));
      this.w.pendingSteps = this.w.pendingSteps.filter(p => p.caster !== owner || !owned(p.inst));
      this.w.pendingFollowUps = this.w.pendingFollowUps.filter(p => p.caster !== owner || !owned(p.inst));
      this.w.pendingSalvos = this.w.pendingSalvos.filter(p => p.caster !== owner || !owned(p.inst));
      this.w.pendingFuses = this.w.pendingFuses.filter(p => p.caster !== owner || !owned(p.inst));
      for (const z of [...this.w.zones]) if (z.caster === owner && owned(z.inst)) this.w.retireOwnedZone(z);
      for (const a of this.w.actors) if (a.owner === owner && a.construct?.echo
        && a.construct.castInst && owned(a.construct.castInst)) this.w.kill(a, true);
    }
  }
  clearAll(): void { for (const s of [...this.states]) this.clear(s.owner, s.host); }
}
