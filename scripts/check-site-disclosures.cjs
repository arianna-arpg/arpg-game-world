// Exercise the real homepage, including delayed Vocation content and rapid reversal.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-disclosure-check-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
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
 win.webContents.debugger.attach('1.3');
 await win.loadURL('http://127.0.0.1:'+server.address().port);
 await until('document.querySelectorAll(".disclosure-fold").length===2 && document.querySelector(".hwdk-card")');
 check('both panels begin closed with native summaries',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>!d.open&&d.firstElementChild.tagName==="SUMMARY")'));
 for(const name of ['field-guide','vocation-gallery']){
  const d='document.querySelector(".'+name+'")',f=d+'.querySelector(".disclosure-fold")';
  await js(d+'.querySelector("summary").click();true');await wait(90);
  check(name+' visibly unfolds instead of jumping open',await js(d+'.open&&'+f+'.getAnimations().length>0&&'+f+'.getBoundingClientRect().height>0&&'+f+'.getBoundingClientRect().height<'+f+'.firstElementChild.getBoundingClientRect().height'));
  check(name+' finishes with content unclipped and interactive',await until(d+'.open&&!'+f+'.getAnimations().length&&!'+f+'.inert&&getComputedStyle('+f+').overflow==="visible"'));
  await js(d+'.querySelector("summary").click();true');await wait(90);
  check(name+' closes progressively and prevents focus entering departing content',await js(d+'.open&&'+f+'.inert&&'+f+'.getAnimations().length>0'));
  check(name+' settles fully closed',await until('!'+d+'.open&&!'+f+'.getAnimations().length'));
  await js(d+'.querySelector("summary").click();true');await wait(70);await js(d+'.querySelector("summary").click();true');await wait(70);await js(d+'.querySelector("summary").click();true');
  check(name+' reverses rapid toggles without getting stuck',await until(d+'.open&&!'+f+'.getAnimations().length&&!'+f+'.inert'));
 }
 for(const width of [1440,760,390,320]){
  await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await wait(80);
  check(width+'px controls align and remain centered without overflow',await js('(()=>{const ds=[...document.querySelectorAll(".field-guide,.vocation-gallery")];const boxes=ds.map(d=>{const s=d.querySelector("summary").getBoundingClientRect(),b=d.querySelector("summary>b").getBoundingClientRect();return {right:b.right,center:Math.abs((s.top+s.bottom-b.top-b.bottom)/2)}});return Math.abs(boxes[0].right-boxes[1].right)<1&&boxes.every(b=>b.center<1)&&document.documentElement.scrollWidth<=innerWidth})()'));
 }
 check('shared boundaries have one ornamental rule',await js('[...document.querySelectorAll(".chapter-strip,.field-guide,.vocation-gallery,.collection")].every(e=>getComputedStyle(e,"::after").content==="none")'));
 await js('document.querySelector(".field-guide summary").click();true');await until('!document.querySelector(".field-guide").open');
 check('open and closed controls keep the same right alignment',await js('Math.abs(document.querySelector(".field-guide summary>b").getBoundingClientRect().right-document.querySelector(".vocation-gallery summary>b").getBoundingClientRect().right)<1'));
 await js('document.querySelector(".field-guide summary").click();true');await until('!document.querySelector(".field-guide .disclosure-fold").getAnimations().length');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.querySelector("summary").click());true');
 check('reduced motion closes immediately without an animation',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>!d.open&&!d.querySelector(".disclosure-fold").getAnimations().length)'));
 await js('document.querySelectorAll(".field-guide,.vocation-gallery").forEach(d=>d.querySelector("summary").click());true');
 check('reduced motion opens immediately and keeps content usable',await js('[...document.querySelectorAll(".field-guide,.vocation-gallery")].every(d=>d.open&&!d.querySelector(".disclosure-fold").inert&&!d.querySelector(".disclosure-fold").getAnimations().length)'));
 console.log(results.filter(Boolean).length+'/'+results.length+' disclosure checks passed');
 win.destroy();server.close();clearTimeout(timeout);app.exit(results.every(Boolean)?0:1);
}catch(e){console.error(e);if(win&&!win.isDestroyed())win.destroy();server.close();clearTimeout(timeout);app.exit(1);}});
