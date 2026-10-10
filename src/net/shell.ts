// ---------------------------------------------------------------------------
// THE SMOOTH SHELL (docs/engine/shard.md "The pieces"; the shard sync pass B,
// items 9, 11, 5 and 6): how a render shell turns a 20 Hz wire into a world
// that moves at frame rate, answers its own hands at once, and rides out a
// silent or broken link without leaving. One class, WireShell, holds the
// client's whole timeline; main.ts feeds it arrivals, local frames and inputs,
// and THE RETURN's socket work lives in WsTransport.resumeInPlace.
//
//   THE SPLIT           a snapshot is ADOPTED once, when it arrives
//                       (snapshot.ts adoptSnapshot: every row that is state),
//                       and each frame only places what was adopted
//                       (interpolateSnapshot).
//   THE ECHO LAW        every client action carries a rising seq; the host
//                       echoes the newest it judged on the seat's own build
//                       (SeatMetaW.as); an own build or own mark older than the
//                       shell's newest optimistic action never overwrites the
//                       optimistic state (the ping row's old clock rule is now
//                       one lane of it). An action unechoed for echoHoldMs
//                       stops holding (a lost action, an older host).
//   THE JITTER BUFFER   a ring of snapshots; remote bodies render at the
//                       server's estimated clock less delayMs, between the two
//                       snapshots bracketing that time, on a render clock bent
//                       at most +-dilation to hold the depth. Starved, a body
//                       runs on at most extrapolateMs past the newest snapshot,
//                       then holds; the clock never runs backward. Flights,
//                       ground telegraphs and the drawn clock keep THE WIRE'S
//                       EYES' present-time glide over the newest pair (a dodge
//                       reads where the bolt truly is).
//   THE SOFT CORRECTION the own hero's corrections under offsetSnapPx glide out
//                       over offsetDecayMs as a render offset (snap above);
//                       the camera follows on a critically damped spring
//                       (render/camera.ts CAMERA_FOLLOW_CFG).
//   THE WATCHDOG        stallMs without a snapshot strains the frame (a drawn
//                       cue, no text: renderer.linkStrain) and stills the
//                       hero's walk; reconnectMs, or a closed socket, starts
//                       THE RETURN (main.ts).
//   THE PREDICTED ROOT  a press of an affordable cast that is off its known
//                       cooldown starts a local cast stub (bar and pose); a
//                       rooting one stops replaying the moves after the press;
//                       the host's cast row reconciles it, and a press the host
//                       never cast ends after the measured RTT + rootGraceMs.
//                       Dashes and leaps stay as they are.
//
// Every path here runs on a client shell alone: solo and every host never
// build a WireShell (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import type { Actor, CastingState } from '../engine/actor';
import type { World } from '../engine/world';
import { instanceCastMode, instanceConvert, instanceDelivery, instanceStrikeTiming, instanceTrigger, type SkillInstance } from '../engine/skills';
import { replenishingDelivery } from '../engine/replenishment';
import type { MetaAction, PlayerInput } from './intent';
import { adoptSnapshot, interpolateSnapshot, isWireCast, tickNetClocks, type InterpFrame, type StateSnapshot } from './snapshot';
import { applyOwnSeatRows } from './seatView';
import { applyOwnReviveRow } from './partyReads'; // THE PARTY THAT READS: the revive row (SeatW.rv)
import { faceOwnAim, replayOwnFrames, type PredictFrame } from './predict';

