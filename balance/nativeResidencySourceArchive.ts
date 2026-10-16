export interface NativeResidencySourceRow {file:string;predecessor:string;beforeHash:string;afterHash:string;crlfLines:readonly number[];hunks:readonly {before:string;after:string}[]}
export const nativeResidencySourceArchive:{parent:string;rows:readonly NativeResidencySourceRow[];archives:readonly {file:string;normalSha256:string}[];current:readonly {file:string;normalSha256:string}[]} = {
  "parent": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
  "rows": [
    {
      "file": "launcher/main.cjs",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "0eb48011fa3ce406f3a846ba91d5b4e540b6aea164a62f78da6601e2fe02562b",
      "afterHash": "60522a6e7befe5d119b138c36bf9365cdcfd5cd73cbee7d3d2877e663e2a57ec",
      "crlfLines": [],
      "hunks": [
        {
          "before": "const path = require('node:path');\nconst { startGameServer } = require('./server.cjs');\nconst { createDeadman, skipVerdict } = require('./perfdeadman.cjs');\nconst updates = require('./updates.cjs');\nconst branches = require('./branches.cjs');\n\n",
          "after": "const path = require('node:path');\nconst { startGameServer } = require('./server.cjs');\nconst { createDeadman, skipVerdict } = require('./perfdeadman.cjs');\nconst { residencyLines, parseResidencyFlags, residencyFlagValue, writeFailedResidencyReport } = require('./perfresidency.cjs');\nconst updates = require('./updates.cjs');\nconst branches = require('./branches.cjs');\n\n"
        },
        {
          "before": "      settleSeconds: Number(budgets.settleSeconds || 1.5),\n      filter: flagValue('--filter') || '',\n    };\n    // GATE DETERMINISM (committed in perf.config.json, all optional — these\n    // are the GATE's own settings, so the run still exits 2 on breach):\n    //   weather      — the gate's pinned sky (silence the random front roll).\n",
          "after": "      settleSeconds: Number(budgets.settleSeconds || 1.5),\n      filter: flagValue('--filter') || '',\n    };\n    // ---- THE RESIDENCY INSTRUMENT (src/dev/perfResidency.ts; docs/design/desktop-residency.md) ----\n    // Her ruling (2026-10-16, policy D): the cumulative course keeps its\n    // budgets and gate; these ADDITIVE courses run in their OWN invocation,\n    // write no saves (the game latches suppressSaves) and never gate:\n    //   --fresh             one fresh run per matrix row: the town control at\n    //                       one resident area, the zone at two (an UNMATCHED\n    //                       residency contrast, read from the census, printed\n    //                       as such, never judged)\n    //   --ramp[=K]          one run, the town re-sampled after each of K-1\n    //                       visits (default 8 steps; --ramp-list=a,b,c names\n    //                       the visits; --ramp=51 walks the whole matrix in\n    //                       sweep order, the cumulative stop's reproduction)\n    //   --ramp-age-control  the ramp that visits nothing: residency stays one\n    //                       while the run ages (a comparison, not an isolation)\n    //   --run-seed=<n>      the manifest seed every fresh start shares\n    //                       (perf.config.json residency.seed, else 20261016;\n    //                       zero is a seed)\n    // A malformed or contradictory request is REFUSED here (launcher/\n    // perfresidency.cjs parseResidencyFlags) and again by perfSweep before\n    // any start.\n    const rf = parseResidencyFlags({ fresh: residencyFlagValue(argv, '--fresh') !== null, ramp: residencyFlagValue(argv, '--ramp'), rampList: residencyFlagValue(argv, '--ramp-list'), rampAge: residencyFlagValue(argv, '--ramp-age-control') !== null, runSeed: residencyFlagValue(argv, '--run-seed'), configSeed: (budgets.residency ?? {}).seed, filter: opts.filter });\n    if (rf.errors.length) throw new Error('residency flags refused: ' + rf.errors.join('; '));\n    if (rf.opts) Object.assign(opts, rf.opts);\n    // GATE DETERMINISM (committed in perf.config.json, all optional — these\n    // are the GATE's own settings, so the run still exits 2 on breach):\n    //   weather      — the gate's pinned sky (silence the random front roll).\n"
        },
        {
          "before": "    if (tilesetsFlag) opts.tilesets = tilesetsFlag.split(',').map(s => s.trim()).filter(Boolean);\n    const forensics = weatherFlag !== null || !!ablateFlag || !!variantFlag || !!layoutFlag || !!seedFlag || !!liteFlag || !!tilesetsFlag;\n    console.log(`PERF: sweeping tilesets (${opts.seconds}s steady + ${opts.settleSeconds}s entry per zone` +\n      (opts.filter ? `, filter '${opts.filter}'` : '') +\n      (opts.weather !== undefined ? `, weather pinned '${opts.weather || 'clear'}'` : '') +\n      (opts.ablate ? `, ablate [${opts.ablate.join(',')}]` : '') + `)…`);\n",
          "after": "    if (tilesetsFlag) opts.tilesets = tilesetsFlag.split(',').map(s => s.trim()).filter(Boolean);\n    const forensics = weatherFlag !== null || !!ablateFlag || !!variantFlag || !!layoutFlag || !!seedFlag || !!liteFlag || !!tilesetsFlag;\n    console.log(`PERF: sweeping tilesets (${opts.seconds}s steady + ${opts.settleSeconds}s entry per zone` +\n      (opts.course ? `, course '${opts.course}'${opts.rampAgeControl ? ' (age control)' : ''}` : '') +\n      (opts.filter ? `, filter '${opts.filter}'` : '') +\n      (opts.weather !== undefined ? `, weather pinned '${opts.weather || 'clear'}'` : '') +\n      (opts.ablate ? `, ablate [${opts.ablate.join(',')}]` : '') + `)…`);\n"
        },
        {
          "before": "    // (documented in _docHarnessShield — no committed values needed).\n    const wc = gameWin.webContents;\n    const dm = budgets.deadman ?? {};\n    /** @type {{ rows: any[], skipped: any[], control: any, controlEnd: any }} */\n    const banked = { rows: [], skipped: [], control: null, controlEnd: null };\n    const deadman = createDeadman({\n      silenceMs: (dm.silenceSec ?? 45) * 1000,\n      checkMs: (dm.checkSec ?? 5) * 1000,\n",
          "after": "    // (documented in _docHarnessShield — no committed values needed).\n    const wc = gameWin.webContents;\n    const dm = budgets.deadman ?? {};\n    /** @type {{ rows: any[], skipped: any[], control: any, controlEnd: any, fresh: any[], ramp: any[], residencyWindows: any[] }} */\n    const banked = { rows: [], skipped: [], control: null, controlEnd: null, fresh: [], ramp: [], residencyWindows: [] };\n    const deadman = createDeadman({\n      silenceMs: (dm.silenceSec ?? 45) * 1000,\n      checkMs: (dm.checkSec ?? 5) * 1000,\n"
        },
        {
          "before": "      setInterval: (fn, ms) => setInterval(fn, ms),\n      clearInterval: (h) => clearInterval(h),\n    });\n    ipcMain.on('perf:beat', (e, payload) => {\n      if (!gameWin || e.sender !== gameWin.webContents) return;\n      heartbeatRunLock(); // a beating run is a lock nobody may reclaim\n      deadman.beat(payload);\n",
          "after": "      setInterval: (fn, ms) => setInterval(fn, ms),\n      clearInterval: (h) => clearInterval(h),\n    });\n    /** @param {Electron.IpcMainEvent} e @param {any} payload */\n    const onPerfBeat = (e, payload) => {\n      if (!gameWin || e.sender !== gameWin.webContents) return;\n      heartbeatRunLock(); // a beating run is a lock nobody may reclaim\n      deadman.beat(payload);\n"
        },
        {
          "before": "        console.log(`PERF: control '${payload.row.zone}' gap50 ${payload.row.gapP50}`);\n      } else if (payload.at === 'aged') {\n        banked.controlEnd = payload.row ?? null;\n      } else if (payload.at === 'skip' && payload.skip) {\n        banked.skipped.push(payload.skip);\n        console.log(`PERF: skipped ${payload.skip.id} [${payload.skip.class}]`);\n      }\n    });\n    const sweepP = wc.executeJavaScript(\n      `window.__game.perfSweep(${JSON.stringify(opts)})`, true);\n    /** @type {any} */\n    const outcome = await Promise.race([\n      sweepP.then((r) => ({ kind: 'done', report: r }), (err) => ({ kind: 'err', err })),\n      deadman.promise.then((w) => ({ kind: 'wedge', wedge: w })),\n    ]);\n    deadman.disarm();\n    if (outcome.kind === 'err') throw outcome.err;\n    /** @type {any} */\n    let wedge = null;\n    /** @type {any} */\n",
          "after": "        console.log(`PERF: control '${payload.row.zone}' gap50 ${payload.row.gapP50}`);\n      } else if (payload.at === 'aged') {\n        banked.controlEnd = payload.row ?? null;\n      } else if (payload.at === 'fresh' && payload.row) {\n        // THE RESIDENCY INSTRUMENT's rows ride the same beats (a killed run\n        // still yields what it banked; the launcher prints live progress).\n        banked.fresh.push(payload.row);\n        const r = payload.row;\n        console.log(`PERF: [fresh ${banked.fresh.length}] ${payload.tileset} run ${r.runtime.ordinal} start ${r.runtime.startupMs}ms; ${r.regime}; town gap50 ${r.control.gapP50} gap99 ${r.control.gapP99}; '${r.zone.zone}' gap50 ${r.zone.gapP50} gap99 ${r.zone.gapP99} gapMax ${r.zone.gapMax} h40 ${r.zone.hitch40}`);\n      } else if (payload.at === 'ramp' && payload.step) {\n        banked.ramp.push(payload.step);\n        const s = payload.step;\n        console.log(`PERF: [ramp ${s.step}] ${s.visited ?? '(nothing visited)'} areas ${s.residentAreas} bodies ${s.residentActors} wall ${(s.wallMs / 1000).toFixed(1)}s camp ${s.campaignSec}s` +\n          (s.town ? ` town gap50 ${s.town.gapP50} gap99 ${s.town.gapP99} gapMax ${s.town.gapMax} h40 ${s.town.hitch40}` : ' town window not held'));\n      } else if (payload.at === 'residency-window' && payload.window) {\n        banked.residencyWindows.push(payload.window);\n      } else if (payload.at === 'skip' && payload.skip) {\n        banked.skipped.push(payload.skip);\n        console.log(`PERF: skipped ${payload.skip.id} [${payload.skip.class}]`);\n      }\n    };\n    ipcMain.on('perf:beat', onPerfBeat);\n    // Route a synchronous webContents refusal through the same failed-partial path.\n    const sweepP = Promise.resolve().then(() => wc.executeJavaScript(\n      `window.__game.perfSweep(${JSON.stringify(opts)})`, true));\n    /** @type {any} */\n    const outcome = await Promise.race([\n      sweepP.then((r) => ({ kind: 'done', report: r }), (err) => ({ kind: 'err', err })),\n      deadman.promise.then((w) => ({ kind: 'wedge', wedge: w })),\n    ]);\n    deadman.disarm();\n    ipcMain.removeListener('perf:beat', onPerfBeat);\n    if (outcome.kind === 'err') {\n      if (opts.course && opts.course !== 'cumulative') {\n        try {\n          const dir = writeFailedResidencyReport(path.join(BASE, 'balance', 'reports'), opts, banked, outcome.err,\n            { budgets, dist: { stamp: distStamp, treeDirty, allowDirty, rebuilt: !distFresh } });\n          console.error('PERF RESIDENCY FAILED: partial report -> ' + dir);\n        } catch (writeError) { console.error('PERF RESIDENCY partial-report write failed:', writeError); }\n        try { gameWin.destroy(); } catch { /* outer failure cleanup still releases server/lock */ }\n      }\n      throw outcome.err; // preserve the first course error after banking and cleanup\n    }\n    /** @type {any} */\n    let wedge = null;\n    /** @type {any} */\n"
        },
        {
          "before": "        }],\n        canvas: { w: 0, h: 0 }, dpr: 0,\n        sampleSeconds: opts.seconds, matrix: [],\n        weather: opts.weather ?? '', ablate: opts.ablate ?? [],\n      };\n      try { gameWin.destroy(); } catch { /* already dying */ }\n",
          "after": "        }],\n        canvas: { w: 0, h: 0 }, dpr: 0,\n        sampleSeconds: opts.seconds, matrix: [],\n        ...(opts.course ? {\n          course: opts.course, startSeed: opts.seed ?? null, fresh: banked.fresh, residencyWindows: banked.residencyWindows,\n          ramp: { steps: banked.ramp, ageControl: !!opts.rampAgeControl, list: opts.rampList ?? [], slopes: [], slopesNote: 'partial: the run wedged before the fold', comparisonNote: null },\n        } : {}),\n        weather: opts.weather ?? '', ablate: opts.ablate ?? [],\n      };\n      try { gameWin.destroy(); } catch { /* already dying */ }\n"
        },
        {
          "before": "      report = outcome.report;\n    }\n\n    // ---- the gate: relative-to-town caps + absolute backstops, all data ----\n    const rel = budgets.relative ?? {};\n    const abs = budgets.absolute ?? {};\n",
          "after": "      report = outcome.report;\n    }\n\n    // ---- THE RESIDENCY INSTRUMENT's own print (launcher/perfresidency.cjs): raw values, no cap, no verdict ----\n    // Its report never reaches the gate below: the cumulative caps judge the\n    // cumulative course alone (her ruling 2026-10-16). Exit 0 when the course\n    // completed, 1 when the deadman killed it or the renderer failed.\n    if (report.course && report.course !== 'cumulative') {\n      const rlines = residencyLines(report, wedge);\n      console.log(rlines.join('\\n'));\n      const stampStr = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);\n      const dir = path.join(BASE, 'balance', 'reports', `perf_${report.course}_` + stampStr);\n      fs.mkdirSync(dir, { recursive: true });\n      const dist = { stamp: distStamp, treeDirty, allowDirty, rebuilt: !distFresh };\n      fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ budgets, opts, dist, report, wedge }, null, 2));\n      fs.writeFileSync(path.join(dir, 'report.md'), [\n        '# perf ' + report.course + ' ' + stampStr, '',\n        `dist ${distStamp ? distStamp.slice(0, 20) + '...' : '(no stamp)'}${treeDirty ? ' (TREE DIRTY at measure time)' : ''}`, '',\n        'REPORT-ONLY: the residency instrument applies no cap and renders no verdict.', '',\n        '```', ...rlines, '```', '',\n      ].join('\\n'));\n      console.log('report -> ' + dir);\n      if (!wedge && errors.length) throw new Error(errors.join('; '));\n      console.log(wedge ? 'PERF RESIDENCY WEDGED: the deadman killed a hung run (exit 1; the banked rows stand above).' : 'PERF RESIDENCY DONE: report-only, nothing gated.');\n      gameServer?.close();\n      releaseRunLock();\n      app.exit(wedge ? 1 : 0);\n      return;\n    }\n    // ---- the gate: relative-to-town caps + absolute backstops, all data ----\n    const rel = budgets.relative ?? {};\n    const abs = budgets.absolute ?? {};\n"
        }
      ]
    },
    {
      "file": "src/dev/perf.ts",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "777890c24b47aa8cf84afe539f3e4fdca8c723aa7281db22b9ee95450839b83c",
      "afterHash": "fe1eb1aa67bbca442d816600d76049f191553bddbc0552362b2401bb86d09ae9",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// ---------------------------------------------------------------------------\n\nimport { retainedPerfTravel, withPerfProfile, assertPerfWalk, assertPerfFrames } from './nativePerfTravel';\nimport { sidezoneOf } from '../data/sidezones';\nimport { TILESETS } from '../data/tilesets';\nimport { skyOf, START_ZONE } from '../data/zones';\nimport { FluxPhase } from '../engine/flux';\nimport { setVisAblate, VIS_TELEMETRY } from '../render/vis/visConfig';\nimport { quantile } from '../sim/metrics';\nimport { DAY_LENGTH } from '../world/daynight';\n",
          "after": "// ---------------------------------------------------------------------------\n\nimport { retainedPerfTravel, withPerfProfile, assertPerfWalk, assertPerfFrames } from './nativePerfTravel';\nimport { heapMB, rampListFor, rampSlopes, regimeOf, validateResidencyCourse, validateResidencyMatrix, residencyError, residencyWindowIssues, residencyRowIssues, type PerfResidencyBoundary, type PerfResidencyWindow, RAMP_DEFAULT_STEPS, RESIDENCY_COURSE_NOTES, type PerfCourse, type PerfFreshRow, type PerfMintReceipt, type PerfRampReport, type PerfRampStep, type PerfRuntimeIdentity } from './perfResidency';\nimport { sidezoneOf } from '../data/sidezones';\nimport { TILESETS } from '../data/tilesets';\nimport { skyOf, START_ZONE } from '../data/zones';\nimport { FluxPhase } from '../engine/flux';\nimport { suppressSaves } from '../meta/persistence';\nimport { setVisAblate, VIS_TELEMETRY } from '../render/vis/visConfig';\nimport { quantile } from '../sim/metrics';\nimport { DAY_LENGTH } from '../world/daynight';\n"
        },
        {
          "before": "   *  rolls no dice); compare against a bare run of the same filter for the\n   *  pool's true frame cost. Never one of the gate's own settings. */\n  lite?: number;\n}\n\nexport interface PerfZoneStats {\n",
          "after": "   *  rolls no dice); compare against a bare run of the same filter for the\n   *  pool's true frame cost. Never one of the gate's own settings. */\n  lite?: number;\n  /** THE RESIDENCY INSTRUMENT (src/dev/perfResidency.ts; docs/design/\n   *  desktop-residency.md): 'fresh' = one fresh run per matrix row (the town\n   *  control at one resident area, the zone at two: an UNMATCHED residency\n   *  contrast, read from the actual census, recorded as such, never judged\n   *  against the cumulative caps); 'ramp' = one run, the town re-sampled\n   *  after each visit while the residency grows. Both are report-only and\n   *  run in their own launcher invocation; the request is validated before\n   *  any start. Undefined = the original cumulative course, untouched. */\n  course?: PerfCourse;\n  /** THE MATCHED START: the manifest seed every fresh start of an additive\n   *  course uses (devStartRun(classId, seed)), so each row's world deals the\n   *  same town. Required with a course; undefined = today's rolled seed (the\n   *  original course). */\n  seed?: number;\n  /** Ramp length in steps, step 0 (the town alone) included; default 8. */\n  rampSteps?: number;\n  /** The ramp's visited order (steps 1..K-1); default rampListFor: the\n   *  pinned heavy faces first, then light tilesets in matrix order, or the\n   *  whole matrix in sweep order when K covers it. */\n  rampList?: string[];\n  /** THE AGE CONTROL: a ramp that visits nothing, so the residency stays at\n   *  one while the run ages. A comparison under unmatched ages, not an\n   *  isolation (the report says so beside its steps). */\n  rampAgeControl?: boolean;\n}\n\nexport interface PerfZoneStats {\n"
        },
        {
          "before": "   *  ledger for the flap class the 2026-08-03 close retired — a row that\n   *  keeps arriving on attempt 3 is a flap the skip gate cannot see. */\n  attempts: number;\n}\n\n/** One row the sweep could not measure — and WHY, as data the gate can\n",
          "after": "   *  ledger for the flap class the 2026-08-03 close retired — a row that\n   *  keeps arriving on attempt 3 is a flap the skip gate cannot see. */\n  attempts: number;\n  /** Additive instrument only: all attempts, including discarded windows. */\n  residency?: { windows: PerfResidencyWindow[]; issues: string[]; valid: boolean };\n}\n\n/** One row the sweep could not measure — and WHY, as data the gate can\n"
        },
        {
          "before": "  /** Forensics provenance: the pinned sky ('' = natural) + ablated passes. */\n  weather: string;\n  ablate: string[];\n}\n\nconst PERF_SPREAD_BASE = 11; // staggers mint coordinates across the sweep\n",
          "after": "  /** Forensics provenance: the pinned sky ('' = natural) + ablated passes. */\n  weather: string;\n  ablate: string[];\n  /** THE RESIDENCY INSTRUMENT's fields (src/dev/perfResidency.ts): absent on\n   *  the original cumulative course, whose report is unchanged. */\n  course?: PerfCourse;\n  startSeed?: number | null;\n  saves?: { suppressed: boolean; reason: string | null };\n  fresh?: PerfFreshRow<PerfZoneStats>[];\n  ramp?: PerfRampReport<PerfZoneStats>;\n  residencyWindows?: PerfResidencyWindow[];\n  selectedMatrix?: { ids: string[]; explicitOverride: boolean };\n}\n\nconst PERF_SPREAD_BASE = 11; // staggers mint coordinates across the sweep\n"
        },
        {
          "before": "\n  try {\n  // A fresh probe run through the REAL start path (menus dismissed).\n  await g.hydrated();\n  withPerfProfile(g.account(), () => g.devStartRun(opts.classId), () => g.saveAccount());\n  const runtime = g.retained();\n  if (!runtime) throw new Error('perfSweep: retained native startup is missing');\n  const travel = retainedPerfTravel(runtime);\n  if (g.world().scene) throw new Error('perfSweep: a cinematic is still active');\n  beat('start');\n\n",
          "after": "\n  try {\n  // A fresh probe run through the REAL start path (menus dismissed).\n  // THE REQUEST VALIDATION (src/dev/perfResidency.ts): a malformed or\n  // contradictory residency request is refused here, before any start and\n  // before the save suppression; the original course carries no residency\n  // option and passes untouched.\n  // THE MATRIX: frontier-eligible tilesets first (registry order — their\n  // mint-seed indices are calibration state and must not shift), then the\n  // perfProbe OPT-INS appended (caves and minted interiors: walkable steady\n  // states the frontier:false proxy was hiding from the gate). Realm\n  // tilesets stay out BY THE REGISTRY's own word: a launch-gated melting\n  // shelf has no steady state for a blind probe walk (the floor dissolves,\n  // the walker falls into a random zone, and the row measures the stitch);\n  // boundless streamers need package context a bare mint cannot supply. An\n  // explicit opts.tilesets override can still name anything for forensics.\n  const wants = (opts.filter ?? '').split(',').map(s => s.trim()).filter(Boolean);\n  const registry = Object.values(TILESETS);\n  const fullMatrix = opts.tilesets ?? [\n    ...registry.filter(t => t.frontier !== false && !t.boundless),\n    ...registry.filter(t => t.frontier === false && t.perfProbe && !t.boundless),\n  ].map(t => t.id);\n  // The filter selects WHICH rows run; seed and spread always derive from\n  // the FULL matrix position, so a filtered run mints the exact zones the\n  // full sweep gates (any subset reproduces, not just index-preserving\n  // prefixes).\n  const matrix = fullMatrix.filter(id => !wants.length || wants.some(f => id.includes(f)));\n\n  const courseFaults = [...validateResidencyCourse(opts), ...validateResidencyMatrix(opts, fullMatrix, registry.map(t => t.id))];\n  if (courseFaults.length) throw new Error('perfSweep: residency course refused: ' + courseFaults.join('; '));\n  await g.hydrated();\n  const course: PerfCourse = opts.course ?? 'cumulative';\n  // THE SUPPRESSION (the residency instrument's one side effect, taken away):\n  // an additive course runs in ITS OWN launcher invocation and writes nothing\n  // durable: every later account/run save is refused with one console line\n  // (meta/persistence.ts); the original course is untouched by construction.\n  if (course !== 'cumulative') suppressSaves(RESIDENCY_COURSE_NOTES.saveReason);\n  const sweepStartedAt = { wall: performance.now(), iso: new Date().toISOString() };\n  withPerfProfile(g.account(), () => g.devStartRun(opts.classId, opts.seed), () => g.saveAccount());\n  const initialStartupMs = +(performance.now() - sweepStartedAt.wall).toFixed(1);\n  const runtime = g.retained();\n  if (!runtime) throw new Error('perfSweep: retained native startup is missing');\n  let travel = retainedPerfTravel(runtime);\n  let selectedRuntime = runtime;\n  let startOrdinal = 0;\n  const residencyWindows: PerfResidencyWindow[] = [];\n  const objectIds = new WeakMap<object, number>();\n  let nextObjectId = 1;\n  const objectId = (value: object): number => { let id = objectIds.get(value); if (id === undefined) { id = nextObjectId++; objectIds.set(value, id); } return id; };\n  const residencyBoundary = (): PerfResidencyBoundary => {\n    const actual = g.retained();\n    if (!actual) throw new Error('perfSweep: residency boundary has no retained runtime');\n    const area = actual.current; // preserve the native readiness/current ownership check\n    const census = travel.census(); // retains the selected receiver's native check\n    return { wallMs: performance.now(), wallAt: new Date().toISOString(), campaignSec: g.world().time,\n      runtime: objectId(actual), expectedRuntime: objectId(selectedRuntime), writer: objectId(actual.writer), area: objectId(area),\n      zone: area.assembly.input.scene.zone.id, writerMatchesWorld: actual.writer === g.world(), ready: actual.ready, census };\n  };\n  if (g.world().scene) throw new Error('perfSweep: a cinematic is still active');\n  beat('start');\n\n"
        },
        {
          "before": "    return null;\n  };\n\n  // CONTROL: the town — every relative budget compares against this, so the\n  // verdict travels across machines (a slow laptop slows both sides). A\n  // pinned sky applies here too: the control must not be hostage to a front\n  // that happened to drift over town.\n  travel.travelTo(START_ZONE);\n  pinWeather();\n  const control = await sampleCurrentZone('(town)');\n  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');\n  beat('control', { row: control });\n\n  // THE MATRIX: frontier-eligible tilesets first (registry order — their\n  // mint-seed indices are calibration state and must not shift), then the\n  // perfProbe OPT-INS appended (caves and minted interiors: walkable steady\n  // states the frontier:false proxy was hiding from the gate). Realm\n  // tilesets stay out BY THE REGISTRY's own word: a launch-gated melting\n  // shelf has no steady state for a blind probe walk (the floor dissolves,\n  // the walker falls into a random zone, and the row measures the stitch);\n  // boundless streamers need package context a bare mint cannot supply. An\n  // explicit opts.tilesets override can still name anything for forensics.\n  const wants = (opts.filter ?? '').split(',').map(s => s.trim()).filter(Boolean);\n  const registry = Object.values(TILESETS);\n  const fullMatrix = opts.tilesets ?? [\n    ...registry.filter(t => t.frontier !== false && !t.boundless),\n    ...registry.filter(t => t.frontier === false && t.perfProbe && !t.boundless),\n  ].map(t => t.id);\n  // The filter selects WHICH rows run; seed and spread always derive from\n  // the FULL matrix position, so a filtered run mints the exact zones the\n  // full sweep gates (any subset reproduces, not just index-preserving\n  // prefixes).\n  const matrix = fullMatrix.filter(id => !wants.length || wants.some(f => id.includes(f)));\n\n  const zones: PerfZoneStats[] = [];\n  const skipped: PerfSkipRow[] = [];\n  for (const id of matrix) {\n    const idx = fullMatrix.indexOf(id);\n    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];\n",
          "after": "    return null;\n  };\n\n  // Additive-only boundary instrumentation. Each callback keeps its original\n  // exception; a failed egress read is separate evidence and cannot replace it.\n  const recordResidencyWindow = <T extends { held: boolean }>(tileset: string, attempt: number,\n    phase: PerfResidencyWindow['phase'], ingress: PerfResidencyBoundary, value: T | undefined,\n    failed: boolean, firstError: unknown): void => {\n    let egress: PerfResidencyBoundary | null = null, egressError: PerfResidencyWindow['egressError'] = null;\n    let readFailure: unknown;\n    try { egress = residencyBoundary(); } catch (error) { readFailure = error; egressError = residencyError(error); }\n    const row: PerfResidencyWindow = { index: residencyWindows.length, tileset, attempt, phase, ingress, egress,\n      held: value?.held ?? null, error: failed ? residencyError(firstError) : null, egressError, issues: [], valid: false };\n    row.issues = residencyWindowIssues(row); row.valid = row.issues.length === 0;\n    residencyWindows.push(row); beat('residency-window', { window: row });\n    if (failed) throw firstError;\n    if (egressError) throw readFailure;\n  };\n  const residencyWalk = async (tileset: string, attempt: number, phase: 'entry' | 'steady' | 'visit-entry', ms: number, dir: number): Promise<Awaited<ReturnType<typeof walkPhase>>> => {\n    const ingress = residencyBoundary();\n    let value: Awaited<ReturnType<typeof walkPhase>> | undefined, failed = false, firstError: unknown;\n    try { value = await walkPhase(ms, dir); } catch (error) { failed = true; firstError = error; }\n    recordResidencyWindow(tileset, attempt, phase, ingress, value, failed, firstError);\n    return value!;\n  };\n  const residencyRetryReturn = (tileset: string, attempt: number, operation: () => boolean): boolean => {\n    const ingress = residencyBoundary();\n    let value: boolean | undefined, failed = false, firstError: unknown;\n    try { value = operation(); } catch (error) { failed = true; firstError = error; }\n    recordResidencyWindow(tileset, attempt, 'retry-return', ingress, value === undefined ? undefined : { held: value }, failed, firstError);\n    return value!;\n  };\n  const sampleResidencyZone = async (tilesetId: string): Promise<PerfZoneStats | null> => {\n    const windowStart = residencyWindows.length;\n    beatTileset = tilesetId; // the deadman's holder: who owns the window now\n    beat('sample');\n    const homeZid = g.world().zone.id;\n    // Worst entry gap across ALL attempts: the first attempt carries the\n    // mint's true load burst — a retry's cheaper re-entry must not launder\n    // the row's entry-burst verdict. The annotation follows the worst gap\n    // (the value the gate judges), so the note always explains the number\n    // on the row.\n    let entryWorst = 0;\n    let entryNote = '';\n    // THE EXIT STORIES (hold forensics): one line per unheld phase — where\n    // the walker landed, how deep into the phase, and the day wheel's\n    // position (world.time is the global clock; travel never resets it, so\n    // the exit's own timestamp carries the phase). A hold skip's note now\n    // NAMES its three deaths instead of shrugging.\n    const holdStories: string[] = [];\n    lastHoldStories = holdStories; // visible to the caller's skip row\n    const storyOf = (attempt: number, phase: string, e: { atMs: number; zone: string; tileset: string; time: number; snap: string }): string => {\n      const wheel = (((e.time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH) / DAY_LENGTH;\n      return `a${attempt + 1} ${phase}+${(e.atMs / 1000).toFixed(1)}s -> '${e.zone}' (${e.tileset}) wheel ${wheel.toFixed(2)} ${e.snap}`;\n    };\n    const returnHome = (): boolean => {\n      const ok = travel.travelTo(homeZid); // false only off-graph — cannot happen for minted/START zones\n      if (ok) pinWeather(); // the pinned front re-parks on the home node\n      return ok;\n    };\n    for (let attempt = 0; attempt < HOLD_ATTEMPTS; attempt++) {\n      const zw = g.world();\n      zw.player.invulnerable = true; // unkillable but TARGETABLE: combat stays real\n      // THE LITE STRESS: the tide pours before the entry walk, so both the\n      // burst and the steady window carry the full crowd. Re-poured after a\n      // guard restart (the travel back reloads the zone); lite.spawn refuses\n      // past the pool cap, so a surviving tide tops up instead of doubling.\n      if (opts.lite) travel.pourLite('vermin_tide', opts.lite);\n      const dir0 = 0.6 + attempt * RETRY_TURN;\n      const entry = await residencyWalk(tilesetId, attempt + 1, 'entry', settleMs, dir0);\n      if (entry.worst > entryWorst) {\n        entryWorst = entry.worst;\n        entryNote = entryStallNote(entry);\n      }\n      if (!entry.held) {\n        if (entry.exit) holdStories.push(storyOf(attempt, 'entry', entry.exit));\n        if (!residencyRetryReturn(tilesetId, attempt + 1, returnHome)) break;\n        continue;\n      }\n      // Drain the zone-hop garbage NOW, inside the discarded window: a sweep\n      // hops zones at a rate no player ever will, and V8's collection storm\n      // otherwise lands mid-sample on whichever zone holds the window when\n      // the threshold trips — the breach wears an innocent zone's name\n      // (tundra 2026-07-12; gutworks 2026-07-16, clean twice solo). The\n      // launcher exposes gc for --perf-test only; normal play never has it.\n      (window as unknown as { gc?: () => void }).gc?.();\n      // One discarded frame between the gc and the window: a longtask entry\n      // is minted when its TASK ends, and the gc above runs inside OUR\n      // current task — resetting the ledger in the same task would let our\n      // own window-opening pause deliver INTO the fresh window. The raf\n      // closes our task first; its entry (if any) dies in ltReset's drain.\n      await raf();\n      ltReset();\n      g.perfFrames(true); // discard the entry burst; the steady window begins\n      VIS_TELEMETRY.snowBakes = 0;\n      VIS_TELEMETRY.groundBakes = 0;\n      const steady = await residencyWalk(tilesetId, attempt + 1, 'steady', sampleMs, dir0);\n      if (!steady.held) {\n        if (steady.exit) holdStories.push(storyOf(attempt, 'steady', steady.exit));\n        if (!residencyRetryReturn(tilesetId, attempt + 1, returnHome)) break;\n        continue;\n      }\n\n      ltDrain(); // pending in-window entries, folded before the snapshot\n      const zw2 = g.world();\n      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab\n      assertPerfFrames(dump.gap.length, g.crash().fatal);\n      assertPerfWalk(steady.worldSeconds, steady.walkDistance, steady.pausedFrames);\n      const stats = reduceFrames(dump, entryWorst, {\n        tileset: tilesetId, zone: zw2.zone.name,\n        variant: zw2.zone.variantName ?? null,\n        layout: zw2.zone.layoutType ?? 'plains',\n        doodads: zw2.doodads.length, actors: zw2.actors.length,\n        ...travel.census(),\n        worldSeconds: steady.worldSeconds, walkDistance: steady.walkDistance, pausedFrames: steady.pausedFrames,\n        lite: zw2.lite.liveCount,\n        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,\n        snowCover: +zw2.snowCover.toFixed(2),\n        taskMax: +steady.taskMax.toFixed(1), offTask40: steady.offTask40,\n        ltCount: ltObs ? ltLedger.count : -1,\n        ltWorst: ltObs ? +ltLedger.worst.toFixed(1) : -1,\n        slabName: dump.phase.name, slabMs: +dump.phase.ms.toFixed(1),\n        entryNote,\n        attempts: attempt + 1,\n      });\n      const windows = residencyWindows.slice(windowStart);\n      const issues = residencyRowIssues(windows);\n      return { ...stats, residency: { windows, issues, valid: issues.length === 0 } };\n    }\n    return null;\n  };\n\n  // CONTROL: the town — every relative budget compares against this, so the\n  // verdict travels across machines (a slow laptop slows both sides). A\n  // pinned sky applies here too: the control must not be hostage to a front\n  // that happened to drift over town.\n  const initialReturnStartedAt = performance.now();\n  travel.travelTo(START_ZONE);\n  pinWeather();\n  const initialReturnSyncMs = +(performance.now() - initialReturnStartedAt).toFixed(1);\n  const control = await (course === 'cumulative' ? sampleCurrentZone('(town)') : sampleResidencyZone('(town)'));\n  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');\n  beat('control', { row: control });\n\n\n  const zones: PerfZoneStats[] = [];\n  const skipped: PerfSkipRow[] = [];\n  // ---- THE RESIDENCY INSTRUMENT (src/dev/perfResidency.ts; docs/design/desktop-residency.md) ----\n  // Her ruling (2026-10-16, policy D): the original cumulative course above\n  // and below keeps its control, matrix, aged bracket, budgets and gate; two\n  // ADDITIVE courses measure the residency itself, each in its own launcher\n  // invocation (THE SUPPRESSION at the start: nothing durable is written),\n  // each REPORT-ONLY (no cap is applied to these rows and no verdict is\n  // implied; the launcher prints them as their own tables). They reuse the\n  // sweep's own walker, windows, mint levers and census through the closures\n  // above; the course branch returns before the original matrix loop runs.\n  const heapNow = (): number | null => heapMB(performance as unknown as { memory?: { usedJSHeapSize?: unknown } });\n  /** THE RUNTIME IDENTITY of the run a sample belongs to: its ordinal (0 = the\n   *  sweep's own start), wall start, startup cost and manifest seed. */\n  const identity = (startupMs: number, startedAt: string): PerfRuntimeIdentity => ({ ordinal: startOrdinal, startedAt, startupMs, manifestSeed: g.world().manifest.seed });\n  /** THE MATCHED START (every fresh run after the sweep's own): the same call\n   *  sequence as the start above under the one seed, then the PREVIOUS\n   *  runtime proven retired (NativeClientStart.begin retires it synchronously;\n   *  a stale callback reaching it latches the fatal, so resurrection is loud,\n   *  never silent), no cinematic, the fatal latch read. The travel receiver\n   *  re-binds to the new runtime; walkPhase and sampleCurrentZone read it\n   *  live. Returns the new run's identity. */\n  const freshStart = (): PerfRuntimeIdentity => {\n    const previous = g.retained();\n    const t0 = performance.now();\n    const startedAt = new Date().toISOString();\n    withPerfProfile(g.account(), () => g.devStartRun(opts.classId, opts.seed), () => g.saveAccount());\n    // Same endpoint as first start: timestamp + native call/profile restoration.\n    const startupMs = +(performance.now() - t0).toFixed(1);\n    const next = g.retained();\n    if (!next) throw new Error('perfSweep: retained native startup is missing after a fresh start');\n    if (previous === next) throw new Error('perfSweep: the fresh start returned the previous runtime');\n    if (previous && previous.ready) throw new Error('perfSweep: the previous retained runtime was not retired by the fresh start');\n    travel = retainedPerfTravel(next);\n    selectedRuntime = next;\n    if (g.world().scene) throw new Error('perfSweep: a cinematic is still active after a fresh start');\n    const fatal = g.crash().fatal;\n    if (fatal) throw new Error('perfSweep: game failed during a fresh start: ' + fatal.msg + (fatal.stack ? ' | ' + fatal.stack : ''));\n    beat('start');\n    startOrdinal++;\n    return identity(startupMs, startedAt);\n  };\n  /** THE MINT RECEIPT: one tileset minted through the original course's own\n   *  levers (FULL-matrix spread index, id-stable seed, committed pins, the\n   *  load guard, the weather re-pin), with the exact seed and pins recorded\n   *  on the row and the synchronous mint + load cost measured apart from the\n   *  rAF entry burst that follows it. */\n  const mintRow = (id: string): { zid: string; mint: PerfMintReceipt; mintSyncMs: number } | PerfSkipRow => {\n    const idx = fullMatrix.indexOf(id);\n    if (idx < 0) throw new Error('perfSweep: residency mint id is outside the selected matrix: ' + id);\n    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];\n    beatTileset = id;\n    beat('mint');\n    const mint: PerfMintReceipt = {\n      seed: pin?.seed !== undefined ? pin.seed : opts.mintSeed !== undefined ? mintSeedFor(opts.mintSeed, id) : null,\n      variant: pin?.variant || null,\n      layout: pin?.layout || null,\n    };\n    const t0 = performance.now();\n    const zid = travel.mintTileset(id, PERF_SPREAD_BASE + idx, 8, {\n      ...(mint.seed !== null ? { seed: mint.seed } : {}),\n      ...(mint.variant ? { variant: mint.variant } : {}),\n      ...(mint.layout ? { layoutType: mint.layout } : {}),\n    });\n    const mintSyncMs = +(performance.now() - t0).toFixed(1);\n    if (!zid) return { id, class: 'unmintable', note: 'the registry has no such tileset' };\n    if (g.world().zone.id !== zid) return { id, class: 'load-fallback', note: `load fell back to '${g.world().zone.name}'` };\n    pinWeather();\n    return { zid, mint, mintSyncMs };\n  };\n  /** The synchronous travel home (the mint's own landing recipe), its cost measured apart from the town window. */\n  const returnHome = (): number => {\n    const t0 = performance.now();\n    travel.travelTo(START_ZONE);\n    pinWeather();\n    return +(performance.now() - t0).toFixed(1);\n  };\n  const holdSkip = (id: string): PerfSkipRow => ({\n    id, class: 'hold',\n    note: `walker could not hold the zone in ${HOLD_ATTEMPTS} attempts` + (lastHoldStories.length ? `: ${lastHoldStories.join('; ')}` : ''),\n  });\n  const skipRow = (skip: PerfSkipRow): void => { skipped.push(skip); beat('skip', { skip }); };\n  const courseReport = (ctl: PerfZoneStats): PerfSweepReport => {\n    const cv = document.getElementById('game') as HTMLCanvasElement | null;\n    const suppressed = g.crash().suppressed;\n    return {\n      runtime: 'retained-native', control: ctl, controlEnd: null, zones: [],\n      canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 }, dpr: window.devicePixelRatio || 1,\n      sampleSeconds: opts.seconds ?? 6, matrix, skipped,\n      weather: opts.weather ?? '', ablate: opts.ablate ?? [],\n      course, startSeed: opts.seed ?? null,\n      saves: { suppressed: suppressed !== null, reason: suppressed },\n      residencyWindows: [...residencyWindows], selectedMatrix: { ids: [...fullMatrix], explicitOverride: opts.tilesets !== undefined },\n    };\n  };\n  /** THE FRESH-SESSION ROWS: one fresh run per matrix row, its town CONTROL\n   *  (the first row rides the sweep's own start and the control already\n   *  sampled), then the zone. The regime is READ from the census each held\n   *  window carried (expected 1 then 2) and recorded, unexpected or not; the\n   *  row is never judged against the cumulative caps. */\n  const freshCourse = async (first: PerfZoneStats): Promise<PerfSweepReport> => {\n    const fresh: PerfFreshRow<PerfZoneStats>[] = [];\n    let firstRow = true;\n    for (const id of matrix) {\n      let runtimeId: PerfRuntimeIdentity, controlReturnSyncMs = initialReturnSyncMs;\n      let ctl: PerfZoneStats | null;\n      if (firstRow) { firstRow = false; ctl = first; runtimeId = identity(initialStartupMs, sweepStartedAt.iso); }\n      else {\n        runtimeId = freshStart();\n        controlReturnSyncMs = returnHome();\n        ctl = await sampleResidencyZone('(town)');\n      }\n      const afterControl = heapNow();\n      if (!ctl) { skipRow({ id, class: 'hold', note: 'the fresh town control could not hold its window' }); continue; }\n      const minted = mintRow(id);\n      if ('class' in minted) { skipRow(minted); continue; }\n      const stats = await sampleResidencyZone(id);\n      if (!stats) { skipRow(holdSkip(id)); continue; }\n      const controlCensus = { residentAreas: ctl.residentAreas, residentActors: ctl.residentActors };\n      const zoneCensus = { residentAreas: stats.residentAreas, residentActors: stats.residentActors };\n      const regime = regimeOf(controlCensus, zoneCensus);\n      const issues = [...residencyRowIssues(ctl.residency?.windows ?? [], 1), ...residencyRowIssues(stats.residency?.windows ?? [], 2)];\n      if (!regime.expected) issues.push(regime.regime);\n      const row: PerfFreshRow<PerfZoneStats> = {\n        tileset: id, runtime: runtimeId,\n        control: ctl, controlCensus, controlReturnSyncMs,\n        mint: minted.mint, mintSyncMs: minted.mintSyncMs,\n        zone: stats, zoneCensus,\n        heapMB: { afterControl, afterZone: heapNow() },\n        valid: issues.length === 0, issues,\n        regime: issues.length ? `${regime.regime} INVALID (${issues.join('; ')})` : regime.regime, expectedRegime: regime.expected && issues.length === 0,\n        contrast: RESIDENCY_COURSE_NOTES.freshContrast,\n      };\n      fresh.push(row);\n      beat('fresh', { row });\n    }\n    return { ...courseReport(first), fresh };\n  };\n  /** THE RESIDENCY RAMP: one run; step 0 is the control already sampled; each\n   *  later step mints and ENTERS one more tileset (its synchronous mint + load\n   *  cost and its rAF load burst recorded apart, never a steady row), travels\n   *  home and re-samples the TOWN with the full window pair, the census that\n   *  window carried, THE AGES (wall and campaign) and THE COMPLETED HISTORY\n   *  beside it. THE AGE CONTROL (opts.rampAgeControl) visits nothing: each\n   *  step walks the town's own entry window and reloads it, so the residency\n   *  stays one while the run ages; it is a comparison under unmatched ages,\n   *  not an isolation, and its report says so. */\n  const rampCourse = async (first: PerfZoneStats): Promise<PerfSweepReport> => {\n    const stepsWanted = Math.max(1, Math.floor(opts.rampSteps ?? RAMP_DEFAULT_STEPS));\n    const pinnedIds = Object.keys(opts.mintPins ?? {}).filter(k => k !== '*');\n    const list = opts.rampAgeControl ? [] : (opts.rampList ?? rampListFor(fullMatrix, pinnedIds, stepsWanted - 1));\n    const steps: PerfRampStep<PerfZoneStats>[] = [];\n    const visitedSoFar: string[] = [], skippedSoFar: string[] = [];\n    const ages = (): { wallMs: number; campaignSec: number } => ({ wallMs: +(performance.now() - sweepStartedAt.wall).toFixed(0), campaignSec: +g.world().time.toFixed(1) });\n    const push = (step: PerfRampStep<PerfZoneStats>): void => { steps.push(step); beat('ramp', { step }); };\n    const initialIssues = residencyRowIssues(first.residency?.windows ?? [], opts.rampAgeControl ? 1 : undefined);\n    push({ valid: initialIssues.length === 0, issues: initialIssues, step: 0, visited: null, mint: null, mintSyncMs: null, visitEntryWorstGap: null, visitHeld: null, returnSyncMs: initialReturnSyncMs, town: first, residentAreas: first.residentAreas, residentActors: first.residentActors, heapMB: heapNow(), ...ages(), history: { visited: [], skipped: [] } });\n    const count = opts.rampAgeControl ? stepsWanted - 1 : list.length;\n    for (let i = 1; i <= count; i++) {\n      let visited: string | null = null, mint: PerfMintReceipt | null = null, mintSyncMs: number | null = null;\n      if (!opts.rampAgeControl) {\n        const id = list[i - 1];\n        const minted = mintRow(id);\n        if ('class' in minted) { skipRow(minted); skippedSoFar.push(id); continue; }\n        visited = id; mint = minted.mint; mintSyncMs = minted.mintSyncMs; visitedSoFar.push(id);\n      }\n      beatTileset = visited ?? '(town)';\n      g.world().player.invulnerable = true;\n      const visitWindowStart = residencyWindows.length;\n      const entry = await residencyWalk(visited ?? '(town)', 1, 'visit-entry', settleMs, 0.6);\n      const returnSyncMs = returnHome();\n      const town = await sampleResidencyZone('(town)');\n      const fatal = g.crash().fatal;\n      if (fatal) throw new Error(`perfSweep: game failed at ramp step ${i}: ` + fatal.msg + (fatal.stack ? ' | ' + fatal.stack : ''));\n      const census = town ? { residentAreas: town.residentAreas, residentActors: town.residentActors } : travel.census();\n      const issues = residencyRowIssues(residencyWindows.slice(visitWindowStart), opts.rampAgeControl ? 1 : undefined);\n      if (!town) issues.push('town window not held');\n      push({ valid: issues.length === 0, issues, step: i, visited, mint, mintSyncMs, visitEntryWorstGap: +entry.worst.toFixed(1), visitHeld: entry.held, returnSyncMs, town, ...census, heapMB: heapNow(), ...ages(), history: { visited: [...visitedSoFar], skipped: [...skippedSoFar] } });\n    }\n    const held = steps.filter(s => s.town !== null && s.valid);\n    const ramp: PerfRampReport<PerfZoneStats> = {\n      steps, ageControl: !!opts.rampAgeControl, list,\n      slopes: rampSlopes(held.map(s => ({ residentAreas: s.residentAreas, residentActors: s.residentActors, gapP50: s.town!.gapP50, gapP99: s.town!.gapP99, simP99: s.town!.simP99, taskMax: s.town!.taskMax }))),\n      slopesNote: RESIDENCY_COURSE_NOTES.slopes,\n      comparisonNote: opts.rampAgeControl ? RESIDENCY_COURSE_NOTES.ageControl : null,\n    };\n    return { ...courseReport(first), matrix: list, ramp };\n  };\n  if (course !== 'cumulative') return course === 'fresh' ? await freshCourse(control) : await rampCourse(control);\n  for (const id of matrix) {\n    const idx = fullMatrix.indexOf(id);\n    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];\n"
        }
      ]
    },
    {
      "file": "src/main.ts",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "e72170047b3287f13a05791bbd25fd9fa54300349425e436f6d7ac05f2d464a3",
      "afterHash": "766efead25e185957da3b92e1c47c598f31f61a1267180a69051ec015e6db038",
      "crlfLines": [],
      "hunks": [
        {
          "before": "      pilot: (src: HeroInputSource | null) => void;\n      hold: (on: boolean) => void;\n      director: () => Director;\n      devStartRun: (classId?: string) => string;\n      loading: LoadingScreen;\n      devStartLoadingRun: (classId?: string) => Promise<void>;\n      devGrantSkill: (skillId: string, level?: number, slot?: number) => number;\n",
          "after": "      pilot: (src: HeroInputSource | null) => void;\n      hold: (on: boolean) => void;\n      director: () => Director;\n      devStartRun: (classId?: string, seed?: number) => string;\n      loading: LoadingScreen;\n      devStartLoadingRun: (classId?: string) => Promise<void>;\n      devGrantSkill: (skillId: string, level?: number, slot?: number) => number;\n"
        },
        {
          "before": "  // startGame path under the first (or named) class, menus dismissed.\n  loading: loadingScreen,\n  devStartLoadingRun: async (classId?: string) => { if (await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0])) ui.hideAll(); },\n  devStartRun: (classId?: string) => {\n    const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n    document.getElementById('start-menu')?.classList.add('hidden');\n    document.getElementById('class-select')?.classList.add('hidden');\n    startGame(cls);\n    return cls.id;\n  },\n  // DEV/QA: seat any catalog skill by id straight onto a bar slot as THE DEV\n",
          "after": "  // startGame path under the first (or named) class, menus dismissed.\n  loading: loadingScreen,\n  devStartLoadingRun: async (classId?: string) => { if (await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0])) ui.hideAll(); },\n  devStartRun: (classId?: string, seed?: number) => {\n    const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n    document.getElementById('start-menu')?.classList.add('hidden');\n    document.getElementById('class-select')?.classList.add('hidden');\n    // THE MATCHED START (src/dev/perf.ts residency courses): an explicit seed\n    // deals the same world every start; undefined keeps today's rolled seed.\n    startGame(cls, seed === undefined ? undefined : buildManifest(account, seed));\n    return cls.id;\n  },\n  // DEV/QA: seat any catalog skill by id straight onto a bar slot as THE DEV\n"
        }
      ]
    },
    {
      "file": ".github/workflows/ci.yml",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "068f71d22e6ca4c9045b4f3f286848b6579c8872f5865fcab9d32ecd1c7bbaa8",
      "afterHash": "e97f26028773d8954a9b4e0d8ae3967a052b39386d7549f1c5a7df94c667d4dc",
      "crlfLines": [],
      "hunks": [
        {
          "before": "          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Retained offline quest ground regression\n        run: |\n          npx tsx balance/check_nativeshardground.ts\n",
          "after": "          npx tsx balance/check_nativeperftravel.ts\n          npx tsx balance/check_nativedesktopperfsource.ts\n\n      - name: Retained residency measurement instrument regressions\n        run: |\n          npx tsx balance/check_perfresidency.ts\n          npx tsx balance/check_perfresidencyboundaries.ts\n          node balance/check_perfresidencystarttiming.cjs\n          node --test scripts/test-launcher-residency.mjs scripts/test-launcher-residency-boundaries.mjs scripts/test-residency-launcher-course.mjs\n          npx tsx balance/check_nativeresidencysource.ts\n\n      - name: Retained offline quest ground regression\n        run: |\n          npx tsx balance/check_nativeshardground.ts\n"
        }
      ]
    },
    {
      "file": "balance/nativeArrivalInvocationSourceFixture.ts",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "eb219abc744593c43c4af573fefb7dc7be65d1738500164cfa6cc19e328294cd",
      "afterHash": "2a960255fa9ee246cc5b8b572275a34793dbda721336641bc36b6d75052a6054",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeResidencySourceFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\n"
        }
      ]
    },
    {
      "file": "balance/check_nativearrivalinvocationsource.ts",
      "predecessor": "459775092bc0c09309fb9f2e2c2d4459f72c06e7",
      "beforeHash": "79f916010b80b607e7f5156269e117e306c269e83950576b2c687071db8297b9",
      "afterHash": "a27c0921322fed9b9a91dd70536aadbe4bc38ae872579d46960411b70e7e0be8",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Mutation, byte identity and filesystem controls for the arrival invocation source boundary. */\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n",
          "after": "/** Mutation, byte identity and filesystem controls for the arrival invocation source boundary. */\nimport assert from 'node:assert/strict';\nimport * as fs from './nativeResidencySourceFS';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport {fileURLToPath} from 'node:url';\n"
        }
      ]
    }
  ],
  "archives": [
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "normalSha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "normalSha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "normalSha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "normalSha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
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
      "file": "balance/nativeArrivalInvocationSourceArchive.ts",
      "normalSha256": "37d9dad012d1f9a26d3810aab8562143464c54fbd63fb045aa6d15fa1a5ed638"
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
      "file": "balance/nativeCrusadeArrivalSourceArchive.ts",
      "normalSha256": "471e489f3adbce006e275cccfececfc60d3251bd4162fe6af5b1a237fe27bc95"
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
      "file": "balance/nativeDesktopPerfArchive.ts",
      "normalSha256": "2cb79307ec1fb32f4c0598681cec065fc46cda019295375d86ad7b6e4cf12833"
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
      "file": "balance/nativeHostPerformanceArchive.ts",
      "normalSha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "normalSha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
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
      "file": "balance/nativeSaveOrderWatchArchive.ts",
      "normalSha256": "5ac2dd2c10684e8323ff3b7787a5f4383ae9894b2c4b67f9b59fd9adc84c70a9"
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
      "file": "balance/nativeShardGroundArchive.ts",
      "normalSha256": "7514fa70975ccbba0f1f1126344dcefa8222e2ad8b662969419af323e1b52cbb"
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
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "normalSha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "normalSha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "normalSha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
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
      "file": "balance/nativeVerminfallArrivalSourceArchive.ts",
      "normalSha256": "4fa454266fb8684c99cff9fcff473414d614011557dd0dcf933c5ee50cb702b9"
    },
    {
      "file": "balance/nativeVerminfallSourceArchive.ts",
      "normalSha256": "01bcc7a2263e52cb0219affdd74f6b05667f958df289ee6ca309ad03688618ae"
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
      "file": ".github/workflows/ci.yml",
      "normalSha256": "e97f26028773d8954a9b4e0d8ae3967a052b39386d7549f1c5a7df94c667d4dc"
    },
    {
      "file": "balance/check_nativearrivalinvocationsource.ts",
      "normalSha256": "a27c0921322fed9b9a91dd70536aadbe4bc38ae872579d46960411b70e7e0be8"
    },
    {
      "file": "balance/check_nativeresidencysource.ts",
      "normalSha256": "481fd23dd13a736a835f21065173aec6a50a0591e9358136af2e3a18a3c4e1f3"
    },
    {
      "file": "balance/check_perfresidency.ts",
      "normalSha256": "b36ff517cc2039fe925ad995bd55f54a9d1233a9e72a092ba2ca6bca5be9bea8"
    },
    {
      "file": "balance/check_perfresidencyboundaries.ts",
      "normalSha256": "63bbf006f8e9fddd27d89c1f997a25310bb093236f6494d284b315dabd325820"
    },
    {
      "file": "balance/check_perfresidencystarttiming.cjs",
      "normalSha256": "2b27f2383896e035c4126e03733e0f667cc8b0f60ab4b2bea8a31e04b6b5507c"
    },
    {
      "file": "balance/native-residency-lifecycle-ui.cjs",
      "normalSha256": "76b7bd8f1bec941b6e6364d3ba4cfc55dd30cf980fd9fb58cf30871ed08fa426"
    },
    {
      "file": "balance/nativeArrivalInvocationSourceFixture.ts",
      "normalSha256": "2a960255fa9ee246cc5b8b572275a34793dbda721336641bc36b6d75052a6054"
    },
    {
      "file": "balance/nativeResidencySourceFixture.ts",
      "normalSha256": "1103cd29cc9b1c38573594f30a634d288a954460e54ddb7694a080ad5608c27e"
    },
    {
      "file": "balance/nativeResidencySourceFS.ts",
      "normalSha256": "8d97091b3454b310d8c371db700828e4272578699ccd88933f8d912462ca6291"
    },
    {
      "file": "docs/design/desktop-residency.md",
      "normalSha256": "6f0dde378d974252ce5a1a8f7d4eddcadade9edeb0799da757c6fb71c1917b04"
    },
    {
      "file": "launcher/main.cjs",
      "normalSha256": "60522a6e7befe5d119b138c36bf9365cdcfd5cd73cbee7d3d2877e663e2a57ec"
    },
    {
      "file": "launcher/perfresidency.cjs",
      "normalSha256": "9a9522850863baa484403ab5e4e2306148e7b46ed1fa383c2d9aab4a50949955"
    },
    {
      "file": "scripts/residency-launcher-course.cjs",
      "normalSha256": "16765cb372a1f9632d238ae1beadfe5d86037060a51990de8906226efab250bd"
    },
    {
      "file": "scripts/residency-launcher-fixture.cjs",
      "normalSha256": "011838809b641ec07a261855e1b5901c9236637bf60c5736c5232773d6de8403"
    },
    {
      "file": "scripts/test-launcher-residency-boundaries.mjs",
      "normalSha256": "f22ffa46b9fff488cab8c4f3b6e00ce0cfc001ddaf8d407e5a8538d2bc461172"
    },
    {
      "file": "scripts/test-launcher-residency.mjs",
      "normalSha256": "56abb5532565dc27e9982cfb88153d10a17761d664da183ae27ff1da7e8dcf78"
    },
    {
      "file": "scripts/test-residency-launcher-course.mjs",
      "normalSha256": "96d91e88ff0fe4d882b7f9de354df9692b4bbaf7a6d91510b38381f996ba1611"
    },
    {
      "file": "src/dev/perf.ts",
      "normalSha256": "fe1eb1aa67bbca442d816600d76049f191553bddbc0552362b2401bb86d09ae9"
    },
    {
      "file": "src/dev/perfResidency.ts",
      "normalSha256": "1f363995267b8d95d45af9370dd9245189a62faa456395810843c6460e581d90"
    },
    {
      "file": "src/main.ts",
      "normalSha256": "766efead25e185957da3b92e1c47c598f31f61a1267180a69051ec015e6db038"
    }
  ]
};
