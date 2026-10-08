import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { dist, rand, vec, type Vec2 } from '../src/core/math';
import { Actor, resetActorIdCounter } from '../src/engine/actor';
import { World } from '../src/engine/world';
import { nextItemUid } from '../src/engine/itemgen';
import { GridWalkField } from '../src/world/gridWalk';
import { makeTierView } from '../src/engine/tiers';
import { MONSTERS } from '../src/data/monsters';
import { ENCOUNTER_GROUPS, ENCOUNTER_GROUP_CFG } from '../src/data/encounterGroups';
import { encounterGroupContext, planEncounterGroup, applyEncounterGroup,
  type EncounterGroupDef, type EncounterGroupSpawnOptions } from '../src/engine/encounterGroups';
import { spawnNativeEncounterGroup, type NativeEncounterGroupHost } from '../src/engine/nativeEncounterGroup';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import type { ZoneDef } from '../src/data/zones';
import type { WalkField } from '../src/world/walk';

// Verbatim native method pinned before extraction. The oracle has no runtime
// Git or ignored-file dependency. Dependencies below are their actual owners.
const ORIGINAL = {"commit":"3b14dba34a81024ef384b8ea6ef031d19c4d9b51","worldLfHash":"d3ce08a5838c441726a002ddeac8d496f87635933117cead033bf0f2b9c3b4f2","methodHash":"f157901cadc1ac98d49ce5399e57350734f290fc8c21c6f9bc033907d43b7a2c","method":"spawnEncounterGroup(recipe: string, level: number, at: Vec2, opts: EncounterGroupSpawnOptions = {}): Actor[] {\n    const group = ENCOUNTER_GROUPS[recipe], tier = opts.tier ?? 0;\n    if (group?.id !== recipe || !Number.isFinite(at.x) || !Number.isFinite(at.y) || !Number.isInteger(tier) || tier < 0\n      || (opts.facing !== undefined && !Number.isFinite(opts.facing))) return [];\n    const plan = planEncounterGroup(recipe, encounterGroupContext(this.zone, group.faction, tier, level), opts.maxMembers);\n    if (!plan.length) return [];\n    const facing = opts.facing ?? Math.atan2(this.player.pos.y-at.y,this.player.pos.x-at.x);\n    const c = Math.cos(facing), s = Math.sin(facing), radius = group.radius ?? ENCOUNTER_GROUP_CFG.radius;\n    const field = this.pathField(tier);\n    if (tier > 0 && !this.tierViews?.[tier]) return [];\n    const members: Actor[] = [];\n    for (const seat of plan) {\n      const a = this.createMonster(seat.monster,level,'enemy'); a.tier=tier;\n      let placed=false;\n      for (let attempt=0;attempt<ENCOUNTER_GROUP_CFG.placementAttempts;attempt++) {\n        const jitter=attempt*ENCOUNTER_GROUP_CFG.placementJitter;\n        a.pos=this.findFreeSpot(vec(at.x+c*seat.offset.x-s*seat.offset.y+rand(-jitter,jitter),\n          at.y+s*seat.offset.x+c*seat.offset.y+rand(-jitter,jitter)),a.radius,tier);\n        if (a.habitat && !this.placeInHabitat(a)) continue;\n        if (dist(a.pos,at)>radius || this.pointInSolid(a.pos.x,a.pos.y,a.radius,tier)) continue;\n        if (field && (!field.isWalkable(a.pos.x,a.pos.y) || (field.reachable && !field.reachable(at,a.pos)))) continue;\n        if (members.some(b=>dist(a.pos,b.pos)<a.radius+b.radius+ENCOUNTER_GROUP_CFG.bodyClearance)) continue;\n        placed=true; break;\n      }\n      if (!placed) return []; // no orphan healer, keeper, or missing frontline\n      a.facing=facing;\n      if (opts.persistent !== undefined) a.fromZoneGen=opts.persistent;\n      members.push(a);\n    }\n    const id=this.nextSquadId();\n    members.forEach((a,i)=>{\n      applyEncounterGroup(a,{id,recipe,slot:plan[i].member.slot});\n      if (a.squadLeader) a.name=`${group.name} — ${a.name}`;\n      a.fillResources(); this.actors.push(a);\n    });\n    return members;\n  }"};
assert.equal(createHash('sha256').update(ORIGINAL.method).digest('hex'), ORIGINAL.methodHash);
let tape: unknown[] | null = null;
let itemUidBase=0;
const states = (actors: Actor[]) => actors.map(a => {
  const state = captureNativeActorState(a);
  assert.ok(state, `unsupported native birth graph: ${a.defId}`);
  // Item IDs use a process-wide monotonic allocator without a reset API.
  // Preserve every ID as its exact offset from the run's starting allocation,
  // and compare the total allocations too; no item field is omitted.
  for(const node of state.nodes)for(const entry of node.entries)if(entry[0]==='uid'&&typeof entry[1]==='number')entry[1]-=itemUidBase;
  return state;
});
function norm(v: unknown): unknown {
  if (v instanceof Actor) return { id: v.id, state: states([v])[0] };
  if (typeof v === 'function') return { function: v.name };
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,norm(x)]));
  return v;
}
function call<T>(name: string, args: unknown[], fn: () => T): T {
  tape?.push(['call',name,norm(args)]);
  try { const result=fn(); tape?.push(['return',name,norm(result)]); return result; }
  catch(e) { tape?.push(['throw',name,String(e)]); throw e; }
}
const pure = {
  encounterGroupContext: (...args: Parameters<typeof encounterGroupContext>) => call('context',args,()=>encounterGroupContext(...args)),
  planEncounterGroup: (...args: Parameters<typeof planEncounterGroup>) => call('plan',args,()=>planEncounterGroup(...args)),
  applyEncounterGroup: (...args: Parameters<typeof applyEncounterGroup>) => call('apply',args,()=>applyEncounterGroup(...args)),
  rand: (lo:number,hi:number) => call('rand',[lo,hi],()=>rand(lo,hi)),
};
const readGroup = (id:string) => { const result=ENCOUNTER_GROUPS[id];tape?.push(['group',id,norm(result)]);return result; };
const config = (c:NativeEncounterGroupHost['config']) => new Proxy(c,{get(target,key,receiver){const result=Reflect.get(target,key,receiver);tape?.push(['config',key,result]);return result;}});
const deps={ENCOUNTER_GROUPS:new Proxy(ENCOUNTER_GROUPS,{get:(_target,key)=>readGroup(String(key))}),
  ENCOUNTER_GROUP_CFG:config(ENCOUNTER_GROUP_CFG),...pure,dist,vec};
