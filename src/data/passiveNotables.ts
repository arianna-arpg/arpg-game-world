// Native passive powers: no support ids, sockets or binding. These payloads
// compose the same stats, gauges and event executor used throughout the game.
import { gaugeMod, linkMod, mod, type Modifier } from '../engine/stats';
import type { PassiveChoiceOption } from './passiveChoices';
import { registerProc, type ProcDef } from './procs';

const power = (id:string,name:string,description:string,...mods:Modifier[]):PassiveChoiceOption => ({id,name,description,mods});
export const NATIVE_PASSIVE_PROCS: ProcDef[]=[];
function event(id:string,name:string,description:string,def:Omit<ProcDef,'id'|'name'|'color'>):PassiveChoiceOption {
  const p={id:`native_${id}`,name,color:'#d5c08c',...def};
  NATIVE_PASSIVE_PROCS.push(p);registerProc(p);
  return power(id,name,description+' 95% trigger chance.',mod(`proc_${p.id}`,'flat',1));
}
export const NATIVE_PASSIVE_SCHOOLS:Record<string,PassiveChoiceOption[]>={
  impact:[
    event('undertow_fist','Undertow Fist','Melee hits pull the victim toward you with 65 force, at most once every 2s.',{trigger:'hit',tags:['melee'],icd:2,effect:{type:'displace',force:-65}}),
    event('breach_reserve','Breach Reserve','Breaking enemy poise restores 6% of maximum energy shield, at most once every 3s. Requires an energy-shield pool.',{trigger:'poiseBreakDealt',icd:3,effect:{type:'restore',resource:'es',pctMax:.06}}),
    power('anchored_blow','Anchored Blow','While stationary: 24% increased poise damage and 12% increased weight.',mod('poiseDamage','increased',.24,undefined,'stationary'),mod('weight','increased',.12,undefined,'stationary')),
    power('drawn_bow','Drawn Bow of Bone','Melee hits gain flat physical damage equal to 1% of your flat weight baseline; 8% less attack speed.',linkMod('addedPhysical','weight',.01,['melee']),mod('attackSpeed','more',-.08)),
    power('grip_tax','The Grip Takes Its Due','Hits against grabbed enemies leech an additional 3% of damage as life and deal 20% increased poise damage.',mod('lifeLeech','flat',.03,['vs:grabbed']),mod('poiseDamage','increased',.20,['vs:grabbed'])),
    power('fallen_wall','Beyond the Fallen Wall','16% increased ailment magnitude; against enemies with broken poise: +12% ailment chance.',mod('statusChance','flat',.12,['vs:poiseBroken']),mod('statusMagnitude','increased',.16)),
  ],
  tempo:[
    event('repeated_frenzy','Practice Becomes Frenzy','Completing a skill while your sequence repeats grants one Frenzy, up to three through this source, at most once every 3s.',{trigger:'cast',when:'comboRepeated',icd:3,effect:{type:'gainCharge',charge:'frenzy',amount:1,max:3}}),
    event('varied_mana','The Improviser Recovers','Completing a skill while your sequence is varied restores 5% of maximum mana, at most once every 3s.',{trigger:'cast',when:'comboVaried',icd:3,effect:{type:'restore',resource:'mana',pctMax:.05}}),
    power('quiet_precision','Quiet Precision','While not hit recently: +8% critical strike chance. After being hurt: 12% increased attack and cast speed.',mod('critChance','flat',.08,undefined,'notHurtRecently'),mod('attackSpeed','increased',.12,undefined,'recentlyHurt'),mod('castSpeed','increased',.12,undefined,'recentlyHurt')),
    power('critical_recovery','A Sharp Recovery','After a critical hit: 18% increased cooldown recovery; 8% less critical strike damage multiplier.',mod('cooldownRecovery','increased',.18,undefined,'recentlyCrit'),mod('critMulti','more',-.08)),
    power('breathing_refrain','Breathing Refrain','While your sequence repeats: regenerate 1% of maximum life per second and gain 15% increased poise recovery rate.',mod('lifeRegenPct','flat',.01,undefined,'comboRepeated'),mod('poiseRegenPct','increased',.15,undefined,'comboRepeated')),
    power('unfinished_measure','Unfinished Measure','While your sequence is varied: +10% ailment chance and 15% increased projectile speed.',mod('statusChance','flat',.10,undefined,'comboVaried'),mod('projectileSpeed','increased',.15,undefined,'comboVaried')),
  ],
  arcana:[
    event('critical_reservoir','Critical Reservoir','Critical spell hits restore 4% of maximum energy shield, at most once every 2s. Requires an energy-shield pool.',{trigger:'hit',tags:['spell'],crit:true,icd:2,effect:{type:'restore',resource:'es',pctMax:.04}}),
    event('broken_veil','The Broken Veil','When energy shield breaks, cleanse damaging ailments, at most once every 8s.',{trigger:'esBreak',icd:8,effect:{type:'cleanse',afflictions:true}}),
    power('walking_formula','Walking Formula','Channels gain +20 percentage points of movement factor and 15% increased turning speed; channel skills deal 8% less damage.',mod('channelMobility','flat',.20),mod('channelTurnRate','increased',.15),mod('damage','more',-.08,['channel'])),
    power('mana_lens','The Mana Lens','Gain flat accuracy equal to 25% of your flat maximum mana baseline; +5% spell critical strike chance.',linkMod('accuracy','mana',.25),mod('critChance','flat',.05,['spell'])),
    power('shielded_hunger','Shielded Hunger','While energy shield stands: +2% spell life leech. At low energy shield: 18% increased spell damage.',mod('lifeLeech','flat',.02,['spell'],'hasEs'),mod('damage','increased',.18,['spell'],'lowEs')),
    power('patient_channel','Patient Channel','While stationary: +6 channelled thorns and 16% increased healing received.',mod('channelThorns','flat',6,undefined,'stationary'),mod('healTaken','increased',.16,undefined,'stationary')),
  ],
  host:[
    event('parting_blessing','Parting Blessing','When your summon dies, heal allies near its body after 0.4s: 4 life plus 1 per level after the first in a radius of 110, at most once every 4s.',{trigger:'minionDeath',icd:4,effect:{type:'delayedBurst',at:'target',delay:.4,radius:110,healAllies:{base:4,perLevel:1}}}),
    event('summoners_breath','Summoner\'s Breath','Completing a summon skill restores 5% of maximum mana, at most once every 4s.',{trigger:'cast',tags:['summon'],icd:4,effect:{type:'restore',resource:'mana',pctMax:.05}}),
    power('sheltered_brood','Sheltered Brood','New summons inherit 10% less damage taken and 8% less damage dealt.',mod('minionDamageTaken','more',-.10),mod('minionDamage','more',-.08)),
    power('host_fortitude','Fortitude of the Host','+8 maximum poise; +2 maximum poise per living summon, up to the shared minion cap.',mod('poise','flat',8),gaugeMod('poise','flat',2,'minions')),
    power('bloodline','A Shared Bloodline','Gain flat life regeneration equal to 0.15% of your flat maximum life baseline. After being healed, new summons inherit 12% increased movement speed.',linkMod('lifeRegen','life',.0015),mod('minionMoveSpeed','increased',.12,undefined,'recentlyHealed')),
    power('patient_muster','Patient Muster','While stationary, new summons inherit 18% increased damage. Summon skills have 12% increased effect duration.',mod('minionDamage','increased',.18,undefined,'stationary'),mod('effectDuration','increased',.12,['summon'])),
  ],
  guile:[
    event('vanishing_guard','Vanishing Guard','Evading grants ward equal to 4% of maximum life, at most once every 3s.',{trigger:'evade',icd:3,effect:{type:'ward',pctMaxLife:.04}}),
    event('venom_breath','Venom Breath','Applying poison restores 4% of maximum mana, at most once every 3s.',{trigger:'statusApply',status:'poison',icd:3,effect:{type:'restore',resource:'mana',pctMax:.04}}),
    power('patient_venom','Patient Venom','Chaos ailments gain +1 maximum stack; 10% less damage.',mod('ailmentStacks','flat',1,['chaos']),mod('damage','more',-.10)),
    power('unseen_medicine','Unseen Medicine','Hits from behind gain +3 life on hit; after evading, 15% increased healing received.',mod('lifeOnHit','flat',3,['vs:behind']),mod('healTaken','increased',.15,undefined,'recentlyEvaded')),
    power('first_wound','The First Wound Opens','Against full-life enemies: +18% ailment chance and 20% increased poise damage.',mod('statusChance','flat',.18,['vs:fullLife']),mod('poiseDamage','increased',.20,['vs:fullLife'])),
    power('preys_shadow','Prey\'s Shadow','Against low-life enemies: +1% life leech and +15% critical strike multiplier.',mod('lifeLeech','flat',.01,['vs:lowLife']),mod('critMulti','flat',.15,['vs:lowLife'])),
  ],
  devices:[
    event('workshop_fury','Workshop Fury','Completing a construct skill grants one Fury, up to three through this source, at most once every 4s.',{trigger:'cast',tags:['construct'],icd:4,effect:{type:'gainCharge',charge:'fury',amount:1,max:3}}),
    event('field_patch','Field Patch','Completing a construct skill heals 2% of maximum life, at most once every 4s.',{trigger:'cast',tags:['construct'],icd:4,effect:{type:'heal',pctMax:.02}}),
    power('distributed_workshop','Distributed Workshop','+1 maximum construct; constructs deal 12% less damage.',mod('constructMaxCount','flat',1),mod('damage','more',-.12,['construct'])),
    power('sustained_emplacement','Sustained Emplacement','Constructs last 30% longer but cost 15% more mana.',mod('effectDuration','increased',.30,['construct']),mod('manaCost','more',.15,['construct'])),
    power('hasty_assembly','Hasty Assembly','After completing a movement skill: 20% increased construct cooldown recovery and 12% increased construct damage.',mod('cooldownRecovery','increased',.20,['construct'],'recentlyMoved'),mod('damage','increased',.12,['construct'],'recentlyMoved')),
    power('close_quarters_rig','Close-Quarters Rig','Constructs deal 3% increased damage per nearby enemy, up to the shared cap; 10% less construct area of effect.',gaugeMod('damage','increased',.03,'foes:near',['construct']),mod('aoeRadius','more',-.10,['construct'])),
  ],
  bastion:[
    event('halfway_shelter','Halfway Shelter','When poise drains through its 50% bracket, gain ward equal to 5% of maximum life, at most once every 5s.',{trigger:'poiseBracket',bracket:.5,icd:5,effect:{type:'ward',pctMaxLife:.05}}),
    event('barbed_reply','Barbed Reply','Blocking grants +8 thorns for 4s, at most once every 3s.',{trigger:'block',icd:3,effect:{type:'buff',buff:{type:'buff',id:'native_barbed_reply',duration:4,mods:[mod('thorns','flat',8)]}}}),
    power('sheltering_stance','Sheltering Stance','Your guard also protects nearby minions; 10% less guard strength.',mod('guardAegis','flat',1),mod('guardStrength','more',-.10)),
    power('armor_mends','Armor That Mends','Gain flat life regeneration equal to 0.1% of your flat armor baseline; +20 flat armor.',linkMod('lifeRegen','armor',.001),mod('armor','flat',20)),
    power('reserved_resolve','Reserved Resolve','At full mana: 25% increased poise recovery rate and 12% increased guard strength.',mod('poiseRegenPct','increased',.25,undefined,'fullMana'),mod('guardStrength','increased',.12,undefined,'fullMana')),
    power('enduring_watch','Enduring Watch','+12 maximum endurance. While stationary: 20% increased endurance recovery rate.',mod('endurance','flat',12),mod('enduranceRegenPct','increased',.20,undefined,'stationary')),
  ],
  chorus:[
    event('verse_reservoir','Verse Reservoir','Gaining a Verse restores 3% of maximum mana, at most once every 2s.',{trigger:'chargeGain',charge:'verse',icd:2,effect:{type:'restore',resource:'mana',pctMax:.03}}),
    event('song_of_return','Song of Return','Completing a song heals nearby allies after 0.5s: 3 life plus 1 per level after the first in a radius of 110, at most once every 5s.',{trigger:'cast',tags:['song'],icd:5,effect:{type:'delayedBurst',at:'self',delay:.5,radius:110,healAllies:{base:3,perLevel:1}}}),
    power('gathered_warmth','Gathered Warmth','Regenerate 0.2 life per second per nearby ally, up to the shared cap; +10% healing power.',gaugeMod('lifeRegen','flat',.2,'allies:near'),mod('healPower','increased',.10)),
    power('mercy_lingers','Mercy Lingers','After being healed, ward loses 10 fewer percentage points of its current value per second. +10% ward gained.',mod('wardDecay','flat',-.10,undefined,'recentlyHealed'),mod('wardGain','increased',.10)),
    power('verse_shelter','Verse Shelter','Gain +3 maximum energy shield per Verse held; song skills cost 12% less mana.',gaugeMod('energyShield','flat',3,'charge:verse'),mod('manaCost','more',-.12,['song'])),
    power('courageous_voice','Courageous Voice','While guarding: 20% increased song area of effect and 15% increased healing power.',mod('aoeRadius','increased',.20,['song'],'guarding'),mod('healPower','increased',.15,undefined,'guarding')),
  ],
  entropy:[
    event('thawing_reserve','Thawing Reserve','Hitting a chilled enemy restores 5% of maximum poise, at most once every 2s. Requires a poise pool.',{trigger:'hit',vs:['chill'],icd:2,effect:{type:'restore',resource:'poise',pctMax:.05}}),
    event('wounded_clock','Wounded Clock','When you first fall to low life, remove 20% of remaining movement-skill cooldowns, at most once every 6s.',{trigger:'condition',condition:'lowLife',icd:6,effect:{type:'cooldown',fraction:.20,tags:['movement']}}),
    power('affliction_armor','Affliction Armor','6% increased armor per damaging ailment on you; +8% ailment resistance.',gaugeMod('armor','increased',.06,'afflictions'),mod('ailmentResist','flat',.08)),
    power('brittle_patience','Brittle Patience','Against chilled enemies: +10% critical strike chance; 10% less projectile speed.',mod('critChance','flat',.10,['vs:chill']),mod('projectileSpeed','more',-.10)),
    power('debt_collects','The Debt Collects','Spell hits gain 0.2% life leech per 10% missing mana; +10 maximum mana.',gaugeMod('lifeLeech','flat',.002,'mana:missing',['spell']),mod('mana','flat',10)),
    power('held_seasons','Held Seasons','Curse skills have 25% increased effect duration; +10% ailment chance against held enemies.',mod('effectDuration','increased',.25,['curse']),mod('statusChance','flat',.10,['vs:hardCC'])),
  ],
};

