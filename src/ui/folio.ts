// ---------------------------------------------------------------------------
// THE FOLIO — overlapping UI surfaces bind into ONE tabbed book.
//
// The problem it closes: every dwell dialog (the vendor counter, the salvage
// bench, the font, the oracle, the bestiary, the boards, the caravan, the
// harbor, the hold, the captain, the calling…) shares ONE centred berth in
// index.html — so a hero standing where two stations' reaches cross opens
// BOTH, one painted over the other, and Escape closes whichever the fixed
// cascade names first rather than the one the player is looking at. The
// ideal is that no two surfaces ever overlap; the folio is the FALLBACK that
// makes overlap moot when they do — for the thirteen dialogs today and for
// any surface enrolled tomorrow (one data row, one adopt call).
//
// THE SHAPE. A surface enrolls as a LEAF (FolioLeafSpec — a handful of pure
// reads and two verbs: the leaf's OWN open flag, its OWN close path, a
// present(front) toggle, its bay + owner, an optional drawn rect, an optional
// engagement read, an optional range). The folio keeps NO open flag of its
// own: a leaf is bound while its own flag reads open and drops the moment
// ANY path in the game closes it (the glyph, Esc, hideAll, a station's
// proximity guard, a couch cascade) — the SELF-HEAL sweep in sync()
// reconciles them all, and binds a leaf whose show path forgot adopt().
// Leaves that would share a screen gather into a BOOK: one leaf is the FRONT
// (drawn), the rest are SHELVED (present(false) — a display:none class the
// leaf's own hidden bookkeeping never sees), and the book's THUMB INDEX
// (FolioStrip — the tab strip) rides the front leaf's MEASURED rect, so the
// tabs sit on whatever is actually drawn (drawn == seated).
//
// THE LAWS:
//   THE MASTER LAW — the first leaf opened holds the front; a newcomer
//     arrives BEHIND it (a shelved tab, pulsing fresh). The world's offers
//     never swap the screen out from under the player.
//   THE FRONT ARRIVAL — a leaf whose spec says arrive:'front' takes the front
//     on binding: an explicit ask (the pouch picker the player clicked) or a
//     modal (the calling's decide-at-leisure freeze) wants the player's eyes.
//   THE STANDING LAW — a master holds the front only while the player still
//     stands at it: a newcomer binding under a DISENGAGED front (engaged()
//     reads false — the hero walked off to the next station) takes the
//     front. A leaf with no engaged read is assumed engaged.
//   THE NEARER LAW — two stations whose dwells fire on the same arrival
//     (within arrivalSec of the front's own binding) front the NEARER one:
//     the player walked to Brandt, not to the bench beside him. Without a
//     range on both sides the master law stands.
//   THE BAY LAW — a book gathers ONE owner's leaves of ONE bay (the declared
//     screen berth: 'centre', a couch flank 'left'/'right'); a guest's flank
//     never binds with the hero's centre. THE MEASURED LAW extends it: leaves
//     of DIFFERENT bays still bind when their DRAWN rects overlap by at least
//     overlapFrac of the smaller — drawn == tested, so a future surface that
//     collides on a small screen folds without a data edit.
//   THE COMPANION LAW — leaves declared companions never bind (a bench and
//     the bag it works are meant to stand side by side).
//   THE PROMOTION — closing the front promotes the leaf the player last
//     looked at (the book's history), else the first in tab order; a book of
//     one leaf wears no strip; a book of none dissolves.
//   THE SOLO INVARIANT — one open leaf is byte-identical to before: its own
//     show/close, its own position, no chrome.
//
// Dials in FOLIO_CFG; docs in docs/ui/folio.md; probe balance/probe_folio.ts.
// ---------------------------------------------------------------------------

import { Z_LADDER } from './zorder';
import { uiScaleNow } from './uiScale';

/** The dials. */
export interface FolioTuning {
  /** THE MEASURED LAW's threshold: intersection area ÷ the SMALLER rect's
   *  area at or above this binds two leaves of different bays. */
  overlapFrac: number;
  /** THE NEARER LAW's window (seconds): a newcomer bound within this many
   *  seconds of the front's own binding fronts when it stands nearer. */
  arrivalSec: number;
  strip: {
    /** A book wears its thumb index only from this many leaves. */
    minLeaves: number;
    /** How far the strip's bottom edge sinks INTO the leaf's top border (px,
     *  pre-scale) so the front tab merges into the panel it opens. */
    seamPx: number;
    /** Show the close-all glyph at the strip's end. */
    closeAll: boolean;
    /** The fresh tab's glow: pulses before it rests. */
    freshPulses: number;
  };
}

