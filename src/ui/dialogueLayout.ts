import { DIALOGUE_CFG } from '../data/dialogue';
import { uiScaleNow } from './uiScale';

/** One reading band, independent of content, service tabs and reader visibility.
 * Services reserve these same bounds for their entire visit. */
export function dialogueBounds(hudTop?: number) {
  const scale = uiScaleNow(), c = DIALOGUE_CFG;
  const vw = window.innerWidth, vh = window.innerHeight;
  let bottom = Math.max(c.edge, vh - (hudTop ?? vh) + c.hudGap);
  if (vh - bottom - c.edge < (c.minWorkspaceHeight + c.minHeight) * scale + c.workspaceTop) {
    bottom = Math.max(c.edge, c.controlClearance * scale);
  }
  const available = Math.max(1, vh - bottom - c.edge);
  const height = Math.min(available * c.heightLimitFraction,
    Math.max(c.minHeight * scale, Math.min(c.height * scale, available * c.heightMaxFraction)));
  return { width: Math.min(c.width * scale, vw - c.edge * 2), height,
    top: vh - bottom - height, bottom };
}

/** Reader geometry only. This module never writes to an inventory or service. */
export function seatDialogue(root: HTMLElement, hudTop?: number): void {
  const r = dialogueBounds(hudTop), scale = uiScaleNow();
  root.style.width = `${r.width / scale}px`;
  root.style.height = `${r.height / scale}px`;
  root.style.bottom = `${r.bottom / scale}px`;
  root.dataset.compact = String(r.width / scale < 600);
}
