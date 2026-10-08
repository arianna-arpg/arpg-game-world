import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import type { Doodad } from '../engine/levelgen';
import type { Vec2 } from '../core/math';
import type { SettlementDefensesSpec } from '../data/settlementDefenses';
import { settlementDeparture, type SettlementEdge, type SettlementFoundation } from './settlementExits';
export interface SettlementGate { edge: SettlementEdge; pos: Vec2; normal: Vec2 }
export function validateSettlementDefenses(s: SettlementDefensesSpec): void {
  if (!s || typeof s.source !== 'string' || !s.source || s.source.length > 256
    || !Number.isFinite(s.offset) || s.offset < 32 || s.offset > 96
    || !Number.isFinite(s.gateWidth) || s.gateWidth < 150 || s.gateWidth > 240
    || !Number.isFinite(s.railRadius) || s.railRadius < 16 || s.railRadius > 40
    || !Number.isSafeInteger(s.guardLevel) || s.guardLevel < 1 || s.guardLevel > 30)
    throw Error('Invalid settlement defenses');
}
/** Whole closed timber perimeter, with four honest gaps matching native roads.
 * Outside the building footprint, inside the reserved dry settlement apron. */
export function settlementDefenses(town: SettlementFoundation, spec: SettlementDefensesSpec): {pieces: Doodad[]; gates: SettlementGate[]} {
  validateSettlementDefenses(spec);
  const {w, h} = town.zone.size, o = spec.offset, r = spec.railRadius;
  const pieces: Doodad[] = [], gates: SettlementGate[] = [];
  for (const edge of ['north', 'east', 'south', 'west'] as const) {
    const start = settlementDeparture(town, edge), horizontal = edge === 'north' || edge === 'south';
    const normal = {x: edge === 'west' ? -1 : edge === 'east' ? 1 : 0,
      y: edge === 'north' ? -1 : edge === 'south' ? 1 : 0};
    const fixed = edge === 'north' || edge === 'west' ? -o : horizontal ? h + o : w + o;
    const center = horizontal ? start.x : start.y, extent = horizontal ? w : h;
    const point = (t: number) => horizontal ? {x: t, y: fixed} : {x: fixed, y: t};
    gates.push({edge, pos: point(center), normal});
    // Divide each run exactly: no fractional end gap or overlapping corner discs.
    for (const [a, b] of [[-o, center - spec.gateWidth / 2], [center + spec.gateWidth / 2, extent + o]]) {
      const n = Math.ceil((b - a) / (r * 2)), half = (b - a) / n / 2;
      for (let i = 0; i < n; i++) pieces.push({kind: 'rail_fence', pos: point(a + (i + .5) * half * 2),
        radius: half + .5, rot: horizontal ? 0 : Math.PI / 2});
    }
    for (const sign of [-1, 1]) pieces.push({kind: 'lantern', pos: point(center + sign * (spec.gateWidth / 2 + 14)), radius: 9});
  }
  return {pieces, gates};
}
export function raiseSettlementDefenses(world: World, town: SettlementFoundation, spec: SettlementDefensesSpec): {guards: Actor[]; gates: SettlementGate[]} {
  const plan = settlementDefenses(town, spec), guards: Actor[] = [];
  world.doodads.push(...plan.pieces);
  for (const gate of plan.gates) for (const [i, id] of ['lastlight_watchman', 'lastlight_bowman'].entries()) {
    const guard = world.createMonster(id, spec.guardLevel, 'player', undefined, {scale: 1});
    const side = i ? 1 : -1;
    guard.pos = {x: gate.pos.x - gate.normal.x * 35 - gate.normal.y * side * 54,
      y: gate.pos.y - gate.normal.y * 35 + gate.normal.x * side * 54};
    guard.aiAnchor = {...guard.pos}; guard.aiPost = {...guard.pos};
    guard.facing = guard.aiPostFacing = Math.atan2(gate.normal.y, gate.normal.x);
    guard.fillResources(); guards.push(guard); world.actors.push(guard);
  }
  world.markDoodadsChanged();
  return {guards, gates: plan.gates};
}
