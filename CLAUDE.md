# CLAUDE.md — Hollow Wake (ARPG)

Guidance for Claude Code working in this repository. This file is committed and
shared with everyone who clones the repo.

## What this is
A top-down action RPG prototype in TypeScript + Vite, rendered on HTML5 Canvas
2D. Design thesis: every system is open, modular **data** — skills, monsters,
statuses, passives, zones are plain data entries composed by one shared engine,
and the player, monsters, and minions all act through a single skill pipeline
(`World.useSkill()` in `src/engine/world.ts`).

## Commands
- `npm install` — first-time setup (also run automatically by the .bat launchers).
- `npm run dev` — Vite dev server at http://localhost:5173 (browser dev mode, `Play Game.bat`).
- `npm run game` — the DESKTOP APP: Electron launcher window (shows installed
  version, checks the GitHub remote for updates, one-click pull → install →
  build) then the game in its own window. `Launch Game.bat` is the double-click
  wrapper; `npm run game:play` skips the launcher.
- `npx tsc --noEmit` — fast type-check with no output. Primary correctness gate.
- `npm run check` — type-checks the game AND the launcher (`tsconfig.launcher.json`
  runs strict checkJs over `launcher/*.cjs`).
- `npm run build` — `tsc --noEmit && vite build` (type-check + production build to `dist/`).
- `npm run smoke` / `npm run smoke:launcher` — headless Electron self-checks:
  boot the real game window (or launcher), assert `__game` / start menu /
  `/__save` endpoint (or the IPC status round-trip), print `SMOKE … OK`, exit
  0/1. Run these after touching `launcher/` or anything boot-related.
- `npm run perf` — the PERFORMANCE HARNESS: boots the real desktop game
  (visible window — true compositor pacing), starts a run, mints one zone per
  frontier tileset through the real mint path, walks each under real rAF
  while sampling frame telemetry (rAF-gap p50/p95/p99, hitch counts, sim-vs-
  render split, entry burst), and gates against `balance/perf.config.json` —
  each zone judged RELATIVE to the same run's town control plus absolute
  hitch backstops. Exit 2 on breach; per-run reports in `balance/reports/`.
  Flags: `-- --filter=mire --seconds=8`. Run after render/engine perf work or
  when a biome feels stuttery — the sweep derives its matrix from the tileset
  registry, so new biomes join automatically.
- `npm run sim -- …` — the BALANCE HARNESS: the real engine headless and
  deterministic (seeded), running scenario suites over reference builds.
  `run --suite smoke` after any `src/data/` change; `sweep skills` ranks every
  attack/spell skill at equal investment; `sweep supports` is the SKILL ×
  SUPPORT NO-OP MATRIX (census through the real socket gate + same-seed A/B
  probes — byte-identical fingerprint = definitive INERT; run a
  `--support <gem>` slice after any supports.ts change); `sweep progression
  --geared` prints the per-class power curve with the gear-value column;
  `audit affixes` / `audit drops` are the ECONOMY AUDITS (dead-affix +
  dead-stat detectors, loot yields vs DROP_CFG); `baseline check --suite
  smoke` is the regression gate (exit 2 on breach). Docs:
  `docs/balance/README.md` (framework + metrics glossary) and
  `docs/balance/AGENT_PLAYBOOK.md` (the contract for agent-driven mass
  balance passes, incl. run/follow-up recipes for the matrix + economy
  passes). Type-checked by `tsconfig.sim.json` inside `npm run check`.
- `npm run genqa` — the GENERATION QA HARNESS: generateLayout headless over
  the whole authored matrix (every tileset + variant with its rolls, every
  registered layout generator — interiors also at cave scale — and every
  composition forced at chance 1) × several seeds, asserting the generation
  invariants (registry refs incl. composition sites/rolls, determinism,
  inverse forbidOn, portal clears, caveSeeds zip, grid reachability,
  door-sides sanity, fuse contiguity). Exit 2 on breach — run after any
  levelgen/tileset/formation/composition/landmark change.
  Flags: `-- --seeds 5 --filter mire --verbose`.
