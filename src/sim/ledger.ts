// ---------------------------------------------------------------------------
// THE SUPPORT-MATRIX LEDGER — the skill × support no-op hunt as a UNIT TEST.
//
// A matrix run (compat.ts) produces VERDICTS; this module turns them into a
// regression gate. The committed ledger (balance/baselines/support_matrix.json)
// is the adjudicated defect set: every known INERT / COST_ONLY / PARTIAL pair
// and every known REFUSED-SUSPECT census row, each carrying a status —
//   'open'      known defect, unfixed (the backlog; presence is expected),
//   'intended'  adjudicated as deliberate (with a written note saying why).
// `matrix check` diffs a fresh run against the ledger: a defect NOT in the
// ledger is a NEW finding and fails the gate (exit 2) — the ratchet. A ledger
// row whose pair measures healthy is RESOLVED and is removed only by a
// deliberate `--reconcile` (the baseline-write analog), so fixes and their
// ledger recalibration land in the same commit.
//
// Coverage honesty is structural: a check only judges pairs it actually
// probed (budget/shard/filter slices judge their slice), 'partial' rows only
// verify when the deep (ablation) lane ran, and reconcile never touches rows
// outside the run's universe. Everything here is PURE and browser-safe —
// file IO stays in balance/cli.ts.
// ---------------------------------------------------------------------------

import { pairKey } from './compat';
import type {
  CensusResult, CensusRow, PairDeepResult, PairProbeResult, ProbeOpts,
} from './compat';

export { pairKey };

// ------------------------------------------------------------------ shapes --

export type DefectKind = 'inert' | 'cost_only' | 'partial';
export type LedgerStatus = 'open' | 'intended';

export const DEFECT_KINDS: readonly DefectKind[] = ['inert', 'cost_only', 'partial'];
export const LEDGER_STATUSES: readonly LedgerStatus[] = ['open', 'intended'];

/** One adjudicated defect pair. Evidence fields (probe/unread/units) are
 *  refreshed only when the KIND drifts — stable diffs beat fresh timestamps. */
export interface LedgerPairRow {
  skill: string;
  support: string;
  kind: DefectKind;
  status: LedgerStatus;
  /** Probe shape that measured it ('dummy' | 'live') — evidence context. */
  probe?: string;
  /** kind 'partial' only: the dead unit keys the deep lane found. */
  units?: string[];
  /** Static read-site keys quoted at creation (inert evidence). */
  unread?: string[];
  note?: string;
  /** YYYY-MM-DD the row first entered the ledger (CLI stamps it). */
  since?: string;
}

/** One adjudicated census suspect (refused, but mechanically affine). */
export interface LedgerSuspectRow {
  skill: string;
  support: string;
  status: LedgerStatus;
  /** The demanded tags whose mechanical evidence flagged it. */
  tags?: string[];
  note?: string;
  since?: string;
}

export interface SupportLedger {
  version: 1;
  note?: string;
  pairs: LedgerPairRow[];
  suspects: LedgerSuspectRow[];
}

export function emptyLedger(): SupportLedger {
  return { version: 1, pairs: [], suspects: [] };
}

// -------------------------------------------------------- observed defects --

/** What a run OBSERVED, distilled for the gate. */
export interface ObservedMatrix {
  /** Pairs actually probed this run (resumed pairs included — they carry
   *  verdicts from the same rig signature). */
  probed: PairProbeResult[];
  /** Deep (ablation) results, when that lane ran — partial detection only then. */
  deep?: PairDeepResult[];
  /** The run's census: suspects + the sliced universe. */
  census: CensusResult;
}

export interface ObservedDefect {
  skill: string;
  support: string;
  kind: DefectKind;
  probe: string;
  unread?: string[];
  units?: string[];
  /** One human line for autonotes and console listings. */
  detail: string;
}

/** Distill a run's defect set. INERT and COST_ONLY come from the pair probes;
 *  PARTIAL comes from the deep lane (an effective pair carrying dead,
 *  non-compositional payload units — "flagged as working, partly doesn't"). */
