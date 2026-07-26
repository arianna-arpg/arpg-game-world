// ---------------------------------------------------------------------------
// EVENT-PINNED WEATHER — world events as weather SOURCES (the transience
// doctrine's presentation lane; docs/engine/transience.md).
//
// A world event that HOLDS ground (a Demon Invasion's storm radius, an
// Incursion's tentacle reach) reads as ITS OWN KIND OF WEATHER over the zones
// it covers: an eventOnly WEATHER_DEFS row (wash, particles, veil, radiance,
// wind — the whole presentation stack) pinned by a source registered here and
// folded at World.skyFront(), THE one gate every in-zone weather consumer
// already reads. Nothing below skyFront changes: the renderer crossfades the
// pinned front in and out exactly like a drifting sky front, radiance bends,
// wind blows — and when the event ends, the sky simply CLEARS. The land was
// never touched.
//
// Contract:
//  - Sources are pure reads of live overlay state, resolved fresh every call
//    (mirrors the zone-wash / zone-info / map-marker registries). Keep them
//    CHEAP — skyFront runs many times a frame.
//  - A source that throws is skipped (one bad source never breaks the sky).
//  - Sheltered ground is not this module's business: World.skyFront() already
//    returns null under shelter, so pinned fronts obey the same law as rain
//    ("no storms inside cellars, caves, or interiors").
//  - Safe/sanctuary policy lives in each source (an invasion's veil stops at
//    the town gate because ITS source says so — same row as its meteors).
//  - The FOLD: strongest intensity wins, sky fronts included — one sky at a
//    time reads clean (the zone-wash fold policy, in the air).
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import type { WeatherFront, WeatherKind } from '../world/weather';
import { WEATHER_DEFS } from '../world/weather';
import type { World } from './world';

/** Default node-space radius of a pinned front that declares no geometry of
 *  its own — sized so the projected in-zone field (THE ANCHORED SKY,
 *  render/vis/weatherFx.ts) covers the claimed zone generously: the event
 *  reads as air standing over THIS ground, not a dot. Sources with a real
 *  footprint (the Demon Storm's radius) pin their own instead. */
export const EVENT_PIN_RADIUS = 80;

/** What a source pins over one zone right now. Intensity 0..1 — it scales the
 *  wash/particles/spawn-neutral presentation exactly like a real front's ramp. */
export interface EventFrontPin {
  kind: WeatherKind;
  intensity: number;
  /** OPTIONAL FOOTPRINT (node space, the world-map coordinate frame): where
   *  this event's sky actually STANDS. Consumed only by presentation (THE
   *  ANCHORED SKY projects it into the zone so the veil/wash hang over the
   *  event's true ground); mechanics stay zone-granular exactly as before.
   *  Omitted ⇒ the claimed zone's own node at EVENT_PIN_RADIUS — a
   *  zone-anchored sky, which is the honest footprint for zone-held events
   *  (a quickening's gilt air IS its zone). */
  pos?: Vec2;
  radius?: number;
}

/** One event's weather claim. `sample` is called for the CURRENT zone only. */
export interface EventFrontSource {
  id: string;
  sample(world: World, zone: ZoneDef): EventFrontPin | null;
}

const SOURCES: EventFrontSource[] = [];

/** Register an event weather source (module scope, once per feature — the
 *  overlay that owns the event state registers beside its zone-info source). */
export function registerEventFront(src: EventFrontSource): void {
  const i = SOURCES.findIndex(s => s.id === src.id);
  if (i >= 0) SOURCES[i] = src; // HMR-safe re-register, never a double pin
  else SOURCES.push(src);
}

/** Registered source ids (probes/dev introspection). */
export function eventFrontSourceIds(): string[] { return SOURCES.map(s => s.id); }

/** The strongest event-pinned front over `zone`, as a SYNTHETIC WeatherFront —
 *  stationary, already at its sampled intensity — so every consumer downstream
 *  of skyFront (renderer, radiance, wind, strikes, dress) treats it exactly
 *  like a sampled sky front. The pin's own footprint (pos/radius, node space)
 *  rides through when declared — the Demon Storm's veil hangs over its true
 *  epicenter — else the front stands zone-anchored at EVENT_PIN_RADIUS. Null
 *  when no event claims the zone or the claimed kind is unregistered
 *  (tolerance doctrine: a stale save naming a retired kind degrades to clear
 *  sky, never a crash). */
export function eventFrontFor(world: World, zone: ZoneDef): WeatherFront | null {
  let best: EventFrontPin | null = null;
  for (const s of SOURCES) {
    try {
      const pin = s.sample(world, zone);
      if (pin && pin.intensity > 0.02 && WEATHER_DEFS[pin.kind]
        && (!best || pin.intensity > best.intensity)) best = pin;
    } catch { /* one bad source never breaks the sky */ }
  }
  if (!best) return null;
  return {
    kind: best.kind,
    pos: best.pos ? { x: best.pos.x, y: best.pos.y } : { x: zone.map.x, y: zone.map.y },
    vel: { x: 0, y: 0 },
    radius: Math.max(1, best.radius ?? EVENT_PIN_RADIUS),
    intensity: Math.min(1, best.intensity),
    age: 0,
    life: 1,
  };
}
