// ---------------------------------------------------------------------------
// probe_phasemeter — THE PHASE METER and THE DISTANCE CENSUS on a hosted world
// (docs/design/performance-lane.md §5 step 1; server/phaseMeter.ts,
// server/distanceCensus.ts). Boots a real ShardHost (classic hearth), joins
// one client over the wire, ticks the host, and pins:
//   A  the meter's arithmetic: one sample per tick per phase, absent phases
//      kept out of the percentiles, the window's sums right across eviction,
//      shares over the same window, counts never a share
//   B  meterMethod wraps one instance once, keeps this / args / result / throw
//   C  the host's tick lands every phase of the frame on the status page,
//      the keeper's own rows beside them, the AI loop's count the roster,
//      the shares summing to no more than the tick, the wire rows on beats
//   D  the census: one class per body in the stated order, the distance
//      bands to the nearest standing seat, idle bodies beyond nearPx edgeable
//   E  the meter's own cost: ten thousand marks under a few milliseconds
// ---------------------------------------------------------------------------
import { ShardHost } from '../server/shardHost';
import { PhaseMeter, meterMethod, isCountPhase, type PhaseSummary } from '../server/phaseMeter';
import { BODY_STATES, CENSUS_CFG, classifyBody, censusContext, distanceCensus, nearestSeatPx } from '../server/distanceCensus';
import { WsTransport } from '../src/net/ws';
import { seedGlobalRandom } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const DT = 1 / 60;
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

// ============================================================ A: the ring ==
{
  const m = new PhaseMeter(4);
  // Six ticks into a ring of four: the first two evicted. Phase 'a' runs in
  // ticks 1, 3, 5 (1, 3, 5 ms); 'b' every tick (2 ms); '#n' counts 7.
  const ticks = [10, 10, 10, 10, 10, 10];
  ticks.forEach((t, i) => {
    m.begin();
    if (i % 2 === 0) m.add('a', i + 1);
    m.add('b', 2);
    m.add('#n', 7);
    m.end(t);
  });
  const s = m.summary();
  check('A ring: one sample per tick per phase; a phase absent in a tick stays out of its percentiles', s.a.calls === 2 && s.b.calls === 4 && s.tick.calls === 4, JSON.stringify(s.a));
  check('A ring: the window holds the last four ticks (a = 3, 5 ms over ticks 3..6: the upper of two at p50, mean 4)', s.a.p50 === 5 && s.a.max === 5 && s.a.meanMs === 4);
  check('A ring: the share reads both sums over the same window (a: 8 of 40 ms; b: 8 of 40 ms)', s.a.share === 0.2 && s.b.share === 0.2, `${s.a.share} ${s.b.share}`);
  check('A ring: a count is never a share and summarizes as a count', isCountPhase('#n') && s['#n'].share === 0 && s['#n'].p50 === 7 && s['#n'].calls === 4);
  check('A ring: last holds the tick just ended', m.last.get('a') === undefined && m.last.get('b') === 2 && m.lastTickMs === 10 && m.ticks === 6);
  const m2 = new PhaseMeter(4);
  m2.begin(); m2.add('x', 1, 'keeper'); m2.add('x', 2, 'cave:1'); m2.end(5);
  const s2 = m2.summary();
  check('A ring: a unit key keys a second row beside the summed phase', s2.x.p50 === 3 && s2['keeper/x'].p50 === 1 && s2['cave:1/x'].p50 === 2 && m2.phases().join(',') === 'cave:1/x,keeper/x,tick,x');
}

// ======================================================= B: meterMethod ==
{
  const m = new PhaseMeter(8);
  let calls = 0;
  const target = { k: 3, update(x: number): number { calls++; return this.k * x; }, boom(): never { throw new Error('boom'); } };
  meterMethod(m, target, 'update', 'runtime', 'keeper');
  meterMethod(m, target, 'update', 'runtime', 'keeper'); // the second wrap is a no-op per instance
  m.begin();
  const r = target.update(7);
  let threw = false;
  try { target.boom(); } catch { threw = true; }
  m.end(1);
  const s = m.summary();
  check('B wrap: the wrapped method keeps this, its argument and its result, and runs the original once', r === 21 && calls === 1);
  check('B wrap: the wrap lands its span under the phase and the unit row', s.runtime?.calls === 1 && s['keeper/runtime']?.calls === 1 && s.runtime.p50 >= 0);
  check('B wrap: an unwrapped method still throws through', threw);
  check('B wrap: the override is an own property, so a re-seated instance is wrapped afresh and the prototype is untouched', Object.prototype.hasOwnProperty.call(target, 'update'));
}

