// ---------------------------------------------------------------------------
// THE ACTING SEAT on the wire (docs/engine/shard.md "The pieces"): the rows of
// a snapshot that belong to one party's ears, and the client's own seat rows.
//
//   stampAudiences     the host's half, after serializeSnapshot, on a hosted
//                      world: each scoped notice's audience (NoticeW.to, the
//                      acting seat's party) and the eyecatch's (ecTo: the
//                      caster's party and every seat within the near radius).
//   seatAudienceSplit  the shard's half (ShardTransport.sendState): a
//   seatAudienceFrame  snapshot with no audience goes on to THE OWN ENTRY
//                      (snapshot.ts ownEntryJson) untouched; with one, the
//                      shared body encodes once and each connection splices
//                      in its own part: every seat row (only its own carrying
//                      the SEAT_OWN_ROWS rows), the notices it hears and the
//                      eyecatch if it may see it. No audience list ever ships.
//   applyOwnSeatRows   the client's half (after applySnapshot): the own row's
//                      refusal note (SeatW.fn) floats over the own head, the
//                      host's failNote look, rebuilt each apply from the row so
//                      the per-frame snapshot re-apply never eats it; its surge
//                      (SeatW.lh) drives the low-life glow.
//
// The note and the surge themselves ride SeatW as THE OWN ENTRY's rows
// (snapshot.ts seatW, SEAT_OWN_ROWS): a co-op (WebRTC) host broadcasts them
// whole and each client reads its own entry, as it does seatMeta.
// ---------------------------------------------------------------------------

import { dist } from '../core/math';
import { COOP_SCALING } from '../data/coop';
import type { World } from '../engine/world';
import { SEAT_OWN_ROWS, type NoticeW, type SeatW, type StateSnapshot } from './snapshot';

declare module './snapshot' {
  interface NoticeW {
    /** THE ACTING SEAT (host-side only): the seat ids that hear the line; stripped before it ships. */
    to?: string[];
  }
  interface StateSnapshot {
    /** THE ACTING SEAT (host-side only): who sees the eyecatch; stripped before it ships. */
    ecTo?: string[];
  }
}

/** The client's note: World.text's own look and motion (life, rise, lift). */
export const SEAT_VIEW_CFG = { noteLife: 1, noteRise: 28, noteLift: 16, noteColor: '#8a8678', noteSize: 11 };

/** The host's half (after serializeSnapshot, before the send): audiences, on a hosted world alone. */
export function stampAudiences(world: World, snap: StateSnapshot): void {
  if (!world.localSeat.keeper) return;
  const no = snap.no;
  if (no) {
    for (let i = 0; i < no.length; i++) {
      const n = world.notices[i];
      if (n?.to && n.text === no[i].text && n.bornAt === no[i].born) no[i].to = [...n.to];
    }
  }
  if (snap.ec) {
    const to = eyecatchAudience(world, snap.ec.ci);
    if (to) snap.ecTo = to;
  }
}

/** Who sees a super art's banner on a hosted world: the caster's party and
 *  every player within the near radius of the caster. Undefined (everyone)
 *  when the caster is gone. */
function eyecatchAudience(world: World, casterId: number): string[] | undefined {
  const caster = world.actorById(casterId);
  if (!caster) return undefined;
  const from = world.seatOfRoot(caster);
  const r = COOP_SCALING.shareRadius;
  return world.seats.filter(s => !s.keeper && ((!!from && world.sameParty(from, s))
    || r <= 0 || dist(world.seatHero(s).pos, caster.pos) <= r)).map(s => s.id);
}

export interface SeatAudienceSplit {
  shared: Omit<StateSnapshot, 'seats' | 'no' | 'ec' | 'ecTo'>;
  /** Every seat row stripped of its own rows (what another seat sees). */
  pub: Record<string, SeatW>;
  /** The seat rows that carry own rows, whole (each for its own socket). */
  own: Record<string, SeatW>;
  no?: NoticeW[];
  ec?: StateSnapshot['ec'];
  ecTo?: string[];
}

/** Null when no notice or eyecatch carries an audience (THE OWN ENTRY alone decides then). */
export function seatAudienceSplit(snap: StateSnapshot): SeatAudienceSplit | null {
  if (snap.ecTo === undefined && !snap.no?.some(n => n.to)) return null;
  const { seats, no, ec, ecTo, ...shared } = snap;
  const pub: Record<string, SeatW> = {}, own: Record<string, SeatW> = {};
  for (const [id, row] of Object.entries(seats)) {
    if (!SEAT_OWN_ROWS.some(k => row[k] !== undefined)) { pub[id] = row; continue; }
    own[id] = row;
    const bare = { ...row };
    for (const k of SEAT_OWN_ROWS) delete bare[k];
    pub[id] = bare;
  }
  return { shared, pub, own, ...(no ? { no } : {}), ...(ec ? { ec } : {}), ...(ecTo ? { ecTo } : {}) };
}

/** One seat's part of the frame: the rows, the notices it hears, its eyecatch. */
export function seatAudienceFor(v: SeatAudienceSplit, seatId: string): Pick<StateSnapshot, 'seats' | 'no' | 'ec'> {
  const out: Pick<StateSnapshot, 'seats' | 'no' | 'ec'> = { seats: v.own[seatId] ? { ...v.pub, [seatId]: v.own[seatId] } : v.pub };
  if (v.no) out.no = v.no.filter(n => !n.to || n.to.includes(seatId)).map(n => { if (!n.to) return n; const { to: _to, ...line } = n; return line; });
  if (v.ec && (!v.ecTo || v.ecTo.includes(seatId))) out.ec = v.ec;
  return out;
}

/** The shared body of every connection's frame, encoded once (its closing '}}' returns per seat). */
export function seatAudienceBody(v: SeatAudienceSplit): string {
  return JSON.stringify({ t: 'snap', snap: v.shared }).slice(0, -2);
}
/** One connection's snapshot frame text: the shared body with this seat's part spliced in. */
export function seatAudienceFrame(body: string, v: SeatAudienceSplit, seatId: string): string {
  const part = JSON.stringify(seatAudienceFor(v, seatId));
  return body + (part.length > 2 ? ',' + part.slice(1, -1) : '') + '}}';
}

/** The client's half (after applySnapshot): the own row's note and surge. */
const notedAt = new WeakMap<World, { at: number; x: number; y: number }>();
export function applyOwnSeatRows(world: World, snap: StateSnapshot): void {
  const own = snap.seats[world.clientSeatId];
  world.lowLifeHitFlash = own?.lh ?? 0;
  const fn = own?.fn;
  if (!fn) return;
  let mark = notedAt.get(world);
  if (!mark || mark.at !== fn.at) notedAt.set(world, mark = { at: fn.at, x: world.player.pos.x, y: world.player.pos.y });
  const age = Math.max(0, world.time - fn.at), life = SEAT_VIEW_CFG.noteLife - age;
  if (life <= 0) return;
  world.texts.push({ pos: { x: mark.x, y: mark.y - SEAT_VIEW_CFG.noteLift - SEAT_VIEW_CFG.noteRise * age },
    text: fn.text, color: SEAT_VIEW_CFG.noteColor, size: SEAT_VIEW_CFG.noteSize, life, maxLife: SEAT_VIEW_CFG.noteLife });
}