const js=ts.transpileModule(`class ArchivedEncounterGroup { ${ORIGINAL.method} }`,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
}).outputText;
const archived=new Function(...Object.keys(deps),`${js}\nreturn ArchivedEncounterGroup.prototype.spawnEncounterGroup;`)(...Object.values(deps)) as World['spawnEncounterGroup'];
bootSimEngine();
const restoreBoot=seedGlobalRandom(137611);
const worlds=[makeSimWorld('warrior',991),makeSimWorld('warrior',991)];restoreBoot();
const zoneBase=worlds[0].zone;
let pairs=0,attempts=0,admitted=0,draws=0,successfulRecipes=0;
type Result={tape:unknown[];draws:number[];attempts:unknown[];actors:unknown[];returned:number[];outcome:string;next:number;squadSeq:number;itemAllocations:number};
type Fixture={name:string;recipe:string;level:number;zone?:Partial<ZoneDef>;at?:Vec2;opts?:EncounterGroupSpawnOptions;
  setup?:(w:any)=>void;expect?:(r:Result)=>void;core?:boolean};
function run(f:Fixture,seed:number,old:boolean):Result {
  const w:any=worlds[old?0:1],saved=new Map<string,unknown>();
  for(const key of ['pathField','createMonster','findFreeSpot','placeInHabitat','pointInSolid','nextSquadId','nativeEncounterGroupHost'])saved.set(key,w[key]);
  w.zone={...zoneBase,id:'qa_group_'+f.recipe,level:f.level,biome:'grove',tileset:'meadow',caveDepth:undefined,tiers:undefined,...f.zone};
  w.arena={w:2400,h:1800,shape:'rect'};w.walk=new GridWalkField(2400,1800,30);w.walk.fillRegion(0,0,2400,1800,'ground');
  w.tierViews=null;w.doodads=[];w.actors=[w.player];w.squadSeq=1200;w.player.pos=vec(180,180);w.player.level=f.level;
  w.time=25;w.zoneGenTagging=false;
  f.setup?.(w);w.markDoodadsChanged();
  const calls:unknown[]=[],randoms:number[]=[],created:Actor[]=[];
  const traceField=(field:WalkField|null):WalkField|null=>field&&new Proxy(field,{get(target,key,receiver){
    const value=Reflect.get(target,key,receiver);
    if((key==='isWalkable'||key==='reachable')&&typeof value==='function')return (...args:unknown[])=>call('field.'+String(key),args,()=>value.apply(target,args));
    return value;
  }});
  for(const name of ['createMonster','findFreeSpot','placeInHabitat','pointInSolid','nextSquadId']){
    const fn=w[name];w[name]=(...args:unknown[])=>call(name,args,()=>{const result=fn.apply(w,args);if(name==='createMonster')created.push(result);return result;});
  }
  const path=w.pathField;w.pathField=(tier:number)=>{calls.push(['call','pathField',[tier]]);const field=path.call(w,tier);calls.push(['return','pathField',field?{cellSize:field.cellSize,hasReachable:typeof field.reachable==='function'}:null]);return traceField(field);};
  const buildHost=w.nativeEncounterGroupHost.bind(w);
  w.nativeEncounterGroupHost=()=>{const host=buildHost() as NativeEncounterGroupHost;
    Object.defineProperties(host,Object.getOwnPropertyDescriptors({group:readGroup,config:config(host.config),...pure}));return host;};
  const properties=new Map<string,PropertyDescriptor|undefined>();
  for(const key of ['zone','player','tierViews','actors']){const descriptor=Object.getOwnPropertyDescriptor(w,key),value=w[key];properties.set(key,descriptor);
    Object.defineProperty(w,key,{configurable:true,get(){tape?.push(['read',key]);return value;}});}
  const random=Math.random,next=mulberry32(seed);Math.random=()=>{const n=next();randoms.push(n);return n;};resetActorIdCounter(50000);itemUidBase=nextItemUid()+1;tape=calls;
  let returned:Actor[]=[],outcome='returned';
  try {
    if(old)returned=archived.call(w,f.recipe,f.level,f.at??vec(1200,900),f.opts);
    else if(f.core)returned=spawnNativeEncounterGroup(w.nativeEncounterGroupHost(),f.recipe,f.level,f.at??vec(1200,900),f.opts);
    else returned=w.spawnEncounterGroup(f.recipe,f.level,f.at??vec(1200,900),f.opts);
  }catch(e){outcome=String(e);}
  try{return {tape:calls,draws:randoms,attempts:states(created),actors:states(w.actors.filter((a:Actor)=>a!==w.player)),
    returned:returned.map(a=>a.id),outcome,next:Math.random(),squadSeq:w.squadSeq,itemAllocations:nextItemUid()-itemUidBase};}
  finally{Math.random=random;tape=null;for(const[k,d]of properties){if(d)Object.defineProperty(w,k,d);else delete w[k];}for(const[k,v]of saved)w[k]=v;}
}
function firstDifference(a:unknown,b:unknown,path='root'):string {
  if(Object.is(a,b))return '';
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    const ak=Object.keys(a),bk=Object.keys(b);if(JSON.stringify(ak)!==JSON.stringify(bk))return path+' own keys differ';
    for(const k of ak){const d=firstDifference((a as Record<string,unknown>)[k],(b as Record<string,unknown>)[k],path+'.'+k);if(d)return d;}
    return '';
  }
  return path+': '+JSON.stringify(a)+' != '+JSON.stringify(b);
}
function pair(f:Fixture,seed=491027):Result {
  const a=run(f,seed,true),b=run(f,seed,false);
  try{assert.deepEqual(b,a);}catch{assert.fail(`${f.name} seed ${seed}: ${firstDifference(a,b)}`);}
  f.expect?.(b);
  pairs++;attempts+=b.attempts.length;admitted+=b.actors.length;draws+=b.draws.length;return b;
}
function eligible(g:EncounterGroupDef):Omit<Fixture,'name'|'recipe'> {
  const tier=g.habitats?.stories?.[0]??0;
  const zone:Partial<ZoneDef>={biome:g.habitats?.biomes?.[0]??'grove',tileset:g.habitats?.tilesets?.[0]??'meadow',
    caveDepth:g.habitats?.place==='cave'?1:undefined,...(tier>0?{tiers:{kind:'over',exposure:'open',levels:tier}}:{})};
  for(let level=g.minLevel;level<=Math.max(100,g.minLevel);level++){
    const ctx=encounterGroupContext({...zoneBase,...zone,level},g.faction,tier,level);
    if(planEncounterGroup(g.id,ctx,undefined,mulberry32(991)).length)return {level,zone,opts:{tier},
      ...(tier>0?{setup:(w:any)=>{w.walk.fillRegion(0,0,2400,1800,'butte_top');w.tierViews=[undefined,makeTierView(w.walk,1)];}}:{})};
  }
  throw Error('No eligible native context for '+g.id);
}
const recipes=Object.values(ENCOUNTER_GROUPS);
assert.ok(recipes.length>=49,'shipped recipe census must remain complete');
for(const g of recipes){
  const f=eligible(g);let landed=0;
  for(const seed of [1,991,0xffffffff]){const r=pair({name:'shipped '+g.id,recipe:g.id,...f},seed);landed+=r.actors.length;}
  if(landed)successfulRecipes++;
  console.log(`PASS shipped ${g.id}: eligible level ${f.level}, ${landed} bodies across three seeds`);
}
const g=recipes.find(r=>!r.habitats?.stories&&!r.habitats?.place)!;assert.ok(g);
const base={recipe:g.id,...eligible(g)};
const empty=(r:Result)=>{assert.equal(r.actors.length,0);assert.equal(r.returned.length,0);};
for(const [name,change]of [
  ['missing recipe',{recipe:'missing_native_group'}],['prototype recipe',{recipe:'__proto__'}],
  ['nonfinite point',{at:vec(NaN,900)}],['nonfinite facing',{opts:{facing:Infinity}}],
  ['negative story',{opts:{tier:-1}}],['fractional story',{opts:{tier:.5}}],
  ['closed composition cap',{opts:{maxMembers:0}}],['nonfinite level',{level:NaN}],
]as const)pair({name,...base,...change,expect:r=>{empty(r);assert.equal(r.attempts.length,0);assert.equal(r.draws.length,1);}});
pair({name:'explicit direct core facing and persistence',...base,core:true,opts:{facing:1.25,persistent:true},expect:r=>assert.ok(r.actors.length>0)});
pair({name:'explicit false persistence',...base,opts:{persistent:false},expect:r=>assert.ok(r.actors.length>0)});
pair({name:'missing story consumes native plan then refuses',...base,opts:{tier:1},expect:r=>{empty(r);assert.equal(r.attempts.length,0);assert.ok(r.draws.length>1);}});
pair({name:'real upper-floor native seating',...base,zone:{...base.zone,tiers:{kind:'over',exposure:'open',levels:1}},opts:{tier:1},setup:w=>{
  w.walk.fillRegion(0,0,2400,1800,'butte_top');w.tierViews=[undefined,makeTierView(w.walk,1)];},expect:r=>assert.ok(r.actors.length>0)});
