# The skill showcase

A skill showcase is the skill itself, cast live in the game by the game: the
hero on a bare stage, training dummies to strike, the skill played on a loop.
It always matches the current build (nothing is recorded), it needs no
download and no installer growth, and it works offline.

Where showcases appear is deliberately **not** this system's decision. A
surface asks for one; the showcase does the rest. Today a single temporary
seat exists so the foundation can be exercised: the bag gem tooltip
(`gemItemTooltip` in `src/ui/panels.ts`, one `skillShowcaseMarkup` line).
Moving it to a Vault card, an NPC prompt or anywhere else is a matter of
emitting the element there instead.

The same stages also film the website's skill clips
(`scripts/capture-skill-clips.cjs`, see `docs/design/site-cinema.md`), so
the game and the site show one choreography.

## Files

| File | Role |
|---|---|
| `src/data/skillShowcase.ts` | `SHOWCASE_CFG` (every dial), `SHOWCASE_STAGES` (ground looks), `SHOWCASE_SETUPS` (per-skill needs). |
| `src/showcase/stagePlan.ts` | `planStage(def)`: pure. Hero, foes, camera, aim and the hand's rhythm from the skill's own data. |
| `src/showcase/stage.ts` | `buildStage(world, plan, spec)`: the plan made real in a World, with the director, the gatekeeper and the upkeep. |
| `src/showcase/engine.ts` | The engine realm's entry (`showcase.html`): boot, play, frame, report. |
| `src/showcase/shield.ts` | Installed first in the engine realm: no storage, no `/__save` traffic. |
| `src/showcase/host.ts` | The game's side: mounting, the hidden engine frame, the frame loop, visibility, disposal. |
| `showcase.html` | The engine's page (a second Vite input; both pages share one chunk). |

## Asking for a showcase

**Declarative.** Any element wearing `data-skill-showcase` becomes a
showcase while it is on screen:

```html
<div data-skill-showcase="frost_nova" data-showcase-level="7"
     data-showcase-supports="spell_echo:3,multistrike"></div>
```

`skillShowcaseMarkup(spec, { width })` writes that element for surfaces built
from HTML strings (tooltips, cards). The element's own CSS sets its size; the
showcase fills it at 16:9 (`--skill-showcase-w` sets a width for
shrink-wrapped boxes such as the tooltip). A skill with no showcase (a
`skip` row, or an unknown id) hides its element (`data-showcase-empty`).
`installSkillShowcases(document.body)` (once, in `main.ts`) watches the page
for these elements: mount on arrival, follow attribute changes, dispose on
removal.

**Imperative.** `mountSkillShowcase(host, spec)` returns a handle with
`update(spec)` and `dispose()`. `prewarmSkillShowcases()` boots the engine
ahead of need (a surface may call it when it opens).

The spec is `{ skillId, level?, supports?: { id, level? }[] }`, so a surface
can show the player's own gem as it would cast.

## The engine

`showcase.html` runs in a hidden same-origin frame the host owns, sized to
`SHOWCASE_CFG.render`. It is a separate realm: its module state, its
`Math.random`, its account and its settings are its own, so a showcase can
never reach the live world. Persistence is closed twice:

- **The shield** (`shield.ts`, evaluated before any game module) shadows
  `localStorage` and `sessionStorage` with in-memory stores (a showcase never
  reads the player's saves either) and answers every `/__save` fetch or
  beacon with a quiet refusal.
- **The latch:** the engine flips `suppressSaves`, so the World's own
  `saveAccount` calls refuse.

The engine never runs a loop of its own. `frame(dtMs)` steps the stage one
tick (input, AI, update, upkeep) and renders it with `Renderer.worldOnly`:
the world and its light, no labels, floating text, screen overlays or HUD.
`Renderer.setBaseZoom` frames the plan's span. Each play builds a fresh
World through the balance harness's factory (`makeSimWorld`), which takes
about 10 to 30 ms, so nothing leaks between skills or loops. A cycle ends on
a fresh stage. The engine's boot skips the content census
(`bootSimEngine({ validate: false })`); the game around it already ran it.

API on `window.__hwShowcase`: `ready`, `play(spec, opts)`, `frame(dtMs)`,
`report()`, `catalog()`, `config`, `why`, `bootMs`, `stop()`.

## The stage

`planStage` reads the skill's delivery, its `ai.range`, its cast mode and its
targeting:

- **Ground:** a firing line for projectiles and placed areas, melee reach for
  strikes and cones, a ring for novas, auras and self casts, out-and-home
  runs for dashes, leaps and blinks.
- **Bodies:** dummies are made targetable (a passive body is scenery to AI,
  homing shots and shoves), kept whole so no life bar flickers, and walked
  back to their posts after a shove.
- **The hand** (the director) presses through `World.applyInputs`, the
  artery every player cast takes. It holds ordinary casts, presses and holds
  channels, guards and overcharges, holds a charge until the bar is full,
  presses perfect and timed casts inside their windows, mashes multitudes,
  and runs travel skills out and home.
- **The gatekeeper** keeps what a cast spends or waits on ready: damage pools,
  gauges, charge banks and a thirst for missing life, refilled at the
  cooldown cap's pace (one second), so a loop shows the skill several times.
- **Borrowed setups** come from the skill's own targeting where they can:
  corpse-targeted skills find a body before each dummy, ally-targeted skills
  find a wounded companion, a required status is kept on the dummies, and a
  gathered swarm arrives claimed. `SHOWCASE_SETUPS` covers the rest: a living
  `foe` (Tame Beast's bled wolf), a `prep` cast (mines to detonate), a longer
  `hold`, or a `skip` with its reason.

## The host

- **One engine** serves every surface. The element most recently brought on
  screen plays after a short settle (140 ms), so a cursor sweeping a grid of
  skills restages nothing.
- **Frames:** each new engine frame is copied into that element's own canvas
  (cover-fit, capped at the render size and a device pixel ratio of 2), with
  a soft blink across each loop seam (`SHOWCASE_CFG.fade`).
- **Visibility and disposal:** off-screen or hidden elements pause. With
  nothing to show for `idleDisposeSec` (45 s), the engine frame is torn down
  and its realm freed.

Measured on a production build: the first showcase appears about 0.6 s after
it is first needed, with a worst main-thread frame gap of about 90 ms during
the one-time boot. A visible showcase costs a few milliseconds per frame.

## Extending

- **A new surface:** emit the element, or mount one.
- **A skill that needs more than dummies:** add a `SHOWCASE_SETUPS` row.
- **Framing, pace or ground:** `SHOWCASE_CFG` and `SHOWCASE_STAGES`.

## Verification

- `npx tsx balance/probe_skillshowcase.ts` (on the probe gate): every player
  skill plans a stage, the hand casts one skill of every delivery and cast
  mode, the setups and the gatekeeper work, and one seed plays one loop.
- `npm run build`, then `npx electron balance/skill-showcase-ui.cjs` (the
  hidden walkthrough, with temp saves): the tooltip seat mounts, the engine
  boots once and its frames arrive and move, leaving stops the loop, a
  second gem restages without a reboot, and the engine realm can neither
  write a save nor read the player's. Frames land in
  `balance/reports/skill-showcase/`.
