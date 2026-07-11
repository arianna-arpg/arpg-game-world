// ---------------------------------------------------------------------------
// ZONE WASH REGISTRY — generic full-screen tint sources for the CURRENT zone.
//
// "Dread made visible": an event that HOLDS ground can colour the air of the
// zone it holds — a haunting's pale cold, a future blight's sick green, an
// eclipse's bruise — with no renderer edit per event. Each source is a pure
// function of world state resolved fresh every frame (mirrors the map-marker
// and zone-info registries); the renderer eases the DISPLAYED wash toward the
// folded target (renderer.smoothZoneWash) so settles, lifts and zone hops
// seep in over seconds instead of popping.
//
// FOLD POLICY: strongest alpha wins. Washes are moods, not layers — one mood
// at a time reads clean; two half-washes would read as mud. The renderer also
// clamps alpha (VIS_CFG.fx.zoneWashMaxAlpha) so no source can white-out the
// field. Adding a wash is one registerZoneWashSource(...) at module scope.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';

export interface ZoneWash {
  /** Hex tint of the air (e.g. a haunting's pale '#b8c8e8'). */
  color: string;
  /** Wash strength 0..1 — ~0.1-0.2 reads as a mood; the renderer clamps. */
  alpha: number;
}

export type ZoneWashSource = (world: World) => ZoneWash | null;

const SOURCES: ZoneWashSource[] = [];

/** Register a wash source (called once at boot per feature). */
export function registerZoneWashSource(s: ZoneWashSource): void { SOURCES.push(s); }

/** The strongest wash any source claims over the player's current zone right
 *  now, or null. Sources that throw are skipped — one bad source never
 *  stains the frame. */
export function foldZoneWash(world: World): ZoneWash | null {
  let best: ZoneWash | null = null;
  for (const s of SOURCES) {
    try {
      const zw = s(world);
      if (zw && zw.alpha > 0.004 && (!best || zw.alpha > best.alpha)) best = zw;
    } catch { /* never stain the frame */ }
  }
  return best;
}
