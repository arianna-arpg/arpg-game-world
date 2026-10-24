export interface NativeDesktopPerfRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeDesktopPerfArchive:{parent:string;rows:readonly NativeDesktopPerfRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
  "rows": [
    {
      "file": "balance/nativeShardProbeDeliveryFixture.ts",
      "predecessor": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
      "beforeHash": "cba5dfa9a13a1634be74ea392b886a13f7487aec1e180a4d39c118f63aa3ee99",
      "afterHash": "776233345c3307139db9bdda029a5c92c715443982a6782a31e7c1a17983985c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeDesktopPerfFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativeshardprobedeliverysource.ts",
      "predecessor": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
      "beforeHash": "1eadee5cdaed52e47798d3ed4852ba3ea1b06dd821d605fcf3bb6003793862a2",
      "afterHash": "6fc5b8e0d232ce99df21e0179f958aaac3b13a9d3791a9aa28e6257398d056eb",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the shard probe delivery source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the shard probe delivery source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeDesktopPerfFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
        }
      ]
    },
    {
      "file": "src/dev/perf.ts",
      "predecessor": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
      "beforeHash": "d681c5d714f2c719cb615390c301415fe5199217e76edf43e15ef68eab8c7081",
      "afterHash": "777890c24b47aa8cf84afe539f3e4fdca8c723aa7281db22b9ee95450839b83c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "//\n// Measures what the PLAYER'S frame does: a fresh run is started through the\n// real startGame path, one zone per tileset is minted through the real\n// placeZoneAt → loadZone pipeline (World.devMintTileset), and the hero WALKS\n// each zone under real requestAnimationFrame pacing — steered by the fake pad\n// through the true input path, invulnerable but TARGETABLE so combat pressure\n// stays honest. Telemetry comes from the main-loop ring buffers\n",
          "after": "//\n// Measures what the PLAYER'S frame does: a fresh run is started through the\n// real startGame path, one zone per tileset is minted through the real\n// placeZoneAt recipe and retained preparation/transfer, and the hero WALKS\n// each zone under real requestAnimationFrame pacing — steered by the fake pad\n// through the true input path, invulnerable but TARGETABLE so combat pressure\n// stays honest. Telemetry comes from the main-loop ring buffers\n"
        },
        {
          "before": "// boundless), so new biomes join the sweep the day they're authored.\n// ---------------------------------------------------------------------------\n\nimport { sidezoneOf } from '../data/sidezones';\nimport { TILESETS } from '../data/tilesets';\nimport { skyOf, START_ZONE } from '../data/zones';\n",
          "after": "// boundless), so new biomes join the sweep the day they're authored.\n// ---------------------------------------------------------------------------\n\nimport { retainedPerfTravel, withPerfProfile, assertPerfWalk, assertPerfFrames } from './nativePerfTravel';\nimport { sidezoneOf } from '../data/sidezones';\nimport { TILESETS } from '../data/tilesets';\nimport { skyOf, START_ZONE } from '../data/zones';\n"
        },
        {
          "before": "  layout: string;\n  doodads: number;\n  actors: number;\n  /** Live LITE-TIER pool rows when the window closed (engine/lite.ts —\n   *  the tide's census beside the actor count it undercuts). */\n  lite: number;\n",
          "after": "  layout: string;\n  doodads: number;\n  actors: number;\n  /** Whole retained campaign census, sampled after this window. */\n  residentAreas: number; residentActors: number;\n  worldSeconds: number; walkDistance: number; pausedFrames: number;\n  /** Live LITE-TIER pool rows when the window closed (engine/lite.ts —\n   *  the tide's census beside the actor count it undercuts). */\n  lite: number;\n"
        },
        {
          "before": "}\n\nexport interface PerfSweepReport {\n  control: PerfZoneStats;\n  /** THE AGED CONTROL: the SAME town, re-sampled after the last matrix row\n   *  (the 2026-08-01 acquittal: a run-global stall GROWS with sweep age and\n",
          "after": "}\n\nexport interface PerfSweepReport {\n  runtime: 'retained-native';\n  control: PerfZoneStats;\n  /** THE AGED CONTROL: the SAME town, re-sampled after the last matrix row\n   *  (the 2026-08-01 acquittal: a run-global stall GROWS with sweep age and\n"
        },
        {
          "before": "function reduceFrames(f: FrameDump, entryWorstGap: number, meta: {\n  tileset: string; zone: string; variant: string | null; layout: string;\n  doodads: number; actors: number; lite: number;\n  snowBakes: number; groundBakes: number; snowCover: number;\n  taskMax: number; offTask40: number; ltCount: number; ltWorst: number;\n  slabName: string; slabMs: number; entryNote: string; attempts: number;\n",
          "after": "function reduceFrames(f: FrameDump, entryWorstGap: number, meta: {\n  tileset: string; zone: string; variant: string | null; layout: string;\n  doodads: number; actors: number; lite: number;\n  residentAreas: number; residentActors: number;\n  worldSeconds: number; walkDistance: number; pausedFrames: number;\n  snowBakes: number; groundBakes: number; snowCover: number;\n  taskMax: number; offTask40: number; ltCount: number; ltWorst: number;\n  slabName: string; slabMs: number; entryNote: string; attempts: number;\n"
        },
        {
          "before": "    ltLedger.count = 0; ltLedger.worst = 0;\n  };\n\n  // A fresh probe run through the REAL start path (menus dismissed).\n  g.devStartRun(opts.classId);\n  beat('start');\n\n  // THE GATE PINS SCALE 1 (render/renderScale.ts): the sweep judges the\n",
          "after": "    ltLedger.count = 0; ltLedger.worst = 0;\n  };\n\n  try {\n  // A fresh probe run through the REAL start path (menus dismissed).\n  await g.hydrated();\n  withPerfProfile(g.account(), () => g.devStartRun(opts.classId), () => g.saveAccount());\n  const runtime = g.retained();\n  if (!runtime) throw new Error('perfSweep: retained native startup is missing');\n  const travel = retainedPerfTravel(runtime);\n  if (g.world().scene) throw new Error('perfSweep: a cinematic is still active');\n  beat('start');\n\n  // THE GATE PINS SCALE 1 (render/renderScale.ts): the sweep judges the\n"
        },
        {
          "before": "   *  stayed home; the caller owns the travel back and the restart. */\n  const walkPhase = async (ms: number, dir0 = 0.6): Promise<{\n    worst: number; held: boolean; taskMax: number; offTask40: number;\n    /** The OWN-work mark of the frame that owned the worst gap — the entry\n     *  annotation's discriminator (foreign freeze vs honest heavy frame). */\n    worstOwn: number;\n",
          "after": "   *  stayed home; the caller owns the travel back and the restart. */\n  const walkPhase = async (ms: number, dir0 = 0.6): Promise<{\n    worst: number; held: boolean; taskMax: number; offTask40: number;\n    worldSeconds: number; walkDistance: number; pausedFrames: number;\n    /** The OWN-work mark of the frame that owned the worst gap — the entry\n     *  annotation's discriminator (foreign freeze vs honest heavy frame). */\n    worstOwn: number;\n"
        },
        {
          "before": "  }> => {\n    const homeZid = g.world().zone.id;\n    let dir = dir0, worst = 0, worstOwn = Infinity;\n    // THE STALL LEDGER (the 2026-08-01 triad acquittal): the run-global\n    // stall lived AFTER perfPush by position — in neither the sim nor the\n    // ren bracket — and the meta pass then moved the autosave into idle\n",
          "after": "  }> => {\n    const homeZid = g.world().zone.id;\n    let dir = dir0, worst = 0, worstOwn = Infinity;\n    const worldStart = g.world().time;\n    let walkDistance = 0, pausedFrames = 0;\n    let walkPrevious = { ...g.world().player.pos };\n    // THE STALL LEDGER (the 2026-08-01 triad acquittal): the run-global\n    // stall lived AFTER perfPush by position — in neither the sim nor the\n    // ren bracket — and the meta pass then moved the autosave into idle\n"
        },
        {
          "before": "      // one-way collapse melt to the zone guard, the single fabric whose\n      // future no pure clock can read.\n      const zw = g.world();\n      const at = zw.player.pos;\n      // THE RHYTHM WHISKER (see FLUX_CROSS_SEC): flux ground answers for\n      // its FUTURE, not just its present — a pad must read walkable at\n",
          "after": "      // one-way collapse melt to the zone guard, the single fabric whose\n      // future no pure clock can read.\n      const zw = g.world();\n      const fallHazardAt = travel.hazards();\n      const at = zw.player.pos;\n      // THE RHYTHM WHISKER (see FLUX_CROSS_SEC): flux ground answers for\n      // its FUTURE, not just its present — a pad must read walkable at\n"
        },
        {
          "before": "        const mx = at.x + Math.cos(a) * reach * 0.5, my = at.y + Math.sin(a) * reach * 0.5;\n        const ex = at.x + Math.cos(a) * reach, ey = at.y + Math.sin(a) * reach;\n        return inField(mx, my) && inField(ex, ey)\n          && !zw.fallHazardAt(zw.player, mx, my) && !zw.fallHazardAt(zw.player, ex, ey)\n          && fluxHolds(mx, my, reach * 0.5 / strideNow)\n          && fluxHolds(ex, ey, reach / strideNow)\n          && spanHolds(mx, my, reach * 0.5 / strideNow)\n",
          "after": "        const mx = at.x + Math.cos(a) * reach * 0.5, my = at.y + Math.sin(a) * reach * 0.5;\n        const ex = at.x + Math.cos(a) * reach, ey = at.y + Math.sin(a) * reach;\n        return inField(mx, my) && inField(ex, ey)\n          && !fallHazardAt(zw.player, mx, my) && !fallHazardAt(zw.player, ex, ey)\n          && fluxHolds(mx, my, reach * 0.5 / strideNow)\n          && fluxHolds(ex, ey, reach / strideNow)\n          && spanHolds(mx, my, reach * 0.5 / strideNow)\n"
        },
        {
          "before": "        // least stays out of the void — along the fading span toward its\n        // end is exactly what a player caught mid-crossing does.\n        const ownSafe = fluxHolds(at.x, at.y, 0) && spanHolds(at.x, at.y, 0)\n          && !zw.fallHazardAt(zw.player, at.x, at.y)\n          && !streakThreat(at.x, at.y, STREAK_HORIZON_SEC) // never stand in a comet's path\n          && !mouthNear(at.x, at.y); // never PARK inside a door's dwell disc\n        if (ownSafe) {\n",
          "after": "        // least stays out of the void — along the fading span toward its\n        // end is exactly what a player caught mid-crossing does.\n        const ownSafe = fluxHolds(at.x, at.y, 0) && spanHolds(at.x, at.y, 0)\n          && !fallHazardAt(zw.player, at.x, at.y)\n          && !streakThreat(at.x, at.y, STREAK_HORIZON_SEC) // never stand in a comet's path\n          && !mouthNear(at.x, at.y); // never PARK inside a door's dwell disc\n        if (ownSafe) {\n"
        },
        {
          "before": "            const mx = at.x + Math.cos(a2) * r * 0.5, my = at.y + Math.sin(a2) * r * 0.5;\n            const ex = at.x + Math.cos(a2) * r, ey = at.y + Math.sin(a2) * r;\n            if (inField(mx, my) && inField(ex, ey)\n              && !zw.fallHazardAt(zw.player, mx, my) && !zw.fallHazardAt(zw.player, ex, ey)) {\n              dir = a2;\n              break;\n            }\n",
          "after": "            const mx = at.x + Math.cos(a2) * r * 0.5, my = at.y + Math.sin(a2) * r * 0.5;\n            const ex = at.x + Math.cos(a2) * r, ey = at.y + Math.sin(a2) * r;\n            if (inField(mx, my) && inField(ex, ey)\n              && !fallHazardAt(zw.player, mx, my) && !fallHazardAt(zw.player, ex, ey)) {\n              dir = a2;\n              break;\n            }\n"
        },
        {
          "before": "      // only true obstruction — a pack wall, a shoreline press — reads as a\n      // shorter stride, and the whisker's etas lengthen to match.\n      const w2 = g.world();\n      if (moving && stridePrev) {\n        const dtSim = w2.time - stridePrev.t;\n        if (dtSim > 1e-3) {\n",
          "after": "      // only true obstruction — a pack wall, a shoreline press — reads as a\n      // shorter stride, and the whisker's etas lengthen to match.\n      const w2 = g.world();\n      if (w2.timeflow.worldScale() <= 0) pausedFrames++;\n      if (w2.zone.id === homeZid && moving)\n        walkDistance += Math.hypot(w2.player.pos.x - walkPrevious.x, w2.player.pos.y - walkPrevious.y);\n      walkPrevious = { ...w2.player.pos };\n      if (moving && stridePrev) {\n        const dtSim = w2.time - stridePrev.t;\n        if (dtSim > 1e-3) {\n"
        },
        {
          "before": "      if (w2.zone.id !== homeZid) {\n        return {\n          worst, held: false, taskMax, offTask40, worstOwn,\n          exit: {\n            atMs: performance.now() - t0, zone: w2.zone.name,\n            tileset: w2.zone.tileset ?? '?', time: w2.time,\n",
          "after": "      if (w2.zone.id !== homeZid) {\n        return {\n          worst, held: false, taskMax, offTask40, worstOwn,\n          worldSeconds: w2.time - worldStart, walkDistance, pausedFrames,\n          exit: {\n            atMs: performance.now() - t0, zone: w2.zone.name,\n            tileset: w2.zone.tileset ?? '?', time: w2.time,\n"
        },
        {
          "before": "        lastSnap = { x: Math.round(p2.pos.x), y: Math.round(p2.pos.y), push: !!p2.push, foes, streak };\n      }\n    }\n    return { worst, held: true, taskMax, offTask40, worstOwn };\n  };\n\n  // THE MID-WALK EXIT + THE RESTART LAW (aether_vesper 2026-07-28: a\n",
          "after": "        lastSnap = { x: Math.round(p2.pos.x), y: Math.round(p2.pos.y), push: !!p2.push, foes, streak };\n      }\n    }\n    return { worst, held: true, taskMax, offTask40, worstOwn,\n      worldSeconds: g.world().time - worldStart, walkDistance, pausedFrames };\n  };\n\n  // THE MID-WALK EXIT + THE RESTART LAW (aether_vesper 2026-07-28: a\n"
        },
        {
          "before": "      return `a${attempt + 1} ${phase}+${(e.atMs / 1000).toFixed(1)}s -> '${e.zone}' (${e.tileset}) wheel ${wheel.toFixed(2)} ${e.snap}`;\n    };\n    const returnHome = (): boolean => {\n      const ok = g.world().devTravelTo(homeZid); // false only off-graph — cannot happen for minted/START zones\n      if (ok) pinWeather(); // the pinned front re-parks on the home node\n      return ok;\n    };\n",
          "after": "      return `a${attempt + 1} ${phase}+${(e.atMs / 1000).toFixed(1)}s -> '${e.zone}' (${e.tileset}) wheel ${wheel.toFixed(2)} ${e.snap}`;\n    };\n    const returnHome = (): boolean => {\n      const ok = travel.travelTo(homeZid); // false only off-graph — cannot happen for minted/START zones\n      if (ok) pinWeather(); // the pinned front re-parks on the home node\n      return ok;\n    };\n"
        },
        {
          "before": "      // burst and the steady window carry the full crowd. Re-poured after a\n      // guard restart (the travel back reloads the zone); lite.spawn refuses\n      // past the pool cap, so a surviving tide tops up instead of doubling.\n      if (opts.lite) zw.devLitePour('vermin_tide', opts.lite);\n      const dir0 = 0.6 + attempt * RETRY_TURN;\n      const entry = await walkPhase(settleMs, dir0);\n      if (entry.worst > entryWorst) {\n",
          "after": "      // burst and the steady window carry the full crowd. Re-poured after a\n      // guard restart (the travel back reloads the zone); lite.spawn refuses\n      // past the pool cap, so a surviving tide tops up instead of doubling.\n      if (opts.lite) travel.pourLite('vermin_tide', opts.lite);\n      const dir0 = 0.6 + attempt * RETRY_TURN;\n      const entry = await walkPhase(settleMs, dir0);\n      if (entry.worst > entryWorst) {\n"
        },
        {
          "before": "        if (!returnHome()) break;\n        continue;\n      }\n      ltDrain(); // pending in-window entries, folded before the snapshot\n      const zw2 = g.world();\n      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab\n      return reduceFrames(dump, entryWorst, {\n        tileset: tilesetId, zone: zw2.zone.name,\n        variant: zw2.zone.variantName ?? null,\n        layout: zw2.zone.layoutType ?? 'plains',\n        doodads: zw2.doodads.length, actors: zw2.actors.length,\n        lite: zw2.lite.liveCount,\n        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,\n        snowCover: +zw2.snowCover.toFixed(2),\n",
          "after": "        if (!returnHome()) break;\n        continue;\n      }\n\n      ltDrain(); // pending in-window entries, folded before the snapshot\n      const zw2 = g.world();\n      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab\n      assertPerfFrames(dump.gap.length, g.crash().fatal);\n      assertPerfWalk(steady.worldSeconds, steady.walkDistance, steady.pausedFrames);\n      return reduceFrames(dump, entryWorst, {\n        tileset: tilesetId, zone: zw2.zone.name,\n        variant: zw2.zone.variantName ?? null,\n        layout: zw2.zone.layoutType ?? 'plains',\n        doodads: zw2.doodads.length, actors: zw2.actors.length,\n        ...travel.census(),\n        worldSeconds: steady.worldSeconds, walkDistance: steady.walkDistance, pausedFrames: steady.pausedFrames,\n        lite: zw2.lite.liveCount,\n        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,\n        snowCover: +zw2.snowCover.toFixed(2),\n"
        },
        {
          "before": "  // verdict travels across machines (a slow laptop slows both sides). A\n  // pinned sky applies here too: the control must not be hostage to a front\n  // that happened to drift over town.\n  g.world().devTravelTo(START_ZONE);\n  pinWeather();\n  const control = await sampleCurrentZone('(town)');\n  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');\n",
          "after": "  // verdict travels across machines (a slow laptop slows both sides). A\n  // pinned sky applies here too: the control must not be hostage to a front\n  // that happened to drift over town.\n  travel.travelTo(START_ZONE);\n  pinWeather();\n  const control = await sampleCurrentZone('(town)');\n  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');\n"
        },
        {
          "before": "    // path itself then wears the right tileset in the deadman's row.\n    beatTileset = id;\n    beat('mint');\n    const zid = g.world().devMintTileset(id, PERF_SPREAD_BASE + idx, 8, {\n      ...(pin?.seed !== undefined ? { seed: pin.seed }\n        : opts.mintSeed !== undefined ? { seed: mintSeedFor(opts.mintSeed, id) } : {}),\n      ...(pin?.variant ? { variant: pin.variant } : {}),\n",
          "after": "    // path itself then wears the right tileset in the deadman's row.\n    beatTileset = id;\n    beat('mint');\n    const zid = travel.mintTileset(id, PERF_SPREAD_BASE + idx, 8, {\n      ...(pin?.seed !== undefined ? { seed: pin.seed }\n        : opts.mintSeed !== undefined ? { seed: mintSeedFor(opts.mintSeed, id) } : {}),\n      ...(pin?.variant ? { variant: pin.variant } : {}),\n"
        },
        {
          "before": "  // acquittal had to reconstruct this bracket by hand from seat medians to\n  // exonerate three zones; now every report carries it. Evidence only —\n  // the launcher prints both rows and their delta, and gates nothing on it.\n  g.world().devTravelTo(START_ZONE);\n  pinWeather();\n  const controlEnd = await sampleCurrentZone('(town aged)');\n  beat('aged', { row: controlEnd });\n\n  g.fakePad(null);\n  setVisAblate([]);\n  ltObs?.disconnect();\n\n  const cv = document.getElementById('game') as HTMLCanvasElement | null;\n  return {\n    control, controlEnd, zones,\n    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },\n    dpr: window.devicePixelRatio || 1,\n",
          "after": "  // acquittal had to reconstruct this bracket by hand from seat medians to\n  // exonerate three zones; now every report carries it. Evidence only —\n  // the launcher prints both rows and their delta, and gates nothing on it.\n  travel.travelTo(START_ZONE);\n  pinWeather();\n  const controlEnd = await sampleCurrentZone('(town aged)');\n  beat('aged', { row: controlEnd });\n\n  const cv = document.getElementById('game') as HTMLCanvasElement | null;\n  return {\n    runtime: 'retained-native',\n    control, controlEnd, zones,\n    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },\n    dpr: window.devicePixelRatio || 1,\n"
        },
        {
          "before": "    weather: opts.weather ?? '',\n    ablate: opts.ablate ?? [],\n  };\n}\n",
          "after": "    weather: opts.weather ?? '',\n    ablate: opts.ablate ?? [],\n  };\n  } finally {\n    g.fakePad(null);\n    setVisAblate([]);\n    ltObs?.disconnect();\n  }\n}\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "e7320eca08ab7bf74219f0cba2ed493e9ab4c8e8",
      "beforeHash": "530c2bb383bee11cb724019d644fa8e2de331ac478215bb750087e910f142882",
      "afterHash": "ea5dab46e932efcf9c46f99d1da34ebd1ca379a9c408d137186e8b6863b09215",
      "crlfLines": [],
      "hunks": [
        {
          "before": "          npx tsx balance/check_nativecanvasreleasesource.ts\n          npx tsx balance/check_nativeshardprobedeliverysource.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n",
          "after": "          npx tsx balance/check_nativecanvasreleasesource.ts\n          npx tsx balance/check_nativeshardprobedeliverysource.ts\n\n      - name: Retained desktop performance travel regressions\n        run: |\n          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Probes (green roster, fast lane)\n        run: npm run probe\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "normalSha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "normalSha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "normalSha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "normalSha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "normalSha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "normalSha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "normalSha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "normalSha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "normalSha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "normalSha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "normalSha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "normalSha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCanvasReleaseArchive.ts",
      "normalSha256": "be35c2be7d3c25a12e0c12e52c1e4f8b0728bc48c3368af67dcc34889393b6e7"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "normalSha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "normalSha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "normalSha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "normalSha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "normalSha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "normalSha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "normalSha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "normalSha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "normalSha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "normalSha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "normalSha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "normalSha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "normalSha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "normalSha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "normalSha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "normalSha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompilerPlatformReceiptArchive.ts",
      "normalSha256": "f8d389a09bbcd3438f089bd6d50a333f87d01fc5dac32d31f04f5c1fa40d02a4"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "normalSha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "normalSha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "normalSha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeConvergenceRepairArchive.ts",
      "normalSha256": "b9b71e137161348e2051aa5069b9c8bba2d7e5d9be84adeda1af15b18ef04598"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "normalSha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "normalSha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "normalSha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "normalSha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "normalSha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "normalSha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "normalSha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "normalSha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "normalSha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "normalSha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "normalSha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeFullGateRepairArchive.ts",
      "normalSha256": "f1e63e5a9476c14ff847e21e0800e79ce0a62185e2a5172b167e0671ec81c19d"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "normalSha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "normalSha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "normalSha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "normalSha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "normalSha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "normalSha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "normalSha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "normalSha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "normalSha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "normalSha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "normalSha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "normalSha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLegacySourceRepairArchive.ts",
      "normalSha256": "25e8f1034399e80b7174a140b0f8206d8b451f7d084e13a7a41391e31a6d696d"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "normalSha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLoadingResponsivenessArchive.ts",
      "normalSha256": "3417fb2ef0ab8bcdd536b1a45adb448d091b6a5e9f411bfea0ddf60ad356ff90"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "normalSha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "normalSha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "normalSha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "normalSha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "normalSha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "normalSha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "normalSha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "normalSha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeMergeSourceArchive.ts",
      "normalSha256": "5e58ee5acba68c3f1493f53933b957ee766f9c339cb4c6bb4e59748d818ac7eb"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "normalSha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "normalSha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "normalSha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "normalSha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "normalSha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "normalSha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "normalSha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "normalSha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "normalSha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "normalSha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "normalSha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "normalSha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "normalSha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "normalSha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "normalSha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "normalSha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "normalSha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "normalSha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "normalSha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "normalSha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "normalSha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "normalSha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "normalSha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "normalSha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "normalSha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "normalSha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "normalSha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "normalSha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "normalSha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "normalSha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "normalSha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "normalSha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "normalSha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "normalSha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "normalSha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "normalSha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "normalSha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "normalSha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "normalSha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "normalSha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "normalSha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "normalSha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "normalSha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "normalSha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "normalSha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "normalSha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "normalSha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "normalSha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "normalSha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "normalSha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "normalSha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "normalSha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "normalSha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "normalSha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "normalSha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "normalSha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "normalSha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "normalSha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "normalSha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "normalSha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "normalSha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "normalSha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "normalSha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "normalSha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "normalSha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardProbeDeliveryArchive.ts",
      "normalSha256": "cb71b3250ecd21d7a0cc327583337dbb57a72bb36b304aaf08ab9a5733880b8c"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "normalSha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "normalSha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "normalSha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "normalSha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "normalSha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "normalSha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "normalSha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "normalSha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "normalSha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "normalSha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "normalSha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "normalSha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "normalSha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "normalSha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "normalSha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "normalSha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "normalSha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "current": [
    {
      "file": "balance/nativeDesktopPerfFixture.ts",
      "normalSha256": "e320b863dd64b38c25a95908561365d1b8952ded82caec495256aa265d0b60ac"
    },
    {
      "file": "balance/nativeDesktopPerfFS.ts",
      "normalSha256": "653ccd8eafdfd88a7ea39a1988eb13fbf78ccda0d91323dd03eb0163a707ee96"
    },
    {
      "file": "balance/check_nativedesktopperfsource.ts",
      "normalSha256": "8029ea6078e5df3e1bd2520903ee4c934ee285ab94e9dc7b450c993c8abb13a1"
    },
    {
      "file": "balance/nativeShardProbeDeliveryFixture.ts",
      "normalSha256": "776233345c3307139db9bdda029a5c92c715443982a6782a31e7c1a17983985c"
    },
    {
      "file": "balance/check_nativeshardprobedeliverysource.ts",
      "normalSha256": "6fc5b8e0d232ce99df21e0179f958aaac3b13a9d3791a9aa28e6257398d056eb"
    },
    {
      "file": "src/dev/perf.ts",
      "normalSha256": "777890c24b47aa8cf84afe539f3e4fdca8c723aa7281db22b9ee95450839b83c"
    },
    {
      "file": "src/dev/nativePerfTravel.ts",
      "normalSha256": "aab33c01758c0629e952d6a4fc254f7e1765d04410d15af68dae626d967eda17"
    },
    {
      "file": "balance/check_nativeperftravel.ts",
      "normalSha256": "2734edd0d5724464993f0320e262b62003449248c3678d9ee028ce11cbb87568"
    },
    {
      "file": ".github/workflows/ci.yml",
      "normalSha256": "ea5dab46e932efcf9c46f99d1da34ebd1ca379a9c408d137186e8b6863b09215"
    }
  ]
};
