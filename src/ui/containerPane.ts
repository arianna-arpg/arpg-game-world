/** Container boards register inventory pages on first use. InventoryPages owns
 * their lifecycle; this module renders boards, ribbons and item gestures.
 * See docs/ui/inventory-pages.md and docs/engine/containers.md. */

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
import { itemFaceHtml } from '../render/itemIcons';
import { RELIC_ART, reliquarySealSvg, reliquaryBackdropHtml, reliquaryPaneFieldHtml } from '../render/relicArt';
import { mountRuneFields } from './runeField';
import type { Seat, World } from '../engine/world';
import { reliquarySummaryHtml, reliquaryRulesHtml } from './reliquary';
import { RELIC_COPY } from './reliquaryPresentation';
import { iconSvg } from './icons';
import { isVaultAvailable } from '../meta/account';
import { planRelicStorage } from '../engine/accountReliquary';
import { BUILD_PANEL_CFG } from './buildPanels';
import { currentInterfaceStyle, decorateInventoryPanel, onRuneActivityChange } from './interfaceStyle';
import type { InventoryPages, InventoryPageRequest } from './inventoryPages';

/** What the drawers need from the panel that hosts them — read live, never
 *  held. The folio ids (`container:<id>`) and the docking law stay the
 *  panel's: the pane hands it a bare container id and a root. */
export interface ContainerPaneHost {
  world(): World;
  /** The inventory panel's owning seat (the couch lens). */
  seat(): Seat;
  pages: InventoryPages;
  /** Re-render the inventory (which re-renders every open drawer) + the sheet. */
  refresh(): void;
  /** The bag's cell size in CSS px (the tiles share it). */
  cellPx: number;
  /** A salvage lane is armed on the panel. */
  breaking(): boolean;
  lockGestureText(): string;
  lockHintHtml(): string;
  closeGlyphHtml(): string;
  /** Item tooltips on a minted root (the inventory's resolver). */
  bindItemTooltips(el: HTMLElement): void;
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
  /** The minted roots, by container id. */
  private readonly panels = new Map<string, HTMLElement>();
  private readonly rendered = new WeakMap<HTMLElement, string>();
  private stopAmbience?: () => void;

  constructor(private readonly host: ContainerPaneHost) {}

  // ------------------------------------------------------------- reads ----

  /** Every container that EXISTS for the run (rung 0 owned — the existence
   *  law; on a client, the host's shipped boards). */
  owned(): ContainerDef[] {
    return CONTAINER_DEFS.filter(c => containerBoard(c) !== null);
  }

