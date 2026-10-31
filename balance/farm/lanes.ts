// ---------------------------------------------------------------------------
// THE LANES AND THE PLANNER — what a night measures and how it fits the runners.
//
// A lane is one row in FARM_LANES: it turns the live catalog into UNITS. A unit is
// one `balance/cli.ts` process with its own output directory, sized to take minutes
// so a killed runner loses little, and it can resume from its own stream wherever
// the verb supports that. Lanes never name a skill, class or monster: rosters come
// from the live registries, so new content joins tomorrow night by itself.
//
// Costs are measured, not guessed: each night's `costs.json` (seconds per episode
// per lane, read off the runners that did the work) feeds the next night's plan. The
// numbers below only seed the first night.
//
// The fill lane (the search) absorbs whatever time the plan leaves, so an estimating
// error costs search coverage, never a measurement lane.
// ---------------------------------------------------------------------------

import { CLASSES } from '../../src/data/classes';
import { SKILLS } from '../../src/data/skills';
import { COMPAT_CFG, compatCensus } from '../../src/sim/compat';
import { MONSTERS } from '../../src/data/monsters';
import { PANELS } from '../../src/sim/data/panels';
import { SCENARIOS } from '../../src/sim/data/scenarios';
import { deriveSeed } from '../../src/sim/rng';
import { affixFamilies } from '../../src/sim/sweeps';

export interface FarmUnit {
  id: string;
  lane: string;
  /** balance/cli.ts arguments. The runner appends --out and any deadline. */
  argv: string[];
  /** Estimated single-core seconds. */
  estSec: number;
  estEpisodes: number;
  /** Exit 2 from this unit is a regression (loud), not an advisory read. */
  gate?: boolean;
  /** The verb accepts --resume <its own previous dir>. */
  resumable?: boolean;
  /** Takes --deadline-min, so a soft stop still writes its report. */
  deadlineAware?: boolean;
  /** The anytime lane: runs for whatever time its job has left. */
  fill?: boolean;
}

export interface LaneContext {
  night: string;
  /** Rotates anything that takes several nights to cover. */
  nightIndex: number;
  /** Tonight's seed, for the lanes that should see fresh dice every night (the
   *  search and the confirmations). Measurement lanes stay on the harness default
   *  seed instead: two nights compare at common random numbers, so a moved row
   *  means the content moved, not the dice. */
  nightSeed: number;
  profile: FarmProfile;
  /** Measured seconds-per-episode from last night, by lane. */
  costs: Record<string, number>;
  /** Yesterday's search archive, relative to the unit's cwd (absent on night one). */
  archivePath?: string;
}

export interface LaneDef {
  id: string;
  label: string;
  /** The seed-cost guess used until a night has measured it (s/episode). */
  defaultCost: number;
  plan: (ctx: LaneContext) => FarmUnit[];
}

export interface FarmProfile {
  id: string;
  label: string;
  /** Parallel runner jobs for phase A. Stay well under the account's 20. */
  jobs: number;
  /** Worker processes per job (public-repo standard runners have 4 vCPUs). */
  workers: number;
  /** Phase-A shard wall-clock target, minutes. The search fills up to this. */
  targetMinutes: number;
  /** Hard stop for phase-A units, minutes (job limit is 360). */
  deadlineMinutes: number;
  /** The search always gets at least this long, however the measurement lanes ran. */
  minFillMinutes: number;
  /** A unit should aim for about this many single-core seconds. */
  unitSeconds: number;
  /** Lanes to run. */
  lanes: string[];
  /** Lane dials. */
  dial: {
    suiteSeeds: number;
    skillLevels: number[];
    skillSeeds: number;
    skillVsLevels: number[];
    skillVsSeeds: number;
    progressionLevels: number[];
    progressionTiers: string[];
    progressionSeeds: number;
    matchLevels: number[];
    matchTiers: string[];
    matchPanels: string[];
    matchSeeds: number;
    bestiaryLevels: number[];
    bestiarySeeds: number;
    matrixSeeds: number;
    /** Deep-lane rotation: 1/N of the pairs per night. */
    deepRotation: number;
    /** Limit on matrix shards (quick profiles). */
    matrixShardLimit?: number;
    attributeSeeds: number;
    affixSamples?: number;
    affixLevels: number[];
    affixSeeds: number;
    /** Exported *_CFG names, or set:<knob set>, the globals lane perturbs. */
    globalConfigs: string[];
  };
  /** Phase-B sizing. */
  phaseB: { jobs: number; workers: number; deadlineMinutes: number; confirmSeeds: number; proposalsTop: number; archiveSeeds: number };
}

