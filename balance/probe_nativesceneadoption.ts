import assert from 'node:assert/strict';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import ts from 'typescript';import {createHash} from 'node:crypto';
import '../src/sim/arena';
import {installHeadlessShims} from '../src/sim/shims';
import {registerAllPackageFactions} from '../src/packages/factionGen';
import {validateContent} from '../src/data/validate';
import {makeAccount} from '../src/meta/account';import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';import type {ZoneDef,ObjectiveSpec} from '../src/data/zones';
import {World,type FractureRun} from '../src/engine/world';
import {Rng,withSeededRandom} from '../src/core/rng';import {clearSeaMemo} from '../src/world/seas';
import {resetActorIdCounter} from '../src/engine/actor';
import {captureNativeGeographySource} from '../src/world/captureGeography';import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import * as objectives from '../src/data/objectives';
import {NativeAreaSceneAdoption} from '../src/worldmass/nativeAreaSceneAdoption';
import {serializeNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
function naturalWorld(index:number){
  const account=makeAccount(),manifest=buildManifest(account,991),w:any=new World(account,Object.freeze(manifest));
  w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
  const source=createNativeGeographyReader(captureNativeGeographySource(991));
  const spec=makeMassNativeGeographySpec(source.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'});
  const mapping=new MassNativeGeography(spec),target=index===0?{x:-55,y:160}:{x:-35,y:1280},request=mapping.ownerContext('native-source-course/'+index,mapping.physicalAnchor(target));
  const z=placeZoneAt(request.requestedTarget,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:source.biomeAt,biomeDepthFor:source.biomeDepth,climateFor:source.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});
  w.zoneMap[z.id]=z;return {w,z,manifest,request};
}
// Full six-function archive pinned before extraction; no Git or scratch-file dependency.
const archiveBytes=gunzipSync(Buffer.from('H4sIAAAAAAAACsVYbXPbNhL+nl+x9bQROZVp+TU2FdmjOm6SS+pkYredaZK7QsRSREUBHAC06tieuU/9AZ37hf0lNwuAEiU7Oedeev5iClgsFrvP7j7A1QOAtUrItRTWsPcoz3b3Rtn+aHN3e3d7Z4T7B9vI873NPba5t709ynr5/n5vrUuLjKp1hs+YKWgtz7dwd/vR1ub+/v4W4g7u7m0fHDzCrLe1s7OT7e5s7Wxmo4PRiO892uKj3V628wgPNvc2d3ubj/KtLa8zr2VmhZJmLYWrBwAAawUzxZnVtEczC2EsMikYq4UcxynIejpCDVfvJECJFgoYQO/X/c3N7IBnu30azpWGiOYEzfVBwGMwSYlybIs+iK+/juEKCvjrAEySFUwfK45DG4m477R9x2yRiGldRkUXer/2Nnu93ubBdtyHG9Ku0dZaQgGHh4fQ67+TN+5MAGtTdjnC1yybsDEOzWTpKCtzEWnimKfwk5L4BPMuDYyYxhRejX7BzIoLPKswc+MzpUuewo/0r/tOxisycA2yLkvvE3f4TEljQasZqByq+a5v1MxEcewFAbzUBC9hQLKJsUxyIceR269L9sV9LypyiL6Y4GVMi6yQNfbbOshtTbB+/vJq+OTV6/O/HX/7NDGstDdpNRmnX17RFtVkfJN+ecUxTwRvvgwih6Mj6NHABC9vfm5vS05JGFeVhS8GA7C6Rnj4EKICvgIKTS+GDf8BhwOIaJesYDJDUrmwJHjh2E3Ft84RonoFEyF5Cp0g3ukCGQ/B9i55qwtW2BL9oPuEG6elDQ8KyC1s/IDS1vpubCzm/kxsXMx3/X9h4wJlwMYCEH8yNIIT7guNIN7pNt7zSBD8I+houcxJxPeAS1V/+FBSWLxRS3BZmYuWoELbpvC6EXmjZis10wdldHluYEAmJVaUaNB7sJYccyHJ5+3Ucdr8bt9cnnv5t6217yFdLO23juW2WVXsBtOlcKyKtKbSjxgS3668zaHvKLzN1N25VbJLVdsUXots8vgpStTMIn/pRrvQ4Upxxk0HrqFTMsmnTE/OKjaTpnP4idz83DLdilk7E116eQuTYEli1BQjDoND4AmhEgYDn6ZeoI1hUrGxAVIBV0p36YOZSUs14Sd41lBevH0fe/2a9OtELLR7qSXtGxtw/uwETl+tH786/cv3b07g5fDHz2kN9Yd7pf9/kPd35ItLk3s0AbeSeoD7SFtOuG/JH5KVcxg49vVrpbSFZYAui/1vUOrK0NE9WwXRJxUqhGqk+s2MxgvUFvlHNAwaX0CDj2fD0yfr3wyPX6TAwFg2rZA3xITwCBrXL1gpOLNoQFgD4xqNBdrnEkrFeELaKPhqgfh5l15OFnfQeCksIQUqjQapqmhkHArUCBFz6Ru8C5VWI4zhj7//A2yB3lRwzc+0UU05O1hmVpEihtCGKQk9fPjR9umOoBLXEVZtpb29B/zeziDBcVopi9L6Pci3c7kScwu1ZNLMUCOHSGmYMQMaq5JlyOPUKXVnzShIfkvTBSb5XB+JaFKn8vDNOCEUfLaxXKMpnDEMJM7C3kq6kKmZhEwJmXh1BJ8GKDBYZFVWItOddgIFkHw7fP4Shm++6xgXcShYmbfxEtrt3Xi5QM1FZoO6Fm6g0zi/Q0eFzkzJDoyULaBQJW+FOWIwU3J9VNv1Wo6YnCBv1PExQqamVYm0n5JuFdfiAnXHQC60sZBrNsU+EJ5oKXxQEmGCWDkDgybJptisr5jEuA+dUhnbcU5V2ntdzUgrG2mRwZjU5FpNwRbC+Cwm4aCwcPCgVeSWEcsmYNVyqF2I/0Vog7YQ4IgEcibKlteFNVjmIMm15H6V56hNChk5l7Ps0mkk55SXQRtpOTsfnj55fvqUfGzRnZJiPR8+fnV6/mZ4fE5O+aHNRuc5E9+Z+g0Lu2/qB2/+dxJ/iTZHqmGQH0n+C4GzJRLokz4JkHU9zIMgXukln51Gr2R56ez/ZvjmBLQqSwo3k6AuUGvB0a32CVzbQlGlYGZigDxhSAjFWM4d/sWiXTcKTCJkVtYcTQhHDNfXrk2YCjPByvkZGqP7d4UvWE9dWyWsLEmJSiT1+2Uy6MZzzbLl8fhT2xhk5V1qfBGj/XNWGrxLRfDjjwWzwDJbs7K89GA96zZZiDBuum+DHlZSlkYVJQpnlnnMesiEBLFoUnB9no1KPG4G376HAbx931/Ic5TEzZ2xT1B+p2pbvBCSmyhuSRlE6Uap2+IMztA+9o8kh0GuRTE5oWCZQ67c9Eom9HPuGr40yRht5Jnl0iUvCF1fL3ZPCmYa0Vt8aiHFOF9RuPBKUtWmiK6CCfP7kzv/ubtA+Zm4C1PFMYUOR9mhH8ExacOCb+JFMgQvEQFC/rztpigKnlhmSQ33nbIqMkR9TSJ43HY5tfsVTY47s2xijhIX1raSipRUCyW3Kb874rNa2rsoP1WOiZCeiwtH9hencW4nzStcXCpbCDkm5cIula+NDXghqO8QsEujwFUDAjP1qY7v3pVrH+4gM1WXHEpkk6a5zPXQgvUZLY/ereVYlqHdjqWrN6E5qpk079Z8RTVW15mttcsmqagH5cRSkqV6uXrc4O+7zvppDHmi/nE8LWYXmCpqaTtdKo9+9UTIJTyRja39/GviPGJUek9PCPDctUxf2CvUzlmeehE16tJX6P4imzjnOCqict+VDZviXCVdkZC76xNEUoGWY3IlsilM1QWafovnUEvmSIzEwOjS4rrgKK3IyOVx8hk3snvewdrV1F3Arq/vvIA9bt3f/ZV+7rSlABqlbRSxLoxiin3EQoTgMYyazyNY34QU5lOH7Sma6cWNifOcJS8PWhu9dc+7eamUjorGyhi+glvBfT9XFdoE6UoILr6FURVqJACOFp2ZTOp051h0y1bA6Mbc91IdCzuE3x54/i/9t9U7RLsBB+lwqJtV8v16ePxi+PQEjl8Oz87AMlFCtPJoHQfi3xCzwP6JQ1o2ccWkoZFm4nggzBzVImCThZCVzBg0YKxSRDxcDWFESx1aYYTMGmBecbuH+p0Ggf0e3XpO97SqC4H/pQsCRVj16powul/ty+kPJ6fn9HJx6+gLPnrr6DMhJdXJdaXXS2XoM2hs+PKM0bVkhIUI5Nvta1J/uyUuHK52NDcrVImgaxk8xoIyt6ZjaDuuZiAMSDWjPR0N78KIuEdBnLZh9YJzesjx5jYkubl9LLh6xiScnD4h71uq2hUTHGq5zswEeZdOWrJ6XFjUcddbr9lFuM4EZblyvClxl9Cp0nShsQKl7YaAW9T+JlFpzJC7i3fJZqnHwh+//R4UNe8Af/z2+9x79B2em1owaGZXgNB6O/80EBqe3kAh/G6D4fX3P/308q40aF6RFneEcFzg5H8KN7wcnp2n8+BVzJh5mnwiiHNQ+eDBWKtacu/rJOiKzuji6DpBq+aTJUGaDEKmS4F3pxlx1wYFSl6gHi8ustR05k1rVqC/4wlLpuZCuq5NAaipHSXxIh7B4MHqK6uLQhleplTcfhIOS46O2qz7Zu0BwM2Dm38C+GvgMaYcAAA=','base64'));
assert.equal(createHash('sha256').update(archiveBytes).digest('hex'),'f72ecf4cecfa2b0dbbf3dc74ca9479b671b9ee2bc81316a367c6a3ecc044ebd2');
const archived=JSON.parse(archiveBytes.toString('utf8')) as {pin:string;sourceHash:string;functions:Record<string,string>};
const currentSource=fs.readFileSync('src/data/objectives.ts','utf8');
const currentFile=ts.createSourceFile('objectives.ts',currentSource,ts.ScriptTarget.Latest,true);
const emitFunctions=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
for(const [name,source] of Object.entries(archived.functions)){
 const actual=currentFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(actual,'missing original function '+name);
 assert.equal(emitFunctions(actual.getText(currentFile)),emitFunctions(source),'unchanged runtime source '+name);
}
const bindings=['ADOPT_CFG','adoptDenMouthKinds','adoptHuntRows','adoptTitle','packageAskRow','packageAskRows','ventureAskRow','ventureAskRows','puzzleAskRows'];
const code=ts.transpileModule(Object.values(archived.functions).join('\n').replace(/export function/g,'function')+'\nreturn maybeAdoptObjective;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const original=Function(...bindings,code)(...bindings.map(k=>(objectives as unknown as Record<string,unknown>)[k])) as typeof objectives.maybeAdoptObjective;
installHeadlessShims();registerAllPackageFactions();validateContent();
const rows=[...objectives.packageAskRows(),...objectives.ventureAskRows()];
assert.deepEqual(objectives.packageAskRows().map(r=>r.pkg),['fractures']);assert.deepEqual(objectives.ventureAskRows().map(r=>r.id),['holdfast']);
const receipts:unknown[]=[];let pairs=0,reads=0;
function compare(w:any,z:ZoneDef,layout:any,label:string,expected?:string,failAt?:number){
 const actualSim=w.sim,actualExits=w.exits,actualRun=w.fractureView() as FractureRun|null;
 const campaign={sim:actualSim},scene={zone:z,actors:w.actors,player:w.player},geometry={state:scene,exits:actualExits},state={fractureRun:actualRun};
 const owner=new NativeAreaSceneAdoption({scene,geometry,campaign,state});assert.strictEqual(owner.context.fractureView(),actualRun);
 const before=serializeNativeAreaData({objective:z.objective,exits:z.exits,fracture:actualSim.fractureField?.snapshot(),holdfast:actualSim.holdfastField?.snapshot()});
 const attempt=(local:boolean)=>{
  const tape:unknown[]=[],restore:(()=>void)[]=[];let calls=0,error:string|undefined,result:unknown,views:unknown;
  const define=(o:object,k:string,d:PropertyDescriptor)=>{const prior=Object.getOwnPropertyDescriptor(o,k);Object.defineProperty(o,k,{configurable:true,...d});restore.push(()=>{if(prior)Object.defineProperty(o,k,prior);else delete (o as Record<string,unknown>)[k];});};
  for(const row of rows)for(const key of ['standing','view','title']){const fn=(row as any)[key];if(typeof fn!=='function')continue;define(row,key,{get(){tape.push(['row-select','pkg' in row?row.pkg:row.id,key]);return function(this:unknown,...args:unknown[]){assert.strictEqual(this,row);tape.push(['row-call','pkg' in row?row.pkg:row.id,key,args.slice(1).map(a=>a===z?'definition':a)]);return fn.apply(this,args);};}});}
  for(const [field,name,methods] of [[actualSim.fractureField,'fracture',['fractureIn']],[actualSim.holdfastField,'holdfast',['infoFor','def']]] as const){if(!field)continue;for(const key of methods){const fn=field[key];define(field,key,{get(){tape.push(['field-select',name,key]);return function(this:unknown,...a:unknown[]){assert.strictEqual(this,field);tape.push(['field-call',name,key,a]);const value=fn.apply(this,a);if(++calls===failAt)throw Error('source callback '+failAt);return value;};}});}}
  const get=(label:string,value:unknown)=>({get(){tape.push(['read',label]);return value;}});
  if(local){define(campaign,'sim',get('sim',actualSim));define(geometry,'exits',get('exits',actualExits));define(state,'fractureRun',get('fractureRun',actualRun));
   for(const key of ['zone','actors','player','sim','exits','fractureRun','fractureView'])define(w,key,{get(){throw Error('foreign standing World '+key);}});
  }else{define(w,'sim',get('sim',actualSim));define(w,'exits',get('exits',actualExits));define(w,'fractureRun',get('fractureRun',actualRun));}
  const next=Rng.prototype.next,random=Math.random;Rng.prototype.next=()=>{throw Error('adoption consumed native RNG');};Math.random=()=>{throw Error('adoption consumed ambient RNG');};
  try{
   result=local?owner.maybeAdoptObjective(z,layout):original(z,layout,w);
   const context=local?owner.context:w;
   views={packages:objectives.packageAskRows().map(row=>{const key=row.standing(context,z);return {pkg:row.pkg,key,view:row.view(context,z,key??'missing')};}),
    ventures:objectives.ventureAskRows().map(row=>{const key=row.standing(context,z);return {id:row.id,key,title:row.title(context,z,key??'missing'),view:row.view(context,z,key??'missing')};})};
  }catch(e){error=(e as Error).message;}finally{Rng.prototype.next=next;Math.random=random;for(const undo of restore.reverse())undo();}
  return {result,views,error,tape,calls};
 };
 const a=attempt(false),b=attempt(true);assert.equal(serializeNativeAreaData(b),serializeNativeAreaData(a),label);
 if(failAt)assert.equal(a.error,'source callback '+failAt,'real source failure reached');else assert.equal(a.error,undefined,label);
 if(expected)assert.equal((a.result as any)?.kind??'none',expected,label+' decisive kind');
 assert.equal(serializeNativeAreaData({objective:z.objective,exits:z.exits,fracture:actualSim.fractureField?.snapshot(),holdfast:actualSim.holdfastField?.snapshot()}),before,'read-only native state '+label);
 pairs++;reads+=b.tape.length;receipts.push({label,result:a.result,views:a.views,error:a.error,reads:b.tape.length});
 return a;
}
for(const index of [0,1]){
 clearSeaMemo();resetActorIdCounter();withSeededRandom(991,()=>{
  const {w,z,request}=naturalWorld(index);let layout:any,rolled:ObjectiveSpec|undefined;const birth=w.runNativeAreaBirth;
  w.runNativeAreaBirth=function(...a:any[]){layout=a[1];rolled=structuredClone(a[0].objective);return birth.apply(w,a);};w.loadZone(z.id);assert.ok(layout);assert.ok(rolled);
  z.objective=rolled!;compare(w,z,layout,'natural/'+index);console.log('natural',JSON.stringify({index,seed:request.requestedSeed,face:z.tileset,objective:rolled,doodads:layout.doodads.length,exits:w.exits.length}));
  const ff=w.sim.fractureField,hf=w.sim.holdfastField;assert.ok(ff&&hf);
  assert.equal(ff.devIgnite(w.devOverlayView(),z.id),true);w.placeFractureContent(z);assert.ok(w.fractureView());
  compare(w,z,layout,'installed-origin-native-ask/'+index);
  const pkg=objectives.packageAskRow('fractures')!,guest=ff.fractureIn(z.id)!;
  z.objective={kind:'package',pkg:'fractures',key:guest.id,title:pkg.title};compare(w,z,layout,'package-holds/'+index,'none');
  for(const phase of ['fissure','chasm','done'] as const){w.fractureView().phase=phase;if(phase==='chasm')w.fractureView().chasm={x:333,y:444};compare(w,z,layout,'package-view-'+phase+'/'+index,'none');}
  z.objective={kind:'package',pkg:'fractures',key:'stale-key',title:pkg.title};compare(w,z,layout,'package-replacement/'+index);
  ff.endFracture();compare(w,z,layout,'package-gone/'+index);
  z.objective=rolled!;
  const info=hf.devForce(z);assert.ok(info);w.rollHoldfast(z);w.exits=z.exits.map((e:any,i:number)=>w.placeExit(e,i));assert.equal(info.exitAppended,true);
  compare(w,z,layout,'installed-holdfast-native-ask/'+index);
  const key=info.lockId+':'+info.defId,title=hf.def(info.defId).name;
  z.objective={kind:'venture',venture:'holdfast',key,title};compare(w,z,layout,'venture-standing/'+index,'none');
  compare(w,z,layout,'venture-source-throw1/'+index,undefined,1);compare(w,z,layout,'venture-source-throw3/'+index,undefined,3);
  hf.unlock(z.id);compare(w,z,layout,'venture-won/'+index,'none');
  const snap=hf.snapshot();const row=snap.infos.find((r:any)=>r[0]===z.id);row[1].locked=true;row[1].resolved='sealed';hf.restore(snap);hf.markFailed(z.id);compare(w,z,layout,'venture-lost/'+index);
  z.objective={kind:'venture',venture:'holdfast',key:'stale-key',title};compare(w,z,layout,'venture-stale/'+index);
  z.objective={kind:'venture',venture:'uninstalled',key,title};compare(w,z,layout,'venture-uninstalled/'+index);
  // Explicit branch controls complement unchanged natural whole layouts. They
  // author a bare ask only for precedence, and never pretend to be a mint.
  const clean={doodads:[],landmarkSpawns:[]};z.objective={kind:'clear',adopt:true};row[1].locked=true;row[1].resolved='sealed';hf.restore(snap);
  const puzzle=objectives.puzzleAskRows()[0];assert.ok(puzzle);z.puzzles=[...(z.puzzles??[]),{id:puzzle.puzzle,chance:1}];
  const riddle={doodads:[{kind:puzzle.doodad,pos:{x:90,y:100},radius:15}],landmarkSpawns:[]};
  compare(w,z,riddle,'precedence-venture/'+index,'venture');
  assert.equal(ff.devIgnite(w.devOverlayView(),z.id),true);compare(w,z,riddle,'precedence-package/'+index,'package');
  const mouth=objectives.adoptDenMouthKinds().keys().next().value!;assert.ok(mouth);compare(w,z,{...riddle,doodads:[...riddle.doodads,{kind:mouth,pos:{x:50,y:50},radius:26}]},'precedence-lair/'+index,'lair');
  ff.endFracture();hf.markFailed(z.id);compare(w,z,riddle,'precedence-puzzle/'+index,'puzzle');compare(w,z,clean,'no-candidate/'+index,'none');
  for(const objective of [{kind:'clear',need:3},{kind:'clear',adopt:false},{kind:'clear',seal:true},{kind:'boss',id:'skeleton_warrior'}] as ObjectiveSpec[]){z.objective=objective;compare(w,z,riddle,'authored-'+JSON.stringify(objective)+'/'+index,'none');}
 });
}
console.log('PASS local adoption original/installed comparisons',JSON.stringify({pairs,reads,pin:archived.pin}));

function bindingControls(){
 const scene={zone:{} as ZoneDef,actors:[],player:{} as any},geometry={state:scene,exits:[]},campaign={sim:{fractureField:null,holdfastField:null}},state={fractureRun:null};
 const input={scene,geometry,campaign,state};let refusals=0;
 for(const key of Object.keys(input)){let reads=0;const bad={...input};Object.defineProperty(bad,key,{get(){reads++;throw Error('binding getter executed');}});assert.throws(()=>new NativeAreaSceneAdoption(bad));assert.equal(reads,0);refusals++;}
 assert.throws(()=>new NativeAreaSceneAdoption({...input,geometry:{...geometry,state:{...scene}}}));refusals++;
 let reads=0;const badGeometry={...geometry};Object.defineProperty(badGeometry,'state',{get(){reads++;return scene;}});assert.throws(()=>new NativeAreaSceneAdoption({...input,geometry:badGeometry}));assert.equal(reads,0);refusals++;
 assert.throws(()=>new NativeAreaSceneAdoption({...input,state:{} as any}));refusals++;
 const raw={...input},owner=new NativeAreaSceneAdoption(raw);raw.campaign={sim:{fractureField:null,holdfastField:null}};raw.geometry={...geometry,exits:[]};raw.state={fractureRun:null};
 assert.strictEqual(owner.input.campaign,campaign);assert.strictEqual(owner.input.geometry,geometry);assert.strictEqual(owner.input.state,state);
 for(const key of ['input','context']){assert.equal(Object.getOwnPropertyDescriptor(owner,key)?.enumerable,false);assert.equal(Object.getOwnPropertyDescriptor(owner,key)?.writable,false);assert.equal(Object.getOwnPropertyDescriptor(owner,key)?.configurable,false);}
 assert.ok(Object.isFrozen(owner.input)&&Object.isFrozen(owner.context));
 const sim={fractureField:null,holdfastField:null};campaign.sim=sim;assert.strictEqual(owner.context.sim,sim);
 const exits:any[]=[];geometry.exits=exits as never[];assert.strictEqual(owner.context.exits,exits);
 const run={id:'live-marker'} as FractureRun;(state as {fractureRun:FractureRun|null}).fractureRun=run;assert.strictEqual(owner.context.fractureView(),run);
 assert.throws(()=>owner.maybeAdoptObjective({...scene.zone} as ZoneDef,{doodads:[],landmarkSpawns:[]}),'foreign source definition');
 return {refusals,rootIsolation:true,liveReads:3,hiddenFrozenIdentity:true};
}
function rowSelectionControls(){
 let pairs=0;const row=objectives.ventureAskRow('holdfast')!,descriptor=Object.getOwnPropertyDescriptor(row,'view')!;
 try{for(const failure of ['none','selection','argument','callback']){
  const attempt=(local:boolean)=>{
   const tape:unknown[]=[],objective:any={kind:'venture',venture:'holdfast',title:'native provider',get key(){tape.push('key');Object.defineProperty(row,'view',{configurable:true,value(){throw Error('late callback must not win');}});if(failure==='argument')throw Error('argument');return 'k';}};
   const zone={objective} as ZoneDef,scene:any={zone,actors:[],player:{}},geometry={state:scene,exits:[]},campaign={sim:{fractureField:null,holdfastField:null}},state={fractureRun:null};
   const owner=new NativeAreaSceneAdoption({scene,geometry,campaign,state});
   Object.defineProperty(row,'view',{configurable:true,get(){tape.push('select');if(failure==='selection')throw Error('selection');return function(this:unknown,context:unknown,def:unknown,key:unknown){tape.push(['invoke',this===row,def===zone,key,context===owner.context]);if(failure==='callback')throw Error('callback');return {verdict:'standing',pos:null,label:'live'};};}});
   let value:unknown,error:unknown;try{value=local?owner.maybeAdoptObjective(zone,{doodads:[],landmarkSpawns:[]}):original(zone,{doodads:[],landmarkSpawns:[]},owner.context);}catch(e){error=(e as Error).message;}
   return {value,error,tape};
  };assert.deepEqual(attempt(true),attempt(false),'selected row callback '+failure);pairs++;
 }}finally{Object.defineProperty(row,'view',descriptor);}
 return {pairs};
}
const binding=bindingControls(),selection=rowSelectionControls();console.log('PASS binding/row controls',binding,selection);

// Independently authored installed-row, alias, throw and deferred-binding controls.
function independentAdoptionControls(){
const pkg:any=objectives.packageAskRow('fractures'),ven:any=objectives.ventureAskRow('holdfast');assert(pkg&&ven);
const rows=[pkg,ven];let pairs=0,throws=0,refusals=0;const receipts:any[]=[];
const next=Rng.prototype.next,random=Math.random;
Rng.prototype.next=()=>{throw Error('independent adoption RNG consumption');};Math.random=()=>{throw Error('independent adoption ambient consumption');};
try{
 for(const lane of ['authored-layout-gate','layout-getter','package-standing-select','package-standing-call','package-key-after-call','package-live-receiver','venture-title-select','venture-title-call','hunt-kin-alias','fracture-state-view'] as const){
  function attempt(local:boolean){
   const tape:any[]=[],restore:(()=>void)[]=[];let value:any,error:any;
   const set=(obj:any,key:string,d:PropertyDescriptor)=>{const old=Object.getOwnPropertyDescriptor(obj,key);Object.defineProperty(obj,key,{configurable:true,...d});restore.push(()=>{if(old)Object.defineProperty(obj,key,old);else delete obj[key];});};
   const z:any={id:'independent-adoption-zone',seed:713,level:7,exits:[],objective:{kind:'clear',adopt:true}},layout:any={doodads:[],landmarkSpawns:[]};
   const scene:any={zone:z,actors:[],player:{}},geometry:any={state:scene,exits:[]},state:any={fractureRun:null},campaign:any={sim:{fractureField:null,holdfastField:null}};
   const owner=new NativeAreaSceneAdoption({scene,geometry,state,campaign});
   // These are explicit callback-order/failure controls, not native frequency or
   // fabricated working campaign providers. Original and local use the SAME row.
   for(const row of rows)for(const key of ['standing','title','view'])if(typeof row[key]==='function'){
    const fn=row[key];set(row,key,{get(){tape.push(['select',row.pkg??row.id,key]);return function(this:unknown,...args:unknown[]){assert.equal(this,row);tape.push(['call',row.pkg??row.id,key,args[0]===owner.context,args[1]===z]);return fn.apply(this,args);};}});
   }
   if(lane==='authored-layout-gate'||lane==='layout-getter')set(layout,'doodads',{get(){tape.push('layout.doodads');throw Error('layout getter');}});
   if(lane==='authored-layout-gate')z.objective={kind:'clear',need:3};
   if(lane.startsWith('package-')){
    z.objective={kind:'package',pkg:'fractures',title:'fracture',get key(){tape.push('stamp.key');if(lane==='package-key-after-call')throw Error('stamp key');return 'retained';}};
    set(pkg,'standing',{get(){tape.push('standing.selected');if(lane==='package-standing-select')throw Error('standing selection');return function(this:unknown,context:unknown,def:unknown){assert.equal(this,pkg);assert.equal(context,owner.context);assert.equal(def,z);tape.push('standing.called');if(lane==='package-standing-call')throw Error('standing call');return 'retained';};}});
   }
   if(lane.startsWith('venture-title')){
    set(pkg,'standing',{value(){tape.push('package-declines');return null;}});
    set(ven,'standing',{value:function(this:unknown,c:unknown,d:unknown){assert.equal(this,ven);assert.equal(c,owner.context);assert.equal(d,z);tape.push('venture-standing');return 'native-control';}});
    set(ven,'title',{get(){tape.push('title-selected');if(lane==='venture-title-select')throw Error('title selection');return function(this:unknown){assert.equal(this,ven);tape.push('title-called');throw Error('title call');};}});
   }
   let kin:readonly string[]|undefined;
   if(lane==='hunt-kin-alias'){const hunt=objectives.adoptHuntRows()[0];assert(hunt);kin=hunt.kin;layout.landmarkSpawns=[{id:kin[0],pos:{x:0,y:0}}];}
   if(lane==='fracture-state-view')set(state,'fractureRun',{get(){tape.push('fractureRun');throw Error('local fracture view');}});
   try{
    if(lane==='fracture-state-view')value=pkg.view(owner.context,z,'missing');
    else value=local?owner.maybeAdoptObjective(z,layout):original(z,layout,owner.context);
    if(kin){assert.equal(value?.kind,'lair');assert.equal(value.kin,kin);}
   }catch(e){error=(e as Error).message;}
   finally{for(const f of restore.reverse())f();}
   return{value,error,tape,kinAlias:kin?value?.kin===kin:undefined};
  }
  const a=attempt(false),b=attempt(true);assert.deepEqual(b,a,lane);if(a.error)throws++;pairs++;receipts.push({lane,...a});
 }
 const scene:any={zone:{objective:{kind:'clear'}},actors:[],player:{}},geometry={state:scene,exits:[]},state={fractureRun:null},campaign={sim:{fractureField:null,holdfastField:null}},input={scene,geometry,state,campaign};
 for(const key of Object.keys(input))for(const kind of ['missing','inherited','accessor']){const bad:any={...input},value=bad[key];delete bad[key];let reads=0;if(kind==='inherited')Object.setPrototypeOf(bad,{[key]:value});if(kind==='accessor')Object.defineProperty(bad,key,{get(){reads++;return value;}});assert.throws(()=>new NativeAreaSceneAdoption(bad),/own object binding/);assert.equal(reads,0);refusals++;}
 const stateDescriptor=Object.getOwnPropertyDescriptor(state,'fractureRun')!;let viewReads=0;Object.defineProperty(state,'fractureRun',{get(){viewReads++;throw Error('deferred state');},configurable:true});const owner=new NativeAreaSceneAdoption(input);assert.equal(viewReads,0);assert.throws(()=>owner.context.fractureView(),/deferred state/);assert.equal(viewReads,1);Object.defineProperty(state,'fractureRun',stateDescriptor);refusals++;
 const watched:any={...scene};Object.defineProperty(watched,'zone',{get(){throw Error('owner identity read');}});const owner2=new NativeAreaSceneAdoption({...input,scene:watched,geometry:{...geometry,state:watched}});assert.throws(()=>owner2.maybeAdoptObjective(scene.zone,{doodads:[],landmarkSpawns:[]}),/owner identity read/);refusals++;
 console.log('PASS independent objective adoption',JSON.stringify({pairs,throws,refusals}));
}finally{Rng.prototype.next=next;Math.random=random;}

}
independentAdoptionControls();
