// ---------------------------------------------------------------------------
// THE OUTLINE LIBRARY (docs/design/steady-hand.md — the trace fabric's
// shapes): one authored polyline per item CATEGORY, unit space [0,1]², an
// open registry any consumer reads (the smith's writ today; a runic cast
// tomorrow registers its runes here the same way). A shape is ONE line the
// pen walks — recognizable silhouettes, not portraits; the walk's demo
// proved the register. Detail VARIANTS (walk card 4b's exhibit) are more
// rows — data, never engine. WALK 2 (her ruling, cards 2+4 fused): the
// COMPLEXITY CLASS is the writ's named axis — a base's intricacy IS its
// shape's intricacy, so each category may register up to three lines
// (plain / fine / ornate); a class without its own line falls back down
// the ladder (the plain outline always stands).
// ---------------------------------------------------------------------------

import type { ItemCategory } from '../engine/items';

export interface TraceShape {
  id: string;
  /** The outline polyline, unit space. */
  points: [number, number][];
  /** A ring closes; a blade does not. */
  closed?: boolean;
}

function circle(n: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
  }
  return pts;
}

export const TRACE_SHAPES: Record<string, TraceShape> = {};

export function registerTraceShape(shape: TraceShape): void {
  TRACE_SHAPES[shape.id] = shape; // HMR-safe: replace by id
}

// --- the category outlines (the smith's writ's own gamut) -------------------
registerTraceShape({
  id: 'blade', // weapon
  points: [
    [0.10, 0.78], [0.30, 0.58], [0.50, 0.38], [0.66, 0.22], [0.74, 0.14],
    [0.80, 0.10], [0.82, 0.16], [0.78, 0.24], [0.62, 0.40], [0.44, 0.58],
    [0.28, 0.74], [0.24, 0.82], [0.16, 0.90], [0.10, 0.86], [0.14, 0.78],
    [0.22, 0.70],
  ],
});
registerTraceShape({
  id: 'shield', // offhand
  points: [
    [0.50, 0.12], [0.72, 0.20], [0.78, 0.42], [0.72, 0.64], [0.60, 0.80],
    [0.50, 0.88], [0.40, 0.80], [0.28, 0.64], [0.22, 0.42], [0.28, 0.20],
    [0.50, 0.12],
  ],
  closed: true,
});
registerTraceShape({
  id: 'helm', // helmet
  points: [
    [0.26, 0.72], [0.24, 0.55], [0.28, 0.40], [0.38, 0.28], [0.50, 0.24],
    [0.62, 0.28], [0.72, 0.40], [0.76, 0.55], [0.74, 0.72], [0.66, 0.72],
    [0.66, 0.58], [0.60, 0.50], [0.50, 0.47], [0.40, 0.50], [0.34, 0.58],
    [0.34, 0.72], [0.26, 0.72],
  ],
  closed: true,
});
registerTraceShape({
  id: 'cuirass', // chest
  points: [
    [0.30, 0.16], [0.42, 0.22], [0.58, 0.22], [0.70, 0.16], [0.76, 0.30],
    [0.72, 0.48], [0.68, 0.66], [0.60, 0.80], [0.50, 0.84], [0.40, 0.80],
    [0.32, 0.66], [0.28, 0.48], [0.24, 0.30], [0.30, 0.16],
  ],
  closed: true,
});
registerTraceShape({
  id: 'gauntlet', // gloves
  points: [
    [0.34, 0.84], [0.32, 0.60], [0.28, 0.44], [0.34, 0.40], [0.40, 0.52],
    [0.40, 0.36], [0.46, 0.32], [0.50, 0.48], [0.52, 0.30], [0.58, 0.30],
    [0.60, 0.48], [0.64, 0.34], [0.70, 0.38], [0.66, 0.58], [0.64, 0.84],
  ],
});
registerTraceShape({
  id: 'boot', // boots
  points: [
    [0.34, 0.16], [0.46, 0.16], [0.46, 0.52], [0.50, 0.66], [0.62, 0.72],
    [0.74, 0.76], [0.74, 0.84], [0.34, 0.84], [0.32, 0.60], [0.34, 0.16],
  ],
  closed: true,
});
registerTraceShape({
  id: 'buckle', // belt
  points: [
    [0.22, 0.36], [0.78, 0.36], [0.78, 0.64], [0.22, 0.64], [0.22, 0.36],
    [0.34, 0.44], [0.66, 0.44], [0.66, 0.56], [0.34, 0.56], [0.34, 0.44],
  ],
});
registerTraceShape({
  id: 'legplate', // legs
  points: [
    [0.34, 0.14], [0.66, 0.14], [0.70, 0.34], [0.66, 0.52], [0.64, 0.84],
    [0.54, 0.84], [0.52, 0.56], [0.48, 0.56], [0.46, 0.84], [0.36, 0.84],
    [0.34, 0.52], [0.30, 0.34], [0.34, 0.14],
  ],
  closed: true,
});
registerTraceShape({ id: 'ring', points: circle(40, 0.30), closed: true });
registerTraceShape({
  id: 'amulet',
  points: circle(28, 0.22).concat([
    [0.5, 0.28], [0.44, 0.18], [0.5, 0.08], [0.56, 0.18], [0.5, 0.28],
  ]),
});


