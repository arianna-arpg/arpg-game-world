// ---------------------------------------------------------------------------
// THE ATTUNEMENT FABRIC — crystals take the color of the blow.
//
// A body wearing MonsterDef.tune is TUNABLE: every landed hit reads the
// packet's ROLLED amounts (post-conversion — an Avatar-of-Flame's "physical"
// mace tunes FIRE, because fire is what actually struck) and the dominant
// damage type becomes the body's TONE. Changing a tone PULSES that tone's
// `attuned_<tone>` status (status.ts) onto every nearby actor — allies and
// enemies alike, the crystal doesn't take sides — and re-dresses the body
// (its own long-held display status + glow tack), so what a crystal IS and
// what it GRANTS can never disagree.
//
// Physical is the GROUND STATE, not an absence: every tunable body starts
// physical (unless its spec rolls or pins otherwise), and battering an
// attuned crystal back to physical — "shattering the attunement" — is itself
// a deliberate act the chord puzzles build on (engine/puzzles.ts listens to
// every tone change through World.attuneCrystal's hook).
//
// Everything here is data: the spec rides MonsterDef rows, the statuses are
// ordinary STATUS_DEFS entries (their colors are THE tone tints, read back
// through toneTint so no palette forks), and TUNE_CFG carries every default.
// Adding a new damage type to stats.ts grows the whole fabric automatically
// — one more status row is the entire cost.
// ---------------------------------------------------------------------------

import { DAMAGE_TYPES, type DamageType } from './stats';
import { STATUS_DEFS } from './status';

/** MonsterDef.tune — what a tunable body accepts and how it answers. */
export interface TuneSpec {
  /** Tones this body accepts (default: every damage type). A blow whose
   *  dominant type isn't accepted leaves the tone alone. */
  tones?: DamageType[];
  /** The ground state (default 'physical'). */
  base?: DamageType;
  /** Roll the STARTING tone from `tones` at spawn (heart crystals pose the
   *  riddle; plain field crystals leave this off and wake physical). */
  roll?: boolean;
  /** Strikes never change this body's tone (the chord's heart HOLDS its
   *  note — the ring must come to it). */
  locked?: boolean;
  /** The attune pulse washed over everyone near on a tone CHANGE. `false`
   *  mutes it (puzzle nodes that shouldn't double-buff a grinding solver);
   *  omitted fields fall back to TUNE_CFG. */
  pulse?: { radius?: number; duration?: number } | false;
}

/** THE ATTUNEMENT tunables (World.attuneCrystal). */
export const TUNE_CFG = {
  /** How far a tone-change pulse washes (from the body's edge). */
  pulseRadius: 170,
  /** Seconds of `attuned_<tone>` granted to washed actors (as a scale of
   *  the status row's own duration — the row is the truth, this the dial). */
  pulseDuration: 6,
  /** Seconds a re-tune of the SAME body waits before pulsing again — a
   *  flurry re-rings the change once, not per hit. Tone STATE still updates
   *  every landed hit; only the wash is paced. */
  pulseIcd: 0.9,
  /** durationScale for the body's OWN display status: long enough to read
   *  as "until retuned" (statuses are the one dressing lane — nameplate,
   *  co-op wire, fx — so the body wears its tone as an ordinary buff). */
  holdScale: 9999,
  /** Floating text on a tone change ("attuned to fire!"). */
  text: (tone: DamageType): string =>
    tone === 'physical' ? 'the attunement shatters!' : `attuned to ${tone}!`,
} as const;

/** The status a tone grants/wears — one registered row per damage type. */
export function attunedStatus(tone: DamageType): string { return 'attuned_' + tone; }

/** The tone tints ARE the status colors (single palette source). */
export function toneTint(tone: DamageType): string {
  return STATUS_DEFS[attunedStatus(tone)]?.color ?? '#c8d8e8';
}

/** Dominant damage type of a rolled packet — the blow's TONE. Ties break by
 *  DAMAGE_TYPES order (physical first), so a perfectly even split reads as
 *  the ground state rather than flickering. Null when nothing landed. */
export function toneOfAmounts(amounts: Partial<Record<DamageType, number>>): DamageType | null {
  let best: DamageType | null = null;
  let bestAmt = 0;
  for (const t of DAMAGE_TYPES) {
    const amt = amounts[t] ?? 0;
    if (amt > bestAmt) { best = t; bestAmt = amt; }
  }
  return best;
}

/** Accepted-tone check honoring the spec's allow-list. */
export function toneAccepted(spec: TuneSpec, tone: DamageType): boolean {
  return !spec.tones || spec.tones.includes(tone);
}

/** Starting tone for a fresh tunable body (spawn-time; rng in [0,1)). */
export function rollStartTone(spec: TuneSpec, rng: () => number): DamageType {
  const pool = spec.tones ?? [...DAMAGE_TYPES];
  if (spec.roll && pool.length) return pool[Math.floor(rng() * pool.length)]!;
  return spec.base ?? 'physical';
}