export const WIRE_SHELL_CFG = {
  /** THE JITTER BUFFER: snapshots kept (about 0.4 s at 20 Hz). */
  ring: 8,
  /** Remote bodies render this many ms behind the server's estimated clock. */
  delayMs: 100,
  /** The render clock bends at most this share of real time (0.05 = +-5%) to hold the depth. */
  dilation: 0.05,
  /** The bend per second of depth error (1: a 50 ms error bends the full 5%). */
  dilationGain: 1,
  /** A render clock this far behind its target re-seats at once (a join, a long stall). Never backward. */
  reseatMs: 250,
  /** Starved, a body runs on along its velocity at most this far past the newest snapshot, then holds. */
  extrapolateMs: 100,
  /** The server clock is the earliest-arrival line (host time less local time) over this many
   *  recent arrivals (40 = 2 s at 20 Hz), so a slower path is followed within the window; a
   *  silence past stallMs starts a fresh line (the host's clock may have slipped against ours). */
  clockWindow: 40,
  /** A snapshot whose clock runs this far behind the newest is a new world: the timeline restarts (s). */
  rewindSec: 1,
  /** THE SOFT CORRECTION: an own-hero correction under this many px glides out; at or above it, a snap. */
  offsetSnapPx: 64,
  /** ...over about this long (95% of it gone). */
  offsetDecayMs: 120,
  /** THE WATCHDOG: no snapshot for this long strains the frame and stills the hero's walk. */
  stallMs: 1500,
  /** ...and this long starts THE RETURN (a closed socket starts it at once). */
  reconnectMs: 5000,
  /** The strain's rise from stallMs to its full weight (ms). */
  strainRiseMs: 1200,
  /** THE ECHO LAW: an optimistic action unechoed this long stops holding the wire (ms). */
  echoHoldMs: 3000,
  /** THE PREDICTED ROOT: a predicted cast the host never cast ends after the measured RTT plus this (ms). */
  rootGraceMs: 100,
  /** The RTT the shell assumes before it measured one (ms), and a new sample's weight. */
  rttMs: 120, rttBlend: 0.2,
  /** THE HONEST INPUT's replay ring (frames, about 4 s at 60 fps). */
  predictBuffer: 240,
};
export type WireShellCfg = typeof WIRE_SHELL_CFG;

// ------------------------------------------------------------ THE JITTER BUFFER --

/** Insert a snapshot in host-time order (newest last), keeping at most `cap`. A snapshot
 *  at a time the ring already holds is a duplicate (false). */
export function ringPush(ring: StateSnapshot[], s: StateSnapshot, cap: number): boolean {
  let i = ring.length;
  while (i > 0 && ring[i - 1].time > s.time) i--;
  if (i > 0 && ring[i - 1].time === s.time) return false;
  ring.splice(i, 0, s);
  while (ring.length > cap) ring.shift();
  return true;
}

/** The pair bracketing render time `t`: prev.time <= t < next.time and the fraction between
 *  them. Past the newest: the newest, `ahead` the seconds past it (capped at `runOnCap`).
 *  Before the oldest: the oldest, standing. Null for an empty ring. */
export function ringBracket(ring: readonly StateSnapshot[], t: number, runOnCap: number): InterpFrame | null {
  const n = ring.length;
  if (!n) return null;
  if (t >= ring[n - 1].time) {
    return { prev: n > 1 ? ring[n - 2] : null, snap: ring[n - 1], alpha: 1, ahead: Math.min(runOnCap, t - ring[n - 1].time) };
  }
  if (t <= ring[0].time) return { prev: null, snap: ring[0], alpha: 1, ahead: 0 };
  let i = n - 1;
  while (i > 0 && ring[i - 1].time > t) i--;
  const a = ring[i - 1], b = ring[i];
  return { prev: a, snap: b, alpha: (t - a.time) / (b.time - a.time), ahead: 0 };
}

/** THE JITTER BUFFER's render clock, in host seconds. `offset` = the earliest-arrival line
 *  (host time less local seconds, the most of the recent `samples`): the server's clock now is
 *  local + offset. */
export interface RenderClock { t: number; seated: boolean; offset: number; hasOffset: boolean; bend: number; samples: number[]; lastLocal: number }
export function newRenderClock(): RenderClock { return { t: 0, seated: false, offset: 0, hasOffset: false, bend: 0, samples: [], lastLocal: -Infinity }; }

