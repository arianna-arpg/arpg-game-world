// ---------------------------------------------------------------------------
// PROBE — THE SHARD M0: the headless host over WebSocket
// (docs/design/shard-world.md §4 M0, docs/engine/shard.md).
//
//   npx tsx balance/probe_shard.ts
//
// Boots a REAL ShardHost in this process on a free port and drives the real
// WsTransport client (Node's global WebSocket) against it, ticking the host
// by hand so every verdict is deterministic and no timer outlives the rig:
//   A  the RFC 6455 codec (masked / fragmented / control / oversize / errors)
//   B  the boot: the keeper seat parked at the hearth, tagged and hidden
//   C  the join: welcome carries the seed, the zone lands before a snapshot,
//      snapshots ride the wire rate, the keeper is on no wire row
//   D  the hand: inputs move the seated hero; the keeper never moves
//   E  the hostile wire: bad inputs, a spoofed seat, a hostile action, an
//      unknown session kind — the loop never faults
//   F  the party: the keeper scales no enemy; two seats are two
//   G  XP: the keeper never levels
//   H  THE MERCY: a lone downed seat rises after reviveSec
//   I  the leave: a dropped socket despawns its seat
//   J  persistence: the world half writes and a second host resumes it
//   K  THE UNBROKEN WILDS: the seamless foundation's surface hosts headless
//   P  THE WILDS ON THE WIRE: a render shell lays the same land from the seed,
//      takes the life from the wire, keeps its walk, streams pages, and the
//      keeper shadows the focus seat
//   Q  THE WILDS SAVE (server/wildsSave.ts): a --worldmass shard writes its
//      own file and a second host resumes it in the mass lane's order — the
//      clock, the runtime, every saved native, the keeper at the hearth, the
//      seed on the welcome; a pocket save wakes at the hearth with the pocket
//      pinned, and a save that will not stand gives way to a fresh wilds
// THE VESSEL AND THE CORPSE (docs/engine/shard.md "The vessel and the corpse"):
//   L  THE IDENTITY: an account mints one stable id; the join carries it to
//      the host alone; minting never touches the seeded stream
//   M  THE VESSEL: an uploaded hero grafts at its level with its own bag and
//      doll; hostile or duplicate vessels fall back fresh; THE MIRROR lands on
//      the beat and at the farewell, and round-trips as the next upload
//   N  THE DEATH COVENANT: a mortal vessel with no one left to kneel falls
//      (body recorded, `corpse` then `runEnd`, the client's own reckoning,
//      the run slot wiped, the seat gone); Immortal vessels and fresh heroes
//      keep THE MERCY; a fallen vessel never walks in again; a vessel that
//      leaves while down has fallen and hears THE LATE WORD at its next upload
//   O  THE CORPSE RETURNS: the same account's next hero finds the body, only
//      its owner reclaims it by the dwell, the gear comes home to its bag, the
//      record clears, and the records outlive two boots (the wilds too)
// ---------------------------------------------------------------------------

