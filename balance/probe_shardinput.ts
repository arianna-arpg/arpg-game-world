// THE HONEST INPUT (docs/engine/shard.md "The pieces"; the shard sync pass A, items 1, 18,
// 12 and 16): a wire client's frames walk on the host at the dt each was polled for, every
// frame a tick gathered, under THE TIME BUDGET; a press whose down and up land in one tick
// still casts; the own seat's walk fold rides its row so the client predicts at the host's
// pace; and an input with no dt walks exactly as before. The rig boots a classic shard (the
// open account, ephemeral), seats clients over the real WebSocket, moves the party onto a
// flat probe floor and pins:
//   A  cadence: 30, 60 and 144 fps clients walk on the host what their own replay
//      predicts, at every ack and at the end
//   B  the batch: three frames bunched into one tick lose nothing; the wire clamps a frame's
//      dt, never carries a batch, and a flood folds to at most maxBatch moves
//   C  the stall: twelve withheld frames sent at once walk in full and the ack covers them
//   D  THE TIME BUDGET: a 2x speed hack stops at the clock plus the grace, an honest 144 fps
//      client is never refused, standing still banks at most bankSec, and a host stall's
//      dropped seconds are credited before its catch-up (the budget runs on the wall);
//      a step anywhere in a batch ends THE SPAWN GRACE
//   E  THE QUICK TAP: a tap whose down and up land in one tick casts its non-toggle skill once
//   F  the walk fold: the own row ships spd (a chill moves it) and trc, and the client's
//      replay walks the chilled pace the host walks
//   G  THE SOLO INVARIANT: a local seat's input with no dt walks the tick's dt as before
//   H  the own feet: a predicting shell's hero wears its own gait (one stride per frame)
//      and faces the aim it sends
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { WsTransport } from '../src/net/ws';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { CLASSES } from '../src/data/classes';
import { World, type Seat } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { bodyWalkPoseOf } from '../src/engine/bodyWalk';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { applySnapshot, applyZone, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { HONEST_INPUT_CFG, mergeInputs, type PlayerInput } from '../src/net/intent';
import { sanitizeInput } from '../server/shardTransport';
import { faceOwnAim, replayOwnFrames, type PredictFrame } from '../src/net/predict';
import { setSimTap } from '../src/engine/tap';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' (' + detail + ')' : ''}`);
  if (!ok) failed++;
};
const DT = 1 / SHARD_CFG.tickHz;
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
type Vec = { x: number; y: number };
const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
const here = (a: Actor): Vec => ({ x: a.pos.x, y: a.pos.y });
const sumDt = (fs: readonly PredictFrame[]): number => fs.reduce((n, f) => n + f.dt, 0);

// THE FLOOR: a flat, empty, quiet zone (the sim arena's shape, larger). No road, wind, snow
// or wall bends a stride, so the host walks exactly the fold times the seconds it granted.
const FLOOR = 'probe_shardinput_floor';
ZONES[FLOOR] = {
  id: FLOOR, name: 'The Honest Floor', level: 1, size: { w: 3200, h: 2400 },
  theme: { floor: '#101010', grid: '#181818', border: '#3a3a3a', obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888' },
  seed: 0x51713a, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9100, y: 9100 },
} as ZoneDef;
const MID: Vec = { x: 1600, y: 1200 };

const restoreRandom = seedGlobalRandom(0x1a9c7);
const host = new ShardHost({ seed: 0x51a1d0, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

/** A client over the real wire: its seat, its seq, the newest snapshot and zone it heard,
 *  and (while recording) every snapshot of a run. */
interface Cl { c: WsTransport; id: string; seq: number; latest: StateSnapshot | null; zone: ZoneMsg | null; tape: StateSnapshot[] | null }
async function join(name: string): Promise<Cl> {
  const cl: Cl = { c: new WsTransport(), id: '', seq: 0, latest: null, zone: null, tape: null };
  cl.c.onState(s => { cl.latest = s; cl.tape?.push(s); });
  cl.c.onZone(z => { cl.zone = z; });
  cl.id = (await cl.c.connect(url, { name, classId: 'warrior' })).self;
  for (let i = 0; i < 200 && !seatOf(cl.id); i++) { host.tick(DT); await yieldIO(); }
  return cl;
}
async function tick(n = 1): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
/** The seat's pending input on the host (the transport folds a tick's frames into one). */
const pendingOf = (id: string): PlayerInput | undefined => (host.net as unknown as { pending: Map<string, PlayerInput> }).pending.get(id);
let lost = 0; // frames that never reached the host before their tick (a rig fault; F checks it)
/** Wait, never ticking, until the host holds every frame this client sent. */
async function landed(cl: Cl): Promise<boolean> {
  for (let i = 0; i < 4000; i++) {
    if (pendingOf(cl.id)?.seq === cl.seq) return true;
    if (i < 64) await yieldIO(); else await sleep(1);
  }
  lost++;
  return false;
}
/** One client frame: its axes, the dt it claims (main.ts stamps its own frame's), its seq. */
function frame(cl: Cl, dx: number, dy: number, dt: number, extra: Partial<PlayerInput> = {}): PredictFrame {
  const a = seatOf(cl.id)!.actor, seq = ++cl.seq;
  cl.c.sendInput(cl.id, { dx, dy, aim: { x: a.pos.x + 120, y: a.pos.y + 40 }, held: [], edge: [], seq, dt, ...extra });
  return { seq, dx, dy, dt };
}
/** A client at `fps` for `ticks` host ticks: before each tick it sends the frames it made
 *  since the last (a frame is due once its moment passed), they land, then the host ticks. */
async function walk(cl: Cl, fps: number, ticks: number, claim = 1 / fps): Promise<PredictFrame[]> {
  const out: PredictFrame[] = [];
  for (let k = 1; k <= ticks; k++) {
    const due = Math.floor(k * fps / SHARD_CFG.tickHz + 1e-9), before = out.length;
    while (out.length < due) out.push(frame(cl, 1, 0, claim));
    if (out.length > before) await landed(cl);
    await tick();
  }
  return out;
}
/** Stand a seat's hero still at `at` (host side) and park every other hero far from it. */
function stage(cl: Cl, at: Vec): Actor {
  let park = 0;
  for (const s of w.seats) {
    if (s.keeper) continue;
    const p = s.id === cl.id ? at : { x: 260, y: 260 + 160 * park++ };
    s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.vel.x = 0; s.actor.vel.y = 0;
  }
  return seatOf(cl.id)!.actor;
}
/** A render shell as main.ts startAsClient stands one (clientActionHook marks it predicting). */
function shellFor(cl: Cl, predicting = true): World {
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  if (predicting) shell.clientActionHook = () => { /* a rig shell's intents ride nowhere */ };
  shell.clientSeatId = cl.id;
  shell.createPlayer(CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], { startingCompanions: false, startingFlasks: false });
  if (cl.zone) applyZone(shell, cl.zone);
  return shell;
}
/** The client's own replay (net/predict.ts) from `from` over a snapshot's walk fold: where
 *  the hero stands after each frame, by seq. */
function replay(shell: World, snap: StateSnapshot, from: Vec, frames: readonly PredictFrame[]): Map<number, Vec> {
  applySnapshot(shell, snap);
  const hero = shell.player;
  hero.pos.x = from.x; hero.pos.y = from.y; hero.vel.x = 0; hero.vel.y = 0;
  const at = new Map<number, Vec>();
  let stamped = 0;
  for (const f of frames) { stamped = replayOwnFrames(shell, hero, [f], stamped); at.set(f.seq, here(hero)); }
  return at;
}

// ================================================================ setup: the floor ==
const P1 = await join('Cadence');
w.loadZone(FLOOR);
for (let i = 0; i < 200 && P1.zone?.zoneId !== FLOOR; i++) await tick();
check('setup: the party stands on the flat probe floor with no foe on it', w.zone.id === FLOOR && P1.zone?.zoneId === FLOOR
  && !w.actors.some(a => a.team === 'enemy' && !a.dead), `zone ${w.zone.id}, shell zone ${P1.zone?.zoneId}`);
const shell1 = shellFor(P1);

// =================================================================== A: cadence ==
for (const fps of [30, 60, 144]) {
  const hero = stage(P1, MID);
  await tick(3);
  const from = here(hero);
  P1.tape = [];
  const frames = await walk(P1, fps, 120);
  await tick(3); await sleep(20);
  const tape = P1.tape; P1.tape = null;
  const at = replay(shell1, P1.latest!, from, frames);
  const predicted = at.get(frames[frames.length - 1].seq)!, end = here(hero);
  let worst = 0, acks = 0;
  const folds = new Set<number>();
  for (const s of tape) {
    const r = s.seats[P1.id], p = r?.seq !== undefined ? at.get(r.seq) : undefined;
    if (r?.spd !== undefined) folds.add(r.spd);
    if (!r || !p) continue;
    acks++; worst = Math.max(worst, Math.hypot(r.pos[0] - p.x, r.pos[1] - p.y));
  }
  check(`A ${fps} fps: the host walks what the client's own replay predicts (within 1 px)`, dist(end, predicted) <= 1 && dist(end, from) > 100 && folds.size === 1,
    `host ${dist(end, from).toFixed(2)} px, replay ${dist(predicted, from).toFixed(2)} px over ${sumDt(frames).toFixed(3)} s at ${[...folds].join('/')} px/s`);
  check(`A ${fps} fps: every ack lands where the replay stood (no snap-back)`, acks >= 30 && worst <= 1, `${acks} acks, worst ${worst.toFixed(3)} px`);
}

