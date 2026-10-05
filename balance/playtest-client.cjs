// Isolated ordinary-input playtesting. No stat grants, teleports or arbitrary JS endpoint.
// electron balance/playtest-client.cjs --build balance/reports/<fixed-build> --session <unique-id>
const {app,BrowserWindow}=require('electron');
const {VIEWPORT,makeViewportGuard}=require('./playtest-viewport.cjs');
try {
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const arg=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
const id=arg('--session'),requested=arg('--build');
if(!id||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)||!requested)throw Error('Supply --session <lowercase-id> and --build <fixed local build>.');
const dir=path.join(__dirname,'reports','playtests',id),build=path.resolve(root,requested);
if(!build.startsWith(root+path.sep)||!fs.existsSync(path.join(build,'index.html')))throw Error('Build must be inside this checkout and contain index.html.');
fs.mkdirSync(dir,{recursive:true});
const metaFile=path.join(dir,'session.json'),eventsFile=path.join(dir,'actions.jsonl');
function fingerprint(folder) {
 const hash=crypto.createHash('sha256');
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).forEach(e=>{
  const f=path.join(d,e.name);
  if(e.isSymbolicLink())throw Error('Use a self-contained fixed build.');
  if(e.isDirectory())walk(f);
  else if(e.isFile()){hash.update(path.relative(folder,f).replaceAll('\\','/'));hash.update(fs.readFileSync(f));}
 });walk(folder);return hash.digest('hex');
}
const hash=fingerprint(build),prior=fs.existsSync(metaFile)?JSON.parse(fs.readFileSync(metaFile,'utf8')):null;
if(prior&&(prior.build!==build||prior.fingerprint!==hash))throw Error('This session belongs to a different build. Use a new session id.');
const meta=prior??{id,build,fingerprint:hash,gamePort:0,capture:0,createdAt:new Date().toISOString()};
const saveMeta=()=>fs.writeFileSync(metaFile,JSON.stringify(meta,null,2));
const event=data=>fs.appendFileSync(eventsFile,JSON.stringify({at:new Date().toISOString(),...data})+'\n');
app.setPath('userData',path.join(dir,'profile'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const server=http.createServer((req,res)=>{
  let url,pathname;try{url=new URL(req.url,'http://localhost');pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  const f=path.resolve(build,'.'+(pathname==='/'?'/index.html':pathname));
  if(!f.startsWith(build+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');
  fs.createReadStream(f).pipe(res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(meta.gamePort,'127.0.0.1',resolve);});
 meta.gamePort=server.address().port;saveMeta(); // Native Continue must return to this same origin.
 const win=new BrowserWindow({show:false,...VIEWPORT,resizable:false,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const viewportGuard=makeViewportGuard(win,event);viewportGuard.constrain();
 const evaluate=code=>win.webContents.executeJavaScript(code);
 await win.loadURL('http://127.0.0.1:'+meta.gamePort);
 await evaluate("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});");
 const health=()=>evaluate("({fatal:__game.crash().fatal})");
 async function capture() {
  const stem=path.join(dir,String(++meta.capture).padStart(4,'0'));saveMeta();
  const data=await evaluate("document.getElementById('game').toDataURL('image/png')");
  const canvas=stem+'.canvas.png',page=stem+'.page.png';
  fs.writeFileSync(canvas,Buffer.from(data.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,200));
  fs.writeFileSync(page,(await win.webContents.capturePage()).toPNG());
  return {canvas,page}; // Canvas proves the world frame; page includes native HTML HUD and panels.
 }
 function validateInput(input) {
  if(!Array.isArray(input)||input.length>64)throw Error('input must contain at most 64 ordinary device events.');
  for(const e of input) {
   if(!e||!['keyDown','keyUp','char','mouseMove','mouseDown','mouseUp','mouseWheel'].includes(e.type))throw Error('Unsupported device event.');
   if(e.type.startsWith('key')||e.type==='char') {
    if(typeof e.keyCode!=='string'||!e.keyCode.length||e.keyCode.length>64)throw Error('A keyCode is required.');
   } else {
    if(!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<0||e.y<0||e.x>=1280||e.y>=850)throw Error('Pointer coordinates must be inside the 1280 × 850 view.');
    if(['mouseDown','mouseUp'].includes(e.type)&&!['left','middle','right'].includes(e.button))throw Error('A pointer button is required.');
    if(e.type==='mouseWheel'&&![e.deltaX??0,e.deltaY??0].every(Number.isFinite))throw Error('Wheel deltas must be finite.');
   }
  }
 }
 let busy=false;
 const bridge=http.createServer((req,res)=>{
  let body='';req.on('data',d=>{body+=d;if(body.length>65536)req.destroy();});
  req.on('end',async()=>{
   if(busy){res.writeHead(409);return res.end('A playtest action is still running.');}
   busy=true;
   try{
    if(req.method!=='POST')throw Error('Use a JSON POST.');
    const m=JSON.parse(body||'{}'),allowed=['input','frames','capture','readUI','health','close'];
    if(Object.keys(m).some(k=>!allowed.includes(k)))throw Error('Unknown action; this harness accepts ordinary device input and visible UI only.');
    if(m.frames!==undefined&&(!Number.isInteger(m.frames)||m.frames<1||m.frames>600))throw Error('frames must be an integer from 1 to 600.');
    if(m.input!==undefined)validateInput(m.input);
    await viewportGuard.beforeInput();
    event({action:m});
    if(m.input){for(const e of m.input)win.webContents.sendInputEvent(e);await new Promise(r=>setTimeout(r,40));
      if(win.isDestroyed()){event({nativeWindowClosed:true});res.end(JSON.stringify({closed:true}));return;}
      await evaluate('void 0');}
    const result={};
    if(m.frames)result.simulation=await evaluate(`(()=>{const before=__game.world(),start=before?.time;
      __game.step(${m.frames},16.7);const after=__game.world(),end=after?.time;
      const continuous=before===after&&Number.isFinite(start)&&Number.isFinite(end)&&end>=start;
      return {requestedFrames:${m.frames},worldSeconds:continuous?end-start:null,worldChanged:before!==after};})()`);
    if(m.readUI)result.ui=await evaluate(`Array.from(document.querySelectorAll('button,input,select,a,[role="button"]')).filter(e=>{
      const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&s.display!=='none';
    }).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||e.title||'').slice(0,300),
      disabled:!!e.disabled,x:r.x,y:r.y,width:r.width,height:r.height};})`);
    if(m.capture)result.images=await capture();
    if(m.health)result.health=await health();
    result.viewport=await viewportGuard.afterAction();
    event({result});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
    if(m.close)setTimeout(()=>app.quit(),50);
   }catch(error){
    if(win.isDestroyed()){event({nativeWindowClosed:true});if(!res.destroyed)res.end(JSON.stringify({closed:true}));}
    else{event({error:String(error)});res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:String(error)}));}
   }
   finally{busy=false;}
  });
 });
 await new Promise((resolve,reject)=>{bridge.once('error',reject);bridge.listen(0,'127.0.0.1',resolve);});
 meta.bridgePort=bridge.address().port;saveMeta();
 event({started:{build,fingerprint:hash,gamePort:meta.gamePort,bridgePort:meta.bridgePort}});
 console.log(JSON.stringify({session:dir,endpoint:'http://127.0.0.1:'+meta.bridgePort,fingerprint:hash}));
 win.on('closed',()=>{event({closed:true});bridge.close();server.close();app.quit();});
}).catch(error=>{console.error(error.stack||String(error));app.exit(1);});
app.on('window-all-closed',()=>app.quit());
} catch(error) {console.error(error.stack||String(error));app.exit(1);}
