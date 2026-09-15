import { Actor } from './actor';
import type { World } from './world';
import { angleTo, dist, type Vec2 } from '../core/math';
import { mod } from './stats';
import { skillDamageBands } from './damage';
import { instanceMods, makeSkillInstance, skillContextTags, type ConstructDelivery, type SkillInstance, type SkillDef } from './skills';
import { challengeOf, type ChallengeSpec } from './challengeSpec';
import { SKILLS } from '../data/skills';

interface ChallengeState {
  owner: Actor; host: SkillInstance; spec: ChallengeSpec; policy: string;
  primed: boolean; guaranteedAt: number; retired: boolean;
}
interface ChallengeCast { state: ChallengeState; inst: SkillInstance; primed: boolean; generation: number; orbitTargets: Set<number> }
interface Effigy {
  body: Actor; cast: ChallengeCast; radius: number; average: number;
  creeper?: Actor; center: Vec2; trailAt: number; strikeAt: number;
}
interface Landing { cast: ChallengeCast; from: Vec2; at: Vec2; d: ConstructDelivery; remaining: number; duration: number; power: number }
interface Shock { effigy: Effigy; at: Vec2; due: number; greater: boolean; echoes: boolean }

/** Challenge casts capture their investment; bounded secondary generations
 * and explicit host ownership prevent recursion and respec leftovers. */
export class Challenges {
  private states = new Map<string, ChallengeState>();
  private casts = new WeakMap<SkillInstance, ChallengeCast>();
  private landings: Landing[] = [];
  private effigies: Effigy[] = [];
  private shocks: Shock[] = [];
  constructor(private w: World) {}
  private policy(inst: SkillInstance) {
    return JSON.stringify([inst.treeNodes, inst.level, inst.sockets.map(s => s && [s.def.id, s.level]), inst.grafts?.map(s => [s.def.id, s.level])]);
  }
  private key(owner: Actor, host: SkillInstance) { return `${owner.id}:${host.def.id}`; }
  private readyId(state: ChallengeState) { return `goad_reopening:${state.owner.id}:${state.host.def.id}`; }

  prepare(owner: Actor, inst: SkillInstance, real: boolean): SkillInstance {
    if (this.casts.has(inst)) return inst;
    const spec = challengeOf(inst); if (!spec) return inst;
    const key = this.key(owner, inst), policy = this.policy(inst);
    let state = this.states.get(key);
    if (state && (state.host !== inst || state.policy !== policy)) { this.clear(owner, state.host); state = undefined; }
    if (!state) {
      state = { owner, host: inst, spec, policy, primed: false, guaranteedAt: -Infinity, retired: false };
      this.states.set(key, state);
    }
    const snapshot = { ...inst, sockets: [...inst.sockets], grafts: inst.grafts && [...inst.grafts], treeNodes: [...(inst.treeNodes ?? [])],
      state: inst.state ??= {}, challengeHost: inst };
    this.casts.set(snapshot, { state, inst: snapshot, primed: real && state.primed, generation: 0, orbitTargets: new Set() });
    if (real) { state.primed = false; owner.removeBuff(this.readyId(state)); }
    return snapshot;
  }

  completed(owner: Actor, inst: SkillInstance): void {
    const cast = this.casts.get(inst); if (!cast || cast.state.retired) return;
    const state = cast.state, s = state.spec;
    if (!s.resetChance) return;
    const guaranteed = !!s.guaranteedResetEvery && this.w.time >= state.guaranteedAt;
    if (guaranteed || Math.random() < s.resetChance) {
      if (guaranteed) state.guaranteedAt = this.w.time + s.guaranteedResetEvery!;
      owner.cooldowns.delete(state.host.def.id); owner.cooldownTotals.delete(state.host.def.id);
      state.primed = true;
      owner.addBuff({ type: 'buff', id: this.readyId(state), label: 'Reopening Ready', duration: 999999, mods: [] });
      this.w.text(owner.pos, 'Goad reset — reopen the wound', '#e0a078', 12);
    }
  }

  beforeEffects(caster: Actor, inst: SkillInstance, target: Actor, dealt: number, depth: number): void {
    const cast = this.casts.get(inst);
    if (!cast || cast.state.retired || target.dead || dealt <= 0) return;
    const s = cast.state.spec, bleeding = target.statuses.some(st => st.id === 'bleed');
    if (depth === 0 && bleeding && s.bleedingImpaleMore) {
      const impale = target.statuses.find(st => st.id === 'impaled');
      if (impale?.rupture) impale.rupture *= 1 + s.bleedingImpaleMore;
    }
    if (cast.primed && s.bleedPop) {
      let remaining = 0;
      target.statuses = target.statuses.filter(st => {
        if (st.id !== 'bleed' || st.challengeField !== undefined) return true;
        remaining += st.dps * st.stacks * Math.max(0, st.remaining); return false;
      });
      if (remaining > 0) this.w.challengeBurst(caster, target, remaining * s.bleedPop);
      if (!target.dead) target.applyStatus('hemorrhage', dealt * 0.45, 1, 'Reopening Challenge', { casterId: caster.id });
    }
  }

