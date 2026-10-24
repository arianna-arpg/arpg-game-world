'use strict';
// THE RESIDENCY INSTRUMENT's launcher half (src/dev/perfResidency.ts; docs/design/desktop-residency.md): the flag parse
// that refuses malformed or contradictory new flags before the dev start, and the print of the fresh rows and the ramp
// steps as their own tables, RAW VALUES ONLY: no cap is applied, no verdict is rendered, nothing here gates. Pure (flags
// in, options or refusals out; a report in, lines out) so launcher/main.cjs stays a caller and
// scripts/test-launcher-residency.mjs can pin it.

const DEFAULT_RUN_SEED = 20261016;
const SEED_MAX = 0xffffffff;
const RAMP_MAX_STEPS = 200;

/**
 * Parse the residency flags. Returns `{ opts: null, errors: [] }` for the cumulative course (no residency flag at all),
 * `{ opts, errors: [] }` for a well-formed additive course, or `{ opts: null, errors }` naming every refusal.
 * @param {{ fresh: boolean, ramp: string | null, rampList: string | null, rampAge: boolean, runSeed: string | null, configSeed: unknown, filter: string }} f
 * @returns {{ opts: any, errors: string[] }}
 */
function parseResidencyFlags(f) {
  /** @type {string[]} */
  const errors = [];
  const anyRamp = f.ramp !== null || f.rampList !== null || f.rampAge;
  if (!f.fresh && !anyRamp) {
    if (f.runSeed !== null) errors.push('--run-seed without --fresh or --ramp');
    return { opts: null, errors };
  }
  if (f.fresh && anyRamp) errors.push('--fresh contradicts --ramp / --ramp-list / --ramp-age-control');
  if (f.rampList !== null && f.rampAge) errors.push('--ramp-list contradicts --ramp-age-control (the age control visits nothing)');
  if (anyRamp && f.filter && f.filter.trim() !== '') errors.push('--filter is undefined for the ramp: its visited order is --ramp-list');
  /** @type {any} */
  const opts = { course: f.fresh ? 'fresh' : 'ramp' };
  // THE MATCHED START's seed: the flag (decimal or 0x hex, nothing else), else the configured residency.seed (an integer;
  // zero honored), else the default. Never `||`: a zero is a seed.
  if (f.runSeed !== null) {
    if (/^\d{1,10}$/.test(f.runSeed)) opts.seed = Number(f.runSeed);
    else if (/^0[xX][0-9a-fA-F]{1,8}$/.test(f.runSeed)) opts.seed = parseInt(f.runSeed.slice(2), 16);
    else errors.push(`--run-seed must be a decimal or 0x hex integer (got ${JSON.stringify(f.runSeed)})`);
    if (opts.seed !== undefined && opts.seed > SEED_MAX) errors.push(`--run-seed must be at most ${SEED_MAX}`);
  } else if (f.configSeed !== undefined && f.configSeed !== null) {
    if (typeof f.configSeed === 'number' && Number.isInteger(f.configSeed) && f.configSeed >= 0 && f.configSeed <= SEED_MAX) opts.seed = f.configSeed;
    else errors.push(`perf.config.json residency.seed must be an integer in [0, ${SEED_MAX}] (got ${JSON.stringify(f.configSeed)})`);
  } else opts.seed = DEFAULT_RUN_SEED;
  if (f.ramp !== null && f.ramp !== '') {
    if (/^\d{1,4}$/.test(f.ramp)) opts.rampSteps = Number(f.ramp);
    else errors.push(`--ramp=<K> must be a positive integer (got ${JSON.stringify(f.ramp)})`);
  }
  if (f.rampList !== null) {
    const list = f.rampList.split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length) errors.push('--ramp-list names no tileset');
    else if (new Set(list).size !== list.length) errors.push('--ramp-list repeats a tileset');
    else opts.rampList = list;
  }
  if (opts.rampSteps !== undefined && (opts.rampSteps < 1 || opts.rampSteps > RAMP_MAX_STEPS)) errors.push(`--ramp must be in [1, ${RAMP_MAX_STEPS}]`);
  if (opts.rampList && opts.rampList.length + 1 > RAMP_MAX_STEPS) errors.push(`--ramp-list plus baseline exceeds ${RAMP_MAX_STEPS} steps`);
  if (opts.rampList && opts.rampSteps !== undefined && opts.rampSteps !== opts.rampList.length + 1) errors.push('--ramp disagrees with --ramp-list plus baseline');
  if (f.rampAge) opts.rampAgeControl = true;
  return errors.length ? { opts: null, errors } : { opts, errors };
}

