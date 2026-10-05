import { drawHudText } from './hudText';
import type { MassQuestPin } from '../../worldmass/quests';
import { VIS_CFG } from './visConfig';

export interface QuestCompassLine { text: string; ready: boolean }
/** A bearing to a known destination is not a surveyed or walkable route. */
export function questCompassLines(from: { x: number; y: number }, pins: readonly MassQuestPin[]): QuestCompassLine[] {
  const seen = new Set<string>();
  return pins.flatMap(pin => {
    const key = JSON.stringify([pin.x, pin.y, pin.label]);
    if (seen.has(key)) return [];
    seen.add(key);
    const dx = pin.x - from.x, dy = pin.y - from.y;
    const nearby = Math.hypot(dx, dy) <= pin.radius;
    const index = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
    return [{ text: (nearby ? '◆' : ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][index])
      + ' ' + pin.label + (nearby ? ' · nearby' : ''), ready: pin.ready }];
  });
}

/** Existing HUD coordinates and style; returns the next available baseline. */
export function drawQuestCompass(ctx: CanvasRenderingContext2D, lines: readonly QuestCompassLine[],
  x: number, y: number, availableWidth: number): number {
  const c = VIS_CFG.questCompass;
  if (!c.enabled || !lines.length) return y;
  const width = Math.min(c.maxWidth, availableWidth);
  if (width < 48) return y;
  ctx.save(); ctx.font = c.font; ctx.textAlign = 'left';
  for (const line of lines.slice(0, c.maxRows)) {
    let text = line.text;
    if (ctx.measureText(text).width > width) {
      const points = [...text];
      while (points.length && ctx.measureText(points.join('') + '…').width > width) points.pop();
      text = points.join('') + '…';
    }
    ctx.fillStyle = line.ready ? c.ready : c.active;
    drawHudText(ctx, text, x, y); y += c.lineHeight;
  }
  ctx.restore();
  return y;
}