export function observedDefects(o: ObservedMatrix): ObservedDefect[] {
  const out: ObservedDefect[] = [];
  for (const p of o.probed) {
    if (p.verdict === 'inert') {
      out.push({
        skill: p.skillId, support: p.supportId, kind: 'inert', probe: p.probe,
        unread: p.unread?.map(u => u.key),
        detail: p.unread?.length
          ? `static: ${p.unread.map(u => `'${u.key}' read only at ${u.site}`).join('; ')}`
          : `no static explanation on file — run \`matrix explain ${p.skillId} ${p.supportId}\``,
      });
    } else if (p.verdict === 'cost_only') {
      out.push({
        skill: p.skillId, support: p.supportId, kind: 'cost_only', probe: p.probe,
        detail: `tax moved (${p.moved.map(m => m.key).join(', ') || '?'}) — no observed function`,
      });
    }
  }
  for (const d of o.deep ?? []) {
    if (d.pairVerdict !== 'effective') continue;
    const dead = d.units.filter(u => u.verdict === 'dead' && !u.unit.compositional);
    if (!dead.length) continue;
    out.push({
      skill: d.skillId, support: d.supportId, kind: 'partial', probe: d.probe,
      units: dead.map(u => u.unit.key),
      detail: `effective overall, but dead unit(s) on this host: ${dead.map(u => u.unit.key).join(', ')}`,
    });
  }
  return out;
}

// ------------------------------------------------------------------ check --

export interface LedgerCheck {
  /** Observed defects with NO ledger row — the gate breach list. */
  newDefects: ObservedDefect[];
  /** Ledger rows re-confirmed this run, by status. */
  knownOpen: LedgerPairRow[];
  knownIntended: LedgerPairRow[];
  /** Ledger rows whose defect KIND moved (still defective — reconcile hint). */
  driftedKind: { row: LedgerPairRow; now: ObservedDefect }[];
  /** Ledger rows probed this run and measuring healthy — reconcile removes. */
  resolved: LedgerPairRow[];
  /** Ledger rows inside the universe the run did NOT cover (budget/shard) —
   *  'partial' rows additionally require the deep lane to count as covered. */
  unverified: LedgerPairRow[];
  /** Ledger pair rows outside the run's skill×support universe (filters). */
  outOfScope: LedgerPairRow[];
  /** Census suspects with no ledger row — the second breach list. */
  newSuspects: CensusRow[];
  knownSuspects: LedgerSuspectRow[];
  /** Suspect rows no longer flagged by the census (inside universe). */
  resolvedSuspects: LedgerSuspectRow[];
  outOfScopeSuspects: LedgerSuspectRow[];
  breach: boolean;
}

interface Universe {
  skills: ReadonlySet<string>;
  supports: ReadonlySet<string>;
}

const universeOf = (census: CensusResult): Universe => ({
  skills: new Set(census.skills),
  supports: new Set(census.supports),
});

const inUniverse = (u: Universe, skill: string, support: string): boolean =>
  u.skills.has(skill) && u.supports.has(support);

