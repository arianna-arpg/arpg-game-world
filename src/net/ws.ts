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
import { SHARD_LEAVE_WORD, SHARD_REFUSAL, SHARD_UNLOAD_BEACON_PATH, shardBuildStamp } from './shardBuild';
import { storageKey } from '../buildProfile';

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
      /** THE RETURN (THE SMOOTH SHELL): this join wants its seat back and nothing else: the
       *  shard re-binds it (a dormant seat, or a live one whose own token comes back over a
       *  new socket: the old link died unheard) or refuses; it never seats a fresh hero. */
      resumeOnly?: boolean;
      /** THE BUILD STAMP (net/shardBuild.ts): the shard refuses another build at the door. */
      build?: string }
  | { t: 'welcome'; self: PlayerId; peers: PeerInfo[]; seed: number; worldmass?: boolean; features?: string[]; land?: string;
      /** THE RECONNECT TOKEN the shard minted for this seat at this join (a resume mints a fresh one). */
      resume?: { token: string };
      /** THE RETURN: the welcome re-bound a standing seat (a token, or THE IDENTITY of a dormant vessel). */
      resumed?: boolean;
      /** THE BUILD STAMP: the build the shard runs (a client refuses another, or none). */
      build?: string;
      /** THE FRONT DOOR (W7): the world's own name (a menu's "Return to <world>"). */
      world?: string }
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

/** THE SERVED MARK (W7, THE FRONT DOOR): the meta tag a shard's served index wears
 *  (server/shardTransport.ts serveClient); its content is the world's name. */
export const SHARD_SERVED_MARK = 'hw-shard';

/** A page as THE SERVED MARK reads it (its origin, host, query, and the mark's content). */
export interface ShardPage { origin: string; hostname: string; search: string; mark: string | null }
/** This page (null off a browser: a probe, a worker). */
function thisPage(): ShardPage | null {
  try {
    const mark = typeof document === 'undefined' ? null
      : document.querySelector(`meta[name="${SHARD_SERVED_MARK}"]`)?.getAttribute('content') ?? null;
    return { origin: location.origin, hostname: location.hostname, search: location.search, mark };
  } catch { return null; }
}

/** THE SERVED MARK (W7, THE FRONT DOOR): the world a page leads to, or null for a plain
 *  page. A page a shard served (its mark), or one a forwarded host handed out (a codespace;
 *  an older shard that wears no mark), leads to its own origin; THE DEV DOOR
 *  (`?dev&shard=<address>`, honored only under the `?dev` opt-in) points a dev server's
 *  page at a local shard, so a plain link can never aim a player at a stranger's world. */
export function servedShardUrl(page: ShardPage | null = thisPage()): string | null {
  if (!page) return null;
  const host = page.hostname.toLowerCase();
  if (page.mark !== null || WS_TRANSPORT_CFG.tlsHostSuffixes.some(sfx => host.endsWith(sfx))) {
    return /^https?:\/\//i.test(page.origin) ? normalizeShardUrl(page.origin) : null;
  }
  let q: URLSearchParams;
  try { q = new URLSearchParams(page.search); } catch { return null; }
  const dev = q.has('dev') ? (q.get('shard') ?? '').trim() : '';
  return dev ? normalizeShardUrl(dev) : null;
}

/** THE SERVED MARK's world name (null: an unmarked page). */
export function servedWorldName(page: ShardPage | null = thisPage()): string | null {
  const m = page?.mark?.trim();
  return m ? m.slice(0, 64) : null;
}

/** THE SERVED CLIENT's first offer: a page a shard served offers the shard that served it
 *  (THE SERVED MARK); everywhere else, the default. */
export function defaultShardUrl(): string {
  return servedShardUrl() ?? WS_TRANSPORT_CFG.defaultUrl;
}

/** THE HONEST LEAVING (W7): how a deliberate leave ended. `saved`: the farewell mirror
 *  landed before the close; `held`: the shard holds the hero in a fight (its word rides
 *  the seat's own note, `word`); `quiet`: neither came before the cap (or no hero traveled). */
export interface ShardFarewell { end: 'saved' | 'held' | 'quiet'; word?: string }

/** THE RECONNECT TOKEN (card 16 B): a dropped session's seat and its token. */
export interface ShardResume { seat: PlayerId; token: string }

/** THE REMEMBERED SESSION: the last session a shard's welcome seated: its
 *  address (normalized), our seat, the token minted for it, and when it was
 *  last known whole (the welcome, each snapshot, then the moment its host was
 *  lost). It outlives its transport on purpose (the lobby's next Connect builds
 *  a new one); a deliberate leave() forgets it. THE SMOOTH SHELL: it is kept in
 *  sessionStorage too (`{url, seat, token, expiresAt}`, refreshed at most once a
 *  second while snapshots land), so a reload inside the window takes the same
 *  seat back (main.ts's boot returns to it) instead of joining fresh. */
