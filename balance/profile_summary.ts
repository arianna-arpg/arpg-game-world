// ---------------------------------------------------------------------------
// THE PROFILE SUMMARY (docs/design/performance-lane.md §4, "a --cpu-prof
// attribution"): one .cpuprofile (node --cpu-prof, or the soak's --profile
// window capture) read bottom-up and top-down without a browser.
//
//   npx tsx balance/profile_summary.ts <file.cpuprofile> [--top 40] [--watch a,b,c] [--json <out>]
//
// Prints: the sampled wall time; self time per function (bottom-up, the top
// N); INCLUSIVE time for a watch list of function names (each function's
// subtree, counted once per stack so recursion never double-counts: the
// engine's roots by default — updateAI, World.update, WorldMassRuntime.update,
// serializeSnapshot, the wire, GC); self time grouped by source file. Every
// number is sampled time with profiler overhead inside it: attribution, never
// a benchmark. The soak's own meter (server/phaseMeter.ts) is the benchmark.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

interface CallFrame { functionName: string; url: string; lineNumber: number; columnNumber: number }
interface ProfileNode { id: number; callFrame: CallFrame; hitCount?: number; children?: number[] }
interface CpuProfile { nodes: ProfileNode[]; startTime: number; endTime: number; samples: number[]; timeDeltas: number[] }

export const PROFILE_WATCH = [
  'updateAI', 'World.update', 'update', 'WorldMassRuntime.update', 'serializeSnapshot', 'sendStateTo', 'JSON.stringify',
  'applyInputs', 'settleNearScale', 'updateProjectiles', 'updateZones', 'separateActors', 'updateAuras', 'updateWatch',
  'moveToward', 'pathTo', 'findPath', 'acquireTarget', 'pickTarget', 'enemiesOf', 'actorsNear', 'resolveHit', 'useSkill',
  'castRay', 'losCached', 'regionAt', 'sample', 'terrainAt', 'serializeWorldState', 'drainInputs', 'tick', 'pump',
  '(garbage collector)', '(program)', '(idle)',
];

const r2 = (n: number): number => Math.round(n * 100) / 100;
const frameKey = (f: CallFrame): string => `${f.functionName || '(anonymous)'} ${shortUrl(f.url)}:${f.lineNumber + 1}`;
function shortUrl(url: string): string {
  if (!url) return '';
  const i = url.replace(/\\/g, '/').lastIndexOf('/');
  const file = i >= 0 ? url.slice(i + 1) : url;
  const dir = url.replace(/\\/g, '/').split('/').slice(-2, -1)[0];
  return dir ? `${dir}/${file}` : file;
}

export interface ProfileSummary {
  file: string;
  sampledMs: number;
  samples: number;
  self: { key: string; ms: number; share: number }[];
  inclusive: { name: string; ms: number; share: number; sites: number }[];
  files: { file: string; ms: number; share: number }[];
}

