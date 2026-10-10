// ---------------------------------------------------------------------------
// THE MUSTER RING (shard M1, W4; card 15 B, RULED 2026-10-08 for parties and
// its detail RULED 2026-10-10): a party's road waits at a ring until the party
// stands on it; independents travel alone. This file is the engine half and
// stays browser-safe (no node imports): the road a seat offers its party's
// muster (THE SHARD SCANNER's finished dwell, engine/shardRoads.ts), the drawn
// row a hosted world publishes into each unit (World.musterRings, HOST class)
// and ships on the snapshot (`mu`), and the painter's one party read. The desk
// that raises, judges and fires the rings is the host's (server/muster.ts,
// MUSTER_CFG); the painter is the renderer's (drawMusterRings, MUSTER_CUE).
//
// Off a shard nothing here runs: no World but a hosted one ever carries a
// ring, and a snapshot with none ships no `mu` key (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { RoadTicket } from './shardUnits';
import type { Seat, World } from './world';

/** A travel road a seat finished dwelling, offered to its party's muster
 *  before it moves anyone: the road's identity and spot, and its ticket maker
 *  for ANY seat (the muster fires it once per member standing on the ring,
 *  each with its own door and ladder). */
export interface MusterRoad {
  /** The scanner's dwell key (one road of the zone). */
  key: string;
  /** The road's transit kind (`zone_exit`, `sidezone:<kind>`, `realm_gate:<kind>`). */
  kind: string;
  /** Where the road stands: the ring's centre. */
  pos: Vec2;
  make: (seat: Seat) => RoadTicket | null;
}

/** THE MUSTER RING as drawn (World.musterRings; the snapshot's `mu` row, unit
 *  wide): the ring's centre and radius, its party, the members standing on it
 *  out of the members standing in the unit, and the wait left out of the whole. */
export interface MusterRingRow {
  x: number;
  y: number;
  r: number;
  party: string;
  have: number;
  need: number;
  left: number;
  wait: number;
}

/** The painter's party read: does this ring wait for the viewer's own party
 *  (her gold) or a stranger's (faint)? The viewer is the client's own seat id;
 *  the parties are the rows the host ships (World.partyRows). */
export function musterRingIsOwn(world: World, row: MusterRingRow): boolean {
  const me = world.clientSeatId;
  return !!world.partyRows?.some(p => p.id === row.party && p.members.includes(me));
}
