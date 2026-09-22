// FOLIO PROBE — THE FOLIO (ui/folio.ts) pinned headlessly against the pure
// core the panels drive, plus a text census of the panels that enroll in it.
//
// The failure classes this rig pins:
//   A. THE SOLO INVARIANT — one open leaf: drawn, its own book, no strip
//      warranted; a closed leaf never binds; a bound leaf never re-binds.
//   B. THE MASTER LAW — a second leaf arrives BEHIND (shelved, fresh); the
//      front holds; tab order is binding order.
//   C. THE FRONT SWAP — front(id) draws exactly one leaf, refreshes it and
//      sheds its fresh mark; order never reshuffles.
//   D. THE PROMOTION — closing the front promotes the last-looked-at leaf
//      (history), else tab order; the closed leaf stands alone again; a book
//      of one wears no strip; a book of none dissolves.
//   E. THE OWNER WALL — same bay, different owners: separate books, both drawn.
//   F. THE BAY LAW + THE MEASURED LAW — different bays stand apart unless
//      their drawn rects overlap by ≥ overlapFrac of the smaller; the pure
//      overlap read; no rect, no measured bind.
//   G. THE COMPANION LAW — companions (either side declaring) never bind; a
//      plain newcomer takes the first book holding none of its companions.
//   H. THE FRONT ARRIVAL — arrive:'front' takes the front; the master is
//      shelved, not closed, and promotes back.
//   I. THE STANDING LAW — a disengaged front yields to the newcomer; an
//      engaged or unread front holds.
//   J. THE NEARER LAW — a same-arrival tie fronts the nearer station; outside
//      the window, or without ranges on both sides, the master holds.
//   K. THE SELF-HEAL — a leaf opened without adopt() binds on sync(); a leaf
//      closed by ANY path drops on sync(), stands alone again (present(true))
//      and the front promotes; sync is idempotent.
//   L. THE CYCLE — Tab order walks binding order and wraps both ways.
//   M. THE CLOSE-ALL — every leaf of a book closes through its own path.
//   N. THE DIALS — FOLIO_CFG stays sane; a doubled enrollment throws.
//   O. THE ENROLLMENT CENSUS — ui/panels.ts enrolls exactly the thirteen (+ the two tree leaves, 2026-09-04)
//      dwell dialogs, each show path adopts, none of the six former hideAll()
//      swaps survives, the couch cascade closes the seat's front leaf first,
//      and main.ts drives the per-frame sync + the Esc hook.
//   P. THE SUITE (core) — an anchor's front summons the standing members
//      behind it in row order, quiet (never fresh, never the front, whatever
//      law would front a stranger); a member that does not stand waits for
//      its next front; a dismissed member stays dismissed while the anchor
//      stands; the anchor's close takes its summoned members through their
//      own close paths and never a member opened by its own dwell; an anchor
//      arriving behind summons nothing until fronted; a member show path
//      without adopt() is bound by the summons; closeAll counts the cascade.
//   Q. THE SUITE REACH (the real engine, in town) — the bench and the stone
//      STAND for an account that owns them; at Brandt's roof neither is near
//      yet both are within reach and both are summoned; an unowned stone is
//      neither summoned nor reachable (genuinely unlocked or nothing); at the
//      bench nothing is summoned and the stone is out of reach; nowhere is
//      nothing; the action gates (craftSocket, craftAffix, the break lane,
//      rerollAffix) read THE REACH LAW while the dwell + hint stay physical.
//   R. THE PRIMACY LAW (2026-09-16, her ask) — a station arriving under a
//      page front takes it (the page shelved, not closed, not fresh) and
//      promotes back on the station's close; a page the self-heal binds (the
//      bag's remembered drawer) lands BEHIND an engaged station whatever its
//      own arrive; THE CALL'S WORD (adopt(id,'front'|'behind')) is absolute
//      either way; a modal holds against a station and fronts over one;
//      equals keep the master / front-arrival laws; the ladder decides
//      across kinds even when the front is disengaged; an unnamed kind is a
//      page; the ladder is data (a custom rung outranks the shipped three, a
//      kind it does not name is refused at enrollment); summons stay quiet
//      whatever the ladder; the shipped ladder ranks page < station < modal.
//   S. THE DEPARTURE LAW (2026-09-16, her ask) — a station the player walked
//      out of reach of closes on the sync through its own close, the page it
//      fronted over promotes back and the departed leaf stands alone; a leaf
//      with neither read never departs; reach overrides engaged for the
//      departure while the standing law still reads engaged; a summoned
//      member reaches through its anchor and the anchor's departure takes
//      it; the dial off lingers as before; the close only asks (a refusing
//      close is asked again); an open unbound departed leaf binds and departs
//      in one sync; a departed solo leaf dissolves its book; among stations
//      only the departed one goes and the front promotes by history.
//   O11–O14 extend the census: every dwell dialog is a STATION, the picker
//      and the calling MODALS, the trees and drawers PAGES; the crafting
//      members carry stationReach as their reach; the harbor board, the
//      muster horn and the parley engage on the menu bar's own reads; the
//      four press paths ASK (folioAsk) and no station's show path does.
//
//   npx tsx balance/probe_folio.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FolioCore, FOLIO_CFG, rectOverlapFrac,
  type FolioArrive, type FolioLeafSpec, type FolioRect, type FolioTuning,
} from '../src/ui/folio';
import { bootSimEngine, classById } from '../src/sim/arena';
import { resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { FEATURE, makeAccount } from '../src/meta/account';
import { START_ZONE } from '../src/data/zones';
import { townStationFeatures } from '../src/data/townBuild';
import { SUITES } from '../src/data/suites';
import { VENDORS } from '../src/data/vendors';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// --- the fake-leaf harness --------------------------------------------------

interface Fake {
  id: string;
  open: boolean;
  /** The last present() the folio issued (null = never presented). */
  drawn: boolean | null;
  refreshes: number;
  closes: number;
  rect: FolioRect | null;
  engaged: boolean;
  /** The reach read's answer while one is declared (THE DEPARTURE LAW). */
  reach: boolean;
  range: number | null;
  spec: FolioLeafSpec;
}
interface FakeOpts {
  bay?: string; owner?: string; arrive?: FolioArrive; companions?: string[];
  binding?: 'active';
  rect?: FolioRect | null; engaged?: boolean; range?: number | null;
  /** THE PRIMACY LAW's rung (absent = the folio's default, a page). */
  kind?: string;
  /** Declare a reach read (absent = the folio falls back to engaged). */
  reach?: boolean;
}

function fake(core: FolioCore, id: string, o: FakeOpts = {}): Fake {
  const f = {
    id, open: false, drawn: null, refreshes: 0, closes: 0,
    rect: o.rect ?? null, engaged: o.engaged ?? true, reach: o.reach ?? true, range: o.range ?? null,
  } as Fake;
  const spec: FolioLeafSpec = {
    id,
    title: () => id.toUpperCase(),
    isOpen: () => f.open,
    close: () => { f.closes++; f.open = false; },
    present: (front) => { f.drawn = front; },
    bay: () => o.bay ?? 'centre',
    owner: () => o.owner ?? 'p0',
    rect: () => f.rect,
    range: () => f.range,
    refresh: () => { f.refreshes++; },
  };
  if (o.engaged !== undefined) spec.engaged = () => f.engaged;
  if (o.reach !== undefined) spec.reach = () => f.reach;
  if (o.kind !== undefined) spec.kind = o.kind;
  if (o.arrive) spec.arrive = o.arrive;
  if (o.binding) spec.binding = o.binding;
  if (o.companions) spec.companions = o.companions;
  f.spec = spec;
  core.enroll(spec);
  return f;
}
/** A show path: the leaf's own flag flips, then adopt (as every panel does);
 *  `ask` is THE CALL'S WORD a press path passes. */
function show(core: FolioCore, f: Fake, ask?: FolioArrive): string { f.open = true; return core.adopt(f.id, ask); }
function rig(cfg?: FolioTuning): { core: FolioCore; at: (t: number) => void } {
  let t = 0;
  return { core: new FolioCore(() => t, cfg), at: (v) => { t = v; } };
}
const R = (left: number, top: number, width: number, height: number): FolioRect => ({ left, top, width, height });
const ids = (core: FolioCore, id: string): string => core.bookFor(id)?.tabs.map(t => t.id).join(',') ?? '';

// --- A. THE SOLO INVARIANT --------------------------------------------------
console.log('A. THE SOLO INVARIANT');
{
  const { core } = rig();
  const a = fake(core, 'a');
  check('A1 a lone open leaf makes its own book', show(core, a) === 'solo');
  check('A2 the leaf is drawn', a.drawn === true);
  check('A3 one book, one tab, no strip warranted',
    core.views().length === 1 && core.views()[0]!.tabs.length === 1 && !core.anyBook());
  const z = fake(core, 'z');
  check('A4 adopt of a CLOSED leaf is a noop', core.adopt(z.id) === 'noop' && core.views().length === 1 && z.drawn === null);
  check('A5 a second adopt of a bound leaf is a noop', core.adopt('a') === 'noop' && ids(core, 'a') === 'a');
  check('A6 the master is not refreshed by its own binding', a.refreshes === 0);
}

// --- B. THE MASTER LAW ------------------------------------------------------
console.log('B. THE MASTER LAW');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b');
  show(core, a);
  const r = show(core, b);
  const v = core.bookFor('b')!;
  check('B1 the newcomer arrives behind', r === 'behind');
  check('B2 the front holds', v.front === 'a' && a.drawn === true);
  check('B3 the newcomer is shelved and fresh', b.drawn === false && v.tabs.find(t => t.id === 'b')!.fresh);
  check('B4 tab order = binding order', ids(core, 'a') === 'a,b');
  check('B5 the strip is warranted at two', core.anyBook());
  check('B6 the master was not refreshed by the binding', a.refreshes === 0);
  check('B7 one book holds both', core.views().length === 1 && core.bookKeyOf('a') === core.bookKeyOf('b'));
}