/** An arrival: the earliest-arrival line over the window (a snapshot that came sooner lifts
 *  it at once; a slower path lowers it as the old arrivals leave the window). A silence past
 *  stallMs starts a fresh line. */
export function clockSample(c: RenderClock, hostTime: number, localSec: number, cfg: WireShellCfg = WIRE_SHELL_CFG): void {
  if (localSec - c.lastLocal > cfg.stallMs / 1000) c.samples.length = 0;
  c.lastLocal = localSec;
  c.samples.push(hostTime - localSec);
  if (c.samples.length > cfg.clockWindow) c.samples.shift();
  c.offset = Math.max(...c.samples);
  c.hasOffset = true;
}

/** One frame of the render clock: aim at the server's clock less the delay, bend the pace
 *  at most +-dilation toward it, re-seat when far behind (never backward), and never run
 *  more than extrapolateMs past the newest snapshot (starved: then hold). */
export function clockAdvance(c: RenderClock, dt: number, localSec: number, newestTime: number, cfg: WireShellCfg = WIRE_SHELL_CFG): void {
  if (!c.hasOffset) return;
  const target = localSec + c.offset - cfg.delayMs / 1000;
  const cap = newestTime + cfg.extrapolateMs / 1000;
  if (!c.seated) { c.t = Math.min(target, cap); c.seated = true; c.bend = 0; return; }
  const err = target - c.t;
  if (err > cfg.reseatMs / 1000) { c.t = Math.min(target, cap); c.bend = 0; return; }
  c.bend = Math.max(-cfg.dilation, Math.min(cfg.dilation, err * cfg.dilationGain));
  const next = c.t + Math.max(0, dt) * (1 + c.bend);
  c.t = Math.max(c.t, Math.min(next, cap)); // starved: hold at the cap; never backward
}

// ------------------------------------------------------- THE SOFT CORRECTION --

/** The own hero's render offset: where it is drawn less where it is predicted. */
export interface RenderOffset { x: number; y: number }
/** A correction: the prediction moved under the hero by (cx, cy). Under offsetSnapPx the
 *  offset carries it (the hero glides); at or above it, the hero snaps. */
export function offsetCorrect(o: RenderOffset, cx: number, cy: number, cfg: WireShellCfg = WIRE_SHELL_CFG): void {
  if (Math.hypot(cx, cy) >= cfg.offsetSnapPx) { o.x = 0; o.y = 0; return; }
  o.x += cx; o.y += cy;
  const m = Math.hypot(o.x, o.y);
  if (m > cfg.offsetSnapPx) { o.x *= cfg.offsetSnapPx / m; o.y *= cfg.offsetSnapPx / m; }
}
/** The offset decays toward zero, 95% gone over offsetDecayMs. */
export function offsetDecay(o: RenderOffset, dt: number, cfg: WireShellCfg = WIRE_SHELL_CFG): void {
  const k = Math.exp(-Math.max(0, dt) * 3000 / Math.max(1, cfg.offsetDecayMs));
  o.x *= k; o.y *= k;
  if (Math.abs(o.x) < 0.01 && Math.abs(o.y) < 0.01) { o.x = 0; o.y = 0; }
}

// -------------------------------------------------------------- THE ECHO LAW --

/** Per lane, the newest optimistic action (its seq and when it was sent); `seq` counts every
 *  action sent, `echo` the newest the host judged. */