// --- THE COMPLEXITY VARIANTS (walk 2 — the fine and ornate lines are
// ADDITIVE by authoring law: the pen finishes the plain outline, then
// draws the detail as a continuation — more intricate item, MORE LINE,
// by construction. A class without its own line falls down the ladder.
const HELM_PTS: [number, number][] = [
  [0.26, 0.72], [0.24, 0.55], [0.28, 0.40], [0.38, 0.28], [0.50, 0.24],
  [0.62, 0.28], [0.72, 0.40], [0.76, 0.55], [0.74, 0.72], [0.66, 0.72],
  [0.66, 0.58], [0.60, 0.50], [0.50, 0.47], [0.40, 0.50], [0.34, 0.58],
  [0.34, 0.72], [0.26, 0.72],
];
const HELM_VISOR: [number, number][] = [
  [0.34, 0.635], [0.42, 0.66], [0.50, 0.67], [0.58, 0.66], [0.66, 0.635],
];
registerTraceShape({ id: 'helm_fine', points: HELM_PTS.concat(HELM_VISOR) });
registerTraceShape({
  id: 'helm_ornate',
  points: HELM_PTS.concat(HELM_VISOR, [
    [0.56, 0.20], [0.50, 0.10], [0.44, 0.20], [0.50, 0.24],
  ]),
});
const CUIRASS_PTS: [number, number][] = [
  [0.30, 0.16], [0.42, 0.22], [0.58, 0.22], [0.70, 0.16], [0.76, 0.30],
  [0.72, 0.48], [0.68, 0.66], [0.60, 0.80], [0.50, 0.84], [0.40, 0.80],
  [0.32, 0.66], [0.28, 0.48], [0.24, 0.30], [0.30, 0.16],
];
const CUIRASS_GORGET: [number, number][] = [
  [0.42, 0.30], [0.50, 0.34], [0.58, 0.30],
];
registerTraceShape({ id: 'cuirass_fine', points: CUIRASS_PTS.concat(CUIRASS_GORGET) });
registerTraceShape({
  id: 'cuirass_ornate',
  points: CUIRASS_PTS.concat(CUIRASS_GORGET, [
    [0.50, 0.44], [0.44, 0.54], [0.50, 0.64], [0.56, 0.54], [0.50, 0.44],
  ]),
});
// ring · fine — the band closes, then the pen climbs into the setting.
registerTraceShape({
  id: 'ring_fine',
  points: circle(40, 0.30).concat([[0.5, 0.20], [0.44, 0.14], [0.5, 0.06], [0.56, 0.14], [0.5, 0.20]]),
});
function filigree(n: number, r: number, wob: number, wobN: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = r + wob * Math.sin(a * wobN);
    pts.push([0.5 + rr * Math.cos(a), 0.5 + rr * Math.sin(a)]);
  }
  return pts;
}
// ring · ornate — the filigree band, then the setting (fine's own crown).
registerTraceShape({
  id: 'ring_ornate',
  points: filigree(64, 0.30, 0.045, 14).concat([[0.5, 0.155], [0.44, 0.1], [0.5, 0.03], [0.56, 0.1], [0.5, 0.155]]),
});

/** The category → per-COMPLEXITY shape ladder (index = class − 1; a
 *  class without its own line falls back DOWN the ladder — the plain
 *  outline always stands; a category without rows falls to the ring). */
export const CATEGORY_SHAPES: Partial<Record<ItemCategory, readonly string[]>> = {
  weapon: ['blade'],
  offhand: ['shield'],
  helmet: ['helm', 'helm_fine', 'helm_ornate'],
  chest: ['cuirass', 'cuirass_fine', 'cuirass_ornate'],
  gloves: ['gauntlet'],
  boots: ['boot'],
  belt: ['buckle'],
  legs: ['legplate'],
  ring: ['ring', 'ring_fine', 'ring_ornate'],
  amulet: ['amulet'],
};

export function traceShapeForCategory(category: ItemCategory, complexity = 1): TraceShape {
  const ladder = CATEGORY_SHAPES[category] ?? ['ring'];
  for (let c = Math.max(1, Math.min(3, complexity)); c >= 1; c--) {
    const s = TRACE_SHAPES[ladder[c - 1] ?? ''];
    if (s) return s;
  }
  return TRACE_SHAPES[ladder[0]] ?? TRACE_SHAPES.ring;
}
