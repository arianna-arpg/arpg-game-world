/** Project each band once per pointer scan. The circle, its artwork, and the
 * nearest-node click/tooltip then agree after rotation, pan, and zoom. */
type Candidate = { el: SVGCircleElement; x: number; y: number };
type Index = Map<SVGGraphicsElement, Candidate[]>;

const indices = new WeakMap<SVGSVGElement, { selector: string; index: Index | null }>();

function circleIndex(svg: SVGSVGElement, selector: string): Index | null {
  const cached = indices.get(svg);
  if (cached?.selector === selector) return cached.index;
  const index: Index = new Map();
  for (const el of svg.querySelectorAll(selector)) {
    if (!(el instanceof SVGCircleElement)) {
      indices.set(svg, { selector, index: null });
      return null;
    }
    const frame = el.closest<SVGGElement>('[data-star-band]') ?? svg;
    const candidates = index.get(frame) ?? [];
    candidates.push({ el, x: el.cx.baseVal.value, y: el.cy.baseVal.value });
    index.set(frame, candidates);
  }
  indices.set(svg, { selector, index });
  return index;
}

export function nearestTreeTarget(svg: SVGSVGElement, selector: string, point: {clientX: number; clientY: number},
  radius: number, held: Element | null = null, stick = 1): SVGElement | null {
  let best: SVGElement | null = null, distance = radius;
  function consider(el: SVGElement, x: number, y: number): void {
    const d = Math.hypot(point.clientX - x, point.clientY - y) * (el === held ? stick : 1);
    if (d < distance) { distance = d; best = el; }
  }
  const index = circleIndex(svg, selector);
  if (index) {
    for (const [frame, candidates] of index) {
      const m = frame.getScreenCTM();
      if (!m) continue;
      const pad = radius / Math.max(.01, stick);
      for (const { el, x, y } of candidates) {
        const sx = m.a*x + m.c*y + m.e, sy = m.b*x + m.d*y + m.f;
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
