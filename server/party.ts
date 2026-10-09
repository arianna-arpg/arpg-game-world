// THE PARTY (docs/design/shard-world.md card 23 — her word 2026-10-08/09): the
// explicit social unit on a hosted world, "our co-op mechanic made explicit".
// Players are independent neighbors until they GROUP; a group is the unit
// that restores co-op's semantics among its members:
//   THE GROUP LAW (card 14, clarified): inside a party a lethal down is
//                a DOWN — a nearby player may kneel and revive — and the
//                covenant fells the downed only when no member of the party
//                stands (THE PARTY WIPE); outside one, every lethal down is
//                the death (VesselDesk.covenantDue reads partyOf).
//   THE DUE      XP pays the killer's party within the near radius, never a
//                passing stranger (World.grantXp's `to` is the party's seats).
//   THE LEADER   exists for kicks and the muster only; any member may invite.
//   THE INVITE   stands PARTY_CFG.inviteSec; an invitee is seated, ungrouped
//                and not already asked; accepting joins under the member cap.
//   THE DISSOLVE a party of one dissolves; a leaving leader hands the lead
//                to the eldest member; a seat that falls or leaves the world
//                leaves its party and every invite it holds.
// This desk is PURE registry state: no world, no wire — ShardHost owns the
// session messages, the snapshot ships each seat's party, VesselDesk reads
// the membership. Every mutation returns a refusal word or null.

export const PARTY_CFG = {
  /** Members per party, the leader included. */
  maxMembers: 6,
  /** How long an invite stands before it lapses (world seconds). */
  inviteSec: 60,
};

export interface Party {
  id: string;
  leader: string;
  /** Seat ids, the leader first, then by join order. */
  members: string[];
}

export interface PartyInvite {
  party: string;
  from: string;
  /** World time the invite lapses. */
  until: number;
}

import type { PartyRow } from '../src/net/partyWire';

export type PartyRefusal =
  | 'not seated' | 'already grouped' | 'already asked' | 'no such party' | 'party full'
  | 'no invite' | 'not a member' | 'not the leader' | 'cannot invite yourself' | 'invite lapsed';

export class PartyDesk {
  private parties = new Map<string, Party>();
  private bySeat = new Map<string, string>();
  /** Standing invites, keyed by the INVITEE's seat. */
  private invites = new Map<string, PartyInvite>();
  private serial = 0;
  /** Bumped on every change: the wire's change beat. */
  rev = 0;

  constructor(private readonly seated: (seatId: string) => boolean) {}

  partyOf(seatId: string): Party | null {
    const id = this.bySeat.get(seatId);
    return id ? this.parties.get(id) ?? null : null;
  }
  /** The seat's party mates, itself included (a lone seat is its own unit). */
  membersOf(seatId: string): readonly string[] {
    return this.partyOf(seatId)?.members ?? [seatId];
  }
  inviteFor(seatId: string): PartyInvite | null { return this.invites.get(seatId) ?? null; }
  rows(): PartyRow[] { return [...this.parties.values()].map(p => ({ id: p.id, leader: p.leader, members: [...p.members] })); }

  /** Any member may invite; an ungrouped inviter founds a party on the spot. */
  invite(from: string, to: string, now: number): PartyRefusal | null {
    if (from === to) return 'cannot invite yourself';
    if (!this.seated(from) || !this.seated(to)) return 'not seated';
    if (this.bySeat.has(to)) return 'already grouped';
    const standing = this.invites.get(to);
    if (standing && standing.until > now) return 'already asked';
    let party = this.partyOf(from);
    if (!party) party = this.found(from);
    if (party.members.length >= PARTY_CFG.maxMembers) return 'party full';
    this.invites.set(to, { party: party.id, from, until: now + PARTY_CFG.inviteSec });
    this.rev++;
    return null;
  }

  accept(to: string, now: number): PartyRefusal | null {
    const inv = this.invites.get(to);
    if (!inv) return 'no invite';
    this.invites.delete(to);
    this.rev++;
    if (inv.until <= now) return 'invite lapsed';
    if (!this.seated(to)) return 'not seated';
    if (this.bySeat.has(to)) return 'already grouped';
    const party = this.parties.get(inv.party);
    if (!party) return 'no such party';
    if (party.members.length >= PARTY_CFG.maxMembers) return 'party full';
    party.members.push(to);
    this.bySeat.set(to, party.id);
    return null;
  }

  decline(to: string): PartyRefusal | null {
    if (!this.invites.delete(to)) return 'no invite';
    this.rev++;
    return null;
  }

  /** Leave one's party (THE DISSOLVE rules apply). */
  leave(seatId: string): PartyRefusal | null {
    const party = this.partyOf(seatId);
    if (!party) return 'not a member';
    this.remove(party, seatId);
    return null;
  }

  kick(leader: string, member: string): PartyRefusal | null {
    const party = this.partyOf(leader);
    if (!party) return 'not a member';
    if (party.leader !== leader) return 'not the leader';
    if (!party.members.includes(member) || member === leader) return 'not a member';
    this.remove(party, member);
    return null;
  }

  /** A seat gone from the world (a leave, a fall): out of its party and its invites. */
  dropSeat(seatId: string): void {
    const party = this.partyOf(seatId);
    if (party) this.remove(party, seatId);
    if (this.invites.delete(seatId)) this.rev++;
    for (const [to, inv] of [...this.invites]) if (inv.from === seatId) { this.invites.delete(to); this.rev++; }
  }

  /** Lapsed invites fall away on the host's clock. */
  sweep(now: number): void {
    for (const [to, inv] of [...this.invites]) if (inv.until <= now) { this.invites.delete(to); this.rev++; }
  }

  private found(leader: string): Party {
    const party: Party = { id: `g${(++this.serial).toString(36)}`, leader, members: [leader] };
    this.parties.set(party.id, party);
    this.bySeat.set(leader, party.id);
    this.rev++;
    return party;
  }

  private remove(party: Party, seatId: string): void {
    party.members = party.members.filter(m => m !== seatId);
    this.bySeat.delete(seatId);
    if (party.members.length <= 1) {
      // THE DISSOLVE: a party of one is no party.
      for (const m of party.members) this.bySeat.delete(m);
      this.parties.delete(party.id);
      for (const [to, inv] of [...this.invites]) if (inv.party === party.id) this.invites.delete(to);
    } else if (party.leader === seatId) {
      party.leader = party.members[0]; // THE LEADER passes to the eldest member
    }
    this.rev++;
  }
}
