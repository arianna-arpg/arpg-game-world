import { ABILITY_ARTWORK_URLS } from './abilityArtworkCatalog';

export type AbilityIconKind = 'skill' | 'support';
export const ABILITY_ICON_VIEW = {
  // Approved Balanced Bloom / fuller Split Identity preview, in face fractions.
  skillRadius: .20, skillFeather: .14, bloomStrength: .85, bloomBlur: .028,
  supportRadius: .34, supportFeather: .16, supportItemSize: 26,
  rimAlpha: .42, rimWidth: .45, imageCacheLimit: 96, concurrentLoads: 8,
  supportRim: 'M3 6Q1 12 5 18Q9 22 12 20M21 18Q23 12 19 6Q15 2 12 4M2 3L4 5M20 19L22 21',
};
export function abilityArtworkUrl(kind: AbilityIconKind, id?: string): string | undefined {
  const key = kind + ':' + id;
  return Object.hasOwn(ABILITY_ARTWORK_URLS, key) ? ABILITY_ARTWORK_URLS[key] : undefined;
}

const images = new Map<string, HTMLImageElement>();
const failed = new Set<string>(); // At most the finite selected catalogue; never retry each frame.
const pending = new Set<string>();
/** Canvas only requests visible faces; a fixed decode pool and LRU bound memory.
 * DOM images use native lazy loading and the browser's shared HTTP cache. */
