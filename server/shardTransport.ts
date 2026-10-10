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
//
// THE RETURN (THE SMOOTH SHELL, docs/engine/shard.md): a client that lost its
// link reconnects in place with `resumeOnly`: its token takes back its dormant
// seat, or its LIVE one when the old link died unheard (the old socket is let
// go), and otherwise the join is refused, never seated fresh. THE IDENTITY: a
// join carrying the account and the vessel of a dormant seat takes it back
// without the token (a new tab), instead of hearing the twin refusal.
// ---------------------------------------------------------------------------

import { createReadStream, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import type { ServerResponse } from 'node:http';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { WS_GUID, WsMessageAssembler, encodeClose, encodePing, encodePong, encodeText } from '../src/net/wsframe';
import { SHARD_SERVED_MARK, type ShardResume, type WireMsg } from '../src/net/ws';
import type { NetTransport, PeerInfo, SessionMsg, StateSnapshot, ZoneMsg } from '../src/net/transport';
import { HONEST_INPUT_CFG, mergeInputs, type PlayerId, type PlayerInput } from '../src/net/intent';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { isAccountId } from '../src/meta/account';
import { SHARD_REFUSAL, SHARD_UNLOAD_BEACON_PATH, shardBuildStamp } from '../src/net/shardBuild';
import { ownEntryJson, serializeZone } from '../src/net/snapshot'; // THE WIRE'S EYES: THE OWN ENTRY (+ THE WIRE DIET's self-heal zone)
import { seatAudienceBody, seatAudienceFrame, seatAudienceSplit } from '../src/net/seatView'; // THE ACTING SEAT: the audiences
import { WIRE_DIET_CFG } from '../src/net/wireDiet'; // THE WIRE DIET: the flow control's dial
import type { DietSeat, ShardDiet } from './wireDiet'; // THE WIRE DIET: the per-socket frames

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
  /** THE DELIBERATE LEAVE: the client said `session leaving`, so its close ends the seat at once;
   *  'unload' (W7, THE UNLOAD WORD): its page went away, so its close sleeps the seat on the
   *  short reload grace instead (the host's clock). */
  leaving: boolean | 'unload';
  /** THE WIRE DIET's flow control: the newest snapshot tick its client acknowledged (-1: none
   *  yet, so the userland buffer alone governs it), the newest written to it, and the ticks of
   *  the frames written since its ack (the window counts FRAMES: a skipped gap is no frame). */
  ackTick: number;
  sentTick: number;
  inflight: number[];
  /** THE WIRE DIET: what this socket's client holds (its ground's revision, its carry). */
  diet: DietSeat | null;
}

/** THE UNLOAD BEACON's body ceiling (a seat id and a token). */
const SHARD_UNLOAD_BEACON_MAX = 1024;
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
  if (typeof r.dt === 'number' && Number.isFinite(r.dt)) out.dt = num(r.dt, 0, HONEST_INPUT_CFG.maxMoveDt); // THE HONEST INPUT: a frame claims at most the client's clamp
  return out;
}

const CLIENT_SESSION_KINDS = new Set<SessionMsg['t']>(['rejoin', 'cosmetics', 'action', 'leaving', 'party']);

/** The charId a join's (unjudged) vessel names, read for THE IDENTITY's reclaim alone ('' = none). */
function vesselCharId(v: unknown): string {
  const id = v && typeof v === 'object' ? (v as { charId?: unknown }).charId : undefined;
  return typeof id === 'string' ? id.slice(0, 64) : '';
}

/** What a join carries beyond its roster row (THE VESSEL — docs/engine/
 *  shard.md "The vessel and the corpse"): the uploaded hero, UNJUDGED here
 *  (server/vessel.ts validates it before anything grafts). */
export interface ShardJoin { vessel?: unknown }

/** THE PRESS IS KEPT and THE HONEST INPUT's batch: the fold lives beside the
 *  intent (src/net/intent.ts) so the WebRTC host folds its frames the same way. */
