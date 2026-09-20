import { AFFLICTION_CUE_CFG as C, afflictionMotif, type AfflictionMotif, type AfflictionOverlayMode } from '../../data/afflictionCues';
import type { AfflictionPressure } from '../../engine/afflictionPressure';
import type { ActiveFx } from '../screenFx';
import { hexToRgb, shade } from './color';
import { drawEdgeOverlay, qFrac } from './overlays';

export interface AfflictionLayer {
  key: string; family: string; color: string; sources: string[];
  profile: AfflictionMotif;
  pressure: number; severity: number; alpha: number; floor: number; reach: number;
}
export interface AfflictionEdge { layers: AfflictionLayer[]; seconds: number; }
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fract = (v: number) => v - Math.floor(v);
const seedOf = (s: string) => { let n = 0; for (const c of s) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0; return (n >>> 0) / 4294967296; };

/** Each family gets its OWN pressure, palette, motion and silhouette. The
 * budget trims extra intensity equally; it never ranks away weaker effects.
 * Same-family statuses coalesce (burn + scorch); unknown families retain
 * separate colored fallback layers rather than borrowing a dominant hue. */
export function composeAfflictionEdge(fx: ActiveFx[], pressure: AfflictionPressure,
  mode: AfflictionOverlayMode, seconds: number): AfflictionEdge | undefined {
  if (mode === 'off') return;
  const rows = fx.filter(f => f.def.kind === 'vignette' && f.k > 0 && (f.def.intensity ?? 0.6) > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  const families = new Map<string, { family: string; color: string; intensity: number; pressure: number; lead: number; sources: string[] }>();
  const seen = new Set<string>();
  for (const f of rows) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const family = f.def.motif ?? 'generic';
    const key = family === 'generic' ? `${family}|${f.color}` : family;
    const intensity = clamp01((f.def.intensity ?? 0.6) * f.k);
    const ownPressure = Object.hasOwn(pressure, f.id) ? Math.max(0, pressure[f.id]) : 0;
    const lead = intensity * (0.15 + Math.min(2, ownPressure));
    const old = families.get(key);
    if (!old) families.set(key, { family, color: f.color, intensity, pressure: ownPressure, lead, sources: [f.id] });
    else {
      old.pressure += ownPressure; old.intensity = Math.max(old.intensity, intensity); old.sources.push(f.id);
      if (lead > old.lead) { old.color = f.color; old.lead = lead; }
    }
  }
  if (!families.size) return;
  const layers: AfflictionLayer[] = [...families].map(([key, f]) => {
    const profile = afflictionMotif(f.family);
    const linear = clamp01((f.pressure - C.pressureStart) / (C.pressureFull - C.pressureStart));
    const severity = linear * linear * (3 - 2 * linear);
    const floor = profile.alphaFloor * f.intensity;
    return { key, family: f.family, color: f.color, sources: f.sources, profile, pressure: f.pressure, severity, floor,
      alpha: floor + (profile.alphaCeil * f.intensity - floor) * severity,
      reach: profile.reachQuiet + (profile.reachUrgent - profile.reachQuiet) * severity };
  }).sort((a, b) => a.profile.order - b.profile.order || a.key.localeCompare(b.key));
  const floorSum = layers.reduce((sum, f) => sum + f.floor, 0);
  const extraSum = layers.reduce((sum, f) => sum + f.alpha - f.floor, 0);
  const floorScale = Math.min(1, C.opacityBudget / Math.max(0.001, floorSum));
  const extraScale = Math.min(1, Math.max(0, C.opacityBudget - floorSum) / Math.max(0.001, extraSum));
  for (const f of layers) f.alpha = f.floor * floorScale + (f.alpha - f.floor) * extraScale;
  return { layers, seconds: mode === 'still' ? 0 : seconds };
}

/** Full material-specific layers, no tiny representative badges or blended
 * wash. Paint haze first so green poison cannot recolor blood or kindling. */
export function drawAfflictionLayers(ctx: CanvasRenderingContext2D, w: number, h: number, edge: AfflictionEdge): void {
  for (const layer of edge.layers) drawAfflictionLayer(ctx, w, h, layer, edge.seconds);
}