- `npm run preview` — serve the built `dist/`.

No unit-test runner is configured; `tsc --noEmit`, the smoke checks, the
balance harness's smoke suite, and the generation QA sweep are how we verify
changes.

## Layout
- `src/engine/` — systems: `world.ts` (core loop, `useSkill`), `stats.ts`
  (layered modifier engine), `damage.ts`, `status.ts`, `skills.ts` (skill
  schema), `actor.ts` (one entity model for player/monsters/minions),
  `ai.ts` + `brain.ts` (composable enemy AI), `los.ts` (THE occlusion
  raycast: one shot/sight ray over doodads + grid regions, `LOS_CFG`
  delivery defaults, the `phasing` stat lever; AI pathing rides
  `World.pathField()` — docs in `docs/engine/los-pathing.md`),
  `shapes.ts` + `projForms.ts` (the HIT-SURFACE fabric: doodad collision
  shapes as data via `hitSurfaceOf`, projectile drawn-form hit tests via
  `PROJ_FORM_GEO` — docs in `docs/engine/hit-surfaces.md`),
  `presence.ts` (leveled-list
  spawn envelopes: weight-vs-level curves on any monster-table entry or
  MonsterDef, folded at `World.weightedPick(table, atLevel)`),
  `fog.ts` (THE FOG FABRIC: living, roaming fog banks as data —
  FogBankDef kinds + ZoneTheme.fog specs; the drawn lobes are the hit
  surface, statuses granted while inside — docs in `docs/engine/fog.md`),
  `creep.ts` (THE CREEP FABRIC: living ground membrane as data — CreepDef
  kinds + ZoneTheme.creep pockets, runtime sources via World.creepEnsure /
  MonsterDef.creepSource hearts that recoil on death; the drawn skin is
  the hit surface — docs in `docs/engine/creep.md`),
  `collapse.ts` + `traversal.ts` + `render/vis/understory.ts` (THE VERTICAL
  FABRICS: dissolving ground as a `ZoneTheme.collapse` spec — contact
  crumble + seeded rim-inward melt, an eroding-but-guaranteed causeway to
  a never-melting goal; registered vertical-crossing cinematics
  (`data/traversals.ts`); the world far BELOW shown through `window`
  region cells — the Ascent/Aetherial ride all three; docs in
  `docs/engine/collapse.md`),
  `timeflow.ts` (THE TIMEFLOW FABRIC: time itself as data — one TimeHold
  registry behind the pause menu's real pause, Ultimatum-style menu
  freezes (`TIME_CFG.surfaces`), `SkillDef.chrono` time-stop casts, and
  `StatusDef.timeScale` stasis/slow statuses; world- and per-actor scales,
  solo-only menu policy via `Timeflow.allowHold` — docs in
  `docs/engine/timeflow.md`).
  THE REFLEX FABRIC (flasks are never locked out): `SkillDef.reflex` /
  the `reflex` stat + `REFLEX_CFG` open instant presses THROUGH the
  user's own casts/dashes/recovery without disturbing them; the THIRST
  gate (`GateSpec.missing`, waived by `thirstless`) refuses moot drinks
  before any cost — docs in `docs/engine/reflex.md`.
  THE SENTRY FABRIC (inactive NPCs stay where authored): dormant
  un-roused neutrals (ai.ts `isDormant`) are PLANTED — wind drift,
  knockback/pull and environmental strikes (`Zone.spareDormant`) pass
  them by — and DUTY POSTS (`PostSpec`/`POST_CFG` in brain.ts;
  `MonsterDef.post`, `GuardianSpec.post`, or spawner stamps via
  `Actor.aiPost`) walk a displaced body back to its station, dormant or
  awake. SKY EXPOSURE (`skyOf` in data/zones.ts: `ZoneDef.sky` baked
  from `TilesetDef.sky`/`ZoneSpec.sky`, caves + off-surface dimensions
  sheltered by derivation) gates ALL in-zone weather through
  `World.skyFront()` — no storms inside cellars, caves, or interiors.
  `levelgen.ts`, `worldgen.ts`.
  ZONE OBJECTIVES are a data vocabulary (ObjectiveSpec + per-kind
  `OBJECTIVE_SEALS` exit policy + `data/beacons.ts` survey spires and the
  monster-LURE fabric — docs in `docs/engine/objectives.md`);
  items: `items.ts` (gear schema + every ITEM_CFG tunable), `itemgen.ts`
  (the one roller/compiler/describer), `inventory.ts` (tetris bag grid),
  `loot.ts` (nestable loot tables + DROP_CFG kill-path levers).
