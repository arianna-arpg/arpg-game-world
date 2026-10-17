/** Immutable native construction provenance. */
export const killAftermathArchive = {
  "commit": "2da620a1c856c31a67a63db4aacd61b1cf843d99",
  "worldHash": "11e8c018f2d7f0fe3b964f3819c7b8b2dbb6997ad5ae9a13048dae0a36f8aff1",
  "rows": [
    {
      "name": "rollKillOrbs",
      "line": 38315,
      "lines": 27,
      "hash": "61bfdc91c7293442ddd79c3c802a1e714e6ba1665646083292c1ca251820a280",
      "source": "private rollKillOrbs(caster: Actor, inst: SkillInstance, victim: Actor): void {\n    if (caster.construct || victim.noBounty || this.orbs.length >= ORB_CAP) return;\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    const rate = caster.sheet.get('orbShedRate', tags, extra);\n    // THE GRANTED SHED (orbShedGraft — Abundant Harvest's mechanism\n    // unlock): where an orb kind has NO base at all, the graft's low\n    // floor stands the lane up — multiplied by GLOBAL orbShedRate\n    // sources only (the gem's own skill-local rate bonus deliberately\n    // never compounds its own floor). Kinds WITH a base keep the innate\n    // lane: floor added flat, every rate source multiplying as ever.\n    const graft = hostSockets(inst).map(s => s.def.orbShedGraft).find(g => g);\n    // No tags/extra on the floor's rate read: skill-local mods (the\n    // granting gem's own +rate) live in `extra`, so omitting it IS the\n    // no-self-compounding law — global passives/gear still multiply.\n    const globalRate = graft ? caster.sheet.get('orbShedRate') : 0;\n    for (const id of Object.keys(ORB_DEFS)) {\n      const base = caster.sheet.get(orbOnKillStat(id), tags, extra);\n      const grafted = graft?.orbs.includes(id) ? graft.chance : 0;\n      const c = base > 0\n        ? (base + grafted) * rate\n        : grafted * globalRate;\n      if (c > 0 && chance(Math.min(0.75, c))) {\n        this.shedOrb(id, victim.pos, { scatter: 26, tier: victim.tier });\n      }\n    }\n  }"
    },
    {
      "name": "rollKillRemnants",
      "line": 38345,
      "lines": 16,
      "hash": "699d221870ab0e987516121c3f2147be5a979c654eed04be77505f826027a3f8",
      "source": "private rollKillRemnants(caster: Actor, inst: SkillInstance, at: Vec2): void {\n    if (caster.construct || this.remnants.length >= 14) return;\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    for (const kind of Object.values(REMNANT_KINDS)) {\n      const c = caster.sheet.get(remnantDropStat(kind.id), tags, extra);\n      if (c <= 0 || !chance(Math.min(0.75, c))) continue;\n      const ang = rand(0, Math.PI * 2);\n      const r = rand(10, 40);\n      this.remnants.push({\n        pos: this.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 8),\n        kind: kind.id, bob: rand(0, Math.PI * 2), life: 12,\n      });\n      if (this.remnants.length >= 14) break;\n    }\n  }"
    },
    {
      "name": "spawnDeathBurst",
      "line": 36476,
      "lines": 25,
      "hash": "7673c0a1530c6828b4ccdc36632124880319709fc69e23639e62957429ecdc42",
      "source": "private spawnDeathBurst(a: Actor, cfg: DeathBurstDef): void {\n    const type: DamageType = cfg.damageType ?? 'fire';\n    // The increased-DURATION stat rides BOTH timers: a longer coalesce (bigger escape\n    // window) and a longer-hounding orb. So `enduring` etc. lengthen every burst phase.\n    const dur = a.sheet.get('effectDuration');\n    const life = (cfg.orbDuration ?? 2.6) * dur;\n    // Outrun cap derived from the player's BASE move speed (not a literal) so it tracks\n    // any retune; at base speed the orb is always escapable, and its sloppy turn keeps\n    // it dodgeable even under slows.\n    const escapeCap = STAT_DEFS.moveSpeed.base * 0.75;\n    this.deathBursts.push({\n      phase: 'gather', mode: cfg.mode,\n      pos: vec(a.pos.x, a.pos.y), team: a.team, tier: a.tier,\n      dmg: a.maxLife() * cfg.damageFrac,\n      radius: cfg.radius ?? (45 + a.radius * 2),\n      type, color: cfg.color ?? DAMAGE_COLOR[type],\n      t: 0, coalesce: (cfg.coalesce ?? 0.8) * dur,\n      life, armAt: life * 0.25,\n      speed: Math.min(cfg.orbSpeed ?? 110, escapeCap),\n      turn: cfg.orbTurn ?? 2.0,\n      dir: 0, trail: [], arming: false,\n      contact: cfg.detonateOnContact ?? false, stuck: false,\n      contactFuse: cfg.contactFuse ?? 0.3, contactRadius: cfg.contactRadius ?? 12,\n    });\n  }"
    }
  ]
} as const;
