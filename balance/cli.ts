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
import type { CharacterSave } from '../src/meta/character';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { entryClassId, entryLabel, entryLevel } from '../src/sim/builds';
import { BUILDS } from '../src/sim/data/builds';
import { PANELS, expandPanel, type ResolvedTarget } from '../src/sim/data/panels';
import {
  COMPAT_CFG, compatCensus, explainPair, makeProbeSession, pairKey, runCompatMatrix,
  type MatrixOpts, type MatrixResult, type PairDeepResult, type PairExplain, type PairProbeResult,
} from '../src/sim/compat';
import {
  adjudicate, checkLedger, emptyLedger, ledgerToJson, mergeProbed, reconcileLedger,
  rigMismatches, rigSignatureOf, validateLedger,
  type LedgerStatus, type ObservedMatrix, type RigSignature, type SupportLedger,
} from '../src/sim/ledger';
import { ECONOMY_CFG, auditAffixes, auditLoot, killDropExpectations, unreachableAffixes } from '../src/sim/economy';
import { gearedBuild, starterBuild } from '../src/sim/data/builds';
import { STARTER_CLASSES } from '../src/meta/account';
import { MATCHUP_CFG, SCENARIOS, SUITES, dummyDps, matchupDuel, parityPack, pilotFor } from '../src/sim/data/scenarios';
import { TARGETS, gradeReport } from '../src/sim/data/targets';
import { defenseProfiles, TEXTURE_CFG, type TextureId } from '../src/sim/textures';
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
/** csv of numbers; empty/blank pieces dropped (Number('') is 0 — the trap). */
const csvNums = (s: string): number[] =>
  s.split(',').map(x => x.trim()).filter(Boolean).map(Number).filter(Number.isFinite);

// ---------------------------------------------------------------- reports --

// npm scripts always run from the package root — the CLI leans on that (ESM
// context: no __dirname without ceremony).
const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'balance', 'reports');
const BASELINES_DIR = path.join(ROOT, 'balance', 'baselines');
const PLAYERS_DIR = path.join(ROOT, 'balance', 'players');
const SAVES_DIR = path.join(ROOT, 'saves');

// ------------------------------------------------------ save-backed builds --

const idSafe = (s: string): string => s.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');

function loadCharacterSave(file: string): CharacterSave {
  const save = JSON.parse(fs.readFileSync(file, 'utf8')) as CharacterSave;
  if (!save || typeof save.classId !== 'string' || !Number.isFinite(save.level)) {
    throw new Error(`${file} is not a CharacterSave (classId/level missing)`);
  }
  return save;
}

/** Every balance/players/*.json becomes a build id `player_<file>` — the
 *  standing library of ACTUAL player characters the harness measures against.
 *  Drop a save in, and every run/sweep/manifest sees it; a file that no
 *  longer parses warns and is skipped (never a hard failure — the library
 *  must not brick the CLI). */
function registerPlayerBuilds(): void {
  if (!fs.existsSync(PLAYERS_DIR)) return;
  for (const f of fs.readdirSync(PLAYERS_DIR).sort()) {
    if (!f.endsWith('.json')) continue;
    const id = `player_${idSafe(f)}`;
    try {
      const save = loadCharacterSave(path.join(PLAYERS_DIR, f));
      BUILDS[id] = { id, label: `${save.name || save.classId} L${save.level} (players/${f})`, fromSave: save };
    } catch (err) {
      console.error(`warning: balance/players/${f} skipped — ${(err as Error).message}`);
    }
  }
}

/** Resolve a build REFERENCE: a BUILDS registry id (player_* included), or
 *  `save:<slot|path>` which loads a live save slot / any CharacterSave file
 *  and registers it on the spot. Returns the registry id to run under. */
function resolveBuildRef(ref: string): string {
  if (BUILDS[ref]) return ref;
  if (ref.startsWith('save:')) {
    const target = ref.slice('save:'.length);
    const file = /^\d+$/.test(target)
      ? path.join(SAVES_DIR, `save_${target}.json`)
      : path.resolve(target);
    const save = loadCharacterSave(file);
    const id = `save_${idSafe(path.basename(file))}`;
    BUILDS[id] = { id, label: `${save.name || save.classId} L${save.level} (${path.basename(file)})`, fromSave: save };
    return id;
  }
  throw new Error(`unknown build '${ref}' — use a BUILDS id (see manifest) or save:<slot|path>`);
}

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
  let { name, defs } = resolveScenarioList(args);
  const seeds = num(args.flags.seeds, 5);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  // --as <build|save:ref>: the SAME questions, asked of a different character.
  // Ids are PREFIXED so target bands (which match by scenario-id prefix) never
  // grade a substituted run against reference-build expectations.
  const asFlag = str(args.flags.as, '');
  if (asFlag) {
    const buildId = resolveBuildRef(asFlag);
    const entry = BUILDS[buildId];
    const pilot = pilotFor(entryClassId(entry));
    defs = defs.map(d => ({ ...d, id: `as_${buildId}__${d.id}`, build: buildId, pilot }));
    name = `as_${buildId}__${name}`;
    console.log(`Substituting build '${buildId}' (${entryLabel(entry)}, L${entryLevel(entry)}) — pilot ${pilot.kind}; target bands do not apply.`);
  }
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
  if (what === 'skills') sweepSkills(args);
  else if (what === 'matchups') sweepMatchups(args);
  else if (what === 'supports') sweepSupports(args);
  else if (what === 'progression') sweepProgression(args);
  else throw new Error(`sweep supports 'skills', 'matchups', 'supports' or 'progression' (got '${what}')`);
}

/** THE POWER CURVE: the standard questions (dummy DPS + parity TTK) asked at
 *  every level band, bare and geared — per class. The table reads as player
 *  power progression; the geared÷bare column is the gear value curve. */
function sweepProgression(args: Args): void {
  const classes = str(args.flags.classes, '').split(',').map(s => s.trim()).filter(Boolean);
  const classIds = classes.length ? classes : [...STARTER_CLASSES];
  const levels = str(args.flags.levels, '1,5,10,20').split(',').map(Number).filter(Number.isFinite);
  const geared = !!args.flags.geared;
  const seeds = num(args.flags.seeds, 5);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);

  const defs: ScenarioDef[] = [];
  for (const classId of classIds) {
    for (const level of levels) {
      // Builds mint on demand — any level is a legal band, not just the
      // registry's canonical ones.
      const bare = starterBuild(classId, level);
      BUILDS[bare.id] ??= bare;
      defs.push(dummyDps(classId, level), parityPack(classId, level));
      if (geared && level > 1) {
        const g = gearedBuild(classId, level);
        BUILDS[g.id] ??= g;
        defs.push(dummyDps(classId, level, { tier: 'geared' }), parityPack(classId, level, { tier: 'geared' }));
      }
    }
  }
  console.log(`Progression: ${classIds.join(', ')} × L[${levels.join(', ')}]${geared ? ' × bare+geared' : ''} × ${seeds} seed(s) — ${defs.length * seeds} episode(s)…`);
  const runName = `progression_${classIds.join('_')}`;
  const { suite, episodes } = runDefs(runName, defs, seeds, baseSeed);
  const dir = writeReport(runName, suite, episodes, str(args.flags.out, '') || undefined);

  const cell = (id: string, metric: string): number | undefined =>
    suite.scenarios.find(r => r.scenarioId === id)?.metrics[metric]?.mean;
  for (const classId of classIds) {
    console.log(`\n${classId} — power curve:`);
    console.log(`  level   dps_dummy${geared ? '   geared      Δgear' : ''}   ttk_parity${geared ? '  geared' : ''}   life_floor%`);
    for (const level of levels) {
      const dps = cell(`dummy_dps_${classId}_l${level}`, 'dps_dummy');
      const gdps = geared ? cell(`dummy_dps_geared_${classId}_l${level}`, 'dps_dummy') : undefined;
      const ttk = cell(`ttk_parity_${classId}_l${level}`, 'ttk_wave_mean');
      const gttk = geared ? cell(`ttk_parity_geared_${classId}_l${level}`, 'ttk_wave_mean') : undefined;
      const floor = cell(`ttk_parity_${classId}_l${level}`, 'life_floor_pct');
      const gearMul = dps && gdps ? `${(gdps / Math.max(dps, 1e-9)).toFixed(2)}×` : '';
      console.log(`  ${String(level).padStart(5)}${String(dps ?? '—').padStart(12)}${geared ? String(gdps ?? '—').padStart(9) + gearMul.padStart(11) : ''}${String(ttk ?? '—').padStart(13)}${geared ? String(gttk ?? '—').padStart(8) : ''}${String(floor ?? '—').padStart(14)}`);
    }
  }
  console.log(`\nReport: ${dir}`);
}

