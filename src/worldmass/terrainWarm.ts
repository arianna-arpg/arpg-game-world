import { address, type MassAddress } from './address';
import type { MassTerrain } from './contracts';
import type { MassGenerator } from './generator';
import { massCompilePort, type MassCompilePort } from './compilePort';
import { captureTerrainPreparationSource, terrainPreparationGeneratorMatches,
  validateTerrainPreparationReply, TERRAIN_PREPARATION_MAX_ADDRESSES, TERRAIN_PREPARATION_MAX_REPLY_BYTES,
  type TerrainPreparationSource, type TerrainPreparationJob } from './terrainPreparation';

export interface TerrainPreparationInit { protocol: 1; token: number; source: TerrainPreparationSource }
export interface TerrainWarmConfig { maxQueued: number; maxReady: number; maxReadyBytes: number }
export const TERRAIN_WARM_DEFAULTS: Readonly<TerrainWarmConfig> = Object.freeze({
  maxQueued: 4096, maxReady: 4096, maxReadyBytes: 8 * 1024 * 1024,
});
const offsets: { x:number; y:number }[] = [];
for(let y=-20;y<=20;y++)for(let x=-20;x<=20;x++)offsets.push({x,y});
offsets.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y);
/** Deterministic near-first interleaving across seats and their travel direction.
 * Arithmetic only: this does not discover sites or invoke terrain generation. */
export function terrainPreparationCenters(foci:readonly {at:MassAddress;ahead:MassAddress}[],span:number,cell:number,limit:number):MassAddress[]{
  if(foci.length>16||!Number.isSafeInteger(limit)||limit<1||limit>8192)throw Error('Invalid terrain focus shortlist');
  const centers=foci.flatMap(f=>[f.at,f.ahead]),rows:MassAddress[]=[],seen=new Set<string>();
  const raw=new Map<string,Map<string,Map<string,Map<number,Set<number>>>>>();
  const primitiveGrid=typeof span==='number'&&typeof cell==='number';
  for(const offset of offsets)for(const center of centers){
    // At the signed world edge, only the out-of-range optional hint is omitted.
    let at:MassAddress;
    try{
      // Read and calculate every argument before consulting the successful-tuple
      // memo. Even duplicate hints retain their original getter/coercion order.
      const dimension=center.dimension,cx=center.cx,cy=center.cy;
      const x=(Math.floor(center.x/cell)+offset.x+.5)*cell,y=(Math.floor(center.y/cell)+offset.y+.5)*cell;
      const memoizable=primitiveGrid&&typeof dimension==='string'&&typeof cx==='string'&&typeof cy==='string';
      let columns=memoizable?raw.get(dimension)?.get(cx)?.get(cy):undefined;
      if(columns?.get(x)?.has(y))continue;
      at=address(dimension,cx,cy,x,y,span);
      if(memoizable){
        if(!columns){
          let xs=raw.get(dimension);if(!xs)raw.set(dimension,xs=new Map());
          let ys=xs.get(cx);if(!ys)xs.set(cx,ys=new Map());
          ys.set(cy,columns=new Map());
        }
        let values=columns.get(x);if(!values)columns.set(x,values=new Set());values.add(y);
      }
    }
    catch(error){if(error instanceof RangeError)continue;throw error;}
    const key=keyOf(at);if(seen.has(key))continue;seen.add(key);rows.push(at);if(rows.length===limit)return rows;
  }
  return rows;
}
const keyOf = (at: MassAddress): string => JSON.stringify([at.dimension, at.cx, at.cy, at.x, at.y]);
interface Row { key: string; at: MassAddress }
interface Batch { remaining: number; bytes: number }
interface Ready { terrain: MassTerrain; batch: Batch }

/** Optional pure base terrain. Preparation never publishes a stream sample,
 * native owner, edit, encounter or ready flag. Every miss returns immediately.
 * One bounded request is outstanding; completed data stays outside the live
 * dependency graph until the original synchronous sample asks for it. */