pair({name:'solid seating fails whole group',...base,setup:w=>{w.pointInSolid=()=>({kind:'rock',pos:vec(1200,900),radius:300,seed:1});},expect:r=>{empty(r);assert.equal(r.attempts.length,1);}});
pair({name:'out-of-radius seating refuses before solid',...base,setup:w=>{w.findFreeSpot=()=>vec(2200,1700);},expect:empty});
pair({name:'member overlap refuses without partial publication',...base,setup:w=>{w.findFreeSpot=()=>vec(1200,900);},expect:r=>{empty(r);assert.equal(r.attempts.length,2);}});
for(const [name,walkable,reachable]of [['unwalkable',false,true],['unreachable',true,false]]as const)pair({name,...base,setup:w=>{w.pathField=()=>({isWalkable:()=>walkable,reachable:()=>reachable});},expect:empty});
pair({name:'no navigation field preserves native seating',...base,setup:w=>{w.pathField=()=>null;},expect:r=>assert.ok(r.actors.length>0)});
pair({name:'factory throw never publishes seated prefix',...base,setup:w=>{const make=w.createMonster.bind(w);let n=0;w.createMonster=(...args:unknown[])=>{if(++n===2)throw Error('native fixture factory fault');return make(...args);};},expect:r=>{empty(r);assert.equal(r.attempts.length,1);assert.match(r.outcome,/native fixture factory fault/);}});
// A focused authored control uses the actual water-bound native species; it
// does not alter the shipped recipe census or claim natural distribution.
const water=MONSTERS.lake_horror;assert.ok(water.habitat);
const wetRecipe:EncounterGroupDef={id:'qa_native_habitat_group',name:'Native water control',description:'fixture',faction:water.faction!,minLevel:10,weight:1,
  radius:700,members:[{slot:'lead',role:'front',monster:water.id,leader:true,at:{forward:0,side:-100}},{slot:'mate',role:'front',monster:water.id,at:{forward:0,side:100}}]};
