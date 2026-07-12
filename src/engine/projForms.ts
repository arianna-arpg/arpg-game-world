// ---------------------------------------------------------------------------
// PROJECTILE FORMS — one geometry for what a flight LOOKS like and what it HITS.
//
// Historically ProjectileShape was "visual + flavor" only: every flight
// collided as a disc of delivery.radius, and wide forms just paired a big
// radius with the art. That made Fire Siege's rolling flame line a lie — the
// drawn wave was pure paint over an invisible circle, hitting things the
// flame visibly missed and missing things the flame visibly crossed.
//
// This registry is the single source of truth both sides consume:
//   - the RENDERER draws each form from PROJ_FORM_GEO's factors (no inline
//     magic numbers in drawProjectiles), and
//   - the SIM tests bodies against the same factors via projFormTouches —
//     so the pixels and the hit test cannot drift apart.
//
// Phase discipline: animated forms (the wave's rolling sine, the tumbling
// square, the spinning octagon) clock on the projectile's AGE — sim time,
// deterministic, shipped on the co-op wire — never on wall-clock time.
//
// Adding a form = one entry here (geo factors + a touches lambda) + a draw
// case keyed on the same factors. A skill that wants the classic disc back
// regardless of its art opts out with ProjectileDelivery.hitForm: 'circle'.
// All factors are × the projectile's CURRENT radius, so size envelopes,
// projPulse breathing, and aoe scaling keep working unchanged.
// ---------------------------------------------------------------------------

import type { ProjectileShape } from './skills';

/** Drawn-form factors (× radius unless noted). The renderer's shape cases
 *  and the collision tests below read the SAME numbers. */
export const PROJ_FORM_GEO = {
  /** Tumbling hammer square: half-extent + tumble rate (rad/s of age). */
  square: { half: 0.8, tumbleRate: 6 },
  /** Long thin bolt along the travel axis. */
  line: { hAlong: 1.8, hAcross: 0.35 },
  /** Spinning octagon disc: spin rate (rad/s of age). */
  octagon: { spinRate: 2 },
  /** Dart triangle: half-base as a fraction of the reach. */
  triangle: { base: 0.85 },
  /** Wide front perpendicular to travel + the fainter echo behind it. */
  bar: {
    hAlong: 0.3, hAcross: 1.9,
    ghost: { hAlong: 0.225, hAcross: 1.5, back: 0.75, alpha: 0.4 },
  },
  /** Crescent opening backward: band center sits `back` behind the flight,
   *  ring radius, half-window angle, stroke width — plus the inner echo. */
  arc: {
    back: 0.6, ring: 1.45, halfWin: 0.42 * Math.PI, stroke: 0.55,
    ghost: { back: 1.1, ring: 1.2, halfWin: 0.38 * Math.PI, stroke: 0.3, alpha: 0.45 },
  },
  /** Rolling sine front ACROSS the travel axis: half-span, crest amplitude
   *  (along travel), stroke width, and the roll rate (rad/s of age). */
  wave: { span: 1.9, amp: 0.4, stroke: 0.5, phaseRate: 8 },
} as const;

/** Circle-vs-OBB helper in a local frame: (ax, ac) is the point in
 *  (along, across) coordinates; true when within `cr` of the box. */
function boxTouch(ax: number, ac: number, hAlong: number, hAcross: number, cr: number): boolean {
  const qx = Math.max(Math.abs(ax) - hAlong, 0);
  const qy = Math.max(Math.abs(ac) - hAcross, 0);
  return qx * qx + qy * qy <= cr * cr;
}

/**
 * Does the flight's DRAWN form at (px, py, dir, radius r, age) touch the
 * circle (cx, cy, cr)? Compact forms (circle/square/triangle/octagon) keep
 * the classic disc — their art fills the disc. Wide forms test the exact
 * curve the renderer strokes.
 */
