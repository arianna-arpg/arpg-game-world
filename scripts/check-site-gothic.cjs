// Real homepage: illustrated decks, collection selection, failures, touch and motion.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-gothic-check-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
let requests=[],failArt=false;
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';requests.push(name);
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/shared/index.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<html data-page="systems"><div data-deck="biomes" data-count="3"></div><div data-showcase></div><script src="/assets/decks.js"></script><script src="/assets/showcase.js"></script></html>');}
 if(failArt&&(/\/art\/field-guide\//.test(name)&&!name.endsWith('/journal.webp')||name.endsWith('/collection/supports.webp'))){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
 win.webContents.debugger.attach('1.3');
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<80;i++){if(await js('!!('+code+')'))return true;await wait(50);}return false;};
 const base='http://127.0.0.1:'+server.address().port;
 const deck='document.querySelector(".field-guide")',card='document.querySelector(".hwdk-card")',tip='document.querySelector(".hwdk-tip")';
 const painted='[...document.querySelectorAll(".hwdk-plate img")].every(i=>i.complete&&i.naturalWidth>0)';
 const load=async()=>{requests=[];await win.loadURL(base);await until('document.querySelectorAll(".hwdk-card").length===6 && document.querySelector(".hwsc-chip")');};
 const open=async()=>{await js(deck+'.open=true;'+deck+'.scrollIntoView({behavior:"instant",block:"start"});true');await until(painted);};
 await load();
 check('closed field guide requests no card paintings',!requests.some(p=>p.includes('/art/field-guide/')));
 await open();
 check('all six visible cards receive decorative illustrations',await js(painted+' && [...document.querySelectorAll(".hwdk-plate")].every(p=>p.getAttribute("aria-hidden")==="true" && p.querySelector("img").alt==="")'));
 const totals=['biomes','events'].map(k=>JSON.parse(fs.readFileSync(path.join(root,'data/'+k+'.json'),'utf8')).length);
 check('the complete place and encounter pools remain available',await js('[...document.querySelectorAll(".hwdk-count")].every((n,i)=>n.textContent.includes('+JSON.stringify(totals)+'[i]))'));
 const before=await js('[...document.querySelectorAll(".hwdk-nm")].map(n=>n.textContent).join()');
 await js('document.querySelector(".hwdk-shuffle").click();true');
 check('shuffle changes the spread without losing illustrations',await js('[...document.querySelectorAll(".hwdk-nm")].map(n=>n.textContent).join()')!==before&&await js('document.querySelectorAll(".hwdk-illustrated").length===6'));
 check('each spread favors distinct illustration families',await js('[...document.querySelectorAll(".hwdk-grid")].every(g=>new Set([...g.querySelectorAll("img")].map(i=>i.getAttribute("src"))).size===3)'));
 // The off-screen window cannot take OS focus; dispatch its delegated keyboard focus event.
 await js(card+'.focus({preventScroll:true});'+card+'.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));dispatchEvent(new Event("scroll"));true');
 check('keyboard focus opens the matching accessible tooltip',await js(tip+'.classList.contains("on") && '+card+'.getAttribute("aria-describedby")==="hwdk-tooltip" && '+tip+'.textContent.includes('+card+'.querySelector(".hwdk-nm").textContent)'));
 await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));true');
 check('Escape removes the tooltip and description relationship',await js(tip+'.getAttribute("aria-hidden")==="true" && !'+card+'.hasAttribute("aria-describedby")'));
 await js(card+'.click();'+deck+'.open=false;true');await wait(80);
 check('closing the guide also hides its tooltip',await js('!'+tip+'.classList.contains("on")'));
 await js('document.querySelector(".collection").scrollIntoView({behavior:"instant",block:"start"});true');
 await until('document.querySelector(".hwsc-painting img").naturalWidth>0');
 check('only the selected category painting has loaded',new Set(requests.filter(p=>p.includes('/art/collection/'))).size===1);
 for(const [key,type] of [['supports','support'],['uniques','unique'],['skills','skill']]){
  await js('document.getElementById("hwsc-tab-'+key+'").click();true');await until('document.querySelector(".hwsc-painting img").complete');
  check(key+' switches image, copy, items and tab semantics together',await js('document.querySelector(".hwsc-painting img").src.endsWith("/'+key+'.webp") && document.querySelector(".hwsc-legend h3").textContent===HWCollectionArt.scenes.'+key+'.title && [...document.querySelectorAll(".hwsc-chip")].every(c=>c.dataset.type==="'+type+'") && document.querySelector(".hwsc-rack").getAttribute("aria-labelledby")==="hwsc-tab-'+key+'"'));
 }
 await js('document.getElementById("hwsc-tab-skills").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));true');
 check('keyboard selection moves focus and painting',await js('document.activeElement.id==="hwsc-tab-supports" && document.querySelector(".hwsc-illustration").dataset.collection==="supports"'));
 for(const w of [1440,1024,760,390,320]){await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:false});await wait(60);check(w+'px has no horizontal overflow or clipped item labels',await js('document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll(".hwsc-item-name")].every(e=>e.scrollWidth<=e.clientWidth+1)'));}
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check('reduced motion stops collection breathing',await js('getComputedStyle(document.querySelector(".hwsc-painting img")).animationName==="none"'));
 await js('document.documentElement.dataset.theme="charcoal";document.documentElement.style.setProperty("--bg-rgb","9,13,16");true');
 check('alternate palette retains a fitting mobile layout',await js('document.documentElement.scrollWidth<=innerWidth'));
 failArt=true;await load();await open();
 check('failed field paintings recover to the neutral journal',await js(painted+' && [...document.querySelectorAll(".hwdk-plate img")].every(i=>i.src.endsWith("/journal.webp"))'));
 await js('document.querySelector(".collection").scrollIntoView({behavior:"instant"});document.getElementById("hwsc-tab-supports").click();true');await until('document.querySelector(".hwsc-painting img").hidden');
 check('failed collection painting keeps the copy and usable items',await js('document.querySelector(".hwsc-painting img").hidden && document.querySelectorAll(".hwsc-chip").length===14 && document.querySelector(".hwsc-legend h3").textContent.length>0'));
 await js('document.querySelector(".hwsc-shuffle").click();true');
 check('shuffling does not expose a previously failed painting',await js('document.querySelector(".hwsc-painting img").hidden'));
 failArt=false;await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'hover',value:'none'}]});
 await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await load();await open();
 await js(card+'.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));'+card+'.focus();'+card+'.dispatchEvent(new MouseEvent("click",{bubbles:true,detail:1}));true');
 check('first touch opens the illustrated card tooltip',await js(tip+'.classList.contains("on")'));
 await js(card+'.dispatchEvent(new MouseEvent("click",{bubbles:true,detail:1}));true');
 check('second touch closes the same card',await js('!'+tip+'.classList.contains("on")'));
 await js(card+'.dispatchEvent(new MouseEvent("click",{bubbles:true,detail:1}));document.body.click();true');
 check('outside touch closes the card',await js('!'+tip+'.classList.contains("on")'));
 await win.loadURL(base+'/shared/');await until('document.querySelector(".hwsc-chip") && document.querySelector(".hwdk-card")');
 check('shared widgets work without homepage art registries',await js('document.querySelectorAll(".hwsc-chip").length===18 && document.querySelectorAll(".hwdk-card").length===3 && !document.querySelector(".hwsc-illustration") && !document.querySelector(".hwdk-plate") && getComputedStyle(document.querySelector(".hwdk-cardbody")).gap==="8px"'));
 console.log('GOTHIC '+results.filter(Boolean).length+'/'+results.length);if(results.some(x=>!x))process.exitCode=1;
}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}});
