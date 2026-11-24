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
  private bins = new Map<number, { x: number; y: number }[]>();
  private reach: number;
  private r0Sq: number;
  private reachSq: number;
  constructor(private radius: number, private feather: number) {
    this.reach = radius + feather;
    this.r0Sq = radius * radius;
    this.reachSq = this.reach * this.reach;
  }
  private static pack(bx: number, by: number): number {
    return (bx + 0x100000) * 0x200000 + (by + 0x100000);
  }
  add(p: { x: number; y: number }): void {
    const key = AtlasRevealIndex.pack(Math.floor(p.x / this.reach), Math.floor(p.y / this.reach));
    let bin = this.bins.get(key);
    if (!bin) { bin = []; this.bins.set(key, bin); }
    bin.push(p);
  }
  at(x: number, y: number): number {
    const cx = Math.floor(x / this.reach), cy = Math.floor(y / this.reach);
    let nearestSq = this.reachSq;
    for (let by = cy - 1; by <= cy + 1; by++) {
      for (let bx = cx - 1; bx <= cx + 1; bx++) {
        const bin = this.bins.get(AtlasRevealIndex.pack(bx, by));
        if (!bin) continue;
        for (let i = 0; i < bin.length; i++) {
          const p = bin[i];
          const dx = p.x - x, dy = p.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= this.r0Sq) return 1;
          if (d2 < nearestSq) nearestSq = d2;
        }
      }
    }
    if (nearestSq >= this.reachSq) return 0;
    const nearest = Math.sqrt(nearestSq);
    const t = Math.min(1, Math.max(0, (nearest - this.radius) / this.feather));
    return 1 - t * t * (3 - 2 * t);
  }
}
