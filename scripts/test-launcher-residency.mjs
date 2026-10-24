// THE RESIDENCY INSTRUMENT's launcher half (launcher/perfresidency.cjs) on fixtures: the flag parse that refuses before
// anything loads, and the print. Pure strings, no Electron.
//   node --test scripts/test-launcher-residency.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { residencyLines, parseResidencyFlags, DEFAULT_RUN_SEED } = require('../launcher/perfresidency.cjs');

const flags = (o = {}) => ({ fresh: false, ramp: null, rampList: null, rampAge: false, runSeed: null, configSeed: undefined, filter: '', ...o });

test('flags: no residency flag is the cumulative course, untouched; a stray --run-seed is refused', () => {
  assert.deepEqual(parseResidencyFlags(flags()), { opts: null, errors: [] });
  assert.deepEqual(parseResidencyFlags(flags({ filter: 'mire' })), { opts: null, errors: [] });
  assert.match(parseResidencyFlags(flags({ runSeed: '7' })).errors.join('|'), /--run-seed without --fresh or --ramp/);
});
test('flags: --fresh with the default seed, a configured seed (zero honored), a decimal and a hex flag seed', () => {
  assert.deepEqual(parseResidencyFlags(flags({ fresh: true })).opts, { course: 'fresh', seed: DEFAULT_RUN_SEED });
  assert.deepEqual(parseResidencyFlags(flags({ fresh: true, configSeed: 0 })).opts, { course: 'fresh', seed: 0 });
  assert.deepEqual(parseResidencyFlags(flags({ fresh: true, runSeed: '0' })).opts, { course: 'fresh', seed: 0 });
  assert.deepEqual(parseResidencyFlags(flags({ fresh: true, runSeed: '0x1231' })).opts, { course: 'fresh', seed: 0x1231 });
  assert.deepEqual(parseResidencyFlags(flags({ fresh: true, runSeed: '4294967295', configSeed: 5 })).opts, { course: 'fresh', seed: 4294967295 });
});
test('flags: malformed seeds are refused, never coerced', () => {
  for (const bad of ['seven', '1.5', '-1', '1e3', ' 7', '0x', '0x123456789', '12345678901']) assert.match(parseResidencyFlags(flags({ fresh: true, runSeed: bad })).errors.join('|'), /--run-seed must be/, bad);
  assert.match(parseResidencyFlags(flags({ fresh: true, runSeed: '4294967296' })).errors.join('|'), /at most 4294967295/);
  assert.match(parseResidencyFlags(flags({ fresh: true, configSeed: 1.5 })).errors.join('|'), /residency.seed must be an integer/);
  assert.match(parseResidencyFlags(flags({ fresh: true, configSeed: 'x' })).errors.join('|'), /residency.seed must be an integer/);
});
test('flags: the ramp with default steps, a count, a list, the age control', () => {
  assert.deepEqual(parseResidencyFlags(flags({ ramp: '' })).opts, { course: 'ramp', seed: DEFAULT_RUN_SEED });
  assert.deepEqual(parseResidencyFlags(flags({ ramp: '51' })).opts, { course: 'ramp', seed: DEFAULT_RUN_SEED, rampSteps: 51 });
  assert.deepEqual(parseResidencyFlags(flags({ rampList: ' jungle, sandsea ,,' })).opts, { course: 'ramp', seed: DEFAULT_RUN_SEED, rampList: ['jungle', 'sandsea'] });
  assert.deepEqual(parseResidencyFlags(flags({ rampAge: true, ramp: '8' })).opts, { course: 'ramp', seed: DEFAULT_RUN_SEED, rampSteps: 8, rampAgeControl: true });
});
test('flags: malformed counts and lists are refused', () => {
  for (const bad of ['0.5', '-3', 'Infinity', 'NaN', 'eight', '99999']) assert.match(parseResidencyFlags(flags({ ramp: bad })).errors.join('|'), /--ramp=<K> must be a positive integer/, bad);
  assert.match(parseResidencyFlags(flags({ rampList: ' , ' })).errors.join('|'), /names no tileset/);
  assert.match(parseResidencyFlags(flags({ rampList: 'jungle,jungle' })).errors.join('|'), /repeats a tileset/);
});
test('flags: contradictions are refused by name', () => {
  assert.match(parseResidencyFlags(flags({ fresh: true, ramp: '' })).errors.join('|'), /--fresh contradicts/);
  assert.match(parseResidencyFlags(flags({ fresh: true, rampAge: true })).errors.join('|'), /--fresh contradicts/);
  assert.match(parseResidencyFlags(flags({ rampList: 'jungle', rampAge: true })).errors.join('|'), /--ramp-list contradicts --ramp-age-control/);
  assert.match(parseResidencyFlags(flags({ ramp: '', filter: 'mire' })).errors.join('|'), /--filter is undefined for the ramp/);
  assert.equal(parseResidencyFlags(flags({ fresh: true, filter: 'mire' })).errors.length, 0, 'a filter on the fresh course is the matrix subset, as on the original');
  const many = parseResidencyFlags(flags({ fresh: true, ramp: 'x', rampList: 'a,a', rampAge: true, runSeed: 'bad' }));
  assert.equal(many.opts, null);
  assert.ok(many.errors.length >= 4, 'every refusal is named: ' + many.errors.join('|'));
});

