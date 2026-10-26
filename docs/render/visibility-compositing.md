# Visibility compositing

A valid shadow mask does not prove that the finished frame contains it.
The October 24 combat capture reproduced full shadow loss while the mask
remained populated: the world canvas inherited an occluded enemy's zero
opacity from `drawForesight`. The warning painter assigned the body's
`baseAlpha` after restoring its own state. Later effects sometimes reset
opacity, making the whole sight veil alternate between visible and absent.

`drawForesight` now preserves the incoming canvas state. Its warning art is
unchanged; caster fading belongs to the actor's scoped body pass.

Sight, roof, room and light composites use `withVisibilityComposite`. Each
owns identity transform, full opacity, source-over blending, no filter or
canvas shadow, and smoothed sampling. Roof overlays then set their explicit
opacity. Existing clips remain intentional, and caller state is restored.
The daylight bloom path uses the same isolation as nighttime lighting.

`sightPresentation` in opt-in diagnostics records incoming and applied opacity.
Mask diagnostics still describe the mask, not every pixel in the final frame.
For a presentation failure, pair the trace with video of the world canvas.

Verification:

- `npm run check`
- `npm run test:lighting`
- `VIS_GPU=1 electron balance/visibility-pacing-ui.cjs` (set the environment using the local shell)
- `electron balance/visibility-pacing-ui.cjs --baseline=1e33c536` reproduces the original failures.

The fixture checks composited pixels under inherited state, clipped roofs,
five hidden-caster warning shapes, and 90 moving combat frames.

The full-frame comparison first prepares the static floor synchronously, then
restores the normal ground budget and upload settings before every assertion.
Without that preparation, a cold floor could replace a flat placeholder between
the cast and idle captures and report 48 changed color channels as a shadow
failure. A settled-frame precondition and the existing zero-difference checks
keep real compositing regressions visible; the old-renderer negative control
must still fail.
