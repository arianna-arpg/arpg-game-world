import type { SkillDef } from '../engine/skills';
import type { BurstMotif } from './skillVisuals';
import { skillBeamVoice } from './skillFlightVisuals';
import { MINION_FAMILIES } from './minionFamilies';

/** Shared preparation vocabulary, independent of tint and finished spell art.
 * New spells need no visual entry. Keep this list small: it is also the seam for
 * future Wardrobe styles, not one selectable cosmetic per skill. */
export const CAST_STYLES = {
  arcane: { label: 'Arcane', motif: 'runes', motion: 'Open sigils fold inward; power gathers between the hands.' },
  fire: { label: 'Fire', motif: 'flame', motion: 'Flame tongues curl over the shoulders and flow into the hands.' },
  cold: { label: 'Cold', motif: 'ice', motion: 'Rigid crystal splinters draw inward along angular seams.' },
  lightning: { label: 'Lightning', motif: 'arcs', motion: 'Branching currents flicker through the torso into the hands.' },
  chaos: { label: 'Chaos', motif: 'souls', motion: 'Counter-winding strands braid through the body.' },
  physical: { label: 'Physical spell', motif: 'cracks', motion: 'Heavy chevrons compress into the caster’s core.' },
  life: { label: 'Life', motif: 'rays', motion: 'Soft fans breathe inward and collect at the palms.' },
  blood: { label: 'Blood', motif: 'blood', motion: 'Paired liquid threads pulse toward the hands.' },
  summon: { label: 'Summon · general', motif: 'runes', motion: 'Open cradles close around a growing conjuration.' },
  'summon-undead': { label: 'Summon · undead', motif: 'teeth', motion: 'Ribs cradle the torso; bone fragments gather.' },
  'summon-nature': { label: 'Summon · nature', motif: 'petals', motion: 'Branching shoots unfurl inward; small leaves gather.' },
  'summon-elemental': { label: 'Summon · elemental', motif: 'sparks', motion: 'Broken spirals condense into two elemental cores.' },
  'summon-golem': { label: 'Summon · golem', motif: 'cracks', motion: 'Weighty facets assemble around the shoulders.' },
  construct: { label: 'Construct', motif: 'shields', motion: 'Separate joints assemble into a precise frame.' },
} as const satisfies Record<string, { label: string; motif: BurstMotif; motion: string }>;
export type CastStyle = keyof typeof CAST_STYLES;
export type CastFamily = 'summon' | 'construct' | 'storm' | 'bolt' | 'beam' | 'field' | 'target' | 'strike' | 'travel' | 'self';
export interface CastProfile {
  family: CastFamily; skillId: string; style: CastStyle; motif: BurstMotif;
  source: 'override' | 'summon' | 'school' | 'fallback';
  gathering?: 'fork' | 'links';
  /** A deliberate nonspell exception retains its established preparation. */
  legacyMantle?: true;
}
interface CastOverride { style: CastStyle; gathering?: 'fork' | 'links'; allowNonSpell?: true; legacyMantle?: true; }
/** Author only meaningful exceptions here; omission always has a fallback.
 * false disables decorative preparation without hiding native held readiness.
 * Quickstep intentionally keeps its existing art at the player's request. */
export const CAST_OVERRIDES: Readonly<Record<string, CastOverride | false>> = {
  quickstep: { style: 'physical', allowNonSpell: true, legacyMantle: true },
  chain_lightning: { style: 'lightning', gathering: 'links' },
  bone_offering: { style: 'summon-undead' },
  the_amalgam: { style: 'summon-undead' },
  siphon_blood: { style: 'blood' },
  vampiric_embrace: { style: 'blood' },
  blood_mortgage: { style: 'blood' },
};