/** Diff a run against the ledger. Pure; the CLI owns exit codes. */
export function checkLedger(ledger: SupportLedger, o: ObservedMatrix): LedgerCheck {
  const u = universeOf(o.census);
  const probedKeys = new Set(o.probed.map(p => pairKey(p.skillId, p.supportId)));
  const deepKeys = new Set((o.deep ?? []).map(d => pairKey(d.skillId, d.supportId)));
  const defects = new Map<string, ObservedDefect>();
  for (const d of observedDefects(o)) {
    const k = pairKey(d.skill, d.support);
    // A pair can carry at most one defect (inert/cost_only exclusive by
    // verdict; partial requires effective) — first wins defensively.
    if (!defects.has(k)) defects.set(k, d);
  }
  const ledgerKeys = new Set(ledger.pairs.map(r => pairKey(r.skill, r.support)));

  const check: LedgerCheck = {
    newDefects: [], knownOpen: [], knownIntended: [], driftedKind: [],
    resolved: [], unverified: [], outOfScope: [],
    newSuspects: [], knownSuspects: [], resolvedSuspects: [], outOfScopeSuspects: [],
    breach: false,
  };

  const fitByKey = new Map(o.census.rows.map(r => [pairKey(r.skillId, r.supportId), r.fit]));
  for (const row of ledger.pairs) {
    if (!inUniverse(u, row.skill, row.support)) { check.outOfScope.push(row); continue; }
    const k = pairKey(row.skill, row.support);
    // STRUCTURAL RESOLUTION: the census now refuses the pair — the
    // "make it REFUSE honestly" exit landed, so the defect row retires
    // without needing a probe (there is no socket left to be inert).
    if (fitByKey.get(k) === 'refused') { check.resolved.push(row); continue; }
    // Coverage: 'partial' claims are verifiable by the deep lane — or by a
    // PAIR-level defect (a pair that reads inert/cost_only outright has
    // provably left 'partial'; that is kind drift, not a coverage gap).
    const covered = row.kind === 'partial'
      ? (deepKeys.has(k) || (probedKeys.has(k) && defects.has(k)))
      : probedKeys.has(k);
    if (!covered) { check.unverified.push(row); continue; }
    const d = defects.get(k);
    if (!d) { check.resolved.push(row); continue; }
    if (d.kind !== row.kind) check.driftedKind.push({ row, now: d });
    if (row.status === 'intended') check.knownIntended.push(row);
    else check.knownOpen.push(row);
  }
  for (const d of defects.values()) {
    // A sliced check gates its slice: verdicts carried in from a broader
    // resume file stay out of THIS gate when filters exclude their ids.
    if (!inUniverse(u, d.skill, d.support)) continue;
    if (!ledgerKeys.has(pairKey(d.skill, d.support))) check.newDefects.push(d);
  }

  const observedSuspects = new Map<string, CensusRow>();
  for (const r of o.census.rows) {
    if (r.suspect) observedSuspects.set(pairKey(r.skillId, r.supportId), r);
  }
  const suspectLedgerKeys = new Set(ledger.suspects.map(r => pairKey(r.skill, r.support)));
  for (const row of ledger.suspects) {
    if (!inUniverse(u, row.skill, row.support)) { check.outOfScopeSuspects.push(row); continue; }
    if (observedSuspects.has(pairKey(row.skill, row.support))) check.knownSuspects.push(row);
    else check.resolvedSuspects.push(row);
  }
  for (const [k, r] of observedSuspects) {
    if (!suspectLedgerKeys.has(k)) check.newSuspects.push(r);
  }

  check.breach = check.newDefects.length > 0 || check.newSuspects.length > 0;
  return check;
}

// -------------------------------------------------------------- reconcile --

export interface ReconcileResult {
  ledger: SupportLedger;
  added: LedgerPairRow[];
  removed: LedgerPairRow[];
  /** Kind drift refreshed (status/note/since preserved). */
  updated: { before: LedgerPairRow; after: LedgerPairRow }[];
  addedSuspects: LedgerSuspectRow[];
  removedSuspects: LedgerSuspectRow[];
}

/** Rewrite the ledger from a run: add new defects as 'open' (autonoted),
 *  remove resolved rows, refresh drifted kinds — PRESERVING every surviving
 *  row's status/note/since, and never touching rows the run didn't cover
 *  (unverified and out-of-scope rows ride through verbatim). Pass the FULL
 *  live `registry` (the CLI does) to also retire rows whose ids left the
 *  content entirely — a filtered census can't tell "removed" from
 *  "filtered out", so only the registry may authorize that removal. */
