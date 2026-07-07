// ---------------------------------------------------------------------------
// BALANCE CLI — the Node entry point of the harness. Everything game-shaped
// lives in src/sim (browser-safe); this file is only argv, filesystem, and
// process exit codes.
//
//   npm run sim -- run --suite smoke
//   npm run sim -- run --scenario ttk_parity_warrior_l5 --seeds 20
//   npm run sim -- sweep skills --level 5 --seeds 5
//   npm run sim -- audit monsters --levels 1,5,10,20
//   npm run sim -- manifest
//   npm run sim -- compare balance/reports/A/report.json balance/reports/B/report.json
//   npm run sim -- baseline write --suite smoke
//   npm run sim -- baseline check --suite smoke
//
// Exit codes: 0 ok · 1 usage/internal error · 2 regression gate breached.
// Reports land in balance/reports/<name>_<stamp>/ (gitignored); baselines in
// balance/baselines/ (committed).
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CLASSES } from '../src/data/classes';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { BUILDS } from '../src/sim/data/builds';
import { SCENARIOS, SUITES } from '../src/sim/data/scenarios';
import { TARGETS, gradeReport } from '../src/sim/data/targets';
import { runScenario } from '../src/sim/runner';
import type { BuildSpec, EpisodeResult, ScenarioDef, ScenarioReport } from '../src/sim/types';

// ------------------------------------------------------------------- argv --

interface Args { _: string[]; flags: Record<string, string | boolean>; }

function parseArgs(argv: string[]): Args {
  const args: Args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) args.flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) args.flags[a.slice(2)] = argv[++i];
      else args.flags[a.slice(2)] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

const str = (v: string | boolean | undefined, dflt: string): string => (typeof v === 'string' ? v : dflt);
const num = (v: string | boolean | undefined, dflt: number): number => {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : dflt;
};

// ---------------------------------------------------------------- reports --

// npm scripts always run from the package root — the CLI leans on that (ESM
// context: no __dirname without ceremony).
const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'balance', 'reports');
const BASELINES_DIR = path.join(ROOT, 'balance', 'baselines');

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

interface SuiteResult {
  name: string;
  seeds: number;
  baseSeed: number;
  startedAt: string;
  scenarios: ScenarioReport[];
}

