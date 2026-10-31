// ---------------------------------------------------------------------------
// THE ANALYZERS — one night's lane outputs in, summaries and findings out.
//
// Each lane has one analyzer row. An analyzer reads the files its units wrote and
// returns what the report needs: a compact summary, snapshot rows for tomorrow's
// comparison, and FINDINGS. A finding is a claim of the form "this row sits far
// from its cohort", carrying the scenario ref that re-measures it and the number a
// fix would aim for. The honesty rules live here:
//
//   * a warned row is not evidence, so it never reaches a finding;
//   * zeros are triage, counted beside the cohort and never ranked within it;
//   * cohorts compare like with like (the same level, delivery family and cooldown
//     class for skills), because the sustained lane underrates cooldown skills by
//     construction and a cross-cooldown ratio would be an artifact;
//   * outliers come from log-scale median and MAD, which the outliers cannot drag.
//
// Node-side, reading registries for metadata only: nothing here runs an episode.
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MONSTERS } from '../../src/data/monsters';
import { SKILLS } from '../../src/data/skills';
import { SUPPORTS } from '../../src/data/supports';
import { BUILD_TIERS } from '../../src/sim/data/builds';
import { DELIVERY_FAMILY } from '../../src/sim/search/engine';
import { readCohort, median, type CohortSummary } from '../../src/sim/stats';
import type { ScenarioReport } from '../../src/sim/types';

export interface Finding {
  /** Stable across nights: the identity "new since yesterday" is computed from. */
  id: string;
  kind: string;
  subject: string;
  metric: string;
  value: number;
  direction: 'high' | 'low';
  cohort: string;
  cohortMedian: number;
  /** How many times the cohort's typical row. */
  ratio: number;
  /** Modified z on the log scale. */
  z: number;
  /** The scenario ref that re-measures it (absent for static findings). */
  ref?: string;
  /** A fix would aim here: the cohort's near edge. */
  target?: number;
  note?: string;
}

export interface LaneAnalysis {
  summary: Record<string, unknown>;
  /** key → value, the row snapshot tomorrow's report compares against. */
  rows: Record<string, RowSnap>;
  findings: Finding[];
  /** Episodes this lane actually ran, read from its artifacts. */
  episodes: number;
}

export interface RowSnap { v: number; sd?: number; n?: number }

export interface UnitDirs {
  /** Directory of each finished or partial unit of this lane. */
  dirs: string[];
}

/** Z beyond this, and a ratio past RATIO_MIN, is an outlier worth a finding. */
export const OUTLIER_CFG = { z: 3, ratioHigh: 1.8, ratioLow: 0.55, perKindLimit: 60 };

const readJson = <T>(file: string): T | null => {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
};

/** A unit's scenario rows: its report if it finished, its stream if it was killed. */
export function readScenarioRows(dir: string): ScenarioReport[] {
  const rep = readJson<{ scenarios?: ScenarioReport[] }>(path.join(dir, 'report.json'));
  if (rep?.scenarios) return rep.scenarios;
  const f = path.join(dir, 'rows.jsonl');
  if (!fs.existsSync(f)) return [];
  const rows: ScenarioReport[] = [];
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { report?: ScenarioReport };
      if (row.report) rows.push(row.report);
    } catch { /* truncated */ }
  }
  return rows;
}

const clean = (r: ScenarioReport): boolean => !Object.keys(r.warnings ?? {}).length;
const meanOf = (r: ScenarioReport | undefined, k: string): number => {
  const v = r?.metrics[k]?.mean;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};
const r2 = (x: number): number => Math.round(x * 100) / 100;
const snap = (r: ScenarioReport, k: string): RowSnap => ({ v: meanOf(r, k), sd: r.metrics[k]?.sd ?? 0, n: r.metrics[k]?.n ?? 0 });

function pushOutliers(
  out: Finding[], kind: string, c: CohortSummary, metric: string,
  subjectOf: (id: string) => string, refOf: (id: string) => string | undefined, note?: string,
): void {
  for (const row of c.rows) {
    const high = row.z >= OUTLIER_CFG.z && row.ratio >= OUTLIER_CFG.ratioHigh;
    const low = row.z <= -OUTLIER_CFG.z && row.ratio <= OUTLIER_CFG.ratioLow;
    if (!high && !low) continue;
    const direction = high ? 'high' : 'low';
    out.push({
      id: `${kind}:${subjectOf(row.id)}:${metric}:${c.cohort}:${direction}`,
      kind, subject: subjectOf(row.id), metric, value: r2(row.value), direction,
      cohort: c.cohort, cohortMedian: r2(c.median), ratio: r2(row.ratio), z: r2(row.z),
      ref: refOf(row.id),
      target: r2(high ? c.p90 : c.p10),
      ...(note ? { note } : {}),
    });
  }
}

