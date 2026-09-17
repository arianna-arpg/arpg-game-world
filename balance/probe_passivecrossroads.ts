// The opening contract: actual point spending from every class/start, live
// grants, all graft admissions, save/wire sanitization, geometry and discovery.
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { greedyPassives } from '../src/sim/data/builds';
import { CLASSES } from '../src/data/classes';
import { CROSSROADS_GROUPS, CROSSROADS_PURSUITS, CROSSROADS_TECHNIQUES } from '../src/data/passiveCrossroads';
import { PASSIVE_NODES, PASSIVE_ADJACENCY } from '../src/data/passives';
import { choiceSearchText, sanitizeChoices, validatePassiveChoices } from '../src/data/passiveChoices';
import { validatePassiveLayout } from '../src/data/validatePassiveLayout';
import { validatePassiveRealms } from '../src/data/passiveRealms';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance, supportFitsInst } from '../src/engine/skills';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
const warns: string[] = [];
const previousWarn = console.warn;
console.warn = (...args: unknown[]) => { warns.push(args.join(' ')); };
seedGlobalRandom(0xc2055);
bootSimEngine();
console.warn = previousWarn;
const nodes = Object.values(PASSIVE_NODES).filter(n => n.id.startsWith('cross_'));
const starts = [...new Set(CLASSES.map(c => c.startNode))];
check('36 editable crossroads nodes and 138 distinct options', nodes.length === 36 && CROSSROADS_GROUPS.reduce((s,g)=>s+g.options.length,0) === 138);
check('all crossroads payload stats and link sources are registered', CROSSROADS_GROUPS.every(g=>g.options.every(o=>(o.mods??[]).every(m=>!!STAT_DEFS[m.stat] && (!m.fromStat || !!STAT_DEFS[m.fromStat])))));
check('no crossroads boot warnings', !warns.some(s=>/crossroads_|cross_/.test(s)), warns.filter(s=>/crossroads_|cross_/.test(s)).join('; '));
const geometry: string[] = [];
validatePassiveLayout(s=>geometry.push(s));
check('new nodes overlap nothing, stay in bounds and are reachable', !geometry.some(s=>s.includes('cross_')), geometry.filter(s=>s.includes('cross_')).join('; '));
const registry: string[] = [];
validatePassiveChoices(s=>registry.push(s), PASSIVE_NODES, id=>!!SUPPORTS[id]);
validatePassiveRealms(s=>registry.push(s), PASSIVE_NODES);
check('all new groups and realm references validate', !registry.some(s=>/crossroads_|cross_/.test(s)), registry.filter(s=>/crossroads_|cross_/.test(s)).join('; '));
check('new edges are reciprocal and reference actual nodes', nodes.every(n=>PASSIVE_ADJACENCY[n.id].every(id=>PASSIVE_NODES[id] && PASSIVE_ADJACENCY[id].includes(n.id))));
check('tree search sees nested grafts and mechanics', choiceSearchText(PASSIVE_NODES.cross_str_practice).includes('grappl') && choiceSearchText(PASSIVE_NODES.cross_str_technique).includes('conduit'));
check('tree search can resolve live support descriptions without a registry dependency',choiceSearchText(PASSIVE_NODES.cross_str_practice,id=>SUPPORTS[id]?.description??'').includes('hurled into the void'));

