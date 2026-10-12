// Actual Firefox entry + cold Continue, isolated profile/storage, no WebDriver.
// Instrumentation is appended to served test copies, never production files.
// HOLLOW_WAKE_QA_DIST selects a completed build; FIREFOX_BIN selects the engine.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(process.env.HOLLOW_WAKE_QA_DIST || 'dist');
const dir = path.resolve('balance/reports/loading-firefox-' + process.pid);
fs.mkdirSync(dir, { recursive: true });
const seed = Number(process.env.HOLLOW_WAKE_QA_SEED || 230345636);
assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
const results = []; let firefox, timer;
const child = `;(()=>{
 let rows=[];
 function tick(){const s=__muCrossing.snapshot;if(s.active){
  rows.push({at:Date.now(),lane:s.lane,time:s.time,label:s.label});
  if(rows.length%12===0){const right=Math.floor(rows.length/24)%2;
   dispatchEvent(new KeyboardEvent('keyup',{code:right?'KeyA':'KeyD'}));
   dispatchEvent(new KeyboardEvent('keydown',{code:right?'KeyD':'KeyA'}));}
 }requestAnimationFrame(tick)}requestAnimationFrame(tick);
 addEventListener('message',e=>{if(e.data==='qa-frames')parent.postMessage({qaFrames:rows},'*');
  if(e.data==='qa-cancel')document.querySelector('button')?.click();});
})();`;
const parent = `<script>(async()=>{try{
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 while(!window.__game)await pause(50);await __game.hydrated();await pause(100);
 const stage=new URLSearchParams(location.search).get('stage')||'cancel';
 const frame=()=>document.getElementById('mu-loading-frame');
 const workers=[];const OriginalWorker=window.Worker;
 window.Worker=class extends OriginalWorker{constructor(url,options){super(url,options);
  if(options?.name==='world-opening-planner'){
   const row={start:Date.now(),end:0,terminated:false};workers.push(row);
   this.addEventListener('message',()=>row.end=Date.now());
   const terminate=this.terminate.bind(this);this.terminate=()=>{row.terminated=true;terminate()};
   if(stage==='cancel')setTimeout(()=>frame().contentWindow.postMessage('qa-cancel','*'),100);
  }}
 };
 // A repeatable seed which previously exposed multi-second path-admission stalls.
 const prototype=__game.world().constructor.prototype,startMass=prototype.startWorldMassAsync;
 prototype.startWorldMassAsync=function(...args){if(args[1]===undefined)args[1]=${seed};return startMass.apply(this,args)};
 const samples=new Promise(resolve=>addEventListener('message',e=>{
  if(e.source===frame().contentWindow&&e.data?.qaFrames)resolve(e.data.qaFrames)}));
 let closedAt=0;const closed=new MutationObserver(()=>{if(frame().style.display==='none')closedAt=Date.now()});
 closed.observe(frame(),{attributes:true,attributeFilter:['style']});
 const start=Date.now();
 if(stage==='continue')document.getElementById('sm-continue').click();else await __game.devStartLoadingRun();
 while(__game.loading.active)await pause(20);closed.disconnect();
 if(!closedAt)throw Error('Missing crossing visibility boundary');const end=closedAt;
 frame().contentWindow.postMessage('qa-frames','*');const rows=await samples;
 const world=__game.world();const result={stage,start,end,rows,workers,seed:world.massRuntime?.generator.run.seed,
  mass:!!world.massRuntime,fatal:__game.crash().fatal};
 await fetch('/qa-report',{method:'POST',body:JSON.stringify(result)});
 if(stage==='cancel'){await pause(100);location.href='/?worldmass&stage=entry';}
 if(stage==='entry'){world.player.invulnerable=true;__game.save();await __game.flushRunSave();location.href='/?worldmass&stage=continue';}
 }catch(e){await fetch('/qa-report',{method:'POST',body:JSON.stringify({error:e.stack||String(e)})})}})();</script>`;
function check(result) {
 assert.ifError(result.error); assert.equal(result.fatal, null);
 assert.equal(result.workers.length, 1, 'actual background opening worker is required');
 assert.ok(result.workers.every(w=>w.terminated), 'preparation workers must be retired');
 if(result.stage==='cancel') {
  assert.equal(result.mass,false,'cancelled preparation cannot publish a world');
  assert.equal(result.workers[0].end,0,'cancel must stop outstanding planning');
  return {stage:result.stage,cancelled:true};
 }
 assert.equal(result.mass,true,'the course must load the seamless runtime');
 assert.equal(result.seed,seed,'Continue must preserve the actual worldmass seed');
 const rows=result.rows, frames=rows.length;
 const gaps=rows.slice(1).map((r,i)=>r.at-rows[i].at).sort((a,b)=>a-b);
 const maxGap=Math.max(rows[0].at-result.start,result.end-rows.at(-1).at,...gaps);
 const fps=frames/((result.end-result.start)/1000), p99=gaps[Math.floor(gaps.length*.99)];
 assert.ok(frames>100 && fps>=20,'the real crossing must remain animated throughout loading');
 assert.ok(maxGap<500,'no half-second freezes: '+maxGap+' ms');
 assert.ok(p99<100,'at least 99% of crossing frames remain under 100 ms');
 const worker=result.workers[0], during=rows.filter(r=>r.at>=worker.start&&r.at<=worker.end);
 assert.ok(during.length>30,'frames must advance during actual worker preparation');
 assert.ok(Math.max(...during.map(r=>r.lane))-Math.min(...during.map(r=>r.lane))>100,'input must steer during preparation');
 // Every two-second interval needs input-responsive movement, including admission
 // after the worker returns. Merely animating before/after work cannot pass.
 for(let t=rows[0].at;t+2000<rows.at(-1).at;t+=2000){
  const batch=rows.filter(r=>r.at>=t&&r.at<t+2000);
  assert.ok(batch.length>=20 && Math.max(...batch.map(r=>r.lane))-Math.min(...batch.map(r=>r.lane))>30,
   'crossing input must continue across every preparation interval');
 }
 return {stage:result.stage,frames,fps,maxGap,p99,workerMs:worker.end-worker.start,seed:result.seed};
}
function finish(){clearTimeout(timer);firefox?.kill();server.close();}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/qa-report'){
  let body='';for await(const chunk of req)body+=chunk;
  const result=JSON.parse(body);results.push(result);res.end('ok');
  try { console.log('PASS '+JSON.stringify(check(result))); }
  catch(error){console.error(error.stack);process.exitCode=1;}
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(results,null,2));
  if(result.stage==='continue'||result.error){finish();}return;
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
 let content=fs.readFileSync(file);
 if(file.endsWith('index.html'))content=content.toString().replace('</body>',parent+'</body>');
 if(path.basename(file).startsWith('mu-crossing-'))content=content.toString()+child;
 res.end(content);
});
server.listen(0,'127.0.0.1',()=>{
 const binary=process.env.FIREFOX_BIN||(process.platform==='win32'?'C:\\Program Files\\Mozilla Firefox\\firefox.exe':'firefox');
 firefox=spawn(binary,['-headless','-no-remote','-profile',dir,'http://127.0.0.1:'+server.address().port+'/?worldmass'],
  {windowsHide:true,stdio:'ignore'});
 timer=setTimeout(()=>{console.error('Firefox loading course timed out');process.exitCode=1;finish()},240000);
 firefox.on('error',error=>{console.error(error);process.exitCode=1;finish()});
 firefox.on('exit',()=>{if(results.length!==3){console.error('Firefox exited before all courses finished');process.exitCode=1}clearTimeout(timer);server.close()});
});
