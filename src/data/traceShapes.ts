// ---------------------------------------------------------------------------
// THE OUTLINE LIBRARY (docs/design/steady-hand.md — the trace fabric's
// shapes): one authored polyline per item CATEGORY, unit space [0,1]², an
// open registry any consumer reads (the smith's writ today; a runic cast
// tomorrow registers its runes here the same way). A shape is ONE line the
// pen walks — recognizable silhouettes, not portraits; the walk's demo
// proved the register. Detail VARIANTS (walk card 4b's exhibit) are more
// rows when her final word asks for them — data, never engine.
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

/** The category → shape map (the writ's own read; a category without a
 *  row falls to the ring — never a crash, always a traceable line). */
export const CATEGORY_SHAPES: Partial<Record<ItemCategory, string>> = {
  weapon: 'blade',
  offhand: 'shield',
  helmet: 'helm',
  chest: 'cuirass',
  gloves: 'gauntlet',
  boots: 'boot',
  belt: 'buckle',
  legs: 'legplate',
  ring: 'ring',
  amulet: 'amulet',
};

export function traceShapeForCategory(category: ItemCategory): TraceShape {
  return TRACE_SHAPES[CATEGORY_SHAPES[category] ?? 'ring'] ?? TRACE_SHAPES.ring;
}
