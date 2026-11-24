// Real widget handoffs, rapid intent and resource lifecycles. Self-cleaning.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-content-motion-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),wait=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
let slowSupport=true;
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const send=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);};
 if(slowSupport&&name.endsWith('/collection/supports.webp'))setTimeout(send,700);else send();
});
function check(name,ok){checks.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
 win.webContents.debugger.attach('1.3');
 const js=c=>win.webContents.executeJavaScript(c),until=async c=>{for(let i=0;i<120;i++){if(await js('!!('+c+')'))return true;await wait(40);}return false;};
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/?cinema=off');
 await js('document.querySelector(".field-guide").open=true;document.querySelector(".field-guide").scrollIntoView({behavior:"instant",block:"start"});true');
 await until('document.querySelectorAll(".hwdk-card").length===6');
 await js('window.grid=document.querySelector(".hwdk-grid");window.button=document.querySelector(".hwdk-shuffle");window.oldCard=grid.firstElementChild;window.mutations=0;new MutationObserver(r=>mutations+=r.filter(x=>x.type==="childList").length).observe(grid,{childList:true});button.focus();for(let i=0;i<12;i++)button.click();true');
 check('rapid shuffle keeps the old cards readable while preparing the next spread',await js('grid.firstElementChild===oldCard && grid.hasAttribute("data-content-changing")'));
 check('shuffle completes with only one replacement for the latest intent',await until('!grid.hasAttribute("data-content-changing") && mutations===1 && grid.firstElementChild!==oldCard'));
 check('shuffle retains the original control and keyboard focus',await js('button===document.querySelector(".hwdk-shuffle")&&document.activeElement===button&&!grid.inert&&grid.getAnimations().length===0'));
 await js('button.click();document.querySelector(".field-guide .disclosure-close").click();true');
 check('closing cancels a pending shuffle immediately',await js('!grid.hasAttribute("data-content-changing")&&!grid.getAnimations().length&&!grid.inert'));
 await until('!document.querySelector(".field-guide").open');
 await js('document.querySelector(".collection").scrollIntoView({behavior:"instant",block:"start"});true');
 await until('document.querySelectorAll(".hwsc-chip").length===18');
 await js('window.body=document.querySelector(".hwsc-body");window.painting=body.querySelector("img");window.originalSource=painting.src;window.originalChip=document.querySelector(".hwsc-chip");document.getElementById("hwsc-tab-supports").click();true');await wait(100);
 check('slow incoming art leaves the existing painting and items intact',await js('painting.src===originalSource&&document.querySelector(".hwsc-chip")===originalChip&&body.hasAttribute("data-content-changing")'));
 await js('document.getElementById("hwsc-tab-uniques").click();true');
 check('the latest category settles with matching artwork and items',await until('!body.hasAttribute("data-content-changing")&&painting.src.includes("uniques.webp")&&[...document.querySelectorAll(".hwsc-chip")].every(c=>c.dataset.type==="unique")'));
 await wait(750);
 check('a late image cannot restore the cancelled category',await js('painting.src.includes("uniques.webp")&&document.getElementById("hwsc-rack").getAttribute("aria-labelledby")==="hwsc-tab-uniques"'));
 await js('window.stableChip=document.querySelector(".hwsc-chip");document.getElementById("hwsc-tab-uniques").click();true');
 check('reselecting the active category performs no redraw or motion',await js('document.querySelector(".hwsc-chip")===stableChip&&!body.hasAttribute("data-content-changing")'));
 await js('window.staticPainting=painting;document.querySelector(".hwsc-shuffle").click();true');
 check('collection shuffle animates the item rack without breathing the painting',await until('document.querySelector(".hwsc-rack").getAnimations().length>0')&&await js('painting===staticPainting&&painting.getAnimations().length===0&&body.getAnimations().length===0'));
 await js('document.dispatchEvent(new CustomEvent("hw:cinema-coverage",{detail:{covered:true}}));true');
 check('cinema coverage settles all handoff effects and restores interaction',await js('!body.hasAttribute("data-content-changing")&&!body.inert&&!document.querySelector(".hwsc-rack").getAnimations().length'));
 await js('document.dispatchEvent(new CustomEvent("hw:cinema-coverage",{detail:{covered:false}}));true');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await js('document.querySelector(".hwsc-shuffle").click();true');
 check('reduced motion keeps the new spread immediate and still',await js('!body.hasAttribute("data-content-changing")&&document.querySelectorAll(".hwsc-chip").length===18&&!body.getAnimations({subtree:true}).length'));
 check('Hollow War passage uses an ordinary link and existing lazy artwork',await js('(()=>{const a=document.querySelector(".universe-link"),i=a.querySelector("img");return a.href==="https://arianna-arpg.github.io/hollow-war/"&&i.loading==="lazy"&&i.getAttribute("src").startsWith("assets/art/events/")&&!a.querySelector("canvas")})()'));
 for(const width of [1440,760,390,320]){
  await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  check(width+'px shared-universe passage stays inside the page',await js('document.documentElement.scrollWidth<=innerWidth&&document.querySelector(".universe-link").getBoundingClientRect().width<=innerWidth'));
 }
 console.log('CONTENT MOTION '+checks.filter(Boolean).length+'/'+checks.length);if(checks.some(x=>!x))process.exitCode=1;
 }catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
