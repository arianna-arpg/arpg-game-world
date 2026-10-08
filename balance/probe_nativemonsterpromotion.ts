import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { Actor, resetActorIdCounter } from '../src/engine/actor';
import { monsterSkillLevelOf } from '../src/engine/world';
import { RARITY_DEFS, rarityMods, type MonsterRarity } from '../src/engine/rarity';
import { MONSTER_NAME_CFG, rollMonsterName } from '../src/data/monsterNames';
import { MAGIC_PACKS, MAGIC_PACK_CFG } from '../src/data/magicPacks';
import { magicPackMinimum, updateMagicPacks, magicPackDeath } from '../src/engine/magicPacks';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { stepMagicPackMechanics, restoreMagicPackRuntime } from '../src/engine/magicPackMechanics';
import { captureNativeActorState, massDormancyPins } from '../src/worldmass/dormancy';
import { mod } from '../src/engine/stats';
import { promoteNativeRarity, promoteNativeRarityStacked, promoteNativeMagicPack, refreshNativeMagicPacks,
 type NativeMonsterPromotionSources } from '../src/engine/nativeMonsterPromotion';

mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
const ORIGINAL={"revision":"8dcfa9e1accb1d9fa90dc9e65416513e354befbe","worldSHA256":"67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc","methodsSHA256":"995bee8345dbf7c1875375c3cb0f2d66e1d6d289966e5647af104cc988cc717e","methods":{"promoteRarity":"private promoteRarity(a: Actor, rarity: MonsterRarity, opts?: { distinctName?: string | boolean }): void {\n    if (a.magicPack && rarity !== 'magic') {\n      a.magicPack = undefined;\n      this.refreshMagicPacks();\n    }\n    const def = RARITY_DEFS[rarity];\n    a.rarity = rarity;\n    a.sheet.setSource('rarity', rarityMods(rarity, !a.magicPack));\n    a.radius *= def.sizeMul;\n    a.xpValue = Math.round(a.xpValue * def.xpMul);\n    if (typeof opts?.distinctName === 'string') {\n      a.name = opts.distinctName;\n    } else if (opts?.distinctName && MONSTER_NAME_CFG.namedRarities.includes(rarity)) {\n      a.name = rollMonsterName(Math.random, a.faction);\n    } else if (def.label) {\n      a.name = `${def.label} ${a.name}`;\n    }\n    a.fillResources(); // re-fill now that max life has grown\n  }","promoteRarityStacked":"private promoteRarityStacked(a: Actor, rarity: MonsterRarity, stacks: number, opts?: { distinctName?: string | boolean }): void {\n    this.promoteRarity(a, rarity, opts);\n    for (let i = 1; i < stacks; i++) a.sheet.setSource('rarityStack' + i, rarityMods(rarity));\n    if (stacks > 1) a.fillResources();\n  }","promoteMagicPack":"promoteMagicPack(members: Actor[], mechanic: string): boolean {\n    const def = MAGIC_PACKS[mechanic];\n    if (!def || members.length < magicPackMinimum(def) || members.length > MAGIC_PACK_CFG.maxMembers) return false;\n    if (new Set(members).size !== members.length || members.some(a => a.dead || a.owner\n      || a.team !== 'enemy' || a.magicPack || (a.rarity && a.rarity !== 'normal')\n      || a.level < def.minLevel || a.faction !== members[0].faction)) return false;\n    const id = this.nextSquadId();\n    members.forEach((a, i) => {\n      a.magicPack = { id, mechanic, slot: i, size: members.length, fallen: 0, ...(i === 0 ? { leader: 1 as const } : {}) };\n      a.squadId = id;\n      a.squadLeader = i === 0;\n      this.promoteRarity(a, 'magic');\n      a.name = `${def.name} ${MONSTERS[a.defId ?? '']?.name ?? a.name}`;\n    });\n    this.refreshMagicPacks();\n    return true;\n  }","refreshMagicPacks":"refreshMagicPacks(dt = 0): void {\n    // A reflected hit can kill a conductor during this fold. Reconcile the\n    // death after the hit loop, without advancing any encounter clock twice.\n    if (this.magicPackResolving) { this.magicPackRefreshPending = true; return; }\n    this.magicPackResolving = true;\n    try {\n      this.magicPackEffects = stepMagicPackMechanics(this.actors, dt, {\n        enemies: a => this.enemiesOf(a),\n        clear: (a, b, tier) => this.lineOfSight(a, b, tier, tier),\n        clip: (a, b, tier) => this.clipShot(a, b, tier),\n        hit: (caster, skill, victim) => {\n          const def = SKILLS[skill];\n          if (def) this.resolveHit(caster, makeSkillInstance(def, monsterSkillLevelOf(caster.level)), victim, 1, 1);\n        },\n      });\n      updateMagicPacks(this.actors);\n    } finally { this.magicPackResolving = false; }\n    if (this.magicPackRefreshPending) { this.magicPackRefreshPending = false; this.refreshMagicPacks(); }\n  }"}};
// Immutable original methods embedded here. Runtime Git and draft files are not oracle inputs.
assert.equal(createHash('sha256').update(JSON.stringify(ORIGINAL.methods)).digest('hex'),ORIGINAL.methodsSHA256);
const js=ts.transpileModule('class OriginalPromotion {\n'+Object.values(ORIGINAL.methods).join('\n')+'\n}',{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const baseline:NativeMonsterPromotionSources={RARITY_DEFS,rarityMods,MONSTER_NAME_CFG,rollMonsterName,
 MAGIC_PACKS,MAGIC_PACK_CFG,magicPackMinimum,MONSTERS,stepMagicPackMechanics,updateMagicPacks,SKILLS,
 makeSkillInstance,monsterSkillLevelOf,get random(){return Math.random;}};
let activeReadTape:unknown[]|undefined;
const functions=new Set(['rarityMods','rollMonsterName','magicPackMinimum','stepMagicPackMechanics','updateMagicPacks','makeSkillInstance','monsterSkillLevelOf']);
// Genuine lexical bindings preserve undefined helper receivers. Math is the
// actual intrinsic, so passing Math.random retains the original callback value.
function original(s:NativeMonsterPromotionSources):any {
 if(activeReadTape){
  const sourceTree=ts.createSourceFile('original.ts','class OriginalPromotion {\n'+Object.values(ORIGINAL.methods).join('\n')+'\n}',ts.ScriptTarget.Latest,true);
  const transformed=ts.transform(sourceTree,[(context)=>{const visit:ts.Visitor=(node)=>{
   if(ts.isPropertyAccessExpression(node)&&node.expression.getText(sourceTree)==='Math'&&node.name.text==='random')return ts.factory.createCallExpression(ts.factory.createIdentifier('read'),undefined,[ts.factory.createStringLiteral('random')]);
   if(ts.isIdentifier(node)&&Object.keys(baseline).includes(node.text))return ts.factory.createCallExpression(ts.factory.createIdentifier('read'),undefined,[ts.factory.createStringLiteral(node.text)]);
   return ts.visitEachChild(node,visit,context);};return node=>ts.visitNode(node,visit) as ts.SourceFile;}]);
  const code=ts.transpileModule(ts.createPrinter().printFile(transformed.transformed[0] as ts.SourceFile),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;transformed.dispose();
  return new Function('read','"use strict";\n'+code+'\nreturn OriginalPromotion.prototype;')((key:string)=>(s as any)[key]);
 }
 const names=Object.keys(s).filter(k=>k!=='random');
 return new Function(...names,'"use strict";\n'+js+'\nreturn OriginalPromotion.prototype;')(...names.map(k=>(s as any)[k]));
}
function normalize(v:any, seen=new Map<object,number>()):any {
 if(v instanceof Actor)return {actor:v.id};
 if(typeof v==='function')return '[function]';
 if(!v||typeof v!=='object')return v;
 if(seen.has(v))return {ref:seen.get(v)};
 seen.set(v,seen.size);
 if(v instanceof Map)return {map:[...v].map(([k,x])=>[normalize(k,seen),normalize(x,seen)])};
 if(v instanceof Set)return {set:[...v].map(x=>normalize(x,seen))};
 if(Array.isArray(v))return v.map(x=>normalize(x,seen));
 return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x,seen)]));
}
// All four exact bodies remain independently pinned after only explicit
// dependency qualifications are reversed; no source recompilation is the oracle.
const coreText=readFileSync(new URL('../src/engine/nativeMonsterPromotion.ts',import.meta.url),'utf8');
const coreTree=ts.createSourceFile('core.ts',coreText,ts.ScriptTarget.Latest,true);
const printer=ts.createPrinter({removeComments:true});
function bodyAst(text:string):string {const tree=ts.createSourceFile('body.ts','function probe()'+text,ts.ScriptTarget.Latest,true);return printer.printNode(ts.EmitHint.Unspecified,(tree.statements[0] as ts.FunctionDeclaration).body!,tree);}
const renamed={promoteRarity:'promoteNativeRarity',promoteRarityStacked:'promoteNativeRarityStacked',promoteMagicPack:'promoteNativeMagicPack',refreshMagicPacks:'refreshNativeMagicPacks'};
for(const [name,newName]of Object.entries(renamed)){
 const oldTree=ts.createSourceFile('old.ts','class W{'+ORIGINAL.methods[name as keyof typeof ORIGINAL.methods]+'}',ts.ScriptTarget.Latest,true);
 const oldBody=((oldTree.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration).body!;
 const current=coreTree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===newName) as ts.FunctionDeclaration;
 const reversed=current.body!.getText(coreTree).replace(/\(0, sources\.(\w+)\)/g,'$1').replace(/sources\.random/g,'Math.random').replace(/sources\.(\w+)/g,'$1').replace(/\bhost\./g,'this.');
 assert.equal(bodyAst(reversed),bodyAst(oldBody.getText(oldTree)),name+' exact original body');
}

