// Real companion pages: responsive layout, search, deep links and planner gestures.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-site-interiors-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),mount='/arpg-game-world',types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const failures=[],results=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname.slice(mount.length);if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){if(!name.includes('portraits.js'))failures.push(name);res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),90000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+mount;
 win=new BrowserWindow({show:true,x:-4200,y:30,width:1440,height:1000,useContentSize:true,focusable:false,skipTaskbar:true,webPreferences:{backgroundThrottling:false}});
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<100;i++){if(await js('!!('+code+')'))return;await wait(50);}throw new Error('Timed out: '+code);};
 await win.webContents.debugger.attach('1.3');
 for(const page of ['database','tree','systems']){
  await win.loadURL(base+'/'+page+'/');
  if(page==='database')await until('document.querySelector(".card .hw-icon.is-ready")');
  if(page==='tree')await until('document.querySelector("#classsel option")');
  check(page+' shares the landing palette, headings and ornament',await js('getComputedStyle(document.querySelector("h1")).fontFamily.includes("Cinzel")&&["eigengrau","charcoal"].includes(document.documentElement.dataset.theme)&&getComputedStyle(document.querySelector(".pagehead"),"::after").backgroundImage.includes("gothic-rule.svg")'));
  check(page+' keeps navigation and decorative layers out of control hit areas',await js('getComputedStyle(document.querySelector(".pagehead"),"::before").pointerEvents==="none"&&document.querySelector(".hwnav [aria-current=page]")&&document.querySelector(".skip-link").getAttribute("href")==="#main"'));
  for(const width of [320,390,760,1024,1440]){
   await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await wait(60);
   check(page+' fits '+width+'px without horizontal overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
   if(width===390){
    if(page==='tree')check('mobile class selector has room for full names',await js('document.querySelector("#classsel").getBoundingClientRect().width>200'));
    await js('document.querySelector(".hwnav-toggle").click();true');
    check(page+' opens usable mobile navigation',await js('document.querySelector(".hwnav-toggle").getAttribute("aria-expanded")==="true"&&[...document.querySelectorAll(".hwnav-links a")].every(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth})'));
    await js('document.querySelector(".hwnav-toggle").click();true');
   }
  }
 }
 await win.loadURL(base+'/database/?type=skill');await until('document.querySelector(".card .hw-icon.is-ready")');
 check('database card titles have readable contrast',await js('getComputedStyle(document.querySelector(".card .cname")).color==="rgb(238, 234, 225)"'));
 const all=await js('document.querySelectorAll(".card").length');
 await js('document.querySelector(".facet button").focus();document.querySelector(".facet button").click();true');
 check('database filters still narrow the results',await js('document.querySelector(".facet button[aria-pressed=true]")&&document.querySelectorAll(".card").length<'+all));
 check('filter selections preserve keyboard focus and expose their count',await js('document.activeElement.matches(".facet button[aria-pressed=true]")&&document.querySelector(".filter-status").textContent==="1 selected"'));
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});await wait(350);
 check('compact filters fold automatically without losing selections',await js('!document.querySelector(".filter-panel").open&&document.querySelector(".filter-status").textContent==="1 selected"&&document.querySelectorAll(".card").length<'+all));
 await js('document.querySelector(".filter-summary").focus();true');await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await wait(350);
 check('keyboard opens mobile filters without covering results',await js('document.querySelector(".filter-panel").open&&document.querySelector(".layout section").getBoundingClientRect().top>=document.querySelector("#filters").getBoundingClientRect().bottom'));
 await js('document.querySelector(".grp summary").click();document.querySelector("#q").value="fire";document.querySelector("#q").dispatchEvent(new Event("input",{bubbles:true}));true');await wait(250);
 check('search preserves collapsed groups and active filters',await js('!document.querySelector(".grp").open&&document.querySelector(".filter-status").textContent==="1 selected"'));
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await wait(350);
 check('explicit panel choice survives a breakpoint change',await js('document.querySelector(".filter-panel").open&&!document.querySelector(".grp").open'));
 await js('document.querySelector("#clearf").click();document.querySelector("#q").value="Shield Up";document.querySelector("#q").dispatchEvent(new Event("input",{bubbles:true}));true');await wait(220);
 await js('document.querySelector(".card[data-id=shield_up]").click();true');await until('document.querySelector("#drawer.open .hw-icon.is-ready")');await until('getComputedStyle(document.querySelector("#drawer")).transform==="none"');
 check('database search opens the illustrated skill detail',await js('document.querySelector("#drawer-title").textContent==="Shield Up"&&new URLSearchParams(location.search).get("id")==="shield_up"'));
 for(const width of [320,390,1440]){await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await wait(100);check('detail header and close button fit '+width,await js('(()=>{const d=document.querySelector("#drawer"),c=d.querySelector(".close"),r=c.getBoundingClientRect();return d.scrollWidth<=d.clientWidth&&r.right<=innerWidth&&r.left>=0})()'));}
 await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));true');await wait(300);
 check('Escape closes detail and restores scrolling',await js('document.querySelector("#drawer").hidden&&document.body.style.overflow===""'));
 await js('document.querySelector("#q").value="";document.querySelector("#q").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("#tabs [data-type=unique]").click();true');await wait(220);
 check('categories without facets use the full result area',await js('getComputedStyle(document.querySelector("#filters")).display==="none"&&document.querySelector(".layout section").getBoundingClientRect().width>document.querySelector(".layout").getBoundingClientRect().width*.95'));
 const tree=JSON.parse(fs.readFileSync(path.join(root,'data/passives.json'))),classId='apothecary',start=tree.starts[classId],target=tree.nodes.find(n=>n.id===tree.adjacency[start][0]);
 await win.loadURL(base+'/tree/?c='+classId);await until('document.querySelector("#classsel option")');
 await js('document.querySelector("#search").value='+JSON.stringify(target.id)+';document.querySelector("#search").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector(".canvas-wrap").scrollIntoView({behavior:"instant",block:"center"});true');await wait(200);
 const point=await js('(()=>{const r=document.querySelector("#tree").getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()');
 win.webContents.sendInputEvent({type:'mouseMove',...point});await until('document.querySelector("#tip.on")');
 check('planner hover shows the canonical node tooltip',await js('document.querySelector("#tip").textContent.includes('+JSON.stringify(target.name)+')'));
 win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});await wait(100);
 check('planner pointer can allocate through the decorative frame',await js('document.querySelector("#ptsval").textContent==="1"&&document.querySelector("#snid").textContent==='+JSON.stringify(target.id)));
 await js('Object.defineProperty(navigator,"clipboard",{value:{writeText:async value=>{window.testSharedBuild=value}}});document.querySelector("#sharebtn").click();true');
 const share=await js('window.testSharedBuild');
 check('share preserves class and allocated path',!!share&&new URL(share).searchParams.get('n')===target.id);
 await win.loadURL(share);await until('document.querySelector("#classsel option")');
 check('shared build restores its points and bonuses',await js('document.querySelector("#ptsval").textContent==="1"&&document.querySelector("#totals").textContent.length>20'));
 await js('document.querySelector("#resetbtn").click();true');check('reset refunds planned nodes',await js('document.querySelector("#ptsval").textContent==="0"&&!new URLSearchParams(location.search).has("n")'));
 await win.loadURL(base+'/systems/');await until('document.querySelectorAll(".hwdot").length===6');await js('document.querySelectorAll(".hwdot")[3].click();true');await wait(250);
 check('Systems section navigation reaches its chapter',await js('location.hash==="#sec-3"'));
 check('Systems has one ornament at each section boundary',await js('getComputedStyle(document.querySelector(".pagehead+.blk"),"::before").content==="none"'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check('reduced motion removes card movement',await js('getComputedStyle(document.querySelector(".btn")).transitionDuration==="0s"'));
 check('all companion assets resolve under the Pages subpath',failures.length===0);
 console.log('INTERIORS '+results.filter(Boolean).length+'/'+results.length);if(results.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
