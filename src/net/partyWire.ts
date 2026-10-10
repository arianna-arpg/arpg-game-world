// THE PARTY on the wire (docs/design/shard-world.md card 23): the composition
// the shard publishes and the words a client may send. Browser-safe: the desk
// itself lives in server/party.ts.

/** One party as the wire ships it (the snapshot's `parties` rows, on change). `held` names
 *  the fallen members whose places wait for their next vessel (THE HELD PLACE); absent = none. */
export interface PartyRow {
  id: string; leader: string; members: string[]; held?: string[];
  /** THE SPOILS' OWNER (card 27, net/spoils.ts): the party's drop rule, its timer and its
   *  allocation, shown to every member (the panel's drop-rule row); the desk always ships them. */
  rule?: import('./spoils').DropRuleKind; freeAfterSec?: number; allocation?: import('./spoils').DropAllocation;
}

/** What a client may ask of its party desk. `seat` names the other party
 *  (the invitee, or the member to kick). THE SPOILS' OWNER: 'rule' (the leader alone) sets
 *  the drop rule and/or the allocation the word carries. */
export type PartyOp = 'invite' | 'accept' | 'decline' | 'leave' | 'kick' | 'rule';

export const PARTY_WIRE_CFG = {
  /** A refusal word's longest reading (the panel's one line). */
  maxWord: 64,
  /** THE NEAR LAW's radius on a hosted world, in px: the shard sets COOP_SCALING.shareRadius
   *  to it at boot (SHARD_CFG.nearRadius reads it), and THE PARTY PANEL lists the players
   *  within it of the viewer as "near you": one number both halves of the wire read. */
  nearRadius: 1600,
};

/** THE PARTY THAT READS (the invite tell): an invitation that landed on this client
 *  (session `partyInvite`), standing until `until` on the shard's world clock. */
export interface PartyInviteNote { from: string; name: string; party?: string; until: number }

/** THE PARTY THAT READS (THE REVIVE ROW, SeatW.rv, THE OWN ENTRY): the down a seat reads.
 *  Its own while it lies downed; else the downed body in its revive reach (`k`); else a party
 *  mate's down its own standing holds (THE GROUP LAW's reach). Hosted worlds alone. */
export interface ReviveW {
  /** The downed seat this row reads (the client's own id while it lies downed). */
  s: string;
  /** The downed body's position, rounded (the pooled body's own wins when it rides the wire). */
  p: [number, number];
  /** The revive's fill, 0..1 (floored, 2dp): the best kneeler's dwell, or THE MERCY's clock. */
  f: number;
  /** THE BLEED-OUT: seconds left (1dp) and the clock's whole length; absent = no clock runs. */
  l?: number; lt?: number;
  /** THE WIPE RADIUS, SHOWN: THE NEAR LAW's radius while a mate's standing holds the down, and
   *  the seats whose standing holds it; absent = nothing holds it. */
  r?: number; h?: string[];
  /** This seat stands in the revive's reach: its knee fills the ring (the ring and the cue). */
  k?: 1;
}

/** THE PARTY THAT READS (keeperSeat lane): the vessel desk's read of a downed seat, as the
 *  serializer asks it (server/vessel.ts VesselDesk.downView). */
export interface DownView {
  /** THE BLEED-OUT: seconds left and the clock's length (absent = no clock runs). */
  left?: number; total?: number;
  /** The seats whose standing holds the down (THE GROUP LAW's mates within reach). */
  holders: string[];
  /** THE NEAR LAW's radius the hold reads. */
  radius: number;
}

/** THE PARTY THAT READS (keeperSeat lane, installed by the shard on every World it runs):
 *  THE RELEASE, the wait's end and the down's read. Absent off a hosted world. */
export interface PartyDowns {
  /** THE RELEASE: a downed seat's interact press gives up the wait; true = the press was taken. */
  release(seatId: string): boolean;
  /** The wait on mates is over (released, or THE BLEED-OUT ran out): THE MERCY no longer waits. */
  waitEnded(seatId: string): boolean;
  /** A downed seat's read (null for a standing one). */
  view(seatId: string): DownView | null;
}
