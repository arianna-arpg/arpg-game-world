# The front door

The game opens on a full-viewport threshold scene with the existing account and run actions. A resumable run makes Continue the primary action; otherwise Begin / New Run leads. Tutorial, Mu, roster, Vault, co-op and exit semantics remain owned by `UI` and the game shell.

## Extension points

- `src/ui/frontScreenConfig.ts`: typed action definitions, ordering, labels, descriptions, visibility, enabled states, badges, copy, palette and atmosphere settings. `FrontScreenState` contains presentation facts, not a mutable account or save.
- `src/ui/frontScreen.ts`: escaped markup, a decorative vector sigil, a passive backdrop and local keyboard bindings. The view never starts a run or changes progression. Existing `sm-*` IDs retain their handlers in `panels.ts`.
- `src/ui/frontScreen.css`: layout, typography, focus and responsive rules, scoped to the front-screen markup. The existing UI scale remains authoritative; small viewports scroll vertically when needed. Main-menu Options uses the shared side-screen shell; the roster retains its existing layout. Return lifecycles stay with UI.
- `src/ui/assets/threshold.png`: original environment artwork, bundled by Vite through a relative asset URL. It works offline and under a browser deployment subpath.
- Developer menu hooks still receive their own `.esc-btns` slot.

To add an action, add a typed ID and definition to the action registry, then connect its actual command in `UI.renderStartMenu`. Visibility should be derived from the same game-owned eligibility rules as the destination. To change a theme, edit the presentation config and stylesheet; replacing the image requires no simulation change.

The root's full-screen sizing is selected by its current child markup, so replacing it with Options, the roster or Exit cannot leave a stale layout mode. Save hydration refreshes only the menu proper and preserves a focused action where possible. Names and boot notices are escaped before insertion.

## Input and motion

Native buttons support pointer and controller activation through the existing pad pointer. Up/Down and Home/End move focus; native Tab traversal is kept separate from the gameplay Tab binding. Enter and Space retain native button activation.

The atmosphere uses three configurable strata of CSS motes and haze, without a JavaScript animation loop or gameplay time. The mote palette echoes the website's teal/violet/ember insignia and pale aether light, weighted toward the scene's teal soul-flame. Each stratum independently controls count, size, glow, opacity, lifetime, rise and sway. Fixed seeds keep the field stable across menu refreshes; compact screens show half the motes. The lights sit above the vignette but below all interface content. It remains visible across entrance side screens and disappears when all entrance surfaces are hidden. Pause Atmosphere retains its choice during the current session. The operating system's reduced-motion preference suppresses all ambient animation and leaves a faint, still particle field. The UI scale remains configurable through Options, including at 200%.

## Verification

Run `npm run check`, `npm run build`, `npm run smoke`, and `electron balance/front-screen-ui.cjs` (or `node_modules/.bin/electron.cmd balance/front-screen-ui.cjs` on Windows).

The hidden real-client harness uses a disposable profile and save directory under `balance/reports/`. It checks fresh/returning accounts, unlock gates, actual keyboard and controller input, saved-run callbacks, fallen vessels, Options hydration, Vault and Chronicle return paths, browser exit, text escaping, reduced motion, multiple viewport/UI scale combinations, and the real first-account tutorial entry. Its screenshots and JSON report are ignored outputs.


## Shared side screens

Vault, Chronicle and main-menu Options use the same presentation shell. The
entrance version leaves the threshold scene visible on the right; compact
viewports and large UI scales use the full available width. In-world Vault and
Chronicle visits use a centered version over the world, without entrance art.
In-game Options keeps its existing pause-menu presentation.

- `src/ui/sideScreenConfig.ts`: typed profiles own chapter/caption, accent,
  preferred width and selectors identifying header, scroll and footer regions.
  Shared surface colors and entrance duration also live here.
