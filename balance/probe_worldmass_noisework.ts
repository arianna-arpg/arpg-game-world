/** Noise closure work: independent 448c07fc body, exact hash/lattice tapes,
 * signed coordinate/error parity, and optional isolated --bench measurements.
 * Production-style measurements bundle/minify both variants and dependencies
 * in memory; they are Node V8 evidence, not an actual browser frame benchmark. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';
import { latticeAt, type MassAddress } from '../src/worldmass/address';
import { massHash } from '../src/worldmass/random';
import { massNoise } from '../src/worldmass/noise';

// Exact pre-change body from 448c07fc. Do not copy optimizations into the oracle.
function archivedNoise(at: MassAddress, span: number, period: number, salt: number, periodY = period): number {
  const x = latticeAt(at, span, period);
  const y = periodY === period ? x : latticeAt(at, span, periodY);
  const sample = (gx: bigint, gy: bigint): number =>
    massHash(JSON.stringify([at.dimension, gx.toString(), gy.toString()]), salt) / 0x100000000;
  const a = sample(x.gx, y.gy), b = sample(x.gx + 1n, y.gy);
  const c = sample(x.gx, y.gy + 1n), d = sample(x.gx + 1n, y.gy + 1n);
  const sx = x.fx * x.fx * (3 - 2 * x.fx), sy = y.fy * y.fy * (3 - 2 * y.fy);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

type Noise = typeof massNoise;
type Query = [MassAddress, number, number, number, number?];
const file = fileURLToPath(import.meta.url), noisePath = fileURLToPath(new URL('../src/worldmass/noise.ts', import.meta.url));
const selfText = readFileSync(file, 'utf8'), tree = ts.createSourceFile(file, selfText, ts.ScriptTarget.Latest, true);
const oracleNode = tree.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'archivedNoise') as ts.FunctionDeclaration;
const oracleHash = createHash('sha256').update(oracleNode.body!.getText(tree).replace(/\r/g, '')).digest('hex');
assert.equal(oracleHash, '5e84eeee8ebd625e0c5928597f5c671e0b1b4860f903e5ab258555fbd9d8e947');
const oracleModule = "import { latticeAt, type MassAddress } from './address';\nimport { massHash } from './random';\n" +
  oracleNode.getText(tree).replace('function archivedNoise', 'export function massNoise');
const currentModule = readFileSync(noisePath, 'utf8');
type Tape = { lattices: [number, number][]; hashes: [string, number][] };
function traced(source: string, tape: Tape): Noise {
  const code = source.replace(/^import .*;\r?$/gm, '').replace('export function massNoise', 'function massNoise');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return new Function('latticeAt', 'massHash', js + '\nreturn massNoise;')(
    (at: MassAddress, span: number, period: number) => { tape.lattices.push([span, period]); return latticeAt(at, span, period); },
    (text: string, salt: number) => { tape.hashes.push([text, salt]); return massHash(text, salt); },
  ) as Noise;
}
const oldTape: Tape = { lattices: [], hashes: [] }, currentTape: Tape = { lattices: [], hashes: [] };
const oldTrace = traced(oracleModule, oldTape), currentTrace = traced(currentModule, currentTape);
function clearTapes(): void {
  oldTape.lattices.length = oldTape.hashes.length = currentTape.lattices.length = currentTape.hashes.length = 0;
}
function outcome(fn: Noise, q: Query): { value: number } | { error: string; message: string } {
  try { return { value: fn(...q) }; }
  catch (e) { assert.ok(e instanceof Error); return { error: e.name, message: e.message }; }
}
let comparisons = 0;
function check(q: Query): void {
  clearTapes();
  const before = outcome(oldTrace, q), after = outcome(currentTrace, q);
  assert.deepEqual(after, before, 'numeric/error parity');
  if ('value' in before && 'value' in after) {
    assert.ok(Object.is(after.value, before.value), 'preserve every floating-point bit');
    assert.ok(Object.is(massNoise(...q), archivedNoise(...q)), 'actual tsx exports match the preserved body');
    assert.equal(oldTape.hashes.length, 4);
  }
  assert.deepEqual(currentTape, oldTape, 'same exact corner hash bytes, salt and call order');
  comparisons++;
}
const point = (cx: string, cy: string, x = 0, y = 0, dimension = 'surface'): MassAddress => ({ dimension, cx, cy, x, y });
const cells = ['-9223372036854775808', '-9007199254740993', '-1', '0', '1', '9007199254740993', '9223372036854775807'];
const periods = [1, 30, 379, 960, 7501, 18000, Number.MAX_SAFE_INTEGER];
for (let i = 0; i < cells.length; i++) for (const span of [1, 960, Number.MAX_SAFE_INTEGER]) for (const period of periods) {
  for (const [x, y] of [[0, -0], [-.5, .5], [959.999999, -959.999999], [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]]) {
    const at = point(cells[i], cells[cells.length - 1 - i], x, y, i % 2 ? 'cavern' : 'quote"\\\n\u0000🌌');
    for (const py of [undefined, period, periods[(i + 3) % periods.length]])
      check([at, span, period, i % 2 ? 0xffffffff : -1, py]);
  }
}
for (const salt of [0, -0, 1, -1, 0xffffffff, Number.MAX_SAFE_INTEGER, .5, NaN, Infinity])
  check([point('-1', '0', 960 - 1e-7, 120.25), 960, 370, salt, 540]);
let randomState = 0x7ad03c;
const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 0x100000000);
const fixed: Query[] = [];
for (let i = 0; i < 768; i++) {
  const cx = (BigInt(Math.floor(random() * 0x100000000)) * 1000000000n - 2147483648000000000n).toString();
  const cy = (BigInt(Math.floor(random() * 0x100000000)) * 1000000000n - 2147483648000000000n).toString();
  const q: Query = [point(cx, cy, (random() - .5) * 1920, (random() - .5) * 1920), 960,
    periods[i % periods.length], Math.floor(random() * 0x100000000), i % 3 ? undefined : periods[(i + 2) % periods.length]];
  check(q); fixed.push(q);
}
for (const q of [
  [point('01', '0'), 960, 30, 0], [point('-0', '0'), 960, 30, 0],
  [point('9223372036854775808', '0'), 960, 30, 0], [point('-9223372036854775809', '0'), 960, 30, 0],
  [point('0', '0', NaN, 0), 960, 30, 0], [point('0', '0', 0, Infinity), 960, 30, 0],
  [point('0', '0', Number.MAX_SAFE_INTEGER * 2, 0), 960, 30, 0],
  [point('0', '0'), 0, 30, 0], [point('0', '0'), 960, .5, 0],
  [point('0', '0'), 960, 30, 0, 0], [point('0', '0'), 960, Infinity, 0],
] as Query[]) check(q);

for (const throws of [false, true]) {
  const run = (fn: Noise, tape: Tape) => {
    clearTapes(); const reads: string[] = []; let dimensions = 0;
    const at = {} as MassAddress;
    for (const [key, value] of Object.entries(point('-2', '3', 100.25, -45.75))) {
      Object.defineProperty(at, key, { get: () => {
        reads.push(key);
        if (key !== 'dimension') return value;
        if (throws && dimensions === 2) throw Error('controlled third-corner getter');
        return 'dimension/' + dimensions++;
      } });
    }
    const result = outcome(fn, [at, 960, 370, 123, 540]);
    return { result, reads, tape: { lattices: [...tape.lattices], hashes: [...tape.hashes] } };
  };
  const before = run(oldTrace, oldTape), after = run(currentTrace, currentTape);
  assert.deepEqual(after, before, 'preserve mutable dimension getter reads and partial failure order'); comparisons++;
}
console.log('PASS noise oracle: ' + comparisons + ' exact float/error/hash/lattice/getter comparisons; SHA256 ' + oracleHash);

async function productionBundle(): Promise<{ archived: Noise; current: Noise; bytes: number }> {
  const result = await build({
    stdin: { contents: "export { massNoise as archived } from 'noise-work-oracle'; export { massNoise as current } from 'noise-work-current';",
      sourcefile: 'noise-work-entry.ts', loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
    keepNames: false, logLevel: 'silent', tsconfigRaw: {},
    plugins: [{ name: 'preserved-noise-oracle', setup(b) {
      // Feed the unchanged local dependency files directly to the in-memory
      // build, avoiding filesystem/config discovery outside this checkout.
      b.onResolve({ filter: /^noise-work-(oracle|current)$/ }, args =>
        ({ path: args.path.endsWith('oracle') ? 'oracle' : noisePath, namespace: 'noise-work' }));
      b.onResolve({ filter: /^\./, namespace: 'noise-work' }, args => ({
        path: resolve(dirname(args.importer === 'oracle' ? noisePath : args.importer), args.path) + '.ts', namespace: 'noise-work',
      }));
      b.onLoad({ filter: /.*/, namespace: 'noise-work' }, args =>
        ({ contents: args.path === 'oracle' ? oracleModule : readFileSync(args.path, 'utf8'), loader: 'ts' }));
    } }],
  });
  const text = result.outputFiles[0].text;
  const module = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64')) as { archived: Noise; current: Noise };
  return { ...module, bytes: Buffer.byteLength(text) };
}
const bundled = await productionBundle();
for (const q of fixed) {
  assert.ok(Object.is(bundled.archived(...q), archivedNoise(...q)));
  assert.ok(Object.is(bundled.current(...q), archivedNoise(...q))); comparisons += 2;
}
console.log('PASS minified production-style bundle: ' + fixed.length * 2 + ' exact comparisons, ' + bundled.bytes + ' bytes');

