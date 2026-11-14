import { ABILITY_ARTWORK_URLS } from './abilityArtworkCatalog';
import { ABILITY_ARTWORK_CACHE, abilityArtworkFailed, loadAbilityArtwork, peekAbilityArtwork } from './abilityArtworkCache';
export { abilityArtworkImage } from './abilityArtworkCache';

export type AbilityIconKind = 'skill' | 'support';
export const ABILITY_ICON_VIEW = {
  // Approved Balanced Bloom / fuller Split Identity preview, in face fractions.
  skillRadius: .20, skillFeather: .14, bloomStrength: .85, bloomBlur: .028,
  supportRadius: .34, supportFeather: .16, supportItemSize: 26,
  rimAlpha: .42, rimWidth: .45,
  supportRim: 'M3 6Q1 12 5 18Q9 22 12 20M21 18Q23 12 19 6Q15 2 12 4M2 3L4 5M20 19L22 21',
};
export function abilityArtworkUrl(kind: AbilityIconKind, id?: string): string | undefined {
  const key = kind + ':' + id;
  return Object.hasOwn(ABILITY_ARTWORK_URLS, key) ? ABILITY_ARTWORK_URLS[key] : undefined;
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
    .ability-icon-face,.ability-icon>canvas,.ability-icon-glow{position:absolute;inset:0;width:100%;height:100%;mask-image:var(--ability-mask);-webkit-mask-image:var(--ability-mask);mask-size:100% 100%;-webkit-mask-size:100% 100%}
    .ability-icon-face>svg,.ability-icon-glow>svg,.ability-icon-glow>canvas{position:absolute;inset:0;width:100%;height:100%}
    .ability-icon-glow{filter:blur(var(--ability-blur));mask-image:var(--ability-bloom-mask);-webkit-mask-image:var(--ability-bloom-mask)}
    .ability-icon>canvas,.ability-icon-glow>canvas{display:block;opacity:0}
    .ability-icon[data-art-ready]>canvas,.ability-icon[data-art-ready]>.ability-icon-glow>canvas{opacity:1}
    .ability-icon[data-art-ready]>.ability-icon-face,.ability-icon[data-art-ready]>.ability-icon-glow>svg{visibility:hidden}
    .ability-icon>.ability-icon-rim{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    .ability-icon-holder:has(>.ability-icon){background:transparent!important;border-color:transparent!important;opacity:1!important}
    .ability-item:has(.ability-icon){background:radial-gradient(ellipse,color-mix(in srgb,var(--ability-rarity) 13%,#1c1626) 22%,#1c162655 65%,transparent)!important;border-color:color-mix(in srgb,var(--ability-rarity) 38%,transparent)!important;border-radius:8px!important}
    @media(max-width:700px){.memory-emblem>.ability-icon{width:72px!important;height:72px!important}}
  `;
  document.head.appendChild(style);
  // One lazy observer for every panel. Mutation delivery runs before paint, so
  // warm artwork can be copied synchronously even in older innerHTML callers.
  visibility = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      visibility!.unobserve(entry.target); prepareIcon(entry.target as HTMLElement);
    }
  }, { rootMargin: '64px' });
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) if (node instanceof Element && !node.isConnected)
        for (const icon of iconNodes(node)) visibility!.unobserve(icon);
      for (const node of record.addedNodes) if (node instanceof Element && node.isConnected) hydrateAbilityIcons(node);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
let visibility: IntersectionObserver | undefined;
const preparing = new WeakSet<HTMLElement>();
function iconNodes(root: Element): HTMLElement[] {
  const selector = '.ability-icon[data-art-url]';
  return [...(root.matches(selector) ? [root as HTMLElement] : []), ...root.querySelectorAll<HTMLElement>(selector)];
}
function paintIcon(icon: HTMLElement, image: HTMLCanvasElement): void {
  for (const canvas of icon.querySelectorAll<HTMLCanvasElement>('canvas'))
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  icon.setAttribute('data-art-ready', '');
}
function prepareIcon(icon: HTMLElement): void {
  const url = icon.dataset.artUrl!;
  if (icon.hasAttribute('data-art-ready') || preparing.has(icon) || abilityArtworkFailed(url)) return;
  const image = peekAbilityArtwork(url);
  if (image) { paintIcon(icon, image); return; }
  preparing.add(icon);
  // A slow request must not keep a closed/replaced inventory subtree alive.
  const ref = new WeakRef(icon);
  void loadAbilityArtwork(url).then(image => {
    const target = ref.deref();
    if (!target) return;
    preparing.delete(target);
    if (image && target.isConnected) paintIcon(target, image);
  });
}
export function hydrateAbilityIcons(root: Element, eager = false): void {
  for (const icon of iconNodes(root)) {
    if (icon.hasAttribute('data-art-ready') || preparing.has(icon)) continue;
    if (eager || peekAbilityArtwork(icon.dataset.artUrl)) prepareIcon(icon);
    else if (!abilityArtworkFailed(icon.dataset.artUrl!)) visibility?.observe(icon);
  }
}
/** Reconcile only inert icon surfaces. Panel controls still follow their
 * existing rewire/ownership rules; loaded pixels survive sorting and edits. */
export function replaceAbilityPanelHtml(root: Element, html: string): void {
  const retained = new Map<string, HTMLElement[]>();
  for (const icon of root.querySelectorAll<HTMLElement>('.ability-icon[data-ability-key]')) {
    const key = icon.dataset.abilityKey!;
    const bucket = retained.get(key) ?? []; bucket.push(icon); retained.set(key, bucket);
  }
  const template = document.createElement('template'); template.innerHTML = html;
  // Move the old subtree off-document as one batch before transferring faces;
  // avoid repeatedly invalidating the live grid while each canvas is moved.
  const previous = document.createDocumentFragment();
  previous.append(...root.childNodes);
  for (const icon of template.content.querySelectorAll<HTMLElement>('.ability-icon[data-ability-key]')) {
    const existing = retained.get(icon.dataset.abilityKey!)?.pop();
    if (existing) icon.replaceWith(existing);
  }
  root.replaceChildren(template.content);
  hydrateAbilityIcons(root, true);
}
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function abilityIconMarkup(fallback: string, kind: AbilityIconKind, color: string, size: number, url?: string): string {
  installAbilityIconStyle();
  const c = ABILITY_ICON_VIEW;
  const paint = url && !abilityArtworkFailed(url);
  const pixels = Math.min(ABILITY_ARTWORK_CACHE.pixels, Math.ceil(size * (globalThis.devicePixelRatio || 1)));
  const canvas = paint ? `<canvas width="${pixels}" height="${pixels}"></canvas>` : '';
  return `<span class="ability-icon" data-ability-kind="${kind}"${url ? ` data-ability-key="${esc(JSON.stringify([url, kind, color, size]))}"` : ''}${paint ? ` data-art-url="${esc(url)}"` : ''} aria-hidden="true" style="width:${size}px;height:${size}px;--ability-blur:${size * c.bloomBlur}px">`
    + (kind === 'skill' ? `<span class="ability-icon-glow">${fallback}${canvas}</span>` : '')
    + `<span class="ability-icon-face">${fallback}</span>`
    + canvas
    + (kind === 'support' ? `<svg class="ability-icon-rim" viewBox="0 0 24 24" fill="none" stroke="${esc(color)}" stroke-width="${c.rimWidth}" opacity="${c.rimAlpha}" aria-hidden="true"><path d="${c.supportRim}"/></svg>` : '') + '</span>';
}
