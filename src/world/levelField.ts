// ---------------------------------------------------------------------------
// LEVEL FIELD — the world's DIFFICULTY as a coordinate-space heat-map.
//
// A pure leaf (imports only the coord vocabulary) that answers ONE question:
// "how dangerous is the ground HERE?" — i.e. what monster level a zone minted
// at this coordinate should carry. It is the difficulty twin of the biome field:
// biomeAt says WHAT kind of land, levelAt says HOW DEADLY.
//
// THE SHAPE the design asks for (see the vision):
//  • A radial base centered on town (Lastlight): the further out, the higher the
//    floor — gentle "growth rings" of escalating danger.
//  • SMOOTH value-noise variance on top, so the rings are LOOSE and interwoven —
//    not perfect circles but a meandering, organic gradient where neighbouring
//    regions stay coherent (one zone ≈ its neighbours) yet a different DIRECTION
//    out of a hub can be markedly safer or deadlier than another.
//  • Rare hard SPIKE regions (coarse cells) that jump several levels at a stroke —
//    the "wandered out of Redridge into Searing Gorge" moment: a region you must
//    recognise and route AROUND until you out-level it. Bounded, deterministic.
//
// The value is sampled ONCE at zone mint and baked onto def.level (Zone Memory
// stores no level — see engine/world.ts), so a charted zone NEVER shifts danger
// under the player. The modifier seam (warp) mirrors the biome field's: a future
// living-world quest/event can raise/lower danger locally without an engine edit.
//
// Pure-leaf discipline: this file imports ONLY world/coords. The sim constructs a
// LevelField (seeded from the run seed, centered on the town's map coord) and the
// engine binds a levelFor closure over sampleLevel — exactly mirroring biomeFor.
// ---------------------------------------------------------------------------

import { coordDist, type MapCoord } from './coords';

/** Tunable difficulty-field shape. Pure data — change these to retune the world's
 *  danger geography without touching the engine. Distances are in node-units (a
 *  cardinal MAP_DIR step is ~78 N/S, ~86 E/W, so "one zone over" ≈ 78-86).
 *  See docs/design/world-progression.md for the graph-based opening contract. */
export interface LevelFieldCfg {
  /** Node-units of distance per +1 to the difficulty FLOOR (the ring width). */
  ringSpan: number;
  /** Extra node-units per successive ring. The inverse uses the same integral. */
  ringGrowth: number;
  /** Distance treated as the level-1 core. The playable opening is graph-based. */
  innerRadius: number;
  /** The lowest level any ground can roll. */
  minLevel: number;
  /** Variance amplitude (in levels) at the town core. */
  baseAmp: number;
  /** Extra variance amplitude per ringSpan of distance — danger SWINGS widen the
   *  further you roam (tight near town, wild in the deep wilds). */
  ampGrowth: number;
  /** Bound local variance so distant quest bands still describe their approaches. */
  maxAmp: number;
  /** Distance over which noise fades in outside the inner core. */
  noiseFade: number;
  /** Spikes start outside this radius, then fade in over noiseFade. */
  spikeStart: number;
  /** Node-units per smooth-noise cell — the COHERENCE scale. Larger = wider regions
   *  of similar danger (a few zones share a mood). */
  noiseCell: number;
  /** Node-units per SPIKE cell — the size of a "Searing Gorge" danger block. */
  spikeCell: number;
  /** Fraction of spike cells that ARE a spike (0..1) — the rarity of the surprise. */
  spikeChance: number;
  /** Levels a spike cell adds on top of the base+variance — the deadly leap. */
  spikeBonus: number;
}

/** Moderate widening supports branching exploration as XP costs outpace ordinary
 *  kill rewards. Opening roads provide level-one ground around the actual hub;
 *  town distance alone cannot guarantee it. Noise is signed and bounded; spikes
 *  remain dangerous branches outside the opening. The quest inverse shares the
 *  exact radial curve. Existing minted levels are never resampled. */
export const LEVEL_FIELD_CFG: LevelFieldCfg = {
  ringSpan: 65,
  ringGrowth: 0.3,
  innerRadius: 0,
  minLevel: 1,
  baseAmp: 0.6,
  ampGrowth: 0.12,
  maxAmp: 3,
  noiseFade: 180,
  spikeStart: 500,
  noiseCell: 200,
  spikeCell: 360,
  spikeChance: 0.1,
  spikeBonus: 5,
};

