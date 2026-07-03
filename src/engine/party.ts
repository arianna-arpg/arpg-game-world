// ---------------------------------------------------------------------------
// Party — a thin, event-driven VIEW over the player-kind actors in the world.
// It does NOT own the actors (world.actors is the single source of truth); it
// just tracks WHO is in the roster, in stable join order, so the HUD strip has
// a steady list and each member keeps its seat identity. Membership is driven
// entirely off the EventBus (party/join, party/leave), so any future member
// kind (a co-op join, a hired mercenary, a summoned minion sub-row) appears
// here for free the moment its spawn site emits the event.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { World } from './world';

export interface PartyMember {
  actor: Actor;
  /** Seat id ('p0' local/host, 'p1'… co-op). Matches DeathRecord.owner. */
  seat: string;
  /** This client's own hero (the camera/input anchor). */
  local: boolean;
}

export class Party {
  readonly members: PartyMember[] = [];

  constructor(world: World) {
    world.events.on('party/join', ({ actor, seat }) => this.add(actor, seat));
    world.events.on('party/leave', ({ actor }) => this.remove(actor));
  }

  private add(actor: Actor, seat: string): void {
    if (this.members.some(m => m.actor === actor)) return;
    this.members.push({ actor, seat, local: seat === 'p0' });
  }

  private remove(actor: Actor): void {
    const i = this.members.findIndex(m => m.actor === actor);
    if (i !== -1) this.members.splice(i, 1);
  }

  /** Player-kind actors in join order — the render strip's backing list. */
  get strip(): Actor[] { return this.members.map(m => m.actor); }
}
