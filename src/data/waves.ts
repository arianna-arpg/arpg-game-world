// ---------------------------------------------------------------------------
// WAVES — the survival-assault mechanic's tuning, all in one place.
//
// A 'waves' objective (data/zones.ts ObjectiveSpec) spawns escalating
// assaults (World.spawnWave). Two levers shipped with The Pit's return:
//
//   • COUNT scales with the wave number AND the character's level — an arena
//     that grows with whoever dares it, not a fixed drip. Waves also arrive
//     as SURGE GROUPS (clustered spawn points), not an even sprinkle.
//   • FRENZY: wave spawns come ALREADY HUNTING — x-ray 360° perception,
//     relentless infinite-range locks, kin-alert shouts, the direct charge
//     kernel, no leash/morale/tempo hesitation. A wave is a WAVE that crashes
//     onto the player's battle-line, not a scatter of grazers picked off one
//     by one. Applied per-instance as a FRESH merged brain overlay (defs are
//     never mutated); an objective can opt out with `frenzy: false`.
//
// Every number is a knob. Nothing here is keyed to a zone id.
// ---------------------------------------------------------------------------

import type { TargetSpec } from '../engine/brain';

export interface WaveFrenzySpec {
  /** Detection-range multiplier folded into the brain's target axis (the
   *  swarm archetype ships 1.4; a wave smells you across the arena). */
  detectMul: number;
  /** 'more' moveSpeed while frenzied (0 = none) — the wave RUNS. */
  moveSpeedMore: number;
  /** Fresh-acquire kin-alert radius (PerceptionSpec.alertShout) — one senses,
   *  the pack charges. */
  shoutRadius: number;
  /** Seconds a lost target's last position is stalked (never applies in
   *  practice — x-ray + relentless never lose the lock — but belts what
   *  suspenders hold). */
  memory: number;
  /** How the wave weighs the player's battle-line: the hero first, but
   *  minions/companions/mercenaries are real obstacles it will fight
   *  through, not tunnel past. */
  kindBias: NonNullable<TargetSpec['kindBias']>;
  /** Crowd factor for the direct kernel (MoveSpec.closeFrac): < 1 presses
   *  through the swing instead of politely queueing at max range. */
  closeFrac: number;
}

export const WAVE_CFG = {
  /** Seconds before the FIRST wave of a fresh arena visit. */
  firstDelay: 2,
  /** Seconds of breather between cleared waves. */
  intermission: 3,
  /** Spawn count = base + wave×perWave + charLevel×perLevel, capped at max.
   *  (Wave 1 at level 1 ≈ 8; wave 10 at level 12 ≈ 30; the cap holds the
   *  actor budget.) */
  count: { base: 6, perWave: 2, perLevel: 0.35, max: 44 },
  /** Waves arrive as SURGE GROUPS: ~size members ring each cluster anchor
   *  within spread px (anchors are legal spawn points; members clamp legal). */
  cluster: { size: 8, spread: 90 },
  /** The frenzy overlay applied to every wave spawn (null = classic placid
   *  spawns everywhere; per-objective `frenzy: false` opts one arena out). */
  frenzy: {
    detectMul: 6,
    moveSpeedMore: 0.12,
    shoutRadius: 700,
    memory: 999,
    kindBias: { player: 3, minion: 2, companion: 2, mercenary: 2, monster: 1 },
    closeFrac: 0.85,
  } as WaveFrenzySpec | null,
};
