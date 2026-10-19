import type { Actor } from './actor';
import { FEEDING_CUE_CFG as C, FEEDING_CUE_STYLES, type FeedingCueSpec } from '../data/feedingCues';
import { RESOURCE_FLOW, RESOURCE_VISUALS } from '../data/resourceVisuals';

export type RestoreCueResource = 'life' | 'mana' | 'es' | 'absorb';
export interface RestoreGainCue { resource: RestoreCueResource; profile: string; color: string; left: number; strength: number; }
export interface FeedingMealCue { from: { x: number; y: number }; progress: number; profile: string; color: string; }
export interface ResourceFlowCue {
  source: number; from: { x: number; y: number }; to: { x: number; y: number };
  fromTier: number; toTier: number; resource: RestoreCueResource;
  color: string; age: number; left: number; strength: number;
}
export interface FeedingCueState {
  gains: RestoreGainCue[];
  flows?: ResourceFlowCue[];
  meal?: FeedingMealCue;
  mass?: { count: number; cap: number; profile: string; color: string };
}
export interface FeedingTransfer { kind?: 'restore'; to: { x: number; y: number }; fromTier: number; toTier: number; profile: string; }
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
  if (a.dead || a.downed) { a.restoreGains.length = 0; a.resourceFlows.length = 0; a.feedingMeal = undefined; return; }
  for (let i = a.resourceFlows.length - 1; i >= 0; i--) {
    const row = a.resourceFlows[i]; row.age += dt; row.left -= dt;
    if (row.left <= 0) a.resourceFlows.splice(i, 1);
  }
  for (let i = a.restoreGains.length - 1; i >= 0; i--) {
    a.restoreGains[i].left -= dt;
    if (a.restoreGains[i].left <= 0) a.restoreGains.splice(i, 1);
  }
}
/** Only measured recovery enters this lane. Coalesce repeated damage ticks
 * without resetting motion; no random draws, actors, projectiles or payouts. */
export function noteResourceFlow(a: Actor, source: Actor, resource: RestoreCueResource, amount: number,
  cue?: FeedingCueSpec | false): void {
  if (a.dead || a.downed || !(amount > 0) || cue === false) return;
  noteRestoreGain(a, resource, amount, cue);
  if (a === source) return;
  const max = resource === 'life' || resource === 'absorb' ? a.maxLife() : resource === 'mana' ? a.availableMaxMana() : a.maxEs();
  const strength = Math.min(1, 0.45 + amount / Math.max(1, max) * 8);
  const color = cue?.color ?? RESOURCE_VISUALS[resource].color;
  const old = a.resourceFlows.find(r => r.source === source.id && r.resource === resource && r.color === color);
  const endpoints = { from: { ...source.pos }, to: { ...a.pos }, fromTier: source.tier ?? 0, toTier: a.tier ?? 0 };
  if (old) { Object.assign(old, endpoints); old.left = RESOURCE_FLOW.life; old.strength = Math.max(old.strength, strength); }
  else a.resourceFlows.push({ source: source.id, ...endpoints, resource, color, age: 0, left: RESOURCE_FLOW.life, strength });
  if (a.resourceFlows.length > RESOURCE_FLOW.rows) a.resourceFlows.shift();
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
/** A source-linked restoration after a measured gain. Unlike consumption,
 * the source remains intact. Optional kind preserves legacy meal packets. */
export function restorationCueFlash(from: {x:number;y:number}, recipient:Actor,
  spec: FeedingCueSpec | false | undefined, fromTier=recipient.tier??0) {
  const flash=feedingCueFlash(from,recipient,spec,'restoration',fromTier);
  return flash?{...flash,feedingCue:{...flash.feedingCue,kind:'restore' as const}}:undefined;
}
export function feedingCueState(a: Actor): FeedingCueState {
  if (a.dead || a.downed) return { gains: [] };
  if (a.feedingCues !== undefined) return a.feedingCues;
  const cs = a.casting, spec = cs?.inst.def.amalgam, cue = cs?.inst.def.feedingCue;
  const count = cs?.amalgamFed ?? 0;
  return { gains: a.restoreGains, flows: a.resourceFlows.length ? a.resourceFlows : undefined, meal: a.feedingMeal,
    mass: cs?.mode === 'channel' && spec && count > 0 && cue !== false
      ? { count, cap: spec.cap, ...feedingMaterial(cue, 'ritual') } : undefined };
}
export function cloneFeedingCues(row: FeedingCueState): FeedingCueState {
  return { gains: row.gains.map(g => ({ ...g })), mass: row.mass ? { ...row.mass } : undefined,
    flows: row.flows?.map(f => ({ ...f, from: { ...f.from }, to: { ...f.to } })),
    meal: row.meal ? { ...row.meal, from: { ...row.meal.from } } : undefined };
}
