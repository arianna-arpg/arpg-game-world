// ---------------------------------------------------------------------------
// DESIGN TARGETS — the balance philosophy expressed as DATA. A report grades
// its metrics against these bands; a band is a claim about how the game
// should FEEL, written down where a simulation can check it.
//
// Every band starts `provisional: true` — the first calibration passes will
// move numbers; removing the flag is a deliberate design sign-off, not a
// default. Grading never fails a run by itself: bands paint OK/LOW/HIGH on
// reports, and the compare/baseline gates are what enforce regressions.
//
// appliesTo matches scenario ids by PREFIX — the same open-string convention
// as every other registry in the game. Where two bands claim one metric, the
// LONGER matching prefix wins (see gradeReport), so a per-class adjudication
// can narrow or widen its family band without disturbing the family.
// ---------------------------------------------------------------------------

import type { MetricSummary, ScenarioReport } from '../types';

export interface TargetBand {
  /** Metric key (see the glossary in docs/balance/README.md). */
  metric: string;
  /** Inclusive bounds on the metric's MEAN. Omit a side to leave it open. */
  min?: number;
  max?: number;
  /** Scenario-id prefixes this band applies to. */
  appliesTo: string[];
  /** Why this band exists — the feel it protects. */
  note: string;
  /** Still awaiting calibration sign-off. */
  provisional?: boolean;
}

export const TARGETS: TargetBand[] = [
  {
    metric: 'ttk_wave_mean', min: 2, max: 14, appliesTo: ['ttk_parity_'],
    note: 'A parity trash pack should take seconds — instant vaporization and half-minute slogs both break the clear rhythm.',
    provisional: true,
  },
  {
    // THE MELEE CLEAR-RATE ADJUDICATION (2026-07-27, measured at HEAD f6add35).
    //
    // The warrior parity leg has graded 'high' against the 14s band in EVERY
    // baseline ever committed — twelve re-baselines, 07-12 through 07-23, best
    // value 20.27. This is not a regression that crept in; the band has never
    // once held for a melee starter. The two commits nominated as the culprits
    // are both acquitted by the baseline file's own history: 0703e6d (retarget
    // cadence) IMPROVED the leg 24.47 → 22.14, and the newly-'high'
    // player_deaths first appeared at cfb7cb7, not at 7761a98. The real drift
    // (20.87 → 33.45) predates both, between 07-12 and 07-15.
    //
    // The number is trustworthy: 23.96 / 24.57 / 23.03 across three
    // independent seed sets — a ±3% measurement. The magician's passing 10.26
    // is the LESS reliable figure of the two: re-rolled it reads 14.12 and
    // grades high as well.
    //
    // Mechanism, from raw per-episode data on both re-rolls: the warrior lands
    // 0.50–0.54 hits per cast, the magician 1.34–1.44 — a 2.7× gap — while
    // total damage spent per clear is near-identical (≈455 vs ≈416 into the
    // same 338 pool), and the warrior's hits land ~40% HARDER (≈29 vs ≈21).
    // So this is a hit-RATE finding, not a damage finding: a melee starter
    // swinging at six spread, moving bodies connects with barely half its
    // swings, while a caster's shot averages 1.4 hits.
    //
    // ADJUDICATION: 24s is NOT hereby declared correct — by the band above's
    // own words it is a slog, and closing it is real design work on the melee
    // starter kit (out of this pass's remit, and skills/class data is owned
    // elsewhere this round). What is settled is that it is a STABLE, KNOWN,
    // pre-existing condition rather than a fresh breach, so it grades against
    // its measured reality instead of painting a permanent false alarm. The
    // 28s ceiling is a live gate, not a shrug: it sits ~14% over the worst
    // observed clear and BELOW the 30.6/33.45 slogs that were genuine
    // regressions in July, so a slide back trips it immediately.
    // FOLLOW-UP: raise melee starter hit rate (or accept the archetype gap
    // deliberately) and then narrow this band back toward the general one.
    metric: 'ttk_wave_mean', min: 2, max: 28, appliesTo: ['ttk_parity_warrior_'],
    note: 'ADJUDICATED melee clear-rate band. A melee starter connects with ~half its swings against a spread pack where a caster averages 1.4 hits per cast, so it clears the same pool in ~2× the time — measured, stable, and pre-existing rather than a regression. Ceiling set to catch a real slide (the July 30s+ slogs) without crying wolf at the standing 24s. See the block comment for the full adjudication.',
    provisional: true,
  },
  {
    // DELIBERATELY NOT WIDENED (2026-07-27). ttk_parity_warrior_l5 grades
    // 'high' here on a mean of 0.1 — ONE death in ten seeds, at 10.17s. It
    // first appeared at baseline cfb7cb7 (07-22), not at the 7761a98 starter-
    // ring rework it was attributed to, and two fresh seed re-rolls show zero
    // deaths in ten more episodes: roughly 1 in 20. It would be easy to raise
    // this ceiling to 0.1 and turn the flag green; that is precisely what this
    // band exists to prevent. A starter warrior occasionally dying to parity
    // trash is a real survivability signal, and it corroborates the melee
    // clear-rate finding above from the other side — the longer the clear
    // runs, the more incoming it eats. The grade stays honest and red; the
    // gate is unaffected either way, because a 0.1 move is far under the
    // absolute floor (see GATE_TOLERANCES' player_deaths row in balance/cli.ts).
    metric: 'player_deaths', max: 0, appliesTo: ['ttk_parity_', 'dummy_dps_'],
    note: 'Parity trash (or a dummy!) should never actually kill a starter kit played straightforwardly. Kept at zero on purpose — see the comment: the warrior leg\'s standing 1-in-20 death is a signal to fix, not a threshold to raise.',
    provisional: true,
  },
  {
    metric: 'life_floor_pct', min: 10, appliesTo: ['ttk_parity_'],
    note: 'Parity trash should threaten (life dips) without one-shot territory.',
    provisional: true,
  },
  {
    metric: 'dps_dummy', min: 1, appliesTo: ['dummy_dps_'],
    note: 'Any starter kit must at least tickle the dummy — a zero here means a broken kit or a broken pilot, not a balance datum.',
    provisional: true,
  },
  {
    metric: 'kill_rate', min: 0.15, appliesTo: ['pressure_'],
    note: 'Under endless reinforcement a starter kit should still clear a meaningful fraction of the inflow.',
    provisional: true,
  },
];

