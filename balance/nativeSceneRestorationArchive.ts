/** Exact eleven native restoration methods pinned independently to immutable Git4949. */
export const nativeSceneRestorationArchive={
  "commit": "4949cef50dfc77eb80e47107b758761ab734e1f6",
  "worldHash": "19d353d8c5b0d7934b7b8b0e13989f4b2c21ab7af4dd244088525e1754371d1e",
  "rows": [
    {
      "name": "grantAbsorb",
      "line": 36474,
      "source": "private grantAbsorb(target: Actor, amount: number, duration: number): void {\n    target.absorb = Math.max(target.absorb, amount);\n    target.absorbTimer = Math.max(target.absorbTimer, duration);\n    this.flashes.push({\n      pos: vec(target.pos.x, target.pos.y), radius: target.radius + 8,\n      color: '#d8e8f8', life: 0.25, maxLife: 0.25,\n    });\n  }",
      "sha256": "911abac36c8706742af794ba920e1823d19de9f83d2a841aa7c3aa7c77e1ed58",
      "lines": 8,
      "calls": [],
      "fields": [
        "flashes"
      ]
    },
    {
      "name": "applyRestore",
      "line": 36502,
      "source": "private applyRestore(\n    target: Actor,\n    fx: { resource: 'life' | 'mana' | 'es' | 'poise'; amount: number; resetEsDelay?: boolean },\n    opts?: { noEvent?: boolean; tags?: SkillTag[] },\n  ): number {\n    let landed = 0;\n    if (fx.resource === 'life') {\n      landed = target.healBy(fx.amount);\n    } else if (fx.resource === 'mana') {\n      const before = target.mana;\n      target.mana = Math.min(target.availableMaxMana(), target.mana + fx.amount);\n      landed = target.mana - before;\n    } else if (fx.resource === 'poise') {\n      landed = target.gainPoise(fx.amount);\n    } else {\n      landed = target.gainEs(fx.amount);\n      if (fx.resetEsDelay) target.esDelay = 0;\n    }\n    if (landed > 0 && !opts?.noEvent && target.gainEvents.length < 64) {\n      target.gainEvents.push({\n        kind: 'restore', id: fx.resource, depth: 0,\n        n: landed, tags: opts?.tags,\n      });\n    }\n    return landed;\n  }",
      "sha256": "5c657c945555d4c06f56b12b12c9fbe9925f2d42ab67d54cfef6be0e40ec802c",
      "lines": 26,
      "calls": [],
      "fields": []
    },
    {
      "name": "startRestoreStream",
      "line": 36545,
      "source": "private startRestoreStream(\n    target: Actor, caster: Actor, inst: SkillInstance,\n    fx: {\n      resource: 'life' | 'mana' | 'es'; amount: number; duration: number;\n      amountPerLevel?: number; amountPctMax?: number; perCharge?: boolean;\n      lane?: 'surge' | 'settle';\n      feedingCue?: import('../data/feedingCues').FeedingCueSpec | false;\n    },\n    chargesSpent: number,\n    critMult?: number,\n  ): void {\n    const tags = skillContextTags(inst);\n    const extra = instanceMods(inst);\n    const maxPool = fx.resource === 'life' ? target.maxLife()\n      : fx.resource === 'mana' ? target.availableMaxMana() : target.maxEs();\n    const pct = (fx.amountPctMax ?? 0)\n      + (fx.lane !== 'surge' ? caster.sheet.get('restorePctMax', tags, extra) : 0)\n      + (fx.lane ? caster.sheet.get('pourPct_' + fx.lane, tags, extra) : 0);\n    const base = fx.amount\n      + (fx.amountPerLevel ?? 0) * Math.max(0, effectiveSkillLevel(inst) - 1)\n      + pct * maxPool;\n    const total = base * (fx.perCharge ? Math.max(1, chargesSpent) : 1)\n      * caster.sheet.get('restorePower', tags, extra)\n      * (fx.lane ? caster.sheet.get('pourPower_' + fx.lane, tags, extra) : 1)\n      // THE LUCKY POUR: the whole stream may crit at the pour (a flask\n      // with Deadly Precision socketed pours deeper on its crits).\n      * (critMult ?? this.critMendMult(caster, inst, target.pos));\n    if (total <= 0) return;\n    const dur = Math.max(0.2, fx.duration\n      * caster.sheet.get('effectDuration', tags, extra));\n    target.restoreStreams.push({\n      resource: fx.resource, perSec: total / dur, remaining: total,\n      feedingCue: fx.feedingCue ?? inst.def.feedingCue,\n    });\n    // The pour is a GAIN EVENT (depth 0 — a drink is real play): sympathy\n    // links replay it on kin (the tamed-beast flask bond). Echo streams are\n    // granted directly and never re-event, so pours can't chain.\n    if (target.gainEvents.length < 64) {\n      target.gainEvents.push({\n        kind: 'restore', id: fx.resource, depth: 0,\n        n: total, dur, tags: inst.def.tags,\n      });\n    }\n    // feedingCue gains are emitted by actual ticks, including primed releases.\n  }",
      "sha256": "fcc6afec552d93b3a8676b4da64ca049ea93ceff062210e8598aa6666c19f9c9",
      "lines": 45,
      "calls": [
        "critMendMult"
      ],
      "fields": []
    },
    {
      "name": "critMendMult",
      "line": 36646,
      "source": "private critMendMult(caster: Actor, inst: SkillInstance, at?: Vec2): number {\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    if (!chance(caster.sheet.get('critChance', tags, extra))) return 1;\n    const mult = caster.sheet.get('critMulti', tags, extra);\n    if (at) this.flashes.push(combatCueFlash(at, 'mend', 18));\n    return mult;\n  }",
      "sha256": "4640a8910b1e328e08f73b033ce6511b6e79e729a7449056cdb98adc86d36735",
      "lines": 8,
      "calls": [],
      "fields": [
        "flashes"
      ]
    },
    {
      "name": "applyHeal",
      "line": 36655,
      "source": "private applyHeal(\n    caster: Actor, inst: SkillInstance, target: Actor,\n    fx: { amount?: number; pctMax?: number; excludeCaster?: boolean }, mult = 1, quiet = false,\n  ): number {\n    if (target.dead || target.downed || (fx.excludeCaster && target === caster)) return 0;\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    const raw = ((fx.amount ?? 0) + (fx.pctMax ?? 0) * target.maxLife())\n      * caster.sheet.get('healPower', tags, extra) * mult\n      * this.critMendMult(caster, inst, quiet ? undefined : target.pos);\n    if (raw <= 0) return 0;\n    // HEAL-OVER-TIME conversion (Mending Echoes): the direct mend POURS\n    // instead — total × factor over the graft's seconds, riding the\n    // restore-stream machinery (healTaken gates each sip via healBy).\n    const hot = socketSpec(inst, 'healOverTime');\n    if (hot) {\n      const total = raw * hot.factor;\n      target.restoreStreams.push({\n        resource: 'life', perSec: total / hot.seconds, remaining: total,\n        feedingCue: inst.def.feedingCue,\n      });\n      return 0;\n    }\n    const landed = target.healBy(raw);\n    // A landed mend is a GAIN EVENT (sympathy 'heal' channel — tick-rate\n    // sources call healBy directly and stay quiet here). Echoes heal via\n    // healBy alone and never re-event: heal chains are structurally dead.\n    if (landed > 0 && target.gainEvents.length < 64) {\n      target.gainEvents.push({\n        kind: 'heal', id: 'life', depth: 0, n: landed, tags: inst.def.tags,\n      });\n    }\n    // OVERMEND: spilled healing becomes a ward (grantAbsorb keeps the max).\n    const spill = raw * target.sheet.get('healTaken') - landed;\n    if (spill > 0.5) {\n      const oh = caster.sheet.get('overheal', tags, extra);\n      if (oh > 0) this.grantAbsorb(target, Math.min(target.maxLife() * 0.5, spill * oh), 6);\n    }\n    if (!quiet && landed >= 1) {\n      this.seatText(caster, target.pos, '+' + Math.round(landed), '#6fc06f', 12); // THE WIRE'S EYES: the healer's seat\n    }\n    // HEALER AGGRO: anyone locked onto the healed victim books threat against\n    // the mender (their brain's TargetSpec.threat.heal weighs it) — keeping a\n    // warband alive is its own provocation.\n    if (landed > 0 && caster !== target) {\n      for (const e of this.actors) {\n        if (e.dead || e.team === caster.team || !e.brain || e.aiTargetId !== target.id) continue;\n        const hw = normalizeBrain(e.brain).base.target?.threat?.heal ?? 0.5;\n        if (hw > 0) e.addThreat(caster.id, landed * hw);\n      }\n    }\n    return landed;\n  }",
      "sha256": "7f80301969c73bb89b05ccefbed00b1241780b53e26d9697e05522911486a2a8",
      "lines": 53,
      "calls": [
        "critMendMult",
        "grantAbsorb",
        "seatText"
      ],
      "fields": [
        "actors"
      ]
    },
    {
      "name": "applyHealChained",
      "line": 36713,
      "source": "private applyHealChained(\n    caster: Actor, inst: SkillInstance, target: Actor,\n    fx: { amount?: number; pctMax?: number; chain?: number; excludeCaster?: boolean }, mult = 1, quiet = false,\n  ): void {\n    this.applyHeal(caster, inst, target, fx, mult, quiet);\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    let hops = (fx.chain ?? 0) + Math.round(caster.sheet.get('chainCount', tags, extra));\n    const visited = new Set<Actor>([target]);\n    let from = target;\n    let scale = mult;\n    while (hops-- > 0) {\n      let next: Actor | null = null; let worst = 0.999;\n      for (const a of this.actors) {\n        if (a.dead || a.downed || a.untargetable || a.construct || visited.has(a)) continue;\n        // Every hop carries the original heal's recipient exclusions.\n        if (fx.excludeCaster && a === caster) continue;\n        if (a.team !== caster.team || !sameStory(a, from)) continue; // (the sovereignty gate: the chain hops its own story)\n        if (dist(from.pos, a.pos) > 220) continue;\n        const frac = a.life / Math.max(1, a.maxLife());\n        if (frac < worst) { worst = frac; next = a; }\n      }\n      if (!next) break;\n      scale *= 0.75;\n      // A momentary mending arc (the discharge-zap visual pattern).\n      this.tethers.push({\n        a: from, b: next, owner: caster, skillId: inst.def.id, link: 'zap',\n        amounts: {}, heal: 0, affects: 'allies', width: 5,\n        remaining: 0.16, tickTimer: 99,\n        color: '#7ec88a',\n        ax: from.pos.x, ay: from.pos.y, bx: next.pos.x, by: next.pos.y,\n      });\n      this.applyHeal(caster, inst, next, fx, scale, quiet);\n      visited.add(next);\n      from = next;\n    }\n  }",
      "sha256": "860692a758cf9c7296353460b6183d8f09175b0bfc6fa5ad68f5a0a5c53ed8c0",
      "lines": 37,
      "calls": [
        "applyHeal"
      ],
      "fields": [
        "actors",
        "tethers"
      ]
    },
    {
      "name": "cleanseActor",
      "line": 36753,
      "source": "private cleanseActor(target: Actor, count = 2): number {\n    const stripped = target.cleanseDebuffs(count);\n    if (stripped > 0) this.text(target.pos, 'cleansed', '#a8e8d8', 12, 'combat');\n    return stripped;\n  }",
      "sha256": "30831bc9a42ce7a62c6922add567460aa7aeda06ab61c9ff0639e4a1a864c2fa",
      "lines": 5,
      "calls": [
        "text"
      ],
      "fields": []
    },
    {
      "name": "ringAfflictions",
      "line": 36766,
      "source": "private ringAfflictions(target: Actor, portion: number): number {\n    if (portion <= 0) return 0;\n    let rung = 0;\n    for (let i = target.statuses.length - 1; i >= 0; i--) {\n      const s = target.statuses[i];\n      const def = STATUS_DEFS[s.id];\n      if (def?.beneficial) continue;\n      if (s.stacks > 1) {\n        s.stacks -= Math.max(1, Math.round(s.stacks * portion));\n        if (s.stacks <= 0) {\n          target.statuses.splice(i, 1);\n          if (!target.statuses.some(o => o.id === s.id)) {\n            target.sheet.removeSource('status:' + s.id);\n          }\n        } else if (def?.mods && def.modsPerStack) {\n          // The sunscorch-dwindle discipline: per-stack mods re-sync on\n          // every shed so the sheet never wears stacks the body lost.\n          target.sheet.setSource('status:' + s.id,\n            def.mods.map(m => ({ ...m, value: m.value * s.stacks })));\n        }\n      } else {\n        s.remaining *= 1 - portion;\n      }\n      rung++;\n    }\n    if (rung > 0) this.text(target.pos, 'rung clean', '#d8c8a0', 12, 'combat');\n    return rung;\n  }",
      "sha256": "3f824990c4d526893f098559aaff959e697cccd4c19f7c78da0a4bdfa86c910d",
      "lines": 28,
      "calls": [
        "text"
      ],
      "fields": []
    },
    {
      "name": "healAlliesInArea",
      "line": 36798,
      "source": "private healAlliesInArea(\n    caster: Actor, inst: SkillInstance, accepts: (a: Actor) => boolean,\n    mult = 1, quiet = false, once?: Set<number>,\n  ): void {\n    // `once` is a per-CROSSING ledger (the sweep zones' own struck set):\n    // a drifting crescent mends each ally exactly once per pass — a\n    // blade-pass, not a per-frame fountain. Lingering fields pass nothing\n    // and keep their per-tick wash. Ids are shared with the zone's damage\n    // victims and rung bells; the sets are disjoint by team, so nothing\n    // collides.\n    const fxs = inst.def.effects.filter(fx => fx.type === 'heal' || fx.type === 'cleanse');\n    if (!fxs.length) return;\n    for (const a of this.actors) {\n      if (a.dead || a.downed || a.untargetable || a.construct || a.team !== caster.team || !sameStory(a, caster)) continue; // (the sovereignty gate)\n      if (once?.has(a.id)) continue;\n      if (!accepts(a)) continue;\n      let touched = false;\n      for (const fx of fxs) {\n        if (fx.type === 'heal' && fx.excludeCaster && a === caster) continue;\n        touched = true;\n        if (fx.type === 'heal') this.applyHealChained(caster, inst, a, fx, mult, quiet);\n        else this.cleanseActor(a, fx.count ?? 2);\n      }\n      if (touched) once?.add(a.id);\n    }\n  }",
      "sha256": "b678c11db13cd3df85ba8aa3381154559e79b3f4ada526176178a80e9e21979e",
      "lines": 26,
      "calls": [
        "applyHealChained",
        "cleanseActor"
      ],
      "fields": [
        "actors"
      ]
    },
    {
      "name": "seatText",
      "line": 56827,
      "source": "seatText(by: Actor | null | undefined, at: Vec2, text: string, color: string, size = 13, kind?: string): void {\n    this.text(at, text, color, size, kind);\n    this.creditFloat(by);\n  }",
      "sha256": "51751847f1703f3e0c8bc2b4753bb3182e2f0c04f03d3b4d85d147445c168654",
      "lines": 4,
      "calls": [
        "text",
        "creditFloat"
      ],
      "fields": []
    },
    {
      "name": "creditFloat",
      "line": 56835,
      "source": "creditFloat(by: Actor | null | undefined, seatId?: string | null): void {\n    if (this.partyRows === null || !this.texts.length) return; // keeperSeat: the solo invariant (no owner off a hosted world)\n    const seat = seatId !== undefined ? seatId : this.seatOfRoot(by)?.id;\n    if (seat && !this.seats.find(s => s.id === seat)?.keeper) this.texts[this.texts.length - 1].seat = seat;\n  }",
      "sha256": "153f2fb7617853783d23dca7907d87d91cf8b8517a2eb162ba2e7316939c880a",
      "lines": 5,
      "calls": [
        "seatOfRoot"
      ],
      "fields": [
        "partyRows",
        "texts",
        "seats"
      ]
    }
  ]
} as const;
export const nativeSceneRestorationArchiveHash="54d00a5eca7b7721785b8550151913440f638be66d4ae814b5ca78be87d2754b";
