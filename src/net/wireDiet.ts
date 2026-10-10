// ---------------------------------------------------------------------------
// THE WIRE DIET (shard sync pass C, items 8, 14, 15 and 20; docs/engine/shard.md
// "THE WIRE DIET"): the browser-safe half. The shard's half (the interest per
// seat, the shared encodings, the dress ledger, the carry) is server/wireDiet.ts.
//
//   THE CODEC          a hosted world's frames are compact on the wire and
//                      canonical everywhere else: the shard quantizes and
//                      elides an actor row (dietRow), WsTransport inflates it
//                      back (dietInflate) before any subscriber sees it, so
//                      every reader of a StateSnapshot reads the rows it
//                      always read. Positions ride a 1/posSteps px grid,
//                      facing 1/turnSteps of a turn, the hit flash and the
//                      pose scalars small integers; a false flag and a zero
//                      pool never ride. The frame names its own grid (`dz`).
//   THE IDENTITY ONCE  a body's identity (DIET_IDENTITY: its look, name,
//                      team, maxima...) rides the first frame a socket hears
//                      it in and every frame after it changed; between, the
//                      row says `k` and the client's memo (DietMemo, per
//                      socket, kept for exactly the bodies of the last frame)
//                      restores it. A miss asks the shard to resend (`rs`).
//   THE DRESS DELTA    `dd` rows (dressKey: a doodad's position as the zone
//                      message ships it, and its kind) add, remove and
//                      replace doodads and plan structures; applyDressDelta
//                      lays them into the shell's ground and re-derives what
//                      applyZone would (the bridge and ground lists, the
//                      registered doodad families).
//   THE LITE GLIDE     a lite body's wire id (`lt.i`) lets the shell glide
//                      it like a flight (glideLite, THE FORWARD LAW).
//   THE ACK            the client's echo of the newest snapshot it applied
//                      (WsTransport): the shard's flow control reads it.
//
// Every path is gated on a row only the shard writes (`dz`, `dd`, `lt.i`):
// solo, the co-op host and the WebRTC lane never meet one (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { Doodad, PlacedStructure } from '../engine/levelgen';
import type { ActorW, DoodadW, StateSnapshot } from './snapshot';

export const WIRE_DIET_CFG = {
  /** The diet on a hosted world's per-socket path (false = the pre-diet frames, for A/B). */
  enabled: true,
  /** INTEREST: a seat's frame carries the bodies, flights, numbers, flashes, ground rows,
   *  drops and lite bodies within this many px of its hero or a party mate's (its court
   *  always rides). 0 = twice THE NEAR LAW's radius (COOP_SCALING.shareRadius: 3200 px on a
   *  shard); 0 there too = everything (no interest cut). */
  reachPx: 0,
  /** QUANTIZATION: an actor row's position on a 1/posSteps px grid (4 = 0.25 px). */
  posSteps: 4,
  /** ...its facing (and a pose's angles) on 1/turnSteps of a turn. */
  turnSteps: 512,
  /** FLOW CONTROL: a socket that acked once is skipped while more than this many frames
   *  written to it wait for its ack (THE ACK; frames, never ticks: a skipped gap holds none),
   *  so a slow link never queues seconds of snapshots; skipped beats carry their changed own
   *  rows forward. */
  maxUnacked: 3,
  /** THE ACK: a client acknowledges on its own small message once this many snapshots arrived
   *  with no input to carry the echo (a menu, a fallen hero, a hidden tab); held at or below
   *  maxUnacked + 1, so a quiet client never starves under the window. */
  ackEvery: 2,
  /** THE DRESS LEDGER: revisions kept per World; a socket further behind hears the whole zone. */
  dressLog: 96,
};

/** THE CODEC's grid a frame was written on: [posSteps, turnSteps] (a frame names its own). */
export type DietGrid = [number, number];

declare module './snapshot' {
  interface StateSnapshot {
    /** THE WIRE DIET: the frame's codec grid (shard only; WsTransport inflates and strikes it). */
    dz?: DietGrid;
    /** THE DRESS DELTA (shard only): the doodads and structures that changed since this socket's
     *  last delivered frame. Absent = no change. */
    dd?: DressDeltaW;
  }
  interface ActorW {
    /** THE FAR ROSTER (shard only): a far seat's hero, its position, name and pools alone. */
    fr?: 1;
    /** THE IDENTITY ONCE (shard only, struck by the client): this row's identity is the one the
     *  socket already holds. */
    k?: 1;
  }
}

/** THE DRESS DELTA on the wire. */
export interface DressDeltaW {
  /** Doodads removed, one dressKey per piece (applied first). */
  r?: string[];
  /** Doodads added, in the zone message's own row shape. */
  a?: DoodadW[];
  /** Plan structures removed, by id (applied before `sa`). */
  sr?: string[];
  /** Plan structures added or replaced, whole. */
  sa?: PlacedStructure[];
}

