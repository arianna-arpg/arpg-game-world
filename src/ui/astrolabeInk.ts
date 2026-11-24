/** Paint the mounted vector artwork into transparent band surfaces before a
 * turn or viewport gesture. Chromium can rotate, pan, and zoom these without
 * repainting tens of thousands of SVG paths per frame. The original vector tree
 * takes over as soon as the gesture or sockets settle. */
interface Sheet {
  surface: SVGForeignObjectElement;
  canvas: HTMLCanvasElement;
  x: number; y: number; w: number; h: number;
  scale: number;
  dirty: boolean;
}

const sharedPaths = new Map<string, Path2D>();
const EMPTY_DASH: number[] = [];
const dashCache = new Map<string, number[]>();

function cachedPath(d: string): Path2D {
  let p = sharedPaths.get(d);
  if (!p) { p = new Path2D(d); sharedPaths.set(d, p); }
  return p;
}

function cachedCirclePath(cx: number, cy: number, r: number): Path2D {
  const key = `@c:${cx},${cy},${r}`;
  let p = sharedPaths.get(key);
  if (!p) { p = new Path2D(); p.arc(cx, cy, r, 0, 2 * Math.PI); sharedPaths.set(key, p); }
  return p;
}

function cachedLinePath(x1: number, y1: number, x2: number, y2: number): Path2D {
  const key = `@l:${x1},${y1},${x2},${y2}`;
  let p = sharedPaths.get(key);
  if (!p) { p = new Path2D(); p.moveTo(x1, y1); p.lineTo(x2, y2); sharedPaths.set(key, p); }
  return p;
}

