// ---------------------------------------------------------------------------
// THE MENU BAR — the HUD's one Menu button and the tray it fans.
//
// The DOM half of THE MENU FABRIC (engine/menu.ts folds the pages; data/
// menu.ts names them; ui/icons.ts draws them). This module owns: the root
// (a TS-built surface — no index.html edit — wearing the UI-scale marker
// class and its own stack rung), the BUTTON with its roll-up badge and glow,
// THE DOCK (opt-in: every non-hidden page as an icon tile beside the button),
// THE TRAY (grouped rows: icon · label · live bind · pip; sealed rows greyed
// and unselectable, their why in the tooltip), the anchor seating, and the
// cadenced sync.
//
// THE LAWS:
//   · THE FOLD IS THE TRUTH — every tile reads the one MenuFold the engine
//     computed this beat; the bar never re-derives a state or a count.
//   · REBUILD ONLY ON CHANGE — the tray's DOM is rebuilt when its SIGNATURE
//     (ids · states · pips · lessons · bind labels · dock flag) changes,
//     never on a beat that changed nothing, so a press mid-tray is never
//     swallowed by a re-render (THE PRESS GUARD's lesson, ui/panels.ts).
//   · THE BUTTON IS THE TELL — tray closed, the button wears the roll-up:
//     pips summed as a badge, any lesson as the tutorial glow. Tray (or dock)
//     open, each tile wears its own; the button keeps only the badge.
//   · DRAWN == SEATED — the `bar` anchor seats the button off the cluster
//     rect the renderer PUBLISHED for the hero's drawn HUD this frame.
//   · THE LAYOUT WINS — a seat the player dragged (ui/panelmove.ts, Movable
//     UI) is never overwritten by the anchor until the layout is reset.
//   · ONE VERB TABLE — the UI hands the bar a host table (verb id → open +
//     isOpen); a row naming an unknown verb draws sealed with a plain why
//     and the probe's census names it.
// ---------------------------------------------------------------------------

import { MENU_ENTRIES, menuFold, type MenuEntryView, type MenuFold, type MenuReads } from '../engine/menu';
import { keyDisplay, type Settings } from '../meta/settings';
import { padDisplay } from '../core/gamepad';
import { MENU_CFG, type MenuAnchorId } from './menuConfig';
import { iconSvg } from './icons';
import { hollowWakeMenuHeader } from './brand';
import { bindTooltips, hideTooltip, type TooltipContent } from './tooltip';
import { UI_SCALE_CFG, uiScaleNow } from './uiScale';
import { panelLayoutMovable, panelMoved, panelMoveEpoch } from './panelmove';
import { Z_LADDER } from './zorder';

/** One host verb: open the page for a seat; is it open now? */
export interface MenuVerb {
  open: (seatId?: string) => void;
  isOpen: () => boolean;
}

/** A CSS-px rect (the renderer's published HUD cluster). */
export interface CssRect { x: number; y: number; w: number; h: number }

export interface MenuBarHost {
  /** verb id → the page's open/isOpen pair (ui/panels.ts menuVerbs). */
  verbs: Record<string, MenuVerb>;
  /** The reads a fold needs, minus pageOpen (the bar derives it from the verbs). */
  reads: () => Omit<MenuReads, 'pageOpen'>;
  settings: () => Settings;
  /** The device of the moment — bind labels follow it. */
  padActive: () => boolean;
  /** The hero's drawn HUD cluster (orbs + bar) in CSS px, or null. */
  hudCluster: () => CssRect | null;
  couchActive: () => boolean;
}

const STYLE_ID = 'menu-bar-fabric';
export const MENU_BAR_ID = 'menu-bar';

/** The bar's stylesheet — built from the dials, injected once (HMR-safe).
 *  Colors ride the :root palette; the stack rung reads Z_LADDER. */
