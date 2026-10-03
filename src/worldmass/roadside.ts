import type { MassContent } from './preset';
import type { MassPlace } from './contracts';
import type { MassJourney } from './journey';
import type { MassGenerator } from './generator';
import type { MassSettlement } from './settlement';
import type { MassWalk } from './walk';
import { trailStation } from './journey';
import { localOffset, type MassCell } from './address';
import { canonical, freezeData, massHash, massRandom } from './random';

export interface MassRoadsideSpec {
  source: string;
  spacing: number; chance: number; radius: number;
  /** Keep the refuge, destination encounters and neighboring groups distinct. */
  townClearance: number; siteClearance: number; separation: number;
  maxPlaces: number;
  habitats: { biome: string; content: string }[];
}
export function validateMassRoadside(s: MassRoadsideSpec, content: readonly MassContent[]): void {
  const within=(n:number,lo:number,hi:number)=>Number.isFinite(n)&&n>=lo&&n<=hi;
  if(!s||typeof s.source!=='string'||!s.source||s.source.length>256
    ||!within(s.spacing,400,4000)||!within(s.chance,0,1)||!within(s.radius,60,180)
    ||!within(s.townClearance,400,2000)||!within(s.siteClearance,100,1000)
    ||!within(s.separation,s.radius*2+100,4000)||!Number.isInteger(s.maxPlaces)||!within(s.maxPlaces,0,16)
    ||!Array.isArray(s.habitats)||!s.habitats.length||s.habitats.length>16
    ||new Set(s.habitats.map(h=>h.biome)).size!==s.habitats.length
    ||s.habitats.some(h=>typeof h.biome!=='string'||!h.biome||h.biome.length>256
      ||!content.some(c=>c.id===h.content&&!c.site&&!c.magicPack&&c.count<=3
        &&[c,...c.levels??[]].every(r=>!r.encounters))))
    throw Error('Invalid worldmass roadside encounters');
}

/** A finite road network supplies encounter addresses, not a second combat loop.
 * Planning reads immutable route/biome data, never live edits or visit order.
 * No campsite, clearance payout, chest or discovery marker is invented. */
export class MassRoadside {
  readonly places: readonly MassPlace[];
  constructor(readonly spec: MassRoadsideSpec, journey: MassJourney, town: MassSettlement,
    generator: MassGenerator, private readonly walk: MassWalk) {
    const candidates: MassPlace[]=[];
    for(const trail of [...journey.trails].sort((a,b)=>a.id.localeCompare(b.id))){
      const length=trail.points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-trail.points[i].x,p.y-trail.points[i].y),0);
      const stations=Math.floor(length/spec.spacing);
      if(stations>128)throw Error('Roadside route exceeds planning budget');
      for(let i=0;i<stations;i++){
        const id=canonical([generator.run.runId,spec.source,trail.id,i]);
        const rng=massRandom(generator.run.seed,[spec.source,trail.id,i]);
        if(!rng.chance(spec.chance))continue;
        const pos=trailStation(trail.points,(i+rng.range(.3,.7))/stations).pos;
        if(town.distance(pos.x,pos.y)<spec.townClearance+spec.radius
          ||journey.places.some(p=>Math.hypot(journey.local(p).x-pos.x,journey.local(p).y-pos.y)
            <p.radius+spec.radius+spec.siteClearance))continue;
        const center=walk.at(pos.x,pos.y),biome=generator.terrainAt(center).biome;
        const habitat=spec.habitats.find(h=>h.biome===biome);
        if(!habitat)continue;
        candidates.push({id,recipe:trail.id+'/'+i,content:habitat.content,center,radius:spec.radius,
          source:{generator:generator.spec.id,version:generator.spec.version,rule:spec.source,
            source:spec.source,stream:canonical([spec.source,trail.id,i])}});
      }
    }
    const chosen:MassPlace[]=[];
    // Seeded priority spreads the finite budget across routes, not visit order.
    candidates.sort((a,b)=>massHash(a.id,generator.run.seed)-massHash(b.id,generator.run.seed)||a.id.localeCompare(b.id));
    for(const p of candidates){
      if(chosen.length>=spec.maxPlaces)break;
      const q=this.local(p);
      if(chosen.some(other=>{const a=this.local(other);return Math.hypot(a.x-q.x,a.y-q.y)<spec.separation;}))continue;
      chosen.push(p);
    }
    this.places=freezeData(chosen.sort((a,b)=>a.id.localeCompare(b.id)));
  }
  local(p:MassPlace){return localOffset(p.center,{...this.walk.origin,x:0,y:0},this.walk.stream.generator.spec.addressSpan);}
  reserves(pos:{x:number;y:number},radius:number):boolean {
    return this.places.some(p=>{const q=this.local(p);return Math.hypot(q.x-pos.x,q.y-pos.y)<p.radius+radius;});
  }
  inCell(cell:MassCell):readonly MassPlace[]{
    const span=this.walk.stream.generator.spec.addressSpan;
    const o=localOffset({...cell,x:0,y:0},{...this.walk.origin,x:0,y:0},span);
    return this.places.filter(p=>{const q=this.local(p);
      return Math.hypot(Math.max(0,o.x-q.x,q.x-o.x-span),Math.max(0,o.y-q.y,q.y-o.y-span))<=p.radius;});
  }
}
