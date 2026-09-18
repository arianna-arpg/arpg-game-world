// Opening build grammar. The nodes remain explicit, editor-owned rows in
// passives.ts; their option pools live here so a visual save cannot erase them.
// Every payload uses the ordinary modifier / conduit / graft pipeline.
import { gaugeMod, linkMod, mod, type Modifier } from '../engine/stats';
import { registerChoiceGroup, type PassiveChoiceOption } from './passiveChoices';
import './passiveRoutes';

const option = (id: string, name: string, description: string, ...mods: Modifier[]): PassiveChoiceOption =>
  ({ id, name, description, mods });

/** Keep option data independent of the skill catalog: the UI resolves a graft's
 *  actual support description. These grants need only stable support ids. */
const graft = (support: string): PassiveChoiceOption => {
  return {
    id: `graft_${support}`, name: `${support.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')} Graft`,
    description: 'Bind to one compatible learned skill in Skills; no socket spent, level 1. The support retains its restrictions and prices.',
    graft: { support, level: 1 },
  };
};

export const CROSSROADS_PURSUITS = registerChoiceGroup({
  id: 'crossroads_pursuits', name: 'Pursuits: choose how you fight', unique: 'character',
  options: [
    option('dance', 'Dance Between Blows', 'After a movement skill: 12% increased damage and 8% increased cast speed while the recently-moved window holds.',
      mod('damage', 'increased', .12, undefined, 'recentlyMoved'), mod('castSpeed', 'increased', .08, undefined, 'recentlyMoved')),
    option('counter', 'Answer the Blow', 'After you block: 16% increased melee damage. +3% block chance to begin the loop.',
      mod('damage', 'increased', .16, ['melee'], 'recentlyBlocked'), mod('blockChance', 'flat', .03)),
    option('hunter', 'Hunt the Wounded', '16% increased damage against low-life enemies; gain 3 life on kill.',
      mod('damage', 'increased', .16, ['vs:lowLife']), mod('lifeOnKill', 'flat', 3)),
    option('affliction', 'Wounds Within Wounds', '+8% ailment chance; 10% increased damage against enemies with a damaging ailment.',
      mod('statusChance', 'flat', .08), mod('damage', 'increased', .10, ['vs:afflicted'])),
    option('keeper', 'Fight Beside the Pack', 'Minions deal 8% increased damage. Your damage increases by 1% per living summon (the shared minion gauge cap applies).',
      mod('minionDamage', 'increased', .08), gaugeMod('damage', 'increased', .01, 'minions')),
    option('risk', 'Live on the Edge', '2% increased damage per 10% missing life; 1% of damage leeched as life.',
      gaugeMod('damage', 'increased', .02, 'life:missing'), mod('lifeLeech', 'flat', .01)),
    option('focus', 'Keep Your Distance', 'While you have not been hit recently: regenerate 1% of maximum life per second and deal 10% increased projectile damage.',
      mod('lifeRegenPct', 'flat', .01, undefined, 'notHurtRecently'), mod('damage', 'increased', .10, ['projectile'], 'notHurtRecently')),
    option('weaver', 'Change the Rhythm', 'While your recent skill sequence is varied: 14% increased damage and 8% increased cast speed.',
      mod('damage', 'increased', .14, undefined, 'comboVaried'), mod('castSpeed', 'increased', .08, undefined, 'comboVaried')),
    option('devotee', 'Perfect One Motion', 'While your recent skill sequence repeats: 14% increased damage and 8% increased attack speed.',
      mod('damage', 'increased', .14, undefined, 'comboRepeated'), mod('attackSpeed', 'increased', .08, undefined, 'comboRepeated')),
    option('engineer', 'Prepare the Ground', 'Construct skills cost 12% less mana and have 12% increased effect duration.',
      mod('manaCost', 'more', -.12, ['construct']), mod('effectDuration', 'increased', .12, ['construct'])),
    option('healer', 'Mend and Return', 'After being healed: 12% increased damage and 10% increased armor.',
      mod('damage', 'increased', .12, undefined, 'recentlyHealed'), mod('armor', 'increased', .10, undefined, 'recentlyHealed')),
    option('control', 'Make an Opening', '+15% critical strike multiplier against held enemies; 10% increased poise damage.',
      mod('critMulti', 'flat', .15, ['vs:hardCC']), mod('poiseDamage', 'increased', .10)),
  ],
});