/** @param {unknown} v @param {number} w */
const col = (v, w) => String(v === null || v === undefined ? '-' : v).padStart(w);
/** @param {any} z */
const zoneCols = (z) => `${col(z.gapP50, 6)} ${col(z.gapP95, 6)} ${col(z.gapP99, 6)} ${col(z.gapMax, 7)} ${col(z.hitch40, 3)} ${col(z.simP99, 6)} ${col(z.taskMax, 7)}`;
const ZONE_HEAD = ' gap50  gap95  gap99  gapMax h40  sim99  taskMx';
/** @param {any} m */
const mintText = (m) => `${m.seed === null ? 'seed rolled' : 'seed ' + m.seed}${m.variant ? ' variant ' + m.variant : ''}${m.layout ? ' layout ' + m.layout : ''}`;

/**
 * @param {any} report a PerfSweepReport carrying `course` ('fresh' | 'ramp') and its `fresh` rows or `ramp` steps
 * @param {any} wedge the deadman's verdict when the run was killed, else null
 * @returns {string[]}
 */
function residencyLines(report, wedge) {
  /** @type {string[]} */
  const lines = [];
  const saves = report.saves;
  lines.push(`RESIDENCY INSTRUMENT: course '${report.course}'${report.ramp && report.ramp.ageControl ? ' (age control: nothing visited)' : ''};` +
    ` start seed ${report.startSeed === null || report.startSeed === undefined ? '(rolled)' : report.startSeed};` +
    ` saves ${saves && saves.suppressed ? 'suppressed (' + saves.reason + ')' : 'NOT SUPPRESSED'};` +
    ' report-only: raw values, no cap applied, no verdict.');
  if (report.failure) lines.push(`FAILED: ${report.failure.name}: ${report.failure.message}; banked evidence is partial and not an accepted measurement.`);
  if (wedge) lines.push(`WEDGED: ${wedge.note}; the rows below are what the beats banked before the kill.`);
  if (Array.isArray(report.fresh)) {
    lines.push(`fresh rows (${report.fresh.length}): each row is its own run (ordinal, start, manifest seed); the regime is READ from the census after each held window, expected control 1 area / zone 2 areas, an UNMATCHED contrast recorded as such.`);
    lines.push(`tileset           run   start  heapC  heapZ  retSy mintSy |town${ZONE_HEAD} areas |zone${ZONE_HEAD} areas   entry  bodies  mint / zone`);
    for (const r of report.fresh) {
      lines.push(`${String(r.tileset).padEnd(16)} ${col(r.runtime.ordinal, 4)} ${col(r.runtime.startupMs, 6)} ${col((r.heapMB.afterControl ?? r.heapMB.afterStart), 6)} ${col(r.heapMB.afterZone, 6)} ${col(r.controlReturnSyncMs, 6)} ${col(r.mintSyncMs, 6)} |    ${zoneCols(r.control)} ${col(r.controlCensus.residentAreas, 5)} |    ${zoneCols(r.zone)} ${col(r.zoneCensus.residentAreas, 5)} ${col(r.zone.entryWorstGap, 7)} ${col(r.zoneCensus.residentActors, 7)}  ${mintText(r.mint)} / ${r.zone.zone}`);
      if (!r.expectedRegime) lines.push(`  ! ${r.tileset}: regime ${r.regime}`);
      if (r.zone.entryNote) lines.push(`  ^ ${r.tileset}: ${r.zone.entryNote}`);
      if (r.zone.ringWrap > 0 || r.control.ringWrap > 0) lines.push(`  ^ ${r.tileset}: RING WRAPPED (control ${r.control.ringWrap}, zone ${r.zone.ringWrap} oldest frames dropped)`);
    }
    if (report.fresh.length) lines.push(report.fresh[0].contrast);
  }
  if (report.ramp) {
    const rp = report.ramp;
    lines.push(`ramp steps (${rp.steps.length}${rp.ageControl ? ', age control' : ''}): the TOWN re-sampled after each visit while the residency grows; ages and completed history beside every step.`);
    lines.push(`step  visited           areas bodies  heapMB  wall(s) camp(s) mintSy  retSy |town${ZONE_HEAD} | visit entry  held  mint`);
    for (const s of rp.steps) {
      lines.push(`${col(s.step, 4)}  ${String(s.visited === null ? '(none)' : s.visited).padEnd(16)} ${col(s.residentAreas, 6)} ${col(s.residentActors, 6)} ${col(s.heapMB, 7)} ${col((s.wallMs / 1000).toFixed(1), 8)} ${col(s.campaignSec, 7)} ${col(s.mintSyncMs, 6)} ${col(s.returnSyncMs, 6)} |    ${s.town ? zoneCols(s.town) : 'window not held'.padStart(47)} | ${col(s.visitEntryWorstGap, 11)}  ${col(s.visitHeld === null ? '-' : s.visitHeld ? 'yes' : 'NO', 4)}  ${s.mint ? mintText(s.mint) : '-'}`);
      if (s.valid === false) lines.push(`  ! step ${s.step}: INVALID ${(s.issues || []).join('; ')}`);
      if (s.history && s.history.skipped.length) lines.push(`  ! step ${s.step}: skipped so far ${s.history.skipped.join(', ')}`);
    }
    for (const sl of rp.slopes) {
      lines.push(`slope ${String(sl.metric).padEnd(7)} ${sl.perArea === null ? '(no slope)' : sl.perArea + ' ms per resident area'}; ${sl.perHundredActors === null ? '(no slope)' : sl.perHundredActors + ' ms per hundred resident bodies'}; ${sl.points} steps held`);
    }
    lines.push(rp.slopesNote);
    if (rp.comparisonNote) lines.push(rp.comparisonNote);
  }
  if (Array.isArray(report.skipped) && report.skipped.length) {
    lines.push('skipped: ' + report.skipped.map((/** @type {any} */ s) => `${s.id} [${s.class}] ${s.note}`).join('; '));
  }
  return lines;
}

