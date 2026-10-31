// ---------------------------------------------------------------------------
// THE TUNING VERBS — Node-side wrappers for `npm run sim -- <verb>`: argv, files
// and printing over the browser-safe machinery in src/sim/.
//
//   expression   can the instrument read every class?
//   whatif       run scenarios with data overrides, no source edits
//   knobs        list tunable numbers; prove a knob reaches the engine
//   sensitivity  which knobs move which metrics
//   search       build-space search: run, confirm, merge, repro, effects
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Args } from '../cli';
import { bootSimEngine } from '../../src/sim/arena';
import { rosterClassIds, classExpressionRow, progressionDefs, resolveScenarioRef, type ClassExpressionRow } from '../../src/sim/sweeps';
import { runScenario } from '../../src/sim/runner';
import { parseKnob, knobCensus, registerCfgRoot, CFG_ROOTS, type KnobSpec } from '../../src/sim/knobs';
import { resolveKnobSet } from '../../src/sim/data/knobSets';
import {
  runSensitivity, runWhatIf, WHATIF_METRICS, type SensitivityKnob, type WhatIfRow,
} from '../../src/sim/whatif';
import {
  decodeGenome, encodeGenome, factorsOf, genomeKey, genomeToBuild,
} from '../../src/sim/search/space';
import {
  archiveRows, emptyArchive, evaluateGenome, mergeArchives, pilotForGenome, runSearch, SEARCH_RIGS,
  STAGES, type SearchArchive, type SearchRowLog,
} from '../../src/sim/search/engine';
import { deriveSeed } from '../../src/sim/rng';
import { proposeFor, type ProposalInput } from '../../src/sim/proposals';
import { fitMainEffects, type EffectRow } from '../../src/sim/stats';
import type { ScenarioReport } from '../../src/sim/types';