// --- C. THE FRONT SWAP ------------------------------------------------------
console.log('C. THE FRONT SWAP');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a); show(core, b); show(core, c);
  check('C1 front(b) draws b alone', core.front('b') && b.drawn === true && a.drawn === false && c.drawn === false);
  check('C2 the fronted leaf refreshed once and shed fresh',
    b.refreshes === 1 && !core.bookFor('b')!.tabs.find(t => t.id === 'b')!.fresh);
  check('C3 order unchanged by activation', ids(core, 'b') === 'a,b,c');
  check('C4 front of an unbound id is false', !core.front('nope'));
  check('C5 c stays fresh until looked at', core.bookFor('c')!.tabs.find(t => t.id === 'c')!.fresh);
  check('C6 front of the front is a no-op draw', core.front('b') && b.refreshes === 1 && b.drawn === true);
}

// --- D. THE PROMOTION -------------------------------------------------------
console.log('D. THE PROMOTION');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a); show(core, b); show(core, c);
  core.front('c'); core.front('b');
  check('D1 closeFront closes the front through its own close', core.closeFront() && b.closes === 1 && !b.open);
  check('D2 the last-looked-at leaf (c) promotes, not tab order (a)',
    core.bookFor('c')!.front === 'c' && c.drawn === true && a.drawn === false);
  check('D3 the closed leaf stands alone again (present true)', b.drawn === true);
  check('D4 the promoted leaf refreshed', c.refreshes === 2);
  check('D5 closing the front again promotes by order', core.closeFront() && core.bookFor('a')!.front === 'a' && a.drawn === true);
  check('D6 a book of one wears no strip', !core.anyBook() && core.views()[0]!.tabs.length === 1);
  check('D7 the last close dissolves the book', core.closeFront() && core.views().length === 0 && core.bookKeyOf('a') === null);
  check('D8 closeFront with nothing open is false', !core.closeFront());
}

// --- E. THE OWNER WALL ------------------------------------------------------
console.log('E. THE OWNER WALL');
{
  const { core } = rig();
  const a = fake(core, 'a', { owner: 'p0' }), g = fake(core, 'g', { owner: 'p1' });
  show(core, a);
  check('E1 a guest leaf of the same bay makes its own book', show(core, g) === 'solo' && core.views().length === 2);
  check('E2 both drawn', a.drawn === true && g.drawn === true);
  check('E3 closeFront by owner picks the guest book', core.closeFront(l => l.owner() === 'p1') && !g.open && a.open);
  check('E4 closeFront by an owner with no book is false', !core.closeFront(l => l.owner() === 'p9'));
}

// --- F. THE BAY LAW + THE MEASURED LAW --------------------------------------
console.log('F. THE BAY LAW + THE MEASURED LAW');
{
  const { core } = rig();
  const a = fake(core, 'a', { bay: 'centre', rect: R(500, 100, 400, 600) });
  const l = fake(core, 'l', { bay: 'left', rect: R(10, 100, 300, 600) });
  const m = fake(core, 'm', { bay: 'right', rect: R(700, 100, 400, 600) });  // 200/400 = 50% over a
  const n = fake(core, 'n', { bay: 'right', rect: R(1200, 100, 400, 600) }); // clear of a
  show(core, a);
  check('F1 a different bay with a disjoint rect stands apart', show(core, l) === 'solo' && l.drawn === true);
  check('F2 a different bay whose rect overlaps the front binds (THE MEASURED LAW)',
    show(core, m) === 'behind' && core.bookKeyOf('m') === core.bookKeyOf('a'));
  check('F3 a disjoint rect stands apart even beside a bound kin of its bay',
    show(core, n) === 'solo' && core.views().length === 3);

  const frac = FOLIO_CFG.overlapFrac;
  const { core: c2 } = rig();
  const p = fake(c2, 'p', { bay: 'centre', rect: R(0, 0, 100, 100) });
  const q = fake(c2, 'q', { bay: 'left', rect: R(100 - frac * 50, 0, 100, 100) });  // half the fraction
  const s = fake(c2, 's', { bay: 'right', rect: R(100 - frac * 100, 0, 100, 100) }); // exactly the fraction
  show(c2, p);
  check('F4 below the fraction stands apart', show(c2, q) === 'solo');
  check('F5 at the fraction binds', show(c2, s) === 'behind' && c2.bookKeyOf('s') === c2.bookKeyOf('p'));
  check('F6 rectOverlapFrac: same → 1, disjoint → 0, half → 0.5, empty → 0',
    rectOverlapFrac(R(0, 0, 10, 10), R(0, 0, 10, 10)) === 1
    && rectOverlapFrac(R(0, 0, 10, 10), R(20, 0, 10, 10)) === 0
    && Math.abs(rectOverlapFrac(R(0, 0, 10, 10), R(5, 0, 10, 10)) - 0.5) < 1e-9
    && rectOverlapFrac(R(0, 0, 0, 10), R(0, 0, 10, 10)) === 0);
  check('F7 the smaller rect is the denominator', Math.abs(rectOverlapFrac(R(0, 0, 10, 10), R(0, 0, 100, 100)) - 1) < 1e-9);
  const { core: c3 } = rig();
  const x = fake(c3, 'x', { bay: 'centre', rect: R(0, 0, 100, 100) });
  const y = fake(c3, 'y', { bay: 'left' });
  show(c3, x);
  check('F8 without a rect the measured law cannot bind', show(c3, y) === 'solo' && c3.views().length === 2);
}

