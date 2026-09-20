import type { Actor } from './actor';
import { guardBashReady, guardBashSpec, type GuardBashSpec } from './skills';

export interface GuardReleaseCue {
  facing: number; radius: number; arc: number; fullCircle: boolean;
  progress: number; color: string;
}
/** The warning and the actual release use this one geometry fold. */
export function guardBashGeometry(a: { radius: number }, bash: GuardBashSpec) {
  const arc = bash.arcDeg * Math.PI / 180;
  const fullCircle = arc >= Math.PI * 1.9;
  return { radius: a.radius + bash.range, arc: fullCircle ? Math.PI * 2 : arc, fullCircle };
}
/** No extra timer. Pressure can disarm a threatened bash before its deadline;
 * the footprint disappears while the guard itself can remain raised. */
export function guardReleaseCue(a: Actor, now: number): GuardReleaseCue | undefined {
  const cs = a.casting;
  if (cs?.mode !== 'guard' || a.dead || a.downed || a.isStunned()) return;
  if (cs.guardReleaseCue) return cs.guardReleaseCue;
  if (cs.aiGuardReleaseAt === undefined || !cs.aiGuardWindup || cs.aiGuardFacing === undefined) return;
  const left = cs.aiGuardReleaseAt - now;
  const payload = cs.bashLow ? (cs.maxShield || 1) - Math.max(0,cs.shield ?? 0) : Math.max(0,cs.shield ?? 0);
  if (left < -1e-9 || payload <= 0 || !guardBashReady(cs).line
    || (cs.channelTime ?? 0) + Math.max(0,left) + 1e-6 < (cs.bashArmAt ?? 0)) return;
  const bash = guardBashSpec(cs.inst);
  if (!bash) return;
  return { ...guardBashGeometry(a,bash), facing: cs.aiGuardFacing,
    progress: Math.max(0,Math.min(1,1-left/cs.aiGuardWindup)),color:cs.inst.def.color };
}

/** Resolved presentation, not an order: clients cannot steer an actor with it.
 * No target location or invented attack footprint is sent for a maneuver. */
export interface EncounterCue {
  group: number; leader: number; plan: string; style: string; color: string;
  phase: 'warning' | 'commit' | 'recover'; progress: number;
  conductor: boolean; facing: number;
}