export interface EchoLedger { seq: number; echo: number; meta: number; metaAt: number; ping: number; pingAt: number }
export function newEchoLedger(): EchoLedger { return { seq: 0, echo: 0, meta: 0, metaAt: 0, ping: 0, pingAt: 0 }; }
/** An action leaves: its seq. An optimistic one marks its lane (a ping, or the build). */
export function echoNote(l: EchoLedger, lane: 'meta' | 'ping' | 'none', nowMs: number): number {
  const seq = ++l.seq;
  if (lane === 'meta') { l.meta = seq; l.metaAt = nowMs; }
  else if (lane === 'ping') { l.ping = seq; l.pingAt = nowMs; }
  return seq;
}
/** The host's echo heard (on the seat's own build). */
export function echoHear(l: EchoLedger, as: number | undefined): void {
  if (typeof as === 'number' && Number.isFinite(as) && as > l.echo) l.echo = as;
}
/** Does the lane's optimistic action still outrank the wire (unjudged, inside echoHoldMs)? */
export function echoHolds(l: EchoLedger, lane: 'meta' | 'ping', nowMs: number, cfg: WireShellCfg = WIRE_SHELL_CFG): boolean {
  const seq = lane === 'meta' ? l.meta : l.ping, at = lane === 'meta' ? l.metaAt : l.pingAt;
  return seq > l.echo && nowMs - at < cfg.echoHoldMs;
}

// --------------------------------------------------------------- THE WATCHDOG --

export type LinkPhase = 'live' | 'strained' | 'lost';
/** The link's phase from the ms since the last snapshot (live until the first one lands). */
export function linkPhaseOf(sinceMs: number, cfg: WireShellCfg = WIRE_SHELL_CFG): LinkPhase {
  return !(sinceMs >= cfg.stallMs) ? 'live' : sinceMs >= cfg.reconnectMs ? 'lost' : 'strained';
}
/** The drawn strain, 0..1: none while live, rising over strainRiseMs past stallMs. */
export function linkStrainOf(sinceMs: number, cfg: WireShellCfg = WIRE_SHELL_CFG): number {
  if (!(sinceMs > cfg.stallMs)) return 0;
  return Math.min(1, (sinceMs - cfg.stallMs) / Math.max(1, cfg.strainRiseMs));
}

// ---------------------------------------------------------- THE PREDICTED ROOT --

/** The cast a press of `inst` would start on the host, as the shell can know it: a plain
 *  cast bar (no strike timing, conversion, trigger, replenishment, hive art or movement
 *  delivery), off its known cooldown, affordable, with the body free. Its bar's length, or
 *  null when the shell should not predict it (the host decides; the wire reconciles). */
export function predictableCast(p: Actor, inst: SkillInstance): number | null {
  try {
    if (p.dead || p.downed || p.casting || p.dash || p.leap) return null;
    if (instanceCastMode(inst) !== 'cast' || instanceStrikeTiming(inst) || instanceConvert(inst)
      || inst.def.mimic || inst.def.hivecall || instanceTrigger(inst) || replenishingDelivery(inst)) return null;
    const d = instanceDelivery(inst).type;
    if (d === 'dash' || d === 'leap' || d === 'blink' || d === 'carom' || inst.def.tags?.includes('movement')) return null;
    if (p.cooldowns.has(inst.def.id) || !p.canAfford(p.skillCost(inst))) return null;
    const t = p.skillUseTime(inst);
    if (!(t > 0.001) || !p.canUse(inst)) return null;
    return Math.max(0.2, t); // useSkill's own bar floor
  } catch {
    return null; // a read the shell cannot make (a display stub): the host decides
  }
}

interface PredictedRoot { seq: number; atMs: number; stub: CastingState; skillId: string }
/** The own hero's running cast as the shell clocks it between snapshots (never backward). */
interface OwnCastClock { sk?: string; mode: string; total: number; elapsed: number; rowElapsed: number }
/** Cast modes whose bar the shell runs on its own clock between snapshots. */
const CLOCKED = new Set(['cast', 'perfect', 'timed', 'multitude']);

// ------------------------------------------------------------------ WireShell --

