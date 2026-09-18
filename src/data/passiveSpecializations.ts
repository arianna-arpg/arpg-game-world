// Specific schools compose shared modifiers; no runtime code reads passive ids.
import {mod as m, gaugeGateMod as gate, type Modifier, type SkillTag} from '../engine/stats';
import {registerVictimDistanceBand} from '../engine/victim';
import {registerProc, type ProcDef} from './procs';
import type {PassiveChoiceOption} from './passiveChoices';
import type {PassiveDiscipline} from './passiveWeave';
import './minionFamilies';
export const SPECIALIZATION_BANDS = [
  {id:'closeRing', label:'against enemies less than 120 units away', min:0, max:120},
  {id:'middleRing', label:'against enemies 120 to less than 300 units away', min:120, max:300},
  {id:'farRing', label:'against enemies at least 300 units away', min:300, max:Infinity},
];
for (const b of SPECIALIZATION_BANDS) registerVictimDistanceBand(b.id,b.label,b.min,b.max);
export type SpecializationPower = PassiveChoiceOption & {keystone?:true};
export interface Specialization extends PassiveDiscipline {powers:SpecializationPower[]}
const p=(id:string,name:string,description:string,...mods:Modifier[]):SpecializationPower=>({id,name,description,mods});
const k=(id:string,name:string,description:string,...mods:Modifier[]):SpecializationPower=>({...p(id,name,description,...mods),keystone:true});
export const SPECIALIZATION_PROCS:ProcDef[]=[];
function prepare(id:string,name:string,from:SkillTag,to:SkillTag,description:string,mods:Modifier[]):SpecializationPower {
  const proc:ProcDef={id:'spec_'+id,name,color:'#cbb3ed',trigger:'cast',tags:[from],icd:2,
    effect:{type:'buff',buff:{type:'buff',id:'spec_'+id,duration:5,consumeOn:{on:'hit',tags:[to]},mods}}};
  registerProc(proc);SPECIALIZATION_PROCS.push(proc);
  return p(id,name,description+' Completing the first skill has a 95% chance to prepare the next matching hit within 5s, at most once every 2s.',m('proc_'+proc.id,'flat',1));
}
export const PASSIVE_SPECIALIZATIONS:Specialization[]=[];
const add=(id:string,name:string,homes:[string,string],training:Specialization['training'],powers:SpecializationPower[])=>PASSIVE_SPECIALIZATIONS.push({id,name,homes,training,powers});
for(const [element,opposite,title,ailment] of [
  ['fire','cold','Ember','burn'],['cold','lightning','Rime','chill'],['lightning','fire','Storm','shock'],
] as const){
  add(element,title+' Studies',['int','wil'],[
    p('entry',title+' Practice',`8% increased ${element} damage.`,m('damage','increased',.08,[element])),
    p('a',title+' Memory',`6% increased ${element} ailment magnitude.`,m('statusMagnitude','increased',.06,[element])),
    p('b',title+' Shelter',`+5% ${element} resistance.`,m(element+'Res','flat',.05)),
  ],[
    p('pressure',title+' Pressure',`+5% ${element} penetration; +8% chance to inflict ${ailment}.`,m(element+'Pen','flat',.05),m('apply_'+ailment,'flat',.08)),
    prepare(element+'_relay',title+' Relay',element,opposite,`${element} skills prepare your next ${opposite} hit for 22% more damage.`,[m('damage','more',.22,[opposite])]),
    k('devotion',title+' Devotion',`25% more ${element} damage; 15% less ${opposite} damage. +1% maximum ${element} resistance.`,m('damage','more',.25,[element]),m('damage','more',-.15,[opposite]),m(element+'ResMax','flat',.01)),
  ]);
}
add('melee','Inside the Guard',['str','fin'],[
  p('entry','Close Practice','8% increased melee damage.',m('damage','increased',.08,['melee'])),
  p('a','Measured Edge','6% increased melee range.',m('meleeReach','increased',.06)),
  p('b','Braced Impact','6% increased melee poise damage.',m('poiseDamage','increased',.06,['melee'])),
],[
  p('crowding','Crowding Blows','Melee hits within 120 units gain +4 life on hit and 15% increased poise damage. Distance is measured between centers.',m('lifeOnHit','flat',4,['melee','vs:closeRing']),m('poiseDamage','increased',.15,['melee','vs:closeRing'])),
  prepare('blade_to_spell','Blade to Incantation','melee','spell','Melee skills prepare your next spell hit for +18% critical chance.',[m('critChance','flat',.18,['spell'])]),
  k('short_blade','The Short Blade','20% less melee range; 25% more melee damage within 120 units, measured between centers.',m('meleeReach','more',-.20),m('damage','more',.25,['melee','vs:closeRing'])),
]);
add('spell','Woven Incantations',['wis','int'],[
  p('entry','Spell Practice','8% increased spell damage.',m('damage','increased',.08,['spell'])),
  p('a','Careful Words','Spell skills cost 4% less mana.',m('manaCost','more',-.04,['spell'])),
  p('b','Spoken Rhythm','3% increased spell cast speed.',m('castSpeed','increased',.03,['spell'])),
],[
  prepare('spell_to_blade','Incantation to Blade','spell','melee','Spell skills prepare your next melee hit for 22% more damage.',[m('damage','more',.22,['melee'])]),
  p('reserve','Unspent Vocabulary','At full mana: +12% spell critical chance. +12 maximum mana.',m('critChance','flat',.12,['spell'],'fullMana'),m('mana','flat',12)),
  p('syntax','Long Syntax','Duration spells have 18% increased effect duration and cost 8% less mana.',m('effectDuration','increased',.18,['spell','duration']),m('manaCost','more',-.08,['spell','duration'])),
]);
add('ranged','The Drawn Horizon',['dex','prw'],[
  p('entry','Ranged Practice','8% increased projectile attack damage.',m('damage','increased',.08,['attack','projectile'])),
  p('a','Quick Flight','6% increased projectile speed.',m('projectileSpeed','increased',.06)),
  p('b','True Aim','+25 accuracy.',m('accuracy','flat',25)),
],[
  p('interval','The Hunting Interval','Projectile attacks against enemies 120 to less than 300 units away gain +12% critical chance.',m('critChance','flat',.12,['attack','projectile','vs:middleRing'])),
  p('distant','Distant Blood','Projectile hits at least 300 units away gain +2% life leech and 15% increased damage.',m('lifeLeech','flat',.02,['projectile','vs:farRing']),m('damage','increased',.15,['projectile','vs:farRing'])),
  k('heavy_shaft','Heavy Shafts','Projectiles travel 25% slower; projectile attacks deal 25% more damage and gain one pierce.',m('projectileSpeed','more',-.25),m('damage','more',.25,['projectile','attack']),m('pierceCount','flat',1,['projectile','attack'])),
]);
for(const [mode,title] of [['instant','The Quick Word'],['timed','The Deliberate Word'],['channel','The Unbroken Word']] as const){
  const tag:SkillTag=`cast:${mode}`;
  add(mode,title,['wis','prw'],[
    p('entry',title+' Practice',`8% increased damage with ${mode} skills.`,m('damage','increased',.08,[tag])),
    p('a',title+' Economy',`${mode} skills cost 4% less mana.`,m('manaCost','more',-.04,[tag])),
    p('b',title+' Span',`6% increased effect duration with ${mode} skills.`,m('effectDuration','increased',.06,[tag])),
  ],mode==='channel'?[
    p('ramp','Growing Current','Channels gain 8% more damage per second held through the native channel ramp, capped at +150%.',m('channelRamp','flat',.08)),
    p('barbs','Thorned Current','+12 channelled thorns; +10 maximum poise.',m('channelThorns','flat',12),m('poise','flat',10)),
    k('narrow_current','Narrow Current','25% less area radius for channel skills; 25% more channel damage.',m('aoeRadius','more',-.25,[tag]),m('damage','more',.25,[tag])),
  ]:mode==='timed'?[
    prepare('deliberate_release','Deliberate Release',tag,'cast:instant','Timed skills prepare your next instant hit for 25% more damage.',[m('damage','more',.25,['cast:instant'])]),
    p('still_recital','Still Recital','After 2 whole stationary seconds, timed spells gain +12% critical chance.',gate('critChance','flat',.12,'still',2,[tag,'spell'])),
    k('long_recital','Long Recital','Timed spells cast 20% slower and deal 30% more damage.',m('castSpeed','more',-.20,[tag,'spell']),m('damage','more',.30,[tag,'spell'])),
  ]:[
    prepare('quick_preparation','Quick Preparation',tag,'cast:timed','Instant skills prepare your next timed hit for +20% critical multiplier.',[m('critMulti','flat',.20,['cast:timed'])]),
    p('quick_recovery','Quick Recovery','Instant skills recover cooldowns 15% faster and cost 8% less mana.',m('cooldownRecovery','increased',.15,[tag]),m('manaCost','more',-.08,[tag])),
    p('quick_shelter','Brief Shelter','Instant healing and absorb effects are 18% stronger.',m('healPower','increased',.18,[tag]),m('absorbPower','increased',.18,[tag])),
  ]);
}
// Family and exact-body scopes deliberately differ. A mixed skeletal-mage
// pool receives family limits, while each born mage receives only its variant.
for(const [id,title,tag] of [
  ['swarm','Swarm','minion:swarm'],['skeleton','Skeleton','minion:skeleton'],
  ['archer','Skeleton Archer','body:skeleton_archer'],['mage','Skeletal Mage','minion:skeletal_mage'],
  ['golem','Golem','minion:golem'],['stone','Stone Golem','body:stone_golem'],
  ['bone','Bone Golem','body:bone_golem'],['flame','Fire Golem','body:fire_golem'],
  ['ice','Ice Golem','body:ice_golem'],['blood','Blood Golem','body:blood_golem'],
] as const){
  const family=['swarm','skeleton','golem','mage'].includes(id);
  const specialty:Record<string,SpecializationPower>={
    swarm:p('wingbeat','Shared Wingbeat','Swarm minions gain 20% increased movement speed and 10% increased damage.',m('minionMoveSpeed','increased',.20,[tag]),m('minionDamage','increased',.10,[tag])),
    skeleton:p('marrow','Mending Marrow','Skeleton minions regenerate 1% maximum life per second and gain 20% increased life.',m('minionRegenPct','flat',.01,[tag]),m('minionLife','increased',.20,[tag])),
    archer:p('quiver','Unceasing Quivers','Skeleton archers act 15% faster and move 10% faster.',m('minionHaste','increased',.15,[tag]),m('minionMoveSpeed','increased',.10,[tag])),
    mage:p('academy','Grave Faculty','Skeletal mages act 15% faster and gain 10% increased life.',m('minionHaste','increased',.15,[tag]),m('minionLife','increased',.10,[tag])),
    golem:p('renewal','Living Masonry','Golems regenerate 1.5% maximum life per second.',m('minionRegenPct','flat',.015,[tag])),
    stone:p('granite','Walking Granite','Stone golems take 12% less damage and move 10% slower.',m('minionDamageTaken','more',-.12,[tag]),m('minionMoveSpeed','more',-.10,[tag])),
    bone:p('marrow_wall','Marrow Wall','Bone golems gain 30% increased life and regenerate 1% maximum life per second.',m('minionLife','increased',.30,[tag]),m('minionRegenPct','flat',.01,[tag])),
    flame:p('furnace','Walking Furnace','Fire golems deal 20% more damage but have 10% less life.',m('minionDamage','more',.20,[tag]),m('minionLife','more',-.10,[tag])),
    ice:p('glacier','Mobile Glacier','Ice golems move 25% faster and take 8% less damage.',m('minionMoveSpeed','increased',.25,[tag]),m('minionDamageTaken','more',-.08,[tag])),
    blood:p('pulse','Sanguine Pulse','Blood golems regenerate 2% maximum life per second and act 8% faster.',m('minionRegenPct','flat',.02,[tag]),m('minionHaste','increased',.08,[tag])),
  };
  const homes:Record<string,[string,string]>={swarm:['cha','prw'],skeleton:['wis','for'],archer:['dex','cha'],mage:['int','wis'],golem:['cha','str'],stone:['for','str'],bone:['wil','for'],flame:['int','str'],ice:['wis','fin'],blood:['wil','cha']};
  add(id,title+' Husbandry',homes[id],[
    p('entry',title+' Force',`${title} minions gain 8% increased damage.`,m('minionDamage','increased',.08,[tag])),
    p('a',title+' Vitality',`${title} minions gain 8% increased life.`,m('minionLife','increased',.08,[tag])),
    p('b',title+' Pursuit',`${title} minions gain 6% increased movement speed.`,m('minionMoveSpeed','increased',.06,[tag])),
  ],[
    specialty[id],
    family?p('cohort',title+' Cohort',`+${id==='swarm'?3:1} maximum minions for summons entirely in the ${title.toLowerCase()} family. Existing shared pools and reservation costs still apply.`,m('minionMaxCount','flat',id==='swarm'?3:1,[tag]))
      :p('veteran',title+' Veteran',`${title} minions gain 18% increased damage and 12% increased life.`,m('minionDamage','increased',.18,[tag]),m('minionLife','increased',.12,[tag])),
    p('formation',title+' Formation',`${title} minions gain 15% increased life and 8% increased action speed, but move 10% slower.`,m('minionLife','increased',.15,[tag]),m('minionHaste','increased',.08,[tag]),m('minionMoveSpeed','more',-.10,[tag])),
  ]);
}
for(const [id,title,scope] of [['close','Inner Circle','vs:closeRing'],['middle','Measured Orbit','vs:middleRing'],['far','Outer Horizon','vs:farRing']] as const){
  const range=id==='close'?'less than 120':id==='middle'?'120 to less than 300':'at least 300';
  add(id,title,['fin','int'],[
    p('entry',title+' Practice',`8% increased damage against enemies ${range} units away. Center-to-center distance.`,m('damage','increased',.08,[scope])),
    p('a',title+' Reach','5% increased area radius.',m('aoeRadius','increased',.05)),
    p('b',title+' Accuracy',`+30 accuracy against enemies ${range} units away.`,m('accuracy','flat',30,[scope])),
  ],[
    p('pressure',title+' Pressure',`Against enemies ${range} units away: +10% ailment chance and +12% critical multiplier.`,m('statusChance','flat',.10,[scope]),m('critMulti','flat',.12,[scope])),
    p('breadth',title+' Breadth',`12% increased area radius; 12% increased area damage against enemies ${range} units away.`,m('aoeRadius','increased',.12),m('damage','increased',.12,['aoe',scope])),
    k('focus',title+' Focus',`20% less area radius; 25% more area damage against enemies ${range} units away.`,m('aoeRadius','more',-.20),m('damage','more',.25,['aoe',scope])),
  ]);
}
add('bulwark','The Recovering Wall',['for','str'],[
  p('entry','Layered Plates','8% increased armor.',m('armor','increased',.08)),
  p('a','Steady Breath','+6 maximum poise.',m('poise','flat',6)),
  p('b','Repair the Wall','+0.2% maximum life regenerated per second.',m('lifeRegenPct','flat',.002)),
],[
  p('broken','Bend Before Breaking','While poise is broken: 12% less damage taken and 15% less damage dealt.',m('damageTaken','more',-.12,undefined,'poiseBroken'),m('damage','more',-.15,undefined,'poiseBroken')),
  p('standing','Standing Promise','While poised: +4% block chance. +8 maximum poise.',m('blockChance','flat',.04,undefined,'poised'),m('poise','flat',8)),
  p('mending','Mending Interval','After standing still for 2 whole seconds: +0.8% maximum life regenerated per second and 12% increased armor.',gate('lifeRegenPct','flat',.008,'still',2),gate('armor','increased',.12,'still',2)),
]);
add('veil','Between Wounds',['wil','wis'],[
  p('entry','Thin Veil','8% increased energy shield.',m('energyShield','increased',.08)),
  p('a','Gathered Shelter','6% increased ward gained.',m('wardGain','increased',.06)),
  p('b','Quiet Reserve','+8 maximum mana.',m('mana','flat',8)),
],[
  p('whole','The Whole Veil','At full energy shield: +10% critical multiplier. 12% increased energy shield.',m('critMulti','flat',.10,undefined,'fullEs'),m('energyShield','increased',.12)),
  p('thread','A Remaining Thread','At low energy shield: 20% increased ward gained and 15% increased healing received.',m('wardGain','increased',.20,undefined,'lowEs'),m('healTaken','increased',.15,undefined,'lowEs')),
  k('fragile','Fragile Continuity','35% increased ward gained; 20% less maximum life. Ward decays 15% slower.',m('wardGain','increased',.35),m('life','more',-.20),m('wardDecay','more',-.15)),
]);
add('rhythm','Alternating Footwork',['prw','dex'],[
  p('entry','Changing Step','6% increased damage after a varied combo.',m('damage','increased',.06,undefined,'comboVaried')),
  p('a','Repeated Step','6% increased damage after repeating a combo.',m('damage','increased',.06,undefined,'comboRepeated')),
  p('b','Long Beat','4% increased effect duration.',m('effectDuration','increased',.04)),
],[
  prepare('advance','Advance and Aim','movement','projectile','Movement skills prepare your next projectile hit for +20% critical multiplier.',[m('critMulti','flat',.20,['projectile'])]),
  prepare('return','Aim and Advance','projectile','movement','Projectile skills prepare your next movement-skill hit for 25% more damage.',[m('damage','more',.25,['movement'])]),
  p('cadence','Two Cadences','After a varied combo: 12% increased damage. After repetition: +2 life on hit. The current combo chooses the benefit.',m('damage','increased',.12,undefined,'comboVaried'),m('lifeOnHit','flat',2,undefined,'comboRepeated')),
]);