export function projFormTouches(
  shape: ProjectileShape, px: number, py: number, dir: number, r: number,
  age: number, cx: number, cy: number, cr: number,
): boolean {
  const dx = cx - px, dy = cy - py;
  switch (shape) {
    case 'line': {
      const cos = Math.cos(dir), sin = Math.sin(dir);
      const g = PROJ_FORM_GEO.line;
      return boxTouch(dx * cos + dy * sin, -dx * sin + dy * cos, g.hAlong * r, g.hAcross * r, cr);
    }
    case 'bar': {
      const cos = Math.cos(dir), sin = Math.sin(dir);
      const g = PROJ_FORM_GEO.bar;
      return boxTouch(dx * cos + dy * sin, -dx * sin + dy * cos, g.hAlong * r, g.hAcross * r, cr);
    }
    case 'arc': {
      // The crescent band: local frame, arc centered `back` behind the
      // flight; inside the window the distance is to the ring band, past
      // the window it's to the stroke's round end caps.
      const g = PROJ_FORM_GEO.arc;
      const cos = Math.cos(dir), sin = Math.sin(dir);
      const lx = dx * cos + dy * sin + g.back * r;   // relative to the arc center
      const ly = -dx * sin + dy * cos;
      const reach = g.stroke * r * 0.5 + cr;
      const vlen = Math.hypot(lx, ly);
      const ang = Math.atan2(ly, lx);
      if (Math.abs(ang) <= g.halfWin) {
        return Math.abs(vlen - g.ring * r) <= reach;
      }
      const capX = Math.cos(g.halfWin) * g.ring * r;
      const capY = Math.sin(g.halfWin) * g.ring * r * (ly >= 0 ? 1 : -1);
      return Math.hypot(lx - capX, ly - capY) <= reach;
    }
    case 'wave': {
      // The rolling sine front, sampled exactly as drawn: local X spans the
      // front ACROSS travel, the crest displaces along the renderer's local
      // +Y (behind the heading), rolling with age. Distance to the sampled
      // polyline ≤ half the stroke + the body.
      const g = PROJ_FORM_GEO.wave;
      const span = g.span * r, amp = g.amp * r;
      const reach = g.stroke * r * 0.5 + cr;
      // Renderer frame: rotate(dir + π/2) — local +X at dir+π/2, +Y at dir+π.
      const th = dir + Math.PI / 2;
      const cos = Math.cos(th), sin = Math.sin(th);
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      if (Math.abs(lx) > span + reach || Math.abs(ly) > amp + reach) return false;
      const phase = age * g.phaseRate;
      const r2 = reach * reach;
      let prevX = -span, prevY = Math.sin((-span / span) * Math.PI * 2 + phase) * amp;
      const step = span / 8; // 17 samples across the front, plenty at stroke width
      for (let wx = -span + step; wx <= span + step / 2; wx += step) {
        const X = Math.min(wx, span);
        const Y = Math.sin((X / span) * Math.PI * 2 + phase) * amp;
        // Point-to-segment (prev → current) squared distance.
        const sx = X - prevX, sy = Y - prevY;
        const t = Math.max(0, Math.min(1, ((lx - prevX) * sx + (ly - prevY) * sy) / (sx * sx + sy * sy)));
        const qx = prevX + sx * t - lx, qy = prevY + sy * t - ly;
        if (qx * qx + qy * qy <= r2) return true;
        prevX = X; prevY = Y;
      }
      return false;
    }
    default:
      // circle / square / triangle / octagon: the classic disc — compact
      // art that genuinely fills its radius.
      return dx * dx + dy * dy <= (r + cr) * (r + cr);
  }
}

/** Along-travel HALF-EXTENT factor (× radius) of the form's leading edge —
 *  what the terrain sweep uses as the flight's nose, so a thin rolling
 *  front dies when the FRONT truly reaches the wall, not a full disc early.
 *  (Wide forms keep center-line terrain blocking: the flanks wash past a
 *  pillar the nose line misses — the honest-body trade documented on the
 *  registry.) */
export function projFormNose(shape: ProjectileShape): number {
  switch (shape) {
    case 'line': return PROJ_FORM_GEO.line.hAlong;
    case 'bar': return PROJ_FORM_GEO.bar.hAlong;
    case 'arc': return PROJ_FORM_GEO.arc.ring - PROJ_FORM_GEO.arc.back + PROJ_FORM_GEO.arc.stroke * 0.5;
    case 'wave': return PROJ_FORM_GEO.wave.amp + PROJ_FORM_GEO.wave.stroke * 0.5;
    default: return 1;
  }
}