/** One client's timeline (the shell's half of a hosted session). */
export class WireShell {
  readonly ring: StateSnapshot[] = [];
  /** The newest adopted snapshot (the state the shell shows). */
  latest: StateSnapshot | null = null;
  private prevAdopted: StateSnapshot | null = null;
  clock: RenderClock = newRenderClock();
  echo: EchoLedger = newEchoLedger();
  readonly offset: RenderOffset = { x: 0, y: 0 };
  /** The render shell the arrivals adopt into (null until main.ts stands it up). */
  world: World | null = null;
  /** Called once per adoption (the probe's count). */
  onAdopt: ((s: StateSnapshot) => void) | null = null;
  /** Local ms of the newest arrival (-Infinity: none yet, the link reads live). */
  lastArrivalMs = -Infinity;
  /** The measured round trip (ms), from the input acks. */
  rttMs: number;
  /** THE PREDICTED ROOT standing, if any. */
  root: PredictedRoot | null = null;
  // THE WIRE'S EYES' glide: seconds since the newest adoption.
  private eyesSec = 0;
  // THE HONEST INPUT's prediction (main.ts kept it before this shell).
  inputSeq = 0;
  readonly history: PredictFrame[] = [];
  private sentAt: { seq: number; at: number }[] = [];
  private predZone = '';
  private aim: { x: number; y: number } | null = null;
  private walked = 0;
  // THE SOFT CORRECTION: last frame's prediction (no offset) and the newest seq it held.
  private predicted: { x: number; y: number } | null = null;
  private predictedSeq = 0;
  private ownCast: OwnCastClock | null = null;

  constructor(readonly cfg: WireShellCfg = WIRE_SHELL_CFG) { this.rttMs = cfg.rttMs; }

  /** Forget the whole timeline (a session's end, a new one's start). */
  reset(): void {
    this.ring.length = 0; this.latest = null; this.prevAdopted = null;
    this.clock = newRenderClock(); this.lastArrivalMs = -Infinity;
    this.world = null;
    this.resetSession();
  }

  /** The session-scoped half (a new shell, a resume): the host counts this seat's inputs and
   *  actions from zero again, and nothing predicted outlives it. */
  private resetSession(): void {
    this.echo = newEchoLedger();
    this.offset.x = 0; this.offset.y = 0;
    this.inputSeq = 0; this.history.length = 0; this.sentAt.length = 0;
    this.predZone = ''; this.aim = null; this.walked = 0;
    this.predicted = null; this.predictedSeq = 0; this.root = null; this.ownCast = null;
    this.rttMs = this.cfg.rttMs; this.eyesSec = 0;
  }

  /** The render shell stands (main.ts startAsClient): adopt into it, starting with the newest
   *  snapshot already here. */
  attach(world: World): void {
    this.resetSession();
    this.world = world;
    if (this.latest) this.adopt(this.latest, this.prevAdopted, performance.now());
  }

  /** THE RETURN landed: the same seat on a new socket (WsTransport.resumeInPlace). The link
   *  reads strained (its strain starting over, the walk still) until the first snapshot lands,
   *  and lost again if none comes (THE RETURN tries anew). */
  resumed(nowMs: number): void {
    this.resetSession();
    this.lastArrivalMs = nowMs - this.cfg.stallMs;
    this.clock.seated = false;
  }

  /** The link's phase (THE WATCHDOG): live until the first snapshot lands. */
  phase(nowMs: number): LinkPhase { return this.lastArrivalMs === -Infinity ? 'live' : linkPhaseOf(nowMs - this.lastArrivalMs, this.cfg); }
  /** The drawn strain, 0..1 (none before the first snapshot). */
  strain(nowMs: number): number { return this.lastArrivalMs === -Infinity ? 0 : linkStrainOf(nowMs - this.lastArrivalMs, this.cfg); }

  /** THE ECHO LAW: an action leaves (World.clientActionHook): its seq rides the session message. */
  noteAction(nowMs: number): number { return echoNote(this.echo, 'none', nowMs); }
  /** THE ECHO LAW: the action just sent was ALSO applied locally (World.clientOptimistic): its
   *  lane (a ping's mark, else the build) holds against the wire until the host echoes it. */
  noteOptimistic(action: MetaAction, nowMs: number): void {
    const l = this.echo;
    if (action.t === 'ping') { l.ping = l.seq; l.pingAt = nowMs; } else { l.meta = l.seq; l.metaAt = nowMs; }
  }

