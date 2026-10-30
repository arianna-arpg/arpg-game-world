# Inventory interface styles

Inventory and its registered development pages share a presentation layer:
Skills, Passives, Character, skill trees and container pages such as Reliquary.
The default combines the Aether frame, Silver Inlay title divider and Refined
Pennants. It preserves the native grid, equipment seats, page widths, rail
placement, scrolling, folio selection, close policies and player ownership.

## Wardrobe

Open **Menu → Wardrobe → Interface**, or enter Wardrobe from the Vault.
Panel frame, title divider and page ribbons are independent selectors. The
sample uses the actual shared ornament presenter and stylesheet. Previewing,
restoring the default preview, or leaving the section does not change saved
choices. **Save interface style** applies the draft without rebuilding live
panels, then uses the normal settings persistence path. Returning through the
Wardrobe retains its original Vault/Reckoning or in-world return closure.

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

Run `npm run check` and `node --import tsx balance/probe_interfacestyle.ts`.
After building, run the hidden Electron courses `interface-style-ui.cjs`,
`inventory-ui.cjs`, `inventory-pages-ui.cjs`, `inventory-tabs-ui.cjs`,
`build-panels-ui.cjs` and `cosmetics-ui.cjs`, plus boot smoke. The focused course
checks shared decorations, native hit targets and geometry, idle focus/node
retention, preview isolation, saving, disk reload, responsive Wardrobe layout,
default restore and the account return flow. Reports use disposable saves and
profiles under `balance/reports/`.