export interface ShardSession { url: string; self: PlayerId; token: string; at: number }
let lastSession: ShardSession | null = null;

/** THE REMEMBERED SESSION's page-surviving copy (sessionStorage: this tab alone). */
const SESSION_KEY = storageKey('hw_shard_session');
interface StoredSession { url: string; seat: PlayerId; token: string; expiresAt: number }
function sessionStore(): Storage | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } // a Node rig, a sandboxed frame
}
function persistSession(s: ShardSession | null): void {
  const store = sessionStore();
  if (!store) return;
  try {
    if (!s) store.removeItem(SESSION_KEY);
    else store.setItem(SESSION_KEY, JSON.stringify({ url: s.url, seat: s.self, token: s.token, expiresAt: s.at + WS_TRANSPORT_CFG.resumeWindowMs } satisfies StoredSession));
  } catch { /* storage may refuse */ }
}
function storedSession(now: number): ShardSession | null {
  const store = sessionStore();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof v.url !== 'string' || typeof v.seat !== 'string' || typeof v.token !== 'string'
      || typeof v.expiresAt !== 'number' || !Number.isFinite(v.expiresAt) || now >= v.expiresAt) return null;
    return { url: v.url, self: v.seat, token: v.token, at: v.expiresAt - WS_TRANSPORT_CFG.resumeWindowMs };
  } catch { return null; }
}

/** The resume the lobby's Connect sends: the remembered seat and token when
 *  that session was on this address and was lost under resumeWindowMs ago;
 *  else null (a fresh join). After a reload the page-surviving copy answers. */
export function shardResumeFor(url: string, now = Date.now()): ShardResume | null {
  const s = lastSession ?? storedSession(now);
  if (!s || s.url !== normalizeShardUrl(url) || now - s.at >= WS_TRANSPORT_CFG.resumeWindowMs) return null;
  return { seat: s.self, token: s.token };
}

/** THE SMOOTH SHELL (a reload): the shard this tab was seated on, while its window stands
 *  (main.ts's boot returns to it, resumeOnly); null when there is none to return to. */