const FULL_LANES = [
  'baselines', 'audits', 'expression', 'census', 'suites', 'progression', 'skills', 'skills_vs',
  'matchups', 'bestiary', 'attributes', 'affixes', 'globals', 'matrix', 'matrix_deep', 'search',
];

/** The profiles, as data. `quick` is the same machine at a tiny scale: it exercises
 *  every lane in minutes, which is how the workflow itself gets verified. */
export const FARM_PROFILES: Record<string, FarmProfile> = {
  full: {
    id: 'full', label: 'the nightly run',
    jobs: 10, workers: 4,
    targetMinutes: 190, deadlineMinutes: 280, minFillMinutes: 30, unitSeconds: 900,
    lanes: FULL_LANES,
    dial: {
      suiteSeeds: 10,
      skillLevels: [1, 5, 10, 20, 40], skillSeeds: 3,
      skillVsLevels: [5, 10, 20], skillVsSeeds: 2,
      progressionLevels: [1, 5, 10, 20, 30, 40], progressionTiers: ['geared', 'kitted'], progressionSeeds: 5,
      matchLevels: [5, 10, 20], matchTiers: ['starter', 'geared', 'kitted'],
      matchPanels: ['textures_l8', 'shells_l8', 'parity_early'], matchSeeds: 3,
      bestiaryLevels: [5, 12, 25], bestiarySeeds: 2,
      matrixSeeds: 1, deepRotation: 3,
      attributeSeeds: 3,
      affixLevels: [20], affixSeeds: 2,
      globalConfigs: ['DEFENSE_CFG', 'SLAYER_CFG', 'MASS_CFG', 'set:growth'],
    },
    phaseB: { jobs: 6, workers: 4, deadlineMinutes: 100, confirmSeeds: 30, proposalsTop: 60, archiveSeeds: 8 },
  },
  quick: {
    id: 'quick', label: 'every lane at a tiny scale, to verify the machine',
    jobs: 2, workers: 4,
    targetMinutes: 12, deadlineMinutes: 25, minFillMinutes: 3, unitSeconds: 120,
    lanes: FULL_LANES,
    dial: {
      suiteSeeds: 1,
      skillLevels: [5], skillSeeds: 1,
      skillVsLevels: [5], skillVsSeeds: 1,
      progressionLevels: [5], progressionTiers: ['geared'], progressionSeeds: 1,
      matchLevels: [5], matchTiers: ['starter'], matchPanels: ['parity_early'], matchSeeds: 1,
      bestiaryLevels: [5], bestiarySeeds: 1,
      matrixSeeds: 1, deepRotation: 400, matrixShardLimit: 2,
      attributeSeeds: 1, affixSamples: 200,
      affixLevels: [20], affixSeeds: 1,
      globalConfigs: ['set:growth'],
    },
    phaseB: { jobs: 1, workers: 4, deadlineMinutes: 15, confirmSeeds: 5, proposalsTop: 4, archiveSeeds: 2 },
  },
};

const cost = (ctx: LaneContext, lane: string, dflt: number): number => {
  const c = ctx.costs[lane];
  return typeof c === 'number' && c > 0 ? c : dflt;
};

/** Split `episodes` of work into enough --shard units for the profile's size. */
function shardCount(episodes: number, sec: number, unitSeconds: number): number {
  return Math.max(1, Math.ceil((episodes * sec) / unitSeconds));
}

const STREAM = ['--stream', '--no-episodes'];

export const attackSpellRows = (): number =>
  Object.values(SKILLS).filter(s => {
    const t = s.tags as readonly string[];
    return !s.noDrop && (t.includes('attack') || t.includes('spell'));
  }).length;

