import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { withSeededRandom } from '../core/rng';
import { MONSTERS } from '../data/monsters';
import { LOOT_TABLES } from '../data/loottables';
import { COURT_SHRINE_KIND, type CourtShrineSpec } from '../data/puzzles';
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleRun, type PuzzleCheckpoint } from '../engine/puzzles';
import { blocksMovement, hitSurfaceOf } from '../engine/levelgen';
import { shapeContains } from '../engine/shapes';
import { sameStory } from '../engine/tiers';
import type { NativeFeatureInstance } from './nativeResidency';
import { discTerrainClear } from './geographicAccessCore';
import { canonical, freezeData, massRandom, streamSeed } from './random';

export interface MassCourtPuzzlesSave {
  schema: 1; owner: string; descriptor: string; clock: number;
  puzzles: { source: string; id: string; progress: PuzzleCheckpoint }[];
}
export interface MassCourtPuzzlePolicy {
  population(): number; maxPopulation(): number; retainRadius?: number;
}
export interface MassCourtPuzzleBinding {
  mount(): void; rollbackMount(): void;
  actors(): ReadonlySet<Actor>; capture(): MassCourtPuzzlesSave;
  canRetire(otherOwned?: ReadonlySet<Actor>): boolean; detach(otherOwned?: ReadonlySet<Actor>): void;
}
const inners = new Map([
  ['refrain', 'chime_crystal'], ['tempo', 'tempo_crystal'], ['accord', 'accord_crystal'], ['ember', 'ember_crystal'],
]);
const clone = <T>(v: T): T => JSON.parse(canonical(v)) as T;
const runId = (owner: string, source: string) => canonical([owner, 'native-court', source]);
const rowsOf = (instance: NativeFeatureInstance) => instance.blueprint.descriptor.sidechannels?.puzzles ?? [];

/** The compiler already chose this exact court, inner law and ring. Admission
 * may refuse it whole, but never shifts the ring, changes its voices or strips
 * an unsupported reward/context merely to leave a decorative shrine behind. */
export function massCourtPuzzlesSupported(instance: NativeFeatureInstance): boolean {
  const rows = rowsOf(instance);
  if (!rows.length) return true;
  const z = instance.zone;
  if (z.objective.kind !== 'none' || (z.caveDepth ?? 0) > 0 || z.spoils === 'none' || z.castSeal || z.quickened
    || z.bounty !== undefined && z.bounty !== 1 || z.theme.pitfall && z.theme.pitfall.kind !== 'fall'
    || rows.length > PUZZLE_CFG.maxPerZone || new Set(rows.map(r => r.id)).size !== rows.length
    || z.puzzles?.length !== rows.length || z.puzzles.some(r => r.chance !== 1 || !rows.some(s => s.id === r.id))) return false;
  return rows.every(row => {
    const s = row.spec as CourtShrineSpec, inner = s.shrine && PUZZLE_KINDS[s.shrine.kind], node = s.node ? MONSTERS[s.node] : undefined;
    if (s.kind !== COURT_SHRINE_KIND || !s.shrine || !inners.has(s.shrine.kind) || !inner?.checkpoint?.absent
      || s.node !== inners.get(s.shrine.kind) || !node?.passive || !s.count || s.count.length !== 2
      || !Number.isSafeInteger(s.count[0]) || s.count[0] < 4 || s.count[0] > 8 || s.count[0] !== s.count[1]
      || s.shrine.kind === 'accord' && s.count[0] % 2 !== 0
      || ![s.shrine.x, s.shrine.y, s.shrine.ringR, s.shrine.a0].every(Number.isFinite)
      || s.shrine.ringR < 56 || s.shrine.ringR > 160 || s.spacing !== s.shrine.ringR
      || s.heart !== undefined || s.grid !== undefined || s.format !== undefined || 'mintCtx' in s
      || !s.reward?.table || !LOOT_TABLES[s.reward.table] || s.reward.cast !== undefined || s.reward.gems !== undefined
      || s.reward.washFor !== undefined && (!Number.isFinite(s.reward.washFor) || s.reward.washFor < 0 || s.reward.washFor > 3600)) return false;
    return courtSeats(s).every(p => courtBodyClear(instance, p.x + instance.offset.x, p.y + instance.offset.y, node.radius));
  });
}
export function courtSeats(spec: CourtShrineSpec): { x: number; y: number }[] {
  const n = spec.count![0], s = spec.shrine;
  return Array.from({ length: n }, (_, i) => {
    const a = s.a0 + i / n * Math.PI * 2;
    return { x: s.x + Math.cos(a) * s.ringR, y: s.y + Math.sin(a) * s.ringR };
  });
}
function courtBodyClear(instance: NativeFeatureInstance, x: number, y: number, radius: number): boolean {
  const g = instance.grid.grid, p = { x: x - instance.offset.x, y: y - instance.offset.y };
  return discTerrainClear(p, radius, g.cell, q => g.isWalkable(q.x, q.y))
    && !instance.layout.doodads.some(d => !d.gone && (d.tier ?? 0) === 0 && blocksMovement(d)
      && shapeContains(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, x, y, radius));
}

