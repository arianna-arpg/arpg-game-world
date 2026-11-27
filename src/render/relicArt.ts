/** Original Hollow Wake vector art. Presentation only; family tags select a
 * face, while native item dimensions, rarity, ownership and hit areas stay put.
 * No raster assets, SVG ids, filters, frame-loop work or external resources. */
import { RUNESCRIPT, runeOf } from '../data/runescript';
import { DEFAULT_RUNE_ACTIVITY, runeFieldHtml } from './runeField';

export const RELIC_ART = {
  author: 'Hollow Wake',
  /** Geometry only. All materials inherit the live Wardrobe interface tokens. */
  layout: {
    '--relic-guard': '28px',
  } as Readonly<Record<string, string>>,
  /** Open registry: a new family supplies its tag, canvas and silhouette. */
  faces: [
    { tag: 'charm', viewBox: '0 0 40 40', body: `
      <path class="relic-art-body" d="M15 11V7l5-3 5 3v4l8 9-4 12-9 5-9-5-4-12z"/>
      <path class="relic-art-edge" d="M16 11h8M20 15l9 7-9 11-9-11zM17 7l3-1 3 1M10 24l3 6m14 0 3-6"/>
      <path class="relic-art-mark" d="m20 19 3 5-3 5-3-5z"/>` },
    { tag: 'talisman', viewBox: '0 0 76 36', body: `
      <path class="relic-art-body" d="m6 8 11-3 42 2 11 5-3 16-11 3-43-2-8-6z"/>
      <path class="relic-art-edge" d="m18 8-3 18m45-16-3 18M22 11l30 1-1 12-29-1zM7 13l8 2m-8 4 8 2m47-5 6 1m-7 4 6 1"/>
      <path class="relic-art-mark" d="m37 11 5 7-5 6-5-6z"/>
      <path class="relic-art-edge" d="m25 15 3 3-3 3m23-6-3 3 3 3"/>` },
    { tag: 'idol', viewBox: '0 0 36 76', body: `
      <path class="relic-art-body" d="m11 5 14 2 2 15-5 8 7 14-3 14 5 11-25 1 4-13-3-14 7-13-5-8z"/>
      <path class="relic-art-edge" d="m13 11 10 1-1 10-4 4-5-5zM12 44l6 5 7-5M13 55l11-1M11 64l14-1M18 33v9"/>
      <path class="relic-art-mark" d="m18 13 2 6-2 5-2-5z"/>` },
    { tag: 'effigy', viewBox: '0 0 64 64', body: `
      <path class="relic-art-body" d="m14 8 9 5 9-6 9 6 9-5-2 19-7 9 6 17 8 4H9l8-4 6-17-7-9z"/>
      <path class="relic-art-edge" d="m23 17 9-5 9 5-3 16-6 6-6-6zM17 14l3 12m27-12-3 12M25 44l7 5 7-5M21 53h22M28 23l4 3 4-3"/>
      <path class="relic-art-mark" d="m32 29 3 5-3 6-3-6z"/>` },
  ],
  seal: { teeth: 32, radius: 116, innerRadius: 112 },
  /** A separate, decorative field above/below the case. These ghosts do not
   * indicate equipped power: the case alone owns its awake/dormant state. */
  paneField: {
    enabled: true,
    activity: DEFAULT_RUNE_ACTIVITY,
    seconds: [15, 26], size: [15, 25], alpha: [.09, .19],
    travelX: [-16, 18], travelY: [-28, 10],
    regions: { upper: { maxCount: 64 }, lower: { maxCount: 48 } },
  } as const,
  /** Mu's depth well and the website's quiet ether drift, composed as a small
   * CSS scene. Fixed glyph samples never consume gameplay randomness. Colors
   * inherit Wardrobe; count, pace, phase and strength are authored here. */
  ambience: {
    enabled: true,
    breathSeconds: 11,
    breathLow: .58,
    breathHigh: .9,
    bands: [
      { radius: 104, count: 24, size: 11, seconds: 110, phase: -18, reverse: false, alpha: .8, offset: 0, stride: 5 },
      { radius: 92, count: 20, size: 8, seconds: 160, phase: -57, reverse: true, alpha: .4, offset: 9, stride: 3 },
    ],
    columns: [
      { side: 'left', letters: ['th', 'a', 'l', 'z'], seconds: 19, phase: -5, rise: -7, alpha: .32 },
      { side: 'right', letters: ['ng', 'o', 'w', 'r'], seconds: 23, phase: -14, rise: 7, alpha: .26 },
    ],
  },
};

const faceCache = new Map<string, string>();
let sealMarkup: string | undefined;
let backdropMarkup: string | undefined;
const fieldMarkup = new Map<string, string>();

export function reliquaryPaneFieldHtml(region: keyof typeof RELIC_ART.paneField.regions): string {
  if (!RELIC_ART.paneField.enabled) return '';
  let markup = fieldMarkup.get(region);
  if (!markup) {
    markup = runeFieldHtml({ ...RELIC_ART.paneField, ...RELIC_ART.paneField.regions[region] });
    fieldMarkup.set(region, markup);
  }
  return markup;
}

