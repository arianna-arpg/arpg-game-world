import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import type { Doodad, PlacedStructure } from '../engine/levelgen';
import { hasDoodadRule } from '../engine/levelgen';
import { START_ZONE, type ZoneDef } from '../data/zones';
import { MONSTERS } from '../data/monsters';
import { TOWN_TIERS } from '../data/townBuild';
import { regionKind } from '../world/regions';
import { GridWalkField } from '../world/gridWalk';
import type { MassState } from './state';
import type { MassWalk } from './walk';
import { canonical, massHash } from './random';
import { pieceState, type PieceState } from './sites';

export interface MassSettlementSpec {
  zone: string; source: string; apron: number; blend: number;
}
interface BodyState {
  id: string; monster: string; level: number; team: Actor['team']; name: string; color: string; tag?: string;
  scale: number; dead: boolean; x: number; y: number; life: number; tier: number;
}
export interface MassSettlementSave {
  zone: ZoneDef; tier: number; clock: number; bornAt: number;
  scenery: [number, PieceState | null][];
  regions: [number, string][];
  doors: [string, 'open' | 'broken'][];
  bodies: BodyState[];
}
/** A native settlement stays resident in the continuous simulation. Its finite
 * floor joins the geographic field; the border never invokes loadZone.
 * Layout/growth is pinned for this run, so Continue cannot move a building
 * through a saved actor when account unlocks change. */
