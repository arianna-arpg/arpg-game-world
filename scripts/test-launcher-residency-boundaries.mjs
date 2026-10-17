// Pure CLI/failure artifact fixtures. No Electron/native lifecycle acceptance.
// UNRUN in the source-only handoff; original launcher residency tests unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { residencyFlagValue, parseResidencyFlags, failedResidencyReport, writeFailedResidencyReport } = require('../launcher/perfresidency.cjs');
const flags = argv => ({ fresh: residencyFlagValue(argv, '--fresh') !== null, ramp: residencyFlagValue(argv, '--ramp'), rampList: residencyFlagValue(argv, '--ramp-list'), rampAge: residencyFlagValue(argv, '--ramp-age-control') !== null, runSeed: residencyFlagValue(argv, '--run-seed'), configSeed: undefined, filter: '' });
test('actual new-flag suffix preserves extra equals for strict refusal', () => {
  assert.equal(residencyFlagValue(['--fresh', '--run-seed=7=garbage'], '--run-seed'), '7=garbage');
  assert.match(parseResidencyFlags(flags(['--fresh', '--run-seed=7=garbage'])).errors.join('|'), /must be a decimal/);
  assert.match(parseResidencyFlags(flags(['--ramp=8=garbage'])).errors.join('|'), /must be a positive integer/);
  assert.equal(residencyFlagValue(['--ramp-list=forest'], '--ramp'), null);
  assert.equal(parseResidencyFlags(flags(['--ramp=200'])).opts.rampSteps, 200);
  assert.match(parseResidencyFlags(flags(['--ramp=201'])).errors.join('|'), /in \[1, 200\]/);
});
test('normalized empty list segments are disclosed; effective baseline limit cannot be bypassed', () => {
  assert.deepEqual(parseResidencyFlags(flags(['--ramp-list= forest,,sandsea, '])).opts.rampList, ['forest', 'sandsea']);
  assert.match(parseResidencyFlags(flags(['--ramp-list=' + Array.from({ length: 200 }, (_, i) => 'id' + i).join(',')])).errors.join('|'), /plus baseline exceeds 200/);
});
test('ordinary later-start failure durably retains original failure and all banked raw rows', () => {
  const original = new Error('injected later native start failure');
  const raw = { arbitrary: { exact: [1.5, null, false] }, valid: false };
  const banked = { rows: [], control: raw, controlEnd: null, skipped: [], fresh: [raw], ramp: [], residencyWindows: [{ ingress: { campaignSec: 1.5 } }] };
  const opts = { course: 'fresh', seed: 0, seconds: 0.25 };
  const report = failedResidencyReport(opts, banked, original);
  assert.equal(report.validMeasurement, false); assert.equal(report.status, 'failed-partial');
  assert.equal(report.fresh[0], raw); assert.equal(report.failure.stack, original.stack);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'residency-failure-fixture-'));
  // Evidence is intentionally retained in a uniquely-created temporary root.
  const first = writeFailedResidencyReport(dir, opts, banked, original, { receipt: 'fixture' });
  const second = writeFailedResidencyReport(dir, opts, banked, original, { receipt: 'fixture' });
  assert.notEqual(first, second);
  const disk = JSON.parse(fs.readFileSync(path.join(first, 'report.json'), 'utf8'));
  assert.deepEqual(disk.report.fresh, banked.fresh); assert.deepEqual(disk.report.residencyWindows, banked.residencyWindows);
  assert.equal(disk.report.failure.message, original.message); assert.equal(disk.report.failure.stack, original.stack);
  assert.equal(disk.report.validMeasurement, false);
});