export function rememberedShardSession(now = Date.now()): { url: string } | null {
  if (lastSession) return null; // this page holds a session of its own: no reload to return from
  const s = storedSession(now);
  return s ? { url: s.url } : null;
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
  /** THE RETURN: the address and roster row this transport joined with (resumeInPlace re-sends them). */
  private url = '';
  private joinInfo: Omit<PeerInfo, 'id' | 'isHost'> | null = null;
  /** When the session's page-surviving copy was last written (ms; at most once a second). */
  private persistedAt = 0;

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
   *  says the shard re-bound it (else the welcome seated us fresh).
   *  `opts.resumeOnly` (THE RETURN): the seat back or a refusal, never a fresh seat. */
  connect(url: string, info: Omit<PeerInfo, 'id' | 'isHost'>, vessel?: import('../meta/character').CharacterSave, resume?: ShardResume,
    opts?: { resumeOnly?: boolean }): Promise<{ self: PlayerId; seed: number; worldmass: boolean; features: string[]; land?: string; resumed: boolean; world?: string }> {
    this.url = normalizeShardUrl(url);
    this.joinInfo = info;
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
          ...(opts?.resumeOnly ? { resumeOnly: true } : {}), // THE RETURN
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
          persistSession(this.session); // THE SMOOTH SHELL: the copy a reload returns with
          if (!settled) {
            settled = true;
            settle();
            // THE SHARD'S TOWN FEATURES: the account features that size the hearth
            // (townTier) — a wilds shell builds its World with these so the seed
            // lays the SAME settlement the server laid (strings only, sanitized).
            const features = Array.isArray(m.features) ? m.features.filter((f): f is string => typeof f === 'string').slice(0, 256) : [];
            const world = typeof m.world === 'string' && m.world.trim() ? m.world.trim().slice(0, 64) : undefined; // THE FRONT DOOR: the world's name
            resolve({ self: m.self, seed: m.seed, worldmass: m.worldmass === true, features, land: typeof m.land === 'string' ? m.land : undefined,
              resumed: m.resumed === true || (!!resume && m.self === resume.seat), ...(world ? { world } : {}) }); // THE RECONNECT TOKEN: the dormant seat came back
          }
          return;
        }
        this.dispatch(m);
      };
      ws.onerror = (): void => {
        if (!this.welcomed) fail('could not reach the server');
        else if (ws.readyState !== WebSocket.OPEN && this.ws === ws) this.signalHostLost();
      };
      ws.onclose = (): void => {
        if (!this.welcomed) fail('the server closed the connection before seating us');
        else if (this.ws === ws) this.signalHostLost();
      };
    });
  }

  /** THE RETURN (THE SMOOTH SHELL, docs/engine/shard.md): open this transport's socket again
   *  IN PLACE with THE RECONNECT TOKEN, every subscriber kept, so the shell never leaves. The
   *  old socket goes quietly first (its close is never a lost host). The join asks for the seat
   *  alone (resumeOnly): the shard re-binds it or refuses, and never seats a fresh hero (an
   *  older shard that does is given its seat back at once). `final`: no retry can help. */
  resumeInPlace(): Promise<{ ok: true } | { ok: false; word: string; final: boolean }> {
    const s = this.session, info = this.joinInfo, url = this.url;
    if (!s || !info || !url) return Promise.resolve({ ok: false, word: 'no session to return to', final: true });
    this.detachSocket();
    return new Promise(resolve => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) { resolve({ ok: false, word: e instanceof Error ? e.message : String(e), final: false }); return; }
      this.ws = ws;
      let settled = false;
      const done = (r: { ok: true } | { ok: false; word: string; final: boolean }): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!r.ok && this.ws === ws) { this.detachSocket(); }
        resolve(r);
      };
      const timer = setTimeout(() => done({ ok: false, word: 'no answer from the server', final: false }), WS_TRANSPORT_CFG.connectTimeoutMs);
      ws.onopen = (): void => {
        ws.send(JSON.stringify({ t: 'join', classId: info.classId, name: info.name, cosmeticLoadout: info.cosmeticLoadout,
          ...(info.accountId ? { accountId: info.accountId } : {}),
          resume: { seat: s.self, token: s.token }, resumeOnly: true, build: shardBuildStamp() } satisfies WireMsg));
      };
      ws.onmessage = (ev): void => {
        let m: WireMsg;
        try { m = JSON.parse(String(ev.data)) as WireMsg; } catch { return; }
        if (settled) { if (this.ws === ws || this.farewellWs === ws) this.dispatch(m); return; } // THE FAREWELL rides a resumed socket too
        if (m.t === 'refused') { done({ ok: false, word: typeof m.word === 'string' ? m.word : '', final: true }); return; }
        if (m.t !== 'welcome') return; // nothing a client needs precedes the welcome
        if (m.build !== shardBuildStamp()) { done({ ok: false, word: SHARD_REFUSAL.build, final: true }); return; }
        if (m.self !== s.self) {
          // An older shard seated us fresh: that seat goes back at once (the word, then the close).
          try { ws.send(JSON.stringify({ t: 'session', msg: { t: 'leaving' } } satisfies WireMsg)); } catch { /* closing */ }
          done({ ok: false, word: 'the seat could not be taken back', final: true });
          return;
        }
        this.peerList = m.peers; this.welcomed = true; this.hostGone = false; // re-armed: a later loss is heard again
        const token = typeof m.resume?.token === 'string' ? m.resume.token : '';
        this.session = lastSession = token ? { url: s.url, self: m.self, token, at: Date.now() } : null;
        persistSession(this.session);
        done({ ok: true });
      };
      ws.onerror = (): void => {
        if (!settled) done({ ok: false, word: 'could not reach the server', final: false });
        else if (ws.readyState !== WebSocket.OPEN && this.ws === ws) this.signalHostLost();
      };
      ws.onclose = (): void => {
        if (!settled) done({ ok: false, word: 'the server closed the connection', final: false });
        else if (this.ws === ws) this.signalHostLost();
      };
    });
  }

  /** The current socket goes quietly: no handler of it ever speaks again. */
  private detachSocket(): void {
    const old = this.ws;
    this.ws = null;
    if (!old) return;
    old.onopen = null; old.onmessage = null; old.onerror = null; old.onclose = null;
    try { old.close(4000, 'return'); } catch { /* already closed */ }
  }

  /** THE REMEMBERED SESSION is whole while snapshots land (its page-surviving copy, once a second). */
  private touchSession(): void {
    const s = this.session;
    if (!s) return;
    const now = Date.now();
    s.at = now;
    if (now - this.persistedAt >= 1000 && lastSession === s) { this.persistedAt = now; persistSession(s); }
  }

  private dispatch(m: WireMsg): void {
    switch (m.t) {
      case 'snap':
        this.touchSession();
        if (this.farewellSettle) { // THE HONEST LEAVING: the shard's word that it holds the hero rides our own note
          const fn = m.snap?.seats?.[this.self]?.fn;
          if (typeof fn?.text === 'string' && fn.text.startsWith(SHARD_LEAVE_WORD.held)) this.farewellSettle({ end: 'held', word: fn.text });
        }
        this.stateCbs.forEach(cb => cb(m.snap));
        break;
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
        if (m.msg?.t === 'heroSave') this.farewellSettle?.({ end: 'saved' }); // THE FAREWELL: the last mirror landed (and was written)
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
  /** THE HONEST LEAVING (W7): settles the farewell in flight (closes the socket). */
  private farewellSettle: ((f: ShardFarewell) => void) | null = null;
  /** THE HONEST LEAVING (W7): the socket a farewell rides once leave() took it from `ws`
   *  (a socket THE RETURN reopened in place included): its last mirror is still heard. */
  private farewellWs: WebSocket | null = null;
  /** THE HONEST LEAVING (W7): how the last deliberate leave ended (a menu's Exit awaits it);
   *  null until leave() said its word. Resolves at the mirror, the shard's word, or the cap. */
  farewellEnd: Promise<ShardFarewell> | null = null;

  leave(): void {
    // THE DELIBERATE LEAVE (card 16 B): a live session we end ourselves says
    // so (`session leaving`), so the shard ends the seat at once instead of
    // holding it dormant, and forgets its token; a session already lost keeps
    // the token for the lobby's resume.
    const deliberate = this.welcomed && !this.hostGone;
    this.hostGone = true; // our own teardown — never a lost host
    if (deliberate && this.session && lastSession === this.session) { lastSession = null; persistSession(null); } // and a reload forgets it too
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled: (f: ShardFarewell) => void = () => { /* no farewell in flight */ };
    let ended = false;
    // THE COMPLETED LEAVE (W7): the farewell resolves once the socket has truly closed. The
    // shard runs the seat's leave before it answers our close, so a re-join made right after
    // the farewell is never refused as a twin; a close nobody answers resolves at a second cap.
    const close = (f: ShardFarewell = { end: 'quiet' }): void => {
      if (ended) return;
      ended = true;
      this.farewellSettle = null;
      if (timer !== null) clearTimeout(timer);
      const done = (): void => { if (this.farewellWs === ws) this.farewellWs = null; settled(f); };
      if (ws.readyState === WebSocket.CLOSED) { done(); return; }
      let cap: ReturnType<typeof setTimeout> | null = null;
      const closed = (): void => {
        if (cap !== null) clearTimeout(cap);
        cap = null;
        ws.removeEventListener('close', closed);
        done();
      };
      ws.addEventListener('close', closed);
      cap = setTimeout(closed, WS_TRANSPORT_CFG.farewellMs);
      (cap as { unref?: () => void }).unref?.(); // a Node rig never waits on a farewell
      try { ws.close(1000, 'leave'); } catch { closed(); }
    };
    if (deliberate && ws.readyState === WebSocket.OPEN) {
      this.farewellEnd = new Promise<ShardFarewell>(res => { settled = res; });
      try { ws.send(JSON.stringify({ t: 'session', msg: { t: 'leaving' } } satisfies WireMsg)); } catch { close(); return; }
      if (this.farewell) {
        this.farewellWs = ws; // THE FAREWELL rides the socket that stands (THE RETURN's resumed one included)
        this.farewellSettle = close;
        timer = setTimeout(() => close({ end: 'quiet' }), WS_TRANSPORT_CFG.farewellMs);
        (timer as { unref?: () => void }).unref?.(); // a Node rig never waits on a farewell
        return;
      }
    }
    close();
  }

  /** THE UNLOAD WORD (W7, THE HONEST LEAVING, best effort): the page is going away (a tab
   *  closed, or a reload: the two cannot be told apart at unload). Says `leaving` with
   *  `unload` and closes at once, keeping THE REMEMBERED SESSION: the shard holds an
   *  out-of-fight hero untargetable for SHARD_CFG.unloadGraceSec, so a reload takes the
   *  same seat back and a closed tab's hero leaves soon instead of lying targetable for
   *  dormantSec; a fight keeps THE ACTING SEAT's law. No farewell mirror can land. */
  unloadLeave(): void {
    const ws = this.ws, s = this.session;
    if (!this.welcomed || this.hostGone || !s) return;
    this.hostGone = true; // our own teardown: never a lost host
    this.ws = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ t: 'session', msg: { t: 'leaving', unload: true } } satisfies WireMsg)); } catch { /* best effort */ }
    }
    try { ws?.close(1000, 'unload'); } catch { /* already closed */ }
    // THE UNLOAD BEACON: the same word over HTTP, which survives an unload that can drop the
    // socket's last frame (the shard re-times a seat its close already left dormant).
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(this.url.replace(/^ws/i, 'http') + SHARD_UNLOAD_BEACON_PATH, JSON.stringify({ seat: s.self, token: s.token }));
      }
    } catch { /* best effort */ }
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
    if (this.session) {
      this.session.at = Date.now(); // THE REMEMBERED SESSION: the resume window opens at the loss
      if (lastSession === this.session) persistSession(this.session);
    }
    this.hostLostCbs.forEach(cb => cb());
  }
}