/** A doodad's key on both sides of the wire: its position as the zone message ships it
 *  (snapshot.ts v2: two decimals) and its kind. The shell keys the numbers it was shipped. */
export function dressKey(x: number, y: number, kind: string): string {
  return x + ',' + y + ',' + kind;
}

// ------------------------------------------------------------------- THE CODEC --

const TAU = Math.PI * 2;
/** The flags a row elides when false, and the pools it elides when zero. */
const DIET_FALSE = ['downed', 'dead', 'mn', 'passive', 'ut'] as const;
const DIET_ZERO = ['es', 'maxEs'] as const;
const r2 = (n: number): number => Math.round(n * 100) / 100;
/** THE IDENTITY ONCE: the row fields that hold still from frame to frame (a change resends them). */
export const DIET_IDENTITY = ['r', 'c', 'sh', 'team', 'name', 'maxLife', 'maxEs', 'mn', 'passive', 'mat', 'lk', 'ep', 'rarity',
  'defId', 'cosmeticSourceSkill', 'faction', 'cosmeticKind', 'cosmeticLoadout', 'adorn', 'bv', 'encounterGroup'] as const;

/** THE IDENTITY ONCE, the shard's half: an encoded row's identity as one comparable string. */
export function dietIdentity(o: Record<string, unknown>): string {
  return JSON.stringify(DIET_IDENTITY.map(k => (o[k] === undefined ? null : o[k])));
}
/** THE IDENTITY ONCE, the shard's half: an encoded row with its identity struck (`k`: the
 *  client's memo holds it). */
export function dietKept(o: Record<string, unknown>): Record<string, unknown> {
  const c: Record<string, unknown> = { ...o, k: 1 };
  for (const f of DIET_IDENTITY) delete c[f];
  return c;
}
/** THE IDENTITY ONCE, the client's half: one socket's memo of the identities it holds (the
 *  bodies of its last frame), and a miss to report (`rs` on the next ack). */
export interface DietMemo { ids: Map<number, Record<string, unknown>>; miss: boolean }
export function dietMemo(): DietMemo { return { ids: new Map(), miss: false }; }

/** The grid this build writes. */
export function dietGrid(): DietGrid { return [WIRE_DIET_CFG.posSteps, WIRE_DIET_CFG.turnSteps]; }

/** THE CODEC, the shard's half: one actor row, quantized and elided (a fresh object; the
 *  canonical row is untouched). */
export function dietRow(a: ActorW, g: DietGrid): Record<string, unknown> {
  const [ps, ts] = g, turn = ts / TAU;
  const o = { ...a } as Record<string, unknown>;
  o.p = [Math.round(a.p[0] * ps), Math.round(a.p[1] * ps)];
  o.f = Math.round(a.f * turn);
  for (const k of DIET_FALSE) if (o[k] === false) delete o[k];
  for (const k of DIET_ZERO) if (o[k] === 0) delete o[k];
  // The hit flash on hundredths, rounded up: a flash still burning never reads as none.
  if (a.hf > 0) o.hf = Math.ceil(a.hf * 100); else delete o.hf;
  if (a.bodyWalkPose) {
    const w = a.bodyWalkPose;
    o.bw = [Math.round(w.travel * 100), Math.round(w.direction * turn), Math.round(w.weight * 100)];
    delete o.bodyWalkPose;
  }
  if (a.bodyActionPose) {
    const b = a.bodyActionPose;
    o.ba = [Math.round(b.shift * 1000), Math.round(b.turn * 1000), Math.round(b.sx * 1000), Math.round(b.sy * 1000),
      Math.round(b.facing * turn), b.prepare === undefined ? null : Math.round(b.prepare * 100), b.strike === undefined ? null : Math.round(b.strike * 100)];
    delete o.bodyActionPose;
  }
  if (a.worm) o.worm = { ...a.worm, seg: a.worm.seg.map(s => [Math.round(s[0] * ps), Math.round(s[1] * ps)]) };
  if (a.st) o.st = a.st.map(s => (s.statusDuration !== undefined ? { ...s, statusDuration: r2(s.statusDuration) } : s));
  if (a.concealmentExposedUntil !== undefined) o.concealmentExposedUntil = r2(a.concealmentExposedUntil);
  return o;
}

/** THE FAR ROSTER, the shard's half: a far seat's hero as a few fields (its place, its
 *  name, its pools), encoded on the same grid. */
