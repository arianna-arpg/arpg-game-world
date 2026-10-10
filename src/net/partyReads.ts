// ---------------------------------------------------------------------------
// THE PARTY THAT READS (docs/engine/shard.md, the player's first hour): what a
// hosted world's party SHOWS its players, both halves of the wire. Browser-safe.
//
//   THE REVIVE ROW   reviveRowOf (the host: snapshot.ts seatW, SeatW.rv under THE
//                    OWN ENTRY) and applyOwnReviveRow (the shell, each frame): the
//                    down a seat reads (its own while it lies downed, else the downed
//                    body in its revive reach, else a mate's down its own standing
//                    holds), the kneel's progress, THE BLEED-OUT's seconds left and
//                    THE WIPE RADIUS with the holding seats. A shell holds only its
//                    own seat, so World.reviveTargetsView and reviveHint read the row
//                    there (reviveTargetsOfRow): the ring and the cue a mate never saw.
//   THE INVITE TELL  PARTY_INBOX: the invitations that landed on this client, each
//                    standing until its `until` (the shard's world clock); the menu's
//                    Party pip and the renderer's beckon over the inviter read it.
//   THE NEAR ROSTER  partyPanelModel: the party panel as data (your party and its held
//                    places, the invitations, the players near you within THE NEAR
//                    LAW's radius, the far roster by name), so the panel patches only
//                    what changed and a click never falls between two renders.
// ---------------------------------------------------------------------------

import { dist, vec, type Vec2 } from '../core/math';
import { transitOf, transitReach } from '../data/transit';
import type { Seat, World } from '../engine/world';
import type { PartyInviteNote, PartyRow, ReviveW } from './partyWire';
import type { StateSnapshot } from './snapshot';

// ---- THE REVIVE ROW, the host's half ----------------------------------------------

/** The 'revive' transit row (data/transit.ts): the reach and the dwell World.updateDownedSeats
 *  fires on, so the row's ring and the knee agree by construction. */
function reviveRow(): { radius: number; dwell: number } {
  const t = transitOf('revive');
  return { radius: t?.radius ?? 0, dwell: t?.dwell ?? 1 };
}

/** A seat standing in the revive's reach of a downed body (updateDownedSeats' own test). */
function inReviveReach(world: World, a: Seat['actor'], down: Seat['actor']): boolean {
  return dist(a.pos, down.pos) <= reviveRow().radius
    && world.dwellReachable(a.pos, down.pos, transitReach('revive'), world.storyPair(a, down));
}

/** The revive's progress on a downed seat: the best kneeler's dwell over the revive's own
 *  clock, or THE MERCY's clock over the warden's reviveSec (the body rises when it fills). */
function reviveFill(world: World, down: Seat): number {
  let built = 0;
  for (const [id, t] of down.reviveDwellBy) {
    const by = world.seats.find(s => s.id === id);
    const need = by?.keeper ? by.keeper.reviveSec : reviveRow().dwell;
    built = Math.max(built, t / Math.max(0.01, need));
  }
  return Math.floor(Math.min(1, built) * 100) / 100;
}

/** One downed seat's row as `viewer` reads it. */
function downRowOf(world: World, down: Seat, viewer: Seat, knee: boolean): ReviveW {
  const b = down.actor, own = down === viewer;
  const row: ReviveW = { s: down.id, p: [Math.round(b.pos.x), Math.round(b.pos.y)], f: reviveFill(world, down) };
  const view = world.partyDowns?.view(down.id) ?? null;
  if (view?.left !== undefined && view.total) { row.l = Math.round(view.left * 10) / 10; row.lt = view.total; }
  // THE WIPE RADIUS, SHOWN: the downed player and the mates whose standing holds the down.
  if (view && view.holders.length && view.radius > 0 && (own || view.holders.includes(viewer.id))) {
    row.r = view.radius;
    row.h = [...view.holders];
  }
  if (knee) row.k = 1;
  return row;
}

/** THE REVIVE ROW for one seat (SeatW.rv): its own down while it lies downed; standing, the
 *  nearest downed body in its revive reach (`k`), else the nearest party mate's down its own
 *  standing holds. Hosted worlds alone (World.shardWorld), never the warden: every other lane
 *  ships byte-identical snapshots (THE SOLO INVARIANT). */
export function reviveRowOf(world: World, seat: Seat): ReviveW | undefined {
  if (!world.shardWorld || seat.keeper) return undefined;
  const a = seat.actor;
  if (a.dead) return undefined;
  if (a.downed) return downRowOf(world, seat, seat, false);
  let best: { down: Seat; d: number; knee: boolean } | null = null;
  for (const o of world.seats) {
    if (o === seat || o.keeper || !o.actor.downed || o.actor.dead) continue;
    const knee = inReviveReach(world, a, o.actor);
    if (!knee && !(world.partyDowns?.view(o.id)?.holders.includes(seat.id) ?? false)) continue;
    const d = dist(a.pos, o.actor.pos);
    if (!best || (knee && !best.knee) || (knee === best.knee && d < best.d)) best = { down: o, d, knee };
  }
  return best ? downRowOf(world, best.down, seat, best.knee) : undefined;
}

// ---- THE REVIVE ROW, the shell's half -----------------------------------------------

/** The client's half (THE SMOOTH SHELL's frame, beside applyOwnSeatRows): the own row's revive
 *  read becomes World.netRevive on a hosted world (its rows stand: World.partyRows); a co-op
 *  shell keeps every old read. */
export function applyOwnReviveRow(world: World, snap: StateSnapshot): void {
  if (world.partyRows === null) return;
  world.netRevive = snap.seats[world.clientSeatId]?.rv ?? null;
}