// ================================================================== B: the batch ==
{
  const hero = stage(P1, MID);
  await tick(3);
  const from = here(hero);
  const frames = [frame(P1, 1, 0, 1 / 60), frame(P1, 0, -1, 1 / 90), frame(P1, 1, 1, 1 / 45)];
  await landed(P1);
  const batch = pendingOf(P1.id)?.moves?.length ?? 0;
  await tick();
  const sum = replay(shell1, P1.latest!, from, frames).get(frames[2].seq)!;
  check('B batch: three frames in one tick reach the host as one input carrying three moves', batch === 3, `${batch} moves`);
  check('B batch: the host walks the sum of the three moves (nothing lost)', dist(here(hero), sum) <= 0.01 && dist(sum, from) > 5,
    `host (${(hero.pos.x - from.x).toFixed(2)}, ${(hero.pos.y - from.y).toFixed(2)}), sum (${(sum.x - from.x).toFixed(2)}, ${(sum.y - from.y).toFixed(2)})`);
  // The wire's own law: a frame claims at most the client's clamp, a batch is never taken
  // from the wire (only the fold builds one), and a flood past maxBatch is never walked.
  const raw = (dt: unknown): unknown => ({ dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [], dt });
  check('B wire: the sanitizer clamps a frame\'s dt to the client\'s clamp and drops a bad one',
    sanitizeInput(raw(9))?.dt === HONEST_INPUT_CFG.maxMoveDt && sanitizeInput(raw(-1))?.dt === 0 && sanitizeInput(raw(NaN))?.dt === undefined && sanitizeInput(raw('x'))?.dt === undefined);
  const forged = mergeInputs(undefined, { dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [], dt: 0.01, moves: [[1, 0, 9], [1, 0, 9]] });
  let flood: PlayerInput | undefined;
  for (let i = 0; i < HONEST_INPUT_CFG.maxBatch + 40; i++) flood = mergeInputs(flood, { dx: 1, dy: 0, aim: { x: 0, y: 0 }, held: [], edge: [], dt: 0.01, seq: i + 1 });
  check('B wire: a batch never rides the wire, and a flood folds to at most maxBatch moves (the ack still covers it)',
    forged.moves === undefined && forged.dt === 0.01 && flood?.moves?.length === HONEST_INPUT_CFG.maxBatch && flood.seq === HONEST_INPUT_CFG.maxBatch + 40);
}

