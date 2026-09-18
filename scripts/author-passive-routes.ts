// One-shot authoring tool. Ships explicit editable rows, never a runtime tree
// generator. Refuses an already-expanded tree to protect subsequent hand edits.
// npx tsx scripts/author-passive-routes.ts [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { PASSIVE_NODES, type PassiveNode } from '../src/data/passives';
import { CROSSROADS_PURSUITS, CROSSROADS_TECHNIQUES, CROSSROADS_SCHOOLS } from '../src/data/passiveCrossroads';
import { ROUTE_ACCENTS } from '../src/data/passiveRoutes';
import { auditPassiveRoutes, passiveWalkingGraph } from '../src/data/passiveTopology';
import type { PassiveChoiceOption } from '../src/data/passiveChoices';

if (Object.keys(PASSIVE_NODES).some(id => id.startsWith('route_'))) throw Error('Routes already authored; edit their explicit rows or use the visual editor.');
const nodes = structuredClone(PASSIVE_NODES), added: PassiveNode[] = [];
const old = Object.values(nodes).filter(n => !n.realm && !n.vocation && !n.choice);
const occupied = Object.values(nodes).filter(n => !n.realm);
const radii = { start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15, choice: 15 };
const distance = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y);
function lineDistance(p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) {
  const dx=b.x-a.x,dy=b.y-a.y, t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
const edges: [PassiveNode,PassiveNode][] = [];
for(const n of occupied) for(const id of n.links) if(nodes[id] && !nodes[id].realm) edges.push([n,nodes[id]]);
function seat(x:number,y:number,links:string[]) {
  for(let ring=0;ring<=300;ring+=10) {
    const candidates=[];
    for(let i=0;i<(ring?36:1);i++) {
      const p={x:Math.round(x+ring*Math.cos(i*Math.PI/18)),y:Math.round(y+ring*Math.sin(i*Math.PI/18))};
      if(p.x<30||p.y<30||p.x>5970||p.y>5970)continue;
      if(occupied.some(n=>distance(p,n)<14+radii[n.kind]+12))continue;
      if(edges.some(([a,b])=>lineDistance(p,a,b)<20))continue;
      if(links.some(id=>occupied.some(n=>n.id!==id&&lineDistance(n,p,nodes[id])<radii[n.kind]+5)))continue;
      candidates.push(p);
    }
    if(candidates.length) return candidates.sort((a,b)=>links.reduce((s,id)=>s+distance(a,nodes[id])-distance(b,nodes[id]),0))[0];
  }
  throw Error(`No readable space at ${x},${y}, links ${links}`);
}
function add(id:string,payload:PassiveChoiceOption,x:number,y:number,links:string[]) {
  if(nodes[id])throw Error('Duplicate authored node id: '+id);
  const {id:_option,...grant}=payload;
  const n:PassiveNode={...structuredClone(grant),id,kind:'notable',...seat(x,y,links),links:[...new Set(links)]};
  nodes[id]=n;added.push(n);occupied.push(n);
  for(const to of n.links)edges.push([n,nodes[to]]);
  return n;
}
const homes=['str','prw','int','wis','fin','dex','for','wil','cha'];
const schoolIds=['impact','tempo','arcana','host','guile','devices','bastion','entropy','chorus'];
// Each opening has three intelligible identities, including a hybrid route.
// These are authoring choices, not class restrictions or a runtime special case.
const openings = [
  { pursuits: ['dance','counter','hunter'], techniques: ['momentum','recovery','poise'] },
  { pursuits: ['weaver','devotee','affliction'], techniques: ['momentum','evasion','harvest'] },
  { pursuits: ['focus','weaver','devotee'], techniques: ['drain','reserve','conduit'] },
  { pursuits: ['keeper','healer','engineer'], techniques: ['funeral','harvest','duration'] },
  { pursuits: ['hunter','affliction','dance'], techniques: ['ambush','opener','evasion'] },
  { pursuits: ['engineer','control','focus'], techniques: ['reach','velocity','duration'] },
  { pursuits: ['counter','risk','healer'], techniques: ['thorns','poise','recovery'] },
  { pursuits: ['affliction','risk','control'], techniques: ['pressure','drain','duration'] },
  { pursuits: ['healer','weaver','keeper'], techniques: ['ward','conduction','conduit'] },
];
for(let s=0;s<homes.length;s++) {
  const home=nodes[homes[s]+'_start'],theta=Math.atan2(home.y-3000,home.x-3000),c=Math.cos(theta),v=Math.sin(theta);
  const group=CROSSROADS_SCHOOLS.find(g=>g.id==='crossroads_'+schoolIds[s])!;
  // Front-load three different fighting styles. The school and event powers
  // then interleave with investments and grafts, rather than a corridor of tax.
  const payloads:PassiveChoiceOption[]=[
    ...openings[s].pursuits.map(id=>CROSSROADS_PURSUITS.options.find(o=>o.id===id)!),
    ...openings[s].techniques.map(id=>CROSSROADS_TECHNIQUES.options.find(o=>o.id===id)!),
    ...group.options.slice(0,3), ...ROUTE_ACCENTS[schoolIds[s]].slice(0,3),
    ...group.options.slice(3,6), ...ROUTE_ACCENTS[schoolIds[s]].slice(3),
    ...group.options.slice(6),
  ];
  const rows:PassiveNode[][]=[];
  for(let row=0;row<8;row++) {
    const layer:PassiveNode[]=[];
    for(let lane=0;lane<3;lane++) {
      const depth=100+row*80,side=(lane-1)*88;
      const links=row?[rows[row-1][lane].id]:[home.id];
      if(lane)links.push(layer[lane-1].id);
      const p=payloads[row*3+lane];
      const origin=['pursuit','technique','school','accent','school','accent','school','school'][row];
      layer.push(add(`route_${homes[s]}_${origin}_${p.id}`,p,home.x+c*depth-v*side,home.y+v*depth+c*side,links));
    }
    rows.push(layer);
  }
  // Every far end reconnects to existing geography through a real node.
  // Add only links whose visible stroke misses every other node's disc.
  for(const tip of rows[7]) {
    const exit=old.filter(n=>n.kind!=='start' && distance(tip,n)<600
      && !occupied.some(o=>o.id!==tip.id&&o.id!==n.id&&lineDistance(o,tip,n)<radii[o.kind]+5))
      .sort((a,b)=>distance(tip,a)-distance(tip,b))[0];
    if(!exit)throw Error('No readable exit for '+tip.id);
    tip.links.push(exit.id);edges.push([tip,exit]);
  }
}

let bridges=0;
function bridge(from:string,preferred?:Set<string>) {
  const a=nodes[from],graph=passiveWalkingGraph(nodes,true);
  const home=homes.map((id,i)=>({i,n:nodes[id+'_start']})).sort((a1,b)=>distance(a,a1.n)-distance(a,b.n))[0].i;
  const payloads=[...CROSSROADS_SCHOOLS.find(g=>g.id==='crossroads_'+schoolIds[home])!.options,...ROUTE_ACCENTS[schoolIds[home]]];
  const candidates=Object.keys(graph).filter(id=>id!==from&&!graph[from].includes(id)&&(!preferred||preferred.has(id)))
    .map(id=>nodes[id]).sort((a1,b)=>distance(a,a1)-distance(a,b));
  for(const b of candidates.slice(0,35)) {
    if(distance(a,b)>900)break;
    try {
      add(`route_bridge_${String(++bridges).padStart(3,'0')}`,payloads[(bridges-1)%payloads.length],(a.x+b.x)/2,(a.y+b.y)/2,[a.id,b.id]);
      return;
    }catch{bridges--;}
  }
  throw Error('No bridge for '+from);
}
// Menu-only doors are not travel forks. Join any component they previously
// gated, then split all remaining degree-two corridors in either direction.
for(let guard=0;guard<500;guard++) {
  const audit=auditPassiveRoutes(nodes);
  if(audit.unreachable.length) {
    const targets=new Set(Object.keys(audit.graph).filter(id=>!audit.unreachable.includes(id)));
    const from=audit.unreachable.sort((a,b)=>Math.min(...[...targets].map(id=>distance(nodes[a],nodes[id])))-Math.min(...[...targets].map(id=>distance(nodes[b],nodes[id]))))[0];
    bridge(from,targets);continue;
  }
  if(!audit.corridors.length) {
    const menus=auditPassiveRoutes(nodes,true);
    if(!menus.corridors.length)break;
    bridge(menus.corridors[0].find(id=>nodes[id].choice) ?? menus.corridors[0][0]);continue;
  }
  const [a,b]=audit.corridors[0];
  bridge(audit.graph[a].filter(id=>audit.graph[id].length===2).length>=audit.graph[b].filter(id=>audit.graph[id].length===2).length?a:b);
}
const audit=auditPassiveRoutes(nodes);
if(audit.corridors.length||audit.unreachable.length)throw Error('Unfinished route audit');
const rows=added.map(n=>'  '+JSON.stringify(n)+',').join('\n');
if(process.argv.includes('--write')) {
  const path='src/data/passives.ts',source=readFileSync(path,'utf8');
  writeFileSync(path,source.replace('const nodes: PassiveNode[] = [','const nodes: PassiveNode[] = [\n  // Physical routes: explicit, editor-owned grants and links.\n'+rows));
}
console.log(JSON.stringify({added:added.length,bridges,walkingNodes:audit.nodes,forks:audit.forks,corridors:audit.corridors.length,unreachable:audit.unreachable.length},null,2));