ENCOUNTER_GROUPS[wetRecipe.id]=wetRecipe;
try{
  pair({name:'native group habitat refusal',recipe:wetRecipe.id,level:20,expect:r=>{empty(r);assert.equal(r.attempts.length,1);}});
  pair({name:'native group habitat full native doodad source',recipe:wetRecipe.id,level:20,setup:w=>{w.doodads=[
    {kind:'water',pos:vec(1200,900),radius:55,seed:1},{kind:'water',pos:vec(800,500),radius:300,seed:2,gone:true},
    {kind:'mud',pos:vec(1300,1000),radius:300,seed:3},{kind:'water',pos:vec(1200,900),radius:280,seed:4,shallow:true,tier:1}];},expect:r=>assert.equal(r.actors.length,2)});
}finally{delete ENCOUNTER_GROUPS[wetRecipe.id];}
// Independent local hosts own geometry/player/zone/RNG. Only the factory's
// documented transitive RNG scope may borrow Math.random; any ambient core
// read throws. These identity-placement callbacks are isolation controls,
// not a claim that native geometry has been admitted into a physical area.
function isolated(index:number,seed:number){
  const recipe=recipes[index],f=eligible(recipe),rng=mulberry32(seed),bodies:Actor[]=[],reads:string[]=[];
  const zone={...zoneBase,...f.zone,level:f.level,id:'local/'+index};const at=vec(1200+index*4000,900);
  let squad=400;const w:any=worlds[0],random=Math.random;
  const withFactoryRng=<T>(fn:()=>T):T=>{const previous=Math.random;Math.random=rng;try{return fn();}finally{Math.random=previous;}};
  const host:NativeEncounterGroupHost={zone,player:{pos:vec(at.x+300,at.y-400)},tierViews:null,actors:bodies,config:ENCOUNTER_GROUP_CFG,
    group:id=>{reads.push('group:'+id);return ENCOUNTER_GROUPS[id];},encounterGroupContext,
    planEncounterGroup:(id,context,cap)=>{assert.equal(context.biome,zone.biome);return planEncounterGroup(id,context,cap,rng);},
    applyEncounterGroup,rand:(lo,hi)=>lo+rng()*(hi-lo),pathField:()=>null,
    createMonster:(id,level,team)=>withFactoryRng(()=>w.createMonster(id,level,team)),
    findFreeSpot:p=>{reads.push('seat');return {...p};},placeInHabitat:()=>{throw Error('unrequested fixture habitat');},
    pointInSolid:()=>null,nextSquadId:()=>squad++};
  resetActorIdCounter(70000);itemUidBase=nextItemUid()+1;
  Math.random=()=>{throw Error('ambient core random leaked outside explicit callback');};
  try{const result=spawnNativeEncounterGroup(host,recipe.id,f.level,at,{persistent:true});assert.ok(result.length>0);
    return {states:states(result),reads,items:nextItemUid()-itemUidBase,next:rng(),squad};}
  finally{Math.random=random;}
}
const localA=isolated(0,713);isolated(1,991);assert.deepEqual(isolated(0,713),localA);
console.log('PASS independent local encounter hosts A/B/A with ambient random reads forbidden');
assert.ok(successfulRecipes===recipes.length,`every eligible shipped recipe needs admitted evidence: ${successfulRecipes}/${recipes.length}`);
console.log(`PASS native encounter groups: ${pairs} archived-native pairs; ${recipes.length} shipped recipes; ${attempts} actual factory attempts; ${admitted} admitted bodies; ${draws} draws/sentinels. Baseline ${ORIGINAL.commit}; method ${ORIGINAL.methodHash}`);
