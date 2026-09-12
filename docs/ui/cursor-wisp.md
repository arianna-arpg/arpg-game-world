# Wisp Vessel cursor study

Run `npm run dev -- --config scripts/cursor-preview/vite.config.ts`, then open
http://127.0.0.1:5198/scripts/cursor-preview/index.html.

The preview offers all registered styles, nine role studies at enlarged and
native sizes, dark and pale backgrounds, existing swatches, arbitrary hex tint,
idle motion controls, and a disposable real-game iframe. The preview server
omits the game's save/editor plugins and refuses their routes. The iframe also
installs in-memory storage and blocks save fetch/beacon calls before game boot.
The original death preview is independent.

`Wisp Vessel` is the default `CURSOR_STYLES` entry for new settings. Existing
saved cursor selections remain active;
Wake, Sigil and Talon keep their existing resting art and interaction forms;
System remains native. Wisp owns
its entire role family through optional `rolePaint`; new families can reuse the
same hook. `cursorWisp.ts` owns the configurable art: luminous hollow ring,
stationary pinpoint, trailing filaments, distinct reach/press and gather/hold
forms, I-beam, badges, and crosshair. The existing controller reticle continues
to read the same tint and retains its targeting and lock behavior.

`Glimmer` follows the user's pointed blue reference sketch: a cyan edge over
a dark swept wing, using the same tint setting. Glimmer Blue joins the existing
swatches. Select Glimmer and Glimmer Blue to see the reference combination;
the preview opens with the game's Wisp Vessel / Wake Gold default. Glimmer's
point/press forms open and tighten the wing through `gesture`.

`CursorOptions.idleMotion` defaults to enabled only for styles that declare idle
art. `idleDelaySec` defaults to 2.5 seconds, bounded to 0.5–10. The existing
Settings cursor object stores these options and the custom tint. One normalizer
handles missing/invalid data. The game Options panel provides the controls.

Motion uses prepainted native cursor frames, with a 3.2-second cycle and 1.25px
filament displacement. No DOM follower is introduced. Every wisp role and frame
keeps the same 10,10 hotspot, white aiming center, and fixed affordance geometry.
Wake, Talon and Glimmer instead oscillate ±3 degrees about their exact hotspot;
Sigil oscillates ±5 degrees. The registry's `idle.kind` chooses filament art or
oscillation, with per-style amplitude. Rotated frames receive symmetric padding
and an equal hotspot offset (up to 40px total); the click seat never shifts.
Frame zero keeps the original unpadded image. The preview anchors each sample
at its hotspot so headroom does not appear as a size/position jump.
Press and grabbing art stay static. Mouse movement, held buttons/keys, wheel,
scroll, drag, leaving the document, blur, hidden tabs, pointer lock, and reduced
motion stop or suspend the idle driver. Reapplying settings disposes its timers
and listeners. Native `cursor:none` on the game's pad-owned canvas still wins.

The preview's “Check cursor behavior” exercises retained styles, normalization,
all role images, fixed wisp hotspot pixels across idle phases, two-sided
oscillation in all four other themed styles, held-role stability, padding and
hotspot agreement, System restoration,
idle timing, held-button suspension, rearming and disposal. Run `npm run check`
and a production build as well.
