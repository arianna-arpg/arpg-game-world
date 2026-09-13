import type { SkillTreeSpec, TreeBuffPatch, GroundDelivery } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });
const domain = (node: Node, value: NonNullable<GroundDelivery['domain']>): Node => ({ ...node, over: { ...node.over, ground: { ...node.over?.ground, domain: value } } });

export const RUNEWEAVER_STARTER_TREES: Record<string, SkillTreeSpec> = {
  invocation: tree([
    n('prismatic_script', 'Prismatic Script', 'Schoolless spells cycle Ember → Rime → Arc, advancing from the most recent rune in that alphabet. An empty weave starts with Ember. Each spent rune adds 15% to the release multiplier.', undefined, { invocation: { untypedRunes: ['ember', 'rime', 'arc'], damagePerRune: 0.15 } }),
    [n('wide_script', 'Broad Strokes', '30% increased working radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('lasting_script', 'Fluent Words', '30% increased Invocation cast speed.', [mod('castSpeed', 'increased', 0.3)]),
      n('vivid_script', 'Vivid Words', 'Landed workings gain 30% chance to stun.', [mod('apply_stun', 'flat', 0.3)])],
    [n('long_script', 'Long Sentence', 'Hold two additional runes, up to the global capacity limit of ten.', [mod('runeCap', 'flat', 2)]),
      n('cruel_script', 'Sharp Inflection', 'Gain 8% working critical chance.', [mod('critChance', 'flat', 0.08)]),
      n('cheap_script', 'Economical Words', '30% reduced Invocation mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], [
    n('patient_script', 'Patient Script', 'Schoolless spells keep banking Glyphs. Every spent rune adds 30% to the release multiplier; the working deals 15% less damage. Save a longer sentence for the larger payoff.', [mod('damage', 'more', -0.15)], { invocation: { untypedRunes: ['glyph'], damagePerRune: 0.3 } }),
    [n('deep_script', 'Deep Script', 'Landed workings lodge 25% of their physical hit damage as impale.', [mod('impalePower', 'flat', 0.25)]),
      n('open_script', 'Break the Seal', 'Ignore 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
      n('stunning_script', 'Forceful Punctuation', 'Gain 30% chance to stun.', [mod('apply_stun', 'flat', 0.3)])],
    [n('banked_script', 'Room for a Thesis', 'Hold two additional runes, up to the global capacity limit of ten.', [mod('runeCap', 'flat', 2)]),
      n('ready_script', 'Ready Conclusion', '40% increased Invocation cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('hungry_script', 'Words Returned', 'Leech 6% of working hit damage as life.', [mod('lifeLeech', 'flat', 0.06)])],
  ], n('invocation_practice', 'Practiced Invocation', '15% increased working damage.', [mod('damage', 'increased', 0.15)])),

  rune_of_power: tree([
    domain(n('sheltering_rune', 'Sheltering Rune', 'Allies in the standing circle also take 12% less damage. Retain its native spell damage and cast speed bonuses.'), { allyMods: [mod('damageTaken', 'more', -0.12)] }),
    [n('wide_rune', 'Room in the Circle', '35% increased circle radius.', [mod('aoeRadius', 'increased', 0.35)]),
      domain(n('mending_rune', 'Mending Script', 'Allies in the circle also regenerate 1% of maximum life per second.'), { allyMods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      domain(n('steady_rune', 'Steady Script', 'Allies in the circle also gain 20% ailment resistance.'), { allyMods: [mod('ailmentResist', 'flat', 0.2)] })],
    [n('lasting_rune', 'Enduring Circle', '40% increased circle duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_rune', 'Spare Ink', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      domain(n('restoring_rune', 'Ink Well', 'Allies in the circle also regenerate 2 additional mana per second.'), { allyMods: [mod('manaRegen', 'flat', 2)] })],
  ], [
    n('wandering_rune', 'Wandering Rune', 'After placement the circle follows you, carrying its spell damage and cast speed bonuses. Its duration is 30% shorter.', [mod('effectDuration', 'more', -0.3)], { ground: { follow: true } }),
    [n('broad_wander', 'Broad Manuscript', '30% increased circle radius.', [mod('aoeRadius', 'increased', 0.3)]),
      domain(n('swift_wander', 'Flowing Ink', 'Allies in the circle also gain 15% increased movement speed.'), { allyMods: [mod('moveSpeed', 'increased', 0.15)] }),
      domain(n('snaring_wander', 'Tangling Ink', 'Enemies in the circle move 20% slower.'), { enemyMods: [mod('moveSpeed', 'increased', -0.2)] })],
    [n('ready_wander', 'Write Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('lasting_wander', 'Long Journey', '40% increased circle duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('cheap_wander', 'Light Manuscript', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)])],
  ], n('rune_practice', 'Practiced Circle', '12% increased circle duration.', [mod('effectDuration', 'increased', 0.12)])),

  warp: tree([
    buff(n('prepared_warp', 'Prepared Crossing', 'Starting Warp prepares your next landed spell hit for 4 base seconds: it deals 30% more damage. Keep the native delayed displacement.', undefined, { tags: { add: ['buff'] } }), 'prepared_warp', { duration: 4, consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', 0.3, ['spell'])] }),
    [buff(n('sharp_crossing', 'Sharp Crossing', 'The preparation also grants 8% spell critical chance.'), 'prepared_warp', { mods: [mod('critChance', 'flat', 0.08, ['spell'])] }),
      buff(n('hungry_crossing', 'Returning Ink', 'The preparation also leeches 8% of spell hit damage as life.'), 'prepared_warp', { mods: [mod('lifeLeech', 'flat', 0.08, ['spell'])] }),
      n('lasting_crossing', 'Hold the Thought', '50% increased preparation duration.', [mod('effectDuration', 'increased', 0.5)])],
    [n('ready_crossing', 'Cross Again', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_crossing', 'Short Notation', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('warded_crossing', 'Ward the Crossing', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    buff(n('sheltered_warp', 'Sheltered Crossing', 'Starting Warp grants 20% less damage taken and 20% ailment resistance for 3 base seconds, protecting the delay as well as arrival.', undefined, { tags: { add: ['buff'] } }), 'sheltered_warp', { duration: 3, mods: [mod('damageTaken', 'more', -0.2), mod('ailmentResist', 'flat', 0.2)] }),
    [n('lasting_shelter', 'Long Shelter', '40% increased blessing duration.', [mod('effectDuration', 'increased', 0.4)]),
      buff(n('mending_shelter', 'Mending Crossing', 'The blessing also regenerates 1% of maximum life per second.'), 'sheltered_warp', { mods: [mod('lifeRegenPct', 'flat', 0.01)] }),
      buff(n('swift_shelter', 'Leave the Margin', 'The blessing also grants 20% increased movement speed.'), 'sheltered_warp', { mods: [mod('moveSpeed', 'increased', 0.2)] })],
    [n('ready_shelter', 'Another Refuge', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('cheap_shelter', 'Light Fold', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      buff(n('iron_shelter', 'Iron Margin', 'The blessing also grants 50% increased armor.'), 'sheltered_warp', { mods: [mod('armor', 'increased', 0.5)] })],
  ], n('warp_practice', 'Practiced Fold', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),
};
