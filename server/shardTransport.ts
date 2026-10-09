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
// binding, never by what the client claims; fan-out skips a congested socket
// rather than stalling the loop. Beyond the WebRTC lane (a server must
// survive strangers): every inbound input is SANITIZED to the PlayerInput
// shape before the engine sees it, unknown session kinds are dropped,
// oversize or malformed frames close the socket, and a keepalive ping reaps
// silent connections.
//
// THE DORMANT SEAT (card 16 B, docs/engine/shard.md): a socket that closes
// without its client's word (`session leaving`) never despawns its seat. The
// seat lies DORMANT (its roster row kept, no `pleave`) until the host's clock
// releases it or a join carrying THE RECONNECT TOKEN takes it back. The word,
// a wire the shard refused, and a closing shard end a seat at once, as before.
// ---------------------------------------------------------------------------

import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import type { ServerResponse } from 'node:http';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { WS_GUID, WsMessageAssembler, encodeClose, encodePing, encodePong, encodeText } from '../src/net/wsframe';
import type { ShardResume, WireMsg } from '../src/net/ws';
import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from '../src/net/transport';
import type { PlayerId, PlayerInput } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { isAccountId } from '../src/meta/account';

export const SHARD_WIRE_CFG = {
  /** Largest frame/message a client may send (its inputs and intents are tiny). */
  maxClientMessage: 256 * 1024,
  /** A socket whose send buffer passes this skips SNAPSHOTS until it drains
   *  (the webrtc.ts fanOut law: never stall the loop on one slow peer) —
   *  sized to a few wilds snapshots, so a lagging link plays a beat behind,
   *  never seconds. One-shot rows (welcome, zone, session, roster) are never
   *  skipped: a dropped one is a permanent desync. */
  sendBufferCap: 96 * 1024,
  /** Keepalive: ping every `pingSec`, reap a socket silent for `reapSec`. */
  pingSec: 15,
  reapSec: 45,
  /** Bar-slot ceiling an input may address (held/edge/metaEdge arrays). */
  maxSlots: 16,
  /** THE DOOR CAPS: sockets the listener accepts at all, seats the shard
   *  seats, sockets one address may hold, and how long an unjoined socket
   *  may sit before the reaper closes it. */
  maxConnections: 64,
  maxSeats: 16,
  maxPerIp: 8,
  joinDeadlineSec: 10,
  /** A socket whose unread queue passes this (one-shot rows pile up on a
   *  client that stopped reading) is dropped; one congested past the
   *  snapshot cap for `congestedReapSec` is dropped too. */
  oneShotCeiling: 4 * 1024 * 1024,
  congestedReapSec: 30,
  /** Name and class-id ceilings on the join row (replayed in every welcome). */
  maxNameChars: 24,
  maxClassIdChars: 48,
  /** THE RECONNECT TOKEN's size: random bytes minted per seat at every join
   *  (a resume mints a fresh one), carried as hex on the welcome alone. */
  resumeTokenBytes: 16,
};

/** A player name as the wire may carry it: printable, trimmed, capped. */
export function cleanName(raw: unknown, fallback = 'Joiner'): string {
  if (typeof raw !== 'string') return fallback;
  const s = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, SHARD_WIRE_CFG.maxNameChars);
  return s || fallback;
}
/** A class id as the wire may carry it: the catalog's own grammar, capped. */
export function cleanId(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[^a-z0-9_-]/gi, '').slice(0, SHARD_WIRE_CFG.maxClassIdChars) : '';
}

interface Conn {
  sock: Duplex;
  seat: PlayerId | null;
  asm: WsMessageAssembler;
  lastSeen: number;
  closed: boolean;
  ip: string;
  openedAt: number;
  congestedSince: number;
  /** THE RECONNECT TOKEN this connection's seat answers to (minted at its join). */
  token: string;
  /** THE DELIBERATE LEAVE: the client said `session leaving`, so its close ends the seat at once. */
  leaving: boolean;
}

