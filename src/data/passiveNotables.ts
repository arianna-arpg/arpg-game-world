// Native passive powers: no support ids, sockets or binding. These payloads
// compose the same stats, gauges and event executor used throughout the game.
import { gaugeMod, linkIncMod, linkMod, mod, type Modifier } from '../engine/stats';
import type { PassiveChoiceOption } from './passiveChoices';
import { registerProc, type ProcDef } from './procs';

const power = (id:string,name:string,description:string,...mods:Modifier[]):PassiveChoiceOption => ({id,name,description,mods});
export const NATIVE_PASSIVE_PROCS: ProcDef[]=[];
function event(id:string,name:string,description:string,def:Omit<ProcDef,'id'|'name'|'color'>):PassiveChoiceOption {
  const p={id:`native_${id}`,name,color:'#d5c08c',...def};
  NATIVE_PASSIVE_PROCS.push(p);registerProc(p);
  return power(id,name,description,mod(`proc_${p.id}`,'flat',1));
}
export const NATIVE_PASSIVE_SCHOOLS:Record<string,PassiveChoiceOption[]>={
  impact:[
    event('undertow_fist','Undertow Fist','Melee hits pull the victim toward you with 65 force.',{trigger:'hit',tags:['melee'],icd:2,effect:{type:'displace',force:-65}}),
    event('breach_reserve','Breach Reserve','Breaking an enemy\'s poise restores 12% of maximum poise.',{trigger:'poiseBreakDealt',icd:3,effect:{type:'restore',resource:'poise',pctMax:.12}}),
    power('anchored_blow','Anchored Blow','While stationary, deal 24% increased poise damage and gain 12% increased weight.',mod('poiseDamage','increased',.24,undefined,'stationary'),mod('weight','increased',.12,undefined,'stationary')),
    power('drawn_bow','Drawn Bow of Bone','Melee hits gain +4 added physical damage per point of base weight; 5% less attack speed.',linkMod('addedPhysical','weight',4,['melee']),mod('attackSpeed','more',-.05)),
    power('grip_tax','The Grip Takes Its Due','Hits against grabbed enemies leech an additional 3% of damage as life and deal 20% increased poise damage.',mod('lifeLeech','flat',.03,['vs:grabbed']),mod('poiseDamage','increased',.20,['vs:grabbed'])),
    power('fallen_wall','Beyond the Fallen Wall','16% increased ailment magnitude; +12% ailment chance against enemies with broken poise.',mod('statusChance','flat',.12,['vs:poiseBroken']),mod('statusMagnitude','increased',.16)),
  ],
  tempo:[
    event('repeated_frenzy','Practice Becomes Frenzy','Using a skill while repeating the same skill grants 1 Frenzy charge, up to 3 charges.',{trigger:'cast',when:'comboRepeated',icd:3,effect:{type:'gainCharge',charge:'frenzy',amount:1,max:3}}),
    event('varied_mana','The Improviser Recovers','Using a skill while weaving different skills restores 5% of maximum mana.',{trigger:'cast',when:'comboVaried',icd:3,effect:{type:'restore',resource:'mana',pctMax:.05}}),
    power('quiet_precision','Quiet Precision','+8% critical strike chance while you have not been hit recently. 12% increased attack and cast speed if you have been hit recently.',mod('critChance','flat',.08,undefined,'notHurtRecently'),mod('attackSpeed','increased',.12,undefined,'recentlyHurt'),mod('castSpeed','increased',.12,undefined,'recentlyHurt')),
    power('critical_recovery','A Sharp Recovery','18% increased cooldown recovery if you have dealt a critical strike recently; 8% less critical strike multiplier.',mod('cooldownRecovery','increased',.18,undefined,'recentlyCrit'),mod('critMulti','more',-.08)),
    power('breathing_refrain','Breathing Refrain','While repeating the same skill, regenerate 1% of maximum life per second and gain 15% increased poise recovery rate.',mod('lifeRegenPct','flat',.01,undefined,'comboRepeated'),mod('poiseRegenPct','increased',.15,undefined,'comboRepeated')),
    power('unfinished_measure','Unfinished Measure','While weaving three different skills, gain 14% increased attack and cast speed and +14% critical strike multiplier.',mod('attackSpeed','increased',.14,undefined,'comboVaried'),mod('castSpeed','increased',.14,undefined,'comboVaried'),mod('critMulti','flat',.14,undefined,'comboVaried')),
  ],
  arcana:[
    event('critical_reservoir','Critical Reservoir','Critical spell hits restore 4% of maximum energy shield.',{trigger:'hit',tags:['spell'],crit:true,icd:2,effect:{type:'restore',resource:'es',pctMax:.04}}),
    event('broken_veil','The Broken Veil','Cleanse damaging ailments when your energy shield breaks.',{trigger:'esBreak',icd:8,effect:{type:'cleanse',afflictions:true}}),
    power('walking_formula','Walking Formula','+20% movement speed while channeling and 15% increased turning speed while channeling; channel skills deal 8% less damage.',mod('channelMobility','flat',.20),mod('channelTurnRate','increased',.15),mod('damage','more',-.08,['channel'])),
    power('mana_lens','The Mana Lens','Gain 8% increased spell damage per 100 base maximum mana; +6% spell critical strike chance.',linkIncMod('damage','mana',.0008,['spell']),mod('critChance','flat',.06,['spell'])),
    power('shielded_hunger','Shielded Hunger','+2% spell energy shield leech while you have energy shield. 18% increased spell damage while on low energy shield.',mod('esLeech','flat',.02,['spell'],'hasEs'),mod('damage','increased',.18,['spell'],'lowEs')),
    power('patient_channel','Patient Channel','While channeling, take 8% less damage and gain 20% increased energy-shield recharge rate.',mod('damageTaken','more',-.08,undefined,'channeling'),mod('esRechargeRate','increased',.20,undefined,'channeling')),
  ],
  host:[
    event('parting_blessing','Parting Blessing','When one of your minions dies, heal allies near its corpse for 4 (+1 per level) life.',{trigger:'minionDeath',icd:4,effect:{type:'delayedBurst',at:'target',delay:.4,radius:110,healAllies:{base:4,perLevel:1}}}),
    event('summoners_breath','Summoner\'s Breath','Using a summon skill restores 5% of maximum mana.',{trigger:'cast',tags:['summon'],icd:4,effect:{type:'restore',resource:'mana',pctMax:.05}}),
    power('sheltered_brood','Sheltered Brood','Summoned minions take 10% less damage and deal 8% less damage.',mod('minionDamageTaken','more',-.10),mod('minionDamage','more',-.08)),
    power('host_fortitude','Fortitude of the Host','+8 maximum poise, plus +2 maximum poise per active minion.',mod('poise','flat',8),gaugeMod('poise','flat',2,'minions')),
    power('bloodline','A Shared Bloodline','Gain life regeneration equal to 0.5% of your base maximum life. Your minions regenerate 1.2% of their maximum life per second and gain 12% increased movement speed.',linkMod('lifeRegen','life',.005),mod('minionRegenPct','flat',.012),mod('minionMoveSpeed','increased',.12)),
    power('patient_muster','Patient Muster','Minions summoned while stationary deal 18% increased damage. Summon skills have 12% increased effect duration.',mod('minionDamage','increased',.18,undefined,'stationary'),mod('effectDuration','increased',.12,['summon'])),
  ],
  guile:[
    event('vanishing_guard','Vanishing Guard','Evading grants a ward equal to 4% of maximum life.',{trigger:'evade',icd:3,effect:{type:'ward',pctMaxLife:.04}}),
    event('venom_breath','Venom Breath','Inflicting poison restores 4% of maximum mana.',{trigger:'statusApply',status:'poison',icd:3,effect:{type:'restore',resource:'mana',pctMax:.04}}),
    power('patient_venom','Patient Venom','Chaos ailments have +1 maximum stack; 10% less damage.',mod('ailmentStacks','flat',1,['chaos']),mod('damage','more',-.10)),
    power('unseen_medicine','Unseen Medicine','+3 life gained on hit when striking from behind; 15% increased healing received if you have evaded recently.',mod('lifeOnHit','flat',3,['vs:behind']),mod('healTaken','increased',.15,undefined,'recentlyEvaded')),
    power('first_wound','The First Wound Opens','+18% ailment chance and 20% increased poise damage against enemies on full life.',mod('statusChance','flat',.18,['vs:fullLife']),mod('poiseDamage','increased',.20,['vs:fullLife'])),
    power('preys_shadow','Prey\'s Shadow','+1% life leech and +15% critical strike multiplier against low-life enemies.',mod('lifeLeech','flat',.01,['vs:lowLife']),mod('critMulti','flat',.15,['vs:lowLife'])),
  ],
  devices:[
    event('workshop_fury','Workshop Fury','Using a construct skill grants 1 Fury charge, up to 3 charges.',{trigger:'cast',tags:['construct'],icd:4,effect:{type:'gainCharge',charge:'fury',amount:1,max:3}}),
    event('field_patch','Field Patch','Using a construct skill heals you for 2% of maximum life.',{trigger:'cast',tags:['construct'],icd:4,effect:{type:'heal',pctMax:.02}}),
    power('distributed_workshop','Distributed Workshop','+1 maximum construct; constructs deal 12% less damage.',mod('constructMaxCount','flat',1),mod('damage','more',-.12,['construct'])),
    power('sustained_emplacement','Sustained Emplacement','Constructs have 30% increased duration, but construct skills cost 15% more mana.',mod('effectDuration','increased',.30,['construct']),mod('manaCost','more',.15,['construct'])),
    power('hasty_assembly','Hasty Assembly','20% increased construct cooldown recovery and 12% increased construct damage if you have used a movement skill recently.',mod('cooldownRecovery','increased',.20,['construct'],'recentlyMoved'),mod('damage','increased',.12,['construct'],'recentlyMoved')),
    power('close_quarters_rig','Close-Quarters Rig','Constructs deal 3% increased damage per nearby enemy; 10% less construct area of effect.',gaugeMod('damage','increased',.03,'foes:near',['construct']),mod('aoeRadius','more',-.10,['construct'])),
  ],
  bastion:[
    event('halfway_shelter','Halfway Shelter','Gain a ward equal to 5% of maximum life when your poise drops below 50%.',{trigger:'poiseBracket',bracket:.5,icd:5,effect:{type:'ward',pctMaxLife:.05}}),
    event('barbed_reply','Barbed Reply','Blocking grants +12 thorns for 4 seconds.',{trigger:'block',icd:3,effect:{type:'buff',buff:{type:'buff',id:'native_barbed_reply',duration:4,mods:[mod('thorns','flat',12)]}}}),
    power('sheltering_stance','Sheltering Stance','Your guard also protects nearby minions; 10% less guard strength.',mod('guardAegis','flat',1),mod('guardStrength','more',-.10)),
    power('armor_mends','Armor That Mends','+30 armor. Gain life regeneration equal to 0.4% of your base armor.',linkMod('lifeRegen','armor',.004),mod('armor','flat',30)),
    power('reserved_resolve','Reserved Resolve','While not on low mana, gain 25% increased poise recovery rate and 12% increased guard strength.',{stat:'poiseRegenPct',kind:'increased',value:.25,unless:'lowMana'},{stat:'guardStrength',kind:'increased',value:.12,unless:'lowMana'}),
    power('enduring_watch','Enduring Watch','+12 maximum endurance. 20% increased endurance recovery rate while stationary.',mod('endurance','flat',12),mod('enduranceRegenPct','increased',.20,undefined,'stationary')),
  ],
  chorus:[
    event('verse_reservoir','Verse Reservoir','Gaining a Verse charge restores 3% of maximum mana.',{trigger:'chargeGain',charge:'verse',icd:2,effect:{type:'restore',resource:'mana',pctMax:.03}}),
    event('song_of_return','Song of Return','Using a song skill heals nearby allies for 3 (+1 per level) life.',{trigger:'cast',tags:['song'],icd:5,effect:{type:'delayedBurst',at:'self',delay:.5,radius:110,healAllies:{base:3,perLevel:1}}}),
    power('gathered_warmth','Gathered Warmth','10% increased healing power. Regenerate 0.2 life per second per nearby ally.',gaugeMod('lifeRegen','flat',.2,'allies:near'),mod('healPower','increased',.10)),
    power('mercy_lingers','Mercy Lingers','10% increased ward gained. Ward loses 10 fewer percentage points per second if you have been healed recently.',mod('wardDecay','flat',-.10,undefined,'recentlyHealed'),mod('wardGain','increased',.10)),
    power('verse_shelter','Verse Shelter','Gain +3 maximum energy shield per Verse charge; song skills cost 12% less mana.',gaugeMod('energyShield','flat',3,'charge:verse'),mod('manaCost','more',-.12,['song'])),
    power('courageous_voice','Courageous Voice','While ward holds, gain 20% increased song area of effect and 15% increased healing power.',mod('aoeRadius','increased',.20,['song'],'hasWard'),mod('healPower','increased',.15,undefined,'hasWard')),
  ],
  entropy:[
    event('thawing_reserve','Thawing Reserve','Hitting a chilled enemy restores 5% of maximum mana.',{trigger:'hit',vs:['chill'],icd:2,effect:{type:'restore',resource:'mana',pctMax:.05}}),
    event('wounded_clock','Wounded Clock','Dropping to low life reduces remaining movement skill cooldowns by 20%.',{trigger:'condition',condition:'lowLife',icd:6,effect:{type:'cooldown',fraction:.20,tags:['movement']}}),
    power('affliction_armor','Affliction Ward','8% increased energy shield and 10% increased ward gained per damaging ailment on you.',gaugeMod('energyShield','increased',.08,'afflictions'),gaugeMod('wardGain','increased',.10,'afflictions')),
    power('brittle_patience','Brittle Patience','+10% critical strike chance and +15% critical strike multiplier against chilled enemies.',mod('critChance','flat',.10,['vs:chill']),mod('critMulti','flat',.15,['vs:chill'])),
    power('debt_collects','The Debt Collects','+10 maximum mana. Spell hits gain 0.2% life leech per 10% missing mana.',gaugeMod('lifeLeech','flat',.002,'mana:missing',['spell']),mod('mana','flat',10)),
    power('held_seasons','Held Seasons','Curse skills have 25% increased effect duration; +10% ailment chance against immobilized enemies.',mod('effectDuration','increased',.25,['curse']),mod('statusChance','flat',.10,['vs:hardCC'])),
  ],
};

