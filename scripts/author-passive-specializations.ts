// One-shot, deterministic authoring. The output is plain editor-owned rows.
// npx tsx scripts/author-passive-specializations.ts [--write]
import {readFileSync,writeFileSync} from 'node:fs';
import {PASSIVE_NODES,type PassiveNode} from '../src/data/passives';
import {PASSIVE_SPECIALIZATIONS as PASSIVE_DISCIPLINES} from '../src/data/passiveSpecializations';
import {auditPassiveRoutes,passiveWalkingGraph} from '../src/data/passiveTopology';
import type {PassiveChoiceOption} from '../src/data/passiveChoices';

if(Object.keys(PASSIVE_NODES).some(id=>id.startsWith('spec_')))throw Error('Already authored; use the visual editor.');
const nodes=structuredClone(PASSIVE_NODES),added:PassiveNode[]=[];
const radii={start:13,small:9,notable:14,keystone:17,attr:11,vocation:15,choice:15};
type Point={x:number;y:number};
const d=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function lineDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
const occupied=Object.values(nodes).filter(n=>!n.realm);
const edges:[PassiveNode,PassiveNode][]=[];
for(const a of occupied)for(const id of a.links)if(nodes[id]&&!nodes[id].realm)edges.push([a,nodes[id]]);
const baseline=passiveWalkingGraph(nodes),graph=structuredClone(baseline);
function distances(from:string){const out:Record<string,number>={[from]:0},q=[from];for(let i=0;i<q.length;i++)for(const id of graph[q[i]])if(out[id]===undefined){out[id]=out[q[i]]+1;q.push(id);}return out;}
// Only existing travel junctions are ports. Neither a notable nor its feeder
// can acquire a bypass. Keep the first two opening allocations unchanged.
const early=new Set(Object.values(nodes).filter(n=>n.kind==='start'&&graph[n.id]).flatMap(n=>Object.entries(distances(n.id)).filter(([,depth])=>depth<2).map(([id])=>id)));
const ports=Object.values(nodes).filter(n=>!n.realm&&!n.vocation&&!n.choice&&(n.kind==='small'||n.kind==='attr')&&baseline[n.id]?.length>=3&&!early.has(n.id)&&(!/^(prep_|weave_)/.test(n.id)||n.id.endsWith('_entry')||n.id.startsWith('weave_link_')));
const used=new Map<string,number>();
// Spatial buckets keep exhaustive clearance checks practical as the web grows.
const nodeGrid=new Map<string,Set<PassiveNode>>(),edgeGrid=new Map<string,Set<[PassiveNode,PassiveNode]>>();
function cells(a:Point,b=a,pad=32){const out:string[]=[];for(let x=Math.floor((Math.min(a.x,b.x)-pad)/100);x<=Math.floor((Math.max(a.x,b.x)+pad)/100);x++)for(let y=Math.floor((Math.min(a.y,b.y)-pad)/100);y<=Math.floor((Math.max(a.y,b.y)+pad)/100);y++)out.push(x+','+y);return out;}
function index<T>(grid:Map<string,Set<T>>,item:T,a:Point,b=a){for(const key of cells(a,b)){if(!grid.has(key))grid.set(key,new Set());grid.get(key)!.add(item);}}
function query<T>(grid:Map<string,Set<T>>,a:Point,b=a){const out=new Set<T>();for(const key of cells(a,b))for(const item of grid.get(key)??[])out.add(item);return [...out];}
for(const n of occupied)index(nodeGrid,n,n);for(const edge of edges)index(edgeGrid,edge,...edge);
function clearPoint(p:Point,r:number){return p.x>r+12&&p.y>r+12&&p.x<5988-r&&p.y<5988-r&&!query(nodeGrid,p).some(n=>d(n,p)<r+radii[n.kind]+10)&&!query(edgeGrid,p).some(([a,b])=>lineDistance(p,a,b)<r+5);}
function clearLine(a:Point,b:Point,skip:string[]=[]){return !query(nodeGrid,a,b).some(n=>!skip.includes(n.id)&&lineDistance(n,a,b)<radii[n.kind]+4);}
function add(n:PassiveNode){nodes[n.id]=n;added.push(n);occupied.push(n);index(nodeGrid,n,n);graph[n.id]=[];for(const id of n.links){graph[n.id].push(id);graph[id].push(n.id);const edge:[PassiveNode,PassiveNode]=[n,nodes[id]];edges.push(edge);index(edgeGrid,edge,...edge);}return n;}
function row(id:string,p:PassiveChoiceOption,kind:PassiveNode['kind'],at:Point,links:string[],toward?:string):PassiveNode{const {id:_,keystone:__,...payload}=structuredClone(p) as PassiveChoiceOption & {keystone?:true};return {...payload,id,kind,...at,description:p.description+(toward?` Leads toward ${toward}.`:''),links};}
function pairCandidates(target:Point,minSaving:number){
  const local=ports.filter(n=>(used.get(n.id)??0)<3).sort((a,b)=>d(a,target)-d(b,target)).slice(0,150);
  const pairs:{a:PassiveNode;b:PassiveNode;score:number}[]=[];
  for(let i=0;i<local.length;i++){
    const a=local[i],steps=distances(a.id);
    for(const b of local.slice(i+1))if(d(a,b)<650&&d(a,b)>65&&steps[b.id]>=minSaving+2){
      const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      pairs.push({a,b,score:d(midpoint,target)+d(a,b)*.15+(used.get(a.id)??0)*75+(used.get(b.id)??0)*75});
    }
  }
  return pairs.sort((a,b)=>a.score-b.score);
}
for(const discipline of PASSIVE_DISCIPLINES)for(const [index,power] of discipline.powers.entries()){
  const ordinal=PASSIVE_DISCIPLINES.indexOf(discipline);
  const home=nodes[discipline.homes[index%2]+'_start'],angle=Math.atan2(home.y-3000,home.x-3000)+(ordinal%3-1)*.3,reach=400+110*index+40*(ordinal%4);
  const target={x:home.x+Math.cos(angle)*reach,y:home.y+Math.sin(angle)*reach};
  let placed=false;
  search:for(const {a,b} of pairCandidates(target,2)){
    const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    for(const radius of [0,45,85,130,190,260,350,450])for(let turn=0;turn<(radius?16:1);turn++){
      const entry={x:Math.round(middle.x+radius*Math.cos(turn*Math.PI/8)),y:Math.round(middle.y+radius*Math.sin(turn*Math.PI/8))};
      if(!clearPoint(entry,9)||!clearLine(entry,a,[a.id])||!clearLine(entry,b,[b.id]))continue;
      for(let rotation=0;rotation<24;rotation++){
        const theta=rotation*Math.PI/12,c=Math.cos(theta),s=Math.sin(theta);
        const at=(r:number,side:number)=>({x:Math.round(entry.x+c*r-s*side),y:Math.round(entry.y+s*r+c*side)});
        const left=at(60,-27),right=at(60,27),cap=at(120,0),points=[entry,left,right,cap];
        const capRadius=power.keystone?17:14; if(!clearPoint(left,9)||!clearPoint(right,9)||!clearPoint(cap,capRadius))continue;
        const lines:[[Point,Point],...Array<[Point,Point]>]=[[entry,a],[entry,b],[entry,left],[entry,right],[left,right],[left,cap],[right,cap]];
        if(lines.slice(2).some(([x,y])=>!clearLine(x,y)))continue;
        if(lines.some(([x,y])=>points.some((p,i)=>p!==x&&p!==y&&lineDistance(p,x,y)<(i===3?capRadius:9)+4)))continue;
        const id=`spec_${discipline.id}_${power.id}`;
        add(row(id+'_entry',discipline.training[0],'small',entry,[a.id,b.id],power.name));
        add(row(id+'_a',discipline.training[1],'small',left,[id+'_entry'],power.name));
        add(row(id+'_b',discipline.training[2],'small',right,[id+'_entry',id+'_a'],power.name));
        add(row(id,power,power.keystone?'keystone':'notable',cap,[id+'_a',id+'_b']));
        used.set(a.id,(used.get(a.id)??0)+1);used.set(b.id,(used.get(b.id)??0)+1);
        placed=true;break search;
      }
    }
  }
  if(!placed)throw Error('No readable two-port cluster for '+power.id);
  console.log('Authored '+power.name);
}
for(const menus of [false,true]){const audit=auditPassiveRoutes(nodes,menus);if(audit.corridors.length||audit.unreachable.length)throw Error('Incomplete topology audit');}
const path='src/data/passives.ts';
if(process.argv.includes('--write'))writeFileSync(path,readFileSync(path,'utf8').replace('nodes.push(','nodes.push(\n  // Specific schools: interlocking entrances, useful training and native specializations.\n'+added.map(n=>'  '+JSON.stringify(n)+',').join('\n')));
console.log(JSON.stringify({added:added.length,notables:added.filter(n=>n.kind==='notable').length,small:added.filter(n=>n.kind==='small').length,portsUsed:used.size,main:auditPassiveRoutes(nodes,true).nodes},null,2));