export function installMenuBarStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  const T = MENU_CFG.tilePx, R = MENU_CFG.rowIconPx, inset = MENU_CFG.insetPx;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .menu-bar { position: absolute; z-index: ${Z_LADDER.menubar}; display: flex; align-items: flex-end; gap: 8px;
      pointer-events: auto; user-select: none; }
    .menu-bar[data-anchor="left"] { left: ${inset}px; bottom: ${inset}px; }
    .menu-bar[data-anchor="right"] { right: ${inset}px; bottom: ${inset}px; flex-direction: row-reverse; }
    .menu-bar[data-anchor="bar"] { right: ${inset}px; bottom: ${inset}px; }
    .menu-controls { display: contents; }
    .menu-bar.couch[data-anchor="left"], .menu-bar.couch[data-anchor="right"] { bottom: ${MENU_CFG.couchLiftPx}px; }
    .menu-bar > h2.menu-grip { display: none; margin: 0; padding: 0; width: 12px; height: ${T}px; border: 1px solid var(--panel-border);
      border-radius: 6px; background: repeating-linear-gradient(0deg, transparent 0 3px, var(--panel-border) 3px 5px);
      background-clip: content-box; box-sizing: border-box; padding: 6px 3px; font-size: 0; text-transform: none; letter-spacing: 0; }
    .menu-bar.movable-ui > h2.menu-grip { display: block; }
    .menu-bar > h2.menu-grip > .panel-lock { float: none; margin: 0; position: absolute; left: 0; top: -32px; }
    .menu-bar > h2.menu-grip { position: relative; }
    .menu-btn, .menu-tile { position: relative; width: ${T}px; height: ${T}px; padding: 0; display: flex; align-items: center; justify-content: center;
      background: var(--panel-bg); color: var(--gold); border: 1px solid var(--panel-border); border-radius: 8px;
      cursor: var(--cursor-point, pointer); box-shadow: 0 2px 10px rgba(0,0,0,0.6); }
    .menu-btn:hover, .menu-tile:hover:not(.sealed) { border-color: var(--gold); background: #1e1e2c; }
    .menu-btn.lit { background: #2a2a3e; border-color: var(--gold); }
    .menu-tile.sealed { color: var(--text-dim); opacity: 0.4; cursor: var(--cursor-default, default); }
    .menu-bar svg { width: 24px; height: 24px; display: block; }
    .menu-badge { position: absolute; top: -7px; right: -7px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
      background: var(--gold); color: #07070d; font: bold 11px/18px Verdana, sans-serif; text-align: center; box-shadow: 0 1px 4px #000; }
    .menu-pips:not(.tut-glow)::after {
      content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
      border: 1px solid #ffd978; box-shadow: 0 0 14px 3px rgba(240, 192, 64, 0.85);
      will-change: opacity; animation: menu-pips 1.2s ease-in-out infinite alternate;
    }
    @keyframes menu-pips {
      from { opacity: 0.22; }
      to   { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .menu-pips:not(.tut-glow)::after { animation: none; opacity: 0.7; }
    }
    .menu-dock { display: flex; flex-wrap: wrap-reverse; align-items: flex-end; align-content: flex-end; gap: ${MENU_CFG.dockGapPx}px;
      max-width: ${(T + MENU_CFG.dockGapPx) * MENU_CFG.dockCols - MENU_CFG.dockGapPx}px; }
    .menu-bar[data-anchor="right"] .menu-dock { justify-content: flex-end; }
    .menu-tray { position: absolute; bottom: calc(100% + 8px); left: 0; width: 236px; min-width: 0; box-sizing: border-box;
      max-width: calc((100vw - ${2 * inset}px) / var(${UI_SCALE_CFG.cssVar}, 1)); max-height: calc(80vh / var(${UI_SCALE_CFG.cssVar}, 1));
      overflow-y: auto; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 6px; padding: 6px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.7); }
    .menu-bar[data-anchor="right"] .menu-tray { left: auto; right: 0; }
    .menu-group-h { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 8px 3px; }
    .menu-group + .menu-group { border-top: 1px solid var(--panel-border); margin-top: 4px; }
    .menu-row { display: flex; align-items: center; gap: 9px; width: 100%; padding: 5px 8px; text-align: left;
      background: transparent; color: var(--text); border: 1px solid transparent; border-radius: 4px; font-size: 12px;
      cursor: var(--cursor-point, pointer); }
    .menu-row:hover:not(.sealed) { background: #2a2a3e; border-color: var(--panel-border); color: #fff; }
    .menu-row svg { width: ${R}px; height: ${R}px; color: var(--gold); flex: 0 0 auto; }
    .menu-row.sealed { color: var(--text-dim); opacity: 0.55; cursor: var(--cursor-default, default); }
    .menu-row.sealed svg { color: var(--text-dim); }
    .menu-row .menu-key { margin-left: auto; font-size: 10px; color: var(--text-dim); border: 1px solid var(--panel-border);
      padding: 1px 5px; border-radius: 3px; min-width: 18px; text-align: center; }
    .menu-row .menu-pip { min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--gold); color: #07070d;
      font: bold 11px/18px Verdana, sans-serif; text-align: center; }
    .menu-row .menu-key + .menu-pip { margin-left: 4px; }
    .menu-station-primary { display:flex; align-items:stretch; }
    .menu-station-primary > .menu-row:first-child { flex:1; }
    .menu-station-toggle { width:30px; flex:0 0 30px; justify-content:center; padding:5px; }
    .menu-station-children { margin:3px 0 3px 16px; padding-left:5px; border-left:1px solid var(--panel-border); }
  `;
  document.head.appendChild(el);
}

/** The signature a tray rebuild keys on — everything the DOM prints. */
function foldSignature(fold: MenuFold, binds: (v: MenuEntryView) => string, dock: boolean): string {
  return `${dock ? 'D' : 'B'}|` + fold.entries
    .map(e => `${e.def.id}:${e.state}:${e.attention.pips}:${e.attention.lesson ? 1 : 0}:${binds(e)}`)
    .join('|');
}

export class MenuBar {
  readonly root: HTMLElement;
  /** Adjacent HUD controls participate in sizing, scaling and dragging. */
  readonly controls: HTMLElement;
  private readonly btn: HTMLButtonElement;
  private readonly badge: HTMLElement;
  private readonly dock: HTMLElement;
  private readonly tray: HTMLElement;
  trayOpen = false;
  private stationsExpanded = false;
  private fold: MenuFold | null = null;
  private signature = '';
  private clock: number = MENU_CFG.syncSec; // the first sync folds at once
  private force = true;
  private ownW = 0;
  private ownH = 0;
  private ownSizeDirty = true;
  private lastScale = -1;
  private lastVw = -1;
  private lastCtrlSig = '';
  private lastMovable: boolean | null = null;
  private lastCouch: boolean | null = null;
  private lastDockShown: boolean | null = null;
  private lastBarSeatKey = '';
  private lastAppliedLeft = '';
  private lastAppliedTop = '';
  private lastTraySeatKey = '';
  private cachedBtnRect: CssRect | null = null;
  private btnRectDirty = true;
  private btnRectEpoch = -1;
  private btnRectScale = -1;
  private btnRectVw = -1;
  private btnRectVh = -1;
  private verbMapCache: Map<string, string> | null = null;
  private verbMapLen = -1;

  constructor(private host: MenuBarHost) {
    installMenuBarStyles();
    const root = document.createElement('div');
    root.id = MENU_BAR_ID;
    root.className = `menu-bar ${UI_SCALE_CFG.markerClass} hidden`;
    root.dataset.anchor = MENU_CFG.anchorDefault;
    // THE RIBBON IS THE HANDLE (ui/panelmove.ts): the grip is the root's h2.
    const grip = document.createElement('h2');
    grip.className = 'menu-grip';
    grip.dataset.uiHint = 'Drag to move the menu bar (Movable UI). Double-click to return it to its seat.';
    grip.textContent = 'Menu bar';
    root.appendChild(grip);
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.className = 'menu-btn';
    this.btn.dataset.menuToggle = '1';
    this.btn.dataset.tip = 'menu';
    this.btn.dataset.entry = '';
    this.btn.setAttribute('aria-label', 'Menu');
    this.btn.innerHTML = `${iconSvg('menu')}<span class="menu-badge hidden"></span>`;
    this.badge = this.btn.querySelector<HTMLElement>('.menu-badge')!;
    root.appendChild(this.btn);
    this.controls = document.createElement('div');
    this.controls.className = 'menu-controls';
    root.appendChild(this.controls);
    this.dock = document.createElement('div');
    this.dock.className = 'menu-dock hidden';
    root.appendChild(this.dock);
    this.tray = document.createElement('div');
    this.tray.className = 'menu-tray hidden';
    this.tray.setAttribute('role', 'menu');
    root.appendChild(this.tray);
    document.body.appendChild(root);
    this.root = root;
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (root.classList.contains('hidden')) return;
        this.btnRectDirty = true;
        const r = root.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (Math.abs(r.width - this.ownW) > 0.5 || Math.abs(r.height - this.ownH) > 0.5)) {
          this.ownSizeDirty = true;
          this.btnRectDirty = true;
          this.lastBarSeatKey = '';
          this.lastTraySeatKey = '';
        }
      });
      ro.observe(root);
    }
    window.addEventListener('resize', () => {
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
      this.lastBarSeatKey = '';
      this.lastTraySeatKey = '';
      this.seatTray();
    });

    // ONE delegated click per root — rebuilt rows stay live.
    root.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('[data-menu-toggle]')) { this.toggleTray(); return; }
      if (e.target.closest('[data-stations-toggle]')) {
        this.stationsExpanded = !this.stationsExpanded;
        hideTooltip();
        this.paint();
        this.tray.querySelector<HTMLButtonElement>('[data-stations-toggle]')?.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('[data-nearby-station]')) {
        // Recheck proximity and unlocks at the press, not the last UI beat.
        this.refold();
        const nearby = this.nearbyStation();
        if (nearby) this.pick(nearby.def.id); else this.paint();
        return;
      }
      const row = e.target.closest<HTMLElement>('[data-menu-entry]');
      if (!row || row.classList.contains('sealed')) return;
      this.pick(row.dataset.menuEntry!);
    });
    // A press anywhere else folds the tray (the canvas, a panel, the pad
    // pointer's synthetic press alike) — capture-phase so a consumer that
    // stops propagation can't strand it open.
    window.addEventListener('pointerdown', (e) => {
      if (this.trayOpen && e.target instanceof Node && !root.contains(e.target)) this.closeTray();
    }, { capture: true });
    bindTooltips(root, (el) => el.dataset.tip === 'menu' ? this.tipFor(el.dataset.entry ?? '')
      : el.dataset.tip === 'nearby-station' ? {
        title: 'Interact with nearby',
        description: this.nearbyStation() ? `Open ${this.nearbyStation()!.def.label}. Expand the arrow to choose an individual station.`
          : 'Approach an available station to interact. Expand the arrow to browse your unlocked stations.',
      } : null);
  }

  /** Is the tray up (a blocking surface for the pad pointer's sake)? */
  isTrayOpen(): boolean { return this.trayOpen; }

  toggleTray(): void { if (this.trayOpen) this.closeTray(); else this.openTray(); }

  openTray(): void {
    if (this.root.classList.contains('hidden')) return;
    this.trayOpen = true;
    this.force = true;
    this.paint();
  }

  closeTray(): void {
    if (!this.trayOpen) return;
    this.trayOpen = false;
    hideTooltip();
    // Dismissal returns control to gameplay. Escape can turn the clicked
    // trigger's retained focus into :focus-visible; do not leave it glowing.
    // A picked page may already own focus, so release only this tray's focus.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && (focused === this.btn || this.tray.contains(focused))) focused.blur();
    this.paint();
  }

  /** The glyph button's drawn box (screen px) while the bar stands — the
   *  Town Portal button's 'menu' anchor seats off it every sync (drawn ==
   *  seated: a dragged or re-anchored Menu carries the portal with it). */
  buttonRect(): CssRect | null {
    if (this.root.classList.contains('hidden')) {
      this.cachedBtnRect = null;
      this.btnRectDirty = true;
      return null;
    }
    const epoch = panelMoveEpoch();
    const scale = uiScaleNow() || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (
      !this.btnRectDirty
      && !this.ownSizeDirty
      && epoch === this.btnRectEpoch
      && scale === this.btnRectScale
      && vw === this.btnRectVw
      && vh === this.btnRectVh
    ) {
      return this.cachedBtnRect;
    }
    const r = this.btn.getBoundingClientRect();
    this.cachedBtnRect = r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    this.btnRectDirty = false;
    this.btnRectEpoch = epoch;
    this.btnRectScale = scale;
    this.btnRectVw = vw;
    this.btnRectVh = vh;
    return this.cachedBtnRect;
  }

  /** The tray's drawn box while up (the speech fabric's obstruction census). */
  trayRect(): CssRect | null {
    if (!this.trayOpen) return null;
    const r = this.tray.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  }

  /** Re-fold on the next sync regardless of the cadence (a page opened or
   *  closed, a setting flipped). */
  invalidate(): void { this.force = true; }

  /** Once per frame: visibility, seating, the cadenced fold + paint. */
  sync(dt: number, visible: boolean): void {
    const root = this.root;
    if (!visible) {
      if (!root.classList.contains('hidden')) {
        root.classList.add('hidden');
        this.trayOpen = false;
        this.tray.classList.add('hidden');
        this.lastTraySeatKey = '';
        this.cachedBtnRect = null;
        this.btnRectDirty = true;
      }
      return;
    }
    if (root.classList.contains('hidden')) {
      root.classList.remove('hidden');
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
      this.lastBarSeatKey = '';
      this.lastTraySeatKey = '';
    }
    const s = this.host.settings();
    const anchor: MenuAnchorId = s.menuBar.anchor;
    if (root.dataset.anchor !== anchor) {
      root.dataset.anchor = anchor;
      if (!panelMoved(root)) this.clearInlineSeat();
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
      this.lastTraySeatKey = '';
      this.force = true;
    }
    const couch = this.host.couchActive();
    if (couch !== this.lastCouch) {
      this.lastCouch = couch;
      root.classList.toggle('couch', couch);
      this.btnRectDirty = true;
      this.lastTraySeatKey = '';
    }
    const movable = panelLayoutMovable();
    if (movable !== this.lastMovable) {
      this.lastMovable = movable;
      root.classList.toggle('movable-ui', movable);
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
      this.lastTraySeatKey = '';
    }
    const firstCtrl = this.controls.firstElementChild as HTMLElement | null;
    const ctrlSig = `${this.controls.childElementCount}:${firstCtrl ? firstCtrl.style.display : ''}`;
    if (ctrlSig !== this.lastCtrlSig) {
      this.lastCtrlSig = ctrlSig;
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
      this.lastTraySeatKey = '';
    }
    this.clock += dt;
    if (this.force || this.clock >= MENU_CFG.syncSec) {
      this.clock = 0;
      this.force = false;
      this.refold();
      this.paint(false);
    }
    if (anchor === 'bar') this.seatByBar();
    this.seatTray();
  }

  // --- the fold ----------------------------------------------------------------

  private reads(): MenuReads {
    const base = this.host.reads();
    if (!this.verbMapCache || this.verbMapLen !== MENU_ENTRIES.length) {
      this.verbMapCache = new Map(MENU_ENTRIES.map(e => [e.id, e.verb] as const));
      this.verbMapLen = MENU_ENTRIES.length;
    }
    const verbOf = this.verbMapCache;
    return {
      ...base,
      pageOpen: (entryId) => {
        const v = verbOf.get(entryId);
        return v ? this.host.verbs[v]?.isOpen() ?? false : false;
      },
    };
  }

  private refold(): void {
    this.fold = menuFold(this.reads());
  }

  private bindLabel(v: MenuEntryView): string {
    if (v.def.keyLabel) return v.def.keyLabel;
    if (!v.def.bind) return '';
    const s = this.host.settings();
    const pad = s.padBinds[v.def.bind];
    if (this.host.padActive() && pad) return padDisplay(pad);
    const key = s.keybinds[v.def.bind];
    return key ? keyDisplay(key) : pad ? padDisplay(pad) : '';
  }

  // --- painting ----------------------------------------------------------------

  private paint(seatNow = true): void {
    const fold = this.fold;
    if (!fold) return;
    const s = this.host.settings();
    const dock = s.menuBar.dock;
    const sig = foldSignature(fold, v => this.bindLabel(v), dock) + (this.trayOpen ? '|open' : '|shut')
      + (this.stationsExpanded ? '|stations' : '');
    // The button's roll-up: the badge always; the glow only while the tray
    // and the dock are not showing the tiles that carry their own.
    const tilesShown = this.trayOpen || dock;
    const badge = this.badge;
    const n = fold.total.pips;
    const badgeText = n > MENU_CFG.pipMax ? `${MENU_CFG.pipMax}+` : String(n);
    badge.classList.toggle('hidden', n <= 0);
    if (n > 0 && badge.textContent !== badgeText) badge.textContent = badgeText;
    this.btn.classList.toggle('menu-pips', n > 0 && !tilesShown);
    this.btn.classList.toggle('tut-glow', fold.total.lesson && !tilesShown);
    this.btn.classList.toggle('lit', this.trayOpen);
    this.tray.classList.toggle('hidden', !this.trayOpen);
    if (dock !== this.lastDockShown) {
      this.lastDockShown = dock;
      this.dock.classList.toggle('hidden', !dock);
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
    }
    if (sig === this.signature) { if (seatNow) this.seatTray(); return; }
    this.signature = sig;
    this.lastTraySeatKey = '';
    if (dock) {
      this.dock.innerHTML = fold.entries.map(v => this.tileHtml(v)).join('');
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
    }
    this.tray.innerHTML = hollowWakeMenuHeader() + fold.groups.map(g => `
      <div class="menu-group">
        <div class="menu-group-h">${escapeHtml(g.group.label)}</div>
        ${g.group.id === 'town' ? this.stationsHtml(g.entries) : g.entries.map(v => this.rowHtml(v)).join('')}
      </div>`).join('');
    // The opening/expansion is already visible; seat it before another game tick.
    if (seatNow) this.seatTray();
  }

  /** The same gated station rows feed both the shortcut and its disclosure.
   *  At a shared counter, registry order prefers the vendor's station suite. */
  private nearbyStation(): MenuEntryView | undefined {
    return this.fold?.groups.find(g => g.group.id === 'town')?.entries
      .find(v => v.state === 'open' && !!this.host.verbs[v.def.verb]);
  }

  private stationsHtml(entries: MenuEntryView[]): string {
    const nearby = this.nearbyStation();
    return `<div class="menu-station-primary">
      <button type="button" class="menu-row${nearby ? '' : ' sealed'}" role="menuitem"
        data-nearby-station data-tip="nearby-station"${nearby ? '' : ' aria-disabled="true"'}>
        ${iconSvg('anvil')}<span class="menu-label">Interact with nearby</span>
      </button>
      <button type="button" class="menu-row menu-station-toggle" data-stations-toggle role="menuitem"
        aria-label="${this.stationsExpanded ? 'Collapse' : 'Expand'} stations" aria-expanded="${this.stationsExpanded}"
        aria-controls="menu-station-children">${this.stationsExpanded ? '▾' : '▸'}</button>
      </div>
      <div id="menu-station-children" class="menu-station-children${this.stationsExpanded ? '' : ' hidden'}">
        ${entries.map(v => this.rowHtml(v)).join('')}
      </div>`;
  }

  private pipHtml(v: MenuEntryView, cls: string): string {
    const n = v.attention.pips;
    if (n <= 0) return '';
    return `<span class="${cls}">${n > MENU_CFG.pipMax ? `${MENU_CFG.pipMax}+` : n}</span>`;
  }

  private tileHtml(v: MenuEntryView): string {
    const sealed = v.state !== 'open';
    const glow = sealed ? '' : v.attention.lesson ? ' tut-glow' : v.attention.pips > 0 ? ' menu-pips' : '';
    return `<button type="button" class="menu-tile${sealed ? ' sealed' : ''}${glow}" data-menu-entry="${v.def.id}" data-tip="menu" data-entry="${v.def.id}"
      aria-label="${escapeHtml(v.def.label)}"${sealed ? ' aria-disabled="true"' : ''}>${iconSvg(v.def.icon)}${this.pipHtml(v, 'menu-badge')}</button>`;
  }

  private rowHtml(v: MenuEntryView): string {
    const sealed = v.state !== 'open';
    const glow = sealed ? '' : v.attention.lesson ? ' tut-glow' : '';
    const key = this.bindLabel(v);
    return `<button type="button" class="menu-row${sealed ? ' sealed' : ''}${glow}" data-menu-entry="${v.def.id}" data-tip="menu" data-entry="${v.def.id}"
      role="menuitem"${sealed ? ' aria-disabled="true"' : ''}>${iconSvg(v.def.icon)}<span class="menu-label">${escapeHtml(v.def.label)}</span>
      ${key ? `<span class="menu-key">${escapeHtml(key)}</span>` : ''}${this.pipHtml(v, 'menu-pip')}</button>`;
  }

  private tipFor(entryId: string): TooltipContent | null {
    if (!entryId) {
      const s = this.host.settings();
      const key = this.host.padActive() && s.padBinds.panelMenu ? padDisplay(s.padBinds.panelMenu) : keyDisplay(s.keybinds.panelMenu);
      return { title: 'Menu', description: 'Every page in one place — the ones you have unlocked, greyed where they cannot be used from here.', meta: key };
    }
    const v = this.fold?.entries.find(e => e.def.id === entryId);
    if (!v) return null;
    const key = this.bindLabel(v);
    const pips = v.attention.pips > 0 ? ` · ${v.attention.pips} unspent` : '';
    return {
      title: v.def.label,
      description: v.state === 'sealed' ? v.sealedHint : (v.def.blurb ?? ''),
      meta: (key ? `${key}${pips}` : pips.slice(3)) || undefined,
    };
  }

  // --- verbs -------------------------------------------------------------------

  /** Shared live gate for menu tiles and dialogue actions; cached paint is
   * never permission to use a station after walking away. */
  refusal(entryId: string): string | null {
    const v = menuFold(this.reads()).entries.find(e => e.def.id === entryId);
    if (!v || !this.host.verbs[v.def.verb]) return 'This feature is unavailable.';
    return v.state === 'open' ? null : v.sealedHint || 'This feature is unavailable here.';
  }

  pick(entryId: string): boolean {
    if (this.refusal(entryId) !== null) return false;
    const v = MENU_ENTRIES.find(e => e.id === entryId)!;
    const verb = this.host.verbs[v.verb];
    hideTooltip();
    verb.open();
    if (MENU_CFG.closeOnPick) this.closeTray();
    this.force = true;
    return true;
  }

  // --- seating -----------------------------------------------------------------

  /** A bar beside the mana orb can be closer to the edge than its tray is
   *  wide. Keep the tray readable without moving its control row. */
  private seatTray(): void {
    if (!this.trayOpen) {
      this.lastTraySeatKey = '';
      return;
    }
    const scale = uiScaleNow() || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const st = this.root.style;
    const key = `${this.root.dataset.anchor}|${this.lastCouch ? 1 : 0}|${st.left}|${st.top}|${panelMoveEpoch()}|${vw}|${vh}|${scale}|${this.signature}`;
    if (key === this.lastTraySeatKey) return;
    this.lastTraySeatKey = key;
    const root = this.root.getBoundingClientRect(), tray = this.tray.getBoundingClientRect();
    const wanted = this.root.dataset.anchor === 'right' ? root.right - tray.width : root.left;
    const left = Math.max(MENU_CFG.insetPx, Math.min(wanted, vw - tray.width - MENU_CFG.insetPx));
    const above = root.top - 8 * scale - tray.height;
    const top = Math.max(MENU_CFG.insetPx, Math.min(above, vh - tray.height - MENU_CFG.insetPx));
    this.tray.style.left = `${(left - root.left) / scale}px`;
    this.tray.style.right = 'auto';
    this.tray.style.top = `${(top - root.top) / scale}px`;
    this.tray.style.bottom = 'auto';
  }

  private clearInlineSeat(): void {
    this.lastBarSeatKey = '';
    this.lastAppliedLeft = '';
    this.lastAppliedTop = '';
    this.lastTraySeatKey = '';
    this.btnRectDirty = true;
    const st = this.root.style;
    if (st.left || st.top || st.right || st.bottom || st.transform) {
      st.left = ''; st.top = ''; st.right = ''; st.bottom = ''; st.transform = '';
    }
  }

  /** `bar` anchor: seat just right of the hero's drawn cluster — the
   *  renderer's published rect, converted by THE ZOOM LAW into the root's
   *  own px. A dragged seat (Movable UI) wins. */
  private seatByBar(): void {
    if (panelMoved(this.root)) {
      this.lastBarSeatKey = '';
      return;
    }
    const c = this.host.hudCluster();
    if (!c) { this.clearInlineSeat(); return; }
    const z = uiScaleNow() || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (z !== this.lastScale || vw !== this.lastVw) {
      this.lastScale = z;
      this.lastVw = vw;
      this.ownSizeDirty = true;
      this.btnRectDirty = true;
    }
    const st = this.root.style;
    if (this.ownSizeDirty || this.ownW <= 0 || this.ownH <= 0) {
      if (st.left) st.left = '0px';
      const own = this.root.getBoundingClientRect();
      this.ownW = own.width;
      this.ownH = own.height;
      this.ownSizeDirty = false;
      this.btnRectDirty = true;
    }
    const clusterBottom = c.y + c.h;
    const key = `${c.x}|${clusterBottom}|${c.w}|${vw}|${vh}|${z}|${this.ownW}|${this.ownH}`;
    if (key === this.lastBarSeatKey && st.left === this.lastAppliedLeft && st.top === this.lastAppliedTop) return;
    // THE KEEP (ui/panelmove.ts's law): the whole bar stays on screen — a
    // wide dock on a narrow window slides left rather than off the edge.
    const left = Math.max(MENU_CFG.insetPx, Math.min(c.x + c.w + MENU_CFG.barGapPx, vw - this.ownW - MENU_CFG.insetPx));
    const leftPx = `${Math.round(left / z)}px`;
    st.right = 'auto'; st.bottom = 'auto'; st.transform = 'none';
    st.left = leftPx;
    if (left + this.ownW > vw - MENU_CFG.insetPx) {
      const wrapped = this.root.getBoundingClientRect();
      this.ownW = wrapped.width;
      this.ownH = wrapped.height;
    }
    const top = clusterBottom - this.ownH;
    const topPx = `${Math.round(Math.max(0, top) / z)}px`;
    st.top = topPx;
    this.lastBarSeatKey = `${c.x}|${clusterBottom}|${c.w}|${vw}|${vh}|${z}|${this.ownW}|${this.ownH}`;
    this.lastAppliedLeft = leftPx;
    this.lastAppliedTop = topPx;
    this.lastTraySeatKey = '';
    this.btnRectDirty = true;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
