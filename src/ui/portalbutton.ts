import { TOWN_PORTAL_CFG } from '../data/townportals';
import type { World } from '../engine/world';
import { keyDisplay, type Settings } from '../meta/settings';
import { iconSvg } from './icons';
import { PORTAL_BUTTON_CFG } from './portalConfig';
import { Z_LADDER } from './zorder';

/** A small independent HUD control. Size is authored in the portal config
 *  so moving it does not touch travel or the skill definition; its SEAT is
 *  the player's (Settings.portalButton.anchor over ui/portalConfig.ts
 *  PORTAL_ANCHORS): 'menu' stacks it over the Menu button's live rect —
 *  drawn == seated, so a dragged Menu carries it — 'right' is the classic
 *  corner. `menuRect` is the bar's own read; null (no bar drawn) falls back
 *  to the corner so the button never vanishes with its anchor. */
export class PortalButton {
  readonly element = document.createElement('button');
  constructor(private world: () => World, private settings: () => Settings,
    private menuRect: () => { x: number; y: number; w: number; h: number } | null = () => null) {
    const b = this.element;
    b.id = 'town-portal-button'; b.setAttribute('aria-label', 'Cast Town Portal');
    b.innerHTML = iconSvg('portal');
    Object.assign(b.style, { position: 'fixed', display: 'none', zIndex: String(Z_LADDER.menubar),
      background: '#171c2c', color: TOWN_PORTAL_CFG.color, border: `1px solid ${TOWN_PORTAL_CFG.color}`,
      borderRadius: '6px', cursor: 'var(--cursor-point, pointer)' });
    b.addEventListener('click', () => this.world().requestMeta({ t: 'townPortal' }));
    document.body.append(b);
  }
  sync(visible: boolean): void {
    const b = this.element, c = TOWN_PORTAL_CFG.button;
    b.style.display = visible ? 'grid' : 'none';
    if (!visible) return;
    const m = this.settings().portalButton.anchor === 'menu' ? this.menuRect() : null;
    if (m) {
      // ABOVE THE MENU: centred over the glyph button, a gap above it, in
      // screen px (the button is position:fixed and unzoomed); THE KEEP
      // holds it on screen.
      const k = PORTAL_BUTTON_CFG.keepPx;
      const left = Math.max(k, Math.min(m.x + (m.w - c.size) / 2, window.innerWidth - c.size - k));
      const top = Math.max(k, m.y - PORTAL_BUTTON_CFG.menuGapPx - c.size);
      Object.assign(b.style, { left: `${Math.round(left)}px`, top: `${Math.round(top)}px`, right: 'auto', bottom: 'auto',
        width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
    } else {
      Object.assign(b.style, { right: `${c.right}px`, bottom: `${c.bottom}px`, left: 'auto', top: 'auto',
        width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
    }
    const reason = this.world().townPortalRefusal();
    b.disabled = !!reason; b.style.opacity = reason ? '0.45' : '1';
    b.title = reason ?? `Town Portal (${keyDisplay(this.settings().keybinds.townPortal)}) — cast, then linger at the portal`;
  }
}
