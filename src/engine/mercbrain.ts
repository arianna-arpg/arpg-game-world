// ---------------------------------------------------------------------------
// MERC BRAIN — a hired blade's "controller".
//
// A mercenary is a co-op SEAT: it produces a PlayerInput (never touches the
// sim directly) and flows through World.applyInputs like any human — same
// targeting, same costs, same cooldowns, same downed/revive rails. This file
// only decides WHAT a hireling would press; everything it presses is validated
// by the one skill pipeline, so an unaffordable or cooling skill is a no-op,
// never a cheat.
//
// The intelligence deliberately keys off the seat's OWN BAR, not a script:
// a veteran (a retired player character) arrives with the build its player
// left in it — auras, summons, channels, movement oddities — and the cadence
// press walks THAT bar. This is where "strange gameplay loops based on how
// the player had built them" comes from; sharpening it is tuning MERC_BRAIN
// (or swapping this input source per-template), not rewriting the seat.
// ---------------------------------------------------------------------------

import { dist } from '../core/math';
import { MERC_CFG } from '../meta/mercs';
import type { Actor } from './actor';
import type { World } from './world';
import type { PlayerInput, PlayerInputSource } from '../net/intent';

/** Feel knobs for the hireling controller — one place, tune freely. */
export const MERC_BRAIN = {
  followDist: 120,        // stay within this of the patron when idle
  engageRange: 420,       // pick fights this close to itself
  leashRange: 760,        // …but never chase beyond this from the patron
  strikeGapMelee: 62,     // close to about here before planting
  strikeGapRanged: 230,   // ranged builds hold a longer line
  rangedCastRange: 200,   // primary castRange ≥ this ⇒ treat as a ranged build
  altCastSec: 2.4,        // cadence for trying a NON-primary bar slot
  reviveStandoff: 46,     // stand this close to a downed patron (idle = dwell)
} as const;

export class MercInput implements PlayerInputSource {
  private altTimer = MERC_BRAIN.altCastSec * 0.5; // first flourish comes early
  private altSlot = 1;

  poll(actor: Actor, world: World, dt: number): PlayerInput | null {
    const patron = world.player;
    const held = new Array<boolean>(actor.skills.length).fill(false);
    const edge = new Array<boolean>(actor.skills.length).fill(false);
    this.altTimer -= dt;

    // PRIORITY 0 — the patron is DOWN: get to them and STAND. A still, close
    // ally is exactly what updateDownedSeats' revive dwell reads; the same
    // rails a human co-op partner uses (MERC_CFG.mercsCanRevive lever).
    if (patron.downed && MERC_CFG.mercsCanRevive) {
      const d = dist(actor.pos, patron.pos);
      if (d > MERC_BRAIN.reviveStandoff) {
        return {
          dx: patron.pos.x - actor.pos.x, dy: patron.pos.y - actor.pos.y,
          aim: { x: patron.pos.x, y: patron.pos.y }, held, edge,
        };
      }
      return { dx: 0, dy: 0, aim: { x: patron.pos.x, y: patron.pos.y }, held, edge };
    }

    // Nearest live foe (the engine's enemy view already excludes the dead).
    let target: Actor | null = null;
    let best = Infinity;
    for (const e of world.enemiesOf(actor)) {
      if (e.passive || e.untargetable) continue;
      const d = dist(actor.pos, e.pos);
      if (d < best) { best = d; target = e; }
    }

    // TAUNTED: a live taunt drags the merc's blade to the taunter — the
    // same contract every AI actor honors (mercs sit a player seat, but
    // the challenge fabric doesn't care whose hands are on the reins).
    const ts = actor.statuses.find(s => s.id === 'taunted' && s.casterId !== undefined);
    const drawn = ts ? world.actorById(ts.casterId!) : undefined;
    if (drawn && !drawn.dead && !drawn.untargetable && world.hostileTo(actor, drawn)) {
      target = drawn;
      best = dist(actor.pos, drawn.pos);
    }

    // PRIORITY 1 — a fight in reach (and inside the patron leash): approach to
    // the build's preferred gap, hold the primary, and on a cadence flourish
    // ONE other bar slot — the pipeline validates cost/cooldown, so a wrong
    // press is a no-op and a right one is the build expressing itself.
    const leashed = target && dist(target.pos, patron.pos) <= MERC_BRAIN.leashRange;
    if (target && best <= MERC_BRAIN.engageRange && leashed) {
      const primary = actor.skills[0];
      const ranged = (primary?.def.targeting?.castRange ?? 0) >= MERC_BRAIN.rangedCastRange;
      const gap = ranged ? MERC_BRAIN.strikeGapRanged : MERC_BRAIN.strikeGapMelee;
      let dx = 0, dy = 0;
      if (best > gap) { dx = target.pos.x - actor.pos.x; dy = target.pos.y - actor.pos.y; }
      // Swing only INSIDE reach — a held attack roots its own cast, so pressing
      // from outside the gap whiffs air forever and never closes the distance.
      if (primary) held[0] = best <= gap + 10;
      if (this.altTimer <= 0) {
        this.altTimer = MERC_BRAIN.altCastSec;
        // Walk the bar round-robin (not random) so every slot of the build
        // gets its turn — summons stay raised, auras come up, curses land.
        for (let tries = 0; tries < actor.skills.length; tries++) {
          this.altSlot = 1 + ((this.altSlot) % Math.max(1, actor.skills.length - 1));
          if (actor.skills[this.altSlot]) { edge[this.altSlot] = true; break; }
        }
      }
      return { dx, dy, aim: { x: target.pos.x, y: target.pos.y }, held, edge };
    }

    // PRIORITY 2 — heel: drift back to the patron's shoulder.
    if (dist(actor.pos, patron.pos) > MERC_BRAIN.followDist) {
      return {
        dx: patron.pos.x - actor.pos.x, dy: patron.pos.y - actor.pos.y,
        aim: { x: patron.pos.x, y: patron.pos.y }, held, edge,
      };
    }
    return { dx: 0, dy: 0, aim: { x: patron.pos.x, y: patron.pos.y }, held, edge };
  }
}