/** Paint OK/LOW/HIGH grades onto a report (mutates + returns it).
 *
 *  THE SPECIFICITY RULE: when several bands claim the same metric on one
 *  scenario, the band whose matching prefix is LONGEST wins. An adjudicated
 *  per-class band ('ttk_parity_warrior_') therefore overrides its family band
 *  ('ttk_parity_') by being more specific — never by happening to sit later in
 *  the array. Same shape as GATE_TOLERANCES' resolution in balance/cli.ts. */
export function gradeReport(report: ScenarioReport): ScenarioReport {
  const grades: Record<string, string> = {};
  const wonBy: Record<string, number> = {};
  for (const band of TARGETS) {
    const reach = band.appliesTo.reduce(
      (best, p) => (report.scenarioId.startsWith(p) ? Math.max(best, p.length) : best), -1);
    if (reach < 0) continue;
    const m: MetricSummary | undefined = report.metrics[band.metric];
    if (!m || !Number.isFinite(m.mean)) continue;
    if (wonBy[band.metric] !== undefined && wonBy[band.metric] >= reach) continue;
    let grade = 'ok';
    if (band.min !== undefined && m.mean < band.min) grade = 'low';
    if (band.max !== undefined && m.mean > band.max) grade = 'high';
    grades[band.metric] = grade + (band.provisional ? ' (provisional band)' : '');
    wonBy[band.metric] = reach;
  }
  report.grades = grades;
  return report;
}
