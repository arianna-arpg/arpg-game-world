// Opening build grammar. The nodes remain explicit, editor-owned rows in
// passives.ts; their option pools live here so a visual save cannot erase them.
// Every payload uses the ordinary modifier, event or conduit pipeline.
import { gaugeMod, linkMod, mod, type Modifier } from '../engine/stats';
import { registerChoiceGroup, type PassiveChoiceOption } from './passiveChoices';
import './passiveRoutes';
import { NATIVE_PASSIVE_SCHOOLS } from './passiveNotables';

const option = (id: string, name: string, description: string, ...mods: Modifier[]): PassiveChoiceOption =>
  ({ id, name, description, mods });

export const CROSSROADS_PURSUITS = registerChoiceGroup({
  id: 'crossroads_pursuits', name: 'Pursuits: Choose How You Fight', unique: 'character',
  options: [
    option('dance', 'Dance Between Blows', '12% increased damage and 8% increased cast speed if you have used a movement skill recently.',
      mod('damage', 'increased', .12, undefined, 'recentlyMoved'), mod('castSpeed', 'increased', .08, undefined, 'recentlyMoved')),
    option('counter', 'Answer the Blow', '+3% block chance. 16% increased melee damage if you have blocked recently.',
      mod('damage', 'increased', .16, ['melee'], 'recentlyBlocked'), mod('blockChance', 'flat', .03)),
    option('hunter', 'Hunt the Wounded', '16% increased damage against low-life enemies; +3 life gained on kill.',
      mod('damage', 'increased', .16, ['vs:lowLife']), mod('lifeOnKill', 'flat', 3)),
    option('affliction', 'Wounds Within Wounds', '+8% ailment chance; 10% increased damage against enemies suffering from a damaging ailment.',
      mod('statusChance', 'flat', .08), mod('damage', 'increased', .10, ['vs:afflicted'])),
    option('keeper', 'Fight Beside the Pack', 'Minions deal 8% increased damage. Gain 1% increased damage per active minion.',
      mod('minionDamage', 'increased', .08), gaugeMod('damage', 'increased', .01, 'minions')),
    option('risk', 'Live on the Edge', '2% increased damage per 10% missing life; 1% of damage leeched as life.',
      gaugeMod('damage', 'increased', .02, 'life:missing'), mod('lifeLeech', 'flat', .01)),
    option('focus', 'Keep Your Distance', 'While you have not been hit recently, regenerate 1% of maximum life per second and deal 10% increased projectile damage.',
      mod('lifeRegenPct', 'flat', .01, undefined, 'notHurtRecently'), mod('damage', 'increased', .10, ['projectile'], 'notHurtRecently')),
    option('weaver', 'Change the Rhythm', 'While weaving different skills, gain 14% increased damage and 8% increased cast speed.',
      mod('damage', 'increased', .14, undefined, 'comboVaried'), mod('castSpeed', 'increased', .08, undefined, 'comboVaried')),
    option('devotee', 'Perfect One Motion', 'While repeating the same skill, gain 14% increased damage and 8% increased attack speed.',
      mod('damage', 'increased', .14, undefined, 'comboRepeated'), mod('attackSpeed', 'increased', .08, undefined, 'comboRepeated')),
    option('engineer', 'Prepare the Ground', 'Construct skills cost 12% less mana and have 12% increased effect duration.',
      mod('manaCost', 'more', -.12, ['construct']), mod('effectDuration', 'increased', .12, ['construct'])),
    option('healer', 'Mend and Return', '12% increased damage and 10% increased armor if you have been healed recently.',
      mod('damage', 'increased', .12, undefined, 'recentlyHealed'), mod('armor', 'increased', .10, undefined, 'recentlyHealed')),
    option('control', 'Make an Opening', '+15% critical strike multiplier against immobilized enemies; 10% increased poise damage.',
      mod('critMulti', 'flat', .15, ['vs:hardCC']), mod('poiseDamage', 'increased', .10)),
  ],
});

