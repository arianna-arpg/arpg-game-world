import type { World } from '../engine/world';
import { regionKind } from '../world/regions';
import { hasDoodadRule, bodyRadiusOf, blocksMovement, type Doodad, type DoodadKind } from '../engine/levelgen';
import { cellKey, localOffset, type MassCell } from './address';
import type { WorldMassRuntime } from './runtime';
import { canonical, massRandom } from './random';
import { pieceState, type PieceState } from './sites';
export interface MassEcologySpec {
  source: string;
  spacing: number;
  rules: {
    id: string;
    biomes: string[];
    /** Omitted preserves ground/sand admission in existing run descriptors. */
    regions?: string[];
    chance: number;
    /** Omitted preserves the original single-piece lattice and its save IDs. */
    cluster?: { count: [number, number]; spread: number };
    pieces: {
      kind: DoodadKind;
      weight: number;
      radius: [number, number];
    }[];
  }[];
}
export interface MassEcologySave {
  clock: number;
  changes: [string, PieceState | null][];
}
interface Grove {
  cell: MassCell;
  pieces: {
    id: string;
    base: string;
    live: Doodad;
  }[];
}
export function validateMassEcology(spec: MassEcologySpec, span: number): void {
  if (!spec.source || !Number.isSafeInteger(spec.spacing) || spec.spacing < 96 || span % spec.spacing
    || spec.rules.length > 16 || new Set(spec.rules.map(r => r.id)).size !== spec.rules.length)
    throw new Error('Invalid scenery lattice');
  for (const r of spec.rules)
    if (r.cluster && (r.cluster.count.length !== 2 || r.cluster.count.some(n => !Number.isSafeInteger(n) || n < 1 || n > 6)
      || r.cluster.count[1] < r.cluster.count[0] || !Number.isFinite(r.cluster.spread)
      || r.cluster.spread <= 0 || r.cluster.spread > spec.spacing * .24))
      throw new Error('Invalid scenery cluster');
    else if (r.regions !== undefined && (!Array.isArray(r.regions) || !r.regions.length || r.regions.length>16
      || new Set(r.regions).size!==r.regions.length || r.regions.some(id=>!regionKind(id))))
      throw new Error('Invalid scenery regions');
    else if (!r.id || !r.biomes.length || !Number.isFinite(r.chance) || r.chance < 0 || r.chance > 1
      || !r.pieces.length || r.pieces.some(p => !hasDoodadRule(p.kind) || !Number.isFinite(p.weight) || p.weight <= 0
      || p.radius.some(n => !Number.isFinite(n) || n <= 0 || n > spec.spacing * .42) || p.radius[1] < p.radius[0]))
      throw new Error('Invalid scenery recipe');
}
/** Native mutable/fellable scenery, generated independently of encounter order.
* The climate controls the roster. Paths, sites and town reserves stay clear.
* Sparse consequences outlive page eviction; active bodies/effects retain props. */
export class MassEcology {
  private resident = new Map<string, Grove>();
  private changes = new Map<string, PieceState | null>();
  constructor(readonly spec: MassEcologySpec, private readonly mass: WorldMassRuntime) {
    validateMassEcology(spec, mass.config.terrain.addressSpan);
  }
  restore(save: MassEcologySave | undefined, now: number): void {
    if (!save)
      return;
    if (!Number.isFinite(save.clock) || !Array.isArray(save.changes))
      throw new Error('Invalid scenery checkpoint');
    for (const [id, value] of save.changes) {
      if (!id || this.changes.has(id) || value && (!hasDoodadRule(value.kind)
        || ![value.pos?.x, value.pos?.y, value.radius].every(Number.isFinite) || value.radius <= 0
        || value.felled && ![value.felled.at, value.felled.wake].every(Number.isFinite)))
        throw new Error('Invalid scenery consequence');
      const copy = value ? pieceState(value) : null;
      if (copy?.felled) {
        copy.felled.at += now - save.clock;
        copy.felled.wake += now - save.clock;
      }
      this.changes.set(id, copy);
    }
  }
  /** A saved native felling clock must resume even when no actor occupies its
   * page. Once mounted, sync's existing live-effect rule retains that page. */
  pendingFellingCells(): MassCell[] {
    const cells = new Map<string, MassCell>();
    for (const [, piece] of this.changes) if (piece?.felled) {
      const at = this.mass.walk.at(piece.pos.x, piece.pos.y), key = cellKey(at);
      if (!this.resident.has(key)) cells.set(key, { dimension: at.dimension, cx: at.cx, cy: at.cy });
    }
    return [...cells.values()];
  }
  private remember(grove: Grove, present: Set<Doodad>): void {
    for (const p of grove.pieces) {
      const value = present.has(p.live) && !p.live.gone ? pieceState(p.live) : null;
      if (value && canonical(value) === p.base)
        this.changes.delete(p.id);
      else
        this.changes.set(p.id, value);
    }
  }
  sync(world: World, cells: readonly MassCell[]): void {
    const wanted = new Map(cells.map(c => [cellKey(c), c])), present = new Set(world.doodads), remove = new Set<Doodad>();
    const span = this.mass.config.terrain.addressSpan;
    for (const [key, g] of this.resident) {
      if (wanted.has(key))
        continue;
      const o = localOffset({ ...g.cell, x: 0, y: 0 }, { ...this.mass.origin, x: 0, y: 0 }, span);
      const near = (p: {
        x: number;
        y: number;
      }) => p.x > o.x - 160 && p.y > o.y - 160 && p.x < o.x + span + 160 && p.y < o.y + span + 160;
      if (world.actors.some(a => !a.dead && near(a.pos)) || world.projectiles.some(p => near(p.pos))
        || g.pieces.some(p => present.has(p.live) && (p.live.felled || p.live.contactSource || p.live.evap)))
        continue;
      this.remember(g, present);
      for (const p of g.pieces)
        remove.add(p.live);
      this.resident.delete(key);
    }
    if (remove.size)
      world.doodads = world.doodads.filter(d => !remove.has(d));
    let changed = remove.size > 0;
    for (const [key, cell] of wanted) {
      if (this.resident.has(key))
        continue;
      const pieces: Grove['pieces'] = [], origin = localOffset({ ...cell, x: 0, y: 0 }, { ...this.mass.origin, x: 0, y: 0 }, span);
      const sites = this.mass.placesInCell(cell), spacing = this.spec.spacing;
      for (let y = 0; y < span; y += spacing)
        for (let x = 0; x < span; x += spacing) {
          const rng = massRandom(this.mass.generator.run.seed, [this.spec.source, key, x, y]);
          const pos = { x: origin.x + x + spacing * (.25 + rng.next() * .5), y: origin.y + y + spacing * (.25 + rng.next() * .5) };
          const terrain = this.mass.stream.sample(this.mass.walk.at(pos.x, pos.y));
          const rule = this.spec.rules.find(r => r.biomes.includes(terrain.biome));
          if (!rule || !(rule.regions ?? ['ground','sand']).includes(terrain.region) || !rng.chance(rule.chance))
            continue;
          const count = rule.cluster ? rng.int(...rule.cluster.count) : 1;
          const anchor = pos, cluster: Doodad[] = [];
          for (let i = 0; i < count; i++) {
            const angle = rule.cluster ? rng.range(0, Math.PI * 2) : 0;
            const reach = rule.cluster ? Math.sqrt(rng.next()) * rule.cluster.spread : 0;
            const pos = { x: anchor.x + Math.cos(angle) * reach, y: anchor.y + Math.sin(angle) * reach };
            const row = rng.weighted(rule.pieces), radius = rng.range(...row.radius);
            if (rule.cluster) {
              const ground = this.mass.stream.sample(this.mass.walk.at(pos.x, pos.y));
              if (!rule.biomes.includes(ground.biome) || !(rule.regions ?? ['ground','sand']).includes(ground.region)) continue;
            }
            if (this.mass.settlement?.reserves(pos.x, pos.y, radius) || this.mass.journey?.reserves(pos, radius)
              || sites.some(p => {
                const q = localOffset(p.center, { ...this.mass.origin, x: 0, y: 0 }, span);
                return Math.hypot(q.x - pos.x, q.y - pos.y) < p.radius + radius + 24;
              }))
              continue;
            const id = canonical([this.mass.generator.run.runId, this.spec.source, key, x, y, ...(rule.cluster ? [i] : [])]);
            const live: Doodad = { pos, radius, kind: row.kind, rot: rng.range(0, Math.PI * 2) }, base = canonical(pieceState(live));
            // Canopies may overlap; solid trunks retain a traversable gap. Decide
            // against generated peers, even when a saved peer has been removed.
            if (blocksMovement(live) && cluster.some(d => blocksMovement(d)
              && Math.hypot(d.pos.x-pos.x,d.pos.y-pos.y) < bodyRadiusOf(d)+bodyRadiusOf(live)+38)) continue;
            cluster.push({ ...live, pos: { ...pos } });
            const saved = this.changes.get(id);
            if (saved === null)
              continue;
            if (saved)
              Object.assign(live, JSON.parse(canonical(saved)));
            pieces.push({ id, live, base });
            world.doodads.push(live);
            changed = true;
            if (live.felled)
              world.restoreDoodadFelling(live, live.felled);
          }
        }
      this.resident.set(key, { cell, pieces });
    }
    if (changed)
      world.markDoodadsChanged();
  }
  snapshot(world: World): MassEcologySave {
    const present = new Set(world.doodads);
    for (const g of this.resident.values())
      this.remember(g, present);
    return JSON.parse(canonical({ clock: world.time, changes: [...this.changes].sort(([a], [b]) => a.localeCompare(b)) })) as MassEcologySave;
  }
  get stats(): {
    pages: number;
    pieces: number;
    changes: number;
  } {
    return { pages: this.resident.size, pieces: [...this.resident.values()].reduce((n, g) => n + g.pieces.length, 0), changes: this.changes.size };
  }
}