// Visual-only taxonomy. Never changes minion gameplay families or samples a pool.
// Shared gameplay family lists are reused where they already exist. An unknown
// creature or mixed pool keeps the generic summon cradle until deliberately authored.
const SUMMON_BODIES: Readonly<Record<string, CastStyle>> = Object.fromEntries([
  ...MINION_FAMILIES.golem.map(id => [id, 'summon-golem']),
  ...MINION_FAMILIES.skeleton.map(id => [id, 'summon-undead']),
  ...MINION_FAMILIES.swarm.map(id => [id, 'summon-nature']),
  ...['zombie', 'skeletal_cleric', 'grave_shambler', 'blade_wraith', 'decay_wraith',
    'feeding_thrall', 'vampire_thrall', 'harvester', 'lesser_reaper'].map(id => [id, 'summon-undead']),
  ...['rootwild_burrling', 'fungal_sporeling', 'hunting_falcon', 'crimson_bat', 'spiderling',
    'chitin_drone', 'chitin_lancer', 'giant_maggot', 'mushroomling', 'fungal_puffball',
    'rockgrub', 'cave_bat', 'formic_worker', 'formic_soldier', 'carrion_crow', 'warren_rat',
    'fester_rat', 'broodling', 'scald_spawn'].map(id => [id, 'summon-nature']),
  ...['flame_sprite', 'heat_double', 'spirit_wisp', 'mender_sprite', 'raging_spirit',
    'flame_core', 'resonant_shardling', 'prism_creeper', 'lumen_wisp', 'cirrus_fingerling',
    'rubblekin', 'scree_skitter'].map(id => [id, 'summon-elemental']),
]);
function summonStyle(def: SkillDef): CastStyle {
  const d = def.delivery;
  if (d.type !== 'summon') return 'summon';
  if (d.fromCorpse) return 'summon-undead';
  const ids = d.monsterId ? [d.monsterId] : d.pool?.map(p => p.id) ?? d.selectPool ?? [];
  const styles = ids.map(id => Object.hasOwn(SUMMON_BODIES, id) ? SUMMON_BODIES[id] : 'summon');
  return styles.length && styles.every(s => s === styles[0]) ? styles[0] : 'summon';
}
const SCHOOLS = ['fire', 'cold', 'lightning', 'chaos', 'physical'] as const;
/** Semantic tags first, then native authored damage for untagged spells. Mixed
 * schools intentionally share arcane until given an override; order never wins. */
function spellSchool(def: SkillDef): CastStyle | undefined {
  let schools = SCHOOLS.filter(s => def.tags.includes(s));
  if (!schools.length) schools = SCHOOLS.filter(s => def.baseDamage?.[s]?.some(v => v > 0));
  if (schools.length) return schools.length === 1 ? schools[0] : 'arcane';
  if (def.tags.includes('heal')) return 'life';
}
/** The same eligibility rule also suppresses the old ordinary self-cast glyph.
 * Functional charge/channel/guard readiness is separate and remains available. */
export function hasDecorativeCast(def: SkillDef): boolean {
  if (def.castingCue === false) return false;
  const own = Object.hasOwn(CAST_OVERRIDES, def.id) ? CAST_OVERRIDES[def.id] : undefined;
  if (own === false) return false;
  // Remote render-only cast stubs carry neither tags nor a full delivery.
  return !!own?.allowNonSpell || (!!def.tags?.includes('spell') && !def.tags.includes('attack'));
}
export function skillCastProfile(def: SkillDef): CastProfile | undefined {
  if (!def.delivery || !hasDecorativeCast(def)) return;
  const id = def.id, type = def.delivery.type;
  const own = Object.hasOwn(CAST_OVERRIDES, id) ? CAST_OVERRIDES[id] : undefined;
  const summoning = !!def.amalgam || type === 'summon';
  const school = spellSchool(def);
  const style: CastStyle = own ? own.style : summoning ? summonStyle(def)
    : school ?? (type === 'construct' ? 'construct' : 'arcane');
  const family: CastFamily = own && own.legacyMantle ? 'self' : summoning ? 'summon' : type === 'construct' ? 'construct'
    : type === 'storm' ? 'storm' : skillBeamVoice(id) ? 'beam' : type === 'projectile' ? 'bolt'
    : type === 'melee' || type === 'cone' ? 'strike' : def.tags.includes('movement') ? 'travel'
    : type === 'target' ? 'target' : type === 'ground' || type === 'nova' || type === 'aura' ? 'field' : 'self';
  return { family, skillId: id, style, motif: own && own.legacyMantle ? 'arcs' : CAST_STYLES[style].motif,
    source: own ? 'override' : summoning ? 'summon' : school ? 'school' : 'fallback',
    gathering: own ? own.gathering ?? (style === 'lightning' ? 'fork' : undefined) : style === 'lightning' ? 'fork' : undefined,
    ...(own && own.legacyMantle ? { legacyMantle: true } : {}) };
}
export const CAST_PREPARATION_STYLE = { width: 1.15, alpha: .85, outline: '#111a23', highlight: '#f1eee2', coreAlpha: .32 };
