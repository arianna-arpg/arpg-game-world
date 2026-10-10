/** Whole native post-arrival birth, including retained RNG and partial failures. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeSimWorld} from '../src/sim/arena';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {nextItemUid} from '../src/engine/itemgen';
import {Rng,withSeededRandom} from '../src/core/rng';
import {START_ZONE,type ObjectiveSpec} from '../src/data/zones';
import {clearSeaMemo} from '../src/world/seas';
import {placeZoneAt} from '../src/engine/worldgen';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import type {NativeAreaBirthArguments} from '../src/engine/nativeAreaBirth';
import {composeNativeSceneBirth,runComposedNativeBirth} from '../src/worldmass/nativeSceneBirthComposition';
import {completeBirthFixture,completeBirthRoots} from './nativeSceneBirthFixture';
import {original,archive} from './nativeCompleteBirthArchive';
const worldSource=fs.readFileSync(new URL('../src/engine/nativePopulationRules.ts',import.meta.url),'utf8');
const policy=Function('return ('+worldSource.match(/const POCKET_CFG = (\{[^;]+\});/)![1]+')')();
const fixtures=[{seed:713,target:{x:6765,y:160},mintSeed:2229205504,index:810064},{seed:991,target:{x:-35,y:1280},mintSeed:1015847609,index:810204},{seed:713,target:null,mintSeed:713,index:0}];
const lane=process.argv.find(a=>a.startsWith('--birth-lane='))?.split('=')[1];
function run(f:typeof fixtures[number],warm:boolean,failAt?:number,objective?:ObjectiveSpec,solved?:'ledger'|'memory'){clearSeaMemo();resetActorIdCounter(650000);const itemBase=nextItemUid()+1;return withSeededRandom(f.seed,()=>{
 const w:any=makeSimWorld('warrior',f.seed);w.sim.bindGeographyPolicies();
 const reader=createNativeGeographyReader(captureNativeGeographySource(f.seed));
 const z=f.target?placeZoneAt(f.target,null,w.zoneMap,f.index,{seed:f.mintSeed,level:10,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt}):w.zoneMap[START_ZONE];w.zoneMap[z.id]=z;if(objective)z.objective=structuredClone(objective);
 if(warm){withSeededRandom(f.mintSeed,()=>w.loadZone(z.id));for(const a of w.actors)if(a!==w.player&&a.fromZoneGen)a.life*=.57;if(solved==='memory')for(const puzzle of w.puzzles)puzzle.done=true;w.captureZoneMemory();}if(solved==='ledger')w.completedObjectives.add(z.id);
 const stop=Symbol('native birth captured');let result:any;const native=w.runNativeAreaBirth;
 w.runNativeAreaBirth=function(...args:any[]){
  const effects:unknown[]=[];const emit=w.events.emit,release=w.timeflow.release;
  w.events.emit=function(...a:any[]){effects.push(['emit',a]);return emit.apply(this,a);};
  w.timeflow.release=function(...a:any[]){effects.push(['release',a]);return release.apply(this,a);};
  const notices:unknown[]=[];w.text=(...a:any[])=>notices.push(['text',a]);w.notice=(...a:any[])=>notices.push(['notice',a]);
  const local=lane==='local'?completeBirthFixture(w,policy):null;
  const host=local?.host??w.nativeAreaBirthHost(),owner=local?.input.population??w;
  const factory=owner.createMonster,calls:any[]=[],draws:number[]=[],made:Actor[]=[];
  owner.createMonster=function(...a:any[]){calls.push(a);if(calls.length===failAt)throw Error('birth factory failure');const body=factory.apply(owner,a);made.push(body);return body;};
  const next=Rng.prototype.next;Rng.prototype.next=function(){const value=next.call(this);draws.push(value);return value;};
  if(local){
   // Complete native geometry/census ownership: no fallback to the donor scene.
   for(const key of ['zone','actors','doodads','walk','exits','geysers'])Object.defineProperty(w,key,{configurable:true,get(){throw Error('Foreign World scene read '+key);},set(){throw Error('Foreign World scene write '+key);}});
   for(const key of archive.methods)if(!['text','notice'].includes(key))w[key]=()=>{throw Error('Foreign World birth callback '+key);};
  }
  let error:string|undefined;
  try{if(lane==='archive')original.apply(w,args);else if(local)runComposedNativeBirth(host,...args as Parameters<typeof runComposedNativeBirth> extends [unknown,...infer A]?A:never);else native.apply(w,args);}
  catch(e){error=(e as Error).message;}finally{Rng.prototype.next=next;}
  const norm=(v:any,seen=new Map<object,number>()):any=>{
   if(v instanceof Actor)return {$actor:v.id};if(typeof v==='function')return {$function:true};if(v===undefined)return {$undefined:true};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};
   if(v===null||typeof v!=='object')return v;if(seen.has(v))return {$ref:seen.get(v)};seen.set(v,seen.size);
   if(v instanceof Map)return {$map:[...v].map(([k,x])=>[norm(k,seen),norm(x,seen)])};if(v instanceof Set)return {$set:[...v].map(x=>norm(x,seen))};if(ArrayBuffer.isView(v))return {$typed:v.constructor.name,values:Array.from(v as any)};
   if(Array.isArray(v))return v.map(x=>norm(x,seen));return Object.fromEntries(Object.keys(v).map(k=>[k,k==='uid'&&typeof v[k]==='number'?v[k]-itemBase:norm(v[k],seen)]));
  };
  const body=(a:Actor)=>{const data=captureNativeActorState(a);assert(data);for(const node of data.nodes)for(const row of node.entries)if(row[0]==='uid'&&typeof row[1]==='number')row[1]-=itemBase;return {id:a.id,state:data};};
  const geometry=local?.input.geometry??w;
  const state=Object.fromEntries(archive.fields.filter(k=>!['account','sim','zoneRuntimes'].includes(k)).map(k=>[k,(host as any)[k]]));
  result={error,effects:norm(effects),calls,draws,cursor:args[4].snapshot(),ambientAfter:Math.random(),made:made.map(body),actors:host.actors.filter((a:Actor)=>a!==host.player).map(body),state:norm(state),roots:norm(completeBirthRoots(w,local,notices)),walk:geometry.walk?.pack?.()??null,structures:norm(geometry.structures),farPointDraws:geometry.farPointDraws,nextActor:new Actor('cursor','enemy',{x:0,y:0}).id,items:nextItemUid()-itemBase};
  if(!error&&objective?.kind==='puzzle'){const puzzles=local?.input.environment.input.state.puzzles??w.puzzles;assert(puzzles.some((p:any)=>p.isObjective),'real objective puzzle born');if(solved)assert(puzzles.filter((p:any)=>p.isObjective).every((p:any)=>p.done),'native remembered/completed solve retained');}
  if(local&&!error){
   const input=local.input;assert.equal(input.environment.input.services.objectiveDone,input.objectives.objectiveDone);input.objectives.objectiveDone=!input.objectives.objectiveDone;assert.equal(input.environment.input.services.objectiveDone,input.objectives.objectiveDone);
   assert.throws(()=>composeNativeSceneBirth({...input,campaign:{...input.campaign}}),/identical/);
   const wrong=[...args];wrong[7]=!args[7];assert.throws(()=>runComposedNativeBirth(host,...wrong as NativeAreaBirthArguments),/transition/);
   assert.equal(host.zoneRuntimes.length,36);
   let badReads=0;for(const key of Object.keys(input)){const bad={...input};Object.defineProperty(bad,key,{get(){badReads++;throw Error('read foreign root');}});assert.throws(()=>composeNativeSceneBirth(bad),/own object binding/);}assert.equal(badReads,0);
   for(const part of ['population','settlement','bounty','physical','openings','theater','encounters','sites','history','descent','coast','arrival','adoption']){
    const bad={...input,[part]:Object.create(input[part])};Object.defineProperty(bad[part],'input',{value:{...input[part].input,campaign:{...input.campaign}}});assert.throws(()=>composeNativeSceneBirth(bad),/identical/);
   }
   const badEnvironment={...input,environment:Object.create(input.environment)};Object.defineProperty(badEnvironment.environment,'input',{value:{...input.environment.input,services:{...input.environment.input.services}}});assert.throws(()=>composeNativeSceneBirth(badEnvironment),/identical|objective state/);
   const priorCompleted=input.campaign.completedObjectives;input.campaign.completedObjectives=new Set(['replacement-ledger']);assert.equal(input.arrival.host.completedObjectives,input.campaign.completedObjectives);assert.equal(host.completedObjectives,input.campaign.completedObjectives);input.campaign.completedObjectives=priorCompleted;
   const from=[...args];from[6]='foreign-arrival';assert.throws(()=>runComposedNativeBirth(host,...from as NativeAreaBirthArguments),/transition/);
   const different={...input.scene,zone:{...input.scene.zone,id:'other-native-area'}};
   input.residents.bindArea({census:different,local:{...local.local,census:different}});
   assert.throws(()=>composeNativeSceneBirth(input),/resident factory/);assert.throws(()=>runComposedNativeBirth(host,...args as NativeAreaBirthArguments),/resident session/);
   input.residents.bindArea({census:input.scene,local:local.local});
   const exactPorts=fs.readFileSync(new URL('../src/engine/nativeAreaBirth.ts',import.meta.url),'utf8').split('export interface NativeAreaBirthHost {')[1].split('\n}')[0].split(/\r?\n/).map(line=>line.match(/^  (?:readonly )?(\w+)[(:]/)?.[1]).filter(Boolean).sort();
   assert.deepEqual(Object.keys(host).sort(),exactPorts,'every native birth port exactly once');
  }
  throw stop;
 };
 try{withSeededRandom(f.mintSeed,()=>w.loadZone(z.id));}catch(e){if(e!==stop)throw e;}
 assert(result);if(result.error)assert.equal(result.error,'birth factory failure',JSON.stringify({lane,f,warm,failAt,error:result.error}));return result;
});}
if(lane){
 const records=[];if(process.env.NATIVE_BIRTH_ONLY){const only=process.env.NATIVE_BIRTH_ONLY;records.push(run(fixtures[only.includes('town')?2:only.includes('second')?1:0],only.includes('warm'),only.includes('fail')?8:undefined,only.includes('none')?{kind:'none'}:undefined));}else{for(const f of fixtures)for(const warm of [false,true])for(const failure of [undefined,8])records.push(run(f,warm,failure));
 const objectives:ObjectiveSpec[]=[{kind:'safe'},{kind:'none'},{kind:'clear',need:[3,6],adopt:false},{kind:'waves',waves:3},{kind:'escape',interval:[4,7]},{kind:'spawners',spawnerId:'skeleton_warrior',count:[2,3]},{kind:'boss',id:'skeleton_warrior',promote:{rarity:'rare',stacks:2}},{kind:'beacon',count:3},{kind:'rifts',count:[2,3]},{kind:'pyres',count:[2,3]},{kind:'unearth',count:[2,3]},{kind:'leyline',id:'skeleton_warrior'},{kind:'procession'},{kind:'bounty',count:[2,3]},{kind:'offering',need:[3,6]},{kind:'puzzle',puzzle:'charged_lattice'},{kind:'lair',lairId:'native-birth-probe',title:'Native birth probe'},{kind:'package',pkg:'native-birth-probe',key:'native-birth-probe',title:'Native birth probe'},{kind:'venture',venture:'native-birth-probe',key:'native-birth-probe',title:'Native birth probe'}];
 for(const objective of objectives)for(const warm of [false,true])records.push(run(fixtures[0],warm,undefined,objective));
 for(const solved of ['ledger','memory'] as const)records.push(run(fixtures[0],true,undefined,{kind:'puzzle',puzzle:'charged_lattice'},solved));
 }const payload=JSON.stringify(records),report={courseHashes:records.map(r=>createHash('sha256').update(JSON.stringify(r)).digest('hex')),courses:records.length,bodies:records.reduce((n,r)=>n+r.made.length,0),partialErrors:records.filter(r=>r.error).length,bytes:Buffer.byteLength(payload),hash:createHash('sha256').update(payload).digest('hex')};
 if(process.env.NATIVE_BIRTH_RECORD)fs.writeFileSync(process.env.NATIVE_BIRTH_RECORD,payload);
 console.log('NATIVE_COMPLETE_BIRTH='+JSON.stringify(report));
}else{
 const results=[];for(const mode of ['archive','current','local']){
  const child=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs',fileURLToPath(import.meta.url),'--birth-lane='+mode],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:240000});assert.equal(child.status,0,mode+' '+child.stderr.slice(-4500)+' '+child.stdout.slice(-1500));
  const line=child.stdout.split(/\r?\n/).find(s=>s.startsWith('NATIVE_COMPLETE_BIRTH='));assert(line);results.push(JSON.parse(line.slice('NATIVE_COMPLETE_BIRTH='.length)));
 }
 for(let lane=1;lane<results.length;lane++)for(let i=0;i<results[0].courses;i++)assert.equal(results[lane].courseHashes[i],results[0].courseHashes[i],'lane '+lane+' course '+i);
 assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);delete results[0].courseHashes;
 console.log('PASS complete native birth original/current/local cold courses',JSON.stringify(results[0]));
}