bootSimEngine();const unseed=seedGlobalRandom(810119);
const worlds=[makeSimWorld('warrior',991),makeSimWorld('warrior',991)];unseed();
const summary={pairs:0,installed:Object.keys(MAGIC_PACKS),bodyStates:0,draws:0,callbacks:0,readEntries:0,wrapperPairs:0,hits:0,visuals:{} as Record<string,number>,reflectedDeaths:0,checks:[] as string[]};
let sequence=0;
type Rig={w:any;members:Actor[];target:Actor;mark:(name:string)=>void;receiverTape:unknown[];tape:unknown[];draws:number[]};
type Case={name:string;expectedError?:string;readOrder?:boolean;worldWrapper?:boolean;pack?:string;count?:number;level?:number;source?:(s:NativeMonsterPromotionSources,rig:Rig)=>NativeMonsterPromotionSources;run:(rig:Rig)=>unknown};
function lane(f:Case,old:boolean,seed:number):any {
 const w:any=worlds[old?0:1];resetActorIdCounter(62000);const seeded=seedGlobalRandom(seed);
 w.actors=[];w.squadSeq=1700;w.time=123;w.magicPackResolving=false;w.magicPackRefreshPending=false;w.magicPackEffects=[];
 const level=f.level??Math.max(20,MAGIC_PACKS[f.pack??'wardbound']?.minLevel??1);
 const members=Array.from({length:f.count??Math.max(3,magicPackMinimum(MAGIC_PACKS[f.pack??'wardbound']))},(_,i)=>{
  const a=w.createMonster(i%2?'skeleton_archer':'skeleton_warrior',level,'enemy') as Actor;
  const positions=[{x:620,y:570},{x:820,y:570},{x:720,y:735},{x:540,y:690},{x:900,y:690},{x:720,y:480}];
  a.pos={...positions[i%positions.length]};a.fromZoneGen=true;return a;
 });
 const target=w.createMonster('skeleton_warrior',20,'player') as Actor;
 target.pos={x:720,y:620};target.faction='player';target.sheet.setBase('life',1e8);target.fillResources();
 w.actors=[target,...members];seeded();
 const draws:number[]=[],tape:unknown[]=[],receiverTape:unknown[]=[],marks:unknown[]=[];let recording=true;
 const next=mulberry32(seed),random=Math.random;
 Math.random=function(this:any){const n=next();draws.push(n);receiverTape.push(['random',this===Math?'Math':this===undefined?'undefined':'other']);return n;};
 const saved=new Map<string,PropertyDescriptor|undefined>();
 const put=(key:string,value:any)=>{if(!saved.has(key))saved.set(key,Object.getOwnPropertyDescriptor(w,key));Object.defineProperty(w,key,{configurable:true,writable:true,value});};
 const initialEffects=w.magicPackEffects;let producedEffects:any;
 const snap=()=>({effectsAreInitial:w.magicPackEffects===initialEffects,effectsAreProduced:w.magicPackEffects===producedEffects,bodies:w.actors.map((a:Actor)=>{const data=captureNativeActorState(a);assert.ok(data,'full actor data '+a.defId);summary.bodyStates++;return {id:a.id,data};}),
  // Every pairwise runtime alias and support reference is checked beyond bytes.
  shared:w.actors.map((a:Actor)=>w.actors.map((b:Actor)=>!!a.magicPack?.runtime&&a.magicPack.runtime===b.magicPack?.runtime)),
  from:w.actors.map((a:Actor)=>a.magicPackFrom?.id),effects:normalize(w.magicPackEffects),resolving:w.magicPackResolving,pending:w.magicPackRefreshPending,squad:w.squadSeq});
 const rig:Rig={w,members,target,receiverTape,tape,draws,mark(name){const active=recording;recording=false;try{marks.push({name,state:snap()});for(const v of w.magicPackEffects)summary.visuals[v.kind]=(summary.visuals[v.kind]??0)+1;}finally{recording=active;}}};
 const wrapped:any={};for(const key of Object.keys(baseline))Object.defineProperty(wrapped,key,{enumerable:true,get(){const value=(baseline as any)[key];if(!functions.has(key))return value;
  return function(this:any,...args:any[]){if(recording){receiverTape.push([key,this===undefined?'undefined':'other']);tape.push(['source',key,normalize(args)]);}const result=Reflect.apply(value,undefined,args);if(key==='stepMagicPackMechanics')producedEffects=result;return result;};}});
 if(f.worldWrapper){const actual=w.nativeMonsterPromotionSources();for(const key of Object.keys(baseline))assert.equal(actual[key],(baseline as any)[key],key+' actual World provider');}
 let sources=f.source?f.source(wrapped,rig):wrapped;
 const readTape:unknown[]=[];activeReadTape=f.readOrder?readTape:undefined;
 if(f.readOrder){const memo=new WeakMap<object,any>();const data=(value:any,path:string):any=>{
  if(!value||typeof value!=='object')return value;const prior=memo.get(value);if(prior)return prior;
  const p=new Proxy(value,{get(t,k,r){if(typeof k==='string')readTape.push(['data',path,k]);return data(Reflect.get(t,k,r),path+'.'+String(k));}});memo.set(value,p);return p;};
  sources=new Proxy(sources,{get(t,k,r){readTape.push(['source',k]);const value=Reflect.get(t,k,r);return functions.has(String(k))||k==='random'?value:data(value,String(k));}});}
 const orig=old?original(sources):undefined;activeReadTape=undefined;
 for(const key of ['enemiesOf','lineOfSight','clipShot','resolveHit','nextSquadId']){
  const fn=w[key];put(key,function(this:any,...args:any[]){if(recording)tape.push(['host',key,normalize(args)]);if(key==='resolveHit')summary.hits++;
   const result=Reflect.apply(fn,w,args);if(recording)tape.push(['return',key,normalize(result)]);return result;});
 }
 const ops:any={promoteRarity:promoteNativeRarity,promoteRarityStacked:promoteNativeRarityStacked,promoteMagicPack:promoteNativeMagicPack,refreshMagicPacks:refreshNativeMagicPacks};
 if(f.worldWrapper&&!old)put('nativeMonsterPromotionSources',()=>sources);
 for(const key of Object.keys(ops)){const actual=w[key];put(key,function(this:any,...args:any[]){if(recording)tape.push(['operation',key,normalize(args)]);return old?orig[key].apply(w,args):f.worldWrapper?Reflect.apply(actual,w,args):ops[key](w,sources,...args);});}
 try{rig.mark('before');let value:any,error:string|undefined;try{value=f.run(rig);}catch(e){error=String(e);}rig.mark('after');const sentinel=Math.random();
  summary.draws+=draws.length;summary.callbacks+=tape.length;summary.readEntries+=readTape.length;
  return {value:normalize(value),error,marks,tape,receiverTape,readTape,draws,sentinel};
 }finally{Math.random=random;for(const [key,d]of saved)d?Object.defineProperty(w,key,d):delete w[key];}
}
function pair(f:Case):any {const seed=811100+sequence++;const a=lane(f,true,seed),b=lane(f,false,seed);try{assert.deepEqual(b,a,f.name);}catch(e){writeFileSync(new URL('./reports/native-monster-promotion-failure.local.json',import.meta.url),JSON.stringify({name:f.name,a,b},null,2));throw e;}assert.equal(a.error,f.expectedError,f.name+' expected error');summary.pairs++;if(f.worldWrapper)summary.wrapperPairs++;summary.checks.push(f.name);return a;}

