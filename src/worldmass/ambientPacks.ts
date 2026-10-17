import { MONSTERS } from '../data/monsters';
import type { PackSpec } from '../data/zones';
import type { MassPopulation } from './progression';
import { massRandom } from './random';

/** Captured native group bands. Old descriptors keep their mixed fixed slots. */
export interface MassAmbientPack {
  source: string;
  size: [number, number];
  archetypes?: { weight: number; size: [number, number] }[];
  natural: { id: string; size: [number, number] }[];
}
export function nativeAmbientPack(source: string, packs: PackSpec): MassAmbientPack {
  return { source, size: [...packs.size],
    ...(packs.archetypes?.length ? { archetypes: packs.archetypes.map(a=>({weight:a.weight,size:[...a.size]})) } : {}),
    natural: [...new Set(packs.table.map(r=>r.id))].flatMap(id=>MONSTERS[id]?.packSize
      ? [{id,size:[...MONSTERS[id].packSize!] as [number,number]}] : []) };
}
export function validateAmbientPack(pack: MassAmbientPack): void {
  const band=(n:readonly number[])=>Array.isArray(n)&&n.length===2&&n.every(v=>Number.isSafeInteger(v)&&v>=1&&v<=32)&&n[0]<=n[1];
  if(!pack?.source||!band(pack.size)||!Array.isArray(pack.natural)||pack.natural.length>256
    ||new Set(pack.natural.map(r=>r.id)).size!==pack.natural.length
    ||pack.natural.some(r=>!MONSTERS[r.id]||!band(r.size))
    ||pack.archetypes!==undefined&&(!Array.isArray(pack.archetypes)||!pack.archetypes.length||pack.archetypes.length>16
      ||pack.archetypes.some(a=>!Number.isFinite(a.weight)||a.weight<=0||!band(a.size))))throw Error('Invalid ambientPack');
}
/** Same species-owned size precedence as native spawnPacks. The expedition's
 * opening quotas still apply; no global RNG, hero, arrival order or kill input. */
export function ambientCohort(pack: MassAmbientPack|undefined, population: MassPopulation, seed:number, id:string): readonly string[]|undefined {
  if(!pack)return undefined;
  const rng=massRandom(seed,[pack.source,'ambientPack',id]);
  const monster=rng.weighted(population.table).id;
  const band=pack.natural.find(r=>r.id===monster)?.size
    ?? (pack.archetypes?.length?rng.weighted(pack.archetypes).size:pack.size);
  let count=rng.int(...band);
  for(const limit of population.limits??[])if(limit.ids.includes(monster))count=Math.min(count,limit.max);
  return Array.from({length:count},()=>monster);
}