import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'; // + Q's reads (wildsSave)
import { get as httpGet } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShardHost, SHARD_CFG, newestSavedSeed, type ShardSave } from '../server/shardHost'; // + the wrapper's shape (Q, wildsSave)
import { mergeInputs, sanitizeInput } from '../server/shardTransport';
import { judgeVessel, VESSEL_CFG } from '../server/vessel';
import { shardRecordsPath, type ShardRecordsSave } from '../server/corpses';
import { WsTransport, normalizeShardUrl } from '../src/net/ws';
import { wildsShellActive, wildsShellAttach, wildsShellStream, wildsShellZone } from '../src/net/wildsClient';
import { applySnapshot, serializeSnapshot, serializeZone } from '../src/net/snapshot';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { makeAccount } from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { cellKey } from '../src/worldmass/address';
import { MASS_ZONE } from '../src/worldmass/preset';
import { WS_FRAME_CFG, WS_OP, WsMessageAssembler, decodeFrames, encodeClose, encodeFrame, encodeText } from '../src/net/wsframe';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import type { StateSnapshot, ZoneMsg } from '../src/net/snapshot';
import { seedGlobalRandom } from '../src/sim/rng';
import { NullInput, type PlayerInput } from '../src/net/intent';
import type { SessionMsg } from '../src/net/transport';
import { dist, vec } from '../src/core/math';
import { transitDwell, transitRadius } from '../src/data/transit';
import { rollItem } from '../src/engine/itemgen';
import { autoPlace } from '../src/engine/inventory';
import type { ItemCategory } from '../src/engine/items';
import type { Seat } from '../src/engine/world';
import {
  deserializeAccount, ensureAccountId, isAccountId, LEDGER_ACCOUNT_DEATHS, LEDGER_CORPSES_RECLAIMED,
  serializeAccount, type Account,
} from '../src/meta/account';
import { loadAccount, loadAccountAsync } from '../src/meta/persistence';
import { storageKey } from '../src/buildProfile';
import { loadCharacter, serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { readTravelingVessel, ShardVesselLink } from '../src/meta/shardVessel';

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
const enc = new TextEncoder();

// A client-style (MASKED) frame, for the decoder's client lane.
function maskedFrame(opcode: number, payload: Uint8Array, fin = true): Uint8Array {
  const plain = encodeFrame(opcode, payload, fin);
  const hdr = plain.length - payload.length;
  const out = new Uint8Array(plain.length + 4);
  out.set(plain.subarray(0, hdr));
  out[1] |= 0x80;
  const key = [0x12, 0x34, 0x56, 0x78];
  out.set(key, hdr);
  for (let i = 0; i < payload.length; i++) out[hdr + 4 + i] = payload[i] ^ key[i & 3];
  return out;
}

// ============================================================ A: the codec ==
{
  const big = 'x'.repeat(70000);
  for (const text of ['hi', 'y'.repeat(200), big]) {
    const r = decodeFrames(maskedFrame(WS_OP.text, enc.encode(text)), 1 << 20, true);
    check(`A codec: masked text frame of ${text.length} bytes round-trips`,
      r.frames.length === 1 && !r.error && new TextDecoder().decode(r.frames[0].payload) === text && r.rest.length === 0);
  }
  // Server frames are unmasked; a client decoder (expectMasked=false) reads them.
  const srv = decodeFrames(encodeText('server'), 1 << 20, false);
  check('A codec: an unmasked server frame decodes on the client lane', srv.frames.length === 1 && !srv.error);
  // Fragmentation: three frames, one message.
  const asm = new WsMessageAssembler(1 << 20, true);
  const parts = [maskedFrame(WS_OP.text, enc.encode('ab'), false), maskedFrame(WS_OP.continuation, enc.encode('cd'), false), maskedFrame(WS_OP.continuation, enc.encode('ef'), true)];
  const whole = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { whole.set(p, o); o += p.length; }
  // Feed it byte-by-byte to prove the remainder logic.
  const got: string[] = [];
  for (let i = 0; i < whole.length; i++) for (const m of asm.push(whole.subarray(i, i + 1))) if (m.kind === 'text') got.push(m.text);
  check('A codec: a fragmented message fed byte by byte assembles once', got.length === 1 && got[0] === 'abcdef' && !asm.error);
  // Control frames.
  const ctl = new WsMessageAssembler(1 << 20, true);
  const ping = ctl.push(maskedFrame(WS_OP.ping, enc.encode('p')));
  const close = ctl.push(maskedFrame(WS_OP.close, new Uint8Array([0x03, 0xe8, ...enc.encode('bye')])));
  check('A codec: ping and close parse with their payloads',
    ping.length === 1 && ping[0].kind === 'ping' && close.length === 1 && close[0].kind === 'close' && close[0].code === 1000 && close[0].reason === 'bye');
  const cl = decodeFrames(encodeClose(1001, 'going'), 1 << 20, false);
  check('A codec: an encoded close frame carries code + reason', cl.frames.length === 1 && cl.frames[0].payload[0] === 0x03 && cl.frames[0].payload[1] === 0xe9);
  // Errors: reserved bits, an unmasked client frame, an oversize frame, a bad continuation.
  const rsv = maskedFrame(WS_OP.text, enc.encode('x')); rsv[0] |= 0x40;
  check('A codec: reserved bits are a protocol error', decodeFrames(rsv, 1 << 20, true).error?.code === 1002);
  check('A codec: an unmasked client frame is a protocol error', decodeFrames(encodeText('x'), 1 << 20, true).error?.code === 1002);
  check('A codec: an oversize frame is refused (1009)', decodeFrames(maskedFrame(WS_OP.text, new Uint8Array(300)), 200, true).error?.code === 1009);
  const bad = new WsMessageAssembler(1 << 20, true);
  bad.push(maskedFrame(WS_OP.continuation, enc.encode('x')));
  check('A codec: a continuation with no start fails the assembler', bad.error?.code === 1002);
  // THE INBOX LAWS: an endless stream of empty continuations fails before maxFragments frames.
  const flood = new WsMessageAssembler(8 * 1024 * 1024, true);
  flood.push(maskedFrame(WS_OP.text, new Uint8Array(0), false));
  let frames = 1;
  while (!flood.error && frames < 10_000) { flood.push(maskedFrame(WS_OP.continuation, new Uint8Array(0), false)); frames++; }
  check('A codec: an endless empty-fragment stream fails the assembler before maxFragments frames', !!flood.error && frames <= WS_FRAME_CFG.maxFragments + 1, `failed at ${frames} with ${flood.error?.code}`);
  // THE GROWABLE INBOX: a 256 KB frame fed in 64-byte chunks assembles in linear time.
  const bigFrame = maskedFrame(WS_OP.text, new Uint8Array(256 * 1024));
  const inbox = new WsMessageAssembler(1 << 20, true);
  const t0 = performance.now();
  let gotBig = 0;
  for (let i = 0; i < bigFrame.length; i += 64) for (const m of inbox.push(bigFrame.subarray(i, Math.min(i + 64, bigFrame.length)))) if (m.kind === 'text') gotBig++;
  const assembleMs = performance.now() - t0;
  check('A codec: a 256 KB frame fed in 64-byte chunks assembles in linear time', gotBig === 1 && assembleMs < 500 && inbox.buffered === 0, `${assembleMs.toFixed(0)} ms`);
  // The input sanitizer — the wire's first line of defence.
  check('A sanitize: a shaped input survives with clamped axes',
    JSON.stringify(sanitizeInput({ dx: 7, dy: -2, aim: { x: 1, y: 2 }, held: [true, 'no', 1], edge: [], seq: 3.7 })) === JSON.stringify({ dx: 1, dy: -1, aim: { x: 1, y: 2 }, held: [true, false, false], edge: [], seq: 3 }));
  check('A sanitize: a missing or NaN aim is refused', sanitizeInput({ dx: 0, dy: 0, held: [], edge: [] }) === null && sanitizeInput({ dx: 0, dy: 0, aim: { x: NaN, y: 0 }, held: [], edge: [] }) === null);
  check('A sanitize: non-objects are refused', sanitizeInput(null) === null && sanitizeInput('x') === null);
  check('A address: a codespace https, a bare host, a trailing slash and an http all normalize',
    normalizeShardUrl(' https://name-8787.app.github.dev/ ') === 'wss://name-8787.app.github.dev'
    && normalizeShardUrl('myhost') === 'ws://myhost:8787' && normalizeShardUrl('http://10.0.0.5:9000') === 'ws://10.0.0.5:9000'
    && normalizeShardUrl('ws://localhost:8787') === 'ws://localhost:8787');
  const i1: PlayerInput = { dx: 0, dy: 0, aim: { x: 0, y: 0 }, held: [true], edge: [true, false], metaEdge: [false, true], seq: 1 };
  const i2: PlayerInput = { dx: 1, dy: 0, aim: { x: 5, y: 5 }, held: [false], edge: [false, false], seq: 2 };
  const m12 = mergeInputs(i1, i2);
  check('A merge: two frames in one tick keep both frames\' edges and the later axes', m12.dx === 1 && m12.seq === 2 && m12.edge[0] === true && m12.edge[1] === false && m12.metaEdge?.[1] === true && m12.held[0] === false);
}

// ============================================================ B: the boot ==
const restoreRandom = seedGlobalRandom(0x5a4d);
const SEED = 0x00c0ffee;
const host = new ShardHost({ seed: SEED, saveDir: null, open: true, log: () => { /* quiet */ } });
{
  const k = host.keeper;
  check('B boot: the shard stands one World with the keeper as p0', host.world.seats.length === 1 && k.id === 'p0' && k === host.world.localSeat);
  check('B boot: the keeper is tagged, untargetable and passive', !!k.keeper && k.keeper.reviveSec === SHARD_CFG.keeper.reviveSec && k.actor.untargetable && k.actor.passive);
  check('B boot: the keeper wakes in the hearth', host.world.zone.id === 'lastlight');
  check('B boot: the manifest wears THE HOSTED SEED', host.world.manifest.seed === SEED && host.seed === SEED);
  check('B boot: the open account unlocked the stations', host.account.features.size > 0 && host.account.unlockedClasses.size > 1);
  check('B boot: a hosted world never holds', host.world.timeflow.allowHold({ kind: 'menu' } as never) === false);
}

// ============================================================ C: the join ==
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
check('C join: the shard listens on a free port', port > 0);

const client = new WsTransport();
const events: string[] = [];
// Holders, not lets: TS narrows a `let x: T | null = null` to null at every
// read below (closure assignments are invisible to its flow analysis).
const got = { zone: null as ZoneMsg | null, snap: null as StateSnapshot | null };
let snaps = 0;
client.onZone(z => { got.zone = z; events.push('zone'); });
client.onState(s => { snaps++; got.snap = s; if (events[events.length - 1] !== 'snap') events.push('snap'); });
const welcome = await client.connect(url, { name: 'Probe', classId: 'rogue' });
check('C join: the welcome seats us as p1 and carries the shard seed', welcome.self === 'p1' && welcome.seed === SEED && client.self === 'p1');
check('C join: the peer roster holds the keeper and us', client.peers().length === 2 && client.peers()[0].id === 'p0' && client.peers()[1].id === 'p1');
await waitFor(() => host.world.seats.length === 2, null, 50);
const p1 = host.world.seats.find(s => s.id === 'p1')!;
check('C join: the host seated the joiner as the chosen class beside the keeper', !!p1 && p1.meta.classDef.id === 'rogue' && host.net.connectionCount() === 1);
{
  const h = host.hearthSeat();
  check('C wake: the joiner wakes at the hearth, untargetable under THE SPAWN GRACE',
    !!p1 && Math.hypot(p1.actor.pos.x - h.x, p1.actor.pos.y - h.y) < 120 && p1.actor.tier === h.tier && p1.actor.untargetable,
    p1 ? `joiner (${p1.actor.pos.x.toFixed(0)}, ${p1.actor.pos.y.toFixed(0)}) hearth (${h.x.toFixed(0)}, ${h.y.toFixed(0)})` : 'no seat');
}
await waitFor(() => got.zone !== null, host, 30);
check('C join: the zone message lands first and names the hearth', got.zone !== null && got.zone.zoneId === 'lastlight' && events[0] === 'zone');
const snapsBefore = snaps;
await runTicks(host, 60);
check('C wire: snapshots ride the wire rate (exactly 20 per 60 ticks)', snaps - snapsBefore === 20, `${snaps - snapsBefore} in 60 ticks`);
{
  // (the headless shims stub global fetch to a 404 — ask node:http directly)
  const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    httpGet(`http://127.0.0.1:${port}/`, r => { let body = ''; r.on('data', c => { body += c; }); r.on('end', () => resolve({ status: r.statusCode ?? 0, body })); }).on('error', reject);
  });
  let status: Record<string, unknown> = {};
  try { status = JSON.parse(res.body) as Record<string, unknown>; } catch { /* not JSON */ }
  check('C status: a plain GET on the port answers the status page', res.status === 200 && status.seed === '0x' + SEED.toString(16).padStart(8, '0') && Array.isArray(status.seats) && (status.seats as unknown[]).length === 1 && typeof status.tickMsP50 === 'number', `${res.status} ${res.body.slice(0, 160)}`);
}
{
  const s = got.snap;
  check('C wire: our seat rides the snapshot, the keeper rides none', !!s && !!s.seats['p1'] && s.seats['p0'] === undefined);
  check('C wire: no actor row wears the keeper seat', !!s && s.actors.every(a => a.seat !== 'p0') && s.actors.some(a => a.seat === 'p1'));
  check('C wire: the snapshot clock is the shard clock', !!s && Math.abs(s.time - host.world.time) < 0.2);
}

// ============================================================ D: the hand ==
{
  const hero = p1.actor;
  const x0 = hero.pos.x, kx0 = host.keeper.actor.pos.x, ky0 = host.keeper.actor.pos.y;
  for (let i = 0; i < 45; i++) {
    client.sendInput('p1', { dx: 1, dy: 0, aim: { x: hero.pos.x + 100, y: hero.pos.y }, held: [], edge: [], seq: i + 1 });
    await runTicks(host, 1);
  }
  check('D hand: inputs over the wire walk the seated hero east', hero.pos.x > x0 + 20, `Δx=${(hero.pos.x - x0).toFixed(1)}`);
  check('D grace: the first willed input ends THE SPAWN GRACE', !hero.untargetable);
  check('D hand: the host acks the input sequence', (got.snap?.seats['p1']?.seq ?? 0) >= 40, `seq ${got.snap?.seats['p1']?.seq}`);
  check('D hand: the keeper never moved', host.keeper.actor.pos.x === kx0 && host.keeper.actor.pos.y === ky0);
}

