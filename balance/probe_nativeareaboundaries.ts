/** Exact archived e07fc56b boundary operation, actual native controllers and classic cached/load delegates. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import ts from 'typescript';
import '../src/sim/arena'; // actual registration order only; never makeSimWorld/quiet manifest
import {installHeadlessShims} from '../src/sim/shims';
import {registerAllPackageFactions} from '../src/packages/factionGen';
import {validateContent} from '../src/data/validate';
import {makeAccount} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {TILESETS} from '../src/data/tilesets';
import {ZONES,START_ZONE,type ZoneDef} from '../src/data/zones';
import {readFileSync} from 'node:fs';
import {CLASSES} from '../src/data/classes';
import {World} from '../src/engine/world';
import {Rng,withSeededRandom} from '../src/core/rng';
import {clearSeaMemo} from '../src/world/seas';
import {resetActorIdCounter} from '../src/engine/actor';
import {captureNativeGeographySource} from '../src/world/captureGeography';
import {createNativeGeographyReader} from '../src/world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec} from '../src/worldmass/nativeGeography';
import {address} from '../src/worldmass/address';
import {placeZoneAt} from '../src/engine/worldgen';
import {serializeNativeAreaData} from '../src/worldmass/nativeAreaGeometry';
import {prepareNativeAreaBoundaries,type NativeAreaBoundaryHost} from '../src/engine/nativeAreaBoundaries';
import {Actor} from '../src/engine/actor';
import {nextItemUid} from '../src/engine/itemgen';
import {captureNativeActorState,massDormancyPins} from '../src/worldmass/dormancy';
// This is the actual classic cached adapter, not a duplicate test adapter.
function nativeAreaBoundaryWorldHost(world:any):NativeAreaBoundaryHost {
 return (World.prototype as any).nativeAreaBoundaryHost.call(world);
}
const archivedBytes=gunzipSync(Buffer.from('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','base64'));
assert.equal(createHash('sha256').update(archivedBytes).digest('hex'),'82b04f756a2495d6757bcd9f21dad418810d9c063e76844f60521cd3a62179f4');
const archive=JSON.parse(archivedBytes.toString()) as {body:string;fields:string[];methods:string[];modules:[string,[string,string][]][]};
const bindings:string[]=[],values:unknown[]=[];
for(const [path,entries] of archive.modules){const m=await import(new URL('../src/engine/'+path+'.ts',import.meta.url).href);for(const [name,key]of entries){bindings.push(name);values.push(m[key]);}}
const code=ts.transpileModule('return function(def,firstVisit,isCave){'+archive.body+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const original=Function(...bindings,code)(...values) as (this:NativeAreaBoundaryHost,...args:Parameters<typeof prepareNativeAreaBoundaries> extends [unknown,...infer A]?A:never)=>void;
installHeadlessShims();registerAllPackageFactions();validateContent();
function graph(root:unknown):unknown {
 const seen=new Map<object,number>(),nodes:unknown[]=[];
 function visit(value:any):unknown {
  if(value===undefined)return ['undefined'];if(typeof value==='number'&&(!Number.isFinite(value)||Object.is(value,-0)))return ['number',String(value),Object.is(value,-0)];
  if(typeof value==='function')return ['function',value.length];if(!value||typeof value!=='object')return value;
  if(seen.has(value))return {ref:seen.get(value)};const id=nodes.length;seen.set(value,id);nodes.push(null);
  nodes[id]=value instanceof Map?['map',[...value].map(([k,v])=>[visit(k),visit(v)])]:value instanceof Set?['set',[...value].map(visit)]:ArrayBuffer.isView(value)?[value.constructor.name,Array.from(value as unknown as ArrayLike<number>)]:[Object.getPrototypeOf(value)?.constructor?.name??'null',Object.keys(value).map(k=>[k,visit(value[k])])];return {ref:id};
 }
 return {root:visit(root),nodes};
}
function naturalWorld(index:number){
  const account=makeAccount(),manifest=buildManifest(account,991),w:any=new World(account,Object.freeze(manifest));
  w.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{startingCompanions:false});w.sim.bindGeographyPolicies();
  const source=createNativeGeographyReader(captureNativeGeographySource(991));
  const spec=makeMassNativeGeographySpec(source.identity,{schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'});
  const mapping=new MassNativeGeography(spec),target=index===0?{x:-55,y:160}:{x:-35,y:1280},request=mapping.ownerContext('native-source-course/'+index,mapping.physicalAnchor(target));
  const z=placeZoneAt(request.requestedTarget,null,w.zoneMap,request.requestedSeed,{seed:request.requestedSeed,fieldBiome:true,biomeFor:source.biomeAt,biomeDepthFor:source.biomeDepth,climateFor:source.climateAt,levelFor:w.levelFor,courseFor:w.courseMintFor('surface')});
  w.zoneMap[z.id]=z;return {w,z,manifest,request};
}
function run(archived:boolean,index:number,failure?:string){
 clearSeaMemo();resetActorIdCounter();
 return withSeededRandom(991,()=>{
  const {w,z,manifest,request}=naturalWorld(index);
  w.zoneMap[z.id]=z;w.zone=z;w.arena={...z.size,shape:z.shape??'rect',boundless:!!z.boundless,...(z.annexes?.length?{pieces:z.annexes.map(r=>({...r,active:false}))}:{})};w.entryFrom=null;
  const firstVisit=!w.visited.has(z.id);w.visited.add(z.id);const initial=Object.entries(w.zoneMap),initialKeys=Object.keys(w.zoneMap),exitRows=z.exits;
  const tape:unknown[]=[],draws:number[]=[],next=Rng.prototype.next;
  for(const name of archive.methods){const fn=w[name];Object.defineProperty(w,name,{configurable:true,writable:true,value:function(...args:unknown[]){tape.push(['call',name,args.map(a=>a===z?'target':typeof a)]);const result=fn.apply(w,args);tape.push(['return',name]);if(name===failure)throw Error('after native '+name);return result;}});}
  const aliases=[];let error:string|undefined;
  Rng.prototype.next=function(){const value=next.call(this);draws.push(value);return value;};
  try{if(archived)original.call(w,z,firstVisit,false);else w.runNativeAreaBoundaries(z,firstVisit,false);}catch(e){error=(e as Error).message;}finally{Rng.prototype.next=next;}
  assert.ok(z.packs,'natural requested face has a native pack table');assert.strictEqual(z.packs,TILESETS[z.tileset!].packs,'exact native target pack table identity');
  for(const [id,ref]of initial)aliases.push([id,w.zoneMap[id]===ref]);
  const sourceRefs=Object.values(w.zoneMap as Record<string,ZoneDef>).filter(q=>q.tileset&&TILESETS[q.tileset]).map(q=>{const t=TILESETS[q.tileset!];return [q.id,q.packs===t.packs,q.theme===t.theme,q.puzzles===t.puzzles,q.scenery===t.scenery,q.hollows===t.hollows];});
  const data={sourceRefs,request,manifest,selected:{id:z.id,face:z.tileset,layout:z.layoutType,objective:z.objective},error,tape,draws,ambientAfter:Math.random(),initialKeys,newIds:Object.keys(w.zoneMap).filter(id=>!initialKeys.includes(id)),identity:aliases,exitArrayRetained:z.exits===exitRows,
   graph:graph({target:z,initial,zoneMap:w.zoneMap,caveMap:w.caveMap,exits:w.exits,visited:w.visited,surveyed:w.surveyed,nextGenId:w.nextGenId,mintVeil:w.mintVeil,overlays:w.sim.snapshotOverlays()})};
  if(!failure){
   const startDraw=draws.length;Rng.prototype.next=function(){const value=next.call(this);draws.push(value);return value;};
   try{if(archived)original.call(w,z,false,false);else w.runNativeAreaBoundaries(z,false,false);}finally{Rng.prototype.next=next;}
   return {...data,reentry:{draws:draws.slice(startDraw),ambientAfter:Math.random(),state:graph({target:z,initial,zoneMap:w.zoneMap,caveMap:w.caveMap,exits:w.exits,visited:w.visited,surveyed:w.surveyed,nextGenId:w.nextGenId,mintVeil:w.mintVeil,overlays:w.sim.snapshotOverlays()})}};
  }
  return {...data,reentry:null};
 });
}
let pairs=0;for(const index of [0,1])for(const failure of [undefined,'chartWithin']){
 const a=run(true,index,failure),b=run(false,index,failure);assert.deepEqual(b,a,'actual campaign boundary '+index+' '+failure);
 assert.ok(a.sourceRefs.some(row=>row[1]===true),'native pack source reference retained');assert.ok(a.newIds.length>0,'real native graph children retained');assert.ok(a.identity.every(([,same])=>same),'prior native zone identities retained');
 console.log('PASS actual controller',JSON.stringify({index,failure,seed:a.request.requestedSeed,face:a.selected.face,newZones:a.newIds.length,draws:a.draws.length,enabled:a.manifest.packages.filter(p=>p.enabled).map(p=>p.id)}));pairs++;
}
console.log('PASS native pre-layout exact archived/actual controller pairs',pairs);

// The embedded immutable original is the oracle, not a regenerated local body.
const coreText=readFileSync(new URL('../src/engine/nativeAreaBoundaries.ts',import.meta.url),'utf8');
const coreFile=ts.createSourceFile('core.ts',coreText,ts.ScriptTarget.Latest,true),coreFn=coreFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prepareNativeAreaBoundaries') as ts.FunctionDeclaration;
const printer=ts.createPrinter({removeComments:true});const printed=(body:string)=>printer.printFile(ts.createSourceFile('x.ts','function f(){'+body+'}',ts.ScriptTarget.Latest,true));
assert.equal(printed(coreFn.body!.getText(coreFile).slice(1,-1).replace(/\bhost\./g,'this.')),printed(archive.body));
let adapterPairs=0;
for(const method of archive.methods)for(const throws of [false,true]){
 const attempt=(adapter:boolean)=>{const tape:unknown[]=[],w:any={};let generation=0;
  Object.defineProperty(w,method,{get(){tape.push(['selected',generation]);if(throws)throw Error('selection');const selected=generation;return function(this:unknown,...args:unknown[]){tape.push(['called',selected,this===w,args]);return selected;};},configurable:true});
  const host=adapter?nativeAreaBoundaryWorldHost(w):w;let result:unknown;try{result=host[method]((()=>{tape.push(['argument']);generation++;return 41;})());}catch(e){result=(e as Error).message;}return {tape,result};};
 assert.deepEqual(attempt(true),attempt(false),'selection before arguments '+method);adapterPairs++;
}
console.log('PASS exact pinned AST and selection/receiver pairs',adapterPairs);

// These deliberately authored graph-heal/read controls complement natural
// controller courses; they are not natural distribution evidence.
let mechanismPairs=0;
for(const mode of ['ordinary','safe','cave','mass','marked-crossdim','unmarked-crossdim','hub-trim','partner-heal','opening'])for(const first of [false,true])for(const fail of [undefined,'placeExit']){
 const attempt=(adapter:boolean)=>{const tape:unknown[]=[],base=()=>structuredClone(ZONES[START_ZONE]),zone=base();zone.id='boundary-control';zone.map={x:100,y:100};zone.objective={kind:mode==='safe'?'safe':'clear'};zone.exits=[{to:'?',side:'e'},{to:'?',side:'w'}];
  const graph:Record<string,ZoneDef>={[zone.id]:zone};const a=base();a.id='other';a.dimension='aetherial';a.exits=[];graph[a.id]=a;
  if(mode==='mass')zone.id=String(values[bindings.indexOf('MASS_ZONE')]);
  if(mode==='marked-crossdim'||mode==='unmarked-crossdim')zone.exits=[{to:a.id,side:'e',...(mode==='marked-crossdim'?{crossDim:true}: {})}];
  if(mode==='hub-trim'){zone.id='ae_gate';zone.dimension='aetherial';zone.exits=['p0','p1','p2','p3'].map((id,i)=>{const p=base();p.id=id;p.dimension='aetherial';p.exits=[{to:'anchor',side:'e'},{to:zone.id,side:'w'}];graph[id]=p;return {to:id,side:(['e','w','n','s'] as const)[i]};});}
  if(mode==='partner-heal'){a.id='ae_gate';a.exits=[];graph[a.id]=a;zone.dimension='aetherial';zone.exits=[{to:'?',side:'e'},{to:a.id,side:'w'}];}
  if(mode==='opening'){zone.id=String(values[bindings.indexOf('HUB_ZONE')]);const p=base();p.id='gen_opening_control';p.objective={kind:'clear'};p.map={x:160,y:100};p.exits=[{to:zone.id,side:'w'}];graph[p.id]=p;zone.exits=[{to:p.id,side:'e'}];}
  graph[zone.id]=zone;const state:any={zoneMap:graph,visited:new Set(),sim:{biomeField:{fieldSeed:991}},exits:[]};
  for(const name of archive.methods)state[name]=function(this:unknown,...args:any[]){tape.push(['call',name,this===state,args.map(a=>a===zone?'target':a)]);if(name===fail)throw Error('mechanism '+name);if(name==='placeExit')return {to:args[0].to,pos:{x:80+args[1]*160,y:120},defIndex:args[1],boundary:undefined,meld:undefined};if(name==='landRoute')return true;if(name==='exitRoadAnnotations')return undefined;};
  const seen:unknown[]=[];for(const key of archive.fields){let value=state[key];Object.defineProperty(state,key,{get(){seen.push(['get',key]);return value;},set(v){seen.push(['set',key]);value=v;},configurable:true});}
  const host=adapter?nativeAreaBoundaryWorldHost(state):state,warn=console.warn;let error:string|undefined;console.warn=(...a:unknown[])=>{tape.push(['warn',...a]);};try{if(adapter)prepareNativeAreaBoundaries(host,zone,first,mode==='cave');else original.call(state,zone,first,mode==='cave');}catch(e){error=(e as Error).message;}finally{console.warn=warn;}
  if(!fail){if(mode==='marked-crossdim'||mode==='unmarked-crossdim')assert.equal(zone.exits.length,0,'actual edge removed');if(mode==='hub-trim')assert.equal(zone.exits.length,3,'actual fan trimmed');if(mode==='partner-heal')assert.equal(zone.exits.length,1,'actual partner edge removed');}
  return {seen,tape:serializeNativeAreaData(tape),error,state:serializeNativeAreaData({zoneMap:graph,exits:state.exits})};
 };assert.deepEqual(attempt(true),attempt(false),'graph mechanism '+mode+'/'+first+'/'+fail);mechanismPairs++;
}
console.log('PASS native graph-heal/read/partial-failure controls',mechanismPairs);

// Actual load boundary. Only the private boundary driver is replaced with the
// immutable original; all minting, campaign graph work, layout and birth remain
// the installed native implementation in both lanes.
function fullLoad(archived:boolean,index:number,remembered:boolean,failAt?:number){
 const descriptor=Object.getOwnPropertyDescriptor(World.prototype,'runNativeAreaBoundaries')!;
 if(archived)Object.defineProperty(World.prototype,'runNativeAreaBoundaries',{...descriptor,value:original});
 clearSeaMemo();resetActorIdCounter(10000);const itemBase=nextItemUid()+1;
 try{return withSeededRandom(991,()=>{
  const {w,z,request,manifest}=naturalWorld(index);
  if(remembered){w.loadZone(z.id);for(const a of w.actors)if(a!==w.player&&a.fromZoneGen)a.life*=.57;w.captureZoneMemory();}
  const tape:unknown[]=[],draws:number[]=[],factoryCalls:unknown[]=[],made:Actor[]=[];
  const nativeNext=Rng.prototype.next,factory=w.createMonster,birth=w.runNativeAreaBirth;
  let layout:unknown,layoutCursor:unknown,placements=0,error:string|undefined;
  const norm=(v:any):any=>{
   if(v===undefined)return ['undefined'];if(typeof v==='number'&&(!Number.isFinite(v)||Object.is(v,-0)))return ['number',String(v),Object.is(v,-0)];
   if(v instanceof Actor)return ['actor',v.id];if(!v||typeof v!=='object')return typeof v==='function'?['callback',v.length]:v;
   if(Array.isArray(v))return v.map(norm);if(v instanceof Map)return ['map',[...v].map(([k,x])=>[norm(k),norm(x)])];if(v instanceof Set)return ['set',[...v].map(norm)];
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='uid'&&typeof x==='number'?x-itemBase:norm(x)]));
  };
  for(const name of archive.methods){const fn=w[name];Object.defineProperty(w,name,{configurable:true,writable:true,value:function(...args:unknown[]){
   tape.push(['call',name,args.map(a=>a===z?'target':typeof a)]);const value=fn.apply(w,args);tape.push(['return',name]);
   if(name==='placeExit'&&++placements===failAt)throw Error('after native placeExit '+failAt);return value;
  }});}
  w.createMonster=function(...args:any[]){factoryCalls.push(norm(args));const a=factory.apply(w,args);made.push(a);return a;};
  w.runNativeAreaBirth=function(...args:any[]){layout=graph({...args[1],walk:args[1].walk?.pack?.()??null});try{return birth.apply(w,args);}finally{layoutCursor=args[4].snapshot();}};
  Rng.prototype.next=function(){const value=nativeNext.call(this);draws.push(value);return value;};
  try{w.loadZone(z.id);}catch(e){error=(e as Error).message;}finally{Rng.prototype.next=nativeNext;}
  if(failAt)assert.equal(error,'after native placeExit '+failAt,'the intended real placement failure must be reached');else assert.equal(error,undefined,'natural full load must complete');
  const actor=(a:Actor)=>{const state=captureNativeActorState(a);assert.ok(state,'complete native actor state '+a.defId);for(const node of state.nodes)for(const entry of node.entries)if(entry[0]==='uid'&&typeof entry[1]==='number')entry[1]-=itemBase;return {id:a.id,state};};
  const output={error,request,manifest,layout,layoutCursor,tape,draws,factoryCalls,births:made.map(actor),actors:w.actors.filter((a:Actor)=>a!==w.player).map(actor),
   hero:{id:w.player.id,pos:w.player.pos,tier:w.player.tier,life:w.player.life,mana:w.player.mana},
   physical:graph({zone:w.zone,arena:w.arena,walk:w.walk?.pack?.()??null,doodads:w.doodads,structures:w.structures,exits:w.exits}),
   graph:graph({zoneMap:w.zoneMap,caveMap:w.caveMap,visited:w.visited,surveyed:w.surveyed,nextGenId:w.nextGenId,mintVeil:w.mintVeil,overlays:w.sim.snapshotOverlays()}),
   farPointDraws:w.farPointDraws,ambientAfter:Math.random(),nextActor:new Actor('boundary-cursor','enemy',{x:0,y:0}).id,itemsConsumed:nextItemUid()-itemBase};
  if(!archived)assert.equal(Object.getOwnPropertyDescriptor(w,'nativeAreaBoundaryView')?.enumerable,false);
  return {output,receipt:{index,face:z.tileset,seed:request.requestedSeed,remembered,failAt:failAt??null,births:made.length,actors:w.actors.length,draws:draws.length}};
 });}finally{Object.defineProperty(World.prototype,'runNativeAreaBoundaries',descriptor);}
}
let loadPairs=0,loadBirths=0,loadDraws=0;
for(const index of [0,1])for(const course of [{remembered:false},{remembered:true},{remembered:false,failAt:2}]){
 const a=fullLoad(true,index,course.remembered,course.failAt),b=fullLoad(false,index,course.remembered,course.failAt);
 for(const key of Object.keys(a.output) as (keyof typeof a.output)[])assert.equal(serializeNativeAreaData(b.output[key]),serializeNativeAreaData(a.output[key]),'actual full load boundary '+index+'/'+course.remembered+'/'+course.failAt+' '+key);
 loadPairs++;loadBirths+=b.receipt.births;loadDraws+=b.receipt.draws;console.log('PASS actual full load boundary',JSON.stringify(b.receipt));
}

// The cached view is an implementation aid, not a controller owner. Preserve
// original member selection, live field reads and real dependencies.
function cacheControls(){
 clearSeaMemo();resetActorIdCounter();return withSeededRandom(991,()=>{
  const {w}=naturalWorld(0);delete w.nativeAreaBoundaryView;
  const body=w.createMonster('husk_swarmer',3,'enemy');w.actors.push(body);const owned=new Map<string,Actor>([['boundary-body',body]]);
  assert.equal(massDormancyPins(w,owned).has(body),false);
  const host=nativeAreaBoundaryWorldHost(w);assert.strictEqual(nativeAreaBoundaryWorldHost(w),host);assert.ok(Object.isFrozen(host));
  assert.equal(Object.getOwnPropertyDescriptor(w,'nativeAreaBoundaryView')?.enumerable,false);assert.ok(!Object.keys(w).includes('nativeAreaBoundaryView'));
  assert.equal(massDormancyPins(w,owned).has(body),false,'adapter cache cannot pin root actors');
  const priorTarget=w.player.aiTargetId;w.player.aiTargetId=body.id;assert.equal(massDormancyPins(w,owned).has(body),true,'a real native target still pins');w.player.aiTargetId=priorTarget;
  let selections=0;
  for(const key of archive.methods){const previous=Object.getOwnPropertyDescriptor(w,key),tape:unknown[]=[];let reads=0;
   try{
    Object.defineProperty(w,key,{configurable:true,get(){reads++;return function(this:unknown,...args:unknown[]){tape.push(['old',this===w,args]);return 'old';};}});
    delete w.nativeAreaBoundaryView;const cold:any=nativeAreaBoundaryWorldHost(w);assert.equal(reads,0);assert.strictEqual(nativeAreaBoundaryWorldHost(w),cold);assert.equal(reads,0);
    const argument={get value(){tape.push('argument');Object.defineProperty(w,key,{configurable:true,value:function(this:unknown,...args:unknown[]){tape.push(['new',this===w,args]);return 'new';}});return 17;}};
    assert.equal(cold[key](argument.value,undefined,'tail'),'old');assert.equal(reads,1);assert.equal(cold[key](19),'new');
    assert.deepEqual(tape,['argument',['old',true,[17,undefined,'tail']],['new',true,[19]]]);
    let argumentReads=0;Object.defineProperty(w,key,{configurable:true,get(){throw Error('selection '+key);}});assert.throws(()=>cold[key](++argumentReads),new RegExp('selection '+key));assert.equal(argumentReads,0);selections++;
   }finally{if(previous)Object.defineProperty(w,key,previous);else delete w[key];}
  }
  const live:any=nativeAreaBoundaryWorldHost(w);
  for(const key of archive.fields){const before=w[key],replacement=key==='visited'?new Set():key==='exits'?[]:{};try{w[key]=replacement;assert.strictEqual(live[key],replacement,'live '+key);}finally{w[key]=before;}assert.strictEqual(live[key],before);}
  const previous=w.exits,replacement:unknown[]=[];live.exits=replacement;assert.strictEqual(w.exits,replacement);live.exits=previous;
  assert.equal(massDormancyPins(w,owned).has(body),false,'rebuilt boundary cache retains correct dormancy');
  return {selections,throwingSelections:selections,liveFields:archive.fields.length,nonEnumerable:true,realPinWitness:true};
 });
}
console.log('PASS actual cached World boundary controls',JSON.stringify(cacheControls()));
console.log('PASS native boundary preparation',JSON.stringify({controllerPairs:pairs,selectionPairs:adapterPairs,mechanismPairs,loadPairs,loadBirths,loadDraws}));
console.log('LIMIT exact native graph/layout/birth boundary over real World services; detached campaign/source issuance and seamless runtime admission remain separate');