/** How a GENERATED EVENT/QUEST zone's level relates to the radial field — the two
 *  levers the design asks for. The base is ALWAYS the radial field at the zone's
 *  coordinate (the "standard ruleset"); these optionally clamp it toward the player:
 *   • floorBelowChar — the level may not drop below (charLevel − this). null = no floor
 *     (a backwater event can be genuinely easy: PURE radial low end).
 *   • capAboveChar   — the level may not rise above (charLevel + this). null = no cap
 *     (the deep wilds are lethal: PURE radial high end).
 *  DEFAULT = both null = PURE RADIAL (the preferred feel). Flip either to a number to
 *  add a safety floor/ceiling if play-testing shows it's too swingy. Pure data. */
export interface EventLevelPolicy {
  floorBelowChar: number | null;
  capAboveChar: number | null;
}
export const EVENT_LEVEL_POLICY: EventLevelPolicy = {
  floorBelowChar: null, // pure radial low end (a backwater event can be easy)
  capAboveChar: null,   // pure radial high end (the far wilds are lethal)
};

/** Resolve an event/quest zone's level from the radial field + the policy levers.
 *  Pure: the engine binds `field`(=levelFor(coord)) and `charLevel`. */
export function eventLevel(field: number, charLevel: number, policy: EventLevelPolicy = EVENT_LEVEL_POLICY): number {
  let lvl = field;
  if (policy.floorBelowChar != null) lvl = Math.max(lvl, charLevel - policy.floorBelowChar);
  if (policy.capAboveChar != null) lvl = Math.min(lvl, charLevel + policy.capAboveChar);
  return Math.max(1, Math.round(lvl));
}

/** A local WARP of the difficulty field — the HEAT-SOURCE seam (parallel to the
 *  biome field's modifier). Within `radius` of `center`, shift the level by
 *  `deltaLevel`. Pushed by quests/world-events in a future living-world pass; the
 *  LevelField holds the live list. */
export interface LevelFieldModifier {
  center: MapCoord;
  radius: number;
  /** Levels added (or subtracted) inside the radius. */
  deltaLevel: number;
  /** 0..1 — how much of the radius is affected (dithered, like the biome field). */
  strength: number;
}

// --- Deterministic noise primitives (self-contained: a level field never needs to
//     agree with the biome field, only with ITSELF across host/client/reload). The
//     integer hash is the same Rng/Murmur family used elsewhere → identical results
//     on every platform. ---

/** Integer hash → 0..1, deterministic for a fixed (a, b, seed). */
function hash01(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}

/** Smoothstep — Ken Perlin's classic ease, for soft lattice interpolation. */
function smooth(t: number): number { return t * t * (3 - 2 * t); }

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/** SMOOTH value noise in [0,1) at a lattice coordinate — bilinear-interpolated
 *  corner hashes with smoothstep easing. UNLIKE the biome field's white-noise
 *  Voronoi (intentionally harsh region edges), this gives a coherent gradient so
 *  difficulty drifts gently and neighbours stay related — the "loose growth rings"
 *  the design asks for. Two octaves add organic texture without breaking coherence. */
function valueNoise(x: number, y: number, seed: number): number {
  let total = 0, amp = 1, max = 0, fx = x, fy = y, s = seed;
  for (let o = 0; o < 2; o++) {
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = smooth(fx - x0), ty = smooth(fy - y0);
    const v00 = hash01(x0, y0, s), v10 = hash01(x0 + 1, y0, s);
    const v01 = hash01(x0, y0 + 1, s), v11 = hash01(x0 + 1, y0 + 1, s);
    total += amp * lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
    max += amp;
    amp *= 0.5; fx *= 2; fy *= 2; s = (s ^ 0x68bc21eb) >>> 0;
  }
  return total / max;
}

const SPIKE_SALT = 0x5ea21c00; // isolates the spike roll from the variance noise

/** THE sampler: the level of the ground at `coord`, for a world centered on
 *  `origin` with run `seed`. Pure + deterministic. Returns an integer ≥ minLevel. */
export function levelAt(
  coord: MapCoord, origin: MapCoord, seed: number, cfg: LevelFieldCfg = LEVEL_FIELD_CFG,
): number {
  const dist = coordDist(coord, origin);
  // Radial FLOOR: gentle escalation outward, level-1 within the core.
  const rings = ringsAtDistance(dist, cfg);
  const base = cfg.minLevel + rings;
  // Variance widens with distance — tight near town, wild in the deep.
  const fade = Math.min(1, Math.max(0, dist - cfg.innerRadius) / cfg.noiseFade);
  const amp = Math.min(cfg.maxAmp, cfg.baseAmp + cfg.ampGrowth * rings) * fade;
  const variance = valueNoise(coord.x / cfg.noiseCell, coord.y / cfg.noiseCell, seed);
  // Rare hard SPIKE region (a whole coarse cell jumps): the route-around surprise.
  const sx = Math.floor(coord.x / cfg.spikeCell), sy = Math.floor(coord.y / cfg.spikeCell);
  const spikeFade = Math.min(1, Math.max(0, dist - cfg.spikeStart) / cfg.noiseFade);
  const spike = hash01(sx, sy, (seed ^ SPIKE_SALT) >>> 0) < cfg.spikeChance ? cfg.spikeBonus * spikeFade : 0;
  return Math.max(cfg.minLevel, Math.round(base + (2 * variance - 1) * amp + spike));
}