// --- G. THE COMPANION LAW ---------------------------------------------------
console.log('G. THE COMPANION LAW');
{
  const { core } = rig();
  const a = fake(core, 'a');
  const c = fake(core, 'c', { companions: ['a'] });
  const d = fake(core, 'd');
  const e = fake(core, 'e', { companions: ['d'] });
  show(core, a);
  check('G1 a companion declared by the newcomer stands apart, both drawn',
    show(core, c) === 'solo' && c.drawn === true && a.drawn === true);
  check('G2 a plain leaf binds into the first standing book holding none of its companions',
    show(core, d) === 'behind' && core.bookKeyOf('d') === core.bookKeyOf('a'));
  check('G3 a newcomer steers past the book that holds its companion',
    show(core, e) === 'behind' && core.bookKeyOf('e') === core.bookKeyOf('c'));
  const { core: c2 } = rig();
  const bench = fake(c2, 'bench', { companions: ['bag'] });
  const bag = fake(c2, 'bag');
  show(c2, bench);
  check('G4 a companion declared by the STANDING leaf stands apart too', show(c2, bag) === 'solo' && bag.drawn === true);
}

// --- H. THE FRONT ARRIVAL ---------------------------------------------------
console.log('H. THE FRONT ARRIVAL');
{
  const { core } = rig();
  const a = fake(core, 'a'), v = fake(core, 'v', { arrive: 'front' });
  show(core, a);
  check('H1 an arrive:front leaf takes the front', show(core, v) === 'front' && v.drawn === true && a.drawn === false);
  check('H2 the master is shelved, not closed', a.open && a.closes === 0);
  check('H3 nothing fresh — the newcomer was looked at', core.bookFor('v')!.tabs.every(t => !t.fresh));
  check('H4 closing it promotes the master back',
    core.closeFront() && !v.open && a.drawn === true && core.bookFor('a')!.front === 'a');
}

// --- I. THE STANDING LAW ----------------------------------------------------
console.log('I. THE STANDING LAW');
{
  const { core } = rig();
  const a = fake(core, 'a', { engaged: true }), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a);
  check('I1 an engaged front holds', show(core, b) === 'behind');
  a.engaged = false;
  check('I2 a disengaged front yields to the newcomer', show(core, c) === 'front' && c.drawn === true && a.drawn === false);
  check('I3 the yielded master is a shelved tab, not closed', a.open && ids(core, 'a') === 'a,b,c');
  const { core: c2 } = rig();
  const x = fake(c2, 'x'), y = fake(c2, 'y');
  show(c2, x);
  check('I4 a front without an engaged read is assumed engaged', show(c2, y) === 'behind');
}

// --- J. THE NEARER LAW ------------------------------------------------------
console.log('J. THE NEARER LAW');
{
  const { core, at } = rig();
  const far = fake(core, 'far', { range: 100 }), near = fake(core, 'near', { range: 40 });
  at(0); show(core, far);
  at(FOLIO_CFG.arrivalSec * 0.5);
  check('J1 a same-arrival newcomer that stands NEARER fronts', show(core, near) === 'front' && near.drawn === true && far.drawn === false);
  const { core: c2, at: at2 } = rig();
  const n2 = fake(c2, 'n2', { range: 40 }), f2 = fake(c2, 'f2', { range: 100 });
  at2(0); show(c2, n2); at2(FOLIO_CFG.arrivalSec * 0.5);
  check('J2 a same-arrival newcomer that stands FARTHER goes behind', show(c2, f2) === 'behind');
  const { core: c3, at: at3 } = rig();
  const f3 = fake(c3, 'f3', { range: 100 }), n3 = fake(c3, 'n3', { range: 40 });
  at3(0); show(c3, f3); at3(FOLIO_CFG.arrivalSec + 1);
  check('J3 outside the arrival window the master holds', show(c3, n3) === 'behind');
  const { core: c4 } = rig();
  const u = fake(c4, 'u'), w = fake(c4, 'w', { range: 1 });
  show(c4, u);
  check('J4 without a range on both sides the master holds', show(c4, w) === 'behind');
}

// --- K. THE SELF-HEAL -------------------------------------------------------
console.log('K. THE SELF-HEAL');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a);
  b.open = true; // a show path that forgot adopt()
  core.sync();
  check('K1 an open, unbound leaf binds on sync (behind the master)',
    core.bookKeyOf('b') === core.bookKeyOf('a') && b.drawn === false && a.drawn === true);
  show(core, c); core.front('c');
  c.open = false; // closed by a path the folio never saw (hideAll, a proximity guard)
  core.sync();
  check('K2 a closed, bound leaf drops on sync and stands alone', core.bookKeyOf('c') === null && c.drawn === true);
  check('K3 the front promotes to the last-looked-at (a)', core.bookFor('a')!.front === 'a' && a.drawn === true && b.drawn === false);
  a.open = false; b.open = false;
  core.sync();
  check('K4 everything closed → no books, every leaf standing alone', core.views().length === 0 && a.drawn === true && b.drawn === true);
  core.sync();
  check('K5 sync is idempotent', core.views().length === 0);
}

// --- L. THE CYCLE -----------------------------------------------------------
console.log('L. THE CYCLE');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a); show(core, b); show(core, c);
  check('L1 cycle +1 walks a→b', core.cycle(1) === 'b' && b.drawn === true && a.drawn === false);
  check('L2 +1 again → c', core.cycle(1) === 'c');
  check('L3 +1 wraps → a', core.cycle(1) === 'a');
  check('L4 −1 wraps → c', core.cycle(-1) === 'c');
  check('L5 order never reshuffled', ids(core, 'a') === 'a,b,c');
  const { core: c2 } = rig();
  const s = fake(c2, 's'); show(c2, s);
  check('L6 a book of one does not cycle', c2.cycle(1) === null);
  check('L7 cycle honors the owner pred', core.cycle(1, l => l.owner() === 'p9') === null);
}

