/** Exact native buffs, status transfer, resource taps and proc gates. No payload execution. */
import type {Actor} from './actor';
import type {World} from './world';
import {dist,chance,type Vec2} from '../core/math';
import {instanceMods,skillContextTags,grantedTags,instanceChargeGain,treeNodeOf,type SkillInstance,type BuffEffect,type SkillDef} from './skills';
import {gaugeAdd,gaugeShaveSec,type GaugeFeedSpec} from './gauge';
import {STATUS_DEFS,type ActiveStatus} from './status';
import {MONSTERS} from '../data/monsters';
import {VICTIM_CONDITIONS} from './victim';
import {DEFENSE_CFG} from './defense';
import {procStat,type ProcDef} from '../data/procs';
import type {Modifier,SkillTag,DamageType} from './stats';
export interface NativeSceneCombatStateHost {
 showSkillArrival:World['showSkillArrival'];
 actors:World['actors'];treeBuffSources:World['treeBuffSources'];time:number;
 grantTreeBuff(caster: Actor, target: Actor, inst: SkillInstance, fx: BuffEffect, durScale: number): void;
 tapFires(a: Actor, inst: SkillInstance, spec: GaugeFeedSpec,
    on: GaugeFeedSpec['on'], at?: Vec2, orbKind?: string, victim?: Actor): boolean;
 isEliteVictim(a: Actor): boolean;
}

export function sceneApplyBuffEffect(nativeHost:NativeSceneCombatStateHost,
    caster: Actor, inst: SkillInstance, fx: BuffEffect,
    durScale: number, useMult = 1,
  ): void {
    // THE GAUGE's stack lane (BuffEffect.powerStacks — engine/gauge.ts):
    // stacks per unit of the pressing use's gauge power, at least one
    // while any power stands. A gauge-less skill reads power 1.
    const gPow = inst.def.gauge ? (inst.state?.gaugePower ?? 1) : 1;
    const stacked = fx.powerStacks !== undefined
      ? { ...fx, stacksOnApply: Math.max(1, Math.round(fx.powerStacks * gPow)) }
      : fx;
    // POWER-SCALED (BuffEffect.powerScaled): the blessing's magnitude
    // rides the use's power — a brim release at 40% fill grants a
    // 40%-strength stride. Opt-in; ordinary buffs never wobble.
    const scaled = stacked.powerScaled && useMult !== 1
      ? { ...stacked, mods: stacked.mods.map(m => ({ ...m, value: m.value * useMult })) }
      : stacked;
    // The granting skill's tags ride the gain EVENT (addBuff's 4th arg) so
    // tag-filtered sympathy links can hear it — the flask bond drinks only
    // what carries 'flask'.
    if (fx.affects === 'allies') {
      const buffRadius = (fx.radius ?? 0) * caster.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst));
      for (const ally of nativeHost.actors) {
        if (ally.team === caster.team && !ally.dead && !ally.downed && !ally.construct
          && ally.tier === caster.tier && dist(ally.pos, caster.pos) <= buffRadius + ally.radius) {
          nativeHost.grantTreeBuff(caster, ally, inst, scaled, durScale);
        }
      }
    } else if (fx.affects === 'minions') {
      for (const m of nativeHost.actors) {
        if (m.owner === caster && !m.dead && m.isMinion() && !m.construct) {
          nativeHost.grantTreeBuff(caster, m, inst, scaled, durScale);
        }
      }
      // OFFERING SHARE (Communal Rites): a fraction of the minions'
      // blessing also dresses the officiant — same buff, scaled values.
      const tags = skillContextTags(inst, grantedTags(inst));
      const share = caster.sheet.get('offeringShare', tags, instanceMods(inst));
      if (share > 0) {
        nativeHost.grantTreeBuff(caster, caster, inst, {
          ...scaled, id: scaled.id + '_shared', affects: 'caster',
          mods: scaled.mods.map(m => ({ ...m, value: m.value * share })),
        }, durScale);
      }
    } else {
      nativeHost.grantTreeBuff(caster, caster, inst, scaled, durScale);
    }
  }

export function sceneGrantTreeBuff(nativeHost:NativeSceneCombatStateHost,caster: Actor, target: Actor, inst: SkillInstance, fx: BuffEffect, durScale: number): void {
    const followUpHost = inst.followUpHost;
    inst = inst.followUpHost ?? inst;
    if (!followUpHost && !inst.treeNodes?.some(id => treeNodeOf(inst.def, id)?.buffs?.length)) {
      target.addBuff(fx, durScale, 0, inst.def.tags);
      if (target.buffs.has(fx.id)) nativeHost.showSkillArrival(caster, inst, target.pos, target.radius + 16, target.tier, true);
      return;
    }
    const tagged = { ...fx };
    nativeHost.treeBuffSources.set(tagged, { caster, inst });
    target.addBuff(tagged, durScale, 0, [...skillContextTags(inst)]);
    if (target.buffs.has(fx.id)) nativeHost.showSkillArrival(caster, inst, target.pos, target.radius + 16, target.tier, true);
  }