export function dietFarRow(a: ActorW, g: DietGrid): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: a.id, p: [Math.round(a.p[0] * g[0]), Math.round(a.p[1] * g[0])], f: Math.round(a.f * g[1] / TAU),
    r: a.r, c: a.c, sh: a.sh, team: a.team, name: a.name, life: a.life, maxLife: a.maxLife, fr: 1,
  };
  if (a.es) o.es = a.es;
  if (a.maxEs) o.maxEs = a.maxEs;
  if (a.dead) o.dead = true;
  if (a.downed) o.downed = true;
  if (a.ut) o.ut = true;
  if (a.seat !== undefined) o.seat = a.seat;
  return o;
}

/** THE CODEC, the client's half (WsTransport, before any subscriber): a diet frame's actor
 *  rows back to the canonical ActorW, in place, and the grid mark struck. A frame with no
 *  mark (every other lane) is returned untouched. THE IDENTITY ONCE: a kept row (`k`) takes
 *  its identity from the socket's memo; a full row (never a far one) refreshes it; the memo
 *  keeps exactly this frame's bodies, as the shard's record of it does. */
export function dietInflate(s: StateSnapshot, memo?: DietMemo): StateSnapshot {
  const g = s.dz;
  if (!g) return s;
  delete s.dz;
  const ps = g[0] > 0 ? g[0] : 1, turn = TAU / (g[1] > 0 ? g[1] : 1);
  const seen = memo ? new Set<number>() : null;
  for (const row of s.actors) {
    const a = row as ActorW & Record<string, unknown>;
    if (memo && seen) {
      if (a.k !== undefined) {
        const id = memo.ids.get(a.id);
        if (id) Object.assign(a, id); else memo.miss = true;
        delete a.k;
      } else if (!a.fr) {
        const id: Record<string, unknown> = {};
        for (const f of DIET_IDENTITY) if (a[f] !== undefined) id[f] = a[f];
        memo.ids.set(a.id, id);
      }
      if (!a.fr) seen.add(a.id);
    }
    a.p = [a.p[0] / ps, a.p[1] / ps];
    a.f = a.f * turn;
    for (const k of DIET_FALSE) if (a[k] === undefined) a[k] = false;
    for (const k of DIET_ZERO) if (a[k] === undefined) a[k] = 0;
    a.hf = typeof a.hf === 'number' ? a.hf / 100 : 0;
    const bw = a.bw as number[] | undefined;
    if (bw) { a.bodyWalkPose = { travel: bw[0] / 100, direction: bw[1] * turn, weight: bw[2] / 100 }; delete a.bw; }
    const ba = a.ba as (number | null)[] | undefined;
    if (ba) {
      a.bodyActionPose = { shift: ba[0]! / 1000, turn: ba[1]! / 1000, sx: ba[2]! / 1000, sy: ba[3]! / 1000, facing: ba[4]! * turn,
        ...(ba[5] !== null && ba[5] !== undefined ? { prepare: ba[5] / 100 } : {}), ...(ba[6] !== null && ba[6] !== undefined ? { strike: ba[6] / 100 } : {}) };
      delete a.ba;
    }
    if (a.worm) a.worm.seg = a.worm.seg.map(p => [p[0] / ps, p[1] / ps]);
  }
  if (memo && seen) for (const id of [...memo.ids.keys()]) if (!seen.has(id)) memo.ids.delete(id);
  return s;
}

// --------------------------------------------------------- THE DRESS DELTA (client) --

/** Snapshots whose delta already landed (a re-adoption of the same snapshot never lays it twice). */
const DRESS_APPLIED = new WeakSet<object>();

/** A zone message row as the shell's doodad (applyZone's own mapping, snapshot.ts). */
function doodadOfW(d: DoodadW): Doodad {
  return {
    pos: { x: d.p[0], y: d.p[1] }, radius: d.r, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn,
    door: d.door, hitbox: d.hitbox, hollow: d.hollow, annex: d.annex, wild: d.wild, fall: d.fall,
  } as Doodad;
}

/** THE DRESS DELTA, the shell's half: lay a snapshot's `dd` into the shell's ground (its own
 *  zone's alone, once per snapshot): removals by key first, then the additions, then the plan
 *  structures; the bridge and ground lists re-derive and the touched kinds' doodad families
 *  move (the nav grid, the canopy index, the ground bake's gather). Runs before the doors,
 *  hollows, annexes, wells, felled and drying rows (adoptSnapshot), so their reconciles find
 *  the pieces it laid. True when anything changed. */
