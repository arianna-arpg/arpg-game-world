import { TOWN_PORTAL_CFG } from '../data/townportals';
import type { World } from '../engine/world';
import { keyDisplay, type Settings } from '../meta/settings';
import { iconSvg } from './icons';
import { PORTAL_BUTTON_CFG, portalButtonVisible } from './portalConfig';
import { Z_LADDER } from './zorder';

/** A small independent HUD control. Size is authored in the portal config
 *  so moving it does not touch travel or the skill definition; its SEAT is
 *  the player's (Settings.portalButton.anchor over ui/portalConfig.ts
 *  PORTAL_ANCHORS): 'beside' joins the Menu's adjacent controls; 'menu'
 *  stacks it over the Menu button's live rect —
 *  drawn == seated, so a dragged Menu carries it — 'right' is the classic
 *  corner. `menuRect` is the bar's own read; null (no bar drawn) falls back
 *  to the corner so the button never vanishes with its anchor. */
export class PortalButton {
  readonly element = document.createElement('button');
  private lastVisible: boolean | null = null;
  private lastParent: HTMLElement | null = null;
  private lastDisabled: boolean | null = null;
  private lastHint: string | null = null;
  private lastIdleBind: string | null = null;
  private lastIdleHint = '';
  private lastSize = -1;
  private lastSeatInput = '';
  private lastSeatApplied = '';

  constructor(private world: () => World, private settings: () => Settings,
    private menuRect: () => { x: number; y: number; w: number; h: number } | null = () => null,
    private menuControls: () => HTMLElement | null = () => null) {
    const b = this.element;
    b.id = 'town-portal-button'; b.setAttribute('aria-label', 'Cast Town Portal');
    b.innerHTML = iconSvg('portal');
    Object.assign(b.style, { position: 'fixed', display: 'none', zIndex: String(Z_LADDER.menubar),
      background: '#171c2c', color: TOWN_PORTAL_CFG.color, border: `1px solid ${TOWN_PORTAL_CFG.color}`,
      borderRadius: '6px', cursor: 'var(--cursor-point, pointer)' });
    b.addEventListener('click', () => this.world().requestMeta({ t: 'townPortal' }));
    document.body.append(b);
    this.lastParent = document.body;
    this.lastVisible = false;
  }
  /** Mount and size before the Menu measures its complete control row. */
  sync(running: boolean, blocking: boolean): void {
    const b = this.element, c = TOWN_PORTAL_CFG.button;
    const s = this.settings();
    const options = s.portalButton;
    const visible = portalButtonVisible(options.visibility, running, blocking);
    const parent = (options.anchor === 'beside' ? this.menuControls() : null) ?? document.body;
    const parentChanged = this.lastParent !== parent || b.parentElement !== parent;
    if (b.parentElement !== parent) parent.appendChild(b);
    if (parentChanged || visible !== this.lastVisible || c.size !== this.lastSize) {
      this.lastParent = parent;
      this.lastVisible = visible;
      this.lastSize = c.size;
      this.lastSeatInput = '';
      this.lastSeatApplied = '';
      b.style.display = visible ? 'grid' : 'none';
      if (parent === document.body) {
        Object.assign(b.style, { position: 'fixed', flexShrink: '0',
          width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
      } else {
        Object.assign(b.style, { position: 'relative',
          left: 'auto', top: 'auto', right: 'auto', bottom: 'auto', flexShrink: '0',
          width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
      }
    }
    if (!visible) return;
    const reason = this.world().townPortalRefusal();
    const disabled = !!reason;
    if (disabled !== this.lastDisabled) {
      this.lastDisabled = disabled;
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.45' : '1';
    }
    let hint = reason;
    if (hint === null) {
      const bind = s.keybinds.townPortal;
      if (bind !== this.lastIdleBind) {
        this.lastIdleBind = bind;
        this.lastIdleHint = `Town Portal (${keyDisplay(bind)}) — cast, then linger at the portal`;
      }
      hint = this.lastIdleHint;
    }
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      b.dataset.uiHint = hint;
    }
  }

  /** Independent anchors read the Menu's final position after its sync. */
  seat(): void {
    const b = this.element, c = TOWN_PORTAL_CFG.button;
    if (!this.lastVisible || b.parentElement !== document.body) return;
    const anchor = this.settings().portalButton.anchor;
    const m = anchor === 'menu' ? this.menuRect() : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const inputKey = m
      ? `m|${anchor}|${m.x}|${m.y}|${m.w}|${m.h}|${vw}|${vh}|${c.size}`
      : `c|${anchor}|${vw}|${vh}|${c.size}`;
    if (inputKey === this.lastSeatInput) return;
    this.lastSeatInput = inputKey;
    if (m) {
      // ABOVE THE MENU: centred over the glyph button, a gap above it, in
      // screen px (the button is position:fixed and unzoomed); THE KEEP
      // holds it on screen.
      const k = PORTAL_BUTTON_CFG.keepPx;
      const left = Math.round(Math.max(k, Math.min(m.x + (m.w - c.size) / 2, vw - c.size - k)));
      const top = Math.round(Math.max(k, m.y - PORTAL_BUTTON_CFG.menuGapPx - c.size));
      const applied = `m:${left}:${top}:${c.size}`;
      if (applied === this.lastSeatApplied) return;
      this.lastSeatApplied = applied;
      Object.assign(b.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto',
        width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
    } else {
      const applied = `c:${c.right}:${c.bottom}:${c.size}`;
      if (applied === this.lastSeatApplied) return;
      this.lastSeatApplied = applied;
      Object.assign(b.style, { right: `${c.right}px`, bottom: `${c.bottom}px`, left: 'auto', top: 'auto',
        width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
    }
  }
}
