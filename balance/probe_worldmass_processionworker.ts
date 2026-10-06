import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import '../src/worldmass/nativeBootstrap';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';
import { address } from '../src/worldmass/address';
import { makeMassRun } from '../src/worldmass/generator';
import { MASS_HIERARCHY_DEFAULT, MassHierarchy } from '../src/worldmass/hierarchy';
import { nativeGeographicSelectionReceipt } from '../src/worldmass/geographicObjectiveChoice';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { canonical } from '../src/worldmass/random';
import { compileProcessionPlan, compileProcessionPlanSteps, prepareProcessionPlan, processionPlanIdentity,
  PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY, validateProcessionPlanSteps,
  type ProcessionPlanInput, type ProcessionPlanJob, type ProcessionPlanReply, type ProcessionPreparation } from '../src/worldmass/processionPlan';
import { createProcessionPlanWarmQueue, ProcessionPlanWarmQueue, type ProcessionCompilePort } from '../src/worldmass/processionWarm';

function fixture(): ProcessionPlanInput {
  const terrain = { id: 'worker-route-fixture', version: 1, addressSpan: 960, terrainCell: 24, fields: [],
    surfaces: [{ id: 'dry', priority: 0, when: [], region: 'ground', color: '#445533', biome: 'grassland' }], places: [] };
  const source = nativeMassProcessionSources().find(s => s.tileset === 'grassland')!;
  for (let seed = 1; seed < 200; seed++) {
    const run = makeMassRun(seed, 'worker-route-proof', terrain), hierarchy = new MassHierarchy(run.runId, seed, 960, MASS_HIERARCHY_DEFAULT), owner = hierarchy.at(address('surface', '0', '0', 2700, 2700, 960)).zone;
    const selection = [source], selectionReceipt = nativeGeographicSelectionReceipt(seed, owner.id, selection); if (!selectionReceipt.selected) continue;
    const ts = TILESETS[source.tileset!], zone: ZoneDef = { id: owner.id, name: 'Native route proof', level: 3, size: { w: 5400, h: 5400 },
      objective: source.objective, theme: ts.theme, biome: ts.biome, tileset: ts.id, exits: [], map: { x: 0, y: 0 }, layout: ts.layout, packs: ts.packs };
    return { compiler: PROCESSION_PLAN_COMPILER, policy: PROCESSION_ROUTE_POLICY, run, terrain, owner,
      context: resolveMassProcessionContext(zone, source, 3), selection, selectionReceipt, patches: [],
      regions: { ground: { walkable: true, dry: true } }, reservations: { revision: 'birth0', circles: [], boxes: [], capsules: [] } };
  }
  throw Error('Native source selection absent');
}
const input = fixture(), job = (i = input, token = 1): ProcessionPlanJob => ({ protocol: 1, token, input: i, ...processionPlanIdentity(i), maxBytes: 131072 });
const realRandom = Math.random; Math.random = () => { throw Error('Route compiler consumed ambient RNG'); };
let sync: Readonly<ProcessionPreparation>;
try {
  sync = compileProcessionPlan(input); assert.ok(sync.plan);
  const steps = compileProcessionPlanSteps(input); let count = 0;
  for (;;) { const next = steps.next(); if (next.done) { assert.equal(canonical(next.value), canonical(sync)); break; } assert.ok(++count < 100000); }
  assert.ok(count > 100, 'kernel yields across page/apron/search/shortcut work');
  const reply = prepareProcessionPlan(job()); assert.ok(reply.preparation, reply.error ?? 'missing compiler reply'); assert.equal(canonical(reply.preparation), canonical(sync));
  const validation = validateProcessionPlanSteps(input, sync); let yielded = 0;
  while (!validation.next().done) assert.ok(++yielded < 50000);
  assert.ok(yielded > 30, 'semantic proof yields between place pages and exact capsules');
  console.log('PASS exact synchronous/protocol/cooperative equality, staged semantic checks and ambient RNG isolation', JSON.stringify({ steps: count, validationSteps: yielded }));
} finally { Math.random = realRandom; }
class Port implements ProcessionCompilePort {
  onmessage: ProcessionCompilePort['onmessage'] = null; onerror: ProcessionCompilePort['onerror'] = null; jobs: ProcessionPlanJob[] = []; terminated = 0;
  postMessage(j: ProcessionPlanJob) { this.jobs.push(j); } terminate() { this.terminated++; }
  reply(reply?: ProcessionPlanReply) { const j = this.jobs.shift(); assert.ok(j); this.onmessage?.({ data: reply ?? prepareProcessionPlan(j) } as MessageEvent<ProcessionPlanReply>); }
}
const variants = [0, 1, 2, 3].map(n => ({ ...structuredClone(input), reservations: { ...input.reservations, revision: 'revision' + n } }));
const port = new Port(), queue = new ProcessionPlanWarmQueue(port, { maxQueued: 3, maxReady: 2, maxInputBytes: 262144, maxPayloadBytes: 131072, maxReadyBytes: 1048576 });
queue.offer(variants); variants[0].context.zone.name = 'mutated after offer'; assert.notEqual(port.jobs[0].input.context.zone.name, variants[0].context.zone.name); assert.equal(port.jobs.length, 1);
port.reply(); port.reply(); assert.equal(queue.stats.ready, 2); assert.equal(port.jobs.length, 0); assert.ok(queue.stats.readyBytes <= queue.config.maxReadyBytes);
assert.ok(queue.takeReady()); assert.equal(port.jobs.length, 1); queue.offer([input]); port.reply(); assert.equal(queue.stats.ready, 0, 'late obsolete reply does not acquire reservations'); port.reply(); assert.equal(queue.takeReady()!.preparation.inputHash, processionPlanIdentity(input).inputHash);
const oldCallback = port.onmessage; queue.dispose(); queue.dispose(); assert.doesNotThrow(() => oldCallback?.({ data: null } as unknown as MessageEvent<ProcessionPlanReply>)); assert.equal(port.terminated, 1);
for (const mutation of ['null', 'cycle', 'wrong-token', 'wrong-source', 'huge-body'] as const) {
  const p = new Port(), q = new ProcessionPlanWarmQueue(p); q.offer([input]); const r = structuredClone(prepareProcessionPlan(p.jobs[0]));
  if (mutation === 'cycle') (r.preparation as unknown as Record<string, unknown>).cycle = r;
  if (mutation === 'wrong-token') r.token++;
  if (mutation === 'wrong-source') (r.preparation as ProcessionPreparation).sourceHash = 'unregistered-source';
  if (mutation === 'huge-body') r.bytes = 1e7;
  assert.doesNotThrow(() => { if (mutation === 'null') p.onmessage?.({ data: null } as unknown as MessageEvent<ProcessionPlanReply>); else p.reply(r); });
  assert.equal(q.stats.disposed, true, mutation); assert.equal(p.terminated, 1); assert.equal(q.stats.ready, 0);
}
console.log('PASS one inflight, queue/ready byte caps, copied input, stale reply discard, null/cycle/source/token/size refusal and captured callback after dispose');

