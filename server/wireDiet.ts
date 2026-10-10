// ---------------------------------------------------------------------------
// THE WIRE DIET (shard sync pass C, items 8, 14, 15 and 20; docs/engine/shard.md
// "THE WIRE DIET"): the shard's half. ShardTransport.sendStateTo hands a bound
// snapshot here and writes what comes back; the browser-safe half (the codec,
// the dress delta's apply, the lite glide, the config) is src/net/wireDiet.ts.
//
//   INTEREST           a seat's frame carries the bodies, flights, numbers,
//                      flashes, ground rows, drops, orbs, bursts, bands and
//                      lite bodies within reach of its hero or a party mate's
//                      hero (a party never loses sight of itself), always its
//                      party's courts (minions, companions, the throng)
//                      wherever they stand, and THE FAR ROSTER: every other
//                      seat of the unit as its hero's place, name and pools.
//   ONE ENCODING PER   seats whose selections match share one encoded body
//   AUDIENCE SET       (N players standing together cost one), and only the
//                      seat's own tail (THE OWN ENTRY, its build, the notices
//                      it hears, its eyecatch, its dress delta) is its own.
//   THE CODEC          each actor row quantized and elided once a snapshot
//                      (dietRow); the client inflates it before any reader.
//   THE DRESS LEDGER   per World: the doodad roster and the plan structures
//                      the zone message ships, diffed when the engine's doodad
//                      revision moves; a socket holds a revision and hears the
//                      changes since it (`dd`); a zone message stamps it.
//   THE CARRY          a beat a socket skipped (flow control, a congested
//                      buffer) carries its rows that ride only on a change
//                      (the journal, the build, the shelf, the account view)
//                      into the next frame that socket receives.
//   THE LITE IDS       a lite body keeps one wire id per life (a slot's
//                      rebirth re-salts its seat hash: a new id).
// ---------------------------------------------------------------------------

