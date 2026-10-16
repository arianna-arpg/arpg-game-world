// UNRUN source-derived timing control. Executes only the selected startup text
// with synthetic dependencies, never a world/browser. Both native-call costs
// are 31ms; deliberately expensive later validation/reporting must stay outside.
// node balance/check_perfresidencystarttiming.cjs
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/dev/perf.ts'), 'utf8').replace(/\r\n/g, '\n');
const unique = text => { const first = source.indexOf(text); assert.ok(first >= 0 && source.lastIndexOf(text) === first, 'source boundary must remain unique: ' + text); return first; };
const firstStart = unique('  const sweepStartedAt = { wall: performance.now(), iso: new Date().toISOString() };');
const firstEnd = unique('  const initialStartupMs = +(performance.now() - sweepStartedAt.wall).toFixed(1);') + '  const initialStartupMs = +(performance.now() - sweepStartedAt.wall).toFixed(1);'.length;
const laterStart = unique('  const freshStart = (): PerfRuntimeIdentity => {') + '  const freshStart = (): PerfRuntimeIdentity => {'.length;
const laterEnd = source.indexOf('\n  };\n  /** THE MINT RECEIPT:', laterStart); assert.ok(laterEnd > laterStart);
const laterBody = source.slice(laterStart, laterEnd);
const firstBody = source.slice(firstStart, firstEnd);
assert.match(firstBody, /withPerfProfile\([^\n]+\);\n  const initialStartupMs/);
assert.match(laterBody, /withPerfProfile\([^\n]+\);\n    \/\/ Same endpoint[^\n]+\n    const startupMs[^\n]+\n    const next = g\.retained\(\);/);
const first = new Function('g', 'opts', 'performance', 'withPerfProfile', firstBody + '\nreturn initialStartupMs;');
const later = new Function('g', 'opts', 'performance', 'withPerfProfile', 'retainedPerfTravel', 'beat', 'identity', 'let travel, selectedRuntime, startOrdinal=0;\n' + laterBody);
function fixture(postWork) {
  let clock = 0, reads = 0, actualCalls = 0;
  const previous = { get ready() { clock += postWork; return false; } }, next = {};
  const g = {
    account: () => ({}), devStartRun: () => { actualCalls++; clock += 11; }, saveAccount: () => { clock += 3; },
    retained: () => { if (reads++ === 0) return previous; clock += postWork; return next; },
    world: () => { clock += postWork; return { scene: null }; }, crash: () => { clock += postWork; return { fatal: null }; },
  };
  return { g, opts: {}, performance: { now: () => clock },
    withPerfProfile: (_account, start, persist) => { clock += 17; try { return start(); } finally { persist(); } },
    travel: () => { clock += postWork; return {}; }, beat: () => { clock += postWork; },
    identity: startupMs => { clock += postWork; return { startupMs }; },
    advance: value => { clock += value; }, read: () => ({ clock, actualCalls }),
  };
}
for (const postWork of [0, 1000, 100000]) {
  const a = fixture(postWork), firstCost = first(a.g, a.opts, a.performance, a.withPerfProfile);
  a.advance(postWork * 7);
  const b = fixture(postWork), laterCost = later(b.g, b.opts, b.performance, b.withPerfProfile, b.travel, b.beat, b.identity).startupMs;
  assert.equal(firstCost, 31); assert.equal(laterCost, firstCost); assert.equal(a.read().actualCalls, 1); assert.equal(b.read().actualCalls, 1);
  assert.equal(b.read().clock, 31 + postWork * 7);
}
console.log('PASS startup timing: identical native-call/profile endpoints despite 0, 7000 and 700000ms of synthetic later validation/reporting work');
console.log('SOURCE-DERIVED PURE CONTROL ONLY: no actual native start, lifecycle or timing result');