export function reconcileLedger(
  ledger: SupportLedger, o: ObservedMatrix, today: string,
  registry?: { skills: ReadonlySet<string>; supports: ReadonlySet<string> },
): ReconcileResult {
  const check = checkLedger(ledger, o);
  const resolvedKeys = new Set(check.resolved.map(r => pairKey(r.skill, r.support)));
  const driftByKey = new Map(check.driftedKind.map(d => [pairKey(d.row.skill, d.row.support), d.now]));
  const idsGone = (skill: string, support: string): boolean =>
    !!registry && (!registry.skills.has(skill) || !registry.supports.has(support));

  const result: ReconcileResult = {
    ledger: { ...emptyLedger(), note: ledger.note },
    added: [], removed: [], updated: [],
    addedSuspects: [], removedSuspects: [],
  };

  for (const row of ledger.pairs) {
    const k = pairKey(row.skill, row.support);
    if (resolvedKeys.has(k) || idsGone(row.skill, row.support)) { result.removed.push(row); continue; }
    const drift = driftByKey.get(k);
    if (drift) {
      const after: LedgerPairRow = {
        ...row, kind: drift.kind, probe: drift.probe,
        units: drift.units, unread: drift.unread,
      };
      result.updated.push({ before: row, after });
      result.ledger.pairs.push(after);
    } else {
      result.ledger.pairs.push(row);
    }
  }
  for (const d of check.newDefects) {
    const row: LedgerPairRow = {
      skill: d.skill, support: d.support, kind: d.kind, status: 'open',
      probe: d.probe, units: d.units, unread: d.unread,
      note: d.detail, since: today,
    };
    result.added.push(row);
    result.ledger.pairs.push(row);
  }

  const resolvedSuspectKeys = new Set(check.resolvedSuspects.map(r => pairKey(r.skill, r.support)));
  for (const row of ledger.suspects) {
    if (resolvedSuspectKeys.has(pairKey(row.skill, row.support)) || idsGone(row.skill, row.support)) {
      result.removedSuspects.push(row);
    } else {
      result.ledger.suspects.push(row);
    }
  }
  for (const r of check.newSuspects) {
    const row: LedgerSuspectRow = {
      skill: r.skillId, support: r.supportId, status: 'open',
      tags: r.suspect?.map(s => s.tag),
      note: r.suspect?.map(s => `wants '${s.tag}', skill ${s.evidence}`).join('; '),
      since: today,
    };
    result.addedSuspects.push(row);
    result.ledger.suspects.push(row);
  }

  sortLedger(result.ledger);
  return result;
}

/** The committed-file serialization: valid JSON with ONE ROW PER LINE, so a
 *  several-thousand-row ledger diffs at pair granularity (and stays a third
 *  of the pretty-printed size). Sorts first — byte-stable for identical
 *  content. */
export function ledgerToJson(ledger: SupportLedger): string {
  sortLedger(ledger);
  const rows = (xs: readonly unknown[]): string =>
    xs.length ? `[\n${xs.map(r => `    ${JSON.stringify(r)}`).join(',\n')}\n  ]` : '[]';
  const note = ledger.note !== undefined ? `\n  "note": ${JSON.stringify(ledger.note)},` : '';
  return `{\n  "version": ${ledger.version},${note}\n  "pairs": ${rows(ledger.pairs)},\n  "suspects": ${rows(ledger.suspects)}\n}\n`;
}

/** Stable (support, skill) order — committed-file diffs stay reviewable. */
export function sortLedger(ledger: SupportLedger): SupportLedger {
  const bySupportSkill = (a: { skill: string; support: string }, b: { skill: string; support: string }): number =>
    a.support === b.support ? a.skill.localeCompare(b.skill) : a.support.localeCompare(b.support);
  ledger.pairs.sort(bySupportSkill);
  ledger.suspects.sort(bySupportSkill);
  return ledger;
}

// ------------------------------------------------------------ adjudication --

/** Re-status an existing row (pairs first, suspects second). Rows are minted
 *  by reconcile, never here — adjudication attaches a DECISION to an observed
 *  finding; a missing row means the finding isn't on file yet. */
export function adjudicate(
  ledger: SupportLedger,
  target: { skill: string; support: string },
  patch: { status: LedgerStatus; note?: string },
): { where: 'pairs' | 'suspects'; row: LedgerPairRow | LedgerSuspectRow } | { error: string } {
  if (patch.status === 'intended' && !patch.note?.trim()) {
    return { error: `status 'intended' requires --note (the written why is the adjudication)` };
  }
  const pair = ledger.pairs.find(r => r.skill === target.skill && r.support === target.support);
  if (pair) {
    pair.status = patch.status;
    if (patch.note !== undefined) pair.note = patch.note;
    return { where: 'pairs', row: pair };
  }
  const suspect = ledger.suspects.find(r => r.skill === target.skill && r.support === target.support);
  if (suspect) {
    suspect.status = patch.status;
    if (patch.note !== undefined) suspect.note = patch.note;
    return { where: 'suspects', row: suspect };
  }
  return {
    error: `no ledger row for '${target.skill}' + '${target.support}' — rows are minted by `
      + `'matrix check --reconcile' from an observed finding (nothing to adjudicate yet)`,
  };
}

