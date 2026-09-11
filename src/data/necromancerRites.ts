import type { SkillTreeSpec } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });

/** Player rites compose the same support mechanisms as equipment. Tree grafts
 * cost no socket, deduplicate with socketed copies, and are rebuilt on respec. */
export const NECROMANCER_RITES: Record<string, SkillTreeSpec> = {
  poison_nova: tree([
    n('plague_lineage', 'Plague Lineage', 'Poison applied by this nova spreads to nearby enemies when its victim dies. Each new carrier can continue the chain.', [mod('dotPropagates', 'override', 1)]),
    [n('deep_infection', 'Deep Infection', '30% increased poison magnitude.', [mod('statusMagnitude', 'increased', 0.3, ['chaos'])]),
      n('septic_reservoirs', 'Septic Reservoirs', 'Your nova can apply three additional poison stacks to each enemy.', [mod('ailmentStacks', 'flat', 3, ['chaos'])]),
      n('parasitic_rot', 'Parasitic Rot', 'Recover life equal to 4% of damage dealt by this nova\'s poison.', [mod('dotLeech_poison', 'flat', 0.04)])],
    [n('erupting_blight', 'Erupting Blight', 'Poison ruptures on death or when its duration ends, dealing 35% of its stored total damage in a chaos explosion.', [mod('dotRupture', 'flat', 0.35)]),
      n('concentrated_culture', 'Concentrated Culture', '35% more poison magnitude, but eight fewer bolts per nova.', [mod('statusMagnitude', 'more', 0.35, ['chaos']), mod('projectileCount', 'flat', -8)]),
      n('malignant_culture', 'Malignant Culture', 'Poison can critically afflict, rolling your critical chance when applied. Gain 10% critical chance for this skill.', [mod('dotCrit', 'flat', 1), mod('critChance', 'flat', 0.1)])],
  ], [
    graft(n('returning_venom', 'Returning Venom', 'Spent venom bolts return to the point of casting and can strike again on their way home.'), 'returning'),
    [n('swift_circulation', 'Swift Circulation', 'Bolts travel 25% faster.', [mod('projectileSpeed', 'increased', 0.25)]),
      n('loose_fangs', 'Loose Fangs', 'Eight additional bolts per ring; 15% less damage.', [mod('projectileCount', 'flat', 8), mod('damage', 'more', -0.15)]),
      n('perforating_venom', 'Perforating Venom', 'Bolts pierce two additional enemies before returning.', [mod('pierceCount', 'flat', 2)])],
    [n('corrosive_flight', 'Corrosive Flight', 'Nova hits penetrate 10% chaos resistance.', [mod('chaosPen', 'flat', 0.1)]),
      n('exposed_prey', 'Exposed Prey', 'Nova hits deal 4% more damage per poison stack on their target.', [mod('damageVs_poison', 'flat', 0.04)]),
      n('inward_fangs', 'Inward Fangs', 'When a bolt completes its return, it sheds three physical shrapnel shards.', [mod('returnShrapnel', 'flat', 3)])],
  ], n('venomous_studies', 'Venomous Studies', '15% increased poison magnitude.', [mod('statusMagnitude', 'increased', 0.15, ['chaos'])])),

  despair: tree([
    graft(n('worn_grief', 'Worn Grief', 'Toggle Despair as a haze around you: 170 base radius, reapplying every 0.75 seconds at 40% latent damage. Reserves 25% maximum mana while active; press again to release it.'), 'miasma'),
    [n('shrouding_reach', 'Shrouding Reach', '30% increased haze radius.', [mod('aoeRadius', 'increased', 0.3)]),
      n('clinging_grief', 'Clinging Grief', '40% increased curse duration.', [mod('effectDuration', 'increased', 0.4)]),
      n('crushing_presence', 'Crushing Presence', '30% increased curse potency, deepening its resistance penalties.', [mod('statusMagnitude', 'increased', 0.3)])],
    [n('parting_sentence', 'Parting Sentence', 'When a curse expires or its victim dies, it ruptures for 100% of its latent chaos damage around its victim. Reapplication adds to the rupture without restarting its fuse.', [mod('curseRupture', 'flat', 1)]),
      n('brief_suffering', 'Brief Suffering', '35% less curse duration and an additional 100% latent damage on rupture. Reapplication continues to feed the same fixed fuse.', [mod('effectDuration', 'more', -0.35), mod('curseRupture', 'flat', 1)]),
      n('blackened_memory', 'Blackened Memory', '50% increased latent chaos damage, strengthening the final rupture.', [mod('damage', 'increased', 0.5, ['chaos'])])],
  ], [
    graft(n('profane_ground', 'Profane Ground', 'Place a 150-radius curse patch at your mark for 10 seconds. It reapplies every 0.6 seconds at 50% latent damage. Recasting relocates your one patch.'), 'miasmic_ground'),
    [n('inscribed_borders', 'Inscribed Borders', '25% increased patch radius and 25% increased effect duration.', [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.25)]),
      n('binding_inscription', 'Binding Inscription', '35% increased curse potency, deepening the patch\'s resistance penalties.', [mod('statusMagnitude', 'increased', 0.35)]),
      n('patient_malice', 'Patient Malice', '50% increased duration for the patch and the curses it applies.', [mod('effectDuration', 'increased', 0.5)])],
    [n('sentence_of_ruin', 'Sentence of Ruin', 'Curses rupture on death or expiry for 150% of their latent chaos damage. Reapplication postpones expiry.', [mod('curseRupture', 'flat', 1.5)]),
      n('grave_verdict', 'Grave Verdict', '60% increased latent chaos damage for the eventual rupture.', [mod('damage', 'increased', 0.6, ['chaos'])]),
      n('inevitable_end', 'Inevitable End', '25% less duration for patch and curse; add 150% latent damage to the final rupture.', [mod('effectDuration', 'more', -0.25), mod('curseRupture', 'flat', 1.5)])],
  ], n('patient_words', 'Patient Words', '15% increased curse duration and 5% increased area radius.', [mod('effectDuration', 'increased', 0.15), mod('aoeRadius', 'increased', 0.05)])),

  reap: tree([
    graft(n('grave_procession', 'Grave Procession', 'The crescent stays with you as you move. 100% increased duration; 20% more mana cost. Each crescent still strikes an enemy only once.', [mod('effectDuration', 'increased', 1)]), 'carried_edge'),
    [n('long_procession', 'Long Procession', '50% increased duration and 20% increased area radius.', [mod('effectDuration', 'increased', 0.5), mod('aoeRadius', 'increased', 0.2)]),
      n('wide_mourning', 'Wide Mourning', '40% increased crescent arc width and 20% increased area radius.', [mod('swingArc', 'increased', 0.4), mod('aoeRadius', 'increased', 0.2)]),
      n('pressing_wake', 'Pressing Wake', 'Hits knock enemies back with 45 additional strength.', [mod('knockback', 'flat', 45)])],
    [n('soul_toll', 'Soul Toll', 'Leech 6% of hit damage as life and gain 20% increased damage.', [mod('lifeLeech', 'flat', 0.06), mod('damage', 'increased', 0.2)]),
      n('gathered_souls', 'Gathered Souls', 'Restore 3 life per enemy hit by the crescent.', [mod('lifeOnHit', 'flat', 3)]),
      n('last_passage', 'Last Passage', 'Cull enemies below 8% life.', [mod('cullThreshold', 'flat', 0.08)])],
  ], [
    graft(n('echoes_of_reaping', 'Echoes of Reaping', 'Each completed Reap has a 35% chance to cast a free phantom sweep after 0.35 seconds. 15% more mana cost. The phantom uses the shared follow-up skill and cannot summon another encore.'), 'reapers_encore'),
    [n('blood_script', 'Blood Script', 'Reap hits gain 50% chance to bleed and 25% increased physical damage.', [mod('apply_bleed', 'flat', 0.5), mod('damage', 'increased', 0.25, ['physical'])]),
      n('deep_script', 'Deep Script', '45% increased physical ailment magnitude and 25% increased effect duration.', [mod('statusMagnitude', 'increased', 0.45, ['physical']), mod('effectDuration', 'increased', 0.25)]),
      n('blood_inheritance', 'Blood Inheritance', 'Reap bleeds spread when their victim dies, creating new carriers.', [mod('dotPropagates', 'override', 1)])],
    [n('restless_harvest', 'Restless Harvest', '35% increased cooldown recovery and 15% increased attack speed.', [mod('cooldownRecovery', 'increased', 0.35), mod('attackSpeed', 'increased', 0.15)]),
      n('certain_stroke', 'Certain Stroke', '10% additional critical chance and 25% increased accuracy.', [mod('critChance', 'flat', 0.1), mod('accuracy', 'increased', 0.25)]),
      n('heavy_remembrance', 'Heavy Remembrance', '35% more damage at 15% less attack speed.', [mod('damage', 'more', 0.35), mod('attackSpeed', 'more', -0.15)])],
  ], n('practiced_reaping', 'Practiced Reaping', '15% increased damage.', [mod('damage', 'increased', 0.15)])),

  whirling_reap: tree([
    n('bloodwheel', 'Bloodwheel', 'Turn the close six-stroke circle into a blood harvest: 50% chance to bleed and 5% of hit damage leeched as life.', [mod('apply_bleed', 'flat', 0.5), mod('lifeLeech', 'flat', 0.05)]),
    [n('red_measure', 'Red Measure', '35% increased physical ailment magnitude.', [mod('statusMagnitude', 'increased', 0.35, ['physical'])]),
      n('layered_wounds', 'Layered Wounds', 'Apply two additional bleed stacks per enemy.', [mod('ailmentStacks', 'flat', 2, ['physical'])]),
      n('opened_wounds', 'Opened Wounds', 'Bleeds rupture on death or expiry for 40% of their stored total damage in a physical explosion.', [mod('dotRupture', 'flat', 0.4)])],
    [n('unbroken_turn', 'Unbroken Turn', '30% increased cooldown recovery and 20% increased accuracy.', [mod('cooldownRecovery', 'increased', 0.3), mod('accuracy', 'increased', 0.2)]),
      n('blood_paid', 'Blood Paid', 'Restore 2 life on every landed stroke.', [mod('lifeOnHit', 'flat', 2)]),
      n('reapers_rhythm', 'Reaper\'s Rhythm', '30% increased attack speed and 15% increased damage.', [mod('attackSpeed', 'increased', 0.3), mod('damage', 'increased', 0.15)])],
  ], [
    graft(n('unbound_wheel', 'Unbound Wheel', 'Each of the six arcs leaves your hands as a traveling crescent, hitting each enemy once per wave. 20% less damage and 35% more mana cost. Duration investment extends travel.'), 'sweeping_blow'),
    [n('far_harvest', 'Far Harvest', '40% increased sweep travel and 20% increased effect duration.', [mod('sweepRange', 'increased', 0.4), mod('effectDuration', 'increased', 0.2)]),
      n('broad_horizon', 'Broad Horizon', '30% increased area radius and 20% increased arc width.', [mod('aoeRadius', 'increased', 0.3), mod('swingArc', 'increased', 0.2)]),
      n('shattering_front', 'Shattering Front', 'Waves knock enemies back with 50 additional strength.', [mod('knockback', 'flat', 50)])],
    [n('measured_release', 'Measured Release', '30% increased damage and 15% increased cooldown recovery.', [mod('damage', 'increased', 0.3), mod('cooldownRecovery', 'increased', 0.15)]),
      n('execution_circle', 'Execution Circle', 'Cull enemies below 8% life and gain 5% critical chance.', [mod('cullThreshold', 'flat', 0.08), mod('critChance', 'flat', 0.05)]),
      n('weight_of_silence', 'Weight of Silence', '35% more damage, with 15% less attack speed.', [mod('damage', 'more', 0.35), mod('attackSpeed', 'more', -0.15)])],
  ], n('balanced_grip', 'Balanced Grip', '12% increased damage and 5% increased accuracy.', [mod('damage', 'increased', 0.12), mod('accuracy', 'increased', 0.05)])),
};