const cooldownClass = (cd: number): string => (cd <= 0 ? 'cd0' : cd <= 3 ? 'cd3' : cd <= 8 ? 'cd8' : 'cdLong');

// ------------------------------------------------------------------ skills --

function analyzeSkills(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const findings: Finding[] = [];
  const snapRows: Record<string, RowSnap> = {};
  const parsed = rows.flatMap(r => {
    const m = /^sweep_dummy_(.+)_l(\d+)$/.exec(r.scenarioId);
    return m ? [{ r, hostId: m[1], level: Number(m[2]) }] : [];
  });
  const cohorts = new Map<string, { id: string; value: number }[]>();
  let warned = 0, zero = 0;
  for (const { r, hostId, level } of parsed) {
    snapRows[`skill:${hostId}:L${level}`] = snap(r, 'dps_dummy');
    if (!clean(r)) { warned++; continue; }
    const base = hostId.split('@')[0];
    const d = SKILLS[base];
    if (!d) continue;
    const value = meanOf(r, 'dps_dummy');
    if (value <= 0) { zero++; continue; }
    const family = DELIVERY_FAMILY[d.delivery.type] ?? d.delivery.type;
    const key = `L${level}|${family}|${cooldownClass(d.cooldown)}`;
    (cohorts.get(key) ?? cohorts.set(key, []).get(key)!).push({ id: `${hostId}@@${level}`, value });
  }
  const summaries: Record<string, unknown>[] = [];
  for (const [key, list] of [...cohorts.entries()].sort()) {
    const c = readCohort(key, list);
    summaries.push({ cohort: key, n: c.n, median: r2(c.median), p10: r2(c.p10), p90: r2(c.p90), spread: r2(c.spread) });
    pushOutliers(findings, 'skill', c, 'dps_dummy',
      id => id.split('@@')[0],
      id => {
        const [host, level] = id.split('@@');
        return host.includes('@') ? undefined : `skill:${host}:${level}`;
      });
  }
  const episodes = rows.reduce((s, r) => s + r.episodes, 0);
  return {
    summary: { rows: parsed.length, warned, zero, cohorts: summaries },
    rows: snapRows, findings, episodes,
  };
}

