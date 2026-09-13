// ---------------------------------------------------------------------------
// THE CONTAINER PANE — a side board's FACE inside the inventory panel.
//
// The inventory's bag column wears a FACE STRIP once the account owns any
// registered container (engine/containers.ts — the Reliquary first): the
// plain Bag, then one tab per owned board. A container's face draws the
// board's FULL shape (containerFullBoard) with the cells the account's rungs
// have opened as live seats, the cells a later rung opens as SEALED seats
// (dim, a lock, the rung's name on hover — the ladder teaches itself), and
// beneath it THE TRAY: every accepted piece the bag carries, laid out as
// tiles, so seating is one drag with both ends on screen. Gestures ride the
// standing drag fabric (ui/dnd.ts): a tray tile onto an open seat SEATS
// (containerPlace), a seated tile back onto the tray or a bag cell UNSEATS
// (containerTake), a seated tile onto another seat RE-PLACES (containerMove),
// and the right-click TAP (the bag's use verb) seats / unseats first-fit.
//
// DRAWN == TESTED: every landing the face lights is the engine's own read
// (engine/containers.ts containerLanding — the verdict containerPlace acts
// on), painted through the bag's own preview box. The pane keeps ONE piece
// of state — which face is showing — and reads everything else live off the
// seat's meta and the registry, so a re-render mid-carry re-earns its marks
// like the bag does. ui/panels.ts owns the panel; this module owns nothing
// but the face (docs/engine/containers.md).
// ---------------------------------------------------------------------------

import { registerDropTarget, type DragPayload } from './dnd';
import {
  CONTAINERS, CONTAINER_ORIGIN_PREFIX, boardOpenAt, containerBoard, containerFor, containerFullBoard,
  containerLanding, containerOriginOf, containerRungAt, findCarried, originContainerId,
  type ContainerDef, type ContainerLanding,
} from '../engine/containers';
import { CONTAINER_DEFS } from '../data/containers';
import { bagBoard } from '../engine/inventory';
import { itemGridSize } from '../engine/itemgen';
import { ITEM_BASES } from '../data/itembases';
import { ITEM_RARITIES, type ItemInstance } from '../engine/items';
import { CATEGORY_GLYPHS } from '../render/itemIcons';
import type { Seat, World } from '../engine/world';

/** What the pane needs from the panel that hosts it — read live, never held. */
export interface ContainerPaneHost {
  world(): World;
  /** The inventory panel's owning seat (the couch lens). */
  seat(): Seat;
  /** Re-render the inventory + the character sheet. */
  refresh(): void;
  /** The bag's cell size in CSS px (the tiles share it). */
  cellPx: number;
  /** A salvage lane is armed on the panel — tiles trade their lift for the lane's click. */
  breaking(): boolean;
  /** The lock gesture's spoken name (the lock pip's hover). */
  lockGestureText(): string;
  /** The bag's standing lock hint line. */
  lockHintHtml(): string;
}

/** A container landing with the payload's ORIGIN word — the shape the bag's
 *  preview box paints (verdict / footprint / from / with). */
export interface ContainerLandingView extends ContainerLanding { from: string }

const esc = (s: string): string => s.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));

export class ContainerPane {
  /** THE FACE: 'bag', or a container id. The one piece of pane state. */
  face = 'bag';

  constructor(private readonly host: ContainerPaneHost) {}

  // ------------------------------------------------------------- reads ----

  /** Every container that EXISTS for the run (rung 0 owned — the existence
   *  law; on a client, the host's shipped boards). */
  owned(): ContainerDef[] {
    return CONTAINER_DEFS.filter(c => containerBoard(c) !== null);
  }

  /** The face to draw: a board the account no longer owns falls back to the bag. */
  activeFace(): string {
    if (this.face !== 'bag' && !this.owned().some(c => c.id === this.face)) this.face = 'bag';
    return this.face;
  }

  /** Show a container's face (or the bag). Returns false for a board that
   *  does not exist for the run. */
  show(face: string): boolean {
    if (face !== 'bag' && !this.owned().some(c => c.id === face)) return false;
    this.face = face;
    return true;
  }

