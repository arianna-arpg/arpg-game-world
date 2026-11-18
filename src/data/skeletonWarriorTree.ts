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
  n('grave_phalanx','Grave Phalanx','Summons up to 3 shield sentinels with 25% increased life, 15% less damage taken, and +15% block chance. Sentinels taunt nearby enemies, and activating Rally! orders them to hold a targeted position.',
    [life(0.25),dr(0.15),mod('minionGuard','flat',1)],{tags:{add:['physical']},summon:{monsterId:'skeletal_sentinel',crewMods:[mod('blockChance','flat',0.15)],
      cohort:{primary:'cleave',challenge:'court_challenge',order:{skill:'court_rally',label:'Rally!',mode:'rally',duration:12,range:450,guardRadius:170}}}}),
  [n('barbed_lattice','Barbed Reprisal','Sentinels inherit 35% of your thorns. Blocking triggers a sweeping counterattack that adds 50% of the sentinel\'s thorns as physical damage (1.5s cooldown).',undefined,
      tactics({reprisal:{skill:'court_reprisal',cooldown:1.5,thorns:0.5,inheritThorns:0.35,range:150}})),
    n('interlocking_shields','Interlocking Shields','Sentinels link shields with up to 2 nearby sentinels, gaining +5% block chance and 10% increased poise per linked ally, while dealing minor contact damage every 0.4 seconds to nearby enemies.',undefined,
      tactics({links:{radius:130,neighbors:2,block:0.05,poise:0.1,contact:'court_shield_contact',interval:0.4,promote:4}})),
    n('oath_banner','Oath Banner','Taunting plants a protective banner for 5 seconds. Rally! gathers your sentinels to launch a coordinated shield charge in the targeted direction (8s cooldown).',undefined,
      tactics({banner:{skill:'court_oath_standard',charge:'court_shield_charge',cooldown:8,spacing:40,gatherTime:3,gatherRadius:32,standoff:60}}))],
  [n('veteran_watch','Veteran Watch','Nearby sentinels intercept 30% of hit damage taken by allies, up to 25% of each sentinel\'s maximum life per second.',undefined,
      tactics({intercept:{range:160,fraction:0.3,budget:0.25,recovery:1,select:'lowestLifeFraction'}})),
    n('last_watch','Last Watch','When a sentinel dies in combat, it leaves behind a spectral sentinel for 6 seconds with 30% life and 50% damage (up to 4).',undefined,
      tactics({legacy:{duration:6,life:0.3,damage:0.5,cap:4,color:'#b4e7ef',alpha:0.38}})),
    n('relief_guard','Relief Guard','Sentinels store 30% of intercepted damage (up to 12% of their maximum life) and release it every 2 seconds to heal nearby allies. Also grants an aura that regenerates 0.1% of the sentinel\'s maximum life per second for nearby allies.',undefined,
      tactics({relief:{pulse:'court_relief_pulse',aura:'court_relief_aura',ratio:0.3,bank:0.12,interval:2,recipientCap:0.06}}))],
],[
  n('ossuary_duelists','Ossuary Duelists','Summons up to 3 agile duelists that strike with Twin Cut. Activating Pursue! orders them to focus a target or location.',undefined,
    {tags:{add:['physical']},summon:{monsterId:'skeletal_duelist',cohort:{primary:'court_twin_cut',order:{skill:'court_pursuit',label:'Pursue!',mode:'assault',duration:10,range:600,guardRadius:170}}}}),
  [n('flensing_edges','Flensing Cadence','Every 3rd primary attack becomes Rending Cut, a wide slash that inflicts bleed.',undefined,
      tactics({cadence:{every:3,skill:'court_rending_cut'}})),
    n('open_veins','Death Warrant','Ordering your duelists to target an enemy marks it for 8 seconds. The next Rending Cut against the marked target consumes the mark to deal 150% more damage.',undefined,
      tactics({mark:{skill:'court_death_warrant',status:'death_warrant',duration:8,more:1.5}})),
    n('merciless_measure','Ossuary Assassins','Converts duelists into assassins that use stealth to approach, reposition, or disengage, and backstab enemies when striking from behind.',undefined,
      {summon:{monsterId:'skeletal_assassin',cohort:{assassin:{backstab:'court_backstab',cloak:'court_shadow_cloak',rearAngle:2,reach:72,flank:55,flankRange:200,patience:1.6,repositionEvery:3,retreatAt:0.3,recoveryAt:0.55,retreatTime:2.4,retreatDistance:180}}}})],
  [n('line_breakers','Line Breakers','Duelists learn Bone Lunge to close distance and throw Bone Shurikens while Bone Lunge is on cooldown.',undefined,
      tactics({approach:{lunge:'court_bone_lunge',ranged:'court_bone_shuriken',minRange:80,range:350}})),
    n('relentless_footwork','Runebound Blades','Converts duelists into elemental Spellswords that convert 60% of physical damage to their chosen element and cast an elemental spell. Click this node to select elements.',undefined,
      {summon:{pool:SPELLSWORD_SCHOOLS.map(s=>({id:s.monster,weight:1})),arts:{schools:SPELLSWORD_SCHOOLS,balanceSchools:true,lessons:true,choicesLabel:'Choose Spellsword elements'}}}),
    n('dueling_pairs','Dueling Pairs','+1 maximum duelist, and rounds your maximum duelist count up to the next even number. Paired duelists follow up lunges with a coordinated Pincer Strike (5s cooldown).',[cap(1)],
      {summon:{capacityMultiple:2,cohort:{pairs:{skill:'court_pincer_strike',cooldown:5,delay:0.25,range:280,timeout:2}}}})],
],n('tempered_bones','Tempered Bones','15% increased minion life and damage.',[life(0.15),damage(0.15)]));