import type { World, Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { Doodad, PlacedStructure } from '../src/engine/levelgen';
import { COOP_SCALING } from '../src/data/coop';
import { encodeFrame, WS_OP } from '../src/net/wsframe';
import { SEAT_OWN_ROWS, type DoodadW, type SeatMetaW, type SeatW, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import type { JournalW } from '../src/net/journalWire';
import { WIRE_DIET_CFG, dietFarRow, dietGrid, dietIdentity, dietKept, dietRow, dressKey, type DressDeltaW } from '../src/net/wireDiet';
import '../src/net/seatView'; // THE ACTING SEAT's host-side audiences (NoticeW.to, StateSnapshot.ecTo)

/** What one socket's client holds (THE WIRE DIET's ledger per connection). */
export interface DietSeat {
  /** THE DRESS LEDGER: the World, zone, epoch and revision of the ground this client holds. */
  dressWorld: World | null;
  dressZone: string;
  dressEpoch: number;
  dressRev: number;
  /** THE CARRY: rows a skipped beat held that ride only on a change. */
  carry: DietCarry | null;
  /** THE IDENTITY ONCE: the identities this socket's client holds (its last frame's bodies, by
   *  id); null = none, every row rides whole. Sockets that heard the same frame share one. */
  ids: Map<number, string> | null;
}
interface DietCarry {
  jn?: JournalW;
  meta?: SeatMetaW;
  shelf?: Pick<StateSnapshot, 'vendor' | 'vendorRestockAt' | 'vendorCap'>;
  access?: StateSnapshot['memoryAccess'];
}

/** One socket the diet writes for (the transport's connection rides along untouched). */
export interface DietRecipient<C> { seat: string; st: DietSeat; conn: C }
/** One socket's frame, ready to write (`rev`: the dress revision it delivers; `ids`: the
 *  identities its client holds once it lands). */
export interface DietFrame<C> extends DietRecipient<C> { frame: Uint8Array; rev: number; ids: Map<number, string> }

/** INTEREST's reach in px (0 = everything, the co-op lanes' law). */
export function dietReach(): number {
  return WIRE_DIET_CFG.reachPx > 0 ? WIRE_DIET_CFG.reachPx : 2 * Math.max(0, COOP_SCALING.shareRadius);
}

// ---------------------------------------------------------------- THE LITE IDS --

interface LiteIds { seat: Uint32Array; id: Float64Array }
const LITE_IDS = new WeakMap<object, LiteIds>();
let liteSeq = 0;

/** The pool's live rows in the snapshot's own order (snapshot.ts liteOf: slot order, the
 *  live ones), each with its wire id and its owner. */
function liteRowsOf(w: World): { id: number; owner: number }[] {
  const pool = w.lite;
  let m = LITE_IDS.get(pool);
  if (!m || m.id.length !== pool.cap) { m = { seat: new Uint32Array(pool.cap), id: new Float64Array(pool.cap) }; LITE_IDS.set(pool, m); }
  const out: { id: number; owner: number }[] = [];
  for (let i = 0; i < pool.used; i++) {
    if (!pool.alive[i]) continue;
    if (m.id[i] === 0 || m.seat[i] !== pool.seat[i]) { m.id[i] = ++liteSeq; m.seat[i] = pool.seat[i]; }
    out.push({ id: m.id[i], owner: pool.owner[i] });
  }
  return out;
}

// ------------------------------------------------------------- THE DRESS LEDGER --

const v2n = (n: number): number => Math.round(n * 100) / 100;

/** A doodad as the zone message ships it: serializeZone's own row (snapshot.ts). The probe
 *  pins this twin against serializeZone, so the two never drift. */
export function dressRowOf(d: Doodad): DoodadW {
  return { p: [v2n(d.pos.x), v2n(d.pos.y)], r: d.radius, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn,
    door: d.door, hitbox: d.hitbox, hollow: d.hollow, annex: d.annex, wild: d.wild, fall: d.fall };
}

/** A doodad's identity at the last scan (radius excluded: a drying piece's radius is the
 *  evaporating ground's own row; a door's state is the doors row's). */
interface DressMark {
  x: number; y: number; kind: string; dir?: number; rot?: number; shallow?: boolean; adorn?: string; fall?: boolean; wild?: boolean;
  hollow?: string; annex?: string; door?: unknown; hitbox?: unknown; key: string;
}
const MARKS = new WeakMap<Doodad, DressMark>();
/** The doodad's mark now: the cached one while nothing it names moved, else a fresh one. */
function markOf(d: Doodad): DressMark {
  const m = MARKS.get(d), x = v2n(d.pos.x), y = v2n(d.pos.y);
  if (m && m.x === x && m.y === y && m.kind === d.kind && m.dir === d.dir && m.rot === d.rot && m.shallow === d.shallow
    && m.adorn === d.adorn && m.fall === d.fall && m.wild === d.wild && m.hollow === d.hollow && m.annex === d.annex
    && m.door === d.door && m.hitbox === d.hitbox) return m;
  const fresh: DressMark = { x, y, kind: d.kind, dir: d.dir, rot: d.rot, shallow: d.shallow, adorn: d.adorn, fall: d.fall, wild: d.wild,
    hollow: d.hollow, annex: d.annex, door: d.door, hitbox: d.hitbox, key: dressKey(x, y, d.kind) };
  MARKS.set(d, fresh);
  return fresh;
}

interface DressEntry { rev: number; r: string[]; a: DoodadW[]; sr: string[]; sa: PlacedStructure[] }
/** One World's ledger: the roster as last scanned and the changes between revisions. */
interface DressLedger {
  epoch: number; zone: string; rev: number;
  version: number; arr: Doodad[] | null; len: number; sArr: PlacedStructure[] | null; sLen: number;
  roster: Map<Doodad, DressMark>;
  structs: Map<string, PlacedStructure>;
  log: DressEntry[];
  /** The composed delta per revision a socket holds, for the beat in flight (cleared at each scan). */
  since: Map<number, { dd: DressDeltaW | null; json: string | null }>;
}
const LEDGERS = new WeakMap<World, DressLedger>();
let dressEpochs = 0;

/** The doodads the zone message ships (serializeZone's filter: pooled wells ride their own
 *  channel, a titan's pieces its own). */
function shipped(w: World, d: Doodad): boolean { return !d.well && !w.titans.owns(d); }

/** THE DRESS LEDGER's scan: when the engine's doodad revision (or the list, or the plan
 *  structures) moved since the last scan, diff the roster by object (an in-place change, a
 *  harvested node's husk, a frozen pool, is the old piece removed and the new one added) and
 *  log a revision. A zone change starts a fresh epoch. */
export function dressScan(w: World): DressLedger {
  let L = LEDGERS.get(w);
  if (!L || L.zone !== w.zone.id) {
    L = { epoch: ++dressEpochs, zone: w.zone.id, rev: 0, version: NaN, arr: null, len: -1, sArr: null, sLen: -1,
      roster: new Map(), structs: new Map(), log: [], since: new Map() };
    LEDGERS.set(w, L);
    for (const d of w.doodads) if (shipped(w, d)) L.roster.set(d, markOf(d));
    for (const st of w.structures) L.structs.set(st.id, st);
    L.version = w.doodadsVersion(); L.arr = w.doodads; L.len = w.doodads.length; L.sArr = w.structures; L.sLen = w.structures.length;
    return L;
  }
  if (L.version === w.doodadsVersion() && L.arr === w.doodads && L.len === w.doodads.length
    && L.sArr === w.structures && L.sLen === w.structures.length) return L;
  L.since.clear();
  const next = new Map<Doodad, DressMark>();
  const r: string[] = [], a: DoodadW[] = [];
  for (const d of w.doodads) {
    if (!shipped(w, d)) continue;
    const mk = markOf(d);
    next.set(d, mk);
    const was = L.roster.get(d);
    if (was === mk) continue;      // the same piece, unmoved
    if (was) r.push(was.key);      // an in-place change: the piece as it stood goes...
    a.push(dressRowOf(d));         // ...and the piece as it stands arrives
  }
  for (const [d, mk] of L.roster) if (!next.has(d)) r.push(mk.key);
  const sNext = new Map<string, PlacedStructure>();
  for (const st of w.structures) sNext.set(st.id, st);
  const sa: PlacedStructure[] = [], sr: string[] = [];
  for (const [id, st] of sNext) if (L.structs.get(id) !== st) sa.push(st);
  for (const id of L.structs.keys()) if (!sNext.has(id)) sr.push(id);
  L.roster = next; L.structs = sNext;
  L.version = w.doodadsVersion(); L.arr = w.doodads; L.len = w.doodads.length; L.sArr = w.structures; L.sLen = w.structures.length;
  if (r.length || a.length || sr.length || sa.length) {
    L.log.push({ rev: ++L.rev, r, a, sr, sa });
    if (L.log.length > WIRE_DIET_CFG.dressLog) L.log.splice(0, L.log.length - WIRE_DIET_CFG.dressLog);
  }
  return L;
}

/** Can a socket at `rev` still be caught up by deltas (its revision is in the log's reach)? */
function dressReachable(L: DressLedger, rev: number): boolean {
  if (rev > L.rev) return false;
  return rev === L.rev || (L.log.length > 0 && L.log[0].rev <= rev + 1);
}

/** The composed delta from `rev` to the ledger's newest (null: nothing changed). Ordered
 *  entries fold into one: a piece added then removed inside the span never rides; removals
 *  apply before additions on the client. */
function dressSince(L: DressLedger, rev: number): { dd: DressDeltaW | null; json: string | null } {
  const hit = L.since.get(rev);
  if (hit) return hit;
  let out: { dd: DressDeltaW | null; json: string | null } = { dd: null, json: null };
  if (rev < L.rev) {
    const pending = new Map<string, DoodadW[]>(), removed = new Map<string, number>();
    const sPending = new Map<string, PlacedStructure>(), sRemoved = new Set<string>();
    for (const e of L.log) {
      if (e.rev <= rev) continue;
      for (const k of e.r) {
        const p = pending.get(k);
        if (p?.length) p.pop(); else removed.set(k, (removed.get(k) ?? 0) + 1);
      }
      for (const row of e.a) {
        const k = dressKey(row.p[0], row.p[1], row.kind);
        const p = pending.get(k);
        if (p) p.push(row); else pending.set(k, [row]);
      }
      for (const id of e.sr) { sPending.delete(id); sRemoved.add(id); }
      for (const st of e.sa) { sPending.set(st.id, st); sRemoved.add(st.id); }
    }
    const dd: DressDeltaW = {};
    const rr: string[] = [];
    for (const [k, n] of removed) for (let i = 0; i < n; i++) rr.push(k);
    const aa = [...pending.values()].flat();
    if (rr.length) dd.r = rr;
    if (aa.length) dd.a = aa;
    if (sRemoved.size) dd.sr = [...sRemoved];
    if (sPending.size) dd.sa = [...sPending.values()];
    if (dd.r || dd.a || dd.sr || dd.sa) out = { dd, json: JSON.stringify(dd) };
  }
  L.since.set(rev, out);
  return out;
}

/** A zone message's frame: everything but the dress (the doodads and the plan structures),
 *  once per message (a message to many sockets is one frame). */
const RESIDUALS = new WeakMap<ZoneMsg, string>();
function residualOf(z: ZoneMsg): string {
  let r = RESIDUALS.get(z);
  if (r === undefined) {
    const { doodads: _d, structures: _s, ...rest } = z;
    RESIDUALS.set(z, r = JSON.stringify(rest));
  }
  return r;
}

// --------------------------------------------------------------------- THE DIET --

/** A snapshot's rows the diet selects per audience (row indices into the snapshot's lists). */
interface Selection {
  actors: number[]; far: number[]; proj: number[]; text: number[]; flash: number[]; zone: number[];
  drop: number[]; orb: number[]; burst: number[]; tether: number[]; lite: number[]; near: string[];
}

const enc = new TextEncoder();

export class ShardDiet {
  /** Bodies encoded since boot: one per distinct audience set per snapshot (the probe's count). */
  encodings = 0;
  /** Frames a socket skipped under flow control (the probe's and the status page's count). */
  skipped = 0;
  private readonly bound = new WeakMap<StateSnapshot, World>();
  /** Each World's frame (the zone message without its dress) as it last shipped. */
  private readonly residuals = new WeakMap<World, string>();

  constructor(private readonly worldOfSeat: (seatId: string) => World | undefined) {}

  /** A fresh socket's ledger (it holds nothing until its first zone message). */
  seat(): DietSeat { return { dressWorld: null, dressZone: '', dressEpoch: -1, dressRev: -1, carry: null, ids: null }; }

  /** The host's word: this snapshot was serialized from this World (the transport reads it). */
  bind(s: StateSnapshot, w: World): void { this.bound.set(s, w); }
  /** The World a snapshot came from (undefined: the pre-diet frames). */
  worldFor(s: StateSnapshot): World | undefined { return this.bound.get(s); }

  /** Does this socket need the whole zone before its next frame (it holds another World's,
   *  zone's or epoch's ground, or a revision the log no longer reaches)? */
  needsZone(st: DietSeat, w: World): boolean {
    const L = dressScan(w);
    return st.dressWorld !== w || st.dressZone !== w.zone.id || st.dressEpoch !== L.epoch || !dressReachable(L, st.dressRev);
  }

  /** A zone message went to this socket: its ground is the World's as it stands (the ledger
   *  scanned at this moment). A message whose dress does not count out to the ledger's (one
   *  serialized at another moment) stamps nothing, so the next frame ships a fresh one. (THE
   *  CARRY is no ground: a build held through a throttle still rides the next frame.) */
  zoneShipped(st: DietSeat, seatId: string, z: ZoneMsg): void {
    const w = this.worldOfSeat(seatId);
    if (!w || z.zoneId !== w.zone.id) { st.dressWorld = null; return; }
    const L = dressScan(w);
    if (z.doodads.length !== L.roster.size) { st.dressWorld = null; return; }
    st.dressWorld = w; st.dressZone = w.zone.id; st.dressEpoch = L.epoch; st.dressRev = L.rev;
    this.residuals.set(w, residualOf(z));
  }

  /** THE DRESS BEAT under the diet: has this World's frame (its theme, exits, lanes, walk...)
   *  moved since its zone message last shipped? The dress itself rides `dd`. */
  frameMoved(w: World, z: ZoneMsg): boolean { return this.residuals.get(w) !== residualOf(z); }

  /** THE CARRY: a beat this socket skipped holds its rows that ride only on a change. */
  hold(st: DietSeat, s: StateSnapshot, seatId: string): void {
    const c = st.carry ??= {};
    const jn = s.seats[seatId]?.jn;
    if (jn !== undefined) c.jn = jn;
    const meta = s.seatMeta?.[seatId];
    if (meta) c.meta = meta;
    if (s.vendor !== undefined) c.shelf = { vendor: s.vendor, vendorRestockAt: s.vendorRestockAt, vendorCap: s.vendorCap };
    if (s.memoryAccess !== undefined) c.access = s.memoryAccess;
  }

  /** A frame was written: the socket holds its dress revision and its bodies' identities, and
   *  owes nothing carried. */
  delivered(st: DietSeat, f: { rev: number; ids: Map<number, string> }): void { st.dressRev = f.rev; st.ids = f.ids; st.carry = null; }

  /** THE IDENTITY ONCE's resend: the client missed an identity, so every row rides whole once. */
  resendIdentities(st: DietSeat): void { st.ids = null; }

  /** Every recipient's frame for this snapshot (the World is the one it was serialized from,
   *  under its pin; every recipient's ground is stamped: the transport ships a zone first to
   *  any that needsZone). */
  frames<C>(w: World, s: StateSnapshot, recips: readonly DietRecipient<C>[]): DietFrame<C>[] {
    const L = dressScan(w);
    const g = dietGrid(), gJson = JSON.stringify(g);
    const R = dietReach();
    const seats = w.seats.filter(x => !x.keeper);
    const seatById = new Map(seats.map(x => [x.id, x] as const));
    // Each body's seat: the owner chain's root, read through the controlled body and the home body alike.
    const seatOfBody = new Map<Actor, Seat>();
    for (const x of seats) { seatOfBody.set(x.actor, x); if (x.home) seatOfBody.set(x.home, x); }
    const courts = new Map<string, Set<number>>();
    for (const a of w.actors) {
      let root: Actor = a;
      while (root.owner) root = root.owner;
      const x = seatOfBody.get(root);
      if (!x || a === x.actor) continue;
      let set = courts.get(x.id);
      if (!set) courts.set(x.id, set = new Set());
      set.add(a.id);
    }
    const rowOfActor = new Map<number, number>();
    s.actors.forEach((r, i) => rowOfActor.set(r.id, i));
    const lite = s.lt ? liteRowsOf(w) : [];
    const liteAligned = !!s.lt && lite.length * 3 === s.lt.b.length;

    // ---- the selections, one per viewer group (a party, or a seat alone) ----
    const groupKeyOf = (seatId: string): string[] => (w.partyMates?.(seatId) ?? [seatId]).filter(id => seatById.has(id)).sort();
    const selCache = new Map<string, { key: string; sel: Selection }>();
    const selectFor = (members: string[]): { key: string; sel: Selection } => {
      const gk = members.join('|');
      const hit = selCache.get(gk);
      if (hit) return hit;
      const centers = members.map(id => seatById.get(id)!.actor.pos);
      const court = new Set<number>();
      for (const id of members) {
        court.add(seatById.get(id)!.actor.id);
        for (const a of courts.get(id) ?? []) court.add(a);
      }
      const near = (x: number, y: number, pad = 0): boolean => {
        if (!(R > 0)) return true;
        const rr = (R + Math.max(0, pad)) ** 2;
        for (const c of centers) { const dx = c.x - x, dy = c.y - y; if (dx * dx + dy * dy <= rr) return true; }
        return false;
      };
      const sel: Selection = { actors: [], far: [], proj: [], text: [], flash: [], zone: [], drop: [], orb: [], burst: [], tether: [], lite: [], near: [] };
      const included = new Set<number>();
      s.actors.forEach((r, i) => { if (court.has(r.id) || near(r.p[0], r.p[1])) { sel.actors.push(i); included.add(r.id); } });
      for (const x of seats) {
        const at = rowOfActor.get(x.actor.id);
        if (at === undefined) continue;
        if (included.has(x.actor.id)) sel.near.push(x.id); else sel.far.push(at);
      }
      s.projectiles.forEach((p, i) => { if (near(p.p[0], p.p[1], p.r)) sel.proj.push(i); });
      s.texts.forEach((t, i) => { if (near(t.p[0], t.p[1])) sel.text.push(i); });
      s.flashes.forEach((f, i) => { if (near(f.p[0], f.p[1], f.radius)) sel.flash.push(i); });
      (s.zones ?? []).forEach((z, i) => {
        if (!(R > 0)) { sel.zone.push(i); return; }
        let ok = false;
        for (const c of centers) {
          let d: number;
          if (z.seg) {
            const [ax, ay, bx, by] = z.seg, dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
            const t = len2 > 0 ? Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.y - ay) * dy) / len2)) : 0;
            d = Math.hypot(c.x - (ax + dx * t), c.y - (ay + dy * t));
          } else d = Math.hypot(c.x - z.p[0], c.y - z.p[1]);
          if (d - z.r <= R) { ok = true; break; }
        }
        if (ok) sel.zone.push(i);
      });
      s.drops.forEach((d, i) => { if (near(d.p[0], d.p[1])) sel.drop.push(i); });
      s.orbs.forEach((o, i) => { if (near(o.p[0], o.p[1])) sel.orb.push(i); });
      (s.deathBursts ?? []).forEach((b, i) => { if (near(b.p[0], b.p[1], b.r)) sel.burst.push(i); });
      (s.tethers ?? []).forEach((t, i) => { if (near(t.ax, t.ay) || near(t.bx, t.by)) sel.tether.push(i); });
      if (s.lt && liteAligned) {
        for (let j = 0; j < lite.length; j++) {
          if (court.has(lite[j].owner) || near(s.lt.b[j * 3 + 1], s.lt.b[j * 3 + 2])) sel.lite.push(j);
        }
      }
      const key = [sel.actors, sel.far, sel.proj, sel.text, sel.flash, sel.zone, sel.drop, sel.orb, sel.burst, sel.tether, sel.lite]
        .map(l => l.join(',')).join('|') + '|' + sel.near.join(',');
      const out = { key, sel };
      selCache.set(gk, out);
      return out;
    };

    // ---- the rows, each encoded once a snapshot (whole, kept, its identity) ----
    const actorJ: string[] = [], keptJ: string[] = [], farJ: string[] = [], identJ: string[] = [];
    const encoded: Record<string, unknown>[] = [];
    const enc1 = (i: number): Record<string, unknown> => (encoded[i] ??= dietRow(s.actors[i], g));
    const identity = (i: number): string => (identJ[i] ??= dietIdentity(enc1(i)));
    const rowJ = new Map<unknown, string>();
    const json = (row: unknown): string => { let j = rowJ.get(row); if (j === undefined) rowJ.set(row, j = JSON.stringify(row)); return j; };
    const list = (name: string, rows: readonly unknown[], idx: readonly number[]): string => ',"' + name + '":[' + idx.map(i => json(rows[i])).join(',') + ']';
    const { seats: _seats, seatMeta: _meta, no: _no, ec: _ec, ecTo: _ecTo, actors: _actors, projectiles: _proj, texts: _texts, flashes: _flashes,
      zones: _zones, drops: _drops, orbs: _orbs, deathBursts: _bursts, tethers: _tethers, lt: _lt, dd: _dd, dz: _dz,
      vendor: _vendor, vendorRestockAt: _restock, vendorCap: _cap, memoryAccess: _access, ...rest } = s;
    const head = '{"t":"snap","snap":' + JSON.stringify(rest).slice(0, -1);
    // One body per distinct audience set AND identity record: the sockets that heard the same
    // last frame share it (the steady state: one per audience set).
    const bodies = new Map<string, Map<Map<number, string> | null, Uint8Array>>();
    const records = new Map<string, Map<number, string>>();
    const recordOf = (key: string, sel: Selection): Map<number, string> => {
      let rec = records.get(key);
      if (!rec) { rec = new Map(sel.actors.map(i => [s.actors[i].id, identity(i)] as const)); records.set(key, rec); }
      return rec;
    };
    const bodyOf = (key: string, sel: Selection, held: Map<number, string> | null): Uint8Array => {
      let byHeld = bodies.get(key);
      if (!byHeld) bodies.set(key, byHeld = new Map());
      let b = byHeld.get(held);
      if (b) return b;
      const parts = [head];
      parts.push(',"actors":[' + [
        ...sel.actors.map(i => (held && held.get(s.actors[i].id) === identity(i)
          ? (keptJ[i] ??= JSON.stringify(dietKept(enc1(i))))
          : (actorJ[i] ??= JSON.stringify(enc1(i))))),
        ...sel.far.map(i => (farJ[i] ??= JSON.stringify(dietFarRow(s.actors[i], g)))),
      ].join(',') + ']');
      parts.push(list('projectiles', s.projectiles, sel.proj));
      if (s.tethers) parts.push(list('tethers', s.tethers, sel.tether));
      if (sel.zone.length) parts.push(list('zones', s.zones!, sel.zone));
      parts.push(list('drops', s.drops, sel.drop));
      parts.push(list('orbs', s.orbs, sel.orb));
      parts.push(list('texts', s.texts, sel.text));
      parts.push(list('flashes', s.flashes, sel.flash));
      if (s.deathBursts) parts.push(list('deathBursts', s.deathBursts, sel.burst));
      if (s.lt && !liteAligned) parts.push(',"lt":' + JSON.stringify(s.lt)); // a pool that moved since the serialize: the plain list, unglided
      else if (s.lt && sel.lite.length) {
        const b3: number[] = [], ids: number[] = [];
        for (const j of sel.lite) { b3.push(s.lt.b[j * 3], s.lt.b[j * 3 + 1], s.lt.b[j * 3 + 2]); ids.push(lite[j].id); }
        parts.push(',"lt":' + JSON.stringify({ k: s.lt.k, b: b3, i: ids }));
      }
      b = enc.encode(parts.join(''));
      byHeld.set(held, b);
      this.encodings++;
      return b;
    };

    // ---- each socket's own tail ----
    const strippedJ = new Map<string, string>();
    const stripped = (id: string): string => {
      let j = strippedJ.get(id);
      if (j === undefined) {
        const c = { ...s.seats[id] } as SeatW;
        for (const k of SEAT_OWN_ROWS) delete c[k];
        strippedJ.set(id, j = JSON.stringify(c));
      }
      return j;
    };
    const shelfJ = s.vendor !== undefined ? JSON.stringify({ vendor: s.vendor, vendorRestockAt: s.vendorRestockAt, vendorCap: s.vendorCap }).slice(1, -1) : null;
    const accessJ = s.memoryAccess !== undefined ? JSON.stringify(s.memoryAccess) : null;
    const plainNotices = s.no && !s.no.some(n => n.to) ? JSON.stringify(s.no) : null;
    const out: DietFrame<C>[] = [];
    for (const r of recips) {
      const me = r.seat, carry = r.st.carry;
      if (!seatById.has(me)) continue; // a socket whose seat stands in another World hears another snapshot
      const members = groupKeyOf(me);
      const { key, sel } = selectFor(members.length ? members : [me]);
      const body = bodyOf(key, sel, r.st.ids);
      const tail: string[] = [];
      const nearIds = sel.near.includes(me) ? sel.near : [...sel.near, me];
      tail.push(',"seats":{' + nearIds.filter(id => s.seats[id]).map(id => {
        if (id !== me) return JSON.stringify(id) + ':' + stripped(id);
        const own = s.seats[id];
        return JSON.stringify(id) + ':' + JSON.stringify(own.jn === undefined && carry?.jn !== undefined ? { ...own, jn: carry.jn } : own);
      }).join(',') + '}');
      const meta = s.seatMeta?.[me] ?? carry?.meta;
      if (meta) tail.push(',"seatMeta":' + JSON.stringify({ [me]: meta }));
      if (s.no) tail.push(',"no":' + (plainNotices ?? JSON.stringify(s.no.filter(n => !n.to || n.to.includes(me)).map(n => { if (!n.to) return n; const { to: _to, ...line } = n; return line; }))));
      if (s.ec && (!s.ecTo || s.ecTo.includes(me))) tail.push(',"ec":' + JSON.stringify(s.ec));
      const dd = r.st.dressWorld === w ? dressSince(L, r.st.dressRev) : null;
      if (dd?.json) tail.push(',"dd":' + dd.json);
      if (shelfJ) tail.push(',' + shelfJ);
      else if (carry?.shelf) tail.push(',' + JSON.stringify(carry.shelf).slice(1, -1));
      if (accessJ) tail.push(',"memoryAccess":' + accessJ);
      else if (carry?.access !== undefined) tail.push(',"memoryAccess":' + JSON.stringify(carry.access));
      tail.push(',"dz":' + gJson + '}}');
      const t = enc.encode(tail.join(''));
      const payload = new Uint8Array(body.length + t.length);
      payload.set(body, 0); payload.set(t, body.length);
      out.push({ ...r, frame: encodeFrame(WS_OP.text, payload), rev: L.rev, ids: recordOf(key, sel) });
    }
    return out;
  }
}
