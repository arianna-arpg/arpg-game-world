# Mu loading screen

`src/ui/loadingScreen.ts` owns the reusable loading surface. `src/loading/spiritRun.ts`
is a rewardless, isolated simulation; `spiritView.ts` paints the Mu body through the
existing `cosmeticBody`, body sprite, live parts and adorn system. The selected
`wispSkin` and `playerEffect` travel with the wisp. No skin changes collision size.
The toy never uses World state, combat RNG, progression, inventory or persistence.

Entry after a vessel/class choice, and Continue, travel from top to bottom.
Travel leases choose left-to-right or right-to-left once per wait. On the seamless
foundation, native-page readiness opens those travel leases automatically.
The wisp arrives from the entry edge, then the scenery and gates stream toward it.
Mouse/touch steer across the travel direction; WASD/arrows and the first connected
controller's left stick/D-pad provide the same axis. Pass through gate openings.

This is an ambiguous, atmospheric pastime. There is no score, points, pickup
valuation, gate counter, speed readout, high score or account reward. Encounters
respond through color, motion and fading rings. Keep numeric diagnostics in the
debug snapshot only; actual loading progress may still use measured work units.
Memory Motes, Gilded Souls and Wild Wisps share a pale Mu soul-flame silhouette.
Their size, radiance and gentle sputter/flicker/flare convey energy without ranked
colors or symbols. Each has additional continuous size/intensity variation. Groups
range from quiet stretches to six independently collectible flames, with random
kind order, uneven travel gaps and varied lane offsets. Some flood one route;
others scatter across branches. Taking one never removes its neighbors. Wild
Wisps gently increase the underlying pace. None has collectible value.

Gates partition their full span into one, two or three openings, with independent
widths and irregular solid piers instead of preset lanes or symmetric templates.
Openings range from 68 to 250 units; the 30-unit collision body always fits. Widths
share the available space when their sum would crowd out the 24-unit solid rims.
Collision checks the union of openings; rendering paints its complement.

At a calm pace, gate gaps vary from 620 to 820 units, with more flames on average.
As speed builds, newly planned gaps shrink toward 340–440 units. Existing gates
never move or resize abruptly when speed changes. Every opening physically fits
the wisp, and every encounter has a complete route at base speed. At the highest
speed, extreme lane changes can become impossible; surviving indefinitely is not
a requirement. The pastime never gates readiness or rewards participation.

Occasional pale, ephemeral chevron currents appear between gates or within one
or more sufficiently wide openings. Every in-opening current leaves room for the
body to pass beside it; narrow slots never force collection. They add a temporary
surge beyond the ordinary pace cap, then ease back down. Repeated currents refresh
the duration without stacking indefinitely. Passing a gate accelerates the pace;
a collision briefly binds/slows the wisp and resets all acceleration and currents.
Currents cannot negate an impact in the same step.

Tuning lives in `SPIRIT_RUN`. The absolute speed cap is 5.4, raised 50% from 3.6.
The original per-gate gain (0.09), Wild Wisp gain (three gate increments) and
temporary current kick (0.8) are unchanged; the ordinary ceiling is now 4.6.
Building to the higher ceiling takes more encounters, never faster acceleration
per encounter. Currents still last 2.2 seconds, easing out over the final 0.45.
Flame centers keep at least 38 travel units between them, with larger random gaps.
These are internal parameters, never player-facing achievements. The probe drives
complete calm-speed encounter routes with 30 Hz input, tests irregular layouts
and speed-dependent spacing, and checks current collection, bypass, expiry/reset
and peak collision behavior. Playing, idling or colliding never affects loading.
Reduced motion keeps current silhouettes and essential travel but suppresses
animated wakes, expanding rings and particle spray; flames and decorative
background parallax stay still. Art uses native canvas only.

The deeper backdrop directly reuses Mu's `TILESETS.mu.theme.ambientFx` through
`drawAmbientFx`: the abyss depth well, nebular haze and layered motes also echoed
by `site/assets/abyss.js`. The crossing's ribbons and pillars remain above it.
Gate inscriptions draw from the canonical `RUNESCRIPT` alphabet used by vestiges
and Vault unlocks. Geometry-seeded choices stay fixed as each gate moves and
consume no simulation randomness; glyph sprites use the bounded shared cache.
The heading is `encipher('The Crossing')` in the existing rune font stack, with
the accessible name “The Crossing — Loading”. Keep these shared sources instead
of inventing another alphabet, palette or abyss effect.


## Integration

```ts
const lease = loadingScreen.begin({
  kind: 'travel', label: 'Reading the next area', loadout: account.cosmetics.loadout,
  cancel: () => controller.abort(),
});
try {
  await lease.paint(); // allow the cover to paint before starting bounded work
  const result = await loadArea(controller.signal);
  if (!lease.current) return; // an older job cannot publish into a new crossing
  // Publish through the caller's own authority checks.
} finally {
  lease.finish();
}
```

