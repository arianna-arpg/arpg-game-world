import { cellKey, localOffset, type MassCell } from './address';
import { massHash } from './random';
import type { WorldMassRuntime } from './runtime';
import { regionKind } from '../world/regions';

interface Baked { canvas: HTMLCanvasElement; revision: number }
/** Canvas assets are renderer-owned, disposable, and bounded independently of
 * persistent exploration. No camera-relative randomness or page-edge terrain. */
export class MassPainter {
  private runtime: WorldMassRuntime | null = null;
  private baked = new Map<string, Baked>();
  draw(ctx: CanvasRenderingContext2D, mass: WorldMassRuntime, x: number, y: number, w: number, h: number): void {
    if (this.runtime !== mass) { this.runtime = mass; this.baked.clear(); }
    const span = mass.config.terrain.addressSpan;
    // Renderer.cam is the viewport's top-left, not the hero/centre.
    for (let cy = Math.floor(y / span); cy <= Math.floor((y + h) / span); cy++) {
      for (let cx = Math.floor(x / span); cx <= Math.floor((x + w) / span); cx++) {
        const at = mass.walk.at(cx * span, cy * span), key = cellKey(at);
        let bake = this.baked.get(key);
        if (!bake || bake.revision !== mass.state.terrainRevision) {
          bake = { canvas: this.bake(mass, at), revision: mass.state.terrainRevision };
        }
        this.baked.delete(key); this.baked.set(key, bake);
        ctx.drawImage(bake.canvas, cx * span, cy * span, span, span);
      }
    }
    while (this.baked.size > mass.stream.config.maxPages) this.baked.delete(this.baked.keys().next().value!);
  }
  private bake(mass: WorldMassRuntime, cell: MassCell): HTMLCanvasElement {
    const { addressSpan: span, terrainCell: cs } = mass.config.terrain;
    const canvas = document.createElement('canvas'); canvas.width = span; canvas.height = span;
    const ctx = canvas.getContext('2d')!, cols = span / cs, page = mass.stream.page(cell);
    const salt = massHash(cellKey(cell), mass.generator.run.seed);
    // Blend the sampled palette across cell centres. Physics retains its exact
    // cells; the surface does not expose a checkerboard of random tile shades.
    // The one-cell halo comes from geographic truth, including negative pages.
    const colors: number[][] = [];
    for (let y = -1; y <= cols; y++) for (let x = -1; x <= cols; x++) {
      const t = x >= 0 && y >= 0 && x < cols && y < cols ? page?.samples[y * cols + x] : undefined;
      const sample = t ?? mass.stream.sample({ ...cell, x: x * cs, y: y * cs });
      const lift = 1 + Math.max(-.14, Math.min(.14, (sample.fields.elevation ?? 0) * .13));
      const rgb = [1, 3, 5].map(i => parseInt(sample.color.slice(i, i + 2), 16) * lift);
      colors.push(rgb);
    }
    const step = 4, small = document.createElement('canvas'); small.width = span / step; small.height = span / step;
    const sc = small.getContext('2d')!, pixels = sc.createImageData(small.width, small.height);
    const atColor = (x: number, y: number): number[] => colors[(y + 1) * (cols + 2) + x + 1];
    for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) {
      const gx = (x * step + step / 2) / cs - .5, gy = (y * step + step / 2) / cs - .5;
      const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      const a = atColor(ix, iy), b = atColor(ix + 1, iy), c = atColor(ix, iy + 1), d = atColor(ix + 1, iy + 1);
      const jitter = (massHash(x + ',' + y, salt) / 0x100000000 - .5) * 5;
      const i = (y * small.width + x) * 4;
      for (let ch = 0; ch < 3; ch++) pixels.data[i + ch] = (a[ch] * (1 - fx) + b[ch] * fx) * (1 - fy) + (c[ch] * (1 - fx) + d[ch] * fx) * fy + jitter;
      pixels.data[i + 3] = 255;
    }
    sc.putImageData(pixels, 0, 0);
    ctx.drawImage(small, 0, 0, span, span);
    for (let y = 0; y < cols; y++) for (let x = 0; x < cols; x++) {
      const at = { ...cell, x: x * cs, y: y * cs };
      const t = page?.samples[y * cols + x] ?? mass.stream.sample(at);
      const noise = massHash(x + ',' + y, salt);
      if (regionKind(t.region)?.standStatusDeep) {
        ctx.fillStyle = 'rgba(153,204,211,.09)'; ctx.fillRect(x * cs + 3, y * cs + 6 + noise % 13, cs * .6, 1);
      } else {
        ctx.fillStyle = 'rgba(200,194,139,.11)';
        ctx.fillRect(x * cs + noise % 21, y * cs + (noise >>> 5) % 21, 1, 2);
        ctx.fillStyle = 'rgba(0,0,0,.16)';
        ctx.fillRect(x * cs + (noise >>> 10) % 19, y * cs + (noise >>> 15) % 19, 2, 1);
        if (t.region === 'ground' && noise % 3 === 0) {
          const px = x * cs + 4 + noise % Math.max(1, cs - 8), py = y * cs + 6 + (noise >>> 8) % Math.max(1, cs - 12);
          ctx.strokeStyle = 'rgba(123,133,66,.22)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px - 3, py - 5); ctx.quadraticCurveTo(px, py - 3, px, py + 2);
          ctx.moveTo(px + 4, py - 6); ctx.quadraticCurveTo(px + 1, py - 2, px, py + 2); ctx.stroke();
        }
      }
      if (regionKind(t.region)?.blocks) {
        // The solid silhouette remains exact, unlike soft soil-color joins.
        ctx.fillStyle = t.color; ctx.fillRect(x * cs, y * cs, cs, cs);
        const here = localOffset(at, { ...mass.origin, x: 0, y: 0 }, span)!;
        ctx.strokeStyle = 'rgba(215,210,188,.42)'; ctx.lineWidth = 3;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          if (regionKind(mass.walk.regionAt(here.x + dx * cs + cs / 2, here.y + dy * cs + cs / 2))?.blocks) continue;
          ctx.beginPath();
          if (dx) { const edge = (x + (dx > 0 ? 1 : 0)) * cs; ctx.moveTo(edge, y * cs); ctx.lineTo(edge, (y + 1) * cs); }
          else { const edge = (y + (dy > 0 ? 1 : 0)) * cs; ctx.moveTo(x * cs, edge); ctx.lineTo((x + 1) * cs, edge); }
          ctx.stroke();
        }
      }
    }
    return canvas;
  }
}

