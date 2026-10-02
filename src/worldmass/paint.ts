import { cellKey, localOffset, type MassCell } from './address';
import { massHash } from './random';
import type { WorldMassRuntime } from './runtime';
import { regionKind } from '../world/regions';
import { MASS_CLEARANCE_VIEW } from './clearance';

interface Baked { canvas: HTMLCanvasElement; revision: number }
/** Canvas assets are renderer-owned, disposable, and bounded independently of
 * persistent exploration. No camera-relative randomness or page-edge terrain. */
export class MassPainter {
  private settlementLayer: HTMLCanvasElement | null = null;
  /** Composite native floors through a feathered verge, with neither an arena
   * rim nor a hard rectangle where the procedural country begins. */
  drawSettlement(ctx: CanvasRenderingContext2D, mass: WorldMassRuntime,
    x: number, y: number, w: number, h: number, draw: (layer: CanvasRenderingContext2D) => void): void {
    const town = mass.settlement;
    if (!town || x > town.zone.size.w || y > town.zone.size.h || x + w < 0 || y + h < 0) return;
    const canvas = this.settlementLayer ?? (this.settlementLayer = document.createElement('canvas'));
    const width = Math.ceil(w), height = Math.ceil(h);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const g = canvas.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, width, height);
    g.save(); g.translate(-x, -y);
    g.beginPath(); g.rect(0, 0, town.zone.size.w, town.zone.size.h); g.clip();
    draw(g);
    g.globalCompositeOperation = 'destination-in';
    const tw = town.zone.size.w, th = town.zone.size.h, fade = town.spec.blend;
    const mask = (x0: number, y0: number, x1: number, y1: number, length: number) => {
      const gradient = g.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, 'transparent'); gradient.addColorStop(fade / length, '#000');
      gradient.addColorStop(1 - fade / length, '#000'); gradient.addColorStop(1, 'transparent');
      g.fillStyle = gradient; g.fillRect(0, 0, tw, th);
    };
    mask(0, 0, tw, 0, tw); mask(0, 0, 0, th, th);
    g.restore();
    ctx.drawImage(canvas, x, y);
  }
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
    const solid = new Path2D();
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
        solid.rect(x * cs, y * cs, cs, cs);
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
    // Fractured stone has its own larger geographic lattice. Planes cross
    // physical tile/page joins; clipping preserves the exact collision contour.
    const origin = localOffset({ ...cell, x: 0, y: 0 }, { ...mass.origin, x: 0, y: 0 }, span), grain = cs * 4;
    const vertex = (gx: number, gy: number): { x: number; y: number } => {
      const h = massHash('stone/'+gx+','+gy,mass.generator.run.seed);
      return { x: (gx+.15+(h&255)/255*.7)*grain-origin.x,
        y: (gy+.15+((h>>>8)&255)/255*.7)*grain-origin.y };
    };
    ctx.save(); ctx.clip(solid);
    for (let gy=Math.floor(origin.y/grain)-1;gy<=Math.ceil((origin.y+span)/grain);gy++)
      for (let gx=Math.floor(origin.x/grain)-1;gx<=Math.ceil((origin.x+span)/grain);gx++) {
        const a=vertex(gx,gy),b=vertex(gx+1,gy),c=vertex(gx+1,gy+1),d=vertex(gx,gy+1);
        const shade=massHash('plane/'+gx+','+gy,mass.generator.run.seed);
        for (const [index,triangle] of [[a,b,c],[a,c,d]].entries()) {
          ctx.fillStyle=index?'rgba(8,15,16,'+(.08+(shade%13)/100)+')':'rgba(225,222,199,'+(.04+(shade%9)/100)+')';
          ctx.beginPath();ctx.moveTo(triangle[0].x,triangle[0].y);
          ctx.lineTo(triangle[1].x,triangle[1].y);ctx.lineTo(triangle[2].x,triangle[2].y);ctx.closePath();ctx.fill();
        }
      }
    ctx.restore();
    return canvas;
  }
}

