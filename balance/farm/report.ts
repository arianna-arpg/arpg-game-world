// ---------------------------------------------------------------------------
// THE NIGHT'S REPORT — what the owner reads.
//
// renderDigest is the rolling issue's body and latest/digest.md: regressions first
// and loud, then what moved, the outliers, the proposed numbers with their evidence,
// and an honest statement of what did and did not run. Everything is advisory except
// the first section, and each section says which it is.
// ---------------------------------------------------------------------------

import type { Finding, RowSnap } from './analyze';
import type { LaneCoverage } from './cli';

export interface TrendRow {
  night: string;
  sha: string;
  episodes: number;
  coreHours: number;
  wallMinutes: number | null;
  findings: number;
  proposals: number;
  red: boolean;
  expressionMute: number | null;
  classSparL20Median: number | null;
  classSparL20Spread: number | null;
  kittedSparL20Median: number | null;
  matrixProbed: number | null;
  matrixEligible: number | null;
  matrixInert: number | null;
  matrixEffective: number | null;
  searchArchive: number | null;
  searchEvaluated: number | null;
}

export interface ProposalRow {
  findingId: string;
  kind: string;
  subject: string;
  metric: string;
  direction: 'high' | 'low';
  cohort: string;
  cohortMedian: number;
  target: number;
  status: string;
  knob?: string;
  factor?: number;
  edits?: { path: string; from: unknown; to: unknown }[];
  headline?: { before: number; after: number; verdict: string; lo: number; hi: number };
  guards?: Record<string, { before: number; after: number; verdict: string }>;
  closure?: number;
  confirmation?: { mean: number; sd: number; seeds: number; baseSeed: number; confirmed: boolean };
  priority?: number;
  dials?: { knob: string; elasticity: number; lo: number; hi: number; moved: boolean }[];
  repro: string;
  flag?: string;
}

export interface NightRecord {
  night: string;
  sha: string;
  profile: string;
  nightSeed: number;
  runUrl?: string;
  wallMinutes: number | null;
  totalEpisodes: number;
  coreHours: number;
  coverage: Record<string, LaneCoverage>;
  lanes: Record<string, Record<string, unknown>>;
  gates: {
    baselines: { suite: string; baselineAt: string; breaches: number; deviations: { scenarioId: string; metric: string; a: number; b: number; rel: number; tol: number; via: string }[] }[];
    failed: { unit: string; lane: string; status: string; tail: string }[];
    regressions: string[];
  };
  matrix: Record<string, unknown>;
  search: Record<string, unknown>;
  shards: { job: number; wallSec: number; workers: number; cpus: number; cpuModel?: string }[];
  findings: Finding[];
  newFindings: string[];
  moved: { key: string; before: number; after: number; rel: number }[];
  proposals: ProposalRow[];
  archiveConfirmed: number;
  archiveDropped: number;
  elites: { lvl: number; objective: string; value: number; ratioToMedian: number; cell: string; key: string; genome: string; factors: string[]; baseSeed?: number; seeds?: number }[];
  /** Scenarios that threw, by lane. */
  rowErrors?: { lane: string; signature: string; count: number; sample: string; message: string }[];
  bandsProposal: { group: string; n: number; zero: number; p10: number; median: number; p90: number }[];
}

const REPO = 'arianna-arpg/arpg-game-world';
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const n2 = (x: number | undefined | null, d = 1): string =>
  x === undefined || x === null || !Number.isFinite(x) ? '–' : String(Math.round(x * 10 ** d) / 10 ** d);
const code = (s: string): string => `\`${s}\``;

