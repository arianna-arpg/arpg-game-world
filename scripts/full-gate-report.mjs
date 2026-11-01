// ---------------------------------------------------------------------------
// THE FULL GATE'S REPORT: the lanes' verdicts, merged into one readable page.
//
// Probe and UI shards each write a JSON report (balance/runprobes.ts --json,
// scripts/run-ui-lane.mjs --json). This merges them with the lanes' job results
// into a Markdown page for the run summary and the rolling red issue
// (scripts/full-gate-clock.mjs). It reports; it never decides. The verdict is
// the full-gate job's alone.
//
//   node scripts/full-gate-report.mjs --dir lanes --out report.md
//     --needs "$NEEDS_JSON" --run-url <url> --sha <sha>
// ---------------------------------------------------------------------------

import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_LINES_PER_FAILURE = 10;
const SLOWEST_SHOWN = 8;

export function collectLaneFiles(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...collectLaneFiles(full));
    else if (entry.endsWith('.json')) found.push(full);
  }
  return found.sort();
}

export function summarize(reports) {
  const rows = reports.flatMap(report => (report.results ?? []).map(row => ({ ...row, lane: report.lane })));
  const byVerdict = verdict => rows.filter(row => row.verdict === verdict);
  const walls = {};
  for (const report of reports) (walls[report.lane] ??= []).push(report.wallSec ?? 0);
  return {
    total: rows.length,
    gating: rows.filter(row => row.gates).length,
    failed: byVerdict('fail'),
    flaky: byVerdict('flaky'),
    healed: [...byVerdict('healed'), ...byVerdict('excluded-pass')],
    known: byVerdict('known'),
    slowest: [...rows].sort((a, b) => b.sec - a.sec).slice(0, SLOWEST_SHOWN),
    walls,
  };
}

const rowsOf = (summary, verdict) => summary[verdict].map(row => `\`${row.name}\``).join(', ');

export function renderMarkdown(summary, { needs = {}, runUrl = '', sha = '' } = {}) {
  const lines = [];
  const laneResults = Object.entries(needs).map(([lane, value]) => [lane, value?.result ?? 'unknown']);
  const red = laneResults.filter(([, result]) => result !== 'success');
  lines.push(`## Full gate ${red.length || summary.failed.length ? 'RED' : 'green'}${sha ? ` at \`${sha.slice(0, 9)}\`` : ''}`);
  if (runUrl) lines.push('', `Run: ${runUrl}`);
  if (laneResults.length) {
    lines.push('', '| Lane | Result |', '|---|---|');
    for (const [lane, result] of laneResults) lines.push(`| ${lane} | ${result} |`);
  }
  lines.push('', `${summary.total} checks ran, ${summary.gating} of them gating.`);

  if (summary.failed.length) {
    lines.push('', `### Failed (${summary.failed.length})`);
    for (const row of summary.failed) {
      lines.push('', `**${row.name}**${row.timedOut ? ' (timed out)' : ''}`, '```');
      lines.push(...(row.failLines ?? []).slice(0, MAX_LINES_PER_FAILURE));
      lines.push('```');
    }
  }
  if (summary.flaky.length) lines.push('', `### Flaky, passed on a re-run (${summary.flaky.length})`, rowsOf(summary, 'flaky'));
  if (summary.healed.length) lines.push('', `### Excluded rows that passed this run (${summary.healed.length})`, rowsOf(summary, 'healed'));
  if (summary.known.length) lines.push('', `### Known failures, not gating (${summary.known.length})`, rowsOf(summary, 'known'));
  if (summary.slowest.length) {
    lines.push('', '### Slowest', ...summary.slowest.map(row => `- ${row.sec}s \`${row.name}\``));
  }
  const walls = Object.entries(summary.walls).map(([lane, values]) => `${lane}: ${Math.max(...values)}s longest of ${values.length} shard(s)`);
  if (walls.length) lines.push('', walls.join('. ') + '.');
  return lines.join('\n') + '\n';
}

function main() {
  const flag = name => {
    const at = process.argv.indexOf(`--${name}`);
    return at >= 0 ? process.argv[at + 1] : undefined;
  };
  const reports = collectLaneFiles(flag('dir') ?? 'lanes').map(file => JSON.parse(readFileSync(file, 'utf8')));
  const needs = flag('needs') ? JSON.parse(flag('needs')) : {};
  const markdown = renderMarkdown(summarize(reports), { needs, runUrl: flag('run-url'), sha: flag('sha') });
  writeFileSync(flag('out') ?? 'report.md', markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
