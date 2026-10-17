/** Immutable original42 movement source. */
export const nativeSceneCombatMotionArchive={
  "pin": "42f95716294995cbdd83785f0a0782ddda971f76",
  "worldSha256": "8e0d385e1bb4e0a80a13e64a964c5d5f6be2941e342e35645dbf5d91d1caf398",
  "methods": [
    {
      "name": "drainSurvival",
      "fn": "sceneDrainSurvival",
      "kind": "method",
      "line": 49253,
      "source": "private drainSurvival(a: Actor, resource: string, drain: number, dt: number): void {\n    const def = survivalResource(resource);\n    if (!def) return;\n    if (!a.survival) a.survival = new Map();\n    const v = Math.max(0, (a.survival.get(resource) ?? def.max) - this.survivalDrainRate(a, resource, drain) * dt);\n    a.survival.set(resource, v);\n    if (v > 0) { if (a.underflowSince) delete a.underflowSince[resource]; return; } // refilled → THAT meter's ramp resets\n    if (def.underflowPctLifePerSec > 0 && !a.invulnerable) {\n      // RAMPING underflow, clocked PER RESOURCE: from underflowPctLifePerSec up to\n      // underflowRampTo over underflowRampSecs of continuous emptiness — the dread of\n      // staying down (breath: 5%→25% / sec over 10s; light gnaws the same shape under\n      // the Gloaming). A flat row (underflow 0) never enters here, and every knob —\n      // rates, ramp, warning text + colour — lives on the SURVIVAL_RESOURCES row.\n      const since = (a.underflowSince ??= {});\n      if (since[resource] === undefined) since[resource] = this.time;\n      let pct = def.underflowPctLifePerSec;\n      if (def.underflowRampTo !== undefined && def.underflowRampSecs) {\n        const t = clamp((this.time - since[resource]) / def.underflowRampSecs, 0, 1);\n        pct = def.underflowPctLifePerSec + (def.underflowRampTo - def.underflowPctLifePerSec) * t;\n      }\n      a.life -= a.maxLife() * pct * dt;\n      // Throttle the warning on a dedicated per-resource timer (NOT movement) so it\n      // shows once every ~0.8s whether the suffering actor is still or moving.\n      const gasp = (a.lastGaspAt ??= {});\n      if (this.time - (gasp[resource] ?? -9) >= 0.8) {\n        gasp[resource] = this.time;\n        this.text(a.pos, def.underflowText ?? 'failing!', def.underflowTextColor ?? def.color, 12);\n      }\n      if (a.life <= 0 && !a.dead) this.kill(a, false);\n    }\n  }",
      "sourceSha256": "848bba8f8722a92549d8fa489a8848d70500599328f373c9e811d9e299f20080",
      "output": "export function sceneDrainSurvival(host:NativeSceneCombatMotionHost, a: Actor, resource: string, drain: number, dt: number): void {\n    const def = survivalResource(resource);\n    if (!def) return;\n    if (!a.survival) a.survival = new Map();\n    const v = Math.max(0, (a.survival.get(resource) ?? def.max) - host.survivalDrainRate(a, resource, drain) * dt);\n    a.survival.set(resource, v);\n    if (v > 0) { if (a.underflowSince) delete a.underflowSince[resource]; return; } // refilled → THAT meter's ramp resets\n    if (def.underflowPctLifePerSec > 0 && !a.invulnerable) {\n      // RAMPING underflow, clocked PER RESOURCE: from underflowPctLifePerSec up to\n      // underflowRampTo over underflowRampSecs of continuous emptiness — the dread of\n      // staying down (breath: 5%→25% / sec over 10s; light gnaws the same shape under\n      // the Gloaming). A flat row (underflow 0) never enters here, and every knob —\n      // rates, ramp, warning text + colour — lives on the SURVIVAL_RESOURCES row.\n      const since = (a.underflowSince ??= {});\n      if (since[resource] === undefined) since[resource] = host.time;\n      let pct = def.underflowPctLifePerSec;\n      if (def.underflowRampTo !== undefined && def.underflowRampSecs) {\n        const t = clamp((host.time - since[resource]) / def.underflowRampSecs, 0, 1);\n        pct = def.underflowPctLifePerSec + (def.underflowRampTo - def.underflowPctLifePerSec) * t;\n      }\n      a.life -= a.maxLife() * pct * dt;\n      // Throttle the warning on a dedicated per-resource timer (NOT movement) so it\n      // shows once every ~0.8s whether the suffering actor is still or moving.\n      const gasp = (a.lastGaspAt ??= {});\n      if (host.time - (gasp[resource] ?? -9) >= 0.8) {\n        gasp[resource] = host.time;\n        host.text(a.pos, def.underflowText ?? 'failing!', def.underflowTextColor ?? def.color, 12);\n      }\n      if (a.life <= 0 && !a.dead) host.kill(a, false);\n    }\n  }",
      "outputSha256": "e9fdd873cd70f5f8f867ff393cabdc7060ee54399a6bd4dbfbb998c8823a13a1"
    },
    {
      "name": "imminentThreatTo",
      "fn": "sceneImminentThreatTo",
      "kind": "method",
      "line": 10767,
      "source": "imminentThreatTo(actor: Actor, pad: number):\n    { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null {\n    let best: { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null = null;\n    for (const z of this.zones) {\n      if (z.exploded || z.delay <= 0) continue;\n      if (z.delay > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (z.caster === actor) continue;\n      if (!z.hitAll && !this.hostileTo(z.caster, actor)) continue;\n      const r = z.radius + pad;\n      if (dist(actor.pos, z.pos) > r) continue;\n      if (!best || z.delay < best.eta) {\n        best = { ref: z, pos: z.pos, radius: r, eta: z.delay,\n          casterPos: vec(z.caster.pos.x, z.caster.pos.y) };\n      }\n    }\n    for (const e of this.enemiesOf(actor)) {\n      const cs = e.casting;\n      if (!cs || cs.mode === 'channel' || cs.mode === 'guard') continue;\n      const eta = cs.total - cs.elapsed;\n      if (eta <= 0.08 || eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n      const del = cs.inst.def.delivery as { type: string; radius?: number; vent?: { columnR: number } };\n      // THE VENT-RIDE's broil (LeapDelivery.vent): a vent-leaper's wind-up is\n      // a column-to-be under its own feet — the dodge-mind reads the same\n      // drawn roil the eyes do (drawn == tested) and steps off it.\n      const ventR = del.type === 'leap' && del.vent ? del.vent.columnR : undefined;\n      if (del.type !== 'ground' && del.type !== 'nova' && ventR === undefined) continue;\n      if (!del.radius && ventR === undefined) continue;\n      const at = del.type === 'nova' || ventR !== undefined ? e.pos : cs.aim;\n      const r = (ventR ?? del.radius ?? 0) + pad;\n      if (dist(actor.pos, at) > r) continue;\n      if (!best || eta < best.eta) {\n        best = { ref: cs, pos: vec(at.x, at.y), radius: r, eta,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TELEGRAPHED LEAPS (LeapDelivery.telegraph): a diving body's painted\n    // landing ring is a threat like any un-exploded disc — dodge-minds read\n    // the stoop exactly the way the player's eyes do. Scanned off the raw\n    // actor list because a leaper is untargetable (it vanishes from\n    // enemiesOf mid-flight) yet its landing is the one thing that matters.\n    for (const e of this.actors) {\n      const L = e.leap;\n      if (!L?.telegraph || e === actor || e.dead) continue;\n      if (L.timer > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (!this.hostileTo(e, actor)) continue;\n      const r = L.radius + pad;\n      if (dist(actor.pos, L.dest) > r) continue;\n      if (!best || L.timer < best.eta) {\n        best = { ref: L, pos: vec(L.dest.x, L.dest.y), radius: r, eta: L.timer,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TRACK RIDERS (the track fabric): a blade closing on this body is a\n    // threat like any un-exploded disc — and because rider motion is a pure\n    // function of the clock, the scan samples the ACTUAL future, not an\n    // estimate. The player's eyes (the warn arc) and this read are one truth\n    // from one resolver.\n    for (const tr of this.tracks) {\n      if (!tr.armed || trackDone(tr, this.time)) continue;   // retracted / retired lanes threaten nothing\n      const b = tr.bound;\n      const margin = pad + actor.radius + 40;\n      if (actor.pos.x < b.x0 - margin || actor.pos.x > b.x1 + margin ||\n          actor.pos.y < b.y0 - margin || actor.pos.y > b.y1 + margin) continue;\n      const horizon = Math.min(TRACK_CFG.threatHorizon, BEHAVIOR_CFG.dodgeHorizon);\n      for (const r of tr.riders) {\n        const p = r.def.payload;\n        if (!p.hit && !p.impulse) continue;\n        for (let t = TRACK_CFG.threatStep; t <= horizon; t += TRACK_CFG.threatStep) {\n          const pose = trackPose(tr, this.time + t, r.phase, r.def);\n          if (pose.pending) continue;                        // the bolt still in the wall — real only past bornAt\n          if (!shapeContains(riderSurface(r.def, pose), pose.x, pose.y,\n            actor.pos.x, actor.pos.y, actor.radius + pad)) continue;\n          if (!best || t < best.eta) {\n            const reach = r.def.surface.kind === 'circle'\n              ? r.def.surface.r : Math.hypot(r.def.surface.hw, r.def.surface.hh);\n            best = { ref: r, pos: vec(pose.x, pose.y), radius: reach + pad, eta: t };\n          }\n          break; // first cover is the read — later samples only age it\n        }\n      }\n    }\n    // GEYSER VENTS (the geyser fabric): a broiling vent's coming column is\n    // a threat like any un-exploded disc — the dodge-mind reads the SAME\n    // pure resolver the drawn broil rises from (drawn == tested; the vent\n    // object is the stable ref, so the read rolls once per telegraph). The\n    // dodge horizon clips the ~2s broil to its last stretch — the locals\n    // step off \"one breath before\", exactly the charter's tell.\n    if (this.geysers) {\n      for (const v of this.geysers.vents) {\n        const r = GEYSER_CFG.classes[v.cls].columnR + pad;\n        if (dist(actor.pos, v.pos) > r) continue;\n        const read = ventReadAt(this.geysers, v, this.time, this.geyserMode);\n        const eta = read.phase === 'erupt' ? 0.05 : read.toBurst;\n        if (eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n        if (!best || eta < best.eta) {\n          best = { ref: v, pos: vec(v.pos.x, v.pos.y), radius: r, eta };\n        }\n      }\n    }\n    return best;\n  }",
      "sourceSha256": "bd44af642313e412d776dae05b578d68d6fdf8ba1f2eed8d95827bdaf4d5713e",
      "output": "export function sceneImminentThreatTo(host:NativeSceneCombatMotionHost, actor: Actor, pad: number):\n    { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null {\n    let best: { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null = null;\n    for (const z of host.zones) {\n      if (z.exploded || z.delay <= 0) continue;\n      if (z.delay > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (z.caster === actor) continue;\n      if (!z.hitAll && !host.hostileTo(z.caster, actor)) continue;\n      const r = z.radius + pad;\n      if (dist(actor.pos, z.pos) > r) continue;\n      if (!best || z.delay < best.eta) {\n        best = { ref: z, pos: z.pos, radius: r, eta: z.delay,\n          casterPos: vec(z.caster.pos.x, z.caster.pos.y) };\n      }\n    }\n    for (const e of host.enemiesOf(actor)) {\n      const cs = e.casting;\n      if (!cs || cs.mode === 'channel' || cs.mode === 'guard') continue;\n      const eta = cs.total - cs.elapsed;\n      if (eta <= 0.08 || eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n      const del = cs.inst.def.delivery as { type: string; radius?: number; vent?: { columnR: number } };\n      // THE VENT-RIDE's broil (LeapDelivery.vent): a vent-leaper's wind-up is\n      // a column-to-be under its own feet — the dodge-mind reads the same\n      // drawn roil the eyes do (drawn == tested) and steps off it.\n      const ventR = del.type === 'leap' && del.vent ? del.vent.columnR : undefined;\n      if (del.type !== 'ground' && del.type !== 'nova' && ventR === undefined) continue;\n      if (!del.radius && ventR === undefined) continue;\n      const at = del.type === 'nova' || ventR !== undefined ? e.pos : cs.aim;\n      const r = (ventR ?? del.radius ?? 0) + pad;\n      if (dist(actor.pos, at) > r) continue;\n      if (!best || eta < best.eta) {\n        best = { ref: cs, pos: vec(at.x, at.y), radius: r, eta,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TELEGRAPHED LEAPS (LeapDelivery.telegraph): a diving body's painted\n    // landing ring is a threat like any un-exploded disc — dodge-minds read\n    // the stoop exactly the way the player's eyes do. Scanned off the raw\n    // actor list because a leaper is untargetable (it vanishes from\n    // enemiesOf mid-flight) yet its landing is the one thing that matters.\n    for (const e of host.actors) {\n      const L = e.leap;\n      if (!L?.telegraph || e === actor || e.dead) continue;\n      if (L.timer > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (!host.hostileTo(e, actor)) continue;\n      const r = L.radius + pad;\n      if (dist(actor.pos, L.dest) > r) continue;\n      if (!best || L.timer < best.eta) {\n        best = { ref: L, pos: vec(L.dest.x, L.dest.y), radius: r, eta: L.timer,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TRACK RIDERS (the track fabric): a blade closing on this body is a\n    // threat like any un-exploded disc — and because rider motion is a pure\n    // function of the clock, the scan samples the ACTUAL future, not an\n    // estimate. The player's eyes (the warn arc) and this read are one truth\n    // from one resolver.\n    for (const tr of host.tracks) {\n      if (!tr.armed || trackDone(tr, host.time)) continue;   // retracted / retired lanes threaten nothing\n      const b = tr.bound;\n      const margin = pad + actor.radius + 40;\n      if (actor.pos.x < b.x0 - margin || actor.pos.x > b.x1 + margin ||\n          actor.pos.y < b.y0 - margin || actor.pos.y > b.y1 + margin) continue;\n      const horizon = Math.min(TRACK_CFG.threatHorizon, BEHAVIOR_CFG.dodgeHorizon);\n      for (const r of tr.riders) {\n        const p = r.def.payload;\n        if (!p.hit && !p.impulse) continue;\n        for (let t = TRACK_CFG.threatStep; t <= horizon; t += TRACK_CFG.threatStep) {\n          const pose = trackPose(tr, host.time + t, r.phase, r.def);\n          if (pose.pending) continue;                        // the bolt still in the wall — real only past bornAt\n          if (!shapeContains(riderSurface(r.def, pose), pose.x, pose.y,\n            actor.pos.x, actor.pos.y, actor.radius + pad)) continue;\n          if (!best || t < best.eta) {\n            const reach = r.def.surface.kind === 'circle'\n              ? r.def.surface.r : Math.hypot(r.def.surface.hw, r.def.surface.hh);\n            best = { ref: r, pos: vec(pose.x, pose.y), radius: reach + pad, eta: t };\n          }\n          break; // first cover is the read — later samples only age it\n        }\n      }\n    }\n    // GEYSER VENTS (the geyser fabric): a broiling vent's coming column is\n    // a threat like any un-exploded disc — the dodge-mind reads the SAME\n    // pure resolver the drawn broil rises from (drawn == tested; the vent\n    // object is the stable ref, so the read rolls once per telegraph). The\n    // dodge horizon clips the ~2s broil to its last stretch — the locals\n    // step off \"one breath before\", exactly the charter's tell.\n    if (host.geysers) {\n      for (const v of host.geysers.vents) {\n        const r = GEYSER_CFG.classes[v.cls].columnR + pad;\n        if (dist(actor.pos, v.pos) > r) continue;\n        const read = ventReadAt(host.geysers, v, host.time, host.geyserMode);\n        const eta = read.phase === 'erupt' ? 0.05 : read.toBurst;\n        if (eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n        if (!best || eta < best.eta) {\n          best = { ref: v, pos: vec(v.pos.x, v.pos.y), radius: r, eta };\n        }\n      }\n    }\n    return best;\n  }",
      "outputSha256": "2794e920369a1117cfcf2b6614d9a53004805a5a03f4daff668b73822e9527c7"
    },
    {
      "name": "plantDressAt",
      "fn": "scenePlantDressAt",
      "kind": "method",
      "line": 15961,
      "source": "plantDressAt(pos: Vec2, radius: number, spec: ImpactDressSpec): void {\n    this.plantImpactDress({ pos: vec(pos.x, pos.y), radius, impactDress: spec });\n  }",
      "sourceSha256": "601b51d7ec608ec53fa91de0b07abe9f1e1bbaa1df2be6600e6094bc255f963b",
      "output": "export function scenePlantDressAt(host:NativeSceneCombatMotionHost, pos: Vec2, radius: number, spec: ImpactDressSpec): void {\n    host.plantImpactDress({ pos: vec(pos.x, pos.y), radius, impactDress: spec });\n  }",
      "outputSha256": "c037a4cd0950afb6d6a32cd6e8aa2ac9158e3c46d4ca7ceab69a9f192de296ac"
    },
    {
      "name": "moveActor",
      "fn": "sceneMoveActor",
      "kind": "method",
      "line": 56284,
      "source": "moveActor(a: Actor, dx: number, dy: number, dt: number): void {\n    ensureMovementTether(a);\n    if (refreshMovementTether(a, this)?.returning) return;\n    if (this.movementLocked(a)) return;\n    // A LATCHED rider's position is slaved to its seat (engine/cling.ts):\n    // the mover contract simply refuses — no pit checks, no wall slides,\n    // no drift for a body that is riding another.\n    if (a.clingTo) return;\n    // A MOUNTED body that WILLS a step quits its saddle first (the mount\n    // fabric): monster riders in the 'hold' kernel never call the mover, so\n    // any real move here is deliberate — a possessed rider's stick, a\n    // command verb, a forced march. The step itself then proceeds on foot.\n    if (a.mountId !== undefined) this.mountUnlink(a);\n    // A HELD body's movement is REPLACED by struggle (the grab fabric):\n    // intent feeds the break meter through the one mover, then refuses —\n    // mashing the stick IS the escape mechanic, for player and monster\n    // alike (a held wolf's own brain keeps walking, and so keeps fighting).\n    if (a.heldBy !== undefined) {\n      const holder = this.actorById(a.heldBy);\n      const hold = holder?.gripping;\n      if (hold && hold.id === a.id) {\n        const want = Math.hypot(dx, dy);\n        if (want > 0.001) hold.struggle += GRAB_CFG.break.moveFeed * Math.min(1, want) * dt;\n      }\n      return;\n    }\n    // WIDDERSHINS (StatusDef.invertMove — the confusion family's turned\n    // hand): VOLITIONAL intent flips at the one mover, so the player's\n    // keys, a monster's steering and a minion's orders all betray their\n    // bearers alike — the brain commands 'approach', the feet answer\n    // 'away'. Knockback (pushActor), grab reeling and track shoves ride\n    // other arteries untouched: the world still moves you true; only your\n    // own steps turn contrary.\n    for (const s of a.statuses) {\n      if (STATUS_DEFS[s.id]?.invertMove) { dx = -dx; dy = -dy; break; }\n    }\n    // Channeling restricts movement per the skill's data, opened back up by\n    // the channelMobility stat (immobile 0 / slowed factor / normal 1, + stat).\n    let channelFactor = 1;\n    if (a.casting?.mode === 'channel') {\n      // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec — the\n      // gather conversion's synthesized words win over the def's, the\n      // same `cs.gather ?? view` resolution the pulse machinery rides. A\n      // gathering caster walks SLOWED (its authored 0.5), not free: the\n      // conversion trades the bar's rooting for the channel bargain, and\n      // channelMobility investment opens it further. (A spent tree node's\n      // rampMove rides this same read — the skill-mode audit's view.)\n      const ch = a.casting.gather ?? instanceChannel(a.casting.inst);\n      const base = ch?.move === 'immobile' ? 0 : ch?.move === 'slowed' ? (ch.moveFactor ?? 0.5) : 1;\n      // rampMove: the held channel DRAGS (negative per — Undertow's\n      // maelstrom slowly anchors its own bearer) or FREES (positive — the\n      // gathering current), on the same curve family as the damage ramps.\n      // Floored at rooted; capped ×1.6, and only a rampMove channel may\n      // exceed a walking pace at all.\n      const rm = ch?.rampMove\n        ? rampValue(ch.rampMove, a.casting.channelTime ?? 0) : 0;\n      channelFactor = Math.max(0, Math.min(ch?.rampMove ? 1.6 : 1,\n        base + this.channelMobility(a, a.casting.inst) + rm));\n      if (channelFactor <= 0) return;\n    } else if (a.casting?.mode === 'guard') {\n      // Shield up: heavy steps, but you keep your feet.\n      channelFactor = a.casting.inst.def.guard?.moveFactor ?? 0.4;\n    } else if (a.casting) {\n      // A mobile cast bar (castMove + castMobility) — rooted bars never\n      // reach here (movementLocked already refused).\n      channelFactor = this.castMoveFactor(a, a.casting.inst);\n      if (channelFactor <= 0) return;\n    }\n    // Toggled FORMS slow their bearer (moveFactor between 0 and 1 —\n    // rooted forms never reach here; movementLocked already refused).\n    for (const au of a.activeAuras.values()) {\n      const ad = au.inst.def.delivery;\n      if (ad.type === 'aura' && ad.moveFactor !== undefined && ad.moveFactor > 0) {\n        channelFactor *= ad.moveFactor;\n      }\n    }\n    // A LIVE HOLD is a burden (the grab fabric): carrying walks slow,\n    // hauling drags, pinning and swallowing ROOT — the verb's factor\n    // composes like a channel's (engine/grab.ts holderMove).\n    if (a.gripping) {\n      const gf = grabHolderMove(a.gripping);\n      if (gf <= 0) return;\n      channelFactor *= gf;\n    }\n    const len = Math.hypot(dx, dy);\n    if (len < 0.001) return;\n    if (dt > 0 && channelFactor > 0) this.guardArts.ram(a, dx, dy);\n    // REGION move-scale: a road speeds you up, a future tar-pit could slow — a direct\n    // multiplier (NOT a status) from the terrain underfoot last frame (doodad ground +\n    // grid region). Defaults to 1 when the kind has no moveScale. The first user is 'road'.\n    // (Co-op: a client's groundKind is host-set, so its move-PREDICTION under-shoots the\n    // ~4% road boost until the next host ack re-anchors it — bounded + self-healing.)\n    const regionScale = (regionKind(a.groundKind)?.moveScale ?? 1) * (regionKind(a.gridRegion)?.moveScale ?? 1);\n    // At sea the hero IS the boat — quicker than boots, and a better HULL is\n    // quicker still (VOYAGE_CFG lever × the account's ship).\n    const boatScale = this.sailing ? VOYAGE_CFG.boatSpeedMul * this.voyageShip().speedMul : 1;\n    // DIRECTIONAL WIND (WEATHER_DEFS[kind].wind): pushing into the gale is\n    // work, running with it is a gift — and an anchored solid upwind\n    // (windAt's shelter probe) becalms you entirely. Applies to EVERYONE\n    // that walks, monsters included; sails feel it too, doubly.\n    let windScale = 1;\n    const gale = this.windAt(a.pos, a.tier);\n    if (gale) {\n      const dot = (dx / len) * gale.x + (dy / len) * gale.y;\n      windScale = clamp(\n        1 + dot * (dot < 0 ? WIND_CFG.headwind : WIND_CFG.tailwind),\n        WIND_CFG.minScale, WIND_CFG.maxScale);\n    }\n    // SNOW DENSITY: standing cover is heavy going for every walker\n    // (SNOW_CFG.slowAtFull at a full blanket). Boats don't wade snow.\n    const snowScale = this.sailing ? 1 : 1 - this.snowCoverAt(a.pos) * SNOW_CFG.slowAtFull;\n    // A held stance's own kit joins the read (Actor.walkSpeed's stanceRead): the\n    // marching wall's 'guarding'-scoped speed rows live on the instance. THE HONEST\n    // INPUT: a render shell's OWN hero walks the fold its seat row carries (ownWalk;\n    // the shell's statuses are display stubs); every host body reads its own sheet.\n    const ow = this.ownWalk !== null && a === this.player ? this.ownWalk : null;\n    const speed = (ow ? ow.spd : a.walkSpeed()) * channelFactor * regionScale * boatScale * windScale * snowScale;\n    const traction = ow ? ow.trc : a.walkTraction();\n    a.lastMoveAt = this.time;\n    a.idleFor = 0; // a deliberate step breaks the 'stationary' stance\n    a.plantFor = 0; // …and the plant clock with it (the commitment resets)\n    // The 'move' charge-tap odometer (Galvanic Reserve) — intended stride,\n    // consumed by Actor.updateCharges on its own meters.\n    a.moveAcc += speed * dt;\n    this.markSeatActed(a); // movement interrupts THAT seat's dwell\n    this.markSeatMoved(a); // …and, THE SHIMMY LAW, a willed step re-arms a spent one\n    // DEV noclip: the local hero phases through walls/rocks/void (bounds still\n    // hold). TRUE FLIERS ride the same displacement policy — the wing cares\n    // nothing for rocks, walls or the gap beneath. A LEVITATOR (base flag or\n    // the 'levitation' stat — cloudform) floats over void bands but walls\n    // still confine it: it floats, it doesn't phase.\n    const disp = (this.devNoclip && a === this.player) || a.flying ? NOCLIP_DISP\n      : this.levitating(a) ? LEVITATE_DISP : undefined;\n    // THE STRIDE's odometer (strideReach — THE LEGEND FABRIC): the distance\n    // a willed step ACTUALLY covered (post-clamp — a wall walks nothing),\n    // banked only while the sheet arms a reach, so an unarmed walker pays\n    // one cached read and never accrues.\n    const striding = a.sheet.get('strideReach') > 0;\n    const sx = a.pos.x, sy = a.pos.y;\n    if (traction >= 0.999) {\n      // Solid ground: instant control, exactly as ever.\n      a.vel.x = (dx / len) * speed;\n      a.vel.y = (dy / len) * speed;\n      this.steppedClamp(a, vec(\n        a.pos.x + (dx / len) * speed * dt,\n        a.pos.y + (dy / len) * speed * dt,\n      ), a.pos, disp);\n    } else {\n      // Slippery: input only STEERS the momentum; the ice decides the rest.\n      const blend = Math.min(1, dt * (1.5 + traction * 14));\n      a.vel.x += ((dx / len) * speed - a.vel.x) * blend;\n      a.vel.y += ((dy / len) * speed - a.vel.y) * blend;\n      this.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos, disp);\n    }\n    if (striding) a.strideDist += Math.hypot(a.pos.x - sx, a.pos.y - sy);\n    if (!this.sailing) markBodyWalk(a, a.pos.x - sx, a.pos.y - sy, this.time);\n  }",
      "sourceSha256": "125670d79135388179f67eb5f81b5e1cddf570295fd7dd47793dd7b241b7a39e",
      "output": "export function sceneMoveActor(host:NativeSceneCombatMotionHost, a: Actor, dx: number, dy: number, dt: number): void {\n    ensureMovementTether(a);\n    if (refreshMovementTether(a, host)?.returning) return;\n    if (host.movementLocked(a)) return;\n    // A LATCHED rider's position is slaved to its seat (engine/cling.ts):\n    // the mover contract simply refuses — no pit checks, no wall slides,\n    // no drift for a body that is riding another.\n    if (a.clingTo) return;\n    // A MOUNTED body that WILLS a step quits its saddle first (the mount\n    // fabric): monster riders in the 'hold' kernel never call the mover, so\n    // any real move here is deliberate — a possessed rider's stick, a\n    // command verb, a forced march. The step itself then proceeds on foot.\n    if (a.mountId !== undefined) host.mountUnlink(a);\n    // A HELD body's movement is REPLACED by struggle (the grab fabric):\n    // intent feeds the break meter through the one mover, then refuses —\n    // mashing the stick IS the escape mechanic, for player and monster\n    // alike (a held wolf's own brain keeps walking, and so keeps fighting).\n    if (a.heldBy !== undefined) {\n      const holder = host.actorById(a.heldBy);\n      const hold = holder?.gripping;\n      if (hold && hold.id === a.id) {\n        const want = Math.hypot(dx, dy);\n        if (want > 0.001) hold.struggle += GRAB_CFG.break.moveFeed * Math.min(1, want) * dt;\n      }\n      return;\n    }\n    // WIDDERSHINS (StatusDef.invertMove — the confusion family's turned\n    // hand): VOLITIONAL intent flips at the one mover, so the player's\n    // keys, a monster's steering and a minion's orders all betray their\n    // bearers alike — the brain commands 'approach', the feet answer\n    // 'away'. Knockback (pushActor), grab reeling and track shoves ride\n    // other arteries untouched: the world still moves you true; only your\n    // own steps turn contrary.\n    for (const s of a.statuses) {\n      if (STATUS_DEFS[s.id]?.invertMove) { dx = -dx; dy = -dy; break; }\n    }\n    // Channeling restricts movement per the skill's data, opened back up by\n    // the channelMobility stat (immobile 0 / slowed factor / normal 1, + stat).\n    let channelFactor = 1;\n    if (a.casting?.mode === 'channel') {\n      // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec — the\n      // gather conversion's synthesized words win over the def's, the\n      // same `cs.gather ?? view` resolution the pulse machinery rides. A\n      // gathering caster walks SLOWED (its authored 0.5), not free: the\n      // conversion trades the bar's rooting for the channel bargain, and\n      // channelMobility investment opens it further. (A spent tree node's\n      // rampMove rides this same read — the skill-mode audit's view.)\n      const ch = a.casting.gather ?? instanceChannel(a.casting.inst);\n      const base = ch?.move === 'immobile' ? 0 : ch?.move === 'slowed' ? (ch.moveFactor ?? 0.5) : 1;\n      // rampMove: the held channel DRAGS (negative per — Undertow's\n      // maelstrom slowly anchors its own bearer) or FREES (positive — the\n      // gathering current), on the same curve family as the damage ramps.\n      // Floored at rooted; capped ×1.6, and only a rampMove channel may\n      // exceed a walking pace at all.\n      const rm = ch?.rampMove\n        ? rampValue(ch.rampMove, a.casting.channelTime ?? 0) : 0;\n      channelFactor = Math.max(0, Math.min(ch?.rampMove ? 1.6 : 1,\n        base + host.channelMobility(a, a.casting.inst) + rm));\n      if (channelFactor <= 0) return;\n    } else if (a.casting?.mode === 'guard') {\n      // Shield up: heavy steps, but you keep your feet.\n      channelFactor = a.casting.inst.def.guard?.moveFactor ?? 0.4;\n    } else if (a.casting) {\n      // A mobile cast bar (castMove + castMobility) — rooted bars never\n      // reach here (movementLocked already refused).\n      channelFactor = host.castMoveFactor(a, a.casting.inst);\n      if (channelFactor <= 0) return;\n    }\n    // Toggled FORMS slow their bearer (moveFactor between 0 and 1 —\n    // rooted forms never reach here; movementLocked already refused).\n    for (const au of a.activeAuras.values()) {\n      const ad = au.inst.def.delivery;\n      if (ad.type === 'aura' && ad.moveFactor !== undefined && ad.moveFactor > 0) {\n        channelFactor *= ad.moveFactor;\n      }\n    }\n    // A LIVE HOLD is a burden (the grab fabric): carrying walks slow,\n    // hauling drags, pinning and swallowing ROOT — the verb's factor\n    // composes like a channel's (engine/grab.ts holderMove).\n    if (a.gripping) {\n      const gf = grabHolderMove(a.gripping);\n      if (gf <= 0) return;\n      channelFactor *= gf;\n    }\n    const len = Math.hypot(dx, dy);\n    if (len < 0.001) return;\n    if (dt > 0 && channelFactor > 0) host.guardArts.ram(a, dx, dy);\n    // REGION move-scale: a road speeds you up, a future tar-pit could slow — a direct\n    // multiplier (NOT a status) from the terrain underfoot last frame (doodad ground +\n    // grid region). Defaults to 1 when the kind has no moveScale. The first user is 'road'.\n    // (Co-op: a client's groundKind is host-set, so its move-PREDICTION under-shoots the\n    // ~4% road boost until the next host ack re-anchors it — bounded + self-healing.)\n    const regionScale = (regionKind(a.groundKind)?.moveScale ?? 1) * (regionKind(a.gridRegion)?.moveScale ?? 1);\n    // At sea the hero IS the boat — quicker than boots, and a better HULL is\n    // quicker still (VOYAGE_CFG lever × the account's ship).\n    const boatScale = host.sailing ? VOYAGE_CFG.boatSpeedMul * host.voyageShip().speedMul : 1;\n    // DIRECTIONAL WIND (WEATHER_DEFS[kind].wind): pushing into the gale is\n    // work, running with it is a gift — and an anchored solid upwind\n    // (windAt's shelter probe) becalms you entirely. Applies to EVERYONE\n    // that walks, monsters included; sails feel it too, doubly.\n    let windScale = 1;\n    const gale = host.windAt(a.pos, a.tier);\n    if (gale) {\n      const dot = (dx / len) * gale.x + (dy / len) * gale.y;\n      windScale = clamp(\n        1 + dot * (dot < 0 ? WIND_CFG.headwind : WIND_CFG.tailwind),\n        WIND_CFG.minScale, WIND_CFG.maxScale);\n    }\n    // SNOW DENSITY: standing cover is heavy going for every walker\n    // (SNOW_CFG.slowAtFull at a full blanket). Boats don't wade snow.\n    const snowScale = host.sailing ? 1 : 1 - host.snowCoverAt(a.pos) * SNOW_CFG.slowAtFull;\n    // A held stance's own kit joins the read (Actor.walkSpeed's stanceRead): the\n    // marching wall's 'guarding'-scoped speed rows live on the instance. THE HONEST\n    // INPUT: a render shell's OWN hero walks the fold its seat row carries (ownWalk;\n    // the shell's statuses are display stubs); every host body reads its own sheet.\n    const ow = host.ownWalk !== null && a === host.player ? host.ownWalk : null;\n    const speed = (ow ? ow.spd : a.walkSpeed()) * channelFactor * regionScale * boatScale * windScale * snowScale;\n    const traction = ow ? ow.trc : a.walkTraction();\n    a.lastMoveAt = host.time;\n    a.idleFor = 0; // a deliberate step breaks the 'stationary' stance\n    a.plantFor = 0; // …and the plant clock with it (the commitment resets)\n    // The 'move' charge-tap odometer (Galvanic Reserve) — intended stride,\n    // consumed by Actor.updateCharges on its own meters.\n    a.moveAcc += speed * dt;\n    host.markSeatActed(a); // movement interrupts THAT seat's dwell\n    host.markSeatMoved(a); // …and, THE SHIMMY LAW, a willed step re-arms a spent one\n    // DEV noclip: the local hero phases through walls/rocks/void (bounds still\n    // hold). TRUE FLIERS ride the same displacement policy — the wing cares\n    // nothing for rocks, walls or the gap beneath. A LEVITATOR (base flag or\n    // the 'levitation' stat — cloudform) floats over void bands but walls\n    // still confine it: it floats, it doesn't phase.\n    const disp = (host.devNoclip && a === host.player) || a.flying ? NOCLIP_DISP\n      : host.levitating(a) ? LEVITATE_DISP : undefined;\n    // THE STRIDE's odometer (strideReach — THE LEGEND FABRIC): the distance\n    // a willed step ACTUALLY covered (post-clamp — a wall walks nothing),\n    // banked only while the sheet arms a reach, so an unarmed walker pays\n    // one cached read and never accrues.\n    const striding = a.sheet.get('strideReach') > 0;\n    const sx = a.pos.x, sy = a.pos.y;\n    if (traction >= 0.999) {\n      // Solid ground: instant control, exactly as ever.\n      a.vel.x = (dx / len) * speed;\n      a.vel.y = (dy / len) * speed;\n      host.steppedClamp(a, vec(\n        a.pos.x + (dx / len) * speed * dt,\n        a.pos.y + (dy / len) * speed * dt,\n      ), a.pos, disp);\n    } else {\n      // Slippery: input only STEERS the momentum; the ice decides the rest.\n      const blend = Math.min(1, dt * (1.5 + traction * 14));\n      a.vel.x += ((dx / len) * speed - a.vel.x) * blend;\n      a.vel.y += ((dy / len) * speed - a.vel.y) * blend;\n      host.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos, disp);\n    }\n    if (striding) a.strideDist += Math.hypot(a.pos.x - sx, a.pos.y - sy);\n    if (!host.sailing) markBodyWalk(a, a.pos.x - sx, a.pos.y - sy, host.time);\n  }",
      "outputSha256": "a1298db48fdc1a916e826ad64853e4c3b56bfbf120db2aece2c86eff5ba46bd6"
    },
    {
      "name": "slipAway",
      "fn": "sceneSlipAway",
      "kind": "method",
      "line": 12133,
      "source": "slipAway(actor: Actor, text: string, color = '#c8a850', fx?: string): void {\n    this.despawnPartsOf(actor);\n    const i = this.actors.indexOf(actor);\n    if (i >= 0) this.actors.splice(i, 1);\n    // THE EFFECT VOICE: a refuge row may name its exit's painter (the\n    // squirrel's 'scramble' leaf-flick); every unkeyed departure keeps the\n    // classic soft flash — the honored generic (absent == identical).\n    this.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 60, color, life: 0.5, maxLife: 0.5, fx });\n    if (text) this.text(vec(actor.pos.x, actor.pos.y - 30), text, color, 14);\n  }",
      "sourceSha256": "6750f3c0e14fbfff7df035405d14217f4781a958520d7c25e0ab3e8bf5555426",
      "output": "export function sceneSlipAway(host:NativeSceneCombatMotionHost, actor: Actor, text: string, color = '#c8a850', fx?: string): void {\n    host.despawnPartsOf(actor);\n    const i = host.actors.indexOf(actor);\n    if (i >= 0) host.actors.splice(i, 1);\n    // THE EFFECT VOICE: a refuge row may name its exit's painter (the\n    // squirrel's 'scramble' leaf-flick); every unkeyed departure keeps the\n    // classic soft flash — the honored generic (absent == identical).\n    host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 60, color, life: 0.5, maxLife: 0.5, fx });\n    if (text) host.text(vec(actor.pos.x, actor.pos.y - 30), text, color, 14);\n  }",
      "outputSha256": "71d529a4dc8485cbe8441f661a5bb027741a10ed9c7a21520c2a92a7fc004fa8"
    },
    {
      "name": "survivalDrainRate",
      "fn": "sceneSurvivalDrainRate",
      "kind": "method",
      "line": 49222,
      "source": "survivalDrainRate(a: Actor, resource: string, rate: number): number {\n    if (rate <= 0) return rate;\n    const ease = a.sheet.get(survivalEaseStat(resource));\n    if (ease <= 0) return rate;\n    const def = survivalResource(resource);\n    return rate * (1 - Math.min(def?.easeCap ?? SURVIVAL_EASE_CAP, ease));\n  }",
      "sourceSha256": "e7cc04695d793b01935c03a65df21942a38a1ffbcb2dfb6159054f73ba3cc33c",
      "output": "export function sceneSurvivalDrainRate(host:NativeSceneCombatMotionHost, a: Actor, resource: string, rate: number): number {\n    if (rate <= 0) return rate;\n    const ease = a.sheet.get(survivalEaseStat(resource));\n    if (ease <= 0) return rate;\n    const def = survivalResource(resource);\n    return rate * (1 - Math.min(def?.easeCap ?? SURVIVAL_EASE_CAP, ease));\n  }",
      "outputSha256": "e36072b71f6cde9d7ead9db2441be004ea7c3d83bbe0999d3c61380ee09adecb"
    },
    {
      "name": "despawnPartsOf",
      "fn": "sceneDespawnPartsOf",
      "kind": "method",
      "line": 12120,
      "source": "private despawnPartsOf(actor: Actor): void {\n    for (const p of actor.partActors ?? []) {\n      if (p.dead) continue;\n      const i = this.actors.indexOf(p);\n      if (i >= 0) this.actors.splice(i, 1);\n    }\n  }",
      "sourceSha256": "26813342a3a977c5b79dfbc229ee8b9bfc7eafbe0144d46e011748ef2ccace45",
      "output": "export function sceneDespawnPartsOf(host:NativeSceneCombatMotionHost, actor: Actor): void {\n    for (const p of actor.partActors ?? []) {\n      if (p.dead) continue;\n      const i = host.actors.indexOf(p);\n      if (i >= 0) host.actors.splice(i, 1);\n    }\n  }",
      "outputSha256": "6c2279df63fefa81e30a7135ff9d919cedec89f8cce440a1a6390da7e1f98818"
    },
    {
      "name": "markSeatMoved",
      "fn": "sceneMarkSeatMoved",
      "kind": "method",
      "line": 5366,
      "source": "private markSeatMoved(actor: Actor): void {\n    const s = this.seatByActor.get(actor);\n    if (s) s.lastMovedAt = this.time;\n  }",
      "sourceSha256": "0ef4499afafac6f819388a418b7d340e7fe552b24a3fc2472726180060eeb265",
      "output": "export function sceneMarkSeatMoved(host:NativeSceneCombatMotionHost, actor: Actor): void {\n    const s = host.seatByActor.get(actor);\n    if (s) s.lastMovedAt = host.time;\n  }",
      "outputSha256": "78783f732aa1e7c59ac45c5544e50a8575639152f090161d0350f841cef486ac"
    },
    {
      "name": "steppedClamp",
      "fn": "sceneSteppedClamp",
      "kind": "method",
      "line": 55902,
      "source": "private steppedClamp(a: Actor, dest: Vec2, from: Vec2, disp?: DisplacementPolicy): void {\n    const sc = this.cScratch;\n    sc.hit = 'none';\n    // THE LANDING RE-SEAT at the mover (engine/tiers.ts landingTier): a\n    // just-landed body re-derives its story from the floor it STANDS on\n    // BEFORE any clamp consults a tier view — else the first grounded\n    // step's snap drags the diver back onto the story it left (measured\n    // live: a stooping condor teleport-climbing its own rim, 24px in one\n    // frame). The world sweep keeps the stationary lander's copy.\n    if (a.touchdown && !a.flying && !a.leap && !a.dash\n      && this.zone.tiers && this.walk?.regionAt) {\n      a.touchdown = false;\n      a.tier = landingTier(this.walk.regionAt(from.x, from.y), a.tier);\n    }\n    // TIER CROSSING (engine/tiers.ts): standing on a link (ramp, culvert)\n    // and stepping toward ground only the other layer owns FLIPS the body's\n    // tier BEFORE the clamp judges the move — walking up a ramp is just\n    // walking. (Pure read; flat zones return the tier untouched.)\n    if (this.zone.tiers && this.walk) a.tier = resolveTierCrossing(this.walk, a.tier, from, dest);\n    a.pos = this.clampPos(dest, a.radius, from, { out: sc, disp, mover: a });\n    if ((sc.hit as string) === 'void') this.resolveBoundary(a, sc, from);\n    // THE LADDER TOGGLE (the crossing law's second half): a link cell whose\n    // neighborhood is BOTH-tier ground (a culvert well among street-over-duct\n    // cells) never trips the exit rule — so ENTERING a link flips the layer\n    // outright, latched to one toggle per visit. Stepping onto an open\n    // culvert IS descending; reaching a well from the duct IS surfacing.\n    // Ramps self-correct through the exit rule above either way.\n    if (this.zone.tiers && this.walk?.regionAt) {\n      const linkK = this.walk.regionAt(a.pos.x, a.pos.y);\n      const onLink = tierLinkOf(linkK);\n      if (onLink && !a.onTierLink) {\n        const storyBefore = a.tier;\n        a.tier = linkFlipTier(linkK, a.tier);\n        a.aiTierGoal = undefined; // crossed — any chase goal is spent\n        // THE DESCENT LEDGER (UnderTierSpec.ledgerOnDescend — the cistern's\n        // `cistern_entered`): a hero's body going DOWN a lane's crossing for\n        // the first time stamps the lane's key on the run ledger (merged to\n        // the account on death) — the sidezone fabric's ledgerOnEnter for a\n        // story that has no door. Seats only; monsters keep no book.\n        if (storyBefore === 0 && a.tier >= 1 && this.seatOf(a)) {\n          const key = laneLedgerOnDescend(this.zone.tiers?.lane);\n          if (key) bumpLedger(this.ledger, key);\n        }\n        // THE PURSUIT STAMP (the tier chase): whoever was hunting THIS body\n        // watched it take the stair — hand every engaged pursuer in earshot\n        // the crossing as a goal; walking onto it flips them through, and\n        // the ordinary re-acquire picks the hunt back up on the other side.\n        for (const e of this.actors) {\n          if (e.dead || e === a || e.aiTargetId !== a.id) continue;\n          if (Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y) > 900) continue;\n          e.aiTierGoal = { x: a.pos.x, y: a.pos.y, until: this.time + 8 };\n        }\n        // THE LEDGER (chase memory): late pursuers — the ones who pick up\n        // the trail after the stair — read the crossing from here.\n        this.tierCrossings.push({ x: a.pos.x, y: a.pos.y, actorId: a.id, team: a.team, at: this.time });\n        if (this.tierCrossings.length > 12) this.tierCrossings.shift();\n      }\n      a.onTierLink = onLink;\n    }\n  }",
      "sourceSha256": "0fd6445519df0b604ca81743a183df5b6b4d69dea10c2dad99cea9408e292b11",
      "output": "export function sceneSteppedClamp(host:NativeSceneCombatMotionHost, a: Actor, dest: Vec2, from: Vec2, disp?: DisplacementPolicy): void {\n    const sc = host.cScratch;\n    sc.hit = 'none';\n    // THE LANDING RE-SEAT at the mover (engine/tiers.ts landingTier): a\n    // just-landed body re-derives its story from the floor it STANDS on\n    // BEFORE any clamp consults a tier view — else the first grounded\n    // step's snap drags the diver back onto the story it left (measured\n    // live: a stooping condor teleport-climbing its own rim, 24px in one\n    // frame). The world sweep keeps the stationary lander's copy.\n    if (a.touchdown && !a.flying && !a.leap && !a.dash\n      && host.zone.tiers && host.walk?.regionAt) {\n      a.touchdown = false;\n      a.tier = landingTier(host.walk.regionAt(from.x, from.y), a.tier);\n    }\n    // TIER CROSSING (engine/tiers.ts): standing on a link (ramp, culvert)\n    // and stepping toward ground only the other layer owns FLIPS the body's\n    // tier BEFORE the clamp judges the move — walking up a ramp is just\n    // walking. (Pure read; flat zones return the tier untouched.)\n    if (host.zone.tiers && host.walk) a.tier = resolveTierCrossing(host.walk, a.tier, from, dest);\n    a.pos = host.clampPos(dest, a.radius, from, { out: sc, disp, mover: a });\n    if ((sc.hit as string) === 'void') host.resolveBoundary(a, sc, from);\n    // THE LADDER TOGGLE (the crossing law's second half): a link cell whose\n    // neighborhood is BOTH-tier ground (a culvert well among street-over-duct\n    // cells) never trips the exit rule — so ENTERING a link flips the layer\n    // outright, latched to one toggle per visit. Stepping onto an open\n    // culvert IS descending; reaching a well from the duct IS surfacing.\n    // Ramps self-correct through the exit rule above either way.\n    if (host.zone.tiers && host.walk?.regionAt) {\n      const linkK = host.walk.regionAt(a.pos.x, a.pos.y);\n      const onLink = tierLinkOf(linkK);\n      if (onLink && !a.onTierLink) {\n        const storyBefore = a.tier;\n        a.tier = linkFlipTier(linkK, a.tier);\n        a.aiTierGoal = undefined; // crossed — any chase goal is spent\n        // THE DESCENT LEDGER (UnderTierSpec.ledgerOnDescend — the cistern's\n        // `cistern_entered`): a hero's body going DOWN a lane's crossing for\n        // the first time stamps the lane's key on the run ledger (merged to\n        // the account on death) — the sidezone fabric's ledgerOnEnter for a\n        // story that has no door. Seats only; monsters keep no book.\n        if (storyBefore === 0 && a.tier >= 1 && host.seatOf(a)) {\n          const key = laneLedgerOnDescend(host.zone.tiers?.lane);\n          if (key) bumpLedger(host.ledger, key);\n        }\n        // THE PURSUIT STAMP (the tier chase): whoever was hunting THIS body\n        // watched it take the stair — hand every engaged pursuer in earshot\n        // the crossing as a goal; walking onto it flips them through, and\n        // the ordinary re-acquire picks the hunt back up on the other side.\n        for (const e of host.actors) {\n          if (e.dead || e === a || e.aiTargetId !== a.id) continue;\n          if (Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y) > 900) continue;\n          e.aiTierGoal = { x: a.pos.x, y: a.pos.y, until: host.time + 8 };\n        }\n        // THE LEDGER (chase memory): late pursuers — the ones who pick up\n        // the trail after the stair — read the crossing from here.\n        host.tierCrossings.push({ x: a.pos.x, y: a.pos.y, actorId: a.id, team: a.team, at: host.time });\n        if (host.tierCrossings.length > 12) host.tierCrossings.shift();\n      }\n      a.onTierLink = onLink;\n    }\n  }",
      "outputSha256": "857b2ac5cee80aedf343366b13421fc26255b3e23cdb96075a4436ad82b0d6ed"
    },
    {
      "name": "resolveBoundary",
      "fn": "sceneResolveBoundary",
      "kind": "method",
      "line": 55836,
      "source": "private resolveBoundary(a: Actor, result: CollisionResult, pre: Vec2, forced = false): void {\n    let policy = regionKind(result.blockedKind)?.boundaryPolicy;\n    if (policy) policy = this.pitPolicyFor(policy,result.at); // the zone's word on pit-family falls\n    if (!policy) return;\n    // A LEVITATING actor floats over fall pits (void): no fall damage / eject — so it\n    // can't be knocked into the void for a cheap kill. (Pathing still avoids void.)\n    if (this.levitating(a) && (policy.kind === 'fall' || policy.kind === 'descend')) return;\n    // Debounce fall/eject/skyfall/descend so being held against a void edge\n    // doesn't melt the actor every frame — one recovery per ~0.6s.\n    if (policy.kind === 'fall' || policy.kind === 'eject' || policy.kind === 'skyfall' || policy.kind === 'descend') {\n      if (this.time - (a.lastFall ?? -9) < 0.6) return;\n      a.lastFall = this.time;\n    }\n    this.applyRecovery(a, policy, pre, forced);\n  }",
      "sourceSha256": "29ee73a3f0d8617a704c193cfe11edc39128ffe93f26247659cc61b362057ce6",
      "output": "export function sceneResolveBoundary(host:NativeSceneCombatMotionHost, a: Actor, result: CollisionResult, pre: Vec2, forced = false): void {\n    let policy = regionKind(result.blockedKind)?.boundaryPolicy;\n    if (policy) policy = host.pitPolicyFor(policy,result.at); // the zone's word on pit-family falls\n    if (!policy) return;\n    // A LEVITATING actor floats over fall pits (void): no fall damage / eject — so it\n    // can't be knocked into the void for a cheap kill. (Pathing still avoids void.)\n    if (host.levitating(a) && (policy.kind === 'fall' || policy.kind === 'descend')) return;\n    // Debounce fall/eject/skyfall/descend so being held against a void edge\n    // doesn't melt the actor every frame — one recovery per ~0.6s.\n    if (policy.kind === 'fall' || policy.kind === 'eject' || policy.kind === 'skyfall' || policy.kind === 'descend') {\n      if (host.time - (a.lastFall ?? -9) < 0.6) return;\n      a.lastFall = host.time;\n    }\n    host.applyRecovery(a, policy, pre, forced);\n  }",
      "outputSha256": "6105f872ba60ebbb97c8b62fa1ffbf35aefe363735f16ae46f792ce4087799d3"
    },
    {
      "name": "windAt",
      "fn": "sceneWindAt",
      "kind": "method",
      "line": 48977,
      "source": "windAt(pos: Vec2, tier = 0): { x: number; y: number; strength: number } | null {\n    const w = this.zoneWind(pos);\n    if (!w) return null;\n    // UNDER A CEILING (the enclosure law): a body on an enclosed under-\n    // layer's story feels no gale — the street's wind is not the duct's.\n    if (tier >= 1 && this.zone.tiers?.kind === 'under' && tierEnclosed(this.zone.tiers)) return null;\n    // INDOORS: a roof owns its sky — no gale under it (courtyards stay open).\n    if (this.underRoofAt(pos)) return null;\n    const px = pos.x - w.nx * WIND_CFG.shelterReach;\n    const py = pos.y - w.ny * WIND_CFG.shelterReach;\n    // The upwind probe reads BODY radii (bodyRadiusOf): a canopy tree shelters\n    // only in its trunk's narrow lee — wind blows through the leaves, and the\n    // shade of a crown is deliberately NOT cover from the gale.\n    for (const d of this.doodadsAt(px, py)) {\n      if (!blocksMovement(d)) continue;\n      const dx = px - d.pos.x, dy = py - d.pos.y;\n      const reach = bodyRadiusOf(d) + WIND_CFG.shelterPad;\n      if (dx * dx + dy * dy <= reach * reach) return null; // becalmed\n    }\n    return { x: w.nx * w.strength, y: w.ny * w.strength, strength: w.strength };\n  }",
      "sourceSha256": "23026881fb69238170eb5a63dc2e65040500deba6a0675ad3f781df0e3098dc1",
      "output": "export function sceneWindAt(host:NativeSceneCombatMotionHost, pos: Vec2, tier = 0): { x: number; y: number; strength: number } | null {\n    const w = host.zoneWind(pos);\n    if (!w) return null;\n    // UNDER A CEILING (the enclosure law): a body on an enclosed under-\n    // layer's story feels no gale — the street's wind is not the duct's.\n    if (tier >= 1 && host.zone.tiers?.kind === 'under' && tierEnclosed(host.zone.tiers)) return null;\n    // INDOORS: a roof owns its sky — no gale under it (courtyards stay open).\n    if (host.underRoofAt(pos)) return null;\n    const px = pos.x - w.nx * WIND_CFG.shelterReach;\n    const py = pos.y - w.ny * WIND_CFG.shelterReach;\n    // The upwind probe reads BODY radii (bodyRadiusOf): a canopy tree shelters\n    // only in its trunk's narrow lee — wind blows through the leaves, and the\n    // shade of a crown is deliberately NOT cover from the gale.\n    for (const d of host.doodadsAt(px, py)) {\n      if (!blocksMovement(d)) continue;\n      const dx = px - d.pos.x, dy = py - d.pos.y;\n      const reach = bodyRadiusOf(d) + WIND_CFG.shelterPad;\n      if (dx * dx + dy * dy <= reach * reach) return null; // becalmed\n    }\n    return { x: w.nx * w.strength, y: w.ny * w.strength, strength: w.strength };\n  }",
      "outputSha256": "58689ac74059f2ebc14bf6094bc991e21a1f4fe86b29a44460ccca0526c8baaa"
    },
    {
      "name": "zoneWind",
      "fn": "sceneZoneWind",
      "kind": "method",
      "line": 48952,
      "source": "zoneWind(pos: Vec2 = this.player.pos): { nx: number; ny: number; strength: number } | null {\n    if (!this.massRuntime?.weather && this.windCache.at === this.time) return this.windCache.w;\n    let w: { nx: number; ny: number; strength: number } | null = null;\n    const f = this.skyFront(pos);\n    const windDef = f ? WEATHER_DEFS[f.kind].wind : undefined;\n    if (f && windDef) {\n      const len = Math.hypot(f.vel.x, f.vel.y);\n      if (len > 0.01) {\n        // The GUST WAVE: two slow sines beat against each other — strength\n        // swells in rolling pulses rather than holding a flat shove.\n        const gust = 1 + WIND_CFG.gustAmp\n          * Math.max(0, Math.sin(this.time * 0.7) * Math.sin(this.time * 0.23));\n        w = {\n          nx: f.vel.x / len, ny: f.vel.y / len,\n          strength: Math.min(1.6, windDef * f.intensity * gust),\n        };\n      }\n    }\n    this.windCache = { at: this.time, w };\n    return w;\n  }",
      "sourceSha256": "cccbefb20514d7dede4a8529249fc421d8d362df8fd8efcd3b04bb1438724d4b",
      "output": "export function sceneZoneWind(host:NativeSceneCombatMotionHost, pos: Vec2 = host.player.pos): { nx: number; ny: number; strength: number } | null {\n    if (!host.massRuntime?.weather && host.windCache.at === host.time) return host.windCache.w;\n    let w: { nx: number; ny: number; strength: number } | null = null;\n    const f = host.skyFront(pos);\n    const windDef = f ? WEATHER_DEFS[f.kind].wind : undefined;\n    if (f && windDef) {\n      const len = Math.hypot(f.vel.x, f.vel.y);\n      if (len > 0.01) {\n        // The GUST WAVE: two slow sines beat against each other — strength\n        // swells in rolling pulses rather than holding a flat shove.\n        const gust = 1 + WIND_CFG.gustAmp\n          * Math.max(0, Math.sin(host.time * 0.7) * Math.sin(host.time * 0.23));\n        w = {\n          nx: f.vel.x / len, ny: f.vel.y / len,\n          strength: Math.min(1.6, windDef * f.intensity * gust),\n        };\n      }\n    }\n    host.windCache = { at: host.time, w };\n    return w;\n  }",
      "outputSha256": "ab740db19966dfc3a647b6eb4b3f781115d0afc0f66e202b8f40741b3910f15b"
    },
    {
      "name": "snowCoverAt",
      "fn": "sceneSnowCoverAt",
      "kind": "method",
      "line": 48839,
      "source": "snowCoverAt(pos: Vec2): number {\n    return this.massRuntime?.snow?.at(this.massRuntime.walk.at(pos.x,pos.y)) ?? this.snowCover;\n  }",
      "sourceSha256": "90cd01d4ca77e0ad28d56ba2bfa7b01847ab575f4e5cf5212b8c7552a40c4383",
      "output": "export function sceneSnowCoverAt(host:NativeSceneCombatMotionHost, pos: Vec2): number {\n    return host.massRuntime?.snow?.at(host.massRuntime.walk.at(pos.x,pos.y)) ?? host.snowCover;\n  }",
      "outputSha256": "5f229aa7cbcc792669e56f86f44f350f0b57b6fb96317d342548f32b5e717598"
    },
    {
      "name": "voyageShip",
      "fn": "sceneVoyageShip",
      "kind": "method",
      "line": 3995,
      "source": "voyageShip(): ShipDef { return this.voyage?.ship ?? shipOf(this.account); }",
      "sourceSha256": "a397e58122dd8767d109589f24d617229b113a7525615dee8669dc8de2c2c414",
      "output": "export function sceneVoyageShip(host:NativeSceneCombatMotionHost): ShipDef { return host.voyage?.ship ?? shipOf(host.account); }",
      "outputSha256": "2b7609959d317074fa578d83b9e083180d3e9585809c359cd7a472c089bcf796"
    },
    {
      "name": "sailing",
      "fn": "sceneSailing",
      "kind": "getter",
      "line": 3992,
      "source": "get sailing(): boolean { return this.zone.id === VOYAGE_ZONE_ID; }",
      "sourceSha256": "aed22f1a4f9f41357d742fb0abe833917d44e5364361e66a653c62017f18f1f0",
      "output": "export function sceneSailing(host:NativeSceneCombatMotionHost): boolean { return host.zone.id === VOYAGE_ZONE_ID; }",
      "outputSha256": "ed15f5bd3174b11401fe868a0f6be0367018e299a8a7e9dbd559d4e7fe8bba44"
    }
  ],
  "helpers": [
    {
      "name": "WIND_CFG",
      "source": "export const WIND_CFG = {\n  /** Speed penalty factor per unit of headwind dot (dot is -str..+str). */\n  headwind: 0.38,\n  /** Speed bonus factor per unit of tailwind dot. */\n  tailwind: 0.2,\n  /** Hard floor/ceiling on the wind's movement scale. */\n  minScale: 0.55,\n  maxScale: 1.25,\n  /** How far upwind the shelter probe reaches (world units). */\n  shelterReach: 36,\n  /** Extra pad on a sheltering solid's body radius. */\n  shelterPad: 8,\n  /** Gust pulse: extra strength at the crest of the slow gust wave. */\n  gustAmp: 0.55,\n  /** PHYSICAL PUSH: world-units/sec a full-strength gale drifts a body of\n   *  weight 1 (divided by effectiveWeight — poise and mass are literal\n   *  anchors; a behemoth barely notices what skids a goblin). */\n  pushPerSec: 24,\n};",
      "sourceSha256": "fe0a3808065c1c1c6844f55adb6156c0a96ebb052c344724fcb036346376c7ff",
      "output": "export const WIND_CFG = {\n  /** Speed penalty factor per unit of headwind dot (dot is -str..+str). */\n  headwind: 0.38,\n  /** Speed bonus factor per unit of tailwind dot. */\n  tailwind: 0.2,\n  /** Hard floor/ceiling on the wind's movement scale. */\n  minScale: 0.55,\n  maxScale: 1.25,\n  /** How far upwind the shelter probe reaches (world units). */\n  shelterReach: 36,\n  /** Extra pad on a sheltering solid's body radius. */\n  shelterPad: 8,\n  /** Gust pulse: extra strength at the crest of the slow gust wave. */\n  gustAmp: 0.55,\n  /** PHYSICAL PUSH: world-units/sec a full-strength gale drifts a body of\n   *  weight 1 (divided by effectiveWeight — poise and mass are literal\n   *  anchors; a behemoth barely notices what skids a goblin). */\n  pushPerSec: 24,\n};",
      "outputSha256": "fe0a3808065c1c1c6844f55adb6156c0a96ebb052c344724fcb036346376c7ff"
    },
    {
      "name": "NOCLIP_DISP",
      "source": "const NOCLIP_DISP: DisplacementPolicy = { ignoreConfine: true };",
      "sourceSha256": "e2d5b53ed98c81764d22a82db2e336025a6e40e1769307569099461e94b03b21",
      "output": "export const NOCLIP_DISP: DisplacementPolicy = { ignoreConfine: true };",
      "outputSha256": "543a9bc9f7387fd74f29f4ba8c39fe403a845d14fc295c2b27dc0d392f0d5549"
    },
    {
      "name": "LEVITATE_DISP",
      "source": "const LEVITATE_DISP: DisplacementPolicy = { ignoreFall: true };",
      "sourceSha256": "5131c3406a8bbbac88ba2c24b42702072a965e1a2aa19ffcd37d479af94e495b",
      "output": "export const LEVITATE_DISP: DisplacementPolicy = { ignoreFall: true };",
      "outputSha256": "d4a2f59f4fe2212fa54f613ec7b89e5af6df5926f432cd66ecbfb479451916fc"
    }
  ],
  "fields": [
    {
      "name": "cScratch",
      "source": "private readonly cScratch: CollisionResult = { hit: 'none', at: vec(0, 0) };",
      "initializer": "{ hit: 'none', at: vec(0, 0) }",
      "sha256": "e79e73be7f058c6bf39d79134e35e5faf4a01d398a9aa92f61e22feb715f14b5"
    },
    {
      "name": "windCache",
      "source": "private windCache: { at: number; w: { nx: number; ny: number; strength: number } | null } = { at: -1, w: null };",
      "initializer": "{ at: -1, w: null }",
      "sha256": "83d745fd388a6756778b75c44105d4ac6fc9dc02c1e2084663193947324731b1"
    },
    {
      "name": "geyserMode",
      "source": "geyserMode: 'bands' | 'solo' = 'bands';",
      "initializer": "'bands'",
      "sha256": "6e5f61a657bf7044bc94000051e1b7c13a0910339d7e9a07f26f340fcc81bc09"
    },
    {
      "name": "ownWalk",
      "source": "ownWalk: { spd: number; trc: number } | null = null;",
      "initializer": "null",
      "sha256": "69b0832f2f35e14e43101cc782ada39f11f936622ddba78366719bb2cd0114c1"
    }
  ],
  "hostProperties": [
    {
      "name": "account",
      "methods": [
        "voyageShip"
      ],
      "writes": []
    },
    {
      "name": "actorById",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "actors",
      "methods": [
        "imminentThreatTo",
        "slipAway",
        "despawnPartsOf",
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "applyRecovery",
      "methods": [
        "resolveBoundary"
      ],
      "writes": []
    },
    {
      "name": "castMoveFactor",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "channelMobility",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "clampPos",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "cScratch",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "despawnPartsOf",
      "methods": [
        "slipAway"
      ],
      "writes": []
    },
    {
      "name": "devNoclip",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "doodadsAt",
      "methods": [
        "windAt"
      ],
      "writes": []
    },
    {
      "name": "enemiesOf",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "flashes",
      "methods": [
        "slipAway"
      ],
      "writes": []
    },
    {
      "name": "geyserMode",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "geysers",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "guardArts",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "hostileTo",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "kill",
      "methods": [
        "drainSurvival"
      ],
      "writes": []
    },
    {
      "name": "ledger",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "levitating",
      "methods": [
        "moveActor",
        "resolveBoundary"
      ],
      "writes": []
    },
    {
      "name": "markSeatActed",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "markSeatMoved",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "massRuntime",
      "methods": [
        "zoneWind",
        "snowCoverAt"
      ],
      "writes": []
    },
    {
      "name": "mountUnlink",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "movementLocked",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "ownWalk",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "pitPolicyFor",
      "methods": [
        "resolveBoundary"
      ],
      "writes": []
    },
    {
      "name": "plantImpactDress",
      "methods": [
        "plantDressAt"
      ],
      "writes": []
    },
    {
      "name": "player",
      "methods": [
        "moveActor",
        "zoneWind"
      ],
      "writes": []
    },
    {
      "name": "resolveBoundary",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "sailing",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "seatByActor",
      "methods": [
        "markSeatMoved"
      ],
      "writes": []
    },
    {
      "name": "seatOf",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "skyFront",
      "methods": [
        "zoneWind"
      ],
      "writes": []
    },
    {
      "name": "snowCover",
      "methods": [
        "snowCoverAt"
      ],
      "writes": []
    },
    {
      "name": "snowCoverAt",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "steppedClamp",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "survivalDrainRate",
      "methods": [
        "drainSurvival"
      ],
      "writes": []
    },
    {
      "name": "text",
      "methods": [
        "drainSurvival",
        "slipAway"
      ],
      "writes": []
    },
    {
      "name": "tierCrossings",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "time",
      "methods": [
        "drainSurvival",
        "imminentThreatTo",
        "moveActor",
        "markSeatMoved",
        "steppedClamp",
        "resolveBoundary",
        "zoneWind"
      ],
      "writes": []
    },
    {
      "name": "tracks",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "underRoofAt",
      "methods": [
        "windAt"
      ],
      "writes": []
    },
    {
      "name": "voyage",
      "methods": [
        "voyageShip"
      ],
      "writes": []
    },
    {
      "name": "voyageShip",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "walk",
      "methods": [
        "steppedClamp"
      ],
      "writes": []
    },
    {
      "name": "windAt",
      "methods": [
        "moveActor"
      ],
      "writes": []
    },
    {
      "name": "windCache",
      "methods": [
        "zoneWind"
      ],
      "writes": [
        "zoneWind"
      ]
    },
    {
      "name": "zone",
      "methods": [
        "steppedClamp",
        "windAt",
        "sailing"
      ],
      "writes": []
    },
    {
      "name": "zones",
      "methods": [
        "imminentThreatTo"
      ],
      "writes": []
    },
    {
      "name": "zoneWind",
      "methods": [
        "windAt"
      ],
      "writes": []
    }
  ],
  "outputSource": "/** Exact original42 movement, survival and theater-facing local closure.\n * Actual admission and lifecycle belong to the real combat aggregate. */\nimport type {World} from \"./world\";\nimport { markBodyWalk } from './bodyWalk';\nimport { ensureMovementTether, refreshMovementTether } from './movementTether';\nimport { clamp, dist, vec, type Vec2 } from '../core/math';\nimport { STATUS_DEFS } from './status';\nimport { Actor } from './actor';\nimport { BEHAVIOR_CFG } from './brain';\nimport { rampValue, instanceChannel, type ImpactDressSpec } from './skills';\nimport { blocksMovement, bodyRadiusOf } from './levelgen';\nimport { landingTier, laneLedgerOnDescend, linkFlipTier, resolveTierCrossing, tierEnclosed, tierLinkOf } from './tiers';\nimport { shapeContains } from './shapes';\nimport { VOYAGE_CFG, VOYAGE_ZONE_ID } from '../world/voyage';\nimport { shipOf, type ShipDef } from '../data/ships';\nimport { regionKind, survivalResource, survivalEaseStat, SURVIVAL_EASE_CAP } from '../world/regions';\nimport { riderSurface, TRACK_CFG, trackDone, trackPose } from './tracks';\nimport { GEYSER_CFG, ventReadAt } from './geysers';\nimport { GRAB_CFG, grabHolderMove } from './grab';\nimport type { DisplacementPolicy, CollisionResult } from '../world/regions';\nimport { bumpLedger } from '../packages/ledger';\nimport { SNOW_CFG } from './snowCover';\nimport { WEATHER_DEFS } from '../world/weather';\nexport interface NativeSceneCombatMotionHost {\n readonly account:World[\"account\"];\n readonly actorById:World[\"actorById\"];\n readonly actors:World[\"actors\"];\n readonly applyRecovery:World[\"applyRecovery\"];\n readonly castMoveFactor:World[\"castMoveFactor\"];\n readonly channelMobility:World[\"channelMobility\"];\n readonly clampPos:World[\"clampPos\"];\n readonly cScratch:World[\"cScratch\"];\n readonly despawnPartsOf:World[\"despawnPartsOf\"];\n readonly devNoclip:World[\"devNoclip\"];\n readonly doodadsAt:World[\"doodadsAt\"];\n readonly enemiesOf:World[\"enemiesOf\"];\n readonly flashes:World[\"flashes\"];\n readonly geyserMode:World[\"geyserMode\"];\n readonly geysers:World[\"geysers\"];\n readonly guardArts:World[\"guardArts\"];\n readonly hostileTo:World[\"hostileTo\"];\n readonly kill:World[\"kill\"];\n readonly ledger:World[\"ledger\"];\n readonly levitating:World[\"levitating\"];\n readonly markSeatActed:World[\"markSeatActed\"];\n readonly markSeatMoved:World[\"markSeatMoved\"];\n readonly massRuntime:World[\"massRuntime\"];\n readonly mountUnlink:World[\"mountUnlink\"];\n readonly movementLocked:World[\"movementLocked\"];\n readonly ownWalk:World[\"ownWalk\"];\n readonly pitPolicyFor:World[\"pitPolicyFor\"];\n readonly plantImpactDress:World[\"plantImpactDress\"];\n readonly player:World[\"player\"];\n readonly resolveBoundary:World[\"resolveBoundary\"];\n readonly sailing:World[\"sailing\"];\n readonly seatByActor:World[\"seatByActor\"];\n readonly seatOf:World[\"seatOf\"];\n readonly skyFront:World[\"skyFront\"];\n readonly snowCover:World[\"snowCover\"];\n readonly snowCoverAt:World[\"snowCoverAt\"];\n readonly steppedClamp:World[\"steppedClamp\"];\n readonly survivalDrainRate:World[\"survivalDrainRate\"];\n readonly text:World[\"text\"];\n readonly tierCrossings:World[\"tierCrossings\"];\n readonly time:World[\"time\"];\n readonly tracks:World[\"tracks\"];\n readonly underRoofAt:World[\"underRoofAt\"];\n readonly voyage:World[\"voyage\"];\n readonly voyageShip:World[\"voyageShip\"];\n readonly walk:World[\"walk\"];\n readonly windAt:World[\"windAt\"];\n windCache:World[\"windCache\"];\n readonly zone:World[\"zone\"];\n readonly zones:World[\"zones\"];\n readonly zoneWind:World[\"zoneWind\"];\n}\nexport const WIND_CFG = {\n  /** Speed penalty factor per unit of headwind dot (dot is -str..+str). */\n  headwind: 0.38,\n  /** Speed bonus factor per unit of tailwind dot. */\n  tailwind: 0.2,\n  /** Hard floor/ceiling on the wind's movement scale. */\n  minScale: 0.55,\n  maxScale: 1.25,\n  /** How far upwind the shelter probe reaches (world units). */\n  shelterReach: 36,\n  /** Extra pad on a sheltering solid's body radius. */\n  shelterPad: 8,\n  /** Gust pulse: extra strength at the crest of the slow gust wave. */\n  gustAmp: 0.55,\n  /** PHYSICAL PUSH: world-units/sec a full-strength gale drifts a body of\n   *  weight 1 (divided by effectiveWeight — poise and mass are literal\n   *  anchors; a behemoth barely notices what skids a goblin). */\n  pushPerSec: 24,\n};\nexport const NOCLIP_DISP: DisplacementPolicy = { ignoreConfine: true };\nexport const LEVITATE_DISP: DisplacementPolicy = { ignoreFall: true };\nexport interface NativeCombatMotionState {\n cScratch:World[\"cScratch\"];\n windCache:World[\"windCache\"];\n geyserMode:World[\"geyserMode\"];\n ownWalk:World[\"ownWalk\"];\n}\nexport function freshNativeCombatMotionState():NativeCombatMotionState {return {\n cScratch:{ hit: 'none', at: vec(0, 0) },\n windCache:{ at: -1, w: null },\n geyserMode:'bands',\n ownWalk:null\n};}\nexport function sceneDrainSurvival(host:NativeSceneCombatMotionHost, a: Actor, resource: string, drain: number, dt: number): void {\n    const def = survivalResource(resource);\n    if (!def) return;\n    if (!a.survival) a.survival = new Map();\n    const v = Math.max(0, (a.survival.get(resource) ?? def.max) - host.survivalDrainRate(a, resource, drain) * dt);\n    a.survival.set(resource, v);\n    if (v > 0) { if (a.underflowSince) delete a.underflowSince[resource]; return; } // refilled → THAT meter's ramp resets\n    if (def.underflowPctLifePerSec > 0 && !a.invulnerable) {\n      // RAMPING underflow, clocked PER RESOURCE: from underflowPctLifePerSec up to\n      // underflowRampTo over underflowRampSecs of continuous emptiness — the dread of\n      // staying down (breath: 5%→25% / sec over 10s; light gnaws the same shape under\n      // the Gloaming). A flat row (underflow 0) never enters here, and every knob —\n      // rates, ramp, warning text + colour — lives on the SURVIVAL_RESOURCES row.\n      const since = (a.underflowSince ??= {});\n      if (since[resource] === undefined) since[resource] = host.time;\n      let pct = def.underflowPctLifePerSec;\n      if (def.underflowRampTo !== undefined && def.underflowRampSecs) {\n        const t = clamp((host.time - since[resource]) / def.underflowRampSecs, 0, 1);\n        pct = def.underflowPctLifePerSec + (def.underflowRampTo - def.underflowPctLifePerSec) * t;\n      }\n      a.life -= a.maxLife() * pct * dt;\n      // Throttle the warning on a dedicated per-resource timer (NOT movement) so it\n      // shows once every ~0.8s whether the suffering actor is still or moving.\n      const gasp = (a.lastGaspAt ??= {});\n      if (host.time - (gasp[resource] ?? -9) >= 0.8) {\n        gasp[resource] = host.time;\n        host.text(a.pos, def.underflowText ?? 'failing!', def.underflowTextColor ?? def.color, 12);\n      }\n      if (a.life <= 0 && !a.dead) host.kill(a, false);\n    }\n  }\n\nexport function sceneImminentThreatTo(host:NativeSceneCombatMotionHost, actor: Actor, pad: number):\n    { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null {\n    let best: { ref: object; pos: Vec2; radius: number; eta: number; casterPos?: Vec2 } | null = null;\n    for (const z of host.zones) {\n      if (z.exploded || z.delay <= 0) continue;\n      if (z.delay > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (z.caster === actor) continue;\n      if (!z.hitAll && !host.hostileTo(z.caster, actor)) continue;\n      const r = z.radius + pad;\n      if (dist(actor.pos, z.pos) > r) continue;\n      if (!best || z.delay < best.eta) {\n        best = { ref: z, pos: z.pos, radius: r, eta: z.delay,\n          casterPos: vec(z.caster.pos.x, z.caster.pos.y) };\n      }\n    }\n    for (const e of host.enemiesOf(actor)) {\n      const cs = e.casting;\n      if (!cs || cs.mode === 'channel' || cs.mode === 'guard') continue;\n      const eta = cs.total - cs.elapsed;\n      if (eta <= 0.08 || eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n      const del = cs.inst.def.delivery as { type: string; radius?: number; vent?: { columnR: number } };\n      // THE VENT-RIDE's broil (LeapDelivery.vent): a vent-leaper's wind-up is\n      // a column-to-be under its own feet — the dodge-mind reads the same\n      // drawn roil the eyes do (drawn == tested) and steps off it.\n      const ventR = del.type === 'leap' && del.vent ? del.vent.columnR : undefined;\n      if (del.type !== 'ground' && del.type !== 'nova' && ventR === undefined) continue;\n      if (!del.radius && ventR === undefined) continue;\n      const at = del.type === 'nova' || ventR !== undefined ? e.pos : cs.aim;\n      const r = (ventR ?? del.radius ?? 0) + pad;\n      if (dist(actor.pos, at) > r) continue;\n      if (!best || eta < best.eta) {\n        best = { ref: cs, pos: vec(at.x, at.y), radius: r, eta,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TELEGRAPHED LEAPS (LeapDelivery.telegraph): a diving body's painted\n    // landing ring is a threat like any un-exploded disc — dodge-minds read\n    // the stoop exactly the way the player's eyes do. Scanned off the raw\n    // actor list because a leaper is untargetable (it vanishes from\n    // enemiesOf mid-flight) yet its landing is the one thing that matters.\n    for (const e of host.actors) {\n      const L = e.leap;\n      if (!L?.telegraph || e === actor || e.dead) continue;\n      if (L.timer > BEHAVIOR_CFG.dodgeHorizon) continue;\n      if (!host.hostileTo(e, actor)) continue;\n      const r = L.radius + pad;\n      if (dist(actor.pos, L.dest) > r) continue;\n      if (!best || L.timer < best.eta) {\n        best = { ref: L, pos: vec(L.dest.x, L.dest.y), radius: r, eta: L.timer,\n          casterPos: vec(e.pos.x, e.pos.y) };\n      }\n    }\n    // TRACK RIDERS (the track fabric): a blade closing on this body is a\n    // threat like any un-exploded disc — and because rider motion is a pure\n    // function of the clock, the scan samples the ACTUAL future, not an\n    // estimate. The player's eyes (the warn arc) and this read are one truth\n    // from one resolver.\n    for (const tr of host.tracks) {\n      if (!tr.armed || trackDone(tr, host.time)) continue;   // retracted / retired lanes threaten nothing\n      const b = tr.bound;\n      const margin = pad + actor.radius + 40;\n      if (actor.pos.x < b.x0 - margin || actor.pos.x > b.x1 + margin ||\n          actor.pos.y < b.y0 - margin || actor.pos.y > b.y1 + margin) continue;\n      const horizon = Math.min(TRACK_CFG.threatHorizon, BEHAVIOR_CFG.dodgeHorizon);\n      for (const r of tr.riders) {\n        const p = r.def.payload;\n        if (!p.hit && !p.impulse) continue;\n        for (let t = TRACK_CFG.threatStep; t <= horizon; t += TRACK_CFG.threatStep) {\n          const pose = trackPose(tr, host.time + t, r.phase, r.def);\n          if (pose.pending) continue;                        // the bolt still in the wall — real only past bornAt\n          if (!shapeContains(riderSurface(r.def, pose), pose.x, pose.y,\n            actor.pos.x, actor.pos.y, actor.radius + pad)) continue;\n          if (!best || t < best.eta) {\n            const reach = r.def.surface.kind === 'circle'\n              ? r.def.surface.r : Math.hypot(r.def.surface.hw, r.def.surface.hh);\n            best = { ref: r, pos: vec(pose.x, pose.y), radius: reach + pad, eta: t };\n          }\n          break; // first cover is the read — later samples only age it\n        }\n      }\n    }\n    // GEYSER VENTS (the geyser fabric): a broiling vent's coming column is\n    // a threat like any un-exploded disc — the dodge-mind reads the SAME\n    // pure resolver the drawn broil rises from (drawn == tested; the vent\n    // object is the stable ref, so the read rolls once per telegraph). The\n    // dodge horizon clips the ~2s broil to its last stretch — the locals\n    // step off \"one breath before\", exactly the charter's tell.\n    if (host.geysers) {\n      for (const v of host.geysers.vents) {\n        const r = GEYSER_CFG.classes[v.cls].columnR + pad;\n        if (dist(actor.pos, v.pos) > r) continue;\n        const read = ventReadAt(host.geysers, v, host.time, host.geyserMode);\n        const eta = read.phase === 'erupt' ? 0.05 : read.toBurst;\n        if (eta > BEHAVIOR_CFG.dodgeHorizon) continue;\n        if (!best || eta < best.eta) {\n          best = { ref: v, pos: vec(v.pos.x, v.pos.y), radius: r, eta };\n        }\n      }\n    }\n    return best;\n  }\n\nexport function scenePlantDressAt(host:NativeSceneCombatMotionHost, pos: Vec2, radius: number, spec: ImpactDressSpec): void {\n    host.plantImpactDress({ pos: vec(pos.x, pos.y), radius, impactDress: spec });\n  }\n\nexport function sceneMoveActor(host:NativeSceneCombatMotionHost, a: Actor, dx: number, dy: number, dt: number): void {\n    ensureMovementTether(a);\n    if (refreshMovementTether(a, host)?.returning) return;\n    if (host.movementLocked(a)) return;\n    // A LATCHED rider's position is slaved to its seat (engine/cling.ts):\n    // the mover contract simply refuses — no pit checks, no wall slides,\n    // no drift for a body that is riding another.\n    if (a.clingTo) return;\n    // A MOUNTED body that WILLS a step quits its saddle first (the mount\n    // fabric): monster riders in the 'hold' kernel never call the mover, so\n    // any real move here is deliberate — a possessed rider's stick, a\n    // command verb, a forced march. The step itself then proceeds on foot.\n    if (a.mountId !== undefined) host.mountUnlink(a);\n    // A HELD body's movement is REPLACED by struggle (the grab fabric):\n    // intent feeds the break meter through the one mover, then refuses —\n    // mashing the stick IS the escape mechanic, for player and monster\n    // alike (a held wolf's own brain keeps walking, and so keeps fighting).\n    if (a.heldBy !== undefined) {\n      const holder = host.actorById(a.heldBy);\n      const hold = holder?.gripping;\n      if (hold && hold.id === a.id) {\n        const want = Math.hypot(dx, dy);\n        if (want > 0.001) hold.struggle += GRAB_CFG.break.moveFeed * Math.min(1, want) * dt;\n      }\n      return;\n    }\n    // WIDDERSHINS (StatusDef.invertMove — the confusion family's turned\n    // hand): VOLITIONAL intent flips at the one mover, so the player's\n    // keys, a monster's steering and a minion's orders all betray their\n    // bearers alike — the brain commands 'approach', the feet answer\n    // 'away'. Knockback (pushActor), grab reeling and track shoves ride\n    // other arteries untouched: the world still moves you true; only your\n    // own steps turn contrary.\n    for (const s of a.statuses) {\n      if (STATUS_DEFS[s.id]?.invertMove) { dx = -dx; dy = -dy; break; }\n    }\n    // Channeling restricts movement per the skill's data, opened back up by\n    // the channelMobility stat (immobile 0 / slowed factor / normal 1, + stat).\n    let channelFactor = 1;\n    if (a.casting?.mode === 'channel') {\n      // THE GATHER'S STRIDE (ruled 2026-08-20): the LIVE spec — the\n      // gather conversion's synthesized words win over the def's, the\n      // same `cs.gather ?? view` resolution the pulse machinery rides. A\n      // gathering caster walks SLOWED (its authored 0.5), not free: the\n      // conversion trades the bar's rooting for the channel bargain, and\n      // channelMobility investment opens it further. (A spent tree node's\n      // rampMove rides this same read — the skill-mode audit's view.)\n      const ch = a.casting.gather ?? instanceChannel(a.casting.inst);\n      const base = ch?.move === 'immobile' ? 0 : ch?.move === 'slowed' ? (ch.moveFactor ?? 0.5) : 1;\n      // rampMove: the held channel DRAGS (negative per — Undertow's\n      // maelstrom slowly anchors its own bearer) or FREES (positive — the\n      // gathering current), on the same curve family as the damage ramps.\n      // Floored at rooted; capped ×1.6, and only a rampMove channel may\n      // exceed a walking pace at all.\n      const rm = ch?.rampMove\n        ? rampValue(ch.rampMove, a.casting.channelTime ?? 0) : 0;\n      channelFactor = Math.max(0, Math.min(ch?.rampMove ? 1.6 : 1,\n        base + host.channelMobility(a, a.casting.inst) + rm));\n      if (channelFactor <= 0) return;\n    } else if (a.casting?.mode === 'guard') {\n      // Shield up: heavy steps, but you keep your feet.\n      channelFactor = a.casting.inst.def.guard?.moveFactor ?? 0.4;\n    } else if (a.casting) {\n      // A mobile cast bar (castMove + castMobility) — rooted bars never\n      // reach here (movementLocked already refused).\n      channelFactor = host.castMoveFactor(a, a.casting.inst);\n      if (channelFactor <= 0) return;\n    }\n    // Toggled FORMS slow their bearer (moveFactor between 0 and 1 —\n    // rooted forms never reach here; movementLocked already refused).\n    for (const au of a.activeAuras.values()) {\n      const ad = au.inst.def.delivery;\n      if (ad.type === 'aura' && ad.moveFactor !== undefined && ad.moveFactor > 0) {\n        channelFactor *= ad.moveFactor;\n      }\n    }\n    // A LIVE HOLD is a burden (the grab fabric): carrying walks slow,\n    // hauling drags, pinning and swallowing ROOT — the verb's factor\n    // composes like a channel's (engine/grab.ts holderMove).\n    if (a.gripping) {\n      const gf = grabHolderMove(a.gripping);\n      if (gf <= 0) return;\n      channelFactor *= gf;\n    }\n    const len = Math.hypot(dx, dy);\n    if (len < 0.001) return;\n    if (dt > 0 && channelFactor > 0) host.guardArts.ram(a, dx, dy);\n    // REGION move-scale: a road speeds you up, a future tar-pit could slow — a direct\n    // multiplier (NOT a status) from the terrain underfoot last frame (doodad ground +\n    // grid region). Defaults to 1 when the kind has no moveScale. The first user is 'road'.\n    // (Co-op: a client's groundKind is host-set, so its move-PREDICTION under-shoots the\n    // ~4% road boost until the next host ack re-anchors it — bounded + self-healing.)\n    const regionScale = (regionKind(a.groundKind)?.moveScale ?? 1) * (regionKind(a.gridRegion)?.moveScale ?? 1);\n    // At sea the hero IS the boat — quicker than boots, and a better HULL is\n    // quicker still (VOYAGE_CFG lever × the account's ship).\n    const boatScale = host.sailing ? VOYAGE_CFG.boatSpeedMul * host.voyageShip().speedMul : 1;\n    // DIRECTIONAL WIND (WEATHER_DEFS[kind].wind): pushing into the gale is\n    // work, running with it is a gift — and an anchored solid upwind\n    // (windAt's shelter probe) becalms you entirely. Applies to EVERYONE\n    // that walks, monsters included; sails feel it too, doubly.\n    let windScale = 1;\n    const gale = host.windAt(a.pos, a.tier);\n    if (gale) {\n      const dot = (dx / len) * gale.x + (dy / len) * gale.y;\n      windScale = clamp(\n        1 + dot * (dot < 0 ? WIND_CFG.headwind : WIND_CFG.tailwind),\n        WIND_CFG.minScale, WIND_CFG.maxScale);\n    }\n    // SNOW DENSITY: standing cover is heavy going for every walker\n    // (SNOW_CFG.slowAtFull at a full blanket). Boats don't wade snow.\n    const snowScale = host.sailing ? 1 : 1 - host.snowCoverAt(a.pos) * SNOW_CFG.slowAtFull;\n    // A held stance's own kit joins the read (Actor.walkSpeed's stanceRead): the\n    // marching wall's 'guarding'-scoped speed rows live on the instance. THE HONEST\n    // INPUT: a render shell's OWN hero walks the fold its seat row carries (ownWalk;\n    // the shell's statuses are display stubs); every host body reads its own sheet.\n    const ow = host.ownWalk !== null && a === host.player ? host.ownWalk : null;\n    const speed = (ow ? ow.spd : a.walkSpeed()) * channelFactor * regionScale * boatScale * windScale * snowScale;\n    const traction = ow ? ow.trc : a.walkTraction();\n    a.lastMoveAt = host.time;\n    a.idleFor = 0; // a deliberate step breaks the 'stationary' stance\n    a.plantFor = 0; // …and the plant clock with it (the commitment resets)\n    // The 'move' charge-tap odometer (Galvanic Reserve) — intended stride,\n    // consumed by Actor.updateCharges on its own meters.\n    a.moveAcc += speed * dt;\n    host.markSeatActed(a); // movement interrupts THAT seat's dwell\n    host.markSeatMoved(a); // …and, THE SHIMMY LAW, a willed step re-arms a spent one\n    // DEV noclip: the local hero phases through walls/rocks/void (bounds still\n    // hold). TRUE FLIERS ride the same displacement policy — the wing cares\n    // nothing for rocks, walls or the gap beneath. A LEVITATOR (base flag or\n    // the 'levitation' stat — cloudform) floats over void bands but walls\n    // still confine it: it floats, it doesn't phase.\n    const disp = (host.devNoclip && a === host.player) || a.flying ? NOCLIP_DISP\n      : host.levitating(a) ? LEVITATE_DISP : undefined;\n    // THE STRIDE's odometer (strideReach — THE LEGEND FABRIC): the distance\n    // a willed step ACTUALLY covered (post-clamp — a wall walks nothing),\n    // banked only while the sheet arms a reach, so an unarmed walker pays\n    // one cached read and never accrues.\n    const striding = a.sheet.get('strideReach') > 0;\n    const sx = a.pos.x, sy = a.pos.y;\n    if (traction >= 0.999) {\n      // Solid ground: instant control, exactly as ever.\n      a.vel.x = (dx / len) * speed;\n      a.vel.y = (dy / len) * speed;\n      host.steppedClamp(a, vec(\n        a.pos.x + (dx / len) * speed * dt,\n        a.pos.y + (dy / len) * speed * dt,\n      ), a.pos, disp);\n    } else {\n      // Slippery: input only STEERS the momentum; the ice decides the rest.\n      const blend = Math.min(1, dt * (1.5 + traction * 14));\n      a.vel.x += ((dx / len) * speed - a.vel.x) * blend;\n      a.vel.y += ((dy / len) * speed - a.vel.y) * blend;\n      host.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos, disp);\n    }\n    if (striding) a.strideDist += Math.hypot(a.pos.x - sx, a.pos.y - sy);\n    if (!host.sailing) markBodyWalk(a, a.pos.x - sx, a.pos.y - sy, host.time);\n  }\n\nexport function sceneSlipAway(host:NativeSceneCombatMotionHost, actor: Actor, text: string, color = '#c8a850', fx?: string): void {\n    host.despawnPartsOf(actor);\n    const i = host.actors.indexOf(actor);\n    if (i >= 0) host.actors.splice(i, 1);\n    // THE EFFECT VOICE: a refuge row may name its exit's painter (the\n    // squirrel's 'scramble' leaf-flick); every unkeyed departure keeps the\n    // classic soft flash — the honored generic (absent == identical).\n    host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: 60, color, life: 0.5, maxLife: 0.5, fx });\n    if (text) host.text(vec(actor.pos.x, actor.pos.y - 30), text, color, 14);\n  }\n\nexport function sceneSurvivalDrainRate(host:NativeSceneCombatMotionHost, a: Actor, resource: string, rate: number): number {\n    if (rate <= 0) return rate;\n    const ease = a.sheet.get(survivalEaseStat(resource));\n    if (ease <= 0) return rate;\n    const def = survivalResource(resource);\n    return rate * (1 - Math.min(def?.easeCap ?? SURVIVAL_EASE_CAP, ease));\n  }\n\nexport function sceneDespawnPartsOf(host:NativeSceneCombatMotionHost, actor: Actor): void {\n    for (const p of actor.partActors ?? []) {\n      if (p.dead) continue;\n      const i = host.actors.indexOf(p);\n      if (i >= 0) host.actors.splice(i, 1);\n    }\n  }\n\nexport function sceneMarkSeatMoved(host:NativeSceneCombatMotionHost, actor: Actor): void {\n    const s = host.seatByActor.get(actor);\n    if (s) s.lastMovedAt = host.time;\n  }\n\nexport function sceneSteppedClamp(host:NativeSceneCombatMotionHost, a: Actor, dest: Vec2, from: Vec2, disp?: DisplacementPolicy): void {\n    const sc = host.cScratch;\n    sc.hit = 'none';\n    // THE LANDING RE-SEAT at the mover (engine/tiers.ts landingTier): a\n    // just-landed body re-derives its story from the floor it STANDS on\n    // BEFORE any clamp consults a tier view — else the first grounded\n    // step's snap drags the diver back onto the story it left (measured\n    // live: a stooping condor teleport-climbing its own rim, 24px in one\n    // frame). The world sweep keeps the stationary lander's copy.\n    if (a.touchdown && !a.flying && !a.leap && !a.dash\n      && host.zone.tiers && host.walk?.regionAt) {\n      a.touchdown = false;\n      a.tier = landingTier(host.walk.regionAt(from.x, from.y), a.tier);\n    }\n    // TIER CROSSING (engine/tiers.ts): standing on a link (ramp, culvert)\n    // and stepping toward ground only the other layer owns FLIPS the body's\n    // tier BEFORE the clamp judges the move — walking up a ramp is just\n    // walking. (Pure read; flat zones return the tier untouched.)\n    if (host.zone.tiers && host.walk) a.tier = resolveTierCrossing(host.walk, a.tier, from, dest);\n    a.pos = host.clampPos(dest, a.radius, from, { out: sc, disp, mover: a });\n    if ((sc.hit as string) === 'void') host.resolveBoundary(a, sc, from);\n    // THE LADDER TOGGLE (the crossing law's second half): a link cell whose\n    // neighborhood is BOTH-tier ground (a culvert well among street-over-duct\n    // cells) never trips the exit rule — so ENTERING a link flips the layer\n    // outright, latched to one toggle per visit. Stepping onto an open\n    // culvert IS descending; reaching a well from the duct IS surfacing.\n    // Ramps self-correct through the exit rule above either way.\n    if (host.zone.tiers && host.walk?.regionAt) {\n      const linkK = host.walk.regionAt(a.pos.x, a.pos.y);\n      const onLink = tierLinkOf(linkK);\n      if (onLink && !a.onTierLink) {\n        const storyBefore = a.tier;\n        a.tier = linkFlipTier(linkK, a.tier);\n        a.aiTierGoal = undefined; // crossed — any chase goal is spent\n        // THE DESCENT LEDGER (UnderTierSpec.ledgerOnDescend — the cistern's\n        // `cistern_entered`): a hero's body going DOWN a lane's crossing for\n        // the first time stamps the lane's key on the run ledger (merged to\n        // the account on death) — the sidezone fabric's ledgerOnEnter for a\n        // story that has no door. Seats only; monsters keep no book.\n        if (storyBefore === 0 && a.tier >= 1 && host.seatOf(a)) {\n          const key = laneLedgerOnDescend(host.zone.tiers?.lane);\n          if (key) bumpLedger(host.ledger, key);\n        }\n        // THE PURSUIT STAMP (the tier chase): whoever was hunting THIS body\n        // watched it take the stair — hand every engaged pursuer in earshot\n        // the crossing as a goal; walking onto it flips them through, and\n        // the ordinary re-acquire picks the hunt back up on the other side.\n        for (const e of host.actors) {\n          if (e.dead || e === a || e.aiTargetId !== a.id) continue;\n          if (Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y) > 900) continue;\n          e.aiTierGoal = { x: a.pos.x, y: a.pos.y, until: host.time + 8 };\n        }\n        // THE LEDGER (chase memory): late pursuers — the ones who pick up\n        // the trail after the stair — read the crossing from here.\n        host.tierCrossings.push({ x: a.pos.x, y: a.pos.y, actorId: a.id, team: a.team, at: host.time });\n        if (host.tierCrossings.length > 12) host.tierCrossings.shift();\n      }\n      a.onTierLink = onLink;\n    }\n  }\n\nexport function sceneResolveBoundary(host:NativeSceneCombatMotionHost, a: Actor, result: CollisionResult, pre: Vec2, forced = false): void {\n    let policy = regionKind(result.blockedKind)?.boundaryPolicy;\n    if (policy) policy = host.pitPolicyFor(policy,result.at); // the zone's word on pit-family falls\n    if (!policy) return;\n    // A LEVITATING actor floats over fall pits (void): no fall damage / eject — so it\n    // can't be knocked into the void for a cheap kill. (Pathing still avoids void.)\n    if (host.levitating(a) && (policy.kind === 'fall' || policy.kind === 'descend')) return;\n    // Debounce fall/eject/skyfall/descend so being held against a void edge\n    // doesn't melt the actor every frame — one recovery per ~0.6s.\n    if (policy.kind === 'fall' || policy.kind === 'eject' || policy.kind === 'skyfall' || policy.kind === 'descend') {\n      if (host.time - (a.lastFall ?? -9) < 0.6) return;\n      a.lastFall = host.time;\n    }\n    host.applyRecovery(a, policy, pre, forced);\n  }\n\nexport function sceneWindAt(host:NativeSceneCombatMotionHost, pos: Vec2, tier = 0): { x: number; y: number; strength: number } | null {\n    const w = host.zoneWind(pos);\n    if (!w) return null;\n    // UNDER A CEILING (the enclosure law): a body on an enclosed under-\n    // layer's story feels no gale — the street's wind is not the duct's.\n    if (tier >= 1 && host.zone.tiers?.kind === 'under' && tierEnclosed(host.zone.tiers)) return null;\n    // INDOORS: a roof owns its sky — no gale under it (courtyards stay open).\n    if (host.underRoofAt(pos)) return null;\n    const px = pos.x - w.nx * WIND_CFG.shelterReach;\n    const py = pos.y - w.ny * WIND_CFG.shelterReach;\n    // The upwind probe reads BODY radii (bodyRadiusOf): a canopy tree shelters\n    // only in its trunk's narrow lee — wind blows through the leaves, and the\n    // shade of a crown is deliberately NOT cover from the gale.\n    for (const d of host.doodadsAt(px, py)) {\n      if (!blocksMovement(d)) continue;\n      const dx = px - d.pos.x, dy = py - d.pos.y;\n      const reach = bodyRadiusOf(d) + WIND_CFG.shelterPad;\n      if (dx * dx + dy * dy <= reach * reach) return null; // becalmed\n    }\n    return { x: w.nx * w.strength, y: w.ny * w.strength, strength: w.strength };\n  }\n\nexport function sceneZoneWind(host:NativeSceneCombatMotionHost, pos: Vec2 = host.player.pos): { nx: number; ny: number; strength: number } | null {\n    if (!host.massRuntime?.weather && host.windCache.at === host.time) return host.windCache.w;\n    let w: { nx: number; ny: number; strength: number } | null = null;\n    const f = host.skyFront(pos);\n    const windDef = f ? WEATHER_DEFS[f.kind].wind : undefined;\n    if (f && windDef) {\n      const len = Math.hypot(f.vel.x, f.vel.y);\n      if (len > 0.01) {\n        // The GUST WAVE: two slow sines beat against each other — strength\n        // swells in rolling pulses rather than holding a flat shove.\n        const gust = 1 + WIND_CFG.gustAmp\n          * Math.max(0, Math.sin(host.time * 0.7) * Math.sin(host.time * 0.23));\n        w = {\n          nx: f.vel.x / len, ny: f.vel.y / len,\n          strength: Math.min(1.6, windDef * f.intensity * gust),\n        };\n      }\n    }\n    host.windCache = { at: host.time, w };\n    return w;\n  }\n\nexport function sceneSnowCoverAt(host:NativeSceneCombatMotionHost, pos: Vec2): number {\n    return host.massRuntime?.snow?.at(host.massRuntime.walk.at(pos.x,pos.y)) ?? host.snowCover;\n  }\n\nexport function sceneVoyageShip(host:NativeSceneCombatMotionHost): ShipDef { return host.voyage?.ship ?? shipOf(host.account); }\n\nexport function sceneSailing(host:NativeSceneCombatMotionHost): boolean { return host.zone.id === VOYAGE_ZONE_ID; }\n\n",
  "outputSha256": "de42989381f33cb5a5221e828d0ff938e44860af74b6a423a3edda910dbd62e1"
} as const;
