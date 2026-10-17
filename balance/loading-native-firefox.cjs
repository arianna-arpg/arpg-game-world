// Firefox retained-loading acceptance. Use an unscoped worldmass Vite build with
// --minify false; HOLLOW_WAKE_QA_DIST selects it. Only served bytes are instrumented.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');const ts=require('typescript');
const dir=__dirname, dist=path.resolve(process.env.HOLLOW_WAKE_QA_DIST||path.join(dir,'../dist'));
const sharedDetail=process.env.HOLLOW_WAKE_QA_SHARED_DETAIL==='1';const tag=process.env.HOLLOW_WAKE_QA_TAG||'control', negative=process.env.HOLLOW_WAKE_QA_NEGATIVE==='1';
const out=path.resolve(process.env.HOLLOW_WAKE_QA_REPORT||path.join(dir,'reports/native-loading-firefox',tag+(negative?'-negative':'')+'-'+Date.now()));fs.mkdirSync(out,{recursive:true});
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const report={tag,negative,dist,harnessSha256:digest(fs.readFileSync(__filename)),started:new Date().toISOString(),assets:{},instrumentation:[],disk:[],results:[],errors:[]};
const slots=new Map();let child,timer,current,fixture,finishing=false;
const save=()=>fs.writeFileSync(path.join(out,'REPORT.json'),JSON.stringify(report,null,2)+'\n');
const childJS=`;(()=>{
 const rows=[];let lastDirection=-1,activeAt=0,stalled=false;
 function tick(){const s=__muCrossing.snapshot;if(s.active){
  const at=Date.now();if(!activeAt)activeAt=at;rows.push({at,lane:s.lane,time:s.time,label:s.label,hidden:document.hidden});
  const direction=Math.floor((at-activeAt)/400)%2;
  if(direction!==lastDirection){dispatchEvent(new KeyboardEvent('keyup',{code:direction?'KeyA':'KeyD'}));dispatchEvent(new KeyboardEvent('keydown',{code:direction?'KeyD':'KeyA'}));lastDirection=direction;}
  if(${negative}&&!stalled){stalled=true;const t=performance.now();while(performance.now()-t<650){}rows.at(-1).injectedStallMs=performance.now()-t;}
 }requestAnimationFrame(tick)}requestAnimationFrame(tick);
 addEventListener('message',e=>{if(e.data==='qa-frames')parent.postMessage({qaFrames:rows},'*')});
})();`;
const timingJS=`;window.__qaTimes=[];function __qaCall(name,fn){const start=Date.now(),t=performance.now();try{return fn()}finally{__qaTimes.push({name,start,end:Date.now(),ms:performance.now()-t})}};(()=>{const original=NativeClientRuntime.prototype.install;NativeClientRuntime.prototype.install=function(...args){const start=Date.now(),t=performance.now();window.__qaInstallDepth=(window.__qaInstallDepth||0)+1;try{return Reflect.apply(original,this,args)}finally{window.__qaInstallDepth--;__qaTimes.push({name:'install',start,end:Date.now(),ms:performance.now()-t})}}})();\n`;

