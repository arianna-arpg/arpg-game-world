import type { World } from './world';
import type { SceneRoadSpec } from '../data/scenes';
import { type Doodad, doodadRuleOf } from './levelgen';
import { type Vec2, vec } from '../core/math';
import { SCENE_CFG } from '../data/scenes';

export interface SceneRoad {
  spec: SceneRoadSpec;
  origin: Vec2;
  axis: Vec2;
  pieces: Map<number, Doodad>;
}

/** Geometry shared by streaming, shoulder clearance and objective credit. */
export function sceneRoadCoordinates(road: SceneRoad, p: Vec2): { along: number; across: number } {
  const dx = p.x - road.origin.x, dy = p.y - road.origin.y;
  return { along: dx * road.axis.x + dy * road.axis.y, across: dx * -road.axis.y + dy * road.axis.x };
}

/** Membership uses the actual overlapping discs drawn as the traveled way. */
export function onSceneRoad(road: SceneRoad, p: Vec2): boolean {
  const { along, across } = sceneRoadCoordinates(road, p);
  const nearest = Math.round(along / road.spec.spacing) * road.spec.spacing;
  return Math.hypot(along - nearest, across) <= road.spec.radius;
}

/** Keep the whole lane clear, including grass that would visually bury it.
 *  The scene owns its ground; state-bearing pieces stay out of this sweep. */
export function sceneRoadShoulder(road: SceneRoad, d: Doodad): boolean {
  return Math.abs(sceneRoadCoordinates(road, d.pos).across) > road.spec.radius + d.radius;
}

export function beginSceneRoad(w: World, spec: SceneRoadSpec): SceneRoad {
  if (!(spec.radius > 0 && spec.spacing > 0 && spec.spacing <= spec.radius)) {
    throw new Error('Scene road needs positive radius and spacing <= radius');
  }
  const axes = { north: vec(0, -1), east: vec(1, 0), south: vec(0, 1), west: vec(-1, 0) };
  const road: SceneRoad = { spec, origin: vec(w.arena.w / 2, w.arena.h / 2), axis: axes[spec.direction], pieces: new Map() };
  w.doodads = w.doodads.filter(d => d.door || d.well || d.hollow || d.keep || d.hitbox
    || (!doodadRuleOf(d.kind).clearway && sceneRoadShoulder(road, d)));
  streamSceneRoad(w, road);
  w.markDoodadsChanged();
  return road;
}

/** A bounded window per seat, on a global integer lattice: no seams, no
 *  endpoint, and returning to culled ground gives exactly the same road. */
export function streamSceneRoad(w: World, road: SceneRoad): void {
  const { reach, cull } = SCENE_CFG.dressStream;
  const seats = w.seats.map(s => sceneRoadCoordinates(road, s.actor.pos));
  const { spacing, radius } = road.spec;
  let changed = false;
  for (const seat of seats) {
    if (Math.abs(seat.across) > reach + radius) continue;
    for (let i = Math.floor((seat.along - reach) / spacing); i <= Math.ceil((seat.along + reach) / spacing); i++) {
      if (road.pieces.has(i)) continue;
      const d: Doodad = { kind: 'road', radius,
        pos: vec(road.origin.x + road.axis.x * i * spacing, road.origin.y + road.axis.y * i * spacing) };
      road.pieces.set(i, d);
      w.doodads.push(d);
      changed = true;
    }
  }
  const drop = new Set<Doodad>();
  for (const [i, d] of road.pieces) {
    if (seats.some(s => Math.hypot(s.along - i * spacing, s.across) <= cull + radius)) continue;
    road.pieces.delete(i);
    drop.add(d);
  }
  if (drop.size) { w.doodads = w.doodads.filter(d => !drop.has(d)); changed = true; }
  if (changed) w.markDoodadsChanged();
}
