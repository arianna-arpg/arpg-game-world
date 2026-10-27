import type { Actor } from './actor';
import type { World } from './world';
import type { Vec2 } from '../core/math';
import { dist } from '../core/math';
import { mod } from './stats';
import { instanceDelivery, instanceEffects, instanceTargeting, instanceMods, makeSkillInstance, skillContextTags,
  summonSchoolSkill, type SkillInstance, type SummonDelivery, type SummonCrew } from './skills';
import { empoweredSkill } from './castSequence';
import { summonArtIds, type SummonArtsSpec, type SummonArtContract, type SummonArtCast, type SummonArtView } from './summonArtsSpec';
import { SKILLS } from '../data/skills';

export function summonArtsOf(inst?: SkillInstance): SummonArtsSpec | undefined {
  if (!inst || inst.def.delivery.type !== 'summon') return;
  const d = instanceDelivery(inst);
  return d.type === 'summon' ? d.arts : undefined;
}
export function echoableSpell(inst: SkillInstance, spec: NonNullable<SummonArtsSpec['echo']>): boolean {
  const tags = skillContextTags(inst), delivery = instanceDelivery(inst), target = instanceTargeting(inst);
  return spec.requireTags.every(t => tags.has(t)) && !spec.excludeTags.some(t => tags.has(t))
    && spec.deliveries.includes(delivery.type) && (!target || spec.targets.includes(target.target))
    && instanceEffects(inst).some(f => f.type === 'damage') && !inst.summonArtCast;
}

/** Actors own durable state, so reconstruction, relays and cooldowns survive native checkpoints. */
export class SummonArts {
  constructor(private world: World,
    private spawn: (owner: Actor, host: SkillInstance, pos: Vec2) => Actor | null,
    private forward: (host: SkillInstance, skills: SkillInstance[]) => void,
    private activate: (body: Actor, inst: SkillInstance) => void,
    private retire: (body: Actor, inst: SkillInstance) => void) {}