const str = (v: string | boolean | undefined, dflt: string): string => (typeof v === 'string' ? v : dflt);
const num = (v: string | boolean | undefined, dflt: number): number => {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : dflt;
};
const csv = (s: string): string[] => s.split(',').map(x => x.trim()).filter(Boolean);
const ROOT = process.cwd();
const stamp = (): string => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = (args: Args, name: string): string => {
  const flag = str(args.flags.out, '');
  const dir = flag ? path.resolve(flag) : path.join(ROOT, 'balance', 'reports', `${name}_${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ------------------------------------------------------- the *_CFG scanner --

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Register every exported *_CFG a knob names, found on disk by name so a new
 *  config needs no registration. Modules load through the same URL the program
 *  already imported them under, so the object is the live one. */
export async function loadCfgRoots(names: readonly string[]): Promise<void> {
  const wanted = names.filter(n => !CFG_ROOTS[n]);
  if (!wanted.length) return;
  const files = walkTs(path.join(ROOT, 'src'));
  for (const name of wanted) {
    const re = new RegExp(`export const ${name}\\b`);
    const file = files.find(f => re.test(fs.readFileSync(f, 'utf8')));
    if (!file) throw new Error(`no module under src/ exports '${name}'`);
    const mod = await import(pathToFileURL(file).href) as Record<string, unknown>;
    registerCfgRoot(name, mod[name] as object);
  }
}

const cfgNamesIn = (paths: readonly string[]): string[] =>
  [...new Set(paths.map(p => /^cfg\.([A-Za-z0-9_]+)/.exec(p)?.[1]).filter((x): x is string => !!x))];

// ----------------------------------------------------- scenario + knob flags --

function scenariosFrom(args: Args): ReturnType<typeof resolveScenarioRef>[] {
  const refs = csv(str(args.flags.scenarios, str(args.flags.scenario, '')));
  if (!refs.length) throw new Error(`needs --scenarios <ref,…> (e.g. spar:warrior:20,parity:warrior:20,skill:fireball:10)`);
  return refs.map(resolveScenarioRef);
}

function knobsFrom(args: Args): KnobSpec[] {
  const out: KnobSpec[] = [];
  for (const k of str(args.flags.knob, '').split(';').map(x => x.trim()).filter(Boolean)) out.push(parseKnob(k));
  const file = str(args.flags.knobs, '');
  if (file) {
    const rows = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as (string | { knob: string })[];
    for (const r of rows) out.push(parseKnob(typeof r === 'string' ? r : r.knob));
  }
  return out;
}

const fmt = (x: number | null | undefined, d = 2): string =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d);

function printWhatIfRow(r: WhatIfRow): void {
  console.log(`\n${r.scenarioId}${r.identical ? '   (byte-identical: this knob reaches nothing here)' : ''}`);
  if (r.warnings.length) console.log(`  warned rows are not evidence: ${r.warnings.slice(0, 2).join(' | ')}`);
  console.log(`  ${'metric'.padEnd(18)}${'before'.padStart(10)}${'after'.padStart(10)}${'Δ%'.padStart(9)}  95% interval on Δ      verdict`);
  for (const [k, m] of Object.entries(r.metrics)) {
    if (m.before === 0 && m.after === 0) continue;
    const pct = m.relative === null ? '—' : `${(m.relative * 100).toFixed(1)}%`;
    console.log(`  ${k.padEnd(18)}${fmt(m.before).padStart(10)}${fmt(m.after).padStart(10)}${pct.padStart(9)}  [${fmt(m.lo)}, ${fmt(m.hi)}]`.padEnd(66) + m.verdict);
  }
}

// ---------------------------------------------------------------- whatif ----

export async function cmdWhatIf(args: Args): Promise<void> {
  bootSimEngine();
  const knobs = knobsFrom(args);
  if (!knobs.length) throw new Error(`whatif needs --knob 'path*0.9' (repeat it) or --knobs file.json`);
  await loadCfgRoots(cfgNamesIn(knobs.map(k => k.path)));
  const scenarios = scenariosFrom(args);
  const seeds = num(args.flags.seeds, 10);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const metrics = str(args.flags.metrics, '') ? csv(str(args.flags.metrics, '')) : WHATIF_METRICS;
  console.log(`What-if: ${knobs.map(k => k.text).join(' , ')} on ${scenarios.length} scenario(s) × ${seeds} seed(s) at base ${baseSeed}…`);
  const res = runWhatIf({ knobs, scenarios, seeds, baseSeed, metrics, onRow: printWhatIfRow });
  if (res.errors.length) {
    for (const e of res.errors) console.error(`error: ${e}`);
    process.exitCode = 1;
  }
  console.log(`\nTouched ${res.touched.length} value(s):`);
  for (const t of res.touched.slice(0, 12)) console.log(`  ${t.path}: ${String(t.before)} → ${String(t.after)}`);
  if (res.touched.length > 12) console.log(`  … +${res.touched.length - 12} more`);
  const dir = outDir(args, 'whatif');
  fs.writeFileSync(path.join(dir, 'whatif.json'), JSON.stringify(res, null, 1));
  console.log(`\nReport: ${dir}`);
}

// ----------------------------------------------------------------- knobs ----

export async function cmdKnobs(args: Args): Promise<void> {
  bootSimEngine();
  const prefix = args._[1] ?? '';
  const verify = str(args.flags.verify, '');
  if (verify) {
    const k = parseKnob(verify);
    await loadCfgRoots(cfgNamesIn([k.path]));
    const res = runWhatIf({ knobs: [k], scenarios: scenariosFrom(args), seeds: num(args.flags.seeds, 3), baseSeed: num(args.flags['base-seed'], 0xa11ce) });
    if (res.errors.length) throw new Error(res.errors.join('; '));
    for (const r of res.rows) console.log(`${r.identical ? 'NO-OP ' : 'MOVED '} ${r.scenarioId}`);
    if (res.rows.every(r => r.identical)) {
      console.log(`Every scenario is byte-identical: the value is unread here, or was folded at import time.`);
      process.exitCode = 2;
    }
    return;
  }
  if (!prefix) throw new Error(`knobs <path prefix>, e.g. knobs skills.fireball — or --verify 'path*0.9' --scenarios …`);
  await loadCfgRoots(cfgNamesIn([prefix]));
  for (const row of knobCensus(prefix)) console.log(`${row.path} = ${row.value}`);
}

// ----------------------------------------------------------- sensitivity ----

export async function cmdSensitivity(args: Args): Promise<void> {
  bootSimEngine();
  const scenarios = scenariosFrom(args);
  const knobs: SensitivityKnob[] = [];
  for (const spec of str(args.flags.knobset, '').split(';').map(x => x.trim()).filter(Boolean)) {
    if (spec.startsWith('cfg:')) await loadCfgRoots([spec.slice(4)]);
    knobs.push(...resolveKnobSet(spec));
  }
  for (const k of str(args.flags.knob, '').split(';').map(x => x.trim()).filter(Boolean)) {
    knobs.push({ id: k, mode: 'scale', path: k });
  }
  if (!knobs.length) throw new Error(`sensitivity needs --knobset <id[:arg]> or --knob <path>`);
  await loadCfgRoots(cfgNamesIn(knobs.map(k => k.path)));
  const seeds = num(args.flags.seeds, 5);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const delta = num(args.flags.delta, 0.2);
  const metrics = str(args.flags.metrics, '') ? csv(str(args.flags.metrics, '')) : WHATIF_METRICS;
  const deadlineAt = typeof args.flags['deadline-min'] === 'string' ? Date.now() + num(args.flags['deadline-min'], 0) * 60_000 : undefined;
  console.log(`Sensitivity: ${knobs.length} knob(s) × ${scenarios.length} scenario(s) × ${seeds} seed(s), ±${delta * 100}% — up to ${(1 + 2 * knobs.length) * scenarios.length * seeds} episode(s)…`);
  const res = runSensitivity({
    knobs, scenarios, seeds, baseSeed, delta, metrics, deadlineAt,
    onKnob: (d, t) => console.log(`  knob ${d}/${t}`),
  });
  const moved = res.cells.filter(c => c.moved).sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
  console.log(`\nStrongest responses (elasticity: %Δmetric per %Δknob; per-step for attribute knobs):`);
  for (const c of moved.slice(0, 30)) {
    console.log(`  ${c.knob.padEnd(26)} ${c.metric.padEnd(16)} ${fmt(c.elasticity).padStart(8)}  [${fmt(c.lo)}, ${fmt(c.hi)}]  ${c.scenarioId}`);
  }
  const noops = res.knobs.filter(k => k.noop);
  if (noops.length) console.log(`\nNo-op on these scenarios: ${noops.map(k => k.id).join(', ')}`);
  const dir = outDir(args, 'sensitivity');
  fs.writeFileSync(path.join(dir, 'sensitivity.json'), JSON.stringify(res, null, 1));
  console.log(`\nReport: ${dir}`);
}

// ------------------------------------------------------------ expression ----

export function cmdExpression(args: Args): void {
  bootSimEngine();
  const classes = csv(str(args.flags.classes, 'all'));
  const classIds = classes[0] === 'all' ? rosterClassIds() : classes;
  const levels = csv(str(args.flags.levels, '1,5,10,20')).map(Number);
  const tiers = csv(str(args.flags.tiers, 'starter,geared'));
  const seeds = num(args.flags.seeds, 3);
  const baseSeed = num(args.flags['base-seed'], 0xa11ce);
  const extra = tiers.filter(t => t !== 'starter');
  const defs = progressionDefs({ classIds, levels, tiers: extra, lanes: ['dummy', 'spar', 'parity', 'pressure'] });
  console.log(`Expression census: ${classIds.length} class(es) × L[${levels.join(', ')}] × [${tiers.join(', ')}] × 4 lanes × ${seeds} seed(s) — ${defs.length * seeds} episode(s)…`);
  const byId = new Map<string, ScenarioReport>();
  const warned: string[] = [];
  for (const def of defs) {
    const { report } = runScenario(def, { seeds, baseSeed });
    byId.set(def.id, report);
    if (Object.keys(report.warnings).length) warned.push(def.id);
  }
  const rows: ClassExpressionRow[] = [];
  for (const classId of classIds) {
    for (const level of levels) {
      for (const tier of tiers) {
        if (tier !== 'starter' && level <= 1) continue;
        rows.push(classExpressionRow(classId, level, tier, byId));
      }
    }
  }
  const atTop = rows.filter(r => r.level === Math.max(...levels) && r.tier === 'starter');
  const count = (e: string): number => atTop.filter(r => r.expression === e).length;
  console.log(`\nAt L${Math.max(...levels)} starter: dummy-rankable ${count('dummy')} · spar-rankable ${count('spar')} · pack-only ${count('pack')} · MUTE ${count('mute')}`);
  console.log(`class`.padEnd(16) + `tier`.padEnd(9) + `level`.padEnd(6) + `lane`.padEnd(7) + `dummy`.padStart(9) + `spar`.padStart(9) + `pack`.padStart(9) + `kills`.padStart(7));
  for (const r of rows) {
    console.log(`${r.classId.padEnd(16)}${r.tier.padEnd(9)}${String(r.level).padEnd(6)}${r.expression.padEnd(7)}${fmt(r.dummyDps, 1).padStart(9)}${fmt(r.sparDps, 1).padStart(9)}${fmt(r.parityDps, 1).padStart(9)}${fmt(r.parityKills, 1).padStart(7)}`);
  }
  const mutes = rows.filter(r => r.expression === 'mute');
  if (mutes.length) {
    console.log(`\nINSTRUMENT GAPS (${mutes.length} row(s)): no lane reads these kits. A defect of the rig, not a balance finding.`);
    for (const r of mutes) console.log(`  ${r.classId} ${r.tier} L${r.level}`);
  }
  const dir = outDir(args, 'expression');
  fs.writeFileSync(path.join(dir, 'expression.json'), JSON.stringify({ rows, warned, seeds, baseSeed }, null, 1));
  console.log(`\nReport: ${dir}`);
  if (warned.length) console.log(`Warned rows (not evidence): ${warned.slice(0, 8).join(', ')}${warned.length > 8 ? ` +${warned.length - 8}` : ''}`);
}

// --------------------------------------------------------------- propose ----

/** Which outliers earn the expensive confirmation: one row per subject (its most
 *  extreme), dealt round-robin across kinds so that one loud lane cannot take every
 *  seat. Input order is already most extreme first. */
export function selectForProposals(findings: readonly ProposalInput[], top: number): ProposalInput[] {
  const seen = new Set<string>();
  const byKind = new Map<string, ProposalInput[]>();
  for (const f of findings) {
    if (!f.ref) continue;
    const key = `${f.kind}:${f.subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (byKind.get(f.kind) ?? byKind.set(f.kind, []).get(f.kind)!).push(f);
  }
  const out: ProposalInput[] = [];
  const queues = [...byKind.values()];
  for (let i = 0; out.length < top && queues.some(q => i < q.length); i++) {
    for (const q of queues) if (i < q.length && out.length < top) out.push(q[i]);
  }
  return out;
}

/** Confirm the night's top outliers on fresh dice, solve each for a number and
 *  verify it. Writes one line per finding. Applies nothing. */
export function cmdPropose(args: Args): void {
  bootSimEngine();
  const file = str(args.flags.findings, '');
  if (!file) throw new Error(`propose --findings <findings.json> [--top N] [--seeds N] [--base-seed K] [--shard i/n]`);
  const findings = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as ProposalInput[];
  const top = num(args.flags.top, 40);
  const seeds = num(args.flags.seeds, 30);
  const baseSeed = num(args.flags['base-seed'], 0xf00d);
  const m = /^(\d+)\/(\d+)$/.exec(str(args.flags.shard, '1/1'));
  const shard = m ? { index: Number(m[1]), of: Number(m[2]) } : { index: 1, of: 1 };
  const deadlineAt = typeof args.flags['deadline-min'] === 'string' ? Date.now() + num(args.flags['deadline-min'], 0) * 60_000 : Infinity;
  const measurable = selectForProposals(findings, top);
  const mine = measurable.filter((_, i) => i % shard.of === shard.index - 1);
  const dir = outDir(args, 'propose');
  const rowsPath = path.join(dir, 'proposals.jsonl');
  fs.writeFileSync(rowsPath, '');
  let done = 0;
  for (const f of mine) {
    if (Date.now() > deadlineAt) break;
    try {
      const p = proposeFor(f, { seeds, baseSeed });
      fs.appendFileSync(rowsPath, JSON.stringify(p) + '\n');
      console.log(`  ${p.status.padEnd(14)} ${f.kind} ${f.subject} (${f.metric})${p.knob ? ` ${p.knob} ×${p.factor}` : ''}`);
    } catch (err) {
      console.error(`  threw on ${f.id}: ${(err as Error).message}`);
    }
    done++;
  }
  console.log(`Proposals: ${done}/${mine.length} finding(s) handled at ${seeds} seeds, base ${baseSeed}.`);
  console.log(`Report: ${dir}`);
}

// ---------------------------------------------------------------- search ----

function loadArchive(file: string, catalogSeed: number): SearchArchive {
  if (file && fs.existsSync(file)) {
    const a = JSON.parse(fs.readFileSync(file, 'utf8')) as SearchArchive;
    if (a.v === 1) return a;
  }
  return emptyArchive(catalogSeed);
}

export function cmdSearch(args: Args): void {
  bootSimEngine();
  const what = args._[1] ?? '';
  if (what === 'run') searchRun(args);
  else if (what === 'repro') searchRepro(args);
  else if (what === 'merge') searchMerge(args);
  else if (what === 'confirm') searchConfirm(args);
  else if (what === 'effects') searchEffects(args);
  else throw new Error(`search supports 'run', 'repro', 'merge', 'confirm' or 'effects' (got '${what || '∅'}')`);
}

/** Anytime: draws candidates until the deadline, streaming every screen row. */
function searchRun(args: Args): void {
  const baseSeed = num(args.flags['base-seed'], 0x5ea2c4);
  const catalogSeed = num(args.flags['catalog-seed'], 0xc0ca);
  const archive = loadArchive(str(args.flags.archive, ''), catalogSeed);
  const minutes = num(args.flags.minutes, 5);
  const night = str(args.flags.night, new Date().toISOString().slice(0, 10));
  const shardFlag = str(args.flags.shard, '');
  const m = shardFlag ? /^(\d+)\/(\d+)$/.exec(shardFlag) : null;
  const shard = m ? { index: Number(m[1]), of: Number(m[2]) } : undefined;
  const dir = outDir(args, 'search');
  const rowsPath = path.join(dir, 'rows.jsonl');
  fs.writeFileSync(rowsPath, '');
  const startRows = archiveRows(archive).length;
  console.log(`Search: ${minutes} min, archive ${startRows} elite row(s), cursor ${archive.cursor}${shard ? `, shard ${shard.index}/${shard.of}` : ''}, base seed ${baseSeed}…`);
  let last = Date.now();
  let lastCheckpoint = Date.now();
  let rowsLogged = 0;
  const res = runSearch({
    archive, night, baseSeed, shard,
    deadlineAt: Date.now() + minutes * 60_000,
    ...(typeof args.flags['max-candidates'] === 'string' ? { maxCandidates: num(args.flags['max-candidates'], 100) } : {}),
    onRow: (r: SearchRowLog) => {
      fs.appendFileSync(rowsPath, JSON.stringify(r) + '\n');
      rowsLogged++;
      if (Date.now() - last > 30_000) { last = Date.now(); console.log(`  … ${rowsLogged} candidates`); }
    },
    // A killed search keeps its elites: the checkpoint is what consolidation reads.
    onElite: () => {
      if (Date.now() - lastCheckpoint < 120_000) return;
      lastCheckpoint = Date.now();
      fs.writeFileSync(path.join(dir, 'archive.json'), JSON.stringify(archive));
    },
  });
  fs.writeFileSync(path.join(dir, 'archive.json'), JSON.stringify(archive));
  fs.writeFileSync(path.join(dir, 'search.json'), JSON.stringify({ ...res, night, baseSeed, shard, stages: STAGES, rigs: Object.keys(SEARCH_RIGS) }, null, 1));
  console.log(`Search done: ${res.candidates} candidate(s), ${res.rejected} rejected by the gates, ${res.crashed} crashed, ${res.promoted} promoted, ${res.entered} archive entries, ${res.episodes} episodes.`);
  console.log(`Report: ${dir}`);
}

/** One command from a commit plus a seed: re-measure a genome token. */
function searchRepro(args: Args): void {
  const token = str(args.flags.genome, args._[2] ?? '');
  if (!token) throw new Error(`search repro --genome <token> [--seeds N] [--base-seed K] [--stage N]`);
  const g = decodeGenome(token);
  const baseSeed = num(args.flags['base-seed'], 0x5ea2c4);
  const seeds = num(args.flags.seeds, 30);
  console.log(`Genome ${genomeKey(g)}: ${g.cls} L${g.lvl} — ${g.skills.map(s => `${s.id}${s.supports?.length ? `[${s.supports.join('+')}]` : ''}`).join(', ')}`);
  console.log(`  off ${g.off}, def ${g.def}, gear ${g.gear ?? 'none'}${g.uniques ? `, uniques ${Object.values(g.uniques).join(', ')}` : ''}, pilot ${pilotForGenome(g).kind}`);
  const prior = STAGES[STAGES.length - 1].seeds;
  STAGES[STAGES.length - 1].seeds = seeds;
  const res = evaluateGenome(g, STAGES.length - 1, baseSeed);
  STAGES[STAGES.length - 1].seeds = prior;
  if (res.rejected) { console.log(`REJECTED by the gates: ${res.rejected}`); process.exitCode = 2; return; }
  console.log(`  cell ${res.cell}, ${res.seeds} seeds at base ${baseSeed}`);
  for (const [k, v] of Object.entries(res.objectives ?? {})) console.log(`  ${k.padEnd(10)} ${fmt(v)} ± ${fmt(res.sd?.[k])}`);
  for (const [rig, m] of Object.entries(res.rigs ?? {})) {
    console.log(`  ${rig}: dps_out ${fmt(m.dps_out)}, kills ${fmt(m.kills)}, deaths ${fmt(m.player_deaths)}, life floor ${fmt(m.life_floor_pct)}%`);
  }
  const dir = str(args.flags.out, '');
  if (dir) {
    fs.mkdirSync(path.resolve(dir), { recursive: true });
    fs.writeFileSync(path.join(path.resolve(dir), 'repro.json'), JSON.stringify({ token, baseSeed, build: genomeToBuild(g, `g_${genomeKey(g)}`), result: res }, null, 1));
  }
}

function searchMerge(args: Args): void {
  const dirs = args._.slice(2);
  const catalogSeed = num(args.flags['catalog-seed'], 0xc0ca);
  const into = loadArchive(str(args.flags.archive, ''), catalogSeed);
  let candidates = 0, episodes = 0, rejected = 0;
  for (const d of dirs) {
    const f = path.join(path.resolve(d), 'archive.json');
    if (fs.existsSync(f)) mergeArchives(into, JSON.parse(fs.readFileSync(f, 'utf8')) as SearchArchive);
    const s = path.join(path.resolve(d), 'search.json');
    if (fs.existsSync(s)) {
      const j = JSON.parse(fs.readFileSync(s, 'utf8')) as { candidates: number; episodes: number; rejected: number };
      candidates += j.candidates; episodes += j.episodes; rejected += j.rejected;
    }
  }
  into.totals.evaluated += candidates;
  into.totals.rejected += rejected;
  into.totals.episodes += episodes;
  into.totals.nights += 1;
  const out = outDir(args, 'search_merge');
  fs.writeFileSync(path.join(out, 'archive.json'), JSON.stringify(into));
  console.log(`Merged ${dirs.length} run(s): ${archiveRows(into).length} elite row(s), cursor ${into.cursor}, ${candidates} candidate(s) this batch.`);
  console.log(`Report: ${out}`);
}

/** High-seed re-measure of the archive's rows on this commit. Rows that no longer
 *  decode or pass the gates are dropped and counted. */
function searchConfirm(args: Args): void {
  const file = str(args.flags.archive, '');
  if (!file) throw new Error(`search confirm --archive <archive.json> [--seeds N] [--shard i/n] [--minutes N]`);
  const archive = loadArchive(file, 0xc0ca);
  const seeds = num(args.flags.seeds, 8);
  const baseSeed = num(args.flags['base-seed'], 0xc0f12);
  const night = str(args.flags.night, new Date().toISOString().slice(0, 10));
  const deadlineAt = Date.now() + num(args.flags.minutes, 60) * 60_000;
  const m = /^(\d+)\/(\d+)$/.exec(str(args.flags.shard, '1/1'));
  const shard = m ? { index: Number(m[1]), of: Number(m[2]) } : { index: 1, of: 1 };
  const keys = [...new Set(archiveRows(archive).map(r => r.row.token))].sort();
  const mine = keys.filter((_, i) => i % shard.of === shard.index - 1);
  const dir = outDir(args, 'search_confirm');
  const rowsPath = path.join(dir, 'confirmed.jsonl');
  fs.writeFileSync(rowsPath, '');
  const prior = STAGES[STAGES.length - 1].seeds;
  STAGES[STAGES.length - 1].seeds = seeds;
  let done = 0, rejected = 0;
  for (const token of mine) {
    if (Date.now() > deadlineAt) break;
    const g = decodeGenome(token);
    const rowSeed = deriveSeed(baseSeed, done + 1);
    let r: ReturnType<typeof evaluateGenome>;
    try {
      r = evaluateGenome(g, STAGES.length - 1, rowSeed);
    } catch (err) {
      r = { key: genomeKey(g), genome: g, stage: STAGES.length - 1, seeds, episodes: 0, rejected: `crashed: ${(err as Error).message}` };
    }
    done++;
    if (r.rejected) rejected++;
    fs.appendFileSync(rowsPath, JSON.stringify({
      token, key: r.key, lvl: g.lvl, cell: r.cell, objectives: r.objectives, sd: r.sd, rejected: r.rejected,
      seeds, baseSeed: rowSeed, night, factors: factorsOf(g), genome: encodeGenome(g),
    }) + '\n');
  }
  STAGES[STAGES.length - 1].seeds = prior;
  fs.writeFileSync(path.join(dir, 'confirm.json'), JSON.stringify({ asked: mine.length, done, rejected, seeds, baseSeed, shard }, null, 1));
  console.log(`Confirmed ${done}/${mine.length} archive build(s) at ${seeds} seeds; ${rejected} no longer pass the gates.`);
  console.log(`Report: ${dir}`);
}

/** Main effects + interaction residuals over screen rows, per level band. */
function searchEffects(args: Args): void {
  const dirs = args._.slice(2);
  const objective = str(args.flags.objective, 'offense');
  const rows: (SearchRowLog & { token?: string })[] = [];
  for (const d of dirs) {
    const f = path.join(path.resolve(d), 'rows.jsonl');
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { rows.push(JSON.parse(line) as SearchRowLog); } catch { /* truncated */ }
    }
  }
  const out = analyzeEffects(rows, objective);
  const dir = outDir(args, 'search_effects');
  fs.writeFileSync(path.join(dir, 'effects.json'), JSON.stringify(out, null, 1));
  for (const band of out.bands) {
    console.log(`\nL${band.lvl}: ${band.rows} rows, objective ${objective}`);
    console.log(`  strongest: ${band.top.slice(0, 8).map(e => `${e.factor} ${e.multiplier.toFixed(2)}× (n${e.n})`).join(' · ')}`);
    console.log(`  weakest:   ${band.bottom.slice(0, 8).map(e => `${e.factor} ${e.multiplier.toFixed(2)}× (n${e.n})`).join(' · ')}`);
  }
  console.log(`\nReport: ${dir}`);
}