- `src/ui/sideScreen.ts`: `sideScreenContext()` captures the visible origin
  before `hideAll()`; `captureSideScreenFocus(root)` records a stable control
  address before a render; `mountSideScreen(root, profile, context, focus)`
  moves the newly rendered nodes into the frame without replacing their
  controls/listeners. Replacing or hiding a view removes its layout/atmosphere
  through markup-scoped CSS, with no persistent host classes to clean up.
- `src/ui/sideScreen.css`: shared frame, region sizing and responsive rules,
  plus the three views' visual treatments. Native UI scale remains authoritative.

Vault ownership, purchases, hold-to-invest, shelf scroll and sealing remain with
the existing UI handlers. There is no extra shortcut that bypasses the
Reckoning. Wardrobe still opens its own view and returns to the same Vault
visit/context. Chronicle sorting reads the original records; compact rows show
their field labels. Options keeps its tabs, stored settings and rebind capture.
Tab uses native traversal; surviving focused controls retain focus after a
refresh. Every entrance screen shares the same atmosphere pause preference and
honors the operating system's reduced-motion setting.

### Connecting the Codex

The reader is being developed separately; this change does not introduce a
second Codex, synthetic catalog or prematurely expose its menu entry.

1. Add a `SideScreenProfile` with the Codex accent, width and region selectors.
2. Capture the opening context before hiding the parent, and carry it through
   nested navigation (including Vault → Owned → Vault).
3. Keep discovery/filter/media providers and Back/disposal with the reader.
   Call `mountSideScreen` after its initial render and each full redraw; it
   preserves node identity, so existing bound controls continue to work.
4. Adapt the Codex's current root/direct-child sizing rules to its content
   region; the shell owns the outer viewport dimensions. Retain the reader's
   internal list/detail responsive layout and cleanup.
5. Re-run the Codex UI and discovery checks along with the front-screen suite.
   A Codex return during a Reckoning must retain the original render closure,
   scroll and unassigned essence rather than opening a new Vault visit.

The existing acceptance course also checks the side screens across five
viewport/scale combinations, fixed footer reachability, purchase and Wardrobe
round trips, native Options keyboard input, Chronicle sorting/escaped names,
entrance/world context separation and reduced motion. All QA account/settings
mutations use disposable profiles and saves.

## Artwork provenance

- Asset: `src/ui/assets/threshold.png`
- Created for this repository on 2026-10-29 using the built-in OpenAI image-generation tool.
- Original generated environment art; no third-party source image, font, code or runtime dependency was introduced.
- The vector sigil in `frontScreen.ts` was authored directly for this interface.
- Typography uses locally available system serif and sans-serif families.
- The original generated PNG is preserved without edits.

Final generation prompt:

> Use case: stylized-concept. Asset type: original full-screen background painting for Hollow Wake, a dark fantasy action RPG main menu. Create a premium cinematic environment concept painting in ultra-wide 16:9 landscape, ideally 2560x1440. Scene: a silent threshold between life and death, a ruined monumental stone arch on the RIGHT THIRD, a small solitary hooded traveler seen from behind on the stone steps beneath it, an ethereal pale turquoise soul-flame suspended inside the arch. Ancient cliffside ruins and a mist-filled valley recede toward a distant dead citadel, bare branches and weathered stone, a few tiny warm candle lights. Finely detailed atmospheric painterly realism, restrained film grain, deep charcoal and desaturated blue-green, aged bronze accents and pale ivory fog. Restrained ominous beauty with strong silhouettes and sophisticated low-key lighting; subtle reflected teal light on wet stone, atmospheric depth. Composition: entire LEFT 43% intentionally very dark, quiet negative space with faint distant fog only, for readable title and vertically stacked menu text added in code. Arch and traveler must sit in right 60-85% of frame, full arch visible with generous sky margin. Subject hero scale environmental, no closeup faces. Bottom 12% dark vignette. No text, lettering, logos, UI, borders, watermarks. No recognizable existing franchise characters or architecture. Painting fills the frame.
