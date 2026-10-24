import { freezeData, massRandom } from './random';
import { defaultRegionalPathWeave, validateRegionalPathWeave, type RegionalPathWeave } from './regionalPathWeave';
import { defaultRegionalTransitions, validateRegionalTransitions, type RegionalTransitionSpec } from './regionalTransitions';

export interface RegionalTerrainWeave {
  source:string;version:1;
  paths:RegionalPathWeave;transitions:RegionalTransitionSpec;
  nodeJitter:number;courtScale:readonly[number,number];broadChance:number;
}
export function defaultRegionalTerrainWeave():RegionalTerrainWeave {
  return freezeData({source:'worldmass/regional-weave-v1',version:1,paths:defaultRegionalPathWeave(),
    transitions:defaultRegionalTransitions(),nodeJitter:.075,courtScale:[.7,1],broadChance:.55});
}
export function validateRegionalTerrainWeave(p:RegionalTerrainWeave):void {
  if(!p||p.version!==1||typeof p.source!=='string'||!p.source||p.source.length>256
    ||!Number.isFinite(p.nodeJitter)||p.nodeJitter<0||p.nodeJitter>.1
    ||!Array.isArray(p.courtScale)||p.courtScale.length!==2||p.courtScale.some(n=>!Number.isFinite(n)||n<.65||n>1)||p.courtScale[0]>p.courtScale[1]
    ||!Number.isFinite(p.broadChance)||p.broadChance<0||p.broadChance>1)throw Error('Invalid regional weave');
  validateRegionalPathWeave(p.paths);validateRegionalTransitions(p.transitions);
}
type Point={x:number;y:number};
type Court=Point&{radius:number};
type Edge={a:number;b:number;points:readonly Point[]};
/** Modest independent drift breaks a regular room lattice. Original broad
 * courts remain available for nested sources, while occasional smaller courts
 * expose longer stretches of the winding links. Pairwise caps retain gaps. */
export function regionalWeaveNodes<T extends Court>(p:RegionalTerrainWeave,nodes:readonly T[],size:number,gap:number,seed:number,attempt:number):T[] {
  const rng=massRandom(seed,[p.source,p.version,attempt,'courts']),broad=rng.int(0,nodes.length-1);
  const moved=nodes.map((node,i)=>({...node,x:Math.round(node.x+rng.range(-1,1)*gap*p.nodeJitter),
    y:Math.round(node.y+rng.range(-1,1)*gap*p.nodeJitter),
    radius:node.radius*(i===broad||rng.chance(p.broadChance)?1:rng.range(...p.courtScale))}));
  return moved.map((node,i)=>({...node,radius:Math.min(node.radius,
    ...moved.filter((_,j)=>i!==j).map(other=>.44*Math.hypot(node.x-other.x,node.y-other.y)),
    Math.min(node.x,node.y,size-1-node.x,size-1-node.y)-5-p.transitions.width[1])}));
}
/** Validate the actual dry raster against its promised graph before content is
 * composed. Centerlines alone cannot detect two wide winding routes touching. */
export function regionalWeaveTopology(rows:readonly string[],nodes:readonly Court[],edges:readonly Edge[]):boolean {
  const n=rows.length,rooms=new Int16Array(n*n),seen=new Uint8Array(n*n),queue=new Int32Array(n*n);
  rooms.fill(-1);const dry=(k:number)=>rows[Math.floor(k/n)][k%n]==='g'||rows[Math.floor(k/n)][k%n]==='c';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const k=y*n+x;if(!dry(k))continue;
    for(let i=0;i<nodes.length;i++){const p=nodes[i];
      if((x-p.x)**2+(y-p.y)**2<=(p.radius+.5)**2){if(rooms[k]>=0)return false;rooms[k]=i;}
    }
  }
  const key=(a:number,b:number)=>a<b?a+'/'+b:b+'/'+a;
  const expected=new Set(edges.map(e=>key(e.a,e.b))),actual=new Set<string>();
  for(let start=0;start<n*n;start++){
    if(seen[start]||rooms[start]>=0||!dry(start))continue;
    const touch=new Set<number>();let head=0,tail=1;queue[0]=start;seen[start]=1;
    while(head<tail){
      const k=queue[head++],x=k%n,y=Math.floor(k/n);
      for(const j of [x?k-1:-1,x+1<n?k+1:-1,y?k-n:-1,y+1<n?k+n:-1]){
        if(j<0||!dry(j))continue;
        if(rooms[j]>=0){touch.add(rooms[j]);if(touch.size>2)return false;continue;}
        if(!seen[j]){seen[j]=1;queue[tail++]=j;}
      }
    }
    if(!touch.size)return false;
    if(touch.size===2){const [a,b]=[...touch],pair=key(a,b);if(!expected.has(pair))return false;actual.add(pair);}
  }
  return actual.size===expected.size&&[...expected].every(k=>actual.has(k));
}
