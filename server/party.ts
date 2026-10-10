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
//                and not already asked; accepting joins the inviter's party
//                under the member cap. THE PARTY FOUNDS ON ACCEPT (THE PARTY
//                THAT READS): an invite founds nothing; the party exists when
//                the first accept lands (the inviter leading), so a decline
//                or a lapse leaves no party of one behind and the inviter
//                stays an ungrouped neighbour every other player may ask.
//   THE DISSOLVE a party keeping one place or none dissolves; a leaving
//                leader hands the lead to the eldest member; a seat that
//                leaves the world leaves its party and every invite it holds.
//   THE HELD PLACE (THE PARTY SURVIVES A DEATH): a member that FALLS leaves a
//                place held for PARTY_CFG.rejoinSec, keyed by its account
//                (else by its seat: the same connection's class pick); the
//                account's next seat inside the window takes it back on its
//                join, and THE DISSOLVE counts held places beside seats, so a
//                death never breaks a party of two.
// This desk is PURE registry state: no world, no wire — ShardHost owns the
// session messages, the snapshot ships each seat's party, VesselDesk reads
// the membership. Every mutation returns a refusal word or null.

export const PARTY_CFG = {
  /** Places per party (seats and held places), the leader included. */
  maxMembers: 6,
  /** How long an invite stands before it lapses (world seconds). */
  inviteSec: 60,
  /** THE HELD PLACE: how long a fallen member's place waits for its account's
   *  next seat (world seconds); past it the place is gone. 0 = no place is held. */
  rejoinSec: 120,
};

export interface Party {
  id: string;
  leader: string;
  /** Seat ids, the leader first, then by join order. */
  members: string[];
  /** THE HELD PLACE: fallen members' places, each waiting on its account's next seat. */
  held: HeldPlace[];
}

/** A fallen member's place (THE HELD PLACE). */
export interface HeldPlace {
  /** The fallen seat: a `rejoin` on the same connection re-seats under its id. */
  seat: string;
  /** The account it named at its join: a new connection re-binds by it. */
  account?: string;
  /** The name it wore (the panel's dim row). */
  name: string;
  /** World time the place lapses. */
  until: number;
}

export interface PartyInvite {
  /** The inviter's party when it asked; absent = the inviter walked alone (the accept founds). */
  party?: string;
  from: string;
  /** World time the invite lapses (it rides the wire: the client drops it then). */
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
  /** THE HELD PLACE: the account each standing seat named at its join (a fall keys its place by it). */
  private accounts = new Map<string, string>();
  private serial = 0;
  /** Bumped on every change: the wire's change beat. */
  rev = 0;

  constructor(private readonly seated: (seatId: string) => boolean) {}

  partyOf(seatId: string): Party | null {
    const id = this.bySeat.get(seatId);
    return id ? this.parties.get(id) ?? null : null;
  }
  /** The seat's party mates, itself included (a lone seat is its own unit). Held places are
   *  no mates: a fallen member kneels for no one and holds no down. */
  membersOf(seatId: string): readonly string[] {
    return this.partyOf(seatId)?.members ?? [seatId];
  }
  inviteFor(seatId: string): PartyInvite | null { return this.invites.get(seatId) ?? null; }
  /** Every party a seat stands in (one standing on held places alone has no one to show it to). */
  rows(): PartyRow[] {
    const out: PartyRow[] = [];
    for (const p of this.parties.values()) {
      if (!p.members.length) continue;
      out.push({ id: p.id, leader: p.leader, members: [...p.members], ...(p.held.length ? { held: p.held.map(h => h.name) } : {}) });
    }
    return out;
  }

  /** Any member may invite; an ungrouped inviter founds nothing yet (THE PARTY FOUNDS ON ACCEPT). */
  invite(from: string, to: string, now: number): PartyRefusal | null {
    if (from === to) return 'cannot invite yourself';
    if (!this.seated(from) || !this.seated(to)) return 'not seated';
    if (this.bySeat.has(to)) return 'already grouped';
    const standing = this.invites.get(to);
    if (standing && standing.until > now) return 'already asked';
    const party = this.partyOf(from);
    if (party && this.places(party) >= PARTY_CFG.maxMembers) return 'party full';
    this.invites.set(to, { ...(party ? { party: party.id } : {}), from, until: now + PARTY_CFG.inviteSec });
    this.rev++;
    return null;
  }

