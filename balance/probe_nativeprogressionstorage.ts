/** Exclusive raw progression storage proof. Native combat callbacks are explicit
 * fixture-only original World drivers; no production combat implementation is claimed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World,type Seat} from '../src/engine/world';
import {Actor} from '../src/engine/actor';
import {makeSimWorld} from '../src/sim/arena';
import {Rng,withSeededRandom} from '../src/core/rng';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {NativeAreaSceneProjectiles} from '../src/worldmass/nativeAreaSceneProjectiles';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionInput,type NativeSceneProgressionRuntime,type NativeSceneProgressionState} from '../src/worldmass/nativeAreaSceneProgression';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
const arrayKeys=['pendingRespawns','pendingSummons','projectiles','zones','pendingRepeats','pendingFuses','pendingSalvos','pendingSteps','pendingFollowUps','pendingBlinks','emergences'] as const;
const mapKeys=['treeBuffSources','recallTreeSpears'] as const;
const keys=[...arrayKeys,...mapKeys];
type Key=typeof keys[number];
const map=(k:Key)=>(mapKeys as readonly string[]).includes(k),fresh=(k:Key)=>map(k)?new WeakMap():[];
const get=(s:NativeSceneProgressionState,k:Key)=>s[k] as object;
const put=(s:NativeSceneProgressionState,k:Key,v:unknown)=>{(s as unknown as Record<string,unknown>)[k]=v;};
const results:string[]=[];let cases=0;
function course(name:string,fn:()=>void){fn();results.push(name);console.log('PASS '+name);}
function fixture(){
 const w=makeSimWorld('warrior',36013),definition={...w.zone,objective:{kind:'none' as const}};
 w.zoneMap[definition.id]=definition;
 const raw=freshAssemblyInput(w,definition),campaign:any=raw.campaign;
 Object.assign(campaign,{time:100,timeflow:w.timeflow,hiredMercs:[],mercSyncedLevel:-1,
  seatHero(s:Seat){assert.equal(this,campaign);return s.home??s.actor;},
  seatOf(a:Actor){assert.equal(this,campaign);return campaign.seats.find((s:Seat)=>s.actor===a);},
  markMetaDirty(){assert.equal(this,campaign);}});
 const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,geometry=area.input.geometry,population=area.input.population;
 geometry.walk=w.walk;scene.actors.splice(0,scene.actors.length,raw.player);scene.player=raw.player;
 const authority=new NativeAreaActorAuthority<NativeSceneProgressionRuntime>(campaign);
 const base={scene,geometry,population,ecology:area.input.ecology,runtime:area.input.registry.input.birth,loot:area.lootController,campaign,authority};
 const state=freshSceneProgressionState(),input:NativeSceneProgressionInput={...base,state},owner=new NativeAreaSceneProgression(input);
 const calls:string[]=[],combat:any={scene,state};
 for(const name of ['kill','guardBash','executeSkill','burstDamage','guardArtHit','litePromoteNearest','companionPulseHit','useSkill','spawnConstruct','spawnProjectile','attackSequenceBurst','challengeBurst','challengeHit'])combat[name]=function(...args:any[]){assert.equal(this,combat);calls.push(name);return (World.prototype as any)[name].apply(w,args);};
 const binding=authority.register(scene,{progression:owner,combat});authority.claim(binding,scene.actors);
 // The original World driver uses this same physical scene and raw stores only in this test.
 for(const key of ['actors','player','zone'])Object.defineProperty(w,key,{configurable:true,get:()=>(scene as any)[key],set:value=>(scene as any)[key]=value});
 for(const key of keys)Object.defineProperty(w,key,{configurable:true,get:()=>state[key],set:value=>put(state,key,value)});
 for(const key of ['guardArts','companionBonds','attackSequences','challenges'])Object.defineProperty(w,key,{configurable:true,get:()=>(owner as any)[key]});
 Object.defineProperty(w,'flashes',{configurable:true,get:()=>geometry.flashes});
 const projectiles=new NativeAreaSceneProjectiles({scene,population,campaign,progression:owner,authority});
 return {w,area,scene,geometry,population,campaign,authority,state,input,owner,projectiles,calls,
  construct:(s:NativeSceneProgressionState)=>new NativeAreaSceneProgression({...base,state:s})};
}
const a=fixture(),b=fixture();
function refusedState(s:NativeSceneProgressionState){const before=Object.getOwnPropertyDescriptors(s);assert.throws(()=>a.construct(s),/Native progression/);assert.deepEqual(Object.getOwnPropertyDescriptors(s),before,'failed construction leaves every own descriptor untouched');cases++;}
function recover(s:NativeSceneProgressionState){const owner=a.construct(s);assert.equal(owner.input.state,s);cases++;return owner;}

course('actual projectile append and foreign field cleanup cannot cross area stores',()=>{
 // Under the archived owner both assignments succeed. The negative control must
 // reach the visible queue contamination assertion, not merely a throw matcher.
 try{b.state.projectiles=a.state.projectiles;}catch(e){assert.match(String(e),/Native progression store belongs to another slot/);}
 const inst=makeSkillInstance(SKILLS.fireball,1);assert.equal(inst.def.delivery.type,'projectile');
 if(!process.argv.includes('--cleanup-only')){a.projectiles.spawnProjectile(a.scene.player,inst,a.scene.player.pos,0);
  assert.equal(a.state.projectiles.length,1);assert.equal(b.state.projectiles.length,0,'A launch must not enter B queue');}
 try{b.state.zones=a.state.zones;}catch(e){assert.match(String(e),/Native progression store belongs to another slot/);}
 const zone={caster:a.scene.player,reserved:7,pos:{x:0,y:0},radius:1,tier:0} as World['zones'][number];a.scene.player.reservedMana=13;a.state.zones.push(zone);
 try{b.owner.expireZone(zone);}catch(e){assert.match(String(e),/Foreign native progression zone/);}
 assert.equal(a.scene.player.reservedMana,13,'B cleanup must not refund A caster');assert.equal(zone.reserved,7);
 a.owner.expireZone(zone);assert.equal(a.scene.player.reservedMana,6);assert.equal(zone.reserved,0);assert.equal(a.calls.length+b.calls.length,0);cases+=4;
});
course('whole state and all initial foreign stores refuse without partial accessor installation',()=>{
 const before=Object.getOwnPropertyDescriptors(a.state);assert.throws(()=>a.construct(a.state),/fresh local storage state/);assert.deepEqual(Object.getOwnPropertyDescriptors(a.state),before);cases++;
 for(const key of keys){const s=freshSceneProgressionState();put(s,key,get(a.state,key));refusedState(s);put(s,key,fresh(key));recover(s);}
});
course('all same-owner cross-slot aliases refuse during construction',()=>{
 for(const family of [arrayKeys,mapKeys])for(const first of family)for(const second of family){if(first===second)continue;const s=freshSceneProgressionState();put(s,second,get(s,first));refusedState(s);put(s,second,fresh(second));recover(s);}
});
course('all storage slots preserve raw identity, methods, enumerability and same-slot history',()=>{
 const s=freshSceneProgressionState(),before=new Map(keys.map(k=>[k,get(s,k)]));
 for(let i=0;i<keys.length;i++)Object.defineProperty(s,keys[i],{enumerable:i%2===0});
 const enumeration=Object.keys(s);Object.preventExtensions(s);const owner=recover(s);assert.deepEqual(Object.keys(s),enumeration);
 for(const key of keys){const original=before.get(key)!,method=map(key)?(original as WeakMap<object,unknown>).get:(original as unknown[]).push;
  assert.equal(get(s,key),original);assert.equal((owner.host as any)[key],original);assert.equal(map(key)?(get(s,key) as WeakMap<object,unknown>).get:(get(s,key) as unknown[]).push,method);
  const next=fresh(key);put(s,key,next);assert.equal((owner.host as any)[key],next);(owner.host as any)[key]=original;assert.equal(get(s,key),original);put(s,key,next);put(s,key,next);assert.equal(get(s,key),next);assert.equal(Object.getOwnPropertyDescriptor(s,key)!.configurable,false);cases++;
 }
});
course('every foreign and cross-slot replacement refuses, including retired storage',()=>{
 const left=a.construct(freshSceneProgressionState()),right=b.construct(freshSceneProgressionState());
 for(const family of [arrayKeys,mapKeys])for(const key of family){const original=get(left.input.state,key);put(left.input.state,key,fresh(key));
  for(const other of family){const before=get(right.input.state,other);assert.throws(()=>put(right.input.state,other,original),/another slot/);assert.equal(get(right.input.state,other),before);cases++;
   if(other!==key){const localBefore=get(left.input.state,other);assert.throws(()=>put(left.input.state,other,original),/another slot/);assert.equal(get(left.input.state,other),localBefore);cases++;}}
  put(left.input.state,key,original);assert.equal(get(left.input.state,key),original);
 }
});
course('all invalid slot forms refuse atomically and leave unclaimed stores reusable',()=>{
 for(const key of keys)for(const kind of ['missing','inherited','accessor','readonly','nonconfigurable','wrongType'] as const){
  const s=freshSceneProgressionState(),original=get(s,key);let reads=0;
  if(kind==='missing')delete (s as any)[key];
  if(kind==='inherited'){delete (s as any)[key];Object.setPrototypeOf(s,{[key]:original});}
  if(kind==='accessor')Object.defineProperty(s,key,{configurable:true,get(){reads++;throw Error('must not read accessor');}});
  if(kind==='readonly')Object.defineProperty(s,key,{writable:false});
  if(kind==='nonconfigurable')Object.defineProperty(s,key,{configurable:false});
  if(kind==='wrongType')put(s,key,map(key)?new Map():{});
  refusedState(s);assert.equal(reads,0);
  if(kind==='nonconfigurable'){
   const retry=freshSceneProgressionState();for(const k of keys)put(retry,k,k===key?original:get(s,k));recover(retry);
  }else{Object.defineProperty(s,key,{value:original,writable:true,configurable:true,enumerable:true});recover(s);}
 }
});
course('late invalid slot does not consume early storage and foreign refusal does not consume fresh replacements',()=>{
 const s=freshSceneProgressionState(),first=s.projectiles;Object.defineProperty(s,'recallTreeSpears',{writable:false});refusedState(s);Object.defineProperty(s,'recallTreeSpears',{writable:true});recover(s);assert.equal(s.projectiles,first);
 const owner=a.construct(freshSceneProgressionState());for(const key of keys){const old=get(owner.input.state,key),bad=map(key)?new Map():{};assert.throws(()=>put(owner.input.state,key,bad),/Native progression/);assert.equal(get(owner.input.state,key),old);const next=fresh(key);put(owner.input.state,key,next);assert.equal(get(owner.input.state,key),next);cases++;}
});
course('other constructor failures leave storage and descriptors untouched',()=>{
 const s=freshSceneProgressionState(),before=Object.getOwnPropertyDescriptors(s);
 assert.throws(()=>new NativeAreaSceneProgression({...a.input,state:s,scene:b.scene}),/identical/);assert.deepEqual(Object.getOwnPropertyDescriptors(s),before);recover(s);
});
course('WeakMap branding does not evaluate or replace supplied native methods',()=>{
 const s=freshSceneProgressionState(),key={},value={caster:a.scene.player,inst:makeSkillInstance(SKILLS.fireball,1)};s.treeBuffSources.set(key as any,value);let reads=0;
 Object.defineProperty(s.treeBuffSources,'has',{get(){reads++;throw Error('must not read supplied method');},configurable:true});const original=s.treeBuffSources;recover(s);assert.equal(reads,0);assert.equal(s.treeBuffSources,original);assert.equal(s.treeBuffSources.get(key as any),value);cases++;
});
course('frozen raw queue keeps original native launch failure and prior read/RNG order',()=>{
 function run(lane:'world'|'owner'){
  return withSeededRandom(36313,()=>{const f=fixture(),p=f.scene.player,inst=makeSkillInstance(SKILLS.fireball,1),queue=Object.freeze([]) as unknown as World['projectiles'];f.state.projectiles=queue;
   const reads:string[]=[],get=p.sheet.get;p.sheet.get=function(...args:any[]){reads.push(String(args[0]));return (get as any).apply(this,args);};const rng=new Rng(991),prior=Math.random;let draws=0;Math.random=()=>{draws++;return rng.next();};let error:unknown;
   try{if(lane==='world')f.w.spawnProjectile(p,inst,p.pos,0);else f.projectiles.spawnProjectile(p,inst,p.pos,0);}catch(e){error=e;}finally{Math.random=prior;p.sheet.get=get;}
   assert.ok(error instanceof TypeError);assert.equal(f.state.projectiles,queue);assert.equal(queue.length,0);return {error:(error as Error).name,reads,draws,sentinel:rng.next()};});
 }
 assert.deepEqual(run('owner'),run('world'));cases++;
});
course('native tree cleanup replaces queues but preserves old raw arrays and owned field refund',()=>{
 function run(lane:'world'|'owner'){
  return withSeededRandom(36013,()=>{const f=fixture(),p=f.scene.player,inst=makeSkillInstance(SKILLS.fireball,1),other=makeSkillInstance(SKILLS.fireball,1);f.projectiles.spawnProjectile(p,inst,p.pos,0);f.projectiles.spawnProjectile(p,other,p.pos,0);
   const old=f.state.projectiles,first=old[0],keep=old[1];const z={caster:p,inst,reserved:7,pos:{x:0,y:0},radius:1,tier:0} as World['zones'][number];f.state.zones.push(z);p.reservedMana=13;
   if(lane==='world')(f.w as any).clearTreeFields(p,inst);else f.owner.clearTreeFields(p,inst);
   assert.notEqual(f.state.projectiles,old);assert.deepEqual(old,[first,keep]);assert.deepEqual(f.state.projectiles,[keep]);assert.equal(f.state.zones.length,0);assert.equal(p.reservedMana,6);assert.equal(f.calls.length,0);
   const cleaned=f.state.projectiles;f.state.projectiles=old;assert.equal(f.state.projectiles,old);f.state.projectiles=cleaned;return {count:cleaned.length,oldCount:old.length,reserved:p.reservedMana,fieldReserved:z.reserved};});
 }
 assert.deepEqual(run('owner'),run('world'));cases++;
});
const receipt=createHash('sha256').update(JSON.stringify({results,cases})).digest('hex');console.log(JSON.stringify({groups:results.length,cases,receipt}));
