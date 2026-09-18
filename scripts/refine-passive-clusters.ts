// One-shot authoring transform. Output is explicit, visually editable nodes.
// No runtime prerequisites, support binding, or node-specific combat behavior.
import {readFileSync,writeFileSync} from 'node:fs';
import {PASSIVE_NODES,type PassiveNode} from '../src/data/passives';
import {NATIVE_PASSIVE_SCHOOLS,PASSIVE_TRAINING} from '../src/data/passiveNotables';
import {CROSSROADS_SCHOOLS} from '../src/data/passiveCrossroads';
import {ROUTE_ACCENTS} from '../src/data/passiveRoutes';
import {auditPassiveRoutes} from '../src/data/passiveTopology';

if(Object.keys(PASSIVE_NODES).some(id=>id.startsWith('prep_')))throw Error('Investment clusters already authored. Use the visual editor for further changes.');
const nodes=structuredClone(PASSIVE_NODES),before=structuredClone(nodes);
const homes:Record<string,string>={str:'impact',prw:'tempo',int:'arcana',wis:'host',fin:'guile',dex:'devices',for:'bastion',wil:'entropy',cha:'chorus'};
// Historical import keys belong only to this one-shot transform, never to the
// new powers or combat registry. Their order matches the six authored powers.
const oldSupports:Record<string,string[]>={
  impact:['crushing_impact','battering_ram','iron_grip','trebuchet_arm','wringing_grip','siegebreaker'],
  tempo:['serrated_edge','answering_steel','cast_on_crit','cast_on_kill','culmination','gathered_casting'],
  arcana:['cast_while_channeling','cast_on_overcharge','sequenced_invocation','refraction','unstable_compression','entropic_bloom'],
  host:['brood_tender','ghostly_communion','gift_of_the_choir','legion_doctrine','hiveborn','parasitic_pact'],
  guile:['envenomed_tips','fowlers_eye','quailbane','overmatch','regicide','limbreaver'],
  devices:['packed_workshop','overwound_mechanism','hair_trigger','tinkers_arsenal','barbed_snare','parting_gift'],
  bastion:['unyielding_stance','bulwark_of_thorns','counterweight','shieldwall_doctrine','answering_wall','stalwart_rhythm'],
  chorus:['held_note','countermelody','rising_chorus','commanding_presence','mending_echoes','sanguine_feast'],
  entropy:['lingering_moment','borrowed_haste','smothering_spores','loose_thread','putrefaction','epidemic'],
};
const replacements=Object.fromEntries(Object.entries(oldSupports).flatMap(([school,supports])=>supports.map((support,i)=>[support,{school,power:NATIVE_PASSIVE_SCHOOLS[school][i]}])));
replacements.skewering_blows={school:'guile',power:NATIVE_PASSIVE_SCHOOLS.guile[4]};
replacements.guardians_aegis={school:'bastion',power:NATIVE_PASSIVE_SCHOOLS.bastion[2]};
replacements.seeker={school:'guile',power:NATIVE_PASSIVE_SCHOOLS.guile[5]};
const themes=new Map<string,string>(),capstones=new Set<string>();
for(const n of Object.values(nodes)) {
  if(n.vocation)continue;
  if(n.graft) {
    const replacement=replacements[n.graft.support];if(!replacement)throw Error('Missing replacement '+n.graft.support);
    const {id:_id,...payload}=structuredClone(replacement.power);
    const legacy=!n.id.startsWith('route_');
    const oldText=n.description.split('GRAFT:')[0].trim();
    const oldMods=n.mods??[];
    Object.assign(n,payload);delete n.graft;
    if(legacy){n.mods=[...oldMods,...(n.mods??[])];n.description=oldText+' '+n.description;}
    themes.set(n.id,replacement.school);capstones.add(n.id);
  }
  if(n.id.startsWith('route_')) {
    if(n.conduit||n.mods?.some(m=>m.stat.startsWith('proc_')||m.kind==='link'))capstones.add(n.id);
    n.kind=capstones.has(n.id)?'notable':'small';
  }
  // Repeated bridge rewards become supporting investments. The full powers
  // remain in their school clusters, so travel no longer hands out capstones.
  if(n.id.startsWith('route_bridge_')) {
    const school=theme(n),slot=Number(n.id.split('_').at(-1))%3;
    const {id:_id,...payload}=structuredClone(PASSIVE_TRAINING[school][slot]);
    Object.assign(n,payload);n.kind='small';delete n.conduit;capstones.delete(n.id);
  }
  if(n.id.startsWith('cross_')) {
    const school=homes[n.id.split('_')[1]];themes.set(n.id,school);
    if(n.id.endsWith('_mastery')) {
      capstones.add(n.id);n.description=`Choose one native ${school} mastery after investing in its supporting passives. Each option can be chosen once per character.`;
    } else {
      const slot=n.id.endsWith('_pursuit')?0:n.id.endsWith('_technique')?1:2;
      const {id:_id,...payload}=structuredClone(PASSIVE_TRAINING[school][slot]);
      Object.assign(n,payload);n.kind='small';delete n.choice;
    }
  }
}
function theme(n:PassiveNode):string {
  if(themes.has(n.id))return themes.get(n.id)!;
  for(const [school,options] of Object.entries(ROUTE_ACCENTS))if(options.some(o=>o.name===n.name))return school;
  for(const group of CROSSROADS_SCHOOLS)if(group.options.some(o=>o.name===n.name))return group.id.replace('crossroads_','');
  const prefix=n.id.split('_')[1];if(homes[prefix])return homes[prefix];
  const home=Object.keys(homes).sort((a,b)=>Math.hypot(n.x-nodes[a+'_start'].x,n.y-nodes[a+'_start'].y)-Math.hypot(n.x-nodes[b+'_start'].x,n.y-nodes[b+'_start'].y))[0];
  return homes[home];
}
const added:PassiveNode[]=[];
// Preserve every travel connection at its existing coordinate, transferring it
// to a small entry node. Both feeder branches are needed as alternatives, not
// as forced linear tax. The capstone has no links outside those two feeders.
for(const id of capstones) {
  const n=nodes[id],{id:_id,...payload}=structuredClone(PASSIVE_TRAINING[theme(n)][0]);
  const entry:PassiveNode={...payload,description:payload.description+' Leads toward '+n.name+'.',id:`prep_${id}_entry`,kind:'small',x:n.x,y:n.y,links:[...n.links],...(n.realm?{realm:n.realm}:{})};
  nodes[entry.id]=entry;added.push(entry);
}
for(const n of Object.values(nodes)) {
  n.links=n.links.map(id=>capstones.has(id)?`prep_${id}_entry`:id);
  if(capstones.has(n.id))n.links=[];
}
const radii:Record<PassiveNode['kind'],number>={start:13,small:9,notable:14,keystone:17,attr:11,vocation:15,choice:15};
const occupied=Object.values(nodes).filter(n=>!capstones.has(n.id));
type Point={x:number;y:number};
const d=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function lineDistance(p:Point,a:Point,b:Point) {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
const edges:{a:Point;b:Point;realm?:string}[]=[];
for(const n of occupied)for(const id of n.links)if(nodes[id])edges.push({a:n,b:nodes[id],realm:n.realm});
function place(n:PassiveNode) {
  const entry=nodes[`prep_${n.id}_entry`],same=occupied.filter(o=>o.realm===n.realm),lines=edges.filter(e=>e.realm===n.realm);
  const preferred=Math.atan2(entry.y-3000,entry.x-3000);
  for(let reach=45;reach<=500;reach+=15)for(const spread of [20,28,36])for(let turn=0;turn<96;turn++) {
    const angle=preferred+(turn%2?1:-1)*Math.ceil(turn/2)*Math.PI/48,c=Math.cos(angle),s=Math.sin(angle);
    const point=(r:number,side:number):Point=>({x:Math.round(entry.x+c*r-s*side),y:Math.round(entry.y+s*r+c*side)});
    const a=point(reach,-spread),b=point(reach,spread),crown=point(reach+58,0),junction=n.choice?point(reach,0):undefined;
    const pts=[a,b,crown,...(junction?[junction]:[])],rs=[9,9,radii[n.kind],9];
    if(pts.some((p,i)=>pts.some((q,j)=>i<j&&d(p,q)<rs[i]+rs[j]+10)))continue;
    if(pts.some((p,i)=>p.x<rs[i]+12||p.y<rs[i]+12||p.x>5988-rs[i]||p.y>5988-rs[i]))continue;
    if(pts.some((p,i)=>same.some(o=>d(p,o)<rs[i]+radii[o.kind]+10)))continue;
    if(pts.some((p,i)=>lines.some(e=>lineDistance(p,e.a,e.b)<rs[i]+5)))continue;
    const paths:[Point,Point][]=[[entry,a],[entry,b],[a,crown],[b,crown],...(junction?[[a,junction],[b,junction],[entry,junction]] as [Point,Point][]:[[a,b]] as [Point,Point][])];
    if(paths.some(([p,q])=>same.some(o=>o!==entry&&lineDistance(o,p,q)<radii[o.kind]+4)))continue;
    return {a,b,crown,junction,paths};
  }
  throw Error('No readable investment cluster at '+n.id);
}
for(const id of [...capstones].sort((a,b)=>Number(b.startsWith("cross_"))-Number(a.startsWith("cross_")))) {
  const n=nodes[id],entry=nodes[`prep_${id}_entry`],layout=place(n),school=theme(n);
  for(const [slot,position] of [['a',layout.a],['b',layout.b]] as const) {
    const {id:_id,...payload}=structuredClone(PASSIVE_TRAINING[school][slot==='a'?1:2]);
    const feeder:PassiveNode={...payload,description:payload.description+' Leads toward '+n.name+'.',id:`prep_${id}_${slot}`,kind:'small',...position,links:layout.junction?[entry.id,`prep_${id}_junction`,id]:slot==='a'?[entry.id,`prep_${id}_b`,id]:[entry.id,id],...(n.realm?{realm:n.realm}:{})};
    nodes[feeder.id]=feeder;added.push(feeder);occupied.push(feeder);
  }
  if(layout.junction) {
    const {id:_id,...payload}=structuredClone(PASSIVE_TRAINING[school][0]);
    const junction:PassiveNode={...payload,description:payload.description+' Leads toward '+n.name+'.',id:`prep_${id}_junction`,kind:'small',...layout.junction,links:[entry.id],...(n.realm?{realm:n.realm}:{})};
    nodes[junction.id]=junction;added.push(junction);occupied.push(junction);
  }
  Object.assign(n,layout.crown);occupied.push(n);
  for(const [a,b] of layout.paths)edges.push({a,b,realm:n.realm});
}
for(const choice of [false,true]) {
  const audit=auditPassiveRoutes(nodes,choice);
  if(audit.corridors.length||audit.unreachable.length)throw Error(`Routes broke: ${JSON.stringify(audit.corridors)}; unreachable ${audit.unreachable}`);
}
const path='src/data/passives.ts',source=readFileSync(path,'utf8');
const lines=source.split('\n').map(line=>{
  const id=line.match(/^\s*\{ id: "([^"]+)"/)?.[1]??line.match(/^\s*\{.*?"id":"([^"]+)"/)?.[1];
  if(!id||!nodes[id]||JSON.stringify(nodes[id])===JSON.stringify(before[id]))return line;
  return '  '+JSON.stringify(nodes[id])+',';
});
// Individual arguments avoid TypeScript's whole-array union complexity limit.
const output=lines.join('\n').replace('const nodes: PassiveNode[] = [','const nodes: PassiveNode[] = [];\nnodes.push(').replace('\n];','\n);').replace('nodes.push(','nodes.push(\n  // Investment clusters: small entry, two useful feeder routes, native capstone.\n'+added.map(n=>'  '+JSON.stringify(n)+',').join('\n'));
if(process.argv.includes('--write'))writeFileSync(path,output);
const tree=Object.values(nodes).filter(n=>!n.realm&&!n.vocation);
console.log(JSON.stringify({replacedDirectGrafts:Object.values(before).filter(n=>n.graft&&!n.vocation).length,capstones:capstones.size,addedSmallNodes:added.length,main:tree.length,small:tree.filter(n=>n.kind==='small').length,notable:tree.filter(n=>n.kind==='notable').length,choice:tree.filter(n=>n.choice).length},null,2));
