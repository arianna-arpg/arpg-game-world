import type { Actor } from './actor';
import { FEEDING_CUE_CFG as C, FEEDING_CUE_STYLES, type FeedingCueSpec } from '../data/feedingCues';

export type RestoreCueResource = 'life' | 'mana' | 'es' | 'absorb';
export interface RestoreGainCue { resource: RestoreCueResource; profile: string; color: string; left: number; strength: number; }
export interface FeedingMealCue { from: { x: number; y: number }; progress: number; profile: string; color: string; }
export interface FeedingCueState {
  gains: RestoreGainCue[];
  meal?: FeedingMealCue;
  mass?: { count: number; cap: number; profile: string; color: string };
}
export interface FeedingTransfer { to: { x: number; y: number }; fromTier: number; toTier: number; profile: string; }
export function feedingStyle(id: string) {
  return FEEDING_CUE_STYLES[Object.hasOwn(FEEDING_CUE_STYLES, id) ? id : 'flesh'];
}
export function feedingMaterial(spec: FeedingCueSpec | undefined, fallback: string) {
  const profile = spec?.profile && Object.hasOwn(FEEDING_CUE_STYLES, spec.profile) ? spec.profile : fallback;
  return { profile, color: spec?.color ?? feedingStyle(profile).color };
}
/** A short afterimage of a measured gain, never a prediction from missing life.
 * Coalesced per resource/material so a fast stream cannot accumulate particles. */
export function noteRestoreGain(a: Actor, resource: RestoreCueResource, amount: number,
  cue?: FeedingCueSpec | false): void {
  if (a.dead || a.downed || !(amount > 0) || cue === false) return;
  const material = feedingMaterial(cue, resource);
  const max = resource === 'life' || resource === 'absorb' ? a.maxLife() : resource === 'mana' ? a.availableMaxMana() : a.maxEs();
  const strength = Math.min(1, 0.4 + amount / Math.max(1, max) * 8);
  const row = a.restoreGains.find(g => g.resource === resource && g.profile === material.profile && g.color === material.color);
  if (row) { row.left = C.gainLife; row.strength = Math.max(row.strength, strength); }
  else a.restoreGains.push({ resource, ...material, strength, left: C.gainLife });
  if (a.restoreGains.length > C.gainRows) a.restoreGains.shift();
}
export function tickRestoreGains(a: Actor, dt: number): void {
  if (a.dead || a.downed) { a.restoreGains.length = 0; a.feedingMeal = undefined; return; }
  for (let i = a.restoreGains.length - 1; i >= 0; i--) {
    a.restoreGains[i].left -= dt;
    if (a.restoreGains[i].left <= 0) a.restoreGains.splice(i, 1);
  }
}
/** Call only AFTER actual removal. Endpoints are frozen at the transaction,
 * so the read survives a disappearing source without inventing a homing effect. */
export function feedingCueFlash(from: { x: number; y: number }, recipient: Actor,
  spec: FeedingCueSpec | false | undefined, fallback = 'flesh', fromTier = recipient.tier ?? 0, radius = C.transferRadius) {
  if (spec === false) return undefined;
  const material = feedingMaterial(spec, fallback), style = feedingStyle(material.profile);
  return { pos: { ...from }, radius: Math.max(4, radius), color: material.color, life: style.life, maxLife: style.life,
    feedingCue: { to: { ...recipient.pos }, fromTier, toTier: recipient.tier ?? 0, profile: material.profile } satisfies FeedingTransfer };
}
export function feedingCueState(a: Actor): FeedingCueState {
  if (a.dead || a.downed) return { gains: [] };
  if (a.feedingCues !== undefined) return a.feedingCues;
  const cs = a.casting, spec = cs?.inst.def.amalgam, cue = cs?.inst.def.feedingCue;
  const count = cs?.amalgamFed ?? 0;
  return { gains: a.restoreGains, meal: a.feedingMeal,
    mass: cs?.mode === 'channel' && spec && count > 0 && cue !== false
      ? { count, cap: spec.cap, ...feedingMaterial(cue, 'ritual') } : undefined };
}
export function cloneFeedingCues(row: FeedingCueState): FeedingCueState {
  return { gains: row.gains.map(g => ({ ...g })), mass: row.mass ? { ...row.mass } : undefined,
    meal: row.meal ? { ...row.meal, from: { ...row.meal.from } } : undefined };
}
