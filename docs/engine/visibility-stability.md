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

## October 2026 combat and lighting pass

The intermittent report now has controlled reproductions for additional shared
failures. This is still not a replay of the owner's exact scene.

- Combat flashes consumed slots also used by persistent terrain lights. A busy
  frame could extinguish remote light pools. Persistent lights now use spatial
  admission; flashes, projectiles and orbs retain separate transient limits.
- Quantized camera ranking changed the admitted terrain lights at bin edges.
  Every visible static pool now remains present, with cached wall geometry.
- The 768-caster ceiling could remove a visible forest shadow. The spatial
  gather retains all relevant casters; repeated actor reads reuse the current
  frame's already-resolved shade.
- Light rays now share exact cell crossings with gameplay sight and carry the
  emitting source's floor. A plateau no longer blocks the lantern standing on
  it. Different floors do not combine into one terrain-light cluster.
- Fixed-angle light fans still snapped at corner crossings after exact ray
  traversal. Cached terrain-corner bearings add rays on either side of the
  silhouette. Cache storage and discovery are bounded; extremely fine grids
  with giant authoring lights retain the radial fallback.
- Shadow unions are rasterized into small padded masks and feathered once per
  strength layer, then reused for both max-blend operations. This avoids
  repeatedly filtering the large offscreen bounds of complex shadow paths.
  The masks request CPU backing to reduce driver-dependent tessellation stalls.
- Stationary lanterns, moving-source pauses, and painted fire/forge halos reuse
  cached polygons. Source movement, range, floor, map replacement, terrain and
  door edits invalidate them. Brightness thresholds ease rather than blink.
- Restoration cues have their intended style instead of the flesh fallback.

Gameplay AI/shot visibility, damage, authored flicker frequencies, darkness
preferences and the branch-specific world rules are unchanged.

Checks: `npm run test:lighting`, the sightveil/visibility_stability probes,
`npx electron balance/visibility-ui.cjs`, and the feedingcues, stealth, tiers,
storey, combatreadability and skillflights regressions. The new UI fixture uses
real Chromium pixels and rejects old main via
`--baseline=89e36023` (nonzero is expected). Its corner test also retains the
exact-ray-only radial fan as a negative control. `--combat` runs 150 real
simulation/render frames with 80 pursuers, 1,050 cover objects, 120 emitters
and overlapping flashes. Timings are diagnostic, not a hardware-independent
frame-rate promise. `VIS_GPU=1` exercises the available graphics backend.

### Capturing an intermittent occurrence

After an isolated build, `node balance/lighting-playtest.cjs` serves a local
preview on port 5187. It never serves production saves; the preview uses its
own browser origin. Open `/?lightingDiagnostics=1&lightingCaptureSink=1`.
During a run, F8 or **Capture flicker** saves the preceding 300 rendered frames
and one second afterward, plus a screenshot, under ignored `balance/reports/`.
The record includes source geometry/intensity, source and caster counts, floor,
camera, grid revision, frame/pass times, and 32×24 light/shadow alpha masks.
Capture is local and opt-in; other hosts download the report instead. Ordinary
play does not allocate the recorder, read back its masks, or show its button.

## Combat capture follow-up: collision and shadow continuity

The October 22 Whitewood captures contain 1,025 frames. The hero light remains
present at radius 190; the three largest sampled shadow changes coincide with
44–66 world-pixel eye jumps. The recordings lack movement provenance and caster
geometry, so they cannot establish which movement operation caused those exact
jumps. The live captured run remains paused; all reproductions use separate worlds.

Controlled reproductions exposed three additional defects:

- Furniture movement checked the destination and pushed outward up to three
  times. A strong shove could cross a trunk, or escape one rock into its neighbor
  and end embedded. The periodic unstuck fallback could then relocate it again.
  Clear-origin movement now sweeps a disc against the actual circles, rotated
  slabs and multi-lobe unions, takes the first contact and slides the remaining
  displacement. Grid-constrained alternate endpoints are checked again. Placement
  recovery, authored phasing, pits, bridges and own-story admission remain distinct.
- Shadow far arcs changed their subdivision count at angle thresholds. Every
  intermediate vertex jumped at once, flashing a crescent even for subpixel eye
  motion. A fixed topology keeps those vertices continuous through the threshold.
- Doodad reveal queries ignored the shadow's contact melt, while slab drawing
  added its reach to the corner distance twice. Draw and reveal now share the
  finite, melting reach; an eye displaced inside a body also agrees with its pixels.

`probe_collisionsweep` checks exact contact, fast travel, tangents, leaving a
surface, phasing, floor separation, a real knockback counterexample and seeded
cluster movement. `balance/collision-shadow-ui.cjs` tests actual Chromium pixels,
the simulation/shadow combination and the diagnostic screenshot composition.
It is included in `npm run test:lighting`. Its negative control
`--baseline=4ba2e3ff` rejects the old implementation: the subpixel arc crossing
changes 4,326 pixels instead of zero, and the cluster shove moves 76.7 pixels
and embeds the actor instead of remaining clear with a maximum 13.1-pixel step.
These are controlled witnesses, not a replay or proof of every reported flicker.

