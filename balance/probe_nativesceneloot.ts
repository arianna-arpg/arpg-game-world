/** Exact native loot parity. Compact geometry/policy recorders are test boundaries;
 * physical contents, item allocation and settlement gem factories are native. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {nativeSceneLootArchive as archive,nativeSceneLootArchiveHash} from './nativeSceneLootArchive';
import {beforeNativeSceneLoot} from './nativeSceneLootFixture';
import * as core from '../src/engine/nativeSceneLoot';
import {World} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {Rng} from '../src/core/rng';
import {chance,dist,rand,vec} from '../src/core/math';
import {ESSENCE_SPILL_CFG,abilityEssenceOfTier,ESSENCE_IDS} from '../src/data/essences';
import {VESTIGES} from '../src/data/vestiges';
import {CONTAINER_DEFS} from '../src/data/containers';
import {containerAccepts} from '../src/engine/containers';
import {ITEM_RARITIES} from '../src/engine/items';
import {ITEM_BASES} from '../src/data/itembases';
import {GEM_DROP_CFG,gemFloorFor} from '../src/engine/loot';
import {MEMORY_CFG,MEMORY_KINDS,makeMemoryItem,memoryFormOf,memoryKindForSeed,seedLaneFrac} from '../src/engine/memories';
import {SKILLS} from '../src/data/skills';
import {SUPPORTS} from '../src/data/supports';
import {makeSkillGem,rollSkillRarity,SKILL_RARITIES} from '../src/engine/skills';
import {mintSupportInstance} from '../src/engine/supportbase';
import {awakenMemoryFromDrop} from '../src/meta/memoryUnlocks';
import {gemDropKey,LEDGER_GEMDROP_TOTAL,LEDGER_LEGENDARY_SKILL_DROP} from '../src/meta/account';
import {VENDOR_CFG} from '../src/data/vendors';
import {COOP_SCALING} from '../src/data/coop';
import {ORB_DEFS,ORB_CAP,orbAmount} from '../src/data/orbs';
import {SIM_TAP} from '../src/engine/tap';
import {nextItemUid,rollItem} from '../src/engine/itemgen';
import {NativeAreaSceneSettlement} from '../src/worldmass/nativeAreaSceneSettlement';
import {NativeAreaScenePhysical,freshScenePhysicalState} from '../src/worldmass/nativeAreaScenePhysical';
import {NativeAreaSceneLoot} from '../src/worldmass/nativeAreaSceneLoot';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const read=(path:string)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const parse=(value:string)=>ts.createSourceFile('proof.ts',value,ts.ScriptTarget.ES2022,true);
const emit=(value:string)=>ts.transpileModule(value,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const cl=(text:string)=>{const sf=parse(text),node=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;assert.ok(node);return {sf,node};};
const members=(text:string)=>{const {sf,node}=cl(text);return node.members.map(m=>m.getText(sf).replaceAll('\r\n','\n'));};
assert.equal(hash(JSON.stringify(archive)),nativeSceneLootArchiveHash,'immutable original archive');
assert.equal(hash(JSON.stringify(members(beforeNativeSceneLoot(read('src/engine/world.ts'))))),archive.worldHash,'all other World members remain exact');
if(process.argv.includes('--provenance')){
 const before=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:8*1024*1024}),{sf,node}=cl(before);
 assert.equal(hash(JSON.stringify(members(before))),archive.worldHash);
 assert.ok(before.includes(archive.grace),'original grace declaration');
 for(const row of archive.leaves)assert.equal(node.members.find(m=>m.name?.getText(sf)===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.text,'git original context '+row.name);
 for(const row of archive.rows)assert.equal(node.members.find(m=>m.name?.getText(sf)===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.before,'git original '+row.name);
}
const source=parse(read('src/engine/nativeSceneLoot.ts'));
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
for(const row of archive.rows){
 const old=parse('class Archive{'+row.before+'}'),before=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const after=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
 assert.ok(after?.body,row.name);
 assert.equal(emit('function proof(){'+after.body.statements.map(s=>s.getText(source)).join('\n')+'}'),emit('function proof(){'+before.body!.statements.map(s=>s.getText(old)).join('\n').replace(/\bthis\b/g,'host')+'}'),'exact executable body '+row.name);
}
// The private constant is pinned separately against the original source; it is
// not an invented tweak to the archived method's binding environment.
const DROP_PICKUP_GRACE=.8;
assert.equal(archive.grace,'const DROP_PICKUP_GRACE = 0.8;');
assert.ok(read('src/engine/nativeSceneLoot.ts').includes('export '+archive.grace));
const bindings={chance,dist,rand,vec,ESSENCE_SPILL_CFG,abilityEssenceOfTier,VESTIGES,CONTAINER_DEFS,containerAccepts,ITEM_RARITIES,GEM_DROP_CFG,gemFloorFor,MEMORY_CFG,MEMORY_KINDS,makeMemoryItem,memoryFormOf,memoryKindForSeed,seedLaneFrac,SKILLS,SUPPORTS,makeSkillGem,rollSkillRarity,SKILL_RARITIES,mintSupportInstance,Rng,awakenMemoryFromDrop,gemDropKey,LEDGER_GEMDROP_TOTAL,LEDGER_LEGENDARY_SKILL_DROP,VENDOR_CFG,COOP_SCALING,DROP_PICKUP_GRACE,ORB_DEFS,ORB_CAP,orbAmount,SIM_TAP};
const original=new Function(...Object.keys(bindings),emit('class Archive{'+archive.rows.map(r=>r.before).join('\n')+'}\nreturn Archive.prototype;'))(...Object.values(bindings)) as Record<string,Function>;
const factory=makeSimWorld('warrior',713);
type Lane='original'|'world'|'core'|'owner';
const methods=archive.rows.map(r=>r.name);
let itemUidBase=0;
function graph(value:any,seen=new Map<object,number>()):any{
 if(value instanceof Actor)return {actor:value.id};
 if(value===null||typeof value!=='object')return typeof value==='function'?'[function]':value;
 if(seen.has(value))return {ref:seen.get(value)};
 const id=seen.size;seen.set(value,id);
 if(value instanceof Map)return {id,map:[...value].map(([k,v])=>[graph(k,seen),graph(v,seen)])};
 if(value instanceof Set)return {id,set:[...value].map(v=>graph(v,seen))};
 return {id,type:value.constructor.name,values:Object.fromEntries(Object.keys(value).map(k=>[k,k==='uid'&&typeof value[k]==='number'?value[k]-itemUidBase:graph(value[k],seen)]))};
}
function fixture(lane:Lane,failAt=''){
 resetActorIdCounter(960000);itemUidBase=nextItemUid();
 const w:any=Object.create(World.prototype),tape:any[]=[],warnings:any[]=[];
 let active=false,progression=true;
 const actor=(name:string,x=100)=>new Actor(name,'player',vec(x,200));
 const hero=actor('hero'),ally=actor('ally',140),far=actor('far',100000),dead=actor('dead'),keeper=actor('keeper'),merc=actor('merc'),outsider=actor('outsider');
 dead.dead=true;ally.tier=2;
 const seat=(id:string,a:Actor)=>({id,actor:a,meta:structuredClone(factory.localSeat.meta)});
 const seats:any[]=[seat('hero',hero),seat('ally',ally),seat('far',far),seat('dead',dead),{...seat('keeper',keeper),keeper:true},{...seat('merc',merc),merc:true},seat('outsider',outsider)];
 const scene:any={zone:{...factory.zone,id:'native-loot-proof',level:31,tileset:'sulphur_pools',spoils:undefined},player:hero,actors:seats.map(s=>s.actor)};
 const state:any={spoilStory:1,orbs:[]};
 const campaign:any={account:structuredClone(factory.account),accountDirty:false,seats,time:71,dropRuleOf:null,questSeat:null,
  manifest:factory.manifest,vendorHolds:{},mercSheets:{},charDirty:false,sim:factory.sim,clientActionHook:undefined};
 function effect(name:string,args:any[]){tape.push([name,graph(args)]);if(active&&name===failAt)throw Error('injected '+name);}
 const geometry:any={state:scene,arena:{shape:'rect',w:5000,h:5000},flashes:[],doodads:[],
  clampPos(this:any,...args:any[]){assert.equal(this,geometry);effect('clampPos',args);return vec(args[0].x+3,args[0].y-2);},
  markDoodadsChanged(){throw Error('unexpected doodad mutation');}};
 const population:any={input:{scene,geometry},createMonster(){throw Error('unexpected creature mint');}};
 const settlement=new NativeAreaSceneSettlement({scene,geometry,campaign,state:{townTierIdx:0,mercOutpost:null}});
 const physical=new NativeAreaScenePhysical({scene,geometry,population,settlement,campaign,state:freshScenePhysicalState()});
 Object.assign(campaign,{
  metaProgressionActive(this:any){assert.equal(this,campaign);effect('metaProgressionActive',[]);return progression;},
  questHand(this:any){assert.equal(this,campaign);effect('questHand',[]);return this.questSeat??this.seats[0];},
  sameParty(this:any,a:any,b:any){assert.equal(this,campaign);effect('sameParty',[a.id,b.id]);return b.id!=='outsider';},
  seatHero(this:any,s:any){assert.equal(this,campaign);effect('seatHero',[s.id]);return s.actor;},
 });
 for(const [provider,keys] of [[scene,['zone']],[state,['spoilStory','orbs']],[geometry,['flashes']],[campaign,['account','accountDirty','seats','time','questSeat']]] as const)
  for(const key of keys)Object.defineProperty(w,key,{configurable:true,get(){return (provider as any)[key];},set(v){(provider as any)[key]=v;}});
 Object.defineProperty(w,'dropRuleOf',{configurable:true,get(){const fn=campaign.dropRuleOf;return fn?(...args:any[])=>fn.apply(campaign,args):fn;},set(v){campaign.dropRuleOf=v;}});
 Object.defineProperty(w,'drops',{configurable:true,get(){return physical.input.state.drops;},set(v){physical.input.state.drops=v;}});
 function live(receiver:any,names:string[]){for(const name of names)Object.defineProperty(w,name,{configurable:true,get(){const fn=receiver[name];return (...args:any[])=>fn.apply(receiver,args);}});}
 live(geometry,['clampPos']);live(campaign,['metaProgressionActive','questHand','sameParty','seatHero']);live(settlement,['rollSkillGem','rollSupportDropGated']);
 w.spoilsSealed=()=>scene.zone.spoils==='none';w.zoneGemFloor=()=>gemFloorFor(scene.zone.tileset);
 let controller:any;
 if(lane==='owner')controller=new NativeAreaSceneLoot({scene,geometry,physical,settlement,campaign,state} as any);
 else {
  controller=w;
  if(lane==='original')for(const name of methods)w[name]=original[name];
  if(lane==='core')for(const name of methods)w[name]=function(...args:any[]){return (core as any)['scene'+cap(name)](w,...args);};
 }
 const host=lane==='owner'?controller.host:w;
 active=true;
 return {lane,w,scene,state,geometry,settlement,physical,campaign,tape,warnings,hero,seats,controller,host,
  setProgression(value:boolean){progression=value;},effect,
  snapshot(){return {drops:graph(physical.input.state.drops),orbs:graph(state.orbs),flashes:graph(geometry.flashes),ledger:graph(campaign.account.ledger),unlocked:graph(campaign.account.unlockedSkills),secondary:graph(campaign.account.memorySecondary),dirty:campaign.accountDirty,story:state.spoilStory,tape:[...tape],warnings:[...warnings]};}};
}
type Fixture=ReturnType<typeof fixture>;
const receipts:any[]=[];
function compare(label:string,course:(f:Fixture)=>unknown,seed=319,failAt=''){
 function run(lane:Lane){
  const rng=new Rng(seed),draws:any[]=[],prior=Math.random,warn=console.warn,tap=SIM_TAP.current;
  Math.random=()=>{const before=rng.snapshot(),value=rng.next();draws.push([before,value,rng.snapshot()]);return value;};
  try{const f=fixture(lane,failAt);console.warn=(...args:any[])=>f.warnings.push(args);SIM_TAP.current={onOrbShed:(kind:string)=>f.effect('onOrbShed',[kind])} as any;
   let result:any,error:string|undefined;try{result=course(f);}catch(e){error=(e as Error).message;}
   return {result:graph(result),error,snapshot:f.snapshot(),draws,sentinel:Math.random(),itemUidWitness:nextItemUid()-itemUidBase};
  }finally{Math.random=prior;console.warn=warn;SIM_TAP.current=tap;}
 }
 const expected=run('original');for(const lane of ['world','core','owner'] as const)assert.deepEqual(run(lane),expected,label+' '+lane);
 if(failAt)assert.equal(expected.error,'injected '+failAt,label+' fault reached');else assert.equal(expected.error,undefined,label);
 receipts.push({label,seed,failAt,draws:expected.draws.length,hash:hash(JSON.stringify(expected))});return expected;
}
const at=vec(100,200),vestige=Object.keys(VESTIGES)[0],skill=Object.values(SKILLS).find(s=>!s.noDrop)!.id,support=Object.keys(SUPPORTS)[0];
function item(category='helmet'){
 const base=Object.values(ITEM_BASES).find(b=>b.category===category);assert.ok(base,'native '+category+' base');
 const made=rollItem({baseId:base.id,ilvl:31,rarity:'common'});assert.ok(made);made.x=7;made.y=9;return made;
}
function rule(f:Fixture,kind='timed',rotate=false){
 f.campaign.dropRuleOf=function(this:any,id:string){assert.equal(this,f.campaign);f.effect('dropRuleOf',[id]);return {rule:kind,freeAfterSec:6,allocation:rotate?'rotate':'owner',deal:rotate?(eligible:string[])=>{f.effect('deal',[eligible]);return eligible.at(-1);}:undefined};};
}
for(const story of [undefined,0,1,3])compare('native currency story '+story,f=>{
 f.state.spoilStory=story;f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:3});f.controller.dropAbilityEssenceAt(at,3,4);f.controller.dropVestigeAt(at,vestige,2);
 return f.controller.spoilClamp();
});
compare('currency early gates and native vestige zero/negative',f=>{
 f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:0});f.controller.dropAbilityEssenceAt(at,1,-2);f.controller.dropVestigeAt(at,'invalid',5);
 for(const count of [0,-1])f.controller.dropVestigeAt(at,vestige,count);
 assert.equal(f.physical.input.state.drops.length,2);
});
compare('context sealing overrides local ground',f=>{
 f.scene.zone.spoils='none';const open={...f.scene.zone,spoils:undefined};
 f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:3});f.controller.dropAbilityEssenceAt(at,1,3);f.controller.dropVestigeAt(at,vestige);
 f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:3},open);f.controller.dropAbilityEssenceAt(at,8,3,Math.random,open);f.controller.dropVestigeAt(at,vestige,2,open);
 f.scene.zone.spoils=undefined;const sealed={...open,spoils:'none'};
 f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:3},sealed);f.controller.dropAbilityEssenceAt(at,1,3,Math.random,sealed);f.controller.dropVestigeAt(at,vestige,2,sealed);
 assert.equal(f.physical.input.state.drops.length,3);
});
compare('dedicated currency RNG and live story',f=>{
 const rng=new Rng(8903);f.controller.dropAbilityEssenceAt(at,100,5,()=>rng.next());f.state.spoilStory=4;f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:2});return rng.snapshot();
});
for(const kind of ['free','timed','permanent'])compare('quest currency stamp '+kind,f=>{rule(f,kind);f.campaign.questSeat=f.seats[1];f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:3});});
for(const droppedBy of [undefined,'ally','missing'])for(const owed of [false,true])compare('native gear '+droppedBy+' owed '+owed,f=>{
 rule(f);f.campaign.questSeat=f.seats[1];const gear=item();f.controller.dropGearAt(at,gear,droppedBy,owed);return gear;
});
compare('sealed gear owed/discard exceptions and context',f=>{
 f.scene.zone.spoils='none';for(const [discard,owed] of [[undefined,false],[undefined,true],['ally',false]] as const)f.controller.dropGearAt(at,item(),discard,owed);
 f.controller.dropGearAt(at,item(),undefined,false,{...f.scene.zone,spoils:undefined});assert.equal(f.physical.input.state.drops.length,3);
});
compare('relic lesson discovery and no discovery for owed/discard',f=>{
 const relic=()=>item('relic');f.controller.dropGearAt(at,relic());assert.equal(f.physical.input.state.drops.length,0);
 f.controller.dropGearAt(at,relic(),undefined,true);f.controller.dropGearAt(at,relic(),'ally');
 for(const def of CONTAINER_DEFS)if(def.dropLedger)f.campaign.account.ledger[def.dropLedger]=1;
 f.controller.dropGearAt(at,relic());f.controller.dropGearAt(at,relic());assert.equal(f.physical.input.state.drops.length,4);
});
for(const progression of [false,true])compare('legendary discovery and commission threshold '+progression,f=>{
 f.setProgression(progression);f.campaign.account.ledger[gemDropKey(skill)]=VENDOR_CFG.commission.need-1;
 f.controller.noteGemDrop(skill);f.controller.noteGemDrop(skill,'legendary');f.campaign.accountDirty=false;f.controller.noteGemDrop(skill,'legendary');f.controller.noteContainerFind(item('relic'));
});
for(const kind of ['skill','support'])for(const valid of [false,true])compare('bare promised '+kind+' valid '+valid,f=>{
 f.controller.dropPinnedGem(vec(101,202),at,{k:kind,id:valid?(kind==='skill'?skill:support):'invalid',l:4,r:'legendary'},.34821);
});
for(const seed of [1,2,3,7,19,79,319,531,1031,1973,8975,17543])compare('native random skill/support memory '+seed,f=>{
 for(const id of Object.keys(SUPPORTS))f.campaign.account.unlockedSupports.add(id);
 for(let i=0;i<8;i++)f.controller.dropGemAt(at,i%2?['fire']:undefined,false,{d:'native-test',e:i%2?'magic':'normal'});
},seed);
compare('empty support pool falls through to native skill',f=>{f.campaign.account.unlockedSupports.clear();f.scene.zone.tileset='meadow';for(let i=0;i<16;i++)f.controller.dropGemAt(at);},17);
compare('forced memory promise floor/provenance and local story',f=>{
 for(const kind of ['rough','preformed'] as const)f.controller.dropGemAt(at,['fire'],false,{d:'regional-test',e:'rare'},kind);
 f.controller.dropGemAt(at,undefined,false,'promise-test','rough',{k:'skill',id:skill,l:3,r:'legendary'},{...f.scene.zone,tileset:'sulphur_pools',level:70});
});
compare('sealed gems owed exception and quest hand',f=>{
 rule(f);f.campaign.questSeat=f.seats[1];f.scene.zone.spoils='none';f.controller.dropGemAt(at);f.controller.dropGemAt(at,undefined,true,'owed','rough');
 f.controller.dropGemAt(at,undefined,false,'open-context','rough',undefined,{...f.scene.zone,spoils:undefined});assert.equal(f.physical.input.state.drops.length,2);
});
for(const mode of ['null','free','timed','permanent','rotate','keeper','merc','null-seat','no-new'])compare('spoils allocation '+mode,f=>{
 if(mode==='null')f.campaign.dropRuleOf=function(this:any,id:string){assert.equal(this,f.campaign);f.effect('dropRuleOf',[id]);return null;};else rule(f,mode==='free'?'free':mode==='permanent'?'permanent':'timed',mode==='rotate');
 for(let i=0;i<4;i++)f.controller.dropVestigeAt(at,vestige,2);
 f.physical.input.state.drops[1].owner='old-owner';f.controller.dropGearAt(at,item(),undefined,true);const quest=f.physical.input.state.drops.at(-1)!;if(quest.item.kind==='gear')quest.item.item.questId='native-quest';delete quest.owner;
 const seat=mode==='keeper'?f.seats[4]:mode==='merc'?f.seats[5]:mode==='null-seat'?null:f.seats[0];
 f.campaign.time=91;f.controller.ownSpoils(mode==='no-new'?f.physical.input.state.drops.length:0,seat,at);
});
compare('negative timed duration and absent deal return',f=>{
 f.campaign.dropRuleOf=()=>({rule:'timed',freeAfterSec:-5,allocation:'rotate',deal:()=>undefined});f.controller.dropVestigeAt(at,vestige);f.controller.ownSpoils(0,f.seats[0],at);
});
for(const owed of [false,true])compare('all loot table outcomes owed '+owed,f=>{
 rule(f);for(const result of [{kind:'gem'},{kind:'item',item:item()},{kind:'vestige',id:vestige,count:2},{kind:'essence',gain:{essence:ESSENCE_IDS[0],count:3}},{kind:'memoryEssence',tier:3,count:4}])f.controller.mintLootResult(at,result,owed,{d:'table-test',e:'rare'});
});
compare('physical restore replaces the live drop array',f=>{
 f.controller.dropEssenceAt(at,{essence:ESSENCE_IDS[0],count:7});f.controller.dropPinnedGem(vec(101,201),at,{k:'skill',id:skill,r:'legendary'},.31);
 const old=f.physical.input.state.drops,saved=f.physical.captureZoneContents();f.physical.restoreZoneContents(saved);assert.notEqual(f.physical.input.state.drops,old);
 f.controller.dropVestigeAt(at,vestige,5);assert.equal(old.length,2);assert.equal(f.host.drops,f.physical.input.state.drops);assert.equal(f.host.drops.length,3);
 return f.physical.captureZoneContents();
});
compare('live receiver replacements across campaign geometry settlement',f=>{
 void f.host.clampPos;void f.host.rollSkillGem;void f.host.metaProgressionActive;
 f.geometry.clampPos=function(this:any,...args:any[]){assert.equal(this,f.geometry);f.effect('replacement clamp',args);return vec(777,888);};
 const prior=f.settlement.rollSkillGem;f.settlement.rollSkillGem=function(this:any,...args:any[]){assert.equal(this,f.settlement);f.effect('replacement roll',args);return prior.apply(this,args as Parameters<typeof prior>);};
 f.campaign.metaProgressionActive=function(this:any){assert.equal(this,f.campaign);f.effect('replacement progression',[]);return true;};
 f.campaign.account=structuredClone(factory.account);f.campaign.time=123;f.state.spoilStory=3;
 for(let i=0;i<10;i++)f.controller.dropGemAt(at);f.controller.noteGemDrop(skill,'legendary');
});
for(const opts of [undefined,{scatter:14,tier:3},{scatter:13,clamp:false,amount:0,life:0},{tier:0,life:4}])compare('native resource orb '+JSON.stringify(opts),f=>{
 f.controller.shedOrb('life',at,opts);f.controller.shedOrb('mana',at,{...opts,homeTo:f.hero});f.controller.shedOrb('invalid',at);assert.equal(f.state.orbs.length,2);
});
compare('native orb capacity early gate',f=>{f.state.orbs=Array.from({length:ORB_CAP},()=>({kind:'life'}));f.controller.shedOrb('mana',at,{scatter:15});});
for(const fail of ['clampPos','metaProgressionActive','questHand','dropRuleOf','sameParty','deal','onOrbShed'])compare('native partial failure '+fail,f=>{
 rule(f,'timed',true);
 if(['sameParty','seatHero','deal'].includes(fail)){f.controller.dropVestigeAt(at,vestige);f.controller.ownSpoils(0,f.seats[0],at);}
 else if(fail==='onOrbShed')f.controller.shedOrb('life',at);
 else if(fail==='metaProgressionActive')f.controller.dropPinnedGem(at,at,{k:'skill',id:skill,r:'legendary'},.42);
 else if(fail==='questHand'||fail==='dropRuleOf')f.controller.dropGemAt(at,undefined,true,'failure','rough');
 else f.controller.dropGemAt(at);
},317,fail);
compare('physical drop insertion failure retains pre-insert item mutation',f=>{
 const gear=item();f.physical.input.state.drops.push=function(){throw Error('injected drop insertion');};
 try{f.controller.dropGearAt(at,gear);}finally{assert.equal(gear.x,undefined);assert.equal(gear.y,undefined);}
},319,'drop insertion');
compare('cue insertion failure retains native drop',f=>{
 f.geometry.flashes.push=function(){throw Error('injected cue insertion');};f.controller.dropAbilityEssenceAt(at,2,4);
},319,'cue insertion');
assert.ok(gemFloorFor('sulphur_pools').skills.size>0,'course uses an actual registered native gem floor');
// Current authored memoryShare is one. Exercise the original bare-gem branch
// under its public lever too; do not claim random default drops cover it.
const memoryShare=GEM_DROP_CFG.memoryShare,bareSeen=new Set<string>();
try{
 GEM_DROP_CFG.memoryShare=0;
 for(const seed of [1,7,79,319])compare('bare native gem lever '+seed,f=>{
  for(const id of Object.keys(SUPPORTS))f.campaign.account.unlockedSupports.add(id);
  for(let i=0;i<10;i++)f.controller.dropGemAt(at,i%2?['fire']:undefined);
  for(const d of f.physical.input.state.drops){assert.ok(d.item.kind==='skill'||d.item.kind==='support');bareSeen.add(d.item.kind);}
 },seed);
 assert.deepEqual([...bareSeen].sort(),['skill','support'],'both native bare factories reached');
 compare('bare no-support fallback',f=>{f.campaign.account.unlockedSupports.clear();f.scene.zone.tileset='meadow';for(let i=0;i<12;i++)f.controller.dropGemAt(at);assert.ok(f.physical.input.state.drops.every(d=>d.item.kind==='skill'));},17);
 for(const kind of ['skill','support'])for(const valid of [true,false])compare('bare promised chokepoint '+kind+' '+valid,f=>{
  f.controller.dropGemAt(at,undefined,false,'pin-proof',undefined,{k:kind,id:valid?(kind==='skill'?skill:support):'invalid'});
  assert.equal(f.physical.input.state.drops.length,valid?1:0);assert.equal(f.warnings.length,valid?0:1);
 });
 compare('explicit memory overrides bare lever',f=>{f.controller.dropGemAt(at,undefined,false,'forced','preformed');assert.equal(f.physical.input.state.drops[0].item.kind,'gear');});
}finally{GEM_DROP_CFG.memoryShare=memoryShare;}
const radius=COOP_SCALING.shareRadius;
try{
 COOP_SCALING.shareRadius=500;
 compare('rotation filters living real seats in reach',f=>{rule(f,'timed',true);f.controller.dropVestigeAt(at,vestige);f.controller.ownSpoils(0,f.seats[0],at);const deal=f.tape.find(row=>row[0]==='deal');assert.ok(deal);assert.equal(f.physical.input.state.drops[0].owner,'ally');});
 compare('native partial failure seatHero',f=>{rule(f,'timed',true);f.controller.dropVestigeAt(at,vestige);f.controller.ownSpoils(0,f.seats[0],at);},319,'seatHero');
}finally{COOP_SCALING.shareRadius=radius;}
// A real physical restoration must remain the writer's target, but assembling a
// controller from another area's physical or settlement owner is refused.
{
 const f=fixture('owner'),base=f.controller.input;
 assert.equal(Object.isFrozen(base),true);assert.equal(Object.isFrozen(f.controller.host),true);
 for(const key of ['scene','geometry','physical','settlement','campaign','state']){
  const raw={...base};delete raw[key];assert.throws(()=>new NativeAreaSceneLoot(raw),/own object binding/);
  let reads=0;Object.defineProperty(raw,key,{get(){reads++;return base[key];}});assert.throws(()=>new NativeAreaSceneLoot(raw),/own object binding/);assert.equal(reads,0);
 }
 const foreign=fixture('owner');
 for(const key of ['scene','geometry','physical','settlement','campaign'])assert.throws(()=>new NativeAreaSceneLoot({...base,[key]:foreign.controller.input[key]}),/identical/);
 const raw={...base},local=new NativeAreaSceneLoot(raw);raw.state={spoilStory:7,orbs:[]};assert.equal(local.input.state,base.state,'bindings snapshotted once');
 const borrowed=f.host.dropGemAt;rule(f);f.campaign.questHand=undefined;assert.throws(()=>borrowed(at,undefined,true,'lazy-error','rough'),/Missing native loot capability: questHand|undefined/);
}
console.log('PASS native loot parity',receipts.length,'original / World / core / owner courses',hash(JSON.stringify(receipts)));
