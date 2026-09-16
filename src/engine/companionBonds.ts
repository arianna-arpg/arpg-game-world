import type { Actor } from './actor';
import type { World } from './world';
import type { Vec2 } from '../core/math';
import { dist, vec } from '../core/math';
import { mod } from './stats';
import { instanceMods, makeSkillInstance, skillContextTags, type SkillInstance } from './skills';
import { companionBondOf, companionLevelOf, type CompanionBondSpec, type CompanionSaved } from './companionSpec';
// THE STANCES (engine/companionStances.ts): importing the module also seats
// the stance command kinds and the meta face — the bond is their one door.
import { companionStanceDef, companionStanceIdOf, standingOrderFor } from './companionStances';
import { SKILLS } from '../data/skills';
import { beastFamilyOf } from '../data/beastFamilies';

interface BondState {
  inst: SkillInstance;
  native: (SkillInstance | null)[];
  granted: Map<string, SkillInstance>;
  spec: CompanionBondSpec;
  policy: string;
  sheet: string;
  /** The level the body was CLAIMED at — the floor the growing bond keeps
   *  (companionLevelOf: a beast caught above its keeper stays wild-strong). */
  claimedLevel: number;
  /** The stance whose standing order the body currently wears ('' = none). */
  stanceId: string;
  orbAt: number;
  chargeAt: number;
  echoAt: number;
  dreadAt: number;
  exposure: Map<Actor, number>;
  pulseUntil: number;
  pulseAt: number;
  issued: Set<SkillInstance>;
}

/** Ordinary melee copies cannot duplicate resource banks, summons or held casts. */
export function companionCanMimic(inst: SkillInstance): boolean {
  const d = inst.def;
  return d.tags.includes('melee') && d.tags.includes('attack')
    && ['melee', 'cone', 'nova'].includes(d.delivery.type)
    && !d.targeting && !d.channel && !d.guard && !d.chargeCost && !d.pool
    && !d.concentration && !d.comboChain
    && d.effects.every(f => ['damage', 'status', 'knockback', 'buff', 'heal', 'charge'].includes(f.type));
}

/** Per-world, per-owner companion state. Only the saved revival countdown is
 * durable; skills, stats, preparations and pending copies rebuild from data. */
export class CompanionBonds {
  private states = new Map<Actor, BondState>();
  private copies = new WeakSet<SkillInstance>();
  constructor(private w: World) {}

  host(beast: Actor): SkillInstance | undefined {
    const id = beast.sourceSkillId?.replace('__companion:', '');
    return beast.owner?.skills.find(s => s?.def.id === id) ?? undefined;
  }
  private key(beast: Actor) { return `companion_bond:${beast.owner!.id}:${this.host(beast)?.def.id ?? ''}`; }
  private rallyId(beast: Actor) { return this.key(beast) + ':rally'; }
  private frenzyId(beast: Actor) { return this.key(beast) + ':frenzy'; }

  adopt(beast: Actor): void {
    const inst = this.host(beast);
    if (!inst || !beast.owner) return;
    this.states.set(beast, { inst, native: [...beast.skills], granted: new Map(), spec: {}, policy: '', sheet: '',
      claimedLevel: Math.max(1, beast.level), stanceId: '',
      orbAt: 0, chargeAt: 0, echoAt: 0, dreadAt: 0, exposure: new Map(), pulseUntil: 0, pulseAt: 0, issued: new Set() });
    // Owned animals accept orders instead of retaining a wild hunger/flee script.
    beast.brain = {};
    beast.casting = null;
    beast.passive = false;
    beast.ambushArmed = false;
    beast.sheet.removeSource('ambush');
    beast.untargetable = false;
    beast.aiAwakened = true;
    this.refreshBeast(beast, inst, false);
  }