// ====================================================== E: the hostile wire ==
{
  const faults0 = host.faults;
  const raw = new WebSocket(url);
  await new Promise<void>((res, rej) => { raw.onopen = () => res(); raw.onerror = () => rej(new Error('raw open failed')); });
  raw.send(JSON.stringify({ t: 'join', classId: 'warrior', name: 'Raw' }));
  await waitFor(() => host.world.seats.length === 3, host, 50);
  check('E hostile: a raw joiner is seated as p2', host.world.seats.some(s => s.id === 'p2'));
  const kx = host.keeper.actor.pos.x, p1x = p1.actor.pos.x;
  // A spoofed seat id, a malformed input, a hostile action, an unknown session kind, junk.
  raw.send(JSON.stringify({ t: 'input', seat: 'p0', input: { dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [] } }));
  raw.send(JSON.stringify({ t: 'input', seat: 'p1', input: { dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [] } }));
  raw.send(JSON.stringify({ t: 'input', seat: 'p2', input: { dx: 'x', dy: null, aim: 'nope' } }));
  raw.send(JSON.stringify({ t: 'session', msg: { t: 'action', action: { t: 'allocate', nodeId: '__proto__' } } }));
  raw.send(JSON.stringify({ t: 'session', msg: { t: 'action', action: { t: 'levelSupportInv', uid: '__proto__' } } }));
  raw.send(JSON.stringify({ t: 'session', msg: { t: 'runEnd' } }));
  raw.send(JSON.stringify({ t: 'welcome', self: 'p0', peers: [], seed: 1 }));
  raw.send('not json at all');
  await runTicks(host, 20);
  check('E hostile: a spoofed seat drives nobody but the sender', host.keeper.actor.pos.x === kx && p1.actor.pos.x === p1x);
  check('E hostile: malformed inputs and actions never fault the loop', host.faults === faults0 && host.ticks > 0);
  check('E hostile: non-JSON closes the raw socket and despawns p2', await waitFor(() => !host.world.seats.some(s => s.id === 'p2'), host, 60));
  check('E hostile: the honest client still rides the wire', await waitFor(() => { const n = snaps; return n > 0; }, host, 5) && client.peers().length === 2);
  // THE DOOR CAPS: a join past maxSeats is refused with 1013 and spawns no seat.
  const prevMax = SHARD_WIRE_CFG.maxSeats;
  SHARD_WIRE_CFG.maxSeats = 1; // p1 already holds the one seat
  const overflow = new WsTransport();
  let refused = false;
  try { await overflow.connect(url, { name: 'Overflow', classId: 'warrior' }); } catch { refused = true; }
  await runTicks(host, 10);
  check('E hostile: the join past maxSeats is refused and spawns no seat', refused && host.world.seats.length === 2);
  SHARD_WIRE_CFG.maxSeats = prevMax;
  // THE ACTION BUDGET: a burst of junk and null actions never faults the loop and lands at most the budget.
  const burstFaults = host.faults;
  const raw2 = new WebSocket(url);
  await new Promise<void>((res, rej) => { raw2.onopen = () => res(); raw2.onerror = () => rej(new Error('raw2 open failed')); });
  raw2.send(JSON.stringify({ t: 'join', classId: 'warrior', name: 'Burst' }));
  await waitFor(() => host.world.seats.length === 3, host, 50);
  for (let i = 0; i < 500; i++) raw2.send(JSON.stringify({ t: 'session', msg: { t: 'action', action: i % 2 ? null : { t: 'sortBag', mode: 'kind' } } }));
  await yieldIO(); await yieldIO();
  const t1 = performance.now();
  host.tick(DT);
  const burstMs = performance.now() - t1;
  check('E hostile: a 500-action burst lands at most the budget, faults nothing and costs under a frame', host.faults === burstFaults && burstMs < 50, `${burstMs.toFixed(1)} ms`);
  raw2.close();
  await waitFor(() => host.world.seats.length === 2, host, 60);
}

// ========================================================== F: the party ==
{
  type Priv = { partyScaleCount(): number };
  const count = (): number => (host.world as unknown as Priv).partyScaleCount();
  check('F party: one seated player beside the keeper scales as ONE', count() === 1);
  const second = new WsTransport();
  await second.connect(url, { name: 'Second', classId: 'warrior' });
  await waitFor(() => host.world.seats.length === 3, host, 50);
  check('F party: two seated players scale as TWO (the keeper still nothing)', count() === 2 && host.world.seats.length === 3);
  second.leave();
  check('F party: the second seat leaves cleanly', await waitFor(() => host.world.seats.length === 2, host, 60));
}

// ================================================================ G: XP ==
{
  const kxp = host.keeper.meta.xp;
  const pxp = p1.meta.xp, plvl = p1.actor.level;
  host.world.grantXp(50);
  // A level-1 seat may level off the grant (xp rolls over) — either face counts as banked.
  const banked = p1.actor.level > plvl || p1.meta.xp >= pxp + 50;
  // THE WARDEN STANDS: the keeper's level mirrors the highest standing player's (the world's own "character level").
  const lvl0 = p1.actor.level;
  p1.actor.level = 30;
  await runTicks(host, 2);
  check('G level: the keeper mirrors the highest standing player\'s level', host.keeper.actor.level === 30, `keeper ${host.keeper.actor.level}`);
  p1.actor.level = lvl0;
  await runTicks(host, 2);
  // (the keeper's LEVEL follows the players by THE WARDEN STANDS; its own XP never moves)
  check('G xp: the joiner banks the grant, the keeper banks nothing', banked && host.keeper.meta.xp === kxp,
    `joiner xp ${pxp}→${p1.meta.xp} lvl ${plvl}→${p1.actor.level}; keeper xp ${kxp}→${host.keeper.meta.xp}`);
}

// ============================================================ H: THE MERCY ==
{
  const hero = p1.actor;
  host.world.kill(hero);
  check('H mercy: a lone player beside the keeper is DOWNED, never a wipe', hero.downed && !hero.dead && !host.world.gameOver);
  await runTicks(host, Math.ceil(SHARD_CFG.keeper.reviveSec * SHARD_CFG.tickHz * 0.6));
  check('H mercy: before reviveSec the seat still lies downed', hero.downed);
  await runTicks(host, Math.ceil(SHARD_CFG.keeper.reviveSec * SHARD_CFG.tickHz * 0.5) + 2);
  check('H mercy: after reviveSec the keeper stands the seat up', !hero.downed && !hero.dead && hero.life > 0, `life ${hero.life.toFixed(0)}`);
}

// =========================================================== H2: THE WARDEN ==
{
  const k = host.keeper.actor;
  k.invulnerable = false; k.untargetable = false; // a traversal's landing strips these
  host.world.kill(k);
  await runTicks(host, 2);
  check('H warden: a stripped, killed keeper stands again next tick and the world never ends', !k.dead && !k.downed && k.invulnerable && k.untargetable && k.passive && !host.world.gameOver && k.life > 0);
}

// ============================================================= I: the leave ==
{
  client.leave();
  check('I leave: a dropped socket despawns its seat', await waitFor(() => host.world.seats.length === 1, host, 60) && host.net.connectionCount() === 0);
  check('I leave: the keeper stands alone again', host.world.seats[0] === host.keeper);
}
await host.stop();