- `src/data/` — content as data: `skills.ts`, `supports.ts`, `monsters.ts`,
  `passives.ts`, `classes.ts`, `zones.ts`, `tilesets.ts`, `procs.ts`,
  `beacons.ts` (survey-spire objective tuning); items:
  `itembases.ts` (base families), `itemaffixes.ts` (the affix gamut via
  `fam()`), `uniques.ts`, `loottables.ts`, `vestiges.ts` (socketables +
  Epitaph words). Adding content here needs no engine changes.
- `src/packages/` — optional per-run world-event overlays (Warbands, Breach,
  Contagion, …).
- `src/sim/` — the browser-safe half of the balance harness: headless boot
  (`arena.ts`: shims + the quiet `sim_arena` zone), build injection through
  `world.adoptSavedMeta` (`builds.ts`), input-source pilots, the seeded
  episode runner, tap-fed metrics; scenario/build/target LIBRARIES as data
  in `src/sim/data/`. Observation flows through `src/engine/tap.ts` —
  optional chokepoint taps in `damage.ts`/`world.ts`, observe-only,
  null-cost when unset. Node stops at `balance/cli.ts`; per-run reports
  land in `balance/reports/` (gitignored), committed baselines in
  `balance/baselines/`.
- `src/render/` — Canvas 2D renderer + the VISUAL FABRIC (`render/vis/`):
  materials registry (one flat def color → full shaded look), sprite bake
  cache, baked actor bodies, ground texture chunks, the doodad painter
  library (kinds map to painters via `src/data/doodadVisuals.ts` — a new
  doodad kind needs ONE data entry, no renderer edits), the dynamic light
  layer (doodad `light` specs as data), and weather particles. Tunables in
  `render/vis/visConfig.ts`; docs in `docs/render/README.md`.
- `src/ui/`, `src/net/`, `src/meta/` — DOM panels, co-op transport, and the
  account / save / permadeath meta-layer.
- `launcher/` — the Electron desktop shell (plain CJS, type-checked via
  `tsconfig.launcher.json`): `main.cjs` (windows, git update flow, build
  stamping, IPC, smoke modes, and the full-reset wipe: `saves/` + Chromium
  storage behind a native confirm), `server.cjs` (loopback HTTP server for `dist/`
  that re-implements the Vite disk-save `/__save/:slot` endpoints — SAME
  `saves/` folder as dev; keep the two implementations in sync), `preload.cjs`
  + `launcher.html` (the launcher UI). Tunables live in `launcher.config.json`
  (committed defaults) deep-merged with `launcher.config.local.json`
  (gitignored, machine-local) — never hardcode window/port/repo values.
- Entry point: `index.html` → `src/main.ts`.

Some data files are very large (`src/data/skills.ts`, `src/engine/world.ts`).
Prefer targeted `grep` over reading whole files.

## Commit convention
- After a meaningful change, run `npx tsc --noEmit` (or `npm run build`) and make
  sure it is clean **before** committing.
- Commit with a clear, imperative message saying what changed and why, e.g.
  `Add Frost Nova skill with cold-shatter threshold`.
- Keep commits focused — one logical change each where practical.
- Push when the user asks.
- Never commit generated or personal files: `node_modules/`, `dist/`, `saves/`,
  and `.claude/settings.local.json` are gitignored on purpose. Machine-specific
  settings belong in `.claude/settings.local.json` (stays local, never pushed).