  private held(id: string): ItemInstance[] {
    return this.host.seat().meta.containers[id] ?? [];
  }

  /** The bag pieces a container would take — THE TRAY's roster. */
  private trayItems(def: ContainerDef): ItemInstance[] {
    return this.host.seat().meta.items.filter(i => i.x !== undefined && i.y !== undefined
      && containerFor(i)?.id === def.id);
  }

  // -------------------------------------------------------------- html ----

  /** THE FACE STRIP over the bag column — '' while no container is owned
   *  (one face is byte-identical to the standing bag). */
  tabsHtml(): string {
    const owned = this.owned();
    if (!owned.length) return '';
    const face = this.activeFace();
    const tab = (id: string, label: string, title: string): string =>
      `<button class="book-tab ${face === id ? 'active' : ''}" data-invface="${esc(id)}" title="${esc(title)}">${label}</button>`;
    return `<div class="book-tabs" style="margin:0 0 6px 0">
      ${tab('bag', 'Bag', 'The pack')}
      ${owned.map(c => {
        const board = containerBoard(c)!;
        const n = this.held(c.id).length;
        return tab(c.id, `${c.glyph} ${esc(c.label)} <span style="color:#8a8678;font-weight:normal;font-size:10px">${n}/${board.cells}</span>`, c.blurb);
      }).join('')}
    </div>`;
  }

