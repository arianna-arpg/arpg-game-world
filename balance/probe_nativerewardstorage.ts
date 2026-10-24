import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {makeSimWorld} from '../src/sim/arena';
import {Rng,withSeededRandom} from '../src/core/rng';
import {NativeAreaSceneAssembly,freshAssemblyInput} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneLoot,freshSceneLootState} from '../src/worldmass/nativeAreaSceneLoot';
import {NativeAreaScenePhysical,freshScenePhysicalState} from '../src/worldmass/nativeAreaScenePhysical';
import {ESSENCE_IDS} from '../src/data/essences';
import {ORB_DEFS} from '../src/data/orbs';
type Slot='orbs'|'chests'|'shrines'|'altars'|'drops';
const keys:Slot[]=['orbs','chests','shrines','altars','drops'],physicalKeys=keys.slice(1),results:string[]=[];let cases=0;
function fixture(){const w=makeSimWorld('warrior',40013),definition={...w.zone,spoils:undefined,objective:{kind:'none' as const}};w.zoneMap[definition.id]=definition;const area=new NativeAreaSceneAssembly(freshAssemblyInput(w,definition));return {w,area,loot:area.lootController,physical:area.input.physical};}
const a=fixture(),b=fixture(),state=(f:ReturnType<typeof fixture>,key:Slot):any=>key==='orbs'?f.loot.input.state:f.physical.input.state;
function fresh(key:Slot):any{return key==='orbs'?freshSceneLootState():freshScenePhysicalState();}
function construct(key:Slot,s:any,f=a){return key==='orbs'?new NativeAreaSceneLoot({...f.loot.input,state:s}):new NativeAreaScenePhysical({...f.physical.input,state:s});}
function course(name:string,run:()=>void){const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);if(only&&!name.includes(only))return;run();results.push(name);console.log('PASS reward storage: '+name);}
function refuse(key:Slot,s:any){const before=Object.getOwnPropertyDescriptors(s);assert.throws(()=>construct(key,s),/Native reward storage/);assert.deepEqual(Object.getOwnPropertyDescriptors(s),before);cases++;}
course('real native orb drop cannot appear in another area through a shared replacement',()=>{
 try{b.loot.input.state.orbs=a.loot.input.state.orbs;}catch(e){assert.match(String(e),/Native reward storage queue belongs to another slot/);}
 a.loot.shedOrb('life',a.area.input.scene.player.pos,{scatter:0});
 assert.equal(a.loot.input.state.orbs.length,1);assert.equal(b.loot.input.state.orbs.length,0,'A native orb must not enter B reward queue');cases++;
});
course('real native essence drop cannot appear in another physical area through a shared replacement',()=>{
 try{b.physical.input.state.drops=a.physical.input.state.drops;}catch(e){assert.match(String(e),/Native reward storage queue belongs to another slot/);}
 a.loot.dropEssenceAt(a.area.input.scene.player.pos,{essence:ESSENCE_IDS[0],count:1});
 assert.equal(a.physical.input.state.drops.length,1);assert.equal(b.physical.input.state.drops.length,0,'A native essence must not enter B physical queue');cases++;
});
course('whole state and every already owned initial queue refuse atomically',()=>{
 for(const kind of ['orbs','drops'] as const){const s=state(a,kind);refuse(kind,s);}
 for(const key of keys){const s=fresh(key);s[key]=state(a,key)[key];refuse(key,s);s[key]=[];assert.equal(construct(key,s).input.state,s);cases++;}
});
course('physical initial same-state aliases and cross-family initial queues refuse atomically',()=>{
 for(const first of physicalKeys)for(const second of physicalKeys){if(first===second)continue;const s=fresh('drops');s[second]=s[first];refuse('drops',s);s[second]=[];construct('drops',s);cases++;}
 for(const key of physicalKeys){const s=fresh('orbs');s.orbs=state(a,key)[key];refuse('orbs',s);s.orbs=[];construct('orbs',s);const p=fresh('drops');p[key]=a.loot.input.state.orbs;refuse('drops',p);p[key]=[];construct('drops',p);cases+=2;}
});
course('all raw stores preserve identity methods enumerability nonextensible state and same-slot history',()=>{
 for(const kind of ['orbs','drops'] as const){
  const s=fresh(kind),slots=kind==='orbs'?['orbs']:physicalKeys,originals=new Map(slots.map(k=>[k,s[k]]));
  slots.forEach((key,i)=>Object.defineProperty(s,key,{enumerable:i%2===0}));const enumeration=Object.keys(s);Object.preventExtensions(s);const owner=construct(kind,s);assert.deepEqual(Object.keys(s),enumeration);
  for(const key of slots){const old=originals.get(key)!;assert.equal(s[key],old);assert.equal((owner.host as any)[key],old);assert.equal(s[key].push,Array.prototype.push);const next:any[]=[];s[key]=next;assert.equal((owner.host as any)[key],next);(owner.host as any)[key]=old;assert.equal(s[key],old);s[key]=next;assert.equal(Object.getOwnPropertyDescriptor(s,key)!.configurable,false);cases++;}
 }
});
course('every cross-slot cross-owner and historical replacement refuses without a side effect',()=>{
 const left={orbs:construct('orbs',fresh('orbs')),drops:construct('drops',fresh('drops'))},right={orbs:construct('orbs',fresh('orbs'),b),drops:construct('drops',fresh('drops'),b)};
 const get=(set:typeof left,k:Slot):any=>set[k==='orbs'?'orbs':'drops'].input.state;
 for(const first of keys){const old=get(left,first)[first];get(left,first)[first]=[];
  for(const second of keys){const target=get(right,second),before=target[second];assert.throws(()=>target[second]=old,/another slot/);assert.equal(target[second],before);cases++;
   if(second!==first){const own=get(left,second),prior=own[second];assert.throws(()=>own[second]=old,/another slot/);assert.equal(own[second],prior);cases++;}}
  get(left,first)[first]=old;assert.equal(get(left,first)[first],old);cases++;
 }
});
course('invalid descriptors types and late failures preserve all unclaimed storage',()=>{
 for(const key of keys)for(const kind of ['missing','inherited','accessor','readonly','nonconfigurable','wrongType']){
  const s=fresh(key),old=s[key];let reads=0;
  if(kind==='missing')delete s[key];
  if(kind==='inherited'){delete s[key];Object.setPrototypeOf(s,{[key]:old});}
  if(kind==='accessor')Object.defineProperty(s,key,{configurable:true,get(){reads++;throw Error('must not read');}});
  if(kind==='readonly')Object.defineProperty(s,key,{writable:false});
  if(kind==='nonconfigurable')Object.defineProperty(s,key,{configurable:false});
  if(kind==='wrongType')s[key]={};
  refuse(key,s);assert.equal(reads,0);
  if(kind==='nonconfigurable'){const retry=fresh(key);for(const k of key==='orbs'?['orbs']:physicalKeys)retry[k]=k===key?old:s[k];construct(key,retry);}
  else{Object.defineProperty(s,key,{value:old,writable:true,configurable:true,enumerable:true});construct(key,s);}cases++;
 }
});
course('other owner binding failure leaves fresh reward and physical storage unclaimed',()=>{
 const loot=freshSceneLootState(),physical=freshScenePhysicalState(),lo=Object.getOwnPropertyDescriptors(loot),po=Object.getOwnPropertyDescriptors(physical);
 assert.throws(()=>new NativeAreaSceneLoot({...a.loot.input,state:loot,scene:b.area.input.scene}),/identical/);assert.deepEqual(Object.getOwnPropertyDescriptors(loot),lo);construct('orbs',loot);
 assert.throws(()=>new NativeAreaScenePhysical({...a.physical.input,state:physical,geometry:b.area.input.geometry}),/identical/);assert.deepEqual(Object.getOwnPropertyDescriptors(physical),po);construct('drops',physical);cases+=2;
});
course('constructor never evaluates or changes supplied raw array methods',()=>{
 for(const key of keys){const s=fresh(key),raw=s[key];let reads=0;Object.defineProperty(raw,'push',{get(){reads++;throw Error('native method getter');},configurable:true});construct(key,s);assert.equal(reads,0);assert.equal(s[key],raw);assert.throws(()=>s[key].push(),/native method getter/);assert.equal(reads,1);cases++;}
});
course('frozen raw orb queue preserves actual World native RNG and failure behavior',()=>{
 function run(owner:boolean){return withSeededRandom(40401,()=>{const f=fixture(),raw=Object.freeze([]) as unknown as typeof f.loot.input.state.orbs;f.loot.input.state.orbs=raw;f.w.orbs=raw;f.w.zone=f.area.input.scene.zone;f.w.clampPos=(...args)=>f.area.input.geometry.clampPos(...args);
  const rng=new Rng(74001),prior=Math.random;let draws=0,error:unknown;Math.random=()=>{draws++;return rng.next();};try{if(owner)f.loot.shedOrb('life',{x:700,y:700});else f.w.shedOrb('life',{x:700,y:700});}catch(e){error=e;}finally{Math.random=prior;}
  assert(error instanceof TypeError);assert.equal(f.loot.input.state.orbs,raw);assert.equal(raw.length,0);return {error:(error as Error).name,draws,sentinel:rng.next()};});}
 assert.deepEqual(run(true),run(false));cases++;
});
course('native physical memory restore replaces stores and reward sink follows exact new drops',()=>{
 const f=fixture();f.loot.dropEssenceAt({x:800,y:800},{essence:ESSENCE_IDS[0],count:3});const saved=f.physical.captureZoneContents(),old=f.physical.input.state.drops,oldQueues=physicalKeys.map(k=>(f.physical.input.state as any)[k]);
 f.physical.restoreZoneContents(saved);physicalKeys.forEach((k,i)=>assert.notEqual((f.physical.input.state as any)[k],oldQueues[i]));const next=f.physical.input.state.drops;assert.equal(next.length,1);assert.equal(old.length,1);assert.notEqual(next[0],old[0]);assert.deepEqual(next[0],saved.drops[0]);f.loot.dropEssenceAt({x:810,y:800},{essence:ESSENCE_IDS[0],count:4});assert.equal(next.length,2);assert.equal(old.length,1);assert.equal(f.loot.host.drops,next);
 f.physical.input.state.drops=old;assert.equal(f.loot.host.drops,old);f.physical.input.state.drops=next;assert.equal(f.loot.host.drops,next);cases++;
});
course('native restore failure retains earlier replacement and unchanged later raw stores',()=>{
 const f=fixture(),before={...f.physical.input.state};assert.throws(()=>f.physical.restoreZoneContents({chests:[],shrines:null,altars:[],drops:[]} as any),TypeError);
 assert.notEqual(f.physical.input.state.chests,before.chests);assert.equal(f.physical.input.state.shrines,before.shrines);assert.equal(f.physical.input.state.altars,before.altars);assert.equal(f.physical.input.state.drops,before.drops);f.physical.input.state.chests=before.chests;assert.equal(f.physical.input.state.chests,before.chests);cases++;
});
course('all installed orb definitions use the actual local raw queue',()=>{
 const f=fixture(),raw=f.loot.input.state.orbs;for(const id of Object.keys(ORB_DEFS)){f.loot.shedOrb(id,{x:800,y:800},{scatter:0});assert.equal(raw.at(-1)!.kind,id);cases++;}assert.equal(f.loot.input.state.orbs,raw);
});
const report={groups:results.length,cases,results,receipt:createHash('sha256').update(JSON.stringify({results,cases})).digest('hex'),limits:'Container ownership only across orb/chest/shrine/altar/drop slots; individual records, other owner families, pickups and full retained scheduling remain separate. World frozen-queue comparison explicitly shares native queue/zone/geometry.'};
fs.writeFileSync(new URL('./reports/nativerewardstorage.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