/** Stable quadratic inverse; avoids cancellation near the core. */
export function ringsAtDistance(distance: number, cfg: LevelFieldCfg = LEVEL_FIELD_CFG): number {
  const d = Math.max(0, distance - cfg.innerRadius);
  return 2 * d / (cfg.ringSpan + Math.sqrt(cfg.ringSpan ** 2 + 2 * cfg.ringGrowth * d));
}

/** Boot validator: the config must be sane (positive spans, ≥1 floor, sane spike
 *  chance) — a zeroed span would divide-by-zero a level to Infinity. Returns the
 *  list of problems (logged like validateBiomeField). */
export function validateLevelField(cfg: LevelFieldCfg = LEVEL_FIELD_CFG): string[] {
  const bad: string[] = [];
  if (!(cfg.ringSpan > 0)) bad.push(`ringSpan must be > 0 (is ${cfg.ringSpan})`);
  if (!(cfg.ringGrowth >= 0)) bad.push('ringGrowth must be >= 0');
  if (!(cfg.noiseFade > 0)) bad.push('noiseFade must be > 0');
  if (!(cfg.maxAmp >= 0) || !(cfg.baseAmp >= 0) || !(cfg.ampGrowth >= 0)) bad.push('variance amplitudes must be >= 0');
  if (!(cfg.spikeStart >= cfg.innerRadius)) bad.push('spikeStart must be outside the core');
  if (!(cfg.noiseCell > 0)) bad.push(`noiseCell must be > 0 (is ${cfg.noiseCell})`);
  if (!(cfg.spikeCell > 0)) bad.push(`spikeCell must be > 0 (is ${cfg.spikeCell})`);
  if (!(cfg.minLevel >= 1)) bad.push(`minLevel must be >= 1 (is ${cfg.minLevel})`);
  if (cfg.spikeChance < 0 || cfg.spikeChance > 1) bad.push(`spikeChance must be 0..1 (is ${cfg.spikeChance})`);
  if (cfg.innerRadius < 0) bad.push(`innerRadius must be >= 0 (is ${cfg.innerRadius})`);
  return bad;
}

/** The difficulty heat-map for a run: a seeded, town-centered sampler with a
 *  modifier list (the living-world seam). Mirrors BiomeField's public/private split:
 *  sampleLevel is the public API the engine's levelFor closure binds to. */
export class LevelField {
  /** Active local warps (empty until a living-world pass wires quests/events). */
  private readonly modifiers: LevelFieldModifier[] = [];

  constructor(
    private readonly seed: number,
    private readonly origin: MapCoord,
    private readonly cfg: LevelFieldCfg = LEVEL_FIELD_CFG,
  ) {}

  /** PUBLIC: the level a zone minted at `coord` should carry — the value worldgen
   *  bakes onto def.level at mint (sampled once; never re-read on revisit). */
  sampleLevel(coord: MapCoord): number {
    const base = levelAt(coord, this.origin, this.seed, this.cfg);
    if (!this.modifiers.length) return base;
    let delta = 0;
    for (const m of this.modifiers) {
      if (m.strength <= 0 || coordDist(coord, m.center) > m.radius) continue;
      // Honor strength: full delta at >=1, else a deterministic dithered slice.
      if (m.strength >= 1 || hash01(Math.round(coord.x), Math.round(coord.y), this.seed) < m.strength) {
        delta += m.deltaLevel;
      }
    }
    return Math.max(this.cfg.minLevel, base + Math.round(delta));
  }

  /** INVERSE of the radial FLOOR: the distance from town at which the base difficulty
   *  reaches `level` — i.e. the centre of that level's growth ring, ignoring the
   *  variance/spike noise. Used to place a directed mint (a quest boss arena) IN its
   *  proper level BAND rather than at the first noisy coord that happens to read high. */
  radiusForLevel(level: number): number {
    const rings = Math.max(0, level - this.cfg.minLevel);
    return this.cfg.innerRadius + rings * this.cfg.ringSpan + 0.5 * this.cfg.ringGrowth * rings * rings;
  }

  /** FUTURE SEAM: a quest/world-event raises or lowers danger locally (a "source
   *  of heat" the player can feel). Unused until the living-world pass wires it. */
  warp(mod: LevelFieldModifier): void { this.modifiers.push(mod); }
}
