# Shared interface styles

Inventory and its registered development pages share a presentation layer:
Skills, Passives, Character, skill trees and container pages such as Reliquary.
The default combines the Aether frame, Silver Inlay title divider and Refined
Pennants. It preserves the native grid, equipment seats, page widths, rail
placement, scrolling, folio selection, close policies and player ownership.
The same choices now cover the upper folio tabs, nested category tabs, NPC
dialogue, station windows, menus, tooltips and smaller decision dialogs.

Navigation uses the same bone text, frame accent, neutral card material and
hover/focus glow in Pause, Codex, Wardrobe, Options and Mu's vessel chooser.
Shared control rules own ink, borders, corners and shadows as well as fills;
legacy menu rules consume these tokens instead of supplying a separate gold
palette. Cosmetic swatches, class identity, rarity and warning colors remain
meaningful content. Selected catalogue cards retain a distinct inset accent.

The initial release-loader page, game, skill-showcase document and isolated
Crossing declare an authored dark color scheme and the supported
`darkreader-lock` metadata. Dark Reader's
dynamic rewrite otherwise loses the decorative gradients' sizes and fills
whole panels aqua. Palette changes remain owned by Wardrobe; OS forced-color
accessibility is not disabled, and no extension settings are changed.
Protecting the initial loader matters: a rewrite started there can survive
`document.write` even when the replacement game document carries the opt-out.

`ui/zorder.ts` seats navigation roots above the HUD Menu and Town Portal in
every configured portal seat. Pause, Codex, Wardrobe, Options, front-door and
journey cards cover the controls wherever they overlap, including hit testing.
Ordinary books retain their existing relation to the HUD, and Portal visibility
preferences are unchanged. New navigation roots enroll in that shared registry.

Back sits last, at the lower right, in menu navigation footers. Wardrobe and
its Interface page keep that footer visible while the body scrolls; Options,
Save & Exit, class selection and the browser exit fallback follow the same
placement. Codex's compact Results action precedes Back. Existing Vault,
Chronicle and Immortal footers retain their original return/seal actions.

`INTERFACE_SURFACES.entrances` opts menu panes, dialogue/station panels and
small dialogs into a shared opacity entrance. Its duration and the control
transition/glow are configurable `--inv-*` tokens. No transforms, input delays,
gameplay holds or per-frame scans are added. Reduced motion disables these
entrances and control transitions. `renderInterfacePage` keeps Wardrobe's outer
page stable across picker redraws, so searching, choosing a cosmetic or saving
does not replay the entrance. Real navigation creates a new page. The sample
inherits its parent's UI scale exactly once, including its folio tabs.
Plain menu roots use `presentInterfaceView` to distinguish navigation from
settings/census refreshes. It uses the same duration, cancels superseded motion
and responds to reduced-motion changes without delaying navigation or input.

## Wardrobe

Open **Menu → Wardrobe → Interface**, or enter Wardrobe from the Vault.
Panel frame, title divider and page ribbons are independent selectors. The
sample uses the actual shared ornament presenter and stylesheet. Previewing,
restoring the default preview, or leaving the section does not change saved
choices. **Save interface style** applies the draft without rebuilding live
panels, then uses the normal settings persistence path. Returning through the
Wardrobe retains its original Vault/Reckoning or in-world return closure.
Its sample includes the upper folio tabs as well as the side ribbons; draft
changes affect both samples without changing the rest of the Wardrobe.

These choices are free, device-local UI preferences, shared by characters and
runs on that device. They are not account cosmetic entitlements and never spend
credits or enter co-op appearance snapshots. Existing account cosmetics and the
hotbar's cosmetic slot remain independent. Missing settings adopt the approved
default; each unknown selection falls back independently when loading.

## Extension

- `ui/interfaceStyleConfig.ts`: attributed choice registries, defaults and
  presentation tokens. Add a choice using an existing `motif` and token overrides
  to create another palette. New structural motifs add scoped stylesheet rules;
  neither path requires changing the Wardrobe selector code or page gameplay.
- `ui/interfaceSurfaces.ts`: selector registry and shared paint rules for
  frames, compact cards, controls, headings and tabs. Existing and future
  matching elements inherit the selected tokens immediately. There is no DOM
  observer, per-frame scan or markup replacement. Add a selector to the relevant
  role, or use `.interface-dialog` for a new dialog and `.interface-heading`
  for a non-heading title. Layout and interaction still belong to its owner.
- `ui/interfaceStyle.ts`: applies choices to live surfaces and adds decorative
  markup after real panel rebuilds. Decorations are hidden from assistive
  technology, absolutely positioned and pointer-transparent. Character's native
  sticky band hosts its divider beneath the starter information.
- `ui/interfaceStyle.css`: shared surfaces, frames, divider grammars, ribbon
  faces and controls. Imported only by the browser entry in `main.ts` so Node
  checks can continue importing shared UI modules.