/** Small moving survey, sampled from the very same physical terrain. */
export function massMap(mass: WorldMassRuntime, player: { x: number; y: number }): string {
  const grain = 96, cols = 64, rows = 40, scale = 10;
  const left = Math.floor(player.x / grain) - cols / 2, top = Math.floor(player.y / grain) - rows / 2;
  const parts: string[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const at = mass.walk.at((left + x + .5) * grain, (top + y + .5) * grain);
    if (!mass.state.claimed('explored', cellKey(at))) continue;
    const t = mass.stream.sample(at);
    parts.push(`<rect x="${x * scale}" y="${y * scale}" width="10" height="10" fill="${t.color}"/>`);
  }
  const escape = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  for (const found of mass.sites.discovered) {
    const q = localOffset(found.center, { ...mass.origin, x: 0, y: 0 }, mass.config.terrain.addressSpan);
    const x = (q.x / grain - left) * scale, y = (q.y / grain - top) * scale;
    if (x < 0 || y < 0 || x > cols * scale || y > rows * scale) continue;
    const name = mass.config.content.find(c => c.id === found.content)?.site?.name ?? 'Discovered place';
    parts.push(`<g><title>${escape(name)}</title><path d="M${x},${y - 5}l5,5 -5,5 -5,-5Z" fill="#d1b685" stroke="#302d23"/><text x="${x + 8}" y="${y + 4}" fill="#eee0bc" font-size="10">${escape(name)}</text></g>`);
  }
  const px = (player.x / grain - left) * scale, py = (player.y / grain - top) * scale;
  return `<h2>The Unbroken Wilds</h2><svg viewBox="0 0 640 400" style="width:100%;max-height:65vh;background:#0b1112" aria-label="Survey of explored terrain">${parts.join('')}<circle cx="${px}" cy="${py}" r="4" fill="#f5dc98" stroke="#fff"/><text x="320" y="20" fill="#eadab7" text-anchor="middle">N</text></svg><p>Explored country · your position in gold</p>`;
}