if (process.argv.includes('--bench')) {
  const nativePeriods = [18000, 2600, 370, 8200, 1700, 12800, 2100, 540, 7000];
  const nearby: Query[] = Array.from({ length: 2048 }, (_, i) => [point(
    String(i % 32 - 16), String((i >> 5) % 16 - 8), (i * 151 % 960) + .25, (i * 227 % 960) + .5),
    960, nativePeriods[i % nativePeriods.length], Math.imul(i + 17, 2654435761) >>> 0,
    i % 3 ? undefined : nativePeriods[(i + 4) % nativePeriods.length]]);
  const distant: Query[] = Array.from({ length: 6144 }, (_, i) => [point(
    (9007199254740993n + BigInt(i) * 1000003n).toString(),
    (-9007199254740993n - BigInt(i) * 1000033n).toString(), (i * 151 % 960) + .25, (i * 227 % 960) + .5),
    960, nativePeriods[i % nativePeriods.length], Math.imul(i + 17, 2654435761) >>> 0,
    i % 3 ? undefined : nativePeriods[(i + 4) % nativePeriods.length]]);
  const workloads = [{ name: 'nearby-reused-cells', queries: nearby }, { name: 'distant-cache-churn', queries: distant }];
  const modes = [{ name: 'actual-tsx', archived: archivedNoise, current: massNoise }, { name: 'minified-bundle', ...bundled }];
  const count = 131072, rows: { mode: string; workload: string; round: number; variant: string; count: number; ms: number; checksum: number }[] = [];
  // Fixed work, identical query order, alternating variants. Checksums are kept
  // outside assertions until timed loops finish; no timing pass/fail threshold.
  for (const mode of modes) for (const workload of workloads) {
    for (const fn of [mode.archived, mode.current]) for (let i = 0; i < 8192; i++) fn(...workload.queries[i % workload.queries.length]);
    for (let round = 0; round < 4; round++) for (const variant of round % 2 ? ['current', 'archived'] as const : ['archived', 'current'] as const) {
      const fn = mode[variant], start = performance.now(); let checksum = 0;
      for (let i = 0; i < count; i++) checksum += fn(...workload.queries[i % workload.queries.length]);
      rows.push({ mode: mode.name, workload: workload.name, round, variant, count, ms: performance.now() - start, checksum });
    }
  }
  for (const mode of modes) for (const workload of workloads) {
    const group = rows.filter(row => row.mode === mode.name && row.workload === workload.name);
    assert.equal(new Set(group.map(row => row.checksum)).size, 1);
  }
  console.log('Noise fixed-work timing ' + JSON.stringify(rows));
}
console.log('PASS worldmass_noisework: ' + comparisons + ' comparisons; no timing gates');
