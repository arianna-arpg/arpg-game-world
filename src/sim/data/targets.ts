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
// as every other registry in the game.
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
    metric: 'player_deaths', max: 0, appliesTo: ['ttk_parity_', 'dummy_dps_'],
    note: 'Parity trash (or a dummy!) should never actually kill a starter kit played straightforwardly.',
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

/** Paint OK/LOW/HIGH grades onto a report (mutates + returns it). */
export function gradeReport(report: ScenarioReport): ScenarioReport {
  const grades: Record<string, string> = {};
  for (const band of TARGETS) {
    if (!band.appliesTo.some(p => report.scenarioId.startsWith(p))) continue;
    const m: MetricSummary | undefined = report.metrics[band.metric];
    if (!m || !Number.isFinite(m.mean)) continue;
    let grade = 'ok';
    if (band.min !== undefined && m.mean < band.min) grade = 'low';
    if (band.max !== undefined && m.mean > band.max) grade = 'high';
    grades[band.metric] = grade + (band.provisional ? ' (provisional band)' : '');
  }
  report.grades = grades;
  return report;
}
