import type { Actor } from './actor';
import type { World } from './world';
import { angleDiff, angleTo, dist } from '../core/math';
import { mod, type DamageType, type SkillTag } from './stats';
import { guardBashSpec, grantedTags, instanceMods, skillContextTags, type SkillDef, type SkillInstance } from './skills';
import { guardArtsOf, guardCapacity, guardArtAbsorb, GUARD_ARTS_LIMITS, type GuardArtsSpec } from './guardArtsSpec';
import { spendAbsorbLayers } from './absorb';
import { SATELLITES } from './satelliteSpec';

interface Outcome { expires: number; power: number }
export interface GuardArtVisual {
  owner: number; x: number; y: number; tier: number; radius: number; progress: number; color: string;
  plates?: number; slots?: number; facing?: number; arc?: number;
}
interface GuardArtState {
  owner: Actor; host: SkillInstance; spec: GuardArtsSpec; policy: string; key: string;
  plates: number; plateClock: number; lastCast: number;
  contacts: Map<number, { next: number; seen: number }>;
  intact: Outcome[]; broken: Outcome[];
  blasts: { remaining: number; duration: number; power: number; radius: number }[];
}

/** Actor/skill-owned clocks. Damage, healing, buffs, projectiles, satellites and
 * lethal-wound interception remain the ordinary shared engine mechanisms. */
export class GuardArts {
  visuals: GuardArtVisual[] = [];
  private states = new Map<Actor, Map<SkillInstance, GuardArtState>>();
  private nextSource = 1;
  constructor(private w: World) {}
  private policy(inst: SkillInstance): string {
    return JSON.stringify([inst.treeNodes, inst.level, inst.bonusLevels, inst.sockets.map(s => s && [s.def.id, s.level]), guardArtsOf(inst)]);
  }
  private live(s: GuardArtState): boolean {
    return !s.owner.dead && !s.owner.downed && this.w.actors.includes(s.owner)
      && s.owner.skills.includes(s.host) && s.policy === this.policy(s.host);
  }
  private ensure(a: Actor, inst: SkillInstance): GuardArtState | undefined {
    const spec = guardArtsOf(inst);
    if (!spec) return undefined;
    let family = this.states.get(a);
    if (!family) this.states.set(a, family = new Map());
    let state = family.get(inst);
    const policy = this.policy(inst);
    if (state && state.policy !== policy) { this.clear(a, inst); state = undefined; }
    if (!state) {
      state = { owner: a, host: inst, spec, policy, key: `guardArts:${inst.def.id}:${this.nextSource++}`,
        plates: 0, plateClock: 0, lastCast: -Infinity, contacts: new Map(), intact: [], broken: [], blasts: [] };
      family.set(inst, state);
    }
    return state;
  }
  sync(a: Actor): void {
    if (this.w.clientActionHook) return;
    for (const [inst, s] of this.states.get(a) ?? []) if (!this.live(s)) this.clear(a, inst);
    if (a.dead || a.downed) return;
    for (const inst of a.skills) {
      if (!inst || !guardArtsOf(inst)) continue;
      const s = this.ensure(a, inst)!;
      if (s.spec.intervention && s.spec.absorb) (a.lifeDamageInterceptors ??= new Map()).set(s.key, (amount: number) => {
        if (amount < a.life || a.life <= 0 || !this.live(s) || (a.guardIntervention[inst.def.id] ?? 0) > 0
          || a.invulnerable) return amount;
        // Stamp first: the resulting break burst may itself resolve retaliation.
        a.guardIntervention[inst.def.id] = s.spec.intervention!.cooldown;
        a.addBuff({ type: 'buff', id: `guardIntervention:${inst.def.id}`, label: s.spec.intervention!.label,
          duration: s.spec.intervention!.cooldown, mods: [] });
        this.cast(a, inst);
        this.w.guardArtCooldown(a, inst);
        return spendAbsorbLayers(a, amount);
      });
    }
  }
  clear(a: Actor, inst?: SkillInstance): void {
    const family = this.states.get(a); if (!family) return;
    for (const [host, s] of [...family]) {
      if (inst && inst !== host) continue;
      a.absorbLayers.delete(s.key);
      a.lifeDamageInterceptors?.delete(s.key);
      a.removeBuff(`${s.key}:plates`);
      a.sheet.removeSource(`${s.key}:satellites`);
      s.blasts = []; s.intact = []; s.broken = [];
      family.delete(host);
      this.visuals = this.visuals.filter(v => v.owner !== a.id);
      this.w.projectiles = this.w.projectiles.filter(p => p.caster !== a || p.inst.guardArtsHost !== host);
    }
  }
  clearAll(): void { for (const a of this.states.keys()) this.clear(a); this.states.clear(); this.visuals = []; }
  /** THE HAND-OFF (shard M1, engine/shardUnits.ts): one body's layers cleared now,
   *  in the World it leaves. Its sheet keys come from this World's own counter, so a
   *  late clear here could strip the destination's live layer under the same key. */
  clearOwner(a: Actor): void { this.clear(a); this.states.delete(a); }

