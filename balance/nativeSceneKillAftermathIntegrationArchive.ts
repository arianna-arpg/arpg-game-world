/** Exact three-method World integration over committed defense and summon admission. */
export const nativeSceneKillAftermathIntegrationArchive={
  "integrationCommit": "9992f7e54d64563e9a4c4ad61383a988c4208faa",
  "sourceHash": "f8ea414b124bd0e31b39564d9d6d42119ad0405b26d8bb7a44d99fd1290a7f55",
  "afterHash": "a082b227a396211a3569dbdb23e0aa9ccad047ab9d2dca8191c4147942487d3c",
  "originalPin": "2da620a1c856c31a67a63db4aacd61b1cf843d99",
  "originalArchiveHash": "82307032ec2a4464e025a92701e29b58705d6b40baf5c76fbbbee3d735b322bb",
  "standaloneManifestHash": "da8921147936276d4b5e5f1297c784e46b7391ea884dfa71a03d2a82387b6859",
  "integration": [
    {
      "name": "kill aftermath import",
      "before": "",
      "after": "import {sceneRollKillOrbs,sceneRollKillRemnants,sceneSpawnDeathBurst,type NativeSceneKillAftermathHost} from './nativeSceneKillAftermath';\n"
    },
    {
      "name": "rollKillOrbs",
      "before": "private rollKillOrbs(caster: Actor, inst: SkillInstance, victim: Actor): void {\n    if (caster.construct || victim.noBounty || this.orbs.length >= ORB_CAP) return;\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    const rate = caster.sheet.get('orbShedRate', tags, extra);\n    // THE GRANTED SHED (orbShedGraft — Abundant Harvest's mechanism\n    // unlock): where an orb kind has NO base at all, the graft's low\n    // floor stands the lane up — multiplied by GLOBAL orbShedRate\n    // sources only (the gem's own skill-local rate bonus deliberately\n    // never compounds its own floor). Kinds WITH a base keep the innate\n    // lane: floor added flat, every rate source multiplying as ever.\n    const graft = hostSockets(inst).map(s => s.def.orbShedGraft).find(g => g);\n    // No tags/extra on the floor's rate read: skill-local mods (the\n    // granting gem's own +rate) live in `extra`, so omitting it IS the\n    // no-self-compounding law — global passives/gear still multiply.\n    const globalRate = graft ? caster.sheet.get('orbShedRate') : 0;\n    for (const id of Object.keys(ORB_DEFS)) {\n      const base = caster.sheet.get(orbOnKillStat(id), tags, extra);\n      const grafted = graft?.orbs.includes(id) ? graft.chance : 0;\n      const c = base > 0\n        ? (base + grafted) * rate\n        : grafted * globalRate;\n      if (c > 0 && chance(Math.min(0.75, c))) {\n        this.shedOrb(id, victim.pos, { scatter: 26, tier: victim.tier });\n      }\n    }\n  }",
      "after": "declare private nativeSceneKillAftermathView?:NativeSceneKillAftermathHost;\n  private nativeSceneKillAftermathHost():NativeSceneKillAftermathHost {\n    if(this.nativeSceneKillAftermathView)return this.nativeSceneKillAftermathView;\n    const world=this,host:NativeSceneKillAftermathHost=Object.freeze({\n      get orbs(){return world.orbs;},\n      get remnants(){return world.remnants;},\n      get deathBursts(){return world.deathBursts;},\n      get shedOrb(){const fn=world.shedOrb;return (...args:Parameters<World['shedOrb']>)=>Reflect.apply(fn,world,args);},\n      get clampPos(){const fn=world.clampPos;return (...args:Parameters<World['clampPos']>)=>Reflect.apply(fn,world,args);},\n    });\n    Object.defineProperty(this,'nativeSceneKillAftermathView',{value:host,writable:true,configurable:true,enumerable:false});\n    return host;\n  }\n\n  private rollKillOrbs(caster: Actor, inst: SkillInstance, victim: Actor): void { return sceneRollKillOrbs(this.nativeSceneKillAftermathHost(),caster,inst,victim); }"
    },
    {
      "name": "rollKillRemnants",
      "before": "private rollKillRemnants(caster: Actor, inst: SkillInstance, at: Vec2): void {\n    if (caster.construct || this.remnants.length >= 14) return;\n    const tags = skillContextTags(inst, grantedTags(inst));\n    const extra = instanceMods(inst);\n    for (const kind of Object.values(REMNANT_KINDS)) {\n      const c = caster.sheet.get(remnantDropStat(kind.id), tags, extra);\n      if (c <= 0 || !chance(Math.min(0.75, c))) continue;\n      const ang = rand(0, Math.PI * 2);\n      const r = rand(10, 40);\n      this.remnants.push({\n        pos: this.clampPos(vec(at.x + Math.cos(ang) * r, at.y + Math.sin(ang) * r), 8),\n        kind: kind.id, bob: rand(0, Math.PI * 2), life: 12,\n      });\n      if (this.remnants.length >= 14) break;\n    }\n  }",
      "after": "private rollKillRemnants(caster: Actor, inst: SkillInstance, at: Vec2): void { return sceneRollKillRemnants(this.nativeSceneKillAftermathHost(),caster,inst,at); }"
    },
    {
      "name": "spawnDeathBurst",
      "before": "private spawnDeathBurst(a: Actor, cfg: DeathBurstDef): void {\n    const type: DamageType = cfg.damageType ?? 'fire';\n    // The increased-DURATION stat rides BOTH timers: a longer coalesce (bigger escape\n    // window) and a longer-hounding orb. So `enduring` etc. lengthen every burst phase.\n    const dur = a.sheet.get('effectDuration');\n    const life = (cfg.orbDuration ?? 2.6) * dur;\n    // Outrun cap derived from the player's BASE move speed (not a literal) so it tracks\n    // any retune; at base speed the orb is always escapable, and its sloppy turn keeps\n    // it dodgeable even under slows.\n    const escapeCap = STAT_DEFS.moveSpeed.base * 0.75;\n    this.deathBursts.push({\n      phase: 'gather', mode: cfg.mode,\n      pos: vec(a.pos.x, a.pos.y), team: a.team, tier: a.tier,\n      dmg: a.maxLife() * cfg.damageFrac,\n      radius: cfg.radius ?? (45 + a.radius * 2),\n      type, color: cfg.color ?? DAMAGE_COLOR[type],\n      t: 0, coalesce: (cfg.coalesce ?? 0.8) * dur,\n      life, armAt: life * 0.25,\n      speed: Math.min(cfg.orbSpeed ?? 110, escapeCap),\n      turn: cfg.orbTurn ?? 2.0,\n      dir: 0, trail: [], arming: false,\n      contact: cfg.detonateOnContact ?? false, stuck: false,\n      contactFuse: cfg.contactFuse ?? 0.3, contactRadius: cfg.contactRadius ?? 12,\n    });\n  }",
      "after": "private spawnDeathBurst(a: Actor, cfg: DeathBurstDef): void { return sceneSpawnDeathBurst(this.nativeSceneKillAftermathHost(),a,cfg); }"
    },
    {
      "name": "unused import STAT_DEFS",
      "before": "import {ATTRIBUTES,ELEMENTAL_TYPES,STAT_DEFS,DAMAGE_COLOR} from './stats';",
      "after": "import { ATTRIBUTES, ELEMENTAL_TYPES, DAMAGE_COLOR } from './stats';"
    },
    {
      "name": "unused import remnantDropStat",
      "before": "import { REMNANT_KINDS, remnantDropStat } from '../data/remnants';",
      "after": "import { REMNANT_KINDS } from '../data/remnants';"
    },
    {
      "name": "unused import orbOnKillStat",
      "before": "import {\n  ORB_DEFS, ORB_CAP, orbAmount, orbOnHitStat, orbOnKillStat, orbOnHurtStat,\n  orbRefundStat, orbTrickleStat, ORB_TRICKLE,\n} from '../data/orbs';",
      "after": "import { ORB_DEFS, ORB_CAP, orbAmount, orbOnHitStat, orbOnHurtStat, orbRefundStat, orbTrickleStat, ORB_TRICKLE } from '../data/orbs';"
    }
  ]
} as const;
export const nativeSceneKillAftermathIntegrationArchiveHash="619cda2349a6be26a7d59b369e6dba32c638a9e3d7e182cadd85abf5c481bc9c";