export const FOLIO_CFG: FolioTuning = {
  overlapFrac: 0.15,
  arrivalSec: 0.35,
  strip: { minLeaves: 2, seamPx: 1, closeAll: true, freshPulses: 6 },
};

/** The class a shelved leaf wears (display:none via the injected sheet). The
 *  leaf's own `hidden` class is never touched — two independent reasons to
 *  be undrawn, each owned by one authority. */
export const FOLIO_SHELVED_CLASS = 'folio-shelved';
export const FOLIO_STRIP_CLASS = 'folio-strip';

/** A screen berth. The three shipped bays are the centred classic and the
 *  couch flanks; any string is a bay — the law is "same string binds". */
export type FolioBay = 'centre' | 'left' | 'right' | (string & {});
/** Where a newly bound leaf lands: behind the front (a dwell's offer) or in
 *  front of it (an explicit ask, a modal). */
export type FolioArrive = 'behind' | 'front';
/** What adopt() did with a leaf. */
export type FolioArrival = 'solo' | 'front' | 'behind' | 'noop';

export interface FolioRect { left: number; top: number; width: number; height: number; }

/** One enrolled surface. Every read is PURE and read live — the folio caches
 *  none of them, so a leaf's truth is always its own. */
export interface FolioLeafSpec {
  id: string;
  /** The tab's label (live — a counter may name its keeper). */
  title: () => string;
  /** The leaf's OWN open flag — the one truth of "bound". */
  isOpen: () => boolean;
  /** The leaf's OWN close path (semantics kept: the calling still declines,
   *  the counter still sheds its verbs). */
  close: () => void;
  /** Draw (true) or shelve (false) the surface. Must not touch the open flag. */
  present: (front: boolean) => void;
  /** The declared screen berth, read live (a couch flank moves at ownPanel). */
  bay: () => FolioBay;
  /** The seat that opened it — books never cross owners. */
  owner: () => string;
  /** The drawn rect while displayed, else null — THE MEASURED LAW's read and
   *  the strip's seat. */
  rect?: () => FolioRect | null;
  /** Does the player still stand at this leaf's station? Absent = assumed. */
  engaged?: () => boolean;
  /** Distance from the seat to the station, for THE NEARER LAW; null = unknown. */
  range?: () => number | null;
  arrive?: FolioArrive;
  /** Leaves this one may stand beside un-bound (symmetric — either side may declare). */
  companions?: readonly string[];
  /** Re-render on coming to the front (the leaf may have aged on the shelf). */
  refresh?: () => void;
}

export interface FolioTab { id: string; title: string; front: boolean; fresh: boolean; }
export interface FolioBookView {
  key: string;
  owner: string;
  bay: FolioBay;
  front: string;
  tabs: FolioTab[];
}

interface Book {
  key: string;
  owner: string;
  bay: FolioBay;
  /** Tab order = binding order; never reshuffled by activation. */
  order: string[];
  front: string;
  /** Fronts the player left, oldest first — THE PROMOTION pops it. */
  history: string[];
  boundAt: Map<string, number>;
  fresh: Set<string>;
  touchedAt: number;
}

/** Intersection area over the SMALLER rect's area (0 when either has none). */
export function rectOverlapFrac(a: FolioRect, b: FolioRect): number {
  const aa = a.width * a.height, ab = b.width * b.height;
  if (aa <= 0 || ab <= 0) return 0;
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min(aa, ab);
}

/** The folio's pure core — no DOM, driven by a clock the caller supplies. */
export class FolioCore {
  private readonly leaves = new Map<string, FolioLeafSpec>();
  private readonly books = new Map<string, Book>();
  /** leaf id → book key while bound. */
  private readonly bookOf = new Map<string, string>();
  private serial = 0;

  constructor(private readonly clock: () => number, private readonly cfg: FolioTuning = FOLIO_CFG) {}

  enroll(spec: FolioLeafSpec): void {
    if (this.leaves.has(spec.id)) throw new Error(`folio: leaf '${spec.id}' enrolled twice`);
    this.leaves.set(spec.id, spec);
  }

  leaf(id: string): FolioLeafSpec | null { return this.leaves.get(id) ?? null; }
  leafIds(): string[] { return [...this.leaves.keys()]; }
  /** The book key a leaf is bound into, or null. */
  bookKeyOf(id: string): string | null { return this.bookOf.get(id) ?? null; }

