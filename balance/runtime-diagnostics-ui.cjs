// Hidden real browser, fresh profile, loopback assets, no user save access.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out=path.join(__dirname,'reports','runtime-diagnostics-'+process.pid);fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(out,'profile'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..','dist');
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1000,height:720,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=fn=>win.webContents.executeJavaScript('('+fn+')()');
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,250));fs.writeFileSync(path.join(out,name),(await win.webContents.capturePage()).toPNG());};
 const timer=setTimeout(()=>{console.error('Diagnostics UI timed out');app.exit(1);},120000);
 const address='http://127.0.0.1:'+server.address().port;
 try {
  await win.loadURL(address);
  await run(async()=>{for(let i=0;!window.__game&&i<200;i++)await new Promise(r=>setTimeout(r,50));await __game.hydrated();});
  const first=await run(async()=>{
   window.__errorLease=__game.loading.begin({kind:'travel',label:'Loading the next area'});await __errorLease.paint();
   __errorLease.fail('Invalid native actor checkpoint: gnoll_prowler at aiRingTarget',()=>{window.__retried=true;});
   const root=document.getElementById('loading-error-report');root.querySelector('button').click();
   const area=root.querySelector('textarea');area.focus();
   const key=new KeyboardEvent('keydown',{code:'KeyC',key:'c',ctrlKey:true,bubbles:true,cancelable:true});area.dispatchEvent(key);
   return {report:JSON.parse(area.value),blocked:key.defaultPrevented,active:__game.loading.active,buttons:[...root.querySelectorAll('button')].map(b=>b.textContent)};
  });
  assert.equal(first.active,true);assert.equal(first.blocked,false);
  assert.ok(first.buttons.includes('Download report'));assert.ok(first.buttons.includes('Copy report'));
  assert.match(first.report.errors.at(-1).message,/aiRingTarget/);assert.ok(first.report.bundles.length);
  await shot('report.png');
  await run(()=>{__errorLease.update({label:'Trying again'});if(document.getElementById('loading-error-report'))throw Error('Stale report survived retry');});
  await win.loadURL(address);
  await run(async()=>{for(let i=0;!window.__game&&i<200;i++)await new Promise(r=>setTimeout(r,50));await __game.hydrated();
   window.__errorLease=__game.loading.begin({kind:'travel',label:'Another crossing'});await __errorLease.paint();__errorLease.fail('Second failure');
   document.querySelector('#loading-error-report button').click();});
  const persisted=await run(()=>JSON.parse(document.querySelector('#loading-error-report textarea').value));
  assert.equal(persisted.errors.length,2);assert.match(persisted.errors[0].message,/aiRingTarget/);
  await win.setSize(420,720);
  const narrow=await run(()=>{const r=document.querySelector('#loading-error-report section').getBoundingClientRect();return {x:r.x,right:r.right,width:innerWidth};});
  assert.ok(narrow.x>=0&&narrow.right<=narrow.width);
  await shot('report-narrow.png');
  await run(async()=>{__errorLease.finish();await new Promise(r=>setTimeout(r,1800));if(document.getElementById('loading-error-report'))throw Error('Report survived cover closure');});
  fs.writeFileSync(path.join(out,'REPORT.json'),JSON.stringify({passed:true,checks:['crossing error report','copy keyboard fallback','loaded asset identity','retry cleanup','reload persistence','narrow viewport','close cleanup'],first:first.report,persisted},null,2));
  console.log('PASS real client error details, keyboard copy, reload persistence, narrow layout and cleanup. '+out);
  clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){console.error(error);fs.writeFileSync(path.join(out,'ERROR.txt'),String(error.stack||error));clearTimeout(timer);win.destroy();server.close();app.exit(1);}
});
