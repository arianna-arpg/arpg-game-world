# The Folio — overlapping UI surfaces bind into one tabbed book

Station dialogs share the stable berth described in
[Services, Inventory and dialogue](service-workspace.md). Folio owns their tab
membership, selection, priority and reach, and also folds other enrolled
surfaces when their measured bounds overlap. Modal decisions retain their own
authored positions. Inventory keeps its normal or customized home.

The ideal is that no two surfaces ever overlap. The folio is the **fallback
that makes overlap moot** when they do, for any enrolled surface. It is `src/ui/folio.ts`, probed by
`balance/probe_folio.ts`, dialed by `FOLIO_CFG`.

## The shape

A surface enrolls as a **leaf** (`FolioLeafSpec`): a handful of pure reads
and two verbs.

| field | what it is |
| --- | --- |
| `isOpen()` | the panel's **own** open flag — the one truth of "bound" |
| `close()` | the panel's **own** close path (the calling still declines, the counter still sheds its verbs) |
| `present(front)` | draw or shelve — toggles only the `folio-shelved` class; the panel's `hidden` is never touched |
| `bay()` / `owner()` | the declared screen berth (`centre`, or a couch flank `left`/`right`) and the seat that opened it |
| `rect()` | the drawn box while displayed — the measured-overlap read and the strip's seat |
| `engaged()` | does the player still stand at this station? (absent = assumed) |
| `range()` | the seat's distance to the station, for the arrival tie-break |
| `arrive` | Explicit `'behind'` keeps an automatic offer quiet across kinds; `'front'` takes the front among equal kinds. Absent = normal primacy/standing rules. A call's `ask` overrides either. |
| `binding` | `'active'` joins the owner's most recently active book regardless of bay/overlap; absent = normal placement rules. Companion exclusions still apply. |
| `selectionGroup` | Optional selection memory shared by leaves in this group, separately for each owner. Restores the last choice among equal-primacy group mates when a book reforms. |
| `kind` | the leaf's rung on the primacy ladder: `'page'` (an always-available player page — the default), `'station'` (the world's offer: every dwell dialog), `'modal'` (a decision: the calling, the picker); any string the ladder names |
| `reach()` | may the player still WORK this leaf from here? The departure law's read (absent = `engaged()`; absent both = never departs). A suite member declares the reach law here while `engaged` stays physical |
| `companions` | leaves this one may stand beside un-bound (symmetric) |
| `refresh()` | re-render on coming to the front |

The folio keeps **no open flag of its own**. A leaf is bound while its own
flag reads open and drops the moment *any* path closes it — the glyph, Esc,
`hideAll`, a station's proximity guard, a couch cascade. The **self-heal**
sweep (`FolioCore.sync`, once per frame from `main.ts`) reconciles them all,
and binds a leaf whose show path forgot `adopt()`.

Leaves that would share a screen gather into a **book**: one is the
**front** (drawn), the rest are **shelved**, and the book's **thumb index**
(`FolioStrip` — the tab strip) rides the front leaf's *measured* rect, so
the tabs sit on whatever is actually drawn. A book of one leaf wears no
strip; a book of none dissolves.

## The laws

The Bounty Board uses `binding: 'active', arrive: 'behind'`. Incidental dwell
adds an inactive Bounties tab beside the current Skills, Passives or skill
tree page, including drawers docked beside inventory. With no eligible book,
the board opens immediately on its own. Clicking its tab or choosing its menu
entry explicitly fronts it. Other stations retain their existing priority.
The board's existing owner-specific `nearBountyBoard` read closes it on departure,
whether selected or shelved; opening also checks that read to reject stale dwell
requests after movement or zone changes. No new distance threshold is introduced.

Regression coverage: `balance/probe_folio.ts` and, after a build,
`npx electron balance/bounty-focus-ui.cjs` (hidden window, isolated saves).

- **The master law** — the first leaf opened holds the front; a newcomer
  arrives *behind* it as a shelved tab, pulsing fresh until looked at. The
  world's offers never swap the screen out from under the player.
