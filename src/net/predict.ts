// ---------------------------------------------------------------------------
// THE HONEST INPUT's client half (docs/engine/shard.md): how a render shell
// walks its OWN hero ahead of the host. main.ts predictOwnHero anchors the hero
// to the host's acked position and replays every unacked frame through these
// helpers: each frame walks at the dt it was polled for (the dt the host walks
// it at too, World.walkFrames), at the host's own pace (World.ownWalk, off the
// seat row), the gait advances one stride per frame, and the hero faces the aim
// it sends.
// ---------------------------------------------------------------------------

import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';

/** One local frame awaiting the host's ack: its seq, its axes and its dt. */
export interface PredictFrame { seq: number; dx: number; dy: number; dt: number }

/** Replay the unacked frames from the anchored position through the host's own
 *  integrator (World.moveActor). A frame's FIRST replay stamps the gait
 *  (Actor.bodyWalk); its later replays re-walk the ground without counting the
 *  stride again, so the walk cycle advances exactly as far as the hero walked.
 *  Returns the newest seq that has stamped (the caller keeps it per session). */
export function replayOwnFrames(world: World, hero: Actor, frames: readonly PredictFrame[], stamped: number): number {
  for (const f of frames) {
    if (f.seq > stamped) {
      world.moveActor(hero, f.dx, f.dy, f.dt);
      stamped = f.seq;
      continue;
    }
    const gait = hero.bodyWalk ? { ...hero.bodyWalk } : undefined;
    world.moveActor(hero, f.dx, f.dy, f.dt);
    hero.bodyWalk = gait;
  }
  return stamped;
}

/** The own hero turns to the aim it sends, as the host turns it, unless a cast or
 *  a lock (`held`: the row's rooted) holds it; then the snapshot's facing stands. */
export function faceOwnAim(hero: Actor, aim: { x: number; y: number } | null, held: boolean): void {
  if (!aim || held || hero.casting) return;
  hero.facing = Math.atan2(aim.y - hero.pos.y, aim.x - hero.pos.x);
}
