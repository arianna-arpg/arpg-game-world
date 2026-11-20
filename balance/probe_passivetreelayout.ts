import assert from 'node:assert/strict';
import { PASSIVE_NODES,PASSIVE_ADJACENCY,type PassiveNode } from '../src/data/passives';
import { passiveTreeNodeRadius } from '../src/data/passiveTreePresentation';
import { validatePassiveLayout } from '../src/data/validatePassiveLayout';
import { PASSIVE_TREE_ROUTE_CFG as CFG } from '../src/data/passiveTreeLayoutConfig';
import { buildPassiveTreeRoutes,passiveTreeRoutes,authoredPassiveTreeRoutes,routePointDistance,passiveTreeRouteArt,passiveRoutesOverlap } from '../src/ui/passiveTreeRoutes';

const warnings:string[]=[];validatePassiveLayout(s=>warnings.push(s));assert.deepEqual(warnings,[]);
const nodes=Object.values(PASSIVE_NODES).filter(n=>!n.vocation&&!n.realm);
const ids=new Set(nodes.map(n=>n.id));
const edges=nodes.flatMap(n=>[...new Set(PASSIVE_ADJACENCY[n.id])].filter(id=>ids.has(id)&&id>n.id).map(id=>[n.id,id] as const));
assert(authoredPassiveTreeRoutes(nodes,edges),'Authored routing must match current content and geometry');
assert.equal(authoredPassiveTreeRoutes(nodes.map((n,i)=>i? n:{...n,x:n.x+1}),edges),undefined,'Moving a node invalidates authored geometry');
assert.equal(authoredPassiveTreeRoutes(nodes,edges.slice(1)),undefined,'Changing a connection invalidates authored geometry');
const routes=passiveTreeRoutes(nodes,edges);assert.equal(routes.size,edges.length);
const segments=[...routes.values()].flatMap(route=>route.points.slice(1).map((b,i)=>({route,a:route.points[i],b})));
let crossings=0;
const side=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number})=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j];if(a.route===b.route)continue;
  if(side(a.a,a.b,b.a)*side(a.a,a.b,b.b)<-.001&&side(b.a,b.b,a.a)*side(b.a,b.b,a.b)<-.001)crossings++;
  assert(!passiveRoutesOverlap(a.a,a.b,b.a,b.b),`Separate routes share a track: ${a.route.a}/${b.route.a}`);
}
// This content budget catches a return to the old dense web (1,545 crossings).
// Adding content may warrant a reviewed budget, never silent route removal.
assert(crossings/edges.length<.30,`Too many crossing segments: ${crossings}/${edges.length}`);
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
// A shallow crossing close to the overlap-length cutoff must be symmetric.
const nearParallel=[{x:2625.638917,y:3079.638917},{x:2615.638917,y:3089.638917},{x:2632.425911,y:3081.047192},{x:2620.975928,y:3091.975928}];
assert(passiveRoutesOverlap(nearParallel[0],nearParallel[1],nearParallel[2],nearParallel[3]));
assert(passiveRoutesOverlap(nearParallel[2],nearParallel[3],nearParallel[0],nearParallel[1]));
// A longer route can go around an existing track when doing so removes a crossing.
const crossingFixture=[point('a',100,200),point('b',300,200),point('c',200,100),point('d',200,300)];
const rerouted=[...buildPassiveTreeRoutes(crossingFixture,[['a','b'],['c','d']],CFG.crossingCost).values()];
for(let i=1;i<rerouted[0].points.length;i++)for(let j=1;j<rerouted[1].points.length;j++){
  const a=rerouted[0].points[i-1],b=rerouted[0].points[i],c=rerouted[1].points[j-1],d=rerouted[1].points[j];
  assert(!(side(a,b,c)*side(a,b,d)<-.001&&side(c,d,a)*side(c,d,b)<-.001),'Avoidable crossing remained');
}
console.log(`PASS passive tree layout: ${nodes.length} nodes, ${routes.size} preserved routes, ${crossings} crossing segments, ${detours} node-avoiding detours, no overlaps or obstructed connections`);