// ======================================================= J: persistence ==
{
  const dir = mkdtempSync(join(tmpdir(), 'hw-shard-'));
  try {
    const a = new ShardHost({ seed: 0x0badf00d, saveDir: dir, open: false, log: () => { /* quiet */ } });
    for (let i = 0; i < 120; i++) a.tick(DT);
    const zonesA = Object.keys(a.world.zoneMap).length;
    const timeA = a.world.time;
    a.persist();
    check('J persist: the world half writes under the shard wrapper', !!a.savePath && existsSync(a.savePath));
    const b = new ShardHost({ seed: 0x0badf00d, saveDir: dir, open: false, log: () => { /* quiet */ } });
    check('J persist: a second host resumes the saved clock and chart', Math.abs(b.world.time - timeA) < 1e-6 && Object.keys(b.world.zoneMap).length === zonesA, `t ${b.world.time.toFixed(2)} vs ${timeA.toFixed(2)}, zones ${Object.keys(b.world.zoneMap).length} vs ${zonesA}`);
    check('J persist: the resumed keeper wakes in the hearth, alone', b.world.zone.id === 'lastlight' && b.world.seats.length === 1 && !!b.keeper.keeper);
    const ephemeral = new ShardHost({ seed: 1, saveDir: null, log: () => { /* quiet */ } });
    check('J persist: an ephemeral shard has no save path', ephemeral.savePath === null);
    check('J persist: the newest save names the seed a flagless restart reuses', newestSavedSeed(dir, false) === 0x0badf00d);
    const flagless = new ShardHost({ saveDir: dir, open: false, log: () => { /* quiet */ } });
    check('J persist: a shard started with no seed brings the newest world back', flagless.seed === 0x0badf00d && Math.abs(flagless.world.time - timeA) < 1e-6);
    // THE REFUSED SAVE IS KEPT: a classic save that will not stand is set aside, never overwritten.
    const bumped = JSON.parse(readFileSync(a.savePath!, 'utf-8')) as ShardSave;
    bumped.schemaVersion = 999;
    writeFileSync(a.savePath!, JSON.stringify(bumped));
    const refusedHost = new ShardHost({ seed: 0x0badf00d, saveDir: dir, open: false, log: () => { /* quiet */ } });
    refusedHost.persist();
    const aside = readdirSync(dir).filter(n => n.includes('.refused-'));
    check('J persist: a classic save that will not stand is set aside, never overwritten', aside.length === 1 && refusedHost.world.time < 1 && existsSync(a.savePath!), `aside ${aside.join(',')}`);
    // THE BREAKER: a fault every tick still ships the wire and trips the breaker after faultBreakerTicks.
    const prevBreaker = SHARD_CFG.faultBreakerTicks;
    SHARD_CFG.faultBreakerTicks = 20;
    const wobbly = new ShardHost({ seed: 0x0b0b0b0b, saveDir: null, open: false, log: () => { /* quiet */ } });
    let tripped = 0;
    wobbly.onBroken = () => { tripped++; };
    const realUpdate = wobbly.world.update.bind(wobbly.world);
    wobbly.world.update = () => { throw new Error('probe: a fault every tick'); };
    for (let i = 0; i < 25; i++) wobbly.tick(DT);
    wobbly.world.update = realUpdate;
    check('F breaker: a fault every tick still counts ticks and trips the breaker once after faultBreakerTicks', wobbly.ticks === 25 && wobbly.broken && tripped === 1 && wobbly.faults >= 25, `ticks ${wobbly.ticks} faults ${wobbly.faults}`);
    SHARD_CFG.faultBreakerTicks = prevBreaker;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// ====================================================== K: THE WILDS ==
{
  const wilds = new ShardHost({ seed: 0x0ddba11, saveDir: null, open: true, worldmass: true, log: () => { /* quiet */ } });
  const w = wilds.world;
  check('K wilds: the mass runtime stands under the keeper', wilds.worldmass && !!w.massRuntime && w.zone.id === 'worldmass_expedition' && wilds.savePath === null);
  const f0 = wilds.faults;
  for (let i = 0; i < 180; i++) wilds.tick(DT);
  check('K wilds: three seconds of the surface tick without a fault', wilds.faults === f0 && w.time > 2.9, `actors ${w.actors.length}`);
  const port2 = await wilds.listen(0, '127.0.0.1');
  const c = new WsTransport();
  const hello = await c.connect(`ws://127.0.0.1:${port2}`, { name: 'Wanderer', classId: 'warrior' });
  check('K wilds: the welcome names the continuous surface', hello.worldmass === true && hello.seed === 0x0ddba11);
  await waitFor(() => w.seats.length === 2, wilds, 50);
  let got2: StateSnapshot | null = null;
  const off = c.onState(s => { got2 = s; });
  await waitFor(() => got2 !== null, wilds, 30);
  off();
  const snap2 = got2 as StateSnapshot | null;
  check('K wilds: a joiner rides the surface snapshot beside the natives', !!snap2 && !!snap2.seats['p1'] && snap2.actors.length > 2);

  // ================================================== P: THE WILDS ON THE WIRE ==
  // THE SHADOW: the keeper follows the focus seat (p1) on the surface.
  const p1w = w.seats.find(s => s.id === 'p1')!;
  for (let i = 0; i < 3; i++) wilds.tick(DT);
  check('P shadow: the keeper stands the shadow offset behind the focus seat',
    Math.abs(wilds.keeper.actor.pos.x - p1w.actor.pos.x) < 0.5 && Math.abs(wilds.keeper.actor.pos.y - (p1w.actor.pos.y + SHARD_CFG.keeper.shadowOffset)) < 0.5
    && wilds.focusSeat() === p1w);
  check('P welcome: the shard\'s town features ride the welcome', hello.features.length > 0 && hello.features.every(f => typeof f === 'string'));
  // The shell: built with the shard's features, the runtime inert, the land from the seed.
  const shellAccount = { ...makeAccount(), features: new Set(hello.features) };
  const shell = new World(shellAccount, Object.freeze(buildManifest(shellAccount, hello.seed)));
  shell.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  shell.clientSeatId = 'p1';
  const actorsBefore = shell.actors.length;
  wildsShellAttach(shell, hello.seed);
  check('P shell: the runtime stands inert on the shell', wildsShellActive(shell) && shell.massRuntime !== null && shell.zone.id === MASS_ZONE);
  check('P shell: attach births no natives', shell.massRuntime!.population === 0, `actors ${actorsBefore}→${shell.actors.length}`);
  check('P frame: the shell and the shard agree on the ground\'s origin and arena',
    cellKey(shell.massRuntime!.origin) === cellKey(w.massRuntime!.origin) && shell.arena.w === w.arena.w && shell.arena.h === w.arena.h,
    `arena ${shell.arena.w}x${shell.arena.h} vs ${w.arena.w}x${w.arena.h}`);
  const sample = { x: p1w.actor.pos.x + 1234, y: p1w.actor.pos.y - 777 };
  check('P frame: a point addresses the same cell on both sides',
    cellKey(shell.massRuntime!.walk.at(sample.x, sample.y)) === cellKey(w.massRuntime!.walk.at(sample.x, sample.y)));
  // The zone message: the server's doodads land, the walk stays the MassWalk.
  const zmsg = serializeZone(w);
  wildsShellZone(shell, zmsg, hello.seed);
  check('P zone: the surface message keeps the mass walk under the server\'s doodads',
    shell.walk === shell.massRuntime!.walk && shell.doodads.length === zmsg.doodads.length && shell.zone.id === MASS_ZONE, `doodads ${shell.doodads.length}`);
  // The snapshot: the life from the wire.
  const snapW = serializeSnapshot(w, 7);
  applySnapshot(shell, snapW);
  check('P life: the shell wears the shard\'s bodies and clock', shell.actors.length === snapW.actors.length && Math.abs(shell.time - snapW.time) < 1e-6 && shell.localSeat.actor.pos.x === snapW.seats['p1'].pos[0]);
  // Streaming around the hero publishes the pages under it.
  const hero = shell.player;
  const heroCell = shell.massRuntime!.walk.at(hero.pos.x, hero.pos.y);
  for (let i = 0; i < 120; i++) wildsShellStream(shell, hero.pos);
  check('P stream: the hero\'s own page is published after a few frames', shell.massRuntime!.stream.page(heroCell) !== undefined);
  check('P stream: the sky rides the shard\'s clock', !shell.massRuntime!.weather || shell.massRuntime!.weather.time >= shell.time - 1e-6);
  // Prediction clamps on real ground: moving the hero through moveActor never throws and lands somewhere.
  const x0 = hero.pos.x;
  for (let i = 0; i < 30; i++) shell.moveActor(hero, 1, 0, DT);
  check('P ground: the shell\'s own hero walks the mass walk', Number.isFinite(hero.pos.x) && hero.pos.x > x0, `Δx=${(hero.pos.x - x0).toFixed(1)}`);
  // A pocket zone message drops the runtime; the surface brings it back.
  wildsShellZone(shell, { ...zmsg, zoneId: 'cave_mass_probe', name: 'A pocket', walk: null }, hello.seed);
  check('P pocket: a pocket zone message drops the shell\'s runtime', shell.massRuntime === null);
  wildsShellZone(shell, zmsg, hello.seed);
  check('P pocket: the surface message re-seats the runtime and its walk', shell.massRuntime !== null && shell.walk === shell.massRuntime.walk && shell.zone.id === MASS_ZONE);
  // THE DRESS BEAT: a grown doodad roster re-ships the zone message within dressSec.
  let zones2 = 0;
  const offZ = c.onZone(() => { zones2++; });
  await runTicks(wilds, Math.ceil(SHARD_CFG.dressSec * SHARD_CFG.tickHz) + 2);
  const quiet = zones2;
  w.doodads.push({ ...w.doodads[0], pos: { x: w.doodads[0].pos.x + 7, y: w.doodads[0].pos.y + 7 } });
  w.markDoodadsChanged(); // the engine's own revision is the beat's signal
  await runTicks(wilds, Math.ceil(SHARD_CFG.dressSec * SHARD_CFG.tickHz) + 2);
  offZ();
  check('P dress: a changed doodad roster re-ships the zone message on the beat, a still one does not', quiet === 0 && zones2 === 1, `quiet ${quiet}, after ${zones2}`);

  c.leave();
  await waitFor(() => w.seats.length === 1, wilds, 60);
  await wilds.stop();
}

// ====================================================== Q: THE WILDS SAVE ==
// A --worldmass shard persists like a classic one, to its own file, and a
// saved one stands back up in the mass lane's own resume order before it steps
// a frame (server/wildsSave.ts resumeWilds): the clock to the saved second, the
// runtime finished and live, every native the checkpoint carried, the keeper at
// the hearth whatever spot it was saved at, the seed on the welcome. A save
// taken inside a native pocket (probe_worldmass_sideareas' own enterSidezone
// path, at the hearth's cellar hatch) wakes at the hearth with the pocket still
// pinned to its mouth; a save that will not stand gives way to a fresh wilds.
{
  type Mouth = { pos: { x: number; y: number }; kind: string; seed: number };
  type Pocketable = { caveEntrances: Mouth[]; enterSidezone(cm: Mouth): void };
  const pocketable = (w: World): Pocketable => w as unknown as Pocketable;
  const QSEED = 0x0ddba11;
  const dir = mkdtempSync(join(tmpdir(), 'hw-wilds-'));
  const quiet = (): void => { /* quiet */ };
  const readSave = (path: string): ShardSave => JSON.parse(readFileSync(path, 'utf-8')) as ShardSave;
  const tickSafely = async (h: ShardHost, n: number): Promise<number> => {
    let threw = 0;
    for (let i = 0; i < n; i++) { try { h.tick(DT); } catch { threw++; } await yieldIO(); }
    return threw;
  };
  try {
    // ---- the first life: a fresh wilds, a walker, the write
    let t0 = performance.now();
    const a = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    await a.ready();
    const bootMs = performance.now() - t0;
    check('Q wilds save: the wilds are persistent, to their own file beside the classic one',
      a.savePath === join(dir, `shard_${QSEED.toString(16).padStart(8, '0')}${SHARD_CFG.wildsSaveSuffix}.json`) && !!a.world.massRuntime,
      `fresh boot ${bootMs.toFixed(0)} ms`);
    await runTicks(a, 180);
    const portQ = await a.listen(0, '127.0.0.1');
    const cq = new WsTransport();
    await cq.connect(`ws://127.0.0.1:${portQ}`, { name: 'Wayfarer', classId: 'warrior' });
    await waitFor(() => a.world.seats.length === 2, a, 50);
    const walker = a.world.seats.find(s => s.id === 'p1')!;
    // The party is set down on open country east of the hearth (the engine's
    // own landPartyAt: the Waking House's latched door walls a bedside walk in),
    // then the joiner walks east over the wire and THE SHADOW drags the stream.
    const st = a.world.massRuntime!.settlement!;
    a.world.landPartyAt({ x: st.zone.size.w + st.spec.apron + st.spec.blend + 400, y: st.zone.size.h / 2 });
    const d0 = a.world.doodads.length, x0 = walker.actor.pos.x;
    for (let i = 0; i < 600 && walker.actor.pos.x < x0 + 300; i++) {
      cq.sendInput('p1', { dx: 1, dy: 0, aim: { x: walker.actor.pos.x + 100, y: walker.actor.pos.y }, held: [], edge: [], seq: i + 1 });
      await runTicks(a, 1);
    }
    check('Q wilds save: a joiner walks 300 px east over the wire and the wilds grow around it',
      walker.actor.pos.x >= x0 + 300 && a.world.doodads.length > d0,
      `Δx ${(walker.actor.pos.x - x0).toFixed(0)}, doodads ${d0}→${a.world.doodads.length}, population ${a.world.massRuntime!.population}`);
    cq.leave();
    await waitFor(() => a.world.seats.length === 1, a, 60);
    t0 = performance.now();
    a.persist();
    const persistMs = performance.now() - t0;
    const written = readSave(a.savePath!);
    check('Q wilds save: persist() writes the mass half atomically under the shard wrapper',
      !existsSync(a.savePath! + '.tmp') && written.schemaVersion === SHARD_CFG.saveSchema && written.seed === QSEED
      && written.world.worldmass?.state.run.seed === QSEED && written.world.worldmass.enemies.length > 0,
      `${(statSync(a.savePath!).size / 1e6).toFixed(2)} MB in ${persistMs.toFixed(0)} ms, ${written.world.worldmass?.enemies.length} natives`);
    await a.stop(); // stop() writes the same world again (no frame between)
    const saved = readSave(a.savePath!);

    // ---- the second life: THE RESUME LAW, then the world as it was
    t0 = performance.now();
    const b = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    const ctorMs = performance.now() - t0;
    const pending = b.world.massRuntime?.resumePending === true;
    const heldTicks = b.ticks, heldTime = b.world.time, heldAt = statSync(b.savePath!).mtimeMs;
    b.tick(DT); b.persist();
    const held = b.ticks === heldTicks && b.world.time === heldTime && statSync(b.savePath!).mtimeMs === heldAt;
    await b.ready();
    const resumeMs = performance.now() - t0;
    check('Q wilds resume: THE RESUME LAW — until ready() the runtime stands restore-only, no frame steps, no write lands',
      pending && held, `constructor ${ctorMs.toFixed(0)} ms, ready ${resumeMs.toFixed(0)} ms`);
    const w = b.world, mr = w.massRuntime;
    check('Q wilds resume: the clock comes back to the saved second', Math.abs(w.time - saved.world.time) < 1e-6,
      `t ${w.time.toFixed(4)} vs ${saved.world.time.toFixed(4)}`);
    check('Q wilds resume: the mass runtime stands finished and live on the surface',
      !!mr && !mr.resumePending && w.zone.id === MASS_ZONE && w.walk === mr.walk && w.arena.boundless === true && mr.generator.run.seed === QSEED);
    const savedNatives = saved.world.worldmass!.enemies;
    const back = new Map((mr?.snapshot(w).enemies ?? []).map(e => [e.id, e]));
    const same = savedNatives.filter(e => {
      const r = back.get(e.id);
      return !!r && r.monster === e.monster && r.level === e.level && Math.abs(r.life - e.life) < 1e-9;
    }).length;
    check('Q wilds resume: every native the checkpoint carried stands again — same body, same wounds',
      savedNatives.length > 0 && same === savedNatives.length, `${same}/${savedNatives.length} natives, population ${mr?.population}`);
    const k = b.keeper.actor.pos, spot = saved.world.worldmass!.player, hearth = mr?.settlement;
    check('Q wilds resume: the keeper wakes at the hearth, never at its saved spot',
      !!hearth && hearth.contains(k.x, k.y) && Math.hypot(k.x - hearth.spawn.x, k.y - hearth.spawn.y) < 1 && !hearth.contains(spot.x, spot.y),
      `keeper (${k.x.toFixed(0)}, ${k.y.toFixed(0)}), saved at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)})`);
    const portB = await b.listen(0, '127.0.0.1');
    const cb = new WsTransport();
    const helloB = await cb.connect(`ws://127.0.0.1:${portB}`, { name: 'Returner', classId: 'rogue' });
    check('Q wilds resume: a joiner\'s welcome carries the same seed and the surface', helloB.seed === QSEED && helloB.worldmass === true && helloB.self === 'p1');
    await waitFor(() => w.seats.length === 2, b, 50);
    const fb = b.faults, tb = b.ticks;
    const threwB = await tickSafely(b, 120);
    check('Q wilds resume: 120 frames tick on the resumed wilds without a fault',
      threwB === 0 && b.faults === fb && b.ticks === tb + 120 && w.seats.length === 2, `actors ${w.actors.length}`);
    cb.leave();
    await waitFor(() => w.seats.length === 1, b, 60);

    // ---- THE POCKET: a save taken inside a native pocket
    const hatch = pocketable(w).caveEntrances.find(m => m.kind === 'cellar_hatch');
    let cave = '';
    if (hatch && w.massRuntime) {
      w.landPartyAt(hatch.pos);
      w.massRuntime.update(w, true);
      pocketable(w).enterSidezone(hatch);
      cave = w.zone.id;
    }
    const fp = b.faults;
    const threwP = await tickSafely(b, 30);
    let wrote = true;
    try { b.persist(); } catch { wrote = false; }
    const pocketSave = readSave(b.savePath!);
    check('Q wilds pocket: inside a native pocket the world ticks and writes the surface it left behind',
      !!hatch && cave.startsWith('cave_mass_') && w.inCave && w.massRuntime === null && threwP === 0 && b.faults === fp && wrote
      && pocketSave.world.worldmass?.state.run.seed === QSEED && pocketSave.world.massSideareas?.active?.zone === cave);
    await b.stop();
    const c = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: quiet });
    await c.ready();
    const cw = c.world, cmr = cw.massRuntime, ck = c.keeper.actor.pos;
    check('Q wilds pocket: the resume wakes the keeper at the hearth on the surface, the pocket still pinned',
      !!cmr && !cmr.resumePending && cw.zone.id === MASS_ZONE && !cw.inCave && !!cw.caveMap[cave] && !!cmr.settlement?.contains(ck.x, ck.y));
    const again = pocketable(cw).caveEntrances.find(m => m.kind === 'cellar_hatch');
    if (again && cmr) { cw.landPartyAt(again.pos); cmr.update(cw, true); pocketable(cw).enterSidezone(again); }
    check('Q wilds pocket: the same mouth re-enters the same pocket', !!again && cw.zone.id === cave);
    await c.stop();

    // ---- THE REFUSED SAVE: a checkpoint the runtime rejects (a tampered config
    // hash — the world half adopts, the mass half refuses) gives way to a fresh
    // keeper world and a fresh wilds, one log line, the refused file set aside.
    const tampered = readSave(c.savePath!);
    tampered.world.worldmass!.configHash = 'tampered';
    writeFileSync(c.savePath!, JSON.stringify(tampered));
    const lines: string[] = [];
    const d = new ShardHost({ seed: QSEED, saveDir: dir, open: true, worldmass: true, log: l => lines.push(l) });
    await d.ready();
    const aside = readdirSync(dir).filter(f => f.includes('.refused-'));
    const dmr = d.world.massRuntime, dk = d.keeper.actor.pos, fd = d.faults;
    const threwD = await tickSafely(d, 30);
    check('Q wilds refused: a save that will not stand gives way to a fresh wilds — one log line, the file set aside',
      lines.length === 1 && /would not stand/.test(lines[0]) && aside.length === 1 && !existsSync(d.savePath!)
      && !!dmr && !dmr.resumePending && d.world.zone.id === MASS_ZONE && d.world.time < saved.world.time
      && !!dmr.settlement?.contains(dk.x, dk.y) && threwD === 0 && d.faults === fd,
      lines.join(' / '));
    await d.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// =========================================== L–O: THE VESSEL + THE CORPSE ==
// One classic shard with a records directory hosts every step: the identity,
// an uploaded vessel and its mirrors, THE DEATH COVENANT, the body's return.
const VSEED = 0x05e55e1;
const vdir = mkdtempSync(join(tmpdir(), 'hw-vessel-'));
const quiet = (): void => { /* quiet */ };
const vh = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, log: quiet });
const vurl = `ws://127.0.0.1:${await vh.listen(0, '127.0.0.1')}`;
const seatOf = (id: string): Seat | undefined => vh.world.seats.find(s => s.id === id);
const rowsOf = (t: WsTransport): SessionMsg[] => { const log: SessionMsg[] = []; t.onSession(m => log.push(m)); return log; };
const onDisk = (): ShardRecordsSave => JSON.parse(readFileSync(shardRecordsPath(vdir, VSEED)!, 'utf-8')) as ShardRecordsSave;
const uids = (items: readonly { uid: number }[]): string => JSON.stringify(items.map(i => i.uid).sort((a, b) => a - b));
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it. */
function forgeVessel(o: { classId: string; level: number; name: string; charId: string; modeId?: string;
  bag: number; worn: ItemCategory[]; essences?: Record<string, number> }): CharacterSave {
  const w = vh.world;
  const seat = w.addSeat('forge', CLASSES.find(c => c.id === o.classId)!, new NullInput(), { startingCompanions: false, startingFlasks: false });
  w.seatHero(seat).level = o.level;
  seat.meta.name = o.name; seat.meta.charId = o.charId;
  if (o.modeId) seat.meta.modeId = o.modeId;
  for (const slot of o.worn) {
    const it = rollItem({ ilvl: o.level, rarity: 'rare', category: slot });
    if (it) { seat.meta.items.push(it); w.equipItem(seat, it.uid, slot); }
  }
  for (let placed = 0, tries = 0; placed < o.bag && tries < 50; tries++) {
    const it = rollItem({ ilvl: o.level, rarity: 'magic' });
    if (it && autoPlace(seat.meta.items, it)) placed++;
  }
  Object.assign(seat.meta.essences, o.essences ?? {});
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  return JSON.parse(JSON.stringify(save)) as CharacterSave;
}

