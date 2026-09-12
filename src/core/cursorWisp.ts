import type { CursorRole } from './cursor';

/** The vessel's tuning lives beside its art; every role shares one true seat. */
export const WISP_CFG = { size: 32, hotspot: [10, 10] as [number, number], glow: 3, wobblePx: 1.25 };
const TAU = Math.PI * 2;

/** A hollow light, drawn around a stationary pinpoint. The idle wave affects
 * only trailing filaments, never the pinpoint or an affordance's geometry. */
export function wispRole(ctx: CanvasRenderingContext2D, size: number, color: string, role: CursorRole, phase: number): void {
  const [x, y] = WISP_CFG.hotspot;
  const closed = role === 'press' || role === 'grabbing';
  const open = role === 'point' || role === 'grab';
  const r = closed ? 3.6 : open ? 6.5 : 5;
  const wave = Math.sin(phase) * WISP_CFG.wobblePx;
  const stroke = (path: () => void, width = 1.3): void => {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#10121c'; ctx.lineWidth = width + 2; path(); ctx.stroke();
    ctx.shadowColor = color; ctx.shadowBlur = WISP_CFG.glow;
    ctx.strokeStyle = color; ctx.lineWidth = width; path(); ctx.stroke();
    ctx.shadowBlur = 0;
  };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Two dissolving tails make the hollow vessel read as a soul rather than a ring.
  ctx.globalAlpha = closed ? 0.55 : 0.85;
  stroke(() => {
    ctx.beginPath(); ctx.moveTo(x - 1, y + r);
    ctx.bezierCurveTo(9 + wave, 22, 23 - wave, 16, 24 + wave, size - 5);
    ctx.moveTo(x + r, y + 1);
    ctx.bezierCurveTo(24, 12 + wave, 17, 23 - wave, 27, 24 + wave);
  }, 1);
  ctx.globalAlpha = 1;
  if (role === 'text') {
    stroke(() => {
      ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x, 20);
      ctx.moveTo(x - 3, 3); ctx.lineTo(x + 3, 3);
      ctx.moveTo(x - 3, 20); ctx.lineTo(x + 3, 20);
    });
  } else if (role === 'crosshair') {
    stroke(() => {
      ctx.beginPath();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        ctx.moveTo(x + dx * 4, y + dy * 4); ctx.lineTo(x + dx * 8, y + dy * 8);
      }
    });
  } else {
    stroke(() => {
      ctx.beginPath();
      if (role === 'grab' || role === 'grabbing') {
        const span = closed ? 1.25 : 0.85;
        ctx.arc(x, y, r, -span, span);
        ctx.moveTo(x + Math.cos(Math.PI - span) * r, y + Math.sin(Math.PI - span) * r);
        ctx.arc(x, y, r, Math.PI - span, Math.PI + span);
      } else ctx.arc(x, y, r, -0.1, TAU - 0.6);
    });
    if (open || closed) stroke(() => {
      ctx.beginPath(); ctx.moveTo(x, y - r - 3); ctx.lineTo(x, y - r - 1);
      ctx.moveTo(x - r - 3, y); ctx.lineTo(x - r - 1, y);
    }, 1);
  }
  // An opaque dark rim + white heart survives snow, black, and arbitrary tints.
  ctx.fillStyle = '#10121c'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff9ea'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
  if (role === 'help' || role === 'copy') {
    ctx.fillStyle = '#10121c'; ctx.beginPath(); ctx.arc(23, 23, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff9ea'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(role === 'help' ? '?' : '+', 23, 23);
  }
  ctx.restore();
}
