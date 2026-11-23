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
  return p(id,name,description,m(`proc_${proc.id}`,'flat',1),...mods);
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
    p('b','Road Cadence','5% increased attack and cast speed while moving.',m('attackSpeed','increased',.05,undefined,'moving'),m('castSpeed','increased',.05,undefined,'moving')),
  ],powers:[
    event('empty_stride','Run on Empty','Using a movement skill while on low mana restores 12% of your maximum mana.',{trigger:'cast',tags:['movement'],when:'lowMana',icd:3,effect:{type:'restore',resource:'mana',pctMax:.12}}),
    p('pilgrim_blow','The Pilgrim\'s Blow','After using a movement skill, gain +28% critical strike multiplier and 10% increased attack and cast speed.',m('critMulti','flat',.28,undefined,'recentlyMoved'),m('attackSpeed','increased',.10,undefined,'recentlyMoved'),m('castSpeed','increased',.10,undefined,'recentlyMoved')),
    p('passing_shelter','Passing Shelter','+12 maximum insight; while moving, gain 18% increased insight efficiency and 6% increased evasion.',m('insight','flat',12),m('insightEfficiency','increased',.18,undefined,'moving'),m('evasion','increased',.06,undefined,'moving')),
    p('running_reserves','Running Reserves','After using a movement skill, gain 20% increased skill-charge recovery; movement skills cost 10% less mana.',m('skillChargeRate','increased',.20,undefined,'recentlyMoved'),m('manaCost','more',-.10,['movement'])),
  ]},
  {id:'rooted',name:'The Unmoving Eye',homes:['int','for'],training:[
    p('entry','Take Root','8% increased armor while stationary.',m('armor','increased',.08,undefined,'stationary')),
    p('a','Anchored Ward','+10 maximum energy shield.',m('energyShield','flat',10)),
    p('b','Quiet Shelter','+8 maximum insight.',m('insight','flat',8)),
  ],powers:[
    event('still_mercy','The Still Hand','While stationary, regenerate 1% of maximum life per second. Becoming stationary also grants 15% increased armor and 20% increased healing received for 4 seconds.',{trigger:'condition',condition:'stationary',icd:6,effect:{type:'buff',buff:{type:'buff',id:'weave_still_mercy',duration:4,mods:[m('armor','increased',.15),m('healTaken','increased',.20)]}}},m('lifeRegenPct','flat',.01,undefined,'stationary')),
    p('rooted_read','Read Without Moving','+14 maximum insight. Shifts 50% of insight generation from movement to standing still; 15% less movement speed.',m('insight','flat',14),m('insightInversion','flat',.5),m('moveSpeed','more',-.15)),
    p('three_beat_siege','Three Beats of Silence','After standing still for 3 seconds, gain 22% increased projectile damage, +8% armor penetration, and +8% elemental penetration.',gate('damage','increased',.22,'still',3,['projectile']),gate('armorPen','flat',.08,'still',3),gate('firePen','flat',.08,'still',3),gate('coldPen','flat',.08,'still',3),gate('lightningPen','flat',.08,'still',3)),
    p('rooted_channel','Rooted Current','While stationary, channeled skills gain 25% increased turn speed; while channeling, gain 14% increased armor and energy shield.',m('channelTurnRate','increased',.25,undefined,'stationary'),m('armor','increased',.14,undefined,'channeling'),m('energyShield','increased',.14,undefined,'channeling')),
  ]},
  {id:'skirmisher',name:'The Unfair Angle',homes:['fin','prw'],training:[
    p('entry','Find the Opening','+20 accuracy.',m('accuracy','flat',20)),
    p('a','Turn the Blade','+8% critical strike multiplier.',m('critMulti','flat',.08)),
    p('b','Leave No Mark','8% increased evasion.',m('evasion','increased',.08)),
  ],powers:[
    event('airborne_shelter','Shelter in the Break','Hitting an immobilized, stunned, frozen, or rooted enemy grants ward equal to 6% of your maximum life.',{trigger:'hit',vs:['hardCC'],icd:3,effect:{type:'ward',pctMaxLife:.06}}),
    p('ambush_surgeon','Ambush Surgeon','Against unaware enemies: +25% ailment chance and +35% critical strike multiplier.',m('statusChance','flat',.25,['vs:unaware']),m('critMulti','flat',.35,['vs:unaware'])),
    p('catch_the_cast','Catch the Incantation','Against casting enemies: +15% critical strike chance and 30% increased poise damage.',m('critChance','flat',.15,['vs:casting']),m('poiseDamage','increased',.30,['vs:casting'])),
    p('cowards_cut','The Coward\'s Cut','12% more damage against faltering enemies; against fleeing enemies, gain +2% mana leech.',m('quailbane','flat',.12),m('manaLeech','flat',.02,['vs:fleeing'])),
  ]},
  {id:'grappler',name:'Bodies as Weapons',homes:['str','for'],training:[
    p('entry','Learn the Grip','+8% grip strength.',m('gripPower','flat',.08)),
    p('a','Commit the Throw','8% increased damage with throw skills.',m('damage','increased',.08,['throw'])),
    p('b','Braced Hips','6% increased weight.',m('weight','increased',.06)),
  ],powers:[
    event('wall_fury','The Wall Answers','Knocking an enemy into terrain grants 1 Fury charge, up to 3 charges.',{trigger:'collision',icd:3,effect:{type:'gainCharge',charge:'fury',amount:1,max:3}}),
    p('loose_foundations','Loose Foundations','+15% shove force; 15% more damage against uprooted enemies.',m('shoveAuthority','flat',.15),m('uprooter','flat',.15)),
    p('heavy_hands','Heavy Hands, Braced Stance','+25% grip strength, 15% increased weight, and 12% increased melee poise damage.',m('gripPower','flat',.25),m('weight','increased',.15),m('poiseDamage','increased',.12,['melee'])),
    p('borrowed_projectile','A Borrowed Projectile','+25% collision damage and +40 knockback strength; +15% critical strike chance against immobilized or stunned enemies.',m('critChance','flat',.15,['vs:hardCC']),m('impactDamage','flat',.25),m('knockback','flat',40)),
  ]},
  {id:'marksman',name:'Unlikely Trajectories',homes:['dex','fin'],training:[
    p('entry','Read the Flight','6% increased projectile damage.',m('damage','increased',.06,['projectile'])),
    p('a','Wide Fletching','6% increased projectile size.',m('projectileSize','increased',.06)),
    p('b','Aim Again','+20 accuracy.',m('accuracy','flat',20)),
  ],powers:[
    event('rain_collector','Piercing Recovery','Projectile hits against enemies suffering from a damaging ailment restore 4% of your maximum mana.',{trigger:'hit',tags:['projectile'],vs:['afflicted'],icd:3,effect:{type:'restore',resource:'mana',pctMax:.04}}),
    p('bank_shot','Bank Shot','Projectiles ricochet 1 additional time off terrain; 8% less projectile damage.',m('projBounce','flat',1),m('damage','more',-.08,['projectile'])),
    p('slow_hunter','The Patient Missile','Projectiles home toward enemies and have 15% increased size, but travel 15% slower.',m('homingPower','flat',.6),m('projectileSize','increased',.15),m('projectileSpeed','more',-.15)),
    p('thread_the_crowd','Thread the Crowd','While 3 or more enemies are nearby, projectiles pierce 1 additional target and travel 12% faster.',gate('pierceCount','flat',1,'foes:near',3),gate('projectileSpeed','increased',.12,'foes:near',3)),
  ]},
  {id:'munitions',name:'The Last Cartridge',homes:['dex','prw'],training:[
    p('entry','Rack and Breathe','8% increased reload speed.',m('reloadSpeed','increased',.08)),
    p('a','Careful Loading','6% increased munition damage.',m('damage','increased',.06,['munition'])),
    p('b','Spare Powder','Munition skills cost 4% less mana.',m('manaCost','more',-.04,['munition'])),
  ],powers:[
    event('rack_memory','Remember the First Shot','Reloading empowers your next munition hit within 6 seconds to deal 20% more damage.',{trigger:'cast',tags:['reload'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_rack_memory',duration:6,consumeOn:{on:'hit',tags:['munition']},mods:[m('damage','more',.20,['munition'])]}}}),
    p('last_word','Keep the Last Word','25% increased final-round damage; 8% less reload speed.',m('finalRoundDamage','increased',.25),m('reloadSpeed','more',-.08)),
    p('surplus_round','One More in the Chamber','Munition skills gain +1 maximum charge but recover charges 10% slower.',m('skillCharges','flat',1,['munition']),m('skillChargeRate','more',-.10,['munition'])),
    p('rack_under_fire','Rack Under Fire','After taking a hit: 25% increased reload speed and 14% increased evasion.',m('reloadSpeed','increased',.25,undefined,'recentlyHurt'),m('evasion','increased',.14,undefined,'recentlyHurt')),
  ]},
  {id:'alchemist',name:'The Traveling Apothecary',homes:['wis','cha'],training:[
    p('entry','Measured Draught','6% increased flask restoration.',m('restorePower','increased',.06,['flask'])),
    p('a','Careful Pour','3% increased flask effect duration.',m('effectDuration','increased',.03,['flask'])),
    p('b','A Small Reserve','+6 maximum mana.',m('mana','flat',6)),
  ],powers:[
    event('red_glass','Red Glass Shelter','Picking up a life orb grants ward equal to 4% of your maximum life.',{trigger:'orbPickup',orb:'life',icd:3,effect:{type:'ward',pctMaxLife:.04}}),
    p('emergency_sip','Emergency Sip','Flask skills can be used during other actions without interrupting them, but restore 8% less.',m('reflex','flat',1,['flask']),m('restorePower','more',-.08,['flask'])),
    p('prepared_draught','Prepared Draught','Bank up to 1 flask use at full life or mana to trigger automatically when you take life damage; flasks restore 10% less.',m('pourPrime','flat',1,['flask']),m('restorePower','more',-.10,['flask'])),
    p('surge_bargain','The Surge Bargain','Upfront flask recovery is 20% stronger, while over-time flask recovery is 15% weaker.',m('pourPower_surge','more',.20,['flask']),m('pourPower_settle','more',-.15,['flask'])),
  ]},
  {id:'affliction',name:'The Patient Wound',homes:['wil','fin'],training:[
    p('entry','Open a Wound','+3% ailment chance.',m('statusChance','flat',.03)),
    p('a','Deepen the Wound','6% increased ailment magnitude.',m('statusMagnitude','increased',.06)),
    p('b','Keep Your Distance','6% increased evasion.',m('evasion','increased',.06)),
  ],powers:[
    event('blood_glass','Blood into Vigor','+10% chance to inflict bleed. Inflicting bleed restores 4% of your maximum mana.',{trigger:'statusApply',status:'bleed',icd:3,effect:{type:'restore',resource:'mana',pctMax:.04}},m('apply_bleed','flat',.10)),
    p('precise_infection','Precise Infection','Damaging ailments inherit 35% of your critical strike chance; +10% critical multiplier.',m('dotCrit','flat',.35),m('critMulti','flat',.10)),
    p('carrier_blow','The Carrier Blow','Converts 20% of hit damage into added damage for damaging ailments inflicted by the hit, at 25% increased affliction yield.',m('hitToAffliction','flat',.20),m('afflictionYield','increased',.25)),
    p('half_burn','Half a Burning Promise','Stores 25% of ignite damage to detonate when the ignite expires; 10% increased fire ailment magnitude.',m('igniteToBomb','flat',.25),m('statusMagnitude','increased',.10,['fire'])),
  ]},
  {id:'martyr',name:'Tempered Endurance',homes:['wil','for'],training:[
    p('entry','Endure the Sting','+5% ailment resistance; +10 maximum life.',m('ailmentResist','flat',.05),m('life','flat',10)),
    p('a','Braced Flesh','6% increased damage after taking a hit; 6% increased armor.',m('damage','increased',.06,undefined,'recentlyHurt'),m('armor','increased',.06)),
    p('b','Close the Wound','Regenerate 0.8 life per second; 5% increased healing received.',m('lifeRegen','flat',.8),m('healTaken','increased',.05)),
  ],powers:[
    event('thermal_memory','Thermal Memory','12% of fire damage from hits is taken as cold. Taking fire damage from a hit grants +12% cold resistance and +2% maximum cold resistance for 4 seconds.',{trigger:'struck',receivedTypes:['fire'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_thermal_memory',duration:4,mods:[m('coldRes','flat',.12),m('coldResMax','flat',.02)]}}},m('takenAs_fire_cold','flat',.12)),
    p('scar_tissue','Useful Scar Tissue','While suffering from a damaging ailment: 20% increased healing received and +15% critical avoidance.',gate('healTaken','increased',.20,'afflictions',1),gate('critAvoid','flat',.15,'afflictions',1)),
    p('slow_repair','Steady Repair','Recover 22% of life lost to hits over time; 15% increased healing received after taking a hit.',m('recuperate','flat',.22),m('healTaken','increased',.15,undefined,'recentlyHurt')),
    p('empty_shell','The Crucible Fights','Gain 2.5% increased damage and 2% increased armor per 10% missing life.',g('damage','increased',.025,'life:missing'),g('armor','increased',.02,'life:missing')),
  ]},
  {id:'shieldweaver',name:'Glass and Breath',homes:['int','cha'],training:[
    p('entry','A Thin Lattice','+8 maximum energy shield.',m('energyShield','flat',8)),
    p('a','Keep the Spark','6% increased spell damage.',m('damage','increased',.06,['spell'])),
    p('b','Quiet Recharge','8% increased energy-shield recharge rate.',m('esRechargeRate','increased',.08)),
  ],powers:[
    event('unbroken_return','The Unbroken Return','When your energy shield breaks, cleanse all hard crowd control effects.',{trigger:'esBreak',icd:8,effect:{type:'cleanse',hardCC:true}}),
    p('glass_footing','Glass Footing','Gain 20% of your base energy shield as maximum poise; 15% reduced energy shield.',m('esToPoise','flat',.20),m('esForgone','flat',.15)),
    p('full_lattice','A Full Lattice Sings','At full energy shield: +8% spell critical chance. While energy shield is recharging: 12% increased cast speed.',m('critChance','flat',.08,['spell'],'fullEs'),m('castSpeed','increased',.12,undefined,'esRecharging')),
    {...p('ward_distiller','Ward Distiller','+10 maximum energy shield. Drains 5% of current ward per second to restore an equal amount of energy shield.',m('energyShield','flat',10)),conduit:{from:'ward',to:'es',drainPct:.05,ratio:1,floor:0}},
  ]},
  {id:'guard_medic',name:'The Shelter Line',homes:['for','cha'],training:[
    p('entry','Raise a Shelter','6% increased guard strength.',m('guardStrength','increased',.06)),
    p('a','Gentle Hands','6% increased healing power.',m('healPower','increased',.06)),
    p('b','Banked Resolve','+6 maximum endurance.',m('endurance','flat',6)),
  ],powers:[
    event('block_reserve','Borrowed Resolve','+10 maximum endurance. Blocking a hit restores 4 endurance.',{trigger:'block',icd:3,effect:{type:'fortify',flat:4}},m('endurance','flat',10)),
    p('shelter_pulse','Shelter Pulse','While holding a guard, nearby allies regenerate 1.2 life per second. 8% less guard strength.',m('guardMend','flat',1.2),m('guardStrength','more',-.08)),
    p('mercy_after_war','Mercy Under Fire','After taking a hit: 22% increased healing power and 18% increased absorb power.',m('healPower','increased',.22,undefined,'recentlyHurt'),m('absorbPower','increased',.18,undefined,'recentlyHurt')),
    p('overflowing_care','Overflowing Care','Converts 15% of excess healing into a ward on the target; 8% less healing power.',m('overheal','flat',.15),m('healPower','more',-.08)),
  ]},
  {id:'chorus',name:'Voice and Dominion',homes:['cha','str'],training:[
    p('entry','Learn the Refrain','6% increased song effect duration.',m('effectDuration','increased',.06,['song'])),
    p('a','Carry Your Voice','6% increased warcry area.',m('aoeRadius','increased',.06,['warcry'])),
    p('b','Breathe Deeply','Regenerate 0.2 mana per second.',m('manaRegen','flat',.2)),
  ],powers:[
    event('warcry_verse','The Cry before the Song','Using a warcry grants 25% increased song area of effect for 5 seconds.',{trigger:'cast',tags:['warcry'],icd:5,effect:{type:'buff',buff:{type:'buff',id:'weave_warcry_verse',duration:5,mods:[m('aoeRadius','increased',.25,['song'])]}}}),
    p('held_authority','Held Authority','Gain 0.05 flat damage per point of reserved mana; 12% increased aura and song area of effect.',m('reservedDamage','flat',.05),m('aoeRadius','increased',.12,['aura']),m('aoeRadius','increased',.12,['song'])),
    p('third_voice','The Third Voice','While you have 2 or more Verse charges: 18% increased song and warcry area of effect and 20% increased warcry cooldown recovery.',gate('aoeRadius','increased',.18,'charge:verse',2,['song']),gate('aoeRadius','increased',.18,'charge:verse',2,['warcry']),gate('cooldownRecovery','increased',.20,'charge:verse',2,['warcry'])),
    {...p('quiet_dominion','Quiet Dominion','+8 maximum mana. While above 70% unreserved mana, drains 1.5 mana per second to grant 3 ward per second.',m('mana','flat',8)),conduit:{from:'mana',to:'ward',drainFlat:1.5,ratio:2,floor:.7}},
  ]},
  {id:'undertaker',name:'The Useful Dead',homes:['wis','wil'],training:[
    p('entry','Grave Work','Corpse skills cost 5% less mana.',m('manaCost','more',-.05,['corpse'])),
    p('a','Ashen Hands','6% increased corpse-skill damage.',m('damage','increased',.06,['corpse'])),
    p('b','Keeper\'s Rest','Regenerate 0.3 life per second.',m('lifeRegen','flat',.3)),
  ],powers:[
    event('funeral_clock','The Funeral Clock','Using a corpse skill reduces active summon-skill cooldowns by 0.8 seconds.',{trigger:'cast',tags:['corpse'],icd:4,effect:{type:'cooldown',seconds:.8,tags:['summon']}}),
    p('grave_procession','A Longer Procession','Corpse skills consume or raise 1 additional corpse, but cost 15% more mana.',m('corpseBatch','flat',1),m('manaCost','more',.15,['corpse'])),
    p('wakeflame_scribe','Ashen Scribe','Each living minion grants 3% increased corpse-skill damage; while you have 3 or more minions, corpse skills cost 15% less mana.',g('damage','increased',.03,'minions',['corpse']),gate('manaCost','more',-.15,'minions',3,['corpse'])),
    p('mourning_pace','Mourning Pace','Minions gain 12% increased movement speed and take 8% less damage; while you have 2 or more minions, corpse skills deal 15% increased damage.',m('minionMoveSpeed','increased',.12),m('minionDamageTaken','more',-.08),gate('damage','increased',.15,'minions',2,['corpse'])),
  ]},
  {id:'commander',name:'A Few Trusted Hands',homes:['wis','for'],training:[
    p('entry','Keep Them Close','Minions gain 6% increased maximum life.',m('minionLife','increased',.06)),
    p('a','Clear Orders','Minions gain 6% increased damage.',m('minionDamage','increased',.06)),
    p('b','Shared Rations','Summon skills cost 4% less mana.',m('manaCost','more',-.04,['summon'])),
  ],powers:[
    event('delegated_breath','Delegated Breath','Your minions\' hits restore 2% of your maximum mana.',{trigger:'hit',tags:['summon'],minionCarry:true,icd:3,effect:{type:'restore',resource:'mana',pctMax:.02}}),
    p('close_formation','Close Formation','Minions stay close to defend you and take 12% less damage, but deal 8% less damage.',m('minionGuard','flat',1),m('minionDamageTaken','more',-.12),m('minionDamage','more',-.08)),
    p('companions_courage','Companions\' Courage','+8 maximum endurance, plus +1 maximum endurance per living minion.',m('endurance','flat',8),g('endurance','flat',1,'minions')),
    p('keeper_echo','Keeper\'s Echo','Minions gain 14% increased maximum life and regenerate 1.5% of their maximum life per second. After you are healed, your minions gain 20% increased damage and 12% increased movement speed.',m('minionLife','increased',.14),m('minionRegenPct','flat',.015),m('minionDamage','increased',.20,undefined,'recentlyHealed'),m('minionMoveSpeed','increased',.12,undefined,'recentlyHealed')),
  ]},
  {id:'mechanist',name:'Fight beside the Machine',homes:['dex','str'],training:[
    p('entry','Set the Tools','6% increased construct damage.',m('damage','increased',.06,['construct'])),
    p('a','Strike the Gap','6% increased melee damage.',m('damage','increased',.06,['melee'])),
    p('b','Workshop Footing','+6 maximum poise.',m('poise','flat',6)),
  ],powers:[
    event('trap_hammer','Anvil and Spring','Using a construct skill empowers your next melee hit within 5 seconds to deal 25% more damage and 30% increased poise damage.',{trigger:'cast',tags:['construct'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_trap_hammer',duration:5,consumeOn:{on:'hit',tags:['melee']},mods:[m('damage','more',.25,['melee']),m('poiseDamage','increased',.30,['melee'])]}}}),
    p('taut_geometry','Taut Geometry','25% increased tether damage and 12% increased construct attack and cast speed.',m('tetherDamage','increased',.25),m('constructCastRate','increased',.12)),
    p('planted_workshop','Planted Workshop','After standing still for 2 seconds, constructs deal 20% increased damage and cost 8% less mana.',gate('damage','increased',.20,'still',2,['construct']),gate('manaCost','more',-.08,'still',2,['construct'])),
    p('siege_saboteur','Siege Saboteur','Constructs deal 15% increased damage; 15% more damage against immobile enemies and 12% more damage against targetable monster parts.',m('damage','increased',.15,['construct']),m('siegebreaker','flat',.15),m('limbreaver','flat',.12)),
  ]},
  {id:'spellweaver',name:'Blade and Formula',homes:['int','str'],training:[
    p('entry','Practice Both','4% increased attack and spell damage.',m('damage','increased',.04,['attack']),m('damage','increased',.04,['spell'])),
    p('a','A Quick Formula','4% increased cast speed.',m('castSpeed','increased',.04)),
    p('b','A Measured Breath','+6 maximum mana.',m('mana','flat',6)),
  ],powers:[
    event('spell_hunger','The Spell Hungers for Steel','Casting a spell grants your next attack hit within 5 seconds +2% life leech and +15% critical multiplier.',{trigger:'cast',tags:['spell'],icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_spell_hunger',duration:5,consumeOn:{on:'hit',tags:['attack']},mods:[m('lifeLeech','flat',.02,['attack']),m('critMulti','flat',.15,['attack'])]}}}),
    p('mana_in_the_blade','Mana in the Blade','Attack hits gain added lightning damage equal to 1% of your base maximum mana; attacks cost 10% more mana.',link('addedLightning','mana',.01,['attack']),m('manaCost','more',.10,['attack'])),
    p('three_arts','Three Arts, One Hand','After using three different skills in a row: 15% increased spell damage and +2 life on hit with attacks.',m('damage','increased',.15,['spell'],'comboVaried'),m('lifeOnHit','flat',2,['attack'],'comboVaried')),
    p('borrowed_faces','Woven Steel','12% increased attack and spell damage, 6% increased attack and cast speed, and gain 10% of physical damage as extra lightning damage.',m('damage','increased',.12,['attack']),m('damage','increased',.12,['spell']),m('attackSpeed','increased',.06),m('castSpeed','increased',.06),m('gainAs_physical_lightning','flat',.10)),
  ]},
  {id:'fortune',name:'Calculated Fortune',homes:['prw','int'],training:[
    p('entry','Know the Odds','+4% critical strike multiplier.',m('critMulti','flat',.04)),
    p('a','Read the Dice','+3% lucky hit chance.',m('luckyChance','flat',.03)),
    p('b','Stay for Another Hand','+6 maximum life.',m('life','flat',6)),
  ],powers:[
    event('missed_jackpot','A Missed Jackpot','Landing a non-critical hit grants +8% critical strike chance for 3 seconds.',{trigger:'hit',noCrit:true,icd:4,effect:{type:'buff',buff:{type:'buff',id:'weave_missed_jackpot',duration:3,mods:[m('critChance','flat',.08)]}}}),
    p('wide_dice','Wide Dice','Widens hit damage roll ranges by 30%; +12% lucky hit chance.',m('damageSpread','flat',.30),m('luckyChance','flat',.12)),
    p('one_more_echo','Second Echo','Allows triggered effects to chain 1 additional layer deep; +6% chance to deal double damage.',m('procDepth','flat',1),m('doubleDamageChance','flat',.06)),
    p('fury_dividend','Critical Dividend','If you have dealt a critical strike recently: +18% critical multiplier, +6% lucky hit chance, and 12% increased skill-charge recovery.',m('critMulti','flat',.18,undefined,'recentlyCrit'),m('luckyChance','flat',.06,undefined,'recentlyCrit'),m('skillChargeRate','increased',.12,undefined,'recentlyCrit')),
  ]},
  {id:'explorer',name:'The World Is a Weapon',homes:['wil','wis'],training:[
    p('entry','A Steady Lamp','5% slower light drain.',m('survivalEase_light','flat',.05)),
    p('a','Sure Footing','4% increased movement speed.',m('moveSpeed','increased',.04)),
    p('b','Deep Breath','5% slower breath drain.',m('survivalEase_breath','flat',.05)),
  ],powers:[
    event('break_for_breath','Break for Breath','6% increased movement speed. Breaking a brittle terrain surface restores 18 life.',{trigger:'surface',icd:4,effect:{type:'heal',flat:18}},m('moveSpeed','increased',.06)),
    p('lantern_pilgrim','Lantern Pilgrim','10% slower light and soul drain; while not hit recently, gain 5% increased movement speed.',m('survivalEase_light','flat',.10),m('survivalEase_soul','flat',.10),m('moveSpeed','increased',.05,undefined,'notHurtRecently')),
    p('trample_weeds','Trample the Weeds','+1.5 mass for trampling through lesser foes, 8% increased movement speed, and +40 knockback strength.',m('trample','flat',1.5),m('moveSpeed','increased',.08),m('knockback','flat',40)),
    p('rainbound','Stormbound Hunter','+12% critical strike chance against shocked enemies; +20% critical strike multiplier against chilled enemies.',m('critChance','flat',.12,['vs:shock']),m('critMulti','flat',.20,['vs:chill'])),
  ]},
];
