// ---------------------------------------------------------------------------
// ScriptedInput — a stand-in ally's "controller". It implements the SAME
// PlayerInputSource contract a human or a remote peer does, but COMPUTES the
// intent each frame: follow the local hero, and attack the nearest enemy with
// the primary skill. Because it produces a PlayerInput (not an AI brain), the
// ally flows through World.applyInputs exactly like a real player — proving the
// whole multi-seat path (targeting, downed/revive, shared loot, party strip)
// with zero networking. Swap this for a RemoteInput next milestone.
// ---------------------------------------------------------------------------

import { dist } from '../core/math';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { PlayerInput, PlayerInputSource } from './intent';

const FOLLOW_DIST = 110;   // stay at least this close to the leader
const ENGAGE_RANGE = 260;  // start swinging at an enemy within this range
const STRIKE_GAP = 70;     // close to about this before holding position

export class ScriptedInput implements PlayerInputSource {
  poll(actor: Actor, world: World): PlayerInput | null {
    const leader = world.player;
    const held = new Array(actor.skills.length).fill(false);
    const edge = new Array(actor.skills.length).fill(false);

    // Nearest living enemy (the engine already excludes downed/dead/untargetable).
    let target: Actor | null = null;
    let best = Infinity;
    for (const e of world.enemiesOf(actor)) {
      if (e.passive) continue;
      const d = dist(actor.pos, e.pos);
      if (d < best) { best = d; target = e; }
    }

    let dx = 0, dy = 0;
    let aimX = leader.pos.x, aimY = leader.pos.y;
    if (target && best <= ENGAGE_RANGE) {
      aimX = target.pos.x; aimY = target.pos.y;
      if (best > STRIKE_GAP) { dx = target.pos.x - actor.pos.x; dy = target.pos.y - actor.pos.y; }
      if (actor.skills[0]) held[0] = true; // primary attack
    } else if (dist(actor.pos, leader.pos) > FOLLOW_DIST) {
      dx = leader.pos.x - actor.pos.x; dy = leader.pos.y - actor.pos.y;
    }

    return { dx, dy, aim: { x: aimX, y: aimY }, held, edge };
  }
}

/** A second LOCAL HUMAN seat for single-machine co-op testing — driven by the
 *  ARROW keys (move), with '/' = primary skill and '.' = second skill, auto-aiming
 *  the nearest enemy (one mouse can't serve two players). Lets you verify co-op
 *  movement + casting in ONE tab without a second machine / the WebRTC handshake.
 *  Constructed with the live Input.keys set, so it reads the keyboard each frame. */
export class LocalCoopInput implements PlayerInputSource {
  constructor(private readonly keys: Set<string>) {}
  poll(actor: Actor, world: World): PlayerInput {
    const k = this.keys;
    let dx = 0, dy = 0;
    if (k.has('arrowup')) dy -= 1;
    if (k.has('arrowdown')) dy += 1;
    if (k.has('arrowleft')) dx -= 1;
    if (k.has('arrowright')) dx += 1;
    // Auto-aim the nearest enemy (no second mouse); else aim where we face.
    let target: Actor | null = null, best = Infinity;
    for (const e of world.enemiesOf(actor)) {
      if (e.passive) continue;
      const d = dist(actor.pos, e.pos);
      if (d < best) { best = d; target = e; }
    }
    const aim = target ? { x: target.pos.x, y: target.pos.y }
      : { x: actor.pos.x + Math.cos(actor.facing) * 60, y: actor.pos.y + Math.sin(actor.facing) * 60 };
    const held = new Array(actor.skills.length).fill(false);
    const edge = new Array(actor.skills.length).fill(false);
    if (k.has('/')) held[0] = true;   // primary skill
    if (k.has('.')) held[1] = true;   // second skill
    return { dx, dy, aim, held, edge };
  }
}
