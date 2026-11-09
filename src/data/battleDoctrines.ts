import { mod, STAT_DEFS } from '../engine/stats';
import type { SkillDef } from '../engine/skills';
import type { BattleDoctrineDef, MinionTransmutationDef } from '../engine/battleDoctrineSpec';

export const BATTLE_DOCTRINES: BattleDoctrineDef[] = [
  { id: 'breach', name: 'Breakers Call', stat: 'doctrine_breach', skill: 'doctrine_breach_call', color: '#e79d59', radius: 330, duration: 5,
    meter: { max: 4, minimum: 1, interval: .35, events: ['kill', 'poiseBreak'], window: 3, powerPerCharge: .35, emptyReason: 'Build Breach with nearby kills or melee poise breaks.' },
    forms: [
      { stat: 'doctrineForm_breach_rupture', label: 'Rupture', payload: 'doctrine_rupture' },
      { stat: 'doctrineForm_breach_bulwark', label: 'Bulwark', scaleDuration: true, mods: [mod('damageTaken', 'more', -.25), mod('poiseDamage', 'more', .4)] },
      { stat: 'doctrineForm_breach_advance', label: 'Advance', payload: 'doctrine_advance' },
    ], traits: [
      { stat: 'doctrineTrait_breach_rally', mods: [mod('attackSpeed', 'increased', .3), mod('moveSpeed', 'increased', .25)] },
      { stat: 'doctrineTrait_breach_mend', healPct: .05 },
      { stat: 'doctrineTrait_breach_aftershock', repeat: { delay: .65, power: .55 } },
      { stat: 'doctrineTrait_breach_relentless', refund: 1 },
    ] },
  { id: 'pack', name: 'Pack Signal', stat: 'doctrine_pack', skill: 'doctrine_pack_signal', color: '#b5d187', radius: 600, duration: 6, subjects: 'companions', spacing: 48,
    meter: { max: 3, minimum: 0, interval: .4, events: ['cooperate'], window: 3, powerPerCharge: .15 },
    forms: [
      { stat: 'doctrineForm_pack_pursuit', label: 'Pursuit', formation: 'wedge', order: 'assault', mods: [mod('moveSpeed', 'increased', .4)] },
      { stat: 'doctrineForm_pack_guard', label: 'Guard', formation: 'ring', order: 'guard', mods: [mod('damageTaken', 'more', -.2)] },
      { stat: 'doctrineForm_pack_flank', label: 'Flank', formation: 'scatter', order: 'assault', mods: [mod('apply_vulnerable', 'flat', .5)] },
    ], traits: [
      { stat: 'doctrineTrait_pack_answer', answer: true },
      { stat: 'doctrineTrait_pack_mend', healPct: .12 },
      { stat: 'doctrineTrait_pack_shelter', shelter: { radius: 120, mods: [mod('damageTaken', 'more', -.12)] } },
      { stat: 'doctrineTrait_pack_relay', refund: 1 },
      { stat: 'doctrineTrait_pack_keeper', includeOwner: true },
    ] },
  { id: 'swarm', name: 'Living Formation', stat: 'doctrine_swarm', skill: 'doctrine_swarm_order', color: '#b7d45f', radius: 650, duration: 5, subjects: 'minions', spacing: 36,
    meter: { max: 5, minimum: 0, interval: .3, events: ['cooperate'], window: 2, powerPerCharge: .12 },
    forms: [
      { stat: 'doctrineForm_swarm_needle', label: 'Needle', formation: 'wedge', order: 'assault', mods: [mod('attackSpeed', 'increased', .3)] },
      { stat: 'doctrineForm_swarm_shell', label: 'Shell', formation: 'ring', order: 'guard', mods: [mod('damageTaken', 'more', -.25)] },
      { stat: 'doctrineForm_swarm_cloud', label: 'Cloud', formation: 'scatter', order: 'assault', mods: [mod('apply_harried', 'flat', .6)] },
    ], traits: [
      { stat: 'doctrineTrait_swarm_molt', spendPly: true, healPct: .25, mods: [mod('attackSpeed', 'more', .35)] },
      { stat: 'doctrineTrait_swarm_venom', mods: [mod('apply_poison', 'flat', .6)] },
      { stat: 'doctrineTrait_swarm_answer', answer: true },
      { stat: 'doctrineTrait_swarm_relay', refund: .6 },
    ] },
  { id: 'quarry', name: 'Faultcall', stat: 'doctrine_quarry', skill: 'doctrine_faultcall', color: '#c2aa83', radius: 420, duration: 6,
    growth: { kind: 'stone_cairns', maturity: 2, maximum: 3 },
    forms: [
      { stat: 'doctrineForm_quarry_avalanche', label: 'Avalanche', payload: 'doctrine_stoneburst' },
      { stat: 'doctrineForm_quarry_circle', label: 'Stone Circle', relocate: true, formation: 'ring' },
    ], traits: [
      { stat: 'doctrineTrait_quarry_shelter', shelter: { radius: 100, mods: [mod('damageTaken', 'more', -.15), mod('poiseDamage', 'more', .25)] } },
      { stat: 'doctrineTrait_quarry_mend', healPct: .04 },
      { stat: 'doctrineTrait_quarry_echo', repeat: { delay: .5, power: .5 } },
      { stat: 'doctrineTrait_quarry_bastion', mods: [mod('armor', 'more', .5), mod('knockback', 'flat', 60)] },
    ] },
  { id: 'grove', name: 'Gather the Green', stat: 'doctrine_grove', skill: 'doctrine_grove_call', color: '#76d39c', radius: 420, duration: 6,
    growth: { kind: 'sapling_ring', maturity: 2, maximum: 4 },
    forms: [
      { stat: 'doctrineForm_grove_seedstorm', label: 'Seedstorm', payload: 'doctrine_rootburst' },
      { stat: 'doctrineForm_grove_renewal', label: 'Renewal', healPct: .06 },
      { stat: 'doctrineForm_grove_walk', label: 'Walking Grove', relocate: true, formation: 'ring' },
    ], traits: [
      { stat: 'doctrineTrait_grove_shelter', shelter: { radius: 110, mods: [mod('lifeRegenPct', 'flat', .025), mod('damageTaken', 'more', -.1)] } },
      { stat: 'doctrineTrait_grove_thorns', mods: [mod('thorns', 'flat', 30), mod('apply_rooted', 'flat', .35)] },
      { stat: 'doctrineTrait_grove_echo', repeat: { delay: .6, power: .5 } },
    ] },
];