// --- M. THE CLOSE-ALL -------------------------------------------------------
console.log('M. THE CLOSE-ALL');
{
  const { core } = rig();
  const a = fake(core, 'a'), b = fake(core, 'b'), c = fake(core, 'c');
  show(core, a); show(core, b); show(core, c);
  const key = core.bookKeyOf('a')!;
  check('M1 closeAll closes every leaf through its own path',
    core.closeAll(key) === 3 && a.closes === 1 && b.closes === 1 && c.closes === 1);
  check('M2 the book is gone and every leaf stands alone', core.views().length === 0 && [a, b, c].every(f => f.drawn === true));
  check('M3 closeAll of an unknown key is 0', core.closeAll('nope') === 0);
  // M4 the law's limit, pinned: closeAll can only ASK. A leaf whose close
  // path leaves it open (a key toggle that FRONTS a shelved leaf) stays
  // bound and the count says so — which is why the panels' leaves must
  // close for real (O9 pins the passive tree's).
  const rig4 = rig();
  const d = fake(rig4.core, 'd'), e = fake(rig4.core, 'e', { arrive: 'front' });
  show(rig4.core, d); show(rig4.core, e); // e in front, d shelved
  d.spec.close = () => { d.closes++; if (rig4.core.bookFor('d')?.front !== 'd') rig4.core.front('d'); else d.open = false; };
  const key4 = rig4.core.bookKeyOf('d')!;
  check('M4 a close that fronts instead of closing leaves that leaf bound — the shape of the bug',
    rig4.core.closeAll(key4) === 1 && d.open && !e.open && ids(rig4.core, 'd') === 'd');
}

// --- N. THE DIALS -----------------------------------------------------------
console.log('N. THE DIALS');
{
  const c = FOLIO_CFG;
  check('N1 overlapFrac in (0,1]', c.overlapFrac > 0 && c.overlapFrac <= 1);
  check('N2 arrivalSec ≥ 0', c.arrivalSec >= 0);
  check('N3 strip.minLeaves ≥ 2 (a lone leaf wears no chrome)', c.strip.minLeaves >= 2);
  check('N4 strip.freshPulses ≥ 1', c.strip.freshPulses >= 1);
  check('N5 a doubled enrollment throws', (() => {
    const { core } = rig();
    fake(core, 'a');
    try { fake(core, 'a'); return false; } catch { return true; }
  })());
  check('N6 the primacy ladder ships page < station < modal',
    c.primacy['page']! < c.primacy['station']! && c.primacy['station']! < c.primacy['modal']!);
  check('N7 departureCloses ships ON (a walked-away tab goes down)', c.departureCloses === true);
}

