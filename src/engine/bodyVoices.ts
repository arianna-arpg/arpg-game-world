// ---------------------------------------------------------------------------
// THE BODY'S VOICES — M-HIT/DEATH (docs/design/show-dont-tell.md §4, THE
// VARIETY MAP): the generic pale ring served a death, a landed arrow, a bolt
// stopped by a wall alike. Now each speaks by its nature through THE EFFECT
// VOICE — ONE pure leaf that names the voice, reusing the break / status /
// world voices already registered (one vocabulary, every fabric):
//   THE DEATH VOICE  — by the body's MATERIAL_NATURE: flesh spatters, bone and
//                      chitin fleck, slime pops wet, verdant/wood/stone/metal
//                      dust, crystal/ice sparkle, ember flares, the ethereal wisp.
//   THE HIT VOICE    — by the blow's dominant DAMAGE TYPE at the impact: fire
//                      flares, cold crackles rime, lightning sparks, chaos
//                      spatters, physical flecks a body and dusts a wall.
//   THE HIT TINT     — the body's own hit flash takes the blow's type tint.
// All numbers and maps are DIALS (unblessed — her walk); pure, no canvas.
// ---------------------------------------------------------------------------

import type { DamageType } from './stats';

export const BODY_VOICE_CFG = {
  /** THE DEATH VOICE by MATERIAL_NATURE id (data/monsters.ts); unknown → `fallback`. */
  death: {
    flesh: 'spatter', fur: 'spatter', scale: 'spatter',
    chitin: 'flecks', bone: 'flecks',
    slime: 'wetpop',
    verdant: 'dust', cloth: 'dust', wood: 'dust', stone: 'dust', metal: 'dust',
    crystal: 'sparkle', ice: 'sparkle',
    ember: 'flare',
    ethereal: 'wisp', void: 'wisp', cosmic: 'wisp',
  } as Record<string, string>,
  deathFallback: 'dust',
  /** THE HIT VOICE by damage type — the physical blow splits by SURFACE. */
  hit: { fire: 'flare', cold: 'rime', lightning: 'spark', chaos: 'spatter' } as Partial<Record<DamageType, string>>,
  hitPhysical: { body: 'flecks', wall: 'dust' },
  hitFallback: 'dust',
  /** THE HIT TINT — the body flash's color by the blow's type (white = the classic). */
  tint: { physical: '#ffffff', fire: '#ffb070', cold: '#a8e0ff', lightning: '#fff0a0', chaos: '#b8f0a0' } as Record<DamageType, string>,
} as const;

/** THE DEATH VOICE — pure: the voice a dying body of this material speaks. */
export function deathVoiceOf(material: string | undefined): string {
  return (material && BODY_VOICE_CFG.death[material]) || BODY_VOICE_CFG.deathFallback;
}

/** THE HIT VOICE — pure: the accent at an impact of this type on this surface. */
export function hitVoiceOf(type: DamageType | undefined, surface: 'body' | 'wall'): string {
  if (type === 'physical') return BODY_VOICE_CFG.hitPhysical[surface];
  return (type && BODY_VOICE_CFG.hit[type]) || BODY_VOICE_CFG.hitFallback;
}

/** THE HIT TINT — pure: the body flash's tint for a blow of this type. */
export function hitTintOf(type: DamageType | undefined): string {
  return (type && BODY_VOICE_CFG.tint[type]) || BODY_VOICE_CFG.tint.physical;
}

/** The dominant type of a typed packet (the largest amount); undefined for
 *  an empty one. Pure — the one read the landing stamps the body with. */
export function dominantTypeOf(amounts: Partial<Record<DamageType, number>> | undefined): DamageType | undefined {
  if (!amounts) return undefined;
  let best: DamageType | undefined, bestV = 0;
  for (const [k, v] of Object.entries(amounts) as [DamageType, number][]) {
    if (v !== undefined && v > bestV) { bestV = v; best = k; }
  }
  return best;
}

/** THE SHAFT'S TYPE — a skill's heaviest base-damage lane: the STATIC read
 *  for impacts with no victim to ask (wall stops). Where a body was struck
 *  the rolled truth wins (Actor.hitFlashType, stamped by applyHit). */
export function skillBaseTypeOf(baseDamage: Partial<Record<DamageType, [number, number]>> | undefined): DamageType | undefined {
  if (!baseDamage) return undefined;
  let best: DamageType | undefined; let bestMid = -1;
  for (const [t, r] of Object.entries(baseDamage) as [DamageType, [number, number]][]) {
    const mid = (r[0] + r[1]) / 2;
    if (mid > bestMid) { bestMid = mid; best = t; }
  }
  return best;
}