- `ui/wardrobeInterface.ts`: isolated draft/sample and explicit save action.
- `ui/interfacePage.ts`: reusable stable page, scrolling body and navigation
  footer; each provider still owns its content and handlers.
- `Settings.interfaceStyle`: additive persistence; no schema reset. Main applies
  the selection at initial load and again after authoritative disk hydration.

## Coverage

| Surfaces | Shared presentation |
| --- | --- |
| Inventory and development pages | Original ornamental frame, title rule and vertical ribbons |
| Upper folio tabs; book, realm, Wardrobe and Codex tabs | Horizontal version of the selected ribbon material; native active/fresh states |
| Dialogue and NPC service windows | Frame, heading rule, portrait surround, controls; speaker ink and responses preserved |
| Vendors, salvage, Font, Recall, Oracle, Bestiary, Borough, bounties, Caravan, Harbor, Hold, mercenaries and vocation offers | Shared frame and controls, irrespective of the dwell/menu path that opens them |
| World map/journal, reward and imbue choices | Frame, rules, controls and neutral card fills; map and quest markings unchanged |
| Pause, Save & Exit, menu tray, Options, Vault, Chronicle, Immortals, Codex and Wardrobe | Shared materials; existing shells, logo and return paths preserved |
| Tooltips, skill choices, opening-kit cards, confirmations, local/online co-op setup and crafting dialogs | Appropriate full or compact material; original dimensions and hit targets |
| Vendor and stash grids | Inventory materials; rarity, reservation, price/refusal and lock markings retained |
| The Crossing | Copy of the selected palette sent with each loading request; controls and progress inherit inside the isolated frame |

Full-screen backdrop containers are excluded from card framing; their inner
cards receive it. The title scene retains its authored atmospheric artwork.
The canvas HUD, world-space dwell rings, speech, map markings, minigame playfield
and combat/rarity colors remain semantic visualizations, independent of menu
skin choices. Developer tools and fatal-error recovery are separate utilities.
No dwell timing, reach, opening, selection, purchase or reward rules change.

`decorateInventoryPanel` is called after markup writes, not in the animation
loop. `setPanelHtml` and the container's live-render cache still compare their
original content, retaining focus, listeners and node identity on idle refresh.
New registered pages should call the presenter after writing markup, or use
the shared `setPanelHtml` path. All roots use `.inventory-surface`; no control
handler or data ownership moves into the styling layer.

Item, socket, skill and currency colors retain their semantic sources. Neutral
item/cell fills use optional CSS variables in existing markup; rarity borders,
unique glows, tutorial pulses, lock feedback and drag/drop landing overlays keep
their native rules. No `!important` overrides are used. Reduced motion gives
ribbon lessons a steady highlight. UI scale and movable-window settings remain
the existing layout authorities. The title line-height token preserves the
native heading height while changing its typeface.

## Verification

Run `npm run check` and `npm run probe -- interfacestyle`.
After building, run the hidden Electron courses `interface-style-ui.cjs`,
`inventory-ui.cjs`, `inventory-pages-ui.cjs`, `inventory-tabs-ui.cjs`,
`build-panels-ui.cjs` and `cosmetics-ui.cjs`, plus boot smoke. The focused course
checks shared decorations, native hit targets and geometry, idle focus/node
retention, preview isolation, saving, disk reload, responsive Wardrobe layout,
default restore and the account return flow. Reports use disposable saves and
profiles under `balance/reports/`.

For shared coverage, also run `interface-surfaces-ui.cjs`, `dialogue-ui.cjs`,
`dialogue-services-ui.cjs`, `menu-tray-ui.cjs` and the loading-screen acceptance
courses after building. The surface course checks real folio selection and
geometry, draft isolation, live saving, future dynamically created panels,
station coverage, vendor materials, Pause, the menu tray, Vault and the isolated
loading palette. Inventory and service courses retain the gesture/ownership
contracts; no new skin-specific gameplay policies are introduced.

`balance/interface-cohesion-ui.cjs` checks actual mouse hover and keyboard
focus, matching menu materials before/after a saved theme change, live fade
keyframes, picker redraw stability, lower-right Back placement, narrow/enlarged
Wardrobe layouts, reduced motion and nested Vault returns. Run it after a build,
alongside the Codex, cosmetics, front-screen and Save & Exit courses.

`balance/menu-presentation-ui.cjs` checks rendered panel pixels across UI scales,
actual HUD overlap and dismissal, all portal seats, saved Wardrobe alternatives,
the standalone showcase and isolated Crossing declarations. It is included in
the reliability UI course. For the external recoloring reproduction, optionally
set `HOLLOW_WAKE_QA_DARKREADER` to a local Dark Reader script (tested with 4.9.134);
the library is test-only and is neither a game dependency nor a bundled asset.
