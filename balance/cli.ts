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
import { MATCHUP_CFG, SCENARIOS, SUITES, matchupDuel, pilotFor } from '../src/sim/data/scenarios';
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
  else throw new Error(`sweep supports 'skills' or 'matchups' (got '${what}')`);
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
  else throw new Error(`audit supports 'monsters' or 'textures' (got '${what}')`);
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
  audit     monsters [--levels 1,5,10,20,40] [--filter substr]
  audit     textures [--level N] [--filter substr] [--check-panels]
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