const fallback = createProcessionPlanWarmQueue(); assert.equal(fallback.stats.mode, 'incremental'); fallback.offer([input]);
assert.equal(fallback.takeReady(), undefined); fallback.advance(1, 2); assert.equal(fallback.stats.ready, 0, 'source envelope/page preparation is never partially ready');
let slices = 0; while (!fallback.stats.ready && !fallback.stats.disposed) { fallback.advance(64, 2); assert.ok(++slices < 20000); }
assert.equal(fallback.stats.error, null); assert.equal(canonical(fallback.takeReady()!.preparation), canonical(sync!));
console.log('PASS no-Worker incremental fallback exact geometry/hash, no partial publication and actual slice telemetry', JSON.stringify({ slices, ...fallback.stats }));
fallback.offer([input]); fallback.advance(1, 2); fallback.dispose(); fallback.advance(64, 2); assert.equal(fallback.takeReady(), undefined);
const changed = new ProcessionPlanWarmQueue(null); changed.offer([input]); changed.advance(2, 2); changed.offer([variants[1]]); while (!changed.stats.ready && !changed.stats.disposed) changed.advance(64, 2);
assert.equal(changed.takeReady()!.preparation.inputHash, processionPlanIdentity(variants[1]).inputHash); assert.ok(changed.stats.discarded > 0); changed.dispose();
console.log('PASS cooperative cancellation on source/reservation change and disposal');

const worker = new Worker(`const {parentPort,workerData}=require('node:worker_threads');require('tsx/cjs');globalThis.self={postMessage:value=>parentPort.postMessage(value)};require(workerData.file);Math.random=()=>{throw Error('Worker consumed ambient RNG')};parentPort.on('message',data=>self.onmessage({data}));`,
  { eval: true, workerData: { file: path.resolve('src/worldmass/processionPlan.worker.ts') } });
try {
  const response = new Promise<ProcessionPlanReply>((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject); });
  worker.postMessage(job()); const result = await response; assert.ok(result.preparation, result.error ?? 'missing real worker result');
  assert.equal(canonical(result.preparation), canonical(sync!));
  console.log('PASS actual isolated worker entry/registry-free source bootstrap equals synchronous kernel, no ambient RNG', JSON.stringify({ bytes: result.bytes, compileMs: result.compileMs }));
} finally { await worker.terminate(); }
