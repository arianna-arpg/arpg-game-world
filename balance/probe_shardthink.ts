// ---------------------------------------------------------------------------
// probe_shardthink — THE THINKING EDGE (docs/design/performance-lane.md §3 W0;
// server/thinkingEdge.ts): an idle body far from every player thinks only on
// the wire's beat ticks, with every second it skipped, and nothing else
// changes. Boots a real classic ShardHost, joins one client, ticks the host:
//   A  THE LAW: a far idle body banks dt on the two off-beat ticks and pays it
//      on the beat — its wander clock (aiTimer, a dt-fed clock) falls by
//      exactly three ticks on the beat and not at all between
//   B  NEVER EDGED: a seat's minion, an engaged, alerted or struck body, a held
//      one (a fuse) and an idle body inside nearPx think every tick (no bank)
//   C  THE ROUSE: a body struck mid-beat thinks at once, its bank paid
//   D  THE SOLO INVARIANT: solo play (main.ts) and the balance harness
//      (sim/runner.ts) call updateAI themselves and never import the edge
//   E  THE WALK: twenty-four far wanderers over fifteen seconds (same seed, two
//      boots, the edge off and on): THE STROLL'S REACH — over the bodies that
//      walk at all in both arms, the distance covered per tick of held wander
//      direction is the same within 10% — while the AI loop with the edge on
//      walks far fewer bodies off the beat. The RAW mean distance a second is
//      printed, never asserted: a wanderer's legs are random draws (a 35% dead
//      stop and a 1.5-4.5 s clock at each expiry) off the GLOBAL stream, and
//      the edge changes the order every body draws in, so the two arms are two
//      realizations of that process (measured 7.16 against 4.98 px/s with nine
//      of the ring's twenty-four bodies ever moving, the rest minted against
//      solids), not two measurements of the edge. THE PINNED CLOCK makes the
//      course a pure function of the seed (a third boot of the off arm walks
//      the identical distance): performance.now is a monotone counter for every
//      arm, because the mass runtime's preparation, intel and cold slices and
//      the forechart's beat break on the wall clock (2 ms, FORECHART_CFG.
//      beatBudgetMs) and under machine load two boots of one seed did
//      different work per tick (5.58 against 7.13 px/s once under a parallel
//      probe lane). THE STEP RESIDUAL (open, performance-lane.md §7.6): a
//      three-tick stroll step covers about 7% less than three one-tick steps
//      on solid ground (1.22 px a beat against 3 × 0.439) — the law's band
//      holds it, the cause is a card.
//   F  THE SWITCH: with the edge off, every body thinks every tick
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { THINKING_EDGE_CFG, edgeContext, isEdged, owedDt } from '../server/thinkingEdge';
import { CENSUS_CFG } from '../server/distanceCensus';
import { WsTransport } from '../src/net/ws';
import { seedGlobalRandom } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const DT = 1 / SHARD_CFG.tickHz;
const BEAT = Math.max(1, Math.round(SHARD_CFG.tickHz / SHARD_CFG.stateHz));
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

interface Rig { host: ShardHost; client: WsTransport; seat: Actor; restore: () => void }
async function boot(seed: number): Promise<Rig> {
  const restore = seedGlobalRandom(0x7e11);
  const host = new ShardHost({ seed, saveDir: null, open: true, log: () => { /* quiet */ } });
  const port = await host.listen(0, '127.0.0.1');
  const client = new WsTransport();
  await client.connect(`ws://127.0.0.1:${port}`, { name: 'Think', classId: 'warrior' });
  for (let i = 0; i < 6; i++) { host.tick(DT); await yieldIO(); }
  const seat = host.units.allSeats()[0].actor;
  return { host, client, seat, restore };
}
async function down(r: Rig): Promise<void> { r.client.leave(); await sleep(30); await r.host.stop({ persist: false }); r.restore(); }
const mint = (r: Rig, dx: number, dy: number): Actor => {
  const w = r.host.world;
  const m = w.createMonster('zombie', 1, 'enemy');
  m.pos.x = r.seat.pos.x + dx; m.pos.y = r.seat.pos.y + dy;
  if (!w.actors.includes(m)) w.actors.push(m);
  return m;
};
/** Tick until the tick just stepped was a beat (the next one is off-beat). */
const toBeat = (r: Rig): void => { while (r.host.ticks % BEAT !== 0) r.host.tick(DT); };
const isBeatNext = (r: Rig): boolean => (r.host.ticks + 1) % BEAT === 0;

