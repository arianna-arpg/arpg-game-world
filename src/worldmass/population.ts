import { AMBIENT_TAGS, MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import type { MassPopulation } from './progression';

/** Authoring policy, resolved to concrete IDs in the run manifest. Native
 * standoff hints identify ranged pressure; no class or hero state is read. */
export const MASS_OPENING_COMPOSITION = Object.freeze({
  source: 'worldmass/opening-composition', throughLevel: 2,
  rangedKeepDistance: 120, maxRanged: 1,
  smallBodyBelow: 12, maxSmallBodies: 1,
});
export function openingPopulation(level: number, table: MassPopulation['table']): MassPopulation {
  const c=MASS_OPENING_COMPOSITION;
  const ids=table.filter(row=>MONSTERS[row.id]?.skills.some(id=>(SKILLS[id]?.ai?.keepDistance??0)>=c.rangedKeepDistance)).map(row=>row.id);
  if(level>c.throughLevel)return {level,table};
  const limits:NonNullable<MassPopulation['limits']>=[];
  if(ids.length&&ids.length<table.length)limits.push({source:c.source,ids,max:c.maxRanged});
  const small=table.filter(row=>(MONSTERS[row.id]?.radius??Infinity)<c.smallBodyBelow).map(row=>row.id);
  // Small native creatures remain present, with a readable larger body available
  // after every quota is spent. Never resize art independently of hit geometry.
  if(small.length&&table.some(row=>!small.includes(row.id)&&limits.every(l=>!l.ids.includes(row.id))))
    limits.push({source:c.source+'/small-bodies',ids:small,max:c.maxSmallBodies});
  return {level,table,...(limits.length?{limits}:{})};
}
/** A completion-bearing place reserves some original slots for native objective
 * targets. This becomes an ordinary saved quota, never a runtime reroll or a
 * change to wildlife hostility. Native admission still makes the final decision. */
export const MASS_GARRISON_COMPOSITION = { source: 'worldmass/landmark-guardians', minimum: 1 };
export function reserveMassGuardians(population: MassPopulation, count: number,
  minimum = MASS_GARRISON_COMPOSITION.minimum): MassPopulation {
  if(!Number.isSafeInteger(minimum)||minimum<0||minimum>count)throw Error('Invalid minimum landmark guardians');
  if(!minimum)return population;
  const exempt=population.table.filter(row=>{
    const def=MONSTERS[row.id];
    return !def||!!def.passive||!!def.noObjective||AMBIENT_TAGS.has(def.tag??'');
  }).map(row=>row.id);
  if(!exempt.length)return population;
  const result={...population,limits:[...(population.limits??[]),
    {source:MASS_GARRISON_COMPOSITION.source,ids:exempt,max:count-minimum}]};
  validatePopulationLimits(result);
  return result;
}
export function validatePopulationLimits(population: MassPopulation): void {
  const limits=population.limits;
  if(!limits)return;
  if(!Array.isArray(limits)||limits.length>16||limits.some(l=>!l.source||!Array.isArray(l.ids)||!l.ids.length
    ||new Set(l.ids).size!==l.ids.length||!Number.isSafeInteger(l.max)||l.max<0||l.max>16
    ||l.ids.some(id=>!population.table.some(row=>row.id===id)))
    // At least one unrestricted row guarantees any configured count can seat
    // completely, including overlapping quotas, without a silent fallback.
    ||!population.table.some(row=>limits.every(l=>!l.ids.includes(row.id))))
    throw Error('Invalid worldmass population composition');
}
/** Recompute counts from the original seeded choices, including dead/already
 * resident slots. Visiting or killing half a group cannot reroll its survivors. */
export function populationChoices(population: MassPopulation, selected: readonly string[]): MassPopulation['table'] {
  if(!population.limits?.length)return population.table;
  return population.table.filter(row=>population.limits!.every(l=>!l.ids.includes(row.id)
    ||selected.filter(id=>l.ids.includes(id)).length<l.max));
}