/** Small moving survey, sampled from the very same physical terrain. */
export function massMap(mass: WorldMassRuntime, player: { x: number; y: number }, grain = 48): string {
  const cols = 64, rows = 40, scale = 10;
  const left = Math.floor(player.x / grain) - cols / 2, top = Math.floor(player.y / grain) - rows / 2;
  const parts: string[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const at = mass.walk.at((left + x + .5) * grain, (top + y + .5) * grain);
    if (!mass.state.claimed('explored', cellKey(at))) continue;
    const t = mass.stream.sample(at);
    const px = (left+x+.5)*grain, py = (top+y+.5)*grain;
    const native = mass.settlement?.contains(px,py) ? mass.settlement.grid.regionAt(px,py) : undefined;
    const kind = regionKind(native);
    const color = kind?.blocks ? '#777568' : kind?.standStatusDeep ? '#365d68'
      : native === 'road' ? '#a19271' : kind?.laid === 'built' ? '#837358' : t.color;
    parts.push(`<rect x="${x * scale}" y="${y * scale}" width="10" height="10" fill="${color}"/>`);
  }
  const escape = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  if (mass.settlement) {
    const town = mass.settlement;
    for (const st of town.structures) {
      const center = mass.walk.at(st.rect.x+st.rect.w/2,st.rect.y+st.rect.h/2);
      if (!mass.state.claimed('explored',cellKey(center))) continue;
      const x = (st.rect.x/grain-left)*scale, y = (st.rect.y/grain-top)*scale;
      parts.push(`<rect x="${x}" y="${y}" width="${st.rect.w/grain*scale}" height="${st.rect.h/grain*scale}" rx="1" fill="#4c4336" stroke="#bdab87" stroke-width="1"><title>${escape(st.defId.replace(/_/g,' '))}</title></rect>`);
      for (const door of st.doors) parts.push(`<circle cx="${(door.pos.x/grain-left)*scale}" cy="${(door.pos.y/grain-top)*scale}" r="1.5" fill="#f1d8a2"/>`);
    }
    const rawX = (town.zone.size.w/2/grain-left)*scale, rawY = (town.zone.size.h/2/grain-top)*scale;
    const x = Math.max(20,Math.min(cols*scale-90,rawX)), y = Math.max(35,Math.min(rows*scale-20,rawY));
    const bearing = ['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(rawY-rows*scale/2,rawX-cols*scale/2)/(Math.PI/4))+8)%8];
    parts.push(`<g><title>${escape(town.zone.name)}</title><path d="M${x-5},${y+4}v-8l5,-4 5,4v8Z" fill="#edd3a0"/><text x="${x+8}" y="${y+4}" fill="#eee0bc" font-size="11">${escape(town.zone.name)}${x!==rawX||y!==rawY?' '+bearing:''}</text></g>`);
  }
  // A surveyed path keeps its shape at map scale; only entered pages reveal it.
  if (mass.journey) {
    const clips: string[] = [];
    const span = mass.config.terrain.addressSpan;
    for (let cy = Math.floor(top*grain/span); cy <= Math.floor((top+rows)*grain/span); cy++)
      for (let cx = Math.floor(left*grain/span); cx <= Math.floor((left+cols)*grain/span); cx++) {
        if (!mass.state.claimed('explored',cellKey(mass.walk.at(cx*span,cy*span)))) continue;
        clips.push(`<rect x="${(cx*span/grain-left)*scale}" y="${(cy*span/grain-top)*scale}" width="${span/grain*scale}" height="${span/grain*scale}"/>`);
      }
    parts.push('<defs><clipPath id="mass-surveyed-trails">'+clips.join('')+'</clipPath></defs>');
    for (const trail of mass.journey.trails) parts.push(`<polyline points="${trail.points.map(p=>[(p.x/grain-left)*scale,(p.y/grain-top)*scale].join(',')).join(' ')}" fill="none" stroke="#b3a17b" stroke-width="2" stroke-linejoin="round" clip-path="url(#mass-surveyed-trails)"/>`);
  }
  for (const found of mass.sites.discovered) {
    const q = localOffset(found.center, { ...mass.origin, x: 0, y: 0 }, mass.config.terrain.addressSpan);
    const x = (q.x / grain - left) * scale, y = (q.y / grain - top) * scale;
    if (x < 0 || y < 0 || x > cols * scale || y > rows * scale) continue;
    const title = mass.config.content.find(c => c.id === found.content)?.site?.name ?? 'Discovered place';
    const opened = mass.siteSearched(found.id);
    const label = mass.config.progression ? title + ' · Lv ' + mass.populationFor(found).level : title;
    const name = label + (mass.siteCleared(found.id) ? ' · '+MASS_CLEARANCE_VIEW.complete : '') + (opened ? ' · Searched' : '');
    parts.push(`<g><title>${escape(name)}</title><path d="M${x},${y - 5}l5,5 -5,5 -5,-5Z" fill="#d1b685" stroke="#302d23"/><text x="${x + 8}" y="${y + 4}" fill="#eee0bc" font-size="10">${escape(name)}</text></g>`);
  }
  const px = (player.x / grain - left) * scale, py = (player.y / grain - top) * scale;
  return `<h2>The Unbroken Wilds</h2><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button data-mass-zoom="in" aria-label="Zoom in" ${grain<=24?'disabled':''}>+</button><button data-mass-zoom="out" aria-label="Zoom out" ${grain>=192?'disabled':''}>−</button><span>${grain===24?'Close detail':grain===48?'Nearby country':'Regional survey'}</span></div><svg viewBox="0 0 640 400" style="width:100%;max-height:65vh;background:#0b1112" aria-label="Survey of explored terrain">${parts.join('')}<circle cx="${px}" cy="${py}" r="4" fill="#f5dc98" stroke="#fff"/><text x="320" y="20" fill="#eadab7" text-anchor="middle">N</text></svg><p>Explored country · your position in gold</p>`;
}
