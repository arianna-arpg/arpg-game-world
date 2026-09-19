import type { MonsterDef } from './monsters';

/** A rival expedition uses the player's ordinary guard, taunt, healing,
 * spell and ammunition systems. Roles are actual kits, not stat labels. */
export const ENCOUNTER_ADVENTURERS: Record<string, MonsterDef> = {
  wayward_vanguard: {
    id:'wayward_vanguard',name:'Wayward Vanguard',color:'#a69b7e',shape:'rectangle',
    radius:16,material:'metal',look:'bulwark_thane',
    base:{life:125,armor:28,poise:35,moveSpeed:108,accuracy:100,mana:85,manaRegen:6},
    skills:['shield_up','challenging_shout','cleave'],xp:30,faction:'bandit',
    presence:{from:8},packSize:[1,1],
    brain:{type:'protector',behavior:{castArc:0.65,guardRelease:{windup:0.6}},
      skillUse:{slack:{shield_up:[0.8,1.8]}}},
  },
  wayward_mender: {
    id:'wayward_mender',name:'Wayward Mender',color:'#a5b9a1',shape:'pentagon',
    radius:12,material:'cloth',look:'crusade_chirurgeon',
    base:{life:62,moveSpeed:118,accuracy:98,mana:100,manaRegen:7},
    skills:['soothing_touch','spark'],xp:25,faction:'bandit',wardPriority:2,
    presence:{from:8},packSize:[1,1],brain:{type:'caster'},
  },
  wayward_arcanist: {
    id:'wayward_arcanist',name:'Wayward Arcanist',color:'#b488c5',shape:'pentagon',
    radius:12,material:'cloth',look:'bandit_powder_witch',
    base:{life:65,moveSpeed:112,accuracy:102,mana:100,manaRegen:6},
    skills:['firebolt','frost_nova'],xp:28,faction:'bandit',
    presence:{from:8},packSize:[1,1],brain:{type:'caster'},
  },
  wayward_scout: {
    id:'wayward_scout',name:'Wayward Scout',color:'#a79c73',shape:'trapezoid',
    radius:12,material:'cloth',look:'bandit_fusilier',
    base:{life:55,moveSpeed:135,accuracy:106,mana:0},
    skills:['bolt_repeater'],xp:23,faction:'bandit',
    presence:{from:8},packSize:[1,1],brain:{type:'strafer'},
  },
};