export { mergeInputs };

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
  /** THE FRONT DOOR (W7): the world's own name, carried on every welcome (a menu's
   *  "Return to <world>") and worn by the served page (THE SERVED MARK). */
  worldName = 'the hosted world';
  /** THE STOPGAP NAME (W7): the host names a joining hero for the roster (an unnamed
   *  hero wears its class and a short number; a name another wears takes a number).
   *  Null = the join's own name, cleaned. */
  nameJoin: ((name: string, classId: string, accountId: string | undefined, taken: string[]) => string) | null = null;
  private keepalive: NodeJS.Timeout | null = null;

  private readonly stateCbs = new Set<(s: StateSnapshot) => void>();
  private readonly zoneCbs = new Set<(z: ZoneMsg) => void>();
  private readonly joinCbs = new Set<(p: PeerInfo, join: ShardJoin) => void>();
  private readonly leaveCbs = new Set<(id: PlayerId) => void>();
  private readonly dormantCbs = new Set<(id: PlayerId, worded: boolean, unload: boolean) => void>();
  private readonly resumeCbs = new Set<(id: PlayerId) => void>();
  private readonly sessionCbs = new Set<(m: SessionMsg, from: PlayerId) => void>();
  private readonly hostLostCbs = new Set<() => void>();
  /** THE ACTING SEAT: a deliberate leave the host holds (a seat in combat)
   *  goes DORMANT like a lost socket; null = every word leaves at once. */
  leaveHolds: ((id: PlayerId) => boolean) | null = null;
  /** THE WIRE DIET (server/wireDiet.ts), installed by the host: a snapshot it bound to its
   *  World goes out per audience; null (or an unbound snapshot) = the pre-diet frames. */
  diet: ShardDiet | null = null;
  /** THE SOAK (balance/soak_shard.ts): bytes of every frame write() handed a socket. */
  bytesOut = 0;
  /** THE SOAK (balance/soak_shard.ts): frames write() handed a socket. */
  framesOut = 0;
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
    if (rel === '/index.html') {
      // THE SERVED MARK (W7, THE FRONT DOOR): the page a world hands out says so, so its
      // start menu leads into this world (src/net/ws.ts servedShardUrl).
      let html: string;
      try { html = readFileSync(file, 'utf8'); } catch { return false; }
      const mark = `<meta name="${SHARD_SERVED_MARK}" content="${this.worldName.replace(/[<>&"]/g, '')}">`;
      const body = Buffer.from(html.includes('<head>') ? html.replace('<head>', '<head>' + mark) : mark + html, 'utf8');
      res.writeHead(200, { 'content-type': type, 'content-length': body.length, 'cache-control': 'no-cache' });
      res.end(body);
      return true;
    }
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
        // THE UNLOAD BEACON (W7): a page going away says so over HTTP too (navigator.sendBeacon
        // survives an unload that can drop the socket's last frame).
        if (req.method === 'POST' && url === SHARD_UNLOAD_BEACON_PATH) { this.unloadBeacon(req, res); return; }
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
    const conn: Conn = { sock, seat: null, asm: new WsMessageAssembler(SHARD_WIRE_CFG.maxClientMessage, true), lastSeen: this.now(), closed: false, ip, openedAt: this.now(), congestedSince: 0, token: '', leaving: false,
      ackTick: -1, sentTick: -1, inflight: [], diet: null };
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
    if (conn.asm.error) {
      // THE FRONT DOOR (W7): a join frame past the wire's cap is a hero too large to
      // travel, and its lobby hears so before the close (never a silent drop).
      if (conn.asm.error.code === 1009 && !conn.seat) this.refuse(conn, SHARD_REFUSAL.heroTooLarge);
      this.drop(conn, conn.asm.error.code, conn.asm.error.reason, true); // THE REFUSED WIRE: never dormant
    }
  }

  /** A join refused at the door: its one word for the lobby (`refused`), no seat made. */
  private refuse(conn: Conn, word: string): void {
    this.write(conn, encodeText(JSON.stringify({ t: 'refused', word } satisfies WireMsg)), true);
  }

  private dispatch(conn: Conn, m: WireMsg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !conn.seat) {
      // THE BUILD STAMP (THE ACTING SEAT): another build is refused at the door,
      // one word for its lobby, before any seat or roster row is made.
      if (m.build !== shardBuildStamp()) {
        this.write(conn, encodeText(JSON.stringify({ t: 'refused', word: SHARD_REFUSAL.build } satisfies WireMsg)), true);
        this.log(`[shard] a join from another build (${cleanId(typeof m.build === 'string' ? m.build.replace(/\./g, '_') : '') || 'no stamp'}) was refused`);
        this.drop(conn, 1008, 'another build', true);
        return;
      }
      // THE RECONNECT TOKEN: a join naming a DORMANT seat with its token takes that seat back
      // (THE RETURN: a resumeOnly join may also take back its own LIVE seat, its link dead unheard).
      if (m.resume !== undefined && m.resume !== null && this.resume(conn, m.resume, m.resumeOnly === true)) return;
      // THE COMPLETED LEAVE (W7): a join carrying the identity of a seat whose own socket
      // already said its deliberate word (a farewell whose close the shard has not heard yet)
      // finishes that leave first, so a return right after a leave is never refused as a
      // twin; a seat held in a fight sleeps instead, and THE IDENTITY below takes it back.
      if (this.identitySeat && isAccountId(m.accountId)) {
        const prior = this.identitySeat(m.accountId, vesselCharId(m.vessel));
        const pc = prior !== null ? this.bySeat.get(prior) : undefined;
        if (pc && pc !== conn && pc.leaving === true) {
          this.log(`[shard] ${prior} said its leave and its own hero returns on a new socket; the leave completes first`);
          this.drop(pc, 1000, 'left');
        }
      }
      // THE IDENTITY (THE SMOOTH SHELL): a join carrying the account and the vessel of a
      // DORMANT seat is its own player come back without the token (a new tab, a cleared
      // page): that seat, never the twin refusal and never a second hero.
      const back = this.reclaim && isAccountId(m.accountId) ? this.reclaim(m.accountId, vesselCharId(m.vessel)) : null;
      if (back !== null && this.dormant.has(back)) {
        this.rebind(conn, back);
        this.log(`[shard] ${back} came back by its account and vessel (no token); its dormant seat is re-bound`);
        return;
      }
      // THE RETURN: a join that wants its seat back and nothing else is refused, never seated fresh.
      if (m.resumeOnly === true) {
        this.write(conn, encodeText(JSON.stringify({ t: 'refused', word: SHARD_REFUSAL.resume } satisfies WireMsg)), true);
        this.drop(conn, 1008, 'no seat to return to', true);
        return;
      }
      // THE DOOR CAPS: a dormant seat still holds its place in the world. THE FRONT DOOR
      // (W7): a full world says so to the lobby before it closes.
      if (this.bySeat.size + this.dormant.size >= SHARD_WIRE_CFG.maxSeats) {
        this.refuse(conn, SHARD_REFUSAL.full);
        this.log(`[shard] a join was refused: the world is full (${SHARD_WIRE_CFG.maxSeats} seats)`);
        this.drop(conn, 1013, 'shard full', true);
        return;
      }
      const seatId: PlayerId = 'p' + (this.nextSeat++);
      conn.seat = seatId;
      conn.token = mintToken(); // THE RECONNECT TOKEN, minted at every join
      this.bySeat.set(seatId, conn);
      // THE NAME (card 17 A) is the vessel's own, else the join's; THE STOPGAP NAME (W7)
      // tells two unnamed heroes (or two of one name) apart on the roster.
      const vesselRow = m.vessel && typeof m.vessel === 'object' ? m.vessel as { name?: unknown; classId?: unknown } : null;
      const classId = cleanId(typeof vesselRow?.classId === 'string' ? vesselRow.classId : m.classId);
      const ownName = cleanName(typeof vesselRow?.name === 'string' ? vesselRow.name : m.name, '');
      const taken = this.peerList.filter(p => !p.isHost).map(p => p.name);
      const peer: PeerInfo = {
        id: seatId, isHost: false,
        name: this.nameJoin ? cleanName(this.nameJoin(ownName, classId, isAccountId(m.accountId) ? m.accountId : undefined, taken)) : cleanName(ownName || m.name),
        classId,
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
    } else if (m.t === 'ack' && conn.seat) {
      this.noteAck(conn, m.k, m.rs); // THE WIRE DIET: an arrival acknowledged on its own (the inputs went quiet)
    } else if (m.t === 'input' && conn.seat) {
      this.noteAck(conn, m.ak, m.rs); // THE WIRE DIET: the newest snapshot the client applied, riding its input
      const input = sanitizeInput(m.input);
      if (input) {
        const prev = this.pending.get(conn.seat); // keyed by the BINDING, never m.seat
        this.pending.set(conn.seat, mergeInputs(prev, input)); // THE PRESS IS KEPT, THE QUICK TAP and THE HONEST INPUT's batch
      }
    } else if (m.t === 'session' && conn.seat) {
      const msg = m.msg;
      if (!msg || typeof msg !== 'object' || !CLIENT_SESSION_KINDS.has(msg.t)) return;
      if (msg.t === 'leaving') conn.leaving = msg.unload === true ? 'unload' : true; // THE DELIBERATE LEAVE (W7: or THE UNLOAD WORD)
      const seat = conn.seat;
      this.sessionCbs.forEach(cb => this.guard(() => cb(msg, seat)));
    }
  }

  /** THE WIRE DIET's ack: a tick the client applied (monotonic, never past what was written);
   *  `rs` = THE IDENTITY ONCE missed a body, so the next frame rides whole. */
  private noteAck(conn: Conn, raw: unknown, rs?: unknown): void {
    if (rs === 1 && conn.diet && this.diet) this.diet.resendIdentities(conn.diet);
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
    const k = Math.floor(raw);
    if (k > conn.ackTick && k <= conn.sentTick) conn.ackTick = k;
    while (conn.inflight.length && conn.inflight[0] <= conn.ackTick) conn.inflight.shift();
  }

  /** The welcome a seated connection hears, a fresh join's and a resume's alike
   *  (THE SEED THREAD, the hearth's features, THE LAND DIGEST, THE RECONNECT TOKEN). */
  private welcome(conn: Conn, resumed = false): Uint8Array {
    return encodeText(JSON.stringify({ t: 'welcome', self: conn.seat!, peers: this.peerList, seed: this.seedSource() >>> 0, worldmass: this.worldmass,
      features: this.features, ...(this.land ? { land: this.land } : {}), resume: { token: conn.token }, world: this.worldName, // THE FRONT DOOR: the world's name
      ...(resumed ? { resumed: true } : {}), // THE RETURN: a standing seat came back
      build: shardBuildStamp() } satisfies WireMsg)); // THE BUILD STAMP
  }

  /** THE RECONNECT TOKEN: re-bind a DORMANT seat to this connection when the
   *  join names it with its token: the same seat id, actor and records, a
   *  fresh token, and no `pjoin` (no peer ever saw it leave). THE RETURN
   *  (`returning`: the join wants its seat and nothing else): a LIVE seat whose
   *  own token comes back over a new socket is a link that died without the
   *  shard hearing it, so the old socket is let go (its close touches no seat)
   *  and the seat re-binds. Anything else joins fresh (false), with one log line. */
  private resume(conn: Conn, raw: unknown, returning = false): boolean {
    const r: Partial<ShardResume> = raw && typeof raw === 'object' ? raw as Partial<ShardResume> : {};
    const seat = typeof r.seat === 'string' ? r.seat : '', token = typeof r.token === 'string' ? r.token : '';
    const held = this.dormant.get(seat);
    const live = held === undefined && returning ? this.bySeat.get(seat) : undefined;
    if (live && live !== conn && sameToken(live.token, token)) {
      live.seat = null; // the old socket no longer holds the seat: its close is nobody's leave
      this.bySeat.delete(seat);
      this.pending.delete(seat); // the hand on the dead link is gone
      this.drop(live, 4000, 'superseded', true);
      this.log(`[shard] ${seat} returned over a new socket; its old link let go`);
      this.rebind(conn, seat);
      return true;
    }
    if (held === undefined || !sameToken(held, token)) {
      this.log(`[shard] a resume naming ${cleanId(seat) || 'no seat'} was refused (${held === undefined ? 'not a dormant seat' : 'a wrong token'}); it joins fresh`);
      return false;
    }
    this.rebind(conn, seat);
    return true;
  }

  /** Bind a standing seat (dormant, or one THE RETURN let go of) to this connection: a fresh
   *  token, the welcome (marked resumed), and the host stops the clock and re-ships its world. */
  private rebind(conn: Conn, seat: PlayerId): void {
    this.dormant.delete(seat);
    conn.seat = seat;
    conn.token = mintToken();
    this.bySeat.set(seat, conn);
    this.write(conn, this.welcome(conn, true), true);
    this.resumeCbs.forEach(cb => this.guard(() => cb(seat))); // the host stops the clock and re-ships the seat's world
  }

  /** THE UNLOAD BEACON (W7, THE HONEST LEAVING, best effort): `{ seat, token }` posted by a
   *  page going away. The seat's token proves it. A live socket's close then takes THE
   *  UNLOAD WORD's road; a seat already dormant (its close came first) is re-timed by the
   *  host onto the reload grace (onPeerUnload). Anything else is ignored. Always 204. */
  private unloadBeacon(req: IncomingMessage, res: ServerResponse): void {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => { body += c; if (body.length > SHARD_UNLOAD_BEACON_MAX) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204, { 'cache-control': 'no-store' });
      res.end();
      let m: { seat?: unknown; token?: unknown } = {};
      try { m = JSON.parse(body) as { seat?: unknown; token?: unknown }; } catch { return; }
      const seat = typeof m.seat === 'string' ? m.seat : '', token = typeof m.token === 'string' ? m.token : '';
      const live = this.bySeat.get(seat);
      if (live && sameToken(live.token, token)) { if (!live.leaving) live.leaving = 'unload'; return; }
      const held = this.dormant.get(seat);
      if (held !== undefined && sameToken(held, token)) this.unloadCbs.forEach(cb => this.guard(() => cb(seat)));
    });
    req.on('error', () => { /* a torn beacon says nothing */ });
  }
  private readonly unloadCbs = new Set<(id: PlayerId) => void>();
  /** THE UNLOAD BEACON (W7): a DORMANT seat's page said it went away (its close came first). */
  onPeerUnload(cb: (id: PlayerId) => void): () => void { this.unloadCbs.add(cb); return () => { this.unloadCbs.delete(cb); }; }

  /** THE COMPLETED LEAVE (W7): the host names the seat (live or dormant) whose vessel is
   *  this account's character `charId` (null: none). Unset = no completion. */
  identitySeat: ((accountId: string, charId: string) => PlayerId | null) | null = null;

  /** THE IDENTITY's reclaim (THE SMOOTH SHELL): the host names the DORMANT seat whose
   *  vessel is this account's character `charId` (null: none). Unset = no reclaim. */
  reclaim: ((accountId: string, charId: string) => PlayerId | null) | null = null;

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
    // THE ACTING SEAT: a word said mid-fight is no farewell. A seat the host
    // holds (leaveHolds: hurt or hurting within VESSEL_CFG.combatLeaveSec)
    // sleeps like a lost socket instead of leaving at once.
    const held = !!conn.leaving && (this.leaveHolds?.(gone) ?? false);
    // THE UNLOAD WORD (W7): a page that went away out of a fight sleeps on the host's
    // short reload grace (a reload takes the seat back; a closed tab's hero leaves soon).
    const unload = conn.leaving === 'unload' && !held;
    const lost = !conn.leaving || held || unload;
    if (lost && !refused && !this.closing && this.dormantCbs.size) {
      // THE DORMANT SEAT: no word and no refusal, so the connection was LOST.
      // The seat stays (its roster row and token kept, no pleave); the host's
      // clock decides (a host that never listens keeps the old law below).
      this.dormant.set(gone, conn.token);
      this.dormantCbs.forEach(cb => this.guard(() => cb(gone, !!conn.leaving, unload)));
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
    try { conn.sock.write(frame); this.bytesOut += frame.length; this.framesOut++; return true; } catch { return false; } // THE SOAK counts what left
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

  /** THE OWN ENTRY (snapshot.ts SEAT_OWN_ROWS) and THE ACTING SEAT's audiences (net/seatView.ts):
   *  a seat's own rows (its clocks, its refusal note, its surge) reach its own socket and never
   *  another's, a notice with an audience reaches that audience alone and an eyecatch the seats
   *  that may see it; a snapshot carrying none of these is the one broadcast frame it was. */
  sendState(s: StateSnapshot): void { this.sendStateTo(s, this.bySeat.keys()); }
  /** THE WIRE PER UNIT (shard M1): a unit's snapshot to its own seats' sockets alone (a
   *  seat with no socket, the warden or a dormant seat, is skipped). sendState's laws, per
   *  socket: THE OWN ENTRY and the audiences split each frame exactly as the broadcast did. */
  sendStateTo(s: StateSnapshot, seatIds: Iterable<PlayerId>): void {
    const conns: [PlayerId, Conn][] = [];
    for (const id of seatIds) { const c = this.bySeat.get(id); if (c) conns.push([id, c]); }
    if (!conns.length) return;
    // THE WIRE DIET (server/wireDiet.ts): a snapshot the host bound to its World goes out per
    // audience, under the flow control; anything else keeps the pre-diet frames below.
    const dietWorld = WIRE_DIET_CFG.enabled && this.diet ? this.diet.worldFor(s) : undefined;
    if (dietWorld && this.diet) { this.sendDiet(this.diet, dietWorld, s, conns); return; }
    const sent = (c: Conn, ok: boolean): void => { if (ok) c.sentTick = s.tick; }; // THE WIRE DIET's ack reads the newest written
    const heard = seatAudienceSplit(s); // THE ACTING SEAT: an audience rides this snapshot (the own rows go with it)
    if (heard) {
      const body = seatAudienceBody(heard);
      for (const [seat, c] of conns) sent(c, this.write(c, encodeText(seatAudienceFrame(body, heard, seat))));
      return;
    }
    // THE OWN ENTRY (snapshot.ts SEAT_OWN_ROWS): a seat's own rows (its clocks) reach its own
    // socket and never another's; a snapshot carrying none is the one shared frame it was.
    const own = ownEntryJson(s);
    if (!own) { const frame = encodeText(JSON.stringify({ t: 'snap', snap: s } satisfies WireMsg)); for (const [, c] of conns) sent(c, this.write(c, frame)); return; }
    let bare: Uint8Array | null = null; // the shared frame for every socket whose seat carries no own row
    for (const [seat, c] of conns) {
      const mine = own.forSeat(seat);
      sent(c, this.write(c, mine !== null ? encodeText('{"t":"snap","snap":' + mine + '}') : (bare ??= encodeText('{"t":"snap","snap":' + own.bare + '}'))));
    }
  }
  /** THE WIRE DIET's send: FLOW CONTROL first (a socket that acked once is skipped while more
   *  than maxUnacked frames written to it wait for its ack, and its changed rows carry
   *  forward), a whole zone to a socket whose ground is not this World's
   *  (the self-heal), then one encoding per distinct audience set, written per socket. */
  private sendDiet(diet: ShardDiet, w: Parameters<ShardDiet['frames']>[0], s: StateSnapshot, conns: readonly [PlayerId, Conn][]): void {
    const take: { seat: string; st: DietSeat; conn: Conn }[] = [];
    for (const [seat, c] of conns) {
      const st = c.diet ??= diet.seat();
      if (c.ackTick >= 0 && c.inflight.length > WIRE_DIET_CFG.maxUnacked) { diet.hold(st, s, seat); diet.skipped++; continue; }
      if (diet.needsZone(st, w)) this.sendZoneTo(seat, serializeZone(w));
      take.push({ seat, st, conn: c });
    }
    if (!take.length) return;
    for (const f of diet.frames(w, s, take)) {
      if (this.write(f.conn, f.frame)) {
        f.conn.sentTick = s.tick;
        if (f.conn.ackTick >= 0) f.conn.inflight.push(s.tick); // in flight until its ack (a client that never acked is the buffer's alone)
        diet.delivered(f.st, f);
      }
      else diet.hold(f.st, s, f.seat); // a congested buffer skipped it: the changed rows carry
    }
  }
  onState(cb: (s: StateSnapshot) => void): () => void { this.stateCbs.add(cb); return () => { this.stateCbs.delete(cb); }; }
  sendZone(z: ZoneMsg): void {
    this.broadcast({ t: 'zone', zone: z }, undefined, true);
    for (const [id, c] of this.bySeat) this.zoneShipped(c, id, z); // THE WIRE DIET: the ground each socket now holds
  }
  /** THE WIRE PER UNIT (shard M1): a unit's zone message (a change, THE DRESS BEAT) to its own seats. */
  sendZoneToMany(z: ZoneMsg, seatIds: Iterable<PlayerId>): void {
    let frame: Uint8Array | null = null;
    for (const id of seatIds) {
      const c = this.bySeat.get(id);
      if (c && this.write(c, frame ??= encodeText(JSON.stringify({ t: 'zone', zone: z } satisfies WireMsg)), true)) this.zoneShipped(c, id, z);
    }
  }
  /** Ship the zone to ONE seat (a joiner's first terrain, a re-seat). */
  sendZoneTo(seat: PlayerId, z: ZoneMsg): void {
    const c = this.bySeat.get(seat);
    if (c && this.write(c, encodeText(JSON.stringify({ t: 'zone', zone: z } satisfies WireMsg)), true)) this.zoneShipped(c, seat, z);
  }
  /** THE WIRE DIET: a zone message reached a socket; its client's ground is that zone's now. */
  private zoneShipped(c: Conn, seat: PlayerId, z: ZoneMsg): void {
    if (this.diet) this.diet.zoneShipped(c.diet ??= this.diet.seat(), seat, z);
  }
  onZone(cb: (z: ZoneMsg) => void): () => void { this.zoneCbs.add(cb); return () => { this.zoneCbs.delete(cb); }; }
  /** A join: the host-side roster row (with its accountId) + the vessel it carried. */
  onPeerJoin(cb: (p: PeerInfo, join: ShardJoin) => void): () => void { this.joinCbs.add(cb); return () => { this.joinCbs.delete(cb); }; }
  onPeerLeave(cb: (id: PlayerId) => void): () => void { this.leaveCbs.add(cb); return () => { this.leaveCbs.delete(cb); }; }
  /** THE DORMANT SEAT: a seat's socket was lost without its word, or said it mid-fight (`worded`, THE
   *  ACTING SEAT's leaveHolds), or its page went away out of a fight (`unload`, W7's THE UNLOAD
   *  WORD: the short reload grace); the host starts its clock, or releases it at once. */
  onPeerDormant(cb: (id: PlayerId, worded: boolean, unload: boolean) => void): () => void { this.dormantCbs.add(cb); return () => { this.dormantCbs.delete(cb); }; }
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
