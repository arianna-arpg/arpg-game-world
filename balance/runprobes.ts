// Current behavioral gate: npm run probe. Named filters still run specific rigs.
// Historical source/roster audit: npm run probe:history (add -- --slow for heavy rigs).
// Real player entry and Continue: npm run smoke:world after building.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROBE_ROSTER, excludedProbes, greenProbes, type ProbeRow, type ProbeTier } from './proberoster';
import {validateProbeSupersessions,resolveProbeExecution,probeExecutionLabel,probeRerunCommand,probeMatchesFilter} from './probesupersessions';

// The default gate tests current player behavior. Historical source receipts
// remain explicit opt-in work; they cannot certify that the game is playable.
const PLAYABLE_PROBES = new Set([
  'probe_skeletonwarrior.ts', 'probe_skeletonmage.ts', 'probe_skeletonarcher.ts',
  'probe_tutorialisolation.ts', 'probe_tutorialnative.ts',
  'probe_worldmass.ts', 'probe_worldmass_engine.ts', 'probe_worldmass_progression.ts',
  'probe_worldmass_bounties.ts', 'probe_worldmass_sideareas.ts', 'probe_worldmass_resumeworld.ts',
  'probe_sharddoor.ts', 'probe_shardcrossing.ts',
]);

const BALANCE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(BALANCE_DIR);

/** tsx's own CLI entry, resolved through its package exports (version-stable). */
const TSX_CLI = createRequire(import.meta.url).resolve('tsx/cli');

/** A probe that has not finished in this long is a failure, not a wait. */
const DEFAULT_TIMEOUT_SEC = 600;

// Fail on the first attempt by default; explicit retries remain diagnostic only.
const DEFAULT_RETRIES = 0;

// --- the flags ------------------------------------------------------------

interface Options {
  history: boolean;
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
    history: false,
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
      case 'history': o.history = true; break;
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
    '  default            eight current behavior courses; no automatic retries',
    '  --history          the complete historical green roster (source proofs included)',
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
 * Selected checks must exist and be unique. Only an explicit historical sweep
 * requires the whole archive and directory to agree; archival drift must not
 * prevent the current player-behavior gate from running.
 */
function census(rows: readonly ProbeRow[], fullArchive: boolean): void {
  const onDisk = readdirSync(BALANCE_DIR).filter(f => /^probe_.+\.ts$/.test(f)).sort();
  const rostered = new Set(rows.map(r => r.probe));
  const unenrolled = fullArchive ? onDisk.filter(f => !rostered.has(f)) : [];
  const missing = rows.filter(r => !onDisk.includes(r.probe)).map(r => r.probe);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of rows) {
    if (seen.has(r.probe)) dupes.push(r.probe);
    seen.add(r.probe);
  }