  /** Bind an OPEN leaf: call at the end of its show path (after it is
   *  displayed, so its rect measures). Returns what happened. */
  adopt(id: string): FolioArrival {
    const leaf = this.leaves.get(id);
    if (!leaf || !leaf.isOpen() || this.bookOf.has(id)) return 'noop';
    const now = this.clock();
    const owner = leaf.owner();
    const bay = leaf.bay();
    const book = this.findBook(leaf, owner, bay);
    if (!book) {
      const fresh: Book = {
        key: `${owner}:${bay}#${++this.serial}`, owner, bay,
        order: [id], front: id, history: [], boundAt: new Map([[id, now]]), fresh: new Set(), touchedAt: now,
      };
      this.books.set(fresh.key, fresh);
      this.bookOf.set(id, fresh.key);
      leaf.present(true);
      return 'solo';
    }
    book.order.push(id);
    this.bookOf.set(id, book.key);
    book.boundAt.set(id, now);
    const front = this.leaves.get(book.front)!;
    const takes = leaf.arrive === 'front'
      || (front.engaged !== undefined && !front.engaged())
      || this.nearerOnArrival(book, leaf, front, now);
    if (takes) { this.setFront(book, id); return 'front'; }
    book.fresh.add(id);
    leaf.present(false);
    return 'behind';
  }

  /** Bring a bound leaf to the front of its book. */
  front(id: string): boolean {
    const key = this.bookOf.get(id);
    if (!key) return false;
    const book = this.books.get(key)!;
    if (book.front !== id) this.setFront(book, id);
    else book.touchedAt = this.clock();
    return true;
  }

  /** THE SELF-HEAL: once per frame, bind every open-but-unbound leaf and drop
   *  every bound-but-closed one — whatever path opened or closed it. */
  sync(): void {
    for (const [id, leaf] of this.leaves) {
      const open = leaf.isOpen();
      const bound = this.bookOf.has(id);
      if (open && !bound) this.adopt(id);
      else if (!open && bound) this.drop(id);
    }
  }

  /** Close the FRONT leaf of the most recently touched book whose front
   *  satisfies `pred` (any book when absent), through the leaf's own close.
   *  True when a leaf was closed. */
  closeFront(pred?: (leaf: FolioLeafSpec) => boolean): boolean {
    const book = this.pickBook(pred, 1);
    if (!book) return false;
    const leaf = this.leaves.get(book.front)!;
    leaf.close();
    if (!leaf.isOpen()) this.drop(leaf.id);
    return true;
  }

  /** Close every leaf of a book through its own close path. Returns how many closed. */
  closeAll(bookKey: string): number {
    const book = this.books.get(bookKey);
    if (!book) return 0;
    let n = 0;
    for (const id of [...book.order]) {
      const leaf = this.leaves.get(id)!;
      leaf.close();
      if (!leaf.isOpen()) { this.drop(id); n++; }
    }
    return n;
  }

  /** Walk the tab order of the most recently touched multi-leaf book whose
   *  front satisfies `pred`; wraps. Returns the new front id, or null. */
  cycle(dir: 1 | -1, pred?: (leaf: FolioLeafSpec) => boolean): string | null {
    const book = this.pickBook(pred, this.cfg.strip.minLeaves);
    if (!book) return null;
    const i = book.order.indexOf(book.front);
    const next = book.order[(i + dir + book.order.length) % book.order.length]!;
    this.setFront(book, next);
    return next;
  }

  /** Does any book (whose front satisfies `pred`) hold at least `minLeaves`? */
  anyBook(minLeaves = this.cfg.strip.minLeaves, pred?: (leaf: FolioLeafSpec) => boolean): boolean {
    return this.pickBook(pred, minLeaves) !== null;
  }

  views(): FolioBookView[] {
    return [...this.books.values()].map(b => ({
      key: b.key, owner: b.owner, bay: b.bay, front: b.front,
      tabs: b.order.map(id => ({
        id, title: this.leaves.get(id)!.title(), front: id === b.front, fresh: b.fresh.has(id),
      })),
    }));
  }

  /** The view of the book holding `id`, or null. */
  bookFor(id: string): FolioBookView | null {
    const key = this.bookOf.get(id);
    return key ? this.views().find(v => v.key === key) ?? null : null;
  }

  // --- internals ------------------------------------------------------------

