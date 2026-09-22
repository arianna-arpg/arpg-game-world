// ---------------------------------------------------------------------------
// THE CONTAINER DRAWERS — a side board's page on the inventory's ribbon rail.
//
// Every owned container (engine/containers.ts — the Reliquary first) wears a
// RIBBON on the inventory's edge beside SKILLS and PASSIVES, and its press
// pops a DRAWER out beside the bag: a minted panel root (the skill-tree
// pane idiom — one root per container, minted on first open) that DOCKS
// beside the inventory through the same seat law the Skills drawer rides
// (ui/panels.ts syncBuildPanels + buildPanelSeat) and ENROLLS in THE FOLIO
// as a leaf of the inventory-side book, so a drawer up beside Skills or a
// tree tabs into ONE book instead of painting over it — THE MASTER LAW, the
// front swap, the true close, the Esc sweep all arrive from the folio for
// free. The bag stays on screen the whole time: a relic drags straight from
// its bag cell onto an open seat, and a seated piece drags back onto any bag
// cell (the bag's landing law routes a `c:<id>` origin to containerTake),
// onto the drawer's RETURN strip, or unseats by the right-click TAP.
//
// The drawer draws the board's FULL shape (containerFullBoard): the cells the
// account's rungs have opened are live seats, the cells a later rung opens
// are SEALED — dim, a lock, the rung's name on hover — so the Vault ladder
// teaches itself on the face. DRAWN == TESTED: every landing the face lights
// is the engine's own read (containerLanding — the verdict containerPlace
// acts on), painted through the bag's own preview box.
//
// The pane keeps TWO things: which drawers are OPEN (memory kept across a
// bag close, the Skills drawer's rule — reopening the bag brings them back)
// and the minted roots. Everything else reads live off the seat's meta and
// the registry, so a re-render mid-carry re-earns its marks like the bag.
// ui/panels.ts owns the panel and the folio; this module owns the drawers
// (docs/engine/containers.md, docs/ui/folio.md).
// ---------------------------------------------------------------------------

import { dndCarried, registerDropTarget, type DragPayload } from './dnd';
import { hideTooltip } from './tooltip';
import {
  CONTAINERS, CONTAINER_ORIGIN_PREFIX, boardOpenAt, containerBoard, containerFor, containerFullBoard,
  containerLanding, containerOriginOf, containerRungAt, findCarried, originContainerId,
  type ContainerDef, type ContainerLanding,
} from '../engine/containers';
import { CONTAINER_DEFS } from '../data/containers';
import { bagBoard, autoPlace, placeAt } from '../engine/inventory';
import { itemGridSize } from '../engine/itemgen';
import { ITEM_BASES } from '../data/itembases';
import { ITEM_RARITIES, type ItemInstance } from '../engine/items';
import { CATEGORY_GLYPHS } from '../render/itemIcons';
import type { Seat, World } from '../engine/world';
import { empowermentText } from './reliquary';
import { isVaultAvailable } from '../meta/account';
import { planRelicStorage, reliquaryExperience } from '../engine/accountReliquary';

/** What the drawers need from the panel that hosts them — read live, never
 *  held. The folio ids (`container:<id>`) and the docking law stay the
 *  panel's: the pane hands it a bare container id and a root. */
