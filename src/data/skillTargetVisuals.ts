import type { BurstMotif } from './skillVisuals';

export type TargetSeal = 'fangs' | 'brand' | 'palms' | 'chalice' | 'sprout' | 'crown'
  | 'knot' | 'wound' | 'cage' | 'star' | 'eye' | 'hourglass' | 'stitch' | 'wave'
  | 'spiral' | 'web' | 'horn' | 'bones' | 'maw';
export interface SkillTargetProfile {
  seal: TargetSeal; motif: BurstMotif;
  motion: 'close' | 'open' | 'rise' | 'orbit' | 'reverse';
  count: number; echo?: BurstMotif;
}
const p = (seal: TargetSeal, motif: BurstMotif, motion: SkillTargetProfile['motion'], count: number, echo?: BurstMotif): SkillTargetProfile => ({ seal, motif, motion, count, echo });
/** The center mark names the cast; its surrounding motion names the material.
 * These are arrival signatures, not promises of a successful status or heal. */
export const SKILL_TARGETS: Readonly<Record<string, SkillTargetProfile>> = {
  beast_dread_pulse: p('fangs', 'souls', 'close', 5),
  skeletal_ignite: p('bones', 'flame', 'rise', 4),
  pact_mend: p('knot', 'petals', 'close', 3),
  nectar_mend: p('chalice', 'petals', 'rise', 5),
  solar_brand: p('brand', 'rays', 'orbit', 8, 'flame'),
  renew: p('sprout', 'petals', 'rise', 3),
  judgement: p('crown', 'rays', 'close', 3, 'blades'),
  lay_on_hands: p('palms', 'rays', 'close', 2),
  blessing_of_might: p('crown', 'blades', 'rise', 3),
  guardian_bond: p('knot', 'shields', 'orbit', 2),
  expunge: p('cage', 'spores', 'open', 7, 'steam'),
  eviscerate: p('wound', 'blades', 'open', 3, 'blood'),
  tame_beast: p('knot', 'teeth', 'close', 4),
  static_shock: p('star', 'sparks', 'close', 4),
  flash_freeze: p('star', 'ice', 'close', 6, 'cracks'),
  expose_weakness: p('eye', 'blades', 'open', 4),
  word_of_doom: p('hourglass', 'runes', 'close', 6),
  mend: p('stitch', 'petals', 'close', 3),
  greater_mending: p('palms', 'shields', 'rise', 6, 'rays'),
  healing_stream: p('wave', 'steam', 'rise', 4),
  cleansing_light: p('star', 'rays', 'open', 3, 'shields'),
  mending_pulse: p('wave', 'chimes', 'open', 3),
  soothing_touch: p('palms', 'petals', 'close', 5),
  transfixing_gaze: p('eye', 'runes', 'close', 5),
  turnwise_hex: p('spiral', 'arcs', 'reverse', 4),
  combustion_strike: p('wound', 'flame', 'open', 8, 'cracks'),
  ignite: p('brand', 'flame', 'rise', 3),
  living_bomb: p('cage', 'flame', 'close', 6, 'sparks'),
  prey_musk: p('fangs', 'spores', 'orbit', 3),
  siphon_blood: p('wound', 'blood', 'open', 4),
  sanguine_leech: p('fangs', 'blood', 'close', 3, 'souls'),
  transfusion: p('wave', 'spores', 'open', 5, 'blood'),
  anathema: p('cage', 'runes', 'open', 5, 'souls'),
  fulgurweb: p('web', 'sparks', 'orbit', 6),
  doombrand: p('hourglass', 'flame', 'orbit', 4),
  single_out: p('horn', 'chimes', 'open', 3),
  bone_offering: p('bones', 'shields', 'rise', 6),
  boil_over: p('chalice', 'steam', 'open', 7, 'flame'),
};

/** The offering follow-through: consumed fuel, caster payment and recipients.
 * Existing flight/field/nova art remains responsible for those hit surfaces. */
export const SKILL_RITES: Readonly<Record<string, SkillTargetProfile>> = {
  bone_offering: SKILL_TARGETS.bone_offering,
  oblation_of_flesh: p('chalice', 'blood', 'rise', 7, 'souls'),
  oblation_of_life: p('crown', 'blood', 'open', 5),
  oblation_of_mana: p('star', 'runes', 'close', 5),
  corpse_feast: p('fangs', 'blood', 'close', 6),
  gorge_carrion: p('maw', 'spores', 'close', 7),
  sacrifice: p('hourglass', 'souls', 'rise', 3, 'teeth'),
};
export function skillTargetProfile(id: string): SkillTargetProfile | undefined {
  return Object.hasOwn(SKILL_TARGETS, id) ? SKILL_TARGETS[id] : undefined;
}
export function skillRiteProfile(id: string): SkillTargetProfile | undefined {
  return Object.hasOwn(SKILL_RITES, id) ? SKILL_RITES[id] : undefined;
}
export function skillTargetVoice(id: string): string | undefined { return skillTargetProfile(id) ? 'skillTarget:' + id : undefined; }
export function skillRiteVoice(id: string): string | undefined { return skillRiteProfile(id) ? 'skillRite:' + id : undefined; }

export interface SkillTetherProfile {
  strand: 'barbs' | 'ladder' | 'flames' | 'braid' | 'chain' | 'lightning' | 'pulse';
  anchor: TargetSeal; motif: BurstMotif; beats: number; direction: 1 | -1;
}
const t = (strand: SkillTetherProfile['strand'], anchor: TargetSeal, motif: BurstMotif, beats: number, direction: 1 | -1 = 1): SkillTetherProfile => ({ strand, anchor, motif, beats, direction });
export const SKILL_TETHERS: Readonly<Record<string, SkillTetherProfile>> = {
  tripwire: t('barbs', 'wound', 'blades', 6),
  tripwire_web: t('ladder', 'web', 'teeth', 7),
  transient_inferno: t('flames', 'brand', 'flame', 5),
  lifeline: t('braid', 'palms', 'petals', 4),
  witchfire_leash: t('chain', 'cage', 'souls', 6, -1),
  charged_span: t('lightning', 'star', 'sparks', 8),
  healing_chain: t('pulse', 'stitch', 'chimes', 3),
  static_strike: t('lightning', 'star', 'sparks', 4),
  tempest_gathering: t('braid', 'spiral', 'sparks', 7),
  embed: t('ladder', 'crown', 'blades', 5),
  pack: t('chain', 'fangs', 'sparks', 5),
  fallback: t('barbs', 'knot', 'runes', 4),
};
export const TARGET_VISUAL_STYLE = { life: 0.4, maxMarks: 8, ink: 0.92, outline: '#171923', tetherSegments: 48, tetherMarks: 12 };
export function skillTetherProfile(id?: string): SkillTetherProfile {
  return id && Object.hasOwn(SKILL_TETHERS, id) ? SKILL_TETHERS[id] : SKILL_TETHERS.fallback;
}