Only one cover is visible. A new `begin` invalidates prior leases; callers still own
their AbortController and work cancellation. `update({label, detail, completed,
total})` can display measured units. Omit counts for indeterminate progress. A label
describes the actual preparation phase; the toy never implies loading speed.
`fail(message, retry)` keeps the surface playable with explicit Retry and optional
Cancel actions. Stale `update`, `fail` and `finish` calls do nothing. A fatal error
closes the toy before the crash overlay takes ownership.

On `main`, `withLoadingScreen` wraps the existing class/vessel entry, run-slot
Continue and roster-slot Continue owners. It yields a paint before preparation
and before the first render, waits for boot hydration, and checks lease ownership
after asynchronous reads. A cancelled roster read cannot publish its world.
The current world’s simulation, rendering and input stay held while the cover is
active; the minigame owns an independent rAF. Existing save formats are unchanged.

On `codex/seamless-world-foundation`, `prepareCharacterWorld` also reports stages
through `loadingStage`, and `loadingGate` observes native-page readiness/refusal.
Those adapters belong to that branch's staged-world and paging owners; main does
not import the seamless subsystem. Callers on either branch retain cancellation
and retry ownership, and only their current lease may close the cover.

The cover is above game UI and below fatal errors. Existing roots become inert
while it owns focus, then recover their previous inert state. Keyboard, mouse and
controller input cannot cast in the world during loading. Held keyboard presses
are quarantined until key-up; controller controls must return to neutral before
world actions resume. Progress uses an accessible status/progress element. Tab
cycles its actions; Enter/Space activate buttons. Controller A activates Retry,
or Cancel when no retry is present. Reduced-motion preference removes the long
trail/glow animation; the necessary gate movement remains. Tiny and tall viewports
share the same collision/drawing/pointer transform. No artificial minimum wait or
performance requirement delays entry into a ready world.

## Scope and performance

This is a loading presentation and async-work foundation, not an MMO scheduler.
Main covers class entry and Continue; the seamless foundation also covers its
authoritative native-page waits.
It does not automatically detect every cold asset, interior transition, or network
handshake. Callers can use the same lease API when those operations gain readiness
contracts. Routine seamless movement does not intentionally insert loading screens.

Synchronous `new World`, native construction, restore/publication and renderer bakes
still occupy the browser's main thread. `paint()` gives the cover a frame before
such work; it cannot keep keyboard input or animation running *during* an unyielding
task. Long work must move into existing worker pipelines or be split into bounded
cooperative stages. Never replace honest readiness with a timer or fake percentage.
The toy loads no external assets and introduces no runtime dependencies.

## Handoff for future integration

The reusable Mu crossing originated on `codex/mu-loading-screen` and is integrated
into `main` and `codex/seamless-world-foundation`. Its files
are the loading UI/controller, the isolated SpiritRun model and its canvas view.
Preview any direction with `?loadingPreview=down`, `right` or `left`; Cancel
returns to the menu without creating a run. Preserve the player's equipped wisp
skin and effect by passing the current cosmetic loadout.

When adding a preparation step that would visibly interrupt play, consider this
surface for asset warming, fast travel/portals, interior or instance entry,
required terrain/page reads, server handshakes and reconnects. First give that
operation an honest readiness/cancellation contract. Entry uses the descending
variant; travel uses one horizontal direction selected once for that wait. Begin
a lease, yield a paint before bounded work, update real phase descriptions, retain
retry/cancel ownership, and finish only the current lease once the world is ready.
Keep the world and its actions held behind the cover. Never make toy performance
affect loading, inventory, progression or readiness, and never delay a ready world.

The existing callers cover class entry and Continue on both branches, plus
required native-page waits on the seamless foundation.
Other uses are candidates, not automatic integrations. Synchronous world creation,
restore and rendering bakes can still stall the toy; move heavy work into workers
or bounded yielding stages as those paths are updated. The screen itself does not
make blocking work asynchronous. Ordinary seamless movement should stay seamless.

Future contributors should start with the lease example above, the existing
`withLoadingScreen` / `loadingGate` adapters in `main.ts`, and the isolated UI
acceptance course. Preserve the no-score presentation, all direction transforms,
cosmetic/body separation, and keyboard/controller quarantine on return to play.


## Verification

- `npm run check`
- `npm run probe -- spiritrun` (both); `savecompatibility` on main, `characterresume` on seamless
- Scoped production build, then `electron balance/loading-screen-ui.cjs`
- `npm run smoke` after a normal production build

The UI course uses isolated browser storage and a hidden Electron window. It checks
all directions, keyboard/pointer/controller steering, no numeric readouts, branching
apertures, currents in/between gates, acceleration, stale leases, cancellation,
input release, failed loads/retry, world holds, real entry/Continue and delayed
roster cancellation. The seamless
version additionally checks its native-page readiness adapter; it saves
screenshots under `balance/reports/`. The debug surface is `__game.loading` and
`__game.devStartLoadingRun()`. Open `?loadingPreview=down`, `?loadingPreview=right`
or `?loadingPreview=left` for an extended playable preview with the equipped skin.
Cancel returns to the menu; preview creates no run or save. Use a manual lease
for status/error art review; actual
loads close as soon as ready. Minigame mechanics take inspiration from the requested
[Revenant Run reference](https://spagato.itch.io/revenant-run); code and art are native.