export interface ContainerPaneHost {
  world(): World;
  /** The inventory panel's owning seat (the couch lens). */
  seat(): Seat;
  inventoryOpen(): boolean;
  /** Open the inventory for a seat (the menu page's road in). */
  openInventory(seatId?: string): void;
  /** Re-render the inventory (which re-renders every open drawer) + the sheet. */
  refresh(): void;
  /** Re-seat the docked panels (syncBuildPanels). */
  sync(): void;
  /** The bag's cell size in CSS px (the tiles share it). */
  cellPx: number;
  /** A salvage lane is armed on the panel. */
  breaking(): boolean;
  lockGestureText(): string;
  lockHintHtml(): string;
  closeGlyphHtml(): string;
  /** Stamp a minted root as the inventory owner's (the couch lens). */
  ownDocked(el: HTMLElement): void;
  /** THE PANEL MOVE for a minted root. */
  attachMove(el: HTMLElement): void;
  /** Item tooltips on a minted root (the inventory's resolver). */
  bindItemTooltips(el: HTMLElement): void;
  /** THE FOLIO: enroll a drawer as a leaf of the inventory-side book. */
  enrollLeaf(id: string, el: HTMLElement, title: () => string, isOpen: () => boolean, close: () => void, refresh: () => void): void;
  folioAdopt(id: string): void;
  /** Bring a shelved drawer forward; false when it is not bound. */
  folioFront(id: string): boolean;
  /** The front of the book holding this drawer (a bare container id), or
   *  null when the drawer stands alone / unbound. */
  folioFrontOf(id: string): string | null;
  folioStripUpdate(): void;
  /** The pad's lock press (button 0 from the pad pointer under its lock bind). */
  padLock(ev: PointerEvent): boolean;
  beginLockHold(ev: PointerEvent, uid: number, pad: boolean): void;
}

/** A container landing with the payload's ORIGIN word — the shape the bag's
 *  preview box paints (verdict / footprint / from / with). */
export interface ContainerLandingView extends ContainerLanding { from: string }

const esc = (s: string): string => s.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));

/** The drawer root's DOM id for a container. */
export const containerPanelId = (id: string): string => `container-panel-${id}`;

export class ContainerPane {
  /** Which drawers stand open — memory kept across a bag close. */
  private readonly open = new Set<string>();
  /** The minted roots, by container id. */
  private readonly panels = new Map<string, HTMLElement>();
  private readonly rendered = new WeakMap<HTMLElement, string>();

  constructor(private readonly host: ContainerPaneHost) {}

  // ------------------------------------------------------------- reads ----

  /** Every container that EXISTS for the run (rung 0 owned — the existence
   *  law; on a client, the host's shipped boards). */
  owned(): ContainerDef[] {
    return CONTAINER_DEFS.filter(c => containerBoard(c) !== null);
  }

  /** A drawer stands open (its board still exists for the run). */
  isOpen(id: string): boolean {
    return this.open.has(id) && !!CONTAINERS[id] && containerBoard(CONTAINERS[id]) !== null;
  }

  /** Is this root one of the drawers? (syncBuildPanels' width pick.) */
  isPanel(el: HTMLElement): boolean {
    for (const p of this.panels.values()) if (p === el) return true;
    return false;
  }

  /** The roots of every OPEN drawer — the docking, obstruction and
   *  open-census lists read this. */
  dockedEls(): HTMLElement[] {
    return [...this.panels.entries()].filter(([id]) => this.isOpen(id)).map(([, el]) => el);
  }

  /** The tile element carrying a uid in any drawer (the lock hold's anchor). */
  tileElement(uid: number): HTMLElement | null {
    for (const el of this.panels.values()) {
      const t = el.querySelector<HTMLElement>(`[data-lock-uid="${uid}"]`);
      if (t) return t;
    }
    return null;
  }

  private held(id: string): ItemInstance[] {
    return this.host.seat().meta.containers[id] ?? [];
  }

  // ----------------------------------------------------------- ribbons ----

  /** One RIBBON per owned container, for the inventory's build rail (drawn
   *  after SKILLS and PASSIVES): the glyph, the name, the seated count. */
  ribbonsHtml(): string {
    return this.owned().map(c => {
      const board = containerBoard(c)!;
      const n = this.held(c.id).length;
      const reliquaryLesson = c.id === 'reliquary' && this.host.world().reliquaryLesson();
      return `<button data-containerflap="${esc(c.id)}" class="build-ribbon" aria-expanded="${this.isOpen(c.id)}"
          aria-controls="${containerPanelId(c.id)}" title="${esc(c.blurb)}">
          <span class="build-ribbon-label">${c.glyph} ${esc(c.label.toUpperCase())}${reliquaryLesson ? ' · LESSON' : ''}</span>
          <span class="build-ribbon-count" title="${n} seated of ${board.cells} open seats">${n}/${board.cells}</span>
        </button>`;
    }).join('');
  }