export const CROSSROADS_TECHNIQUES = registerChoiceGroup({
  id: 'crossroads_techniques', name: 'Techniques: shape your pursuit', unique: 'character',
  options: [
    option('momentum', 'Carry Momentum', 'After a movement skill: 15% increased attack speed.', mod('attackSpeed', 'increased', .15, undefined, 'recentlyMoved')),
    option('evasion', 'Slip and Answer', 'After evading: +8% critical strike chance.', mod('critChance', 'flat', .08, undefined, 'recentlyEvaded')),
    option('recovery', 'Recover Under Fire', '12% of damage from hits to life returns as healing over six seconds.', mod('recuperate', 'flat', .12)),
    option('thorns', 'Living Briars', '+4 thorns; gain flat thorns equal to 30% of your flat life regeneration baseline.', mod('thorns', 'flat', 4), linkMod('thorns', 'lifeRegen', .30)),
    option('pressure', 'Welcome the Crowd', '2% increased damage per nearby enemy (the shared nearby-enemy cap applies).', gaugeMod('damage', 'increased', .02, 'foes:near')),
    option('ambush', 'The Unseen Cut', '18% increased damage when striking an enemy from behind.', mod('damage', 'increased', .18, ['vs:behind'])),
    option('opener', 'First Impression', '+8% critical strike chance against full-life enemies.', mod('critChance', 'flat', .08, ['vs:fullLife'])),
    option('drain', 'Spend the Well', 'Regenerate 0.12 mana per second per 10% of missing mana.', gaugeMod('manaRegen', 'flat', .12, 'mana:missing')),
    option('reserve', 'Keep a Reserve', 'At full mana: 15% increased spell damage; +12 maximum mana.', mod('damage', 'increased', .15, ['spell'], 'fullMana'), mod('mana', 'flat', 12)),
    option('funeral', 'Funeral Tempo', 'When one of your summons dies, gain Necrotic Feast: 8% increased minion damage and 4% increased damage for 8s, up to five stacks. New summons inherit the minion bonus when created.', mod('proc_necrotic_feast', 'flat', 1)),
    option('harvest', 'Harvest the Fight', 'Gain 2 mana and 2 life on kill.', mod('manaOnKill', 'flat', 2), mod('lifeOnKill', 'flat', 2)),
    option('ward', 'Mending Leaves a Mark', 'Being healed creates a ward worth 5% of maximum life, at most once every 4s.', mod('proc_mending_ward', 'flat', 1)),
    option('poise', 'Unbroken Intent', 'While your poise stands: 12% increased damage; +10 maximum poise.', mod('damage', 'increased', .12, undefined, 'poised'), mod('poise', 'flat', 10)),
    option('duration', 'Let It Linger', '15% increased skill effect duration.', mod('effectDuration', 'increased', .15)),
    option('reach', 'Claim More Ground', '10% increased area of effect; 10% less area damage.', mod('aoeRadius', 'increased', .10), mod('damage', 'more', -.10, ['aoe'])),
    option('velocity', 'Choose the Long Shot', '20% increased projectile speed; 8% increased projectile damage.', mod('projectileSpeed', 'increased', .20), mod('damage', 'increased', .08, ['projectile'])),
    { id: 'conduit', name: 'Feed Your Footing', description: '+10 maximum poise. Continuously drain 2% of maximum mana per second into poise at a 1:1 exchange. Keep a 50% mana reserve; stop when poise is full.', mods: [mod('poise', 'flat', 10)], conduit: { from: 'mana', to: 'poise', drainPct: .02, ratio: 1, floor: .5 } },
    option('conduction', 'Waste Nothing', '15% increased conduit efficiency: more delivered per resource spent. Requires a resource conduit.', mod('conduitEfficiency', 'increased', .15)),
  ],
});

/** Two choice nodes per school, each taking one of twelve distinct options.
 *  There is no class gate; the school's placement is its only travel cost. */
const school = (id: string, name: string, options: PassiveChoiceOption[], supports: string[]) =>
  registerChoiceGroup({ id: `crossroads_${id}`, name, unique: 'character', options: [...options, ...supports.map(graft)] });