for(const rarity of Object.keys(RARITY_DEFS) as MonsterRarity[])for(const distinctName of [undefined,false,true,'remembered native name',''])for(const stacks of [0,1,2,3.5])pair({name:`rarity ${rarity}/${distinctName}/${stacks}`,run({w,members}){w.promoteRarityStacked(members[0],rarity,stacks,{distinctName});}});
for(const [id,def]of Object.entries(MAGIC_PACKS)){
 pair({name:'installed '+id,pack:id,count:Math.max(3,magicPackMinimum(def)),level:def.minLevel,run({w,members,mark}){
  assert.equal(w.promoteMagicPack(members,id),true);mark('fresh dt0');
  if(def.mend)members[1].life=members[1].maxLife()*.1;
  if(def.grave){members[0].dead=true;magicPackDeath(members[0],w.actors);}
  for(const dt of [.25,1,2,1,1,2,3]){w.refreshMagicPacks(dt);mark('live '+dt);}
  const runtime=members.find(a=>!a.dead)?.magicPack?.runtime;
  if(runtime){const restored=restoreMagicPackRuntime(JSON.parse(JSON.stringify(runtime)),def,members.length);assert.ok(restored);for(const a of members)if(a.magicPack)a.magicPack.runtime=restored;}
  w.refreshMagicPacks();mark('native restored dt0');
  const a=members[1];a.tier++;w.refreshMagicPacks();mark('tier');a.tier--;
  a.faction='foreign';w.refreshMagicPacks();mark('faction');a.faction=members[0].faction;
  a.owner=members[0];w.refreshMagicPacks();mark('claimed');a.owner=undefined;
  a.pos={x:1500,y:1100};w.refreshMagicPacks();mark('remote');
  w.actors=w.actors.filter((body:Actor)=>body!==members[0]);w.refreshMagicPacks();mark('removed leader');
  w.promoteRarity(a,'rare',{distinctName:true});mark('leave magic');
 }});
}
for(const mode of ['missing','small','large','duplicate','dead','owner','team','magic','rarity','level','faction']){
 pair({name:'refusal '+mode,pack:'wardbound',count:mode==='large'?MAGIC_PACK_CFG.maxMembers+1:3,run({w,members,draws}){
  let group=members,id='wardbound';switch(mode){case'missing':id='not-installed';break;case'small':group=members.slice(0,1);break;
   case'duplicate':group=[members[0],members[0]];break;case'dead':members[1].dead=true;break;case'owner':members[1].owner=members[0];break;
   case'team':members[1].team='player';break;case'magic':members[1].magicPack={id:99,mechanic:'wardbound',size:3,fallen:0};break;
   case'rarity':members[1].rarity='rare';break;case'level':members[1].level=0;break;case'faction':members[1].faction='other';break;}
  const before=draws.length,squad=w.squadSeq;assert.equal(w.promoteMagicPack(group,id),false);assert.equal(draws.length,before);assert.equal(w.squadSeq,squad);
 }});
}
for(const stage of ['step','update','recursive','pending-entry','hit-throw'])pair({name:'refresh control '+stage,expectedError:stage==='step'?'Error: after partial step':stage==='update'?'Error: after assigned effects':stage==='hit-throw'?'Error: partial hit':undefined,source(s,{w,members}){
 const step=s.stepMagicPackMechanics,update=s.updateMagicPacks;let steps=0;
 return {...s,stepMagicPackMechanics(actors,dt,ctx){steps++;members[0].life-=7;
  if(stage==='step'){w.refreshMagicPacks();throw Error('after partial step');}
  if(stage==='recursive'&&steps===1)w.refreshMagicPacks(7);
  if(stage==='hit-throw')ctx.hit(members[0],'magic_pack_footfall',members[1]);
  return step(actors,dt,ctx);
 },updateMagicPacks(actors){if(stage==='update'){members[1].life-=3;throw Error('after assigned effects');}update(actors);}};
},run({w,members,mark}){
 if(stage==='pending-entry')w.magicPackResolving=true;
 if(stage==='hit-throw')w.resolveHit=()=>{members[2].life-=5;throw Error('partial hit');};
 const old=w.magicPackEffects;w.refreshMagicPacks(.5);mark('control');
 if(stage==='pending-entry'){assert.equal(w.magicPackEffects,old);assert.equal(w.magicPackRefreshPending,true);}
 else if(stage==='recursive'){assert.equal(w.magicPackRefreshPending,false);assert.equal(w.magicPackResolving,false);}
}});

