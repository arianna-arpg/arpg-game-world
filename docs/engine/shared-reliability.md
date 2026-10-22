# Shared reliability fixes

Main now carries the five shared fixes identified in the October 22 branch sweep:

- Disk writes share a per-page, per-slot sequence across fetch and unload beacons. Both desktop and development endpoints reject older completed writes. Save bytes, slot routing and cross-session ownership are unchanged.
- Menu trays measure their actual viewport and fit immediately on click, including scaled UI, expanded station rows and narrow windows.
- Altar slabs register their drawn base as solid scenery on the correct floor. Admission, saved contents and revisits rebuild one derived body per altar; removal drops it.
- Structures fit their complete resolved plan and entrance approaches. Invalid placements relocate deterministically without rerolling the plan. Selected required crypt entrances cannot disappear silently; bounded recovery can use only ground owned by the current recipe. Relocated Holdfast fixtures also move their runtime anchor.
- The loading minigame runs in an opaque, sandboxed foreground document. It keeps its own animation and input during game-thread work. Token-checked paint/close acknowledgements protect cancellation and held input. The first world frame yields between world and HUD passes and restarts if the viewport changes.

Main retains its existing finite world construction, character saves and local/co-op ownership. Continuous geography, retained-area paging, native persistence and other intentional seamless changes remain on seamless.

## Verification

Run `npm run check`, `npm run test:reliability`, `npm run genqa`, and `npm run sim -- run --suite smoke`. After `npm run build`, run `npm run test:reliability:ui`, `npm run smoke`, and `npm run smoke:launcher`. CI also runs the existing shared gameplay, layer, repository and complete green probe suites.

The desktop checks use isolated profiles. They cover immediate viewport fitting; real Begin/Mu/Wake and cold Continue; keyboard, pointer and controller input during a sustained blocked game thread; cancellation and held-key quarantine; and first-frame resize/reentry/cancellation. A fast finite load need not produce a browser long-task entry: the sustained blocked-work test remains mandatory.

The focused headless probes exercise actual save endpoints (including reversed body arrival, beacons, malformed bodies and failed writes), complete fixture relocation, required entrances on open and winding terrain, physical altar walking and Continue/revisit restoration. Generation QA covers the broader authored layout catalog.
