import type { World } from './world';
import type { Actor } from './actor';
import { makeSkillInstance, type SkillInstance } from './skills';
import { mod } from './stats';
import { BATTLE_DOCTRINES } from '../data/battleDoctrines';
import { SKILLS } from '../data/skills';
import type { BattleDoctrineDef, DoctrineForm } from './battleDoctrineSpec';
import { sameStory } from './tiers';
import { refreshTransmutation, transmutationOf } from './minionTransmutation';
import { applyMinionPlyBonus, resolveMinionInheritance } from './minionInheritance';
import { issueCommand } from './ai';
import type { CommandState } from './brain';
import { buffWithSource } from './buffSource';

type Pos = { x: number; y: number };
type State = { bank: number; next: number; signature: string; partners: Map<Actor, { actor: Actor; at: number }>;
  commands: Map<Actor, CommandState>; };
const distance = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);
const IDS = BATTLE_DOCTRINES.map(d => d.id);
export class BattleDoctrines {
  private states = new Map<Actor, Map<string, State>>();
  private issued = new WeakMap<SkillInstance, { owner: Actor; doctrine: string }>();
  private refreshAt = 0;
  constructor(private w: World) {}
  clear(): void {
    for (const [a, states] of this.states) for (const [id, state] of states) this.cancel(a, id, state);
    this.states.clear(); this.refreshAt = 0;
  }
  private signature(a: Actor, d: BattleDoctrineDef) {
    return [d.stat, ...d.forms.flatMap(f => f.stat ? [f.stat] : []), ...(d.traits ?? []).map(t => t.stat)].map(s => a.sheet.get(s)).join(',');
  }
  private cancel(a: Actor, id: string, state: State) {
    const d = BATTLE_DOCTRINES.find(d => d.id === id)!;
    const buffs = [`doctrine:${id}:${a.id}`, ...(d.traits ?? []).map(t => `doctrine:${t.stat}:${a.id}`)];
    for (const b of this.w.actors) for (const key of buffs) b.removeBuff(key);
    for (const [b, cmd] of state.commands) if (b.aiCommand === cmd) b.aiCommand = undefined;
    this.w.pendingRepeats = this.w.pendingRepeats.filter(r => {
      const source = this.issued.get(r.inst); return source?.owner !== a || source.doctrine !== id;
    });
  }
  private enabled(a: Actor, d: BattleDoctrineDef) { return !a.dead && !a.downed && a.sheet.get(d.stat) > 0; }
  private state(a: Actor, d: BattleDoctrineDef): State {
    let states = this.states.get(a); if (!states) this.states.set(a, states = new Map());
    let state = states.get(d.id); if (!state) states.set(d.id, state = { bank: 0, next: 0, signature: this.signature(a, d), partners: new Map(), commands: new Map() });
    return state;
  }
  private subjects(a: Actor, d: BattleDoctrineDef) {
    return this.w.actors.filter(b => b.owner === a && !b.dead && !b.downed && !b.construct && !b.companionDormant && sameStory(a, b)
      && distance(a.pos, b.pos) <= d.radius && (d.subjects === 'companions' ? !!b.companion : b.isMinion()));
  }
  private form(a: Actor, d: BattleDoctrineDef): DoctrineForm { return d.forms.find(f => f.stat && a.sheet.get(f.stat) > 0) ?? d.forms[0]; }
  private growths(a: Actor, d: BattleDoctrineDef) { return d.growth ? this.w.doctrineGrowths(a, d.growth.kind)
    .filter(g => sameStory(a, g.d) && distance(a.pos, g.d.pos) <= d.radius && g.maxTtl - g.ttl >= d.growth!.maturity && !g.d.gone)
    .slice(0, d.growth.maximum) : []; }
  refusal(a: Actor, inst: SkillInstance): string | undefined {
    if (!inst.def.doctrine) return;
    const d = BATTLE_DOCTRINES.find(d => d.id === inst.def.doctrine);
    if (!d || !this.enabled(a, d)) return 'This doctrine is not granted.';
    if (d.meter && this.state(a, d).bank < d.meter.minimum) return d.meter.emptyReason ?? 'This ability needs more stored power.';
    if (d.growth && !this.growths(a, d).length) return 'No mature owned growths in reach.';
    if (d.subjects && !this.subjects(a, d).length) return 'No available allies in reach.';
  }
  private add(a: Actor, d: BattleDoctrineDef) {
    if (!d.meter || !this.enabled(a, d)) return;
    const s = this.state(a, d); if (this.w.time < s.next) return;
    s.next = this.w.time + d.meter.interval; s.bank = Math.min(d.meter.max, s.bank + 1);
    for (const t of d.traits ?? []) if (t.refund && a.sheet.get(t.stat) > 0) a.cooldowns.set(d.skill, Math.max(0, (a.cooldowns.get(d.skill) ?? 0) - t.refund));
  }
  hit(a: Actor, inst: SkillInstance, target: Actor, poiseBreak: boolean): void {
    if (this.issued.has(inst) || inst.def.doctrine || target.team === a.team) return;
    const owner = a.owner ?? a;
    for (const id of owner.sheet.armedFamily('doctrine_', IDS)) {
      const d = BATTLE_DOCTRINES.find(d => d.id === id)!;
      if (!this.enabled(owner, d) || !d.meter) continue;
      if (a === owner && poiseBreak && d.meter.events.includes('poiseBreak') && inst.def.tags.includes('melee')) this.add(owner, d);
      if (!d.meter.events.includes('cooperate') || (a !== owner && !this.subjects(owner, d).includes(a))) continue;
      const state = this.state(owner, d), previous = state.partners.get(target);
      if (previous && previous.actor !== a && this.w.time - previous.at <= d.meter.window) this.add(owner, d);
      state.partners.set(target, { actor: a, at: this.w.time });
    }
  }
  death(victim: Actor, killer?: Actor): void {
    if (!killer || victim.team === killer.team || victim.noBounty) return;
    for (const d of BATTLE_DOCTRINES) if (d.meter?.events.includes('kill') && this.enabled(killer, d)
      && sameStory(victim, killer) && distance(victim.pos, killer.pos) < d.radius) this.add(killer, d);
  }
  private release(a: Actor, host: SkillInstance, id: string, at: Pos, power: number, delay = 0): void {
    const def = SKILLS[id]; if (!def) return;
    const inst = makeSkillInstance(def, Math.max(1, a.level), 0);
    inst.hostSkillId = host.def.id; inst.sockets = [...host.sockets]; inst.grafts = host.grafts && [...host.grafts];
    this.issued.set(inst, { owner: a, doctrine: host.def.doctrine! });
    if (delay) this.w.pendingRepeats.push({ caster: a, inst, aim: { ...at }, n: 1, k: 0, timer: delay, interval: delay, dmgMult: power, aoeMult: 1, scaleStep: 0, retarget: false });
    else this.w.executeSkill(a, inst, at, { noRepeat: true, noCooldown: true, dmgMult: power });
  }
  cast(a: Actor, inst: SkillInstance, aim: Pos): void {
    if (!inst.def.doctrine || this.issued.has(inst) || this.refusal(a, inst)) return;
    const d = BATTLE_DOCTRINES.find(d => d.id === inst.def.doctrine)!, state = this.state(a, d), f = this.form(a, d);
    const bank = state.bank; state.bank = 0;
    const traits = (d.traits ?? []).filter(t => a.sheet.get(t.stat) > 0);
    const growths = this.growths(a, d), bodies = d.subjects ? this.subjects(a, d) : [a];
    if (d.subjects && traits.some(t => t.includeOwner)) bodies.push(a);
    const strength = 1 + bank * (d.meter?.powerPerCharge ?? 0);
    const destination = this.w.clampPos(distance(a.pos, aim) <= d.radius ? aim : {
      x: a.pos.x + (aim.x - a.pos.x) * d.radius / distance(a.pos, aim), y: a.pos.y + (aim.y - a.pos.y) * d.radius / distance(a.pos, aim),
    }, 16, undefined, { mover: a });
    const point = (i: number, count: number): Pos => {
      const angle = f.formation === 'wedge' ? Math.atan2(destination.y - a.pos.y, destination.x - a.pos.x) + (i % 2 ? 1 : -1) * 2.2 : i / Math.max(1, count) * Math.PI * 2;
      const radius = (d.spacing ?? 70) * (f.formation === 'wedge' ? 1 + Math.floor(i / 2) : f.formation === 'scatter' ? 2.5 : 1.5);
      return { x: destination.x + Math.cos(angle) * radius, y: destination.y + Math.sin(angle) * radius };
    };
    for (const [i, b] of bodies.entries()) {
      if (d.subjects && b !== a) {
        const command = { kind: f.order ?? 'assault', pos: this.w.clampPos(point(i, bodies.length), b.radius, undefined, { mover: b }), until: this.w.time + d.duration, issuerId: a.id };
        issueCommand(b, command); state.commands.set(b, command);
      }
      const mods = [...(f.mods ?? []), ...(bank && d.subjects ? [mod('damage', 'more', strength - 1)] : [])];
      let heal = f.healPct ?? 0;
      for (const t of traits) {
        if (t.spendPly) { if (b.plies <= 0) continue; b.plies--; }
        mods.push(...(t.mods ?? [])); heal += t.healPct ?? 0;
        if (t.answer && d.subjects) {
          const attack = b.skills.find(s => s?.def.tags.includes('attack') && !s.def.doctrine);
          if (attack) this.w.useSkill(b, attack, aim);
        }
      }
      if (mods.length) b.addBuff(buffWithSource({ type: 'buff', id: `doctrine:${d.id}:${a.id}`, label: d.name, duration: d.duration * (f.scaleDuration ? strength : 1), mods }, inst));
      if (heal) b.healBy(b.maxLife() * heal * (d.growth ? growths.length : 1));
    }
    const origins = d.growth ? growths.map(g => ({ ...g.d.pos })) : [aim];
    if (d.growth) for (const [i, g] of growths.entries()) {
      if (f.relocate) { g.d.pos = this.w.clampPos(point(i, growths.length), g.d.radius, undefined, { mover: a }); }
      else { g.ttl = 0; g.d.gone = true; }
    }
    if (d.growth) this.w.markDoodadsChanged();
    if (f.payload) for (const origin of origins) {
      this.release(a, inst, f.payload, origin, strength);
      for (const t of traits) if (t.repeat) this.release(a, inst, f.payload, origin, strength * t.repeat.power, t.repeat.delay);
    }
    this.w.flashes.push({ pos: { ...destination }, radius: d.subjects ? (d.spacing ?? 40) * 3 : 90, color: d.color, life: .7, maxLife: .7,
      fx: 'battle_doctrine', recoveryCueTier: a.tier, doctrineCue: { kind: d.growth ? 'harvest' : 'order', count: d.subjects ? bodies.length : growths.length, max: 1, formation: f.formation } });
  }
  reconcile(owner?: Actor): void {
    for (const [a, states] of this.states) {
      if (owner && owner !== a) continue;
      for (const [id, state] of states) {
        const d = BATTLE_DOCTRINES.find(d => d.id === id)!;
        if (!this.enabled(a, d) || !this.w.actors.includes(a) || state.signature !== this.signature(a, d)) {
          this.cancel(a, id, state); states.delete(id); continue;
        }
        for (const [target, p] of state.partners) if (target.dead || this.w.time - p.at > (d.meter?.window ?? 0)) state.partners.delete(target);
        for (const [b, command] of state.commands) if (b.dead || b.aiCommand !== command || command.until < this.w.time) state.commands.delete(b);
      }
      if (!states.size) this.states.delete(a);
    }
    for (const b of this.w.actors) if (!b.dead && b.owner && b.isMinion() && !b.construct && (b.transmutation || transmutationOf(b.owner, b.defId))) {
      if (refreshTransmutation(b, b.owner)) {
        if (b.summonInst) {
          const inheritance = resolveMinionInheritance(b.owner, b.summonInst, b.defId);
          b.sheet.setSource('owner', inheritance.ownerMods); b.guardMode = inheritance.guard;
          applyMinionPlyBonus(b, inheritance.plyBonus); this.w.resyncMinionSupports(b.summonInst);
        }
        b.life = Math.min(b.life, b.maxLife());
      }
    }
  }
  update(): void {
    if (this.w.time < this.refreshAt) return; this.refreshAt = this.w.time + .25;
    this.reconcile();
    for (const a of this.w.actors) {
      if (a.dead || a.downed) continue;
      for (const id of a.sheet.armedFamily('doctrine_', IDS)) {
        const d = BATTLE_DOCTRINES.find(d => d.id === id)!;
        const state = this.state(a, d);
        if (d.meter) this.w.flashes.push({ pos: { ...a.pos }, radius: 31, color: d.color, life: .3, maxLife: .3,
          fx: 'battle_doctrine', recoveryCueTier: a.tier, doctrineCue: { kind: 'meter', count: state.bank, max: d.meter.max } });
        for (const t of d.traits ?? []) if (t.shelter && a.sheet.get(t.stat) > 0) {
          const anchors = d.growth ? this.w.doctrineGrowths(a, d.growth.kind).filter(g => !g.d.gone).map(g => g.d) : this.subjects(a, d);
          for (const ally of [a, ...this.w.actors.filter(b => b.owner === a && !b.dead && !b.downed)]) if (anchors.some(p => sameStory(p, ally) && distance(p.pos, ally.pos) <= t.shelter!.radius))
            ally.addBuff({ type: 'buff', id: `doctrine:${t.stat}:${a.id}`, label: d.name, duration: .35, mods: t.shelter.mods,
              sourceSkill: { id: d.skill, name: d.name, color: d.color, tags: [...SKILLS[d.skill].tags] } });
        }
      }
    }
  }
  view(a: Actor) { return [...(this.states.get(a)?.entries() ?? [])].map(([id, s]) => ({ id, bank: s.bank })); }
}
