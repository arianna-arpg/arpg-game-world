# Visibility stability at massif corners

The September 2026 seamless-world playtest reported flickering sight/fog around
a massif, also observed in the ordinary zone game. The player's paused screen
was captured outside Git. The browser did not expose the live simulation or a
downloaded save, so this is a controlled reconstruction, **not a replay of that
exact run**. No performance or GPU cause has been established for that report.

## Reproduced defects and repair

1. **One-frame-old body visibility.** Actor bodies and links queried SightVeil
   before its current-frame update; the terrain sheet and labels queried it
   afterward. A newly visible body could disappear on clear ground, or appear
   on hidden ground, for one frame. Resolve the room veil, roof fades, roof
   hulls and sight veil before the first world drawing pass. Composite the
   sheets at their existing positions in the layer order.
2. **Different eyes at wall contact.** The wall raster already used a common
   contact-adjusted eye to avoid cracks between joined faces. Actor/label
   queries still cast from the physical eye. Subpixel convex stair corners
   amplified that tiny difference into a large disagreement. Both now use
   `wallContactEye`, with the existing `SIGHT_VEIL_GEO` contact policy.
3. **Roof hulls one fade-step behind.** Roof hull collection preceded the
   roof fade update. Entering, leaving, or replacing a structure could give
   the shadow and roof different states. Advance roof fades once before
   hull collection; roof drawing and label visibility consume that state.

These are shared rendering fixes, independent of world generation, entity
counts, world lifetime or save format. Combat/AI sight and projectile rays
retain their physical origins and existing rules. Visual wall queries reuse
the engine's cell-crossing and elevation rules with the raster's visual eye.
Doodad shadows retain their own physical-eye geometry. Existing darkness
settings, feathering, tier settling and body fade rates remain the policy.

## Repeatable checks

```powershell
npm run check
npm run probe -- sightveil --retries 0
npm run probe -- visibility_stability --retries 0
npx electron balance/visibility-ui.cjs
```

The fast probe covers four rotations of the failing corner and verifies that
open ground stays clear, the far side stays hidden, and the darkness setting
takes effect. It is enrolled in the normal probe roster.

The hidden Chromium harness uses a disposable profile and never attaches to a
player's browser. It bundles the real sources and exercises:

- The actual Renderer with a real simulation world: first-frame occlusion and
  moves into/out of an open sightline, using newly introduced actors so prior
  fade history cannot mask a stale target.
- 32 real roof frames: entering, leaving, reentering, and replacing a structure
  with the same ID.
- A 24-unit-cell, 300-unit-radius massif; three walking orbits plus exposed-face
  contact sweeps at 0.001, 0.49, 1.49, 1.51 and 4 units. Raster samples whose
  48-unit neighborhood is fully hidden must have substantial painted shadow.
  This deliberately excludes normal silhouette feathering.

Reports and optional failure images go to ignored `balance/reports/`.
`--frames-only` runs the short renderer checks. Set `VIS_GPU=1` to use the
available hardware canvas backend instead of the default software backend.

### Negative control

```powershell
npx electron balance/visibility-ui.cjs --baseline=6b38bcbf
```

This substitutes only the old Renderer and SightVeil source from Git during
bundling; it does not change the checkout. A nonzero exit is expected.

| Check | Before repair | After repair |
| --- | --- | --- |
| Body/ground frame agreement | 3/3 cases fail | 0 failures |
| Roof fade/hull agreement | 4/32 frames fail | 0 failures |
| Raster/query agreement | 16/1,856 poses fail; 1,258,965 samples | 0/1,856 poses fail; 1,256,367 samples |

The corrected visibility query changes which samples qualify as hidden, hence
the different sample totals. The worst old pose was eye (2520.001, 2112.001):
200 sampled points disagreed; one fully transparent raster sample was at
(1836.001, 1614.001), where the query reported hidden.

This evidence verifies the reproduced defects, not every possible fog effect
or the exact original playtest. Future reports should distinguish positional
occlusion from exploration memory, room confinement, weather fog and intentional
screen effects, and ideally preserve a seed/checkpoint plus movement trace.