  afterHit(caster: Actor, inst: SkillInstance, target: Actor, dealt: number, depth: number, power: number): void {
    if (dealt > 0 && depth === 0 && !target.dead) for (const effigy of this.effigies) {
      const f = effigy.cast.state.spec.impaleField;
      if (!f || !this.live(effigy) || caster.team !== effigy.body.team || caster.tier !== target.tier
        || target.tier !== effigy.body.tier || dist(target.pos, effigy.body.pos) > effigy.radius) continue;
      for (const other of this.w.enemiesOf(effigy.body)) {
        if (other === target || dist(other.pos, target.pos) > f.radius) continue;
        other.applyStatus('impaled', 0, 1, 'Lodged Contagion', { casterId: effigy.cast.state.owner.id });
        const lodged = other.statuses.find(st => st.id === 'impaled');
        if (lodged) { lodged.rupture = (lodged.rupture ?? 0) + dealt * f.ratio; lodged.ruptureType = 'physical'; }
      }
    }
    if (inst.def.id === 'goad_device_call') {
      const effigy = this.effigies.find(e => e.body === caster), s = effigy?.cast.state.spec;
      if (effigy && s?.aftershock && this.live(effigy) && target.statuses.some(st => st.id === 'taunted' && st.casterId === caster.id)
        && Math.random() < s.aftershock.chance && this.shocks.filter(sh => sh.effigy === effigy).length < 32) {
        const greater = !!s.greaterShock && Math.random() < s.greaterShock.chance;
        this.shocks.push({ effigy, at: { ...target.pos }, due: this.w.time + s.aftershock.delay, greater, echoes: true });
        this.w.flashes.push({ pos: { ...target.pos }, radius: greater ? s.greaterShock!.radius : s.aftershock.radius, color: '#b99b70', life: s.aftershock.delay, maxLife: s.aftershock.delay });
      }
    }
    const cast = this.casts.get(inst);
    if (!cast || cast.state.retired || dealt <= 0 || depth !== 0 || cast.generation > 1) return;
    const s = cast.state.spec;
    if (s.splinters && cast.generation === 0) {
      const f = s.splinters, bearing = angleTo(caster.pos, target.pos);
      for (let k = 0; k < f.count; k++) {
        const angle = bearing + (k / Math.max(1, f.count - 1) - 0.5) * f.spread * Math.PI / 180;
        const shard = this.secondary(cast, { type: 'projectile', speed: 420, radius: 6, range: 280 }, 1);
        const from = { x: target.pos.x + Math.cos(angle) * (target.radius + 8), y: target.pos.y + Math.sin(angle) * (target.radius + 8) };
        this.w.spawnProjectile(caster, shard, from, angle, { mult: power * f.power });
      }
    }
    if (s.ballast && !cast.orbitTargets.has(target.id)) {
      cast.orbitTargets.add(target.id);
      const b = s.ballast, owned = this.w.projectiles.filter(p => p.caster === caster && p.inst.challengeHost === cast.state.host && p.orbitAnchorId !== undefined);
      while (owned.length >= b.cap) { const old = owned.shift()!; this.w.projectiles.splice(this.w.projectiles.indexOf(old), 1); }
      const rock = this.secondary(cast, { type: 'projectile', speed: 170, radius: 7, range: 9999, duration: b.duration,
        rehit: b.rehit, trajectory: { orbit: 1, orbitRadius: b.radius } }, 2);
      const first = this.w.projectiles.length;
      this.w.spawnProjectile(caster, rock, { x: target.pos.x + b.radius, y: target.pos.y }, Math.PI / 2, { mult: power * b.power });
      for (const p of this.w.projectiles.slice(first)) { p.orbitAnchorId = target.id; p.anchor = { ...target.pos }; p.hits.set(target.id, Infinity); }
    }
  }

  private secondary(parent: ChallengeCast, delivery: SkillDef['delivery'], generation: number): SkillInstance {
    const inst: SkillInstance = { ...parent.inst, def: { ...parent.inst.def, delivery }, challengeHost: parent.state.host };
    this.casts.set(inst, { ...parent, inst, generation, orbitTargets: new Set() });
    return inst;
  }
  private payload(cast: ChallengeCast, delivery: SkillDef['delivery'], name: string): SkillInstance {
    const inst = makeSkillInstance({ ...cast.inst.def, id: `goad_${name}`, name, tree: undefined, noDrop: true, cooldown: 0, useTime: 0,
      tags: [...skillContextTags(cast.inst)], innateMods: instanceMods(cast.inst), leveling: undefined,
      delivery, effects: [{ type: 'damage' }] }, 1);
    inst.challengeHost = cast.state.host; inst.procChainDepth = 1;
    return inst;
  }