export const FARM_LANES: Record<string, LaneDef> = {
  baselines: {
    id: 'baselines', label: 'baseline check, every committed suite baseline', defaultCost: 1.2,
    plan: ctx => {
      const units: FarmUnit[] = [];
      // The committed baselines are the regression gate proper, pinned to their
      // own seeds. Suites without a baseline have no gate to run.
      for (const suite of baselineSuites()) {
        const ids = suiteSize(suite);
        units.push({
          id: `baseline_${suite}`, lane: 'baselines', gate: true,
          argv: ['baseline', 'check', '--suite', suite],
          estSec: ids * 10 * cost(ctx, 'baselines', 1.2), estEpisodes: ids * 10,
        });
      }
      return units;
    },
  },
  audits: {
    id: 'audits', label: 'audit monsters, textures, affixes, drops, bounties', defaultCost: 0,
    plan: ctx => {
      const n = ctx.profile.dial.affixSamples;
      return [
        { id: 'audit_monsters', lane: 'audits', argv: ['audit', 'monsters', '--levels', '1,5,10,20,30,40'], estSec: 45, estEpisodes: 0 },
        { id: 'audit_textures', lane: 'audits', gate: true, argv: ['audit', 'textures', '--check-panels'], estSec: 45, estEpisodes: 0 },
        { id: 'audit_affixes', lane: 'audits', argv: ['audit', 'affixes', ...(n ? ['--n', String(n)] : [])], estSec: 150, estEpisodes: 0 },
        { id: 'audit_drops', lane: 'audits', argv: ['audit', 'drops', ...(n ? ['--n', String(n)] : [])], estSec: 90, estEpisodes: 0 },
      ];
    },
  },
  expression: {
    id: 'expression', label: 'host expression census (which skills the probes can read)', defaultCost: 0.7,
    plan: ctx => {
      const hosts = Object.values(SKILLS).filter(s => !s.noDrop).length;
      return [{
        id: 'host_expression', lane: 'expression', argv: ['matrix', 'expression'],
        estSec: hosts * 2 * cost(ctx, 'expression', 0.7), estEpisodes: hosts * 2,
      }];
    },
  },
  census: {
    id: 'census', label: 'skill × support socket census', defaultCost: 0,
    plan: () => [{ id: 'matrix_census', lane: 'census', argv: ['sweep', 'supports', '--static-only'], estSec: 60, estEpisodes: 0 }],
  },
  suites: {
    id: 'suites', label: 'every registered scenario (suite all)', defaultCost: 1.5,
    plan: ctx => {
      const n = Object.keys(SCENARIOS).length, seeds = ctx.profile.dial.suiteSeeds;
      const sec = cost(ctx, 'suites', 1.5);
      const shards = shardCount(n * seeds, sec, ctx.profile.unitSeconds);
      return Array.from({ length: shards }, (_, i) => ({
        id: `suites_${i + 1}of${shards}`, lane: 'suites',
        argv: ['run', '--suite', 'all', '--seeds', String(seeds), '--shard', `${i + 1}/${shards}`, ...STREAM],
        estSec: (n * seeds * sec) / shards, estEpisodes: (n * seeds) / shards,
        resumable: true, deadlineAware: true,
      }));
    },
  },
  progression: {
    id: 'progression', label: 'power curve, whole roster, all tiers and lanes', defaultCost: 1.6,
    plan: ctx => {
      const d = ctx.profile.dial;
      const perClass = (d.progressionLevels.length + d.progressionTiers.length * d.progressionLevels.filter(l => l > 1).length) * 4 * d.progressionSeeds;
      const sec = cost(ctx, 'progression', 1.6);
      const classes = ctx.profile.id === 'quick' ? CLASSES.slice(0, 6) : CLASSES;
      return classes.map(c => ({
        id: `progression_${c.id}`, lane: 'progression',
        argv: ['sweep', 'progression', '--classes', c.id, '--levels', d.progressionLevels.join(','),
          '--tiers', d.progressionTiers.join(','), '--lanes', 'dummy,spar,parity,pressure',
          '--seeds', String(d.progressionSeeds), ...STREAM],
        estSec: perClass * sec, estEpisodes: perClass,
        resumable: true, deadlineAware: true,
      }));
    },
  },
  skills: {
    id: 'skills', label: 'sweep skills vs dummy at every level band', defaultCost: 0.9,
    plan: ctx => {
      const d = ctx.profile.dial;
      const rows = attackSpellRows();
      const sec = cost(ctx, 'skills', 0.9);
      const units: FarmUnit[] = [];
      const shardLimit = ctx.profile.id === 'quick' ? 1 : Infinity;
      for (const level of d.skillLevels) {
        const shards = shardCount(rows * d.skillSeeds, sec, ctx.profile.unitSeconds);
        for (let i = 0; i < Math.min(shards, shardLimit); i++) {
          units.push({
            id: `skills_l${level}_${i + 1}of${shards}`, lane: 'skills',
            argv: ['sweep', 'skills', '--level', String(level), '--droppable', '--modes', '--seeds', String(d.skillSeeds),
              '--shard', `${i + 1}/${shards}`, ...STREAM],
            estSec: (rows * d.skillSeeds * sec) / shards, estEpisodes: (rows * d.skillSeeds) / shards,
            resumable: true, deadlineAware: true,
          });
        }
      }
      return units;
    },
  },
  skills_vs: {
    id: 'skills_vs', label: 'sweep skills --vs panel:textures_l8', defaultCost: 1.1,
    plan: ctx => {
      const d = ctx.profile.dial;
      const targets = PANELS.textures_l8.entries.length;
      const rows = attackSpellRows();
      const sec = cost(ctx, 'skills_vs', 1.1);
      const units: FarmUnit[] = [];
      const shardLimit = ctx.profile.id === 'quick' ? 1 : Infinity;
      for (const level of d.skillVsLevels) {
        const eps = rows * targets * d.skillVsSeeds;
        const shards = shardCount(eps, sec, ctx.profile.unitSeconds);
        for (let i = 0; i < Math.min(shards, shardLimit); i++) {
          units.push({
            id: `skillsvs_l${level}_${i + 1}of${shards}`, lane: 'skills_vs',
            argv: ['sweep', 'skills', '--level', String(level), '--droppable', '--vs', 'panel:textures_l8',
              '--seeds', String(d.skillVsSeeds), '--shard', `${i + 1}/${shards}`, ...STREAM],
            estSec: (eps * sec) / shards, estEpisodes: eps / shards,
            resumable: true, deadlineAware: true,
          });
        }
      }
      return units;
    },
  },
  matchups: {
    id: 'matchups', label: 'sweep matchups: reference builds × enemy panels', defaultCost: 2.1,
    plan: ctx => {
      const d = ctx.profile.dial;
      const targets = d.matchPanels.reduce((s, p) => s + (PANELS[p]?.entries.length ?? 0), 0);
      const classes = ctx.profile.id === 'quick' ? 4 : CLASSES.length;
      const eps = classes * d.matchLevels.length * d.matchTiers.length * targets * d.matchSeeds;
      const sec = cost(ctx, 'matchups', 2.1);
      const shards = shardCount(eps, sec, ctx.profile.unitSeconds);
      const classFlag = ctx.profile.id === 'quick' ? CLASSES.slice(0, 4).map(c => c.id).join(',') : 'all';
      // The committed real-character fixtures face the same panels.
      const fixtures: FarmUnit[] = PLAYER_BUILDS.flatMap(build => d.matchPanels.map(panel => ({
        id: `matchups_${build}_${panel}`, lane: 'matchups',
        argv: ['sweep', 'matchups', '--build', build, '--panel', panel, '--seeds', String(d.matchSeeds), ...STREAM],
        estSec: 15 * d.matchSeeds * sec, estEpisodes: 15 * d.matchSeeds,
        resumable: true, deadlineAware: true,
      })));
      return [...fixtures, ...Array.from({ length: shards }, (_, i) => ({
        id: `matchups_${i + 1}of${shards}`, lane: 'matchups',
        argv: ['sweep', 'matchgrid', '--classes', classFlag, '--levels', d.matchLevels.join(','), '--tiers', d.matchTiers.join(','),
          '--panels', d.matchPanels.join(','), '--seeds', String(d.matchSeeds),
          '--shard', `${i + 1}/${shards}`, ...STREAM],
        estSec: (eps * sec) / shards, estEpisodes: eps / shards,
        resumable: true, deadlineAware: true,
      }))];
    },
  },
  bestiary: {
    id: 'bestiary', label: 'every combat-capable monster duelled by the measuring sticks', defaultCost: 1.2,
    plan: ctx => {
      const d = ctx.profile.dial;
      const bodies = Object.values(MONSTERS).filter(m => !m.passive && !m.immortal).length;
      const eps = bodies * d.bestiaryLevels.length * 2 * 2 * d.bestiarySeeds; // sticks × (duel + threat)
      const sec = cost(ctx, 'bestiary', 1.2);
      const shards = shardCount(eps, sec, ctx.profile.unitSeconds);
      const limit = ctx.profile.id === 'quick' ? 1 : Infinity;
      return Array.from({ length: Math.min(shards, limit) }, (_, i) => ({
        id: `bestiary_${i + 1}of${shards}`, lane: 'bestiary',
        argv: ['sweep', 'bestiary', '--levels', d.bestiaryLevels.join(','), '--seeds', String(d.bestiarySeeds),
          '--shard', `${i + 1}/${shards}`, ...STREAM],
        estSec: (eps * sec) / shards, estEpisodes: eps / shards,
        resumable: true, deadlineAware: true,
      }));
    },
  },
  attributes: {
    id: 'attributes', label: 'value of +10 of each attribute, per class', defaultCost: 1.5,
    plan: ctx => {
      const d = ctx.profile.dial;
      const classes = ctx.profile.id === 'quick' ? CLASSES.slice(0, 2) : CLASSES;
      // knobs(10) × 2 directions + 1 base, × 2 scenarios × seeds.
      const eps = 21 * 2 * d.attributeSeeds;
      const sec = cost(ctx, 'attributes', 1.5);
      return classes.map(c => ({
        id: `attributes_${c.id}`, lane: 'attributes',
        argv: ['sensitivity', '--knobset', `attributes:${c.id}`,
          '--scenarios', `spar:${c.id}:20:geared,parity:${c.id}:20:geared`,
          '--seeds', String(d.attributeSeeds),
          '--metrics', 'dps_out,kills,dps_in,life_floor_pct,player_deaths,mana_floor_pct'],
        estSec: eps * sec, estEpisodes: eps, deadlineAware: true,
      }));
    },
  },
  affixes: {
    id: 'affixes', label: 'what each affix family is worth on the measuring sticks', defaultCost: 2,
    plan: ctx => {
      const d = ctx.profile.dial;
      const families = affixFamilies().length;
      const levels = ctx.profile.id === 'quick' ? [20] : d.affixLevels;
      const eps = families * 2 * 2 * 2 * 2 * d.affixSeeds;
      const sec = cost(ctx, 'affixes', 2);
      const units: FarmUnit[] = [];
      for (const level of levels) {
        const shards = shardCount(eps, sec, ctx.profile.unitSeconds);
        const limit = ctx.profile.id === 'quick' ? 1 : Infinity;
        for (let i = 0; i < Math.min(shards, limit); i++) {
          units.push({
            id: `affixes_l${level}_${i + 1}of${shards}`, lane: 'affixes',
            argv: ['sweep', 'affixes', '--level', String(level), '--seeds', String(d.affixSeeds), '--shard', `${i + 1}/${shards}`, ...STREAM],
            estSec: (eps * sec) / shards, estEpisodes: eps / shards, resumable: true, deadlineAware: true,
          });
        }
      }
      return units;
    },
  },
  globals: {
    id: 'globals', label: 'which standing config numbers move the headline rigs', defaultCost: 1.5,
    plan: ctx => {
      const d = ctx.profile.dial;
      const refs = 'spar:warrior:20:geared,spar:magician:20:geared,parity:warrior:20:geared,parity:magician:20:geared';
      const configs = ctx.profile.id === 'quick' ? d.globalConfigs.slice(0, 1) : d.globalConfigs;
      const eps = 40 * 2 * 4 * d.attributeSeeds;
      const sec = cost(ctx, 'globals', 1.5);
      return configs.map(name => ({
        id: `globals_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`, lane: 'globals', deadlineAware: true,
        argv: ['sensitivity', '--knobset', name.startsWith('set:') ? name.slice(4) : `cfg:${name}`, '--scenarios', refs, '--seeds', String(d.attributeSeeds),
          '--metrics', 'dps_out,kills,dps_in,life_floor_pct,player_deaths,mana_floor_pct'],
        estSec: eps * sec, estEpisodes: eps,
      }));
    },
  },
  matrix: {
    id: 'matrix', label: 'full skill × support no-op matrix, gated on the ledger', defaultCost: 0.9,
    plan: ctx => {
      const d = ctx.profile.dial;
      const eligible = compatCensus().rows.filter(r => r.fit !== 'refused').length;
      const sec = cost(ctx, 'matrix', 0.9);
      const shards = shardCount(eligible * d.matrixSeeds, sec, ctx.profile.unitSeconds);
      const limit = d.matrixShardLimit ?? Infinity;
      return Array.from({ length: Math.min(shards, limit) }, (_, i) => ({
        id: `matrix_${i + 1}of${shards}`, lane: 'matrix',
        argv: ['sweep', 'supports', '--budget', '100000000', '--seeds', String(d.matrixSeeds), '--shard', `${i + 1}/${shards}`, '--shard-by', 'host', '--slim'],
        estSec: (eligible * d.matrixSeeds * sec) / shards, estEpisodes: (eligible * d.matrixSeeds) / shards,
        resumable: true, deadlineAware: true,
      }));
    },
  },
  matrix_deep: {
    id: 'matrix_deep', label: 'deep lane: payload-unit ablation over a rotating slice of pairs', defaultCost: 1.5,
    plan: ctx => {
      const d = ctx.profile.dial;
      const eligible = compatCensus().rows.filter(r => r.fit !== 'refused').length;
      const slice = eligible / d.deepRotation;
      const sec = cost(ctx, 'matrix_deep', 1.5);
      const parts = shardCount(slice, sec, ctx.profile.unitSeconds);
      const shardsOf = parts * d.deepRotation;
      const offset = (ctx.nightIndex % d.deepRotation) * parts;
      const limit = d.matrixShardLimit ?? Infinity;
      return Array.from({ length: Math.min(parts, limit) }, (_, i) => ({
        id: `matrixdeep_${offset + i + 1}of${shardsOf}`, lane: 'matrix_deep',
        argv: ['sweep', 'supports', '--deep', '--budget', '100000000', '--seeds', String(d.matrixSeeds), '--shard', `${offset + i + 1}/${shardsOf}`, '--shard-by', 'host', '--slim'],
        estSec: (slice * sec) / parts, estEpisodes: slice / parts,
        resumable: true, deadlineAware: true,
      }));
    },
  },
  search: {
    id: 'search', label: 'build-space search: covering rows, MAP-Elites, successive halving', defaultCost: 1,
    // One anytime unit per worker slot; argv is finished by the planner, which
    // knows how the slots are laid out.
    plan: () => [],
  },
};

