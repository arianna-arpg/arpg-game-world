import { padDisplay } from '../../core/gamepad';
import { keyDisplay, type Settings } from '../../meta/settings';
import type { ActiveStatus } from '../../engine/status';
import { STATUS_DEFS } from '../../engine/status';
import { currentInterfaceTokens } from '../../ui/interfaceStyle';

/** Two live control faces below the feet. Either side may start the escape. */
export function drawPinPrompt(ctx: CanvasRenderingContext2D, x: number, y: number,
  status: ActiveStatus, settings: Settings, pad: boolean): void {
  const def = STATUS_DEFS[status.id];
  const goal = def?.immobilize?.alternatingPresses;
  if (!goal) return;
  const progress = status.breakaway ?? 0;
  const label = (action: 'moveLeft' | 'moveRight') => {
    if (!pad) return keyDisplay(settings.keybinds[action]) || '—';
    if (settings.padBinds[action]) return padDisplay(settings.padBinds[action]);
    return settings.pad.swapSticks ? 'RS' : 'LS';
  };
  const faces = [`← ${label('moveLeft')}`, `${label('moveRight')} →`];
  const colors = currentInterfaceTokens();
  const height = 16;
  ctx.save();
  ctx.font = 'bold 11px Verdana';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const width = Math.ceil(Math.max(...faces.map(s => ctx.measureText(s).width))) + 14;
  for (let i = 0; i < faces.length; i++) {
    const left = i === 0;
    const active = left ? progress >= 0 : progress <= 0;
    const inner = x + (left ? -1 : 1);
    const outer = inner + (left ? -width : width);
    const shoulder = outer + (left ? 4 : -4);
    ctx.beginPath();
    ctx.moveTo(inner, y);
    ctx.lineTo(shoulder, y);
    ctx.lineTo(outer, y + height / 2);
    ctx.lineTo(shoulder, y + height);
    ctx.lineTo(inner, y + height);
    ctx.closePath();
    ctx.fillStyle = colors[active ? '--inv-raised' : '--inv-surface'];
    ctx.fill();
    ctx.strokeStyle = colors[active ? '--inv-light' : '--inv-line'];
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.stroke();
    ctx.fillStyle = colors[active ? '--inv-text' : '--inv-muted'];
    ctx.fillText(faces[i], (inner + shoulder) / 2, y + height / 2 + 0.5);
  }
  // One inlaid tick per accepted input. Long custom sequences use a solid track.
  const track = 2 * (width - 4);
  const trackY = y + height + 2;
  ctx.fillStyle = colors['--inv-surface'];
  ctx.fillRect(x - track / 2, trackY, track, 3);
  ctx.fillStyle = def.color;
  ctx.fillRect(x - track / 2, trackY, track * Math.min(1, Math.abs(progress) / goal), 3);
  if (track / goal >= 4) {
    ctx.fillStyle = colors['--inv-edge'];
    for (let step = 1; step < goal; step++) ctx.fillRect(x - track / 2 + step * track / goal, trackY, 1, 3);
  }
  ctx.restore();
}
