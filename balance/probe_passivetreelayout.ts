import assert from 'node:assert/strict';
import { PASSIVE_NODES,PASSIVE_ADJACENCY,type PassiveNode } from '../src/data/passives';
import { passiveTreeNodeRadius } from '../src/data/passiveTreePresentation';
import { validatePassiveLayout } from '../src/data/validatePassiveLayout';
import { PASSIVE_TREE_ROUTE_CFG as CFG } from '../src/data/passiveTreeLayoutConfig';
import { buildPassiveTreeRoutes,routePointDistance,passiveTreeRouteArt,passiveRoutesOverlap } from '../src/ui/passiveTreeRoutes';

const warnings:string[]=[];validatePassiveLayout(s=>warnings.push(s));assert.deepEqual(warnings,[]);
const nodes=Object.values(PASSIVE_NODES).filter(n=>!n.vocation&&!n.realm);
const ids=new Set(nodes.map(n=>n.id));
const edges=nodes.flatMap(n=>[...new Set(PASSIVE_ADJACENCY[n.id])].filter(id=>ids.has(id)&&id>n.id).map(id=>[n.id,id] as const));
const routes=buildPassiveTreeRoutes(nodes,edges);assert.equal(routes.size,edges.length);
const segments=[...routes.values()].flatMap(route=>route.points.slice(1).map((b,i)=>({route,a:route.points[i],b})));
for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j];if(a.route===b.route)continue;
  assert(!passiveRoutesOverlap(a.a,a.b,b.a,b.b),`Separate routes share a track: ${a.route.a}/${b.route.a}`);
}
let detours=0;
for(const route of routes.values()){
  assert(route.points.length>=2,route.a+' '+route.b);if(route.points.length>2)detours++;
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i];
    assert(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=0&&a.y>=0&&a.x<=6000&&a.y<=6000);
    for(const n of nodes)if(n.id!==route.a&&n.id!==route.b)
      assert(routePointDistance(n,a,b)>=passiveTreeNodeRadius(n)+CFG.nodeClearance-.001,`${route.a}/${route.b} passes through ${n.id}`);
  }
  const svg=passiveTreeRouteArt(route,false);assert(svg.includes('passive-route-backing'));assert(svg.includes('pointer-events="none"'));
}
const point=(id:string,x:number,y:number):PassiveNode=>({id,x,y,kind:'small',name:id,description:'',links:[]});
const fixture=[point('a',100,100),point('b',300,100),point('blocker',200,100)];
const detour=buildPassiveTreeRoutes(fixture,[['a','b']]).get('a|b')!;assert(detour.points.length>2);
for(let i=1;i<detour.points.length;i++)assert(routePointDistance(fixture[2],detour.points[i-1],detour.points[i])>=18-.001);
assert.deepEqual([...buildPassiveTreeRoutes(fixture,[['a','b']])],[...buildPassiveTreeRoutes(fixture,[['a','b']])]);
assert.deepEqual([...buildPassiveTreeRoutes(fixture,[['a','b']])],[...buildPassiveTreeRoutes(fixture,[['b','a'],['a','b']])]);
console.log(`PASS passive tree layout: ${nodes.length} nodes, ${routes.size} preserved routes, ${detours} node-avoiding detours, no overlaps or obstructed connections`);