// ===================================================== C: the host's tick ==
const restoreRandom = seedGlobalRandom(0x5a4d);
const host = new ShardHost({ seed: 0x00c0ffee, saveDir: null, open: true, log: () => { /* quiet */ } });
const port = await host.listen(0, '127.0.0.1');
const client = new WsTransport();
await client.connect(`ws://127.0.0.1:${port}`, { name: 'Meter', classId: 'warrior' });
for (let i = 0; i < 12; i++) { host.tick(DT); await yieldIO(); }
{
  const st = host.status() as { phases: Record<string, PhaseSummary>; actors: number; census: ReturnType<typeof distanceCensus> };
  const ph = st.phases;
  const want = ['tick', 'input', 'inputs.apply', 'actions', 'ai', 'update', 'settle', 'drain', 'desks', 'sweep', '#ai.ran', 'keeper/ai', 'keeper/update', 'wire.serialize', 'wire.send'];
  check('C tick: every phase of the frame lands on the status page, the keeper\'s own rows beside the summed ones', want.every(k => ph[k] !== undefined), want.filter(k => ph[k] === undefined).join(','));
  check('C tick: the simulate phases ran every tick, the wire on the beats alone', ph.ai.calls === 12 && ph.update.calls === 12 && ph.tick.calls === 12 && ph['wire.serialize'].calls === 4 && ph['wire.send'].calls === 4, `${ph.ai.calls} ${ph['wire.serialize'].calls}`);
  const lastRan = (host.phases.last.get('#ai.ran') ?? 0) + (host.phases.last.get('#ai.edged') ?? 0); // the tick just ended: thought + edged
  check('C tick: the AI loop\'s counts (the bodies that thought plus the edged ones) are the roster the loop walked', lastRan === host.world.actors.length && ph['#ai.ran'].share === 0 && ph['#ai.edged'] !== undefined, `${lastRan} vs ${host.world.actors.length}`);
  const shares = Object.entries(ph).filter(([n]) => n !== 'tick' && !n.includes('/') && !isCountPhase(n) && n !== 'runtime').reduce((a, [, p]) => a + p.share, 0);
  check('C tick: the phases\' shares sum to no more than the tick (the rest is the frame\'s own glue)', shares > 0.5 && shares <= 1.0001, shares.toFixed(3));
  check('C tick: a classic world has no mass runtime row', ph.runtime === undefined);
  check('C tick: the census rides the status page (the parked keeper and the joined hero are its two seats)', st.census.actors === st.actors && st.census.states.seat === 2);
}

// ======================================================== D: the census ==
{
  const w = host.world;
  const seat = host.units.allSeats()[0];
  const at = seat.actor.pos;
  const mint = (dx: number, dy: number): Actor => { const m = w.createMonster('zombie', 1, 'enemy'); m.pos.x = at.x + dx; m.pos.y = at.y + dy; if (!w.actors.includes(m)) w.actors.push(m); return m; };
  const before = distanceCensus([w]);
  const idleFar = mint(2500, 0);            // band 4, idle, edgeable
  const idleNear = mint(100, 0);            // band 0, idle near
  const engaged = mint(800, 0); engaged.aggroed = true;      // band 1
  const alerted = mint(0, 1200); alerted.alertUntil = w.time + 10; // band 2
  const fighting = mint(0, 1500); fighting.aiHitAt = w.time;       // band 3
  const held = mint(300, 300); held.fuse = 5;
  const owned = mint(50, 50); owned.owner = seat.actor;
  const scenery = mint(-100, 0); scenery.passive = true;
  const corpse = mint(-200, 0); corpse.dead = true;
  const squadA = mint(0, -2000); squadA.squadId = 4242; squadA.aiTargetId = seat.actor.id; // engaged (a target)
  const squadB = mint(0, -2100); squadB.squadId = 4242;                                     // its mate: busy by the squad
  const ctx = censusContext(w);
  const cls = (a: Actor) => classifyBody(a, w, ctx);
  check('D census: one class per body in the stated order', cls(seat.actor) === 'seat' && cls(owned) === 'owned' && cls(corpse) === 'dead' && cls(scenery) === 'passive' && cls(held) === 'held'
    && cls(engaged) === 'engaged' && cls(alerted) === 'alerted' && cls(fighting) === 'fighting' && cls(squadA) === 'engaged' && cls(squadB) === 'squad' && cls(idleFar) === 'idle' && cls(idleNear) === 'idle',
    [seat.actor, owned, corpse, scenery, held, engaged, alerted, fighting, squadA, squadB, idleFar, idleNear].map(cls).join(','));
  check('D census: the distance reads to the nearest standing seat in the body\'s World', Math.abs(nearestSeatPx(idleFar, ctx) - 2500) < 1e-6 && Math.abs(nearestSeatPx(owned, ctx) - Math.hypot(50, 50)) < 1e-6);
  const c = distanceCensus([w]);
  const d = (k: keyof typeof c.states) => c.states[k] - before.states[k];
  check('D census: the counts move by the minted bodies alone', d('idle') === 2 && d('engaged') === 2 && d('alerted') === 1 && d('fighting') === 1 && d('held') === 1 && d('owned') === 1 && d('passive') === 1 && d('dead') === 1 && d('squad') === 1 && d('seat') === 0,
    BODY_STATES.map(s => `${s}:${d(s)}`).join(' '));
  const db = c.bands.map((n, i) => n - before.bands[i]);
  check('D census: the bands hold the living bodies by distance (the corpse banded nowhere)', db.join(',') === '4,1,1,1,3', db.join(','));
  const di = c.idleBands.map((n, i) => n - before.idleBands[i]);
  check('D census: the idle bands hold the two idle bodies at their distances', di.join(',') === '1,0,0,0,1', di.join(','));
  check('D census: the far idle body is edgeable, the near one is not', c.edgeable - before.edgeable === 1 && c.idleNear - before.idleNear === 1 && CENSUS_CFG.nearPx === CENSUS_CFG.bands[0]);
  check('D census: the whole roster is counted', c.actors === w.actors.length);
  for (const a of [idleFar, idleNear, engaged, alerted, fighting, held, owned, scenery, corpse, squadA, squadB]) { const i = w.actors.indexOf(a); if (i >= 0) w.actors.splice(i, 1); }
}

// ===================================================== E: the meter's cost ==
{
  const m = new PhaseMeter();
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    m.begin();
    for (let j = 0; j < 10; j++) m.add('p' + j, j, 'keeper');
    m.end(1);
  }
  const ms = performance.now() - t0;
  check('E cost: ten thousand marks and a thousand tick ends under 50 ms', ms < 50, `${ms.toFixed(1)} ms`);
}

client.leave();
await sleep(50);
await host.stop({ persist: false });
restoreRandom();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
await sleep(300);
process.exit(failed ? 1 : 0);
