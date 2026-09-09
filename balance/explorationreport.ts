import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Vec2 } from '../src/core/math';
import type { ZoneDef } from '../src/data/zones';
import type { GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { EXPLORATION_CFG, measureExploration } from './layoutmetrics';

/** Optional QA observer. No imported runtime consumer; nothing is persisted in saves. */
export class ExplorationReport {
  private samples: Record<string, unknown>[] = [];
  constructor(private cfg = EXPLORATION_CFG) {}

  record(name: string, def: ZoneDef, entry: Vec2, exits: Vec2[], layout: GeneratedLayout): void {
    const grid = layout.walk;
    const identity = { case: name, seed: def.seed, recipe: def.layoutType ?? 'plains',
      definition: def, entry, exits, pois: layout.pois };
    if (!(grid instanceof GridWalkField)) {
      this.samples.push({ ...identity, status: 'unavailable', reason: 'no-grid-walk-field' });
      return;
    }
    const dimensions = { cols: grid.cols, rows: grid.rows, cell: grid.cell };
    // Fingerprint only exact terrain walkability in this orientation. Equal
    // hashes say nothing about matching decoration, encounters, doors or tiers.
    const terrainHash = createHash('sha256').update(JSON.stringify(dimensions)).update(grid.mask).digest('hex');
    this.samples.push({ ...identity, status: 'measured', dimensions, terrainHash,
      metrics: measureExploration(grid, entry, exits, layout.pois, this.cfg) });
  }

  failed(name: string, def: ZoneDef, error: unknown): void {
    this.samples.push({ case: name, seed: def.seed, definition: def, status: 'error',
      reason: error instanceof Error ? error.message : String(error) });
  }

  write(path: string, qa: { failures: number; warnings: number }): void {
    const git = (...args: string[]): string | null => {
      try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
      catch { return null; }
    };
    const measured = this.samples.filter(s => s.status === 'measured');
    const report = {
      schemaVersion: 1,
      revision: git('rev-parse', 'HEAD'),
      workingTree: git('status', '--short', '--untracked-files=normal'),
      scope: 'Finished GridWalkField terrain; four-neighbor point-body paths. Excludes doodad collision, door state, actor radius, bounds clipping, tier traversal and dynamic hazards.',
      config: this.cfg, qa,
      summary: { samples: this.samples.length, measured: measured.length,
        unavailable: this.samples.filter(s => s.status === 'unavailable').length,
        errors: this.samples.filter(s => s.status === 'error').length,
        distinctTerrainMasks: new Set(measured.map(s => s.terrainHash)).size },
      samples: this.samples,
    };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
  }
}