  /** The invitee joins the INVITER's party as it stands at the accept; an inviter still
   *  walking alone founds one here and leads it (THE PARTY FOUNDS ON ACCEPT). */
  accept(to: string, now: number): PartyRefusal | null {
    const inv = this.invites.get(to);
    if (!inv) return 'no invite';
    this.invites.delete(to);
    this.rev++;
    if (inv.until <= now) return 'invite lapsed';
    if (!this.seated(to) || !this.seated(inv.from)) return 'not seated';
    if (this.bySeat.has(to)) return 'already grouped';
    let party = this.partyOf(inv.from);
    if (party && this.places(party) >= PARTY_CFG.maxMembers) return 'party full';
    party ??= this.found(inv.from);
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

  /** A seat gone from the world WITHOUT a death (a leave, a dormancy run out): out of its
   *  party and its invites. A place held under this seat alone (no account) goes with it:
   *  its connection is gone, so nothing can re-seat it. */
  dropSeat(seatId: string): void {
    const party = this.partyOf(seatId);
    if (party) this.remove(party, seatId);
    this.dropInvites(seatId);
    this.accounts.delete(seatId);
    for (const p of [...this.parties.values()]) {
      const n = p.held.length;
      p.held = p.held.filter(h => h.account !== undefined || h.seat !== seatId);
      if (p.held.length !== n) { this.rev++; this.settle(p); }
    }
  }

  /** THE HELD PLACE: a member that FELL (the covenant, the fresh hero's end) leaves its seat
   *  with its place held for rejoinSec under its account (else its seat); its invites go. */
  seatFell(seatId: string, now: number, name = seatId): void {
    const party = this.partyOf(seatId);
    const account = this.accounts.get(seatId);
    this.dropInvites(seatId);
    this.accounts.delete(seatId);
    if (!party) return;
    if (PARTY_CFG.rejoinSec > 0) party.held.push({ seat: seatId, ...(account ? { account } : {}), name, until: now + PARTY_CFG.rejoinSec });
    this.remove(party, seatId);
  }

  /** THE HELD PLACE taken back: a seat joining the world names its account; a place held
   *  for that account (or for this same seat: a `rejoin` on the same connection) seats it
   *  in that party again. Returns the party it rejoined, or null. */
  seatJoined(seatId: string, account: string | undefined, now: number): string | null {
    if (account) this.accounts.set(seatId, account); else this.accounts.delete(seatId);
    if (this.bySeat.has(seatId)) return null;
    for (const p of this.parties.values()) {
      const i = p.held.findIndex(h => h.until > now && ((account !== undefined && h.account === account) || h.seat === seatId));
      if (i < 0) continue;
      p.held.splice(i, 1);
      p.members.push(seatId);
      this.bySeat.set(seatId, p.id);
      if (!p.members.includes(p.leader)) p.leader = p.members[0]; // a party that stood on held places alone: the first back leads
      this.rev++;
      return p.id;
    }
    return null;
  }

  /** Lapsed invites fall away on the host's clock, and so do lapsed held places. */
  sweep(now: number): void {
    for (const [to, inv] of [...this.invites]) if (inv.until <= now) { this.invites.delete(to); this.rev++; }
    for (const p of [...this.parties.values()]) {
      if (!p.held.length) continue;
      const n = p.held.length;
      p.held = p.held.filter(h => h.until > now);
      if (p.held.length !== n) { this.rev++; this.settle(p); }
    }
  }

  /** Every place a party keeps: its seats and its held places (the cap and THE DISSOLVE count both). */
  private places(p: Party): number { return p.members.length + p.held.length; }

  private found(leader: string): Party {
    const party: Party = { id: `g${(++this.serial).toString(36)}`, leader, members: [leader], held: [] };
    this.parties.set(party.id, party);
    this.bySeat.set(leader, party.id);
    this.rev++;
    return party;
  }

  private remove(party: Party, seatId: string): void {
    party.members = party.members.filter(m => m !== seatId);
    this.bySeat.delete(seatId);
    if (party.leader === seatId && party.members.length) party.leader = party.members[0]; // THE LEADER passes to the eldest member
    this.rev++;
    this.settle(party);
  }

  /** THE DISSOLVE: a party keeping one place or none (seated or held) is no party. */
  private settle(party: Party): void {
    if (this.places(party) > 1) return;
    for (const m of party.members) this.bySeat.delete(m);
    this.parties.delete(party.id);
    this.rev++;
  }

  private dropInvites(seatId: string): void {
    if (this.invites.delete(seatId)) this.rev++;
    for (const [to, inv] of [...this.invites]) if (inv.from === seatId) { this.invites.delete(to); this.rev++; }
  }
}
