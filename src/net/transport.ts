// ---------------------------------------------------------------------------
// NetTransport — the SEAM where networking plugs in. Host-authoritative: the
// host runs the one real simulation; clients send their per-frame intent and
// receive state. Nothing above this interface (engine, main loop) knows or cares
// which implementation is underneath.
//
// TWO implementations ship, both satisfying this contract:
//   LocalTransport  (local.ts)  — no wire at all. Single-player IS "host with
//                     one seat": the frame loop sends the local intent in and
//                     drains it straight back out; addLocalSeat registers the
//                     couch's stand-in peers on the same multi-seat path.
//   WebRtcTransport (webrtc.ts) — over-the-wire co-op: manual copy-paste
//                     signaling (no server), star topology, one reliable-ordered
//                     DataChannel per peer carrying everything as JSON.
//
// LIMITS of the wire implementation (honest, MVP — detail at the head of
// webrtc.ts): STUN-only (Google's public STUN, no TURN relay), so a minority of
// locked-down/symmetric NATs never connect; the reliable-ordered channel
// head-of-line blocks under heavy loss; and there is NO HOST MIGRATION — when
// the host goes, the session is over (the `hostLeft` arm + `onHostLost` below
// are how that ending is delivered instead of silently freezing).
//
// src/net/ imports TYPES only from the engine — never the renderer or DOM.
// ---------------------------------------------------------------------------

import type { PlayerId, PlayerInput, MetaAction } from './intent';

/** The host→client per-tick render state. Defined in snapshot.ts (the wire shape
 *  + serialize/apply live together); re-exported here so transport implementations
 *  and consumers can import it from one place. */
import type { StateSnapshot, ZoneMsg } from './snapshot';
export type { StateSnapshot, ZoneMsg };

/** A peer in the session (a hero seat's owner). */
export interface PeerInfo {
  id: PlayerId;
  name: string;
  classId: string;
  isHost: boolean;
}

/** Session-control (run LIFECYCLE) messages — distinct from the per-tick state.
 *  Lets a host's run end + restart flow to its clients WITHOUT a reload:
 *   runEnd  (host→clients): the run ended — clients leave the frozen render shell.
 *   rejoin  (client→host):  I picked a class for the next run — (re)seat me.
 *   newRun  (host→a client): you're (re)seated as `seat` in the host's new run,
 *                           whose world is built from `seed` (THE SEED THREAD).
 *   hostLeft(host→clients): the host quit the session. It is OVER, not
 *                           restarting — there is no host migration, so clients
 *                           fall back to a local transport at the start menu.
 *   action  (client→host):  a meta mutation (spend a point, learn/socket, drop a
 *                           gem) for MY seat — the host validates + applies it. */
export type SessionMsg =
  | { t: 'runEnd' }
  | { t: 'rejoin'; classId: string }
  | { t: 'newRun'; seat: PlayerId; seed: number }
  | { t: 'hostLeft' }
  | { t: 'action'; action: MetaAction };

/** THE SEED THREAD — a client's World must be minted from the HOST's run seed,
 *  never one of its own. `manifest.seed` drives the shared map (the starter web
 *  via randomizeStarterWeb, and every `manifest.seed ^ …` mint derivation
 *  after it), so two seeds are two different worlds from frame one.
 *
 *  The host's seed therefore rides the handshake at BOTH seating points: the
 *  `welcome` (a first join) and every `newRun` (a re-seat into the host's NEXT
 *  run — a different run with a freshly rolled manifest, which is exactly why
 *  newRun carries its own seed instead of the client re-using the welcome's).
 *
 *  Normalize every seed that arrives off the wire through this. JSON from a peer
 *  is untrusted, and a host on an older build sends no seed at all: a missing or
 *  non-finite value takes the caller's fallback (a fresh local roll — the map
 *  won't agree, but that is precisely the pre-thread status quo) rather than
 *  becoming a silent `NaN >>> 0` === 0 that every mismatched client shares. */
export function wireSeed(raw: unknown, fallback: number): number {
  return (typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback) >>> 0;
}

/** The networking contract. Host-authoritative: `sendInput` flows client→host,
 *  `sendState`/`onState` flow host→clients. `drainInputs` is the host pulling the
 *  latest intent per seat for this tick. */
export interface NetTransport {
  /** This client's own seat id. */
  readonly self: PlayerId;
  /** True if this client runs the authoritative simulation. */
  readonly isHost: boolean;

  peers(): PeerInfo[];

  /** Open a session as host; resolves with a shareable join code + our seat id. */
  host(info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ code: string; self: PlayerId }>;
  /** Join a host by code; resolves with our assigned seat id. */
  join(code: string, info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ self: PlayerId }>;
  /** Tear down the session. */
  leave(): void;

  /** Client→host: this seat's intent for the frame. */
  sendInput(seat: PlayerId, input: PlayerInput): void;
  /** Host: drain the latest intent per seat accumulated since last call. */
  drainInputs(): Map<PlayerId, PlayerInput>;

  /** Host→clients: broadcast a state snapshot (no-op locally). */
  sendState(snapshot: StateSnapshot): void;
  /** Client: subscribe to incoming state. Returns a disposer. */
  onState(cb: (snapshot: StateSnapshot) => void): () => void;

  /** Host→clients: send the one-time per-zone terrain message. */
  sendZone(zone: ZoneMsg): void;
  /** Client: subscribe to incoming zone terrain. Returns a disposer. */
  onZone(cb: (zone: ZoneMsg) => void): () => void;

  /** Roster change notifications. Each returns a disposer. */
  onPeerJoin(cb: (peer: PeerInfo) => void): () => void;
  onPeerLeave(cb: (id: PlayerId) => void): () => void;

  /** Session control (run lifecycle). Host→clients (runEnd) or host→one client
   *  (newRun, via `to`); client→host (rejoin). */
  sendSession(msg: SessionMsg, to?: PlayerId): void;
  /** Subscribe to session-control messages. `from` is the sender's seat id (the
   *  host is 'p0'; a client message carries the host-bound seat). Returns a disposer. */
  onSession(cb: (msg: SessionMsg, from: PlayerId) => void): () => void;

  /** CLIENT: the wire to the host DIED — a terminal connection state or a closed
   *  channel, with no `hostLeft` goodbye (host crashed, cable pulled, tab
   *  killed). Distinct from the message on purpose: a session message is a
   *  message, a dead connection is a transport event. Both land in the same
   *  place above, because with no host migration the only answer to either is to
   *  drop back to a local transport. Fires AT MOST ONCE and never for a teardown
   *  this side chose (`leave()`). Returns a disposer. */
  onHostLost(cb: () => void): () => void;
}
