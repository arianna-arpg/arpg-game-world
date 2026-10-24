/** Exact canonical serialization work. Default target is production random.ts;
 * --variant PATH evaluates a scratch candidate without installing it.
 * --bench runs isolated fixed work after parity; durations are never gates. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

type API = typeof import('../src/worldmass/random');
// Entire a6f62a2d random.ts module, including the original canonical body.
// Only the unchanged Rng dependency is shared with the candidate.
const archivedSource = String.raw`import { Rng } from '../core/rng';
// Only plain data recursively frozen HERE can be memoized. Object.freeze on an
// outer record alone says nothing about its children or live accessor values.
const massFrozenData=new WeakSet<object>();
const massCanonicalMemo=new WeakMap<object,string>(),massDigestMemo=new WeakMap<object,string>();
export function isMassFrozenData(value:unknown):boolean{return !!value&&typeof value==='object'&&massFrozenData.has(value);}

/** Stable manifest JSON. Non-JSON values are errors, never omitted identity inputs. */
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  const visit = (v: unknown): string => {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || v === null) throw new Error('Manifest must contain finite JSON data');
    if(massFrozenData.has(v)){const cached=massCanonicalMemo.get(v);if(cached!==undefined)return cached;}
    if (seen.has(v)) throw new Error('Manifest must not contain cycles');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
      throw new Error('Manifest must contain plain records');
    seen.add(v);
    const text = Array.isArray(v) ? '[' + Array.from(v, visit).join(',') + ']'
      : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit((v as Record<string, unknown>)[k])).join(',') + '}';
    seen.delete(v);
    return text;
  };
  const text=visit(value);
  if(isMassFrozenData(value))massCanonicalMemo.set(value as object,text);
  return text;
}
/** Sampling hash, not a unique ID or security digest. Full coordinate text is
 * hashed; coordinates are never narrowed to a 32-bit integer first. */