// ======================================================== L: THE IDENTITY ==
/** A client's account as the browser's loaders leave it: minted. */
const claimedAccount = (): Account => { const a = makeAccount(); ensureAccountId(a); return a; };
{
  const bare = makeAccount();
  check('L identity: a made account carries no id until a load mints one (sims stay byte-identical)',
    bare.accountId === '' && !('accountId' in serializeAccount(bare)) && deserializeAccount(serializeAccount(bare))!.accountId === '');
  const a = claimedAccount(), b = claimedAccount();
  check('L identity: the mint is a 128-bit hex id, never shared', isAccountId(a.accountId) && a.accountId !== b.accountId, a.accountId);
  check('L identity: a minted id survives serialize and load, and is never minted twice',
    deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))))!.accountId === a.accountId && !ensureAccountId(a));
  const mangled = deserializeAccount({ ...serializeAccount(a), accountId: 'p0' })!;
  check('L identity: a malformed saved id is dropped, never trusted; the load mints afresh',
    mangled.accountId === '' && ensureAccountId(mangled) && isAccountId(mangled.accountId));
  // THE LOAD PATH, as a browser boots: the synchronous load mints in memory,
  // the disk-first load adopts that id, writes it home, and keeps it after.
  const ACCOUNT_CACHE_KEY = storageKey('arpg_account_v1');
  window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
  const stream = Math.random;
  let draws = 0;
  Math.random = (): number => { draws++; return stream(); };
  const boot = loadAccount();
  const hydrated = await loadAccountAsync();
  const again = await loadAccountAsync();
  const legacy = serializeAccount(again);
  delete legacy.accountId;
  window.localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(legacy));
  const healed = await loadAccountAsync();
  Math.random = stream;
  const cachedId = (JSON.parse(window.localStorage.getItem(ACCOUNT_CACHE_KEY) ?? '{}') as { accountId?: string }).accountId;
  check('L load: a profile\'s first boot mints one id and every later load keeps it',
    isAccountId(boot.accountId) && hydrated.accountId === boot.accountId && again.accountId === boot.accountId, boot.accountId);
  check('L load: a cached save that predates the id is minted at its load and cached at once',
    isAccountId(healed.accountId) && cachedId === healed.accountId);
  check('L identity: minting draws nothing from the seeded stream (THE STREAM LAW)', draws === 0, `${draws} draws`);
  window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
}
const acctLone = claimedAccount();
const watcher = new WsTransport();
const watcherRows = rowsOf(watcher);
await watcher.connect(vurl, { name: 'Watcher', classId: 'rogue' });
const lone = new WsTransport();
const lw = await lone.connect(vurl, { name: 'Lone', classId: 'warrior', accountId: acctLone.accountId });
await waitFor(() => vh.world.seats.length === 3 && watcher.peers().length === 3, vh, 60);
check('L join: the join carries the id to the host', vh.vessels.accountOf(lw.self) === acctLone.accountId);
check('L join: no roster row on the wire carries it',
  [...watcher.peers(), ...lone.peers()].every(p => p.accountId === undefined) && watcher.peers().some(p => p.id === lw.self));
{
  const forger = new WsTransport();
  const fw = await forger.connect(vurl, { name: 'Forger', classId: 'warrior', accountId: 'p1' });
  await waitFor(() => !!seatOf(fw.self), vh, 60);
  check('L join: a malformed id keys nothing', !!seatOf(fw.self) && vh.vessels.accountOf(fw.self) === undefined);
  forger.leave();
  await waitFor(() => !seatOf(fw.self), vh, 60);
}

