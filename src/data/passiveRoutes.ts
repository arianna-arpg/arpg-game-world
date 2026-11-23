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
  return accent(id, name, description, mod(`proc_${proc.id}`, 'flat', 1));
}

/** Six new interactions per school: two bounded event powers and four
 *  complementary investments. Numbers, gates and payloads are ordinary data. */
export const ROUTE_ACCENTS: Record<string, PassiveChoiceOption[]> = {
  impact: [
    event('breach_spell', 'Crushing Follow-Through', 'Breaking an enemy\'s poise empowers your next physical hit within 5 seconds to deal 25% more damage (3s cooldown).',
      { trigger: 'poiseBreakDealt', icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_breach_spell', duration: 5, consumeOn: { on: 'hit', tags: ['physical'] }, mods: [mod('damage', 'more', .25, ['physical'])] } } }),
    event('collision_mana', 'The Wall Pays Back', 'When an enemy you knock back collides with terrain, restore 6% of maximum mana (2s cooldown).',
      { trigger: 'collision', icd: 2, effect: { type: 'restore', resource: 'mana', pctMax: .06 } }),
    accent('weight_guard', 'Mass Behind the Shield', 'Gain flat guard strength equal to 12% of your base weight.', linkMod('guardStrength', 'weight', .12)),
    accent('broken_cast', 'Rally from the Rubble', '16% increased attack speed and 14% increased healing received while your poise is broken.', mod('attackSpeed', 'increased', .16, undefined, 'poiseBroken'), mod('healTaken', 'increased', .14, undefined, 'poiseBroken')),
    accent('press_guard', 'Crowd the Shield', '2% increased guard strength per nearby enemy, up to 8 enemies.', gaugeMod('guardStrength', 'increased', .02, 'foes:near')),
    accent('recover_breach', 'Relentless Breach', '22% increased poise damage if you have landed a hit recently.', mod('poiseDamage', 'increased', .22, undefined, 'recentlyHit')),
  ],
  tempo: [
    event('evade_clock', 'Borrow the Miss', 'Evading an attack reduces active movement skill cooldowns by 0.6 seconds (2s cooldown).',
      { trigger: 'evade', icd: 2, effect: { type: 'cooldown', seconds: .6, tags: ['movement'] } }),
    event('varied_ward', 'Shelter in Variation', 'Using a skill after casting three different skills in a row grants ward equal to 4% of maximum life (3s cooldown).',
      { trigger: 'cast', when: 'comboVaried', icd: 3, effect: { type: 'ward', pctMaxLife: .04 } }),
    accent('repeated_reach', 'Widen the Refrain', '14% increased area of effect after using the same skill three times in a row.', mod('aoeRadius', 'increased', .14, undefined, 'comboRepeated')),
    accent('varied_crit', 'Unfamiliar Angle', '+14% to critical strike multiplier after using three different skills in a row.', mod('critMulti', 'flat', .14, undefined, 'comboVaried')),
    accent('crit_heal', 'The Graceful Cut', '+3 life on hit and 10% increased attack speed if you have dealt a critical strike recently.', mod('lifeOnHit', 'flat', 3, undefined, 'recentlyCrit'), mod('attackSpeed', 'increased', .10, undefined, 'recentlyCrit')),
    accent('evade_poise', 'Loose Footing, Steady Hands', '18% increased poise recovery rate if you have evaded recently.', mod('poiseRegenPct', 'increased', .18, undefined, 'recentlyEvaded')),
  ],
  arcana: [
    event('filled_spell', 'A Full Vessel Spills', 'Reaching full energy shield causes your next spell hit within 6 seconds to deal 20% more damage (4s cooldown).',
      { trigger: 'esFilled', icd: 4, effect: { type: 'buff', buff: { type: 'buff', id: 'route_filled_spell', duration: 6, consumeOn: { on: 'hit', tags: ['spell'] }, mods: [mod('damage', 'more', .20, ['spell'])] } } }),
    event('empty_footing', 'Spend Mana, Draw Aegis', 'Casting a spell while on low mana restores 8% of maximum energy shield (3s cooldown).',
      { trigger: 'cast', tags: ['spell'], when: 'lowMana', icd: 3, effect: { type: 'restore', resource: 'es', pctMax: .08 } }),
    accent('shield_cast', 'Cast into the Gap', '1.5% increased cast speed per 10% missing energy shield.', gaugeMod('castSpeed', 'increased', .015, 'es:missing')),
    accent('mana_heal', 'Well of Kindness', 'Regenerate flat life per second equal to 0.5% of your base maximum mana.', linkMod('lifeRegen', 'mana', .005)),
    accent('flow_aim', 'Current of Thought', '14% increased cast speed and 25% increased mana regeneration while energy shield is recharging.', mod('castSpeed', 'increased', .14, undefined, 'esRecharging'), mod('manaRegen', 'increased', .25, undefined, 'esRecharging')),
    accent('reserve_ward', 'Reserve for Tomorrow', '18% increased ward gained while not on low mana.', { stat: 'wardGain', kind: 'increased', value: .18, unless: 'lowMana' }),
  ],
  host: [
    event('funeral_clock', 'The Empty Place', 'When one of your minions dies, reduce active summon skill cooldowns by 0.4 seconds (2s cooldown).',
      { trigger: 'minionDeath', icd: 2, effect: { type: 'cooldown', seconds: .4, tags: ['summon'] } }),
    event('summon_ward', 'Welcome the Newcomer', 'Using a summon skill grants ward equal to 3% of maximum life (4s cooldown).',
      { trigger: 'cast', tags: ['summon'], icd: 4, effect: { type: 'ward', pctMaxLife: .03 } }),
    accent('pack_mend', 'Many Hands Mend', '1% increased healing received per active minion, up to 10 minions.', gaugeMod('healTaken', 'increased', .01, 'minions')),
    accent('safe_birth', 'A Quiet Nursery', 'Minions summoned while you have not been hit recently gain 14% increased maximum life.', mod('minionLife', 'increased', .14, undefined, 'notHurtRecently')),
    accent('wounded_keeper', 'A Keeper in Need', 'Summon skills have 1.5% reduced mana cost per 10% missing life.', gaugeMod('manaCost', 'increased', -.015, 'life:missing', ['summon'])),
    accent('company_ward', 'Shelter of the Host', '1% increased ward gained per nearby ally, up to 8 allies.', gaugeMod('wardGain', 'increased', .01, 'allies:near')),
  ],
  guile: [
    event('back_mana', 'Pick Their Pocket', 'Hitting an enemy from behind restores 3% of maximum mana (2s cooldown).',
      { trigger: 'hit', vs: ['behind'], icd: 2, effect: { type: 'restore', resource: 'mana', pctMax: .03 } }),
    event('move_needle', 'Needle After the Step', 'Using a movement skill grants +10% critical strike chance to your next projectile hit within 4 seconds (3s cooldown).',
      { trigger: 'cast', tags: ['movement'], icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_move_needle', duration: 4, consumeOn: { on: 'hit', tags: ['projectile'] }, mods: [mod('critChance', 'flat', .10, ['projectile'])] } } }),
    accent('still_ailment', 'Open on the Move', '+10% chance to inflict ailments while moving.', mod('statusChance', 'flat', .10, undefined, 'moving')),
    accent('wounded_stride', 'Keep the Exit Open', '10% increased movement speed if you have killed an enemy recently.', mod('moveSpeed', 'increased', .10, undefined, 'recentlyKilled')),
    accent('behind_poise', 'Cut the Supporting Leg', '20% increased poise damage against enemies hit from behind.', mod('poiseDamage', 'increased', .20, ['vs:behind'])),
    accent('empty_evasion', 'Nimble Reserve', '12% increased evasion while not on low mana; 2% increased movement speed.', { stat: 'evasion', kind: 'increased', value: .12, unless: 'lowMana' }, mod('moveSpeed', 'increased', .02)),
  ],
  devices: [
    event('device_clock', 'Tools for the Next Step', 'Using a construct skill reduces active movement skill cooldowns by 0.5 seconds (3s cooldown).',
      { trigger: 'cast', tags: ['construct'], icd: 3, effect: { type: 'cooldown', seconds: .5, tags: ['movement'] } }),
    event('evade_device', 'Build in the Blind Spot', 'Evading an attack causes your next construct skill within 5 seconds to cost 25% less mana (3s cooldown).',
      { trigger: 'evade', icd: 3, effect: { type: 'buff', buff: { type: 'buff', id: 'route_evade_device', duration: 5, consumeOn: { on: 'use', tags: ['construct'] }, mods: [mod('manaCost', 'more', -.25, ['construct'])] } } }),
    accent('crowd_tools', 'An Answer for Everyone', 'Constructs deal 2% increased damage per nearby enemy, up to 8 enemies.', gaugeMod('damage', 'increased', .02, 'foes:near', ['construct'])),
    accent('mobile_workshop', 'Workshop on the Run', '15% increased construct skill cast speed if you have used a movement skill recently.', mod('castSpeed', 'increased', .15, ['construct'], 'recentlyMoved')),
    accent('reserve_tools', 'Carefully Packed', 'Constructs have 20% increased duration while not on low mana.', { stat: 'effectDuration', kind: 'increased', value: .20, tags: ['construct'], unless: 'lowMana' }),
    accent('patient_tools', 'Survey the Ground', 'Construct skills have 12% increased area of effect while you are stationary.', mod('aoeRadius', 'increased', .12, ['construct'], 'stationary')),
  ],
  bastion: [
    event('block_clock', 'Make Room to Leave', 'Blocking a hit reduces active movement skill cooldowns by 0.5 seconds (2s cooldown).',
      { trigger: 'block', icd: 2, effect: { type: 'cooldown', seconds: .5, tags: ['movement'] } }),
    event('rearmed_ward', 'Stand Again', 'Recovering from broken poise grants ward equal to 6% of maximum life (5s cooldown).',
      { trigger: 'poiseRearmed', icd: 5, effect: { type: 'ward', pctMaxLife: .06 } }),
    accent('guard_thorns', 'A Patient Rebuke', '20% increased thorns damage while guarding.', mod('thorns', 'increased', .20, undefined, 'guarding')),
    accent('wounded_guard', 'Hold the Last Line', '2% increased guard strength per 10% missing life.', gaugeMod('guardStrength', 'increased', .02, 'life:missing')),
    accent('healed_stance', 'Mended Resolve', '20% increased poise recovery rate if you have been healed recently.', mod('poiseRegenPct', 'increased', .20, undefined, 'recentlyHealed')),
    accent('shield_healing', 'Mercy Behind the Wall', '15% increased healing received while guarding.', mod('healTaken', 'increased', .15, undefined, 'guarding')),
  ],
  chorus: [
    event('heal_clock', 'Mending Buys Time', 'Receiving healing reduces active movement skill cooldowns by 0.3 seconds (3s cooldown).',
      { trigger: 'heal', icd: 3, effect: { type: 'cooldown', seconds: .3, tags: ['movement'] } }),
    event('block_mana', 'A Breath Between Blows', 'Evading an attack restores 5% of maximum mana (3s cooldown).',
      { trigger: 'evade', icd: 3, effect: { type: 'restore', resource: 'mana', pctMax: .05 } }),
    accent('gathered_voice', 'A Voice for Each Friend', '1% increased healing power per nearby ally, up to 8 allies.', gaugeMod('healPower', 'increased', .01, 'allies:near')),
    accent('empty_song', 'The Last Breath Carries', '1.5% increased skill effect duration per 10% missing mana.', gaugeMod('effectDuration', 'increased', .015, 'mana:missing')),
    accent('mended_reach', 'Kindness Travels', '12% increased area of effect if you have been healed recently.', mod('aoeRadius', 'increased', .12, undefined, 'recentlyHealed')),
    accent('still_mend', 'Restful Verse', '12% increased healing power while stationary; 12% increased healing received while moving.', mod('healPower', 'increased', .12, undefined, 'stationary'), mod('healTaken', 'increased', .12, undefined, 'moving')),
  ],
  entropy: [
    event('held_clock', 'Steal a Held Moment', 'Hitting an immobilized, stunned, frozen, or rooted enemy reduces active movement skill cooldowns by 0.25 seconds (2s cooldown).',
      { trigger: 'hit', vs: ['hardCC'], icd: 2, effect: { type: 'cooldown', seconds: .25, tags: ['movement'] } }),
    event('shield_poise', 'Shatter into Resolve', 'When your energy shield breaks, restore 15% of maximum mana (5s cooldown).',
      { trigger: 'esBreak', icd: 5, effect: { type: 'restore', resource: 'mana', pctMax: .15 } }),
    accent('empty_chill', 'Biting Frost', '16% increased damage and +6% cold penetration against chilled enemies.', mod('damage', 'increased', .16, ['vs:chill']), mod('coldPen', 'flat', .06, ['vs:chill'])),
    accent('held_crit', 'Patient Cruelty', '+7% critical strike chance against immobilized, stunned, frozen, or rooted enemies.', mod('critChance', 'flat', .07, ['vs:hardCC'])),
    accent('lost_shield_ward', 'Fragments Become Shelter', '2% increased ward gained per 10% missing energy shield.', gaugeMod('wardGain', 'increased', .02, 'es:missing')),
    accent('varied_duration', 'A Different Tomorrow', '15% increased skill effect duration after using three different skills in a row.', mod('effectDuration', 'increased', .15, undefined, 'comboVaried')),
  ],
};
