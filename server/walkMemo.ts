// ---------------------------------------------------------------------------
// THE OBSTACLE MEMO (docs/design/performance-lane.md §8.3): the mass walk's
// obstacle predicate, answered once per point per revision.
//
// The finding: on the spread course the walk field's A* and line tests ask
// `obstacles.blocked(x, y)` at every cell they touch; that predicate is
// `World.pointInSolid` at the cell's centre with a fixed margin, which runs
// the native obstacle lookup and the engine's doodad shape tests, ten percent
// of the tick in the lane's profile, 99 percent of it from this one caller.
// The answers repeat (the same cell centres, tick after tick) and change only
// when a movement-blocking doodad changes, a doodad is added or removed, a
// bridge is laid, or the native features move.
//
// The memo: an own-property wrap on the walk's `obstacles` object (the
// foundation's wiring in src/worldmass/runtime.ts stays untouched), keyed on
// the EXACT query point (two float-keyed maps, so a query at any other point
// simply misses) under a revision of the nav-block doodad family's counter,
// the doodad count, the bridge count and the native features' version;
// a changed revision clears it, a full memo clears itself. Installed by the
// shard host after the world stands and re-installed whenever the runtime
// hands the walk a fresh obstacles object (a resume, a re-seat). The host
// alone installs it: solo play and the balance harness never meet it (THE
// SOLO INVARIANT); the engine-side keying of the walk's own path cache on
// the same family revision is the foundation's (ask F14).
// ---------------------------------------------------------------------------
import type { World } from '../src/engine/world';

export const WALK_MEMO_CFG = {
  /** The switch (the soak's `--walkmemo off` is the A/B). */
  enabled: true,
  /** Entries before the memo clears itself (two maps: x, then y). */
  maxEntries: 1 << 16,
  /** The doodad family whose counter keys the memo (engine/nativeSceneRegistration.ts: movement-blocking kinds). */
  family: 'nav-block',
};

export interface WalkObstacles { blocked(x: number, y: number): boolean; revision(): string }

/** The memo's revision: everything a blocked() answer can depend on beside the point itself. */
export function walkMemoRevision(world: World): string {
  const native = (world.massRuntime as unknown as { nativeFeatures?: { version?: number } } | null)?.nativeFeatures?.version ?? -1;
  // The bridge roster is a private World field (the geometry host reads it through its own getter); its
  // length is read the same way here, so a laid or lost span moves the revision.
  const bridges = (world as unknown as { bridges: readonly unknown[] }).bridges.length;
  return `${world.doodadFamilyRev(WALK_MEMO_CFG.family)}:${world.doodads.length}:${bridges}:${native}`;
}

export interface WalkMemoStatus { installed: boolean; entries: number; hits: number; misses: number; clears: number; revision: string }

export class WalkMemo {
  private wrapped: WalkObstacles | null = null;
  /** The predicate beneath the wrap (the probe compares against it). */
  inner: WalkObstacles | null = null;
  private readonly xs = new Map<number, Map<number, boolean>>();
  private entries = 0;
  private rev = '';
  hits = 0; misses = 0; clears = 0;
  constructor(private readonly world: World) {}

  /** Per tick (and after any re-seat): wrap the walk's obstacles object if it is not ours. */
  ensure(): void {
    if (!WALK_MEMO_CFG.enabled) return;
    const walk = this.world.walk as unknown as { obstacles?: WalkObstacles } | null;
    const obs = walk?.obstacles;
    if (!obs || obs === this.wrapped) return;
    const inner: WalkObstacles = { blocked: obs.blocked.bind(obs), revision: obs.revision.bind(obs) };
    this.inner = inner;
    this.clear();
    const memo = this;
    obs.blocked = (x: number, y: number): boolean => memo.blocked(inner, x, y);
    this.wrapped = obs;
  }

  private clear(): void { this.xs.clear(); this.entries = 0; this.clears++; }

  private blocked(inner: WalkObstacles, x: number, y: number): boolean {
    const rev = walkMemoRevision(this.world);
    if (rev !== this.rev) { this.rev = rev; this.clear(); }
    let row = this.xs.get(x);
    if (row) {
      const hit = row.get(y);
      if (hit !== undefined) { this.hits++; return hit; }
    } else { row = new Map(); this.xs.set(x, row); }
    this.misses++;
    const v = inner.blocked(x, y);
    if (this.entries >= WALK_MEMO_CFG.maxEntries) { this.clear(); row = new Map(); this.xs.set(x, row); }
    row.set(y, v);
    this.entries++;
    return v;
  }

  status(): WalkMemoStatus {
    return { installed: this.wrapped !== null && WALK_MEMO_CFG.enabled, entries: this.entries, hits: this.hits, misses: this.misses, clears: this.clears, revision: this.rev };
  }
}