function cachedDash(raw: string): number[] {
  let d = dashCache.get(raw);
  if (!d) { d = raw.trim().split(/[ ,]+/).map(Number); dashCache.set(raw, d); }
  return d;
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

  private ensureObserver(): void {
    if (this.observer || typeof ResizeObserver !== 'function') return;
    this.observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        this.size = { width: entry.contentRect.width, height: entry.contentRect.height };
      }
    });
    this.observer.observe(this.svg);
  }

  svgSize(): { width: number; height: number } | undefined {
    return this.size;
  }

  isReady(): boolean {
    if (!this.prepared || !this.groups || !this.groups.length) return false;
    if (this.sheets.size !== this.groups.length) return false;
    for (const sheet of this.sheets.values()) {
      if (sheet.dirty || !sheet.scale) return false;
    }
    return true;
  }

  private screenScale(): number {
    this.ensureObserver();
    if (!this.size || !this.size.width) {
      const cw = this.svg.clientWidth, ch = this.svg.clientHeight;
      if (cw > 0 && ch > 0) this.size = { width: cw, height: ch };
    }
    const [, , w, h] = (this.svg.getAttribute('viewBox') ?? '').trim().split(/[ ,]+/).map(Number);
    return w && h && this.size ? Math.min(this.size.width / w, this.size.height / h) : .2;
  }

  invalidate(changed?: Element): void {
    this.prepared = false;
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

  private paintSheet(ink: SVGGElement, scale: number, searching: boolean, reuseCleanScale = false): void {
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
    const needScaleUpgrade = !reuseCleanScale && scale > sheet.scale + .08;
    if (sheet.dirty || !sheet.scale || needScaleUpgrade) {
      const {canvas, w, h, x, y} = sheet;
      const cw = Math.ceil(w * scale), ch = Math.ceil(h * scale);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw; canvas.height = ch;
        // Size the embedded HTML surface in bitmap pixels. Its SVG transform
        // places those pixels in the authored band without a world-sized backing.
        sheet.surface.setAttribute('width', String(cw));
        sheet.surface.setAttribute('height', String(ch));
        sheet.surface.setAttribute('transform', `translate(${x} ${y}) scale(${w / cw} ${h / ch})`);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.setTransform(cw/w, 0, 0, ch/h, -x*cw/w, -y*ch/h);
      for (const child of ink.children) paint(ctx, child as SVGGraphicsElement, searching, 'black', 'none', 1);
      sheet.dirty = false;
      sheet.scale = scale;
    }
  }

  /** Use idle time between input events to prepare one band at a time so both
   * astrolabe turns and pan/zoom gestures swap in <2ms on the first frame. */
  warm(): void {
    if (this.warmup !== undefined || this.shown || typeof requestIdleCallback !== 'function') return;
    this.ensureObserver();
    if (this.prepared && this.groups && this.sheets.size === this.groups.length &&
        this.size && [...this.sheets.values()].every(s => !s.dirty && this.scale() <= s.scale + .08)) {
      return;
    }
    let next = 0;
    const drawNext = () => {
      this.warmup = undefined;
      if (this.shown || !this.svg.isConnected || (this.size ? !this.size.width : !this.svg.getClientRects().length)) return;
      const groups = this.inkGroups;
      if (!groups.length) return;
      if (next === 0 && this.prepared && this.sheets.size === groups.length &&
          [...this.sheets.values()].every(s => !s.dirty && this.scale() <= s.scale + .08)) {
        return;
      }
      const group = groups[next++];
      if (group) this.paintSheet(group, this.scale(), this.svg.classList.contains('tree-searching'));
      if (next < groups.length) this.warmup = requestIdleCallback(drawNext);
      else this.prepared = true;
    };
    this.warmup = requestIdleCallback(drawNext);
  }

  pauseWarmup(): void {
    this.stopWarmup();
  }

  private stopWarmup(): void {
    if (this.warmup !== undefined) cancelIdleCallback(this.warmup);
    this.warmup = undefined;
  }

  show(reuseCleanScale = false): void {
    this.stopWarmup();
    const scale = this.scale();
    const searching = this.svg.classList.contains('tree-searching');
    for (const ink of this.inkGroups) this.paintSheet(ink, scale, searching, reuseCleanScale);
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
    for (const sheet of this.sheets.values()) {
      sheet.canvas.width = 0;
      sheet.canvas.height = 0;
    }
    this.sheets.clear();
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

interface ParsedTransform {
  a: number; b: number; c: number; d: number; e: number; f: number;
}
const transformCache = new Map<string, ParsedTransform | null>();

/** Fast pure-JS parser for the passive tree's `translate(...) scale(...) [translate(...)]`
 *  transforms, avoiding tens of thousands of Blink SVGTransform Tear-Off allocations. */
function parseFastTransform(raw: string): ParsedTransform | null {
  const hit = transformCache.get(raw);
  if (hit !== undefined) return hit;
  let res: ParsedTransform | null = null;
  // Pattern 1: translate(tx ty) scale(s)
  // Pattern 2: translate(tx ty) scale(s) translate(tx2 ty2)
  const m = /^translate\(([-0-9.]+)[ ,]+([-0-9.]+)\)\s*scale\(([-0-9.]+)(?:[ ,]+([-0-9.]+))?\)(?:\s*translate\(([-0-9.]+)[ ,]+([-0-9.]+)\))?$/.exec(raw.trim());
  if (m) {
    const tx1 = +m[1], ty1 = +m[2];
    const sx = +m[3], sy = m[4] !== undefined ? +m[4] : sx;
    const tx2 = m[5] !== undefined ? +m[5] : 0;
    const ty2 = m[6] !== undefined ? +m[6] : 0;
    res = { a: sx, b: 0, c: 0, d: sy, e: tx1 + sx * tx2, f: ty1 + sy * ty2 };
  }
  if (transformCache.size >= 8192) transformCache.clear();
  transformCache.set(raw, res);
  return res;
}

function applyElementTransform(ctx: CanvasRenderingContext2D, el: SVGGraphicsElement, rawXf: string): void {
  const fast = parseFastTransform(rawXf);
  if (fast) {
    ctx.transform(fast.a, fast.b, fast.c, fast.d, fast.e, fast.f);
    return;
  }
  const transforms = el.transform.baseVal;
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const m = transforms.getItem(i).matrix;
    ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  }
}

/** The authored node/route painters use groups, paths, lines and circles with
 * local SVG transforms. Keep the hub painting and Vocation gate outside these
 * sheets so image resources and page-level masks stay with their renderer. */
function paint(ctx: CanvasRenderingContext2D, el: SVGGraphicsElement,
  searching: boolean, inheritedFill: string, inheritedStroke: string, alpha: number): void {
  const cls = el.getAttribute('class');
  if (cls && cls.includes('passive-node-hit')) return; // transparent input surface
  let localAlpha = alpha;
  const opAttr = el.style.opacity || el.getAttribute('opacity');
  if (opAttr) localAlpha *= +opAttr;
  if (searching && cls && cls.includes('passive-node-visual') && !el.querySelector('.search-hit')) localAlpha *= .16;
  if (localAlpha <= 0) return;

  const fill = el.getAttribute('fill') ?? inheritedFill;
  const stroke = el.getAttribute('stroke') ?? inheritedStroke;
  const tag = el.tagName;

  if (tag === 'g' || tag === 'G') {
    const rawXf = el.getAttribute('transform');
    const cap = el.getAttribute('stroke-linecap') as CanvasLineCap | null;
    const join = el.getAttribute('stroke-linejoin') as CanvasLineJoin | null;
    const width = el.getAttribute('stroke-width');
    const dash = el.getAttribute('stroke-dasharray');
    const needSave = rawXf !== null || cap !== null || join !== null || width !== null || dash !== null;
    if (needSave) {
      ctx.save();
      if (rawXf !== null) applyElementTransform(ctx, el, rawXf);
      if (width !== null) ctx.lineWidth = +width;
      if (dash !== null) ctx.setLineDash(cachedDash(dash));
      if (cap !== null) ctx.lineCap = cap;
      if (join !== null) ctx.lineJoin = join;
    }
    const children = el.children;
    for (let i = 0; i < children.length; i++) {
      paint(ctx, children[i] as SVGGraphicsElement, searching, fill, stroke, localAlpha);
    }
    if (needSave) ctx.restore();
    return;
  }

  let path: Path2D | undefined;
  if (tag === 'path' || tag === 'PATH') {
    const d = el.getAttribute('d');
    if (d) path = cachedPath(d);
  } else if (tag === 'circle' || tag === 'CIRCLE') {
    path = cachedCirclePath(+(el.getAttribute('cx') ?? 0), +(el.getAttribute('cy') ?? 0), +(el.getAttribute('r') ?? 0));
  } else if (tag === 'line' || tag === 'LINE') {
    path = cachedLinePath(+(el.getAttribute('x1') ?? 0), +(el.getAttribute('y1') ?? 0), +(el.getAttribute('x2') ?? 0), +(el.getAttribute('y2') ?? 0));
  }
  if (!path) return;

  const rawXf = el.getAttribute('transform');
  if (rawXf !== null) {
    ctx.save();
    applyElementTransform(ctx, el, rawXf);
  }
  const prevAlpha = ctx.globalAlpha;
  if (prevAlpha !== localAlpha) ctx.globalAlpha = localAlpha;

  if (fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke !== 'none') {
    const width = el.getAttribute('stroke-width');
    const dash = el.getAttribute('stroke-dasharray');
    const cap = el.getAttribute('stroke-linecap') as CanvasLineCap | null;
    const join = el.getAttribute('stroke-linejoin') as CanvasLineJoin | null;
    const prevWidth = ctx.lineWidth;
    const prevCap = ctx.lineCap;
    const prevJoin = ctx.lineJoin;
    if (width !== null) ctx.lineWidth = +width;
    if (dash !== null) ctx.setLineDash(cachedDash(dash));
    if (cap !== null) ctx.lineCap = cap;
    if (join !== null) ctx.lineJoin = join;
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
    if (dash !== null) ctx.setLineDash(EMPTY_DASH);
    if (width !== null) ctx.lineWidth = prevWidth;
    if (cap !== null) ctx.lineCap = prevCap;
    if (join !== null) ctx.lineJoin = prevJoin;
  }

  if (prevAlpha !== localAlpha) ctx.globalAlpha = prevAlpha;
  if (rawXf !== null) ctx.restore();
}
