// ---------------------------------------------------------------------------
// THE ACTING SEAT on the wire (docs/engine/shard.md "The pieces"): the rows
// of a snapshot that belong to ONE seat or to one party, and the shard's
// per-connection view that ships each row to its own audience.
//
//   stampSeatRows    the host's half, after serializeSnapshot: each player
//                    seat's own HUD rows (SeatW.fn, the newest refusal note;
//                    SeatW.lh, the low-life surge's seconds left), and on a
//                    hosted world each scoped notice's audience (NoticeW.to,
//                    the acting seat's party) and the eyecatch's (ecTo: the
//                    caster's party and every seat within the near radius).
//   seatViewSplit /  the shard's half (ShardTransport.sendState): a snapshot
//   seatViewFor      with nothing private broadcasts as one frame; otherwise
//                    the shared body encodes once and each connection splices
//                    in its own part: every seat row (only its own carrying
//                    HUD rows), the notices it hears, the eyecatch if it sees
//                    it. No audience list ever ships.
//   applyOwnSeatRows the client's half: the own row's note floats over the
//                    own head (the host's failNote path, rebuilt each apply
//                    from the row, so the per-frame snapshot re-apply never
//                    eats it) and its surge drives the low-life glow.
//
// A co-op (WebRTC) host stamps the HUD rows too and broadcasts them whole; a
// client applies its own entry alone, as it does seatMeta.
// ---------------------------------------------------------------------------

import { dist } from '../core/math';
import { COOP_SCALING } from '../data/coop';
import type { World } from '../engine/world';
import type { NoticeW, SeatW, StateSnapshot } from './snapshot';

declare module './snapshot' {
  interface SeatW {
    /** THE ACTING SEAT: the newest refusal note (text + host world time); shipped to its own seat alone. */
    fn?: { text: string; at: number };
    /** THE ACTING SEAT: seconds left on the hit-while-low surge; shipped to its own seat alone. */
    lh?: number;
  }
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

/** The host's half (after serializeSnapshot, before the broadcast). */
export function stampSeatRows(world: World, snap: StateSnapshot): void {
  for (const s of world.seats) {
    const row = snap.seats[s.id];
    const hud = row ? world.seatHudWire(s) : null;
    if (!row || !hud) continue;
    if (hud.fn) row.fn = hud.fn;
    if (hud.lh !== undefined) row.lh = hud.lh;
  }
  if (!world.localSeat.keeper) return; // audiences are a hosted world's alone
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

export interface SeatViewSplit {
  shared: Omit<StateSnapshot, 'seats' | 'no' | 'ec' | 'ecTo'>;
  /** Every seat row stripped of its HUD rows (what a stranger sees). */
  pub: Record<string, SeatW>;
  /** The seats whose own row carries HUD rows, whole. */
  own: Record<string, SeatW>;
  no?: NoticeW[];
  ec?: StateSnapshot['ec'];
  ecTo?: string[];
}

/** Null when the snapshot holds nothing private (it broadcasts as one frame). */
export function seatViewSplit(snap: StateSnapshot): SeatViewSplit | null {
  const own: Record<string, SeatW> = {};
  let priv = snap.ecTo !== undefined || !!snap.no?.some(n => n.to);
  for (const [id, row] of Object.entries(snap.seats)) if (row.fn || row.lh !== undefined) { own[id] = row; priv = true; }
  if (!priv) return null;
  const { seats, no, ec, ecTo, ...shared } = snap;
  const pub: Record<string, SeatW> = {};
  for (const [id, row] of Object.entries(seats)) {
    if (!own[id]) { pub[id] = row; continue; }
    const { fn: _fn, lh: _lh, ...rest } = row;
    pub[id] = rest;
  }
  return { shared, pub, own, ...(no ? { no } : {}), ...(ec ? { ec } : {}), ...(ecTo ? { ecTo } : {}) };
}

/** One seat's part of the frame: the rows, the notices it hears, its eyecatch. */
export function seatViewFor(v: SeatViewSplit, seatId: string): Pick<StateSnapshot, 'seats' | 'no' | 'ec'> {
  const out: Pick<StateSnapshot, 'seats' | 'no' | 'ec'> = { seats: v.own[seatId] ? { ...v.pub, [seatId]: v.own[seatId] } : v.pub };
  if (v.no) out.no = v.no.filter(n => !n.to || n.to.includes(seatId)).map(n => { if (!n.to) return n; const { to: _to, ...line } = n; return line; });
  if (v.ec && (!v.ecTo || v.ecTo.includes(seatId))) out.ec = v.ec;
  return out;
}

/** One connection's snapshot frame text: the shared body encoded once (`body`,
 *  from seatViewBody) with this seat's part spliced in. */
export function seatViewBody(v: SeatViewSplit): string {
  return JSON.stringify({ t: 'snap', snap: v.shared }).slice(0, -2); // the closing '}}' returns per seat
}
export function seatViewFrame(body: string, v: SeatViewSplit, seatId: string): string {
  const part = JSON.stringify(seatViewFor(v, seatId));
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
