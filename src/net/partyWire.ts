// THE PARTY on the wire (docs/design/shard-world.md card 23): the composition
// the shard publishes and the words a client may send. Browser-safe: the desk
// itself lives in server/party.ts.

/** One party as the wire ships it (the snapshot's `parties` rows, on change). */
export interface PartyRow { id: string; leader: string; members: string[] }

/** What a client may ask of its party desk. `seat` names the other party
 *  (the invitee, or the member to kick). */
export type PartyOp = 'invite' | 'accept' | 'decline' | 'leave' | 'kick';

export const PARTY_WIRE_CFG = {
  /** A refusal word's longest reading (the panel's one line). */
  maxWord: 64,
};