/** Parse a target spec: `panel:<id>` (resolved through the live classifier)
 *  or a csv of `monsterId[:level]`. One vocabulary for every enemy-facing
 *  sweep, so panels and ad-hoc lists are interchangeable. */
function resolveTargets(spec: string, atLevel?: number): { targets: ResolvedTarget[]; warnings: string[]; tag: string } {
  if (spec.startsWith('panel:')) {
    const pid = spec.slice('panel:'.length);
    const panel = PANELS[pid];
    if (!panel) throw new Error(`unknown panel '${pid}' (have: ${Object.keys(PANELS).join(', ')})`);
    const world = makeSimWorld('warrior', 1);
    const { targets, warnings } = expandPanel(world, panel, atLevel);
    if (!targets.length) throw new Error(`panel '${pid}' resolved to no targets`);
    return { targets, warnings, tag: pid };
  }
  const targets: ResolvedTarget[] = [];
  for (const part of spec.split(',').map(s => s.trim()).filter(Boolean)) {
    const [id, lvl] = part.split(':');
    if (!MONSTERS[id]) throw new Error(`unknown monster '${id}'`);
    targets.push({ monsterId: id, level: lvl ? Number(lvl) : atLevel ?? TEXTURE_CFG.probeLevel, count: 1, via: 'literal' });
  }
  if (!targets.length) throw new Error(`'${spec}' resolved to no targets`);
  return { targets, warnings: [], tag: targets.map(t => t.monsterId).join('+') };
}

/** Console + JSON matchup matrix: the texture-interaction picture at a glance.
 *  edps_cycle_mean is the cell; a zero beside living columns is a WALL. */
interface MatrixRow { rowId: string; cells: Record<string, ScenarioReport | undefined> }
function printMatrix(rows: MatrixRow[], cols: string[], metric = 'edps_cycle_mean'): void {
  const val = (r: MatrixRow, c: string): number => r.cells[c]?.metrics[metric]?.mean ?? 0;
  const sorted = [...rows].sort((a, b) =>
    cols.reduce((s, c) => s + val(b, c), 0) - cols.reduce((s, c) => s + val(a, c), 0));
  const head = ['skill/build'.padEnd(28), ...cols.map(c => c.slice(0, 14).padStart(15)), 'spread'.padStart(8)];
  console.log(`\n${metric} matrix:`);
  console.log(`  ${head.join('')}`);
  for (const r of sorted.slice(0, 20)) {
    const vals = cols.map(c => val(r, c));
    const live = vals.filter(v => v > 0);
    const spread = !live.length ? '—'
      : live.length < vals.length ? '∞ WALL'
        : (Math.max(...live) / Math.max(Math.min(...live), 1e-9)).toFixed(1) + '×';
    console.log(`  ${r.rowId.slice(0, 27).padEnd(28)}${vals.map(v => String(Math.round(v * 10) / 10).padStart(15)).join('')}${spread.padStart(8)}`);
  }
  if (sorted.length > 20) console.log(`  … ${sorted.length - 20} more row(s) in matrix.json`);
}

function writeMatrix(dir: string, rows: MatrixRow[], cols: string[], context: Record<string, unknown>): void {
  const flat = rows.map(r => ({
    rowId: r.rowId,
    cells: Object.fromEntries(cols.map(c => [c, r.cells[c] ? {
      edps_cycle_mean: r.cells[c]!.metrics.edps_cycle_mean?.mean ?? 0,
      ttk_wave_mean: r.cells[c]!.metrics.ttk_wave_mean?.mean,
      kills: r.cells[c]!.metrics.kills?.mean,
      dps_in: r.cells[c]!.metrics.dps_in?.mean,
      life_floor_pct: r.cells[c]!.metrics.life_floor_pct?.mean,
      player_deaths: r.cells[c]!.metrics.player_deaths?.mean,
      scenarioId: r.cells[c]!.scenarioId,
    } : null])),
  }));
  fs.writeFileSync(path.join(dir, 'matrix.json'), JSON.stringify({ ...context, columns: cols, rows: flat }, null, 2));
}

function sweepSkills(args: Args): void {
  const level = num(args.flags.level, 5);
  const gemLevel = num(args.flags['gem-level'], Math.max(1, Math.floor(level / 3) + 1));
  const seeds = num(args.flags.seeds, 3);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const filter = str(args.flags.filter, '');
  const classOverride = str(args.flags.class, '');
  // --vs: swap the immortal dummy for killable respawn-duels against a panel
  // or an explicit target list — the skill × enemy-texture matrix.
  const vsFlag = str(args.flags.vs, '');
  const vs = vsFlag ? resolveTargets(vsFlag, num(args.flags['target-level'], level)) : null;
  if (vs) for (const w of vs.warnings) console.log(`panel note: ${w}`);

  const rigs: { skillId: string; build: BuildSpec }[] = [];
  for (const [id, def] of Object.entries(SKILLS)) {
    const tags = def.tags as readonly string[];
    if (!tags.includes('attack') && !tags.includes('spell')) continue;
    if (filter && !id.includes(filter)) continue;
    const classId = classOverride || (tags.includes('spell') ? 'magician' : 'warrior');
    rigs.push({
      skillId: id,
      build: {
        id: `sweep_${id}_l${level}`,
        label: `solo ${id} @ L${level} (gem ${gemLevel})`,
        classId,
        level,
        attributes: SWEEP_ATTRIBUTES,
        skills: [{ id, level: gemLevel }],
      },
    });
  }

  const defs: ScenarioDef[] = [];
  const cellOf = new Map<string, { row: string; col: string }>();
  for (const rig of rigs) {
    if (!vs) {
      defs.push({
        id: `sweep_dummy_${rig.skillId}_l${level}`,
        label: `Sweep — solo ${rig.skillId} vs dummy @ L${level}`,
        build: rig.build,
        pilot: { kind: 'brawler' },
        waves: [{ monsters: [{ id: 'target_dummy', level: 1 }], distance: 70 }],
        duration: 20,
        stop: 'duration',
      });
    } else {
      for (const tgt of vs.targets) {
        const col = `${tgt.monsterId}${tgt.rarity && tgt.rarity !== 'normal' ? `_${tgt.rarity}` : ''}`;
        const id = `sweep_vs_${col}_${rig.skillId}_l${level}`;
        cellOf.set(id, { row: rig.skillId, col });
        defs.push({
          id,
          label: `Sweep — solo ${rig.skillId} vs ${tgt.monsterId} @ L${level}`,
          build: rig.build,
          pilot: { kind: 'brawler' },
          waves: [{
            monsters: [{ id: tgt.monsterId, level: tgt.level, count: tgt.count, ...(tgt.rarity ? { rarity: tgt.rarity } : {}) }],
            respawnOnClear: MATCHUP_CFG.respawnDelay,
          }],
          duration: num(args.flags.duration, 25),
          stop: 'duration',
        });
      }
    }
  }
  const runName = vs ? `sweep_skills_vs_${idSafe(vs.tag)}_l${level}` : `sweep_skills_l${level}`;
  console.log(`Sweeping ${rigs.length} attack/spell skill(s)${vs ? ` × ${vs.targets.length} target(s)` : ' vs dummy'} × ${seeds} seed(s) @ character L${level}, gem L${gemLevel} — ${defs.length * seeds} episode(s)…`);
  const { suite, episodes } = runDefs(runName, defs, seeds, baseSeed);
  const dir = writeReport(runName, suite, episodes, str(args.flags.out, '') || undefined);

  if (!vs) {
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
  } else {
    const cols = [...new Set([...cellOf.values()].map(c => c.col))];
    const byRow = new Map<string, MatrixRow>();
    for (const r of suite.scenarios) {
      const cell = cellOf.get(r.scenarioId);
      if (!cell) continue;
      const row = byRow.get(cell.row) ?? { rowId: cell.row, cells: {} };
      row.cells[cell.col] = r;
      byRow.set(cell.row, row);
    }
    printMatrix([...byRow.values()], cols);
    writeMatrix(dir, [...byRow.values()], cols, { kind: 'sweep_skills_vs', level, gemLevel, seeds, targets: vs.tag });
  }
  console.log(`\nReport: ${dir}`);
}

// ------------------------------------------------- the support matrix runs --

/** One option parser for every matrix surface (sweep supports, matrix check)
 *  — the flags are the vocabulary, shared verbatim. */
