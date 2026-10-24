/** Immutable original42 complete local frame sections. */
export const nativeSceneFrameArchive={
  "pin": "42f95716294995cbdd83785f0a0782ddda971f76",
  "worldSha256": "8e0d385e1bb4e0a80a13e64a964c5d5f6be2941e342e35645dbf5d91d1caf398",
  "updateSha256": "dda48cfc7894128c3998e714e6d65f81f6f144778cf1de0d4b85c4ceefcecf67",
  "groups": [
    {
      "name": "preActors",
      "fn": "sceneFramePreActors",
      "lo": 42616,
      "hi": 42664,
      "start": 2374981,
      "end": 2377124,
      "source": "this.syncZoneExits();\n    // LIVE EVENTS: if a Demon Invasion or Crusade ATTACHES to the zone the player\n    // is already standing in (the overlay bound/spread to it this tick), the\n    // content FIRES NOW — the Balor erupts in a storm of fire, the crusade musters\n    // its works — instead of waiting for a leave-and-reenter.\n    this.materializeLiveZoneEvents();\n\n    this.updateObjective(dt);\n    this.updatePuzzles(dt);\n    this.updateOccurrences(dt);\n    this.updateEncounters(dt);\n    this.updateHunt(dt);\n    this.updateFractures(dt);\n    if (this.bossRun) this.updateBoss();\n    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26); // decay screen-shake\n    this.updateRitualSite();\n    this.updateHoldfastSite();\n    this.updateIncursionEvents(dt);\n    // THE RAMPAGE (engine/rampage.ts): fell-before-move — the plow runs\n    // ahead of the actor step below, so a crushed wall is already down when\n    // its crusher's moveActor arrives (no bypass inside the shared confine).\n    this.updateRampage(dt);\n    this.updateDoodadEffects(dt);\n    this.updateArenaCrowd();\n    this.updateAttunements(dt);\n    this.updateTerraforms(dt);\n    this.updateTheater(dt);\n    this.updateRepeats(dt);\n    this.updateAmbushes();\n    this.updatePendingMetas(dt);\n    this.updatePendingPersists(dt);\n    this.updateMinionMeta(dt);\n    this.updateThrongEvolution(dt);\n    this.updateHivecall(dt);\n    for (const seat of this.seats) {\n      const host = seat.actor.skills.find(s => s?.def.id === 'command_assault');\n      if (host && assaultNode(host, 'renewed_advance')) this.promoteCommandThrong(seat.actor, host, 'minions', 200);\n    }\n    this.assaults.update(dt);\n    this.updateThrong(dt); // THE THRONG's source/collection sweep (engine/throng.ts)\n    this.updateLite(dt);   // THE LITE TIER's batched sweep (engine/lite.ts)\n    for (const id of this.grantedTrailMemory.keys()) {\n      const actor = this.actorById(id);\n      if (!actor || actor.dead) this.grantedTrailMemory.delete(id);\n    }\n    if (this.lockHint > 0) this.lockHint -= dt;\n\n    // Actors: timers, DoT, dash movement, lifespans.\n    this.refreshMagicPacks(dt);",
      "sourceSha256": "04dcb3c53c85f964a1fdd82cf2c61a7c2523d3123bf7975295bef7f05195e852",
      "output": "export function sceneFramePreActors(nativeHost:NativeSceneFrameHost,dt:number):void {\nnativeHost.syncZoneExits();\n    // LIVE EVENTS: if a Demon Invasion or Crusade ATTACHES to the zone the player\n    // is already standing in (the overlay bound/spread to it this tick), the\n    // content FIRES NOW — the Balor erupts in a storm of fire, the crusade musters\n    // its works — instead of waiting for a leave-and-reenter.\n    nativeHost.materializeLiveZoneEvents();\n\n    nativeHost.updateObjective(dt);\n    nativeHost.updatePuzzles(dt);\n    nativeHost.updateOccurrences(dt);\n    nativeHost.updateEncounters(dt);\n    nativeHost.updateHunt(dt);\n    nativeHost.updateFractures(dt);\n    if (nativeHost.bossRun) nativeHost.updateBoss();\n    if (nativeHost.shake > 0) nativeHost.shake = Math.max(0, nativeHost.shake - dt * 26); // decay screen-shake\n    nativeHost.updateRitualSite();\n    nativeHost.updateHoldfastSite();\n    nativeHost.updateIncursionEvents(dt);\n    // THE RAMPAGE (engine/rampage.ts): fell-before-move — the plow runs\n    // ahead of the actor step below, so a crushed wall is already down when\n    // its crusher's moveActor arrives (no bypass inside the shared confine).\n    nativeHost.updateRampage(dt);\n    nativeHost.updateDoodadEffects(dt);\n    nativeHost.updateArenaCrowd();\n    nativeHost.updateAttunements(dt);\n    nativeHost.updateTerraforms(dt);\n    nativeHost.updateTheater(dt);\n    nativeHost.updateRepeats(dt);\n    nativeHost.updateAmbushes();\n    nativeHost.updatePendingMetas(dt);\n    nativeHost.updatePendingPersists(dt);\n    nativeHost.updateMinionMeta(dt);\n    nativeHost.updateThrongEvolution(dt);\n    nativeHost.updateHivecall(dt);\n    for (const seat of nativeHost.seats) {\n      const host = seat.actor.skills.find(s => s?.def.id === 'command_assault');\n      if (host && assaultNode(host, 'renewed_advance')) nativeHost.promoteCommandThrong(seat.actor, host, 'minions', 200);\n    }\n    nativeHost.assaults.update(dt);\n    nativeHost.updateThrong(dt); // THE THRONG's source/collection sweep (engine/throng.ts)\n    nativeHost.updateLite(dt);   // THE LITE TIER's batched sweep (engine/lite.ts)\n    for (const id of nativeHost.grantedTrailMemory.keys()) {\n      const actor = nativeHost.actorById(id);\n      if (!actor || actor.dead) nativeHost.grantedTrailMemory.delete(id);\n    }\n    if (nativeHost.lockHint > 0) nativeHost.lockHint -= dt;\n\n    // Actors: timers, DoT, dash movement, lifespans.\n    nativeHost.refreshMagicPacks(dt);\n}\n",
      "statementIndices": [
        111,
        112,
        113,
        114,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        123,
        124,
        125,
        126,
        127,
        128,
        129,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        139,
        140,
        141,
        142,
        143
      ],
      "firstLine": 42616,
      "lastLine": 42664,
      "outputSha256": "69cb8f610b9f0cbde0b6e057705c1b37dc75a16f33a2bc8747250336f86daa11"
    },
    {
      "name": "actors",
      "fn": "sceneFrameActors",
      "lo": 42665,
      "hi": 43577,
      "start": 2377129,
      "end": 2424872,
      "source": "const flowDt = dt; // the world-scaled frame; each body bends it below\n    for (const a of this.actors) {\n      if (a.dead) continue;\n      // A downed co-op seat is frozen: no timers, DoT, regen, casting or movement\n      // until an ally revives it. (life is 0; skipping avoids re-entering kill.)\n      if (a.downed) continue;\n      this.syncPocketGrants(a);\n      a.statusRelay ??= this.relayStatus;\n      this.updateGrantedTrails(a);\n      // Bound companions refresh with their host/body context. Other owned\n      // companions still need the generic bequest refresh and retraction.\n      if ((a.owner || a.bequestSignature) && (!a.companion || !this.companionBonds.host(a))) {\n        const anchor = a.summonInst;\n        syncAttributeBequests(a, anchor?.def.throng ? batchScaleOf(anchor.def.throng) : 1,\n          anchor ? skillContextTags(anchor.def) : undefined, anchor ? instanceMods(anchor) : undefined);\n      }\n      // THE TIMEFLOW BEND (engine/timeflow.ts): each body lives at its own\n      // rate. A fully held one (stasis, a chronomancer's stop) suspends\n      // WHOLESALE — everything this loop body does: timers, DoTs, casting,\n      // dash, decay, lifespan — except its chrono statuses, which burn on\n      // raw seconds so the freeze can expire. Fractional rates SHADOW `dt`,\n      // so the entire body below inherits the bend untouched.\n      const atf = this.timeflow.actorScale(a);\n      if (atf <= 0) { a.tickChronoStatuses(rawDt); continue; }\n      const dt = atf === 1 ? flowDt : flowDt * atf;\n      // EXPONENTIAL UNLIFE (decay minions): the survival meter drains at an\n      // accelerating rate — unmitigable, only healing races it, and healing\n      // loses on schedule. Death is REAL (Martyrdom, contracts, Deadwake).\n      if (a.decay && !a.dead) {\n        a.decay.t += dt;\n        if (a.decay.t > 0) {\n          a.life -= a.decay.dps0 * Math.pow(a.decay.growth, a.decay.t) * dt;\n          if (a.life <= 0) {\n            this.kill(a);\n            if (a.dead) this.showCompanionCue(a, 'unravel');\n            continue;\n          }\n        }\n      }\n      // THE BLOOM (Actor.bloomIn — THE LEGEND FABRIC, Gravebloom): the\n      // ripened minion detonates for its OWNER's live bloom power as a\n      // fraction of ITS max life (BLOOM_CFG's type — explodeActor's\n      // mitigated, owner-team burst lane), then ends as an EXPIRY:\n      // contracts released, the expiry-is-death lever deciding the rites,\n      // so a bloom never double-fires a death explosion. Life investment\n      // IS the bomb; the marker status counted the seconds down.\n      if (a.bloomIn > 0 && !a.dead) {\n        a.bloomIn -= dt;\n        if (a.bloomIn <= 0) {\n          a.bloomIn = 0;\n          const owner = a.owner;\n          const power = owner && !owner.dead\n            ? owner.sheet.get('minionBloomPower',\n              a.summonInst ? skillContextTags(a.summonInst.def) : undefined,\n              a.summonInst ? instanceMods(a.summonInst) : undefined)\n            : 0;\n          if (power > 0) this.explodeActor(a, power, { type: BLOOM_CFG.type, color: BLOOM_CFG.color, recoveryCue: 'companion_bloom' });\n          this.releaseContract(a, true);\n          this.kill(a, !a.expiryTriggersDeath);\n          continue;\n        }\n      }\n      // Duration-based minions expire naturally (and may respawn if persistent).\n      if (a.lifespan > 0) {\n        a.lifespan -= dt;\n        if (a.lifespan <= 0) {\n          if (!a.presenceBadge) this.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius * 1.4, color: a.color, life: 0.3, maxLife: 0.3 });\n          // Explosive CONSTRUCTS go off even on natural expiry — a bone\n          // prison under Unstable Flesh is a timed demolition charge.\n          if (a.construct && a.explodeOnDeath > 0) {\n            this.explodeActor(a, a.explodeOnDeath);\n          }\n          // THE ANSWERING WALL EXPIRES (guardBash beyond the stance): a\n          // quiet end answers with what still stood — the standing life\n          // pays the bash the break would have paid in full.\n          if (a.construct && a.summonInst) {\n            const eBash = guardBashSpec(a.summonInst);\n            if (eBash && a.life > 0) {\n              this.guardBash(a, a.summonInst, { ...eBash, arcDeg: 360 }, a.life);\n            }\n          }\n          // MATURITY: a pod's expiry IS the incubation completing — the\n          // payload hatches before the shell is swept away.\n          if (a.construct?.hatch) this.hatchPod(a);\n          this.releaseContract(a, true);\n          // THE RAGING-SPIRITS LEVER (minionExpiryIsDeath): a flagged\n          // minion's duration lapse IS a death — every on-death rite\n          // (explosions, death heals, allyDeath taps) fires on schedule.\n          this.kill(a, !a.expiryTriggersDeath, undefined, 'expire');\n          continue;\n        }\n      }\n      // THE AMBIENT TRICKLE (orbTrickle_<id>, equip-carried — Requiem's\n      // standalone lane): every ORB_TRICKLE.everySec, each carried trickle\n      // stat rolls its chance to shed that orb at a walk-to spot nearby.\n      // Stat-gated before the registry loop so trickle-less actors pay one\n      // meter tick and nothing else.\n      a.orbTrickleT += dt;\n      if (a.orbTrickleT >= ORB_TRICKLE.everySec) {\n        a.orbTrickleT -= ORB_TRICKLE.everySec;\n        if (this.orbs.length < ORB_CAP) {\n          for (const id of Object.keys(ORB_DEFS)) {\n            const c = a.sheet.get(orbTrickleStat(id));\n            if (c > 0 && chance(Math.min(0.75, c))) {\n              this.shedOrb(id, a.pos, { scatter: ORB_TRICKLE.scatter, tier: a.tier });\n            }\n          }\n        }\n      }\n      this.deedDotAmounts = undefined;\n      const trackDeedDot = this.metaProgressionActive() && !a.dead && a.life > 0\n        && (this.deedEnemy(a) || (a === this.player && this.hasDeedEnemyNearby()));\n      const dot = a.updateTimers(dt, rawDt, trackDeedDot ? this.collectDeedDot : undefined);\n      // World-space procPopEvents survive a lethal payout and replicate as flashes.\n      for (const procCue of a.procPopEvents) {\n        const style = procCueStyle(procCue.profile ?? 'blood');\n        this.flashes.push(combatCueFlash(a.pos, style.pop ?? 'proc_pop', a.radius + PROC_CUE_CFG.popPad, a.facing, procCue.color ?? style.color));\n      }\n      a.procPopEvents.length = 0;\n      // THE LANDING RE-SEAT (engine/tiers.ts landingTier): wings folded —\n      // the story re-derives from the floor under the body, so a\n      // bench-spawned condor that settles over the valley is the valley's\n      // (hostility, sight and the elevation law all honest again; the\n      // stoop's grounded punish window now lands on ITS victim's story).\n      // The latch HOLDS through leap/dash flight: a stoop's wings fold\n      // mid-dive, but touch-down means FEET ON GROUND — the re-seat reads\n      // the floor the body finally stands on, never the dive's midpoint\n      // (measured live: mid-leap folds seated divers on the story they\n      // left, 99px past their rim). Flat zones: clearing it is the cost.\n      if (a.touchdown && !a.flying && !a.leap && !a.dash) {\n        a.touchdown = false;\n        if (this.zone.tiers && this.walk?.regionAt) {\n          a.tier = landingTier(this.walk.regionAt(a.pos.x, a.pos.y), a.tier);\n        }\n      }\n      if (dot) {\n        // TYPED ticks: each element pools separately so tag-filtered DoT\n        // interactions (esDotBypass per element, tagged damageTaken) apply.\n        // The floating text keeps showing the pre-soak total, as ever.\n        let raw = 0;\n        for (const [ty, amt] of Object.entries(dot)) {\n          if (!amt || amt <= 0) continue;\n          raw += amt;\n          this.applyDeedDot(a, amt, ty as DamageType | 'untyped');\n        }\n        if (raw > 0) this.accumulateDotText(a, raw, dt, 'afflictions'); // THE WIRE'S EYES: the wounds' authors\n        // A DoT emptied the shield — the esBreak proc seam fires here too.\n        if (a.esBroke) {\n          a.esBroke = false;\n          this.rollOwnProcs(a, 'esBreak');\n        }\n        // Pain is pain: DoT feeds the damage-taken trigger banks too —\n        // and licenses the counter-blow window like any wound.\n        if (raw > 0) {\n          this.bankDamageTakenTriggers(a, raw);\n          a.recentHurt = 0;\n          // THE PRIMED POUR: a DoT tick is a wound — the banked sip\n          // answers the bleed the instant it opens (pourPrime).\n          this.releasePrimedPours(a);\n        }\n      }\n      // The per-frame defense-event sweep: harvests TIMER-driven flips the\n      // damage paths never see — a broken bar re-arming, a recharge delay\n      // expiring into flow, a calm refill topping off (depth 0: these are\n      // real state changes, not proc output).\n      this.sweepDefenseEvents(a);\n      // GAIN EVENTS: charges/buffs gained since last frame feed the\n      // chargeGain/buffGain triggers. Payload grants land as NEW events\n      // (one link deeper) swept NEXT frame — chains propagate a link per\n      // frame and die at the depth lid, never recurse.\n      // THE TALENT FABRIC's per-frame sweep (docs/engine/talents.md):\n      // condition edges, the heal event, the last gasp, pulse beats and the\n      // derived-gauge samples — each null-cost until something on the\n      // actor names it.\n      this.sweepTalentEvents(a);\n      if (a.gainEvents.length) {\n        const evs = a.gainEvents;\n        a.gainEvents = [];\n        for (const ev of evs) {\n          this.rollGainProcs(a, ev);\n          // THE SYMPATHY FABRIC: the same events, replayed on kin (echoes\n          // land one link deeper and deep sources don't re-echo — loop-free\n          // by the same depth discipline the proc chains obey).\n          this.echoSympathy(a, ev);\n        }\n      }\n      // BROOD clauses (BroodSpec): banked tick-damage rolls to HATCH a\n      // short-lived creature serving the APPLIER. Chance scales with the\n      // damage dealt — the ailment's strength IS its fecundity; capped\n      // alive per applier so a poison bloom never becomes a swarm bomb.\n      for (const s of a.statuses) {\n        if (!s.brood || !((s.broodAcc ?? 0) > 0)) continue;\n        const p = (s.broodAcc ?? 0) * s.brood.perDamage;\n        s.broodAcc = 0;\n        if (!chance(Math.min(0.35, p))) continue;\n        const owner = s.casterId !== undefined\n          ? this.actors.find(x => x.id === s.casterId && !x.dead) : undefined;\n        if (!owner) continue;\n        const key = '__brood:' + s.brood.monsterId;\n        if (this.actors.filter(m => m.owner === owner && !m.dead\n          && m.sourceSkillId === key).length >= s.brood.max) continue;\n        const hatch = this.createMonster(s.brood.monsterId, owner.level, owner.team, owner);\n        hatch.sourceSkillId = key;\n        // BORROWED UNLIFE: the hatch binds to its APPLIER — casterId names\n        // the keeper directly (no owner hop: the per-applier cap's own\n        // grain), so a crew minion's broodlings unmake when it falls (the\n        // actor-doc's raised-broodmother promise, status form). Seat and\n        // enemy appliers stamp undefined by conjurationLifeline's own gate.\n        hatch.lifelineId = this.conjurationLifeline(owner);\n        hatch.lifespan = s.brood.duration;\n        hatch.pos = this.clampPos(\n          vec(a.pos.x + rand(-24, 24), a.pos.y + rand(-24, 24)), hatch.radius);\n        this.actors.push(hatch);\n        this.emergeBody(hatch, { host: true }); // THE EMERGENCE GRAMMAR: the broodling bursts out of its parent\n      }\n      // DOT LEECH: banked ticks flow home to the APPLIER as healing —\n      // \"5% of bleed damage leeched as life\", paid quietly on the beat.\n      for (const s of a.statuses) {\n        if (!s.leechAcc || s.leechAcc <= 0 || s.casterId === undefined) continue;\n        const sip = s.leechAcc;\n        s.leechAcc = 0;\n        const applier = this.actors.find(x => x.id === s.casterId && !x.dead);\n        if (applier) noteResourceFlow(applier, a, 'life', applier.healBy(sip));\n      }\n      // TERRAIN-BOUND upkeep: derive a missing confinement from the nearest\n      // matching ground (zone-memory restores, summons — every path self-\n      // heals), then CLAMP the body into its disc, whatever moved it.\n      if (a.habitat && !a.dead) {\n        if (!a.confine) {\n          const h = a.habitat;\n          let bx = 0, by = 0, br = -1, bd = Infinity;\n          for (const d of this.doodads) {\n            if (d.kind !== h.kind || d.gone || d.radius < (h.minRadius ?? 0)) continue;\n            const dd = dist(a.pos, d.pos);\n            if (dd < bd) { bd = dd; bx = d.pos.x; by = d.pos.y; br = d.radius; }\n          }\n          a.confine = br >= 0\n            ? { x: bx, y: by, r: br + (h.grace ?? 24) }\n            : { x: a.pos.x, y: a.pos.y, r: 120 }; // no ground left: hold this spot\n        }\n        const cdx = a.pos.x - a.confine.x, cdy = a.pos.y - a.confine.y;\n        const cd = Math.hypot(cdx, cdy);\n        if (cd > a.confine.r) {\n          const s = a.confine.r / cd;\n          a.pos.x = a.confine.x + cdx * s;\n          a.pos.y = a.confine.y + cdy * s;\n        }\n      }\n      // ARMED AMBUSH: scenery until an enemy strays inside the wake radius —\n      // then the reveal (flash + tell) and an ordinary fight. Instance\n      // specs (spawner-armed) win over the def row; pack springs CHAIN, so\n      // a penned herd empties as one event.\n      if (a.ambushArmed && !a.dead) {\n        const spec = a.ambushSpec ?? (a.defId ? MONSTERS[a.defId]?.ambush : undefined);\n        const wake = spec?.radius ?? 130;\n        for (const e of this.enemiesOf(a)) {\n          if (e.dead || e.sheet.get('invisible') > 0) continue;\n          if (dist(a.pos, e.pos) > wake) continue;\n          this.springAmbush(a);\n          break;\n        }\n      }\n      // LIVE BURROW: submerge → dust-line travel → telegraphed emergence.\n      if (a.burrow && !a.dead) this.stepBurrow(a, dt);\n      // PACK BOND (MonsterDef.bond): worn only while a living bond-holder\n      // stands near — the source moves on EDGES, never per frame. Burst the\n      // holder first and the pack softens (the priority counterplay).\n      if (a.defId && !a.dead) {\n        const bond = MONSTERS[a.defId]?.bond;\n        if (bond) {\n          const r = bond.radius ?? 520;\n          // THE PACK LAYER (engine/pack.ts): this scan does not merely answer\n          // WHETHER a holder stands near — it records WHICH ONE, and that\n          // record IS the drawn link. Taking the NEAREST rather than the\n          // first in array order costs nothing (squared compare, no sqrt —\n          // strictly cheaper per candidate than the old dist() call, and the\n          // holder-less worst case already walked the whole roster) and buys\n          // the honest read: a body's line runs to the warden actually\n          // standing over it. The boolean is unchanged either way, so the\n          // mods and the line are one answer — drawn == tested.\n          const r2 = r * r;\n          let from: Actor | undefined;\n          let bd = Infinity;\n          for (const o of this.actors) {\n            if (o === a || o.dead || o.team !== a.team) continue;\n            if (bond.kin\n              ? (o.defId !== bond.kin && o.tag !== bond.kin && o.faction !== bond.kin)\n              : (a.squadId === undefined || o.squadId !== a.squadId)) continue;\n            const dx = a.pos.x - o.pos.x, dy = a.pos.y - o.pos.y;\n            const d2 = dx * dx + dy * dy;\n            if (d2 > r2 || d2 >= bd) continue;\n            bd = d2; from = o;\n          }\n          const held = !!from;\n          const companionCueFrom = a.bondFrom;\n          a.bondFrom = from;\n          if (held !== a.bondHeld) {\n            a.bondHeld = held;\n            a.sheet.setSource('bond', held ? bond.mods : []);\n            if (!held) this.showCompanionCue(a, 'sever', companionCueFrom);\n          }\n        }\n      }\n      // PHASE-WORN MODS (MonsterDef.nocturne): worn only while the world\n      // clock stands in the def's hours — the Court runs quick in the dark,\n      // its coach armors in gloom, its pallbearers stand hardest at noon.\n      // Edge-triggered like the pack bond; the WHEEL moves it, not the frame.\n      if (a.defId && !a.dead) {\n        const noct = MONSTERS[a.defId]?.nocturne;\n        if (noct) {\n          const held = inPhases(this.time, noct.phases);\n          if (held !== a.nocturneHeld) {\n            a.nocturneHeld = held;\n            a.sheet.setSource('nocturne', held ? noct.mods : []);\n          }\n        }\n      }\n      // GROUND-WORN MODS (MonsterDef.rooted — engine/rooted.ts): the\n      // conditional-mod family's THIRD axis. Bond asks who is near,\n      // nocturne asks what hour it is; this asks WHERE THIS BODY STANDS.\n      // Edge-triggered like both, and gated by a GRACE on the way OUT\n      // only: a creep rim breathes on the warren's pulse, so an instant\n      // edge test would flap the sheet every beat — but STEPPING BACK ON\n      // is instant, because that half is the reward.\n      if (a.defId && !a.dead) {\n        const root = MONSTERS[a.defId]?.rooted;\n        if (root) {\n          const on = standsRooted(root, a.pos, {\n            // THE GRID ROOT (the cistern crone): a body standing on a\n            // PAINTED region (the cistern's water, the soulriver's sea —\n            // the walk grid's own cell, stamped beside the doodad ground\n            // by the region-sense sweep) roots on it exactly as on a\n            // poured disc; the doodad ground keeps precedence where both\n            // stand. Absent rows read undefined as before.\n            groundKind: a.groundKind ?? a.gridRegion,\n            creepCover: this.creep ? (k, x, y) => this.creep!.coverOf(k, x, y) : undefined,\n          });\n          if (on) a.rootedOffAt = 0;\n          else if (a.rootedOffAt === 0) a.rootedOffAt = this.time;\n          const held = on\n            || this.time - a.rootedOffAt < (root.grace ?? ROOTED_CFG.grace);\n          if (held !== a.rootedHeld) {\n            a.rootedHeld = held;\n            a.sheet.setSource('rooted', held ? root.mods : (root.off ?? []));\n            const note = held ? root.noteOn : root.note;\n            if (note) {\n              this.text(vec(a.pos.x, a.pos.y - 18), note,\n                held ? ROOTED_CFG.onColor : ROOTED_CFG.offColor, 11);\n            }\n          }\n        }\n      }\n      // SHELL REGROWTH: quiet seconds knit the pool back; a broken shell\n      // re-forms once a real fraction has regrown (the burst window closes).\n      const sg = a.shellGuard;\n      if (sg && !a.dead && sg.pool < sg.max && this.time - sg.lastHitAt >= sg.regenDelay) {\n        sg.pool = Math.min(sg.max, sg.pool + sg.regenRate * dt);\n        if (sg.broken && sg.pool >= sg.max * (sg.reformFraction ?? 0.4)) {\n          sg.broken = false;\n          this.flashes.push(defenseCueFlash(a, 'shell', 'reform', sg.color, { style: sg.shellVisual,\n            facing: a.facing + (sg.side === 'rear' ? Math.PI : 0),\n            arc: sg.side === 'all' ? Math.PI * 2 : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, this.time) }));\n        }\n      }\n      // CAST LOCK: a running cast bar PINS the body on its STAMPED aim —\n      // the wind-up points where the blow will actually land (the resolve\n      // fires at cs.aim, so a body that keeps tracking its target is lying).\n      // Channels and guards steer their own facing inside updateCasting\n      // (trackAim / autoSpin / turnRate) — their tracking is the design.\n      {\n        const cl = a.casting;\n        if (cl && cl.mode !== 'channel' && cl.mode !== 'guard' && !a.dead\n          && dist(a.pos, cl.aim) > 2) {\n          a.facing = angleTo(a.pos, cl.aim);\n        }\n      }\n      // TURN CLAMP (BEHAVIOR_STATS.turnSpeed ← Actor.turnSpeed as the innate\n      // base): facing may only swing so far per frame — big bodies LUMBER,\n      // their shell arcs and their aim lag the fight, and circling them\n      // becomes real play. Runs AFTER the cast lock, so a lumbering body\n      // still SWINGS onto its stamp believably. The rate reads THROUGH the\n      // sheet (the aim knobs' law), so curses, auras and ground can bend the\n      // pivot; a body with nothing folded — every player seat — resolves 0\n      // and keeps its instant facing.\n      const steeredCast = a.casting?.mode === 'channel' || a.casting?.mode === 'guard';\n      if (steeredCast && a.facingPrev !== undefined) {\n        // These casts spend their ONE pivot budget inside updateCasting.\n        // AI's desired facing must not turn them once here and once there.\n        a.facing = a.facingPrev;\n      } else if (a.facingPrev !== undefined && !a.dead) {\n        const rate = this.actorTurnRate(a);\n        if (rate > 0) {\n          const want = angleDiff(a.facingPrev, a.facing);\n          const cap = rate * dt;\n          if (Math.abs(want) > cap) a.facing = a.facingPrev + Math.sign(want) * cap;\n        }\n      }\n      a.facingPrev = a.facing;\n      // VELOCITY ESTIMATE (the behavior fabric): an EMA of the actual frame\n      // displacement — whatever moved the body (walk, dash, knockback), this\n      // is the motion a shot-leading mind (BehaviorSpec.aimLead) reads.\n      if (dt > 0) {\n        if (a.posPrev) {\n          // Teleports read as a blink, not a ballistic launch: samples clamp\n          // to a fast sprint, so one warped frame can't poison the read.\n          const cap = BEHAVIOR_CFG.velSampleMax;\n          const ix = clamp((a.pos.x - a.posPrev.x) / dt, -cap, cap);\n          const iy = clamp((a.pos.y - a.posPrev.y) / dt, -cap, cap);\n          const k = Math.min(1, dt * BEHAVIOR_CFG.velEmaRate);\n          a.velEst.x += (ix - a.velEst.x) * k;\n          a.velEst.y += (iy - a.velEst.y) * k;\n          a.posPrev.x = a.pos.x; a.posPrev.y = a.pos.y;\n        } else {\n          a.posPrev = { x: a.pos.x, y: a.pos.y };\n        }\n      }\n      // THE LEDGER's beat: escalating upkeep + the low-mana vent.\n      this.updateActorLedgers(a, dt);\n      // One sweep for EVERYTHING updateTimers can bleed — DoTs, staggered\n      // wounds landing, upkeep starvation — so no drain path forgets to kill.\n      if (a.life <= 0 && !a.dead) this.kill(a);\n      // Rupture supports: statuses that expired this frame may detonate.\n      if (a.expiredStatuses.length) {\n        for (const s of a.expiredStatuses) {\n          if (s.rupture && s.rupture > 0 && !a.dead && !STATUS_DEFS[s.id]?.dischargeMatchingType) this.ruptureStatus(a, s);\n        }\n        a.expiredStatuses.length = 0;\n      }\n      // BRAND ZAPS (StatusDef.zapNearby — Fulgurweb): while the mark rides,\n      // bolts lash the victim's ALLIES on the brand's beat. Caster-less\n      // baseline damage; standing next to the marked is the mistake.\n      for (const s of a.statuses) {\n        const zn = STATUS_DEFS[s.id]?.zapNearby;\n        if (!zn || a.dead) continue;\n        s.zapAt ??= this.time + zn.interval;\n        if (this.time < s.zapAt) continue;\n        s.zapAt = this.time + zn.interval;\n        const dmg = baselineStatusDps(s.id, this.zone.level) * zn.factor * s.stacks;\n        const el = STATUS_DEFS[s.id]?.element ?? 'lightning';\n        let lashed = false;\n        for (const kin of this.actors) {\n          if (kin === a || kin.dead || kin.untargetable || kin.passive) continue;\n          if (kin.team !== a.team || kin.invulnerable) continue;\n          if (dist(a.pos, kin.pos) > zn.radius) continue;\n          const taken = mitigateTyped(kin, { [el]: dmg });\n          if (taken > 0) {\n            kin.life -= taken;\n            kin.hitFlash = 0.1;\n            kin.hitFlashType = el;\n            this.accumulateDotText(kin, taken, zn.interval);\n            if (kin.life <= 0 && !kin.dead) this.kill(kin);\n            lashed = true;\n          }\n        }\n        if (lashed) {\n          this.flashes.push({\n            pos: vec(a.pos.x, a.pos.y), radius: zn.radius,\n            color: STATUS_DEFS[s.id]?.color ?? '#e8e05a', life: 0.15, maxLife: 0.15,\n          });\n        }\n      }\n      // MADNESS (StatusDef.lashOut — the cursed-ground betrayal): the\n      // afflicted STRIKES whatever is nearest, friend or foe alike, on the\n      // fog's beat. Caster-less baseline damage, mitigated normally.\n      for (const s of a.statuses) {\n        const lo = STATUS_DEFS[s.id]?.lashOut;\n        if (!lo || a.dead || a.isStunned()) continue;\n        s.lashAt ??= this.time + lo.interval;\n        if (this.time < s.lashAt) continue;\n        s.lashAt = this.time + lo.interval;\n        let prey: Actor | null = null;\n        let best = lo.radius;\n        for (const other of this.actors) {\n          if (other === a || other.dead || other.untargetable || other.passive\n            || other.invulnerable || other.construct) continue;\n          const dd = dist(a.pos, other.pos);\n          if (dd <= best) { best = dd; prey = other; }\n        }\n        if (!prey) continue;\n        const dmg = baselineStatusDps(s.id, this.zone.level) * lo.factor;\n        const taken = mitigateTyped(prey, { physical: dmg });\n        if (taken > 0) {\n          prey.life -= taken;\n          prey.hitFlash = 0.12;\n          prey.hitFlashType = 'physical';\n          this.text(prey.pos, Math.round(taken).toString(), '#d84a9a', 12);\n          if (prey.life <= 0 && !prey.dead) this.kill(prey);\n        }\n        this.flashes.push({\n          pos: vec(a.pos.x, a.pos.y), radius: a.radius + 10,\n          color: '#d84a9a', life: 0.15, maxLife: 0.15,\n        });\n      }\n      // IRON WARD: the ward ends — everything it banked DETONATES.\n      if (a.ironWard && this.time >= a.ironWard.until) {\n        const iw = a.ironWard;\n        a.ironWard = undefined;\n        const amount = Math.min(iw.cap, iw.stored) * iw.ratio;\n        if (amount > 0 && !a.dead) {\n          this.burstDamage(vec(a.pos.x, a.pos.y), iw.radius, amount,\n            'physical', iw.visualColor ?? '#c8c0a8', a.team, 0, undefined, undefined, skillSelfVoice('iron_ward', 'burst'));\n        }\n      }\n      // weakPointBonus reads the live interval at each damage resolution; this\n      // sweep retires spent windows and leaves an attributable body fracture.\n      for (const cue of takeWeakPointBreaks(a)) this.flashes.push(anatomyFlash(a.pos, a.radius, a.facing, cue));\n      if (a.casting) {\n        const cast = a.casting;\n        const castFacing = a.facing;\n        this.updateCasting(a, dt);\n        // Completing a stamped cast can write facing in executeSkill.\n        // Its payload keeps the committed aim, but the body has already\n        // spent its turn budget; resolution is not a free snap-turn.\n        if (!steeredCast && this.actorTurnRate(a) > 0) a.facing = castFacing;\n        if (steeredCast) a.facingPrev = a.facing;\n        if (a.casting !== cast && cast.aiRecovery !== undefined\n          && !a.dead && !a.isStunned() && !this.seatOf(a)) {\n          finishAIRecovery(a, this.time, cast.aiRecovery);\n        }\n      }\n      // THE FRAME LOCK re-derive (StatusDef.frameLock — the fourth wall):\n      // stamped once at the rising edge from the frame that governs the\n      // bearer THAT instant (copied — the live published rect mutates),\n      // held while any declaring status is worn, cleared at the falling\n      // edge. The flight-state idiom: status traffic is the whole law.\n      {\n        let frameLocked = false;\n        for (const s of a.statuses) {\n          if (STATUS_DEFS[s.id]?.frameLock) { frameLocked = true; break; }\n        }\n        if (frameLocked) {\n          if (!a.frameLockRect) a.frameLockRect = { ...this.viewRectFor(a) };\n        } else if (a.frameLockRect) a.frameLockRect = null;\n      }\n      if (a.dash) {\n        const inst = (a as Actor & { dashSkill?: SkillInstance }).dashSkill;\n        const hits = (a as Actor & { dashHits?: Set<number> }).dashHits;\n        const visualFrom = { ...a.pos }, visualTier = a.tier;\n        const step = a.dash.speed * Math.min(dt, Math.max(0, a.dash.remaining));\n        this.steppedClamp(a, vec(\n          a.pos.x + Math.cos(a.dash.dir) * step,\n          a.pos.y + Math.sin(a.dash.dir) * step,\n        ), a.pos);\n        if (inst && a.tier === visualTier && dist(visualFrom, a.pos) <= step + .01) {\n          this.noteMovementTravel(a, inst, visualFrom, 1 - a.dash.remaining / Math.max(.01,\n            inst.def.delivery.type === 'dash' ? inst.def.delivery.distance / a.dash.speed : 1));\n        }\n        if (inst && hits && inst.def.delivery.type === 'dash' && inst.def.delivery.width > 0) {\n          for (const enemy of this.enemiesOf(a)) {\n            if (hits.has(enemy.id)) continue;\n            // SEGMENT FABRIC: the corridor clips the nearest hittable body.\n            const nb = nearestBody(enemy, a.pos);\n            if (dist(a.pos, nb.pos) - nb.r <= inst.def.delivery.width / 2 + a.radius) {\n              hits.add(enemy.id);\n              noteBodyHit(enemy, nb.seg);\n              // Corridor grazes can be tuned down (Closing Fang: the\n              // arrival is the bite, not the trip past).\n              this.resolveHit(a, inst, enemy, inst.def.delivery.corridorScale ?? 1);\n              // THE CHARGE CARRY (DashDelivery.onContact — the grab\n              // fabric): the run's first valid CONTACT is seized and\n              // dragged for the remainder of the run. The catch is a BODY\n              // event (the bull's mass — dodged with your feet by leaving\n              // the corridor, the wall doctrine), so it rides the contact,\n              // not the gore's accuracy roll; every other gate is\n              // grabSeize's own (mass law, policy tiers, grace, dormancy,\n              // hostility — 'hands full' makes it first-catch-wins). The\n              // hold's patience is clamped to the run's own clock: the\n              // drag can never outlive the charge that authored it,\n              // however the run ends.\n              const carry = inst.def.delivery.onContact;\n              if (carry && this.grabSeize(a, inst, enemy, carry.grab)) {\n                if (carry.maxCarryDistance !== undefined) {\n                  // This beat already moved; the end-of-beat decrement\n                  // must leave exactly the authored post-contact budget.\n                  a.dash.remaining = Math.min(a.dash.remaining,\n                    dt + Math.max(0, carry.maxCarryDistance) / Math.max(1, a.dash.speed));\n                }\n                const hold = a.gripping;\n                if (hold && hold.id === enemy.id) {\n                  hold.until = Math.min(hold.until, this.time + a.dash.remaining);\n                }\n              }\n            }\n          }\n          // THE MALLET: the corridor rings bells / pops pots it passes\n          // over, once per dash (the same hits ledger the bodies ride).\n          this.strikeSurfaces(a, a.pos,\n            inst.def.delivery.width / 2 + a.radius, undefined, hits);\n        }\n        // Trailblaze / Fire Walker: the dash sows burning ground. The\n        // drop-zone composables ride (DropZoneSpec): envelopes breathe\n        // each drop, and durationBySpeed reads the DASH's own pace — a\n        // laden charge-dash (speedAtFull) sows different ground than a\n        // full-tilt one.\n        // CLOUD TRAIL (Zephyr Step / the cloudTrail stat, stashed at cast):\n        // the dash lays standing cloud as it travels — every ~30 units,\n        // one conjure (sky-road over conjurable void; over honest land the\n        // presence stands as a wind-lane granting the stash's gifts).\n        const conjSpec = (a as Actor & { dashConjureSpec?: DashConjureStash }).dashConjureSpec;\n        if (conjSpec) {\n          const cc = a as Actor & { conjTrailDist?: number };\n          cc.conjTrailDist = (cc.conjTrailDist ?? 99) + step;\n          if (cc.conjTrailDist >= 30) {\n            cc.conjTrailDist = 0;\n            this.conjureCloud(a.pos.x, a.pos.y, conjSpec.radius, conjSpec.duration, {\n              caster: a, grants: conjSpec.grants,\n              ...(conjSpec.look !== undefined ? { look: conjSpec.look } : {}),\n            });\n          }\n        }\n        // THE STEAM TRAIL (DashDelivery.trailVent — Vent Hop): a fog bank\n        // planted every `spacing` units of travel, the conjure trail's\n        // sibling (reach + life already folded at the cast).\n        const ventSpec = (a as Actor & { dashVentSpec?: { bank: string; radius: number; duration: number; spacing: number } }).dashVentSpec;\n        if (ventSpec) {\n          const vc = a as Actor & { ventTrailDist?: number };\n          vc.ventTrailDist = (vc.ventTrailDist ?? 1e9) + step;\n          if (vc.ventTrailDist >= ventSpec.spacing) {\n            vc.ventTrailDist = 0;\n            this.plantVent({ bank: ventSpec.bank, radius: ventSpec.radius, duration: ventSpec.duration },\n              vec(a.pos.x, a.pos.y), 1, 1, a.tier);\n          }\n        }\n        const trail = (a as Actor & { dashTrailSpec?: DropZoneSpec }).dashTrailSpec;\n        if (inst && trail) {\n          const carrier = a as Actor & { trailDist?: number };\n          carrier.trailDist = (carrier.trailDist ?? 99) + step;\n          if (carrier.trailDist >= 42) {\n            carrier.trailDist = 0;\n            this.mintTrailPatch(a, inst, trail, a.pos, a.dash.dir,\n              trail.duration * speedLingerMul(trail.durationBySpeed, a.dash.speed));\n          }\n        }\n        a.dash.remaining -= dt;\n        if (a.dash.remaining <= 0) {\n          // THE RUN'S-END SHED (DashDelivery.onContact — the charge\n          // carry's release): a catch this run's corridor seized leaves\n          // NOW — re-seated at the stopped charger's leading rim (the\n          // crack of the whip: the towed body overtakes the tower that\n          // stopped; the throw's own rim constant) and handed shove ×\n          // the run's speed forward with authority ALREADY SPENT (the\n          // bowling lane's hand-off — pushActor noAuthority). A wall\n          // answers with the mass fabric's arrest wound, a rim with the\n          // pit-aware push law, charger-credited both. An early escape\n          // (struggle/sever/CC) already released through the standing\n          // ladder and finds nothing here.\n          {\n            const hold = a.gripping;\n            const carryD = inst && inst.def.delivery.type === 'dash'\n              ? inst.def.delivery.onContact : undefined;\n            if (inst && carryD && hold && hold.skillId === inst.def.id) {\n              const v = this.actorById(hold.id);\n              this.grabRelease(a);\n              if (v && !v.dead) {\n                v.pos = this.clampPos(vec(\n                  a.pos.x + Math.cos(a.dash.dir) * (a.radius + v.radius) * 0.9,\n                  a.pos.y + Math.sin(a.dash.dir) * (a.radius + v.radius) * 0.9), v.radius);\n                v.facing = a.dash.dir + Math.PI;\n                this.pushActor(v, a.dash.dir,\n                  a.dash.speed * (carryD.shove ?? GRAB_CFG.runCarry.shoveFrac) / PUSH_DAMPING,\n                  a, inst, { noAuthority: true });\n                this.flashes.push({\n                  pos: vec(v.pos.x, v.pos.y), radius: a.radius + v.radius + 10,\n                  color: '#d8a06a', life: 0.2, maxLife: 0.2,\n                });\n              }\n            }\n          }\n          a.dash = null;\n          // A later AI-only rush must not inherit this skill's corridor,\n          // grab or trail payload. Clear before arrival effects, which may\n          // themselves launch a fresh dash with its own metadata.\n          Object.assign(a, {\n            dashSkill: undefined, dashHits: undefined,\n            dashConjureSpec: undefined, conjTrailDist: undefined,\n            dashVentSpec: undefined, ventTrailDist: undefined,\n            dashTrailSpec: undefined, trailDist: undefined,\n          });\n          // Dive Bomb: the arrival erupts; No Man's Land fields drop here.\n          if (inst) {\n            this.movementMoment(a, inst, 'arrive');\n            this.moveBlast(a, inst, a.pos);\n            this.dropLingerField(a, inst, a.pos);\n            // THE ANSWERING CHARGE (guardBash beyond the stance,\n            // 2026-07-22): a guard-tagged dash with a bash spec answers\n            // at ARRIVAL — the shield that battered the corridor swings\n            // once more at the stop, paying the poolless stand-in.\n            const dBash = guardBashSpec(inst);\n            if (dBash) {\n              this.guardBash(a, inst, dBash, BASH_CFG.poollessShield\n                * a.sheet.get('guardStrength',\n                  skillContextTags(inst, grantedTags(inst)), instanceMods(inst)));\n            }\n          }\n        }\n      }\n      // THE CAROM MOTOR (the fourth wall — CaromDelivery): the body is the\n      // ball. The worn ride status is the ONE clock — when it leaves\n      // (expiry, dispel, cleanse) the ride ends through endCarom's single\n      // door, stop-blast paid. A grab, a saddle, hard CC, a downing and\n      // death all end it early; walls and the governing frame bank the\n      // heading through the one shared reflection (drawn == banked).\n      if (a.caromRun) {\n        const run = a.caromRun;\n        const caromC = a as Actor & {\n          caromSkill?: SkillInstance; caromHits?: Map<number, number>; caromRung?: Set<number>;\n        };\n        const inst = caromC.caromSkill;\n        if (!a.statuses.some(s => s.id === run.status) || a.dead || a.downed\n          || a.isStunned() || a.heldBy !== undefined || a.mountId !== undefined) {\n          this.endCarom(a);\n        } else {\n          const C = FOURTH_WALL_CFG.carom;\n          const spec = inst?.def.delivery.type === 'carom' ? inst.def.delivery : undefined;\n          const step = run.speed * dt;\n          const beforeX = a.pos.x, beforeY = a.pos.y;\n          const wantX = Math.cos(run.dir) * step, wantY = Math.sin(run.dir) * step;\n          this.steppedClamp(a, vec(a.pos.x + wantX, a.pos.y + wantY), a.pos);\n          // WALL BANK: whichever axis the clamp refused flips — the\n          // projectile grid-bounce's axis law at body scale, through the\n          // ONE mover every walker shares (drawn == banked, no forked\n          // collision fabric).\n          let cdx = Math.cos(run.dir), cdy = Math.sin(run.dir), banked = false;\n          if (Math.abs(wantX) > C.blockedMin\n            && (a.pos.x - beforeX) / wantX < C.blockedFrac) { cdx = -cdx; banked = true; }\n          if (Math.abs(wantY) > C.blockedMin\n            && (a.pos.y - beforeY) / wantY < C.blockedFrac) { cdy = -cdy; banked = true; }\n          if (banked) run.dir = Math.atan2(cdy, cdx);\n          // FRAME BANK: the governing rect — the stamped lock while one\n          // holds, the live drawn frame otherwise.\n          const fw = frameReflect(a.pos.x, a.pos.y, run.dir, a.radius, this.viewRectFor(a));\n          if (fw) {\n            a.pos.x = fw.x;\n            a.pos.y = fw.y;\n            run.dir = fw.dir;\n          }\n          a.facing = run.dir;\n          if (inst) {\n            if (dist({ x: beforeX, y: beforeY }, a.pos) <= step + .01) this.noteMovementTravel(a, inst, { x: beforeX, y: beforeY }, this.time % 1);\n            if (banked || fw) this.movementMoment(a, inst, 'bank');\n          }\n          // CONTACT: the skill's whole payload through the one pipeline,\n          // per victim on the rehit clock (segment-aware — coils are real\n          // bodies; the corridor's noteBodyHit grammar verbatim).\n          if (inst) {\n            const rehit = spec?.rehit ?? C.rehitSec;\n            const reach = a.radius + C.contactPad;\n            for (const enemy of this.enemiesOf(a)) {\n              const nb = nearestBody(enemy, a.pos);\n              if (dist(a.pos, nb.pos) - nb.r > reach) continue;\n              if ((caromC.caromHits?.get(enemy.id) ?? -1) > this.time) continue;\n              caromC.caromHits?.set(enemy.id, this.time + rehit);\n              noteBodyHit(enemy, nb.seg);\n              this.resolveHit(a, inst, enemy, spec?.contactScale ?? 1);\n            }\n            // THE MALLET: bells rung and pots popped along the roll, once\n            // per ride (the dash corridor's own ledger law).\n            this.strikeSurfaces(a, a.pos, reach, undefined, caromC.caromRung);\n          }\n        }\n      }\n      // BODY WAKE (MonsterDef.wake): the body itself SHEDS its ground\n      // payload as it travels — every everyDist units of ACTUAL\n      // displacement (walks, dashes, shoves alike) the named catalog skill\n      // free-casts at its feet through the ordinary ground pipeline, so\n      // envelopes, exposure grace, telegraphs and Foresight all ride. A\n      // hidden ambusher or burrower (untargetable) sheds nothing, and a\n      // stationary body never leaks: the trail IS the travel.\n      // FIRE WALKER'S SPRINT (the walking trail — moveTrail while a\n      // movement buff holds): the same odometer grammar as the body\n      // wake, expiring with the working. One drop per beat, however far\n      // a frame jumped — a teleport writes one patch, not a rope.\n      {\n        const wt = a as Actor & {\n          walkTrail?: { spec: DropZoneSpec; until: number; inst: SkillInstance };\n          walkTrailPrev?: Vec2; walkTrailOdo?: number;\n        };\n        if (wt.walkTrail && !a.dead) {\n          if (this.time >= wt.walkTrail.until) {\n            wt.walkTrail = undefined;\n            wt.walkTrailPrev = undefined;\n          } else {\n            const prev = wt.walkTrailPrev;\n            wt.walkTrailPrev = vec(a.pos.x, a.pos.y);\n            if (prev) {\n              wt.walkTrailOdo = (wt.walkTrailOdo ?? 0) + dist(prev, a.pos);\n              if (wt.walkTrailOdo >= 42) {\n                wt.walkTrailOdo = 0;\n                this.mintTrailPatch(a, wt.walkTrail.inst, wt.walkTrail.spec, a.pos, a.facing);\n              }\n            }\n          }\n        }\n      }\n      if (a.wake && !a.dead && !a.untargetable) {\n        const prev = a.wakePrev;\n        a.wakePrev = vec(a.pos.x, a.pos.y);\n        if (prev) {\n          // One shed per beat, however far a single frame jumped — a\n          // teleport writes one drop, not a rope of them.\n          a.wakeOdo = (a.wakeOdo ?? 0) + dist(prev, a.pos);\n          if (a.wakeOdo >= a.wake.everyDist) {\n            a.wakeOdo = 0;\n            const wdef = SKILLS[a.wake.skillId];\n            if (wdef) {\n              a.wakeInst ??= makeSkillInstance(wdef, Math.max(1, Math.round(a.level)));\n              this.executeSkill(a, a.wakeInst, vec(a.pos.x, a.pos.y), {\n                dmgMult: a.wake.dmgMult ?? 1,\n                noCooldown: true, noRepeat: true, keepFacing: true,\n              });\n            }\n          }\n        }\n      }\n      // BRIM DECAY (ChannelSpec.brim.decay): un-held bars bleed — unless\n      // banked at/above bankAt (the kept plateau) or the spec simply\n      // holds. The ledger carries the live instance so socketed support\n      // mods reach the drain query (Stillwater's stopped clock).\n      if (a.brims?.size) {\n        for (const [sid, bs] of a.brims) {\n          if (a.casting?.mode === 'channel' && a.casting.held\n            && a.casting.inst.def.id === sid) continue;\n          if (bs.fill <= 0) { a.brims.delete(sid); continue; }\n          const spec = bs.spec;\n          if (!spec.decay) continue;\n          if (spec.bankAt !== undefined && bs.fill >= spec.bankAt) continue;\n          bs.fill -= spec.decay\n            * a.sheet.get('brimDecay', skillContextTags(bs.inst.def), instanceMods(bs.inst))\n            * dt;\n          if (bs.fill <= 0) a.brims.delete(sid);\n        }\n      }\n      // Knockback shoves in flight: smooth, and collision stops them. A collision\n      // (wall or void) reports back, so it can FALL into a void and roll the\n      // caster's 'collision' procs ONCE (the knockback-collision-damage support).\n      if (a.push) {\n        const p = a.push;\n        const from = a.pos;\n        const speed = Math.hypot(p.vx, p.vy);\n        const sc = this.cScratch; sc.hit = 'none';\n        a.pos = this.clampPos(vec(\n          a.pos.x + p.vx * dt,\n          a.pos.y + p.vy * dt), a.radius, from, { out: sc, mover: a });\n        const hit = sc.hit as string;\n        // THE BOWLING LANE (engine/mass.ts): a body flying fast enough\n        // slams through — or is arrested by — bodies in its path. Swept\n        // BEFORE the wall verdict so a plow that sheds speed below the\n        // impact gate honestly arrives soft.\n        if (speed >= MASS_CFG.slam.minSpeed) this.sweepBodySlam(a, p, speed);\n        // FORCED displacement (the shove in flight): the one lane a hostile\n        // can truly be put past a pit's lip — the pitfall fabric's descend\n        // routing pays the shover for it (walkers merely arrested at a rim\n        // by their own steering are held, never dropped).\n        if (hit === 'void') this.resolveBoundary(a, sc, from, true);\n        // THE RIM FALL (engine/tiers.ts): an elevated body SHOVED past its\n        // layer's rim — where its floor ends but a LOWER floor stands —\n        // FALLS: it lands on the HIGHEST standing story beneath the\n        // overshoot, staggered. Off a butte that's the valley; off a summit\n        // terrace it's the bench below — the mountain is descended one\n        // shove at a time. Walking never drops (the rim is a wall to feet).\n        // THE ENCLOSURE LAW (engine/tiers.ts tierEnclosure): an ENCLOSED\n        // stack — an under-layer's ceiling, a building's storey — has no\n        // rim to fall off: the clamp above already held the body at its\n        // story's edge exactly as it holds feet (the same view willed\n        // movement confines against), so nothing more happens — the inn's\n        // lodger shoved into a hanging wall stays upstairs, the duct runner\n        // shoved at the duct's side stays in the duct. Only OPEN country\n        // (buttes, summits — knock-off is the identity) reads on.\n        if (hit === 'wall' && a.tier >= 1 && this.walk && this.zone.tiers && !tierEnclosed(this.zone.tiers)) {\n          const rawX = from.x + p.vx * dt, rawY = from.y + p.vy * dt;\n          const kRaw = this.walk.regionAt?.(rawX, rawY);\n          if (!tierFloorAt(kRaw, a.tier)) {\n            let land = -1;\n            for (let t = a.tier - 1; t >= 0; t--) { if (tierFloorAt(kRaw, t)) { land = t; break; } }\n            if (land >= 0) {\n              a.tier = land;\n              a.pos = this.clampPos(vec(rawX, rawY), a.radius, undefined, { mover: a });\n              a.applyStatus('stun', 0, TIER_CFG.fallStunSec, 'the fall');\n              p.vx *= 0.4; p.vy *= 0.4;\n            }\n          }\n        }\n        if ((hit === 'wall' || hit === 'void') && !p.collided && p.caster && p.inst && !p.caster.dead) {\n          p.collided = true;\n          this.rollCollisionProcs(p.caster, p.inst, a);\n        }\n        // IMPACT (the mass fabric): the wall arrest itself wounds — momentum\n        // made damage, hostile-authored (or MASS_CFG.impact.casterless for\n        // authorless shoves). Void lips stay the pitfall fabric's own\n        // resolution (never double-punished).\n        if (hit === 'wall') this.resolveImpactHit(a, speed, p);\n        // Exponential ease-out: the shove bleeds off like momentum, not a timer.\n        const decay = Math.exp(-PUSH_DAMPING * dt);\n        p.vx *= decay; p.vy *= decay;\n        if (Math.hypot(p.vx, p.vy) < 40) a.push = null;\n      }\n      // Slippery ground: momentum carries you on even with no input.\n      if (!a.dash && !a.caromRun && !a.casting && !a.leap && a.lastMoveAt < this.time - 0.05) {\n        const sp = Math.hypot(a.vel.x, a.vel.y);\n        if (sp > 4) {\n          const traction = clamp(a.sheet.get('traction'), 0.05, 1);\n          if (traction < 0.999) {\n            this.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos);\n            const decay = Math.exp(-dt * (1.2 + traction * 9));\n            a.vel.x *= decay;\n            a.vel.y *= decay;\n          } else {\n            a.vel.x = 0;\n            a.vel.y = 0;\n          }\n        }\n      }\n    }",
      "sourceSha256": "13f1d3b6545b85dbd8d67de13a303eb141f78c531f58250979a22dc5d9558511",
      "output": "export function sceneFrameActors(nativeHost:NativeSceneFrameHost,dt:number,rawDt:number):void {\nconst flowDt = dt; // the world-scaled frame; each body bends it below\n    for (const a of nativeHost.actors) {\n      if (a.dead) continue;\n      // A downed co-op seat is frozen: no timers, DoT, regen, casting or movement\n      // until an ally revives it. (life is 0; skipping avoids re-entering kill.)\n      if (a.downed) continue;\n      nativeHost.syncPocketGrants(a);\n      a.statusRelay ??= nativeHost.relayStatus;\n      nativeHost.updateGrantedTrails(a);\n      // Bound companions refresh with their host/body context. Other owned\n      // companions still need the generic bequest refresh and retraction.\n      if ((a.owner || a.bequestSignature) && (!a.companion || !nativeHost.companionBonds.host(a))) {\n        const anchor = a.summonInst;\n        syncAttributeBequests(a, anchor?.def.throng ? batchScaleOf(anchor.def.throng) : 1,\n          anchor ? skillContextTags(anchor.def) : undefined, anchor ? instanceMods(anchor) : undefined);\n      }\n      // THE TIMEFLOW BEND (engine/timeflow.ts): each body lives at its own\n      // rate. A fully held one (stasis, a chronomancer's stop) suspends\n      // WHOLESALE — everything this loop body does: timers, DoTs, casting,\n      // dash, decay, lifespan — except its chrono statuses, which burn on\n      // raw seconds so the freeze can expire. Fractional rates SHADOW `dt`,\n      // so the entire body below inherits the bend untouched.\n      const atf = nativeHost.timeflow.actorScale(a);\n      if (atf <= 0) { a.tickChronoStatuses(rawDt); continue; }\n      const dt = atf === 1 ? flowDt : flowDt * atf;\n      // EXPONENTIAL UNLIFE (decay minions): the survival meter drains at an\n      // accelerating rate — unmitigable, only healing races it, and healing\n      // loses on schedule. Death is REAL (Martyrdom, contracts, Deadwake).\n      if (a.decay && !a.dead) {\n        a.decay.t += dt;\n        if (a.decay.t > 0) {\n          a.life -= a.decay.dps0 * Math.pow(a.decay.growth, a.decay.t) * dt;\n          if (a.life <= 0) {\n            nativeHost.kill(a);\n            if (a.dead) nativeHost.showCompanionCue(a, 'unravel');\n            continue;\n          }\n        }\n      }\n      // THE BLOOM (Actor.bloomIn — THE LEGEND FABRIC, Gravebloom): the\n      // ripened minion detonates for its OWNER's live bloom power as a\n      // fraction of ITS max life (BLOOM_CFG's type — explodeActor's\n      // mitigated, owner-team burst lane), then ends as an EXPIRY:\n      // contracts released, the expiry-is-death lever deciding the rites,\n      // so a bloom never double-fires a death explosion. Life investment\n      // IS the bomb; the marker status counted the seconds down.\n      if (a.bloomIn > 0 && !a.dead) {\n        a.bloomIn -= dt;\n        if (a.bloomIn <= 0) {\n          a.bloomIn = 0;\n          const owner = a.owner;\n          const power = owner && !owner.dead\n            ? owner.sheet.get('minionBloomPower',\n              a.summonInst ? skillContextTags(a.summonInst.def) : undefined,\n              a.summonInst ? instanceMods(a.summonInst) : undefined)\n            : 0;\n          if (power > 0) nativeHost.explodeActor(a, power, { type: BLOOM_CFG.type, color: BLOOM_CFG.color, recoveryCue: 'companion_bloom' });\n          nativeHost.releaseContract(a, true);\n          nativeHost.kill(a, !a.expiryTriggersDeath);\n          continue;\n        }\n      }\n      // Duration-based minions expire naturally (and may respawn if persistent).\n      if (a.lifespan > 0) {\n        a.lifespan -= dt;\n        if (a.lifespan <= 0) {\n          if (!a.presenceBadge) nativeHost.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: a.radius * 1.4, color: a.color, life: 0.3, maxLife: 0.3 });\n          // Explosive CONSTRUCTS go off even on natural expiry — a bone\n          // prison under Unstable Flesh is a timed demolition charge.\n          if (a.construct && a.explodeOnDeath > 0) {\n            nativeHost.explodeActor(a, a.explodeOnDeath);\n          }\n          // THE ANSWERING WALL EXPIRES (guardBash beyond the stance): a\n          // quiet end answers with what still stood — the standing life\n          // pays the bash the break would have paid in full.\n          if (a.construct && a.summonInst) {\n            const eBash = guardBashSpec(a.summonInst);\n            if (eBash && a.life > 0) {\n              nativeHost.guardBash(a, a.summonInst, { ...eBash, arcDeg: 360 }, a.life);\n            }\n          }\n          // MATURITY: a pod's expiry IS the incubation completing — the\n          // payload hatches before the shell is swept away.\n          if (a.construct?.hatch) nativeHost.hatchPod(a);\n          nativeHost.releaseContract(a, true);\n          // THE RAGING-SPIRITS LEVER (minionExpiryIsDeath): a flagged\n          // minion's duration lapse IS a death — every on-death rite\n          // (explosions, death heals, allyDeath taps) fires on schedule.\n          nativeHost.kill(a, !a.expiryTriggersDeath, undefined, 'expire');\n          continue;\n        }\n      }\n      // THE AMBIENT TRICKLE (orbTrickle_<id>, equip-carried — Requiem's\n      // standalone lane): every ORB_TRICKLE.everySec, each carried trickle\n      // stat rolls its chance to shed that orb at a walk-to spot nearby.\n      // Stat-gated before the registry loop so trickle-less actors pay one\n      // meter tick and nothing else.\n      a.orbTrickleT += dt;\n      if (a.orbTrickleT >= ORB_TRICKLE.everySec) {\n        a.orbTrickleT -= ORB_TRICKLE.everySec;\n        if (nativeHost.orbs.length < ORB_CAP) {\n          for (const id of Object.keys(ORB_DEFS)) {\n            const c = a.sheet.get(orbTrickleStat(id));\n            if (c > 0 && chance(Math.min(0.75, c))) {\n              nativeHost.shedOrb(id, a.pos, { scatter: ORB_TRICKLE.scatter, tier: a.tier });\n            }\n          }\n        }\n      }\n      nativeHost.deedDotAmounts = undefined;\n      const trackDeedDot = nativeHost.metaProgressionActive() && !a.dead && a.life > 0\n        && (nativeHost.deedEnemy(a) || (a === nativeHost.player && nativeHost.hasDeedEnemyNearby()));\n      const dot = a.updateTimers(dt, rawDt, trackDeedDot ? nativeHost.collectDeedDot : undefined);\n      // World-space procPopEvents survive a lethal payout and replicate as flashes.\n      for (const procCue of a.procPopEvents) {\n        const style = procCueStyle(procCue.profile ?? 'blood');\n        nativeHost.flashes.push(combatCueFlash(a.pos, style.pop ?? 'proc_pop', a.radius + PROC_CUE_CFG.popPad, a.facing, procCue.color ?? style.color));\n      }\n      a.procPopEvents.length = 0;\n      // THE LANDING RE-SEAT (engine/tiers.ts landingTier): wings folded —\n      // the story re-derives from the floor under the body, so a\n      // bench-spawned condor that settles over the valley is the valley's\n      // (hostility, sight and the elevation law all honest again; the\n      // stoop's grounded punish window now lands on ITS victim's story).\n      // The latch HOLDS through leap/dash flight: a stoop's wings fold\n      // mid-dive, but touch-down means FEET ON GROUND — the re-seat reads\n      // the floor the body finally stands on, never the dive's midpoint\n      // (measured live: mid-leap folds seated divers on the story they\n      // left, 99px past their rim). Flat zones: clearing it is the cost.\n      if (a.touchdown && !a.flying && !a.leap && !a.dash) {\n        a.touchdown = false;\n        if (nativeHost.zone.tiers && nativeHost.walk?.regionAt) {\n          a.tier = landingTier(nativeHost.walk.regionAt(a.pos.x, a.pos.y), a.tier);\n        }\n      }\n      if (dot) {\n        // TYPED ticks: each element pools separately so tag-filtered DoT\n        // interactions (esDotBypass per element, tagged damageTaken) apply.\n        // The floating text keeps showing the pre-soak total, as ever.\n        let raw = 0;\n        for (const [ty, amt] of Object.entries(dot)) {\n          if (!amt || amt <= 0) continue;\n          raw += amt;\n          nativeHost.applyDeedDot(a, amt, ty as DamageType | 'untyped');\n        }\n        if (raw > 0) nativeHost.accumulateDotText(a, raw, dt, 'afflictions'); // THE WIRE'S EYES: the wounds' authors\n        // A DoT emptied the shield — the esBreak proc seam fires here too.\n        if (a.esBroke) {\n          a.esBroke = false;\n          nativeHost.rollOwnProcs(a, 'esBreak');\n        }\n        // Pain is pain: DoT feeds the damage-taken trigger banks too —\n        // and licenses the counter-blow window like any wound.\n        if (raw > 0) {\n          nativeHost.bankDamageTakenTriggers(a, raw);\n          a.recentHurt = 0;\n          // THE PRIMED POUR: a DoT tick is a wound — the banked sip\n          // answers the bleed the instant it opens (pourPrime).\n          nativeHost.releasePrimedPours(a);\n        }\n      }\n      // The per-frame defense-event sweep: harvests TIMER-driven flips the\n      // damage paths never see — a broken bar re-arming, a recharge delay\n      // expiring into flow, a calm refill topping off (depth 0: these are\n      // real state changes, not proc output).\n      nativeHost.sweepDefenseEvents(a);\n      // GAIN EVENTS: charges/buffs gained since last frame feed the\n      // chargeGain/buffGain triggers. Payload grants land as NEW events\n      // (one link deeper) swept NEXT frame — chains propagate a link per\n      // frame and die at the depth lid, never recurse.\n      // THE TALENT FABRIC's per-frame sweep (docs/engine/talents.md):\n      // condition edges, the heal event, the last gasp, pulse beats and the\n      // derived-gauge samples — each null-cost until something on the\n      // actor names it.\n      nativeHost.sweepTalentEvents(a);\n      if (a.gainEvents.length) {\n        const evs = a.gainEvents;\n        a.gainEvents = [];\n        for (const ev of evs) {\n          nativeHost.rollGainProcs(a, ev);\n          // THE SYMPATHY FABRIC: the same events, replayed on kin (echoes\n          // land one link deeper and deep sources don't re-echo — loop-free\n          // by the same depth discipline the proc chains obey).\n          nativeHost.echoSympathy(a, ev);\n        }\n      }\n      // BROOD clauses (BroodSpec): banked tick-damage rolls to HATCH a\n      // short-lived creature serving the APPLIER. Chance scales with the\n      // damage dealt — the ailment's strength IS its fecundity; capped\n      // alive per applier so a poison bloom never becomes a swarm bomb.\n      for (const s of a.statuses) {\n        if (!s.brood || !((s.broodAcc ?? 0) > 0)) continue;\n        const p = (s.broodAcc ?? 0) * s.brood.perDamage;\n        s.broodAcc = 0;\n        if (!chance(Math.min(0.35, p))) continue;\n        const owner = s.casterId !== undefined\n          ? nativeHost.actors.find(x => x.id === s.casterId && !x.dead) : undefined;\n        if (!owner) continue;\n        const key = '__brood:' + s.brood.monsterId;\n        if (nativeHost.actors.filter(m => m.owner === owner && !m.dead\n          && m.sourceSkillId === key).length >= s.brood.max) continue;\n        const hatch = nativeHost.createMonster(s.brood.monsterId, owner.level, owner.team, owner);\n        hatch.sourceSkillId = key;\n        // BORROWED UNLIFE: the hatch binds to its APPLIER — casterId names\n        // the keeper directly (no owner hop: the per-applier cap's own\n        // grain), so a crew minion's broodlings unmake when it falls (the\n        // actor-doc's raised-broodmother promise, status form). Seat and\n        // enemy appliers stamp undefined by conjurationLifeline's own gate.\n        hatch.lifelineId = nativeHost.conjurationLifeline(owner);\n        hatch.lifespan = s.brood.duration;\n        hatch.pos = nativeHost.clampPos(\n          vec(a.pos.x + rand(-24, 24), a.pos.y + rand(-24, 24)), hatch.radius);\n        nativeHost.actors.push(hatch);\n        nativeHost.emergeBody(hatch, { host: true }); // THE EMERGENCE GRAMMAR: the broodling bursts out of its parent\n      }\n      // DOT LEECH: banked ticks flow home to the APPLIER as healing —\n      // \"5% of bleed damage leeched as life\", paid quietly on the beat.\n      for (const s of a.statuses) {\n        if (!s.leechAcc || s.leechAcc <= 0 || s.casterId === undefined) continue;\n        const sip = s.leechAcc;\n        s.leechAcc = 0;\n        const applier = nativeHost.actors.find(x => x.id === s.casterId && !x.dead);\n        if (applier) noteResourceFlow(applier, a, 'life', applier.healBy(sip));\n      }\n      // TERRAIN-BOUND upkeep: derive a missing confinement from the nearest\n      // matching ground (zone-memory restores, summons — every path self-\n      // heals), then CLAMP the body into its disc, whatever moved it.\n      if (a.habitat && !a.dead) {\n        if (!a.confine) {\n          const h = a.habitat;\n          let bx = 0, by = 0, br = -1, bd = Infinity;\n          for (const d of nativeHost.doodads) {\n            if (d.kind !== h.kind || d.gone || d.radius < (h.minRadius ?? 0)) continue;\n            const dd = dist(a.pos, d.pos);\n            if (dd < bd) { bd = dd; bx = d.pos.x; by = d.pos.y; br = d.radius; }\n          }\n          a.confine = br >= 0\n            ? { x: bx, y: by, r: br + (h.grace ?? 24) }\n            : { x: a.pos.x, y: a.pos.y, r: 120 }; // no ground left: hold this spot\n        }\n        const cdx = a.pos.x - a.confine.x, cdy = a.pos.y - a.confine.y;\n        const cd = Math.hypot(cdx, cdy);\n        if (cd > a.confine.r) {\n          const s = a.confine.r / cd;\n          a.pos.x = a.confine.x + cdx * s;\n          a.pos.y = a.confine.y + cdy * s;\n        }\n      }\n      // ARMED AMBUSH: scenery until an enemy strays inside the wake radius —\n      // then the reveal (flash + tell) and an ordinary fight. Instance\n      // specs (spawner-armed) win over the def row; pack springs CHAIN, so\n      // a penned herd empties as one event.\n      if (a.ambushArmed && !a.dead) {\n        const spec = a.ambushSpec ?? (a.defId ? MONSTERS[a.defId]?.ambush : undefined);\n        const wake = spec?.radius ?? 130;\n        for (const e of nativeHost.enemiesOf(a)) {\n          if (e.dead || e.sheet.get('invisible') > 0) continue;\n          if (dist(a.pos, e.pos) > wake) continue;\n          nativeHost.springAmbush(a);\n          break;\n        }\n      }\n      // LIVE BURROW: submerge → dust-line travel → telegraphed emergence.\n      if (a.burrow && !a.dead) nativeHost.stepBurrow(a, dt);\n      // PACK BOND (MonsterDef.bond): worn only while a living bond-holder\n      // stands near — the source moves on EDGES, never per frame. Burst the\n      // holder first and the pack softens (the priority counterplay).\n      if (a.defId && !a.dead) {\n        const bond = MONSTERS[a.defId]?.bond;\n        if (bond) {\n          const r = bond.radius ?? 520;\n          // THE PACK LAYER (engine/pack.ts): this scan does not merely answer\n          // WHETHER a holder stands near — it records WHICH ONE, and that\n          // record IS the drawn link. Taking the NEAREST rather than the\n          // first in array order costs nothing (squared compare, no sqrt —\n          // strictly cheaper per candidate than the old dist() call, and the\n          // holder-less worst case already walked the whole roster) and buys\n          // the honest read: a body's line runs to the warden actually\n          // standing over it. The boolean is unchanged either way, so the\n          // mods and the line are one answer — drawn == tested.\n          const r2 = r * r;\n          let from: Actor | undefined;\n          let bd = Infinity;\n          for (const o of nativeHost.actors) {\n            if (o === a || o.dead || o.team !== a.team) continue;\n            if (bond.kin\n              ? (o.defId !== bond.kin && o.tag !== bond.kin && o.faction !== bond.kin)\n              : (a.squadId === undefined || o.squadId !== a.squadId)) continue;\n            const dx = a.pos.x - o.pos.x, dy = a.pos.y - o.pos.y;\n            const d2 = dx * dx + dy * dy;\n            if (d2 > r2 || d2 >= bd) continue;\n            bd = d2; from = o;\n          }\n          const held = !!from;\n          const companionCueFrom = a.bondFrom;\n          a.bondFrom = from;\n          if (held !== a.bondHeld) {\n            a.bondHeld = held;\n            a.sheet.setSource('bond', held ? bond.mods : []);\n            if (!held) nativeHost.showCompanionCue(a, 'sever', companionCueFrom);\n          }\n        }\n      }\n      // PHASE-WORN MODS (MonsterDef.nocturne): worn only while the world\n      // clock stands in the def's hours — the Court runs quick in the dark,\n      // its coach armors in gloom, its pallbearers stand hardest at noon.\n      // Edge-triggered like the pack bond; the WHEEL moves it, not the frame.\n      if (a.defId && !a.dead) {\n        const noct = MONSTERS[a.defId]?.nocturne;\n        if (noct) {\n          const held = inPhases(nativeHost.time, noct.phases);\n          if (held !== a.nocturneHeld) {\n            a.nocturneHeld = held;\n            a.sheet.setSource('nocturne', held ? noct.mods : []);\n          }\n        }\n      }\n      // GROUND-WORN MODS (MonsterDef.rooted — engine/rooted.ts): the\n      // conditional-mod family's THIRD axis. Bond asks who is near,\n      // nocturne asks what hour it is; this asks WHERE THIS BODY STANDS.\n      // Edge-triggered like both, and gated by a GRACE on the way OUT\n      // only: a creep rim breathes on the warren's pulse, so an instant\n      // edge test would flap the sheet every beat — but STEPPING BACK ON\n      // is instant, because that half is the reward.\n      if (a.defId && !a.dead) {\n        const root = MONSTERS[a.defId]?.rooted;\n        if (root) {\n          const on = standsRooted(root, a.pos, {\n            // THE GRID ROOT (the cistern crone): a body standing on a\n            // PAINTED region (the cistern's water, the soulriver's sea —\n            // the walk grid's own cell, stamped beside the doodad ground\n            // by the region-sense sweep) roots on it exactly as on a\n            // poured disc; the doodad ground keeps precedence where both\n            // stand. Absent rows read undefined as before.\n            groundKind: a.groundKind ?? a.gridRegion,\n            creepCover: nativeHost.creep ? (k, x, y) => nativeHost.creep!.coverOf(k, x, y) : undefined,\n          });\n          if (on) a.rootedOffAt = 0;\n          else if (a.rootedOffAt === 0) a.rootedOffAt = nativeHost.time;\n          const held = on\n            || nativeHost.time - a.rootedOffAt < (root.grace ?? ROOTED_CFG.grace);\n          if (held !== a.rootedHeld) {\n            a.rootedHeld = held;\n            a.sheet.setSource('rooted', held ? root.mods : (root.off ?? []));\n            const note = held ? root.noteOn : root.note;\n            if (note) {\n              nativeHost.text(vec(a.pos.x, a.pos.y - 18), note,\n                held ? ROOTED_CFG.onColor : ROOTED_CFG.offColor, 11);\n            }\n          }\n        }\n      }\n      // SHELL REGROWTH: quiet seconds knit the pool back; a broken shell\n      // re-forms once a real fraction has regrown (the burst window closes).\n      const sg = a.shellGuard;\n      if (sg && !a.dead && sg.pool < sg.max && nativeHost.time - sg.lastHitAt >= sg.regenDelay) {\n        sg.pool = Math.min(sg.max, sg.pool + sg.regenRate * dt);\n        if (sg.broken && sg.pool >= sg.max * (sg.reformFraction ?? 0.4)) {\n          sg.broken = false;\n          nativeHost.flashes.push(defenseCueFlash(a, 'shell', 'reform', sg.color, { style: sg.shellVisual,\n            facing: a.facing + (sg.side === 'rear' ? Math.PI : 0),\n            arc: sg.side === 'all' ? Math.PI * 2 : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, nativeHost.time) }));\n        }\n      }\n      // CAST LOCK: a running cast bar PINS the body on its STAMPED aim —\n      // the wind-up points where the blow will actually land (the resolve\n      // fires at cs.aim, so a body that keeps tracking its target is lying).\n      // Channels and guards steer their own facing inside updateCasting\n      // (trackAim / autoSpin / turnRate) — their tracking is the design.\n      {\n        const cl = a.casting;\n        if (cl && cl.mode !== 'channel' && cl.mode !== 'guard' && !a.dead\n          && dist(a.pos, cl.aim) > 2) {\n          a.facing = angleTo(a.pos, cl.aim);\n        }\n      }\n      // TURN CLAMP (BEHAVIOR_STATS.turnSpeed ← Actor.turnSpeed as the innate\n      // base): facing may only swing so far per frame — big bodies LUMBER,\n      // their shell arcs and their aim lag the fight, and circling them\n      // becomes real play. Runs AFTER the cast lock, so a lumbering body\n      // still SWINGS onto its stamp believably. The rate reads THROUGH the\n      // sheet (the aim knobs' law), so curses, auras and ground can bend the\n      // pivot; a body with nothing folded — every player seat — resolves 0\n      // and keeps its instant facing.\n      const steeredCast = a.casting?.mode === 'channel' || a.casting?.mode === 'guard';\n      if (steeredCast && a.facingPrev !== undefined) {\n        // These casts spend their ONE pivot budget inside updateCasting.\n        // AI's desired facing must not turn them once here and once there.\n        a.facing = a.facingPrev;\n      } else if (a.facingPrev !== undefined && !a.dead) {\n        const rate = nativeHost.actorTurnRate(a);\n        if (rate > 0) {\n          const want = angleDiff(a.facingPrev, a.facing);\n          const cap = rate * dt;\n          if (Math.abs(want) > cap) a.facing = a.facingPrev + Math.sign(want) * cap;\n        }\n      }\n      a.facingPrev = a.facing;\n      // VELOCITY ESTIMATE (the behavior fabric): an EMA of the actual frame\n      // displacement — whatever moved the body (walk, dash, knockback), this\n      // is the motion a shot-leading mind (BehaviorSpec.aimLead) reads.\n      if (dt > 0) {\n        if (a.posPrev) {\n          // Teleports read as a blink, not a ballistic launch: samples clamp\n          // to a fast sprint, so one warped frame can't poison the read.\n          const cap = BEHAVIOR_CFG.velSampleMax;\n          const ix = clamp((a.pos.x - a.posPrev.x) / dt, -cap, cap);\n          const iy = clamp((a.pos.y - a.posPrev.y) / dt, -cap, cap);\n          const k = Math.min(1, dt * BEHAVIOR_CFG.velEmaRate);\n          a.velEst.x += (ix - a.velEst.x) * k;\n          a.velEst.y += (iy - a.velEst.y) * k;\n          a.posPrev.x = a.pos.x; a.posPrev.y = a.pos.y;\n        } else {\n          a.posPrev = { x: a.pos.x, y: a.pos.y };\n        }\n      }\n      // THE LEDGER's beat: escalating upkeep + the low-mana vent.\n      nativeHost.updateActorLedgers(a, dt);\n      // One sweep for EVERYTHING updateTimers can bleed — DoTs, staggered\n      // wounds landing, upkeep starvation — so no drain path forgets to kill.\n      if (a.life <= 0 && !a.dead) nativeHost.kill(a);\n      // Rupture supports: statuses that expired this frame may detonate.\n      if (a.expiredStatuses.length) {\n        for (const s of a.expiredStatuses) {\n          if (s.rupture && s.rupture > 0 && !a.dead && !STATUS_DEFS[s.id]?.dischargeMatchingType) nativeHost.ruptureStatus(a, s);\n        }\n        a.expiredStatuses.length = 0;\n      }\n      // BRAND ZAPS (StatusDef.zapNearby — Fulgurweb): while the mark rides,\n      // bolts lash the victim's ALLIES on the brand's beat. Caster-less\n      // baseline damage; standing next to the marked is the mistake.\n      for (const s of a.statuses) {\n        const zn = STATUS_DEFS[s.id]?.zapNearby;\n        if (!zn || a.dead) continue;\n        s.zapAt ??= nativeHost.time + zn.interval;\n        if (nativeHost.time < s.zapAt) continue;\n        s.zapAt = nativeHost.time + zn.interval;\n        const dmg = baselineStatusDps(s.id, nativeHost.zone.level) * zn.factor * s.stacks;\n        const el = STATUS_DEFS[s.id]?.element ?? 'lightning';\n        let lashed = false;\n        for (const kin of nativeHost.actors) {\n          if (kin === a || kin.dead || kin.untargetable || kin.passive) continue;\n          if (kin.team !== a.team || kin.invulnerable) continue;\n          if (dist(a.pos, kin.pos) > zn.radius) continue;\n          const taken = mitigateTyped(kin, { [el]: dmg });\n          if (taken > 0) {\n            kin.life -= taken;\n            kin.hitFlash = 0.1;\n            kin.hitFlashType = el;\n            nativeHost.accumulateDotText(kin, taken, zn.interval);\n            if (kin.life <= 0 && !kin.dead) nativeHost.kill(kin);\n            lashed = true;\n          }\n        }\n        if (lashed) {\n          nativeHost.flashes.push({\n            pos: vec(a.pos.x, a.pos.y), radius: zn.radius,\n            color: STATUS_DEFS[s.id]?.color ?? '#e8e05a', life: 0.15, maxLife: 0.15,\n          });\n        }\n      }\n      // MADNESS (StatusDef.lashOut — the cursed-ground betrayal): the\n      // afflicted STRIKES whatever is nearest, friend or foe alike, on the\n      // fog's beat. Caster-less baseline damage, mitigated normally.\n      for (const s of a.statuses) {\n        const lo = STATUS_DEFS[s.id]?.lashOut;\n        if (!lo || a.dead || a.isStunned()) continue;\n        s.lashAt ??= nativeHost.time + lo.interval;\n        if (nativeHost.time < s.lashAt) continue;\n        s.lashAt = nativeHost.time + lo.interval;\n        let prey: Actor | null = null;\n        let best = lo.radius;\n        for (const other of nativeHost.actors) {\n          if (other === a || other.dead || other.untargetable || other.passive\n            || other.invulnerable || other.construct) continue;\n          const dd = dist(a.pos, other.pos);\n          if (dd <= best) { best = dd; prey = other; }\n        }\n        if (!prey) continue;\n        const dmg = baselineStatusDps(s.id, nativeHost.zone.level) * lo.factor;\n        const taken = mitigateTyped(prey, { physical: dmg });\n        if (taken > 0) {\n          prey.life -= taken;\n          prey.hitFlash = 0.12;\n          prey.hitFlashType = 'physical';\n          nativeHost.text(prey.pos, Math.round(taken).toString(), '#d84a9a', 12);\n          if (prey.life <= 0 && !prey.dead) nativeHost.kill(prey);\n        }\n        nativeHost.flashes.push({\n          pos: vec(a.pos.x, a.pos.y), radius: a.radius + 10,\n          color: '#d84a9a', life: 0.15, maxLife: 0.15,\n        });\n      }\n      // IRON WARD: the ward ends — everything it banked DETONATES.\n      if (a.ironWard && nativeHost.time >= a.ironWard.until) {\n        const iw = a.ironWard;\n        a.ironWard = undefined;\n        const amount = Math.min(iw.cap, iw.stored) * iw.ratio;\n        if (amount > 0 && !a.dead) {\n          nativeHost.burstDamage(vec(a.pos.x, a.pos.y), iw.radius, amount,\n            'physical', iw.visualColor ?? '#c8c0a8', a.team, 0, undefined, undefined, skillSelfVoice('iron_ward', 'burst'));\n        }\n      }\n      // weakPointBonus reads the live interval at each damage resolution; this\n      // sweep retires spent windows and leaves an attributable body fracture.\n      for (const cue of takeWeakPointBreaks(a)) nativeHost.flashes.push(anatomyFlash(a.pos, a.radius, a.facing, cue));\n      if (a.casting) {\n        const cast = a.casting;\n        const castFacing = a.facing;\n        nativeHost.updateCasting(a, dt);\n        // Completing a stamped cast can write facing in executeSkill.\n        // Its payload keeps the committed aim, but the body has already\n        // spent its turn budget; resolution is not a free snap-turn.\n        if (!steeredCast && nativeHost.actorTurnRate(a) > 0) a.facing = castFacing;\n        if (steeredCast) a.facingPrev = a.facing;\n        if (a.casting !== cast && cast.aiRecovery !== undefined\n          && !a.dead && !a.isStunned() && !nativeHost.seatOf(a)) {\n          finishAIRecovery(a, nativeHost.time, cast.aiRecovery);\n        }\n      }\n      // THE FRAME LOCK re-derive (StatusDef.frameLock — the fourth wall):\n      // stamped once at the rising edge from the frame that governs the\n      // bearer THAT instant (copied — the live published rect mutates),\n      // held while any declaring status is worn, cleared at the falling\n      // edge. The flight-state idiom: status traffic is the whole law.\n      {\n        let frameLocked = false;\n        for (const s of a.statuses) {\n          if (STATUS_DEFS[s.id]?.frameLock) { frameLocked = true; break; }\n        }\n        if (frameLocked) {\n          if (!a.frameLockRect) a.frameLockRect = { ...nativeHost.viewRectFor(a) };\n        } else if (a.frameLockRect) a.frameLockRect = null;\n      }\n      if (a.dash) {\n        const inst = (a as Actor & { dashSkill?: SkillInstance }).dashSkill;\n        const hits = (a as Actor & { dashHits?: Set<number> }).dashHits;\n        const visualFrom = { ...a.pos }, visualTier = a.tier;\n        const step = a.dash.speed * Math.min(dt, Math.max(0, a.dash.remaining));\n        nativeHost.steppedClamp(a, vec(\n          a.pos.x + Math.cos(a.dash.dir) * step,\n          a.pos.y + Math.sin(a.dash.dir) * step,\n        ), a.pos);\n        if (inst && a.tier === visualTier && dist(visualFrom, a.pos) <= step + .01) {\n          nativeHost.noteMovementTravel(a, inst, visualFrom, 1 - a.dash.remaining / Math.max(.01,\n            inst.def.delivery.type === 'dash' ? inst.def.delivery.distance / a.dash.speed : 1));\n        }\n        if (inst && hits && inst.def.delivery.type === 'dash' && inst.def.delivery.width > 0) {\n          for (const enemy of nativeHost.enemiesOf(a)) {\n            if (hits.has(enemy.id)) continue;\n            // SEGMENT FABRIC: the corridor clips the nearest hittable body.\n            const nb = nearestBody(enemy, a.pos);\n            if (dist(a.pos, nb.pos) - nb.r <= inst.def.delivery.width / 2 + a.radius) {\n              hits.add(enemy.id);\n              noteBodyHit(enemy, nb.seg);\n              // Corridor grazes can be tuned down (Closing Fang: the\n              // arrival is the bite, not the trip past).\n              nativeHost.resolveHit(a, inst, enemy, inst.def.delivery.corridorScale ?? 1);\n              // THE CHARGE CARRY (DashDelivery.onContact — the grab\n              // fabric): the run's first valid CONTACT is seized and\n              // dragged for the remainder of the run. The catch is a BODY\n              // event (the bull's mass — dodged with your feet by leaving\n              // the corridor, the wall doctrine), so it rides the contact,\n              // not the gore's accuracy roll; every other gate is\n              // grabSeize's own (mass law, policy tiers, grace, dormancy,\n              // hostility — 'hands full' makes it first-catch-wins). The\n              // hold's patience is clamped to the run's own clock: the\n              // drag can never outlive the charge that authored it,\n              // however the run ends.\n              const carry = inst.def.delivery.onContact;\n              if (carry && nativeHost.grabSeize(a, inst, enemy, carry.grab)) {\n                if (carry.maxCarryDistance !== undefined) {\n                  // This beat already moved; the end-of-beat decrement\n                  // must leave exactly the authored post-contact budget.\n                  a.dash.remaining = Math.min(a.dash.remaining,\n                    dt + Math.max(0, carry.maxCarryDistance) / Math.max(1, a.dash.speed));\n                }\n                const hold = a.gripping;\n                if (hold && hold.id === enemy.id) {\n                  hold.until = Math.min(hold.until, nativeHost.time + a.dash.remaining);\n                }\n              }\n            }\n          }\n          // THE MALLET: the corridor rings bells / pops pots it passes\n          // over, once per dash (the same hits ledger the bodies ride).\n          nativeHost.strikeSurfaces(a, a.pos,\n            inst.def.delivery.width / 2 + a.radius, undefined, hits);\n        }\n        // Trailblaze / Fire Walker: the dash sows burning ground. The\n        // drop-zone composables ride (DropZoneSpec): envelopes breathe\n        // each drop, and durationBySpeed reads the DASH's own pace — a\n        // laden charge-dash (speedAtFull) sows different ground than a\n        // full-tilt one.\n        // CLOUD TRAIL (Zephyr Step / the cloudTrail stat, stashed at cast):\n        // the dash lays standing cloud as it travels — every ~30 units,\n        // one conjure (sky-road over conjurable void; over honest land the\n        // presence stands as a wind-lane granting the stash's gifts).\n        const conjSpec = (a as Actor & { dashConjureSpec?: DashConjureStash }).dashConjureSpec;\n        if (conjSpec) {\n          const cc = a as Actor & { conjTrailDist?: number };\n          cc.conjTrailDist = (cc.conjTrailDist ?? 99) + step;\n          if (cc.conjTrailDist >= 30) {\n            cc.conjTrailDist = 0;\n            nativeHost.conjureCloud(a.pos.x, a.pos.y, conjSpec.radius, conjSpec.duration, {\n              caster: a, grants: conjSpec.grants,\n              ...(conjSpec.look !== undefined ? { look: conjSpec.look } : {}),\n            });\n          }\n        }\n        // THE STEAM TRAIL (DashDelivery.trailVent — Vent Hop): a fog bank\n        // planted every `spacing` units of travel, the conjure trail's\n        // sibling (reach + life already folded at the cast).\n        const ventSpec = (a as Actor & { dashVentSpec?: { bank: string; radius: number; duration: number; spacing: number } }).dashVentSpec;\n        if (ventSpec) {\n          const vc = a as Actor & { ventTrailDist?: number };\n          vc.ventTrailDist = (vc.ventTrailDist ?? 1e9) + step;\n          if (vc.ventTrailDist >= ventSpec.spacing) {\n            vc.ventTrailDist = 0;\n            nativeHost.plantVent({ bank: ventSpec.bank, radius: ventSpec.radius, duration: ventSpec.duration },\n              vec(a.pos.x, a.pos.y), 1, 1, a.tier);\n          }\n        }\n        const trail = (a as Actor & { dashTrailSpec?: DropZoneSpec }).dashTrailSpec;\n        if (inst && trail) {\n          const carrier = a as Actor & { trailDist?: number };\n          carrier.trailDist = (carrier.trailDist ?? 99) + step;\n          if (carrier.trailDist >= 42) {\n            carrier.trailDist = 0;\n            nativeHost.mintTrailPatch(a, inst, trail, a.pos, a.dash.dir,\n              trail.duration * speedLingerMul(trail.durationBySpeed, a.dash.speed));\n          }\n        }\n        a.dash.remaining -= dt;\n        if (a.dash.remaining <= 0) {\n          // THE RUN'S-END SHED (DashDelivery.onContact — the charge\n          // carry's release): a catch this run's corridor seized leaves\n          // NOW — re-seated at the stopped charger's leading rim (the\n          // crack of the whip: the towed body overtakes the tower that\n          // stopped; the throw's own rim constant) and handed shove ×\n          // the run's speed forward with authority ALREADY SPENT (the\n          // bowling lane's hand-off — pushActor noAuthority). A wall\n          // answers with the mass fabric's arrest wound, a rim with the\n          // pit-aware push law, charger-credited both. An early escape\n          // (struggle/sever/CC) already released through the standing\n          // ladder and finds nothing here.\n          {\n            const hold = a.gripping;\n            const carryD = inst && inst.def.delivery.type === 'dash'\n              ? inst.def.delivery.onContact : undefined;\n            if (inst && carryD && hold && hold.skillId === inst.def.id) {\n              const v = nativeHost.actorById(hold.id);\n              nativeHost.grabRelease(a);\n              if (v && !v.dead) {\n                v.pos = nativeHost.clampPos(vec(\n                  a.pos.x + Math.cos(a.dash.dir) * (a.radius + v.radius) * 0.9,\n                  a.pos.y + Math.sin(a.dash.dir) * (a.radius + v.radius) * 0.9), v.radius);\n                v.facing = a.dash.dir + Math.PI;\n                nativeHost.pushActor(v, a.dash.dir,\n                  a.dash.speed * (carryD.shove ?? GRAB_CFG.runCarry.shoveFrac) / PUSH_DAMPING,\n                  a, inst, { noAuthority: true });\n                nativeHost.flashes.push({\n                  pos: vec(v.pos.x, v.pos.y), radius: a.radius + v.radius + 10,\n                  color: '#d8a06a', life: 0.2, maxLife: 0.2,\n                });\n              }\n            }\n          }\n          a.dash = null;\n          // A later AI-only rush must not inherit this skill's corridor,\n          // grab or trail payload. Clear before arrival effects, which may\n          // themselves launch a fresh dash with its own metadata.\n          Object.assign(a, {\n            dashSkill: undefined, dashHits: undefined,\n            dashConjureSpec: undefined, conjTrailDist: undefined,\n            dashVentSpec: undefined, ventTrailDist: undefined,\n            dashTrailSpec: undefined, trailDist: undefined,\n          });\n          // Dive Bomb: the arrival erupts; No Man's Land fields drop here.\n          if (inst) {\n            nativeHost.movementMoment(a, inst, 'arrive');\n            nativeHost.moveBlast(a, inst, a.pos);\n            nativeHost.dropLingerField(a, inst, a.pos);\n            // THE ANSWERING CHARGE (guardBash beyond the stance,\n            // 2026-07-22): a guard-tagged dash with a bash spec answers\n            // at ARRIVAL — the shield that battered the corridor swings\n            // once more at the stop, paying the poolless stand-in.\n            const dBash = guardBashSpec(inst);\n            if (dBash) {\n              nativeHost.guardBash(a, inst, dBash, BASH_CFG.poollessShield\n                * a.sheet.get('guardStrength',\n                  skillContextTags(inst, grantedTags(inst)), instanceMods(inst)));\n            }\n          }\n        }\n      }\n      // THE CAROM MOTOR (the fourth wall — CaromDelivery): the body is the\n      // ball. The worn ride status is the ONE clock — when it leaves\n      // (expiry, dispel, cleanse) the ride ends through endCarom's single\n      // door, stop-blast paid. A grab, a saddle, hard CC, a downing and\n      // death all end it early; walls and the governing frame bank the\n      // heading through the one shared reflection (drawn == banked).\n      if (a.caromRun) {\n        const run = a.caromRun;\n        const caromC = a as Actor & {\n          caromSkill?: SkillInstance; caromHits?: Map<number, number>; caromRung?: Set<number>;\n        };\n        const inst = caromC.caromSkill;\n        if (!a.statuses.some(s => s.id === run.status) || a.dead || a.downed\n          || a.isStunned() || a.heldBy !== undefined || a.mountId !== undefined) {\n          nativeHost.endCarom(a);\n        } else {\n          const C = FOURTH_WALL_CFG.carom;\n          const spec = inst?.def.delivery.type === 'carom' ? inst.def.delivery : undefined;\n          const step = run.speed * dt;\n          const beforeX = a.pos.x, beforeY = a.pos.y;\n          const wantX = Math.cos(run.dir) * step, wantY = Math.sin(run.dir) * step;\n          nativeHost.steppedClamp(a, vec(a.pos.x + wantX, a.pos.y + wantY), a.pos);\n          // WALL BANK: whichever axis the clamp refused flips — the\n          // projectile grid-bounce's axis law at body scale, through the\n          // ONE mover every walker shares (drawn == banked, no forked\n          // collision fabric).\n          let cdx = Math.cos(run.dir), cdy = Math.sin(run.dir), banked = false;\n          if (Math.abs(wantX) > C.blockedMin\n            && (a.pos.x - beforeX) / wantX < C.blockedFrac) { cdx = -cdx; banked = true; }\n          if (Math.abs(wantY) > C.blockedMin\n            && (a.pos.y - beforeY) / wantY < C.blockedFrac) { cdy = -cdy; banked = true; }\n          if (banked) run.dir = Math.atan2(cdy, cdx);\n          // FRAME BANK: the governing rect — the stamped lock while one\n          // holds, the live drawn frame otherwise.\n          const fw = frameReflect(a.pos.x, a.pos.y, run.dir, a.radius, nativeHost.viewRectFor(a));\n          if (fw) {\n            a.pos.x = fw.x;\n            a.pos.y = fw.y;\n            run.dir = fw.dir;\n          }\n          a.facing = run.dir;\n          if (inst) {\n            if (dist({ x: beforeX, y: beforeY }, a.pos) <= step + .01) nativeHost.noteMovementTravel(a, inst, { x: beforeX, y: beforeY }, nativeHost.time % 1);\n            if (banked || fw) nativeHost.movementMoment(a, inst, 'bank');\n          }\n          // CONTACT: the skill's whole payload through the one pipeline,\n          // per victim on the rehit clock (segment-aware — coils are real\n          // bodies; the corridor's noteBodyHit grammar verbatim).\n          if (inst) {\n            const rehit = spec?.rehit ?? C.rehitSec;\n            const reach = a.radius + C.contactPad;\n            for (const enemy of nativeHost.enemiesOf(a)) {\n              const nb = nearestBody(enemy, a.pos);\n              if (dist(a.pos, nb.pos) - nb.r > reach) continue;\n              if ((caromC.caromHits?.get(enemy.id) ?? -1) > nativeHost.time) continue;\n              caromC.caromHits?.set(enemy.id, nativeHost.time + rehit);\n              noteBodyHit(enemy, nb.seg);\n              nativeHost.resolveHit(a, inst, enemy, spec?.contactScale ?? 1);\n            }\n            // THE MALLET: bells rung and pots popped along the roll, once\n            // per ride (the dash corridor's own ledger law).\n            nativeHost.strikeSurfaces(a, a.pos, reach, undefined, caromC.caromRung);\n          }\n        }\n      }\n      // BODY WAKE (MonsterDef.wake): the body itself SHEDS its ground\n      // payload as it travels — every everyDist units of ACTUAL\n      // displacement (walks, dashes, shoves alike) the named catalog skill\n      // free-casts at its feet through the ordinary ground pipeline, so\n      // envelopes, exposure grace, telegraphs and Foresight all ride. A\n      // hidden ambusher or burrower (untargetable) sheds nothing, and a\n      // stationary body never leaks: the trail IS the travel.\n      // FIRE WALKER'S SPRINT (the walking trail — moveTrail while a\n      // movement buff holds): the same odometer grammar as the body\n      // wake, expiring with the working. One drop per beat, however far\n      // a frame jumped — a teleport writes one patch, not a rope.\n      {\n        const wt = a as Actor & {\n          walkTrail?: { spec: DropZoneSpec; until: number; inst: SkillInstance };\n          walkTrailPrev?: Vec2; walkTrailOdo?: number;\n        };\n        if (wt.walkTrail && !a.dead) {\n          if (nativeHost.time >= wt.walkTrail.until) {\n            wt.walkTrail = undefined;\n            wt.walkTrailPrev = undefined;\n          } else {\n            const prev = wt.walkTrailPrev;\n            wt.walkTrailPrev = vec(a.pos.x, a.pos.y);\n            if (prev) {\n              wt.walkTrailOdo = (wt.walkTrailOdo ?? 0) + dist(prev, a.pos);\n              if (wt.walkTrailOdo >= 42) {\n                wt.walkTrailOdo = 0;\n                nativeHost.mintTrailPatch(a, wt.walkTrail.inst, wt.walkTrail.spec, a.pos, a.facing);\n              }\n            }\n          }\n        }\n      }\n      if (a.wake && !a.dead && !a.untargetable) {\n        const prev = a.wakePrev;\n        a.wakePrev = vec(a.pos.x, a.pos.y);\n        if (prev) {\n          // One shed per beat, however far a single frame jumped — a\n          // teleport writes one drop, not a rope of them.\n          a.wakeOdo = (a.wakeOdo ?? 0) + dist(prev, a.pos);\n          if (a.wakeOdo >= a.wake.everyDist) {\n            a.wakeOdo = 0;\n            const wdef = SKILLS[a.wake.skillId];\n            if (wdef) {\n              a.wakeInst ??= makeSkillInstance(wdef, Math.max(1, Math.round(a.level)));\n              nativeHost.executeSkill(a, a.wakeInst, vec(a.pos.x, a.pos.y), {\n                dmgMult: a.wake.dmgMult ?? 1,\n                noCooldown: true, noRepeat: true, keepFacing: true,\n              });\n            }\n          }\n        }\n      }\n      // BRIM DECAY (ChannelSpec.brim.decay): un-held bars bleed — unless\n      // banked at/above bankAt (the kept plateau) or the spec simply\n      // holds. The ledger carries the live instance so socketed support\n      // mods reach the drain query (Stillwater's stopped clock).\n      if (a.brims?.size) {\n        for (const [sid, bs] of a.brims) {\n          if (a.casting?.mode === 'channel' && a.casting.held\n            && a.casting.inst.def.id === sid) continue;\n          if (bs.fill <= 0) { a.brims.delete(sid); continue; }\n          const spec = bs.spec;\n          if (!spec.decay) continue;\n          if (spec.bankAt !== undefined && bs.fill >= spec.bankAt) continue;\n          bs.fill -= spec.decay\n            * a.sheet.get('brimDecay', skillContextTags(bs.inst.def), instanceMods(bs.inst))\n            * dt;\n          if (bs.fill <= 0) a.brims.delete(sid);\n        }\n      }\n      // Knockback shoves in flight: smooth, and collision stops them. A collision\n      // (wall or void) reports back, so it can FALL into a void and roll the\n      // caster's 'collision' procs ONCE (the knockback-collision-damage support).\n      if (a.push) {\n        const p = a.push;\n        const from = a.pos;\n        const speed = Math.hypot(p.vx, p.vy);\n        const sc = nativeHost.cScratch; sc.hit = 'none';\n        a.pos = nativeHost.clampPos(vec(\n          a.pos.x + p.vx * dt,\n          a.pos.y + p.vy * dt), a.radius, from, { out: sc, mover: a });\n        const hit = sc.hit as string;\n        // THE BOWLING LANE (engine/mass.ts): a body flying fast enough\n        // slams through — or is arrested by — bodies in its path. Swept\n        // BEFORE the wall verdict so a plow that sheds speed below the\n        // impact gate honestly arrives soft.\n        if (speed >= MASS_CFG.slam.minSpeed) nativeHost.sweepBodySlam(a, p, speed);\n        // FORCED displacement (the shove in flight): the one lane a hostile\n        // can truly be put past a pit's lip — the pitfall fabric's descend\n        // routing pays the shover for it (walkers merely arrested at a rim\n        // by their own steering are held, never dropped).\n        if (hit === 'void') nativeHost.resolveBoundary(a, sc, from, true);\n        // THE RIM FALL (engine/tiers.ts): an elevated body SHOVED past its\n        // layer's rim — where its floor ends but a LOWER floor stands —\n        // FALLS: it lands on the HIGHEST standing story beneath the\n        // overshoot, staggered. Off a butte that's the valley; off a summit\n        // terrace it's the bench below — the mountain is descended one\n        // shove at a time. Walking never drops (the rim is a wall to feet).\n        // THE ENCLOSURE LAW (engine/tiers.ts tierEnclosure): an ENCLOSED\n        // stack — an under-layer's ceiling, a building's storey — has no\n        // rim to fall off: the clamp above already held the body at its\n        // story's edge exactly as it holds feet (the same view willed\n        // movement confines against), so nothing more happens — the inn's\n        // lodger shoved into a hanging wall stays upstairs, the duct runner\n        // shoved at the duct's side stays in the duct. Only OPEN country\n        // (buttes, summits — knock-off is the identity) reads on.\n        if (hit === 'wall' && a.tier >= 1 && nativeHost.walk && nativeHost.zone.tiers && !tierEnclosed(nativeHost.zone.tiers)) {\n          const rawX = from.x + p.vx * dt, rawY = from.y + p.vy * dt;\n          const kRaw = nativeHost.walk.regionAt?.(rawX, rawY);\n          if (!tierFloorAt(kRaw, a.tier)) {\n            let land = -1;\n            for (let t = a.tier - 1; t >= 0; t--) { if (tierFloorAt(kRaw, t)) { land = t; break; } }\n            if (land >= 0) {\n              a.tier = land;\n              a.pos = nativeHost.clampPos(vec(rawX, rawY), a.radius, undefined, { mover: a });\n              a.applyStatus('stun', 0, TIER_CFG.fallStunSec, 'the fall');\n              p.vx *= 0.4; p.vy *= 0.4;\n            }\n          }\n        }\n        if ((hit === 'wall' || hit === 'void') && !p.collided && p.caster && p.inst && !p.caster.dead) {\n          p.collided = true;\n          nativeHost.rollCollisionProcs(p.caster, p.inst, a);\n        }\n        // IMPACT (the mass fabric): the wall arrest itself wounds — momentum\n        // made damage, hostile-authored (or MASS_CFG.impact.casterless for\n        // authorless shoves). Void lips stay the pitfall fabric's own\n        // resolution (never double-punished).\n        if (hit === 'wall') nativeHost.resolveImpactHit(a, speed, p);\n        // Exponential ease-out: the shove bleeds off like momentum, not a timer.\n        const decay = Math.exp(-PUSH_DAMPING * dt);\n        p.vx *= decay; p.vy *= decay;\n        if (Math.hypot(p.vx, p.vy) < 40) a.push = null;\n      }\n      // Slippery ground: momentum carries you on even with no input.\n      if (!a.dash && !a.caromRun && !a.casting && !a.leap && a.lastMoveAt < nativeHost.time - 0.05) {\n        const sp = Math.hypot(a.vel.x, a.vel.y);\n        if (sp > 4) {\n          const traction = clamp(a.sheet.get('traction'), 0.05, 1);\n          if (traction < 0.999) {\n            nativeHost.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos);\n            const decay = Math.exp(-dt * (1.2 + traction * 9));\n            a.vel.x *= decay;\n            a.vel.y *= decay;\n          } else {\n            a.vel.x = 0;\n            a.vel.y = 0;\n          }\n        }\n      }\n    }\n}\n",
      "statementIndices": [
        144,
        145
      ],
      "firstLine": 42665,
      "lastLine": 43577,
      "outputSha256": "61b423f8d9430ac97e9234b63d10d9c98cf8ce4e3cfd29581568081f14bff614"
    },
    {
      "name": "effects",
      "fn": "sceneFrameEffects",
      "lo": 43582,
      "hi": 43647,
      "start": 2425108,
      "end": 2427182,
      "source": "this.updateSummonShells();\n    this.actorGridRev++;\n\n    this.updateTempGrounds(dt);\n    this.updateEvaporation(dt);\n    this.updatePendingBursts();\n    this.updatePendingContagions();\n    this.updateTerrainEffects(dt);\n    this.updateScorch(dt);\n    this.updateWindchill(dt);\n    this.updateGaze(dt);\n    this.updateFog(dt);\n    this.updateWetSky(dt);\n    this.updateCreep(dt);\n    this.updateCollapse(dt);\n    this.updateFlux(dt);\n    this.updateSpans(dt);\n    this.updateTracks(dt);\n    this.updateGeysers(dt);\n    this.updateVentDwellers(dt);\n    this.updateScaldHeat(dt); // THE SCALD HEAT SWEEP (data/scald.ts): the scorch bar's hazard sources + THE BASKER\n    this.updateCharRegrowth(dt); // THE REGROWTH CYCLE (data/scald.ts REGROWTH_CFG): ash → flush → meadow, minutes-grade\n    this.updateSoulriver(dt);\n    this.updateTrapworks(dt);\n    this.conjured?.update(dt, this.actors);\n    this.updateShrines();\n    this.updateAltars(dt);\n    this.updateChests(dt);\n\n    this.updateLeaps(dt);\n    this.updateWorms(dt);\n    this.updateParts();\n    this.updateCreepHearts();\n    this.refreshSatellites(dt);\n    this.refreshAuroras(dt);\n    this.refreshGuardians(dt);\n    this.refreshCreepers(dt);\n    this.updateProjectiles(dt);\n    this.updateZones(dt);\n    this.updateEnemyTethers(dt);\n    this.updateTethers(dt);\n    this.updateVents(dt);\n    this.updateDischarges();\n    this.updateConstructs(dt);\n    this.updateAuras(dt);\n    this.updateStrobes(dt);\n    this.updateDetonations(dt);\n    this.updateFollowUps(dt);\n    this.updateDeathBursts(dt);\n    this.updatePendingSummons(dt);\n    this.updatePendingRespawns(dt);\n    this.updateSummonContracts();\n    this.updateSummonReforms(dt);\n    this.updateCompanionGrants(dt);\n    this.updateReplenishment(dt);\n    this.updatePendingBlinks(dt);\n    this.checkMinionDetonations();\n    this.separateActors();\n    this.updateSquish();\n    this.updateWindPush(dt);\n    this.updateBrittle(dt);\n    this.updateSnow(dt);\n    this.updateWeatherDress(dt);\n    this.updateDrops(dt);\n    this.updateOrbs(dt);\n    this.updateRemnants(dt);",
      "sourceSha256": "b976969e1786718c9814c5a6607a82873b205a1f57d73f1d7b22b1ff8f4ed156",
      "output": "export function sceneFrameEffects(nativeHost:NativeSceneFrameHost,dt:number):void {\nnativeHost.updateSummonShells();\n    nativeHost.actorGridRev++;\n\n    nativeHost.updateTempGrounds(dt);\n    nativeHost.updateEvaporation(dt);\n    nativeHost.updatePendingBursts();\n    nativeHost.updatePendingContagions();\n    nativeHost.updateTerrainEffects(dt);\n    nativeHost.updateScorch(dt);\n    nativeHost.updateWindchill(dt);\n    nativeHost.updateGaze(dt);\n    nativeHost.updateFog(dt);\n    nativeHost.updateWetSky(dt);\n    nativeHost.updateCreep(dt);\n    nativeHost.updateCollapse(dt);\n    nativeHost.updateFlux(dt);\n    nativeHost.updateSpans(dt);\n    nativeHost.updateTracks(dt);\n    nativeHost.updateGeysers(dt);\n    nativeHost.updateVentDwellers(dt);\n    nativeHost.updateScaldHeat(dt); // THE SCALD HEAT SWEEP (data/scald.ts): the scorch bar's hazard sources + THE BASKER\n    nativeHost.updateCharRegrowth(dt); // THE REGROWTH CYCLE (data/scald.ts REGROWTH_CFG): ash → flush → meadow, minutes-grade\n    nativeHost.updateSoulriver(dt);\n    nativeHost.updateTrapworks(dt);\n    nativeHost.conjured?.update(dt, nativeHost.actors);\n    nativeHost.updateShrines();\n    nativeHost.updateAltars(dt);\n    nativeHost.updateChests(dt);\n\n    nativeHost.updateLeaps(dt);\n    nativeHost.updateWorms(dt);\n    nativeHost.updateParts();\n    nativeHost.updateCreepHearts();\n    nativeHost.refreshSatellites(dt);\n    nativeHost.refreshAuroras(dt);\n    nativeHost.refreshGuardians(dt);\n    nativeHost.refreshCreepers(dt);\n    nativeHost.updateProjectiles(dt);\n    nativeHost.updateZones(dt);\n    nativeHost.updateEnemyTethers(dt);\n    nativeHost.updateTethers(dt);\n    nativeHost.updateVents(dt);\n    nativeHost.updateDischarges();\n    nativeHost.updateConstructs(dt);\n    nativeHost.updateAuras(dt);\n    nativeHost.updateStrobes(dt);\n    nativeHost.updateDetonations(dt);\n    nativeHost.updateFollowUps(dt);\n    nativeHost.updateDeathBursts(dt);\n    nativeHost.updatePendingSummons(dt);\n    nativeHost.updatePendingRespawns(dt);\n    nativeHost.updateSummonContracts();\n    nativeHost.updateSummonReforms(dt);\n    nativeHost.updateCompanionGrants(dt);\n    nativeHost.updateReplenishment(dt);\n    nativeHost.updatePendingBlinks(dt);\n    nativeHost.checkMinionDetonations();\n    nativeHost.separateActors();\n    nativeHost.updateSquish();\n    nativeHost.updateWindPush(dt);\n    nativeHost.updateBrittle(dt);\n    nativeHost.updateSnow(dt);\n    nativeHost.updateWeatherDress(dt);\n    nativeHost.updateDrops(dt);\n    nativeHost.updateOrbs(dt);\n    nativeHost.updateRemnants(dt);\n}\n",
      "statementIndices": [
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        155,
        156,
        157,
        158,
        159,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        174,
        175,
        176,
        177,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        187,
        188,
        189,
        190,
        191,
        192,
        193,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209
      ],
      "firstLine": 43582,
      "lastLine": 43647,
      "outputSha256": "b706f5b5942dfefa6a899e127565fbabd7a41f632936570854583eab0869a2a9"
    },
    {
      "name": "lateBodies",
      "fn": "sceneFrameLateBodies",
      "lo": 43651,
      "hi": 43734,
      "start": 2427406,
      "end": 2431771,
      "source": "this.updateCarriers(dt);\n    // THE LATCH slave step LAST among movers — the seat wins the frame\n    // (drawn == held; engine/cling.ts).\n    this.updateClings();\n    // THE GRAB sweep rides right behind it (engine/grab.ts): the release\n    // ladder, then the held body's seat wins ITS frame the same way.\n    this.updateGrabs(dt);\n    // THE MOUNT sweep rides behind the grabs (engine/mounts.ts): pairing,\n    // then the saddle pin — after the grab ladder so a grip landed THIS\n    // frame tears its rider from the saddle this frame, and the remaining\n    // riders' seats still win the frame.\n    this.updateMounts();\n    this.updateSummonShells();\n    updateMovementTethers(this, dt); // movementTether wins after body displacement\n    updateEncounterGroups(this.actors);\n    updateEncounterCombat(this);\n    // THE POSSESSION SEAM sweep rides behind the grabs (engine/possess.ts):\n    // the ride clock + the husk ladder — a hold landed on the husk THIS\n    // frame is seen this frame.\n    this.updatePossessions(dt);\n    // THE WATCH FABRIC's behavior sweep (engine/watch.ts) rides just ahead\n    // of the tells: rung cache, stand-downs, the scanning gaze and the\n    // tracker's nose all settle, THEN the worn gauges read them — a tell\n    // never shows last frame's ladder.\n    this.updateWatch();\n    // THE RESERVE FABRIC's sweep (engine/reserves.ts) rides beside it, and\n    // for the same reason: the burn, the leak, the recovery and the vent\n    // windows all settle BEFORE the gauges read them, so a bladder never\n    // draws last frame's breath. Its travel odometer also wants every\n    // mover to have finished moving.\n    this.updateReserves();\n    // THE PACK SWEEP (engine/pack.ts) — the social folds (a warden's court,\n    // a squad's shared appetite, a ward's guardian) settle here, AFTER the\n    // bond scan and the movers, BEFORE the gauges that read them.\n    this.updatePack();\n    // THE TELL FABRIC's value sweep (engine/tells.ts) — after every mover\n    // and state machine has spoken for the frame, the worn gauges read.\n    this.updateTells();\n    // THE COUCH EDGE LAW dead last among movers: whatever moved a local hero\n    // this frame — intent, dash, shove, carrier — the shared frame's wall\n    // answers it (no-op outside couch play; see couchConfine).\n    this.applyCouchConfine();\n\n    // Corpses decay\n    for (let i = this.corpses.length - 1; i >= 0; i--) {\n      this.corpses[i].remaining -= dt;\n      this.corpses[i].tier ??= this.spoilStoryAt(this.corpses[i].pos); // THE SPOILS STORY, settled once\n      if (this.corpses[i].remaining <= 0) this.corpses.splice(i, 1);\n    }\n\n    // Texts & flashes\n    for (let i = this.texts.length - 1; i >= 0; i--) {\n      const t = this.texts[i];\n      t.life -= dt; t.pos.y -= 28 * dt;\n      if (t.life <= 0) this.texts.splice(i, 1);\n    }\n    // The INFO-STREAM feeds age on the same beat (world clock — a held menu\n    // freezes the news mid-breath; the caps live in the fabric's own laws).\n    pruneNotices(this.notices, this.time);\n    prunePickupFeed(this.pickupFeed, this.time);\n    for (let i = this.flashes.length - 1; i >= 0; i--) {\n      this.flashes[i].life -= dt;\n      if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);\n    }\n    // THE DISSOLUTION GRAMMAR's break records age on the same beat (zero\n    // cost while none stand — the common case).\n    for (let i = this.dissolves.length - 1; i >= 0; i--) {\n      this.dissolves[i].life -= dt;\n      if (this.dissolves[i].life <= 0) this.dissolves.splice(i, 1);\n    }\n    // THE EMERGENCE GRAMMAR's arrivals age on the same beat; an expired hold\n    // RELEASES its body (targetable + thinking again — drawn == tested).\n    if (this.emergences.length) this.updateEmergences(dt);\n    // THE FLOOR PRE-CRACK rows retire at their plant clock (the view drops\n    // them too — this keeps a headless world tidy; gated on the empty case).\n    if (this.dissolveFloorCracks.length) {\n      for (let i = this.dissolveFloorCracks.length - 1; i >= 0; i--) {\n        if (this.time >= this.dissolveFloorCracks[i].until) this.dissolveFloorCracks.splice(i, 1);\n      }\n    }\n\n    // Sweep the dead (keep every player-kind seat — the local hero for the death\n    // screen, and downed/dead co-op allies so they can still be revived / linger).\n    this.actors = this.actors.filter(a => !a.dead || a.isPlayerKind());",
      "sourceSha256": "9f97a1bc1089fa6a6d9c727031d50fbe2a0f319172ac4dcf07f7229a01bfaf8b",
      "output": "export function sceneFrameLateBodies(nativeHost:NativeSceneFrameHost,dt:number):void {\nnativeHost.updateCarriers(dt);\n    // THE LATCH slave step LAST among movers — the seat wins the frame\n    // (drawn == held; engine/cling.ts).\n    nativeHost.updateClings();\n    // THE GRAB sweep rides right behind it (engine/grab.ts): the release\n    // ladder, then the held body's seat wins ITS frame the same way.\n    nativeHost.updateGrabs(dt);\n    // THE MOUNT sweep rides behind the grabs (engine/mounts.ts): pairing,\n    // then the saddle pin — after the grab ladder so a grip landed THIS\n    // frame tears its rider from the saddle this frame, and the remaining\n    // riders' seats still win the frame.\n    nativeHost.updateMounts();\n    nativeHost.updateSummonShells();\n    updateMovementTethers(nativeHost, dt); // movementTether wins after body displacement\n    updateEncounterGroups(nativeHost.actors);\n    updateEncounterCombat(nativeHost);\n    // THE POSSESSION SEAM sweep rides behind the grabs (engine/possess.ts):\n    // the ride clock + the husk ladder — a hold landed on the husk THIS\n    // frame is seen this frame.\n    nativeHost.updatePossessions(dt);\n    // THE WATCH FABRIC's behavior sweep (engine/watch.ts) rides just ahead\n    // of the tells: rung cache, stand-downs, the scanning gaze and the\n    // tracker's nose all settle, THEN the worn gauges read them — a tell\n    // never shows last frame's ladder.\n    nativeHost.updateWatch();\n    // THE RESERVE FABRIC's sweep (engine/reserves.ts) rides beside it, and\n    // for the same reason: the burn, the leak, the recovery and the vent\n    // windows all settle BEFORE the gauges read them, so a bladder never\n    // draws last frame's breath. Its travel odometer also wants every\n    // mover to have finished moving.\n    nativeHost.updateReserves();\n    // THE PACK SWEEP (engine/pack.ts) — the social folds (a warden's court,\n    // a squad's shared appetite, a ward's guardian) settle here, AFTER the\n    // bond scan and the movers, BEFORE the gauges that read them.\n    nativeHost.updatePack();\n    // THE TELL FABRIC's value sweep (engine/tells.ts) — after every mover\n    // and state machine has spoken for the frame, the worn gauges read.\n    nativeHost.updateTells();\n    // THE COUCH EDGE LAW dead last among movers: whatever moved a local hero\n    // this frame — intent, dash, shove, carrier — the shared frame's wall\n    // answers it (no-op outside couch play; see couchConfine).\n    nativeHost.applyCouchConfine();\n\n    // Corpses decay\n    for (let i = nativeHost.corpses.length - 1; i >= 0; i--) {\n      nativeHost.corpses[i].remaining -= dt;\n      nativeHost.corpses[i].tier ??= nativeHost.spoilStoryAt(nativeHost.corpses[i].pos); // THE SPOILS STORY, settled once\n      if (nativeHost.corpses[i].remaining <= 0) nativeHost.corpses.splice(i, 1);\n    }\n\n    // Texts & flashes\n    for (let i = nativeHost.texts.length - 1; i >= 0; i--) {\n      const t = nativeHost.texts[i];\n      t.life -= dt; t.pos.y -= 28 * dt;\n      if (t.life <= 0) nativeHost.texts.splice(i, 1);\n    }\n    // The INFO-STREAM feeds age on the same beat (world clock — a held menu\n    // freezes the news mid-breath; the caps live in the fabric's own laws).\n    pruneNotices(nativeHost.notices, nativeHost.time);\n    prunePickupFeed(nativeHost.pickupFeed, nativeHost.time);\n    for (let i = nativeHost.flashes.length - 1; i >= 0; i--) {\n      nativeHost.flashes[i].life -= dt;\n      if (nativeHost.flashes[i].life <= 0) nativeHost.flashes.splice(i, 1);\n    }\n    // THE DISSOLUTION GRAMMAR's break records age on the same beat (zero\n    // cost while none stand — the common case).\n    for (let i = nativeHost.dissolves.length - 1; i >= 0; i--) {\n      nativeHost.dissolves[i].life -= dt;\n      if (nativeHost.dissolves[i].life <= 0) nativeHost.dissolves.splice(i, 1);\n    }\n    // THE EMERGENCE GRAMMAR's arrivals age on the same beat; an expired hold\n    // RELEASES its body (targetable + thinking again — drawn == tested).\n    if (nativeHost.emergences.length) nativeHost.updateEmergences(dt);\n    // THE FLOOR PRE-CRACK rows retire at their plant clock (the view drops\n    // them too — this keeps a headless world tidy; gated on the empty case).\n    if (nativeHost.dissolveFloorCracks.length) {\n      for (let i = nativeHost.dissolveFloorCracks.length - 1; i >= 0; i--) {\n        if (nativeHost.time >= nativeHost.dissolveFloorCracks[i].until) nativeHost.dissolveFloorCracks.splice(i, 1);\n      }\n    }\n\n    // Sweep the dead (keep every player-kind seat — the local hero for the death\n    // screen, and downed/dead co-op allies so they can still be revived / linger).\n    nativeHost.actors = nativeHost.actors.filter(a => !a.dead || a.isPlayerKind());\n}\n",
      "statementIndices": [
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        219,
        220,
        221,
        222,
        223,
        224,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232
      ],
      "firstLine": 43651,
      "lastLine": 43734,
      "outputSha256": "c12ca0549f2e978760a67dd3ea0bede75cd257d89dcf38dc0984b3ea5f86692d"
    }
  ],
  "helpers": [
    {
      "name": "DashConjureStash",
      "source": "interface DashConjureStash {\n  radius: number;\n  duration: number;\n  grants: readonly ConjureGrant[];\n  look?: string;\n}",
      "output": "export interface DashConjureStash {\n  radius: number;\n  duration: number;\n  grants: readonly ConjureGrant[];\n  look?: string;\n}",
      "sha256": "73ca222d23d725829c6d7d4f436be36ac60136e63eece585906236c5b283f2ca"
    },
    {
      "name": "speedLingerMul",
      "source": "function speedLingerMul(\n  spec: { ref: number; exp?: number; min?: number; max?: number } | undefined,\n  speed: number,\n): number {\n  if (!spec) return 1;\n  const raw = Math.pow(Math.max(1, speed) / Math.max(1, spec.ref), spec.exp ?? 1);\n  return Math.min(spec.max ?? 4, Math.max(spec.min ?? 0.25, raw));\n}",
      "output": "export function speedLingerMul(\n  spec: { ref: number; exp?: number; min?: number; max?: number } | undefined,\n  speed: number,\n): number {\n  if (!spec) return 1;\n  const raw = Math.pow(Math.max(1, speed) / Math.max(1, spec.ref), spec.exp ?? 1);\n  return Math.min(spec.max ?? 4, Math.max(spec.min ?? 0.25, raw));\n}",
      "sha256": "8169e6e66bbe04e132b1d1734d6becfb639757476d99fdf8e7daaefa5dc3eeba"
    }
  ],
  "properties": [
    {
      "name": "accumulateDotText",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "actorById",
      "groups": [
        "preActors",
        "actors"
      ],
      "writes": []
    },
    {
      "name": "actorGridRev",
      "groups": [
        "effects"
      ],
      "writes": [
        43583
      ]
    },
    {
      "name": "actors",
      "groups": [
        "actors",
        "effects",
        "lateBodies"
      ],
      "writes": [
        43734
      ]
    },
    {
      "name": "actorTurnRate",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "applyCouchConfine",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "applyDeedDot",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "assaults",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "bankDamageTakenTriggers",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "bossRun",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "burstDamage",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "checkMinionDetonations",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "clampPos",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "collectDeedDot",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "companionBonds",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "conjurationLifeline",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "conjureCloud",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "conjured",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "corpses",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "createMonster",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "creep",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "cScratch",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "deedDotAmounts",
      "groups": [
        "actors"
      ],
      "writes": [
        42774
      ]
    },
    {
      "name": "deedEnemy",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "dissolveFloorCracks",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "dissolves",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "doodads",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "dropLingerField",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "echoSympathy",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "emergeBody",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "emergences",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "endCarom",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "enemiesOf",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "executeSkill",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "explodeActor",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "flashes",
      "groups": [
        "actors",
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "grabRelease",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "grabSeize",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "grantedTrailMemory",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "guardBash",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "hasDeedEnemyNearby",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "hatchPod",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "kill",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "lockHint",
      "groups": [
        "preActors"
      ],
      "writes": [
        42661
      ]
    },
    {
      "name": "materializeLiveZoneEvents",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "metaProgressionActive",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "mintTrailPatch",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "moveBlast",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "movementMoment",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "noteMovementTravel",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "notices",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "orbs",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "pickupFeed",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "plantVent",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "player",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "promoteCommandThrong",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "pushActor",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "refreshAuroras",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "refreshCreepers",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "refreshGuardians",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "refreshMagicPacks",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "refreshSatellites",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "relayStatus",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "releaseContract",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "releasePrimedPours",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "resolveBoundary",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "resolveHit",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "resolveImpactHit",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "rollCollisionProcs",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "rollGainProcs",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "rollOwnProcs",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "ruptureStatus",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "seatOf",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "seats",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "separateActors",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "shake",
      "groups": [
        "preActors"
      ],
      "writes": [
        42630
      ]
    },
    {
      "name": "shedOrb",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "showCompanionCue",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "spoilStoryAt",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "springAmbush",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "stepBurrow",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "steppedClamp",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "strikeSurfaces",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "sweepBodySlam",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "sweepDefenseEvents",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "sweepTalentEvents",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "syncPocketGrants",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "syncZoneExits",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "text",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "texts",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "time",
      "groups": [
        "actors",
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "timeflow",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "updateActorLedgers",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "updateAltars",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateAmbushes",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateArenaCrowd",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateAttunements",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateAuras",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateBoss",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateBrittle",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateCarriers",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateCasting",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "updateCharRegrowth",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateChests",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateClings",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateCollapse",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateCompanionGrants",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateConstructs",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateCreep",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateCreepHearts",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateDeathBursts",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateDetonations",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateDischarges",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateDoodadEffects",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateDrops",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateEmergences",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateEncounters",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateEnemyTethers",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateEvaporation",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateFlux",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateFog",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateFollowUps",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateFractures",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateGaze",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateGeysers",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateGrabs",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateGrantedTrails",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "updateHivecall",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateHoldfastSite",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateHunt",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateIncursionEvents",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateLeaps",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateLite",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateMinionMeta",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateMounts",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateObjective",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateOccurrences",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateOrbs",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePack",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateParts",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePendingBlinks",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePendingBursts",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePendingContagions",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePendingMetas",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updatePendingPersists",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updatePendingRespawns",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePendingSummons",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePossessions",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateProjectiles",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updatePuzzles",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateRampage",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateRemnants",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateRepeats",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateReplenishment",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateReserves",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateRitualSite",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateScaldHeat",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateScorch",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateShrines",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSnow",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSoulriver",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSpans",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSquish",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateStrobes",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSummonContracts",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSummonReforms",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateSummonShells",
      "groups": [
        "effects",
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateTells",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateTempGrounds",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateTerraforms",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateTerrainEffects",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateTethers",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateTheater",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateThrong",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateThrongEvolution",
      "groups": [
        "preActors"
      ],
      "writes": []
    },
    {
      "name": "updateTracks",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateTrapworks",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateVentDwellers",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateVents",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateWatch",
      "groups": [
        "lateBodies"
      ],
      "writes": []
    },
    {
      "name": "updateWeatherDress",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateWetSky",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateWindchill",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateWindPush",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateWorms",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "updateZones",
      "groups": [
        "effects"
      ],
      "writes": []
    },
    {
      "name": "viewRectFor",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "walk",
      "groups": [
        "actors"
      ],
      "writes": []
    },
    {
      "name": "zone",
      "groups": [
        "actors"
      ],
      "writes": []
    }
  ],
  "calls": [
    {
      "group": "preActors",
      "name": "syncZoneExits",
      "line": 42616,
      "source": "this.syncZoneExits()"
    },
    {
      "group": "preActors",
      "name": "materializeLiveZoneEvents",
      "line": 42621,
      "source": "this.materializeLiveZoneEvents()"
    },
    {
      "group": "preActors",
      "name": "updateObjective",
      "line": 42623,
      "source": "this.updateObjective(dt)"
    },
    {
      "group": "preActors",
      "name": "updatePuzzles",
      "line": 42624,
      "source": "this.updatePuzzles(dt)"
    },
    {
      "group": "preActors",
      "name": "updateOccurrences",
      "line": 42625,
      "source": "this.updateOccurrences(dt)"
    },
    {
      "group": "preActors",
      "name": "updateEncounters",
      "line": 42626,
      "source": "this.updateEncounters(dt)"
    },
    {
      "group": "preActors",
      "name": "updateHunt",
      "line": 42627,
      "source": "this.updateHunt(dt)"
    },
    {
      "group": "preActors",
      "name": "updateFractures",
      "line": 42628,
      "source": "this.updateFractures(dt)"
    },
    {
      "group": "preActors",
      "name": "updateBoss",
      "line": 42629,
      "source": "this.updateBoss()"
    },
    {
      "group": "preActors",
      "name": "updateRitualSite",
      "line": 42631,
      "source": "this.updateRitualSite()"
    },
    {
      "group": "preActors",
      "name": "updateHoldfastSite",
      "line": 42632,
      "source": "this.updateHoldfastSite()"
    },
    {
      "group": "preActors",
      "name": "updateIncursionEvents",
      "line": 42633,
      "source": "this.updateIncursionEvents(dt)"
    },
    {
      "group": "preActors",
      "name": "updateRampage",
      "line": 42637,
      "source": "this.updateRampage(dt)"
    },
    {
      "group": "preActors",
      "name": "updateDoodadEffects",
      "line": 42638,
      "source": "this.updateDoodadEffects(dt)"
    },
    {
      "group": "preActors",
      "name": "updateArenaCrowd",
      "line": 42639,
      "source": "this.updateArenaCrowd()"
    },
    {
      "group": "preActors",
      "name": "updateAttunements",
      "line": 42640,
      "source": "this.updateAttunements(dt)"
    },
    {
      "group": "preActors",
      "name": "updateTerraforms",
      "line": 42641,
      "source": "this.updateTerraforms(dt)"
    },
    {
      "group": "preActors",
      "name": "updateTheater",
      "line": 42642,
      "source": "this.updateTheater(dt)"
    },
    {
      "group": "preActors",
      "name": "updateRepeats",
      "line": 42643,
      "source": "this.updateRepeats(dt)"
    },
    {
      "group": "preActors",
      "name": "updateAmbushes",
      "line": 42644,
      "source": "this.updateAmbushes()"
    },
    {
      "group": "preActors",
      "name": "updatePendingMetas",
      "line": 42645,
      "source": "this.updatePendingMetas(dt)"
    },
    {
      "group": "preActors",
      "name": "updatePendingPersists",
      "line": 42646,
      "source": "this.updatePendingPersists(dt)"
    },
    {
      "group": "preActors",
      "name": "updateMinionMeta",
      "line": 42647,
      "source": "this.updateMinionMeta(dt)"
    },
    {
      "group": "preActors",
      "name": "updateThrongEvolution",
      "line": 42648,
      "source": "this.updateThrongEvolution(dt)"
    },
    {
      "group": "preActors",
      "name": "updateHivecall",
      "line": 42649,
      "source": "this.updateHivecall(dt)"
    },
    {
      "group": "preActors",
      "name": "promoteCommandThrong",
      "line": 42652,
      "source": "this.promoteCommandThrong(seat.actor, host, 'minions', 200)"
    },
    {
      "group": "preActors",
      "name": "updateThrong",
      "line": 42655,
      "source": "this.updateThrong(dt)"
    },
    {
      "group": "preActors",
      "name": "updateLite",
      "line": 42656,
      "source": "this.updateLite(dt)"
    },
    {
      "group": "preActors",
      "name": "actorById",
      "line": 42658,
      "source": "this.actorById(id)"
    },
    {
      "group": "preActors",
      "name": "refreshMagicPacks",
      "line": 42664,
      "source": "this.refreshMagicPacks(dt)"
    },
    {
      "group": "actors",
      "name": "syncPocketGrants",
      "line": 42671,
      "source": "this.syncPocketGrants(a)"
    },
    {
      "group": "actors",
      "name": "updateGrantedTrails",
      "line": 42673,
      "source": "this.updateGrantedTrails(a)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 42698,
      "source": "this.kill(a)"
    },
    {
      "group": "actors",
      "name": "showCompanionCue",
      "line": 42699,
      "source": "this.showCompanionCue(a, 'unravel')"
    },
    {
      "group": "actors",
      "name": "explodeActor",
      "line": 42721,
      "source": "this.explodeActor(a, power, { type: BLOOM_CFG.type, color: BLOOM_CFG.color, recoveryCue: 'companion_bloom' })"
    },
    {
      "group": "actors",
      "name": "releaseContract",
      "line": 42722,
      "source": "this.releaseContract(a, true)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 42723,
      "source": "this.kill(a, !a.expiryTriggersDeath)"
    },
    {
      "group": "actors",
      "name": "explodeActor",
      "line": 42735,
      "source": "this.explodeActor(a, a.explodeOnDeath)"
    },
    {
      "group": "actors",
      "name": "guardBash",
      "line": 42743,
      "source": "this.guardBash(a, a.summonInst, { ...eBash, arcDeg: 360 }, a.life)"
    },
    {
      "group": "actors",
      "name": "hatchPod",
      "line": 42748,
      "source": "this.hatchPod(a)"
    },
    {
      "group": "actors",
      "name": "releaseContract",
      "line": 42749,
      "source": "this.releaseContract(a, true)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 42753,
      "source": "this.kill(a, !a.expiryTriggersDeath, undefined, 'expire')"
    },
    {
      "group": "actors",
      "name": "shedOrb",
      "line": 42769,
      "source": "this.shedOrb(id, a.pos, { scatter: ORB_TRICKLE.scatter, tier: a.tier })"
    },
    {
      "group": "actors",
      "name": "metaProgressionActive",
      "line": 42775,
      "source": "this.metaProgressionActive()"
    },
    {
      "group": "actors",
      "name": "deedEnemy",
      "line": 42776,
      "source": "this.deedEnemy(a)"
    },
    {
      "group": "actors",
      "name": "hasDeedEnemyNearby",
      "line": 42776,
      "source": "this.hasDeedEnemyNearby()"
    },
    {
      "group": "actors",
      "name": "applyDeedDot",
      "line": 42808,
      "source": "this.applyDeedDot(a, amt, ty as DamageType | 'untyped')"
    },
    {
      "group": "actors",
      "name": "accumulateDotText",
      "line": 42810,
      "source": "this.accumulateDotText(a, raw, dt, 'afflictions')"
    },
    {
      "group": "actors",
      "name": "rollOwnProcs",
      "line": 42814,
      "source": "this.rollOwnProcs(a, 'esBreak')"
    },
    {
      "group": "actors",
      "name": "bankDamageTakenTriggers",
      "line": 42819,
      "source": "this.bankDamageTakenTriggers(a, raw)"
    },
    {
      "group": "actors",
      "name": "releasePrimedPours",
      "line": 42823,
      "source": "this.releasePrimedPours(a)"
    },
    {
      "group": "actors",
      "name": "sweepDefenseEvents",
      "line": 42830,
      "source": "this.sweepDefenseEvents(a)"
    },
    {
      "group": "actors",
      "name": "sweepTalentEvents",
      "line": 42839,
      "source": "this.sweepTalentEvents(a)"
    },
    {
      "group": "actors",
      "name": "rollGainProcs",
      "line": 42844,
      "source": "this.rollGainProcs(a, ev)"
    },
    {
      "group": "actors",
      "name": "echoSympathy",
      "line": 42848,
      "source": "this.echoSympathy(a, ev)"
    },
    {
      "group": "actors",
      "name": "createMonster",
      "line": 42866,
      "source": "this.createMonster(s.brood.monsterId, owner.level, owner.team, owner)"
    },
    {
      "group": "actors",
      "name": "conjurationLifeline",
      "line": 42873,
      "source": "this.conjurationLifeline(owner)"
    },
    {
      "group": "actors",
      "name": "clampPos",
      "line": 42875,
      "source": "this.clampPos(\n          vec(a.pos.x + rand(-24, 24), a.pos.y + rand(-24, 24)), hatch.radius)"
    },
    {
      "group": "actors",
      "name": "emergeBody",
      "line": 42878,
      "source": "this.emergeBody(hatch, { host: true })"
    },
    {
      "group": "actors",
      "name": "enemiesOf",
      "line": 42920,
      "source": "this.enemiesOf(a)"
    },
    {
      "group": "actors",
      "name": "springAmbush",
      "line": 42923,
      "source": "this.springAmbush(a)"
    },
    {
      "group": "actors",
      "name": "stepBurrow",
      "line": 42928,
      "source": "this.stepBurrow(a, dt)"
    },
    {
      "group": "actors",
      "name": "showCompanionCue",
      "line": 42964,
      "source": "this.showCompanionCue(a, 'sever', companionCueFrom)"
    },
    {
      "group": "actors",
      "name": "text",
      "line": 43011,
      "source": "this.text(vec(a.pos.x, a.pos.y - 18), note,\n                held ? ROOTED_CFG.onColor : ROOTED_CFG.offColor, 11)"
    },
    {
      "group": "actors",
      "name": "actorTurnRate",
      "line": 43055,
      "source": "this.actorTurnRate(a)"
    },
    {
      "group": "actors",
      "name": "updateActorLedgers",
      "line": 43082,
      "source": "this.updateActorLedgers(a, dt)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 43085,
      "source": "this.kill(a)"
    },
    {
      "group": "actors",
      "name": "ruptureStatus",
      "line": 43089,
      "source": "this.ruptureStatus(a, s)"
    },
    {
      "group": "actors",
      "name": "accumulateDotText",
      "line": 43114,
      "source": "this.accumulateDotText(kin, taken, zn.interval)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 43115,
      "source": "this.kill(kin)"
    },
    {
      "group": "actors",
      "name": "text",
      "line": 43150,
      "source": "this.text(prey.pos, Math.round(taken).toString(), '#d84a9a', 12)"
    },
    {
      "group": "actors",
      "name": "kill",
      "line": 43151,
      "source": "this.kill(prey)"
    },
    {
      "group": "actors",
      "name": "burstDamage",
      "line": 43164,
      "source": "this.burstDamage(vec(a.pos.x, a.pos.y), iw.radius, amount,\n            'physical', iw.visualColor ?? '#c8c0a8', a.team, 0, undefined, undefined, skillSelfVoice('iron_ward', 'burst'))"
    },
    {
      "group": "actors",
      "name": "updateCasting",
      "line": 43174,
      "source": "this.updateCasting(a, dt)"
    },
    {
      "group": "actors",
      "name": "actorTurnRate",
      "line": 43178,
      "source": "this.actorTurnRate(a)"
    },
    {
      "group": "actors",
      "name": "seatOf",
      "line": 43181,
      "source": "this.seatOf(a)"
    },
    {
      "group": "actors",
      "name": "viewRectFor",
      "line": 43196,
      "source": "this.viewRectFor(a)"
    },
    {
      "group": "actors",
      "name": "steppedClamp",
      "line": 43204,
      "source": "this.steppedClamp(a, vec(\n          a.pos.x + Math.cos(a.dash.dir) * step,\n          a.pos.y + Math.sin(a.dash.dir) * step,\n        ), a.pos)"
    },
    {
      "group": "actors",
      "name": "noteMovementTravel",
      "line": 43209,
      "source": "this.noteMovementTravel(a, inst, visualFrom, 1 - a.dash.remaining / Math.max(.01,\n            inst.def.delivery.type === 'dash' ? inst.def.delivery.distance / a.dash.speed : 1))"
    },
    {
      "group": "actors",
      "name": "enemiesOf",
      "line": 43213,
      "source": "this.enemiesOf(a)"
    },
    {
      "group": "actors",
      "name": "resolveHit",
      "line": 43222,
      "source": "this.resolveHit(a, inst, enemy, inst.def.delivery.corridorScale ?? 1)"
    },
    {
      "group": "actors",
      "name": "grabSeize",
      "line": 43235,
      "source": "this.grabSeize(a, inst, enemy, carry.grab)"
    },
    {
      "group": "actors",
      "name": "strikeSurfaces",
      "line": 43251,
      "source": "this.strikeSurfaces(a, a.pos,\n            inst.def.delivery.width / 2 + a.radius, undefined, hits)"
    },
    {
      "group": "actors",
      "name": "conjureCloud",
      "line": 43269,
      "source": "this.conjureCloud(a.pos.x, a.pos.y, conjSpec.radius, conjSpec.duration, {\n              caster: a, grants: conjSpec.grants,\n              ...(conjSpec.look !== undefined ? { look: conjSpec.look } : {}),\n            })"
    },
    {
      "group": "actors",
      "name": "plantVent",
      "line": 43284,
      "source": "this.plantVent({ bank: ventSpec.bank, radius: ventSpec.radius, duration: ventSpec.duration },\n              vec(a.pos.x, a.pos.y), 1, 1, a.tier)"
    },
    {
      "group": "actors",
      "name": "mintTrailPatch",
      "line": 43294,
      "source": "this.mintTrailPatch(a, inst, trail, a.pos, a.dash.dir,\n              trail.duration * speedLingerMul(trail.durationBySpeed, a.dash.speed))"
    },
    {
      "group": "actors",
      "name": "actorById",
      "line": 43316,
      "source": "this.actorById(hold.id)"
    },
    {
      "group": "actors",
      "name": "grabRelease",
      "line": 43317,
      "source": "this.grabRelease(a)"
    },
    {
      "group": "actors",
      "name": "clampPos",
      "line": 43319,
      "source": "this.clampPos(vec(\n                  a.pos.x + Math.cos(a.dash.dir) * (a.radius + v.radius) * 0.9,\n                  a.pos.y + Math.sin(a.dash.dir) * (a.radius + v.radius) * 0.9), v.radius)"
    },
    {
      "group": "actors",
      "name": "pushActor",
      "line": 43323,
      "source": "this.pushActor(v, a.dash.dir,\n                  a.dash.speed * (carryD.shove ?? GRAB_CFG.runCarry.shoveFrac) / PUSH_DAMPING,\n                  a, inst, { noAuthority: true })"
    },
    {
      "group": "actors",
      "name": "movementMoment",
      "line": 43345,
      "source": "this.movementMoment(a, inst, 'arrive')"
    },
    {
      "group": "actors",
      "name": "moveBlast",
      "line": 43346,
      "source": "this.moveBlast(a, inst, a.pos)"
    },
    {
      "group": "actors",
      "name": "dropLingerField",
      "line": 43347,
      "source": "this.dropLingerField(a, inst, a.pos)"
    },
    {
      "group": "actors",
      "name": "guardBash",
      "line": 43354,
      "source": "this.guardBash(a, inst, dBash, BASH_CFG.poollessShield\n                * a.sheet.get('guardStrength',\n                  skillContextTags(inst, grantedTags(inst)), instanceMods(inst)))"
    },
    {
      "group": "actors",
      "name": "endCarom",
      "line": 43375,
      "source": "this.endCarom(a)"
    },
    {
      "group": "actors",
      "name": "steppedClamp",
      "line": 43382,
      "source": "this.steppedClamp(a, vec(a.pos.x + wantX, a.pos.y + wantY), a.pos)"
    },
    {
      "group": "actors",
      "name": "viewRectFor",
      "line": 43395,
      "source": "this.viewRectFor(a)"
    },
    {
      "group": "actors",
      "name": "noteMovementTravel",
      "line": 43403,
      "source": "this.noteMovementTravel(a, inst, { x: beforeX, y: beforeY }, this.time % 1)"
    },
    {
      "group": "actors",
      "name": "movementMoment",
      "line": 43404,
      "source": "this.movementMoment(a, inst, 'bank')"
    },
    {
      "group": "actors",
      "name": "enemiesOf",
      "line": 43412,
      "source": "this.enemiesOf(a)"
    },
    {
      "group": "actors",
      "name": "resolveHit",
      "line": 43418,
      "source": "this.resolveHit(a, inst, enemy, spec?.contactScale ?? 1)"
    },
    {
      "group": "actors",
      "name": "strikeSurfaces",
      "line": 43422,
      "source": "this.strikeSurfaces(a, a.pos, reach, undefined, caromC.caromRung)"
    },
    {
      "group": "actors",
      "name": "mintTrailPatch",
      "line": 43453,
      "source": "this.mintTrailPatch(a, wt.walkTrail.inst, wt.walkTrail.spec, a.pos, a.facing)"
    },
    {
      "group": "actors",
      "name": "executeSkill",
      "line": 43471,
      "source": "this.executeSkill(a, a.wakeInst, vec(a.pos.x, a.pos.y), {\n                dmgMult: a.wake.dmgMult ?? 1,\n                noCooldown: true, noRepeat: true, keepFacing: true,\n              })"
    },
    {
      "group": "actors",
      "name": "clampPos",
      "line": 43505,
      "source": "this.clampPos(vec(\n          a.pos.x + p.vx * dt,\n          a.pos.y + p.vy * dt), a.radius, from, { out: sc, mover: a })"
    },
    {
      "group": "actors",
      "name": "sweepBodySlam",
      "line": 43513,
      "source": "this.sweepBodySlam(a, p, speed)"
    },
    {
      "group": "actors",
      "name": "resolveBoundary",
      "line": 43518,
      "source": "this.resolveBoundary(a, sc, from, true)"
    },
    {
      "group": "actors",
      "name": "clampPos",
      "line": 43541,
      "source": "this.clampPos(vec(rawX, rawY), a.radius, undefined, { mover: a })"
    },
    {
      "group": "actors",
      "name": "rollCollisionProcs",
      "line": 43549,
      "source": "this.rollCollisionProcs(p.caster, p.inst, a)"
    },
    {
      "group": "actors",
      "name": "resolveImpactHit",
      "line": 43555,
      "source": "this.resolveImpactHit(a, speed, p)"
    },
    {
      "group": "actors",
      "name": "steppedClamp",
      "line": 43567,
      "source": "this.steppedClamp(a, vec(a.pos.x + a.vel.x * dt, a.pos.y + a.vel.y * dt), a.pos)"
    },
    {
      "group": "effects",
      "name": "updateSummonShells",
      "line": 43582,
      "source": "this.updateSummonShells()"
    },
    {
      "group": "effects",
      "name": "updateTempGrounds",
      "line": 43585,
      "source": "this.updateTempGrounds(dt)"
    },
    {
      "group": "effects",
      "name": "updateEvaporation",
      "line": 43586,
      "source": "this.updateEvaporation(dt)"
    },
    {
      "group": "effects",
      "name": "updatePendingBursts",
      "line": 43587,
      "source": "this.updatePendingBursts()"
    },
    {
      "group": "effects",
      "name": "updatePendingContagions",
      "line": 43588,
      "source": "this.updatePendingContagions()"
    },
    {
      "group": "effects",
      "name": "updateTerrainEffects",
      "line": 43589,
      "source": "this.updateTerrainEffects(dt)"
    },
    {
      "group": "effects",
      "name": "updateScorch",
      "line": 43590,
      "source": "this.updateScorch(dt)"
    },
    {
      "group": "effects",
      "name": "updateWindchill",
      "line": 43591,
      "source": "this.updateWindchill(dt)"
    },
    {
      "group": "effects",
      "name": "updateGaze",
      "line": 43592,
      "source": "this.updateGaze(dt)"
    },
    {
      "group": "effects",
      "name": "updateFog",
      "line": 43593,
      "source": "this.updateFog(dt)"
    },
    {
      "group": "effects",
      "name": "updateWetSky",
      "line": 43594,
      "source": "this.updateWetSky(dt)"
    },
    {
      "group": "effects",
      "name": "updateCreep",
      "line": 43595,
      "source": "this.updateCreep(dt)"
    },
    {
      "group": "effects",
      "name": "updateCollapse",
      "line": 43596,
      "source": "this.updateCollapse(dt)"
    },
    {
      "group": "effects",
      "name": "updateFlux",
      "line": 43597,
      "source": "this.updateFlux(dt)"
    },
    {
      "group": "effects",
      "name": "updateSpans",
      "line": 43598,
      "source": "this.updateSpans(dt)"
    },
    {
      "group": "effects",
      "name": "updateTracks",
      "line": 43599,
      "source": "this.updateTracks(dt)"
    },
    {
      "group": "effects",
      "name": "updateGeysers",
      "line": 43600,
      "source": "this.updateGeysers(dt)"
    },
    {
      "group": "effects",
      "name": "updateVentDwellers",
      "line": 43601,
      "source": "this.updateVentDwellers(dt)"
    },
    {
      "group": "effects",
      "name": "updateScaldHeat",
      "line": 43602,
      "source": "this.updateScaldHeat(dt)"
    },
    {
      "group": "effects",
      "name": "updateCharRegrowth",
      "line": 43603,
      "source": "this.updateCharRegrowth(dt)"
    },
    {
      "group": "effects",
      "name": "updateSoulriver",
      "line": 43604,
      "source": "this.updateSoulriver(dt)"
    },
    {
      "group": "effects",
      "name": "updateTrapworks",
      "line": 43605,
      "source": "this.updateTrapworks(dt)"
    },
    {
      "group": "effects",
      "name": "updateShrines",
      "line": 43607,
      "source": "this.updateShrines()"
    },
    {
      "group": "effects",
      "name": "updateAltars",
      "line": 43608,
      "source": "this.updateAltars(dt)"
    },
    {
      "group": "effects",
      "name": "updateChests",
      "line": 43609,
      "source": "this.updateChests(dt)"
    },
    {
      "group": "effects",
      "name": "updateLeaps",
      "line": 43611,
      "source": "this.updateLeaps(dt)"
    },
    {
      "group": "effects",
      "name": "updateWorms",
      "line": 43612,
      "source": "this.updateWorms(dt)"
    },
    {
      "group": "effects",
      "name": "updateParts",
      "line": 43613,
      "source": "this.updateParts()"
    },
    {
      "group": "effects",
      "name": "updateCreepHearts",
      "line": 43614,
      "source": "this.updateCreepHearts()"
    },
    {
      "group": "effects",
      "name": "refreshSatellites",
      "line": 43615,
      "source": "this.refreshSatellites(dt)"
    },
    {
      "group": "effects",
      "name": "refreshAuroras",
      "line": 43616,
      "source": "this.refreshAuroras(dt)"
    },
    {
      "group": "effects",
      "name": "refreshGuardians",
      "line": 43617,
      "source": "this.refreshGuardians(dt)"
    },
    {
      "group": "effects",
      "name": "refreshCreepers",
      "line": 43618,
      "source": "this.refreshCreepers(dt)"
    },
    {
      "group": "effects",
      "name": "updateProjectiles",
      "line": 43619,
      "source": "this.updateProjectiles(dt)"
    },
    {
      "group": "effects",
      "name": "updateZones",
      "line": 43620,
      "source": "this.updateZones(dt)"
    },
    {
      "group": "effects",
      "name": "updateEnemyTethers",
      "line": 43621,
      "source": "this.updateEnemyTethers(dt)"
    },
    {
      "group": "effects",
      "name": "updateTethers",
      "line": 43622,
      "source": "this.updateTethers(dt)"
    },
    {
      "group": "effects",
      "name": "updateVents",
      "line": 43623,
      "source": "this.updateVents(dt)"
    },
    {
      "group": "effects",
      "name": "updateDischarges",
      "line": 43624,
      "source": "this.updateDischarges()"
    },
    {
      "group": "effects",
      "name": "updateConstructs",
      "line": 43625,
      "source": "this.updateConstructs(dt)"
    },
    {
      "group": "effects",
      "name": "updateAuras",
      "line": 43626,
      "source": "this.updateAuras(dt)"
    },
    {
      "group": "effects",
      "name": "updateStrobes",
      "line": 43627,
      "source": "this.updateStrobes(dt)"
    },
    {
      "group": "effects",
      "name": "updateDetonations",
      "line": 43628,
      "source": "this.updateDetonations(dt)"
    },
    {
      "group": "effects",
      "name": "updateFollowUps",
      "line": 43629,
      "source": "this.updateFollowUps(dt)"
    },
    {
      "group": "effects",
      "name": "updateDeathBursts",
      "line": 43630,
      "source": "this.updateDeathBursts(dt)"
    },
    {
      "group": "effects",
      "name": "updatePendingSummons",
      "line": 43631,
      "source": "this.updatePendingSummons(dt)"
    },
    {
      "group": "effects",
      "name": "updatePendingRespawns",
      "line": 43632,
      "source": "this.updatePendingRespawns(dt)"
    },
    {
      "group": "effects",
      "name": "updateSummonContracts",
      "line": 43633,
      "source": "this.updateSummonContracts()"
    },
    {
      "group": "effects",
      "name": "updateSummonReforms",
      "line": 43634,
      "source": "this.updateSummonReforms(dt)"
    },
    {
      "group": "effects",
      "name": "updateCompanionGrants",
      "line": 43635,
      "source": "this.updateCompanionGrants(dt)"
    },
    {
      "group": "effects",
      "name": "updateReplenishment",
      "line": 43636,
      "source": "this.updateReplenishment(dt)"
    },
    {
      "group": "effects",
      "name": "updatePendingBlinks",
      "line": 43637,
      "source": "this.updatePendingBlinks(dt)"
    },
    {
      "group": "effects",
      "name": "checkMinionDetonations",
      "line": 43638,
      "source": "this.checkMinionDetonations()"
    },
    {
      "group": "effects",
      "name": "separateActors",
      "line": 43639,
      "source": "this.separateActors()"
    },
    {
      "group": "effects",
      "name": "updateSquish",
      "line": 43640,
      "source": "this.updateSquish()"
    },
    {
      "group": "effects",
      "name": "updateWindPush",
      "line": 43641,
      "source": "this.updateWindPush(dt)"
    },
    {
      "group": "effects",
      "name": "updateBrittle",
      "line": 43642,
      "source": "this.updateBrittle(dt)"
    },
    {
      "group": "effects",
      "name": "updateSnow",
      "line": 43643,
      "source": "this.updateSnow(dt)"
    },
    {
      "group": "effects",
      "name": "updateWeatherDress",
      "line": 43644,
      "source": "this.updateWeatherDress(dt)"
    },
    {
      "group": "effects",
      "name": "updateDrops",
      "line": 43645,
      "source": "this.updateDrops(dt)"
    },
    {
      "group": "effects",
      "name": "updateOrbs",
      "line": 43646,
      "source": "this.updateOrbs(dt)"
    },
    {
      "group": "effects",
      "name": "updateRemnants",
      "line": 43647,
      "source": "this.updateRemnants(dt)"
    },
    {
      "group": "lateBodies",
      "name": "updateCarriers",
      "line": 43651,
      "source": "this.updateCarriers(dt)"
    },
    {
      "group": "lateBodies",
      "name": "updateClings",
      "line": 43654,
      "source": "this.updateClings()"
    },
    {
      "group": "lateBodies",
      "name": "updateGrabs",
      "line": 43657,
      "source": "this.updateGrabs(dt)"
    },
    {
      "group": "lateBodies",
      "name": "updateMounts",
      "line": 43662,
      "source": "this.updateMounts()"
    },
    {
      "group": "lateBodies",
      "name": "updateSummonShells",
      "line": 43663,
      "source": "this.updateSummonShells()"
    },
    {
      "group": "lateBodies",
      "name": "updatePossessions",
      "line": 43670,
      "source": "this.updatePossessions(dt)"
    },
    {
      "group": "lateBodies",
      "name": "updateWatch",
      "line": 43675,
      "source": "this.updateWatch()"
    },
    {
      "group": "lateBodies",
      "name": "updateReserves",
      "line": 43681,
      "source": "this.updateReserves()"
    },
    {
      "group": "lateBodies",
      "name": "updatePack",
      "line": 43685,
      "source": "this.updatePack()"
    },
    {
      "group": "lateBodies",
      "name": "updateTells",
      "line": 43688,
      "source": "this.updateTells()"
    },
    {
      "group": "lateBodies",
      "name": "applyCouchConfine",
      "line": 43692,
      "source": "this.applyCouchConfine()"
    },
    {
      "group": "lateBodies",
      "name": "spoilStoryAt",
      "line": 43697,
      "source": "this.spoilStoryAt(this.corpses[i].pos)"
    },
    {
      "group": "lateBodies",
      "name": "updateEmergences",
      "line": 43723,
      "source": "this.updateEmergences(dt)"
    }
  ]
} as const;
