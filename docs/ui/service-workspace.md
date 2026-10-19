# Services, Inventory and dialogue

This is the placement and coexistence contract for station visits. Inventory's
page lifecycle remains in [Inventory pages](inventory-pages.md); station
membership, reach, selection and suites remain in [Folio](folio.md); reading,
dwell and dialogue completion remain in [Dialogue](dialogue.md).

## Stable homes

- Inventory keeps its normal CSS anchor or the player's saved movable position.
  Opening a service never writes its left, top, width, transform or saved seat.
- Station leaves share a top-left service berth. Their content scrolls downward;
  changing stock, service tabs, dialogue text or the bag cannot recenter them.
  Explicit movable positions continue through `panelmove.ts` and Folio handoffs.
- The reader has one fixed reading band at each viewport and UI scale. Its
  height does not depend on the current line or whether a vendor is visible.
- Inventory and every selected secondary panel use the same reading-band ceiling,
  including when Inventory opens alone or before approaching an NPC. Finishing,
  dismissing or suspending speech cannot move transaction targets. A quiet offer
  does not take selection from the page being used.
- All Inventory pages and stations share the owner's folio book regardless of
  opening order or their initial measured position. A station fronts over a
  restored page; an explicit page request still selects that page. Pages follow
  Inventory's position and retain their normal widths where space permits.
- When both surfaces cannot fit at readable widths, **Services / Inventory**
  tabs select which is drawn (the first tab names a selected Inventory page).
  They never close either surface, forget a page,
  disarm selling, or dismiss dialogue. Inventory retains its own position when
  selected. Selecting a folio page reveals the panel side; a newly fronted
  service also reveals that side. Inventory's shortcut reveals its hidden tab before acting as a
  close on a subsequent press.

Custom positions are player choices; automatic placement does not override them
to remove overlaps. The workspace never writes to saved layout settings. Guest
inventory ownership is respected; a local counter cannot capture a guest's bag.

## Authority and extension

`UI.folioLeaf` enrolls a surface's identity, kind and lifecycle once. The same
rows feed Folio, `UI.dialogueContext`, and `ServiceWorkspace`; there is no
separate service open flag or station-name list. A new `kind: 'station'` leaf
inherits placement and coexistence automatically.

`src/ui/serviceWorkspace.ts` owns station placement, the common Inventory/page
scroll bounds and compact tab presentation. `SERVICE_WORKSPACE_CFG` owns width, minimum readable
width, edge and gap. `src/ui/dialogueLayout.ts` computes the shared reading band
and seats only the reader; its tunables live in `DIALOGUE_CFG`.

`UI.dialogueContext` handles admission/suspension, not placement. A service visit
counts while its station is open, including compact Inventory selection and
shelved stations. Inventory and its pages permit local speech even without a
station panel or an existing conversation. Other personal screens and modal
interfaces still suspend the reader; returning resumes the same page if the speaker remains in focus.
Presentation changes do not finish conversations or restart dwell clocks.

## Verification

Run `npm run check`, `npm run probe -- speech`, `npm run probe -- folio` and
`npm run sim -- run --suite smoke`. Build, then run the hidden isolated clients:

- `balance/dialogue-services-ui.cjs`: actual counter arrival, unchanged Inventory
  anchor, shared station berth, reader continuity, buying, dismissal, pause,
  narrow tab switching, enlarged UI, controller input and departure.
  `HOLLOW_WAKE_QA_PARITY=after` exercises both arrival orders for remembered/open
  Skills, Passives and Reliquary, real tab clicks, invariant bag bounds and
  Mireille admission with an open bag at desktop, compact and 175% scale.
- `balance/dialogue-ui.cjs`: reader lifecycle, focus, content and controls.
- `balance/inventory-pages-ui.cjs` and `balance/build-panels-ui.cjs`: character
  pages, owners, scrolling, manipulation and HUD clearance.

Do not restore conversation-triggered panel packing or duplicate station lists
in dialogue. Geometry changes belong to the workspace; admission changes belong
to the context; completed dialogue belongs to the reader session.