The full regression roster also exposed a route through a hay bale: the old
destination push-out sometimes let the herded animal cross it, while a correct
sweep stopped it. Grid-based navigation now derives a cached furniture-aware
advisory field, with own-story blockers, bridge spans, and terrain/doodad
invalidation. It leaves the authoritative floor and shadow grid untouched.
The unchanged live straying course verifies that the animal walks home and pays.
Flat ground shares one route even if an actor retains a stale story index.
Plan doors keep their exact grid footprint, without a second inflation that
closes the apron. Strike-opened growth retains its authored passage semantics;
feet still collide until it is actually cut. Door state changes invalidate
furniture navigation, including free-standing doors without grid cells.

Crowded pursuit also runs at 30 and 60 Hz. The dense lighting fixture now sets
both its zone dimensions and its actual arena bounds; previously its actors
started outside the arena. Exterior origins retain placement recovery instead
of sweeping back from invalid ground. Use `--combat --profile-movement` on the
lighting UI harness to attribute collision cost; timings remain machine-dependent.

The opt-in recorder now includes bounded hero knockback/separation/rescue events,
hero motion state, zone seed, actual render scale and shake, and deduplicated
shadow-caster geometry. Screenshot capture composites the renderer's world and
visible text overlay explicitly; adaptive resolution previously caused it to
select the larger text-only canvas. Captures remain local and are not save games.

## Resolution-independent masks and forest frame pacing

The two later Elderbough captures (`1792712168069`, `1792712182268`) contain
640 recorded frames, including an overlapping interval. In the first recording
the stationary tree shadow changes at each automatic resolution step: 1 → .85
→ .7 → .55. The eye, terrain revision and 974 casters stay unchanged. The fixed
three-pixel blur was measured in an increasingly coarse internal buffer, so its
displayed width grew from 12 to about 22 pixels. The second recording has stable
stationary masks and roughly 18–20 FPS movement; no collision/rescue jumps occur.

`visibilityRaster.ts` now supplies a display-sized projection independent of
the adaptive world surface. Sight shadows, room feathers and light occlusion
share it. Camera framing uses the same display dimensions, avoiding the small
eye/camera shift caused by rounded adaptive dimensions. Resolution still reduces
world drawing; it does not change the visibility mask's shape or feather width.

SightVeil now computes conservative angular candidate bins and finite reach once
per eye/geometry change. Exact circle/slab, owner, range and elevation tests still
decide visibility. This removes repeated whole-forest scans for actors, raised
props and labels. All relevant casters remain admitted. A stationary shadow sheet
is reused until its eye, camera, geometry, floor, strength or raster changes.
Movement is not quantized, delayed or smoothed separately from the visible world.
The first strength layer needs no erase pass into an already clear sheet.

The recorder reuses unchanged sampled masks and adds `frameTiming` (frame gap,
input/UI head, simulation, rendering and end-of-frame UI/network CPU time) plus `sightRaster` (dimensions
and cache reuse). These separate engine work from scheduling/presentation delays
in subsequent captures. There is no mask readback or history in ordinary play.

Verification: `npm run test:lighting` includes `visibility-pacing-ui.cjs`.
It checks identical mask pixels through all resolution steps, the actual
renderer/camera, moving eyes, edited/replaced terrain, caster edits/removal,
floor changes, room transitions and mask reuse/invalidation. 18,000 mixed-shape
queries plus raised-owner checks must match `visibilityReference.ts`, the old
exhaustive calculation preserved as a test-only oracle (no Git history needed).
Replaying the two saved forest geometries with the corrected camera/raster
produced zero sampled-mask change across all 556 stationary transitions,
including the three recorded resolution drops (formerly 4.08, 4.46 and 5.30
mean alpha changes out of 255).
`--baseline=de3cdead` must fail the resolution checks. Also run sightveil,
visibility_stability, lightingstability, stealth, tiers, storey,
combatreadability and skillflights, plus `visibility-ui.cjs` and all type checks.

The saved geometry can reconstruct the shadow layer, not the entire live world.
Performance comparisons use a separate world with those tree silhouettes and
100 active pursuers. Hardware acceleration and offscreen readback materially
affect frame gaps; report CPU phases and backend alongside timings. They are
measurements on the test machine, not a universal frame-rate guarantee.

For a repeatable synthetic combat course, run
`electron balance/lighting-stability-ui.cjs --combat --profile-movement`
(optionally `VIS_GPU=1`). It advances real AI and simulation on animation frames,
reports the number of moving pursuers, frame gaps and CPU phases, and uses a
disposable browser profile. The captured-geometry A/B on this machine reduced
median rendering CPU time from 18.9 to 13.5 ms at full resolution (100 pursuers,
974 casters, hardware canvas); median visibility-query work fell from 3.8 to
0.4 ms. At 55% resolution the stable mask costs more than the former shrunken
mask, but total rendering still fell from 16.2 to 14.6 ms. Remaining browser
scheduling/presentation delay needs the new live phase diagnostics; it cannot
be diagnosed conclusively from the earlier recordings alone.
