/** Exact seven-method World integration composed over committed reward storage. */
export const nativeSceneDefensePreparationIntegrationArchive={
  "integrationCommit": "2da620a1c856c31a67a63db4aacd61b1cf843d99",
  "sourceHash": "11e8c018f2d7f0fe3b964f3819c7b8b2dbb6997ad5ae9a13048dae0a36f8aff1",
  "afterHash": "f8ea414b124bd0e31b39564d9d6d42119ad0405b26d8bb7a44d99fd1290a7f55",
  "originalPin": "99b5e14dee9b0f32837335fb72ace6b5dce64b6c",
  "originalArchiveHash": "3b10b124bbcac21e9f217473f672eec19e785414f59a612dd575b537a5188fed",
  "standaloneManifestHash": "708948250512b1553852d415c4053c3cae4ada6d83042afe1d5763a9ad15b508",
  "integration": [
    {
      "name": "defense preparation import",
      "before": "",
      "after": "import {sceneTryShellPool,sceneShowCombatOutcome,sceneRefreshGuardBash,sceneIsBurstTarget,sceneResolveDeathBurst,sceneBankRune,sceneBumpDrives,type NativeSceneDefensePreparationHost} from './nativeSceneDefensePreparation';\n"
    },
    {
      "name": "tryShellPool",
      "before": "private tryShellPool(victim: Actor, threatPos: Vec2, packet: DamagePacket, sg: Actor['shellGuard']): boolean {\n    if (!sg || sg.broken || sg.pool <= 0) return false;\n    if (sg.side !== 'all') {\n      const center = victim.facing + (sg.side === 'rear' ? Math.PI : 0);\n      // BREATHING shells (shellGuard.breathe): the covered arc swells and\n      // wanes on its period — the trough is the opening you time. The\n      // renderer's glyph draws the SAME live factor: read it, then strike.\n      const arc = (sg.arcDeg * Math.PI / 180) * shellArcFactor(sg, this.time);\n      if (Math.abs(angleDiff(center, angleTo(victim.pos, threatPos))) > arc / 2) return false;\n    }\n    const raw = Object.values(packet.amounts).reduce((s, v) => s + (v ?? 0), 0);\n    if (raw <= 0) return false;\n    sg.lastHitAt = this.time;\n    const absorb = Math.min(sg.pool, raw);\n    sg.pool -= absorb;\n    if (sg.pool <= 0) {\n      sg.broken = true;\n      this.flashes.push(defenseCueFlash(victim, 'shell', 'break', sg.color, { style: sg.shellVisual,\n        facing: victim.facing + (sg.side === 'rear' ? Math.PI : 0),\n        arc: sg.side === 'all' ? Math.PI * 2 : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, this.time) }));\n    }\n    if (!sg.broken) this.flashes.push(defenseCueFlash(victim, 'shell', 'impact', sg.color,\n      { style: sg.shellVisual, facing: angleTo(victim.pos, threatPos), arc: 0.85 }));\n    if (absorb >= raw) {\n      return true; // fully eaten — statuses and knockback with it\n    }\n    // The breaking blow: only the overflow lands.\n    const k = (raw - absorb) / raw;\n    for (const t of Object.keys(packet.amounts) as (keyof typeof packet.amounts)[]) {\n      packet.amounts[t]! *= k;\n    }\n    return false;\n  }",
      "after": "declare private nativeSceneDefensePreparationView?:NativeSceneDefensePreparationHost;\n  private nativeSceneDefensePreparationHost():NativeSceneDefensePreparationHost {\n    if(this.nativeSceneDefensePreparationView)return this.nativeSceneDefensePreparationView;\n    const world=this,host:NativeSceneDefensePreparationHost=Object.freeze({\n      get actors(){return world.actors;},\n      get flashes(){return world.flashes;},\n      get time(){return world.time;},\n    });\n    Object.defineProperty(this,'nativeSceneDefensePreparationView',{value:host,writable:true,configurable:true,enumerable:false});\n    return host;\n  }\n\n  private tryShellPool(victim: Actor, threatPos: Vec2, packet: DamagePacket, sg: Actor['shellGuard']): boolean { return sceneTryShellPool(this.nativeSceneDefensePreparationHost(),victim,threatPos,packet,sg); }"
    },
    {
      "name": "showCombatOutcome",
      "before": "private showCombatOutcome(a: Actor, style: 'hit_cap' | 'culled' | 'last_gasp' | 'volatile_release', source?: Vec2, color?: string): void {\n    const facing = source ? Math.atan2(a.pos.y - source.y, a.pos.x - source.x) : 0;\n    this.flashes.push(combatCueFlash(a.pos, style, a.radius + REACTIVE_CUE_CFG.eventPad, facing, color));\n  }",
      "after": "private showCombatOutcome(a: Actor, style: 'hit_cap' | 'culled' | 'last_gasp' | 'volatile_release', source?: Vec2, color?: string): void { return sceneShowCombatOutcome(this.nativeSceneDefensePreparationHost(),a,style,source,color); }"
    },
    {
      "name": "refreshGuardBash",
      "before": "private refreshGuardBash(a: Actor, cs: CastingState): void {\n    const bash = guardBashSpec(cs.inst);\n    if (!bash) { cs.bashAt = undefined; cs.bashLow = undefined; cs.bashArmAt = undefined; return; }\n    const tags = skillContextTags(cs.inst.def, grantedTags(cs.inst));\n    const extra = instanceMods(cs.inst);\n    const floor = clamp(\n      (bash.threshold ?? BASH_CFG.releaseFloor) * a.sheet.get('bashFloor', tags, extra),\n      0, 1);\n    const inverted = a.sheet.get('bashInvert', tags, extra) > 0;\n    cs.bashAt = inverted ? 1 - floor : floor;\n    cs.bashLow = inverted || undefined;\n    // THE ARM CLOCK: held seconds before the release may convert — the\n    // spec's armTime (default BASH_CFG.armTime) × the bashArmTime stat,\n    // live like the line (a buff landing mid-stance moves the clock the\n    // same frame). guardBashReady reads it beside the line for the\n    // release, the HUD's arm meter and the AI's hold alike.\n    cs.bashArmAt = Math.max(0,\n      (bash.armTime ?? BASH_CFG.armTime) * a.sheet.get('bashArmTime', tags, extra));\n  }",
      "after": "private refreshGuardBash(a: Actor, cs: CastingState): void { return sceneRefreshGuardBash(this.nativeSceneDefensePreparationHost(),a,cs); }"
    },
    {
      "name": "isBurstTarget",
      "before": "private isBurstTarget(e: Actor, sourceTeam: Team, sourceTier = 0): boolean {\n    // `sourceTier`: the blast's own story (the sovereignty gate) — a burst\n    // on the deck scorches no valley body beneath it.\n    return !e.dead && !e.downed && e.team !== sourceTeam && e.tier === sourceTier && !e.untargetable && !e.invulnerable;\n  }",
      "after": "private isBurstTarget(e: Actor, sourceTeam: Team, sourceTier = 0): boolean { return sceneIsBurstTarget(this.nativeSceneDefensePreparationHost(),e,sourceTeam,sourceTier); }"
    },
    {
      "name": "resolveDeathBurst",
      "before": "private resolveDeathBurst(a: Actor): DeathBurstDef | null {\n    if (a.deathBurst) return a.deathBurst;\n    if (a.explodeOnDeath > 0) return { mode: 'implode', damageFrac: a.explodeOnDeath, coalesce: 0.8 };\n    return null;\n  }",
      "after": "private resolveDeathBurst(a: Actor): DeathBurstDef | null { return sceneResolveDeathBurst(this.nativeSceneDefensePreparationHost(),a); }"
    },
    {
      "name": "bankRune",
      "before": "private bankRune(caster: Actor, def: SkillDef): void {\n    if (caster.construct) return; // runeForCast never lets an autonomous device fuel its own invocation\n    const invoker = caster.skills.find(s => s?.def.invokes);\n    if (!invoker) return;\n    const rune = runeForCast(def, invoker, caster.runes);\n    if (!rune) return;\n    const cap = Math.max(1, Math.round(caster.sheet.get('runeCap',\n      skillContextTags(invoker.def), instanceMods(invoker))));\n    while (caster.runes.length >= cap) caster.runes.shift(); // runeForCast still appends exactly once\n    caster.runes.push(rune);\n  }",
      "after": "private bankRune(caster: Actor, def: SkillDef): void { return sceneBankRune(this.nativeSceneDefensePreparationHost(),caster,def); }"
    },
    {
      "name": "bumpDrives",
      "before": "bumpDrives(actor: Actor | null, kind: 'onKill' | 'onHurt' | 'onDealt' | 'onAllyDeath'): void {\n    // SOVEREIGNTY: sound — drives echo by earshot (the derived census, probe_tiers RIG T).\n    if (!actor || actor.dead || !actor.brain) return;\n    const drives = normalizeBrain(actor.brain).drives;\n    if (!drives) return;\n    for (const id in drives) {\n      const spec = drives[id];\n      // A KEPT body's stood-down appetite (DriveSpec.whileOwned false) takes\n      // no event jumps either: the AI tick DELETES the meter (delete-never-\n      // freeze, ai.ts), and a jump landing between ticks would flash a\n      // sub-tick value through every read until that tick swept it. The\n      // jump refuses to feed the dead meter; the tick stays the deleter.\n      if (spec.whileOwned === false && actor.isMinion()) continue;\n      const jump = spec[kind];\n      if (!jump) continue;\n      const v = (actor.drives.get(id) ?? 0) + jump;\n      actor.drives.set(id, Math.max(0, Math.min(1, v)));\n      const share = spec.share;\n      if (share && actor.squadId !== undefined) {\n        for (const kin of this.actors) {\n          if (kin === actor || kin.dead || kin.squadId !== actor.squadId) continue;\n          if (dist(kin.pos, actor.pos) > COMMAND_CFG.earshot) continue;\n          // The echoed row honors the same leash on the receiving body.\n          if (spec.whileOwned === false && kin.isMinion()) continue;\n          const kv = (kin.drives.get(id) ?? 0) + jump * share;\n          kin.drives.set(id, Math.max(0, Math.min(1, kv)));\n        }\n      }\n    }\n  }",
      "after": "bumpDrives(actor: Actor | null, kind: 'onKill' | 'onHurt' | 'onDealt' | 'onAllyDeath'): void { return sceneBumpDrives(this.nativeSceneDefensePreparationHost(),actor,kind); }"
    },
    {
      "name": "unused import REACTIVE_CUE_CFG",
      "before": "import { REACTIVE_CUE_CFG } from '../data/combatReadability';\nimport { Actor, shellArcFactor, type AmbushSpec, type BrainPhase, type CastingState, type GainEvent, type MonsterPartDef, type Team } from './actor';\n",
      "after": "import { Actor, shellArcFactor, type AmbushSpec, type BrainPhase, type CastingState, type GainEvent, type MonsterPartDef, type Team } from './actor';\n"
    },
    {
      "name": "unused import runeForCast",
      "before": "import { instanceInvocation, runeForCast, makeInvocationPayload } from './invocation';",
      "after": "import { instanceInvocation, makeInvocationPayload } from './invocation';"
    }
  ]
} as const;
export const nativeSceneDefensePreparationIntegrationArchiveHash="e154850f4fe40d265214ec6638701e0472421cedc1ccebf60841008b4fbbb937";