const zone = (name, gapP50, extra = {}) => ({ zone: name, gapP50, gapP95: gapP50 + 1, gapP99: gapP50 + 3, gapMax: gapP50 + 9, hitch40: 0, simP99: 2.5, taskMax: 11, entryWorstGap: 120, entryNote: '', ringWrap: 0, ...extra });
const CONTRAST = 'unmatched residency contrast: the control at 1 resident area, the zone at 2; raw values, never judged against the cumulative caps';
const common = { course: 'fresh', startSeed: 20261016, saves: { suppressed: true, reason: 'perf: residency instrument - nothing durable is written' }, skipped: [] };
const freshRow = (o = {}) => ({ tileset: 'jungle', runtime: { ordinal: 3, startedAt: '2026-10-16T05:00:00.000Z', startupMs: 1850.5, manifestSeed: 20261016 }, control: zone('Lastlight', 8.3), controlCensus: { residentAreas: 1, residentActors: 19 }, controlReturnSyncMs: 41.2, mint: { seed: 77, variant: 'strangler court', layout: 'forest' }, mintSyncMs: 612.4, zone: zone('Strangler Court', 12.1, { entryNote: 'heavy entry frame: 600ms gap, own work 580ms' }), zoneCensus: { residentAreas: 2, residentActors: 53 }, heapMB: { afterStart: 210.4, afterZone: 305.9 }, regime: 'control 1 area / zone 2 areas', expectedRegime: true, contrast: CONTRAST, ...o });