export function renderDigest(r: NightRecord, t: TrendRow, history: readonly TrendRow[]): string {
  const L: string[] = [];
  const shortSha = r.sha.slice(0, 10);
  const shaLink = /^[0-9a-f]{7,}$/.test(r.sha) ? `[${shortSha}](https://github.com/${REPO}/commit/${r.sha})` : shortSha;
  L.push(`# Balance farm, night of ${r.night}`);
  L.push('');
  L.push(`Commit ${shaLink}, profile ${code(r.profile)}. ${r.totalEpisodes.toLocaleString('en-US')} episodes, ${n2(r.coreHours)} core-hours${r.wallMinutes !== null ? `, ${r.wallMinutes} minutes end to end` : ''}.${r.runUrl ? ` [Run](${r.runUrl}).` : ''}`);
  L.push('');

  // ------------------------------------------------------ regressions: loud --
  const breaches = r.gates.baselines.filter(b => b.breaches > 0);
  const m = r.matrix as { newSinceYesterday?: number; newSinceYesterdaySample?: string[]; ledger?: Record<string, unknown>; verdicts?: Record<string, number>; probed?: number; eligible?: number; coveragePct?: number; deepPairs?: number; conflicts?: number; supportPowerTop?: { support: string; n: number; medianDelta: number }[]; supportPowerBottom?: { support: string; n: number; medianDelta: number }[]; healedSinceYesterday?: number };
  const prog = r.lanes.progression as { expressionCounts?: Record<string, number>; instrumentGaps?: string[]; expression?: Record<string, string>; roster?: Record<string, unknown>[]; levels?: number[]; gearValue?: { classId: string; level: number; tier: string; ratio: number }[] } | undefined;
  const red = breaches.length > 0 || r.gates.failed.length > 0 || (m.newSinceYesterday ?? 0) > 0
    || r.gates.regressions.some(id => !id.startsWith('baseline_')) || (prog?.instrumentGaps?.length ?? 0) > 0;
  if (red) {
    L.push(`## 🔴 Regressions`);
    L.push('');
    for (const b of breaches) {
      L.push(`**Baseline ${code(b.suite)} moved** on ${b.breaches} gated metric(s), against the baseline of ${b.baselineAt.slice(0, 10)}:`);
      for (const d of b.deviations.slice(0, 8)) L.push(`- ${code(d.scenarioId)} ${d.metric}: ${d.a} → ${d.b} (${pct(d.rel)}, band ${pct(d.tol)})`);
      L.push(`- Re-measure: ${code(`npm run sim -- baseline check --suite ${b.suite}`)}. If the move was intended, ${code(`baseline write`)} belongs in the same commit as the change.`);
    }
    if ((m.newSinceYesterday ?? 0) > 0) {
      L.push(`**${m.newSinceYesterday} new skill × support defect(s) since last night**: ${(m.newSinceYesterdaySample ?? []).slice(0, 10).map(code).join(', ')}. Forensics: ${code('npm run sim -- matrix explain <skill> <support>')}.`);
    }
    for (const id of r.gates.regressions.filter(x => !x.startsWith('baseline_'))) L.push(`**Gated unit failed its check:** ${code(id)}.`);
    if (prog?.instrumentGaps?.length) L.push(`**Instrument gap:** ${prog.instrumentGaps.map(code).join(', ')} express nothing on any lane. A class the rig cannot read cannot be balanced; this is a defect of the instrument, not a balance finding.`);
    for (const x of r.gates.failed.slice(0, 8)) {
      L.push(`**Crash in ${code(x.unit)}** (${x.status}, lane ${x.lane}).`);
      if (x.tail) L.push('```\n' + x.tail + '\n```');
    }
    L.push('');
  } else {
    L.push(`## ✅ No regressions`);
    L.push('');
    L.push(`Every committed baseline holds, nothing crashed, and the matrix has no new defects since last night.`);
    L.push('');
  }
  const unrun = Object.values(r.coverage).reduce((s, c) => s + c.missing.length, 0);
  if (unrun) {
    L.push(`**⚠️ This night is incomplete: ${unrun} planned unit(s) did not finish.** The sections below cover what ran, and the coverage table names the rest.`);
    L.push('');
  }

  // ------------------------------------------------------------- what moved --
  L.push(`## What moved since last night`);
  L.push('');
  const prev = history[history.length - 1];
  if (!prev) {
    L.push(`First recorded night: nothing to compare with yet.`);
  } else if (prev.sha === r.sha) {
    L.push(`Same commit as last night (${prev.sha.slice(0, 10)}). At common seeds nothing should move, so any row below is a determinism finding.`);
  }
  if (r.moved.length) {
    L.push(`${r.moved.length} row(s) moved past their own noise and 10%. Largest first:`);
    L.push('');
    L.push('| row | before | after | change |');
    L.push('|---|---:|---:|---:|');
    for (const x of r.moved.slice(0, 25)) L.push(`| ${code(x.key)} | ${n2(x.before, 2)} | ${n2(x.after, 2)} | ${x.after > x.before ? '+' : '−'}${pct(x.rel)} |`);
  } else if (prev) {
    L.push(`No row moved past its own noise and 10%.`);
  }
  L.push('');

  // ------------------------------------------------------------ the proposals --
  const proposed = r.proposals.filter(p => p.status === 'proposed');
  const flagged = r.proposals.filter(p => p.status === 'mechanic_flag');
  const unconfirmed = r.proposals.filter(p => p.status === 'unconfirmed').length;
  L.push(`## Top proposed numbers`);
  L.push('');
  L.push(`Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds.${unconfirmed ? ` ${unconfirmed} outlier(s) did not confirm on fresh dice and were dropped.` : ''}`);
  L.push('');
  if (proposed.length) {
    L.push('| # | subject | change | metric: before → after | cohort target | verdict | guards |');
    L.push('|---:|---|---|---|---:|---|---|');
    proposed.slice(0, 15).forEach((p, i) => {
      const edit = p.edits?.[0];
      const change = edit ? `${code(edit.path)}: ${JSON.stringify(edit.from)} → ${JSON.stringify(edit.to)}${(p.edits?.length ?? 0) > 1 ? ` (+${(p.edits?.length ?? 1) - 1} lines, ×${p.factor})` : ''}` : `${code(p.knob ?? '')} ×${p.factor}`;
      const guards = Object.entries(p.guards ?? {}).filter(([, g]) => g.verdict === 'moved').map(([k, g]) => `${k} ${n2(g.before)}→${n2(g.after)}`).join('; ') || 'none moved';
      L.push(`| ${i + 1} | ${p.kind} ${code(p.subject)} | ${change} | ${p.metric}: ${n2(p.headline?.before)} → ${n2(p.headline?.after)} | ${n2(p.target)} | ${p.headline?.verdict ?? '–'} | ${guards} |`);
    });
    L.push('');
    L.push(`<details><summary>Repro commands</summary>\n`);
    proposed.slice(0, 15).forEach((p, i) => {
      const dials = (p.dials ?? []).filter(d => d.moved).map(d => `${d.knob} ${n2(d.elasticity, 2)}`).join(', ');
      L.push(`${i + 1}. ${code(p.repro)}${dials ? `. Other dials on this metric (elasticity): ${dials}` : ''}`);
    });
    L.push(`\nRun from commit ${code(r.sha)}.\n</details>`);
  } else {
    L.push(`No confirmed proposal tonight.`);
  }
  L.push('');
  if (flagged.length) {
    L.push(`### Flagged for your decision`);
    L.push('');
    L.push(`The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.`);
    L.push('');
    for (const p of flagged.slice(0, 10)) L.push(`- ${p.kind} ${code(p.subject)}: ${p.flag ?? ''}`);
    L.push('');
  }

  // ----------------------------------------------------------- the outliers --
  L.push(`## Outliers`);
  L.push('');
  const newSet = new Set(r.newFindings);
  L.push(`${r.findings.length} rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×)${r.newFindings.length ? `, ${r.newFindings.length} of them new tonight` : ''}. Warned rows and zero rows never enter a cohort.`);
  L.push('');
  L.push('| | kind | subject | metric | value | cohort median | ratio | z | cohort |');
  L.push('|---|---|---|---|---:|---:|---:|---:|---|');
  const shownFindings = r.findings.filter(y => y.ref || y.kind !== 'monster_life_curve').slice(0, 25);
  for (const x of shownFindings) {
    L.push(`| ${newSet.has(x.id) ? '🆕' : ''} | ${x.kind} | ${code(x.subject)} | ${x.metric} | ${n2(x.value)} | ${n2(x.cohortMedian)} | ${n2(x.ratio, 2)}× | ${n2(x.z)} | ${x.cohort.replace(/\|/g, ' · ')} |`);
  }
  L.push('');

  const reproRows = shownFindings.filter(x => x.ref);
  if (reproRows.length) {
    L.push('<details><summary>Re-measure any of these</summary>', '');
    for (const x of reproRows) L.push(`- ${x.subject}: ${code(`npm run sim -- run --refs ${x.ref} --seeds 10`)}`);
    L.push('', '</details>');
    L.push('');
  }

  // ---------------------------------------------------------------- the search --
  const s = r.search as { coverage?: Record<string, { seen: number; of: number }>; crashes?: { signature: string; message: string; token: string; count: number }[]; newCrashes?: string[]; candidates?: number; rejected?: number; episodes?: number; archiveRows?: number; cursor?: number; totals?: { evaluated?: number; nights?: number }; effects?: { bands?: { lvl: number; rows: number; top: { factor: string; multiplier: number; n: number }[]; bottom: { factor: string; multiplier: number; n: number }[] }[] } };
  L.push(`## Build search`);
  L.push('');
  const matrixCrashes = (r.matrix as { crashes?: { signature: string; pair: string; count: number }[] }).crashes ?? [];
  const scenarioErrors = r.rowErrors ?? [];
  if (s.crashes?.length || matrixCrashes.length || scenarioErrors.length) {
    const fresh = new Set(s.newCrashes ?? []);
    L.push(`**Legal builds crashed the engine.** These are engine bugs reachable in play, not balance findings, and each is one command to reproduce:`);
    L.push('');
    for (const x of scenarioErrors.slice(0, 8)) {
      L.push(`- ${fresh.has(x.signature) ? '🆕 ' : ''}${code(x.signature)} (${x.count} scenario${x.count === 1 ? '' : 's'} in lane ${x.lane}, e.g. ${code(x.sample)})`);
    }
    for (const x of matrixCrashes.slice(0, 8)) {
      L.push(`- ${fresh.has(x.signature) ? '🆕 ' : ''}${code(x.signature)} (${x.count} pair${x.count === 1 ? '' : 's'}): ${code(`npm run sim -- matrix explain ${x.pair}`)}`);
    }
    for (const x of (s.crashes ?? []).slice(0, 8)) {
      L.push(`- ${fresh.has(x.signature) ? '🆕 ' : ''}${code(x.signature)} (${x.count} candidate${x.count === 1 ? '' : 's'}). <details><summary>repro</summary>${code(`npm run sim -- search repro --genome ${x.token} --seeds 3`)}</details>`);
    }
    L.push('');
  }
  L.push(`${(s.candidates ?? 0).toLocaleString('en-US')} candidates tonight (${(s.rejected ?? 0).toLocaleString('en-US')} refused by the real gates), ${(s.totals?.evaluated ?? 0).toLocaleString('en-US')} over ${s.totals?.nights ?? 0} night(s). The archive holds ${s.archiveRows ?? 0} elite rows; ${r.archiveConfirmed} were re-measured on this commit${r.archiveDropped ? ` and ${r.archiveDropped} no longer pass the gates` : ''}.${s.coverage ? ` Tried so far in a legal build: ${Object.entries(s.coverage).map(([k, v]) => `${v.seen} of ${v.of} ${k}${k === 'class' ? 'es' : 's'}`).join(', ')}.` : ''}`);
  L.push('');
  if (r.elites.length) {
    L.push('| band | objective | build (top factors) | value | × band median | repro |');
    L.push('|---|---|---|---:|---:|---|');
    for (const e of r.elites.filter(x => x.ratioToMedian >= 2).slice(0, 12)) {
      L.push(`| L${e.lvl} | ${e.objective} | ${e.factors.slice(0, 5).map(code).join(' ')} | ${n2(e.value)} | ${n2(e.ratioToMedian)}× | <details><summary>token</summary>${code(`npm run sim -- search repro --genome ${e.genome} --seeds ${e.seeds ?? 8}${e.baseSeed !== undefined ? ` --base-seed ${e.baseSeed}` : ''}`)}</details> |`);
    }
    L.push('');
  }
  for (const b of s.effects?.bands ?? []) {
    const top = b.top.filter(e => !e.factor.startsWith('class:')).slice(0, 5);
    const bottom = b.bottom.filter(e => !e.factor.startsWith('class:')).slice(0, 5);
    if (!top.length) continue;
    L.push(`Main effects at L${b.lvl} over ${b.rows} rows: strongest ${top.map(e => `${code(e.factor)} ${n2(e.multiplier, 2)}×`).join(', ')}; weakest ${bottom.map(e => `${code(e.factor)} ${n2(e.multiplier, 2)}×`).join(', ')}.`);
    L.push('');
  }

  const combos = r.proposals.filter(p => p.kind === 'interaction' && p.status === 'no_knob');
  if (combos.length) {
    L.push(`**Combinations far off the sum of their parts**, confirmed on fresh dice (${r.proposals.filter(p => p.kind === 'interaction').length} tried):`);
    L.push('');
    for (const p of combos.slice(0, 8)) {
      L.push(`- ${code(p.subject)}: measured ${n2(p.confirmation?.mean)}, its parts predict ${n2(p.target)}. <details><summary>repro</summary>${code(p.repro)}</details>`);
    }
    L.push('');
  }

  // ------------------------------------------------------------ the tuning reads --
  const attrs = (r.lanes.attributes as { perAttribute?: { attribute: string; medianOutputShare: number; medianLifeFloorPts: number; noopClasses: number; classes: number }[] } | undefined)?.perAttribute ?? [];
  const affixes = r.lanes.affixes as { topOutput?: { family: string; cls: string; outputRatio: number }[]; topSurvival?: { family: string; cls: string; lifeFloorDelta: number }[]; deadOnTheseRigs?: string[]; families?: number; notWearable?: number } | undefined;
  const globals = r.lanes.globals as { strongest?: { config: string; knob: string; metric: string; scenarioId: string; elasticity: number }[]; noopCount?: number; errors?: string[] } | undefined;
  const supportTop = m.supportPowerTop ?? [];
  if (attrs.length || affixes?.topOutput?.length || globals?.strongest?.length || supportTop.length) {
    L.push(`## Tuning reads`);
    L.push('');
    L.push(`Standing tables to tune from. Advisory.`);
    L.push('');
  }
  if (attrs.length) {
    L.push(`**What +10 of each attribute is worth**, median across the roster at L20 geared (output share on the sparring lane, life-floor points in the pack):`);
    L.push('');
    L.push('| attribute | output | life floor | classes where it did nothing |');
    L.push('|---|---:|---:|---:|');
    for (const a of attrs) L.push(`| ${a.attribute} | ${a.medianOutputShare > 0 ? '+' : ''}${n2(a.medianOutputShare * 100, 1)}% | ${n2(a.medianLifeFloorPts)} | ${a.noopClasses} of ${a.classes} |`);
    L.push('');
  }
  if (supportTop.length) {
    const bottom = m.supportPowerBottom ?? [];
    L.push(`**Support power**, median output change across the hosts each gem works on. Strongest: ${supportTop.slice(0, 8).map(t => `${code(t.support)} +${n2(t.medianDelta * 100, 0)}%`).join(', ')}. Weakest: ${bottom.slice(0, 8).map(t => `${code(t.support)} ${t.medianDelta > 0 ? '+' : ''}${n2(t.medianDelta * 100, 0)}%`).join(', ')}.`);
    L.push('');
  }
  if (affixes?.topOutput?.length) {
    L.push(`**Affix families** (${affixes.families ?? 0} measured on one magic piece against the same wardrobe without it, ${affixes.notWearable ?? 0} never worn on the doll). Most output: ${affixes.topOutput.slice(0, 8).map(a => `${code(a.family)} ${n2(a.outputRatio, 2)}× on ${a.cls}`).join(', ')}. Most survival: ${(affixes.topSurvival ?? []).slice(0, 6).map(a => `${code(a.family)} +${n2(a.lifeFloorDelta)} on ${a.cls}`).join(', ')}.${affixes.deadOnTheseRigs?.length ? ` Moved nothing on these rigs: ${affixes.deadOnTheseRigs.length} families.` : ''}`);
    L.push('');
  }
  if (globals?.strongest?.length) {
    L.push(`**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). ${globals.strongest.slice(0, 10).map(g => `${code(g.knob)} → ${g.metric} ${n2(g.elasticity, 2)}`).join(', ')}. ${globals.noopCount ?? 0} numbers moved nothing here.`);
    L.push('');
  }

  const bands = (r.lanes.progression as { bands?: { metric: string; lane: string; tier: string; level: string; ok: number; off: number; p10: number; median: number; p90: number }[] } | undefined)?.bands ?? [];
  const misfit = bands.filter(b => b.off > b.ok);
  if (bands.length) {
    L.push(`**Provisional bands against the roster.** ${misfit.length} of ${bands.length} band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.`);
    L.push('');
    if (misfit.length) {
      L.push('| metric | lane | tier | band | roster outside | measured p10 | median | p90 |');
      L.push('|---|---|---|---|---:|---:|---:|---:|');
      for (const b of misfit.slice(0, 12)) L.push(`| ${b.metric} | ${b.lane} | ${b.tier} | ${b.level} | ${b.off} of ${b.ok + b.off} | ${n2(b.p10)} | ${n2(b.median)} | ${n2(b.p90)} |`);
      L.push('');
    }
  }

  // ---------------------------------------------------------- the instrument --
  L.push(`## The instrument`);
  L.push('');
  if (prog?.expressionCounts) {
    const e = prog.expressionCounts;
    L.push(`Class expression at the top band: ${e.dummy ?? 0} read on the dummy, ${e.spar ?? 0} need the sparring partner, ${e.pack ?? 0} read only in the pack lanes, ${e.mute ?? 0} mute.`);
  }
  const best = r.lanes.bestiary as { measuredRows?: number; neverHitsRows?: number; notFielded?: number; silentBodyCount?: number } | undefined;
  if (best?.measuredRows) L.push(`Bestiary: ${best.measuredRows} rows measured, ${best.notFielded ?? 0} bodies not fielded (passive or immortal fixtures). ${best.silentBodyCount ?? 0} bodies never swung at a hero standing idle within reach; those are sentries, spawners and scenery until shown otherwise, and their threat reads as unmeasured.`);
  const su = r.lanes.suites as { scenarios?: number; graded?: number; flagged?: number; warned?: number } | undefined;
  if (su?.scenarios) L.push(`Suites: ${su.scenarios} scenarios, ${su.flagged ?? 0} of ${su.graded ?? 0} graded metrics outside their provisional band, ${su.warned ?? 0} warned.`);
  L.push(`Matrix: ${(m.probed ?? 0).toLocaleString('en-US')} of ${(m.eligible ?? 0).toLocaleString('en-US')} eligible pairs probed (${m.coveragePct ?? 0}%), deep lane on ${m.deepPairs ?? 0} pairs. Verdicts: ${Object.entries(m.verdicts ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  const led = m.ledger as { rows?: number; newAgainstLedger?: number; resolvedAgainstLedger?: number } | undefined;
  if (led) L.push(`Against the committed ledger (${led.rows} rows): ${led.newAgainstLedger ?? 0} not on file, ${led.resolvedAgainstLedger ?? 0} measuring healthy. The ledger only changes through ${code('matrix check --reconcile')}.`);
  L.push('');

  // ----------------------------------------------------------- coverage table --
  L.push(`## What ran, and what did not`);
  L.push('');
  L.push('| lane | units planned | ok | gate breach | crashed/killed | not run | episodes | core-hours |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const [id, c] of Object.entries(r.coverage)) {
    L.push(`| ${id} | ${c.planned} | ${c.ok} | ${c.regression} | ${c.failed + c.killed} | ${c.notRun} | ${c.episodes.toLocaleString('en-US')} | ${n2(c.coreSec / 3600)} |`);
  }
  L.push('');
  const missing = Object.entries(r.coverage).flatMap(([, c]) => c.missing);
  if (missing.length) {
    L.push(`**Did not run:** ${missing.slice(0, 40).map(code).join(', ')}${missing.length > 40 ? ` and ${missing.length - 40} more` : ''}. Their numbers below are absent, not zero.`);
  } else {
    L.push(`Every planned unit ran.`);
  }
  L.push('');
  L.push(`Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.`);
  L.push('');
  void t;
  return L.join('\n');
}

export function renderReadme(r: NightRecord, digest: string): string {
  return [
    `# Balance farm results`,
    ``,
    `Data branch: machine-written by \`.github/workflows/balance-farm.yml\`. Do not edit by hand.`,
    ``,
    `- \`latest/\` the newest night: \`summary.json\`, \`digest.md\``,
    `- \`nights/<date>/\` one small record per night`,
    `- \`trend.jsonl\` one line per night`,
    `- \`state/\` what the next night builds on: the search archive, measured lane costs, row snapshot`,
    ``,
    `Page: https://arianna-arpg.github.io/arpg-game-world/balance/`,
    ``,
    `---`,
    ``,
    digest,
  ].join('\n');
}

export type { RowSnap };
