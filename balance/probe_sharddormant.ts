// ---------------------------------------------------------------------------
// PROBE — THE DORMANT SEAT (card 16 B, ruled 2026-10-08: docs/design/
// shard-world.md §7; the contract: docs/engine/shard.md "The pieces").
// A dropped socket is never a free escape from death.
//
//   npx tsx balance/probe_sharddormant.ts
//
// Boots a REAL ShardHost in this process on a free port (classic, ephemeral,
// the open account) and drives the real WsTransport client and RAW sockets
// against it, ticking the host by hand (probe_shard's idiom):
//   A  THE RECONNECT TOKEN: every welcome carries its own token, on the
//      welcome alone; the client remembers the session by address and window
//   B  THE DROP: a socket lost without the client's word leaves its hero
//      standing, targetable and input-less, on the roster and the wire, with
//      no pleave; the client hears its host lost and keeps the token; the
//      status page marks the seat with its seconds left
//   C  THE RESUME: the token takes the SAME seat back (same actor, same
//      spot), mints a new token, sends no pjoin, stops the clock, re-ships
//      the terrain, and the hand walks the hero again from a fresh ack
//   D  THE REFUSED RESUME: a failed connect keeps the token; a wrong token,
//      a spent token, or a seat that is not dormant joins fresh, one log line
//      each, and the dormant seat stays dormant
//   E  THE VESSEL AND THE EXPIRY: the vessel and corpse desks keep a dormant
//      vessel's records (a resume finds the same record and its bodies' row);
//      at dormantSec the leave path runs and the peers hear pleave
//   F  NEVER AN ESCAPE: a dormant mortal vessel struck down falls by the
//      covenant (body, tombstone), its dormancy ends with it, and its return
//      hears THE LATE WORD
//   G  THE WORD AND THE WIRE: leave() (the word) ends a seat at once and
//      forgets the token; a clean close WITHOUT the word goes dormant, with it
//      leaves at once; THE UNTRIED SEAT and THE REFUSED WIRE leave at once; a
//      client-side TCP drop goes dormant
//   H  THE CLOSING SHARD: stop() runs every dormant seat's leave path
// ---------------------------------------------------------------------------

import { randomBytes } from 'node:crypto';
import { get as httpGet } from 'node:http';
import { connect as tcpConnect, type Socket } from 'node:net';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { VESSEL_CFG } from '../server/vessel';
import { WsTransport, WS_TRANSPORT_CFG, shardResumeFor, type ShardResume } from '../src/net/ws';
import { WS_OP, decodeFrames, encodeFrame } from '../src/net/wsframe';
import { shardBuildStamp } from '../src/net/shardBuild';
import type { StateSnapshot } from '../src/net/snapshot';
import type { SessionMsg } from '../src/net/transport';
import { NullInput, type PlayerInput } from '../src/net/intent';
import { seedGlobalRandom } from '../src/sim/rng';
import { CLASSES } from '../src/data/classes';
import { rollItem } from '../src/engine/itemgen';
import type { ItemCategory } from '../src/engine/items';
import type { Seat } from '../src/engine/world';
import { ensureAccountId, makeAccount, type Account } from '../src/meta/account';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
async function runTicks(host: ShardHost, n: number): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, host: ShardHost | null, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) {
    if (cond()) return true;
    if (host) host.tick(DT);
    await yieldIO();
  }
  return cond();
}
/** Wall-clock wait (socket round trips that need no engine tick). */
async function waitMs(cond: () => boolean, ms = 5000): Promise<boolean> {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 5)); }
  return true;
}
const enc = new TextEncoder(), dec = new TextDecoder();
const HEX_TOKEN = new RegExp(`^[0-9a-f]{${2 * SHARD_WIRE_CFG.resumeTokenBytes}}$`);

