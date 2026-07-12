// ---------------------------------------------------------------------------
// WORLD BULLETINS — the open registry for "something happened somewhere"
// notices (mirrors mapMarkers / zoneInfo: register at import time, the engine
// stays dumb).
//
// A bulletin is a one-line, player-facing toast about the LIVING WORLD — a
// zone falling to a faction, a warfront shifting, a writ being posted — shown
// wherever the player stands. Before this registry, each overlay needed its
// own hand-written drain loop inside World.update (the one event surface a
// new overlay did NOT get for free); now an overlay queues lines on itself,
// registers a source that drains them, and the engine's single collect pumps
// every source each tick.
//
// DRAIN SEMANTICS: a source returns what's NEW since its last call and clears
// its own queue — collect never dedupes or throttles (the source owns its
// cadence; keep world-scale noise rare). A source that throws is skipped so
// one bad contributor can't silence the rest.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';

export interface WorldBulletin {
  text: string;
  /** Accent colour (default: BULLETIN_CFG.color). */
  color?: string;
  /** Font size (default: BULLETIN_CFG.size). */
  size?: number;
}

/** The shared bulletin look — one place, no per-call literals. */
export const BULLETIN_CFG = {
  /** The war-report amber every un-tinted bulletin wears. */
  color: '#e8a050',
  size: 15,
} as const;

/** A drained producer of fresh bulletins — see DRAIN SEMANTICS above. */
export type BulletinSource = (world: World) => WorldBulletin[];

const SOURCES: BulletinSource[] = [];

/** Register a bulletin source (called once at boot per feature, import-time). */
export function registerBulletinSource(s: BulletinSource): void { SOURCES.push(s); }

/** Drain every source. Called once per tick by World.update; each returned
 *  line is toasted at the player. */
export function collectBulletins(world: World): WorldBulletin[] {
  const out: WorldBulletin[] = [];
  for (const s of SOURCES) {
    try { out.push(...s(world)); } catch { /* a bad source never silences the rest */ }
  }
  return out;
}
