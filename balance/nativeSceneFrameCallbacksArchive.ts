/** Immutable original42 callback-map factory and handler mapping. */
export const nativeSceneFrameCallbacksArchive={
  "pin": "42f95716294995cbdd83785f0a0782ddda971f76",
  "worldSha256": "8e0d385e1bb4e0a80a13e64a964c5d5f6be2941e342e35645dbf5d91d1caf398",
  "file": "src/engine/nativeSceneFrameCallbacks.ts",
  "methods": [
    {
      "name": "effectTentacleSwing",
      "fn": "sceneEffectTentacleSwing",
      "source": "private effectTentacleSwing(d: Doodad, eff: DoodadEffect): void {\n    const victim = this.nearestInReach(d.pos, eff.radius, x => this.isEffectTarget(x, eff, d));\n    if (!victim) return;                 // only when a target is actually in reach\n    if (!chance(eff.chance)) return;     // …and not even then, every time\n    const taken = eff.power * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'chaos';\n    this.pushActor(victim, angleTo(d.pos, victim.pos), 60);\n    this.text(victim.pos, Math.round(taken).toString(), '#7fce6a', 13);\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.8, color: '#7fce6a', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) this.kill(victim);\n  }",
      "output": "export function sceneEffectTentacleSwing(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));\n    if (!victim) return;                 // only when a target is actually in reach\n    if (!chance(eff.chance)) return;     // …and not even then, every time\n    const taken = eff.power * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'chaos';\n    nativeHost.pushActor(victim, angleTo(d.pos, victim.pos), 60);\n    nativeHost.text(victim.pos, Math.round(taken).toString(), '#7fce6a', 13);\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.8, color: '#7fce6a', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);\n  }",
      "sourceSha256": "b09782d10ee30c2e33ee235264f7a6008ad26c7f825d477bccc42f8185323bf2",
      "outputSha256": "5725e47a72024c2cdedf3f349415961ee0958d170ae20a58065d9c00203e6aef"
    },
    {
      "name": "effectCrystalBeam",
      "fn": "sceneEffectCrystalBeam",
      "source": "private effectCrystalBeam(d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    const len = eff.radius, halfW = eff.width ?? 16;\n    // The beam's ELEMENT + tint are effect data ('gale_node' lances storm by\n    // default; a future kind says element:'cold' with one field).\n    const element = eff.element ?? 'lightning';\n    const col = eff.color ?? '#9fd8ff';\n    const dir = rand(0, Math.PI * 2);\n    const ex = Math.cos(dir), ey = Math.sin(dir);\n    // Beam visual (telegraph + strike in one — reuse facing for dir, radius for length).\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: len, color: col, life: 0.32, maxLife: 0.32, beam: true, facing: dir });\n    const dmg = eff.power + this.zone.level * 1.2;\n    for (const a of this.actors) {\n      if (!this.isEffectTarget(a, eff, d)) continue;\n      const rx = a.pos.x - d.pos.x, ry = a.pos.y - d.pos.y;\n      const t = rx * ex + ry * ey;                 // distance along the ray\n      if (t < 0 || t > len) continue;\n      if (Math.abs(rx * ey - ry * ex) > halfW + a.radius) continue; // perpendicular band\n      const taken = dmg * (1 - (resistValue(a, element) || 0)) * a.sheet.get('damageTaken');\n      a.life -= taken;\n      a.hitFlash = 0.15;\n      a.hitFlashType = element;\n      this.text(vec(a.pos.x, a.pos.y - 14), Math.round(taken).toString(), col, 12);\n      if (a.life <= 0 && !a.dead) this.kill(a);\n    }\n  }",
      "output": "export function sceneEffectCrystalBeam(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    const len = eff.radius, halfW = eff.width ?? 16;\n    // The beam's ELEMENT + tint are effect data ('gale_node' lances storm by\n    // default; a future kind says element:'cold' with one field).\n    const element = eff.element ?? 'lightning';\n    const col = eff.color ?? '#9fd8ff';\n    const dir = rand(0, Math.PI * 2);\n    const ex = Math.cos(dir), ey = Math.sin(dir);\n    // Beam visual (telegraph + strike in one — reuse facing for dir, radius for length).\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: len, color: col, life: 0.32, maxLife: 0.32, beam: true, facing: dir });\n    const dmg = eff.power + nativeHost.zone.level * 1.2;\n    for (const a of nativeHost.actors) {\n      if (!nativeHost.isEffectTarget(a, eff, d)) continue;\n      const rx = a.pos.x - d.pos.x, ry = a.pos.y - d.pos.y;\n      const t = rx * ex + ry * ey;                 // distance along the ray\n      if (t < 0 || t > len) continue;\n      if (Math.abs(rx * ey - ry * ex) > halfW + a.radius) continue; // perpendicular band\n      const taken = dmg * (1 - (resistValue(a, element) || 0)) * a.sheet.get('damageTaken');\n      a.life -= taken;\n      a.hitFlash = 0.15;\n      a.hitFlashType = element;\n      nativeHost.text(vec(a.pos.x, a.pos.y - 14), Math.round(taken).toString(), col, 12);\n      if (a.life <= 0 && !a.dead) nativeHost.kill(a);\n    }\n  }",
      "sourceSha256": "3a863f906e542908a7930ed2d060b038faf1a9310f1ac2c490e13658669017f8",
      "outputSha256": "31c1ac7fc543886a3a625aa0ee0a387499703fbd69b1b21eb447928baa2f2520"
    },
    {
      "name": "effectLavaOrb",
      "fn": "sceneEffectLavaOrb",
      "source": "private effectLavaOrb(d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    // The hurled skill is the EFFECT'S data (mintHazardCloud's pattern) — a\n    // vent can lob anything registered; magma_glob is only the default.\n    const skill = SKILLS[eff.skillId ?? 'magma_glob'];\n    if (!skill) return;\n    if (!this.hazardCaster) {\n      const c = new Actor('Volcano', 'player', vec(0, 0));\n      c.untargetable = true; c.invulnerable = true;\n      this.hazardCaster = c;\n    }\n    const caster = this.hazardCaster;\n    caster.level = Math.max(1, this.zone.level);\n    caster.pos = vec(d.pos.x, d.pos.y); // the vent is the source of the eruption\n    const inst = makeSkillInstance(skill, 1 + Math.floor(this.zone.level / 3));\n    const count = Math.max(1, eff.count ?? 1);\n    const ring = eff.ringRadius ?? eff.radius; // distance from the vent the crown lands at\n    const jitter = eff.jitter ?? 0;\n    const blast = eff.blast ?? 86;\n    const a0 = rand(0, Math.PI * 2); // the volley's orientation rotates each eruption\n    for (let i = 0; i < count; i++) {\n      const ang = a0 + (i / count) * Math.PI * 2;\n      const rr = ring + (jitter ? rand(-jitter, jitter) : 0);\n      const at = this.clampPos(vec(d.pos.x + Math.cos(ang) * rr, d.pos.y + Math.sin(ang) * rr), 12);\n      this.zones.push({\n        pos: at, radius: blast, caster, inst, color: eff.color ?? '#ff6a2a',\n        delay: 0.9 + i * (eff.stagger ?? 0), exploded: false, linger: 0,\n        tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,\n        // THE SENTRY LAW (Zone.spareDormant): the vent's own ambience passes\n        // dormant un-roused neutrals by — an ember vent chips + rouses\n        // nobody's sleeper (the kilnhoard's Urnfather) — while AWAKE bodies\n        // keep paying the field's toll (hitAll, the smoker economy).\n        dmgMult: 1, depth: 1, hitAll: true, meteor: true, spareDormant: true,\n      });\n    }\n  }",
      "output": "export function sceneEffectLavaOrb(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    // The hurled skill is the EFFECT'S data (mintHazardCloud's pattern) — a\n    // vent can lob anything registered; magma_glob is only the default.\n    const skill = SKILLS[eff.skillId ?? 'magma_glob'];\n    if (!skill) return;\n    if (!nativeHost.hazardCaster) {\n      const c = new Actor('Volcano', 'player', vec(0, 0));\n      c.untargetable = true; c.invulnerable = true;\n      nativeHost.hazardCaster = c;\n    }\n    const caster = nativeHost.hazardCaster;\n    caster.level = Math.max(1, nativeHost.zone.level);\n    caster.pos = vec(d.pos.x, d.pos.y); // the vent is the source of the eruption\n    const inst = makeSkillInstance(skill, 1 + Math.floor(nativeHost.zone.level / 3));\n    const count = Math.max(1, eff.count ?? 1);\n    const ring = eff.ringRadius ?? eff.radius; // distance from the vent the crown lands at\n    const jitter = eff.jitter ?? 0;\n    const blast = eff.blast ?? 86;\n    const a0 = rand(0, Math.PI * 2); // the volley's orientation rotates each eruption\n    for (let i = 0; i < count; i++) {\n      const ang = a0 + (i / count) * Math.PI * 2;\n      const rr = ring + (jitter ? rand(-jitter, jitter) : 0);\n      const at = nativeHost.clampPos(vec(d.pos.x + Math.cos(ang) * rr, d.pos.y + Math.sin(ang) * rr), 12);\n      nativeHost.zones.push({\n        pos: at, radius: blast, caster, inst, color: eff.color ?? '#ff6a2a',\n        delay: 0.9 + i * (eff.stagger ?? 0), exploded: false, linger: 0,\n        tickInterval: 0, tickTimer: 0, shape: 0, facing: 0,\n        // THE SENTRY LAW (Zone.spareDormant): the vent's own ambience passes\n        // dormant un-roused neutrals by — an ember vent chips + rouses\n        // nobody's sleeper (the kilnhoard's Urnfather) — while AWAKE bodies\n        // keep paying the field's toll (hitAll, the smoker economy).\n        dmgMult: 1, depth: 1, hitAll: true, meteor: true, spareDormant: true,\n      });\n    }\n  }",
      "sourceSha256": "d9b3694f769c28c7118293c9d291a29c3738f244fe3da6691dc43e9cd9bc45f2",
      "outputSha256": "cffedaa3b5b6a3759febbcfaff0053dc853a6c970e90f6c0bd707f8d8497b38e"
    },
    {
      "name": "effectHeatWash",
      "fn": "sceneEffectHeatWash",
      "source": "private effectHeatWash(d: Doodad, eff: DoodadEffect): void {\n    // Spatial-grid candidates (a caldera attaches this effect to THOUSANDS\n    // of discs — sweeping every actor per firing was the zone's biggest CPU\n    // regression). The grid returns build-order candidates, so the per-actor\n    // chance() rolls draw in exactly the order the full sweep drew them.\n    // The wash's ELEMENT + tint are effect data ('fire' classic; a rime node\n    // says element:'cold' — one field, same band physics).\n    const element = eff.element ?? 'fire';\n    const col = eff.color ?? '#ff8a3a';\n    for (const a of this.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, this.heatWashScratch)) {\n      if (a.dead || a.flying || a.construct || a.invulnerable) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate: the pool's own story\n      if (a.habitat?.kind === d.kind || a.immuneGround?.includes(d.kind)) continue;\n      const dd = dist(a.pos, d.pos);\n      if (dd <= d.radius || dd > d.radius + eff.radius) continue;\n      if (!chance(eff.chance)) continue;\n      const heat = eff.power * (1 + this.zone.level * 0.08)\n        * (1 - (resistValue(a, element) || 0));\n      if (heat <= 0) continue;\n      a.life -= heat;\n      a.hitFlash = 0.1;\n      a.hitFlashType = element;\n      this.flashes.push({\n        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 6,\n        color: col, life: 0.18, maxLife: 0.18,\n      });\n      if (a.life <= 0 && !a.dead) this.kill(a);\n    }\n  }",
      "output": "export function sceneEffectHeatWash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    // Spatial-grid candidates (a caldera attaches this effect to THOUSANDS\n    // of discs — sweeping every actor per firing was the zone's biggest CPU\n    // regression). The grid returns build-order candidates, so the per-actor\n    // chance() rolls draw in exactly the order the full sweep drew them.\n    // The wash's ELEMENT + tint are effect data ('fire' classic; a rime node\n    // says element:'cold' — one field, same band physics).\n    const element = eff.element ?? 'fire';\n    const col = eff.color ?? '#ff8a3a';\n    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.heatWashScratch)) {\n      if (a.dead || a.flying || a.construct || a.invulnerable) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate: the pool's own story\n      if (a.habitat?.kind === d.kind || a.immuneGround?.includes(d.kind)) continue;\n      const dd = dist(a.pos, d.pos);\n      if (dd <= d.radius || dd > d.radius + eff.radius) continue;\n      if (!chance(eff.chance)) continue;\n      const heat = eff.power * (1 + nativeHost.zone.level * 0.08)\n        * (1 - (resistValue(a, element) || 0));\n      if (heat <= 0) continue;\n      a.life -= heat;\n      a.hitFlash = 0.1;\n      a.hitFlashType = element;\n      nativeHost.flashes.push({\n        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 6,\n        color: col, life: 0.18, maxLife: 0.18,\n      });\n      if (a.life <= 0 && !a.dead) nativeHost.kill(a);\n    }\n  }",
      "sourceSha256": "04d1ed08efc2952b005528fe32d905954c7dcf564dbc9875aca2292bedd26f86",
      "outputSha256": "3c4db714ba3072469affe7b86f98344ff435a68a68a04e50183a2f66be34f365"
    },
    {
      "name": "effectDescentTrap",
      "fn": "sceneEffectDescentTrap",
      "source": "private effectDescentTrap(d: Doodad, eff: DoodadEffect): void {\n    const victim = this.nearestInReach(d.pos, eff.radius, x => this.isEffectTarget(x, eff, d));\n    if (!victim || !chance(eff.chance)) return;\n    const taken = (eff.power + this.zone.level * 0.8) * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'chaos';\n    this.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#a06ad8', 12);\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.85, color: '#a06ad8', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) this.kill(victim);\n  }",
      "output": "export function sceneEffectDescentTrap(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));\n    if (!victim || !chance(eff.chance)) return;\n    const taken = (eff.power + nativeHost.zone.level * 0.8) * (1 - resistValue(victim, 'chaos')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'chaos';\n    nativeHost.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#a06ad8', 12);\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.85, color: '#a06ad8', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);\n  }",
      "sourceSha256": "a6f2a205e9a5ae6368834d3ce1a22fbe29fdd35661a937f9de4ed8ff83f2edf4",
      "outputSha256": "0f5ea2df9a263154ecd3e46ee982dbd6720675ea363514ba84fd2936ca41f6a3"
    },
    {
      "name": "effectSporePuff",
      "fn": "sceneEffectSporePuff",
      "source": "private effectSporePuff(d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    this.mintHazardCloud(vec(d.pos.x, d.pos.y), { radius: eff.radius ?? 90, fx: eff.fx });\n  }",
      "output": "export function sceneEffectSporePuff(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    if (!chance(eff.chance)) return;\n    nativeHost.mintHazardCloud(vec(d.pos.x, d.pos.y), { radius: eff.radius ?? 90, fx: eff.fx });\n  }",
      "sourceSha256": "669f449bad92b0ff7a9751483016a0eafbc2640be0d98cefd6f2ddea86c06f51",
      "outputSha256": "6ed5ff9e282f8d10cba7f13f2a9bf19ff3d20cb90dcc060aa797a9f82bfa6272"
    },
    {
      "name": "effectGrowthLash",
      "fn": "sceneEffectGrowthLash",
      "source": "private effectGrowthLash(d: Doodad, eff: DoodadEffect): void {\n    const victim = this.nearestInReach(d.pos, eff.radius, x => this.isEffectTarget(x, eff, d));\n    if (!victim) return;\n    if (!chance(eff.chance)) return;\n    const taken = mitigateTyped(victim, { physical: eff.power });\n    if (taken <= 0 || victim.invulnerable) return;\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'physical';\n    this.text(victim.pos, Math.round(taken).toString(), '#6ac860', 12);\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: '#6ac860', life: 0.22, maxLife: 0.22 });\n    if (victim.life <= 0 && !victim.dead) this.kill(victim);\n  }",
      "output": "export function sceneEffectGrowthLash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));\n    if (!victim) return;\n    if (!chance(eff.chance)) return;\n    const taken = mitigateTyped(victim, { physical: eff.power });\n    if (taken <= 0 || victim.invulnerable) return;\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'physical';\n    nativeHost.text(victim.pos, Math.round(taken).toString(), '#6ac860', 12);\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: '#6ac860', life: 0.22, maxLife: 0.22 });\n    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);\n  }",
      "sourceSha256": "217e0868e70582da3c07b2863cdf995cd7fc8fa370510237d3dad069fff7ea47",
      "outputSha256": "8bedf5246937962f49c4ec24b1c63ee3b7000c76b02b00bd36b71de652ba5103"
    },
    {
      "name": "effectThicketHeal",
      "fn": "sceneEffectThicketHeal",
      "source": "private effectThicketHeal(d: Doodad, eff: DoodadEffect): void {\n    const kin = this.nearestInReach(d.pos, eff.radius,\n      x => this.isEffectTarget(x, eff, d) && x.life < x.maxLife());\n    if (!kin) return;\n    if (!chance(eff.chance)) return;\n    // Rule-row effects are authored once for every level — fold the zone in\n    // (the heat_wash idiom) so the mend keeps pace with the pools it fills.\n    const amount = eff.power * (1 + this.zone.level * 0.08);\n    const healed = Math.min(amount, kin.maxLife() - kin.life);\n    if (healed <= 0) return;\n    kin.life = Math.min(kin.life + amount, kin.maxLife());\n    const col = eff.color ?? '#8ae0a8';\n    this.text(kin.pos, '+' + Math.round(healed), col, 12);\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: col, life: 0.22, maxLife: 0.22 });\n  }",
      "output": "export function sceneEffectThicketHeal(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const kin = nativeHost.nearestInReach(d.pos, eff.radius,\n      x => nativeHost.isEffectTarget(x, eff, d) && x.life < x.maxLife());\n    if (!kin) return;\n    if (!chance(eff.chance)) return;\n    // Rule-row effects are authored once for every level — fold the zone in\n    // (the heat_wash idiom) so the mend keeps pace with the pools it fills.\n    const amount = eff.power * (1 + nativeHost.zone.level * 0.08);\n    const healed = Math.min(amount, kin.maxLife() - kin.life);\n    if (healed <= 0) return;\n    kin.life = Math.min(kin.life + amount, kin.maxLife());\n    const col = eff.color ?? '#8ae0a8';\n    nativeHost.text(kin.pos, '+' + Math.round(healed), col, 12);\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: eff.radius * 0.7, color: col, life: 0.22, maxLife: 0.22 });\n  }",
      "sourceSha256": "86f90eb056760c69faae4236fd83073df30a356987b313ae7f4b005fcae46b21",
      "outputSha256": "c40a0b8d0b9742423250b7d02aa5a5660fc1f912e101843255312c4893b78396"
    },
    {
      "name": "effectStatusWash",
      "fn": "sceneEffectStatusWash",
      "source": "private effectStatusWash(d: Doodad, eff: DoodadEffect): void {\n    const sid = eff.statusId;\n    if (!sid) return;\n    const sdef = STATUS_DEFS[sid];\n    const want = eff.power > 0 ? eff.power : (sdef?.duration ?? 3);\n    const col = eff.color ?? sdef?.color ?? '#dceafc';\n    for (const a of this.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, this.statusWashScratch)) {\n      if (a.dead || a.construct || a.invulnerable) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate\n      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;\n      if (!chance(eff.chance)) continue;\n      a.applyStatus(sid, 0, want / Math.max(0.01, sdef?.duration ?? want), d.kind);\n      this.flashes.push({\n        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 5,\n        color: col, life: 0.16, maxLife: 0.16,\n      });\n    }\n  }",
      "output": "export function sceneEffectStatusWash(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const sid = eff.statusId;\n    if (!sid) return;\n    const sdef = STATUS_DEFS[sid];\n    const want = eff.power > 0 ? eff.power : (sdef?.duration ?? 3);\n    const col = eff.color ?? sdef?.color ?? '#dceafc';\n    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.statusWashScratch)) {\n      if (a.dead || a.construct || a.invulnerable) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate\n      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;\n      if (!chance(eff.chance)) continue;\n      a.applyStatus(sid, 0, want / Math.max(0.01, sdef?.duration ?? want), d.kind);\n      nativeHost.flashes.push({\n        pos: vec(a.pos.x, a.pos.y), radius: a.radius + 5,\n        color: col, life: 0.16, maxLife: 0.16,\n      });\n    }\n  }",
      "sourceSha256": "582318c6256ca4ca449978d19e8d3f116ee4c7d270319ad4e6d9440bd1c74a64",
      "outputSha256": "04b4e7430f68075889754aa81e19e51274802863c3769441962af8fb11442e08"
    },
    {
      "name": "effectMawReel",
      "fn": "sceneEffectMawReel",
      "source": "private effectMawReel(d: Doodad, eff: DoodadEffect): void {\n    const victim = this.nearestInReach(d.pos, eff.radius, x => this.isEffectTarget(x, eff, d));\n    if (!victim || !chance(eff.chance)) return;\n    const gap = dist(victim.pos, d.pos);\n    const lip = d.radius + victim.radius + 6;\n    if (gap > lip) {\n      // The reel: a tongue-flick of impulse toward the pit, stronger the\n      // closer the catch (the maw commits to a nearly-landed meal).\n      const grip = 150 + 130 * Math.max(0, 1 - gap / eff.radius);\n      this.pushActor(victim, angleTo(victim.pos, d.pos), grip);\n      this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: Math.min(gap, eff.radius), color: '#b46a8a', life: 0.22, maxLife: 0.22, beam: true, facing: angleTo(d.pos, victim.pos) });\n      return;\n    }\n    // The bite: physical, through resistance, at the lip only.\n    const taken = (eff.power + this.zone.level * 0.9) * (1 - resistValue(victim, 'physical')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'physical';\n    this.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#b46a8a', 13);\n    this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.3, color: '#b46a8a', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) this.kill(victim);\n  }",
      "output": "export function sceneEffectMawReel(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    const victim = nativeHost.nearestInReach(d.pos, eff.radius, x => nativeHost.isEffectTarget(x, eff, d));\n    if (!victim || !chance(eff.chance)) return;\n    const gap = dist(victim.pos, d.pos);\n    const lip = d.radius + victim.radius + 6;\n    if (gap > lip) {\n      // The reel: a tongue-flick of impulse toward the pit, stronger the\n      // closer the catch (the maw commits to a nearly-landed meal).\n      const grip = 150 + 130 * Math.max(0, 1 - gap / eff.radius);\n      nativeHost.pushActor(victim, angleTo(victim.pos, d.pos), grip);\n      nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: Math.min(gap, eff.radius), color: '#b46a8a', life: 0.22, maxLife: 0.22, beam: true, facing: angleTo(d.pos, victim.pos) });\n      return;\n    }\n    // The bite: physical, through resistance, at the lip only.\n    const taken = (eff.power + nativeHost.zone.level * 0.9) * (1 - resistValue(victim, 'physical')) * victim.sheet.get('damageTaken');\n    victim.life -= taken;\n    victim.hitFlash = 0.15;\n    victim.hitFlashType = 'physical';\n    nativeHost.text(vec(victim.pos.x, victim.pos.y - 14), Math.round(taken).toString(), '#b46a8a', 13);\n    nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.3, color: '#b46a8a', life: 0.3, maxLife: 0.3 });\n    if (victim.life <= 0 && !victim.dead) nativeHost.kill(victim);\n  }",
      "sourceSha256": "5a5baa0355fa9a7c818a15dc03204ddbe2ebd61dac8a5053972beeeaeb9c9f40",
      "outputSha256": "d16958d43e774a04ac4f3390a4ede0d5112508f039babf205550bb54672e7a58"
    },
    {
      "name": "effectOrbSpring",
      "fn": "sceneEffectOrbSpring",
      "source": "private effectOrbSpring(d: Doodad, eff: DoodadEffect): void {\n    if (this.orbs.length >= ORB_CAP) return;\n    let anyNear = false;\n    for (const a of this.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, this.orbSpringScratch)) {\n      if (a.dead || a.construct) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate\n      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;\n      anyNear = true; break;\n    }\n    if (!anyNear || !chance(eff.chance)) return;\n    const kind = eff.orbKind\n      ?? ((this.orbSpringBreath = !this.orbSpringBreath) ? 'life' : 'mana');\n    if (!ORB_DEFS[kind]) return;\n    for (let i = 0; i < Math.max(1, Math.round(eff.power)); i++) {\n      this.shedOrb(kind, vec(d.pos.x, d.pos.y), { scatter: Math.max(16, d.radius * 0.6), tier: d.tier });\n    }\n    this.flashes.push({\n      pos: vec(d.pos.x, d.pos.y), radius: d.radius + 6,\n      color: eff.color ?? ORB_DEFS[kind].color ?? '#bfe8f4', life: 0.3, maxLife: 0.3,\n    });\n  }",
      "output": "export function sceneEffectOrbSpring(nativeHost:NativeSceneFrameHost, d: Doodad, eff: DoodadEffect): void {\n    if (nativeHost.orbs.length >= ORB_CAP) return;\n    let anyNear = false;\n    for (const a of nativeHost.actorsNear(d.pos.x, d.pos.y, d.radius + eff.radius, nativeHost.orbSpringScratch)) {\n      if (a.dead || a.construct) continue;\n      if (!sameStory(a, d)) continue; // the sovereignty gate\n      if (dist(a.pos, d.pos) > d.radius + eff.radius) continue;\n      anyNear = true; break;\n    }\n    if (!anyNear || !chance(eff.chance)) return;\n    const kind = eff.orbKind\n      ?? ((nativeHost.orbSpringBreath = !nativeHost.orbSpringBreath) ? 'life' : 'mana');\n    if (!ORB_DEFS[kind]) return;\n    for (let i = 0; i < Math.max(1, Math.round(eff.power)); i++) {\n      nativeHost.shedOrb(kind, vec(d.pos.x, d.pos.y), { scatter: Math.max(16, d.radius * 0.6), tier: d.tier });\n    }\n    nativeHost.flashes.push({\n      pos: vec(d.pos.x, d.pos.y), radius: d.radius + 6,\n      color: eff.color ?? ORB_DEFS[kind].color ?? '#bfe8f4', life: 0.3, maxLife: 0.3,\n    });\n  }",
      "sourceSha256": "27bcd7cd9b519fc9e3261d80ddd68b5c7243c0554527cb59083cfd802aba94b4",
      "outputSha256": "465f31e715e8f61e303cf958d91af276c2f0ad7de8f1b1b17674922dbdb4c385"
    },
    {
      "name": "eldritchCorruptMonsters",
      "fn": "sceneEldritchCorruptMonsters",
      "source": "private eldritchCorruptMonsters(intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.corruption;\n    if (cfg.perFire <= 0) return; // perFire 0 = this event is off\n    const foes = this.actors.filter(x => !x.dead && x.team === 'enemy' && !x.passive && x.tag !== 'ritual_cultist');\n    const fresh = foes.filter(x => !x.corrupted);\n    if (!fresh.length) return;\n    const budget = Math.floor(foes.length * cfg.maxFraction) - (foes.length - fresh.length);\n    if (budget <= 0) return;\n    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));\n    // Pick WITHOUT replacement (partial Fisher–Yates) so a fire corrupts n DISTINCT foes.\n    for (let k = 0; k < n; k++) {\n      const j = randInt(k, fresh.length - 1);\n      const f = fresh[j]; fresh[j] = fresh[k]; fresh[k] = f;\n      this.corruptActor(f, a);\n    }\n  }",
      "output": "export function sceneEldritchCorruptMonsters(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.corruption;\n    if (cfg.perFire <= 0) return; // perFire 0 = this event is off\n    const foes = nativeHost.actors.filter(x => !x.dead && x.team === 'enemy' && !x.passive && x.tag !== 'ritual_cultist');\n    const fresh = foes.filter(x => !x.corrupted);\n    if (!fresh.length) return;\n    const budget = Math.floor(foes.length * cfg.maxFraction) - (foes.length - fresh.length);\n    if (budget <= 0) return;\n    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));\n    // Pick WITHOUT replacement (partial Fisher–Yates) so a fire corrupts n DISTINCT foes.\n    for (let k = 0; k < n; k++) {\n      const j = randInt(k, fresh.length - 1);\n      const f = fresh[j]; fresh[j] = fresh[k]; fresh[k] = f;\n      nativeHost.corruptActor(f, a);\n    }\n  }",
      "sourceSha256": "cfd9768ed7b912355e6497b9259bf87c589b7a09c5d0ff89d91b91ade4ea7fda",
      "outputSha256": "a37ee65d8f074f50c377b8a0d087cd5b685e75158b19f693a38bef720e008dbf"
    },
    {
      "name": "eldritchTentacleField",
      "fn": "sceneEldritchTentacleField",
      "source": "private eldritchTentacleField(intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.tentacleField;\n    if (cfg.perFire <= 0) return; // perFire 0 = this event is off\n    const n = eventCount(cfg, intensity);\n    const blight = CREEPS['blightgrowth'];\n    for (let k = 0; k < n; k++) {\n      const at = this.clampPos(this.farPoint(cfg.farFrom), cfg.radius);\n      this.addTempGround(at, 'tentacle_field', cfg.radius, cfg.duration);\n      if (blight) this.creepEnsure()?.addSource(blight, at.x, at.y, { bornFrac: 0 });\n      this.flashes.push({ pos: vec(at.x, at.y), radius: cfg.radius, color: '#2a5a32', life: 0.5, maxLife: 0.5 });\n    }\n  }",
      "output": "export function sceneEldritchTentacleField(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.tentacleField;\n    if (cfg.perFire <= 0) return; // perFire 0 = this event is off\n    const n = eventCount(cfg, intensity);\n    const blight = CREEPS['blightgrowth'];\n    for (let k = 0; k < n; k++) {\n      const at = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom), cfg.radius);\n      nativeHost.addTempGround(at, 'tentacle_field', cfg.radius, cfg.duration);\n      if (blight) nativeHost.creepEnsure()?.addSource(blight, at.x, at.y, { bornFrac: 0 });\n      nativeHost.flashes.push({ pos: vec(at.x, at.y), radius: cfg.radius, color: '#2a5a32', life: 0.5, maxLife: 0.5 });\n    }\n  }",
      "sourceSha256": "83b3607b5f4a239a3d91c2b4ca4ebc13b3ba8564e49921fd8f0c6ac23e76c006",
      "outputSha256": "e764a253cd7ee9a51507ca8cc37cb7d8b506f07e94a5de25c88db8898e26e5bb"
    },
    {
      "name": "eldritchMutateDoodads",
      "fn": "sceneEldritchMutateDoodads",
      "source": "private eldritchMutateDoodads(intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.doodadMutation;\n    if (cfg.perFire <= 0) return;\n    const all = this.doodads.filter(d => doodadRuleOf(d.kind).mutable);\n    const fresh = all.filter(d => d.adorn !== 'tentacles');\n    if (!fresh.length) return;\n    const budget = Math.floor(all.length * cfg.maxFraction) - (all.length - fresh.length);\n    if (budget <= 0) return;\n    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));\n    for (let k = 0; k < n; k++) {\n      const j = randInt(k, fresh.length - 1);\n      const d = fresh[j]; fresh[j] = fresh[k]; fresh[k] = d;\n      d.adorn = 'tentacles';\n      if (chance(cfg.swingChance)) {\n        const sw = cfg.swing;\n        d.effect = {\n          id: 'tentacle_swing', faction: a.factions[0],\n          interval: sw.interval, cd: rand(0, sw.interval), radius: sw.radius,\n          chance: sw.chance, power: sw.power + this.zone.level * sw.powerPerLevel,\n        };\n      }\n      this.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.6, color: '#7fce6a', life: 0.4, maxLife: 0.4 });\n    }\n  }",
      "output": "export function sceneEldritchMutateDoodads(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.doodadMutation;\n    if (cfg.perFire <= 0) return;\n    const all = nativeHost.doodads.filter(d => doodadRuleOf(d.kind).mutable);\n    const fresh = all.filter(d => d.adorn !== 'tentacles');\n    if (!fresh.length) return;\n    const budget = Math.floor(all.length * cfg.maxFraction) - (all.length - fresh.length);\n    if (budget <= 0) return;\n    const n = Math.min(budget, fresh.length, eventCount(cfg, intensity));\n    for (let k = 0; k < n; k++) {\n      const j = randInt(k, fresh.length - 1);\n      const d = fresh[j]; fresh[j] = fresh[k]; fresh[k] = d;\n      d.adorn = 'tentacles';\n      if (chance(cfg.swingChance)) {\n        const sw = cfg.swing;\n        d.effect = {\n          id: 'tentacle_swing', faction: a.factions[0],\n          interval: sw.interval, cd: rand(0, sw.interval), radius: sw.radius,\n          chance: sw.chance, power: sw.power + nativeHost.zone.level * sw.powerPerLevel,\n        };\n      }\n      nativeHost.flashes.push({ pos: vec(d.pos.x, d.pos.y), radius: d.radius * 1.6, color: '#7fce6a', life: 0.4, maxLife: 0.4 });\n    }\n  }",
      "sourceSha256": "0a3d8eea1e6bf31e39556d03e2f8fdb7abe601decc0c4c121a1b261504c8d5df",
      "outputSha256": "781b5ad5ac248054c1085cf8441c882ea2f2eb002fbe2707cf6944840a1eb321"
    },
    {
      "name": "eldritchSpawn",
      "fn": "sceneEldritchSpawn",
      "source": "private eldritchSpawn(intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.spawn;\n    if (cfg.perFire <= 0) return;\n    const fac = a.factions[0];\n    const roster = FACTIONS[fac];\n    if (!roster?.table?.length) return;\n    const live = this.actors.filter(x => !x.dead && x.tag === 'eldritch_spawn' && x.faction === fac).length;\n    const room = cfg.maxAlive - live;\n    if (room <= 0) return;\n    const n = Math.min(room, eventCount(cfg, intensity));\n    for (let k = 0; k < n; k++) {\n      const lvl = Math.max(1, this.zone.level);\n      const m = this.createMonster(this.weightedPick(roster.table, lvl), lvl, 'enemy');\n      m.faction = fac;\n      m.tag = 'eldritch_spawn';\n      m.pos = this.clampPos(this.farPoint(cfg.farFrom), m.radius);\n      this.actors.push(m);\n      this.flashes.push({ pos: vec(m.pos.x, m.pos.y), radius: 52, color: '#7fce6a', life: 0.5, maxLife: 0.5 });\n    }\n  }",
      "output": "export function sceneEldritchSpawn(nativeHost:NativeSceneFrameHost, intensity: number, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.spawn;\n    if (cfg.perFire <= 0) return;\n    const fac = a.factions[0];\n    const roster = FACTIONS[fac];\n    if (!roster?.table?.length) return;\n    const live = nativeHost.actors.filter(x => !x.dead && x.tag === 'eldritch_spawn' && x.faction === fac).length;\n    const room = cfg.maxAlive - live;\n    if (room <= 0) return;\n    const n = Math.min(room, eventCount(cfg, intensity));\n    for (let k = 0; k < n; k++) {\n      const lvl = Math.max(1, nativeHost.zone.level);\n      const m = nativeHost.createMonster(nativeHost.weightedPick(roster.table, lvl), lvl, 'enemy');\n      m.faction = fac;\n      m.tag = 'eldritch_spawn';\n      m.pos = nativeHost.clampPos(nativeHost.farPoint(cfg.farFrom), m.radius);\n      nativeHost.actors.push(m);\n      nativeHost.flashes.push({ pos: vec(m.pos.x, m.pos.y), radius: 52, color: '#7fce6a', life: 0.5, maxLife: 0.5 });\n    }\n  }",
      "sourceSha256": "f803737694f576ff54b4c88f2de47fb2223705de26ccc9d46bc687157348a40b",
      "outputSha256": "00b7abfc031d34ca117a10f029a83492d50dc72561a711648ac81c42669a31ff"
    },
    {
      "name": "nearestInReach",
      "fn": "sceneNearestInReach",
      "source": "private nearestInReach(pos: Vec2, radius: number, accept: (a: Actor) => boolean): Actor | null {\n    // SOVEREIGNTY: seat — a helper — its callers gate through isEffectTarget (the derived census, probe_tiers RIG T).\n    let best: Actor | null = null, bd = Infinity;\n    for (const x of this.actors) {\n      if (!accept(x)) continue;\n      const dd = dist(x.pos, pos) - x.radius;\n      if (dd > radius) continue;\n      if (dd < bd) { bd = dd; best = x; }\n    }\n    return best;\n  }",
      "output": "export function sceneNearestInReach(nativeHost:NativeSceneFrameHost, pos: Vec2, radius: number, accept: (a: Actor) => boolean): Actor | null {\n    // SOVEREIGNTY: seat — a helper — its callers gate through isEffectTarget (the derived census, probe_tiers RIG T).\n    let best: Actor | null = null, bd = Infinity;\n    for (const x of nativeHost.actors) {\n      if (!accept(x)) continue;\n      const dd = dist(x.pos, pos) - x.radius;\n      if (dd > radius) continue;\n      if (dd < bd) { bd = dd; best = x; }\n    }\n    return best;\n  }",
      "sourceSha256": "79192745560e2163ea0369439261c0e393c478fe40ca4c696c53864dbe20d26d",
      "outputSha256": "90f9227839b1df4a8be59bd56b68daf679dcf6a8c3490fe1dda40461230750de"
    },
    {
      "name": "isEffectTarget",
      "fn": "sceneIsEffectTarget",
      "source": "private isEffectTarget(x: Actor, eff: DoodadEffect, d: Doodad): boolean {\n    if (x.dead || x.downed || x.passive || x.construct) return false;\n    if (!sameStory(x, d)) return false; // the sovereignty gate: a fixture reaches its own story\n    if (eff.target === 'owner') {\n      const owner = this.actors.find(a => a.id === eff.ownerId && !a.dead);\n      if (!owner) return false;\n      return owner.team === 'player'\n        ? x.team === 'enemy'\n        : x.team === 'player' && x.kind !== 'minion' && x.kind !== 'mercenary';\n    }\n    if (eff.target === 'ally') return !!eff.faction && x.faction === eff.faction;\n    // Opponents: the hero(es) — but NOT the player's own minions/mercs (match the\n    // hitAll convention) — and enemies not of the effect's OWN faction. A faction-\n    // LESS hazard (crystal beam, lava) has eff.faction undefined → it hits ALL enemies.\n    if (x.team === 'player') return x.kind !== 'minion' && x.kind !== 'mercenary';\n    return x.team === 'enemy' && (eff.faction === undefined || x.faction !== eff.faction);\n  }",
      "output": "export function sceneIsEffectTarget(nativeHost:NativeSceneFrameHost, x: Actor, eff: DoodadEffect, d: Doodad): boolean {\n    if (x.dead || x.downed || x.passive || x.construct) return false;\n    if (!sameStory(x, d)) return false; // the sovereignty gate: a fixture reaches its own story\n    if (eff.target === 'owner') {\n      const owner = nativeHost.actors.find(a => a.id === eff.ownerId && !a.dead);\n      if (!owner) return false;\n      return owner.team === 'player'\n        ? x.team === 'enemy'\n        : x.team === 'player' && x.kind !== 'minion' && x.kind !== 'mercenary';\n    }\n    if (eff.target === 'ally') return !!eff.faction && x.faction === eff.faction;\n    // Opponents: the hero(es) — but NOT the player's own minions/mercs (match the\n    // hitAll convention) — and enemies not of the effect's OWN faction. A faction-\n    // LESS hazard (crystal beam, lava) has eff.faction undefined → it hits ALL enemies.\n    if (x.team === 'player') return x.kind !== 'minion' && x.kind !== 'mercenary';\n    return x.team === 'enemy' && (eff.faction === undefined || x.faction !== eff.faction);\n  }",
      "sourceSha256": "6a94b7600e29bd9a387cf216a6f642674da6193a3695c3f7d6b9c69a80d01297",
      "outputSha256": "bcac07ec4b238b5ca4479c96565fbc9ae7e14e02258c9fa3c4cbb6ed93198cd2"
    },
    {
      "name": "corruptActor",
      "fn": "sceneCorruptActor",
      "source": "private corruptActor(f: Actor, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.corruption;\n    f.corrupted = true;\n    f.adorn = 'tentacles';\n    f.sheet.setSource('eldritch_corruption', [mod('damage', 'more', cfg.dmgMore), mod('life', 'more', cfg.lifeMore)]);\n    if (cfg.grantSkill && SKILLS[cfg.grantSkill]) {\n      f.skills.push(makeSkillInstance(SKILLS[cfg.grantSkill], 1 + Math.floor((f.level - 1) / 4)));\n    }\n    this.flashes.push({ pos: vec(f.pos.x, f.pos.y), radius: f.radius * 2.2, color: '#7fce6a', life: 0.4, maxLife: 0.4 });\n  }",
      "output": "export function sceneCorruptActor(nativeHost:NativeSceneFrameHost, f: Actor, a: IncursionArchetype): void {\n    const cfg = a.eventConfig.corruption;\n    f.corrupted = true;\n    f.adorn = 'tentacles';\n    f.sheet.setSource('eldritch_corruption', [mod('damage', 'more', cfg.dmgMore), mod('life', 'more', cfg.lifeMore)]);\n    if (cfg.grantSkill && SKILLS[cfg.grantSkill]) {\n      f.skills.push(makeSkillInstance(SKILLS[cfg.grantSkill], 1 + Math.floor((f.level - 1) / 4)));\n    }\n    nativeHost.flashes.push({ pos: vec(f.pos.x, f.pos.y), radius: f.radius * 2.2, color: '#7fce6a', life: 0.4, maxLife: 0.4 });\n  }",
      "sourceSha256": "17eb08f8f187cdb7e6fdbea8282963ba40146816e13e91174e9c623e09e07385",
      "outputSha256": "528a68e8c98678c294d62b03ca2121bc78a2aa71d1a3a60551d59316354be9d8"
    }
  ],
  "factories": [
    {
      "name": "collectDeedDot",
      "fn": "createNativeFrameCollectDeedDot",
      "source": "private collectDeedDot = (status: ActiveStatus, amount: number, type: DamageType | 'untyped'): void => {\n    const source = status.casterId === undefined ? undefined : this.actorById(status.casterId);\n    if (!source || !this.deedOwned(source)) return;\n    this.deedDotAmounts ??= {};\n    this.deedDotAmounts[type] = (this.deedDotAmounts[type] ?? 0) + amount;\n  };",
      "initializer": "(status: ActiveStatus, amount: number, type: DamageType | 'untyped'): void => {\n    const source = status.casterId === undefined ? undefined : this.actorById(status.casterId);\n    if (!source || !this.deedOwned(source)) return;\n    this.deedDotAmounts ??= {};\n    this.deedDotAmounts[type] = (this.deedDotAmounts[type] ?? 0) + amount;\n  }",
      "output": "export function createNativeFrameCollectDeedDot(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost[\"collectDeedDot\"] {\n return (status: ActiveStatus, amount: number, type: DamageType | 'untyped'): void => {\n    const source = status.casterId === undefined ? undefined : nativeHost.actorById(status.casterId);\n    if (!source || !nativeHost.deedOwned(source)) return;\n    nativeHost.deedDotAmounts ??= {};\n    nativeHost.deedDotAmounts[type] = (nativeHost.deedDotAmounts[type] ?? 0) + amount;\n  };\n}",
      "sourceSha256": "9607e813d2fe039a9149cfa9f195dd66c4435163c96e9840e1527e2498803452",
      "initializerSha256": "e42ce3e5e0cd882d432416ef22cb0597edf5224bf91de11f80f5f6d1666487c8",
      "outputSha256": "6e81d418a698a6e73480f204f815d5b9052e958c34437dfeff358b1f0a2f333f"
    },
    {
      "name": "doodadEffects",
      "fn": "createNativeFrameDoodadEffects",
      "source": "private readonly doodadEffects: Record<string, (d: Doodad, eff: DoodadEffect) => void> = {\n    tentacle_swing: (d, eff) => this.effectTentacleSwing(d, eff),\n    crystal_beam: (d, eff) => this.effectCrystalBeam(d, eff),\n    lava_orb: (d, eff) => this.effectLavaOrb(d, eff),\n    heat_wash: (d, eff) => this.effectHeatWash(d, eff),\n    descent_trap: (d, eff) => this.effectDescentTrap(d, eff),\n    spore_puff: (d, eff) => this.effectSporePuff(d, eff),\n    growth_lash: (d, eff) => this.effectGrowthLash(d, eff),\n    thicket_heal: (d, eff) => this.effectThicketHeal(d, eff),\n    status_wash: (d, eff) => this.effectStatusWash(d, eff),\n    maw_reel: (d, eff) => this.effectMawReel(d, eff),\n    orb_spring: (d, eff) => this.effectOrbSpring(d, eff),\n  };",
      "initializer": "{\n    tentacle_swing: (d, eff) => this.effectTentacleSwing(d, eff),\n    crystal_beam: (d, eff) => this.effectCrystalBeam(d, eff),\n    lava_orb: (d, eff) => this.effectLavaOrb(d, eff),\n    heat_wash: (d, eff) => this.effectHeatWash(d, eff),\n    descent_trap: (d, eff) => this.effectDescentTrap(d, eff),\n    spore_puff: (d, eff) => this.effectSporePuff(d, eff),\n    growth_lash: (d, eff) => this.effectGrowthLash(d, eff),\n    thicket_heal: (d, eff) => this.effectThicketHeal(d, eff),\n    status_wash: (d, eff) => this.effectStatusWash(d, eff),\n    maw_reel: (d, eff) => this.effectMawReel(d, eff),\n    orb_spring: (d, eff) => this.effectOrbSpring(d, eff),\n  }",
      "output": "export function createNativeFrameDoodadEffects(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost[\"doodadEffects\"] {\n return {\n    tentacle_swing: (d, eff) => nativeHost.effectTentacleSwing(d, eff),\n    crystal_beam: (d, eff) => nativeHost.effectCrystalBeam(d, eff),\n    lava_orb: (d, eff) => nativeHost.effectLavaOrb(d, eff),\n    heat_wash: (d, eff) => nativeHost.effectHeatWash(d, eff),\n    descent_trap: (d, eff) => nativeHost.effectDescentTrap(d, eff),\n    spore_puff: (d, eff) => nativeHost.effectSporePuff(d, eff),\n    growth_lash: (d, eff) => nativeHost.effectGrowthLash(d, eff),\n    thicket_heal: (d, eff) => nativeHost.effectThicketHeal(d, eff),\n    status_wash: (d, eff) => nativeHost.effectStatusWash(d, eff),\n    maw_reel: (d, eff) => nativeHost.effectMawReel(d, eff),\n    orb_spring: (d, eff) => nativeHost.effectOrbSpring(d, eff),\n  };\n}",
      "sourceSha256": "df0ee2d42b0d668959db25d781d02ab87d8a72362dbead66b84daa9fcfd28ecf",
      "initializerSha256": "15bc3a475b578b10b09497283129e1e4a895b7e0af1727a486431f566038ae25",
      "outputSha256": "34dd17699224b21df42f7f5715818a7c7d2efcec1df55d9e10cb87f60917d0f9"
    },
    {
      "name": "incursionEvents",
      "fn": "createNativeFrameIncursionEvents",
      "source": "private readonly incursionEvents: Record<string, (intensity: number, a: IncursionArchetype) => void> = {\n    monster_corruption: (i, a) => this.eldritchCorruptMonsters(i, a),\n    tentacle_field: (i, a) => this.eldritchTentacleField(i, a),\n    doodad_mutation: (i, a) => this.eldritchMutateDoodads(i, a),\n    eldritch_spawn: (i, a) => this.eldritchSpawn(i, a),\n  };",
      "initializer": "{\n    monster_corruption: (i, a) => this.eldritchCorruptMonsters(i, a),\n    tentacle_field: (i, a) => this.eldritchTentacleField(i, a),\n    doodad_mutation: (i, a) => this.eldritchMutateDoodads(i, a),\n    eldritch_spawn: (i, a) => this.eldritchSpawn(i, a),\n  }",
      "output": "export function createNativeFrameIncursionEvents(nativeHost:NativeSceneFrameHost):NativeSceneFrameHost[\"incursionEvents\"] {\n return {\n    monster_corruption: (i, a) => nativeHost.eldritchCorruptMonsters(i, a),\n    tentacle_field: (i, a) => nativeHost.eldritchTentacleField(i, a),\n    doodad_mutation: (i, a) => nativeHost.eldritchMutateDoodads(i, a),\n    eldritch_spawn: (i, a) => nativeHost.eldritchSpawn(i, a),\n  };\n}",
      "sourceSha256": "de564d1bc0d3fc1bf154808c13c6af83cf1f5facaf129fee5a17a5760486e421",
      "initializerSha256": "86d131118ae13b8df85ecafb0b4837cc9699e2dae853bf1d2f45286cf181eef3",
      "outputSha256": "c6431dfa43ad8d3ed70b33fda7d5ceac3205a902e3f70e52b194226064c29d3b"
    }
  ],
  "helpers": [
    {
      "name": "eventCount",
      "source": "function eventCount(cfg: { perFire: number; intensityFloor: number; intensityGain: number }, intensity: number): number {\n  return Math.max(1, Math.round(cfg.perFire * (cfg.intensityFloor + cfg.intensityGain * intensity)));\n}",
      "output": "export function eventCount(cfg: { perFire: number; intensityFloor: number; intensityGain: number }, intensity: number): number {\n  return Math.max(1, Math.round(cfg.perFire * (cfg.intensityFloor + cfg.intensityGain * intensity)));\n}",
      "sourceSha256": "747abd4be8790735c2f209edb3e8d49b1bf57dae88ae6c1d76c4e7d8a5ca9bfd"
    }
  ],
  "properties": [
    {
      "name": "nearestInReach",
      "writes": []
    },
    {
      "name": "isEffectTarget",
      "writes": []
    },
    {
      "name": "pushActor",
      "writes": []
    },
    {
      "name": "text",
      "writes": []
    },
    {
      "name": "flashes",
      "writes": []
    },
    {
      "name": "kill",
      "writes": []
    },
    {
      "name": "zone",
      "writes": []
    },
    {
      "name": "actors",
      "writes": []
    },
    {
      "name": "hazardCaster",
      "writes": [
        "effectLavaOrb",
        "effectLavaOrb"
      ]
    },
    {
      "name": "clampPos",
      "writes": []
    },
    {
      "name": "zones",
      "writes": []
    },
    {
      "name": "actorsNear",
      "writes": []
    },
    {
      "name": "heatWashScratch",
      "writes": []
    },
    {
      "name": "mintHazardCloud",
      "writes": []
    },
    {
      "name": "statusWashScratch",
      "writes": []
    },
    {
      "name": "orbs",
      "writes": []
    },
    {
      "name": "orbSpringScratch",
      "writes": []
    },
    {
      "name": "orbSpringBreath",
      "writes": [
        "effectOrbSpring",
        "effectOrbSpring"
      ]
    },
    {
      "name": "shedOrb",
      "writes": []
    },
    {
      "name": "corruptActor",
      "writes": []
    },
    {
      "name": "farPoint",
      "writes": []
    },
    {
      "name": "addTempGround",
      "writes": []
    },
    {
      "name": "creepEnsure",
      "writes": []
    },
    {
      "name": "doodads",
      "writes": []
    },
    {
      "name": "createMonster",
      "writes": []
    },
    {
      "name": "weightedPick",
      "writes": []
    },
    {
      "name": "actorById",
      "writes": []
    },
    {
      "name": "deedOwned",
      "writes": []
    },
    {
      "name": "deedDotAmounts",
      "writes": [
        "initializer"
      ]
    },
    {
      "name": "effectTentacleSwing",
      "writes": []
    },
    {
      "name": "effectCrystalBeam",
      "writes": []
    },
    {
      "name": "effectLavaOrb",
      "writes": []
    },
    {
      "name": "effectHeatWash",
      "writes": []
    },
    {
      "name": "effectDescentTrap",
      "writes": []
    },
    {
      "name": "effectSporePuff",
      "writes": []
    },
    {
      "name": "effectGrowthLash",
      "writes": []
    },
    {
      "name": "effectThicketHeal",
      "writes": []
    },
    {
      "name": "effectStatusWash",
      "writes": []
    },
    {
      "name": "effectMawReel",
      "writes": []
    },
    {
      "name": "effectOrbSpring",
      "writes": []
    },
    {
      "name": "eldritchCorruptMonsters",
      "writes": []
    },
    {
      "name": "eldritchTentacleField",
      "writes": []
    },
    {
      "name": "eldritchMutateDoodads",
      "writes": []
    },
    {
      "name": "eldritchSpawn",
      "writes": []
    }
  ],
  "hostAdded": [
    {
      "name": "nearestInReach",
      "writes": []
    },
    {
      "name": "isEffectTarget",
      "writes": []
    },
    {
      "name": "hazardCaster",
      "writes": [
        "effectLavaOrb",
        "effectLavaOrb"
      ]
    },
    {
      "name": "heatWashScratch",
      "writes": []
    },
    {
      "name": "mintHazardCloud",
      "writes": []
    },
    {
      "name": "statusWashScratch",
      "writes": []
    },
    {
      "name": "orbSpringScratch",
      "writes": []
    },
    {
      "name": "orbSpringBreath",
      "writes": [
        "effectOrbSpring",
        "effectOrbSpring"
      ]
    },
    {
      "name": "corruptActor",
      "writes": []
    },
    {
      "name": "addTempGround",
      "writes": []
    },
    {
      "name": "deedOwned",
      "writes": []
    },
    {
      "name": "effectTentacleSwing",
      "writes": []
    },
    {
      "name": "effectCrystalBeam",
      "writes": []
    },
    {
      "name": "effectLavaOrb",
      "writes": []
    },
    {
      "name": "effectHeatWash",
      "writes": []
    },
    {
      "name": "effectDescentTrap",
      "writes": []
    },
    {
      "name": "effectSporePuff",
      "writes": []
    },
    {
      "name": "effectGrowthLash",
      "writes": []
    },
    {
      "name": "effectThicketHeal",
      "writes": []
    },
    {
      "name": "effectStatusWash",
      "writes": []
    },
    {
      "name": "effectMawReel",
      "writes": []
    },
    {
      "name": "effectOrbSpring",
      "writes": []
    },
    {
      "name": "eldritchCorruptMonsters",
      "writes": []
    },
    {
      "name": "eldritchTentacleField",
      "writes": []
    },
    {
      "name": "eldritchMutateDoodads",
      "writes": []
    },
    {
      "name": "eldritchSpawn",
      "writes": []
    }
  ],
  "fields": [
    {
      "name": "hazardCaster",
      "source": "private hazardCaster: Actor | null = null;",
      "initializer": "null",
      "sourceSha256": "895572069f0308a5e265f7039acb9afc45692af8761a05b72160f0a2513dad78"
    },
    {
      "name": "heatWashScratch",
      "source": "private heatWashScratch: Actor[] = [];",
      "initializer": "[]",
      "sourceSha256": "cb77a6e5c916f1d1a4b397d30c1a4c200fe4557c67bf7632b4252180048f61f9"
    },
    {
      "name": "statusWashScratch",
      "source": "private readonly statusWashScratch: Actor[] = [];",
      "initializer": "[]",
      "sourceSha256": "1d604c824a5da091262cf424056b720b606629a39624b16d18d6b7c247048a42"
    },
    {
      "name": "orbSpringScratch",
      "source": "private readonly orbSpringScratch: Actor[] = [];",
      "initializer": "[]",
      "sourceSha256": "23610f52cc0d5bd3ecbcb3db69dabd8eae38cbc034662cb1c0ab980cd08a2079"
    },
    {
      "name": "orbSpringBreath",
      "source": "private orbSpringBreath = false;",
      "initializer": "false",
      "sourceSha256": "4a61187ec2dfd220c2c41a8cb87aa404208e3c949e9990240ee19214082366b9"
    }
  ]
} as const;