/** World.reviveTargetsView on a hosted shell: the downed body this seat's row says it stands
 *  in reach of (the ring where the reach is, the fill off the host's own clock: drawn == dwelt).
 *  Its own down is no target (a body cannot kneel by itself). */
export function reviveTargetsOfRow(world: World): { pos: Vec2; frac: number; kind: string; name: string }[] {
  const rv = world.netRevive, me = world.player;
  if (!rv || !rv.k || rv.s === world.clientSeatId || me.dead || me.downed) return [];
  const body = world.party.members.find(m => m.seat === rv.s)?.actor;
  if (!body) return [];
  return [{ pos: vec(body.pos.x, body.pos.y), frac: rv.f, kind: 'revive', name: body.name }];
}

// ---- THE INVITE TELL -----------------------------------------------------------------

/** The invitations that landed on this client (one client per page: the shell's own inbox). */
export class PartyInbox {
  readonly invites: PartyInviteNote[] = [];

  /** An invitation lands (session `partyInvite`); a newer one from the same inviter replaces it. */
  land(m: { from: string; name: string; party?: string; until: number }, now: number, fallbackSec = 60): void {
    const until = Number.isFinite(m.until) ? m.until : now + fallbackSec;
    const note: PartyInviteNote = { from: m.from, name: m.name, ...(m.party ? { party: m.party } : {}), until };
    const i = this.invites.findIndex(x => x.from === m.from);
    if (i >= 0) this.invites[i] = note; else this.invites.push(note);
  }
  /** An invitation answered (accepted or declined) leaves the list. */
  settle(from: string): void {
    const i = this.invites.findIndex(x => x.from === from);
    if (i >= 0) this.invites.splice(i, 1);
  }
  /** The invitations that still stand: a lapsed one, or one whose inviter `keep` no longer
   *  knows (gone from the world), falls away in place. While this client stands grouped none
   *  answers (the shard refuses a grouped accept), so none is shown. */
  standing(now: number, grouped = false, keep?: (from: string) => boolean): readonly PartyInviteNote[] {
    for (let i = this.invites.length - 1; i >= 0; i--) {
      const x = this.invites[i];
      if (x.until <= now || (keep && !keep(x.from))) this.invites.splice(i, 1);
    }
    return grouped ? [] : this.invites;
  }
  clear(): void { this.invites.length = 0; }
}

/** THE INVITE TELL's one inbox (main.ts fills it; the panel, the menu pip and the beckon read it). */
export const PARTY_INBOX = new PartyInbox();

/** Does this client stand in a party (the shipped rows)? */
export function clientGrouped(world: World): boolean {
  return world.partyRows?.some(r => r.members.includes(world.clientSeatId)) ?? false;
}

// ---- THE NEAR ROSTER (the party panel as data) ------------------------------------

export interface PartyPanelInput {
  /** My seat id on the shard. */
  me: string;
  /** Where my hero stands (null: nowhere yet). */
  at: Vec2 | null;
  /** The heroes my wire carries (the seat-tagged bodies of my snapshot). */
  bodies: readonly { seat: string; name: string; pos: Vec2 }[];
  /** Every connected player the transport knows (the far roster's names). */
  peers: readonly { id: string; name: string }[];
  /** The parties the shard published (null off a hosted world). */
  rows: readonly PartyRow[] | null;
  /** The invitations that stand. */
  invites: readonly PartyInviteNote[];
  /** The shard's last refusal (null = none). */
  word: string | null;
  /** THE NEAR LAW's radius (0 = everyone is near). */
  radius: number;
}

export interface PartyPanelModel {
  hosted: boolean;
  party: { members: { id: string; name: string; lead: boolean; kick: boolean }[]; held: string[] } | null;
  invites: { from: string; name: string }[];
  /** Players within THE NEAR LAW's radius of me, outside my party: `invite` when ungrouped. */
  near: { id: string; name: string; invite: boolean }[];
  /** Every other connected player, by name alone. */
  far: { id: string; name: string }[];
  word: string | null;
}

const byName = <T extends { id: string; name: string }>(a: T, b: T): number => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/** The panel's rows as data: stable order (by name), so a digest of it changes only when what
 *  the panel shows changes. */
export function partyPanelModel(i: PartyPanelInput): PartyPanelModel {
  if (!i.rows) return { hosted: false, party: null, invites: [], near: [], far: [], word: null };
  const nameOf = (id: string): string => i.peers.find(p => p.id === id)?.name ?? i.bodies.find(b => b.seat === id)?.name ?? (id === i.me ? 'you' : id);
  const mine = i.rows.find(p => p.members.includes(i.me)) ?? null;
  const grouped = new Set(i.rows.flatMap(p => p.members));
  const party = mine ? {
    members: mine.members.map(id => ({ id, name: nameOf(id), lead: id === mine.leader, kick: mine.leader === i.me && id !== i.me })),
    held: [...(mine.held ?? [])],
  } : null;
  const near: PartyPanelModel['near'] = [];
  const nearIds = new Set<string>();
  for (const b of i.bodies) {
    if (b.seat === i.me || mine?.members.includes(b.seat) || !i.at) continue;
    if (i.radius > 0 && dist(b.pos, i.at) > i.radius) continue;
    nearIds.add(b.seat);
    near.push({ id: b.seat, name: nameOf(b.seat), invite: !grouped.has(b.seat) });
  }
  const far = i.peers.filter(p => p.id !== i.me && !nearIds.has(p.id) && !mine?.members.includes(p.id)).map(p => ({ id: p.id, name: p.name }));
  return {
    hosted: true, party,
    invites: (mine ? [] : i.invites).map(x => ({ from: x.from, name: x.name })),
    near: near.sort(byName), far: far.sort(byName), word: i.word,
  };
}