export function sceneTransplantStatus(nativeHost:NativeSceneCombatStateHost,
    to: Actor, s: ActiveStatus, sourceName: string,
    o?: { strengthScale?: number; duration?: 'remaining' | 'refresh'; durationScale?: number },
  ): void {
    if (s.challengeField !== undefined) return; // Field exposure cannot become a portable lasting wound.
    const sdef = STATUS_DEFS[s.id];
    if (!sdef || to.dead) return;
    const baseDur = sdef.duration || 1;
    const durScale = (o?.durationScale ?? 1)
      * ((o?.duration ?? 'remaining') === 'remaining'
        ? Math.max(0.05, s.remaining) / baseDur : 1);
    const n = Math.max(1, s.stacks);
    for (let i = 0; i < n; i++) {
      to.applyStatus(s.id, s.dps * (o?.strengthScale ?? 1), durScale, sourceName,
        { casterId: s.casterId, rupture: s.rupture, ruptureType: s.ruptureType, ruptureRadius: s.ruptureRadius });
    }
  }

export function sceneTapCharges(nativeHost:NativeSceneCombatStateHost,a: Actor, on: NonNullable<SkillDef['chargeGain']>[number]['on'],
    at?: Vec2, orbKind?: string, victim?: Actor): void {
    for (const inst of a.skills) {
      if (!inst) continue;
      // instanceChargeGain, not def.chargeGain: SOCKETED taps (Answering
      // Steel's block-banked Riposte) merge with the skill's own — the
      // schema's promise, honored at the event taps too.
      for (const spec of instanceChargeGain(inst)) {
        if (!nativeHost.tapFires(a, inst, spec, on, at, orbKind, victim)) continue;
        a.gainCharge(spec.charge, spec.amount, spec.max, inst);
      }
      // THE GAUGE FABRIC (engine/gauge.ts): the SAME events feed a slotted
      // skill's own bank through the same filter chain — the Vaal-soul
      // shape. Two gauge arts on one bar each drink the same kill.
      const gs = inst.def.gauge;
      if (gs?.feeds) {
        for (const spec of gs.feeds) {
          if (!nativeHost.tapFires(a, inst, spec, on, at, orbKind, victim)) continue;
          const eff = a.gaugeEff(inst)!;
          // THE HASTENING (GaugeSpec.cooldownPer): while the skill's own
          // clock runs, the point hurries it instead of banking — the
          // two-phase art (shave now, grow later).
          const cd = a.cooldowns.get(inst.def.id) ?? 0;
          if (gs.cooldownPer && cd > 0) {
            a.cooldowns.set(inst.def.id, Math.max(0, cd - gaugeShaveSec(gs, eff, spec.amount)));
            continue;
          }
          gaugeAdd(inst, spec.amount, eff);
        }
      }
    }
  }

export function sceneTapFires(nativeHost:NativeSceneCombatStateHost,a: Actor, inst: SkillInstance, spec: GaugeFeedSpec,
    on: GaugeFeedSpec['on'], at?: Vec2, orbKind?: string, victim?: Actor): boolean {
    if (spec.on !== on) return false;
    if (spec.whileToggled && !a.activeAuras.has(inst.def.id)
      && !a.summonToggles.has(inst.def.id)) return false;
    if (on === 'enemyDeath' && at && dist(a.pos, at) > (spec.radius ?? 360)) return false;
    // Fount taps filter by orb kind (a Life Flask ignores mana orbs).
    if (on === 'orbPickup' && spec.orbKind && spec.orbKind !== orbKind) return false;
    // Elite-gated taps (Soul Harvest's boss lane): only a rare-or-better
    // (or def-level boss) victim feeds the bank. No victim = no bank.
    if (spec.eliteVictim && !(victim && nativeHost.isEliteVictim(victim))) return false;
    if (spec.chance !== undefined && !chance(spec.chance)) return false;
    return true;
  }

export function sceneIsEliteVictim(nativeHost:NativeSceneCombatStateHost,a: Actor): boolean {
    return a.rarity === 'rare' || a.rarity === 'champion' || a.rarity === 'crowned'
      || !!(a.defId && MONSTERS[a.defId]?.boss);
  }

