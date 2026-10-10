// ---------------------------------------------------------------------------
// PROBE: THE ONE CROSSING (docs/engine/shard.md "The pieces"; the charter §7e,
// the player's first hour, wave 3): a hosted world's arrival under one cover,
// the wilds shell's runtime surviving pockets, and the map kept across logins.
//
//   npx tsx balance/probe_shardcrossing.ts
//
// The pure lease first, then a wire rig: a REAL wilds ShardHost (open account,
// saveDir null, quiet) on a free port and a WsTransport client wired in
// main.ts's order (connectToShard, startAsClient, the zone and snapshot
// handlers, the held frame), the host ticked by hand. Pins:
//   A  THE ONE CROSSING (pure): a server-bound wake is covered from the flush
//      through the connect, the shell, the zone message, the first snapshot
//      holding the hero and the page ring, and only the ring releases it; a
//      direct join opens at the connect; a classic zone releases at its first
//      seated snapshot; strays (a snapshot before the zone, from another zone,
//      without our seat) never advance it; a hand-off is held unshown through
//      its grace, then shown; a zone the shell already shows (THE RETURN in
//      place, THE DRESS BEAT) never covers; end() releases from anywhere
//   B  the wake mints its vessel on a World that stands no town: no zone ever
//      loads, nothing is there to draw, and the vessel it wrote travels
//   C  the wire: the wake's vessel joins a wilds shard under one cover (wake,
//      connect, zone, snapshot, ring, idle); the shell stands no local town
//      (its hero loads no zone; the only zone it holds before the shard's
//      message is the seed's own surface, laid by the runtime); a zone message
//      that lands while the shell rises waits for it; the cover releases only
//      with the hero on streamed ground where the shard has it
//   D  THE RUNTIME SURVIVES POCKETS: a pocket parks the runtime, the shard's
//      surface snapshots never release the pocket's cover, and the climb-out
//      re-seats the SAME runtime (no second boot) with its survey and its page
//      cache, so the ring is ready at once; THE ZONE'S OWN BOUNDS: the pocket's
//      zone message lands bounded (the clamp and the camera hold to it) and the
//      climb-out's boundless again (the camera free-follows)
//   F  THE RETURN in place: the socket dies, the same seat comes back, the
//      shard re-ships the zone and no cover ever rises
//   G  THE SHARD'S OPEN DOORS: a settlement door the shard opened before the join
//      is open in the shell's own walk (the shell builds it shut; applyZone's open
//      flag kept the snapshot's idempotent door sync from ever repainting it)
//   E  THE KEPT MAP: the explored cells persist per account and world, and a
//      fresh login re-claims every one of them; another account, another land
//      or another world re-claims none
// ---------------------------------------------------------------------------

import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport } from '../src/net/ws';
import { WireShell } from '../src/net/shell';
import { CROSSING_CFG, CROSSING_LABELS, ShardCrossing, type CrossingPhase } from '../src/net/crossing';
import {
  WILDS_CLIENT_CFG, wildsMapKey, wildsShellAttach, wildsShellKeep, wildsShellRemember, wildsShellRing,
  wildsShellStream, wildsShellZone,
} from '../src/net/wildsClient';
import { serializeZone, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { CAMERA_MODES, placeCamera } from '../src/render/camera';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { ensureAccountId, makeAccount } from '../src/meta/account';
import { flushCharacterSaves, persistRun } from '../src/meta/character';
import { readTravelingVessel } from '../src/meta/shardVessel';
import { DEFAULT_MODE_ID, mintCharId } from '../src/meta/modes';
import { CLASSES } from '../src/data/classes';
import { MASS_ZONE } from '../src/worldmass/preset';
import { address } from '../src/worldmass/address';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
async function waitMs(cond: () => boolean, ms = 5000): Promise<boolean> {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 5)); }
  return true;
}
const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

