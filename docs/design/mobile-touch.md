# MOBILE & TOUCH — viability charter v1 (the phone in the hand: what the engine already gives, what it still owes)

**Status: M0 BUILT (2026-08-21) — THE CLOSE GLYPH, THE PRESSABLE BAR and the
borough seat landed with this charter (receipts in §6). Everything from M1 on
is a PROPOSAL carded for her word; nothing under `src/` beyond M0 is touched.
Her ask (2026-08-21): a small (x) that closes the inventory "or other UI
screen" on everything applicable; then "the viability of also allowing for
mobile compatibility — similar to Steam Deck — the overall UI to ensure
comfort, and touch-applicable UI elements, which could also be derived by
actual mouse-clicks such that something like the hotbar is actually also
clickable rather than exclusively key-bound." Survey receipts are against
HEAD `e1528ee` plus this pass; anchors name files + symbols, line numbers
drift. Every number is unblessed (her standing word).**

> **THE LEAD FINDING, before anything else.** The game is nearer to a phone
> than it looks, because the input fabric is already DEVICE-BLIND in exactly
> the right way: the pad layer reads an INJECTABLE pad (`window.__fakePad` /
> `__fakePads[]`, `core/gamepad.ts readPadSource` — built for tests and the
> couch rigs), and the pad's virtual pointer (`ui/padpointer.ts`) already
> drives every DOM panel with real pointer events. A TOUCH PAD is therefore
> an on-screen stick + buttons that WRITE a `FakePad` each frame — movement,
> aim, all eight bar slots, the four panel toggles, Escape, menu pointer —
> and the whole game, co-op and couch included, plays it as a Steam Deck
> with ZERO engine edits. The owed work is not plumbing; it is the three
> things a finger lacks that a mouse has (a hover, a cursor, precision) and
> the one thing a phone lacks that a monitor has (width).

---

## §0 What "viable" means here

Three different targets hide in "mobile", and they cost very differently:

| target | what it is | what it needs | verdict |
|---|---|---|---|
| **Deck-class handheld** | a controller with a screen (Steam Deck, ROG Ally, a phone with a clip-on pad) | nothing new — the pad path + UI scale dial already serve it; the launcher's AppImage lane ships it | **viable today** |
| **Phone/tablet in a browser** (the site's PLAY page, `npm run build:web` → `site/play`) | touch only, landscape, 6–10" | THE TOUCH FABRIC (§4 M1), a COMPACT layout (M2), a perf lane (M3) | **viable — 3 milestones** |
| **Store app** (iOS/Android) | the web build in a wrapper (Capacitor / TWA) | M1–M3 first, then packaging, store policy, IAP-free | **later, optional** (M4) |

The recommendation: build for the second row (the web build already reaches
phones; `localStorage` save fallback exists for static hosts — `vite.config.ts`
header), and let the third fall out.

---

## §1 Receipts — what already stands (the survey)

**Input.**
- `core/input.ts` — keyboard + MOUSE only (`keydown/keyup`, `mousemove/
  mousedown/mouseup` on the canvas, `contextmenu` suppressed window-wide,
  `dragstart` suppressed). NO touch/pointer branch anywhere under `src/`
  (`touchstart`, `pointerType`, `pointer: coarse` — zero hits). A touch today
  reaches the game only as the browser's COMPAT mouse events (a tap = mousemove
  + mousedown + mouseup at the tap point = "swing the primary toward here";
  a drag moves nothing).
- `core/gamepad.ts` — `PadState.poll` reads `navigator.getGamepads()` OR
  `window.__fakePad` / `__fakePads[i]` (`FakePad { axes, buttons, timestamp?,
  id? }`). Sticks are AXES (move → `PlayerInput.dx/dy` analog; aim → a sticky
  world-space reach point bent by `engine/aimassist.ts assistAim`), buttons
  are BINDING CODES in `Settings.padBinds` (default: RT/LT primary/secondary,
  A/B/X/Y/RB/LB slots 2–7, D-pad = the four panels, START = Escape, SELECT =
  meta). `PAD_CFG` + `Settings.pad` hold every feel dial (deadzone, curves,
  aim reach, assist strength/mode, pointer speed, southpaw).