  /** Wire the ribbons after an inventory render. */
  wireRibbons(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('button[data-containerflap]').forEach(btn =>
      btn.addEventListener('click', () => this.toggle(btn.dataset.containerflap!)));
  }

  // ----------------------------------------------------------- drawers ----

  /** The ribbon's press (the Skills flap's grammar): a drawer open but
   *  SHELVED behind a book-mate comes forward; otherwise the drawer flips. */
  toggle(id: string): void {
    const def = CONTAINERS[id];
    if (!def || !containerBoard(def)) return;
    if (this.open.has(id)) {
      const front = this.host.folioFrontOf(id);
      if (front !== null && front !== id) {
        if (this.host.folioFront(id)) { this.host.folioStripUpdate(); return; }
      }
      this.open.delete(id);
    } else {
      this.open.add(id);
      this.paneFor(id);
    }
    hideTooltip();
    this.host.refresh();
    if (this.open.has(id)) this.host.folioAdopt(id);
    this.host.folioStripUpdate();
  }

  /** The drawer's own close (the glyph, the book, the sweep): forgets it —
   *  the Skills drawer's exact shape. */
  close(id: string): void {
    if (!this.open.has(id)) return;
    this.open.delete(id);
    hideTooltip();
    if (this.host.inventoryOpen()) this.host.refresh();
    else this.host.sync();
  }

  /** The menu page's road (the tray's toggle grammar): the bag opens if it
   *  is shut, then the drawer opens; already up and in front, the press
   *  closes it; up but shelved, it comes forward. */
  openFromMenu(id: string, seatId?: string): void {
    if (!CONTAINERS[id] || !containerBoard(CONTAINERS[id])) return;
    if (!this.host.inventoryOpen()) {
      this.host.openInventory(seatId);
      if (!this.open.has(id)) this.toggle(id);
      return;
    }
    this.toggle(id);
  }

  /** Every drawer follows the bag: hidden while the inventory is shut or
   *  the drawer is not open (memory kept either way). */
  syncHidden(): void {
    for (const [id, el] of this.panels) el.classList.toggle('hidden', !(this.host.inventoryOpen() && this.isOpen(id)));
  }

  /** hideAll's lane: every root hidden, memory kept. */
  hideAll(): void {
    for (const el of this.panels.values()) el.classList.add('hidden');
  }

  /** Re-render every open drawer (the inventory's beat). */
  renderAll(live = false): void {
    for (const id of this.open) if (this.isOpen(id)) this.render(id, live);
  }

  /** Mint a drawer's root on first open: the skill-tree pane idiom — a
   *  panel root on the body, tooltips bound once, the close glyph wired,
   *  movable by its ribbon, enrolled in THE FOLIO as an explicit ask that
   *  arrives in front. */
  private paneFor(id: string): HTMLElement {
    const standing = this.panels.get(id);
    if (standing) return standing;
    const def = CONTAINERS[id];
    const el = document.createElement('div');
    el.id = containerPanelId(id);
    el.className = 'panel container-panel hidden';
    document.body.appendChild(el);
    this.panels.set(id, el);
    this.host.bindItemTooltips(el);
    el.addEventListener('click', (e) => {
      if ((e.target as Element).closest('[data-panel-x]')) this.close(id);
    });
    this.host.attachMove(el);
    this.host.enrollLeaf(id, el, () => def?.label ?? id,
      () => this.host.inventoryOpen() && this.isOpen(id),
      () => this.close(id),
      () => { hideTooltip(); this.render(id); });
    return el;
  }