  private clearPayloads(beast: Actor, state: BondState): void {
    const owned = new Set([...state.issued, ...state.granted.values()]);
    const owns = (caster: Actor, inst: SkillInstance) => caster === beast && owned.has(inst);
    this.w.pendingRepeats = this.w.pendingRepeats.filter(p => !owns(p.caster, p.inst));
    this.w.projectiles = this.w.projectiles.filter(p => !owns(p.caster, p.inst));
    this.w.pendingFuses = this.w.pendingFuses.filter(p => !owns(p.caster, p.inst));
    for (let i = this.w.zones.length - 1; i >= 0; i--) {
      const z = this.w.zones[i];
      if (owns(z.caster, z.inst)) this.w.retireOwnedZone(z);
    }
    if (beast.casting && (state.issued.has(beast.casting.inst) || [...state.granted.values()].includes(beast.casting.inst))) beast.casting = null;
    state.issued.clear(); state.exposure.clear(); state.pulseUntil = 0;
    state.echoAt = this.w.time + (state.spec.mimicMelee?.cooldown ?? 0);
    for (const actor of [beast, beast.owner!]) if (actor) {
      actor.removeBuff(this.rallyId(beast)); actor.removeBuff(this.frenzyId(beast));
    }
  }

  private refreshBeast(beast: Actor, inst: SkillInstance, dormant: boolean): void {
    if (!this.states.has(beast)) this.adopt(beast);
    const state = this.states.get(beast)!;
    const spec = companionBondOf(inst), owner = beast.owner!;
    const policy = JSON.stringify([inst.treeNodes, inst.sockets.map(s => s && [s.def.id, s.level]), dormant]);
    if (state.policy && state.policy !== policy) this.clearPayloads(beast, state);
    state.policy = policy; state.spec = spec; state.inst = inst;
    beast.companionDormant = dormant;
    if (dormant) { beast.downed = true; beast.life = 0; beast.companionReviveRemaining = undefined; }
    // THE GROWING BOND (COMPANION_CFG.level): the body's level follows its
    // keeper — re-stamped in place through the one monster level fold
    // (World.relevelActor: life kept as a fraction, the native kit on the
    // monster ladder; the granted arts re-mint at body level below).
    const level = companionLevelOf(owner.level, state.claimedLevel);
    if (beast.level !== level) this.w.relevelActor(beast, level);
    // THE STANCE (engine/companionStances.ts): the keeper's held conduct for
    // this bond becomes the beast's standing order — the order beneath every
    // issued one; a dormant body wears none. Re-stamped only on change.
    const stanceId = dormant ? '' : companionStanceIdOf(this.keeperSeat(owner)?.meta.stances, inst.def.id);
    if (state.stanceId !== stanceId) {
      state.stanceId = stanceId;
      beast.standingOrder = stanceId ? standingOrderFor(stanceId) : undefined;
    }
    const tags = skillContextTags(inst), extra = instanceMods(inst);
    const mods = dormant ? [] : [
      mod('life', 'more', owner.sheet.get('minionLife', tags, extra) - 1),
      mod('damage', 'more', owner.sheet.get('minionDamage', tags, extra) - 1),
      ...(spec.beastMods ?? []),
    ];
    const sig = JSON.stringify(mods);
    if (state.sheet !== sig) {
      const fraction = beast.life / Math.max(1, beast.maxLife());
      beast.sheet.setSource('companionBond', mods); state.sheet = sig;
      beast.life = Math.min(beast.maxLife(), beast.maxLife() * fraction);
    }
    const arts = new Set(dormant ? [] : (spec.beastSkills ?? []));
    if (!dormant && spec.familyArt) {
      arts.add(beastFamilyOf(beast.defId).skillId);
    }
    if (!dormant && beast.buffs.has(this.frenzyId(beast)) && spec.frenzy) arts.add(spec.frenzy.gapCloser);
    // Even a naturally peaceful animal needs an ordinary attack once bonded.
    if (!dormant && !state.native.some(s => s?.def.effects.some(f => f.type === 'damage'))) arts.add('claw');
    // Granted arts mint at BODY level and re-mint when the bond grows (a
    // stale instance would keep yesterday's damage ladder); a cast in flight
    // on the old instance yields — the cooldown ledger is keyed by id and
    // survives the swap.
    const artLevel = Math.max(1, beast.level);
    for (const id of arts) {
      const held = state.granted.get(id);
      if ((held && held.level === artLevel) || !SKILLS[id]) continue;
      if (held && beast.casting?.inst === held) beast.casting = null;
      state.granted.set(id, makeSkillInstance(SKILLS[id], artLevel));
    }
    for (const [id, granted] of state.granted) if (!arts.has(id)) {
      if (beast.casting?.inst === granted) beast.casting = null;
      state.granted.delete(id); beast.cooldowns.delete(id);
    }
    beast.skills = [...state.native, ...[...state.granted].filter(([id]) => !state.native.some(s => s?.def.id === id)).map(([, s]) => s)];
  }

