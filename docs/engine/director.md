# The Director

`src/director/` stages real play as data and films it. A **shot** is a
`ShotSpec` (`shot.ts`): a minted zone of any tileset, the day clock and
weather, a hero built through the balance harness's own injector, allies and
foes, the agent playing the hero (`docs/engine/agent.md`), a camera, and
timed cues. A shot list is plain JSON, so a trailer, a store-page capture or
a regression film can be authored without code.

Nothing is faked. The zone is the real mint (`World.devMintTileset`), the
build is `applyBuild` from `sim/builds.ts`, monsters come through
`createMonster` and the ordinary spawn rules, the hero is driven through
`World.applyInputs`, and every frame is the game's own renderer.

## The pieces

| File | Role |
| --- | --- |
| `shot.ts` | `ShotSpec`, `SpawnSpec`, `Cue`, `DomAction`, `Place` |
| `director.ts` | `Director`: `stage(spec)`, `frame()`, `end()`, the guard pool, the gatekeeper, the event log |
| `camera.ts` | `CinematicCamera`: follow, offset, lead, spring damping, zoom keys, authored paths, foe framing |
| `scripts/capture-gameplay.cjs` | the Electron recorder: boots a built game, films each shot to frames, a preview and `meta.json` |

`main.ts` exposes `__game.director()` with a small host (`DirectorHost`):
the world, the renderer, a run starter, a stepper, the pilot seam, the clock
hold, the account ledger and the UI.

## The held clock

`stage()` holds the game loop (`__game.hold(true)`), so nothing advances
except through `frame()`, which runs exactly one tick of `1 / fps` sim
seconds (times the shot's `timeScale`) and renders it. A take is therefore
deterministic: the same seed and the same spec give the same frames, however
slowly the frames are read back. `seedGlobalRandom` (`sim/rng.ts`) pins the
global stream for the shot; `end()` restores everything.

## Staging, in order

1. Seed, mark the prologue as lived, hold the clock, start a fresh run of the
   hero's class, and run the UI's own Esc sweep until nothing stands.
2. Mint the zone (or stay in Lastlight for `'town'`).
3. Account access (`progression`, `awaken`) through the dev progression
   catalog's recipes (`dev/progression.ts`), then the build (`'auto'`
   passives use the harness's greedy walk for the level).
4. Attribute requirements (`attributes`, default `'ignore'` through
   `World.devIgnoreSkillAttributes`), the guard, the power dial, shot-scoped
   drop levers (`drops`), the map lens (`lens`).
5. Place the hero (`at`), clear ambient foes (`clear`), set the day and the
   weather front, spawn allies and foes.
6. Install the event log, hand the seat to the agent (or an idle pilot), set
   the bake scale and capture viewport, the renderer flags and the camera.
7. Warm up for `warmup` seconds, rendered but not counted. Cues with
   negative times fire during the warm-up, so a long setup (a ten-second
   wind-up, a summon army forming) plays out before the first filmed frame.

## Keeping a take alive

- **The guard** (`guard`, default `'pool'`): a deep life source plus a
  per-hit ceiling (`hitCap`) and a standing poise bar, so blows land and read
  normally but nothing kills or stun-locks the hero. `guardLife` sets the
  pool for HUD shots, where the orb is visible. `'floor'` holds a 35% floor
  instead. A `mortal` cue lifts the guard so a real blow can land.
- **The gatekeeper** (`keep`): caps cooldowns and keeps pools, gauges and
  charge banks ready, so a short take shows skills rather than their bars.
  Ultimates keep their real cooldown unless `keep.ultimates` is set.
- **The power dial** (`power`): a stand-in for late-game gear, as a `more`
  multiplier on hero and minion damage.

## The event log

Each `frame()` returns the hero's casts, landed blows (count, peak, crits),
blows taken, kills (with screen positions and a boss flag) and the hero's
death, read through the engine's observation seam (`engine/tap.ts`). The
recorder writes them per frame into `meta.json`; the trailer reads them to
put impact accents and sounds on the game's real blows.

## The camera and the clean plate

`CinematicCamera` follows the hero (or a body, or a point), leads its
motion, springs toward it (`damp` is a half-life), eases zoom keys, can run
an authored path, and can frame nearby foes. Zoom is authored at a 1920
reference width, so the same shot frames identically at any capture size.

The renderer gains a few director flags: `directorFocus` (the camera's word
outranks scenes and locks), a capture viewport (render at any size, any
window), `directorClean` (no overhead bars or cast bars), a lifted sight
veil, and `directorCinematic` (with the HUD off, still draw the action's own
screen moments: the eyecatch, the held-time wash, the death flash).
`bakeScale` supersamples sprite bakes so close cameras stay crisp
(`render/vis/bakeScale.ts`).

## Page shots

`capture: 'page'` photographs the whole composited page, panels included,
at the recorder's window size (`--dpr 1.3333` makes a 1920x1080 page
photograph at 2560x1440). `ui` cues call UI methods (`toggleInventory`,
`toggleTree`, `openSkillTree`, `toggleMap`); `dom` cues dispatch synthetic
pointer, wheel and key events at selectors, or append capture-framing CSS.

## The recorder

```bash
npm run build
npx electron scripts/capture-gameplay.cjs --shots shots.json --w 2560 --h 1440 --sheet
```

Flags: `--only`, `--root`, `--out` (default `balance/reports/gameplay`),
`--format jpg|png`, `--preview <width>`, `--sheet`, `--show`, `--dpr`, and
`--probe '<js>'` (evaluate an expression after staging each shot and print
the result: selectors, state). Each take lands in `<out>/<id>/` as
`frames/`, `preview.mp4`, `meta.json` and an optional `sheet.png`. The window
uses a temporary saves folder and partition; the player's saves are never
touched.

## Extending

Add a field to `ShotSpec` and read it in `stage()` or a cue. Prefer the
game's own seams (the dev progression catalog, the loot levers, the map
lens) over new state, restore anything shot-scoped in `end()`, and keep
cues declarative so shot lists stay plain JSON.