// --- O. THE ENROLLMENT CENSUS -----------------------------------------------
console.log('O. THE ENROLLMENT CENSUS');
{
  const panels = readFileSync(resolve(process.cwd(), 'src/ui/panels.ts'), 'utf8');
  const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');
  const EXPECTED = ['vendor', 'salvage', 'font', 'recall', 'oracle', 'bestiary', 'borough',
    'bounties', 'caravan', 'sail', 'hold', 'merc', 'vocation'];
  // THE TREES (2026-09-04, her ask): the passive tree enrolls as a static
  // player-panel leaf and every skill-tree pane enrolls at its minting
  // (`skilltree:<skillId>`) — explicit asks that arrive in front, no
  // engagement read, no range — so any of them up at once tab into one book.
  const TREES = ['skills', 'passives'];
  const ALL = [...EXPECTED, ...TREES];
  const enrolled = [...panels.matchAll(/this\.folioLeaf\('([a-z_]+)'/g)].map(m => m[1]!);
  // A show path binds through the bare adopt (a station's offer) or through
  // folioAsk (a page's press — THE CALL'S WORD); either is an adopt.
  const adopted = [...panels.matchAll(/this\.folio(?:\.adopt|Ask)\('([a-z_]+)'\)/g)].map(m => m[1]!);
  check('O1 the thirteen dwell dialogs + Skills and Passives enroll, once each',
    ALL.every(id => enrolled.filter(x => x === id).length === 1) && enrolled.length === ALL.length,
    `enrolled: ${enrolled.join(',')}`);
  check('O2 every enrolled leaf adopts at its show path',
    ALL.every(id => adopted.includes(id)), `adopted: ${adopted.join(',')}`);
  check('O2c every skill-tree pane enrolls + asks per skill at its minting (one leaf per open tree)',
    panels.includes('this.folioLeaf(`skilltree:${skillId}`') && panels.includes('this.folioAsk(`skilltree:${skillId}`)'));
  // THE CONTAINER DRAWERS (ui/containerPane.ts): every registered side
  // board's drawer enrolls + adopts per container at its minting through the
  // panel's host seams — the ribbon beside SKILLS / PASSIVES joins the same
  // inventory-side book (the skill-tree pane's shape, derived per def).
  check('O2d every container drawer enrolls + asks per container at its minting (one leaf per open drawer)',
    panels.includes('this.folioLeaf(`container:${id}`') && panels.includes('this.folioAsk(`container:${id}`)'));
  check('O2b the trees and the drawers arrive IN FRONT (explicit asks) with no station reads',
    ["'passives'", '`skilltree:${skillId}`', '`container:${id}`'].every(id => {
      const i = panels.indexOf(`this.folioLeaf(${id}`);
      const row = i < 0 ? '' : panels.slice(i, panels.indexOf('}));', i));
      return row.includes("arrive: 'front'") && !row.includes('engaged:') && !row.includes('range:');
    }));
  const showBody = (name: string): string => {
    const i = panels.indexOf(`\n  ${name}(`);
    const j = panels.indexOf('\n  }\n', i);
    return i < 0 || j < 0 ? '' : panels.slice(i, j);
  };
  const shows = ['showCaravan', 'showSail', 'showBounties', 'showHold', 'showMercMenu', 'showVocationMenu'];
  check('O3 every former swap show path still exists', shows.every(n => showBody(n).length > 0));
  const swaps = shows.filter(n => /this\.hideAll\(\)/.test(showBody(n)));
  check('O4 no dwell dialog swaps the screen with hideAll() at its show', swaps.length === 0, swaps.join(','));
  check('O5 the shelved class is the adapter\'s presence lever', panels.includes('FOLIO_SHELVED_CLASS'));
  check('O6 main.ts drives the per-frame sync and the Esc hook',
    main.includes('ui.folioSync()') && main.includes('ui.folioCloseFront()'));
  check('O7 the couch cascade closes the seat\'s front leaf first',
    /escCascadeFor\([\s\S]{0,900}?folio\.closeFront/.test(panels));
  check('O8 hideAll and hideAllFor settle the books at once', (panels.match(/this\.folio\.sync\(\)/g) ?? []).length >= 2);
  // THE TRUE CLOSE (2026-09-11, her report): a leaf whose close FRONTS
  // instead of closing (toggleTree's shelved press — the D-pad law) broke
  // close-all: Passives shelved behind Skills came forward, Skills closed,
  // and the book stood on Passives. The leaf's close and every seat-scoped
  // clear go through closeTree; only the key/menu toggle and the couch
  // contention path may call toggleTree.
  const passivesRow = (() => {
    const i = panels.indexOf("this.folioLeaf('passives'");
    return i < 0 ? '' : panels.slice(i, panels.indexOf('}));', i));
  })();
  check('O9 the passives leaf closes through closeTree, never the fronting toggle',
    passivesRow.includes('this.closeTree()') && !passivesRow.includes('toggleTree'));
  check('O9b hideAllFor and the close glyph take the tree down through closeTree',
    /hideAllFor\([\s\S]{0,700}?this\.closeTree\(\)/.test(panels) && panels.includes('[this.passiveTree, () => this.closeTree()]'));
  // THE BAG GOES FIRST (2026-09-11, her report): the sweep's close-all
  // reached the Skills drawer through closeBuildPanel, which FORGETS it
  // (buildFlapOpen = false) — a bag swept shut by Esc reopened without
  // Skills, while the bag key's own close (toggleInventory → syncBuildPanels)
  // hides the drawer and keeps its memory. The sweep now takes an unkept
  // bag through toggleInventory and syncs the folio BEFORE any book closes,
  // so the 'skills' leaf drops as already closed; a KEPT bag still closes
  // its drawer by the book on that press (the player's "all but the bag").
  const sweepBody = showBody('escapeSweep');
  const sweepAt = (s: string): number => sweepBody.indexOf(s);
  const bagAt = sweepAt("!keep.includes('inventory')"), toggleAt = sweepAt('this.toggleInventory(seatId)');
  const syncAt = sweepAt('this.folio.sync()'), booksAt = sweepAt('this.folio.closeAll(');
  check('O10 the sweep takes an unkept bag through its own toggle and syncs before any book closes',
    bagAt >= 0 && toggleAt > bagAt && syncAt > toggleAt && booksAt > syncAt,
    `bag@${bagAt} toggle@${toggleAt} sync@${syncAt} books@${booksAt}`);
  check('O10b the sweep never forgets the drawer itself (no closeBuildPanel in its body)',
    sweepBody.length > 0 && !sweepBody.includes('closeBuildPanel()'));
  // THE PRIMACY LAW + THE DEPARTURE LAW (2026-09-16, her ask): every row
  // declares its kind — the world's dwell dialogs are STATIONS (they front
  // over the bag's always-available pages on arrival and go down when the
  // hero walks out of reach), the picker and the calling are MODALS, the
  // trees and the drawers PAGES; the crafting members carry THE REACH LAW
  // as their reach read; the three host-global stations engage on the same
  // near-reads THE MENU BAR seals their pages on; and the four PRESS paths
  // ask through folioAsk while no station's show path does (a dwell is an
  // offer, ranked by the ladder, never an ask).
  const rowOf = (id: string): string => {
    const i = panels.indexOf(`this.folioLeaf(${id}`);
    return i < 0 ? '' : panels.slice(i, panels.indexOf('}));', i));
  };
  const MODALS = ['recall', 'vocation'];
  const STATIONS = EXPECTED.filter(id => !MODALS.includes(id));
  check('O11 every dwell dialog is a STATION and the picker + the calling are MODALS',
    STATIONS.every(id => rowOf(`'${id}'`).includes("kind: 'station'"))
    && MODALS.every(id => rowOf(`'${id}'`).includes("kind: 'modal'") && rowOf(`'${id}'`).includes("arrive: 'front'")),
    STATIONS.filter(id => !rowOf(`'${id}'`).includes("kind: 'station'")).join(','));
  check('O11b Skills, Passives, every skill-tree pane and every container drawer are PAGES',
    ["'skills'", "'passives'", '`skilltree:${skillId}`', '`container:${id}`'].every(id => rowOf(id).includes("kind: 'page'")));
  check('O12 the crafting members carry THE REACH LAW (stationReach) as their reach read',
    ['salvage', 'oracle'].every(id => rowOf(`'${id}'`).includes(`reach: () => w().stationReach('${id}'`)));
  check('O13 the harbor board, the muster horn and the parley engage on the menu bar\'s own near-reads',
    rowOf("'sail'").includes('nearHarborBoard(') && rowOf("'hold'").includes('nearMusterHorn(')
    && rowOf("'merc'").includes('mercParley(') && rowOf("'merc'").includes('.near'));
  const asks = ["this.folioAsk('skills')", "this.folioAsk('passives')", 'this.folioAsk(`skilltree:${skillId}`)', 'this.folioAsk(`container:${id}`)'];
  check('O14 the four press paths ASK (folioAsk = adopt with the front word) and no station show path does',
    asks.every(a => panels.includes(a)) && panels.includes("this.folio.adopt(id, 'front')")
    && EXPECTED.every(id => !panels.includes(`this.folioAsk('${id}')`)));
  const folio = readFileSync(resolve(process.cwd(), 'src/ui/folio.ts'), 'utf8');
  check('O14b the self-heal binds with no word (a remembered drawer obeys the ladder)',
    folio.includes('if (open && !bound) this.adopt(id);'));
}

// --- P. THE SUITE (core) ----------------------------------------------------
console.log('P. THE SUITE (core)');
{
  const { core } = rig();
  const anchor = fake(core, 'vendor');
  const bench = fake(core, 'salvage'), stone = fake(core, 'oracle'), font = fake(core, 'font');
  let standsFont = false;
  const opens: Record<string, number> = { salvage: 0, oracle: 0, font: 0 };
  const member = (f: Fake, stands: () => boolean) => ({ id: f.id, stands, open: () => { opens[f.id] = (opens[f.id] ?? 0) + 1; show(core, f); } });
  core.enrollSuite({ anchor: 'vendor', members: [member(bench, () => true), member(stone, () => true), member(font, () => standsFont)] });
  check('P1 the anchor opening alone summons the standing members behind it, in row order',
    show(core, anchor) === 'solo' && ids(core, 'vendor') === 'vendor,salvage,oracle'
    && anchor.drawn === true && bench.drawn === false && stone.drawn === false);
  check('P2 summoned tabs arrive quiet (never fresh) and are marked summoned',
    core.bookFor('vendor')!.tabs.every(t => !t.fresh) && core.isSummoned('salvage') && core.isSummoned('oracle') && !core.isSummoned('vendor'));
  check('P3 a member that does not stand is not summoned', !font.open && opens.font === 0);
  check('P4 fronting the anchor again re-opens nothing already open', core.front('vendor') && opens.salvage === 1 && opens.oracle === 1);
  standsFont = true;
  check('P5 a member that now stands is summoned on the next front, behind',
    core.front('vendor') && font.open && opens.font === 1 && core.isSummoned('font') && font.drawn === false && anchor.drawn === true);
  core.front('salvage');
  check('P6 a summoned tab can be fronted like any tab', bench.drawn === true && anchor.drawn === false);
  check('P7 closing it (Esc) dismisses it and promotes the anchor',
    core.closeFront() && !bench.open && core.bookFor('vendor')!.front === 'vendor' && anchor.drawn === true && !core.isSummoned('salvage'));
  check('P8 a dismissed member is not re-summoned while the anchor stands', core.front('vendor') && !bench.open && opens.salvage === 1);
  check('P9 closing the anchor closes its summoned members through their own close paths',
    core.closeFront() && !anchor.open && !stone.open && !font.open && stone.closes === 1 && font.closes === 1 && core.views().length === 0);
  check('P10 with the anchor gone the dismissal is forgotten: a fresh anchor summons the bench again',
    show(core, anchor) === 'solo' && bench.open && opens.salvage === 2 && ids(core, 'vendor') === 'vendor,salvage,oracle,font');

  const { core: c2 } = rig();
  const a2 = fake(c2, 'vendor'), b2 = fake(c2, 'salvage');
  c2.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(c2, b2) }] });
  show(c2, b2); show(c2, a2); c2.front('vendor');
  check('P11 a member opened by its own dwell is never summoned and survives the anchor\'s close',
    !c2.isSummoned('salvage') && c2.closeFront() && !a2.open && b2.open && b2.drawn === true);

  const { core: c3 } = rig();
  const master = fake(c3, 'bounties'), a3 = fake(c3, 'vendor'), b3 = fake(c3, 'salvage');
  c3.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(c3, b3) }] });
  show(c3, master);
  check('P12 an anchor arriving behind another master summons nothing', show(c3, a3) === 'behind' && !b3.open);
  check('P13 fronting it summons its members behind it',
    c3.front('vendor') && b3.open && b3.drawn === false && a3.drawn === true && c3.isSummoned('salvage'));

  const { core: c4 } = rig();
  const a4 = fake(c4, 'vendor', { engaged: false }), b4 = fake(c4, 'salvage', { arrive: 'front', range: 1 });
  c4.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(c4, b4) }] });
  show(c4, a4);
  check('P14 a summoned member never takes the front, whatever its own arrival or the anchor\'s engagement',
    a4.drawn === true && b4.drawn === false && c4.bookFor('vendor')!.front === 'vendor');

  const { core: c5 } = rig();
  const a5 = fake(c5, 'vendor'), b5 = fake(c5, 'salvage');
  c5.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => { b5.open = true; } }] });
  show(c5, a5);
  check('P15 a member whose show path forgot adopt() is bound by the summons itself, quiet',
    c5.bookKeyOf('salvage') === c5.bookKeyOf('vendor') && b5.drawn === false && c5.isSummoned('salvage')
    && c5.bookFor('salvage')!.tabs.every(t => !t.fresh));
  const key5 = c5.bookKeyOf('vendor')!;
  check('P16 closeAll counts every leaf the anchor\'s cascade took', c5.closeAll(key5) === 2 && c5.views().length === 0);
  check('P17 a suite naming an unenrolled leaf is refused', (() => {
    const { core: c6 } = rig();
    fake(c6, 'vendor');
    try { c6.enrollSuite({ anchor: 'vendor', members: [{ id: 'nope', stands: () => true, open: () => {} }] }); return false; } catch { return true; }
  })());
  check('P18 the summoning latch never leaks: a later stranger still arrives fresh', (() => {
    const { core: c7 } = rig();
    const a7 = fake(c7, 'vendor'), b7 = fake(c7, 'salvage'), s7 = fake(c7, 'bounties');
    c7.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(c7, b7) }] });
    show(c7, a7);
    return show(c7, s7) === 'behind' && c7.bookFor('bounties')!.tabs.find(t => t.id === 'bounties')!.fresh === true;
  })());
}