/** Exported for isolated pixel/motion checks of each real painter. */
export function drawAfflictionLayer(ctx: CanvasRenderingContext2D, w: number, h: number, f: AfflictionLayer, seconds: number): void {
  if (w <= 0 || h <= 0 || f.alpha <= 0) return;
  const short = Math.min(w, h), P = f.profile, seed = seedOf(f.key);
  const clock = seconds / Math.max(1, P.period);
  const reach = Math.min(short * C.sideBand, short * f.reach);
  ctx.save(); ctx.fillStyle = f.color; ctx.strokeStyle = f.color; ctx.lineCap = 'round';
  if (P.gesture === 'vignette') {
    const [r, g, b] = hexToRgb(f.color), inner = qFrac(f.reach);
    // Actual poison green encroaches as POISON grows; no color mixing with
    // fire/blood/life. Only alpha breathes; the baked shape does not churn.
    const breath = 0.96 + 0.04 * Math.sin(clock * Math.PI * 2 + seed * 6);
    drawEdgeOverlay(ctx, w, h, { key: `affliction|${f.color}|${inner}`, innerFrac: inner,
      stops: [[0, `rgba(${r},${g},${b},0)`], [0.55, `rgba(${r},${g},${b},0.38)`], [1, `rgba(${r},${g},${b},1)`]] }, f.alpha * breath);
  } else if (P.gesture === 'clasp') {
    ctx.globalAlpha = f.alpha; ctx.lineWidth = 1.4 + 1.8 * f.severity;
    // Corner-bound, slowly tightening hooks: distinct from poison's fog.
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(sx < 0 ? 0 : w, sy < 0 ? 0 : h); ctx.scale(-sx, -sy);
      for (let i = 0; i < P.count; i++) {
        const d = 10 + i * 10, len = reach * (1 - i * 0.14);
        const curl = len * (0.12 + 0.025 * Math.sin(clock * Math.PI * 2 + i));
        ctx.beginPath(); ctx.moveTo(d, d + len); ctx.lineTo(d, d); ctx.lineTo(d + len, d);
        ctx.lineTo(d + len - curl, d + curl); ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Explicit side clips keep material sprites out of combat on any aspect.
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side < 0 ? 0 : w, 0); ctx.scale(-side, 1);
      ctx.beginPath(); ctx.rect(0, 0, short * C.sideBand, h); ctx.clip();
      if (P.gesture === 'drip') {
        for (let i = 0; i < P.count; i++) {
          const phase = fract(clock + i * 0.381 + seed + (side > 0 ? 0.23 : 0));
          const x = 5 + reach * (0.12 + 0.75 * fract(i * 0.618 + seed));
          const y = h * (0.01 + i * 0.125 + (side > 0 ? 0.04 : 0));
          const len = short * (0.018 + f.severity * 0.055) * (0.55 + phase * 1.5);
          const r = (2 + f.severity * 3.2) * (0.8 + fract(i * 0.71) * 0.4);
          const fade = Math.pow(Math.sin(phase * Math.PI), 0.7);
          ctx.globalAlpha = f.alpha * fade;
          // Viscous trail feeds a rounded pendant drop, drawn filled in blood.
          ctx.beginPath(); ctx.moveTo(x - r * 0.28, y);
          ctx.bezierCurveTo(x - r * 0.5, y + len * 0.7, x - r, y + len * 0.86, x - r, y + len);
          ctx.bezierCurveTo(x - r, y + len + r * 1.8, x + r, y + len + r * 1.8, x + r, y + len);
          ctx.bezierCurveTo(x + r, y + len * 0.85, x + r * 0.4, y + len * 0.4, x + r * 0.28, y);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = shade(f.color, 0.3); ctx.lineWidth = 0.7;
          ctx.globalAlpha = f.alpha * fade * 0.45;
          ctx.beginPath(); ctx.moveTo(x - r * 0.25, y + len * 0.6); ctx.lineTo(x - r * 0.35, y + len); ctx.stroke();
        }
      } else if (P.gesture === 'ember') {
        // A few tongues lick the rim, with loose kindling rising independently.
        for (let i = 0; i < Math.ceil(P.count / 3); i++) {
          const sway = Math.sin(clock * Math.PI * 2 + i * 1.7 + seed * 8);
          const base = h * (0.53 + i * 0.15), tall = short * (0.025 + f.severity * 0.065) * (0.8 + i * 0.08);
          const x = reach * (0.07 + i * 0.09), width = reach * 0.32;
          ctx.globalAlpha = f.alpha * 0.5;
          ctx.beginPath(); ctx.moveTo(x - width, base);
          ctx.bezierCurveTo(x + width * 1.8, base - tall * 0.2, x - width * 0.2, base - tall * 0.6, x + width * (0.8 + sway * 0.18), base - tall);
          ctx.bezierCurveTo(x + width * 0.2, base - tall * 0.38, x + width * 1.3, base - tall * 0.1, x + width, base);
          ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < P.count; i++) {
          const phase = fract(clock + i * 0.618 + seed + (side > 0 ? 0.3 : 0));
          const x = reach * (0.18 + fract(i * 0.39 + seed) * 0.65) + Math.sin(phase * 6 + i) * reach * 0.07;
          const y = h * (0.96 - phase * 0.82);
          const r = 0.9 + f.severity * 1.8 + fract(i * 0.73);
          ctx.globalAlpha = f.alpha * Math.sin(phase * Math.PI);
          ctx.fillStyle = i % 3 ? f.color : shade(f.color, 0.55);
          ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r, y);
          ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = f.color; ctx.lineWidth = 0.8; ctx.globalAlpha *= 0.4;
          ctx.beginPath(); ctx.moveTo(x, y + r * 2); ctx.lineTo(x - 1, y + r * 7); ctx.stroke();
        }
        ctx.fillStyle = f.color;
      } else {
        ctx.globalAlpha = f.alpha; ctx.lineWidth = 1.4;
        for (let i = 0; i < P.count; i++) {
          const y = h * (0.16 + i * 0.14) + Math.sin(clock * Math.PI * 2 + seed * 6 + i) * 3;
          ctx.beginPath(); ctx.moveTo(3, y - 9); ctx.quadraticCurveTo(reach, y, 3, y + 9); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  ctx.restore();
}
