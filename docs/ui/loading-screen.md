# Mu loading screen

`src/ui/loadingScreen.ts` owns the reusable loading surface. `src/loading/spiritRun.ts`
is a rewardless, isolated simulation; `spiritView.ts` paints the Mu body through the
existing `cosmeticBody`, body sprite, live parts and adorn system. The selected
`wispSkin` and `playerEffect` travel with the wisp. No skin changes collision size.
The toy never uses World state, combat RNG, progression, inventory or persistence.

Entry after a vessel/class choice, and Continue, travel from top to bottom. A
native-page wait during play chooses left-to-right or right-to-left once per wait.
The wisp arrives from the entry edge, then the scenery and gates stream toward it.
Mouse/touch steer across the travel direction; WASD/arrows and the first connected
controller's left stick/D-pad provide the same axis. Pass through gate openings.
Each clear raises speed up to a cap. Contact binds the wisp briefly, reduces steering
and resets the streak/speed, without restarting loading or erasing total clears.
Each gate rolls its own opening width (114–238 units; the collision body is 30
units wide). The opening remains inside the corridor with a solid outer rim.
Gate center changes are capped at 110 units. Two pickups form a choice halfway
between gates: collecting one releases the other. Their lanes sit 56 units to
either side of the two gates' midpoint, within the steering reach of both gates
even at maximum speed. A pair with a Memory Mote puts it toward the next opening;
the more valuable alternative asks for the longer return. Other pairs offer points
against acceleration. Unclaimed pickups simply pass by.

| Pickup | Appearance | Score | Extra acceleration |
| --- | --- | ---: | --- |
| Memory Mote | Teal pearl | 25 | None |
| Gilded Soul | Nested gold diamond | 100 | None |
| Wild Wisp | Violet wings and three trailing chevrons | 50 | Three gate clears (+0.27×) |

A cleared gate gives 10 points and +0.09× speed. Wild Wisp acceleration shares the
2.8× cap and is reset with the streak on impact; earned points are retained.
Each choice pays once, even if two bodies overlap in a test fixture. Score belongs
only to the crossing, never the account. The renderer uses each gate's actual
width, distinct pickup silhouettes and point values, collection bursts, a violet
surge wake, illuminated gate caps/runes and quiet background ribbons. No new art
assets or game rewards are introduced. Reduced motion suppresses collection
expansion, particle spray and surge rings. The probe drives both choices through
long extreme/seeded courses at the speed cap and checks the complete return path.

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
describes the actual preparation phase; the toy's score never implies loading speed.
`fail(message, retry)` keeps the surface playable with explicit Retry and optional
Cancel actions. Stale `update`, `fail` and `finish` calls do nothing. A fatal error
closes the toy before the crash overlay takes ownership.

`main.ts` wraps player-facing starts with `withLoadingScreen`, and Continue retains
its original staged-world publication/cancellation checks. Optional `loadingStage`
callbacks in `prepareCharacterWorld` yield between stages. The frame loop observes
`massRuntime.nativeReadiness`: required page reads display the toy; refused reads
offer Retry/Cancel; ready removes it automatically. The loading gate does not step
World time, AI, menus, world rendering or autosaves. The minigame has its own rAF.
The existing durable quit handler retains its normal policy. A cancellation returns
to the menu with the last save available, without discarding missing page claims.

The cover is above game UI and below fatal errors. Existing roots become inert
while it owns focus, then recover their previous inert state. Keyboard, mouse and
controller input cannot cast in the world during loading. Held keyboard presses
are quarantined until key-up; controller controls must return to neutral before
world actions resume. Progress uses an accessible status/progress element. Tab
cycles its actions; Enter/Space activate buttons. Controller A activates Retry,
or Cancel when no retry is present. Reduced-motion preference removes the long
trail/glow animation; the necessary gate movement remains. Tiny and tall viewports
share the same collision/drawing/pointer transform. No artificial minimum wait or
score requirement delays entry into a ready world.

## Scope and performance

This is a loading presentation and async-work foundation, not an MMO scheduler.
It covers class entry, Continue and the existing authoritative native-page waits.
It does not automatically detect every cold asset, interior transition, or network
handshake. Callers can use the same lease API when those operations gain readiness
contracts. Routine seamless movement does not intentionally insert loading screens.

Synchronous `new World`, native construction, restore/publication and renderer bakes
still occupy the browser's main thread. `paint()` gives the cover a frame before
such work; it cannot keep keyboard input or animation running *during* an unyielding
task. Long work must move into existing worker pipelines or be split into bounded
cooperative stages. Never replace honest readiness with a timer or fake percentage.
The toy loads no external assets and introduces no runtime dependencies.

## Verification

- `npm run check`
- `npm run probe -- spiritrun` and `npm run probe -- characterresume`
- Scoped production build, then `electron balance/loading-screen-ui.cjs`
- `npm run smoke` after a normal production build

The UI course uses isolated browser storage and a hidden Electron window. It checks
all directions, keyboard/pointer/controller steering, every pickup kind, exclusive
choices, scoring and acceleration, variable widths, stale leases, cancellation,
input release, failed loads/retry, world holds and real entry/Continue; it saves
screenshots under `balance/reports/`. The debug surface is `__game.loading` and
`__game.devStartLoadingRun()`. Open `?loadingPreview=down`, `?loadingPreview=right`
or `?loadingPreview=left` for an extended playable preview with the equipped skin.
Cancel returns to the menu; preview creates no run or save. Use a manual lease
for status/error art review; actual
loads close as soon as ready. Minigame mechanics take inspiration from the requested
[Revenant Run reference](https://spagato.itch.io/revenant-run); code and art are native.
