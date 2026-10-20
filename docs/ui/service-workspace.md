# NPC and player panels

NPC panels and player panels are independent groups. Geometry never changes membership, including on narrow screens or at enlarged UI scales.

- Inventory keeps its existing anchor, width and height rules. Skills, Passives, Character, skill trees and containers (including Reliquary) remain its ribbons and pages. Opening an NPC cannot change the selected player page.
- Conversation and services use the NPC group. Brandt's Shop choice opens the existing full vendor panel, with its stock, buying, selling, holds, tooltips and summoned services. Conversation remains an NPC tab.
- After Shop is first opened, a later Brandt visit opens the vendor directly. The presentation preference is saved per character and NPC definition in settings. Quest changes never front a conversation over shopping.
- Mireille admits conversation with any local player page already open. Her available topics follow the player's live quest state; actions use the existing engine gates.
- Conversation is centered at the bottom, 18 scaled pixels above the HUD, in an 880 × 280 panel that fits the viewport and scrolls its content. Shops and other services retain their top-left berth and original content. Player pages keep their own layout. At smaller sizes the groups may overlap; they never merge, squeeze Inventory, or automatically close player pages. Existing movable-layout controls and closing a group remain available.
- Conversation uses the same 28-pixel close corner as Inventory and Settings. X/Esc dismisses the visit until departure; completing a response still permits newly relevant content. One conversation dwell admits an NPC visit (including a remembered shop). The later vendor-service timer cannot reopen a closed shop. Counters without conversations and couch guests retain their existing service dwell.
- A moved NPC book carries its seat across its own tabs. Layout settings are never rewritten merely because a conversation starts. Guest panel ownership remains separate.

`FolioLeafSpec.group` is the hard boundary across bay, measured-overlap and active-book binding. `InventoryPages` enrolls player leaves. `UI.folioLeaf` assigns NPC membership to station leaves and separate membership to modal decisions. `ServiceWorkspace` only places NPC station surfaces; it does not touch Inventory. `dialogueLayout.ts` seats the conversation itself.

`UI.dialogueContext` admits local Inventory pages, including Character. Pause, genuine modal choices, maps and another player's active panels suspend the reader. Departure, death, world replacement and zone changes retire it through the normal session/reach paths.

Verification: `npm run check`, the folio/speech/speechgrammar probes, and simulation smoke. Build and run `balance/dialogue-services-ui.cjs`, `balance/dialogue-ui.cjs` and `balance/inventory-pages-ui.cjs`. The clients accept `HOLLOW_WAKE_QA_DIST` for an isolated build. The service course checks the first Shop choice, a real purchase, return visits, suite tabs, 32 combinations of NPC/ribbon/arrival/window scale, unchanged player rectangles, Character, pause and departure. Reports and screenshots stay in ignored `balance/reports/`.
