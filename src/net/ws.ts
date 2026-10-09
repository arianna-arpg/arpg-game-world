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
import { SHARD_REFUSAL, shardBuildStamp } from './shardBuild';

/** THE GRAMMAR — one JSON message per frame, both directions. */
export type WireMsg =
  | { t: 'join'; classId: string; name: string; cosmeticLoadout?: import('../engine/cosmetics').CosmeticLoadout;
      /** THE IDENTITY + THE VESSEL (docs/engine/shard.md "The vessel and the
       *  corpse"): the account's id, and the hero that travels (a
       *  CharacterSave with NO world half; absent = a fresh hero). */
      accountId?: string; vessel?: import('../meta/character').CharacterSave;
      /** THE RECONNECT TOKEN (card 16 B, docs/engine/shard.md "The pieces"):
       *  a dropped session's seat and the token its welcome carried; a match
       *  on a DORMANT seat re-binds this connection to it. */
      resume?: ShardResume;
      /** THE BUILD STAMP (net/shardBuild.ts): the shard refuses another build at the door. */
      build?: string }
  | { t: 'welcome'; self: PlayerId; peers: PeerInfo[]; seed: number; worldmass?: boolean; features?: string[]; land?: string;
      /** THE RECONNECT TOKEN the shard minted for this seat at this join (a resume mints a fresh one). */
      resume?: { token: string };
      /** THE BUILD STAMP: the build the shard runs (a client refuses another, or none). */
      build?: string }
  /** THE BUILD STAMP's door: the join was refused before any seat was made (one word for the lobby). */
  | { t: 'refused'; word: string }
  | { t: 'input'; seat: PlayerId; input: PlayerInput }
  | { t: 'snap'; snap: StateSnapshot }
  | { t: 'zone'; zone: ZoneMsg }
  | { t: 'pjoin'; peer: PeerInfo }
  | { t: 'pleave'; id: PlayerId }
  | { t: 'session'; msg: SessionMsg };

export const WS_TRANSPORT_CFG = {
  /** Default address the lobby's "Join a Server" box offers. */
  defaultUrl: 'ws://localhost:8787',
  /** The port a bare host name is given. */
  defaultPort: 8787,
  /** A connect that has heard no welcome by then fails (a private port, a
   *  wrong address, a sleeping codespace all answer with silence). */
  connectTimeoutMs: 10_000,
  /** Hosts a port forwarder serves as TLS on :443 only (a codespace, a dev tunnel; GitHub
   *  says its forwarding domain can change, hence a list): a bare host there becomes
   *  wss:// with no port, and a container port pasted onto it is dropped. */
  tlsHostSuffixes: ['.app.github.dev', '.devtunnels.ms'],
  /** THE FAREWELL: how long a leaving vessel holds its socket open for the
   *  shard's last mirror (`heroSave`) before it closes anyway (ms). */
  farewellMs: 1500,
  /** THE RECONNECT TOKEN: how long after a session was lost the lobby's
   *  Connect still offers the shard its seat and token (ms). The shard holds
   *  a dropped seat dormant for SHARD_CFG.dormantSec; past either clock the
   *  connect is a fresh join. */
  resumeWindowMs: 30_000,
};

/** THE ADDRESS, as a player types it: a Codespaces `https://…` becomes
 *  `wss://…`, `http://` becomes `ws://`, a bare host gets `ws://` and the
 *  default port, and whitespace is forgiven. */