function matrixOptsFrom(args: Args): MatrixOpts {
  const opts: MatrixOpts = {
    skillFilter: str(args.flags.filter, ''),
    supportFilter: str(args.flags.support, ''),
    level: num(args.flags.level, COMPAT_CFG.level),
    supportLevel: num(args.flags['support-level'], COMPAT_CFG.supportLevel),
    seeds: num(args.flags.seeds, 1),
    baseSeed: num(args.flags['base-seed'], 0xc0ffee),
    budget: num(args.flags.budget, COMPAT_CFG.budgetEpisodes),
    staticOnly: !!args.flags['static-only'],
    deep: !!args.flags.deep,
  };
  if (typeof args.flags['gem-level'] === 'string') opts.gemLevel = num(args.flags['gem-level'], 1);
  if (typeof args.flags.duration === 'string') opts.duration = num(args.flags.duration, COMPAT_CFG.dummyDuration);
  const shard = str(args.flags.shard, '');
  if (shard) {
    const m = /^(\d+)\/(\d+)$/.exec(shard);
    if (!m) throw new Error(`--shard wants i/n (e.g. 2/5), got '${shard}'`);
    opts.shard = { index: Number(m[1]), of: Number(m[2]) };
  }
  return opts;
}

/** The serializable half of MatrixOpts (callbacks and sets stripped) —
 *  stored in every artifact so a run explains its own rig. */
function matrixOptsOut(opts: MatrixOpts): Record<string, unknown> {
  const out: Record<string, unknown> = { ...opts };
  delete out.onPair;
  delete out.onDeep;
  delete out.skipPairs;
  out.pairs = opts.pairs?.length;
  return out;
}

interface ResumeData { rig: RigSignature | null; pairs: PairProbeResult[]; deep: PairDeepResult[] }

/** Read a prior run's verdicts (verdicts.jsonl preferred; compat.json
 *  fallback) — the resume/merge input. Tolerant line parse: a truncated
 *  final line (killed run) is exactly the case this exists for. */
