/** Fixed-shape terrain ownership: independent exact d4b96ef0 scanner oracle.
 * Preserve ordered pins, reflection/getter effects and recursive work limits.
 * Optional --bench is construction-inclusive component work, never live ticks. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { massDormancyPins } from '../src/worldmass/dormancy';
import * as actual from '../src/worldmass/ownedTerrain';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
// Exact independent d4b96ef0 declarations. Never update this archive to match an optimization.
const archivedSource = String.raw`const entityKeys = new Set(['aiTargetId','aiHitById','lastFoeId','watchQuarryId','aiRingTarget',
  'mountId','patrolFollow','bornOf','lifelineId','gateLink','heldBy','casterId','targetId','ownerId',
  'sourceId','victimId','preyId','quarryId','orbitAnchorId','echoPrey','necroId','cartId']);
const dependencyKeys = new Set([...entityKeys].filter(k=>!['aiHitById','lastFoeId'].includes(k)));
const dependencyFreeData=new WeakSet<object>();
function isDependencyFreeData(value:object,active?:Set<object>,budget?:{left:number}):boolean {
  if(dependencyFreeData.has(value))return true;
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null&&proto!==Array.prototype||!Object.isFrozen(value))return false;
  active??=new Set<object>();budget??={left:4096};
  if(--budget.left<0||active.size>=64||active.has(value))return false;
  active.add(value);
  try {
    // Keep descriptor inspection even for freezeData values: a frozen proxy
    // can still have effectful get traps. Avoid only the temporary entry pairs.
    const descriptors=Object.getOwnPropertyDescriptors(value);
    for(const key of Object.keys(descriptors)){
      const descriptor=descriptors[key];
      if(!descriptor.enumerable)continue;
      // Inspection never invokes getters. Fallback keeps the original scanner
      // semantics, including one ordinary read of an enumerable accessor.
      if(!('value' in descriptor))return false;
      const child:unknown=descriptor.value;
      // Reject possible IDs even before they belong to this owner. Otherwise a
      // future actor could make a formerly harmless frozen record a live lease.
      if(typeof child==='number'&&dependencyKeys.has(key))return false;
      if(child!==null&&typeof child==='object'&&!isDependencyFreeData(child,active,budget))return false;
    }
    dependencyFreeData.add(value);return true;
  } finally {active.delete(value);}
}
export function massDormancyPins(world: World, owned: ReadonlyMap<string,Actor>,
  excludedOwners: ReadonlySet<object> = new Set()): Set<Actor> {
  const native=new Set(owned.values()), ids=new Map([...native].map(a=>[a.id,a]));
  const pinned=new Set<Actor>(), seen=new Set<object>([world]);
  const visit=(value:unknown,key=''):void=> {
    if(typeof value==='number' && dependencyKeys.has(key)) {const a=ids.get(value);if(a)pinned.add(a);return;}
    if(!value||typeof value!=='object'||seen.has(value)||excludedOwners.has(value))return;
    if(value instanceof Actor){if(native.has(value))pinned.add(value);return;}
    if(isDependencyFreeData(value))return;
    // Certified immutable graphs already have permanent cycle-free coverage;
    // only graphs we actually traverse need the per-query seen set.
    seen.add(value);
    if(value instanceof WeakMap||value instanceof WeakSet){for(const a of native)if(value.has(a))pinned.add(a);return;}
    if(value instanceof Map){for(const [k,v]of value){if(typeof k==='number'){const a=ids.get(k);if(a)pinned.add(a);}else if(k!==null&&typeof k==='object')visit(k);if(v!==null&&typeof v==='object')visit(v);}return;}
    if(value instanceof Set){for(const v of value){if(typeof v==='number'){const a=ids.get(v);if(a)pinned.add(a);}else if(v!==null&&typeof v==='object')visit(v);}return;}
    for(const [k,v]of Object.entries(value))visit(v,k);
  };
  for(const [key,value] of Object.entries(world)) {
    if(['actors','massRuntime','actorGrid','actorGridBuiltFor'].includes(key))continue;
    visit(value,key);
  }
  // Actors outside this owner can still aim at, carry, bind or depend on it.
  for(const a of world.actors)if(!native.has(a))for(const [k,v]of Object.entries(a))visit(v,k);
  return pinned;
}`;
assert.equal(sha(archivedSource), 'cdefd768157d93d66e13b859def2bc60b490b5a1dd67a087728ef622db246acc');
const currentSource = readFileSync(new URL('../src/worldmass/dormancy.ts', import.meta.url), 'utf8');
const currentTree = ts.createSourceFile('dormancy.ts', currentSource, ts.ScriptTarget.Latest, true);
const scannerNames = new Set(['entityKeys', 'dependencyKeys', 'dependencyFreeData', 'isDependencyFreeData', 'massDormancyPins']);
const variantSource = currentTree.statements.flatMap(statement => {
  if (ts.isFunctionDeclaration(statement) && statement.name && scannerNames.has(statement.name.text)) return [statement.getText(currentTree)];
  if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(d => scannerNames.has(d.name.getText(currentTree))))
    return [statement.getText(currentTree)];
  return [];
}).join('\n');
const moduleSource = readFileSync(new URL('../src/worldmass/ownedTerrain.ts', import.meta.url), 'utf8');
const moduleTree = ts.createSourceFile('ownedTerrain.ts', moduleSource, ts.ScriptTarget.Latest, true);
const constructorNames = new Set(['ownedTerrainSource', 'ownedBaseTerrain', 'ownedSampleEntry']);
const referenceModule = moduleTree.statements.flatMap(statement =>
  ts.isFunctionDeclaration(statement) && statement.name && constructorNames.has(statement.name.text)
    ? [statement.getText(moduleTree).replace('ownTerrainRecord(', 'Object.freeze(')] : []).join('\n')
  + '\nfunction isOwnedTerrainRecord(){return false;}';
type Scan = typeof massDormancyPins;
type Api = {
  scan: Scan;
  source: typeof actual.ownedTerrainSource;
  terrain: typeof actual.ownedBaseTerrain;
  entry: typeof actual.ownedSampleEntry;
  has: typeof actual.isOwnedTerrainRecord;
};
type Kind = 'archived' | 'owned';
function js(source: string): string {
  return ts.transpileModule(source.replace(/^import type[^\r\n]*\r?\n/gm, '').replace(/^export /gm, ''),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
}
const exports = '\nreturn {scan:massDormancyPins,source:ownedTerrainSource,terrain:ownedBaseTerrain,entry:ownedSampleEntry,has:isOwnedTerrainRecord};';
function compile(source: string, records: string): () => Api {
  const build = new Function('Actor', js(records + '\n' + source) + exports);
  return () => build(Actor) as Api;
}
const factories = { archived: compile(archivedSource, referenceModule), owned: compile(variantSource, moduleSource) };
function actualApi(): Api {
  return { scan: massDormancyPins, source: actual.ownedTerrainSource, terrain: actual.ownedBaseTerrain,
    entry: actual.ownedSampleEntry, has: actual.isOwnedTerrainRecord };
}
const actors = Array.from({ length: 9 }, (_, i) => new Actor('fixed record proof ' + i, 'enemy', { x: 0, y: 0 }));
const owners = new Map(actors.map((actor, i) => ['native/' + i, actor]));
const worldOf = (roots: object) => ({ actors: [], ...roots }) as unknown as World;
const ids = (pins: Set<Actor>) => [...pins].map(actor => actor.id);
type Outcome = { pins: number[] } | { error: { name: string; message: string } };
function outcome(scan: Scan, world: World, own = owners): Outcome {
  try {
    const pins = scan(world, own);
    for (const actor of pins) assert.equal(actors.find(candidate => candidate.id === actor.id), actor);
    return { pins: ids(pins) };
  } catch (error) {
    assert.ok(error instanceof Error); return { error: { name: error.name, message: error.message } };
  }
}
function observed<T extends object>(value: T, tape: string[], label: string, hook?: (event: string) => void): T {
  const record = (event: string) => { tape.push(label + ':' + event); hook?.(event); };
  return new Proxy(value, {
    getPrototypeOf(target) { record('prototype'); return Reflect.getPrototypeOf(target); },
    isExtensible(target) { record('extensible'); return Reflect.isExtensible(target); },
    ownKeys(target) { record('keys'); return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) { record('descriptor:' + String(key)); return Reflect.getOwnPropertyDescriptor(target, key); },
    get(target, key, receiver) { record('get:' + String(key)); return Reflect.get(target, key, receiver); },
  });
}
interface Fixture {
  world: World; tape: string[];
  before?: (iteration: number) => void;
  owners?: (iteration: number) => Map<string, Actor>;
  expected?: (iteration: number) => Outcome;
  verify?: (iteration: number) => void;
}
let cases = 0, comparisons = 0;
function check(label: string, build: (api: Api) => Fixture): void {
  for (const variant of [factories.owned, actualApi]) {
    const prior = factories.archived(), candidate = variant(), a = build(prior), b = build(candidate);
    assert.deepEqual(b.tape, a.tape, label + ' construction effects');
    for (let i = 0; i < 3; i++) {
      a.tape.length = b.tape.length = 0; a.before?.(i); b.before?.(i);
      const expected = outcome(prior.scan, a.world, a.owners?.(i)), got = outcome(candidate.scan, b.world, b.owners?.(i));
      assert.deepEqual(got, expected, label + ' result ' + i);
      assert.deepEqual(b.tape, a.tape, label + ' reflection/read tape ' + i);
      if (a.expected) assert.deepEqual(expected, a.expected(i), label + ' independent expected result');
      a.verify?.(i); b.verify?.(i); comparisons++;
    }
  }
  cases++;
}
for (const build of [factories.owned, actualApi]) {
  const api = build(), fields = Object.freeze(Object.assign(Object.create(null), { elevation: 0.5 }));
  const source = api.source('generator', 19, 'rule', 'source', 'stream');
  const terrain = api.terrain('ground', '#123456', 'woodland', fields, source), entry = api.entry(terrain, 2);
  for (const [value, expected] of [
    [source, Object.freeze({ generator: 'generator', version: 19, rule: 'rule', source: 'source', stream: 'stream' })],
    [terrain, Object.freeze({ region: 'ground', color: '#123456', biome: 'woodland', fields, source })],
    [entry, Object.freeze({ terrain, revision: 2 })],
  ] as const) {
    assert.deepEqual(Object.getOwnPropertyDescriptors(value), Object.getOwnPropertyDescriptors(expected));
    assert.deepEqual(Reflect.ownKeys(value), Reflect.ownKeys(expected));
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
    assert.ok(Object.isFrozen(value)); assert.ok(api.has(value));
  }
  assert.equal(api.has(fields), false); assert.equal(entry.terrain, terrain); assert.equal(terrain.source, source);
  assert.equal(terrain.fields, fields);
  assert.equal(api.has(new Proxy(entry, {})), false, 'Proxy wrapping an owned record is not owned');
  assert.notEqual(api.entry(terrain, 2), entry, 'each constructor creates a fresh record');
  assert.deepEqual(outcome(api.scan, worldOf({ entry })), { pins: [] });
  comparisons++;
}
check('argument values and order are exact; constructors do not inspect children', api => {
  const tape: string[] = [], fields = observed({ ownerId: actors[0].id }, tape, 'fields');
  const argument = <T>(key: string, value: T): T => { tape.push('argument:' + key); return value; };
  const terrain = api.terrain(argument('region', 'ground'), argument('color', '#fff'), argument('biome', 'forest'),
    argument('fields', fields), api.source(argument('generator', 'g'), argument('version', 1),
      argument('rule', 'r'), argument('source', 's'), argument('stream', 'namespace')));
  assert.deepEqual(tape, ['argument:region', 'argument:color', 'argument:biome', 'argument:fields',
    'argument:generator', 'argument:version', 'argument:rule', 'argument:source', 'argument:stream']);
  return { world: worldOf({ value: api.entry(terrain, 0) }), tape, expected: () => ({ pins: [actors[0].id] }) };
});
for (const value of [NaN, -1, Infinity, -Infinity, 0, actors[1].id]) check('nested numeric key ' + String(value), api => ({
  world: worldOf({ entry: api.entry(Object.freeze({ ownerId: value }) as never, 0) }), tape: [],
  expected: () => ({ pins: value === actors[1].id ? [value] : [] }),
}));
check('future owner remains visible', api => {
  const reduced = new Map([...owners].filter(([, actor]) => actor !== actors[2]));
  return { world: worldOf({ entry: api.entry(Object.freeze({ targetId: actors[2].id }) as never, 0) }), tape: [],
    owners: i => i === 0 ? reduced : owners, expected: i => ({ pins: i ? [actors[2].id] : [] }) };
});
for (const proxy of [false, true]) check('cold clean mutable child later acquires numeric lease ' + proxy, api => {
  const tape: string[] = [], mutable: { ownerId?: number } = {}, child = proxy ? observed(mutable, tape, 'mutable') : mutable;
  return { world: worldOf({ entry: api.entry(child as never, 0), alias: child }), tape,
    before: i => { if (i) mutable.ownerId = actors[i].id; }, expected: i => ({ pins: i ? [actors[i].id] : [] }) };
});
check('unowned accessor remains one read through aliases', api => {
  const tape: string[] = []; let actor = actors[0];
  const getter = Object.freeze(Object.defineProperty({}, 'ownerId', { enumerable: true,
    get() { tape.push('ownerId:get'); return actor.id; } }));
  return { world: worldOf({ entry: api.entry(getter as never, 0), alias: getter }), tape,
    before: i => { actor = actors[i]; }, expected: i => ({ pins: [actors[i].id] }),
    verify: () => assert.deepEqual(tape, ['ownerId:get']) };
});
check('collections retain numeric keys and members, object values and weak membership', api => {
  const map = Object.freeze(new Map<unknown, unknown>([[actors[0].id, 0], ['ignored', actors[8].id]]));
  const set = Object.freeze(new Set<unknown>([actors[1].id])), weak = Object.freeze(new WeakMap([[actors[2], true]]));
  return { world: worldOf({ entry: api.entry({ map, set, weak } as never, 0) }), tape: [],
    before: i => { if (i) { map.set(actors[3], 0); set.add(actors[4]); weak.set(actors[5], true); } },
    expected: i => ({ pins: i ? [actors[0].id, actors[3].id, actors[1].id, actors[4].id, actors[2].id, actors[5].id]
      : [actors[0].id, actors[1].id, actors[2].id] }) };
});
check('cycles/classes/functions/symbols/__proto__ retain fallback semantics', api => {
  class Lease { ownerId = actors[0].id; }
  const cyclic: Record<PropertyKey, unknown> = { targetId: actors[1].id }; cyclic.self = cyclic;
  cyclic[Symbol('ignored')] = actors[2];
  cyclic.fn = Object.assign(() => 0, { ownerId: actors[3].id });
  Object.defineProperty(cyclic, '__proto__', { value: Object.freeze({ targetId: actors[4].id }), enumerable: true });
  Object.freeze(cyclic);
  return { world: worldOf({ entry: api.entry({ cyclic, lease: Object.freeze(new Lease()) } as never, 0) }), tape: [],
    expected: () => ({ pins: [actors[1].id, actors[4].id, actors[0].id] }) };
});
for (const count of [4094, 4095, 4096, 4100]) check('unknown Proxy budget boundary ' + count, api => {
  const tape: string[] = [], children: Record<string, unknown> = {};
  for (let i = 0; i < count; i++) children['f' + i] = api.entry(null as never, i);
  const graph = Object.freeze(children), ancestor = observed(Object.freeze({ graph }), tape, 'ancestor');
  return { world: worldOf({ ancestor, lease: { targetId: actors[0].id } }), tape,
    expected: () => ({ pins: [actors[0].id] }) };
});
for (const depth of [62, 63, 64, 65, 70]) check('unknown Proxy depth boundary ' + depth, api => {
  const tape: string[] = []; let graph: object = api.entry(null as never, 0);
  for (let i = 0; i < depth; i++) graph = api.entry(graph as never, 0);
  return { world: worldOf({ ancestor: observed(Object.freeze({ graph }), tape, 'ancestor'), graph }), tape,
    expected: () => ({ pins: [] }) };
});
for (const limit of ['depth', 'budget']) check('changing numeric getter beyond ' + limit, api => {
  const tape: string[] = []; let actor = actors[0];
  const getter = Object.freeze(Object.defineProperty({}, 'targetId', { enumerable: true,
    get() { tape.push('targetId:get'); return actor.id; } }));
  let graph: object = getter;
  if (limit === 'depth') for (let i = 0; i < 70; i++) graph = api.entry(graph as never, 0);
  else {
    const children: Record<string, unknown> = {};
    for (let i = 0; i < 4100; i++) children['f' + i] = api.entry(null as never, i);
    children.last = getter; graph = Object.freeze(children);
  }
  return { world: worldOf({ ancestor: observed(Object.freeze({ graph }), tape, 'ancestor'), alias: getter }), tape,
    before: i => { actor = actors[i]; }, expected: i => ({ pins: [actors[i].id] }),
    verify: () => assert.equal(tape.filter(event => event === 'targetId:get').length, 1) };
});
for (const failure of ['descriptor', 'get']) check('throw then recover ' + failure, api => {
  const tape: string[] = []; let fail = true;
  const target = failure === 'descriptor' ? Object.freeze({ height: 1 }) : Object.freeze({ ownerId: actors[0].id });
  const proxy = observed(target, tape, 'unknown', event => {
    if (fail && event.startsWith(failure + ':')) throw new RangeError('unknown failure');
  });
  return { world: worldOf({ entry: api.entry(proxy as never, 0), tail: actors[1] }), tape,
    before: i => { fail = i === 0; },
    expected: i => i === 0 ? { error: { name: 'RangeError', message: 'unknown failure' } }
      : { pins: failure === 'get' ? [actors[0].id, actors[1].id] : [actors[1].id] } };
});
check('nested scan reentry has identical cache effects', api => {
  const tape: string[] = []; let entered = false;
  const clean = api.entry(null as never, 0);
  const proxy = observed(Object.freeze({ clean }), tape, 'proxy', event => {
    if (entered || event !== 'keys') return;
    entered = true; tape.push('nested:begin');
    const result = outcome(api.scan, worldOf({ clean, actor: actors[3] }));
    tape.push('nested:' + JSON.stringify(result));
    assert.deepEqual(result, { pins: [actors[3].id] });
  });
  return { world: worldOf({ entry: api.entry(proxy as never, 0), tail: actors[4] }), tape,
    expected: () => ({ pins: [actors[4].id] }), verify: () => assert.ok(entered) };
});

// A forbidden direct subtree skip changes depth fallback on the unknown Proxy.
{
  const unsafeSource = archivedSource.replace('if(dependencyFreeData.has(value))return true;',
    'if(isOwnedTerrainRecord(value)||dependencyFreeData.has(value))return true;');
  const unsafe = compile(unsafeSource, moduleSource)(), old = factories.archived();
  const build = (api: Api) => {
    let graph: object = api.entry(null as never, 0);
    for (let i = 0; i < 70; i++) graph = api.entry(graph as never, 0);
    return worldOf({ ancestor: new Proxy(Object.freeze({ graph }), { get() { throw new Error('original depth fallback'); } }) });
  };
  assert.deepEqual(outcome(old.scan, build(old)), { error: { name: 'Error', message: 'original depth fallback' } });
  assert.deepEqual(outcome(unsafe.scan, build(unsafe)), { pins: [] }); comparisons++;
}
function fixture(api: Api, kind: Kind, count: number, mixed: boolean): World {
  const samples = new Map<string, object>(), terrains: object[] = [];
  for (let i = 0; i < count; i++) {
    const fieldInput: Record<string, number> = Object.assign(Object.create(null),
      { elevation: (i % 100) / 100, moisture: (i % 17) / 17, temperature: 0.6, rock: 0.3, danger: 0.1 });
    if (mixed && i % 8 === 0) fieldInput.ownerId = actors[0].id;
    const fields = Object.freeze(fieldInput);
    // Baseline uses original inline literal allocations. Candidate constructors
    // create exactly those three final records internally, with no input copy.
    const source = kind === 'owned' ? api.source('fixed-terrain-model', 19, 'forest', 'woodland', 'seed/cell/' + Math.floor(i / 256))
      : Object.freeze({ generator: 'fixed-terrain-model', version: 19, rule: 'forest',
        source: 'woodland', stream: 'seed/cell/' + Math.floor(i / 256) });
    const terrain = kind === 'owned' ? api.terrain('grass', '#4a5b3c', 'woodland', fields, source)
      : Object.freeze({ region: 'grass', color: '#4a5b3c', biome: 'woodland', fields, source });
    samples.set('sample/' + i, kind === 'owned' ? api.entry(terrain, 0) : Object.freeze({ terrain, revision: 0 }));
    terrains.push(terrain);
  }
  const pages = new Map<string, object>();
  for (let i = 0; i < count; i += 256) pages.set('page/' + i,
    Object.freeze({ key: 'page/' + i, cell: Object.freeze({ dimension: 'world', cx: String(i / 256), cy: '0' }),
      cols: 16, revision: 0, samples: Object.freeze(terrains.slice(i, i + 256)) }));
  return worldOf({ walk: { stream: { pages, samples } }, lease: { actor: actors[1] } });
}
function count(kind: Kind) {
  const source = (kind === 'archived' ? archivedSource : variantSource)
    .replace('const descriptors=Object.getOwnPropertyDescriptors(value);',
      'counter.descriptors++;const descriptors=Object.getOwnPropertyDescriptors(value);')
    .replace('if(isOwnedTerrainRecord(value)){', 'if(isOwnedTerrainRecord(value)){counter.direct++;');
  const counter = { descriptors: 0, direct: 0 };
  const api = new Function('Actor', 'counter', js((kind === 'owned' ? moduleSource : referenceModule) + '\n' + source) + exports)
    (Actor, counter) as Api;
  const world = fixture(api, kind, 512, false), pins = ids(api.scan(world, owners)), cold = { ...counter };
  counter.descriptors = counter.direct = 0;
  assert.deepEqual(ids(api.scan(world, owners)), pins);
  return { pins, cold, warm: { ...counter } };
}
const counts = { archived: count('archived'), owned: count('owned') };
assert.deepEqual(counts.owned.pins, counts.archived.pins);
assert.deepEqual(counts.archived.cold, { descriptors: 2054, direct: 0 });
assert.deepEqual(counts.owned.cold, { descriptors: 518, direct: 1536 });
assert.deepEqual(counts.owned.warm, counts.archived.warm);
const receipt = { result: 'PASS fixed constructors and exact recursive scanner effects', cases, comparisons, counts,
  sourceDigests: { archive: sha(archivedSource), variant: sha(variantSource), constructors: sha(moduleSource) } };
console.log(JSON.stringify(receipt));
if (process.argv.includes('--bench')) {
  writeFileSync('.claude/ownership.ownedTerrain-correctness.local.json', JSON.stringify(receipt, null, 2));
  writeFileSync('.claude/ownership.ownedTerrain-scanner.local.txt', variantSource);
  const snapshot = (world: World) => {
    const stream = (world as unknown as { walk: { stream: { samples: Map<string, object>; pages: Map<string, object> } } }).walk.stream;
    return JSON.stringify({ samples: [...stream.samples], pages: [...stream.pages] });
  };
  const report = { ...receipt, node: process.version,
    method: '8192 terrain-shaped samples/32 pages, fields and page containers unowned. Four alternating paired rounds per clean/mixed workload. Same TypeScript ES2022 scanner/constructor transform. Baseline allocates original inline literals; candidate calls fixed constructors that allocate the same three records plus WeakSet registration, without an extra input record/copy. Cold includes context creation, all record/collection construction and first scan; warm12 scans follow that cold priming. Compilation, operation counts, assertions and complete output hashes excluded. Component-only; no generation/host or live latency claim. Clean warm direct branch count is0, so any warm difference is not removed descriptor work.',
    rows: [] as object[] };
  function run(kind: Kind, mixed: boolean) {
    const start = performance.now(), api = factories[kind](), world = fixture(api, kind, 8192, mixed), built = performance.now();
    const coldPins = ids(api.scan(world, owners)), scanned = performance.now(), data = snapshot(world);
    const expected = mixed ? [actors[0].id, actors[1].id] : [actors[1].id];
    assert.deepEqual(coldPins, expected);
    const warmPins: number[][] = [], warmStart = performance.now();
    for (let i = 0; i < 12; i++) warmPins.push(ids(api.scan(world, owners)));
    const warmMs = performance.now() - warmStart;
    for (const result of warmPins) assert.deepEqual(result, expected);
    assert.equal(snapshot(world), data);
    return { buildMs: built - start, firstScanMs: scanned - built, totalColdMs: scanned - start, warmMs, warmQueries: 12,
      outputSha256: sha(data), pinSha256: sha(JSON.stringify([coldPins, ...warmPins])) };
  }
  for (const mixed of [false, true]) {
    for (const kind of ['archived', 'owned'] as const) {
      const api = factories[kind](); api.scan(fixture(api, kind, 64, mixed), owners);
    }
    for (let trial = 0; trial < 4; trial++) {
      const order = trial % 2 === 0 ? ['archived', 'owned'] as const : ['owned', 'archived'] as const;
      const results = {} as Record<Kind, ReturnType<typeof run>>;
      for (const kind of order) results[kind] = run(kind, mixed);
      assert.equal(results.archived.outputSha256, results.owned.outputSha256);
      assert.equal(results.archived.pinSha256, results.owned.pinSha256);
      const row = { mixed, trial, order, ...results }; report.rows.push(row); console.log(JSON.stringify(row));
    }
  }
  writeFileSync('.claude/ownership.ownedTerrain-bench.local.json', JSON.stringify(report, null, 2));
}