export function applyDressDelta(world: World, snap: StateSnapshot): boolean {
  const dd = snap.dd;
  if (!dd || DRESS_APPLIED.has(snap)) return false;
  if (world.appliedZoneId && snap.zoneId !== world.appliedZoneId) return false; // a stale zone's delta never touches this ground
  DRESS_APPLIED.add(snap);
  const touched: Doodad[] = [];
  if (dd.r?.length) {
    const byKey = new Map<string, Doodad[]>();
    for (const d of world.doodads) {
      if (d.well) continue; // pooled wells ride their own channel, never the dress
      const k = dressKey(d.pos.x, d.pos.y, d.kind);
      const list = byKey.get(k);
      if (list) list.push(d); else byKey.set(k, [d]);
    }
    const drop = new Set<Doodad>();
    for (const k of dd.r) {
      const d = byKey.get(k)?.pop();
      if (d) { drop.add(d); touched.push(d); }
    }
    if (drop.size) {
      let n = 0;
      const list = world.doodads;
      for (let i = 0; i < list.length; i++) if (!drop.has(list[i])) list[n++] = list[i];
      list.length = n;
    }
  }
  for (const w of dd.a ?? []) {
    const d = doodadOfW(w);
    world.doodads.push(d);
    touched.push(d);
  }
  if (dd.sr?.length || dd.sa?.length) {
    const gone = new Set([...(dd.sr ?? []), ...(dd.sa ?? []).map(s => s.id)]);
    world.structures = world.structures.filter(s => !gone.has(s.id)).concat(dd.sa ?? []); // a fresh list: structure caches key on it
  }
  if (!touched.length && !dd.sr?.length && !dd.sa?.length) return false;
  if (touched.length) world.markDoodadsChanged(touched); // only the touched kinds' families re-derive
  world.rebuildClientTerrain(); // the bridge and ground lists (applyZone's own re-derive)
  return true;
}

// ------------------------------------------------------------ THE LITE GLIDE (client) --

/** The shell's lite memory per render world (the flight ledger's idiom, snapshot.ts): where
 *  each body (wire id) was last DRAWN, where its glide started for the newest snapshot, and
 *  the drawn list the renderer reads. */
interface LiteLedger { snap: StateSnapshot | null; from: Map<number, [number, number]>; drawn: Map<number, [number, number]>; out: number[] }
const LITE_LEDGERS = new WeakMap<World, LiteLedger>();

/** THE LITE GLIDE (the eyes' timing, interpolateSnapshot): a body seen before glides by its
 *  wire id from where it was last drawn to the newest row, flies on past the newest snapshot
 *  along its own pace (its displacement since the previous row) for at most `aheadCap`
 *  seconds, and THE FORWARD LAW holds a body that flew past where the next row found it.
 *  A list with no ids (every other lane) is the verbatim mirror it always was. */
export function glideLite(world: World, prev: StateSnapshot | null, snap: StateSnapshot, alpha: number, ahead: number, aheadCap: number): void {
  const lt = snap.lt;
  if (!lt?.i || lt.i.length * 3 !== lt.b.length) return;
  let l = LITE_LEDGERS.get(world);
  if (!l) { l = { snap: null, from: new Map(), drawn: new Map(), out: [] }; LITE_LEDGERS.set(world, l); }
  if (l.snap !== snap) { l.snap = snap; l.from = l.drawn; l.drawn = new Map(); }
  const lerping = !!prev && alpha < 1;
  const span = prev ? snap.time - prev.time : 0;
  let prevAt: Map<number, [number, number]> | null = null;
  if (prev?.lt?.i && span > 0) {
    prevAt = new Map();
    for (let j = 0; j < prev.lt.i.length; j++) prevAt.set(prev.lt.i[j], [prev.lt.b[j * 3 + 1], prev.lt.b[j * 3 + 2]]);
  }
  const flyOn = Math.min(Math.max(0, ahead), aheadCap);
  const out = l.out;
  out.length = lt.b.length;
  for (let j = 0; j < lt.i.length; j++) {
    const id = lt.i[j], x = lt.b[j * 3 + 1], y = lt.b[j * 3 + 2];
    const pp = prevAt?.get(id);
    const vx = pp ? (x - pp[0]) / span : 0, vy = pp ? (y - pp[1]) / span : 0;
    let gx = x, gy = y;
    const from = l.from.get(id) ?? pp;
    if (lerping && from) { gx = from[0] + (x - from[0]) * alpha; gy = from[1] + (y - from[1]) * alpha; }
    else if (flyOn > 0 && pp) { gx = x + vx * flyOn; gy = y + vy * flyOn; }
    const last = l.drawn.get(id) ?? l.from.get(id);
    if (last && pp && (gx - last[0]) * vx + (gy - last[1]) * vy < 0) { gx = last[0]; gy = last[1]; } // THE FORWARD LAW
    l.drawn.set(id, [gx, gy]);
    out[j * 3] = lt.b[j * 3]; out[j * 3 + 1] = gx; out[j * 3 + 2] = gy;
  }
  world.liteWire = { k: lt.k, b: out, i: lt.i };
}
