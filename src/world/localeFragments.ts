/** Reusable terrain cut-outs. Resolved cells and attribution travel with the save. */
export interface LocaleFragment {
  id: string;
  source: { map: string; x: number; y: number; w: number; h: number };
  cells: string[][];
  /** Named sockets in footprint fractions, at the centers of walkable cells. */
  ports: Record<string, [number, number]>;
}

export function transformFragment(fragment: LocaleFragment, turns: number, mirror: boolean): LocaleFragment {
  const out = structuredClone(fragment);
  if (mirror) {
    out.cells = out.cells.map(row => row.reverse());
    const cols = out.cells[0].length;
    for (const p of Object.values(out.ports)) p[0] = (cols - 0.5 - Math.floor(p[0] * cols)) / cols;
  }
  for (let i = 0; i < turns; i++) {
    const cells = out.cells;
    out.cells = cells[0].map((_, x) => cells.map(row => row[x]).reverse());
    for (const p of Object.values(out.ports)) [p[0], p[1]] = [(cells.length - 0.5 - Math.floor(p[1] * cells.length)) / cells.length, p[0]];
  }
  return out;
}

export function validateLocaleFragment(fragment: LocaleFragment, refs?: {
  region?: (id: string) => boolean; walkable?: (id: string) => boolean;
}): string[] {
  const errors: string[] = [], rows = fragment.cells.length, cols = fragment.cells[0]?.length ?? 0;
  if (!fragment.id || !fragment.source.map) errors.push('fragment identity/source required');
  if (![rows, cols].every(n => n >= 7 && n <= 31 && n % 2 === 1)
    || fragment.cells.some(row => row.length !== cols)) return [...errors, 'fragment requires a rectangular odd 7..31 cell grid'];
  const src = fragment.source;
  if (![src.x, src.y, src.w, src.h].every(Number.isSafeInteger) || src.x < 0 || src.y < 0 || src.w < 1 || src.h < 1) errors.push('invalid fragment source crop');
  if (refs?.region && fragment.cells.some(row => row.some(id => !refs.region!(id)))) errors.push('unknown fragment region');
  if (!Object.keys(fragment.ports).length || Object.values(fragment.ports).some(p => p.length !== 2 || !p.every(n => Number.isFinite(n) && n > 0 && n < 1))) errors.push('invalid fragment sockets');
  if (Object.values(fragment.ports).some(p => p.some((n, axis) => Math.abs(n * (axis ? rows : cols) - 0.5 - Math.round(n * (axis ? rows : cols) - 0.5)) > 1e-8))) errors.push('fragment sockets must lie at cell centers');
  if (errors.length || !refs?.walkable) return errors;
  const walkable = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && refs.walkable!(fragment.cells[y][x]);
  const seen = new Set<string>(), queue = [[Math.floor(cols / 2), Math.floor(rows / 2)]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], key = `${x}/${y}`;
    if (seen.has(key) || !walkable(x, y)) continue;
    seen.add(key);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  for (const p of Object.values(fragment.ports)) if (!seen.has(`${Math.floor(p[0] * cols)}/${Math.floor(p[1] * rows)}`)) errors.push('fragment socket disconnected from center');
  if (fragment.cells.some((row, y) => row.some((id, x) => refs.walkable!(id) && !seen.has(`${x}/${y}`)))) errors.push('fragment has disconnected walkable cells');
  return errors;
}
