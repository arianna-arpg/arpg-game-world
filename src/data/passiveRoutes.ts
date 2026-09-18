// Reusable event powers for the Star's physical routes. No node ids enter the
// executor: equipment, monsters and skill trees can grant these same proc stats.
import { gaugeMod, linkMod, mod, type Modifier } from '../engine/stats';
import type { PassiveChoiceOption } from './passiveChoices';
import { registerProc, type ProcDef } from './procs';

const accent = (id: string, name: string, description: string, ...mods: Modifier[]): PassiveChoiceOption =>
  ({ id, name, description, mods });
export const ROUTE_PROCS: ProcDef[] = [];
function event(id: string, name: string, description: string, def: Omit<ProcDef, 'id' | 'name' | 'color'>): PassiveChoiceOption {
  const proc: ProcDef = { id: `route_${id}`, name, color: '#b7d6a0', ...def };
  ROUTE_PROCS.push(proc);
  registerProc(proc);
  return accent(id, name, description + ' 95% trigger chance.', mod(`proc_${proc.id}`, 'flat', 1));
}

/** Six new interactions per school: two bounded event powers and four
 *  complementary investments. Numbers, gates and payloads are ordinary data. */
export const ROUTE_ACCENTS: Record<string, PassiveChoiceOption[]> = {
  impact: [
    event('breach_spell', 'Spell Through the Breach', 'Breaking enemy poise prepares your next spell hit within 5s: 25% more damage. Can prepare once every 3s.',
      { trigger: 'poiseBreakDealt', icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_breach_spell', duration: 5, consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', .25, ['spell'])] } } }),
    event('collision_mana', 'The Wall Pays Back', 'An enemy colliding with terrain from your displacement restores 6% of maximum mana, at most once every 2s.',
      { trigger: 'collision', icd: 2, effect: { type: 'restore', resource: 'mana', pctMax: .06 } }),
    accent('weight_guard', 'Mass Behind the Shield', 'Gain flat guard strength equal to 0.1% of your flat weight baseline.', linkMod('guardStrength', 'weight', .001)),
    accent('broken_cast', 'Cast from the Rubble', 'While your own poise is broken: 16% increased cast speed and 12% increased healing received.', mod('castSpeed', 'increased', .16, undefined, 'poiseBroken'), mod('healTaken', 'increased', .12, undefined, 'poiseBroken')),
    accent('press_guard', 'Crowd the Shield', '2% increased guard strength per nearby enemy, up to the shared nearby-enemy cap.', gaugeMod('guardStrength', 'increased', .02, 'foes:near')),
    accent('recover_breach', 'Breach and Breathe', 'After being healed: 18% increased poise damage.', mod('poiseDamage', 'increased', .18, undefined, 'recentlyHealed')),
  ],
  tempo: [
    event('evade_clock', 'Borrow the Miss', 'Evading removes 0.6s from your running movement-skill cooldowns, at most once every 2s.',
      { trigger: 'evade', icd: 2, effect: { type: 'cooldown', seconds: .6, tags: ['movement'] } }),
    event('varied_ward', 'Shelter in Variation', 'Completing a skill while your recent sequence is varied grants ward equal to 3% of maximum life, at most once every 3s.',
      { trigger: 'cast', when: 'comboVaried', icd: 3, effect: { type: 'ward', pctMaxLife: .03 } }),
    accent('repeated_reach', 'Widen the Refrain', 'While your sequence repeats: 14% increased area of effect.', mod('aoeRadius', 'increased', .14, undefined, 'comboRepeated')),
    accent('varied_crit', 'Unfamiliar Angle', 'While your sequence is varied: +12% critical strike multiplier.', mod('critMulti', 'flat', .12, undefined, 'comboVaried')),
    accent('crit_heal', 'The Graceful Cut', 'After a critical hit: 15% increased healing power.', mod('healPower', 'increased', .15, undefined, 'recentlyCrit')),
    accent('evade_poise', 'Loose Footing, Steady Hands', 'After evading: 18% increased poise recovery rate.', mod('poiseRegenPct', 'increased', .18, undefined, 'recentlyEvaded')),
  ],
  arcana: [
    event('filled_spell', 'A Full Vessel Spills', 'When energy shield fills, prepare your next spell hit within 6s: 20% more damage. Can prepare once every 4s.',
      { trigger: 'esFilled', icd: 4, effect: { type: 'buff', buff: { type: 'buff', id: 'route_filled_spell', duration: 6, consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', .20, ['spell'])] } } }),
    event('empty_footing', 'Spend Mana, Find Footing', 'Completing a spell at low mana restores 8% of maximum poise, at most once every 3s. Requires a poise pool.',
      { trigger: 'cast', tags: ['spell'], when: 'lowMana', icd: 3, effect: { type: 'restore', resource: 'poise', pctMax: .08 } }),
    accent('shield_cast', 'Cast into the Gap', '1.5% increased cast speed per 10% missing energy shield.', gaugeMod('castSpeed', 'increased', .015, 'es:missing')),
    accent('mana_heal', 'Well of Kindness', 'Gain flat life regeneration equal to 0.2% of your flat maximum mana baseline.', linkMod('lifeRegen', 'mana', .002)),
    accent('flow_aim', 'Aim in the Current', 'While energy shield recharges: 15% increased projectile speed.', mod('projectileSpeed', 'increased', .15, undefined, 'esRecharging')),
    accent('reserve_ward', 'Reserve for Tomorrow', 'At full mana: 18% increased ward gained.', mod('wardGain', 'increased', .18, undefined, 'fullMana')),
  ],
  host: [
    event('funeral_clock', 'The Empty Place', 'When your summon dies, remove 0.4s from running summon-skill cooldowns, at most once every 2s.',
      { trigger: 'minionDeath', icd: 2, effect: { type: 'cooldown', seconds: .4, tags: ['summon'] } }),
    event('summon_ward', 'Welcome the Newcomer', 'Completing a summon skill grants ward equal to 3% of maximum life, at most once every 4s.',
      { trigger: 'cast', tags: ['summon'], icd: 4, effect: { type: 'ward', pctMaxLife: .03 } }),
    accent('pack_mend', 'Many Hands Mend', '1% increased healing received per living summon, up to the shared minion cap.', gaugeMod('healTaken', 'increased', .01, 'minions')),
    accent('safe_birth', 'A Quiet Nursery', 'While not hit recently, new summons inherit 14% increased maximum life.', mod('minionLife', 'increased', .14, undefined, 'notHurtRecently')),
    accent('wounded_keeper', 'A Keeper in Need', 'Summon skills cost 1.5% less mana per 10% missing life (additive increased-cost reduction).', gaugeMod('manaCost', 'increased', -.015, 'life:missing', ['summon'])),
    accent('company_ward', 'Shelter of the Host', '1% increased ward gained per nearby ally, up to the shared nearby-ally cap.', gaugeMod('wardGain', 'increased', .01, 'allies:near')),
  ],
  guile: [
    event('back_mana', 'Pick Their Pocket', 'Hitting an enemy from behind restores 3% of maximum mana, at most once every 2s.',
      { trigger: 'hit', vs: ['behind'], icd: 2, effect: { type: 'restore', resource: 'mana', pctMax: .03 } }),
    event('move_needle', 'Needle After the Step', 'Completing a movement skill prepares your next projectile hit within 4s: +10% critical chance. Can prepare once every 3s.',
      { trigger: 'cast', tags: ['movement'], icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_move_needle', duration: 4, consumeOn: { on: 'hit', tags: ['projectile'] }, mods: [mod('critChance', 'flat', .10, ['projectile'])] } } }),
    accent('still_ailment', 'Wait for the Vein', 'While stationary: +8% ailment chance.', mod('statusChance', 'flat', .08, undefined, 'stationary')),
    accent('wounded_stride', 'Keep the Exit Open', 'After killing: 10% increased movement speed.', mod('moveSpeed', 'increased', .10, undefined, 'recentlyKilled')),
    accent('behind_poise', 'Cut the Supporting Leg', '20% increased poise damage against enemies struck from behind.', mod('poiseDamage', 'increased', .20, ['vs:behind'])),
    accent('empty_evasion', 'Travel Light', '1.5% increased evasion per 10% missing mana.', gaugeMod('evasion', 'increased', .015, 'mana:missing')),
  ],
  devices: [
    event('device_clock', 'Tools for the Next Step', 'Completing a construct skill removes 0.5s from running movement-skill cooldowns, at most once every 3s.',
      { trigger: 'cast', tags: ['construct'], icd: 3, effect: { type: 'cooldown', seconds: .5, tags: ['movement'] } }),
    event('evade_device', 'Build in the Blind Spot', 'Evading prepares your next construct use within 5s: 25% less mana cost. Can prepare once every 3s.',
      { trigger: 'evade', icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_evade_device', duration: 5, consumeOn: { on: 'use', tags: ['construct'] }, mods: [mod('manaCost', 'more', -.25, ['construct'])] } } }),
    accent('crowd_tools', 'An Answer for Everyone', 'Constructs deal 2% increased damage per nearby enemy, up to the shared nearby-enemy cap.', gaugeMod('damage', 'increased', .02, 'foes:near', ['construct'])),
    accent('mobile_workshop', 'Workshop on the Run', 'After a movement skill: 15% increased cast speed for construct skills.', mod('castSpeed', 'increased', .15, ['construct'], 'recentlyMoved')),
    accent('reserve_tools', 'Carefully Packed', 'At full mana: constructs have 20% increased effect duration.', mod('effectDuration', 'increased', .20, ['construct'], 'fullMana')),
    accent('patient_tools', 'Survey the Ground', 'While stationary: 12% increased area of effect for construct skills.', mod('aoeRadius', 'increased', .12, ['construct'], 'stationary')),
  ],
  bastion: [
    event('block_clock', 'Make Room to Leave', 'Blocking removes 0.5s from running movement-skill cooldowns, at most once every 2s.',
      { trigger: 'block', icd: 2, effect: { type: 'cooldown', seconds: .5, tags: ['movement'] } }),
    event('rearmed_ward', 'Stand Again', 'When broken poise re-arms, gain ward equal to 6% of maximum life, at most once every 5s.',
      { trigger: 'poiseRearmed', icd: 5, effect: { type: 'ward', pctMaxLife: .06 } }),
    accent('guard_thorns', 'A Patient Rebuke', 'While guarding: 20% increased thorns.', mod('thorns', 'increased', .20, undefined, 'guarding')),
    accent('wounded_guard', 'Hold the Last Line', '2% increased guard strength per 10% missing life.', gaugeMod('guardStrength', 'increased', .02, 'life:missing')),
    accent('healed_stance', 'Mended Resolve', 'After being healed: 20% increased poise recovery rate.', mod('poiseRegenPct', 'increased', .20, undefined, 'recentlyHealed')),
    accent('shield_healing', 'Mercy Behind the Wall', 'While guarding: 15% increased healing received.', mod('healTaken', 'increased', .15, undefined, 'guarding')),
  ],
  chorus: [
    event('heal_clock', 'Mending Buys Time', 'Being healed removes 0.3s from running movement-skill cooldowns, at most once every 3s.',
      { trigger: 'heal', icd: 3, effect: { type: 'cooldown', seconds: .3, tags: ['movement'] } }),
    event('block_mana', 'A Breath Between Blows', 'Blocking restores 4% of maximum mana, at most once every 3s.',
      { trigger: 'block', icd: 3, effect: { type: 'restore', resource: 'mana', pctMax: .04 } }),
    accent('gathered_voice', 'A Voice for Each Friend', '1% increased healing power per nearby ally, up to the shared nearby-ally cap.', gaugeMod('healPower', 'increased', .01, 'allies:near')),
    accent('empty_song', 'The Last Breath Carries', '1.5% increased skill effect duration per 10% missing mana.', gaugeMod('effectDuration', 'increased', .015, 'mana:missing')),
    accent('mended_reach', 'Kindness Travels', 'After being healed: 12% increased area of effect.', mod('aoeRadius', 'increased', .12, undefined, 'recentlyHealed')),
    accent('still_mend', 'Restful Verse', 'While stationary: 12% increased healing power; while moving: 12% increased healing received.', mod('healPower', 'increased', .12, undefined, 'stationary'), mod('healTaken', 'increased', .12, undefined, 'moving')),
  ],
  entropy: [
    event('held_clock', 'Steal a Held Moment', 'Hitting a held enemy removes 0.25s from running movement-skill cooldowns, at most once every 2s.',
      { trigger: 'hit', vs: ['hardCC'], icd: 2, effect: { type: 'cooldown', seconds: .25, tags: ['movement'] } }),
    event('shield_poise', 'Shatter into Resolve', 'When energy shield breaks, restore 12% of maximum poise, at most once every 5s. Requires a poise pool.',
      { trigger: 'esBreak', icd: 5, effect: { type: 'restore', resource: 'poise', pctMax: .12 } }),
    accent('empty_chill', 'Cold in the Empty Cup', 'At low mana: 18% increased damage against chilled enemies.', mod('damage', 'increased', .18, ['vs:chill'], 'lowMana')),
    accent('held_crit', 'Patient Cruelty', '+7% critical strike chance against held enemies.', mod('critChance', 'flat', .07, ['vs:hardCC'])),
    accent('lost_shield_ward', 'Fragments Become Shelter', '2% increased ward gained per 10% missing energy shield.', gaugeMod('wardGain', 'increased', .02, 'es:missing')),
    accent('varied_duration', 'A Different Tomorrow', 'While your recent sequence is varied: 15% increased skill effect duration.', mod('effectDuration', 'increased', .15, undefined, 'comboVaried')),
  ],
};