  /** One drawer's face: the header, the board, the return strip, the hints. */
  private render(id: string, live = false): void {
    const def = CONTAINERS[id];
    const board = def ? containerBoard(def) : null;
    if (!def || !board) return;
    const el = this.paneFor(id);
    const CELL = this.host.cellPx;
    const full = containerFullBoard(def);
    const held = this.held(id);
    const reliquaryLesson = id === 'reliquary' && this.host.world().reliquaryLesson();
    const lessonCharm = reliquaryLesson ? this.host.seat().meta.items.find(i =>
      ITEM_BASES[i.baseId]?.category === 'relic' && itemGridSize(i).w === 1 && itemGridSize(i).h === 1) : undefined;
    const boardW = Math.max(1, full.w) * CELL, boardH = Math.max(1, full.h) * CELL;

    // THE BOARD: live seats are drop cells (the landing law lights them);
    // seats a later rung opens are SEALED — dim, locked, named on hover.
    let cells = '';
    for (let y = 0; y < full.h; y++) {
      for (let x = 0; x < full.w; x++) {
        const px = `position:absolute;left:${x * CELL}px;top:${y * CELL}px;width:${CELL - 2}px;height:${CELL - 2}px;box-sizing:border-box;`;
        if (boardOpenAt(board, x, y)) {
          cells += `<div data-cell="${x}:${y}" data-drop="containerCell:${esc(id)}:${x}:${y}"
            style="${px}background:#16131d;border:1px solid ${reliquaryLesson ? '#e4cb97;box-shadow:inset 0 0 12px #9b805566' : '#2a2634'}"></div>`;
        } else if (boardOpenAt(full, x, y)) {
          const rung = containerRungAt(def, x, y);
          cells += `<div title="${esc(rung ? `Sealed: opens with ${rung.label}${isVaultAvailable(this.host.world().account) ? ' (the Vault)' : ''}` : 'Sealed')}"
            style="${px}background:#0f0d14;border:1px dashed #2a2634;display:flex;align-items:center;justify-content:center;color:#3a3644;font-size:11px">🔒</div>`;
        }
      }
    }
    const tiles = held.map(i => (i.x !== undefined && i.y !== undefined) ? this.tileHtml(i, i.x, i.y) : '').join('');
    const sealed = full.cells - board.cells;

    const html = `${this.host.closeGlyphHtml()}<h2>${def.glyph} ${esc(def.label)}</h2>
      ${reliquaryLesson ? `<div style="padding:10px;margin-bottom:10px;border:1px solid #9b8055;border-radius:5px;color:#e4cb97;font-size:12px;line-height:1.6">
        <strong>A place for the unremembered</strong><br>
        A charm carried in your pack is silent. Drag your reward onto the glowing seat to wake its power,
        or use the button below. Taking it out removes that power.<br>
        Your first seating teaches you to recognize relics in the wilds.${isVaultAvailable(this.host.world().account) ? ' More seats await in the Vault.' : ''}
        ${lessonCharm ? `<button data-reliquary-lesson-seat="${lessonCharm.uid}" style="display:block;width:100%;margin-top:8px;white-space:normal">Seat ${esc(lessonCharm.name)}</button>`
          : '<br>Bring your recovered charm from the pack. If it was dropped, retrieve it first.'}
      </div>` : ''}
      <div style="color:#8a8678;font-size:11px;margin:-4px 0 8px">${id === 'reliquary' ? esc(this.host.world().clientActionHook || this.host.seat() !== this.host.world().localSeat ? `Your equipped Relics are empowered: +${Math.round((this.host.seat().meta.relicEmpowerment ?? 0) * 100)}%` : empowermentText(this.host.world().account)) + '<br>Account equipment · Change Relics while out of combat.<br>' : ''}${held.length} seated · ${board.cells} seat${board.cells === 1 ? '' : 's'} open${sealed > 0 ? ` · ${sealed} sealed` : ''}</div>
      <div style="display:flex;justify-content:center">
        ${id === 'reliquary' ? `<button data-reliquary-toggle aria-pressed="${this.host.seat().meta.relicEnabled !== false}" title="${esc(this.host.world().reliquaryRefusal(this.host.seat()) ?? 'Toggle Relic power and its XP tradeoff')}" ${this.host.world().reliquaryRefusal(this.host.seat()) ? 'disabled' : ''}>${this.host.seat().meta.relicEnabled === false ? 'Enable Reliquary' : 'Disable Reliquary'}</button>` : ''}
      </div>
      ${id === 'reliquary' ? `<div class="desc">${this.host.seat().meta.relicEnabled === false ? 'Inactive · no Relic benefits or XP penalty' : `Active · ${Math.round((1 - reliquaryExperience(held)) * 100)}% reduced player XP`}</div>` : ''}
      <div style="display:flex;justify-content:center">
        <div data-bag-grid="c:${esc(id)}" data-container-grid="${esc(id)}"
          style="position:relative;width:${boardW}px;height:${boardH}px">${cells}${tiles}</div>
      </div>
      <div data-drop="containerUnseat:${esc(id)}"
        style="margin-top:10px;padding:7px 8px;text-align:center;color:#6a6478;font-size:10px;background:#120f18;border:1px dashed #2a2634;border-radius:4px">
        ⤓ ${id === 'reliquary' ? 'drop a seated Relic here to return it to the pack' : 'drop a seated piece here to return it to the pack'}
      </div>
      <div style="margin-top:8px;color:#8a8678;font-size:10px;line-height:1.5">
        ${esc(def.blurb)}<br>
        <span style="color:#6a6478">${id === 'reliquary' ? 'Equip from your pack or return a Relic to it while out of combat. Store spare Relics with the Oracle.' : 'Drag a piece from your pack onto an open seat; drag it back to the pack to unseat.'}
        ${isVaultAvailable(this.host.world().account) ? 'Sealed seats open through the Vault.' : ''}</span>
      </div>
      <div style="margin-top:6px;color:#8a8678;font-size:10px">${this.host.lockHintHtml()}</div>`;
    if (live && this.rendered.get(el) === html && el.childElementCount > 0) return;
    this.rendered.set(el, html);
    const scroll = el.scrollTop;
    el.innerHTML = html;
    el.scrollTop = scroll;
    el.querySelector('[data-reliquary-toggle]')?.addEventListener('click', () => {
      this.host.world().requestMeta({ t: 'reliquaryToggle', enabled: this.host.seat().meta.relicEnabled === false });
      this.host.refresh();
    });
    el.querySelector<HTMLButtonElement>('[data-reliquary-lesson-seat]')?.addEventListener('click', ev => {
      const uid = Number((ev.currentTarget as HTMLButtonElement).dataset.reliquaryLessonSeat);
      this.host.world().requestMeta({ t: 'containerPlace', container: id, uid });
      this.host.refresh();
    });

    // THE KEEPER'S MARK, HELD, on the drawer's tiles — the bag's own hold
    // gesture (a tap unseats, a hold locks), through the panel's one seam.
    el.querySelectorAll<HTMLElement>('[data-lock-uid]').forEach(t => t.addEventListener('pointerdown', ev => {
      const pad = this.host.padLock(ev);
      if ((ev.button !== 2 && !pad) || dndCarried()) return;
      const uid = Number(t.dataset.lockUid);
      if (!findCarried(this.host.seat().meta, uid)) return;
      if (!pad) { ev.preventDefault(); ev.stopPropagation(); }
      this.host.beginLockHold(ev, uid, pad);
    }));
    this.host.ownDocked(el);
  }