// Lazy source/data access observations use an identifier-only archived read
// view; the larger course above uses the unmodified direct lexical archive.
for(const id of Object.keys(MAGIC_PACKS))pair({name:'source reads '+id,readOrder:true,pack:id,run({w,members,mark}){
 assert.equal(w.promoteMagicPack(members,id),true);w.refreshMagicPacks(.5);mark('reads');w.promoteRarity(members[0],'rare',{distinctName:true});
}});
for(const rare of ['normal','rare','champion','crowned'] as MonsterRarity[])pair({name:'lazy getter options '+rare,readOrder:true,run({w,members,tape}){
 let reads=0;const opts={get distinctName(){tape.push(['distinctName',++reads]);return reads===1?true:reads===2?true:'late';}};w.promoteRarityStacked(members[0],rare,2,opts);
}});

// A missing recipe must not read any later source or consume identity/random.
pair({name:'missing source short-circuits all later getters',readOrder:true,source(s){return new Proxy(s,{get(t,k,r){if(k!=='MAGIC_PACKS')throw Error('unused source '+String(k));return Reflect.get(t,k,r);}});},run({w,members}){assert.equal(w.promoteMagicPack(members,'no-recipe'),false);}});
for(const key of ['RARITY_DEFS','rarityMods','MONSTER_NAME_CFG','rollMonsterName','random','MAGIC_PACKS','magicPackMinimum','MAGIC_PACK_CFG','MONSTERS','stepMagicPackMechanics','updateMagicPacks','SKILLS','makeSkillInstance','monsterSkillLevelOf'])pair({
 name:'exact source throw '+key,readOrder:true,expectedError:'Error: source '+key,source(s,{members}){
  return new Proxy(s,{get(t,k,r){if(k===key)throw Error('source '+key);
   if(k==='stepMagicPackMechanics'&&['SKILLS','makeSkillInstance','monsterSkillLevelOf'].includes(key))return (_actors:readonly Actor[],_dt:number,ctx:any)=>{ctx.hit(members[0],'magic_pack_footfall',members[1]);return [];};
   return Reflect.get(t,k,r);}});
 },run({w,members}){
 if(['RARITY_DEFS','rarityMods','MONSTER_NAME_CFG','rollMonsterName','random'].includes(key))w.promoteRarity(members[0],'rare',{distinctName:true});
 else if(['MAGIC_PACKS','magicPackMinimum','MAGIC_PACK_CFG','MONSTERS'].includes(key))w.promoteMagicPack(members,'wardbound');
 else w.refreshMagicPacks(.5);
 }});
