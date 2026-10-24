/** Original native frame groups, exact statement partitions and explicit ownership/type seams. */
export const nativeCampaignFrameArchive={
  "pin": "42f95716294995cbdd83785f0a0782ddda971f76",
  "worldHash": "8e0d385e1bb4e0a80a13e64a964c5d5f6be2941e342e35645dbf5d91d1caf398",
  "files": [
    {
      "file": "src/engine/nativeSceneCampaignFrame.ts",
      "sha256": "f30bdadf7e3ab54d8b97113e4756425f5ad475a822b9181ee42df6f3237c71c5",
      "functions": [
        {
          "name": "sceneNativeFrameBegin",
          "source": "export function sceneNativeFrameBegin(nativeFrame:NativeFrameBeginHost,dt: number):NativeFrameTiming|undefined {\n    if (!nativeFrame.gameOver && !nativeFrame.nativeWorldReady()) return;\n    const doorPressIntents = nativeFrame.doorPressIntents;\n    nativeFrame.doorPressIntents = null;\n    if (nativeFrame.gameOver) {\n      // Continue the visual aftermath on raw seconds, even under a stale menu\n      // hold. Never re-enter combat, AI, rewards, respawns, or input handling.\n      if (nativeFrame.deathPresentation && !deathPresentationPose(nativeFrame.deathPresentation.elapsed).complete) {\n        const step = Math.max(0, dt);\n        nativeFrame.deathPresentation.elapsed += step;\n        nativeFrame.screenFade = deathPresentationPose(nativeFrame.deathPresentation.elapsed).fade;\n        nativeFrame.time += step; // ambient painters keep breathing behind the epilogue\n        for (let i = nativeFrame.flashes.length - 1; i >= 0; i--) {\n          nativeFrame.flashes[i].life -= step;\n          if (nativeFrame.flashes[i].life <= 0) nativeFrame.flashes.splice(i, 1);\n        }\n        for (let i = nativeFrame.texts.length - 1; i >= 0; i--) {\n          nativeFrame.texts[i].life -= step;\n          nativeFrame.texts[i].pos.y -= 28 * step;\n          if (nativeFrame.texts[i].life <= 0) nativeFrame.texts.splice(i, 1);\n        }\n      }\n      return;\n    }\n    // THE TIMEFLOW GATE (engine/timeflow.ts): holds age on RAW seconds\n    // first (a freeze must be able to expire out of the very clock it\n    // stops), then the folded WORLD scale bends this whole frame — 0 holds\n    // the world (the pause menu, an Ultimatum-style choice), fractions are\n    // world slow-motion. A held world still RENDERS (the loop keeps\n    // drawing); it just stops mutating, wholesale and drift-free.\n    const rawDt = dt;\n    dt *= nativeFrame.timeflow.beginFrame(rawDt);\n    // THE EYECATCH sweep: a spent pane is nulled a beat after it ends, so\n    // the co-op wire never ships a stale row forever (engine/ultimates.ts).\n    if (nativeFrame.eyecatch\n      && eyecatchElapsed(nativeFrame.eyecatch, nativeFrame.timeflow.age)\n        > nativeFrame.eyecatch.paneSec + ULT_CFG.expireSlackSec) {\n      nativeFrame.eyecatch = null;\n    }\n    return {dt,rawDt,doorPressIntents};\n}"
        },
        {
          "name": "sceneNativeFrameRawArea",
          "source": "export function sceneNativeFrameRawArea(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    steps.sceneNativeFrameStep007(nativeFrame,rawDt,dt);\n    steps.sceneNativeFrameStep008(nativeFrame,rawDt,dt);\n}"
        },
        {
          "name": "sceneNativeFrameClock",
          "source": "export function sceneNativeFrameClock(nativeFrame:NativeFrameClockHost,dt:number):boolean {\n    if (dt <= 0) return false;\n    nativeFrame.time += dt;\n    return true;\n}"
        },
        {
          "name": "sceneNativeFramePrepare",
          "source": "export function sceneNativeFramePrepare(nativeFrame:NativeFramePrepareHost):void {\n    for (const a of nativeFrame.actors) if (!a.dead) ensureMovementTether(a);\n    // Fresh actor-grid epoch: the AI phase just moved monsters (kernels call\n    // moveActor directly), so spatial queries from here read current bodies.\n    nativeFrame.actorGridRev++;\n    // Walk-field tick housekeeping (the WalkField seam): resets the stale\n    // path-field refresh budget on whichever grid is steering feet this zone\n    // (the layout's own, or the convex nav rake).\n    nativeFrame.walk?.beginFrame?.();\n    nativeFrame.updateMassRuntimeFrame();\n    nativeFrame.convexNav?.beginFrame?.();\n}"
        },
        {
          "name": "sceneNativeFramePendingTransitions",
          "source": "export function sceneNativeFramePendingTransitions(nativeFrame:NativeFramePendingTransitionsHost,dt:number):boolean {\n    // A survived death's fade/wake sequence (character modes). The world keeps\n    // simulating beneath the dark — the death itself was already banked.\n    const massBeforeTransition = nativeFrame.massRuntime;\n    if (nativeFrame.pendingRespawn) nativeFrame.updateModeRespawn(dt);\n    // A live VERTICAL CROSSING (geyser launch / cloud fall): the traversal\n    // owns the player until the veil clears; the world keeps simulating.\n    if (nativeFrame.traversal) nativeFrame.updateTraversal(dt);\n    if (nativeFrame.massRuntime !== massBeforeTransition && !nativeFrame.nativeWorldReady()) return false;\n    return true;\n}"
        },
        {
          "name": "sceneNativeFrameFades",
          "source": "export function sceneNativeFrameFades(nativeFrame:NativeFrameFadesHost,dt:number):void {\n    if (nativeFrame.lowLifeHitFlash > 0) nativeFrame.lowLifeHitFlash = Math.max(0, nativeFrame.lowLifeHitFlash - dt);\n    if (nativeFrame.mireilleXpBuff > 0) nativeFrame.mireilleXpBuff = Math.max(0, nativeFrame.mireilleXpBuff - dt);\n}"
        },
        {
          "name": "sceneNativeFrameInteractionsBeforeHarbor",
          "source": "export function sceneNativeFrameInteractionsBeforeHarbor(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    steps.sceneNativeFrameStep022(nativeFrame,dt);\n    steps.sceneNativeFrameStep023(nativeFrame,dt);\n    steps.sceneNativeFrameStep024(nativeFrame,dt);\n    steps.sceneNativeFrameStep025(nativeFrame,dt);\n    steps.sceneNativeFrameStep026(nativeFrame,dt);\n    steps.sceneNativeFrameStep027(nativeFrame,dt);\n    steps.sceneNativeFrameStep028(nativeFrame,dt);\n    steps.sceneNativeFrameStep029(nativeFrame,dt);\n    steps.sceneNativeFrameStep030(nativeFrame,dt);\n    steps.sceneNativeFrameStep031(nativeFrame,dt);\n    steps.sceneNativeFrameStep032(nativeFrame,dt);\n    steps.sceneNativeFrameStep033(nativeFrame,dt);\n    steps.sceneNativeFrameStep034(nativeFrame,dt);\n    steps.sceneNativeFrameStep035(nativeFrame,dt);\n    steps.sceneNativeFrameStep036(nativeFrame,dt);\n    steps.sceneNativeFrameStep037(nativeFrame,dt);\n    steps.sceneNativeFrameStep038(nativeFrame,dt);\n}"
        },
        {
          "name": "sceneNativeFrameHarborholds",
          "source": "export function sceneNativeFrameHarborholds(nativeFrame:NativeFrameHarborholdsHost):void {\n    nativeFrame.updateHarborholds();\n}"
        },
        {
          "name": "sceneNativeFrameInteractionsAfterHarbor",
          "source": "export function sceneNativeFrameInteractionsAfterHarbor(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    steps.sceneNativeFrameStep040(nativeFrame,dt);\n    steps.sceneNativeFrameStep041(nativeFrame,dt);\n    steps.sceneNativeFrameStep042(nativeFrame,dt);\n    steps.sceneNativeFrameStep043(nativeFrame,dt);\n    steps.sceneNativeFrameStep044(nativeFrame,dt);\n    steps.sceneNativeFrameStep045(nativeFrame,dt);\n    steps.sceneNativeFrameStep046(nativeFrame,dt);\n    steps.sceneNativeFrameStep047(nativeFrame,dt);\n    steps.sceneNativeFrameStep048(nativeFrame,dt);\n    steps.sceneNativeFrameStep049(nativeFrame,dt);\n    steps.sceneNativeFrameStep050(nativeFrame,dt);\n    steps.sceneNativeFrameStep051(nativeFrame,dt);\n    steps.sceneNativeFrameStep052(nativeFrame,dt);\n    steps.sceneNativeFrameStep053(nativeFrame,dt);\n    steps.sceneNativeFrameStep054(nativeFrame,dt);\n    steps.sceneNativeFrameStep055(nativeFrame,dt);\n}"
        },
        {
          "name": "sceneNativeFrameWipe",
          "source": "export function sceneNativeFrameWipe(nativeFrame:NativeFrameWipeHost):void {\n    // ALL-DOWN terminator: once no seat is left standing, the wipe concludes\n    // (per mode: resurface / respawn / run over). Guarded on !gameOver so\n    // single-player — where onPlayerDown already concluded this same frame —\n    // never double-fires, and on !pendingRespawn so a mode respawn mid-fade\n    // (every seat still flagged dead until the wake) isn't re-concluded.\n    // THE SCENE COVENANT stands it down whole: on scripted ground the scene\n    // owns every fall — the reckoning's felled field lies DOWNED under the\n    // director's fade by design (engine/scenes.ts fellSeats), and its later\n    // stages stand the party back up; a wipe here would end a run that has\n    // not yet begun.\n    if (!nativeFrame.gameOver && !nativeFrame.pendingRespawn && !nativeFrame.scene && nativeFrame.seats.length > 0\n      && !nativeFrame.seats.some(s => !s.actor.dead && !s.actor.downed\n        && (!s.merc || MERC_CFG.mercsCanRevive))) {\n      for (const s of nativeFrame.seats) { s.actor.downed = false; s.actor.dead = true; }\n      nativeFrame.concludeWipe();\n    }\n}"
        },
        {
          "name": "sceneNativeFrameWorldRole",
          "source": "export function sceneNativeFrameWorldRole(nativeFrame:NativeFrameWorldRoleHost):boolean {\n\n    // MYCELIA: feed the bloom per-zone event activity (it can't reach the sim) BEFORE the\n    // overlay ticks, then reconcile the biome warps it has saturated.\n    // THE PRIMARY GATE (shard M1, engine/shardUnits.ts): a sim unit skips the\n    // keeper's world sweeps below (the keeper ticks first and drains every world\n    // queue); off a shard there is no link and every sweep runs as it always did.\n    const unitWorld = nativeFrame.shardWorld?.role === 'unit';\n    return unitWorld;\n}"
        },
        {
          "name": "sceneNativeFrameWorldSim",
          "source": "export function sceneNativeFrameWorldSim(nativeFrame:NativeFrameWorldSimHost,dt:number,unitWorld:boolean):void {\n    if (!unitWorld) nativeFrame.feedMyceliaActivity();\n    // Advance the living world (day/night, weather drift, faction territory).\n    if (!unitWorld) nativeFrame.sim.update(dt, nativeFrame.simView());\n    if (!unitWorld && !nativeFrame.massRuntime) nativeFrame.odyssey.update();\n}"
        },
        {
          "name": "sceneNativeFrameQuestRescues",
          "source": "export function sceneNativeFrameQuestRescues(nativeFrame:NativeFrameQuestRescuesHost):void { // worldmass places have not adopted graph campaign targets yet\n    nativeFrame.questRescues.update();\n}"
        },
        {
          "name": "sceneNativeFrameWorldLedger",
          "source": "export function sceneNativeFrameWorldLedger(nativeFrame:NativeFrameWorldLedgerHost,unitWorld:boolean):void {\n    // THE FORECHART: keep the veiled halo minted ahead of the walker, and grow\n    // any far soundings the overlays have requested (world/forechart.ts).\n    if (!unitWorld && nativeFrame.graphWorkAvailable()) nativeFrame.updateForechart();\n    // THE SETTLE SWEEP: mint-time settles are local — chained displacement\n    // can leave a pair past the hover floor across a pool edge; the slow\n    // whole-chart pass self-heals it (no-op scan on a clean chart).\n    if (!unitWorld) nativeFrame.updateWebSettle();\n    // THE OMENS: the world murmurs about what waits unfound (world/omens.ts).\n    if (!unitWorld) nativeFrame.updateOmens();\n    // THE OBJECTIVE WEB: a class earned mid-run lands mid-run.\n    if (!unitWorld) nativeFrame.updateDeedRecovery();\n    if (!unitWorld) nativeFrame.sweepClassClaims();\n    if (!unitWorld) nativeFrame.drainMyceliaLedger();\n}"
        },
        {
          "name": "sceneNativeFrameContagion",
          "source": "export function sceneNativeFrameContagion(nativeFrame:NativeFrameContagionHost):void {\n    nativeFrame.updateContagionInfection();\n}"
        },
        {
          "name": "sceneNativeFrameDeepwinter",
          "source": "export function sceneNativeFrameDeepwinter(nativeFrame:NativeFrameDeepwinterHost,unitWorld:boolean):void {\n    if (!unitWorld) nativeFrame.reconcileDeepwinter();\n}"
        },
        {
          "name": "sceneNativeFrameLocalStreams",
          "source": "export function sceneNativeFrameLocalStreams(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    steps.sceneNativeFrameStep070(nativeFrame,dt);\n    steps.sceneNativeFrameStep071(nativeFrame,dt);\n    steps.sceneNativeFrameStep072(nativeFrame,dt);\n    steps.sceneNativeFrameStep073(nativeFrame,dt);\n    steps.sceneNativeFrameStep074(nativeFrame,dt);\n    steps.sceneNativeFrameStep075(nativeFrame,dt);\n    steps.sceneNativeFrameStep076(nativeFrame,dt);\n    steps.sceneNativeFrameStep077(nativeFrame,dt);\n    steps.sceneNativeFrameStep078(nativeFrame,dt);\n    steps.sceneNativeFrameStep079(nativeFrame,dt);\n    steps.sceneNativeFrameStep080(nativeFrame,dt);\n    steps.sceneNativeFrameStep081(nativeFrame,dt);\n    steps.sceneNativeFrameStep082(nativeFrame,dt);\n    steps.sceneNativeFrameStep083(nativeFrame,dt);\n    steps.sceneNativeFrameStep084(nativeFrame,dt);\n    steps.sceneNativeFrameStep085(nativeFrame,dt);\n    steps.sceneNativeFrameStep086(nativeFrame,dt);\n    steps.sceneNativeFrameStep087(nativeFrame,dt);\n    steps.sceneNativeFrameStep088(nativeFrame,dt);\n    steps.sceneNativeFrameStep089(nativeFrame,dt);\n    steps.sceneNativeFrameStep090(nativeFrame,dt);\n    steps.sceneNativeFrameStep091(nativeFrame,dt);\n    steps.sceneNativeFrameStep092(nativeFrame,dt);\n}"
        },
        {
          "name": "sceneNativeFrameBulletins",
          "source": "export function sceneNativeFrameBulletins(nativeFrame:NativeFrameBulletinsHost,unitWorld:boolean):void {\n    // WORLD BULLETINS (world/bulletins.ts): every registered source drains its\n    // fresh \"something happened somewhere\" lines — faction conquests, crusade\n    // front shifts, and any future overlay's notices — through ONE registry.\n    // A new overlay registers a source at import time; no engine edit.\n    // Lines land in THE NOTICE FEED (screen-anchored, stacked, per-line\n    // clocks, channel-curated at draw) — never in the overhead float lane,\n    // where world news used to fight the combat text for the same pixels.\n    if (!unitWorld) for (const b of collectBulletins(nativeFrame)) {\n      pushNotice(nativeFrame.notices, b, nativeFrame.time);\n    }\n}"
        },
        {
          "name": "sceneNativeFrameWorldBridges",
          "source": "export function sceneNativeFrameWorldBridges(nativeFrame:NativeFrameWorldBridgesHost,unitWorld:boolean):void {\n\n    // THE DEADWAKE collides: charted zones its tide has rolled onto AND won the\n    // consume roll on (the roll is the overlay's) have their active world-event\n    // CONSUMED outright — the player's OWN zone gets the stream instead, never\n    // consumed. The overlay emits the won zones; the engine bridges to the other\n    // fields (overlays can't reach each other), gated by the surge's `consume`\n    // toggles. Weather is intentionally excluded (a tide of the dead can't snuff\n    // the sky), so no weather here.\n    const dwf = nativeFrame.sim.deadwakeField;\n    if (!unitWorld && dwf && dwf.consumedZones.length) {\n      const con = dwf.surge().consume;\n      for (const zid of dwf.consumedZones) {\n        if (con.demonInvasion) nativeFrame.sim.demonFieldFor(nativeFrame.zoneMap[zid]?.dimension)?.resolveInvasion(zid);\n        if (con.crusade) nativeFrame.sim.crusadeField?.resolveCrusadeZone(zid);\n      }\n      dwf.consumedZones.length = 0;\n    }\n\n    // THE SWARMING preys on the herds and plants its roosts. Predation: while\n    // a wing is out, every live migration band is offered to the swarm field\n    // — the roll, the once-latch and the gorging live on the OVERLAY (its own\n    // rng, deterministic); the engine only bridges the two pure fields\n    // (overlays can't reach each other) and pays the ledger. Planting: a\n    // completed wing's far pole takes root — drained here into KEYED biome\n    // warps (restore re-queues them, so a resumed save re-roots).\n    const swf = nativeFrame.sim.swarmingField;\n    if (!unitWorld && swf) {\n      const mf2 = nativeFrame.sim.migrationField;\n      if (mf2) {\n        for (const herdId of swf.predate(mf2.herdBands())) {\n          if (mf2.consume(herdId)) bumpLedger(nativeFrame.ledger, 'swarming_fed');\n        }\n      }\n      for (const p of swf.takeRoostWarps()) {\n        nativeFrame.sim.biomeField.setWarp(`swarm_roost_${p.id}`, {\n          id: `swarm_roost_${p.id}`,\n          center: { x: p.x, y: p.y },\n          radius: p.radius, biome: p.biome, strength: p.strength,\n          label: 'A Swarming planted a brood ground — the sand takes root',\n        });\n      }\n    }\n\n    // WARBAND ARRIVALS: a host that just reached its target node, while YOU stand\n    // in that zone, marches in for real — a coherent pack at the entry it came by.\n    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains the arrivals once; the\n    // pack lands in the World standing in the target zone, and nowhere else.\n    if (!unitWorld) for (const host of nativeFrame.sim.invasion.arrivals) {\n      nativeFrame.atZone(host.targetZoneId, w => w.spawnWarband(host));\n    }\n    if (!unitWorld) nativeFrame.sim.invasion.arrivals.length = 0;\n}"
        },
        {
          "name": "sceneNativeFrameWarbandMarches",
          "source": "export function sceneNativeFrameWarbandMarches(nativeFrame:NativeFrameWarbandMarchesHost):void {\n    nativeFrame.updateWarbandMarches();\n}"
        },
        {
          "name": "sceneNativeFrameWorldMints",
          "source": "export function sceneNativeFrameWorldMints(nativeFrame:NativeFrameWorldMintsHost,dt:number,unitWorld:boolean):void {\n\n    // DEMON INVASION: mint the epicenter zone at its coordinate (within the visible\n    // map) so the player can travel toward it and fight the Balor. Minted FLOATING\n    // — no forced road trail; a path forms as the player explores toward it (the\n    // floating-zone drain below). The pure overlay can't reach worldgen, so it\n    // queues requests we drain here (host/SP only — clients get it via sendZone).\n    //\n    // EVERY instance drains — each DIMENSION's rifts tear in its own graph:\n    // hell's epicenters carry hell's dimension/palette/level pressure and never\n    // touch the surface biome field (only surface events scorch the surface wash).\n    if (!unitWorld) for (const dfi of nativeFrame.sim.demonFieldsAll()) {\n      if (!dfi.mintRequests.length) continue;\n      const dfDim = dfi.dimension; // undefined = the surface instance\n      for (const req of dfi.mintRequests) {\n        if (nativeFrame.zoneMap[req.zoneKey]) { dfi.bindTarget(req.invId, req.zoneKey); continue; }\n        // BIOME: steer the rift toward EXISTING demon land (rift/volcanic) —\n        // placement preference, never transformation. LEVEL: the radial field\n        // at the (relocated) coord, not the player. (Hell needs no steering —\n        // its whole field is demon country already.)\n        const rl = dfDim ? { coord: req.coord, warpBiome: null as string | null }\n          : nativeFrame.relocateToFactionBiome(req.coord, 'demon');\n        // THE TRANSIENCE LAW (docs/engine/transience.md): the invasion NEVER\n        // warps the biome field. On real demon country the mint field-resolves\n        // as ever (local rift-family face); with none near (rl.warpBiome set —\n        // the old scorch-warp case) the rift stands as an explicit INTRUSION:\n        // spec.tileset wins, wearing its own authored biome, and the land\n        // around it stays exactly what it was. Its in-zone presence is the\n        // pinned Demon Storm (event weather + dress), which lifts with the\n        // invasion — the map's storm ring is the only cartography it gets.\n        const anchor = nativeFrame.zoneMap[req.anchorZoneId]\n          ?? nearestNode(nativeFrame.zoneMap, rl.coord, undefined, dfDim)\n          ?? (dfDim ? nativeFrame.zoneMap[dimensionDef(dfDim).entry?.gate.id ?? ''] : undefined)\n          ?? nativeFrame.surfaceAnchor();\n        const def = placeZoneAt(rl.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset,\n          level: nativeFrame.eventLevel(rl.coord) + (dfDim ? dimensionDef(dfDim).levelBonus ?? 0 : 0),\n          objective: { kind: 'clear' }, forceWaypoint: true, forceFrontiers: 1, floating: true,\n          ...(rl.warpBiome ? {} : { fieldBiome: true }),\n          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n          biomeFor: dfDim ? nativeFrame.dimensionBiomeFor(dfDim) : nativeFrame.biomeFor,\n          biomeDepthFor: dfDim ? nativeFrame.dimensionBiomeDepthFor(dfDim) : nativeFrame.biomeDepthFor,\n          climateFor: nativeFrame.climateFor,\n          ...(dfDim ? { dimension: dfDim } : {}),\n        });\n        def.eventOwned = true; // the demon epicenter — no other overlay squats here\n        nativeFrame.zoneMap[req.zoneKey] = def;\n        // NB: NO sim.onNodeCharted here — a floating zone isn't on the graph yet\n        // (it seeds its territory when connectFloatingZone wires it in, below).\n        dfi.bindTarget(req.invId, req.zoneKey);\n        // Announce only invasions of the plane the player stands in — a hell\n        // rift tearing while you walk the surface stays hell's own business.\n        // THE OCCUPIED LAW (shard M1-W3): heard by whoever stands in that plane.\n        const hearers = nativeFrame.occupiedAudience(z => (dfDim ?? 'surface') === (z.dimension ?? 'surface'));\n        if (hearers !== null) {\n          nativeFrame.noticeOccupied(hearers, 'A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events');\n        }\n      }\n      dfi.mintRequests.length = 0;\n    }\n\n    // (THE WAR BELOW mints NOTHING: thrones are field anchors, the lords\n    // manifest only in zones the player explores — the underworld_war\n    // zone-runtime row. The war's whole footprint is the field itself.)\n\n    // (CRUSADES mint NOTHING on the overworld: a crusade is a warfield\n    // campaign — its territory IS the field, real zones under it raise the\n    // faction's works at generation from their local control, and the only\n    // minted ground is the throne ARENA through the sanctum gate. The engine's\n    // only overworld touch is the anchored biome claim + release in the warp\n    // sweep below.)\n    const cf = nativeFrame.sim.crusadeField;\n\n    // CONCLAVE → ELDRITCH INCURSION: when the incubation counter maxes, the Conclave\n    // hands an ignition to the shared Incursion field (overlays can't reach each\n    // other — the engine bridges). The observer LANDS far off in the wilds.\n    const ig = unitWorld ? undefined : nativeFrame.sim.conclaveField?.takeIgnition();\n    if (ig) {\n      // THE OCCUPIED LAW (shard M1-W3): the ignite level reads every occupied\n      // zone's level beside the world's character level (solo: the standing zone).\n      let level = nativeFrame.player.level;\n      for (const w of nativeFrame.presentWorlds()) level = Math.max(level, w.zone.level);\n      const info = nativeFrame.sim.incursionField.ignite(ig.archetype, ig.origin, level);\n      if (info) nativeFrame.notice(info.announce, info.color, 18, 'events');\n    }\n    // Drain incursion mints: a CLUSTER of hidden (concealed + floating) epicenter\n    // zones far from the charted frontier — the map neither draws them nor zooms to\n    // them; a road forms only when the player explores near. Each warps the biome\n    // field, locking its ground into the archetype's blight. (Host/SP only.)\n    const inc = nativeFrame.sim.incursionField;\n    if (!unitWorld && inc.mintRequests.length) {\n      for (const req of inc.mintRequests) {\n        if (nativeFrame.zoneMap[req.zoneKey]) { inc.bindEpicenter(req.id, req.zoneKey); continue; }\n        // Even an alien intrusion needs GROUND to blight — pulled ashore.\n        req.coord = nativeFrame.pullToLand(req.coord);\n        const anchor = nearestNode(nativeFrame.zoneMap, req.coord) ?? nativeFrame.surfaceAnchor();\n        // An Incursion WARPS its ground to the blight (eldritch) — an alien intrusion,\n        // not a relocation — so its biome is intentionally fixed. LEVEL still obeys the\n        // radial field at its coord (not the player's level at ignition).\n        const def = placeZoneAt(req.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset, level: nativeFrame.eventLevel(req.coord),\n          objective: { kind: 'clear' }, floating: true, concealed: true, noFactionWar: true,\n          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n        });\n        def.eventOwned = true; // incursion epicenter — no other overlay squats here\n        nativeFrame.zoneMap[req.zoneKey] = def;\n        // Re-anchor the overlay's epicenter (tentacles + intensity capsules) on\n        // where the zone ACTUALLY landed — ashore, post anti-crowd.\n        inc.bindEpicenter(req.id, req.zoneKey, def.map);\n        // KEYED blight warp (the transience law): the halo holds while the\n        // epicenter lives — the warp sweep below re-asserts it every beat\n        // (which also re-raises it on a resumed save) and RELEASES it when\n        // the Observer falls, so the stain fades off the healed land instead\n        // of scarring the world forever. Presentation + attribution only:\n        // ground minted inside it still comes out its TRUE biome.\n        nativeFrame.sim.biomeField.setWarp(`incursion_${req.id}`, {\n          center: def.map, radius: req.biomeRadius, biome: req.biome, strength: req.biomeStrength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      inc.mintRequests.length = 0;\n    }\n\n    // EVENT WARPS RECEDE WITH THEIR EVENTS (the transience law,\n    // docs/engine/transience.md): every warp is keyed + owned, reconciled here\n    // against its owner's own liveness (peek) every beat — the live half\n    // RE-ASSERTS (which also re-raises warps a resumed save lost with the\n    // transient field), the dead half RELEASES (a gradual fade at\n    // BIOME_FIELD_CFG.warpFadePerSec — the land HEALS, it never snaps). Every\n    // ending — kill, burnout, collapse, package absent — heals by construction.\n    if (!unitWorld) nativeFrame.warpSweepAcc += dt;\n    if (!unitWorld && nativeFrame.warpSweepAcc >= 1) {\n      nativeFrame.warpSweepAcc = 0;\n      const bf = nativeFrame.sim.biomeField;\n      const liveEps = new Map<string, { coord: { x: number; y: number }; archetype: string }>();\n      for (const p of inc.peek()) {\n        for (const ep of p.epicenters) liveEps.set(ep.id, { coord: ep.coord, archetype: p.archetype });\n      }\n      for (const wid of bf.warpIds()) {\n        if (wid.startsWith('demon_')) {\n          // No producer since the transience pass (invasions never warp the\n          // field) — release any stale stain a mid-session module swap left.\n          bf.release(wid);\n        } else if (wid.startsWith('incursion_')) {\n          // The blight fades once its epicenter falls (or the whole landing\n          // collapses) — the deliberate inversion of the old permanent scar.\n          if (!liveEps.has(wid.slice('incursion_'.length))) bf.release(wid);\n        } else if (wid.startsWith('crusade_')) {\n          const cid = wid.slice('crusade_'.length);\n          if (!cf || !cf.peek().some(c => c.id === cid)) bf.release(wid);\n        } else if (wid.startsWith('swarm_roost_')) {\n          // A planted roost stands while its field remembers it (standing\n          // ecology BY the snapshot — and cullable: a culled roost, or a run\n          // without the package, heals within a beat).\n          const rid = wid.slice('swarm_roost_'.length);\n          if (!nativeFrame.sim.swarmingField?.hasRoost(rid)) bf.release(wid);\n        }\n      }\n      // LIVE INCURSION EPICENTERS KEEP THEIR HALO: re-assert each bound\n      // epicenter's keyed warp (idempotent replace; also revives after a\n      // resume — the transient field carries nothing across saves itself).\n      for (const [epId, at] of liveEps) {\n        const a = INCURSION_ARCHETYPES[at.archetype];\n        if (!a) continue;\n        bf.setWarp(`incursion_${epId}`, {\n          center: { x: at.coord.x, y: at.coord.y }, radius: a.biomeWarp.radius,\n          biome: a.biome, strength: a.biomeWarp.strength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      // AN ANCHORED CRUSADE CLAIMS ITS GROUND: once the throne stands, the\n      // heartland's biome turns to the faction's own country (biomesForFaction\n      // — sylvan groves rise, graves spread for the dead). Keyed per crusade;\n      // the release branch above heals the land when the war breaks.\n      if (cf) {\n        const claimed = new Set(bf.warpIds());\n        for (const c of cf.peek()) {\n          if (!c.anchored || claimed.has(`crusade_${c.id}`)) continue;\n          const biome = biomesForFaction(c.faction)[0];\n          if (!biome) continue;\n          bf.setWarp(`crusade_${c.id}`, {\n            center: { x: c.heart.x, y: c.heart.y }, radius: cf.surge().field.wellRange,\n            biome, strength: 1, label: 'Crusade — the land turns to its faction\\'s country',\n          });\n        }\n      }\n    }\n\n    // FLOATING ZONES wire into the charted graph — a road forms (connectFloatingZone),\n    // so there's no forced trail at spawn: the player EXPLORES near one (any\n    // rift/quest target within APPROACH_RADIUS of the zone they're in) and the\n    // path appears as they approach. Host/SP only; new exits stream to clients\n    // via the zone snapshot; syncZoneExits() (below) surfaces the portal live\n    // if the road landed on the player's zone.\n    // THE OCCUPIED LAW (shard M1-W3): \"near the player\" is near any zone a\n    // player's World stands in (solo: the standing zone).\n    const posts = unitWorld ? [] : nativeFrame.presentWorlds();\n    if (!unitWorld) for (const z of Object.values(nativeFrame.zoneMap)) {\n      if (!z.floating) continue;\n      // Proximity only counts WITHIN a dimension — the planes share one\n      // coordinate space, and a hell rift must not wire in because the player\n      // walks surface ground that happens to overlap its numbers.\n      const nearPlayer = posts.some(w => (z.dimension ?? 'surface') === (w.zone.dimension ?? 'surface')\n        && Math.hypot(z.map.x - w.zone.map.x, z.map.y - w.zone.map.y) <= APPROACH_RADIUS);\n      if (!nearPlayer) continue;\n      connectFloatingZone(z, nativeFrame.zoneMap, new Rng((nativeFrame.manifest.seed ^ hashStr(z.id)) >>> 0), APPROACH_RADIUS, nativeFrame.visited);\n      if (z.floating) continue; // no local road yet; retry as exploration grows\n      nativeFrame.sim.onNodeCharted(z, nativeFrame.simView()); // now on the graph — seed its territory\n      nativeFrame.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n          : 'A path opens toward your quest!', '#c8a8e8', 15, 'world');\n    }\n}"
        },
        {
          "name": "sceneNativeFrameRoadTail",
          "source": "export function sceneNativeFrameRoadTail(nativeFrame:NativeFrameRoadTailHost,dt:number,doorPressIntents:World[\"doorPressIntents\"]):void {\n\n    if (nativeFrame.updateTownPortals(dt)) return; // travel ends this old-zone frame\n\n    // Waypoint attunement: brush against it once and it's yours for the run.\n    // A BESIEGED stone (the 'leyline' objective — waypointBesieged, the one\n    // predicate) REFUSES the brush while its siphon drinks: the refusal\n    // floats throttled, and the moment the thief falls the same brush\n    // attunes. Radius is data (LEYLINE_CFG.attuneRadius — the historical 70).\n    // THE ACTING SEAT: any standing player's brush attunes it (the touchers).\n    const wpAt = nativeFrame.waypointPos;\n    if (wpAt && !nativeFrame.discoveredWaypoints.has(nativeFrame.zone.id)\n      && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the stone stands on the ground floor (placed on the base grid)\n        && dist(h.pos, wpAt) <= LEYLINE_CFG.attuneRadius)) {\n      if (nativeFrame.waypointBesieged()) {\n        if (nativeFrame.time - nativeFrame.wpRefusedAt > 2.5) {\n          nativeFrame.wpRefusedAt = nativeFrame.time;\n          nativeFrame.flashes.push({ pos: vec(wpAt.x, wpAt.y),\n            radius: LEYLINE_CFG.attuneRadius * 0.5, color: LEYLINE_CFG.beam, life: 0.5, maxLife: 0.5 });\n        }\n      } else {\n        nativeFrame.discoveredWaypoints.add(nativeFrame.zone.id);\n        nativeFrame.flashes.push({\n          pos: vec(wpAt.x, wpAt.y),\n          radius: 50, color: '#5ad8d8', life: 0.5, maxLife: 0.5,\n        });\n      }\n    }\n\n    // Sidezone mouths (data/sidezones.ts): DWELL on one (stand idle) to descend\n    // — running OVER a mouth never yanks you under (mirrors the portal dwell).\n    // Just after climbing out you stand AT the mouth, so a grace flag holds\n    // until you step clear once — otherwise you'd dwell straight back down.\n    // Runs INSIDE sidezones too — that's the ladder (a deeper mouth in a cave\n    // is dwelled exactly like a surface one; enterSidezone stacks the way home).\n    // indoorsOnly kinds (the cellar hatch) also demand the player stand under\n    // the SAME ROOF as the mouth — nobody dwells a hatch through a house wall.\n    if (!nativeFrame.player.dead && !nativeFrame.player.downed && !nativeFrame.traversal) {\n      // THE LIFT (shard M1 W2): the mouth scan is mouthUnder, shared with the\n      // shard scanner (engine/shardRoads.ts), which reads each seat's body.\n      const mouthIdx = nativeFrame.mouthUnder(nativeFrame.player);\n      if (nativeFrame.caveExitGrace) {\n        if (mouthIdx < 0) nativeFrame.caveExitGrace = false;\n        nativeFrame.caveDwellIdx = -1;\n      } else {\n        // THE CONDITIONED DOOR's refusal read: standing on a door whose cond\n        // does NOT hold floats its schedule (throttled) — a closed barrow\n        // tells you it is closed, and roughly when it will not be. A SEALED\n        // mouth (sealedBy — the exhumation law) floats its own line through\n        // the same clock: the shut door names the ring that opens it. A\n        // hosted world speaks it per seat instead (the scanner's note row).\n        if (!nativeFrame.shardWorld && mouthIdx < 0 && nativeFrame.time - nativeFrame.doorRefusalAt > 2.5) {\n          const shut = nativeFrame.mouthRefusalUnder(nativeFrame.player);\n          if (shut) {\n            nativeFrame.doorRefusalAt = nativeFrame.time;\n            nativeFrame.text(vec(shut.pos.x, shut.pos.y - 26), shut.text, '#b8a8d8', 12);\n          }\n        }\n        // Dwell builds only while standing idle AND not being knocked (a knockback\n        // onto a mouth must never carry you under).\n        if (mouthIdx >= 0 && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n          if (nativeFrame.caveDwellIdx !== mouthIdx) { nativeFrame.caveDwellIdx = mouthIdx; nativeFrame.caveDwellStart = nativeFrame.time; }\n          const cm = nativeFrame.caveEntrances[mouthIdx];\n          if (nativeFrame.time - nativeFrame.caveDwellStart >= dwellOf(cm.kind)) {\n            nativeFrame.caveDwellIdx = -1;\n            // A TRAVERSAL mouth (SidezoneDef.traversal — the geyser) rides the\n            // vertical-crossing cinematic: mint the pocket NOW (its `below`\n            // anchor sizes the understory capture), start the crossing, and\n            // step in behind the veil. Classic mouths keep the instant step.\n            const sz = sidezoneOf(cm.kind);\n            if (sz?.traversal) {\n              const dest = nativeFrame.mintSidezone(cm);\n              const cap: TraversalCapture | undefined = dest?.below ? {\n                key: dest.id,\n                ox: dest.below.ax - dest.size.w / 2, oy: dest.below.ay - dest.size.h / 2,\n                w: dest.size.w, h: dest.size.h,\n              } : undefined;\n              if (dest && nativeFrame.beginTraversal(sz.traversal, { capture: cap, swap: () => nativeFrame.enterSidezone(cm) })) return;\n            }\n            nativeFrame.enterSidezone(cm);\n            return; // everything else this frame belongs to the old zone\n          }\n        } else {\n          nativeFrame.caveDwellIdx = -1;\n        }\n        // STRUCTURE DOORS: push (dwell) on a closed openable door and it swings.\n        // Idle remains valid; an opted-in slab also accepts deliberate walking\n        // toward it. Quiescence/story/mode gates and nearest pairing still win;\n        // ANY party seat can push (a co-op remote hero opens a gate the host\n        // never walked to). Per-door data may override the dwell time.\n        let onDoor: Doodad | null = null; let doorD = Infinity;\n        for (const seat of nativeFrame.seats) {\n          const hero = seat.actor;\n          if (hero.dead || hero.downed || hero.push || !hero.isQuiescent()) continue;\n          const idle = nativeFrame.seatIdle(seat);\n          for (const d of nativeFrame.doodads) {\n            const dr = d.door;\n            if (!dr || dr.open || dr.broken) continue;\n            if (dr.mode !== 'dwell' && dr.mode !== 'both') continue;\n            if (!idle && !pressingDoor(dr.press, doorPressIntents?.get(seat.id), hero, d)) continue;\n            const dd = dist(hero.pos, d.pos);\n            // Reach honors the 'door' transit row ('radius' today: a push is\n            // contact — the plank itself is the occluder a ray would argue with).\n            // THE SAME-STORY LAW: a door swings only for a hero on ITS story\n            // (no pushing the inn's door open from the rooms above it).\n            if (dd <= d.radius + hero.radius + DOOR_REACH && dd < doorD\n              && nativeFrame.dwellReachable(hero.pos, d.pos, transitReach('door'), { from: hero.tier ?? 0, to: d.tier ?? 0 })) { doorD = dd; onDoor = d; }\n          }\n        }\n        if (onDoor?.door) {\n          if (nativeFrame.doorDwellId !== onDoor.door.id) {\n            nativeFrame.doorDwellId = onDoor.door.id;\n            nativeFrame.doorDwellStart = nativeFrame.time;\n            nativeFrame.doorDwellPos = vec(onDoor.pos.x, onDoor.pos.y);\n          }\n          if (nativeFrame.time - nativeFrame.doorDwellStart >= (onDoor.door.dwell ?? transitDwell('door'))) {\n            nativeFrame.doorDwellId = '';\n            const lesson = onDoor.door.lesson;\n            nativeFrame.setDoorState(onDoor.door.id, 'open');\n            // A TEACHING door (DoodadDoor.lesson) graduates the ACCOUNT on its\n            // first dwell-open — the flask-lesson pattern: any future copy of\n            // a door carrying this key mints already open (loadZone). The push\n            // was the tutorial; nobody is taught to open a door twice.\n            if (lesson && nativeFrame.account && !(nativeFrame.account.ledger[lesson] ?? 0)) {\n              nativeFrame.account.ledger[lesson] = 1;\n              nativeFrame.accountDirty = true;\n            }\n          }\n        } else {\n          nativeFrame.doorDwellId = '';\n        }\n        // THE SWITCH LANE (the trapworks door lane — engine/trapworks.ts,\n        // docs/engine/trapworks.md). Two halves, one door-fabric seat:\n        // (1) LEVER PULLS: a lever is a DOOR-RECORD doodad (DoodadDoor.mode\n        //     'pull') — the pull IS the door sweep's own dwell grammar\n        //     (reach, idle, the ring, one-way persistence, the co-op doors\n        //     channel) with an honest verb. The sweep above skips 'pull'\n        //     records; the throw lands here: dwell done → the record opens\n        //     through THE one door gate (silently — the spring's announce\n        //     speaks instead) and every armed lever trapwork naming it\n        //     springs with the puller's credit. tw.pullStart is the truth;\n        //     the doorDwell trio is fed as a VIEW so the standing ring\n        //     draws the pull (the sweep clears the id each frame the hero\n        //     stands off dwell doors — feeding after it is the contract,\n        //     and render reads after update).\n        // (2) SWITCHED DOORS (DoodadDoor.mode 'switched'): the push never\n        //     opens them — a hero at one learns there IS a mechanism (the\n        //     conditioned-mouth refusal idiom, the shared refusal clock).\n        for (const tw of nativeFrame.trapworks) {\n          const lt = tw.spec.trigger;\n          if (lt.kind !== 'lever' || tw.state !== 'armed' || !lt.door) continue;\n          const ld = nativeFrame.doodads.find(x => x.door?.id === lt.door);\n          const rec = ld?.door;\n          if (!ld || !rec || rec.mode !== 'pull' || rec.open || rec.broken) { tw.pullStart = undefined; continue; }\n          let puller: Actor | null = null; let pullD = Infinity;\n          for (const seat of nativeFrame.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed || hero.push || !nativeFrame.seatIdle(seat)) continue;\n            const dd = dist(hero.pos, ld.pos);\n            if (dd <= ld.radius + hero.radius + DOOR_REACH && dd < pullD\n              && nativeFrame.dwellReachable(hero.pos, ld.pos, transitReach('door'), nativeFrame.storyPair(hero, ld))) { pullD = dd; puller = hero; }\n          }\n          if (!puller) { tw.pullStart = undefined; continue; }\n          tw.pullStart ??= nativeFrame.time;\n          nativeFrame.doorDwellId = rec.id;\n          nativeFrame.doorDwellStart = tw.pullStart;\n          nativeFrame.doorDwellPos = vec(ld.pos.x, ld.pos.y);\n          if (nativeFrame.time - tw.pullStart >= (rec.dwell ?? transitDwell('door'))) {\n            tw.pullStart = undefined;\n            nativeFrame.doorDwellId = '';\n            nativeFrame.setDoorState(rec.id, 'open', { silent: true });\n            nativeFrame.springTrapwork(tw, puller);\n          }\n        }\n        if (nativeFrame.time - nativeFrame.doorRefusalAt > 2.5) {\n          refuse: for (const seat of nativeFrame.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed) continue;\n            for (const d of nativeFrame.doodads) {\n              const dr = d.door;\n              if (!dr || dr.open || dr.broken || dr.mode !== 'switched') continue;\n              if (dist(hero.pos, d.pos) > d.radius + hero.radius + DOOR_REACH) continue;\n              nativeFrame.doorRefusalAt = nativeFrame.time;\n              nativeFrame.text(vec(d.pos.x, d.pos.y - 26), 'held fast — some mechanism answers elsewhere…', '#c8b47a', 12);\n              break refuse;\n            }\n          }\n        }\n        // REALM GATES (demon rift / crusade sanctum / necropolis / fracture rift):\n        // DWELL on one (stand idle ~0.5s) to step through — so running OVER a gate\n        // never yanks you into a realm without meaning to (mirrors the portal + cave\n        // dwell; a knockback onto a gate can't carry you in either). Gather the open\n        // gates with their enter actions and dwell on the NEAREST one you stand on.\n        // THE LIFT (shard M1 W2): the gate list is realmGates and the nearest\n        // gate under a body gateUnder, shared with the shard scanner.\n        const gates = nativeFrame.realmGates();\n        const onGate = nativeFrame.gateUnder(nativeFrame.player, gates);\n        if (onGate && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n          if (nativeFrame.realmDwellKey !== onGate.key) {\n            nativeFrame.realmDwellKey = onGate.key; nativeFrame.realmDwellKind = onGate.kind;\n            nativeFrame.realmDwellPos = onGate.pos; nativeFrame.realmDwellStart = nativeFrame.time;\n          }\n          if (nativeFrame.time - nativeFrame.realmDwellStart >= transitDwell(`realm_gate:${onGate.kind}`)) {\n            nativeFrame.realmDwellKey = '';\n            onGate.enter();\n            return; // entering a realm — the rest of this frame belongs to the old zone\n          }\n        } else {\n          nativeFrame.realmDwellKey = ''; // stepped off / acting / knocked → the dwell resets\n        }\n        // ARENA WARD SEALS (data/arenas.ts): dwell one to SHATTER it — the same\n        // deliberate linger as every transit; the 'ward_seal' transit row sets\n        // the feel. Breaking the last seal manifests the warded boss.\n        if (nativeFrame.arenaWard) {\n          const onSeal = nativeFrame.wardSealUnder(nativeFrame.player); // THE LIFT (shard M1 W2)\n          if (onSeal && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n            if (nativeFrame.wardDwellSeal !== onSeal) { nativeFrame.wardDwellSeal = onSeal; nativeFrame.wardDwellStart = nativeFrame.time; }\n            if (nativeFrame.time - nativeFrame.wardDwellStart >= transitDwell(`ward_seal:${onSeal.kind}`)) {\n              nativeFrame.wardDwellSeal = null;\n              nativeFrame.breakArenaSeal(onSeal);\n            }\n          } else {\n            nativeFrame.wardDwellSeal = null;\n          }\n        }\n        // HOLDFAST: dwell beside the toll keeper to pay (carried Essence, or a gem\n        // seized at random — the guardian's UnlockSpec decides). Only while the gate\n        // is sealed + the wardens un-roused — drawing steel cancels the parley. A\n        // CONSUMED latch ('done') keeps it from re-firing while you stand; it re-arms\n        // ONLY when you step out of the ring (one parley per approach — a refused\n        // toll or acting beside the keeper never re-prompts; the Dwell-gate\n        // discipline, hand-rolled for the ring).\n        const keeper = nativeFrame.holdfastNear(nativeFrame.player); // THE LIFT (shard M1 W2): the keeper when near, else null\n        const nearKeeper = !!keeper;\n        if (!nearKeeper) {\n          nativeFrame.holdfastDwellKey = ''; // stepped out of the ring → re-arm\n        } else if (nativeFrame.holdfastDwellKey !== 'done') {\n          if (nativeFrame.playerIdle() && !nativeFrame.player.push) {\n            if (nativeFrame.holdfastDwellKey !== 'holdfast') { nativeFrame.holdfastDwellKey = 'holdfast'; nativeFrame.holdfastDwellPos = vec(keeper!.pos.x, keeper!.pos.y); nativeFrame.holdfastDwellStart = nativeFrame.time; }\n            if (nativeFrame.time - nativeFrame.holdfastDwellStart >= transitDwell('holdfast')) {\n              nativeFrame.holdfastDwellKey = 'done'; // consumed — won't re-fire until you move away\n              nativeFrame.onHoldfastDwell();\n            }\n          } else {\n            nativeFrame.holdfastDwellKey = ''; // acting/knocked resets PROGRESS — never the consumed latch\n          }\n        }\n      }\n    }\n\n    // Encounter diamonds: step onto a dormant one to OPEN it. No return — you\n    // keep playing in this zone; the field grows around you and floods with foes.\n    // (EXTRACT encounters never step-open: theirs is the DWELL — an act of\n    // attention, armed by updateExtraction — a knockback across a seam must\n    // not start a defense.)\n    // THE ACTING SEAT: any standing player's step opens one (the touchers).\n    for (const h of nativeFrame.touchers()) {\n      for (const e of nativeFrame.encounters) {\n        if (e.phase !== 'dormant' || e.def.extract) continue;\n        // (THE SAME-STORY LAW: an encounter seats on the ground floor — a storey walker over it never steps it open.)\n        if (h.tier === 0 && dist(h.pos, e.pos) <= h.radius + e.def.trigger.activateRadius) {\n          nativeFrame.openEncounter(e);\n        }\n      }\n    }\n\n    // Fractures: RUN OVER the volatile fracture object (no dwell — it's twitchy)\n    // to unleash the crawling fissure. No return; you keep playing as it crawls.\n    // THE ACTING SEAT: any standing player's run-over springs it.\n    const dormantRun = nativeFrame.fractureRun?.phase === 'dormant' ? nativeFrame.fractureRun : null;\n    if (dormantRun && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the fracture seats on the ground floor\n      && dist(h.pos, dormantRun.origin) <= h.radius + 26)) {\n      nativeFrame.triggerFracture();\n    }\n\n    // Portals: DWELL on one (stand idle ~0.5s) to step through — so running OVER\n    // a boundary no longer yanks you to the next zone (crossing a boundary should\n    // never punish you). Sealed exits still nag; the minions follow on travel.\n    if (!nativeFrame.player.dead && !nativeFrame.player.downed) {\n      // THE LIFT (shard M1 W2): the exit scan is exitUnder and the lock's own\n      // word exitLockHint, shared with the shard scanner (each seat's own door).\n      const { onExit, lockedExit } = nativeFrame.exitUnder(nativeFrame.player);\n      if (!nativeFrame.shardWorld && !onExit && lockedExit && nativeFrame.lockHint <= 0) {\n        nativeFrame.lockHint = 1.5;\n        const hint = nativeFrame.exitLockHint(lockedExit);\n        nativeFrame.text(vec(lockedExit.pos.x, lockedExit.pos.y - 40), hint.text, hint.color, 13);\n      }\n      // Dwell builds only while standing idle AND not being KNOCKED — a knockback\n      // onto a portal must never carry you off (it's not your intent). A live\n      // traversal owns the player outright — no portal can claim them mid-air.\n      if (onExit && nativeFrame.playerIdle() && !nativeFrame.player.push && !nativeFrame.traversal) {\n        if (nativeFrame.exitDwellIdx !== onExit.defIndex) { nativeFrame.exitDwellIdx = onExit.defIndex; nativeFrame.exitDwellStart = nativeFrame.time; }\n        // A boundary-gate exit dwells on its own transit row (family-chained:\n        // 'zone_exit:<gate>' falls back to 'zone_exit' when no row is registered).\n        if (nativeFrame.time - nativeFrame.exitDwellStart >= transitDwell(onExit.boundary ? `zone_exit:${onExit.boundary}` : 'zone_exit')) {\n          nativeFrame.travelThrough(onExit);\n          return; // everything else this frame belongs to the old zone\n        }\n      } else {\n        nativeFrame.exitDwellIdx = -1; // stepped off / acting / knocked → the dwell resets\n      }\n    }\n    // THE ROADS PER PLAYER (shard M1 W2): on a hosted world every standing\n    // seat's roads are judged with its own body and leave as tickets\n    // (engine/shardRoads.ts); the block above reads only the parked warden.\n    if (nativeFrame.shardWorld) nativeFrame.scanShardRoads();\n}"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneRoadScan.ts",
      "sha256": "5a180941431bb4e5273e8e0559014094eac9c3d2fcc3753d8c292e65d4284b93",
      "functions": [
        {
          "name": "scanNativeSceneRoads",
          "source": "export function scanNativeSceneRoads(w:NativeSceneRoadScanHost,state:NativeSceneRoadState): void {\n  const link = w.shardWorld;\n  if (!link) return;\n  const st = state, host = w.shardRoadHost();\n  // Rows of seats no longer here (a leave, a fall) fall away (self-healing).\n  const here = new Set<string>();\n  for (const s of w.seats) here.add(s.id);\n  for (const m of [st.dwell, st.door, st.ladder, st.heard] as Map<string, unknown>[]) for (const id of [...m.keys()]) if (!here.has(id)) m.delete(id);\n  for (const set of [st.grace, st.parley]) for (const id of [...set]) if (!here.has(id)) set.delete(id);\n  let gates: RealmGateRow<NativeAreaRoadDestination>[] | null = null;\n  for (const seat of w.seats) {\n    if (seat.keeper || seat.merc || seat.couch) continue;\n    const a = seat.actor, id = seat.id;\n    if (a.dead || a.downed) { st.dwell.delete(id); continue; }\n    const idle = w.seatIdle(seat) && !a.push;\n    // THE MUSTER RING (W4): while its party's ring stands in this unit, a member's roads wait for the party.\n    const bound = !!link.mustering?.(id);\n    /** The words this seat stands at this frame: [key, word, needs idle]. */\n    const words: [string, string, boolean][] = [];\n    let road: Road | null = null;\n    const mouthIdx = w.mouthUnder(a);\n    // THE EXIT GRACE: a climbed-out seat on its mouth holds no road but the\n    // exits until it stands clear (the solo block's caveExitGrace, per seat).\n    if (st.grace.has(id) && mouthIdx < 0) st.grace.delete(id);\n    if (!st.grace.has(id)) {\n      if (mouthIdx >= 0) {\n        const cm = host.caveEntrances[mouthIdx];\n        road = { key: `mouth:${cm.kind}:${Math.round(cm.pos.x)},${Math.round(cm.pos.y)}`, kind: `sidezone:${cm.kind}`, pos: cm.pos, need: dwellOf(cm.kind),\n          make: s => host.mouthRoad(s, cm) };\n      } else {\n        // THE CONDITIONED DOOR and THE SEALED MOUTH speak on the seat's own row.\n        const shut = w.mouthRefusalUnder(a);\n        if (shut) words.push([`door:${Math.round(shut.pos.x)},${Math.round(shut.pos.y)}`, shut.text, false]);\n      }\n      if (!road) {\n        const g = w.gateUnder(a, gates ??= w.realmGates());\n        if (g?.road) {\n          road = { key: `gate:${g.key}`, kind: `realm_gate:${g.kind}`, pos: g.pos, need: transitDwell(`realm_gate:${g.kind}`),\n            make: g.road };\n        } else if (g) words.push([`gate:${g.key}`, SHARD_ROADS_CFG.words.realm, true]);\n      }\n      if (!road) {\n        const seal = w.wardSealUnder(a);\n        if (seal) road = { key: `ward:${Math.round(seal.pos.x)},${Math.round(seal.pos.y)}`, kind: `ward_seal:${seal.kind}`, pos: seal.pos,\n          need: transitDwell(`ward_seal:${seal.kind}`), act: () => host.breakArenaSeal(seal) };\n      }\n      if (!road) {\n        // HOLDFAST: the parley is consumed per approach (the solo latch, per seat).\n        const keeper = w.holdfastNear(a);\n        if (!keeper) st.parley.delete(id);\n        else if (!st.parley.has(id)) {\n          road = { key: 'holdfast', kind: 'holdfast', pos: vec(keeper.pos.x, keeper.pos.y), need: transitDwell('holdfast'),\n            act: () => { st.parley.add(id); w.applyAction(seat, { t: 'payToll', index: -1 }); } };\n        }\n      }\n    }\n    if (!road) {\n      // THE RETREAT LAW: the exits judged from the seat's own door.\n      const { onExit, lockedExit } = w.exitUnder(a, w.seatDoorOf(seat));\n      if (onExit) {\n        const e = onExit, kind = e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit';\n        road = { key: `exit:${e.defIndex}`, kind, pos: e.pos, need: transitDwell(kind),\n          make: s => host.exitRoad(s, e) };\n      } else if (lockedExit) words.push([`lock:${lockedExit.defIndex}`, w.exitLockHint(lockedExit).text, false]);\n    }\n    // THE SEALED WORDS: the roads this world does not run yet.\n    const sealed = host.sealedRoadUnder(seat);\n    if (sealed) words.push([`sealed:${sealed.kind}`, SHARD_ROADS_CFG.words[sealed.kind], true]);\n    // THE MUSTER RING: a bound member builds no travel dwell (the ring is its road now).\n    if (bound && road?.make) road = null;\n    // The dwell: one road at a time, built only while idle and unshoved.\n    let cur = st.dwell.get(id);\n    if (road && idle) {\n      if (!cur || cur.key !== road.key) st.dwell.set(id, cur = { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), start: w.time, need: road.need });\n      if (w.time - cur.start >= cur.need) {\n        st.dwell.delete(id);\n        if (road.act) road.act();\n        else if (road.make) {\n          // THE MUSTER RING (W4): the party's muster takes the road first; an\n          // independent's (and a party alone in its unit) leaves at once.\n          const make = road.make;\n          if (!link.muster?.(seat, { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), make })) {\n            const t = make(seat);\n            if (t) link.enqueue(t);\n          }\n        }\n      }\n    } else st.dwell.delete(id);\n    // The words: once per approach, on the seat's own note row.\n    let heard = st.heard.get(id);\n    const standing = new Set<string>();\n    for (const [key, word, needsIdle] of words) {\n      standing.add(key);\n      if (heard?.has(key) || (needsIdle && !idle)) continue;\n      host.failNote(a, `road:${key}`, word);\n      if (!heard) st.heard.set(id, heard = new Set());\n      heard.add(key);\n    }\n    if (heard) for (const key of [...heard]) if (!standing.has(key)) heard.delete(key);\n  }\n}"
        }
      ]
    },
    {
      "file": "src/engine/nativeSceneCampaignFrameSteps.ts",
      "sha256": "bed70707ccde4ec3a60ada153c4f9302a96ac650d38e2d46606e84a3b941e653",
      "functions": [
        {
          "name": "sceneNativeFrameStep007",
          "source": "export function sceneNativeFrameStep007(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);\n}"
        },
        {
          "name": "sceneNativeFrameStep008",
          "source": "export function sceneNativeFrameStep008(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    nativeFrame.updateHarvest(rawDt, dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep022",
          "source": "export function sceneNativeFrameStep022(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook\n      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();\n}"
        },
        {
          "name": "sceneNativeFrameStep023",
          "source": "export function sceneNativeFrameStep023(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();\n}"
        },
        {
          "name": "sceneNativeFrameStep024",
          "source": "export function sceneNativeFrameStep024(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    nativeFrame.updateMireille(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep025",
          "source": "export function sceneNativeFrameStep025(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    nativeFrame.updateCampfire(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep026",
          "source": "export function sceneNativeFrameStep026(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    nativeFrame.updateSalvage(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep027",
          "source": "export function sceneNativeFrameStep027(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    nativeFrame.updateBountyBoard(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep028",
          "source": "export function sceneNativeFrameStep028(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    nativeFrame.updateTraces();\n}"
        },
        {
          "name": "sceneNativeFrameStep029",
          "source": "export function sceneNativeFrameStep029(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    nativeFrame.updateFont(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep030",
          "source": "export function sceneNativeFrameStep030(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    nativeFrame.updateTreePips();\n}"
        },
        {
          "name": "sceneNativeFrameStep031",
          "source": "export function sceneNativeFrameStep031(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Oracle stone opens the communion menu on a dwell.\n    nativeFrame.updateOracle(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep032",
          "source": "export function sceneNativeFrameStep032(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Tracker's fire opens the Bestiary on a dwell.\n    nativeFrame.updateTracker(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep033",
          "source": "export function sceneNativeFrameStep033(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    nativeFrame.updateVendors(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep034",
          "source": "export function sceneNativeFrameStep034(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    nativeFrame.updateCaravan(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep035",
          "source": "export function sceneNativeFrameStep035(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The port dock's linger-to-sail (naval travel menu).\n    nativeFrame.updateSail(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep036",
          "source": "export function sceneNativeFrameStep036(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    nativeFrame.updateHarborBoard(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep037",
          "source": "export function sceneNativeFrameStep037(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    nativeFrame.updateMusterHorn(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep038",
          "source": "export function sceneNativeFrameStep038(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    nativeFrame.updateHoldDefense(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep040",
          "source": "export function sceneNativeFrameStep040(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    nativeFrame.updateQuestGiver(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep041",
          "source": "export function sceneNativeFrameStep041(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateVocationSites();\n}"
        },
        {
          "name": "sceneNativeFrameStep042",
          "source": "export function sceneNativeFrameStep042(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    nativeFrame.updateMercOutpost(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep043",
          "source": "export function sceneNativeFrameStep043(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    nativeFrame.updateAmalgamation(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep044",
          "source": "export function sceneNativeFrameStep044(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    nativeFrame.updateDelver(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep045",
          "source": "export function sceneNativeFrameStep045(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateDescent(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep046",
          "source": "export function sceneNativeFrameStep046(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    nativeFrame.updateLightwells(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep047",
          "source": "export function sceneNativeFrameStep047(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    nativeFrame.updateGloaming(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep048",
          "source": "export function sceneNativeFrameStep048(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    nativeFrame.updateSailing(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep049",
          "source": "export function sceneNativeFrameStep049(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    nativeFrame.updatePlayerCorpses(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep050",
          "source": "export function sceneNativeFrameStep050(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Co-op: an ally lingering by a downed seat revives them.\n    nativeFrame.updateDownedSeats(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep051",
          "source": "export function sceneNativeFrameStep051(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    nativeFrame.companionBonds.update(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep052",
          "source": "export function sceneNativeFrameStep052(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.challenges.update(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep053",
          "source": "export function sceneNativeFrameStep053(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.attackSequences.update(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep054",
          "source": "export function sceneNativeFrameStep054(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.guardArts.update(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep055",
          "source": "export function sceneNativeFrameStep055(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateDownedCompanions(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep070",
          "source": "export function sceneNativeFrameStep070(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStorm(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep071",
          "source": "export function sceneNativeFrameStep071(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDemonStorm(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep072",
          "source": "export function sceneNativeFrameStep072(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateBombardment();\n}"
        },
        {
          "name": "sceneNativeFrameStep073",
          "source": "export function sceneNativeFrameStep073(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateClutch(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep074",
          "source": "export function sceneNativeFrameStep074(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDeadwakeStream(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep075",
          "source": "export function sceneNativeFrameStep075(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateHauntStream(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep076",
          "source": "export function sceneNativeFrameStep076(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStrayingScene(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep077",
          "source": "export function sceneNativeFrameStep077(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDroveScene(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep078",
          "source": "export function sceneNativeFrameStep078(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWispScene(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep079",
          "source": "export function sceneNativeFrameStep079(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateQuickening(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep080",
          "source": "export function sceneNativeFrameStep080(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWraithsailDock();\n}"
        },
        {
          "name": "sceneNativeFrameStep081",
          "source": "export function sceneNativeFrameStep081(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateLongNight(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep082",
          "source": "export function sceneNativeFrameStep082(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateNecropolis();\n}"
        },
        {
          "name": "sceneNativeFrameStep083",
          "source": "export function sceneNativeFrameStep083(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateMigrationStream(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep084",
          "source": "export function sceneNativeFrameStep084(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateSwarmStream(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep085",
          "source": "export function sceneNativeFrameStep085(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWorldBosses(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep086",
          "source": "export function sceneNativeFrameStep086(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.titans.update(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep087",
          "source": "export function sceneNativeFrameStep087(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateBrigandRaid(dt);\n}"
        },
        {
          "name": "sceneNativeFrameStep088",
          "source": "export function sceneNativeFrameStep088(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateNeutralCooldown();\n}"
        },
        {
          "name": "sceneNativeFrameStep089",
          "source": "export function sceneNativeFrameStep089(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void { // roused neutrals lose interest + re-dormant on disengage\n    nativeFrame.pruneEngageTokens();\n}"
        },
        {
          "name": "sceneNativeFrameStep090",
          "source": "export function sceneNativeFrameStep090(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {     // stale/dead attack-token holders rotate out\n    nativeFrame.updateLooters();\n}"
        },
        {
          "name": "sceneNativeFrameStep091",
          "source": "export function sceneNativeFrameStep091(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {         // scavengers snatch coveted ground drops\n    nativeFrame.maybeOpenDemonPortal();\n}"
        },
        {
          "name": "sceneNativeFrameStep092",
          "source": "export function sceneNativeFrameStep092(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.maybeOpenCrusadePortal();\n}"
        }
      ]
    }
  ],
  "groups": [
    {
      "name": "Begin",
      "from": 0,
      "to": 6,
      "start": 2347251,
      "end": 2349183,
      "firstLine": 42133,
      "lastLine": 42170,
      "before": "\n    if (!this.gameOver && !this.nativeWorldReady()) return;\n    const doorPressIntents = this.doorPressIntents;\n    this.doorPressIntents = null;\n    if (this.gameOver) {\n      // Continue the visual aftermath on raw seconds, even under a stale menu\n      // hold. Never re-enter combat, AI, rewards, respawns, or input handling.\n      if (this.deathPresentation && !deathPresentationPose(this.deathPresentation.elapsed).complete) {\n        const step = Math.max(0, dt);\n        this.deathPresentation.elapsed += step;\n        this.screenFade = deathPresentationPose(this.deathPresentation.elapsed).fade;\n        this.time += step; // ambient painters keep breathing behind the epilogue\n        for (let i = this.flashes.length - 1; i >= 0; i--) {\n          this.flashes[i].life -= step;\n          if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);\n        }\n        for (let i = this.texts.length - 1; i >= 0; i--) {\n          this.texts[i].life -= step;\n          this.texts[i].pos.y -= 28 * step;\n          if (this.texts[i].life <= 0) this.texts.splice(i, 1);\n        }\n      }\n      return;\n    }\n    // THE TIMEFLOW GATE (engine/timeflow.ts): holds age on RAW seconds\n    // first (a freeze must be able to expire out of the very clock it\n    // stops), then the folded WORLD scale bends this whole frame — 0 holds\n    // the world (the pause menu, an Ultimatum-style choice), fractions are\n    // world slow-motion. A held world still RENDERS (the loop keeps\n    // drawing); it just stops mutating, wholesale and drift-free.\n    const rawDt = dt;\n    dt *= this.timeflow.beginFrame(rawDt);\n    // THE EYECATCH sweep: a spent pane is nulled a beat after it ends, so\n    // the co-op wire never ships a stale row forever (engine/ultimates.ts).\n    if (this.eyecatch\n      && eyecatchElapsed(this.eyecatch, this.timeflow.age)\n        > this.eyecatch.paneSec + ULT_CFG.expireSlackSec) {\n      this.eyecatch = null;\n    }",
      "after": "export function sceneNativeFrameBegin(nativeFrame:NativeFrameBeginHost,dt: number):NativeFrameTiming|undefined {\n    if (!nativeFrame.gameOver && !nativeFrame.nativeWorldReady()) return;\n    const doorPressIntents = nativeFrame.doorPressIntents;\n    nativeFrame.doorPressIntents = null;\n    if (nativeFrame.gameOver) {\n      // Continue the visual aftermath on raw seconds, even under a stale menu\n      // hold. Never re-enter combat, AI, rewards, respawns, or input handling.\n      if (nativeFrame.deathPresentation && !deathPresentationPose(nativeFrame.deathPresentation.elapsed).complete) {\n        const step = Math.max(0, dt);\n        nativeFrame.deathPresentation.elapsed += step;\n        nativeFrame.screenFade = deathPresentationPose(nativeFrame.deathPresentation.elapsed).fade;\n        nativeFrame.time += step; // ambient painters keep breathing behind the epilogue\n        for (let i = nativeFrame.flashes.length - 1; i >= 0; i--) {\n          nativeFrame.flashes[i].life -= step;\n          if (nativeFrame.flashes[i].life <= 0) nativeFrame.flashes.splice(i, 1);\n        }\n        for (let i = nativeFrame.texts.length - 1; i >= 0; i--) {\n          nativeFrame.texts[i].life -= step;\n          nativeFrame.texts[i].pos.y -= 28 * step;\n          if (nativeFrame.texts[i].life <= 0) nativeFrame.texts.splice(i, 1);\n        }\n      }\n      return;\n    }\n    // THE TIMEFLOW GATE (engine/timeflow.ts): holds age on RAW seconds\n    // first (a freeze must be able to expire out of the very clock it\n    // stops), then the folded WORLD scale bends this whole frame — 0 holds\n    // the world (the pause menu, an Ultimatum-style choice), fractions are\n    // world slow-motion. A held world still RENDERS (the loop keeps\n    // drawing); it just stops mutating, wholesale and drift-free.\n    const rawDt = dt;\n    dt *= nativeFrame.timeflow.beginFrame(rawDt);\n    // THE EYECATCH sweep: a spent pane is nulled a beat after it ends, so\n    // the co-op wire never ships a stale row forever (engine/ultimates.ts).\n    if (nativeFrame.eyecatch\n      && eyecatchElapsed(nativeFrame.eyecatch, nativeFrame.timeflow.age)\n        > nativeFrame.eyecatch.paneSec + ULT_CFG.expireSlackSec) {\n      nativeFrame.eyecatch = null;\n    }\n    return {dt,rawDt,doorPressIntents};\n}",
      "edits": [
        [
          1905,
          1909,
          "nativeFrame"
        ],
        [
          1849,
          1853,
          "nativeFrame"
        ],
        [
          1820,
          1824,
          "nativeFrame"
        ],
        [
          1805,
          1809,
          "nativeFrame"
        ],
        [
          1766,
          1770,
          "nativeFrame"
        ],
        [
          1573,
          1577,
          "nativeFrame"
        ],
        [
          1047,
          1051,
          "nativeFrame"
        ],
        [
          1022,
          1026,
          "nativeFrame"
        ],
        [
          974,
          978,
          "nativeFrame"
        ],
        [
          936,
          940,
          "nativeFrame"
        ],
        [
          888,
          892,
          "nativeFrame"
        ],
        [
          830,
          834,
          "nativeFrame"
        ],
        [
          803,
          807,
          "nativeFrame"
        ],
        [
          759,
          763,
          "nativeFrame"
        ],
        [
          709,
          713,
          "nativeFrame"
        ],
        [
          614,
          618,
          "nativeFrame"
        ],
        [
          568,
          572,
          "nativeFrame"
        ],
        [
          528,
          532,
          "nativeFrame"
        ],
        [
          480,
          484,
          "nativeFrame"
        ],
        [
          390,
          394,
          "nativeFrame"
        ],
        [
          341,
          345,
          "nativeFrame"
        ],
        [
          155,
          159,
          "nativeFrame"
        ],
        [
          117,
          121,
          "nativeFrame"
        ],
        [
          90,
          94,
          "nativeFrame"
        ],
        [
          28,
          32,
          "nativeFrame"
        ],
        [
          10,
          14,
          "nativeFrame"
        ]
      ],
      "properties": [
        "deathPresentation",
        "doorPressIntents",
        "eyecatch",
        "flashes",
        "gameOver",
        "nativeWorldReady",
        "screenFade",
        "texts",
        "time",
        "timeflow"
      ],
      "seams": []
    },
    {
      "name": "RawArea",
      "from": 7,
      "to": 8,
      "start": 2349183,
      "end": 2349855,
      "firstLine": 42175,
      "lastLine": 42180,
      "before": "\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (this.scene) updateScene(this, rawDt);\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    this.updateHarvest(rawDt, dt);",
      "after": "export function sceneNativeFrameRawArea(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    nativeFrame.updateHarvest(rawDt, dt);\n}",
      "edits": [
        [
          642,
          646,
          "nativeFrame"
        ],
        [
          330,
          334,
          "nativeFrame"
        ],
        [
          306,
          310,
          "nativeFrame"
        ]
      ],
      "properties": [
        "scene",
        "updateHarvest"
      ],
      "seams": []
    },
    {
      "name": "Clock",
      "from": 9,
      "to": 10,
      "start": 2349855,
      "end": 2349901,
      "firstLine": 42181,
      "lastLine": 42182,
      "before": "\n    if (dt <= 0) return;\n    this.time += dt;",
      "after": "export function sceneNativeFrameClock(nativeFrame:NativeFrameClockHost,dt:number):boolean {\n    if (dt <= 0) return false;\n    nativeFrame.time += dt;\n    return true;\n}",
      "edits": [
        [
          30,
          34,
          "nativeFrame"
        ],
        [
          18,
          25,
          "return false;"
        ]
      ],
      "properties": [
        "time"
      ],
      "seams": []
    },
    {
      "name": "Prepare",
      "from": 11,
      "to": 15,
      "start": 2349901,
      "end": 2350460,
      "firstLine": 42183,
      "lastLine": 42192,
      "before": "\n    for (const a of this.actors) if (!a.dead) ensureMovementTether(a);\n    // Fresh actor-grid epoch: the AI phase just moved monsters (kernels call\n    // moveActor directly), so spatial queries from here read current bodies.\n    this.actorGridRev++;\n    // Walk-field tick housekeeping (the WalkField seam): resets the stale\n    // path-field refresh budget on whichever grid is steering feet this zone\n    // (the layout's own, or the convex nav rake).\n    this.walk?.beginFrame?.();\n    this.massRuntime?.update(this);\n    this.convexNav?.beginFrame?.();",
      "after": "export function sceneNativeFramePrepare(nativeFrame:NativeFramePrepareHost):void {\n    for (const a of nativeFrame.actors) if (!a.dead) ensureMovementTether(a);\n    // Fresh actor-grid epoch: the AI phase just moved monsters (kernels call\n    // moveActor directly), so spatial queries from here read current bodies.\n    nativeFrame.actorGridRev++;\n    // Walk-field tick housekeeping (the WalkField seam): resets the stale\n    // path-field refresh budget on whichever grid is steering feet this zone\n    // (the layout's own, or the convex nav rake).\n    nativeFrame.walk?.beginFrame?.();\n    nativeFrame.updateMassRuntimeFrame();\n    nativeFrame.convexNav?.beginFrame?.();\n}",
      "edits": [
        [
          528,
          532,
          "nativeFrame"
        ],
        [
          517,
          521,
          "nativeFrame"
        ],
        [
          492,
          496,
          "nativeFrame"
        ],
        [
          461,
          465,
          "nativeFrame"
        ],
        [
          232,
          236,
          "nativeFrame"
        ],
        [
          21,
          25,
          "nativeFrame"
        ]
      ],
      "properties": [
        "actorGridRev",
        "actors",
        "convexNav",
        "massRuntime",
        "walk"
      ],
      "seams": [
        {
          "from": "nativeFrame.massRuntime?.update(nativeFrame);",
          "to": "nativeFrame.updateMassRuntimeFrame();"
        }
      ]
    },
    {
      "name": "PendingTransitions",
      "from": 16,
      "to": 19,
      "start": 2350460,
      "end": 2351009,
      "firstLine": 42195,
      "lastLine": 42200,
      "before": "\n    // A survived death's fade/wake sequence (character modes). The world keeps\n    // simulating beneath the dark — the death itself was already banked.\n    const massBeforeTransition = this.massRuntime;\n    if (this.pendingRespawn) this.updateModeRespawn(dt);\n    // A live VERTICAL CROSSING (geyser launch / cloud fall): the traversal\n    // owns the player until the veil clears; the world keeps simulating.\n    if (this.traversal) this.updateTraversal(dt);\n    if (this.massRuntime !== massBeforeTransition && !this.nativeWorldReady()) return;",
      "after": "export function sceneNativeFramePendingTransitions(nativeFrame:NativeFramePendingTransitionsHost,dt:number):boolean {\n    // A survived death's fade/wake sequence (character modes). The world keeps\n    // simulating beneath the dark — the death itself was already banked.\n    const massBeforeTransition = nativeFrame.massRuntime;\n    if (nativeFrame.pendingRespawn) nativeFrame.updateModeRespawn(dt);\n    // A live VERTICAL CROSSING (geyser launch / cloud fall): the traversal\n    // owns the player until the veil clears; the world keeps simulating.\n    if (nativeFrame.traversal) nativeFrame.updateTraversal(dt);\n    if (nativeFrame.massRuntime !== massBeforeTransition && !nativeFrame.nativeWorldReady()) return false;\n    return true;\n}",
      "edits": [
        [
          542,
          549,
          "return false;"
        ],
        [
          517,
          521,
          "nativeFrame"
        ],
        [
          471,
          475,
          "nativeFrame"
        ],
        [
          437,
          441,
          "nativeFrame"
        ],
        [
          421,
          425,
          "nativeFrame"
        ],
        [
          235,
          239,
          "nativeFrame"
        ],
        [
          214,
          218,
          "nativeFrame"
        ],
        [
          188,
          192,
          "nativeFrame"
        ]
      ],
      "properties": [
        "massRuntime",
        "nativeWorldReady",
        "pendingRespawn",
        "traversal",
        "updateModeRespawn",
        "updateTraversal"
      ],
      "seams": []
    },
    {
      "name": "Fades",
      "from": 20,
      "to": 21,
      "start": 2351009,
      "end": 2351200,
      "firstLine": 42201,
      "lastLine": 42202,
      "before": "\n    if (this.lowLifeHitFlash > 0) this.lowLifeHitFlash = Math.max(0, this.lowLifeHitFlash - dt);\n    if (this.mireilleXpBuff > 0) this.mireilleXpBuff = Math.max(0, this.mireilleXpBuff - dt);",
      "after": "export function sceneNativeFrameFades(nativeFrame:NativeFrameFadesHost,dt:number):void {\n    if (nativeFrame.lowLifeHitFlash > 0) nativeFrame.lowLifeHitFlash = Math.max(0, nativeFrame.lowLifeHitFlash - dt);\n    if (nativeFrame.mireilleXpBuff > 0) nativeFrame.mireilleXpBuff = Math.max(0, nativeFrame.mireilleXpBuff - dt);\n}",
      "edits": [
        [
          165,
          169,
          "nativeFrame"
        ],
        [
          131,
          135,
          "nativeFrame"
        ],
        [
          106,
          110,
          "nativeFrame"
        ],
        [
          70,
          74,
          "nativeFrame"
        ],
        [
          35,
          39,
          "nativeFrame"
        ],
        [
          9,
          13,
          "nativeFrame"
        ]
      ],
      "properties": [
        "lowLifeHitFlash",
        "mireilleXpBuff"
      ],
      "seams": []
    },
    {
      "name": "InteractionsBeforeHarbor",
      "from": 22,
      "to": 38,
      "start": 2351200,
      "end": 2353559,
      "firstLine": 42209,
      "lastLine": 42245,
      "before": "\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (this.zoneHasVendorCounter && !this.clientActionHook\n      && this.vendorRestockAt > 0 && this.time >= this.vendorRestockAt) this.restockVendor();\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (this.zoneHasVendorCounter && this.localSeat.keeper && !this.clientActionHook) this.armBuyerShelves();\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    this.updateMireille(dt);\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    this.updateCampfire(dt);\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    this.updateSalvage(dt);\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    this.updateBountyBoard(dt);\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    this.updateTraces();\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    this.updateFont(dt);\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    this.updateTreePips();\n    // The Oracle stone opens the communion menu on a dwell.\n    this.updateOracle(dt);\n    // The Tracker's fire opens the Bestiary on a dwell.\n    this.updateTracker(dt);\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    this.updateVendors(dt);\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    this.updateCaravan(dt);\n    // The port dock's linger-to-sail (naval travel menu).\n    this.updateSail(dt);\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    this.updateHarborBoard(dt);\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    this.updateMusterHorn(dt);\n    this.updateHoldDefense(dt);",
      "after": "export function sceneNativeFrameInteractionsBeforeHarbor(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook\n      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    nativeFrame.updateMireille(dt);\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    nativeFrame.updateCampfire(dt);\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    nativeFrame.updateSalvage(dt);\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    nativeFrame.updateBountyBoard(dt);\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    nativeFrame.updateTraces();\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    nativeFrame.updateFont(dt);\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    nativeFrame.updateTreePips();\n    // The Oracle stone opens the communion menu on a dwell.\n    nativeFrame.updateOracle(dt);\n    // The Tracker's fire opens the Bestiary on a dwell.\n    nativeFrame.updateTracker(dt);\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    nativeFrame.updateVendors(dt);\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    nativeFrame.updateCaravan(dt);\n    // The port dock's linger-to-sail (naval travel menu).\n    nativeFrame.updateSail(dt);\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    nativeFrame.updateHarborBoard(dt);\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    nativeFrame.updateMusterHorn(dt);\n    nativeFrame.updateHoldDefense(dt);\n}",
      "edits": [
        [
          2332,
          2336,
          "nativeFrame"
        ],
        [
          2301,
          2305,
          "nativeFrame"
        ],
        [
          2090,
          2094,
          "nativeFrame"
        ],
        [
          1994,
          1998,
          "nativeFrame"
        ],
        [
          1907,
          1911,
          "nativeFrame"
        ],
        [
          1802,
          1806,
          "nativeFrame"
        ],
        [
          1692,
          1696,
          "nativeFrame"
        ],
        [
          1608,
          1612,
          "nativeFrame"
        ],
        [
          1520,
          1524,
          "nativeFrame"
        ],
        [
          1414,
          1418,
          "nativeFrame"
        ],
        [
          1311,
          1315,
          "nativeFrame"
        ],
        [
          1208,
          1212,
          "nativeFrame"
        ],
        [
          1095,
          1099,
          "nativeFrame"
        ],
        [
          984,
          988,
          "nativeFrame"
        ],
        [
          872,
          876,
          "nativeFrame"
        ],
        [
          765,
          769,
          "nativeFrame"
        ],
        [
          742,
          746,
          "nativeFrame"
        ],
        [
          716,
          720,
          "nativeFrame"
        ],
        [
          687,
          691,
          "nativeFrame"
        ],
        [
          513,
          517,
          "nativeFrame"
        ],
        [
          491,
          495,
          "nativeFrame"
        ],
        [
          478,
          482,
          "nativeFrame"
        ],
        [
          450,
          454,
          "nativeFrame"
        ],
        [
          419,
          423,
          "nativeFrame"
        ],
        [
          389,
          393,
          "nativeFrame"
        ]
      ],
      "properties": [
        "armBuyerShelves",
        "clientActionHook",
        "localSeat",
        "restockVendor",
        "time",
        "updateBountyBoard",
        "updateCampfire",
        "updateCaravan",
        "updateFont",
        "updateHarborBoard",
        "updateHoldDefense",
        "updateMireille",
        "updateMusterHorn",
        "updateOracle",
        "updateSail",
        "updateSalvage",
        "updateTraces",
        "updateTracker",
        "updateTreePips",
        "updateVendors",
        "vendorRestockAt",
        "zoneHasVendorCounter"
      ],
      "seams": []
    },
    {
      "name": "Harborholds",
      "from": 39,
      "to": 39,
      "start": 2353559,
      "end": 2353589,
      "firstLine": 42246,
      "lastLine": 42246,
      "before": "\n    this.updateHarborholds();",
      "after": "export function sceneNativeFrameHarborholds(nativeFrame:NativeFrameHarborholdsHost):void {\n    nativeFrame.updateHarborholds();\n}",
      "edits": [
        [
          5,
          9,
          "nativeFrame"
        ]
      ],
      "properties": [
        "updateHarborholds"
      ],
      "seams": []
    },
    {
      "name": "InteractionsAfterHarbor",
      "from": 40,
      "to": 55,
      "start": 2353589,
      "end": 2354869,
      "firstLine": 42248,
      "lastLine": 42272,
      "before": "\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    this.updateQuestGiver(dt);\n    this.updateVocationSites();\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    this.updateMercOutpost(dt);\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    this.updateAmalgamation(dt);\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    this.updateDelver(dt);\n    this.updateDescent(dt);\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    this.updateLightwells(dt);\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    this.updateGloaming(dt);\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    this.updateSailing(dt);\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    this.updatePlayerCorpses(dt);\n    // Co-op: an ally lingering by a downed seat revives them.\n    this.updateDownedSeats(dt);\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    this.companionBonds.update(dt);\n    this.challenges.update(dt);\n    this.attackSequences.update(dt);\n    this.guardArts.update(dt);\n    this.updateDownedCompanions(dt);",
      "after": "export function sceneNativeFrameInteractionsAfterHarbor(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    nativeFrame.updateQuestGiver(dt);\n    nativeFrame.updateVocationSites();\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    nativeFrame.updateMercOutpost(dt);\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    nativeFrame.updateAmalgamation(dt);\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    nativeFrame.updateDelver(dt);\n    nativeFrame.updateDescent(dt);\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    nativeFrame.updateLightwells(dt);\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    nativeFrame.updateGloaming(dt);\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    nativeFrame.updateSailing(dt);\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    nativeFrame.updatePlayerCorpses(dt);\n    // Co-op: an ally lingering by a downed seat revives them.\n    nativeFrame.updateDownedSeats(dt);\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    nativeFrame.companionBonds.update(dt);\n    nativeFrame.challenges.update(dt);\n    nativeFrame.attackSequences.update(dt);\n    nativeFrame.guardArts.update(dt);\n    nativeFrame.updateDownedCompanions(dt);\n}",
      "edits": [
        [
          1248,
          1252,
          "nativeFrame"
        ],
        [
          1217,
          1221,
          "nativeFrame"
        ],
        [
          1180,
          1184,
          "nativeFrame"
        ],
        [
          1148,
          1152,
          "nativeFrame"
        ],
        [
          1112,
          1116,
          "nativeFrame"
        ],
        [
          1010,
          1014,
          "nativeFrame"
        ],
        [
          913,
          917,
          "nativeFrame"
        ],
        [
          818,
          822,
          "nativeFrame"
        ],
        [
          707,
          711,
          "nativeFrame"
        ],
        [
          598,
          602,
          "nativeFrame"
        ],
        [
          487,
          491,
          "nativeFrame"
        ],
        [
          460,
          464,
          "nativeFrame"
        ],
        [
          338,
          342,
          "nativeFrame"
        ],
        [
          226,
          230,
          "nativeFrame"
        ],
        [
          116,
          120,
          "nativeFrame"
        ],
        [
          85,
          89,
          "nativeFrame"
        ]
      ],
      "properties": [
        "attackSequences",
        "challenges",
        "companionBonds",
        "guardArts",
        "updateAmalgamation",
        "updateDelver",
        "updateDescent",
        "updateDownedCompanions",
        "updateDownedSeats",
        "updateGloaming",
        "updateLightwells",
        "updateMercOutpost",
        "updatePlayerCorpses",
        "updateQuestGiver",
        "updateSailing",
        "updateVocationSites"
      ],
      "seams": []
    },
    {
      "name": "Wipe",
      "from": 56,
      "to": 56,
      "start": 2354869,
      "end": 2355898,
      "firstLine": 42283,
      "lastLine": 42288,
      "before": "\n    // ALL-DOWN terminator: once no seat is left standing, the wipe concludes\n    // (per mode: resurface / respawn / run over). Guarded on !gameOver so\n    // single-player — where onPlayerDown already concluded this same frame —\n    // never double-fires, and on !pendingRespawn so a mode respawn mid-fade\n    // (every seat still flagged dead until the wake) isn't re-concluded.\n    // THE SCENE COVENANT stands it down whole: on scripted ground the scene\n    // owns every fall — the reckoning's felled field lies DOWNED under the\n    // director's fade by design (engine/scenes.ts fellSeats), and its later\n    // stages stand the party back up; a wipe here would end a run that has\n    // not yet begun.\n    if (!this.gameOver && !this.pendingRespawn && !this.scene && this.seats.length > 0\n      && !this.seats.some(s => !s.actor.dead && !s.actor.downed\n        && (!s.merc || MERC_CFG.mercsCanRevive))) {\n      for (const s of this.seats) { s.actor.downed = false; s.actor.dead = true; }\n      this.concludeWipe();\n    }",
      "after": "export function sceneNativeFrameWipe(nativeFrame:NativeFrameWipeHost):void {\n    // ALL-DOWN terminator: once no seat is left standing, the wipe concludes\n    // (per mode: resurface / respawn / run over). Guarded on !gameOver so\n    // single-player — where onPlayerDown already concluded this same frame —\n    // never double-fires, and on !pendingRespawn so a mode respawn mid-fade\n    // (every seat still flagged dead until the wake) isn't re-concluded.\n    // THE SCENE COVENANT stands it down whole: on scripted ground the scene\n    // owns every fall — the reckoning's felled field lies DOWNED under the\n    // director's fade by design (engine/scenes.ts fellSeats), and its later\n    // stages stand the party back up; a wipe here would end a run that has\n    // not yet begun.\n    if (!nativeFrame.gameOver && !nativeFrame.pendingRespawn && !nativeFrame.scene && nativeFrame.seats.length > 0\n      && !nativeFrame.seats.some(s => !s.actor.dead && !s.actor.downed\n        && (!s.merc || MERC_CFG.mercsCanRevive))) {\n      for (const s of nativeFrame.seats) { s.actor.downed = false; s.actor.dead = true; }\n      nativeFrame.concludeWipe();\n    }\n}",
      "edits": [
        [
          1003,
          1007,
          "nativeFrame"
        ],
        [
          936,
          940,
          "nativeFrame"
        ],
        [
          808,
          812,
          "nativeFrame"
        ],
        [
          776,
          780,
          "nativeFrame"
        ],
        [
          762,
          766,
          "nativeFrame"
        ],
        [
          738,
          742,
          "nativeFrame"
        ],
        [
          720,
          724,
          "nativeFrame"
        ]
      ],
      "properties": [
        "concludeWipe",
        "gameOver",
        "pendingRespawn",
        "scene",
        "seats"
      ],
      "seams": []
    },
    {
      "name": "WorldRole",
      "from": 57,
      "to": 57,
      "start": 2355898,
      "end": 2356361,
      "firstLine": 42295,
      "lastLine": 42295,
      "before": "\n\n    // MYCELIA: feed the bloom per-zone event activity (it can't reach the sim) BEFORE the\n    // overlay ticks, then reconcile the biome warps it has saturated.\n    // THE PRIMARY GATE (shard M1, engine/shardUnits.ts): a sim unit skips the\n    // keeper's world sweeps below (the keeper ticks first and drains every world\n    // queue); off a shard there is no link and every sweep runs as it always did.\n    const unitWorld = this.shardWorld?.role === 'unit';",
      "after": "export function sceneNativeFrameWorldRole(nativeFrame:NativeFrameWorldRoleHost):boolean {\n\n    // MYCELIA: feed the bloom per-zone event activity (it can't reach the sim) BEFORE the\n    // overlay ticks, then reconcile the biome warps it has saturated.\n    // THE PRIMARY GATE (shard M1, engine/shardUnits.ts): a sim unit skips the\n    // keeper's world sweeps below (the keeper ticks first and drains every world\n    // queue); off a shard there is no link and every sweep runs as it always did.\n    const unitWorld = nativeFrame.shardWorld?.role === 'unit';\n    return unitWorld;\n}",
      "edits": [
        [
          430,
          434,
          "nativeFrame"
        ]
      ],
      "properties": [
        "shardWorld"
      ],
      "seams": []
    },
    {
      "name": "WorldSim",
      "from": 58,
      "to": 60,
      "start": 2356361,
      "end": 2356609,
      "firstLine": 42296,
      "lastLine": 42299,
      "before": "\n    if (!unitWorld) this.feedMyceliaActivity();\n    // Advance the living world (day/night, weather drift, faction territory).\n    if (!unitWorld) this.sim.update(dt, this.simView());\n    if (!unitWorld && !this.massRuntime) this.odyssey.update();",
      "after": "export function sceneNativeFrameWorldSim(nativeFrame:NativeFrameWorldSimHost,dt:number,unitWorld:boolean):void {\n    if (!unitWorld) nativeFrame.feedMyceliaActivity();\n    // Advance the living world (day/night, weather drift, faction territory).\n    if (!unitWorld) nativeFrame.sim.update(dt, nativeFrame.simView());\n    if (!unitWorld && !nativeFrame.massRuntime) nativeFrame.odyssey.update();\n}",
      "edits": [
        [
          226,
          230,
          "nativeFrame"
        ],
        [
          208,
          212,
          "nativeFrame"
        ],
        [
          168,
          172,
          "nativeFrame"
        ],
        [
          148,
          152,
          "nativeFrame"
        ],
        [
          21,
          25,
          "nativeFrame"
        ]
      ],
      "properties": [
        "feedMyceliaActivity",
        "massRuntime",
        "odyssey",
        "sim",
        "simView"
      ],
      "seams": []
    },
    {
      "name": "QuestRescues",
      "from": 61,
      "to": 61,
      "start": 2356609,
      "end": 2356705,
      "firstLine": 42300,
      "lastLine": 42300,
      "before": " // worldmass places have not adopted graph campaign targets yet\n    this.questRescues.update();",
      "after": "export function sceneNativeFrameQuestRescues(nativeFrame:NativeFrameQuestRescuesHost):void { // worldmass places have not adopted graph campaign targets yet\n    nativeFrame.questRescues.update();\n}",
      "edits": [
        [
          69,
          73,
          "nativeFrame"
        ]
      ],
      "properties": [
        "questRescues"
      ],
      "seams": []
    },
    {
      "name": "WorldLedger",
      "from": 62,
      "to": 67,
      "start": 2356705,
      "end": 2357518,
      "firstLine": 42303,
      "lastLine": 42313,
      "before": "\n    // THE FORECHART: keep the veiled halo minted ahead of the walker, and grow\n    // any far soundings the overlays have requested (world/forechart.ts).\n    if (!unitWorld && this.graphWorkAvailable()) this.updateForechart();\n    // THE SETTLE SWEEP: mint-time settles are local — chained displacement\n    // can leave a pair past the hover floor across a pool edge; the slow\n    // whole-chart pass self-heals it (no-op scan on a clean chart).\n    if (!unitWorld) this.updateWebSettle();\n    // THE OMENS: the world murmurs about what waits unfound (world/omens.ts).\n    if (!unitWorld) this.updateOmens();\n    // THE OBJECTIVE WEB: a class earned mid-run lands mid-run.\n    if (!unitWorld) this.updateDeedRecovery();\n    if (!unitWorld) this.sweepClassClaims();\n    if (!unitWorld) this.drainMyceliaLedger();",
      "after": "export function sceneNativeFrameWorldLedger(nativeFrame:NativeFrameWorldLedgerHost,unitWorld:boolean):void {\n    // THE FORECHART: keep the veiled halo minted ahead of the walker, and grow\n    // any far soundings the overlays have requested (world/forechart.ts).\n    if (!unitWorld && nativeFrame.graphWorkAvailable()) nativeFrame.updateForechart();\n    // THE SETTLE SWEEP: mint-time settles are local — chained displacement\n    // can leave a pair past the hover floor across a pool edge; the slow\n    // whole-chart pass self-heals it (no-op scan on a clean chart).\n    if (!unitWorld) nativeFrame.updateWebSettle();\n    // THE OMENS: the world murmurs about what waits unfound (world/omens.ts).\n    if (!unitWorld) nativeFrame.updateOmens();\n    // THE OBJECTIVE WEB: a class earned mid-run lands mid-run.\n    if (!unitWorld) nativeFrame.updateDeedRecovery();\n    if (!unitWorld) nativeFrame.sweepClassClaims();\n    if (!unitWorld) nativeFrame.drainMyceliaLedger();\n}",
      "edits": [
        [
          787,
          791,
          "nativeFrame"
        ],
        [
          742,
          746,
          "nativeFrame"
        ],
        [
          695,
          699,
          "nativeFrame"
        ],
        [
          591,
          595,
          "nativeFrame"
        ],
        [
          468,
          472,
          "nativeFrame"
        ],
        [
          205,
          209,
          "nativeFrame"
        ],
        [
          178,
          182,
          "nativeFrame"
        ]
      ],
      "properties": [
        "drainMyceliaLedger",
        "graphWorkAvailable",
        "sweepClassClaims",
        "updateDeedRecovery",
        "updateForechart",
        "updateOmens",
        "updateWebSettle"
      ],
      "seams": []
    },
    {
      "name": "Contagion",
      "from": 68,
      "to": 68,
      "start": 2357518,
      "end": 2357555,
      "firstLine": 42314,
      "lastLine": 42314,
      "before": "\n    this.updateContagionInfection();",
      "after": "export function sceneNativeFrameContagion(nativeFrame:NativeFrameContagionHost):void {\n    nativeFrame.updateContagionInfection();\n}",
      "edits": [
        [
          5,
          9,
          "nativeFrame"
        ]
      ],
      "properties": [
        "updateContagionInfection"
      ],
      "seams": []
    },
    {
      "name": "Deepwinter",
      "from": 69,
      "to": 69,
      "start": 2357555,
      "end": 2357603,
      "firstLine": 42315,
      "lastLine": 42315,
      "before": "\n    if (!unitWorld) this.reconcileDeepwinter();",
      "after": "export function sceneNativeFrameDeepwinter(nativeFrame:NativeFrameDeepwinterHost,unitWorld:boolean):void {\n    if (!unitWorld) nativeFrame.reconcileDeepwinter();\n}",
      "edits": [
        [
          21,
          25,
          "nativeFrame"
        ]
      ],
      "properties": [
        "reconcileDeepwinter"
      ],
      "seams": []
    },
    {
      "name": "LocalStreams",
      "from": 70,
      "to": 92,
      "start": 2357603,
      "end": 2358479,
      "firstLine": 42316,
      "lastLine": 42338,
      "before": "\n    this.updateStorm(dt);\n    this.updateDemonStorm(dt);\n    this.updateBombardment();\n    this.updateClutch(dt);\n    this.updateDeadwakeStream(dt);\n    this.updateHauntStream(dt);\n    this.updateStrayingScene(dt);\n    this.updateDroveScene(dt);\n    this.updateWispScene(dt);\n    this.updateQuickening(dt);\n    this.updateWraithsailDock();\n    this.updateLongNight(dt);\n    this.updateNecropolis();\n    this.updateMigrationStream(dt);\n    this.updateSwarmStream(dt);\n    this.updateWorldBosses(dt);\n    this.titans.update(dt);\n    this.updateBrigandRaid(dt);\n    this.updateNeutralCooldown(); // roused neutrals lose interest + re-dormant on disengage\n    this.pruneEngageTokens();     // stale/dead attack-token holders rotate out\n    this.updateLooters();         // scavengers snatch coveted ground drops\n    this.maybeOpenDemonPortal();\n    this.maybeOpenCrusadePortal();",
      "after": "export function sceneNativeFrameLocalStreams(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStorm(dt);\n    nativeFrame.updateDemonStorm(dt);\n    nativeFrame.updateBombardment();\n    nativeFrame.updateClutch(dt);\n    nativeFrame.updateDeadwakeStream(dt);\n    nativeFrame.updateHauntStream(dt);\n    nativeFrame.updateStrayingScene(dt);\n    nativeFrame.updateDroveScene(dt);\n    nativeFrame.updateWispScene(dt);\n    nativeFrame.updateQuickening(dt);\n    nativeFrame.updateWraithsailDock();\n    nativeFrame.updateLongNight(dt);\n    nativeFrame.updateNecropolis();\n    nativeFrame.updateMigrationStream(dt);\n    nativeFrame.updateSwarmStream(dt);\n    nativeFrame.updateWorldBosses(dt);\n    nativeFrame.titans.update(dt);\n    nativeFrame.updateBrigandRaid(dt);\n    nativeFrame.updateNeutralCooldown(); // roused neutrals lose interest + re-dormant on disengage\n    nativeFrame.pruneEngageTokens();     // stale/dead attack-token holders rotate out\n    nativeFrame.updateLooters();         // scavengers snatch coveted ground drops\n    nativeFrame.maybeOpenDemonPortal();\n    nativeFrame.maybeOpenCrusadePortal();\n}",
      "edits": [
        [
          846,
          850,
          "nativeFrame"
        ],
        [
          813,
          817,
          "nativeFrame"
        ],
        [
          737,
          741,
          "nativeFrame"
        ],
        [
          657,
          661,
          "nativeFrame"
        ],
        [
          564,
          568,
          "nativeFrame"
        ],
        [
          532,
          536,
          "nativeFrame"
        ],
        [
          504,
          508,
          "nativeFrame"
        ],
        [
          472,
          476,
          "nativeFrame"
        ],
        [
          440,
          444,
          "nativeFrame"
        ],
        [
          404,
          408,
          "nativeFrame"
        ],
        [
          375,
          379,
          "nativeFrame"
        ],
        [
          345,
          349,
          "nativeFrame"
        ],
        [
          312,
          316,
          "nativeFrame"
        ],
        [
          281,
          285,
          "nativeFrame"
        ],
        [
          251,
          255,
          "nativeFrame"
        ],
        [
          220,
          224,
          "nativeFrame"
        ],
        [
          186,
          190,
          "nativeFrame"
        ],
        [
          154,
          158,
          "nativeFrame"
        ],
        [
          119,
          123,
          "nativeFrame"
        ],
        [
          92,
          96,
          "nativeFrame"
        ],
        [
          62,
          66,
          "nativeFrame"
        ],
        [
          31,
          35,
          "nativeFrame"
        ],
        [
          5,
          9,
          "nativeFrame"
        ]
      ],
      "properties": [
        "maybeOpenCrusadePortal",
        "maybeOpenDemonPortal",
        "pruneEngageTokens",
        "titans",
        "updateBombardment",
        "updateBrigandRaid",
        "updateClutch",
        "updateDeadwakeStream",
        "updateDemonStorm",
        "updateDroveScene",
        "updateHauntStream",
        "updateLongNight",
        "updateLooters",
        "updateMigrationStream",
        "updateNecropolis",
        "updateNeutralCooldown",
        "updateQuickening",
        "updateStorm",
        "updateStrayingScene",
        "updateSwarmStream",
        "updateWispScene",
        "updateWorldBosses",
        "updateWraithsailDock"
      ],
      "seams": []
    },
    {
      "name": "Bulletins",
      "from": 93,
      "to": 93,
      "start": 2358479,
      "end": 2359126,
      "firstLine": 42346,
      "lastLine": 42348,
      "before": "\n    // WORLD BULLETINS (world/bulletins.ts): every registered source drains its\n    // fresh \"something happened somewhere\" lines — faction conquests, crusade\n    // front shifts, and any future overlay's notices — through ONE registry.\n    // A new overlay registers a source at import time; no engine edit.\n    // Lines land in THE NOTICE FEED (screen-anchored, stacked, per-line\n    // clocks, channel-curated at draw) — never in the overhead float lane,\n    // where world news used to fight the combat text for the same pixels.\n    if (!unitWorld) for (const b of collectBulletins(this)) {\n      pushNotice(this.notices, b, this.time);\n    }",
      "after": "export function sceneNativeFrameBulletins(nativeFrame:NativeFrameBulletinsHost,unitWorld:boolean):void {\n    // WORLD BULLETINS (world/bulletins.ts): every registered source drains its\n    // fresh \"something happened somewhere\" lines — faction conquests, crusade\n    // front shifts, and any future overlay's notices — through ONE registry.\n    // A new overlay registers a source at import time; no engine edit.\n    // Lines land in THE NOTICE FEED (screen-anchored, stacked, per-line\n    // clocks, channel-curated at draw) — never in the overhead float lane,\n    // where world news used to fight the combat text for the same pixels.\n    if (!unitWorld) for (const b of collectBulletins(nativeFrame)) {\n      pushNotice(nativeFrame.notices, b, nativeFrame.time);\n    }\n}",
      "edits": [
        [
          630,
          634,
          "nativeFrame"
        ],
        [
          613,
          617,
          "nativeFrame"
        ],
        [
          587,
          591,
          "nativeFrame"
        ]
      ],
      "properties": [
        "notices",
        "time"
      ],
      "seams": []
    },
    {
      "name": "WorldBridges",
      "from": 94,
      "to": 99,
      "start": 2359126,
      "end": 2361748,
      "firstLine": 42357,
      "lastLine": 42399,
      "before": "\n\n    // THE DEADWAKE collides: charted zones its tide has rolled onto AND won the\n    // consume roll on (the roll is the overlay's) have their active world-event\n    // CONSUMED outright — the player's OWN zone gets the stream instead, never\n    // consumed. The overlay emits the won zones; the engine bridges to the other\n    // fields (overlays can't reach each other), gated by the surge's `consume`\n    // toggles. Weather is intentionally excluded (a tide of the dead can't snuff\n    // the sky), so no weather here.\n    const dwf = this.sim.deadwakeField;\n    if (!unitWorld && dwf && dwf.consumedZones.length) {\n      const con = dwf.surge().consume;\n      for (const zid of dwf.consumedZones) {\n        if (con.demonInvasion) this.sim.demonFieldFor(this.zoneMap[zid]?.dimension)?.resolveInvasion(zid);\n        if (con.crusade) this.sim.crusadeField?.resolveCrusadeZone(zid);\n      }\n      dwf.consumedZones.length = 0;\n    }\n\n    // THE SWARMING preys on the herds and plants its roosts. Predation: while\n    // a wing is out, every live migration band is offered to the swarm field\n    // — the roll, the once-latch and the gorging live on the OVERLAY (its own\n    // rng, deterministic); the engine only bridges the two pure fields\n    // (overlays can't reach each other) and pays the ledger. Planting: a\n    // completed wing's far pole takes root — drained here into KEYED biome\n    // warps (restore re-queues them, so a resumed save re-roots).\n    const swf = this.sim.swarmingField;\n    if (!unitWorld && swf) {\n      const mf2 = this.sim.migrationField;\n      if (mf2) {\n        for (const herdId of swf.predate(mf2.herdBands())) {\n          if (mf2.consume(herdId)) bumpLedger(this.ledger, 'swarming_fed');\n        }\n      }\n      for (const p of swf.takeRoostWarps()) {\n        this.sim.biomeField.setWarp(`swarm_roost_${p.id}`, {\n          id: `swarm_roost_${p.id}`,\n          center: { x: p.x, y: p.y },\n          radius: p.radius, biome: p.biome, strength: p.strength,\n          label: 'A Swarming planted a brood ground — the sand takes root',\n        });\n      }\n    }\n\n    // WARBAND ARRIVALS: a host that just reached its target node, while YOU stand\n    // in that zone, marches in for real — a coherent pack at the entry it came by.\n    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains the arrivals once; the\n    // pack lands in the World standing in the target zone, and nowhere else.\n    if (!unitWorld) for (const host of this.sim.invasion.arrivals) {\n      this.atZone(host.targetZoneId, w => w.spawnWarband(host));\n    }\n    if (!unitWorld) this.sim.invasion.arrivals.length = 0;",
      "after": "export function sceneNativeFrameWorldBridges(nativeFrame:NativeFrameWorldBridgesHost,unitWorld:boolean):void {\n\n    // THE DEADWAKE collides: charted zones its tide has rolled onto AND won the\n    // consume roll on (the roll is the overlay's) have their active world-event\n    // CONSUMED outright — the player's OWN zone gets the stream instead, never\n    // consumed. The overlay emits the won zones; the engine bridges to the other\n    // fields (overlays can't reach each other), gated by the surge's `consume`\n    // toggles. Weather is intentionally excluded (a tide of the dead can't snuff\n    // the sky), so no weather here.\n    const dwf = nativeFrame.sim.deadwakeField;\n    if (!unitWorld && dwf && dwf.consumedZones.length) {\n      const con = dwf.surge().consume;\n      for (const zid of dwf.consumedZones) {\n        if (con.demonInvasion) nativeFrame.sim.demonFieldFor(nativeFrame.zoneMap[zid]?.dimension)?.resolveInvasion(zid);\n        if (con.crusade) nativeFrame.sim.crusadeField?.resolveCrusadeZone(zid);\n      }\n      dwf.consumedZones.length = 0;\n    }\n\n    // THE SWARMING preys on the herds and plants its roosts. Predation: while\n    // a wing is out, every live migration band is offered to the swarm field\n    // — the roll, the once-latch and the gorging live on the OVERLAY (its own\n    // rng, deterministic); the engine only bridges the two pure fields\n    // (overlays can't reach each other) and pays the ledger. Planting: a\n    // completed wing's far pole takes root — drained here into KEYED biome\n    // warps (restore re-queues them, so a resumed save re-roots).\n    const swf = nativeFrame.sim.swarmingField;\n    if (!unitWorld && swf) {\n      const mf2 = nativeFrame.sim.migrationField;\n      if (mf2) {\n        for (const herdId of swf.predate(mf2.herdBands())) {\n          if (mf2.consume(herdId)) bumpLedger(nativeFrame.ledger, 'swarming_fed');\n        }\n      }\n      for (const p of swf.takeRoostWarps()) {\n        nativeFrame.sim.biomeField.setWarp(`swarm_roost_${p.id}`, {\n          id: `swarm_roost_${p.id}`,\n          center: { x: p.x, y: p.y },\n          radius: p.radius, biome: p.biome, strength: p.strength,\n          label: 'A Swarming planted a brood ground — the sand takes root',\n        });\n      }\n    }\n\n    // WARBAND ARRIVALS: a host that just reached its target node, while YOU stand\n    // in that zone, marches in for real — a coherent pack at the entry it came by.\n    // THE SPLIT DISPATCH (shard M1-W3): the keeper drains the arrivals once; the\n    // pack lands in the World standing in the target zone, and nowhere else.\n    if (!unitWorld) for (const host of nativeFrame.sim.invasion.arrivals) {\n      nativeFrame.atZone(host.targetZoneId, w => w.spawnWarband(host));\n    }\n    if (!unitWorld) nativeFrame.sim.invasion.arrivals.length = 0;\n}",
      "edits": [
        [
          2584,
          2588,
          "nativeFrame"
        ],
        [
          2499,
          2503,
          "nativeFrame"
        ],
        [
          2463,
          2467,
          "nativeFrame"
        ],
        [
          1800,
          1804,
          "nativeFrame"
        ],
        [
          1698,
          1702,
          "nativeFrame"
        ],
        [
          1549,
          1553,
          "nativeFrame"
        ],
        [
          1478,
          1482,
          "nativeFrame"
        ],
        [
          838,
          842,
          "nativeFrame"
        ],
        [
          760,
          764,
          "nativeFrame"
        ],
        [
          737,
          741,
          "nativeFrame"
        ],
        [
          541,
          545,
          "nativeFrame"
        ]
      ],
      "properties": [
        "atZone",
        "ledger",
        "sim",
        "zoneMap"
      ],
      "seams": []
    },
    {
      "name": "WarbandMarches",
      "from": 100,
      "to": 100,
      "start": 2361748,
      "end": 2361781,
      "firstLine": 42400,
      "lastLine": 42400,
      "before": "\n    this.updateWarbandMarches();",
      "after": "export function sceneNativeFrameWarbandMarches(nativeFrame:NativeFrameWarbandMarchesHost):void {\n    nativeFrame.updateWarbandMarches();\n}",
      "edits": [
        [
          5,
          9,
          "nativeFrame"
        ]
      ],
      "properties": [
        "updateWarbandMarches"
      ],
      "seams": []
    },
    {
      "name": "WorldMints",
      "from": 101,
      "to": 110,
      "start": 2361781,
      "end": 2374675,
      "firstLine": 42411,
      "lastLine": 42610,
      "before": "\n\n    // DEMON INVASION: mint the epicenter zone at its coordinate (within the visible\n    // map) so the player can travel toward it and fight the Balor. Minted FLOATING\n    // — no forced road trail; a path forms as the player explores toward it (the\n    // floating-zone drain below). The pure overlay can't reach worldgen, so it\n    // queues requests we drain here (host/SP only — clients get it via sendZone).\n    //\n    // EVERY instance drains — each DIMENSION's rifts tear in its own graph:\n    // hell's epicenters carry hell's dimension/palette/level pressure and never\n    // touch the surface biome field (only surface events scorch the surface wash).\n    if (!unitWorld) for (const dfi of this.sim.demonFieldsAll()) {\n      if (!dfi.mintRequests.length) continue;\n      const dfDim = dfi.dimension; // undefined = the surface instance\n      for (const req of dfi.mintRequests) {\n        if (this.zoneMap[req.zoneKey]) { dfi.bindTarget(req.invId, req.zoneKey); continue; }\n        // BIOME: steer the rift toward EXISTING demon land (rift/volcanic) —\n        // placement preference, never transformation. LEVEL: the radial field\n        // at the (relocated) coord, not the player. (Hell needs no steering —\n        // its whole field is demon country already.)\n        const rl = dfDim ? { coord: req.coord, warpBiome: null as string | null }\n          : this.relocateToFactionBiome(req.coord, 'demon');\n        // THE TRANSIENCE LAW (docs/engine/transience.md): the invasion NEVER\n        // warps the biome field. On real demon country the mint field-resolves\n        // as ever (local rift-family face); with none near (rl.warpBiome set —\n        // the old scorch-warp case) the rift stands as an explicit INTRUSION:\n        // spec.tileset wins, wearing its own authored biome, and the land\n        // around it stays exactly what it was. Its in-zone presence is the\n        // pinned Demon Storm (event weather + dress), which lifts with the\n        // invasion — the map's storm ring is the only cartography it gets.\n        const anchor = this.zoneMap[req.anchorZoneId]\n          ?? nearestNode(this.zoneMap, rl.coord, undefined, dfDim)\n          ?? (dfDim ? this.zoneMap[dimensionDef(dfDim).entry?.gate.id ?? ''] : undefined)\n          ?? this.surfaceAnchor();\n        const def = placeZoneAt(rl.coord, anchor, this.zoneMap, this.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset,\n          level: this.eventLevel(rl.coord) + (dfDim ? dimensionDef(dfDim).levelBonus ?? 0 : 0),\n          objective: { kind: 'clear' }, forceWaypoint: true, forceFrontiers: 1, floating: true,\n          ...(rl.warpBiome ? {} : { fieldBiome: true }),\n          seed: (this.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n          biomeFor: dfDim ? this.dimensionBiomeFor(dfDim) : this.biomeFor,\n          biomeDepthFor: dfDim ? this.dimensionBiomeDepthFor(dfDim) : this.biomeDepthFor,\n          climateFor: this.climateFor,\n          ...(dfDim ? { dimension: dfDim } : {}),\n        });\n        def.eventOwned = true; // the demon epicenter — no other overlay squats here\n        this.zoneMap[req.zoneKey] = def;\n        // NB: NO sim.onNodeCharted here — a floating zone isn't on the graph yet\n        // (it seeds its territory when connectFloatingZone wires it in, below).\n        dfi.bindTarget(req.invId, req.zoneKey);\n        // Announce only invasions of the plane the player stands in — a hell\n        // rift tearing while you walk the surface stays hell's own business.\n        // THE OCCUPIED LAW (shard M1-W3): heard by whoever stands in that plane.\n        const hearers = this.occupiedAudience(z => (dfDim ?? 'surface') === (z.dimension ?? 'surface'));\n        if (hearers !== null) {\n          this.noticeOccupied(hearers, 'A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events');\n        }\n      }\n      dfi.mintRequests.length = 0;\n    }\n\n    // (THE WAR BELOW mints NOTHING: thrones are field anchors, the lords\n    // manifest only in zones the player explores — the underworld_war\n    // zone-runtime row. The war's whole footprint is the field itself.)\n\n    // (CRUSADES mint NOTHING on the overworld: a crusade is a warfield\n    // campaign — its territory IS the field, real zones under it raise the\n    // faction's works at generation from their local control, and the only\n    // minted ground is the throne ARENA through the sanctum gate. The engine's\n    // only overworld touch is the anchored biome claim + release in the warp\n    // sweep below.)\n    const cf = this.sim.crusadeField;\n\n    // CONCLAVE → ELDRITCH INCURSION: when the incubation counter maxes, the Conclave\n    // hands an ignition to the shared Incursion field (overlays can't reach each\n    // other — the engine bridges). The observer LANDS far off in the wilds.\n    const ig = unitWorld ? undefined : this.sim.conclaveField?.takeIgnition();\n    if (ig) {\n      // THE OCCUPIED LAW (shard M1-W3): the ignite level reads every occupied\n      // zone's level beside the world's character level (solo: the standing zone).\n      let level = this.player.level;\n      for (const w of this.presentWorlds()) level = Math.max(level, w.zone.level);\n      const info = this.sim.incursionField.ignite(ig.archetype, ig.origin, level);\n      if (info) this.notice(info.announce, info.color, 18, 'events');\n    }\n    // Drain incursion mints: a CLUSTER of hidden (concealed + floating) epicenter\n    // zones far from the charted frontier — the map neither draws them nor zooms to\n    // them; a road forms only when the player explores near. Each warps the biome\n    // field, locking its ground into the archetype's blight. (Host/SP only.)\n    const inc = this.sim.incursionField;\n    if (!unitWorld && inc.mintRequests.length) {\n      for (const req of inc.mintRequests) {\n        if (this.zoneMap[req.zoneKey]) { inc.bindEpicenter(req.id, req.zoneKey); continue; }\n        // Even an alien intrusion needs GROUND to blight — pulled ashore.\n        req.coord = this.pullToLand(req.coord);\n        const anchor = nearestNode(this.zoneMap, req.coord) ?? this.surfaceAnchor();\n        // An Incursion WARPS its ground to the blight (eldritch) — an alien intrusion,\n        // not a relocation — so its biome is intentionally fixed. LEVEL still obeys the\n        // radial field at its coord (not the player's level at ignition).\n        const def = placeZoneAt(req.coord, anchor, this.zoneMap, this.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset, level: this.eventLevel(req.coord),\n          objective: { kind: 'clear' }, floating: true, concealed: true, noFactionWar: true,\n          seed: (this.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n        });\n        def.eventOwned = true; // incursion epicenter — no other overlay squats here\n        this.zoneMap[req.zoneKey] = def;\n        // Re-anchor the overlay's epicenter (tentacles + intensity capsules) on\n        // where the zone ACTUALLY landed — ashore, post anti-crowd.\n        inc.bindEpicenter(req.id, req.zoneKey, def.map);\n        // KEYED blight warp (the transience law): the halo holds while the\n        // epicenter lives — the warp sweep below re-asserts it every beat\n        // (which also re-raises it on a resumed save) and RELEASES it when\n        // the Observer falls, so the stain fades off the healed land instead\n        // of scarring the world forever. Presentation + attribution only:\n        // ground minted inside it still comes out its TRUE biome.\n        this.sim.biomeField.setWarp(`incursion_${req.id}`, {\n          center: def.map, radius: req.biomeRadius, biome: req.biome, strength: req.biomeStrength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      inc.mintRequests.length = 0;\n    }\n\n    // EVENT WARPS RECEDE WITH THEIR EVENTS (the transience law,\n    // docs/engine/transience.md): every warp is keyed + owned, reconciled here\n    // against its owner's own liveness (peek) every beat — the live half\n    // RE-ASSERTS (which also re-raises warps a resumed save lost with the\n    // transient field), the dead half RELEASES (a gradual fade at\n    // BIOME_FIELD_CFG.warpFadePerSec — the land HEALS, it never snaps). Every\n    // ending — kill, burnout, collapse, package absent — heals by construction.\n    if (!unitWorld) this.warpSweepAcc += dt;\n    if (!unitWorld && this.warpSweepAcc >= 1) {\n      this.warpSweepAcc = 0;\n      const bf = this.sim.biomeField;\n      const liveEps = new Map<string, { coord: { x: number; y: number }; archetype: string }>();\n      for (const p of inc.peek()) {\n        for (const ep of p.epicenters) liveEps.set(ep.id, { coord: ep.coord, archetype: p.archetype });\n      }\n      for (const wid of bf.warpIds()) {\n        if (wid.startsWith('demon_')) {\n          // No producer since the transience pass (invasions never warp the\n          // field) — release any stale stain a mid-session module swap left.\n          bf.release(wid);\n        } else if (wid.startsWith('incursion_')) {\n          // The blight fades once its epicenter falls (or the whole landing\n          // collapses) — the deliberate inversion of the old permanent scar.\n          if (!liveEps.has(wid.slice('incursion_'.length))) bf.release(wid);\n        } else if (wid.startsWith('crusade_')) {\n          const cid = wid.slice('crusade_'.length);\n          if (!cf || !cf.peek().some(c => c.id === cid)) bf.release(wid);\n        } else if (wid.startsWith('swarm_roost_')) {\n          // A planted roost stands while its field remembers it (standing\n          // ecology BY the snapshot — and cullable: a culled roost, or a run\n          // without the package, heals within a beat).\n          const rid = wid.slice('swarm_roost_'.length);\n          if (!this.sim.swarmingField?.hasRoost(rid)) bf.release(wid);\n        }\n      }\n      // LIVE INCURSION EPICENTERS KEEP THEIR HALO: re-assert each bound\n      // epicenter's keyed warp (idempotent replace; also revives after a\n      // resume — the transient field carries nothing across saves itself).\n      for (const [epId, at] of liveEps) {\n        const a = INCURSION_ARCHETYPES[at.archetype];\n        if (!a) continue;\n        bf.setWarp(`incursion_${epId}`, {\n          center: { x: at.coord.x, y: at.coord.y }, radius: a.biomeWarp.radius,\n          biome: a.biome, strength: a.biomeWarp.strength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      // AN ANCHORED CRUSADE CLAIMS ITS GROUND: once the throne stands, the\n      // heartland's biome turns to the faction's own country (biomesForFaction\n      // — sylvan groves rise, graves spread for the dead). Keyed per crusade;\n      // the release branch above heals the land when the war breaks.\n      if (cf) {\n        const claimed = new Set(bf.warpIds());\n        for (const c of cf.peek()) {\n          if (!c.anchored || claimed.has(`crusade_${c.id}`)) continue;\n          const biome = biomesForFaction(c.faction)[0];\n          if (!biome) continue;\n          bf.setWarp(`crusade_${c.id}`, {\n            center: { x: c.heart.x, y: c.heart.y }, radius: cf.surge().field.wellRange,\n            biome, strength: 1, label: 'Crusade — the land turns to its faction\\'s country',\n          });\n        }\n      }\n    }\n\n    // FLOATING ZONES wire into the charted graph — a road forms (connectFloatingZone),\n    // so there's no forced trail at spawn: the player EXPLORES near one (any\n    // rift/quest target within APPROACH_RADIUS of the zone they're in) and the\n    // path appears as they approach. Host/SP only; new exits stream to clients\n    // via the zone snapshot; syncZoneExits() (below) surfaces the portal live\n    // if the road landed on the player's zone.\n    // THE OCCUPIED LAW (shard M1-W3): \"near the player\" is near any zone a\n    // player's World stands in (solo: the standing zone).\n    const posts = unitWorld ? [] : this.presentWorlds();\n    if (!unitWorld) for (const z of Object.values(this.zoneMap)) {\n      if (!z.floating) continue;\n      // Proximity only counts WITHIN a dimension — the planes share one\n      // coordinate space, and a hell rift must not wire in because the player\n      // walks surface ground that happens to overlap its numbers.\n      const nearPlayer = posts.some(w => (z.dimension ?? 'surface') === (w.zone.dimension ?? 'surface')\n        && Math.hypot(z.map.x - w.zone.map.x, z.map.y - w.zone.map.y) <= APPROACH_RADIUS);\n      if (!nearPlayer) continue;\n      connectFloatingZone(z, this.zoneMap, new Rng((this.manifest.seed ^ hashStr(z.id)) >>> 0), APPROACH_RADIUS, this.visited);\n      if (z.floating) continue; // no local road yet; retry as exploration grows\n      this.sim.onNodeCharted(z, this.simView()); // now on the graph — seed its territory\n      this.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n          : 'A path opens toward your quest!', '#c8a8e8', 15, 'world');\n    }",
      "after": "export function sceneNativeFrameWorldMints(nativeFrame:NativeFrameWorldMintsHost,dt:number,unitWorld:boolean):void {\n\n    // DEMON INVASION: mint the epicenter zone at its coordinate (within the visible\n    // map) so the player can travel toward it and fight the Balor. Minted FLOATING\n    // — no forced road trail; a path forms as the player explores toward it (the\n    // floating-zone drain below). The pure overlay can't reach worldgen, so it\n    // queues requests we drain here (host/SP only — clients get it via sendZone).\n    //\n    // EVERY instance drains — each DIMENSION's rifts tear in its own graph:\n    // hell's epicenters carry hell's dimension/palette/level pressure and never\n    // touch the surface biome field (only surface events scorch the surface wash).\n    if (!unitWorld) for (const dfi of nativeFrame.sim.demonFieldsAll()) {\n      if (!dfi.mintRequests.length) continue;\n      const dfDim = dfi.dimension; // undefined = the surface instance\n      for (const req of dfi.mintRequests) {\n        if (nativeFrame.zoneMap[req.zoneKey]) { dfi.bindTarget(req.invId, req.zoneKey); continue; }\n        // BIOME: steer the rift toward EXISTING demon land (rift/volcanic) —\n        // placement preference, never transformation. LEVEL: the radial field\n        // at the (relocated) coord, not the player. (Hell needs no steering —\n        // its whole field is demon country already.)\n        const rl = dfDim ? { coord: req.coord, warpBiome: null as string | null }\n          : nativeFrame.relocateToFactionBiome(req.coord, 'demon');\n        // THE TRANSIENCE LAW (docs/engine/transience.md): the invasion NEVER\n        // warps the biome field. On real demon country the mint field-resolves\n        // as ever (local rift-family face); with none near (rl.warpBiome set —\n        // the old scorch-warp case) the rift stands as an explicit INTRUSION:\n        // spec.tileset wins, wearing its own authored biome, and the land\n        // around it stays exactly what it was. Its in-zone presence is the\n        // pinned Demon Storm (event weather + dress), which lifts with the\n        // invasion — the map's storm ring is the only cartography it gets.\n        const anchor = nativeFrame.zoneMap[req.anchorZoneId]\n          ?? nearestNode(nativeFrame.zoneMap, rl.coord, undefined, dfDim)\n          ?? (dfDim ? nativeFrame.zoneMap[dimensionDef(dfDim).entry?.gate.id ?? ''] : undefined)\n          ?? nativeFrame.surfaceAnchor();\n        const def = placeZoneAt(rl.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset,\n          level: nativeFrame.eventLevel(rl.coord) + (dfDim ? dimensionDef(dfDim).levelBonus ?? 0 : 0),\n          objective: { kind: 'clear' }, forceWaypoint: true, forceFrontiers: 1, floating: true,\n          ...(rl.warpBiome ? {} : { fieldBiome: true }),\n          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n          biomeFor: dfDim ? nativeFrame.dimensionBiomeFor(dfDim) : nativeFrame.biomeFor,\n          biomeDepthFor: dfDim ? nativeFrame.dimensionBiomeDepthFor(dfDim) : nativeFrame.biomeDepthFor,\n          climateFor: nativeFrame.climateFor,\n          ...(dfDim ? { dimension: dfDim } : {}),\n        });\n        def.eventOwned = true; // the demon epicenter — no other overlay squats here\n        nativeFrame.zoneMap[req.zoneKey] = def;\n        // NB: NO sim.onNodeCharted here — a floating zone isn't on the graph yet\n        // (it seeds its territory when connectFloatingZone wires it in, below).\n        dfi.bindTarget(req.invId, req.zoneKey);\n        // Announce only invasions of the plane the player stands in — a hell\n        // rift tearing while you walk the surface stays hell's own business.\n        // THE OCCUPIED LAW (shard M1-W3): heard by whoever stands in that plane.\n        const hearers = nativeFrame.occupiedAudience(z => (dfDim ?? 'surface') === (z.dimension ?? 'surface'));\n        if (hearers !== null) {\n          nativeFrame.noticeOccupied(hearers, 'A demon-blighted rift tears open in the distance!', '#e8503c', 15, 'events');\n        }\n      }\n      dfi.mintRequests.length = 0;\n    }\n\n    // (THE WAR BELOW mints NOTHING: thrones are field anchors, the lords\n    // manifest only in zones the player explores — the underworld_war\n    // zone-runtime row. The war's whole footprint is the field itself.)\n\n    // (CRUSADES mint NOTHING on the overworld: a crusade is a warfield\n    // campaign — its territory IS the field, real zones under it raise the\n    // faction's works at generation from their local control, and the only\n    // minted ground is the throne ARENA through the sanctum gate. The engine's\n    // only overworld touch is the anchored biome claim + release in the warp\n    // sweep below.)\n    const cf = nativeFrame.sim.crusadeField;\n\n    // CONCLAVE → ELDRITCH INCURSION: when the incubation counter maxes, the Conclave\n    // hands an ignition to the shared Incursion field (overlays can't reach each\n    // other — the engine bridges). The observer LANDS far off in the wilds.\n    const ig = unitWorld ? undefined : nativeFrame.sim.conclaveField?.takeIgnition();\n    if (ig) {\n      // THE OCCUPIED LAW (shard M1-W3): the ignite level reads every occupied\n      // zone's level beside the world's character level (solo: the standing zone).\n      let level = nativeFrame.player.level;\n      for (const w of nativeFrame.presentWorlds()) level = Math.max(level, w.zone.level);\n      const info = nativeFrame.sim.incursionField.ignite(ig.archetype, ig.origin, level);\n      if (info) nativeFrame.notice(info.announce, info.color, 18, 'events');\n    }\n    // Drain incursion mints: a CLUSTER of hidden (concealed + floating) epicenter\n    // zones far from the charted frontier — the map neither draws them nor zooms to\n    // them; a road forms only when the player explores near. Each warps the biome\n    // field, locking its ground into the archetype's blight. (Host/SP only.)\n    const inc = nativeFrame.sim.incursionField;\n    if (!unitWorld && inc.mintRequests.length) {\n      for (const req of inc.mintRequests) {\n        if (nativeFrame.zoneMap[req.zoneKey]) { inc.bindEpicenter(req.id, req.zoneKey); continue; }\n        // Even an alien intrusion needs GROUND to blight — pulled ashore.\n        req.coord = nativeFrame.pullToLand(req.coord);\n        const anchor = nearestNode(nativeFrame.zoneMap, req.coord) ?? nativeFrame.surfaceAnchor();\n        // An Incursion WARPS its ground to the blight (eldritch) — an alien intrusion,\n        // not a relocation — so its biome is intentionally fixed. LEVEL still obeys the\n        // radial field at its coord (not the player's level at ignition).\n        const def = placeZoneAt(req.coord, anchor, nativeFrame.zoneMap, nativeFrame.nextGenId++, {\n          id: req.zoneKey, tileset: req.tileset, level: nativeFrame.eventLevel(req.coord),\n          objective: { kind: 'clear' }, floating: true, concealed: true, noFactionWar: true,\n          seed: (nativeFrame.manifest.seed ^ hashStr(req.zoneKey)) >>> 0,\n        });\n        def.eventOwned = true; // incursion epicenter — no other overlay squats here\n        nativeFrame.zoneMap[req.zoneKey] = def;\n        // Re-anchor the overlay's epicenter (tentacles + intensity capsules) on\n        // where the zone ACTUALLY landed — ashore, post anti-crowd.\n        inc.bindEpicenter(req.id, req.zoneKey, def.map);\n        // KEYED blight warp (the transience law): the halo holds while the\n        // epicenter lives — the warp sweep below re-asserts it every beat\n        // (which also re-raises it on a resumed save) and RELEASES it when\n        // the Observer falls, so the stain fades off the healed land instead\n        // of scarring the world forever. Presentation + attribution only:\n        // ground minted inside it still comes out its TRUE biome.\n        nativeFrame.sim.biomeField.setWarp(`incursion_${req.id}`, {\n          center: def.map, radius: req.biomeRadius, biome: req.biome, strength: req.biomeStrength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      inc.mintRequests.length = 0;\n    }\n\n    // EVENT WARPS RECEDE WITH THEIR EVENTS (the transience law,\n    // docs/engine/transience.md): every warp is keyed + owned, reconciled here\n    // against its owner's own liveness (peek) every beat — the live half\n    // RE-ASSERTS (which also re-raises warps a resumed save lost with the\n    // transient field), the dead half RELEASES (a gradual fade at\n    // BIOME_FIELD_CFG.warpFadePerSec — the land HEALS, it never snaps). Every\n    // ending — kill, burnout, collapse, package absent — heals by construction.\n    if (!unitWorld) nativeFrame.warpSweepAcc += dt;\n    if (!unitWorld && nativeFrame.warpSweepAcc >= 1) {\n      nativeFrame.warpSweepAcc = 0;\n      const bf = nativeFrame.sim.biomeField;\n      const liveEps = new Map<string, { coord: { x: number; y: number }; archetype: string }>();\n      for (const p of inc.peek()) {\n        for (const ep of p.epicenters) liveEps.set(ep.id, { coord: ep.coord, archetype: p.archetype });\n      }\n      for (const wid of bf.warpIds()) {\n        if (wid.startsWith('demon_')) {\n          // No producer since the transience pass (invasions never warp the\n          // field) — release any stale stain a mid-session module swap left.\n          bf.release(wid);\n        } else if (wid.startsWith('incursion_')) {\n          // The blight fades once its epicenter falls (or the whole landing\n          // collapses) — the deliberate inversion of the old permanent scar.\n          if (!liveEps.has(wid.slice('incursion_'.length))) bf.release(wid);\n        } else if (wid.startsWith('crusade_')) {\n          const cid = wid.slice('crusade_'.length);\n          if (!cf || !cf.peek().some(c => c.id === cid)) bf.release(wid);\n        } else if (wid.startsWith('swarm_roost_')) {\n          // A planted roost stands while its field remembers it (standing\n          // ecology BY the snapshot — and cullable: a culled roost, or a run\n          // without the package, heals within a beat).\n          const rid = wid.slice('swarm_roost_'.length);\n          if (!nativeFrame.sim.swarmingField?.hasRoost(rid)) bf.release(wid);\n        }\n      }\n      // LIVE INCURSION EPICENTERS KEEP THEIR HALO: re-assert each bound\n      // epicenter's keyed warp (idempotent replace; also revives after a\n      // resume — the transient field carries nothing across saves itself).\n      for (const [epId, at] of liveEps) {\n        const a = INCURSION_ARCHETYPES[at.archetype];\n        if (!a) continue;\n        bf.setWarp(`incursion_${epId}`, {\n          center: { x: at.coord.x, y: at.coord.y }, radius: a.biomeWarp.radius,\n          biome: a.biome, strength: a.biomeWarp.strength,\n          label: 'Eldritch incursion — the ground is blighted',\n        });\n      }\n      // AN ANCHORED CRUSADE CLAIMS ITS GROUND: once the throne stands, the\n      // heartland's biome turns to the faction's own country (biomesForFaction\n      // — sylvan groves rise, graves spread for the dead). Keyed per crusade;\n      // the release branch above heals the land when the war breaks.\n      if (cf) {\n        const claimed = new Set(bf.warpIds());\n        for (const c of cf.peek()) {\n          if (!c.anchored || claimed.has(`crusade_${c.id}`)) continue;\n          const biome = biomesForFaction(c.faction)[0];\n          if (!biome) continue;\n          bf.setWarp(`crusade_${c.id}`, {\n            center: { x: c.heart.x, y: c.heart.y }, radius: cf.surge().field.wellRange,\n            biome, strength: 1, label: 'Crusade — the land turns to its faction\\'s country',\n          });\n        }\n      }\n    }\n\n    // FLOATING ZONES wire into the charted graph — a road forms (connectFloatingZone),\n    // so there's no forced trail at spawn: the player EXPLORES near one (any\n    // rift/quest target within APPROACH_RADIUS of the zone they're in) and the\n    // path appears as they approach. Host/SP only; new exits stream to clients\n    // via the zone snapshot; syncZoneExits() (below) surfaces the portal live\n    // if the road landed on the player's zone.\n    // THE OCCUPIED LAW (shard M1-W3): \"near the player\" is near any zone a\n    // player's World stands in (solo: the standing zone).\n    const posts = unitWorld ? [] : nativeFrame.presentWorlds();\n    if (!unitWorld) for (const z of Object.values(nativeFrame.zoneMap)) {\n      if (!z.floating) continue;\n      // Proximity only counts WITHIN a dimension — the planes share one\n      // coordinate space, and a hell rift must not wire in because the player\n      // walks surface ground that happens to overlap its numbers.\n      const nearPlayer = posts.some(w => (z.dimension ?? 'surface') === (w.zone.dimension ?? 'surface')\n        && Math.hypot(z.map.x - w.zone.map.x, z.map.y - w.zone.map.y) <= APPROACH_RADIUS);\n      if (!nearPlayer) continue;\n      connectFloatingZone(z, nativeFrame.zoneMap, new Rng((nativeFrame.manifest.seed ^ hashStr(z.id)) >>> 0), APPROACH_RADIUS, nativeFrame.visited);\n      if (z.floating) continue; // no local road yet; retry as exploration grows\n      nativeFrame.sim.onNodeCharted(z, nativeFrame.simView()); // now on the graph — seed its territory\n      nativeFrame.notice(z.id.startsWith('demon_') ? 'A path opens toward the demon rift!'\n          : 'A path opens toward your quest!', '#c8a8e8', 15, 'world');\n    }\n}",
      "edits": [
        [
          12739,
          12743,
          "nativeFrame"
        ],
        [
          12675,
          12679,
          "nativeFrame"
        ],
        [
          12649,
          12653,
          "nativeFrame"
        ],
        [
          12547,
          12551,
          "nativeFrame"
        ],
        [
          12486,
          12490,
          "nativeFrame"
        ],
        [
          12463,
          12467,
          "nativeFrame"
        ],
        [
          11937,
          11941,
          "nativeFrame"
        ],
        [
          11865,
          11869,
          "nativeFrame"
        ],
        [
          9733,
          9737,
          "nativeFrame"
        ],
        [
          8414,
          8418,
          "nativeFrame"
        ],
        [
          8374,
          8378,
          "nativeFrame"
        ],
        [
          8342,
          8346,
          "nativeFrame"
        ],
        [
          8295,
          8299,
          "nativeFrame"
        ],
        [
          7476,
          7480,
          "nativeFrame"
        ],
        [
          6781,
          6785,
          "nativeFrame"
        ],
        [
          6626,
          6630,
          "nativeFrame"
        ],
        [
          6488,
          6492,
          "nativeFrame"
        ],
        [
          6412,
          6416,
          "nativeFrame"
        ],
        [
          6398,
          6402,
          "nativeFrame"
        ],
        [
          6073,
          6077,
          "nativeFrame"
        ],
        [
          6045,
          6049,
          "nativeFrame"
        ],
        [
          5982,
          5986,
          "nativeFrame"
        ],
        [
          5806,
          5810,
          "nativeFrame"
        ],
        [
          5676,
          5680,
          "nativeFrame"
        ],
        [
          5271,
          5275,
          "nativeFrame"
        ],
        [
          5191,
          5195,
          "nativeFrame"
        ],
        [
          5111,
          5115,
          "nativeFrame"
        ],
        [
          5070,
          5074,
          "nativeFrame"
        ],
        [
          4835,
          4839,
          "nativeFrame"
        ],
        [
          4527,
          4531,
          "nativeFrame"
        ],
        [
          3722,
          3726,
          "nativeFrame"
        ],
        [
          3599,
          3603,
          "nativeFrame"
        ],
        [
          3093,
          3097,
          "nativeFrame"
        ],
        [
          2921,
          2925,
          "nativeFrame"
        ],
        [
          2879,
          2883,
          "nativeFrame"
        ],
        [
          2842,
          2846,
          "nativeFrame"
        ],
        [
          2794,
          2798,
          "nativeFrame"
        ],
        [
          2762,
          2766,
          "nativeFrame"
        ],
        [
          2684,
          2688,
          "nativeFrame"
        ],
        [
          2435,
          2439,
          "nativeFrame"
        ],
        [
          2349,
          2353,
          "nativeFrame"
        ],
        [
          2335,
          2339,
          "nativeFrame"
        ],
        [
          2263,
          2267,
          "nativeFrame"
        ],
        [
          2182,
          2186,
          "nativeFrame"
        ],
        [
          2118,
          2122,
          "nativeFrame"
        ],
        [
          2062,
          2066,
          "nativeFrame"
        ],
        [
          1370,
          1374,
          "nativeFrame"
        ],
        [
          905,
          909,
          "nativeFrame"
        ],
        [
          703,
          707,
          "nativeFrame"
        ]
      ],
      "properties": [
        "biomeDepthFor",
        "biomeFor",
        "climateFor",
        "dimensionBiomeDepthFor",
        "dimensionBiomeFor",
        "eventLevel",
        "manifest",
        "nextGenId",
        "notice",
        "noticeOccupied",
        "occupiedAudience",
        "player",
        "presentWorlds",
        "pullToLand",
        "relocateToFactionBiome",
        "sim",
        "simView",
        "surfaceAnchor",
        "visited",
        "warpSweepAcc",
        "zoneMap"
      ],
      "seams": []
    },
    {
      "name": "RoadTail",
      "from": 233,
      "to": 241,
      "start": 2431771,
      "end": 2449390,
      "firstLine": 43736,
      "lastLine": 44039,
      "before": "\n\n    if (this.updateTownPortals(dt)) return; // travel ends this old-zone frame\n\n    // Waypoint attunement: brush against it once and it's yours for the run.\n    // A BESIEGED stone (the 'leyline' objective — waypointBesieged, the one\n    // predicate) REFUSES the brush while its siphon drinks: the refusal\n    // floats throttled, and the moment the thief falls the same brush\n    // attunes. Radius is data (LEYLINE_CFG.attuneRadius — the historical 70).\n    // THE ACTING SEAT: any standing player's brush attunes it (the touchers).\n    const wpAt = this.waypointPos;\n    if (wpAt && !this.discoveredWaypoints.has(this.zone.id)\n      && this.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the stone stands on the ground floor (placed on the base grid)\n        && dist(h.pos, wpAt) <= LEYLINE_CFG.attuneRadius)) {\n      if (this.waypointBesieged()) {\n        if (this.time - this.wpRefusedAt > 2.5) {\n          this.wpRefusedAt = this.time;\n          this.flashes.push({ pos: vec(wpAt.x, wpAt.y),\n            radius: LEYLINE_CFG.attuneRadius * 0.5, color: LEYLINE_CFG.beam, life: 0.5, maxLife: 0.5 });\n        }\n      } else {\n        this.discoveredWaypoints.add(this.zone.id);\n        this.flashes.push({\n          pos: vec(wpAt.x, wpAt.y),\n          radius: 50, color: '#5ad8d8', life: 0.5, maxLife: 0.5,\n        });\n      }\n    }\n\n    // Sidezone mouths (data/sidezones.ts): DWELL on one (stand idle) to descend\n    // — running OVER a mouth never yanks you under (mirrors the portal dwell).\n    // Just after climbing out you stand AT the mouth, so a grace flag holds\n    // until you step clear once — otherwise you'd dwell straight back down.\n    // Runs INSIDE sidezones too — that's the ladder (a deeper mouth in a cave\n    // is dwelled exactly like a surface one; enterSidezone stacks the way home).\n    // indoorsOnly kinds (the cellar hatch) also demand the player stand under\n    // the SAME ROOF as the mouth — nobody dwells a hatch through a house wall.\n    if (!this.player.dead && !this.player.downed && !this.traversal) {\n      // THE LIFT (shard M1 W2): the mouth scan is mouthUnder, shared with the\n      // shard scanner (engine/shardRoads.ts), which reads each seat's body.\n      const mouthIdx = this.mouthUnder(this.player);\n      if (this.caveExitGrace) {\n        if (mouthIdx < 0) this.caveExitGrace = false;\n        this.caveDwellIdx = -1;\n      } else {\n        // THE CONDITIONED DOOR's refusal read: standing on a door whose cond\n        // does NOT hold floats its schedule (throttled) — a closed barrow\n        // tells you it is closed, and roughly when it will not be. A SEALED\n        // mouth (sealedBy — the exhumation law) floats its own line through\n        // the same clock: the shut door names the ring that opens it. A\n        // hosted world speaks it per seat instead (the scanner's note row).\n        if (!this.shardWorld && mouthIdx < 0 && this.time - this.doorRefusalAt > 2.5) {\n          const shut = this.mouthRefusalUnder(this.player);\n          if (shut) {\n            this.doorRefusalAt = this.time;\n            this.text(vec(shut.pos.x, shut.pos.y - 26), shut.text, '#b8a8d8', 12);\n          }\n        }\n        // Dwell builds only while standing idle AND not being knocked (a knockback\n        // onto a mouth must never carry you under).\n        if (mouthIdx >= 0 && this.playerIdle() && !this.player.push) {\n          if (this.caveDwellIdx !== mouthIdx) { this.caveDwellIdx = mouthIdx; this.caveDwellStart = this.time; }\n          const cm = this.caveEntrances[mouthIdx];\n          if (this.time - this.caveDwellStart >= dwellOf(cm.kind)) {\n            this.caveDwellIdx = -1;\n            // A TRAVERSAL mouth (SidezoneDef.traversal — the geyser) rides the\n            // vertical-crossing cinematic: mint the pocket NOW (its `below`\n            // anchor sizes the understory capture), start the crossing, and\n            // step in behind the veil. Classic mouths keep the instant step.\n            const sz = sidezoneOf(cm.kind);\n            if (sz?.traversal) {\n              const dest = this.mintSidezone(cm);\n              const cap: TraversalCapture | undefined = dest?.below ? {\n                key: dest.id,\n                ox: dest.below.ax - dest.size.w / 2, oy: dest.below.ay - dest.size.h / 2,\n                w: dest.size.w, h: dest.size.h,\n              } : undefined;\n              if (dest && this.beginTraversal(sz.traversal, { capture: cap, swap: () => this.enterSidezone(cm) })) return;\n            }\n            this.enterSidezone(cm);\n            return; // everything else this frame belongs to the old zone\n          }\n        } else {\n          this.caveDwellIdx = -1;\n        }\n        // STRUCTURE DOORS: push (dwell) on a closed openable door and it swings.\n        // Idle remains valid; an opted-in slab also accepts deliberate walking\n        // toward it. Quiescence/story/mode gates and nearest pairing still win;\n        // ANY party seat can push (a co-op remote hero opens a gate the host\n        // never walked to). Per-door data may override the dwell time.\n        let onDoor: Doodad | null = null; let doorD = Infinity;\n        for (const seat of this.seats) {\n          const hero = seat.actor;\n          if (hero.dead || hero.downed || hero.push || !hero.isQuiescent()) continue;\n          const idle = this.seatIdle(seat);\n          for (const d of this.doodads) {\n            const dr = d.door;\n            if (!dr || dr.open || dr.broken) continue;\n            if (dr.mode !== 'dwell' && dr.mode !== 'both') continue;\n            if (!idle && !pressingDoor(dr.press, doorPressIntents?.get(seat.id), hero, d)) continue;\n            const dd = dist(hero.pos, d.pos);\n            // Reach honors the 'door' transit row ('radius' today: a push is\n            // contact — the plank itself is the occluder a ray would argue with).\n            // THE SAME-STORY LAW: a door swings only for a hero on ITS story\n            // (no pushing the inn's door open from the rooms above it).\n            if (dd <= d.radius + hero.radius + DOOR_REACH && dd < doorD\n              && this.dwellReachable(hero.pos, d.pos, transitReach('door'), { from: hero.tier ?? 0, to: d.tier ?? 0 })) { doorD = dd; onDoor = d; }\n          }\n        }\n        if (onDoor?.door) {\n          if (this.doorDwellId !== onDoor.door.id) {\n            this.doorDwellId = onDoor.door.id;\n            this.doorDwellStart = this.time;\n            this.doorDwellPos = vec(onDoor.pos.x, onDoor.pos.y);\n          }\n          if (this.time - this.doorDwellStart >= (onDoor.door.dwell ?? transitDwell('door'))) {\n            this.doorDwellId = '';\n            const lesson = onDoor.door.lesson;\n            this.setDoorState(onDoor.door.id, 'open');\n            // A TEACHING door (DoodadDoor.lesson) graduates the ACCOUNT on its\n            // first dwell-open — the flask-lesson pattern: any future copy of\n            // a door carrying this key mints already open (loadZone). The push\n            // was the tutorial; nobody is taught to open a door twice.\n            if (lesson && this.account && !(this.account.ledger[lesson] ?? 0)) {\n              this.account.ledger[lesson] = 1;\n              this.accountDirty = true;\n            }\n          }\n        } else {\n          this.doorDwellId = '';\n        }\n        // THE SWITCH LANE (the trapworks door lane — engine/trapworks.ts,\n        // docs/engine/trapworks.md). Two halves, one door-fabric seat:\n        // (1) LEVER PULLS: a lever is a DOOR-RECORD doodad (DoodadDoor.mode\n        //     'pull') — the pull IS the door sweep's own dwell grammar\n        //     (reach, idle, the ring, one-way persistence, the co-op doors\n        //     channel) with an honest verb. The sweep above skips 'pull'\n        //     records; the throw lands here: dwell done → the record opens\n        //     through THE one door gate (silently — the spring's announce\n        //     speaks instead) and every armed lever trapwork naming it\n        //     springs with the puller's credit. tw.pullStart is the truth;\n        //     the doorDwell trio is fed as a VIEW so the standing ring\n        //     draws the pull (the sweep clears the id each frame the hero\n        //     stands off dwell doors — feeding after it is the contract,\n        //     and render reads after update).\n        // (2) SWITCHED DOORS (DoodadDoor.mode 'switched'): the push never\n        //     opens them — a hero at one learns there IS a mechanism (the\n        //     conditioned-mouth refusal idiom, the shared refusal clock).\n        for (const tw of this.trapworks) {\n          const lt = tw.spec.trigger;\n          if (lt.kind !== 'lever' || tw.state !== 'armed' || !lt.door) continue;\n          const ld = this.doodads.find(x => x.door?.id === lt.door);\n          const rec = ld?.door;\n          if (!ld || !rec || rec.mode !== 'pull' || rec.open || rec.broken) { tw.pullStart = undefined; continue; }\n          let puller: Actor | null = null; let pullD = Infinity;\n          for (const seat of this.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed || hero.push || !this.seatIdle(seat)) continue;\n            const dd = dist(hero.pos, ld.pos);\n            if (dd <= ld.radius + hero.radius + DOOR_REACH && dd < pullD\n              && this.dwellReachable(hero.pos, ld.pos, transitReach('door'), this.storyPair(hero, ld))) { pullD = dd; puller = hero; }\n          }\n          if (!puller) { tw.pullStart = undefined; continue; }\n          tw.pullStart ??= this.time;\n          this.doorDwellId = rec.id;\n          this.doorDwellStart = tw.pullStart;\n          this.doorDwellPos = vec(ld.pos.x, ld.pos.y);\n          if (this.time - tw.pullStart >= (rec.dwell ?? transitDwell('door'))) {\n            tw.pullStart = undefined;\n            this.doorDwellId = '';\n            this.setDoorState(rec.id, 'open', { silent: true });\n            this.springTrapwork(tw, puller);\n          }\n        }\n        if (this.time - this.doorRefusalAt > 2.5) {\n          refuse: for (const seat of this.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed) continue;\n            for (const d of this.doodads) {\n              const dr = d.door;\n              if (!dr || dr.open || dr.broken || dr.mode !== 'switched') continue;\n              if (dist(hero.pos, d.pos) > d.radius + hero.radius + DOOR_REACH) continue;\n              this.doorRefusalAt = this.time;\n              this.text(vec(d.pos.x, d.pos.y - 26), 'held fast — some mechanism answers elsewhere…', '#c8b47a', 12);\n              break refuse;\n            }\n          }\n        }\n        // REALM GATES (demon rift / crusade sanctum / necropolis / fracture rift):\n        // DWELL on one (stand idle ~0.5s) to step through — so running OVER a gate\n        // never yanks you into a realm without meaning to (mirrors the portal + cave\n        // dwell; a knockback onto a gate can't carry you in either). Gather the open\n        // gates with their enter actions and dwell on the NEAREST one you stand on.\n        // THE LIFT (shard M1 W2): the gate list is realmGates and the nearest\n        // gate under a body gateUnder, shared with the shard scanner.\n        const gates = this.realmGates();\n        const onGate = this.gateUnder(this.player, gates);\n        if (onGate && this.playerIdle() && !this.player.push) {\n          if (this.realmDwellKey !== onGate.key) {\n            this.realmDwellKey = onGate.key; this.realmDwellKind = onGate.kind;\n            this.realmDwellPos = onGate.pos; this.realmDwellStart = this.time;\n          }\n          if (this.time - this.realmDwellStart >= transitDwell(`realm_gate:${onGate.kind}`)) {\n            this.realmDwellKey = '';\n            onGate.enter();\n            return; // entering a realm — the rest of this frame belongs to the old zone\n          }\n        } else {\n          this.realmDwellKey = ''; // stepped off / acting / knocked → the dwell resets\n        }\n        // ARENA WARD SEALS (data/arenas.ts): dwell one to SHATTER it — the same\n        // deliberate linger as every transit; the 'ward_seal' transit row sets\n        // the feel. Breaking the last seal manifests the warded boss.\n        if (this.arenaWard) {\n          const onSeal = this.wardSealUnder(this.player); // THE LIFT (shard M1 W2)\n          if (onSeal && this.playerIdle() && !this.player.push) {\n            if (this.wardDwellSeal !== onSeal) { this.wardDwellSeal = onSeal; this.wardDwellStart = this.time; }\n            if (this.time - this.wardDwellStart >= transitDwell(`ward_seal:${onSeal.kind}`)) {\n              this.wardDwellSeal = null;\n              this.breakArenaSeal(onSeal);\n            }\n          } else {\n            this.wardDwellSeal = null;\n          }\n        }\n        // HOLDFAST: dwell beside the toll keeper to pay (carried Essence, or a gem\n        // seized at random — the guardian's UnlockSpec decides). Only while the gate\n        // is sealed + the wardens un-roused — drawing steel cancels the parley. A\n        // CONSUMED latch ('done') keeps it from re-firing while you stand; it re-arms\n        // ONLY when you step out of the ring (one parley per approach — a refused\n        // toll or acting beside the keeper never re-prompts; the Dwell-gate\n        // discipline, hand-rolled for the ring).\n        const keeper = this.holdfastNear(this.player); // THE LIFT (shard M1 W2): the keeper when near, else null\n        const nearKeeper = !!keeper;\n        if (!nearKeeper) {\n          this.holdfastDwellKey = ''; // stepped out of the ring → re-arm\n        } else if (this.holdfastDwellKey !== 'done') {\n          if (this.playerIdle() && !this.player.push) {\n            if (this.holdfastDwellKey !== 'holdfast') { this.holdfastDwellKey = 'holdfast'; this.holdfastDwellPos = vec(keeper!.pos.x, keeper!.pos.y); this.holdfastDwellStart = this.time; }\n            if (this.time - this.holdfastDwellStart >= transitDwell('holdfast')) {\n              this.holdfastDwellKey = 'done'; // consumed — won't re-fire until you move away\n              this.onHoldfastDwell();\n            }\n          } else {\n            this.holdfastDwellKey = ''; // acting/knocked resets PROGRESS — never the consumed latch\n          }\n        }\n      }\n    }\n\n    // Encounter diamonds: step onto a dormant one to OPEN it. No return — you\n    // keep playing in this zone; the field grows around you and floods with foes.\n    // (EXTRACT encounters never step-open: theirs is the DWELL — an act of\n    // attention, armed by updateExtraction — a knockback across a seam must\n    // not start a defense.)\n    // THE ACTING SEAT: any standing player's step opens one (the touchers).\n    for (const h of this.touchers()) {\n      for (const e of this.encounters) {\n        if (e.phase !== 'dormant' || e.def.extract) continue;\n        // (THE SAME-STORY LAW: an encounter seats on the ground floor — a storey walker over it never steps it open.)\n        if (h.tier === 0 && dist(h.pos, e.pos) <= h.radius + e.def.trigger.activateRadius) {\n          this.openEncounter(e);\n        }\n      }\n    }\n\n    // Fractures: RUN OVER the volatile fracture object (no dwell — it's twitchy)\n    // to unleash the crawling fissure. No return; you keep playing as it crawls.\n    // THE ACTING SEAT: any standing player's run-over springs it.\n    const dormantRun = this.fractureRun?.phase === 'dormant' ? this.fractureRun : null;\n    if (dormantRun && this.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the fracture seats on the ground floor\n      && dist(h.pos, dormantRun.origin) <= h.radius + 26)) {\n      this.triggerFracture();\n    }\n\n    // Portals: DWELL on one (stand idle ~0.5s) to step through — so running OVER\n    // a boundary no longer yanks you to the next zone (crossing a boundary should\n    // never punish you). Sealed exits still nag; the minions follow on travel.\n    if (!this.player.dead && !this.player.downed) {\n      // THE LIFT (shard M1 W2): the exit scan is exitUnder and the lock's own\n      // word exitLockHint, shared with the shard scanner (each seat's own door).\n      const { onExit, lockedExit } = this.exitUnder(this.player);\n      if (!this.shardWorld && !onExit && lockedExit && this.lockHint <= 0) {\n        this.lockHint = 1.5;\n        const hint = this.exitLockHint(lockedExit);\n        this.text(vec(lockedExit.pos.x, lockedExit.pos.y - 40), hint.text, hint.color, 13);\n      }\n      // Dwell builds only while standing idle AND not being KNOCKED — a knockback\n      // onto a portal must never carry you off (it's not your intent). A live\n      // traversal owns the player outright — no portal can claim them mid-air.\n      if (onExit && this.playerIdle() && !this.player.push && !this.traversal) {\n        if (this.exitDwellIdx !== onExit.defIndex) { this.exitDwellIdx = onExit.defIndex; this.exitDwellStart = this.time; }\n        // A boundary-gate exit dwells on its own transit row (family-chained:\n        // 'zone_exit:<gate>' falls back to 'zone_exit' when no row is registered).\n        if (this.time - this.exitDwellStart >= transitDwell(onExit.boundary ? `zone_exit:${onExit.boundary}` : 'zone_exit')) {\n          this.travelThrough(onExit);\n          return; // everything else this frame belongs to the old zone\n        }\n      } else {\n        this.exitDwellIdx = -1; // stepped off / acting / knocked → the dwell resets\n      }\n    }\n    // THE ROADS PER PLAYER (shard M1 W2): on a hosted world every standing\n    // seat's roads are judged with its own body and leave as tickets\n    // (engine/shardRoads.ts); the block above reads only the parked warden.\n    if (this.shardWorld) scanShardRoads(this);",
      "after": "export function sceneNativeFrameRoadTail(nativeFrame:NativeFrameRoadTailHost,dt:number,doorPressIntents:World[\"doorPressIntents\"]):void {\n\n    if (nativeFrame.updateTownPortals(dt)) return; // travel ends this old-zone frame\n\n    // Waypoint attunement: brush against it once and it's yours for the run.\n    // A BESIEGED stone (the 'leyline' objective — waypointBesieged, the one\n    // predicate) REFUSES the brush while its siphon drinks: the refusal\n    // floats throttled, and the moment the thief falls the same brush\n    // attunes. Radius is data (LEYLINE_CFG.attuneRadius — the historical 70).\n    // THE ACTING SEAT: any standing player's brush attunes it (the touchers).\n    const wpAt = nativeFrame.waypointPos;\n    if (wpAt && !nativeFrame.discoveredWaypoints.has(nativeFrame.zone.id)\n      && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the stone stands on the ground floor (placed on the base grid)\n        && dist(h.pos, wpAt) <= LEYLINE_CFG.attuneRadius)) {\n      if (nativeFrame.waypointBesieged()) {\n        if (nativeFrame.time - nativeFrame.wpRefusedAt > 2.5) {\n          nativeFrame.wpRefusedAt = nativeFrame.time;\n          nativeFrame.flashes.push({ pos: vec(wpAt.x, wpAt.y),\n            radius: LEYLINE_CFG.attuneRadius * 0.5, color: LEYLINE_CFG.beam, life: 0.5, maxLife: 0.5 });\n        }\n      } else {\n        nativeFrame.discoveredWaypoints.add(nativeFrame.zone.id);\n        nativeFrame.flashes.push({\n          pos: vec(wpAt.x, wpAt.y),\n          radius: 50, color: '#5ad8d8', life: 0.5, maxLife: 0.5,\n        });\n      }\n    }\n\n    // Sidezone mouths (data/sidezones.ts): DWELL on one (stand idle) to descend\n    // — running OVER a mouth never yanks you under (mirrors the portal dwell).\n    // Just after climbing out you stand AT the mouth, so a grace flag holds\n    // until you step clear once — otherwise you'd dwell straight back down.\n    // Runs INSIDE sidezones too — that's the ladder (a deeper mouth in a cave\n    // is dwelled exactly like a surface one; enterSidezone stacks the way home).\n    // indoorsOnly kinds (the cellar hatch) also demand the player stand under\n    // the SAME ROOF as the mouth — nobody dwells a hatch through a house wall.\n    if (!nativeFrame.player.dead && !nativeFrame.player.downed && !nativeFrame.traversal) {\n      // THE LIFT (shard M1 W2): the mouth scan is mouthUnder, shared with the\n      // shard scanner (engine/shardRoads.ts), which reads each seat's body.\n      const mouthIdx = nativeFrame.mouthUnder(nativeFrame.player);\n      if (nativeFrame.caveExitGrace) {\n        if (mouthIdx < 0) nativeFrame.caveExitGrace = false;\n        nativeFrame.caveDwellIdx = -1;\n      } else {\n        // THE CONDITIONED DOOR's refusal read: standing on a door whose cond\n        // does NOT hold floats its schedule (throttled) — a closed barrow\n        // tells you it is closed, and roughly when it will not be. A SEALED\n        // mouth (sealedBy — the exhumation law) floats its own line through\n        // the same clock: the shut door names the ring that opens it. A\n        // hosted world speaks it per seat instead (the scanner's note row).\n        if (!nativeFrame.shardWorld && mouthIdx < 0 && nativeFrame.time - nativeFrame.doorRefusalAt > 2.5) {\n          const shut = nativeFrame.mouthRefusalUnder(nativeFrame.player);\n          if (shut) {\n            nativeFrame.doorRefusalAt = nativeFrame.time;\n            nativeFrame.text(vec(shut.pos.x, shut.pos.y - 26), shut.text, '#b8a8d8', 12);\n          }\n        }\n        // Dwell builds only while standing idle AND not being knocked (a knockback\n        // onto a mouth must never carry you under).\n        if (mouthIdx >= 0 && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n          if (nativeFrame.caveDwellIdx !== mouthIdx) { nativeFrame.caveDwellIdx = mouthIdx; nativeFrame.caveDwellStart = nativeFrame.time; }\n          const cm = nativeFrame.caveEntrances[mouthIdx];\n          if (nativeFrame.time - nativeFrame.caveDwellStart >= dwellOf(cm.kind)) {\n            nativeFrame.caveDwellIdx = -1;\n            // A TRAVERSAL mouth (SidezoneDef.traversal — the geyser) rides the\n            // vertical-crossing cinematic: mint the pocket NOW (its `below`\n            // anchor sizes the understory capture), start the crossing, and\n            // step in behind the veil. Classic mouths keep the instant step.\n            const sz = sidezoneOf(cm.kind);\n            if (sz?.traversal) {\n              const dest = nativeFrame.mintSidezone(cm);\n              const cap: TraversalCapture | undefined = dest?.below ? {\n                key: dest.id,\n                ox: dest.below.ax - dest.size.w / 2, oy: dest.below.ay - dest.size.h / 2,\n                w: dest.size.w, h: dest.size.h,\n              } : undefined;\n              if (dest && nativeFrame.beginTraversal(sz.traversal, { capture: cap, swap: () => nativeFrame.enterSidezone(cm) })) return;\n            }\n            nativeFrame.enterSidezone(cm);\n            return; // everything else this frame belongs to the old zone\n          }\n        } else {\n          nativeFrame.caveDwellIdx = -1;\n        }\n        // STRUCTURE DOORS: push (dwell) on a closed openable door and it swings.\n        // Idle remains valid; an opted-in slab also accepts deliberate walking\n        // toward it. Quiescence/story/mode gates and nearest pairing still win;\n        // ANY party seat can push (a co-op remote hero opens a gate the host\n        // never walked to). Per-door data may override the dwell time.\n        let onDoor: Doodad | null = null; let doorD = Infinity;\n        for (const seat of nativeFrame.seats) {\n          const hero = seat.actor;\n          if (hero.dead || hero.downed || hero.push || !hero.isQuiescent()) continue;\n          const idle = nativeFrame.seatIdle(seat);\n          for (const d of nativeFrame.doodads) {\n            const dr = d.door;\n            if (!dr || dr.open || dr.broken) continue;\n            if (dr.mode !== 'dwell' && dr.mode !== 'both') continue;\n            if (!idle && !pressingDoor(dr.press, doorPressIntents?.get(seat.id), hero, d)) continue;\n            const dd = dist(hero.pos, d.pos);\n            // Reach honors the 'door' transit row ('radius' today: a push is\n            // contact — the plank itself is the occluder a ray would argue with).\n            // THE SAME-STORY LAW: a door swings only for a hero on ITS story\n            // (no pushing the inn's door open from the rooms above it).\n            if (dd <= d.radius + hero.radius + DOOR_REACH && dd < doorD\n              && nativeFrame.dwellReachable(hero.pos, d.pos, transitReach('door'), { from: hero.tier ?? 0, to: d.tier ?? 0 })) { doorD = dd; onDoor = d; }\n          }\n        }\n        if (onDoor?.door) {\n          if (nativeFrame.doorDwellId !== onDoor.door.id) {\n            nativeFrame.doorDwellId = onDoor.door.id;\n            nativeFrame.doorDwellStart = nativeFrame.time;\n            nativeFrame.doorDwellPos = vec(onDoor.pos.x, onDoor.pos.y);\n          }\n          if (nativeFrame.time - nativeFrame.doorDwellStart >= (onDoor.door.dwell ?? transitDwell('door'))) {\n            nativeFrame.doorDwellId = '';\n            const lesson = onDoor.door.lesson;\n            nativeFrame.setDoorState(onDoor.door.id, 'open');\n            // A TEACHING door (DoodadDoor.lesson) graduates the ACCOUNT on its\n            // first dwell-open — the flask-lesson pattern: any future copy of\n            // a door carrying this key mints already open (loadZone). The push\n            // was the tutorial; nobody is taught to open a door twice.\n            if (lesson && nativeFrame.account && !(nativeFrame.account.ledger[lesson] ?? 0)) {\n              nativeFrame.account.ledger[lesson] = 1;\n              nativeFrame.accountDirty = true;\n            }\n          }\n        } else {\n          nativeFrame.doorDwellId = '';\n        }\n        // THE SWITCH LANE (the trapworks door lane — engine/trapworks.ts,\n        // docs/engine/trapworks.md). Two halves, one door-fabric seat:\n        // (1) LEVER PULLS: a lever is a DOOR-RECORD doodad (DoodadDoor.mode\n        //     'pull') — the pull IS the door sweep's own dwell grammar\n        //     (reach, idle, the ring, one-way persistence, the co-op doors\n        //     channel) with an honest verb. The sweep above skips 'pull'\n        //     records; the throw lands here: dwell done → the record opens\n        //     through THE one door gate (silently — the spring's announce\n        //     speaks instead) and every armed lever trapwork naming it\n        //     springs with the puller's credit. tw.pullStart is the truth;\n        //     the doorDwell trio is fed as a VIEW so the standing ring\n        //     draws the pull (the sweep clears the id each frame the hero\n        //     stands off dwell doors — feeding after it is the contract,\n        //     and render reads after update).\n        // (2) SWITCHED DOORS (DoodadDoor.mode 'switched'): the push never\n        //     opens them — a hero at one learns there IS a mechanism (the\n        //     conditioned-mouth refusal idiom, the shared refusal clock).\n        for (const tw of nativeFrame.trapworks) {\n          const lt = tw.spec.trigger;\n          if (lt.kind !== 'lever' || tw.state !== 'armed' || !lt.door) continue;\n          const ld = nativeFrame.doodads.find(x => x.door?.id === lt.door);\n          const rec = ld?.door;\n          if (!ld || !rec || rec.mode !== 'pull' || rec.open || rec.broken) { tw.pullStart = undefined; continue; }\n          let puller: Actor | null = null; let pullD = Infinity;\n          for (const seat of nativeFrame.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed || hero.push || !nativeFrame.seatIdle(seat)) continue;\n            const dd = dist(hero.pos, ld.pos);\n            if (dd <= ld.radius + hero.radius + DOOR_REACH && dd < pullD\n              && nativeFrame.dwellReachable(hero.pos, ld.pos, transitReach('door'), nativeFrame.storyPair(hero, ld))) { pullD = dd; puller = hero; }\n          }\n          if (!puller) { tw.pullStart = undefined; continue; }\n          tw.pullStart ??= nativeFrame.time;\n          nativeFrame.doorDwellId = rec.id;\n          nativeFrame.doorDwellStart = tw.pullStart;\n          nativeFrame.doorDwellPos = vec(ld.pos.x, ld.pos.y);\n          if (nativeFrame.time - tw.pullStart >= (rec.dwell ?? transitDwell('door'))) {\n            tw.pullStart = undefined;\n            nativeFrame.doorDwellId = '';\n            nativeFrame.setDoorState(rec.id, 'open', { silent: true });\n            nativeFrame.springTrapwork(tw, puller);\n          }\n        }\n        if (nativeFrame.time - nativeFrame.doorRefusalAt > 2.5) {\n          refuse: for (const seat of nativeFrame.seats) {\n            const hero = seat.actor;\n            if (hero.dead || hero.downed) continue;\n            for (const d of nativeFrame.doodads) {\n              const dr = d.door;\n              if (!dr || dr.open || dr.broken || dr.mode !== 'switched') continue;\n              if (dist(hero.pos, d.pos) > d.radius + hero.radius + DOOR_REACH) continue;\n              nativeFrame.doorRefusalAt = nativeFrame.time;\n              nativeFrame.text(vec(d.pos.x, d.pos.y - 26), 'held fast — some mechanism answers elsewhere…', '#c8b47a', 12);\n              break refuse;\n            }\n          }\n        }\n        // REALM GATES (demon rift / crusade sanctum / necropolis / fracture rift):\n        // DWELL on one (stand idle ~0.5s) to step through — so running OVER a gate\n        // never yanks you into a realm without meaning to (mirrors the portal + cave\n        // dwell; a knockback onto a gate can't carry you in either). Gather the open\n        // gates with their enter actions and dwell on the NEAREST one you stand on.\n        // THE LIFT (shard M1 W2): the gate list is realmGates and the nearest\n        // gate under a body gateUnder, shared with the shard scanner.\n        const gates = nativeFrame.realmGates();\n        const onGate = nativeFrame.gateUnder(nativeFrame.player, gates);\n        if (onGate && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n          if (nativeFrame.realmDwellKey !== onGate.key) {\n            nativeFrame.realmDwellKey = onGate.key; nativeFrame.realmDwellKind = onGate.kind;\n            nativeFrame.realmDwellPos = onGate.pos; nativeFrame.realmDwellStart = nativeFrame.time;\n          }\n          if (nativeFrame.time - nativeFrame.realmDwellStart >= transitDwell(`realm_gate:${onGate.kind}`)) {\n            nativeFrame.realmDwellKey = '';\n            onGate.enter();\n            return; // entering a realm — the rest of this frame belongs to the old zone\n          }\n        } else {\n          nativeFrame.realmDwellKey = ''; // stepped off / acting / knocked → the dwell resets\n        }\n        // ARENA WARD SEALS (data/arenas.ts): dwell one to SHATTER it — the same\n        // deliberate linger as every transit; the 'ward_seal' transit row sets\n        // the feel. Breaking the last seal manifests the warded boss.\n        if (nativeFrame.arenaWard) {\n          const onSeal = nativeFrame.wardSealUnder(nativeFrame.player); // THE LIFT (shard M1 W2)\n          if (onSeal && nativeFrame.playerIdle() && !nativeFrame.player.push) {\n            if (nativeFrame.wardDwellSeal !== onSeal) { nativeFrame.wardDwellSeal = onSeal; nativeFrame.wardDwellStart = nativeFrame.time; }\n            if (nativeFrame.time - nativeFrame.wardDwellStart >= transitDwell(`ward_seal:${onSeal.kind}`)) {\n              nativeFrame.wardDwellSeal = null;\n              nativeFrame.breakArenaSeal(onSeal);\n            }\n          } else {\n            nativeFrame.wardDwellSeal = null;\n          }\n        }\n        // HOLDFAST: dwell beside the toll keeper to pay (carried Essence, or a gem\n        // seized at random — the guardian's UnlockSpec decides). Only while the gate\n        // is sealed + the wardens un-roused — drawing steel cancels the parley. A\n        // CONSUMED latch ('done') keeps it from re-firing while you stand; it re-arms\n        // ONLY when you step out of the ring (one parley per approach — a refused\n        // toll or acting beside the keeper never re-prompts; the Dwell-gate\n        // discipline, hand-rolled for the ring).\n        const keeper = nativeFrame.holdfastNear(nativeFrame.player); // THE LIFT (shard M1 W2): the keeper when near, else null\n        const nearKeeper = !!keeper;\n        if (!nearKeeper) {\n          nativeFrame.holdfastDwellKey = ''; // stepped out of the ring → re-arm\n        } else if (nativeFrame.holdfastDwellKey !== 'done') {\n          if (nativeFrame.playerIdle() && !nativeFrame.player.push) {\n            if (nativeFrame.holdfastDwellKey !== 'holdfast') { nativeFrame.holdfastDwellKey = 'holdfast'; nativeFrame.holdfastDwellPos = vec(keeper!.pos.x, keeper!.pos.y); nativeFrame.holdfastDwellStart = nativeFrame.time; }\n            if (nativeFrame.time - nativeFrame.holdfastDwellStart >= transitDwell('holdfast')) {\n              nativeFrame.holdfastDwellKey = 'done'; // consumed — won't re-fire until you move away\n              nativeFrame.onHoldfastDwell();\n            }\n          } else {\n            nativeFrame.holdfastDwellKey = ''; // acting/knocked resets PROGRESS — never the consumed latch\n          }\n        }\n      }\n    }\n\n    // Encounter diamonds: step onto a dormant one to OPEN it. No return — you\n    // keep playing in this zone; the field grows around you and floods with foes.\n    // (EXTRACT encounters never step-open: theirs is the DWELL — an act of\n    // attention, armed by updateExtraction — a knockback across a seam must\n    // not start a defense.)\n    // THE ACTING SEAT: any standing player's step opens one (the touchers).\n    for (const h of nativeFrame.touchers()) {\n      for (const e of nativeFrame.encounters) {\n        if (e.phase !== 'dormant' || e.def.extract) continue;\n        // (THE SAME-STORY LAW: an encounter seats on the ground floor — a storey walker over it never steps it open.)\n        if (h.tier === 0 && dist(h.pos, e.pos) <= h.radius + e.def.trigger.activateRadius) {\n          nativeFrame.openEncounter(e);\n        }\n      }\n    }\n\n    // Fractures: RUN OVER the volatile fracture object (no dwell — it's twitchy)\n    // to unleash the crawling fissure. No return; you keep playing as it crawls.\n    // THE ACTING SEAT: any standing player's run-over springs it.\n    const dormantRun = nativeFrame.fractureRun?.phase === 'dormant' ? nativeFrame.fractureRun : null;\n    if (dormantRun && nativeFrame.touchers().some(h => h.tier === 0 // THE SAME-STORY LAW: the fracture seats on the ground floor\n      && dist(h.pos, dormantRun.origin) <= h.radius + 26)) {\n      nativeFrame.triggerFracture();\n    }\n\n    // Portals: DWELL on one (stand idle ~0.5s) to step through — so running OVER\n    // a boundary no longer yanks you to the next zone (crossing a boundary should\n    // never punish you). Sealed exits still nag; the minions follow on travel.\n    if (!nativeFrame.player.dead && !nativeFrame.player.downed) {\n      // THE LIFT (shard M1 W2): the exit scan is exitUnder and the lock's own\n      // word exitLockHint, shared with the shard scanner (each seat's own door).\n      const { onExit, lockedExit } = nativeFrame.exitUnder(nativeFrame.player);\n      if (!nativeFrame.shardWorld && !onExit && lockedExit && nativeFrame.lockHint <= 0) {\n        nativeFrame.lockHint = 1.5;\n        const hint = nativeFrame.exitLockHint(lockedExit);\n        nativeFrame.text(vec(lockedExit.pos.x, lockedExit.pos.y - 40), hint.text, hint.color, 13);\n      }\n      // Dwell builds only while standing idle AND not being KNOCKED — a knockback\n      // onto a portal must never carry you off (it's not your intent). A live\n      // traversal owns the player outright — no portal can claim them mid-air.\n      if (onExit && nativeFrame.playerIdle() && !nativeFrame.player.push && !nativeFrame.traversal) {\n        if (nativeFrame.exitDwellIdx !== onExit.defIndex) { nativeFrame.exitDwellIdx = onExit.defIndex; nativeFrame.exitDwellStart = nativeFrame.time; }\n        // A boundary-gate exit dwells on its own transit row (family-chained:\n        // 'zone_exit:<gate>' falls back to 'zone_exit' when no row is registered).\n        if (nativeFrame.time - nativeFrame.exitDwellStart >= transitDwell(onExit.boundary ? `zone_exit:${onExit.boundary}` : 'zone_exit')) {\n          nativeFrame.travelThrough(onExit);\n          return; // everything else this frame belongs to the old zone\n        }\n      } else {\n        nativeFrame.exitDwellIdx = -1; // stepped off / acting / knocked → the dwell resets\n      }\n    }\n    // THE ROADS PER PLAYER (shard M1 W2): on a hosted world every standing\n    // seat's roads are judged with its own body and leave as tickets\n    // (engine/shardRoads.ts); the block above reads only the parked warden.\n    if (nativeFrame.shardWorld) nativeFrame.scanShardRoads();\n}",
      "edits": [
        [
          17613,
          17617,
          "nativeFrame"
        ],
        [
          17581,
          17585,
          "nativeFrame"
        ],
        [
          17259,
          17263,
          "nativeFrame"
        ],
        [
          17126,
          17130,
          "nativeFrame"
        ],
        [
          17013,
          17017,
          "nativeFrame"
        ],
        [
          17001,
          17005,
          "nativeFrame"
        ],
        [
          16813,
          16817,
          "nativeFrame"
        ],
        [
          16791,
          16795,
          "nativeFrame"
        ],
        [
          16754,
          16758,
          "nativeFrame"
        ],
        [
          16713,
          16717,
          "nativeFrame"
        ],
        [
          16683,
          16687,
          "nativeFrame"
        ],
        [
          16662,
          16666,
          "nativeFrame"
        ],
        [
          16640,
          16644,
          "nativeFrame"
        ],
        [
          16286,
          16290,
          "nativeFrame"
        ],
        [
          16247,
          16251,
          "nativeFrame"
        ],
        [
          16205,
          16209,
          "nativeFrame"
        ],
        [
          16175,
          16179,
          "nativeFrame"
        ],
        [
          16131,
          16135,
          "nativeFrame"
        ],
        [
          16106,
          16110,
          "nativeFrame"
        ],
        [
          16091,
          16095,
          "nativeFrame"
        ],
        [
          15871,
          15875,
          "nativeFrame"
        ],
        [
          15850,
          15854,
          "nativeFrame"
        ],
        [
          15565,
          15569,
          "nativeFrame"
        ],
        [
          15397,
          15401,
          "nativeFrame"
        ],
        [
          15350,
          15354,
          "nativeFrame"
        ],
        [
          15310,
          15314,
          "nativeFrame"
        ],
        [
          15008,
          15012,
          "nativeFrame"
        ],
        [
          14705,
          14709,
          "nativeFrame"
        ],
        [
          14664,
          14668,
          "nativeFrame"
        ],
        [
          14097,
          14101,
          "nativeFrame"
        ],
        [
          14028,
          14032,
          "nativeFrame"
        ],
        [
          13934,
          13938,
          "nativeFrame"
        ],
        [
          13865,
          13869,
          "nativeFrame"
        ],
        [
          13853,
          13857,
          "nativeFrame"
        ],
        [
          13824,
          13828,
          "nativeFrame"
        ],
        [
          13798,
          13802,
          "nativeFrame"
        ],
        [
          13739,
          13743,
          "nativeFrame"
        ],
        [
          13703,
          13707,
          "nativeFrame"
        ],
        [
          13663,
          13667,
          "nativeFrame"
        ],
        [
          13627,
          13631,
          "nativeFrame"
        ],
        [
          13605,
          13609,
          "nativeFrame"
        ],
        [
          13555,
          13559,
          "nativeFrame"
        ],
        [
          13472,
          13476,
          "nativeFrame"
        ],
        [
          13325,
          13329,
          "nativeFrame"
        ],
        [
          13307,
          13311,
          "nativeFrame"
        ],
        [
          12685,
          12689,
          "nativeFrame"
        ],
        [
          12611,
          12615,
          "nativeFrame"
        ],
        [
          12570,
          12574,
          "nativeFrame"
        ],
        [
          12489,
          12493,
          "nativeFrame"
        ],
        [
          12477,
          12481,
          "nativeFrame"
        ],
        [
          12448,
          12452,
          "nativeFrame"
        ],
        [
          12426,
          12430,
          "nativeFrame"
        ],
        [
          12397,
          12401,
          "nativeFrame"
        ],
        [
          12364,
          12368,
          "nativeFrame"
        ],
        [
          12328,
          12332,
          "nativeFrame"
        ],
        [
          12306,
          12310,
          "nativeFrame"
        ],
        [
          12242,
          12246,
          "nativeFrame"
        ],
        [
          12223,
          12227,
          "nativeFrame"
        ],
        [
          12180,
          12184,
          "nativeFrame"
        ],
        [
          11848,
          11852,
          "nativeFrame"
        ],
        [
          11667,
          11671,
          "nativeFrame"
        ],
        [
          11586,
          11590,
          "nativeFrame"
        ],
        [
          11574,
          11578,
          "nativeFrame"
        ],
        [
          11537,
          11541,
          "nativeFrame"
        ],
        [
          11514,
          11518,
          "nativeFrame"
        ],
        [
          11481,
          11485,
          "nativeFrame"
        ],
        [
          11434,
          11438,
          "nativeFrame"
        ],
        [
          11401,
          11405,
          "nativeFrame"
        ],
        [
          11352,
          11356,
          "nativeFrame"
        ],
        [
          11318,
          11322,
          "nativeFrame"
        ],
        [
          11296,
          11300,
          "nativeFrame"
        ],
        [
          11253,
          11257,
          "nativeFrame"
        ],
        [
          11238,
          11242,
          "nativeFrame"
        ],
        [
          11196,
          11200,
          "nativeFrame"
        ],
        [
          10432,
          10436,
          "nativeFrame"
        ],
        [
          10407,
          10411,
          "nativeFrame"
        ],
        [
          10386,
          10390,
          "nativeFrame"
        ],
        [
          10151,
          10155,
          "nativeFrame"
        ],
        [
          10020,
          10024,
          "nativeFrame"
        ],
        [
          9955,
          9959,
          "nativeFrame"
        ],
        [
          9943,
          9947,
          "nativeFrame"
        ],
        [
          9876,
          9880,
          "nativeFrame"
        ],
        [
          9811,
          9815,
          "nativeFrame"
        ],
        [
          9776,
          9780,
          "nativeFrame"
        ],
        [
          9659,
          9663,
          "nativeFrame"
        ],
        [
          9600,
          9604,
          "nativeFrame"
        ],
        [
          9554,
          9558,
          "nativeFrame"
        ],
        [
          9517,
          9521,
          "nativeFrame"
        ],
        [
          9496,
          9500,
          "nativeFrame"
        ],
        [
          9336,
          9340,
          "nativeFrame"
        ],
        [
          9276,
          9280,
          "nativeFrame"
        ],
        [
          9108,
          9112,
          "nativeFrame"
        ],
        [
          8999,
          9003,
          "nativeFrame"
        ],
        [
          8709,
          8713,
          "nativeFrame"
        ],
        [
          8551,
          8555,
          "nativeFrame"
        ],
        [
          7255,
          7259,
          "nativeFrame"
        ],
        [
          7176,
          7180,
          "nativeFrame"
        ],
        [
          7129,
          7133,
          "nativeFrame"
        ],
        [
          7078,
          7082,
          "nativeFrame"
        ],
        [
          7060,
          7064,
          "nativeFrame"
        ],
        [
          6680,
          6684,
          "nativeFrame"
        ],
        [
          6598,
          6602,
          "nativeFrame"
        ],
        [
          6516,
          6520,
          "nativeFrame"
        ],
        [
          6504,
          6508,
          "nativeFrame"
        ],
        [
          6425,
          6429,
          "nativeFrame"
        ],
        [
          6402,
          6406,
          "nativeFrame"
        ],
        [
          6380,
          6384,
          "nativeFrame"
        ],
        [
          6333,
          6337,
          "nativeFrame"
        ],
        [
          6282,
          6286,
          "nativeFrame"
        ],
        [
          6087,
          6091,
          "nativeFrame"
        ],
        [
          5368,
          5372,
          "nativeFrame"
        ],
        [
          5321,
          5325,
          "nativeFrame"
        ],
        [
          5163,
          5167,
          "nativeFrame"
        ],
        [
          4645,
          4649,
          "nativeFrame"
        ],
        [
          4508,
          4512,
          "nativeFrame"
        ],
        [
          4447,
          4451,
          "nativeFrame"
        ],
        [
          4385,
          4389,
          "nativeFrame"
        ],
        [
          4067,
          4071,
          "nativeFrame"
        ],
        [
          3627,
          3631,
          "nativeFrame"
        ],
        [
          3572,
          3576,
          "nativeFrame"
        ],
        [
          3560,
          3564,
          "nativeFrame"
        ],
        [
          3516,
          3520,
          "nativeFrame"
        ],
        [
          3482,
          3486,
          "nativeFrame"
        ],
        [
          3460,
          3464,
          "nativeFrame"
        ],
        [
          3430,
          3434,
          "nativeFrame"
        ],
        [
          3396,
          3400,
          "nativeFrame"
        ],
        [
          3362,
          3366,
          "nativeFrame"
        ],
        [
          3340,
          3344,
          "nativeFrame"
        ],
        [
          3081,
          3085,
          "nativeFrame"
        ],
        [
          3058,
          3062,
          "nativeFrame"
        ],
        [
          3037,
          3041,
          "nativeFrame"
        ],
        [
          2989,
          2993,
          "nativeFrame"
        ],
        [
          2966,
          2970,
          "nativeFrame"
        ],
        [
          2915,
          2919,
          "nativeFrame"
        ],
        [
          2903,
          2907,
          "nativeFrame"
        ],
        [
          2868,
          2872,
          "nativeFrame"
        ],
        [
          2359,
          2363,
          "nativeFrame"
        ],
        [
          2323,
          2327,
          "nativeFrame"
        ],
        [
          2275,
          2279,
          "nativeFrame"
        ],
        [
          2251,
          2255,
          "nativeFrame"
        ],
        [
          2235,
          2239,
          "nativeFrame"
        ],
        [
          2038,
          2042,
          "nativeFrame"
        ],
        [
          2015,
          2019,
          "nativeFrame"
        ],
        [
          1994,
          1998,
          "nativeFrame"
        ],
        [
          1202,
          1206,
          "nativeFrame"
        ],
        [
          1179,
          1183,
          "nativeFrame"
        ],
        [
          1150,
          1154,
          "nativeFrame"
        ],
        [
          966,
          970,
          "nativeFrame"
        ],
        [
          945,
          949,
          "nativeFrame"
        ],
        [
          926,
          930,
          "nativeFrame"
        ],
        [
          890,
          894,
          "nativeFrame"
        ],
        [
          878,
          882,
          "nativeFrame"
        ],
        [
          839,
          843,
          "nativeFrame"
        ],
        [
          643,
          647,
          "nativeFrame"
        ],
        [
          620,
          624,
          "nativeFrame"
        ],
        [
          591,
          595,
          "nativeFrame"
        ],
        [
          556,
          560,
          "nativeFrame"
        ],
        [
          10,
          14,
          "nativeFrame"
        ]
      ],
      "properties": [
        "account",
        "accountDirty",
        "arenaWard",
        "beginTraversal",
        "breakArenaSeal",
        "caveDwellIdx",
        "caveDwellStart",
        "caveEntrances",
        "caveExitGrace",
        "discoveredWaypoints",
        "doodads",
        "doorDwellId",
        "doorDwellPos",
        "doorDwellStart",
        "doorRefusalAt",
        "dwellReachable",
        "encounters",
        "enterSidezone",
        "exitDwellIdx",
        "exitDwellStart",
        "exitLockHint",
        "exitUnder",
        "flashes",
        "fractureRun",
        "gateUnder",
        "holdfastDwellKey",
        "holdfastDwellPos",
        "holdfastDwellStart",
        "holdfastNear",
        "lockHint",
        "mintSidezone",
        "mouthRefusalUnder",
        "mouthUnder",
        "onHoldfastDwell",
        "openEncounter",
        "player",
        "playerIdle",
        "realmDwellKey",
        "realmDwellKind",
        "realmDwellPos",
        "realmDwellStart",
        "realmGates",
        "seatIdle",
        "seats",
        "setDoorState",
        "shardWorld",
        "springTrapwork",
        "storyPair",
        "text",
        "time",
        "touchers",
        "trapworks",
        "travelThrough",
        "traversal",
        "triggerFracture",
        "updateTownPortals",
        "wardDwellSeal",
        "wardDwellStart",
        "wardSealUnder",
        "waypointBesieged",
        "waypointPos",
        "wpRefusedAt",
        "zone"
      ],
      "seams": [
        {
          "from": "scanShardRoads(nativeFrame);",
          "to": "nativeFrame.scanShardRoads();"
        }
      ]
    }
  ],
  "partitions": [
    {
      "name": "RawArea",
      "functionName": "sceneNativeFrameRawArea",
      "before": "export function sceneNativeFrameRawArea(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    nativeFrame.updateHarvest(rawDt, dt);\n}",
      "after": "export function sceneNativeFrameRawArea(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    steps.sceneNativeFrameStep007(nativeFrame,rawDt,dt);\n    steps.sceneNativeFrameStep008(nativeFrame,rawDt,dt);\n}",
      "steps": [
        {
          "index": 7,
          "name": "sceneNativeFrameStep007",
          "source": "export function sceneNativeFrameStep007(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);\n}",
          "body": "\n    // THE SCENE DIRECTOR (engine/scenes.ts) breathes on the RAW clock,\n    // BEFORE the hold gate below — scenes own their freezes (a story card\n    // stops the sim under itself; the reckoning frees one actor) and must\n    // keep sequencing through them. It yields to 'menu' holds internally.\n    if (nativeFrame.scene) updateScene(nativeFrame, rawDt);",
          "args": "nativeFrame,rawDt,dt",
          "host": "NativeFrameRawAreaHost"
        },
        {
          "index": 8,
          "name": "sceneNativeFrameStep008",
          "source": "export function sceneNativeFrameStep008(nativeFrame:NativeFrameRawAreaHost,rawDt:number,dt:number):void {\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    nativeFrame.updateHarvest(rawDt, dt);\n}",
          "body": "\n    // THE RESOURCE HARVEST driver breathes on the same RAW clock — a rite's\n    // window must close through the very freeze it stands (the anti-memorize\n    // law: no hold, its own included, buys reading time). Arming rides the\n    // scaled dt inside, so a held world commits no new nodes.\n    nativeFrame.updateHarvest(rawDt, dt);",
          "args": "nativeFrame,rawDt,dt",
          "host": "NativeFrameRawAreaHost"
        }
      ]
    },
    {
      "name": "InteractionsBeforeHarbor",
      "functionName": "sceneNativeFrameInteractionsBeforeHarbor",
      "before": "export function sceneNativeFrameInteractionsBeforeHarbor(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook\n      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    nativeFrame.updateMireille(dt);\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    nativeFrame.updateCampfire(dt);\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    nativeFrame.updateSalvage(dt);\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    nativeFrame.updateBountyBoard(dt);\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    nativeFrame.updateTraces();\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    nativeFrame.updateFont(dt);\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    nativeFrame.updateTreePips();\n    // The Oracle stone opens the communion menu on a dwell.\n    nativeFrame.updateOracle(dt);\n    // The Tracker's fire opens the Bestiary on a dwell.\n    nativeFrame.updateTracker(dt);\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    nativeFrame.updateVendors(dt);\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    nativeFrame.updateCaravan(dt);\n    // The port dock's linger-to-sail (naval travel menu).\n    nativeFrame.updateSail(dt);\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    nativeFrame.updateHarborBoard(dt);\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    nativeFrame.updateMusterHorn(dt);\n    nativeFrame.updateHoldDefense(dt);\n}",
      "after": "export function sceneNativeFrameInteractionsBeforeHarbor(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    steps.sceneNativeFrameStep022(nativeFrame,dt);\n    steps.sceneNativeFrameStep023(nativeFrame,dt);\n    steps.sceneNativeFrameStep024(nativeFrame,dt);\n    steps.sceneNativeFrameStep025(nativeFrame,dt);\n    steps.sceneNativeFrameStep026(nativeFrame,dt);\n    steps.sceneNativeFrameStep027(nativeFrame,dt);\n    steps.sceneNativeFrameStep028(nativeFrame,dt);\n    steps.sceneNativeFrameStep029(nativeFrame,dt);\n    steps.sceneNativeFrameStep030(nativeFrame,dt);\n    steps.sceneNativeFrameStep031(nativeFrame,dt);\n    steps.sceneNativeFrameStep032(nativeFrame,dt);\n    steps.sceneNativeFrameStep033(nativeFrame,dt);\n    steps.sceneNativeFrameStep034(nativeFrame,dt);\n    steps.sceneNativeFrameStep035(nativeFrame,dt);\n    steps.sceneNativeFrameStep036(nativeFrame,dt);\n    steps.sceneNativeFrameStep037(nativeFrame,dt);\n    steps.sceneNativeFrameStep038(nativeFrame,dt);\n}",
      "steps": [
        {
          "index": 22,
          "name": "sceneNativeFrameStep022",
          "source": "export function sceneNativeFrameStep022(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook\n      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();\n}",
          "body": "\n\n    // Brandt restocks on the world clock (town only — stock is empty elsewhere).\n    // THE BEAT LAW's live edge: only where a counter NPC actually stands\n    // (the loadZone latch — a standing shelf elsewhere waits frozen for the\n    // return arm) and never on a NET client (the host's snapshot is the\n    // client's whole truth; accounts may even disagree on the quantum).\n    if (nativeFrame.zoneHasVendorCounter && !nativeFrame.clientActionHook\n      && nativeFrame.vendorRestockAt > 0 && nativeFrame.time >= nativeFrame.vendorRestockAt) nativeFrame.restockVendor();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 23,
          "name": "sceneNativeFrameStep023",
          "source": "export function sceneNativeFrameStep023(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();\n}",
          "body": "\n    // THE SHELF PER BUYER (card 29 ruled): on a hosted world each standing player here\n    // holds its own shelf, dealt from the shared beat.\n    if (nativeFrame.zoneHasVendorCounter && nativeFrame.localSeat.keeper && !nativeFrame.clientActionHook) nativeFrame.armBuyerShelves();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 24,
          "name": "sceneNativeFrameStep024",
          "source": "export function sceneNativeFrameStep024(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    nativeFrame.updateMireille(dt);\n}",
          "body": "\n\n    // Mireille heals you for lingering near her (proximity, not a keypress).\n    nativeFrame.updateMireille(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 25,
          "name": "sceneNativeFrameStep025",
          "source": "export function sceneNativeFrameStep025(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    nativeFrame.updateCampfire(dt);\n}",
          "body": "\n    // The campfire refreshes the wilds for lingering by it (town, feature-gated).\n    nativeFrame.updateCampfire(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 26,
          "name": "sceneNativeFrameStep026",
          "source": "export function sceneNativeFrameStep026(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    nativeFrame.updateSalvage(dt);\n}",
          "body": "\n    // The salvage bench opens the break/craft menu on a dwell (same flag idiom).\n    nativeFrame.updateSalvage(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 27,
          "name": "sceneNativeFrameStep027",
          "source": "export function sceneNativeFrameStep027(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    nativeFrame.updateBountyBoard(dt);\n}",
          "body": "\n    // The bounty board arms its beat's slate + opens the postings panel on a dwell.\n    nativeFrame.updateBountyBoard(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 28,
          "name": "sceneNativeFrameStep028",
          "source": "export function sceneNativeFrameStep028(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    nativeFrame.updateTraces();\n}",
          "body": "\n    // The forge's safety sweep (a dead or downed hand drops the pen).\n    nativeFrame.updateTraces();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 29,
          "name": "sceneNativeFrameStep029",
          "source": "export function sceneNativeFrameStep029(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    nativeFrame.updateFont(dt);\n}",
          "body": "\n    // A Sacrificial Font opens the Font screen on a dwell (same flag idiom).\n    nativeFrame.updateFont(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 30,
          "name": "sceneNativeFrameStep030",
          "source": "export function sceneNativeFrameStep030(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    nativeFrame.updateTreePips();\n}",
          "body": "\n    // A banked Ability-point pip offers its popup at the next disciplined calm.\n    nativeFrame.updateTreePips();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 31,
          "name": "sceneNativeFrameStep031",
          "source": "export function sceneNativeFrameStep031(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Oracle stone opens the communion menu on a dwell.\n    nativeFrame.updateOracle(dt);\n}",
          "body": "\n    // The Oracle stone opens the communion menu on a dwell.\n    nativeFrame.updateOracle(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 32,
          "name": "sceneNativeFrameStep032",
          "source": "export function sceneNativeFrameStep032(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Tracker's fire opens the Bestiary on a dwell.\n    nativeFrame.updateTracker(dt);\n}",
          "body": "\n    // The Tracker's fire opens the Bestiary on a dwell.\n    nativeFrame.updateTracker(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 33,
          "name": "sceneNativeFrameStep033",
          "source": "export function sceneNativeFrameStep033(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    nativeFrame.updateVendors(dt);\n}",
          "body": "\n    // Any stocked, registered vendor counter opens the Vendor screen on a dwell.\n    nativeFrame.updateVendors(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 34,
          "name": "sceneNativeFrameStep034",
          "source": "export function sceneNativeFrameStep034(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    nativeFrame.updateCaravan(dt);\n}",
          "body": "\n    // The Caravanner opens the band-travel menu on a dwell (a UI callback).\n    nativeFrame.updateCaravan(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 35,
          "name": "sceneNativeFrameStep035",
          "source": "export function sceneNativeFrameStep035(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The port dock's linger-to-sail (naval travel menu).\n    nativeFrame.updateSail(dt);\n}",
          "body": "\n    // The port dock's linger-to-sail (naval travel menu).\n    nativeFrame.updateSail(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 36,
          "name": "sceneNativeFrameStep036",
          "source": "export function sceneNativeFrameStep036(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    nativeFrame.updateHarborBoard(dt);\n}",
          "body": "\n    // The harbor board's linger-to-read (hearsay + passage + charts).\n    nativeFrame.updateHarborBoard(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 37,
          "name": "sceneNativeFrameStep037",
          "source": "export function sceneNativeFrameStep037(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    nativeFrame.updateMusterHorn(dt);\n}",
          "body": "\n    // The harborhold: the muster horn's linger, the plaza writ board, the\n    // live defense, and the world-wide lifecycle sweep (rebuilds, recurring\n    // sieges, deadlines).\n    nativeFrame.updateMusterHorn(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        },
        {
          "index": 38,
          "name": "sceneNativeFrameStep038",
          "source": "export function sceneNativeFrameStep038(nativeFrame:NativeFrameInteractionsBeforeHarborHost,dt:number):void {\n    nativeFrame.updateHoldDefense(dt);\n}",
          "body": "\n    nativeFrame.updateHoldDefense(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsBeforeHarborHost"
        }
      ]
    },
    {
      "name": "InteractionsAfterHarbor",
      "functionName": "sceneNativeFrameInteractionsAfterHarbor",
      "before": "export function sceneNativeFrameInteractionsAfterHarbor(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    nativeFrame.updateQuestGiver(dt);\n    nativeFrame.updateVocationSites();\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    nativeFrame.updateMercOutpost(dt);\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    nativeFrame.updateAmalgamation(dt);\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    nativeFrame.updateDelver(dt);\n    nativeFrame.updateDescent(dt);\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    nativeFrame.updateLightwells(dt);\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    nativeFrame.updateGloaming(dt);\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    nativeFrame.updateSailing(dt);\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    nativeFrame.updatePlayerCorpses(dt);\n    // Co-op: an ally lingering by a downed seat revives them.\n    nativeFrame.updateDownedSeats(dt);\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    nativeFrame.companionBonds.update(dt);\n    nativeFrame.challenges.update(dt);\n    nativeFrame.attackSequences.update(dt);\n    nativeFrame.guardArts.update(dt);\n    nativeFrame.updateDownedCompanions(dt);\n}",
      "after": "export function sceneNativeFrameInteractionsAfterHarbor(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    steps.sceneNativeFrameStep040(nativeFrame,dt);\n    steps.sceneNativeFrameStep041(nativeFrame,dt);\n    steps.sceneNativeFrameStep042(nativeFrame,dt);\n    steps.sceneNativeFrameStep043(nativeFrame,dt);\n    steps.sceneNativeFrameStep044(nativeFrame,dt);\n    steps.sceneNativeFrameStep045(nativeFrame,dt);\n    steps.sceneNativeFrameStep046(nativeFrame,dt);\n    steps.sceneNativeFrameStep047(nativeFrame,dt);\n    steps.sceneNativeFrameStep048(nativeFrame,dt);\n    steps.sceneNativeFrameStep049(nativeFrame,dt);\n    steps.sceneNativeFrameStep050(nativeFrame,dt);\n    steps.sceneNativeFrameStep051(nativeFrame,dt);\n    steps.sceneNativeFrameStep052(nativeFrame,dt);\n    steps.sceneNativeFrameStep053(nativeFrame,dt);\n    steps.sceneNativeFrameStep054(nativeFrame,dt);\n    steps.sceneNativeFrameStep055(nativeFrame,dt);\n}",
      "steps": [
        {
          "index": 40,
          "name": "sceneNativeFrameStep040",
          "source": "export function sceneNativeFrameStep040(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    nativeFrame.updateQuestGiver(dt);\n}",
          "body": "\n    // The quartermaster hands you a hunt for lingering (auto-accept on dwell).\n    nativeFrame.updateQuestGiver(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 41,
          "name": "sceneNativeFrameStep041",
          "source": "export function sceneNativeFrameStep041(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateVocationSites();\n}",
          "body": "\n    nativeFrame.updateVocationSites();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 42,
          "name": "sceneNativeFrameStep042",
          "source": "export function sceneNativeFrameStep042(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    nativeFrame.updateMercOutpost(dt);\n}",
          "body": "\n    // The mercenary outpost's calm parley dwell (hire blades / retire here).\n    nativeFrame.updateMercOutpost(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 43,
          "name": "sceneNativeFrameStep043",
          "source": "export function sceneNativeFrameStep043(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    nativeFrame.updateAmalgamation(dt);\n}",
          "body": "\n    // The Bonewright hands out amalgamation hunts + part picks (dwell-driven).\n    nativeFrame.updateAmalgamation(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 44,
          "name": "sceneNativeFrameStep044",
          "source": "export function sceneNativeFrameStep044(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    nativeFrame.updateDelver(dt);\n}",
          "body": "\n    // The Delver: dwell the shaft to descend; the abyss tick runs the dark + streaming.\n    nativeFrame.updateDelver(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 45,
          "name": "sceneNativeFrameStep045",
          "source": "export function sceneNativeFrameStep045(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateDescent(dt);\n}",
          "body": "\n    nativeFrame.updateDescent(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 46,
          "name": "sceneNativeFrameStep046",
          "source": "export function sceneNativeFrameStep046(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    nativeFrame.updateLightwells(dt);\n}",
          "body": "\n    // Lightwells: residents feed on the light, pooled wells drain + dim + gutter.\n    nativeFrame.updateLightwells(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 47,
          "name": "sceneNativeFrameStep047",
          "source": "export function sceneNativeFrameStep047(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    nativeFrame.updateGloaming(dt);\n}",
          "body": "\n    // The Gloaming: ease the zone's gloom, drain the unlit, field the wells.\n    nativeFrame.updateGloaming(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 48,
          "name": "sceneNativeFrameStep048",
          "source": "export function sceneNativeFrameStep048(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    nativeFrame.updateSailing(dt);\n}",
          "body": "\n    // The boat: stream the coast + watch for a landing dwell (the sailing mode).\n    nativeFrame.updateSailing(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 49,
          "name": "sceneNativeFrameStep049",
          "source": "export function sceneNativeFrameStep049(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    nativeFrame.updatePlayerCorpses(dt);\n}",
          "body": "\n    // Dwell beside a prior run's corpse to reclaim its lost gems.\n    nativeFrame.updatePlayerCorpses(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 50,
          "name": "sceneNativeFrameStep050",
          "source": "export function sceneNativeFrameStep050(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // Co-op: an ally lingering by a downed seat revives them.\n    nativeFrame.updateDownedSeats(dt);\n}",
          "body": "\n    // Co-op: an ally lingering by a downed seat revives them.\n    nativeFrame.updateDownedSeats(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 51,
          "name": "sceneNativeFrameStep051",
          "source": "export function sceneNativeFrameStep051(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    nativeFrame.companionBonds.update(dt);\n}",
          "body": "\n    // The same tending mends a downed COMPANION (the Hunter's bond).\n    nativeFrame.companionBonds.update(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 52,
          "name": "sceneNativeFrameStep052",
          "source": "export function sceneNativeFrameStep052(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.challenges.update(dt);\n}",
          "body": "\n    nativeFrame.challenges.update(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 53,
          "name": "sceneNativeFrameStep053",
          "source": "export function sceneNativeFrameStep053(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.attackSequences.update(dt);\n}",
          "body": "\n    nativeFrame.attackSequences.update(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 54,
          "name": "sceneNativeFrameStep054",
          "source": "export function sceneNativeFrameStep054(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.guardArts.update(dt);\n}",
          "body": "\n    nativeFrame.guardArts.update(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        },
        {
          "index": 55,
          "name": "sceneNativeFrameStep055",
          "source": "export function sceneNativeFrameStep055(nativeFrame:NativeFrameInteractionsAfterHarborHost,dt:number):void {\n    nativeFrame.updateDownedCompanions(dt);\n}",
          "body": "\n    nativeFrame.updateDownedCompanions(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameInteractionsAfterHarborHost"
        }
      ]
    },
    {
      "name": "LocalStreams",
      "functionName": "sceneNativeFrameLocalStreams",
      "before": "export function sceneNativeFrameLocalStreams(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStorm(dt);\n    nativeFrame.updateDemonStorm(dt);\n    nativeFrame.updateBombardment();\n    nativeFrame.updateClutch(dt);\n    nativeFrame.updateDeadwakeStream(dt);\n    nativeFrame.updateHauntStream(dt);\n    nativeFrame.updateStrayingScene(dt);\n    nativeFrame.updateDroveScene(dt);\n    nativeFrame.updateWispScene(dt);\n    nativeFrame.updateQuickening(dt);\n    nativeFrame.updateWraithsailDock();\n    nativeFrame.updateLongNight(dt);\n    nativeFrame.updateNecropolis();\n    nativeFrame.updateMigrationStream(dt);\n    nativeFrame.updateSwarmStream(dt);\n    nativeFrame.updateWorldBosses(dt);\n    nativeFrame.titans.update(dt);\n    nativeFrame.updateBrigandRaid(dt);\n    nativeFrame.updateNeutralCooldown(); // roused neutrals lose interest + re-dormant on disengage\n    nativeFrame.pruneEngageTokens();     // stale/dead attack-token holders rotate out\n    nativeFrame.updateLooters();         // scavengers snatch coveted ground drops\n    nativeFrame.maybeOpenDemonPortal();\n    nativeFrame.maybeOpenCrusadePortal();\n}",
      "after": "export function sceneNativeFrameLocalStreams(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    steps.sceneNativeFrameStep070(nativeFrame,dt);\n    steps.sceneNativeFrameStep071(nativeFrame,dt);\n    steps.sceneNativeFrameStep072(nativeFrame,dt);\n    steps.sceneNativeFrameStep073(nativeFrame,dt);\n    steps.sceneNativeFrameStep074(nativeFrame,dt);\n    steps.sceneNativeFrameStep075(nativeFrame,dt);\n    steps.sceneNativeFrameStep076(nativeFrame,dt);\n    steps.sceneNativeFrameStep077(nativeFrame,dt);\n    steps.sceneNativeFrameStep078(nativeFrame,dt);\n    steps.sceneNativeFrameStep079(nativeFrame,dt);\n    steps.sceneNativeFrameStep080(nativeFrame,dt);\n    steps.sceneNativeFrameStep081(nativeFrame,dt);\n    steps.sceneNativeFrameStep082(nativeFrame,dt);\n    steps.sceneNativeFrameStep083(nativeFrame,dt);\n    steps.sceneNativeFrameStep084(nativeFrame,dt);\n    steps.sceneNativeFrameStep085(nativeFrame,dt);\n    steps.sceneNativeFrameStep086(nativeFrame,dt);\n    steps.sceneNativeFrameStep087(nativeFrame,dt);\n    steps.sceneNativeFrameStep088(nativeFrame,dt);\n    steps.sceneNativeFrameStep089(nativeFrame,dt);\n    steps.sceneNativeFrameStep090(nativeFrame,dt);\n    steps.sceneNativeFrameStep091(nativeFrame,dt);\n    steps.sceneNativeFrameStep092(nativeFrame,dt);\n}",
      "steps": [
        {
          "index": 70,
          "name": "sceneNativeFrameStep070",
          "source": "export function sceneNativeFrameStep070(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStorm(dt);\n}",
          "body": "\n    nativeFrame.updateStorm(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 71,
          "name": "sceneNativeFrameStep071",
          "source": "export function sceneNativeFrameStep071(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDemonStorm(dt);\n}",
          "body": "\n    nativeFrame.updateDemonStorm(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 72,
          "name": "sceneNativeFrameStep072",
          "source": "export function sceneNativeFrameStep072(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateBombardment();\n}",
          "body": "\n    nativeFrame.updateBombardment();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 73,
          "name": "sceneNativeFrameStep073",
          "source": "export function sceneNativeFrameStep073(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateClutch(dt);\n}",
          "body": "\n    nativeFrame.updateClutch(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 74,
          "name": "sceneNativeFrameStep074",
          "source": "export function sceneNativeFrameStep074(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDeadwakeStream(dt);\n}",
          "body": "\n    nativeFrame.updateDeadwakeStream(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 75,
          "name": "sceneNativeFrameStep075",
          "source": "export function sceneNativeFrameStep075(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateHauntStream(dt);\n}",
          "body": "\n    nativeFrame.updateHauntStream(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 76,
          "name": "sceneNativeFrameStep076",
          "source": "export function sceneNativeFrameStep076(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateStrayingScene(dt);\n}",
          "body": "\n    nativeFrame.updateStrayingScene(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 77,
          "name": "sceneNativeFrameStep077",
          "source": "export function sceneNativeFrameStep077(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateDroveScene(dt);\n}",
          "body": "\n    nativeFrame.updateDroveScene(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 78,
          "name": "sceneNativeFrameStep078",
          "source": "export function sceneNativeFrameStep078(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWispScene(dt);\n}",
          "body": "\n    nativeFrame.updateWispScene(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 79,
          "name": "sceneNativeFrameStep079",
          "source": "export function sceneNativeFrameStep079(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateQuickening(dt);\n}",
          "body": "\n    nativeFrame.updateQuickening(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 80,
          "name": "sceneNativeFrameStep080",
          "source": "export function sceneNativeFrameStep080(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWraithsailDock();\n}",
          "body": "\n    nativeFrame.updateWraithsailDock();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 81,
          "name": "sceneNativeFrameStep081",
          "source": "export function sceneNativeFrameStep081(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateLongNight(dt);\n}",
          "body": "\n    nativeFrame.updateLongNight(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 82,
          "name": "sceneNativeFrameStep082",
          "source": "export function sceneNativeFrameStep082(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateNecropolis();\n}",
          "body": "\n    nativeFrame.updateNecropolis();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 83,
          "name": "sceneNativeFrameStep083",
          "source": "export function sceneNativeFrameStep083(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateMigrationStream(dt);\n}",
          "body": "\n    nativeFrame.updateMigrationStream(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 84,
          "name": "sceneNativeFrameStep084",
          "source": "export function sceneNativeFrameStep084(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateSwarmStream(dt);\n}",
          "body": "\n    nativeFrame.updateSwarmStream(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 85,
          "name": "sceneNativeFrameStep085",
          "source": "export function sceneNativeFrameStep085(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateWorldBosses(dt);\n}",
          "body": "\n    nativeFrame.updateWorldBosses(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 86,
          "name": "sceneNativeFrameStep086",
          "source": "export function sceneNativeFrameStep086(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.titans.update(dt);\n}",
          "body": "\n    nativeFrame.titans.update(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 87,
          "name": "sceneNativeFrameStep087",
          "source": "export function sceneNativeFrameStep087(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateBrigandRaid(dt);\n}",
          "body": "\n    nativeFrame.updateBrigandRaid(dt);",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 88,
          "name": "sceneNativeFrameStep088",
          "source": "export function sceneNativeFrameStep088(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.updateNeutralCooldown();\n}",
          "body": "\n    nativeFrame.updateNeutralCooldown();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 89,
          "name": "sceneNativeFrameStep089",
          "source": "export function sceneNativeFrameStep089(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void { // roused neutrals lose interest + re-dormant on disengage\n    nativeFrame.pruneEngageTokens();\n}",
          "body": " // roused neutrals lose interest + re-dormant on disengage\n    nativeFrame.pruneEngageTokens();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 90,
          "name": "sceneNativeFrameStep090",
          "source": "export function sceneNativeFrameStep090(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {     // stale/dead attack-token holders rotate out\n    nativeFrame.updateLooters();\n}",
          "body": "     // stale/dead attack-token holders rotate out\n    nativeFrame.updateLooters();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 91,
          "name": "sceneNativeFrameStep091",
          "source": "export function sceneNativeFrameStep091(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {         // scavengers snatch coveted ground drops\n    nativeFrame.maybeOpenDemonPortal();\n}",
          "body": "         // scavengers snatch coveted ground drops\n    nativeFrame.maybeOpenDemonPortal();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        },
        {
          "index": 92,
          "name": "sceneNativeFrameStep092",
          "source": "export function sceneNativeFrameStep092(nativeFrame:NativeFrameLocalStreamsHost,dt:number):void {\n    nativeFrame.maybeOpenCrusadePortal();\n}",
          "body": "\n    nativeFrame.maybeOpenCrusadePortal();",
          "args": "nativeFrame,dt",
          "host": "NativeFrameLocalStreamsHost"
        }
      ]
    }
  ],
  "road": {
    "before": "export function scanShardRoads(w: World): void {\n  const link = w.shardWorld;\n  if (!link) return;\n  const st = roadState(w), host = w.shardRoadHost();\n  // Rows of seats no longer here (a leave, a fall) fall away (self-healing).\n  const here = new Set<string>();\n  for (const s of w.seats) here.add(s.id);\n  for (const m of [st.dwell, st.door, st.ladder, st.heard] as Map<string, unknown>[]) for (const id of [...m.keys()]) if (!here.has(id)) m.delete(id);\n  for (const set of [st.grace, st.parley]) for (const id of [...set]) if (!here.has(id)) set.delete(id);\n  let gates: RealmGateRow[] | null = null;\n  for (const seat of w.seats) {\n    if (seat.keeper || seat.merc || seat.couch) continue;\n    const a = seat.actor, id = seat.id;\n    if (a.dead || a.downed) { st.dwell.delete(id); continue; }\n    const idle = w.seatIdle(seat) && !a.push;\n    // THE MUSTER RING (W4): while its party's ring stands in this unit, a member's roads wait for the party.\n    const bound = !!link.mustering?.(id);\n    /** The words this seat stands at this frame: [key, word, needs idle]. */\n    const words: [string, string, boolean][] = [];\n    let road: Road | null = null;\n    const mouthIdx = w.mouthUnder(a);\n    // THE EXIT GRACE: a climbed-out seat on its mouth holds no road but the\n    // exits until it stands clear (the solo block's caveExitGrace, per seat).\n    if (st.grace.has(id) && mouthIdx < 0) st.grace.delete(id);\n    if (!st.grace.has(id)) {\n      if (mouthIdx >= 0) {\n        const cm = host.caveEntrances[mouthIdx];\n        road = { key: `mouth:${cm.kind}:${Math.round(cm.pos.x)},${Math.round(cm.pos.y)}`, kind: `sidezone:${cm.kind}`, pos: cm.pos, need: dwellOf(cm.kind),\n          make: s => host.mouthRoad(s, cm) };\n      } else {\n        // THE CONDITIONED DOOR and THE SEALED MOUTH speak on the seat's own row.\n        const shut = w.mouthRefusalUnder(a);\n        if (shut) words.push([`door:${Math.round(shut.pos.x)},${Math.round(shut.pos.y)}`, shut.text, false]);\n      }\n      if (!road) {\n        const g = w.gateUnder(a, gates ??= w.realmGates());\n        if (g?.road) {\n          road = { key: `gate:${g.key}`, kind: `realm_gate:${g.kind}`, pos: g.pos, need: transitDwell(`realm_gate:${g.kind}`),\n            make: g.road };\n        } else if (g) words.push([`gate:${g.key}`, SHARD_ROADS_CFG.words.realm, true]);\n      }\n      if (!road) {\n        const seal = w.wardSealUnder(a);\n        if (seal) road = { key: `ward:${Math.round(seal.pos.x)},${Math.round(seal.pos.y)}`, kind: `ward_seal:${seal.kind}`, pos: seal.pos,\n          need: transitDwell(`ward_seal:${seal.kind}`), act: () => host.breakArenaSeal(seal) };\n      }\n      if (!road) {\n        // HOLDFAST: the parley is consumed per approach (the solo latch, per seat).\n        const keeper = w.holdfastNear(a);\n        if (!keeper) st.parley.delete(id);\n        else if (!st.parley.has(id)) {\n          road = { key: 'holdfast', kind: 'holdfast', pos: vec(keeper.pos.x, keeper.pos.y), need: transitDwell('holdfast'),\n            act: () => { st.parley.add(id); w.applyAction(seat, { t: 'payToll', index: -1 }); } };\n        }\n      }\n    }\n    if (!road) {\n      // THE RETREAT LAW: the exits judged from the seat's own door.\n      const { onExit, lockedExit } = w.exitUnder(a, seatDoorOf(w, seat));\n      if (onExit) {\n        const e = onExit, kind = e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit';\n        road = { key: `exit:${e.defIndex}`, kind, pos: e.pos, need: transitDwell(kind),\n          make: s => host.exitRoad(s, e) };\n      } else if (lockedExit) words.push([`lock:${lockedExit.defIndex}`, w.exitLockHint(lockedExit).text, false]);\n    }\n    // THE SEALED WORDS: the roads this world does not run yet.\n    const sealed = host.sealedRoadUnder(seat);\n    if (sealed) words.push([`sealed:${sealed.kind}`, SHARD_ROADS_CFG.words[sealed.kind], true]);\n    // THE MUSTER RING: a bound member builds no travel dwell (the ring is its road now).\n    if (bound && road?.make) road = null;\n    // The dwell: one road at a time, built only while idle and unshoved.\n    let cur = st.dwell.get(id);\n    if (road && idle) {\n      if (!cur || cur.key !== road.key) st.dwell.set(id, cur = { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), start: w.time, need: road.need });\n      if (w.time - cur.start >= cur.need) {\n        st.dwell.delete(id);\n        if (road.act) road.act();\n        else if (road.make) {\n          // THE MUSTER RING (W4): the party's muster takes the road first; an\n          // independent's (and a party alone in its unit) leaves at once.\n          const make = road.make;\n          if (!link.muster?.(seat, { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), make })) {\n            const t = make(seat);\n            if (t) link.enqueue(t);\n          }\n        }\n      }\n    } else st.dwell.delete(id);\n    // The words: once per approach, on the seat's own note row.\n    let heard = st.heard.get(id);\n    const standing = new Set<string>();\n    for (const [key, word, needsIdle] of words) {\n      standing.add(key);\n      if (heard?.has(key) || (needsIdle && !idle)) continue;\n      host.failNote(a, `road:${key}`, word);\n      if (!heard) st.heard.set(id, heard = new Set());\n      heard.add(key);\n    }\n    if (heard) for (const key of [...heard]) if (!standing.has(key)) heard.delete(key);\n  }\n}",
    "after": "export function scanNativeSceneRoads(w:NativeSceneRoadScanHost,state:NativeSceneRoadState): void {\n  const link = w.shardWorld;\n  if (!link) return;\n  const st = state, host = w.shardRoadHost();\n  // Rows of seats no longer here (a leave, a fall) fall away (self-healing).\n  const here = new Set<string>();\n  for (const s of w.seats) here.add(s.id);\n  for (const m of [st.dwell, st.door, st.ladder, st.heard] as Map<string, unknown>[]) for (const id of [...m.keys()]) if (!here.has(id)) m.delete(id);\n  for (const set of [st.grace, st.parley]) for (const id of [...set]) if (!here.has(id)) set.delete(id);\n  let gates: RealmGateRow<NativeAreaRoadDestination>[] | null = null;\n  for (const seat of w.seats) {\n    if (seat.keeper || seat.merc || seat.couch) continue;\n    const a = seat.actor, id = seat.id;\n    if (a.dead || a.downed) { st.dwell.delete(id); continue; }\n    const idle = w.seatIdle(seat) && !a.push;\n    // THE MUSTER RING (W4): while its party's ring stands in this unit, a member's roads wait for the party.\n    const bound = !!link.mustering?.(id);\n    /** The words this seat stands at this frame: [key, word, needs idle]. */\n    const words: [string, string, boolean][] = [];\n    let road: Road | null = null;\n    const mouthIdx = w.mouthUnder(a);\n    // THE EXIT GRACE: a climbed-out seat on its mouth holds no road but the\n    // exits until it stands clear (the solo block's caveExitGrace, per seat).\n    if (st.grace.has(id) && mouthIdx < 0) st.grace.delete(id);\n    if (!st.grace.has(id)) {\n      if (mouthIdx >= 0) {\n        const cm = host.caveEntrances[mouthIdx];\n        road = { key: `mouth:${cm.kind}:${Math.round(cm.pos.x)},${Math.round(cm.pos.y)}`, kind: `sidezone:${cm.kind}`, pos: cm.pos, need: dwellOf(cm.kind),\n          make: s => host.mouthRoad(s, cm) };\n      } else {\n        // THE CONDITIONED DOOR and THE SEALED MOUTH speak on the seat's own row.\n        const shut = w.mouthRefusalUnder(a);\n        if (shut) words.push([`door:${Math.round(shut.pos.x)},${Math.round(shut.pos.y)}`, shut.text, false]);\n      }\n      if (!road) {\n        const g = w.gateUnder(a, gates ??= w.realmGates());\n        if (g?.road) {\n          road = { key: `gate:${g.key}`, kind: `realm_gate:${g.kind}`, pos: g.pos, need: transitDwell(`realm_gate:${g.kind}`),\n            make: g.road };\n        } else if (g) words.push([`gate:${g.key}`, SHARD_ROADS_CFG.words.realm, true]);\n      }\n      if (!road) {\n        const seal = w.wardSealUnder(a);\n        if (seal) road = { key: `ward:${Math.round(seal.pos.x)},${Math.round(seal.pos.y)}`, kind: `ward_seal:${seal.kind}`, pos: seal.pos,\n          need: transitDwell(`ward_seal:${seal.kind}`), act: () => host.breakArenaSeal(seal) };\n      }\n      if (!road) {\n        // HOLDFAST: the parley is consumed per approach (the solo latch, per seat).\n        const keeper = w.holdfastNear(a);\n        if (!keeper) st.parley.delete(id);\n        else if (!st.parley.has(id)) {\n          road = { key: 'holdfast', kind: 'holdfast', pos: vec(keeper.pos.x, keeper.pos.y), need: transitDwell('holdfast'),\n            act: () => { st.parley.add(id); w.applyAction(seat, { t: 'payToll', index: -1 }); } };\n        }\n      }\n    }\n    if (!road) {\n      // THE RETREAT LAW: the exits judged from the seat's own door.\n      const { onExit, lockedExit } = w.exitUnder(a, w.seatDoorOf(seat));\n      if (onExit) {\n        const e = onExit, kind = e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit';\n        road = { key: `exit:${e.defIndex}`, kind, pos: e.pos, need: transitDwell(kind),\n          make: s => host.exitRoad(s, e) };\n      } else if (lockedExit) words.push([`lock:${lockedExit.defIndex}`, w.exitLockHint(lockedExit).text, false]);\n    }\n    // THE SEALED WORDS: the roads this world does not run yet.\n    const sealed = host.sealedRoadUnder(seat);\n    if (sealed) words.push([`sealed:${sealed.kind}`, SHARD_ROADS_CFG.words[sealed.kind], true]);\n    // THE MUSTER RING: a bound member builds no travel dwell (the ring is its road now).\n    if (bound && road?.make) road = null;\n    // The dwell: one road at a time, built only while idle and unshoved.\n    let cur = st.dwell.get(id);\n    if (road && idle) {\n      if (!cur || cur.key !== road.key) st.dwell.set(id, cur = { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), start: w.time, need: road.need });\n      if (w.time - cur.start >= cur.need) {\n        st.dwell.delete(id);\n        if (road.act) road.act();\n        else if (road.make) {\n          // THE MUSTER RING (W4): the party's muster takes the road first; an\n          // independent's (and a party alone in its unit) leaves at once.\n          const make = road.make;\n          if (!link.muster?.(seat, { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), make })) {\n            const t = make(seat);\n            if (t) link.enqueue(t);\n          }\n        }\n      }\n    } else st.dwell.delete(id);\n    // The words: once per approach, on the seat's own note row.\n    let heard = st.heard.get(id);\n    const standing = new Set<string>();\n    for (const [key, word, needsIdle] of words) {\n      standing.add(key);\n      if (heard?.has(key) || (needsIdle && !idle)) continue;\n      host.failNote(a, `road:${key}`, word);\n      if (!heard) st.heard.set(id, heard = new Set());\n      heard.add(key);\n    }\n    if (heard) for (const key of [...heard]) if (!standing.has(key)) heard.delete(key);\n  }\n}",
    "seams": [
      {
        "from": "const st = roadState(w), host = w.shardRoadHost();",
        "to": "const st = state, host = w.shardRoadHost();"
      },
      {
        "from": "seatDoorOf(w, seat)",
        "to": "w.seatDoorOf(seat)"
      },
      {
        "from": "RealmGateRow[]",
        "to": "RealmGateRow<NativeAreaRoadDestination>[]"
      }
    ]
  }
} as const;
