// ---------------------------------------------------------------------------
// probe_shardgovernor — THE NEIGHBORHOOD GOVERNOR (W1; docs/design/shard-m6-plan.md
// §3.4; server/governor.ts; her numbers, card 32). Walks the controller with
// synthetic tick costs, then a real classic host (cost-only: no seam) and a
// real wilds host (the F1 seam): the ladder goes down and comes back with
// hysteresis, the runtime's per-group limits follow the budget, nothing is
// ever despawned by a dial, and `--govern off` leaves today's law standing.
// The signal is the pump's: the host feeds observe() from its wall-clock
// pump, so a host ticked by hand sees no signal unless the probe feeds it,
// and the 2 s window lags a change in the ticks by two seconds.
//   A  synthetic: calm ticks write nothing (not even a null); heavy ticks thin
//      the budget ten percent a beat to the floor × groups and never below;
//      at the floor still over the gate for ten seconds the rate drops to
//      40 Hz once; calm ticks hold calmSec before the budget climbs eight a
//      beat and is withdrawn (null) at the ceiling; the rate returns after
//      thirty calm seconds; a reversal waits holdSec after the last move
//   B  synthetic, no seam: the budget never moves, the rate dial still does
//   C  switched off: nothing moves and a standing budget is relaxed to null
//   D  a real classic host on its pump: the governor rides the pump (ticks
//      observed), the status page carries its row, cost-only (no seam)
//   E  a real wilds host with one seated player: the seam is detected; fed
//      heavy ticks under a forced tiny gate the budget falls and
//      populationStats().groups[].limit follows clamp(floor, maxPopulation,
//      floor(total / groups)); the setter retires no body; the gate restored,
//      the budget climbs and today's law returns
// ---------------------------------------------------------------------------
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { GOVERNOR_CFG, Governor, governedRuntime, type GovernedRuntime, type GovernorHooks } from '../server/governor';
import { THINKING_EDGE_CFG } from '../server/thinkingEdge';
import { WsTransport } from '../src/net/ws';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const DT = 1 / 60;
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

// THE SHIPPED DEFAULT: the governor is off until its signal is tuned (performance-lane.md §8.2); the probe
// walks the controller with it on, and pins the default first.
check('0 default: the governor ships off (the admission law and the base rate stand; --govern on is the switch)', GOVERNOR_CFG.enabled === false);
GOVERNOR_CFG.enabled = true;

/** A fake runtime wearing the F1 seam: `groups` groups, maxPopulation 96, limits by the seam's own clamp. */
function fakeRuntime(groups = 3, maxPopulation = 96): GovernedRuntime & { calls: ({ total: number; floor: number } | null)[]; live: number; budget: { total: number; floor: number } | null } {
  const rt = {
    calls: [] as ({ total: number; floor: number } | null)[], live: 200, budget: null as { total: number; floor: number } | null,
    config: { maxPopulation },
    setPopulationBudget(b: { total: number; floor: number } | null) { rt.budget = b; rt.calls.push(b); },
    populationStats() {
      const limit = rt.budget === null ? maxPopulation : Math.max(rt.budget.floor, Math.min(maxPopulation, Math.floor(rt.budget.total / groups)));
      return { total: rt.live, groups: Array.from({ length: groups }, (_, i) => ({ members: [`p${i + 1}`], live: Math.floor(rt.live / groups), limit })) };
    },
  };
  return rt;
}
function fakeHooks(rt: GovernedRuntime | null, hz = 60): GovernorHooks & { hz: number; sets: number[] } {
  const h = { hz, sets: [] as number[], tickHz: () => h.hz, setTickHz: (v: number) => { h.hz = v; h.sets.push(v); }, runtime: () => rt };
  return h;
}
/** Feed `sec` seconds of ticks costing `ms` each at 60 Hz, beating the governor each tick (it beats itself once a second). */
function drive(g: Governor, clock: { t: number }, sec: number, ms: number): void {
  const ticks = Math.round(sec * 60);
  for (let i = 0; i < ticks; i++) { clock.t += DT; g.observe(ms, clock.t); g.beat(clock.t); }
}