/** A family-less future Relic still gets a neutral ward, never a missing icon. */
export function relicFaceSvg(tags: readonly string[]): string {
  const face = RELIC_ART.faces.find(f => tags.includes(f.tag));
  const key = face?.tag ?? 'ward', cached = faceCache.get(key);
  if (cached) return cached;
  const markup = `<svg class="relic-item-art" data-relic-art="${key}" viewBox="${face?.viewBox ?? '0 0 40 40'}" aria-hidden="true" focusable="false">
    ${face?.body ?? '<path class="relic-art-body" d="m20 4 14 16-14 16L6 20z"/><circle class="relic-art-mark" cx="20" cy="20" r="4"/>'}
  </svg>`;
  faceCache.set(key, markup);
  return markup;
}

/** Etched ring and four bindings sit behind the native, rectangular board.
 * All ornament is pointer-transparent and hidden from assistive technology. */
export function reliquarySealSvg(): string {
  if (sealMarkup) return sealMarkup;
  const { teeth, radius, innerRadius } = RELIC_ART.seal;
  const marks = Array.from({ length: teeth }, (_, n) => {
    const a = n * Math.PI * 2 / teeth;
    const p = (r: number) => `${(120 + Math.sin(a) * r).toFixed(2)} ${(120 - Math.cos(a) * r).toFixed(2)}`;
    return `<path d="M${p(radius)}L${p(n % 4 === 0 ? innerRadius - 4 : innerRadius)}"/>`;
  }).join('');
  return sealMarkup = `<svg class="relic-case-etching" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <g class="relic-etch-lines" fill="none" stroke="currentColor" stroke-width=".8">
      <circle cx="120" cy="120" r="118"/><circle cx="120" cy="120" r="98"/>${marks}
      <path d="M24 71V24h47M169 24h47v47M216 169v47h-47M71 216H24v-47"/>
      <path d="M36 63V36h27M177 36h27v27M204 177v27h-27M63 204H36v-27"/>
      <path d="m15 120 9-13 9 13-9 13zm192 0 9-13 9 13-9 13zM120 15l13 9-13 9-13-9zm0 192 13 9-13 9-13-9z"/>
    </g>
    <g class="relic-case-wards"><path d="m120 14 3 10-3 7-3-7zM14 120l10-3 7 3-7 3zm195 0 7-3 10 3-10 3zm-89 89 3 7-3 10-3-10z"/></g>
  </svg>${reliquaryRuneBands()}`;
}

/** Entire SVG bands turn, rather than animating each glyph. The opaque native
 * board occludes their centers, embedding the seals beneath the item tray. */
function reliquaryRuneBands(): string {
  const cfg = RELIC_ART.ambience;
  if (!cfg.enabled) return '';
  return `<div class="relic-arcana relic-ambient-motion" aria-hidden="true" style="--relic-breath:${cfg.breathSeconds}s;--relic-breath-low:${cfg.breathLow};--relic-breath-high:${cfg.breathHigh}">
    ${cfg.bands.map(band => `<svg class="relic-rune-band relic-ambient-motion" viewBox="0 0 240 240" focusable="false"
      style="--relic-period:${band.seconds}s;--relic-phase:${band.phase}s;--relic-direction:${band.reverse ? 'reverse' : 'normal'};opacity:${band.alpha}">
      <g class="relic-orbit-track" fill="none" stroke="currentColor" stroke-width=".6"><circle cx="120" cy="120" r="${band.radius}"/></g>
      <g class="relic-rune-glyphs runescript" font-size="${band.size}" text-anchor="middle">${Array.from({ length: band.count }, (_, i) =>
        `<text transform="translate(120 120) rotate(${i * 360 / band.count}) translate(0 -${band.radius})" y="${band.size * .34}">${RUNESCRIPT[(band.offset + i * band.stride) % RUNESCRIPT.length].rune}</text>`).join('')}</g>
    </svg>`).join('')}
  </div>`;
}

/** A recessed light well and two distant inscriptions. The existing cabinet
 * clips this passive scene; it owns no layout, hit targets or player state. */
export function reliquaryBackdropHtml(): string {
  if (!RELIC_ART.ambience.enabled) return '';
  if (backdropMarkup) return backdropMarkup;
  return backdropMarkup = `<div class="relic-casket-ambience" aria-hidden="true"><div class="relic-depth-well"></div>
    ${RELIC_ART.ambience.columns.map(column => `<div class="relic-rune-column relic-ambient-motion runescript" data-relic-side="${column.side}"
      style="--relic-period:${column.seconds}s;--relic-phase:${column.phase}s;--relic-rise:${column.rise}px;--relic-ink:${column.alpha}">
      ${column.letters.map(letter => `<span>${runeOf(letter) ?? ''}</span>`).join('')}
    </div>`).join('')}
  </div>`;
}
