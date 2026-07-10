// ---------------------------------------------------------------------------
// SOFT AIM ASSIST — controller-only magnetism for the pad's aim reticle.
//
// The right stick supplies a RAW aim point (direction × reach); this module
// bends it toward the most plausible target so twin-stick play doesn't demand
// pixel aim, without ever taking the stick away from the player:
//
//   • ACQUIRE: the nearest live hostile whose edge sits within acquireRadius
//     of the raw point becomes the held target.
//   • STICK: once held, the target keeps the lock while the raw point stays
//     within breakRadius — hysteresis, so stick jitter can't drop or thrash
//     the lock between neighbours. Aiming decisively away breaks it.
//   • BLEND: the delivered aim slides from raw toward the target's center by
//     `strength` (Settings.pad.aimAssist, 0..1). 0 = off, 1 = hard snap;
//     everything between is a weighted pull the player can feel and fight.
//
// The radii live here (AIM_ASSIST) as engine tunables; the strength is the
// one player-facing dial. Pure function — the caller owns the held-target id
// between frames, so tests can drive it without a main loop.
// ---------------------------------------------------------------------------

import type { World } from './world';
import type { Actor } from './actor';
import { LOS_CFG } from './los';

export interface AimAssistTuning {
  /** A target's EDGE within this of the raw aim point can be acquired. */
  acquireRadius: number;
  /** A held target keeps its lock while its edge stays within this of the
   *  raw point (> acquireRadius = sticky). */
  breakRadius: number;
}

export const AIM_ASSIST: AimAssistTuning = {
  acquireRadius: 110,
  breakRadius: 175,
};

export interface AssistedAim {
  x: number;
  y: number;
  /** The held target's actor id (null = free aim). Feed it back next frame. */
  targetId: number | null;
}

/** Edge distance from a point to an actor (big targets are easier to hold). */
const edgeDist = (a: Actor, x: number, y: number): number =>
  Math.hypot(a.pos.x - x, a.pos.y - y) - a.radius;

export function assistAim(
  world: World,
  self: Actor,
  raw: { x: number; y: number },
  heldId: number | null,
  strength: number,
  tuning: AimAssistTuning = AIM_ASSIST,
): AssistedAim {
  if (strength <= 0) return { x: raw.x, y: raw.y, targetId: null };
  // One hostility sweep per call — enemiesOf already filters dead/untargetable
  // /downed and applies diplomacy. The player's own breakable conjurations
  // join that pool (so their skills can demolish them), but magnetizing the
  // reticle onto your own furniture would be a betrayal — skip them. Foes
  // swallowed by a canopy VEIL patch the aimer isn't inside are skipped too —
  // the reticle can't hold what the eye can't see, and a held lock BREAKS the
  // moment its target slips under unbroken leaves (positioning keeps targets
  // in sight; step under the same canopy to re-acquire).
  const selfPatch = world.veilPatchAt(self.pos);
  const pool = world.enemiesOf(self).filter(a => {
    if (a.construct?.breakable !== undefined && a.owner === self) return false;
    const p = world.veilPatchAt(a.pos);
    if (p !== null && p !== selfPatch) return false;
    // The veil rule, extended to STONE (LOS_CFG.aimAssist): the reticle
    // can't hold what a wall hides — a held lock breaks when its target
    // steps behind masonry, exactly as under unbroken leaves.
    if (LOS_CFG.aimAssist && !world.lineOfSight(self.pos, a.pos)) return false;
    return true;
  });
  let target: Actor | undefined;
  // STICK: the held target survives while raw aim stays inside breakRadius.
  if (heldId !== null) {
    const held = pool.find(a => a.id === heldId);
    if (held && edgeDist(held, raw.x, raw.y) <= tuning.breakRadius) target = held;
  }
  // ACQUIRE: nearest eligible edge within acquireRadius of the raw point.
  if (!target) {
    let bd = tuning.acquireRadius;
    for (const a of pool) {
      const d = edgeDist(a, raw.x, raw.y);
      if (d < bd) { bd = d; target = a; }
    }
  }
  if (!target) return { x: raw.x, y: raw.y, targetId: null };
  return {
    x: raw.x + (target.pos.x - raw.x) * strength,
    y: raw.y + (target.pos.y - raw.y) * strength,
    targetId: target.id,
  };
}