// ============================================================ A: the lease (pure) ==
{
  const G = CROSSING_CFG.handoffGraceMs;
  // A server-bound wake: the flush, the connect, the shell, the zone, the hero, the ring.
  const x = new ShardCrossing();
  check('A idle: no cover before any crossing', !x.covered && !x.view(0).covered && !x.view(0).shown);
  x.wake(1000);
  const v0 = x.view(1000);
  check('A wake: the flush is covered and shown at once, descending, in its own words',
    v0.covered && v0.shown && v0.kind === 'entry' && v0.label === CROSSING_LABELS.wake);
  x.connect(1100);
  x.snapshot(MASS_ZONE, true); // a stray: no zone yet
  check('A connect: the wake\'s cover carries on through the connect; a snapshot before the zone never advances it',
    x.phase === 'connect' && x.view(1100).label === CROSSING_LABELS.connect && x.covered);
  x.welcome();
  x.snapshot(MASS_ZONE, true);
  check('A zone: the welcome stands the shell and waits for the shard\'s zone message', x.phase === 'zone' && x.view(1200).label === CROSSING_LABELS.zone);
  x.zoneMsg(MASS_ZONE, true, null, 1300);
  x.snapshot('elsewhere', true); x.snapshot(MASS_ZONE, false);
  check('A snapshot: the zone message names the ground; a snapshot of another zone or without our seat never advances',
    x.phase === 'snapshot' && x.zone === MASS_ZONE && x.covered);
  x.snapshot(MASS_ZONE, true);
  x.ring(false, 5, 9);
  const vr = x.view(1400);
  check('A ring: the hero stands; the cover waits for the page ring, says how many pages remain and measures them',
    x.phase === 'ring' && vr.covered && vr.shown && vr.detail === '5 nearby world pages remaining' && vr.label === CROSSING_LABELS.ring
    && vr.completed === 4 && vr.total === 9);
  x.zoneMsg(MASS_ZONE, true, MASS_ZONE, 1450);
  check('A ring: a dress beat mid-crossing keeps the ring', x.phase === 'ring');
  x.ring(true, 0);
  check('A release: only the published ring releases the wake\'s cover',
    !x.covered && sameList(x.trail, ['wake', 'connect', 'zone', 'snapshot', 'ring', 'idle']), x.trail.join(' > '));
  // A direct join on a classic shard: opened at the connect, released at the first seated snapshot.
  const j = new ShardCrossing();
  j.connect(0); j.welcome(); j.zoneMsg('lastlight', false, null, 10); j.snapshot('lastlight', true);
  check('A join: a direct join opens at the connect and a classic zone releases at its first seated snapshot (no ring)',
    !j.covered && sameList(j.trail, ['connect', 'zone', 'snapshot', 'idle']), j.trail.join(' > '));
  // A hand-off: a pocket and back on a live shell.
  const h = new ShardCrossing();
  h.zoneMsg('cave_a', false, MASS_ZONE, 5000);
  const held = h.view(5000 + G - 1), shown = h.view(5000 + G);
  check('A hand-off: a new zone on a live shell covers, crossing sideways, held unshown through its grace and shown after it',
    h.covered && held.covered && !held.shown && shown.shown && shown.kind === 'travel', `grace ${G} ms`);
  h.snapshot(MASS_ZONE, true);
  check('A hand-off: a snapshot of the zone it left never releases it', h.covered && h.zone === 'cave_a');
  h.snapshot('cave_a', true);
  check('A hand-off: the pocket\'s first seated snapshot releases it (no ring off the surface)', !h.covered);
  h.zoneMsg(MASS_ZONE, true, 'cave_a', 6000); h.snapshot(MASS_ZONE, true);
  check('A hand-off: the climb-out waits for the ring', h.phase === 'ring');
  h.ring(true, 0);
  check('A hand-off: and releases with it', !h.covered);
  // The same zone again: THE RETURN in place and THE DRESS BEAT never cover.
  const r = new ShardCrossing();
  r.zoneMsg(MASS_ZONE, true, MASS_ZONE, 0); r.zoneMsg('cave_b', false, 'cave_b', 0);
  check('A return in place: a zone message naming the zone already shown never covers', !r.covered && r.trail.length === 0);
  const e = new ShardCrossing();
  for (const p of ['wake', 'connect', 'zone', 'snapshot', 'ring'] as CrossingPhase[]) {
    e.end(); e.wake(0);
    if (p !== 'wake') e.connect(0);
    if (p === 'zone' || p === 'snapshot' || p === 'ring') e.welcome();
    if (p === 'snapshot' || p === 'ring') e.zoneMsg(MASS_ZONE, true, null, 0);
    if (p === 'ring') e.snapshot(MASS_ZONE, true);
    const at = e.phase;
    e.end();
    if (at !== p || e.covered) { check(`A end: releases from ${p}`, false, `reached ${at}`); break; }
  }
  check('A end: a cancel, a failure or a leave releases the cover from every phase', !e.covered);
}