// --- Q. THE SUITE REACH (the real engine, in town) ---------------------------
console.log('Q. THE SUITE REACH (the real engine, in town)');
{
  bootSimEngine();
  resetActorIdCounter();
  const acc = makeAccount();
  for (const f of townStationFeatures()) acc.features.add(f);
  for (const c of CLASSES) acc.unlockedClasses.add(c.id);
  const manifest = buildManifest(acc, 0x0f01);
  for (const p of manifest.packages) p.enabled = false;
  const w = new World(acc, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  w.loadZone(START_ZONE);
  const seat = w.localSeat;
  const at = (x: number, y: number): void => { seat.actor.pos.x = x; seat.actor.pos.y = y; };
  const seek = (c: { x: number; y: number }, ok: () => boolean): boolean => {
    for (let r = 0; r <= 140; r += 10) {
      for (let a = 0; a < 360; a += 30) {
        at(Math.round(c.x + r * Math.cos(a * Math.PI / 180)), Math.round(c.y + r * Math.sin(a * Math.PI / 180)));
        if (ok()) return true;
      }
    }
    return false;
  };
  check('Q0 the suite data: the crafting row anchors on a real counter and names known stations',
    SUITES.some(s => s.id === 'crafting' && s.anchor === 'vendor' && s.members.length >= 2
      && (s.counters ?? []).every(c => VENDORS.some(v => v.id === c))));
  check('Q1 the bench and the stone STAND in town for an account that owns them', w.stationStands('salvage') && w.stationStands('oracle'));
  check('Q2 a spot under Brandt\'s roof exists', seek(w.townSeat('blacksmith'), () => w.nearSmith(seat)));
  check('Q3 at the counter: not at the bench, not at the stone, yet both within reach (THE REACH LAW)',
    !w.nearSalvage(seat) && !w.nearOracle(seat) && w.stationReach('salvage', seat) && w.stationReach('oracle', seat));
  check('Q4 the summons at the counter name both, in row order', w.suiteSummons(seat).join(',') === 'salvage,oracle');
  acc.features.delete(FEATURE.ORACLE_STONE);
  check('Q5 an unowned stone is neither summoned nor within reach — genuinely unlocked or nothing',
    w.suiteSummons(seat).join(',') === 'salvage' && !w.stationReach('oracle', seat) && !w.stationStands('oracle'));
  acc.features.add(FEATURE.ORACLE_STONE);
  check('Q6 at the bench: the bench is near, the counter is not, nothing is summoned, the stone is out of reach',
    seek(w.townSeat('salvage'), () => w.nearSalvage(seat) && !w.nearAnyVendor(seat))
    && w.stationReach('salvage', seat) && w.suiteSummons(seat).length === 0 && !w.stationReach('oracle', seat));
  at(-5000, -5000);
  check('Q7 away from everything nothing is within reach', !w.stationReach('salvage', seat) && !w.stationReach('oracle', seat) && w.suiteSummons(seat).length === 0);
  const src = readFileSync(resolve(process.cwd(), 'src/engine/world.ts'), 'utf8').replace(/\r\n/g, '\n');
  const gate = (fn: string, id: string): boolean =>
    new RegExp(`\\n  ${fn}\\([^)]*\\)[^{]*\\{\\n    if \\(!this\\.stationReach\\('${id}', seat\\)\\) return;`).test(src);
  check('Q8 the action gates read THE REACH LAW: craftSocket, craftAffix, rerollAffix',
    gate('craftSocket', 'salvage') && gate('craftAffix', 'salvage') && gate('rerollAffix', 'oracle'));
  // (THE ANCHORED DWELL, 2026-09-06: the hint seats on the bench's anchor
  //  piece but still GATES on the physical near-read — the reach law never
  //  opens the prompt.)
  check('Q9 the break lane reads it too, while the dwell and the hint stay physical',
    src.includes("if (want === 'break') return this.stationReach('salvage', seat) ? 'break' : null;")
    && src.includes('this.nearSalvage(s));') && src.includes('if (!a || !this.nearSalvage()) return null;'));
}

// --- R. THE PRIMACY LAW -----------------------------------------------------
console.log('R. THE PRIMACY LAW');
{
  // The scene she named: the bag's Skills drawer stands (the build lives
  // there, open at all times); the hero walks to the bench.
  const { core } = rig();
  const skills = fake(core, 'skills', { kind: 'page', arrive: 'front' });
  const bench = fake(core, 'salvage', { kind: 'station', engaged: true });
  show(core, skills);
  check('R1 a station arriving under a page front takes it — the world\'s offer outranks the always-available page',
    show(core, bench) === 'front' && bench.drawn === true && skills.drawn === false && core.bookFor('salvage')!.front === 'salvage');
  check('R2 the page is shelved, never closed, and not marked fresh (it was the front, not a newcomer)',
    skills.open && skills.closes === 0 && core.bookFor('skills')!.tabs.every(t => !t.fresh));
  check('R3 closing the station promotes the page back', core.closeFront() && !bench.open && skills.drawn === true && core.bookFor('skills')!.front === 'skills');

  // The other order: the counter opens the bag, whose remembered drawer the
  // self-heal binds a frame later — with no word, so the ladder decides.
  const r2 = rig();
  const vendor = fake(r2.core, 'vendor', { kind: 'station', engaged: true });
  const drawer = fake(r2.core, 'skills', { kind: 'page', arrive: 'front' });
  show(r2.core, vendor);
  drawer.open = true; r2.core.sync();
  check('R4 a page the self-heal binds (the bag\'s remembered drawer) lands BEHIND an engaged station, its own arrive notwithstanding',
    r2.core.bookKeyOf('skills') === r2.core.bookKeyOf('vendor') && drawer.drawn === false && vendor.drawn === true
    && r2.core.bookFor('skills')!.tabs.find(t => t.id === 'skills')!.fresh);
  check('R5 an explicit ask fronts the page over the station (THE CALL\'S WORD is absolute)', (() => {
    const r = rig();
    const v = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    const s = fake(r.core, 'skills', { kind: 'page' });
    show(r.core, v);
    return show(r.core, s, 'front') === 'front' && s.drawn === true && v.drawn === false && v.open && v.closes === 0;
  })());
  check('R6 an explicit behind lands a station behind a page', (() => {
    const r = rig();
    const s = fake(r.core, 'skills', { kind: 'page' });
    const v = fake(r.core, 'vendor', { kind: 'station' });
    show(r.core, s);
    return show(r.core, v, 'behind') === 'behind' && s.drawn === true && v.drawn === false;
  })());
  check('R7 a modal holds: a station arriving under a modal front lands behind', (() => {
    const r = rig();
    const calling = fake(r.core, 'vocation', { kind: 'modal', arrive: 'front' });
    const v = fake(r.core, 'vendor', { kind: 'station' });
    show(r.core, calling);
    return show(r.core, v) === 'behind' && calling.drawn === true && v.drawn === false;
  })());
  check('R8 a modal arriving under a station fronts by the ladder alone (no arrive needed)', (() => {
    const r = rig();
    const v = fake(r.core, 'vendor', { kind: 'station' });
    const picker = fake(r.core, 'recall', { kind: 'modal' });
    show(r.core, v);
    return show(r.core, picker) === 'front' && picker.drawn === true;
  })());
  check('R9 equals keep the master law: a station under an engaged station lands behind, fresh', (() => {
    const r = rig();
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    const b = fake(r.core, 'font', { kind: 'station' });
    show(r.core, a);
    return show(r.core, b) === 'behind' && r.core.bookFor('font')!.tabs.find(t => t.id === 'font')!.fresh;
  })());
  check('R10 equals keep the front arrival: a page with arrive:front fronts over a page (the tree over the drawer)', (() => {
    const r = rig();
    const a = fake(r.core, 'skills', { kind: 'page', arrive: 'front' });
    const b = fake(r.core, 'passives', { kind: 'page', arrive: 'front' });
    show(r.core, a);
    return show(r.core, b) === 'front' && b.drawn === true && a.drawn === false;
  })());
  check('R11 the ladder decides across kinds: a page never fronts over a DISENGAGED station on its own', (() => {
    const r = rig();
    const v = fake(r.core, 'vendor', { kind: 'station', engaged: false });
    const s = fake(r.core, 'skills', { kind: 'page', arrive: 'front' });
    show(r.core, v);
    return show(r.core, s) === 'behind' && v.drawn === true;
  })());
  check('R12 an unnamed kind is a page — the least claim — and a station fronts over it', (() => {
    const r = rig();
    const a = fake(r.core, 'a');
    const v = fake(r.core, 'vendor', { kind: 'station' });
    show(r.core, a);
    return r.core.primacyOf(a.spec) === FOLIO_CFG.primacy['page'] && show(r.core, v) === 'front';
  })());
  check('R13 the ladder is data: a custom rung outranks the shipped three', (() => {
    const cfg: FolioTuning = { ...FOLIO_CFG, primacy: { ...FOLIO_CFG.primacy, alarm: 9 } };
    const r = rig(cfg);
    const m = fake(r.core, 'vocation', { kind: 'modal', arrive: 'front' });
    const x = fake(r.core, 'alarm', { kind: 'alarm' });
    show(r.core, m);
    return show(r.core, x) === 'front' && r.core.primacyOf(x.spec) === 9;
  })());
  check('R14 a kind the ladder does not name is refused at enrollment', (() => {
    const r = rig();
    try { fake(r.core, 'x', { kind: 'nope' }); return false; } catch { return true; }
  })());
  check('R15 summons stay quiet whatever the ladder: an anchor fronting over a page summons its members behind, never fresh', (() => {
    const r = rig();
    const s = fake(r.core, 'skills', { kind: 'page', arrive: 'front' });
    const v = fake(r.core, 'vendor', { kind: 'station' });
    const b = fake(r.core, 'salvage', { kind: 'station' });
    r.core.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(r.core, b) }] });
    show(r.core, s); show(r.core, v);
    return ids(r.core, 'vendor') === 'skills,vendor,salvage' && v.drawn === true && b.drawn === false && s.drawn === false
      && r.core.isSummoned('salvage') && r.core.bookFor('salvage')!.tabs.every(t => !t.fresh);
  })());
  check('R16 the ladder never reaches across owners or companions (a guest\'s station makes its own book)', (() => {
    const r = rig();
    const s = fake(r.core, 'skills', { kind: 'page' });
    const g = fake(r.core, 'vendor', { kind: 'station', owner: 'p1' });
    show(r.core, s);
    return show(r.core, g) === 'solo' && s.drawn === true && g.drawn === true;
  })());
}