// ========================================================== M: THE VESSEL ==
const acctA = claimedAccount();
const V = forgeVessel({ classId: 'warrior', level: 12, name: 'Aldric', charId: 'c-probe-aldric', bag: 6,
  worn: ['helmet', 'chest', 'gloves', 'boots'], essences: { coarse: 40, glimmering: 10 } });
// Its own run config and run counters (the pass-through must keep them its own).
V.expedition = { ...V.expedition!, seed: 0x1234 };
V.ledger = { probe_counter: 7 };
const vBag = uids(V.items ?? []), vWorn = uids(Object.values(V.equipped ?? {}));
check('M forge: a level-12 warrior with a bag and a doll, no world half',
  V.level === 12 && (V.items ?? []).length === 6 && Object.keys(V.equipped ?? {}).length === 4 && V.world === undefined,
  `${(V.items ?? []).length} bag, ${Object.keys(V.equipped ?? {}).length} worn, ${JSON.stringify(V).length} bytes`);
{
  const j = judgeVessel({ ...V, world: { zones: [] } });
  check('M judge: the world half never travels', 'save' in j && !('world' in j.save));
  const deep = structuredClone(V);
  (deep.items![0] as { baseRoll: number }).baseRoll = Infinity;
  const hostile: [string, unknown][] = [
    ['class', { ...V, classId: 'nobody' }], ['level', { ...V, level: VESSEL_CFG.maxLevel + 1 }],
    ['skills', { ...V, knownSkills: 'nope' }], ['bag', { ...V, items: [{ uid: -3 }] }],
    ['charId', { ...V, charId: '' }], ['schema', { ...V, schemaVersion: -1 }],
    ['infinity', deep], ['not an object', 'vessel'],
  ];
  const leaks = hostile.filter(([, raw]) => !('refused' in judgeVessel(raw))).map(([why]) => why);
  check('M judge: hostile shapes are refused before anything grafts', leaks.length === 0, leaks.join(', '));
}
const cv = new WsTransport();
const cvRows = rowsOf(cv);
window.localStorage.removeItem(storageKey('arpg_account_v1'));
const linkA = new ShardVesselLink(cv, acctA, V, () => null);
check('M vessel: the link saves the account before the shard keys a record by its id',
  (JSON.parse(window.localStorage.getItem(storageKey('arpg_account_v1')) ?? '{}') as { accountId?: string }).accountId === acctA.accountId);
