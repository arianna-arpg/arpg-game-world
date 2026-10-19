import { DIALOGUE_CFG } from '../data/dialogue';
import { uiScaleNow } from './uiScale';
import { panelMoved } from './panelmove';

/** NPC geometry only. Never reserves, shrinks or repositions player panels. */
export function dialogueBounds(hudTop?: number) {
  const scale = uiScaleNow(), c = DIALOGUE_CFG;
  const top = c.workspaceTop * scale;
  const edge = c.edge * scale;
  const bottom = Math.max(edge, window.innerHeight - (hudTop ?? window.innerHeight) + c.hudGap);
  return { width: Math.min(c.width * scale, window.innerWidth - edge * 2),
    height: Math.max(80 * scale, Math.min(c.height * scale, window.innerHeight - bottom - top)), top, bottom };
}

export function seatDialogue(root: HTMLElement, hudTop?: number): void {
  const r = dialogueBounds(hudTop), scale = uiScaleNow();
  root.style.height = `${r.height / scale}px`;
  if (!panelMoved(root)) {
    root.style.width = `${r.width / scale}px`;
    root.style.top = `${r.top / scale}px`;
    root.style.left = `${DIALOGUE_CFG.edge}px`;
  }
  root.dataset.compact = String(r.width / scale < 450);
}