/** THE RECONNECT TOKEN, minted (node:crypto, never the seeded stream). */
const mintToken = (): string => randomBytes(SHARD_WIRE_CFG.resumeTokenBytes).toString('hex');
/** THE RECONNECT TOKEN's compare: constant-time over equal lengths (a token is a secret). */
function sameToken(held: string, offered: string): boolean {
  const a = Buffer.from(held), b = Buffer.from(offered);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
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

const CLIENT_SESSION_KINDS = new Set<SessionMsg['t']>(['rejoin', 'cosmetics', 'action', 'leaving']);

/** What a join carries beyond its roster row (THE VESSEL — docs/engine/
 *  shard.md "The vessel and the corpse"): the uploaded hero, UNJUDGED here
 *  (server/vessel.ts validates it before anything grafts). */
export interface ShardJoin { vessel?: unknown }

/** THE PRESS IS KEPT: two client frames landing in one server tick used to
 *  overwrite each other, losing a single-frame edge or meta press. The later
 *  frame's axes, aim, held and seq stand; the EDGES of both are kept. */
export function mergeInputs(prev: PlayerInput, next: PlayerInput): PlayerInput {
  const or = (a: readonly boolean[], b: readonly boolean[]): boolean[] => {
    const n = Math.max(a.length, b.length), out: boolean[] = [];
    for (let i = 0; i < n; i++) out.push(!!a[i] || !!b[i]);
    return out;
  };
  const merged: PlayerInput = { ...next, edge: or(prev.edge, next.edge) };
  if (prev.metaEdge || next.metaEdge) merged.metaEdge = or(prev.metaEdge ?? [], next.metaEdge ?? []);
  return merged;
}

/** THE SERVED CLIENT's content types (a web build's files; anything else is a blob). */
const CLIENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.wasm': 'application/wasm', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
};

export class ShardTransport implements NetTransport {
  readonly self: PlayerId = 'p0';
  readonly isHost = true;

  private server: Server | null = null;
  private readonly conns = new Set<Conn>();
  private readonly bySeat = new Map<PlayerId, Conn>();
  /** THE DORMANT SEAT: seat id → the token it answers to, while its socket is
   *  lost and its hero still stands (its roster row stays in peerList). */
  private readonly dormant = new Map<PlayerId, string>();
  /** A closing shard ends every seat at once: nothing sleeps through a shutdown. */
  private closing = false;
  private peerList: PeerInfo[] = [{ id: 'p0', name: 'Keeper', classId: '', isHost: true }];
  private pending = new Map<PlayerId, PlayerInput>();
  private nextSeat = 1;
  private seedSource: () => number = () => 0;
  /** THE STATUS PAGE: a plain GET on the port answers this (the host wires
   *  it) — seed, seats, tick time, faults, uptime — so a forwarded port in a
   *  browser tab tells a host what its world is doing. */
  statusSource: (() => unknown) | null = null;
  /** THE SERVED CLIENT: the folder of a web build (`npm run build:web` → site/play) the shard
   *  hands out on plain GETs, so a hosted world is one link; null = the status JSON on '/'. */
  clientDir: string | null = null;
  /** Carried on every welcome: the hosted world is the continuous surface. */
  worldmass = false;
  /** Carried on every welcome: the shard account's feature ids (the hearth's tier). */
  features: string[] = [];
  /** THE LAND DIGEST the shard's wilds run (null on a classic world): a shell that lays another land refuses the join. */
  land: string | null = null;
  private keepalive: NodeJS.Timeout | null = null;

  private readonly stateCbs = new Set<(s: StateSnapshot) => void>();
  private readonly zoneCbs = new Set<(z: ZoneMsg) => void>();
  private readonly joinCbs = new Set<(p: PeerInfo, join: ShardJoin) => void>();
  private readonly leaveCbs = new Set<(id: PlayerId) => void>();
  private readonly dormantCbs = new Set<(id: PlayerId) => void>();
  private readonly resumeCbs = new Set<(id: PlayerId) => void>();
  private readonly sessionCbs = new Set<(m: SessionMsg, from: PlayerId) => void>();
  private readonly hostLostCbs = new Set<() => void>();
  /** Log sink (the host wires its own). */
  log: (line: string) => void = line => console.log(line);

  /** Wall-clock seconds, for the keepalive ledger. */
  private now(): number { return Date.now() / 1000; }

  /** THE SEED THREAD: read live at every welcome (the shard's manifest seed). */
  setSeedSource(fn: () => number): void { this.seedSource = fn; }

  peers(): PeerInfo[] { return this.peerList; }
  /** Seated connections (the keeper's own seat is not a connection). */
  connectionCount(): number { return this.bySeat.size; }

