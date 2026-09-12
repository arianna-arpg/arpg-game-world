import { DEATH_PRESENTATION } from '../data/deathPresentation';

export interface DeathPresentation { elapsed: number }
export type DeathPresentationConfig = typeof DEATH_PRESENTATION;

const progress = (t: number, duration: number): number =>
  duration <= 0 ? (t >= 0 ? 1 : 0) : Math.max(0, Math.min(1, t / duration));
const ease = (t: number): number => t * t * (3 - 2 * t);

/** One timeline for the body, screen veil, and DOM epilogue. Pure, raw seconds;
 * no simulation randomness, kill hooks, or rewards belong in this sequence. */
export function deathPresentationPose(elapsed: number, cfg = DEATH_PRESENTATION) {
  const breakAt = Math.max(0, cfg.riseSec) + Math.max(0, cfg.crackSec);
  const revealAt = breakAt + Math.max(0, cfg.revealDelaySec);
  const flashSec = Math.max(0, cfg.flashSec);
  const flashLead = Math.min(breakAt, Math.max(0, cfg.flashLeadSec));
  const flashAge = elapsed - breakAt;
  const flash = flashSec <= 0 ? 0 : flashAge < 0
    ? ease(progress(flashAge + flashLead, flashLead))
    : (1 - progress(flashAge, flashSec)) ** 2;
  const screenFlash = flash * Math.max(0, Math.min(1, cfg.screenFlashAlpha));
  const endAt = Math.max(breakAt + Math.max(0, cfg.shatterSec, cfg.flashAlpha > 0 || cfg.screenFlashAlpha > 0 ? flashSec : 0), revealAt + Math.max(0, cfg.revealSec));
  const rise = ease(progress(elapsed, cfg.riseSec));
  const shards = ease(progress(elapsed - breakAt, cfg.shatterSec));
  return {
    lift: cfg.lift * rise,
    flash,
    screenFlash,
    flashSpread: progress(flashAge, flashSec),
    cracks: ease(progress(elapsed - Math.max(0, cfg.riseSec), cfg.crackSec)),
    broken: elapsed >= breakAt,
    shardAge: Math.max(0, elapsed - breakAt),
    shardAlpha: 1 - shards,
    fade: cfg.dimBeforeBreak * rise + (1 - cfg.dimBeforeBreak) * ease(progress(elapsed - revealAt, cfg.revealSec)),
    reveal: elapsed >= revealAt,
    complete: elapsed >= endAt,
    endAt,
  };
}
