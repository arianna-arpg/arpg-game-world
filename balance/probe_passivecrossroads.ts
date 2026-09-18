// Optional school masteries remain, but ordinary openings never deal menus.
import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {PASSIVE_NODES as N,PASSIVE_ADJACENCY as A} from '../src/data/passives';
import {CROSSROADS_SCHOOLS} from '../src/data/passiveCrossroads';
import {choiceSearchText,sanitizeChoices,sanitizeGrafts,validatePassiveChoices} from '../src/data/passiveChoices';
import {serializeCharacter,applySavedCharacter} from '../src/meta/character';
import {serializeSeatMeta,applySeatMeta} from '../src/net/snapshot';
let failures=0,checks=0;
function check(label:string,ok:boolean){checks++;if(!ok)failures++;console.log(`${ok?'PASS':'FAIL'} ${label}`);}
seedGlobalRandom(1234);bootSimEngine();
const menus=Object.values(N).filter(n=>n.id.startsWith('cross_')&&n.choice);
check('nine optional school masteries remain',menus.length===9&&menus.every(n=>n.id.endsWith('_mastery')));
check('27 former menu openings are ordinary small passives',Object.values(N).filter(n=>n.id.startsWith('cross_')&&!n.choice&&n.kind==='small').length===27);
const errors:string[]=[];validatePassiveChoices(s=>errors.push(s),N);
check('choice registry is valid',errors.length===0);
const w=makeSimWorld('warrior',1234);
for(const node of menus) {
  const group=CROSSROADS_SCHOOLS.find(g=>g.id===node.choice!.group)!;
  check(`${node.name}: twelve native options, no grafts`,group.options.length===12&&group.options.every(o=>!o.graft));
  for(const option of group.options) {
    w.meta.allocated=new Set(['str_start',...A[node.id]]);w.meta.choices={};w.meta.grafts={};w.meta.passivePoints=1;w.recalcSeat(w.localSeat);
    check(`${node.name}/${option.name}: rejects missing and unknown selections`,!w.allocateNode(node.id)&&!w.allocateNode(node.id,undefined,'missing-option'));
    const took=w.allocateNode(node.id,undefined,option.id);
    check(`${node.name}/${option.name}: spends one point and applies payload`,took&&w.meta.passivePoints===0&&(option.mods??[]).every(m=>w.player.sheet.getSourceMods('passives')?.includes(m))&&(!option.conduit||w.player.wornConduits?.includes(option.conduit)===true));
    w.meta.passivePoints=1;check(`${node.name}/${option.name}: cannot buy a second option`,!w.allocateNode(node.id,undefined,group.options.find(o=>o.id!==option.id)!.id));
  }
  check(`${node.name}: search sees its native mechanics`,group.options.every(o=>choiceSearchText(node).includes(o.name.toLowerCase())));
}
const node=N.cross_str_mastery,option=CROSSROADS_SCHOOLS.find(g=>g.id===node.choice!.group)!.options[6];
w.meta.allocated=new Set(['str_start',...A[node.id]]);w.meta.choices={};w.meta.grafts={};w.meta.passivePoints=1;w.recalcSeat(w.localSeat);w.allocateNode(node.id,undefined,option.id);
const saved=serializeCharacter(w),loaded=makeSimWorld('warrior',1235);
check('character save restores native mastery and point spending',applySavedCharacter(loaded,saved)&&loaded.meta.choices[node.id]?.[0]===option.id&&loaded.meta.passivePoints===0&&(option.mods??[]).every(m=>loaded.player.sheet.getSourceMods('passives')?.includes(m)));
applySeatMeta(loaded,loaded.localSeat,serializeSeatMeta(w.localSeat));
check('co-op restores the same native mastery',loaded.meta.choices[node.id]?.[0]===option.id&&(option.mods??[]).every(m=>loaded.player.sheet.getSourceMods('passives')?.includes(m)));
const sibling={...node,id:'probe_mastery_sibling'};
const dirty={[node.id]:[option.id,'breach'],[sibling.id]:[option.id],cross_str_pursuit:['hunter']};
const clean=sanitizeChoices(dirty,{...N,[sibling.id]:sibling});
check('loading enforces pick limit, character uniqueness and retired menu cleanup',clean[node.id]?.length===1&&!clean[sibling.id]&&!clean.cross_str_pursuit&&dirty[node.id].length===2);
check('retired passive graft bindings are discarded',Object.keys(sanitizeGrafts({'cross_str_mastery:graft_crushing_impact':'cleave',route_str_school_graft_crushing_impact:'cleave'},w.meta.allocated,w.meta.choices,N,()=>true)).length===0);
console.log(`Native masteries: ${checks} checks, ${failures} failures.`);
if(failures)process.exitCode=1;
