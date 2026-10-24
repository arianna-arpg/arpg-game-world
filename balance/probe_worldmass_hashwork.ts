/** Exact hash reuse, including observable coercion and bounded retention. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { canonical, freezeData, massDigest, massHash, massRandom } from '../src/worldmass/random';

// Original arithmetic, kept independent of the cache and its implementation.
function reference(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
let checks = 0;
const seeds = [undefined, 0, -0, 1, -1, 0xffffffff, 0x100000001, .5, NaN, Infinity, -Infinity];
const texts = ['', 'surface', '雪🦉', '\ud800', '\udfff', '\0\n"\\', 'x'.repeat(65536), 'y'.repeat(65537)];
for (let i = 0; i < 1000; i++) texts.push(JSON.stringify(['surface', String(BigInt(i) * 922337203685477n), String(-i)]));
for (const text of texts) for (const seed of seeds) for (let repeat = 0; repeat < 2; repeat++) {
  assert.equal(massHash(text, seed), reference(text, seed)); checks++;
}

function observe(fn: typeof massHash, make: (tape: unknown[]) => [unknown, unknown]) {
  const tape: unknown[] = [], [text, seed] = make(tape);
  try { return { value: fn(text as string, seed as number), tape }; }
  catch (error) { return { error: [error instanceof Error ? error.name : typeof error, String(error)], tape }; }
}
const cases: ((tape: unknown[]) => [unknown, unknown])[] = [
  tape => ['surface', { valueOf() { tape.push('seed'); return -1; } }],
  tape => ['surface', { [Symbol.toPrimitive](hint: string) { tape.push(hint); return 4294967297; } }],
  tape => ['surface', { valueOf() { tape.push('seed-throw'); throw Error('seed error'); } }],
  tape => ['surface', { valueOf() { tape.push(['nested', massHash('nested', 7)]); return 7; } }],
  tape => ['same-key-reentry', { valueOf() { tape.push(['nested', massHash('same-key-reentry', 37)]); return 37; } }],
  tape => [{ get length() { tape.push('length'); return 2; }, charCodeAt(i: number) { tape.push(i); return 65 + i; } }, 7],
  tape => { let reads = 0; return [{ get length() { tape.push(['length', ++reads]); return reads === 1 ? 3 : 1; },
    charCodeAt(i: number) { tape.push(i); return 90; } }, 7]; },
  tape => { let reads = 0; return [{ length: 2, get charCodeAt() { tape.push(['charCodeAt', ++reads]);
    if (reads === 2) throw Error('late character error'); return () => 65; } }, 7]; },
  tape => [{ get length() { tape.push('length-throw'); throw Error('length error'); } }, 7],
  tape => [new Proxy(new String('boxed'), { get(target, key) {
    tape.push(String(key)); const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  } }), 9],
  () => [null, 7], () => [undefined, 7], () => ['surface', 1n], () => ['surface', Symbol('seed')],
];
for (const make of cases) for (let repeat = 0; repeat < 3; repeat++) {
  assert.deepEqual(observe(massHash, make), observe(reference, make)); checks++;
}
// Like the production generation math, these comparisons use standard stable
// JS intrinsics. Replacing Math.imul/String.prototype is not a gameplay API.
for (let i = 0; i < 100; i++) {
  const namespace = ['source', i, '-9223372036854775808'];
  const rng = massRandom(i, namespace);
  assert.equal(rng.snapshot(), reference(JSON.stringify([i, ...namespace])) || 0x9e3779b9); checks++;
}

// The digest oracle retains two independent original folds. Canonical itself is
// unchanged; compare its observable reads/errors as well as the resulting hash.
function referenceDigest(value: unknown): string {
  const text = canonical(value);
  return reference(text).toString(16).padStart(8, '0')
    + reference(text, 0x9e3779b9).toString(16).padStart(8, '0');
}
for (const value of [null, false, -0, 1.5, { z: 3, a: [1, true, null] },
  ...[65533, 65534, 65535, 65536, 65537, 131072, 2300000].map(n => 'a'.repeat(n)),
  { text: '\ud800\0雪🦉'.repeat(16000), other: ['\udfff', '"\\\n'] },
  freezeData({ nested: { text: 'f'.repeat(70000) }, value: 3 }),
]) for (let repeat = 0; repeat < 3; repeat++) {
  assert.equal(massDigest(value), referenceDigest(value)); checks++;
}
function observeDigest(fn: typeof massDigest, make: (tape: string[]) => unknown) {
  const tape: string[] = [], value = make(tape), results: unknown[] = [];
  for (let i = 0; i < 3; i++) {
    try { results.push({ value: fn(value) }); }
    catch (error) { results.push({ error: error instanceof Error ? [error.name, error.message] : String(error) }); }
  }
  return { results, tape };
}
for (const make of [
  (tape: string[]) => ({ get z() { tape.push('z'); return 3; }, get a() { tape.push('a'); return 'g'.repeat(70000); } }),
  (tape: string[]) => ({ get z() { tape.push('z-throw'); throw Error('late canonical getter'); },
    get a() { tape.push('a'); return 'g'.repeat(70000); } }),
  (tape: string[]) => {
    const input = ['i'.repeat(70000)];
    Object.defineProperty(input, Symbol.iterator, { value: function*() {
      tape.push('iterator'); try { yield input[0]; yield Infinity; } finally { tape.push('closed'); }
    } });
    return input;
  },
  () => { const cycle: Record<string, unknown> = { text: 'c'.repeat(70000) }; cycle.self = cycle; return cycle; },
  () => undefined, () => NaN, () => Infinity, () => 1n,
]) {
  assert.deepEqual(observeDigest(massDigest, make), observeDigest(referenceDigest, make)); checks++;
}

// Inspect a separately bundled copy's private bookkeeping. The production API
// exposes no cache controls; the real exported function was checked above.
const source = readFileSync(new URL('../src/worldmass/random.ts', import.meta.url), 'utf8');
const hashSeam = 'let h = seed >>> 0;', pairSeam = 'function oversizedMassDigestPair(text: string): string {';
assert.equal(source.split(hashSeam).length, 2); assert.equal(source.split(pairSeam).length, 2);
const metered = source.replace(hashSeam, hashSeam + ' digestWork.hashes++;')
  .replace(pairSeam, pairSeam + ' digestWork.pairs++;');
const result = await build({ stdin: { contents: metered + `
const digestWork = { hashes: 0, pairs: 0 };
export function digestCalls() { return {...digestWork}; }
export function hashRetention() {
  return { entries: hashMemoCount, units: hashMemoUnits, buckets: hashMemo.size,
    rows: [...hashMemo].flatMap(([seed, rows]) => [...rows].map(([text, value]) => ({seed,text,value}))),
    ring: hashMemoOrder.filter(Boolean).length };
}`, resolveDir: fileURLToPath(new URL('../src/worldmass/', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', target: 'es2022' });
const isolated = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')) as {
  massHash: typeof massHash;
  massDigest: typeof massDigest;
  freezeData: typeof freezeData;
  digestCalls(): { hashes: number; pairs: number };
  hashRetention(): { entries: number; units: number; buckets: number; ring: number; rows: {seed:number;text:string;value:number}[] };
};
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < 5000; i++) {
    const text = round === 1 ? String(i).padEnd(32768, 'x') : 'churn:' + i;
    assert.equal(isolated.massHash(text, i + round), reference(text, i + round)); checks++;
  }
  const state = isolated.hashRetention();
  assert.ok(state.entries <= 4096 && state.units <= 1048576);
  assert.equal(state.entries, state.rows.length); assert.equal(state.entries, state.ring);
  assert.equal(state.units, state.rows.reduce((n, row) => n + row.text.length, 0));
  assert.equal(state.buckets, new Set(state.rows.map(row => row.seed)).size);
  assert.equal(new Set(state.rows.map(row => JSON.stringify([row.seed,row.text]))).size, state.entries);
  for (const row of state.rows) assert.equal(isolated.massHash(row.text, row.seed), row.value);
}
const before = isolated.hashRetention();
isolated.massHash('uncached'.repeat(10000), 4);
assert.deepEqual(isolated.hashRetention(), before, 'oversized strings must not enter or churn the cache');
for (const [units, hashes, pairs] of [[65536, 2, 0], [65537, 0, 1]] as const) {
  const prior = isolated.digestCalls(), value = 'd'.repeat(units - 2);
  assert.equal(canonical(value).length, units);
  assert.equal(isolated.massDigest(value), referenceDigest(value));
  const next = isolated.digestCalls();
  assert.deepEqual({ hashes: next.hashes - prior.hashes, pairs: next.pairs - prior.pairs }, { hashes, pairs }); checks++;
}
const frozenDigest = isolated.freezeData({ text: 'f'.repeat(70000) });
assert.equal(isolated.massDigest(frozenDigest), referenceDigest(frozenDigest));
const primed = isolated.digestCalls();
for (let i = 0; i < 3; i++) assert.equal(isolated.massDigest(frozenDigest), referenceDigest(frozenDigest));
assert.deepEqual(isolated.digestCalls(), primed, 'frozen root digest memo still avoids both hash paths'); checks++;
console.log(JSON.stringify({ result: 'PASS exact bounded hash reuse and oversized digest pair', checks, retention: { entries: before.entries, units: before.units } }));
