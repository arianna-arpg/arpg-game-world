// ---------------------------------------------------------------------------
// ShardTransport — the HOST role of NetTransport over WebSocket, for THE
// SHARD (docs/design/shard-world.md). Node-side: one loopback-or-public HTTP
// server whose only job is the WebSocket upgrade; every seated connection is
// a Duplex socket fed through the pure RFC 6455 assembler (src/net/wsframe.ts)
// and spoken to in the WireMsg grammar the WebRTC lane already speaks, so
// the engine and the client shell never learn which wire carried them.
//
// Mirrors webrtc.ts's host half law for law: a seat id is bound to the
// CONNECTION at its join and every input/session message is keyed by that
// binding, never by what the client claims; a vanished socket despawns its
// seat; fan-out skips a congested socket rather than stalling the loop.
// Beyond the WebRTC lane (a server must survive strangers): every inbound
// input is SANITIZED to the PlayerInput shape before the engine sees it,
// unknown session kinds are dropped, oversize or malformed frames close
// the socket, and a keepalive ping reaps silent connections.
// ---------------------------------------------------------------------------

import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { WS_GUID, WsMessageAssembler, encodeClose, encodePing, encodePong, encodeText } from '../src/net/wsframe';
import type { WireMsg } from '../src/net/ws';
import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from '../src/net/transport';
import type { PlayerId, PlayerInput } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';

export const SHARD_WIRE_CFG = {
  /** Largest frame/message a client may send (its inputs and intents are tiny). */
  maxClientMessage: 256 * 1024,
  /** A socket whose send buffer passes this skips broadcasts until it drains
   *  (the webrtc.ts fanOut law: never stall the loop on one slow peer). */
  sendBufferCap: 1_000_000,
  /** Keepalive: ping every `pingSec`, reap a socket silent for `reapSec`. */
  pingSec: 15,
  reapSec: 45,
  /** Bar-slot ceiling an input may address (held/edge/metaEdge arrays). */
  maxSlots: 16,
};

interface Conn {
  sock: Duplex;
  seat: PlayerId | null;
  asm: WsMessageAssembler;
  lastSeen: number;
  closed: boolean;
}

/** Client → PlayerInput, shape-checked: a hostile or buggy peer can never
 *  hand the engine a NaN axis, a missing aim or a prototype-chain array. */
export function sanitizeInput(raw: unknown): PlayerInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    return Math.max(lo, Math.min(hi, n));
  };
  const aim = r.aim as Record<string, unknown> | undefined;
  const ax = aim && typeof aim === 'object' ? aim.x : undefined;
  const ay = aim && typeof aim === 'object' ? aim.y : undefined;
  if (typeof ax !== 'number' || typeof ay !== 'number' || !Number.isFinite(ax) || !Number.isFinite(ay)) return null;
  const bools = (v: unknown): boolean[] => Array.isArray(v) ? v.slice(0, SHARD_WIRE_CFG.maxSlots).map(b => b === true) : [];
  const out: PlayerInput = { dx: num(r.dx, -1, 1), dy: num(r.dy, -1, 1), aim: { x: ax, y: ay }, held: bools(r.held), edge: bools(r.edge) };
  if (Array.isArray(r.metaEdge)) out.metaEdge = bools(r.metaEdge);
  if (typeof r.seq === 'number' && Number.isFinite(r.seq)) out.seq = Math.max(0, Math.floor(r.seq));
  return out;
}

const CLIENT_SESSION_KINDS = new Set<SessionMsg['t']>(['rejoin', 'cosmetics', 'action']);

export class ShardTransport implements NetTransport {
  readonly self: PlayerId = 'p0';
  readonly isHost = true;

  private server: Server | null = null;
  private readonly conns = new Set<Conn>();
  private readonly bySeat = new Map<PlayerId, Conn>();
  private peerList: PeerInfo[] = [{ id: 'p0', name: 'Keeper', classId: '', isHost: true }];
  private pending = new Map<PlayerId, PlayerInput>();
  private nextSeat = 1;
  private seedSource: () => number = () => 0;
  private keepalive: NodeJS.Timeout | null = null;

  private readonly stateCbs = new Set<(s: StateSnapshot) => void>();
  private readonly zoneCbs = new Set<(z: ZoneMsg) => void>();
  private readonly joinCbs = new Set<(p: PeerInfo) => void>();
  private readonly leaveCbs = new Set<(id: PlayerId) => void>();
  private readonly sessionCbs = new Set<(m: SessionMsg, from: PlayerId) => void>();
  private readonly hostLostCbs = new Set<() => void>();