  toss(owner: Actor, inst: SkillInstance, aim: Vec2, d: ConstructDelivery, power: number): void {
    const cast = this.casts.get(inst); if (!cast || cast.state.retired) return;
    const length = Math.min(dist(owner.pos, aim), d.placeRange ?? 420), angle = angleTo(owner.pos, aim);
    const at = this.w.clampPos({ x: owner.pos.x + Math.cos(angle) * length, y: owner.pos.y + Math.sin(angle) * length }, 13);
    const duration = Math.max(0.15, length / 600);
    this.landings.push({ cast, from: { ...owner.pos }, at, d, remaining: duration, duration, power });
  }
  private plant(landing: Landing): void {
    const { cast, d, at, power } = landing, state = cast.state;
    if (state.retired || state.owner.dead) return;
    const call = makeSkillInstance({ ...SKILLS.goad_device_call, delivery: { type: 'nova', radius: d.range, affects: 'enemies' } }, 1);
    const body = this.w.spawnConstruct(state.owner, state.host, d, at, call, at); if (!body) return;
    const bands = skillDamageBands(state.owner, cast.inst).total, average = (bands.lo + bands.hi) / 2 * power;
    body.sheet.setSource('goad_thorns', [mod('thorns', 'flat', average * state.spec.device!.thornsRatio)]);
    const radius = d.range * state.owner.sheet.get('aoeRadius', skillContextTags(cast.inst), instanceMods(cast.inst));
    // The pulse and its aura share one resolved radius; inherited construct
    // area modifiers must not apply a second time to the taunt alone.
    call.def = { ...call.def, delivery: { type: 'nova', affects: 'enemies',
      radius: radius / Math.max(0.01, body.sheet.get('aoeRadius', skillContextTags(call), instanceMods(call))) } };
    body.construct!.range = radius; body.construct!.timer = 0;
    const effigy: Effigy = { body, cast, average, radius, center: { ...at }, trailAt: 0, strikeAt: 0 };
    if (state.spec.creeper) {
      const creeper = new Actor('Burrowing Pursuer', body.team, { ...at });
      creeper.owner = state.owner; creeper.sourceSkillId = `__goad_creeper:${body.id}`;
      creeper.tier = body.tier; creeper.radius = 8; creeper.color = '#b39364'; creeper.shape = 'circle';
      creeper.passive = true; creeper.untargetable = true; creeper.invulnerable = true; creeper.noBounty = true;
      this.w.actors.push(creeper); effigy.creeper = creeper;
    }
    this.effigies.push(effigy);
  }
  private live(e: Effigy) { return !e.body.dead && !e.cast.state.retired && !e.cast.state.owner.dead && this.w.actors.includes(e.body); }

  update(dt: number): void {
    for (const state of [...this.states.values()]) if (state.owner.dead || !this.w.actors.includes(state.owner) || !state.owner.skills.includes(state.host)
      || state.policy !== this.policy(state.host)) this.clear(state.owner, state.host);
    for (const landing of [...this.landings]) {
      landing.remaining -= dt;
      const t = Math.max(0, Math.min(1, 1 - landing.remaining / landing.duration));
      this.w.flashes.push({ pos: { x: landing.from.x + (landing.at.x - landing.from.x) * t,
        y: landing.from.y + (landing.at.y - landing.from.y) * t - Math.sin(t * Math.PI) * 45 }, radius: 5, color: '#ceb98c', life: 0.05, maxLife: 0.05 });
      if (landing.remaining <= 0) { this.landings.splice(this.landings.indexOf(landing), 1); this.plant(landing); }
    }
    for (const effigy of [...this.effigies]) {
      if (!this.live(effigy)) { this.retireEffigy(effigy); continue; }
      const s = effigy.cast.state.spec, enemies = this.w.enemiesOf(effigy.body).filter(a => dist(a.pos, effigy.body.pos) <= effigy.radius);
      if (s.bleedingField) for (const enemy of enemies) {
        let wound = enemy.statuses.find(st => st.challengeField === effigy.body.id);
        if (!wound) {
          enemy.applyStatus('bleed', effigy.average * s.bleedingField.power, 1, 'Field of Wounds',
            { casterId: effigy.cast.state.owner.id, challengeField: effigy.body.id });
          wound = enemy.statuses.find(st => st.challengeField === effigy.body.id);
        }
        // No future bleed bank exists beyond this frame of exposure.
        if (wound) { wound.remaining = dt + 0.05; wound.total = wound.remaining; }
      }
      for (const actor of this.w.actors) actor.statuses = actor.statuses.filter(st => st.challengeField !== effigy.body.id || enemies.includes(actor));
      if (s.creeper && effigy.creeper) this.moveCreeper(effigy, enemies, dt);
    }
    for (const shock of [...this.shocks]) if (shock.due <= this.w.time) {
      this.shocks.splice(this.shocks.indexOf(shock), 1);
      const e = shock.effigy; if (!this.live(e)) continue;
      const s = e.cast.state.spec, row = shock.greater ? s.greaterShock! : s.aftershock!;
      const payload = this.payload(e.cast, { type: 'ground', radius: row.radius, delay: 0, castRange: 9999 }, 'Aftershock');
      this.w.executeSkill(e.cast.state.owner, payload, shock.at, { noRepeat: true, noCooldown: true, dmgMult: row.power });
      if (shock.greater && shock.echoes) for (let k = 0; k < s.greaterShock!.echoes; k++) {
        this.shocks.push({ effigy: e, at: { ...shock.at }, due: this.w.time + (k + 1) * 0.25, greater: false, echoes: false });
      }
    }
  }

