import { tree, n, life, damage, dr, cap } from './skillTreeBuilder';
import { mod } from '../engine/stats';
import type { CohortSpec } from '../engine/cohortSpec';
import type { SummonSchool } from '../engine/summonArtsSpec';
const tactics=(cohort:Partial<CohortSpec>)=>({summon:{cohort}});
export const SPELLSWORD_SCHOOLS: SummonSchool[] = [
  {id:'fire',name:'Fire',monster:'skeletal_fire_spellsword',primary:'court_twin_cut',signature:'court_fire_arc',trace:'court_fire_arc',conversion:0.6,color:'#ee8750'},
  {id:'cold',name:'Cold',monster:'skeletal_cold_spellsword',primary:'court_twin_cut',signature:'court_frost_ring',trace:'court_frost_ring',conversion:0.6,color:'#91d6ef'},
  {id:'lightning',name:'Lightning',monster:'skeletal_storm_spellsword',primary:'court_twin_cut',signature:'court_storm_chain',trace:'court_storm_chain',conversion:0.6,color:'#d5c3ff'},
  {id:'chaos',name:'Venom',monster:'skeletal_venom_spellsword',primary:'court_twin_cut',signature:'court_venom_ground',trace:'court_venom_ground',conversion:0.6,color:'#9cc86a'},
];
export const SKELETON_WARRIOR_TREE=tree([
  n('grave_phalanx','Grave Phalanx','Raise up to two shield sentinels. 25% increased life, 15% less damage taken and 15% block chance. Their challenge taunts nearby enemies; Rally! orders them to hold a position.',
    [life(0.25),dr(0.15),mod('minionGuard','flat',1)],{tags:{add:['physical']},summon:{monsterId:'skeletal_sentinel',maxActive:2,crewMods:[mod('blockChance','flat',0.15)],
      cohort:{primary:'cleave',challenge:'court_challenge',order:{skill:'court_rally',label:'Rally!',mode:'rally',duration:12,range:450,guardRadius:170}}}}),
  [n('barbed_lattice','Barbed Reprisal','Blocking readies a sweeping counterattack, once per 1.5 seconds. It adds 50% of the sentinel’s Thorns as physical damage. Sentinels inherit 35% of your Thorns.',undefined,
      tactics({reprisal:{skill:'court_reprisal',cooldown:1.5,thorns:0.5,inheritThorns:0.35,range:150}})),
    n('interlocking_shields','Interlocking Shields','Nearby sentinels link shields, gaining 5% block chance and 10% increased poise per neighbor, up to two. Their shields deal minor contact damage every 0.4 seconds to each nearby enemy.',undefined,
      tactics({links:{radius:130,neighbors:2,block:0.05,poise:0.1,contact:'court_shield_contact',interval:0.4,promote:4}})),
    n('oath_banner','Oath Banner','Challenges leave a five-second protective banner. Rally! gathers the line and launches a united shield charge in the commanded direction, on an eight-second shared recovery. Overlapping banners do not stack.',undefined,
      tactics({banner:{skill:'court_oath_standard',charge:'court_shield_charge',cooldown:8,spacing:40,gatherTime:3,gatherRadius:32,standoff:60}}))],
  [n('veteran_watch','Veteran Watch','The nearby eligible sentinel with the lowest percentage life intercepts 30% of an ally’s incoming life wound from a hit. Each sentinel can intercept 25% of its maximum life per second; redirected hits cannot redirect again.',undefined,
      tactics({intercept:{range:160,fraction:0.3,budget:0.25,recovery:1,select:'lowestLifeFraction'}})),
    n('last_watch','Last Watch','Combat death leaves a mobile spectral sentinel for six seconds, with 30% life and 50% damage. It retains the tree’s other abilities. Up to four specters; specters cannot create heirs. Dismissal and expiry do not trigger this.',undefined,
      tactics({legacy:{duration:6,life:0.3,damage:0.5,cap:4,color:'#b4e7ef',alpha:0.38}})),
    n('relief_guard','Relief Guard','Intercepted damage supplies a healing reserve: 30% is banked, up to 12% of sentinel maximum life. Relief Pulse spends it every two seconds. A gentle aura also heals nearby allies for 0.1% of the sentinel’s maximum life each second.',undefined,
      tactics({relief:{pulse:'court_relief_pulse',aura:'court_relief_aura',ratio:0.3,bank:0.12,interval:2,recipientCap:0.06}}))],
],[
  n('ossuary_duelists','Ossuary Duelists','Raise up to two mobile duelists using Twin Cut. Command them to pursue a target or location.',undefined,
    {tags:{add:['physical']},summon:{monsterId:'skeletal_duelist',maxActive:2,cohort:{primary:'court_twin_cut',order:{skill:'court_pursuit',label:'Pursue!',mode:'assault',duration:10,range:600,guardRadius:170}}}}),
  [n('flensing_edges','Flensing Cadence','Every third primary attack becomes Rending Cut: a broad, bleeding slash. Repeated strikes belong to one attack and do not advance this cadence again.',undefined,
      tactics({cadence:{every:3,skill:'court_rending_cut'}})),
    n('open_veins','Death Warrant','Commanding an enemy marks it for death for eight seconds. The next Rending Cut from this cohort consumes the mark for 150% more damage. Curse effect and duration scale the warrant without occupying a curse slot.',undefined,
      tactics({mark:{skill:'court_death_warrant',status:'death_warrant',duration:8,more:1.5}})),
    n('merciless_measure','Ossuary Assassins','Convert duelists into assassins. They preserve their Twin Cut and Rending Cut cadence, backstab when a real rear opening exists, and cloak to approach, reposition or escape danger.',undefined,
      {summon:{monsterId:'skeletal_assassin',cohort:{assassin:{backstab:'court_backstab',cloak:'court_shadow_cloak',rearAngle:2,reach:72,flank:55,flankRange:200,patience:1.6,repositionEvery:3,retreatAt:0.3,recoveryAt:0.55,retreatTime:2.4,retreatDistance:180}}}})],
  [n('line_breakers','Line Breakers','Learn Bone Lunge and Bone Shuriken. Duelists strongly prefer lunging into melee; an instant shuriken can cover their approach while the lunge recovers.',undefined,
      tactics({approach:{lunge:'court_bone_lunge',ranged:'court_bone_shuriken',minRange:80,range:350}})),
    n('relentless_footwork','Runebound Blades','Choose Fire, Cold, Lightning or Venom Spellswords, or a mixture. They convert 60% of physical ability damage to their element and learn a distinct elemental art. Click this node to choose elements.',undefined,
      {summon:{pool:SPELLSWORD_SCHOOLS.map(s=>({id:s.monster,weight:1})),arts:{schools:SPELLSWORD_SCHOOLS,balanceSchools:true,lessons:true,choicesLabel:'Choose Spellsword elements'}}}),
    n('dueling_pairs','Dueling Pairs','Add two maximum duelists, without changing summons per cast. Stable pairs coordinate a Pincer Strike after a successful lunge, with a five-second pair recovery. Unpaired warriors continue fighting normally.',[cap(2)],
      tactics({pairs:{skill:'court_pincer_strike',cooldown:5,delay:0.25,range:280,timeout:2}}))],
],n('tempered_bones','Tempered Bones','15% increased minion life and damage.',[life(0.15),damage(0.15)]));
