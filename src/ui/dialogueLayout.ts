import { DIALOGUE_CFG } from '../data/dialogue';
import { uiScaleNow } from './uiScale';

/** Temporary space for a conversation and its service surfaces. The panel's
 * authored/movable seat is untouched; closing the reader restores it. */
export class DialogueLayout {
  private seated: HTMLElement[] = [];

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

  clear(): void {
    for (const el of this.seated) {
      el.classList.remove('dialogue-companion');
      for (const key of ['left', 'top', 'width', 'height', 'scroll-height']) el.style.removeProperty(`--dialogue-${key}`);
    }
    this.seated = [];
  }

  sync(root: HTMLElement, hudTop: number | undefined, surfaces: readonly HTMLElement[]): void {
    this.clear();
    const scale = uiScaleNow(), cfg = DIALOGUE_CFG, tune = cfg.services;
    const vw = window.innerWidth, vh = window.innerHeight, edge = cfg.edge;
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
    root.style.height = surfaces.length ? `${Math.min(available * tune.readerLimitFraction,
      Math.max(tune.minReaderHeight * scale, Math.min(tune.readerHeight * scale, available * tune.readerMaxFraction))) / scale}px` : '';
    if (!surfaces.length) return;

    const ceiling = Math.min(tune.top, available * 0.15);
    const floor = root.getBoundingClientRect().top - tune.gap;
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
