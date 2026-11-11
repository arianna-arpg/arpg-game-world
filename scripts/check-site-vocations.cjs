// npx electron scripts/check-site-vocations.cjs [--out <folder>]
// Real page disclosure, image delivery races, fallbacks and graphics preferences.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-vocation-profile-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
let requests=[],delayGrave=false,failHunter=false,failClass=false;
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';requests.push(name);
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if((failHunter&&name.endsWith('/wildstalker.webp'))||(failClass&&name.includes('/art/classes/'))){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const send=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);};
 if(delayGrave&&name.endsWith('/gravebinder.webp'))setTimeout(send,600);else send();
});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results=[];
function check(name,ok){results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{
 let win;const timeout=setTimeout(()=>{console.error('Vocation checks timed out');app.exit(1);},60000);
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
  win.webContents.debugger.attach('1.3');
  await win.loadURL('about:blank');
  await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`
    const original=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args){const result=original.apply(this,args),c=this.canvas;
      if(!c.classList.contains('memory-canvas'))return result;c.qaDraws=(c.qaDraws||0)+1;
      const p=this.getParameter(this.CURRENT_PROGRAM);c.qaUniforms={};
      for(const name of ['uLiving','uMotion','uPageBg']){const loc=this.getUniformLocation(p,name);c.qaUniforms[name]=ArrayBuffer.isView(this.getUniform(p,loc))?Array.from(this.getUniform(p,loc)):this.getUniform(p,loc);}
      return result;};`});
  const js=async code=>{try{return await win.webContents.executeJavaScript(code);}catch(error){throw new Error(code+'\n'+error.message);}};
  const until=async code=>{for(let i=0;i<90;i++){if(await js('!!('+code+')'))return true;await wait(60);}return false;};
  const base='http://127.0.0.1:'+server.address().port;
  await win.loadURL(base);await until('document.querySelector(".hero-scenery.memory-ready")');
  await js('document.fonts.ready.then(()=>true)');
  check('opening uses source-anchored living landscape',await js('document.querySelector(".hero-scenery canvas").qaUniforms.uLiving===1'));
  check('shader fades match the first-paint palette',await js('(()=>{const rgb=getComputedStyle(document.documentElement).getPropertyValue("--bg-rgb").split(",").map(Number);return document.querySelector(".hero-scenery canvas").qaUniforms.uPageBg.every((n,i)=>Math.abs(n-rgb[i]/255)<.00001)})()'));
  check('closed gallery loads neither catalogue nor Vocation paintings',!requests.some(p=>p.includes('vocation-gallery.js')||p.includes('vocation-scenes.js')||p.includes('/art/vocations/')));
  const disclosure='document.querySelector("[data-vocation-gallery]")';
  const image='document.querySelector("[data-vocation-art] img")';
  const name='document.querySelector("[data-vocation-name]").textContent';
  const stable='!document.querySelector("[data-vocation-panel]").hasAttribute("aria-busy")';
  await js(disclosure+'.querySelector("summary").click();'+disclosure+'.scrollIntoView({behavior:"instant",block:"start"});true');
  await until(name+'==="Warbringer" && '+stable);
  check('opening requests only the first painting',new Set(requests.filter(p=>p.includes('/art/vocations/'))).size===1);
  check('five public callings appear and the secret remains absent',await js('document.querySelectorAll("[data-vocation]").length===5 && !'+disclosure+'.textContent.includes("Greenwarden") && !'+image+'.alt.includes("saplings")'));
  check('one reusable gallery canvas receives living light',await until('document.querySelector("[data-vocation-art] canvas").qaUniforms?.uLiving===2'));
  delayGrave=true;
  await js('document.getElementById("vocation-tab-gravebinder").click();document.getElementById("vocation-tab-spellblade").click();true');
  await until(name+'==="Spellblade" && '+stable);await wait(750);
  check('rapid selections keep the most recent painting and copy',await js(name+'==="Spellblade" && '+image+'.src.includes("spellblade.webp")'));
  failHunter=true;await js('document.getElementById("vocation-tab-wildstalker").click();true');await until(stable);
  check('failed art retains the matching previous scene and reports recovery',await js(name+'==="Spellblade" && document.querySelector("[data-vocation][aria-selected=true]").dataset.vocation==="spellblade" && document.querySelector("[data-vocation-status]").textContent.includes("could not load")'));
  failHunter=false;await js('document.getElementById("vocation-tab-wildstalker").click();true');await until(name+'==="Wildstalker" && '+stable);
  check('a failed painting can be retried',await js(name+'==="Wildstalker"'));
  await js('document.getElementById("vocation-tab-wildstalker").dispatchEvent(new KeyboardEvent("keydown",{key:"End",bubbles:true}));true');await until(name+'==="Hierophant" && '+stable);
  check('keyboard End moves selection and focus',await js('document.activeElement.id==="vocation-tab-hierophant" && '+name+'==="Hierophant"'));
  check('unrevealed secret image has never been requested',!requests.some(p=>p.endsWith('/greenwarden.webp')));
  await js('document.querySelector("[data-vocation-secret] button").click();true');await until(name+'==="Greenwarden" && '+stable);
  check('explicit secret reveal adds and selects its painting',await js('document.querySelectorAll("[data-vocation]").length===6 && '+image+'.src.includes("greenwarden.webp")'));
  check('all selections reuse one canvas',await js('document.querySelectorAll("[data-vocation-art] canvas").length===1'));
  await js(disclosure+'.querySelector("summary").click();true');await wait(150);
  const draws=await js('document.querySelector("[data-vocation-art] canvas").qaDraws');await wait(200);
  check('closed gallery stops rendering',await js('document.querySelector("[data-vocation-art] canvas").qaDraws')===draws);
  await js(disclosure+'.querySelector("summary").click();true');await wait(150);
  check('reopening preserves the selected calling',await js(name+'==="Greenwarden"'));
  win.setContentSize(390,844);await wait(180);
  await js('document.querySelector("[data-vocation-panel]").scrollIntoView({behavior:"instant",block:"center"});true');
  check('narrow layout has no horizontal overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait(180);
  check('reduced motion disables interior animation',await js('document.querySelector("[data-vocation-art] canvas").qaUniforms.uMotion===0'));
  const stopped=await js('document.querySelector("[data-vocation-art] canvas").qaDraws');await wait(180);
  check('reduced motion stops repeated painting draws',await js('document.querySelector("[data-vocation-art] canvas").qaDraws')===stopped);
  failClass=true;await js('document.querySelector("[data-class-shuffle]").click();true');
  await until('document.querySelector(".class-art img").getAttribute("src")==="assets/art/hand.webp"');
  check('failed class imagery falls back to the spectral hand',await js('document.querySelector(".class-art img").getAttribute("src")==="assets/art/hand.webp"'));
  const out=process.argv.indexOf('--out');if(out>=0){const folder=path.resolve(process.argv[out+1]);fs.mkdirSync(folder,{recursive:true});win.setContentSize(1440,1000);await wait(200);await js(disclosure+'.scrollIntoView({behavior:"instant",block:"start"});true');await wait(150);fs.writeFileSync(path.join(folder,'vocation-gallery.png'),(await win.webContents.capturePage()).toPNG());}
  console.log('VOCATIONS '+results.filter(Boolean).length+'/'+results.length);if(results.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}
 finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