  /** One seated piece as a tile — the bag's plain gear face (rarity border,
   *  the category glyph, the lock pip), lifted by the fabric as a gearItem.
   *  A seated piece is out of the hammer's reach: it always lifts. */
  private tileHtml(i: ItemInstance, x: number, y: number): string {
    const CELL = this.host.cellPx;
    const s = itemGridSize(i);
    const r = ITEM_RARITIES[i.rarity];
    const cat = ITEM_BASES[i.baseId]?.category ?? 'relic';
    const lock = i.locked
      ? `<span style="position:absolute;top:0;right:1px;font-size:9px;line-height:10px;text-shadow:0 0 3px #000"
          title="Locked: it stays — no salvage, no drop, no sort (${esc(this.host.lockGestureText())} to unlock)">🔒</span>`
      : '';
    return `<div data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
      data-drag="gearItem:${i.uid}" data-drop="gearTile:${i.uid}"
      style="position:absolute;left:${x * CELL}px;top:${y * CELL}px;
      width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:#221e2c;
      border:2px solid ${r.color};border-radius:3px;cursor:var(--cursor-point, pointer);box-sizing:border-box;
      display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
      ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}">${CATEGORY_GLYPHS[cat] ?? '?'}${lock}</div>`;
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
    if (item.relicKey && !found) return { text: 'Stored in the Oracle stash — its lines are inactive.', color: '#8a8678' };
    if (found?.where.kind === 'container') {
      const active = def.id !== 'reliquary' || this.host.seat().meta.relicEnabled !== false;
      return { text: `${def.glyph} Seated in the ${def.label} · ${active ? 'active' : 'inactive'}.`, color: '#c8a84b' };
    }
    if (def.id === 'reliquary' && found?.where.kind === 'bag') {
      return { text: 'Inactive in your pack · lost on death. Equip in the Reliquary or store with the Oracle to keep it.', color: '#c8a84b' };
    }
    if (!containerBoard(def)) {
      return { text: `${def.glyph} Silent in the pack — ${isVaultAvailable(this.host.world().account) ? `the ${def.label} that could seat it waits in the Vault` : `find the ${def.label} to seat it`}.`, color: '#6a6478' };
    }
    return { text: `${def.glyph} Silent in the pack — seat it in the ${def.label} (the ${def.label.toUpperCase()} ribbon beside SKILLS; right-click tap, or drag) to wake its lines.`, color: '#8a8678' };
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
    const accountItem = p.kind === 'relicTile' && containerId === 'reliquary'
      ? this.host.world().account.reliquary.items.find(i => i.uid === Number(p.arg)) : undefined;
    const carried = ['gearItem', 'relicTile'].includes(p.kind) ? findCarried(m, Number(p.arg)) : undefined;
    const found = carried ?? (accountItem ? { item: accountItem } : undefined);
    const from = found ? containerOriginOf(m, found.item.uid) : 'bag';
    const def = CONTAINERS[containerId];
    if (def?.accountStorage && (this.host.world().reliquaryRefusal(this.host.seat())
      || (accountItem && !carried && !this.host.world().canManageAccountRelics(this.host.seat())))
      && !(from === 'bag' && this.host.world().reliquaryLesson())) return { verdict: 'blocked', x, y, w: 1, h: 1, from, why: 'Leave combat before changing Relics.' };
    if (!found || !def) return { verdict: 'blocked', x, y, w: 1, h: 1, from };
    const fromKind = from === 'bag' ? 'bag' : originContainerId(from) === containerId ? 'self' : 'other';
    const level = this.host.world().seatHero(this.host.seat()).level;
    const l = containerLanding(def, containerBoard(def), m.containers[containerId] ?? [], found.item, fromKind,
      x, y, level, m.items, bagBoard());
    if (def.accountStorage && l.with && fromKind !== 'self') {
      const bagged = m.items.includes(found.item), bag = m.items.filter(i => i !== found.item).map(i => ({ ...i })), other = { ...l.with };
      const fits = bagged ? (found.item.x !== undefined && found.item.y !== undefined && placeAt(bag, other, found.item.x, found.item.y)) || autoPlace(bag, other)
        : !!planRelicStorage(this.host.world().account, l.with, undefined, found.item.relicKey);
      if (!fits) return { ...l, verdict: 'blocked', from, why: 'No room for the exchanged Relic.' };
    }
    return { ...l, from };
  }

  /** Register the drawers' drop targets with the fabric (once). */
  registerDnd(): void {
    const world = (): World => this.host.world();
    // A container CELL: seat from the bag, or re-place inside the board.
    registerDropTarget({
      kind: 'containerCell',
      accepts: (p, arg) => {
        const [cid, cx, cy] = arg.split(':');
        return ['gearItem', 'relicTile'].includes(p.kind) && this.landing(p, cid, `${cx}:${cy}`).verdict !== 'blocked';
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
    // THE RETURN STRIP: a seated piece dropped on it unseats, first fit.
    registerDropTarget({
      kind: 'containerUnseat',
      accepts: (p, cid) => {
        if (p.kind !== 'gearItem') return false;
        const found = findCarried(this.host.seat().meta, Number(p.arg));
        if (cid === 'reliquary' && found && (world().reliquaryRefusal(this.host.seat())
          || !autoPlace(this.host.seat().meta.items.map(i => ({ ...i })), { ...found.item }))) return false;
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