test('fresh print: the header names the course, the seed and the suppression; a row prints its run, syncs, both censuses and its mint receipt', () => {
  const lines = residencyLines({ ...common, fresh: [freshRow()] }, null);
  assert.match(lines[0], /course 'fresh'/);
  assert.match(lines[0], /start seed 20261016/);
  assert.match(lines[0], /saves suppressed \(perf: residency instrument/);
  assert.match(lines[0], /no cap applied, no verdict/);
  const row = lines.find(l => l.startsWith('jungle'));
  assert.ok(row, 'the jungle row prints');
  for (const v of ['1850.5', '210.4', '305.9', '41.2', '612.4', ' 8.3 ', '12.1', '    1 ', '    2 ', '   53 ']) assert.ok(row.includes(v), `the row carries ${JSON.stringify(v)}: ${row}`);
  assert.match(row, /^jungle\s+3\s+/);
  assert.match(row, /seed 77 variant strangler court layout forest \/ Strangler Court$/);
  assert.ok(lines.some(l => /\^ jungle: heavy entry frame/.test(l)), 'the entry note rides the row');
  assert.ok(!lines.some(l => /regime/.test(l) && /!/.test(l)), 'an expected regime prints no regime line');
  assert.equal(lines[lines.length - 1], CONTRAST);
  assert.ok(!lines.some(l => /breach|would|isolat/i.test(l)), 'no breach, would or isolation word anywhere');
});
test('fresh print: an unexpected regime is called out on its row; an unsuppressed save state and a rolled seed print loudly', () => {
  const lines = residencyLines({ ...common, startSeed: null, saves: { suppressed: false, reason: null }, fresh: [freshRow({ regime: 'control 2 areas / zone 3 areas UNEXPECTED (the course expects 1 / 2)', expectedRegime: false, controlCensus: { residentAreas: 2, residentActors: 40 }, zoneCensus: { residentAreas: 3, residentActors: 90 } })] }, null);
  assert.match(lines[0], /NOT SUPPRESSED/);
  assert.match(lines[0], /start seed \(rolled\)/);
  assert.ok(lines.some(l => l === '  ! jungle: regime control 2 areas / zone 3 areas UNEXPECTED (the course expects 1 / 2)'));
});
test('fresh print: a wrapped ring is called out; null heap and a rolled mint seed print as dashes and words', () => {
  const lines = residencyLines({ ...common, fresh: [freshRow({ tileset: 'caul', control: zone('Lastlight', 8, { ringWrap: 3 }), zone: zone('The Caul', 9), heapMB: { afterStart: null, afterZone: null }, mint: { seed: null, variant: null, layout: null } })] }, null);
  assert.ok(lines.some(l => l === '  ^ caul: RING WRAPPED (control 3, zone 0 oldest frames dropped)'));
  assert.ok(lines.some(l => /^caul .* seed rolled \/ The Caul$/.test(l)));
});
test('ramp print: steps with ages, syncs and history; held and unheld towns; the slopes, the note and the comparison note', () => {
  const step = (o) => ({ step: 0, visited: null, mint: null, mintSyncMs: null, visitEntryWorstGap: null, visitHeld: null, returnSyncMs: 0, town: zone('Lastlight', 8.3), residentAreas: 1, residentActors: 19, heapMB: 200.1, wallMs: 12000, campaignSec: 95.5, history: { visited: [], skipped: [] }, ...o });
  const lines = residencyLines({ ...common, course: 'ramp', ramp: { ageControl: false, list: ['jungle', 'sandsea'], steps: [
    step({}),
    step({ step: 1, visited: 'jungle', mint: { seed: 77, variant: null, layout: 'forest' }, mintSyncMs: 611, visitEntryWorstGap: 410.2, visitHeld: true, returnSyncMs: 38.5, town: zone('Lastlight', 9.0), residentAreas: 2, residentActors: 53, heapMB: 290.7, wallMs: 31000, campaignSec: 114.2, history: { visited: ['jungle'], skipped: [] } }),
    step({ step: 2, visited: 'sandsea', mint: { seed: null, variant: 'whaleback swell', layout: null }, mintSyncMs: 402, visitEntryWorstGap: 95.5, visitHeld: false, returnSyncMs: 40, town: null, residentAreas: 3, residentActors: 90, heapMB: 340, wallMs: 52000, campaignSec: 133.9, history: { visited: ['jungle', 'sandsea'], skipped: ['caul'] } }),
  ], slopes: [{ metric: 'gapP50', perArea: 0.7, perHundredActors: 2.058, points: 2 }, { metric: 'taskMax', perArea: null, perHundredActors: null, points: 2 }], slopesNote: 'report-only: an observed joint age/residency curve', comparisonNote: null } }, null);
  assert.match(lines[0], /course 'ramp'/);
  assert.ok(lines.some(l => /^\s+0\s+\(none\)\s+1\s+19\s+200\.1\s+12\.0\s+95\.5\s+-\s+0 \|/.test(l)), 'step 0 visits nothing and carries its ages: ' + lines.join('\n'));
  assert.ok(lines.some(l => /^\s+1\s+jungle\s+2\s+53\s+290\.7\s+31\.0\s+114\.2\s+611\s+38\.5 \|.*yes.*seed 77 layout forest$/.test(l)), 'step 1 names its syncs, ages and mint');
  assert.ok(lines.some(l => /^\s+2\s+sandsea.*window not held.*NO.*seed rolled variant whaleback swell$/.test(l)), 'an unheld town says so, an unheld visit says NO, a rolled seed says so');
  assert.ok(lines.some(l => l === '  ! step 2: skipped so far caul'), 'the completed history names skipped visits');
  assert.ok(lines.some(l => l === 'slope gapP50  0.7 ms per resident area; 2.058 ms per hundred resident bodies; 2 steps held'));
  assert.ok(lines.some(l => l === 'slope taskMax (no slope); (no slope); 2 steps held'));
  assert.equal(lines[lines.length - 1], 'report-only: an observed joint age/residency curve');
  const aged = residencyLines({ ...common, course: 'ramp', ramp: { ageControl: true, list: [], steps: [], slopes: [], slopesNote: 'n', comparisonNote: 'a comparison under unmatched ages, not an isolation' } }, null);
  assert.match(aged[0], /age control: nothing visited/);
  assert.ok(aged.some(l => /ramp steps \(0, age control\)/.test(l)));
  assert.equal(aged[aged.length - 1], 'a comparison under unmatched ages, not an isolation');
});
test('a wedged run is named before its banked rows, and skipped rows print last', () => {
  const lines = residencyLines({ ...common, fresh: [], skipped: [{ id: 'caul', class: 'hold', note: 'walker could not hold the zone in 3 attempts' }] }, { note: 'beats stopped in jungle' });
  assert.equal(lines[1], 'WEDGED: beats stopped in jungle; the rows below are what the beats banked before the kill.');
  assert.equal(lines[lines.length - 1], 'skipped: caul [hold] walker could not hold the zone in 3 attempts');
});
