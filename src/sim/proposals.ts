// ---------------------------------------------------------------------------
// PROPOSALS — turn a confirmed finding into a concrete number, with its evidence.
//
// Given "this row sits far from its cohort", the procedure is:
//
//   1. CONFIRM at high seeds, on dice the night has not seen. A row that does not
//      stay out of band stops here and is reported as unconfirmed.
//   2. SOLVE: walk the subject kind's candidate knobs (data/knobSets.ts) and find
//      the multiplier that lands the metric on the cohort's near edge, measuring
//      each trial through the real game.
//   3. VERIFY the chosen number at common seeds, reading the guard metrics too, so
//      a fix that buys its number by wrecking something else shows it.
//
// Nothing is applied. The output is a from → to, before and after numbers, the
// verdict, and one command that reproduces all of it. If no knob in the rule can
// reach the target within the allowed range, that is reported as a MECHANIC FLAG for
// the owner's decision: numbers are the default output, and this is the signal that
// numbers alone may not answer the question.
// ---------------------------------------------------------------------------

import { knobCensus, roundForAuthor } from './knobs';
import { resolveScenarioRef } from './sweeps';
import { resolveKnobSet, tuningRuleFor, type TuningRule } from './data/knobSets';
import { bootstrapMeanCI, meanOf, sdOf, signFlipP, type PairedRead } from './stats';
import { WHATIF_METRICS, runBatch, runSensitivity, runWhatIf, seedsFor, solveKnob, type KnobSolution } from './whatif';
import { SKILLS } from '../data/skills';
import type { EpisodeResult, ScenarioDef } from './types';

export interface ProposalInput {
  id: string;
  kind: string;
  subject: string;
  metric: string;
  value: number;
  direction: 'high' | 'low';
  cohort: string;
  cohortMedian: number;
  ref?: string;
  target?: number;
  /** A relative finding: measure this metric on `ref`, aiming for `ratio` times the same
   *  metric on `baselineRef` at the same seeds. */
  probe?: { metric: string; baselineRef: string; ratio: number };
}

export interface Confirmation {
  seeds: number;
  baseSeed: number;
  mean: number;
  sd: number;
  lo: number;
  hi: number;
  warned: boolean;
  /** The interval stays on the far side of the target. */
  confirmed: boolean;
  /** Sign-flip p of "this row actually sits at the target". The night corrects these
   *  for false discoveries across every confirmation it ran. */
  p?: number;
}

export interface Proposal {
  findingId: string;
  kind: string;
  subject: string;
  metric: string;
  direction: 'high' | 'low';
  cohort: string;
  cohortMedian: number;
  target: number;
  confirmation: Confirmation;
  status: 'proposed' | 'unconfirmed' | 'no_knob' | 'mechanic_flag' | 'not_measurable' | 'noisy';
  /** The multiplier path and what it does, when status is 'proposed'. */
  knob?: string;
  factor?: number;
  edits?: { path: string; from: unknown; to: unknown }[];
  /** Headline metric, before and after at common seeds. */
  headline?: PairedRead;
  /** Other metrics, same seeds. Read for side effects. */
  guards?: Record<string, PairedRead>;
  closure?: number;
  elasticity?: number;
  /** The same change read on the subject's other bands: a fix that only looks good
   *  on the row it was found on is not a fix. */
  neighbors?: { ref: string; before: number; after: number; verdict: string }[];
  /** The subject's own dials on this metric: which number moves it, how hard. */
  dials?: { knob: string; elasticity: number; lo: number; hi: number; moved: boolean }[];
  /** Ranks proposals: how far out it was × how much of that the fix closes. */
  priority: number;
  /** One command, from the commit. */
  repro: string;
  /** Why this needs a person, when it does. */
  flag?: string;
  episodes: number;
}

export const PROPOSAL_CFG = {
  minFactor: 0.4,
  maxFactor: 2.5,
  solverTrials: 3,
  /** Seeds per solver trial: enough to steer, the verification uses more. */
  solverSeeds: 8,
  /** Beyond this distance from target (log scale, about 8×), ranking stops caring. */
  priorityLogCap: 2.08,
  /** Other level bands a proposal is read on, and at how many seeds. */
  neighborLevels: [5, 10, 20, 40],
  neighborSeeds: 10,
  /** Finding kind → the knob set that lists its subject's dials. */
  dialSets: { skill: 'skill', monster_threat: 'monster', monster_durability: 'monster' } as Record<string, string>,
};