/** New flags only: preserve the entire suffix; legacy flagValue stays unchanged. */
/** @param {readonly string[]} argv @param {string} flag */
function residencyFlagValue(argv, flag) {
  const hit = argv.find(a => a === flag || a.startsWith(flag + '='));
  return hit === undefined ? null : hit === flag ? '' : hit.slice(flag.length + 1);
}
/** A failed course never becomes a successful measurement. Keep raw banked rows
 * and the original rejection details, including an ordinary later-start failure. */
/** @param {any} opts @param {any} banked @param {unknown} error */
function failedResidencyReport(opts, banked, error) {
  const failure = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack || null }
    : { name: typeof error, message: String(error), stack: null };
  return {
    status: 'failed-partial', validMeasurement: false, failure,
    runtime: 'retained-native', course: opts.course, startSeed: opts.seed ?? null,
    control: banked.control, controlEnd: banked.controlEnd, zones: banked.rows,
    skipped: banked.skipped, fresh: banked.fresh,
    residencyWindows: banked.residencyWindows,
    ramp: { steps: banked.ramp, ageControl: !!opts.rampAgeControl, list: opts.rampList ?? [], slopes: [], slopesNote: 'partial: course failed before the fold; no slope accepted', comparisonNote: null },
    canvas: { w: 0, h: 0 }, dpr: 0, sampleSeconds: opts.seconds, matrix: [],
    weather: opts.weather ?? '', ablate: opts.ablate ?? [],
  };
}
/** Write to a newly created directory: no timestamp collision can overwrite
 * earlier evidence. This helper does not swallow the original course error. */
/** @param {string} reportRoot @param {any} opts @param {any} banked @param {unknown} error @param {any} provenance */
function writeFailedResidencyReport(reportRoot, opts, banked, error, provenance) {
  const fs = require('node:fs'), path = require('node:path');
  fs.mkdirSync(reportRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(reportRoot, `perf_${opts.course}_failed_`));
  const report = failedResidencyReport(opts, banked, error);
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ ...provenance, opts, report }, null, 2), { flag: 'wx' });
  return dir;
}
module.exports = { residencyLines, parseResidencyFlags, residencyFlagValue, failedResidencyReport, writeFailedResidencyReport, DEFAULT_RUN_SEED };