const restoreRandom = seedGlobalRandom(0xd0e5);
const SEED = 0x0d0e5ea7;
const logs: string[] = [];
const host = new ShardHost({ seed: SEED, saveDir: null, open: true, log: line => { logs.push(line); } });
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const seatOf = (id: string): Seat | undefined => host.world.seats.find(s => s.id === id);
/** Log lines since a mark that name a refused resume for this seat. */
const refusals = (from: number, seat: string): string[] => logs.slice(from).filter(l => l.includes('resume naming ' + seat + ' was refused'));

/** THE CUT CABLE: the shard's own socket under a seat destroyed with no
 *  closing handshake on either side (a dead link, a reaped socket). */
function cut(seat: string): boolean {
  const c = (host.net as unknown as { bySeat: Map<string, { sock: { destroy(): void } }> }).bySeat.get(seat);
  c?.sock.destroy();
  return !!c;
}

/** THE STATUS PAGE, as a browser tab reads it (the shims stub fetch). */
type StatusRow = { id: string; alive: boolean; dormant?: boolean; dormantLeftSec?: number };
async function statusRows(): Promise<StatusRow[]> {
  const body = await new Promise<string>((resolve, reject) => {
    httpGet(`http://127.0.0.1:${port}/status`, r => { let b = ''; r.on('data', c => { b += c; }); r.on('end', () => resolve(b)); }).on('error', reject);
  });
  try { return (JSON.parse(body) as { seats: StatusRow[] }).seats ?? []; } catch { return []; }
}

/** A client-style (MASKED) frame: the shard's assembler insists on masks. */
function masked(opcode: number, payload: Uint8Array): Uint8Array {
  const plain = encodeFrame(opcode, payload, true);
  const hdr = plain.length - payload.length;
  const out = new Uint8Array(plain.length + 4);
  out.set(plain.subarray(0, hdr));
  out[1] |= 0x80;
  const key = [0x5a, 0x17, 0xc3, 0x9e];
  out.set(key, hdr);
  for (let i = 0; i < payload.length; i++) out[hdr + 4 + i] = payload[i] ^ key[i & 3];
  return out;
}

/** A RAW socket client: the upgrade by hand, masked frames out, the shard's
 *  frames in (its pings answered, its snapshots counted). Nothing between it
 *  and the wire decides how it ends: closeClean() is the closing handshake,
 *  sock.destroy() a pulled cable (no close frame at all). */
interface Raw {
  sock: Socket; self: string; token: string; msgs: Record<string, unknown>[]; snaps: number;
  send(m: unknown): void; sendText(s: string): void; closeClean(): void;
}
async function rawJoin(name: string): Promise<Raw> {
  const sock = tcpConnect(port, '127.0.0.1');
  sock.on('error', () => { /* a reset is part of the point */ });
  await new Promise<void>(res => { sock.once('connect', () => res()); });
  sock.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n`
    + `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  const raw: Raw = {
    sock, self: '', token: '', msgs: [], snaps: 0,
    sendText: s => { sock.write(masked(WS_OP.text, enc.encode(s))); },
    send: m => raw.sendText(JSON.stringify(m)),
    closeClean: () => { sock.write(masked(WS_OP.close, new Uint8Array([0x03, 0xe8]))); sock.end(); },
  };
  let buf = new Uint8Array(0), upgraded = false;
  sock.on('data', (chunk: Buffer) => {
    const grown = new Uint8Array(buf.length + chunk.length);
    grown.set(buf); grown.set(chunk, buf.length); buf = grown;
    if (!upgraded) {
      const end = Buffer.from(buf).indexOf('\r\n\r\n');
      if (end < 0) return;
      upgraded = true; buf = buf.slice(end + 4);
    }
    const r = decodeFrames(buf, 1 << 26, false);
    buf = r.rest.slice();
    for (const f of r.frames) {
      if (f.opcode === WS_OP.ping) { sock.write(masked(WS_OP.pong, f.payload)); continue; }
      if (f.opcode !== WS_OP.text) continue;
      let m: Record<string, unknown>;
      try { m = JSON.parse(dec.decode(f.payload)) as Record<string, unknown>; } catch { continue; }
      if (m.t === 'snap') raw.snaps++; else raw.msgs.push(m);
    }
  });
  raw.send({ t: 'join', classId: 'rogue', name, build: shardBuildStamp() }); // THE BUILD STAMP: an honest client says its build
  await waitMs(() => raw.msgs.some(m => m.t === 'welcome'));
  const welcome = raw.msgs.find(m => m.t === 'welcome') as { self?: string; resume?: { token?: string } } | undefined;
  raw.self = welcome?.self ?? ''; raw.token = welcome?.resume?.token ?? '';
  return raw;
}

