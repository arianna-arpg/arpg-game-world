import { cellKey, localOffset, neighborCell, type MassCell } from './address';
import { massHash } from './random';
import type { WorldMassRuntime } from './runtime';
import { regionKind } from '../world/regions';
import { MASS_CLEARANCE_VIEW } from './clearance';
import { paintMassTrailWear } from './trailWear';
import { MASS_SURFACE_VIEW, paintMassSurfaceDetail } from './surfaceDetail';
import type { Doodad } from '../engine/levelgen';
import { massMapSigns, MASS_MAP_SIGNS } from './cartography';
import { MassGround } from './ground';
import { mix } from '../render/vis/color';
import { paintRegionMasonry, paintRegionFoliage } from '../render/vis/regionMaterials';
import type { MassQuestPin } from './quests';
import { MASS_MAP_LABELS, placeMassMapLabels, type MapBox, type MassMapLabel } from './mapLabels';

interface Baked { canvas: HTMLCanvasElement; revision: number; checkedRevision: number }
interface FloorJob { work: Generator<void, HTMLCanvasElement>; revision: number; checkedRevision: number }
export interface MassFloorPreparation {
  enabled: boolean; stepsPerDraw: number; halo: number; maxPending: number;
  /** Soft elapsed-time allowance checked between steps; omitted keeps step-only pacing. */
  maxWorkMs?: number;
}
/** Renderer work policy, independent of saved geography and simulation speed.
 * A step is one palette/pixel/detail row or bounded finishing phase, not ms. */
export const MASS_FLOOR_VIEW: MassFloorPreparation = { enabled: true, stepsPerDraw: 24, halo: 1, maxPending: 2, maxWorkMs: 2 };
/** Canvas assets are renderer-owned, disposable, and bounded independently of
 * persistent exploration. No camera-relative randomness or page-edge terrain. */
