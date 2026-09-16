# THE PLATFORM FABRIC + THE TOUCH FABRIC — the game on a phone, a tablet, a handheld's glass

**Status: BUILT 2026-09-15 on the `mobile-touch` branch (M1 THE TOUCH FABRIC,
M2 THE COMPACT LAYOUT's first rules, M3's platform hygiene + the PWA
manifest). Charter and decision cards: `docs/design/mobile-touch.md`. Probe:
`balance/probe_touch.ts` (`npm run probe -- touch`). Every number is
unblessed (her standing word).**

Three modules and a stamp:

| piece | file | what it owns |
|---|---|---|
| THE PLATFORM FABRIC | `src/core/platform.ts` | the capability READ, the PRESET REGISTRY, the FOLD into a `PlatformView`, the live WATCH |
| THE TOUCH LAWS | `src/core/touch.ts` | `TOUCH_CFG`, the LAYOUT REGISTRY (widgets as rows), the stick math, THE ROUTER |
| THE TOUCH LAYOUTS | `src/data/touch.ts` | the registered layouts (`thumbs` is the debut) |
| THE TOUCH PAD | `src/ui/touchpad.ts` | the DOM half: pointer listeners on the canvas, the drawn widgets, synthetic keys, fullscreen |
| THE COMPACT LAYOUT | `src/ui/compact.ts` | `stampPlatform` (the :root stamp) + `COMPACT_RULES` (one injected sheet) |
| the wire | `src/main.ts` | one fold per frame beside the pad's poll; the local input read folds the frame |

## 1. THE PLATFORM FABRIC (`core/platform.ts`)

`readPlatformCaps()` reads the machine once per seam — `touch` (touch
events / `maxTouchPoints`), `coarse` and `hover` (media queries), `pad`
(the gamepad census), the viewport in CSS px, `dpr`, `standalone`
(display-mode / the iOS flag), `electron` (the desktop shell), `mobileUa`
(a hint, never the verdict) and the safe-area insets (`env(safe-area-inset-*)`
measured through a hidden probe element). Headless it returns the desktop
fixture (`desktopCaps()`), so the probe folds fixtures through the very
resolver the browser runs.

`PLATFORM_PRESETS` is the policy — rows in PRIORITY order, each a predicate
over the caps and a bundle of defaults:

| preset | when | touch controls | compact | UI-scale floor |
|---|---|---|---|---|
| `handheld` | a pad AND a touchscreen (Steam Deck, an Android handheld) | on (widgets show only when a finger speaks) | by width | 1 |
| `phone` | touch, no hover, short side under `phoneMaxShortSidePx` (600) | on | on | 1 |
| `tablet` | touch, no hover | on | by width | 1 |
| `desktop` | the catch-all (must stay last) | off | by width | 1 |

`resolvePlatform(caps, pin)`: a pinned preset (`Settings.platform`) wins; `'auto'`
or an unknown pin walks the rows. `registerPlatformPreset(def, before?)` seats
a new row before the catch-all — a TV, a car display, a kiosk is one row here.

`platformViewOf(caps, settings)` is THE FOLD: the preset's defaults under the
player's three overrides — `Settings.touch.controls` (`auto` / `on` / `off`),
`Settings.compactUi` (`auto` / `on` / `off`; `auto` = the preset's default OR
a viewport narrower than `compactMaxWidthPx` (1000)) and `Settings.platform`.
`platformViewSame` compares what consumers stamp, so `PlatformWatch` (resize,
rotation, pad plug/unplug, display-mode changes, a slow poll for env() insets
settling) re-reads freely and main.ts re-stamps only on a CHANGED view.

A changed view does four things in `main.ts platformApply`: `stampPlatform`
(below), `setUiScaleFloor` + `applyUiScale` (the effective UI scale is
max(dial, floor) — the renderer's `uiScaleLive` folds the same pair, so the
DOM and the canvas HUD can never drift), and `touch.refresh()`.

## 2. THE STAMP + THE COMPACT LAYOUT (`ui/compact.ts`)

`stampPlatform(view)` writes the verdict onto `:root`: `.ui-compact` while the
layout is compact, `.ui-touch` while the touch fabric stands,
`data-platform="<preset id>"`, and `--safe-top/right/bottom/left` in px. No
panel sniffs the width itself; a forced-compact desktop window and a phone
read identically.

`COMPACT_RULES` is the registry the one injected stylesheet is built from:
selector (already carrying the class), declarations, and the why. The rules
are FLOORS, NOT LOOKS: undressed panel buttons floor at 30px through
`:where()` (zero specificity, so every dressed control keeps its own rule and
gets a targeted row instead — the attribute steppers, the tab strips, the
option rows, the menus' main actions, the menu bar's tiles), the close glyph
grows to 36px, the sheet and the bag climb on a short screen, the menu bar's
corner seats fold the safe insets while touch stands. With the class absent
every rule is dormant — the desktop sheet is byte-identical.