  private findBook(leaf: FolioLeafSpec, owner: string, bay: FolioBay): Book | null {
    // THE BAY LAW: the standing book of this owner + bay.
    for (const b of this.books.values()) {
      if (b.owner !== owner || b.bay !== bay || this.companionsIn(b, leaf)) continue;
      return b;
    }
    // THE MEASURED LAW: any book of this owner whose FRONT is drawn where this leaf is drawn.
    const mine = leaf.rect?.();
    if (!mine) return null;
    for (const b of this.books.values()) {
      if (b.owner !== owner || this.companionsIn(b, leaf)) continue;
      const fr = this.leaves.get(b.front)?.rect?.();
      if (fr && rectOverlapFrac(mine, fr) >= this.cfg.overlapFrac) return b;
    }
    return null;
  }

  private companionsIn(book: Book, leaf: FolioLeafSpec): boolean {
    return book.order.some(id => leaf.companions?.includes(id) || this.leaves.get(id)?.companions?.includes(leaf.id));
  }

  private nearerOnArrival(book: Book, leaf: FolioLeafSpec, front: FolioLeafSpec, now: number): boolean {
    const frontAt = book.boundAt.get(front.id);
    if (frontAt === undefined || now - frontAt > this.cfg.arrivalSec) return false;
    const mine = leaf.range?.() ?? null, theirs = front.range?.() ?? null;
    return mine !== null && theirs !== null && mine < theirs;
  }

  private setFront(book: Book, id: string): void {
    const prev = book.front;
    if (prev !== id && book.order.includes(prev)) {
      book.history.push(prev);
      this.leaves.get(prev)?.present(false);
    }
    book.front = id;
    book.fresh.delete(id);
    book.touchedAt = this.clock();
    const leaf = this.leaves.get(id)!;
    leaf.present(true);
    leaf.refresh?.();
  }

  private drop(id: string): void {
    const key = this.bookOf.get(id);
    if (!key) return;
    const book = this.books.get(key)!;
    this.bookOf.delete(id);
    book.order = book.order.filter(x => x !== id);
    book.history = book.history.filter(x => x !== id);
    book.fresh.delete(id);
    book.boundAt.delete(id);
    // Stand alone again: only the leaf's own hidden bookkeeping governs it now.
    this.leaves.get(id)?.present(true);
    if (book.order.length === 0) { this.books.delete(key); return; }
    if (book.front === id) {
      let next: string | undefined;
      while (book.history.length && !next) {
        const h = book.history.pop()!;
        if (book.order.includes(h)) next = h;
      }
      book.front = next ?? book.order[0]!;
      const leaf = this.leaves.get(book.front)!;
      book.fresh.delete(book.front);
      book.touchedAt = this.clock();
      leaf.present(true);
      leaf.refresh?.();
    }
  }

  private pickBook(pred: ((leaf: FolioLeafSpec) => boolean) | undefined, minLeaves: number): Book | null {
    let best: Book | null = null;
    for (const b of this.books.values()) {
      if (b.order.length < minLeaves) continue;
      if (pred && !pred(this.leaves.get(b.front)!)) continue;
      if (!best || b.touchedAt > best.touchedAt) best = b;
    }
    return best;
  }
}

// --- THE THUMB INDEX (DOM) ---------------------------------------------------

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** The tab strip: one root per multi-leaf book, seated on the front leaf's
 *  measured rect every frame, repainted only when its markup changes. */
export class FolioStrip {
  private readonly roots = new Map<string, HTMLDivElement>();
  private readonly html = new Map<string, string>();

  constructor(private readonly core: FolioCore, private readonly cfg: FolioTuning = FOLIO_CFG) {}

  /** Once per frame, after core.sync(). */
  update(): void {
    const seen = new Set<string>();
    for (const v of this.core.views()) {
      if (v.tabs.length < this.cfg.strip.minLeaves) continue;
      const rect = this.core.leaf(v.front)?.rect?.();
      if (!rect) continue; // the front is not drawn this frame — nothing to seat on
      seen.add(v.key);
      let root = this.roots.get(v.key);
      if (!root) { root = this.mount(v.key); this.roots.set(v.key, root); }
      this.paint(root, v);
      this.seat(root, rect);
    }
    for (const [key, root] of this.roots) {
      if (seen.has(key)) continue;
      root.remove();
      this.roots.delete(key);
      this.html.delete(key);
    }
  }

