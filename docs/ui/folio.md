# The Folio — overlapping UI surfaces bind into one tabbed book

Every dwell dialog in the game — the vendor counter, the salvage bench, the
font, the oracle, the bestiary, the bounty board, the caravan, the harbor,
the hold, the captain's parley, the calling — shares **one centred berth**
in `index.html`. A hero standing where two stations' reaches cross (Brandt's
counter and the bench beside it in the smith's yard) opened **both**, one
painted over the other, and Escape closed whichever the fixed cascade named
first rather than the one on screen. Six of the dialogs papered over this by
calling `hideAll()` when they opened — a **swap** that threw away whatever
the player was reading.

The ideal is that no two surfaces ever overlap. The folio is the **fallback
that makes overlap moot** when they do — for the thirteen dialogs today and
for any surface enrolled tomorrow. It is `src/ui/folio.ts`, probed by
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
| `arrive` | `'behind'` (a dwell's offer, the default) or `'front'` (an explicit ask, a modal) |
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
- **The solo invariant** — one open leaf is byte-identical to before: its
  own show, its own close, its own position, no chrome.

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

## Enrolling a new surface

One row in `UI.enrollFolioLeaves` (`folioLeaf(id, root, title, isOpen,
close, extra)`) and one `this.folio.adopt('<id>')` at the end of its show
path, after the panel is displayed and rendered (so its rect measures).
Give it `engaged` when the station has a near-read, `range` when it has a
town site, `arrive: 'front'` when the player explicitly asked for it. The
probe's census (`O`) pins that every enrolled leaf adopts and that no dialog
swaps the screen with `hideAll()` at its show.

The keyed panels — the bag, the sheet, the tree, the map — are **not**
enrolled: they have their own homes (left, right, centred-full) and the
bench's "the bag is the menu" pairing is a designed side-by-side. Enrolling
them is one row each plus a `companions` list on the station leaves, once
the Escape grammar for keyed panels ("clear them all") has been ruled.

## Dials (`FOLIO_CFG`)

| dial | default | meaning |
| --- | --- | --- |
| `overlapFrac` | 0.15 | measured-overlap threshold (intersection ÷ smaller rect) |
| `arrivalSec` | 0.35 | the nearer law's same-arrival window |
| `strip.minLeaves` | 2 | a book wears its strip from this many leaves |
| `strip.seamPx` | 1 | how far the strip sinks into the panel's top border |
| `strip.closeAll` | true | the ✕ at the strip's end |
| `strip.freshPulses` | 6 | the fresh tab's glow pulses before it rests |

The strip rides the UI-scale dial in `'scale'` mode (`uiScale.ts`) and sits
on its own `folio` rung of the stack ladder (`zorder.ts`): above every
panel, under the popups it serves.
