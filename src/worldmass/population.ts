import { MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import type { MassPopulation } from './progression';

/** Authoring policy, resolved to concrete IDs in the run manifest. Native
 * standoff hints identify ranged pressure; no class or hero state is read. */
export const MASS_OPENING_COMPOSITION = Object.freeze({
  source: 'worldmass/opening-composition', throughLevel: 2,
  rangedKeepDistance: 120, maxRanged: 1,
});
export function openingPopulation(level: number, table: MassPopulation['table']): MassPopulation {
  const c=MASS_OPENING_COMPOSITION;
  const ids=table.filter(row=>MONSTERS[row.id]?.skills.some(id=>(SKILLS[id]?.ai?.keepDistance??0)>=c.rangedKeepDistance)).map(row=>row.id);
  return {level,table,...(level<=c.throughLevel&&ids.length&&ids.length<table.length
    ? {limits:[{source:c.source,ids,max:c.maxRanged}]}:{})};
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