// ================================================================== C: the stall ==
{
  const hero = stage(P1, MID);
  await tick(3);
  const from = here(hero);
  const lead = await walk(P1, 60, 30); // walking: the budget in its steady state
  const mid = here(hero);
  await tick(12); // THE STALL: the link holds the client's frames; the host's ticks find nothing
  const stalled = here(hero);
  const held: PredictFrame[] = [];
  for (let k = 0; k < 12; k++) held.push(frame(P1, 1, 0, 1 / 60)); // the twelve frames, at once
  await landed(P1);
  await tick(); // the catch-up
  const caught = here(hero);
  await tick(3); await sleep(20);
  const at = replay(shell1, P1.latest!, from, [...lead, ...held]);
  check('C stall: the host stood still while the link held the frames', dist(stalled, mid) < 1e-9);
  check('C stall: twelve withheld frames sent at once walk in full on the catch-up', dist(caught, at.get(held[11].seq)!) <= 0.01 && dist(caught, stalled) > 20,
    `caught up ${dist(caught, stalled).toFixed(2)} px, the frames ${dist(at.get(held[11].seq)!, at.get(lead[29].seq)!).toFixed(2)} px`);
  check('C stall: the ack covers them all', P1.latest?.seats[P1.id]?.seq === held[11].seq, `ack ${P1.latest?.seats[P1.id]?.seq}, last ${held[11].seq}`);
  check('C stall: an honest client was never refused (A to C)', w.moveBudget.get(P1.id)?.refused === 0, `refused ${w.moveBudget.get(P1.id)?.refused}`);
}

