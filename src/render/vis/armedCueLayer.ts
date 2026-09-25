import { armedCueStyle, type ArmedCue } from '../../engine/armedCues';
import { shade, withAlpha } from './color';

const TAU = Math.PI * 2;
/** Actor-origin space BEFORE body animation: the dashed blast boundary always
 * uses the same unscaled world radius as the actual rupture hit test. */
export function drawArmedCues(ctx: CanvasRenderingContext2D, bodyRadius: number, cues: ArmedCue[], time: number): void {
  for (const cue of cues) {
    const cfg = armedCueStyle(cue.profile), n = Math.max(3, Math.round(cfg.teeth));
    const r = Math.max(4, bodyRadius) * (cfg.quietScale + (cfg.tightScale - cfg.quietScale) * cue.charge) + cfg.bodyPad;
    const urgency = Math.max(cue.charge, cue.fuse), angle = time * cfg.turnRate;
    ctx.save(); ctx.lineCap = 'round';
    // Broken boundary marks follow the afflicted body and show the exact reach.
    if (cue.radius > 0) {
      ctx.strokeStyle = withAlpha(cue.color, cfg.footprintAlpha + cfg.footprintUrgency * urgency);
      ctx.lineWidth = cfg.width;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n;
        ctx.beginPath(); ctx.arc(0, 0, cue.radius, a, a + TAU / n * cfg.footprintArc); ctx.stroke();
      }
    }
    // Hooked iris closes with the actual bank/life ratio. A dark backing keeps
    // its silhouette readable over bright terrain without a fullscreen wash.
    for (const backing of [true, false]) {
      ctx.strokeStyle = withAlpha(backing ? '#141019' : shade(cue.color, 0.4), cfg.alpha);
      ctx.lineWidth = cfg.width + (backing ? 2 : 0);
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.rotate(angle + i * TAU / n);
        ctx.beginPath(); ctx.moveTo(r * 1.15, -r * 0.26);
        ctx.quadraticCurveTo(r * 0.83, -r * 0.34, r * 0.82, r * 0.08);
        ctx.lineTo(r * 0.61, -r * 0.03); ctx.stroke(); ctx.restore();
      }
    }
    // A separate fuse arc advances with elapsed lifetime, not the bank size.
    ctx.strokeStyle = withAlpha(shade(cue.color, 0.65), cfg.alpha);
    ctx.lineWidth = cfg.width;
    if (cue.fuse > 0) { ctx.beginPath(); ctx.arc(0, 0, r * 1.28, -Math.PI / 2, -Math.PI / 2 + TAU * cue.fuse); ctx.stroke(); }
    ctx.restore();
  }
}