  /** Wall-clock seconds, for the keepalive ledger. */
  private now(): number { return Date.now() / 1000; }

  /** THE SEED THREAD: read live at every welcome (the shard's manifest seed). */
  setSeedSource(fn: () => number): void { this.seedSource = fn; }

  peers(): PeerInfo[] { return this.peerList; }
  /** Seated connections (the keeper's own seat is not a connection). */
  connectionCount(): number { return this.bySeat.size; }

  /** Open the socket server. Port 0 picks a free one; resolves the bound port. */
  listen(port: number, host = '0.0.0.0'): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        // A plain HTTP hit is not a game client — say so and hang up.
        res.writeHead(426, { 'content-type': 'text/plain', upgrade: 'websocket' });
        res.end(`hollow wake shard — connect with a WebSocket client (${req.url ?? '/'})`);
      });
      server.on('upgrade', (req, sock, head) => this.accept(req, sock, head));
      server.on('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        this.server = server;
        const addr = server.address() as AddressInfo | null;
        this.keepalive = setInterval(() => this.sweep(), SHARD_WIRE_CFG.pingSec * 1000);
        this.keepalive.unref();
        resolve(addr?.port ?? port);
      });
    });
  }

  /** Close every connection and the listener. */
  close(): Promise<void> {
    if (this.keepalive) { clearInterval(this.keepalive); this.keepalive = null; }
    for (const c of [...this.conns]) this.drop(c, 1001, 'shard closing');
    const server = this.server;
    this.server = null;
    return new Promise(resolve => { if (server) server.close(() => resolve()); else resolve(); });
  }

  private accept(req: IncomingMessage, sock: Duplex, head: Buffer): void {
    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers.upgrade ?? '').toLowerCase();
    if (upgrade !== 'websocket' || typeof key !== 'string' || !key) {
      sock.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      sock.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
    sock.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '', '',
    ].join('\r\n'));
    const conn: Conn = { sock, seat: null, asm: new WsMessageAssembler(SHARD_WIRE_CFG.maxClientMessage, true), lastSeen: this.now(), closed: false };
    this.conns.add(conn);
    (sock as Duplex & { setNoDelay?: (on: boolean) => void }).setNoDelay?.(true);
    sock.on('data', (chunk: Buffer) => this.onData(conn, chunk));
    sock.on('close', () => this.onClosed(conn));
    sock.on('error', () => this.onClosed(conn));
    if (head.length) this.onData(conn, head);
  }

  private onData(conn: Conn, chunk: Buffer): void {
    if (conn.closed) return;
    conn.lastSeen = this.now();
    const messages = conn.asm.push(chunk);
    for (const m of messages) {
      if (m.kind === 'text') {
        let msg: WireMsg;
        try { msg = JSON.parse(m.text) as WireMsg; } catch { this.drop(conn, 1007, 'not JSON'); return; }
        this.dispatch(conn, msg);
      } else if (m.kind === 'ping') {
        this.write(conn, encodePong(m.data));
      } else if (m.kind === 'close') {
        this.drop(conn, 1000, 'peer closed');
        return;
      }
      // pong: lastSeen already stamped; binary: ignored (the grammar is text).
      if (conn.closed) return;
    }
    if (conn.asm.error) this.drop(conn, conn.asm.error.code, conn.asm.error.reason);
  }

  private dispatch(conn: Conn, m: WireMsg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !conn.seat) {
      const seatId: PlayerId = 'p' + (this.nextSeat++);
      conn.seat = seatId;
      this.bySeat.set(seatId, conn);
      const peer: PeerInfo = {
        id: seatId, isHost: false,
        name: typeof m.name === 'string' ? m.name.slice(0, 32) : 'Joiner',
        classId: typeof m.classId === 'string' ? m.classId : '',
        cosmeticLoadout: sanitizeCosmeticLoadout(m.cosmeticLoadout),
      };
      this.peerList.push(peer);
      this.write(conn, encodeText(JSON.stringify({ t: 'welcome', self: seatId, peers: this.peerList, seed: this.seedSource() >>> 0 } satisfies WireMsg)));
      this.broadcast({ t: 'pjoin', peer }, conn);
      this.joinCbs.forEach(cb => cb(peer)); // the host spawns the seat
    } else if (m.t === 'input' && conn.seat) {
      const input = sanitizeInput(m.input);
      if (input) this.pending.set(conn.seat, input); // keyed by the BINDING, never m.seat
    } else if (m.t === 'session' && conn.seat) {
      const msg = m.msg;
      if (!msg || typeof msg !== 'object' || !CLIENT_SESSION_KINDS.has(msg.t)) return;
      const seat = conn.seat;
      this.sessionCbs.forEach(cb => cb(msg, seat));
    }
  }

  private onClosed(conn: Conn): void {
    if (conn.closed) return;
    conn.closed = true;
    this.conns.delete(conn);
    const gone = conn.seat;
    conn.seat = null;
    if (gone) {
      this.bySeat.delete(gone);
      this.peerList = this.peerList.filter(p => p.id !== gone);
      this.pending.delete(gone);
      this.broadcast({ t: 'pleave', id: gone });
      this.leaveCbs.forEach(cb => cb(gone)); // the host despawns the seat
    }
  }

  private drop(conn: Conn, code: number, reason: string): void {
    if (conn.closed) return;
    try { conn.sock.write(encodeClose(code, reason)); } catch { /* already gone */ }
    try { conn.sock.end(); } catch { /* ignore */ }
    this.onClosed(conn);
    setTimeout(() => { try { conn.sock.destroy(); } catch { /* ignore */ } }, 250).unref();
  }

  private sweep(): void {
    const now = this.now();
    for (const c of [...this.conns]) {
      if (now - c.lastSeen > SHARD_WIRE_CFG.reapSec) { this.drop(c, 1001, 'keepalive timeout'); continue; }
      this.write(c, encodePing());
    }
  }

  private write(conn: Conn, frame: Uint8Array): boolean {
    if (conn.closed) return false;
    if (conn.sock.writableLength >= SHARD_WIRE_CFG.sendBufferCap) return false; // congested: skip, never stall
    try { conn.sock.write(frame); return true; } catch { return false; }
  }

  private broadcast(m: WireMsg, except?: Conn): void {
    const frame = encodeText(JSON.stringify(m));
    for (const c of this.bySeat.values()) if (c !== except) this.write(c, frame);
  }

  // ---- NetTransport (host role) -------------------------------------------
  host(info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ code: string; self: PlayerId }> {
    this.peerList[0] = { id: 'p0', isHost: true, ...info };
    const addr = this.server?.address() as AddressInfo | null;
    return Promise.resolve({ code: addr ? `ws://${addr.address}:${addr.port}` : '', self: 'p0' });
  }
  join(): Promise<{ self: PlayerId }> { return Promise.reject(new Error('a shard hosts; it never joins')); }
  leave(): void { void this.close(); }

  sendInput(seat: PlayerId, input: PlayerInput): void { this.pending.set(seat, input); } // the host's own seats
  drainInputs(): Map<PlayerId, PlayerInput> { const out = this.pending; this.pending = new Map(); return out; }

  sendState(s: StateSnapshot): void { this.broadcast({ t: 'snap', snap: s }); }
  onState(cb: (s: StateSnapshot) => void): () => void { this.stateCbs.add(cb); return () => { this.stateCbs.delete(cb); }; }
  sendZone(z: ZoneMsg): void { this.broadcast({ t: 'zone', zone: z }); }
  /** Ship the zone to ONE seat (a joiner's first terrain, a re-seat). */
  sendZoneTo(seat: PlayerId, z: ZoneMsg): void {
    const c = this.bySeat.get(seat);
    if (c) this.write(c, encodeText(JSON.stringify({ t: 'zone', zone: z } satisfies WireMsg)));
  }
  onZone(cb: (z: ZoneMsg) => void): () => void { this.zoneCbs.add(cb); return () => { this.zoneCbs.delete(cb); }; }
  onPeerJoin(cb: (p: PeerInfo) => void): () => void { this.joinCbs.add(cb); return () => { this.joinCbs.delete(cb); }; }
  onPeerLeave(cb: (id: PlayerId) => void): () => void { this.leaveCbs.add(cb); return () => { this.leaveCbs.delete(cb); }; }

  sendSession(msg: SessionMsg, to?: PlayerId): void {
    if (to) {
      const c = this.bySeat.get(to);
      if (c) this.write(c, encodeText(JSON.stringify({ t: 'session', msg } satisfies WireMsg)));
    } else {
      this.broadcast({ t: 'session', msg });
    }
  }
  onSession(cb: (m: SessionMsg, from: PlayerId) => void): () => void { this.sessionCbs.add(cb); return () => { this.sessionCbs.delete(cb); }; }
  onHostLost(cb: () => void): () => void { this.hostLostCbs.add(cb); return () => { this.hostLostCbs.delete(cb); }; }
}