export function abilityArtworkImage(url?: string): HTMLImageElement | undefined {
  if (!url || typeof Image === 'undefined' || failed.has(url)) return;
  const ready = images.get(url);
  if (ready) { images.delete(url); images.set(url, ready); return ready; }
  if (pending.has(url) || pending.size >= ABILITY_ICON_VIEW.concurrentLoads) return;
  pending.add(url);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => { void image.decode().then(() => {
    pending.delete(url);
    if (!image.naturalWidth) { failed.add(url); return; }
    images.set(url, image);
    while (images.size > ABILITY_ICON_VIEW.imageCacheLimit) images.delete(images.keys().next().value!);
  }).catch(() => { pending.delete(url); failed.add(url); }); };
  image.onerror = () => { pending.delete(url); failed.add(url); };
  image.src = url;
  return;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function roundedDistance(x: number, y: number, radius: number): number {
  const qx = Math.abs(x) - (.5 - radius), qy = Math.abs(y) - (.5 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}
function squareCanvas(pixels: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = pixels; return canvas;
}
type FaceMasks = { face: HTMLCanvasElement; bloom: HTMLCanvasElement };
const masks = new Map<string, FaceMasks>();
/** Shared alpha fields keep CSS and cached canvas faces at the same proportions.
 * No image readback, per-frame filtering, or animation is needed. */
function faceMasks(kind: AbilityIconKind, pixels: number): FaceMasks {
  const c = ABILITY_ICON_VIEW, key = JSON.stringify([kind, pixels, c]);
  const cached = masks.get(key);
  if (cached) { masks.delete(key); masks.set(key, cached); return cached; }
  const face = squareCanvas(pixels), bloom = squareCanvas(pixels);
  const fc = face.getContext('2d')!, bc = bloom.getContext('2d')!;
  const crisp = fc.createImageData(pixels, pixels), glow = bc.createImageData(pixels, pixels);
  const radius = kind === 'support' ? c.supportRadius : c.skillRadius;
  const feather = kind === 'support' ? c.supportFeather : c.skillFeather;
  for (let y = 0; y < pixels; y++) for (let x = 0; x < pixels; x++) {
    const d = roundedDistance((x + .5) / pixels - .5, (y + .5) / pixels - .5, radius);
    const alpha = 1 - smooth(-feather, -.005, d), i = (y * pixels + x) * 4;
    crisp.data[i + 3] = Math.round(255 * alpha);
    glow.data[i + 3] = kind === 'skill'
      ? Math.round(255 * (1 - smooth(-.07, .005, d)) * (1 - alpha) * c.bloomStrength * .8) : 0;
  }
  fc.putImageData(crisp, 0, 0); bc.putImageData(glow, 0, 0);
  const result = { face, bloom }; masks.set(key, result);
  while (masks.size > 32) masks.delete(masks.keys().next().value!);
  return result;
}

/** Finish only a cached square face; callers draw readouts and inherited alpha later. */
export function finishAbilityIcon(ctx: CanvasRenderingContext2D, kind: AbilityIconKind, color: string): void {
  const c = ABILITY_ICON_VIEW, pixels = ctx.canvas.width, mask = faceMasks(kind, pixels);
  ctx.save(); ctx.resetTransform(); ctx.globalAlpha = 1;
  if (kind === 'skill') {
    const source = squareCanvas(pixels), raw = source.getContext('2d')!;
    raw.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, pixels, pixels);
    ctx.filter = `blur(${pixels * c.bloomBlur}px)`; ctx.drawImage(source, 0, 0); ctx.filter = 'none';
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask.bloom, 0, 0);
    raw.globalCompositeOperation = 'destination-in'; raw.drawImage(mask.face, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(source, 0, 0);
  } else {
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask.face, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.scale(pixels / 24, pixels / 24);
    ctx.strokeStyle = color; ctx.globalAlpha = c.rimAlpha; ctx.lineWidth = c.rimWidth;
    ctx.stroke(new Path2D(c.supportRim));
  }
  ctx.restore();
}

let installed = false;
function installAbilityIconStyle(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  const skill = faceMasks('skill', 192), support = faceMasks('support', 192);
  style.textContent = `
    .ability-icon{display:inline-block;position:relative;flex:none;vertical-align:middle;pointer-events:none;isolation:isolate}
    .ability-icon[data-ability-kind="skill"]{--ability-mask:url("${skill.face.toDataURL()}");--ability-bloom-mask:url("${skill.bloom.toDataURL()}")}
    .ability-icon[data-ability-kind="support"]{--ability-mask:url("${support.face.toDataURL()}")}
    .ability-icon-face,.ability-icon>img,.ability-icon-glow{position:absolute;inset:0;width:100%;height:100%;mask-image:var(--ability-mask);-webkit-mask-image:var(--ability-mask);mask-size:100% 100%;-webkit-mask-size:100% 100%}
    .ability-icon-face>svg,.ability-icon-glow>svg{width:100%;height:100%}
    .ability-icon-glow{background-size:100% 100%;filter:blur(var(--ability-blur));mask-image:var(--ability-bloom-mask);-webkit-mask-image:var(--ability-bloom-mask)}
    .ability-icon>img{display:block;object-fit:cover;opacity:0}
    .ability-icon[data-art-ready]>img{opacity:1}
    .ability-icon[data-art-ready]>.ability-icon-face,.ability-icon[data-art-ready]>.ability-icon-glow>svg{visibility:hidden}
    .ability-icon>.ability-icon-rim{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    .ability-icon-holder:has(>.ability-icon){background:transparent!important;border-color:transparent!important;opacity:1!important}
    .ability-item:has(.ability-icon){background:radial-gradient(ellipse,color-mix(in srgb,var(--ability-rarity) 13%,#1c1626) 22%,#1c162655 65%,transparent)!important;border-color:color-mix(in srgb,var(--ability-rarity) 38%,transparent)!important;border-radius:8px!important}
    @media(max-width:700px){.memory-emblem>.ability-icon{width:72px!important;height:72px!important}}
  `;
  document.head.appendChild(style);
  // One delegated pair, no retained tile references or per-refresh observers.
  document.addEventListener('load', event => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.matches('.ability-icon>img') && target.naturalWidth) {
      const glow = target.parentElement?.querySelector<HTMLElement>('.ability-icon-glow');
      if (glow) glow.style.backgroundImage = `url(${JSON.stringify(target.src)})`;
      target.parentElement?.setAttribute('data-art-ready', '');
    }
  }, true);
  document.addEventListener('error', event => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.matches('.ability-icon>img')) {
      failed.add(target.src);
      failed.add(target.getAttribute('src') ?? target.src);
      const glow = target.parentElement?.querySelector<HTMLElement>('.ability-icon-glow');
      if (glow) glow.style.backgroundImage = '';
      target.parentElement?.removeAttribute('data-art-ready'); target.remove();
    }
  }, true);
}
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function abilityIconMarkup(fallback: string, kind: AbilityIconKind, color: string, size: number, url?: string): string {
  installAbilityIconStyle();
  const c = ABILITY_ICON_VIEW;
  return `<span class="ability-icon" data-ability-kind="${kind}" aria-hidden="true" style="width:${size}px;height:${size}px;--ability-blur:${size * c.bloomBlur}px">`
    + (kind === 'skill' ? `<span class="ability-icon-glow">${fallback}</span>` : '')
    + `<span class="ability-icon-face">${fallback}</span>`
    + (url && !failed.has(url) ? `<img src="${esc(url)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" draggable="false">` : '')
    + (kind === 'support' ? `<svg class="ability-icon-rim" viewBox="0 0 24 24" fill="none" stroke="${esc(color)}" stroke-width="${c.rimWidth}" opacity="${c.rimAlpha}" aria-hidden="true"><path d="${c.supportRim}"/></svg>` : '') + '</span>';
}