export class MassSettlement {
  readonly zone: ZoneDef;
  readonly grid: GridWalkField;
  readonly spawn: { x: number; y: number };
  readonly structures: readonly PlacedStructure[];
  readonly tier: number;
  readonly bornAt: number;
  private baseRegions: string[];
  private pieces: { live: Doodad; base: string }[];
  private bodies: { id: string; live: Actor }[];
  constructor(readonly spec: MassSettlementSpec, world: World, seed: number, saved?: MassSettlementSave) {
    if (spec.zone !== START_ZONE || !spec.source || !Number.isFinite(spec.apron) || spec.apron < 96 || spec.apron > 1024
      || !Number.isFinite(spec.blend) || spec.blend < 24 || spec.blend > 512)
      throw new Error('Invalid native settlement descriptor');
    if (saved && (saved.zone?.id !== spec.zone || !Number.isInteger(saved.tier) || !TOWN_TIERS[saved.tier]
      || saved.zone.size.w !== TOWN_TIERS[saved.tier].w || saved.zone.size.h !== TOWN_TIERS[saved.tier].h
      || !Number.isFinite(saved.clock) || !Number.isFinite(saved.bornAt) || !Array.isArray(saved.regions) || !Array.isArray(saved.scenery) || !Array.isArray(saved.doors) || !Array.isArray(saved.bodies)))
      throw new Error('Invalid native settlement checkpoint');
    this.bornAt = saved?.bornAt ?? world.time;
    world.loadMassSettlement(seed, this.bornAt, saved?.zone, saved?.tier);
    if (!(world.walk instanceof GridWalkField)) throw new Error('Native settlement requires a region grid');
    this.zone = JSON.parse(JSON.stringify(world.zone));
    this.grid = world.walk;
    this.structures = [...world.structures];
    this.baseRegions = Array.from(this.grid.kind, (_, i) => this.cellRegion(i));
    this.spawn = { ...world.player.pos };
    this.tier = world.townTierIndex();
    this.pieces = world.doodads.map(live => ({ live, base: canonical(pieceState(live)) }));
    const counts = new Map<string, number>();
    this.bodies = world.actors.filter(a => !!a.defId && !a.owner && !world.seats.some(s => s.actor === a)).map(live => {
      const n = counts.get(live.defId!) ?? 0; counts.set(live.defId!, n + 1);
      return { id: live.defId + '#' + n, live };
    });
    if (saved) this.restore(world, saved);
  }
  contains(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.zone.size.w && y < this.zone.size.h;
  }
  /** Immutable native foundation used by generation planners. Live floor edits
   * must not move a seeded destination when Continue rebuilds its route plan. */
  foundationRegion(x: number, y: number): string | undefined {
    if (!this.contains(x, y)) return undefined;
    const index = Math.floor(y / this.grid.cell) * this.grid.cols + Math.floor(x / this.grid.cell);
    return this.baseRegions[index];
  }
  distance(x: number, y: number): number {
    return Math.hypot(Math.max(0, -x, x - this.zone.size.w), Math.max(0, -y, y - this.zone.size.h));
  }
  reserves(x: number, y: number, radius: number): boolean { return this.distance(x, y) < this.spec.apron + this.spec.blend + radius; }
  /** Reserve complete native footprints BEFORE any wilderness population or
   * site scenery is admitted. A feathered verge hides the old arena rectangle. */
  reserve(state: MassState, walk: MassWalk): void {
    const cs = walk.stream.generator.spec.terrainCell, pad = this.spec.apron + this.spec.blend;
    const color = this.zone.theme.ground?.palette?.[2] ?? this.zone.theme.floor;
    const rgb = (v: string) => [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
    const town = rgb(color);
    for (let y = Math.floor(-pad / cs) * cs; y < this.zone.size.h + pad; y += cs) {
      for (let x = Math.floor(-pad / cs) * cs; x < this.zone.size.w + pad; x += cs) {
        const dist = this.distance(x + cs / 2, y + cs / 2);
        const edge = this.spec.apron + this.spec.blend * (.7 + .3 * massHash(x + ',' + y, 71) / 0x100000000);
        if (dist >= edge) continue;
        const at = walk.at(x, y), wild = walk.stream.generator.terrainAt(at);
        const t = Math.max(0, Math.min(1, (edge - dist) / this.spec.blend));
        const base = rgb(wild.color);
        const blended = '#' + town.map((v, i) => Math.round(v * t + base[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
        state.paint({ address: at, region: 'ground', color: blended, cause: this.spec.source + '/foundation' });
      }
    }
  }
  private cellRegion(index: number): string {
    return this.grid.regionAt((index % this.grid.cols + .5) * this.grid.cell,
      (Math.floor(index / this.grid.cols) + .5) * this.grid.cell);
  }
  private restore(world: World, save: MassSettlementSave): void {
    const cells = new Set<number>();
    for (const [index, kind] of save.regions) {
      if (!Number.isInteger(index) || index < 0 || index >= this.baseRegions.length || !regionKind(kind) || cells.has(index))
        throw new Error('Invalid native region checkpoint');
      cells.add(index);
      const x = (index % this.grid.cols + .5) * this.grid.cell, y = (Math.floor(index / this.grid.cols) + .5) * this.grid.cell;
      this.grid.fillRegion(x, y, x, y, kind);
    }
    const changed = new Set<number>();
    for (const [index, value] of save.scenery) {
      const piece = this.pieces[index];
      if (!piece || changed.has(index)) throw new Error('Invalid native scenery identity');
      changed.add(index);
      if (!value) { piece.live.gone = true; continue; }
      if (!hasDoodadRule(value.kind) || ![value.pos?.x, value.pos?.y, value.radius].every(Number.isFinite)
        || value.radius <= 0 || (value.felled && ![value.felled.at, value.felled.wake].every(Number.isFinite)))
        throw new Error('Invalid native scenery state');
      Object.assign(piece.live, JSON.parse(canonical(value)));
      if (piece.live.felled) {
        piece.live.felled.at += world.time - save.clock; piece.live.felled.wake += world.time - save.clock;
        world.restoreDoodadFelling(piece.live, piece.live.felled);
      }
    }
    world.doodads = world.doodads.filter(d => !d.gone);
    for (const [id, state] of save.doors) {
      if (!this.pieces.some(p => p.live.door?.id === id) || !['open', 'broken'].includes(state))
        throw new Error('Invalid native door checkpoint');
      world.setDoorState(id, state, { silent: true });
    }
    const seen = new Set<string>();
    for (const row of save.bodies) {
      if (!MONSTERS[row.monster] || !row.id.startsWith(row.monster + '#') || seen.has(row.id)
        || !['player', 'enemy', 'neutral'].includes(row.team) || typeof row.dead !== 'boolean'
        || ![row.x, row.y, row.life, row.tier, row.scale, row.level].every(Number.isFinite)
        || row.scale <= 0 || row.level < 1 || !Number.isInteger(row.tier) || row.tier < 0 || row.tier > 6)
        throw new Error('Invalid native resident checkpoint: ' + row.id);
      seen.add(row.id);
      let body = this.bodies.find(b => b.id === row.id)?.live;
      if (!body) {
        body = world.createMonster(row.monster, row.level, row.team, undefined, { scale: row.scale });
        body.fillResources(); this.bodies.push({ id: row.id, live: body }); world.actors.push(body);
      }
      body.name = row.name; body.color = row.color; body.tag = row.tag;
      body.dead = row.dead; body.pos = { x: row.x, y: row.y }; body.tier = row.tier;
      body.life = Math.max(0, Math.min(body.maxLife(), row.life));
    }
    // Ambient fauna and account residents can be generated differently later;
    // this run owns its saved roster, including bodies which have already died.
    const extras = new Set(this.bodies.filter(b => !seen.has(b.id)).map(b => b.live));
    world.actors = world.actors.filter(a => !extras.has(a));
    const retained = new Map(this.bodies.map(b => [b.id, b]));
    this.bodies = save.bodies.map(row => retained.get(row.id)!);
    world.markDoodadsChanged();
    world.rebuildClientTerrain();
  }
  snapshot(world: World): MassSettlementSave {
    const present = new Set(world.doodads);
    const scenery: MassSettlementSave['scenery'] = [];
    this.pieces.forEach((p, i) => {
      const state = present.has(p.live) && !p.live.gone ? pieceState(p.live) : null;
      if (canonical(state) !== p.base) scenery.push([i, state]);
    });
    return JSON.parse(canonical({ zone: this.zone, tier: this.tier, clock: world.time, bornAt: this.bornAt, scenery,
      regions: this.baseRegions.flatMap((kind, i) => this.cellRegion(i) === kind ? [] : [[i, this.cellRegion(i)]]),
      doors: this.pieces.flatMap(p => p.live.door?.open ? [[p.live.door.id, p.live.door.broken ? 'broken' : 'open']] : []),
      bodies: this.bodies.map(({ id, live: a }) => ({ id, monster: a.defId!, team: a.team, level: a.level, scale: a.spawnScale ?? 1,
        name: a.name, color: a.color, ...(a.tag ? { tag: a.tag } : {}), dead: a.dead, x: a.pos.x, y: a.pos.y, life: a.life, tier: a.tier ?? 0 })),
    })) as MassSettlementSave;
  }
}