  /** A drawer stands open (its board still exists for the run). */
  isOpen(id: string): boolean {
    return this.host.pages.isOpen(`container:${id}`);
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
      return `<button data-containerflap="${esc(c.id)}" class="build-ribbon ${reliquaryLesson ? 'tut-glow' : ''}" aria-expanded="${this.isOpen(c.id)}"
          aria-controls="${containerPanelId(c.id)}" title="${esc(c.blurb)}">
          <span class="build-ribbon-label">${iconSvg(c.icon, 'relic-ribbon-icon')} ${esc(c.label.toUpperCase())}${reliquaryLesson ? '<span class="build-ribbon-hint"> · LESSON</span>' : ''}</span>
          <span class="build-ribbon-count" title="${n} equipped · ${board.cells} cells open">${n}</span>
        </button>`;
    }).join('');
  }

  /** Wire the ribbons after an inventory render. */
  wireRibbons(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('button[data-containerflap]').forEach(btn =>
      btn.addEventListener('click', () => this.toggle(btn.dataset.containerflap!, this.host.seat().id, 'toggle-page')));
  }

  // ----------------------------------------------------------- drawers ----

  /** The shared request distinguishes page-only ribbons from workspace toggles. */
  toggle(id: string, seatId = this.host.seat().id, mode: InventoryPageRequest = 'toggle'): void {
    const def = CONTAINERS[id];
    if (!def || !containerBoard(def)) return;
    this.paneFor(id);
    this.host.pages.request(`container:${id}`, seatId, mode);
  }

  /** Menu requests use the local player unless a couch owner is supplied. */
  openFromMenu(id: string, seatId?: string): void {
    this.toggle(id, seatId ?? this.host.world().localSeat.id);
  }

  /** Re-render every open drawer (the inventory's beat). */
  renderAll(live = false): void {
    for (const id of this.panels.keys()) if (this.isOpen(id)) this.render(id, live);
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
    if (id === 'reliquary') for (const [key, value] of Object.entries(RELIC_ART.layout)) el.style.setProperty(key, value);
    document.body.appendChild(el);
    this.panels.set(id, el);
    this.host.bindItemTooltips(el);
    this.host.pages.register({ id: `container:${id}`, el,
      title: () => def?.label ?? id, width: BUILD_PANEL_CFG.containerWidth,
      available: () => !!CONTAINERS[id] && containerBoard(CONTAINERS[id]) !== null,
      refresh: () => { hideTooltip(); this.render(id); } });
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
            style="${px}background:var(--inv-cell-fill,#16131d);border:1px solid ${reliquaryLesson ? '#e4cb97;box-shadow:inset 0 0 12px #9b805566' : 'var(--inv-cell-edge,#2a2634)'}"></div>`;
        } else if (boardOpenAt(full, x, y)) {
          const rung = containerRungAt(def, x, y);
          cells += `<div class="relic-cell-sealed" title="${esc(rung ? `Sealed: opens with ${rung.label}${isVaultAvailable(this.host.world().account) ? ' (the Vault)' : ''}` : 'Sealed')}" aria-label="Sealed cell"
            style="${px}"><span aria-hidden="true">◇</span></div>`;
        }
      }
    }
    const tiles = held.map(i => (i.x !== undefined && i.y !== undefined) ? this.tileHtml(i, i.x, i.y) : '').join('');
    const sealed = full.cells - board.cells;

    const relic = id === 'reliquary';
    const html = `${this.host.closeGlyphHtml()}<h2>${iconSvg(def.icon, 'relic-heading-icon')} ${esc(def.label)}</h2>
      ${relic ? `<div class="relic-pane-region" data-relic-region="upper">${reliquaryPaneFieldHtml('upper')}` : ''}
      ${relic ? reliquarySummaryHtml(this.host.world(), this.host.seat(), held, board.cells) : `<p class="relic-caption">${held.length} seated · ${board.cells} cells open${sealed > 0 ? ` · ${sealed} sealed` : ''}</p>`}
      ${reliquaryLesson ? `<div class="relic-lesson">
        <strong>${RELIC_COPY.lessonTitle}</strong><p>${RELIC_COPY.lessonHint}</p>
        ${lessonCharm ? `<button type="button" data-reliquary-lesson-seat="${lessonCharm.uid}">Seat ${esc(lessonCharm.name)}</button>`
          : `<p>${RELIC_COPY.lessonMissing}</p>`}
      </div>` : ''}
      <div class="relic-board-caption"><span>${held.length} ${relic ? held.length === 1 ? 'Relic' : 'Relics' : held.length === 1 ? 'item' : 'items'} equipped</span><span>${sealed > 0 ? `${sealed} cells sealed` : 'All cells unlocked'}</span></div>
      ${relic ? '</div>' : ''}
      <div class="relic-board-frame ${relic ? 'relic-casket' : ''}" ${relic ? `data-relic-awake="${this.host.seat().meta.relicEnabled !== false && held.length > 0}" style="--relic-grid-w:${boardW}px;--relic-grid-h:${boardH}px"` : ''}>
        ${relic ? `${reliquaryBackdropHtml()}<div class="relic-casket-crest" aria-hidden="true"><span></span></div><div class="relic-case-shell">${reliquarySealSvg()}` : ''}
        <div data-bag-grid="c:${esc(id)}" data-container-grid="${esc(id)}"
          style="position:relative;width:${boardW}px;height:${boardH}px">${cells}${tiles}</div>
        ${relic ? `</div><div class="relic-casket-inscription runescript" aria-hidden="true">${RELIC_COPY.caseInscription}</div>` : ''}
      </div>
      ${relic ? `<div class="relic-pane-region" data-relic-region="lower">${reliquaryPaneFieldHtml('lower')}` : ''}
      <div class="relic-return" data-drop="containerUnseat:${esc(id)}" title="${relic ? RELIC_COPY.returnTitle : 'Drop an equipped item here to return it to your pack.'}">↓ ${RELIC_COPY.returnHint}</div>
      <p class="relic-caption">${relic ? RELIC_COPY.equipHint : 'Drag items from your pack into open cells.'}</p>
      ${relic ? reliquaryRulesHtml(this.host.world(), this.host.lockHintHtml()) + '</div>' : `<p class="relic-caption">${esc(def.blurb)}</p><p class="relic-caption">${this.host.lockHintHtml()}</p>`}`;
    if (this.rendered.get(el) === html && el.childElementCount > 0) return;
    this.rendered.set(el, html);
    const scroll = el.scrollTop;
    const details = [...el.querySelectorAll<HTMLDetailsElement>('details[data-relic-details][open]')].map(d => d.dataset.relicDetails);
    const toggleFocused = document.activeElement === el.querySelector('[data-reliquary-toggle]');
    if (relic) this.stopAmbience?.();
    el.innerHTML = html;
    decorateInventoryPanel(el);
    for (const detail of el.querySelectorAll<HTMLDetailsElement>('details[data-relic-details]')) detail.open = details.includes(detail.dataset.relicDetails);
    if (toggleFocused) el.querySelector<HTMLButtonElement>('[data-reliquary-toggle]')?.focus({ preventScroll: true });
    el.scrollTop = scroll;
    if (relic) {
      const fields = mountRuneFields(el, RELIC_ART.ambience.enabled ? [el.querySelector<HTMLElement>('.relic-casket')!] : [],
        currentInterfaceStyle().runeActivity);
      const unsubscribe = onRuneActivityChange(fields.setActivity);
      this.stopAmbience = () => { unsubscribe(); fields.dispose(); };
    }
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
  }

  /** One seated piece as a tile — the bag's plain gear face (rarity border,
   *  the shared item face, the lock pip), lifted by the fabric as a gearItem.
   *  A seated piece is out of the hammer's reach: it always lifts. */
  private tileHtml(i: ItemInstance, x: number, y: number): string {
    const CELL = this.host.cellPx;
    const s = itemGridSize(i);
    const r = ITEM_RARITIES[i.rarity];
    const lock = i.locked
      ? `<span style="position:absolute;top:0;right:1px;font-size:9px;line-height:10px;text-shadow:0 0 3px #000"
          title="Locked: it stays — no salvage, no drop, no sort (${esc(this.host.lockGestureText())} to unlock)">🔒</span>`
      : '';
    return `<div class="bag-item-tile" data-tip="item" data-item-uid="${i.uid}" data-bag-item="1" data-lock-uid="${i.uid}"
      data-drag="gearItem:${i.uid}" data-drop="gearTile:${i.uid}"
      style="position:absolute;left:${x * CELL}px;top:${y * CELL}px;
      width:${s.w * CELL - 2}px;height:${s.h * CELL - 2}px;background:var(--inv-item-fill,#221e2c);
      border:2px solid ${r.color};border-radius:3px;cursor:var(--cursor-point, pointer);box-sizing:border-box;
      display:flex;align-items:center;justify-content:center;font-size:${Math.min(s.w, s.h) > 1 ? 16 : 12}px;
      ${i.rarity === 'unique' ? `box-shadow:0 0 10px ${r.color};` : ''}">${itemFaceHtml(i.baseId)}${lock}</div>`;
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
    if (item.relicKey && !found) return { text: RELIC_COPY.storedNote, color: '#8a8678' };
    if (found?.where.kind === 'container') {
      const active = def.id !== 'reliquary' || this.host.seat().meta.relicEnabled !== false;
      return { text: `${def.glyph} Seated in the ${def.label} · ${active ? 'active' : 'inactive'}.`, color: '#c8a84b' };
    }
    if (def.id === 'reliquary' && found?.where.kind === 'bag') {
      return { text: RELIC_COPY.packNote, color: '#c8a84b' };
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