  /** A snapshot arrives: into the ring, the clock's line, the RTT, the echo, and ADOPTED once
   *  (THE SPLIT) when it is the newest. Returns whether the own build was adopted. */
  arrive(s: StateSnapshot, nowMs: number): { metaApplied: boolean } {
    const cfg = this.cfg;
    if (this.latest && s.time < this.latest.time - cfg.rewindSec) {
      // A new world's clock (a host that restarted its run): the timeline restarts with it.
      this.ring.length = 0; this.clock = newRenderClock(); this.latest = null; this.prevAdopted = null;
    } else if (this.latest && s.zoneId !== this.latest.zoneId && s.time > this.latest.time) {
      // A new place: nothing glides across a zone change (a party member's old spot is no
      // bracket for its new one), so the ring and the glide restart there.
      this.ring.length = 0; this.clock.seated = false; this.prevAdopted = null;
    }
    ringPush(this.ring, s, cfg.ring);
    clockSample(this.clock, s.time, nowMs / 1000, cfg);
    this.lastArrivalMs = nowMs;
    if (this.latest && s.time <= this.latest.time) return { metaApplied: false }; // an older snapshot only fills the bracket
    const seat = this.world?.clientSeatId;
    const own = seat !== undefined ? s.seats[seat] : undefined;
    if (own?.seq !== undefined) this.sampleRtt(own.seq, nowMs);
    if (seat !== undefined) echoHear(this.echo, s.seatMeta?.[seat]?.as);
    let metaApplied = false;
    if (this.world) metaApplied = this.adopt(s, this.latest, nowMs);
    this.prevAdopted = this.latest;
    this.latest = s;
    this.eyesSec = 0;
    return { metaApplied };
  }

  private adopt(s: StateSnapshot, prev: StateSnapshot | null, nowMs: number): boolean {
    const w = this.world!;
    let metaApplied = false;
    adoptSnapshot(w, s, prev, {
      metaGate: () => (metaApplied = !echoHolds(this.echo, 'meta', nowMs, this.cfg)),
      holdOwnPings: echoHolds(this.echo, 'ping', nowMs, this.cfg),
    });
    this.afterAdopt(s);
    this.onAdopt?.(s);
    return metaApplied;
  }

  /** The own hero's cast after an adoption: THE PREDICTED ROOT reconciles against the host's
   *  row (or stands while none came), and a running cast's bar keeps the shell's clock. */
  private afterAdopt(s: StateSnapshot): void {
    const w = this.world!, p = w.player;
    const row = s.actors.find(r => r.seat === w.clientSeatId)?.cast;
    const root = this.root;
    if (root) {
      if (row) {
        // The host cast: the wire's stub stands (with its cues), on the shell's clock.
        this.ownCast = { sk: row.sk, mode: row.mode, total: row.total, elapsed: Math.max(row.elapsed, root.stub.elapsed), rowElapsed: row.elapsed };
        this.root = null;
      } else {
        p.casting = root.stub; // not yet: the stub stands, its pose with it
        p.bodyActionPose = undefined;
        return;
      }
    }
    const cs = p.casting;
    if (cs && row && isWireCast(cs)) {
      const c = this.ownCast;
      if (c && c.sk === row.sk && c.mode === row.mode && Math.abs(c.total - row.total) < 1e-3 && row.elapsed + 1e-3 >= c.rowElapsed) {
        cs.elapsed = Math.max(cs.elapsed, Math.min(cs.total, c.elapsed));
      }
      this.ownCast = { sk: row.sk, mode: row.mode, total: row.total, elapsed: cs.elapsed, rowElapsed: row.elapsed };
    } else {
      this.ownCast = null;
    }
  }