  /** THE SERVED CLIENT: one file under clientDir (index.html for '/'), never a path outside
   *  it; hashed assets cache a day, pages never. False = not ours to serve. */
  private serveClient(url: string, res: ServerResponse): boolean {
    const dir = this.clientDir!;
    let rel: string;
    try { rel = decodeURIComponent(url); } catch { return false; }
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = resolve(dir, '.' + rel);
    if (file !== dir && !file.startsWith(dir + sep)) return false;
    let size: number;
    try { const s = statSync(file); if (!s.isFile()) return false; size = s.size; } catch { return false; }
    const type = CLIENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'cache-control': rel.startsWith('/assets/') ? 'public, max-age=86400, immutable' : 'no-cache' });
    createReadStream(file).pipe(res);
    return true;
  }

  /** Open the socket server. Port 0 picks a free one; resolves the bound port. */
  listen(port: number, host = '0.0.0.0'): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        // A plain HTTP hit is not a game client: THE STATUS PAGE answers '/status' (and '/'
        // with no served client), THE SERVED CLIENT answers everything under its folder.
        const url = (req.url ?? '/').split('?')[0];
        if (this.statusSource && (url === '/status' || (url === '/' && !this.clientDir))) {
          let body = '{}';
          try { body = JSON.stringify(this.statusSource()); } catch { /* a status that throws reads as empty */ }
          res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          res.end(body);
          return;
        }
        if (this.clientDir && this.serveClient(url, res)) return;
        res.writeHead(426, { 'content-type': 'text/plain', upgrade: 'websocket' });
        res.end(`hollow wake shard — connect with a WebSocket client (${req.url ?? '/'})`);
      });
      server.on('upgrade', (req, sock, head) => this.accept(req, sock, head));
      server.once('error', reject);
      server.maxConnections = SHARD_WIRE_CFG.maxConnections;
      server.listen(port, host, () => {
        server.off('error', reject);
        // A permanent ear: an accept error (EMFILE under a flood) is logged,
        // never an uncaught exception that ends the process.
        server.on('error', e => { this.faults++; console.warn('[shard] listener error:', e instanceof Error ? e.message : String(e)); });
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
    this.closing = true; // THE DORMANT SEAT: a closing shard ends every seat at once (the leave path runs, as before)
    for (const c of [...this.conns]) this.drop(c, 1001, 'shard closing');
    for (const id of [...this.dormant.keys()]) this.release(id);
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
    // THE DOOR CAPS: the listener's count, then one address's share.
    const ip = String((sock as Duplex & { remoteAddress?: string }).remoteAddress ?? '');
    if (this.conns.size >= SHARD_WIRE_CFG.maxConnections) {
      sock.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      sock.destroy();
      return;
    }
    let fromIp = 0;
    for (const c of this.conns) if (c.ip === ip) fromIp++;
    if (fromIp >= SHARD_WIRE_CFG.maxPerIp) {
      sock.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
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
    const conn: Conn = { sock, seat: null, asm: new WsMessageAssembler(SHARD_WIRE_CFG.maxClientMessage, true), lastSeen: this.now(), closed: false, ip, openedAt: this.now(), congestedSince: 0, token: '', leaving: false };
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
        try { msg = JSON.parse(m.text) as WireMsg; } catch { this.drop(conn, 1007, 'not JSON', true); return; } // THE REFUSED WIRE: never dormant
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
    if (conn.asm.error) this.drop(conn, conn.asm.error.code, conn.asm.error.reason, true); // THE REFUSED WIRE: never dormant
  }

  private dispatch(conn: Conn, m: WireMsg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !conn.seat) {
      // THE RECONNECT TOKEN: a join naming a DORMANT seat with its token takes that seat back.
      if (m.resume !== undefined && m.resume !== null && this.resume(conn, m.resume)) return;
      // THE DOOR CAPS: a dormant seat still holds its place in the world.
      if (this.bySeat.size + this.dormant.size >= SHARD_WIRE_CFG.maxSeats) { this.drop(conn, 1013, 'shard full'); return; }
      const seatId: PlayerId = 'p' + (this.nextSeat++);
      conn.seat = seatId;
      conn.token = mintToken(); // THE RECONNECT TOKEN, minted at every join
      this.bySeat.set(seatId, conn);
      const peer: PeerInfo = {
        id: seatId, isHost: false,
        name: cleanName(m.name),
        classId: cleanId(m.classId),
        cosmeticLoadout: sanitizeCosmeticLoadout(m.cosmeticLoadout),
      };
      this.peerList.push(peer);
      this.write(conn, this.welcome(conn), true);
      this.broadcast({ t: 'pjoin', peer }, conn, true);
      // THE IDENTITY rides to the HOST alone: the roster row above (welcome,
      // pjoin) never carries the accountId, so no peer can learn another's.
      const accountId = isAccountId(m.accountId) ? m.accountId : undefined;
      const hostPeer: PeerInfo = accountId ? { ...peer, accountId } : peer;
      this.joinCbs.forEach(cb => this.guard(() => cb(hostPeer, { vessel: m.vessel }))); // the host spawns the seat
    } else if (m.t === 'input' && conn.seat) {
      const input = sanitizeInput(m.input);
      if (input) {
        const prev = this.pending.get(conn.seat); // keyed by the BINDING, never m.seat
        this.pending.set(conn.seat, prev ? mergeInputs(prev, input) : input); // THE PRESS IS KEPT
      }
    } else if (m.t === 'session' && conn.seat) {
      const msg = m.msg;
      if (!msg || typeof msg !== 'object' || !CLIENT_SESSION_KINDS.has(msg.t)) return;
      if (msg.t === 'leaving') conn.leaving = true; // THE DELIBERATE LEAVE: this socket's close ends its seat at once
      const seat = conn.seat;
      this.sessionCbs.forEach(cb => this.guard(() => cb(msg, seat)));
    }
  }

  /** The welcome a seated connection hears, a fresh join's and a resume's alike
   *  (THE SEED THREAD, the hearth's features, THE LAND DIGEST, THE RECONNECT TOKEN). */
  private welcome(conn: Conn): Uint8Array {
    return encodeText(JSON.stringify({ t: 'welcome', self: conn.seat!, peers: this.peerList, seed: this.seedSource() >>> 0, worldmass: this.worldmass,
      features: this.features, ...(this.land ? { land: this.land } : {}), resume: { token: conn.token } } satisfies WireMsg));
  }

  /** THE RECONNECT TOKEN: re-bind a DORMANT seat to this connection when the
   *  join names it with its token: the same seat id, actor and records, a
   *  fresh token, and no `pjoin` (no peer ever saw it leave). Anything else
   *  joins fresh (false), with one log line. */
  private resume(conn: Conn, raw: unknown): boolean {
    const r: Partial<ShardResume> = raw && typeof raw === 'object' ? raw as Partial<ShardResume> : {};
    const seat = typeof r.seat === 'string' ? r.seat : '', token = typeof r.token === 'string' ? r.token : '';
    const held = this.dormant.get(seat);
    if (held === undefined || !sameToken(held, token)) {
      this.log(`[shard] a resume naming ${cleanId(seat) || 'no seat'} was refused (${held === undefined ? 'not a dormant seat' : 'a wrong token'}); it joins fresh`);
      return false;
    }
    this.dormant.delete(seat);
    conn.seat = seat;
    conn.token = mintToken();
    this.bySeat.set(seat, conn);
    this.write(conn, this.welcome(conn), true);
    this.resumeCbs.forEach(cb => this.guard(() => cb(seat))); // the host stops the clock and re-ships the seat's world
    return true;
  }

  /** A socket ended. `refused` = the shard closed it for breaking the wire. */
  private onClosed(conn: Conn, refused = false): void {
    if (conn.closed) return;
    conn.closed = true;
    this.conns.delete(conn);
    const gone = conn.seat;
    conn.seat = null;
    if (!gone) return;
    this.bySeat.delete(gone);
    this.pending.delete(gone); // the hand that held these is gone
    if (!conn.leaving && !refused && !this.closing && this.dormantCbs.size) {
      // THE DORMANT SEAT: no word and no refusal, so the connection was LOST.
      // The seat stays (its roster row and token kept, no pleave); the host's
      // clock decides (a host that never listens keeps the old law below).
      this.dormant.set(gone, conn.token);
      this.dormantCbs.forEach(cb => this.guard(() => cb(gone)));
      return;
    }
    this.peerList = this.peerList.filter(p => p.id !== gone);
    this.broadcast({ t: 'pleave', id: gone }, undefined, true);
    this.leaveCbs.forEach(cb => this.guard(() => cb(gone))); // the host despawns the seat
  }

  /** THE DORMANT SEAT ends (the host's clock ran out, or nothing stands to
   *  wake): its roster row goes, the peers hear `pleave` now, and the host's
   *  leave path runs. False when the seat was not dormant. */
  release(id: PlayerId): boolean {
    if (!this.dormant.delete(id)) return false;
    this.peerList = this.peerList.filter(p => p.id !== id);
    this.broadcast({ t: 'pleave', id }, undefined, true);
    this.leaveCbs.forEach(cb => this.guard(() => cb(id))); // the host despawns the seat
    return true;
  }

  /** Is this seat DORMANT (its socket lost, its hero still standing)? */
  isDormant(id: PlayerId): boolean { return this.dormant.has(id); }

  private drop(conn: Conn, code: number, reason: string, refused = false): void {
    if (conn.closed) return;
    try { conn.sock.write(encodeClose(code, reason)); } catch { /* already gone */ }
    try { conn.sock.end(); } catch { /* ignore */ }
    this.onClosed(conn, refused);
    setTimeout(() => { try { conn.sock.destroy(); } catch { /* ignore */ } }, 250).unref();
  }

  private sweep(): void {
    const now = this.now();
    for (const c of [...this.conns]) {
      if (now - c.lastSeen > SHARD_WIRE_CFG.reapSec) { this.drop(c, 1001, 'keepalive timeout'); continue; }
      if (!c.seat && now - c.openedAt > SHARD_WIRE_CFG.joinDeadlineSec) { this.drop(c, 1008, 'no join'); continue; }
      const queued = c.sock.writableLength;
      if (queued > SHARD_WIRE_CFG.oneShotCeiling) { this.drop(c, 1008, 'not reading'); continue; }
      if (queued >= SHARD_WIRE_CFG.sendBufferCap) {
        if (!c.congestedSince) c.congestedSince = now;
        else if (now - c.congestedSince > SHARD_WIRE_CFG.congestedReapSec) { this.drop(c, 1001, 'congested'); continue; }
      } else {
        c.congestedSince = 0;
      }
      this.write(c, encodePing());
    }
  }

  /** Faults in a host callback (a join that throws mid-seat, a session
   *  handler) are logged, never let through the socket layer — one bad
   *  frame must not kill the process that holds everyone's world. */
  faults = 0;
  private guard(fn: () => void): void {
    try { fn(); }
    catch (e) { this.faults++; console.warn('[shard] host callback fault:', e instanceof Error ? e.stack ?? e.message : String(e)); }
  }

  private write(conn: Conn, frame: Uint8Array, oneShot = false): boolean {
    if (conn.closed) return false;
    if (!oneShot && conn.sock.writableLength >= SHARD_WIRE_CFG.sendBufferCap) return false; // congested: skip a snapshot, never stall
    try { conn.sock.write(frame); return true; } catch { return false; }
  }

  private broadcast(m: WireMsg, except?: Conn, oneShot = false): void {
    const frame = encodeText(JSON.stringify(m));
    for (const c of this.bySeat.values()) if (c !== except) this.write(c, frame, oneShot);
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
  sendZone(z: ZoneMsg): void { this.broadcast({ t: 'zone', zone: z }, undefined, true); }
  /** Ship the zone to ONE seat (a joiner's first terrain, a re-seat). */
  sendZoneTo(seat: PlayerId, z: ZoneMsg): void {
    const c = this.bySeat.get(seat);
    if (c) this.write(c, encodeText(JSON.stringify({ t: 'zone', zone: z } satisfies WireMsg)), true);
  }
  onZone(cb: (z: ZoneMsg) => void): () => void { this.zoneCbs.add(cb); return () => { this.zoneCbs.delete(cb); }; }
  /** A join: the host-side roster row (with its accountId) + the vessel it carried. */
  onPeerJoin(cb: (p: PeerInfo, join: ShardJoin) => void): () => void { this.joinCbs.add(cb); return () => { this.joinCbs.delete(cb); }; }
  onPeerLeave(cb: (id: PlayerId) => void): () => void { this.leaveCbs.add(cb); return () => { this.leaveCbs.delete(cb); }; }
  /** THE DORMANT SEAT: a seat's socket was lost without its word (the host starts its clock, or releases it at once). */
  onPeerDormant(cb: (id: PlayerId) => void): () => void { this.dormantCbs.add(cb); return () => { this.dormantCbs.delete(cb); }; }
  /** THE RECONNECT TOKEN: a dormant seat was re-bound to a new connection (the host stops its clock). */
  onPeerResume(cb: (id: PlayerId) => void): () => void { this.resumeCbs.add(cb); return () => { this.resumeCbs.delete(cb); }; }

  sendSession(msg: SessionMsg, to?: PlayerId): void {
    if (to) {
      const c = this.bySeat.get(to);
      if (c) this.write(c, encodeText(JSON.stringify({ t: 'session', msg } satisfies WireMsg)), true);
    } else {
      this.broadcast({ t: 'session', msg }, undefined, true);
    }
  }
  onSession(cb: (m: SessionMsg, from: PlayerId) => void): () => void { this.sessionCbs.add(cb); return () => { this.sessionCbs.delete(cb); }; }
  onHostLost(cb: () => void): () => void { this.hostLostCbs.add(cb); return () => { this.hostLostCbs.delete(cb); }; }
}
