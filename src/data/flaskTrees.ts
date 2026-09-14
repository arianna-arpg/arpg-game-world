import type { SkillTreeNode, SkillTreeSpec, TreeBuffPatch, TreeUtilityEffect } from '../engine/skills';
import { mod, type Modifier } from '../engine/stats';
import { n, type Node, type Limb } from './skillTreeBuilder';

// Three exclusive trunks, two additive branches per trunk, two terminal
// choices per branch. Two independent practice nodes keep ordinary drinks useful.
const flaskTree = (limbs: Limb[], passives: Node[]): SkillTreeSpec => {
  const nodes: SkillTreeNode[] = passives.map((p, i) => ({ ...p, ranks: 3,
    description: p.description + ' Per rank; 3 ranks.', x: -85 + i * 170, y: 100 }));
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
const spread = (id: string, name: string, v = 0.3) => n(id, name, `${v * 100}% increased payload area radius.`, [mod('aoeRadius', 'increased', v)]);
const ward = (id: string, name: string, amount: number) => fx(n(id, name, `Each drink grants ${amount} decaying Ward.`), { type: 'ward', amount });
const clean = (id: string, name: string, count: number) => fx(n(id, name, `Each drink removes ${count} additional harmful status entries; beneficial statuses stay.`), { type: 'cleanse', count });
const reserve = (id: string, name: string) => n(id, name, '+1 maximum charge.', [mod('chargeCap', 'flat', 1)]);
const restore = (id: string, name: string, v: number) => n(id, name, `${v * 100}% increased restoration.`, [mod('restorePower', 'increased', v)]);

export const FLASK_TREES: Record<string, SkillTreeSpec> = {
  life_flask: flaskTree([
    [n('red_triage', 'Triage', 'Surge restores an extra 8% of maximum life; settle restores 35% less. Front-load the emergency.', [mod('pourPct_surge', 'flat', 0.08), mod('pourPower_settle', 'more', -0.35)]),
      [clean('red_stitch', 'Wash the Wound', 1),
        clean('red_surgery', 'Field Surgery', 2),
        b(n('red_brace', 'Brace for Impact', 'Drink grants 18% less damage taken until the next landed hit, for 5 base seconds.'), 'red_brace', [mod('damageTaken', 'more', -0.18)], { duration: 5, consumeOn: { on: 'hurt' } })],
      [ready('red_urgency', 'Urgency'),
        fx(n('red_poise', 'Catch Your Breath', 'Restore 20 poise immediately. Requires a poise pool.'), { type: 'restore', resource: 'poise', amount: 20 }),
        n('red_lastlight', 'Last Light', 'An additional 7% of maximum life joins the surge, but the whole drink has 20% less restoration.', [mod('pourPct_surge', 'flat', 0.07), mod('restorePower', 'more', -0.2)])]],
    [n('red_cellar', 'Living Reserve', 'Bank one primed drink at full life; it opens on the first wound. Settle restores 35% more but all pour windows last 50% longer.', [mod('pourPrime', 'flat', 1), mod('pourPower_settle', 'more', 0.35), mod('effectDuration', 'more', 0.5)]),
      [n('red_cork', 'Second Cork', 'Bank one additional primed drink.', [mod('pourPrime', 'flat', 1)]),
        reserve('red_bottle', 'Spare Bottle'),
        clean('red_release', 'Sterile Reserve', 2)],
      [b(n('red_overflow', 'Clotting Reserve', 'During the pour, 40% of overhealing becomes an absorption ward. Lasts 8 base seconds.'), 'red_overflow', [mod('overheal', 'flat', 0.4)], { duration: 8 }),
        b(n('red_knit', 'Slow Knitting', 'The clotting window also grants 25% increased healing received.'), 'red_overflow', [mod('healTaken', 'increased', 0.25)]),
        tap(n('red_ferment', 'Quiet Fermentation', 'While slotted, recover one Life charge every 12 seconds, even from empty.'), 'flask_life', 12)]],
    [rider(tap(n('red_bloom', 'Blood Bloom', 'Every drink bursts nearby enemies with physical damage and bleeding. Drink at full life; restore 25% less. While slotted, recover one charge every 4 seconds.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.25)]), 'flask_life', 4), 'flask_blood_bloom'),
      [spread('red_petals', 'Spreading Petals'),
        n('red_open', 'Open Veins', 'The bloom gains 20% armor penetration.', [mod('armorPen', 'flat', 0.2)]),
        n('red_weight', 'Weight of Blood', 'The bloom deals 80% more poise damage.', [mod('poiseDamage', 'more', 0.8)])],
      [b(n('red_bloodguard', 'Bloodguard', 'Each drink grants 12% less damage taken for 6 base seconds, keeping the close-range route tenable.'), 'red_bloodguard', [mod('damageTaken', 'more', -0.12)], { duration: 6 }),
        restore('red_reclaim', 'Reclaim the Blood', 0.35),
        n('red_rupture', 'Ruptured Vessel', 'The bloom deals 45% more damage; the drink restores a further 25% less.', [mod('damage', 'more', 0.45), mod('restorePower', 'more', -0.25)])]],
  ], [restore('red_practice', 'Careful Measures', 0.1), ready('red_wrist', 'Ready Wrist', 0.1)]),

  mana_flask: flaskTree([
    [b(n('blue_clarity', 'Clarity', 'After drinking, your next spell costs 40% less mana, within 8 base seconds. The pour stays intact.'), 'blue_clarity', [mod('manaCost', 'more', -0.4, ['spell'])], { duration: 8, consumeOn: { on: 'use', tags: ['spell'] } }),
      [b(n('blue_intent', 'Clear Intent', 'The prepared spell also casts 35% faster.'), 'blue_clarity', [mod('castSpeed', 'increased', 0.35, ['spell'])]),
        b(n('blue_focus', 'Focused Thought', 'The prepared spell deals 25% more damage.'), 'blue_clarity', [mod('damage', 'more', 0.25, ['spell'])]),
        b(n('blue_reach', 'Far Thought', 'The prepared spell has 30% increased area radius.'), 'blue_clarity', [mod('aoeRadius', 'increased', 0.3, ['spell'])])],
      [tap(n('blue_study', 'Between Pages', 'While slotted, recover one Mana charge every 12 seconds.'), 'flask_mana', 12),
        reserve('blue_ink', 'Spare Ink'),
        restore('blue_script', 'Unbroken Script', 0.3)]],
    [fx(n('blue_reservoir', 'Protective Reservoir', 'Every drink grants 18 decaying Ward. Drinkable at full mana; restores 20% less mana.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.2)]), { type: 'ward', amount: 18 }),
      [ward('blue_shell', 'Glass Shell', 14),
        b(n('blue_insulate', 'Insulated Glass', 'Each drink grants +25% lightning resistance for 8 base seconds; normal resistance caps apply.'), 'blue_insulate', [mod('lightningRes', 'flat', 0.25)], { duration: 8 }),
        fx(n('blue_shield', 'Restart the Shield', 'Restore 12 Energy Shield and restart its recharge delay immediately; needs an ES pool.'), { type: 'restore', resource: 'es', amount: 12, resetEsDelay: true })],
      [n('blue_drip', 'Patient Reservoir', 'Pour windows last twice as long; restore 35% more. Ward still arrives immediately.', [mod('effectDuration', 'more', 1), mod('restorePower', 'more', 0.35)]),
        tap(n('blue_condense', 'Condensation', 'While slotted, recover one Mana charge every 10 seconds.'), 'flask_mana', 10),
        clean('blue_filter', 'Clear Water', 1)]],
    [rider(tap(n('blue_lance', 'Galvanic Decant', 'Every drink fires an aimed lightning bolt piercing two enemies. Drink at full mana; restore 35% less. Recover one charge every 3 seconds while slotted.', [mod('thirstless', 'flat', 1), mod('restorePower', 'more', -0.35)]), 'flask_mana', 3), 'flask_mana_lance'),
      [n('blue_fork', 'Twin Mouth', 'Fire one additional bolt, each dealing 20% less damage.', [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)]),
        n('blue_pierce', 'Through the Ranks', 'Bolts pierce two additional enemies.', [mod('pierceCount', 'flat', 2)]),
        n('blue_fast', 'Needle Jet', 'Bolts travel 45% faster.', [mod('projectileSpeed', 'increased', 0.45)])],
      [n('blue_shock', 'Charged Solvent', 'Bolts gain 45% chance to shock.', [mod('apply_shock', 'flat', 0.45)]),
        n('blue_ground', 'Break Insulation', 'Bolts penetrate 20% lightning resistance.', [mod('lightningPen', 'flat', 0.2)]),
        ward('blue_feedback', 'Safe Discharge', 18)]],
  ], [restore('blue_practice', 'Exact Measure', 0.1), reserve('blue_shelf', 'Ink Shelf')]),

  catalyst_flask: flaskTree([
    [n('gold_measure', 'Measured Mixture', 'Spend exactly one charge. Native per-charge life and mana pours deliver one unit; retain the full transmutation high.', undefined, { chargeCost: { charge: 'flask_catalyst', amount: 1 } }),
      [tap(n('gold_still', 'Bench Still', 'Recover one Catalyst charge every 8 seconds while slotted.', undefined), 'flask_catalyst', 8, 6),
        reserve('gold_vials', 'Sample Vials'),
        ready('gold_sips', 'Tasting Cadence', 0.5)],
      [b(n('gold_balance', 'Balanced Tonic', 'The high also regenerates 1 life and 1 mana per second.'), 'catalyst_high', [mod('lifeRegen', 'flat', 1), mod('manaRegen', 'flat', 1)]),
        clean('gold_filter', 'Paper Filter', 1),
        ward('gold_seal', 'Wax Seal', 16)]],
    [n('gold_grand', 'Grand Transmutation', 'Keep the whole-bank gulp, with minimum 4 charges. Each charge restores 60% more life and mana.', [mod('restorePower', 'more', 0.6)], { chargeCost: { charge: 'flask_catalyst', amount: 'all', minimum: 4 } }),
      [n('gold_vat', 'Deep Vat', '+3 maximum Catalyst charges.', [mod('chargeCap', 'flat', 3)]),
        fx(n('gold_ward', 'Golden Shell', 'Gain 7 decaying Ward per charge actually consumed.'), { type: 'ward', amount: 7, perCharge: true }),
        tap(n('gold_age', 'Patient Distillation', 'Recover one Catalyst charge every 3 seconds while slotted.', undefined), 'flask_catalyst', 3, 6)],
      [b(n('gold_savor', 'Savor the High', 'The high also grants 15% increased attack and cast speed.'), 'catalyst_high', [mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)]),
        b(n('gold_prism', 'Prismatic Skin', 'The high also grants +20% fire, cold and lightning resistance.'), 'catalyst_high', [mod('fireRes', 'flat', 0.2), mod('coldRes', 'flat', 0.2), mod('lightningRes', 'flat', 0.2)]),
        n('gold_linger', 'Long Finish', 'The high and pours last 50% longer; total restoration is conserved.', [mod('effectDuration', 'more', 0.5)])]],
    [rider(tap(n('gold_retort', 'Volatile Retort', 'The whole-bank gulp throws a delayed fire blast at your aim, damage per charge spent. Restore 40% less. Recover one charge every 2 seconds while slotted; still needs at least two.', [mod('restorePower', 'more', -0.4)]), 'flask_catalyst', 2, 6), 'flask_volatile_bomb', true),
      [spread('gold_scatter', 'Wide Retort'),
        n('gold_ignite', 'Hot Residue', 'The blast gains 70% chance to ignite.', [mod('apply_burn', 'flat', 0.7)]),
        n('gold_pressure', 'Under Pressure', 'Blast hits knock enemies back with 90 strength.', [mod('knockback', 'flat', 90)])],
      [n('gold_battery', 'Large Batch', '+3 maximum charges; wait longer for a larger blast.', [mod('chargeCap', 'flat', 3)]),
        n('gold_fire', 'White Heat', 'The blast penetrates 20% fire resistance.', [mod('firePen', 'flat', 0.2)]),
        fx(n('gold_slag', 'Cooling Slag', 'Each spent charge grants 5 decaying Ward.'), { type: 'ward', amount: 5, perCharge: true })]],
  ], [restore('gold_practice', 'Clean Glass', 0.1), ready('gold_wrist', 'Steady Decant', 0.1)]),

  quicksilver_flask: flaskTree([
    [b(n('silver_road', 'Open Road', 'The speed buff lasts 8 base seconds but ends when a hit lands on you. It also grants phasing through bodies.'), 'quicksilver', [mod('phasing', 'flat', 1)], { duration: 8, clearOnHit: true }),
      [tap(n('silver_way', 'Roadside Condenser', 'Recover one Quicksilver charge every 10 seconds while slotted.'), 'flask_quicksilver', 10),
        reserve('silver_satchel', 'Traveller’s Satchel'),
        ready('silver_depart', 'Early Departure')],
      [b(n('silver_stride', 'Long Stride', 'The speed buff grants a further 25% increased movement speed.'), 'quicksilver', [mod('moveSpeed', 'increased', 0.25)]),
        clean('silver_wash', 'Wash Off the Road', 1),
        b(n('silver_breath', 'Walking Breath', 'While the speed buff holds, regenerate 2 life per second.'), 'quicksilver', [mod('lifeRegen', 'flat', 2)])]],
    [b(n('silver_duelist', 'Slippery Footwork', 'The speed buff grants +180 flat evasion, but its base duration is only 3 seconds.'), 'quicksilver', [mod('evasion', 'flat', 180)], { duration: 3 }),
      [b(n('silver_slip', 'Slip the Blow', 'While the speed buff holds, gain 6 life per evaded attack.'), 'quicksilver', [mod('lifeOnEvade', 'flat', 6)]),
        b(n('silver_grace', 'Grace Under Pressure', 'While the speed buff holds, take 10% less damage.'), 'quicksilver', [mod('damageTaken', 'more', -0.1)]),
        b(n('silver_hands', 'Quick Hands', 'While the speed buff holds, gain 20% increased attack and cast speed.'), 'quicksilver', [mod('attackSpeed', 'increased', 0.2), mod('castSpeed', 'increased', 0.2)])],
      [ready('silver_second', 'Second Step', 0.7),
        tap(n('silver_recover', 'Recover Your Footing', 'Recover one Quicksilver charge every 7 seconds while slotted.'), 'flask_quicksilver', 7),
        ward('silver_glass', 'Breakaway Glass', 20)]],
    [rider(tap(n('silver_wake', 'Mercury Wake', 'Drinking leaves a chilling pool at your feet. Recover a charge every 8 seconds while slotted; speed buff is unchanged.'), 'flask_quicksilver', 8), 'flask_cold_wake'),
      [{ ...n('silver_tracks', 'Frozen Tracks', 'Walk 600 units to recover one charge. Deliberate walking counts; teleports and pushes do not.'), chargeGain: [{ charge: 'flask_quicksilver', amount: 1, max: 3, on: 'move', perDistance: 600 }] },
        ready('silver_lap', 'Another Lap', 0.5),
        b(n('silver_lure', 'Lure the Pursuit', 'While the speed buff holds, gain an additional 20% movement speed.'), 'quicksilver', [mod('moveSpeed', 'increased', 0.2)])],
      [spread('silver_pool', 'Broad Wake'),
        n('silver_freeze', 'Flash Freeze', 'Wake hits gain 25% chance to freeze.', [mod('apply_frozen', 'flat', 0.25)]),
        n('silver_deep', 'Deep Frost', 'The wake deals 50% more damage, but the speed buff and pool last 25% less time.', [mod('damage', 'more', 0.5), mod('effectDuration', 'more', -0.25)])]],
  ], [ready('silver_practice', 'Unstoppered', 0.1), n('silver_time', 'Lingering Cool', '8% increased buff and pool duration.', [mod('effectDuration', 'increased', 0.08)])]),

  stoneskin_flask: flaskTree([
    [b(n('stone_bastion', 'Drink the Mountain', 'The hide adds 120 flat armor and 15% less damage taken, but slows movement by 20% while active.'), 'stoneskin', [mod('armor', 'flat', 120), mod('damageTaken', 'more', -0.15), mod('moveSpeed', 'increased', -0.2)]),
      [ward('stone_foundation', 'Foundation', 28),
        b(n('stone_mass', 'Heavy Foundations', 'The hide grants 60% increased weight, resisting displacement.'), 'stoneskin', [mod('weight', 'increased', 0.6)]),
        b(n('stone_mend', 'Masonry', 'While the hide holds, regenerate 2 life per second.'), 'stoneskin', [mod('lifeRegen', 'flat', 2)])],
      [n('stone_long', 'Long Watch', 'Buffs last 45% longer.', [mod('effectDuration', 'increased', 0.45)]),
        tap(n('stone_spring', 'Mineral Spring', 'Recover one Stoneskin charge every 10 seconds while slotted.'), 'flask_stoneskin', 10),
        clean('stone_pure', 'Purified Stone', 1)]],
    [b(tap(n('stone_barbs', 'Bottled Briars', 'The hide grants 24 thorns and reflects 15% of landed wound damage. Recover one charge every 8 seconds while slotted.'), 'flask_stoneskin', 8), 'stoneskin', [mod('thorns', 'flat', 24), mod('thornsReflect', 'flat', 0.15)]),
      [b(n('stone_spines', 'Long Spines', 'The hide gains 20 additional thorns.'), 'stoneskin', [mod('thorns', 'flat', 20)]),
        b(n('stone_mirror', 'Cruel Mirror', 'The hide reflects an additional 10% of landed wound damage.'), 'stoneskin', [mod('thornsReflect', 'flat', 0.1)]),
        b(n('stone_armor', 'Bark Under Briars', 'The hide also adds 80 flat armor.'), 'stoneskin', [mod('armor', 'flat', 80)])],
      [ward('stone_cushion', 'Thorn Cushion', 24),
        b(n('stone_growth', 'Living Briars', 'While the hide holds, regenerate 3 life per second.'), 'stoneskin', [mod('lifeRegen', 'flat', 3)]),
        ready('stone_return', 'Answer Again', 0.5)]],
    [rider(tap(n('stone_fault', 'Fault in the Bottle', 'Drinking plants a strong physical blast at your feet after 0.8 seconds, with 50% stun chance. Recover one charge every 8 seconds while slotted. Hide lasts 25% less time.', [mod('effectDuration', 'more', -0.25)]), 'flask_stoneskin', 8), 'flask_fault'),
      [{ ...n('stone_pressure', 'Pressure-fed', 'Suffering a landed hit has a 30% chance to bank a charge. Generated secondary hits cannot feed it.'), chargeGain: [{ charge: 'flask_stoneskin', amount: 1, max: 3, on: 'takeHit', chance: 0.3 }] },
        ready('stone_cadence', 'Aftershock Cadence', 0.5),
        ward('stone_anchor', 'Blast Anchor', 25)],
      [spread('stone_fracture', 'Wide Fracture'),
        n('stone_break', 'Break the Bedrock', 'Blast deals 100% more poise damage.', [mod('poiseDamage', 'more', 1)]),
        n('stone_dust', 'Grinding Dust', 'Blast ignores 30% armor.', [mod('armorPen', 'flat', 0.3)])]],
  ], [ready('stone_practice', 'Loose Stopper', 0.1), n('stone_hold', 'Seasoned Stone', '8% increased buff duration.', [mod('effectDuration', 'increased', 0.08)])]),

  antidote_flask: flaskTree([
    [rider(n('green_company', 'Clean Company', 'Each drink also cleanses two harmful status entries from allies within 200 units, including you. Ordinary three-entry self cleanse stays.'), 'flask_clean_company'),
      [spread('green_circle', 'Wide Dispensary'),
        b(n('green_bless', 'Clean Shelter', 'Allies within 200 units also gain 12% less damage taken for 4 base seconds.'), 'green_bless', [mod('damageTaken', 'more', -0.12)], { duration: 4, affects: 'allies', radius: 200 }),
        b(n('green_feet', 'Get Them Moving', 'The clean shelter also grants 20% increased movement speed.'), 'green_bless', [mod('moveSpeed', 'increased', 0.2)], { duration: 4, affects: 'allies', radius: 200 })],
      [tap(n('green_supply', 'Supply the Ward', 'Recover one Antidote charge every 10 seconds while slotted.'), 'flask_antidote', 10, 2),
        reserve('green_spares', 'Spare Bandages'),
        ready('green_rounds', 'Hospital Rounds', 0.5)]],
    [b(n('green_inoculate', 'Inoculation', 'Antidote resistance buff lasts 9 base seconds and also grants +25% chaos resistance. This is resistance, not immunity.'), 'antidote', [mod('chaosRes', 'flat', 0.25)], { duration: 9 }),
      [b(n('green_tolerance', 'Acquired Tolerance', 'The buff grants an additional 30% ailment resistance, subject to the 90% cap.'), 'antidote', [mod('ailmentResist', 'flat', 0.3)]),
        b(n('green_regrow', 'Regrowth', 'While the buff holds, regenerate 3 life per second.'), 'antidote', [mod('lifeRegen', 'flat', 3)]),
        b(n('green_rest', 'Nervous Recovery', 'While the buff holds, regenerate 1.5 mana per second.'), 'antidote', [mod('manaRegen', 'flat', 1.5)])],
      [clean('green_flush', 'Full Flush', 5),
        tap(n('green_culture', 'Living Culture', 'Recover one Antidote charge every 12 seconds while slotted.'), 'flask_antidote', 12, 2),
        ward('green_membrane', 'Protective Membrane', 25)]],
    [rider(tap(n('green_garden', 'Bitter Garden', 'Each drink plants an aimed poisonous bed for 5 base seconds. Recover one charge every 6 seconds while slotted. Antidote protection lasts 25% less time.', [mod('effectDuration', 'more', -0.25)]), 'flask_antidote', 6, 2), 'flask_venom_bed'),
      [spread('green_bed', 'Spread the Bed'),
        n('green_concentrate', 'Concentrated Venom', 'Bed deals 40% more damage, but its radius is 20% smaller.', [mod('damage', 'more', 0.4), mod('aoeRadius', 'more', -0.2)]),
        n('green_corrosion', 'Corrosive Roots', 'Bed hits penetrate 20% chaos resistance.', [mod('chaosPen', 'flat', 0.2)])],
      [ready('green_prune', 'Pruning Cycle', 0.7),
        b(n('green_antigen', 'Safe Handling', 'While Antidote holds, regenerate 2 life per second.'), 'antidote', [mod('lifeRegen', 'flat', 2)]),
        n('green_perennial', 'Perennial Bed', 'Bed and protection last 60% longer; damage per tick stays fixed.', [mod('effectDuration', 'increased', 0.6)])]],
  ], [ready('green_practice', 'Quick Uncorking', 0.1), reserve('green_shelf', 'Apothecary Shelf')]),
};
