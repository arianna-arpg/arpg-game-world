# The Menu Bar — the game's pages as one indexed, dynamic menu

A Menu button stands on the HUD's edge. Pressing it (or its bind, Tab by
default; L3 on a pad) fans a **tray** of every page the game has — the
inventory, the character sheet, the passive tree, the world map, the journal,
and every station dialog the account has unlocked — each an iconed,
selectable row with its live key beside it. Pages that do not exist for this
account yet are **not there**. Pages that exist but cannot be used from
where the hero stands are **greyed**, unselectable, with the reason in their
tooltip. A page with something unspent on it wears a **pip**; a live lesson
makes the next click **glow**; both roll up onto the button while the tray
is closed, so the button itself is the tell. The old "3 passive points —
press P" line is gone: the tree's tile carries the count.

Files: `src/engine/menu.ts` (the fold), `src/data/menu.ts` (the pages),
`src/ui/menubar.ts` (the DOM), `src/ui/icons.ts` (the glyphs),
`src/ui/menuConfig.ts` (the dials). Probe `balance/probe_menubar.ts`.

## The shape

A page is a `MenuEntryDef` row:

| field | what it is |
| --- | --- |
| `id`, `label`, `icon`, `group`, `order` | identity, its glyph (`MENU_ICONS`), its tray group, its place |
| `verb` | the host-verb id — `ui/panels.ts menuVerbs()` maps it to `open(seatId)` + `isOpen()` |
| `bind` / `keyLabel` | the action whose live bind the row prints (never a baked key), or a fixed label (`ESC`) |
| `gate` | **THE EXISTENCE LAW** — gatework avenues (`meta/gates.ts GateRow`, any-of or all-of) over the *merged* ledger (account + this run). Unmet = hidden |
| `usable(reads)` | **THE REACH LAW** — usable right now for this seat? False = sealed. Absent = always |
| `sealedHint` | the tooltip's one plain line while sealed (a string, or a function of the reads) |
| `blurb` | the tooltip's description while open |

The engine folds every row into one of three states — `hidden`, `sealed`,
`open` — once per beat (`menuFold`), and the bar draws that fold. Nothing in
the bar names a page; nothing in the data names the bar.

**Attention** is a second registry (`MenuAttentionSource`): a `pip` source
counts something unspent on a page (passive points → the tree; banked
ability points → the inventory, whose SKILLS flap spends them); a `lesson`
source names the page a live tutorial wants opened next (Mireille's flasks
waiting unseated in the pack → the inventory). The fold quiets a lesson the
moment its page is open — the glow moves on to the flap and the rack seats
(`ui/panels.ts`), then dies with the lesson (the engine's own latched,
lived-aware `World.mireilleGiftLesson` read).

## The laws

- **The existence law** — a page the account has not unlocked is absent, not
  greyed. A run-ledger stamp counts the moment it lands (`World.ledgerView`):
  find your first port and the Harbor page appears mid-run.
- **The reach law** — a station page seals on the *same* near-read its dwell
  fires on (`nearSalvage`, `nearTracker`, `nearBountyBoard`, the new
  `nearHarborBoard` / `nearMusterHorn`, and `mercParley` — whose refusal
  *words* are the page's sealed hint). The menu can never open what the
  station would refuse; the vendor page even reads the counter's stock.
- **The button is the tell** — tray closed, the button wears the summed pips
  as a badge and any lesson as the tutorial glow. Tray or dock showing, each
  tile wears its own and the button keeps only the badge.
- **Drawn == seated** — the `bar` anchor seats the button off the HUD cluster
  rect the renderer *published* this frame (`renderer.hudClusterRects`).
- **The layout wins** — with Movable UI on (Options → Layout) the bar drags
  by its grip like any panel and remembers its seat; a dragged seat is never
  overwritten by the anchor until the layout is reset.
- **Rebuild only on change** — the tray's DOM rebuilds when its signature
  (ids · states · pips · lessons · bind labels · dock) changes, never on a
  quiet beat, so a press mid-tray is never swallowed.
- **Toggles toggle** — a menu press on an open keyed page closes it (the
  keyed grammar); a station page opens exactly as its dwell would.
- **Esc folds the tray first**, before the folio's front leaf and the panel
  cascade. A press anywhere outside the bar folds it too.

## Options (Options → Menu Bar)

| row | what it does |
| --- | --- |
| Menu Bar Seat | cycles `MENU_ANCHORS`: Bottom Left · Bottom Right · Beside the Bar |
| Page Icons | **THE DOCK** — ON stands every unlocked page as an icon tile beside the button (greyed where unusable); OFF keeps the one button |

Under the couch (`data/couch.ts`) the corner anchors lift `couchLiftPx` so
the button stands clear of the hero's docked life orb; the `bar` anchor
rides the cluster wherever it docks. A couch guest has no bar of their own —
their D-pad binds open panels, and the passive-point line still speaks to
them in their flank block.

## Adding a page

One row in `src/data/menu.ts`. If its verb is new, one row in
`ui/panels.ts menuVerbs()`. If its glyph is new, one row in `ui/icons.ts`
(24×24, strokes of `currentColor`). The probe's census (E1) fails on a verb
with no host row; A4 fails on an icon that does not draw.

## Dials (`MENU_CFG`)

| dial | default | meaning |
| --- | --- | --- |
| `anchorDefault` | `left` | the seat a fresh settings file starts on |
| `dockDefault` | `false` | the dock opt-in's default |
| `syncSec` | 0.2 | fold cadence (a toggle or a page open re-folds at once) |
| `closeOnPick` | true | the tray folds after a row opens its page |
| `pipMax` | 9 | badges print "9+" past this |
| `insetPx` | 16 | corner inset of the left/right anchors |
| `couchLiftPx` | 136 | corner-anchor lift under the couch |
| `barGapPx` | 14 | gap between the mana orb and the `bar`-anchored button |
| `tilePx` / `rowIconPx` | 44 / 22 | the button + dock tile box; the tray row's glyph |

The bar rides the UI-scale dial in `zoom` mode (the marker class,
`ui/uiScale.ts`) and its own `menubar` rung of the stack ladder
(`ui/zorder.ts`): above every panel and the folio strip, under the popups
and the tooltip it serves.