for(const id of Object.keys(MAGIC_PACKS))pair({name:'actual World wrappers '+id,pack:id,worldWrapper:true,readOrder:true,run({w,members,mark}){
 assert.equal(w.promoteMagicPack(members,id),true);mark('actual wrapper dt0');w.refreshMagicPacks(.6);mark('actual wrapper dt');
 w.promoteRarityStacked(members[0],'champion',3,{distinctName:true});mark('actual wrapper stacked');
}});
pair({name:'warm exact LOS loss at dt0',pack:'arclink',run({w,members,mark}){
 assert.equal(w.promoteMagicPack(members,'arclink'),true);w.refreshMagicPacks(MAGIC_PACKS.arclink.beam!.initialDelay);mark('warning');
 assert.ok(members[0].magicPack?.runtime?.beam);w.lineOfSight=()=>false;w.refreshMagicPacks();assert.equal(members[0].magicPack?.runtime?.beam,undefined);mark('LOS cancellation');
}});

// Real native combat retaliation, not a hand-fired refresh callback.
const reflected=pair({name:'native thorn reflection recursively reconciles death',pack:'footfall',run({w,members,target,mark,tape}){
 target.sheet.setSource('probe reflection',[mod('thornsReflect','flat',1e9)]);
 assert.equal(w.promoteMagicPack(members,'footfall'),true);mark('promoted');
 w.refreshMagicPacks(MAGIC_PACKS.footfall.burst!.initialDelay);mark('warning');
 w.refreshMagicPacks(MAGIC_PACKS.footfall.burst!.warning+.01);mark('reflection');
 const dead=members.filter(a=>a.dead).length;assert.ok(dead>0,'actual hit reflects lethal wound');
 assert.equal(w.magicPackResolving,false);assert.equal(w.magicPackRefreshPending,false);
 assert.ok(tape.filter((x:any)=>x[0]==='operation'&&x[1]==='refreshMagicPacks').length>=4,'actual kill queued then replayed refresh');
 return dead;
}});summary.reflectedDeaths=reflected.value;