  private members(owner: Actor, host: SkillInstance): Actor[] {
    return this.world.actors.filter(a => !a.dead && a.owner === owner && a.summonInst === host);
  }
  private body(owner: Actor, host: SkillInstance): Actor | undefined {
    return this.members(owner, host).find(a => !a.summonArtAnchor);
  }
  private contract(owner: Actor, host: SkillInstance): SummonArtContract {
    let c = owner.summonArtContracts.get(host);
    if (!c) { c = { recovery: 0, souls: [] }; owner.summonArtContracts.set(host, c); }
    return c;
  }
  canSpawn(owner: Actor, host: SkillInstance, d: SummonDelivery): boolean {
    return !d.arts?.single || !(owner.remoteSummonArts?.[host.def.id]?.held || this.members(owner, host).length);
  }
  choose(owner: Actor, host: SkillInstance, d: SummonDelivery): string | undefined {
    if (!d.arts?.balanceSchools || !d.pool?.length) return;
    const bodies = this.members(owner, host);
    const contract = this.contract(owner, host), pool = [...d.pool].sort((a,b) => a.id.localeCompare(b.id));
    const last = pool.findIndex(row => row.id === contract.lastSchool);
    let selected = pool[0], least = Infinity;
    for (let offset = 1; offset <= pool.length; offset++) {
      const row = pool[(last + offset) % pool.length], count = bodies.filter(m => m.defId === row.id).length;
      if (count < least) { selected = row; least = count; }
    }
    contract.lastSchool = selected.id;
    return selected.id;
  }
  init(body: Actor, host: SkillInstance): void {
    const a = summonArtsOf(host);
    if (!a || !body.owner) return;
    this.contract(body.owner, host);
    const kit = summonArtIds(instanceDelivery(host) as SummonDelivery, body.defId)
      .filter(id => !body.skills.some(s => s?.def.id === id))
      .flatMap(id => SKILLS[id] ? [makeSkillInstance(summonSchoolSkill(instanceDelivery(host) as SummonDelivery, body.defId!, SKILLS[id]), host.level + (host.bonusLevels ?? 0))] : []);
    this.forward(host, kit);
    body.summonArtState = { kit, relayReady: 0, echoReady: 0, flareReady: 0,
      siphonCredit: (a.siphon?.perSecond ?? 0) * body.maxLife() };
    const rite = body.skills.find(s => s?.def.id === a.rite);
    if (rite && a.riteRecovery) rite.extraMods = [...(rite.extraMods ?? []), mod('cooldownRecovery', 'increased', a.riteRecovery)];
    if (a.capacityPower) {
      const d = instanceDelivery(host) as SummonDelivery, p = a.capacityPower;
      const slots = body.owner.sheet.get('minionMaxCount', skillContextTags(host), instanceMods(host), d.maxActive);
      const power = Math.min(p.maximum, Math.max(0, slots - p.base) * p.perSlot);
      body.sheet.setSource('summonArts:capacity', [mod('damage', 'more', power)]);
    }
  }
  resync(host: SkillInstance): void {
    for (const b of this.world.actors) if (!b.dead && b.summonInst === host && b.summonArtState) {
      for (const s of b.summonArtState.kit) s.sockets = s.sockets.filter(x => !x?.forwarded);
      this.forward(host, b.summonArtState.kit);
    }
  }
  crew(host: SkillInstance, crew: SummonCrew): SummonCrew {
    const echo = summonArtsOf(host)?.echo;
    if (!echo || crew === 'unknowable') return crew;
    const owner = this.world.actors.find(a => a.skills.includes(host));
    const echoes = owner?.skills.filter((s): s is SkillInstance => !!s && echoableSpell(s, echo)).map(s => ({
      ...s.def, tags: [...skillContextTags(s)], delivery: instanceDelivery(s), effects: instanceEffects(s), targeting: instanceTargeting(s),
    })) ?? [];
    return [...(crew ?? []), ...echoes];
  }
  presentation(owner: Actor): Record<string, SummonArtView> | undefined {
    if (!owner.summonArtContracts.size) return;
    const rows: Record<string, SummonArtView> = {};
    for (const [host, contract] of owner.summonArtContracts) {
      const a = summonArtsOf(host); if (!a?.command) continue;
      const body = this.body(owner, host), held = !!body || (!!contract.anchor && !contract.anchor.dead);
      if (held) rows[host.def.id] = { command: body ? a.command : undefined, ready: !!body && this.commandReady(owner, host), held };
    }
    return Object.keys(rows).length ? rows : undefined;
  }
  commandView(owner: Actor, host: SkillInstance): SkillInstance | undefined {
    const a = summonArtsOf(host);
    if (!a?.command || (!this.body(owner, host) && owner.remoteSummonArts?.[host.def.id]?.command !== a.command) || !SKILLS[a.command]) return;
    const command = makeSkillInstance(SKILLS[a.command], host.level + (host.bonusLevels ?? 0));
    command.summonCommandHost = host;
    command.hostSkillId = host.def.id;
    return command;
  }
  commandReady(owner: Actor, host: SkillInstance): boolean {
    const remote = owner.remoteSummonArts?.[host.def.id];
    if (remote) return remote.ready;
    const body = this.body(owner, host), a = summonArtsOf(host);
    const rite = body?.skills.find(s => s?.def.id === a?.rite);
    return !!body && !!a?.rite && !!rite && !body.isStunned() && !body.downed
      && !body.tagsForbidden(rite)
      && (body.cooldowns.get(a.rite) ?? 0) <= 0
      && body.casting?.inst.def.id !== a.rite;
  }
  private skill(body: Actor, id: string): SkillInstance | undefined {
    return body.skills.find(s => s?.def.id === id) ?? body.summonArtState?.kit.find(s => s.def.id === id);
  }
  private payload(body: Actor, id: string, at: Vec2, role: SummonArtCast['role'], power = 1, delay = 0): SkillInstance | undefined {
    const base = this.skill(body, id);
    if (!base) return;
    let inst = empoweredSkill(base, power, 1);
    const d = instanceDelivery(inst);
    if (delay && d.type === 'ground') inst = { ...inst, def: { ...inst.def, delivery: { ...d, delay } } };
    inst.summonArtCast = { role };
    this.world.executeSkill(body, inst, at, { noRepeat: true, componentUse: true, noCooldown: true, noFollowUp: true });
    return inst;
  }
  prepare(body: Actor, inst: SkillInstance, real: boolean): SkillInstance {
    if (!real || !body.summonArtState || (inst.summonArtCast && inst.summonArtCast.role !== 'native')) return inst;
    const a = summonArtsOf(body.summonInst);
    let power = 1;
    if (a?.rite === inst.def.id && inst.summonArtCast?.commanded && body.owner && body.summonInst) {
      const c = this.contract(body.owner, body.summonInst);
      power += c.souls.length * (a.reconstruction?.soulPower ?? 0);
      c.souls = [];
    }
    const captured = power === 1 ? { ...inst } : empoweredSkill(inst, power, 1);
    captured.summonArtCast = { role: 'native', origin: inst.def.id, power };
    return captured;
  }
  completed(caster: Actor, inst: SkillInstance, aim: Vec2): void {
    const commandHost = inst.summonCommandHost;
    if (commandHost) {
      const b = this.body(caster, commandHost), a = summonArtsOf(commandHost);
      if (b && a?.rite && this.commandReady(caster, commandHost)) {
        const rite = this.skill(b, a.rite);
        if (rite) {
          b.casting = null; b.useLock = 0;
          this.world.useSkill(b, { ...rite, summonArtCast: { role: 'native', commanded: true } }, aim);
        }
      }
      return;
    }
    const host = caster.summonInst, a = summonArtsOf(host), state = caster.summonArtState;
    if (a?.rite === inst.def.id && state && inst.summonArtCast?.role === 'native') {
      if (a.detonation && state.ritual) this.payload(caster, a.detonation, state.ritual.pos, 'rupture');
      this.clearFields(caster, 'ritual');
      const zone = this.world.zones.find(z => z.caster === caster && z.inst === inst);
      if (!zone) return;
      const at = zone.pos, d = instanceDelivery(inst);
      const delay = d.type === 'ground' ? d.delay ?? 0 : 0;
      const power = inst.summonArtCast.power ?? 1;
      let duration = 0, radius = zone.radius;
      for (const id of [a.field, a.frost, a.blizzard]) {
        if (!id) continue;
        const payload = this.payload(caster, id, at, 'field', power, delay);
        if (!payload) continue;
        payload.summonArtCast!.field = 'ritual';
        for (const z of this.world.zones) if (z.inst === payload) {
          duration = Math.max(duration, z.linger + z.delay); radius = Math.max(radius, z.radius);
        }
      }
      state.ritual = duration > 0 ? { pos: { ...at }, radius, remaining: duration, readyAt: this.world.time + delay, power } : undefined;
      this.syncCommand(caster);
    }
    if (inst.summonArtCast || caster.owner || !caster.summonArtContracts.size) return;
    for (const lich of this.world.actors) {
      const art = summonArtsOf(lich.summonInst), s = lich.summonArtState;
      if (lich.dead || lich.owner !== caster || !art?.echo || !s || s.echoReady > 0
        || lich.isStunned() || lich.tagsForbidden(inst) || !echoableSpell(inst, art.echo)) continue;
      const copy: SkillInstance = { ...inst, state: undefined, sockets: [...inst.sockets], grafts: inst.grafts ? [...inst.grafts] : undefined,
        summonArtCast: { role: 'echo' }, summonCommandHost: undefined,
        projectileHost: undefined, projectileRole: undefined, projectileSpec: undefined, projectileCast: undefined, projectileContact: undefined,
        sequenceHost: undefined, sequenceRole: undefined, challengeHost: undefined, followUpHost: undefined, invocationHost: undefined, guardArtsHost: undefined };
      this.forward(lich.summonInst!, [copy]);
      // A copied ability belongs to this Lich across uses; casts still capture their own state.
      const source = inst.projectileHost ?? inst.sequenceHost ?? inst.challengeHost ?? inst.followUpHost ?? inst.invocationHost ?? inst.guardArtsHost
        ?? caster.skills.find(skill => skill?.def.id === inst.def.id) ?? inst;
      const copies = s.echoes ??= new Map<SkillInstance, SkillInstance>();
      let echo = copies.get(source);
      const powered = empoweredSkill(copy, art.echo.power, 1);
      if (!echo) { echo = powered; copies.set(source, echo); }
      else { const runtime = echo.state; Object.assign(echo, powered); echo.state = runtime; }
      const targetInfo = instanceTargeting(echo) ? this.world.resolveTargeting(lich, echo, aim) : undefined;
      if (targetInfo === null) continue;
      s.echoReady = art.echo.cooldown;
      this.world.executeSkill(lich, echo, aim,
        { targetInfo, noRepeat: true, componentUse: true, noCooldown: true, noFollowUp: true });
    }
  }
  private syncCommand(body: Actor): void {
    const a = summonArtsOf(body.summonInst), owner = body.owner;
    if (!owner || !a?.command || !a.rite) return;
    const left = body.cooldowns.get(a.rite) ?? 0;
    if (left > 0) {
      owner.cooldowns.set(a.command, left);
      owner.cooldownTotals.set(a.command, body.cooldownTotals.get(a.rite) ?? left);
    } else owner.cooldowns.delete(a.command);
  }
  signature(body: Actor, skillId: string): boolean {
    const a = summonArtsOf(body.summonInst);
    return !!a?.lessons && !!body.summonArtState && a.schools?.find(s => s.monster === body.defId)?.signature === skillId;
  }
  statusSource(body: Actor, inst: SkillInstance): { skillId?: string; sourceKey?: string } {
    const origin = inst.summonArtCast?.origin;
    return inst.summonArtCast?.role === 'native' && origin && this.signature(body, origin)
      ? { skillId: origin, sourceKey: 'summonArt:' + body.id + ':' + origin } : {};
  }
  hit(body: Actor, inst: SkillInstance, target: Actor, damage: number): void {
    if (!body.summonArtState || !inst.summonArtCast) return;
    const host = body.summonInst, a = summonArtsOf(host), s = body.summonArtState, use = inst.summonArtCast;
    if (damage <= 0 || !host || !body.owner || !a || !s || !use || use.role !== 'native') return;
    const origin = use.origin ?? inst.def.id;
    if (this.signature(body, origin)) {
      this.siphon(body, damage);
      const school = a.schools?.find(x => x.monster === body.defId);
      if (a.traces && school && !use.traced) {
        use.traced = true; this.clearFields(body, 'script');
        const field = this.payload(body, school.trace, target.pos, 'field');
        if (field) field.summonArtCast!.field = 'script';
      }
    }
    if (origin !== body.skills[0]?.def.id) return;
    if (a.flare && s.ritual && s.ritual.readyAt <= this.world.time && s.flareReady <= 0
      && dist(target.pos, s.ritual.pos) <= s.ritual.radius + target.radius) {
      s.flareReady = a.flareCooldown ?? 0.5;
      this.payload(body, a.flare, target.pos, 'flare', s.ritual.power);
    }
    if (!a.relay || use.replied || target.dead || target.life <= 0) return;
    use.replied = true;
    const recipient = this.members(body.owner, host).filter(m => m !== body && !m.summonArtAnchor && m.summonArtState
      && m.summonArtState.relayReady <= 0 && !m.isStunned() && !m.downed && m.skills[0] && !m.tagsForbidden(m.skills[0])
      && dist(m.pos, body.pos) <= a.relay!.range && m.tier === body.tier)
      .sort((x, y) => dist(x.pos, body.pos) - dist(y.pos, body.pos) || x.id - y.id)[0];
    if (!recipient) return;
    recipient.summonArtState!.relayReady = a.relay.cooldown;
    this.payload(recipient, recipient.skills[0]!.def.id, target.pos, 'relay', a.relay.power);
    const from = a.schools?.find(x => x.monster === body.defId), to = a.schools?.find(x => x.monster === recipient.defId);
    if (from?.id === to?.id && a.concordance) {
      for (const m of [body, recipient]) m.absorbLayers.set('summonArts:concordance', {
        amount: m.maxLife() * a.concordance.fraction, remaining: a.concordance.duration,
        source: inst, ended: () => {},
      });
    } else if (from && to && a.discordance) {
      const base = this.skill(body, a.discordance);
      if (base) {
        const burst: SkillInstance = { ...base, def: { ...base.def,
          tags: ['spell', 'aoe', from.id, to.id], baseDamage: { [from.id]: Object.values(base.def.baseDamage ?? {})[0], [to.id]: Object.values(base.def.baseDamage ?? {})[0] } },
          sockets: [], summonArtCast: { role: 'relay' } };
        this.forward(host, [burst]);
        this.world.executeSkill(body, burst, target.pos, { noRepeat: true, componentUse: true, noCooldown: true, noFollowUp: true });
      }
    }
  }
  siphon(body: Actor, damage: number): void {
    const a = summonArtsOf(body.summonInst), s = body.summonArtState;
    if (!a?.siphon || !s || body.dead || !body.owner || !body.summonInst || damage <= 0) return;
    const ally = this.members(body.owner, body.summonInst).filter(m => m.summonArtState && !m.summonArtAnchor
      && dist(m.pos, body.pos) <= a.siphon!.range && m.tier === body.tier && m.life < m.maxLife())
      .sort((x, y) => x.life / x.maxLife() - y.life / y.maxLife() || x.id - y.id)[0];
    if (!ally) return;
    const amount = Math.min(s.siphonCredit, damage * a.siphon.ratio);
    if (amount > 0) s.siphonCredit = Math.max(0, s.siphonCredit - ally.healBy(amount));
  }
  death(body: Actor, silent: boolean, expired: boolean): void {
    if (silent || expired) return;
    const owner = body.owner;
    if (!owner || owner.dead) return;
    for (const [host, c] of owner.summonArtContracts) {
      const a = summonArtsOf(host), r = a?.reconstruction;
      if (!r || body.summonInst === host || body.summonArtAnchor || body.construct) continue;
      const center = this.body(owner, host) ?? c.anchor;
      if (center && !center.dead && dist(center.pos, body.pos) <= r.soulRange && center.tier === body.tier) {
        c.souls = [...c.souls, r.soulDuration].slice(-r.soulCap);
      }
    }
    const host = body.summonInst, a = summonArtsOf(host), r = a?.reconstruction;
    if (!host || !r || body.summonArtAnchor) return;
    const c = this.contract(owner, host);
    if (c.recovery > 0 || c.anchor || !owner.skills.includes(host)) return;
    c.recovery = r.recovery;
    c.rebuilding = Math.max(0, r.delay - c.souls.length * r.soulRecovery);
    c.souls = [];
    const anchor = this.world.createMonster(r.monster, body.level, body.team, owner);
    anchor.summonArtAnchor = true; anchor.summonInst = host; anchor.sourceSkillId = host.def.id;
    anchor.noBounty = true; anchor.pos = { ...body.pos }; anchor.tier = body.tier;
    anchor.sheet.setSource('summonArts:anchor', [mod('life', 'override', body.maxLife() * r.life)]);
    anchor.fillResources();
    anchor.skills = body.skills.filter((s): s is SkillInstance => s?.def.delivery.type === 'aura');
    this.world.actors.push(anchor);
    for (const aura of anchor.skills) if (aura) this.activate(anchor, aura);
    c.anchor = anchor;
  }
  private clearFields(body: Actor, kind: 'ritual' | 'script'): void {
    this.world.zones = this.world.zones.filter(z => !(z.caster === body && z.inst.summonArtCast?.field === kind));
  }
  update(dt: number): void {
    for (const owner of [...this.world.actors]) {
      for (const [host, c] of [...owner.summonArtContracts]) {
        if (owner.dead || owner.downed || !owner.skills.includes(host) || !summonArtsOf(host)) {
          this.clear(owner, host); continue;
        }
        c.recovery = Math.max(0, c.recovery - dt);
        c.souls = c.souls.map(t => t - dt).filter(t => t > 0);
        if (c.anchor?.dead) { c.anchor = undefined; c.rebuilding = undefined; }
        if (c.anchor && c.rebuilding !== undefined) {
          c.rebuilding -= dt;
          if (c.rebuilding <= 0) {
            const at = { ...c.anchor.pos };
            this.world.kill(c.anchor, true);
            c.anchor = undefined; c.rebuilding = undefined;
            this.spawn(owner, host, at);
          }
        }
      }
      const s = owner.summonArtState, a = summonArtsOf(owner.summonInst);
      if (!s || !a || owner.dead) continue;
      s.relayReady = Math.max(0, s.relayReady - dt);
      s.echoReady = Math.max(0, s.echoReady - dt);
      s.flareReady = Math.max(0, s.flareReady - dt);
      if (a.siphon) s.siphonCredit = Math.min(owner.maxLife() * a.siphon.perSecond,
        s.siphonCredit + dt * owner.maxLife() * a.siphon.perSecond);
      if (s.ritual && (s.ritual.remaining -= dt) <= 0) s.ritual = undefined;
      this.syncCommand(owner);
    }
  }
  /** Mobile minions keep their identity and recovery when crossing zones; sites stay behind. */
  leaveZone(): void {
    for (const actor of this.world.actors) {
      if (actor.summonArtState) actor.summonArtState.ritual = undefined;
      for (const c of actor.summonArtContracts.values()) if (c.anchor) {
        if (!c.anchor.dead) this.world.kill(c.anchor, true);
        c.anchor = undefined; c.rebuilding = undefined;
      }
    }
  }
  clear(owner?: Actor, host?: SkillInstance): void {
    if (owner && host) for (const body of this.world.actors) {
      const copies = body.owner === owner ? body.summonArtState?.echoes : undefined, echo = copies?.get(host);
      if (echo) { copies!.delete(host); this.retire(body, echo); }
    }
    for (const keeper of this.world.actors) {
      if (owner && keeper !== owner) continue;
      for (const [inst, c] of [...keeper.summonArtContracts]) {
        if (host && host !== inst) continue;
        keeper.summonArtContracts.delete(inst);
        if (c.anchor && !c.anchor.dead) this.world.kill(c.anchor, true);
        for (const m of this.members(keeper, inst)) {
          this.clearFields(m, 'ritual'); this.clearFields(m, 'script');
          m.summonArtState = undefined;
          m.absorbLayers.delete('summonArts:concordance');
          this.world.kill(m, true);
        }
        const command = summonArtsOf(inst)?.command;
        if (command) { keeper.cooldowns.delete(command); keeper.cooldownTotals.delete(command); }
      }
    }
  }
}
