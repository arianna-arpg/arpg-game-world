// ---------------------------------------------------------------------------
// THE UI LANE: the browser-driven harnesses (balance/*-ui.cjs) as a gate.
//
// Each harness boots the real built game in Electron and drives it. They were
// run BY HAND; this drives them off balance/uiroster.json, the same way
// balance/runprobes.ts drives the probes, and the daily full gate runs every
// green row (docs/ai/test-cadence.md).
//
// THE CENSUS runs first, ALWAYS: the roster and the directory must agree, so a
// new harness cannot be forgotten into silence.
//
// THE TWO STATUSES:
//   'green'    runs on the gate. A failure fails the full gate, and so blocks
//              publication.
//   'excluded' still runs under --all, never gates, and must say why (`excuse`
//              + `why`). An excluded row is a debt with a name. Never weaken a
//              harness's assertions to move a row from there to green.
//
//   node scripts/run-ui-lane.mjs                   every green row
//   node scripts/run-ui-lane.mjs --all             + the excluded rows (advisory)
//   node scripts/run-ui-lane.mjs --commit          the rows every push pays for
//   node scripts/run-ui-lane.mjs --shard 2/6       one disjoint slice
//   node scripts/run-ui-lane.mjs --filter cleave   names containing 'cleave'
//   node scripts/run-ui-lane.mjs --json out.json   also write the verdicts
//   node scripts/run-ui-lane.mjs --list            print the roster, run nothing
//
// On a display-less machine wrap the whole lane once: xvfb-run -a node ...
// Needs dist/ (npm run build) first, and an installed Electron binary.
//
// EXIT: 0 every selected green row passed, 1 one failed every attempt, 2 the
// census broke or the flags were nonsense.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROSTER_PATH = path.join('balance', 'uiroster.json');

export const UI_LANE_CFG = {
  /**
   * A harness's own timers are shorter; this only catches a hang. An exception
   * before a harness arms its timer leaves Electron showing a dialog forever.
   */
  timeoutSec: 300,
  /** Same law as the probe runner: only a harness failing every attempt gates. */
  retries: 1,
  /** How much of a failure to keep. Long enough for a stack, short enough for an issue. */
  failTailLines: 28,
};

const HARNESS_FILE = /-ui\.cjs$/;

export function censusProblems(rows, onDisk) {
  const problems = [];
  const named = new Set(rows.map(row => row.harness));
  for (const file of onDisk) if (!named.has(file)) problems.push(`UNENROLLED  ${file}: add a row to ${ROSTER_PATH}`);
  for (const row of rows) {
    if (!onDisk.includes(row.harness)) problems.push(`MISSING     ${row.harness}: the roster names a file that is not on disk`);
    if (row.status !== 'green' && row.status !== 'excluded') problems.push(`BAD STATUS  ${row.harness}: "${row.status}"`);
    if (row.status === 'excluded' && !(row.excuse && row.why)) problems.push(`NO EXCUSE   ${row.harness}: an excluded row must say why`);
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.harness)) problems.push(`DUPLICATE   ${row.harness}: one row per harness`);
    seen.add(row.harness);
  }
  return problems;
}

export function selectRows(rows, { all = false, commit = false, filter = null, shard = null } = {}) {
  // A filter is a NAMED ask: it reaches excluded rows too (they still never gate).
  const chosen = rows
    .filter(row => filter ? row.harness.includes(filter)
      : commit ? (row.commit && row.status === 'green')
        : (all || row.status === 'green'))
    .sort((a, b) => a.harness.localeCompare(b.harness));
  return shard ? chosen.filter((_, i) => i % shard.of === shard.index - 1) : chosen;
}

function parseArgs(argv) {
  const o = { all: false, commit: false, filter: null, shard: null, json: null, list: false, retries: UI_LANE_CFG.retries };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) die(`${flag} needs a value`);
      return value;
    };
    if (flag === '--all') o.all = true;
    else if (flag === '--commit') o.commit = true;
    else if (flag === '--list') o.list = true;
    else if (flag === '--filter') o.filter = next();
    else if (flag === '--json') o.json = next();
    else if (flag === '--retries') o.retries = Number(next());
    else if (flag === '--shard') {
      const m = /^(\d+)\/(\d+)$/.exec(next());
      if (!m || Number(m[1]) < 1 || Number(m[1]) > Number(m[2])) die('--shard wants i/n with 1 <= i <= n');
      o.shard = { index: Number(m[1]), of: Number(m[2]) };
    } else die(`unknown flag "${flag}"`);
  }
  if (!Number.isInteger(o.retries) || o.retries < 0) die('--retries wants a non-negative integer');
  return o;
}

function die(message) {
  console.error(`ui-lane: ${message}`);
  process.exit(2);
}

function runChild(command, args, timeoutSec) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    let output = '';
    const take = chunk => { output += chunk; };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutSec * 1000);
    child.on('error', error => {
      clearTimeout(timer);
      resolve({ code: 127, timedOut: false, sec: (Date.now() - started) / 1000, output: String(error) });
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, timedOut, sec: (Date.now() - started) / 1000, output });
    });
  });
}