// ============================================================ A: the ladder ==
{
  const rt = fakeRuntime(3), hooks = fakeHooks(rt), g = new Governor(hooks), clock = { t: 0 };
  const floorTotal = GOVERNOR_CFG.floor * 3, ceiling = 96 * 3;
  drive(g, clock, 2.5, 5);
  check('A ladder: calm ticks move nothing: today\'s law stands, the base rate, and not even a null is written', g.status().budget === null && rt.calls.length === 0 && hooks.sets.length === 0 && g.status().state === 'calm', JSON.stringify(g.status()));
  drive(g, clock, 3.2, 40); // the 2 s window turns heavy after two seconds of heavy ticks
  const s1 = g.status();
  check('A ladder: heavy ticks thin the budget from the ceiling, ten percent a beat, written through the seam', s1.budget !== null && s1.budget.total < ceiling && s1.budget.total >= Math.floor(ceiling * 0.81 * 0.9) && rt.calls.length >= 1 && rt.budget?.floor === GOVERNOR_CFG.floor, JSON.stringify(s1.budget));
  check('A ladder: the per-group limit follows the seam\'s clamp', rt.populationStats().groups[0].limit === Math.max(GOVERNOR_CFG.floor, Math.min(96, Math.floor(s1.budget!.total / 3))));
  drive(g, clock, 40, 40);
  const s2 = g.status();
  check('A ladder: the budget stops at floor × groups and never below', s2.budget !== null && s2.budget.total === floorTotal && s2.budget.perGroup === GOVERNOR_CFG.floor && rt.populationStats().groups[1].limit === GOVERNOR_CFG.floor, JSON.stringify(s2.budget));
  check('A ladder: at the floor still over the gate for ten seconds the rate drops to 40 Hz, once', hooks.hz === GOVERNOR_CFG.tick.lowHz && hooks.sets.filter(v => v === 40).length === 1 && s2.state === 'slow', `${hooks.hz} sets ${hooks.sets.join(',')}`);
  drive(g, clock, 4, 5); // calm ticks: the window turns low after two seconds; calmSec runs from there
  check('A ladder: calm ticks hold calmSec before the budget climbs', g.status().budget!.total === floorTotal, JSON.stringify(g.status().budget));
  drive(g, clock, 5, 5);
  const s3 = g.status();
  check('A ladder: then the budget climbs eight a beat', s3.budget !== null && s3.budget.total > floorTotal && s3.budget.total <= floorTotal + 8 * 5, JSON.stringify(s3.budget));
  drive(g, clock, 60, 5);
  const s4 = g.status();
  check('A ladder: at the ceiling the budget is withdrawn and today\'s law stands (null written through the seam)', s4.budget === null && rt.calls[rt.calls.length - 1] === null && rt.populationStats().groups[0].limit === 96, JSON.stringify(s4.budget));
  check('A ladder: the base rate returns after thirty calm seconds', hooks.hz === 60 && hooks.sets[hooks.sets.length - 1] === 60 && s4.state === 'calm', `${hooks.hz}`);
  check('A ladder: every budget written through the seam carries her floor', rt.calls.filter(c => c !== null).every(c => c!.floor === GOVERNOR_CFG.floor));
}

// ================================================ A2: the hold on a reversal ==
{
  const rt = fakeRuntime(3), hooks = fakeHooks(rt), g = new Governor(hooks), clock = { t: 0 };
  const calmSec = GOVERNOR_CFG.budget.calmSec;
  GOVERNOR_CFG.budget.calmSec = 0; // isolate holdSec: with no calm wait, only the hold keeps a reversal back
  drive(g, clock, 2.5, 40);  // the window turns heavy at two seconds; a down move lands on the next beat
  drive(g, clock, 2.5, 5);   // the window turns low at two seconds of calm; the last down move is about then
  const b1 = g.status().budget!.total;
  drive(g, clock, 2.0, 5);   // inside holdSec of the last move: no climb
  const b2 = g.status().budget!.total;
  drive(g, clock, 3.5, 5);   // past holdSec: the climb
  const b3 = g.status().budget!.total;
  GOVERNOR_CFG.budget.calmSec = calmSec;
  check('A2 hold: a reversal waits holdSec after the last move, then climbs', b1 < 96 * 3 && b2 === b1 && b3 > b1, `${b1} -> ${b2} -> ${b3}`);
}

// ======================================================== B: no seam ==
{
  const hooks = fakeHooks(null), g = new Governor(hooks), clock = { t: 0 };
  drive(g, clock, 20, 40);
  const s = g.status();
  check('B no seam: the budget never moves (seam false, budget null) and the rate dial still drops', !s.seam && s.budget === null && hooks.hz === 40 && s.state === 'slow', JSON.stringify(s));
  drive(g, clock, 40, 5);
  check('B no seam: the rate returns', hooks.hz === 60 && g.status().state === 'calm');
}