const probes=[
['new World(account2, Object.freeze(manifest))',"__qaCall('World.constructor',()=>new World(account2, Object.freeze(manifest)))"],
['writer.sim.bindGeographyPolicies();',"__qaCall('bindGeographyPolicies',()=>writer.sim.bindGeographyPolicies());"],
['createNativeGeographyReader(captureNativeGeographySource(writer.manifest.seed))',"__qaCall('createNativeGeographyReader',()=>createNativeGeographyReader(__qaCall('captureNativeGeographySource',()=>captureNativeGeographySource(writer.manifest.seed))))"],
['new NativeGeographyCatalog(makeNativeGeographyCatalogSpec(source.identity))',"__qaCall('NativeGeographyCatalog.constructor',()=>new NativeGeographyCatalog(__qaCall('makeNativeGeographyCatalogSpec',()=>makeNativeGeographyCatalogSpec(source.identity))))"],
['new NativeClientRuntime({ writer, definition: writer.zoneMap[START_ZONE], geography, ...catalog ? { catalog: catalog.spec } : {}, fresh: character })',"__qaCall('NativeClientRuntime.constructor',()=>new NativeClientRuntime({ writer, definition: writer.zoneMap[START_ZONE], geography, ...catalog ? { catalog: catalog.spec } : {}, fresh: character }))"],
['readNativeRetainedSave(resume.save)',"__qaCall('readNativeRetainedSave',()=>readNativeRetainedSave(resume.save))"],
['World.staged(structuredClone(account2), Object.freeze(record.manifest))',"__qaCall('World.staged',()=>World.staged(structuredClone(account2), Object.freeze(record.manifest)))"],
['new NativeAreaCharacterResume(writer, resume.save, resume)',"__qaCall('NativeAreaCharacterResume.constructor',()=>new NativeAreaCharacterResume(writer, resume.save, resume))"],
['new NativeClientRuntime({ writer, definition: writer.zoneMap[START_ZONE], geography: record.geography.spec, ...record.catalog ? { catalog: record.catalog.spec } : {}, resume: restore2, resumePolicy: options.spawn })',"__qaCall('NativeClientRuntime.constructor',()=>new NativeClientRuntime({ writer, definition: writer.zoneMap[START_ZONE], geography: record.geography.spec, ...record.catalog ? { catalog: record.catalog.spec } : {}, resume: restore2, resumePolicy: options.spawn }))"]
];

