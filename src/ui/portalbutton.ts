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
  private lastSyncKey = '';
  private lastSeatKey = '';
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
  }
  /** Mount and size before the Menu measures its complete control row. */
  sync(running: boolean, blocking: boolean): void {
    const b = this.element, c = TOWN_PORTAL_CFG.button;
    const options = this.settings().portalButton;
    const visible = portalButtonVisible(options.visibility, running, blocking);
    const parent = (options.anchor === 'beside' ? this.menuControls() : null) ?? document.body;
    const parentChanged = b.parentElement !== parent;
    if (parentChanged) {
      parent.appendChild(b);
      this.lastSyncKey = '';
      this.lastSeatKey = '';
    }
    const isBody = parent === document.body;
    const syncKey = `${visible ? 1 : 0}|${isBody ? 1 : 0}|${c.size}`;
    if (syncKey !== this.lastSyncKey) {
      this.lastSyncKey = syncKey;
      this.lastSeatKey = '';
      b.style.display = visible ? 'grid' : 'none';
      if (isBody) {
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
    const wantDisabled = !!reason;
    if (b.disabled !== wantDisabled) b.disabled = wantDisabled;
    const wantOpacity = reason ? '0.45' : '1';
    if (b.style.opacity !== wantOpacity) b.style.opacity = wantOpacity;
    const wantTitle = reason ?? `Town Portal (${keyDisplay(this.settings().keybinds.townPortal)}) — cast, then linger at the portal`;
    if (b.title !== wantTitle) b.title = wantTitle;
  }

  /** Independent anchors read the Menu's final position after its sync. */
  seat(): void {
    const b = this.element, c = TOWN_PORTAL_CFG.button;
    if (b.style.display === 'none' || b.parentElement !== document.body) return;
    const m = this.settings().portalButton.anchor === 'menu' ? this.menuRect() : null;
    if (m) {
      // ABOVE THE MENU: centred over the glyph button, a gap above it, in
      // screen px (the button is position:fixed and unzoomed); THE KEEP
      // holds it on screen.
      const k = PORTAL_BUTTON_CFG.keepPx;
      const left = Math.round(Math.max(k, Math.min(m.x + (m.w - c.size) / 2, window.innerWidth - c.size - k)));
      const top = Math.round(Math.max(k, m.y - PORTAL_BUTTON_CFG.menuGapPx - c.size));
      const seatKey = `m|${left}|${top}|${c.size}`;
      if (seatKey !== this.lastSeatKey) {
        this.lastSeatKey = seatKey;
        Object.assign(b.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto',
          width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
      }
    } else {
      const seatKey = `r|${c.right}|${c.bottom}|${c.size}`;
      if (seatKey !== this.lastSeatKey) {
        this.lastSeatKey = seatKey;
        Object.assign(b.style, { right: `${c.right}px`, bottom: `${c.bottom}px`, left: 'auto', top: 'auto',
          width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
      }
    }
  }
}