export const CROSSROADS_SCHOOLS = [
  school('impact', 'Impact: displacement, grappling and broken poise', [
    option('breach', 'Breach the Line', '20% increased damage against enemies whose poise is broken.', mod('damage', 'increased', .20, ['vs:poiseBroken'])),
    option('lever', 'Long Lever', '+30 knockback strength with melee hits.', mod('knockback', 'flat', 30, ['melee'])),
    option('heavy', 'Weight Behind the Blow', '20% increased weight; 12% increased poise damage.', mod('weight', 'increased', .20), mod('poiseDamage', 'increased', .12)),
    option('cruel', 'Cruel Hold', '20% increased damage against grabbed enemies.', mod('damage', 'increased', .20, ['vs:grabbed'])),
    option('pursuit', 'No Retreat', '20% increased damage against fleeing enemies.', mod('damage', 'increased', .20, ['vs:fleeing'])),
    option('rebuttal', 'Learn from Their Shield', 'When an enemy blocks your hit, restore 20% of maximum poise, at most once a second.', mod('proc_shield_lesson', 'flat', 1)),
  ], ['crushing_impact', 'battering_ram', 'iron_grip', 'trebuchet_arm', 'wringing_grip', 'siegebreaker']),
  school('tempo', 'Tempo: critical rhythms and answering blows', [
    option('persistence', 'Denied Once', 'An evaded melee hit empowers your next melee hit within 5s: +50% critical chance and 30% more damage.', mod('proc_overpower', 'flat', 1)),
    option('crit', 'Follow the Spark', 'After a critical hit: 10% increased attack and cast speed.', mod('attackSpeed', 'increased', .10, undefined, 'recentlyCrit'), mod('castSpeed', 'increased', .10, undefined, 'recentlyCrit')),
    option('rush', 'Keep the Hunt Alive', 'After a kill: 8% increased movement speed.', mod('moveSpeed', 'increased', .08, undefined, 'recentlyKilled')),
    option('rhythm', 'Rhythmic Economy', 'Repeating your recent skill sequence grants 15% reduced mana cost.', mod('manaCost', 'increased', -.15, undefined, 'comboRepeated')),
    option('variety', 'Improvised Economy', 'Varying your recent skill sequence grants 15% reduced mana cost.', mod('manaCost', 'increased', -.15, undefined, 'comboVaried')),
    option('execution', 'The Last Beat', '+25% critical strike multiplier against low-life enemies.', mod('critMulti', 'flat', .25, ['vs:lowLife'])),
  ], ['serrated_edge', 'answering_steel', 'cast_on_crit', 'cast_on_kill', 'culmination', 'gathered_casting']),
  school('arcana', 'Arcana: spell engines and resource weaving', [
    option('reserve', 'Last Drop', 'A spell cast while on low mana restores 10% of maximum mana, at most once every 3s.', mod('proc_desperate_reserves', 'flat', 1)),
    option('battery', 'Reserve Becomes Shelter', '+12 maximum energy shield; gain energy shield equal to 8% of your maximum mana baseline.', mod('energyShield', 'flat', 12), linkMod('energyShield', 'mana', .08)),
    option('steady', 'Untroubled Study', 'While not hit recently: 12% increased cast speed.', mod('castSpeed', 'increased', .12, undefined, 'notHurtRecently')),
    option('opening', 'Read the Incantation', '+10% critical strike chance against casting enemies.', mod('critChance', 'flat', .10, ['vs:casting'])),
    option('flow', 'Make Every Drop Count', '20% increased conduit efficiency.', mod('conduitEfficiency', 'increased', .20)),
    option('hot_streak', 'Three-Beat Spellfire', 'Two consecutive spell critical hits prepare Hot Streak: your next spell hit within 10s has +100% critical chance and 50% more damage. A noncritical spell hit breaks the preparation.', mod('proc_hot_streak', 'flat', 1), mod('proc_heating_up', 'flat', 1), mod('proc_heat_lost', 'flat', 1)),
  ], ['cast_while_channeling', 'cast_on_overcharge', 'sequenced_invocation', 'refraction', 'unstable_compression', 'entropic_bloom']),
  school('host', 'The Host: companions, swarms and sacrifice', [
    option('company', 'Shelter in Company', '2% increased armor per living summon (the shared minion cap applies).', gaugeMod('armor', 'increased', .02, 'minions')),
    option('funeral', 'Mourn with Purpose', 'Summon within your recently-healed window for 16% increased minion damage. New summons inherit this bonus when created.', mod('minionDamage', 'increased', .16, undefined, 'recentlyHealed')),
    option('bodies', 'Durable Company', '15% increased minion life; 5% increased minion movement speed.', mod('minionLife', 'increased', .15), mod('minionMoveSpeed', 'increased', .05)),
    option('gather', 'Gather the Fallen', 'Each corpse-handling cast consumes or raises one additional corpse.', mod('corpseBatch', 'flat', 1)),
    option('choir', 'Wakeflame Choir', 'Gain one Wakeflame every 15s; 2% increased minion damage per Wakeflame held. New summons inherit this bonus when created.', mod('chargeRegen_wakeflame', 'flat', 1 / 15), gaugeMod('minionDamage', 'increased', .02, 'charge:wakeflame')),
    option('patience', 'Patient Keeper', 'Summon skills cost 15% less mana.', mod('manaCost', 'more', -.15, ['summon'])),
  ], ['brood_tender', 'ghostly_communion', 'gift_of_the_choir', 'legion_doctrine', 'hiveborn', 'parasitic_pact']),
  school('guile', 'Guile: evasive play and selective targets', [
    option('flank', 'Open Their Back', '+20% critical strike multiplier against enemies struck from behind.', mod('critMulti', 'flat', .20, ['vs:behind'])),
    option('escape', 'Escape Becomes Tempo', 'After evading: 12% increased attack speed.', mod('attackSpeed', 'increased', .12, undefined, 'recentlyEvaded')),
    option('ambush', 'Before They Notice', '25% increased damage against unaware enemies.', mod('damage', 'increased', .25, ['vs:unaware'])),
    option('moving', 'A Moving Target', '18% increased evasion while moving.', mod('evasion', 'increased', .18, undefined, 'moving')),
    option('still', 'The Patient Blade', '+6% critical strike chance while stationary.', mod('critChance', 'flat', .06, undefined, 'stationary')),
    option('prey', 'Hunt the Hunter', '16% increased damage against elite enemies.', mod('damage', 'increased', .16, ['vs:elite'])),
  ], ['envenomed_tips', 'fowlers_eye', 'quailbane', 'overmatch', 'regicide', 'limbreaver']),
  school('devices', 'Devices: projectiles, traps and prepared ground', [
    option('rack', 'Practiced Hands', '18% increased reload speed.', mod('reloadSpeed', 'increased', .18)),
    option('flight', 'Patient Flight', '20% reduced projectile speed; 15% increased projectile damage.', mod('projectileSpeed', 'increased', -.20), mod('damage', 'increased', .15, ['projectile'])),
    option('area', 'Patient Construction', '12% increased area of effect for construct skills.', mod('aoeRadius', 'increased', .12, ['construct'])),
    option('breach', 'Tools for the Job', '20% increased damage against guarding enemies.', mod('damage', 'increased', .20, ['vs:guarding'])),
    option('timing', 'Reset the Workshop', '12% increased cooldown recovery for construct skills.', mod('cooldownRecovery', 'increased', .12, ['construct'])),
    option('munitions', 'Stretch the Magazine', '15% reduced mana cost for munition skills; 10% increased munition damage.', mod('manaCost', 'increased', -.15, ['munition']), mod('damage', 'increased', .10, ['munition'])),
  ], ['packed_workshop', 'overwound_mechanism', 'hair_trigger', 'tinkers_arsenal', 'barbed_snare', 'parting_gift']),
  school('bastion', 'Bastion: guard, retaliation and resource exchange', [
    option('spines', 'Carried Spines', '+5 thorns; 10% of flat thorns is added to your hits.', mod('thorns', 'flat', 5), mod('thornsToHit', 'flat', .10)),
    option('counter', 'Measured Reprisal', 'After being hit: 15% increased melee damage and 10% increased poise damage.', mod('damage', 'increased', .15, ['melee'], 'recentlyHurt'), mod('poiseDamage', 'increased', .10, undefined, 'recentlyHurt')),
    option('roots', 'Plant Your Feet', 'While stationary: 15% increased armor and 15% increased guard strength.', mod('armor', 'increased', .15, undefined, 'stationary'), mod('guardStrength', 'increased', .15, undefined, 'stationary')),
    option('recovery', 'Bend, Then Mend', 'After a block: regenerate 1.5% of maximum life per second.', mod('lifeRegenPct', 'flat', .015, undefined, 'recentlyBlocked')),
    { id: 'wall', name: 'Feed the Wall', description: '+10 maximum poise. While guarding, drain 4% of maximum poise per second into your guard at 1.5:1. Keep a 35% poise reserve.', mods: [mod('poise', 'flat', 10)], conduit: { from: 'poise', to: 'guard', drainPct: .04, ratio: 1.5, floor: .35 } },
    option('tenacity', 'Fight Through the Break', 'While your poise is broken: 18% increased damage.', mod('damage', 'increased', .18, undefined, 'poiseBroken')),
  ], ['unyielding_stance', 'bulwark_of_thorns', 'counterweight', 'shieldwall_doctrine', 'answering_wall', 'stalwart_rhythm']),
  school('chorus', 'Chorus: restoration, songs and shared strength', [
    option('friends', 'Courage in Company', '2% increased damage per nearby ally (the shared nearby-ally cap applies).', gaugeMod('damage', 'increased', .02, 'allies:near')),
    option('song', 'The Long Verse', '18% increased effect duration for song skills.', mod('effectDuration', 'increased', .18, ['song'])),
    option('renew', 'Breath Between Verses', 'While not hit recently: regenerate 1.5% of maximum mana per second.', mod('manaRegenPct', 'flat', .015, undefined, 'notHurtRecently')),
    option('grace', 'Grace in Motion', 'After a movement skill: regenerate 1% of maximum life per second.', mod('lifeRegenPct', 'flat', .01, undefined, 'recentlyMoved')),
    option('choir', 'Sheltering Choir', 'Gain one Wakeflame every 15s; gain 0.15 life regeneration per second for each Wakeflame held.', mod('chargeRegen_wakeflame', 'flat', 1 / 15), gaugeMod('lifeRegen', 'flat', .15, 'charge:wakeflame')),
    option('respite', 'Room to Recover', 'After being healed: 12% increased evasion and 6% increased movement speed.', mod('evasion', 'increased', .12, undefined, 'recentlyHealed'), mod('moveSpeed', 'increased', .06, undefined, 'recentlyHealed')),
  ], ['held_note', 'countermelody', 'rising_chorus', 'commanding_presence', 'mending_echoes', 'sanguine_feast']),
  school('entropy', 'Entropy: ailments, dangerous reserves and altered time', [
    option('chill', 'Cracks in the Ice', '+20% critical strike multiplier against chilled enemies.', mod('critMulti', 'flat', .20, ['vs:chill'])),
    option('held', 'Time to Wound', '+15% ailment chance against held enemies.', mod('statusChance', 'flat', .15, ['vs:hardCC'])),
    option('debt', 'Power in the Empty Well', '2% increased spell damage per 10% of missing mana.', gaugeMod('damage', 'increased', .02, 'mana:missing', ['spell'])),
    option('blood', 'Careful Desperation', 'While on low life: 12% increased cast speed and 1.5% life leech.', mod('castSpeed', 'increased', .12, undefined, 'lowLife'), mod('lifeLeech', 'flat', .015, undefined, 'lowLife')),
    option('fury', 'A Slow Anger', 'Gain one Fury charge every 5s, up to five through this source.', mod('proc_slow_burn', 'flat', 1)),
    option('chronicle', 'Hold the Moment', '20% increased effect duration for chrono skills.', mod('effectDuration', 'increased', .20, ['chrono'])),
  ], ['lingering_moment', 'borrowed_haste', 'smothering_spores', 'loose_thread', 'putrefaction', 'epidemic']),
];

export const CROSSROADS_GROUPS = [CROSSROADS_PURSUITS, CROSSROADS_TECHNIQUES, ...CROSSROADS_SCHOOLS];
