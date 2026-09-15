import type { Actor } from './actor';
import type { World } from './world';
import { dist, type Vec2 } from '../core/math';
import { sameStory } from './tiers';
import { issueCommand } from './ai';
import { landLifeDamage, mitigateTyped, type DamagePacket } from './damage';
import { mod, type DamageType } from './stats';
import { instanceDelivery, instanceMods, makeSkillInstance, skillContextTags, skillCooldownSeconds, type SkillInstance } from './skills';

export const ASSAULT = { radius: 200, chance: 0.2, refund: 0.25, maxHits: 5, duration: 6 } as const;
export const assaultNode = (s: SkillInstance, id: string): boolean => s.def.id === 'command_assault' && !!s.treeNodes?.includes(id);
export interface AssaultPreparation { owner: Actor; host: SkillInstance; hits: number; until: number; policy: string }
interface Court { owner: Actor; host: SkillInstance; policy: string; bank: number; bodies: Set<Actor> }
interface Ward { court: Court; body: Actor; until: number; lost: boolean; rebuilt: boolean; contacts: number; touched: Map<string, number> }

/** The render and contact test share the exact same orbit positions. */
export function assaultOrbitPositions(a: Actor, time: number): Vec2[] {
  if (!a.assaultOrbit || a.plies <= 0) return [];
  return Array.from({ length: a.plies }, (_, i) => {
    const angle = time * 5 + i * Math.PI * 2 / a.plies + a.id;
    const radius = a.radius + 22;
    return { x: a.pos.x + Math.cos(angle) * radius, y: a.pos.y + Math.sin(angle) * radius };
  });
}

/** Command-owned counters never borrow buff stacks: extra hits do not multiply
 * the preparation's damage bonus. Every native effect retires with its host. */