export function summarizeProfile(path: string, opts: { top?: number; watch?: string[] } = {}): ProfileSummary {
  const prof = JSON.parse(readFileSync(path, 'utf8')) as CpuProfile;
  const top = opts.top ?? 40;
  const watch = new Set(opts.watch ?? PROFILE_WATCH);
  const byId = new Map<number, ProfileNode>();
  for (const n of prof.nodes) byId.set(n.id, n);
  // Self time per node from the sample stream (hitCount alone ignores the deltas).
  const selfUs = new Map<number, number>();
  let totalUs = 0;
  for (let i = 0; i < prof.samples.length; i++) {
    const dt = prof.timeDeltas[i] ?? 0;
    if (dt <= 0) continue;
    totalUs += dt;
    selfUs.set(prof.samples[i], (selfUs.get(prof.samples[i]) ?? 0) + dt);
  }
  // Parents, for the top-down walk.
  const parent = new Map<number, number>();
  for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  // Bottom-up: self time by frame key, and by file.
  const selfByKey = new Map<string, number>();
  const selfByFile = new Map<string, number>();
  for (const [id, us] of selfUs) {
    const n = byId.get(id)!;
    const key = frameKey(n.callFrame);
    selfByKey.set(key, (selfByKey.get(key) ?? 0) + us);
    const file = n.callFrame.url ? shortUrl(n.callFrame.url) : n.callFrame.functionName || '(native)';
    selfByFile.set(file, (selfByFile.get(file) ?? 0) + us);
  }
  // Inclusive per watched NAME: a sample's time lands once on every distinct
  // watched name on its stack (a recursive frame counts once).
  const inclUs = new Map<string, number>();
  const inclSites = new Map<string, Set<string>>();
  for (const [id, us] of selfUs) {
    const seen = new Set<string>();
    let cur: number | undefined = id;
    while (cur !== undefined) {
      const n = byId.get(cur)!;
      const name = n.callFrame.functionName;
      if (watch.has(name) && !seen.has(name)) {
        seen.add(name);
        inclUs.set(name, (inclUs.get(name) ?? 0) + us);
        let sites = inclSites.get(name);
        if (!sites) inclSites.set(name, sites = new Set());
        sites.add(frameKey(n.callFrame));
      }
      cur = parent.get(cur);
    }
  }
  const share = (us: number): number => totalUs ? Math.round(us / totalUs * 1e4) / 1e4 : 0;
  return {
    file: basename(path),
    sampledMs: r2(totalUs / 1000), samples: prof.samples.length,
    self: [...selfByKey].sort((a, b) => b[1] - a[1]).slice(0, top).map(([key, us]) => ({ key, ms: r2(us / 1000), share: share(us) })),
    inclusive: [...inclUs].sort((a, b) => b[1] - a[1]).map(([name, us]) => ({ name, ms: r2(us / 1000), share: share(us), sites: inclSites.get(name)?.size ?? 0 })),
    files: [...selfByFile].sort((a, b) => b[1] - a[1]).slice(0, top).map(([file, us]) => ({ file, ms: r2(us / 1000), share: share(us) })),
  };
}

export function printProfileSummary(s: ProfileSummary): string {
  const L = (v: unknown, n: number): string => String(v).padStart(n);
  const R = (v: unknown, n: number): string => String(v).padEnd(n);
  const out: string[] = [];
  out.push(`${s.file}: ${s.sampledMs} ms sampled over ${s.samples} samples`);
  out.push('', `  ${R('INCLUSIVE (watched names; a stack counts once per name)', 70)} ${L('ms', 10)} ${L('share', 7)} ${L('sites', 5)}`);
  for (const r of s.inclusive) out.push(`  ${R(r.name, 70)} ${L(r.ms, 10)} ${L((r.share * 100).toFixed(1) + '%', 7)} ${L(r.sites, 5)}`);
  out.push('', `  ${R('SELF (bottom-up, top ' + s.self.length + ')', 70)} ${L('ms', 10)} ${L('share', 7)}`);
  for (const r of s.self) out.push(`  ${R(r.key.slice(0, 70), 70)} ${L(r.ms, 10)} ${L((r.share * 100).toFixed(1) + '%', 7)}`);
  out.push('', `  ${R('SELF BY FILE', 70)} ${L('ms', 10)} ${L('share', 7)}`);
  for (const r of s.files) out.push(`  ${R(r.file.slice(0, 70), 70)} ${L(r.ms, 10)} ${L((r.share * 100).toFixed(1) + '%', 7)}`);
  return out.join('\n');
}

function parseArgs(argv: string[]): { file?: string; top?: number; watch?: string[]; json?: string } {
  const out: { file?: string; top?: number; watch?: string[]; json?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--top') out.top = Number(argv[++i]);
    else if (a === '--watch') out.watch = [...PROFILE_WATCH, ...String(argv[++i]).split(',')];
    else if (a === '--json') out.json = argv[++i];
    else if (!a.startsWith('--')) out.file = a;
  }
  return out;
}

const invokedDirectly = process.argv[1] && /profile_summary\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) { console.error('usage: npx tsx balance/profile_summary.ts <file.cpuprofile> [--top N] [--watch a,b] [--json out.json]'); process.exit(1); }
  const s = summarizeProfile(args.file, { top: args.top, watch: args.watch });
  if (args.json) writeFileSync(args.json, JSON.stringify(s, null, 2));
  console.log(printProfileSummary(s));
}