/** Baseline files that hold suite reports (the ledger and the host census have
 *  their own gates). Injected by the CLI, which can read the directory. */
let BASELINE_SUITES: string[] = [];
export function setBaselineSuites(names: readonly string[]): void { BASELINE_SUITES = [...names]; }
const baselineSuites = (): string[] => BASELINE_SUITES;
let PLAYER_BUILDS: string[] = [];
export function setPlayerBuilds(ids: readonly string[]): void { PLAYER_BUILDS = [...ids]; }
let SUITE_SIZES: Record<string, number> = {};
export function setSuiteSizes(sizes: Record<string, number>): void { SUITE_SIZES = sizes; }
const suiteSize = (s: string): number => SUITE_SIZES[s] ?? 5;

// ---------------------------------------------------------------- the planner --

export interface PlannedJob {
  index: number;
  units: FarmUnit[];
  estSec: number;
  /** Anytime units this job runs once its queue is empty, one per worker. */
  fill: FarmUnit[];
}

export interface FarmPlan {
  v: 1;
  phase: 'a' | 'b';
  night: string;
  nightIndex: number;
  nightSeed: number;
  sha: string;
  profile: string;
  jobs: PlannedJob[];
  /** Every lane's planned totals: the denominator of the coverage report. */
  lanes: Record<string, { label: string; units: number; estEpisodes: number; estSec: number }>;
  /** Lanes that were asked for and could not be planned, with the reason. */
  notPlanned: { lane: string; why: string }[];
  estCoreHours: number;
  estWallMinutes: number;
  workers: number;
  targetMinutes: number;
  deadlineMinutes: number;
  minFillMinutes?: number;
}

