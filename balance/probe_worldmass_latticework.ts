/** Exact lattice closure work, with a preserved a6f62a2d function body.
 * --bench compares actual tsx and minified in-memory browser-targeted bundles
 * under Node V8. These fixed-work timings are not browser-frame claims or gates. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';
import { cellInteger, floorDiv, latticeAt, validSpan, type MassAddress } from '../src/worldmass/address';

// Preserved whole lattice function from a6f62a2d, before explicit axis evaluation.
// The unchanged validation/cell-cache/integer-division dependencies are shared.
function archivedLattice(at: MassAddress, span: number, period: number): { gx: bigint; gy: bigint; fx: number; fy: number } {
  validSpan(span); validSpan(period);
  const p = BigInt(period);
  const one = (c: string, off: number): [bigint, number] => {
    if (!Number.isFinite(off)) throw new RangeError('Invalid lattice offset');
    const whole = Math.floor(off), fractional = off - whole;
    if (!Number.isSafeInteger(whole)) throw new RangeError('Imprecise lattice offset');
    const n = cellInteger(c) * BigInt(span) + BigInt(whole), g = floorDiv(n, p);
    return [g, (Number(n - g * p) + fractional) / period];
  };
  const [gx, fx] = one(at.cx, at.x), [gy, fy] = one(at.cy, at.y);
  return { gx, gy, fx, fy };
}

type Lattice = typeof latticeAt;
type Query = [MassAddress, number, number];
type Result = ReturnType<Lattice>;
type Outcome = { value: Result } | { error: string; message: string };
const file = fileURLToPath(import.meta.url);
const addressPath = fileURLToPath(new URL('../src/worldmass/address.ts', import.meta.url));
const selfTree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const archivedNode = selfTree.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'archivedLattice') as ts.FunctionDeclaration;
const oracleHash = createHash('sha256').update(archivedNode.body!.getText(selfTree).replace(/\r/g, '')).digest('hex');
assert.equal(oracleHash, '016c04500a04442b3fd5d95ca5e68f2afd24cde368be51722e47455e0a1dd809');
const archivedCode = archivedNode.getText(selfTree).replace('function archivedLattice', 'function latticeAt');
const currentModule = readFileSync(addressPath, 'utf8');
const addressTree = ts.createSourceFile(addressPath, currentModule, ts.ScriptTarget.Latest, true);
const currentCode = addressTree.statements.filter(s => ts.isFunctionDeclaration(s) &&
  s.name?.text === 'latticeAt').map(s => s.getText(addressTree)).join('\n').replace('export function', 'function');
type Tape = unknown[][];
function traced(code: string, tape: Tape): Lattice {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return new Function('validSpan', 'cellInteger', 'floorDiv', js + '\nreturn latticeAt;')(
    (span: number) => { tape.push(['validSpan', span]); return validSpan(span); },
    (cell: string) => { tape.push(['cellInteger', cell]); return cellInteger(cell); },
    (n: bigint, p: bigint) => { tape.push(['floorDiv', n, p]); return floorDiv(n, p); },
  ) as Lattice;
}
const beforeTape: Tape = [], afterTape: Tape = [];
const beforeTrace = traced(archivedCode, beforeTape), afterTrace = traced(currentCode, afterTape);
function outcome(fn: Lattice, q: Query): Outcome {
  try { return { value: fn(...q) }; }
  catch (e) { assert.ok(e instanceof Error); return { error: e.name, message: e.message }; }
}
let comparisons = 0;
function equalOutcomes(after: Outcome, before: Outcome, label: string): void {
  assert.deepEqual(after, before, label);
  if ('value' in after && 'value' in before) {
    assert.ok(Object.is(after.value.fx, before.value.fx) && Object.is(after.value.fy, before.value.fy), 'exact fractional bits, including signed zero');
    assert.deepEqual(Object.keys(after.value), ['gx', 'gy', 'fx', 'fy'], 'original public result field order');
  }
  comparisons++;
}
function check(q: Query): void {
  beforeTape.length = afterTape.length = 0;
  equalOutcomes(outcome(afterTrace, q), outcome(beforeTrace, q), 'traced value/error parity');
  assert.deepEqual(afterTape, beforeTape, 'validation, integer lookup and division call order');
  equalOutcomes(outcome(latticeAt, q), outcome(archivedLattice, q), 'actual exports match archived lattice');
}
const point = (cx: string, cy: string, x = 0, y = 0): MassAddress => ({ dimension: 'surface', cx, cy, x, y });
const cells = ['-9223372036854775808', '-9007199254740993', '-1', '0', '1', '9007199254740993', '9223372036854775807'];
const periods = [1, 30, 379, 960, 7501, 18000, Number.MAX_SAFE_INTEGER];
const fixed: Query[] = [];
for (let i = 0; i < cells.length; i++) for (const span of [1, 960, Number.MAX_SAFE_INTEGER]) for (const period of periods) {
  for (const [x, y] of [[0, -0], [-Number.MIN_VALUE, Number.MIN_VALUE], [-.5, .5],
    [-960, 960], [959.9999999999999, -959.9999999999999], [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]]) {
    const q: Query = [point(cells[i], cells[cells.length - 1 - i], x, y), span, period];
    check(q); fixed.push(q);
  }
}
let state = 0xd13ba93;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x100000000);
for (let i = 0; i < 768; i++) {
  const q: Query = [point(
    (BigInt(Math.floor(random() * 0x100000000)) * 1000000000n - 2147483648000000000n).toString(),
    (BigInt(Math.floor(random() * 0x100000000)) * 1000000000n - 2147483648000000000n).toString(),
    (random() - .5) * 4000, (random() - .5) * 4000), 960, periods[i % periods.length]];
  check(q); fixed.push(q);
}
for (const badSpan of [0, -0, -1, .5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])
  for (const badPeriod of [30, 0, -.5, NaN, Infinity]) check([point('bad', 'bad', NaN, Infinity), badSpan, badPeriod]);
for (const badPeriod of [0, -0, -1, .5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])
  check([point('0', '0'), 960, badPeriod]);
for (const cell of ['01', '-0', '+1', ' 1', '1.0', '1e2', '', '9223372036854775808', '-9223372036854775809', '123456789012345678901']) {
  check([point(cell, '0'), 960, 30]); check([point('0', cell), 960, 30]);
  check([point(cell, 'bad', NaN, 0), 960, 30]);
}
for (const offset of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, -Number.MAX_SAFE_INTEGER - 1]) {
  check([point('0', '0', offset, 0), 960, 30]); check([point('0', '0', 0, offset), 960, 30]);
}
for (const invalid of [undefined, null, true, 1, 1n, {}, new String('1')] as unknown as string[])
  check([point(invalid, '0'), 960, 30]);

const accessorCases = ['mutate', 'throw-cx', 'throw-x', 'throw-cy', 'throw-y', 'bad-x', 'bad-cell', 'bad-span', 'bad-period'] as const;
for (const scenario of accessorCases) {
  const run = (fn: Lattice, tape: Tape) => {
    tape.length = 0;
    const values = { cx: '-2', cy: '3', x: 100.25, y: -45.75 };
    const at = {} as MassAddress;
    for (const key of ['cx', 'x', 'cy', 'y'] as const) Object.defineProperty(at, key, { get: () => {
      tape.push(['get', key]);
      if (scenario === 'throw-' + key) throw Error('controlled ' + key + ' getter');
      if (scenario === 'mutate') {
        if (key === 'cx') values.x = -960.25;
        if (key === 'x') values.cy = '9007199254740993';
        if (key === 'cy') values.y = 960.125;
      }
      if (scenario === 'bad-x' && key === 'x') return NaN;
      if (scenario === 'bad-cell' && key === 'cx') return '01';
      return values[key];
    } });
    Object.defineProperty(at, 'dimension', { get: () => { throw Error('lattice must never read dimension'); } });
    const result = outcome(fn, [at, scenario === 'bad-span' ? 0 : 960, scenario === 'bad-period' ? 0 : 370]);
    return { result, tape: [...tape] };
  };
  const old = run(beforeTrace, beforeTape), current = run(afterTrace, afterTape);
  equalOutcomes(current.result, old.result, scenario + ' accessor/error parity');
  assert.deepEqual(current.tape, old.tape, scenario + ' exact accessor/validation interleaving');
}
// Both variants share the unchanged bounded cell parser. Evict its entries with
// valid signed cells, then recheck boundary and invalid spellings independently.
for (let i = 0; i < 4200; i++) cellInteger(String(i + 100000));
check([point(cells[0], cells[cells.length - 1], -.25, .75), 960, 379]);
check([point('01', '0'), 960, 379]);
console.log('PASS archived lattice: ' + comparisons + ' exact values/errors/dependency/accessor comparisons; SHA256 ' + oracleHash);

async function productionBundle(): Promise<{ archived: Lattice; current: Lattice; bytes: number }> {
  const oracleModule = "import { validSpan, cellInteger, floorDiv, type MassAddress } from 'lattice-work-current';\n" +
    archivedCode.replace('function latticeAt', 'export function latticeAt');
  const result = await build({
    stdin: { contents: "export { latticeAt as archived } from 'lattice-work-oracle'; export { latticeAt as current } from 'lattice-work-current';",
      sourcefile: 'lattice-work-entry.ts', loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
    keepNames: false, logLevel: 'silent', tsconfigRaw: {},
    plugins: [{ name: 'preserved-lattice-oracle', setup(b) {
      b.onResolve({ filter: /^lattice-work-(oracle|current)$/ }, args => ({ path: args.path, namespace: 'lattice-work' }));
      b.onLoad({ filter: /.*/, namespace: 'lattice-work' }, args => ({
        contents: args.path.endsWith('oracle') ? oracleModule : currentModule, loader: 'ts',
      }));
    } }],
  });
  const text = result.outputFiles[0].text;
  const module = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64')) as { archived: Lattice; current: Lattice };
  return { ...module, bytes: Buffer.byteLength(text) };
}
const bundled = await productionBundle();
for (const q of fixed) {
  equalOutcomes(outcome(bundled.archived, q), outcome(archivedLattice, q), 'bundled archive parity');
  equalOutcomes(outcome(bundled.current, q), outcome(archivedLattice, q), 'bundled current parity');
}
console.log('PASS minified production-style bundle: ' + fixed.length * 2 + ' exact comparisons, ' + bundled.bytes + ' bytes');

