// Real homepage loading budgets. Uses the installed Electron, no browser download.
// HW_PERF_BASELINE=<git ref> optionally records an earlier page without budgets.
// HW_PERF_GIT_DIR can select isolated Git metadata when the checkout is shared.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
const {execFileSync}=require('node:child_process');
const {gzipSync}=require('node:zlib');
app.setPath('userData',makeTempDir('hollow-performance-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
let requests=[],cinemaEnabled=false,failCollection=false,compressed=false;
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'&&!cinemaEnabled){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/data/collection.json'&&failCollection){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const baseline=process.env.HW_PERF_BASELINE && (name==='/index.html'||name.startsWith('/assets/')&&!name.includes('/art/'));
 const data=baseline?execFileSync('git',[...(process.env.HW_PERF_GIT_DIR?['--git-dir='+process.env.HW_PERF_GIT_DIR]:[]),'show',process.env.HW_PERF_BASELINE+':site'+name],{maxBuffer:5000000}):fs.readFileSync(file);
 requests.push({name,bytes:data.length});
 const gzip=compressed&&/\.(html|css|js|json|svg)$/.test(file);
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store',...(gzip?{'Content-Encoding':'gzip'}:{})});res.end(gzip?gzipSync(data):data);
});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
 win.webContents.session.webRequest.onBeforeRequest({urls:['https://*/*']},(details,cb)=>cb({cancel:true}));
 win.webContents.debugger.attach('1.3');
 await win.loadURL('about:blank');
 await win.webContents.debugger.sendCommand('Page.enable');
 await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.qaContexts=0;window.qaDraws={};window.qaBackground=0;window.qaShatters=[];
  const context=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){const r=context.call(this,type,...args);if(r&&type==='webgl')qaContexts++;if(r&&this.classList.contains('hwcine-gl'))qaShatters.push(r);return r;};
  const clear=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='bg-canvas')qaBackground++;return clear.apply(this,args);};
  const draw=WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays=function(...args){const k=this.canvas.parentElement?.className||'detached';qaDraws[k]=(qaDraws[k]||0)+1;return draw.apply(this,args);};
 `});
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<160;i++){if(await js('!!('+code+')'))return true;await wait(50);}return false;};
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/');await wait(2200);
 const initial={requests:requests.length,bytes:requests.reduce((s,r)=>s+r.bytes,0),dataBytes:requests.filter(r=>r.name.endsWith('.json')).reduce((s,r)=>s+r.bytes,0),contexts:await js('qaContexts')};
 console.log('INITIAL '+JSON.stringify(initial));
 if(!process.env.HW_PERF_BASELINE){
  check('initial page stays under 1.5 MB of local resources',initial.bytes<1500000);
  check('startup game data stays under 100 KB',initial.dataBytes<100000);
  check('only the opening painting allocates WebGL at startup',initial.contexts===1);
  check('closed guide and collection request no data at startup',!requests.some(r=>/\/(collection|biomes|events|skills|supports|uniques)\.json$/.test(r.name)));
 }
 // Approach, without bringing the section onscreen: preparation must lead scrolling.
 await js('scrollTo({top:document.querySelector(".collection").getBoundingClientRect().top+scrollY-innerHeight-400,behavior:"instant"});true');
 const early=await until('document.querySelector(".hwsc-chip")');
 if(!process.env.HW_PERF_BASELINE)check('collection is ready before it enters the viewport',early&&await js('document.querySelector(".collection").getBoundingClientRect().top>innerHeight'));
 await js('document.querySelector(".collection").scrollIntoView({behavior:"instant"});true');
 await until('document.querySelector(".hwsc-chip")');
 for(const key of ['skills','supports','uniques']){
  await js('document.getElementById("hwsc-tab-'+key+'").click();document.querySelector(".hwsc-shuffle").click();true');
  if(!process.env.HW_PERF_BASELINE)check(key+' keeps 18 inspectable items after shuffling',await js('document.querySelectorAll(".hwsc-chip").length===18'));
 }
 if(!process.env.HW_PERF_BASELINE){
  check('landing page never requests the full database payloads',!requests.some(r=>/\/(skills|supports|uniques)\.json$/.test(r.name)));
  check('unopened Vocations remain private and unloaded',!requests.some(r=>/vocation-gallery\.js|vocation-catalog|\/art\/vocations\//.test(r.name)));
  await js('scrollTo({top:0,behavior:"instant"});true');await wait(200);
  const before=await js('JSON.stringify(qaDraws)');await wait(200);
  const after=await js('qaDraws');const old=JSON.parse(before);
  check('offscreen paintings stop drawing',Object.keys(after).filter(k=>!k.includes('hero-scenery')).every(k=>after[k]===old[k]));
  // The collection remains recoverable after a transient failure, including
  // a direct deep link that bypasses all anticipatory scroll loading.
  failCollection=true;
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?qa=retry#builds');
  await until('document.querySelector("[data-showcase] button")');
  check('a direct link exposes a usable retry after failed data',await js('document.querySelector("[data-showcase] button")?.textContent==="Try again"'));
  failCollection=false;
  await js('document.querySelector("[data-showcase] button").click();true');
  check('retry restores the collection without reloading the page',await until('document.querySelectorAll(".hwsc-chip").length===18'));

  // Exercise the real theater with an in-memory generated film. No downloads,
  // recordings or media fixtures are left on disk.
  cinemaEnabled=true;
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?cinema=off');
  await js('HWCinema.preload().then(()=>true)');
  await js(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
    const ctx=canvas.getContext('2d'),stream=canvas.captureStream(25),chunks=[];
    const rec=new MediaRecorder(stream,{mimeType:'video/webm'});
    const timer=setInterval(()=>{ctx.fillStyle='hsl('+performance.now()%360+' 20% 20%)';ctx.fillRect(0,0,160,90);},40);
    const blob=await new Promise(resolve=>{rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));rec.start();setTimeout(()=>rec.stop(),1200);});
    clearInterval(timer);stream.getTracks().forEach(track=>track.stop());
    window.qaFilm=URL.createObjectURL(blob);
    HWCinema.register('qa',{title:'Generated test film',silent:true,loop:true,rim:true,aspect:16/9,sources:[{family:'webm',height:90,src:qaFilm,type:'video/webm'}],exit:{kind:'shatter',pace:2}});
  })()`);
  await js('HWCinema.play("qa",{preview:true});true');
  check('generated film reaches playback',await until('HWCinemaTheater.current?.state==="playing"'));
  const held=await js('({background:qaBackground,draws:JSON.stringify(qaDraws)})');await wait(200);
  check('covered background and paintings pause during the film',await js('qaBackground')===held.background&&await js('JSON.stringify(qaDraws)')===held.draws);
  await js('window.qaTheater=HWCinemaTheater.current;qaTheater.exit();true');
  check('motion resumes as the shatter exposes the page',await until('qaBackground>'+held.background));
  await until('qaTheater.state==="closed"');await wait(100);
  check('exit releases the owned shatter renderer',await js('qaShatters.length===1 && qaShatters.every(gl=>gl.isContextLost())'));
  check('closed cinema leaves the page unlocked',await js('!document.documentElement.classList.contains("hwcine-lock")&&!document.documentElement.classList.contains("hwcine-covered")'));
  await js('HWCinema.play("qa",{preview:true});window.qaTheater=HWCinemaTheater.current;qaTheater.exit();true');
  await until('qaTheater.state==="closed"');await wait(900);
  check('instant skip cannot create a second delayed shatter context',await js('qaShatters.length===2&&qaShatters.every(gl=>gl.isContextLost())'));
  await js('URL.revokeObjectURL(qaFilm);true');

  cinemaEnabled=false;compressed=true;requests=[];
  await win.webContents.debugger.sendCommand('Network.enable');
  await win.webContents.debugger.sendCommand('Network.setCacheDisabled',{cacheDisabled:true});
  await win.webContents.debugger.sendCommand('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:500000,uploadThroughput:1000000});
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/?qa=slow');
  await until('document.querySelector(".hero-scenery img").naturalWidth>0');
  const paint=await js('performance.getEntriesByName("first-contentful-paint")[0]?.startTime');
  console.log('4 MBIT / 100 MS: first contentful paint '+Math.round(paint)+' ms (local assets, fonts/trailer excluded)');
  check('first content appears within 2.5 seconds on the controlled slower connection',paint>0&&paint<2500);
  await js('scrollTo({top:document.querySelector(".collection").getBoundingClientRect().top+scrollY-innerHeight-600,behavior:"instant"});true');
  const preparation=Date.now();
  check('slower connection still prepares collection ahead of view',await until('document.querySelectorAll(".hwsc-chip").length===18')&&await js('document.querySelector(".collection").getBoundingClientRect().top>innerHeight'));
  console.log('4 MBIT: collection preparation '+(Date.now()-preparation)+' ms');
 }
 console.log('PERFORMANCE '+results.filter(Boolean).length+'/'+results.length);if(results.some(x=>!x))process.exitCode=1;
}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}});