function writeReport(name: string, suite: SuiteResult, episodes: EpisodeResult[], outFlag?: string): string {
  const dir = outFlag ? path.resolve(outFlag) : path.join(REPORTS_DIR, `${name}_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(suite, null, 2));
  fs.writeFileSync(path.join(dir, 'episodes.json'), JSON.stringify(episodes, null, 2));
  fs.writeFileSync(path.join(dir, 'report.md'), suiteMarkdown(suite));
  return dir;
}

const HEADLINE = ['dps_out', 'dps_dummy', 'dps_in', 'ttk_wave_mean', 'kills', 'player_deaths', 'life_floor_pct'] as const;

function fmtCell(r: ScenarioReport, key: string): string {
  const m = r.metrics[key];
  if (!m || !Number.isFinite(m.mean)) return '—';
  const graded = r.grades?.[key];
  const flag = graded && !graded.startsWith('ok') ? ` ⚠${graded.split(' ')[0]}` : '';
  return m.sd > 0 ? `${m.mean}±${m.sd}${flag}` : `${m.mean}${flag}`;
}

function suiteMarkdown(suite: SuiteResult): string {
  const lines: string[] = [];
  lines.push(`# Balance report — ${suite.name}`);
  lines.push('');
  lines.push(`- started: ${suite.startedAt}`);
  lines.push(`- episodes per scenario: ${suite.seeds} (base seed ${suite.baseSeed})`);
  lines.push('');
  lines.push(`| scenario | ${HEADLINE.join(' | ')} | warnings |`);
  lines.push(`|---|${HEADLINE.map(() => '---').join('|')}|---|`);
  for (const r of suite.scenarios) {
    const warnCount = Object.values(r.warnings).reduce((a, b) => a + b, 0);
    lines.push(`| ${r.scenarioId} | ${HEADLINE.map(k => fmtCell(r, k)).join(' | ')} | ${warnCount || ''} |`);
  }
  lines.push('');
  const flagged = suite.scenarios.filter(r => r.grades && Object.values(r.grades).some(g => !g.startsWith('ok')));
  if (flagged.length) {
    lines.push('## Target-band flags');
    lines.push('');
    for (const r of flagged) {
      for (const [metric, grade] of Object.entries(r.grades!)) {
        if (grade.startsWith('ok')) continue;
        lines.push(`- **${r.scenarioId}** · ${metric} graded **${grade}** (mean ${r.metrics[metric]?.mean})`);
      }
    }
    lines.push('');
  }
  const warned = suite.scenarios.filter(r => Object.keys(r.warnings).length);
  if (warned.length) {
    lines.push('## Warnings');
    lines.push('');
    for (const r of warned) {
      for (const [w, n] of Object.entries(r.warnings)) lines.push(`- ${r.scenarioId}: ${w}${n > 1 ? ` (×${n})` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// -------------------------------------------------------------------- run --

function resolveScenarioList(args: Args): { name: string; defs: ScenarioDef[] } {
  const suiteFlag = args.flags.suite;
  const scenFlag = args.flags.scenario;
  if (typeof suiteFlag === 'string') {
    const ids = SUITES[suiteFlag];
    if (!ids) throw new Error(`unknown suite '${suiteFlag}' (have: ${Object.keys(SUITES).join(', ')})`);
    return { name: suiteFlag, defs: ids.map(id => SCENARIOS[id]).filter(Boolean) };
  }
  if (typeof scenFlag === 'string') {
    const defs = scenFlag.split(',').map(id => {
      const s = SCENARIOS[id.trim()];
      if (!s) throw new Error(`unknown scenario '${id.trim()}'`);
      return s;
    });
    return { name: defs.length === 1 ? defs[0].id : 'custom', defs };
  }
  throw new Error(`run needs --suite <name> or --scenario <id[,id…]>`);
}

function runDefs(name: string, defs: ScenarioDef[], seeds: number, baseSeed: number): { suite: SuiteResult; episodes: EpisodeResult[] } {
  const suite: SuiteResult = { name, seeds, baseSeed, startedAt: new Date().toISOString(), scenarios: [] };
  const allEpisodes: EpisodeResult[] = [];
  for (const def of defs) {
    const t0 = Date.now();
    const { report, episodes } = runScenario(def, { seeds, baseSeed });
    gradeReport(report);
    suite.scenarios.push(report);
    allEpisodes.push(...episodes);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ${def.id}: ${seeds} episode(s) in ${secs}s — dps_out ${report.metrics.dps_out?.mean ?? '—'}, kills ${report.metrics.kills?.mean ?? '—'}`);
  }
  return { suite, episodes: allEpisodes };
}

function cmdRun(args: Args): void {
  const { name, defs } = resolveScenarioList(args);
  const seeds = num(args.flags.seeds, 5);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  console.log(`Running ${defs.length} scenario(s) × ${seeds} seed(s)…`);
  const { suite, episodes } = runDefs(name, defs, seeds, baseSeed);
  const dir = writeReport(name, suite, episodes, str(args.flags.out, '') || undefined);
  console.log(`\n${suiteMarkdown(suite)}`);
  console.log(`Report: ${dir}`);
}

// ------------------------------------------------------------------ sweep --

/** Ten attributes at a flat 40 — clears requirement gates so a sweep measures
 *  the SKILL, not the class's ability to equip it. Documented rig, not a bug. */
const SWEEP_ATTRIBUTES: Record<string, number> = {
  strength: 40, prowess: 40, fortitude: 40,
  dexterity: 40, finesse: 40, charisma: 40,
  intelligence: 40, wisdom: 40, willpower: 40,
  vitality: 40,
};

function cmdSweep(args: Args): void {
  const what = args._[1] ?? 'skills';
  if (what !== 'skills') throw new Error(`sweep supports 'skills' (got '${what}')`);
  const level = num(args.flags.level, 5);
  const gemLevel = num(args.flags['gem-level'], Math.max(1, Math.floor(level / 3) + 1));
  const seeds = num(args.flags.seeds, 3);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const filter = str(args.flags.filter, '');
  const classOverride = str(args.flags.class, '');

  const defs: ScenarioDef[] = [];
  for (const [id, def] of Object.entries(SKILLS)) {
    const tags = def.tags as readonly string[];
    if (!tags.includes('attack') && !tags.includes('spell')) continue;
    if (filter && !id.includes(filter)) continue;
    const classId = classOverride || (tags.includes('spell') ? 'magician' : 'warrior');
    const build: BuildSpec = {
      id: `sweep_${id}_l${level}`,
      label: `solo ${id} @ L${level} (gem ${gemLevel})`,
      classId,
      level,
      attributes: SWEEP_ATTRIBUTES,
      skills: [{ id, level: gemLevel }],
    };
    defs.push({
      id: `sweep_dummy_${id}_l${level}`,
      label: `Sweep — solo ${id} vs dummy @ L${level}`,
      build,
      pilot: { kind: 'brawler' },
      waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
      duration: 20,
      stop: 'duration',
    });
  }
  console.log(`Sweeping ${defs.length} attack/spell skills × ${seeds} seed(s) @ character L${level}, gem L${gemLevel}…`);
  const { suite, episodes } = runDefs(`sweep_skills_l${level}`, defs, seeds, baseSeed);

  // Rank by dummy DPS — the sweep's whole point is the ORDERING + outliers.
  const ranked = [...suite.scenarios]
    .filter(r => r.metrics.dps_dummy)
    .sort((a, b) => (b.metrics.dps_dummy?.mean ?? 0) - (a.metrics.dps_dummy?.mean ?? 0));
  console.log('\nTop 10 by dps_dummy:');
  for (const r of ranked.slice(0, 10)) console.log(`  ${r.metrics.dps_dummy!.mean}\t${r.scenarioId}`);
  const dead = ranked.filter(r => (r.metrics.dps_dummy?.mean ?? 0) <= 0);
  if (dead.length) {
    console.log(`\n${dead.length} skill(s) produced ZERO dummy damage (gated kit, needs setup, or broken — triage list):`);
    for (const r of dead) console.log(`  ${r.scenarioId}`);
  }
  const dir = writeReport(`sweep_skills_l${level}`, suite, episodes, str(args.flags.out, '') || undefined);
  console.log(`\nReport: ${dir}`);
}

// ------------------------------------------------------------------ audit --

function cmdAudit(args: Args): void {
  const what = args._[1] ?? 'monsters';
  if (what !== 'monsters') throw new Error(`audit supports 'monsters' (got '${what}')`);
  const levels = str(args.flags.levels, '1,5,10,20,40').split(',').map(Number).filter(Number.isFinite);
  const filter = str(args.flags.filter, '');
  const world = makeSimWorld('warrior', 1);
  interface Row { id: string; level: number; life: number; armor: number; evasion: number; moveSpeed: number; xp: number; boss: boolean; passive: boolean }
  const rows: Row[] = [];
  for (const [id, def] of Object.entries(MONSTERS)) {
    if (filter && !id.includes(filter)) continue;
    for (const level of levels) {
      const a = world.createMonster(id, level, 'enemy'); // never pushed — a specimen
      rows.push({
        id, level,
        life: Math.round(a.maxLife()),
        armor: Math.round(a.sheet.get('armor')),
        evasion: Math.round(a.sheet.get('evasion')),
        moveSpeed: Math.round(a.sheet.get('moveSpeed')),
        xp: def.xp,
        boss: !!def.boss,
        passive: !!def.passive,
      });
    }
  }
  const dir = path.join(REPORTS_DIR, `audit_monsters_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'monsters.json'), JSON.stringify(rows, null, 2));
  const csv = ['id,level,life,armor,evasion,moveSpeed,xp,boss,passive',
    ...rows.map(r => `${r.id},${r.level},${r.life},${r.armor},${r.evasion},${r.moveSpeed},${r.xp},${r.boss},${r.passive}`)].join('\n');
  fs.writeFileSync(path.join(dir, 'monsters.csv'), csv);
  console.log(`Audited ${rows.length} monster×level rows → ${dir}`);
}

// --------------------------------------------------------------- manifest --

function cmdManifest(): void {
  bootSimEngine();
  const manifest = {
    classes: CLASSES.map(c => ({ id: c.id, bar: c.bar, startNode: c.startNode })),
    skills: Object.values(SKILLS).map(s => ({ id: s.id, tags: s.tags })),
    supports: Object.keys(SUPPORTS),
    monsters: Object.values(MONSTERS).map(m => ({
      id: m.id, xp: m.xp, boss: !!m.boss, passive: !!m.passive, spawner: !!m.spawner,
    })),
    builds: Object.keys(BUILDS),
    scenarios: Object.values(SCENARIOS).map(s => ({ id: s.id, label: s.label, duration: s.duration })),
    suites: SUITES,
    targets: TARGETS,
  };
  console.log(JSON.stringify(manifest, null, 2));
}

// ---------------------------------------------------- compare & baselines --

const GATE_METRICS = ['dps_out', 'dps_dummy', 'dps_in', 'ttk_wave_mean', 'kills', 'kill_rate', 'player_deaths', 'life_floor_pct'];

interface Deviation { scenarioId: string; metric: string; a: number; b: number; rel: number }

function compareSuites(a: SuiteResult, b: SuiteResult, tolerance: number, absEps: number): Deviation[] {
  const out: Deviation[] = [];
  const byId = new Map(a.scenarios.map(r => [r.scenarioId, r]));
  for (const rb of b.scenarios) {
    const ra = byId.get(rb.scenarioId);
    if (!ra) continue;
    for (const metric of GATE_METRICS) {
      const ma = ra.metrics[metric]?.mean;
      const mb = rb.metrics[metric]?.mean;
      if (ma === undefined || mb === undefined || !Number.isFinite(ma) || !Number.isFinite(mb)) continue;
      const rel = Math.abs(mb - ma) / Math.max(Math.abs(ma), 1e-9);
      if (rel > tolerance && Math.abs(mb - ma) > absEps) {
        out.push({ scenarioId: rb.scenarioId, metric, a: ma, b: mb, rel });
      }
    }
  }
  return out;
}

function printDeviations(devs: Deviation[]): void {
  if (!devs.length) { console.log('No gated metric moved beyond tolerance.'); return; }
  console.log(`${devs.length} gated metric(s) moved beyond tolerance:`);
  for (const d of devs) {
    const dir = d.b > d.a ? '↑' : '↓';
    console.log(`  ${d.scenarioId} · ${d.metric}: ${d.a} → ${d.b} (${dir}${Math.round(d.rel * 100)}%)`);
  }
}

function cmdCompare(args: Args): void {
  const [, fileA, fileB] = args._;
  if (!fileA || !fileB) throw new Error('compare needs two report.json paths');
  const a = JSON.parse(fs.readFileSync(fileA, 'utf8')) as SuiteResult;
  const b = JSON.parse(fs.readFileSync(fileB, 'utf8')) as SuiteResult;
  const devs = compareSuites(a, b, num(args.flags.tolerance, 0.15), num(args.flags['abs-eps'], 0.5));
  printDeviations(devs);
  if (devs.length) process.exitCode = 2;
}

function baselinePath(suiteName: string): string {
  return path.join(BASELINES_DIR, `${suiteName}.json`);
}

function cmdBaseline(args: Args): void {
  const mode = args._[1];
  const suiteName = str(args.flags.suite, 'smoke');
  const seeds = num(args.flags.seeds, 10);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const ids = SUITES[suiteName];
  if (!ids) throw new Error(`unknown suite '${suiteName}'`);
  const defs = ids.map(id => SCENARIOS[id]).filter(Boolean);
  console.log(`Baseline ${mode}: suite '${suiteName}' × ${seeds} seed(s)…`);
  const { suite } = runDefs(suiteName, defs, seeds, baseSeed);
  if (mode === 'write') {
    fs.mkdirSync(BASELINES_DIR, { recursive: true });
    fs.writeFileSync(baselinePath(suiteName), JSON.stringify(suite, null, 2));
    console.log(`Baseline written: ${baselinePath(suiteName)}`);
  } else if (mode === 'check') {
    const p = baselinePath(suiteName);
    if (!fs.existsSync(p)) throw new Error(`no baseline at ${p} — run 'baseline write --suite ${suiteName}' first`);
    const baseline = JSON.parse(fs.readFileSync(p, 'utf8')) as SuiteResult;
    if (baseline.seeds !== seeds || baseline.baseSeed !== baseSeed) {
      console.log(`note: baseline was ${baseline.seeds} seed(s) @ base ${baseline.baseSeed}; this check ran ${seeds} @ ${baseSeed}`);
    }
    const devs = compareSuites(baseline, suite, num(args.flags.tolerance, 0.15), num(args.flags['abs-eps'], 0.5));
    printDeviations(devs);
    if (devs.length) process.exitCode = 2;
  } else {
    throw new Error(`baseline needs 'write' or 'check'`);
  }
}

// ------------------------------------------------------------------- main --

const HELP = `Hollow Wake balance harness

  run       --suite <name> | --scenario <id[,id…]>   [--seeds N] [--base-seed N] [--out dir]
  sweep     skills  [--level N] [--gem-level N] [--class id] [--filter substr] [--seeds N]
  audit     monsters [--levels 1,5,10,20,40] [--filter substr]
  manifest  (JSON catalogs of everything runnable — for tooling/agents)
  compare   <a/report.json> <b/report.json> [--tolerance 0.15] [--abs-eps 0.5]
  baseline  write|check --suite <name> [--seeds N] [--tolerance 0.15]

Suites: ${Object.keys(SUITES).join(', ')}
Docs:   docs/balance/README.md · docs/balance/AGENT_PLAYBOOK.md`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  try {
    if (cmd === 'run') cmdRun(args);
    else if (cmd === 'sweep') cmdSweep(args);
    else if (cmd === 'audit') cmdAudit(args);
    else if (cmd === 'manifest') cmdManifest();
    else if (cmd === 'compare') cmdCompare(args);
    else if (cmd === 'baseline') cmdBaseline(args);
    else { console.log(HELP); if (cmd) process.exitCode = 1; }
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

main();
