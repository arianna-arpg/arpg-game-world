// ---------------------------------------------------------------------------
// ACTIVE ZONE EVENT — the GENERIC engine-side runner for one on-entry event.
//
// It no longer knows any kind by name: the registered ZoneEventDef (see
// engine/events.ts) supplies spawn() and tick(); this runner supplies the
// lifecycle (done flag, the per-kind scratch bag, the reward/end verbs) and
// the World bridge. All of an event's actors are ordinary Actors swept by the
// normal dead-filter; the event itself is transient (re-chosen on every zone
// entry). It calls back into World only through public helpers, and imports
// `World` as a TYPE — no runtime cycle. Adding a new kind touches ONLY the
// registry — this file never grows another branch.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import { ZONE_EVENT_CFG, zoneEventDef, type ZoneEventRun } from './events';
import type { World } from './world';

export class ActiveZoneEvent implements ZoneEventRun {
  done = false;
  /** Per-kind scratch (a siege stashes its rosters here) — the def owns
   *  the shape; the runner just carries it. */
  data: Record<string, unknown> = {};

  constructor(
    private world: World,
    readonly kind: string,
    readonly primary: string,
    readonly secondary: string | null,
  ) {}

  /** Lay the event onto the zone. Sets `done` immediately if it can't form
   *  (or if its kind was unregistered — a stale choice is a no-op). */
  spawn(camps: Vec2[], pois: Vec2[]): void {
    const def = zoneEventDef(this.kind);
    if (!def) { this.done = true; return; }
    def.spawn(this.world, this, { camps, pois });
  }

  tick(dt: number): void {
    if (this.done) return;
    const def = zoneEventDef(this.kind);
    if (!def) { this.done = true; return; }
    def.tick(this.world, this, dt);
  }

  /** Pay the def's reward row and end (the ZoneEventRun verb). */
  reward(faction: string, msg: string): void {
    this.done = true;
    const def = zoneEventDef(this.kind);
    if (!def) return;
    this.world.payEventReward(faction, def.reward, this.world.player.pos, msg);
  }

  /** End without reward (the ZoneEventRun verb). */
  end(msg: string, color: string): void {
    this.done = true;
    const p = this.world.player.pos;
    this.world.text(vec(p.x, p.y + ZONE_EVENT_CFG.endDy), msg, color, 14);
  }
}
