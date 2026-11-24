import { esc } from './dom';

interface Point { x: number; y: number }
interface TreeEdgePoint extends Point { radius: number }
interface EdgeClearance {
  nodes: readonly TreeEdgePoint[];
  edges: readonly (readonly [Point, Point])[];
  gap: number;
}

function edgeInterval(origin: number, slope: number, low: number, high: number): [number, number] {
  if (Math.abs(slope) < 1e-9) return origin >= low && origin <= high ? [-Infinity, Infinity] : [Infinity, -Infinity];
  const from = (low - origin) / slope, to = (high - origin) / slope;
  return from <= to ? [from, to] : [to, from];
}

/** Visible portions of a decorative connection. Gaps around unrelated discs
 * and strokes keep a gate tether from obscuring the surrounding passive graph. */
export function passiveTreeEdgeSegments(a: TreeEdgePoint, b: TreeEdgePoint, gap: number, clear?: EdgeClearance):
  { x1: number; y1: number; x2: number; y2: number }[] {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  const start = (a.radius + gap) / length, end = 1 - (b.radius + gap) / length;
  if (!length || start >= end) return [];
  const cuts: [number, number][] = [];
  if (clear) {
    const segMinX = Math.min(a.x, b.x), segMaxX = Math.max(a.x, b.x);
    const segMinY = Math.min(a.y, b.y), segMaxY = Math.max(a.y, b.y);
    const invLen2 = 1 / (length * length);
    const cutDisc = (node: Point, radius: number): void => {
      if (node.x + radius <= segMinX || node.x - radius >= segMaxX || node.y + radius <= segMinY || node.y - radius >= segMaxY) return;
      const t = ((node.x - a.x) * dx + (node.y - a.y) * dy) * invLen2;
      const x = a.x + dx * t, y = a.y + dy * t;
      const squared = radius * radius - (node.x - x) * (node.x - x) - (node.y - y) * (node.y - y);
      if (squared > 0) { const half = Math.sqrt(squared) / length; cuts.push([t - half, t + half]); }
    };
    const clearGap = clear.gap;
    for (const node of clear.nodes) cutDisc(node, node.radius + clearGap);
    for (const [c, d] of clear.edges) {
      if (Math.max(c.x, d.x) + clearGap <= segMinX || Math.min(c.x, d.x) - clearGap >= segMaxX
        || Math.max(c.y, d.y) + clearGap <= segMinY || Math.min(c.y, d.y) - clearGap >= segMaxY) continue;
      const ex = d.x - c.x, ey = d.y - c.y, size = Math.hypot(ex, ey);
      if (!size) continue;
      const invSize = 1 / size;
      // Intersect this ray with the finite segment's padded rectangle and
      // endpoint discs. Extending an edge to infinity would hide distant links.
      const along = edgeInterval(((a.x - c.x) * ex + (a.y - c.y) * ey) * invSize, (dx * ex + dy * ey) * invSize, 0, size);
      const across = edgeInterval(((a.x - c.x) * ey - (a.y - c.y) * ex) * invSize, (dx * ey - dy * ex) * invSize, -clearGap, clearGap);
      const from = Math.max(along[0], across[0]), to = Math.min(along[1], across[1]);
      if (from < to) cuts.push([from, to]);
      cutDisc(c, clearGap); cutDisc(d, clearGap);
    }
  }
  const spans: [number, number][] = []; let cursor = start;
  for (const [from, to] of cuts.sort((a, b) => a[0] - b[0])) {
    if (to <= cursor || from >= end) continue;
    if (from > cursor) spans.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < end) spans.push([cursor, end]);
  return spans.filter(([from, to]) => (to - from) * length > 2).map(([from, to]) => ({
    x1: a.x + dx * from, y1: a.y + dy * from, x2: a.x + dx * to, y2: a.y + dy * to,
  }));
}

/** End strokes before the node's backing disc. A dark under-stroke keeps the
 * connection readable over bright artwork without touching input geometry. */
export function passiveTreeEdge(a: TreeEdgePoint, b: TreeEdgePoint, style: {
  color: string; width: number; gap: number; backing: string;
  from?: string; to?: string; dash?: string; opacity?: number; gate?: string;
  clear?: EdgeClearance;
}): string {
  const segments = passiveTreeEdgeSegments(a, b, style.gap, style.clear);
  const identity = style.from && style.to ? `data-a="${esc(style.from)}" data-b="${esc(style.to)}"` : '';
  return `<g class="vocation-tree-edge" ${identity} pointer-events="none" opacity="${style.opacity ?? 1}"${style.gate ? ` data-vocation-gate="${esc(style.gate)}"` : ''}>
    ${segments.map(({ x1, y1, x2, y2 }) => { const line = `x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`; return `
    <line ${line} stroke="${esc(style.backing)}" stroke-width="${style.width + 3}"/>
    <line ${line} ${identity} stroke="${esc(style.color)}" stroke-width="${style.width}"${style.dash ? ` stroke-dasharray="${esc(style.dash)}"` : ''}/>`; }).join('')}
  </g>`;
}