// ============================================================= E: THE QUICK TAP ==
{
  const hero = stage(P1, MID);
  await tick(45); // any swing and lock long settled
  const inst = hero.skills[0];
  const toggle = !inst || (inst.def.delivery.type === 'aura' && inst.def.delivery.mode === 'toggle');
  let casts = 0;
  setSimTap({ onCast: (caster, used, repeat) => { if (caster === hero && used === inst && !repeat) casts++; } });
  // a: one frame whose button went down and came back up inside the client's own frame
  frame(P1, 0, 0, 1 / 60, { held: [false], edge: [true] });
  await landed(P1); await tick(60);
  const lone = casts;
  // b: two frames in one tick, the press then the release
  casts = 0;
  frame(P1, 0, 0, 1 / 60, { held: [true], edge: [true] });
  frame(P1, 0, 0, 1 / 60, { held: [false], edge: [false] });
  await landed(P1); await tick(60);
  const pair = casts;
  setSimTap(null);
  check('E tap: slot 0 holds a non-toggle skill', !toggle, inst?.def.id ?? 'empty');
  check('E tap: a press whose down and up land inside one frame casts once', lone === 1, `${lone} casts`);
  check('E tap: a press and its release landing in one tick cast once', pair === 1, `${pair} casts`);
}

// ============================================================== F: the walk fold ==
{
  const hero = stage(P1, MID);
  await tick(3); await sleep(20);
  const plain = P1.latest?.seats[P1.id]?.spd, hostPlain = hero.walkSpeed();
  hero.applyStatus('chill', 0, 1, 'probe');
  await tick(3); await sleep(20);
  const chilledSnap = P1.latest!, row = chilledSnap.seats[P1.id], hostChilled = hero.walkSpeed();
  check('F fold: the own row ships the walk speed the host walks', plain !== undefined && Math.abs(plain - hostPlain) <= 0.001, `row ${plain}, host ${hostPlain}`);
  check('F fold: a chill moves the row with the host', row?.spd !== undefined && hostChilled < hostPlain - 1 && Math.abs(row.spd - hostChilled) <= 0.001,
    `row ${row?.spd}, host ${hostChilled.toFixed(3)} (unchilled ${hostPlain})`);
  const from = here(hero);
  const frames = await walk(P1, 60, 30);
  const at = replay(shell1, chilledSnap, from, frames);
  const naive = shell1.player.sheet.get('moveSpeed');
  check('F fold: the shell wears the row (World.ownWalk); its own sheet never saw the chill', shell1.ownWalk?.spd === row?.spd && naive > hostChilled + 1,
    `ownWalk ${shell1.ownWalk?.spd}, the shell's sheet ${naive}`);
  check('F fold: chilled, the host walks what the client predicts (no 20 Hz sawtooth)', dist(here(hero), at.get(frames[29].seq)!) <= 1 && dist(here(hero), from) > 20,
    `host ${dist(here(hero), from).toFixed(2)} px, replay ${dist(at.get(frames[29].seq)!, from).toFixed(2)} px`);
  hero.applyStatus('slippery', 0, 1, 'probe');
  await tick(3); await sleep(20);
  const slick = P1.latest!.seats[P1.id];
  applySnapshot(shell1, P1.latest!);
  check('F traction: the row ships the traction the host reads, and the shell wears it', slick?.trc !== undefined && slick.slippery === true
    && Math.abs(slick.trc - hero.walkTraction()) <= 0.001 && shell1.ownWalk?.trc === slick.trc, `trc ${slick?.trc}, host ${hero.walkTraction()}`);
  check('F rig: every frame landed before its tick', lost === 0, `${lost} late`);
}

