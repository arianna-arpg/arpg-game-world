// ---------------------------------------------------------------------------
// THE FARM — `npm run farm -- <verb>`: the nightly run's four stages.
//
//   plan         the catalog and last night's costs in, a job-by-job plan out
//   shard        one runner's share: a worker pool over its units, with deadlines
//   consolidate  every shard's artifacts in, findings and the repair plan out
//   report       the night's durable record: trend rows, digest, next night's state
//
// The workflow (.github/workflows/balance-farm.yml) is thin glue over these, so a
// night can be rehearsed locally: `npm run farm -- rehearse --profile quick`.
//
// Coverage honesty is structural. The plan is the denominator: every planned unit
// is reported done, partial, failed or not run, and the digest names what did not
// run. A shard that dies takes only its own units, and those re-enter the repair
// plan, resuming from whatever they streamed.
// ---------------------------------------------------------------------------

import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { bootSimEngine } from '../../src/sim/arena';
import { compatCensus, ledgerSkillIds, type PairCrash, type PairDeepResult, type PairProbeResult } from '../../src/sim/compat';
import { SUITES } from '../../src/sim/data/scenarios';
import { checkLedger, emptyLedger, mergeProbed, observedDefects, type ObservedMatrix, type RigSignature, type SupportLedger } from '../../src/sim/ledger';
import { deriveSeed } from '../../src/sim/rng';
import {
  archiveRows, emptyArchive, mergeArchives, type SearchArchive, type SearchRowLog,
} from '../../src/sim/search/engine';
import { buildCatalog } from '../../src/sim/search/space';
import { LANE_ANALYZERS, rowErrors, supportPowerFindings, type Finding, type LaneAnalysis, type RowSnap } from './analyze';
import { FARM_PROFILES, buildPlan, packUnits, setBaselineSuites, setSuiteSizes, type FarmPlan, type FarmUnit } from './lanes';
import { renderDigest, renderReadme, type NightRecord, type TrendRow } from './report';
import { analyzeEffects } from './verbs';

const ROOT = process.cwd();
const CLI = path.join('balance', 'cli.ts');

interface Flags { _: string[]; [k: string]: string | boolean | string[] }
function parseFlags(argv: string[]): Flags {
  const out: Flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) out[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
      else out[a.slice(2)] = true;
    } else (out._ as string[]).push(a);
  }
  return out;
}
const flagStr = (f: Flags, k: string, d = ''): string => (typeof f[k] === 'string' ? f[k] as string : d);
const flagNum = (f: Flags, k: string, d: number): number => { const n = Number(f[k]); return typeof f[k] === 'string' && Number.isFinite(n) ? n : d; };

const readJson = <T>(file: string): T | null => {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
};
const writeJson = (file: string, data: unknown, pretty = true): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pretty ? JSON.stringify(data, null, 1) : JSON.stringify(data));
};

// -------------------------------------------------------------------- plan --

/** The night a timestamp belongs to. A run that starts just after midnight UTC and
 *  one delayed into the small hours are the same night in the owner's evening. */
export function nightKey(now: Date): string {
  return new Date(now.getTime() - 4 * 3600_000).toISOString().slice(0, 10);
}

function cmdPlan(f: Flags): void {
  const profile = FARM_PROFILES[flagStr(f, 'profile', 'full')];
  if (!profile) throw new Error(`unknown profile '${flagStr(f, 'profile')}' (have: ${Object.keys(FARM_PROFILES).join(', ')})`);
  bootSimEngine();
  const night = flagStr(f, 'night', nightKey(new Date()));
  const sha = flagStr(f, 'sha', 'local');
  const state = flagStr(f, 'state', '');
  const out = path.resolve(flagStr(f, 'out', 'farm-plan'));
  fs.mkdirSync(out, { recursive: true });
  const baselineDir = path.join(ROOT, 'balance', 'baselines');
  const suites = fs.readdirSync(baselineDir).filter(n => n.endsWith('.json')).map(n => n.replace(/\.json$/, ''))
    .filter(n => SUITES[n]);
  setBaselineSuites(suites);
  setSuiteSizes(Object.fromEntries(Object.entries(SUITES).map(([k, v]) => [k, v.length])));
  const costs = state ? readJson<Record<string, number>>(path.join(state, 'state', 'costs.json')) ?? {} : {};
  const trend = state && fs.existsSync(path.join(state, 'trend.jsonl'))
    ? fs.readFileSync(path.join(state, 'trend.jsonl'), 'utf8').split('\n').filter(Boolean).length : 0;
  const archiveFile = state ? path.join(state, 'state', 'archive.json') : '';
  let archivePath: string | undefined;
  if (archiveFile && fs.existsSync(archiveFile)) {
    fs.copyFileSync(archiveFile, path.join(out, 'archive.json'));
    archivePath = path.join('farm-plan', 'archive.json');
  }
  const nightIndex = Math.floor(Date.parse(`${night}T00:00:00Z`) / 86_400_000);
  const nightSeed = deriveSeed(0x4a11b, nightIndex);
  const plan = buildPlan({ night, nightIndex, nightSeed, profile, costs, archivePath }, sha);
  writeJson(path.join(out, 'plan.json'), plan);
  fs.writeFileSync(path.join(out, 'matrix.json'), JSON.stringify(plan.jobs.map(j => j.index)));
  console.log(`Night ${night} (${trend} prior), profile ${profile.id}, commit ${sha}`);
  console.log(`Plan: ${plan.jobs.length} job(s) × ${plan.workers} workers, ~${plan.estCoreHours} core-hours of measurement + search fill to ${plan.targetMinutes} min`);
  for (const [id, l] of Object.entries(plan.lanes)) {
    console.log(`  ${id.padEnd(13)} ${String(l.units).padStart(4)} unit(s)  ~${String(l.estEpisodes).padStart(7)} ep  ~${(l.estSec / 3600).toFixed(1).padStart(5)} core-h  ${l.label}`);
  }
  for (const n of plan.notPlanned) console.log(`  NOT PLANNED ${n.lane}: ${n.why}`);
}

// ------------------------------------------------------------------- shard --

export interface UnitStatus {
  id: string;
  lane: string;
  argv: string[];
  job: number;
  startedAt?: string;
  wallSec?: number;
  exitCode?: number | null;
  signal?: string | null;
  status: 'ok' | 'regression' | 'failed' | 'killed' | 'not_started' | 'skipped_deadline';
  gate?: boolean;
  /** Unit directory, relative to its shard's output root. */
  dir?: string;
}