export interface EffectsBand {
  lvl: number;
  rows: number;
  top: { factor: string; multiplier: number; n: number }[];
  bottom: { factor: string; multiplier: number; n: number }[];
  /** Combinations far off the sum of their parts. */
  interactions: { key: string; residual: number; z: number; value: number; predicted: number; factors: string[]; token?: string }[];
}

/** Fit log(objective) on factor tokens per level band. Effects read as
 *  multipliers: "this support multiplies output by 1.4× on average". */
export function analyzeEffects(rows: readonly SearchRowLog[], objective: string, minN = 8): { objective: string; bands: EffectsBand[] } {
  const bands: EffectsBand[] = [];
  const levels = [...new Set(rows.map(r => r.lvl))].sort((a, b) => a - b);
  for (const lvl of levels) {
    const live = rows.filter(r => r.lvl === lvl && !r.rejected && (r.objectives?.[objective] ?? 0) > 0);
    if (live.length < minN) continue;
    const eff: EffectRow[] = live.map(r => ({ y: Math.log(r.objectives![objective]), factors: r.factors }));
    const fit = fitMainEffects(eff);
    const ranked = Object.entries(fit.effects).filter(([, e]) => e.n >= minN)
      .map(([factor, e]) => ({ factor, multiplier: Math.exp(e.effect), n: e.n }))
      .sort((a, b) => b.multiplier - a.multiplier);
    const scale = fit.residualMad > 0 ? fit.residualMad / 0.6745 : 1;
    const interactions = live.map((r, i) => {
      const value = r.objectives![objective];
      return {
        key: r.key, residual: fit.residuals[i], z: fit.residuals[i] / scale,
        value, predicted: value / Math.exp(fit.residuals[i]), factors: r.factors, token: r.token,
      };
    }).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 40);
    bands.push({ lvl, rows: live.length, top: ranked.slice(0, 40), bottom: ranked.slice(-40).reverse(), interactions });
  }
  return { objective, bands };
}
