# Shared interface styles

Inventory and its registered development pages share a presentation layer:
Skills, Passives, Character, skill trees and container pages such as Reliquary.
The default combines the Aether frame, Silver Inlay title divider and Refined
Pennants. It preserves the native grid, equipment seats, page widths, rail
placement, scrolling, folio selection, close policies and player ownership.
The same choices now cover the upper folio tabs, nested category tabs, NPC
dialogue, station windows, menus, tooltips and smaller decision dialogs.

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
