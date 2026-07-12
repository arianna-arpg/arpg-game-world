# Hollow Wake

**A top-down action RPG built around one idea: every system is open, modular data.**

Skills, monsters, statuses, passives, items, and zones are all plain data entries composed by one shared engine. The player, monsters, and minions act through a single skill pipeline — so a fireball behaves the same whether a sorcerer casts it, a monster breathes it, or your summon throws it. Classes are starting points, not cages.

Built in TypeScript on an HTML5 Canvas 2D renderer, wrapped in an Electron desktop shell. Prototype, in active development.

`v0.2.1` · Windows · Linux · Steam Deck · TypeScript + Vite + Canvas 2D + Electron

> **Status:** early, playable prototype. Deep, working systems under deliberately placeholder geometry art. No audio yet. See [Project status](#project-status).

---

## Quick start

### Play a build

Grab a packaged build from the [Releases](https://github.com/arianna-arpg/arpg-game-world/releases) page:

- **Windows** — run `HollowWake-Setup-<version>.exe` (per-user install, no admin needed).
- **Linux / Steam Deck** — download the `.AppImage`, `chmod +x` it, and run. To play on a Deck, add it as a non-Steam game — see [`STEAM.md`](STEAM.md) for the one-line installer and controller notes.

The desktop launcher checks GitHub Releases for updates on start and offers a one-click update.

### Run from source

Requires Node.js and npm.

```bash
npm install       # first-time setup
npm run dev       # browser dev mode at http://localhost:5173
npm run game      # the desktop app (Electron launcher → game window)
npm run build     # type-check + production build to dist/
```

On Windows you can double-click `Play Game.bat` (browser dev mode) or `Launch Game.bat` (desktop app); both run `npm install` for you the first time.

### Controls

Keyboard/mouse defaults: **WASD** move · **LMB/RMB + 1–6** skill slots · **C** character · **B** skill book · **P** passive tree · **M** map · **Esc** menu. Everything is rebindable.

Full native controller support (Xbox / DualSense / Steam Deck) works in the browser build and the desktop app alike — layout and feel tunables in [`STEAM.md`](STEAM.md).

---

## What's in it

Current content, all authored as data:

Approximate figures — the exact, current counts are whatever's in `src/data/`
(and are surfaced live by the website's Database):

| | |
|---|---|
| **Skills** | 350+ active skills · 200+ support gems that reshape them |
| **Classes** | 15 playable classes, each a starting kit of attributes and signature skills |
| **Monsters** | A large bestiary across a set of composable AI archetypes |
| **Passive tree** | Hundreds of nodes — keystones, notables, and raw attributes placed on the graph itself |
| **Systems vocabulary** | 10 attributes · a spread of damage types · a deep set of status effects, charge resources, and procs |
| **Items** | full gear system: base families, an affix gamut, uniques, a grid ("tetris bag") inventory, nestable loot tables, and socketable **vestiges** with Epitaph words |
| **World** | two hand-authored anchors — the starting town and Wayfarer's Crossroads — opening onto an effectively infinite procedural frontier |
| **Run modifiers** | optional per-run world-event packages (Warbands, Breach, Contagion, Demon Invasion, …) layered onto the world graph — plus meta-layer systems like the **Immortal** death mode (which rewrites the rules of death itself) and a **Mercenary** roster |
| **Factions** | rival factions with ally/hostile relationships that fight each other on shared terrain |

---

## The core idea

**Skills are loot.** Skills drop from monsters and level up by sacrificing gems at fonts — not from character levels. Character XP grants passive points instead. Your build is the skills you find and the supports you socket into them.

**One pipeline for everyone.** Player, monsters, and minions all resolve actions through `World.useSkill()` in `src/engine/world.ts`. A summoner's skeletons literally run on the same skills monsters do.

**One modifier engine.** Every number flows through a layered, tag-scaled formula — `flat → increased → more → override` — implemented once in `src/engine/stats.ts` and shared by every system. Content authors compose behavior out of tags and modifiers rather than writing new engine code.

**Data in, no engine changes.** Adding a skill, support, monster, passive, proc, item base, affix, unique, or class means adding an entry under `src/data/`. The engine already knows how to run it.

### Classes

Warrior · Magician · Rogue · Berserker · Sorcerer · Ranger · Guardian · Summoner · Swashbuckler · Juggernaut · Pyromancer · Assassin · Necromancer · Cleric · Tamer

Each ships a starting attribute spread and a handful of signature skills, but nothing locks you in — every class draws from the same shared skill and passive pools.

---

## Architecture

One engine, content as data, a Canvas renderer, and an Electron shell around it.

| Area | What lives there |
|---|---|
| `src/engine/` | Core systems: `world.ts` (loop + `useSkill`), `stats.ts` (layered modifiers), `damage.ts`, `status.ts`, `skills.ts`, `actor.ts` (one entity model for player/monsters/minions), `ai.ts` + `brain.ts` (composable AI), `los.ts` (occlusion raycast + pathing), `presence.ts` (leveled spawn envelopes), `levelgen.ts`, `worldgen.ts`; items: `items.ts`, `itemgen.ts`, `inventory.ts`, `loot.ts` |
| `src/data/` | Content: `skills.ts`, `supports.ts`, `monsters.ts`, `passives.ts`, `classes.ts`, `zones.ts`, `tilesets.ts`, `procs.ts`, `itembases.ts`, `itemaffixes.ts`, `uniques.ts`, `loottables.ts`, `vestiges.ts` |
| `src/render/` | Canvas 2D renderer + the **visual fabric**: materials registry, sprite bake cache, doodad painter library, dynamic light layer, and weather particles — new doodad kinds are one data entry |
| `src/packages/` | Optional per-run world-event overlays (Warbands, Breach, Contagion, …) |
| `src/sim/` | Browser-safe half of the balance harness: headless boot, seeded episode runner, build injection, metric taps |
| `src/ui/`, `src/net/`, `src/meta/` | DOM panels, co-op transport, and the account / save / permadeath meta-layer |
| `launcher/` | The Electron desktop shell (CJS): update flow, loopback save server, launcher window |

Entry point: `index.html` → `src/main.ts`.

Some data and engine files are very large (`src/data/skills.ts`, `src/engine/world.ts`). Prefer targeted `grep` over reading them whole. For working conventions and the deeper subsystem tour, see [`CLAUDE.md`](CLAUDE.md) and the docs under [`docs/`](docs/).

---

## Verification & tooling

There is no unit-test runner. Correctness is gated by type-checking plus a set of headless harnesses:

- **`npx tsc --noEmit`** — fast type-check, the primary correctness gate. `npm run check` type-checks the game, launcher, and sim projects together.
- **`npm run smoke` / `smoke:launcher`** — headless Electron self-checks that boot the real game (or launcher) and assert it comes up.
- **`npm run sim -- …`** — the **balance harness**: the real engine, headless and deterministic (seeded). Runs scenario suites, ranks every skill at equal investment, runs the skill × support no-op matrix, prints per-class power curves, and audits the item economy. Docs in `docs/balance/`.
- **`npm run perf`** — the **performance harness**: boots the real desktop game and samples frame telemetry per procedural zone, gating each biome against a town control.
- **`npm run genqa`** — the **generation QA harness**: runs level generation across the whole authored tileset/variant matrix over several seeds and asserts the generation invariants.

Run the relevant harness after touching the area it covers.

---

## Building & packaging

`electron-builder` packages the desktop shell into real executables — a Windows installer and a Linux AppImage:

```bash
npm run dist          # Windows installer
npm run dist:linux    # Linux AppImage (the Steam Deck artifact)
npm run dist:all      # both
```

Releases are cut by tagging `v<version>` matching `package.json`; a GitHub Action builds both platforms and publishes the release the launcher and Steam Deck installer read from. The complete packaging, release, and Steam Deck story lives in [`STEAM.md`](STEAM.md).

---

## Project status

Hollow Wake is an in-development prototype. The systems are broad and working — skills, supports, items, passives, procedural worlds, AI, factions, co-op, permadeath — but the presentation is intentionally minimal for now:

- **Art** is deliberate placeholder geometry rendered through the visual-fabric shading layer, not final assets.
- **Audio** is not implemented yet.
- Balance, class identity, and content are actively evolving between versions.

If you are reading this as reference for the *current* state of the project, trust this file and [`CLAUDE.md`](CLAUDE.md) over any older description: the codebase already includes a full equipment/affix/unique/vestige item system, controller support, and desktop packaging.

---

## Credits

Made by Arianna. Repository: [arianna-arpg/arpg-game-world](https://github.com/arianna-arpg/arpg-game-world).
