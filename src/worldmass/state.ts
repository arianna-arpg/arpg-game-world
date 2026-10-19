import { address, cellKey, type MassAddress, type MassCell } from './address';
import type { MassRun, MassTerrainPatch } from './contracts';
import { canonical, freezeData } from './random';

export interface MassStateSave {
  run: MassRun;
  revision: number;
  terrain: MassTerrainPatch[];
  claims: [string, string][];
}
/** Sparse consequences belong to the run, never a resident page's lifetime. */
export class MassState {
  private patches = new Map<string, MassTerrainPatch>();
  private foundations = new Map<string, MassTerrainPatch>();
  /** Derived page index: bounded planning reads only nearby sparse edits. */
  private patchPages = new Map<string, Map<string, Readonly<MassTerrainPatch>>>();
  private claims = new Map<string, [string, string]>();
  revision = 0;
  /** Terrain consumers need not rebuild when discovery/reward claims change. */
  terrainRevision = 0;
  private terrainPages = new Map<string, number>();
  private terrainRestoreRevision = 0;
  /** Local cache stamps are derived bookkeeping, never saved world content.
   * A restore invalidates every page even when loading an older checkpoint. */
  terrainRevisionAt(cell: MassCell): number {
    return Math.max(this.terrainRestoreRevision, this.terrainPages.get(cellKey(cell)) ?? 0);
  }
  constructor(readonly run: Readonly<MassRun>, readonly cell: number) {
    if (!Number.isSafeInteger(cell) || cell <= 0 || run.addressSpan % cell) throw new Error('Invalid change lattice');
    this.run = freezeData({ ...run });
  }
  atCell(at: MassAddress): MassAddress {
    const p = address(at.dimension, at.cx, at.cy, at.x, at.y, this.run.addressSpan);
    return { ...p, x: Math.floor(p.x / this.cell) * this.cell, y: Math.floor(p.y / this.cell) * this.cell };
  }
  key(at: MassAddress): string {
    const p = this.atCell(at);
    return canonical([cellKey(p), p.x, p.y]);
  }
  patchAt(at: MassAddress): Readonly<MassTerrainPatch> | undefined {
    const key=this.key(at); return this.patches.get(key) ?? this.foundations.get(key);
  }
  /** No history-wide snapshot or scan when preparing a local physical route. */
  patchesInCells(cells: readonly MassCell[]): readonly Readonly<MassTerrainPatch>[] {
    if (!Array.isArray(cells) || cells.length > 128) throw Error('Terrain patch query exceeds page budget');
    const keys = new Set(cells.map(c => cellKey(address(c.dimension, c.cx, c.cy, 0, 0, this.run.addressSpan))));
    return Object.freeze([...keys].sort().flatMap(key => [...(this.patchPages.get(key)?.values() ?? [])]));
  }
  /** Pinned journey ground is regenerated on entry; only player edits are saved. */
  establish(patch: MassTerrainPatch): void { this.paintInto(patch, this.foundations); }
  paint(patch: MassTerrainPatch): void { this.paintInto(patch, this.patches); }
  private paintInto(patch: MassTerrainPatch, target: Map<string, MassTerrainPatch>): void {
    if (typeof patch.region !== 'string' || !patch.region || typeof patch.cause !== 'string' || !patch.cause
      || !/^#[0-9a-f]{6}$/i.test(patch.color)) throw new Error('Terrain change needs region, color, and cause');
    const normalized = freezeData({ region: patch.region, color: patch.color, cause: patch.cause, address: this.atCell(patch.address) });
    const key = this.key(normalized.address), before = target.get(key);
    if (before && canonical(before) === canonical(normalized)) return;
    target.set(key, normalized);
    if (target===this.foundations && this.patches.has(key)) return;
    if (target===this.patches) this.revision++;
    this.terrainRevision++;
    const page = cellKey(normalized.address);
    let rows = this.patchPages.get(page);
    if (!rows) { rows = new Map(); this.patchPages.set(page, rows); }
    rows.set(key, normalized);
    this.terrainPages.set(cellKey(normalized.address), this.terrainRevision);
  }
  /** Returns true exactly once, allowing caller-owned reward/loot semantics. */
  claim(kind: string, id: string): boolean {
    if (typeof kind !== 'string' || !kind || typeof id !== 'string' || !id) throw new Error('A claim needs a kind and stable identity');
    const key = canonical([kind, id]);
    if (this.claims.has(key)) return false;
    this.claims.set(key, [kind, id]); this.revision++;
    return true;
  }
  claimed(kind: string, id: string): boolean { return this.claims.has(canonical([kind, id])); }
  snapshot(): MassStateSave {
    // Keys were normalized when the records entered the maps. Sorting those
    // keys once avoids rebuilding addresses/JSON on every comparator call.
    const byKey = ([a]: [string, unknown], [b]: [string, unknown]): number => a < b ? -1 : a > b ? 1 : 0;
    return JSON.parse(JSON.stringify({ run: this.run, revision: this.revision,
      terrain: [...this.patches.entries()].sort(byKey).map(([, value]) => value),
      claims: [...this.claims.entries()].sort(byKey).map(([, value]) => value) })) as MassStateSave;
  }
  /** Validate into a replacement before touching live state: failed import is atomic. */
  restore(raw: unknown): void {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid world changes');
    const data = raw as MassStateSave;
    if (canonical(data.run) !== canonical(this.run) || !Number.isSafeInteger(data.revision) || data.revision < 0
      || !Array.isArray(data.terrain) || !Array.isArray(data.claims)) throw new Error('World changes do not match this run');
    const next = new MassState(this.run, this.cell);
    for (const row of data.terrain) {
      if (!row || !row.address) throw new Error('Malformed terrain change');
      const key = next.key(row.address);
      if (next.patches.has(key)) throw new Error('Duplicate terrain change');
      next.paint(row);
    }
    for (const row of data.claims) {
      if (!Array.isArray(row) || row.length !== 2 || row.some(v => typeof v !== 'string')
        || !next.claim(row[0], row[1])) throw new Error('Malformed or duplicate world claim');
    }
    this.patches = next.patches; this.patchPages = next.patchPages; this.claims = next.claims;
    for(const [key,patch] of this.foundations)if(!this.patches.has(key)){
      const page=cellKey(patch.address),rows=this.patchPages.get(page)??new Map();
      rows.set(key,patch);this.patchPages.set(page,rows);
    }
    // Revision is local invalidation, monotonic even when loading an earlier save.
    this.revision = Math.max(this.revision + 1, data.revision);
    this.terrainRevision++;
    this.terrainPages.clear(); this.terrainRestoreRevision = this.terrainRevision;
  }
}
