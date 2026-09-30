import { address, cellKey, type MassAddress } from './address';
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
  private claims = new Map<string, [string, string]>();
  revision = 0;
  constructor(readonly run: Readonly<MassRun>, readonly cell: number) {
    if (!Number.isSafeInteger(cell) || cell <= 0 || run.addressSpan % cell) throw new Error('Invalid change lattice');
  }
  atCell(at: MassAddress): MassAddress {
    const p = address(at.dimension, at.cx, at.cy, at.x, at.y, this.run.addressSpan);
    return { ...p, x: Math.floor(p.x / this.cell) * this.cell, y: Math.floor(p.y / this.cell) * this.cell };
  }
  key(at: MassAddress): string {
    const p = this.atCell(at);
    return canonical([cellKey(p), p.x, p.y]);
  }
  patchAt(at: MassAddress): Readonly<MassTerrainPatch> | undefined { return this.patches.get(this.key(at)); }
  paint(patch: MassTerrainPatch): void {
    if (typeof patch.region !== 'string' || !patch.region || typeof patch.cause !== 'string' || !patch.cause
      || !/^#[0-9a-f]{6}$/i.test(patch.color)) throw new Error('Terrain change needs region, color, and cause');
    const normalized = freezeData({ region: patch.region, color: patch.color, cause: patch.cause, address: this.atCell(patch.address) });
    const key = this.key(normalized.address), before = this.patches.get(key);
    if (before && canonical(before) === canonical(normalized)) return;
    this.patches.set(key, normalized); this.revision++;
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
    return JSON.parse(canonical({ run: this.run, revision: this.revision,
      terrain: [...this.patches.values()].sort((a, b) => this.key(a.address) < this.key(b.address) ? -1 : 1),
      claims: [...this.claims.values()].sort((a, b) => canonical(a) < canonical(b) ? -1 : 1) })) as MassStateSave;
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
    this.patches = next.patches; this.claims = next.claims;
    // Revision is local invalidation, monotonic even when loading an earlier save.
    this.revision = Math.max(this.revision + 1, data.revision);
  }
}
