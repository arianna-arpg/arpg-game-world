/** Bake a reviewed obstacle/crossing-aware drawing without changing gameplay.
 * npx tsx scripts/route-passive-tree.ts
 * Positions remain editable in passives.ts and the native editor. */
import {writeFileSync} from 'node:fs';
import {PASSIVE_NODES,PASSIVE_ADJACENCY} from '../src/data/passives';
import {passiveTreeNodeRadius} from '../src/data/passiveTreePresentation';
import {PASSIVE_TREE_ROUTE_CFG as CFG} from '../src/data/passiveTreeLayoutConfig';
import {buildPassiveTreeRoutes,passiveRouteGeometry} from '../src/ui/passiveTreeRoutes';
const nodes=Object.values(PASSIVE_NODES).filter(n=>!n.realm&&!n.vocation);
const ids=new Set(nodes.map(n=>n.id));
const edges=nodes.flatMap(n=>[...new Set(PASSIVE_ADJACENCY[n.id])].filter(id=>ids.has(id)&&id>n.id).map(id=>[n.id,id] as const));
const routes=buildPassiveTreeRoutes(nodes,edges,CFG.crossingCost);
const data={geometry:passiveRouteGeometry(),nodes:nodes.map(n=>[n.id,n.x,n.y,passiveTreeNodeRadius(n)]),
  routes:[...routes.values()].map(r=>[r.a,r.b,r.points.flatMap(p=>[p.x,p.y])])};
const header=`/** Authored reading geometry; regenerate with scripts/route-passive-tree.ts.
 * Gameplay edges remain exclusively in passives.ts. */
export interface AuthoredPassiveTreeRoutes {
  geometry: number[];
  nodes: [string,number,number,number][];
  routes: [string,string,number[]][];
}
export const PASSIVE_TREE_ROUTE_DATA:AuthoredPassiveTreeRoutes=`;
writeFileSync('src/data/passiveTreeRouteData.ts',header+JSON.stringify(data).replaceAll('],[','],\n[')+';\n');
console.log(`Authored ${routes.size} routes for ${nodes.length} nodes; gameplay unchanged.`);
