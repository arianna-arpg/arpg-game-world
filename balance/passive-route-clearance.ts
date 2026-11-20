/** Expansion probes inspect the same routed geometry the player sees. */
import {PASSIVE_NODES as N,PASSIVE_ADJACENCY as A,type PassiveNode} from '../src/data/passives';
import {passiveTreeNodeRadius} from '../src/data/passiveTreePresentation';
import {passiveTreeRoutes,passiveRouteKey,routePointDistance} from '../src/ui/passiveTreeRoutes';
export function obscuredPassiveConnections(added:readonly PassiveNode[]):string[]{
  const obscured:string[]=[];
  for(const realm of new Set(added.map(n=>n.realm))){
    const occupied=Object.values(N).filter(n=>n.realm===realm),nodes=occupied.filter(n=>!n.vocation),ids=new Set(nodes.map(n=>n.id));
    const drawing=passiveTreeRoutes(nodes,nodes.flatMap(n=>A[n.id].filter(id=>ids.has(id)&&id>n.id).map(id=>[n.id,id] as const)));
    for(const n of added.filter(n=>n.realm===realm))for(const id of A[n.id]){
      const route=drawing.get(passiveRouteKey(n.id,id));
      if(!route){obscured.push('Missing route '+n.id+'/'+id);continue;}
      for(let i=1;i<route.points.length;i++)for(const other of occupied){
        if(other.id===n.id||other.id===id)continue;
        if(routePointDistance(other,route.points[i-1],route.points[i])<passiveTreeNodeRadius(other)+2)
          obscured.push(n.id+'/'+id+'/'+other.id);
      }
    }
  }
  return obscured;
}
