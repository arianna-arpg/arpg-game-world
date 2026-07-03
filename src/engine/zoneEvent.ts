// ---------------------------------------------------------------------------
// ACTIVE ZONE EVENT — the engine-side glue for a running event.
//
// Spawns the event's actors (tagged so it can find them again without a second
// list), ticks them each frame, decides when it's over, and pays out. All of
// its actors are ordinary Actors swept by the normal dead-filter; the event
// itself is transient (re-chosen on every zone entry). It calls back into World
// only through public helpers, and imports `World` as a TYPE — no runtime cycle.
// ---------------------------------------------------------------------------

import { dist, vec, type Vec2 } from '../core/math';
import { FACTIONS } from '../data/monsters';
import type { Actor } from './actor';
import { EVENT_REWARD, type ZoneEventKind } from './events';
import type { World } from './world';

function shortName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

export class ActiveZoneEvent {
  done = false;
  private goal: Vec2 | null = null;
  /** The caravan cart, held directly: once dead it's swept from world.actors,
   *  so re-querying by tag would miss it (and the scavenge drop). */
  private cart: Actor | null = null;

  constructor(
    private world: World,
    readonly kind: ZoneEventKind,
    readonly primary: string,
    readonly secondary: string | null,
  ) {}

  /** Lay the event onto the zone. Sets `done` immediately if it can't form. */
  spawn(camps: Vec2[], pois: Vec2[]): void {
    const w = this.world;
    const level = Math.max(1, w.zone.level);
    const roster = FACTIONS[this.primary];
    if (!roster) { this.done = true; return; }

    if (this.kind === 'patrol') {
      const route = [...camps, ...pois].slice(0, 5);
      if (route.length < 2) { this.done = true; return; }
      const lead = w.spawnEventActor(roster.table, level, 'enemy', this.primary, 'patrol');
      lead.pos = w.clampNear(route[0], 30);
      lead.patrolRoute = route;
      lead.patrolIdx = 0;
      for (let i = 0; i < 3; i++) {
        const f = w.spawnEventActor(roster.table, level, 'enemy', this.primary, 'patrol');
        f.pos = w.clampNear(route[0], 60);
        f.patrolFollow = lead.id;
      }
      w.text(vec(w.player.pos.x, w.player.pos.y - 70), `a ${shortName(this.primary)} patrol`, '#c8b06b', 14);

    } else if (this.kind === 'caravan') {
      const cart = w.spawnEventActor([{ id: 'caravan_cart', weight: 1 }], level, 'player', this.primary, 'caravan');
      cart.pos = w.farFromExit();
      this.goal = w.nearestExitPos(cart.pos);
      if (!this.goal) { this.done = true; return; }
      this.cart = cart;
      for (let i = 0; i < 2; i++) {
        const g = w.spawnEventActor(roster.table, level, 'player', this.primary, 'caravan');
        g.pos = w.clampNear(cart.pos, 50);
        g.owner = cart; // heel to the cart when nothing's attacking
      }
      if (this.secondary) {
        const amb = FACTIONS[this.secondary];
        if (amb) for (let i = 0; i < 4; i++) {
          const a = w.spawnEventActor(amb.table, level, 'enemy', this.secondary, 'ambush');
          a.pos = w.clampNear(this.goal, 150);
        }
      }
      w.text(vec(w.player.pos.x, w.player.pos.y - 70),
        `a ${shortName(this.primary)} caravan — see it through`, '#7ec8a0', 15);

    } else { // siege
      const camp = camps[0];
      const defRoster = this.secondary ? FACTIONS[this.secondary] : undefined;
      if (!camp || !defRoster) { this.done = true; return; }
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const a = w.spawnEventActor(roster.table, level, 'enemy', this.primary, 'siege_atk');
        a.pos = w.clampNear(vec(camp.x + Math.cos(ang) * 220, camp.y + Math.sin(ang) * 220), 30);
      }
      for (let i = 0; i < 4; i++) {
        const d = w.spawnEventActor(defRoster.table, level, 'enemy', this.secondary!, 'siege_def');
        d.pos = w.clampNear(camp, 60);
      }
      w.text(vec(w.player.pos.x, w.player.pos.y - 70),
        `${shortName(this.primary)} besiege ${shortName(this.secondary!)}!`, '#e85050', 15);
    }
  }

  tick(dt: number): void {
    if (this.done) return;
    const w = this.world;
    if (this.kind === 'caravan') {
      const cart = this.cart;
      if (!cart || cart.dead) {
        if (cart) w.dropGemAt(cart.pos);           // scavenge the wreck
        this.cart = null;
        this.end('The caravan was lost.', '#d05050');
        return;
      }
      if (this.goal) {
        w.moveActor(cart, this.goal.x - cart.pos.x, this.goal.y - cart.pos.y, dt * 0.6);
        if (dist(cart.pos, this.goal) < 90) {
          cart.dead = true;                         // it reaches the road and departs
          this.cart = null;
          this.reward(this.primary, 'Caravan delivered!');
        }
      }

    } else if (this.kind === 'patrol') {
      // The patrol was simply faction troops; clearing them ends it quietly.
      if (!w.anyAliveWithTag('patrol', this.primary)) this.done = true;

    } else { // siege
      const attackersLeft = w.anyAliveWithTag('siege_atk', this.primary);
      const defendersLeft = w.anyAliveWithTag('siege_def', this.secondary ?? '');
      if (!attackersLeft && defendersLeft) this.reward(this.secondary!, `Siege broken — ${shortName(this.secondary!)} hold the camp!`);
      else if (!attackersLeft || !defendersLeft) this.done = true; // the camp fell, or both spent
    }
  }

  private reward(faction: string, msg: string): void {
    this.done = true;
    this.world.payEventReward(faction, EVENT_REWARD[this.kind], this.world.player.pos, msg);
  }
  private end(msg: string, color: string): void {
    this.done = true;
    const p = this.world.player.pos;
    this.world.text(vec(p.x, p.y - 60), msg, color, 14);
  }
}
