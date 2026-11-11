// Run with: npx electron scripts/check-site-world.cjs [--out <capture-folder>]
// Offscreen input, delayed/failed images, reduced motion and Observer lifecycle.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-world-observer-profile-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site');
const outIndex=process.argv.indexOf('--out');
const proof=outIndex>=0 ? path.resolve(process.argv[outIndex+1]) : null;
if(proof)fs.mkdirSync(proof,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
let delayConflict=false,failRefuge=false,requests=[];
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');let p=u.pathname;if(p.endsWith('/'))p+='index.html';
 if(p==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('/* Separate cinema regression suite owns playback. */');}
 if(p.includes('/art/world/'))requests.push(p);
 if(failRefuge&&p.endsWith('/refuge.webp')){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
 const send=()=>{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);};
 if(delayConflict&&p.endsWith('/conflict.webp'))setTimeout(send,650);else send();
});
const results=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
function check(name,ok){results.push({name,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{
 let win;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port;
  win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
  win.webContents.setAudioMuted(true);
  // The offscreen window must receive genuine DOM focus without stealing OS focus.
  win.webContents.debugger.attach('1.3');

  const js=code=>win.webContents.executeJavaScript(code);
  const until=async code=>{for(let i=0;i<80;i++){if(await js('!!('+code+')'))return true;await wait(80);}return false;};
  const selected='document.querySelector("[data-world-story][aria-selected=true]").dataset.worldStory';
  const src='document.querySelector("[data-world-art] img").getAttribute("src")';
  const stable='!document.querySelector("#frontier-scene").hasAttribute("aria-busy")';
  let loadSerial=0;
  const load=async()=>{await win.loadURL(url+'/?qa='+ ++loadSerial +'#world');await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});await until('document.querySelectorAll("[data-world-story]").length===3');await js('document.fonts.ready.then(()=>true)');await wait(700);};
  const click=async id=>{await js('document.getElementById('+JSON.stringify('frontier-tab-'+id)+').scrollIntoView({block:"center",behavior:"instant"});true');await wait(100);const p=await js('(()=>{const r=document.getElementById('+JSON.stringify('frontier-tab-'+id)+').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()');win.webContents.focus();win.webContents.sendInputEvent({type:'mouseMove',...p});await wait(30);win.webContents.sendInputEvent({type:'mouseDown',...p,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',...p,button:'left',clickCount:1});};
  await load();
  check('browser title is Hollow Wake',await js('document.title==="Hollow Wake"'));
  check('expanded artwork does not create horizontal page overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
  check('catalogue creates three selectable stories',await js('document.querySelectorAll("[data-world-story]").length===3'));
  check('only the initial scene is requested on arrival',new Set(requests).size===1&&requests[0].endsWith('/discovery.webp'));
  await click('conflict');await until(stable+' && '+src+'.includes("conflict.webp")');
  check('pointer selection changes painting and caption',await js(selected+'==="conflict" && '+src+'.includes("conflict.webp") && document.querySelector("#frontier-scene figcaption").textContent==="Shifting fronts across the map"'));
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'End'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'End'});await until(stable+' && '+src+'.includes("refuge.webp")');
  check('End selects and focuses the final story',await js(selected+'==="refuge" && document.activeElement.id==="frontier-tab-refuge"'));
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'UP'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'UP'});await until(stable+' && '+src+'.includes("conflict.webp")');
  check('arrow keys move through stories',await js(selected+'==="conflict"'));
  // Trusted pointer movement alone exercises the hover path.
  const hover=await js('(()=>{const r=document.querySelector("#frontier-tab-discovery").getBoundingClientRect();return {x:Math.round(r.x+30),y:Math.round(r.y+30)}})()');
  win.webContents.sendInputEvent({type:'mouseMove',...hover});await until(stable+' && '+src+'.includes("discovery.webp")');
  check('hover changes artwork without stealing keyboard focus',await js(selected+'==="discovery" && document.activeElement.id==="frontier-tab-conflict"'));
  check('one memory canvas serves all frontier scenes',await js('document.querySelectorAll("[data-world-art] canvas").length===1'));
  delayConflict=true;await load();await click('conflict');await wait(80);await click('refuge');await wait(1000);
  check('a late image response cannot replace the latest selection',await js(selected+'==="refuge" && '+src+'.includes("refuge.webp") && '+stable));
  delayConflict=false;failRefuge=true;await load();await click('refuge');await until('document.querySelector("[data-world-feature] [role=status]").textContent.length>0');
  check('failed image keeps the previous scene and clears busy state',await js(selected+'==="discovery" && '+src+'.includes("discovery.webp") && '+stable));
  failRefuge=false;
  await js('window.scrollTo({top:Math.max(innerHeight*2,document.querySelector("#classes").offsetTop+260),behavior:"instant"});document.querySelector("[data-class]").focus({preventScroll:true});true');
  await wait(250);
  await js('__hwobs.eyeTest(1,.72,-.26);true');
  check('awake Observer rises above the page and dims content',await js('document.querySelector(".hero-mark-wrap").parentElement===document.body && getComputedStyle(document.querySelector(".hero-mark-wrap")).zIndex==="3" && Number(getComputedStyle(document.querySelector("main")).opacity)<.5'));
  check('eye tracks with the whole iris and never intercepts input',await js('document.querySelector(".hw-gaze").getAttribute("transform")==="translate(0.72 -0.26)" && getComputedStyle(document.querySelector(".hero-mark-wrap")).pointerEvents==="none"'));
  check('glance retains keyboard focus',await js('document.activeElement.matches("[data-class]")'));
  await wait(100);if(proof)fs.writeFileSync(path.join(proof,'hollow-wake-observer-preview.png'),(await win.webContents.capturePage()).toPNG());
  await js('__hwobs.eyeTest(0,0,0);__hwobs.blink();true');await wait(2300);
  check('natural glance restores the page after closing',await js('__hwobs.state.eye===0 && !document.querySelector(".hero-mark-wrap").classList.contains("is-awake") && getComputedStyle(document.querySelector("main")).opacity==="1"'));
  await js('__hwobs.eyeTest(1,0,0);true');

  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await wait(150);
  check('changing to reduced motion cancels an open eye and restores opacity',await js('__hwobs.state.eye===0 && getComputedStyle(document.querySelector("main")).opacity==="1" && getComputedStyle(document.querySelector(".hero-mark-wrap")).display==="none"'));
  await click('refuge');await until(stable+' && '+src+'.includes("refuge.webp")');
  check('reduced motion keeps story selection without a dissolve',await js(src+'.includes("refuge.webp") && getComputedStyle(document.querySelector("[data-world-art]")).transitionDuration==="0s"'));
  await load();
  check('reduced-motion arrival never starts the Observer',await js('!window.__hwobs'));
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await load();await js('__hwobs.eyeTest(1,0,0);dispatchEvent(new Event("pagehide"));true');
  check('leaving the page clears the eye and all dimming',await js('__hwobs.state.eye===0 && document.documentElement.style.getPropertyValue("--observer-reveal")==="0.000"'));
  console.log('WORLD / OBSERVER '+results.filter(x=>x.ok).length+'/'+results.length);
  if(results.some(x=>!x.ok))process.exitCode=1;
 }catch(e){console.error(e);process.exitCode=1;}finally{if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