function reset(w: World, start: string, points = 4): void {
  w.meta.allocated = new Set([start]);
  w.meta.choices = {};
  w.meta.grafts = {};
  w.meta.passivePoints = points;
  w.recalcSeat(w.localSeat);
}
function prefix(start: string): string { return `cross_${start.split('_')[0]}`; }
function opening(w: World, start: string, opt = 'hunter'): boolean {
  return w.allocateNode(`${prefix(start)}_pursuit`, undefined, opt);
}
let pairCount = 0;
for (const start of starts) {
  const c = CLASSES.find(c=>c.startNode === start)!;
  const w = makeSimWorld(c.id, 0xc2055);
  let all = true;
  for (const p of CROSSROADS_PURSUITS.options) for (const t of CROSSROADS_TECHNIQUES.options) {
    reset(w, start, 2);
    const ok = opening(w, start, p.id) && w.allocateNode(`${prefix(start)}_technique`, undefined, t.id)
      && w.meta.passivePoints === 0 && w.meta.allocated.size === 3;
    all &&= ok;
    if (ok) pairCount++;
  }
  check(`${start}: every one of the 216 opening pairs costs exactly two points`, all);
  reset(w,start,2);
  check(`${start}: no skipping the first choice or spending blind`, !w.allocateNode(`${prefix(start)}_technique`,undefined,'ward') && !w.allocateNode(`${prefix(start)}_pursuit`));
  opening(w,start);
  const practice=PASSIVE_NODES[`${prefix(start)}_practice`];
  const group=CROSSROADS_GROUPS.find(g=>g.id === practice.choice!.group)!;
  check(`${start}: school reachable on point two`, w.allocateNode(practice.id,undefined,group.options[0].id) && w.meta.passivePoints === 0);
  check(`${start}: no third point for free`, !w.allocateNode(`${prefix(start)}_mastery`,undefined,group.options[1].id));
  w.meta.passivePoints=1;
  check(`${start}: mastery rejects repeated option but accepts a different one`, !w.allocateNode(`${prefix(start)}_mastery`,undefined,group.options[0].id) && w.allocateNode(`${prefix(start)}_mastery`,undefined,group.options[1].id));
}
check('all nine starting positions covered', starts.length === 9 && pairCount === 1944);
check('automatic reference builds never buy an unchosen deal or walk through it',CLASSES.every(c=>{
  const picks=greedyPassives(c.id,20), seen=new Set([c.startNode]);
  return picks.length===20 && picks.every(id=>{
    const valid=!PASSIVE_NODES[id].choice && PASSIVE_ADJACENCY[id].some(n=>seen.has(n));
    seen.add(id); return valid;
  });
}));
for (const c of CLASSES) {
  const w = makeSimWorld(c.id, 0xc2055);
  w.meta.passivePoints=2;
  check(`${c.name}: opens through its real starting allocation`, w.meta.allocated.has(c.startNode)
    && opening(w,c.startNode) && w.allocateNode(`${prefix(c.startNode)}_technique`,undefined,'recovery') && w.meta.passivePoints===0);
}

// Allocate every catalog entry through the real API. Grafts must fit an
// actual skill AND appear on its resolved instance without a real socket.
const w = makeSimWorld('warrior',0xc2055);
let grants=0, grafts=0;
for(const group of CROSSROADS_GROUPS) {
  const node=nodes.find(n=>n.choice?.group === group.id && !n.id.endsWith('_mastery'))!;
  const start=`${node.id.split('_')[1]}_start`;
  for(const o of group.options) {
    reset(w,start);
    if(group !== CROSSROADS_PURSUITS) opening(w,start);
    const took=w.allocateNode(node.id,undefined,o.id);
    const carried=o.mods?.every(m=>w.player.sheet.getSourceMods('passives')?.includes(m)) ?? true;
    const pumped=!o.conduit || w.player.wornConduits?.includes(o.conduit) === true;
    let bound=true;
    if(o.graft) {
      const def=SUPPORTS[o.graft.support];
      const host=Object.values(SKILLS).map(s=>makeSkillInstance(s)).find(inst=>supportFitsInst(def,inst));
      bound=!!host;
      if(host) {
        w.meta.knownSkills.set(host.def.id,host);
        const slots=host.sockets.length;
        bound=w.bindGraft(`${node.id}:${o.id}`,host.def.id)
          && host.grafts?.some(g=>g.def.id === def.id && g.level === 1) === true
          && host.sockets.length === slots;
        if(bound) grafts++;
        w.bindGraft(`${node.id}:${o.id}`,null);
        bound &&= !host.grafts?.some(g=>g.def.id === def.id);
      }
    }
    check(`grant ${group.id}/${o.id}`,took && carried && pumped && bound);
    if(took && carried && pumped && bound) grants++;
  }
}
check('138 live grants, including 54 bindable and removable grafts',grants===138 && grafts===54);

// These are actual play loops, beyond checking a modifier's presence.
reset(w,'str_start',2);
opening(w,'str_start','dance');
w.allocateNode('cross_str_technique',undefined,'momentum');
const p=w.player;
p.noteRecent('move'); w.update(.01);
check('movement pursuit and technique combine in the same live window',p.sheet.get('damage')>1 && p.sheet.get('attackSpeed')>1 && p.sheet.hasCondition('recentlyMoved'));
for(let i=0;i<120;i++) w.update(.05);
check('movement window expires',!p.sheet.hasCondition('recentlyMoved'));

reset(w,'str_start',2);
opening(w,'str_start','healer');
w.allocateNode('cross_str_technique',undefined,'ward');
p.ward=0; p.life=p.maxLife()*.5;
p.healBy(10); w.update(.05);
check('healing both empowers the pursuit and creates a ward',p.ward>0 && p.sheet.hasCondition('recentlyHealed') && p.sheet.get('damage')>1);

