/** Bound both image and reveal-mask allocations regardless of world extent. */
export function atlasBudget(bw: number, bh: number, cfg: { maxPx: number; maxPxPerUnit: number; lattice: number }, revealCell: number) {
  const w = Math.max(1, bw), h = Math.max(1, bh);
  const ppu = Math.min(cfg.maxPx / Math.max(w, h), cfg.maxPxPerUnit);
  return {
    ppu, W: Math.max(1, Math.min(cfg.maxPx, Math.ceil(w * ppu))),
    H: Math.max(1, Math.min(cfg.maxPx, Math.ceil(h * ppu))),
    // The mask need not out-resolve the sampling lattice on an enormous map.
    rcell: Math.max(revealCell, cfg.lattice / ppu),
  };
}

/** Sparse exact reveal for very large extents. A coarsened interpolated mask
 * would spread one known point across an oversized cell and expose unknown land. */
export class AtlasRevealIndex {
  private bins = new Map<string, { x: number; y: number }[]>();
  private reach: number;
  constructor(private radius: number, private feather: number) { this.reach = radius + feather; }
  add(p: { x: number; y: number }): void {
    const key = `${Math.floor(p.x / this.reach)},${Math.floor(p.y / this.reach)}`;
    const bin = this.bins.get(key) ?? []; bin.push(p); this.bins.set(key, bin);
  }
  at(x: number, y: number): number {
    const cx = Math.floor(x / this.reach), cy = Math.floor(y / this.reach);
    let nearest = this.reach;
    for (let by = cy - 1; by <= cy + 1; by++) for (let bx = cx - 1; bx <= cx + 1; bx++)
      for (const p of this.bins.get(`${bx},${by}`) ?? []) nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
    const t = Math.min(1, Math.max(0, (nearest - this.radius) / this.feather));
    return 1 - t * t * (3 - 2 * t);
  }
}