  private mount(key: string): HTMLDivElement {
    const root = document.createElement('div');
    root.className = FOLIO_STRIP_CLASS;
    root.dataset.folioBook = key;
    root.setAttribute('role', 'tablist');
    // ONE delegated click per strip — a repaint never loses the wire.
    root.addEventListener('click', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      const tab = t?.closest<HTMLElement>('[data-folio-tab]');
      if (tab?.dataset.folioTab) { this.core.front(tab.dataset.folioTab); this.update(); return; }
      if (t?.closest('[data-folio-close]')) { this.core.closeAll(key); this.update(); }
    });
    document.body.appendChild(root);
    return root;
  }

  private paint(root: HTMLDivElement, v: FolioBookView): void {
    const tabs = v.tabs.map(t =>
      `<button type="button" role="tab" class="folio-tab${t.front ? ' now' : ''}${t.fresh ? ' fresh' : ''}"`
      + ` data-folio-tab="${esc(t.id)}" aria-selected="${t.front}" title="${esc(t.title)}">${esc(t.title)}</button>`).join('');
    const x = this.cfg.strip.closeAll
      ? '<button type="button" class="folio-x" data-folio-close title="Close all" aria-label="Close all">✕</button>' : '';
    const html = tabs + x;
    if (this.html.get(v.key) === html) return;
    this.html.set(v.key, html);
    root.innerHTML = html;
  }

  /** Seat the strip on the rect: the sheet scales it from its top-left (the
   *  'scale' UI-scale mode), so layout width is rect.width ÷ scale and the
   *  drawn height is offsetHeight × scale. */
  private seat(root: HTMLDivElement, rect: FolioRect): void {
    const s = uiScaleNow();
    root.style.width = `${Math.max(0, rect.width / s)}px`;
    const h = root.offsetHeight * s;
    root.style.left = `${Math.round(rect.left)}px`;
    root.style.top = `${Math.round(Math.max(0, rect.top - h + this.cfg.strip.seamPx))}px`;
  }
}

const STYLE_ID = 'ui-folio';

/** Build (or rebuild — idempotent, HMR-safe) the folio's one stylesheet: the
 *  shelved class and the thumb index's look. Call once at boot. */
export function installFolioStyles(cfg: FolioTuning = FOLIO_CFG): void {
  document.getElementById(STYLE_ID)?.remove();
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.${FOLIO_SHELVED_CLASS} { display: none !important; }
.${FOLIO_STRIP_CLASS} {
  position: fixed; z-index: ${Z_LADDER.folio}; display: flex; align-items: flex-end; gap: 3px;
  padding: 0 8px; box-sizing: border-box; pointer-events: auto; font-size: 12px;
}
.${FOLIO_STRIP_CLASS} .folio-tab {
  flex: 0 1 auto; min-width: 0; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 4px 12px 5px; margin: 0; background: #16161f; color: var(--text-dim, #9a96b0);
  border: 1px solid var(--panel-border, #3a3a55); border-bottom: none; border-radius: 6px 6px 0 0;
  font: inherit; line-height: 1.2; cursor: var(--cursor-point, pointer);
}
.${FOLIO_STRIP_CLASS} .folio-tab:hover { color: #fff; border-color: #6a6690; }
.${FOLIO_STRIP_CLASS} .folio-tab.now {
  background: var(--panel-bg, #1e1e2a); color: var(--gold, #c8a84b); border-color: var(--gold, #c8a84b);
  padding-bottom: 7px; margin-bottom: -1px;
}
.${FOLIO_STRIP_CLASS} .folio-tab.fresh { animation: folio-fresh 0.9s ease-in-out ${cfg.strip.freshPulses} alternate; }
@keyframes folio-fresh {
  from { box-shadow: 0 0 0 rgba(200,168,75,0); color: var(--text-dim, #9a96b0); }
  to   { box-shadow: 0 -2px 10px rgba(200,168,75,0.55); color: #e8d49a; }
}
.${FOLIO_STRIP_CLASS} .folio-x {
  margin-left: auto; padding: 3px 8px 4px; background: transparent; color: var(--text-dim, #9a96b0);
  border: 1px solid var(--panel-border, #3a3a55); border-bottom: none; border-radius: 6px 6px 0 0;
  font: inherit; line-height: 1.2; cursor: var(--cursor-point, pointer);
}
.${FOLIO_STRIP_CLASS} .folio-x:hover { color: #fff; border-color: var(--gold, #c8a84b); }`;
  document.head.appendChild(el);
}

/** Tab / Shift+Tab walk the hero's open book while one stands (the keyboard
 *  twin of clicking a tab). The default focus walk is suppressed ONLY then —
 *  with no book up, Tab is whatever it always was. */
export function bindFolioKeys(core: FolioCore, hero: (leaf: FolioLeafSpec) => boolean, after: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !core.anyBook(undefined, hero)) return;
    e.preventDefault();
    core.cycle(e.shiftKey ? -1 : 1, hero);
    after();
  });
}