// Cached adapters retain live pointers without becoming controller leases.
{
 const restore=seedGlobalRandom(819911);const w:any=makeSimWorld('warrior',819911),a=w.createMonster('zombie',10,'enemy');restore();
 w.actors=[w.player,a];const owned=new Map([['cache-witness',a]]);
 assert.equal(massDormancyPins(w,owned).has(a),false,'fresh actual body has no controller pin');
 const view=w.nativeMonsterPromotionHost(),source=w.nativeMonsterPromotionSources();
 assert.equal(w.nativeMonsterPromotionHost(),view);assert.equal(w.nativeMonsterPromotionSources(),source);
 assert.equal(Object.getOwnPropertyDescriptor(w,'nativeMonsterPromotionView')?.enumerable,false);
 assert.equal(Object.getOwnPropertyDescriptor(w,'nativeMonsterPromotionSourceView')?.enumerable,false);
 assert.equal(view.actors,w.actors);const next=[a,w.player];w.actors=next;assert.equal(view.actors,next,'cached getter stays live');
 assert.equal(massDormancyPins(w,owned).has(a),false,'cached views do not pin root census');
 w.player.aiTargetId=a.id;assert.equal(massDormancyPins(w,owned).has(a),true,'real foreign dependency still pins');
 w.player.aiTargetId=-1;
 summary.checks.push('non-enumerable cached views preserve real dormancy pins');
}

writeFileSync(new URL('./reports/native-monster-promotion-results.local.json',import.meta.url),JSON.stringify(summary,null,2));
console.log('PASS native monster promotion',JSON.stringify({...summary,checks:summary.checks.length}));
