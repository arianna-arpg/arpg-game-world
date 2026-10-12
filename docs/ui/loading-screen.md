# Mu loading screen

`src/ui/loadingScreen.ts` owns the reusable loading lease and foreground frame.
`src/loading/loadingSurface.ts` owns the presentation inside that isolated frame. `src/loading/spiritRun.ts`
is a rewardless, isolated simulation; `spiritView.ts` paints the Mu body through the
existing `cosmeticBody`, body sprite, live parts and adorn system. The selected
`wispSkin` and `playerEffect` travel with the wisp. No skin changes collision size.
The toy never uses World state, combat RNG, progression, inventory or persistence.

Entry after a vessel/class choice, and Continue, travel from top to bottom. A
native-page wait during play chooses left-to-right or right-to-left once per wait.
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
range from quiet stretches to six flame choices, with random kind order, uneven
travel gaps and varied lane offsets. Some flood one route; others scatter across
branches. Taking the first flame in a gate interval immediately releases the
others, which gently dissolve over 0.75 seconds and cannot be collected during
that fade. The next interval and chevron currents remain independent. Wild Wisps
gently increase the underlying pace. None has collectible value.

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
The per-gate gain is 0.06, a third slower than the original 0.09; a Wild Wisp adds
three gate increments (0.18). The ordinary ceiling stays 4.6, reached after sixty
unboosted clear gates rather than forty. One flame choice per interval prevents
dense clusters from stacking abrupt boosts. The temporary current kick stays 0.8;
currents last 2.2 seconds, easing out over the final 0.45.
Flame centers keep at least 38 travel units between them, with larger random gaps.
These are internal parameters, never player-facing achievements. The probe drives
complete calm-speed encounter routes with 30 Hz input, tests irregular layouts
and speed-dependent spacing, one flame choice per interval, smooth release fades,
and current collection, bypass, expiry/reset
and peak collision behavior. Playing, idling or colliding never affects loading.

The model prepares a full maximum gate interval beyond the far edge, including
flames and between-gate currents that lead their gate. The initial scene is
prefilled; subsequent objects are created while still fully hidden. Each object
emerges through the same smooth 240-unit edge veil, with a 0.55-second initial
scene reveal. Gates, rune inscriptions, soul-flames, current chevrons and their
glows share this opacity; everything is fully visible well before contact. The
reveal is presentation only and never changes collisions, pace or loading. Reduced
motion skips the timed intro but retains the spatial veil. Offscreen queues stay
bounded, and the arrival probe watches actual object births in all directions and
at 30/60/144 Hz, including maximum speed and collision recovery.

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
  await lease.paint(); // wait for the independent foreground to paint and accept input
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

`main.ts` wraps player-facing starts with `withLoadingScreen`, and Continue retains
its original staged-world publication/cancellation checks. Optional `loadingStage`
callbacks in `prepareCharacterWorld` yield between stages. The frame loop observes
`massRuntime.nativeReadiness`: required page reads display the toy; refused reads
offer Retry/Cancel; ready removes it automatically. The loading gate does not step
World time, AI, menus, world rendering or autosaves. The minigame has its own
renderer process, event loop, input listeners and rAF on desktop Chromium. Entry
and Continue retain the cover through the first terrain/sprite render.
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
performance requirement delays entry into a ready world.

## Scope and performance

This is a loading presentation and async-work foundation, not an MMO scheduler.
It covers class entry, Continue and the existing authoritative native-page waits.
A hosted world's arrival (a server-bound wake, a direct join, a reload's return)
and its pocket hand-offs ride THE ONE CROSSING (`src/net/crossing.ts`,
`docs/engine/shard.md`): one lease from the vessel's flush to the first page
ring around the hero, the world held beneath it.
It does not automatically detect every cold asset, interior transition, or network
handshake. Callers can use the same lease API when those operations gain readiness
contracts. Routine seamless movement does not intentionally insert loading screens.

The crossing is prewarmed at boot in an opaque-origin iframe with
`sandbox="allow-scripts"` and explicit gamepad delegation. Keep
`allow-same-origin` absent. Chromium can give this frame a separate renderer;
Firefox can share scheduling with the parent even with this sandbox. An iframe
alone does not make blocking world generation playable in every browser.