  private sampleRtt(ack: number, nowMs: number): void {
    let sample: number | null = null;
    while (this.sentAt.length && this.sentAt[0].seq <= ack) sample = nowMs - this.sentAt.shift()!.at;
    if (sample !== null && sample >= 0) this.rttMs += (sample - this.rttMs) * this.cfg.rttBlend;
  }

  /** A local frame's input leaves: THE HONEST INPUT's stamp (seq, dt), THE WATCHDOG's still
   *  hands (no walk while strained), THE PREDICTED ROOT's press, and the replay ring. */
  stampInput(li: PlayerInput, dt: number, nowMs: number): PlayerInput {
    li.seq = ++this.inputSeq;
    li.dt = dt;
    if (this.phase(nowMs) !== 'live') { li.dx = 0; li.dy = 0; }
    this.aim = li.aim;
    this.pressRoot(li, nowMs);
    this.history.push({ seq: li.seq, dx: li.dx, dy: li.dy, dt });
    if (this.history.length > this.cfg.predictBuffer) this.history.shift();
    this.sentAt.push({ seq: li.seq, at: nowMs });
    if (this.sentAt.length > this.cfg.predictBuffer) this.sentAt.shift();
    return li;
  }

  /** THE PREDICTED ROOT: a fresh press of an affordable, ready cast starts the local stub. */
  private pressRoot(li: PlayerInput, nowMs: number): void {
    const w = this.world;
    if (this.root || !w || !this.latest || !li.edge.some(Boolean)) return;
    const p = w.player, me = this.latest.seats[w.clientSeatId];
    if (!me || me.rooted || isWireCast(p.casting)) return;
    for (let i = 0; i < li.edge.length; i++) {
      if (!li.edge[i] || li.metaEdge?.[i]) continue;
      const inst = p.skills[i];
      const total = inst ? predictableCast(p, inst) : null;
      if (!inst || total === null) continue;
      const stub = { inst, mode: 'cast', aim: { x: li.aim.x, y: li.aim.y }, elapsed: 0, total, held: true, baseMult: 1 } as unknown as CastingState;
      this.root = { seq: li.seq!, atMs: nowMs, stub, skillId: inst.def.id };
      p.casting = stub;
      p.bodyActionPose = undefined; // the prepare pose reads the stub (bodyActionPoseOf)
      return;
    }
  }

  /** One render frame: the clocks, THE SPLIT's per-frame half (bodies on THE JITTER BUFFER,
   *  the eyes on the newest pair), the own hero's cast and seat rows, and the prediction. */
  frame(dt: number, nowMs: number): void {
    const w = this.world, s = this.latest;
    if (!w || !s) return;
    const cfg = this.cfg;
    tickNetClocks(w, dt); // THE WIRE'S EYES: the own hero's cooldowns run down between snapshots
    this.eyesSec += dt;
    const interval = this.prevAdopted ? Math.max(1 / 60, Math.min(0.25, s.time - this.prevAdopted.time)) : 1 / 20;
    const alpha = Math.min(1, this.eyesSec / interval), ahead = Math.max(0, this.eyesSec - interval);
    clockAdvance(this.clock, dt, nowMs / 1000, this.ring.length ? this.ring[this.ring.length - 1].time : s.time, cfg);
    const bodies = ringBracket(this.ring, this.clock.t, cfg.extrapolateMs / 1000) ?? undefined;
    interpolateSnapshot(w, this.prevAdopted, s, alpha, ahead, { bodies, runOn: cfg.extrapolateMs / 1000 });
    this.castFrame(dt, nowMs);
    applyOwnSeatRows(w, s); // THE ACTING SEAT: the own note over the own head, the low-life surge
    applyOwnReviveRow(w, s); // THE PARTY THAT READS: the revive ring, the bleed-out and the wipe radius
    this.predictOwnHero(dt);
  }

