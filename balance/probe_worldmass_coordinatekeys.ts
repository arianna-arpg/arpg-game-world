/** Coordinate-key specialization versus the independent a6f62a2d canonical
 * module already archived by canonicalwork. No runtime Git or ignored files.
 * Stable standard intrinsics are assumed; caller-owned exotic values are not.
 * Real planner checks cover existing key/cache compatibility and the complete
 * WildernessPaths.at entrypoint. Full generated-content parity belongs to the
 * cold replay and existing generation probes; this is not a timing gate. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Rng } from '../src/core/rng';
import { canonical, canonicalStringTriple, freezeData } from '../src/worldmass/random';
import { address, floorDiv, moveAddress, type MassAddress } from '../src/worldmass/address';
import { WildernessPaths } from '../src/worldmass/wildernessPaths';
import { MassRegionalLandforms } from '../src/worldmass/regionalLandforms';
import { MassLandforms } from '../src/worldmass/landforms';
import { MassNativeRegional } from '../src/worldmass/nativeRegional';
import { MassTerrainPatches } from '../src/worldmass/terrainPatches';

// Read the pinned archive as data; never import/execute the other probe itself.
const archiveFile = readFileSync(new URL('./probe_worldmass_canonicalwork.ts', import.meta.url), 'utf8');
const tree = ts.createSourceFile('canonicalwork.ts', archiveFile, ts.ScriptTarget.Latest, true);
const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
  .find(d => ts.isIdentifier(d.name) && d.name.text === 'archivedSource');
assert.ok(declaration?.initializer && ts.isTaggedTemplateExpression(declaration.initializer)
  && ts.isNoSubstitutionTemplateLiteral(declaration.initializer.template), 'immutable canonical archive');
const literal = declaration.initializer.template;
const archivedSource = (literal.rawText ?? literal.text).replace(/\r\n/g, '\n');
const oracleHash = createHash('sha256').update(archivedSource).digest('hex');
assert.equal(oracleHash, '4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d');
const archivedExports: Record<string, unknown> = {};
new Function('require', 'exports', ts.transpileModule(archivedSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)((name: string) => { assert.equal(name, '../core/rng'); return { Rng }; }, archivedExports);
const archived = archivedExports as unknown as { canonical: typeof canonical; freezeData: typeof freezeData };

type Triple = (a: unknown, b: unknown, c: unknown) => string;
type API = { triple: Triple; canonical: typeof canonical; freezeData: typeof freezeData };
const current: API = { triple: canonicalStringTriple, canonical, freezeData };
const original: API = { ...archived, triple: (a, b, c) => archived.canonical([a, b, c]) };
let checks = 0;
function outcome(fn: () => unknown): unknown {
  try { return { value: fn() }; }
  catch (error) { return { error: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error) }; }
}
function compare(name: string, run: (api: API) => unknown): void {
  assert.deepEqual(run(current), run(original), name); checks++;
}

const dimensions = ['', 'surface', '雪🦉', '\ud800', '\udfff', '\ud800\udfff', '\u2028\u2029',
  'quote"\\\0\b\f\n\r\t', '__proto__', 'constructor', 'x'.repeat(8193)];
const cells = ['0', '-0', '01', '-1', '1', '9007199254740993', '-9007199254740993',
  '-9223372036854775808', '9223372036854775807', '18446744073709551616', '9'.repeat(96)];
for (const dimension of dimensions) for (const x of cells) for (const y of cells)
  compare('string triple', api => api.triple(dimension, x, y));
// Exercise every UTF-16 code unit, including unpaired surrogates, without a
// locale or random source. Both paths use the engine's exact JSON escaping.
for (let start = 0; start < 65536; start += 256) {
  let text = ''; for (let i = 0; i < 256; i++) text += String.fromCharCode(start + i);
  compare('UTF-16 block ' + start, api => api.triple(text, text.slice(1), '\\' + text));
}
const values: unknown[] = [null, true, false, 0, -0, 1.5, Number.MIN_VALUE, Number.MAX_VALUE,
  NaN, Infinity, -Infinity, undefined, 1n, Symbol('key'), () => 'key'];
for (const value of values) for (let slot = 0; slot < 3; slot++) compare('non-string primitive', api => {
  const args: [unknown, unknown, unknown] = ['surface', '-1', '2']; args[slot] = value;
  return outcome(() => api.triple(...args));
});
for (const make of [() => new String('surface'), () => new Number(3), () => new Date(0),
  () => new Map(), () => new Set(), () => /x/, () => new Uint8Array([1, 2])])
  compare('unsupported instance', api => outcome(() => api.triple(make(), '1', '2')));

compare('sorted getters and own toJSON failure', api => {
  const tape: string[] = [], obj = Object.defineProperties({}, {
    z: { enumerable: true, get() { tape.push('z'); return 2; } },
    a: { enumerable: true, get() { tape.push('a'); return 'first'; } },
  });
  const first = outcome(() => api.triple(obj, 'x', 'y'));
  const second = outcome(() => api.triple({ toJSON() { tape.push('toJSON'); return 'changed'; } }, 'x', 'y'));
  return { first, second, tape };
});
compare('null prototype and reserved keys', api => api.triple(Object.assign(Object.create(null),
  JSON.parse('{"__proto__":{"x":1},"constructor":2,"toString":3}')), 'x', 'y'));
compare('shared aliases and cycles', api => {
  const shared = { b: 2, a: 1 }, cycle: Record<string, unknown> = {}; cycle.self = cycle;
  const array: unknown[] = []; array.push(array);
  return [outcome(() => api.triple(shared, shared, [shared])), outcome(() => api.triple(cycle, 'x', 'y')),
    outcome(() => api.triple('x', array, 'y'))];
});
compare('late getter throw and failure recovery', api => {
  const tape: string[] = [], obj = { get a() { tape.push('a'); return 1; },
    get z() { tape.push('z'); throw new RangeError('late read'); } };
  return { first: outcome(() => api.triple(obj, 'x', 'y')),
    second: outcome(() => api.triple({ a: 1 }, 'x', 'y')), tape };
});
compare('proxy descriptor/get order', api => {
  const tape: string[] = [], proxy = new Proxy({ z: 2, a: 1 }, {
    getPrototypeOf(target) { tape.push('prototype'); return Reflect.getPrototypeOf(target); },
    ownKeys(target) { tape.push('keys'); return Reflect.ownKeys(target).reverse(); },
    getOwnPropertyDescriptor(target, key) { tape.push('descriptor:' + String(key)); return Reflect.getOwnPropertyDescriptor(target, key); },
    get(target, key, receiver) { tape.push('get:' + String(key)); return Reflect.get(target, key, receiver); },
  });
  return { result: outcome(() => api.triple(proxy, 'x', 'y')), tape };
});
compare('revoked record and array proxies', api => [false, true].map(array => {
  const revocable = Proxy.revocable(array ? [] : {}, {}); revocable.revoke();
  return outcome(() => api.triple(revocable.proxy, 'x', 'y'));
}));
compare('proxy array with null iterator and holes', api => {
  const tape: string[] = [], row: unknown[] = ['a', , 'c'];
  Object.defineProperty(row, Symbol.iterator, { value: null });
  const proxy = new Proxy(row, { get(target, key, receiver) {
    tape.push(String(key)); return Reflect.get(target, key, receiver);
  } });
  return { result: outcome(() => api.triple(proxy, 'x', 'y')), tape };
});
for (const mode of ['plain', 'mutation', 'throw', 'cycle'] as const) compare('custom iterator/' + mode, api => {
  const tape: string[] = [], row: unknown[] = [1, 2];
  Object.defineProperty(row, Symbol.iterator, { value() {
    tape.push('iterator'); let i = 0;
    return { next() {
      tape.push('next:' + i);
      if (mode === 'mutation' && i === 0) row.push(3);
      if (i >= row.length) return { done: true, value: undefined };
      const value = mode === 'throw' && i === 1 ? undefined : mode === 'cycle' && i === 1 ? row : row[i];
      i++; return { done: false, value };
    }, return() { tape.push('return'); return { done: true, value: undefined }; } };
  } });
  return { result: outcome(() => api.triple('x', row, 'y')), tape };
});
compare('getter reentrancy including caught inner failure', api => {
  const tape: unknown[] = [], value = { get a() {
    tape.push(api.triple('inner', '1', '2'));
    tape.push(outcome(() => api.triple(undefined, '1', '2'))); return 7;
  } };
  return { result: api.triple(value, 'x', 'y'), tape };
});
compare('same object changes between calls', api => {
  const child = { n: 1 }, results = [api.triple(child, 'x', 'y')]; child.n = 2;
  results.push(api.triple(child, 'x', 'y')); return results;
});
compare('branded subtree memo and unbranded mutable sibling', api => {
  const child = api.freezeData({ z: ['a', 2, null], a: { n: 1 } });
  const primed = api.canonical(child), mutable = { n: 1 };
  const a = api.triple(child, mutable, child); mutable.n++;
  return [primed, a, api.triple(child, mutable, child), api.triple(child, 'x', 'y')];
});
for (const failure of ['none', 'dimension', 'x', 'y', 'record'] as const) compare('argument order/' + failure, api => {
  const tape: string[] = []; let state = 'before';
  const source = {
    get dimension() { tape.push('dimension'); if (failure === 'dimension') throw Error('dimension'); state = 'after'; return 'surface'; },
  };
  const gx = { get toString() { tape.push('x-method'); return () => {
    tape.push('x-call:' + state); if (failure === 'x') throw Error('x');
    return failure === 'record' ? { get a() { tape.push('record-read'); return 4; } } : '-9223372036854775808';
  }; } };
  const gy = { toString() { tape.push('y-call'); if (failure === 'y') throw Error('y'); return '9223372036854775807'; } };
  return { result: outcome(() => api.triple(source.dimension, gx.toString(), gy.toString())), tape };
});

// The four real candidate entrypoints must find keys produced by the old
// serializer, including cached null plans. Existing plan identities/order are
// the contract here; no model of the new helper or generation algorithm is used.
type CandidateEntry = { cache: Map<string, unknown>; candidate(dimension: unknown, gx: unknown, gy: unknown): unknown };
const planners = [MassRegionalLandforms, MassLandforms, MassNativeRegional, MassTerrainPatches];
for (const Planner of planners) for (const dimension of dimensions.slice(0, -1))
  for (const coordinate of [0n, -1n, -(1n << 63n), (1n << 63n) - 1n, (1n << 70n)]) {
    const key = archived.canonical([dimension, coordinate.toString(), (-coordinate).toString()]);
    for (const expected of [null, Object.freeze({ legacyPlan: key })]) {
      const instance = Object.create(Planner.prototype) as CandidateEntry;
      instance.cache = new Map([['older', null], [key, expected], ['newer', null]]);
      const order = [...instance.cache.keys()];
      assert.equal(instance.candidate(dimension, coordinate, -coordinate), expected, Planner.name);
      assert.deepEqual([...instance.cache.keys()], order, Planner.name + ' preserves cached order'); checks++;
    }
  }
for (const Planner of planners) {
  const tape: string[] = [], dimension = { get z() { tape.push('dimension-record'); return 1; } };
  const gx = { toString() { tape.push('x'); return { a: 2 }; } }, gy = { toString() { tape.push('y'); return '3'; } };
  const key = archived.canonical([{ z: 1 }, { a: 2 }, '3']);
  const instance = Object.create(Planner.prototype) as CandidateEntry;
  instance.cache = new Map([[key, null]]);
  assert.equal(instance.candidate(dimension, gx, gy), null);
  assert.deepEqual(tape, ['x', 'y', 'dimension-record']); checks++;
}

// Full pre-change WildernessPaths.at body, archived from 502a6da6 (the module
// SHA is in the source receipt), including origin validation before key reads.
// Only canonical's implementation is replaced by the independent archive.
const oldPathSource = String.raw`function oldAt(at:MassAddress):readonly WildernessPath[]{
    const span=this.generator.spec.addressSpan,n=BigInt(this.spec.district/span);
    const cx=floorDiv(BigInt(at.cx),n)*n,cy=floorDiv(BigInt(at.cy),n)*n;
    const origin=address(at.dimension,cx.toString(),cy.toString(),0,0,span),key=canonical([at.dimension,cx.toString(),cy.toString()]);
    const hit=this.cache.get(key);if(hit){this.cache.delete(key);this.cache.set(key,hit);return hit;}
    // At the signed-address rim the incomplete district intentionally has no links.
    let result:readonly WildernessPath[]=[];
    try{moveAddress(origin,{x:this.spec.district,y:this.spec.district},span);result=this.plan(origin,key);}
    catch(e){if(!(e instanceof RangeError))throw e;}
    this.cache.set(key,result);if(this.cache.size>32)this.cache.delete(this.cache.keys().next().value!);
    return result;
  }`;
type PathFixture = { spec: { district: number }; generator: { spec: { addressSpan: number } };
  cache: Map<string, unknown>; plan(origin: MassAddress, key: string): unknown };
type PathEntry = (this: PathFixture, at: MassAddress) => unknown;
const oldAt = new Function('canonical', 'address', 'floorDiv', 'moveAddress',
  ts.transpileModule(oldPathSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '\nreturn oldAt;')(
  archived.canonical, address, floorDiv, moveAddress) as PathEntry;
const currentAt = WildernessPaths.prototype.at as unknown as PathEntry;
function pathFixture(tape: unknown[]): PathFixture {
  return { spec: { district: 3840 }, generator: { spec: { addressSpan: 960 } }, cache: new Map(),
    plan(origin, key) { tape.push({ origin, key }); return Object.freeze([{ key }]); } };
}
function pathSequence(fn: PathEntry): unknown {
  const tape: unknown[] = [], instance = pathFixture(tape), rows: unknown[] = [];
  for (const dimension of ['surface', '雪\ud800"\\']) for (const cx of ['0', '-1', '4', '-8',
    '-9223372036854775808', '9223372036854775807']) {
    const at = { dimension, cx, cy: '-4', x: 0, y: 0 };
    const first = outcome(() => fn.call(instance, at));
    rows.push(first, outcome(() => fn.call(instance, at)), [...instance.cache.keys()]);
  }
  for (let i = 0; i < 40; i++) fn.call(instance, { dimension: 'surface', cx: String(i * 4), cy: '0', x: 0, y: 0 });
  rows.push([...instance.cache.keys()], outcome(() => fn.call(instance, { dimension: 'surface', cx: '0', cy: '0', x: 0, y: 0 })));
  return { rows, tape, finalKeys: [...instance.cache.keys()] };
}
assert.deepEqual(pathSequence(currentAt), pathSequence(oldAt)); checks++;
for (const mode of ['normal', 'first-throw', 'second-throw', 'second-record', 'invalid-x', 'invalid-y'] as const) {
  const observePath = (fn: PathEntry) => {
    const tape: unknown[] = [], instance = pathFixture(tape); let dimensionsRead = 0;
    const at = {
      get cx() { tape.push('cx'); return mode === 'invalid-x' ? 'bad' : '0'; },
      get cy() { tape.push('cy'); return mode === 'invalid-y' ? 'bad' : '0'; },
      get dimension(): unknown {
        tape.push('dimension:' + ++dimensionsRead);
        if (mode === 'first-throw' && dimensionsRead === 1 || mode === 'second-throw' && dimensionsRead === 2) throw Error(mode);
        return mode === 'second-record' && dimensionsRead === 2 ? { get a() { tape.push('record'); return 1; } } : 'surface';
      }, x: 0, y: 0,
    } as MassAddress;
    return { result: outcome(() => fn.call(instance, at)), tape, keys: [...instance.cache.keys()] };
  };
  assert.deepEqual(observePath(currentAt), observePath(oldAt), 'WildernessPaths order/' + mode); checks++;
}

console.log('coordinatekeys: PASS ' + checks + ' comparisons; canonical archive ' + oracleHash
  + '; five real caller key seams; stable standard intrinsics; no timing assertion');