/** Native four-inner court ownership. Source geometry is feature-local and
 * immutable; only the detached run's private spec is translated into the live
 * physical frame. Native World remains the sole hit, timer and reward driver. */
export class MassCourtPuzzles {
  private live = new Map<string, readonly PuzzleRun[]>();
  private retainRadius: number;
  constructor(readonly world: World, readonly policy: MassCourtPuzzlePolicy) {
    this.retainRadius = policy.retainRadius ?? 620;
    if (!Number.isFinite(this.retainRadius) || this.retainRadius < PUZZLE_CFG.earshot || this.retainRadius > 8192)
      throw Error('Invalid native court residency policy');
  }
  get population(): number { return [...this.live.values()].reduce((n, runs) => n + runs.reduce((m, r) => m + r.nodes.length, 0), 0); }
  views(): readonly PuzzleRun[] { return [...this.live.values()].flat(); }
  private saved(instance: NativeFeatureInstance, value?: MassCourtPuzzlesSave): MassCourtPuzzlesSave | undefined {
    if (value === undefined) return;
    const rows = rowsOf(instance);
    if (!value || value.schema !== 1 || value.owner !== instance.id || value.descriptor !== instance.blueprint.descriptor.hash
      || !Number.isFinite(value.clock) || value.clock < 0 || value.clock > this.world.time
      || !Array.isArray(value.puzzles) || value.puzzles.length !== rows.length
      || value.puzzles.some((p, i) => !p || p.source !== rows[i].id || p.id !== runId(instance.id, rows[i].id) || !p.progress))
      throw Error('Invalid native court checkpoint');
    canonical(value); return value;
  }
  requiredPopulation(instance: NativeFeatureInstance, value?: MassCourtPuzzlesSave): number {
    if (!massCourtPuzzlesSupported(instance)) throw Error('Unbound native court mechanism');
    this.saved(instance, value);
    return rowsOf(instance).reduce((n, r) => n + r.spec.count![0], 0);
  }
  prepare(instance: NativeFeatureInstance, value?: MassCourtPuzzlesSave): MassCourtPuzzleBinding | undefined {
    const rows = rowsOf(instance);
    if (!rows.length) { if (value) throw Error('Native court lost its source'); return; }
    const count = this.requiredPopulation(instance, value), saved = this.saved(instance, value), owner = instance.id, world = this.world;
    if (this.live.has(owner)) throw Error('Duplicate native court owner');
    if (this.policy.population() + count > this.policy.maxPopulation()) throw Error('Native court requires its complete node reservation');
    const runs = rows.map((row, i) => {
      const spec = clone(row.spec as CourtShrineSpec), id = runId(owner, row.id);
      spec.shrine.x += instance.offset.x; spec.shrine.y += instance.offset.y;
      const nodes = courtSeats(spec).map((pos, index) => {
        const node = withSeededRandom(streamSeed(instance.placement.request.seed, [owner, row.id, 'native-court/node', index]),
          () => world.createMonster(spec.node!, instance.zone.level, 'enemy'));
        node.pos = pos; node.tier = 0; node.puzzleNode = { id, idx: index };
        return node;
      });
      const run: PuzzleRun = { id, owner, spec: freezeData(spec), kind: PUZZLE_KINDS[COURT_SHRINE_KIND],
        at: { x: spec.shrine.x, y: spec.shrine.y }, nodes, state: {}, hums: new Map(), done: false, isObjective: false,
        rewardLevel: instance.zone.level, rewardZone: freezeData(clone(instance.zone)), rewardSource: canonical([owner, row.id, 'native-court/reward']) };
      const rng = massRandom(instance.placement.request.seed, [owner, row.id, 'native-court/puzzle']);
      world.preparePlacedPuzzle(run, () => rng.range(0, 1), saved?.puzzles[i].progress, saved ? world.time - saved.clock : 0);
      const seats = courtSeats(spec);
      if (run.kind !== PUZZLE_KINDS[spec.shrine.kind] || !run.kind.checkpoint || run.at.x !== spec.shrine.x || run.at.y !== spec.shrine.y
        || run.nodes.some((n, j) => n.defId !== spec.node || n.pos.x !== seats[j].x || n.pos.y !== seats[j].y
          || !courtBodyClear(instance, n.pos.x, n.pos.y, n.radius) || world.actors.includes(n)))
        throw Error('Native court wrapper changed its frozen fitted ring');
      return run;
    });
    let mounted = false, detached = false, observed = false, mountedAt = -1, rollback: (() => void) | undefined;
    const actors = () => new Set(runs.flatMap(r => r.nodes));
    const canRetire = (otherOwned: ReadonlySet<Actor> = new Set()): boolean => {
      if (detached) return true;
      const ours = actors();
      if (world.actors.some(a => !a.dead && !ours.has(a) && !otherOwned.has(a) && sameStory(a, { tier: 0 })
        && runs.some(r => Math.hypot(a.pos.x - r.at.x, a.pos.y - r.at.y) <= this.retainRadius))) return false;
      return runs.every(run => world.canReleasePlacedPuzzle(run));
    };
    return {
      mount: () => {
        if (mounted || detached || this.live.has(owner)) throw Error('Native court enrolled twice');
        if (this.policy.population() + count > this.policy.maxPopulation()) throw Error('Native court lost its node reservation');
        rollback = world.enrollPreparedPuzzles(runs); mountedAt = world.time; mounted = true; this.live.set(owner, runs);
      },
      rollbackMount: () => {
        if (!mounted || detached) return;
        if (observed || world.time !== mountedAt) throw Error('Native court rollback is only valid during initial enrollment');
        rollback!(); this.live.delete(owner); mounted = false; detached = true;
      },
      actors,
      capture: () => {
        if (!mounted || detached) throw Error('Unenrolled native court cannot capture');
        observed = true;
        return { schema: 1, owner, descriptor: instance.blueprint.descriptor.hash, clock: world.time,
          puzzles: runs.map((run, i) => ({ source: rows[i].id, id: run.id, progress: world.capturePlacedPuzzle(run) })) };
      },
      canRetire,
      detach: otherOwned => {
        if (detached) return;
        if (!mounted || !canRetire(otherOwned)) throw Error('Native court has live dependencies');
        // Every preflight precedes every removal; no run is stranded half out
        // of a composite owner when another run still has a queued native hit.
        for (const run of runs) if (!world.releasePlacedPuzzle(run)) throw Error('Native court retirement changed during removal');
        this.live.delete(owner); detached = true; mounted = false;
      },
    };
  }
}
