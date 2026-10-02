import type { Actor } from './actor';
import { instanceDelivery, type SkillInstance } from './skills';
import { BODY_ACTION_CFG as C, BODY_ACTION_PROFILES, type BodyActionProfile } from '../data/bodyAction';

export interface BodyActionPose { shift: number; turn: number; sx: number; sy: number; facing: number }
export interface BodyActionStamp { at: number; facing: number; profile: string }
const unit = (n: number) => Math.max(0, Math.min(1, n));
function profileId(inst: SkillInstance): string | undefined {
  if (inst.def.bodyMotion === false) return;
  if (inst.def.bodyMotion && Object.hasOwn(BODY_ACTION_PROFILES, inst.def.bodyMotion)) return inst.def.bodyMotion;
  const d = instanceDelivery(inst);
  if (d.type === 'melee') return d.arcDeg >= 100 ? 'sweep' : 'thrust';
  if (d.type === 'projectile' || d.type === 'cone' || d.type === 'ground') return 'cast';
  if (d.type === 'nova') return 'pulse';
}
function profile(id?: string): BodyActionProfile | undefined {
  return id && Object.hasOwn(BODY_ACTION_PROFILES, id) ? BODY_ACTION_PROFILES[id] : undefined;
}
/** Called only at the successful native real-use completion gate, never on
 * disappearance of a cast. Cancellation/fizzle cannot invent a strike. */
export function markBodyAction(a: Actor, inst: SkillInstance, at: number, facing: number): void {
  const id = profileId(inst);
  a.bodyAction = id ? { at, facing, profile: id } : undefined;
}
/** Shared host read. Mirrors receive the resolved pose, not guessed delivery
 * metadata from their intentionally incomplete skill stubs. No RNG or writes. */
export function bodyActionPoseOf(a: Actor, time: number): BodyActionPose | undefined {
  if (!C.enabled || a.dead || a.downed || a.passive || a.burrow || a.leap || a.dash || a.caromRun) return;
  if (a.bodyActionPose !== undefined) return a.bodyActionPose ?? undefined;
  if (a.isStunned()) return;
  let shift = 0, turn = 0, sx = 1, sy = 1, facing = a.facing, active = false;
  const cs = a.casting;
  // Held modes retain their authored readiness/guard posture. A repeating
  // channel clock must never fake a fresh full-body attack preparation.
  if (cs && (cs.mode === 'cast' || cs.mode === 'perfect' || cs.mode === 'timed')) {
    const p = profile(profileId(cs.inst));
    if (p && cs.total > 0) {
      const q = unit(cs.elapsed / cs.total), load = q * q;
      const aim = cs.lockedAim ?? cs.aim;
      facing = Math.hypot(aim.x-a.pos.x, aim.y-a.pos.y) > 1 ? Math.atan2(aim.y-a.pos.y, aim.x-a.pos.x) : a.facing;
      shift -= p.pull * load; turn += p.windTurn * load;
      sx -= p.compress * load; sy += p.compress * load * .5; active = true;
    }
  }
  const stamp = a.bodyAction, p = profile(stamp?.profile);
  if (stamp && p && time >= stamp.at && time-stamp.at < p.settle) {
    const rest = 1-unit((time-stamp.at)/p.settle), release = rest*rest;
    // Completion can overlap the next preparation without suppressing either.
    shift += p.reach*release; turn += p.releaseTurn*release;
    sx += p.stretch*release; sy -= p.stretch*release*.5;
    if (!active) facing = stamp.facing;
    active = true;
  }
  if (!active) return;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi,n));
  return { shift: clamp(shift,-C.maxShift,C.maxShift), turn: clamp(turn,-C.maxTurn,C.maxTurn),
    sx: clamp(sx,C.minScale,C.maxScale), sy: clamp(sy,C.minScale,C.maxScale), facing };
}
