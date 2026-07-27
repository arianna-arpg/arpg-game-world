// ---------------------------------------------------------------------------
// THE PROBE RUNNER — `npm run probe`.
//
// balance/probe_*.ts are standalone rigs (boot the real engine headless, print
// PASS/FAIL, exit 0/1). This drives the GREEN ones off balance/proberoster.ts
// and fails loudly when any of them regresses — the standing gate the probes
// were always written to be, run by machine instead of by hand.
//
// THE CENSUS runs first, ALWAYS: the roster and the balance/ directory must
// agree exactly. An unenrolled probe or a row naming a missing file is a hard
// error (exit 2) before a single rig boots — the registry can never drift
// behind the disk, and a new probe cannot be forgotten into silence.
//
//   npm run probe                        the fast green lane (what CI runs)
//   npm run probe -- --slow              + the heavy green rigs (nightly)
//   npm run probe -- --all               every probe on disk, excluded included
//   npm run probe -- seas                only names containing 'seas'
//   npm run probe -- --jobs 1            one at a time, output streamed live
//   npm run probe -- --retries 0         first verdict is final (no re-runs)
//   npm run probe -- --list              print the roster and run nothing
//
// EXIT: 0 every selected green probe passed · 1 a green probe failed every
// attempt (or timed out) · 2 the census broke, the flags were nonsense, or
// nothing was selected. Excluded probes NEVER gate — under --all/--filter they
// are reported, and a deterministic red that now passes is called out as
// HEALED so its row can be promoted. A green probe that fails and then passes
// on a re-run does not fail the build but IS named as FLAKY (see THE RETRY).
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROBE_ROSTER, excludedProbes, greenProbes, type ProbeRow, type ProbeTier } from './proberoster';

const BALANCE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(BALANCE_DIR);

/** tsx's own CLI entry, resolved through its package exports (version-stable). */
const TSX_CLI = createRequire(import.meta.url).resolve('tsx/cli');

/** A probe that has not finished in this long is a failure, not a wait. */
const DEFAULT_TIMEOUT_SEC = 600;

/**
 * THE RETRY, and why it is not a loophole. A handful of rigs in this suite
 * carry unseeded nondeterminism at a few percent (the four loudest are
 * excluded by name in the roster; the tail is thinner and unmapped). Across
 * ~84 probes that tail alone reddens a run often enough to teach people to
 * ignore the gate — the one way a gate truly dies. So a FAILING GREEN probe
 * is re-run, and only a probe that fails EVERY attempt gates the build. A
 * genuine regression is deterministic: it fails every attempt and still stops
 * the build. A probe that fails then passes is NOT swallowed — it is named in
 * the summary as FLAKY with its fail lines, which is how the next one earns
 * its roster row. `--retries 0` restores strict first-verdict behaviour.
 */
const DEFAULT_RETRIES = 1;

// --- the flags ------------------------------------------------------------

interface Options {
  filter: string | null;
  all: boolean;
  slow: boolean;
  jobs: number;
  timeoutSec: number;
  list: boolean;
  retries: number;
}

