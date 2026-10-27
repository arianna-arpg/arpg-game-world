import type { SkillDef } from '../engine/skills';
import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';
import { SPELLSWORD_SCHOOLS } from './skeletonWarriorTree';
const art=(id:string,name:string,rest:Partial<SkillDef>):SkillDef=>({id,name,noDrop:true,description:name+'.',tags:['attack','melee','physical'],color:'#d5cbb8',manaCost:0,cooldown:0,useTime:0,delivery:{type:'self'},effects:[],...rest});
export const SKELETON_WARRIOR_SKILLS:Record<string,SkillDef>={
  court_rally:art('court_rally','Rally!',{tags:['spell','instant'],cooldown:1,useTime:0,description:'Order this cohort to hold the indicated position.'}),
  court_pursuit:art('court_pursuit','Pursue!',{tags:['spell','instant'],cooldown:1,useTime:0,description:'Order this cohort to pursue a visible enemy or location.'}),
  court_reprisal:art('court_reprisal','Barbed Reprisal',{tags:['attack','melee','physical','aoe'],baseDamage:{physical:[3,5]},delivery:{type:'melee',range:90,arcDeg:160},effects:[{type:'damage'}]}),
  court_shield_contact:art('court_shield_contact','Shield Contact',{tags:['attack','physical','aoe'],baseDamage:{physical:[1,2]},delivery:{type:'nova',radius:24},effects:[{type:'damage'}]}),
  court_oath_standard:art('court_oath_standard','Oath Banner',{tags:['spell','buff','aoe','duration'],color:'#d8bf79',delivery:{type:'ground',radius:140,castRange:500,delay:0,noImpact:true,lingerDuration:5,tickInterval:0.5,domain:{stackGroup:'oath_banner',allyMods:[mod('armor','flat',20),mod('blockChance','flat',0.08)]}}}),
  court_shield_charge:art('court_shield_charge','Vanguard Charge',{tags:['attack','movement','melee','physical'],baseDamage:{physical:[9,14]},delivery:{type:'dash',distance:250,speed:600,width:40},effects:[{type:'damage'},{type:'knockback',strength:55}],cooldown:8}),
  court_relief_pulse:art('court_relief_pulse','Relief Pulse',{tags:['spell','heal','aoe'],color:'#a4d2b5',delivery:{type:'nova',radius:150,affects:'allies'},effects:[{type:'heal',amount:0}]}),
  court_relief_aura:art('court_relief_aura','Quiet Vigil',{tags:['spell','aura','heal','buff','aoe'],color:'#a4d2b5',delivery:{type:'aura',mode:'toggle',aura:{radius:130,pulse:{interval:1,healAllies:{base:'casterMaxLife',amount:0.001}}}}}),
  court_rending_cut:art('court_rending_cut','Rending Cut',{tags:['attack','melee','physical','aoe'],useTime:0.75,baseDamage:{physical:[8,12]},delivery:{type:'melee',range:65,arcDeg:150},effects:[{type:'damage'},{type:'status',status:'bleed',chance:1,magnitude:0.5}]}),
  court_death_warrant:art('court_death_warrant','Death Warrant',{tags:['spell','curse','targeted','duration'],color:'#d06880',targeting:{target:'enemy',castRange:600},delivery:{type:'target'},effects:[{type:'status',status:'death_warrant',chance:1}]}),
  court_backstab:art('court_backstab','Ossuary Backstab',{useTime:0.4,cooldown:3,baseDamage:{physical:[7,10]},backstabMult:2.5,delivery:{type:'melee',range:52,arcDeg:75},effects:[{type:'damage'},{type:'status',status:'bleed',chance:0.5,magnitude:0.4}]}),
  court_shadow_cloak:art('court_shadow_cloak','Grave Veil',{tags:['spell','movement','buff','duration'],color:'#b7b2e3',cooldown:9,breaksStealth:false,effects:[{type:'buff',id:'court_shadow_cloak',duration:2.8,mods:[mod('invisible','override',1),mod('moveSpeed','increased',0.25)]}]}),
  court_bone_shuriken:art('court_bone_shuriken','Bone Shuriken',{tags:['attack','projectile','physical','instant'],cooldown:3.5,baseDamage:{physical:[3,5]},delivery:{type:'projectile',speed:680,radius:5,range:380},effects:[{type:'damage'}]}),
  court_pincer_strike:art('court_pincer_strike','Pincer Strike',{useTime:0.2,baseDamage:{physical:[5,8]},delivery:{type:'dash',distance:180,speed:720,width:25},tags:['attack','movement','melee','physical'],effects:[{type:'damage'}]}),
  court_fire_arc:art('court_fire_arc','Cinder Crescent',{tags:['spell','fire','projectile'],color:'#ee8750',cooldown:5,useTime:0.35,baseDamage:{fire:[10,15]},innateMods:[mod('pierceCount','flat',3)],delivery:{type:'projectile',speed:380,radius:16,range:240},effects:[{type:'damage'},{type:'status',status:'burn',chance:1}],ai:{range:200,weight:5}}),
  court_frost_ring:art('court_frost_ring','Wintersteel Ring',{tags:['spell','cold','aoe'],color:'#91d6ef',cooldown:6,useTime:0.3,baseDamage:{cold:[7,11]},delivery:{type:'nova',radius:100},effects:[{type:'damage'},{type:'status',status:'chill',chance:1},{type:'status',status:'frozen',chance:1,durationOverride:0.6}],ai:{range:90,rangeStat:'aoeRadius',weight:5}}),
  court_storm_chain:art('court_storm_chain','Arcing Edge',{tags:['spell','lightning','projectile'],color:'#d5c3ff',cooldown:5,useTime:0.3,baseDamage:{lightning:[4,15]},innateMods:[mod('chainCount','flat',2)],delivery:{type:'projectile',speed:850,radius:5,range:220},effects:[{type:'damage'},{type:'status',status:'shock',chance:0.5}],ai:{range:190,weight:5}}),
  court_venom_ground:art('court_venom_ground','Miasmic Edge',{tags:['spell','chaos','aoe','duration'],color:'#9cc86a',cooldown:6,useTime:0.35,baseDamage:{chaos:[3,5]},delivery:{type:'ground',radius:85,castRange:160,delay:0.2,lingerDuration:3,tickInterval:0.6},effects:[{type:'damage'},{type:'status',status:'poison',chance:1,magnitude:0.25}],ai:{range:150,weight:5}}),
};
const form=(id:string,name:string,color:string):MonsterDef=>({id,name,color,shape:'ribcage',look:'duelist_boneblades',material:'bone',radius:12,faction:'undead',xp:0,base:{life:30,moveSpeed:175,accuracy:100,evasion:50,mana:30,manaRegen:4},skills:['court_twin_cut'],brain:{type:'flanker'}});
export const SKELETON_WARRIOR_FORMS:Record<string,MonsterDef>={
  skeletal_assassin:form('skeletal_assassin','Ossuary Assassin','#b7b2d1'),
  ...Object.fromEntries(SPELLSWORD_SCHOOLS.map(s=>[s.monster,form(s.monster,s.name+' Spellsword',s.color!)])),
};