BrowserLoadingPreparation makes the actual entry and Continue paths await a
visible crossing before starting work. `src/worldmass/opening.worker.ts` builds
the native default descriptor, validates saved terrain and prepares natural terrain
memo tables for the opening and its path districts. This one-job worker receives
only seed/configuration/position data and returns immutable derived planning data.
It never receives World, account, actor, save-store or publication authority.
Only results issued by this preparation owner can enter the generator's cache
admission path; cloned/foreign preparations are refused. Existing synchronous
constructors still validate their inputs. Node's synchronous planning fallback is
for headless hosts/probes; browser errors do not silently fall back to blocking work.

Native settlement, routes, country reservations, actor restoration and save
publication stay on the game thread. Their loading adapters yield real tasks
between bounded steps, including path searches, terrain samples, ecology and first
floor baking. The scheduler yields after a six-millisecond allowance between
steps; this is not a hard limit on an individual native call. Candidate World
policies are restored before every yield and re-entered only for the next step.
The live synchronous APIs drain the same generators, preserving query/RNG order.
Cancellation closes the iterator and terminates its worker; failed or superseded
Continue cannot publish its staged account/world. The cover remains until the
first complete world frame. No partial floor is presented.

The first `paint()` waits for display opportunities in the embedding document
before requesting the child's acknowledgement. A timer cannot claim that a visible
crossing painted. Hiding the tab resolves that wait through visibility handling,
so background preparation does not wait indefinitely for animation frames.

`scripts/loading-frame-plugin.ts` bundles the Mu surface and painters into one
cacheable classic-script asset. It refuses World/main/save imports and retained
account authority. The iframe's CSP allows only that local script and its styles.
No new external service or runtime dependency is needed. Firefox acceptance now
measures actual entry and Continue, including steering during both worker planning
and main-thread admission; other untested browser engines still need equivalent
evidence. This does not promise that every native call or steady-state game frame
is free of short hitches.

The typed message protocol carries session tokens, status, cosmetics, action
requests, paint acknowledgements and sampled diagnostics only. The parent checks
the exact source frame and opaque origin; stale sessions cannot close or update
new ones. Diagnostic snapshots are requested by the game when it can receive
them, preventing a queue of full snapshots during a long CPU task. The frame is
retained between crossings and does no minigame simulation while hidden.

`paint()` waits for the foreground acknowledgement before heavy work begins.
The final acknowledgement also lets queued foreground input reach its owner.
Cancel immediately changes the foreground status while keeping it playable;
an already-running synchronous game task cannot be interrupted mid-instruction,
so the existing cancellation owner runs at its next event-loop boundary. Continue
keeps its original staged-world authority checks. Closing returns held keys before
releasing the world's input; loss of the foreground cannot hold input forever.
Readiness still controls completion with no artificial minimum duration, fake
percentage, score requirement or gameplay reward. This does not shorten world
preparation or fix unrelated steady-state world performance.

## Handoff for future integration

The reusable Mu crossing is integrated into `codex/seamless-world-foundation`
and `shard-world`; the completed `codex/mu-loading-screen` branch is retired. Its files
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

The existing callers cover class entry, Continue and required native-page waits.
Other uses are candidates, not automatic integrations. Keep disruptive work behind
the same lease and await its first paint; keep the cover through all required
construction and first rendering. Worker pipelines and bounded yielding are required for CPU-heavy browser loads;
the iframe alone is insufficient on Firefox.
Ordinary seamless movement should stay seamless.

Future contributors should start with the lease example above, the existing
`withLoadingScreen` / `loadingGate` adapters in `main.ts`, and the isolated UI
acceptance course. Preserve the no-score presentation, all direction transforms,
cosmetic/body separation, and keyboard/controller quarantine on return to play.


## Verification

- `npm run check`
- `npm run probe -- loadingpreparation`, `resumeworld`, `wilderness` and affected terrain/native probes
- `node balance/loading-browser-ui.cjs` with Firefox installed (`FIREFOX_BIN` may override its path)
- `npm run probe -- spiritrun` and `npm run probe -- characterresume`
- Scoped production build, then `electron balance/loading-screen-ui.cjs`
- `electron balance/loading-isolation-ui.cjs` (actual distinct processes and input during busy work)
- `npm run smoke` after a normal production build

