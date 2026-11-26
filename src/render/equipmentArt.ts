/** Hollow Wake's engraved equipment stamps. Each row supplies the silhouette
 * and the cuts stamped into it; carried gear and empty seats share the die. */
const stamps: Readonly<Record<string, readonly [silhouette: string, cuts: string]>> = {
  helmet: ['M5 20v-7l3-6 8-4 8 4 3 6v7l-4 6-4 2-1-10-2 3-2-3-1 10-4-2z', 'M16 4v10m-9-1 7 3-1 2-5-2m17-3-7 3 1 2 5-2M10 8l-2 4m13-4 2 4'],
  chest: ['M10 4l6 3 6-3 6 4 2 7-5 2-2-2 1 11-8 4-8-4 1-11-2 2-5-2 2-7z', 'M10 5l2 6 4 2 4-2 2-6M5 12l5 2m17-2-5 2M9 18l7 2 7-2m-14 5 7 2 7-2m-7-10v7'],
  gloves: ['M6 18 4 12l2-2 5 5-4-9 3-2 4 8-2-9 3-1 3 10V4l3-1 1 10 2-6 3 1-1 12-5 5-1 4-10-2 1-5z', 'M9 16l5-2 7 3-2 5-7-2zm2 8 9 2'],
  boots: ['M9 3h13l-2 13 2 4 6 3 1 4-3 2H7l-2-3 2-8z', 'M10 7h11M9 11l10 3m-10 1 9 3m-9 2 8 2M7 25l19 1'],
  legs: ['M7 4h18l-1 9 2 14-6 2-4-14-4 14-6-2 2-14z', 'M8 8h16M16 8v5M8 18l5 1m6 0 5-1M7 24l5 1m8 0 5-1'],
  belt: ['M2 11l9 1 1-3h8l1 3 9-1v10l-9-1-1 3h-8l-1-3-9 1z', 'M13 12h6v8h-6zm3 4h5M4 15h5m15 1h3'],
  ring: ['M8 13l-1-4 5-5h8l5 5-2 5a11 11 0 1 1-15-1zm3 3a7 7 0 1 0 10 0l-5 3z', 'M8 9h16M12 5l-1 4 5 7 5-7-1-4m-9 4 5-4 5 4'],
  amulet: ['M5 4l2-1 4 8 5 3 5-3 4-8 2 1-4 9-5 3 6 6-8 8-8-8 6-6-5-3z', 'M16 17l4 5-4 5-4-5zm0 2v5'],
  weapon: ['M25 2l4 1-1 7-11 12 3 3-2 2-5-4-6 6-3-3 6-6-4-5 2-2 4 3z', 'M25 6 14 18m-6-3 10 10M7 24l2 2'],
  offhand: ['M16 2l12 5-1 10-4 7-7 6-7-6-4-7L4 7z', 'M16 6l9 3-1 8-3 5-5 4-5-4-3-5-1-8zm0 0v20M9 14l7 3 7-3'],
  quiver: ['M9 13 5 6l1-4 4 3 2 7 2-1-1-7 2-3 3 3-1 7 3 1 3-6 4-2v5l-4 5 2 2-5 13-7 1-6-14z', 'M9 16l14 3m-12 0 3 8m5-7-2 7M7 6l4 7m4-9v8m10-4-4 6'],
};
const cache = new Map<string,string>();
export function equipmentStamp(category: string): string | undefined {
  const stamp = Object.hasOwn(stamps, category) ? stamps[category] : undefined;
  if (!stamp) return;
  let svg = cache.get(category);
  if (!svg) {
    svg = `<svg class="equipment-stamp" viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"><path d="${stamp[0]}" fill="currentColor" fill-opacity=".17" fill-rule="evenodd"/><path d="${stamp[1]}" stroke-width="1.1"/></svg>`;
    cache.set(category, svg);
  }
  return svg;
}
