import { esc } from './dom';

interface Point { x: number; y: number }
interface TreeEdgePoint extends Point { radius: number }
interface EdgeClearance {
  nodes: readonly TreeEdgePoint[];
  edges: readonly (readonly [Point, Point])[];
  gap: number;
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
    const project = (p: Point): number => ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length);
    const cutDisc = (node: Point, radius: number): void => {
      const t = project(node), x = a.x + dx * t, y = a.y + dy * t;
      const squared = radius ** 2 - (node.x - x) ** 2 - (node.y - y) ** 2;
      if (squared > 0) { const half = Math.sqrt(squared) / length; cuts.push([t - half, t + half]); }
    };
    for (const node of clear.nodes) cutDisc(node, node.radius + clear.gap);
    for (const [c, d] of clear.edges) {
      const ex = d.x - c.x, ey = d.y - c.y, size = Math.hypot(ex, ey);
      if (!size) continue;
      // Intersect this ray with the finite segment's padded rectangle and
      // endpoint discs. Extending an edge to infinity would hide distant links.
      const interval = (origin: number, slope: number, low: number, high: number): [number, number] => {
        if (Math.abs(slope) < 1e-9) return origin >= low && origin <= high ? [-Infinity, Infinity] : [Infinity, -Infinity];
        const from = (low - origin) / slope, to = (high - origin) / slope;
        return [Math.min(from, to), Math.max(from, to)];
      };
      const along = interval(((a.x - c.x) * ex + (a.y - c.y) * ey) / size, (dx * ex + dy * ey) / size, 0, size);
      const across = interval(((a.x - c.x) * ey - (a.y - c.y) * ex) / size, (dx * ey - dy * ex) / size, -clear.gap, clear.gap);
      const from = Math.max(along[0], across[0]), to = Math.min(along[1], across[1]);
      if (from < to) cuts.push([from, to]);
      cutDisc(c, clear.gap); cutDisc(d, clear.gap);
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
