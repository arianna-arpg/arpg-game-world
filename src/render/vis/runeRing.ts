// ---------------------------------------------------------------------------
// THE RUNE RING — carved glyph bands for the travel family (zone-exit portals,
// the waypoint stone; renderer drawExits / drawWaypoint).
//
// The band is CARVED STONE: its geometry bakes ONCE per (radius, color) into
// the shared sprite cache and never animates — rotation and alpha are blit
// state (one drawImage under a transform per band per frame), and the glow
// that kindles on approach is the existing glowSprite underlay. Glyph shapes
// come from a tiny fixed alphabet picked by an integer hash of the glyph
// index — deterministic by construction (no render rng: the same band bakes
// on every machine, every session).
//
// Dials in VIS_CFG.rings. Perf: bakes ride the LRU'd, steward-registered
// 'sprites' cache (radius quantized to 2px bounds the variant space); the
// per-frame cost is drawImage calls only — no paths, no shadowBlur.
// ---------------------------------------------------------------------------

import { baked } from './sprites';
import { VIS_CFG } from './visConfig';

/** Integer hash → [0,1): bake-time glyph variety without any rng stream. */
function h01(i: number, salt: number): number {
  let x = (i * 2654435761 + salt * 40503) >>> 0;
  x ^= x >>> 13;
  x = (x * 1274126177) >>> 0;
  return (x >>> 8) / 16777216;
}

/** Bake (or fetch) the glyph band for a ring of `radius` in `color`: a faint
 *  carved channel with runeCount stone-cut marks spaced around it. */
export function runeRingSprite(radius: number, color: string): HTMLCanvasElement {
  const R = VIS_CFG.rings;
  const r = Math.max(8, Math.round(radius / 2) * 2); // quantize — bounded bake space
  const pad = R.glyphLen * 1.8 + 4;
  const size = (r + pad) * 2;
  return baked(`runering|${r}|${color}|${R.runeCount}`, size, size, (ctx) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    // The carved channel the glyphs sit in — faint, so the marks read as
    // cut INTO something rather than floating.
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < R.runeCount; i++) {
      const len = R.glyphLen * (0.7 + 0.6 * h01(i, 1));
      const kind = Math.floor(h01(i, 2) * 5);
      ctx.save();
      ctx.rotate((i / R.runeCount) * Math.PI * 2);
      ctx.translate(r, 0); // glyph frame: +x radial (outward), +y tangential
      ctx.beginPath();
      switch (kind) {
        case 0: // plain radial tick
          ctx.moveTo(-len * 0.5, 0);
          ctx.lineTo(len * 0.5, 0);
          break;
        case 1: // chevron opening outward
          ctx.moveTo(-len * 0.5, -len * 0.35);
          ctx.lineTo(len * 0.5, 0);
          ctx.lineTo(-len * 0.5, len * 0.35);
          break;
        case 2: // barred tick (radial + tangent crossbar)
          ctx.moveTo(-len * 0.5, 0);
          ctx.lineTo(len * 0.5, 0);
          ctx.moveTo(0, -len * 0.4);
          ctx.lineTo(0, len * 0.4);
          break;
        case 3: // short tangent arc hugging the channel
          ctx.arc(-len * 0.3, 0, len * 0.6, -0.9, 0.9);
          break;
        default: // dot at the inner end + a reaching tick
          ctx.moveTo(-len * 0.1, 0);
          ctx.lineTo(len * 0.5, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-len * 0.45, 0, 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
      }
      ctx.stroke();
      ctx.restore();
    }
  });
}

/** Blit the band centered at (x, y), rotated `rot` radians, at `alpha`.
 *  The bake's own quantized radius is the drawn radius — carved stone never
 *  stretches; only its light (alpha) and its turn (rot) move per frame. */
export function drawRuneRing(ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, color: string, alpha: number, rot: number): void {
  if (alpha <= 0.01) return;
  const s = runeRingSprite(radius, color);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(s, -s.width / 2, -s.height / 2);
  ctx.restore();
}