export const MINION_TRANSMUTATIONS: MinionTransmutationDef[] = [{
  id: 'sylvan', stat: 'transmute_sylvan', family: 'skeleton', faction: 'sylvan', namePrefix: 'Sylvan', color: '#83bf74', material: 'wood',
  looks: { melee: 'sylvan_boneblade', ranged: 'sylvan_boughbow', caster: 'sylvan_rootseer' },
  personalStats: ['damage', 'life', 'armor', 'evasion', 'energyShield', 'attackSpeed', 'castSpeed', 'moveSpeed', 'accuracy', 'critChance', 'critMulti',
    'lifeRegen', 'lifeRegenPct', 'thorns', 'statusMagnitude', 'effectDuration', 'aoeRadius', 'projectileSpeed',
    'addedPhysical', 'addedFire', 'addedCold', 'addedLightning', 'addedChaos', 'fireRes', 'coldRes', 'lightningRes', 'chaosRes',
    'armorPen', 'firePen', 'coldPen', 'lightningPen', 'chaosPen', 'damageTaken', 'statusChance', 'ailmentStacks'],
  personalPrefixes: ['apply_', 'damageVs_', 'convert_'],
}];

const action = (d: BattleDoctrineDef): SkillDef => ({ id: d.skill, name: d.name, noDrop: true, doctrine: d.id,
  description: d.growth ? `Use your mature owned growths within ${d.radius} units. Your chosen form determines harvest or relocation.`
    : d.subjects ? `Direct your ${d.subjects} into your chosen formation for ${d.duration} seconds. Cooperative hits build the next order.`
    : 'Spend Breach earned by nearby kills and melee poise breaks. Your chosen form determines the release.',
  tags: ['warcry', 'buff', 'aoe'], color: d.color, manaCost: 8, cooldown: d.subjects ? 8 : 6, useTime: .25,
  delivery: { type: 'self' }, effects: [],
});
export const DOCTRINE_SKILLS: Record<string, SkillDef> = Object.fromEntries(BATTLE_DOCTRINES.map(d => [d.skill, action(d)]));
const payload = (id: string, name: string, color: string): SkillDef => ({ id, name, noDrop: true, description: 'An attributed release from a battle doctrine.',
  tags: ['spell', 'physical', 'aoe'], color, manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { physical: [18, 26] },
  delivery: { type: 'ground', radius: 95, castRange: 700, delay: .15 }, effects: [{ type: 'damage' }],
  leveling: { perLevel: [mod('damage', 'increased', .12)] },
});
DOCTRINE_SKILLS.doctrine_stoneburst = payload('doctrine_stoneburst', 'Cairn Collapse', '#c2aa83');
DOCTRINE_SKILLS.doctrine_rootburst = { ...payload('doctrine_rootburst', 'Seedstorm', '#76d39c'), effects: [{ type: 'damage' }, { type: 'status', status: 'rooted', chance: 1, durationOverride: 1.5 }] };
DOCTRINE_SKILLS.doctrine_rupture = { ...payload('doctrine_rupture', 'Breach Wave', '#e79d59'), tags: ['attack', 'melee', 'physical', 'aoe'], delivery: { type: 'cone', range: 240, arcDeg: 90 }, effects: [{ type: 'damage' }, { type: 'status', status: 'sundered', chance: 1 }] };
DOCTRINE_SKILLS.doctrine_advance = { ...DOCTRINE_SKILLS.doctrine_rupture, id: 'doctrine_advance', name: 'Iron Advance', tags: ['attack', 'melee', 'physical', 'movement'], delivery: { type: 'dash', distance: 220, speed: 650, width: 50 } };

for (const d of BATTLE_DOCTRINES) {
  for (const stat of [d.stat, ...d.forms.flatMap(f => f.stat ? [f.stat] : []), ...(d.traits ?? []).map(t => t.stat)]) STAT_DEFS[stat] = { label: d.name, base: 0, min: 0 };
  STAT_DEFS['skillgrant_' + d.skill] = { label: d.name, base: 0, min: 0 };
}
for (const d of MINION_TRANSMUTATIONS) STAT_DEFS[d.stat] = { label: d.namePrefix + ' Rebirth', base: 0, min: 0 };