// ======================================================== C: the switch ==
{
  const rt = fakeRuntime(2), hooks = fakeHooks(rt), g = new Governor(hooks), clock = { t: 0 };
  drive(g, clock, 28, 40); // two groups: thirteen beats to the floor, ten more at it
  check('C switch: a budget stands at the floor and the rate dropped', g.status().budget?.total === GOVERNOR_CFG.floor * 2 && hooks.hz === 40, JSON.stringify(g.status()));
  GOVERNOR_CFG.enabled = false;
  drive(g, clock, 2, 40);
  const s = g.status();
  check('C switch: off, the budget is relaxed to null through the seam and the base rate returns', !s.enabled && s.budget === null && rt.calls[rt.calls.length - 1] === null && hooks.hz === 60 && s.state === 'calm', JSON.stringify(s));
  drive(g, clock, 20, 40);
  check('C switch: off, nothing moves however heavy the ticks', g.status().budget === null && hooks.hz === 60);
  GOVERNOR_CFG.enabled = true;
}

// ================================================= D: a real classic host ==
{
  const restore = seedGlobalRandom(0x5a4d);
  const host = new ShardHost({ seed: 0x00c0ffee, saveDir: null, open: true, log: () => { /* quiet */ } });
  await host.listen(0, '127.0.0.1');
  host.start(); // THE PUMP feeds the governor; a hand-ticked host never does
  await sleep(1500);
  const st = host.status() as { governor?: { enabled: boolean; seam: boolean; budget: unknown; ticksInWindow: number; tickHz: number; ewmaMs: number } };
  check('D host: the governor rides the pump and the status page carries its row', !!st.governor && st.governor.enabled && st.governor.ticksInWindow > 0 && st.governor.ewmaMs > 0, JSON.stringify(st.governor));
  check('D host: a classic world is cost-only (no seam, no budget) at the base rate', st.governor!.seam === false && st.governor!.budget === null && st.governor!.tickHz === SHARD_CFG.tickHz);
  await host.stop({ persist: false });
  restore();
}

// ================================================= E: a real wilds host ==
{
  const restore = seedGlobalRandom(0x5a4d);
  const host = new ShardHost({ seed: 0x0ddba11, saveDir: null, open: true, worldmass: true, log: () => { /* quiet */ } });
  await host.ready();
  const port = await host.listen(0, '127.0.0.1');
  const client = new WsTransport();
  await client.connect(`ws://127.0.0.1:${port}`, { name: 'Governed', classId: 'warrior' }); // a seated player: the runtime's first group
  for (let i = 0; i < 30; i++) { host.tick(DT); await yieldIO(); }
  const rt = governedRuntime(host.world.massRuntime);
  check('E wilds: the F1 seam is detected on the keeper\'s runtime', rt !== null && host.governor.status().seam);
  const groups = rt!.populationStats().groups.length;
  check('E wilds: a seated player stands one neighborhood group', groups >= 1, `${groups}`);
  const gate = GOVERNOR_CFG.gateMs;
  GOVERNOR_CFG.gateMs = 0.001; // every fed tick is over the gate: the ladder walks down on the host's own beats
  const heavy = async (sec: number): Promise<void> => {
    for (let s = 0; s < sec; s++) { for (let i = 0; i < 60; i++) { host.governor.observe(30, host.world.time); host.tick(DT); } await yieldIO(); }
  };
  await heavy(5);
  const st = host.governor.status();
  const limit = rt!.populationStats().groups[0]?.limit;
  check('E wilds: fed heavy ticks under the forced gate the budget fell and the runtime\'s per-group limit follows the clamp', st.budget !== null && st.budget.groups === groups && limit === Math.max(GOVERNOR_CFG.floor, Math.min(rt!.config.maxPopulation, Math.floor(st.budget.total / groups))), `${JSON.stringify(st.budget)}, limit ${limit}`);
  check('E wilds: her floor rides every budget', st.budget !== null && st.budget.floor === 24 && GOVERNOR_CFG.floor === 24);
  const roster = host.world.actors.length;
  rt!.setPopulationBudget({ total: GOVERNOR_CFG.floor * groups, floor: GOVERNOR_CFG.floor });
  check('E wilds: the seam\'s setter alone changes no roster', host.world.actors.length === roster, `${roster}`);
  GOVERNOR_CFG.gateMs = 1e9; // every tick is calm: the ladder climbs back
  const calm = async (sec: number): Promise<void> => {
    for (let s = 0; s < sec; s++) { for (let i = 0; i < 60; i++) { host.governor.observe(1, host.world.time); host.tick(DT); } await yieldIO(); }
  };
  await calm(50);
  const back = host.governor.status();
  check('E wilds: the gate restored, the budget climbs and today\'s law returns (null) with the base limit', back.budget === null && rt!.populationStats().groups[0]?.limit === rt!.config.maxPopulation && back.tickHz === SHARD_CFG.tickHz, JSON.stringify(back));
  GOVERNOR_CFG.gateMs = gate;
  client.leave();
  await sleep(50);
  await host.stop({ persist: false });
  restore();
}

check('F edge: the governor never turns the edge off', THINKING_EDGE_CFG.enabled === true);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
await sleep(300);
process.exit(failed ? 1 : 0);
