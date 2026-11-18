import type { SkillTreeNode, SkillTreeSpec, TreeBuffPatch, TreeUtilityEffect } from '../engine/skills';
import { mod, type Modifier } from '../engine/stats';
import { n, type Node, type Limb } from './skillTreeBuilder';

// Three exclusive trunks, two additive branches per trunk, two terminal
// choices per branch. Two independent practice nodes keep ordinary drinks useful.
const flaskTree = (limbs: Limb[], passives: Node[]): SkillTreeSpec => {
  const nodes: SkillTreeNode[] = passives.map((p, i) => ({ ...p, empowermentPassive: p.empowermentPassive ?? true, ranks: 3,
    description: p.description + ' Bonuses apply per rank.', x: -85 + i * 170, y: 100 }));
  limbs.forEach((limb, i) => {
    const x = (i - 1) * 340;
    nodes.push({ ...limb[0], kind: 'keystone', excludes: limbs.filter(l => l !== limb).map(l => l[0].id), x, y: -100 });
    [limb[1], limb[2]].forEach(([branch, ...leaves], j) => {
      const bx = x + (j === 0 ? -100 : 100);
      nodes.push({ ...branch, links: [limb[0].id], kind: 'major', x: bx, y: -220 });
      leaves.forEach((leaf, k) => nodes.push({ ...leaf, links: [branch.id], x: bx + (k === 0 ? -50 : 50), y: -340 - k * 60 }));
    });
  });
  return { level: 5, nodes };
};
const b = (node: Node, id: string, mods: Modifier[], patch: Omit<TreeBuffPatch, 'id' | 'mods'> = {}): Node =>
  ({ ...node, buffs: [{ id, mods, ...patch }] });
const fx = (node: Node, ...utilityEffects: TreeUtilityEffect[]): Node => ({ ...node, utilityEffects });
const tap = (node: Node, charge: string, seconds: number, max = 3): Node => ({ ...node,
  chargeGain: [{ charge, on: 'second', amount: 1, max, everySeconds: seconds }] });
const rider = (node: Node, skillId: string, perCharge = false): Node => ({ ...node, followUps: [{ skillId, delay: 0.1, perCharge }] });
const ready = (id: string, name: string, v = 0.4) => n(id, name, `${v * 100}% increased cooldown recovery.`, [mod('cooldownRecovery', 'increased', v)]);
const spread = (id: string, name: string, v = 0.3) => n(id, name, `${v * 100}% increased area radius.`, [mod('aoeRadius', 'increased', v)]);
const ward = (id: string, name: string, amount: number) => fx(n(id, name, `Grants ${amount} decaying Ward on use.`), { type: 'ward', amount });
const clean = (id: string, name: string, count: number) => fx(n(id, name, `Removes ${count} additional harmful status effect${count > 1 ? 's' : ''} on use.`), { type: 'cleanse', count });
const reserve = (id: string, name: string) => n(id, name, '+1 maximum charge.', [mod('chargeCap', 'flat', 1)]);
const restore = (id: string, name: string, v: number) => n(id, name, `${v * 100}% increased recovery.`, [mod('restorePower', 'increased', v)]);