// --- S. THE DEPARTURE LAW ---------------------------------------------------
console.log('S. THE DEPARTURE LAW');
{
  const { core } = rig();
  const skills = fake(core, 'skills', { kind: 'page', arrive: 'front' });
  const bench = fake(core, 'salvage', { kind: 'station', engaged: true });
  show(core, skills); show(core, bench); // the bench fronts (R1)
  core.sync();
  check('S1 an engaged station survives the sync', bench.open && bench.closes === 0 && core.bookFor('salvage')!.front === 'salvage');
  bench.engaged = false;
  core.sync();
  check('S2 a station the player walked out of reach of closes on the sync through its own close',
    !bench.open && bench.closes === 1 && core.bookKeyOf('salvage') === null);
  check('S3 the page it fronted over promotes back, drawn', skills.open && skills.drawn === true && core.bookFor('skills')!.front === 'skills');
  check('S4 the departed leaf stands alone again (present true)', bench.drawn === true);
  check('S4b a departed solo-front leaves a book of one — no strip', core.views().length === 1 && !core.anyBook());
  check('S5 a leaf with neither read never departs (the calling, the picker, the arming panel)', (() => {
    const r = rig();
    const a = fake(r.core, 'borough', { kind: 'station' });
    const m = fake(r.core, 'vocation', { kind: 'modal', arrive: 'front' });
    show(r.core, a); show(r.core, m); r.core.sync(); r.core.sync();
    return a.open && a.closes === 0 && m.open && m.closes === 0;
  })());
  check('S6 reach overrides engaged for the departure (the summoned member\'s shape) while the standing law still reads engaged', (() => {
    const r = rig();
    const bench6 = fake(r.core, 'salvage', { kind: 'station', engaged: false, reach: true });
    const font = fake(r.core, 'font', { kind: 'station' });
    show(r.core, bench6); r.core.sync();
    const stayed = bench6.open && bench6.closes === 0;
    const fronted = show(r.core, font) === 'front'; // THE STANDING LAW: a disengaged front yields
    bench6.reach = false; r.core.sync();
    return stayed && fronted && !bench6.open && bench6.closes === 1 && r.core.bookFor('font')!.front === 'font';
  })());
  check('S7 a summoned member reaches through its anchor: at the counter it stands, and the anchor\'s departure takes it', (() => {
    const r = rig();
    const anchor = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    const member = fake(r.core, 'salvage', { kind: 'station', engaged: false }); // not at the bench, no reach row
    r.core.enrollSuite({ anchor: 'vendor', members: [{ id: 'salvage', stands: () => true, open: () => show(r.core, member) }] });
    show(r.core, anchor); r.core.sync();
    const stood = member.open && member.closes === 0 && r.core.isSummoned('salvage');
    anchor.engaged = false; r.core.sync();
    return stood && !anchor.open && anchor.closes === 1 && !member.open && member.closes === 1 && r.core.views().length === 0;
  })());
  check('S8 the dial off: a walked-away leaf lingers as a tab, as before', (() => {
    const r = rig({ ...FOLIO_CFG, departureCloses: false });
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    show(r.core, a); a.engaged = false; r.core.sync();
    return a.open && a.closes === 0 && r.core.bookKeyOf('vendor') !== null;
  })());
  check('S9 the close only asks: a refusing close keeps the leaf bound and is asked again next sync', (() => {
    const r = rig();
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    show(r.core, a);
    a.spec.close = () => { a.closes++; }; // refuses to close
    a.engaged = false; r.core.sync(); r.core.sync();
    return a.open && a.closes === 2 && r.core.bookKeyOf('vendor') !== null;
  })());
  check('S10 an open, unbound, already-departed leaf binds and departs in one sync', (() => {
    const r = rig();
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: false });
    a.open = true; r.core.sync();
    return !a.open && a.closes === 1 && r.core.views().length === 0;
  })());
  check('S11 a departed solo leaf dissolves its book', (() => {
    const r = rig();
    const a = fake(r.core, 'font', { kind: 'station', engaged: true });
    show(r.core, a); a.engaged = false; r.core.sync();
    return !a.open && r.core.views().length === 0 && a.drawn === true;
  })());
  check('S12 among a book of stations only the departed one goes and the front promotes by history', (() => {
    const r = rig();
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    const b = fake(r.core, 'font', { kind: 'station', engaged: true });
    const c = fake(r.core, 'bounties', { kind: 'station', engaged: true });
    show(r.core, a); show(r.core, b); show(r.core, c);
    r.core.front('font'); r.core.front('vendor');
    a.engaged = false; r.core.sync();
    return !a.open && b.open && c.open && b.drawn === true && c.drawn === false && r.core.bookFor('font')!.front === 'font'
      && ids(r.core, 'font') === 'font,bounties';
  })());
  check('S13 sync stays idempotent under the law (a settled screen closes nothing)', (() => {
    const r = rig();
    const a = fake(r.core, 'vendor', { kind: 'station', engaged: true });
    const s = fake(r.core, 'skills', { kind: 'page' });
    show(r.core, s); show(r.core, a);
    r.core.sync(); r.core.sync(); r.core.sync();
    return a.open && s.open && a.closes === 0 && s.closes === 0 && r.core.bookFor('vendor')!.front === 'vendor';
  })());
}