const cw = await cv.connect(vurl, { name: V.name!, classId: 'rogue', accountId: acctA.accountId }, V);
await waitFor(() => !!seatOf(cw.self), vh, 60);
{
  const s = seatOf(cw.self)!, hero = vh.world.seatHero(s);
  check('M vessel: the uploaded class wins over the lobby card', s.meta.classDef.id === 'warrior');
  check('M vessel: the shard seats it at its level, named, with its own bag and doll',
    hero.level === 12 && s.meta.name === 'Aldric' && uids(s.meta.items) === vBag
    && uids(Object.values(s.meta.equipped).flatMap(i => (i ? [i] : []))) === vWorn, `level ${hero.level}, ${s.meta.items.length} bag`);
  check('M vessel: its wallet and life-contract ride along',
    s.meta.essences.coarse === 40 && s.meta.essences.glimmering === 10 && s.meta.modeId === 'mortal' && s.meta.charId === V.charId);
  check('M vessel: the desk keys it by its account', vh.vessels.vesselOf(cw.self)?.accountId === acctA.accountId);
  check('M vessel: the grafted hero stands whole', Number.isFinite(hero.maxLife()) && hero.life === hero.maxLife() && !hero.downed);
}
{
  const bad = new WsTransport();
  const bw = await bad.connect(vurl, { name: 'Broken', classId: 'rogue', accountId: claimedAccount().accountId },
    { ...V, charId: 'c-broken', knownSkills: 'nope' } as unknown as CharacterSave);
  const dup = new WsTransport();
  const dw = await dup.connect(vurl, { name: 'Twin', classId: 'warrior', accountId: acctA.accountId }, V);
  await waitFor(() => !!seatOf(bw.self) && !!seatOf(dw.self), vh, 60);
  const sb = seatOf(bw.self)!, sd = seatOf(dw.self)!;
  check('M fallback: a vessel that fails the judgment joins as the fresh card hero',
    sb.meta.classDef.id === 'rogue' && vh.world.seatHero(sb).level === 1 && sb.meta.items.length === 0 && !vh.vessels.vesselOf(bw.self));
  check('M fallback: a vessel already walking the world is never seated twice',
    !vh.vessels.vesselOf(dw.self) && vh.world.seatHero(sd).level === 1);
  bad.leave(); dup.leave();
  await waitFor(() => !seatOf(bw.self) && !seatOf(dw.self), vh, 60);
}
{
  const beat = Math.ceil(SHARD_CFG.persistSec * SHARD_CFG.tickHz) + 30;
  let ticks = 0;
  while (linkA.mirrors < 1 && ticks < beat) { vh.tick(DT); await yieldIO(); ticks++; }
  const slot = loadCharacter();
  check('M mirror: the heroSave arrives on the persistence beat', linkA.mirrors >= 1, `${ticks} ticks (beat ${beat})`);
  check('M mirror: it lands in the run slot, no world half, the same hero',
    !!slot && slot.world === undefined && slot.charId === V.charId && slot.level === 12 && uids(slot.items ?? []) === vBag);
  check('M mirror: it went to that seat alone', cvRows.some(m => m.t === 'heroSave') && !watcherRows.some(m => m.t === 'heroSave'));
  check("M mirror: the pass-through stays the vessel's own, never the shard's",
    slot?.ledger?.probe_counter === 7 && Object.keys(slot?.ledger ?? {}).length === 1 && slot?.expedition?.seed === 0x1234);
  // THE GUARD: once another run owns the slot, a late mirror never lands.
  const parked = new WsTransport();
  const guarded = new ShardVesselLink(parked, acctA, V, () => null, { mayWrite: () => false });
  const before = JSON.stringify(loadCharacter());
  (parked as unknown as { dispatch(m: unknown): void }).dispatch({ t: 'session', msg: { t: 'heroSave', save: { ...slot, level: 99 } } });
  check('M mirror: a late mirror never lands once another run owns the slot',
    guarded.mirrors === 0 && JSON.stringify(loadCharacter()) === before);
}
{
  const before = linkA.mirrors;
  cv.leave(); // THE FAREWELL: ask for the last mirror, close when it lands
  const gone = await waitFor(() => !seatOf(cw.self), vh, 120);
  check('M farewell: the last mirror lands before the socket closes', gone && linkA.mirrors === before + 1,
    `${linkA.mirrors - before} mirror(s) at the farewell`);
}
const V2 = await readTravelingVessel();
check('M round trip: the mirror reads back as the next traveling vessel',
  !!V2 && V2.charId === V.charId && V2.world === undefined && V2.level === 12 && uids(V2.items ?? []) === vBag);
const cv2 = new WsTransport();
const cv2Rows = rowsOf(cv2);
const cv2Order: string[] = []; // session kinds and zone messages, in arrival order
cv2.onSession(m => cv2Order.push(m.t));
cv2.onZone(() => cv2Order.push('zone'));
const link2 = new ShardVesselLink(cv2, acctA, V2, () => null);
const c2 = await cv2.connect(vurl, { name: V2!.name!, classId: 'warrior', accountId: acctA.accountId }, V2!);
await waitFor(() => !!seatOf(c2.self), vh, 60);
check('M round trip: the shard seats the mirror as the same hero',
  !!vh.vessels.vesselOf(c2.self) && vh.world.seatHero(seatOf(c2.self)!).level === 12 && uids(seatOf(c2.self)!.meta.items) === vBag);

// ================================================== N: THE DEATH COVENANT ==
// The body falls by the plaza, far from the bedside every fresh hero wakes at.
const wp = vh.world.waypointPos ?? vh.keeper.actor.pos;
const deathSpot = vh.world.findFreeSpot(vec(wp.x + 180, wp.y + 160), 16);
{
  const s = seatOf(c2.self)!, hero = vh.world.seatHero(s);
  hero.pos.x = deathSpot.x; hero.pos.y = deathSpot.y;
  await runTicks(vh, 5);
  vh.world.kill(hero);
  await runTicks(vh, 30);
  check("N covenant: while another player stands to kneel, the mortal down stays co-op's (no fall, no mercy)",
    hero.downed && !!seatOf(c2.self) && vh.vessels.falls === 0 && vh.corpses.forAccount(acctA.accountId).length === 0);
}
watcher.leave(); lone.leave();
await waitFor(() => vh.vessels.falls === 1, vh, 120);
{
  const iC = cv2Rows.findIndex(m => m.t === 'corpse'), iE = cv2Rows.findIndex(m => m.t === 'runEnd');
  check('N covenant: alone, the mortal vessel falls: `corpse` then `runEnd` reach its client', iC >= 0 && iE > iC, `corpse@${iC} runEnd@${iE}`);
  const bodies = vh.corpses.forAccount(acctA.accountId);
  const b = bodies[0];
  check('N covenant: the body is recorded where it fell, holding the worn gear',
    bodies.length === 1 && dist(b.pos, deathSpot) < 1 && b.zoneId === vh.world.zone.id
    && b.loot.items.length === 4 && uids(b.loot.items.flatMap(it => (it.kind === 'gear' ? [it.item] : []))) === vWorn,
    b ? `${b.zoneId} @ ${b.pos.x.toFixed(0)},${b.pos.y.toFixed(0)}, ${b.loot.items.length} pieces` : 'none');
  check('N covenant: the seat is gone; the body stands instead', !seatOf(c2.self) && !vh.vessels.vesselOf(c2.self));
  const row = cv2Rows[iC];
  check('N covenant: the reckoning ships with the note (60 worth carried, minted at the mortal rate)',
    row?.t === 'corpse' && row.reckoning.carried === 60 && row.reckoning.mult === 1 && row.reckoning.minted === 60
    && row.note.pieces === 4 && row.note.id === b?.id && row.note.zoneName === vh.world.zone.name,
    row?.t === 'corpse' ? `minted ${row.reckoning.minted}, renown ${row.reckoning.renown}` : '');
  check('N covenant: the client runs its own mortal reckoning (credits, chronicle, death tally, its run counters)',
    acctA.credits === 60 && acctA.runRecords.length === 1 && acctA.ledger[LEDGER_ACCOUNT_DEATHS] === 1
    && acctA.ledger.probe_counter === 7, `credits ${acctA.credits}`);
  check('N covenant: the run slot is wiped (permadeath)', loadCharacter() === null);
  const staged = link2.takeDeath(cv2, null);
  check('N covenant: the death screen is staged once, naming the ground',
    !!staged && staged.reck.minted === 60 && staged.reck.zoneName === vh.world.zone.name && link2.takeDeath(cv2, null) === null);
  const disk = onDisk();
  check('N covenant: the records file holds the body and the tombstone',
    disk.corpses.length === 1 && disk.corpses[0].id === b?.id && disk.fallen.some(f => f.charId === V.charId && f.accountId === acctA.accountId));
}
{
  const acctI = claimedAccount();
  const VI = forgeVessel({ classId: 'rogue', level: 9, name: 'Vow', charId: 'c-probe-vow', modeId: 'immortal', bag: 0, worn: ['helmet'] });
  const ci = new WsTransport();
  const ciRows = rowsOf(ci);
  const iw = await ci.connect(vurl, { name: 'Vow', classId: 'rogue', accountId: acctI.accountId }, VI);
  await waitFor(() => !!seatOf(iw.self), vh, 60);
  const hero = vh.world.seatHero(seatOf(iw.self)!);
  check('N immortal: an Immortal vessel grafts under its own contract', seatOf(iw.self)!.meta.modeId === 'immortal' && !!vh.vessels.vesselOf(iw.self));
  vh.world.kill(hero);
  await runTicks(vh, 2);
  check('N immortal: its death is a DOWN (its stage survives death: no fall, no body)',
    hero.downed && !!seatOf(iw.self) && !ciRows.some(m => m.t === 'corpse' || m.t === 'runEnd') && vh.corpses.forAccount(acctI.accountId).length === 0);
  await runTicks(vh, Math.ceil(SHARD_CFG.keeper.reviveSec * SHARD_CFG.tickHz * 1.1) + 2);
  check('N immortal: THE MERCY stands it back up', !hero.downed && !hero.dead && hero.life > 0);
  ci.leave();
  await waitFor(() => !seatOf(iw.self), vh, 60);
}
{
  const cf = new WsTransport();
  const fw = await cf.connect(vurl, { name: 'Fresh', classId: 'warrior', accountId: claimedAccount().accountId });
  await waitFor(() => !!seatOf(fw.self), vh, 60);
  const hero = vh.world.seatHero(seatOf(fw.self)!);
  vh.world.kill(hero);
  await runTicks(vh, 2);
  check('N fresh: a fresh hero (no vessel) is downed, never fallen', hero.downed && !!seatOf(fw.self) && vh.vessels.falls === 1);
  await runTicks(vh, Math.ceil(SHARD_CFG.keeper.reviveSec * SHARD_CFG.tickHz * 1.1) + 2);
  check('N fresh: THE MERCY stands it back up, as M0 shipped', !hero.downed && hero.life > 0);
  cf.leave();
  await waitFor(() => !seatOf(fw.self), vh, 60);
}
{
  const ct = new WsTransport();
  const ctOrder: string[] = [];
  ct.onSession(m => ctOrder.push(m.t));
  const tw = await ct.connect(vurl, { name: V2!.name!, classId: 'warrior', accountId: acctA.accountId }, V2!);
  await waitFor(() => ctOrder.includes('runEnd'), vh, 60);
  check('N tombstone: a fallen vessel never walks in again: its re-upload takes no seat and hears its word',
    !seatOf(tw.self) && !vh.vessels.vesselOf(tw.self) && ctOrder.indexOf('corpse') >= 0
    && ctOrder.indexOf('runEnd') > ctOrder.indexOf('corpse'), ctOrder.join(' → '));
  ct.leave();
  await runTicks(vh, 5);
}
{
  // THE LATE WORD: a mortal vessel that leaves while DOWN has fallen, and its
  // client hears the word at its next upload of that vessel.
  const acctW = claimedAccount();
  const W = forgeVessel({ classId: 'warrior', level: 7, name: 'Wren', charId: 'c-probe-wren', bag: 0, worn: ['boots'], essences: { coarse: 9 } });
  const kneeler = new WsTransport();
  const kw = await kneeler.connect(vurl, { name: 'Kneeler', classId: 'rogue' });
  const cwr = new WsTransport();
  const linkW = new ShardVesselLink(cwr, acctW, W, () => null);
  const ww = await cwr.connect(vurl, { name: 'Wren', classId: 'warrior', accountId: acctW.accountId }, W);
  await waitFor(() => !!seatOf(kw.self) && !!seatOf(ww.self), vh, 60);
  const heroW = vh.world.seatHero(seatOf(ww.self)!);
  const spotW = vh.world.findFreeSpot(vec(wp.x - 200, wp.y + 160), 16);
  heroW.pos.x = spotW.x; heroW.pos.y = spotW.y;
  vh.world.kill(heroW);
  await runTicks(vh, 10);
  check('N late word: beside a standing ally the mortal vessel lies down, unfallen', heroW.downed && vh.vessels.falls === 1);
  cwr.leave(); // the farewell's mirror lands, then the socket closes on a downed vessel
  await waitFor(() => !seatOf(ww.self) && vh.vessels.falls === 2, vh, 120);
  const fallenW = onDisk().fallen.find(f => f.charId === W.charId);
  check('N late word: leaving while down IS the fall (body, tombstone, the owed word)',
    vh.vessels.falls === 2 && vh.corpses.forAccount(acctW.accountId).length === 1 && fallenW?.word?.reckoning.minted === 9);
  const stale = await readTravelingVessel();
  check('N late word: the client that never heard still holds the vessel', stale?.charId === W.charId && linkW.mirrors >= 1);
  const cwr2 = new WsTransport();
  const order: string[] = [];
  cwr2.onSession(m => order.push(m.t));
  cwr2.onZone(() => order.push('zone'));
  const linkW2 = new ShardVesselLink(cwr2, acctW, stale, () => null);
  const ww2 = await cwr2.connect(vurl, { name: 'Wren', classId: 'warrior', accountId: acctW.accountId }, stale!);
  await waitFor(() => order.includes('runEnd'), vh, 60);
  check('N late word: its re-upload joins no seat and hears `corpse` then `runEnd`',
    !seatOf(ww2.self) && order.indexOf('corpse') >= 0 && order.indexOf('runEnd') > order.indexOf('corpse'), order.join(' → '));
  check('N late word: the client runs its reckoning and wipes its slot',
    acctW.credits === 9 && loadCharacter() === null && !!linkW2.takeDeath(cwr2, null));
  cwr2.sendSession({ t: 'rejoin', classId: 'rogue' });
  await waitFor(() => !!seatOf(ww2.self) && order.includes('newRun'), vh, 60);
  await runTicks(vh, 2);
  check('N late word: its class pick rejoins as a fresh hero, the terrain after its newRun',
    vh.world.seatHero(seatOf(ww2.self)!).level === 1 && order.lastIndexOf('zone') > order.indexOf('newRun'), order.join(' → '));
  kneeler.leave(); cwr2.leave();
  await waitFor(() => !seatOf(kw.self) && !seatOf(ww2.self), vh, 60);
}