const metricOf = (e: EpisodeResult, k: string): number => {
  const v = e.metrics[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

/** A skill's damage may live on the payload it casts, not the shell that casts it. */
function candidateKnobs(rule: TuningRule, subject: string): string[] {
  const direct = rule.knobs(subject);
  const def = SKILLS[subject] as unknown as { delivery?: { castSkillId?: string; skill?: string } } | undefined;
  const nested = def?.delivery?.castSkillId ?? def?.delivery?.skill;
  if (rule.kinds.includes('skill') && nested && SKILLS[nested]?.baseDamage) direct.push(`skills.${nested}.baseDamage`);
  return direct.filter(p => { try { return knobCensus(p, 1).length > 0; } catch { return false; } });
}

/** The same scenario at the other bands. Level-free refs answer nothing. */
export function neighborRefs(ref: string): string[] {
  const parts = ref.split(':');
  const levelAt: Record<string, number> = { skill: 2, spar: 2, dummy: 2, parity: 2, pressure: 2, survival: 2, duel: 3, threat: 3 };
  const at = levelAt[parts[0]];
  if (at === undefined) return [];
  const here = Number(parts[at]);
  const out: string[] = [];
  for (const level of PROPOSAL_CFG.neighborLevels) {
    if (level === here) continue;
    const next = [...parts];
    next[at] = String(level);
    // A build named by its level moves with the band.
    if (parts[0] === 'duel' || parts[0] === 'threat') next[1] = parts[1].replace(/_l\d+$/, `_l${level}`);
    out.push(next.join(':'));
  }
  return out;
}

/** How far from the target a finding sits, as a ranking term. Past the cap, more of the
 *  same says nothing new: a body that does almost no damage is not 100 times the
 *  problem of one doing a tenth of the target. */
function distanceOf(mean: number, target: number, rule: TuningRule | undefined, direction: 'high' | 'low'): number {
  const log = Math.abs(Math.log(Math.max(mean, 1e-6) / Math.max(target, 1e-6)));
  return Math.min(PROPOSAL_CFG.priorityLogCap, log) * (rule?.weight?.[direction] ?? 1);
}

export function proposeFor(fIn: ProposalInput, o: { seeds: number; baseSeed: number; commit?: string }): Proposal {
  const seedList = seedsFor(o.baseSeed, o.seeds);
  // A relative finding: the number to hit comes from the bare rig on these same dice.
  let bareEpisodes = 0;
  let f = fIn;
  if (fIn.probe) {
    const bare = runBatch(resolveScenarioRef(fIn.probe.baselineRef), seedList);
    bareEpisodes = bare.length;
    const bareMean = meanOf(bare.map(e => metricOf(e, fIn.probe!.metric)));
    f = { ...fIn, metric: fIn.probe.metric, target: bareMean * fIn.probe.ratio, cohortMedian: bareMean * fIn.probe.ratio };
  }
  const target = f.target ?? f.cohortMedian;
  const base: Omit<Proposal, 'status' | 'confirmation' | 'priority' | 'repro' | 'episodes'> = {
    findingId: f.id, kind: f.kind, subject: f.subject, metric: f.metric,
    direction: f.direction, cohort: f.cohort, cohortMedian: f.cohortMedian, target,
  };
  const emptyConfirm: Confirmation = { seeds: 0, baseSeed: o.baseSeed, mean: f.value, sd: 0, lo: f.value, hi: f.value, warned: false, confirmed: false };
  if (!f.ref) {
    return { ...base, status: 'not_measurable', confirmation: emptyConfirm, priority: 0, repro: '', episodes: 0 };
  }
  const scenario: ScenarioDef = resolveScenarioRef(f.ref);
  // Step 1: confirm on fresh dice.
  const eps = runBatch(scenario, seedList);
  let episodes = eps.length + bareEpisodes;
  const reads = eps.map(e => metricOf(e, f.metric));
  const mean = meanOf(reads);
  const ci = bootstrapMeanCI(reads, o.baseSeed ^ 0x3f1);
  const warned = eps.some(e => e.warnings.length > 0);
  const confirmed = !warned && (f.direction === 'high' ? ci.lo > target : ci.hi < target);
  const confirmation: Confirmation = {
    seeds: seedList.length, baseSeed: o.baseSeed, mean, sd: sdOf(reads), lo: ci.lo, hi: ci.hi, warned, confirmed,
    p: signFlipP(reads.map(x => x - target), o.baseSeed ^ 0x51f),
  };
  const measureRepro = `npm run sim -- run --refs ${f.ref} --seeds ${o.seeds} --base-seed ${o.baseSeed}`;
  const rule = tuningRuleFor(f.kind);
  if (!confirmed) {
    return { ...base, status: 'unconfirmed', confirmation, priority: 0, repro: measureRepro, episodes };
  }
  // Step 2: solve along the kind's candidate knobs.
  const knobs = rule ? candidateKnobs(rule, f.subject) : [];
  if (!knobs.length) {
    return {
      ...base, status: 'no_knob', confirmation, priority: distanceOf(mean, target, rule, f.direction),
      repro: measureRepro, episodes,
      flag: f.kind === 'interaction'
        ? 'A combination far from the sum of its parts, confirmed on fresh dice. Read which part carries it before tuning any one of them.'
        : `No registered number moves this kind of subject (${f.kind}). Extend TUNING_RULES, or decide it by hand.`,
    };
  }
  let chosen: KnobSolution | null = null;
  const tried: KnobSolution[] = [];
  for (const path of knobs) {
    const sol = solveKnob({
      path, scenario, metric: f.metric, target,
      seeds: PROPOSAL_CFG.solverSeeds, baseSeed: o.baseSeed,
      minFactor: PROPOSAL_CFG.minFactor, maxFactor: PROPOSAL_CFG.maxFactor, maxTrials: PROPOSAL_CFG.solverTrials,
    });
    episodes += sol.episodes;
    tried.push(sol);
    if (!sol.unreachable) { chosen = sol; break; }
  }
  if (!chosen) {
    const best = tried.reduce((a, b) => (b.closure > a.closure ? b : a));
    return {
      ...base, status: 'mechanic_flag', confirmation, repro: measureRepro, episodes,
      knob: best.path, factor: best.factor, closure: best.closure, elasticity: best.elasticity,
      priority: distanceOf(mean, target, rule, f.direction),
      flag: `The numbers an author would reach for barely move this: ${tried.map(t => `${t.path} ×${t.factor} closes ${Math.round(t.closure * 100)}%`).join('; ')}. The cause may not be numeric, so this needs your decision rather than a tuning pass.`,
    };
  }
  // The alternatives beside the chosen dial, so a person can pick a different one.
  const dialSet = PROPOSAL_CFG.dialSets[f.kind];
  let dials: Proposal['dials'];
  if (dialSet) {
    try {
      const sens = runSensitivity({
        knobs: resolveKnobSet(`${dialSet}:${f.subject}`), scenarios: [scenario],
        seeds: PROPOSAL_CFG.solverSeeds, baseSeed: o.baseSeed, metrics: [f.metric],
      });
      episodes += sens.episodes;
      dials = sens.cells.map(c => ({
        knob: c.knob, elasticity: c.elasticity, lo: c.lo, hi: c.hi, moved: c.moved,
      })).sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
    } catch { dials = undefined; }
  }
  // Step 3: verify at common seeds with the guard metrics.
  const knobText = `${chosen.path}*${chosen.factor}`;
  const verify = runWhatIf({
    knobs: [knobText], scenarios: [scenario], seeds: o.seeds, baseSeed: o.baseSeed,
    metrics: [...new Set([f.metric, ...(rule?.guard ?? []), ...WHATIF_METRICS])],
  });
  episodes += o.seeds * 2;
  const row = verify.rows[0];
  const headline = row?.metrics[f.metric];
  const edits = verify.touched.slice(0, 12).map(t => ({
    path: t.path, from: t.before,
    to: typeof t.after === 'number' ? roundForAuthor(t.after) : t.after,
  }));
  const guards: Record<string, PairedRead> = {};
  for (const g of rule?.guard ?? []) if (row?.metrics[g]) guards[g] = row.metrics[g];
  const closure = headline ? (headline.after - headline.before) / ((target - headline.before) || 1) : 0;
  // The change elsewhere: the same knob on the subject's other bands.
  let neighbors: Proposal['neighbors'];
  const refs = neighborRefs(f.ref);
  if (refs.length) {
    try {
      const scenarios = refs.map(resolveScenarioRef);
      const seen = runWhatIf({
        knobs: [knobText], scenarios, seeds: PROPOSAL_CFG.neighborSeeds, baseSeed: o.baseSeed, metrics: [f.metric],
      });
      episodes += scenarios.length * PROPOSAL_CFG.neighborSeeds * 2;
      neighbors = seen.rows.map((row2, i) => ({
        ref: refs[i],
        before: row2.metrics[f.metric]?.before ?? 0,
        after: row2.metrics[f.metric]?.after ?? 0,
        verdict: row2.metrics[f.metric]?.verdict ?? 'identical',
      }));
    } catch { neighbors = undefined; }
  }
  // A change smaller than the subject's own noise is not evidence of anything, however
  // close to the target its mean landed.
  const proven = headline?.verdict === 'moved';
  return {
    ...base, status: proven ? 'proposed' : 'noisy', confirmation, knob: chosen.path, factor: chosen.factor, edits,
    headline, guards, closure, elasticity: chosen.elasticity, dials, neighbors,
    ...(proven ? {} : { flag: `This change moved the metric less than its own noise at ${o.seeds} seeds, so it proves nothing yet.` }),
    priority: distanceOf(mean, target, rule, f.direction) * Math.min(1, Math.max(0, closure)),
    repro: `npm run sim -- whatif --knob '${knobText}' --scenarios ${f.ref} --seeds ${o.seeds} --base-seed ${o.baseSeed}`,
    episodes,
  };
}