// ================================================== A: the law, B, C, F ==
{
  const r = await boot(0x00c0ffee);
  const w = r.host.world;
  const far = mint(r, 2000, 0);
  toBeat(r);
  check('A law: a far idle body is edged by the census and the edge agrees', isEdged(far, w, edgeContext(w)) && owedDt(far) === 0);
  // Walk to a beat where the body's wander clock stands clear of its expiry.
  let guard = 0;
  while ((far.aiTimer <= 4 * DT || !Number.isFinite(far.aiTimer)) && guard++ < 600) { r.host.tick(DT); if (r.host.ticks % BEAT === 0 && far.aiTimer > 4 * DT) break; }
  toBeat(r);
  const t0 = far.aiTimer;
  r.host.tick(DT); // off-beat 1
  check('A law: the first off-beat tick banks one dt and the body does not think', near(owedDt(far), DT) && near(far.aiTimer, t0), `owed ${owedDt(far)} timer ${far.aiTimer} vs ${t0}`);
  r.host.tick(DT); // off-beat 2
  check('A law: the second off-beat tick banks two dt', near(owedDt(far), 2 * DT) && near(far.aiTimer, t0), `owed ${owedDt(far)}`);
  check('A law: the next tick is the beat', isBeatNext(r));
  r.host.tick(DT); // the beat
  check('A law: the beat pays the bank: the wander clock falls by exactly three ticks', owedDt(far) === 0 && near(far.aiTimer, t0 - 3 * DT, 1e-9), `timer ${far.aiTimer} vs ${t0 - 3 * DT}`);

  // B: never edged.
  const ctx0 = edgeContext(w);
  const owned = mint(r, 1500, 100); owned.owner = r.seat;
  const engaged = mint(r, 1500, 200); engaged.aggroed = true;
  const alerted = mint(r, 1500, 300); alerted.alertUntil = w.time + 30;
  const struck = mint(r, 1500, 400); struck.aiHitAt = w.time;
  const fused = mint(r, 1500, 500); fused.fuse = 30;
  const close = mint(r, CENSUS_CFG.nearPx - 50, 0);
  const ctx = edgeContext(w);
  check('B never: a seat\'s minion, an engaged, alerted or struck body, a fused one and a near idle are not edged',
    [owned, engaged, alerted, struck, fused, close].every(a => !isEdged(a, w, ctx)) && isEdged(far, w, ctx0));
  toBeat(r);
  const closeT0 = close.aiTimer;
  r.host.tick(DT); r.host.tick(DT); // two off-beat ticks
  check('B never: none of them banks a tick', [owned, engaged, alerted, struck, fused, close].every(a => owedDt(a) === 0));
  check('B never: the near idle body thought on both off-beat ticks (its wander clock fell two ticks)', near(close.aiTimer, closeT0 - 2 * DT, 1e-9) || close.aiTimer > closeT0, `${closeT0} -> ${close.aiTimer}`);
  r.host.tick(DT); // the beat

  // C: the rouse.
  const roused = mint(r, 2000, 600);
  toBeat(r);
  r.host.tick(DT); // off-beat: banked
  check('C rouse: the far idle body banked one dt', near(owedDt(roused), DT));
  const ranBefore = r.host.phases.last.get('#ai.ran') ?? 0;
  roused.aiHitAt = w.time; // struck between ticks
  r.host.tick(DT); // off-beat: must think now
  check('C rouse: struck mid-beat it thinks at once and its bank is paid', owedDt(roused) === 0 && (r.host.phases.last.get('#ai.ran') ?? 0) === ranBefore + 1, `ran ${ranBefore} -> ${r.host.phases.last.get('#ai.ran')}`);

  // F: the switch.
  THINKING_EDGE_CFG.enabled = false;
  const far2 = mint(r, 2000, -600);
  toBeat(r);
  const f0 = far2.aiTimer;
  r.host.tick(DT);
  const ranOff = r.host.phases.last.get('#ai.ran') ?? 0;
  check('F switch: with the edge off every body thinks every tick and nothing banks', owedDt(far2) === 0 && (r.host.phases.last.get('#ai.edged') ?? 0) === 0 && ranOff === w.actors.length, `ran ${ranOff} of ${w.actors.length}`);
  check('F switch: the far body\'s wander clock fell one tick', near(far2.aiTimer, f0 - DT, 1e-9) || far2.aiTimer > f0);
  THINKING_EDGE_CFG.enabled = true;
  await down(r);
}

// ============================================ D: the solo invariant ==
{
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const runner = readFileSync(new URL('../src/sim/runner.ts', import.meta.url), 'utf8');
  check('D solo: main.ts and the sim runner call updateAI themselves and never import the edge',
    !/thinkingEdge/.test(main) && !/thinkingEdge/.test(runner) && /updateAI\(a, world, dt\)/.test(main) && /updateAI\(a, world, dt\)/.test(runner));
}