  refresh(): void {
    for (const [beast, state] of this.states) if (beast.dead || !beast.companion || !this.host(beast) || !this.w.actors.includes(beast)) {
      this.clearPayloads(beast, state); beast.sheet.removeSource('companionBond'); beast.skills = state.native;
      beast.standingOrder = undefined;
      this.states.delete(beast);
    }
    const groups = new Map<SkillInstance, Actor[]>();
    for (const beast of this.w.actors) if (!beast.dead && beast.companion && beast.owner) {
      const inst = this.host(beast); if (!inst) continue;
      const list = groups.get(inst) ?? []; list.push(beast); groups.set(inst, list);
    }
    for (const [inst, beasts] of groups) {
      const active = new Set([...new Set(beasts.map(b => b.bondGroup ?? String(b.id)))].slice(0, this.w.companionCapOf(inst)));
      for (const beast of beasts) this.refreshBeast(beast, inst, !active.has(beast.bondGroup ?? String(beast.id)));
    }
  }

  update(dt: number): void {
    this.refresh();
    for (const [beast, state] of this.states) {
      const owner = beast.owner!, spec = state.spec;
      if (beast.companionDormant || owner.dead || owner.downed) continue;
      if (beast.downed) {
        if (spec.reviveSeconds) {
          beast.companionReviveRemaining ??= spec.reviveSeconds;
          beast.companionReviveRemaining = Math.max(0, beast.companionReviveRemaining - dt);
          if (beast.companionReviveRemaining <= 0) this.w.reviveCompanion(beast, 1);
        } else beast.companionReviveRemaining = undefined;
        continue;
      }
      beast.companionReviveRemaining = undefined;
      // Completed instant copies need no persistent ownership entry. Retain
      // only payloads still in flight so a long-lived bond stays bounded.
      for (const issued of state.issued) if (!this.w.pendingRepeats.some(p => p.caster === beast && p.inst === issued)
        && !this.w.projectiles.some(p => p.caster === beast && p.inst === issued)
        && !this.w.pendingFuses.some(p => p.caster === beast && p.inst === issued)
        && !this.w.zones.some(z => z.caster === beast && z.inst === issued)) state.issued.delete(issued);
      if (spec.dread) {
        const dread = spec.dread;
        const nearby = this.w.enemiesOf(beast).filter(a => !a.dead && !a.untargetable && !a.passive && dist(a.pos, beast.pos) <= dread.radius);
        for (const victim of state.exposure.keys()) if (!nearby.includes(victim)) state.exposure.delete(victim);
        if (this.w.time >= state.dreadAt) {
          state.dreadAt = this.w.time + dread.interval;
          this.w.flashes.push({ pos: { ...beast.pos }, radius: dread.radius, color: '#796092', life: 0.25, maxLife: 0.25 });
          for (const victim of nearby) {
            const stacks = Math.min(dread.maxStacks, (state.exposure.get(victim) ?? 0) + 1); state.exposure.set(victim, stacks);
            const pulse = makeSkillInstance({ ...SKILLS.beast_dread_pulse, baseDamage: { chaos: [dread.damage, dread.damage] } }, beast.level);
            this.w.companionPulseHit(beast, pulse, victim, 1 + (stacks - 1) * dread.ramp);
          }
        }
      }
      if (spec.whistle && state.pulseUntil > this.w.time && this.w.time >= state.pulseAt) {
        state.pulseAt = this.w.time + spec.whistle.interval;
        const pulse = makeSkillInstance(SKILLS[spec.whistle.pulseSkill], beast.level);
        this.w.executeSkill(beast, pulse, beast.pos, { noRepeat: true, noCooldown: true });
      }
    }
  }