// ========================================================== D: THE TIME BUDGET ==
const P2 = await join('Hasty'); // a speed hack: every frame claims twice the clock
const P3 = await join('Honest'); // an honest 144 fps client from its very first frame
{
  const hero = stage(P2, MID);
  await tick(3);
  const from = here(hero), fold = hero.walkSpeed();
  const frames = await walk(P2, 60, 120, 2 / 60);
  const claimed = sumDt(frames), granted = 120 * DT + HONEST_INPUT_CFG.graceSec, walked = dist(here(hero), from) / fold;
  check('D budget: a 2x speed hack walks the clock plus the grace, never its claim', Math.abs(walked - granted) * fold <= 1,
    `claimed ${claimed.toFixed(3)} s, walked ${walked.toFixed(3)} s, the clock + grace ${granted.toFixed(3)} s`);
  check('D budget: the refused seconds are counted on the ledger', Math.abs((w.moveBudget.get(P2.id)?.refused ?? 0) - (claimed - granted)) < 1e-6,
    `refused ${w.moveBudget.get(P2.id)?.refused?.toFixed(4)}`);
}
{
  const hero = stage(P3, MID);
  await tick(3);
  const from = here(hero), fold = hero.walkSpeed();
  const frames = await walk(P3, 144, 120);
  const walked = dist(here(hero), from);
  check('D budget: an honest 144 fps client is never refused, from its first frame', w.moveBudget.get(P3.id)?.refused === 0 && Math.abs(walked - fold * sumDt(frames)) <= 1,
    `walked ${walked.toFixed(2)} px of ${(fold * sumDt(frames)).toFixed(2)}`);
  // THE TIME BUDGET runs on the wall: the HOST stalls 400 ms; the client kept walking through it.
  const from2 = here(hero), through: PredictFrame[] = [];
  for (let i = 0; i < 58; i++) through.push(frame(P3, 1, 0, 1 / 144));
  await landed(P3);
  const pump = host as unknown as { lastWall: number; accum: number; pump(): void };
  const dropped0 = host.droppedTicks;
  pump.accum = 0; pump.lastWall = performance.now() - 400;
  pump.pump();
  const want = fold * sumDt(through), got = dist(here(hero), from2);
  check('D wall: a host stall credits its dropped seconds first, so frames sent through it walk in full',
    host.droppedTicks > dropped0 && Math.abs(got - want) <= 1 && w.moveBudget.get(P3.id)?.refused === 0,
    `dropped ${host.droppedTicks - dropped0} ticks, walked ${got.toFixed(2)} px of ${want.toFixed(2)}, refused ${w.moveBudget.get(P3.id)?.refused}`);
}
{
  const hero = stage(P2, MID);
  await tick(90); // the hack stands still 1.5 s: its spent budget refills, capped at the bank
  const from = here(hero), fold = hero.walkSpeed();
  for (let i = 0; i < 60; i++) frame(P2, 1, 0, 1 / 60); // a second of frames at once
  await landed(P2); await tick();
  const walked = dist(here(hero), from) / fold;
  check('D bank: standing still banks at most bankSec', Math.abs(walked - HONEST_INPUT_CFG.bankSec) * fold <= 1,
    `walked ${walked.toFixed(3)} s of a 1 s burst (bank ${HONEST_INPUT_CFG.bankSec} s)`);
}
{
  // THE SPAWN GRACE ends at the first willed input: a step anywhere in the tick's batch is one,
  // even when the batch's last frame stands still.
  const P4 = await join('Shy');
  const before = seatOf(P4.id)!.actor.untargetable;
  frame(P4, 1, 0, 1 / 60); frame(P4, 0, 0, 1 / 60);
  await landed(P4); await tick();
  check('D grace: a step anywhere in the batch ends THE SPAWN GRACE', before && seatOf(P4.id)?.actor.untargetable === false);
  P4.c.leave();
}

