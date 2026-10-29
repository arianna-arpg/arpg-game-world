import { MEMORY_KINDS, memoryFacetAttrs } from '../engine/memories';
import type { MemoryRecallResult } from '../engine/memories';
import type { Seat, World } from '../engine/world';

export const MEMORY_RECALL_UI_CFG = {
  width: 470, minWidth: 280, edge: 8, gap: 14, topFraction: 0.08,
  intervalMs: 120, refreshMs: 250,
};

/** Manual and automatic reveals share the ordinary, seat-scoped meta intent. */
export function requestMemoryRecall(world: World, seat: Seat, uid: number, group: string, facet?: string): MemoryRecallResult | null {
  const previous = world.uiActionSeatId;
  world.uiActionSeatId = seat.id;
  world.memoryRecallLast = null;
  try { world.requestMeta({ t: 'recallMemory', uid, dropper: group, ...(facet ? { facet } : {}) }); }
  finally { world.uiActionSeatId = previous; }
  const result = world.memoryRecallLast as (MemoryRecallResult & { seat: string }) | null;
  return result?.seat === seat.id ? result : null;
}

/** A cancellable UI session, never saved or run in the background after closing.
 * One existing recall per beat keeps the UI responsive and all mint gates intact. */
export class MemoryRecallBatch {
  private context?: { world: World; seat: Seat; uid: number; facet?: string };
  private nextAt = 0;
  paused: string | null = null;
  get active(): boolean { return !!this.context; }

  start(world: World, seat: Seat, uid: number, facet?: string): boolean {
    this.stop();
    const view = world.memoryRecallView(seat, uid);
    if (!view?.total || seat.actor.dead || (MEMORY_KINDS[view.kind].facets && (!facet || !memoryFacetAttrs(facet)))) return false;
    this.context = { world, seat, uid, facet };
    this.paused = view.refusal;
    this.nextAt = 0;
    return true;
  }

  stop(): void { this.context = undefined; this.paused = null; }

  tick(world: World, seat: Seat, uid: number, now: number): { group: string; result: MemoryRecallResult } | null {
    const c = this.context;
    if (!c) return null;
    if (world !== c.world || seat !== c.seat || uid !== c.uid || seat.actor.dead || !world.seats.includes(seat)) {
      this.stop(); return null;
    }
    if (now < this.nextAt) return null;
    this.nextAt = now + MEMORY_RECALL_UI_CFG.intervalMs;
    const view = world.memoryRecallView(seat, uid);
    if (!view?.total || !view.groups.length) { this.stop(); return null; }
    this.paused = view.refusal;
    if (view.refusal) return null; // Poll without dispatching refused actions or spending units.
    const group = view.groups[0].key;
    const result = requestMemoryRecall(world, seat, uid, group, c.facet);
    if (!result || view.total === 1) this.stop();
    return result ? { group, result } : null;
  }
}