/** Small investments are useful independently; branch A favors the power's
 *  delivery, branch B its resources or defense. All are ordinary one-point nodes. */
export const PASSIVE_TRAINING:Record<string,PassiveChoiceOption[]>={
  impact:[power('base','Impact Practice','8% increased melee damage.',mod('damage','increased',.08,['melee'])),power('a','Drive the Blow','10% increased poise damage.',mod('poiseDamage','increased',.10)),power('b','Firm Footing','+6 maximum poise.',mod('poise','flat',6))],
  tempo:[power('base','Measured Practice','6% increased attack and cast speed.',mod('attackSpeed','increased',.06),mod('castSpeed','increased',.06)),power('a','Sharpen the Beat','+10% critical strike multiplier.',mod('critMulti','flat',.10)),power('b','Breath Between Beats','+8 maximum mana.',mod('mana','flat',8))],
  arcana:[power('base','Arcane Practice','8% increased spell damage.',mod('damage','increased',.08,['spell'])),power('a','Steady Formula','6% increased cast speed.',mod('castSpeed','increased',.06)),power('b','Stored Thought','+10 maximum energy shield.',mod('energyShield','flat',10))],
  host:[power('base','Keeper Practice','Summoned minions deal 8% increased damage.',mod('minionDamage','increased',.08)),power('a','Healthy Brood','Summoned minions have 10% increased maximum life.',mod('minionLife','increased',.10)),power('b','Economical Muster','Summon skills cost 6% less mana.',mod('manaCost','more',-.06,['summon']))],
  guile:[power('base','Guile Practice','8% increased attack damage.',mod('damage','increased',.08,['attack'])),power('a','Keen Instruments','+25 accuracy.',mod('accuracy','flat',25)),power('b','A Light Step','10% increased evasion.',mod('evasion','increased',.10))],
  devices:[power('base','Workshop Practice','8% increased construct damage.',mod('damage','increased',.08,['construct'])),power('a','Durable Parts','Construct skills have 10% increased effect duration.',mod('effectDuration','increased',.10,['construct'])),power('b','Spare Materials','Construct skills cost 6% less mana.',mod('manaCost','more',-.06,['construct']))],
  bastion:[power('base','Bastion Practice','10% increased armor.',mod('armor','increased',.10)),power('a','Sturdy Shield','8% increased guard strength.',mod('guardStrength','increased',.08)),power('b','A Deeper Stance','+6 maximum poise.',mod('poise','flat',6))],
  chorus:[power('base','Choral Practice','8% increased healing power.',mod('healPower','increased',.08)),power('a','Carry the Note','Song skills have 10% increased effect duration.',mod('effectDuration','increased',.10,['song'])),power('b','A Fresh Breath','Regenerate 0.3 mana per second.',mod('manaRegen','flat',.3))],
  entropy:[power('base','Entropy Practice','8% increased ailment magnitude.',mod('statusMagnitude','increased',.08)),power('a','Open the Wound','+4% ailment chance.',mod('statusChance','flat',.04)),power('b','Hold the Thread','8% increased skill effect duration.',mod('effectDuration','increased',.08))],
};