export class MassPainter {
  private readonly preparation: Readonly<MassFloorPreparation>;
  private pending = new Map<string, FloorJob>();
  constructor(preparation: MassFloorPreparation = MASS_FLOOR_VIEW,
    private readonly now: () => number = () => performance.now()) {
    if (typeof preparation.enabled !== 'boolean'
      || !Number.isSafeInteger(preparation.stepsPerDraw) || preparation.stepsPerDraw < 0 || preparation.stepsPerDraw > 1024
      || !Number.isSafeInteger(preparation.halo) || preparation.halo < 0 || preparation.halo > 2
      || !Number.isSafeInteger(preparation.maxPending) || preparation.maxPending < 0 || preparation.maxPending > 8
      || preparation.maxWorkMs !== undefined && (!Number.isFinite(preparation.maxWorkMs)
        || preparation.maxWorkMs < 0 || preparation.maxWorkMs > 100))
      throw Error('Invalid floor preparation budget');
    this.preparation = Object.freeze({ ...preparation });
  }
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
  private ground: MassGround | null = null;
  private baked = new Map<string, Baked>();
  private revision(mass: WorldMassRuntime, cell: MassCell): number {
    // Palette blending and solid contours include the neighboring-cell halo.
    let revision = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      revision = Math.max(revision, mass.stream.revisionAt(neighborCell(cell, dx, dy)));
    return revision;
  }
  private current(mass: WorldMassRuntime, cell: MassCell, value: {revision:number;checkedRevision:number}): boolean {
    if (value.checkedRevision === mass.stream.revision) return true;
    if (value.revision !== this.revision(mass, cell)) return false;
    value.checkedRevision = mass.stream.revision;
    return true;
  }
  draw(ctx: CanvasRenderingContext2D, mass: WorldMassRuntime, x: number, y: number, w: number, h: number): void {
    if (this.runtime !== mass) {
      this.runtime = mass; this.baked.clear(); this.pending.clear();
      this.ground = new MassGround(mass.config.ground, mass.generator.run.seed, mass.config.terrain.addressSpan);
    }
    const span = mass.config.terrain.addressSpan, visible = new Set<string>();
    let finishedVisible = false;
    const left = Math.floor(x/span), top = Math.floor(y/span), right = Math.floor((x+w)/span), bottom = Math.floor((y+h)/span);
    // Visible ground is always complete and current. A sudden camera jump may
    // drain remaining work synchronously; partial canvases never reach the view.
    for (let cy = top; cy <= bottom; cy++) for (let cx = left; cx <= right; cx++) {
      const at = mass.walk.at(cx*span, cy*span), key = cellKey(at); visible.add(key);
      let bake = this.baked.get(key);
      if (!bake || !this.current(mass, at, bake)) {
        finishedVisible = true;
        const job = this.pending.get(key);
        const canvas = job && this.current(mass, at, job) ? this.finish(job.work) : this.bake(mass, at);
        bake = {canvas, revision:this.revision(mass, at), checkedRevision:mass.stream.revision};
      }
      this.pending.delete(key);
      this.baked.delete(key); this.baked.set(key, bake);
      ctx.drawImage(bake.canvas, cx*span, cy*span, span, span);
    }
    while (this.baked.size > mass.stream.config.maxPages) this.baked.delete(this.baked.keys().next().value!);
    this.prepare(mass, visible, {left, top, right, bottom}, {x:x+w/2,y:y+h/2}, !finishedVisible);
  }
  private prepare(mass: WorldMassRuntime, visible: ReadonlySet<string>,
    bounds: {left:number;top:number;right:number;bottom:number}, center: {x:number;y:number}, advance: boolean): void {
    const cfg=this.preparation, span=mass.config.terrain.addressSpan, cap=mass.stream.config.maxPages;
    if (!cfg.enabled || !cfg.stepsPerDraw || !cfg.halo || !cfg.maxPending || cfg.maxWorkMs === 0 || visible.size>=cap) {
      this.pending.clear(); return;
    }
    const candidates: {key:string;cell:MassCell;distance:number}[]=[];
    for (let cy=bounds.top-cfg.halo;cy<=bounds.bottom+cfg.halo;cy++)
      for (let cx=bounds.left-cfg.halo;cx<=bounds.right+cfg.halo;cx++) {
        const cell=mass.walk.at(cx*span,cy*span),key=cellKey(cell);
        if (visible.has(key) || !mass.stream.page(cell)) continue;
        candidates.push({key,cell,distance:((cx+.5)*span-center.x)**2+((cy+.5)*span-center.y)**2});
      }
    candidates.sort((a,b)=>a.distance-b.distance || a.key.localeCompare(b.key));
    // Keep a stable nearest set when the apron exceeds capacity, otherwise
    // completed speculative pages would evict and rebuild one another forever.
    const desired=candidates.slice(0,cap-visible.size);
    const wanted=new Set(desired.map(c=>c.key));
    const selected=desired.filter(({key,cell})=>{
      const bake=this.baked.get(key);
      return !bake || !this.current(mass,cell,bake);
    }).slice(0,cfg.maxPending);
    for (const key of this.pending.keys()) if (!selected.some(c=>c.key===key)) this.pending.delete(key);
    for (const {key,cell} of selected) {
      const job=this.pending.get(key);
      if (job && this.current(mass,cell,job)) continue;
      this.baked.delete(key);
      this.pending.set(key,{work:this.bakeSteps(mass,cell),revision:this.revision(mass,cell),checkedRevision:mass.stream.revision});
    }
    // Pending and completed canvases share one residency budget. Never evict
    // visible ground to make room for speculative work.
    while (this.baked.size+this.pending.size>cap) {
      const keys=[...this.baked.keys()];
      const key=keys.find(k=>!visible.has(k)&&!wanted.has(k)) ?? keys.find(k=>!visible.has(k));
      if (key===undefined) break;
      this.baked.delete(key);
    }
    // Do not stack speculative painting onto a frame already paying for a
    // visible cold bake or partial completion. Queue bookkeeping still bounds memory.
    let budget=advance ? cfg.stepsPerDraw : 0;
    // One draw shares one allowance across every queued tile. A native canvas
    // operation cannot be interrupted: this yields between rows/phases, and
    // does not bound cold visible work or promise an overall frame time.
    const started = budget && cfg.maxWorkMs !== undefined ? this.now() : 0;
    const withinTime = () => {
      if (cfg.maxWorkMs === undefined) return true;
      const elapsed = this.now() - started;
      return elapsed >= 0 && elapsed < cfg.maxWorkMs;
    };
    for (const {key} of selected) {
      const job=this.pending.get(key);
      if (!job) continue;
      while (budget>0 && withinTime()) {
        budget--;
        const result=job.work.next();
        if (result.done) {
          this.baked.set(key,{canvas:result.value,revision:job.revision,checkedRevision:job.checkedRevision});
          this.pending.delete(key); break;
        }
      }
      if (!budget) break;
    }
  }
  private finish(work: Generator<void, HTMLCanvasElement>): HTMLCanvasElement {
    for (;;) { const result=work.next(); if (result.done) return result.value; }
  }
  private bake(mass: WorldMassRuntime, cell: MassCell): HTMLCanvasElement {
    return this.finish(this.bakeSteps(mass,cell));
  }
  private *bakeSteps(mass: WorldMassRuntime, cell: MassCell): Generator<void, HTMLCanvasElement> {
    const { addressSpan: span, terrainCell: cs } = mass.config.terrain;
    const canvas = document.createElement('canvas'); canvas.width = span; canvas.height = span;
    const ctx = canvas.getContext('2d')!, cols = span / cs, page = mass.stream.page(cell);
    const salt = massHash(cellKey(cell), mass.generator.run.seed);
    // Blend the sampled palette across cell centres. Physics retains its exact
    // cells; the surface does not expose a checkerboard of random tile shades.
    // The one-cell halo comes from geographic truth, including negative pages.
    const colors: number[][] = [];
    const ground = this.runtime === mass && this.ground ? this.ground : new MassGround(mass.config.ground, mass.generator.run.seed, span);
    for (let y = -1; y <= cols; y++) { for (let x = -1; x <= cols; x++) {
      const t = x >= 0 && y >= 0 && x < cols && y < cols ? page?.samples[y * cols + x] : undefined;
      const sample = t ?? mass.stream.sample({ ...cell, x: x * cs, y: y * cs });
      const lift = 1 + Math.max(-.14, Math.min(.14, (sample.fields.elevation ?? 0) * .13));
      const rgb = ground.color(sample, { ...cell, x: (x + .5) * cs, y: (y + .5) * cs }).map(v => v * lift);
      colors.push(rgb);
    } yield; }
    const step = 4, small = document.createElement('canvas'); small.width = span / step; small.height = span / step;
    const sc = small.getContext('2d')!, pixels = sc.createImageData(small.width, small.height);
    const atColor = (x: number, y: number): number[] => colors[(y + 1) * (cols + 2) + x + 1];
    for (let y = 0; y < small.height; y++) { for (let x = 0; x < small.width; x++) {
      const gx = (x * step + step / 2) / cs - .5, gy = (y * step + step / 2) / cs - .5;
      const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      const a = atColor(ix, iy), b = atColor(ix + 1, iy), c = atColor(ix, iy + 1), d = atColor(ix + 1, iy + 1);
      const jitter = (massHash(x + ',' + y, salt) / 0x100000000 - .5) * 5;
      const i = (y * small.width + x) * 4;
      for (let ch = 0; ch < 3; ch++) pixels.data[i + ch] = (a[ch] * (1 - fx) + b[ch] * fx) * (1 - fy) + (c[ch] * (1 - fx) + d[ch] * fx) * fy + jitter;
      pixels.data[i + 3] = 255;
    } yield; }
    sc.putImageData(pixels, 0, 0);
    ctx.drawImage(small, 0, 0, span, span); yield;
    const solid = new Path2D(), trailSurface = new Path2D();
    // Renderer texture phase uses the durable address, never the movable hero
    // frame. This bounded visual period is divisible by native courses (15),
    // blocks (20) and foliage cells (30); it is not a geography period.
    const materialPeriod = BigInt(cs * 65536);
    const materialAxis = (value: string): number => Number((BigInt(value) * BigInt(span) % materialPeriod + materialPeriod) % materialPeriod);
    const materialX = materialAxis(cell.cx), materialY = materialAxis(cell.cy);
    const detailSurfaces = new Map<string,Path2D>();
    for (let y = 0; y < cols; y++) { for (let x = 0; x < cols; x++) {
      const at = { ...cell, x: x * cs, y: y * cs };
      const t = page?.samples[y * cols + x] ?? mass.stream.sample(at);
      const noise = massHash(x + ',' + y, salt);
      if(MASS_SURFACE_VIEW.enabled && MASS_SURFACE_VIEW.regions[t.region]){
        let surface=detailSurfaces.get(t.region);
        if(!surface){surface=new Path2D();detailSurfaces.set(t.region,surface);}
        surface.rect(x*cs,y*cs,cs,cs);
      }
      // Only the surviving route's attributed ground receives wear. A later
      // terrain consequence, clearing or native town floor owns its own face.
      if (t.region === 'ground' && mass.journey
        && mass.state.patchAt(at)?.cause === mass.journey.spec.source + '/trail')
        trailSurface.rect(x * cs, y * cs, cs, cs);
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
        // Keep native material identity: the same fill, running bond, leaf
        // clumps and rim the native ground baker uses. A hedge never receives
        // the generic rock fracture overlay, nor a field wall a cliff texture.
        const vis = regionKind(t.region)?.visual, px = x * cs, py = y * cs;
        const fill = vis?.fill ?? t.color;
        ctx.globalAlpha = vis?.alpha ?? 1;
        ctx.fillStyle = fill; ctx.fillRect(px, py, cs, cs); ctx.globalAlpha = 1;
        if (vis) {
          const dark = mix(fill, '#000000', .42), lit = mix(fill, '#ffffff', .34);
          if (vis.masonry) paintRegionMasonry(ctx, px, py, cs, materialX, materialY, fill, dark, lit, mass.generator.run.seed);
          if (vis.foliage) paintRegionFoliage(ctx, px, py, cs, materialX, materialY, fill, dark, lit, mass.generator.run.seed);
        } else solid.rect(px, py, cs, cs);
        const here = localOffset(at, { ...mass.origin, x: 0, y: 0 }, span)!;
        const edge = vis?.edge;
        // Match native semantics: visual walls rim only walkable neighbors.
        // The themed generic wall retains its existing country silhouette.
        if (!vis || edge) for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const neighbor = regionKind(mass.walk.regionAt(here.x + dx * cs + cs / 2, here.y + dy * cs + cs / 2));
          if (vis ? !neighbor?.walkable : neighbor?.blocks) continue;
          if (edge) {
            const width = Math.min(cs, edge.width ?? 4);
            ctx.fillStyle = edge.color; ctx.globalAlpha = .9;
            ctx.fillRect(px + (dx > 0 ? cs - width : 0), py + (dy > 0 ? cs - width : 0), dx ? width : cs, dy ? width : cs);
            ctx.globalAlpha = 1;
          } else {
            ctx.strokeStyle = 'rgba(215,210,188,.42)'; ctx.lineWidth = 3;
            ctx.beginPath();
            if (dx) { const ex = (x + (dx > 0 ? 1 : 0)) * cs; ctx.moveTo(ex, py); ctx.lineTo(ex, py + cs); }
            else { const ey = (y + (dy > 0 ? 1 : 0)) * cs; ctx.moveTo(px, ey); ctx.lineTo(px + cs, ey); }
            ctx.stroke();
          }
        }
      }
    } yield; }
    // Fractured stone has its own larger geographic lattice. Planes cross
    // physical tile/page joins; clipping preserves the exact collision contour.
    const origin = localOffset({ ...cell, x: 0, y: 0 }, { ...mass.origin, x: 0, y: 0 }, span), grain = cs * 4;
    for(const [region,surface] of detailSurfaces){
      ctx.save();ctx.clip(surface);ctx.translate(-origin.x,-origin.y);
      paintMassSurfaceDetail(ctx,{x:origin.x,y:origin.y,w:span,h:span},mass.generator.run.seed,region);
      ctx.restore(); yield;
    }
    if (mass.journey) {
      ctx.save(); ctx.clip(trailSurface); ctx.translate(-origin.x, -origin.y);
      paintMassTrailWear(ctx, mass.journey.trails, {x:origin.x,y:origin.y,w:span,h:span}, mass.generator.run.seed);
      ctx.restore(); yield;
    }
    const vertex = (gx: number, gy: number): { x: number; y: number } => {
      const h = massHash('stone/'+gx+','+gy,mass.generator.run.seed);
      return { x: (gx+.15+(h&255)/255*.7)*grain-origin.x,
        y: (gy+.15+((h>>>8)&255)/255*.7)*grain-origin.y };
    };
    ctx.save(); ctx.clip(solid);
    for (let gy=Math.floor(origin.y/grain)-1;gy<=Math.ceil((origin.y+span)/grain);gy++) {
      for (let gx=Math.floor(origin.x/grain)-1;gx<=Math.ceil((origin.x+span)/grain);gx++) {
        const a=vertex(gx,gy),b=vertex(gx+1,gy),c=vertex(gx+1,gy+1),d=vertex(gx,gy+1);
        const shade=massHash('plane/'+gx+','+gy,mass.generator.run.seed);
        for (const [index,triangle] of [[a,b,c],[a,c,d]].entries()) {
          ctx.fillStyle=index?'rgba(8,15,16,'+(.08+(shade%13)/100)+')':'rgba(225,222,199,'+(.04+(shade%9)/100)+')';
          ctx.beginPath();ctx.moveTo(triangle[0].x,triangle[0].y);
          ctx.lineTo(triangle[1].x,triangle[1].y);ctx.lineTo(triangle[2].x,triangle[2].y);ctx.closePath();ctx.fill();
        }
      }
    yield; }
    ctx.restore();
    return canvas;
  }
}