// ================================================== E: the walk ==
{
  // THE PINNED CLOCK (the header's note): the sim is hand-ticked and seeded, but
  // the wall-clock-sliced work inside a tick is not a function of the seed under
  // load; a monotone counter in place of performance.now makes every slice break
  // on its call count, so both arms do identical work per tick. Real timers
  // (the client's sleep, the host's stop) are untouched.
  const realNow = performance.now;
  const pinClock = (): (() => void) => {
    let t = 0;
    performance.now = (): number => (t += 0.001);
    return () => { performance.now = realNow; };
  };
  const walk = async (edge: boolean): Promise<{ pxPerSec: number; dist: number[]; dirTicks: number[]; ranOffBeat: number; ranBeat: number; roster: number; edged: number }> => {
    THINKING_EDGE_CFG.enabled = edge;
    const unpin = pinClock();
    try {
    const r = await boot(0x00c0ffee);
    const bodies: Actor[] = [];
    for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; bodies.push(mint(r, Math.cos(ang) * 850, Math.sin(ang) * 850)); }
    toBeat(r);
    const last = bodies.map(b => ({ x: b.pos.x, y: b.pos.y }));
    const dist = bodies.map(() => 0), dirTicks = bodies.map(() => 0);
    let walked = 0, ranOff = 0, offTicks = 0, ranBeat = 0, beatTicks = 0, edgedSum = 0;
    const ticks = 15 * SHARD_CFG.tickHz;
    for (let i = 0; i < ticks; i++) {
      const beat = isBeatNext(r);
      r.host.tick(DT);
      if (i % 30 === 0) await yieldIO();
      const ran = r.host.phases.last.get('#ai.ran') ?? 0;
      if (beat) { ranBeat += ran; beatTicks++; } else { ranOff += ran; offTicks++; }
      edgedSum += r.host.phases.last.get('#ai.edged') ?? 0;
      bodies.forEach((b, k) => {
        const d = Math.hypot(b.pos.x - last[k].x, b.pos.y - last[k].y);
        walked += d; dist[k] += d; if (b.wanderDir !== undefined) dirTicks[k]++;
        last[k].x = b.pos.x; last[k].y = b.pos.y;
      });
    }
    const roster = r.host.world.actors.length;
    await down(r);
    return { pxPerSec: walked / bodies.length / (ticks * DT), dist, dirTicks, ranOffBeat: ranOff / offTicks, ranBeat: ranBeat / beatTicks, roster, edged: edgedSum / ticks };
    } finally { unpin(); }
  };
  const off = await walk(false);
  const on = await walk(true);
  const again = await walk(false);
  THINKING_EDGE_CFG.enabled = true;
  check('E pinned clock: a second boot of the off arm walks the identical distance (the course is a pure function of the seed)',
    again.pxPerSec === off.pxPerSec && again.ranOffBeat === off.ranOffBeat && again.roster === off.roster,
    `${again.pxPerSec} vs ${off.pxPerSec} px/s, rosters ${again.roster}/${off.roster}`);
  check('E walk: the wanderers walk (the course moves them)', off.pxPerSec > 2, `${off.pxPerSec.toFixed(2)} px/s off`);
  // THE STROLL'S REACH: the walkers (moved in both arms) and their distance per tick of held direction.
  const walkers = off.dist.map((d, k) => (d > 0 && on.dist[k] > 0 ? k : -1)).filter(k => k >= 0);
  const reach = (arm: typeof off): number => walkers.reduce((a, k) => a + arm.dist[k], 0) / Math.max(1, walkers.reduce((a, k) => a + arm.dirTicks[k], 0));
  const reachOff = reach(off), reachOn = reach(on);
  check('E walk: at least six of the ring walk in both arms (the others stand against solids)', walkers.length >= 6, `${walkers.length} walkers`);
  check('E walk: THE STROLL REACH: with the edge on a walker covers the same distance per tick of held direction within 10%',
    Math.abs(reachOn - reachOff) <= 0.1 * reachOff,
    `${reachOn.toFixed(4)} on vs ${reachOff.toFixed(4)} off px per direction tick (raw means ${on.pxPerSec.toFixed(2)} on vs ${off.pxPerSec.toFixed(2)} off px/s: two realizations of the stop-or-walk draws, never the law)`);
  check('E walk: with the edge off the loop walks the whole roster every tick', near(off.ranOffBeat, off.roster, 1) && near(off.ranBeat, off.roster, 1) && off.edged === 0, `${off.ranOffBeat.toFixed(1)} of ${off.roster}`);
  check('E walk: with the edge on the off-beat ticks walk the roster less the edged bodies, the beat the whole roster', on.ranOffBeat <= on.roster - 20 && near(on.ranBeat, on.roster, 2) && on.edged >= 12, `off-beat ${on.ranOffBeat.toFixed(1)}, beat ${on.ranBeat.toFixed(1)}, roster ${on.roster}, edged/tick ${on.edged.toFixed(1)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
await sleep(300);
process.exit(failed ? 1 : 0);
