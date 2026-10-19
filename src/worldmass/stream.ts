import { MASS_FOCUS_CACHE_MULTIPLIER } from './foci';
import { address, cellKey, type MassAddress, type MassCell } from './address';
import type { MassPage, MassTerrain } from './contracts';
import { MassGenerator } from './generator';
import { MassState } from './state';
import { canonical } from './random';
import { ownedSampleEntry } from './ownedTerrain';
import { OwnedDependencyCache, massDependencyCacheDefault } from './ownedDependencyCache';

interface Job { cell: MassCell; key: string; samples: MassTerrain[]; revision: number }
type SampleEntry = Readonly<{ terrain: MassTerrain; revision: number }>;
export interface MassStreamConfig { maxPages: number; maxSamples: number; dependencyCache?: boolean }

/** Cooperative preparation, atomic publication, bounded residency. Sampling is
 * independent of the queue so physics never guesses that unknown ground is air. */
export class MassStream {
  private focusPageBudget: number;
  private focusSampleBudget: number;
  setFocusCount(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0 || count > 16) throw Error('Invalid terrain focus budget');
    this.focusPageBudget = this.config.maxPages * Math.max(1, count);
    this.focusSampleBudget = this.config.maxSamples * Math.max(1, Math.min(count, MASS_FOCUS_CACHE_MULTIPLIER));
    while (this.samples.size > this.focusSampleBudget) this.samples.delete(this.samples.keys().next().value!);
  }
  overlay?: {sample(at:MassAddress,base:MassTerrain):MassTerrain; revisionAt(cell:MassCell):number; readonly revision:number};
  get revision(): number { return this.state.terrainRevision + (this.overlay?.revision ?? 0); }
  revisionAt(cell:MassCell): number { return this.state.terrainRevisionAt(cell) + (this.overlay?.revisionAt(cell) ?? 0); }
  private pages = new Map<string, MassPage>();
  private pending = new Map<string, Job>();
  private needed = new Map<string, MassCell>();
  private samples: Map<string, SampleEntry> | OwnedDependencyCache<string, SampleEntry>;
  private stateRevision = -1;
  readonly cols: number;
  constructor(readonly generator: MassGenerator, readonly state: MassState, readonly config: MassStreamConfig) {
    if (!Number.isSafeInteger(config.maxPages) || config.maxPages < 1
      || !Number.isSafeInteger(config.maxSamples) || config.maxSamples < 1) throw new Error('Invalid residency budget');
    this.config = Object.freeze({ ...config });
    this.samples = (this.config.dependencyCache ?? massDependencyCacheDefault()) === true
      ? new OwnedDependencyCache<string, SampleEntry>() : new Map<string, SampleEntry>();
    this.focusPageBudget = config.maxPages;
    this.focusSampleBudget = config.maxSamples;
    if (canonical(state.run) !== canonical(generator.run)) throw new Error('Stream state belongs to another run');
    this.cols = generator.spec.addressSpan / generator.spec.terrainCell;
  }
  private syncChanges(): void {
    if (this.stateRevision === this.revision) return;
    // Unrelated edits preserve completed pages and partially prepared work.
    // Samples validate lazily below, so an edit never scans the whole LRU.
    for (const [key, page] of this.pages)
      if (page.revision !== this.revisionAt(page.cell)) this.pages.delete(key);
    for (const [key, job] of this.pending)
      if (job.revision !== this.revisionAt(job.cell)) this.pending.delete(key);
    this.stateRevision = this.revision;
    const ordered = new Map<string, Job>();
    for (const [key, cell] of this.needed) if (!this.pages.has(key))
      ordered.set(key, this.pending.get(key) ?? { key, cell, samples: [], revision: this.revisionAt(cell) });
    this.pending = ordered;
  }
  request(cells: readonly MassCell[]): void {
    const next = new Map<string, MassCell>();
    for (const c of cells) {
      const normalized = address(c.dimension, c.cx, c.cy, 0, 0, this.generator.spec.addressSpan);
      next.set(cellKey(normalized), { dimension: normalized.dimension, cx: normalized.cx, cy: normalized.cy });
    }
    if (next.size > this.focusPageBudget) throw new Error('Requested terrain exceeds residency budget');
    this.needed = next;
    this.syncChanges();
    for (const key of this.pending.keys()) if (!next.has(key)) this.pending.delete(key);
    // Keep the nearest-first caller order, including previously queued pages.
    const ordered = new Map<string, Job>();
    for (const [key, cell] of next) if (!this.pages.has(key))
      ordered.set(key, this.pending.get(key) ?? { key, cell, samples: [], revision: this.revisionAt(cell) });
    this.pending = ordered;
    while (this.pages.size + this.pending.size > this.focusPageBudget) {
      const key = [...this.pages.keys()].find(k => !next.has(k));
      if (key === undefined) throw new Error('Pinned terrain exceeded the budget');
      this.pages.delete(key);
    }
  }
  sample(at: MassAddress): MassTerrain {
    this.syncChanges();
    const p = this.state.atCell(at), key = this.state.key(p);
    const revision = this.revisionAt(p), hit = this.samples.get(key);
    if (hit?.revision === revision) {
      if (this.samples instanceof OwnedDependencyCache) this.samples.promote(key);
      else { this.samples.delete(key); this.samples.set(key, hit); }
      return this.overlay?.sample(at, hit.terrain) ?? hit.terrain;
    }
    const half = this.generator.spec.terrainCell / 2;
    const base = this.generator.terrainAt({ ...p, x: p.x + half, y: p.y + half });
    const patch = this.state.patchAt(p);
    const result: MassTerrain = patch ? Object.freeze({ ...base, region: patch.region, color: patch.color,
      source: Object.freeze({ ...base.source, rule: 'terrain-change', source: patch.cause }) }) : base;
    this.samples.delete(key); this.samples.set(key, ownedSampleEntry(result, revision));
    if (this.samples.size > this.focusSampleBudget) this.samples.delete(this.samples.keys().next().value!);
    return this.overlay?.sample(at,result) ?? result;
  }
  step(sampleBudget: number, maxWorkMs = Infinity): { sampled: number; published: number } {
    if (!Number.isSafeInteger(sampleBudget) || sampleBudget < 0) throw new Error('Invalid generation work budget');
    if (Number.isNaN(maxWorkMs) || maxWorkMs < 0) throw new Error('Invalid generation time budget');
    this.syncChanges();
    let sampled = 0, published = 0;
    const started = performance.now();
    for (const job of this.pending.values()) {
      while (job.samples.length < this.cols * this.cols && sampled < sampleBudget) {
        const i = job.samples.length, size = this.generator.spec.terrainCell;
        job.samples.push(this.sample({ ...job.cell, x: (i % this.cols) * size, y: Math.floor(i / this.cols) * size }));
        sampled++;
        if (performance.now() - started >= maxWorkMs) return { sampled, published };
      }
      if (job.samples.length === this.cols * this.cols) {
        const page = Object.freeze({ ...job, cell: Object.freeze({ ...job.cell }), cols: this.cols,
          samples: Object.freeze(job.samples) });
        this.pages.set(job.key, page); this.pending.delete(job.key); published++;
      }
      if (sampled >= sampleBudget) break;
    }
    return { sampled, published };
  }
  page(cell: MassCell): MassPage | undefined {
    this.syncChanges();
    return this.pages.get(cellKey(cell));
  }
  get stats(): { resident: number; pending: number; samples: number; requested: number } {
    return { resident: this.pages.size, pending: this.pending.size, samples: this.samples.size, requested: this.needed.size };
  }
}
