import { TOWN_PORTAL_CFG } from '../data/townportals';
import type { World } from '../engine/world';
import { keyDisplay, type Settings } from '../meta/settings';
import { iconSvg } from './icons';
import { Z_LADDER } from './zorder';

/** A small independent HUD control. Position/size are authored in the portal
 *  config so moving it does not touch travel or the skill definition. */
export class PortalButton {
  readonly element = document.createElement('button');
  constructor(private world: () => World, private settings: () => Settings) {
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
    Object.assign(b.style, { right: `${c.right}px`, bottom: `${c.bottom}px`, width: `${c.size}px`, height: `${c.size}px`, placeItems: 'center' });
    const reason = this.world().townPortalRefusal();
    b.disabled = !!reason; b.style.opacity = reason ? '0.45' : '1';
    b.title = reason ?? `Town Portal (${keyDisplay(this.settings().keybinds.townPortal)}) — cast, then linger at the portal`;
  }
}
