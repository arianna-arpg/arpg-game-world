import type { SkillTreeSpec, TreeBuffPatch } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const buff = (node: Node, id: string, patch: Omit<TreeBuffPatch, 'id'>): Node => ({ ...node, buffs: [{ id, ...patch }] });

/** Complete Berserker, Sorcerer and Cleric opening bars. Identity replacements
 * live on rival trunks; everything below them composes as independent gains. */
export const DEVOTED_STARTER_TREES: Record<string, SkillTreeSpec> = {
  heavy_strike: tree([
    n('buried_maul', 'Buried Maul', 'Lodge 35% of physical hit damage as impale for a later hit to discharge. 30% more damage, but 20% less attack speed.', [mod('impalePower', 'flat', 0.35), mod('damage', 'more', 0.3), mod('attackSpeed', 'more', -0.2)]),
    [n('broken_plate', 'Broken Plate', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)]),
      n('mauls_debt', 'Maul\'s Debt', 'Lodge an additional 20% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.2)]),
      n('cracked_crown', 'Cracked Crown', 'Deal 40% more damage to stunned enemies.', [mod('damage', 'more', 0.4, ['vs:stun'])])],
    [n('patient_executioner', 'Patient Executioner', '35% increased cooldown recovery and 30% increased accuracy.', [mod('cooldownRecovery', 'increased', 0.35), mod('accuracy', 'increased', 0.3)]),
      n('last_sentence', 'Last Sentence', 'Cull enemies below 10% life.', [mod('cullThreshold', 'flat', 0.1)]),
      n('blood_price', 'Blood Price', 'Leech 8% of hit damage as life.', [mod('lifeLeech', 'flat', 0.08)])],
  ], [
    n('fault_wave', 'Fault Wave', 'Release the blow as a traveling crescent that strikes each enemy once. Retain the stun and shove; 20% less damage and 35% more mana cost.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2), mod('manaCost', 'more', 0.35)], { tags: { add: ['aoe', 'duration', 'sweep'] } }),
    [n('running_fault', 'Running Fault', '40% increased sweep travel.', [mod('sweepRange', 'increased', 0.4)]),
      n('wide_fault', 'Wide Fault', '50% increased arc width and 20% increased area radius.', [mod('swingArc', 'increased', 0.5), mod('aoeRadius', 'increased', 0.2)]),
      n('fault_aftershock', 'Fault Aftershock', 'Repeat the traveling blow once after 0.22 seconds, without another payment; 20% less damage per blow.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.2)])],
    [n('crumbling_front', 'Crumbling Front', 'Hits gain 25% additional chance to stun.', [mod('apply_stun', 'flat', 0.25)]),
      n('ragged_front', 'Ragged Front', 'Hits gain 50% chance to bleed.', [mod('apply_bleed', 'flat', 0.5)]),
      n('returning_force', 'Returning Force', '45% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.45), mod('manaCost', 'increased', -0.2)])],
  ], n('maul_practice', 'Maul Practice', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  whirlwind: tree([
    n('rooted_vortex', 'Rooted Vortex', 'Each hit pulls enemies inward with 35 force. Damage grows by 20% per held second up to +100%; your movement factor loses 0.2 per held second until rooted.', [mod('displaceForce', 'flat', -35)], { channel: { ramp: { per: 0.2, max: 1 }, rampMove: { per: -0.2, max: 0 } } }),
    [n('vortex_mouth', 'Vortex Mouth', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('iron_gravity', 'Iron Gravity', 'Pull with an additional 25 force per hit.', [mod('displaceForce', 'flat', -25)]),
      n('grinding_teeth', 'Grinding Teeth', 'Lodge 15% of physical hit damage as impale.', [mod('impalePower', 'flat', 0.15)])],
    [n('vortex_hunger', 'Vortex Hunger', 'Restore 1 life per landed hit and reduce pulse mana cost by 20%.', [mod('lifeOnHit', 'flat', 1), mod('manaCost', 'increased', -0.2)]),
      n('crushing_center', 'Crushing Center', 'Hits gain 20% chance to stun.', [mod('apply_stun', 'flat', 0.2)]),
      n('patient_grinder', 'Patient Grinder', 'Add 10% damage per held second, capped at +150% from this added ramp.', [mod('channelRamp', 'flat', 0.1)])],
  ], [
    n('blood_dance', 'Blood Dance', 'Spin at ordinary walking pace, gain 40% chance to bleed, and deal 15% less hit damage.', [mod('channelMobility', 'flat', 0.3), mod('apply_bleed', 'flat', 0.4), mod('damage', 'more', -0.15)]),
    [n('open_veins', 'Open Veins', '35% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['physical'])]),
      n('red_footprints', 'Red Footprints', 'Bleeds spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('drinking_dance', 'Drinking Dance', 'Recover life equal to 5% of this skill\'s bleed damage.', [mod('dotLeech_bleed', 'flat', 0.05)])],
    [n('light_blades', 'Light Blades', '20% increased attack speed quickens channel pulses.', [mod('attackSpeed', 'increased', 0.2)]),
      n('wide_dance', 'Wide Dance', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('unbroken_dance', 'Unbroken Dance', '30% reduced pulse mana cost and 4% life leech from hits.', [mod('manaCost', 'increased', -0.3), mod('lifeLeech', 'flat', 0.04)])],
  ], n('spin_practice', 'Spin Practice', '15% increased physical damage.', [mod('damage', 'increased', 0.15, ['physical'])])),

  dash: tree([
    buff(n('headlong_entry', 'Headlong Entry', 'Dashing prepares your next landed melee hit for 3 base seconds: 35% more damage, consumed by that hit.', undefined, { tags: { add: ['buff', 'duration'] } }), 'dash_entry', { duration: 3, consumeOn: { on: 'hit', tags: ['melee'] }, mods: [mod('damage', 'more', 0.35, ['melee'])] }),
    [buff(n('sighted_entry', 'Sighted Entry', 'While prepared, gain 40% increased accuracy and 10% melee critical chance.'), 'dash_entry', { mods: [mod('accuracy', 'increased', 0.4), mod('critChance', 'flat', 0.1, ['melee'])] }),
      buff(n('staggering_entry', 'Staggering Entry', 'Prepared melee hits gain 40% chance to stun.'), 'dash_entry', { mods: [mod('apply_stun', 'flat', 0.4, ['melee'])] }),
      buff(n('feeding_entry', 'Feeding Entry', 'Prepared melee hits leech 10% of hit damage as life.'), 'dash_entry', { mods: [mod('lifeLeech', 'flat', 0.1, ['melee'])] })],
    [n('quick_reentry', 'Quick Reentry', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('measured_entry', 'Measured Entry', '60% increased preparation duration.', [mod('effectDuration', 'increased', 0.6)]),
      buff(n('finishing_entry', 'Finishing Entry', 'Prepared melee hits cull enemies below 10% life.'), 'dash_entry', { mods: [mod('cullThreshold', 'flat', 0.1, ['melee'])] })],
  ], [
    buff(n('breakaway', 'Breakaway', 'Dashing grants 2 base seconds of 25% increased movement speed and 20% less damage taken. The blessing breaks after a landed hit against you.', undefined, { tags: { add: ['buff', 'duration'] } }), 'dash_escape', { duration: 2, clearOnHit: true, mods: [mod('moveSpeed', 'increased', 0.25), mod('damageTaken', 'more', -0.2)] }),
    [n('long_escape', 'Long Escape', '50% increased blessing duration.', [mod('effectDuration', 'increased', 0.5)]),
      buff(n('slipping_escape', 'Slipping Escape', 'While blessed, gain 60% increased evasion.'), 'dash_escape', { mods: [mod('evasion', 'increased', 0.6)] }),
      buff(n('breathing_space', 'Breathing Space', 'While blessed, regenerate 4 life per second.'), 'dash_escape', { mods: [mod('lifeRegen', 'flat', 4)] })],
    [n('ready_escape', 'Ready Escape', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('frugal_escape', 'Frugal Escape', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('paid_shelter', 'Paid Shelter', 'Each mana actually paid grants 3 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 3)])],
  ], n('dash_practice', 'Dash Practice', '12% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.12)])),

  infernal_ray: tree([
    n('siege_furnace', 'Siege Furnace', 'Commit to a narrower 10-degree ray. Its damage ramp becomes 12% times held seconds squared, capped at +300%. Retain immobility, slow turning and the original area ramp.', undefined, { arcDeg: 10, channel: { ramp: { per: 0.12, max: 3, curve: 'quadratic' } } }),
    [n('long_crucible', 'Long Crucible', '35% increased beam reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('white_core', 'White Core', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('pressure_core', 'Pressure Core', 'Add 12% damage per held second, capped at +150% from this added ramp.', [mod('channelRamp', 'flat', 0.12)])],
    [n('banked_fuel', 'Banked Fuel', '25% reduced pulse mana cost.', [mod('manaCost', 'increased', -0.25)]),
      n('furnace_ward', 'Furnace Ward', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Repeated pulses refresh the strongest shield.', [mod('costWard_mana', 'flat', 2)]),
      n('turning_crucible', 'Turning Crucible', '100% increased channel turning rate.', [mod('channelTurnRate', 'increased', 1)])],
  ], [
    n('roaming_furnace', 'Roaming Furnace', 'Widen the ray to 38 degrees and walk at half speed while channeling. Damage ramps linearly by 15% per held second to +60%, retaining the original area ramp. Turn 150% faster.', [mod('channelMobility', 'flat', 0.5), mod('channelTurnRate', 'increased', 1.5)], { arcDeg: 38, channel: { ramp: { per: 0.15, max: 0.6 } } }),
    [n('kindling_wake', 'Kindling Wake', 'Hits gain 40% additional chance to burn.', [mod('apply_burn', 'flat', 0.4)]),
      n('walking_wildfire', 'Walking Wildfire', 'Burns spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('clinging_heat', 'Clinging Heat', '40% increased fire ailment magnitude and 25% increased effect duration.', [mod('statusMagnitude', 'increased', 0.4, ['fire']), mod('effectDuration', 'increased', 0.25)])],
    [n('nimble_furnace', 'Nimble Furnace', 'Add 20 percentage points of channel movement, reaching 70% of walking pace.', [mod('channelMobility', 'flat', 0.2)]),
      n('circling_flame', 'Circling Flame', 'The beam revolves automatically at 1.7 radians per second instead of following your aim.', [mod('channelAutoSpin', 'flat', 1.7)]),
      n('thrifty_flame', 'Thrifty Flame', '30% reduced pulse mana cost.', [mod('manaCost', 'increased', -0.3)])],
  ], n('ray_studies', 'Ray Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])])),

  storm_call: tree([
    n('storm_residence', 'Storm Residence', 'Also leave an 80-base-radius lightning field at the mark for 3 seconds. Every half-second it deals 40% skill damage and carries the shock effects; 20% less damage.', [mod('lingerField', 'flat', 3), mod('damage', 'more', -0.2)], { tags: { add: ['duration'] } }),
    [n('storm_border', 'Storm Border', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_residence', 'Long Residence', 'Fields last 2 additional base seconds.', [mod('lingerField', 'flat', 2)]),
      n('conductive_air', 'Conductive Air', 'Allow two additional lightning ailment stacks per enemy.', [mod('ailmentStacks', 'flat', 2, ['lightning'])])],
    [n('charged_soil', 'Charged Soil', 'Hits gain 30% additional chance to shock.', [mod('apply_shock', 'flat', 0.3)]),
      n('gathered_voltage', 'Gathered Voltage', 'Deal 8% more damage per shock stack on the target.', [mod('damageVs_shock', 'flat', 0.08)]),
      n('grounding_rod', 'Grounding Rod', 'Each mana actually paid grants 2 absorb for 3 seconds, capped at 30% maximum life. Strongest shield wins.', [mod('costWard_mana', 'flat', 2)])],
  ], [
    n('thunder_sequence', 'Thunder Sequence', 'Call the strike twice at the same mark, the repeat beginning 0.22 seconds later without another payment. Each strike keeps its delay and deals 25% less damage.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.25)]),
    [n('third_thunder', 'Third Thunder', 'Add one more repeat at the same cadence; 15% less damage per strike.', [mod('repeatCount', 'flat', 1), mod('damage', 'more', -0.15)]),
      n('rolling_thunder', 'Rolling Thunder', '35% increased area radius.', [mod('aoeRadius', 'increased', 0.35)]),
      n('staggering_thunder', 'Staggering Thunder', 'Hits gain 25% chance to stun.', [mod('apply_stun', 'flat', 0.25)])],
    [n('storm_interval', 'Storm Interval', '35% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.35)]),
      n('forked_verdict', 'Forked Verdict', 'Penetrate 12% lightning resistance.', [mod('lightningPen', 'flat', 0.12)]),
      n('charged_verdict', 'Charged Verdict', 'Gain 15% critical chance against shocked enemies.', [mod('critChance', 'flat', 0.15, ['vs:shock'])])],
  ], n('thunder_studies', 'Thunder Studies', '15% increased lightning damage.', [mod('damage', 'increased', 0.15, ['lightning'])])),

  ice_shield: tree([
    { ...n('glacial_reservoir', 'Glacial Reservoir', 'While the shell is dented, drain 4% of unreserved maximum mana per second to rebuild 2 guard per mana. Stop at 25% of unreserved maximum mana or full guard. Retain the all-sided immobile shell and release burst.'), conduits: [{ from: 'mana', to: 'guard', drainPct: 0.04, ratio: 2, floor: 0.25 }] },
    [n('thick_glacier', 'Thick Glacier', '35% increased guard strength.', [mod('guardStrength', 'increased', 0.35)]),
      n('efficient_ice', 'Efficient Ice', '35% increased conduit efficiency rebuilds more guard per mana spent.', [mod('conduitEfficiency', 'increased', 0.35)]),
      n('shared_glacier', 'Shared Glacier', 'Nearby minions can shelter behind your all-sided guard; intercepted hits drain your guard instead.', [mod('guardAegis', 'flat', 1)])],
    [n('returning_winter', 'Returning Winter', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('saved_winter', 'Saved Winter', '35% reduced mana cost.', [mod('manaCost', 'increased', -0.35)]),
      n('stored_avalanche', 'Stored Avalanche', '40% increased release bash power.', [mod('bashPower', 'increased', 0.4)])],
  ], [
    n('mirror_ice', 'Mirror Ice', 'Parry during the first 0.3 seconds after raising the shell: return incoming damage at 150% power without spending guard. Keep the ordinary release and break burst.', [mod('guardParry', 'flat', 0.3)]),
    [n('patient_mirror', 'Patient Mirror', 'Extend the parry window by 0.15 seconds.', [mod('guardParry', 'flat', 0.15)]),
      n('cruel_reflection', 'Cruel Reflection', 'Parry damage gains 75 percentage points of incoming damage.', [mod('guardParryPower', 'flat', 0.75)]),
      n('ready_mirror', 'Ready Mirror', '45% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.45)])],
    [n('loaded_shards', 'Loaded Shards', '35% increased bash power; lower the release bash arming line by 20%.', [mod('bashPower', 'increased', 0.35), mod('bashFloor', 'increased', -0.2)]),
      n('hollow_glass', 'Hollow Glass', 'Invert the bash: arm on sufficiently depleted guard and deal damage from shield lost instead of shield remaining. 25% increased bash power.', [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)]),
      n('biting_shards', 'Biting Shards', 'Penetrate 15% cold resistance with the release burst.', [mod('coldPen', 'flat', 0.15)])],
  ], n('ice_studies', 'Ice Studies', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)])),

  sanctified_strike: tree([
    n('communion_strike', 'Communion Strike', 'Each ally mended by your melee arc chains a heal to one further wounded ally within 220, at 75% strength. You remain excluded from every hop.', [mod('chainCount', 'flat', 1)]),
    [n('open_communion', 'Open Communion', '35% increased melee reach.', [mod('meleeReach', 'increased', 0.35)]),
      n('gathered_communion', 'Gathered Communion', 'Add one further healing hop, with the same 75% falloff per hop.', [mod('chainCount', 'flat', 1)]),
      n('unspent_blessing', 'Unspent Blessing', 'Convert 50% of healing spilled past full life into absorb for 6 seconds, capped at half the recipient\'s maximum life. Strongest shield wins.', [mod('overheal', 'flat', 0.5)])],
    [n('merciful_rhythm', 'Merciful Rhythm', '20% increased attack speed.', [mod('attackSpeed', 'increased', 0.2)]),
      n('deep_communion', 'Deep Communion', '40% increased healing power.', [mod('healPower', 'increased', 0.4)]),
      n('stern_communion', 'Stern Communion', 'Hits gain 30% chance to stun enemies while allies are mended.', [mod('apply_stun', 'flat', 0.3)])],
  ], [
    n('pilgrim_arc', 'Pilgrim Arc', 'Send the sanctified arc traveling forward, damaging each enemy and healing each crossed ally once. You remain excluded. 20% less damage and 35% more mana cost.', [mod('meleeSweep', 'override', 1), mod('damage', 'more', -0.2), mod('manaCost', 'more', 0.35)], { tags: { add: ['duration', 'sweep'] } }),
    [n('pilgrim_reach', 'Pilgrim Reach', '40% increased sweep travel.', [mod('sweepRange', 'increased', 0.4)]),
      n('broad_benediction', 'Broad Benediction', '30% increased arc width and 20% increased area radius.', [mod('swingArc', 'increased', 0.3), mod('aoeRadius', 'increased', 0.2)]),
      n('distant_mercy', 'Distant Mercy', '40% increased healing power.', [mod('healPower', 'increased', 0.4)])],
    [n('pilgrim_judgment', 'Pilgrim Judgment', 'Hits gain 40% chance to burn.', [mod('apply_burn', 'flat', 0.4)]),
      n('cleansing_fire', 'Cleansing Fire', 'Burns spread when their victim dies.', [mod('dotPropagates', 'flat', 1)]),
      n('tempered_judgment', 'Tempered Judgment', 'Ignore 12% enemy armor and penetrate 12% fire resistance.', [mod('armorPen', 'flat', 0.12), mod('firePen', 'flat', 0.12)])],
  ], n('devout_practice', 'Devout Practice', '12% increased damage and healing power.', [mod('damage', 'increased', 0.12), mod('healPower', 'increased', 0.12)])),

  mend: tree([
    n('passing_grace', 'Passing Grace', 'Mend chains to two further wounded allies within 220 per hop, at 75% strength per hop. 25% more mana cost.', [mod('chainCount', 'flat', 2), mod('manaCost', 'more', 0.25)]),
    [n('widened_fellowship', 'Widened Fellowship', 'Add one further healing hop.', [mod('chainCount', 'flat', 1)]),
      n('deep_grace', 'Deep Grace', '40% increased healing power.', [mod('healPower', 'increased', 0.4)]),
      n('joyful_grace', 'Joyful Grace', 'Gain 15% healing critical chance.', [mod('critChance', 'flat', 0.15)])],
    [n('frequent_grace', 'Frequent Grace', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('humble_grace', 'Humble Grace', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('abundant_grace', 'Abundant Grace', 'Convert 40% of overhealing into 6-second absorb, capped at half the recipient\'s maximum life. Strongest shield wins.', [mod('overheal', 'flat', 0.4)])],
  ], [
    n('banked_mercy', 'Banked Mercy', 'Convert 80% of healing spilled past full life into absorb for 6 seconds, capped at half the recipient\'s maximum life. Strongest shield wins; no healing means no stored ward.', [mod('overheal', 'flat', 0.8)]),
    [n('deep_mercy', 'Deep Mercy', '40% increased healing power grows the mend and its possible spill.', [mod('healPower', 'increased', 0.4)]),
      n('brimming_mercy', 'Brimming Mercy', 'Convert an additional 30% of overhealing into absorb.', [mod('overheal', 'flat', 0.3)]),
      n('fortunate_mercy', 'Fortunate Mercy', 'Gain 20% healing critical chance.', [mod('critChance', 'flat', 0.2)])],
    [n('ready_mercy', 'Ready Mercy', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)]),
      n('inexpensive_mercy', 'Inexpensive Mercy', '30% reduced mana cost.', [mod('manaCost', 'increased', -0.3)]),
      n('shared_mercy', 'Shared Mercy', 'Chain the mend to one further wounded ally within 220, at 75% strength.', [mod('chainCount', 'flat', 1)])],
  ], n('mending_practice', 'Mending Practice', '15% increased healing power.', [mod('healPower', 'increased', 0.15)])),

  consecration: tree([
    n('sanctuary_floor', 'Sanctuary Floor', 'The circle banks 60% of each tick\'s overhealing as 6-second absorb, capped at half each recipient\'s maximum life. Strongest shield wins. 25% more healing and 25% less damage.', [mod('overheal', 'flat', 0.6), mod('healPower', 'more', 0.25), mod('damage', 'more', -0.25)]),
    [n('sanctuary_border', 'Sanctuary Border', '30% increased area radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('long_sanctuary', 'Long Sanctuary', '40% increased field duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('open_doors', 'Open Doors', 'Each ally\'s mend chains once to a wounded ally within 220, at 75% strength.', [mod('chainCount', 'flat', 1)])],
    [n('sustaining_floor', 'Sustaining Floor', '35% increased healing power.', [mod('healPower', 'increased', 0.35)]),
      n('layered_mercy', 'Layered Mercy', 'Convert an additional 30% of overhealing into absorb.', [mod('overheal', 'flat', 0.3)]),
      n('returning_sanctuary', 'Returning Sanctuary', '40% increased cooldown recovery.', [mod('cooldownRecovery', 'increased', 0.4)])],
  ], [
    n('purgatory_floor', 'Purgatory Floor', 'Each damaging tick gains 45% chance to burn. Burns spread when their victim dies. 25% more damage and 20% less healing.', [mod('apply_burn', 'flat', 0.45), mod('dotPropagates', 'flat', 1), mod('damage', 'more', 0.25), mod('healPower', 'more', -0.2)]),
    [n('purgatory_heat', 'Purgatory Heat', '40% increased fire ailment magnitude.', [mod('statusMagnitude', 'increased', 0.4, ['fire'])]),
      n('unforgiving_flame', 'Unforgiving Flame', 'Penetrate 15% fire resistance.', [mod('firePen', 'flat', 0.15)]),
      n('feeding_flame', 'Feeding Flame', 'Recover life equal to 4% of this skill\'s burn damage.', [mod('dotLeech_burn', 'flat', 0.04)])],
    [n('purgatory_border', 'Purgatory Border', '25% increased area radius and 20% increased field duration.', [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.2)]),
      n('long_penance', 'Long Penance', '40% increased effect duration extends field and burns.', [mod('effectDuration', 'increased', 0.4)]),
      n('frequent_penance', 'Frequent Penance', '35% increased cooldown recovery and 20% reduced mana cost.', [mod('cooldownRecovery', 'increased', 0.35), mod('manaCost', 'increased', -0.2)])],
  ], n('consecration_practice', 'Consecration Practice', '12% increased damage and healing power.', [mod('damage', 'increased', 0.12), mod('healPower', 'increased', 0.12)])),
};