// ================================================================ H: the own feet ==
{
  stage(P1, MID);
  await tick(3); await sleep(20);
  const snap = JSON.parse(JSON.stringify(P1.latest)) as StateSnapshot;
  const pose = { travel: 3.25, direction: 0.5, weight: 1 };
  const own = snap.actors.find(a => a.seat === P1.id), other = snap.actors.find(a => a.seat === P2.id);
  if (own) own.bodyWalkPose = { ...pose };
  if (other) other.bodyWalkPose = { ...pose, travel: 7.5 };
  applySnapshot(shell1, snap);
  const otherBody = shell1.actors.find(a => a.name === 'Hasty');
  check('H gait: a predicting shell leaves its own hero\'s pose to the local walk cycle, and mirrors every other body\'s',
    !!own && !!other && shell1.player.bodyWalkPose === undefined && otherBody?.bodyWalkPose?.travel === 7.5,
    `own ${JSON.stringify(shell1.player.bodyWalkPose)}, other ${JSON.stringify(otherBody?.bodyWalkPose)}`);
  const mirror = shellFor(P1, false);
  applySnapshot(mirror, snap);
  check('H gait: a world that does not predict (no clientActionHook) still mirrors its own hero\'s pose', mirror.player.bodyWalkPose?.travel === 3.25);
  // One stride per frame: three client frames replay one, two, then three unacked moves from the anchor.
  applySnapshot(shell1, snap);
  shell1.ownWalk = { spd: 180, trc: 1 };
  const hero = shell1.player, anchor = here(hero);
  hero.bodyWalk = undefined;
  const moves: PredictFrame[] = [1, 2, 3].map(i => ({ seq: 900 + i, dx: 1, dy: 0, dt: 1 / 60 }));
  let stamped = 0, naive = 0;
  for (let n = 1; n <= 3; n++) {
    hero.pos.x = anchor.x; hero.pos.y = anchor.y;
    stamped = replayOwnFrames(shell1, hero, moves.slice(0, n), stamped);
    naive += n;
  }
  const strides = (hero.pos.x - anchor.x) / hero.radius;
  const travel = ((a: Actor): number => a.bodyWalk?.travel ?? 0)(hero); // read past the reset above (no stale narrowing)
  check('H gait: the replay counts each frame\'s stride once, however often it re-walks it', Math.abs(travel - strides) < 1e-9 && stamped === 903,
    `travel ${travel.toFixed(4)}, walked ${strides.toFixed(4)} strides (a naive replay would count ${naive} frames' worth)`);
  check('H gait: the local walk cycle drives the feet', !!bodyWalkPoseOf(hero, shell1.time));
  // Facing: the hero turns to the aim it sends, unless a cast or a lock holds it.
  hero.casting = null;
  faceOwnAim(hero, { x: hero.pos.x, y: hero.pos.y - 100 }, false);
  const north = hero.facing;
  faceOwnAim(hero, { x: hero.pos.x + 100, y: hero.pos.y }, true);
  const locked = hero.facing;
  check('H facing: the hero faces the aim it sends; a lock (rooted) holds it', Math.abs(north + Math.PI / 2) < 1e-9 && locked === north, `${north.toFixed(3)} / ${locked.toFixed(3)}`);
}

// ======================================================== G: THE SOLO INVARIANT ==
{
  const acct = makeAccount();
  const solo = new World(acct, Object.freeze(buildManifest(acct, 0x5010)));
  solo.createPlayer(CLASSES.find(c => c.id === 'warrior') ?? CLASSES[0], { startingCompanions: false, startingFlasks: false });
  solo.loadZone(FLOOR);
  const hero = solo.player, id = solo.localSeat.id;
  const speed = hero.sheet.get('moveSpeed'), ticks = 60;
  const run = (dt?: number): number => {
    hero.pos.x = MID.x; hero.pos.y = MID.y; hero.vel.x = 0; hero.vel.y = 0;
    for (let i = 0; i < ticks; i++) {
      const inp: PlayerInput = { dx: 1, dy: 0, aim: { x: hero.pos.x + 100, y: hero.pos.y }, held: [], edge: [] };
      if (dt !== undefined) inp.dt = dt;
      solo.applyInputs(new Map([[id, inp]]), DT);
    }
    return hero.pos.x - MID.x;
  };
  const legacy = run(), expected = speed * ticks * DT, ledgers = solo.moveBudget.size;
  check('G solo: an input with no dt walks the tick\'s dt exactly as before, and opens no budget', Math.abs(legacy - expected) < 1e-6 && ledgers === 0,
    `${legacy.toFixed(6)} px, expected ${expected.toFixed(6)} (${speed} px/s x ${ticks} ticks of ${DT.toFixed(5)} s)`);
  const honest = run(DT);
  check('G solo: a frame carrying the tick\'s own dt walks the same ground', Math.abs(honest - expected) < 1e-6, `${honest.toFixed(6)} px`);
}

for (const cl of [P1, P2, P3]) cl.c.leave();
for (let i = 0; i < 120 && w.seats.some(s => !s.keeper); i++) await tick();
await host.stop();
restoreRandom();
// Let in-flight socket closes settle before the process ends (the probes' Windows libuv settle).
await sleep(600);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
