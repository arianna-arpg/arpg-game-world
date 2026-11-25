// Real card renderer with deterministic prose lengths; no runtime testing hooks.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-reading-check-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const prose='Follow the old road into the hills, where weathered stone marks a passage through the frontier. Watch for travelers returning from the ruins and listen to their warnings before choosing the next path. Beyond the valley, a hidden settlement offers shelter, supplies, and another route into the wilderness. ';
const fixtures=[{id:'qa-long',title:'The Long Road',blurb:prose.repeat(3)+'The final sentence remains readable.',frontier:true},{id:'qa-short',title:'Wayside Refuge',blurb:'A quiet shelter beside the road.',frontier:true},{id:'qa-medium',title:'The Hidden Valley',blurb:prose,frontier:true}];
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(name==='/data/biomes.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(fixtures));}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
function check(name,pass){results.push(!!pass);console.log((pass?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),60000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
 win.webContents.debugger.attach('1.3');
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<100;i++){if(await js('!!('+code+')'))return true;await wait(40);}return false;};
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/?cinema=off');
 const guide='document.querySelector(".field-guide")';
 await js(guide+'.querySelector("summary").dispatchEvent(new FocusEvent("focus"));true');
 await until('document.querySelectorAll(".hwdk-card").length===6 && !document.querySelector("[data-guide-reading]").hidden');
 check('prefetched closed guide creates no text animations',await js('document.querySelector(".field-guide").getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains("hwdk-scroll-text")).length===0'));
 await js(guide+'.open=true;'+guide+'.scrollIntoView({behavior:"instant",block:"start"});window.qaCard=[...document.querySelectorAll(".hwdk-card")].find(c=>c.querySelector(".hwdk-nm").textContent==="The Long Road");window.qaText=qaCard.querySelector(".hwdk-scroll-text");window.qaLine=qaText.parentElement;true');
 check('visible overflowing copy receives a browser animation',await until('qaText.getAnimations().length===1 && qaText.getAnimations()[0].playState==="running"'));
 // Native toggle, downloaded fonts and image sizing can legitimately remeasure
 // the reader on first reveal. Sample steady reading after those have settled.
 await js('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
 await until(guide+'.classList.contains("is-unfurled") && [...document.querySelectorAll(".hwdk-plate img")].every(i=>i.complete)');
 check('compact text frame retains all prose without ellipsis',await js('getComputedStyle(qaLine).webkitLineClamp==="none" && qaText.textContent.endsWith("The final sentence remains readable.") && qaLine.clientHeight<=parseFloat(getComputedStyle(qaLine).lineHeight)*3+1'));
 check('short descriptions never animate',await js('[...document.querySelectorAll(".hwdk-card")].find(c=>c.querySelector(".hwdk-nm").textContent==="Wayside Refuge").querySelector(".hwdk-scroll-text").getAnimations().length===0'));
 await js('window.qaAnimation=qaText.getAnimations()[0];qaAnimation.currentTime=6500;window.qaHeight=qaCard.getBoundingClientRect().height;true');
 const initialTime=await js('qaAnimation.currentTime');await wait(180);
 check('copy advances without hovering or changing card height',await js('qaAnimation.currentTime>'+initialTime+' && Math.abs(qaCard.getBoundingClientRect().height-qaHeight)<1 && getComputedStyle(qaText).transform!=="none"'));
 await js('qaCard.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,relatedTarget:document.body}));true');
 check('entering a card resets text and preserves its popup',await js('qaAnimation.currentTime<250 && document.querySelector(".hwdk-tip").classList.contains("on") && document.querySelector(".hwdk-tip").textContent.includes("The Long Road")'));
 await js('qaAnimation.currentTime=7000;window.qaTip=document.querySelector(".hwdk-tip").firstElementChild;for(let i=0;i<50;i++)qaText.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,relatedTarget:qaLine}));true');
 check('moving inside one card neither restarts text nor rebuilds the popup',await js('qaAnimation.currentTime>=7000 && document.querySelector(".hwdk-tip").firstElementChild===qaTip'));
 await js('qaCard.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));true');
 check('keyboard focus also restarts from the top',await js('qaAnimation.currentTime<250'));
 await js('qaAnimation.currentTime=8000;document.querySelector("[data-guide-reading]").click();qaAnimation.ready.then(()=>true)');
 const pausedTime=await js('qaAnimation.currentTime');await wait(150);
 check('Pause text freezes the current reading position',await js('qaAnimation.playState==="paused" && qaAnimation.currentTime==='+pausedTime+' && document.querySelector("[data-guide-reading]").getAttribute("aria-pressed")==="true"'));
 await js('document.querySelector("[data-guide-reading]").click();true');await wait(100);
 check('Resume text continues the same animation',await js('qaText.getAnimations()[0]===qaAnimation && qaAnimation.currentTime>'+pausedTime));
 await js('qaAnimation.currentTime=qaAnimation.effect.getKeyframes()[2].offset*qaAnimation.effect.getTiming().duration;qaAnimation.pause();true');
 check('scroll reaches the final line within the original box',await js('qaText.getBoundingClientRect().bottom<=qaLine.getBoundingClientRect().bottom+1'));
 await js('qaCard.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,relatedTarget:document.body}));document.querySelector(".collection").scrollIntoView({behavior:"instant",block:"start"});true');await wait(100);
 const offscreenTime=await js('qaAnimation.currentTime');await wait(150);
 check('offscreen text stops advancing',await js('qaAnimation.playState==="paused" && qaAnimation.currentTime==='+offscreenTime));
 await js('qaCard.scrollIntoView({behavior:"instant",block:"center"});true');await until('qaAnimation.playState==="running"');
 await js('document.dispatchEvent(new CustomEvent("hw:cinema-coverage",{detail:{covered:true}}));true');
 check('cinema coverage pauses descriptions',await js('qaAnimation.playState==="paused"'));
 await js('document.dispatchEvent(new CustomEvent("hw:cinema-coverage",{detail:{covered:false}}));true');
 check('uncovering the page resumes descriptions',await until('qaAnimation.playState==="running"'));
 await js(guide+'.querySelector(".disclosure-close").click();true');await wait(30);
 check('closing animation immediately suspends descriptions',await js('qaAnimation.playState==="paused"'));
 await until('!'+guide+'.open');await js(guide+'.querySelector("summary").click();true');await until('!document.querySelector(".disclosure-fold").getAnimations().length');
 await js('qaCard.scrollIntoView({behavior:"instant",block:"center"});true');await until('qaAnimation.playState==="running"');
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await js('qaCard.scrollIntoView({behavior:"instant",block:"center"});true');await wait(150);
 check('phone layout recalculates the overflowing text without expanding the card',await js('qaText.getAnimations().length===1 && document.documentElement.scrollWidth<=innerWidth && qaLine.clientHeight<=parseFloat(getComputedStyle(qaLine).lineHeight)*3+1'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait(80);
 check('reduced motion removes automatic text movement',await js('qaText.getAnimations().length===0 && document.querySelector("[data-guide-reading]").disabled'));
 await js('qaCard.dispatchEvent(new KeyboardEvent("keydown",{key:"End",bubbles:true,cancelable:true}));true');
 check('keyboard readers can reach the end with motion disabled',await js('qaLine.scrollTop>0 && qaText.getBoundingClientRect().bottom<=qaLine.getBoundingClientRect().bottom+1'));
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:420,height:844,deviceScaleFactor:1,mobile:false});await wait(150);
 check('resizing preserves the manually chosen reading position',await js('qaLine.scrollTop>0 && qaText.getAnimations().length===0'));
 await js('qaCard.dispatchEvent(new KeyboardEvent("keydown",{key:"Home",bubbles:true,cancelable:true}));true');
 check('Home returns manual reading to the start',await js('qaLine.scrollTop===0'));
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await js('qaCard.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,relatedTarget:document.body}));true');await until('qaText.getAnimations().length===1');
 await js('window.qaOld=qaText.getAnimations()[0];document.querySelector(".hwdk-shuffle").click();true');await until('!qaText.isConnected');
 check('shuffle releases old descriptions and their animations',await js('!qaText.isConnected && qaOld.playState==="idle" && document.querySelectorAll(".field-guide .hwdk-scroll-text").length===6'));
 // Inspect the actual 2K image's flat grain across both repeat boundaries.
 const seam=await js(`(async()=>{const img=new Image();img.src='/assets/art/field-guide/wall.svg?v=3';await img.decode();const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,2048,2048).data;
  const lum=(x,y)=>(p[(y*2048+x)*4]+p[(y*2048+x)*4+1]+p[(y*2048+x)*4+2])/3;
  let xStep=0,yStep=0,nearX=0,nearY=0,n=0;for(let i=900;i<1300;i++){xStep+=Math.abs(lum(0,i)-lum(2047,i));yStep+=Math.abs(lum(i,0)-lum(i,2047));nearX+=Math.abs(lum(10,i)-lum(11,i));nearY+=Math.abs(lum(i,10)-lum(i,11));n++;}
  return {x:xStep/n,y:yStep/n,nearX:nearX/n,nearY:nearY/n};})()`);
 console.log('Stone boundary contrast',JSON.stringify(seam));
 check('stone repeat boundaries have no brighter edge than the surrounding grain',seam.x<Math.max(1,seam.nearX*2)&&seam.y<Math.max(1,seam.nearY*2));
 console.log('READING / STONE '+results.filter(Boolean).length+'/'+results.length);if(results.some(x=>!x))process.exitCode=1;
}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}});
