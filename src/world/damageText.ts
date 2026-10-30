import type { Vec2 } from '../core/math';

/** Shared presentation policy. The host records both views; each viewer picks
 *  its own mode. No skill, damage type or attacker gets a special case. */
export const DAMAGE_TEXT_CFG = {
  defaultSummed: false,
  gapSec: 0.75,
  lift: 28,
  risePerSec: 28,
  totalColor: '#ffffff',
  totalSize: 15,
};

/** A cumulative receipt, copied onto an ordinary popup. Keeping the total on
 *  the receipt survives expired earlier popups, missed frames and snapshots. */
export interface DamageTextSummary {
  burst: number;
  target: number;
  total: number;
  count: number;
  at: Vec2;
}

export interface DamageTextPopup {
  pos: Vec2; text: string; color: string; life: number; maxLife: number; size: number;
  kind?: string;
  damage?: DamageTextSummary;
}

/** Transient, target-owned presentation bookkeeping; never saved with a run. */
export class DamageTextBursts {
  private nextBurst = 0;
  private targets = new Map<number, { burst: number; total: number; count: number; lastAt: number }>();

  record(target: number, amount: number, now: number, at: Vec2): DamageTextSummary | undefined {
    if (!Number.isFinite(amount) || amount <= 0) return undefined;
    let row = this.targets.get(target);
    if (!row || now < row.lastAt || now - row.lastAt > DAMAGE_TEXT_CFG.gapSec) {
      row = { burst: ++this.nextBurst, total: 0, count: 0, lastAt: now };
      this.targets.set(target, row);
    }
    row.total += amount;
    row.count++;
    row.lastAt = now;
    return { burst: row.burst, target, total: row.total, count: row.count, at: { ...at } };
  }

  prune(now: number): void {
    for (const [target, row] of this.targets) {
      if (now < row.lastAt || now - row.lastAt > DAMAGE_TEXT_CFG.gapSec) this.targets.delete(target);
    }
  }

  clear(): void { this.targets.clear(); }
}
