# Inventory pages

Inventory is the parent of Skills, Passives, each learned skill's tree, and every
owned container board (including Reliquary). These are pages of one development
workspace, with Inventory's ribbons and the folio's tabs selecting the page.

## Interaction contract

| Action | Result |
| --- | --- |
| Open Inventory | Restore this player's retained pages and last selected page. |
| Request a page through a key, menu or ribbon | Open Inventory for the requesting player and select that page, overriding the remembered selection. |
| Repeat a toggle for the currently selected page | Close Inventory and hide all its pages. |
| Follow a skill-tree handle or Font's refund action | Show the requested page; repeated show requests keep it open. |
| Close Inventory by key, glyph, full sweep or owner clear | Hide every page and dismiss transient controls, retaining page membership and selection for the session. |
| Close a page's glyph or folio tab | Dismiss that page and forget its membership; the folio promotes a remaining page. |

Esc keeps the configured policy: **step** dismisses the front folio leaf first;
**sweep** closes Inventory with its pages; **keep inventory** dismisses pages and
other windows first, leaving Inventory until the next press. Station interactions
retain their existing reach, priority and close semantics. Restoring Inventory
does not displace an active station; explicitly requesting a page does.

## Ownership and extension

| Concern | Authority |
| --- | --- |
| Parent visibility and owner | `UI.openInventory` / `closeInventory` in `src/ui/panels.ts` |
| Page registration, per-owner membership, availability, effective visibility, entry/exit | `InventoryPages` in `src/ui/inventoryPages.ts` |
| Selected tab, history, station priority and overlap | `FolioCore`, shared `selectionGroup: 'inventory'` |
| Page rendering and interaction | Registered `InventoryPage` callbacks; `ContainerPane` for container content |
| Page placement and viewport bounds | `UI.syncInventoryPages`, `buildPanelSeat`, `BUILD_PANEL_CFG` |
| Input and menu discovery | `ActionId`/bindings in `meta/settings.ts`, dispatch in `main.ts`, `data/menu.ts` and UI menu verbs |
| Saved movable window positions | `panelmove.ts`; pages follow Inventory instead of storing positions |

To add a development page, register its stable id, root, title, preferred width,
availability predicate and renderer. Optional `enter(owner, fresh)` initializes
the owner's view; `leave()` clears transient interactions. Call `request(id,
owner)` from direct toggles or use mode `show` for navigation within the workspace.
Registration supplies the folio adapter and the `inventory-page` layout class.
Keep page-specific zoom, filters and selection data on the renderer; do not add
independent visibility flags, seat lists or close sweeps. Availability must read
the requested owner and the engine's actual access rules.

InventoryPages retains membership separately for each player during the UI
session. Folio stores the selected page separately for each player. Neither is
saved to the character. Switching owners hides the old owner's book before
assigning shared DOM roots. Missing or sealed pages cannot become visible or
block another player's controls.

Pages use Inventory's measured edge beyond the ribbon rail, flip for the left
couch seat, and fit the available viewport above the drawn HUD cluster. The
shared height limit reserves the hotbar and resource orbs at the current UI
scale, with `BUILD_PANEL_CFG.edge` as clearance; long skill lists scroll inside
the page below the fixed skill rack. Moving Inventory moves all its pages.
On narrow screens pages clamp into the screen. The rail drops count badges, then
wallet chips if needed to fit Inventory's height. Widths and margins remain
configurable in `BUILD_PANEL_CFG`. Historical saved page positions are ignored.
During a station visit, [Service workspace](service-workspace.md) supplies the
reading-band ceiling and compact tab visibility. Inventory's anchor and this
registry's page lifecycle remain unchanged.

## Verification

Run `npm run check`, `npm run probe -- folio` and `npm run probe -- menubar`.
After `npm run build`, hidden Electron harnesses under `balance/` use isolated
saves and profiles: `inventory-pages-ui.cjs` covers routing, owner isolation,
extensibility and layout; `inventory-tabs-ui.cjs` covers selection across close
paths; `build-panels-ui.cjs` covers content, drag/drop and tooltips;
`font-passives-ui.cjs` and `bounty-focus-ui.cjs` cover station interactions.
