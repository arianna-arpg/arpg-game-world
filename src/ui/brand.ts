import { GAME_TITLE } from '../config';

/** One original, outlined wordmark and established insignia on every surface.
 * Sizes are presentation tokens; the artwork and accessible name are shared. */
export const BRAND_PRESENTATION = {
  logo: new URL('../../branding/hollow-wake.svg', import.meta.url).href,
  insignia: new URL('../../branding/insignia.svg', import.meta.url).href,
  widths: { hero: 420, compact: 104, panel: 200, story: 320, menu: 160 },
} as const;
export type BrandSize = keyof typeof BRAND_PRESENTATION.widths;
const escape = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export function hollowWakeBrand(size: BrandSize = 'compact'): string {
  return `<img class="hw-brand" data-brand="${size}" src="${BRAND_PRESENTATION.logo}"
    alt="${escape(GAME_TITLE)}" width="600" height="230"
    style="--brand-width:${BRAND_PRESENTATION.widths[size]}px" draggable="false">`;
}

/** A compact identity header for navigation menus, separate from their page heading. */
export function hollowWakeMenuHeader(size: BrandSize = 'compact'): string {
  return `<div class="hw-menu-brand">${hollowWakeBrand(size)}</div>`;
}