- `ui/padpointer.ts` — while a blocking surface is up and the pad spoke
  recently, a ring cursor dispatches the REAL hover grammar + pointerdown/up/
  click to the element under it; drags (the drag fabric, panzoom) work
  unmodified. Ⓐ confirm, Ⓑ = `synthEscape()`.
- `net/couch.ts` — a second LOCAL seat is an ordinary `PlayerInputSource`
  on a bound pad index; the fake-pad rigs prove a synthetic pad is a full
  citizen (claim, roam, census).

**DOM surfaces.**
- `ui/dnd.ts` (every drag: bag, doll, grimoire, vestiges) and `ui/panzoom.ts`
  (tree + map) are PURE POINTER EVENTS; the two SVGs already wear
  `touch-action:none` (panels.ts ~5087, ~6184). Pinch-zoom is the one gesture
  missing (panzoom zooms on `wheel`).
- `ui/tooltip.ts` — delegated HOVER tooltips with an intent delay
  (`TIP_CFG.intentMs`) and proximity mode; this is THE inspection language
  (items, skills, vestiges, passives, the Vault). Touch has no hover.
- `ui/uiScale.ts` — ONE dial (0.75–2×) grows every DOM surface (zoom) + the
  canvas HUD (`renderer.ts` UI-scale sub-pass). The legibility lever for a
  phone already exists.
- `ui/zorder.ts` — one stacking ladder; any touch overlay (a virtual pad) is
  a new rung between `crest` and `panel` (it must read OVER the HUD it
  controls and UNDER every panel).
- `index.html` — `<meta viewport width=device-width, initial-scale=1>` is
  present; `user-select:none`; panels are absolute-positioned frames with
  DESKTOP widths (inventory 660, map 860/94vh, tree 760/92vh, bestiary 640,
  class select 860, dialogs 420–540) capped by `max-width: calc(NNvw /
  var(--ui-scale))`; text 10–12px.

**Rendering / perf.**
- `render/renderScale.ts` — the render-scale GOVERNOR (auto notch ladder
  1/.85/.7/.55 off the live frame ring) is exactly the mobile-GPU safety
  valve; the CREST overlay keeps HUD + words crisp under it.
