import type { EncounterTactic } from '../engine/encounterCombat';
import type { BrainTuning } from '../engine/brain';

export const ENCOUNTER_COMBAT_CFG = {thinkEvery:0.35,initialDelay:1.2,radius:650,signalRadius:65,recoverColor:'#9eacb2'};
const regroup:BrainTuning={move:{style:'hold'},skillUse:{cadence:[0.65,0.95]}};
const focus={focus:true};
const shared={squad:{focusLeader:false}};
const timings={warning:1.1,duration:2.6,recovery:1.6,cooldown:7};

/** Tactics choose ordinary behavior axes. No free casts or hidden scaling.
 * Weights compare observed opportunities; gates rule out unworkable plans. */
export const ENCOUNTER_TACTICS:Record<string,EncounterTactic>={
  protect_support:{id:'protect_support',cue:{style:'cover'},name:'Protect the support',color:'#94d6b0',minLevel:8,
    base:8,needs:{support:1,guard:1},when:[{fact:'pressure',role:'support',radius:210,min:1}],
    score:[{fact:'injury',role:'support',weight:8}],...timings,recover:regroup,
    assignments:[
      {roles:['guard'],max:1,ward:'support',...focus,use:{...shared,move:{style:'interpose'},skillUse:{opener:'shield_up'}}},
      {roles:['support'],max:1,use:{move:{style:'holdRange',hold:310,band:[0.55,1.2]}}},
      {roles:['ranged'],max:2,...focus,use:{...shared,move:{style:'crossfire',flankStep:100,relocateFor:[0.6,0.8],fireFor:[1.5,2]}}},
    ]},
  crossfire:{id:'crossfire',cue:{style:'split'},name:'Crossfire',color:'#e3c48a',minLevel:8,
    base:3,needs:{ranged:2},when:[{fact:'distance',min:180,max:560}],
    score:[{fact:'distance',weight:0.006}],...timings,recover:regroup,
    assignments:[{roles:['ranged'],max:3,...focus,use:{...shared,move:{style:'crossfire',flankStep:130,relocateFor:[0.7,1],fireFor:[1.8,2.4]}}},
      {roles:['guard'],max:1,ward:'support',use:{move:{style:'interpose'}}}]},
  pincer:{id:'pincer',cue:{style:'pincer'},name:'Pincer',color:'#e7a373',minLevel:10,
    base:4,needs:{flanker:2},when:[{fact:'distance',min:90,max:370}],...timings,recover:regroup,
    assignments:[{roles:['flanker'],max:2,...focus,use:{...shared,move:{style:'orbit',ring:130},
      behavior:{encircle:{front:1}},tempo:{reposition:{moveFor:[0.7,1],holdFor:[1.2,1.6]}}}},
      {roles:['guard'],max:1,...focus,use:{...shared,move:{style:'direct',closeFrac:0.9}}}]},
  covered_withdrawal:{id:'covered_withdrawal',cue:{style:'withdraw'},name:'Covered withdrawal',color:'#aec9e3',minLevel:10,
    base:6,needs:{guard:1,ranged:1},when:[{fact:'injury',role:'guard',min:0.55}],
    score:[{fact:'injury',role:'guard',weight:10}],...timings,duration:2,recovery:2,cooldown:10,recover:regroup,
    assignments:[{roles:['guard'],max:1,use:{move:{style:'retreat',pace:0.85}}},
      {roles:['ranged'],max:2,...focus,use:{...shared,move:{style:'hold'}}},
      {roles:['support'],max:1,use:{move:{style:'hoverAllies'}}}]},
  root_barrage:{id:'root_barrage',cue:{style:'gather'},name:'Root barrage',color:'#acd16c',minLevel:9,
    base:4,needs:{controller:1,ranged:1},when:[{fact:'distance',max:370}],
    score:[{fact:'cluster',radius:160,weight:2}],...timings,warning:1.4,recover:regroup,
    assignments:[{roles:['controller'],max:1,...focus,use:{...shared,move:{style:'hold'}}},
      {roles:['ranged'],max:2,...focus,use:{...shared,move:{style:'hold'}}},
      {roles:['flanker'],max:2,use:{move:{style:'orbit',ring:165}}}]},
  countercast:{id:'countercast',cue:{style:'focus'},name:'Countercast',color:'#c4a4e6',minLevel:14,
    base:7,needs:{controller:1,ranged:1},when:[{fact:'casting',min:1.6},{fact:'distance',max:500}],
    ...timings,warning:1,duration:1.8,cooldown:10,recover:regroup,
    assignments:[{roles:['controller','ranged'],max:3,...focus,use:{...shared,move:{style:'hold'}}}]},
};
