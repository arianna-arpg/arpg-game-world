// Exercise the real homepage, including delayed Vocation content and rapid reversal.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-disclosure-check-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/classes.json'),'utf8'));
const roster=['berserker','sorcerer','necromancer','ranger','assassin','lancer'].map(id=>catalogue.find(c=>c.id===id));
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/data/classes.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(roster));}
 if(name==='/assets/class-deck.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(fs.readFileSync(path.join(root,name),'utf8').replace('random = Math.random','random = () => .999'));}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const send=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);};
 if(name.endsWith('/vocation-gallery.js'))setTimeout(send,230);else send();
});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let n=0;n<100;n++){if(await js('!!('+code+')'))return true;await wait(40);}return false;};
 win.webContents.debugger.attach('1.3');await win.loadURL('about:blank');
 await win.webContents.debugger.sendCommand('Page.enable');
 await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`window.classResizes=0;for(const key of ['width','height']){const p=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);Object.defineProperty(HTMLCanvasElement.prototype,key,{...p,set(value){if(this.closest('.class-art'))classResizes++;p.set.call(this,value);}});}`});
 await win.loadURL('http://127.0.0.1:'+server.address().port);
 await until('document.querySelectorAll(".disclosure-fold").length===2 && !document.querySelector("[data-class-shuffle]").hidden');
 check('both panels begin closed with native summaries',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>!d.open&&d.firstElementChild.tagName==="SUMMARY")'));
 check('collapsed panels center their summaries between the rules',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>{const b=d.getBoundingClientRect(),s=d.querySelector("summary").getBoundingClientRect();return Math.abs(s.top-b.top-(b.bottom-s.bottom))<1})'));
 for(const name of ['field-guide','vocation-gallery']){
  const d='document.querySelector(".'+name+'")',f=d+'.querySelector(".disclosure-fold")';
  await js(d+'.scrollIntoView({block:"start",behavior:"instant"});'+d+'.querySelector("summary").focus();window.fullSummary='+d+'.querySelector("summary").getBoundingClientRect().height;window.fullClass=document.querySelector("[data-class-stage]").getBoundingClientRect().height;window.beforeResizes=classResizes;'+d+'.querySelector("summary").click();true');
  // Sample the header's actual rendered intermediate state without depending
  // on the first stone texture rasterization finishing within a fixed delay.
  const furl=await js('(()=>{const s='+d+'.querySelector("summary"),a=s.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=125;const r=s.getBoundingClientRect(),style=getComputedStyle(s),ok=s.inert&&r.height<fullSummary&&r.height>0&&Number(style.opacity)<1&&new DOMMatrixReadOnly(style.transform).m42<0;a.play();return ok})()');
  if(name==='vocation-gallery')check('class artwork and type pass through intermediate sizes instead of snapping',await js('(()=>{const art=document.querySelector(".class-art"),a=art.getAnimations().find(a=>a.effect.getKeyframes()[0].width);if(!a)return false;a.pause();a.currentTime=240;const frames=a.effect.getKeyframes(),w=art.getBoundingClientRect().width,ok=w<parseFloat(frames[0].width)&&w>parseFloat(frames[1].width)&&art.hasAttribute("data-memory-resizing");a.play();return ok})()'));
  check(name+' visibly unfolds instead of jumping open',await until(d+'.open&&'+f+'.getAnimations().length>0&&'+f+'.getBoundingClientRect().height>0&&'+f+'.getBoundingClientRect().height<'+f+'.firstElementChild.getBoundingClientRect().height'));
  check(name+' invitation furls upwards as content opens',furl);
  check(name+' carries its lower rule with the moving panel edge',await js('(()=>{const d='+d+',s=getComputedStyle(d,"::after");return s.content!=="none"&&Math.abs(parseFloat(s.bottom)+parseFloat(s.height)/2)<1})()'));
  check(name+' finishes with content unclipped and interactive',await until(d+'.open&&!'+f+'.getAnimations().length&&!'+f+'.inert&&getComputedStyle('+f+').overflow==="visible"'));
  check(name+' exchanges its invitation for a keyboard-accessible close control',await js('(()=>{const s='+d+'.querySelector("summary"),c='+d+'.querySelector(".disclosure-close");return s.getBoundingClientRect().height===0&&s.getAttribute("aria-hidden")==="true"&&document.activeElement===c&&!c.closest("[inert]")&&getComputedStyle(c).visibility==="visible"})()'));
  if(name==='vocation-gallery'){
   check('opening Vocations brings the full class copy into a shorter frame',await js('document.querySelector("[data-class-stage]").getBoundingClientRect().height<fullClass*.65&&document.querySelector(".class-copy").scrollHeight<=document.querySelector(".class-panel:not([hidden])").clientHeight'));
   check('compaction releases its effects and avoids frame-by-frame canvas reallocations',await js('!document.querySelector("[data-class-stage]").classList.contains("is-compacting")&&!document.querySelector(".class-art").style.height&&classResizes-beforeResizes<=8'));
  }
  await js(d+'.querySelector(".disclosure-close").click();true');await wait(90);
  check(name+' closes progressively and prevents focus entering departing content',await js(d+'.open&&'+f+'.inert&&'+f+'.getAnimations().length>0'));
  check(name+' settles fully closed',await until('!'+d+'.open&&!'+f+'.getAnimations().length'));
  check(name+' restores its invitation and keyboard focus',await js('document.activeElement==='+d+'.querySelector("summary")&&!'+d+'.querySelector("summary").inert&&'+d+'.querySelector("summary").getBoundingClientRect().height===fullSummary'));
  if(name==='vocation-gallery')check('closing Vocations restores the full class painting',await until('document.querySelector("[data-class-stage]").getBoundingClientRect().height===fullClass'));
  await js(d+'.querySelector("summary").click();true');await wait(70);await js(d+'.querySelector(".disclosure-close").click();true');await wait(70);await js(d+'.querySelector("summary").click();true');
  check(name+' reverses rapid toggles without getting stuck',await until(d+'.open&&!'+f+'.getAnimations().length&&!'+f+'.inert'));
 }
 await until('document.querySelector("[data-vocation-gallery]").dataset.vocationReady==="true" && !document.querySelector("[data-vocation-panel]").hidden');
 await js('window.classCanvas=document.querySelector(".class-art canvas");document.querySelector("[data-class=sorcerer]").click();true');
 check('compact class selection updates its calling and retains its painting surface',await until('document.querySelector("[data-vocation-class-label]").textContent.includes("Sorcerer")&&!document.querySelector("[data-class-stage]").hasAttribute("aria-busy")&&document.querySelector(".class-art canvas")===classCanvas'));
 await js('document.querySelector("[data-class-shuffle]").click();true');
 check('the original shuffle deals new classes and updates their Vocations',await until('document.querySelector("[data-vocation-class-label]").textContent.includes("Ranger")&&!document.querySelector("[data-class-stage]").hasAttribute("aria-busy")&&document.querySelector(".class-panel:not([hidden]) h3").textContent==="Ranger"'));
 for(const width of [1440,860,760,390,320]){
  await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await wait(80);
  check(width+'px close controls align without overflow',await js('(()=>{const boxes=[...document.querySelectorAll(".disclosure-close")].map(e=>e.getBoundingClientRect());return Math.abs(boxes[0].right-boxes[1].right)<1&&document.documentElement.scrollWidth<=innerWidth})()'));
  await js('document.querySelector(".vocation-panel").scrollIntoView({block:"start",behavior:"instant"});true');await wait(80);
  check(width+'px keeps the same class chooser and shuffle within reach',await js('(()=>{const c=document.querySelector(".class-choice-controls"),r=c.getBoundingClientRect(),b=c.querySelector("button").getBoundingClientRect(),nav=document.querySelector("header[data-hwnav]").getBoundingClientRect();return r.top>=nav.bottom&&r.top<nav.bottom+12&&b.top>=r.top&&r.bottom<innerHeight&&document.querySelectorAll("[data-class-shuffle]").length===1})()'));
 }
 check('each compact section owns its shared lower boundary once',await js('[...document.querySelectorAll(".chapter-strip,.field-guide,.vocation-gallery")].every(e=>getComputedStyle(e,"::after").content!=="none")&&[...document.querySelectorAll(".world,.classes,.builds,.collection")].every(e=>getComputedStyle(e,"::before").content==="none")'));
 await js('document.querySelector("[data-class-stage]").scrollIntoView({block:"center",behavior:"instant"});document.querySelector("[data-class=assassin]").click();true');
 await until('!document.querySelector("[data-class-stage]").hasAttribute("aria-busy")');
 check('compact mobile art stays subdued without fighting the class slide opacity',await js('getComputedStyle(document.querySelector(".class-art")).opacity==="1"&&getComputedStyle(document.querySelector(".class-art canvas")).opacity==="0.32"&&document.querySelector(".class-panel:not([hidden]) h3").textContent==="Assassin"'));
 check('chapter links have equal space above and below',await js('(()=>{const s=document.querySelector(".chapter-strip"),b=s.getBoundingClientRect();return [...s.querySelectorAll("a")].every(a=>{const r=a.getBoundingClientRect();return Math.abs(r.top-b.top-(b.bottom-r.bottom))<1})})()'));
 await js('document.querySelector(".field-guide .disclosure-close").click();true');await until('!document.querySelector(".field-guide").open');
 check('open and closed controls keep the same right alignment',await js('Math.abs(document.querySelector(".field-guide summary>b").getBoundingClientRect().right-document.querySelector(".vocation-gallery .disclosure-close").getBoundingClientRect().right)<1'));
 await js('document.querySelector(".field-guide summary").click();true');await until('!document.querySelector(".field-guide .disclosure-fold").getAnimations().length');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.querySelector(".disclosure-close").click());true');
 check('reduced motion closes immediately without an animation',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>!d.open&&!d.querySelector(".disclosure-fold").getAnimations().length)'));
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.querySelector("summary").click());true');
 check('reduced motion opens immediately and keeps content usable',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>d.open&&!d.querySelector(".disclosure-fold").inert&&!d.querySelector(".disclosure-fold").getAnimations().length)'));
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.open=false);true');await wait(60);
 check('native close also restores headers and class proportions',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>!d.classList.contains("is-unfurled")&&!d.querySelector("summary").inert)&&!document.querySelector(".classes").classList.contains("is-vocation-open")'));
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.open=true);true');await wait(60);
 check('native open applies the same accessible compact presentation',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>d.classList.contains("is-unfurled")&&d.querySelector("summary").inert)&&document.querySelector(".classes").classList.contains("is-vocation-open")'));
 console.log(results.filter(Boolean).length+'/'+results.length+' disclosure checks passed');
 win.destroy();server.close();clearTimeout(timeout);app.exit(results.every(Boolean)?0:1);
}catch(e){console.error(e);if(win&&!win.isDestroyed())win.destroy();server.close();clearTimeout(timeout);app.exit(1);}});
