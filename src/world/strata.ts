// ---------------------------------------------------------------------------
// STRATA — the world's VERTICAL ladder as data.
//
// The world is a STACK: the open surface, then the near-dark GALLERIES a cave
// mouth descends into, then the sunless DEPTHS where the Delver's kin hold
// court, and at the very bottom the BRINK — the floor of the world, where a
// deep enough ladder tears a breach into whatever dimension declares a
// 'cave_breach' entry (the Underworld today; dimensions.ts owns that door).
//
// A STRATUM is a band of cave depths (ZoneDef.caveDepth — 1 = a surface cave,
// each cave-within-a-cave one deeper) carrying everything that makes a rung of
// the ladder FEEL like a rung: its display name (the zone banner's underground
// read), the zone-level climb, how eagerly its caves conceal still-deeper
// mouths, how dark its galleries run, and how the Descent's shaft-keepers
// weight their haunts. Content selects per band through the CAVE-FACE pool
// (data/tilesets.ts TilesetDef.caveFace): each underground tileset weights
// itself by a LevelEnvelope over caveDepth × the surface ANCHOR biome — so a
// magma gallery under volcanic country is a neighbour's cellar, while the same
// gallery under a meadow means you have delved far enough for the world's own
// heat ("why is the lava pit here?" always has an answer).
//
// An OPEN registry, engine-free by construction (mirrors presence.ts): bands
// tile the ladder from depth 1 upward; registerStratum lets packages re-tune
// or extend the stack; validate.ts asserts the tiling holds. Nothing here
// hardcodes WHICH depths exist — the deepest band is open-ended.
// ---------------------------------------------------------------------------

export interface StratumDef {
  id: string;
  /** Display name — the banner's underground read ("the Depths"). */
  name: string;
  /** First caveDepth of this band. Bands tile the ladder contiguously from 1. */
  from: number;
  /** Last caveDepth (inclusive). Omitted = open-ended (the deepest band). */
  to?: number;
  /** Zone-level STEP added when descending INTO each rung of this band,
   *  indexed by rung-within-band (the last entry repeats). [0, 1] is the
   *  classic surface curve: parent-level at depth 1, +1 at depth 2. */
  levelStep: number[];
  /** Chance a cave minted in this band conceals a still-deeper mouth (the
   *  ladder is a discovery, not a guarantee — but the deep invites deeper). */
  deeperChance: number;
  /** Floor for theme.ambientDark on caves minted in this band — the light
   *  layer's baseline dark deepens with the ladder, whatever face rolled. */
  darkFloor?: number;
  /** Multiplier on the Descent Delver's mint chance in this band (default 1 —
   *  the shaft-keepers haunt the deep galleries more than the near-dark). */
  delverMul?: number;
  /** Name prefix for caves minted in this band ("Deep Gloom Cave"). */
  namePrefix?: string;
  /** Depth the prefix starts applying (default: the band's `from`) — lets the
   *  first band leave its depth-1 caves unprefixed the classic way. */
  prefixFrom?: number;
  /** One line of lore for docs/UI. */
  blurb?: string;
}

const STRATA: StratumDef[] = [];

/** Register (or re-tune, matched by id) a stratum band. Bands keep themselves
 *  sorted by `from`; validate.ts asserts they tile the ladder without gaps. */
export function registerStratum(def: StratumDef): void {
  const i = STRATA.findIndex(s => s.id === def.id);
  if (i >= 0) STRATA[i] = def;
  else STRATA.push(def);
  STRATA.sort((a, b) => a.from - b.from);
}

export function strataDefs(): readonly StratumDef[] { return STRATA; }

/** The band a cave depth falls in. Depths above the ladder clamp to the first
 *  band, below the last band's `to` to the last (the open-ended deep). */
export function stratumOf(depth: number): StratumDef {
  let out = STRATA[0];
  for (const s of STRATA) {
    if (depth >= s.from) out = s;
    if (s.to !== undefined && depth <= s.to) break;
  }
  return out;
}

/** The rung's level step (the +levels applied descending INTO this depth). */
export function levelStepAt(depth: number): number {
  const s = stratumOf(depth);
  const steps = s.levelStep;
  if (!steps.length) return 0;
  const rung = Math.max(0, depth - s.from);
  return steps[Math.min(rung, steps.length - 1)];
}

/** Total zone-level climb from the surface anchor down to `depth`. */
export function levelBonusAt(depth: number): number {
  let sum = 0;
  for (let d = 1; d <= depth; d++) sum += levelStepAt(d);
  return sum;
}

export function deeperChanceAt(depth: number): number {
  return stratumOf(depth).deeperChance;
}

export function darkFloorAt(depth: number): number | undefined {
  return stratumOf(depth).darkFloor;
}

export function delverMulAt(depth: number): number {
  return depth >= 1 ? stratumOf(depth).delverMul ?? 1 : 1;
}

/** The band's cave-name prefix at this depth, honoring `prefixFrom`. */
export function namePrefixAt(depth: number): string | undefined {
  const s = stratumOf(depth);
  if (!s.namePrefix) return undefined;
  return depth >= (s.prefixFrom ?? s.from) ? s.namePrefix : undefined;
}

// --- THE DEFAULT LADDER ------------------------------------------------------
// Overworld (depth 0, not a band) → the Galleries → the Depths → the Brink.
// The Underworld's cave_breach entry (dimensions.ts, minDepth 5) opens at the
// Brink: the Depths' floor cracking into hell — so the stack reads, top to
// bottom: surface, caverns, the Depths, the Underworld.

/** THE GALLERIES — the near-dark: cellar-cool caves still threaded with
 *  surface roots, surface fauna, surface air. The familiar spelunk. */
registerStratum({
  id: 'galleries', name: 'the Galleries', from: 1, to: 2,
  levelStep: [0, 1], deeperChance: 0.32, darkFloor: 0.5,
  namePrefix: 'Deep', prefixFrom: 2,
  blurb: 'The near-dark under the world’s skin — root-threaded caves that still remember the sky.',
});

/** THE DEPTHS — the sunless band the Delver's abyss belongs to: Depthkin
 *  country, glowworm light, the dark that has never heard weather. */
registerStratum({
  id: 'depths', name: 'the Depths', from: 3, to: 4,
  levelStep: [1, 1], deeperChance: 0.5, darkFloor: 0.58, delverMul: 1.7,
  namePrefix: 'Sunless',
  blurb: 'The sunless country. Nothing down here remembers the sky; the Depthkin were born without the idea of it.',
});

/** THE BRINK — the floor of the world. A ladder this deep bottoms out in a
 *  BREACH (worldgen marks the cave; the dimension registry owns the gate). */
registerStratum({
  id: 'brink', name: 'the Brink', from: 5,
  levelStep: [1], deeperChance: 0, darkFloor: 0.62, delverMul: 1.7,
  namePrefix: 'Bottomless',
  blurb: 'The floor of the world — thin stone over somewhere else entirely.',
});
