import { DIALOGUE_CFG } from '../data/dialogue';
import { uiScaleNow } from './uiScale';
import { panelMoved } from './panelmove';

/** NPC geometry only. Never reserves, shrinks or repositions player panels. */
export function dialogueBounds(hudTop?: number) {
  const scale = uiScaleNow(), c = DIALOGUE_CFG;
  const ceiling = c.workspaceTop * scale;
  const edge = c.edge * scale;
  const bottom = Math.max(edge, window.innerHeight - (hudTop ?? window.innerHeight) + c.hudGap * scale);
  const width = Math.min(c.width * scale, window.innerWidth - edge * 2);
  const height = Math.max(80 * scale, Math.min(c.height * scale, window.innerHeight - bottom - ceiling));
  return { width, height, left: (window.innerWidth - width) / 2,
    top: Math.max(0, window.innerHeight - bottom - height), bottom };
}

const appliedDialogueSeat = new WeakMap<HTMLElement, string>();

export function seatDialogue(root: HTMLElement, hudTop?: number): void {
  const r = dialogueBounds(hudTop), scale = uiScaleNow();
  const moved = panelMoved(root);
  const h = r.height / scale;
  const w = r.width / scale;
  const t = r.top / scale;
  const l = r.left / scale;
  const compact = String(w < 450);
  const key = moved ? `m|${h.toFixed(1)}|${compact}` : `f|${h.toFixed(1)}|${w.toFixed(1)}|${t.toFixed(1)}|${l.toFixed(1)}|${compact}`;
  if (appliedDialogueSeat.get(root) === key) return;
  appliedDialogueSeat.set(root, key);
  root.style.height = `${h}px`;
  if (!moved) {
    root.style.width = `${w}px`;
    root.style.top = `${t}px`;
    root.style.left = `${l}px`;
  }
  if (root.dataset.compact !== compact) root.dataset.compact = compact;
}