  /** The active container's whole face: the board, the tray, the hints. */
  bodyHtml(): string {
    const id = this.activeFace();
    const def = CONTAINERS[id];
    const board = def ? containerBoard(def) : null;
    if (!def || !board) return '';
    const CELL = this.host.cellPx;
    const W = bagBoard().w; // the column keeps the bag's width — the face swaps, the panel stands
    const full = containerFullBoard(def);
    const held = this.held(def.id);

    // THE BOARD: live seats are drop cells (the landing law lights them);
    // seats a later rung opens are SEALED — dim, locked, named on hover.
    let cells = '';
    for (let y = 0; y < full.h; y++) {
      for (let x = 0; x < full.w; x++) {
        const px = `position:absolute;left:${x * CELL}px;top:${y * CELL}px;width:${CELL - 2}px;height:${CELL - 2}px;box-sizing:border-box;`;
        if (boardOpenAt(board, x, y)) {
          cells += `<div data-cell="${x}:${y}" data-drop="containerCell:${esc(def.id)}:${x}:${y}"
            style="${px}background:#16131d;border:1px solid #2a2634"></div>`;
        } else if (boardOpenAt(full, x, y)) {
          const rung = containerRungAt(def, x, y);
          cells += `<div title="${esc(rung ? `Sealed: opens with ${rung.label} (the Vault)` : 'Sealed')}"
            style="${px}background:#0f0d14;border:1px dashed #2a2634;display:flex;align-items:center;justify-content:center;color:#3a3644;font-size:11px">🔒</div>`;
        }
      }
    }
    const tiles = held.map(i => (i.x !== undefined && i.y !== undefined) ? this.tileHtml(i, i.x, i.y, false) : '').join('');
    const boardW = Math.max(1, full.w) * CELL, boardH = Math.max(1, full.h) * CELL;

    // THE TRAY: the bag's accepted pieces, packed row-major at their own
    // footprints (a layout, never a placement — bag cells are untouched).
    const tray = this.trayItems(def);
    const trayCols = W;
    let tx = 0, ty = 0, rowH = 0;
    const trayTiles: string[] = [];
    for (const i of tray) {
      const s = itemGridSize(i);
      if (tx + s.w > trayCols) { tx = 0; ty += rowH; rowH = 0; }
      trayTiles.push(this.tileHtml(i, tx, ty, true));
      tx += s.w;
      rowH = Math.max(rowH, s.h);
    }
    const trayRows = Math.max(2, ty + rowH);
    const seated = held.length;

    return `
      <div style="display:flex;align-items:center;gap:8px;width:${W * CELL}px">
        <h3>${def.glyph} ${esc(def.label)} <span style="color:#8a8678;font-weight:normal">(${seated} seated · ${board.cells} seat${board.cells === 1 ? '' : 's'})</span></h3>
      </div>
      <div style="display:flex;gap:14px;align-items:flex-start;width:${W * CELL}px">
        <div data-bag-grid="c:${esc(def.id)}" data-container-grid="${esc(def.id)}"
          style="position:relative;flex:0 0 auto;width:${boardW}px;height:${boardH}px">${cells}${tiles}</div>
        <div style="flex:1 1 auto;min-width:0;color:#8a8678;font-size:10px;line-height:1.5">
          ${esc(def.blurb)}<br>
          <span style="color:#6a6478">Drag a piece from the pack below onto an open seat; drag it back to unseat.
          A seated piece speaks its lines; a piece in the pack is silent.
          Sealed seats open through the Vault.</span>
        </div>
      </div>
      <h3 style="margin-top:10px">In the pack <span style="color:#8a8678;font-weight:normal">(${tray.length} ${tray.length === 1 ? 'piece' : 'pieces'})</span></h3>
      <div data-drop="containerTray:${esc(def.id)}"
        style="position:relative;width:${W * CELL}px;height:${trayRows * CELL}px;background:#120f18;border:1px dashed #2a2634;border-radius:4px;box-sizing:border-box">
        ${trayTiles.join('')}
        ${tray.length ? '' : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#4a4656;font-size:10px">no ${esc(def.label.toLowerCase())} pieces in the pack</div>`}
      </div>
      <div style="margin-top:8px;color:#8a8678;font-size:10px">${this.host.lockHintHtml()}</div>`;
  }

  /** One piece as a tile — the bag's plain gear face (rarity border, the
   *  category glyph, the lock pip), lifted by the fabric as a gearItem. */
  private tileHtml(i: ItemInstance, x: number, y: number, inTray: boolean): string {
    const CELL = this.host.cellPx;
    const s = itemGridSize(i);
    const r = ITEM_RARITIES[i.rarity];
    const cat = ITEM_BASES[i.baseId]?.category ?? 'relic';
    const breaking = this.host.breaking();
    // Under an armed salvage lane a TRAY tile (a bag piece) takes the lane's
    // click like any bag tile; a seated piece is out of the hammer's reach.
    const verb = breaking && inTray ? `data-salv-uid="${i.uid}"` : `data-drag="gearItem:${i.uid}"`;
    const lock = i.locked
      ? `<span style="position:absolute;top:0;right:1px;font-size:9px;line-height:10px;text-shadow:0 0 3px #000"
          title="Locked: it stays — no salvage, no drop, no sort (${esc(this.host.lockGestureText())} to unlock)">🔒</span>`
      : '';
    return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
      ${verb} data-drop="gearTile:${i.uid}"
      style="position:absolute;left:${x * CELL}px;top:${y * CELL}px;
      width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#221e2c;
      border:2px solid ${r.color};border-radius:3px;cursor:${breaking && inTray ? 'inherit' : 'var(--cursor-point, pointer)'};box-sizing:border-box;
      display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
      ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}">${CATEGORY_GLYPHS[cat] ?? '?'}${lock}</div>`;
  }

  /** Wire the face strip's tabs after a render. */
  wire(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('button[data-invface]').forEach(btn => btn.addEventListener('click', () => {
      if (this.show(btn.dataset.invface!)) this.host.refresh();
    }));
  }

  // ---------------------------------------------------------- gestures ----

  /** The right-click TAP's verb for a piece some container takes: a seated
   *  piece UNSEATS (first fit in the bag), a bag piece SEATS (first open
   *  fit) when its board exists; null otherwise (the bag's own verbs run). */
  useVerb(item: ItemInstance, seatId: string | undefined): { label: string; run: () => void } | null {
    const world = this.host.world();
    const m = this.host.seat().meta;
    const found = findCarried(m, item.uid);
    if (!found) return null;
    const request = (action: Parameters<World['requestMeta']>[0]): void => {
      const previous = world.uiActionSeatId;
      world.uiActionSeatId = seatId ?? null;
      try { world.requestMeta(action); } finally { world.uiActionSeatId = previous; }
      this.host.refresh();
    };
    if (found.where.kind === 'container') {
      const cid = found.where.container;
      return { label: 'unseat', run: () => request({ t: 'containerTake', container: cid, uid: item.uid }) };
    }
    if (found.where.kind !== 'bag') return null;
    const def = containerFor(item);
    if (!def || !containerBoard(def)) return null;
    return { label: `seat in the ${def.label}`, run: () => request({ t: 'containerPlace', container: def.id, uid: item.uid }) };
  }

  /** The tooltip's one line for a piece some container takes: where it
   *  stands and whether it speaks. null for ordinary gear. */
  tooltipNote(item: ItemInstance): { text: string; color: string } | null {
    const def = containerFor(item);
    if (!def) return null;
    const found = findCarried(this.host.seat().meta, item.uid);
    if (found?.where.kind === 'container') {
      return { text: `${def.glyph} Seated in the ${def.label} — its lines are live.`, color: '#c8a84b' };
    }
    if (!containerBoard(def)) {
      return { text: `${def.glyph} Silent in the pack — the ${def.label} that could seat it waits in the Vault.`, color: '#6a6478' };
    }
    return { text: `${def.glyph} Silent in the pack — seat it in the ${def.label} to wake its lines (right-click tap, or drag).`, color: '#8a8678' };
  }

  /** THE LANDING LAW for a gear payload over a container cell — the engine's
   *  own verdict (containerLanding), with the payload's origin word so the
   *  drop can route place / move. */
  landing(p: DragPayload, containerId: string, cellArg: string): ContainerLandingView {
    const [cx, cy] = cellArg.split(':').map(Number);
    const d = p.data as { grab?: { x: number; y: number } } | undefined;
    const grab = d?.grab ?? { x: 0, y: 0 };
    const x = cx - grab.x, y = cy - grab.y;
    const m = this.host.seat().meta;
    const found = p.kind === 'gearItem' ? findCarried(m, Number(p.arg)) : undefined;
    const from = found ? containerOriginOf(m, found.item.uid) : 'bag';
    const def = CONTAINERS[containerId];
    if (!found || !def) return { verdict: 'blocked', x, y, w: 1, h: 1, from };
    const fromKind = from === 'bag' ? 'bag' : originContainerId(from) === containerId ? 'self' : 'other';
    const level = this.host.world().seatHero(this.host.seat()).level;
    const l = containerLanding(def, containerBoard(def), m.containers[containerId] ?? [], found.item, fromKind,
      x, y, level, m.items, bagBoard());
    return { ...l, from };
  }

  /** Register the face's drop targets with the fabric (once). */
  registerDnd(): void {
    const world = (): World => this.host.world();
    // A container CELL: seat from the bag, or re-place inside the board.
    registerDropTarget({
      kind: 'containerCell',
      accepts: (p, arg) => {
        const [cid, cx, cy] = arg.split(':');
        return p.kind === 'gearItem' && this.landing(p, cid, `${cx}:${cy}`).verdict !== 'blocked';
      },
      drop: (p, arg) => {
        const [cid, cx, cy] = arg.split(':');
        const l = this.landing(p, cid, `${cx}:${cy}`);
        if (l.verdict === 'blocked') return;
        const uid = Number(p.arg);
        if (l.from === 'bag') world().requestMeta({ t: 'containerPlace', container: cid, uid, x: l.x, y: l.y });
        else if (originContainerId(l.from) === cid) world().requestMeta({ t: 'containerMove', container: cid, uid, x: l.x, y: l.y });
        else return;
        this.host.refresh();
      },
    });
    // THE TRAY: a seated piece dropped back onto the tray unseats, first fit.
    registerDropTarget({
      kind: 'containerTray',
      accepts: (p, cid) => {
        if (p.kind !== 'gearItem') return false;
        const found = findCarried(this.host.seat().meta, Number(p.arg));
        return found?.where.kind === 'container' && found.where.container === cid;
      },
      drop: (p, cid) => {
        world().requestMeta({ t: 'containerTake', container: cid, uid: Number(p.arg) });
        this.host.refresh();
      },
    });
  }
}

/** The origin-word prefix the bag's landing law reads to recognise a piece
 *  lifted from a side board (re-exported so panels.ts speaks one spelling). */
export const CONTAINER_FROM_PREFIX = CONTAINER_ORIGIN_PREFIX;