export function sceneBankPools(nativeHost:NativeSceneCombatStateHost,caster: Actor, feed: { type?: DamageType; status?: string }, amount: number): void {
    if (amount <= 0) return;
    for (const inst of caster.skills) {
      const pl = inst?.def.pool;
      if (!pl) continue;
      const ratio = feed.type !== undefined
        ? pl.fromDamage?.[feed.type] ?? 0
        : pl.fromDot?.[feed.status!] ?? 0;
      if (ratio <= 0) continue;
      const cap = pl.cap * caster.sheet.get('poolCap',
        skillContextTags(inst!.def), instanceMods(inst!));
      caster.pools.set(pl.id, Math.min(cap, (caster.pools.get(pl.id) ?? 0) + amount * ratio));
    }
  }

export function sceneVictimGate(nativeHost:NativeSceneCombatStateHost,ids: readonly string[], victim: Actor, attacker: Actor): boolean {
    for (const id of ids) {
      const def = VICTIM_CONDITIONS[id];
      const holds = def
        ? def.test(victim, attacker, { time: nativeHost.time })
        : victim.statuses.some(st => st.id === id && st.stacks > 0);
      if (!holds) return false;
    }
    return true;
  }

export function sceneProcReady(nativeHost:NativeSceneCombatStateHost,owner: Actor, proc: ProcDef): boolean {
    if (!proc.icd) return true;
    if (nativeHost.time < (owner.procReadyAt.get(proc.id) ?? 0)) return false;
    owner.procReadyAt.set(proc.id, nativeHost.time + proc.icd);
    return true;
  }

export function sceneProcGates(nativeHost:NativeSceneCombatStateHost,owner: Actor, proc: ProcDef, inst: SkillInstance | null): boolean {
    if (proc.skills && (!inst || !proc.skills.includes(inst.def.id))) return false;
    // THE TALENT FABRIC's owner gates (ProcDef.when/unless/requireBuff/
    // requireStatus) and the def-level TAG LOCK (ProcDef.tags).
    if (proc.when && !owner.sheet.hasCondition(proc.when)) return false;
    if (proc.unless && owner.sheet.hasCondition(proc.unless)) return false;
    if (proc.requireBuff !== undefined) {
      const l = Array.isArray(proc.requireBuff) ? proc.requireBuff : [proc.requireBuff];
      if (!l.some(b => owner.buffs.has(b))) return false;
    }
    if (proc.requireStatus !== undefined) {
      const l = Array.isArray(proc.requireStatus) ? proc.requireStatus : [proc.requireStatus];
      if (!owner.statuses.some(st => st.stacks > 0 && l.includes(st.id))) return false;
    }
    if (proc.tags && (!inst || !proc.tags.every(t => skillContextTags(inst).has(t)))) return false;
    if (proc.oncePerCast) {
      if (owner.procFiredAt.get(proc.id) === nativeHost.time) return false;
      owner.procFiredAt.set(proc.id, nativeHost.time);
    }
    return true;
  }

export function sceneProcDepthAllowed(nativeHost:NativeSceneCombatStateHost,owner: Actor): number {
    return 1 + Math.min(DEFENSE_CFG.procs.maxExtraDepth,
      Math.floor(owner.sheet.get('procDepth')));
  }

export function sceneRollTopMet(nativeHost:NativeSceneCombatStateHost,
    owner: Actor, frac: number, rollT: number | undefined,
    tags?: Set<SkillTag>, extra?: readonly Modifier[],
  ): boolean {
    if (rollT === undefined) return false;
    const window = frac
      + owner.sheet.get('highRollWindow', tags, extra as Modifier[] | undefined);
    return rollT >= 1 - window;
  }

export function sceneProcChance(nativeHost:NativeSceneCombatStateHost,
    owner: Actor, proc: ProcDef, depth: number,
    tags?: Set<SkillTag>, extra?: readonly Modifier[],
  ): number {
    let c = owner.sheet.get(procStat(proc.id), tags, extra as Modifier[] | undefined);
    if (c <= 0) return 0;
    if (proc.ppm) {
      const mean = 60 / proc.ppm;
      const last = owner.procAttemptAt.get(proc.id);
      const dt = Math.min(mean * DEFENSE_CFG.procs.ppmCatchup,
        last === undefined ? mean : nativeHost.time - last);
      owner.procAttemptAt.set(proc.id, nativeHost.time);
      c = c * proc.ppm * dt / 60;
    }
    // LUCK: the universal proc-rate multiplier (never drop rates) — the
    // proc-build's investment lane, tag-filterable via the query context.
    c *= 1 + owner.sheet.get('luck', tags, extra as Modifier[] | undefined);
    if (depth > 0) c *= Math.pow(DEFENSE_CFG.procs.depthFalloff, depth);
    return Math.min(0.95, c);
  }