export const FLASK_TREES: Record<string, SkillTreeSpec> = {
  life_flask: flaskTree([
    [n('red_triage', 'Triage', 'Instant recovery restores an additional 8% of maximum life, but recovery over time is reduced by 35%.', [mod('pourPct_surge', 'flat', 0.08), mod('pourPower_settle', 'more', -0.35)]),
      [clean('red_stitch', 'Wash the Wound', 1),
        clean('red_surgery', 'Field Surgery', 2),
        b(n('red_brace', 'Brace for Impact', 'Grants 18% less damage taken for 5 seconds or until you are hit.'), 'red_brace', [mod('damageTaken', 'more', -0.18)], { duration: 5, consumeOn: { on: 'hurt' } })],
      [ready('red_urgency', 'Urgency'),
        fx(n('red_poise', 'Catch Your Breath', 'Immediately restores 20 poise.'), { type: 'restore', resource: 'poise', amount: 20 }),
        n('red_lastlight', 'Last Light', 'Instant recovery restores an additional 7% of maximum life, but total flask recovery is reduced by 20%.', [mod('pourPct_surge', 'flat', 0.07), mod('restorePower', 'more', -0.2)])]],
    [n('red_cellar', 'Living Reserve', 'Using the flask at full life stores 1 primed charge that triggers automatically when you take damage. Recovery over time is increased by 35%, over a 50% longer duration.', [mod('pourPrime', 'flat', 1), mod('pourPower_settle', 'more', 0.35), mod('effectDuration', 'more', 0.5)]),
      [n('red_cork', 'Second Cork', '+1 maximum primed flask charge.', [mod('pourPrime', 'flat', 1)]),
        reserve('red_bottle', 'Spare Bottle'),
        clean('red_release', 'Sterile Reserve', 2)],
      [b(n('red_overflow', 'Clotting Reserve', 'Converts 40% of overhealing during the flask effect into a shield for 8 seconds.'), 'red_overflow', [mod('overheal', 'flat', 0.4)], { duration: 8 }),
        b(n('red_knit', 'Slow Knitting', 'While active, gain 25% increased healing received.'), 'red_overflow', [mod('healTaken', 'increased', 0.25)]),
        tap(n('red_ferment', 'Quiet Fermentation', 'Gains 1 charge every 12 seconds while equipped.'), 'flask_life', 12)]],
    [rider(tap(n('red_bloom', 'Blood Bloom', 'Can be used at full life. Triggers a physical nova on use that inflicts bleed, and gains 1 charge every 4 seconds while equipped, but restores 25% less life.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.25)]), 'flask_life', 4), 'flask_blood_bloom'),
      [spread('red_petals', 'Spreading Petals'),
        n('red_open', 'Open Veins', 'Blood Bloom ignores 20% of enemy armor.', [mod('armorPen', 'flat', 0.2)]),
        n('red_weight', 'Weight of Blood', 'Blood Bloom deals 80% more poise damage.', [mod('poiseDamage', 'more', 0.8)])],
      [b(n('red_bloodguard', 'Bloodguard', 'Grants 12% less damage taken for 6 seconds on use.'), 'red_bloodguard', [mod('damageTaken', 'more', -0.12)], { duration: 6 }),
        restore('red_reclaim', 'Reclaim the Blood', 0.35),
        n('red_rupture', 'Ruptured Vessel', 'Blood Bloom deals 45% more damage, but the flask restores 25% less life.', [mod('damage', 'more', 0.45), mod('restorePower', 'more', -0.25)])]],
  ], [restore('red_practice', 'Careful Measures', 0.1), ready('red_wrist', 'Ready Wrist', 0.1)]),

  mana_flask: flaskTree([
    [b(n('blue_clarity', 'Clarity', 'Your next spell cast within 8 seconds costs 40% less mana.'), 'blue_clarity', [mod('manaCost', 'more', -0.4, ['spell'])], { duration: 8, consumeOn: { on: 'use', tags: ['spell'] } }),
      [b(n('blue_intent', 'Clear Intent', 'The empowered spell also has 35% increased cast speed.'), 'blue_clarity', [mod('castSpeed', 'increased', 0.35, ['spell'])]),
        b(n('blue_focus', 'Focused Thought', 'The empowered spell deals 25% more damage.'), 'blue_clarity', [mod('damage', 'more', 0.25, ['spell'])]),
        b(n('blue_reach', 'Far Thought', 'The empowered spell has 30% increased area radius.'), 'blue_clarity', [mod('aoeRadius', 'increased', 0.3, ['spell'])])],
      [tap(n('blue_study', 'Between Pages', 'Gains 1 charge every 12 seconds while equipped.'), 'flask_mana', 12),
        reserve('blue_ink', 'Spare Ink'),
        restore('blue_script', 'Unbroken Script', 0.3)]],
    [fx(n('blue_reservoir', 'Protective Reservoir', 'Can be used at full mana. Grants 18 decaying Ward on use, but restores 20% less mana.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.2)]), { type: 'ward', amount: 18 }),
      [ward('blue_shell', 'Glass Shell', 14),
        b(n('blue_insulate', 'Insulated Glass', 'Grants +25% lightning resistance for 8 seconds on use.'), 'blue_insulate', [mod('lightningRes', 'flat', 0.25)], { duration: 8 }),
        fx(n('blue_shield', 'Restart the Shield', 'Restores 12 Energy Shield and immediately begins Energy Shield recharge.'), { type: 'restore', resource: 'es', amount: 12, resetEsDelay: true })],
      [n('blue_drip', 'Patient Reservoir', 'Restores 35% more mana over 100% more duration.', [mod('effectDuration', 'more', 1), mod('restorePower', 'more', 0.35)]),
        tap(n('blue_condense', 'Condensation', 'Gains 1 charge every 10 seconds while equipped.'), 'flask_mana', 10),
        clean('blue_filter', 'Clear Water', 1)]],
    [rider(tap(n('blue_lance', 'Galvanic Decant', 'Can be used at full mana. Fires a lightning bolt on use that pierces 2 enemies, and gains 1 charge every 3 seconds while equipped, but restores 35% less mana.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.35)]), 'flask_mana', 3), 'flask_mana_lance'),
      [n('blue_fork', 'Twin Mouth', 'Fires 1 additional bolt, but deals 20% less damage per bolt.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
        n('blue_pierce', 'Through the Ranks', 'Bolts pierce 2 additional enemies.', [mod('pierceCount', 'flat', 2)]),
        n('blue_fast', 'Needle Jet', '45% increased projectile speed.', [mod('projectileSpeed', 'increased', 0.45)])],
      [n('blue_shock', 'Charged Solvent', 'Bolts have a 45% chance to shock.', [mod('apply_shock', 'flat', 0.45)]),
        n('blue_ground', 'Break Insulation', 'Bolts penetrate 20% lightning resistance.', [mod('lightningPen', 'flat', 0.2)]),
        ward('blue_feedback', 'Safe Discharge', 18)]],
  ], [restore('blue_practice', 'Exact Measure', 0.1), reserve('blue_shelf', 'Ink Shelf')]),

  catalyst_flask: flaskTree([
    [n('gold_measure', 'Measured Mixture', 'Consumes only 1 charge per use while granting the full Catalyst buff.', undefined, { chargeCost: { charge: 'flask_catalyst', amount: 1 } }),
      [tap(n('gold_still', 'Bench Still', 'Gains 1 charge every 8 seconds while equipped.', undefined), 'flask_catalyst', 8, 6),
        reserve('gold_vials', 'Sample Vials'),
        ready('gold_sips', 'Tasting Cadence', 0.5)],
      [b(n('gold_balance', 'Balanced Tonic', 'While active, regenerate 1 life and 1 mana per second.'), 'catalyst_high', [mod('lifeRegen', 'flat', 1), mod('manaRegen', 'flat', 1)]),
        clean('gold_filter', 'Paper Filter', 1),
        ward('gold_seal', 'Wax Seal', 16)]],
    [n('gold_grand', 'Grand Transmutation', 'Requires at least 4 charges to use, consuming all charges. Each charge consumed restores 60% more life and mana.', [mod('restorePower', 'more', 0.6)], { chargeCost: { charge: 'flask_catalyst', amount: 'all', minimum: 4 } }),
      [n('gold_vat', 'Deep Vat', '+3 maximum charges.', [mod('chargeCap', 'flat', 3)]),
        fx(n('gold_ward', 'Golden Shell', 'Grants 7 decaying Ward per charge consumed.'), { type: 'ward', amount: 7, perCharge: true }),
        tap(n('gold_age', 'Patient Distillation', 'Gains 1 charge every 3 seconds while equipped.', undefined), 'flask_catalyst', 3, 6)],
      [b(n('gold_savor', 'Savor the High', 'While active, gain 15% increased attack and cast speed.'), 'catalyst_high', [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)]),
        b(n('gold_prism', 'Prismatic Skin', 'While active, gain +20% fire, cold, and lightning resistance.'), 'catalyst_high', [mod('fireRes', 'flat', 0.2), mod('coldRes', 'flat', 0.2), mod('lightningRes', 'flat', 0.2)]),
        n('gold_linger', 'Long Finish', '50% more buff and recovery duration.', [mod('effectDuration', 'more', 0.5)])]],
    [rider(tap(n('gold_retort', 'Volatile Retort', 'Throws a delayed fire bomb at your cursor that scales with charges spent. Gains 1 charge every 2 seconds while equipped, but restores 40% less life and mana.', [mod('restorePower', 'more', -0.4)]), 'flask_catalyst', 2, 6), 'flask_volatile_bomb', true),
      [spread('gold_scatter', 'Wide Retort'),
        n('gold_ignite', 'Hot Residue', 'The blast has a 70% chance to ignite.', [mod('apply_burn', 'flat', 0.7)]),
        n('gold_pressure', 'Under Pressure', 'The blast knocks enemies back with 90 force.', [mod('knockback', 'flat', 90)])],
      [n('gold_battery', 'Large Batch', '+3 maximum charges.', [mod('chargeCap', 'flat', 3)]),
        n('gold_fire', 'White Heat', 'The blast penetrates 20% fire resistance.', [mod('firePen', 'flat', 0.2)]),
        fx(n('gold_slag', 'Cooling Slag', 'Grants 5 decaying Ward per charge consumed.'), { type: 'ward', amount: 5, perCharge: true })]],
  ], [restore('gold_practice', 'Clean Glass', 0.1), ready('gold_wrist', 'Steady Decant', 0.1)]),

  quicksilver_flask: flaskTree([
    [b(n('silver_road', 'Open Road', 'Lasts 8 seconds and grants phasing, but ends early if you are hit.'), 'quicksilver', [mod('phasing', 'flat', 1)], { duration: 8, clearOnHit: true }),
      [tap(n('silver_way', 'Roadside Condenser', 'Gains 1 charge every 10 seconds while equipped.'), 'flask_quicksilver', 10),
        reserve('silver_satchel', 'Traveller’s Satchel'),
        ready('silver_depart', 'Early Departure')],
      [b(n('silver_stride', 'Long Stride', 'Grants an additional 25% increased movement speed.'), 'quicksilver', [mod('moveSpeed', 'increased', 0.25)]),
        clean('silver_wash', 'Wash Off the Road', 1),
        b(n('silver_breath', 'Walking Breath', 'While active, regenerate 2 life per second.'), 'quicksilver', [mod('lifeRegen', 'flat', 2)])]],
    [b(n('silver_duelist', 'Slippery Footwork', 'Grants +180 evasion, but duration is reduced to 3 seconds.'), 'quicksilver', [mod('evasion', 'flat', 180)], { duration: 3 }),
      [b(n('silver_slip', 'Slip the Blow', 'While active, recover 6 life when you evade an attack.'), 'quicksilver', [mod('lifeOnEvade', 'flat', 6)]),
        b(n('silver_grace', 'Grace Under Pressure', 'While active, take 10% less damage.'), 'quicksilver', [mod('damageTaken', 'more', -0.1)]),
        b(n('silver_hands', 'Quick Hands', 'While active, gain 20% increased attack and cast speed.'), 'quicksilver', [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)])],
      [ready('silver_second', 'Second Step', 0.7),
        tap(n('silver_recover', 'Recover Your Footing', 'Gains 1 charge every 7 seconds while equipped.'), 'flask_quicksilver', 7),
        ward('silver_glass', 'Breakaway Glass', 20)]],
    [rider(tap(n('silver_wake', 'Mercury Wake', 'Leaves a chilling pool at your feet on use. Gains 1 charge every 8 seconds while equipped.'), 'flask_quicksilver', 8), 'flask_cold_wake'),
      [{ ...n('silver_tracks', 'Frozen Tracks', 'Gain 1 charge for every 600 distance traveled on foot.'), chargeGain: [{ charge: 'flask_quicksilver', amount: 1, max: 3, on: 'move', perDistance: 600 }] },
        ready('silver_lap', 'Another Lap', 0.5),
        b(n('silver_lure', 'Lure the Pursuit', 'While active, gain an additional 20% increased movement speed.'), 'quicksilver', [mod('moveSpeed', 'increased', 0.2)])],
      [spread('silver_pool', 'Broad Wake'),
        n('silver_freeze', 'Flash Freeze', 'Chilling pool hits have a 25% chance to freeze.', [mod('apply_frozen', 'flat', 0.25)]),
        n('silver_deep', 'Deep Frost', 'Chilling pool deals 50% more damage, but buff and pool duration are reduced by 25%.', [mod('damage', 'more', 0.5), mod('effectDuration', 'more', -0.25)])]],
  ], [ready('silver_practice', 'Unstoppered', 0.1), n('silver_time', 'Lingering Cool', '8% increased effect duration.', [mod('effectDuration', 'increased', 0.08)])]),

  stoneskin_flask: flaskTree([
    [b(n('stone_bastion', 'Drink the Mountain', 'Grants +120 armor and 15% less damage taken, but reduces movement speed by 20% while active.'), 'stoneskin', [mod('armor', 'flat', 120), mod('damageTaken', 'more', -0.15), mod('moveSpeed', 'increased', -0.2)]),
      [ward('stone_foundation', 'Foundation', 28),
        b(n('stone_mass', 'Heavy Foundations', 'Grants 60% increased weight while active.'), 'stoneskin', [mod('weight', 'increased', 0.6)]),
        b(n('stone_mend', 'Masonry', 'While active, regenerate 2 life per second.'), 'stoneskin', [mod('lifeRegen', 'flat', 2)])],
      [n('stone_long', 'Long Watch', '45% increased effect duration.', [mod('effectDuration', 'increased', 0.45)]),
        tap(n('stone_spring', 'Mineral Spring', 'Gains 1 charge every 10 seconds while equipped.'), 'flask_stoneskin', 10),
        clean('stone_pure', 'Purified Stone', 1)]],
    [b(tap(n('stone_barbs', 'Bottled Briars', 'Grants +24 thorns and reflects 15% of incoming hit damage while active. Gains 1 charge every 8 seconds while equipped.'), 'flask_stoneskin', 8), 'stoneskin', [mod('thorns', 'flat', 24), mod('thornsReflect', 'flat', 0.15)]),
      [b(n('stone_spines', 'Long Spines', 'Grants an additional +20 thorns.'), 'stoneskin', [mod('thorns', 'flat', 20)]),
        b(n('stone_mirror', 'Cruel Mirror', 'Reflects an additional 10% of incoming hit damage.'), 'stoneskin', [mod('thornsReflect', 'flat', 0.1)]),
        b(n('stone_armor', 'Bark Under Briars', 'Grants an additional +80 armor.'), 'stoneskin', [mod('armor', 'flat', 80)])],
      [ward('stone_cushion', 'Thorn Cushion', 24),
        b(n('stone_growth', 'Living Briars', 'While active, regenerate 3 life per second.'), 'stoneskin', [mod('lifeRegen', 'flat', 3)]),
        ready('stone_return', 'Answer Again', 0.5)]],
    [rider(tap(n('stone_fault', 'Fault in the Bottle', 'Triggers a physical tremor at your feet after 0.8 seconds with a 50% chance to stun. Gains 1 charge every 8 seconds while equipped, but has 25% less buff duration.', [mod('effectDuration', 'more', -0.25)]), 'flask_stoneskin', 8), 'flask_fault'),
      [{ ...n('stone_pressure', 'Pressure-fed', '30% chance to gain 1 charge when hit.'), chargeGain: [{ charge: 'flask_stoneskin', amount: 1, max: 3, on: 'takeHit', chance: 0.3 }] },
        ready('stone_cadence', 'Aftershock Cadence', 0.5),
        ward('stone_anchor', 'Blast Anchor', 25)],
      [spread('stone_fracture', 'Wide Fracture'),
        n('stone_break', 'Break the Bedrock', 'The tremor deals 100% more poise damage.', [mod('poiseDamage', 'more', 1)]),
        n('stone_dust', 'Grinding Dust', 'The tremor ignores 30% of enemy armor.', [mod('armorPen', 'flat', 0.3)])]],
  ], [ready('stone_practice', 'Loose Stopper', 0.1), n('stone_hold', 'Seasoned Stone', '8% increased buff duration.', [mod('effectDuration', 'increased', 0.08)])]),

  antidote_flask: flaskTree([
    [rider(n('green_company', 'Clean Company', 'Also removes 2 harmful status effects from allies within 200 radius.'), 'flask_clean_company'),
      [spread('green_circle', 'Wide Dispensary'),
        b(n('green_bless', 'Clean Shelter', 'Grants allies within 200 radius 12% less damage taken for 4 seconds.'), 'green_bless', [mod('damageTaken', 'more', -0.12)], { duration: 4, affects: 'allies', radius: 200 }),
        b(n('green_feet', 'Get Them Moving', 'Also grants affected allies 20% increased movement speed.'), 'green_bless', [mod('moveSpeed', 'increased', 0.2)], { duration: 4, affects: 'allies', radius: 200 })],
      [tap(n('green_supply', 'Supply the Ward', 'Gains 1 charge every 10 seconds while equipped.'), 'flask_antidote', 10, 2),
        reserve('green_spares', 'Spare Bandages'),
        ready('green_rounds', 'Hospital Rounds', 0.5)]],
    [b(n('green_inoculate', 'Inoculation', 'Lasts 9 seconds and grants +25% chaos resistance while active.'), 'antidote', [mod('chaosRes', 'flat', 0.25)], { duration: 9 }),
      [b(n('green_tolerance', 'Acquired Tolerance', 'Grants an additional +30% ailment resistance while active.'), 'antidote', [mod('ailmentResist', 'flat', 0.3)]),
        b(n('green_regrow', 'Regrowth', 'While active, regenerate 3 life per second.'), 'antidote', [mod('lifeRegen', 'flat', 3)]),
        b(n('green_rest', 'Nervous Recovery', 'While active, regenerate 1.5 mana per second.'), 'antidote', [mod('manaRegen', 'flat', 1.5)])],
      [clean('green_flush', 'Full Flush', 5),
        tap(n('green_culture', 'Living Culture', 'Gains 1 charge every 12 seconds while equipped.'), 'flask_antidote', 12, 2),
        ward('green_membrane', 'Protective Membrane', 25)]],
    [rider(tap(n('green_garden', 'Bitter Garden', 'Creates a poisonous ground at your cursor for 5 seconds on use. Gains 1 charge every 6 seconds while equipped, but has 25% less buff duration.', [mod('effectDuration', 'more', -0.25)]), 'flask_antidote', 6, 2), 'flask_venom_bed'),
      [spread('green_bed', 'Spread the Bed'),
        n('green_concentrate', 'Concentrated Venom', 'Poisonous ground deals 40% more damage, but has 20% less area radius.', [mod('damage', 'more', 0.4), mod('aoeRadius', 'more', -0.2)]),
        n('green_corrosion', 'Corrosive Roots', 'Poisonous ground penetrates 20% chaos resistance.', [mod('chaosPen', 'flat', 0.2)])],
      [ready('green_prune', 'Pruning Cycle', 0.7),
        b(n('green_antigen', 'Safe Handling', 'While active, regenerate 2 life per second.'), 'antidote', [mod('lifeRegen', 'flat', 2)]),
        n('green_perennial', 'Perennial Bed', '60% increased ground and buff duration.', [mod('effectDuration', 'increased', 0.6)])]],
  ], [ready('green_practice', 'Quick Uncorking', 0.1), reserve('green_shelf', 'Apothecary Shelf')]),
};