// -------------------------------------------------------------- validation --

/** Structural + referential lint. Returns human lines; empty = clean. */
export function validateLedger(
  ledger: SupportLedger,
  known: { skills: ReadonlySet<string>; supports: ReadonlySet<string> },
): string[] {
  const issues: string[] = [];
  if (ledger.version !== 1) issues.push(`unknown ledger version ${String(ledger.version)}`);
  const seen = new Set<string>();
  for (const row of ledger.pairs) {
    const k = pairKey(row.skill, row.support);
    if (seen.has(k)) issues.push(`duplicate pair row ${row.skill} + ${row.support}`);
    seen.add(k);
    if (!DEFECT_KINDS.includes(row.kind)) issues.push(`${k}: unknown kind '${String(row.kind)}'`);
    if (!LEDGER_STATUSES.includes(row.status)) issues.push(`${k}: unknown status '${String(row.status)}'`);
    if (!known.skills.has(row.skill)) issues.push(`${k}: skill '${row.skill}' not in the registry (removed content? reconcile)`);
    if (!known.supports.has(row.support)) issues.push(`${k}: support '${row.support}' not in the registry (removed content? reconcile)`);
  }
  const seenSus = new Set<string>();
  for (const row of ledger.suspects) {
    const k = pairKey(row.skill, row.support);
    if (seenSus.has(k)) issues.push(`duplicate suspect row ${row.skill} + ${row.support}`);
    seenSus.add(k);
    if (!LEDGER_STATUSES.includes(row.status)) issues.push(`suspect ${k}: unknown status '${String(row.status)}'`);
    if (!known.skills.has(row.skill)) issues.push(`suspect ${k}: skill '${row.skill}' not in the registry`);
    if (!known.supports.has(row.support)) issues.push(`suspect ${k}: support '${row.support}' not in the registry`);
  }
  return issues;
}

// ------------------------------------------------- shard-run merge helpers --

/** The knobs that make two probe runs COMPARABLE — resume and merge refuse
 *  to mix runs whose signatures differ (their verdicts answer different
 *  questions). Kept to the fields that change episode content. */
export interface RigSignature {
  level: number | undefined;
  gemLevel: number | undefined;
  supportLevel: number | undefined;
  duration: number | undefined;
  seeds: number | undefined;
  baseSeed: number | undefined;
}

export function rigSignatureOf(opts: ProbeOpts): RigSignature {
  return {
    level: opts.level, gemLevel: opts.gemLevel, supportLevel: opts.supportLevel,
    duration: opts.duration, seeds: opts.seeds, baseSeed: opts.baseSeed,
  };
}

/** Mismatched field names between two signatures; empty = compatible. */
export function rigMismatches(a: RigSignature, b: RigSignature): (keyof RigSignature)[] {
  return (Object.keys(a) as (keyof RigSignature)[]).filter(k => a[k] !== b[k]);
}

export interface MergeConflict { skill: string; support: string; verdicts: string[] }

/** Union probed batches (shards, resumed halves). First occurrence wins;
 *  disagreeing verdicts for the same pair are recorded as conflicts —
 *  under one rig signature the engine is deterministic, so a conflict
 *  means mixed code or mixed rigs, and the report must say so. */
export function mergeProbed(batches: PairProbeResult[][]): {
  probed: PairProbeResult[]; conflicts: MergeConflict[]; dupes: number;
} {
  const byKey = new Map<string, PairProbeResult>();
  const conflicts: MergeConflict[] = [];
  let dupes = 0;
  for (const batch of batches) {
    for (const p of batch) {
      const k = pairKey(p.skillId, p.supportId);
      const prior = byKey.get(k);
      if (!prior) { byKey.set(k, p); continue; }
      dupes++;
      if (prior.verdict !== p.verdict) {
        conflicts.push({ skill: p.skillId, support: p.supportId, verdicts: [prior.verdict, p.verdict] });
      }
    }
  }
  return { probed: [...byKey.values()], conflicts, dupes };
}