export const CROSSROADS_TECHNIQUES = registerChoiceGroup({
  id: 'crossroads_techniques', name: 'Techniques: Shape Your Pursuit', unique: 'character',
  options: [
    option('momentum', 'Carry Momentum', '15% increased attack speed if you have used a movement skill recently.', mod('attackSpeed', 'increased', .15, undefined, 'recentlyMoved')),
    option('evasion', 'Slip and Answer', '+8% critical strike chance if you have evaded recently.', mod('critChance', 'flat', .08, undefined, 'recentlyEvaded')),
    option('recovery', 'Recover Under Fire', 'Recovers 12% of life lost to hits over 6 seconds.', mod('recuperate', 'flat', .12)),
    option('thorns', 'Living Briars', '+4 thorns. Gain additional thorns equal to 30% of your base life regeneration.', mod('thorns', 'flat', 4), linkMod('thorns', 'lifeRegen', .30)),
    option('pressure', 'Welcome the Crowd', '2% increased damage per nearby enemy.', gaugeMod('damage', 'increased', .02, 'foes:near')),
    option('ambush', 'The Unseen Cut', '18% increased damage when striking an enemy from behind.', mod('damage', 'increased', .18, ['vs:behind'])),
    option('opener', 'First Impression', '+8% critical strike chance against enemies on full life.', mod('critChance', 'flat', .08, ['vs:fullLife'])),
    option('drain', 'Spend the Well', 'Regenerate 0.12 mana per second per 10% missing mana.', gaugeMod('manaRegen', 'flat', .12, 'mana:missing')),
    option('reserve', 'Keep a Reserve', '+14 maximum mana; 14% increased spell damage while not on low mana.', { stat: 'damage', kind: 'increased', value: .14, tags: ['spell'], unless: 'lowMana' }, mod('mana', 'flat', 14)),
    option('funeral', 'Funeral Tempo', 'When one of your minions dies, gain 8% increased minion damage and 4% increased damage for 8 seconds, stacking up to 5 times.', mod('proc_necrotic_feast', 'flat', 1)),
    option('harvest', 'Harvest the Fight', 'Gain 2 life and 2 mana on kill.', mod('manaOnKill', 'flat', 2), mod('lifeOnKill', 'flat', 2)),
    option('ward', 'Mending Leaves a Mark', 'Being healed grants a ward equal to 5% of maximum life.', mod('proc_mending_ward', 'flat', 1)),
    option('poise', 'Unbroken Intent', '+10 maximum poise; 12% increased damage while your poise is unbroken.', mod('damage', 'increased', .12, undefined, 'poised'), mod('poise', 'flat', 10)),
    option('duration', 'Let It Linger', '15% increased skill effect duration.', mod('effectDuration', 'increased', .15)),
    option('reach', 'Claim More Ground', '12% increased area of effect.', mod('aoeRadius', 'increased', .12)),
    option('velocity', 'Choose the Long Shot', '20% increased projectile speed; 8% increased projectile damage.', mod('projectileSpeed', 'increased', .20), mod('damage', 'increased', .08, ['projectile'])),
    { id: 'conduit', name: 'Feed Your Footing', description: '+10 maximum poise. Drains 2% of maximum mana per second to restore poise at a 1:1 ratio. Stops below 50% mana or when poise is full.', mods: [mod('poise', 'flat', 10)], conduit: { from: 'mana', to: 'poise', drainPct: .02, ratio: 1, floor: .5 } },
    option('conduction', 'Waste Nothing', '15% increased resource conduit efficiency.', mod('conduitEfficiency', 'increased', .15)),
  ],
});

/** One optional mastery per school, behind its small-node investment cluster.
 *  Ordinary nodes also expose these powers. No class gate or graft binding. */
const school = (id: string, name: string, options: PassiveChoiceOption[]) =>
  registerChoiceGroup({ id: `crossroads_${id}`, name, unique: 'character', options: [...options, ...NATIVE_PASSIVE_SCHOOLS[id]] });

