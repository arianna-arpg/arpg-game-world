/** Owned sample-cache component oracle. The archived d4 scanner is independent;
 * current certification is composed with the proposed collection adapter only.
 * This probe performs no population, scheduling or gameplay-budget changes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import type { MassAddress } from '../src/worldmass/address';
import type { MassTerrain } from '../src/worldmass/contracts';
import { massDormancyPins } from '../src/worldmass/dormancy';
import { isOwnedTerrainRecord, ownedSampleEntry, ownedBaseTerrain, ownedTerrainSource } from '../src/worldmass/ownedTerrain';
import { OwnedDependencyCache, scanOwnedDependencyCache, installMassDependencyCacheDefault, massDependencyCacheDefault } from '../src/worldmass/ownedDependencyCache';
import { MassStream } from '../src/worldmass/stream';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
// Read this pinned literal as data; never import/run the neighboring probe.
const archiveFile = readFileSync(new URL('./probe_worldmass_ownedterrain.ts', import.meta.url), 'utf8');
const archiveMatch = archiveFile.match(/const archivedSource = String\.raw`([\s\S]*?)`;/);
assert.ok(archiveMatch, 'independent scanner archive must exist');
const archive = archiveMatch[1].replace(/\r/g, '');
assert.equal(sha(archive), 'cdefd768157d93d66e13b859def2bc60b490b5a1dd67a087728ef622db246acc');
const currentFile = readFileSync(new URL('../src/worldmass/dormancy.ts', import.meta.url), 'utf8');
function declarations(source: string, names: Set<string>): string {
  const tree = ts.createSourceFile('scanner.ts', source, ts.ScriptTarget.Latest, true);
  return tree.statements.flatMap(statement => {
    if (ts.isFunctionDeclaration(statement) && statement.name && names.has(statement.name.text))
      return [statement.getText(tree)];
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(row => names.has(row.name.getText(tree))))
      return [statement.getText(tree)];
    return [];
  }).join('\n');
}
const helper = declarations(currentFile,
  new Set(['entityKeys', 'dependencyKeys', 'dependencyFreeData', 'isDependencyFreeData']));
const originalVisit = declarations(archive, new Set(['massDormancyPins']));
const entryBody = "if(typeof k==='number'){const a=ids.get(k);if(a)pinned.add(a);}else if(k!==null&&typeof k==='object')visit(k);if(v!==null&&typeof v==='object')visit(v);";
assert.ok(originalVisit.includes(entryBody), 'archive Map callback stays exact');
const bridge = 'if(scanOwnedDependencyCache(value,(k,v)=>{entryVisits++;' + entryBody + '},certificate))return;';
assert.equal(originalVisit.split('seen.add(value);').length, 2);
const composedVisit = originalVisit.replace('seen.add(value);', 'seen.add(value);\n    ' + bridge);

type Scan = (world: World, owned: ReadonlyMap<string, Actor>, excluded?: ReadonlySet<object>) => Set<Actor>;
interface Cache extends Iterable<[unknown, unknown]> {
  readonly size: number;
  get(key: unknown): unknown;
  has(key: unknown): boolean;
  set(key: unknown, value: unknown): Cache;
  promote?(key: unknown): boolean;
  delete(key: unknown): boolean;
  clear(): void;
  keys(): Iterator<unknown>;
}
function promote(cache: Cache, key: unknown): boolean {
  if (cache.promote) return cache.promote(key);
  const value = cache.get(key);
  if (value === undefined && !cache.has(key)) return false;
  cache.delete(key); cache.set(key, value);
  return true;
}
interface Api { scan: Scan; cache(): Cache; entryVisits(): number }
function compile(source: string, frontier: boolean): () => Api {
  const body = source.replace(/^export /gm, '')
    + '\nconst certificate=(value:object)=>dependencyFreeData.has(value);'
    + '\nreturn {scan:massDormancyPins,entryVisits:()=>entryVisits};';
  const js = ts.transpileModule('let entryVisits=0;\n' + body,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const build = new Function('Actor', 'isOwnedTerrainRecord', 'scanOwnedDependencyCache', js);
  return () => ({ ...build(Actor, isOwnedTerrainRecord, scanOwnedDependencyCache),
    cache: () => frontier ? new OwnedDependencyCache<unknown, unknown>() : new Map<unknown, unknown>() }) as Api;
}
const factories = {
  archived: compile(archive, false),
  currentMap: compile(helper + '\n' + originalVisit, false),
  frontier: compile(helper + '\n' + composedVisit, true),
};
assert.ok(currentFile.includes('scanOwnedDependencyCache('),
  'the actual production scanner must integrate the owned-cache adapter');
const actualApi = (): Api => ({ scan: massDormancyPins,
  cache: () => new OwnedDependencyCache<unknown, unknown>(), entryVisits: () => 0 });
const actors = Array.from({ length: 12 }, (_, i) => new Actor('dependency cache proof ' + i, 'enemy', { x: 0, y: 0 }));
const owners = new Map(actors.map((actor, i) => ['native/' + i, actor]));
const worldOf = (roots: object) => ({ actors: [], ...roots }) as unknown as World;
const wrap = (value: unknown) => ownedSampleEntry(value as MassTerrain, 0);
const pure = () => wrap(Object.freeze({ fields: Object.freeze({ elevation: 0.4 }), region: 'grass' }));
const ids = (pins: Set<Actor>) => [...pins].map(actor => actor.id);
type Outcome = { pins: number[] } | { error: string };
function outcome(api: Api, world: World, native = owners, excluded?: ReadonlySet<object>): Outcome {
  try { return { pins: ids(api.scan(world, native, excluded)) }; }
  catch (error) { assert.ok(error instanceof Error); return { error: error.name + ':' + error.message }; }
}
function observed<T extends object>(target: T, tape: string[], label: string): T {
  return new Proxy(target, {
    getPrototypeOf(value) { tape.push(label + ':prototype'); return Reflect.getPrototypeOf(value); },
    isExtensible(value) { tape.push(label + ':extensible'); return Reflect.isExtensible(value); },
    ownKeys(value) { tape.push(label + ':keys'); return Reflect.ownKeys(value); },
    getOwnPropertyDescriptor(value, key) { tape.push(label + ':descriptor:' + String(key)); return Reflect.getOwnPropertyDescriptor(value, key); },
    get(value, key, receiver) { tape.push(label + ':get:' + String(key)); return Reflect.get(value, key, receiver); },
  });
}
interface Fixture {
  world: World; tape: string[];
  before?(iteration: number): void;
  native?(iteration: number): Map<string, Actor>;
  excluded?(iteration: number): ReadonlySet<object>;
  expected?(iteration: number): Outcome;
  verify?(iteration: number, result: Outcome): void;
}
let cases = 0, comparisons = 0;
// Selection is execution policy, captured once. These constructor-only inputs
// isolate that choice from generation and do not alter any run/save contract.
{
  const previous = massDependencyCacheDefault();
  assert.equal(previous, false, 'ordinary module default is native Map');
  const run = Object.freeze({ seed: 7 });
  const generator = { run, spec: { addressSpan: 960, terrainCell: 24 } } as unknown as ConstructorParameters<typeof MassStream>[0];
  const state = { run } as unknown as ConstructorParameters<typeof MassStream>[1];
  const create = (dependencyCache?: boolean) => new MassStream(generator, state,
    { maxPages: 1, maxSamples: 8, ...(dependencyCache === undefined ? {} : { dependencyCache }) });
  const storage = (stream: MassStream): unknown => Reflect.get(stream, 'samples');
  try {
    const ordinary = create(), explicitOwned = create(true), explicitMap = create(false);
    const ordinaryStorage = storage(ordinary), ownedStorage = storage(explicitOwned);
    assert.ok(ordinaryStorage instanceof Map);
    assert.ok(ownedStorage instanceof OwnedDependencyCache);
    assert.ok(storage(explicitMap) instanceof Map);
    installMassDependencyCacheDefault(true);
    const inheritedOwned = create();
    const inheritedStorage = storage(inheritedOwned);
    assert.ok(inheritedStorage instanceof OwnedDependencyCache);
    assert.ok(storage(create(false)) instanceof Map, 'explicit false wins over enabled process default');
    assert.equal(storage(ordinary), ordinaryStorage, 'changing default cannot replace an existing Map');
    assert.equal(storage(explicitOwned), ownedStorage);
    installMassDependencyCacheDefault(false);
    assert.ok(storage(create()) instanceof Map);
    assert.ok(storage(create(true)) instanceof OwnedDependencyCache, 'explicit true wins over disabled process default');
    assert.equal(storage(inheritedOwned), inheritedStorage, 'changing default cannot replace an existing owned cache');
    assert.equal(Object.hasOwn(run, 'dependencyCache'), false, 'choice is not stored in the run');
    cases++; comparisons++;
  } finally { installMassDependencyCacheDefault(previous); }
}
function check(label: string, build: (api: Api) => Fixture, rounds = 4): void {
  for (const make of [factories.currentMap, factories.frontier, actualApi]) {
    const a = factories.archived(), b = make(), prior = build(a), next = build(b);
    for (let iteration = 0; iteration < rounds; iteration++) {
      prior.before?.(iteration); next.before?.(iteration);
      prior.tape.length = 0; next.tape.length = 0;
      const expected = outcome(a, prior.world, prior.native?.(iteration), prior.excluded?.(iteration));
      const actual = outcome(b, next.world, next.native?.(iteration), next.excluded?.(iteration));
      assert.deepEqual(actual, expected, label + ': outcome ' + iteration);
      assert.deepEqual(next.tape, prior.tape, label + ': read/error order ' + iteration);
      if (next.expected) assert.deepEqual(actual, next.expected(iteration), label + ': positive assertion');
      prior.verify?.(iteration, expected); next.verify?.(iteration, actual);
      comparisons++;
    }
  }
  cases++;
}

// Ordinary Map API: insertion order, SameValueZero, live iterators and return values.
{
  const map = new Map<unknown, unknown>(), cache = new OwnedDependencyCache<unknown, unknown>();
  const keys = [NaN, -0, 'x', {}, Symbol('key'), null, undefined];
  for (const [i, key] of keys.entries()) { assert.equal(map.set(key, i), map); assert.equal(cache.set(key, i), cache); }
  assert.deepEqual([...cache], [...map]); assert.equal(cache.size, map.size);
  for (const key of keys) { assert.equal(cache.get(key), map.get(key)); assert.equal(cache.has(key), map.has(key)); }
  for (const method of ['keys', 'values', 'entries'] as const) {
    const a = map[method](), b = cache[method]();
    assert.deepEqual(b.next(), a.next());
    map.set('x', 77); cache.set('x', 77);
    map.delete(-0); cache.delete(-0);
    map.set('new/' + method, 88); cache.set('new/' + method, 88);
    assert.deepEqual([...b], [...a]);
    assert.deepEqual(b.next(), a.next());
  }
  const a = map.entries(), b = cache.entries();
  assert.deepEqual(b.next(), a.next()); map.clear(); cache.clear();
  map.set('after-clear', 7); cache.set('after-clear', 7);
  assert.deepEqual([...b], [...a]);
  assert.equal(cache.delete('missing'), map.delete('missing'));
  assert.equal(cache.delete('after-clear'), map.delete('after-clear'));
  for (const [key, value] of [[undefined, undefined], ['present', 1], [NaN, undefined], [keys[3], 2]] as const) {
    map.set(key, value); cache.set(key, value);
  }
  const promotedMapIterator = map.entries(), promotedCacheIterator = cache.entries();
  assert.deepEqual(promotedCacheIterator.next(), promotedMapIterator.next());
  for (const key of [undefined, keys[3], NaN, 'missing', undefined, 'present']) {
    assert.equal(cache.promote(key), promote(map, key));
    assert.deepEqual([...cache], [...map], 'atomic promotion preserves exact order and undefined values');
  }
  assert.deepEqual([...promotedCacheIterator], [...promotedMapIterator], 'iterators observe native reinsertion order');
  for (const method of [Map.prototype.set, Map.prototype.delete, Map.prototype.clear])
    assert.throws(() => Reflect.apply(method, cache, ['bypass', actors[0]]), TypeError);
  assert.deepEqual(Reflect.ownKeys(cache), [], 'private backing storage must not escape');
  for (const unknown of [{}, Object.create(OwnedDependencyCache.prototype), new Proxy(cache, {})])
    assert.equal(scanOwnedDependencyCache(unknown, () => assert.fail('unregistered scan'), () => true), false);
  cases++; comparisons++;
}

check('unknown values, numeric/object keys, aliases and cycles', api => {
  const cache = api.cache(), tape: string[] = [], cycle: Record<string, unknown> = { ownerId: actors[4].id };
  cycle.self = cycle; Object.freeze(cycle);
  const dynamic = Object.freeze(Object.defineProperty({}, 'actor', { enumerable: true,
    get() { tape.push('dynamic'); return actors[3]; } }));
  cache.set('pure', pure()).set(actors[0].id, pure()).set({ targetId: actors[1].id }, pure())
    .set('direct', actors[2]).set('getter', wrap(dynamic)).set('alias', dynamic).set('cycle', wrap(cycle))
    .set('weak', new WeakMap([[actors[5], true]])).set('set', new Set([actors[6].id]))
    .set('map', new Map([[actors[7].id, true]]));
  for (const value of [null, undefined, 0, NaN, Infinity, true, 'x', 1n, Symbol('v'), Object.assign(() => 0, { ownerId: actors[8].id })])
    cache.set(Symbol(), value);
  return { world: worldOf({ cache }), tape, expected: () => ({ pins: actors.slice(0, 8).map(a => a.id) }) };
});

check('late numeric owner and mutable child inside owned wrapper', api => {
  const cache = api.cache(), child: Record<string, unknown> = {}, tape: string[] = [];
  cache.set('future', wrap(Object.freeze({ targetId: actors[9].id }))).set('mutable', wrap(child));
  return { world: worldOf({ cache }), tape,
    before(i) { if (i === 1) child.ownerId = actors[10].id; },
    native: i => i === 0 ? new Map([...owners].filter(([, actor]) => actor !== actors[9])) : owners,
    expected: i => ({ pins: i === 0 ? [] : [actors[9].id, actors[10].id] }) };
});

check('excluded row cannot acquire an unearned certificate', api => {
  const cache = api.cache(), tape: string[] = [], row = wrap(Object.freeze({ ownerId: actors[0].id }));
  cache.set('row', row);
  return { world: worldOf({ cache }), tape,
    excluded: i => i === 0 ? new Set([row]) : new Set(),
    expected: i => ({ pins: i === 0 ? [] : [actors[0].id] }) };
});

check('certified proxy still takes ordinary instanceof and fallback guards', api => {
  const cache = api.cache(), tape: string[] = [];
  cache.set('proxy', observed(Object.freeze({ scalar: 1 }), tape, 'proxy'))
    .set('wrapped', wrap(observed(Object.freeze({ scalar: 2 }), tape, 'child')));
  return { world: worldOf({ cache }), tape, expected: () => ({ pins: [] }),
    verify(i) { if (i) assert.ok(tape.includes('proxy:prototype'), 'an unowned Proxy cannot be omitted'); } };
});

for (const mutation of ['earlier', 'later', 'current', 'reinsert-earlier', 'delete-later', 'append', 'clear'] as const) {
  check('live Map mutation: ' + mutation, api => {
    const cache = api.cache(), tape: string[] = [];
    let phase = 0, changed = false;
    const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
      tape.push('trigger:' + phase);
      if (phase === 1 && !changed) {
        changed = true;
        if (mutation === 'earlier') cache.set('earlier', actors[0]);
        if (mutation === 'later') cache.set('later', actors[1]);
        if (mutation === 'current') cache.set('trigger', actors[2]);
        if (mutation === 'reinsert-earlier') { cache.delete('earlier'); cache.set('earlier', actors[3]); }
        if (mutation === 'delete-later') cache.delete('later');
        if (mutation === 'append') cache.set('new', actors[4]);
        if (mutation === 'clear') { cache.clear(); cache.set('after-clear', actors[5]); }
      }
      return actors[6];
    } });
    cache.set('earlier', pure()).set('trigger', trigger).set('later', pure()).set('tail', actors[7]);
    return { world: worldOf({ cache }), tape, before(i) { phase = i; } };
  });
}

for (const mutationPhase of [0, 1]) for (const triggerKey of ['trigger', NaN]) {
  check('live iterator transition after current deletion: ' + mutationPhase + '/' + String(triggerKey), api => {
    const cache = api.cache(), tape: string[] = [];
    let phase = 0, changed = false;
    const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
      tape.push('trigger:' + phase);
      if (phase === mutationPhase && !changed) {
        changed = true;
        cache.delete(triggerKey);
        cache.set('earlier', actors[0]);
        cache.set(triggerKey, actors[1]);
        cache.set('later', actors[2]);
      }
      return actors[3];
    } });
    cache.set('earlier', pure()).set(triggerKey, trigger).set('later', pure()).set('tail', actors[7]);
    return { world: worldOf({ cache }), tape, before(i) { phase = i; },
      expected: i => ({ pins: (i < mutationPhase ? [3, 7] : i === mutationPhase ? [3, 2, 7, 1] : [0, 2, 7, 1])
        .map(index => actors[index].id) }) };
  });
}

check('promotion, replacement, eviction and shrink between scans', api => {
  const cache = api.cache(), tape: string[] = [], first = pure();
  cache.set('a', first).set('b', pure()).set('c', pure());
  return { world: worldOf({ cache }), tape, before(i) {
    if (i === 1) { cache.delete('a'); cache.set('a', first); cache.set('b', wrap({ ownerId: actors[0].id })); }
    if (i === 2) { cache.delete('b'); cache.set('c', wrap(Object.freeze({ targetId: actors[1].id }))); }
    if (i === 3) { cache.clear(); cache.set('restored', actors[2]); }
  }, expected: i => ({ pins: i === 0 ? [] : [actors[i - 1].id] }) };
});

for (const promotionPhase of [0, 1]) for (const position of ['earlier', 'trigger', 'later', 'numeric', 'object', 'undefined', 'missing'] as const) {
  check('atomic promotion during scan: ' + promotionPhase + '/' + position, api => {
    const cache = api.cache(), tape: string[] = [], objectKey = Object.freeze({ targetId: actors[2].id });
    const targets = { earlier: 'earlier', trigger: 'trigger', later: 'later', numeric: actors[1].id,
      object: objectKey, undefined: 'undefined', missing: 'missing' };
    let phase = 0, changed = false;
    const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
      tape.push('trigger:' + phase);
      if (phase === promotionPhase && !changed) {
        changed = true;
        tape.push('promoted:' + promote(cache, targets[position]));
      }
      return actors[0];
    } });
    const alias = pure();
    cache.set('earlier', alias).set('trigger', trigger).set('later', alias)
      .set(actors[1].id, pure()).set(objectKey, pure()).set('undefined', undefined).set('tail', actors[3]);
    return { world: worldOf({ cache }), tape, before(i) { phase = i; },
      verify() { assert.equal(cache.has('missing'), false); assert.equal(cache.has('undefined'), true); } };
  });
}

for (const promotionPhase of [0, 1]) check('atomic promotion with nested scan: ' + promotionPhase, api => {
  const cache = api.cache(), tape: string[] = [];
  let phase = 0, inside = false, changed = false, world: World;
  const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
    tape.push(inside ? 'inner' : 'outer');
    if (phase === promotionPhase && !changed) {
      changed = true;
      tape.push('promote current:' + promote(cache, 'trigger'));
      tape.push('promote current again:' + promote(cache, 'trigger'));
      inside = true;
      try { tape.push('nested pins:' + ids(api.scan(world, owners)).join(',')); }
      finally { inside = false; }
      tape.push('promote earlier:' + promote(cache, 'first'));
    }
    return actors[0];
  } });
  cache.set('first', pure()).set('trigger', trigger).set('tail', actors[1]);
  world = worldOf({ cache });
  return { world, tape, before(i) { phase = i; } };
});

check('throw after partial classification, then recover', api => {
  const cache = api.cache(), tape: string[] = []; let phase = 0;
  const throwing = Object.defineProperty({}, 'actor', { enumerable: true, get() {
    tape.push('throwing:' + phase);
    if (phase === 0) { cache.set('before', actors[0]); throw Error('expected dependency read'); }
    return actors[1];
  } });
  cache.set('before', pure()).set('throwing', throwing).set('after', actors[2]);
  return { world: worldOf({ cache }), tape, before(i) { phase = i; },
    expected: i => i === 0 ? { error: 'Error:expected dependency read' } : { pins: actors.slice(0, 3).map(a => a.id) } };
});

check('descriptor refusal throws and recovers without a stale frontier', api => {
  const cache = api.cache(), tape: string[] = []; let phase = 0;
  const proxy = new Proxy(Object.freeze({ child: Object.freeze({ scalar: 1 }) }), {
    getPrototypeOf(target) { tape.push('prototype'); return Reflect.getPrototypeOf(target); },
    isExtensible(target) { tape.push('extensible'); return Reflect.isExtensible(target); },
    ownKeys(target) { tape.push('keys'); return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      tape.push('descriptor:' + String(key));
      if (phase === 0) throw Error('expected descriptor refusal');
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) { tape.push('get:' + String(key)); return Reflect.get(target, key, receiver); },
  });
  cache.set('before', pure()).set('row', wrap(proxy)).set('after', actors[0]);
  return { world: worldOf({ cache }), tape, before(i) { phase = i; },
    expected: i => i === 0 ? { error: 'Error:expected descriptor refusal' } : { pins: [actors[0].id] } };
});

for (const reentryPhase of [0, 1]) check('nested scan and mutation from a getter: ' + reentryPhase, api => {
  const cache = api.cache(), tape: string[] = []; let phase = 0, inside = false, world: World;
  const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
    tape.push(inside ? 'inner' : 'outer');
    if (!inside && phase === reentryPhase) {
      inside = true;
      try { cache.set('later', actors[0]); tape.push('pins:' + ids(api.scan(world, owners)).join(',')); }
      finally { inside = false; }
    }
    return actors[1];
  } });
  cache.set('first', pure()).set('trigger', trigger).set('later', pure()).set('tail', actors[2]);
  world = worldOf({ cache });
  return { world, tape, before(i) { phase = i; } };
});

for (const reentryPhase of [0, 1]) check('fresh certificate domain during a scan callback: ' + reentryPhase, api => {
  const cache = api.cache(), nested = factories.frontier(), tape: string[] = [];
  let phase = 0, inside = false, changed = false, world: World;
  const trigger = Object.defineProperty({}, 'actor', { enumerable: true, get() {
    tape.push(inside ? 'inner' : 'outer');
    if (!inside && phase === reentryPhase && !changed) {
      changed = true; inside = true;
      try { tape.push('nested pins:' + ids(nested.scan(world, owners)).join(',')); }
      finally { inside = false; }
    }
    return actors[1];
  } });
  const tail = Object.defineProperty({}, 'actor', { enumerable: true, get() {
    tape.push(inside ? 'inner tail' : 'outer tail');
    return actors[2];
  } });
  cache.set('first', pure()).set('trigger', trigger).set('omitted', pure()).set('tail', tail);
  world = worldOf({ cache });
  return { world, tape, before(i) { phase = i; }, expected: () => ({ pins: [actors[1].id, actors[2].id] }) };
});

check('later parent certifies an earlier budget-refused wrapper before alias promotion', api => {
  const cache = api.cache(), tape: string[] = [];
  const leaves = Array.from({ length: 4096 }, (_, i) => Object.freeze({ scalar: i }));
  leaves.push(observed(Object.freeze({ scalar: 4096 }), tape, 'budget leaf'));
  const row = wrap(Object.freeze(leaves));
  // The first wrapper exceeds the recursive budget; ordinary fallback then
  // certifies its array. A later parent can certify that wrapper before its
  // final alias's entry callback observes the permanent certificate. An inline
  // frontier may retain the earlier alias for one extra warm certificate hit.
  cache.set('early', row).set('parent', wrap(Object.freeze({ row })))
    .set('late', row).set('tail', actors[0]);
  return { world: worldOf({ cache }), tape, expected: () => ({ pins: [actors[0].id] }),
    before(i) { if (i === 1) assert.equal(promote(cache, 'early'), true); },
    verify(i) {
      if (i === 0) assert.ok(tape.includes('budget leaf:keys'), 'cold fallback must really inspect the Proxy leaf');
      else {
        assert.deepEqual(tape, [], 'retained certified aliases must not repeat any Proxy operations');
        assert.deepEqual([...cache].map(([key]) => key), ['parent', 'late', 'tail', 'early']);
      }
    } };
});

for (const count of [4094, 4095, 4096, 4100]) {
  check('recursive work budget ' + count, api => {
    const cache = api.cache(), tape: string[] = [];
    const child = Object.freeze(Array.from({ length: count }, (_, i) => Object.freeze({ scalar: i })));
    const row = wrap(child);
    cache.set('row', row);
    const ancestor = observed(Object.freeze({ child: row }), tape, 'ancestor');
    return { world: worldOf({ cache, ancestor, later: Object.freeze({ ownerId: actors[0].id }) }), tape,
      expected: () => ({ pins: [actors[0].id] }) };
  }, 3);
}
for (const depth of [63, 64, 65, 70]) {
  check('recursive depth budget ' + depth, api => {
    const cache = api.cache(), tape: string[] = [];
    let child: object = Object.freeze({ targetId: actors[0].id });
    for (let i = 0; i < depth; i++) child = Object.freeze({ child });
    cache.set('row', wrap(child));
    return { world: worldOf({ cache }), tape, expected: () => ({ pins: [actors[0].id] }) };
  }, 3);
}

// A cache cannot carry another scanner's positive classifications into a fresh
// certificate WeakSet. Neither a fresh domain nor a reentrant scan sees a partly
// published frontier. This checks callback counts as well as returned pins.
{
  const cache = new OwnedDependencyCache<unknown, unknown>();
  for (let i = 0; i < 128; i++) cache.set(String(i), pure());
  const world = worldOf({ cache }), first = factories.frontier(), second = factories.frontier();
  assert.deepEqual(outcome(first, world), { pins: [] }); assert.equal(first.entryVisits(), 128);
  assert.deepEqual(outcome(first, world), { pins: [] }); assert.equal(first.entryVisits(), 128, 'warm frontier is empty');
  assert.deepEqual(outcome(second, world), { pins: [] }); assert.equal(second.entryVisits(), 128, 'fresh domain still performs cold certification');
  assert.deepEqual(outcome(first, world), { pins: [] }); assert.equal(first.entryVisits(), 256, 'domain replacement restores complete enumeration');
  const row = cache.get('0'); cache.delete('0'); cache.set('0', row);
  assert.deepEqual(outcome(first, world), { pins: [] }); assert.equal(first.entryVisits(), 256, 'same-wrapper promotion preserves approval');
  cache.set('new', pure()); assert.deepEqual(outcome(first, world), { pins: [] }); assert.equal(first.entryVisits(), 257);
  cache.set('0', actors[0]); assert.deepEqual(outcome(first, world), { pins: [actors[0].id] });
  cache.clear(); assert.deepEqual(outcome(first, world), { pins: [] });
  cases++; comparisons += 8;
}

// Independent pre-promotion MassStream.sample method from 9d0263e8. The fake
// generator/state isolate observable call order, failures and LRU publication;
// the candidate invokes the actual production method against its real cache.
const archivedSample = String.raw`sample(at: MassAddress): MassTerrain {
    this.syncChanges();
    const p = this.state.atCell(at), key = this.state.key(p);
    const revision = this.revisionAt(p), hit = this.samples.get(key);
    if (hit?.revision === revision) { this.samples.delete(key); this.samples.set(key, hit); return this.overlay?.sample(at, hit.terrain) ?? hit.terrain; }
    const half = this.generator.spec.terrainCell / 2;
    const base = this.generator.terrainAt({ ...p, x: p.x + half, y: p.y + half });
    const patch = this.state.patchAt(p);
    const result: MassTerrain = patch ? Object.freeze({ ...base, region: patch.region, color: patch.color,
      source: Object.freeze({ ...base.source, rule: 'terrain-change', source: patch.cause }) }) : base;
    this.samples.delete(key); this.samples.set(key, ownedSampleEntry(result, revision));
    if (this.samples.size > this.focusSampleBudget) this.samples.delete(this.samples.keys().next().value!);
    return this.overlay?.sample(at,result) ?? result;
  }`;
{
  const source = ts.transpileModule('return {' + archivedSample + '}.sample;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const originalSample = new Function('ownedSampleEntry', source)(ownedSampleEntry) as typeof MassStream.prototype.sample;
  const terrainSource = ownedTerrainSource('sample-promotion-oracle', 1, 'base', 'grass', 'geography');
  const terrain = Array.from({ length: 4 }, (_, index) =>
    ownedBaseTerrain('grass', '#688044', 'plain', Object.freeze({ elevation: index / 4 }), terrainSource));
  for (const scenario of [
    { name: 'valid repeated hit', key: 0, revision: 0, generationThrows: false, overlayThrows: false, repeats: 2, promotions: 2 },
    { name: 'valid hit then overlay failure', key: 0, revision: 0, generationThrows: false, overlayThrows: true, repeats: 1, promotions: 1 },
    { name: 'stale hit then generation failure', key: 0, revision: 1, generationThrows: true, overlayThrows: false, repeats: 1, promotions: 0 },
    { name: 'missing then generation failure', key: 3, revision: 0, generationThrows: true, overlayThrows: false, repeats: 1, promotions: 0 },
    { name: 'stale regeneration then overlay failure', key: 0, revision: 1, generationThrows: false, overlayThrows: true, repeats: 1, promotions: 0 },
  ]) {
    const runSample = (mode: 'original' | 'map' | 'owned') => {
      const candidate = mode !== 'original', owned = mode === 'owned';
      const samples: Cache = owned ? new OwnedDependencyCache<unknown, unknown>() : new Map<unknown, unknown>();
      const tape: string[] = [], results: unknown[] = [];
      let promotions = 0;
      if (owned) {
        const atomic = samples.promote!.bind(samples);
        samples.promote = key => { promotions++; return atomic(key); };
      }
      for (let i = 0; i < 3; i++) samples.set(String(i), ownedSampleEntry(terrain[i], 0));
      const context = {
        samples, focusSampleBudget: 3,
        syncChanges() { tape.push('sync'); },
        revisionAt() { tape.push('revision'); return scenario.revision; },
        state: {
          atCell(at: MassAddress) { tape.push('cell'); return at; },
          key(at: MassAddress) { tape.push('key'); return String(at.x); },
          patchAt() { tape.push('patch'); return undefined; },
        },
        generator: { spec: { terrainCell: 2 }, terrainAt(at: MassAddress) {
          tape.push('terrain:' + at.x + ',' + at.y);
          if (scenario.generationThrows) throw Error('sample generation failure');
          return terrain[3];
        } },
        overlay: { sample(_at: MassAddress, base: MassTerrain) {
          tape.push('overlay');
          if (scenario.overlayThrows) throw Error('sample overlay failure');
          return base;
        } },
      };
      for (let i = 0; i < scenario.repeats; i++) {
        try {
          const value = (candidate ? MassStream.prototype.sample : originalSample).call(context as unknown as MassStream,
            { dimension: 'surface', cx: '0', cy: '0', x: scenario.key, y: 0 } as MassAddress);
          assert.ok(terrain.includes(value), 'sample returns the exact generated/cached terrain identity');
          results.push({ terrain: terrain.indexOf(value) });
        } catch (error) {
          assert.ok(error instanceof Error); results.push({ error: error.name + ':' + error.message });
        }
      }
      assert.equal(promotions, owned ? scenario.promotions : 0, scenario.name + ': only opted-in valid hits use atomic promotion');
      return { tape, results, entries: [...samples] };
    };
    const original = runSample('original');
    assert.deepEqual(runSample('map'), original, 'actual default Map sample branch: ' + scenario.name);
    assert.deepEqual(runSample('owned'), original, 'actual opted-in sample branch: ' + scenario.name);
    cases++; comparisons += 2;
  }
}

const report: Record<string, unknown> = { result: 'PASS', cases, comparisons,
  variant: 'atomic-existing-entry-promotion-v4',
  archiveSha256: sha(archive), currentHelperSha256: sha(helper),
  archivedSampleSha256: sha(archivedSample),
  productionScannerSha256: sha(currentFile),
  componentSha256: sha(readFileSync(new URL('../src/worldmass/ownedDependencyCache.ts', import.meta.url), 'utf8')),
  ownerBoundary: 'The private stream cache must be reached by its exact identity. A Proxy around the cache owner is unsupported: registration misses and generic reflection cannot discover its private storage. Proxy keys/values remain covered by exact fallback. No production caller wraps the private sample cache.',
  method: 'Independent archived scanner vs current helper on ordinary Maps, composed cache adapter and actual production scanner. Ordered pins, getter/Proxy/error tapes, live mutation, reentry, cold/warm/fresh certificate domains, Map API and original4096/64 limits. Whole-course timings are separate.' };
console.log(JSON.stringify(report));

if (process.argv.includes('--bench')) {
  const tagAt = process.argv.indexOf('--tag'), tag = tagAt < 0 ? '' : process.argv[tagAt + 1];
  assert.ok(tag && /^[a-z0-9-]+$/.test(tag), 'use a fresh --tag for each benchmark receipt');
  const actualSource = declarations(currentFile, new Set(['entityKeys', 'dependencyKeys', 'dependencyFreeData',
    'hasDependencyFreeCertificate', 'isDependencyFreeData', 'massDormancyPins']));
  // Both scanner bodies use the same transform. The candidate cache is the
  // actual imported implementation; the control is the original native Map.
  const benchFactories = { map: factories.currentMap, frontier: compile(actualSource, true) };
  const capacity = 32768, blocks = 16, accessesPerBlock = 4096, additionsPerBlock = 64;
  function terrainEntry(index: number) {
    const fields: Record<string, number> = Object.create(null) as Record<string, number>;
    fields.elevation = (index % 997) / 997; fields.wetness = (index % 311) / 311;
    const source = ownedTerrainSource('benchmark-terrain', 1, 'base', 'grass', 'geography');
    return ownedSampleEntry(ownedBaseTerrain('grass', '#688044', 'plain', Object.freeze(fields), source), 0);
  }
  type Kind = keyof typeof benchFactories;
  const run = (kind: Kind, pattern: 'contiguous' | 'interleaved', count = capacity,
    repetitions = blocks, accesses = accessesPerBlock, additions = additionsPerBlock) => {
    const start = performance.now(), api = benchFactories[kind](), cache = api.cache();
    for (let i = 0; i < count; i++) cache.set(String(i), terrainEntry(i));
    const world = worldOf({ cache, live: { actor: actors[0], targetId: actors[1].id } });
    const constructed = performance.now();
    const results: Set<Actor>[] = [api.scan(world, owners)], coldDone = performance.now();
    const warmMs: number[] = [], accessMs: number[] = [], adoptionMs: number[] = [];
    let hits = 0, misses = 0, checksum = 0;
    for (let block = 0; block < repetitions; block++) {
      const accessStart = performance.now();
      for (let i = 0; i < accesses; i++) {
        const n = block * accesses + i;
        const index = (pattern === 'interleaved' ? n * 73 : n) % count;
        const key = String(index), hit = cache.get(key);
        let value = hit;
        if (value === undefined) { value = terrainEntry(index); misses++; }
        else hits++;
        checksum += (value as ReturnType<typeof terrainEntry>).terrain.fields.elevation;
        if (hit !== undefined && kind === 'frontier') cache.promote!(key);
        else { cache.delete(key); cache.set(key, value); }
        if (cache.size > count) cache.delete(cache.keys().next().value);
      }
      accessMs.push(performance.now() - accessStart);
      const adoptionStart = performance.now();
      for (let i = 0; i < additions; i++) {
        const index = count + block * additions + i, key = 'adopt/' + index;
        cache.delete(key); cache.set(key, terrainEntry(index));
        if (cache.size > count) cache.delete(cache.keys().next().value);
      }
      adoptionMs.push(performance.now() - adoptionStart);
      const scanStart = performance.now(); results.push(api.scan(world, owners));
      warmMs.push(performance.now() - scanStart);
    }
    const totalMs = performance.now() - start;
    for (const pins of results) assert.deepEqual(ids(pins), [actors[0].id, actors[1].id]);
    assert.equal(cache.size, count);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    return { totalMs, constructionMs: constructed - start, coldMs: coldDone - constructed,
      accessMs: sum(accessMs), adoptionMs: sum(adoptionMs), warmMs: sum(warmMs),
      maxWarmMs: Math.max(...warmMs), maxAccessBlockMs: Math.max(...accessMs),
      maxAdoptionBlockMs: Math.max(...adoptionMs), blocks: { warmMs, accessMs, adoptionMs },
      hits, misses, checksum, size: cache.size,
      digest: sha(JSON.stringify({ pins: results.map(ids), entries: [...cache], hits, misses, checksum })) };
  };
  // Equal small JIT exposure; each measured run still owns fresh rows, scanner
  // certificates, cache storage and frontier. No measured cache is prewarmed.
  for (const kind of ['map', 'frontier'] as const) run(kind, 'interleaved', 256, 2, 128, 4);
  const rows: object[] = [];
  const modes = process.argv.includes('--resident-only') ? ['resident'] as const : ['resident', 'admission'] as const;
  for (const mode of modes) for (const pattern of ['contiguous', 'interleaved'] as const) for (let round = 0; round < 4; round++) {
      const order = round % 2 === 0 ? ['map', 'frontier'] as const : ['frontier', 'map'] as const;
      const pair = {} as Record<Kind, ReturnType<typeof run>>;
      for (const kind of order) pair[kind] = run(kind, pattern, capacity, blocks, accessesPerBlock,
        mode === 'resident' ? 0 : additionsPerBlock);
      assert.equal(pair.frontier.digest, pair.map.digest, 'complete cache contents/order, pins and query work must agree');
      if (mode === 'resident') {
        assert.equal(pair.map.misses, 0); assert.equal(pair.frontier.misses, 0);
        assert.equal(pair.map.hits, blocks * accessesPerBlock);
      }
      const row = { mode, pattern, round, order, ...pair }; rows.push(row); console.log(JSON.stringify(row));
    }
  Object.assign(report, { tag, benchmark: {
    method: 'Four alternating fresh-run pairs per labeled mode/access pattern. Complete cost includes scanner creation,32768 fresh terrain/source/field/wrapper records, cache construction, one cold scan,65536 LRU accesses and16 subsequent scans. Control hits use original get/delete/set; candidate hits use get then the production promote method. Misses and admissions still use delete/set on both sides. Resident mode has zero admissions/evictions and asserts every access hits. Admission mode additionally inserts1024 fresh values with bounded eviction; its scans contain substantial fresh certification and must not be described as warm-resident scans. Baseline uses the current certificate helper and original Map traversal; candidate uses the actual integrated scanner source and imported facade. Both scanners share one ES2022 transform. Compilation, equal small JIT exposure, verification and complete digest computation are outside clocks. This is a terrain-shaped cache component course, not generation or live latency.',
    capacity, blocks, accessesPerBlock, additionsPerBlock, candidateScannerSha256: sha(actualSource), rows,
  } });

  const { makeSimWorld } = await import('../src/sim/arena');
  const { seedGlobalRandom } = await import('../src/sim/rng');
  const fixtureStart = performance.now(), undo = seedGlobalRandom(901743), world = makeSimWorld('warrior', 901743);
  world.startWorldMass(901743); const mass = world.massRuntime!;
  const holder = mass.stream as unknown as { samples: Cache };
  let originalSamples: Cache | undefined;
  try {
    const span = mass.config.terrain.addressSpan;
    world.landPartyAt({ x: 21660 - Number(BigInt(mass.origin.cx)) * span, y: 13500 - Number(BigInt(mass.origin.cy)) * span });
    mass.update(world, true); while (mass.stream.stats.pending) mass.stream.step(8192);
    const native = (mass as unknown as { natives: ReadonlyMap<string, Actor> }).natives;
    const bodies = [...native.values()]; assert.ok(bodies.length >= 3);
    Reflect.set(world, 'dependencyCacheBenchmarkController', { direct: bodies[0], numeric: { targetId: bodies[1].id },
      weak: new WeakMap([[bodies[2], true]]) });
    originalSamples = holder.samples;
    const retained = [...originalSamples]; assert.equal(retained.length, 32768);
    const fixtureMs = performance.now() - fixtureStart;
    const state = () => JSON.stringify({ actors: world.actors.map(a => a.id),
      native: [...native].map(([key, a]) => [key, a.id]),
      resources: bodies.map(a => [a.id, a.life, a.mana, a.es, a.dead, mass.dormancy?.isSleeping(a)]),
      terrain: mass.stream.stats, time: world.time });
    const initialState = state();
    let expected: Actor[];
    try {
      holder.samples = new Map(retained);
      expected = [...factories.archived().scan(world, native)];
    } finally { holder.samples = originalSamples; }
    for (const actor of bodies.slice(0, 3)) assert.ok(expected.includes(actor));
    const sameContents = (cache: Cache) => {
      const values = [...cache]; assert.equal(values.length, retained.length);
      for (let i = 0; i < values.length; i++) {
        assert.equal(values[i][0], retained[i][0], 'exact retained key order');
        assert.equal(values[i][1], retained[i][1], 'exact retained wrapper identity');
      }
    };
    const realRun = (kind: Kind) => {
      const results: Set<Actor>[] = [], warmMs: number[] = [];
      let totalMs: number, constructionMs: number, coldMs: number, cache: Cache;
      const start = performance.now();
      try {
        const api = benchFactories[kind]();
        cache = kind === 'map' ? new Map(retained) : new OwnedDependencyCache(retained);
        holder.samples = cache;
        const constructed = performance.now(); constructionMs = constructed - start;
        results.push(api.scan(world, native)); coldMs = performance.now() - constructed;
        for (let i = 0; i < 16; i++) {
          const begin = performance.now(); results.push(api.scan(world, native)); warmMs.push(performance.now() - begin);
        }
        totalMs = performance.now() - start;
      } finally { holder.samples = originalSamples!; }
      for (const result of results) {
        const ordered = [...result]; assert.equal(ordered.length, expected.length);
        for (let i = 0; i < ordered.length; i++) assert.equal(ordered[i], expected[i], 'exact full ordered Actor identities');
      }
      sameContents(cache!); sameContents(originalSamples!); assert.equal(holder.samples, originalSamples);
      assert.equal(state(), initialState, 'full course preserves actors, resources, sleep, terrain and world time');
      return { totalMs: totalMs!, constructionMs: constructionMs!, coldMs: coldMs!,
        warmMs: warmMs.reduce((a, b) => a + b, 0), maxWarmMs: Math.max(...warmMs), queries: warmMs,
        digest: sha(JSON.stringify(results.map(pins => [...pins].map(a => a.id)))) };
    };
    const realRows: object[] = [];
    for (let round = 0; round < 4; round++) {
      const order = round % 2 === 0 ? ['map', 'frontier'] as const : ['frontier', 'map'] as const;
      const pair = {} as Record<Kind, ReturnType<typeof realRun>>;
      for (const kind of order) pair[kind] = realRun(kind);
      assert.equal(pair.map.digest, pair.frontier.digest);
      const row = { round, order, ...pair }; realRows.push(row);
      console.log(JSON.stringify({ course: 'actual-populated-world', ...row }));
    }
    Object.assign(report, { populatedWorld: {
      method: 'One actual populated seed901743 world at21660,13500. Four alternating courses temporarily replace only the private sample collection with native Map or facade holding exactly the same32768 ordered wrapper identities, and restore the original in finally. Each course has its own fresh scanner/certificate domain, includes collection/scanner construction, one cold full-world scan and16 warm full-world scans. No world updates, actor changes, cache churn or gameplay reductions. Independent archived scanner supplies full ordered Actor identity oracle. Shared world/terrain creation is reported separately; compilation and verification are excluded. LRU maintenance and terrain record creation costs are measured by the separately labeled component courses.',
      fixtureMs, actors: world.actors.length, native: native.size, samples: retained.length,
      terrain: mass.stream.stats, orderedPins: expected.map(a => a.id), stateSha256: sha(initialState), rows: realRows,
    } });
  } finally {
    if (originalSamples) holder.samples = originalSamples;
    mass.dispose(); undo();
  }
  assert.equal(sha(readFileSync(new URL('../src/worldmass/dormancy.ts', import.meta.url), 'utf8')), sha(currentFile));
  const path = new URL('../.claude/ownership.perf8-dependencycache-' + tag + '.local.json', import.meta.url);
  writeFileSync(path, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log('Saved fresh owned-cache receipt: ' + path.pathname);
}
