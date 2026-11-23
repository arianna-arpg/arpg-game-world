/** Paint the mounted vector artwork into transparent band surfaces before a
 * turn. Chromium can rotate these without repainting thousands of paths per
 * frame. The original vector tree takes over as soon as the sockets settle. */
interface Sheet {
  surface: SVGForeignObjectElement;
  canvas: HTMLCanvasElement;
  x: number; y: number; w: number; h: number;
  scale: number;
  dirty: boolean;
}

export class AstrolabeInk {
  private sheets = new Map<SVGGElement, Sheet>();
  private groups?: SVGGElement[];
  private shown = false;
  private size?: { width: number; height: number };
  private observer?: ResizeObserver;
  private warmup?: number;
  private prepared = false;
  constructor(private readonly svg: SVGSVGElement) {}

  /** Detached vectors still own their node identity and search styling. */
  *detachedInk(): Iterable<SVGGElement> {
    if (this.shown) for (const [ink, sheet] of this.sheets) {
      if (sheet.surface.isConnected) yield ink;
    }
  }

  private screenScale(): number {
    if (!this.observer) {
      this.size = { width: this.svg.clientWidth, height: this.svg.clientHeight };
      this.observer = new ResizeObserver(([entry]) => { this.size = entry.contentRect; });
      this.observer.observe(this.svg);
    }
    const [, , w, h] = (this.svg.getAttribute('viewBox') ?? '').trim().split(/[ ,]+/).map(Number);
    return w && h && this.size ? Math.min(this.size.width / w, this.size.height / h) : .2;
  }

  invalidate(changed?: Element): void {
    if (!changed) { for (const sheet of this.sheets.values()) sheet.dirty = true; return; }
    const group = changed.closest<SVGGElement>('[data-star-ink]');
    const sheet = group && this.sheets.get(group);
    if (sheet) sheet.dirty = true;
  }

  private get inkGroups(): SVGGElement[] {
    return this.groups ??= [...this.svg.querySelectorAll<SVGGElement>('[data-star-ink]')];
  }

  private scale(): number {
    return Math.min(.4, Math.max(.18, this.screenScale() * devicePixelRatio));
  }

  private paintSheet(ink: SVGGElement, scale: number, paths: Map<string, Path2D>, searching: boolean): void {
    let sheet = this.sheets.get(ink);
    if (!sheet) {
      const box = ink.getBBox(), pad = 12;
      if (!box.width || !box.height) return;
      const x = box.x - pad, y = box.y - pad, w = box.width + 2*pad, h = box.height + 2*pad;
      const canvas = document.createElement('canvas');
      const surface = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      surface.setAttribute('aria-hidden', 'true');
      surface.setAttribute('pointer-events', 'none');
      canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
      surface.append(canvas);
      sheet = { surface, canvas, x, y, w, h, scale: 0, dirty: true };
      this.sheets.set(ink, sheet);
    }
    if (sheet.dirty || scale > sheet.scale + .08) {
      const {canvas, w, h, x, y} = sheet;
      canvas.width = Math.ceil(w*scale); canvas.height = Math.ceil(h*scale);
      // Size the embedded HTML surface in bitmap pixels. Its SVG transform
      // places those pixels in the authored band without a world-sized backing.
      sheet.surface.setAttribute('width', String(canvas.width));
      sheet.surface.setAttribute('height', String(canvas.height));
      sheet.surface.setAttribute('transform', `translate(${x} ${y}) scale(${w / canvas.width} ${h / canvas.height})`);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(canvas.width/w, 0, 0, canvas.height/h, -x*canvas.width/w, -y*canvas.height/h);
      for (const child of ink.children) paint(ctx, child as SVGGraphicsElement, paths, searching, 'black', 'none');
      sheet.dirty = false;
      sheet.scale = scale;
    }
  }

