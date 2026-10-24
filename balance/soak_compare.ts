// ---------------------------------------------------------------------------
// THE PAIR READ (docs/design/performance-lane.md §4): two or more soak reports
// side by side, the fields a concurrent control pair is judged on.
//
//   npx tsx balance/soak_compare.ts <control.json> <candidate.json> [more.json ...] [--phases] [--census]
//
// Prints the course line (bots, seconds, spread, seed), the tick percentiles,
// dropped share, the living radius, input service, heap, boot, the gates'
// verdict, and with --phases / --census the window's phase shares and the
// census means. Reads only what each report carries; a missing field prints
// as '-'. Never a verdict of its own: the numbers are the receipt.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

type Rep = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const get = (r: Rep, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object') ? (o as Rep)[k] : undefined, r);
const fmt = (v: unknown): string => v === undefined || v === null ? '-' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v);

export function compareReports(paths: string[], opts: { phases?: boolean; census?: boolean } = {}): string {
  const reps = paths.map(p => ({ name: basename(p, '.json'), r: JSON.parse(readFileSync(p, 'utf8')) as Rep }));
  const W = Math.max(14, ...reps.map(x => x.name.length + 2));
  const L = (s: unknown, n: number): string => String(s).padStart(n);
  const R = (s: unknown, n: number): string => String(s).padEnd(n);
  const out: string[] = [];
  const row = (label: string, path: string | ((r: Rep) => unknown)): void => {
    out.push(`  ${R(label, 34)} ${reps.map(x => L(fmt(typeof path === 'string' ? get(x.r, path) : path(x.r)), W)).join('')}`);
  };
  out.push(`  ${R('', 34)} ${reps.map(x => L(x.name, W)).join('')}`);
  row('course', r => `${get(r, 'soak.bots')}b/${get(r, 'soak.seconds')}s/sp${get(r, 'living.spreadPx') ?? 0}`);
  row('seed', 'soak.seed');
  row('window s', 'soak.windowSec');
  row('conditions', r => (get(r, 'conditions.note') as string | null)?.slice(0, W - 2) ?? '-');
  row('start delay ms', 'conditions.startDelayMs');
  row('boot s', 'host.bootSec');
  row('tick p50 ms', 'tick.p50');
  row('tick p95 ms', 'tick.p95');
  row('tick p99 ms', 'tick.p99');
  row('tick max ms', 'tick.max');
  row('ticks stepped', 'tick.count');
  row('dropped %', r => { const s = get(r, 'dropped.share'); return typeof s === 'number' ? s * 100 : undefined; });
  row('worst 5 s p95', 'tick.worstWindow.p95');
  row('living least', 'living.minOfMins');
  row('living mean', 'living.meanOfMeans');
  row('actors (mean of samples)', r => { const s = get(r, 'samples') as Rep[] | undefined; return s?.length ? s.reduce((a, x) => a + (x.actors ?? 0), 0) / s.length : undefined; });
  row('fed %', r => { const f = get(r, 'inputs.fed'); return typeof f === 'number' ? f * 100 : undefined; });
  row('input batches/seat/s', 'inputs.hostSeenHzPerSeat');
  row('stepped Hz', 'inputs.steppedHz');
  row('snapshot kB p95', r => { const b = get(r, 'snapshot.bytesP95'); return typeof b === 'number' ? b / 1000 : undefined; });
  row('heap growth MB', 'heap.growthMB');
  row('gc in ticks ms', 'gc.inTicksMs');
  row('machine busy %', 'performanceEvidence.machineBusyPercent');
  row('process cores', 'performanceEvidence.processCpuCores');
  row('deaths / rejoins', r => `${get(r, 'bots.deaths')}/${get(r, 'bots.rejoins')}`);
  row('resume', 'dormant.note');
  row('verdict', r => `${get(r, 'verdict')}${(get(r, 'breaches') as string[] | undefined)?.length ? ' (' + (get(r, 'breaches') as string[]).join(',') + ')' : ''}`);
  if (opts.phases) {
    out.push('', `  ${R('phase share % (p95 ms)', 34)} ${reps.map(x => L(x.name, W)).join('')}`);
    const names = new Set<string>();
    for (const x of reps) for (const n of Object.keys((get(x.r, 'phases') as Rep) ?? {})) if (!n.includes('/')) names.add(n);
    // Phase names carry dots (`inputs.apply`, `#ai.ran`): read the row by key, never by path.
    for (const n of [...names].sort()) row(n, r => { const p = (get(r, 'phases') as Rep | undefined)?.[n] as Rep | undefined; return p ? (n.startsWith('#') ? `${p.p50} (max ${p.max})` : `${(p.share * 100).toFixed(1)}% (${p.p95})`) : undefined; });
  }
  if (opts.census) {
    out.push('', `  ${R('census (mean of samples)', 34)} ${reps.map(x => L(x.name, W)).join('')}`);
    row('bodies', 'census.actors');
    const states = new Set<string>();
    for (const x of reps) for (const n of Object.keys((get(x.r, 'census.states') as Rep) ?? {})) states.add(n);
    for (const s of states) row(`  ${s}`, r => (get(r, 'census.states') as Rep | undefined)?.[s]);
    row('bands (all)', r => (get(r, 'census.bands') as number[] | undefined)?.map(n => Math.round(n)).join('/'));
    row('bands (idle)', r => (get(r, 'census.idleBands') as number[] | undefined)?.map(n => Math.round(n)).join('/'));
    row('edgeable mean / least', r => { const e = get(r, 'census.edgeable') as Rep | undefined; return e ? `${e.mean} / ${e.min}` : undefined; });
  }
  return out.join('\n');
}

const invokedDirectly = process.argv[1] && /soak_compare\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length < 1) { console.error('usage: npx tsx balance/soak_compare.ts <control.json> <candidate.json> [...] [--phases] [--census]'); process.exit(1); }
  console.log(compareReports(files, { phases: args.includes('--phases'), census: args.includes('--census') }));
}