/** Small investments are useful independently; branch A favors the power's
 *  delivery, branch B its resources or defense. All are ordinary one-point nodes. */
export const PASSIVE_TRAINING:Record<string,PassiveChoiceOption[]>={
  impact:[power('base','Impact Practice','8% increased melee damage.',mod('damage','increased',.08,['melee'])),power('a','Drive the Blow','10% increased poise damage.',mod('poiseDamage','increased',.10)),power('b','Firm Footing','+6 maximum poise.',mod('poise','flat',6))],
  tempo:[power('base','Measured Practice','6% increased attack and cast speed.',mod('attackSpeed','increased',.06),mod('castSpeed','increased',.06)),power('a','Sharpen the Beat','+10% critical strike multiplier.',mod('critMulti','flat',.10)),power('b','Breath Between Beats','+8 maximum mana.',mod('mana','flat',8))],
  arcana:[power('base','Arcane Practice','8% increased spell damage.',mod('damage','increased',.08,['spell'])),power('a','Steady Formula','6% increased cast speed.',mod('castSpeed','increased',.06)),power('b','Stored Thought','+10 maximum energy shield.',mod('energyShield','flat',10))],
  host:[power('base','Keeper Practice','New summons inherit 8% increased damage.',mod('minionDamage','increased',.08)),power('a','Healthy Brood','New summons inherit 10% increased maximum life.',mod('minionLife','increased',.10)),power('b','Economical Muster','Summon skills cost 6% less mana.',mod('manaCost','more',-.06,['summon']))],
  guile:[power('base','Guile Practice','8% increased attack damage.',mod('damage','increased',.08,['attack'])),power('a','Keen Instruments','+25 accuracy.',mod('accuracy','flat',25)),power('b','A Light Step','10% increased evasion.',mod('evasion','increased',.10))],
  devices:[power('base','Workshop Practice','8% increased construct damage.',mod('damage','increased',.08,['construct'])),power('a','Durable Parts','Construct skills have 10% increased effect duration.',mod('effectDuration','increased',.10,['construct'])),power('b','Spare Materials','Construct skills cost 6% less mana.',mod('manaCost','more',-.06,['construct']))],
  bastion:[power('base','Bastion Practice','10% increased armor.',mod('armor','increased',.10)),power('a','Sturdy Shield','8% increased guard strength.',mod('guardStrength','increased',.08)),power('b','A Deeper Stance','+6 maximum poise.',mod('poise','flat',6))],
  chorus:[power('base','Choral Practice','8% increased healing power.',mod('healPower','increased',.08)),power('a','Carry the Note','Song skills have 10% increased effect duration.',mod('effectDuration','increased',.10,['song'])),power('b','A Fresh Breath','Regenerate 0.3 mana per second.',mod('manaRegen','flat',.3))],
  entropy:[power('base','Entropy Practice','8% increased ailment magnitude.',mod('statusMagnitude','increased',.08)),power('a','Open the Wound','+4% ailment chance.',mod('statusChance','flat',.04)),power('b','Hold the Thread','8% increased skill effect duration.',mod('effectDuration','increased',.08))],
};
