import type { Vec2 } from '../core/math';

export const DAMAGE_TEXT_CFG = {
  defaultSummed: false,
  lifeSec: 1.2,
  holdSec: 0.3,
  lift: 28,
  releaseRise: 9,
  totalColor: '#ffffff',
  totalSize: 12,
  sizePercent: { min: 60, max: 180, step: 5, default: 100 },
};

export function damageSizePercent(value: unknown): number {
  const size = DAMAGE_TEXT_CFG.sizePercent;
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(size.min, Math.min(size.max, Math.round(value / size.step) * size.step)) : size.default;
}

export interface DamageTextSummary {
  burst: number;
  target: number;
  total: number;
  count: number;
  at: Vec2;
  /** Host time of this hit, so expiry and burst continuity share the same clock. */
  hitAt?: number;
  /** Optional on older snapshots. Each source has its own visible lifetime. */
  source?: string;
  sourceBurst?: number;
  sourceTotal?: number;
  sourceCount?: number;
  sourceLane?: number;
}

export interface DamageTextPopup {
  pos: Vec2; text: string; color: string; life: number; maxLife: number; size: number;
  kind?: string;
  damage?: DamageTextSummary;
}

interface Burst { id: number; total: number; last: number }
interface TargetBurst extends Burst { count: number; sources: Map<string, Burst & { lane: number; count: number }> }

function active(row: Burst, now: number): boolean {
  return now >= row.last && now - row.last < DAMAGE_TEXT_CFG.lifeSec;
}

/** Cumulative snapshots let clients change display modes mid-burst, even after earlier hits expire. */
export class DamageTextBursts {
  private nextBurst = 0;
  private targets = new Map<number, TargetBurst>();

  record(target: number, amount: number, now: number, at: Vec2, source = 'Hit'): DamageTextSummary | undefined {
    if (!Number.isFinite(amount) || amount <= 0) return undefined;
    let row = this.targets.get(target);
    if (!row || !active(row, now)) {
      row = { id: ++this.nextBurst, total: 0, count: 0, last: now, sources: new Map() };
      this.targets.set(target, row);
    }
    let part = row.sources.get(source);
    if (!part || !active(part, now)) {
      const lanes = new Set<number>();
      for (const [name, other] of row.sources) {
        if (active(other, now)) lanes.add(other.lane);
        else row.sources.delete(name);
      }
      let lane = 0;
      while (lanes.has(lane)) lane++;
      part = { id: ++this.nextBurst, total: 0, last: now, lane, count: 0 };
      row.sources.set(source, part);
    }
    row.total += amount;
    row.count++;
    part.total += amount;
    part.count++;
    row.last = part.last = now;
    return { burst: row.id, target, total: row.total, count: row.count, hitAt: now, at: { ...at },
      source, sourceBurst: part.id, sourceTotal: part.total, sourceCount: part.count, sourceLane: part.lane };
  }

  prune(now: number): void {
    for (const [target, row] of this.targets) if (!active(row, now)) this.targets.delete(target);
  }

  clear(): void { this.targets.clear(); }
}