export const CROSSROADS_SCHOOLS = [
  school('impact', 'Impact: Displacement, Grappling and Broken Poise', [
    option('breach', 'Breach the Line', '20% increased damage against enemies with broken poise.', mod('damage', 'increased', .20, ['vs:poiseBroken'])),
    option('lever', 'Long Lever', '+30 knockback strength with melee hits.', mod('knockback', 'flat', 30, ['melee'])),
    option('heavy', 'Weight Behind the Blow', '20% increased weight; 12% increased poise damage.', mod('weight', 'increased', .20), mod('poiseDamage', 'increased', .12)),
    option('cruel', 'Cruel Hold', '20% increased damage against grabbed enemies.', mod('damage', 'increased', .20, ['vs:grabbed'])),
    option('pursuit', 'No Retreat', '20% increased damage against fleeing enemies.', mod('damage', 'increased', .20, ['vs:fleeing'])),
    option('rebuttal', 'Learn from Their Shield', 'Restore 20% of maximum poise when an enemy blocks your hit.', mod('proc_shield_lesson', 'flat', 1)),
  ]),
  school('tempo', 'Tempo: Critical Rhythms and Answering Blows', [
    option('persistence', 'Denied Once', 'When your melee hit is evaded, your next melee hit within 5 seconds gains +50% critical strike chance and deals 30% more damage.', mod('proc_overpower', 'flat', 1)),
    option('crit', 'Follow the Spark', '10% increased attack and cast speed if you have dealt a critical strike recently.', mod('attackSpeed', 'increased', .10, undefined, 'recentlyCrit'), mod('castSpeed', 'increased', .10, undefined, 'recentlyCrit')),
    option('rush', 'Keep the Hunt Alive', '8% increased movement speed if you have killed recently.', mod('moveSpeed', 'increased', .08, undefined, 'recentlyKilled')),
    option('rhythm', 'Rhythmic Economy', '15% reduced mana cost while repeating the same skill.', mod('manaCost', 'increased', -.15, undefined, 'comboRepeated')),
    option('variety', 'Improvised Economy', '15% reduced mana cost while weaving different skills.', mod('manaCost', 'increased', -.15, undefined, 'comboVaried')),
    option('execution', 'The Last Beat', '+25% critical strike multiplier against low-life enemies.', mod('critMulti', 'flat', .25, ['vs:lowLife'])),
  ]),
  school('arcana', 'Arcana: Spell Engines and Resource Weaving', [
    option('reserve', 'Last Drop', 'Casting a spell while on low mana restores 10% of maximum mana.', mod('proc_desperate_reserves', 'flat', 1)),
    option('battery', 'Reserve Becomes Shelter', '+12 maximum energy shield. Gain additional energy shield equal to 8% of your base maximum mana.', mod('energyShield', 'flat', 12), linkMod('energyShield', 'mana', .08)),
    option('steady', 'Untroubled Study', '12% increased cast speed while you have not been hit recently.', mod('castSpeed', 'increased', .12, undefined, 'notHurtRecently')),
    option('opening', 'Read the Incantation', '+10% critical strike chance against casting enemies.', mod('critChance', 'flat', .10, ['vs:casting'])),
    option('flow', 'Make Every Drop Count', '20% increased resource conduit efficiency.', mod('conduitEfficiency', 'increased', .20)),
    option('hot_streak', 'Three-Beat Spellfire', 'Landing two consecutive spell critical strikes empowers your next spell hit within 10 seconds with +100% critical strike chance and 50% more damage.', mod('proc_hot_streak', 'flat', 1), mod('proc_heating_up', 'flat', 1), mod('proc_heat_lost', 'flat', 1)),
  ]),
  school('host', 'The Host: Companions, Swarms and Sacrifice', [
    option('company', 'Shelter in Company', '2% increased armor per active minion.', gaugeMod('armor', 'increased', .02, 'minions')),
    option('funeral', 'Tended Pack', 'Minions gain 18% increased damage if you have been healed recently.', mod('minionDamage', 'increased', .18, undefined, 'recentlyHealed')),
    option('bodies', 'Durable Company', '15% increased minion life; 5% increased minion movement speed.', mod('minionLife', 'increased', .15), mod('minionMoveSpeed', 'increased', .05)),
    option('gather', 'Gather the Fallen', 'Corpse skills consume or raise 1 additional corpse.', mod('corpseBatch', 'flat', 1)),
    option('choir', 'Wakeflame Choir', 'Gain 1 Wakeflame every 15 seconds. Minions deal 2% increased damage per Wakeflame held.', mod('chargeRegen_wakeflame', 'flat', 1 / 15), gaugeMod('minionDamage', 'increased', .02, 'charge:wakeflame')),
    option('patience', 'Patient Keeper', 'Summon skills cost 15% less mana.', mod('manaCost', 'more', -.15, ['summon'])),
  ]),
  school('guile', 'Guile: Evasive Play and Selective Targets', [
    option('flank', 'Open Their Back', '+20% critical strike multiplier when striking an enemy from behind.', mod('critMulti', 'flat', .20, ['vs:behind'])),
    option('escape', 'Escape Becomes Tempo', '12% increased attack speed if you have evaded recently.', mod('attackSpeed', 'increased', .12, undefined, 'recentlyEvaded')),
    option('ambush', 'Before They Notice', '25% increased damage against unaware enemies.', mod('damage', 'increased', .25, ['vs:unaware'])),
    option('moving', 'A Moving Target', '18% increased evasion while moving.', mod('evasion', 'increased', .18, undefined, 'moving')),
    option('still', 'The Patient Blade', '+6% critical strike chance while stationary.', mod('critChance', 'flat', .06, undefined, 'stationary')),
    option('prey', 'Hunt the Hunter', '16% increased damage against elite enemies.', mod('damage', 'increased', .16, ['vs:elite'])),
  ]),
  school('devices', 'Devices: Projectiles, Traps and Prepared Ground', [
    option('rack', 'Practiced Hands', '18% increased reload speed.', mod('reloadSpeed', 'increased', .18)),
    option('flight', 'Patient Flight', '20% reduced projectile speed; 15% increased projectile damage.', mod('projectileSpeed', 'increased', -.20), mod('damage', 'increased', .15, ['projectile'])),
    option('area', 'Patient Construction', '12% increased area of effect for construct skills.', mod('aoeRadius', 'increased', .12, ['construct'])),
    option('breach', 'Tools for the Job', '20% increased damage against guarding enemies.', mod('damage', 'increased', .20, ['vs:guarding'])),
    option('timing', 'Reset the Workshop', '12% increased cooldown recovery for construct skills.', mod('cooldownRecovery', 'increased', .12, ['construct'])),
    option('munitions', 'Stretch the Magazine', '15% reduced mana cost for munition skills; 10% increased munition damage.', mod('manaCost', 'increased', -.15, ['munition']), mod('damage', 'increased', .10, ['munition'])),
  ]),
  school('bastion', 'Bastion: Guard, Retaliation and Resource Exchange', [
    option('spines', 'Carried Spines', '+5 thorns. Adds 10% of your thorns to hit damage.', mod('thorns', 'flat', 5), mod('thornsToHit', 'flat', .10)),
    option('counter', 'Measured Reprisal', '15% increased melee damage and 10% increased poise damage if you have been hit recently.', mod('damage', 'increased', .15, ['melee'], 'recentlyHurt'), mod('poiseDamage', 'increased', .10, undefined, 'recentlyHurt')),
    option('roots', 'Plant Your Feet', '15% increased armor and 15% increased guard strength while stationary.', mod('armor', 'increased', .15, undefined, 'stationary'), mod('guardStrength', 'increased', .15, undefined, 'stationary')),
    option('recovery', 'Bend, Then Mend', 'Regenerate 1.5% of maximum life per second if you have blocked recently.', mod('lifeRegenPct', 'flat', .015, undefined, 'recentlyBlocked')),
    { id: 'wall', name: 'Feed the Wall', description: '+10 maximum poise. While guarding, drains 4% of maximum poise per second to restore guard at a 1.5:1 ratio. Stops below 35% poise.', mods: [mod('poise', 'flat', 10)], conduit: { from: 'poise', to: 'guard', drainPct: .04, ratio: 1.5, floor: .35 } },
    option('tenacity', 'Fight Through the Break', '18% increased damage while your poise is broken.', mod('damage', 'increased', .18, undefined, 'poiseBroken')),
  ]),
  school('chorus', 'Chorus: Restoration, Songs and Shared Strength', [
    option('friends', 'Courage in Company', '2% increased damage per nearby ally.', gaugeMod('damage', 'increased', .02, 'allies:near')),
    option('song', 'The Long Verse', '18% increased effect duration for song skills.', mod('effectDuration', 'increased', .18, ['song'])),
    option('renew', 'Breath Between Verses', 'Regenerate 1.5% of maximum mana per second while you have not been hit recently.', mod('manaRegenPct', 'flat', .015, undefined, 'notHurtRecently')),
    option('grace', 'Grace in Motion', 'Regenerate 1% of maximum life per second if you have used a movement skill recently.', mod('lifeRegenPct', 'flat', .01, undefined, 'recentlyMoved')),
    option('choir', 'Sheltering Choir', 'Gain 1 Wakeflame every 15 seconds. Regenerate +0.15 life per second per Wakeflame held.', mod('chargeRegen_wakeflame', 'flat', 1 / 15), gaugeMod('lifeRegen', 'flat', .15, 'charge:wakeflame')),
    option('respite', 'Room to Recover', '12% increased evasion and 6% increased movement speed if you have been healed recently.', mod('evasion', 'increased', .12, undefined, 'recentlyHealed'), mod('moveSpeed', 'increased', .06, undefined, 'recentlyHealed')),
  ]),
  school('entropy', 'Entropy: Ailments, Dangerous Reserves and Altered Time', [
    option('chill', 'Cracks in the Ice', '+20% critical strike multiplier against chilled enemies.', mod('critMulti', 'flat', .20, ['vs:chill'])),
    option('held', 'Time to Wound', '+15% ailment chance against immobilized enemies.', mod('statusChance', 'flat', .15, ['vs:hardCC'])),
    option('debt', 'Power in the Empty Well', '2% increased spell damage per 10% missing mana.', gaugeMod('damage', 'increased', .02, 'mana:missing', ['spell'])),
    option('blood', 'Careful Desperation', 'While on low life, gain 12% increased cast speed and 1.5% life leech.', mod('castSpeed', 'increased', .12, undefined, 'lowLife'), mod('lifeLeech', 'flat', .015, undefined, 'lowLife')),
    option('fury', 'A Slow Anger', 'Gain 1 Fury charge every 5 seconds, up to 5 charges.', mod('proc_slow_burn', 'flat', 1)),
    option('chronicle', 'Hold the Moment', '25% increased effect duration and 15% increased cooldown recovery for chrono skills.', mod('effectDuration', 'increased', .25, ['chrono']), mod('cooldownRecovery', 'increased', .15, ['chrono'])),
  ]),
];

export const CROSSROADS_GROUPS = [CROSSROADS_PURSUITS, CROSSROADS_TECHNIQUES, ...CROSSROADS_SCHOOLS];
