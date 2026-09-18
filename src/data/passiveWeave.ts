// Native disciplines for the interwoven Star. These are reusable payloads;
// placement is explicit in passives.ts, and combat never reads a node id.
import { mod as m, gaugeMod as g, gaugeGateMod as gate, linkMod as link, type Modifier } from '../engine/stats';
import type { PassiveChoiceOption } from './passiveChoices';
import { registerProc, type ProcDef } from './procs';

const p = (id:string,name:string,description:string,...mods:Modifier[]):PassiveChoiceOption => ({id,name,description,mods});
export const WEAVE_PROCS:ProcDef[]=[];
function event(id:string,name:string,description:string,def:Omit<ProcDef,'id'|'name'|'color'>,...mods:Modifier[]) {
  const proc:ProcDef={id:`weave_${id}`,name,color:'#93c9ba',...def};
  registerProc(proc);WEAVE_PROCS.push(proc);
  return p(id,name,description+' 95% trigger chance.',m(`proc_${proc.id}`,'flat',1),...mods);
}
export interface PassiveDiscipline {
  id:string;
  name:string;
  /** Authoring hints only: no class locks or runtime geography. */
  homes:[string,string];
  training:[PassiveChoiceOption,PassiveChoiceOption,PassiveChoiceOption];
  powers:PassiveChoiceOption[];
}
export const PASSIVE_DISCIPLINES:PassiveDiscipline[]=[
  {id:'wayfarer',name:'The Long Step',homes:['prw','fin'],training:[
    p('entry','Travel Light','3% increased movement speed.',m('moveSpeed','increased',.03)),
    p('a','Moving Edge','8% increased damage while moving.',m('damage','increased',.08,undefined,'moving')),
    p('b','Road Breath','+6 maximum poise.',m('poise','flat',6)),
  ],powers:[
    event('empty_stride','Run on Empty','Completing a movement skill at low mana restores 8% of maximum poise, at most once every 3s. Requires a poise pool.',{trigger:'cast',tags:['movement'],when:'lowMana',icd:3,effect:{type:'restore',resource:'poise',pctMax:.08}}),
    p('pilgrim_blow','The Pilgrim\'s Blow','After walking 180 units, your next landed damaging blow gains +25% critical multiplier and +2 poise on hit. The shared stride is spent by that blow.',m('strideReach','flat',180),m('critMulti','flat',.25,undefined,'strided'),m('poiseOnHit','flat',2,undefined,'strided')),
    p('passing_shelter','Passing Shelter','+12 maximum insight; while moving, 15% increased insight efficiency and 8% less healing received.',m('insight','flat',12),m('insightEfficiency','increased',.15,undefined,'moving'),m('healTaken','more',-.08,undefined,'moving')),
    p('running_reserves','Running Reserves','After completing a movement skill: 20% increased skill-charge recovery; movement skills cost 10% less mana.',m('skillChargeRate','increased',.20,undefined,'recentlyMoved'),m('manaCost','more',-.10,['movement'])),
  ]},
  {id:'rooted',name:'The Unmoving Eye',homes:['int','for'],training:[
    p('entry','Take Root','8% increased armor while stationary.',m('armor','increased',.08,undefined,'stationary')),
    p('a','Patient Aim','+20 accuracy.',m('accuracy','flat',20)),
    p('b','Quiet Shelter','+8 maximum insight.',m('insight','flat',8)),
  ],powers:[
    event('still_mercy','The Still Hand','Entering a stationary stance grants 20% increased healing power for 4s, at most once every 6s.',{trigger:'condition',condition:'stationary',icd:6,effect:{type:'buff',buff:{type:'buff',id:'weave_still_mercy',duration:4,mods:[m('healPower','increased',.20)]}}}),
    p('rooted_read','Read Without Moving','+14 maximum insight. Shift half of insight\'s momentum source from movement to stillness; 15% less movement speed.',m('insight','flat',14),m('insightInversion','flat',.5),m('moveSpeed','more',-.15)),
    p('three_beat_siege','Three Beats of Silence','After standing still for at least 3 whole seconds: 20% increased projectile damage and +8% armor penetration. Walking or being shoved resets the wait.',gate('damage','increased',.20,'still',3,['projectile']),gate('armorPen','flat',.08,'still',3)),
    p('rooted_channel','Rooted Current','Stationary channels gain 20% increased turning speed and +8 channelled thorns; channel skills cost 8% more mana.',m('channelTurnRate','increased',.20,undefined,'stationary'),m('channelThorns','flat',8,undefined,'stationary'),m('manaCost','more',.08,['channel'])),
  ]},
  {id:'skirmisher',name:'The Unfair Angle',homes:['fin','prw'],training:[
    p('entry','Find the Opening','+20 accuracy.',m('accuracy','flat',20)),
    p('a','Turn the Blade','+8% critical strike multiplier.',m('critMulti','flat',.08)),
    p('b','Leave No Mark','8% increased evasion.',m('evasion','increased',.08)),
  ],powers:[
    event('airborne_shelter','Shelter from the Fall','Hitting an airborne enemy grants ward equal to 5% of maximum life, at most once every 3s.',{trigger:'hit',vs:['airborne'],icd:3,effect:{type:'ward',pctMaxLife:.05}}),
    p('ambush_surgeon','Ambush Surgeon','Against unaware enemies: +20% ailment chance and +4 life on hit.',m('statusChance','flat',.20,['vs:unaware']),m('lifeOnHit','flat',4,['vs:unaware'])),
    p('catch_the_cast','Catch the Incantation','Against casting enemies: +15% armor penetration and 25% increased poise damage.',m('armorPen','flat',.15,['vs:casting']),m('poiseDamage','increased',.25,['vs:casting'])),
    p('cowards_cut','The Coward\'s Cut','12% more damage against faltering enemies; against fleeing enemies, +2% mana leech.',m('quailbane','flat',.12),m('manaLeech','flat',.02,['vs:fleeing'])),
  ]},
  {id:'grappler',name:'Bodies as Weapons',homes:['str','for'],training:[
    p('entry','Learn the Grip','+8% grip power.',m('gripPower','flat',.08)),
    p('a','Commit the Throw','8% increased damage with throw skills.',m('damage','increased',.08,['throw'])),
    p('b','Braced Hips','6% increased weight.',m('weight','increased',.06)),
  ],powers:[
    event('wall_fury','The Wall Answers','Your displacement causing an enemy to collide with terrain grants one Fury, up to three through this source, at most once every 3s.',{trigger:'collision',icd:3,effect:{type:'gainCharge',charge:'fury',amount:1,max:3}}),
    p('loose_foundations','Loose Foundations','+15% shove authority; 15% more damage against uprooted enemies.',m('shoveAuthority','flat',.15),m('uprooter','flat',.15)),
    p('heavy_hands','Heavy Hands, Light Feet','+25% grip power; 12% less attack speed. While moving, 10% increased weight.',m('gripPower','flat',.25),m('attackSpeed','more',-.12),m('weight','increased',.10,undefined,'moving')),
    p('borrowed_projectile','A Borrowed Projectile','Throw skills gain +12% critical chance against airborne enemies; +20% impact damage.',m('critChance','flat',.12,['throw','vs:airborne']),m('impactDamage','flat',.20)),
  ]},
  {id:'marksman',name:'Unlikely Trajectories',homes:['dex','fin'],training:[
    p('entry','Read the Flight','6% increased projectile damage.',m('damage','increased',.06,['projectile'])),
    p('a','Wide Fletching','6% increased projectile size.',m('projectileSize','increased',.06)),
    p('b','Aim Again','+20 accuracy.',m('accuracy','flat',20)),
  ],powers:[
    event('rain_collector','Rain Collector','Projectile hits against wet enemies restore 4% of maximum mana, at most once every 3s.',{trigger:'hit',tags:['projectile'],vs:['wet'],icd:3,effect:{type:'restore',resource:'mana',pctMax:.04}}),
    p('bank_shot','Bank Shot','Projectiles gain one terrain ricochet; 8% less projectile damage.',m('projBounce','flat',1),m('damage','more',-.08,['projectile'])),
    p('slow_hunter','The Patient Missile','Projectiles gain 0.6 radians/second of homing and 15% increased size, but travel 15% slower.',m('homingPower','flat',.6),m('projectileSize','increased',.15),m('projectileSpeed','more',-.15)),
    p('thread_the_crowd','Thread the Crowd','At three or more nearby enemies, projectiles gain one pierce and 12% increased speed.',gate('pierceCount','flat',1,'foes:near',3),gate('projectileSpeed','increased',.12,'foes:near',3)),
  ]},
  {id:'munitions',name:'The Last Cartridge',homes:['dex','prw'],training:[
    p('entry','Rack and Breathe','8% increased reload speed.',m('reloadSpeed','increased',.08)),
    p('a','Careful Loading','6% increased munition damage.',m('damage','increased',.06,['munition'])),
    p('b','Spare Powder','Munition skills cost 4% less mana.',m('manaCost','more',-.04,['munition'])),
  ],powers:[
    event('rack_memory','Remember the First Shot','Completing a reload prepares your next munition hit within 6s: 20% more damage. Can prepare once every 4s.',{trigger:'cast',tags:['reload'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_rack_memory',duration:6,consumeOn:{on:'hit',tags:['munition']},mods:[m('damage','more',.20,['munition'])]}}}),
    p('last_word','Keep the Last Word','25% increased final-round damage; 8% less reload speed.',m('finalRoundDamage','increased',.25),m('reloadSpeed','more',-.08)),
    p('surplus_round','One More in the Chamber','Munition skills gain one use charge but recover charges 10% slower. Only skills with a use-charge bank benefit.',m('skillCharges','flat',1,['munition']),m('skillChargeRate','more',-.10,['munition'])),
    p('rack_under_fire','Rack Under Fire','After taking a hit: 25% increased reload speed and +3 block value.',m('reloadSpeed','increased',.25,undefined,'recentlyHurt'),m('blockValue','flat',3,undefined,'recentlyHurt')),
  ]},
  {id:'alchemist',name:'The Traveling Apothecary',homes:['wis','cha'],training:[
    p('entry','Measured Draught','6% increased flask restoration.',m('restorePower','increased',.06,['flask'])),
    p('a','Careful Pour','3% increased flask effect duration.',m('effectDuration','increased',.03,['flask'])),
    p('b','A Small Reserve','+6 maximum mana.',m('mana','flat',6)),
  ],powers:[
    event('red_glass','Red Glass Shelter','Picking up a life orb grants ward equal to 4% of maximum life, at most once every 3s.',{trigger:'orbPickup',orb:'life',icd:3,effect:{type:'ward',pctMaxLife:.04}}),
    p('emergency_sip','Emergency Sip','Instant flask skills can be used during your own commitments. Flasks restore 8% less.',m('reflex','flat',1,['flask']),m('restorePower','more',-.08,['flask'])),
    p('prepared_draught','Prepared Draught','Bank one full-pool flask pour to release when life damage lands; 10% less flask restoration.',m('pourPrime','flat',1,['flask']),m('restorePower','more',-.10,['flask'])),
    p('surge_bargain','The Surge Bargain','Flask surge streams restore 20% more, while their settle streams restore 15% less.',m('pourPower_surge','more',.20,['flask']),m('pourPower_settle','more',-.15,['flask'])),
  ]},
  {id:'affliction',name:'The Patient Wound',homes:['wil','fin'],training:[
    p('entry','Open a Wound','+3% ailment chance.',m('statusChance','flat',.03)),
    p('a','Deepen the Wound','6% increased ailment magnitude.',m('statusMagnitude','increased',.06)),
    p('b','Keep Your Distance','6% increased evasion.',m('evasion','increased',.06)),
  ],powers:[
    event('blood_glass','Blood into Glass','Applying bleed restores 4% of maximum energy shield, at most once every 3s. Requires an energy-shield pool.',{trigger:'statusApply',status:'bleed',icd:3,effect:{type:'restore',resource:'es',pctMax:.04}}),
    p('precise_infection','Precise Infection','Damaging ailments inherit 35% of your critical chance; +10% critical multiplier.',m('dotCrit','flat',.35),m('critMulti','flat',.10)),
    p('carrier_blow','The Carrier Blow','Forgo 20% of hit damage to empower the ailments those hits produce; forgone damage yields 25% extra affliction power. Requires a damaging ailment source.',m('hitToAffliction','flat',.20),m('afflictionYield','increased',.25)),
    p('half_burn','Half a Burning Promise','Convert 25% of ignite damage into its expiry detonation; 10% increased fire ailment magnitude. Requires ignite.',m('igniteToBomb','flat',.25),m('statusMagnitude','increased',.10,['fire'])),
  ]},
  {id:'martyr',name:'Borrowed Suffering',homes:['wil','for'],training:[
    p('entry','Endure the Sting','+4% ailment resistance.',m('ailmentResist','flat',.04)),
    p('a','A Familiar Hurt','6% increased damage after taking a hit.',m('damage','increased',.06,undefined,'recentlyHurt')),
    p('b','Close the Wound','Regenerate 0.3 life per second.',m('lifeRegen','flat',.3)),
  ],powers:[
    event('thermal_memory','Thermal Memory','A connected hit containing fire damage grants +12% cold resistance and 10% increased cast speed for 4s, at most once every 4s. Shielded hits count.',{trigger:'struck',receivedTypes:['fire'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_thermal_memory',duration:4,mods:[m('coldRes','flat',.12),m('castSpeed','increased',.10)]}}}),
    p('scar_tissue','Useful Scar Tissue','While suffering at least two different damaging ailments: 20% increased healing received and +12% critical avoidance.',gate('healTaken','increased',.20,'afflictions',2),gate('critAvoid','flat',.12,'afflictions',2)),
    p('slow_repair','Slow Repair','Recover 12% of life damage taken from hits over the recuperation window; that window is 20% longer.',m('recuperate','flat',.12),m('recuperateTime','more',.20)),
    p('empty_shell','The Empty Shell Fights','Gain 2% increased damage per 10% missing energy shield; 12% increased energy-shield recharge rate.',g('damage','increased',.02,'es:missing'),m('esRechargeRate','increased',.12)),
  ]},
  {id:'shieldweaver',name:'Glass and Breath',homes:['int','cha'],training:[
    p('entry','A Thin Lattice','+8 maximum energy shield.',m('energyShield','flat',8)),
    p('a','Keep the Spark','6% increased spell damage.',m('damage','increased',.06,['spell'])),
    p('b','Quiet Recharge','8% increased energy-shield recharge rate.',m('esRechargeRate','increased',.08)),
  ],powers:[
    event('unbroken_return','The Unbroken Return','When energy-shield recharge begins, cleanse hard crowd control, at most once every 8s.',{trigger:'esRechargeStart',icd:8,effect:{type:'cleanse',hardCC:true}}),
    p('glass_footing','Glass Footing','Read 20% of your pre-trade energy-shield baseline as maximum poise; forgo 15% of energy shield.',m('esToPoise','flat',.20),m('esForgone','flat',.15)),
    p('full_lattice','A Full Lattice Sings','At full energy shield: +8% spell critical chance. While recharging: 12% increased cast speed.',m('critChance','flat',.08,['spell'],'fullEs'),m('castSpeed','increased',.12,undefined,'esRecharging')),
    {...p('ward_distiller','Ward Distiller','+10 maximum energy shield. Drain 5% of current ward per second into energy shield at 1:1 while the shield has room.',m('energyShield','flat',10)),conduit:{from:'ward',to:'es',drainPct:.05,ratio:1,floor:0}},
  ]},
  {id:'guard_medic',name:'The Shelter Line',homes:['for','cha'],training:[
    p('entry','Raise a Shelter','6% increased guard strength.',m('guardStrength','increased',.06)),
    p('a','Gentle Hands','6% increased healing power.',m('healPower','increased',.06)),
    p('b','Banked Resolve','+6 maximum endurance.',m('endurance','flat',6)),
  ],powers:[
    event('block_reserve','Borrowed Resolve','+10 maximum endurance. Blocking restores 4 endurance, at most once every 3s.',{trigger:'block',icd:3,effect:{type:'fortify',flat:4}},m('endurance','flat',10)),
    p('shelter_pulse','Shelter Pulse','While holding a guard, nearby allies heal 1.2 life per second. 8% less guard strength.',m('guardMend','flat',1.2),m('guardStrength','more',-.08)),
    p('mercy_after_war','Mercy after War','After a kill: 20% increased healing power and 15% increased absorb power.',m('healPower','increased',.20,undefined,'recentlyKilled'),m('absorbPower','increased',.15,undefined,'recentlyKilled')),
    p('overflowing_care','Overflowing Care','Convert 15% of overhealing into absorption on its target; healing power is 8% less.',m('overheal','flat',.15),m('healPower','more',-.08)),
  ]},
  {id:'chorus',name:'Voice and Dominion',homes:['cha','str'],training:[
    p('entry','Learn the Refrain','6% increased song effect duration.',m('effectDuration','increased',.06,['song'])),
    p('a','Carry Your Voice','6% increased warcry area.',m('aoeRadius','increased',.06,['warcry'])),
    p('b','Breathe Deeply','Regenerate 0.2 mana per second.',m('manaRegen','flat',.2)),
  ],powers:[
    event('warcry_verse','The Cry before the Song','Completing a warcry grants 25% increased song area for 5s, at most once every 5s.',{trigger:'cast',tags:['warcry'],icd:5,effect:{type:'buff',buff:{type:'buff',id:'weave_warcry_verse',duration:5,mods:[m('aoeRadius','increased',.25,['song'])]}}}),
    p('held_authority','Held Authority','Gain 0.04 flat damage per reserved mana; 8% less cast speed.',m('reservedDamage','flat',.04),m('castSpeed','more',-.08)),
    p('third_voice','The Third Voice','At three or more Verse charges: 15% increased healing power and 15% increased warcry cooldown recovery.',gate('healPower','increased',.15,'charge:verse',3),gate('cooldownRecovery','increased',.15,'charge:verse',3,['warcry'])),
    {...p('quiet_dominion','Quiet Dominion','Drain 1.5 mana per second into ward at 2:1, keeping a 70% unreserved-mana reserve. Ward still decays by at least 2 per second. +8 maximum mana.',m('mana','flat',8)),conduit:{from:'mana',to:'ward',drainFlat:1.5,ratio:2,floor:.7}},
  ]},
  {id:'undertaker',name:'The Useful Dead',homes:['wis','wil'],training:[
    p('entry','Grave Work','Corpse skills cost 5% less mana.',m('manaCost','more',-.05,['corpse'])),
    p('a','Ashen Hands','6% increased corpse-skill damage.',m('damage','increased',.06,['corpse'])),
    p('b','Keeper\'s Rest','Regenerate 0.3 life per second.',m('lifeRegen','flat',.3)),
  ],powers:[
    event('funeral_clock','The Funeral Clock','Completing a corpse skill removes 0.8s from running summon-skill cooldowns, at most once every 4s.',{trigger:'cast',tags:['corpse'],icd:4,effect:{type:'cooldown',seconds:.8,tags:['summon']}}),
    p('grave_procession','A Longer Procession','Corpse-handling skills reach for one additional corpse; corpse skills cost 15% more mana.',m('corpseBatch','flat',1),m('manaCost','more',.15,['corpse'])),
    p('wakeflame_scribe','Wakeflame Scribe','Each Wakeflame grants 4% increased corpse-skill damage; at three Wakeflames, corpse skills cost 12% less mana.',g('damage','increased',.04,'charge:wakeflame',['corpse']),gate('manaCost','more',-.12,'charge:wakeflame',3,['corpse'])),
    p('mourning_pace','Mourning Pace','After taking a hit, new summons inherit 15% increased movement speed and 10% less damage taken.',m('minionMoveSpeed','increased',.15,undefined,'recentlyHurt'),m('minionDamageTaken','more',-.10,undefined,'recentlyHurt')),
  ]},
  {id:'commander',name:'A Few Trusted Hands',homes:['wis','for'],training:[
    p('entry','Keep Them Close','New summons inherit 6% increased maximum life.',m('minionLife','increased',.06)),
    p('a','Clear Orders','New summons inherit 6% increased damage.',m('minionDamage','increased',.06)),
    p('b','Shared Rations','Summon skills cost 4% less mana.',m('manaCost','more',-.04,['summon'])),
  ],powers:[
    event('delegated_breath','Delegated Breath','Hits carried by your summons restore 2% of your maximum mana, at most once every 3s. Uses the summoning skill\'s context.',{trigger:'hit',tags:['summon'],minionCarry:true,icd:3,effect:{type:'restore',resource:'mana',pctMax:.02}}),
    p('close_formation','Close Formation','New summons use a defensive leash and inherit 12% less damage taken, but deal 8% less damage.',m('minionGuard','flat',1),m('minionDamageTaken','more',-.12),m('minionDamage','more',-.08)),
    p('companions_courage','Companions\' Courage','+8 maximum endurance; each living summon grants +1 maximum endurance, up to the shared summon-count cap.',m('endurance','flat',8),g('endurance','flat',1,'minions')),
    p('keeper_echo','Keeper\'s Echo','Gain flat thorns equal to 0.4% of your flat maximum life baseline; after being healed, new summons inherit 12% increased damage.',link('thorns','life',.004),m('minionDamage','increased',.12,undefined,'recentlyHealed')),
  ]},
  {id:'mechanist',name:'Fight beside the Machine',homes:['dex','str'],training:[
    p('entry','Set the Tools','6% increased construct damage.',m('damage','increased',.06,['construct'])),
    p('a','Strike the Gap','6% increased melee damage.',m('damage','increased',.06,['melee'])),
    p('b','Workshop Footing','+6 maximum poise.',m('poise','flat',6)),
  ],powers:[
    event('trap_hammer','Trap, Then Hammer','Completing a trap skill prepares your next melee hit within 5s: 30% increased poise damage. Can prepare once every 4s.',{trigger:'cast',tags:['trap'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_trap_hammer',duration:5,consumeOn:{on:'hit',tags:['melee']},mods:[m('poiseDamage','increased',.30,['melee'])]}}}),
    p('taut_geometry','Taut Geometry','20% increased tether damage; construct skills cost 8% more mana. Requires a tether-producing skill.',m('tetherDamage','increased',.20),m('manaCost','more',.08,['construct'])),
    p('planted_workshop','Planted Workshop','After standing still for 2 whole seconds, constructs gain 20% increased damage and cost 8% less mana.',gate('damage','increased',.20,'still',2,['construct']),gate('manaCost','more',-.08,'still',2,['construct'])),
    p('siege_saboteur','Siege Saboteur','15% more damage against immobile bodies and 12% more damage against anchored monster parts.',m('siegebreaker','flat',.15),m('limbreaver','flat',.12)),
  ]},
  {id:'spellweaver',name:'Blade and Formula',homes:['int','str'],training:[
    p('entry','Practice Both','4% increased attack and spell damage.',m('damage','increased',.04,['attack']),m('damage','increased',.04,['spell'])),
    p('a','A Quick Formula','4% increased cast speed.',m('castSpeed','increased',.04)),
    p('b','A Measured Breath','+6 maximum mana.',m('mana','flat',6)),
  ],powers:[
    event('spell_hunger','The Spell Hungers for Steel','Completing a spell prepares your next attack hit within 5s: +2% life leech and +15% critical multiplier. Can prepare once every 4s.',{trigger:'cast',tags:['spell'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_spell_hunger',duration:5,consumeOn:{on:'hit',tags:['attack']},mods:[m('lifeLeech','flat',.02,['attack']),m('critMulti','flat',.15,['attack'])]}}}),
    p('mana_in_the_blade','Mana in the Blade','Attack hits gain flat lightning damage equal to 1% of your flat maximum mana baseline; attacks cost 10% more mana.',link('addedLightning','mana',.01,['attack']),m('manaCost','more',.10,['attack'])),
    p('three_arts','Three Arts, One Hand','While your recent sequence is varied: 15% increased spell damage and +2 attack life on hit.',m('damage','increased',.15,['spell'],'comboVaried'),m('lifeOnHit','flat',2,['attack'],'comboVaried')),
    p('borrowed_faces','Borrowed Faces','Store one additional captured mimic art; possession skills last 15% longer. Requires the corresponding mimic or possession skill.',m('mimicBank','flat',1),m('possessDuration','increased',.15,['possession'])),
  ]},
  {id:'fortune',name:'Calculated Fortune',homes:['prw','int'],training:[
    p('entry','Know the Odds','+4% critical strike multiplier.',m('critMulti','flat',.04)),
    p('a','Read the Dice','+3% lucky hit chance.',m('luckyChance','flat',.03)),
    p('b','Stay for Another Hand','+6 maximum life.',m('life','flat',6)),
  ],powers:[
    event('missed_jackpot','A Missed Jackpot','A noncritical hit grants +8% critical chance for 3s, at most once every 4s.',{trigger:'hit',noCrit:true,icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_missed_jackpot',duration:3,mods:[m('critChance','flat',.08)]}}}),
    p('wide_dice','Wide Dice','Widen hit damage ranges by 30% around their midpoint; +12% lucky hit chance.',m('damageSpread','flat',.30),m('luckyChance','flat',.12)),
    p('one_more_echo','One More Echo','Allow one additional layer of triggered effects under the shared depth and falloff limits; 8% less damage.',m('procDepth','flat',1),m('damage','more',-.08)),
    p('fury_dividend','Fury Dividend','At three or more Fury charges: +15% critical multiplier and 10% increased skill-charge recovery.',gate('critMulti','flat',.15,'charge:fury',3),gate('skillChargeRate','increased',.10,'charge:fury',3)),
  ]},
  {id:'explorer',name:'The World Is a Weapon',homes:['wil','wis'],training:[
    p('entry','A Steady Lamp','5% slower light drain.',m('survivalEase_light','flat',.05)),
    p('a','Sure Footing','4% increased movement speed.',m('moveSpeed','increased',.04)),
    p('b','Deep Breath','5% slower breath drain.',m('survivalEase_breath','flat',.05)),
  ],powers:[
    event('break_for_breath','Break for Breath','Breaking a brittle terrain surface heals 5 life, at most once every 4s.',{trigger:'surface',icd:4,effect:{type:'heal',flat:5}}),
    p('lantern_pilgrim','Lantern Pilgrim','10% slower light and soul drain; while not hit recently, 5% increased movement speed.',m('survivalEase_light','flat',.10),m('survivalEase_soul','flat',.10),m('moveSpeed','increased',.05,undefined,'notHurtRecently')),
    p('trample_weeds','Trample the Weeds','+12 trample-only mass and one additional ply torn from plied bodies per hit. Your resistance to shoves is unchanged.',m('trample','flat',12),m('plyRend','flat',1)),
    p('rainbound','Rainbound Hunter','Against wet enemies: +12% critical chance with lightning hits and 15% increased poise damage.',m('critChance','flat',.12,['lightning','vs:wet']),m('poiseDamage','increased',.15,['vs:wet'])),
  ]},
];