export class Assaults {
  private courts = new Map<Actor, Court>();
  private recalls = new Map<Actor, { court: Court; at: number }>();
  private wards = new Map<Actor, Ward>();
  constructor(private w: World) {}
  clearAll(): void { for (const c of [...this.courts.values()]) this.clear(c); }
  private policy(host: SkillInstance): string { return JSON.stringify([host.treeNodes, host.level, host.sockets.map(s => s && [s.def.id, s.level])]); }
  private live(c: Court): boolean { return !c.owner.dead && !c.owner.downed && this.w.seats.some(s => s.actor === c.owner) && c.owner.skills.includes(c.host) && c.policy === this.policy(c.host); }
  private court(owner: Actor, host: SkillInstance): Court {
    let c = this.courts.get(owner);
    if (c && (c.host !== host || !this.live(c))) { this.clear(c); c = undefined; }
    if (!c) { c = { owner, host, policy: this.policy(host), bank: 0, bodies: new Set() }; this.courts.set(owner, c); }
    return c;
  }
  private duration(c: Court): number { return ASSAULT.duration * c.owner.sheet.get('effectDuration', skillContextTags(c.host), instanceMods(c.host)); }
  private clear(c: Court): void {
    c.owner.lifeDamageInterceptors?.delete('assault'); c.owner.assaultHud = undefined; c.owner.assaultAura = false;
    for (const a of c.bodies) {
      a.assaultPreparation = undefined; a.assaultLockedTarget = undefined;
      for (const id of ['assault_preparation', 'assault_shelter', 'assault_orders', 'assault_tempo']) a.removeBuff(id);
      a.sheet.removeSource('assault:formation'); a.assaultFormationStats = undefined;
      if (a.aiCommand?.assaultFormation) a.aiCommand = undefined;
      this.endWard(a); this.recalls.delete(a);
    }
    this.courts.delete(c.owner);
  }
  private endWard(a: Actor): void {
    a.plies = Math.max(0, a.plies - a.assaultWardCount);
    a.pliesMax = Math.max(0, a.pliesMax - a.assaultWardCount);
    a.assaultWardCount = 0; a.assaultPlyBreak = undefined; a.assaultOrbit = false;
    this.wards.delete(a);
  }
  private grantPly(a: Actor): void {
    a.assaultWardCount++; a.plies++; a.pliesMax++;
    a.plySpec ??= { count: 0 };
  }
  /** Called once per actual command, after obedience selected its recipients. */
  command(owner: Actor, inst: SkillInstance, bodies: Actor[], recall: boolean): void {
    const host = inst.def.id === 'command_assault' ? inst
      : inst.def.id === 'command_recall' && !inst.hostSkillId ? owner.skills.find(s => s?.def.id === 'command_assault') : undefined;
    if (!host) return;
    const c = this.court(owner, host), until = this.w.time + this.duration(c);
    const unit = Math.max(0.1, skillCooldownSeconds(owner, host));
    const extra = !recall && assaultNode(host, 'patient_signal') ? Math.min(ASSAULT.maxHits - 1, Math.floor(c.bank / unit)) : 0;
    if (!recall) c.bank = Math.max(0, c.bank - extra * unit);
    bodies.forEach((a, index) => {
      c.bodies.add(a);
      if (recall) {
        if (!assaultNode(host, 'iron_advance')) return;
        this.recalls.set(a, { court: c, at: this.w.time + index * Math.min(0.035, 0.5 / Math.max(1, bodies.length - 1)) });
        return;
      }
      const ranks = host.treeNodes?.filter(id => id === 'clear_orders').length ?? 0;
      if (ranks) a.addBuff({ type: 'buff', id: 'assault_orders', duration: this.duration(c), mods: [mod('moveSpeed', 'increased', 0.1 * ranks), mod('attackSpeed', 'increased', 0.1 * ranks), mod('castSpeed', 'increased', 0.1 * ranks), mod('damage', 'increased', 0.03 * ranks)] });
      if (assaultNode(host, 'killing_signal')) a.assaultPreparation = { owner, host, hits: 1 + extra, until, policy: c.policy };
      this.endWard(a);
      if (assaultNode(host, 'sheltered_advance')) {
        this.grantPly(a);
        const ward: Ward = { court: c, body: a, until, lost: false, rebuilt: false, contacts: 0, touched: new Map() };
        this.wards.set(a, ward);
        a.assaultOrbit = assaultNode(host, 'scattered_advance');
        a.assaultPlyBreak = attacker => {
          if (!this.live(c) || this.w.time >= ward.until || attacker && (!this.w.hostileTo(attacker, a) || !sameStory(attacker, a))) return;
          ward.lost = true;
          // Temporary plies break first; removing the blessing cannot eat a native ply.
          const spent = Math.min(a.assaultWardCount, Math.max(0, a.pliesMax - a.plies));
          a.assaultWardCount -= spent; a.pliesMax -= spent;
          this.burst(a, a.pos, 48, 0.65);
        };
      }
    });
    this.hud(c);
  }
  prepared(a: Actor): AssaultPreparation | undefined {
    const p = a.assaultPreparation;
    if (!p || p.hits <= 0 || p.until <= this.w.time || p.owner.dead || !p.owner.skills.includes(p.host) || p.policy !== this.policy(p.host)) return undefined;
    return p;
  }
  lock(a: Actor, inst: SkillInstance, aim: Vec2): void {
    a.assaultLockedTarget = undefined;
    const p = this.prepared(a), d = instanceDelivery(inst);
    if (!p || !assaultNode(p.host, 'stunning_signal') || d.type !== 'melee' || a.sheet.get('meleeSweep', skillContextTags(inst), instanceMods(inst)) > 0) return;
    const reach = (a.radius + d.range) * a.sheet.get('meleeReach', skillContextTags(inst), instanceMods(inst));
    const candidates = this.w.enemiesOf(a).filter(t => sameStory(a, t) && dist(a.pos, t.pos) <= reach + t.radius);
    const target = candidates.find(t => t.id === a.aiTargetId) ?? candidates.sort((x, y) => dist(x.pos, aim) - dist(y.pos, aim))[0];
    if (target) a.assaultLockedTarget = { inst, targetId: target.id, until: this.w.time + Math.max(1, a.skillUseTime(inst) + 0.5) };
  }
  locked(a: Actor, inst: SkillInstance): Actor | undefined {
    const lock = a.assaultLockedTarget; a.assaultLockedTarget = undefined;
    if (!lock || lock.inst !== inst || lock.until < this.w.time || !this.prepared(a)) return;
    const target = this.w.actorById(lock.targetId);
    return target && !target.dead && !target.untargetable && sameStory(a, target) && this.w.hostileTo(a, target) ? target : undefined;
  }
  packet(a: Actor, packet: DamagePacket, depth: number): void {
    const p = depth === 0 ? this.prepared(a) : undefined;
    if (p && assaultNode(p.host, 'sure_signal')) packet.assaultGuaranteed = true;
  }
  plant(a: Actor, target: Actor, packet: DamagePacket, depth: number, dealt: number): void {
    if (depth !== 0 || dealt <= 0 || target.dead || !this.prepared(a)) return;
    for (const type of Object.keys(packet.amounts) as DamageType[]) {
      const amount = packet.amounts[type] ?? 0; if (amount <= 0) continue;
      target.applyStatus('impaled_' + type, 0, 1, 'Killing Signal', { casterId: a.id, rupture: amount * 0.2, ruptureType: type });
    }
  }
  private feed(c: Court, target: Actor, dealt: number, source: Actor): void {
    if (!this.live(c)) return;
    if (dealt > 0 && assaultNode(c.host, 'finishing_signal') && !target.dead) target.applyStatus('doom', 0, 1, 'Dooming Signal', { casterId: source.id, rupture: dealt * 0.4, ruptureType: 'chaos' });
    if (assaultNode(c.host, 'rapid_signals') && Math.random() < ASSAULT.chance) this.refund(c.owner, c.host, ASSAULT.refund);
  }
  refund(owner: Actor, host: SkillInstance, amount: number): void {
    const c = this.court(owner, host), left = owner.cooldowns.get(host.def.id) ?? 0;
    const reduction = Math.min(left, amount);
    if (left > reduction) owner.cooldowns.set(host.def.id, left - reduction); else owner.cooldowns.delete(host.def.id);
    // Only reductions earned while already ready bank; a finishing refund does not double-pay.
    if (left <= 0 && assaultNode(host, 'patient_signal')) c.bank = Math.min(skillCooldownSeconds(owner, host) * (ASSAULT.maxHits - 1), c.bank + amount);
    this.hud(c);
  }
  afterHit(a: Actor, target: Actor, dealt: number, depth: number, landed = dealt > 0): void {
    if (depth !== 0 || !landed) return;
    for (const c of this.courts.values()) if (a !== c.owner && a.ownedBy(c.owner)) this.feed(c, target, dealt, a);
    const p = this.prepared(a);
    if (!p) return;
    if (assaultNode(p.host, 'rushing_signal')) a.addBuff({ type: 'buff', id: 'assault_tempo', label: 'Rising Tempo', duration: 4, maxStacks: 5, mods: [mod('moveSpeed', 'increased', 0.1), mod('attackSpeed', 'increased', 0.1), mod('castSpeed', 'increased', 0.1)] });
    if (--p.hits <= 0) { a.assaultPreparation = undefined; a.removeBuff('assault_preparation'); }
  }
  pooledHit(owner: Actor, target: Actor, dealt: number, amounts: DamagePacket['amounts']): void {
    if (dealt <= 0 || target.dead) return;
    for (const s of [...target.statuses]) {
      if (!s.id.startsWith('impaled_') || !s.rupture || !s.ruptureType || !(amounts[s.ruptureType]! > 0)) continue;
      target.statuses.splice(target.statuses.indexOf(s), 1); target.sheet.removeSource('status:' + s.id);
      landLifeDamage(target, mitigateTyped(target, { [s.ruptureType]: s.rupture }));
      if (target.life <= 0) { this.w.kill(target, false, owner); break; }
    }
    const c = this.courts.get(owner); if (c) this.feed(c, target, dealt, owner);
    this.w.assaultDoomCull(target);
  }
  private burst(a: Actor, at: Vec2, radius: number, power: number, only?: Actor): void {
    const hit = makeSkillInstance({ id: 'assault_blade', name: 'Command Blade', tags: ['spell', 'physical', 'aoe'], color: '#dfc77b', manaCost: 0, cooldown: 0, useTime: 0, delivery: { type: 'self' }, description: 'A protective ply cuts nearby enemies.', baseDamage: { physical: [4 + a.level * 1.5, 6 + a.level * 1.5] }, effects: [{ type: 'damage' }] });
    const enemies = only ? [only] : this.w.enemiesOf(a);
    for (const e of enemies) if (!e.dead && sameStory(a, e) && this.w.hostileTo(a, e) && dist(e.pos, at) <= radius + e.radius) this.w.assaultBladeHit(a, hit, e, power);
    if (!only) this.w.flashes.push({ pos: { ...at }, radius, color: '#dfc77b', life: 0.2, maxLife: 0.2 });
  }
  private hud(c: Court): void {
    if (!assaultNode(c.host, 'patient_signal')) { c.owner.assaultHud = undefined; return; }
    const unit = Math.max(0.1, skillCooldownSeconds(c.owner, c.host));
    const extra = Math.min(ASSAULT.maxHits - 1, Math.floor(c.bank / unit));
    c.owner.assaultHud = { hits: 1 + extra, progress: extra >= ASSAULT.maxHits - 1 ? 1 : (c.bank / unit) % 1 };
  }
  update(dt: number): void {
    for (const c of [...this.courts.values()]) if (!this.live(c)) this.clear(c);
    for (const seat of this.w.seats) {
      const owner = seat.actor, host = owner.skills.find(s => s?.def.id === 'command_assault');
      if (!host || owner.dead) continue;
      const c = this.court(owner, host), ready = (owner.cooldowns.get(host.def.id) ?? 0) <= 0;
      const aura = ready && assaultNode(host, 'renewed_advance');
      owner.assaultAura = aura;
      for (const a of c.bodies) if (a.dead || !a.ownedBy(owner)) {
        this.endWard(a); a.assaultPreparation = undefined; a.assaultLockedTarget = undefined;
        a.sheet.removeSource('assault:formation'); a.assaultFormationStats = undefined;
        for (const id of ['assault_preparation', 'assault_shelter', 'assault_orders', 'assault_tempo']) a.removeBuff(id);
        c.bodies.delete(a); this.recalls.delete(a);
      }
      const bodies = this.w.actors.filter(a => !a.dead && !a.construct && a !== owner && a.ownedBy(owner));
      const shields = aura ? bodies.filter(a => sameStory(a, owner) && dist(a.pos, owner.pos) <= ASSAULT.radius) : [];
      owner.lifeDamageInterceptors?.delete('assault');
      if (aura) (owner.lifeDamageInterceptors ??= new Map()).set('assault', (amount: number) => {
        if (!this.live(c) || (owner.cooldowns.get(host.def.id) ?? 0) > 0) return amount;
        const alive = shields.filter(a => !a.dead && a.life > 0 && sameStory(a, owner) && dist(a.pos, owner.pos) <= ASSAULT.radius);
        if (!alive.length) return amount;
        let shared = 0;
        for (const a of alive) {
          const wound = Math.min(a.life, amount * 0.3 / alive.length); shared += wound;
          landLifeDamage(a, wound); if (a.life <= 0) this.w.kill(a, false, owner);
        }
        return amount - shared;
      });
      bodies.forEach((a, index) => {
        c.bodies.add(a);
        const inside = shields.includes(a);
        const regen = inside && assaultNode(host, 'mending_advance') ? 4 * owner.sheet.get('minionDamage') : 0;
        const offense = !ready && assaultNode(host, 'lasting_advance');
        const mods = [...(regen ? [mod('lifeRegen', 'flat', regen)] : []), ...(offense ? [mod('damage', 'more', 0.1)] : [])];
        const signature = `${regen}:${offense}`;
        if (a.assaultFormationStats !== signature) { a.assaultFormationStats = signature; a.sheet.setSource('assault:formation', mods); }
        if (inside) {
          const angle = index * Math.PI * 2 / Math.max(1, shields.length), r = 48 + Math.min(55, shields.length * 2);
          issueCommand(a, { kind: 'hold', pos: { x: owner.pos.x + Math.cos(angle) * r, y: owner.pos.y + Math.sin(angle) * r }, radius: 65, until: this.w.time + 0.2, issuerId: owner.id, assaultFormation: true });
        } else if (a.aiCommand?.assaultFormation) a.aiCommand = undefined;
        if (a.assaultPreparation && !this.prepared(a)) { a.assaultPreparation = undefined; a.removeBuff('assault_preparation'); }
      });
      this.hud(c);
    }
    for (const [a, recall] of this.recalls) {
      if (a.dead || !this.live(recall.court)) { this.recalls.delete(a); continue; }
      if (this.w.time < recall.at) continue;
      const owner = recall.court.owner;
      this.burst(a, a.pos, 65, 1.3);
      const angle = a.id * 2.4;
      this.w.teleportActor(a, { x: owner.pos.x + Math.cos(angle) * 40, y: owner.pos.y + Math.sin(angle) * 40 }, '#dfc77b', undefined, owner.tier);
      a.casting = null; a.assaultLockedTarget = undefined; this.recalls.delete(a);
    }
    for (const [a, ward] of this.wards) {
      if (a.dead || !this.live(ward.court)) { this.endWard(a); continue; }
      if (ward.until <= this.w.time) { this.endWard(a); continue; }
      const points = assaultOrbitPositions(a, this.w.time);
      if (!points.length) continue;
      for (const e of this.w.enemiesOf(a)) {
        if (!sameStory(a, e) || !this.w.hostileTo(a, e) || dist(a.pos, e.pos) > a.radius + e.radius + 30) continue;
        points.forEach((p, index) => {
          const key = index + ':' + e.id;
          if (e.dead || (ward.touched.get(key) ?? 0) > this.w.time || dist(p, e.pos) > e.radius + 6) return;
          ward.touched.set(key, this.w.time + 0.3);
          const before = e.life; this.burst(a, e.pos, 6, 0.6, e);
          if (ward.lost && e.life < before && !ward.rebuilt && assaultNode(ward.court.host, 'flowing_advance') && ++ward.contacts >= 3) { this.grantPly(a); ward.rebuilt = true; }
        });
      }
      for (const [id, until] of ward.touched) if (until < this.w.time - 1) ward.touched.delete(id);
    }
  }
}
