// ---------------------------------------------------------------------------
// THE MUSTER RING (shard M1, W4; docs/design/shard-m1-plan.md 4.6, card 15 B:
// RULED 2026-10-08 "a party's road waits for the party at a visible muster
// ring; two independent players in one place are never moved together", its
// detail RULED 2026-10-10 as these dials). The host half, the party desk's
// sibling: the rings stand here, the engine only draws them
// (engine/shardMuster.ts, World.musterRings, the snapshot's `mu` row).
//
//   THE RAISE    a party member's finished travel road (an exit, a cave mouth,
//                a realm gate: THE SHARD SCANNER's) waits at a ring on the
//                road when another member of its party stands, undowned, in
//                the same unit; an independent, or a party alone in its unit,
//                travels at once. MUSTER_CFG.raise: 'any' member raises it, or
//                the 'leader' alone (a non-leader's road then takes that seat
//                alone: card 8 A's free movement). One ring per party per unit.
//   THE WAIT     the ring fires the moment every member standing in its unit
//                stands inside it (at once if they already do), else at
//                MUSTER_CFG.waitSec with whoever stands inside it; the rest stay
//                where they are and take the road on their own later (into the
//                same unit: shared tenancy; or the party's own instance). Downed
//                and dormant members never block it; members in other units are
//                never waited for. While it stands, the party's members in the
//                unit take no road of their own: standing on it is joining it.
//   THE LAPSE    the raiser walking off it (or falling, or leaving the unit),
//                the party dissolving or the raiser leaving it, the unit gone.
//   THE FIRE     one ticket per member on the ring, each made by the road
//                itself for that member (its own door, its own ladder), all
//                drained the same tick, so the party arrives together, side by
//                side (MUSTER_CFG.landSpreadPx), in one unit (a party pocket:
//                the party's own instance).
//
// Shown, never told: a ring on the ground whose wash fills with the gathered
// share and whose rim closes with the wait left, gold for the viewer's party
// and faint for a stranger's (renderer drawMusterRings, MUSTER_CUE). No word.
// ---------------------------------------------------------------------------

import type { Seat, World } from '../src/engine/world';
import type { MusterRingRow, MusterRoad } from '../src/engine/shardMuster';
import { entryLanding, type LandingSpot, type RoadLanding } from '../src/engine/shardUnits';
import type { SimUnit, UnitRegistry } from './simUnits';
import type { PartyDesk } from './party';

/** The muster's dials (card 15 B's detail, RULED 2026-10-10; docs/engine/shard.md "Dials"). */
export const MUSTER_CFG = {
  /** Who may raise a ring: 'any' member's road, or the 'leader''s alone. */
  raise: 'any' as 'any' | 'leader',
  /** The ring's radius around the road it waits at (px): standing inside it is
   *  standing on it. */
  radiusPx: 400,
  /** Seconds a ring waits for the whole party before it moves whoever stands on it. */
  waitSec: 20,
  /** How far apart the party lands (px): each member after the first stands
   *  this far out along a golden-angle spiral from the road's own landing. */
  landSpreadPx: 36,
};

/** One standing ring: a party's road waiting in one unit. */
interface Ring {
  party: string;
  unit: SimUnit;
  /** The unit's zone when it was raised (a unit that changed zones lapses it). */
  zoneId: string;
  raiser: string;
  road: MusterRoad;
  raisedAt: number;
}

export interface MusterHooks {
  /** A seat that counts for the muster: alive, undowned, not dormant. */
  standing(seat: Seat): boolean;
  log(line: string): void;
}

/** The golden angle: successive landings never stack on one bearing. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** THE FIRE's landing: the road's own landing, resolved in the destination,
 *  then the member's slot out along the spiral (the landing law clamps it). */
function spreadLanding(inner: RoadLanding | undefined, from: string | null, slot: number): RoadLanding {
  return (w: World): LandingSpot => {
    const spot = typeof inner === 'function' ? inner(w) : inner ?? 'entry';
    const base = spot === 'entry' ? { at: entryLanding(w, from) } : spot;
    const ang = slot * GOLDEN, r = MUSTER_CFG.landSpreadPx * Math.sqrt(slot);
    return { ...base, at: { x: base.at.x + Math.cos(ang) * r, y: base.at.y + Math.sin(ang) * r } };
  };
}

export class MusterDesk {
  /** The standing rings, keyed `${party}@${unit}`. */
  private readonly rings = new Map<string, Ring>();
  /** Ledgers since boot (the status page's and the probe's read). */
  raised = 0;
  fired = 0;
  lapsed = 0;
  moved = 0;

  constructor(private readonly units: UnitRegistry, private readonly parties: PartyDesk, private readonly hooks: MusterHooks) {}

  get size(): number { return this.rings.size; }

  /** THE RAISE (ShardWorldLink.muster, inside the seat's unit's run): true when
   *  the road waits at its party's ring, false when the seat travels alone now. */
  offer(seat: Seat, road: MusterRoad): boolean {
    const party = this.parties.partyOf(seat.id);
    if (!party) return false; // an independent travels alone
    const u = this.units.unitOf(seat.id);
    if (!u) return false;
    const key = `${party.id}@${u.key}`;
    if (this.rings.has(key)) return true; // the party's ring stands here: its road is the ring's
    if (MUSTER_CFG.raise === 'leader' && party.leader !== seat.id) return false; // card 8 A: a non-leader goes alone
    if (!this.standingIn(party.members, u).some(s => s.id !== seat.id)) return false; // nobody here to wait for
    this.rings.set(key, { party: party.id, unit: u, zoneId: u.world.zone.id, raiser: seat.id,
      road: { ...road, pos: { x: road.pos.x, y: road.pos.y } }, raisedAt: u.world.time });
    this.raised++;
    return true;
  }