// ================================================== O: THE CORPSE RETURNS ==
{
  const body = vh.corpses.forAccount(acctA.accountId)[0];
  const B = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, log: quiet });
  const bb = B.corpses.forAccount(acctA.accountId);
  check('O persist: a second boot remembers the body and the tombstone',
    bb.length === 1 && bb[0].id === body?.id && dist(bb[0].pos, deathSpot) < 1 && B.corpses.hasFallen(acctA.accountId, V.charId!));
  await B.stop();
}
// The fallen player comes back on the same connection: the class pick's rejoin.
cv2.sendSession({ t: 'rejoin', classId: 'warrior' });
await waitFor(() => cv2Rows.some(m => m.t === 'newRun') && !!seatOf(c2.self), vh, 60);
await runTicks(vh, 3);
const claimant = seatOf(c2.self)!;
const standing = vh.corpses.standing(c2.self);
check('O return: the rejoin seats a fresh hero keyed by the same account',
  !!claimant && vh.world.seatHero(claimant).level === 1 && !vh.vessels.vesselOf(c2.self) && vh.vessels.accountOf(c2.self) === acctA.accountId);
check('O return: the terrain follows its newRun (the shell that applies it stands up on newRun)',
  cv2Order.lastIndexOf('zone') > cv2Order.lastIndexOf('newRun'), cv2Order.slice(-4).join(' → '));
check('O return: its body stands where it fell, far from the bedside it woke at',
  standing.length === 1 && dist(standing[0].pos, deathSpot) < 24
  && dist(standing[0].pos, vh.world.seatHero(claimant).pos) > transitRadius('corpse_reclaim', 110),
  standing[0] ? `${dist(standing[0].pos, vh.world.seatHero(claimant).pos).toFixed(0)} px from the claimant` : 'none');
const lastBodies = [...cv2Rows].reverse().find(m => m.t === 'corpses');
check('O return: its client is told where (its own corpses row)',
  lastBodies?.t === 'corpses' && lastBodies.bodies.length === 1 && lastBodies.bodies[0].id === standing[0]?.id);
{
  const co = new WsTransport();
  const coRows = rowsOf(co);
  const ow = await co.connect(vurl, { name: 'Other', classId: 'rogue', accountId: claimedAccount().accountId });
  await waitFor(() => !!seatOf(ow.self), vh, 60);
  await runTicks(vh, 3);
  const other = vh.world.seatHero(seatOf(ow.self)!);
  other.pos.x = standing[0].pos.x; other.pos.y = standing[0].pos.y;
  await runTicks(vh, Math.ceil(transitDwell('corpse_reclaim') * SHARD_CFG.tickHz * 2));
  check('O return: another account sees no body and cannot reclaim it',
    vh.corpses.standing(ow.self).length === 0 && coRows.some(m => m.t === 'corpses')
    && coRows.every(m => m.t !== 'corpses' || m.bodies.length === 0) && vh.corpses.forAccount(acctA.accountId).length === 1);
  co.leave();
  await waitFor(() => !seatOf(ow.self), vh, 60);
}
{
  const deeds = acctA.ledger[LEDGER_CORPSES_RECLAIMED] ?? 0;
  const hero = vh.world.seatHero(claimant);
  hero.pos.x = standing[0].pos.x; hero.pos.y = standing[0].pos.y;
  const clock = Math.ceil(transitDwell('corpse_reclaim') * SHARD_CFG.tickHz);
  const half = await waitFor(() => vh.corpses.reclaims === 1, vh, Math.floor(clock / 2));
  check('O reclaim: the dwell is the corpse run\'s own clock (not yet at half)', !half && vh.corpses.standing(c2.self)[0]?.dwell > 0);
  const got = await waitFor(() => vh.corpses.reclaims === 1, vh, clock + 10);
  check('O reclaim: the owner reclaims its body by the dwell', got && vh.corpses.forAccount(acctA.accountId).length === 0);
  const bag = new Set(claimant.meta.items.map(i => i.uid));
  check('O reclaim: the worn gear comes home into its bag, the exact pieces',
    (JSON.parse(vWorn) as number[]).every(uid => bag.has(uid)), `${claimant.meta.items.length} in the bag`);
  const disk = onDisk();
  check('O reclaim: the record clears on disk; the tombstone stays',
    !disk.corpses.some(c => c.accountId === acctA.accountId) && disk.fallen.some(f => f.accountId === acctA.accountId));
  await runTicks(vh, 3);
  check('O reclaim: the deed rides home on the next row; no body stands',
    acctA.ledger[LEDGER_CORPSES_RECLAIMED] === deeds + 1 && vh.corpses.standing(c2.self).length === 0);
}
{
  const Wm = new ShardHost({ seed: VSEED, saveDir: vdir, open: true, worldmass: true, log: quiet });
  // (the wilds write their own world file since THE WILDS SAVE; the records live beside it, never inside it)
  check('O persist: a wilds shard keeps the records beside its own world file (the tombstone survives the world half)',
    !!Wm.savePath && Wm.savePath.endsWith(SHARD_CFG.wildsSaveSuffix + '.json') && Wm.corpses.path === shardRecordsPath(vdir, VSEED) && Wm.corpses.hasFallen(acctA.accountId, V.charId!));
  await Wm.stop();
}
cv2.leave();
await waitFor(() => vh.world.seats.length === 1, vh, 60);
await vh.stop();
rmSync(vdir, { recursive: true, force: true });
restoreRandom();

// Let in-flight socket closes settle before the process ends: Node on Windows
// asserts inside libuv when process.exit lands mid-close (a red exit code on
// an all-green rig — the probe gate reads the code).
const EXIT_SETTLE_MS = 600;
await new Promise(r => setTimeout(r, EXIT_SETTLE_MS));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
