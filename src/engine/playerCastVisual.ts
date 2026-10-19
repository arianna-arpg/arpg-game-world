import type { Actor } from './actor';
import { castingCompletion } from './castingCues';
import { skillCastProfile, type CastProfile } from '../data/skillCastVisuals';

export interface PlayerCastPreparation { profile: CastProfile; fill?: number; age: number; facing: number; radius: number; }
/** Read the cast that also owns the bar. No inferred success/release timer and
 * no invented completion for an endless channel. Own co-op casts retain their
 * real instance and host-resolved completion through the existing CastW. */
export function playerCastPreparation(a: Actor): PlayerCastPreparation | undefined {
  const cs = a.casting;
  if (!cs || a.dead || a.downed || a.burrow || a.summonReform || a.isStunned()
    || cs.mode === 'guard' || cs.inst.def.castingCue === false) return;
  const profile = skillCastProfile(cs.inst.def);
  if (!profile) return;
  let fill = castingCompletion(a);
  if (fill === undefined && cs.mode !== 'channel') {
    if (!(cs.total > 0)) return;
    fill = Math.max(0, Math.min(1, cs.elapsed / cs.total));
  }
  // Facing belongs to the body, including self-targeted casts and locked aim.
  return { profile, fill, age: Math.max(0, cs.channelTime ?? cs.elapsed),
    facing: a.facing, radius: a.radius };
}