- `npm run perf` is Electron-desktop only (`balance/perf.config.json` gates
  against the same run's town control). No mobile lane exists; mobile GPUs
  pay differently for Canvas2D fills/shadows/gradients and composited light
  layers.
- `engine/lite.ts`, `VIS_CFG.lights.share`, the sight veil's dials are the
  existing cost knobs a mobile profile would turn.

**Platform.**
- `npm run build:web` → `site/play` (gitignored, CI-built) — the browser
  build the site's PLAY pillar links. No PWA manifest / service worker, no
  fullscreen request, no orientation lock, no safe-area (`env(safe-area-
  inset-*)`) handling, no `100dvh` (iOS Safari's URL-bar 100vh quirk).
- Saves: `/__save/:slot` endpoints on dev/Electron; `localStorage` fallback
  where absent — a static mobile host keeps its saves in the browser.

---

## §2 M0 — BUILT this pass (the mouse-derived half of her ask)

**THE CLOSE GLYPH** (`index.html .panel-x`, `ui/panels.ts closeGlyphHtml` +
the `panelClosers` ledger). Every closeable panel wears a small ✕ in its
top-right corner: Inventory, Character Sheet, Passive Tree, World Map (both
the chart and the Quest Journal tab), Vendors, Salvage Station, Sacrificial
Font, Oracle Stone, Bestiary, Caravan, Harbor (sail), Hold, Mercenary, the
Vocation offer (title says **Decline** — the close IS the decline, as Esc
is), the Borough arming panel, the Ability-Point popup ("Later"), and the
Pause menu on all three of its views (title **Resume**). The laws:
- **The mouse/touch twin of Esc.** Every glyph walks the panel's OWN close
  path (the toggle for the keyed four, `close*` for the dialogs), so the
  vendor still sheds its verbs, the bag still cancels its drag, the vocation
  still declines, the couch guest's ✕ closes the GUEST's bag (the toggle with
  the owner's seat id is the keyed close, byte for byte).
- **Rebuild-proof.** The click is DELEGATED once per root; templates rebuild
  `innerHTML` freely (the 0.5s auto-refresh, the vendor ticker) and the glyph
  stays live. Markup is a zero-height STICKY row placed FIRST, so it
  displaces nothing and rides a scrolling panel; `.panel h2` reserves the
  corner (`padding-right: 30px`) so the map/tree header controls clear it;
  the inventory's satchel button yielded the corner (`right: 46px`).
- **Thumb-sized.** 28px box, not just a 13px glyph.
- NOT glyphed, on purpose: the flow screens (start menu, class select,
  Vault/account, expedition setup, story card, death screen) — each has an
  explicit Back/Continue whose meaning is more than "close" (the Vault's
  RECKONING SEAL LAW arms on leaving). A card for her: should the Vault's
  Back also wear the glyph?

**THE PRESSABLE BAR** (`renderer.hudSlotRects` + `main.ts barPress` /
`hudSlotAt`). The canvas hotbar is now a surface, drawn == tested:
- The renderer PUBLISHES every skill-slot rect it draws, in CSS pixels
  (`uiToCss` folds the UI-scale sub-pass and the render-scale surface), per
  seat; main.ts hit-tests the mouse's down edge against THOSE rects — never a
  re-derivation — so a UI-scale notch, a render-scale step or the couch flank
  anchor can never make the hand and the eye disagree.
- A press that lands on the hero's slot becomes THAT slot's press for the
  button's whole hold (held casts channel, guards hold, an edge on the frame
  it went down — the same shape a key delivers), and the LMB's own slot-0
  contribution is WITHHELD for the press: pressing a button must never also
  swing the primary. Off the bar, LMB is untouched.
- **The aim law:** the cursor is on the bar, not on the battlefield, so the
  press aims where the hero FACES at the pad's mid reach (`pad.aimReach(0.5)`),
  bent by `assistAim` at full strength with a lock that persists across the
  press — the pad stick's own law, borrowed. If the pad owns the reticle,
  the pad's aim stands.
- The hovered slot wears a rim (`barHover`) so the bar reads as pressable
  before the hand commits; couch guests' bars publish too (seat-tagged) but
  the mouse serves only the local hero's.
- **Touch rides the same seam.** A tap on the canvas arrives as a compat
  mousedown at the tap point → the bar press fires. The bar is the first HUD
  surface a thumb can work.

**The borough seat.** `#borough-menu` carried no CSS anchor at all, so the
absolute `.panel` sat at its static position — BELOW the 100vh canvas,
invisible. It joins the centered dialog family (index.html ~333). Live
receipt: centered at 1280×720.

---

## §3 The gaps (honest — what a finger lacks, what a phone lacks)

1. **No touch fabric.** Movement and aim have no touch meaning at all; a
   drag does nothing, two fingers do nothing. The compat-mouse tap = "primary
   toward here" is accidental.
2. **Hover is a language.** Tooltips (item inspection, the skill card's
   charge cost, the Vault's unlock story), the elite nameplate, the bar's
   rim, `:hover` affordances, panzoom's idle hover — none exists on touch.
   `tooltip.ts` already has an INTENT delay model to hang a long-press on.
3. **Width.** A phone in landscape is ~780–930 CSS px wide at 2–3× DPR; the
   inventory (660 + the Build drawer OUTSIDE it), the map (860), the bestiary
   spread (640, two columns) and class select (860) were drawn for 1280+.
   Portrait is hopeless for this HUD. Verdict: landscape only + a COMPACT
   mode.
4. **Targets.** 22px attribute buttons, 10px bind buttons, 14px bag cells
   (the tetris grid is 34px — fine), tab buttons ~20px tall. Platform
   guidance is 44pt/48dp minimum. The bar slots (54 virtual × UI scale) and
   the close glyph (28) are already fine.
5. **Perf is unmeasured on the target.** Canvas2D + the light layer + veils
   + fog/creep skins on a mid phone GPU is unknown; the governor will step
   the buffer down, but the HUD/word crest stays native. A perf lane that
   runs the existing zone sweep in a phone browser is owed before promising
   anything.
6. **Platform hygiene.** Fullscreen (`requestFullscreen` on first tap),
   orientation lock (`screen.orientation.lock('landscape')` where allowed),
   `touch-action: none` on the canvas (kills double-tap zoom / pull-to-
   refresh / overscroll), `100dvh`, `env(safe-area-inset-*)` for notches,
   long-press context menu (`contextmenu` is already suppressed — but
   iOS's callout needs `-webkit-touch-callout: none`), a PWA manifest +
   service worker for home-screen install and offline boot.
7. **Text entry** (name field, tree search) is fine — the OS keyboard; the
   keybind screen is moot on touch and should hide behind the controller
   tab's idiom.
8. **Co-op.** A touch seat is an ordinary seat; couch on one phone is silly
   and should not be offered (`couchMinPads()` already gates on controllers).

---

## §4 THE SHAPE — the proposal (milestones, all data + UI, no engine law)

**THE TOUCH FABRIC (`ui/touchpad.ts` + `TOUCH_CFG`, M1) — a FakePad producer.**
- Detection: `matchMedia('(pointer: coarse)')` AND a first `pointerdown` of
  `pointerType === 'touch'` → `touchActive` (the pad's `activeRecently`
  idiom); the HUD's `slotKeys` reads touch as "pad glyphs off" (no key
  labels); the pad pointer stays OFF (the finger IS the pointer).
- **Left half: THE FLOATING STICK.** A virtual stick spawns UNDER the thumb
  on touchstart (the Diablo Immortal / Genshin pattern — no fixed dead spot),
  radius ~56 CSS px, dead zone from `PAD_CFG.deadzone`, writes `axes[0..1]`.
  Analog magnitude rides straight into `PlayerInput.dx/dy` (the stalk walk
  works on a phone for free).
- **Right half: THE BAR + TAP-AIM.** The eight bar slots are the skill
  buttons (already pressable; M2 scales them up under touch); a tap/hold
  elsewhere on the right half writes the aim stick from the tap vector
  relative to the hero (deflection = reach, the stick's law) and presses
  slot 0 — the primary. Default **AUTO-AIM**: `assistAim` strength 1 with
  the mid-reach facing point (the bar-press law, generalized) so a held
  slot button fights on its own; a **DRAG-AIM** option (right-thumb drag =
  aim stick) for the precise player. Both are `Settings.touch` dials, no
  engine edit.
- **The corner cluster.** Four glyph buttons (bag / sheet / tree / map) +
  pause, top-left/right, writing the D-pad/START buttons; the close glyph is
  the way out of every screen. Flask slots stay on the bar (they are slots).
- **Hover → LONG-PRESS.** A pointer held ~350ms without moving opens the
  tooltip at the finger (`tooltip.ts` intent model; dismiss on next tap);
  the drag fabric keeps press-drag (threshold already exists) and gains a
  double-tap-to-lift twin of click-lift.
- **Pinch-zoom** on tree/map: `panzoom.ts` — two pointers' distance delta →
  synthetic wheel notches (the pad pointer's `zoomNotchesPerSec` trick).
- Z rung: `Z_LADDER.touch` between `crest` and `panel`; `pointer-events`
  only on the widgets, never the overlay.

**THE COMPACT LAYOUT (M2).** `:root.ui-compact` stamped when the viewport
is under ~1000 CSS px wide (and always on touch): panels become FULL-SCREEN
STACKED sheets (one at a time — the couch dock idiom inverted), the
inventory goes single-column (doll over bag, the Build drawer and satchel
INSIDE the sheet as tabs), the bestiary spread collapses to one column, tab
strips scroll horizontally, every button floors at 40px tall, UI scale
auto-floors at 1.25 under touch (the dial still wins above it). Tooltips
become bottom sheets. One injected stylesheet, the UI-scale/zorder idiom.

**THE PHONE LANE (M3).** `npm run perf -- --mobile` is not possible (Electron
is desktop) — instead a `?perfprobe` URL mode that runs the same zone walk in
ANY browser and posts the frame ring to the dev server, so a phone on the
LAN can be measured against the town control; a `VIS_CFG.profile = 'mobile'`
(light share, veil softness, fog/creep skin density, lite caps) the governor
may step into; fullscreen + orientation + `touch-action:none` + dvh + safe
areas + the PWA manifest/service worker for `site/play`.

**THE WRAPPER (M4, optional).** Capacitor (iOS/Android) or a TWA over the
same `site/play` build; saves via the disk-save endpoints' native twin.

Rough weight: M1 ≈ one session (the FakePad seam makes it UI-only),
M2 ≈ one to two (it is layout surgery across panels.ts templates + CSS),
M3 ≈ one (mostly measurement), M4 ≈ one plus store paperwork.

---

## §5 Decision cards — for her word

1. **Control scheme (REC: floating stick + auto-aim; tap-to-move is a
   different game).** The Deck/pad identity is already the game's second
   input language; touch should be its third dialect, not a new grammar.
2. **Aim law (REC: auto-aim via `assistAim` at full strength, drag-aim as
   the option).** The bar-press law shipped in M0 is exactly this, so the
   phone and the mouse-on-bar agree.
3. **Orientation (REC: landscape only).** Portrait would need a different
   HUD, not a compact one.
4. **Platform (REC: the site's PLAY page as a PWA first; wrappers later).**
   No store gate, no review cycle, the build already exists.
5. **Compact trigger (REC: viewport width, with touch forcing it).** A
   small desktop window benefits too; pointer-coarse alone misses tablets
   with a mouse.
6. **The Vault's Back / the flow screens — glyph or not?** Open; M0 left
   them un-glyphed because their Back carries meaning (the seal law).
7. **Flasks on touch — bar slots (REC) or a dedicated pair?** Slots keep ONE
   law; a dedicated pair is a comfort card if the bar crowds.

---

## §6 M0 receipts (live, 2026-08-21, dev server `arpg-dev-qa72`, 1280×720)

- Glyph present once per panel; inventory glyph at (1227,65) with the
  satchel button shifted clear; char sheet / tree / map glyphs in their
  corners; a dispatched click on each of the four keyed panels' glyph hid
  the panel AND cleared its open flag (`anyPanelOpen() === false`).
- Dialogs: vendor / salvage / oracle / bestiary / caravan / sail / vocation
  opened, glyph present (vocation's title "Decline the offer (Esc)"), click
  closed each and cleared its flag; the pause menu's glyph stands on the main
  AND options views and closes (`escapeMenuOpen === false`). Font / hold /
  merc close themselves without their station (`refreshFont` proximity law,
  `refreshHold`/`refreshMercMenu` context guards) — templates verified at
  source; the wire is the shared ledger.
- `#borough-menu` shown with probe content: centered (430,290,420,140).
- Bar rects at UI scale 1: x = 403 + 60·i, y = 628, 54² (centered 8-slot bar
  at h − 92); at UI scale 1.5: x = 285 + 90·i, y = 582, 81² — the hit test
  moved with the dial. A synthetic press at slot 2's scaled centre started
  `war_cry`; a field press (off the bar) swung `cleave` (mana spent); a bar
  press with `war_cry` on cooldown swung NOTHING (slot-0 withheld). Gates:
  `npx tsc --noEmit` 0, `npm run check` 0, the fast probe lane (see the pass
  record).