  /** The own hero's bar between snapshots, and THE PREDICTED ROOT's expiry. */
  private castFrame(dt: number, nowMs: number): void {
    const p = this.world!.player, root = this.root;
    if (root) {
      if (nowMs - root.atMs > this.rttMs + this.cfg.rootGraceMs) {
        // The host never cast: the stub goes, and the moves after the press replay again.
        if (p.casting === root.stub) p.casting = null;
        this.root = null;
      } else {
        root.stub.elapsed = Math.min(root.stub.total, root.stub.elapsed + dt);
      }
      return;
    }
    const cs = p.casting, c = this.ownCast;
    if (cs && c && isWireCast(cs) && CLOCKED.has(cs.mode)) {
      cs.elapsed = Math.min(cs.total, cs.elapsed + dt);
      c.elapsed = cs.elapsed;
    }
  }

  /** The own hero, PREDICTED (THE HONEST INPUT): anchored to the host's acked position, every
   *  unacked frame replayed through moveActor. THE SOFT CORRECTION: the frames the last
   *  prediction already held replay first; where they land against it is the correction,
   *  carried as a decaying render offset. THE PREDICTED ROOT: the frames after the press
   *  replay under the stub's cast (a rooting cast walks none of them). */
  private predictOwnHero(dt: number): void {
    const w = this.world!, s = this.latest!;
    const me = s.seats[w.clientSeatId];
    if (!me) return;
    const p = w.player;
    if (p.dead || p.downed) {
      // Nothing to predict: the hero lies where the host has it (its seat row, the newest).
      p.pos.x = me.pos[0]; p.pos.y = me.pos[1];
      this.offset.x = 0; this.offset.y = 0; this.predicted = null;
      return;
    }
    if (s.zoneId !== this.predZone) {
      // A zone change teleports us: the buffered inputs are the old zone's, and nothing glides across.
      this.predZone = s.zoneId; this.history.length = 0; this.offset.x = 0; this.offset.y = 0; this.predicted = null;
    }
    const ack = me.seq ?? 0;
    while (this.history.length && this.history[0].seq <= ack) this.history.shift();
    p.pos.x = me.pos[0]; p.pos.y = me.pos[1];
    // Skip the replay while ROOTED (stun/cast/dash) or on SLIPPERY ground (ice momentum the
    // client cannot reproduce), and under a cast the shell holds no instance for.
    const stub = isWireCast(p.casting) && typeof p.casting?.inst.def.id !== 'string';
    const replay = !me.rooted && !me.slippery && !stub;
    const held: PredictFrame[] = [], fresh: PredictFrame[] = [];
    for (const f of this.history) (f.seq <= this.predictedSeq ? held : fresh).push(f);
    if (replay) this.replay(held);
    const cx = this.predicted ? this.predicted.x - p.pos.x : 0, cy = this.predicted ? this.predicted.y - p.pos.y : 0;
    if (replay) this.replay(fresh);
    offsetDecay(this.offset, dt, this.cfg);
    if (this.predicted) offsetCorrect(this.offset, cx, cy, this.cfg);
    this.predicted = { x: p.pos.x, y: p.pos.y };
    this.predictedSeq = this.history.length ? this.history[this.history.length - 1].seq : ack;
    p.pos.x += this.offset.x; p.pos.y += this.offset.y;
    faceOwnAim(p, this.aim, !!me.rooted); // THE HONEST INPUT: the hero faces the aim it sends
  }

  /** Replay frames (THE HONEST INPUT), the ones after THE PREDICTED ROOT's press under its stub. */
  private replay(frames: PredictFrame[]): void {
    if (!frames.length) return;
    const w = this.world!, p = w.player, root = this.root;
    if (!root) { this.walked = replayOwnFrames(w, p, frames, this.walked); return; }
    const keep = p.casting;
    p.casting = keep === root.stub ? null : keep;
    this.walked = replayOwnFrames(w, p, frames.filter(f => f.seq <= root.seq), this.walked);
    p.casting = root.stub;
    this.walked = replayOwnFrames(w, p, frames.filter(f => f.seq > root.seq), this.walked);
    p.casting = keep;
  }
}
