// Real class slides, image races and resource ownership. No browser download.
// Run: npx electron scripts/check-site-class-transitions.cjs
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-class-transition-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/classes.json'),'utf8'));
const roster=['berserker','sorcerer','necromancer','ranger','assassin','lancer'].map(id=>catalogue.find(c=>c.id===id));
let delayed='',failed='',requests=[];
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';requests.push(name);
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/data/classes.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(roster));}
 if(failed&&name.includes(failed)){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const send=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600'});
  // Stable deals while retaining the production deck/shuffle implementation.
  if(name==='/assets/class-deck.js')return res.end(fs.readFileSync(file,'utf8').replace('random = Math.random','random = () => .999'));
  fs.createReadStream(file).pipe(res);
 };
 if(delayed&&name.includes(delayed))setTimeout(send,900);else send();
});
function check(name,ok){checks.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,focusable:false,skipTaskbar:true,webPreferences:{backgroundThrottling:false}});
 win.webContents.session.webRequest.onBeforeRequest({urls:['https://*/*']},(_,cb)=>cb({cancel:true}));
 win.webContents.debugger.attach('1.3');await win.loadURL('about:blank');await win.webContents.debugger.sendCommand('Page.enable');
 await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`
  // Disable speculative warming so delayed/failed on-demand requests are real.
  Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,addEventListener(){}}});
  window.classWrites=0;window.classUploads=0;
  window.slowDisplayed='';window.slowPreparation='';
  const decode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=function(...args){
   const ready=decode.apply(this,args),displayed=this.closest('.class-art');
   const delay=displayed&&slowDisplayed&&this.src.includes(slowDisplayed)?1200:!displayed&&slowPreparation&&this.src.includes(slowPreparation)?900:0;
   return delay?ready.then(()=>new Promise(resolve=>setTimeout(resolve,delay))):ready;
  };
  const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){if(this.closest('.class-art'))classWrites++;src.set.call(this,value);}});
  const upload=WebGLRenderingContext.prototype.texImage2D;
  WebGLRenderingContext.prototype.texImage2D=function(...args){if(this.canvas.closest('.class-art'))classUploads++;return upload.apply(this,args);};
 `});
 const js=c=>win.webContents.executeJavaScript(c),until=async c=>{for(let i=0;i<160;i++){if(await js('!!('+c+')'))return;await wait(40);}throw Error('Timed out: '+c);};
 const art='document.querySelector(".class-art")',img=art+'.querySelector("img")',stage='document.querySelector("[data-class-stage]")';
 const name='document.querySelector(".class-panel:not([hidden]) h3").textContent';
 const stable='!'+stage+'.hasAttribute("aria-busy")';
 const select=async id=>js('document.querySelector('+JSON.stringify('[data-class="'+id+'"]')+').click();true');
 const load=async()=>{await win.loadURL(base+'/?cinema=off');await until('!document.querySelector("[data-class-shuffle]").hidden');await js(stage+'.scrollIntoView({block:"center",behavior:"instant"});true');await until(img+'.complete && '+img+'.naturalWidth>0');await wait(250);};
 await load();
 await until(art+'.classList.contains("memory-ready")');
 await js('window.originalImage='+img+';window.originalCanvas='+art+'.querySelector("canvas");true');
 const before=await js('({writes:classWrites,uploads:classUploads})');
 check('initial deal keeps its selected panel coherent',await js(name+'==="Berserker" && '+stable));
 await select('sorcerer');
 check('selection responds while the old painting is still present',await js('document.querySelector("[data-class=sorcerer]").getAttribute("aria-selected")==="true" && '+img+'.src.includes("berserker.webp")'));
 await until(art+'.getAnimations().length>0');await wait(45);
 check('outgoing image and copy stay visible while sliding together',await js('(()=>{const a=getComputedStyle('+art+'),c=getComputedStyle(document.querySelector(".class-panel:not([hidden]) .class-copy"));return Number(a.opacity)>=.59&&Number(a.opacity)<1&&Math.abs(Number(a.opacity)-Number(c.opacity))<.05&&new DOMMatrixReadOnly(a.transform).m41<0;})()'));
 await until(img+'.src.includes("sorcerer.webp")');
 check('replacement painting arrives from the selected direction without vanishing',await js('(()=>{const s=getComputedStyle('+art+');return Number(s.opacity)>=.59&&Number(s.opacity)<.95&&new DOMMatrixReadOnly(s.transform).m41>0;})()'));
 await until(stable);
 check('new class settles at its original position and releases animations',await js(name+'==="Sorcerer" && getComputedStyle('+art+').opacity==="1" && getComputedStyle('+art+').transform==="none" && '+stage+'.getAnimations({subtree:true}).length===0'));
 check('one selection writes and uploads its artwork only once',await js(`classWrites===${before.writes+1}&&classUploads===${before.uploads+1}`));
 const classRequests=()=>requests.filter(p=>p.includes('/art/classes/')||p.endsWith('/berserker.webp')).length;
 const count=await js('({writes:classWrites,uploads:classUploads})'),requestCount=classRequests();
 await js('for(let i=0;i<25;i++)document.querySelector("[data-class=sorcerer]").click();true');await wait(100);
 check('reselecting the active class performs no image or animation work',await js(`classWrites===${count.writes}&&classUploads===${count.uploads}&&${stage}.getAnimations({subtree:true}).length===0`)&&classRequests()===requestCount);
 await select('berserker');await until(img+'.src.includes("berserker.webp")');
 check('selecting an earlier tab reverses the slide direction',await js('new DOMMatrixReadOnly(getComputedStyle('+art+').transform).m41<0'));
 await until(stable);await select('sorcerer');await until(stable);
 delayed='necromancer.webp';await select('necromancer');await wait(90);
 check('slow art keeps the current view readable',await js(name+'==="Sorcerer" && getComputedStyle('+art+').opacity==="1"'));
 await select('berserker');await wait(60);await select('sorcerer');await until(stable);await wait(950);
 check('late images cannot overwrite the latest selection',await js(name+'==="Sorcerer" && '+img+'.src.includes("sorcerer.webp") && document.querySelectorAll(".class-panel:not([hidden])").length===1'));
 delayed='ranger.webp';await js('document.querySelector("[data-class-shuffle]").click();true');await wait(60);
 check('shuffle preserves outgoing copy until its art is ready',await js(name+'==="Sorcerer" && document.querySelector("[data-class=ranger]").getAttribute("aria-selected")==="true"'));
 await select('assassin');await until(stable);await wait(950);
 check('selection during shuffle commits only the latest dealt class',await js(name+'==="Assassin" && '+img+'.src.includes("assassin.webp") && document.querySelector(".class-panel:not([hidden]) a").href.includes("id=assassin")'));
 failed='lancer.webp';await select('lancer');await until(stable);
 check('failed art reveals the spectral fallback and correct copy',await js(name+'==="Lancer" && '+img+'.src.includes("/hand.webp") && '+img+'.naturalWidth>0'));
 failed='';delayed='';await select('ranger');await until(stable);
 check('one image and canvas survive every transition',await js(img+'===originalImage && '+art+'.querySelector("canvas")===originalCanvas && '+art+'.querySelectorAll("canvas").length===1'));
 await js('slowDisplayed="assassin.webp";slowPreparation="lancer.webp";true');
 await select('assassin');await until(img+'.src.includes("assassin.webp")');await select('lancer');await wait(180);
 check('interrupting displayed-image decode keeps painting and copy paired',await js(name+'==="Assassin" && '+img+'.src.includes("assassin.webp") && Number(getComputedStyle('+art+').opacity)>.95'));
 await until(stable);await wait(400);
 check('a cancelled decode cannot restore obsolete copy or artwork',await js(name+'==="Lancer" && '+img+'.src.includes("lancer.webp")'));
 await js('slowDisplayed="";slowPreparation="";true');await select('ranger');await until(stable);
 await js('document.querySelector("[data-class=ranger]").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));true');
 check('keyboard selection moves focus immediately',await js('document.activeElement.dataset.class==="assassin"'));
 await until(stable);check('keyboard navigation completes its slide',await js(name+'==="Assassin"'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await select('lancer');
 check('reduced motion switches immediately without effects',await js(name+'==="Lancer" && '+stable+' && getComputedStyle('+art+').transform==="none" && '+stage+'.getAnimations({subtree:true}).length===0'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await select('assassin');await until(art+'.getAnimations().length>0');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await until(stable);
 check('motion preference changes settle an in-flight transition',await js(name+'==="Assassin" && '+stable+' && '+stage+'.getAnimations({subtree:true}).length===0'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await select('ranger');await until(art+'.getAnimations().length>0');await js('dispatchEvent(new Event("pagehide"));true');await wait(500);
 check('page departure releases effects without stale callbacks',await js(name+'==="Ranger" && '+stable+' && '+stage+'.getAnimations({subtree:true}).length===0'));
 await js('dispatchEvent(new Event("pageshow"));true');win.setContentSize(390,844);await wait(200);
 await select('assassin');await until(stable);
 check('narrow layouts retain framing without horizontal overflow',await js(name+'==="Assassin" && document.documentElement.scrollWidth<=innerWidth && '+img+'===originalImage'));
 console.log('CLASS TRANSITIONS '+checks.filter(Boolean).length+'/'+checks.length);if(checks.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