export function massHash(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export function massDigest(value: unknown): string {
  if(isMassFrozenData(value)){const cached=massDigestMemo.get(value as object);if(cached)return cached;}
  const text = canonical(value);
  const digest=massHash(text).toString(16).padStart(8, '0') + massHash(text, 0x9e3779b9).toString(16).padStart(8, '0');
  if(isMassFrozenData(value))massDigestMemo.set(value as object,digest);
  return digest;
}
export function streamSeed(seed: number, namespace: readonly (string | number)[]): number {
  return massHash(canonical([seed, ...namespace]));
}
export function massRandom(seed: number, namespace: readonly (string | number)[]): Rng {
  return new Rng(streamSeed(seed, namespace));
}
export function freezeData<T>(data: T): Readonly<T> {
  if (data && typeof data === 'object') {
    if(massFrozenData.has(data))return data;
    for (const v of Object.values(data)) freezeData(v);
    Object.freeze(data);
    const plain=Array.isArray(data)||Object.getPrototypeOf(data)===Object.prototype||Object.getPrototypeOf(data)===null;
    let dense=true;if(Array.isArray(data))for(let i=0;i<data.length;i++)if(!Object.hasOwn(data,i)){dense=false;break;}
    if(plain&&dense&&Object.values(Object.getOwnPropertyDescriptors(data)).every(d=>'value'in d&&(
      d.value===null||typeof d.value==='string'||typeof d.value==='boolean'||typeof d.value==='number'&&Number.isFinite(d.value)||isMassFrozenData(d.value))))massFrozenData.add(data);
  }
  return data;
}
`;

const oracleHash = createHash('sha256').update(archivedSource).digest('hex');
assert.equal(oracleHash, '4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d');
const archiveTree = ts.createSourceFile('archived-random.ts', archivedSource, ts.ScriptTarget.Latest, true);
const canonicalNode = archiveTree.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'canonical') as ts.FunctionDeclaration;
assert.ok(canonicalNode?.body);
const bodyHash = createHash('sha256').update(canonicalNode.body.getText(archiveTree)).digest('hex');
const variantIndex = process.argv.indexOf('--variant');
assert.ok(variantIndex < 0 || process.argv[variantIndex + 1], '--variant needs a source file');
const currentPath = variantIndex < 0 ? fileURLToPath(new URL('../src/worldmass/random.ts', import.meta.url))
  : resolve(process.argv[variantIndex + 1]);
const currentSource = readFileSync(currentPath, 'utf8');
const actual = await import(pathToFileURL(currentPath).href) as API;
const rngSource = readFileSync(new URL('../src/core/rng.ts', import.meta.url), 'utf8');

async function pairedBundle(minified: boolean): Promise<{ archived: API; current: API; bytes: number }> {
  const withRng = (source: string) => {
    const changed = source.replace(/import \{ Rng \} from '[^']+';/, "import { Rng } from 'canonical-work-rng';");
    assert.notEqual(changed, source, 'expected the original Rng import');
    return changed;
  };
  const result = await build({
    stdin: { contents: "export * as archived from 'canonical-work-archived'; export * as current from 'canonical-work-current';",
      sourcefile: 'canonical-work-entry.ts', loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    minify: minified, keepNames: !minified, logLevel: 'silent', tsconfigRaw: {},
    plugins: [{ name: 'canonical-archive', setup(b) {
      b.onResolve({ filter: /^canonical-work-(archived|current|rng)$/ }, args => ({ path: args.path, namespace: 'canonical-work' }));
      b.onLoad({ filter: /.*/, namespace: 'canonical-work' }, args => ({
        contents: args.path.endsWith('rng') ? rngSource : withRng(args.path.endsWith('archived') ? archivedSource : currentSource),
        loader: 'ts', resolveDir: dirname(currentPath),
      }));
    } }],
  });
  const text = result.outputFiles[0].text;
  const modules = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64')) as { archived: API; current: API };
  return { ...modules, bytes: Buffer.byteLength(text) };
}

type Outcome = { value: string } | { error: string; message: string };
function capture(fn: () => string): Outcome {
  try { return { value: fn() }; }
  catch (e) {
    assert.ok(e instanceof Error, 'controlled fixtures throw Error objects');
    return { error: e.name, message: e.message };
  }
}
type Fixture = { name: string; run: (api: API) => unknown };
const fixtures: Fixture[] = [];
function fixture(name: string, run: Fixture['run']): void { fixtures.push({ name, run }); }
function value(name: string, make: () => unknown): void {
  fixture(name, api => capture(() => api.canonical(make())));
}
const primitiveValues: unknown[] = [null, true, false, '', 'quote"\\\n\u0000', '🌌\ud800', 0, -0, 1, -.25, Number.MIN_VALUE,
  Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, undefined, NaN, Infinity, -Infinity, 1n, Symbol('unsupported'), () => 1];
for (const [i, v] of primitiveValues.entries()) value('primitive/' + i, () => v);
value('plain sorted/numeric/escaped keys', () => ({ z: 1, a: 2, '2': 3, '10': 4, 'quote"': 5, '\ud800': 6 }));
value('null prototype and reserved names', () => Object.assign(Object.create(null), { constructor: 1, toString: 2 },
  JSON.parse('{"__proto__":{"a":3}}')));
value('nested records and arrays', () => ({ z: [1, { c: false, b: [null, 'x'] }], a: { n: -.5 } }));
value('shared acyclic child', () => { const child = { b: 2, a: 1 }; return { z: child, a: child, list: [child, child] }; });
value('record self cycle', () => { const v: Record<string, unknown> = {}; v.self = v; return v; });
value('array self cycle', () => { const v: unknown[] = []; v.push(v); return v; });
value('indirect cycle', () => { const a: unknown[] = []; const b = { a }; a.push(b); return a; });
value('deep finite record', () => { let v: unknown = 1; for (let i = 0; i < 80; i++) v = { child: v }; return v; });
for (const [name, make] of [
  ['map', () => new Map()], ['set', () => new Set()], ['date', () => new Date(0)], ['regexp', () => /x/],
  ['boxed-string', () => new String('x')], ['boxed-number', () => new Number(1)], ['boxed-boolean', () => new Boolean(true)],
  ['custom-prototype', () => Object.create({ inherited: 1 })],
] as const) value('unsupported/' + name, make);
for (const v of [undefined, NaN, Infinity, 1n, Symbol('bad'), () => 1]) {
  value('unsupported nested record/' + typeof v + '/' + String(v), () => ({ a: v }));
  value('unsupported array/' + typeof v + '/' + String(v), () => [v]);
}
value('array named and symbol properties ignored', () => {
  const a = [1, 2] as number[] & { bad?: unknown };
  a.bad = undefined; Object.defineProperty(a, Symbol('bad'), { value: 1n }); return a;
});
value('nonenumerable and symbol record values ignored', () => {
  const v = { a: 1 }; Object.defineProperty(v, 'hidden', { value: undefined });
  Object.defineProperty(v, Symbol('bad'), { value: 1n }); return v;
});
fixture('toJSON is not called', api => {
  const tape: string[] = [], v = { a: 1 };
  Object.defineProperty(v, 'toJSON', { value: () => { tape.push('toJSON'); throw Error('must not call toJSON'); } });
  return { result: capture(() => api.canonical(v)), tape };
});
for (const throws of [false, true]) fixture('sorted getter reads/throw/' + throws, api => {
  const tape: string[] = [], v: Record<string, unknown> = {};
  Object.defineProperties(v, {
    z: { enumerable: true, get() { tape.push('z'); return 3; } },
    b: { enumerable: true, get() { tape.push('b'); if (throws) throw Error('controlled b'); return 2; } },
    a: { enumerable: true, get() { tape.push('a'); return 1; } },
  });
  return { result: capture(() => api.canonical(v)), tape };
});
for (const remove of [false, true]) fixture('record getter mutates later key/' + remove, api => {
  const tape: string[] = [], v: Record<string, unknown> = { z: 3 };
  Object.defineProperty(v, 'a', { enumerable: true, get() {
    tape.push('a'); if (remove) delete v.z; else v.z = 9; v.added = 10; return 1;
  } });
  return { result: capture(() => api.canonical(v)), tape, keys: Object.keys(v).sort() };
});
fixture('reentrant canonical getter', api => {
  const tape: string[] = [], child = { b: 2, a: 1 };
  const v = { get a() { tape.push(api.canonical(child)); return child; }, z: child };
  return { result: capture(() => api.canonical(v)), tape };
});
fixture('reentrant getter catches inner failure', api => {
  const tape: Outcome[] = [];
  const v = { get a() { tape.push(capture(() => api.canonical([undefined]))); return { ok: 1 }; }, z: 2 };
  return { result: capture(() => api.canonical(v)), tape };
});
fixture('failure followed by successful call', api => {
  let fail = true;
  const v = { get a() { if (fail) throw Error('controlled first failure'); return 1; }, z: 2 };
  const first = capture(() => api.canonical(v)); fail = false;
  return { first, second: capture(() => api.canonical(v)) };
});
fixture('primitive serialization and getter interleaving', api => {
  const tape: string[] = [], original = JSON.stringify;
  JSON.stringify = ((v: unknown) => { tape.push('json/' + typeof v + '/' + String(v)); return original(v); }) as typeof JSON.stringify;
  try {
    const v = { z: false, get a() { tape.push('get/a'); return { x: null, y: [1, 'quote\"'] }; } };
    return { result: capture(() => api.canonical(v)), tape };
  } finally { JSON.stringify = original; }
});
for (const mode of ['plain', 'null', 'changing', 'throw-prototype', 'throw-ownKeys', 'throw-descriptor', 'throw-get'] as const)
  fixture('proxy trap order/' + mode, api => {
    const tape: string[] = []; let proto = 0;
    const target = { b: 2, a: 1 };
    const proxy = new Proxy(target, {
      getPrototypeOf() {
        tape.push('prototype/' + proto);
        if (mode === 'throw-prototype') throw Error('controlled prototype');
        return mode === 'null' || mode === 'changing' && proto++ === 0 ? null
          : mode === 'changing' ? Date.prototype : Object.prototype;
      },
      ownKeys() { tape.push('ownKeys'); if (mode === 'throw-ownKeys') throw Error('controlled keys'); return ['b', 'a']; },
      getOwnPropertyDescriptor(t, k) {
        tape.push('descriptor/' + String(k));
        if (mode === 'throw-descriptor') throw Error('controlled descriptor'); return Reflect.getOwnPropertyDescriptor(t, k);
      },
      get(t, k, receiver) {
        tape.push('get/' + String(k)); if (mode === 'throw-get' && k === 'a') throw Error('controlled get');
        return Reflect.get(t, k, receiver);
      },
    });
    return { result: capture(() => api.canonical(proxy)), tape };
  });
fixture('revoked proxy', api => {
  const { proxy, revoke } = Proxy.revocable({}, {}); revoke();
  return capture(() => api.canonical(proxy));
});
value('hole array rejects undefined', () => [1, , 3]);
fixture('array inherited index remains visible', api => {
  const proto = Object.create(Array.prototype) as object;
  Object.defineProperty(proto, '1', { value: 7 });
  const v = [1, , 3]; Object.setPrototypeOf(v, proto);
  return capture(() => api.canonical(v));
});
for (const iterator of [null, undefined, 0] as const) fixture('array iterator override/' + String(iterator), api => {
  const tape: string[] = [], a = [1, 2, 3];
  Object.defineProperty(a, Symbol.iterator, { value: iterator });
  const proxy = new Proxy(a, { get(t, k, receiver) { tape.push(String(k)); return Reflect.get(t, k, receiver); } });
  return { result: capture(() => api.canonical(proxy)), tape };
});
fixture('array length mutation during visit', api => {
  const tape: string[] = [], a: unknown[] = [];
  a.push({ get x() { tape.push('visit-first'); a.push(3); return 1; } }, 2);
  return { result: capture(() => api.canonical(a)), tape, length: a.length };
});
for (const mode of ['normal', 'visit-throws', 'close-throws', 'next-throws', 'iterator-get-throws'] as const)
  fixture('custom iterator interleaving/close/' + mode, api => {
    const tape: string[] = []; let stage = 0, visited = false;
    const a: unknown[] = [];
    Object.defineProperty(a, Symbol.iterator, { get() {
      tape.push('iterator-get');
      if (mode === 'iterator-get-throws') throw Error('controlled iterator getter');
      return () => {
        tape.push('iterator-call');
        return {
          next() {
            tape.push('next/' + stage + '/' + visited);
            if (mode === 'next-throws' && stage === 1) throw Error('controlled next');
            if (stage++ === 0) return { done: false, value: { get x() {
              tape.push('visit');
              if (mode === 'visit-throws' || mode === 'close-throws') throw Error('controlled visit');
              visited = true; return 1;
            } } };
            return stage === 2 ? { done: false, value: visited ? 9 : 0 } : { done: true, value: undefined };
          },
          get return() {
            tape.push('return-get');
            return () => { tape.push('return-call'); if (mode === 'close-throws') throw Error('controlled close'); return { done: true }; };
          },
        };
      };
    } });
    return { result: capture(() => api.canonical(a)), tape };
  });
fixture('custom iterator yields itself', api => {
  const tape: string[] = [], a: unknown[] = [];
  Object.defineProperty(a, Symbol.iterator, { value: () => ({
    next: () => { tape.push('next'); return { done: false, value: a }; },
    return: () => { tape.push('close'); return { done: true }; },
  }) });
  return { result: capture(() => api.canonical(a)), tape };
});
fixture('mutable and shallow-frozen values stay fresh', api => {
  const child = { n: 1 }, shallow = Object.freeze({ child }), mutable = { child };
  const first = [api.canonical(shallow), api.canonical(mutable)]; child.n = 2;
  return { certified: [api.isMassFrozenData(shallow), api.isMassFrozenData(mutable)],
    first, next: [api.canonical(shallow), api.canonical(mutable)] };
});
fixture('frozen accessors are never memoized', api => {
  let reads = 0;
  const v = Object.freeze({ get x() { return ++reads; } });
  const first = api.canonical(v), second = api.canonical(v);
  return { first, second, reads, certified: api.isMassFrozenData(v) };
});
fixture('certified data root memo and root-only writes', api => {
  const tape: string[] = [];
  const child = new Proxy({ x: 1 }, { get(t, k, receiver) { tape.push(String(k)); return Reflect.get(t, k, receiver); } });
  const parent = api.freezeData({ child });
  tape.length = 0;
  const parentFirst = api.canonical(parent), parentCold = [...tape]; tape.length = 0;
  const parentSecond = api.canonical(parent), parentWarm = [...tape]; tape.length = 0;
  const childFirst = api.canonical(child), childCold = [...tape]; tape.length = 0;
  const childSecond = api.canonical(child), childWarm = [...tape];
  assert.ok(parentCold.length > 0 && childCold.length > 0, 'parent serialization must not memoize every child');
  assert.equal(parentWarm.length + childWarm.length, 0, 'certified roots retain original memo hits');
  return { parentFirst, parentSecond, childFirst, childSecond, parentCold, parentWarm, childCold, childWarm,
    certified: [api.isMassFrozenData(parent), api.isMassFrozenData(child)] };
});
fixture('freezeData accessor certificate fallback', api => {
  let reads = 0;
  const v = { get x() { return ++reads; } };
  api.freezeData(v); reads = 0;
  const a = api.canonical(v), b = api.canonical(v);
  return { a, b, reads, certified: api.isMassFrozenData(v) };
});
fixture('digest and seeded randomness retain bytes', api => {
  const values = [null, { b: [1, '🌌'], a: -.5 }, api.freezeData({ stable: [1, 2, 3] })];
  const digests = values.map(v => [api.massDigest(v), api.massDigest(v)]);
  const seeds = [0, 1, -1, 0xffffffff].map(seed => api.streamSeed(seed, ['terrain', '9007199254740993', 0, -.5]));
  const rng = api.massRandom(0xddba11, ['ecology', '-1', 96, 192]);
  return { digests, seeds, draws: Array.from({ length: 16 }, () => rng.next()) };
});

const hosted = await pairedBundle(false), minified = await pairedBundle(true);
const modes = [
  { name: 'common-es2022-keepNames', ...hosted },
  { name: 'common-es2022-minified', ...minified },
];
let comparisons = 0;
for (const f of fixtures) {
  const expected = f.run(hosted.archived);
  assert.deepEqual(f.run(actual), expected, 'actual tsx target / ' + f.name); comparisons++;
  for (const mode of modes) {
    assert.deepEqual(f.run(mode.archived), expected, mode.name + ' archive / ' + f.name); comparisons++;
    assert.deepEqual(f.run(mode.current), expected, mode.name + ' current / ' + f.name); comparisons++;
  }
}
assert.equal(hosted.archived.canonical(-0), '0');
assert.equal(hosted.archived.canonical({ b: 1, a: 2 }), '{"a":2,"b":1}');
assert.throws(() => hosted.archived.canonical([,]), /finite JSON data/);
console.log('PASS canonical parity: ' + fixtures.length + ' fixtures / ' + comparisons +
  ' exact output/error/read-order comparisons; archive SHA256 ' + oracleHash + '; body SHA256 ' + bodyHash);

// Fresh shape of the JSON-clean snapshot returned by ecology's pieceState.
// Timed fresh workloads include construction below and the same checksum in both
// variants. The totals are fixed-work comparisons, not pure serializer timings.
const pieceSnapshot = (i: number) => ({
  pos: { x: (i % 32) * 96 + .25, y: Math.floor(i / 32) * 96 + .75 },
  kind: i % 2 ? 'tree' : 'rock', radius: 18 + i % 17, rot: (i % 628) / 100,
  ...(i % 4 === 0 ? { felled: { at: i / 60, wake: i / 60 + 120 } } : {}),
});
const flatTuple = (i: number): unknown[] => [0xddba11, 'worldmass/native-ecology-v1',
  JSON.stringify(['surface', String(i % 32 - 16), String(Math.floor(i / 32) - 16)]), i % 10 * 96, Math.floor(i / 10) % 10 * 96];
const corpus = [...Array.from({ length: 1024 }, (_, i) => flatTuple(i)),
  ...Array.from({ length: 1024 }, (_, i) => pieceSnapshot(i))];
const expectedTexts = corpus.map(v => hosted.archived.canonical(v));
for (const mode of modes) {
  assert.deepEqual(corpus.map(v => mode.current.canonical(v)), expectedTexts, mode.name + ' full workload byte parity');
  comparisons += corpus.length;
}
assert.deepEqual(corpus.map(v => actual.canonical(v)), expectedTexts, 'actual tsx full workload byte parity');
comparisons += corpus.length;
const workloadDigest = createHash('sha256').update(expectedTexts.join('\n')).digest('hex');

if (process.argv.includes('--bench')) {
  console.log('Canonical fixed-work metadata ' + JSON.stringify({
    freshInputConstructionIncluded: true, checksumIncluded: true, warmCertificateAndMemoSetupIncluded: false,
    actualTsx: 'correctness target only', timingTransforms: modes.map(mode => mode.name),
    runtime: 'Node V8; bundled code is not a browser-frame measurement', workloadDigest,
  }));
  const rows: { mode: string; workload: string; round: number; variant: string; count: number; ms: number; checksum: number }[] = [];
  for (const mode of modes) for (const workload of ['fresh-flat-tuples', 'fresh-ecology-snapshots', 'warm-certified-memo'] as const) {
    const inputs = {
      archived: Array.from({ length: 1024 }, (_, i) => mode.archived.freezeData(pieceSnapshot(i))),
      current: Array.from({ length: 1024 }, (_, i) => mode.current.freezeData(pieceSnapshot(i))),
    };
    if (workload === 'warm-certified-memo') for (const variant of ['archived', 'current'] as const)
      for (const input of inputs[variant]) mode[variant].canonical(input);
    const sample = (variant: 'archived' | 'current', i: number): unknown => workload === 'fresh-flat-tuples'
      ? flatTuple(i & 1023) : workload === 'fresh-ecology-snapshots' ? pieceSnapshot(i & 1023) : inputs[variant][i & 1023];
    for (const variant of ['archived', 'current'] as const)
      for (let i = 0; i < 8192; i++) mode[variant].canonical(sample(variant, i));
    const count = workload === 'warm-certified-memo' ? 262144 : 32768;
    for (let round = 0; round < 4; round++) for (const variant of round % 2 ? ['current', 'archived'] as const : ['archived', 'current'] as const) {
      const api = mode[variant], start = performance.now(); let checksum = 0;
      for (let i = 0; i < count; i++) {
        const text = api.canonical(sample(variant, i));
        checksum = (Math.imul(checksum, 33) ^ text.length ^ text.charCodeAt(i % text.length)) >>> 0;
      }
      rows.push({ mode: mode.name, workload, round, variant, count, ms: performance.now() - start, checksum });
    }
  }
  for (const mode of modes) for (const workload of ['fresh-flat-tuples', 'fresh-ecology-snapshots', 'warm-certified-memo'])
    assert.equal(new Set(rows.filter(r => r.mode === mode.name && r.workload === workload).map(r => r.checksum)).size, 1);
  console.log('Canonical fixed-work timing ' + JSON.stringify(rows));
}
console.log('PASS worldmass_canonicalwork: ' + comparisons + ' comparisons; workload SHA256 ' + workloadDigest +
  '; common bundles ' + hosted.bytes + '/' + minified.bytes + ' bytes; no timing gates; target ' + currentPath);
