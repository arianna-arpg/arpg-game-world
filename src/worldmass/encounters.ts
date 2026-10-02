import { MONSTERS } from '../data/monsters';
import { ENCOUNTER_GROUPS, ENCOUNTER_GROUP_CFG } from '../data/encounterGroups';
import { encounterGroupPool, planEncounterGroup, type EncounterContext } from '../engine/encounterGroups';
import { presenceMul } from '../engine/presence';
import { canonical, massRandom } from './random';

export interface MassFormation {
  recipe: string; weight: number;
  seats: { monster: string; slot: string; x: number; y: number }[];
}
/** Concrete native plans are copied into the run: later residency never rerolls
 * roles, optional members, species, or the number of clearance obligations. */
export interface MassEncounterSpec {
  source: string; chance: number;
  habitat: Pick<EncounterContext,'biome'|'tileset'|'place'|'story'>;
  plans: MassFormation[];
}
export function nativeMassEncounters(tileset: string, biome: string, level: number): MassEncounterSpec | undefined {
  const habitat:MassEncounterSpec['habitat']={tileset,biome,place:'surface',story:0};
  const plans:MassFormation[]=[];
  for(const faction of new Set(Object.values(ENCOUNTER_GROUPS).map(g=>g.faction))){
    const context={...habitat,level,faction};
    for(const row of encounterGroupPool(context)){
      // Multiple seeded native plans retain optional roles/alternatives without
      // rerolling those roles when a country page arrives.
      for(let variant=0;variant<4;variant++){
        const rng=massRandom(0,['worldmass/native-formations',tileset,level,row.id,variant]);
        const plan=planEncounterGroup(row.id,context,undefined,()=>rng.next());
        if(!plan.length||plan.some(s=>MONSTERS[s.monster].habitat))continue;
        plans.push({recipe:row.id,weight:row.weight/4,
          seats:plan.map(s=>({monster:s.monster,slot:s.member.slot,x:s.offset.x,y:s.offset.y}))});
      }
    }
  }
  return plans.length?{source:'worldmass/native-formations/'+tileset,
    chance:ENCOUNTER_GROUP_CFG.chance,habitat,plans}:undefined;
}
export function validateMassEncounters(spec: MassEncounterSpec, level: number): void {
  const h=spec?.habitat;
  if(!spec||typeof spec.source!=='string'||!spec.source||spec.source.length>256
    ||!Number.isFinite(spec.chance)||spec.chance<0||spec.chance>1||!h
    ||h.place!=='surface'||h.story!==0||typeof h.tileset!=='string'||!h.tileset
    ||typeof h.biome!=='string'||!h.biome||!Array.isArray(spec.plans)||!spec.plans.length||spec.plans.length>256)
    throw Error('Invalid worldmass native formations');
  for(const plan of spec.plans){
    const g=Object.hasOwn(ENCOUNTER_GROUPS,plan.recipe)?ENCOUNTER_GROUPS[plan.recipe]:undefined;
    if(!g||!Number.isFinite(plan.weight)||plan.weight<=0||!Array.isArray(plan.seats)
      ||plan.seats.length<2||plan.seats.length>ENCOUNTER_GROUP_CFG.maxMembers
      ||!encounterGroupPool({...h,level,faction:g.faction},{table:[{id:plan.recipe,weight:1}]}).length)
      throw Error('Invalid worldmass formation recipe');
    for(const seat of plan.seats){
      const m=g.members.find(m=>m.slot===seat.slot),body=MONSTERS[seat.monster];
      const choice=m?.monster===seat.monster?{presence:undefined}:m?.choices?.find(c=>c.id===seat.monster);
      if(!m||!body||body.habitat||body.faction!==g.faction||!choice
        ||presenceMul(m.presence,level)<=0||presenceMul(choice.presence,level)<=0||presenceMul(body.presence,level)<=0
        ||![seat.x,seat.y].every(Number.isFinite)||Math.hypot(seat.x,seat.y)>(g.radius??ENCOUNTER_GROUP_CFG.radius))
        throw Error('Invalid worldmass formation seat');
    }
    for(const m of g.members){
      const n=plan.seats.filter(s=>s.slot===m.slot).length,[lo,hi]=m.count??[1,1];
      if(n<lo||n>hi)throw Error('Incomplete worldmass native formation');
      plan.seats.filter(s=>s.slot===m.slot).forEach((s,i)=>{
        if(s.x!==m.at.forward||s.y!==m.at.side+(i-(n-1)/2)*(m.spacing??ENCOUNTER_GROUP_CFG.spacing))
          throw Error('Invalid worldmass formation geometry');
      });
    }
  }
}
/** Separate stream: a failed seat, casualty or reverse approach cannot reroll. */
export function massFormation(spec: MassEncounterSpec | undefined, seed: number, place: string): MassFormation | undefined {
  if(!spec)return;
  const rng=massRandom(seed,[spec.source,place]);
  if(!rng.chance(spec.chance))return;
  return rng.weighted(spec.plans);
}
export function formationIdentity(plan: MassFormation): string {
  return canonical({recipe:plan.recipe,seats:plan.seats});
}
