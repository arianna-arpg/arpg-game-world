// ---------------------------------------------------------------------------
// NetTransport — the SEAM where networking plugs in, shaped to fit WebRTC
// host-authoritative co-op WITHOUT implementing any of it yet. The host runs the
// one real simulation; clients send their per-frame intent and receive state.
//
// This milestone ships only the interface + a LocalTransport stub (see local.ts)
// that runs single-player today and lets a local stand-in ally exercise the
// multi-seat path. A future WebRtcTransport implements the same contract:
// signaling + DataChannels, host = authority. Nothing above this interface
// (engine, main loop) changes when that lands.
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
 *   newRun  (host→a client): you're (re)seated as `seat` in the host's new run.
 *   action  (client→host):  a meta mutation (spend a point, learn/socket, drop a
 *                           gem) for MY seat — the host validates + applies it. */
export type SessionMsg =
  | { t: 'runEnd' }
  | { t: 'rejoin'; classId: string }
  | { t: 'newRun'; seat: PlayerId }
  | { t: 'action'; action: MetaAction };

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
}