export function normalizeShardUrl(raw: string): string {
  let s = raw.trim();
  const forwarded = (host: string): boolean => WS_TRANSPORT_CFG.tlsHostSuffixes.some(sfx => host.toLowerCase().endsWith(sfx));
  if (/^https:\/\//i.test(s)) s = 'wss://' + s.slice(8);
  else if (/^http:\/\//i.test(s)) s = 'ws://' + s.slice(7);
  else if (!/^wss?:\/\//i.test(s)) s = (forwarded(s.split(/[/:?#]/, 1)[0]) ? 'wss://' : 'ws://') + s;
  s = s.replace(/\/+$/, '');
  const m = /^wss?:\/\/([^/:?#]+)(?::\d+)?(.*)$/i.exec(s);
  if (m && forwarded(m[1])) s = 'wss://' + m[1] + m[2];
  if (/^ws:\/\/[^/:]+$/i.test(s)) s += ':' + WS_TRANSPORT_CFG.defaultPort;
  return s;
}

/** THE SERVED CLIENT's first offer: a page a forwarded host handed out (a codespace's shard
 *  serving its own client) offers the shard that served it; everywhere else, the default. */
export function defaultShardUrl(): string {
  try {
    const host = location.hostname;
    if (WS_TRANSPORT_CFG.tlsHostSuffixes.some(sfx => host.toLowerCase().endsWith(sfx))) return normalizeShardUrl(location.origin);
  } catch { /* no window: a probe, a worker */ }
  return WS_TRANSPORT_CFG.defaultUrl;
}

/** THE RECONNECT TOKEN (card 16 B): a dropped session's seat and its token. */
export interface ShardResume { seat: PlayerId; token: string }

/** THE REMEMBERED SESSION: the last session a shard's welcome seated: its
 *  address (normalized), our seat, the token minted for it, and when it was
 *  last known whole (the welcome, then the moment its host was lost). It
 *  outlives its transport on purpose (the lobby's next Connect builds a new
 *  one); a deliberate leave() forgets it. Page memory only: a reload joins
 *  fresh. */
export interface ShardSession { url: string; self: PlayerId; token: string; at: number }
let lastSession: ShardSession | null = null;

/** The resume the lobby's Connect sends: the remembered seat and token when
 *  that session was on this address and was lost under resumeWindowMs ago;
 *  else null (a fresh join). */
export function shardResumeFor(url: string, now = Date.now()): ShardResume | null {
  const s = lastSession;
  if (!s || s.url !== normalizeShardUrl(url) || now - s.at >= WS_TRANSPORT_CFG.resumeWindowMs) return null;
  return { seat: s.self, token: s.token };
}

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
  /** THE REMEMBERED SESSION this transport's welcome minted (lastSession while it is the newest). */
  private session: ShardSession | null = null;

  peers(): PeerInfo[] { return this.peerList; }

  host(): Promise<{ code: string; self: PlayerId }> {
    return Promise.reject(new Error('WsTransport is a client — the shard hosts'));
  }

  /** NetTransport's join: the code IS the server URL. */
  join(code: string, info: Omit<PeerInfo, 'id' | 'isHost'>): Promise<{ self: PlayerId }> {
    return this.connect(code, info).then(r => ({ self: r.self }));
  }

  /** Open the socket and wait for the shard's welcome. Resolves with our seat
   *  id AND the shard's run seed (the lobby builds the render shell from it).
   *  `resume` (THE RECONNECT TOKEN) asks for a dormant seat back; `resumed`
   *  says the shard re-bound it (else the welcome seated us fresh). */
  connect(url: string, info: Omit<PeerInfo, 'id' | 'isHost'>, vessel?: import('../meta/character').CharacterSave, resume?: ShardResume): Promise<{ self: PlayerId; seed: number; worldmass: boolean; features: string[]; land?: string; resumed: boolean }> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(normalizeShardUrl(url)); } catch (e) { reject(e instanceof Error ? e : new Error(String(e))); return; }
      this.ws = ws;
      let settled = false;
      const fail = (why: string): void => { if (settled) return; settled = true; reject(new Error(why)); };
      const timer = setTimeout(() => { if (!settled) { fail('no answer from the server'); try { ws.close(); } catch { /* already closed */ } } }, WS_TRANSPORT_CFG.connectTimeoutMs);
      const settle = (): void => { clearTimeout(timer); };
      ws.onopen = (): void => {
        ws.send(JSON.stringify({ t: 'join', classId: info.classId, name: info.name, cosmeticLoadout: info.cosmeticLoadout,
          ...(info.accountId ? { accountId: info.accountId } : {}), ...(vessel ? { vessel } : {}),
          ...(resume ? { resume: { seat: resume.seat, token: resume.token } } : {}), // THE RECONNECT TOKEN
          build: shardBuildStamp() } satisfies WireMsg)); // THE BUILD STAMP
      };
      ws.onmessage = (ev): void => {
        let m: WireMsg;
        try { m = JSON.parse(String(ev.data)) as WireMsg; } catch { return; }
        if (m.t === 'refused' && !this.welcomed) { fail(typeof m.word === 'string' ? m.word : SHARD_REFUSAL.build); return; } // THE BUILD STAMP's door
        if (m.t === 'welcome' && m.build !== shardBuildStamp()) { // THE BUILD STAMP: another build's world (or an older shard's)
          fail(SHARD_REFUSAL.build);
          try { ws.close(1000, 'another build'); } catch { /* already closed */ }
          return;
        }
        if (m.t === 'welcome') {
          this.self = m.self; this.peerList = m.peers; this.welcomed = true;
          // THE REMEMBERED SESSION: this seat and its token outlive a lost host
          // (a deliberate leave forgets them); a welcome with no token is no session to resume.
          const token = typeof m.resume?.token === 'string' ? m.resume.token : '';
          this.session = lastSession = token ? { url: normalizeShardUrl(url), self: m.self, token, at: Date.now() } : null;
          if (!settled) {
            settled = true;
            settle();
            // THE SHARD'S TOWN FEATURES: the account features that size the hearth
            // (townTier) — a wilds shell builds its World with these so the seed
            // lays the SAME settlement the server laid (strings only, sanitized).
            const features = Array.isArray(m.features) ? m.features.filter((f): f is string => typeof f === 'string').slice(0, 256) : [];
            resolve({ self: m.self, seed: m.seed, worldmass: m.worldmass === true, features, land: typeof m.land === 'string' ? m.land : undefined,
              resumed: !!resume && m.self === resume.seat }); // THE RECONNECT TOKEN: the dormant seat came back
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
      case 'session':
        this.sessionCbs.forEach(cb => cb(m.msg, 'p0')); // from the shard (the host seat)
        if (m.msg?.t === 'heroSave') this.farewellClose?.(); // THE FAREWELL: the last mirror landed
        break;
      default: break; // join/input/welcome never arrive at a client
    }
  }

  /** THE FAREWELL (a traveling vessel's clean leave — docs/engine/shard.md
   *  "The vessel and the corpse"): armed by the vessel link when a hero
   *  traveled, leave() holds the socket open after its `session leaving`
   *  (the shard's cue for the last mirror) until that `heroSave` lands or
   *  WS_TRANSPORT_CFG.farewellMs passes. The session subscribers still
   *  standing receive it as any message. Disarmed: the word, then the
   *  instant close. */
  farewell = false;
  private farewellClose: (() => void) | null = null;

  leave(): void {
    // THE DELIBERATE LEAVE (card 16 B): a live session we end ourselves says
    // so (`session leaving`), so the shard ends the seat at once instead of
    // holding it dormant, and forgets its token; a session already lost keeps
    // the token for the lobby's resume.
    const deliberate = this.welcomed && !this.hostGone;
    this.hostGone = true; // our own teardown — never a lost host
    if (deliberate && this.session && lastSession === this.session) lastSession = null;
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const close = (): void => {
      this.farewellClose = null;
      if (timer !== null) clearTimeout(timer);
      try { ws.close(1000, 'leave'); } catch { /* already closed */ }
    };
    if (deliberate && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ t: 'session', msg: { t: 'leaving' } } satisfies WireMsg)); } catch { close(); return; }
      if (this.farewell) {
        this.farewellClose = close;
        timer = setTimeout(close, WS_TRANSPORT_CFG.farewellMs);
        (timer as { unref?: () => void }).unref?.(); // a Node rig never waits on a farewell
        return;
      }
    }
    close();
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
    if (this.session) this.session.at = Date.now(); // THE REMEMBERED SESSION: the resume window opens at the loss
    this.hostLostCbs.forEach(cb => cb());
  }
}