/** Small moving survey, sampled from the very same physical terrain. */
export function massMap(mass: WorldMassRuntime, player: { x: number; y: number }, grain = 48, scenery: readonly Doodad[] = [], questPins: readonly MassQuestPin[] = []): string {
  const cols = 64, rows = 40, scale = 10;
  const left = Math.floor(player.x / grain) - cols / 2, top = Math.floor(player.y / grain) - rows / 2;
  const surveyClips: string[] = [];
  const parts: string[] = [], labels: MassMapLabel[] = [], markers: MapBox[] = [], placeRows: string[] = [];
  const marker = (x: number, y: number, r: number): void => { markers.push({x:x-r,y:y-r,w:r*2,h:r*2}); };
  const playerX=(player.x/grain-left)*scale, playerY=(player.y/grain-top)*scale;
  marker(playerX,playerY,8);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const at = mass.walk.at((left + x + .5) * grain, (top + y + .5) * grain);
    if (!mass.survey.known(at)) continue;
    const t = mass.stream.sample(at);
    const px = (left+x+.5)*grain, py = (top+y+.5)*grain;
    const native = mass.settlement?.contains(px,py) ? mass.settlement.grid.regionAt(px,py) : undefined;
    const kind = regionKind(native);
    const color = kind?.blocks ? '#777568' : kind?.standStatusDeep ? '#365d68'
      : native === 'road' ? '#a19271' : kind?.laid === 'built' ? '#837358' : t.color;
    surveyClips.push(`<rect x="${x*scale}" y="${y*scale}" width="10" height="10"/>`);
    parts.push(`<rect x="${x * scale}" y="${y * scale}" width="10" height="10" fill="${color}"/>`);
  }
  const escape = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  if (mass.settlement) {
    const town = mass.settlement;
    for (const st of town.structures) {
      const center = mass.walk.at(st.rect.x+st.rect.w/2,st.rect.y+st.rect.h/2);
      if (!mass.survey.known(center)) continue;
      const x = (st.rect.x/grain-left)*scale, y = (st.rect.y/grain-top)*scale;
      parts.push(`<rect x="${x}" y="${y}" width="${st.rect.w/grain*scale}" height="${st.rect.h/grain*scale}" rx="1" fill="#4c4336" stroke="#bdab87" stroke-width="1"><title>${escape(st.defId.replace(/_/g,' '))}</title></rect>`);
      for (const door of st.doors) parts.push(`<circle cx="${(door.pos.x/grain-left)*scale}" cy="${(door.pos.y/grain-top)*scale}" r="1.5" fill="#f1d8a2"/>`);
    }
    const rawX = (town.zone.size.w/2/grain-left)*scale, rawY = (town.zone.size.h/2/grain-top)*scale;
    const x = Math.max(20,Math.min(cols*scale-90,rawX)), y = Math.max(35,Math.min(rows*scale-20,rawY));
    const bearing = ['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(rawY-rows*scale/2,rawX-cols*scale/2)/(Math.PI/4))+8)%8];
    const homeName=town.zone.name+(x!==rawX||y!==rawY?' '+bearing:'');
    labels.push({id:'home',name:homeName,x,y,priority:2}); marker(x,y,8);
    parts.push(`<g data-mass-place="home" tabindex="0" aria-label="${escape(homeName)}"><title>${escape(homeName)}</title><path d="M${x-5},${y+4}v-8l5,-4 5,4v8Z" fill="#edd3a0"/></g>`);
  }
  // Roads and terrain share exactly the same surveyed cells at every zoom.
  if (mass.journey) {
    parts.push('<defs><clipPath id="mass-surveyed-trails">'+surveyClips.join('')+'</clipPath></defs>');
    for (const trail of mass.journey.trails) parts.push(`<polyline points="${trail.points.map(p=>[(p.x/grain-left)*scale,(p.y/grain-top)*scale].join(',')).join(' ')}" fill="none" stroke="#b3a17b" stroke-width="2" stroke-linejoin="round" clip-path="url(#mass-surveyed-trails)"/>`);
  }
  for (const found of [...mass.sites.discovered].sort((a,b)=>a.id.localeCompare(b.id))) {
    const q = localOffset(found.center, { ...mass.origin, x: 0, y: 0 }, mass.config.terrain.addressSpan);
    const x = (q.x / grain - left) * scale, y = (q.y / grain - top) * scale;
    if (x < 0 || y < 0 || x > cols * scale || y > rows * scale) continue;
    const title = mass.config.content.find(c => c.id === found.content)?.site?.name ?? 'Discovered place';
    const opened = mass.siteSearched(found.id);
    const label = mass.config.progression ? title + ' · Lv ' + mass.populationFor(found).level : title;
    const name = label + (mass.puzzles.activity(found.id)?.complete ? ' · Riddle resolved' : '') + (mass.siteCleared(found.id) ? ' · '+MASS_CLEARANCE_VIEW.complete : '') + (opened ? ' · Searched' : '');
    marker(x,y,7); labels.push({id:found.id,name:title,x,y,priority:1});
    parts.push(`<g data-mass-place="${escape(found.id)}" tabindex="0" aria-label="${escape(name)}"><title>${escape(name)}</title><path d="M${x},${y - 5}l5,5 -5,5 -5,-5Z" fill="#d1b685" stroke="#302d23"/></g>`);
    placeRows.push(`<li data-mass-place-detail="${escape(found.id)}" style="break-inside:avoid;margin:3px 0">${escape(name)}</li>`);
  }
  const signs=grain<=MASS_MAP_SIGNS.maxGrain ? massMapSigns(mass,scenery) : [];
  const townNear=!!mass.settlement?.contains(player.x,player.y);
  const signRows:string[]=[];
  for(const sign of signs){
    const rawX=(sign.x/grain-left)*scale,rawY=(sign.y/grain-top)*scale;
    const inside=rawX>=12&&rawY>=28&&rawX<=cols*scale-12&&rawY<=rows*scale-12;
    if(!inside && !townNear)continue;
    if(inside)marker(rawX,rawY,MASS_MAP_SIGNS.radius+2);
    if(inside)parts.push(`<g data-mass-service><title>${escape(sign.name)}</title><circle cx="${rawX}" cy="${rawY}" r="${MASS_MAP_SIGNS.radius}" fill="#191b20" stroke="${escape(sign.color)}" stroke-width="1.5"/><text x="${rawX}" y="${rawY+4}" fill="${escape(sign.color)}" font-size="12" text-anchor="middle">${escape(sign.glyph)}</text></g>`);
    const bearing=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(sign.y-player.y,sign.x-player.x)/(Math.PI/4))+8)%8];
    signRows.push(`<span style="white-space:nowrap;color:${escape(sign.color)}">${escape(sign.glyph)} ${escape(sign.name)} ${bearing}${inside?'':' · beyond this view'}</span>`);
  }
  const questRows: string[] = [];
  for (const pin of questPins) {
    const rawX=(pin.x/grain-left)*scale, rawY=(pin.y/grain-top)*scale;
    const inside=rawX>=12 && rawY>=28 && rawX<=cols*scale-12 && rawY<=rows*scale-12;
    const x=Math.max(12,Math.min(cols*scale-12,rawX)), y=Math.max(28,Math.min(rows*scale-12,rawY));
    const bearing=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(pin.y-player.y,pin.x-player.x)/(Math.PI/4))+8)%8];
    marker(x,y,12);
    parts.push(`<g data-mass-quest><title>${escape(pin.label)}</title><circle cx="${x}" cy="${y}" r="10" fill="#251e11" stroke="#f0c563" stroke-width="2"/><text x="${x}" y="${y+4}" fill="#ffe3a1" font-size="13" text-anchor="middle">${inside?'!':bearing}</text></g>`);
    questRows.push(`<span style="color:#f0c563">! ${escape(pin.label)} ${bearing}${inside?'':' · beyond this view'}</span>`);
  }
  const questLegend=questRows.length ? '<div data-mass-quest-directions style="display:flex;flex-wrap:wrap;gap:8px 20px;font-size:12px;line-height:1.7;margin:8px 0">'+questRows.join('')+'</div>' : '';
  const legend=signRows.length ? '<div data-mass-services style="display:flex;flex-wrap:wrap;gap:8px 20px;font-size:12px;line-height:1.7;margin:8px 0">'+signRows.join('')+'</div>' : '';
  const cfg=MASS_MAP_LABELS;
  const context=typeof document==='undefined'?null:document.createElement('canvas').getContext('2d');
  if(context)context.font=cfg.fontSize+'px sans-serif';
  const laid=placeMassMapLabels(labels,markers,{x:6,y:28,w:628,h:366},
    text=>context?.measureText(text).width??text.length*cfg.fontSize*.65);
  for(const label of laid){
    const lx=Math.max(label.x,Math.min(label.x+label.w,label.anchor.x));
    const ly=Math.max(label.y,Math.min(label.y+label.h,label.anchor.y));
    parts.push(`<g data-mass-label="${escape(label.id)}" pointer-events="none"><path d="M${label.anchor.x},${label.anchor.y}L${lx},${ly}" stroke="${cfg.leader}" stroke-width=".8"/><rect x="${label.x}" y="${label.y}" width="${label.w}" height="${label.h}" rx="3" fill="${cfg.paper}" fill-opacity=".94"/><text x="${label.x+cfg.inset}" y="${label.y+label.h/2}" dominant-baseline="central" font-family="sans-serif" font-size="${cfg.fontSize}" fill="${cfg.ink}">${escape(label.text)}</text></g>`);
  }
  const placeLegend=placeRows.length?'<div data-mass-place-index style="max-height:96px;overflow:auto;margin-top:8px;font-size:12px;line-height:1.5"><ul style="list-style:none;margin:0;padding:0;columns:240px 2">'+placeRows.join('')+'</ul></div>':'';
  const px = playerX, py = playerY;
  return `<h2>The Unbroken Wilds</h2><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button data-mass-zoom="in" aria-label="Zoom in" ${grain<=24?'disabled':''}>+</button><button data-mass-zoom="out" aria-label="Zoom out" ${grain>=192?'disabled':''}>−</button><span>${grain===24?'Close detail':grain===48?'Nearby country':'Regional survey'}</span></div><svg viewBox="0 0 640 400" style="width:100%;max-height:65vh;background:#0b1112;transform:translateZ(0)" aria-label="Survey of explored terrain">${parts.join('')}<circle cx="${px}" cy="${py}" r="4" fill="#f5dc98" stroke="#fff"/><text x="320" y="20" fill="#eadab7" text-anchor="middle">N</text></svg>${placeLegend}${questLegend}${legend}<p>Explored country · your position in gold</p>`;
}