// Quiet offers join the active book even when its drawer lives in another bay.
console.log('T. QUIET ACTIVE-BOOK OFFERS');
{
  const { core, at } = rig();
  const old = fake(core, 'old', { bay: 'centre' });
  const page = fake(core, 'skills', { bay: 'build', kind: 'page' });
  const board = fake(core, 'bounties', { kind: 'station', binding: 'active', arrive: 'behind', engaged: true });
  show(core, old); at(1); show(core, page); at(2);
  check('T1 quiet station joins the active drawer across bays without taking focus',
    show(core, board) === 'behind' && ids(core, 'skills') === 'skills,bounties'
    && page.drawn === true && board.drawn === false && core.bookFor('old')!.tabs.length === 1);
  board.engaged = false; core.sync();
  check('T2 departure removes a hidden offer without closing or refreshing the active page',
    !board.open && board.closes === 1 && page.open && page.drawn === true && page.refreshes === 0);
  board.engaged = true; show(core, board); core.front('bounties'); board.engaged = false; core.sync();
  check('T3 departure from the selected board restores the previous page',
    !board.open && core.bookFor('skills')!.front === 'skills' && page.drawn === true);
  board.engaged = true;
  check('T4 explicit front ask overrides the quiet arrival policy', show(core, board, 'front') === 'front');
}
{
  const { core } = rig();
  const guest = fake(core, 'guest', { owner: 'p1' });
  const board = fake(core, 'bounties', { owner: 'p0', kind: 'station', binding: 'active', arrive: 'behind' });
  show(core, guest);
  check('T5 no same-owner book means an immediate solo board, never a guest tab',
    show(core, board) === 'solo' && guest.drawn === true && board.drawn === true && core.views().length === 2);
}
{
  const { core, at } = rig();
  const a = fake(core, 'a', { bay: 'a' }), b = fake(core, 'b', { bay: 'b' });
  const board = fake(core, 'bounties', { binding: 'active', arrive: 'behind', kind: 'station' });
  show(core, a); at(1); show(core, b); at(2); core.front('a');
  board.open = true; core.sync();
  check('T6 self-healing arrival respects quiet policy and the last selected book',
    ids(core, 'a') === 'a,bounties' && a.drawn === true && board.drawn === false);
}
{
  const { core } = rig();
  const companion = fake(core, 'companion', { companions: ['bounties'] });
  const board = fake(core, 'bounties', { binding: 'active', arrive: 'behind' });
  show(core, companion);
  check('T7 active binding preserves companion exclusions', show(core, board) === 'solo' && core.views().length === 2);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
