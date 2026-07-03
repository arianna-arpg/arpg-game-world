// ---------------------------------------------------------------------------
// WebRtcTransport — host-authoritative co-op over WebRTC, with NO signaling
// server. Manual COPY-PASTE signaling: the host generates an "invite" blob (its
// SDP offer + all gathered ICE, non-trickle), the friend pastes it and returns an
// "answer" blob, the host pastes that back, and a reliable-ordered DataChannel
// opens between them. Star topology: the host keeps one RTCPeerConnection per
// joiner; clients keep one to the host. Everything (inputs, snapshots, zone,
// roster) rides that one channel as JSON.
//
// Implements the same NetTransport the LocalTransport does, so the engine + main
// loop are unchanged. The lobby UI drives the copy-paste dance through the extra
// createInvite()/acceptAnswer()/createAnswer() methods below.
//
// LIMITS (honest, MVP): STUN-only (Google's public STUN) — no TURN relay, so a
// minority of locked-down/symmetric NATs won't connect. Reliable-ordered channel
// head-of-line blocks under heavy loss. No client prediction (own-hero input lag
// ≈ round-trip). All acceptable for "play with a friend" testing.
// ---------------------------------------------------------------------------

import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from './transport';
import type { PlayerId, PlayerInput } from './intent';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

type NetMsg =
  | { t: 'join'; classId: string; name: string }
  | { t: 'welcome'; self: PlayerId; peers: PeerInfo[] }
  | { t: 'input'; seat: PlayerId; input: PlayerInput }
  | { t: 'snap'; snap: StateSnapshot }
  | { t: 'zone'; zone: ZoneMsg }
  | { t: 'pjoin'; peer: PeerInfo }
  | { t: 'pleave'; id: PlayerId }
  | { t: 'session'; msg: SessionMsg };

const encode = (d: RTCSessionDescription | null): string => btoa(JSON.stringify(d));
const decode = (blob: string): RTCSessionDescriptionInit => JSON.parse(atob(blob.trim()));

/** Wait for ICE gathering to finish (non-trickle), so localDescription carries
 *  every candidate in one blob. 5s fallback: proceed with what we have. */
function iceComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise<void>(resolve => {
    const done = (): void => { pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = (): void => { if (pc.iceGatheringState === 'complete') done(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, 5000);
  });
}

export class WebRtcTransport implements NetTransport {
  self: PlayerId = 'p0';
  isHost = false;

  private myInfo: Omit<PeerInfo, 'id' | 'isHost'> = { name: '', classId: '' };
  private peerList: PeerInfo[] = [];
  private pending = new Map<PlayerId, PlayerInput>();
  private readonly stateCbs = new Set<(s: StateSnapshot) => void>();
  private readonly zoneCbs = new Set<(z: ZoneMsg) => void>();
  private readonly joinCbs = new Set<(p: PeerInfo) => void>();
  private readonly leaveCbs = new Set<(id: PlayerId) => void>();
  private readonly sessionCbs = new Set<(m: SessionMsg, from: PlayerId) => void>();

  // HOST state: one channel per seated peer + a pending invite awaiting its join.
  private readonly conns = new Map<PlayerId, RTCDataChannel>();
  private pendingInvite: { pc: RTCPeerConnection; ch: RTCDataChannel } | null = null;
  private nextSeat = 1;

  // CLIENT state: the single connection to the host.
  private hostPc: RTCPeerConnection | null = null;
  private hostCh: RTCDataChannel | null = null;
  private welcomeResolve: ((r: { self: PlayerId }) => void) | null = null;

  peers(): PeerInfo[] { return this.peerList; }

  // ---- NetTransport host/join (the lobby uses the richer methods below) -----
  host(info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ code: string; self: PlayerId }> {
    this.isHost = true; this.self = 'p0'; this.myInfo = info;
    this.peerList = [{ id: 'p0', isHost: true, ...info }];
    return Promise.resolve({ code: '', self: 'p0' });
  }
  /** Not used directly — clients join via createAnswer() (the copy-paste flow). */
  join(): Promise<{ self: PlayerId }> { return Promise.reject(new Error('use createAnswer()')); }

  leave(): void {
    this.pendingInvite?.pc.close();
    this.pendingInvite = null;
    this.conns.forEach(ch => { try { ch.close(); } catch { /* ignore */ } });
    this.conns.clear();
    try { this.hostCh?.close(); } catch { /* ignore */ }
    this.hostPc?.close();
    this.hostCh = null; this.hostPc = null;
  }

  // ---- HOST signaling -------------------------------------------------------
  /** Create an offer blob for the NEXT joiner (the host pastes this to a friend). */
  async createInvite(): Promise<string> {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const ch = pc.createDataChannel('game', { ordered: true });
    this.pendingInvite = { pc, ch };
    this.setupHostChannel(pc, ch);
    await pc.setLocalDescription(await pc.createOffer());
    await iceComplete(pc);
    return encode(pc.localDescription);
  }

  /** Complete the pending invite with the friend's answer blob. */
  async acceptAnswer(blob: string): Promise<void> {
    if (!this.pendingInvite) throw new Error('no pending invite — create one first');
    await this.pendingInvite.pc.setRemoteDescription(decode(blob));
    this.pendingInvite = null; // the channel opens; the client sends 'join' next
  }

  private setupHostChannel(pc: RTCPeerConnection, ch: RTCDataChannel): void {
    let seatId: PlayerId | null = null;
    ch.onmessage = (ev): void => {
      const m = JSON.parse(ev.data as string) as NetMsg;
      if (m.t === 'join' && !seatId) {
        seatId = 'p' + (this.nextSeat++);
        this.conns.set(seatId, ch);
        const peer: PeerInfo = { id: seatId, name: m.name, classId: m.classId, isHost: false };
        this.peerList.push(peer);
        ch.send(JSON.stringify({ t: 'welcome', self: seatId, peers: this.peerList } satisfies NetMsg));
        this.broadcastExcept(ch, { t: 'pjoin', peer });
        this.joinCbs.forEach(cb => cb(peer)); // host spawns the seat
      } else if (m.t === 'input' && seatId) {
        // Key by the AUTHORITATIVE channel→seat binding, NOT the client-supplied
        // m.seat — else a peer could drive another seat (incl. the host's hero).
        this.pending.set(seatId, m.input);
      } else if (m.t === 'session' && seatId) {
        // A client's run-lifecycle message (rejoin) — tagged with its bound seat.
        this.sessionCbs.forEach(cb => cb(m.msg, seatId!));
      }
    };
    pc.onconnectionstatechange = (): void => {
      const st = pc.connectionState;
      // 'disconnected' is a TRANSIENT ICE blip that usually recovers — only the
      // terminal states despawn the peer (else a hiccup permanently kicks them).
      if ((st === 'failed' || st === 'closed') && seatId) {
        const gone = seatId; seatId = null;
        this.conns.delete(gone);
        this.peerList = this.peerList.filter(p => p.id !== gone);
        this.broadcastAll({ t: 'pleave', id: gone });
        this.leaveCbs.forEach(cb => cb(gone)); // host despawns the seat
      }
    };
  }

  // ---- CLIENT signaling -----------------------------------------------------
  /** Take the host's invite blob, return our answer blob (paste back to host).
   *  `joined` resolves with our assigned seat id once the host welcomes us. */
  async createAnswer(offerBlob: string, info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ answer: string; joined: Promise<{ self: PlayerId }> }> {
    this.isHost = false; this.myInfo = info;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.hostPc = pc;
    const joined = new Promise<{ self: PlayerId }>(res => { this.welcomeResolve = res; });
    pc.ondatachannel = (ev): void => this.setupClientChannel(ev.channel);
    await pc.setRemoteDescription(decode(offerBlob));
    await pc.setLocalDescription(await pc.createAnswer());
    await iceComplete(pc);
    return { answer: encode(pc.localDescription), joined };
  }

  private setupClientChannel(ch: RTCDataChannel): void {
    this.hostCh = ch;
    ch.onopen = (): void => ch.send(JSON.stringify({ t: 'join', classId: this.myInfo.classId, name: this.myInfo.name } satisfies NetMsg));
    ch.onmessage = (ev): void => {
      const m = JSON.parse(ev.data as string) as NetMsg;
      switch (m.t) {
        case 'welcome': this.self = m.self; this.peerList = m.peers; this.welcomeResolve?.({ self: m.self }); this.welcomeResolve = null; break;
        case 'snap': this.stateCbs.forEach(cb => cb(m.snap)); break;
        case 'zone': this.zoneCbs.forEach(cb => cb(m.zone)); break;
        case 'pjoin': if (!this.peerList.some(p => p.id === m.peer.id)) this.peerList.push(m.peer); break;
        case 'pleave': this.peerList = this.peerList.filter(p => p.id !== m.id); break;
        case 'session': this.sessionCbs.forEach(cb => cb(m.msg, 'p0')); break; // from the host
      }
    };
  }

  // ---- transport pump -------------------------------------------------------
  sendInput(seat: PlayerId, input: PlayerInput): void {
    if (this.isHost) { this.pending.set(seat, input); return; } // host's own seat
    if (this.hostCh && this.hostCh.readyState === 'open') {
      this.hostCh.send(JSON.stringify({ t: 'input', seat, input } satisfies NetMsg));
    }
  }
  drainInputs(): Map<PlayerId, PlayerInput> { const out = this.pending; this.pending = new Map(); return out; }

  sendState(s: StateSnapshot): void {
    if (!this.isHost) return;
    this.fanOut(JSON.stringify({ t: 'snap', snap: s } satisfies NetMsg));
  }
  onState(cb: (s: StateSnapshot) => void): () => void { this.stateCbs.add(cb); return () => { this.stateCbs.delete(cb); }; }

  sendZone(z: ZoneMsg): void {
    if (!this.isHost) return;
    this.fanOut(JSON.stringify({ t: 'zone', zone: z } satisfies NetMsg));
  }
  onZone(cb: (z: ZoneMsg) => void): () => void { this.zoneCbs.add(cb); return () => { this.zoneCbs.delete(cb); }; }

  /** Send to every open, non-congested channel. A throw on one channel (congested
   *  buffer, mid-close) must never abort the loop or kill the host's frame loop. */
  private fanOut(data: string): void {
    this.conns.forEach(ch => {
      if (ch.readyState !== 'open' || ch.bufferedAmount >= 1_000_000) return;
      try { ch.send(data); } catch { /* drop on a congested/closing channel */ }
    });
  }

  onPeerJoin(cb: (p: PeerInfo) => void): () => void { this.joinCbs.add(cb); return () => { this.joinCbs.delete(cb); }; }
  onPeerLeave(cb: (id: PlayerId) => void): () => void { this.leaveCbs.add(cb); return () => { this.leaveCbs.delete(cb); }; }

  /** Run-lifecycle control. Host: `to` targets one client (newRun), else broadcasts
   *  to all (runEnd). Client: always sends to the host (rejoin). */
  sendSession(msg: SessionMsg, to?: PlayerId): void {
    const d = JSON.stringify({ t: 'session', msg } satisfies NetMsg);
    if (this.isHost) {
      if (to) { const ch = this.conns.get(to); if (ch?.readyState === 'open') { try { ch.send(d); } catch { /* ignore */ } } }
      else this.broadcastAll({ t: 'session', msg });
    } else if (this.hostCh?.readyState === 'open') {
      try { this.hostCh.send(d); } catch { /* ignore */ }
    }
  }
  onSession(cb: (m: SessionMsg, from: PlayerId) => void): () => void { this.sessionCbs.add(cb); return () => { this.sessionCbs.delete(cb); }; }

  private broadcastAll(m: NetMsg): void {
    const d = JSON.stringify(m);
    this.conns.forEach(ch => { if (ch.readyState === 'open') { try { ch.send(d); } catch { /* ignore */ } } });
  }
  private broadcastExcept(except: RTCDataChannel, m: NetMsg): void {
    const d = JSON.stringify(m);
    this.conns.forEach(ch => { if (ch !== except && ch.readyState === 'open') { try { ch.send(d); } catch { /* ignore */ } } });
  }
}