- **The front arrival** — `arrive: 'front'` takes the front on binding: the
  pouch picker the player clicked, the calling's decide-at-leisure freeze.
- **The standing law** — a master holds the front only while the player
  still stands at it. A newcomer binding under a *disengaged* front (the
  station's own near-read says the hero walked off) takes the front. The
  master is shelved, never closed.
- **The nearer law** — two stations whose dwells fire on the same arrival
  (within `arrivalSec` of the front's binding) front the **nearer** one: the
  player walked to Brandt, not to the bench beside him. Without a range on
  both sides the master law stands.
- **The primacy law** (2026-09-16, her ask) — a leaf has a `kind`, ranked
  by `FOLIO_CFG.primacy` (page 0 · station 1 · modal 2). A newcomer of
  *higher* primacy than the front takes it: the bench's dialog fronts over
  the bag's Skills drawer, because the player walked to the bench — the
  drawer stays one tab away and promotes back when the bench closes. A
  newcomer of *lower* primacy lands behind whatever its own `arrive` says:
  the drawer the bag *remembers* (bound by the self-heal) never shoves an
  open counter aside. Equals fall to the master, front-arrival, standing and
  nearer laws above. The ladder is a registry: `enroll` refuses a kind it
  does not name, and a new kind is one row. An explicit `arrive: 'behind'`
  bypasses these automatic fronting rules for a quiet offer.
- **The call's word** — `adopt(id, ask)` lets a show path say how *this*
  arrival lands: `'front'` from a press, a key or a handle (an explicit ask
  is absolute and outranks the ladder — `InventoryPages.request` uses
  this for all development pages), `'behind'` to land quiet. The
  self-heal binds with no word, so a page that merely turned up obeys the
  ladder. Station show paths keep the bare `adopt`: a dwell is an offer.
- **The departure law** (2026-09-16, her ask) — a bound leaf the player can
  no longer reach (`reach()`, else `engaged()`, false on the per-frame
  sync) closes through its own close path: the tab goes down where the
  work would be refused, and the book promotes as for any close. The close
  only asks — a leaf whose close leaves it open stays bound and is asked
  again. A summoned member reaches through its anchor (the summons is the
  anchor's offer), and the anchor's departure takes its members; the
  crafting members also carry `World.stationReach` as their own `reach`, so
  a bench opened by its own dwell still stands when the player steps over
  to the counter that summons it. `FOLIO_CFG.departureCloses` is the dial;
  a leaf with neither read (the calling, the picker, the arming panel)
  never departs.
- **The bay law** — a book gathers *one owner's* leaves of *one bay*. A
  couch guest's flank never binds with the hero's centre.
- **The measured law** — leaves of *different* bays still bind when their
  drawn rects overlap by at least `overlapFrac` of the smaller. Drawn ==
  tested: a future surface that collides on a small screen folds without a
  data edit.
- **The companion law** — declared companions never bind (a bench and the
  bag it works are meant to stand side by side). A newcomer steers past a
  book holding one of its companions to the next book, or opens its own.
- **The promotion** — closing the front promotes the leaf the player last
  looked at (the book's history), else the first in tab order. Tab order is
  binding order and never reshuffles on activation.
- **The solo invariant** — one open leaf keeps its own show/close lifecycle
  and its layout owner's position, without a tab strip.

## Closing, Esc, and the keyboard

- The panel's own ✕ glyph and "step away" buttons keep working: the leaf
  drops on the next sync and the book promotes.
- **Esc** now closes the *front* leaf first (`ui.folioCloseFront()` at the
  head of the dialog step in `main.ts`; the couch cascade does the same for
  its seat in `escCascadeFor`). The fixed close lists stay beneath as the
  belt for anything not enrolled.
- **Tab / Shift+Tab** walk the hero's book while one with two or more
  leaves stands (`bindFolioKeys`); the default focus walk is suppressed
  only then. Clicking a tab fronts it; the strip's ✕ closes every leaf
  through its own close path. The pad pointer clicks tabs like any button.
- Leaf closes dismiss that leaf. Inventory closes retain its page membership
  while hiding the whole group; see [Inventory pages](inventory-pages.md).

## Enrolling a new surface

One row in `UI.enrollFolioLeaves` (`folioLeaf(id, root, title, isOpen,
close, extra)`) and one `this.folio.adopt('<id>')` at the end of its show
path, after the panel is displayed and rendered (so its rect measures).
Give a dwell dialog `kind: 'station'`; give it `engaged` when the station
has a near-read (the same read the menu bar seals its page on — it is also
the departure read), `reach` when its work is allowed from elsewhere too (a
suite member: `World.stationReach`), `range` when it has a town site,
`arrive: 'front'` when the player explicitly asked for it, `kind: 'modal'`
when nothing offered may shove it aside. Development pages instead register
with InventoryPages, which supplies their common folio adapter and explicit
selection behavior. The census probe verifies both enrollment paths.

The bag, character sheet and map have their own homes and are not folio leaves.

### Inventory pages

[Inventory pages](inventory-pages.md) is the lifecycle, selection, layout and
extension contract for Skills, Passives, skill trees and container boards.

`installTooltipHints` in `ui/tooltip.ts` translates native `title` hints to the
shared gold-bordered card, including dynamically rebuilt controls. Rich
`data-tip` content retains its own resolver; a nested control's hint wins over
the parent skill. Hint text is escaped, and native titles are removed so a
second browser tooltip cannot cover the card.

Tooltip detail defaults to **Compact**. Options → Interface → Tooltip detail
can select **Full** for computed skill breakdowns and equipment comparisons.
The choice is saved and read when a card opens; no hover timer expands an
already displayed card. Tooltip width is intrinsic and capped to the scaled
viewport, so following the pointer near an edge does not reflow its text.

Verify with `npm run check`, `npm run probe -- folio`, and, after a production
build, `npx electron balance/build-panels-ui.cjs`. The desktop check uses its
own save/profile folders under ignored `balance/reports/` and checks ribbon
balances, panel bounds, folio switching, tooltip priority, unlearning, and
dragging from the rest of a skill tile, and stable compact/full tooltip sizing
over time and near screen edges.

### Moving panels (ui/panelmove.ts, 2026-09-04)

Independent windows drag by their `h2` (`attachPanelMove` once per root,
delegated — rebuilt templates stay draggable). THE ZOOM LAW converts
screen px to the panel's own px (`.panel` rides CSS zoom); THE KEEP holds
at least `keepPx` of the panel on screen and the ribbon never rises above
the top edge; double-click the ribbon to return to the stylesheet's seat;
the couch dock (a guest's flank) resets it. THE BOOK MOVES AS ONE: a leaf
coming to the front takes the seat the previous front was drawn at (the
stylesheet's, when that front was never moved) — `folioLeaf.present` hands
it over for one microtask — so switching or closing a tab never teleports
the book. The strip re-seats on every move. Inventory pages inherit the
inventory's seat and do not participate in window dragging or seat handoffs.

THE LAYOUT (`Settings.layout`, Options → Interface → Layout): the whole
fabric is an OPT-IN — "Movable UI" is OFF by default (the classic fixed
seats) and gates every drag and every lock glyph. While ON, a settled
drag, a book handoff and a ribbon double-click persist the panel's seat as
viewport fractions of its top-left (keyed by the root's id), a freshly-shown
panel takes its remembered seat through the per-frame sync
(`panelLayoutSync` inside `folioSync`), and each panel wears a 🔓/🔒 glyph
left of its ✕ — a locked panel refuses the drag. OFF returns every shown
panel to its stylesheet seat but keeps the remembered layout for the next
ON; "Reset to default" clears seats and locks and re-homes every root.

## The suite (phase two)

`src/data/suites.ts` declares **suites**: station dialogs that belong
together. A counter's dialog is an **anchor**; when it comes to the front,
the folio **summons** every member station that **stands** in the zone
(raised here and genuinely unlocked, `World.stationStands`) as a quiet tab
behind it. The shipped row is the crafting suite: Brandt's counter gathers
the breaker's bench and the Oracle stone.

- **The reach law** (`World.stationReach`) is the engine half: a member's
  work is allowed from its anchor's counter exactly as at the station
  itself. Every action gate (`craftSocket`, `craftAffix`, the break lane,
  `rerollAffix`) reads the one predicate; the dwell prompts and each
  station's own opening stay physical.
- **Summons arrive quiet** — never fresh, never the front, whatever law
  would front a stranger (the primacy ladder included).
- **Summons stand while the anchor stands** — the departure law reads a
  summoned member's reach through its anchor, and the members' own `reach`
  rows read `World.stationReach`, so the bench's tab is never taken down at
  the counter that summons it.
- **The anchor's close takes its summoned members** through their own close
  paths: one Escape from the counter leaves the workbench. A member the
  player dismissed stays dismissed while the anchor stands; a member opened
  by its own dwell is never the anchor's to close.
- **The bag's verbs follow the front**: sell under the counter, break under
  the bench, a plain bag under the stone (`folioDrawn` gates the lanes).

The world folds counters × members × stands (`World.suiteSummons`); the UI
supplies only a show path per station (`enrollSuite` in `panels.ts`). A new
suite is one row; a new member station is one id plus its `has*`/`near*`
reads in `world.ts`.

## THE ESCAPE POLICY (`ui/escapeConfig.ts`, 2026-09-11)

`Settings.escapeCloses` (Options → Interface → Escape closes) picks a row of
`ESCAPE_MODES`, and the cascade reads it at the press. The modal steps — a
running minigame, the forge trace, the pause menu, the couch join overlay,
the menu tray — always go one at a time; the mode governs what comes after:

| mode | one Esc press… |
| --- | --- |
| `sweep` (default) | clears every book the seat owns through its leaves' own closes, the fixed dialog rows as the belt, then the ordinary panels; a clear screen pauses |
| `sweepKeepBag` | the sweep, sparing the pages in its `keep` list (the bag) until nothing else stands — THE LAST TO GO: the next press closes the bag, the one after pauses |
| `step` | the classic cascade above: the front dialog, then every ordinary panel, then a clear screen pauses |

`UI.escapeSweep(seatId, keep)` is the one sweep both the solo cascade
(`main.ts`) and the couch `escCascadeFor` call; `keep` names hero pages by
their menu-entry ids (`data/menu.ts`), so a mode that spares the map or the
sheet is one row, no code. Probe: `probe_menubar` D6–D8 (registry sanity,
the settings round-trip).

Inventory closes before the book sweep, retaining all its pages for reopening.
A keep-inventory sweep instead dismisses the pages through their folio closes.
See [Inventory pages](inventory-pages.md) for the shared contract. Probe: O10.

## Dials (`FOLIO_CFG`)

| dial | default | meaning |
| --- | --- | --- |
| `overlapFrac` | 0.15 | measured-overlap threshold (intersection ÷ smaller rect) |
| `arrivalSec` | 0.35 | the nearer law's same-arrival window |
| `primacy` | page 0 · station 1 · modal 2 | the primacy law's ladder, keyed by leaf `kind`; a new kind is one row |
| `departureCloses` | true | the departure law: a leaf out of reach closes on the sync (off = it lingers as a shelved tab) |
| `strip.minLeaves` | 2 | a book wears its strip from this many leaves |
| `strip.seamPx` | 1 | how far the strip sinks into the panel's top border |
| `strip.closeAll` | true | the ✕ at the strip's end |
| `strip.freshPulses` | 6 | the fresh tab's glow pulses before it rests |

The strip rides the UI-scale dial in `'scale'` mode (`uiScale.ts`) and sits
on its own `folio` rung of the stack ladder (`zorder.ts`): above every
panel, under the popups it serves.