## 3. THE TOUCH LAWS (`core/touch.ts`)

A layout is a list of widget rows (`TouchWidgetDef`): `kind` `stick` / `aim`
/ `button`, a `zone` in viewport FRACTIONS (mirrored whole under a left
hand), and for buttons an `action` (a keyboard `ActionId` — delivered as the
player's own bind — or `'escape'`), a face (`icon` / `label`), `sizePx`, a
`latch` flag, and an optional `when` gate over live settings.
`registerTouchLayout` refuses duplicate ids and action-less buttons;
`touchLayoutOf` degrades an unknown id to the default; `resolveTouchWidgets`
drops gated rows and mirrors zones.

The stick math is the pad's: `stickRead` runs the finger's offset through
`shapeStick` (now exported from `core/gamepad.ts`) with `PAD_CFG`'s deadzone
and curve, clamps the knob to the rim, and `followBase` slides the base along
once the finger runs past rim + slack. `buttonRect` floors a tile at
`TOUCH_CFG.button.minTargetPx` (44) whatever the scale dial says.

`TouchRouter` is the multi-pointer state machine. Every finger is routed ONCE
at its down and keeps that owner until it lifts:

1. **THE BAR WINS** — a published skill-slot rect (`renderer.hudSlotRects`,
   CSS px, the pressable bar's own ledger — drawn == tested) is that slot's
   press before any zone is consulted.
2. the layout's rows in order: a button's target square; the stick field
   (one stick at a time; a floating base spawns under the thumb, nudged so
   its rim stays on screen; a fixed base sits at the field's seat); the aim
   field (one aim finger at a time);
3. else `none` — owns nothing, still stamps `lastActive` (a stray tap is a
   hand).

`frame()` folds once per tick into a `TouchFrame`: the move vector, the drawn
stick, the aim finger (its point, its base, and under the `stick` style its
shaped vector), `aimSpoke`, `primaryHeld` / `primaryEdge`, per-slot held /
edge, tile downs / edges / releases / latches. EDGES ARE FRAME-SCOPED: banked
between folds, delivered once (the `Input.justPressed` shape). Under the
`cursor` aim style a finger on the field HOLDS the primary (the LMB's shape);
under `stick` the primary fires while the shaped deflection sits past
`fireMag` (a rising edge re-presses). A latch tile toggles on each tap and
reads `latched`; `unlatchAll` / `clear` hand every held thing back as
releases. `activeRecently(t)` is the touch clock's `activeWindow` (4 s, the
pad's twin).

## 4. THE TOUCH PAD (`ui/touchpad.ts`)

Listeners live on the CANVAS and route only `pointerType === 'touch'`; mouse
pointers pass by, so the keyboard/mouse source keeps its byte-identical
path. A routed `pointerdown` is cancelled — the browser mints no compat
`mousedown` / `mouseup` twin, so a finger on the aim field can never ALSO
swing the primary through the mouse lane — and the canvas wears
`touch-action: none` (index.html) so nothing scrolls or zooms. While the
platform view says no touch controls, every listener early-returns before
`preventDefault`, the root stays hidden and taps still arrive as the compat
clicks they always were (THE SOLO INVARIANT: a touchscreen laptop with a
mouse plays exactly as before).

The drawn widgets are pointer-transparent DOM children of one root on the
`touch` stack rung (`Z_LADDER.touch` = 20: over the HUD they steer, under
every panel): the stick's base + knob, the `stick` aim style's right stick,
and the verb tiles — seated by the SAME `buttonRect` the router hit-tests.
Colors ride her palette (ether rings, gold knobs, the panel void).
`Settings.touch.opacity` and `.scale` are the widget dials.

**Verb tiles speak through the keyboard.** A tile's press dispatches the
player's own bind for its action as a synthetic `keydown` on the window
(`keyup` on release; a latch holds the key down until its second tap) —
the `synthEscape` idiom — so panel toggles, pickup, the meta modifier and
the Escape cascade stay single-sourced in `main.ts handleLocalPanels`. A KEY
THAT GOES DOWN COMES UP: every synthetic key is tracked and released on
blur, on a disabled fabric and on a layout refresh.

**THE HAND THAT SPEAKS.** Widgets show while touch spoke at least as recently
as the pad (`router.lastActive >= pad.lastActive`): a handheld's pad hides
them the moment it speaks, a finger recalls them. `ownsHand(now)` (the
fabric stands, a finger spoke inside the window, no pad since) gates the
menu pointer OFF (the finger is the pointer — a tile bound to Ⓐ must never
click the ring's stale seat under a panel) and blanks the bar's key labels
(`renderer.getTouchActive`).

**THE FIRST TOUCH ASKS ONCE.** On the first touch's release (the activation
gesture) a browser host is asked for fullscreen (`navigationUI: 'hide'`) and
then a landscape lock, best effort, never again this page; a standalone PWA
and the desktop shell are never asked (`Settings.touch.fullscreen`,
`TOUCH_CFG.fullscreen`). Haptics (`navigator.vibrate`) pulse on slot and tile
presses where the device offers them.

## 5. The wire (`main.ts`)

- `touchNow = touch.update(nowSec)` folds once per frame right after
  `pad.poll` — a tile's keystroke lands NOW, so `handleLocalPanels` sees it
  this frame.
- `readLocalInput`: the stick's vector adds to `dx/dy` beside the pad's; the
  aim finger holds/edges slot 0 and a finger on a slot rect holds/edges that
  slot, folded beside the keys and the pad; `aimSource` grew a third word.
- **THE FINGER IS THE CURSOR.** With `aimSource === 'touch'`, the aim
  finger's screen point (through `renderer.toWorld`, the mouse's own
  conversion) becomes a hero-relative direction + reach — the pad's sticky
  shape, so the reticle rides the hero between taps — with the reach the
  finger's TRUE distance floored at the pad's min reach and never capped;
  under the `stick` style it is the right stick's deflection (the pad's law
  verbatim). The point is bent by `assistAim` at `Settings.touch.aimAssist`
  (default 1: a thumb has no precision). Before any finger has aimed, the
  bar-press law: where the hero faces, at mid reach. The renderer draws the
  same reticle it draws for the pad.
- AIM ARBITRATION: a finger on the aim field takes the reticle (`aimSpoke`);
  the pad's stick or the mouse's deliberate travel takes it back (the mouse
  handoff continues from the touch reticle exactly as from the pad's).
- The menu pointer's `menuMode` is gated by `!touch.ownsHand(nowSec)`.
- `ui.onPlatformSettings` (the Options → Touch tab) re-folds the view and
  refreshes the pad without a reload; `__game.touch()` / `__game.platform()`
  are the QA doors.

## 6. Platform hygiene + the PWA (`index.html`, `public/`)

`viewport-fit=cover` (the insets come back through `env()`), `theme-color`,
the home-screen metas, `overscroll-behavior: none`, no iOS callout, no tap
flash, `#game` at `100dvh` with `touch-action: none`.
`public/manifest.webmanifest` (copied by Vite into `dist/` and `site/play/`;
`start_url` / `scope` relative so the Pages build's `--base=./` holds) asks
`display: fullscreen`, `orientation: landscape`, and names two icons that
`npm run icon:pwa` paints — `scripts/make-icon.mjs --size N --out PATH`
resamples the SAME 512-space art (the 512 is byte-identical to
`build/icon.png`; the flagless run still writes it). The loopback server
(`launcher/server.cjs`) serves `.webmanifest` under its MIME type. No service
worker yet — offline boot is a card (§8).

## 7. Settings (`meta/settings.ts`)

`Settings.platform` (`'auto'` or a preset id), `Settings.compactUi`, and
`Settings.touch: TouchOptions` — `controls`, `layout`, `hand`, `stick`
(`floating` / `fixed`), `aimStyle` (`cursor` / `stick`), `aimAssist`,
`opacity`, `scale`, `fullscreen`, `haptics`. All ADDITIVE: a pre-dial save
reads `'auto'` everywhere and the engine's defaults; `normalizeTouchOptions`
re-clamps every number into `TOUCH_CFG`'s rails and degrades unknown ids
(schema version unchanged). Options → **Touch** carries every dial with the
detected preset printed beside `AUTO`.

## 8. Extension recipes + the open cards

- **A new device class** — one `registerPlatformPreset` row (predicate +
  defaults). No consumer changes.
- **A new verb tile** — one widget row in a layout: `{ kind: 'button', action:
  <ActionId>, zone, icon/label, latch?, when? }`. The keystroke lane means
  the action needs no new engine seam.
- **A new layout** — `registerTouchLayout` in `data/touch.ts`; it appears in
  Options → Touch Layout at once.
- **A new compact rule** — one `COMPACT_RULES` row (selector carrying
  `.ui-compact` / `.ui-touch`, declarations, why).
- **Odin / Android handhelds today:** open the site's PLAY page in Chrome
  (the Pages build carries the manifest), "Add to Home screen" installs a
  landscape fullscreen app; the built-in pad plays through the Gamepad API,
  the glass answers a finger. Saves live in the browser (`localStorage`)
  until a native wrapper or a sync lane lands.

Cards for her word (none built): the HUD bar as a thumb ARC (a HUD-layout
registry in the renderer — the classic centred row is a poor reach for a
right thumb); a service worker for offline boot + a `?perfprobe` phone
perf lane; a Capacitor/TWA wrapper with native saves; long-press tooltips
and pinch-zoom on the tree/map; touch-flavoured bind tokens in prompts
("Tap" for "Press E"); the compact bag (the Build drawer inside the sheet);
every dial's number.
