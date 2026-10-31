// ---------------------------------------------------------------------------
// THE SEARCH ENGINE — find the strongest and weakest legal builds per playstyle.
//
// Three ideas, one loop:
//
//   COVERING ROWS spread evaluations across the factor space with no state beyond
//   a cursor, so every skill, gem, class and unique keeps getting asked about.
//
//   MAP-ELITES keeps the best and worst build found so far in each playstyle cell
//   (level band × what the build does × which damage it deals), and breeds new
//   candidates from them. It asks "what is the ceiling and the floor of each way
//   to play?", not the one global maximum an optimizer would collapse onto. The
//   grid is open data (CELL_AXES); a new playstyle read is one row.
//
//   SUCCESSIVE HALVING means most candidates cost one short episode per rig. Only
//   those that would enter the archive earn more seeds, and only the extremes that
//   survive reach the high-seed confirmation a finding has to pass.
//
// The archive persists across nights, so coverage accumulates instead of repeating,
// and carried elites are re-measured on the new commit so they cannot go stale
// silently. Every episode is the real runner on a BuildSpec through the real seams.
//
// Browser-safe, and pure apart from Math.random-free seeded streams.
// ---------------------------------------------------------------------------

import { SKILLS } from '../../data/skills';
import { makeSimWorld } from '../arena';
import { applyBuild } from '../builds';
import { PARITY_PACK } from '../data/scenarios';
import { SPAR_CFG } from '../data/sparring';
import { runEpisode } from '../runner';
import { RANGED_DELIVERIES } from '../compat';
import { deriveSeed, mulberry32 } from '../rng';
import { DAMAGE_TYPES } from '../../engine/stats';
import type { BuildSpec, EpisodeResult, ScenarioDef } from '../types';
import { meanOf, sdOf } from '../stats';
import {
  buildCatalog, coveringRow, crossGenomes, encodeGenome, factorsOf, genomeKey, genomeToBuild,
  mutateGenome, randomGenome, type BuildGenome, type Rand, type SearchCatalog,
} from './space';

// -------------------------------------------------------------- the rigs --

/** Standard questions asked of a candidate, as data. `duration` is scaled by the
 *  stage, so screens stay cheap. */
export const SEARCH_RIGS: Record<string, { label: string; duration: number; scenario: (b: BuildSpec, pilot: ScenarioDef['pilot'], duration: number) => ScenarioDef }> = {
  spar: {
    label: 'one durable body that fights back',
    duration: 20,
    scenario: (b, pilot, duration) => ({
      id: `search_spar_${b.id}`, build: b, pilot, parityLevel: b.level,
      waves: [{ monsters: [{ id: SPAR_CFG.id, level: b.level }], distance: 70 }],
      duration, stop: 'duration',
    }),
  },
  pack: {
    label: 'the parity pack, until it or the hero falls',
    duration: 40,
    scenario: (b, pilot, duration) => ({
      id: `search_pack_${b.id}`, build: b, pilot, parityLevel: b.level,
      waves: [{ monsters: PARITY_PACK }],
      duration, stop: 'waves_dead',
    }),
  },
};

/** What "strong" means, per objective. All are higher-is-better. Open registry:
 *  the archive keeps a best and a worst build per cell for every row. */
export const SEARCH_OBJECTIVES: Record<string, { label: string; read: (m: RigMeans) => number }> = {
  offense: { label: 'sustained output into a durable body', read: m => m.spar?.dps_out ?? 0 },
  clear: {
    label: 'parity pack cleared per second (a death ends the clear)',
    read: m => (m.pack ? (m.pack.kills ?? 0) / Math.max(1, m.pack.sim_seconds ?? 1) : 0),
  },
  survive: {
    label: 'life floor while fighting the pack, 0 on death',
    read: m => (m.pack ? ((m.pack.player_deaths ?? 0) > 0 ? 0 : m.pack.life_floor_pct ?? 0) : 0),
  },
};

