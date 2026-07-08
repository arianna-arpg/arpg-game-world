// ---------------------------------------------------------------------------
// PRESENCE — level-banded spawn weighting, as data. The Oblivion "leveled
// list" idea generalized: any monster table entry (zone packs, tileset packs,
// faction rosters, package rosters, wildlife rows) and any MonsterDef may
// carry a PresenceSpec — a weight-multiplier-vs-level ENVELOPE that decides
// how present that monster is at a given spawn level (usually the zone's).
//
//   { to: 12, fadeOut: 4 }        — early fodder: full through 12, gone by 16
//   { from: 20, fadeIn: 6 }       — a late arrival: absent below 14, full at 20
//   { from: 5, to: 10, fadeOut: 5 } — a band: 5–10 at full, trailing off by 15
//   { stops: [[1,3],[10,1],[18,0]] } — an arbitrary gradient (piecewise-linear)
//   'late'                        — a named band from the open registry
//
// TWO LAYERS MULTIPLY: the entry's presence (per-list shaping — the same
// monster can peak early in one roster and late in another) × the def's
// presence (a global floor/ceiling wherever the id appears, even in plain
// string[] pools). Presence shapes SELECTION only — explicit-id spawns
// (bosses, summon verbs, composite parts, quest set-pieces) never consult it.
//
// This module is a pure leaf (no imports) so data files and the engine can
// both use it without cycles. World.weightedPick(table, atLevel) is the one
// runtime chokepoint; validate.ts sweeps tables for levels left empty.
// ---------------------------------------------------------------------------

/** A weight-multiplier-vs-level curve. Every field optional; {} = always 1. */
export interface LevelEnvelope {
  /** First level at FULL presence — below it the fadeIn ramp (or a hard 0). */
  from?: number;
  /** Last level at FULL presence — above it the fadeOut ramp (or a hard 0). */
  to?: number;
  /** Levels BELOW `from` over which weight climbs 0→1 (default 0 = hard gate). */
  fadeIn?: number;
  /** Levels ABOVE `to` over which weight falls 1→0 (default 0 = hard gate). */
  fadeOut?: number;
  /** Arbitrary piecewise-linear gradient: sorted [level, mul] control points.
   *  Outside the ends the curve HOLDS its end multiplier. Multiplies with the
   *  from/to trapezoid when both are set (usually you use one or the other). */
  stops?: [number, number][];
  /** Flat multiplier on top of the curve (a band can also retune weight). */
  mul?: number;
}

/** What data carries: an inline envelope, or the name of a registered band. */
export type PresenceSpec = string | LevelEnvelope;

/** Anything an envelope-aware picker can chew on. */
export interface PresenceEntry { id: string; weight: number; presence?: PresenceSpec }

/** NAMED BANDS — the shared vocabulary, an OPEN registry. Content data reads
 *  best when tiers are named once and retuned in one place ('early_only'
 *  fodder across three factions moves together). Packages graft their own
 *  bands via registerPresenceBand. */
export const PRESENCE_BANDS: Record<string, LevelEnvelope> = {
  /** Teaching-tier fodder: full through 10, dispersed by 14. */
  early_only: { to: 10, fadeOut: 4 },
  /** The early game's regulars: thin out through the teens. */
  early: { to: 16, fadeOut: 8 },
  /** The mid-game band: arrives by 8, yields the field past 30. */
  mid: { from: 8, fadeIn: 4, to: 30, fadeOut: 12 },
  /** Late arrivals: absent below 12, at full strength by 20. */
  late: { from: 20, fadeIn: 8 },
  /** The elite tier: nothing before 20, full presence by 30. */
  elite: { from: 30, fadeIn: 10 },
};

/** Register a named band at boot (content packages, mods). No-op when the
 *  name is already taken unless `overwrite` — first writer wins by default. */
export function registerPresenceBand(id: string, env: LevelEnvelope, overwrite = false): void {
  if (!overwrite && PRESENCE_BANDS[id] !== undefined) return;
  PRESENCE_BANDS[id] = env;
}

const warned = new Set<string>();

/** Resolve a spec to its envelope (missing band name → warn once, always-on). */
export function presenceEnvelope(spec: PresenceSpec): LevelEnvelope {
  if (typeof spec !== 'string') return spec;
  const env = PRESENCE_BANDS[spec];
  if (env) return env;
  if (!warned.has(spec)) {
    warned.add(spec);
    console.warn(`[presence] unknown band '${spec}' — treating as always-present`);
  }
  return {};
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The envelope, evaluated: how present (0..n multiplier) at `level`. */
export function presenceMul(spec: PresenceSpec | undefined, level: number): number {
  if (spec === undefined) return 1;
  const env = presenceEnvelope(spec);
  let m = env.mul ?? 1;
  if (env.from !== undefined && level < env.from) {
    const fade = env.fadeIn ?? 0;
    m *= fade > 0 ? clamp01((level - (env.from - fade)) / fade) : 0;
  }
  if (env.to !== undefined && level > env.to) {
    const fade = env.fadeOut ?? 0;
    m *= fade > 0 ? clamp01((env.to + fade - level) / fade) : 0;
  }
  const stops = env.stops;
  if (stops && stops.length > 0) {
    if (level <= stops[0][0]) m *= stops[0][1];
    else if (level >= stops[stops.length - 1][0]) m *= stops[stops.length - 1][1];
    else {
      for (let i = 1; i < stops.length; i++) {
        if (level <= stops[i][0]) {
          const [l0, m0] = stops[i - 1];
          const [l1, m1] = stops[i];
          m *= l1 === l0 ? m1 : m0 + (m1 - m0) * ((level - l0) / (l1 - l0));
          break;
        }
      }
    }
  }
  return m < 0 ? 0 : m;
}

/** Fold entry-presence × def-presence into a table's weights at `level`,
 *  returning a NEW table with zero-weight entries dropped. The input array is
 *  returned untouched when nothing carries presence (the common fast path).
 *  A table gated ENTIRELY out falls back to the unshaped input — a spawn
 *  site never starves at runtime (validate.ts flags the authoring instead). */
export function presenceTable<T extends PresenceEntry>(
  table: readonly T[], level: number,
  defPresenceOf?: (id: string) => PresenceSpec | undefined,
): readonly T[] {
  let touched = false;
  for (const e of table) {
    if (e.presence !== undefined || defPresenceOf?.(e.id) !== undefined) { touched = true; break; }
  }
  if (!touched) return table;
  const out: T[] = [];
  for (const e of table) {
    const w = e.weight
      * presenceMul(e.presence, level)
      * presenceMul(defPresenceOf?.(e.id), level);
    if (w > 0) out.push({ ...e, weight: w });
  }
  return out.length > 0 ? out : table;
}