  /** At the Font, use idle time between input events to prepare one band
   * at a time. A quick first click can always finish the remaining work. */
  warm(): void {
    if (this.prepared || this.warmup !== undefined || this.shown ||
        typeof requestIdleCallback !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const paths = new Map<string, Path2D>();
    let next = 0;
    const drawNext = () => {
      this.warmup = undefined;
      if (!this.svg.isConnected || !this.svg.getClientRects().length) return;
      const group = this.inkGroups[next++];
      if (group) this.paintSheet(group, this.scale(), paths, this.svg.classList.contains('tree-searching'));
      if (next < this.inkGroups.length) this.warmup = requestIdleCallback(drawNext);
      else this.prepared = true;
    };
    this.warmup = requestIdleCallback(drawNext);
  }

  private stopWarmup(): void {
    if (this.warmup !== undefined) cancelIdleCallback(this.warmup);
    this.warmup = undefined;
  }

  show(): void {
    this.stopWarmup();
    const scale = this.scale(), paths = new Map<string, Path2D>();
    const searching = this.svg.classList.contains('tree-searching');
    for (const ink of this.inkGroups) this.paintSheet(ink, scale, paths, searching);
    this.prepared = true;
    // Read every bounding box before changing the mounted SVG. Interleaved
    // measurements and inserts force the whole tree through layout per band.
    if (!this.shown) for (const [ink, sheet] of this.sheets) {
      if (!sheet.scale) continue;
      ink.replaceWith(sheet.surface);
    }
    this.shown = true;
  }

  hide(): void {
    if (!this.shown) return;
    for (const [ink, sheet] of this.sheets) {
      if (sheet.surface.parentNode) sheet.surface.replaceWith(ink);
    }
    this.shown = false;
  }

  release(): void {
    this.stopWarmup();
    this.prepared = false;
    this.hide();
    this.sheets.clear();
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

/** The authored node/route painters use groups, paths, lines and circles with
 * local SVG transforms. Keep the hub painting and Vocation gate outside these
 * sheets so image resources and page-level masks stay with their renderer. */
function paint(ctx: CanvasRenderingContext2D, el: SVGGraphicsElement, paths: Map<string, Path2D>,
  searching: boolean, inheritedFill: string, inheritedStroke: string): void {
  if (el.classList.contains('passive-node-hit')) return; // transparent input surface
  ctx.save();
  if (el.hasAttribute('transform')) {
    const transforms = el.transform.baseVal;
    for (let i = 0; i < transforms.numberOfItems; i++) {
      const m = transforms.getItem(i).matrix;
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    }
  }
  ctx.globalAlpha *= Number(el.style.opacity || el.getAttribute('opacity') || 1);
  if (searching && el.classList.contains('passive-node-visual') && !el.querySelector('.search-hit')) ctx.globalAlpha *= .16;
  const fill = el.getAttribute('fill') ?? inheritedFill, stroke = el.getAttribute('stroke') ?? inheritedStroke;
  const width = el.getAttribute('stroke-width'), dash = el.getAttribute('stroke-dasharray');
  if (width) ctx.lineWidth = Number(width);
  if (dash) ctx.setLineDash(dash.split(/[ ,]+/).map(Number));
  if (el.hasAttribute('stroke-linecap')) ctx.lineCap = el.getAttribute('stroke-linecap') as CanvasLineCap;
  if (el.hasAttribute('stroke-linejoin')) ctx.lineJoin = el.getAttribute('stroke-linejoin') as CanvasLineJoin;

  if (el instanceof SVGGElement) {
    for (const child of el.children) paint(ctx, child as SVGGraphicsElement, paths, searching, fill, stroke);
  } else {
    let path: Path2D | undefined;
    if (el instanceof SVGPathElement) {
      const d = el.getAttribute('d') ?? '';
      path = paths.get(d);
      if (!path) { path = new Path2D(d); paths.set(d, path); }
    } else if (el instanceof SVGCircleElement) {
      path = new Path2D(); path.arc(el.cx.baseVal.value, el.cy.baseVal.value, el.r.baseVal.value, 0, 2*Math.PI);
    } else if (el instanceof SVGLineElement) {
      path = new Path2D(); path.moveTo(el.x1.baseVal.value, el.y1.baseVal.value); path.lineTo(el.x2.baseVal.value, el.y2.baseVal.value);
    }
    if (path && fill !== 'none') { ctx.fillStyle = fill; ctx.fill(path); }
    if (path && stroke !== 'none') { ctx.strokeStyle = stroke; ctx.stroke(path); }
  }
  ctx.restore();
}
