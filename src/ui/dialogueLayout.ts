import { DIALOGUE_CFG } from '../data/dialogue';
import { uiScaleNow } from './uiScale';

/** A conversation reserves space for the lifetime of its open service panels.
 * Dismissing/suspending a reader must never move an item under the pointer.
 * The panel's authored/movable seat is restored only after that panel closes. */
export class DialogueLayout {
  private seated: HTMLElement[] = [];
  private signature = '';

  constructor() {
    const style = document.createElement('style');
    style.textContent = `
      .panel.dialogue-companion {
        left:var(--dialogue-left) !important; top:var(--dialogue-top) !important;
        right:auto !important; bottom:auto !important; transform:none !important;
        width:var(--dialogue-width) !important; max-width:var(--dialogue-width) !important;
        max-height:var(--dialogue-height) !important; overflow-y:auto !important;
      }
      #inventory.dialogue-companion { overflow:visible !important; }
      #inventory.dialogue-companion .inv-scroll {
        min-height:0 !important; max-height:var(--dialogue-scroll-height) !important;
        overflow-x:auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  private release(el: HTMLElement): void {
    el.classList.remove('dialogue-companion');
    for (const key of ['left', 'top', 'width', 'height', 'scroll-height']) el.style.removeProperty(`--dialogue-${key}`);
  }

  /** Shelving or a modal pause is not a close. Retain both geometry and
   * scroll limits until the owning panel actually ends its visit. */
  retain(): void {
    this.seated = this.seated.filter(el => {
      if (el.isConnected && !el.hidden && !el.classList.contains('hidden')) return true;
      this.release(el); this.signature = ''; return false;
    });
  }

  clear(): void {
    for (const el of this.seated) this.release(el);
    this.seated = []; this.signature = '';
  }

  maintain(root: HTMLElement, hudTop: number | undefined, surfaces: readonly HTMLElement[]): void {
    this.retain();
    // Only an explicit workspace change (tabs, viewport or scale) can refit
    // an existing reservation. Closing a reader alone changes none of these.
    if (this.seated.length && surfaces.length) this.sync(root, hudTop, surfaces);
  }

  sync(root: HTMLElement, hudTop: number | undefined, surfaces: readonly HTMLElement[]): void {
    this.retain();
    const scale = uiScaleNow(), cfg = DIALOGUE_CFG, tune = cfg.services;
    const vw = window.innerWidth, vh = window.innerHeight, edge = cfg.edge;
    const signature = `${vw}:${vh}:${scale}:${hudTop}:${surfaces.map(el => el.id).join('|')}`;
    if (this.signature === signature) return;
    this.clear();
    this.signature = signature;
    const width = Math.min(cfg.width, (vw - edge * 2) / scale);
    let bottom = Math.max(edge, vh - (hudTop ?? vh) + cfg.hudGap);
    // While services own input, their workspace may borrow the inactive HUD
    // area on short/high-scale screens. Never shrink text to fit accessibility.
    if (surfaces.length && vh - bottom - edge < (tune.minPanelHeight + tune.minReaderHeight) * scale + tune.top) {
      bottom = Math.max(edge, tune.controlClearance * scale);
    }
    const available = Math.max(1, vh - bottom - edge);
    root.style.width = `${width}px`;
    root.dataset.compact = String(width < 600);
    root.dataset.services = String(surfaces.length > 0);
    root.style.bottom = `${bottom / scale}px`;
    root.style.maxHeight = `${available / scale}px`;
    const readerHeight = Math.min(available * tune.readerLimitFraction,
      Math.max(tune.minReaderHeight * scale, Math.min(tune.readerHeight * scale, available * tune.readerMaxFraction)));
    root.style.height = surfaces.length ? `${readerHeight / scale}px` : '';
    if (!surfaces.length) return;

    const ceiling = Math.min(tune.top, available * 0.15);
    const floor = vh - bottom - readerHeight - tune.gap;
    const space = Math.max(1, floor - ceiling);
    const room = vw - edge * 2;
    const natural = surfaces.map(el => Math.min(room, el.getBoundingClientRect().width));
    const total = natural.reduce((n, w) => n + w, 0);
    const lanes = surfaces.length;
    const usable = room - tune.gap * (lanes - 1);
    const ratio = Math.min(1, usable / Math.max(1, total));
    const columns = natural.every(w => w * ratio >= Math.min(w, tune.minPanelWidth));
    const height = columns ? space : Math.max(1, (space - tune.gap * (lanes - 1)) / lanes);
    let left = columns ? (vw - total * ratio - tune.gap * (lanes - 1)) / 2 : edge;
    surfaces.forEach((el, i) => {
      const w = columns ? natural[i] * ratio : natural[i];
      const x = columns ? left : (vw - w) / 2;
      const y = columns ? ceiling : ceiling + i * (height + tune.gap);
      for (const [key, value] of Object.entries({ left: x, top: y, width: w, height })) {
        el.style.setProperty(`--dialogue-${key}`, `${value / scale}px`);
      }
      el.classList.add('dialogue-companion');
      const scroll = el.querySelector<HTMLElement>('.inv-scroll');
      if (scroll) {
        const inset = scroll.getBoundingClientRect().top - el.getBoundingClientRect().top;
        const padding = parseFloat(getComputedStyle(el).paddingBottom) * scale;
        el.style.setProperty('--dialogue-scroll-height', `${Math.max(1, height - inset - padding) / scale}px`);
      }
      left += w + tune.gap;
    });
    this.seated = [...surfaces];
  }
}