  if (unenrolled.length || missing.length || dupes.length) {
    console.error(`probe: THE CENSUS FAILED — ${fullArchive ? 'the full archive' : 'the selected checks'} and balance/ disagree.\n`);
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
    const named = PROBE_ROSTER.filter(r => probeMatchesFilter(r,o.filter!));
    if (!named.length) {
      console.error(`probe: --filter "${o.filter}" matches no probe. Try --list.`);
      process.exit(2);
    }
    return named;
  }
  if (!o.history && !o.all && !o.slow) {
    const chosen = PROBE_ROSTER.filter(r => PLAYABLE_PROBES.has(r.probe));
    if (chosen.length !== PLAYABLE_PROBES.size || chosen.some(r => r.status !== 'green'))
      die('The current behavior gate must name existing, required probes.');
    return chosen;
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
    let selected:ReturnType<typeof resolveProbeExecution>;
    try { selected = resolveProbeExecution(row, REPO_ROOT); }
    catch (error) {
      // A pin changing after preflight is this attempt's refusal, not a rejected
      // worker Promise that abandons other already-running probe children.
      resolve({code:2,timedOut:false,ms:0,output:'CURRENT-SUCCESSOR refused before launch: '+String(error)});
      return;
    }
    const started = Date.now();
    const child = spawn(process.execPath, [TSX_CLI, path.join('balance', selected.file), ...selected.args], {
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
      if (live) console.log(`\n───── ${probeExecutionLabel(row)} — re-run ${attempts}/${o.retries + 1} ─────`);
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
  const lines = output.trimEnd().split(/\r?\n/);
  const explicit = lines.filter(l => /^FAIL\b/.test(l));
  // AssertionError/throws need their stack and actual/expected values too.
  // A bounded tail avoids dumping large fixtures into parallel CI summaries.
  return (explicit.length ? explicit : lines.slice(-28)).map(l => l.slice(0, 500));
}

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

async function main(): Promise<void> {
  const o = parseArgs(process.argv.slice(2));
  const chosen = select(o);
  const fullArchive = o.history || o.all || o.slow;
  census(fullArchive ? PROBE_ROSTER : chosen, fullArchive);
  if (fullArchive) {
    try { validateProbeSupersessions(PROBE_ROSTER, REPO_ROOT); }
    catch (error) { die('historical supersession refused: ' + String(error)); }
  }

  if (o.list) {
    for (const r of chosen) {
      const lane = r.status === 'green' ? `green/${r.tier}`.padEnd(12) : `EXCL/${r.excuse}`.padEnd(12);
      console.log(`${lane} ${probeExecutionLabel(r).padEnd(30)} ${r.why}`);
    }
    console.log(`\n${chosen.length} selected; ${PROBE_ROSTER.length} in the full archive — ${greenProbes('fast').length} green/fast, `
      + `${greenProbes('slow').length} green/slow, ${excludedProbes('red').length} excluded/red, `
      + `${excludedProbes('flaky').length} excluded/flaky`);
    console.log('CURRENT-SUCCESSOR entries execute their named current checks; original probe/roster bytes are historical source checks only.');
    return;
  }

  const live = o.jobs === 1;
  const started = Date.now();
  console.log(`probe: ${chosen.length} probe(s) via tsx, ${o.jobs} at a time`
    + `${o.filter ? `, filter "${o.filter}"` : ''}\n`);

  const results: Result[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < chosen.length) {
      const row = chosen[next++];
      if (live) console.log(`\n───── ${probeExecutionLabel(row)} ─────`);
      const r = await runProbe(row, o, live);
      results.push(r);
      const ok = passed(r);
      // A 'flaky' row passing is EXPECTED, not news — only a deterministic
      // red going green is a promotion signal worth shouting about.
      const mark = r.row.status === 'excluded'
        ? (ok ? (r.row.excuse === 'red' ? 'HEALED' : 'flaky ') : 'known ')
        : (ok ? (r.attempts > 1 ? 'FLAKY ' : 'PASS  ') : 'FAIL  ');
      const note = r.timedOut ? `TIMEOUT after ${o.timeoutSec}s` : tally(r.output);
      console.log(`${mark} ${secs(r.ms).padStart(6)}  ${probeExecutionLabel(r.row).padEnd(30)} ${note}`
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

  const currentSuccessors = results.filter(r => probeExecutionLabel(r.row) !== r.row.probe);
  if (currentSuccessors.length) {
    console.log('CURRENT-SUCCESSOR: ' + currentSuccessors.length + ' roster row(s) selected named current checks; launch refusals count as failed attempts. Preserved historical source was not executed or counted as gameplay acceptance.');
    for (const r of currentSuccessors) console.log('  ' + probeExecutionLabel(r.row) + ': ' + (passed(r) ? 'current PASS' : 'current FAIL'));
  }

  if (flaked.length) {
    console.log(`\nFLAKY — ${flaked.length} green probe(s) failed then PASSED on a re-run.`
      + ` Not a build failure, but not nothing: re-run each ~20× to put a rate on it,`
      + ` then give it an 'excluded'/'flaky' row in balance/proberoster.ts.`);
    for (const r of flaked) {
      console.log(`  ${probeExecutionLabel(r.row)} — first attempt said:`);
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
    console.log(`\nNot selected: ${PROBE_ROSTER.length - chosen.length} historical/extended probes. Use a name filter or npm run probe:history.`);
  }

  if (broke.length) {
    console.log(`\nREGRESSED — ${broke.length} green probe(s) failed`
      + `${o.retries ? ` every one of ${o.retries + 1} attempts` : ''}:`);
    for (const r of broke) {
      console.log(`  ${probeExecutionLabel(r.row)}${r.timedOut ? ' (TIMEOUT)' : ` (exit ${r.code})`}`);
      for (const l of failLines(r.output)) console.log(`      ${l}`);
      console.log(`      re-run: ${probeRerunCommand(r.row)}`);
    }
    process.exit(1);
  }
  console.log(flaked.length ? '\nALL GREEN (with flakes above)' : '\nALL GREEN');
}

await main();
