import { AstrolabeInk } from './astrolabeInk';
import { PASSIVE_TREE_VIEW_CFG } from '../data/passiveTreeLayoutConfig';
import { STAR_CENTER } from '../data/passives';
import { RING1_INNER_R, RING2_INNER_R, STAR_RING_STEP_DEG, STAR_RING_STEPS,
  type StarRingBand, type StarRingRotations } from '../data/passiveRingRotation';

const bands = ['middle', 'outer'] as const;
const names = { middle: 'Middle', outer: 'Outer' };
const motion = PASSIVE_TREE_VIEW_CFG.astrolabe;

export function astrolabeControls(): string {
  return `<span class="tree-astrolabe" role="group" aria-label="Star Astrolabe" data-astrolabe>${bands.map(band =>
    `<span class="tree-astrolabe-band"><span>${names[band]} <output data-ring-angle="${band}" aria-label="${names[band]} ring angle"></output></span>${([-1, 1] as const).map(delta =>
      `<button type="button" class="tree-ring-btn" data-ring-band="${band}" data-ring-delta="${delta}"
        aria-label="Turn the ${band} ring ${delta > 0 ? 'clockwise' : 'counterclockwise'}">${delta > 0 ? '&#8635;' : '&#8634;'}</button>`).join('')}</span>`).join('')}</span>`;
}

export function updateAstrolabeControls(panel: HTMLElement, rotation: StarRingRotations,
  refusal: (band: StarRingBand, delta: -1 | 1) => string | null): void {
  for (const output of panel.querySelectorAll<HTMLOutputElement>('[data-ring-angle]')) {
    const value = rotation[output.dataset.ringAngle as StarRingBand] * STAR_RING_STEP_DEG + '°';
    if (output.value !== value) output.value = value;
  }
  for (const button of panel.querySelectorAll<HTMLButtonElement>('.tree-ring-btn')) {
    const band = button.dataset.ringBand as StarRingBand, delta = Number(button.dataset.ringDelta) as -1 | 1;
    const why = refusal(band, delta);
    button.disabled = !!why;
    if (why) button.setAttribute('aria-description', why);
    else button.removeAttribute('aria-description');
    button.dataset.uiHint = why ?? `Turn the ${band} ring ${STAR_RING_STEP_DEG}° ${delta > 0 ? 'clockwise' : 'counterclockwise'}.`;
  }
}

const SECTOR_SIZE = 750;

class SectorBucket {
  private unbucketed = '';
  private sectors = new Map<number, string>();

  add(markup: string, x?: number, y?: number): void {
    if (x === undefined || y === undefined) {
      this.unbucketed += markup;
      return;
    }
    const sx = Math.floor(x / SECTOR_SIZE) + 1024;
    const sy = Math.floor(y / SECTOR_SIZE) + 1024;
    const key = sx * 4096 + sy;
    this.sectors.set(key, (this.sectors.get(key) ?? '') + markup);
  }

  get empty(): boolean {
    return !this.unbucketed && this.sectors.size === 0;
  }

  html(): string {
    if (this.sectors.size === 0) return this.unbucketed;
    let out = this.unbucketed;
    for (const chunk of this.sectors.values()) {
      out += `<g>${chunk}</g>`;
    }
    return out;
  }
}

/** Geometry stays in its authored frame. A seam's track belongs to the
 * inner of its two bands while the socket on the other side changes identity.
 * Spatial 750x750 `<g>` sectors let Blink cull ~90% of offscreen SVG paths. */
export class AstrolabeLayers {
  private fixed = new SectorBucket();
  private rings = [new SectorBucket(), new SectorBucket(), new SectorBucket()];
  private seams = [new SectorBucket(), new SectorBucket(), new SectorBucket()];
  constructor(private readonly layered: boolean) {}

  add(markup: string, ring = 0, seam = false, x?: number, y?: number): void {
    if (!this.layered) { this.fixed.add(markup, x, y); return; }
    if (seam) this.seams[ring].add(markup, x, y);
    else if (ring) this.rings[ring].add(markup, x, y);
    else this.fixed.add(markup, x, y);
  }

  html(): string {
    if (!this.layered) return this.fixed.html();
    const ink = (bucket: SectorBucket) => !bucket.empty ? `<g data-star-ink>${bucket.html()}</g>` : '';
    const seam = (i: number) => !this.seams[i].empty ? `<g data-star-seam="${bands[i]}">${ink(this.seams[i])}</g>` : '';
    return ink(this.fixed) + seam(0) + bands.map((band, i) => {
      const body = ink(this.rings[i + 1]) + seam(i + 1);
      return body ? `<g data-star-band="${band}">${body}</g>` : '';
    }).join('');
  }
}

export function astrolabeTracks(): string {
  return `<g class="passive-astrolabe-tracks" pointer-events="none" aria-hidden="true" fill="none" stroke="#c8a84b">
    ${bands.map((band, i) => {
      const r = i === 0 ? RING1_INNER_R : RING2_INNER_R;
      return `<g data-star-band="${band}" data-star-track="${band}"><circle cx="${STAR_CENTER.x}" cy="${STAR_CENTER.y}"
        r="${r}" stroke-width="2" stroke-dasharray="14 14"/>${Array.from({length: STAR_RING_STEPS}, (_, step) =>
          `<path transform="rotate(${step * STAR_RING_STEP_DEG} ${STAR_CENTER.x} ${STAR_CENTER.y})"
            d="M${STAR_CENTER.x + r - 12} ${STAR_CENTER.y - 7}l9 7 -9 7" stroke-width="3"/>`).join('')}</g>`;
    }).join('')}</g>`;
}