function readRunDir(ref: string): ResumeData {
  const dir = path.resolve(ref);
  const jsonl = fs.statSync(dir).isDirectory() ? path.join(dir, 'verdicts.jsonl') : dir;
  const out: ResumeData = { rig: null, pairs: [], deep: [] };
  if (fs.existsSync(jsonl)) {
    for (const line of fs.readFileSync(jsonl, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let row: { kind?: string } & Record<string, unknown>;
      try { row = JSON.parse(line); } catch { continue; } // truncated tail line
      if (row.kind === 'header') out.rig = row.rig as RigSignature;
      else if (row.kind === 'pair') out.pairs.push(row.pair as PairProbeResult);
      else if (row.kind === 'deep') out.deep.push(row.deep as PairDeepResult);
    }
    return out;
  }
  const compatJson = path.join(dir, 'compat.json');
  if (fs.existsSync(compatJson)) {
    const data = JSON.parse(fs.readFileSync(compatJson, 'utf8')) as {
      rig?: RigSignature; probed?: PairProbeResult[]; deep?: PairDeepResult[];
    };
    out.rig = data.rig ?? null;
    out.pairs = data.probed ?? [];
    out.deep = data.deep ?? [];
    return out;
  }
  throw new Error(`no verdicts.jsonl or compat.json under '${ref}'`);
}

/** Rig guard: verdicts only merge/resume across IDENTICAL probe rigs —
 *  different rigs answer different questions. --force overrides, loudly. */
function guardRig(args: Args, mine: RigSignature, theirs: RigSignature | null, what: string): void {
  if (!theirs) {
    console.log(`  note: ${what} carries no rig signature (old artifact) — proceeding on trust`);
    return;
  }
  const bad = rigMismatches(mine, theirs);
  if (!bad.length) return;
  const msg = `${what} was run under a different rig (${bad.map(k => `${k}: ${String(theirs[k])} vs ${String(mine[k])}`).join(', ')})`;
  if (args.flags.force) console.log(`  WARNING: ${msg} — --force mixes them anyway`);
  else throw new Error(`${msg} — match the flags or pass --force`);
}

interface MatrixRunOut {
  result: MatrixResult;
  opts: MatrixOpts;
  dir: string;
  /** Fresh + resumed verdicts (what checks and reports consume). */
  probedAll: PairProbeResult[];
  deepAll: PairDeepResult[];
}

/** The one matrix runner: census preview, resume fold-in, incremental
 *  verdicts.jsonl (every finished pair lands on disk — a killed run resumes
 *  instead of restarting), artifacts, coverage-honest summary line. */
function runMatrixToDir(args: Args, opts: MatrixOpts, namePrefix: string): MatrixRunOut {
  const rig = rigSignatureOf(opts);
  // Resume: prior verdicts skip re-probing and re-emit into THIS run's
  // artifacts, so every run directory is self-contained and chain-resumable.
  const resumeRef = str(args.flags.resume, '');
  const resumed: ResumeData = resumeRef ? readRunDir(resumeRef) : { rig: null, pairs: [], deep: [] };
  if (resumeRef) {
    guardRig(args, rig, resumed.rig, `--resume ${resumeRef}`);
    console.log(`Resuming: ${resumed.pairs.length} pair verdict(s) + ${resumed.deep.length} deep result(s) carried from ${resumeRef}`);
    opts.skipPairs = new Set(resumed.pairs.map(p => pairKey(p.skillId, p.supportId)));
  }

  // The census is free — print its shape and the probe bill before running.
  const census = compatCensus(opts.skillFilter ?? '', opts.supportFilter ?? '');
  const eligible = census.rows.filter(r => r.fit !== 'refused').length;
  console.log(`Census: ${census.skills.length} droppable skill(s) × ${census.supports.length} support(s) = ${census.rows.length} pair(s)`);
  console.log(`  fits host lane: ${census.counts.host} · via crew only: ${census.counts.crew} · refused: ${census.counts.refused}`);
  console.log(`  refused-but-mechanically-affine (tag-hygiene suspects): ${census.counts.suspects}`);
  console.log(`  fitting pairs carrying an unread delivery-scoped payload: ${census.counts.unreadPairs}`);
  if (!opts.staticOnly) {
    const seeds = opts.seeds ?? 1;
    const scopeGuess = opts.shard ? Math.ceil(eligible / opts.shard.of) : eligible;
    const worst = scopeGuess * seeds + census.skills.length * seeds;
    console.log(`Probing up to ${scopeGuess} pair(s)${opts.shard ? ` (shard ${opts.shard.index}/${opts.shard.of})` : ''} × ${seeds} seed(s) (+bare baselines) — worst case ~${worst} episode(s), budget ${opts.budget}.`);
    if (worst > (opts.budget ?? Infinity)) {
      console.log(`  budget covers ~${Math.round(((opts.budget ?? 0) / worst) * 100)}% — probes round-robin across supports; narrow with --filter/--support, shard with --shard i/n, or raise --budget.`);
    }
    if (opts.deep) console.log(`  deep lane ON: divergent pairs additionally bill ~units × seeds episodes each.`);
  }

  const dir = str(args.flags.out, '') ? path.resolve(str(args.flags.out, '')) : path.join(REPORTS_DIR, `${namePrefix}_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  const jsonl = path.join(dir, 'verdicts.jsonl');
  fs.writeFileSync(jsonl, JSON.stringify({ kind: 'header', rig, opts: matrixOptsOut(opts) }) + '\n');
  for (const p of resumed.pairs) fs.appendFileSync(jsonl, JSON.stringify({ kind: 'pair', pair: p }) + '\n');
  for (const d of resumed.deep) fs.appendFileSync(jsonl, JSON.stringify({ kind: 'deep', deep: d }) + '\n');
  opts.onPair = p => fs.appendFileSync(jsonl, JSON.stringify({ kind: 'pair', pair: p }) + '\n');
  opts.onDeep = d => fs.appendFileSync(jsonl, JSON.stringify({ kind: 'deep', deep: d }) + '\n');

  const t0 = Date.now();
  const result = runCompatMatrix(opts, msg => console.log(msg));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const merged = mergeProbed([result.probed, resumed.pairs]);
  if (merged.conflicts.length) {
    console.error(`  WARNING: ${merged.conflicts.length} verdict conflict(s) between this run and the resume — mixed code or rigs?`);
  }
  const probedAll = merged.probed;
  const deepAll = [...(result.deep ?? []), ...resumed.deep];
  console.log(`Matrix done in ${secs}s: ${result.probed.length} pair(s) probed fresh + ${result.resumed} resumed`
    + ` (scope ${result.scope} of ${result.eligible} eligible), ${result.episodesRun} episode(s),`
    + ` ${result.skipped} budget-skipped${opts.deep ? `, deep ${deepAll.length} pair(s) (+${result.deepSkipped} unaffordable)` : ''}.`);

  writeMatrixArtifacts(dir, result, opts, rig, probedAll, deepAll);
  return { result, opts, dir, probedAll, deepAll };
}

function writeMatrixArtifacts(
  dir: string, result: MatrixResult, opts: MatrixOpts, rig: RigSignature,
  probedAll: PairProbeResult[], deepAll: PairDeepResult[],
): void {
  fs.writeFileSync(path.join(dir, 'compat.json'), JSON.stringify({
    cfg: result.cfg, opts: matrixOptsOut(opts), rig, counts: result.census.counts,
    eligible: result.eligible, scope: result.scope, resumed: result.resumed,
    episodesRun: result.episodesRun, skipped: result.skipped, deepSkipped: result.deepSkipped,
    probed: probedAll,
    deep: deepAll.length ? deepAll : undefined,
    suspects: result.census.rows.filter(r => r.suspect),
  }, null, 2));
  const byKey = new Map(probedAll.map(p => [pairKey(p.skillId, p.supportId), p]));
  const csv = ['skill,support,fit,verdict,probe,identical_seeds,d_output_rel,top_moved,unread',
    ...result.census.rows.map(r => {
      const p = byKey.get(pairKey(r.skillId, r.supportId));
      return [r.skillId, r.supportId, r.fit,
        p?.verdict ?? (r.fit === 'refused' ? (r.suspect ? 'refused_suspect' : 'refused') : 'unprobed'),
        p?.probe ?? '', p ? `${p.identicalSeeds}/${p.seeds}` : '',
        p?.dOutputRel ?? '', p?.moved[0]?.key ?? '',
        (r.unread ?? []).map(u => u.key).join('+')].join(',');
    })].join('\n');
  fs.writeFileSync(path.join(dir, 'census.csv'), csv);
  fs.writeFileSync(path.join(dir, 'report.md'), compatMarkdown(result, probedAll, deepAll));
}

/** THE SKILL × SUPPORT MATRIX (src/sim/compat.ts): census every pair through
 *  the real socket gate, then A/B-probe fitting pairs — bare vs socketed at
 *  the same seed — and classify: effective / cost_only / negligible / INERT
 *  (byte-identical fingerprint). The triage report is the deliverable; the
 *  LEDGER GATE over the same run is `matrix check`. */
function sweepSupports(args: Args): void {
  const opts = matrixOptsFrom(args);
  const { result, dir, probedAll, deepAll } = runMatrixToDir(args, opts, 'compat_supports');

  // ---- console triage -------------------------------------------------------
  const by = (v: string): PairProbeResult[] => probedAll.filter(p => p.verdict === v);
  const inert = by('inert'), costOnly = by('cost_only');
  console.log(`\nVerdicts: effective ${by('effective').length} · inert ${inert.length} · cost_only ${costOnly.length} · negligible ${by('negligible').length} · blind ${by('blind').length}`);
  if (inert.length) {
    console.log(`\nINERT pairs (socket accepted, byte-identical episodes — the bug list):`);
    for (const p of inert.slice(0, 25)) {
      const why = p.unread?.length ? ` — static: '${p.unread.map(u => u.key).join("','")}' unread on this delivery` : '';
      console.log(`  ${p.skillId} + ${p.supportId}${why}`);
    }
    if (inert.length > 25) console.log(`  … ${inert.length - 25} more in report.md`);
  }
  if (costOnly.length) {
    console.log(`\nCOST-ONLY pairs (tax moved, no observed function — partial no-ops):`);
    for (const p of costOnly.slice(0, 15)) console.log(`  ${p.skillId} + ${p.supportId} (${p.moved[0]?.key ?? '?'} moved)`);
    if (costOnly.length > 15) console.log(`  … ${costOnly.length - 15} more in report.md`);
  }
  const partial = deepAll.filter(d => d.units.some(u => u.verdict === 'dead' && !u.unit.compositional));
  if (partial.length) {
    console.log(`\nPARTIAL pairs (effective overall, dead unit(s) inside — the deep lane's catch):`);
    for (const d of partial.slice(0, 15)) {
      const dead = d.units.filter(u => u.verdict === 'dead' && !u.unit.compositional).map(u => u.unit.key);
      console.log(`  ${d.skillId} + ${d.supportId} — dead: ${dead.join(', ')}`);
    }
    if (partial.length > 15) console.log(`  … ${partial.length - 15} more in report.md`);
  }
  const suspects = result.census.rows.filter(r => r.suspect);
  if (suspects.length) {
    console.log(`\nREFUSED-SUSPECT pairs (mechanically affine, tag list refuses — triage for tag hygiene):`);
    const bySupport = new Map<string, string[]>();
    for (const s of suspects) {
      const list = bySupport.get(s.supportId) ?? [];
      list.push(s.skillId);
      bySupport.set(s.supportId, list);
    }
    for (const [sup, skills] of [...bySupport.entries()].slice(0, 12)) {
      console.log(`  ${sup}: ${skills.slice(0, 6).join(', ')}${skills.length > 6 ? ` (+${skills.length - 6})` : ''}`);
    }
  }
  console.log(`\nReport: ${dir}`);
  console.log(`Gate this run against the ledger: npm run sim -- matrix check [same flags]`);
}

function compatMarkdown(result: MatrixResult, probedAll: PairProbeResult[], deepAll: PairDeepResult[]): string {
  const L: string[] = [];
  const probedBy = (v: string) => probedAll.filter(p => p.verdict === v);
  L.push(`# Skill × support interaction matrix`);
  L.push('');
  L.push(`- pairs: ${result.census.rows.length} (${result.census.skills.length} skills × ${result.census.supports.length} supports)`);
  L.push(`- fits: host ${result.census.counts.host} · crew ${result.census.counts.crew} · refused ${result.census.counts.refused} (suspects ${result.census.counts.suspects})`);
  L.push(`- coverage: ${probedAll.length} verdict(s) held (${result.probed.length} fresh + ${result.resumed} resumed) over scope ${result.scope} of ${result.eligible} eligible — ${result.episodesRun} episodes; ${result.skipped} budget-skipped`);
  L.push(`- verdicts: effective ${probedBy('effective').length} · inert ${probedBy('inert').length} · cost_only ${probedBy('cost_only').length} · negligible ${probedBy('negligible').length} · blind ${probedBy('blind').length}`);
  if (deepAll.length) L.push(`- deep lane: ${deepAll.length} pair(s) unit-attributed (${result.deepSkipped} unaffordable)`);
  L.push('');
  const section = (title: string, rows: PairProbeResult[], fmt: (p: PairProbeResult) => string): void => {
    if (!rows.length) return;
    L.push(`## ${title} (${rows.length})`);
    L.push('');
    for (const p of rows) L.push(fmt(p));
    L.push('');
  };
  section('INERT — socket accepted, byte-identical episodes (bug list)',
    probedBy('inert') as PairProbeResult[],
    p => `- \`${p.skillId}\` + \`${p.supportId}\` (${p.probe} probe${p.unread?.length ? `; static: ${p.unread.map(u => `'${u.key}' read only at ${u.site}`).join('; ')}` : ''})`);
  section('COST-ONLY — tax moved, no observed function (partial no-ops)',
    probedBy('cost_only') as PairProbeResult[],
    p => `- \`${p.skillId}\` + \`${p.supportId}\` — moved: ${p.moved.map(m => m.key).join(', ')}`);
  const partial = deepAll.filter(d => d.units.some(u => u.verdict === 'dead' && !u.unit.compositional));
  if (partial.length) {
    L.push(`## PARTIAL — effective overall, dead payload unit(s) inside (deep lane) (${partial.length})`);
    L.push('');
    for (const d of partial) {
      const dead = d.units.filter(u => u.verdict === 'dead' && !u.unit.compositional);
      L.push(`- \`${d.skillId}\` + \`${d.supportId}\` — dead: ${dead.map(u => `${u.unit.key} (${u.unit.describe})`).join('; ')}`);
    }
    L.push('');
  }
  section('NEGLIGIBLE — diverged under noise (escalate seeds/duration before claiming)',
    probedBy('negligible') as PairProbeResult[],
    p => `- \`${p.skillId}\` + \`${p.supportId}\``);
  section('BLIND — the standard probes cannot measure this pairing (unmeasured, NOT a bug)',
    probedBy('blind') as PairProbeResult[],
    p => `- \`${p.skillId}\` + \`${p.supportId}\``);
  const suspects = result.census.rows.filter(r => r.suspect);
  if (suspects.length) {
    L.push(`## REFUSED-SUSPECT — mechanically affine, tags refuse (${suspects.length})`);
    L.push('');
    for (const s of suspects) {
      L.push(`- \`${s.skillId}\` × \`${s.supportId}\` — ${s.suspect!.map(x => `wants '${x.tag}', skill ${x.evidence}`).join('; ')}`);
    }
    L.push('');
  }
  const eff = probedBy('effective').sort((a, b) => b.dOutputRel - a.dOutputRel);
  if (eff.length) {
    L.push(`## EFFECTIVE — output delta extremes (support power table)`);
    L.push('');
    L.push('| skill | support | Δoutput | top channel |');
    L.push('|---|---|---|---|');
    for (const p of [...eff.slice(0, 20), ...eff.slice(-20)]) {
      L.push(`| ${p.skillId} | ${p.supportId} | ${(p.dOutputRel * 100).toFixed(1)}% | ${p.moved[0]?.key ?? ''} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

// ---------------------------------------------- the matrix ledger commands --
//
// The skill × support no-op hunt as a UNIT TEST (src/sim/ledger.ts): the
// committed ledger holds every ADJUDICATED defect; `matrix check` re-runs a
// slice and fails (exit 2) on findings not in the ledger; `--reconcile`
// rewrites the ledger deliberately (the baseline-write analog); `explain`
// is the per-pair forensics lane; `merge` unions concurrent shard runs.

function ledgerPathFrom(args: Args): string {
  const flag = str(args.flags.ledger, '');
  return flag ? path.resolve(flag) : path.join(BASELINES_DIR, 'support_matrix.json');
}

function loadLedger(p: string, announceMissing: boolean): { ledger: SupportLedger; existed: boolean } {
  if (!fs.existsSync(p)) {
    if (announceMissing) console.log(`No ledger at ${p} — every observed defect reads NEW; seed it with --reconcile.`);
    return { ledger: emptyLedger(), existed: false };
  }
  const ledger = JSON.parse(fs.readFileSync(p, 'utf8')) as SupportLedger;
  const issues = validateLedger(ledger, {
    skills: new Set(Object.keys(SKILLS)), supports: new Set(Object.keys(SUPPORTS)),
  });
  for (const i of issues) console.log(`  ledger lint: ${i}`);
  return { ledger, existed: true };
}

function saveLedger(p: string, ledger: SupportLedger): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, ledgerToJson(ledger));
}

function today(): string { return new Date().toISOString().slice(0, 10); }

function cmdMatrix(args: Args): void {
  const what = args._[1] ?? '';
  if (what === 'check') matrixCheck(args);
  else if (what === 'explain') matrixExplain(args);
  else if (what === 'adjudicate') matrixAdjudicate(args);
  else if (what === 'merge') matrixMerge(args);
  else if (what === 'ledger') matrixLedger(args);
  else throw new Error(`matrix supports 'check', 'explain', 'adjudicate', 'merge' or 'ledger' (got '${what || '∅'}')`);
}

/** THE GATE: run the matrix (same flags as `sweep supports`), diff against
 *  the committed ledger, exit 2 on findings the ledger doesn't know. */
function matrixCheck(args: Args): void {
  const ledgerPath = ledgerPathFrom(args);
  const opts = matrixOptsFrom(args);
  if (args.flags['known-only']) {
    const { ledger, existed } = loadLedger(ledgerPath, true);
    if (!existed) throw new Error(`--known-only needs a ledger — seed one with 'matrix check --reconcile' first`);
    opts.pairs = ledger.pairs.map(r => ({ skill: r.skill, support: r.support }));
    console.log(`--known-only: probing exactly the ledger's ${opts.pairs.length} defect pair(s).`);
    if (!opts.deep && ledger.pairs.some(r => r.kind === 'partial')) {
      console.log(`  note: ledger holds 'partial' rows — without --deep they stay unverified this run.`);
    }
  }
  const run = runMatrixToDir(args, opts, 'matrix_check');
  const observed: ObservedMatrix = {
    probed: run.probedAll, census: run.result.census,
    ...(run.deepAll.length ? { deep: run.deepAll } : {}),
  };
  gateAgainstLedger(args, observed, ledgerPath);
  console.log(`\nReport: ${run.dir}`);
}

function gateAgainstLedger(args: Args, observed: ObservedMatrix, ledgerPath: string): void {
  const { ledger, existed } = loadLedger(ledgerPath, true);
  const check = checkLedger(ledger, observed);
  console.log(`\nLedger gate — ${existed ? ledgerPath : '(empty baseline, no file yet)'}`);
  if (check.newDefects.length) {
    console.log(`NEW DEFECTS (${check.newDefects.length}) — not in the ledger:`);
    for (const d of check.newDefects.slice(0, 25)) {
      console.log(`  ${d.kind.padEnd(9)} ${d.skill} + ${d.support} (${d.probe} probe) — ${d.detail}`);
    }
    if (check.newDefects.length > 25) console.log(`  … ${check.newDefects.length - 25} more in compat.json`);
  }
  if (check.newSuspects.length) {
    console.log(`NEW SUSPECTS (${check.newSuspects.length}) — refused but mechanically affine, not in the ledger:`);
    for (const s of check.newSuspects.slice(0, 15)) {
      console.log(`  ${s.skillId} + ${s.supportId} — ${(s.suspect ?? []).map(x => `wants '${x.tag}' (${x.evidence})`).join('; ')}`);
    }
    if (check.newSuspects.length > 15) console.log(`  … ${check.newSuspects.length - 15} more`);
  }
  if (check.resolved.length) {
    console.log(`RESOLVED (${check.resolved.length}) — ledger rows measuring healthy now (retire via --reconcile):`);
    for (const r of check.resolved.slice(0, 15)) console.log(`  ${r.kind.padEnd(9)} ${r.skill} + ${r.support}`);
  }
  if (check.driftedKind.length) {
    console.log(`KIND DRIFT (${check.driftedKind.length}) — still defective, class moved (refresh via --reconcile):`);
    for (const d of check.driftedKind.slice(0, 15)) console.log(`  ${d.row.skill} + ${d.row.support}: ${d.row.kind} → ${d.now.kind}`);
  }
  console.log(`Known re-confirmed: ${check.knownOpen.length} open · ${check.knownIntended.length} intended`
    + ` — unverified this run: ${check.unverified.length}`
    + (check.outOfScope.length ? ` — outside this slice: ${check.outOfScope.length}` : ''));
  console.log(`Suspects: ${check.newSuspects.length} new · ${check.knownSuspects.length} known · ${check.resolvedSuspects.length} resolved`
    + (check.outOfScopeSuspects.length ? ` · outside this slice: ${check.outOfScopeSuspects.length}` : ''));

  if (args.flags.reconcile) {
    const rec = reconcileLedger(ledger, observed, today(), {
      skills: new Set(Object.keys(SKILLS)), supports: new Set(Object.keys(SUPPORTS)),
    });
    saveLedger(ledgerPath, rec.ledger);
    console.log(`\nLedger reconciled → ${ledgerPath}`);
    console.log(`  pairs: +${rec.added.length} (open) · −${rec.removed.length} resolved · ~${rec.updated.length} kind-refreshed · total ${rec.ledger.pairs.length}`);
    console.log(`  suspects: +${rec.addedSuspects.length} · −${rec.removedSuspects.length} · total ${rec.ledger.suspects.length}`);
    if (rec.added.length) {
      console.log(`  new rows enter as 'open' — adjudicate deliberate ones:`);
      console.log(`    npm run sim -- matrix adjudicate <skill> <support> --status intended --note "…"`);
    }
  } else if (check.breach) {
    console.error(`\nGATE: ${check.newDefects.length} new defect(s) + ${check.newSuspects.length} new suspect(s) — exit 2.`);
    console.error(`  Fix the pairing (or its tags), or record it deliberately: matrix check --reconcile, then adjudicate.`);
    process.exitCode = 2;
  } else {
    console.log(`\nGATE: clean — no new defects, no new suspects.`);
  }
}

/** THE FORENSICS LANE: one pair, the whole story — gate trace, static
 *  expectations, probe shape, A/B verdict, per-unit ablation, prescriptions. */
function matrixExplain(args: Args): void {
  const [, , skill, support] = args._;
  if (!skill || !support) throw new Error(`matrix explain <skill> <support> [--seeds N] [--support-level N] [--duration N] [--static] [--no-deep]`);
  const probeOpts = {
    level: num(args.flags.level, COMPAT_CFG.level),
    supportLevel: num(args.flags['support-level'], COMPAT_CFG.supportLevel),
    seeds: num(args.flags.seeds, 2),
    baseSeed: num(args.flags['base-seed'], 0xc0ffee),
    ...(typeof args.flags['gem-level'] === 'string' ? { gemLevel: num(args.flags['gem-level'], 1) } : {}),
    ...(typeof args.flags.duration === 'string' ? { duration: num(args.flags.duration, COMPAT_CFG.dummyDuration) } : {}),
  };
  const sess = makeProbeSession(probeOpts);
  const probes = !args.flags.static;
  const t0 = Date.now();
  const x = explainPair(sess, skill, support, { probes, deep: probes && !args.flags['no-deep'] });
  printExplain(x);
  if (probes) console.log(`\n(${sess.episodesRun} episode(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  const dir = str(args.flags.out, '') ? path.resolve(str(args.flags.out, ''))
    : path.join(REPORTS_DIR, `matrix_explain_${idSafe(skill)}__${idSafe(support)}_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'explain.json'), JSON.stringify({ opts: probeOpts, explain: x }, null, 2));
  console.log(`Dossier: ${dir}`);
}

function printExplain(x: PairExplain): void {
  console.log(`\n── ${x.skillId} + ${x.supportId} ${'─'.repeat(Math.max(4, 60 - x.skillId.length - x.supportId.length))}`);
  const req = x.fit.requires.length
    ? x.fit.requires.map(r => `${r.tag}${r.present ? '✓' : '✗'}`).join(' ')
    : (x.fit.openGate ? '(open gate — no requiresTags)' : '—');
  console.log(`FIT: ${x.fit.fit.toUpperCase()} — requires: ${req} · excludes hit: ${x.fit.excluded.join(',') || '—'} · decomposition agrees: ${x.fit.agrees ? '✓' : '✗ DRIFT — explainer out of sync with the engine gate'}`);
  const crew = x.fit.crew;
  if (crew.kind === 'not-rider') console.log(`  crew: gem never rides minions (seat-bound: ${crew.seatBound.join(', ')})`);
  else if (crew.kind === 'unknowable') console.log(`  crew: unknowable (corpse-raised) — boards anything; fit resolves per-body at raise`);
  else if (crew.kind === 'skills') console.log(`  crew: serves [${crew.served.join(', ') || '—'}]${crew.refused.length ? ` · refuses [${crew.refused.join(', ')}]` : ''}`);
  if (x.suspect?.length) {
    console.log(`  SUSPECT: ${x.suspect.map(s => `skill provably has '${s.tag}' (${s.evidence})`).join('; ')}`);
  }
  if (x.staticDelta) {
    const d = x.staticDelta;
    console.log(`STATIC: effective level ${d.effLevelBare} → ${d.effLevelSocketed}`
      + (d.unlockedThresholds.length ? ` — unlocks: ${d.unlockedThresholds.join('; ')}` : ''));
    for (const m of d.gemMods) console.log(`  · ${m}`);
  }
  if (x.unread.length) {
    console.log(`UNREAD payloads on this delivery (static inert expectation):`);
    for (const u of x.unread) console.log(`  · '${u.key}' read only at ${u.site}`);
  }
  if (x.blindRules.length) {
    console.log(`BLINDNESS rules matching this pair:`);
    for (const b of x.blindRules) console.log(`  · ${b}`);
  }
  if (x.shape) {
    console.log(`SHAPE: ${x.shape.probe} probe${x.shape.probeWhy ? ` (${x.shape.probeWhy})` : ''}, ${x.shape.rig} rig${x.shape.rigWhy ? ` (${x.shape.rigWhy})` : ''}${x.shape.withKey ? ', resonance-keyed' : ''}`);
  }
  if (x.probe) {
    console.log(`PROBE: ${x.probe.verdict.toUpperCase()} — ${x.probe.identicalSeeds}/${x.probe.seeds} seed(s) byte-identical, Δoutput ${(100 * x.probe.dOutputRel).toFixed(1)}%`);
    for (const m of x.probe.moved.slice(0, 6)) {
      console.log(`  moved: ${m.key}  ${String(typeof m.bare === 'number' ? Math.round((m.bare as number) * 100) / 100 : m.bare)} → ${String(typeof m.pair === 'number' ? Math.round((m.pair as number) * 100) / 100 : m.pair)}`);
    }
    if (x.probe.warnings.length) console.log(`  warnings: ${x.probe.warnings.join(' | ')}`);
  }
  if (x.deep) {
    console.log(`DEEP (unit attribution, mask-one-out):`);
    for (const u of x.deep.units) {
      const tag = u.verdict === 'dead' ? 'DEAD       ' : u.verdict === 'sole_carrier' ? 'SOLE-CARRY '
        : u.verdict === 'contributing' ? 'contributes' : 'unmeasured ';
      console.log(`  ${tag} ${u.unit.key} — ${u.unit.describe}${u.note ? ` (${u.note})` : ''}`);
    }
  }
  if (x.prescriptions.length) {
    console.log(`PRESCRIPTIONS:`);
    x.prescriptions.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  }
}

/** Attach a DECISION to an observed finding (rows are minted by reconcile). */
function matrixAdjudicate(args: Args): void {
  const [, , skill, support] = args._;
  if (!skill || !support) throw new Error(`matrix adjudicate <skill> <support> --status open|intended [--note "…"]`);
  const status = str(args.flags.status, '');
  if (status !== 'open' && status !== 'intended') {
    throw new Error(`--status must be open|intended (got '${status || '∅'}')`);
  }
  const p = ledgerPathFrom(args);
  const { ledger, existed } = loadLedger(p, false);
  if (!existed) throw new Error(`no ledger at ${p} — seed one with 'matrix check --reconcile' first`);
  const note = typeof args.flags.note === 'string' ? args.flags.note : undefined;
  const res = adjudicate(ledger, { skill, support },
    { status: status as LedgerStatus, ...(note !== undefined ? { note } : {}) });
  if ('error' in res) throw new Error(res.error);
  saveLedger(p, ledger);
  console.log(`Adjudicated (${res.where}): ${skill} + ${support} → ${status}${note ? ` — "${note}"` : ''}`);
  console.log(`Ledger: ${p}`);
}

/** Union concurrent shard runs into one coverage picture (and optionally
 *  gate it). Verdict conflicts under one rig mean mixed code — exit 2. */
function matrixMerge(args: Args): void {
  const dirs = args._.slice(2);
  if (!dirs.length) throw new Error(`matrix merge <runDirA> [runDirB…] [--out dir] [--check] [--reconcile]`);
  const runs = dirs.map(ref => {
    if (!fs.existsSync(path.resolve(ref))) throw new Error(`no such run dir: ${ref}`);
    return { ref, data: readRunDir(ref) };
  });
  const baseRig = runs.find(r => r.data.rig)?.data.rig ?? null;
  if (baseRig) for (const r of runs) guardRig(args, baseRig, r.data.rig, r.ref);
  const merged = mergeProbed(runs.map(r => r.data.pairs));
  if (merged.conflicts.length) {
    console.error(`${merged.conflicts.length} verdict conflict(s) across inputs (one rig should be deterministic — mixed code?):`);
    for (const c of merged.conflicts.slice(0, 10)) console.error(`  ${c.skill} + ${c.support}: ${c.verdicts.join(' vs ')}`);
    if (!args.flags.force) process.exitCode = 2;
  }
  const seenDeep = new Set<string>();
  const deepAll: PairDeepResult[] = [];
  for (const d of runs.flatMap(r => r.data.deep)) {
    const k = pairKey(d.skillId, d.supportId);
    if (!seenDeep.has(k)) { seenDeep.add(k); deepAll.push(d); }
  }

  const census = compatCensus(str(args.flags.filter, ''), str(args.flags.support, ''));
  const eligible = census.rows.filter(r => r.fit !== 'refused').length;
  const dir = str(args.flags.out, '') ? path.resolve(str(args.flags.out, '')) : path.join(REPORTS_DIR, `matrix_merge_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  const jsonl = path.join(dir, 'verdicts.jsonl');
  fs.writeFileSync(jsonl, JSON.stringify({ kind: 'header', rig: baseRig, mergedFrom: dirs }) + '\n');
  for (const p of merged.probed) fs.appendFileSync(jsonl, JSON.stringify({ kind: 'pair', pair: p }) + '\n');
  for (const d of deepAll) fs.appendFileSync(jsonl, JSON.stringify({ kind: 'deep', deep: d }) + '\n');
  const result: MatrixResult = {
    census, probed: merged.probed, eligible, scope: merged.probed.length,
    resumed: merged.probed.length, episodesRun: 0, skipped: 0, deepSkipped: 0, cfg: COMPAT_CFG,
  };
  writeMatrixArtifacts(dir, result, {}, baseRig ?? rigSignatureOf({}), merged.probed, deepAll);
  console.log(`Merged ${dirs.length} run(s): ${merged.probed.length} pair verdict(s) (${merged.dupes} duplicate(s) folded), ${deepAll.length} deep result(s) — coverage ${merged.probed.length}/${eligible} eligible.`);
  console.log(`Merged report: ${dir} (self-contained — resumable and re-mergeable)`);

  if (args.flags.check || args.flags.reconcile) {
    const observed: ObservedMatrix = {
      probed: merged.probed, census, ...(deepAll.length ? { deep: deepAll } : {}),
    };
    gateAgainstLedger(args, observed, ledgerPathFrom(args));
  }
}

/** The ledger at a glance: counts by kind × status, oldest open rows, lint. */
function matrixLedger(args: Args): void {
  const p = ledgerPathFrom(args);
  const { ledger, existed } = loadLedger(p, false);
  if (!existed) { console.log(`No ledger at ${p} yet — seed with 'matrix check --reconcile'.`); return; }
  if (args.flags.json) { console.log(JSON.stringify(ledger, null, 2)); return; }
  console.log(`Support-matrix ledger — ${p}`);
  console.log(`  pair rows: ${ledger.pairs.length}`);
  for (const k of ['inert', 'cost_only', 'partial'] as const) {
    const open = ledger.pairs.filter(r => r.kind === k && r.status === 'open').length;
    const intended = ledger.pairs.filter(r => r.kind === k && r.status === 'intended').length;
    if (open || intended) console.log(`    ${k.padEnd(10)} ${String(open).padStart(5)} open · ${intended} intended`);
  }
  const susOpen = ledger.suspects.filter(r => r.status === 'open').length;
  console.log(`  suspects:  ${ledger.suspects.length} (${susOpen} open · ${ledger.suspects.length - susOpen} intended)`);
  const oldest = ledger.pairs.filter(r => r.status === 'open' && r.since)
    .sort((a, b) => (a.since! < b.since! ? -1 : 1));
  if (oldest.length) {
    console.log(`  oldest open:`);
    for (const r of oldest.slice(0, 5)) console.log(`    ${r.since}  ${r.kind.padEnd(9)} ${r.skill} + ${r.support}`);
  }
  const issues = validateLedger(ledger, {
    skills: new Set(Object.keys(SKILLS)), supports: new Set(Object.keys(SUPPORTS)),
  });
  if (issues.length) {
    console.log(`  lint (${issues.length}):`);
    for (const i of issues.slice(0, 10)) console.log(`    - ${i}`);
  } else {
    console.log(`  lint: clean`);
  }
}

function sweepMatchups(args: Args): void {
  const buildRef = str(args.flags.build, '');
  if (!buildRef) throw new Error('sweep matchups needs --build <id|save:slot|save:path>');
  const buildId = resolveBuildRef(buildRef);
  const entry = BUILDS[buildId];
  const panelFlag = str(args.flags.panel, '');
  const spec = panelFlag ? `panel:${panelFlag}` : str(args.flags.targets, '');
  if (!spec) throw new Error('sweep matchups needs --panel <id> or --targets <monsterId[:level],…>');
  const atLevel = typeof args.flags.level === 'string' ? num(args.flags.level, TEXTURE_CFG.probeLevel) : undefined;
  const { targets, warnings, tag } = resolveTargets(spec, atLevel);
  for (const w of warnings) console.log(`panel note: ${w}`);

  const pilot = pilotFor(entryClassId(entry));
  const duration = typeof args.flags.duration === 'string' ? num(args.flags.duration, MATCHUP_CFG.duration) : undefined;
  const defs = targets.map(tgt => matchupDuel(buildId, tgt.monsterId, {
    level: tgt.level, count: tgt.count, rarity: tgt.rarity, duration, pilot, idTag: buildId,
  }));
  const seeds = num(args.flags.seeds, 3);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  console.log(`Matchups: '${buildId}' (${entryLabel(entry)}, L${entryLevel(entry)}, pilot ${pilot.kind}) vs ${targets.length} target(s) × ${seeds} seed(s)…`);
  const runName = `matchups_${buildId}_${idSafe(tag)}`;
  const { suite, episodes } = runDefs(runName, defs, seeds, baseSeed);
  const dir = writeReport(runName, suite, episodes, str(args.flags.out, '') || undefined);

  // Both directions of the interaction, one table: what the build does to the
  // texture (edps/ttk) and what standing in the fight costs (dps_in/floor).
  console.log('\ntarget                 via        edps    ttk  kills  dps_in  floor%  deaths');
  const m = (r: ScenarioReport, k: string): number => r.metrics[k]?.mean ?? 0;
  for (const [i, r] of suite.scenarios.entries()) {
    const tgt = targets[i];
    console.log(`  ${tgt.monsterId.slice(0, 20).padEnd(21)}${tgt.via.slice(0, 8).padEnd(9)}${String(m(r, 'edps_cycle_mean')).padStart(7)}${String(m(r, 'ttk_wave_mean')).padStart(7)}${String(m(r, 'kills')).padStart(7)}${String(m(r, 'dps_in')).padStart(8)}${String(m(r, 'life_floor_pct')).padStart(8)}${String(m(r, 'player_deaths')).padStart(8)}`);
  }
  const live = suite.scenarios.map(r => m(r, 'edps_cycle_mean')).filter(v => v > 0);
  if (live.length) {
    const walls = suite.scenarios.length - live.length;
    console.log(`\nedps spread across textures: ${(Math.max(...live) / Math.max(Math.min(...live), 1e-9)).toFixed(1)}×${walls ? ` — plus ${walls} WALL(s) (zero kill cycles)` : ''}`);
  }
  writeMatrix(dir, [{
    rowId: buildId,
    cells: Object.fromEntries(suite.scenarios.map((r, i) => [targets[i].monsterId, r])),
  }], targets.map(t => t.monsterId), { kind: 'sweep_matchups', build: buildId, panel: tag, seeds });
  console.log(`\nReport: ${dir}`);
}

// ------------------------------------------------------------------ audit --

function cmdAudit(args: Args): void {
  const what = args._[1] ?? 'monsters';
  if (what === 'monsters') auditMonsters(args);
  else if (what === 'textures') auditTextures(args);
  else if (what === 'affixes') cmdAuditAffixes(args);
  else if (what === 'drops') cmdAuditDrops(args);
  else throw new Error(`audit supports 'monsters', 'textures', 'affixes' or 'drops' (got '${what}')`);
}

/** ITEM GENERATION under the microscope: N mints per ilvl band through the
 *  real rollItem — rarity/base/affix distributions, dead-affix and dead-stat
 *  detectors. The economy's first instrument (src/sim/economy.ts). */
function cmdAuditAffixes(args: Args): void {
  bootSimEngine();
  const ilvls = csvNums(str(args.flags.ilvls, ''));
  const audit = auditAffixes({
    ilvls: ilvls.length ? ilvls : undefined,
    n: typeof args.flags.n === 'string' ? num(args.flags.n, ECONOMY_CFG.affixSamples) : undefined,
    category: (str(args.flags.category, '') || undefined) as never,
    baseId: str(args.flags.base, '') || undefined,
  });
  const unreachable = unreachableAffixes();
  const dir = path.join(REPORTS_DIR, `audit_affixes_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'affixes.json'), JSON.stringify({ ...audit, unreachable }, null, 2));

  for (const b of audit.bands) {
    const total = Object.values(b.rarities).reduce((s, x) => s + x, 0);
    console.log(`\nilvl ${b.ilvl} — ${total} item(s): ${Object.entries(b.rarities).map(([r, c]) => `${r} ${(c / total * 100).toFixed(1)}%`).join(' · ')}`);
    console.log(`  uniques seen: ${Object.keys(b.uniques).length} kind(s), ${Object.values(b.uniques).reduce((s, x) => s + x, 0)} drop(s)`);
    if (b.neverRolled.length) {
      console.log(`  eligible-but-NEVER-rolled affixes (${b.neverRolled.length}) — dead-affix triage:`);
      for (const a of b.neverRolled.slice(0, 8)) console.log(`    ${a.id} (${a.kind}, weight ${a.weight}, ${a.eligibleBases} base pool(s))`);
      if (b.neverRolled.length > 8) console.log(`    … +${b.neverRolled.length - 8} more in affixes.json`);
    }
    if (b.shareFlags.length) {
      console.log(`  share flags (observed÷expected beyond ${ECONOMY_CFG.shareFlagLow}–${ECONOMY_CFG.shareFlagHigh}×):`);
      for (const f of b.shareFlags.slice(0, 6)) console.log(`    ${f.id}: ${f.ratio}× (obs ${f.observed} vs exp ${f.expected})`);
    }
  }
  if (audit.unknownStats.length) {
    console.log(`\nDEAD STAT LINES (compiled mods naming stats the engine doesn't define):`);
    for (const u of audit.unknownStats) console.log(`  '${u.stat}' via ${u.via}`);
  } else {
    console.log(`\nDead-stat sweep: clean (every compiled line resolves).`);
  }
  if (unreachable.length) {
    console.log(`\nUNREACHABLE affixes (in NO base's pool at any ilvl): ${unreachable.map(u => u.id).join(', ')}`);
  }
  console.log(`\nReport: ${dir}`);
}

/** LOOT TABLES resolved N times per ilvl band + the DROP_CFG analytic
 *  per-kill expectations — "what does a kill actually pay", measured. */
function cmdAuditDrops(args: Args): void {
  bootSimEngine();
  const ilvls = csvNums(str(args.flags.ilvls, ''));
  const audit = auditLoot({
    tableId: str(args.flags.table, '') || undefined,
    ilvls: ilvls.length ? ilvls : undefined,
    n: typeof args.flags.n === 'string' ? num(args.flags.n, ECONOMY_CFG.lootSamples) : undefined,
  });
  const dir = path.join(REPORTS_DIR, `audit_drops_${idSafe(audit.tableId)}_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`Loot table '${audit.tableId}':`);
  for (const b of audit.bands) {
    console.log(`  ilvl ${b.ilvl}: per resolve — items ${b.perResolve.items}, gems ${b.perResolve.gems}, vestiges ${b.perResolve.vestiges}`);
    const items = Object.values(b.itemRarities).reduce((s, x) => s + x, 0);
    if (items) {
      console.log(`    rarities: ${Object.entries(b.itemRarities).map(([r, c]) => `${r} ${(c / items * 100).toFixed(1)}%`).join(' · ')}`);
      console.log(`    uniques: ${Object.keys(b.uniques).length} kind(s) / ${Object.values(b.uniques).reduce((s, x) => s + x, 0)} drop(s)`);
    }
  }
  const meanItems = audit.bands.reduce((s, b) => s + b.perResolve.items, 0) / Math.max(1, audit.bands.length);
  const expectations = killDropExpectations(meanItems);
  console.log(`\nPer-KILL expectations (DROP_CFG × mean table yield ${meanItems.toFixed(3)}):`);
  console.log(`  tier       gear rolls   items/kill   gem%    vestige%`);
  for (const e of expectations) {
    console.log(`  ${e.tier.padEnd(10)} ${String(e.gearRolls).padStart(10)} ${String(e.itemsPerKill).padStart(12)} ${(e.gemChance * 100).toFixed(0).padStart(6)} ${(e.vestigeChance * 100).toFixed(0).padStart(9)}`);
  }
  fs.writeFileSync(path.join(dir, 'drops.json'), JSON.stringify({ ...audit, expectations }, null, 2));
  console.log(`\nReport: ${dir}`);
}

/** The defense-texture ledger: every monster's sheet at the probe level plus
 *  its assigned texture poles, with a census that names UNPOPULATED poles —
 *  the doctrine's coverage map, derived, never hand-maintained. */
function auditTextures(args: Args): void {
  const level = num(args.flags.level, TEXTURE_CFG.probeLevel);
  const filter = str(args.flags.filter, '');
  const world = makeSimWorld('warrior', 1);
  const profiles = defenseProfiles(world, level).filter(p => !filter || p.id.includes(filter));
  const dir = path.join(REPORTS_DIR, `audit_textures_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'textures.json'), JSON.stringify({ level, cfg: TEXTURE_CFG, profiles }, null, 2));
  const csv = ['id,level,life,es,armor,evasion,poise,shellSide,shellMax,shellFracAuthored,shellFracLive,pool,moveSpeed,boss,passive,textures',
    ...profiles.map(p => `${p.id},${p.level},${p.life},${p.es},${p.armor},${p.evasion},${p.poise},${p.shell?.side ?? ''},${p.shell?.max ?? ''},${p.shell?.fracAuthored ?? ''},${p.shell?.fracLive ?? ''},${p.pool},${p.moveSpeed},${p.boss},${p.passive},${p.textures.join('|')}`)].join('\n');
  fs.writeFileSync(path.join(dir, 'textures.csv'), csv);

  const combat = profiles.filter(p => !p.passive && !p.spawner && !p.untargetable && !p.immortal);
  const census = new Map<string, number>();
  for (const p of combat) for (const tx of p.textures) census.set(tx, (census.get(tx) ?? 0) + 1);
  console.log(`Defense textures @ L${level} over ${combat.length} combatant(s):`);
  for (const tx of ['plain', 'armor', 'evasion', 'es', 'poise', 'shell', 'apex'] as TextureId[]) {
    const n = census.get(tx) ?? 0;
    console.log(`  ${tx.padEnd(8)} ${String(n).padStart(4)}${n === 0 ? '   ← UNPOPULATED POLE (content gap, not a sweep bug)' : ''}`);
  }
  console.log(`${profiles.length} profile(s) → ${dir}`);
  if (args.flags['check-panels']) checkPanels();
}

/** The drift gate for curated panels: every literal entry's `claim` must
 *  still be among its computed textures, and every literal must resolve.
 *  Empty PICK poles stay warnings (an unpopulated pole is a content finding —
 *  a permanently red gate would just get deleted). Exit 2 on drift. */
function checkPanels(): void {
  const world = makeSimWorld('warrior', 1);
  let failures = 0;
  for (const panel of Object.values(PANELS)) {
    const { targets, warnings } = expandPanel(world, panel);
    for (const w of warnings) console.log(`  note: ${w}`);
    for (const e of panel.entries) {
      if (!e.id) continue;
      const prof = targets.find(t => t.monsterId === e.id)?.profile;
      if (!prof) { console.error(`  FAIL ${panel.id}: literal '${e.id}' did not resolve`); failures++; continue; }
      if (e.claim && !prof.textures.includes(e.claim)) {
        console.error(`  FAIL ${panel.id}: '${e.id}' claims '${e.claim}' but classifies as [${prof.textures.join(', ')}]`);
        failures++;
      }
    }
    console.log(`  panel ${panel.id}: ${targets.map(t => `${t.monsterId}(${t.via})`).join(', ') || '—'}`);
  }
  if (failures) {
    console.error(`${failures} panel claim(s) drifted — recurate the entry or revisit the monster.`);
    process.exitCode = 2;
  } else {
    console.log('Panel claims hold.');
  }
}

function auditMonsters(args: Args): void {
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
    panels: Object.values(PANELS).map(p => ({ id: p.id, label: p.label, level: p.level, entries: p.entries.length })),
    scenarios: Object.values(SCENARIOS).map(s => ({ id: s.id, label: s.label, duration: s.duration })),
    suites: SUITES,
    targets: TARGETS,
    /** How to address things the registries can't list statically. */
    conventions: {
      saveBuilds: 'save:<slot|path> loads saves/save_<slot>.json (or the path) as a build ref',
      playerLibrary: 'balance/players/*.json auto-register as player_<file> build ids',
      panelTargets: 'panel:<id> anywhere a --vs/--targets spec is taken; or csv monsterId[:level]',
    },
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
            [--as <build|save:slot|save:path>]        (same questions, YOUR character)
  sweep     skills  [--level N] [--gem-level N] [--class id] [--filter substr] [--seeds N]
            [--vs panel:<id> | --vs id[:lvl],…]       (skill × enemy-texture matrix)
  sweep     matchups --build <id|save:ref> (--panel <id> | --targets id[:lvl],…)
            [--level N] [--seeds N] [--duration N]    (one build across a target panel)
  sweep     supports [--filter skill] [--support substr] [--seeds N] [--budget N]
            [--static-only] [--level N] [--deep] [--shard i/n] [--resume dir]
            (skill × support no-op matrix; verdicts.jsonl streams — resumable)
  matrix    check    [sweep-supports flags] [--known-only] [--reconcile] [--ledger p]
            (the no-op UNIT-TEST gate: exit 2 on defects the ledger doesn't know;
             --reconcile rewrites balance/baselines/support_matrix.json deliberately)
  matrix    explain  <skill> <support> [--seeds N] [--support-level N] [--static] [--no-deep]
            (one pair, the whole story: gate trace, A/B verdict, per-unit ablation,
             prescriptions — the "why doesn't this work / should it" lane)
  matrix    adjudicate <skill> <support> --status open|intended [--note text]
  matrix    merge    <runDirA> [runDirB…] [--out dir] [--check] [--reconcile]
            (union concurrent shard runs into one coverage picture)
  matrix    ledger   [--json]               (the committed defect backlog at a glance)
  sweep     progression [--classes a,b] [--levels 1,5,10,20] [--geared] [--seeds N]
            (power curve per class; --geared adds the gear-value column)
  audit     monsters [--levels 1,5,10,20,40] [--filter substr]
  audit     textures [--level N] [--filter substr] [--check-panels]
  audit     affixes  [--ilvls 1,5,10,20,40] [--n 4000] [--category id] [--base id]
            (item-gen distributions, dead-affix + dead-stat detectors)
  audit     drops    [--table world_gear] [--ilvls csv] [--n 2000]
            (loot-table yields + DROP_CFG per-kill expectations)
  manifest  (JSON catalogs of everything runnable — for tooling/agents)
  compare   <a/report.json> <b/report.json> [--tolerance 0.15] [--abs-eps 0.5]
  baseline  write|check --suite <name> [--seeds N] [--tolerance 0.15]

Build refs: registry ids (see manifest), save:<slot|path> (a real character,
            verbatim), balance/players/*.json (auto-registered as player_<file>).
Panels:     ${Object.keys(PANELS).join(', ')}
Suites:     ${Object.keys(SUITES).join(', ')}
Docs:       docs/balance/README.md · docs/balance/AGENT_PLAYBOOK.md`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  try {
    registerPlayerBuilds();
    if (cmd === 'run') cmdRun(args);
    else if (cmd === 'sweep') cmdSweep(args);
    else if (cmd === 'matrix') cmdMatrix(args);
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