export type RigMeans = Record<string, Record<string, number>>;

// ------------------------------------------------------------ playstyle cells --

/** The behaviour a cell keys on, read from what the build actually did. */
export interface Behaviour {
  /** Delivery family of the primary skill. */
  family: string;
  /** Damage type with the largest measured share, or 'none'. */
  school: string;
  /** More than half the output came from the court. */
  court: boolean;
}

/** Group a delivery type into the playstyle vocabulary. */
export const DELIVERY_FAMILY: Record<string, string> = {
  melee: 'melee', cone: 'melee', dash: 'melee', leap: 'melee', carom: 'melee',
  projectile: 'projectile',
  nova: 'area', storm: 'area', ground: 'area', detonateProjectile: 'area',
  summon: 'court', construct: 'construct',
  aura: 'aura', self: 'self', target: 'target', blink: 'self',
};

export function behaviourOf(g: BuildGenome, spar: EpisodeResult[]): Behaviour {
  const primary = SKILLS[g.skills[0]?.id];
  const type = primary?.delivery.type ?? 'self';
  let best = 'none', bestV = 0;
  for (const t of DAMAGE_TYPES) {
    const v = meanOf(spar.map(e => Number(e.fingerprint[`dmg_out_${t}`] ?? 0)));
    if (v > bestV) { bestV = v; best = t; }
  }
  const minion = meanOf(spar.map(e => e.metrics.dps_minions ?? 0));
  const out = meanOf(spar.map(e => e.metrics.dps_out ?? 0));
  return {
    family: DELIVERY_FAMILY[type] ?? type,
    school: best,
    court: out > 0 && minion > out / 2,
  };
}

export function cellKey(g: BuildGenome, b: Behaviour): string {
  return `L${g.lvl}|${b.court ? 'court' : b.family}|${b.school}`;
}

// ----------------------------------------------------------------- evaluate --

export const STAGES = [
  /** The screen: one seed, short rigs. Most candidates end here. */
  { seeds: 1, durationMult: 0.5 },
  /** Would-be elites: enough seeds to drop one lucky episode. */
  { seeds: 3, durationMult: 1 },
  /** Archive entries and confirmations. */
  { seeds: 8, durationMult: 1 },
];

export interface EvalResult {
  key: string;
  genome: BuildGenome;
  /** Rejected by the real gates: warnings, or a skill the build cannot cast. */
  rejected?: string;
  stage: number;
  seeds: number;
  cell?: string;
  behaviour?: Behaviour;
  rigs?: RigMeans;
  objectives?: Record<string, number>;
  /** Per-objective SD across seeds. */
  sd?: Record<string, number>;
  episodes: number;
}

/** Run the build's legality through the real seams once. Warnings mean a gate
 *  refused something, so the candidate is not a real build. */
export function legalityOf(g: BuildGenome, build: BuildSpec): string | null {
  for (const s of g.skills) if (!SKILLS[s.id]) return `unknown skill '${s.id}'`;
  const world = makeSimWorld(g.cls, 1);
  const warnings = applyBuild(world, build, 1);
  if (warnings.length) return warnings[0];
  for (const inst of world.player.skills) {
    if (!inst) continue;
    const why = world.castReqRefusal(world.player, inst);
    if (why) return `${inst.def.id}: ${why}`;
  }
  return null;
}

export function pilotForGenome(g: BuildGenome): NonNullable<ScenarioDef['pilot']> {
  const d = SKILLS[g.skills[0]?.id];
  return d && RANGED_DELIVERIES.has(d.delivery.type) ? { kind: 'caster' } : { kind: 'brawler' };
}

const metricsOf = (eps: EpisodeResult[]): Record<string, number> => {
  const keys = new Set(eps.flatMap(e => Object.keys(e.metrics)));
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = meanOf(eps.map(e => e.metrics[k] ?? 0));
  return out;
};