/** A harness's real story is often in its own report log, not its stdout. */
function failTail(row, output) {
  // Chromium's D-Bus complaints on a runner would otherwise crowd out the finding.
  const lines = output.trimEnd().split(/\r?\n/).filter(line => line && !/dbus\/|'console-message' arguments/.test(line));
  const log = path.join(REPO_ROOT, 'balance', 'reports', row.harness.replace(/\.cjs$/, '.log'));
  if (existsSync(log)) lines.push(...readFileSync(log, 'utf8').trimEnd().split(/\r?\n/));
  return lines.slice(-UI_LANE_CFG.failTailLines).map(line => line.slice(0, 500));
}

/**
 * Many harnesses serve their own isolated build folder, so a working checkout's
 * dist/ can never be overwritten underneath them. One lane needs only one build,
 * so the folder they name becomes a link to it.
 */
function linkIsolatedDist(row) {
  if (!row.dist) return;
  const target = path.join(REPO_ROOT, row.dist);
  mkdirSync(path.dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  symlinkSync(path.join(REPO_ROOT, 'dist'), target, 'junction');
}

async function runRow(row, o, electron, tsxCli) {
  linkIsolatedDist(row);
  // Some harnesses read a catalog their sibling probe writes under balance/reports.
  for (const probe of row.before ?? []) {
    const before = await runChild(process.execPath, [tsxCli, path.join('balance', probe)], UI_LANE_CFG.timeoutSec);
    if (before.code !== 0) {
      return { attempt: { ...before, output: `prerequisite ${probe} failed\n${before.output}` }, attempts: 1, firstFail: null };
    }
  }
  const timeout = row.timeoutSec ?? UI_LANE_CFG.timeoutSec;
  const launch = () => runChild(electron, ['-r', path.join(REPO_ROOT, 'scripts', 'ui-lane-preload.cjs'), path.join('balance', row.harness)], timeout);
  let attempt = await launch();
  const ok = a => a.code === 0 && !a.timedOut;
  const firstFail = ok(attempt) ? null : failTail(row, attempt.output);
  let attempts = 1;
  if (row.status === 'green') {
    while (!ok(attempt) && attempts <= o.retries) {
      attempts++;
      attempt = await launch();
    }
  }
  return { attempt, attempts, firstFail };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const { rows } = JSON.parse(readFileSync(path.join(REPO_ROOT, ROSTER_PATH), 'utf8'));
  const onDisk = readdirSync(path.join(REPO_ROOT, 'balance')).filter(file => HARNESS_FILE.test(file)).sort();
  const problems = censusProblems(rows, onDisk);
  if (problems.length) {
    console.error(`ui-lane: THE CENSUS FAILED: ${ROSTER_PATH} and balance/ disagree.\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(2);
  }
  if (o.list) {
    for (const row of rows) console.log(`${(row.status === 'green' ? 'green' : `EXCL/${row.excuse}`).padEnd(14)} ${row.harness}${row.why ? `  ${row.why}` : ''}`);
    console.log(`\n${rows.length} harnesses, ${rows.filter(row => row.status === 'green').length} green`);
    return;
  }

  const selected = selectRows(rows, o);
  const require = createRequire(path.join(REPO_ROOT, 'package.json'));
  const electron = require('electron');
  const tsxCli = require.resolve('tsx/cli');
  if (typeof electron !== 'string') die('the Electron binary is not installed (node node_modules/electron/install.js)');
  console.log(`ui-lane: ${selected.length} harness(es), one at a time${o.shard ? `, shard ${o.shard.index}/${o.shard.of}` : ''}\n`);

  const started = Date.now();
  const results = [];
  for (const row of selected) {
    const { attempt, attempts, firstFail } = await runRow(row, o, electron, tsxCli);
    const passed = attempt.code === 0 && !attempt.timedOut;
    const gates = row.status === 'green';
    const verdict = gates ? (passed ? (attempts > 1 ? 'flaky' : 'pass') : 'fail') : (passed ? 'excluded-pass' : 'known');
    const failLines = passed ? (firstFail ?? []) : failTail(row, attempt.output);
    results.push({ name: row.harness, gates, verdict, attempts, sec: Math.round(attempt.sec * 10) / 10, timedOut: attempt.timedOut, failLines });
    console.log(`${verdict.toUpperCase().padEnd(13)} ${attempt.sec.toFixed(1).padStart(6)}s  ${row.harness}${attempt.timedOut ? ' (TIMEOUT)' : ''}`);
    if (!passed) for (const line of failLines) console.log(`         ${line}`);
  }

  const wallSec = Math.round((Date.now() - started) / 100) / 10;
  if (o.json) {
    mkdirSync(path.dirname(path.resolve(REPO_ROOT, o.json)), { recursive: true });
    writeFileSync(path.resolve(REPO_ROOT, o.json), JSON.stringify({ lane: 'ui', engine: 'electron', shard: o.shard, wallSec, results }, null, 1));
  }
  const failed = results.filter(r => r.verdict === 'fail');
  const healed = results.filter(r => r.verdict === 'excluded-pass');
  console.log(`\n${results.filter(r => r.gates).length - failed.length}/${results.filter(r => r.gates).length} green harnesses passed in ${wallSec}s.`);
  if (healed.length) console.log(`${healed.length} excluded harness(es) passed this run: ${healed.map(r => r.name).join(', ')}`);
  if (failed.length) {
    console.log(`\nREGRESSED: ${failed.length} green harness(es) failed every attempt:`);
    for (const r of failed) console.log(`  ${r.name}${r.timedOut ? ' (TIMEOUT)' : ''}`);
    process.exit(1);
  }
  console.log('\nALL GREEN');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