  /** Rebind surviving bodies at zone boundaries before the next AI/input phase. */
  rebind(): void { for (const a of this.w.actors) this.sync(a); }

  raised(a: Actor, inst: SkillInstance): void {
    const s = this.ensure(a, inst); if (!s) return;
    s.plates = 0; s.plateClock = 0; this.plateBuff(s);
    const bash = guardBashSpec(inst);
    if (bash && s.spec.raiseBash) this.w.guardBash(a, inst, bash, guardCapacity(a, inst) * s.spec.raiseBash);
  }
  private plateBuff(s: GuardArtState): void {
    const id = `${s.key}:plates`, p = s.spec.plates;
    s.owner.removeBuff(id);
    if (p && s.plates > 0) s.owner.addBuff({ type: 'buff', id, label: `${p.label} (${s.plates})`, duration: 999999,
      mods: [mod('damageTaken', 'more', -Math.min(GUARD_ARTS_LIMITS.maximumReduction, p.reduction * s.plates))] });
  }
  /** Called only for a damaging guard interception, after the parry gate. */
  guardHit(a: Actor, inst: SkillInstance, amount: number): { damage: number; restore: number } {
    const s = this.ensure(a, inst);
    if (!s || amount <= 0) return { damage: amount, restore: 0 };
    const spec = s.spec;
    if (spec.passiveBlockReduction && Math.random() < a.sheet.get('blockChance', skillContextTags(inst), instanceMods(inst))) {
      amount *= 1 - spec.passiveBlockReduction;
    }
    let restore = 0;
    if (spec.plates && s.plates > 0) {
      amount *= 1 - Math.min(GUARD_ARTS_LIMITS.maximumReduction, spec.plates.reduction * s.plates);
      s.plates--; restore = spec.plateRestore ?? 0; this.plateBuff(s);
    }
    return { damage: amount, restore };
  }
  lower(a: Actor, inst: SkillInstance): void {
    const s = this.states.get(a)?.get(inst); if (!s) return;
    s.plates = 0; s.plateClock = 0; this.plateBuff(s);
    // Contact cooldowns intentionally survive quick re-raises.
  }