export class TerrainWarmQueue {
  private pending: Row[] = [];
  private ready = new Map<string, Ready>();
  private wanted = new Set<string>();
  private done = new Set<string>();
  private inflight: { job: TerrainPreparationJob; rows: Row[]; started: number } | null = null;
  private initialized = false;
  private stopped = false;
  private sequence = 1;
  private readyBytes = 0;
  private initStarted = performance.now();
  private counters = { offered: 0, completed: 0, adopted: 0, missed: 0, ineligible: 0, discarded: 0,
    roundTripMs: 0, maxRoundTripMs: 0, validationMs: 0, maxValidationMs: 0, guardMs: 0,
    submitMs: 0, maxSubmitMs: 0, initMs: 0 };
  error: string | null = null;
  sourcePreparationMs = 0;
  readonly config: Readonly<TerrainWarmConfig>;
  constructor(private readonly generator: MassGenerator, private readonly source: TerrainPreparationSource,
    private readonly port: MassCompilePort, config: TerrainWarmConfig = TERRAIN_WARM_DEFAULTS) {
    if (![config.maxQueued, config.maxReady, config.maxReadyBytes].every(Number.isSafeInteger)
      || config.maxQueued < 1 || config.maxQueued > 8192 || config.maxReady < TERRAIN_PREPARATION_MAX_ADDRESSES
      || config.maxReady > 8192 || config.maxReadyBytes < TERRAIN_PREPARATION_MAX_REPLY_BYTES
      || config.maxReadyBytes > 16 * 1024 * 1024) throw Error('Invalid terrain preparation budget');
    this.config = Object.freeze({ ...config });
    port.onmessage = event => this.receive(event.data);
    port.onerror = event => this.fail(event.message || 'Terrain compiler worker failed');
    this.submit({ protocol: 1, token: this.sequence, source } satisfies TerrainPreparationInit);
  }
  private submit(job: TerrainPreparationInit | TerrainPreparationJob): void {
    const start = performance.now();
    try { this.port.postMessage(job); }
    catch (error) { this.fail(String(error instanceof Error ? error.message : error)); }
    finally { const ms = performance.now() - start; this.counters.submitMs += ms; this.counters.maxSubmitMs = Math.max(this.counters.maxSubmitMs, ms); }
  }
  /** Addresses must already be exact normalized sample centers. No terrain or
   * reservation query is allowed while making this arithmetic-only shortlist. */
  offer(addresses: readonly MassAddress[]): void {
    if (this.stopped) return;
    if (addresses.length > this.config.maxQueued) throw Error('Terrain shortlist exceeds budget');
    const rows: Row[] = [], wanted = new Set<string>();
    for (const at of addresses) {
      const p = address(at.dimension, at.cx, at.cy, at.x, at.y, this.source.spec.addressSpan);
      const cell = this.source.spec.terrainCell;
      if (p.x !== at.x || p.y !== at.y || p.cx !== at.cx || p.cy !== at.cy
        || (p.x - cell / 2) % cell !== 0 || (p.y - cell / 2) % cell !== 0) throw Error('Invalid terrain preparation center');
      const key = keyOf(p); if (wanted.has(key)) continue;
      wanted.add(key); rows.push({ key, at: p });
    }
    this.wanted = wanted;
    for (const key of this.ready.keys()) if (!wanted.has(key)) { this.removeReady(key); this.counters.discarded++; }
    for (const key of this.done) if (!wanted.has(key)) this.done.delete(key);
    const active = new Set(this.inflight?.rows.map(row => row.key));
    this.pending = rows.filter(row => !this.done.has(row.key) && !this.ready.has(row.key) && !active.has(row.key));
    this.counters.offered += this.pending.length; this.pump();
  }
  private pump(): void {
    if (this.stopped || !this.initialized || this.inflight || !this.pending.length
      || this.readyBytes + TERRAIN_PREPARATION_MAX_REPLY_BYTES > this.config.maxReadyBytes) return;
    const count = Math.min(TERRAIN_PREPARATION_MAX_ADDRESSES, this.config.maxReady - this.ready.size);
    if (!count) return;
    const rows: Row[] = [];
    while(this.pending.length && rows.length < count)
      for(const row of this.pending.splice(0, count - rows.length))
        if(this.wanted.has(row.key) && !this.done.has(row.key) && !this.ready.has(row.key)) rows.push(row);
    if(!rows.length)return;
    const job: TerrainPreparationJob = { protocol: 1, sourceId: this.source.sourceId, token: ++this.sequence, addresses: rows.map(row => row.at) };
    this.inflight = { rows, job, started: performance.now() }; this.submit(job);
  }
  private receive(reply: unknown): void {
    if (this.stopped) return;
    if (!this.initialized) {
      const ready = reply as { protocol?: unknown; token?: unknown; sourceId?: unknown; ready?: unknown } | null;
      if (!ready || ready.protocol !== 1 || ready.token !== 1 || ready.sourceId !== this.source.sourceId || ready.ready !== true) {
        this.fail('Terrain compiler source was not accepted'); return;
      }
      this.initialized = true; this.counters.initMs = performance.now() - this.initStarted; this.pump(); return;
    }
    const active = this.inflight;
    if (!active) { this.fail('Unexpected terrain worker response'); return; }
    const start = performance.now(), values = validateTerrainPreparationReply(this.source, active.job, reply);
    const ms = performance.now() - start; this.counters.validationMs += ms; this.counters.maxValidationMs = Math.max(this.counters.maxValidationMs, ms);
    if (!values) { this.fail('Invalid terrain worker response'); return; }
    this.inflight = null;
    const roundTrip = performance.now() - active.started;
    this.counters.roundTripMs += roundTrip; this.counters.maxRoundTripMs = Math.max(this.counters.maxRoundTripMs, roundTrip);
    // Charge the complete bounded wire batch until its last retained row is
    // consumed. This avoids stringify work and undercounting partial batches.
    const batch: Batch = { remaining: 0, bytes: (reply as { bytes: number }).bytes };
    for (let i = 0; i < values.length; i++) {
      const key = active.rows[i].key, terrain = values[i];
      if (this.wanted.has(key) && !this.done.has(key) && terrain) {
        this.ready.set(key, { terrain, batch }); batch.remaining++; this.counters.completed++;
      } else { if (this.wanted.has(key)) this.done.add(key); this.counters.discarded++; }
    }
    if (batch.remaining) this.readyBytes += batch.bytes;
    this.pump();
  }
  private removeReady(key: string): Ready | undefined {
    const row = this.ready.get(key); if (!row) return;
    this.ready.delete(key); if (!--row.batch.remaining) this.readyBytes -= row.batch.bytes;
    return row;
  }
  take(at: MassAddress): MassTerrain | undefined {
    if (this.stopped) return;
    // Regional admission also asks for arbitrary points. Preparation covers
    // exact sample centers only; never round a query or key known misses.
    const cell=this.source.spec.terrainCell,half=cell/2;
    if((at.x-half)%cell!==0||(at.y-half)%cell!==0){this.counters.ineligible++;return;}
    const key = keyOf(at), row = this.ready.get(key);
    if (!row) { this.counters.missed++; if (this.wanted.has(key)) this.done.add(key); return; }
    const start = performance.now();
    const valid = terrainPreparationGeneratorMatches(this.generator, this.source);
    this.counters.guardMs += performance.now() - start;
    if (!valid) { this.fail('Terrain preparation source changed'); return; }
    this.removeReady(key); this.done.add(key); this.counters.adopted++;
    // Dispatch stays in offer/receive, never the movement/collision call stack.
    return row.terrain;
  }
  private fail(message: string): void { this.error = message; this.dispose(); }
  /** Continue a bounded batch after consumers freed capacity, without rebuilding
   * stationary interest or dispatching from inside a collision query. */
  advance(): void { this.pump(); }
  get disposed(): boolean { return this.stopped; }
  dispose(): void {
    if (this.stopped) return;
    this.stopped = true; this.port.onmessage = null; this.port.onerror = null; this.port.terminate();
    this.pending = []; this.ready.clear(); this.wanted.clear(); this.done.clear(); this.inflight = null; this.readyBytes = 0;
  }
  get stats() { return { ...this.counters, sourcePreparationMs: this.sourcePreparationMs, queued: this.pending.length, ready: this.ready.size, readyBytes: this.readyBytes,
    inflight: this.inflight ? 1 : 0, oldestJobMs: this.inflight ? performance.now() - this.inflight.started : 0,
    initialized: this.initialized, disposed: this.stopped, error: this.error }; }
}

/** Dedicated hosts explicitly install a port. Browser clients keep their
 * current terrain path; a missing adapter simply has no background queue. */
export function createTerrainWarmQueue(generator: MassGenerator, config?: TerrainWarmConfig): TerrainWarmQueue | null {
  const port = massCompilePort('terrain'); if (!port) return null;
  try {
    const start=performance.now();
    const source = captureTerrainPreparationSource(generator); if (!source) { port.terminate(); return null; }
    const ms=performance.now()-start,queue=new TerrainWarmQueue(generator, source, port, config);
    queue.sourcePreparationMs=ms;return queue;
  }
  catch { port.terminate(); return null; }
}