  /** Called after a landed top-level hit, before ordinary consumed buffs clear. */
  down(beast: Actor): void {
    const state = this.states.get(beast);
    if (state) this.clearPayloads(beast, state);
    beast.companionReviveRemaining = state?.spec.reviveSeconds;
  }

  onHit(caster: Actor, inst: SkillInstance, target: Actor): void {
    if (this.copies.has(inst) || !inst.def.tags.includes('attack')) return;
    const state = this.states.get(caster);
    if (state && !caster.downed && !caster.companionDormant) {
      const spec = state.spec;
      if (spec.attackOrb && this.w.time >= state.orbAt && Math.random() < spec.attackOrb.chance) {
        state.orbAt = this.w.time + spec.attackOrb.cooldown;
        this.w.shedOrb(spec.attackOrb.kind, target.pos);
      }
      if (spec.attackCharge && this.w.time >= state.chargeAt && Math.random() < spec.attackCharge.chance) {
        state.chargeAt = this.w.time + spec.attackCharge.cooldown;
        caster.gainCharge(spec.attackCharge.id, 1, 3);
      }
      this.partnerHit(caster, target, caster, state, [caster.owner!]);
    } else {
      const groups = new Map<SkillInstance, [Actor, BondState][]>();
      for (const [beast, s] of this.states) if (beast.owner === caster && !beast.dead && !beast.downed && !beast.companionDormant) {
        const members = groups.get(s.inst) ?? []; members.push([beast, s]); groups.set(s.inst, members);
      }
      for (const members of groups.values()) this.partnerHit(caster, target, members[0][0], members[0][1], members.map(([b]) => b));
    }
  }

  private partnerHit(caster: Actor, target: Actor, beast: Actor, state: BondState, recipients: Actor[]): void {
    const spec = state.spec, rally = spec.rally;
    if (!rally || caster.dead || caster.downed) return;
    const id = this.rallyId(beast), cap = rally.maxStacks + (spec.rallyCapAdd ?? 0);
    const stacks = caster.buffs.get(id)?.stacks ?? 0;
    caster.removeBuff(id);
    for (const recipient of recipients) if (!recipient.dead && !recipient.downed) {
      recipient.addBuff({ type: 'buff', id, label: 'Hunting Partners', duration: rally.duration, maxStacks: cap, mods: [mod('damage', 'increased', rally.damagePerStack, ['attack'])] });
      if (stacks >= cap && spec.frenzy) {
        recipient.addBuff({ type: 'buff', id: this.frenzyId(beast), label: 'Pack Crescendo', duration: spec.frenzy.duration, mods: [mod('attackSpeed', 'increased', spec.frenzy.attackSpeed)] });
        if (recipient.companion) {
          this.refreshBeast(recipient, state.inst, false);
          // THE LUNGE obeys the stance (CompanionStanceDef.lunges): a passive
          // beast keeps the crescendo's haste and its heel — only a stance
          // that lunges takes the bond-driven charge.
          if (this.lunges(recipient)) {
            recipient.aiCommand = { kind: 'assault', targetId: target.id, pos: { ...target.pos }, until: this.w.time + spec.frenzy.duration };
            const pursuit = recipient.skills.find(s => s?.def.id === spec.frenzy!.gapCloser);
            if (pursuit) this.w.useSkill(recipient, pursuit, target.pos);
          }
        }
      }
    }
  }