if (process.argv.includes('--bench')) {
  const nativePeriods = [18000, 2600, 370, 8200, 1700, 12800, 2100, 540, 7000];
  const nearby: Query[] = Array.from({ length: 2048 }, (_, i) => [point(
    String(i % 32 - 16), String((i >> 5) % 16 - 8), (i * 151 % 960) + .25, (i * 227 % 960) + .5),
    960, nativePeriods[i % nativePeriods.length]]);
  const distant: Query[] = Array.from({ length: 6144 }, (_, i) => [point(
    (9007199254740993n + BigInt(i) * 1000003n).toString(),
    (-9007199254740993n - BigInt(i) * 1000033n).toString(), (i * 151 % 960) + .25, (i * 227 % 960) + .5),
    960, nativePeriods[i % nativePeriods.length]]);
  const workloads = [{ name: 'nearby-reused-cells', queries: nearby }, { name: 'distant-cache-churn', queries: distant }];
  const modes = [{ name: 'actual-tsx', archived: archivedLattice, current: latticeAt }, { name: 'minified-bundle', ...bundled }];
  const count = 262144, rows: { mode: string; workload: string; round: number; variant: string; count: number; ms: number; checksum: number }[] = [];
  for (const mode of modes) for (const workload of workloads) {
    for (const fn of [mode.archived, mode.current]) for (let i = 0; i < 8192; i++) fn(...workload.queries[i % workload.queries.length]);
    for (let round = 0; round < 4; round++) for (const variant of round % 2 ? ['current', 'archived'] as const : ['archived', 'current'] as const) {
      const fn = mode[variant], start = performance.now(); let checksum = 0;
      for (let i = 0; i < count; i++) {
        const value = fn(...workload.queries[i % workload.queries.length]);
        checksum += value.fx + value.fy;
      }
      rows.push({ mode: mode.name, workload: workload.name, round, variant, count, ms: performance.now() - start, checksum });
    }
  }
  for (const mode of modes) for (const workload of workloads)
    assert.equal(new Set(rows.filter(row => row.mode === mode.name && row.workload === workload.name).map(row => row.checksum)).size, 1);
  console.log('Lattice fixed-work timing ' + JSON.stringify(rows));
}
console.log('PASS worldmass_latticework: ' + comparisons + ' comparisons; no timing gates');
