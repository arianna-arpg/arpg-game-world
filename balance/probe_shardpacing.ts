import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ShardHost, SHARD_CFG } from '../server/shardHost';

// Exercise the actual pump with a tiny world boundary: no gameplay fixture can
// reliably manufacture a fixed 20 ms tick across different developer machines.
const pump = Reflect.get(ShardHost.prototype, 'pump') as (this: ShardHost) => void;
function fixture(costMs: number, fail = false) {
  const steps: number[] = [], credits: number[] = [], events: string[] = [];
  const raw = {
    timer: null, pumpContinuation: null, pumping: false,
    lastWall: performance.now() - 1000, accum: 0, tickMs: [] as number[], tickMsAt: 0,
    ticks: 0, droppedTicks: 0, faults: 0, faultsSinceLog: 0, lastFaultLogAt: -Infinity,
    log: () => {}, vessels: { mirrorAll: () => {} }, net: { close: async () => {} },
    world: { passInputTime: (dt: number) => credits.push(dt), massRuntime: null },
    tick(dt: number) {
      steps.push(dt); events.push('tick'); this.ticks++;
      const until = performance.now() + costMs;
      while (performance.now() < until) { /* prescribed synchronous work */ }
      if (fail && this.ticks === 1) throw Error('pacing probe');
    },
  };
  return { host: raw as unknown as ShardHost, raw, steps, credits, events };
}
async function drained(f: ReturnType<typeof fixture>) {
  for (let i = 0; i < 100 && f.raw.pumping; i++) await nextTurn();
  assert.equal(f.raw.pumping, false, 'the bounded catch-up batch finishes');
}

async function main() {
  const fast = fixture(0); pump.call(fast.host);
  assert.equal(fast.steps.length, SHARD_CFG.maxCatchUpTicks, 'cheap catch-up remains synchronous');
  assert.equal(fast.raw.pumpContinuation, null);
  assert.ok(fast.raw.droppedTicks >= 54 && fast.raw.droppedTicks <= 56);
  assert.equal(fast.credits.length, 1);

  const slow = fixture(20, true);
  const io = new Promise<void>(resolve => setImmediate(() => { slow.events.push('io'); resolve(); }));
  pump.call(slow.host);
  assert.equal(slow.steps.length, 1, 'a budget-consuming tick yields before another tick');
  pump.call(slow.host);
  assert.equal(slow.steps.length, 1, 'an interval arrival cannot reenter the pending batch');
  await io; await drained(slow);
  assert.equal(slow.steps.length, SHARD_CFG.maxCatchUpTicks, 'yielding does not lower the catch-up limit');
  assert.ok(slow.events.indexOf('io') < slow.events.lastIndexOf('tick'), 'event-loop work runs between whole ticks');
  assert.ok(slow.steps.every(dt => dt === 1 / SHARD_CFG.tickHz));
  assert.equal(slow.credits.length, 1, 'wall input credit is not repeated per continuation');
  assert.equal(slow.raw.faults, 1, 'a fault still counts and does not abandon later ticks');
  assert.equal(slow.raw.tickMs.length, SHARD_CFG.maxCatchUpTicks);
  assert.equal(slow.raw.accum, 0); assert.ok(slow.raw.droppedTicks >= 54 && slow.raw.droppedTicks <= 56);
  console.log('PASS slow ticks service queued work between whole steps with unchanged catch-up, clock, credit and fault accounting');

  const stopped = fixture(20); pump.call(stopped.host);
  await ShardHost.prototype.stop.call(stopped.host, { persist: false });
  await nextTurn(); await nextTurn();
  assert.equal(stopped.steps.length, 1, 'stop cancels a queued continuation');
  assert.equal(stopped.raw.pumpContinuation, null); assert.equal(stopped.raw.pumping, false);
  console.log('PASS stopping the host cannot leave a catch-up continuation mutating the world');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
