# THE FALTER — deliberate, simulated frame-stutter

> **If you are reading this while hunting a stutter report: check the
> player's statuses first.** A hero wearing `faintness` or `swoon` is
> SUPPOSED to hitch. That is this feature working, not a regression. The
> falter is bounded, presentation-only, and switchable off; the real
> frame-pacing suspects live elsewhere (see the perf harness and
> `docs/render/README.md`).

## What it is

While a falter-bearing status rides the **local** hero, the renderer
deliberately **holds the presented frame** on a jittered cadence — brief,
bounded, fake lag spikes. The player's head is going light, so their frames
seem to. The pall already greys the world out; the falter makes the *medium
itself* feel unwell. Players doubting their frame rate for a beat is the
intended emotional payload, exactly like a horror game flickering its own
UI.

This is a **designed effect with a paper trail** (this file, the
`ScreenFxDef.falter` doc comment, the `VIS_CFG.statusFx.falter` doc
comment, the settings tooltip). It must never be "fixed" as a perf bug, and
conversely it must never be used to *paper over* a real perf bug — the
pall's genuinely expensive half (the `'saturation'` desaturate) is
separately and honestly gated by the canvasCaps probe (relative slowness ×
an absolute per-frame budget at the live canvas size). The fake hitch and
the real cost are different systems on purpose.

## The honesty contract

The falter impersonates lag without ever being lag:

- **Presentation-only, by construction.** The hold is an early return at
  the top of `Renderer.render()` — the canvas simply keeps its last pixels.
  `World.update` keeps stepping at full rate, inputs keep landing, casts
  keep resolving, the co-op wire keeps its cadence. A held frame is stale,
  never late. (QA proof: `world.time` advances normally across a hold.)
- **Bounded.** A hold is at most `holdMs[1]` (240ms by default) and holds
  never chain — each is followed by at least the strength-lerped period.
- **Boundary frames always draw.** A zone/world identity flip (the cache
  steward's boundary) or a canvas resize cancels any hold and disarms the
  scheduler: swap-first-frames and fresh backing stores never present stale
  pixels.
- **The player owns the off switch.** `settings.statusFalter` (Options →
  "Faintness Frame-Falter") — a comfort/accessibility toggle, not a
  graphics-quality one. OFF loses zero information: the pall still carries
  the read.
- **The sim never hears about it.** Nothing in `src/sim`, the balance
  harness, or any engine module reads falter state; the jitter rolls on
  `Math.random()` (render-side wall clock), never a seeded sim stream. The
  perf harness is immune too — its runs carry no statuses, so gate numbers
  can never absorb fake hitches.

## The data

Everything is registry + config; no status is named in the renderer.

- **Wear it:** any `STATUS_FX_REGISTRY` row may set `falter: 0..1`
  (`src/render/screenFx.ts`). It scales with the row's live `k`, so a
  `stacksScale` ladder stutters harder as it climbs. Debut wearers:
  `faintness` (0.55, stack-scaled — the light-headed creep) and `swoon`
  (1.0 — the white-out at the ladder's cap).
- **Tune it:** `VIS_CFG.statusFx.falter` — `periodSec`/`holdMs` lerp from
  strength 0 → 1, `jitter` randomizes each period roll, `firstDelaySec`
  lands the first hitch just after the status blooms (the "did my game
  just—?" beat).
- **Read it:** `collectFalterK(fx)` in `screenFx.ts` is the one resolver;
  the hold gate in `renderer.render()` is the one consumer.

## Why frame-holds (and not the alternatives)

- A **timeScale wobble** would be a gameplay effect (the timeflow fabric
  already owns that vocabulary) — the falter must stay cosmetic so the
  ladder's real teeth (`accuracy` erosion, the swoon's drag) remain the
  entire mechanical story.
- **Input latency** would be unfair in a game about dodging — refused.
- **Partial-layer stutter** (world stutters, HUD smooth) reads as a broken
  compositor, not as lag; a whole-frame hold is exactly what a real hitch
  looks like, which is the point.