function runUnit(unit: FarmUnit, job: number, outRoot: string, hardEndAt: number, softMinutes: number | null, resumeDir?: string): Promise<UnitStatus> {
  return new Promise(resolve => {
    const dir = path.join(outRoot, unit.id);
    fs.mkdirSync(dir, { recursive: true });
    const remainingMin = Math.max(1, (hardEndAt - Date.now()) / 60_000 - 1);
    const argv = [...unit.argv, '--out', dir];
    if (unit.fill) argv.push('--minutes', String(Math.max(1, Math.floor(softMinutes ?? 1))));
    else if (unit.deadlineAware) argv.push('--deadline-min', remainingMin.toFixed(1));
    if (resumeDir && unit.resumable) argv.push('--resume', resumeDir);
    const started = new Date();
    const log = fs.openSync(path.join(dir, 'log.txt'), 'w');
    const child = spawn(process.execPath, ['--import', 'tsx', CLI, ...argv], {
      cwd: ROOT, stdio: ['ignore', log, log],
      env: { ...process.env, FARM_UNIT: unit.id, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=3072`.trim() },
    });
    const finish = (status: Partial<UnitStatus>): void => {
      fs.closeSync(log);
      const row: UnitStatus = {
        id: unit.id, lane: unit.lane, argv: unit.argv, job, gate: unit.gate,
        startedAt: started.toISOString(), wallSec: Math.round((Date.now() - started.getTime()) / 1000),
        dir: unit.id, status: 'failed', ...status,
      };
      writeJson(path.join(dir, 'unit.json'), row);
      resolve(row);
    };
    const hardKill = setTimeout(() => { child.kill('SIGKILL'); }, Math.max(1000, hardEndAt - Date.now()));
    child.on('exit', (code, signal) => {
      clearTimeout(hardKill);
      finish({
        exitCode: code, signal,
        status: signal ? 'killed' : code === 0 ? 'ok' : code === 2 ? 'regression' : 'failed',
      });
    });
    child.on('error', () => { clearTimeout(hardKill); finish({ status: 'failed' }); });
  });
}

async function cmdShard(f: Flags): Promise<void> {
  const planPath = flagStr(f, 'plan', 'farm-plan/plan.json');
  const plan = readJson<FarmPlan>(planPath);
  if (!plan) throw new Error(`no plan at ${planPath}`);
  const index = flagNum(f, 'job', 1);
  const job = plan.jobs.find(j => j.index === index);
  if (!job) throw new Error(`plan has no job ${index}`);
  const outRoot = path.resolve(flagStr(f, 'out', `farm-out/job-${index}`));
  fs.mkdirSync(outRoot, { recursive: true });
  const t0 = Date.now();
  const softEnd = t0 + plan.targetMinutes * 60_000;
  const hardEnd = t0 + plan.deadlineMinutes * 60_000;
  const resumeRoot = flagStr(f, 'resume-root', '');
  const workers = flagNum(f, 'workers', plan.workers);
  console.log(`Job ${index}/${plan.jobs.length}: ${job.units.length} unit(s) + ${job.fill.length} fill, ${workers} worker(s) on ${os.availableParallelism()} CPU(s); target ${plan.targetMinutes} min, deadline ${plan.deadlineMinutes} min`);
  const queue = [...job.units];
  const fills = [...job.fill];
  const results: UnitStatus[] = [];
  const running = new Set<string>();
  let lastBeat = Date.now();
  const heartbeat = setInterval(() => {
    console.log(`  [${Math.round((Date.now() - t0) / 60_000)} min] ${results.length} done, ${queue.length} queued, running: ${[...running].slice(0, 6).join(', ')}`);
    lastBeat = Date.now();
  }, 5 * 60_000);
  const worker = async (slot: number): Promise<void> => {
    while (queue.length) {
      if (Date.now() >= hardEnd - 60_000) return;
      const unit = queue.shift()!;
      running.add(unit.id);
      const resumeDir = resumeRoot && fs.existsSync(path.join(resumeRoot, unit.id)) ? path.join(resumeRoot, unit.id) : undefined;
      const r = await runUnit(unit, index, outRoot, hardEnd, null, resumeDir);
      running.delete(unit.id);
      results.push(r);
      console.log(`  ${r.status.padEnd(10)} ${unit.id} (${r.wallSec}s)`);
    }
    // THE FILL: an idle worker spends what is left of the target on the anytime
    // lane, and always at least its floor, so a long night still searches. Only the
    // hard deadline can skip it.
    const fill = fills.shift();
    if (!fill) return;
    const floor = plan.minFillMinutes ?? 0;
    const left = Math.max((softEnd - Date.now()) / 60_000, floor);
    const room = (hardEnd - Date.now()) / 60_000 - 2;
    if (Math.min(left, room) < 2) {
      results.push({ id: fill.id, lane: fill.lane, argv: fill.argv, job: index, status: 'skipped_deadline' });
      return;
    }
    running.add(fill.id);
    const r = await runUnit(fill, index, outRoot, hardEnd, Math.min(left, room), undefined);
    running.delete(fill.id);
    results.push(r);
    console.log(`  ${r.status.padEnd(10)} ${fill.id} (${r.wallSec}s, slot ${slot})`);
  };
  await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
  clearInterval(heartbeat);
  void lastBeat;
  for (const u of queue) results.push({ id: u.id, lane: u.lane, argv: u.argv, job: index, status: 'not_started', gate: u.gate });
  for (const u of fills) results.push({ id: u.id, lane: u.lane, argv: u.argv, job: index, status: 'not_started' });
  writeJson(path.join(outRoot, 'shard.json'), {
    job: index, wallSec: Math.round((Date.now() - t0) / 1000), workers,
    cpus: os.availableParallelism(), cpuModel: os.cpus()[0]?.model, results,
  });
  console.log(`Job ${index} finished in ${Math.round((Date.now() - t0) / 60_000)} min: ${results.filter(r => r.status === 'ok').length} ok, ${results.filter(r => r.status === 'regression').length} regression, ${results.filter(r => r.status === 'failed' || r.status === 'killed').length} failed/killed, ${results.filter(r => r.status === 'not_started' || r.status === 'skipped_deadline').length} not run`);
}

// ------------------------------------------------------------- consolidate --

interface ShardOut { job: number; wallSec: number; workers: number; cpus: number; cpuModel?: string; results: UnitStatus[]; root: string }

/** Every shard directory under `root`, wherever artifact unpacking nested it. */
function findShards(root: string): ShardOut[] {
  const out: ShardOut[] = [];
  const walk = (d: string, depth: number): void => {
    if (depth > 3 || !fs.existsSync(d)) return;
    const s = readJson<ShardOut>(path.join(d, 'shard.json'));
    if (s) { out.push({ ...s, root: d }); return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) walk(path.join(d, e.name), depth + 1);
  };
  walk(root, 0);
  return out;
}

/** A killed runner writes no shard.json; its surviving unit directories still hold
 *  what they streamed. */
function findLooseUnits(root: string, known: Set<string>): { id: string; dir: string; status: UnitStatus | null }[] {
  const out: { id: string; dir: string; status: UnitStatus | null }[] = [];
  const walk = (d: string, depth: number): void => {
    if (depth > 4 || !fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(d, e.name);
      const hasLog = fs.existsSync(path.join(p, 'log.txt'));
      if (hasLog) { if (!known.has(e.name)) out.push({ id: e.name, dir: p, status: readJson<UnitStatus>(path.join(p, 'unit.json')) }); }
      else walk(p, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

function readVerdicts(dir: string): { rig: RigSignature | null; pairs: PairProbeResult[]; deep: PairDeepResult[]; crashes: PairCrash[] } {
  const res = { rig: null as RigSignature | null, pairs: [] as PairProbeResult[], deep: [] as PairDeepResult[], crashes: [] as PairCrash[] };
  const f = path.join(dir, 'verdicts.jsonl');
  if (!fs.existsSync(f)) return res;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { kind: string; rig?: RigSignature; pair?: PairProbeResult; deep?: PairDeepResult; crash?: PairCrash };
      if (row.kind === 'header') res.rig = row.rig ?? null;
      else if (row.kind === 'pair' && row.pair) res.pairs.push(row.pair);
      else if (row.kind === 'deep' && row.deep) res.deep.push(row.deep);
      else if (row.kind === 'crash' && row.crash) res.crashes.push(row.crash);
    } catch { /* truncated */ }
  }
  return res;
}

export interface LaneCoverage {
  label: string;
  planned: number;
  ok: number;
  regression: number;
  failed: number;
  killed: number;
  notRun: number;
  episodes: number;
  coreSec: number;
  missing: string[];
}

/** Read everything a phase produced into a night record. */
function gather(plan: FarmPlan, roots: string[]): {
  coverage: Record<string, LaneCoverage>;
  unitDirs: Map<string, string[]>;
  byUnit: Map<string, { dir: string; status: UnitStatus | null }>;
  shards: ShardOut[];
  planned: FarmUnit[];
} {
  const shards = roots.flatMap(findShards);
  const byUnit = new Map<string, { dir: string; status: UnitStatus | null }>();
  for (const s of shards) {
    for (const r of s.results) {
      if (r.dir) byUnit.set(r.id, { dir: path.join(s.root, r.dir), status: r });
      else if (!byUnit.has(r.id)) byUnit.set(r.id, { dir: '', status: r });
    }
  }
  for (const root of roots) {
    for (const u of findLooseUnits(root, new Set(byUnit.keys()))) byUnit.set(u.id, { dir: u.dir, status: u.status });
  }
  const planned = plan.jobs.flatMap(j => [...j.units, ...j.fill]);
  const coverage: Record<string, LaneCoverage> = {};
  for (const id of Object.keys(plan.lanes)) {
    coverage[id] = { label: plan.lanes[id].label, planned: 0, ok: 0, regression: 0, failed: 0, killed: 0, notRun: 0, episodes: 0, coreSec: 0, missing: [] };
  }
  const unitDirs = new Map<string, string[]>();
  for (const u of planned) {
    const c = coverage[u.lane] ?? (coverage[u.lane] = { label: u.lane, planned: 0, ok: 0, regression: 0, failed: 0, killed: 0, notRun: 0, episodes: 0, coreSec: 0, missing: [] });
    c.planned++;
    const got = byUnit.get(u.id);
    const st = got?.status?.status;
    if (got?.dir) (unitDirs.get(u.lane) ?? unitDirs.set(u.lane, []).get(u.lane)!).push(got.dir);
    c.coreSec += got?.status?.wallSec ?? 0;
    if (st === 'ok') c.ok++;
    else if (st === 'regression') c.regression++;
    else if (st === 'failed') { c.failed++; c.missing.push(u.id); }
    else if (st === 'killed') { c.killed++; c.missing.push(u.id); }
    else { c.notRun++; c.missing.push(u.id); }
  }
  return { coverage, unitDirs, byUnit, shards, planned };
}

const INCOMPLETE = new Set(['failed', 'killed', 'not_started', 'skipped_deadline']);

function cmdConsolidate(f: Flags): void {
  bootSimEngine();
  const planPath = flagStr(f, 'plan', 'farm-plan/plan.json');
  const plan = readJson<FarmPlan>(planPath);
  if (!plan) throw new Error(`no plan at ${planPath}`);
  const inRoot = path.resolve(flagStr(f, 'in', 'farm-shards'));
  const out = path.resolve(flagStr(f, 'out', 'farm-consolidated'));
  const state = flagStr(f, 'state', '');
  fs.mkdirSync(out, { recursive: true });
  const g = gather(plan, [inRoot]);
  const profile = FARM_PROFILES[plan.profile];

  // Lane analyses, findings.
  const { lanes, findings, rows, episodesByLane, rowErrors: scenarioErrors } = analyzeAll(g.unitDirs);

  // The search: merge archives, fit effects, propose confirmations.
  const prior = state ? readJson<SearchArchive>(path.join(state, 'state', 'archive.json')) : null;
  const archive = prior ?? emptyArchive(0xc0ca);
  let searchRows: SearchRowLog[] = [];
  const crashes = new Map<string, { signature: string; message: string; token: string; count: number }>();
  let searchEpisodes = 0, searchCandidates = 0, searchRejected = 0;
  for (const d of g.unitDirs.get('search') ?? []) {
    const a = readJson<SearchArchive>(path.join(d, 'archive.json'));
    if (a) mergeArchives(archive, a);
    const s = readJson<{ episodes: number; candidates: number; rejected: number }>(path.join(d, 'search.json'));
    if (s) { searchEpisodes += s.episodes; searchCandidates += s.candidates; searchRejected += s.rejected; }
    const rowsFile = path.join(d, 'rows.jsonl');
    if (fs.existsSync(rowsFile)) {
      for (const line of fs.readFileSync(rowsFile, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line) as SearchRowLog;
          if (row.crashed) {
            const signature = crashSignature(row.crashed);
            const seen = crashes.get(signature);
            if (seen) seen.count++;
            else crashes.set(signature, { signature, message: row.crashed.slice(0, 500), token: row.token ?? '', count: 1 });
          } else searchRows.push(row);
        } catch { /* truncated */ }
      }
    }
  }
  archive.totals.evaluated += searchCandidates;
  archive.totals.rejected += searchRejected;
  archive.totals.episodes += searchEpisodes;
  archive.totals.nights += 1;
  writeJson(path.join(out, 'archive.json'), archive, false);
  const effects = analyzeEffects(searchRows, 'offense');
  const coverageSeen = accumulateFactorCoverage(searchRows, state, out);
  searchRows = [];
  episodesByLane.search = searchEpisodes;

  // The matrix: union every shard's verdicts, then gate.
  const matrix = gateMatrix(g.unitDirs, state, out);
  episodesByLane.matrix = matrix.episodesPlain;
  episodesByLane.matrix_deep = matrix.episodesDeep;
  findings.push(...matrix.findings);

  // The committed baselines, and any crash.
  const gates = readGates(g);
  for (const [lane, n] of Object.entries(episodesByLane)) if (g.coverage[lane]) g.coverage[lane].episodes = n;

  const ranked = rankFindings(findings);
  writeJson(path.join(out, 'findings.json'), ranked);
  writeJson(path.join(out, 'rows.json'), rows, false);
  const record: Partial<NightRecord> = {
    night: plan.night, sha: plan.sha, profile: plan.profile, nightSeed: plan.nightSeed,
    coverage: g.coverage, lanes, gates, matrix: matrix.summary, rowErrors: scenarioErrors,
    search: {
      candidates: searchCandidates, rejected: searchRejected, episodes: searchEpisodes,
      archiveRows: archiveRows(archive).length, cursor: archive.cursor, totals: archive.totals, effects, coverage: coverageSeen,
      crashes: [...crashes.values()].sort((a, b) => b.count - a.count).slice(0, 20),
    },
    shards: g.shards.map(s => ({ job: s.job, wallSec: s.wallSec, workers: s.workers, cpus: s.cpus, cpuModel: s.cpuModel })),
  };
  writeJson(path.join(out, 'night.partial.json'), record);

  // PHASE B: repair what did not finish, confirm the extremes, and propose numbers.
  const repairs: FarmUnit[] = g.planned
    .filter(u => {
      const st = g.byUnit.get(u.id)?.status?.status;
      return !u.fill && (st === undefined || INCOMPLETE.has(st));
    })
    .map(u => ({ ...u, id: `${u.id}__repair`, repairOf: u.id } as FarmUnit & { repairOf: string }));
  const b = profile.phaseB;
  const units: FarmUnit[] = [...repairs];
  const archiveKeys = new Set(archiveRows(archive).map(r => r.row.token)).size;
  const confirmSec = archiveKeys * 2 * b.archiveSeeds * 1.5;
  const confirmShards = Math.max(1, Math.ceil(confirmSec / Math.max(600, profile.unitSeconds)));
  if (archiveKeys) {
    for (let i = 0; i < confirmShards; i++) {
      units.push({
        id: `archive_confirm_${i + 1}of${confirmShards}`, lane: 'archive_confirm',
        argv: ['search', 'confirm', '--archive', 'farm-consolidated/archive.json', '--seeds', String(b.archiveSeeds),
          '--night', plan.night, '--base-seed', String(deriveSeed(plan.nightSeed, 0xc0f)), '--shard', `${i + 1}/${confirmShards}`,
          '--minutes', String(b.deadlineMinutes - 5)],
        estSec: confirmSec / confirmShards, estEpisodes: (archiveKeys * 2 * b.archiveSeeds) / confirmShards,
      });
    }
  }
  const proposalCount = Math.min(b.proposalsTop, ranked.filter(x => x.ref).length);
  const propShards = Math.max(1, Math.ceil((proposalCount * b.confirmSeeds * 8 * 1.5) / Math.max(600, profile.unitSeconds)));
  if (proposalCount) {
    for (let i = 0; i < propShards; i++) {
      units.push({
        id: `proposals_${i + 1}of${propShards}`, lane: 'proposals', deadlineAware: true,
        argv: ['propose', '--findings', 'farm-consolidated/findings.json', '--top', String(proposalCount),
          '--seeds', String(b.confirmSeeds), '--base-seed', String(deriveSeed(plan.nightSeed, 0x9f0)), '--shard', `${i + 1}/${propShards}`],
        estSec: (proposalCount * b.confirmSeeds * 8 * 1.5) / propShards, estEpisodes: (proposalCount * b.confirmSeeds * 8) / propShards,
      });
    }
  }
  const jobs = packUnits(units, Math.max(1, Math.min(b.jobs, units.length || 1)));
  const planB: FarmPlan = {
    ...plan, phase: 'b', jobs,
    lanes: {
      archive_confirm: { label: 'high-seed re-measure of the archive on this commit', units: units.filter(u => u.lane === 'archive_confirm').length, estEpisodes: 0, estSec: confirmSec },
      proposals: { label: 'confirm outliers on fresh dice, solve for a number, verify', units: units.filter(u => u.lane === 'proposals').length, estEpisodes: 0, estSec: 0 },
    },
    targetMinutes: b.deadlineMinutes, deadlineMinutes: b.deadlineMinutes, workers: b.workers,
  };
  writeJson(path.join(out, 'plan-b.json'), planB);
  fs.writeFileSync(path.join(out, 'matrix-b.json'), JSON.stringify(planB.jobs.map(j => j.index)));
  // Partial dirs a repair needs to resume from.
  const resumeRoot = path.join(out, 'resume');
  for (const r of repairs) {
    const orig = (r as FarmUnit & { repairOf: string }).repairOf;
    const dir = g.byUnit.get(orig)?.dir;
    if (dir && fs.existsSync(dir)) fs.cpSync(dir, path.join(resumeRoot, r.id), { recursive: true });
  }
  console.log(`Consolidated ${g.shards.length} shard(s): ${ranked.length} finding(s), ${repairs.length} unit(s) to repair, ${units.length} phase-B unit(s) in ${jobs.length} job(s).`);
}

/** Crashes group by their message and first frame's function, not by line number. */
export function crashSignature(message: string): string {
  const [head, frame] = message.split(' | ');
  const fn = /at ([\w.$<>]+)/.exec(frame ?? '')?.[1] ?? '';
  return `${(head ?? '').slice(0, 120)} @ ${fn}`;
}

/** How much of the build space has ever been tried: every factor value seen in a
 *  legal, evaluated candidate, accumulated across nights on the data branch. */
function accumulateFactorCoverage(rows: readonly SearchRowLog[], state: string, out: string): Record<string, { seen: number; of: number }> {
  const prior = (state ? readJson<Record<string, number>>(path.join(state, 'state', 'search-factors.json')) : null) ?? {};
  for (const r of rows) {
    if (r.rejected) continue;
    for (const f of r.factors) prior[f] = (prior[f] ?? 0) + 1;
  }
  writeJson(path.join(out, 'search-factors.json'), prior, false);
  const cat = buildCatalog();
  const count = (prefix: string): number => Object.keys(prior).filter(k => k.startsWith(prefix)).length;
  return {
    class: { seen: count('class:'), of: cat.classes.length },
    primary: { seen: count('primary:'), of: cat.strikers.length },
    skill: { seen: count('skill:'), of: cat.skills.length },
    support: { seen: count('support:'), of: new Set(cat.skills.flatMap(s => cat.fits(s))).size },
    unique: { seen: count('unique:'), of: cat.uniques.length },
  };
}

function analyzeAll(unitDirs: Map<string, string[]>): {
  lanes: Record<string, Record<string, unknown>>;
  findings: Finding[];
  rows: Record<string, RowSnap>;
  episodesByLane: Record<string, number>;
  rowErrors: { lane: string; signature: string; count: number; sample: string; message: string }[];
} {
  const lanes: Record<string, Record<string, unknown>> = {};
  const findings: Finding[] = [];
  const rows: Record<string, RowSnap> = {};
  const episodesByLane: Record<string, number> = {};
  for (const [lane, analyzer] of Object.entries(LANE_ANALYZERS)) {
    const dirs = unitDirs.get(lane) ?? [];
    let a: LaneAnalysis;
    try {
      a = analyzer(dirs);
    } catch (err) {
      lanes[lane] = { analysisError: (err as Error).message };
      continue;
    }
    lanes[lane] = a.summary;
    findings.push(...a.findings);
    Object.assign(rows, a.rows);
    episodesByLane[lane] = a.episodes;
  }
  const errors = [...unitDirs.entries()].flatMap(([lane, dirs]) => rowErrors(dirs).map(e => ({ lane, ...e })));
  // The census unit's and the expression unit's own files.
  for (const d of unitDirs.get('expression') ?? []) {
    const e = readJson<{ episodesRun: number; baseline: { hosts: Record<string, { mute: string; why?: string }> } }>(path.join(d, 'expression.json'));
    if (!e) continue;
    episodesByLane.expression = e.episodesRun;
    const counts: Record<string, number> = {};
    for (const h of Object.values(e.baseline.hosts)) counts[h.mute] = (counts[h.mute] ?? 0) + 1;
    lanes.expression = { hosts: Object.keys(e.baseline.hosts).length, counts };
  }
  return { lanes, findings, rows, episodesByLane, rowErrors: errors };
}

function gateMatrix(unitDirs: Map<string, string[]>, state: string, out: string): {
  findings: Finding[];
  episodesPlain: number;
  episodesDeep: number;
  summary: Record<string, unknown>;
} {
  const plain = (unitDirs.get('matrix') ?? []).map(d => ({ d, v: readVerdicts(d) }));
  const deepRuns = (unitDirs.get('matrix_deep') ?? []).map(d => ({ d, v: readVerdicts(d) }));
  const merged = mergeProbed([...plain, ...deepRuns].map(x => x.v.pairs));
  const deep = deepRuns.flatMap(x => x.v.deep);
  const census = compatCensus();
  const eligible = census.rows.filter(r => r.fit !== 'refused').length;
  const ledgerPath = path.join(ROOT, 'balance', 'baselines', 'support_matrix.json');
  const ledger = readJson<SupportLedger>(ledgerPath) ?? emptyLedger();
  const observed: ObservedMatrix = { probed: merged.probed, census, ...(deep.length ? { deep } : {}) };
  const check = checkLedger(ledger, observed);
  const defects = observedDefects(observed);
  // THE DEFECT MEMORY: every defect seen so far. A pair probed tonight updates it, and
  // a pair that did not run tonight keeps its last reading, so a missed shard can never
  // read as a fix or, the next night, as a fresh defect. The deep lane rotates, so a
  // 'partial' row's first sighting is coverage arriving, not a regression.
  const tonightRows = defects.map(d => `${d.skill}|${d.support}|${d.kind}`);
  const yesterday = state ? readJson<string[]>(path.join(state, 'state', 'defects.json')) : null;
  const probedKeys = new Set(merged.probed.map(p => `${p.skillId}|${p.supportId}`));
  const tonightSet = new Set(tonightRows);
  const carried = (yesterday ?? []).filter(k => !probedKeys.has(k.split('|').slice(0, 2).join('|')));
  const memory = [...new Set([...carried, ...tonightRows])].sort();
  fs.writeFileSync(path.join(out, 'defects.json'), JSON.stringify(memory));
  const yset = new Set(yesterday ?? []);
  const appeared = yesterday ? tonightRows.filter(k => !yset.has(k)) : [];
  const newSinceYesterday = appeared.filter(k => !k.endsWith('|partial'));
  const newPartial = appeared.length - newSinceYesterday.length;
  const healedSinceYesterday = (yesterday ?? []).filter(k => probedKeys.has(k.split('|').slice(0, 2).join('|')) && !tonightSet.has(k));
  const verdicts: Record<string, number> = {};
  for (const p of merged.probed) verdicts[p.verdict] = (verdicts[p.verdict] ?? 0) + 1;
  const power = supportPowerFindings(merged.probed);
  const episodesPlain = plain.reduce((s, x) => s + (readJson<{ episodesRun: number }>(path.join(x.d, 'compat.json'))?.episodesRun ?? x.v.pairs.length), 0);
  const episodesDeep = deepRuns.reduce((s, x) => s + (readJson<{ episodesRun: number }>(path.join(x.d, 'compat.json'))?.episodesRun ?? x.v.pairs.length), 0);
  return {
    findings: power.findings,
    episodesPlain, episodesDeep,
    summary: {
      eligible, probed: merged.probed.length, conflicts: merged.conflicts.length,
      coveragePct: eligible ? Math.round((merged.probed.length / eligible) * 1000) / 10 : 0,
      verdicts, deepPairs: deep.length,
      ledger: {
        rows: ledger.pairs.length,
        newAgainstLedger: check.newDefects.length,
        resolvedAgainstLedger: check.resolved.length,
        drifted: check.driftedKind.length,
        unverified: check.unverified.length,
        newSuspects: check.newSuspects.length,
        sample: check.newDefects.slice(0, 20).map(d => `${d.kind} ${d.skill} + ${d.support}`),
      },
      newSinceYesterday: newSinceYesterday.length,
      newSinceYesterdaySample: newSinceYesterday.slice(0, 30),
      newPartial,
      healedSinceYesterday: healedSinceYesterday.length,
      supportPowerTop: power.table.slice(0, 15),
      supportPowerBottom: power.table.slice(-15).reverse(),
      ledgerIds: ledgerSkillIds().size,
      crashes: matrixCrashes([...plain, ...deepRuns].flatMap(x => x.v.crashes)),
    },
  };
}

function matrixCrashes(crashes: readonly PairCrash[]): { signature: string; message: string; pair: string; count: number }[] {
  const by = new Map<string, { signature: string; message: string; pair: string; count: number }>();
  for (const c of crashes) {
    const signature = crashSignature(c.error);
    const row = by.get(signature);
    if (row) row.count++;
    else by.set(signature, { signature, message: c.error.slice(0, 500), pair: `${c.skillId} ${c.supportId}`, count: 1 });
  }
  return [...by.values()].sort((a, b) => b.count - a.count).slice(0, 20);
}

function readGates(g: ReturnType<typeof gather>): NightRecord['gates'] {
  const baselines: NightRecord['gates']['baselines'] = [];
  for (const d of g.unitDirs.get('baselines') ?? []) {
    const b = readJson<{ suite: string; seeds: number; baselineAt: string; deviations: { scenarioId: string; metric: string; a: number; b: number; rel: number; tol: number; via: string }[] }>(path.join(d, 'baseline.json'));
    if (b) baselines.push({ suite: b.suite, baselineAt: b.baselineAt, breaches: b.deviations.length, deviations: b.deviations.slice(0, 20) });
    else baselines.push({ suite: path.basename(d), baselineAt: '', breaches: -1, deviations: [] });
  }
  const failed: NightRecord['gates']['failed'] = [];
  for (const [id, row] of g.byUnit) {
    const st = row.status?.status;
    if (st === 'failed' || st === 'killed') {
      let tail = '';
      const log = row.dir ? path.join(row.dir, 'log.txt') : '';
      if (log && fs.existsSync(log)) tail = fs.readFileSync(log, 'utf8').split('\n').filter(l => !l.startsWith('[content]')).slice(-6).join('\n').slice(-600);
      failed.push({ unit: id, lane: row.status?.lane ?? '?', status: st, tail });
    }
  }
  const regressions: string[] = [];
  for (const [id, row] of g.byUnit) if (row.status?.status === 'regression' && row.status.gate) regressions.push(id);
  return { baselines, failed, regressions };
}

/** Rarer kinds and larger departures first; each kind capped, so one noisy lane
 *  cannot crowd out the others. */
function rankFindings(findings: readonly Finding[]): Finding[] {
  const byId = new Map<string, Finding>();
  for (const x of findings) {
    const cur = byId.get(x.id);
    if (!cur || Math.abs(x.z) > Math.abs(cur.z)) byId.set(x.id, x);
  }
  const kinds = new Map<string, Finding[]>();
  for (const x of byId.values()) (kinds.get(x.kind) ?? kinds.set(x.kind, []).get(x.kind)!).push(x);
  const ranked: Finding[] = [];
  for (const list of kinds.values()) {
    list.sort((a, b) => Math.abs(b.z) * Math.abs(Math.log(Math.max(b.ratio, 0.01))) - Math.abs(a.z) * Math.abs(Math.log(Math.max(a.ratio, 0.01))));
    ranked.push(...list.slice(0, 80));
  }
  return ranked.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

// ------------------------------------------------------------------ report --

function cmdReport(f: Flags): void {
  bootSimEngine();
  const consolidated = path.resolve(flagStr(f, 'consolidated', 'farm-consolidated'));
  const planPath = path.join(consolidated, 'plan-b.json');
  const planB = readJson<FarmPlan>(planPath);
  const planA = readJson<FarmPlan>(path.resolve(flagStr(f, 'plan', 'farm-plan/plan.json')));
  const partial = readJson<NightRecord>(path.join(consolidated, 'night.partial.json'));
  if (!planA || !partial) throw new Error('report needs the plan and night.partial.json');
  const state = path.resolve(flagStr(f, 'state', 'farm-state'));
  const out = path.resolve(flagStr(f, 'out', 'farm-report'));
  fs.mkdirSync(out, { recursive: true });
  const runUrl = flagStr(f, 'run-url', '');
  const startedAt = flagStr(f, 'started-at', '');
  const wallMinutes = startedAt ? Math.round((Date.now() - Date.parse(startedAt)) / 60_000) : null;
  const inB = path.resolve(flagStr(f, 'phase-b', 'farm-shards-b'));

  // Phase B: repairs folded in, proposals and archive confirmations read.
  const gB = planB ? gather(planB, [inB]) : null;
  const proposals: unknown[] = [];
  let confirmEpisodes = 0, proposalEpisodes = 0;
  const confirmed: { key: string; objectives?: Record<string, number>; sd?: Record<string, number>; lvl: number; cell?: string; rejected?: string; genome: string; factors: string[]; baseSeed?: number; seeds?: number }[] = [];
  for (const d of gB?.unitDirs.get('proposals') ?? []) {
    const file = path.join(d, 'proposals.jsonl');
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const p = JSON.parse(line) as { episodes?: number };
        proposals.push(p);
        proposalEpisodes += p.episodes ?? 0;
      } catch { /* truncated */ }
    }
  }
  for (const d of gB?.unitDirs.get('archive_confirm') ?? []) {
    const file = path.join(d, 'confirmed.jsonl');
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as (typeof confirmed)[number] & { seeds?: number };
        confirmed.push(row);
        confirmEpisodes += (row.seeds ?? 0) * 2;
      } catch { /* truncated */ }
    }
  }

  // Repairs: fold their lane outputs over phase A's counts.
  const repaired = new Map<string, string>();
  for (const u of planB?.jobs.flatMap(j => j.units) ?? []) {
    const orig = (u as FarmUnit & { repairOf?: string }).repairOf;
    const st = gB?.byUnit.get(u.id)?.status?.status;
    if (orig && (st === 'ok' || st === 'regression')) repaired.set(orig, st);
  }
  // A repaired unit's own output replaces its partial original, so the numbers
  // below are the night's whole measurement rather than phase A's share of it.
  const inA = path.resolve(flagStr(f, 'shards', 'farm-shards'));
  if (repaired.size && fs.existsSync(inA)) {
    const gA = gather(planA, [inA]);
    for (const u of planB?.jobs.flatMap(j => j.units) ?? []) {
      const orig = (u as FarmUnit & { repairOf?: string }).repairOf;
      if (!orig || !repaired.has(orig)) continue;
      const fixedDir = gB?.byUnit.get(u.id)?.dir;
      if (!fixedDir) continue;
      const list = gA.unitDirs.get(u.lane) ?? [];
      const oldDir = gA.byUnit.get(orig)?.dir;
      gA.unitDirs.set(u.lane, [...list.filter(d => d !== oldDir), fixedDir]);
      const row = gB?.byUnit.get(u.id);
      if (row) gA.byUnit.set(orig, row);
    }
    const again = analyzeAll(gA.unitDirs);
    const matrixAgain = gateMatrix(gA.unitDirs, state, consolidated);
    partial.lanes = { ...partial.lanes, ...again.lanes };
    partial.matrix = matrixAgain.summary;
    partial.gates = readGates(gA);
    partial.rowErrors = again.rowErrors;
    again.findings.push(...matrixAgain.findings);
    writeJson(path.join(consolidated, 'findings.json'), rankFindings(again.findings));
    writeJson(path.join(consolidated, 'rows.json'), again.rows, false);
    for (const [lane, n] of Object.entries(again.episodesByLane)) if (partial.coverage[lane]) partial.coverage[lane].episodes = n;
    if (partial.coverage.matrix) partial.coverage.matrix.episodes = matrixAgain.episodesPlain;
    if (partial.coverage.matrix_deep) partial.coverage.matrix_deep.episodes = matrixAgain.episodesDeep;
  }
  const coverage = partial.coverage;
  for (const [lane, c] of Object.entries(coverage)) {
    const still: string[] = [];
    for (const id of c.missing) {
      const st = repaired.get(id);
      if (st) { if (st === 'ok') c.ok++; else c.regression++; }
      else still.push(id);
    }
    const fixed = c.missing.length - still.length;
    if (fixed) {
      c.notRun = Math.max(0, c.notRun - fixed);
      c.missing = still;
    }
    void lane;
  }

  const crashRows = [
    ...((partial.search as { crashes?: { signature: string }[] }).crashes ?? []),
    ...((partial.matrix as { crashes?: { signature: string }[] }).crashes ?? []),
  ];
  crashRows.push(...(partial.rowErrors ?? []));
  const knownCrashes = new Set(readJson<string[]>(path.join(state, 'state', 'crash-signatures.json')) ?? []);
  (partial.search as { newCrashes?: string[] }).newCrashes = [...new Set(crashRows.map(x => x.signature))].filter(s => !knownCrashes.has(s));
  const findings = readJson<Finding[]>(path.join(consolidated, 'findings.json')) ?? [];
  const yesterdayFindings = new Set(readJson<string[]>(path.join(state, 'state', 'finding-ids.json')) ?? []);
  const hadYesterday = fs.existsSync(path.join(state, 'state', 'finding-ids.json'));
  const rows = readJson<Record<string, RowSnap>>(path.join(consolidated, 'rows.json')) ?? {};
  const prevRows = readJson<Record<string, RowSnap>>(path.join(state, 'state', 'rows.json')) ?? {};
  const moved = diffRows(prevRows, rows);

  const totalEpisodes = Object.values(coverage).reduce((s, c) => s + c.episodes, 0) + confirmEpisodes + proposalEpisodes;
  const coreSec = Object.values(coverage).reduce((s, c) => s + c.coreSec, 0);
  const record: NightRecord = {
    ...partial,
    runUrl, wallMinutes,
    totalEpisodes,
    coreHours: Math.round(coreSec / 36) / 100,
    newFindings: hadYesterday ? findings.filter(x => !yesterdayFindings.has(x.id)).map(x => x.id) : [],
    findings,
    moved,
    proposals: (proposals as { priority?: number }[]).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)) as NightRecord['proposals'],
    archiveConfirmed: confirmed.length,
    archiveDropped: confirmed.filter(c => c.rejected).length,
    elites: eliteLeaders(confirmed),
    bandsProposal: bandProposals(rows),
  };
  writeJson(path.join(out, 'summary.json'), record);
  const trendRow = trendRowOf(record);
  const digest = renderDigest(record, trendRow, readTrend(state));
  fs.writeFileSync(path.join(out, 'digest.md'), digest);

  // The durable tree, ready to overlay on the data branch.
  const tree = path.join(out, 'tree');
  fs.mkdirSync(path.join(tree, 'latest'), { recursive: true });
  fs.mkdirSync(path.join(tree, 'state'), { recursive: true });
  fs.mkdirSync(path.join(tree, 'nights', record.night), { recursive: true });
  writeJson(path.join(tree, 'latest', 'summary.json'), record);
  fs.writeFileSync(path.join(tree, 'latest', 'digest.md'), digest);
  writeJson(path.join(tree, 'nights', record.night, 'summary.json'), {
    night: record.night, sha: record.sha, coverage: record.coverage, gates: record.gates, matrix: record.matrix,
    totalEpisodes: record.totalEpisodes, coreHours: record.coreHours, wallMinutes: record.wallMinutes,
    findings: record.findings.slice(0, 60), proposals: record.proposals.slice(0, 30), runUrl,
  });
  fs.writeFileSync(path.join(tree, 'nights', record.night, 'digest.md'), digest);
  const trendFile = path.join(tree, 'trend.jsonl');
  const priorTrend = fs.existsSync(path.join(state, 'trend.jsonl')) ? fs.readFileSync(path.join(state, 'trend.jsonl'), 'utf8') : '';
  fs.writeFileSync(trendFile, priorTrend.split('\n').filter(l => l.trim() && !l.includes(`"night":"${record.night}"`)).concat(JSON.stringify(trendRow)).join('\n') + '\n');
  fs.writeFileSync(path.join(tree, 'README.md'), renderReadme(record, digest));
  writeJson(path.join(tree, 'state', 'rows.json'), rows, false);
  writeJson(path.join(tree, 'state', 'costs.json'), costsOf(coverage));
  writeJson(path.join(tree, 'state', 'finding-ids.json'), findings.map(x => x.id));
  writeJson(path.join(tree, 'state', 'crash-signatures.json'), [...new Set([...knownCrashes, ...crashRows.map(x => x.signature)])]);
  const archive = readJson<SearchArchive>(path.join(consolidated, 'archive.json'));
  if (archive) {
    // A row that no longer passes the gates leaves the archive here.
    const dead = new Set(confirmed.filter(c => c.rejected).map(c => c.key));
    if (dead.size) {
      for (const cells of [...Object.values(archive.best), ...Object.values(archive.worst)]) {
        for (const [cell, row] of Object.entries(cells)) if (dead.has(row.key)) delete cells[cell];
      }
    }
    writeJson(path.join(tree, 'state', 'archive.json'), archive, false);
  }
  for (const file of ['defects.json', 'search-factors.json']) {
    const from = path.join(consolidated, file);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(tree, 'state', file));
  }

  const red = isRed(record);
  writeJson(path.join(out, 'status.json'), { red, reasons: redReasons(record), night: record.night, title: digestTitle(record) });
  console.log(`Night ${record.night}: ${totalEpisodes} episode(s), ${record.coreHours} core-hours${wallMinutes !== null ? `, ${wallMinutes} min wall` : ''}, ${findings.length} finding(s), ${record.proposals.length} proposal row(s), ${red ? 'RED' : 'green'}.`);
}

function readTrend(state: string): TrendRow[] {
  const f = path.join(state, 'trend.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).flatMap(l => { try { return [JSON.parse(l) as TrendRow]; } catch { return []; } });
}

export function redReasons(r: NightRecord): string[] {
  const reasons: string[] = [];
  for (const b of r.gates.baselines) if (b.breaches > 0) reasons.push(`baseline '${b.suite}' moved on ${b.breaches} metric(s)`);
  for (const id of r.gates.regressions) if (!id.startsWith('baseline_')) reasons.push(`gated unit ${id} failed its check`);
  if (r.gates.failed.length) reasons.push(`${r.gates.failed.length} unit(s) crashed`);
  const m = r.matrix as { newSinceYesterday?: number };
  if ((m.newSinceYesterday ?? 0) > 0) reasons.push(`${m.newSinceYesterday} new matrix defect(s) since last night`);
  const fresh = (r.search as { newCrashes?: string[] }).newCrashes ?? [];
  if (fresh.length) reasons.push(`${fresh.length} new way(s) a legal build crashes the engine`);
  const gaps = ((r.lanes.progression as { instrumentGaps?: string[] } | undefined)?.instrumentGaps ?? []);
  if (gaps.length) reasons.push(`instrument gap: ${gaps.join(', ')} read(s) as mute on every lane`);
  return reasons;
}
const isRed = (r: NightRecord): boolean => redReasons(r).length > 0;
const digestTitle = (r: NightRecord): string => {
  const unrun = Object.values(r.coverage).reduce((s, c) => s + c.missing.length, 0);
  return `Balance farm ${r.night}: ${isRed(r) ? 'REGRESSION' : 'green'}${unrun ? ` (${unrun} units did not run)` : ''}, ${r.findings.length} outliers, ${(r.proposals as { status: string }[]).filter(p => p.status === 'proposed').length} proposals`;
};

/** Rows that moved past both a relative threshold and their own noise. Two nights
 *  run at common seeds, so a move here is a content change or a stream shift, and
 *  the SD test filters out the latter. */
export function diffRows(prev: Record<string, RowSnap>, cur: Record<string, RowSnap>): NightRecord['moved'] {
  const out: NightRecord['moved'] = [];
  for (const [k, b] of Object.entries(cur)) {
    const a = prev[k];
    if (!a) continue;
    const d = b.v - a.v;
    if (d === 0) continue;
    const se = Math.max(a.sd ?? 0, b.sd ?? 0);
    if (Math.abs(d) <= se || Math.abs(d) < 0.5) continue;
    const rel = a.v !== 0 ? Math.abs(d / a.v) : 1;
    if (rel < 0.1) continue;
    out.push({ key: k, before: a.v, after: b.v, rel: Math.round(rel * 1000) / 1000 });
  }
  return out.sort((x, y) => y.rel - x.rel).slice(0, 200);
}

function costsOf(coverage: Record<string, LaneCoverage>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [lane, c] of Object.entries(coverage)) {
    if (c.episodes > 0 && c.coreSec > 0) out[lane] = Math.round((c.coreSec / c.episodes) * 1000) / 1000;
  }
  return out;
}

function eliteLeaders(confirmed: { key: string; objectives?: Record<string, number>; lvl: number; cell?: string; rejected?: string; genome: string; factors: string[]; baseSeed?: number; seeds?: number }[]): NightRecord['elites'] {
  const live = confirmed.filter(c => !c.rejected && c.objectives);
  const out: NightRecord['elites'] = [];
  for (const lvl of [...new Set(live.map(c => c.lvl))].sort((a, b) => a - b)) {
    const band = live.filter(c => c.lvl === lvl);
    for (const objective of ['offense', 'clear']) {
      const sorted = band.filter(c => (c.objectives![objective] ?? 0) > 0).sort((a, b) => b.objectives![objective] - a.objectives![objective]);
      const med = sorted.length ? sorted[Math.floor(sorted.length / 2)].objectives![objective] : 0;
      for (const c of [...sorted.slice(0, 3), ...sorted.slice(-1)]) {
        out.push({ lvl, objective, value: Math.round(c.objectives![objective] * 100) / 100, ratioToMedian: med ? Math.round((c.objectives![objective] / med) * 100) / 100 : 0, cell: c.cell ?? '', key: c.key, genome: c.genome, factors: c.factors.slice(0, 10), baseSeed: c.baseSeed, seeds: c.seeds });
      }
    }
  }
  return out;
}

/** Observed roster distribution per band metric: numbers to weigh against the
 *  provisional bands. Suggestions only, and a person signs them off. */
function bandProposals(rows: Record<string, RowSnap>): NightRecord['bandsProposal'] {
  const out: NightRecord['bandsProposal'] = [];
  const groups = new Map<string, number[]>();
  for (const [k, r] of Object.entries(rows)) {
    const m = /^class:[^:]+:([^:]+):L(\d+):([^:]+)$/.exec(k);
    if (!m) continue;
    const g = `${m[3]}|${m[1]}|L${m[2]}`;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(r.v);
  }
  for (const [g, vs] of [...groups.entries()].sort()) {
    const s = vs.filter(v => v > 0).sort((a, b) => a - b);
    if (s.length < 5) continue;
    const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(q * s.length))];
    out.push({ group: g, n: s.length, zero: vs.length - s.length, p10: Math.round(at(0.1) * 100) / 100, median: Math.round(at(0.5) * 100) / 100, p90: Math.round(at(0.9) * 100) / 100 });
  }
  return out;
}

function trendRowOf(r: NightRecord): TrendRow {
  const prog = r.lanes.progression as { expressionCounts?: Record<string, number>; cohorts?: { cohort: string; median: number; spread: number }[] } | undefined;
  const cohort = (key: string): { median: number; spread: number } | undefined => prog?.cohorts?.find(c => c.cohort === key);
  const m = r.matrix as { probed?: number; eligible?: number; verdicts?: Record<string, number>; ledger?: { newAgainstLedger?: number } };
  return {
    night: r.night, sha: r.sha,
    episodes: r.totalEpisodes, coreHours: r.coreHours, wallMinutes: r.wallMinutes,
    findings: r.findings.length,
    proposals: (r.proposals as { status: string }[]).filter(p => p.status === 'proposed').length,
    red: isRed(r),
    expressionMute: prog?.expressionCounts?.mute ?? null,
    classSparL20Median: cohort('L20|starter|spar|dps_out')?.median ?? null,
    classSparL20Spread: cohort('L20|starter|spar|dps_out')?.spread ?? null,
    kittedSparL20Median: cohort('L20|kitted|spar|dps_out')?.median ?? null,
    matrixProbed: m.probed ?? null, matrixEligible: m.eligible ?? null,
    matrixInert: m.verdicts?.inert ?? null,
    matrixEffective: m.verdicts?.effective ?? null,
    searchArchive: (r.search as { archiveRows?: number }).archiveRows ?? null,
    searchEvaluated: (r.search as { totals?: { evaluated?: number } }).totals?.evaluated ?? null,
  };
}

// ---------------------------------------------------------------- rehearse --

/** Run a whole night locally, end to end, at a chosen profile: the machine's
 *  own test. Uses the same stages the workflow does, in one directory. */
async function cmdRehearse(f: Flags): Promise<void> {
  const dir = path.resolve(flagStr(f, 'dir', '.farm-rehearsal'));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const profile = flagStr(f, 'profile', 'quick');
  const self = path.join('balance', 'farm', 'cli.ts');
  const run = (args: string[]): void => {
    console.log(`\n$ farm ${args.join(' ')}`);
    const r = spawnSync(process.execPath, ['--import', 'tsx', self, ...args], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`farm ${args[0]} exited ${r.status}`);
  };
  const state = path.join(dir, 'state-tree');
  fs.mkdirSync(state, { recursive: true });
  run(['plan', '--profile', profile, '--out', 'farm-plan', '--state', state, '--sha', 'rehearsal']);
  const plan = readJson<FarmPlan>('farm-plan/plan.json')!;
  for (const j of plan.jobs) run(['shard', '--plan', 'farm-plan/plan.json', '--job', String(j.index), '--out', path.join(dir, 'shards', `job-${j.index}`)]);
  run(['consolidate', '--plan', 'farm-plan/plan.json', '--in', path.join(dir, 'shards'), '--out', 'farm-consolidated', '--state', state]);
  const planB = readJson<FarmPlan>('farm-consolidated/plan-b.json')!;
  for (const j of planB.jobs) run(['shard', '--plan', 'farm-consolidated/plan-b.json', '--job', String(j.index), '--out', path.join(dir, 'shards-b', `job-${j.index}`), '--resume-root', 'farm-consolidated/resume']);
  run(['report', '--plan', 'farm-plan/plan.json', '--consolidated', 'farm-consolidated', '--shards', path.join(dir, 'shards'), '--phase-b', path.join(dir, 'shards-b'), '--state', state, '--out', path.join(dir, 'report'), '--started-at', new Date().toISOString()]);
  console.log(`\nRehearsal complete: ${path.join(dir, 'report', 'digest.md')}`);
}

// -------------------------------------------------------------------- main --

async function main(): Promise<void> {
  const f = parseFlags(process.argv.slice(2));
  const cmd = (f._ as string[])[0];
  try {
    if (cmd === 'plan') cmdPlan(f);
    else if (cmd === 'shard') await cmdShard(f);
    else if (cmd === 'consolidate') cmdConsolidate(f);
    else if (cmd === 'report') cmdReport(f);
    else if (cmd === 'rehearse') await cmdRehearse(f);
    else {
      console.log(`farm plan|shard|consolidate|report|rehearse (see docs/balance/README.md, "The farm")`);
      if (cmd) process.exitCode = 1;
    }
  } catch (err) {
    console.error(`error: ${(err as Error).stack ?? String(err)}`);
    process.exitCode = 1;
  }
}

// Importable by the self-test without running a verb.
if (process.argv[1] && path.basename(process.argv[1]) === 'cli.ts') void main();
