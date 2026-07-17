// ---------------------------------------------------------------------------
// RADIANCE — the sky's light as ONE shared scalar, and the condition
// vocabulary content keys against it.
//
// radiance = dayCycle().light × the live weather kind's dial (WeatherDef
// .radiance — rain dims the day, a blood moon crushes the night darker, a
// starfall makes midnight glitter brighter than dusk). It is a PURE function
// of (world time, weather kind, sky exposure): deterministic, co-op-agreeing
// (both ride the snapshot), never a meter anyone manages — the world simply
// HAS a light level, and content reads it.
//
// RadianceCond is the one gate every radiance consumer speaks: ephemeral
// spans (engine/spans.ts) decide whether a bridge stands, creep-front lanes
// (ZoneCreepSpec.fronts[].when) decide whether the night's comets fly,
// future rows (fog banks, doodad effects, events) join by taking the same
// object. All three fields AND together; an omitted field abstains.
// ---------------------------------------------------------------------------

import { dayCycle, inPhases, type DayPhase } from './daynight';
import { WEATHER_DEFS } from './weather';

/** The condition a radiance consumer holds content behind. Every field is
 *  optional and they AND together: `{ radiance: { to: 0.35 } }` = "in the
 *  dark of night (or under a black storm)"; `{ weather: ['rain','storm'] }`
 *  = "while the sky weeps"; `{ phases: ['night'] }` = "by the clock's night
 *  regardless of weather". Prefer the radiance band where the FEEL is
 *  light-driven (a bridge of sunlight cares how bright the world is, not
 *  what the clock says) and phases where the fiction is clock-driven. */
export interface RadianceCond {
  /** Hold while radiance sits inside [from, to] (each bound optional). */
  radiance?: { from?: number; to?: number };
  /** Hold while the zone's live sky front is one of these kinds. */
  weather?: string[];
  /** Hold during these day phases (world/daynight.ts wheel). */
  phases?: DayPhase[];
}

export const RADIANCE_CFG = {
  /** Sheltered ground (caves, interiors, roofed dimensions — skyOf) reads a
   *  FLAT twilight: no day, no night, no weather. Consumers that only make
   *  sense under open sky simply never author rows there. */
  sheltered: 0.45,
};

/** The scalar. Pure per (time, weather kind, shelter) — the caller resolves
 *  those three from its zone (World.radiance() does), so this leaf stays
 *  import-light and probe-trivial. */
export function radianceOf(time: number, weatherKind: string | null | undefined, sheltered: boolean): number {
  if (sheltered) return RADIANCE_CFG.sheltered;
  const base = dayCycle(time).light;
  const dial = weatherKind ? WEATHER_DEFS[weatherKind]?.radiance : undefined;
  const bent = Math.max(base * (dial?.mul ?? 1), dial?.floor ?? 0);
  return Math.max(0, Math.min(1, bent));
}

/** Does a condition hold right now? Undefined = unconditional (holds). */
export function radianceCondHeld(
  cond: RadianceCond | undefined,
  time: number, weatherKind: string | null | undefined, sheltered: boolean,
): boolean {
  if (!cond) return true;
  if (cond.phases && !inPhases(time, cond.phases)) return false;
  if (cond.weather && !(weatherKind && cond.weather.includes(weatherKind))) return false;
  if (cond.radiance) {
    const r = radianceOf(time, weatherKind, sheltered);
    if (cond.radiance.from !== undefined && r < cond.radiance.from) return false;
    if (cond.radiance.to !== undefined && r > cond.radiance.to) return false;
  }
  return true;
}

/** Boot lint for any module holding RadianceCond rows: bands sane, weather
 *  kinds registered. Callers thread their owner label (the fog/creep
 *  validate contract). */
export function validateRadianceCond(owner: string, cond: RadianceCond | undefined): string[] {
  if (!cond) return [];
  const bad: string[] = [];
  const { radiance, weather, phases } = cond;
  if (radiance) {
    for (const [k, v] of Object.entries(radiance)) {
      if (v !== undefined && (v < 0 || v > 1)) bad.push(`${owner}: radiance.${k} ${v} outside [0,1]`);
    }
    if (radiance.from !== undefined && radiance.to !== undefined && radiance.from > radiance.to) {
      bad.push(`${owner}: radiance band [${radiance.from}, ${radiance.to}] is empty`);
    }
  }
  for (const w of weather ?? []) {
    if (!WEATHER_DEFS[w]) bad.push(`${owner}: weather kind '${w}' is not registered`);
  }
  if (phases && !phases.length) bad.push(`${owner}: phases[] is empty (never holds)`);
  if (!radiance && !weather?.length && !phases?.length) bad.push(`${owner}: empty condition (always holds) — drop the field instead`);
  return bad;
}
