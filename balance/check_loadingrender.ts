/** Independent same-model loading renderer regression. Runs the actual renderer
 * methods against explicit canvas/world doubles; subordinate artwork passes are
 * traced, not rasterized. Browser timing and visual acceptance are separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url)),parent='fcbfefd748b055679a1ec5e54be72d7e96168c83';
const normal=(s:string)=>s.replace(/\r\n?/g,'\n');
const source=normal(readFileSync(new URL('../src/render/renderer.ts',import.meta.url),'utf8'));
const prior=normal(execFileSync('git',['show',parent+':src/render/renderer.ts'],{cwd:root,encoding:'utf8',maxBuffer:8_000_000}));
function tree(text:string){return ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true);}
const actualTree=tree(source),priorTree=tree(prior);
function methods(ast:ts.SourceFile){const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='Renderer');assert(cls&&ts.isClassDeclaration(cls));return new Map(cls.members.filter(ts.isMethodDeclaration).map(n=>[n.name.getText(ast),n]));}
const actual=methods(actualTree),old=methods(priorTree),body=actual.get('renderStages')!.body!.getText(actualTree),oldBody=old.get('render')!.body!.getText(priorTree);
assert.equal(body.split(' || cooperative').length,2);assert.equal(body.split('    if (cooperative) yield;\n').length,2);
assert.equal(body.replace(' || cooperative','').replace('    if (cooperative) yield;\n',''),oldBody,'the complete original render body is preserved, with only cooperative falter bypass and one yield');
const statements=actual.get('renderStages')!.body!.statements;
const yieldIndex=statements.findIndex(n=>ts.isIfStatement(n)&&n.expression.getText(actualTree)==='cooperative');
assert(yieldIndex>0);assert.equal(statements[yieldIndex-1].getText(actualTree),'ctx.restore();');assert.match(statements[yieldIndex+1].getText(actualTree),/^this\.roomVeil\.draw\(/);
let yields=0;const visitYield=(n:ts.Node)=>{if(ts.isYieldExpression(n))yields++;assert(!ts.isAwaitExpression(n),'synchronous renderer generator cannot await');ts.forEachChild(n,visitYield);};visitYield(actual.get('renderStages')!);assert.equal(yields,1);
const names=['render','renderLoading','renderStages','loadingPresentationStamp','clearLoadingWords','resize','onCrest','uiPass','drawLabels'];
const classSource='class Candidate {\n'+names.map(n=>actual.get(n)!.getText(actualTree)).join('\n')+'\n}\nclass Predecessor {\n'+[old.get('render')!.getText(priorTree),...['onCrest','uiPass','drawLabels'].map(n=>old.get(n)!.getText(priorTree))].join('\n')+'\n}\nexports.Candidate=Candidate;exports.Predecessor=Predecessor;';
const directCalls=new Set<string>(),memberCalls=new Set<string>();
const calls=(n:ts.Node)=>{if(ts.isCallExpression(n)){if(ts.isIdentifier(n.expression))directCalls.add(n.expression.text);else if(ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.kind===ts.SyntaxKind.ThisKeyword)memberCalls.add(n.expression.name.text);}ts.forEachChild(n,calls);};calls(actual.get('renderStages')!);
// These deliberately typed doubles expose the real lifecycle methods without
// importing browser assets or substituting the stage driver under review.
type Double=Record<string,any>;
function fixture(kind:'Candidate'|'Predecessor'='Candidate',pixelScale=1){
 const trace:unknown[][]=[];
 const log=(name:string,...args:unknown[])=>{trace.push([name,...args]);};
 const ambient:Double={exports:{},window:{innerWidth:640,innerHeight:480},performance:{now:()=>100},Math:Object.assign(Object.create(Math),{random:()=>.5}),VIS_ABLATE:new Set(),VIS_CFG:{statusFx:{falter:{firstDelaySec:1,holdMs:[20,30],periodSec:[1,2],jitter:0}},sightVeil:{hullGate:.1},speechApproach:{enabled:false},combatFocus:{meters:{enabled:true}}},COUCH_CFG:{render:{sightVeil:'on',roomVeil:'on'},camera:{}},CAMERA_FOLLOW_CFG:{}};
 for(const name of directCalls)ambient[name]=(..._args:unknown[])=>{log(name);};
 Object.assign(ambient,{clamp:(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n)),collectActiveFx:()=>[],collectFalterK:()=>1,cameraModeOf:()=> 'test',placeCamera:()=>({x:4,y:7}),voidBaseOf:()=> '#112233',payloadCueRows:()=>[],tierLinkOf:()=>false});
 const context=vm.createContext(ambient);vm.runInContext(ts.transpileModule(classSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
 const renderer:Double=new ambient.exports[kind]();
 function canvas(name:string){let matrix=[1,0,0,1,0,0],stack:number[][]=[];const target:Double={};
  const ctx=new Proxy(target,{get(o,key){if(key==='matrix')return [...matrix];if(key==='depth')return stack.length;if(key==='save')return()=>{stack.push([...matrix]);log(name+'.save');};if(key==='restore')return()=>{assert(stack.length>0,'balanced canvas restore');matrix=stack.pop()!;log(name+'.restore');};if(key==='scale')return(x:number,y:number)=>{matrix[0]*=x;matrix[3]*=y;log(name+'.scale',x,y);};if(key==='translate')return(x:number,y:number)=>{matrix[4]+=x;matrix[5]+=y;log(name+'.translate',x,y);};if(key in o)return Reflect.get(o,key);return(...args:unknown[])=>{log(name+'.'+String(key),...args);};},set(o,key,value){Reflect.set(o,key,value);return true;}});
  let width=640*pixelScale,height=480*pixelScale;const surface:Double={style:{},get width(){return width;},set width(v:number){width=v;matrix=[1,0,0,1,0,0];stack=[];log(name+'.resizeWidth',v);},get height(){return height;},set height(v:number){height=v;matrix=[1,0,0,1,0,0];stack=[];log(name+'.resizeHeight',v);}};return {ctx,surface};
 }
 const main=canvas('main'),crest=canvas('crest');crest.surface.width=640;crest.surface.height=480;trace.length=0;
 const player:Double={id:1,pos:{x:10,y:10},tier:0,statuses:[],dead:false};
 const world:Double={zone:{id:'test',theme:'field'},player,time:1,walk:{},arena:{w:100,h:100},arenaHull:{w:100,h:100},structures:[],actors:[player],seats:[{id:'local'}],localSeat:{id:'local'},tracks:[],trapworks:[],flashes:[],magicPackEffects:[],shake:0,couchActive:()=>false,couchHeroes:()=>[],frameLockFocus:()=>null,publishViewFrame:(...args:unknown[])=>log('publishViewFrame',...args),npcSpeechView:()=>[{a:player,delivery:'callout'}],storeyedStructures:()=>[]};
 const settings:Double={statusFalter:true,cameraMode:'test',veilDarkness:1,uiScale:1};
 Object.assign(renderer,{ctx:main.ctx,canvas:main.surface,octx:crest.ctx,overlay:crest.surface,resizeEpoch:0,loadingRenderActive:false,stewardWorld:null,stewardZone:null,falterW:0,falterH:0,falterArmed:false,falterHoldUntil:0,falterNextAt:0,lastRenderTime:0,frameW:640,frameH:480,pixelScale,captureBaseZoom:null,captureViewport:null,baseZoom:1,zoom:pixelScale,couchStretch:1,cameraFollow:null,directorFocus:null,directorClean:false,directorNoSightVeil:false,directorCinematic:false,worldOnly:false,linkStrain:0,cam:{x:0,y:0},culled:[],stacked:[],hullRects:[],roofFade:new Map(),labels:[],speeches:[],speechFocusLines:new Map(),speechApproach:null,dialogueVisibleSpeaker:null,uiMouse:{x:0,y:0},hudMouse:{x:0,y:0},getSettings:()=>settings,
  sightVeil:{update:()=>log('sight.update'),draw:()=>log('sight.draw')},roomVeil:{update:()=>log('room.update'),draw:()=>log('room.draw'),frac:()=>0},lightLayer:{collect:()=>log('lights.collect'),render:()=>log('lights.render')},wallEyesPass:{draw:()=>log('walls.draw')},combatMeters:{begin:()=>log('meters.begin'),paint:()=>log('meters.paint'),readabilityBounds:()=>[]},understory:{has:()=>false,capture:()=>log('understory.capture')}});
 for(const name of memberCalls)if(typeof renderer[name]!=='function')renderer[name]=()=>{log(name);};
 Object.assign(renderer,{dialogueReaderEnabled:()=>false,npcDialogueAvailable:()=>true,npcDialogueOwner:()=>null,speechPointerHits:()=>[],uiScaleLive:()=>settings.uiScale,labelRevealAt:()=>1,
  drawDoodads:()=>{log('drawDoodads');renderer.labels.push({key:player,probe:player.pos,font:'12px test',text:'name',color:'#fff',x:10,y:10});},
  drawActor:()=>{log('drawActor');renderer.speeches.push({a:player,text:'hello'});renderer.dialogueVisibleSpeaker=player;},
  drawSpeeches:()=>{log('drawSpeeches',renderer.speeches.map((x:Double)=>x.text).join('|'));renderer.speeches.length=0;}});
 function paused(){assert.equal(renderer.ctx,main.ctx);assert.equal(renderer.canvas,main.surface);assert.equal(main.ctx.depth,0);assert.equal(crest.ctx.depth,0);assert.deepEqual(main.ctx.matrix,[1,0,0,1,0,0]);assert.equal(renderer.labels.length,1);assert.equal(renderer.speeches.length,1);assert.equal(renderer.speechFocusLines.size,1);assert(!trace.some(r=>r[0]==='room.draw'),'suffix has not run before yield');}
 function clean(){assert.equal(renderer.loadingRenderActive,false);assert.equal(renderer.labels.length,0);assert.equal(renderer.speeches.length,0);assert.equal(renderer.speechFocusLines.size,0);assert.equal(renderer.speechApproach,null);assert.equal(renderer.dialogueVisibleSpeaker,null);assert.equal(renderer.ctx,main.ctx);assert.equal(renderer.canvas,main.surface);}
 return {renderer,world,settings,trace,main,crest,paused,clean};
}
const results:unknown[]=[];
for(const scale of [1,.5]){
 const original=fixture('Predecessor',scale),sync=fixture('Candidate',scale),loading=fixture('Candidate',scale);
 assert.equal(original.renderer.render(original.world),undefined);assert.equal(sync.renderer.render(sync.world),undefined);assert.deepEqual(sync.trace,original.trace,'ordinary render executes the exact original ordered passes');
 let pauses=0;assert.equal(await loading.renderer.renderLoading(loading.world,async()=>{pauses++;loading.paused();assert.throws(()=>loading.renderer.render(loading.world),/already owns/);await assert.rejects(loading.renderer.renderLoading(loading.world,async()=>{},()=>true),/already owns/);},()=>true),true);
 assert.equal(pauses,1);assert.deepEqual(loading.trace,original.trace,'cooperative frame keeps original full canvas/callback order');assert.equal(loading.main.ctx.depth,0);assert.equal(loading.crest.ctx.depth,0);assert.equal(loading.renderer.labels.length,0);assert.equal(loading.renderer.speeches.length,0);assert.equal(loading.renderer.loadingRenderActive,false);results.push({course:'original sync and split trace',scale,operations:loading.trace.length});
}
for(const key of ['zone','player','time','walk','arena','lease'] as const){const f=fixture();let current=true;assert.equal(await f.renderer.renderLoading(f.world,async()=>{f.paused();if(key==='lease')current=false;else f.world[key]=key==='time'?2:{};},()=>current),false);f.clean();assert(!f.trace.some(r=>r[0]==='room.draw'));results.push({course:'held owner cancellation',key});}
for(const failure of ['pause','current','suffix'] as const){const f=fixture();let calls=0;if(failure==='suffix')f.renderer.roomVeil.draw=()=>{throw Error('independent suffix failure');};await assert.rejects(f.renderer.renderLoading(f.world,async()=>{f.paused();if(failure==='pause')throw Error('independent pause failure');},()=>{if(failure==='current'&&++calls===2)throw Error('independent current failure');return true;}),/independent .* failure/);f.clean();assert.equal(f.main.ctx.depth,0);results.push({course:'failed loading frame cleanup',failure});}
for(const change of ['same-size-resize','settings','settings-owner','follow-owner','projection'] as const){const f=fixture();let pauses=0;assert.equal(await f.renderer.renderLoading(f.world,async()=>{pauses++;if(pauses===1){f.paused();if(change==='same-size-resize')f.renderer.resize();else if(change==='settings')f.settings.uiScale=1.5;else if(change==='settings-owner')f.renderer.getSettings=()=>({...f.settings});else if(change==='follow-owner')f.renderer.cameraFollow={};else f.renderer.captureBaseZoom=2;}else{assert.equal(pauses,2);assert.equal(f.renderer.labels.length,1,'restart discards old queued labels');assert.equal(f.renderer.speeches.length,1,'restart discards old queued speech');}},()=>true),true);assert.equal(pauses,2);assert.equal(f.trace.filter(r=>r[0]==='drawFloor').length,2);assert.equal(f.trace.filter(r=>r[0]==='room.draw').length,1);assert.equal(f.trace.filter(r=>r[0]==='drawSpeeches').length,1);assert.equal(f.renderer.loadingRenderActive,false);assert.equal(f.main.ctx.depth,0);results.push({course:'restart entire frame before suffix',change});}
{
 const f=fixture();f.renderer.stewardWorld=f.world;f.renderer.stewardZone=f.world.zone;f.renderer.falterW=f.main.surface.width;f.renderer.falterH=f.main.surface.height;f.renderer.falterArmed=true;f.renderer.falterHoldUntil=10000;f.renderer.render(f.world);assert.equal(f.trace.length,0,'ordinary falter retains its original held-frame behavior');assert.equal(await f.renderer.renderLoading(f.world,async()=>{},()=>true),true);assert.equal(f.trace.filter(r=>r[0]==='drawFloor').length,1,'loading must draw even when the old falter scheduler holds');results.push({course:'loading bypasses held falter without altering normal render'});
}
{
 const f=fixture();Object.defineProperty(f.world,'zone',{configurable:true,get(){throw Error('independent held-field failure');}});await assert.rejects(f.renderer.renderLoading(f.world,async()=>{},()=>true),/held-field failure/);f.clean();assert.equal(f.trace.length,0);Object.defineProperty(f.world,'zone',{value:{id:'restored',theme:'field'},configurable:true});assert.equal(await f.renderer.renderLoading(f.world,async()=>{},()=>true),true);results.push({course:'initial held-field failure releases renderer ownership'});
}
// Execute the actual Continue presentation predicate after its deliberate
// adoption cancellation; the obsolete prepublication request must not gate it.
{
 const text=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('main.ts',text,99,true),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='resumeCharacterSlot');assert(fn);const found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='renderer.renderLoading')found.push(n);ts.forEachChild(n,walk);};walk(fn);assert.equal(found.length,1);const predicate=found[0].arguments[2].getText(ast),writer={};let obsoleteReads=0;const scope:Double={world:writer,resumed:{writer,runtime:{ready:true}},running:true,loading:{current:true},current:()=>{obsoleteReads++;return false;}};const context=vm.createContext(scope);const evaluate=()=>vm.runInContext('('+predicate+')()',context);assert.equal(evaluate(),true,'published Continue owns its first frame after the old request expires');assert.equal(obsoleteReads,0);
 for(const change of ['world','running','lease','ready']){scope.world=writer;scope.running=true;scope.loading.current=true;scope.resumed.runtime.ready=true;if(change==='world')scope.world={};else if(change==='running')scope.running=false;else if(change==='lease')scope.loading.current=false;else scope.resumed.runtime.ready=false;assert.equal(evaluate(),false,change+' loses published presentation authority');}results.push({course:'actual main Continue fence survives intentional request retirement and refuses stale publication'});
}
// Exercise the actual variadic UI wrapper: short calls must not slide the
// loading callbacks into manifest/mode/name/graft/kit argument positions.
{
 const text=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('main.ts',text,99,true),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='withLoadingScreen');assert(fn);
 const code=ts.transpileModule(fn.getText(ast)+'\nexports.run=withLoadingScreen;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 for(let count=1;count<=6;count++){
  const given=Array.from({length:count},(_,i)=>({slot:i})),writer={},failures:unknown[]=[];let calls=0,paints=0;
  const lease={current:true,paint:async()=>{paints++;},update:()=>{},finish:()=>{}};
  const scope:Double={exports:{},loadingScreen:{begin:()=>lease},account:{cosmetics:{loadout:{}}},cancelLoadingToMenu:()=>{},wakeLease:null,crossingLease:null,loadingGate:undefined,world:writer,running:true,
   startGame:async(...args:unknown[])=>{calls++;assert.equal(args.length,8,'UI wrapper always supplies six explicit data slots and two callbacks');for(let i=0;i<6;i++)assert.equal(args[i],given[i],'unchanged supplied or omitted data slot '+i);assert.equal(typeof args[6],'function');assert.equal(typeof args[7],'function');assert.equal((args[7] as ()=>boolean)(),true);await (args[6] as (label:string)=>Promise<void>)('routing probe');},
   renderer:{renderLoading:async(w:unknown,_pause:unknown,current:()=>boolean)=>{assert.equal(w,writer);return current();}},reportFatal:(error:unknown)=>failures.push(error)};
  const context=vm.createContext(scope);vm.runInContext(code,context);assert.equal(await scope.exports.run(...given),true,'actual UI wrapper succeeds at arity '+count);assert.deepEqual(failures,[]);assert.equal(calls,1);assert.equal(scope.wakeLease,null);assert.equal(scope.loadingGate.world,writer);assert.equal(scope.loadingGate.lease,lease);assert(paints>=4);
 }
 results.push({course:'actual main start wrapper preserves all six optional argument slots',arities:[1,2,3,4,5,6]});
}
console.log('PASS loading renderer',JSON.stringify({scope:'actual extracted renderer methods and pinned predecessor; fake canvas trace, no raster or timing claim',cases:results.length,results}));