const pose = (angle: number) =>
  `translate(${STAR_CENTER.x}px,${STAR_CENTER.y}px) rotate(${angle}deg) translate(${-STAR_CENTER.x}px,${-STAR_CENTER.y}px)`;

type Turn = { from: number; to: number; animations: Animation[] };
type BandView = { layers: SVGGElement[]; angle: number; step: number; turn?: Turn };

/** Native group animations rotate thousands of nodes and their routes with
 * one clock per band. Only discrete, accepted steps ever enter game state. */
export class PassiveAstrolabe {
  private suspended = false;
  private viewportInteractive = false;
  readonly ink: AstrolabeInk;
  private views: Record<StarRingBand, BandView>;
  constructor(private readonly svg: SVGSVGElement, rotation: StarRingRotations) {
    this.ink = new AstrolabeInk(svg);
    const view = (band: StarRingBand): BandView => {
      const angle = rotation[band] * STAR_RING_STEP_DEG;
      const layers = [...svg.querySelectorAll<SVGGElement>(`[data-star-band="${band}"]`)];
      for (const layer of layers) layer.style.transform = pose(angle);
      return { layers, angle, step: rotation[band] };
    };
    this.views = { middle: view('middle'), outer: view('outer') };
  }

  setViewportInteractive(active: boolean): void {
    if (this.viewportInteractive === active) return;
    this.viewportInteractive = active;
    if (this.suspended) return;
    if (active) {
      if (this.ink.isReady()) this.ink.show(true);
    } else if (!this.moving) {
      this.ink.hide();
    }
  }

  sync(rotation: StarRingRotations): void {
    const animate = !this.suspended && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate && this.moving) this.settle();
    if (animate && (this.moving || bands.some(band => rotation[band] !== this.views[band].step))) this.ink.show();
    this.suspended = false;
    for (const band of bands) {
      const v = this.views[band], step = rotation[band];
      if (step === v.step) continue;
      const half = Math.floor(STAR_RING_STEPS / 2);
      const delta = ((step - v.step + STAR_RING_STEPS + half) % STAR_RING_STEPS) - half;
      const prev = v.turn;
      const clock = prev?.animations[0];
      const t = clock?.effect?.getComputedTiming().progress ?? (clock?.playState === 'finished' ? 1 : 0);
      const from = prev ? prev.from + (prev.to - prev.from) * t : v.angle;
      this.finish(band);
      v.step = step;
      v.angle += delta * STAR_RING_STEP_DEG;
      for (const layer of v.layers) layer.style.transform = pose(v.angle);
      if (!animate || !v.layers.length || Math.abs(from - v.angle) < .01) continue;
      this.svg.classList.add('turning-' + band);
      const animations = v.layers.map(layer => layer.animate(
        [{ transform: pose(from) }, { transform: pose(v.angle) }], { duration: motion.turnMs, easing: motion.easing }));
      const turn = v.turn = { from, to: v.angle, animations };
      animations[0].onfinish = () => {
        if (v.turn !== turn) return;
        this.finish(band);
        if (!this.moving && !this.viewportInteractive) this.ink.hide();
      };
    }
    if (!this.moving && !this.viewportInteractive) this.ink.hide();
  }

  private finish(band: StarRingBand): void {
    for (const anim of this.views[band].turn?.animations ?? []) anim.cancel();
    delete this.views[band].turn;
    this.svg.classList.remove('turning-' + band);
  }

  /** The real viewBox already contains the destination. This short reveal
   * yields immediately to the normal zoom/pan controls. */
  reveal(from: string, to: string): void {
    this.endReveal();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) return;
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    anim.setAttribute('data-star-reveal', '');
    anim.setAttribute('attributeName', 'viewBox');
    anim.setAttribute('from', from);
    anim.setAttribute('to', to);
    anim.setAttribute('dur', motion.revealMs + 'ms');
    anim.setAttribute('begin', 'indefinite');
    anim.setAttribute('calcMode', 'spline');
    anim.setAttribute('keyTimes', '0;1');
    anim.setAttribute('keySplines', '.22 .61 .36 1');
    anim.addEventListener('endEvent', () => anim.remove(), { once: true });
    this.svg.append(anim);
    anim.beginElement();
  }

  endReveal(): void { this.svg.querySelector('[data-star-reveal]')?.remove(); }
  settle(): void {
    this.endReveal();
    this.viewportInteractive = false;
    for (const band of bands) this.finish(band);
    this.ink.hide();
  }
  suspend(): void { this.settle(); this.ink.pauseWarmup(); this.suspended = true; }
  destroy(): void { this.settle(); this.ink.release(); this.suspended = true; }
  get visible(): boolean { return !this.suspended; }
  get moving(): boolean { return !!(this.views.middle.turn || this.views.outer.turn); }
}

/** Keep an existing close-up when some part of the selected annulus is in
 * frame. A turn from the central portrait otherwise happens entirely offscreen. */
export function ringInView(box: DOMRectReadOnly, band: StarRingBand): boolean {
  const dx = Math.abs(box.x + box.width / 2 - STAR_CENTER.x);
  const dy = Math.abs(box.y + box.height / 2 - STAR_CENTER.y);
  const far = Math.hypot(dx + box.width / 2, dy + box.height / 2);
  const near = Math.hypot(Math.max(0, dx - box.width / 2), Math.max(0, dy - box.height / 2));
  return band === 'middle' ? far >= RING1_INNER_R && near <= RING2_INNER_R : far >= RING2_INNER_R;
}
