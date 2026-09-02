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
//   O. THE ENROLLMENT CENSUS — ui/panels.ts enrolls exactly the thirteen
//      dwell dialogs, each show path adopts, none of the six former hideAll()
//      swaps survives, the couch cascade closes the seat's front leaf first,
//      and main.ts drives the per-frame sync + the Esc hook.
//
//   npx tsx balance/probe_folio.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FolioCore, FOLIO_CFG, rectOverlapFrac,
  type FolioArrive, type FolioLeafSpec, type FolioRect,
} from '../src/ui/folio';

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
  range: number | null;
  spec: FolioLeafSpec;
}
interface FakeOpts {
  bay?: string; owner?: string; arrive?: FolioArrive; companions?: string[];
  rect?: FolioRect | null; engaged?: boolean; range?: number | null;
}

function fake(core: FolioCore, id: string, o: FakeOpts = {}): Fake {
  const f = {
    id, open: false, drawn: null, refreshes: 0, closes: 0,
    rect: o.rect ?? null, engaged: o.engaged ?? true, range: o.range ?? null,
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
  if (o.arrive) spec.arrive = o.arrive;
  if (o.companions) spec.companions = o.companions;
  f.spec = spec;
  core.enroll(spec);
  return f;
}
/** A show path: the leaf's own flag flips, then adopt (as every panel does). */
function show(core: FolioCore, f: Fake): string { f.open = true; return core.adopt(f.id); }
function rig(): { core: FolioCore; at: (t: number) => void } {
  let t = 0;
  return { core: new FolioCore(() => t), at: (v) => { t = v; } };
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
}

// --- O. THE ENROLLMENT CENSUS -----------------------------------------------
console.log('O. THE ENROLLMENT CENSUS');
{
  const panels = readFileSync(resolve(process.cwd(), 'src/ui/panels.ts'), 'utf8');
  const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8');
  const EXPECTED = ['vendor', 'salvage', 'font', 'recall', 'oracle', 'bestiary', 'borough',
    'bounties', 'caravan', 'sail', 'hold', 'merc', 'vocation'];
  const enrolled = [...panels.matchAll(/this\.folioLeaf\('([a-z_]+)'/g)].map(m => m[1]!);
  const adopted = [...panels.matchAll(/this\.folio\.adopt\('([a-z_]+)'\)/g)].map(m => m[1]!);
  check('O1 the thirteen dwell dialogs enroll, once each',
    EXPECTED.every(id => enrolled.filter(x => x === id).length === 1) && enrolled.length === EXPECTED.length,
    `enrolled: ${enrolled.join(',')}`);
  check('O2 every enrolled leaf adopts at its show path',
    EXPECTED.every(id => adopted.includes(id)), `adopted: ${adopted.join(',')}`);
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
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
