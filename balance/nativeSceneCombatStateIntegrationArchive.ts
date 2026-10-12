/** Exact phase34 World adapter reversals. Native algorithm archive remains separate. */
export const nativeSceneCombatStateIntegrationArchive={
  "originalCommit": "38decfcbfee40e95288c608a8e86a72605abd8ea",
  "integrationCommit": "de2693cc115b775fee6971dad83b0aca64067c70",
  "integrationStatus": "immutable restoration checkpoint",
  "sourceHash": "8b0a2573d5c6d89f2fb80f0f2aebf8ac8ce6b4d2a067e05637a6604750f441e8",
  "afterHash": "dd82506bb4b8cd66fee49b7dbb3e410cc96a678662eb1a17acd4877d75b87dbd",
  "integration": [
    {
      "name": "new-import",
      "before": "",
      "after": "import {sceneApplyBuffEffect,sceneGrantTreeBuff,sceneTransplantStatus,sceneTapCharges,sceneTapFires,sceneIsEliteVictim,sceneBankPools,sceneVictimGate,sceneProcReady,sceneProcGates,sceneProcDepthAllowed,sceneRollTopMet,sceneProcChance,type NativeSceneCombatStateHost} from './nativeSceneCombatState';\n"
    },
    {
      "name": "cached-live-host",
      "before": "",
      "after": "declare private nativeSceneCombatStateView?:NativeSceneCombatStateHost;\n  private nativeSceneCombatStateHost():NativeSceneCombatStateHost {\n    if(this.nativeSceneCombatStateView)return this.nativeSceneCombatStateView;\n    const world=this,host:NativeSceneCombatStateHost={\n      get actors(){return world.actors;},\n      get treeBuffSources(){return world.treeBuffSources;},\n      get time(){return world.time;},\n      get grantTreeBuff(){const fn=world.grantTreeBuff;return(...args:Parameters<NativeSceneCombatStateHost['grantTreeBuff']>)=>fn.apply(world,args);},\n      get tapFires(){const fn=world.tapFires;return(...args:Parameters<NativeSceneCombatStateHost['tapFires']>)=>fn.apply(world,args);},\n      get isEliteVictim(){const fn=world.isEliteVictim;return(...args:Parameters<NativeSceneCombatStateHost['isEliteVictim']>)=>fn.apply(world,args);},\n    };\n    Object.defineProperty(this,'nativeSceneCombatStateView',{value:host,writable:true,configurable:true,enumerable:false});\n    return host;\n  }\n\n  "
    },
    {
      "name": "delegate:applyBuffEffect",
      "before": "private applyBuffEffect(\n    caster: Actor, inst: SkillInstance, fx: BuffEffect,\n    durScale: number, useMult = 1,\n  ): void {\n    // THE GAUGE's stack lane (BuffEffect.powerStacks — engine/gauge.ts):\n    // stacks per unit of the pressing use's gauge power, at least one\n    // while any power stands. A gauge-less skill reads power 1.\n    const gPow = inst.def.gauge ? (inst.state?.gaugePower ?? 1) : 1;\n    const stacked = fx.powerStacks !== undefined\n      ? { ...fx, stacksOnApply: Math.max(1, Math.round(fx.powerStacks * gPow)) }\n      : fx;\n    // POWER-SCALED (BuffEffect.powerScaled): the blessing's magnitude\n    // rides the use's power — a brim release at 40% fill grants a\n    // 40%-strength stride. Opt-in; ordinary buffs never wobble.\n    const scaled = stacked.powerScaled && useMult !== 1\n      ? { ...stacked, mods: stacked.mods.map(m => ({ ...m, value: m.value * useMult })) }\n      : stacked;\n    // The granting skill's tags ride the gain EVENT (addBuff's 4th arg) so\n    // tag-filtered sympathy links can hear it — the flask bond drinks only\n    // what carries 'flask'.\n    if (fx.affects === 'allies') {\n      const buffRadius = (fx.radius ?? 0) * caster.sheet.get('aoeRadius', skillContextTags(inst), instanceMods(inst));\n      for (const ally of this.actors) {\n        if (ally.team === caster.team && !ally.dead && !ally.downed && !ally.construct\n          && ally.tier === caster.tier && dist(ally.pos, caster.pos) <= buffRadius + ally.radius) {\n          this.grantTreeBuff(caster, ally, inst, scaled, durScale);\n        }\n      }\n    } else if (fx.affects === 'minions') {\n      for (const m of this.actors) {\n        if (m.owner === caster && !m.dead && m.isMinion() && !m.construct) {\n          this.grantTreeBuff(caster, m, inst, scaled, durScale);\n        }\n      }\n      // OFFERING SHARE (Communal Rites): a fraction of the minions'\n      // blessing also dresses the officiant — same buff, scaled values.\n      const tags = skillContextTags(inst, grantedTags(inst));\n      const share = caster.sheet.get('offeringShare', tags, instanceMods(inst));\n      if (share > 0) {\n        this.grantTreeBuff(caster, caster, inst, {\n          ...scaled, id: scaled.id + '_shared', affects: 'caster',\n          mods: scaled.mods.map(m => ({ ...m, value: m.value * share })),\n        }, durScale);\n      }\n    } else {\n      this.grantTreeBuff(caster, caster, inst, scaled, durScale);\n    }\n  }",
      "after": "private applyBuffEffect(\n    caster: Actor, inst: SkillInstance, fx: BuffEffect,\n    durScale: number, useMult = 1,\n  ): void { return sceneApplyBuffEffect(this.nativeSceneCombatStateHost(),caster,inst,fx,durScale,useMult); }"
    },
    {
      "name": "delegate:grantTreeBuff",
      "before": "private grantTreeBuff(caster: Actor, target: Actor, inst: SkillInstance, fx: BuffEffect, durScale: number): void {\n    const followUpHost = inst.followUpHost;\n    inst = inst.followUpHost ?? inst;\n    if (!followUpHost && !inst.treeNodes?.some(id => treeNodeOf(inst.def, id)?.buffs?.length)) {\n      target.addBuff(fx, durScale, 0, inst.def.tags);\n      return;\n    }\n    const tagged = { ...fx };\n    this.treeBuffSources.set(tagged, { caster, inst });\n    target.addBuff(tagged, durScale, 0, [...skillContextTags(inst)]);\n  }",
      "after": "private grantTreeBuff(caster: Actor, target: Actor, inst: SkillInstance, fx: BuffEffect, durScale: number): void { return sceneGrantTreeBuff(this.nativeSceneCombatStateHost(),caster,target,inst,fx,durScale); }"
    },
    {
      "name": "delegate:transplantStatus",
      "before": "private transplantStatus(\n    to: Actor, s: ActiveStatus, sourceName: string,\n    o?: { strengthScale?: number; duration?: 'remaining' | 'refresh'; durationScale?: number },\n  ): void {\n    if (s.challengeField !== undefined) return; // Field exposure cannot become a portable lasting wound.\n    const sdef = STATUS_DEFS[s.id];\n    if (!sdef || to.dead) return;\n    const baseDur = sdef.duration || 1;\n    const durScale = (o?.durationScale ?? 1)\n      * ((o?.duration ?? 'remaining') === 'remaining'\n        ? Math.max(0.05, s.remaining) / baseDur : 1);\n    const n = Math.max(1, s.stacks);\n    for (let i = 0; i < n; i++) {\n      to.applyStatus(s.id, s.dps * (o?.strengthScale ?? 1), durScale, sourceName,\n        { casterId: s.casterId, rupture: s.rupture, ruptureType: s.ruptureType, ruptureRadius: s.ruptureRadius });\n    }\n  }",
      "after": "private transplantStatus(\n    to: Actor, s: ActiveStatus, sourceName: string,\n    o?: { strengthScale?: number; duration?: 'remaining' | 'refresh'; durationScale?: number },\n  ): void { return sceneTransplantStatus(this.nativeSceneCombatStateHost(),to,s,sourceName,o); }"
    },
    {
      "name": "delegate:tapCharges",
      "before": "private tapCharges(a: Actor, on: NonNullable<SkillDef['chargeGain']>[number]['on'],\n    at?: Vec2, orbKind?: string, victim?: Actor): void {\n    for (const inst of a.skills) {\n      if (!inst) continue;\n      // instanceChargeGain, not def.chargeGain: SOCKETED taps (Answering\n      // Steel's block-banked Riposte) merge with the skill's own — the\n      // schema's promise, honored at the event taps too.\n      for (const spec of instanceChargeGain(inst)) {\n        if (!this.tapFires(a, inst, spec, on, at, orbKind, victim)) continue;\n        a.gainCharge(spec.charge, spec.amount, spec.max, inst);\n      }\n      // THE GAUGE FABRIC (engine/gauge.ts): the SAME events feed a slotted\n      // skill's own bank through the same filter chain — the Vaal-soul\n      // shape. Two gauge arts on one bar each drink the same kill.\n      const gs = inst.def.gauge;\n      if (gs?.feeds) {\n        for (const spec of gs.feeds) {\n          if (!this.tapFires(a, inst, spec, on, at, orbKind, victim)) continue;\n          const eff = a.gaugeEff(inst)!;\n          // THE HASTENING (GaugeSpec.cooldownPer): while the skill's own\n          // clock runs, the point hurries it instead of banking — the\n          // two-phase art (shave now, grow later).\n          const cd = a.cooldowns.get(inst.def.id) ?? 0;\n          if (gs.cooldownPer && cd > 0) {\n            a.cooldowns.set(inst.def.id, Math.max(0, cd - gaugeShaveSec(gs, eff, spec.amount)));\n            continue;\n          }\n          gaugeAdd(inst, spec.amount, eff);\n        }\n      }\n    }\n  }",
      "after": "private tapCharges(a: Actor, on: NonNullable<SkillDef['chargeGain']>[number]['on'],\n    at?: Vec2, orbKind?: string, victim?: Actor): void { return sceneTapCharges(this.nativeSceneCombatStateHost(),a,on,at,orbKind,victim); }"
    },
    {
      "name": "delegate:tapFires",
      "before": "private tapFires(a: Actor, inst: SkillInstance, spec: GaugeFeedSpec,\n    on: GaugeFeedSpec['on'], at?: Vec2, orbKind?: string, victim?: Actor): boolean {\n    if (spec.on !== on) return false;\n    if (spec.whileToggled && !a.activeAuras.has(inst.def.id)\n      && !a.summonToggles.has(inst.def.id)) return false;\n    if (on === 'enemyDeath' && at && dist(a.pos, at) > (spec.radius ?? 360)) return false;\n    // Fount taps filter by orb kind (a Life Flask ignores mana orbs).\n    if (on === 'orbPickup' && spec.orbKind && spec.orbKind !== orbKind) return false;\n    // Elite-gated taps (Soul Harvest's boss lane): only a rare-or-better\n    // (or def-level boss) victim feeds the bank. No victim = no bank.\n    if (spec.eliteVictim && !(victim && this.isEliteVictim(victim))) return false;\n    if (spec.chance !== undefined && !chance(spec.chance)) return false;\n    return true;\n  }",
      "after": "private tapFires(a: Actor, inst: SkillInstance, spec: GaugeFeedSpec,\n    on: GaugeFeedSpec['on'], at?: Vec2, orbKind?: string, victim?: Actor): boolean { return sceneTapFires(this.nativeSceneCombatStateHost(),a,inst,spec,on,at,orbKind,victim); }"
    },
    {
      "name": "delegate:isEliteVictim",
      "before": "private isEliteVictim(a: Actor): boolean {\n    return a.rarity === 'rare' || a.rarity === 'champion' || a.rarity === 'crowned'\n      || !!(a.defId && MONSTERS[a.defId]?.boss);\n  }",
      "after": "private isEliteVictim(a: Actor): boolean { return sceneIsEliteVictim(this.nativeSceneCombatStateHost(),a); }"
    },
    {
      "name": "delegate:bankPools",
      "before": "private bankPools(caster: Actor, feed: { type?: DamageType; status?: string }, amount: number): void {\n    if (amount <= 0) return;\n    for (const inst of caster.skills) {\n      const pl = inst?.def.pool;\n      if (!pl) continue;\n      const ratio = feed.type !== undefined\n        ? pl.fromDamage?.[feed.type] ?? 0\n        : pl.fromDot?.[feed.status!] ?? 0;\n      if (ratio <= 0) continue;\n      const cap = pl.cap * caster.sheet.get('poolCap',\n        skillContextTags(inst!.def), instanceMods(inst!));\n      caster.pools.set(pl.id, Math.min(cap, (caster.pools.get(pl.id) ?? 0) + amount * ratio));\n    }\n  }",
      "after": "private bankPools(caster: Actor, feed: { type?: DamageType; status?: string }, amount: number): void { return sceneBankPools(this.nativeSceneCombatStateHost(),caster,feed,amount); }"
    },
    {
      "name": "delegate:victimGate",
      "before": "private victimGate(ids: readonly string[], victim: Actor, attacker: Actor): boolean {\n    for (const id of ids) {\n      const def = VICTIM_CONDITIONS[id];\n      const holds = def\n        ? def.test(victim, attacker, { time: this.time })\n        : victim.statuses.some(st => st.id === id && st.stacks > 0);\n      if (!holds) return false;\n    }\n    return true;\n  }",
      "after": "private victimGate(ids: readonly string[], victim: Actor, attacker: Actor): boolean { return sceneVictimGate(this.nativeSceneCombatStateHost(),ids,victim,attacker); }"
    },
    {
      "name": "delegate:procReady",
      "before": "private procReady(owner: Actor, proc: ProcDef): boolean {\n    if (!proc.icd) return true;\n    if (this.time < (owner.procReadyAt.get(proc.id) ?? 0)) return false;\n    owner.procReadyAt.set(proc.id, this.time + proc.icd);\n    return true;\n  }",
      "after": "private procReady(owner: Actor, proc: ProcDef): boolean { return sceneProcReady(this.nativeSceneCombatStateHost(),owner,proc); }"
    },
    {
      "name": "delegate:procGates",
      "before": "private procGates(owner: Actor, proc: ProcDef, inst: SkillInstance | null): boolean {\n    if (proc.skills && (!inst || !proc.skills.includes(inst.def.id))) return false;\n    // THE TALENT FABRIC's owner gates (ProcDef.when/unless/requireBuff/\n    // requireStatus) and the def-level TAG LOCK (ProcDef.tags).\n    if (proc.when && !owner.sheet.hasCondition(proc.when)) return false;\n    if (proc.unless && owner.sheet.hasCondition(proc.unless)) return false;\n    if (proc.requireBuff !== undefined) {\n      const l = Array.isArray(proc.requireBuff) ? proc.requireBuff : [proc.requireBuff];\n      if (!l.some(b => owner.buffs.has(b))) return false;\n    }\n    if (proc.requireStatus !== undefined) {\n      const l = Array.isArray(proc.requireStatus) ? proc.requireStatus : [proc.requireStatus];\n      if (!owner.statuses.some(st => st.stacks > 0 && l.includes(st.id))) return false;\n    }\n    if (proc.tags && (!inst || !proc.tags.every(t => skillContextTags(inst).has(t)))) return false;\n    if (proc.oncePerCast) {\n      if (owner.procFiredAt.get(proc.id) === this.time) return false;\n      owner.procFiredAt.set(proc.id, this.time);\n    }\n    return true;\n  }",
      "after": "private procGates(owner: Actor, proc: ProcDef, inst: SkillInstance | null): boolean { return sceneProcGates(this.nativeSceneCombatStateHost(),owner,proc,inst); }"
    },
    {
      "name": "delegate:procDepthAllowed",
      "before": "private procDepthAllowed(owner: Actor): number {\n    return 1 + Math.min(DEFENSE_CFG.procs.maxExtraDepth,\n      Math.floor(owner.sheet.get('procDepth')));\n  }",
      "after": "private procDepthAllowed(owner: Actor): number { return sceneProcDepthAllowed(this.nativeSceneCombatStateHost(),owner); }"
    },
    {
      "name": "delegate:rollTopMet",
      "before": "private rollTopMet(\n    owner: Actor, frac: number, rollT: number | undefined,\n    tags?: Set<SkillTag>, extra?: readonly Modifier[],\n  ): boolean {\n    if (rollT === undefined) return false;\n    const window = frac\n      + owner.sheet.get('highRollWindow', tags, extra as Modifier[] | undefined);\n    return rollT >= 1 - window;\n  }",
      "after": "private rollTopMet(\n    owner: Actor, frac: number, rollT: number | undefined,\n    tags?: Set<SkillTag>, extra?: readonly Modifier[],\n  ): boolean { return sceneRollTopMet(this.nativeSceneCombatStateHost(),owner,frac,rollT,tags,extra); }"
    },
    {
      "name": "delegate:procChance",
      "before": "private procChance(\n    owner: Actor, proc: ProcDef, depth: number,\n    tags?: Set<SkillTag>, extra?: readonly Modifier[],\n  ): number {\n    let c = owner.sheet.get(procStat(proc.id), tags, extra as Modifier[] | undefined);\n    if (c <= 0) return 0;\n    if (proc.ppm) {\n      const mean = 60 / proc.ppm;\n      const last = owner.procAttemptAt.get(proc.id);\n      const dt = Math.min(mean * DEFENSE_CFG.procs.ppmCatchup,\n        last === undefined ? mean : this.time - last);\n      owner.procAttemptAt.set(proc.id, this.time);\n      c = c * proc.ppm * dt / 60;\n    }\n    // LUCK: the universal proc-rate multiplier (never drop rates) — the\n    // proc-build's investment lane, tag-filterable via the query context.\n    c *= 1 + owner.sheet.get('luck', tags, extra as Modifier[] | undefined);\n    if (depth > 0) c *= Math.pow(DEFENSE_CFG.procs.depthFalloff, depth);\n    return Math.min(0.95, c);\n  }",
      "after": "private procChance(\n    owner: Actor, proc: ProcDef, depth: number,\n    tags?: Set<SkillTag>, extra?: readonly Modifier[],\n  ): number { return sceneProcChance(this.nativeSceneCombatStateHost(),owner,proc,depth,tags,extra); }"
    },
    {
      "name": "unused-import:gaugeAdd+gaugeShaveSec",
      "before": "import { gaugeAdd, gaugeShaveSec, gaugeSpend, type GaugeFeedSpec } from './gauge';",
      "after": "import { gaugeSpend, type GaugeFeedSpec } from './gauge';"
    },
    {
      "name": "unused-import:procStat",
      "before": "import { PROC_LIST, PROCS, procStat, procPowerStat, scaleProcEffect, PROC_RIDER_LIST, procRiderStat, type ProcCastSpec, type ProcDef } from '../data/procs';",
      "after": "import { PROC_LIST, PROCS, procPowerStat, scaleProcEffect, PROC_RIDER_LIST, procRiderStat, type ProcCastSpec, type ProcDef } from '../data/procs';"
    },
    {
      "name": "unused-import:VICTIM_CONDITIONS",
      "before": "import { VICTIM_CONDITIONS, VICTIM_HOOKS, victimScopeArmed, victimTags } from './victim';",
      "after": "import { VICTIM_HOOKS, victimScopeArmed, victimTags } from './victim';"
    }
  ]
} as const;
export const nativeSceneCombatStateIntegrationArchiveHash="0ab32373e2f645251ec3cd9464ca0eec4e7d9c3fb222c505094fb0b2729102f4";
