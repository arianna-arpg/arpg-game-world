/** Immutable native tether bodies and exact reviewed World integration. */
export const nativeSceneTetherArchive={
  "commit": "8c7ab5fae732b49e29e6aa756ad9b98670be16e0",
  "rows": [
    {
      "name": "addTether",
      "before": "private addTether(a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void {\n    if (a === b || a.dead || b.dead) return;\n    this.tethers = this.tethers.filter(t => !(t.skillId === inst.def.id\n      && ((t.a === a && t.b === b) || (t.a === b && t.b === a))));\n    const extra = instanceMods(inst);\n    const type: DamageType = spec.damageType ?? 'physical';\n    const tags = skillContextTags(inst, [type]);\n    const amounts: Partial<Record<DamageType, number>> = {};\n    // Beam damage and width are INVESTABLE: damage × tetherDamage for the\n    // dps, aoeRadius × tetherWidth for the band (yes, Widening fits a wire).\n    if (spec.dps) {\n      amounts[type] = spec.dps\n        * owner.sheet.get('damage', tags, extra)\n        * owner.sheet.get('tetherDamage', tags, extra);\n    }\n    applyConversion(owner, amounts, tags, extra);\n    const width = (spec.width ?? 10)\n      * owner.sheet.get('aoeRadius', tags, extra)\n      * owner.sheet.get('tetherWidth', tags, extra);\n    // The band's colour follows its dominant POST-conversion type — the\n    // damage-type tell stays honest through any conversion chain.\n    let domType: DamageType | null = null, domAmt = 0;\n    for (const [k, v] of Object.entries(amounts)) {\n      if ((v ?? 0) > domAmt) { domAmt = v ?? 0; domType = k as DamageType; }\n    }\n    this.tethers.push({\n      a, b, owner, skillId: inst.def.id, link: spec.link, inst,\n      amounts, heal: spec.healPerSec ?? 0,\n      affects: spec.affects ?? 'enemies',\n      width,\n      remaining: spec.link === 'target'\n        ? (spec.duration ?? 8) * owner.sheet.get('effectDuration', tags, extra)\n        : Infinity,\n      tickTimer: TETHER_TICK,\n      color: spec.color ?? (domType ? DAMAGE_COLOR[domType] : '#7ec88a'),\n      ax: a.pos.x, ay: a.pos.y, bx: b.pos.x, by: b.pos.y,\n    });\n  }",
      "hash": "b7a18a2fb2d52359df0928088418178ad977f2a5c027dd11fd8752452e7cf6fc",
      "after": "private addTether(a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void { return sceneAddTether(this.nativeSceneTetherHost(),a,b,spec,inst,owner); }"
    },
    {
      "name": "attachObjectTethers",
      "before": "private attachObjectTethers(spawned: Actor, inst: SkillInstance, caster: Actor): void {\n    // SOVEREIGNTY: self — a caster's own constructs (the derived census, probe_tiers RIG T).\n    for (const spec of instanceTethers(inst)) {\n      if (spec.link === 'caster') {\n        this.addTether(spawned, caster, spec, inst, caster);\n      } else if (spec.link === 'network') {\n        const reach = spec.radius ?? 360;\n        for (const other of this.actors) {\n          if (other === spawned || other.dead || other.owner !== caster) continue;\n          if (other.sourceSkillId !== inst.def.id) continue;\n          if (dist(spawned.pos, other.pos) > reach) continue;\n          this.addTether(spawned, other, spec, inst, caster);\n        }\n      }\n    }\n  }",
      "hash": "a5341431c1f37ab3ac17aa662d5711e7b4ab4e65fc916f3d00d8ada8618d830d",
      "after": "private attachObjectTethers(spawned: Actor, inst: SkillInstance, caster: Actor): void { return sceneAttachObjectTethers(this.nativeSceneTetherHost(),spawned,inst,caster); }"
    }
  ],
  "config": [
    "const TETHER_TICK = 0.4;"
  ],
  "integrationCommit": "82f91c99997700b67ee73bb6aa00bab1f9293163",
  "integrationObservedHead": "1d2a7ffdb903e34fa06fcfb666d94c2e09e4e14c",
  "sourceHash": "16b5f721fabef72ea9e655464fe7c80bdaf190f4bd7b85e307c391105c4465f2",
  "integration": [
    {
      "before": "import './nativeSceneBootstrap';\n",
      "after": "import './nativeSceneBootstrap';\nimport {sceneAddTether,sceneAttachObjectTethers,TETHER_TICK,type NativeSceneTetherHost} from './nativeSceneTethers';\n"
    },
    {
      "before": "const TETHER_TICK = 0.4;",
      "after": "/* NativeSceneTethers owns TETHER_TICK. */"
    },
    {
      "before": "private addTether(a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void {\n    if (a === b || a.dead || b.dead) return;\n    this.tethers = this.tethers.filter(t => !(t.skillId === inst.def.id\n      && ((t.a === a && t.b === b) || (t.a === b && t.b === a))));\n    const extra = instanceMods(inst);\n    const type: DamageType = spec.damageType ?? 'physical';\n    const tags = skillContextTags(inst, [type]);\n    const amounts: Partial<Record<DamageType, number>> = {};\n    // Beam damage and width are INVESTABLE: damage × tetherDamage for the\n    // dps, aoeRadius × tetherWidth for the band (yes, Widening fits a wire).\n    if (spec.dps) {\n      amounts[type] = spec.dps\n        * owner.sheet.get('damage', tags, extra)\n        * owner.sheet.get('tetherDamage', tags, extra);\n    }\n    applyConversion(owner, amounts, tags, extra);\n    const width = (spec.width ?? 10)\n      * owner.sheet.get('aoeRadius', tags, extra)\n      * owner.sheet.get('tetherWidth', tags, extra);\n    // The band's colour follows its dominant POST-conversion type — the\n    // damage-type tell stays honest through any conversion chain.\n    let domType: DamageType | null = null, domAmt = 0;\n    for (const [k, v] of Object.entries(amounts)) {\n      if ((v ?? 0) > domAmt) { domAmt = v ?? 0; domType = k as DamageType; }\n    }\n    this.tethers.push({\n      a, b, owner, skillId: inst.def.id, link: spec.link, inst,\n      amounts, heal: spec.healPerSec ?? 0,\n      affects: spec.affects ?? 'enemies',\n      width,\n      remaining: spec.link === 'target'\n        ? (spec.duration ?? 8) * owner.sheet.get('effectDuration', tags, extra)\n        : Infinity,\n      tickTimer: TETHER_TICK,\n      color: spec.color ?? (domType ? DAMAGE_COLOR[domType] : '#7ec88a'),\n      ax: a.pos.x, ay: a.pos.y, bx: b.pos.x, by: b.pos.y,\n    });\n  }",
      "after": "declare private nativeSceneTetherView?:NativeSceneTetherHost;\n  private nativeSceneTetherHost():NativeSceneTetherHost {\n    if(this.nativeSceneTetherView)return this.nativeSceneTetherView;\n    const world=this;\n    const host:NativeSceneTetherHost=Object.freeze({\n      get tethers(){return world.tethers;},set tethers(value:World['tethers']){world.tethers=value;},\n      get actors(){return world.actors;},\n      get addTether(){const fn=world.addTether;return(...args:Parameters<World['addTether']>)=>fn.apply(world,args);}\n    });\n    Object.defineProperty(this,'nativeSceneTetherView',{value:host,writable:true,configurable:true,enumerable:false});\n    return host;\n  }\n\n  private addTether(a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void { return sceneAddTether(this.nativeSceneTetherHost(),a,b,spec,inst,owner); }"
    },
    {
      "before": "private attachObjectTethers(spawned: Actor, inst: SkillInstance, caster: Actor): void {\n    // SOVEREIGNTY: self — a caster's own constructs (the derived census, probe_tiers RIG T).\n    for (const spec of instanceTethers(inst)) {\n      if (spec.link === 'caster') {\n        this.addTether(spawned, caster, spec, inst, caster);\n      } else if (spec.link === 'network') {\n        const reach = spec.radius ?? 360;\n        for (const other of this.actors) {\n          if (other === spawned || other.dead || other.owner !== caster) continue;\n          if (other.sourceSkillId !== inst.def.id) continue;\n          if (dist(spawned.pos, other.pos) > reach) continue;\n          this.addTether(spawned, other, spec, inst, caster);\n        }\n      }\n    }\n  }",
      "after": "private attachObjectTethers(spawned: Actor, inst: SkillInstance, caster: Actor): void { return sceneAttachObjectTethers(this.nativeSceneTetherHost(),spawned,inst,caster); }"
    }
  ],
  "priorMainContentHash": "51c84bb186297c8b92e5fff3a895e3d19a1b85f4e3505803f7417a98e9ccb04b"
} as const;
export const nativeSceneTetherArchiveHash="5a1d3e83dc1194988ad83fcf8f9805725b182e64cb374f9d4cba549762333b18";
