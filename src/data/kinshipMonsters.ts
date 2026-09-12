import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';

export const KINSHIP_MONSTERS: Record<string, MonsterDef> = {
  troll_cairncaller: {
    id:'troll_cairncaller', name:'Troll Cairncaller',
    color:'#70816a', shape:'hexagon', radius:21, material:'fur', look:'troll_cairncaller',
    base:{life:190,moveSpeed:82,accuracy:92,armor:18,poise:45,mana:100,manaRegen:5},
    mods:[mod('lifeRegen','flat',4)],
    // A horn-bearing troll that wakes scree skitters, then clubs intruders.
    skills:['wake_the_scree','heavy_strike'], brain:{type:'caster'},
    xp:46,faction:'goblin',packSize:[1,1],presence:{from:14,fadeIn:5},
    scaling:{life:{incPerLevel:0.08}},
  },
};