export function evaluateGenome(
  g: BuildGenome, stageIndex: number, baseSeed: number, rigIds: readonly string[] = Object.keys(SEARCH_RIGS),
): EvalResult {
  const key = genomeKey(g);
  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const res: EvalResult = { key, genome: g, stage: stageIndex, seeds: stage.seeds, episodes: 0 };
  const build = genomeToBuild(g, `g_${key}`);
  const why = legalityOf(g, build);
  if (why) { res.rejected = why; return res; }
  const pilot = pilotForGenome(g);
  const seedList = Array.from({ length: stage.seeds }, (_, i) => deriveSeed(baseSeed, i + 1));
  const rigs: RigMeans = {};
  const perSeed: Record<string, Record<string, number>[]> = {};
  let spar: EpisodeResult[] = [];
  for (const rigId of rigIds) {
    const rig = SEARCH_RIGS[rigId];
    const scen = rig.scenario(build, pilot, rig.duration * stage.durationMult);
    const eps = seedList.map(s => runEpisode(scen, s));
    res.episodes += eps.length;
    const warned = eps.find(e => e.warnings.length);
    if (warned) { res.rejected = warned.warnings[0]; return res; }
    rigs[rigId] = metricsOf(eps);
    perSeed[rigId] = eps.map(e => e.metrics);
    if (rigId === 'spar') spar = eps;
  }
  const b = behaviourOf(g, spar);
  const objectives: Record<string, number> = {};
  const sd: Record<string, number> = {};
  for (const [id, o] of Object.entries(SEARCH_OBJECTIVES)) {
    objectives[id] = o.read(rigs);
    const reads = seedList.map((_, i) => o.read(Object.fromEntries(
      Object.entries(perSeed).map(([r, ms]) => [r, ms[i]])) as RigMeans));
    sd[id] = sdOf(reads);
  }
  return { ...res, rigs, objectives, sd, behaviour: b, cell: cellKey(g, b) };
}

// ---------------------------------------------------------------- the archive --

export interface EliteRow {
  key: string;
  token: string;
  value: number;
  sd: number;
  seeds: number;
  cell: string;
  /** Other objectives' reads on the same evaluation, for context in reports. */
  objectives: Record<string, number>;
  /** The night this row entered, and the last night it was re-measured. */
  foundOn: string;
  verifiedOn?: string;
}

export interface SearchArchive {
  v: 1;
  /** Next covering row. Monotonic across nights. */
  cursor: number;
  /** Catalog seed: the design's identity. */
  catalogSeed: number;
  /** objective → cell → best / worst. */
  best: Record<string, Record<string, EliteRow>>;
  worst: Record<string, Record<string, EliteRow>>;
  totals: { evaluated: number; rejected: number; episodes: number; nights: number };
}

export function emptyArchive(catalogSeed: number): SearchArchive {
  const best: SearchArchive['best'] = {}, worst: SearchArchive['worst'] = {};
  for (const o of Object.keys(SEARCH_OBJECTIVES)) { best[o] = {}; worst[o] = {}; }
  return { v: 1, cursor: 0, catalogSeed, best, worst, totals: { evaluated: 0, rejected: 0, episodes: 0, nights: 0 } };
}

/** Would this evaluation change the archive? (A zero never enters a worst row:
 *  a build that does nothing is triage, not a floor.) */
export function wouldEnter(a: SearchArchive, r: EvalResult): boolean {
  if (r.rejected || !r.objectives || !r.cell) return false;
  for (const [o, v] of Object.entries(r.objectives)) {
    const hi = a.best[o]?.[r.cell]?.value;
    const lo = a.worst[o]?.[r.cell]?.value;
    if (hi === undefined || v > hi) return true;
    if (v > 0 && (lo === undefined || v < lo)) return true;
  }
  return false;
}

