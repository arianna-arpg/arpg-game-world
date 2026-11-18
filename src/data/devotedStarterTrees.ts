import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Complete Berserker, Sorcerer and Cleric opening bars. Identity replacements
 * live on rival trunks; everything below them composes as independent gains. */
export const DEVOTED_STARTER_TREES: Record<string, SkillTreeSpec> = {
  heavy_strike: tree([
    n('buried_maul', 'Buried Maul', 'Impales enemies for 35% of physical hit damage. Deals 30% more damage, but has 20% less attack speed.', [mod('impalePower', 'flat', 0.35), mod('damage', 'more', 0.3), mod('attackSpeed', 'more', -0.2)]),
    [n('broken_plate', 'Broken Plate', 'Ignores 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('mauls_debt', 'Maul\'s Debt', 'Impales for an additional 20% of physical hit damage.', [mod('impalePower', 'flat', 0.2)]),
      n('cracked_crown', 'Cracked Crown', 'Deals 40% more damage against stunned enemies.', [mod('damage', 'more', 0.4, ['vs:stun'])])],
    [n('patient_executioner', 'Patient Executioner', '35% increased cooldown recovery and 30% increased accuracy.', [mod('cooldownRecovery', 'increased', 0.35), mod('accuracy', 'increased', 0.3)]),
      n('last_sentence', 'Last Sentence', 'Culls enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('blood_price', 'Blood Price', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('fault_wave', 'Fault Wave', 'Unleashes a traveling shockwave that hits each enemy in its path once, retaining stun and knockback. Deals 20% less damage and costs 35% more mana.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2), mod('manaCost', 'more', 0.35)], { tags: { add: ['aoe', 'duration', 'sweep'] } }),
    [n('running_fault', 'Running Fault', '40% increased wave travel distance.', [mod('sweepRange', 'increased', 0.4)]),
      n('wide_fault', 'Wide Fault', '50% increased arc width and 20% increased area radius.', [mod('swingArc', 'increased', 0.5), mod('aoeRadius', 'increased', 0.2)]),
      n('fault_aftershock', 'Fault Aftershock', 'Repeats the wave once after 0.22 seconds at no extra cost, but deals 20% less damage per hit.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.2)])],
    [n('crumbling_front', 'Crumbling Front', 'Hits have +25% chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('ragged_front', 'Ragged Front', 'Hits have a 50% chance to inflict bleed.', [mod('apply_bleed', 'flat', 0.5)]),
      n('returning_force', 'Returning Force', '45% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.45), mod('manaCost', 'increased', -0.2)])],
  ], n('maul_practice', 'Maul Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  whirlwind: tree([
    n('rooted_vortex', 'Rooted Vortex', 'Hits pull enemies inward with 35 force. Damage increases by 20% per second channeled (up to +100%), while movement speed decreases by 20% per second until you are stationary.', [mod('displaceForce', 'flat', -35)], { channel: { ramp: { per: 0.2, max: 1 }, rampMove: { per: -0.2, max: 0 } } }),
    [n('vortex_mouth', 'Vortex Mouth', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('iron_gravity', 'Iron Gravity', 'Pulls enemies with an additional 25 force per hit.', [mod('displaceForce', 'flat', -25)]),
      n('grinding_teeth', 'Grinding Teeth', 'Impales enemies for 15% of physical hit damage.', [mod('impalePower', 'flat', 0.15)])],
    [n('vortex_hunger', 'Vortex Hunger', 'Gain 1 life on hit and 20% reduced mana cost.', [mod('lifeOnHit', 'flat', 1), mod('manaCost', 'increased', -0.2)]),
      n('crushing_center', 'Crushing Center', 'Hits have +20% chance to stun.', [mod('apply_stun', 'flat', 0.2)]),
      n('patient_grinder', 'Patient Grinder', 'Gains an additional +10% damage per second channeled (up to +150%).', [mod('channelRamp', 'flat', 0.1)])],
  ], [
    n('blood_dance', 'Blood Dance', 'Move at full speed while channeling and gain a 40% chance to inflict bleed, but deal 15% less hit damage.', [mod('channelMobility', 'flat', 0.3), mod('apply_bleed', 'flat', 0.4), mod('damage', 'more', -0.15)]),
    [n('open_veins', 'Open Veins', '35% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['physical'])]),
      n('red_footprints', 'Red Footprints', 'Bleeds spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('drinking_dance', 'Drinking Dance', 'Recover life equal to 5% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.05)])],
    [n('light_blades', 'Light Blades', '20% increased attack speed.', [mod('attackSpeed', 'increased', 0.2)]),
      n('wide_dance', 'Wide Dance', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('unbroken_dance', 'Unbroken Dance', '30% reduced mana cost and leech 4% of hit damage as life.', [mod('manaCost', 'increased', -0.3), mod('lifeLeech', 'flat', 0.04)])],
  ], n('spin_practice', 'Spin Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  dash: tree([
    buff(n('headlong_entry', 'Headlong Entry', 'Empowers your next melee hit within 3 seconds to deal 35% more damage.', undefined, { tags: { add: ['buff', 'duration'] } }), 'dash_entry', { duration: 3, consumeOn: { on: 'hit', tags: ['melee'] }, mods: [mod('damage', 'more', 0.35, ['melee'])] }),
    [buff(n('sighted_entry', 'Sighted Entry', 'While empowered, gain 40% increased accuracy and +10% melee critical chance.'), 'dash_entry', { mods: [mod('accuracy', 'increased', 0.4), mod('critChance', 'flat', 0.1, ['melee'])] }),
      buff(n('staggering_entry', 'Staggering Entry', 'Empowered melee hits gain +40% chance to stun.'), 'dash_entry', { mods: [mod('apply_stun', 'flat', 0.4, ['melee'])] }),
      buff(n('feeding_entry', 'Feeding Entry', 'Empowered melee hits leech 10% of hit damage as life.'), 'dash_entry', { mods: [mod('lifeLeech', 'flat', 0.1, ['melee'])] })],
    [n('quick_reentry', 'Quick Reentry', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('measured_entry', 'Measured Entry', '60% increased buff duration.', [mod('effectDuration', 'increased', 0.6)]),
      buff(n('finishing_entry', 'Finishing Entry', 'Empowered melee hits cull enemies below 10% life.'), 'dash_entry', { mods: [mod('cullThreshold', 'flat', 0.1, ['melee'])] })],
  ], [
    buff(n('breakaway', 'Breakaway', 'Grants 25% increased movement speed and 20% less damage taken for 2 seconds, ending early if you are hit.', undefined, { tags: { add: ['buff', 'duration'] } }), 'dash_escape', { duration: 2, clearOnHit: true, mods: [mod('moveSpeed', 'increased', 0.25), mod('damageTaken', 'more', -0.2)] }),
    [n('long_escape', 'Long Escape', '50% increased buff duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('slipping_escape', 'Slipping Escape', 'While active, gain 60% increased evasion.'), 'dash_escape', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('breathing_space', 'Breathing Space', 'While active, regenerate 4 life per second.'), 'dash_escape', { mods: [mod('lifeRegen', 'flat', 4)] })],
    [n('ready_escape', 'Ready Escape', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_escape', 'Frugal Escape', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_shelter', 'Paid Shelter', 'Gain a shield for 3 seconds equal to 3 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 3)])],
  ], n('dash_practice', 'Dash Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  infernal_ray: tree([
    n('siege_furnace', 'Siege Furnace', 'Narrows the beam to a 10-degree arc. Damage ramps quadratically at 12% per second squared while channeled, up to +300%.', undefined, { arcDeg: 10, channel: { ramp: { per: 0.12, max: 3, curve: 'quadratic' } } }),
    [n('long_crucible', 'Long Crucible', '35% increased beam range.', [mod('meleeReach', 'increased', 0.35)]),
      n('white_core', 'White Core', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('pressure_core', 'Pressure Core', 'Gains an additional +12% damage per second channeled (up to +150%).', [mod('channelRamp', 'flat', 0.12)])],
    [n('banked_fuel', 'Banked Fuel', '25% reduced mana cost.', [mod('manaCost', 'increased', -0.25)]),
      n('furnace_ward', 'Furnace Ward', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)]),
      n('turning_crucible', 'Turning Crucible', '100% increased turning speed while channeling.', [mod('channelTurnRate', 'increased', 1)])],
  ], [
    n('roaming_furnace', 'Roaming Furnace', 'Widens the beam to a 38-degree cone and allows you to move at 50% speed while channeling. Damage increases by 15% per second channeled (up to +60%), with 150% increased turning speed.', [mod('channelMobility', 'flat', 0.5), mod('channelTurnRate', 'increased', 1.5)], { arcDeg: 38, channel: { ramp: { per: 0.15, max: 0.6 } } }),
    [n('kindling_wake', 'Kindling Wake', 'Hits have +40% chance to ignite.', [mod('apply_burn', 'flat', 0.4)]),
      n('walking_wildfire', 'Walking Wildfire', 'Ignites spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('clinging_heat', 'Clinging Heat', '40% increased fire ailment magnitude and 25% increased effect duration.', [mod('statusMagnitude', 'increased', 0.4, ['fire']), mod('effectDuration', 'increased', 0.25)])],
    [n('nimble_furnace', 'Nimble Furnace', '+20% movement speed while channeling.', [mod('channelMobility', 'flat', 0.2)]),
      n('circling_flame', 'Circling Flame', 'The beam sweeps around you automatically at 1.7 radians per second instead of following your cursor.', [mod('channelAutoSpin', 'flat', 1.7)]),
      n('thrifty_flame', 'Thrifty Flame', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], n('ray_studies', 'Ray Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  storm_call: tree([
    n('storm_residence', 'Storm Residence', 'Leaves a lightning field in an 80 radius for 3 seconds that deals 40% skill damage every 0.5 seconds. Deals 20% less damage.', [mod('lingerField', 'flat', 3), mod('damage', 'more', -0.2)], { tags: { add: ['duration'] } }),
    [n('storm_border', 'Storm Border', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_residence', 'Long Residence', 'Lightning fields last 2 additional seconds.', [mod('lingerField', 'flat', 2)]),
      n('conductive_air', 'Conductive Air', 'Enemies can have up to 2 additional shock stacks.', [mod('ailmentStacks', 'flat', 2, ['lightning'])])],
    [n('charged_soil', 'Charged Soil', 'Hits have +30% chance to shock.', [mod('apply_shock', 'flat', 0.3)]),
      n('gathered_voltage', 'Gathered Voltage', 'Deals 8% more damage per shock stack on the target.', [mod('damageVs_shock', 'flat', 0.08)]),
      n('grounding_rod', 'Grounding Rod', 'Gain a shield for 3 seconds equal to 2 per mana spent, up to 30% of your maximum life.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    n('thunder_sequence', 'Thunder Sequence', 'Strikes the marked area a second time after 0.22 seconds at no extra cost, but deals 25% less damage per strike.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('third_thunder', 'Third Thunder', 'Strikes 1 additional time, but deals 15% less damage per strike.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('rolling_thunder', 'Rolling Thunder', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('staggering_thunder', 'Staggering Thunder', 'Hits have +25% chance to stun.', [mod('apply_stun', 'flat', 0.25)])],
    [n('storm_interval', 'Storm Interval', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('forked_verdict', 'Forked Verdict', 'Penetrates 12% lightning resistance.', [mod('lightningPen', 'flat', 0.12)]),
      n('charged_verdict', 'Charged Verdict', '+15% critical chance against shocked enemies.', [mod('critChance', 'flat', 0.15, ['vs:shock'])])],
  ], n('thunder_studies', 'Thunder Studies', '15% increased lightning damage.', [mod('damage', 'increased', 0.15, ['lightning'])])),

  ice_shield: tree([
    { ...n('glacial_reservoir', 'Glacial Reservoir', 'While your guard is damaged, drains 4% of unreserved maximum mana per second to restore 2 guard per mana drained (stops at full guard or 25% unreserved mana).'), conduits: [{ from: 'mana', to: 'guard', drainPct: 0.04, ratio: 2, floor: 0.25 }] },
    [n('thick_glacier', 'Thick Glacier', '35% increased guard strength.', [mod('guardStrength', 'increased', 0.35)]),
      n('efficient_ice', 'Efficient Ice', '35% increased mana-to-guard restoration efficiency.', [mod('conduitEfficiency', 'increased', 0.35)]),
      n('shared_glacier', 'Shared Glacier', 'Nearby minions are protected by your guard, redirecting hits they take to your guard pool.', [mod('guardAegis', 'flat', 1)])],
    [n('returning_winter', 'Returning Winter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('saved_winter', 'Saved Winter', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('stored_avalanche', 'Stored Avalanche', '40% increased release burst damage.', [mod('bashPower', 'increased', 0.4)])],
  ], [
    n('mirror_ice', 'Mirror Ice', 'Parries hits during the first 0.3 seconds after raising the shield, reflecting 150% of incoming damage without losing guard.', [mod('guardParry', 'flat', 0.3)]),
    [n('patient_mirror', 'Patient Mirror', '+0.15 seconds to parry window duration.', [mod('guardParry', 'flat', 0.15)]),
      n('cruel_reflection', 'Cruel Reflection', 'Parries reflect an additional +75% of incoming damage.', [mod('guardParryPower', 'flat', 0.75)]),
      n('ready_mirror', 'Ready Mirror', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)])],
    [n('loaded_shards', 'Loaded Shards', '35% increased release burst damage and 20% reduced guard threshold required to trigger it.', [mod('bashPower', 'increased', 0.35), mod('bashFloor', 'increased', -0.2)]),
      n('hollow_glass', 'Hollow Glass', 'The release burst triggers when guard is depleted instead, scaling with guard lost rather than guard remaining. 25% increased release burst damage.', [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)]),
      n('biting_shards', 'Biting Shards', 'Release burst penetrates 15% cold resistance.', [mod('coldPen', 'flat', 0.15)])],
  ], n('ice_studies', 'Ice Studies', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  sanctified_strike: tree([
    n('communion_strike', 'Communion Strike', 'Each ally healed by your strike chains a heal at 75% effectiveness to another wounded ally within 220 radius.', [mod('chainCount', 'flat', 1)]),
    [n('open_communion', 'Open Communion', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('gathered_communion', 'Gathered Communion', 'Heals chain +1 additional time at 75% effectiveness per chain.', [mod('chainCount', 'flat', 1)]),
      n('unspent_blessing', 'Unspent Blessing', 'Converts 50% of overhealing into a shield for 6 seconds, up to 50% of the target\'s maximum life.', [mod('overheal', 'flat', 0.5)])],
    [n('merciful_rhythm', 'Merciful Rhythm', '20% increased attack speed.', [mod('attackSpeed', 'increased', 0.2)]),
      n('deep_communion', 'Deep Communion', '40% increased healing power.', [mod('healPower', 'increased', 0.4)]),
      n('stern_communion', 'Stern Communion', 'Hits have +30% chance to stun.', [mod('apply_stun', 'flat', 0.3)])],
  ], [
    n('pilgrim_arc', 'Pilgrim Arc', 'Projects a traveling wave of light forward that damages enemies and heals allies in its path. Deals 20% less damage and costs 35% more mana.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2), mod('manaCost', 'more', 0.35)], { tags: { add: ['duration', 'sweep'] } }),
    [n('pilgrim_reach', 'Pilgrim Reach', '40% increased wave travel distance.', [mod('sweepRange', 'increased', 0.4)]),
      n('broad_benediction', 'Broad Benediction', '30% increased arc width and 20% increased area radius.', [mod('swingArc', 'increased', 0.3), mod('aoeRadius', 'increased', 0.2)]),
      n('distant_mercy', 'Distant Mercy', '40% increased healing power.', [mod('healPower', 'increased', 0.4)])],
    [n('pilgrim_judgment', 'Pilgrim Judgment', 'Hits have +40% chance to ignite.', [mod('apply_burn', 'flat', 0.4)]),
      n('cleansing_fire', 'Cleansing Fire', 'Ignites spread to nearby enemies when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('tempered_judgment', 'Tempered Judgment', 'Ignores 12% of enemy armor and penetrates 12% fire resistance.', [mod('armorPen', 'flat', 0.12), mod('firePen', 'flat', 0.12)])],
  ], n('devout_practice', 'Devout Practice', '12% increased damage and healing power.', [mod('damage', 'increased', 0.12), mod('healPower', 'increased', 0.12)])),

  mend: tree([
    n('passing_grace', 'Passing Grace', 'Chains to 2 additional wounded allies within 220 radius at 75% effectiveness per chain. Costs 25% more mana.', [mod('chainCount', 'flat', 2), mod('manaCost', 'more', 0.25)]),
    [n('widened_fellowship', 'Widened Fellowship', 'Chains +1 additional time.', [mod('chainCount', 'flat', 1)]),
      n('deep_grace', 'Deep Grace', '40% increased healing power.', [mod('healPower', 'increased', 0.4)]),
      n('joyful_grace', 'Joyful Grace', '+15% critical heal chance.', [mod('critChance', 'flat', 0.15)])],
    [n('frequent_grace', 'Frequent Grace', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('humble_grace', 'Humble Grace', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('abundant_grace', 'Abundant Grace', 'Converts 40% of overhealing into a shield for 6 seconds, up to 50% of the target\'s maximum life.', [mod('overheal', 'flat', 0.4)])],
  ], [
    n('banked_mercy', 'Banked Mercy', 'Converts 80% of overhealing into a shield for 6 seconds, up to 50% of the target\'s maximum life.', [mod('overheal', 'flat', 0.8)]),
    [n('deep_mercy', 'Deep Mercy', '40% increased healing power.', [mod('healPower', 'increased', 0.4)]),
      n('brimming_mercy', 'Brimming Mercy', 'Converts an additional 30% of overhealing into a shield.', [mod('overheal', 'flat', 0.3)]),
      n('fortunate_mercy', 'Fortunate Mercy', '+20% critical heal chance.', [mod('critChance', 'flat', 0.2)])],
    [n('ready_mercy', 'Ready Mercy', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('inexpensive_mercy', 'Inexpensive Mercy', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('shared_mercy', 'Shared Mercy', 'Chains to 1 additional wounded ally within 220 radius at 75% effectiveness.', [mod('chainCount', 'flat', 1)])],
  ], n('mending_practice', 'Mending Practice', '15% increased healing power.', [mod('healPower', 'increased', 0.15)])),

  consecration: tree([
    n('sanctuary_floor', 'Sanctuary Floor', 'Converts 60% of overhealing into a shield for 6 seconds, up to 50% of each target\'s maximum life. Grants 25% more healing, but deals 25% less damage.', [mod('overheal', 'flat', 0.6), mod('healPower', 'more', 0.25), mod('damage', 'more', -0.25)]),
    [n('sanctuary_border', 'Sanctuary Border', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_sanctuary', 'Long Sanctuary', '40% increased ground duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_doors', 'Open Doors', 'Heals on allies chain once to another wounded ally within 220 radius at 75% effectiveness.', [mod('chainCount', 'flat', 1)])],
    [n('sustaining_floor', 'Sustaining Floor', '35% increased healing power.', [mod('healPower', 'increased', 0.35)]),
      n('layered_mercy', 'Layered Mercy', 'Converts an additional 30% of overhealing into a shield.', [mod('overheal', 'flat', 0.3)]),
      n('returning_sanctuary', 'Returning Sanctuary', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('purgatory_floor', 'Purgatory Floor', 'Hits have a 45% chance to ignite, and ignites spread to nearby enemies when their victim dies. Deals 25% more damage, but grants 20% less healing.', [mod('apply_burn', 'flat', 0.45), mod('dotPropagates', 'flat', 1), mod('damage', 'more', 0.25), mod('healPower', 'more', -0.2)]),
    [n('purgatory_heat', 'Purgatory Heat', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('unforgiving_flame', 'Unforgiving Flame', 'Penetrates 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('feeding_flame', 'Feeding Flame', 'Recover life equal to 4% of burn damage dealt by this skill.', [mod('dotLeech_burn', 'flat', 0.04)])],
    [n('purgatory_border', 'Purgatory Border', '25% increased area radius and 20% increased ground duration.', [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.2)]),
      n('long_penance', 'Long Penance', '40% increased effect duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('frequent_penance', 'Frequent Penance', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)])],
  ], n('consecration_practice', 'Consecration Practice', '12% increased damage and healing power.', [mod('damage', 'increased', 0.12), mod('healPower', 'increased', 0.12)])),
};