function instrumentShared(source){
 const wanted=new Set(['hydrateNativeGeographySource','restoreNativeGeographySource','copyNativeGeographyData','generateNativeAreaLayout']);const constructors=new Set(['NativeGeographyCatalog','MassNativeGeography']);const counts={},edits=[];
 const tree=ts.createSourceFile('shared.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function add(body,name){counts[name]=(counts[name]||0)+1;edits.push([body.getStart(tree)+1,"const __qaProbeStart=performance.now();try{"]);edits.push([body.end-1,"}finally{__qaSharedFinish("+JSON.stringify(name)+",__qaProbeStart)}"])}
 function walk(n){if(ts.isFunctionDeclaration(n)&&n.name&&wanted.has(n.name.text))add(n.body,n.name.text);if((ts.isClassDeclaration(n)||ts.isClassExpression(n))&&n.name&&constructors.has(n.name.text.replace(/^_/,''))){const ctor=n.members.find(ts.isConstructorDeclaration);assert.ok(ctor?.body,'Missing shared ctor '+n.name.text);add(ctor.body,n.name.text.replace(/^_/,'')+'.constructor')}ts.forEachChild(n,walk)}walk(tree);
 for(const name of [...wanted,...[...constructors].map(x=>x+'.constructor')])assert.equal(counts[name],1,'Exactly one shared probe '+name);
 for(const [at,bytes] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,at)+bytes+source.slice(at);
 const head="function __qaSharedFinish(name,start){if(typeof window==='undefined')return;const key=(window.__qaInstallDepth?'install:':'outside:')+name,stats=window.__qaSharedStats||(window.__qaSharedStats={}),row=stats[key]||(stats[key]={calls:0,totalMs:0,maxMs:0}),ms=performance.now()-start;row.calls++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms)};\n";
 return{source:head+source,counts};
}
function mainJS(seed,stage){return `;(()=>{
 const begin=NativeClientStart.prototype.begin;
 NativeClientStart.prototype.begin=function(request){const start=Date.now(),t=performance.now();try{return Reflect.apply(begin,this,[request.kind==='run'?{...request,manifest:__qaCall('buildManifest',()=>buildManifest(__game.account(),${seed}))}:request])}finally{__qaTimes.push({name:'begin',start,end:Date.now(),ms:performance.now()-t})}};
 const render=renderer.render;renderer.render=function(...args){const t=performance.now(),start=Date.now();try{return Reflect.apply(render,this,args)}finally{if(__game.loading.active)__qaTimes.push({name:'render',start,end:Date.now(),ms:performance.now()-t})}};
 (async()=>{try{
 const pause=ms=>new Promise(r=>setTimeout(r,ms));await __game.hydrated();await pause(100);
 const drivers=[],proto=Object.getPrototypeOf(__game.world());
 for(const name of ['createPlayer','update','applyInputs','passInputTime','loadZone','startWorldMass']){const d=Object.getOwnPropertyDescriptor(proto,name);if(!d||typeof d.value!=='function')throw Error('Missing ordinary World driver '+name);Object.defineProperty(proto,name,{...d,value:function(){drivers.push(name);throw Error('Retained path called ordinary World driver '+name)}})}
 const frame=document.getElementById('mu-loading-frame');let openedAt=0,closedAt=0;
 const realBegin=__game.loading.begin;__game.loading.begin=function(...args){openedAt=Date.now();return Reflect.apply(realBegin,this,args)};
 const observer=new MutationObserver(()=>{if(frame.style.display==='none'&&openedAt)closedAt=Date.now()});observer.observe(frame,{attributes:true,attributeFilter:['style']});
 let incoming=null;
 if('${stage}'==='entry'){__game.account().ledger.prologue_lived=1;__game.saveAccount();await __game.ui.startHandlers.onStart(CLASSES.find(c=>c.id==='tamer'),'immortal','Firefox QA ${seed}');}
 else{const response=await fetch('/qa-fixture');incoming=await response.json();const card=__game.account().roster.find(r=>r.charId===incoming.charId);if(!card||card.slot!==incoming.slot)throw Error('Cold roster lost issued identity');document.getElementById('sm-immortals').click();const go=document.querySelector('.sm-roster-go[data-cid="'+incoming.charId+'"]');if(!go)throw Error('Missing genuine roster Continue');go.click();}
 const deadline=Date.now()+120000;while(!openedAt||__game.loading.active){if(__game.crash().fatal)throw Error(JSON.stringify(__game.crash().fatal));if(Date.now()>deadline)throw Error('Timed out waiting retained loading');await pause(20)}
 observer.disconnect();if(!closedAt)throw Error('Missing visible close boundary');
 const rows=await new Promise((resolve,reject)=>{const listener=e=>{if(e.source===frame.contentWindow&&e.data?.qaFrames){removeEventListener('message',listener);resolve(e.data.qaFrames)}};addEventListener('message',listener);frame.contentWindow.postMessage('qa-frames','*');setTimeout(()=>reject(Error('Missing child samples')),5000)});
 const w=__game.world(),rt=__game.retained(),card=__game.account().roster.find(r=>r.charId===w.meta.charId);
 const area=rt.current;area.authority.assertAdmitted(area.binding.scene);area.authority.assertFinalPhysical(area.binding,[w.player]);const physical={phase:area.assembly.phase,active:area.assembly.scenePresence.active,sceneZone:area.assembly.input.scene.zone.id,exactPlayer:area.assembly.input.scene.player===w.player,actorPresent:area.binding.scene.actors.includes(w.player),exactBinding:area.authority.bindingFor(area.binding.scene)===area.binding};
 const state={physical,charId:w.meta.charId,slot:card?.slot,modeId:w.meta.modeId,classId:w.meta.classDef.id,seed:w.manifest.seed,zone:w.zone.id,native:rt?.ready===true,scene:w.scene?.def.id??null,geography:rt?.geography.spec,localPlayerId:w.player.id};
 if('${stage}'==='entry'){__game.hold(true);w.player.invulnerable=true;__game.save();await __game.flushRunSave();}
 await fetch('/qa-report',{method:'POST',body:JSON.stringify({stage:'${stage}',seed:${seed},openedAt,closedAt,rows,times:__qaTimes,state,incoming,sharedTimes:window.__qaSharedStats||null,fatal:__game.crash().fatal,drivers,hidden:document.hidden})});
 }catch(e){await fetch('/qa-report',{method:'POST',body:JSON.stringify({stage:'${stage}',seed:${seed},error:e.stack||String(e),times:window.__qaTimes,crash:window.__game?.crash()})})}})();
})();`}
function evaluate(r){
 const fails=[];const check=(ok,message)=>{if(!ok)fails.push(message)};if(r.error)return{accepted:false,failures:[r.error]};
 check(r.fatal===null,'Fatal error');check(r.hidden===false,'Parent is hidden');check(r.rows.every(x=>!x.hidden),'Child was hidden');check(r.state.native,'Retained runtime not ready');check(r.state.physical?.phase==='born'&&r.state.physical.active&&r.state.physical.exactPlayer&&r.state.physical.actorPresent&&r.state.physical.exactBinding&&r.state.physical.sceneZone===r.state.zone,'Actual born physical authority differs');check(r.state.scene===null,'Unexpected scene');check(r.state.seed===r.seed,'Requested manifest seed mismatch');check(r.state.modeId==='immortal','Not genuine Immortal');check(r.drivers.length===0,'Ordinary World driver called');
 if(r.incoming){for(const key of ['charId','slot','modeId','classId','seed','zone'])check(r.state[key]===r.incoming[key],'Cold Continue changed '+key);check(JSON.stringify(r.state.geography)===JSON.stringify(r.incoming.geography),'Cold Continue changed geography')}
 const rows=r.rows.filter(x=>x.at>=r.openedAt&&x.at<=r.closedAt),duration=r.closedAt-r.openedAt,gaps=rows.slice(1).map((x,i)=>x.at-rows[i].at).sort((a,b)=>a-b),fps=rows.length*1000/duration,maxGap=rows.length?Math.max(rows[0].at-r.openedAt,r.closedAt-rows.at(-1).at,...gaps):duration,p99=gaps[Math.min(gaps.length-1,Math.floor(gaps.length*.99))]??duration;
 check(fps>=20,'FPS below 20');check(maxGap<500,'Maximum gap >=500ms');check(p99<100,'p99 gap >=100ms');const windows=[];
 for(let t=r.openedAt;t+2000<=r.closedAt;t+=2000){const b=rows.filter(x=>x.at>=t&&x.at<t+2000),range=b.length?Math.max(...b.map(x=>x.lane))-Math.min(...b.map(x=>x.lane)):0;windows.push({start:t,frames:b.length,laneRange:range});check(b.length>=20&&range>30,'Input failed in full two-second interval')}
 return{accepted:fails.length===0,failures:fails,negativeStalls:rows.flatMap((x,i)=>x.injectedStallMs?[{injectedMs:x.injectedStallMs,observedGap:rows[i+1]?rows[i+1].at-x.at:null}]:[]),duration,frames:rows.length,fps,maxGap,p99,inputWindows:windows,times:r.times};
}
function stopBrowser(){return new Promise(resolve=>{if(!child||child.exitCode!==null)return resolve();const pid=child.pid;const proc=spawn('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});proc.once('exit',()=>{child=null;resolve()});proc.once('error',()=>{child.kill();child=null;resolve()})})}
const courses=(negative?[230345636]:[230345636,713]).flatMap(seed=>negative?[{seed,stage:'entry'}]:[{seed,stage:'entry'},{seed,stage:'continue'}]);
async function next(){clearTimeout(timer);await stopBrowser();if(current?.stage==='entry'&&fixture){const accountBody=slots.get('0'),characterBody=slots.get(String(fixture.slot));const saved=JSON.parse(characterBody);assert.equal(saved.charId,fixture.charId);assert.equal(saved.world.nativeRetained.character.charId,fixture.charId);fixture={...fixture,saveHash:digest(characterBody)};report.results.at(-1).saveHashAtProcessClose=fixture.saveHash;fs.writeFileSync(path.join(out,'genuine-fixture-'+current.seed+'.json'),JSON.stringify({prepared:fixture,accountBody,characterBody},null,2));save()}current=courses.shift();if(!current){report.finished=new Date().toISOString();report.accepted=negative?report.results.every(r=>r.summary.negativeStalls?.some(s=>s.injectedMs>=650&&s.observedGap>=600)&&r.summary.failures.includes('Maximum gap >=500ms')):report.errors.length===0&&report.results.every(r=>r.summary.accepted);process.exitCode=report.accepted?0:1;save();server.close();console.log(JSON.stringify({out,results:report.results.map(r=>({seed:r.seed,stage:r.stage,...r.summary}))}));return}
 if(current.stage==='entry'){slots.clear();fixture=null;}const profile=path.join(out,'profile-'+current.seed);fs.mkdirSync(profile,{recursive:true});
 const url='http://127.0.0.1:'+server.address().port+'/?worldmass&stage='+current.stage;
 child=spawn(process.env.FIREFOX_BIN||'C:\\Program Files\\Mozilla Firefox\\firefox.exe',['-headless','-no-remote','-profile',profile,url],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 child.stderr.on('data',d=>fs.appendFileSync(path.join(out,'firefox.stderr.log'),d));child.on('error',e=>{report.errors.push(String(e));save()});
 timer=setTimeout(async()=>{report.errors.push('Timeout '+JSON.stringify(current));save();await stopBrowser();server.close();process.exitCode=1},150000);console.log('START '+JSON.stringify(current));
}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/__save/')){const slot=decodeURIComponent(url.pathname.slice(8));if(req.method==='POST'){let body='';for await(const c of req)body+=c;JSON.parse(body);slots.set(slot,body);report.disk.push({method:'POST',slot,sha256:digest(body),bytes:Buffer.byteLength(body),stage:current.stage,seed:current.seed});res.writeHead(200,{'content-type':'application/json'});return res.end('{}')}const body=slots.get(slot)||'null';report.disk.push({method:'GET',slot,sha256:digest(body),stage:current.stage,seed:current.seed});res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(body)}
 if(url.pathname==='/qa-fixture'){res.setHeader('content-type','application/json');return res.end(JSON.stringify(fixture))}
 if(url.pathname==='/qa-report'){let body='';for await(const c of req)body+=c;const r=JSON.parse(body);r.summary=evaluate(r);report.results.push(r);
  if(r.stage==='entry'&&!r.error){fixture=r.state;const accountBody=slots.get('0'),characterBody=slots.get(String(fixture.slot));assert.ok(accountBody&&characterBody,'Genuine account/character disk writes');const s=JSON.parse(characterBody);assert.equal(s.charId,fixture.charId);assert.equal(s.world.nativeRetained.character.charId,fixture.charId);r.saveHash=digest(characterBody);fixture={...fixture,saveHash:r.saveHash};fs.writeFileSync(path.join(out,'genuine-fixture-'+r.seed+'.json'),JSON.stringify({prepared:fixture,accountBody,characterBody},null,2))}
  if(r.stage==='continue'&&!r.error){const gets=report.disk.filter(d=>d.stage==='continue'&&d.seed===r.seed&&d.slot===String(fixture.slot));assert.ok(gets.length>0,'Cold Continue must read genuine disk slot');assert.ok(gets.every(d=>d.sha256===fixture.saveHash),'Cold Continue consumed unchanged issued envelope');r.consumedSaveHash=fixture.saveHash;}save();console.log('RESULT '+JSON.stringify({seed:r.seed,stage:r.stage,...r.summary}));res.end('ok');setTimeout(next,50);return;
 }
 const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 let raw=fs.readFileSync(file),body=raw;const base=path.basename(file);if(/^main-.*\.js$/.test(base)){let source=raw.toString();const anchor='const install$1 = NativeClientRuntime.prototype.install, retire$1 = NativeClientRuntime.prototype.retire;';assert.equal(source.split(anchor).length-1,1,'Exact install timing insertion');source=source.replace(anchor,timingJS+anchor);for(const [needle,replacement] of probes){assert.equal(source.split(needle).length-1,1,'Exact timing insertion: '+needle);source=source.replace(needle,replacement)}body=Buffer.from(source+mainJS(current.seed,current.stage));report.instrumentation.push({stage:current.stage,seed:current.seed,path:url.pathname,installAnchorMatches:1,rawSha256:digest(raw),servedSha256:digest(body)})}else if(sharedDetail&&base.startsWith('shared-')&&base.endsWith('.js')){const changed=instrumentShared(raw.toString());body=Buffer.from(changed.source);report.instrumentation.push({stage:current.stage,seed:current.seed,path:url.pathname,counts:changed.counts,rawSha256:digest(raw),servedSha256:digest(body)})}else if(base.startsWith('mu-crossing-')){body=Buffer.from(raw.toString()+childJS);report.instrumentation.push({stage:current.stage,seed:current.seed,path:url.pathname,rawSha256:digest(raw),servedSha256:digest(body)})}
 const previous=report.assets[url.pathname],asset={sha256:digest(raw),bytes:raw.length};if(previous)assert.deepEqual(previous,asset,'Build bytes changed during course');report.assets[url.pathname]=asset;
 res.writeHead(200,{'content-type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html','cache-control':'no-store'});res.end(body);
}catch(e){report.errors.push(String(e.stack||e));save();res.writeHead(500);res.end('Fixture error')}});
process.on('SIGINT',async()=>{clearTimeout(timer);await stopBrowser();server.close();process.exitCode=1});server.listen(0,'127.0.0.1',next);