/** A willed step over the wire (THE SPAWN GRACE ends at the first one). */
const step = (seat: string, seq?: number): PlayerInput => {
  const a = seatOf(seat)?.actor;
  return { dx: 0, dy: 1, aim: { x: a?.pos.x ?? 0, y: (a?.pos.y ?? 0) + 60 }, held: [], edge: [], ...(seq !== undefined ? { seq } : {}) };
};
async function actWs(t: WsTransport, seat: string, seq0 = 100): Promise<boolean> {
  for (let i = 0; i < 6; i++) { t.sendInput(seat, step(seat, seq0 + i)); await runTicks(host, 1); }
  return waitFor(() => seatOf(seat)?.actor.untargetable === false, host, 30);
}
async function actRaw(r: Raw): Promise<boolean> {
  r.send({ t: 'input', seat: r.self, input: step(r.self) });
  return waitFor(() => seatOf(r.self)?.actor.untargetable === false, host, 60);
}

/** A client's account as the browser's loaders leave it: minted. */
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it (probe_shard's forge). */
function forgeVessel(o: { classId: string; level: number; name: string; charId: string; worn: ItemCategory[] }): CharacterSave {
  const w = host.world;
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === o.classId)!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  w.seatHero(seat).level = o.level;
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  for (const slot of o.worn) {
    const it = rollItem({ ilvl: o.level, rarity: 'rare', category: slot });
    if (it) { seat.meta.items.push(it); w.equipItem(seat, it.uid, slot); }
  }
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

// ============================================== A: THE RECONNECT TOKEN ==
const watcher = new WsTransport();
const seen = { snap: null as StateSnapshot | null, joins: [] as string[], leaves: [] as string[] };
watcher.onState(s => { seen.snap = s; });
watcher.onPeerJoin(p => { seen.joins.push(p.id); });
watcher.onPeerLeave(id => { seen.leaves.push(id); });
const ww = await watcher.connect(url, { name: 'Watcher', classId: 'rogue' });
const wTok = shardResumeFor(url);
const tap = await rawJoin('Tap');
const drift = new WsTransport();
const dw = await drift.connect(url, { name: 'Drift', classId: 'warrior' });
await waitFor(() => !!seatOf(dw.self) && seen.joins.includes(dw.self), host, 60);
const mem = shardResumeFor(url);
{
  check('A token: every welcome carries its own token, minted per join (hex)',
    !!wTok && HEX_TOKEN.test(wTok.token) && HEX_TOKEN.test(tap.token) && !!mem && HEX_TOKEN.test(mem.token)
    && new Set([wTok.token, tap.token, mem.token]).size === 3, `${tap.token.length} hex chars`);
  check('A token: the client remembers its session (this seat, this token)', mem?.seat === dw.self && wTok?.seat === ww.self && !dw.resumed);
  const pj = tap.msgs.find(m => m.t === 'pjoin' && (m.peer as { id?: string } | undefined)?.id === dw.self);
  check('A token: it rides the welcome alone (no pjoin, no roster row carries one)',
    !!pj && !JSON.stringify(pj).includes(mem?.token ?? '-') && !('resume' in (pj.peer as object))
    && [...watcher.peers(), ...drift.peers()].every(p => !('resume' in p) && !JSON.stringify(p).includes(mem?.token ?? '-')));
  check('A memory: the address is matched normalized (a bare host:port is the same shard; another host is not)',
    shardResumeFor(`127.0.0.1:${port}`)?.token === mem?.token && shardResumeFor(`ws://127.0.0.2:${port}`) === null);
  check('A memory: past resumeWindowMs the session is too old to offer',
    shardResumeFor(url, Date.now() + WS_TRANSPORT_CFG.resumeWindowMs + 1) === null);
}

// ======================================================= B: THE DROP ==
const hero = seatOf(dw.self)!.actor;
check('B setup: the drifter acts (its SPAWN GRACE is over)', await actWs(drift, dw.self, 100));
let lost = false;
drift.onHostLost(() => { lost = true; });
const conns0 = host.net.connectionCount();
const at = { x: hero.pos.x, y: hero.pos.y };
check('B setup: the cut finds the seat\'s socket', cut(dw.self));
await waitFor(() => host.net.isDormant(dw.self) && lost, host, 60);
{
  check('B drop: a socket lost without the word leaves its seat DORMANT (one connection fewer)',
    host.net.isDormant(dw.self) && host.net.connectionCount() === conns0 - 1);
  check('B memory: its client hears the host lost and keeps the token',
    lost && shardResumeFor(url)?.token === mem?.token && shardResumeFor(url)?.seat === dw.self);
  await runTicks(host, 120);
  const moved = Math.hypot(hero.pos.x - at.x, hero.pos.y - at.y);
  check('B dormant: the hero stands where it stood, input-less (the same body, unmoved, up)',
    seatOf(dw.self)?.actor === hero && moved < 1 && !hero.dead && !hero.downed, `moved ${moved.toFixed(2)} px`);
  check('B dormant: fully targetable (no grace, no ward)', !hero.untargetable && !hero.invulnerable);
  check('B dormant: no pleave reached a peer; every roster still lists it',
    !seen.leaves.includes(dw.self) && !tap.msgs.some(m => m.t === 'pleave' && m.id === dw.self)
    && watcher.peers().some(p => p.id === dw.self) && host.net.peers().some(p => p.id === dw.self));
  const s = seen.snap;
  check('B dormant: the snapshots keep shipping its seat and its body',
    !!s && !!s.seats[dw.self] && s.actors.some(a => a.seat === dw.self) && Math.abs(s.time - host.world.time) < 0.2);
  const row = (await statusRows()).find(r => r.id === dw.self);
  check('B status: the page marks the seat dormant with its seconds left',
    row?.dormant === true && (row.dormantLeftSec ?? 0) > SHARD_CFG.dormantSec - 4 && (row.dormantLeftSec ?? 99) <= SHARD_CFG.dormantSec,
    JSON.stringify(row));
}

// ===================================================== C: THE RESUME ==
const spentTok = shardResumeFor(url)!;
const back = new WsTransport();
const got = { zone: false, snap: null as StateSnapshot | null };
back.onZone(() => { got.zone = true; });
back.onState(s => { got.snap = s; });
const joins0 = seen.joins.length, tapJoins0 = tap.msgs.filter(m => m.t === 'pjoin').length, conns1 = host.net.connectionCount();
const bw = await back.connect(url, { name: 'Drift', classId: 'rogue' }, undefined, spentTok);
const mem2 = shardResumeFor(url);
{
  check('C resume: the token takes the SAME seat back', bw.self === dw.self && bw.resumed && back.self === dw.self);
  check('C resume: the welcome mints a fresh token, remembered in place of the spent one',
    !!mem2 && mem2.seat === dw.self && HEX_TOKEN.test(mem2.token) && mem2.token !== spentTok.token);
  await waitFor(() => got.zone && got.snap !== null, host, 60);
  check('C resume: the clock stopped; the shard holds the seat live again',
    !host.net.isDormant(dw.self) && host.net.connectionCount() === conns1 + 1);
  check('C resume: no pjoin (no peer ever saw it leave)',
    seen.joins.length === joins0 && tap.msgs.filter(m => m.t === 'pjoin').length === tapJoins0);
  check('C resume: the same hero, the same body, where it stood',
    seatOf(dw.self)?.actor === hero && Math.hypot(hero.pos.x - at.x, hero.pos.y - at.y) < 1);
  check('C resume: the new shell gets its terrain and its own seat on the wire', got.zone && !!got.snap?.seats[dw.self]);
  check("C resume: its input ack counts from zero again (the old count was the old shell's)",
    got.snap?.seats[dw.self]?.seq === undefined, `seq ${got.snap?.seats[dw.self]?.seq}`);
  check('C status: the page no longer marks it', (await statusRows()).find(r => r.id === dw.self)?.dormant === undefined);
  const x0 = hero.pos.x, y0 = hero.pos.y;
  for (let i = 0; i < 30; i++) {
    back.sendInput(dw.self, { dx: 1, dy: 0, aim: { x: hero.pos.x + 100, y: hero.pos.y }, held: [], edge: [], seq: i + 1 });
    await runTicks(host, 1);
  }
  await runTicks(host, 4);
  const walked = Math.hypot(hero.pos.x - x0, hero.pos.y - y0), ack = got.snap?.seats[dw.self]?.seq ?? -1;
  check('C resume: the hand is back: its inputs walk the hero, acked on the new count',
    walked > 20 && ack >= 20 && ack <= 30, `walked ${walked.toFixed(0)} px, ack ${ack}`);
}

// ============================================= D: THE REFUSED RESUME ==
const cutAgain = cut(dw.self) && await waitFor(() => host.net.isDormant(dw.self), host, 60);
const driftDropAt = host.world.time;
check('D setup: the resumed seat drops again (a seat may lie dormant twice)', cutAgain);
{
  // A connect that never reached a shard (main.ts reverts it with leave()) never forgets the token.
  const nowhere = new WsTransport();
  let reached = true;
  try { await nowhere.connect('ws://127.0.0.1:1', { name: 'Nowhere', classId: 'rogue' }, undefined, shardResumeFor(url) ?? undefined); }
  catch { reached = false; }
  nowhere.leave();
  check('D memory: a failed connect, then its leave(), keeps the token for the next try',
    !reached && shardResumeFor(url)?.token === mem2?.token && shardResumeFor(url)?.seat === dw.self);
  const tries: [string, ShardResume, string][] = [
    ['a wrong token', { seat: dw.self, token: '0'.repeat(mem2?.token.length ?? 32) }, 'a wrong token'],
    ['the spent token (THE RECONNECT TOKEN turns at every resume)', spentTok, 'a wrong token'],
    ["a live seat's own token (a seat that is not dormant)", wTok!, 'not a dormant seat'],
  ];
  for (const [what, resume, why] of tries) {
    const mark = logs.length;
    const t = new WsTransport();
    const r = await t.connect(url, { name: 'Stranger', classId: 'rogue' }, undefined, resume);
    await waitFor(() => !!seatOf(r.self), host, 60);
    const lines = refusals(mark, resume.seat);
    check(`D refused: ${what} joins fresh, with one log line`,
      !r.resumed && r.self !== resume.seat && !!seatOf(r.self) && lines.length === 1 && lines[0].includes(why), lines.join(' | ') || 'no line');
    t.leave();
    await waitFor(() => !seatOf(r.self), host, 60);
  }
  check('D refused: through every refusal the dormant seat stays dormant, its hero standing',
    host.net.isDormant(dw.self) && seatOf(dw.self)?.actor === hero && !hero.dead && !hero.downed);
  check('D refused: the live seat whose token was offered is untouched',
    !host.net.isDormant(ww.self) && !!seatOf(ww.self) && host.net.peers().some(p => p.id === ww.self) && !seen.leaves.includes(ww.self));
}

// ===================================== E: THE VESSEL AND THE EXPIRY ==
const desk = host.corpses as unknown as { seats: Map<string, unknown> };
const acctV = claimedAccount();
const VV = forgeVessel({ classId: 'warrior', level: 9, name: 'Vigil', charId: 'c-dormant-vigil', worn: ['helmet'] });
const vc = new WsTransport();
const vw = await vc.connect(url, { name: 'Vigil', classId: 'warrior', accountId: acctV.accountId }, VV);
await waitFor(() => !!seatOf(vw.self), host, 60);
const vTok = shardResumeFor(url)!;
const rec0 = host.vessels.vesselOf(vw.self);
{
  check('E vessel: the vessel seats as itself, keyed by its account',
    !!rec0 && rec0.charId === VV.charId && host.vessels.accountOf(vw.self) === acctV.accountId);
  check('E vessel: it acts, then its socket is cut: dormant',
    await actWs(vc, vw.self, 200) && cut(vw.self) && await waitFor(() => host.net.isDormant(vw.self), host, 60));
  await runTicks(host, 30);
  check("E vessel: the drop never ran the vessel desk's leave (the same record, its account kept)",
    host.vessels.vesselOf(vw.self) === rec0 && host.vessels.accountOf(vw.self) === acctV.accountId);
  check("E vessel: nor the corpse desk's (the seat's view stands)", desk.seats.has(vw.self));
  const vc2 = new WsTransport();
  const v2Rows: SessionMsg[] = [];
  vc2.onSession(m => { v2Rows.push(m); });
  const v2 = await vc2.connect(url, { name: 'Vigil', classId: 'warrior', accountId: acctV.accountId }, VV, vTok);
  await waitFor(() => v2Rows.some(m => m.t === 'corpses'), host, 60);
  check('E vessel: its resume finds the SAME vessel record (no second graft, no refusal, no fall)',
    v2.resumed && v2.self === vw.self && host.vessels.vesselOf(vw.self) === rec0 && host.vessels.falls === 0);
  check("E vessel: the woken seat's shell is sent its own bodies' row again", v2Rows.some(m => m.t === 'corpses'));
  check('E vessel: dropped once more, for the clock', cut(vw.self) && await waitFor(() => host.net.isDormant(vw.self), host, 60));
}
const vesselDropAt = host.world.time;
const released = new Map<string, number>();
host.net.onPeerLeave(id => { released.set(id, host.world.time); });
{
  const first = driftDropAt + SHARD_CFG.dormantSec;
  await runTicks(host, Math.max(0, Math.floor((first - host.world.time - 0.5) * SHARD_CFG.tickHz)));
  check('E clock: half a second before its clock runs out, the dormant hero still stands, unheard of',
    seatOf(dw.self)?.actor === hero && host.net.isDormant(dw.self) && !seen.leaves.includes(dw.self) && !hero.dead && !hero.untargetable,
    `${(first - host.world.time).toFixed(2)}s left`);
  const last = vesselDropAt + SHARD_CFG.dormantSec;
  await waitFor(() => !seatOf(dw.self) && !seatOf(vw.self), host, Math.ceil((last - host.world.time + 1) * SHARD_CFG.tickHz));
  await waitFor(() => seen.leaves.includes(dw.self) && seen.leaves.includes(vw.self), host, 60); // the pleave rows' own flight
  check('E expiry: at dormantSec the seat leaves the world and the shard',
    !seatOf(dw.self) && !host.net.isDormant(dw.self) && !host.net.peers().some(p => p.id === dw.self));
  const after = (released.get(vw.self) ?? -99) - vesselDropAt;
  check('E expiry: the clock is dormantSec of world time, to the tick',
    Math.abs(after - SHARD_CFG.dormantSec) <= 2 * DT, `released ${after.toFixed(3)}s after the drop`);
  check('E expiry: the peers hear pleave then (every roster drops it)',
    seen.leaves.includes(dw.self) && seen.leaves.includes(vw.self) && !watcher.peers().some(p => p.id === dw.self || p.id === vw.self)
    && tap.msgs.some(m => m.t === 'pleave' && m.id === dw.self));
  check("E expiry: the vessel desk's leave ran (record and account forgotten; a standing hero never falls)",
    !host.vessels.vesselOf(vw.self) && host.vessels.accountOf(vw.self) === undefined && host.vessels.falls === 0 && !seatOf(vw.self));
  check("E expiry: and the corpse desk's", !desk.seats.has(vw.self));
  const rows = await statusRows();
  check('E status: the page lists neither any more', rows.length > 0 && !rows.some(r => r.id === dw.self || r.id === vw.self));
}

// ============================================== F: NEVER AN ESCAPE ==
{
  const covenant = VESSEL_CFG.covenantAt;
  VESSEL_CFG.covenantAt = 'down'; // the rig's own reading: it never leans on THE MERCY for a dormant mortal
  try {
    const acctM = claimedAccount();
    const VM = forgeVessel({ classId: 'warrior', level: 6, name: 'Wick', charId: 'c-dormant-wick', worn: ['boots'] });
    const cm = new WsTransport();
    const mw = await cm.connect(url, { name: 'Wick', classId: 'warrior', accountId: acctM.accountId }, VM);
    await waitFor(() => !!seatOf(mw.self), host, 60);
    const mTok = shardResumeFor(url)!;
    const heroM = host.world.seatHero(seatOf(mw.self)!);
    check('F setup: a mortal vessel acts, then its socket is cut: dormant',
      host.vessels.vesselOf(mw.self)?.charId === VM.charId && await actWs(cm, mw.self, 300)
      && cut(mw.self) && await waitFor(() => host.net.isDormant(mw.self), host, 60));
    check('F dormant: the mortal is in reach of any blow (no grace, no ward)', !heroM.untargetable && !heroM.invulnerable && !heroM.dead);
    const falls0 = host.vessels.falls;
    host.world.kill(heroM);
    // (THE DEATH BEAT: the fall is decided at once, the body stands dead VESSEL_CFG.deathBeatSec, then the seat goes.)
    await waitFor(() => host.vessels.falls > falls0 && !host.net.isDormant(mw.self) && seen.leaves.includes(mw.self), host,
      Math.ceil(VESSEL_CFG.deathBeatSec * SHARD_CFG.tickHz) + 60);
    const bodies = host.corpses.forAccount(acctM.accountId);
    check('F covenant: struck down while dormant, it falls as any mortal falls (its body and gear, the tombstone)',
      host.vessels.falls === falls0 + 1 && bodies.length === 1 && bodies[0].loot.items.length === 1
      && host.corpses.hasFallen(acctM.accountId, VM.charId!), `${bodies.length} bodies`);
    check('F covenant: its dormancy ends with it (the seat gone after THE DEATH BEAT, the peers hear pleave then)',
      !seatOf(mw.self) && !host.net.isDormant(mw.self) && seen.leaves.includes(mw.self));
    const cm2 = new WsTransport();
    const order: string[] = [];
    cm2.onSession(m => { order.push(m.t); });
    const mark = logs.length;
    const m2 = await cm2.connect(url, { name: 'Wick', classId: 'warrior', accountId: acctM.accountId }, VM, mTok);
    await waitFor(() => order.includes('runEnd'), host, 60);
    check("F late word: the dropped player's return finds no dormant seat and hears `corpse` then `runEnd`; no dead hero walks back",
      !m2.resumed && refusals(mark, mw.self).length === 1 && !seatOf(m2.self)
      && order.indexOf('corpse') >= 0 && order.indexOf('runEnd') > order.indexOf('corpse'), order.join(' → '));
    cm2.leave();
    await runTicks(host, 5);
  } finally {
    VESSEL_CFG.covenantAt = covenant;
  }
}

// ======================================== G: THE WORD AND THE WIRE ==
const sleepers: string[] = [];
/** A seat gone from the world, and its pleave landed at the watcher. */
const gone = (id: string): Promise<boolean> => waitFor(() => !seatOf(id) && seen.leaves.includes(id), host, 120);
{
  const cl = new WsTransport();
  const lw = await cl.connect(url, { name: 'Leaver', classId: 'rogue' });
  await waitFor(() => !!seatOf(lw.self), host, 60);
  const acted = await actWs(cl, lw.self, 400);
  const remembered = shardResumeFor(url)?.seat === lw.self;
  cl.leave();
  await gone(lw.self);
  check('G word: leave() says the word: its seat ends at once (never dormant) and the peers hear pleave',
    acted && !seatOf(lw.self) && !host.net.isDormant(lw.self) && seen.leaves.includes(lw.self));
  check('G word: a deliberate leave forgets the token', remembered && shardResumeFor(url) === null);

  const quiet = await rawJoin('Quiet');
  check('G wire: a raw client seats with its own token', !!seatOf(quiet.self) && HEX_TOKEN.test(quiet.token));
  const quietActed = await actRaw(quiet);
  quiet.closeClean();
  await waitFor(() => host.net.isDormant(quiet.self), host, 60);
  await runTicks(host, 30); // a pleave, had one been sent, has landed by now
  check('G wire: a clean close WITHOUT the word leaves the hero dormant (the word decides, never the close)',
    quietActed && host.net.isDormant(quiet.self) && !!seatOf(quiet.self) && !seen.leaves.includes(quiet.self));

  const polite = await rawJoin('Polite');
  const politeActed = await actRaw(polite);
  polite.send({ t: 'session', msg: { t: 'leaving' } });
  polite.closeClean();
  await gone(polite.self);
  check('G word: the word, then a clean close: the seat ends at once',
    politeActed && !seatOf(polite.self) && !host.net.isDormant(polite.self) && seen.leaves.includes(polite.self));

  const untried = await rawJoin('Untried');
  const graced = seatOf(untried.self)?.actor.untargetable === true;
  untried.sock.destroy();
  await gone(untried.self);
  check('G untried: a seat that never acted (still under THE SPAWN GRACE) has nothing to escape: it leaves at once',
    graced && !seatOf(untried.self) && !host.net.isDormant(untried.self) && seen.leaves.includes(untried.self),
    `graced ${graced}, seat ${!!seatOf(untried.self)}, dormant ${host.net.isDormant(untried.self)}, pleave ${seen.leaves.includes(untried.self)} (${untried.self})`);

  const broken = await rawJoin('Broken');
  const brokenActed = await actRaw(broken);
  broken.sendText('not json at all');
  await gone(broken.self);
  check('G refused: a wire the shard refuses (not JSON) ends its seat at once, never dormant',
    brokenActed && !seatOf(broken.self) && !host.net.isDormant(broken.self) && seen.leaves.includes(broken.self),
    `acted ${brokenActed}, seat ${!!seatOf(broken.self)}, dormant ${host.net.isDormant(broken.self)}, pleave ${seen.leaves.includes(broken.self)} (${broken.self})`);

  const cable = await rawJoin('Cable');
  const cableActed = await actRaw(cable);
  cable.sock.destroy();
  await waitFor(() => host.net.isDormant(cable.self), host, 60);
  await runTicks(host, 30); // a pleave, had one been sent, has landed by now
  check('G cable: a client-side TCP drop (no close frame at all) leaves the hero dormant',
    cableActed && host.net.isDormant(cable.self) && !!seatOf(cable.self) && !seen.leaves.includes(cable.self));
  sleepers.push(quiet.self, cable.self);
}

// ========================================== H: THE CLOSING SHARD ==
{
  const asleep = sleepers.filter(id => host.net.isDormant(id));
  await host.stop();
  check("H close: stop() runs every dormant seat's leave path; the keeper stands alone",
    asleep.length === 2 && asleep.every(id => !seatOf(id) && !host.net.isDormant(id) && released.has(id))
    && host.world.seats.length === 1 && host.world.seats[0] === host.keeper);
}
restoreRandom();

// Let in-flight socket closes settle before the process ends (probe_shard's
// exit law: Node on Windows asserts inside libuv when process.exit lands
// mid-close, a red exit code on an all-green rig).
const EXIT_SETTLE_MS = 600;
await new Promise(r => setTimeout(r, EXIT_SETTLE_MS));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