function autoJobs(): number {
  return Math.max(1, Math.min(6, (cpus().length || 2) - 1));
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    filter: null, all: false, slow: false,
    jobs: autoJobs(), timeoutSec: DEFAULT_TIMEOUT_SEC, list: false,
    retries: DEFAULT_RETRIES,
  };
  // `--flag value` and `--flag=value` both read; an unknown flag is fatal
  // rather than silently ignored (a typo'd gate is a green gate that tests
  // nothing — the failure mode this whole runner exists to kill).
  const value = (i: number, inline: string | undefined, name: string): string => {
    const v = inline ?? argv[i + 1];
    if (v === undefined || v === '' || v.startsWith('--')) die(`--${name} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    // A bare word is the filter — `npm run probe -- seas` reads how it looks.
    if (!raw.startsWith('-')) { o.filter = raw; continue; }
    const eq = raw.indexOf('=');
    const name = (eq >= 0 ? raw.slice(0, eq) : raw).replace(/^--?/, '');
    const inline = eq >= 0 ? raw.slice(eq + 1) : undefined;
    switch (name) {
      case 'filter': case 'f': o.filter = value(i, inline, 'filter'); if (!inline) i++; break;
      case 'jobs': case 'j': {
        const n = Number(value(i, inline, 'jobs'));
        if (!Number.isInteger(n) || n < 1) die(`--jobs wants a positive integer, got "${n}"`);
        o.jobs = n; if (!inline) i++; break;
      }
      case 'timeout': {
        const n = Number(value(i, inline, 'timeout'));
        if (!Number.isFinite(n) || n <= 0) die(`--timeout wants seconds > 0, got "${n}"`);
        o.timeoutSec = n; if (!inline) i++; break;
      }
      case 'retries': {
        const n = Number(value(i, inline, 'retries'));
        if (!Number.isInteger(n) || n < 0) die(`--retries wants a non-negative integer, got "${n}"`);
        o.retries = n; if (!inline) i++; break;
      }
      case 'all': o.all = true; break;
      case 'slow': o.slow = true; break;
      case 'list': o.list = true; break;
      case 'help': case 'h': usage(); process.exit(0); break;
      default: die(`unknown flag "${raw}" (try --help)`);
    }
  }
  return o;
}

function usage(): void {
  console.log([
    'npm run probe -- [flags] [substr]',
    '',
    '  --filter <substr>  only probes whose file name contains <substr>',
    '                     (a bare word works too: `npm run probe -- seas`)',
    '  --slow             include the heavy green rigs (tier "slow")',
    '  --all              every probe on disk — excluded ones too (they never gate)',
    '  --jobs <n>         probes in flight at once (default: cores-1, capped 6; 1 streams live)',
    '  --timeout <sec>    per-probe ceiling (default 600)',
    `  --retries <n>      re-runs for a FAILING green probe (default ${DEFAULT_RETRIES}; 0 = first verdict is final)`,
    '  --list             print the roster and run nothing',
  ].join('\n'));
}

function die(msg: string): never {
  console.error(`probe: ${msg}`);
  process.exit(2);
}

// --- the census -----------------------------------------------------------

/**
 * The roster and the directory must name the same set — exits 2 (naming every
 * offender) if they disagree: no probe silently unrun, no row silently
 * pointing at nothing, no probe rostered twice.
 */
function census(): void {
  const onDisk = readdirSync(BALANCE_DIR).filter(f => /^probe_.+\.ts$/.test(f)).sort();
  const rostered = new Set(PROBE_ROSTER.map(r => r.probe));
  const unenrolled = onDisk.filter(f => !rostered.has(f));
  const missing = PROBE_ROSTER.filter(r => !onDisk.includes(r.probe)).map(r => r.probe);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of PROBE_ROSTER) {
    if (seen.has(r.probe)) dupes.push(r.probe);
    seen.add(r.probe);
  }

  if (unenrolled.length || missing.length || dupes.length) {
    console.error('probe: THE CENSUS FAILED — balance/proberoster.ts and balance/ disagree.\n');
    for (const f of unenrolled) console.error(`  UNENROLLED  ${f} — add a row (green + tier, or excluded + excuse + why)`);
    for (const f of missing) console.error(`  MISSING     ${f} — the roster names a file that is not on disk`);
    for (const f of dupes) console.error(`  DUPLICATE   ${f} — one row per probe`);
    process.exit(2);
  }
}

// --- selection ------------------------------------------------------------

function select(o: Options): ProbeRow[] {
  // A --filter is a NAMED ask: it reaches the whole roster, tier and status
  // alike (you asked for that rig by name — excluded rows still never gate).
  // Without one, the lanes decide: fast by default, + slow, + excluded.
  if (o.filter) {
    const named = PROBE_ROSTER.filter(r => r.probe.includes(o.filter!));
    if (!named.length) {
      console.error(`probe: --filter "${o.filter}" matches no probe. Try --list.`);
      process.exit(2);
    }
    return named;
  }
  const tiers: ProbeTier[] = o.all || o.slow ? ['fast', 'slow'] : ['fast'];
  const chosen = [...tiers.flatMap(t => greenProbes(t)), ...(o.all ? excludedProbes() : [])];
  if (!chosen.length) die('nothing selected — the roster has no green probes.');
  return chosen.sort((a, b) => a.probe.localeCompare(b.probe));
}

// --- running --------------------------------------------------------------

interface Attempt { code: number; timedOut: boolean; ms: number; output: string }
interface Result extends Attempt { row: ProbeRow; attempts: number; firstFail: string | null }

function runOnce(row: ProbeRow, o: Options, live: boolean): Promise<Attempt> {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, [TSX_CLI, path.join('balance', row.probe)], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    // Always CAPTURE (the summary re-prints the FAIL lines); at --jobs 1 also
    // ECHO as it arrives, so a single-file run streams the way a hand-run does.
    let output = '';
    const take = (d: Buffer): void => { output += d; if (live) process.stdout.write(d); };
    child.stdout?.on('data', take);
    child.stderr?.on('data', take);

    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, o.timeoutSec * 1000);
    child.on('error', err => {
      clearTimeout(timer);
      resolve({ code: 127, timedOut: false, ms: Date.now() - started, output: String(err) });
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, timedOut, ms: Date.now() - started, output });
    });
  });
}

const passed = (a: Attempt): boolean => a.code === 0 && !a.timedOut;

/**
 * One probe, plus THE RETRY: a failing GREEN probe is re-run up to o.retries
 * times, and the FIRST failure's lines are kept either way — a probe that
 * fails then passes still gets named as flaky. Excluded rows run once (they
 * gate nothing, so a second opinion buys nothing).
 */
async function runProbe(row: ProbeRow, o: Options, live: boolean): Promise<Result> {
  let a = await runOnce(row, o, live);
  const first = passed(a) ? null : failLines(a.output).join('\n      ') || `exit ${a.code}`;
  let attempts = 1;
  if (row.status === 'green') {
    while (!passed(a) && attempts <= o.retries) {
      attempts++;
      if (live) console.log(`\n───── ${row.probe} — re-run ${attempts}/${o.retries + 1} ─────`);
      a = await runOnce(row, o, live);
    }
  }
  return { ...a, row, attempts, firstFail: first };
}

/** PASS/FAIL tally from a probe's own printed lines (its exit code stays the verdict). */
function tally(output: string): string {
  const pass = (output.match(/^PASS\b/gm) ?? []).length;
  const fail = (output.match(/^FAIL\b/gm) ?? []).length;
  return pass || fail ? `${pass} pass, ${fail} fail` : '';
}

function failLines(output: string): string[] {
  return (output.split(/\r?\n/).filter(l => /^FAIL\b/.test(l)));
}

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

async function main(): Promise<void> {
  const o = parseArgs(process.argv.slice(2));
  census();

  if (o.list) {
    for (const r of PROBE_ROSTER) {
      const lane = r.status === 'green' ? `green/${r.tier}`.padEnd(12) : `EXCL/${r.excuse}`.padEnd(12);
      console.log(`${lane} ${r.probe.padEnd(30)} ${r.why}`);
    }
    console.log(`\n${PROBE_ROSTER.length} probes — ${greenProbes('fast').length} green/fast, `
      + `${greenProbes('slow').length} green/slow, ${excludedProbes('red').length} excluded/red, `
      + `${excludedProbes('flaky').length} excluded/flaky`);
    return;
  }

  const chosen = select(o);
  const live = o.jobs === 1;
  const started = Date.now();
  console.log(`probe: ${chosen.length} probe(s) via tsx, ${o.jobs} at a time`
    + `${o.filter ? `, filter "${o.filter}"` : ''}\n`);

  const results: Result[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < chosen.length) {
      const row = chosen[next++];
      if (live) console.log(`\n───── ${row.probe} ─────`);
      const r = await runProbe(row, o, live);
      results.push(r);
      const ok = passed(r);
      // A 'flaky' row passing is EXPECTED, not news — only a deterministic
      // red going green is a promotion signal worth shouting about.
      const mark = r.row.status === 'excluded'
        ? (ok ? (r.row.excuse === 'red' ? 'HEALED' : 'flaky ') : 'known ')
        : (ok ? (r.attempts > 1 ? 'FLAKY ' : 'PASS  ') : 'FAIL  ');
      const note = r.timedOut ? `TIMEOUT after ${o.timeoutSec}s` : tally(r.output);
      console.log(`${mark} ${secs(r.ms).padStart(6)}  ${r.row.probe.padEnd(30)} ${note}`
        + (ok && r.attempts > 1 ? `  (passed on attempt ${r.attempts})` : ''));
      if (!ok && !live) for (const l of failLines(r.output)) console.log(`         ${l}`);
      if (r.code === 127) console.log(`         could not launch: ${r.output.trim()}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(o.jobs, chosen.length) }, worker));

  // --- the verdict --------------------------------------------------------
  const green = results.filter(r => r.row.status === 'green');
  const broke = green.filter(r => !passed(r));
  const flaked = green.filter(r => passed(r) && r.attempts > 1);
  const passedOut = results.filter(r => r.row.status === 'excluded' && passed(r));
  const healed = passedOut.filter(r => r.row.status === 'excluded' && r.row.excuse === 'red');
  const stillOut = results.filter(r => r.row.status === 'excluded' && !passed(r));

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`${green.length - broke.length}/${green.length} green probes passed in ${secs(Date.now() - started)} wall clock.`);

  if (flaked.length) {
    console.log(`\nFLAKY — ${flaked.length} green probe(s) failed then PASSED on a re-run.`
      + ` Not a build failure, but not nothing: re-run each ~20× to put a rate on it,`
      + ` then give it an 'excluded'/'flaky' row in balance/proberoster.ts.`);
    for (const r of flaked) {
      console.log(`  ${r.row.probe} — first attempt said:`);
      console.log(`      ${r.firstFail}`);
    }
  }

  if (healed.length) {
    console.log(`\n${healed.length} EXCLUDED probe(s) marked 'red' now PASS — promote them in balance/proberoster.ts:`);
    for (const r of healed) console.log(`  ${r.row.probe}`);
  }
  if (passedOut.length > healed.length) {
    console.log(`\n${passedOut.length - healed.length} 'flaky' probe(s) passed this run — expected; only a repeat sweep can promote them.`);
  }
  if (stillOut.length) console.log(`\n${stillOut.length} excluded probe(s) still failing (expected — they do not gate).`);

  if (!o.all && !o.slow && !o.filter) {
    const skipped = greenProbes('slow').length;
    const excl = excludedProbes().length;
    if (skipped || excl) {
      console.log(`\nNot run: ${skipped} slow green probe(s) (--slow), ${excl} excluded probe(s) (--all).`);
    }
  }

  if (broke.length) {
    console.log(`\nREGRESSED — ${broke.length} green probe(s) failed`
      + `${o.retries ? ` every one of ${o.retries + 1} attempts` : ''}:`);
    for (const r of broke) {
      console.log(`  ${r.row.probe}${r.timedOut ? ' (TIMEOUT)' : ` (exit ${r.code})`}`);
      for (const l of failLines(r.output)) console.log(`      ${l}`);
      console.log(`      re-run: npx tsx balance/${r.row.probe}`);
    }
    process.exit(1);
  }
  console.log(flaked.length ? '\nALL GREEN (with flakes above)' : '\nALL GREEN');
}

await main();