export function enterArchive(a: SearchArchive, r: EvalResult, night: string): number {
  if (r.rejected || !r.objectives || !r.cell) return 0;
  let entered = 0;
  const row = (o: string, v: number): EliteRow => ({
    key: r.key, token: encodeGenome(r.genome), value: v, sd: r.sd?.[o] ?? 0, seeds: r.seeds,
    cell: r.cell!, objectives: r.objectives!, foundOn: night,
  });
  for (const [o, v] of Object.entries(r.objectives)) {
    a.best[o] ??= {}; a.worst[o] ??= {};
    const hi = a.best[o][r.cell];
    if (!hi || v > hi.value) { a.best[o][r.cell] = row(o, v); entered++; }
    const lo = a.worst[o][r.cell];
    if (v > 0 && (!lo || v < lo.value)) { a.worst[o][r.cell] = row(o, v); entered++; }
  }
  return entered;
}

/** Union of shard archives: per cell, the more extreme row wins. */
export function mergeArchives(into: SearchArchive, other: SearchArchive): void {
  into.cursor = Math.max(into.cursor, other.cursor);
  for (const [o, cells] of Object.entries(other.best)) {
    into.best[o] ??= {};
    for (const [c, row] of Object.entries(cells)) {
      const cur = into.best[o][c];
      if (!cur || row.value > cur.value) into.best[o][c] = row;
    }
  }
  for (const [o, cells] of Object.entries(other.worst)) {
    into.worst[o] ??= {};
    for (const [c, row] of Object.entries(cells)) {
      const cur = into.worst[o][c];
      if (!cur || row.value < cur.value) into.worst[o][c] = row;
    }
  }
}

export const archiveRows = (a: SearchArchive): { objective: string; end: 'best' | 'worst'; row: EliteRow }[] => [
  ...Object.entries(a.best).flatMap(([o, cells]) => Object.values(cells).map(row => ({ objective: o, end: 'best' as const, row }))),
  ...Object.entries(a.worst).flatMap(([o, cells]) => Object.values(cells).map(row => ({ objective: o, end: 'worst' as const, row }))),
];

// ------------------------------------------------------------------ the loop --

export const SEARCH_LOOP_CFG = {
  /** Share of candidates from the covering rows; the rest breed from elites. */
  coveringShare: 0.35,
  /** Share of bred candidates that also cross with a second elite. */
  crossShare: 0.2,
  /** Share of purely random candidates (an escape from the archive's habits). */
  randomShare: 0.05,
};

export interface SearchRowLog {
  key: string;
  source: string;
  lvl: number;
  factors: string[];
  cell?: string;
  objectives?: Record<string, number>;
  rejected?: string;
  /** A legal build that threw. The token reproduces it; the search carries on. */
  crashed?: string;
  token?: string;
}

export interface SearchRunOpts {
  archive: SearchArchive;
  night: string;
  baseSeed: number;
  /** 1-based shard of the covering rows and the RNG stream. */
  shard?: { index: number; of: number };
  /** Stop after this many wall-clock ms (epoch deadline). */
  deadlineAt: number;
  /** Stop after this many candidates (tests). */
  maxCandidates?: number;
  seen?: Set<string>;
  onRow?: (r: SearchRowLog) => void;
  onElite?: (r: EvalResult) => void;
}

export interface SearchRunResult {
  candidates: number;
  rejected: number;
  /** Legal builds that made the engine throw: findings in their own right. */
  crashed: number;
  episodes: number;
  promoted: number;
  entered: number;
  firstRow: number;
  lastRow: number;
}

