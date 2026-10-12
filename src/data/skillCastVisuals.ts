import type { SkillDef } from '../engine/skills';
import { SKILL_BURSTS, type BurstMotif } from './skillVisuals';
import { SKILL_FLIGHTS, SKILL_FIELDS, skillBeamVoice } from './skillFlightVisuals';
import { presenceProfile } from './skillPresenceVisuals';
import { selfProfile } from './skillSelfVisuals';
import { skillStrikeProfile } from './skillStrikeVisuals';
import { skillTargetProfile, skillRiteProfile } from './skillTargetVisuals';
import { movementProfile } from './skillMovementVisuals';

export type CastFamily = 'summon' | 'construct' | 'storm' | 'bolt' | 'beam' | 'field' | 'target' | 'strike' | 'travel' | 'self';
export interface CastProfile { family: CastFamily; skillId: string; motif: BurstMotif; gathering?: 'fork' | 'links'; }
/** A deliberately small preparation vocabulary. Payload identities supply the
 * material/signature; delivery supplies the gesture, never damage type or tint. */
export function skillCastProfile(def: SkillDef): CastProfile | undefined {
  if (!def.delivery || def.castingCue === false) return;
  const id = def.id, type = def.delivery.type;
  const presence = presenceProfile(id), self = selfProfile(id), strike = skillStrikeProfile(id);
  const target = skillRiteProfile(id) ?? skillTargetProfile(id), movement = movementProfile(id);
  const flight = Object.hasOwn(SKILL_FLIGHTS, id) ? SKILL_FLIGHTS[id] : undefined;
  const field = Object.hasOwn(SKILL_FIELDS, id) ? SKILL_FIELDS[id] : undefined;
  const burst = Object.hasOwn(SKILL_BURSTS, id) ? SKILL_BURSTS[id] : undefined;
  const family: CastFamily | undefined = def.amalgam || type === 'summon' ? 'summon'
    : type === 'construct' ? 'construct' : type === 'storm' ? 'storm'
    : skillBeamVoice(id) ? 'beam' : type === 'projectile' ? 'bolt'
    : type === 'melee' || type === 'cone' ? 'strike'
    : movement ? 'travel' : type === 'target' || target ? 'target'
    : field || type === 'nova' ? 'field' : self || type === 'self' ? 'self' : undefined;
  if (!family) return;
  return { family, skillId: id, gathering: flight?.wake === 'fork' || flight?.wake === 'links' ? flight.wake : undefined, motif: presence?.motif ?? self?.motif ?? target?.motif
    ?? strike?.motif ?? movement?.motif ?? flight?.head ?? field?.motif ?? burst?.motif ?? 'runes' };
}
export const CAST_PREPARATION_STYLE = { radius: 30, glyph: 15, width: 1.5, outline: '#111a23', alpha: .72 };
