# THE ULTIMATE FABRIC — super arts and THE EYECATCH

`src/engine/ultimates.ts` · `src/render/vis/eyecatch.ts` · `src/data/ultimates.ts`
· probe `balance/probe_ultimates.ts`

An **ultimate** is an ordinary catalog skill wearing `SkillDef.ultimate` — a
super-powered art priced by one honest lever: an extremely long cooldown. No
new cast pipeline, no bespoke damage lane, no special caster. The mark buys
the *presentation*: THE EYECATCH, the anime cut-away pane (the Super Move
portrait attack), whose avatar is the caster's **own live body**.

```ts
ultimate: {
  style?: string;       // pane style id (EYECATCH_STYLES; default ULT_CFG.style)
  title?: string;       // headline (default: the skill's name)
  sub?: string;         // small flavor line
  tint?: string;        // accent (default: the skill's color)
  paneSec?: number;     // pane life (default ULT_CFG.paneSec)
  holdSec?: number;     // the held beat; default by side, 0 if the skill has chrono
  avatarDefId?: string; // portrait override (a patron/idol; the Woken Hollow
                        // shows the form you are BECOMING)
}
```

`ultimate: {}` is a complete mark — everything defaults.

## The laws

- **THE SAME DOOR.** The flash fires in `executeSkill` beside the chrono
  block (`!opts.noRepeat` — scheduled repeats never re-flash), so ANY caster
  through the one pipeline gets the pane: a monster's super wears the same
  banner side-coded `'enemy'`, and in that direction the pane is a
  **telegraph**, not flair. Its held beat is shorter
  (`ULT_CFG.enemyHoldSec`) — a warning, not a movie.
- **THE PRICE FLOOR.** A skill wearing the mark carries at least
  `ULT_CFG.minCooldown` seconds of cooldown. An *authoring law* pinned by the
  probe's census — never a runtime clamp; data stays sovereign, the probe is
  the censor.
- **THE THROTTLE ONLY SKIPS THE BANNER.** Per-caster (`throttleSec`) and
  global (`globalGapSec`) ledgers keep panes rare — but a throttled flash
  never delays, dims, or refuses the cast. The art always fires whole
  (probe-pinned: a throttled Hundred Partings still stops time and lands its
  cuts; only the movie declines to re-run).
- **THE HELD BEAT.** A world-scoped scale-0 `TimeHold`, kind `'ultimate'`
  (never `'menu'` — a menu hard-hold stops its own aging), for
  `holdSec` while the pane sweeps, under the SAME solo-only `allowHold`
  policy the pause menu / harvest rite / steady hand wear: a shared world is
  never one player's to stop, so in co-op and couch the pane plays over a
  living world. A skill that carries `chrono` defaults its beat to **0** —
  the time-stop IS the cinematic, and world seconds would eat the caster's
  own stop window (holds age on raw seconds).
- **DRAWN == TIMED.** The pane's clock is `Timeflow.age` — the fabric's raw
  clock, frozen only by a true pause (beginFrame now advances it with or
  without live holds, per its own documented contract; the pane and the
  throttle were its first between-holds readers). `eyecatchElapsed` /
  `eyecatchAlive` are the ONE fold the renderer, the engine sweep, and the
  probes all read. The pane animates straight *through* its own held beat;
  shimmer alone rides `performance.now` (the drawTimeflow precedent).
- **SCREEN-ANCHORED BY LAW.** Like the status overlays, the pane happens TO
  the player — the anchored-sky doctrine's standing exception. It draws
  above the HUD and below the traversal/run-end fades (covers must still
  cover).
- **THE AVATAR IS THE BODY.** The renderer resolves the caster's live actor
  through the portrait fabric (`portraitSubjectOf` + `drawPortraitInto`, the
  panels' companion-roster idiom — worn parts, faction horns, the breathing
  clock), so the pane shows the character *as it stands*. `avatarDefId`
  overrides with any registered def. A body gone mid-pane keeps its last
  face.
- **TRANSIENT, WIRED, NEVER SAVED.** `World.eyecatch` is presentation state:
  a null field in headless worlds (zero sim cost), swept
  `expireSlackSec` after the pane ends, absent from every save. The co-op
  wire ships it as the derived `ec` row (elapsed seconds, not epochs — the
  tell-wire idiom) and the client re-stamps against its own clock and
  rebuilds the pane from its own registry.

## The styles — an open registry

`render/vis/eyecatch.ts` — vis-pure painters keyed by id;
`registerEyecatchStyle(id, painter)` adds one with no renderer edits (the
doodad-painter law, applied to drama). Dials in `EYECATCH_VIS`.

- **`sunder`** — the diagonal slash cut-in: a leaning band sweeps the
  screen, the caster rides one third, the art's name the other, speed lines
  howl between. Ally panes enter from the left with a clean white gutter;
  enemy panes from the right with a blood edge.
- **`eclipse`** — the iris: the screen goes to a dark sky, a corona opens,
  motes fall inward, the caster stands in the eye.

## The debut arts (`data/ultimates.ts`, Vault row `gem_skills_ultimates`)

Each debut is a COMPOSE of standing fabrics — no new engine verbs:

- **the Hundred Partings** (90s) — `chrono` (scale 0, exempt caster) under a
  tight at-enemies slash storm: the world stops, fourteen cuts fall, time
  resumes already owing. Pane `sunder`; beat 0 by the chrono rule.
- **Hollow Star** (75s) — `GroundDelivery.pull` at event-horizon reach
  (`pullRadius` past the burn disc — the Cold Vortex lane priced up), then a
  `followUp` collapse lands free at the same aim as the well closes. Pane
  `eclipse`.
- **the Woken Hollow** (120s) — the possession seam's `shapeshift`: wear the
  form `ult_woken_hollow` (registered via `ULTIMATE_FORMS`, absorbed by
  monsters.ts before its registry-close folds) at your own level for 14s at
  `powerFactor` **above** 1 — the one form that is not the weaker vessel;
  the cooldown is the price. `seatAway` converts the slot to Return to
  Flesh (the dire-wolf idiom); the pane's `avatarDefId` shows the hollow
  you are becoming.

## Dials (`ULT_CFG`)

`paneSec` 1.15 · `holdSec` 0.65 · `enemyHoldSec` 0.45 · `throttleSec` 20 ·
`globalGapSec` 1.5 · `minCooldown` 45 · `style` 'sunder' ·
`expireSlackSec` 0.5 — all first-pass, unblessed.

## Open follow-ups

- A live ENEMY debut seat (an apex/lair native whose signature art wears the
  mark — the engine and probe already hold the same-door law; the seat is
  content work).
- Single-target concentration for atEnemies storms (a lone boss takes the
  under-cut + scatter luck; cycling leftover strikes across the standing
  enemies would be an engine dial on the sparkfield — deliberately not
  reached for in this pass).
- Sound, bar-slot gold rims, and gamepad rumble for the beat.