/** The anytime loop: draw, screen, promote the promising, enter the archive. */
export function runSearch(o: SearchRunOpts, cat: SearchCatalog = buildCatalog()): SearchRunResult {
  const shard = o.shard ?? { index: 1, of: 1 };
  const r: Rand = mulberry32(deriveSeed(o.baseSeed, 0x5ea2c000 + shard.index));
  const seen = o.seen ?? new Set<string>();
  const res: SearchRunResult = {
    candidates: 0, rejected: 0, crashed: 0, episodes: 0, promoted: 0, entered: 0,
    firstRow: o.archive.cursor, lastRow: o.archive.cursor,
  };
  let rowIndex = o.archive.cursor + (shard.index - 1);
  const elites = (): BuildGenome[] => archiveRows(o.archive).map(x => decodeOrNull(x.row.token)).filter((g): g is BuildGenome => !!g);
  let elitePool = elites();
  const draw = (): { g: BuildGenome; source: string } => {
    const roll = r();
    if (roll < SEARCH_LOOP_CFG.coveringShare || !elitePool.length) {
      const g = coveringRow(rowIndex, cat, o.archive.catalogSeed);
      rowIndex += shard.of;
      res.lastRow = rowIndex;
      return { g, source: 'covering' };
    }
    if (roll < SEARCH_LOOP_CFG.coveringShare + SEARCH_LOOP_CFG.randomShare) {
      return { g: randomGenome(cat, r), source: 'random' };
    }
    const parent = elitePool[Math.floor(r() * elitePool.length)];
    if (r() < SEARCH_LOOP_CFG.crossShare && elitePool.length > 1) {
      const mate = elitePool[Math.floor(r() * elitePool.length)];
      return { g: mutateGenome(crossGenomes(parent, mate, r), cat, r), source: 'cross' };
    }
    return { g: mutateGenome(parent, cat, r), source: 'mutate' };
  };

  while (Date.now() < o.deadlineAt && (o.maxCandidates === undefined || res.candidates < o.maxCandidates)) {
    const { g, source } = draw();
    const key = genomeKey(g);
    if (seen.has(key)) continue;
    seen.add(key);
    res.candidates++;
    const seed = deriveSeed(o.baseSeed, hashKey(key));
    // A legal build that throws is a finding, not the end of the night.
    let screen: EvalResult;
    try {
      screen = evaluateGenome(g, 0, seed);
    } catch (err) {
      res.crashed++;
      o.onRow?.({
        key, source, lvl: g.lvl, factors: factorsOf(g), token: encodeGenome(g),
        crashed: ((err as Error).stack ?? String(err)).split('\n').slice(0, 4).join(' | '),
      });
      continue;
    }
    res.episodes += screen.episodes;
    o.onRow?.({
      key, source, lvl: g.lvl, factors: factorsOf(g), cell: screen.cell,
      objectives: screen.objectives, rejected: screen.rejected,
    });
    if (screen.rejected) { res.rejected++; continue; }
    if (!wouldEnter(o.archive, screen)) continue;
    // THE HALVING: a screen that would change the archive earns real seeds, and
    // only a result that still changes it after them enters.
    res.promoted++;
    let fuller: EvalResult;
    try {
      fuller = evaluateGenome(g, 1, seed);
    } catch (err) {
      res.crashed++;
      o.onRow?.({
        key, source, lvl: g.lvl, factors: factorsOf(g), token: encodeGenome(g),
        crashed: ((err as Error).stack ?? String(err)).split('\n').slice(0, 4).join(' | '),
      });
      continue;
    }
    res.episodes += fuller.episodes;
    if (fuller.rejected || !wouldEnter(o.archive, fuller)) continue;
    const entered = enterArchive(o.archive, fuller, o.night);
    res.entered += entered;
    if (entered) {
      o.onElite?.(fuller);
      elitePool = elites();
    }
  }
  o.archive.cursor = Math.max(o.archive.cursor, res.lastRow);
  return res;
}

const decodeCache = new Map<string, BuildGenome | null>();
function decodeOrNull(token: string): BuildGenome | null {
  if (decodeCache.has(token)) return decodeCache.get(token)!;
  let g: BuildGenome | null = null;
  try {
    const bin = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    g = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))) as BuildGenome;
  } catch { g = null; }
  decodeCache.set(token, g);
  return g;
}

function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