reset(w,'str_start',2);
opening(w,'str_start');
w.allocateNode('cross_str_technique',undefined,'conduit');
p.sheet.setSource('probe_conduit_isolation', [mod('manaRegen','override',0), mod('manaRegenPct','override',0), mod('poiseRegenPct','override',0)]);
p.mana=p.maxMana(); p.poise=0;
const beforeMana=p.mana;
for(let i=0;i<20;i++) w.update(.05);
check('worn conduit actually moves mana into poise',p.mana<beforeMana && p.poise>0, `mana ${beforeMana} -> ${p.mana}; poise ${p.poise}; max ${p.maxPoise()}`);
p.mana=p.maxMana()*.4; p.poise=0;
const manaBefore=p.mana;
w.update(.01);
check('conduit preserves its mana floor',p.mana===manaBefore && p.poise===0);
p.sheet.removeSource('probe_conduit_isolation');

// Round trip through the real character serializer, including a bound graft.
reset(w,'str_start',4);
opening(w,'str_start');
w.allocateNode('cross_str_technique',undefined,'conduit');
w.allocateNode('cross_str_practice',undefined,'graft_crushing_impact');
const source='cross_str_practice:graft_crushing_impact';
w.bindGraft(source,'cleave');
const saved=serializeCharacter(w);
const loaded=makeSimWorld('warrior',0xc2056);
check('save reload reconstructs picks, points, conduit and graft',applySavedCharacter(loaded,saved)
  && JSON.stringify(loaded.meta.choices)===JSON.stringify(w.meta.choices)
  && loaded.meta.passivePoints===w.meta.passivePoints
  && loaded.player.wornConduits?.length===1
  && loaded.meta.knownSkills.get('cleave')?.grafts?.some(g=>g.def.id==='crushing_impact')===true);
reset(loaded,'str_start');
check('rebuild removes discarded conduit and graft grants',!loaded.player.wornConduits?.length
  && !loaded.meta.knownSkills.get('cleave')?.grafts?.some(g=>g.def.id==='crushing_impact'));
applySeatMeta(loaded,loaded.localSeat,serializeSeatMeta(w.localSeat));
check('co-op metadata restores the same choices and derived grants', JSON.stringify(loaded.meta.choices)===JSON.stringify(w.meta.choices)
  && loaded.player.wornConduits?.length===1 && loaded.meta.knownSkills.get('cleave')?.grafts?.some(g=>g.def.id==='crushing_impact')===true);

const dirty={cross_str_pursuit:['hunter','risk'],cross_prw_pursuit:['hunter'],cross_int_pursuit:['risk'],cross_str_technique:['ward'],cross_for_practice:['wall']};
const clean=sanitizeChoices(dirty,PASSIVE_NODES);
check('save/wire cleanup prevents stacking the same character-unique option',clean.cross_str_pursuit?.[0]==='hunter' && !clean.cross_prw_pursuit && clean.cross_int_pursuit?.[0]==='risk' && clean.cross_str_pursuit.length===1);
check('sanitization retains unrelated groups and does not mutate input',clean.cross_str_technique?.[0]==='ward' && clean.cross_for_practice?.[0]==='wall' && dirty.cross_str_pursuit.length===2);
const sameId=sanitizeChoices({cross_str_pursuit:['counter'],cross_for_practice:['counter']},PASSIVE_NODES);
check('matching option ids in different groups remain independent',!!sameId.cross_str_pursuit && !!sameId.cross_for_practice);

// Graph-distance witness: no class needs a third point to discover its school.
function distance(start: string, goal: string): number {
  const seen=new Set([start]), queue:[string,number][]=[[start,0]];
  for(let i=0;i<queue.length;i++) {
    const [id,d]=queue[i]; if(id===goal) return d;
    for(const nb of PASSIVE_ADJACENCY[id]??[]) if(!seen.has(nb)){seen.add(nb);queue.push([nb,d+1]);}
  }
  return Infinity;
}
check('all class routes meet the two-point opening contract',CLASSES.every(c=>distance(c.startNode,`${prefix(c.startNode)}_technique`)===2 && distance(c.startNode,`${prefix(c.startNode)}_practice`)===2));
check('each mastery continues into an existing travel node',nodes.filter(n=>n.id.endsWith('_mastery')).every(n=>PASSIVE_ADJACENCY[n.id].some(id=>!id.startsWith('cross_') && ['small','attr'].includes(PASSIVE_NODES[id].kind))));
console.log(`Crossroads: ${pairCount} opening pairs exercised, ${grants} grants, ${grafts} grafts, ${failures} failures.`);
process.exit(failures?1:0);
