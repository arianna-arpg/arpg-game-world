import type { MapMarker } from '../world/mapMarkers';

export interface BearingTarget { marker: MapMarker; x: number; y: number; unknown: boolean }
export interface BearingView { cx: number; cy: number; side: number }

/** Unknown ground carries a direction, never an exact location. Known pins
 * leaving the viewport use the same edge affordance. Pure: no knowledge writes. */
export function mapBearing(target: Pick<BearingTarget, 'x' | 'y' | 'unknown'>,
  view: BearingView, origin: { x: number; y: number }) {
  const half = view.side * .45;
  let dx = target.x - view.cx, dy = target.y - view.cy;
  const outside = Math.abs(dx) > half || Math.abs(dy) > half;
  if (!target.unknown && !outside) return null;
  if (target.unknown) { dx = target.x - origin.x; dy = target.y - origin.y; }
  if (Math.abs(dx) + Math.abs(dy) < .001) dy = -1;
  const angle = Math.atan2(dy, dx);
  const scale = half / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: view.cx + dx * scale, y: view.cy + dy * scale,
    angle: angle * 180 / Math.PI, sector: (Math.round(angle / (Math.PI / 8)) + 16) % 16 };
}
const esc = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Nearby bearings share one badge, preventing overlapping quest chevrons.
 * All artwork remains pointer-transparent, including during zoom and drag. */
export function mapBearingsSvg(targets: readonly BearingTarget[], view: BearingView,
  origin: { x: number; y: number }): string {
  let svg = '';
  const groups = new Map<number, { edge: NonNullable<ReturnType<typeof mapBearing>>; targets: BearingTarget[] }>();
  for (const t of targets) {
    const edge = mapBearing(t, view, origin), m = t.marker;
    if (edge) {
      const g = groups.get(edge.sector);
      if (g) g.targets.push(t); else groups.set(edge.sector, { edge, targets: [t] });
    } else {
      svg += `<g><circle cx="${t.x}" cy="${t.y}" r="${m.r ?? 9}" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1.5"/>`
        + `<text x="${t.x}" y="${t.y + 4}" text-anchor="middle" font-size="11" fill="${m.text}">${esc(m.glyph)}</text></g>`;
    }
  }
  const scale = view.side / 480;
  const labels: { x: number; y: number; w: number; h: number }[] = [];
  for (const { edge, targets: ts } of groups.values()) {
    const m = ts[0].marker, n = ts.length;
    const label = n > 1 ? `${n} objectives` : m.title.replace(/^Quest: /, '');
    const inward = edge.x > view.cx + view.side * .1 ? -1 : edge.x < view.cx - view.side * .1 ? 1 : 0;
    const caption = label.length > 32 ? label.slice(0, 29) + '…' : label;
    const width = caption.length * 6.3;
    let labelY = edge.y > view.cy ? -15 : 22;
    const rect = () => ({ x: edge.x + (inward * 8 - (inward < 0 ? width : inward > 0 ? 0 : width / 2)) * scale,
      y: edge.y + (labelY - 11) * scale, w: width * scale, h: 14 * scale });
    const overlaps = () => labels.some(b => {
      const a = rect(); return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    });
    for (let i = 0; i < 16 && overlaps(); i++) labelY += edge.y > view.cy ? -16 : 16;
    labels.push(rect());
    svg += `<g transform="translate(${edge.x} ${edge.y}) scale(${scale})">`
      + `<path d="M -5 -7 L 3 0 L -5 7" transform="rotate(${edge.angle})" fill="none" stroke="${m.stroke}" stroke-width="3"/>`
      + `<text x="${inward * 8}" y="${labelY}" text-anchor="${inward < 0 ? 'end' : inward > 0 ? 'start' : 'middle'}" font-size="11" fill="${m.text}" paint-order="stroke" stroke="#11111b" stroke-width="3">${esc(caption)}</text></g>`;
  }
  return svg;
}