// ===================================================================== the rig ==
const restoreRandom = seedGlobalRandom(0xc2055);
const host = new ShardHost({ seed: 0x0c205510, saveDir: null, open: true, worldmass: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const DT = 1 / SHARD_CFG.tickHz;
let nowMs = 1_000_000;
const account = makeAccount();
ensureAccountId(account);
const ACCOUNT = account.accountId;
// G's door: the shard opens a settlement door before anyone joins (a returning hero's world).
const openedDoor = host.world.doodads.find(d => !!d.door?.cells && !d.door.open && !d.door.broken && (d.door.mode === 'dwell' || d.door.mode === 'both'));
if (openedDoor?.door) host.world.setDoorState(openedDoor.door.id, 'open', { silent: true });
const doorCentre = openedDoor?.door?.cells ? { x: openedDoor.door.cells.x + openedDoor.door.cells.w / 2, y: openedDoor.door.cells.y + openedDoor.door.cells.h / 2 } : null;

// ======================================================= B: the wake stands no town ==
const charId = mintCharId();
let vessel: Awaited<ReturnType<typeof readTravelingVessel>> = null;
const crossing = new ShardCrossing();
{
  crossing.wake(nowMs);
  const mint = new World(account, Object.freeze(buildManifest(account, 0x5eed)));
  const loads: string[] = [];
  const load0 = mint.loadZone.bind(mint);
  mint.loadZone = (...a: Parameters<World['loadZone']>) => { loads.push(String(a[0])); return load0(...a); };
  const cls = CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0];
  mint.createPlayer(cls, { modeId: DEFAULT_MODE_ID, charId, name: 'Wayfarer', load: false });
  check('B wake: the vessel\'s World loads no zone and has nothing of a town to draw',
    loads.length === 0 && mint.doodads.length === 0 && mint.structures.length === 0 && mint.actors.length === 1,
    `loads [${loads.join(',')}], doodads ${mint.doodads.length}, actors ${mint.actors.length}`);
  persistRun(account, mint);
  await flushCharacterSaves();
  check('B flush: the cover still stands while the vessel is written', crossing.phase === 'wake' && crossing.view(nowMs).shown);
  vessel = await readTravelingVessel(account, charId);
  check('B vessel: the hero it wrote travels (THE WAKE\'S WORD), its world half dropped',
    !!vessel && vessel.charId === charId && vessel.classId === cls.id && !('world' in vessel));
}

// ============================================================== C: the one crossing ==
const shell = new WireShell();
let world: World | null = null;
let rising = true, held: ZoneMsg | null = null, heldWhileRising = 0, zonesHeard = 0, wildsSeed = 0;
let lastSurface: ZoneMsg | null = null;
const zoneOrder: string[] = [];
/** main.ts clientZone: the shell's zone routing, and the crossing's word on it. */
function clientZone(z: ZoneMsg): void {
  const w = world!, shown = w.appliedZoneId;
  const surface = wildsShellZone(w, z, wildsSeed);
  if (surface) lastSurface = z;
  crossing.zoneMsg(z.zoneId, surface, shown, nowMs);
  zoneOrder.push(crossing.phase);
}
/** main.ts crossingSnapshot. */
function feedSnap(s: StateSnapshot): void {
  if (crossing.covered && world && shell.world === world) crossing.snapshot(s.zoneId, !!s.seats[world.clientSeatId]);
}
const c = new WsTransport();
let lost = 0;
c.onState(s => { shell.arrive(s, nowMs); feedSnap(s); });
c.onZone(z => { zonesHeard++; if (rising) { held = z; heldWhileRising++; } else clientZone(z); });
c.onHostLost(() => { lost++; });
crossing.connect(nowMs);
const hello = await c.connect(url, { name: 'Wayfarer', classId: vessel?.classId ?? 'warrior', accountId: ACCOUNT }, vessel ?? undefined);
crossing.welcome();
// main.ts paints the cover here; the shard's zone message and first snapshots land meanwhile.
for (let i = 0; i < 8; i++) { host.tick(DT); await yieldIO(); await yieldIO(); }
check('C welcome: the wilds shard seats the traveling vessel; every zone message that lands while the shell rises waits for it (the newest applies)',
  hello.worldmass && heldWhileRising >= 1 && zonesHeard === heldWhileRising && held !== null && crossing.phase === 'zone' && host.world.seats.some(s => s.id === hello.self),
  `worldmass ${hello.worldmass}, held ${heldWhileRising}, heard ${zonesHeard}, phase ${crossing.phase}, seated ${host.world.seats.some(s => s.id === hello.self)}`);
// The shell, in startAsClient's order.
const shellAccount = { ...makeAccount(), features: new Set(hello.features) };
world = new World(shellAccount, Object.freeze(buildManifest(shellAccount, hello.seed)));
const W = world;
const loads: { id: string; inMass: boolean; at: number }[] = [];
let inMass = false, boots = 0;
const loadZone0 = W.loadZone.bind(W);
W.loadZone = (...a: Parameters<World['loadZone']>) => { loads.push({ id: String(a[0]), inMass, at: zoneOrder.length }); return loadZone0(...a); };
const start0 = W.startWorldMass.bind(W);
W.startWorldMass = (...a: Parameters<World['startWorldMass']>) => { boots++; inMass = true; try { return start0(...a); } finally { inMass = false; } };
W.clientActionHook = () => { /* intents leave for the shard */ };
W.clientSeatId = hello.self;
W.createPlayer(CLASSES.find(k => k.id === (vessel?.classId ?? 'warrior')) ?? CLASSES[0], { startingCompanions: false, startingFlasks: false, load: false });
const loadsAtHero = loads.length;
wildsSeed = W.manifest.seed;
const tAttach = performance.now();
wildsShellAttach(W, wildsSeed, hello.land);
const attachMs = performance.now() - tAttach;
const zoneBeforeMsg = W.zone.id;
const doorShutBefore = !!doorCentre && !W.walk!.isWalkable(doorCentre.x, doorCentre.y);
const remembered0 = wildsShellRemember(W, ACCOUNT, wildsSeed, hello.land);
rising = false;
if (held) { const z: ZoneMsg = held; held = null; clientZone(z); }
check('G doors: a door the shard opened before the join stands open in the shell\'s walk (the shell built it shut)',
  !!openedDoor && doorShutBefore && W.walk!.isWalkable(doorCentre!.x, doorCentre!.y) && !!W.doodads.find(d => d.door?.id === openedDoor.door!.id)?.door?.open,
  openedDoor?.door ? `${openedDoor.door.id}, shut before the message ${doorShutBefore}` : 'no settlement door');
shell.attach(W);
if (shell.latest) feedSnap(shell.latest);
check('C shell: the hero stands no local town (no zone loads), and before the shard\'s zone message the shell holds only the seed\'s surface',
  loadsAtHero === 0 && zoneBeforeMsg === MASS_ZONE && boots === 1 && loads.every(l => l.inMass),
  `hero loads ${loadsAtHero}, attach loads [${loads.map(l => l.id).join(',')}] inside the runtime's own hearth build, ${attachMs.toFixed(0)} ms`);
check('C shell: a first login re-claims no map', remembered0 === 0);
// The held frames: the shard ticks, the shell places and streams, the ring is read.
let frames = 0;
const maxFrames = 900;
while (crossing.covered && frames < maxFrames) {
  nowMs += 1000 / 60;
  host.tick(DT); await yieldIO(); await yieldIO();
  shell.frame(DT, nowMs);
  wildsShellStream(W, W.player.pos);
  if (crossing.phase === 'ring') { const r = wildsShellRing(W); crossing.ring(r.ready, r.pending, r.total); }
  frames++;
}
const seat = host.world.seats.find(s => s.id === hello.self);
const heroCell = W.massRuntime!.walk.at(W.player.pos.x, W.player.pos.y);
check('C crossing: one cover from the wake to the ring (wake, connect, zone, snapshot, ring, idle)',
  !crossing.covered && sameList(crossing.trail, ['wake', 'connect', 'zone', 'snapshot', 'ring', 'idle']),
  `${crossing.trail.join(' > ')} after ${frames} held frames`);
check('C release: the hero stands on streamed ground where the shard has it',
  wildsShellRing(W).ready && !!W.massRuntime!.stream.page(heroCell) && !!seat
  && Math.hypot(W.player.pos.x - seat.actor.pos.x, W.player.pos.y - seat.actor.pos.y) < 2,
  `${frames} frames, hero ${W.player.pos.x.toFixed(0)},${W.player.pos.y.toFixed(0)} vs the shard's ${seat?.actor.pos.x.toFixed(0)},${seat?.actor.pos.y.toFixed(0)}`);
check('C release: no zone loaded on the shell after the runtime laid the land, through the release',
  loads.every(l => l.inMass) && W.zone.id === MASS_ZONE && W.appliedZoneId === MASS_ZONE);
info(`the ring took ${frames} held frames (coverRing ${WILDS_CLIENT_CFG.coverRing}); the shell's land took ${attachMs.toFixed(0)} ms to lay`);

// ============================================== D: THE RUNTIME SURVIVES POCKETS ==
const claimSet = (w: World): Set<string> => new Set((w.massRuntime ?? null)?.state.snapshot().claims.map(cl => JSON.stringify(cl)) ?? []);
{
  // Walk the survey wider: a few spots near the hearth, the runtime's own beat at each.
  const home = { x: W.player.pos.x, y: W.player.pos.y };
  for (const [dx, dy] of [[0, 0], [600, 0], [600, 600]]) {
    W.player.pos.x = home.x + dx; W.player.pos.y = home.y + dy;
    for (let i = 0; i < WILDS_CLIENT_CFG.surveyEveryFrames; i++) wildsShellStream(W, W.player.pos);
  }
  W.player.pos.x = home.x; W.player.pos.y = home.y;
  for (let i = 0; i < 60 && !wildsShellRing(W).ready; i++) wildsShellStream(W, W.player.pos);
  const rt = W.massRuntime!;
  const before = claimSet(W);
  const homeCell = rt.walk.at(home.x, home.y);
  check('D survey: the shell remembers what the hero saw', before.size > 8, `${before.size} cells`);
  const bootsBefore = boots;
  // A real bounded zone's own message (a classic ground, serialized by the host's serializer),
  // standing in for the pocket a mouth would hand off to.
  const caveAcct = makeAccount();
  const caveWorld = new World(caveAcct, Object.freeze(buildManifest(caveAcct, 0xcafe5)));
  caveWorld.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  const pocket: ZoneMsg = { ...serializeZone(caveWorld), zoneId: 'cave_probe_crossing', name: 'A pocket' };
  const zoneMode = CAMERA_MODES.find(m => m.clampToZone)!;
  const far = { x: 50_000, y: 50_000 }, vw = 800, vh = 600;
  check('D bounds: the shard\'s surface message says boundless, a bounded zone\'s says nothing',
    lastSurface!.arena.boundless === true && pocket.arena.boundless === undefined);
  nowMs += 16;
  clientZone(pocket);
  const v = crossing.view(nowMs);
  check('D pocket: the runtime is parked (off the World, the classic ground paints) and the hand-off holds the frame unshown',
    W.massRuntime === null && crossing.covered && !v.shown && v.kind === 'travel' && crossing.view(nowMs + CROSSING_CFG.handoffGraceMs).shown);
  const pocketCam = placeCamera(zoneMode, far, vw, vh, W.arena);
  check('D bounds: the pocket\'s zone message lands bounded, its own size, and the camera clamps to it',
    W.arena.boundless === false && W.arena.w === pocket.arena.w && W.arena.h === pocket.arena.h
    && pocketCam.x <= W.arena.w - vw + zoneMode.overshoot && pocketCam.y <= W.arena.h - vh + zoneMode.overshoot,
    `arena ${W.arena.w}x${W.arena.h}, camera ${pocketCam.x.toFixed(0)},${pocketCam.y.toFixed(0)} for a focus at ${far.x}`);
  for (let i = 0; i < 6; i++) { nowMs += 1000 / 60; host.tick(DT); await yieldIO(); await yieldIO(); }
  check('D pocket: the shard\'s surface snapshots never release the pocket\'s cover', crossing.covered && crossing.zone === 'cave_probe_crossing');
  crossing.snapshot('cave_probe_crossing', true); // the pocket's first snapshot (the pocket is staged on the shell)
  check('D pocket: its first seated snapshot releases it', !crossing.covered);
  const t0 = performance.now();
  clientZone(lastSurface!);
  const climbMs = performance.now() - t0;
  check('D climb-out: the SAME runtime is re-seated (no second boot), its walk under the World again',
    W.massRuntime === rt && boots === bootsBefore && W.walk === rt.walk && W.zone.id === MASS_ZONE, `${climbMs.toFixed(1)} ms (the boot took ${attachMs.toFixed(0)})`);
  const surfaceCam = placeCamera(zoneMode, far, vw, vh, W.arena);
  check('D bounds: the climb-out\'s zone message lands boundless again and the camera free-follows',
    W.arena.boundless === true && surfaceCam.x === far.x - vw / 2 && surfaceCam.y === far.y - vh / 2);
  const after = claimSet(W);
  check('D climb-out: the survey survives the pocket whole', [...before].every(k => after.has(k)) && after.size >= before.size, `${before.size} before, ${after.size} after`);
  check('D climb-out: the page cache survives (the hearth\'s page is resident at once)', !!rt.stream.page(homeCell));
  let held2 = 0;
  while (crossing.covered && held2 < 120) {
    nowMs += 1000 / 60; host.tick(DT); await yieldIO(); await yieldIO();
    shell.frame(DT, nowMs); wildsShellStream(W, W.player.pos);
    if (crossing.phase === 'ring') { const r = wildsShellRing(W); crossing.ring(r.ready, r.pending, r.total); }
    held2++;
  }
  check('D climb-out: the hand-off back releases as soon as its snapshot lands (the ring was cached)',
    !crossing.covered && held2 <= 6 && sameList(crossing.trail.slice(-3), ['snapshot', 'ring', 'idle']),
    `${held2} frames, ${crossing.trail.slice(-3).join(' > ')}`);
}

// ============================================================ F: THE RETURN in place ==
{
  // A willed step ends THE SPAWN GRACE, so the lost socket leaves the seat DORMANT.
  for (let i = 1; i <= 4; i++) {
    c.sendInput(hello.self, { dx: 0, dy: 1, aim: { x: W.player.pos.x, y: W.player.pos.y + 50 }, held: [], edge: [], seq: i, dt: DT });
    nowMs += 1000 / 60; await yieldIO(); host.tick(DT); await yieldIO();
  }
  const conns = (host.net as unknown as { bySeat: Map<string, { sock: { destroy(): void } }> }).bySeat;
  const lost0 = lost, zones0 = zonesHeard;
  conns.get(hello.self)?.sock.destroy();
  await waitMs(() => lost > lost0 && host.net.isDormant(hello.self));
  let coveredEver = false;
  const r = await c.resumeInPlace();
  if (r.ok) shell.resumed(nowMs);
  for (let i = 0; i < 30; i++) {
    nowMs += 1000 / 60; host.tick(DT); await yieldIO(); await yieldIO();
    coveredEver ||= crossing.covered;
    shell.frame(DT, nowMs); wildsShellStream(W, W.player.pos);
  }
  check('F return: the same seat comes back in place, the shard re-ships its zone, and no cover ever rises',
    r.ok && zonesHeard > zones0 && !coveredEver && !host.net.isDormant(hello.self), r.ok ? `${zonesHeard - zones0} zone message(s) after the return` : `refused: ${r.word}`);
}

// ================================================================== E: THE KEPT MAP ==
{
  const ok = wildsShellKeep(W);
  const raw = (globalThis as { localStorage?: Storage }).localStorage?.getItem(wildsMapKey(ACCOUNT, wildsSeed)) ?? '';
  const mine = claimSet(W);
  check('E keep: the explored cells are written under this account and world, packed small',
    ok && raw.length > 0 && raw.length < mine.size * 40, `${mine.size} cells in ${raw.length} bytes`);
  c.leave();
  for (let i = 0; i < 20; i++) { host.tick(DT); await yieldIO(); }
  // The next login: a fresh shell on the same seed.
  const acct2 = { ...makeAccount(), features: new Set(hello.features) };
  const W2 = new World(acct2, Object.freeze(buildManifest(acct2, hello.seed)));
  W2.clientActionHook = () => { /* a shell */ };
  W2.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false, load: false });
  wildsShellAttach(W2, wildsSeed, hello.land);
  const fresh = claimSet(W2);
  const stranger = wildsShellRemember(W2, 'ffffffffffffffffffffffffffffffff', wildsSeed, hello.land);
  const otherLand = wildsShellRemember(W2, ACCOUNT, wildsSeed, 'another-land');
  const otherWorld = wildsShellRemember(W2, ACCOUNT, wildsSeed ^ 1, hello.land);
  check('E login: another account, another land or another world re-claims nothing', stranger === 0 && otherLand === 0 && otherWorld === 0 && claimSet(W2).size === fresh.size);
  const back = wildsShellRemember(W2, ACCOUNT, wildsSeed, hello.land);
  const theirs = claimSet(W2);
  check('E login: this account\'s next login re-claims every explored cell into the runtime\'s claims',
    back > 0 && [...mine].every(k => theirs.has(k)), `${back} re-claimed, ${mine.size} kept`);
  // The map's own read (cartography asks survey.known): every kept cell's centre reads known.
  const rt2 = W2.massRuntime!, spec = rt2.survey.spec!, span = rt2.config.terrain.addressSpan;
  const centres = [...mine].map(k => JSON.parse(k) as [string, string]).map(([, id]) => {
    const [page, x, y] = JSON.parse(id) as [string, number, number];
    const [dim, cx, cy] = JSON.parse(page) as [string, string, string];
    return address(dim, cx, cy, x * spec.cell + spec.cell / 2, y * spec.cell + spec.cell / 2, span);
  });
  check('E login: the map reads every kept cell as known (the survey\'s own read)',
    centres.length > 0 && centres.every(at => rt2.survey.known(at)), `${centres.length} cells`);
  W2.massRuntime?.dispose();
}

// =================================================================== the end ==
W.massRuntime?.dispose();
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 500));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
