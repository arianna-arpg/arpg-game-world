// Resource lifecycle regressions against real pages, using the installed browser.
// Optional HW_EFFICIENCY_BASELINE=<git ref> and HW_EFFICIENCY_GIT_DIR provide
// a negative control. Test profiles self-delete; all generated media stays in RAM.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-site-efficiency-'));
process.on('uncaughtException',error=>{console.error(error);app.exit(1);});
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/media/clips/index.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({clips:{cleave:{name:'Cleave',sources:[{src:'media/announcement-v2/announcement-v2-720.h264.mp4',type:'video/mp4'}]}}}));}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 if(process.env.HW_EFFICIENCY_BASELINE&&/^\/assets\/(abyss|home-atmosphere|memory-art|database|world-stories|vocation-tree|cinema-theater|home|vocation-gallery)\.js$/.test(name)){
  res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(execFileSync('git',[...(process.env.HW_EFFICIENCY_GIT_DIR?['--git-dir='+process.env.HW_EFFICIENCY_GIT_DIR]:[]),'show',process.env.HW_EFFICIENCY_BASELINE+':site'+name],{maxBuffer:5000000}));
 }
 const size=fs.statSync(file).size,range=/bytes=(\d*)-(\d*)/.exec(req.headers.range||'');
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
 if(range){const start=Number(range[1]||0),end=range[2]?Math.min(Number(range[2]),size-1):size-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});return fs.createReadStream(file,{start,end}).pipe(res);}
 res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res);
});
function check(name,ok){checks.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),120000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 win=new BrowserWindow({show:true,x:-4200,y:30,width:1440,height:1000,useContentSize:true,focusable:false,skipTaskbar:true,webPreferences:{backgroundThrottling:false}});win.webContents.setAudioMuted(true);
 win.webContents.session.webRequest.onBeforeRequest({urls:['https://*/*']},(_,cb)=>cb({cancel:true}));
 win.webContents.debugger.attach('1.3');await win.loadURL('about:blank');await win.webContents.debugger.sendCommand('Page.enable');
 await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.eff={abyss:0,background:0,memory:0,uploads:0,canvasWrites:0,sourceWrites:0,timeouts:0,barReads:0};
  const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.parentElement?.classList.contains('bg-veil'))eff.abyss++;if(this.canvas.id==='bg-canvas')eff.background++;return clear.apply(this,a);};
  const read=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...a){if(this.canvas.width===128&&this.canvas.height===288)eff.barReads++;return read.apply(this,a);};
  const upload=WebGLRenderingContext.prototype.texImage2D;WebGLRenderingContext.prototype.texImage2D=function(...a){if(this.canvas.classList.contains('memory-canvas'))eff.uploads++;return upload.apply(this,a);};
  const draw=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...a){if(this.canvas.classList.contains('memory-canvas'))eff.memory++;return draw.apply(this,a);};
  for(const name of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name);Object.defineProperty(HTMLCanvasElement.prototype,name,{...d,set(v){eff.canvasWrites++;d.set.call(this,v);}});}
  const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(v){eff.sourceWrites++;src.set.call(this,v);}});
  const timeout=window.setTimeout;window.setTimeout=function(...a){eff.timeouts++;return timeout.apply(this,a);};
  const shader=WebGLRenderingContext.prototype.getShaderParameter;WebGLRenderingContext.prototype.getShaderParameter=function(...a){if(location.search.includes('failShader')&&this.canvas.classList.contains('memory-canvas'))return false;return shader.apply(this,a);};
 `});
 const js=c=>win.webContents.executeJavaScript(c),until=async c=>{for(let i=0;i<140;i++){if(await js('!!('+c+')'))return;await wait(50);}throw new Error('Timed out: '+c);};
 const cover=async value=>js(`document.documentElement.classList.toggle('hwcine-covered',${value});document.dispatchEvent(new CustomEvent('hw:cinema-coverage',{detail:{covered:${value}}}));true`);
 const hidden=async value=>js(`Object.defineProperty(document,'hidden',{configurable:true,value:${value}});document.dispatchEvent(new Event('visibilitychange'));true`);
 await win.loadURL(base+'/?cinema=off');await until('document.querySelector(".hero-scenery.memory-ready")&&eff.abyss>2');await wait(250);
 const source=await js('eff.uploads');await js(`document.querySelector('.hero-scenery img').style.objectPosition='48% 51%';true`);await wait(180);
 console.log('CROP uploads '+(await js('eff.uploads')-source));check('crop changes preserve the existing GPU texture',await js('eff.uploads')===source);
 await js('window.savedNodes=__hwbg.nodes;window.savedCanvasWrites=eff.canvasWrites;for(let i=0;i<40;i++)dispatchEvent(new Event("resize"));true');await wait(180);
 console.log('NO-OP RESIZE canvas writes '+await js('eff.canvasWrites-savedCanvasWrites'));
 check('unchanged resize preserves backing stores and particle identities',await js('eff.canvasWrites===savedCanvasWrites&&__hwbg.nodes===savedNodes'));
 await js('__hwobs.blink();true');await wait(80);await cover(true);await wait(60);
 const held=await js('({...eff})');await wait(250);const covered=await js('({...eff})');
 console.log('COVERED draws '+JSON.stringify({abyss:covered.abyss-held.abyss,background:covered.background-held.background,memory:covered.memory-held.memory}));
 check('every background renderer stops under the opaque cinema',covered.abyss===held.abyss&&covered.background===held.background&&covered.memory===held.memory);
 check('cinema coverage cancels an in-flight Observer glance',await js('__hwobs.state.eye===0'));
 await cover(false);await until('eff.abyss>'+held.abyss+'&&eff.background>'+held.background+'&&eff.memory>'+held.memory);
 check('uncovering resumes all visible ambient layers',true);
 await hidden(true);await wait(60);const asleep=await js('({...eff})');await wait(180);
 check('hidden pages perform no ambient canvas work',await js(`eff.abyss===${asleep.abyss}&&eff.background===${asleep.background}&&eff.memory===${asleep.memory}`));await hidden(false);
 await js('dispatchEvent(new Event("pagehide"));true');await wait(60);const away=await js('({...eff})');await wait(150);
 check('page departure cancels all ambient frame owners',await js(`eff.abyss===${away.abyss}&&eff.background===${away.background}&&eff.memory===${away.memory}`));await js('dispatchEvent(new Event("pageshow"));true');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait(180);
 const still=await js('({...eff})');await wait(180);check('reduced motion leaves every ambient canvas still',await js(`eff.abyss===${still.abyss}&&eff.background===${still.background}&&eff.memory===${still.memory}`));
 win.setContentSize(1380,920);await wait(250);check('a real resize repaints the reduced-motion abyss',await js('eff.abyss')>still.abyss);
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await js('document.querySelector("#world").scrollIntoView({behavior:"instant"});true');await wait(200);
 const motion=await js(`(()=>{const b=document.querySelector('[data-world-story][aria-selected=true]'),before=eff.timeouts;for(let i=0;i<60;i++)b.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:20+i,clientY:20}));return eff.timeouts-before})()`);
 console.log('CURRENT STORY timers '+motion);check('moving within the current story schedules no new intent',motion===0);
 await win.loadURL(base+'/?cinema=off&failShader=1');await until('document.querySelector(".hero-scenery img").complete');await wait(250);
 await js('document.querySelector(".hero-scenery img").style.objectPosition="42% 50%";true');await wait(150);
 check('failed shader initialization retains the readable static fallback',await js('!document.querySelector(".hero-scenery").classList.contains("memory-ready")&&getComputedStyle(document.querySelector(".hero-scenery img")).opacity!=="0"'));

 // Identity, image loading and drawer races on the actual database.
 await win.loadURL(base+'/database/?type=skill&q=fire');await until('document.querySelectorAll(".card").length>3');await wait(300);
 await js('window.cardsBefore=[...document.querySelectorAll(".card")];window.imagesBefore=cardsBefore.map(c=>c.querySelector("img"));window.srcBefore=eff.sourceWrites;document.querySelector("#q").value="fire ";document.querySelector("#q").dispatchEvent(new Event("input"));true');await wait(300);
 const unchanged=await js('({same:cardsBefore.every((c,i)=>c===document.querySelectorAll(".card")[i]),writes:eff.sourceWrites-srcBefore})');console.log('EQUIVALENT QUERY '+JSON.stringify(unchanged));check('equivalent queries preserve all cards and icon sources',unchanged.same&&unchanged.writes===0);
 await js('window.savedCards=new Map([...document.querySelectorAll(".card")].map(c=>[c.dataset.id,c]));document.querySelector("#sort").value="name";document.querySelector("#sort").dispatchEvent(new Event("change"));true');
 check('sorting reuses each existing result card',await js('[...document.querySelectorAll(".card")].every(c=>savedCards.get(c.dataset.id)===c)'));
 await js('document.querySelector("#q").value="fireball";document.querySelector("#q").dispatchEvent(new Event("input"));true');await wait(300);
 check('narrowing a search retains surviving card and artwork identities',await js('document.querySelectorAll(".card").length>0&&[...document.querySelectorAll(".card")].every(c=>savedCards.get(c.dataset.id)===c)'));
 await js('document.querySelector(".card").click();window.drawerHead=document.querySelector("#drawer .dhead");document.querySelector(".card").click();true');
 check('reselecting an open detail preserves its content',await js('drawerHead===document.querySelector("#drawer .dhead")'));
 await js('document.querySelector("#drawer .close").click();document.querySelector(".card").click();true');await wait(350);
 check('a stale close timer cannot erase a reopened drawer',await js('!document.querySelector("#drawer").hidden&&!!document.querySelector("#drawer .dhead")'));
 await win.loadURL(base+'/database/?type=skill&id=cleave');await until('document.querySelector(".dclip video")?.readyState>=2&&!document.querySelector(".dclip video").paused');
 await cover(true);await wait(100);check('covered drawer clips pause their decoder',await js('document.querySelector(".dclip video").paused'));
 await cover(false);await until('!document.querySelector(".dclip video").paused');check('visible drawer clips resume after uncovering',true);
 await js('document.querySelector("#drawer").scrollTop=10000;true');await wait(180);check('offscreen drawer clips pause',await js('document.querySelector(".dclip video").paused'));
 await js('document.querySelector("#drawer").scrollTop=0;true');await until('!document.querySelector(".dclip video").paused');await hidden(true);
 check('hidden-page drawer clips pause',await js('document.querySelector(".dclip video").paused'));await hidden(false);await until('!document.querySelector(".dclip video").paused');
 await js('window.oldClip=document.querySelector(".dclip video");document.querySelector("#drawer .close").click();true');
 check('closing releases the preview media source',await js('oldClip.paused&&!oldClip.getAttribute("src")&&[...oldClip.querySelectorAll("source")].every(s=>!s.hasAttribute("src"))'));

 // A full-frame, generated film proves readbacks stop only after detection.
 await js(`(async()=>{await HWCinema.preload();const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d'),stream=c.captureStream(25),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm'});const timer=setInterval(()=>{ctx.fillStyle='#606070';ctx.fillRect(0,0,160,90);},40);const blob=await new Promise(resolve=>{rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));rec.start();setTimeout(()=>rec.stop(),800);});clearInterval(timer);stream.getTracks().forEach(t=>t.stop());window.filmURL=URL.createObjectURL(blob);HWCinema.register('efficiency',{title:'Generated test film',silent:true,loop:true,rim:true,aspect:16/9,sources:[{family:'webm',height:90,src:filmURL,type:'video/webm'}],exit:{kind:'fade'}});HWCinema.play('efficiency',{preview:true});})()`);
 await until('HWCinemaTheater.current?.state==="playing"');await wait(350);
 const timers=await js('(()=>{const before=eff.timeouts;for(let i=0;i<60;i++)HWCinemaTheater.current.el.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,clientX:i,clientY:30}));return eff.timeouts-before})()');console.log('CINEMA MOVEMENT timers '+timers);check('cinema movement reuses one inactivity timer',timers===0);
 const reads=await js('eff.barReads');await wait(850);console.log('FULL-FRAME extra readbacks '+(await js('eff.barReads')-reads));check('full-frame detection stops redundant video pixel readbacks',reads>0&&await js('eff.barReads')===reads);
 await hidden(true);check('hidden cinema releases its frame callback',await js('!HWCinemaTheater.current.raf&&HWCinemaTheater.current.video.paused'));await hidden(false);
 await js('HWCinemaTheater.current.exit();true');await until('HWCinemaTheater.current.state==="closed"');await js('URL.revokeObjectURL(filmURL);true');
 console.log('EFFICIENCY '+checks.filter(Boolean).length+'/'+checks.length);if(checks.some(ok=>!ok))process.exitCode=1;
}catch(error){console.error(error);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}});
