// Hidden browser regression: compact cards, full reading, acquisition and tag gates.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-database-reading-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/skills.json'))),supports=JSON.parse(fs.readFileSync(path.join(root,'data/supports.json')));
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
function check(name,ok){checks.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>app.exit(1),90000);try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 win=new BrowserWindow({show:true,x:-4200,y:30,width:1440,height:1000,useContentSize:true,focusable:false,skipTaskbar:true,webPreferences:{backgroundThrottling:false}});
 const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<160;i++){if(await js('!!('+code+')'))return;await wait(50);}throw new Error('Timed out: '+code);};
 await win.webContents.debugger.attach('1.3');
 const query=async value=>{await js(`document.querySelector('#q').value=${JSON.stringify(value)};document.querySelector('#q').dispatchEvent(new Event('input',{bubbles:true}));true`);await until(`(new URLSearchParams(location.search).get('q')||'')===${JSON.stringify(value)}`);};
 await win.loadURL(base+'/database/?type=skill');await until('document.querySelectorAll(".card").length>100');
 const expected=rows.toSorted((a,b)=>Number(!a.learnable)-Number(!b.learnable)||(a.name||a.id).localeCompare(b.name||b.id)||a.id.localeCompare(b.id)).map(e=>e.id);
 check('export carries acquisition facts and support restrictions',rows.every(e=>typeof e.learnable==='boolean'&&typeof e.droppable==='boolean')&&supports.every(e=>Array.isArray(e.requiresTags)&&Array.isArray(e.excludeTags)&&Array.isArray(e.requiresMechanisms)));
 check('all skills remain, with both acquisition groups alphabetized',JSON.stringify(await js('[...document.querySelectorAll(".card")].map(c=>c.dataset.id)'))===JSON.stringify(expected));
 await js('document.querySelector(`[data-set=acquisition][data-val="Not directly learnable"]`).click();true');
 check('non-learnable filter keeps creature and secondary arts',await js('!!document.querySelector(".card[data-id=alight]")&&!!document.querySelector(".card[data-id=command_detonate]")&&!document.querySelector(".card[data-id=fireball]")'));
 await js('document.querySelector("#clearf").click();true');await query('learnable:true fire');
 check('acquisition search combines with ordinary effect text',await js('document.querySelectorAll(".card").length>0&&[...document.querySelectorAll(".card")].every(c=>!c.querySelector(".acquisition.other"))'));
 await query('');await js('document.querySelector("#sort").value="name";document.querySelector("#sort").dispatchEvent(new Event("change"));true');
 check('plain alphabetical sorting remains available',JSON.stringify(await js('[...document.querySelectorAll(".card")].map(c=>c.dataset.id)'))===JSON.stringify(rows.toSorted((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).map(e=>e.id)));
 await win.loadURL(base+'/database/?type=support');await until('document.querySelector("[data-set=tags][data-val=spell]")');
 await js('document.querySelector("[data-set=tags][data-val=spell]").click();true');
 check('support tags find restricted and unrestricted compatible gems',await js('!!document.querySelector(".card[data-id=spell_echo]")&&!!document.querySelector(".card[data-id=alacrity]")&&!document.querySelector(".card[data-id=brutality]")'));
 await js('document.querySelector("[data-set=tags][data-val=channel]").click();true');
 check('excluded host tags veto a support even with a matching requirement',await js('!document.querySelector(".card[data-id=spell_echo]")'));
 await js('document.querySelector("#clearf").click();true');await query('tag:spell');
 check('tag search uses the same support compatibility rules',await js('!!document.querySelector(".card[data-id=spell_echo]")&&!!document.querySelector(".card[data-id=alacrity]")'));
 await query('Spell Echo');await until('document.querySelector(".card[data-id=spell_echo]")');
 check('cards begin with a compact two-line description',await js('(()=>{const d=document.querySelector(".card .cdesc");return d.clientHeight<45&&d.scrollHeight>d.clientHeight})()'));
 const at=await js('(()=>{const c=document.querySelector(".card");c.scrollIntoView({behavior:"instant",block:"center"});const r=c.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+25)}})()');
 win.webContents.sendInputEvent({type:'mouseMove',...at});await until('document.querySelector(".card.is-reading")&&document.querySelector(".cdesc").clientHeight>=document.querySelector(".cdesc-copy").scrollHeight');
 check('hover unfolds the entire support description and restrictions',await js('document.querySelector(".card .compatibility").textContent.includes("channel")&&document.querySelector(".cdesc").clientHeight>80&&document.querySelector("#drawer").hidden'));
 win.webContents.sendInputEvent({type:'mouseMove',x:5,y:5});await until('!document.querySelector(".card.is-reading")');await wait(350);
 check('leaving returns the card to its compact size',await js('document.querySelector(".cdesc").clientHeight<45'));
 await js('document.querySelector(".card").focus();document.querySelector(".card").dispatchEvent(new FocusEvent("focusin",{bubbles:true}));true');await until('document.querySelector(".card.is-reading")');
 check('keyboard focus exposes the description without opening the drawer',await js('document.querySelector("#drawer").hidden'));
 await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));true');await wait(350);
 check('Escape closes the reading expansion',await js('!document.querySelector(".card.is-reading")'));
 await win.loadURL(base+'/database/?type=unique&q=emberbrand');await until('document.querySelector(".card[data-id=emberbrand]")');
 await js('document.querySelector(".card").focus();document.querySelector(".card").dispatchEvent(new FocusEvent("focusin",{bubbles:true}));true');await wait(350);
 check('unique modifiers can be read on the card',await js('document.querySelectorAll(".cdesc li").length>0&&document.querySelector(".cdesc").clientHeight>=document.querySelector(".cdesc-copy").scrollHeight'));
 await js('document.querySelector(".card").click();true');await until('document.querySelector("#drawer.open")');
 check('click still opens detailed mechanics and authored data',await js('document.querySelector("#drawer-title").textContent==="The Emberbrand"&&document.querySelector("#drawer details.raw")&&new URLSearchParams(location.search).get("id")==="emberbrand"'));
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await win.loadURL(base+'/database/?type=support&q=Spell%20Echo');await until('document.querySelector(".card-read")');
 check('touch screens provide an explicit reading control',await js('document.querySelector(".card-read").getBoundingClientRect().height>=32'));
 await js('document.querySelector(".card-read").click();true');await wait(350);
 check('touch expansion leaves the mechanics drawer closed',await js('document.querySelector(".card-read").getAttribute("aria-expanded")==="true"&&document.querySelector("#drawer").hidden&&document.querySelector(".cdesc").clientHeight>=document.querySelector(".cdesc-copy").scrollHeight'));
 for(const width of [320,390,760,1440]){await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await wait(350);check('expanded cards remain legible at '+width,await js('document.documentElement.scrollWidth<=innerWidth&&document.querySelector(".cdesc").clientHeight>=document.querySelector(".cdesc-copy").scrollHeight'));}
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check('reduced motion disables the unfolding animation',await js('getComputedStyle(document.querySelector(".cdesc")).transitionDuration==="0s"'));
 console.log('DATABASE '+checks.filter(Boolean).length+'/'+checks.length);if(checks.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