  private moveCreeper(e: Effigy, enemies: Actor[], dt: number): void {
    const c = e.creeper!, s = e.cast.state.spec.creeper!;
    const target = enemies.sort((a, b) => dist(a.pos, c.pos) - dist(b.pos, c.pos))[0];
    const toward = target?.pos ?? e.body.pos, distance = dist(e.center, toward), step = Math.min(1, s.speed * dt / Math.max(1, distance));
    e.center.x += (toward.x - e.center.x) * step; e.center.y += (toward.y - e.center.y) * step;
    const phase = this.w.time * 3 + e.body.id, radius = target ? 34 : Math.min(65, e.radius * 0.4);
    let at = { x: e.center.x + Math.sin(phase) * radius, y: e.center.y + Math.sin(phase * 2) * radius * 0.5 };
    const reach = dist(at, e.body.pos); if (reach > e.radius) at = { x: e.body.pos.x + (at.x - e.body.pos.x) * e.radius / reach, y: e.body.pos.y + (at.y - e.body.pos.y) * e.radius / reach };
    c.pos = this.w.clampPos(at, c.radius);
    if (this.w.time >= e.trailAt) {
      e.trailAt = this.w.time + 0.2;
      const trail = this.payload(e.cast, { type: 'ground', radius: s.trailRadius, delay: 0, castRange: 9999, lingerDuration: s.trailDuration, tickInterval: 0.3 }, 'Burrow Wake');
      this.w.executeSkill(e.cast.state.owner, trail, c.pos, { noRepeat: true, noCooldown: true, dmgMult: s.trailPower });
    }
    if (target && dist(c.pos, target.pos) <= 75 && this.w.time >= e.strikeAt) {
      e.strikeAt = this.w.time + s.strikeInterval;
      const strike = this.payload(e.cast, { type: 'target' }, 'Burrow Stone');
      this.w.challengeHit(e.cast.state.owner, strike, target, s.strikePower);
      this.w.flashes.push({ pos: { ...target.pos }, radius: 12, color: '#c5a66d', life: 0.15, maxLife: 0.15 });
    }
  }
  private retireEffigy(e: Effigy): void {
    if (e.creeper) e.creeper.dead = true;
    this.shocks = this.shocks.filter(s => s.effigy !== e);
    for (const actor of this.w.actors) actor.statuses = actor.statuses.filter(st => st.challengeField !== e.body.id);
    this.effigies.splice(this.effigies.indexOf(e), 1);
  }
  clear(owner: Actor, host: SkillInstance): void {
    const state = this.states.get(this.key(owner, host)); if (!state || state.host !== host) return;
    state.retired = true; owner.removeBuff(this.readyId(state)); this.states.delete(this.key(owner, host));
    this.landings = this.landings.filter(l => l.cast.state !== state);
    for (const effigy of [...this.effigies]) if (effigy.cast.state === state) {
      effigy.body.dead = true; this.retireEffigy(effigy);
    }
    const owned = (inst: SkillInstance) => inst.challengeHost === host;
    this.w.projectiles = this.w.projectiles.filter(p => p.caster !== owner || !owned(p.inst));
    this.w.pendingRepeats = this.w.pendingRepeats.filter(p => p.caster !== owner || !owned(p.inst));
    this.w.pendingFuses = this.w.pendingFuses.filter(p => p.caster !== owner || !owned(p.inst));
    for (const zone of [...this.w.zones]) if (zone.caster === owner && owned(zone.inst)) this.w.retireOwnedZone(zone);
  }
  clearAll(): void {
    for (const state of [...this.states.values()]) this.clear(state.owner, state.host);
  }
}
