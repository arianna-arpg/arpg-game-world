import type { Actor } from './actor';
import type { World } from './world';

/** Keys are shared with the spawn paths, including families shared across skills. */
export const supportFamily = {
  hive:(host:string)=>'__hive:'+host,
  dominate:(host:string)=>'__dominate:'+host,
  brood:(monster:string)=>'__brood:'+monster,
  proc:(id:string)=>'__proc:'+id,
  vein:(host:string,support:string)=>'__vein:'+host+':'+support,
};

type OwnerCounts = Map<Actor,Map<string,number>>;
function record(rows:OwnerCounts,owner:Actor,key:string) {
  let counts=rows.get(owner);
  if (!counts) rows.set(owner,counts=new Map());
  counts.set(key,(counts.get(key) ?? 0)+1);
}

/** One lazy census per hotbar or network snapshot. No actor scan for ordinary links. */
export function supportCensus(world:World) {
  type CensusKind='family'|'primary'|'construct'|'echo'|'patch'|'wornField';
  let counts:Record<CensusKind,OwnerCounts>|undefined;
  let bodiesRead=false, zonesRead=false;
  return (kind:CensusKind,owner:Actor,key:string):number=>{
    counts ??= {family:new Map(),primary:new Map(),construct:new Map(),echo:new Map(),patch:new Map(),wornField:new Map()};
    if (kind==='patch' || kind==='wornField') {
      if (!zonesRead) {
        for (const z of world.zones) {
          if (z.cursePatch) record(counts.patch,z.caster,z.inst.def.id);
          if (z.toggled && z.follow) record(counts.wornField,z.caster,z.inst.def.id);
        }
        zonesRead=true;
      }
    } else if (!bodiesRead) {
      for (const a of world.actors) {
        if (a.dead || !a.owner) continue;
        if (a.construct?.echoKey) record(counts.echo,a.owner,a.construct.echoKey);
        if (!a.sourceSkillId) continue;
        record(counts.family,a.owner,a.sourceSkillId);
        if (!a.summonInst?.companionGrant) {
          record(counts.construct,a.owner,a.sourceSkillId);
          if (!a.summonOffspring) record(counts.primary,a.owner,a.sourceSkillId);
        }
      }
      bodiesRead=true;
    }
    return counts[kind].get(owner)?.get(key) ?? 0;
  };
}