function analyzeSkillsVs(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const snapRows: Record<string, RowSnap> = {};
  const byRow = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = /^sweep_vs_(.+)_l(\d+)$/.exec(r.scenarioId);
    if (!m) continue;
    if (!clean(r)) continue;
    // The id joins column and host with '_', and both may contain it; split on
    // the longest monster id that matches, the catalog being the source of truth.
    const body = m[1], level = m[2];
    const col = monsterPrefix(body);
    if (!col) continue;
    const host = body.slice(col.length + 1);
    const key = `${host}@@L${level}`;
    const v = meanOf(r, 'edps_cycle_mean');
    (byRow.get(key) ?? byRow.set(key, new Map()).get(key)!).set(col, v);
    snapRows[`skillvs:${host}:${col}:L${level}`] = snap(r, 'edps_cycle_mean');
  }
  const walls: { skill: string; level: string; walls: string[] }[] = [];
  const spreads: { skill: string; level: string; spread: number }[] = [];
  for (const [key, cells] of byRow) {
    const vals = [...cells.values()];
    const live = vals.filter(v => v > 0);
    const [skill, level] = key.split('@@');
    if (live.length && live.length < vals.length) {
      walls.push({ skill, level, walls: [...cells.entries()].filter(([, v]) => v <= 0).map(([c]) => c) });
    }
    if (live.length > 1) spreads.push({ skill, level, spread: r2(Math.max(...live) / Math.max(Math.min(...live), 1e-9)) });
  }
  spreads.sort((a, b) => b.spread - a.spread);
  return {
    summary: {
      skills: byRow.size, wallRows: walls.length,
      topSpreads: spreads.slice(0, 20),
      medianSpread: r2(median(spreads.map(s => s.spread))),
      walls: walls.slice(0, 40),
    },
    rows: snapRows, findings: [], episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

let monsterIdsDesc: string[] | null = null;
function monsterPrefix(body: string): string | null {
  monsterIdsDesc ??= Object.keys(MONSTERS).sort((a, b) => b.length - a.length);
  for (const id of monsterIdsDesc) if (body.startsWith(`${id}_`)) return id;
  return null;
}

// -------------------------------------------------------------- progression --

const LANE_READ: { prefix: string; lane: string; metric: string }[] = [
  { prefix: 'dummy_dps_', lane: 'dummy', metric: 'dps_dummy' },
  { prefix: 'spar_dps_', lane: 'spar', metric: 'dps_out' },
  { prefix: 'ttk_parity_', lane: 'parity', metric: 'kill_rate' },
  { prefix: 'pressure_', lane: 'pressure', metric: 'kill_rate' },
];
const TIER_TAG = new RegExp(`^(${Object.keys(BUILD_TIERS).filter(t => t !== 'starter').join('|')})_`);

export interface ClassRow { classId: string; level: number; tier: string; lane: string; report: ScenarioReport }

export function parseClassRow(id: string, r: ScenarioReport): ClassRow | null {
  for (const l of LANE_READ) {
    if (!id.startsWith(l.prefix)) continue;
    let rest = id.slice(l.prefix.length);
    const tm = TIER_TAG.exec(rest);
    const tier = tm ? tm[1] : 'starter';
    if (tm) rest = rest.slice(tm[0].length);
    const m = /^(.+)_l(\d+)$/.exec(rest);
    if (!m) return null;
    return { classId: m[1], level: Number(m[2]), tier, lane: l.lane, report: r };
  }
  return null;
}

function analyzeProgression(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const findings: Finding[] = [];
  const snapRows: Record<string, RowSnap> = {};
  const parsed = rows.flatMap(r => { const p = parseClassRow(r.scenarioId, r); return p ? [p] : []; });
  const cohorts = new Map<string, { id: string; value: number }[]>();
  for (const p of parsed) {
    const metric = LANE_READ.find(l => l.lane === p.lane)!.metric;
    snapRows[`class:${p.classId}:${p.tier}:L${p.level}:${p.lane}`] = snap(p.report, metric);
    snapRows[`class:${p.classId}:${p.tier}:L${p.level}:${p.lane}:floor`] = snap(p.report, 'life_floor_pct');
    if (!clean(p.report)) continue;
    const key = `L${p.level}|${p.tier}|${p.lane}|${metric}`;
    (cohorts.get(key) ?? cohorts.set(key, []).get(key)!).push({ id: `${p.classId}@@${p.level}@@${p.tier}@@${p.lane}`, value: meanOf(p.report, metric) });
  }
  const table: Record<string, unknown>[] = [];
  for (const [key, list] of [...cohorts.entries()].sort()) {
    const c = readCohort(key, list);
    const metric = key.split('|')[3];
    table.push({ cohort: key, n: c.n, zero: list.length - c.n, median: r2(c.median), p10: r2(c.p10), p90: r2(c.p90), spread: r2(c.spread) });
    pushOutliers(findings, 'class', c, metric,
      id => id.split('@@')[0],
      id => {
        const [cls, level, tier, lane] = id.split('@@');
        return `${lane}:${cls}:${level}${tier === 'starter' ? '' : `:${tier}`}`;
      });
  }
  // THE GEAR VALUE COLUMN: geared÷bare per class per band, on the spar lane where
  // every class expresses. A near-zero denominator is flagged, not ranked.
  const gear: { classId: string; level: number; tier: string; ratio: number }[] = [];
  const at = (classId: string, level: number, tier: string, lane: string): ClassRow | undefined =>
    parsed.find(p => p.classId === classId && p.level === level && p.tier === tier && p.lane === lane);
  for (const p of parsed) {
    if (p.lane !== 'spar' || p.tier === 'starter') continue;
    const bare = at(p.classId, p.level, 'starter', 'spar');
    const b = meanOf(bare?.report, 'dps_out'), g = meanOf(p.report, 'dps_out');
    if (b >= 3 && g > 0) gear.push({ classId: p.classId, level: p.level, tier: p.tier, ratio: r2(g / b) });
  }
  for (const level of [...new Set(gear.map(g => g.level))]) {
    for (const tier of [...new Set(gear.map(g => g.tier))]) {
      const c = readCohort(`L${level}|${tier}|gear_value`, gear.filter(g => g.level === level && g.tier === tier).map(g => ({ id: g.classId, value: g.ratio })));
      pushOutliers(findings, 'gear_value', c, 'geared_over_bare', id => id, id => `spar:${id}:${level}:${tier}`,
        'Output with this wardrobe divided by the bare kit at the same band.');
    }
  }
  // THE EXPRESSION CENSUS, off the same rows.
  const classes = [...new Set(parsed.map(p => p.classId))].sort();
  const levels = [...new Set(parsed.map(p => p.level))].sort((a, b) => a - b);
  const silent = 0.5;
  const expression: Record<string, string> = {};
  const gaps: string[] = [];
  const topLevel = levels[levels.length - 1];
  for (const cls of classes) {
    const read = (lane: string, k: string): number => meanOf(at(cls, topLevel, 'starter', lane)?.report, k);
    const dummy = read('dummy', 'dps_dummy');
    const spar = read('spar', 'dps_out');
    const pack = Math.max(read('parity', 'dps_out'), read('pressure', 'dps_out'));
    const kills = Math.max(read('parity', 'kills'), read('pressure', 'kills'));
    const e = dummy > silent ? 'dummy' : spar > silent ? 'spar' : pack > silent || kills > 0 ? 'pack' : 'mute';
    expression[cls] = e;
    if (e === 'mute') gaps.push(cls);
  }
  const eCount = (e: string): number => Object.values(expression).filter(x => x === e).length;
  return {
    summary: {
      classes: classes.length, levels, cohorts: table,
      gearValue: gear.sort((a, b) => b.ratio - a.ratio),
      expression, expressionCounts: { dummy: eCount('dummy'), spar: eCount('spar'), pack: eCount('pack'), mute: eCount('mute') },
      instrumentGaps: gaps,
      roster: classes.map(cls => {
        const line: Record<string, unknown> = { classId: cls };
        for (const level of levels) {
          line[`spar_L${level}`] = r2(meanOf(at(cls, level, 'starter', 'spar')?.report, 'dps_out'));
          line[`kitted_L${level}`] = r2(meanOf(at(cls, level, 'kitted', 'spar')?.report, 'dps_out'));
          line[`clear_L${level}`] = r2(meanOf(at(cls, level, 'starter', 'parity')?.report, 'kill_rate'));
          line[`deaths_L${level}`] = r2(meanOf(at(cls, level, 'starter', 'parity')?.report, 'player_deaths'));
        }
        return line;
      }),
    },
    rows: snapRows, findings, episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

// ---------------------------------------------------------------- matchgrid --

function analyzeMatchups(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const snapRows: Record<string, RowSnap> = {};
  const byTarget = new Map<string, { cycles: number; total: number; edps: number[] }>();
  const parsed: { build: string; target: string; level: string; r: ScenarioReport }[] = [];
  for (const r of rows) {
    const m = /^matchup_(.+)_vs_(.+)_l(\d+)$/.exec(r.scenarioId);
    if (!m) continue;
    parsed.push({ build: m[1], target: m[2], level: m[3], r });
    snapRows[`match:${m[1]}:${m[2]}:L${m[3]}`] = snap(r, 'edps_cycle_mean');
    if (!clean(r)) continue;
    const key = `${m[2]}@@L${m[3]}`;
    const row = byTarget.get(key) ?? { cycles: 0, total: 0, edps: [] };
    row.total++;
    if (meanOf(r, 'cycles_cleared') > 0) { row.cycles++; row.edps.push(meanOf(r, 'edps_cycle_mean')); }
    byTarget.set(key, row);
  }
  const wallRate = [...byTarget.entries()].map(([k, v]) => {
    const [target, level] = k.split('@@');
    return { target, level, wallShare: r2(1 - v.cycles / Math.max(1, v.total)), builds: v.total, medianEdps: r2(median(v.edps)) };
  }).sort((a, b) => b.wallShare - a.wallShare);
  return {
    summary: { rows: parsed.length, targets: byTarget.size, wallRate: wallRate.slice(0, 40) },
    rows: snapRows, findings: [], episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

// ---------------------------------------------------------------- the bestiary --

function analyzeBestiary(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const findings: Finding[] = [];
  const snapRows: Record<string, RowSnap> = {};
  const threat = new Map<string, { id: string; value: number }[]>();
  const durable = new Map<string, { id: string; value: number }[]>();
  const refOf = new Map<string, string>();
  let neverHits = 0, walls = 0, measured = 0;
  const silentBodies: string[] = [];
  for (const r of rows) {
    const m = /^matchup_bestiary_(geared|kitted|starter)_(.+)_l(\d+)_vs_(.+)_l(\d+)$/.exec(r.scenarioId);
    if (!m) continue;
    const [, tier, cls, level, monster] = m;
    measured++;
    const id = `${monster}@@${cls}@@${level}`;
    refOf.set(id, `duel:${tier}_${cls}_l${level}:${monster}:${level}`);
    const def = MONSTERS[monster];
    const seat = def?.boss ? 'boss' : 'body';
    const heroLife = Math.max(1, meanOf(r, 'hero_max_life'));
    const threatV = meanOf(r, 'dps_in') / heroLife * 100; // % of a life bar per second
    const edps = meanOf(r, 'edps_cycle_mean');
    const ttk = meanOf(r, 'ttk_wave_mean');
    snapRows[`monster:${monster}:${cls}:L${level}:threat`] = { v: r2(threatV), sd: r.metrics.dps_in?.sd ?? 0, n: r.metrics.dps_in?.n ?? 0 };
    snapRows[`monster:${monster}:${cls}:L${level}:ttk`] = snap(r, 'ttk_wave_mean');
    if (!clean(r)) continue;
    if (meanOf(r, 'hit_attempts_in') <= 0 && meanOf(r, 'dps_in') <= 0) {
      neverHits++;
      if (Number(level) === 12 && cls === 'warrior') silentBodies.push(monster);
    }
    if (edps <= 0) walls++;
    const key = `L${level}|${cls}|${seat}`;
    if (threatV > 0) (threat.get(key) ?? threat.set(key, []).get(key)!).push({ id, value: threatV });
    if (ttk > 0) (durable.get(key) ?? durable.set(key, []).get(key)!).push({ id, value: ttk });
  }
  const summaries: Record<string, unknown>[] = [];
  for (const [key, list] of [...threat.entries()].sort()) {
    const c = readCohort(key, list);
    summaries.push({ cohort: key, read: 'threat %life/s', n: c.n, median: r2(c.median), p10: r2(c.p10), p90: r2(c.p90), spread: r2(c.spread) });
    pushOutliers(findings, 'monster_threat', c, 'dps_in', id => id.split('@@')[0], id => refOf.get(id), 'Threat read as % of the stick hero\'s life bar per second.');
  }
  for (const [key, list] of [...durable.entries()].sort()) {
    const c = readCohort(key, list);
    summaries.push({ cohort: key, read: 'time to kill', n: c.n, median: r2(c.median), p10: r2(c.p10), p90: r2(c.p90), spread: r2(c.spread) });
    pushOutliers(findings, 'monster_durability', c, 'ttk_wave_mean', id => id.split('@@')[0], id => refOf.get(id));
  }
  // The skipped list is written per unit; every shard writes the same one.
  const skipped = dirs.map(d => readJson<{ id: string; why: string }[]>(path.join(d, 'skipped.json'))).find(Boolean) ?? [];
  return {
    summary: {
      measuredRows: measured, neverHitsRows: neverHits, wallRows: walls, cohorts: summaries,
      silentBodies: silentBodies.slice(0, 60),
      notFielded: skipped.length,
    },
    rows: snapRows, findings, episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

// --------------------------------------------------------------- the suites --

function analyzeSuites(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const snapRows: Record<string, RowSnap> = {};
  let graded = 0, flagged = 0;
  const flags: Record<string, { ok: number; off: number; values: number[] }> = {};
  for (const r of rows) {
    snapRows[`scenario:${r.scenarioId}:dps_out`] = snap(r, 'dps_out');
    for (const [metric, grade] of Object.entries(r.grades ?? {})) {
      graded++;
      const k = `${r.scenarioId.replace(/_[a-z]+_l\d+$/, '')}|${metric}`;
      const f = flags[k] ?? (flags[k] = { ok: 0, off: 0, values: [] });
      f.values.push(meanOf(r, metric));
      if (grade.startsWith('ok')) f.ok++;
      else { f.off++; flagged++; }
    }
  }
  return {
    summary: {
      scenarios: rows.length, graded, flagged,
      warned: rows.filter(r => !clean(r)).length,
      bands: Object.entries(flags).map(([k, f]) => ({ band: k, ok: f.ok, off: f.off, median: r2(median(f.values)) })),
    },
    rows: snapRows, findings: [], episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

// --------------------------------------------------------------- the audits --

function analyzeAudits(dirs: string[]): LaneAnalysis {
  const findings: Finding[] = [];
  const summary: Record<string, unknown> = {};
  for (const d of dirs) {
    const aff = readJson<{ bands?: { ilvl: number; neverRolled: unknown[]; shareFlags: unknown[] }[]; unknownStats?: { stat: string; via: string }[]; unreachable?: { id: string }[] }>(path.join(d, 'affixes.json'));
    if (aff) {
      summary.affixes = {
        bands: (aff.bands ?? []).map(b => ({ ilvl: b.ilvl, neverRolled: b.neverRolled.length, shareFlags: b.shareFlags.length })),
        deadStats: aff.unknownStats?.length ?? 0, unreachable: aff.unreachable?.length ?? 0,
      };
      for (const u of aff.unknownStats ?? []) {
        findings.push({
          id: `dead_stat:${u.stat}`, kind: 'dead_stat', subject: u.stat, metric: 'compiled_line', value: 0,
          direction: 'low', cohort: 'item mods', cohortMedian: 0, ratio: 0, z: 0,
          note: `Compiled item lines name a stat the engine does not define (via ${u.via}).`,
        });
      }
      for (const u of aff.unreachable ?? []) {
        findings.push({
          id: `unreachable_affix:${u.id}`, kind: 'unreachable_affix', subject: u.id, metric: 'pool', value: 0,
          direction: 'low', cohort: 'affix pools', cohortMedian: 0, ratio: 0, z: 0,
          note: 'No base family can roll this affix at any item level.',
        });
      }
    }
    const tex = readJson<{ profiles?: { textures: string[]; passive: boolean; spawner: boolean; untargetable: boolean; immortal: boolean }[] }>(path.join(d, 'textures.json'));
    if (tex?.profiles) {
      const census: Record<string, number> = {};
      for (const p of tex.profiles) {
        if (p.passive || p.spawner || p.untargetable || p.immortal) continue;
        for (const t of p.textures) census[t] = (census[t] ?? 0) + 1;
      }
      summary.textures = census;
    }
    const drops = readJson<{ tableId?: string; expectations?: unknown[] }>(path.join(d, 'drops.json'));
    if (drops) summary.drops = { table: drops.tableId, expectations: drops.expectations };
    const mon = readJson<{ id: string; level: number; life: number; boss: boolean; passive: boolean }[]>(path.join(d, 'monsters.json'));
    if (Array.isArray(mon)) {
      summary.monsters = { rows: mon.length, ids: new Set(mon.map(m => m.id)).size };
      const levels = [...new Set(mon.map(m => m.level))];
      for (const level of levels) {
        const c = readCohort(`L${level}|life|body`, mon.filter(m => m.level === level && !m.boss && !m.passive && !MONSTERS[m.id]?.immortal).map(m => ({ id: m.id, value: m.life })));
        pushOutliers(findings, 'monster_life_curve', c, 'life', id => id, () => undefined,
          'Static read: authored life beside the same-level non-boss cohort.');
      }
    }
  }
  return { summary, rows: {}, findings: findings.slice(0, 120), episodes: 0 };
}

// ------------------------------------------------------------ the attributes --

interface SensitivityFile {
  knobs: { id: string; noop: boolean; error?: string }[];
  cells: { knob: string; scenarioId: string; metric: string; elasticity: number; lo: number; hi: number; moved: boolean; base: number }[];
  episodes: number;
}

function analyzeAttributes(dirs: string[]): LaneAnalysis {
  const findings: Finding[] = [];
  const perAttr = new Map<string, { out: number[]; floor: number[]; noop: number; classes: number }>();
  let episodes = 0;
  for (const d of dirs) {
    const s = readJson<SensitivityFile>(path.join(d, 'sensitivity.json'));
    if (!s) continue;
    episodes += s.episodes;
    for (const k of s.knobs) {
      const row = perAttr.get(k.id) ?? { out: [], floor: [], noop: 0, classes: 0 };
      row.classes++;
      if (k.noop) row.noop++;
      perAttr.set(k.id, row);
    }
    for (const c of s.cells) {
      const row = perAttr.get(c.knob);
      if (!row) continue;
      // Per +10 points, as a share of the row's own output.
      if (c.metric === 'dps_out' && c.scenarioId.startsWith('spar_') && c.base > 0) row.out.push((c.elasticity * 10) / c.base);
      if (c.metric === 'life_floor_pct' && c.scenarioId.startsWith('ttk_')) row.floor.push(c.elasticity * 10);
    }
  }
  const table = [...perAttr.entries()].map(([id, r]) => ({
    attribute: id.replace('attr:', ''),
    medianOutputShare: r2(median(r.out)),
    medianLifeFloorPts: r2(median(r.floor)),
    noopClasses: r.noop, classes: r.classes,
  })).sort((a, b) => b.medianOutputShare - a.medianOutputShare);
  for (const row of table) {
    if (row.classes >= 8 && row.noopClasses === row.classes) {
      findings.push({
        id: `attribute_dead:${row.attribute}`, kind: 'attribute', subject: row.attribute, metric: 'any',
        value: 0, direction: 'low', cohort: 'attributes', cohortMedian: 0, ratio: 0, z: 0,
        note: '+10 of this attribute changed nothing measurable for any class in these lanes.',
      });
    }
  }
  return { summary: { perAttribute: table }, rows: {}, findings, episodes };
}

// --------------------------------------------------------------- the affixes --

function analyzeAffixes(dirs: string[]): LaneAnalysis {
  const rows = dirs.flatMap(readScenarioRows);
  const findings: Finding[] = [];
  const snapRows: Record<string, RowSnap> = {};
  type Cell = { cls: string; level: string; slot: string; family: string; seed: string; rig: string; r: ScenarioReport };
  const cells: Cell[] = rows.flatMap(r => {
    const m = /^affixval_(.+)_l(\d+)_([a-z0-9]+)_(.+)_(\d+)__(spar|pack)$/.exec(r.scenarioId);
    return m ? [{ cls: m[1], level: m[2], slot: m[3], family: m[4], seed: m[5], rig: m[6], r }] : [];
  });
  const base = new Map<string, ScenarioReport>();
  for (const c of cells) if (c.family === '__none__') base.set(`${c.cls}|${c.level}|${c.slot}|${c.seed}|${c.rig}`, c.r);
  const perFamily = new Map<string, { out: number[]; floor: number[]; identical: number; total: number; slot: string; absolute: number; baseline: number; ref: string }>();
  for (const c of cells) {
    if (c.family === '__none__' || !clean(c.r)) continue;
    const b = base.get(`${c.cls}|${c.level}|${c.slot}|${c.seed}|${c.rig}`);
    if (!b) continue;
    const key = `${c.family}@@${c.cls}@@${c.level}`;
    const row = perFamily.get(key) ?? {
      out: [], floor: [], identical: 0, total: 0, slot: c.slot, absolute: 0, baseline: 0,
      ref: `affix:${c.cls}:${c.level}:${c.slot}:${c.family}:${c.seed}:spar`,
    };
    row.total++;
    if (c.rig === 'spar') {
      const v0 = meanOf(b, 'dps_out'), v = meanOf(c.r, 'dps_out');
      if (v0 > 0) row.out.push(v / v0);
      row.absolute = v; row.baseline = v0;
      snapRows[`affix:${c.family}:${c.cls}:L${c.level}:${c.seed}`] = snap(c.r, 'dps_out');
    } else {
      row.floor.push(meanOf(c.r, 'life_floor_pct') - meanOf(b, 'life_floor_pct'));
    }
    if (meanOf(c.r, 'dps_out') === meanOf(b, 'dps_out') && meanOf(c.r, 'life_floor_pct') === meanOf(b, 'life_floor_pct')) row.identical++;
    perFamily.set(key, row);
  }
  const table = [...perFamily.entries()].map(([k, v]) => {
    const [family, cls, level] = k.split('@@');
    return {
      family, cls, level: Number(level), slot: v.slot,
      outputRatio: r2(median(v.out)), lifeFloorDelta: r2(median(v.floor)),
      dead: v.identical === v.total && v.total > 0,
    };
  });
  // Offense reads as a multiplier, on the log scale. Defensive families sit at 1.0
  // by design, so they only enter the cohort once they move the number.
  for (const cls of [...new Set(table.map(t => t.cls))]) {
    for (const level of [...new Set(table.map(t => t.level))]) {
      const list = table.filter(t => t.cls === cls && t.level === level && t.outputRatio > 1.005);
      const c = readCohort(`L${level}|${cls}|affix output`, list.map(t => ({ id: t.family, value: t.outputRatio - 1 })));
      const before = findings.length;
      pushOutliers(findings, 'affix', c, 'output_gain', id => id, () => undefined,
        'Share of output one magic piece carrying this family adds, beside the other families on the same stick.');
      for (const f of findings.slice(before)) {
        const row = perFamily.get(`${f.subject}@@${cls}@@${level}`);
        if (!row || !(row.baseline > 0)) continue;
        // Measured as an absolute read on one row, so the solver can reach for it.
        f.metric = 'dps_out';
        f.value = r2(row.absolute);
        f.ref = row.ref;
        f.target = r2(row.baseline * (1 + (f.target ?? 0)));
        f.cohortMedian = r2(row.baseline * (1 + f.cohortMedian));
      }
    }
  }
  const dead = table.filter(t => t.dead);
  const notWearable = dirs.map(d => readJson<string[]>(path.join(d, 'not-wearable.json'))).find(Boolean) ?? [];
  return {
    summary: {
      families: new Set(table.map(t => t.family)).size,
      notWearable: notWearable.length,
      deadOnTheseRigs: [...new Set(dead.map(t => t.family))].slice(0, 60),
      topOutput: [...table].sort((a, b) => b.outputRatio - a.outputRatio).slice(0, 25),
      topSurvival: [...table].sort((a, b) => b.lifeFloorDelta - a.lifeFloorDelta).slice(0, 25),
    },
    rows: snapRows, findings, episodes: rows.reduce((s, r) => s + r.episodes, 0),
  };
}

// --------------------------------------------------------------- the globals --

function analyzeGlobals(dirs: string[]): LaneAnalysis {
  let episodes = 0;
  const strongest: { config: string; knob: string; metric: string; scenarioId: string; elasticity: number; lo: number; hi: number }[] = [];
  const noops: string[] = [];
  const errors: string[] = [];
  for (const d of dirs) {
    const s = readJson<SensitivityFile>(path.join(d, 'sensitivity.json'));
    if (!s) continue;
    episodes += s.episodes;
    const config = path.basename(d).replace(/^globals_/, '');
    for (const k of s.knobs) {
      if (k.error) errors.push(`${config}: ${k.error}`);
      else if (k.noop) noops.push(`${config}: ${k.id}`);
    }
    for (const c of s.cells) {
      if (c.moved) strongest.push({ config, knob: c.knob, metric: c.metric, scenarioId: c.scenarioId, elasticity: r2(c.elasticity), lo: r2(c.lo), hi: r2(c.hi) });
    }
  }
  strongest.sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
  return {
    summary: { strongest: strongest.slice(0, 40), noopKnobs: noops.slice(0, 60), noopCount: noops.length, errors: errors.slice(0, 10) },
    rows: {}, findings: [], episodes,
  };
}

// ------------------------------------------------------------------ registry --

/** One row per lane. A lane with no row still reports coverage, just no analysis. */
export const LANE_ANALYZERS: Record<string, (dirs: string[]) => LaneAnalysis> = {
  skills: analyzeSkills,
  skills_vs: analyzeSkillsVs,
  progression: analyzeProgression,
  matchups: analyzeMatchups,
  bestiary: analyzeBestiary,
  suites: analyzeSuites,
  audits: analyzeAudits,
  attributes: analyzeAttributes,
  affixes: analyzeAffixes,
  globals: analyzeGlobals,
};

/** Scenarios that threw, across a lane's units, grouped by message. The other rows
 *  of those units still count. */
export function rowErrors(dirs: readonly string[]): { signature: string; count: number; sample: string; message: string }[] {
  const by = new Map<string, { signature: string; count: number; sample: string; message: string }>();
  for (const d of dirs) {
    const rep = readJson<{ coverage?: { errors?: { id: string; error: string }[] } }>(path.join(d, 'report.json'));
    for (const e of rep?.coverage?.errors ?? []) {
      const lines = e.error.split('\n');
      const signature = `${lines[0].slice(0, 120)} @ ${/at ([\w.$<>]+)/.exec(lines[1] ?? '')?.[1] ?? ''}`;
      const row = by.get(signature);
      if (row) row.count++;
      else by.set(signature, { signature, count: 1, sample: e.id, message: lines.slice(0, 4).join(' | ').slice(0, 500) });
    }
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

/** Support power off the matrix's verdicts: a gem's typical output delta across
 *  its hosts, compared with every other gem. */
export function supportPowerFindings(
  probed: readonly { supportId: string; verdict: string; dOutputRel: number }[],
): { findings: Finding[]; table: { support: string; n: number; medianDelta: number }[] } {
  const by = new Map<string, number[]>();
  for (const p of probed) {
    if (p.verdict !== 'effective') continue;
    (by.get(p.supportId) ?? by.set(p.supportId, []).get(p.supportId)!).push(p.dOutputRel);
  }
  const table = [...by.entries()].filter(([, v]) => v.length >= 10)
    .map(([support, v]) => ({ support, n: v.length, medianDelta: r2(median(v)) }))
    .sort((a, b) => b.medianDelta - a.medianDelta);
  // Read as a multiplier: +40% output is 1.4×, comparable on the log scale.
  const c = readCohort('supports|effective hosts', table.map(t => ({ id: t.support, value: Math.max(0.01, 1 + t.medianDelta) })));
  const findings: Finding[] = [];
  pushOutliers(findings, 'support', c, 'output_multiplier', id => id, () => undefined,
    'Median output multiplier across the hosts this gem is effective on. Stationary-dummy inflation applies to ground and trail payloads: confirm against the live column first.');
  for (const f of findings) if (!SUPPORTS[f.subject]) f.note = `${f.note ?? ''} (unknown support)`;
  return { findings, table };
}
