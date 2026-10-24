/** Immutable native casting preparation original bodies, pinned independently to cbbe. */
export const nativeSceneCastingPreparationArchive={
  "commit": "cbbe4e363bb4284a28a331f5c4f00a332fdee947",
  "worldHash": "4f618300ddd19f5b89e77f85119439ad3cc36f43b82e4a5e12e6621ec16df630",
  "rows": [
    {
      "name": "paySkillCost",
      "line": 36269,
      "lines": 10,
      "hash": "b44c5ddaf891c148d0afcbb4b134746e8b9e24604d371ba03706ea97ae6ecc3f",
      "source": "private paySkillCost(caster: Actor, inst: SkillInstance, cost: { mana: number; life: number }): void {\n    const paid = {\n      mana: Math.max(0, Math.min(caster.mana, cost.mana)),\n      life: caster.overdrive.life && caster.life <= cost.life ? 0 : Math.max(0, cost.life),\n    };\n    caster.payCost(cost);\n    if (caster.construct) return; // synthetic casting pools are not resources\n    const ward = costWard(caster, inst, paid);\n    if (ward.amount > 0 && ward.duration > 0) this.grantAbsorb(caster, ward.amount, ward.duration);\n  }",
      "calls": [
        "grantAbsorb"
      ],
      "fields": []
    },
    {
      "name": "consumeChargeCost",
      "line": 28727,
      "lines": 11,
      "hash": "503e03014b3210aaa15d0b8fd776d2b7259652b28e5e3b491337c67a81830655",
      "source": "private consumeChargeCost(caster: Actor, inst: SkillInstance): { mult: number; consumed: number } {\n    const cc = instanceChargeCost(inst);\n    if (!cc) return { mult: 1, consumed: 0 };\n    const have = caster.charges.get(cc.charge) ?? 0;\n    const consumed = cc.amount === 'all' ? have : Math.min(have, cc.amount);\n    caster.spendCharge(cc.charge, consumed);\n    return {\n      mult: cc.damagePerCharge && consumed > 0 ? 1 + cc.damagePerCharge * consumed : 1,\n      consumed,\n    };\n  }",
      "calls": [],
      "fields": []
    },
    {
      "name": "refundCooldown",
      "line": 25689,
      "lines": 4,
      "hash": "49249301882d55dc9a9400970e3cc611ee3663485fdef1a2b81289c8facebf09",
      "source": "private refundCooldown(caster: Actor, skillId: string): void {\n    caster.cooldowns.delete(skillId);\n    caster.cooldownTotals.delete(skillId);\n  }",
      "calls": [],
      "fields": []
    },
    {
      "name": "consumeAmmunition",
      "line": 51313,
      "lines": 8,
      "hash": "aa07b5b817b10344d106cb23fd3e5f9901ce762f0cc43662365a2b338d2f0307",
      "source": "private consumeAmmunition(caster: Actor, def: SkillDef): void {\n    for (const [id, buff] of [...caster.buffs]) {\n      const c = (buff.def as BuffEffect).consumeOnUse;\n      if (!c) continue;\n      if (c.tags && !c.tags.some(t => def.tags.includes(t))) continue;\n      caster.consumeBuffStacks(id, 1);\n    }\n  }",
      "calls": [],
      "fields": []
    },
    {
      "name": "consumeRemnants",
      "line": 51302,
      "lines": 8,
      "hash": "a57e3fcb16dac384264f8f2f7a22fdd532786bbf2408d38e189ffbf6f725306c",
      "source": "private consumeRemnants(caster: Actor, def: SkillDef): void {\n    for (const el of ELEMENTAL_TYPES) {\n      if (def.tags.includes(el) && caster.buffs.has('remnant_' + el)) {\n        noteProcCue(caster, caster.buffs.get('remnant_' + el)!.def.storedCue, 'release', 'remnant:' + el);\n        caster.removeBuff('remnant_' + el);\n      }\n    }\n  }",
      "calls": [],
      "fields": []
    },
    {
      "name": "consumeStealth",
      "line": 33108,
      "lines": 13,
      "hash": "f96a347d5173d85465fa0b2e2cd42ab1b837fae1f8e284179d36582fb341d5b3",
      "source": "private consumeStealth(caster: Actor, def: SkillDef): void {\n    if (def.effects.some(fx => fx.type === 'gainCharge' && fx.charge === STEALTH_CHARGE)) return;\n    const offensive = def.breaksStealth\n      ?? (!!def.baseDamage || def.effects.some(fx =>\n        fx.type === 'damage' || fx.type === 'knockback' || fx.type === 'pull'));\n    if (!offensive) return;\n    caster.concealmentExposedUntil = this.time + PERCEPTION_CFG.exposureSec;\n    const have = caster.charges.get(STEALTH_CHARGE) ?? 0;\n    if (have > 0) caster.spendCharge(STEALTH_CHARGE, 1);\n    for (const [id, b] of [...caster.buffs]) {\n      if (b.def.mods.some(m => m.stat === 'invisible')) caster.removeBuff(id);\n    }\n  }",
      "calls": [],
      "fields": [
        "time"
      ]
    },
    {
      "name": "comboCursorOf",
      "line": 25555,
      "lines": 8,
      "hash": "309401b87d7421f244e18c15cc19e5482e9d04829e7982616f0332c37da84e78",
      "source": "comboCursorOf(caster: Actor, inst: SkillInstance): ComboCursor {\n    if (!caster.construct || caster.skills.includes(inst)) return (inst.state ??= {});\n    let m = this.comboCursors.get(caster);\n    if (!m) { m = new Map(); this.comboCursors.set(caster, m); }\n    let c = m.get(inst.def.id);\n    if (!c) { c = {}; m.set(inst.def.id, c); }\n    return c;\n  }",
      "calls": [],
      "fields": [
        "comboCursors"
      ]
    },
    {
      "name": "comboStepOf",
      "line": 25574,
      "lines": 19,
      "hash": "bc6a1e78b42215116f98dc385288c1aa63186c29647d37d01ea2aed9fc9337e2",
      "source": "comboStepOf(caster: Actor, inst: SkillInstance, idx: number): SkillInstance | null {\n    const chain = inst.def.comboChain;\n    if (!chain || idx <= 0 || idx > chain.skills.length) return null;\n    const sid = chain.skills[idx - 1];\n    if (sid === inst.def.id || !SKILLS[sid]) return null;\n    const key = inst.def.id + ':combo' + idx;\n    const level = inst.level + Math.floor(inst.bonusLevels ?? 0);\n    let step = caster.metaInsts.get(key);\n    if (!step || step.def.id !== sid || step.level !== level) {\n      step = makeSkillInstance(SKILLS[sid], level);\n      step.hostSkillId = inst.def.id;\n      step.chainOf = inst.def.id; // THE BEAT MARK — the ring records the host's beat\n      caster.metaInsts.set(key, step);\n    }\n    step.sockets = inst.sockets; // live references — re-socketing propagates\n    step.grafts = inst.grafts;\n    step.comboTreeMods = instanceTreeMods(inst);\n    return step;\n  }",
      "calls": [],
      "fields": []
    },
    {
      "name": "heldSkillInst",
      "line": 39579,
      "lines": 6,
      "hash": "89cd9663a02671da716bd1b82f738951a1a758bcc8b2a9ecada136022e1a3c55",
      "source": "private heldSkillInst(actor: Actor, skillId: string): SkillInstance | null {\n    for (const s of actor.skills) if (s?.def.id === skillId) return s;\n    const seat = this.seatOf(actor);\n    if (!seat) return null;\n    return seat.grantedInsts?.get(skillId) ?? seat.meta.knownSkills.get(skillId) ?? null;\n  }",
      "calls": [
        "seatOf"
      ],
      "fields": []
    },
    {
      "name": "relocationTarget",
      "line": 28681,
      "lines": 16,
      "hash": "73150858324012c6e062c4bed271f2337e7ec17d1841c14eab54adb1c4aff702",
      "source": "private relocationTarget(caster: Actor, inst: SkillInstance, radius: number): Actor | undefined {\n    const host = this.relocationHosts.get(inst);\n    if (!host || !caster.skills.includes(host) || caster.dead || caster.downed\n      || !instanceMetas(host).some(m => m.skillId === inst.def.id)) return;\n    const d = instanceDelivery(host);\n    if (d.type !== 'construct' || !['totem', 'sentry'].includes(d.kind) || !d.castSkillId) return;\n    let best: Actor | undefined, bestD = radius;\n    for (const c of this.actors) {\n      if (c.dead || c.downed || c.owner !== caster || c.summonInst !== host\n        || !c.construct || !['totem', 'sentry'].includes(c.construct.kind)\n        || !sameStory(c, caster) || c.team !== caster.team || !(c.lifespan! > 0)) continue;\n      const dd = dist(caster.pos, c.pos);\n      if (dd <= bestD && (!best || dd < bestD)) { best = c; bestD = dd; }\n    }\n    return best;\n  }",
      "calls": [],
      "fields": [
        "relocationHosts",
        "actors"
      ]
    },
    {
      "name": "mintMetaInstance",
      "line": 28660,
      "lines": 16,
      "hash": "d79ca69a3539bd93e9cf1b6dcc4fa0ef568f88a2fede453e798ca060360942d2",
      "source": "private mintMetaInstance(caster: Actor, host: SkillInstance, skillId: string): SkillInstance {\n    const key = host.def.id + ':' + skillId;\n    let inst = caster.metaInsts.get(key);\n    const relocateConstruct = SKILLS[skillId].effects.some(fx => fx.type === 'relocateConstruct');\n    if (!inst || inst.level !== effectiveSkillLevel(host)\n      || (relocateConstruct && this.relocationHosts.get(inst) !== host)) {\n      inst = makeSkillInstance(SKILLS[skillId], effectiveSkillLevel(host));\n      // minionCombat: a command's meta inherits its whole-court scope.\n      // Summon-hosted meta payloads still name their own roster anchor.\n      inst.hostSkillId = host.def.effects.some(e => e.type === 'commandMinions')\n        ? undefined : host.def.id;\n      caster.metaInsts.set(key, inst);\n      if (relocateConstruct) this.relocationHosts.set(inst, host);\n    }\n    return inst;\n  }",
      "calls": [],
      "fields": [
        "relocationHosts"
      ]
    }
  ],
  "stateDeclarations": [
    "private comboCursors = new WeakMap<Actor, Map<string, ComboCursor>>();",
    "private relocationHosts = new WeakMap<SkillInstance, SkillInstance>();"
  ],
  "cursorType": "type ComboCursor = { comboIdx?: number; comboAt?: number; comboSelf?: number };",
  "constants": [
    "const STEALTH_CHARGE = 'stealth';"
  ]
} as const;
export const nativeSceneCastingPreparationArchiveHash="b40766b4b813c7a2164b4ac7fed766c3fcbc72208c16b3703ef02ee547df4636";