  /** ShardWorldLink.mustering: a ring of this seat's party stands in its unit. */
  mustering(seatId: string): boolean {
    if (!this.rings.size) return false;
    const party = this.parties.partyOf(seatId);
    const u = party ? this.units.unitOf(seatId) : undefined;
    return !!party && !!u && this.rings.has(`${party.id}@${u.key}`);
  }

  /** THE WAIT, THE LAPSE and THE FIRE, after every unit ticked and before THE
   *  HAND-OFF QUEUE drains (so a fired party travels this very tick); then the
   *  rings standing are published into every unit for the wire. */
  judge(now: number): void {
    for (const [key, ring] of [...this.rings]) {
      const verdict = this.verdict(ring, now);
      if (verdict === 'stand') continue;
      this.rings.delete(key);
      if (verdict === 'lapse') { this.lapsed++; continue; }
      this.fire(ring, verdict);
    }
    this.publish(now);
  }

  /** THE STATUS PAGE's rings. */
  status(now: number): Record<string, unknown>[] {
    return [...this.rings.values()].map(r => {
      const { standing, on } = this.count(r);
      return { party: r.party, unit: r.unit.key, road: r.road.key, raiser: r.raiser, have: on.length, need: standing.length,
        leftSec: +Math.max(0, MUSTER_CFG.waitSec - (now - r.raisedAt)).toFixed(1) };
    });
  }

  // ---- internals ------------------------------------------------------------
  /** The party's members standing in a unit, in the party's own order. */
  private standingIn(members: readonly string[], u: SimUnit): Seat[] {
    const out: Seat[] = [];
    for (const id of members) {
      const s = u.world.seats.find(x => x.id === id && !x.keeper);
      if (s && this.hooks.standing(s)) out.push(s);
    }
    return out;
  }
  private inside(seat: Seat, ring: Ring): boolean {
    const p = seat.actor.pos;
    return Math.hypot(p.x - ring.road.pos.x, p.y - ring.road.pos.y) <= MUSTER_CFG.radiusPx;
  }
  /** The members standing in the ring's unit, and those standing on the ring. */
  private count(ring: Ring): { standing: Seat[]; on: Seat[] } {
    const party = this.parties.partyOf(ring.raiser);
    const standing = party && party.id === ring.party ? this.standingIn(party.members, ring.unit) : [];
    return { standing, on: standing.filter(s => this.inside(s, ring)) };
  }

  private verdict(ring: Ring, now: number): 'stand' | 'lapse' | Seat[] {
    const u = ring.unit;
    if (this.units.unit(u.key) !== u || u.broken || u.world.zone.id !== ring.zoneId) return 'lapse'; // its ground is gone
    const party = this.parties.partyOf(ring.raiser);
    if (!party || party.id !== ring.party) return 'lapse'; // the party dissolved, or its raiser left it
    const raiser = u.world.seats.find(s => s.id === ring.raiser && !s.keeper);
    if (!raiser || !this.hooks.standing(raiser) || !this.inside(raiser, ring)) return 'lapse'; // the raiser walked off it
    const { standing, on } = this.count(ring);
    if (on.length < standing.length && now - ring.raisedAt < MUSTER_CFG.waitSec) return 'stand';
    // Every member standing here stands on it, or the wait ran out: whoever stands on it goes, the raiser first.
    return [raiser, ...on.filter(s => s !== raiser)];
  }

  /** One ticket per member on the ring, each made by the road for that member
   *  inside the ring's unit (under its pin), queued for this tick's drain. */
  private fire(ring: Ring, members: Seat[]): void {
    let slot = 0;
    for (const seat of members) {
      const t = this.units.run(ring.unit, () => ring.road.make(seat));
      if (!t) continue;
      t.muster = { party: ring.party, slot };
      if (slot > 0) t.landing = spreadLanding(t.landing, t.from === undefined ? ring.zoneId : t.from, slot);
      this.units.enqueue(t);
      slot++;
    }
    this.fired++;
    this.moved += slot;
    this.hooks.log(`[shard] the muster of ${ring.party} fired at ${ring.road.key} in ${ring.unit.key}: ${slot} member(s) travel together`);
  }

  /** The rings as drawn, into every unit's World (null where none stands). */
  private publish(now: number): void {
    const rows = new Map<SimUnit, MusterRingRow[]>();
    for (const ring of this.rings.values()) {
      const { standing, on } = this.count(ring);
      const row: MusterRingRow = {
        x: Math.round(ring.road.pos.x), y: Math.round(ring.road.pos.y), r: MUSTER_CFG.radiusPx, party: ring.party,
        have: on.length, need: standing.length,
        left: Math.round(Math.max(0, MUSTER_CFG.waitSec - (now - ring.raisedAt)) * 10) / 10, wait: MUSTER_CFG.waitSec,
      };
      const list = rows.get(ring.unit);
      if (list) list.push(row); else rows.set(ring.unit, [row]);
    }
    for (const u of this.units.each()) {
      const r = rows.get(u) ?? null;
      if (r || u.world.musterRings) u.world.musterRings = r;
    }
  }
}