  /** Normal execution and emergency intervention share this exact payload. */
  cast(a: Actor, inst: SkillInstance): boolean {
    const s = this.ensure(a, inst), absorb = s?.spec.absorb;
    if (!s || !absorb) return false;
    const patience = s.spec.patience;
    const power = patience && this.w.time - s.lastCast + 1e-9 >= patience.seconds ? patience.multiplier : 1;
    s.lastCast = this.w.time;
    const { duration, amount } = guardArtAbsorb(a, inst, power)!;
    if (amount > 0 && duration > 0) a.absorbLayers.set(s.key, { amount, remaining: duration, source: inst,
      ended: reason => {
        if (!this.live(s)) return;
        const rule = reason === 'broken' ? s.spec.brokenSatellite : s.spec.intactSatellite;
        if (rule) {
          const bank = reason === 'broken' ? s.broken : s.intact;
          bank.push({ expires: this.w.time + rule.duration, power });
          while (bank.length > rule.max) bank.shift();
          this.satelliteGrants(s);
        }
        if (reason === 'broken' && s.spec.breakBurst) this.burst(s, s.spec.breakBurst.radius, s.spec.breakBurst.power * power);
      } });
    if (s.spec.detonation) {
      const d = s.spec.detonation;
      // Casts are bounded even with extreme cooldown investment.
      if (s.blasts.length < GUARD_ARTS_LIMITS.pendingBlasts) s.blasts.push({ remaining: d.delay, duration: d.delay, power: d.power * power, radius: d.radius });
    }
    this.w.flashes.push({ pos: { ...a.pos }, radius: a.radius + 12, color: inst.def.color, life: 0.35, maxLife: 0.35 });
    return true;
  }
  private bashFlat(a: Actor, inst: SkillInstance, power: number): Partial<Record<DamageType, number>> {
    const bash = guardBashSpec(inst);
    const tags = skillContextTags(inst, grantedTags(inst));
    const element = (['fire', 'cold', 'lightning', 'chaos'] as const).find(t => tags.has(t)) ?? 'physical';
    return { [element]: guardCapacity(a, inst) * (bash?.mult ?? 0) * power * a.sheet.get('bashPower', tags, instanceMods(inst)) };
  }
  private payload(inst: SkillInstance, delivery: SkillDef['delivery'], flat?: Partial<Record<DamageType, number>>): SkillInstance {
    return { ...inst, guardArtsHost: inst, guardArtsPayload: true, procChainDepth: Math.max(1, inst.procChainDepth ?? 0),
      def: { ...inst.def, guard: undefined, guardArts: undefined, castMode: 'cast', delivery,
        tags: [...new Set<SkillTag>([...skillContextTags(inst), ...(delivery.type === 'projectile' ? ['projectile', 'aoe'] as SkillTag[] : ['aoe'] as SkillTag[])])],
        baseDamage: flat ? Object.fromEntries(Object.entries(flat).map(([t, v]) => [t, [v, v]])) : undefined,
        effects: [{ type: 'damage' }] } };
  }
  private burst(s: GuardArtState, radius: number, power: number): void {
    if (!this.live(s)) return;
    const a = s.owner, inst = s.host;
    radius *= a.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst));
    const payload = this.payload(inst, { type: 'ground', radius, castRange: 0, delay: 0 });
    for (const e of this.w.enemiesOf(a)) {
      if (a.dead) break;
      if (e.tier === a.tier && dist(a.pos, e.pos) <= radius + e.radius
        && this.w.lineOfSight(a.pos, e.pos, a.tier, e.tier)) this.w.guardArtHit(a, payload, e, this.bashFlat(a, inst, power));
    }
    this.w.flashes.push({ pos: { ...a.pos }, radius, color: inst.def.color, life: 0.3, maxLife: 0.3 });
  }
  bashWave(a: Actor, inst: SkillInstance, flat: Partial<Record<DamageType, number>>): void {
    const wave = guardArtsOf(inst)?.bashWave; if (!wave || a.dead) return;
    const scaled = Object.fromEntries(Object.entries(flat).map(([t, v]) => [t, v! * wave.power]));
    const payload = this.payload(inst, wave.delivery, scaled);
    this.w.executeSkill(a, payload, { x: a.pos.x + Math.cos(a.facing) * wave.delivery.range,
      y: a.pos.y + Math.sin(a.facing) * wave.delivery.range },
      { keepFacing: true, noCooldown: true, noRepeat: true, componentUse: true });
  }
  /** Volitional movement only. Physics pushes never enter this seam. */
  ram(a: Actor, dx: number, dy: number): void {
    if (this.w.clientActionHook) return;
    const cs = a.casting;
    if (cs?.mode !== 'guard' || !cs.held || a.dead || a.downed || Math.hypot(dx, dy) < 0.001) return;
    const s = this.ensure(a, cs.inst), r = s?.spec.ram; if (!s || !r) return;
    const heading = Math.atan2(dy, dx), now = this.w.time;
    if (this.w.lite.liveCount) this.w.litePromoteNearest(a.pos, {
      within: a.radius + r.reach, max: GUARD_ARTS_LIMITS.promotePerFrame, opposing: a.team, story: a.tier,
    });
    for (const e of this.w.enemiesOf(a)) {
      if (a.dead || a.casting !== cs) break;
      const bearing = angleTo(a.pos, e.pos);
      if (e.tier !== a.tier || dist(a.pos, e.pos) > a.radius + e.radius + r.reach
        || Math.abs(angleDiff(a.facing, bearing)) > r.arc * Math.PI / 360
        || Math.abs(angleDiff(heading, bearing)) > Math.PI / 3
        || !this.w.lineOfSight(a.pos, e.pos, a.tier, e.tier)) continue;
      const old = s.contacts.get(e.id), opening = !old || now - old.seen >= r.reset;
      if (old) old.seen = now;
      if (old && now + 1e-9 < old.next) continue;
      s.contacts.set(e.id, { next: now + r.interval, seen: now });
      const base = r.base + a.sheet.get('thorns', skillContextTags(cs.inst), instanceMods(cs.inst)) * r.thorns + a.effectiveWeight() * r.weight;
      const payload = this.payload(cs.inst, { type: 'self' });
      this.w.guardArtHit(a, payload, e, { physical: base * (opening ? 1 : r.repeat) }, r.push);
      this.w.flashes.push({ pos: { ...e.pos }, radius: e.radius + 3, color: cs.inst.def.color, life: 0.12, maxLife: 0.12 });
    }
    for (const [id, hit] of s.contacts) if (now - hit.seen > r.reset + r.interval) s.contacts.delete(id);
  }
  private satelliteGrants(s: GuardArtState): void {
    const mods = [];
    for (const [bank, rule] of [[s.intact, s.spec.intactSatellite], [s.broken, s.spec.brokenSatellite]] as const) {
      if (rule && bank.length) mods.push(mod(`satelliteCount_${rule.family}`, 'flat', bank.length));
    }
    if (mods.length) s.owner.sheet.setSource(`${s.key}:satellites`, mods);
    else s.owner.sheet.removeSource(`${s.key}:satellites`);
  }
  /** The existing satellite conductor receives its source skill and bash scale. */
  satellitePayload(a: Actor, skill: string, slot = 0): SkillInstance | undefined {
    const sources: { s: GuardArtState; power: number }[] = [];
    for (const s of this.states.get(a)?.values() ?? []) {
      const rule = s.spec.brokenSatellite;
      if (rule && skill === SATELLITES[rule.family]?.skill && s.broken.length && this.live(s)) {
        for (const outcome of s.broken) sources.push({ s, power: outcome.power * rule.power });
      }
    }
    if (!sources.length) return undefined;
    const { s, power } = sources[slot % sources.length];
    const def = SATELLITES[s.spec.brokenSatellite!.family];
    const payload = this.payload(s.host, { type: 'ground', radius: def.radius, castRange: 0, delay: 0 }, this.bashFlat(a, s.host, power));
    payload.def = { ...payload.def, tags: [...payload.def.tags, 'satellite', `satellite:${s.spec.brokenSatellite!.family}`] };
    return payload;
  }
  update(dt: number): void {
    for (const a of this.states.keys()) if (!this.w.actors.includes(a)) { this.clear(a); this.states.delete(a); }
    for (const a of this.w.actors) this.sync(a);
    for (const family of this.states.values()) for (const s of family.values()) {
      if (!this.live(s)) continue;
      const a = s.owner, held = a.casting?.inst === s.host && a.casting.mode === 'guard' && a.casting.held;
      const elapsed = Math.max(0, dt * this.w.timeflow.actorScale(a));
      if (held && s.spec.plates) {
        const p = s.spec.plates;
        s.plateClock += elapsed;
        if (s.plateClock + 1e-9 >= p.interval) {
          s.plateClock = Math.max(0, s.plateClock - p.interval) % p.interval;
          s.plates = Math.min(p.max, s.plates + 1); this.plateBuff(s);
          const heal = s.spec.plateHeal;
          if (heal) {
            const radius = heal.radius * a.sheet.get('aoeRadius', skillContextTags(s.host), instanceMods(s.host));
            for (const ally of this.w.actors) if (!ally.dead && !ally.downed && !ally.construct && ally.team === a.team && ally.tier === a.tier
              && dist(a.pos, ally.pos) <= radius + ally.radius && this.w.lineOfSight(a.pos, ally.pos, a.tier, ally.tier)) {
              ally.healBy(ally.maxLife() * heal.lifeFraction);
            }
            this.w.flashes.push({ pos: { ...a.pos }, radius, color: '#a8d7b3', life: 0.3, maxLife: 0.3 });
          }
        }
      } else if (s.plates || s.plateClock) this.lower(a, s.host);
      for (const blast of [...s.blasts]) {
        blast.remaining -= elapsed;
        if (blast.remaining <= 1e-9) { s.blasts.splice(s.blasts.indexOf(blast), 1); this.burst(s, blast.radius, blast.power); }
      }
      const count = s.intact.length + s.broken.length;
      s.intact = s.intact.filter(o => o.expires > this.w.time);
      s.broken = s.broken.filter(o => o.expires > this.w.time);
      if (s.intact.length + s.broken.length !== count) this.satelliteGrants(s);
    }
    this.refreshVisuals();
  }
  refreshVisuals(): void {
    this.visuals = this.warnings().map(v => ({ owner: v.owner.id, x: v.owner.pos.x, y: v.owner.pos.y,
      tier: v.owner.tier, radius: v.radius, progress: v.progress, color: v.color }));
    for (const family of this.states.values()) for (const s of family.values()) {
      if (!this.live(s) || !s.plates || s.owner.casting?.inst !== s.host) continue;
      const a = s.owner;
      this.visuals.push({ owner: a.id, x: a.pos.x, y: a.pos.y, tier: a.tier, radius: a.radius + 16,
        progress: s.plates / s.spec.plates!.max, color: s.host.def.color, plates: s.plates, slots: s.spec.plates!.max,
        facing: a.facing, arc: (s.host.def.guard?.arcDeg ?? 120) * Math.PI / 180
          * Math.sqrt(a.sheet.get('aoeRadius', skillContextTags(s.host), instanceMods(s.host))) });
    }
  }
  /** Visible charge geometry follows the caster and uses the actual blast reach. */
  warnings(): { owner: Actor; radius: number; progress: number; color: string }[] {
    return [...this.states.values()].flatMap(f => [...f.values()].filter(s => this.live(s)).flatMap(s => s.blasts.map(b => ({
      owner: s.owner, radius: b.radius * s.owner.sheet.get('aoeRadius', skillContextTags(s.host), instanceMods(s.host)),
      progress: 1 - b.remaining / b.duration, color: s.host.def.color,
    }))));
  }
}
