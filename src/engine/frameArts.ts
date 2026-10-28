import type { Actor } from './actor';
import { inAoe, type World } from './world';
import { angleTo, dist, type Vec2 } from '../core/math';
import { applyHit, type DamagePacket, type HitResult, type LifeWoundEvent } from './damage';
import { instanceDelivery, instanceMods, skillContextTags, makeSkillInstance, skillCooldownSeconds, type SkillInstance, type SummonDelivery } from './skills';
import { frameSkillIds, type FrameSpec, type FrameBodyView } from './frameSpec';
import { mod } from './stats';
import { skillAbsorbAmount } from './absorb';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
export function frameOf(host?: SkillInstance): FrameSpec | undefined {
  if (!host)
    return;
  const d = instanceDelivery(host);
  return d.type === 'summon' && d.frame?.primary ? d.frame as FrameSpec : undefined;
}
interface Wedge {
  body: Actor;
  host: SkillInstance;
  members: Actor[];
  aim: Vec2;
  pos: Vec2;
  end: number;
  hit: Set<number>;
  wave: boolean;
}
interface Refuge {
  body: Actor;
  host: SkillInstance;
  skill: SkillInstance;
  pos: Vec2;
  tier: number;
  left: number;
  pool: number;
  radius: number;
  shape: number;
  facing: number;
}
export class FrameArts {
  private bodies = new Set<Actor>();
  private faces = new WeakMap<SkillInstance, SkillInstance>();
  private wedges: Wedge[] = [];
  private refuges: Refuge[] = [];
  private protected = new Set<Actor>();
  private warcalls = new Map<Actor, {
    body: Actor;
    host: SkillInstance;
    power: number;
    until: number;
    ready: number;
    spent: boolean;
  }>();
  constructor(private w: World, private forward: (host: SkillInstance, kit: SkillInstance[]) => void, private offspring: (body: Actor, count: number) => Actor[], private dismiss: (owner: Actor, host: SkillInstance) => void, private retireField: (body: Actor, inst: SkillInstance) => void) { }
  private members(owner: Actor, host: SkillInstance) { return [...this.bodies].filter(a => !a.dead && a.owner === owner && a.summonInst === host && !a.summonOffspring); }
  private skill(a: Actor, id: string) { return a.skills.find(s => s?.def.id === id) ?? a.frameState?.kit.find(s => s.def.id === id); }
  private radius(a: Actor, s: SkillInstance) { const d = instanceDelivery(s); return ('radius' in d ? d.radius : 0 as number) * a.sheet.get('aoeRadius', skillContextTags(s), instanceMods(s)); }
  private within(a: Actor, s: SkillInstance, t: Actor, origin = a.pos, facing = a.facing) { return t.tier === a.tier && inAoe(origin, this.radius(a, s), a.sheet.get('aoeShape', skillContextTags(s), instanceMods(s)), facing, t.pos, t.radius) && this.w.lineOfSight(origin, t.pos, a.tier, t.tier); }
  private cooldown(a: Actor, s: SkillInstance, n = s.def.cooldown) { return skillCooldownSeconds(a, s, n) / Math.max(.01, a.sheet.get('cooldownRecovery')); }
  private commandLeft(a: Actor) { return Math.max(this.w.time, ...this.members(a.owner!, a.summonInst!).map(b => b.frameState!.commandReady)); }
  private duration(a: Actor, s: SkillInstance, n: number) { return n * a.sheet.get('effectDuration', skillContextTags(s), instanceMods(s)); }
  private mass(a: Actor) { return a.sheet.get('bodyMass') * Math.pow(a.radius / (MONSTERS[a.defId ?? '']?.radius ?? a.radius), 2); }
  init(a: Actor, host: SkillInstance): void {
    const f = frameOf(host);
    if (!f || !a.owner || a.summonOffspring)
      return;
    const kit = frameSkillIds(instanceDelivery(host) as SummonDelivery).filter(id => !a.skills.some(s => s?.def.id === id)).flatMap(id => SKILLS[id] ? [makeSkillInstance(SKILLS[id], host.level + (host.bonusLevels ?? 0))] : []);
    this.forward(host, kit);
    a.frameState = { kit, uses: 0, slams: 0, last: { ...a.pos }, travel: 0, contactAt: 0, faultAt: 0, retaliateAt: 0, commandReady: 0, strain: 0, channelTotal: 0, channelRecipients: new Map(), tauntAt: 0 };
    this.bodies.add(a);
    (a.hitObservers ??= new Map()).set('frame', (source: Actor, p: DamagePacket, r: HitResult) => this.hurt(a, source, p, r));
    const command = f.charge?.command ?? f.crush?.command;
    if (command)
      a.frameState.commandReady = Math.max(this.commandLeft(a), this.w.time + (a.owner.cooldowns.get(command) ?? 0) / Math.max(.01, a.owner.sheet.get('cooldownRecovery')));
    this.refreshBody(a, f, true);
  }
  private refreshBody(a: Actor, f: FrameSpec, initial = false) {
    const s = a.frameState!;
    if (f.spines) {
      const thorns = f.spines.flat + a.owner!.sheet.get('thorns') * f.spines.inherit;
      if (s.inheritedThorns !== thorns) {
        a.sheet.setSource('frame:spines', [mod('thorns', 'flat', thorns)]);
        s.inheritedThorns = thorns;
      }
    }
    if (f.consolidation) {
      const slots = a.owner!.summonToggles.get(a.summonInst!.def.id)?.slots ?? 1;
      if (s.reservedSlots === slots)
        return;
      const old = a.maxLife(), fraction = a.life / Math.max(1, old), extra = Math.max(0, slots - 1);
      s.reservedSlots = slots;
      a.sheet.setSource('frame:consolidation', [mod('life', 'more', extra * f.consolidation.lifePerSlot), mod('damage', 'more', extra * f.consolidation.damagePerSlot)]);
      a.life = a.maxLife() * (initial ? 1 : fraction);
      if (a.shellGuard) {
        const ratio = a.maxLife() / old;
        a.shellGuard.max *= ratio;
        a.shellGuard.pool *= ratio;
        a.shellGuard.regenRate *= ratio;
      }
    }
  }
  resync(host: SkillInstance): void {
    const face = this.faces.get(host);
    if (face) {
      face.sockets = face.sockets.filter(s => !s?.forwarded);
      this.forward(host, [face]);
    }
    for (const a of this.bodies)
      if (!a.dead && a.summonInst === host && a.frameState) {
        for (const s of a.frameState.kit)
          s.sockets = s.sockets.filter(g => !g?.forwarded);
        this.forward(host, a.frameState.kit);
      }
  }
  view(owner: Actor, host: SkillInstance): SkillInstance | undefined {
    const f = frameOf(host);
    if (!f?.repair || (!owner.summonToggles.has(host.def.id) && !this.members(owner, host).length && owner.remoteFrames?.[host.def.id]?.skill !== f.repair.skill))
      return;
    let inst = this.faces.get(host);
    if (!inst) {
      inst = makeSkillInstance(SKILLS[f.repair.skill], host.level + (host.bonusLevels ?? 0));
      inst.frameHost = host;
      inst.hostSkillId = host.def.id;
      this.forward(host, [inst]);
      this.faces.set(host, inst);
    }
    return inst;
  }
  ready(owner: Actor, host: SkillInstance) { return this.members(owner, host).some(a => !a.frameState?.terminal) || !!owner.remoteFrames?.[host.def.id]?.ready; }
  presentation(owner: Actor) { const out: Record<string, {
    skill: string;
    ready: boolean;
  }> = {}; for (const host of owner.skills) {
    if (!host)
      continue;
    const view = this.view(owner, host);
    if (view)
      out[host.def.id] = { skill: view.def.id, ready: this.ready(owner, host) };
  } return Object.keys(out).length ? out : undefined; }
  /** Resolve real action state once for both local rendering and co-op snapshots. */
  bodyPresentation(a: Actor): FrameBodyView | undefined {
    if (a.dead || a.downed) return;
    if (a.remoteFrameBody) return a.remoteFrameBody;
    if (!a.frameState && !a.frameCharging) return;
    const s = a.frameState, f = frameOf(a.summonInst);
    if (s?.terminal && f?.visual) return { style: f.visual, mode: 'terminal',
      strength: Math.max(0, Math.min(1, 1 - (s.terminal.end - this.w.time) / Math.max(.01, f.reliquary?.duration ?? 1))) };
    if (a.frameCharging) {
      const wedge = this.wedges.find(w => w.members.includes(a));
      const style = frameOf(wedge?.host)?.visual;
      if (style) return { style, mode: 'charge' };
    }
    if (!s || !f?.visual) return;
    if (s.order?.strike) return { style: f.visual, mode: 'crush' };
    if (f.repair && a.owner && a.owner.casting?.inst.frameHost === a.summonInst)
      return { style: f.visual, mode: f.sanctuary ? 'transfusion' : 'repair',
        from: { ...a.owner.pos }, strength: Math.max(0, Math.min(1, s.strain * (f.sanctuary?.escalation ?? 0))) };
  }
  isActive(a: Actor) { return !!a.frameState && !a.dead; }
  private payload(a: Actor, id: string, aim: Vec2, power = 1, paid = 0, origin?: Vec2, exclude?: ReadonlySet<number>, independent = false): SkillInstance | undefined {
    const base = this.skill(a, id);
    if (!base)
      return;
    const f = frameOf(a.summonInst);
    if (f?.spines && id === f.protect?.sweep)
      paid += a.sheet.get('thorns') * f.spines.sweepThorns;
    const inst: SkillInstance = { ...base, frameExclusions: exclude ? new Set(exclude) : undefined, frameReceipts: exclude instanceof Set ? exclude : undefined, frameCast: independent ? undefined : { origin: id, auxiliary: true, paid }, extraMods: [...(base.extraMods ?? []), mod('damage', 'more', power - 1), ...(paid ? [mod('addedPhysical', 'flat', paid)] : [])] };
    const old = a.pos, facing = a.facing;
    const selfAim = dist(origin ?? a.pos, aim) < 1e-8;
    if (origin)
      a.pos = { ...origin };
    try {
      this.w.executeSkill(a, inst, aim, { noRepeat: !independent, noCooldown: true, componentUse: true, noFollowUp: true, keepFacing: selfAim });
    }
    finally {
      a.pos = old;
      a.facing = facing;
    }
    return inst;
  }
  prepare(a: Actor, inst: SkillInstance, real: boolean): SkillInstance {
    if (!real || inst.frameCast)
      return inst;
    const war = this.warcalls.get(a);
    let out = inst;
    if (war && !war.spent && war.until > this.w.time && inst.def.effects.some(e => e.type === 'damage')) {
      war.spent = true;
      out = { ...out };
      out.extraMods = [...(out.extraMods ?? []), mod('damage', 'more', war.power)];
    }
    const f = frameOf(a.summonInst), s = a.frameState;
    if (!f || !s)
      return out;
    out = { ...out, frameCast: { origin: inst.def.id } };
    if (f.spines && inst.def.id === f.protect?.sweep)
      out.extraMods = [...(out.extraMods ?? []), mod('addedPhysical', 'flat', a.sheet.get('thorns') * f.spines.sweepThorns)];
    if (f.sacrifice && skillContextTags(inst).has('attack')) {
      const paid = applyHit(a, a, { amounts: { physical: a.maxLife() * f.sacrifice.fraction }, tags: new Set(['physical']), crit: false, resourceHit: true, sourceName: inst.def.name }).total;
      out.frameCast!.paid = paid * f.sacrifice.damagePerLife;
      out.extraMods = [...(out.extraMods ?? []), mod('addedPhysical', 'flat', out.frameCast!.paid)];
    }
    return out;
  }
  completed(a: Actor, inst: SkillInstance, aim: Vec2): void {
    if (inst.frameHost) {
      this.repairPulse(a, inst);
      return;
    }
    if (inst.hostSkillId && !inst.frameCast) {
      const host = a.skills.find(s => s?.def.id === inst.hostSkillId);
      if (host && frameOf(host)) {
        this.command(a, host, inst, aim);
        return;
      }
    }
    const f = frameOf(a.summonInst), s = a.frameState, c = inst.frameCast;
    if (!f || !s || !c || c.auxiliary || c.completed)
      return;
    c.completed = true;
    if (inst.def.id === f.slam || inst.def.id === f.crush?.strike) {
      s.slams++;
      if (f.arsenal)
        this.payload(a, f.arsenal.nova, aim, 1, c.paid ?? 0);
      if (inst.def.id === f.slam && f.crush && a.owner) {
        const ready = Math.max(this.w.time, this.commandLeft(a) - f.crush.reduction);
        for (const b of this.members(a.owner, a.summonInst!))
          b.frameState!.commandReady = ready;
        this.syncCommand(a);
      }
      const normalFault = f.crush?.normalFault && inst.def.id === f.slam && this.w.time >= s.faultAt;
      if (f.crush && (inst.def.id === f.crush.strike || normalFault)) {
        if (normalFault) s.faultAt = this.w.time + this.cooldown(a, this.skill(a,f.crush.fault)!);
        const dir = angleTo(a.pos, aim);
        for (let i = 1; i <= f.crush.faultSteps; i++) {
          const p = { x: a.pos.x + Math.cos(dir) * i * f.crush.faultSpacing, y: a.pos.y + Math.sin(dir) * i * f.crush.faultSpacing };
          this.payload(a, f.crush.fault, p, 1, c.paid ?? 0);
        }
      }
    }
    if (a.life <= 0 && !a.dead)
      this.w.kill(a, false, a);
  }
  landed(a: Actor, inst: SkillInstance, target: Actor, damage: number): void {
    const f = frameOf(a.summonInst), s = a.frameState, c = inst.frameCast;
    if (!f || !s || !c || c.auxiliary || c.hit || damage <= 0)
      return;
    c.hit = true;
    if (inst.def.id === f.primary && f.arsenal && ++s.uses % f.arsenal.every === 0)
      this.payload(a, f.arsenal.barrage, target.pos, 1, c.paid ?? 0);
    if (f.commander && (inst.def.id === f.slam || inst.def.id === f.crush?.strike)) {
      const art = this.payload(a, f.commander.skill, a.pos);
      if (!art)
        return;
      for (const ally of this.w.actors)
        if (!ally.dead && ally.team === a.team && this.within(a, art, ally)) {
          if ((this.warcalls.get(ally)?.ready ?? 0) > this.w.time)
            continue;
          this.warcalls.set(ally, { body: a, host: a.summonInst!, power: f.commander.power, until: this.w.time + this.duration(a, art, f.commander.duration), ready: this.w.time + this.cooldown(a, art), spent: false });
        }
    }
  }
  hurt(a: Actor, attacker: Actor, packet: DamagePacket, result: HitResult): void {
    const f = frameOf(a.summonInst), s = a.frameState;
    if (!f || !s || a.dead || result.evaded || result.immune || !Object.values(packet.amounts).some(n => !!n) || (packet.resourceHit && !result.total))
      return;
    if (f.legion && !a.summonOffspring && (!s.shed || s.shed.dead || !this.w.actors.includes(s.shed)) && Math.random() < f.legion.chance)
      s.shed = this.offspring(a, 1)[0];
    if (f.spines && attacker !== a && !packet.resourceHit && this.w.time >= s.retaliateAt && !s.terminal) {
      s.retaliation = attacker;
      s.retaliateAt = this.w.time + this.cooldown(a, this.skill(a, f.spines.skill)!);
    }
  }
  absorbed(a: Actor, attacker: Actor, amount: number): void { this.hurt(a, attacker, { amounts: { physical: amount }, tags: new Set(), crit: false, sourceName: 'Shell absorption' }, { total: amount, crit: false, evaded: false, immune: false, blocked: true }); }
  private syncCommand(a: Actor) { const f = frameOf(a.summonInst), id = f?.charge?.command ?? f?.crush?.command; if (!id || !a.owner || !a.frameState)
    return; const left = Math.max(0, this.commandLeft(a) - this.w.time); if (left)
    a.owner.cooldowns.set(id, left * a.owner.sheet.get('cooldownRecovery'));
  else
    a.owner.cooldowns.delete(id); }
  command(owner: Actor, host: SkillInstance, inst: SkillInstance, aim: Vec2): void {
    const f = frameOf(host);
    if (!f)
      return;
    const members = this.members(owner, host).filter(a => !a.frameState?.terminal), body = members[0];
    if (!body)
      return;
    if (inst.def.id === f.charge?.command) {
      if (this.commandLeft(body) > this.w.time)
        return;
      const ready = this.w.time + this.cooldown(owner, inst);
      for (const member of members) member.frameState!.commandReady = ready;
      this.syncCommand(body);
      this.startWedge(body, host, aim);
      return;
    }
    if (inst.def.id === f.crush?.command) {
      if (this.commandLeft(body) > this.w.time)
        return;
      for (const a of members) {
        const s = a.frameState!;
        s.commandReady = this.w.time + this.cooldown(owner, inst);
        const n = Math.min(f.crush.range, dist(a.pos, aim)), dir = angleTo(a.pos, aim);
        s.order = { aim: { x: a.pos.x + Math.cos(dir) * n, y: a.pos.y + Math.sin(dir) * n }, end: this.w.time + f.crush.duration, pace: f.crush.pace, strike: f.crush.strike };
        this.syncCommand(a);
      }
    }
    else if (inst.def.id === f.protect?.command) {
      for (const a of members) {
        if (a.summonShell) {
          const sweep = this.skill(a, f.protect.sweep);
          if (sweep)
            this.w.useSkill(a, sweep, aim);
          continue;
        }
        const n = Math.min(f.protect.range, dist(owner.pos, aim)), dir = angleTo(owner.pos, aim);
        a.frameState!.post = { aim: { x: owner.pos.x + Math.cos(dir) * n, y: owner.pos.y + Math.sin(dir) * n }, until: this.w.time + f.protect.duration };
      }
    }
  }
  private startWedge(body: Actor, host: SkillInstance, aim: Vec2) {
    const f = frameOf(host)!, c = f.charge!, owner = body.owner!;
    const members = this.w.actors.filter(a => !a.dead && !a.downed && a.owner === owner && !a.summonShell && !a.frameCharging && a.tier === body.tier && dist(a.pos, body.pos) <= c.gatherRange &&
      (a === body || a.skills.some(s => s && skillContextTags(s).has('melee'))) && this.w.lineOfSight(body.pos, a.pos, body.tier, a.tier));
    const n = Math.min(c.range, dist(body.pos, aim)), dir = angleTo(body.pos, aim);
    const wedge: Wedge = { body, host, members, aim: { x: body.pos.x + Math.cos(dir) * n, y: body.pos.y + Math.sin(dir) * n }, pos: { ...body.pos }, end: this.w.time + c.duration, hit: new Set(), wave: !!body.summonShell };
    for (const a of members) {
      a.frameCharging = true;
      a.casting = null;
    }
    this.wedges.push(wedge);
  }
  private stopWedge(w: Wedge) { for (const a of w.members)
    a.frameCharging = false; this.wedges = this.wedges.filter(x => x !== w); }
  act(a: Actor, target: Actor | null, move: (p: Vec2) => void): boolean { const post = a.frameState?.post, c = frameOf(a.summonInst)?.protect; if (!post || !c || post.until <= this.w.time || a.summonShell || target && a.statuses.some(s => s.id === 'taunted' && s.casterId === target.id))
    return false; if (!target || dist(target.pos, post.aim) > c.guardRadius) {
    if (!a.casting && dist(a.pos, post.aim) > 12)
      move(post.aim);
    return true;
  } return false; }
  private move(a: Actor, point: Vec2, dt: number, pace: number) { a.casting = null; this.w.moveActor(a, point.x - a.pos.x, point.y - a.pos.y, dt * pace); }
  private repairPulse(owner: Actor, inst: SkillInstance) {
    const host = inst.frameHost!, f = frameOf(host);
    if (!f?.repair)
      return;
    const bodies = this.members(owner, host).filter(a => !a.frameState?.terminal);
    if (!bodies.length) {
      owner.casting = null;
      return;
    }
    const interval = inst.def.channel?.interval ?? .25;
    for (const a of bodies) {
      const s = a.frameState!;
      if (this.w.time >= s.tauntAt) {
        s.tauntAt = this.w.time + this.cooldown(a, this.skill(a, f.repair.taunt)!);
        this.payload(a, f.repair.taunt, a.pos);
      }
      if (!f.sanctuary) {
        const skill = this.skill(a, f.repair.pulse)!;
        const raw = a.maxLife() * f.repair.fraction * interval;
        if (a.shellGuard) {
          a.shellGuard.pool = Math.min(a.shellGuard.max, a.shellGuard.pool + a.shellGuard.max * f.repair.fraction * interval * a.sheet.get('healPower', skillContextTags(skill), instanceMods(skill)));
          if (a.shellGuard.pool >= a.shellGuard.max * (a.shellGuard.reformFraction ?? .4))
            a.shellGuard.broken = false;
          this.healingPulse(a, skill, raw, raw, false);
        }
        else
          this.healingPulse(a, skill, raw, raw, false);
      }
      else {
        const c = f.sanctuary, skill = this.skill(a, c.heal)!;
        const allies = this.w.actors.filter(t => t !== a && !t.dead && !t.downed && !t.untargetable && !t.construct && t.team === a.team && t.tier === a.tier && t.life < t.maxLife() && t.sheet.get('healTaken') > 0 && this.within(a, skill, t));
        const need = allies.reduce((v, t) => v + (t.maxLife() - t.life) / t.sheet.get('healTaken'), 0);
        if (!need)
          continue;
        const efficiency = c.efficiency * a.sheet.get('healPower', skillContextTags(skill), instanceMods(skill));
        const price = Math.min(a.life, a.maxLife() * c.cost * (1 + s.strain * c.escalation) * interval, need / Math.max(.001, efficiency));
        if (price <= 0)
          continue;
        const pulse = this.healingPulse(a, skill, price * c.efficiency, price * c.efficiency, true);
        const consumed = (price * c.efficiency - pulse.frameHeal!.remaining) / c.efficiency;
        if (consumed > 0) {
          s.strain += interval;
          applyHit(a, a, { resourceHit: true, amounts: { physical: consumed }, tags: new Set(['physical']), crit: false, sourceName: inst.def.name });
        }
        if (a.life <= 0) {
          owner.casting = null;
          this.w.kill(a, false, a);
        }
      }
    }
  }
  private healingPulse(a: Actor, base: SkillInstance, amount: number, budget: number, excludeCaster: boolean) {
    const inst: SkillInstance = { ...base, frameCast: { origin: base.def.id, auxiliary: true }, frameHeal: { remaining: budget },
      def: { ...base.def, effects: [{ type: 'heal', amount, excludeCaster }] } };
    this.w.executeSkill(a, inst, a.pos, { noRepeat: true, componentUse: true, noCooldown: true, noFollowUp: true, keepFacing: true });
    return inst;
  }
  heal(a: Actor, inst: SkillInstance, target: Actor, raw: number) {
    if (!inst.frameHeal)
      return raw;
    const taken = target.sheet.get('healTaken') * a.sheet.get('healPower', skillContextTags(inst), instanceMods(inst));
    if (taken <= 0 || !this.w.lineOfSight(a.pos, target.pos, a.tier, target.tier))
      return 0;
    const n = Math.min(raw, inst.frameHeal.remaining, Math.max(0, target.maxLife() - target.life) / taken);
    inst.frameHeal.remaining -= n;
    return n;
  }
  healed(a: Actor, inst: SkillInstance, target: Actor, amount: number) {
    if (!inst.frameHeal || !a.frameState || !this.bodies.has(a) || a.owner?.casting?.inst.frameHost !== a.summonInst || amount <= 0)
      return;
    a.frameState.channelTotal += amount;
    a.frameState.channelRecipients.set(target, (a.frameState.channelRecipients.get(target) ?? 0) + amount);
  }
  release(owner: Actor, inst: SkillInstance) {
    const host = inst.frameHost;
    if (!host)
      return;
    const f = frameOf(host);
    for (const a of this.members(owner, host)) {
      const s = a.frameState!, c = f?.sanctuary;
      if (c && s.channelTotal > 0) {
        const ward = this.payload(a, c.ward, a.pos);
        if (ward)
          for (const [t, healed] of s.channelRecipients) {
            if (t.dead || !this.within(a, ward, t))
              continue;
            const key = 'frame:ward:' + owner.id + ':' + host.def.id, amount = skillAbsorbAmount(a, ward, Math.min(healed * c.wardRatio, t.maxLife() * c.wardCap));
            if (amount > (t.absorbLayers.get(key)?.amount ?? 0))
              t.absorbLayers.set(key, { amount, remaining: this.duration(a, ward, c.wardDuration), source: ward, ended: () => { } });
          }
      }
      s.channelTotal = 0;
      s.channelRecipients.clear();
    }
  }
  deferDeath(a: Actor, silent: boolean, killer?: Actor): boolean {
    const f = frameOf(a.summonInst), s = a.frameState;
    if (!f?.reliquary || !s || s.terminalSpent || silent || a.summonOffspring)
      return false;
    if (s.terminal)
      return true;
    const c = f.reliquary, origin = { ...a.pos }, skill = this.payload(a, c.field, origin);
    if (!skill)
      return false;
    const foe = [...this.w.enemiesOf(a)].filter(e => !e.dead && e.tier === a.tier && dist(e.pos, a.pos) <= c.search && this.w.lineOfSight(a.pos, e.pos, a.tier, e.tier))
      .sort((x, y) => (MONSTERS[y.defId ?? '']?.boss ? 3 : y.rarity === 'rare' ? 2 : 1) - (MONSTERS[x.defId ?? '']?.boss ? 3 : x.rarity === 'rare' ? 2 : 1) || dist(x.pos, a.pos) - dist(y.pos, a.pos) || x.id - y.id)[0];
    this.refuges.push({ body: a, host: a.summonInst!, skill, pos: origin, tier: a.tier, left: this.duration(a, skill, c.fieldDuration), pool: skillAbsorbAmount(a, skill, a.maxLife() * c.pool), radius: this.radius(a, skill), shape: a.sheet.get('aoeShape', skillContextTags(skill), instanceMods(skill)), facing: a.facing });
    s.terminal = { target: foe, aim: { ...(foe?.pos ?? origin) }, end: this.w.time + c.duration, killer, invulnerable: a.invulnerable };
    s.order = undefined;
    a.life = 1;
    a.invulnerable = true;
    a.casting = null;
    this.armRefuges();
    return true;
  }
  recovery(a: Actor) { const f = frameOf(a.summonInst); return f?.sacrifice ? Math.max(f.sacrifice.minRecovery, 1 - (a.frameState?.slams ?? 0) * f.sacrifice.recoveryPerSlam) : 1; }
  death(a: Actor, silent: boolean, expire: boolean) {
    const f = frameOf(a.summonInst);
    if (f?.legion && !silent && !expire && !a.summonOffspring)
      this.offspring(a, f.legion.deathCount);
    a.hitObservers?.delete('frame');
    this.bodies.delete(a);
  }
  private armRefuges() {
    const living = new Set(this.refuges.length ? this.w.actors.filter(a => !a.dead) : []);
    for (const a of this.protected)
      if (!living.has(a)) {
        a.lifeDamageInterceptors?.delete('frame:refuge');
        this.protected.delete(a);
      }
    for (const a of living)
      if (!this.protected.has(a)) {
        (a.lifeDamageInterceptors ??= new Map()).set('frame:refuge', (amount: number, event?: LifeWoundEvent) => {
          if (!event || event.packet.resourceHit)
            return amount;
          for (const r of this.refuges) {
            if (r.body.team !== a.team || r.tier !== a.tier || !inAoe(r.pos, r.radius, r.shape, r.facing, a.pos, a.radius) || !this.w.lineOfSight(r.pos, a.pos, r.tier, a.tier))
              continue;
            const used = Math.min(amount, r.pool);
            r.pool -= used;
            amount -= used;
            if (!amount)
              break;
          }
          return amount;
        });
        this.protected.add(a);
      }
  }
  update(dt: number) {
    for (const a of [...this.bodies]) {
      const s = a.frameState!, f = frameOf(a.summonInst);
      if (!f || a.dead || !this.w.actors.includes(a)) {
        a.hitObservers?.delete('frame');
        this.bodies.delete(a);
        continue;
      }
      if (s.resetMotion) {
        s.last = { ...a.pos };
        s.travel = 0;
        s.resetMotion = false;
      }
      this.refreshBody(a, f);
      if (f.sanctuary)
        a.life = Math.min(a.maxLife(), a.life + a.maxLife() * f.sanctuary.regen * dt);
      const channel = a.owner?.casting?.inst.frameHost === a.summonInst;
      if (!channel) {
        s.strain = Math.max(0, s.strain - (f.sanctuary?.strainDecay ?? 1) * dt);
        s.channelTotal = 0;
        s.channelRecipients.clear();
      }
      if (s.terminal) {
        if (s.terminal.target && !s.terminal.target.dead && s.terminal.target.tier === a.tier && this.w.lineOfSight(a.pos, s.terminal.target.pos, a.tier, a.tier))
          s.terminal.aim = { ...s.terminal.target.pos };
        this.move(a, s.terminal.aim, dt, f.reliquary!.pace);
        if (dist(a.pos, s.terminal.aim) < a.radius + 25 || this.w.time >= s.terminal.end) {
          this.payload(a, f.reliquary!.explosion, a.pos);
          const killer = s.terminal.killer;
          a.invulnerable = s.terminal.invulnerable;
          // One terminal callback; kill will no longer ask the frame to defer.
          s.terminal = undefined;
          s.terminalSpent = true;
          a.life = 0;
          this.w.kill(a, false, killer);
        }
        continue;
      }
      const crushMoving = !!s.order?.strike;
      if (s.order && !a.summonShell) {
        const o = s.order;
        this.move(a, o.aim, dt, o.pace);
        if (dist(a.pos, o.aim) < a.radius + 35 || this.w.time >= o.end) {
          s.order = undefined;
          if (o.strike) {
            const skill = this.skill(a, o.strike);
            if (skill) {
              a.useLock = 0;
              this.w.useSkill(a, skill, o.aim);
            }
          }
        }
      }
      const moved = dist(a.pos, s.last);
      s.travel += moved;
      if (f.siege && moved > 0 && this.w.time >= s.contactAt && s.travel >= f.siege.minimumMove && !a.summonShell) {
        s.contactAt = this.w.time + this.cooldown(a, this.skill(a, f.siege.skill)!);
        this.payload(a, f.siege.skill, a.pos, crushMoving ? f.crush?.contactPower ?? 1 : 1, 0, undefined, undefined, true);
        s.travel = 0;
      }
      s.last = { ...a.pos };
      if (s.retaliation) {
        const target = s.retaliation;
        s.retaliation = undefined;
        if (!target.dead && f.spines && !a.shellGuard?.broken)
          this.payload(a, f.spines.skill, target.pos, 1, a.sheet.get('thorns') * f.spines.thorns);
      }
      this.syncCommand(a);
    }
    for (const w of [...this.wedges]) {
      const c = frameOf(w.host)?.charge;
      if (!c || w.body.dead || w.body.owner?.dead || this.w.time >= w.end) {
        this.stopWedge(w);
        continue;
      }
      const dir = angleTo(w.pos, w.aim), travel = Math.min(dist(w.pos, w.aim), w.body.sheet.get('moveSpeed') * c.pace * dt);
      if (w.wave) {
        const next = { x: w.pos.x + Math.cos(dir) * travel, y: w.pos.y + Math.sin(dir) * travel };
        if (!this.w.lineOfSight(w.pos, next, w.body.tier, w.body.tier)) {
          this.stopWedge(w);
          continue;
        }
        w.pos = next;
      }
      else {
        this.move(w.body, w.aim, dt, c.pace);
        w.pos = { ...w.body.pos };
      }
      let index = 0;
      for (const a of w.members)
        if (a !== w.body && !a.dead) {
          const row = 1 + Math.floor(index / 2), side = index % 2 ? 1 : -1;
          index++;
          this.move(a, { x: w.pos.x - Math.cos(dir) * row * c.spacing - Math.sin(dir) * side * row * c.spacing, y: w.pos.y - Math.sin(dir) * row * c.spacing + Math.cos(dir) * side * row * c.spacing }, dt, c.pace);
        }
      const mass = this.mass(w.body) + w.members.filter(a => a !== w.body && !a.dead).reduce((n, a) => n + this.mass(a), 0);
      const id = w.wave ? c.wave : c.rush, skill = this.skill(w.body, id)!;
      // A zero-length aim at arrival must not turn a supported sector east.
      const forward = { x: w.pos.x + Math.cos(dir), y: w.pos.y + Math.sin(dir) };
      if ([...this.w.enemiesOf(w.body)].some(e => !w.hit.has(e.id) && this.within(w.body, skill, e, w.pos, dir))) {
        // A wave receipt prevents overlapping impact pulses from repeatedly hitting the same target.
        this.payload(w.body, id, forward, 1 + mass * c.perMass, 0, w.pos, w.hit);
      }
      this.w.flashes.push({ pos: { ...w.pos }, radius: this.radius(w.body, skill), color: skill.def.color, fx: c.fx, life: .08, maxLife: .08, arc: { facing: dir, arcRad: Math.PI * .8 } });
      if (dist(w.pos, w.aim) < 15) {
        this.stopWedge(w);
        const f = frameOf(w.host);
        if (f?.protect)
          this.payload(w.body, f.protect.sweep, forward, 1, 0, w.pos);
      }
    }
    const expired: Refuge[] = [];
    this.refuges = this.refuges.filter(r => { r.left -= dt; const keep = r.left > 0 && r.pool > 0 && !r.body.owner?.dead && !!r.body.owner?.skills.includes(r.host); if (!keep)
      expired.push(r); return keep; });
    for (const r of expired)
      this.retireField(r.body, r.skill);
    this.armRefuges();
    for (const [a, b] of this.warcalls)
      if (a.dead || this.w.time > Math.max(b.until, b.ready))
        this.warcalls.delete(a);
  }
  leaveZone() { const carried = [...this.bodies].filter(a => !a.dead).map(a => ({ a, observer: a.hitObservers?.get('frame') })); this.clear(); for (const { a, observer } of carried) {
    const s = a.frameState!;
    s.order = undefined;
    s.post = undefined;
    s.retaliation = undefined;
    s.resetMotion = true;
    s.channelTotal = 0;
    s.channelRecipients.clear();
    if (s.terminal) {
      a.invulnerable = s.terminal.invulnerable;
      s.terminal = undefined;
      s.terminalSpent = true;
      this.w.kill(a, true);
      continue;
    }
    this.bodies.add(a);
    if (observer)
      (a.hitObservers ??= new Map()).set('frame', observer);
  } }
  clear(owner?: Actor, host?: SkillInstance) {
    for (const a of this.w.actors)
      if (a.casting?.inst.frameHost && (!owner || a === owner) && (!host || a.casting.inst.frameHost === host))
        a.casting = null;
    const matches = (a: Actor) => !owner || (a.owner === owner && (!host || a.summonInst === host));
    for (const w of [...this.wedges])
      if (matches(w.body))
        this.stopWedge(w);
    const retired = this.refuges.filter(r => matches(r.body));
    this.refuges = this.refuges.filter(r => !matches(r.body));
    for (const r of retired)
      this.retireField(r.body, r.skill);
    for (const [a, b] of this.warcalls)
      if (matches(b.body))
        this.warcalls.delete(a);
    for (const a of [...this.bodies])
      if (matches(a)) {
        a.hitObservers?.delete('frame');
        this.bodies.delete(a);
      }
    for (const a of this.w.actors)
      for (const key of a.absorbLayers.keys())
        if (key.startsWith('frame:ward:') && (!owner || key === 'frame:ward:' + owner.id + ':' + host?.def.id || (!host && key.startsWith('frame:ward:' + owner.id + ':'))))
          a.absorbLayers.delete(key);
    if (host)
      this.faces.delete(host);
    this.armRefuges();
  }
  bindCommand(host: SkillInstance, inst: SkillInstance) { const f = frameOf(host); if (!f || ![f.charge?.command, f.crush?.command, f.protect?.command].includes(inst.def.id))
    return; inst.sockets = inst.sockets.filter(s => !s?.forwarded); this.forward(host, [inst]); }
  dismissFrame(owner: Actor, host: SkillInstance) { this.dismiss(owner, host); }
}
