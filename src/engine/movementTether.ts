import type { Vec2 } from '../core/math';
import type { Actor } from './actor';
import type { World } from './world';

/** Physical reach, independent of targeting leashes and damaging pack links.
 * Distances measure actor centres. Attacks retain their own authored reach. */
export interface MovementTetherSpec {
  length: number;
  /** Recoil starts at this fraction of length; hysteresis ends at rest. */
  taut?: number;
  rest?: number;
  returnSpeed?: number;
  /** A destroyed/missing/off-story entity anchor releases or becomes a point. */
  onAnchorLost?: 'release' | 'hold';
  color?: string;
  width?: number;
  style?: 'vine' | 'chain' | 'spirit';
  anchorSize?: number;
}
export const MOVEMENT_TETHER_CFG = {
  taut: 0.98, rest: 0.3, returnSpeed: 220,
  color: '#a1aa86', width: 3, anchorSize: 9,
};
export interface MovementTetherState {
  spec: MovementTetherSpec;
  point: Vec2;
  tier: number;
  anchorId?: number;
  returning: boolean;
  released?: boolean;
  /** Last legal point: terrain sliding must not push the body outside its cord. */
  safe: Vec2;
}

export function movementTetherErrors(s: MovementTetherSpec): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(s.length) || s.length <= 0) errors.push('length must be positive');
  const taut = s.taut ?? MOVEMENT_TETHER_CFG.taut, rest = s.rest ?? MOVEMENT_TETHER_CFG.rest;
  if (!(rest >= 0 && rest < taut && taut <= 1)) errors.push('require 0 <= rest < taut <= 1');
  if (!Number.isFinite(s.returnSpeed ?? MOVEMENT_TETHER_CFG.returnSpeed)
    || (s.returnSpeed ?? MOVEMENT_TETHER_CFG.returnSpeed) <= 0) errors.push('returnSpeed must be positive');
  for (const key of ['width', 'anchorSize'] as const) {
    if (s[key] !== undefined && (!Number.isFinite(s[key]) || s[key]! <= 0)) errors.push(`${key} must be positive`);
  }
  if (s.style !== undefined && !['vine', 'chain', 'spirit'].includes(s.style)) errors.push('unknown style');
  if (s.onAnchorLost !== undefined && !['hold', 'release'].includes(s.onAnchorLost)) errors.push('unknown anchor loss policy');
  return errors;
}

/** Public instance seam: traps, summons and encounters may bind ANY actor.
 * Binding to an entity never transfers ownership or damage credit. */
export function bindMovementTether(a: Actor, spec: MovementTetherSpec, anchor: Vec2 | Actor = a.pos): void {
  if (movementTetherErrors(spec).length) throw new Error('Invalid movementTether spec');
  const body = 'pos' in anchor ? anchor : undefined;
  if (body === a) throw new Error('A movementTether cannot anchor to itself');
  const p = body?.pos ?? anchor as Vec2;
  a.movementTether = { spec, point: { ...p }, tier: body?.tier ?? a.tier,
    anchorId: body?.id, returning: false, safe: { ...a.pos } };
}

export function ensureMovementTether(a: Actor): void {
  if (!a.movementTether && a.movementTetherSpec) bindMovementTether(a, a.movementTetherSpec);
}

/** Engine-owned party landings cross coordinate spaces. Native cords re-root
 * at arrival; a temporary external binding belongs to the departed encounter. */
export function landMovementTether(a: Actor): void {
  if (!a.movementTether) return;
  if (a.movementTetherSpec) bindMovementTether(a, a.movementTetherSpec);
  else { a.movementTether.released = true; a.movementTether.returning = false; }
}

export function refreshMovementTether(a: Actor, w: World): MovementTetherState | undefined {
  const t = a.movementTether;
  if (!t || t.released || a.dead) return;
  if (t.anchorId !== undefined) {
    const anchor = w.actorById(t.anchorId);
    if (!anchor || anchor.dead || anchor.tier !== a.tier) {
      t.anchorId = undefined;
      if (t.spec.onAnchorLost === 'release') { t.released = true; t.returning = false; return; }
    } else { t.point = { ...anchor.pos }; t.tier = anchor.tier; }
  }
  return t;
}

export function movementTetherDistance(t: MovementTetherState, p: Vec2): number {
  return Math.hypot(p.x - t.point.x, p.y - t.point.y);
}
/** Pure projection shared by walking, forced movement and the final sweep. */
export function movementTetherLimit(t: MovementTetherState, p: Vec2): Vec2 {
  const d = movementTetherDistance(t, p);
  if (d <= t.spec.length) return p;
  const f = t.spec.length / d;
  return { x: t.point.x + (p.x - t.point.x) * f, y: t.point.y + (p.y - t.point.y) * f };
}

/** Final authority after displacement systems. Recoil is mechanical, so stun
 * cannot disable a chain; the world timeflow still scales its clock. */
export function updateMovementTethers(w: World, dt: number): void {
  for (const a of w.actors) {
    if (a.dead) continue;
    ensureMovementTether(a);
    const t = refreshMovementTether(a, w);
    if (!t) continue;
    const d = movementTetherDistance(t, a.pos), s = t.spec;
    if (d >= s.length * (s.taut ?? MOVEMENT_TETHER_CFG.taut)) t.returning = true;
    let goal = movementTetherLimit(t, a.pos);
    const rest = s.length * (s.rest ?? MOVEMENT_TETHER_CFG.rest);
    const reach = movementTetherDistance(t, goal);
    if (t.returning && reach > rest) {
      const step = Math.min(reach - rest, (s.returnSpeed ?? MOVEMENT_TETHER_CFG.returnSpeed)
        * Math.max(0, dt) * w.timeflow.actorScale(a));
      goal = { x: goal.x + (t.point.x - goal.x) * step / reach,
        y: goal.y + (t.point.y - goal.y) * step / reach };
    }
    // A mechanical restraint also prevents locomotion across a story boundary.
    a.tier = t.tier;
    const before = { ...a.pos };
    a.pos = w.clampPos(goal, a.radius, t.safe, { mover: a });
    if (t.returning || d > s.length) { a.vel.x = 0; a.vel.y = 0; }
    // An obstructed reel must not permanently silence the body's combat AI.
    if (t.returning && dt > 0 && w.timeflow.actorScale(a) > 0
      && Math.hypot(a.pos.x - before.x, a.pos.y - before.y) < 0.001) t.returning = false;
    t.safe = { ...a.pos };
    if (movementTetherDistance(t, a.pos) <= rest + 0.01) t.returning = false;
  }
}

/** Zone memory stores point bindings; entity ids are visit-local. Explicit
 * release policies stay released when their entity cannot cross the reload. */
export function savedMovementTether(a: Actor): MovementTetherState | undefined {
  const t = a.movementTether;
  if (!t) return;
  return { ...t, spec: { ...t.spec }, point: { ...t.point }, safe: { ...t.safe }, anchorId: undefined,
    released: t.released || (t.anchorId !== undefined && t.spec.onAnchorLost === 'release') };
}
export function restoreMovementTether(raw: unknown): MovementTetherState | undefined {
  const t = raw as MovementTetherState | undefined;
  if (!t || !t.spec || movementTetherErrors(t.spec).length
    || !Number.isFinite(t.point?.x) || !Number.isFinite(t.point?.y)
    || !Number.isFinite(t.safe?.x) || !Number.isFinite(t.safe?.y)
    || !Number.isFinite(t.tier)) return;
  return { spec: { ...t.spec }, point: { ...t.point }, safe: { ...t.safe },
    tier: t.tier, returning: !!t.returning, released: !!t.released };
}
