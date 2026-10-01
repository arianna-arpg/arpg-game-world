// ---------------------------------------------------------------------------
// THE SKILL SHOWCASE's data: one choreography for every skill, shared by the
// in-game live showcase (src/showcase/, any surface that asks) and the
// website's recorded clips (scripts/capture-skill-clips.cjs films the same
// stages through the same engine). Contract: docs/engine/skill-showcases.md.
//
// A showcase is the skill cast on a bare stage against training dummies, on
// a loop: an idle lead-in, the act, a let-go tail, then a fresh stage. The
// stage is planned from the skill's own data (its delivery, AI reach, cast
// mode and targeting); SETUPS rows cover the skills that need more.
// ---------------------------------------------------------------------------

import type { ZoneTheme } from './zones';

export const SHOWCASE_CFG = {
  /** Master switch for the live showcase (the recorder ignores it). */
  enabled: true,
  /** The engine's render size, in its hidden frame's pixels (= canvas px). */
  render: { w: 960, h: 540 },
  /** One cycle, in seconds: idle lead-in, the act, the let-go tail. */
  lead: 0.45,
  act: 4.15,
  tail: 1.4,
  /** A soft blink across the loop seam (seconds). */
  fade: { in: 0.25, out: 0.4 },
  /** The live showcase's frame rate (the recorder sets its own). */
  fps: 30,
  /** The skill level a showcase casts at when the surface names none. */
  level: 10,
  /** Cooldowns longer than this are cut to it, so a loop shows the skill
   *  more than once; banks a cast spends refill at the same pace. */
  cooldownCap: 1.0,
  /** Every stage plays from this seed (the same skill plays the same loop). */
  seed: 20260930,
  /** Seconds a warm engine waits with nothing to show before it is torn
   *  down (its realm holds a second copy of the game's data). */
  idleDisposeSec: 45,
  /** Visible stage width in world units: the frame fits the scene tightly
   *  (small surfaces are the norm); wide areas widen it up to maxSpan. */
  minSpan: 480,
  /** Close work (melee, cones) frames closer still. */
  minSpanClose: 400,
  maxSpan: 1250,
  /** An area around the hero widens the frame at most this far (radius). */
  areaFit: 240,
  /** Ring radius around a self cast that names no area of its own. */
  selfRing: 92,
  /** The stage's ground (a SHOWCASE_STAGES look). */
  stage: 'slate',
  /** The bodies the stage borrows: the target, a corpse-fed skill's body, an
   *  ally-targeted skill's companion, and a gathered swarm's size. */
  foe: 'target_dummy',
  corpse: 'zombie',
  ally: 'dire_wolf',
  throng: 10,
};

/** Stage grounds (a ZoneTheme each). A cool slate reads every element's
 *  color and the dummies' warm wood. */
export const SHOWCASE_STAGES: Record<string, ZoneTheme> = {
  slate: {
    floor: '#1d2129', grid: '#171a20', border: '#262b33', obstacle: '#2c313a', obstacleEdge: '#363c46', accent: '#8fa8d8',
    ground: { palette: ['#16191f', '#1b1f26', '#20252d', '#262b34', '#2c323c'], bias: 0.5, alpha: 0.3, scale: 1.6, speckles: 0.5 },
  },
};

/** What a skill needs beyond dummies to show itself.
 *  foe:   the primary dummy becomes this monster (its own brain and kit),
 *         bled to lifeFrac so a claim or an execute can land;
 *  prep:  another skill cast first, `presses` times, the main press `then`
 *         seconds after the last one leaves the hand (mines to detonate, a
 *         bolt to snap);
 *  hold:  seconds each press is held (claims, long channels);
 *  skip:  why there is no showcase (a scene the stage cannot hold). */
export interface ShowcaseSetup {
  foe?: { id: string; lifeFrac?: number };
  prep?: { skill: string; presses?: number; then?: number };
  hold?: number;
  skip?: string;
}

export const SHOWCASE_SETUPS: Record<string, ShowcaseSetup> = {
  tame_beast: { foe: { id: 'dire_wolf', lifeFrac: 0.4 }, hold: 3.0 },
  seize: { foe: { id: 'zombie' } },
  possession: { foe: { id: 'zombie', lifeFrac: 0.25 } },
  detonate_mines: { prep: { skill: 'fire_mine', presses: 3, then: 0.5 } },
  cold_snap: { prep: { skill: 'frostbolt', presses: 1, then: 0.15 } },
  mimicry: { skip: 'casts only enemy arts captured through the bestiary' },
};