The UI course uses isolated browser storage and a hidden Electron window. It checks
all directions, keyboard/pointer/controller steering, no numeric readouts, branching
apertures, currents in/between gates, acceleration, stale leases, cancellation,
input release, failed loads/retry, world holds and real entry/Continue; it saves
screenshots under `balance/reports/`. The isolation course blocks the game thread
for 1.8 seconds and proves keyboard, pointer and controller steering in the
foreground before that task ends. It also measures frames and steering inside
actual fresh-world construction and a cold Continue through the real menu button,
tests deferred Cancel and held-key handoff, and rejects an accidental return to a
shared renderer process or hidden-frame throttling on reopen. Continue reloads
the browser after flushing the run save and must restore that same world seed.
Both the longest CPU stage and the entire observed crossing must sustain at least
20 frames per second with no gap of 250 ms; the CPU check includes its boundaries.
Steering must change during the heavy stage, not only before or after loading. A measured combined
seamless/shard entry had a 7.07-second game task with 423 foreground frames and a
32 ms maximum gap; the synthetic busy course had 108 frames with an 18 ms maximum
gap. These are local acceptance observations, not hardware-wide frame-rate promises. The debug surface is `__game.loading` and
`__game.devStartLoadingRun()`. Open `?loadingPreview=down`, `?loadingPreview=right`
or `?loadingPreview=left` for an extended playable preview with the equipped skin.
Cancel returns to the menu; preview creates no run or save. Use a manual lease
for status/error art review; actual
loads close as soon as ready. Minigame mechanics take inspiration from the requested
[Revenant Run reference](https://spagato.itch.io/revenant-run); code and art are native.

### Seamless/shard integration verification (2026-10-11)

The isolated integration combines the loading runtime commit `4dad1dbf` with
the current native-area foundation `c35ee8ab` (on the combined shard checkpoint
`7799af63`). The merge preserves the native-area coexistence change and all
existing shard arrival/hand-off adapters. No world, save or network authority
is moved into the crossing.

In the integrated actual-client course, fresh entry's longest game-thread task
was 11.163 seconds, with 662 foreground frames and steering throughout. The whole
observed entry crossing had 693 frames over 11.675 seconds. A fresh browser load
then restored the persisted run through Continue: its longest task was 3.523
seconds with 209 foreground frames; the complete observed crossing had 404 frames
over 6.771 seconds. Both had a 50 ms maximum gap and restored/created a live
seamless world without client errors. These are local desktop Electron results;
the cross-platform limits above still apply. The report is generated by
`balance/loading-isolation-ui.cjs` under `balance/reports/loading-isolation-ui.json`.

### Firefox loading verification (2026-10-11)

The original shared-thread Firefox course observed an 18.7-second entry freeze
and a 6.2-second Continue freeze despite the earlier Electron isolation passes.
The browser preparation course now cancels an outstanding real worker, enters a
seamless world with the slow regression seed 230345636, flushes/reloads storage and
uses the actual Continue button. It requires the same worldmass seed, no fatal
error, terminated workers, at least 20 frames/second, no half-second stall, a
99th-percentile frame gap below 100 ms, and steering in every two-second interval.
These local acceptance thresholds are distinct from the stricter separate-process
Electron course; they are not hardware-independent frame-rate guarantees.

A measured Firefox run produced 1,350 frames on entry (70.5 FPS, 440 ms worst gap,
46 ms p99) and 1,352 on Continue (67.2 FPS, 416 ms worst gap, 55 ms p99). Planning
ran in the worker for 11.9 and 9.3 seconds respectively while input kept moving the
wisp. The harness uses its own headless Firefox profile and injects only test
instrumentation into served copies; it does not use personal browser saves.
Reports retain per-frame samples under `balance/reports/loading-firefox-*/`.
A second Firefox seed (713) also passed: entry 55.8 FPS / 327 ms maximum gap,
Continue 57.8 FPS / 407 ms maximum gap. `HOLLOW_WAKE_QA_SEED` selects another
uint32 seed for this course. Its boundary is the iframe actually becoming hidden,
so the first live gameplay frame cannot be misreported as a loading freeze.
Desktop UI entry/Continue waits now allow real asynchronous planning rather than
counting only short timers around an otherwise blocking synchronous call.
