// ---------------------------------------------------------------------------
// WsTransport — the CLIENT half of THE SHARD (docs/design/shard-world.md):
// host-authoritative play against a dedicated server over one WebSocket.
// It is the WebRtcTransport's client role with the signaling dance replaced
// by a URL: open the socket, send `join`, take the `welcome` (our seat + the
// shard's run seed — THE SEED THREAD), then ride the same message grammar
// the copy-paste lane rides (`WireMsg` below is webrtc.ts's NetMsg verbatim,
// re-declared here so the two lanes share no file; a later pass may hoist
// it). Everything above this interface — the render shell, prediction, the
// meta intents, the run-lifecycle channel — is unchanged, which is the whole
// point: a shard is a host that never leaves.
//
// Browser-safe (the native WebSocket); Node 22+ carries the same global, so
// the shard probe drives THIS class against an in-process server.
// ---------------------------------------------------------------------------

import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from './transport';
import type { PlayerId, PlayerInput } from './intent';

/** THE GRAMMAR — one JSON message per frame, both directions. */
export type WireMsg =
  | { t: 'join'; classId: string; name: string; cosmeticLoadout?: import('../engine/cosmetics').CosmeticLoadout }
  | { t: 'welcome'; self: PlayerId; peers: PeerInfo[]; seed: number; worldmass?: boolean; features?: string[] }
  | { t: 'input'; seat: PlayerId; input: PlayerInput }
  | { t: 'snap'; snap: StateSnapshot }
  | { t: 'zone'; zone: ZoneMsg }
  | { t: 'pjoin'; peer: PeerInfo }
  | { t: 'pleave'; id: PlayerId }
  | { t: 'session'; msg: SessionMsg };

export const WS_TRANSPORT_CFG = {
  /** Default address the lobby's "Join a Server" box offers. */
  defaultUrl: 'ws://localhost:8787',
};

export class WsTransport implements NetTransport {
  self: PlayerId = 'p0';
  readonly isHost = false;

  private ws: WebSocket | null = null;
  private peerList: PeerInfo[] = [];
  private readonly stateCbs = new Set<(s: StateSnapshot) => void>();
  private readonly zoneCbs = new Set<(z: ZoneMsg) => void>();
  private readonly joinCbs = new Set<(p: PeerInfo) => void>();
  private readonly leaveCbs = new Set<(id: PlayerId) => void>();
  private readonly sessionCbs = new Set<(m: SessionMsg, from: PlayerId) => void>();
  private readonly hostLostCbs = new Set<() => void>();
  /** True once the shard's welcome SEATED us (before that, a dead socket is
   *  the connect attempt's failure, never a lost host — the webrtc.ts rule). */
  private welcomed = false;
  /** Latched: one disappearance arrives as several events; a teardown WE
   *  chose (leave) never reports a lost host. */
  private hostGone = false;

  peers(): PeerInfo[] { return this.peerList; }

  host(): Promise<{ code: string; self: PlayerId }> {
    return Promise.reject(new Error('WsTransport is a client — the shard hosts'));
  }

  /** NetTransport's join: the code IS the server URL. */
  join(code: string, info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ self: PlayerId }> {
    return this.connect(code, info).then(r => ({ self: r.self }));
  }

  /** Open the socket and wait for the shard's welcome. Resolves with our seat
   *  id AND the shard's run seed (the lobby builds the render shell from it). */
  connect(url: string, info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ self: PlayerId; seed: number; worldmass: boolean; features: string[] }> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) { reject(e instanceof Error ? e : new Error(String(e))); return; }
      this.ws = ws;
      let settled = false;
      const fail = (why: string): void => { if (settled) return; settled = true; reject(new Error(why)); };
      ws.onopen = (): void => {
        ws.send(JSON.stringify({ t: 'join', classId: info.classId, name: info.name, cosmeticLoadout: info.cosmeticLoadout } satisfies WireMsg));
      };
      ws.onmessage = (ev): void => {
        let m: WireMsg;
        try { m = JSON.parse(String(ev.data)) as WireMsg; } catch { return; }
        if (m.t === 'welcome') {
          this.self = m.self; this.peerList = m.peers; this.welcomed = true;
          if (!settled) {
            settled = true;
            // THE SHARD'S TOWN FEATURES: the account features that size the hearth
            // (townTier) — a wilds shell builds its World with these so the seed
            // lays the SAME settlement the server laid (strings only, sanitized).
            const features = Array.isArray(m.features) ? m.features.filter((f): f is string => typeof f === 'string').slice(0, 256) : [];
            resolve({ self: m.self, seed: m.seed, worldmass: m.worldmass === true, features });
          }
          return;
        }
        this.dispatch(m);
      };
      ws.onerror = (): void => {
        if (!this.welcomed) fail('could not reach the server');
        else if (ws.readyState !== WebSocket.OPEN) this.signalHostLost();
      };
      ws.onclose = (): void => {
        if (!this.welcomed) fail('the server closed the connection before seating us');
        else this.signalHostLost();
      };
    });
  }

  private dispatch(m: WireMsg): void {
    switch (m.t) {
      case 'snap': this.stateCbs.forEach(cb => cb(m.snap)); break;
      case 'zone': this.zoneCbs.forEach(cb => cb(m.zone)); break;
      case 'pjoin':
        if (!this.peerList.some(p => p.id === m.peer.id)) this.peerList.push(m.peer);
        this.joinCbs.forEach(cb => cb(m.peer));
        break;
      case 'pleave':
        this.peerList = this.peerList.filter(p => p.id !== m.id);
        this.leaveCbs.forEach(cb => cb(m.id));
        break;
      case 'session': this.sessionCbs.forEach(cb => cb(m.msg, 'p0')); break; // from the shard (the host seat)
      default: break; // join/input/welcome never arrive at a client
    }
  }

  leave(): void {
    this.hostGone = true; // our own teardown — never a lost host
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { ws.close(1000, 'leave'); } catch { /* already closed */ } }
  }

  private send(m: WireMsg): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(m)); } catch { /* a closing socket drops the frame */ }
  }

  sendInput(seat: PlayerId, input: PlayerInput): void { this.send({ t: 'input', seat, input }); }
  /** A client never drains — the shard does. */
  drainInputs(): Map<PlayerId, PlayerInput> { return new Map(); }

  sendState(_s: StateSnapshot): void { /* the shard broadcasts; a client never does */ }
  onState(cb: (s: StateSnapshot) => void): () => void { this.stateCbs.add(cb); return () => { this.stateCbs.delete(cb); }; }
  sendZone(_z: ZoneMsg): void { /* the shard's business */ }
  onZone(cb: (z: ZoneMsg) => void): () => void { this.zoneCbs.add(cb); return () => { this.zoneCbs.delete(cb); }; }
  onPeerJoin(cb: (p: PeerInfo) => void): () => void { this.joinCbs.add(cb); return () => { this.joinCbs.delete(cb); }; }
  onPeerLeave(cb: (id: PlayerId) => void): () => void { this.leaveCbs.add(cb); return () => { this.leaveCbs.delete(cb); }; }
  sendSession(msg: SessionMsg): void { this.send({ t: 'session', msg }); }
  onSession(cb: (m: SessionMsg, from: PlayerId) => void): () => void { this.sessionCbs.add(cb); return () => { this.sessionCbs.delete(cb); }; }
  onHostLost(cb: () => void): () => void { this.hostLostCbs.add(cb); return () => { this.hostLostCbs.delete(cb); }; }

  private signalHostLost(): void {
    if (this.hostGone || !this.welcomed) return;
    this.hostGone = true;
    this.hostLostCbs.forEach(cb => cb());
  }
}