/** Longest-processing-time first into the least-loaded job. Deterministic. */
export function packUnits(units: readonly FarmUnit[], jobs: number): PlannedJob[] {
  const out: PlannedJob[] = Array.from({ length: jobs }, (_, i) => ({ index: i + 1, units: [], estSec: 0, fill: [] }));
  const sorted = [...units].sort((a, b) => b.estSec - a.estSec || (a.id < b.id ? -1 : 1));
  for (const u of sorted) {
    let best = out[0];
    for (const j of out) if (j.estSec < best.estSec) best = j;
    best.units.push(u);
    best.estSec += u.estSec;
  }
  return out;
}

export function buildPlan(ctx: LaneContext, sha: string): FarmPlan {
  const { profile } = ctx;
  const units: FarmUnit[] = [];
  const notPlanned: FarmPlan['notPlanned'] = [];
  const lanes: FarmPlan['lanes'] = {};
  for (const id of profile.lanes) {
    const lane = FARM_LANES[id];
    if (!lane) { notPlanned.push({ lane: id, why: 'no such lane' }); continue; }
    try {
      const planned = lane.plan(ctx);
      units.push(...planned);
      lanes[id] = {
        label: lane.label, units: planned.length,
        estEpisodes: Math.round(planned.reduce((s, u) => s + u.estEpisodes, 0)),
        estSec: Math.round(planned.reduce((s, u) => s + u.estSec, 0)),
      };
    } catch (err) {
      notPlanned.push({ lane: id, why: (err as Error).message });
    }
  }
  const jobs = packUnits(units, profile.jobs);
  if (profile.lanes.includes('search')) {
    const slots = profile.jobs * profile.workers;
    let k = 0;
    for (const job of jobs) {
      for (let w = 0; w < profile.workers; w++) {
        k++;
        job.fill.push({
          id: `search_${k}of${slots}`, lane: 'search', fill: true,
          argv: ['search', 'run', '--night', ctx.night, '--base-seed', String(deriveSeed(ctx.nightSeed, 0x5ea2)),
            '--shard', `${k}/${slots}`, ...(ctx.archivePath ? ['--archive', ctx.archivePath] : [])],
          estSec: 0, estEpisodes: 0, deadlineAware: true,
        });
      }
    }
    lanes.search = { label: FARM_LANES.search.label, units: slots, estEpisodes: 0, estSec: 0 };
  }
  const totalSec = jobs.reduce((s, j) => s + j.estSec, 0);
  const worstSec = Math.max(0, ...jobs.map(j => j.estSec));
  return {
    v: 1, phase: 'a', night: ctx.night, nightIndex: ctx.nightIndex, nightSeed: ctx.nightSeed,
    sha, profile: profile.id, jobs, lanes, notPlanned,
    estCoreHours: Math.round(totalSec / 36) / 100,
    estWallMinutes: Math.round(worstSec / profile.workers / 60),
    workers: profile.workers, targetMinutes: profile.targetMinutes, deadlineMinutes: profile.deadlineMinutes,
    minFillMinutes: profile.minFillMinutes,
  };
}

export { COMPAT_CFG };
