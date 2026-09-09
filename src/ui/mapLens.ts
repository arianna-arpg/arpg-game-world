// ---------------------------------------------------------------------------
// THE DEV LENS — the world map's development view, as one small state.
//
// The shipped chart obeys THE KNOWLEDGE LAW (world/atlas.ts, World.visible):
// only ground the player has walked, stood beside, surveyed, been told of or
// heard of is drawn. Development wants the opposite — every minted node, the
// whole painted terrain, the ground read under the cursor — and that view is
// exactly as valuable as the honest one, so it lives here as a LENS the map
// renders through, never as world state: nothing a lens shows is stamped on
// a def, saved, or sent over the wire. Flip it off and the honest chart is
// back, byte for byte.
//
// Only the `?dev` panel's Atlas tab writes it (dev/tabs/atlas.ts), which also
// restores the last pick per browser (localStorage, the ultimates-lab idiom);
// a shipped page never reads the key, so the lens ships OFF by construction.
// ---------------------------------------------------------------------------

export interface MapLens {
  /** OMNISCIENT: every node draws (veiled, concealed, unwalked) with its
   *  name, the chart paints with no veil, overlay washes are unclipped and
   *  their far extents stretch the fit — the whole minted world at once. */
  omniscient: boolean;
  /** THE CURSOR READ: a strip under the layer chips prints the ground under
   *  the pointer (biome · elevation · climate words · features in reach). */
  cursorRead: boolean;
}

export const MAP_LENS: MapLens = { omniscient: false, cursorRead: false };

const KEY = 'dev_maplens';

export function setMapLens(patch: Partial<MapLens>): void {
  Object.assign(MAP_LENS, patch);
  try { localStorage.setItem(KEY, JSON.stringify(MAP_LENS)); } catch { /* ignore */ }
}

/** Re-apply the browser's last lens (the dev tab calls it once at mount). */
export function mapLensRestore(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const j = JSON.parse(raw) as Partial<MapLens>;
    if (typeof j.omniscient === 'boolean') MAP_LENS.omniscient = j.omniscient;
    if (typeof j.cursorRead === 'boolean') MAP_LENS.cursorRead = j.cursorRead;
  } catch { /* ignore */ }
}

export function mapLensReset(): void {
  MAP_LENS.omniscient = false;
  MAP_LENS.cursorRead = false;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
