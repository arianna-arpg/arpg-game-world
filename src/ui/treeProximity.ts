/** Project each band once per pointer scan, bucketed into a 160-unit 2D spatial
 * hash in frame-local coordinates. Inverting the band's screen CTM visits only
 * the 4–8 nearby circles instead of scanning all 3,160 passive nodes. */
type Candidate = { el: SVGCircleElement; x: number; y: number };
type FrameBucket = { grid: Map<number, Candidate[]>; all: Candidate[] };
type Index = Map<SVGGraphicsElement, FrameBucket>;

const CELL_SIZE = 160;
const CELL_OFFSET = 0x8000;
const CELL_STRIDE = 0x10000;

function packCell(gx: number, gy: number): number {
  return (gx + CELL_OFFSET) * CELL_STRIDE + (gy + CELL_OFFSET);
}

const indices = new WeakMap<SVGSVGElement, { selector: string; index: Index | null }>();

function circleIndex(svg: SVGSVGElement, selector: string): Index | null {
  const cached = indices.get(svg);
  if (cached?.selector === selector) return cached.index;
  const temporarySheets = !!svg.querySelector('foreignObject[data-star-sheet]');
  const index: Index = new Map();
  for (const el of svg.querySelectorAll(selector)) {
    if (!(el instanceof SVGCircleElement)) {
      if (!temporarySheets) indices.set(svg, { selector, index: null });
      return null;
    }
    const frame = el.closest<SVGGElement>('[data-star-band]') ?? svg;
    let bucket = index.get(frame);
    if (!bucket) {
      bucket = { grid: new Map(), all: [] };
      index.set(frame, bucket);
    }
    const x = el.cx.baseVal.value, y = el.cy.baseVal.value;
    const cand: Candidate = { el, x, y };
    bucket.all.push(cand);
    const gx = Math.floor(x / CELL_SIZE), gy = Math.floor(y / CELL_SIZE);
    if (gx >= -CELL_OFFSET && gx < CELL_OFFSET && gy >= -CELL_OFFSET && gy < CELL_OFFSET) {
      const key = packCell(gx, gy);
      const cell = bucket.grid.get(key);
      if (cell) cell.push(cand);
      else bucket.grid.set(key, [cand]);
    }
  }
  if (!temporarySheets) indices.set(svg, { selector, index });
  return index;
}

export function nearestTreeTarget(svg: SVGSVGElement, selector: string, point: { clientX: number; clientY: number },
  radius: number, held: Element | null = null, stick = 1): SVGElement | null {
  let best: SVGElement | null = null, distance = radius;
  function consider(el: SVGElement, x: number, y: number): void {
    const d = Math.hypot(point.clientX - x, point.clientY - y) * (el === held ? stick : 1);
    if (d < distance) { distance = d; best = el; }
  }
  const index = circleIndex(svg, selector);
  if (index) {
    const pad = radius / Math.max(.01, stick);
    const svgConnected = svg.isConnected;
    for (const [frame, bucket] of index) {
      const m = frame.getScreenCTM();
      if (!m) continue;
      const det = m.a * m.d - m.b * m.c;
      if (Math.abs(det) > 1e-8) {
        const invDet = 1 / det;
        const dx = point.clientX - m.e, dy = point.clientY - m.f;
        const lx = (m.d * dx - m.c * dy) * invDet;
        const ly = (m.a * dy - m.b * dx) * invDet;
        const absInv = Math.abs(invDet);
        const localPad = pad / Math.hypot(m.a, m.b);
        const padX = Math.max(localPad, (Math.abs(m.d) + Math.abs(m.c)) * absInv * pad) + 1e-4;
        const padY = Math.max(localPad, (Math.abs(m.a) + Math.abs(m.b)) * absInv * pad) + 1e-4;
        const gx0 = Math.floor((lx - padX) / CELL_SIZE), gx1 = Math.floor((lx + padX) / CELL_SIZE);
        const gy0 = Math.floor((ly - padY) / CELL_SIZE), gy1 = Math.floor((ly + padY) / CELL_SIZE);
        if (gx0 >= -CELL_OFFSET && gx1 < CELL_OFFSET && gy0 >= -CELL_OFFSET && gy1 < CELL_OFFSET &&
            (gx1 - gx0 + 1) * (gy1 - gy0 + 1) <= bucket.all.length) {
          const { grid } = bucket;
          for (let gx = gx0; gx <= gx1; gx++) {
            for (let gy = gy0; gy <= gy1; gy++) {
              const cell = grid.get(packCell(gx, gy));
              if (!cell) continue;
              for (let i = 0; i < cell.length; i++) {
                const { el, x, y } = cell[i];
                if (svgConnected && !el.isConnected) continue;
                const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
                if (Math.abs(point.clientX - sx) <= pad && Math.abs(point.clientY - sy) <= pad) consider(el, sx, sy);
              }
            }
          }
          continue;
        }
      }
      // Fallback for singular CTM or very small node sets zoomed far out
      for (const { el, x, y } of bucket.all) {
        if (svgConnected && !el.isConnected) continue;
        const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
        if (Math.abs(point.clientX - sx) <= pad && Math.abs(point.clientY - sy) <= pad) consider(el, sx, sy);
      }
    }
  } else {
    for (const el of svg.querySelectorAll<SVGElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) consider(el, r.x + r.width / 2, r.y + r.height / 2);
    }
  }
  return best;
}