  onCast(owner: Actor, inst: SkillInstance, aim: Vec2): void {
    if (!companionCanMimic(inst) || this.copies.has(inst) || owner.companion) return;
    for (const [beast, state] of this.states) {
      const spec = state.spec.mimicMelee;
      if (!spec || beast.owner !== owner || beast.dead || beast.downed || beast.companionDormant || this.w.time < state.echoAt) continue;
      state.echoAt = this.w.time + spec.cooldown;
      const copy: SkillInstance = { ...inst, sockets: [...inst.sockets], grafts: inst.grafts && [...inst.grafts], treeNodes: inst.treeNodes && [...inst.treeNodes], state: undefined };
      this.copies.add(copy); state.issued.add(copy);
      this.w.pendingRepeats.push({ caster: beast, inst: copy, aim: { ...aim }, n: 1, k: 0, timer: 0.15, interval: 0.15, dmgMult: spec.power, aoeMult: 1, scaleStep: 0, retarget: false });
    }
  }

  whistle(owner: Actor, inst: SkillInstance, aim: Vec2): void {
    for (const [beast, state] of this.states) if (beast.owner === owner && (!inst.hostSkillId || state.inst.def.id === inst.hostSkillId) && !beast.downed && !beast.companionDormant && state.spec.whistle) {
      const spec = state.spec.whistle;
      state.pulseUntil = this.w.time + spec.duration; state.pulseAt = this.w.time;
      // The rally's charge toward the aim is a bond-driven order: it obeys the
      // stance's `lunges` — a passive pack is revived, healed and recalled
      // and pulses at heel; it does not charge.
      if (this.lunges(beast)) beast.aiCommand = { kind: 'assault', pos: { ...aim }, until: state.pulseUntil };
    }
  }

  /** The seat that KEEPS an owner body — by the live pointer, else by the
   *  home body (a keeper riding another body through the possession seam
   *  still holds its own stances). */
  private keeperSeat(owner: Actor) {
    return this.w.seatOf(owner) ?? this.w.seats.find(s => s.home === owner);
  }

  /** Does this beast's stance take bond-driven charges (CompanionStanceDef.lunges)? */
  private lunges(beast: Actor): boolean {
    return companionStanceDef(this.states.get(beast)?.stanceId ?? '').lunges;
  }

  /** THE SHIFT SHOWS: each living beast of the bond speaks the stance and
   *  casts the tree's stance art (CompanionBondSpec.stanceArt) at its own
   *  feet — the hook a tree node hangs on a behavioral change. Returns the
   *  beasts reached. */
  stanceShift(owner: Actor, skillId: string, stanceId: string): number {
    const st = companionStanceDef(stanceId);
    let reached = 0;
    for (const [beast, state] of this.states) {
      if (beast.owner !== owner || state.inst.def.id !== skillId
        || beast.dead || beast.downed || beast.companionDormant) continue;
      reached++;
      this.w.text(vec(beast.pos.x, beast.pos.y - 22), st.label.toLowerCase(), st.color, 11);
      const artId = state.spec.stanceArt;
      if (artId && SKILLS[artId]) {
        const art = makeSkillInstance(SKILLS[artId], Math.max(1, beast.level));
        state.issued.add(art);
        this.w.executeSkill(beast, art, beast.pos, { noRepeat: true });
      }
    }
    return reached;
  }

  saved(beast: Actor): CompanionSaved {
    return { defId: beast.defId!, level: beast.level, skillId: beast.sourceSkillId!.replace('__companion:', ''),
      ...(beast.downed ? { downed: true } : {}), ...(beast.rarity ? { rarity: beast.rarity, name: beast.name, radius: beast.radius,
        raritySources: beast.sheet.sourceNames().filter(s => s === 'rarity' || s.startsWith('rarityStack')).map(s => [s, beast.sheet.getSourceMods(s)!] as [string, import('./stats').Modifier[]]) } : {}),
      ...(beast.companionReviveRemaining !== undefined ? { reviveRemaining: beast.companionReviveRemaining } : {}) };
  }
}
