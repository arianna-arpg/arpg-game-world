/** Exact casting preparation World integration over committed combat state and progression storage. */
export const nativeSceneCastingPreparationIntegrationArchive={
  "integrationCommit": "99b5e14dee9b0f32837335fb72ace6b5dce64b6c",
  "sourceHash": "dd82506bb4b8cd66fee49b7dbb3e410cc96a678662eb1a17acd4877d75b87dbd",
  "afterHash": "11e8c018f2d7f0fe3b964f3819c7b8b2dbb6997ad5ae9a13048dae0a36f8aff1",
  "originalArchiveHash": "b40766b4b813c7a2164b4ac7fed766c3fcbc72208c16b3703ef02ee547df4636",
  "standaloneManifestHash": "1f5ddee0b4cb2fd2f039da2872b5bea05536f0b801b9d8ee956606f54e52724c",
  "integration": [
    {
      "name": "casting preparation import",
      "before": "",
      "after": "import {scenePaySkillCost,sceneConsumeChargeCost,sceneRefundCooldown,sceneConsumeAmmunition,sceneConsumeRemnants,sceneConsumeStealth,sceneComboCursorOf,sceneComboStepOf,sceneHeldSkillInst,sceneRelocationTarget,sceneMintMetaInstance,type NativeSceneCastingPreparationHost,type ComboCursor} from './nativeSceneCastingPreparation';\n"
    },
    {
      "name": "shared combo cursor type",
      "before": "type ComboCursor = { comboIdx?: number; comboAt?: number; comboSelf?: number };\n\ninterface Flash {\n",
      "after": "\ninterface Flash {\n"
    },
    {
      "name": "core-only stealth constant",
      "before": "const STEALTH_CHARGE = 'stealth';\n\n/** Is the actor operating unseen — stealth charges banked or invisible? */\n",
      "after": "\n/** Is the actor operating unseen — stealth charges banked or invisible? */\n"
    },
    {
      "name": "unused costWard import",
      "before": "import { costWard } from './costward';\nimport { summonKitIds } from './skills';\n",
      "after": "import { summonKitIds } from './skills';\n"
    },
    {
      "name": "unused instanceTreeMods import",
      "before": "import { instanceCastCycle, instanceTreeMods, instanceTreeOver } from './skills';",
      "after": "import { instanceCastCycle, instanceTreeOver } from './skills';"
    },
    {
      "name": "paySkillCost",
      "before": "private paySkillCost(caster: Actor, inst: SkillInstance, cost: { mana: number; life: number }): void {\n    const paid = {\n      mana: Math.max(0, Math.min(caster.mana, cost.mana)),\n      life: caster.overdrive.life && caster.life <= cost.life ? 0 : Math.max(0, cost.life),\n    };\n    caster.payCost(cost);\n    if (caster.construct) return; // synthetic casting pools are not resources\n    const ward = costWard(caster, inst, paid);\n    if (ward.amount > 0 && ward.duration > 0) this.grantAbsorb(caster, ward.amount, ward.duration);\n  }",
      "after": "declare private nativeSceneCastingPreparationView?:NativeSceneCastingPreparationHost;\n  private nativeSceneCastingPreparationHost():NativeSceneCastingPreparationHost {\n    if(this.nativeSceneCastingPreparationView)return this.nativeSceneCastingPreparationView;\n    const world=this,host:NativeSceneCastingPreparationHost=Object.freeze({\n      get actors(){return world.actors;},\n      get time(){return world.time;},\n      get comboCursors(){return world.comboCursors;},\n      get relocationHosts(){return world.relocationHosts;},\n      get grantAbsorb(){const fn=world.grantAbsorb;return(...args:Parameters<NativeSceneCastingPreparationHost['grantAbsorb']>)=>Reflect.apply(fn,world,args);},\n      get seatOf(){const fn=world.seatOf;return(...args:Parameters<NativeSceneCastingPreparationHost['seatOf']>)=>Reflect.apply(fn,world,args);},\n    });\n    Object.defineProperty(this,'nativeSceneCastingPreparationView',{value:host,writable:true,configurable:true,enumerable:false});\n    return host;\n  }\n\n  private paySkillCost(caster: Actor, inst: SkillInstance, cost: { mana: number; life: number }): void { return scenePaySkillCost(this.nativeSceneCastingPreparationHost(),caster,inst,cost); }"
    },
    {
      "name": "consumeChargeCost",
      "before": "private consumeChargeCost(caster: Actor, inst: SkillInstance): { mult: number; consumed: number } {\n    const cc = instanceChargeCost(inst);\n    if (!cc) return { mult: 1, consumed: 0 };\n    const have = caster.charges.get(cc.charge) ?? 0;\n    const consumed = cc.amount === 'all' ? have : Math.min(have, cc.amount);\n    caster.spendCharge(cc.charge, consumed);\n    return {\n      mult: cc.damagePerCharge && consumed > 0 ? 1 + cc.damagePerCharge * consumed : 1,\n      consumed,\n    };\n  }",
      "after": "private consumeChargeCost(caster: Actor, inst: SkillInstance): { mult: number; consumed: number } { return sceneConsumeChargeCost(this.nativeSceneCastingPreparationHost(),caster,inst); }"
    },
    {
      "name": "refundCooldown",
      "before": "private refundCooldown(caster: Actor, skillId: string): void {\n    caster.cooldowns.delete(skillId);\n    caster.cooldownTotals.delete(skillId);\n  }",
      "after": "private refundCooldown(caster: Actor, skillId: string): void { return sceneRefundCooldown(this.nativeSceneCastingPreparationHost(),caster,skillId); }"
    },
    {
      "name": "consumeAmmunition",
      "before": "private consumeAmmunition(caster: Actor, def: SkillDef): void {\n    for (const [id, buff] of [...caster.buffs]) {\n      const c = (buff.def as BuffEffect).consumeOnUse;\n      if (!c) continue;\n      if (c.tags && !c.tags.some(t => def.tags.includes(t))) continue;\n      caster.consumeBuffStacks(id, 1);\n    }\n  }",
      "after": "private consumeAmmunition(caster: Actor, def: SkillDef): void { return sceneConsumeAmmunition(this.nativeSceneCastingPreparationHost(),caster,def); }"
    },
    {
      "name": "consumeRemnants",
      "before": "private consumeRemnants(caster: Actor, def: SkillDef): void {\n    for (const el of ELEMENTAL_TYPES) {\n      if (def.tags.includes(el) && caster.buffs.has('remnant_' + el)) {\n        noteProcCue(caster, caster.buffs.get('remnant_' + el)!.def.storedCue, 'release', 'remnant:' + el);\n        caster.removeBuff('remnant_' + el);\n      }\n    }\n  }",
      "after": "private consumeRemnants(caster: Actor, def: SkillDef): void { return sceneConsumeRemnants(this.nativeSceneCastingPreparationHost(),caster,def); }"
    },
    {
      "name": "consumeStealth",
      "before": "private consumeStealth(caster: Actor, def: SkillDef): void {\n    if (def.effects.some(fx => fx.type === 'gainCharge' && fx.charge === STEALTH_CHARGE)) return;\n    const offensive = def.breaksStealth\n      ?? (!!def.baseDamage || def.effects.some(fx =>\n        fx.type === 'damage' || fx.type === 'knockback' || fx.type === 'pull'));\n    if (!offensive) return;\n    caster.concealmentExposedUntil = this.time + PERCEPTION_CFG.exposureSec;\n    const have = caster.charges.get(STEALTH_CHARGE) ?? 0;\n    if (have > 0) caster.spendCharge(STEALTH_CHARGE, 1);\n    for (const [id, b] of [...caster.buffs]) {\n      if (b.def.mods.some(m => m.stat === 'invisible')) caster.removeBuff(id);\n    }\n  }",
      "after": "private consumeStealth(caster: Actor, def: SkillDef): void { return sceneConsumeStealth(this.nativeSceneCastingPreparationHost(),caster,def); }"
    },
    {
      "name": "comboCursorOf",
      "before": "comboCursorOf(caster: Actor, inst: SkillInstance): ComboCursor {\n    if (!caster.construct || caster.skills.includes(inst)) return (inst.state ??= {});\n    let m = this.comboCursors.get(caster);\n    if (!m) { m = new Map(); this.comboCursors.set(caster, m); }\n    let c = m.get(inst.def.id);\n    if (!c) { c = {}; m.set(inst.def.id, c); }\n    return c;\n  }",
      "after": "comboCursorOf(caster: Actor, inst: SkillInstance): ComboCursor { return sceneComboCursorOf(this.nativeSceneCastingPreparationHost(),caster,inst); }"
    },
    {
      "name": "comboStepOf",
      "before": "comboStepOf(caster: Actor, inst: SkillInstance, idx: number): SkillInstance | null {\n    const chain = inst.def.comboChain;\n    if (!chain || idx <= 0 || idx > chain.skills.length) return null;\n    const sid = chain.skills[idx - 1];\n    if (sid === inst.def.id || !SKILLS[sid]) return null;\n    const key = inst.def.id + ':combo' + idx;\n    const level = inst.level + Math.floor(inst.bonusLevels ?? 0);\n    let step = caster.metaInsts.get(key);\n    if (!step || step.def.id !== sid || step.level !== level) {\n      step = makeSkillInstance(SKILLS[sid], level);\n      step.hostSkillId = inst.def.id;\n      step.chainOf = inst.def.id; // THE BEAT MARK — the ring records the host's beat\n      caster.metaInsts.set(key, step);\n    }\n    step.sockets = inst.sockets; // live references — re-socketing propagates\n    step.grafts = inst.grafts;\n    step.comboTreeMods = instanceTreeMods(inst);\n    return step;\n  }",
      "after": "comboStepOf(caster: Actor, inst: SkillInstance, idx: number): SkillInstance | null { return sceneComboStepOf(this.nativeSceneCastingPreparationHost(),caster,inst,idx); }"
    },
    {
      "name": "heldSkillInst",
      "before": "private heldSkillInst(actor: Actor, skillId: string): SkillInstance | null {\n    for (const s of actor.skills) if (s?.def.id === skillId) return s;\n    const seat = this.seatOf(actor);\n    if (!seat) return null;\n    return seat.grantedInsts?.get(skillId) ?? seat.meta.knownSkills.get(skillId) ?? null;\n  }",
      "after": "private heldSkillInst(actor: Actor, skillId: string): SkillInstance | null { return sceneHeldSkillInst(this.nativeSceneCastingPreparationHost(),actor,skillId); }"
    },
    {
      "name": "relocationTarget",
      "before": "private relocationTarget(caster: Actor, inst: SkillInstance, radius: number): Actor | undefined {\n    const host = this.relocationHosts.get(inst);\n    if (!host || !caster.skills.includes(host) || caster.dead || caster.downed\n      || !instanceMetas(host).some(m => m.skillId === inst.def.id)) return;\n    const d = instanceDelivery(host);\n    if (d.type !== 'construct' || !['totem', 'sentry'].includes(d.kind) || !d.castSkillId) return;\n    let best: Actor | undefined, bestD = radius;\n    for (const c of this.actors) {\n      if (c.dead || c.downed || c.owner !== caster || c.summonInst !== host\n        || !c.construct || !['totem', 'sentry'].includes(c.construct.kind)\n        || !sameStory(c, caster) || c.team !== caster.team || !(c.lifespan! > 0)) continue;\n      const dd = dist(caster.pos, c.pos);\n      if (dd <= bestD && (!best || dd < bestD)) { best = c; bestD = dd; }\n    }\n    return best;\n  }",
      "after": "private relocationTarget(caster: Actor, inst: SkillInstance, radius: number): Actor | undefined { return sceneRelocationTarget(this.nativeSceneCastingPreparationHost(),caster,inst,radius); }"
    },
    {
      "name": "mintMetaInstance",
      "before": "private mintMetaInstance(caster: Actor, host: SkillInstance, skillId: string): SkillInstance {\n    const key = host.def.id + ':' + skillId;\n    let inst = caster.metaInsts.get(key);\n    const relocateConstruct = SKILLS[skillId].effects.some(fx => fx.type === 'relocateConstruct');\n    if (!inst || inst.level !== effectiveSkillLevel(host)\n      || (relocateConstruct && this.relocationHosts.get(inst) !== host)) {\n      inst = makeSkillInstance(SKILLS[skillId], effectiveSkillLevel(host));\n      // minionCombat: a command's meta inherits its whole-court scope.\n      // Summon-hosted meta payloads still name their own roster anchor.\n      inst.hostSkillId = host.def.effects.some(e => e.type === 'commandMinions')\n        ? undefined : host.def.id;\n      caster.metaInsts.set(key, inst);\n      if (relocateConstruct) this.relocationHosts.set(inst, host);\n    }\n    return inst;\n  }",
      "after": "private mintMetaInstance(caster: Actor, host: SkillInstance, skillId: string): SkillInstance { return sceneMintMetaInstance(this.nativeSceneCastingPreparationHost(),caster,host,skillId); }"
    }
  ]
} as const;
export const nativeSceneCastingPreparationIntegrationArchiveHash="64a878f0b4687ed2c17c26c969a342caf2fa0b7e8559d16638fc6975e0a29fe2";
