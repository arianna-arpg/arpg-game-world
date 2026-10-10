/** Real campaign tickets consumed by newly constructed native area owners. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import '../src/sim/arena';
import {installHeadlessShims} from '../src/sim/shims';
import {registerAllPackageFactions} from '../src/packages/factionGen';
import {validateContent} from '../src/data/validate';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {World} from '../src/engine/world';
import {Actor,resetActorIdCounter} from '../src/engine/actor';
import {Rng,withSeededRandom} from '../src/core/rng';
import {vec,angleTo,rand} from '../src/core/math';
import {featuresInRect,atlasSeedInstalled} from '../src/world/atlas';
import {landmarkComplexes} from '../src/world/landmarkComplexes';
import {clearSeaMemo} from '../src/world/seas';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSourceSession,type NativeAreaSource} from '../src/worldmass/nativeAreaSourceSession';
import {serializeNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import {completeBirthRoots} from './nativeSceneBirthFixture';
import {nativeGraphArchiveGzip} from './nativeGraphArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const archive=JSON.parse(gunzipSync(Buffer.from(nativeGraphArchiveGzip,'base64')).toString());
const arrivalTail=Function('vec','angleTo','rand',emit('return function(def,zoneId,firstVisit,from,isCave){'+archive.arrivalTail+'}'))(vec,angleTo,rand);
const lane=process.argv.find(s=>s.startsWith('--assembly-lane='))?.split('=')[1];
installHeadlessShims();registerAllPackageFactions();validateContent();
function natural(index:number){
 const account=makeAccount(),w:any=new World(account,Object.freeze(buildManifest(account,991)));
 w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
 const reader=createNativeGeographyReader(captureNativeGeographySource(991));
 const mapping=new MassNativeGeography(makeMassNativeGeographySpec(reader.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'}));
 const kinds=new Set(landmarkComplexes().map(d=>d.id));
 const site=index===2?featuresInRect({x:-6000,y:-6000},{x:6000,y:6000}).find(f=>kinds.has(f.kind)):undefined;
 if(index===2)assert.ok(site);
 const target=index===0?{x:-55,y:160}:index===1?{x:-35,y:1280}:site!.seat;
 const request=mapping.ownerContext('native-source-course/'+index,mapping.physicalAnchor(target));
 const z=placeZoneAt(target,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:reader.biomeAt,biomeDepthFor:reader.biomeDepth,climateFor:reader.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});
 w.zoneMap[z.id]=z;return {w,z,mapping};
}
function debugValue(root:any){const seen=new Map<object,number>();const f=(v:any):any=>{if(v instanceof Actor)return {actor:v.id};if(typeof v==='function')return 'function';if(v===undefined)return 'undefined';if(!v||typeof v!=='object')return v;if(seen.has(v))return {ref:seen.get(v)};seen.set(v,seen.size);if(v instanceof Map)return {map:[...v].map(([k,x])=>[f(k),f(x)])};if(v instanceof Set)return {set:[...v].map(f)};if(ArrayBuffer.isView(v))return Array.from(v as any);return Object.fromEntries(Object.keys(v).map(k=>[k,f(v[k])]));};return f(root);}
function digest(root:any){
 const ports=new Set((root.theater?.theaterRuns??[]).map((r:any)=>r.world));
 // Only cache epoch ORIGINS differ between a fresh owner and a reused World.
 // Keep every cache object/alias/content and its revision relative to current scenery.
 const g=root.geometry,epoch=g?.doodadsRev??0;
 const value=(v:any,k:string)=>{const x=v[k];return (v===g&&['doodadsRev','doodadIdxRev'].includes(k))||(v===g?.pitsCache&&k==='rev')||v===g?.famRevs?x-epoch:x;};
 const seen=new Map<object,number>();const visit=(v:any):any=>{
  if(v instanceof Actor)return {actor:v.id};
  if(v===undefined)return {undefined:true};if(typeof v==='function')return {function:true};
  if(typeof v==='number'&&!Number.isFinite(v))return {number:String(v)};if(!v||typeof v!=='object')return v;
  if(seen.has(v))return {ref:seen.get(v)};const id=seen.size;seen.set(v,id);
  if(v instanceof Map)return {id,map:[...v].map(([k,x])=>[visit(k),visit(x)])};
  if(v instanceof Set)return {id,set:[...v].map(visit)};
  if(ArrayBuffer.isView(v))return {id,type:v.constructor.name,data:Array.from(v as any)};
  return {id,type:Object.getPrototypeOf(v)?.constructor?.name??null,fields:(ports.has(v)?Object.keys(v).sort():Object.keys(v)).map(k=>[k,visit(value(v,k))])};
 };return hash(JSON.stringify(visit(root)));
}
if(lane){
 const receipts:any[]=[];
 for(const index of [0,1,2])for(const mode of ['fresh','remembered','held','holdfast']){
  clearSeaMemo();resetActorIdCounter(650000);
  receipts.push(withSeededRandom(991,()=>{
   const {w,z,mapping}=natural(index);
   if(mode==='remembered'){w.loadZone(z.id);for(const a of w.actors)if(a!==w.player&&a.fromZoneGen)a.life*=.57;w.captureZoneMemory();}
   const stop=Symbol();let args:any[]=[];w.runNativeAreaBoundaries=(...a:any[])=>{args=a;throw stop;};
   try{w.loadZone(z.id);}catch(e){if(e!==stop)throw e;}
   const notices:unknown[]=[];w.notice=(...a:any[])=>notices.push(['notice',a]);w.text=(...a:any[])=>notices.push(['text',a]);
   const raw=lane==='assembly'?freshAssemblyInput(w,z):null;
   if(raw){raw.campaign.notice=w.notice;raw.campaign.text=w.text;}
   const owner=raw?new NativeAreaSceneAssembly(raw):null,session=owner?.sourceSession(mapping),ticket=session?.issue(z.id);
   const campaign=raw?.campaign??w,geometry=owner?.input.geometry??w,scene=owner?.input.scene??w;
   if(mode==='held'){assert.ok(campaign.sim.crusadeField.devIgnite(owner?owner.input.coast.simView():w.simView(),z.id,180));}
   if(mode==='holdfast')assert.ok(campaign.sim.holdfastField.devForce(z));
   if(owner){
    for(const key of ['zone','actors','exits','doodads','walk','arena','runNativeLayoutGeneration','runNativeAreaLayout','runNativeAreaBirth','nativeAreaBirthHost','nativeSceneGraphHost'])
     Object.defineProperty(w,key,{configurable:true,get(){throw Error('Donor scene accessed '+key);},set(){throw Error('Donor scene accessed '+key);}});
   }
   const draws:number[]=[],next=Rng.prototype.next;Rng.prototype.next=function(){const n=next.call(this);draws.push(n);return n;};
   let generated:any,layoutHash='';
   if(owner){const generate=owner.generation.generate;owner.generation.generate=function(...args){return generated=generate.apply(this,args);};}
   try{
    if(!owner)(World.prototype as any).runNativeAreaBoundaries.call(w,...args);
    const prepare=(entry:any)=>{
     if(owner)owner.prepare(session!,ticket!,entry,args[1]);else generated=w.runNativeLayoutGeneration(z,entry,z.id);
     layoutHash=digest({layout:generated.layout,seed:geometry.currentZoneSeed,memory:generated.memory,rng:generated.rng.snapshot(),draws});
     return generated;
    };
    // The unchanged archived arrival code is a comparison harness only.
    // Production assembly leaves real player placement to its caller.
    const tail=owner?{get player(){return scene.player;},get actors(){return scene.actors;},set actors(v){scene.actors=v;},
     seats:campaign.seats,meta:campaign.meta,arena:geometry.arena,get exits(){return geometry.exits;},ambientCamShift:w.ambientCamShift,
     clampPos:geometry.clampPos.bind(geometry),endCarom:w.endCarom.bind(w),text:campaign.text,
     runNativeLayoutGeneration:(_def:any,entry:any)=>prepare(entry),
     runNativeAreaLayout:()=>{},runNativeAreaBirth:()=>owner.birth(),
    }:w;
    if(!owner){const gen=w.runNativeLayoutGeneration,adopt=w.runNativeAreaLayout;w.runNativeLayoutGeneration=(_def:any,entry:any)=>(generated=gen.call(w,z,entry,z.id));w.runNativeAreaLayout=(...a:any[])=>{adopt.apply(w,a);layoutHash=digest({layout:generated.layout,seed:geometry.currentZoneSeed,memory:generated.memory,rng:generated.rng.snapshot(),draws});};}
    arrivalTail.call(tail,z,z.id,args[1],null,false);
    if(owner){assert.equal(owner.phase,'born');assert.throws(()=>owner.birth(),/one prepared/);assert.throws(()=>owner.prepare(session!,ticket!,{x:0,y:0},true),/already started/);}
    const actors=scene.actors as Actor[];
    const queryDraws=draws.length;geometry.ensureDoodadIdx();geometry.zonePits();assert.equal(draws.length,queryDraws);
    assert.equal(geometry.doodadIdxArr,geometry.doodads);assert.equal(geometry.pitsCache.arr,geometry.doodads);
    assert.equal(geometry.doodadIdxRev,geometry.doodadsRev);assert.equal(geometry.pitsCache.rev,geometry.doodadsRev);
    const full=completeBirthRoots(w,owner?{input:owner.input,calls:notices} as any:null,notices);
    if(process.env.NATIVE_SOURCE_DEBUG)fs.writeFileSync('balance/reports/assembly-'+lane+'-'+index+'-'+mode+'.json',JSON.stringify(debugValue(full),null,2));
    return {index,mode,layoutHash,bodies:actors.length,owners:digest(full),
     bodyHash:digest(actors.map(a=>Object.fromEntries(Object.keys(a).map(k=>[k,(a as any)[k]])))),
     geometry:digest(Object.fromEntries(['doodads','walk','grounds','structures','caveEntrances','zoneHollows','openedHollows','exits','currentZoneSeed','farPointDraws','eventAnchors'].map(k=>[k,(geometry as any)[k]]))),
     graph:hash(serializeNativeAreaData(campaign.zoneMap)),notices:digest(notices),rng:generated.rng.snapshot(),draws:digest(draws),next:Math.random()};
   }finally{Rng.prototype.next=next;}
  }));
 }
 for(const failure of [false,true])receipts.push(frontierReceipt(lane,failure));
 console.log('ASSEMBLY_RECEIPT '+JSON.stringify(receipts));
}else{
 const functionBody=(path:string,name:string)=>{const sf=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);const fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration|undefined;assert.ok(fn?.body);return emit('function arena(def)'+fn.body.getText(sf));};
 assert.equal(functionBody('src/engine/nativeAreaArena.ts','makeNativeAreaArena'),functionBody('src/engine/world.ts','makeArena'),'whole original arena body must remain unchanged');
 const outputs:any[]=[];
 for(const selected of ['world','assembly']){
  const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--assembly-lane='+selected],{encoding:'utf8',maxBuffer:16e6});
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);const line=r.stdout.split(/\r?\n/).find(s=>s.startsWith('ASSEMBLY_RECEIPT '));assert.ok(line);outputs.push(JSON.parse(line.slice(17)));
 }
 fs.writeFileSync('balance/reports/native-area-assembly-comparison.json',JSON.stringify(outputs,null,2));
 assert.deepEqual(outputs[1],outputs[0],'newly constructed owners retain native layout, bodies, geometry, graph, notices and random continuation');
 console.log('PASS complete fresh-owner native source preparation',outputs[0].length,hash(JSON.stringify(outputs[0])));
 verifySources();
}
function frontierReceipt(lane:string,failure:boolean){return withSeededRandom(144,()=>{
 const {w,z,mapping}=natural(0),stop=Symbol();w.runNativeAreaBoundaries=()=>{throw stop;};try{w.loadZone(z.id);}catch(e){if(e!==stop)throw e;}
 const raw=lane==='assembly'?freshAssemblyInput(w,z):null,owner=raw?new NativeAreaSceneAssembly(raw):null,session=owner?.sourceSession(mapping),ticket=session?.issue(z.id);
 const c=raw?.campaign??w,g:any=owner?.graph??w;assert.ok(c.sim.holdfastField.devForce(z));g.rollHoldfast(z);
 let threw=false;if(failure){const chart=g.chartFrontier;g.chartFrontier=function(...args:any[]){chart.apply(g,args);throw Error('published frontier fault');};}
 try{if(session)session.chartNeighbors(ticket!);else g.chartNeighborsOf(z);}catch(e){assert.equal((e as Error).message,'published frontier fault');threw=true;}
 assert.equal(threw,failure);assert.ok(Object.values(c.zoneMap).some((v:any)=>v.pocket)||failure);
 const before=serializeNativeAreaData(c.zoneMap),allocator=c.nextGenId;
 if(!failure){if(session)session.chartNeighbors(ticket!);else g.chartNeighborsOf(z);assert.equal(serializeNativeAreaData(c.zoneMap),before);assert.equal(c.nextGenId,allocator);assert.ok(!z.exits.some((e:any)=>e.to==='?'));}
 return {course:'frontier',failure,graph:hash(before),allocator,overlays:hash(serializeNativeAreaData(c.sim.snapshotOverlays())),next:Math.random()};
 });}
function verifySources(){
 withSeededRandom(221,()=>{
  const {w,z,mapping}=natural(2),raw=freshAssemblyInput(w,z);raw.campaign.notice=()=>{};raw.campaign.text=()=>{};
  const owner=new NativeAreaSceneAssembly(raw),session=owner.sourceSession(mapping),ticket=session.issue(z.id),view=session.read(ticket);
  assert.ok(view.members.length>1);assert.ok(view.members.includes(z));
  const sibling=view.members.find(m=>m!==z)!;assert.equal(session.read(session.issue(sibling.id)).members.find(m=>m.id===z.id),z);
  for(const row of view.positions)assert.deepEqual(mapping.nativePoint(row.physical),row.native);
  assert.throws(()=>session.read({id:z.id} as NativeAreaSource),/not issued/);
  const second=new NativeAreaSourceSession(owner.graph,mapping);assert.throws(()=>second.read(ticket),/another session/);
  const childId=sibling.id;delete raw.campaign.zoneMap[childId];assert.throws(()=>session.read(ticket),/incomplete/);raw.campaign.zoneMap[childId]=sibling;
  // Reissue after graph reconstruction, never authenticate a deserialized ticket.
  const renewed=session.issue(z.id);
  raw.campaign.manifest={...raw.campaign.manifest};
  assert.throws(()=>owner.sourceSession(mapping),/identical campaign manifest/);
  raw.campaign.manifest=w.sim.manifest;
  const other=new NativeAreaSceneAssembly(freshAssemblyInput(w,sibling,raw.campaign));
  assert.equal(other.input.campaign,owner.input.campaign);
  for(const key of ['geometry','population','environment','ecology','physical','registry','residents'] as const)assert.notEqual(other.input[key],owner.input[key]);
  assert.notEqual(other.input.scene.actors,owner.input.scene.actors);
  assert.equal(other.input.population.nextSquadId(),owner.input.population.nextSquadId()-1);
  assert.throws(()=>other.prepare(session,renewed,{x:20,y:20},true),/another owner/);
  let internal:ReturnType<typeof owner.generation.generate>|undefined;const generateOnce=owner.generation.generate;
  owner.generation.generate=function(...args){return internal=generateOnce.apply(this,args);};
  const prepared=owner.prepare(session,renewed,{x:z.size.w/2,y:z.size.h/2},true);
  assert.deepEqual(Object.keys(prepared).sort(),['entry','layoutSeed',...(prepared.spawnAt?['spawnAt']:[])].sort());
  assert.equal((prepared as any).rng,undefined);assert.equal((prepared as any).layout,undefined);assert.equal((prepared as any).memory,undefined);
  assert.throws(()=>{(prepared as any).rng=new Rng(4);},TypeError);
  assert.throws(()=>{(prepared.entry as any).x+=1;},TypeError);
  assert.throws(()=>{(prepared as any).memory=null;},TypeError);
  assert.throws(()=>{(prepared as any).layout={};},TypeError);
  sibling.map.x+=1;assert.throws(()=>owner.birth(),/source changed/);sibling.map.x-=1;
  const oldAt=sibling.exits[0].at;sibling.exits[0].at=(oldAt??.5)+.001;assert.throws(()=>owner.birth(),/source changed/);sibling.exits[0].at=oldAt;
  internal!.rng.next();assert.throws(()=>owner.birth(),/continuation changed/);
  assert.equal(owner.phase,'prepared');assert.equal(atlasSeedInstalled(),991);
  const heldTime=w.timeflow;assert.ok(heldTime.holdSurface('trace'));assert.equal(heldTime.worldScale(),0);
  const traced={traceRuns:[{held:true}] as any,timeflow:heldTime};
  const serviceRaw=freshAssemblyInput(w,sibling,raw.campaign);serviceRaw.services.occurrences=traced;
  class DynamicTheater {mode:any=w.geyserMode;get geyserMode(){return this.mode;}notice(){assert.equal(this,provider);}imminentThreatTo=serviceRaw.services.theater.imminentThreatTo;plantDressAt=serviceRaw.services.theater.plantDressAt;dropGemAt=serviceRaw.services.theater.dropGemAt;moveActor=serviceRaw.services.theater.moveActor;slipAway=serviceRaw.services.theater.slipAway;}
  const provider=new DynamicTheater();serviceRaw.services.theater=provider;
  const servicesOwner=new NativeAreaSceneAssembly(serviceRaw);servicesOwner.input.occurrences.traceAbortAll();assert.equal(traced.traceRuns.length,0);assert.equal(heldTime.worldScale(),1);
  servicesOwner.input.theater.input.services.notice('test');provider.mode='late-mode';assert.equal(servicesOwner.input.theater.input.services.geyserMode,'late-mode');
  assert.equal((servicesOwner.input.residents.npcDialogues as any).visits,raw.campaign.nativeResidentHistory.dialogueVisits);
  assert.equal(servicesOwner.input.state.theaterVisitSeq,raw.campaign.theaterVisitSeq);
  assert.equal(servicesOwner.input.state.vendorStock,raw.campaign.vendorStock);
  const failed=new NativeAreaSceneAssembly(freshAssemblyInput(w,sibling,raw.campaign)),failSession=failed.sourceSession(mapping),failTicket=failSession.issue(sibling.id);
  const generate=failed.generation.generate;failed.generation.generate=function(...args){generate.apply(this,args);throw Error('after real layout');};
  assert.throws(()=>failed.prepare(failSession,failTicket,{x:sibling.size.w/2,y:sibling.size.h/2},true),/after real layout/);assert.equal(failed.phase,'failed');
  assert.throws(()=>failed.prepare(failSession,failTicket,{x:0,y:0},true),/already started/);assert.throws(()=>failed.birth(),/one prepared/);
  const a=new NativeAreaSceneAssembly(freshAssemblyInput(w,z,raw.campaign)),b=new NativeAreaSceneAssembly(freshAssemblyInput(w,sibling,raw.campaign));
  const boot=(area:NativeAreaSceneAssembly)=>{const source=area.sourceSession(mapping),id=area.input.scene.zone.id,place=area.prepare(source,source.issue(id),{x:area.input.geometry.arena.w/2,y:area.input.geometry.arena.h/2},false);area.input.scene.player.pos=area.input.geometry.clampPos({...place.spawnAt??place.entry},area.input.scene.player.radius);area.birth();};
  boot(a);const aBodies=[...a.input.scene.actors],aDoodads=a.input.geometry.doodads,aWalk=a.input.geometry.walk,aControllers=a.input.registry.input.state;
  boot(b);assert.equal(a.phase,'born');assert.equal(b.phase,'born');assert.deepEqual(a.input.scene.actors,aBodies);assert.equal(a.input.geometry.doodads,aDoodads);assert.equal(a.input.geometry.walk,aWalk);assert.equal(a.input.registry.input.state,aControllers);
  assert.ok(a.input.scene.actors.length>1&&b.input.scene.actors.length>1);assert.notEqual(a.input.geometry.walk,b.input.geometry.walk);
  const partial=new NativeAreaSceneAssembly(freshAssemblyInput(w,z,raw.campaign)),ps=partial.sourceSession(mapping);partial.prepare(ps,ps.issue(z.id),{x:z.size.w/2,y:z.size.h/2},false);
  const yard=partial.input.physical.syncTrainingYard;partial.input.physical.syncTrainingYard=function(...args){yard.apply(this,args);throw Error('after actual native bodies');};
  assert.throws(()=>partial.birth(),/after actual native bodies/);assert.equal(partial.phase,'failed');assert.ok(partial.input.scene.actors.length>1);assert.throws(()=>partial.birth(),/one prepared/);
 });
 console.log('PASS genuine complexes, inverse mapping, shared campaign/distinct owners, and stale/foreign source refusals');
}
