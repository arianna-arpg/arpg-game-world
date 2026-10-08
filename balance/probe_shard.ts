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
// ---------------------------------------------------------------------------

import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { sanitizeInput } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import { WS_OP, WsMessageAssembler, decodeFrames, encodeClose, encodeFrame, encodeText } from '../src/net/wsframe';
import type { StateSnapshot, ZoneMsg } from '../src/net/snapshot';
import { seedGlobalRandom } from '../src/sim/rng';

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
  // The input sanitizer — the wire's first line of defence.
  check('A sanitize: a shaped input survives with clamped axes',
    JSON.stringify(sanitizeInput({ dx: 7, dy: -2, aim: { x: 1, y: 2 }, held: [true, 'no', 1], edge: [], seq: 3.7 })) === JSON.stringify({ dx: 1, dy: -1, aim: { x: 1, y: 2 }, held: [true, false, false], edge: [], seq: 3 }));
  check('A sanitize: a missing or NaN aim is refused', sanitizeInput({ dx: 0, dy: 0, held: [], edge: [] }) === null && sanitizeInput({ dx: 0, dy: 0, aim: { x: NaN, y: 0 }, held: [], edge: [] }) === null);
  check('A sanitize: non-objects are refused', sanitizeInput(null) === null && sanitizeInput('x') === null);
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
await waitFor(() => got.zone !== null, host, 30);
check('C join: the zone message lands first and names the hearth', got.zone !== null && got.zone.zoneId === 'lastlight' && events[0] === 'zone');
const snapsBefore = snaps;
await runTicks(host, 60);
check('C wire: snapshots ride the wire rate (≈20 per second of ticks)', snaps - snapsBefore >= 15 && snaps - snapsBefore <= 25, `${snaps - snapsBefore} in 60 ticks`);
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
  const kxp = host.keeper.meta.xp, klvl = host.keeper.actor.level;
  const pxp = p1.meta.xp, plvl = p1.actor.level;
  host.world.grantXp(50);
  // A level-1 seat may level off the grant (xp rolls over) — either face counts as banked.
  const banked = p1.actor.level > plvl || p1.meta.xp >= pxp + 50;
  check('G xp: the joiner banks the grant, the keeper banks nothing', banked && host.keeper.meta.xp === kxp && host.keeper.actor.level === klvl,
    `joiner xp ${pxp}→${p1.meta.xp} lvl ${plvl}→${p1.actor.level}; keeper xp ${kxp}→${host.keeper.meta.xp} lvl ${klvl}→${host.keeper.actor.level}`);
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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
restoreRandom();

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
