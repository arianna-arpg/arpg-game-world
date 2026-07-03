# CLAUDE.md — ARPG Test Game

Guidance for Claude Code working in this repository. This file is committed and
shared with everyone who clones the repo.

## What this is
A top-down action RPG prototype in TypeScript + Vite, rendered on HTML5 Canvas
2D. Design thesis: every system is open, modular **data** — skills, monsters,
statuses, passives, zones are plain data entries composed by one shared engine,
and the player, monsters, and minions all act through a single skill pipeline
(`World.useSkill()` in `src/engine/world.ts`).

## Commands
- `npm install` — first-time setup (also run automatically by `Play Game.bat`).
- `npm run dev` — Vite dev server at http://localhost:5173.
- `npx tsc --noEmit` — fast type-check with no output. Primary correctness gate.
- `npm run build` — `tsc --noEmit && vite build` (type-check + production build to `dist/`).
- `npm run preview` — serve the built `dist/`.

No test runner is configured; `tsc --noEmit` is how we verify changes compile.

## Layout
- `src/engine/` — systems: `world.ts` (core loop, `useSkill`), `stats.ts`
  (layered modifier engine), `damage.ts`, `status.ts`, `skills.ts` (skill
  schema), `actor.ts` (one entity model for player/monsters/minions),
  `ai.ts` + `brain.ts` (composable enemy AI), `levelgen.ts`, `worldgen.ts`.
- `src/data/` — content as data: `skills.ts`, `supports.ts`, `monsters.ts`,
  `passives.ts`, `classes.ts`, `zones.ts`, `tilesets.ts`, `procs.ts`. Adding
  content here needs no engine changes.
- `src/packages/` — optional per-run world-event overlays (Warbands, Breach,
  Contagion, …).
- `src/render/` — Canvas 2D renderer (placeholder geometry art driven by data).
- `src/ui/`, `src/net/`, `src/meta/` — DOM panels, co-op transport, and the
  account / save / permadeath meta-layer.
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
