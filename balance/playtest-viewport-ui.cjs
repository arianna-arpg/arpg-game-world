const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {VIEWPORT,makeViewportGuard}=require('./playtest-viewport.cjs');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'viewport-qa-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,...VIEWPORT,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const events=[],guard=makeViewportGuard(win,e=>events.push(e));
 const run=s=>win.webContents.executeJavaScript(s);
 const shot=async n=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,80));
  fs.writeFileSync(path.join(dir,'playtest-viewport-'+n+'.png'),(await win.webContents.capturePage()).toPNG());};
 const click=async(x,y)=>{win.webContents.sendInputEvent({type:'mouseMove',x,y});
  win.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1});
  await new Promise(r=>setTimeout(r,40));};
 try{
  guard.constrain();
  await win.loadURL('data:text/html,'+encodeURIComponent('<style>body{background:#202830;color:#eee;font:22px sans-serif}button{position:fixed;right:30px;top:80px;width:160px;height:80px;font:22px sans-serif}</style><h1>Review viewport fixture</h1><p id="count">0 clicks</p><button onclick="count.textContent=(++window.clicks)+\' clicks\'">Aim here</button><script>window.clicks=0</script>'));
  assert.equal((await guard.beforeInput()).width,1280);
  const point=await run('(()=>{const r=document.querySelector("button").getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
  await shot('before');
  // Deliberately bypass native minimum constraints, reproducing the observed
  // geometry failure without claiming its original OS/compositor cause.
  win.setMinimumSize(0,0);win.setContentSize(1064,850);await new Promise(r=>setTimeout(r,100));
  assert.equal((await guard.afterAction()).expected,false);await shot('shifted');
  await click(point.x,point.y);assert.equal(await run('window.clicks'),0,'old screenshot coordinates miss after an unguarded shrink');
  await guard.beforeInput();await click(point.x,point.y);
  assert.equal(await run('window.clicks'),1,'the same ordinary device coordinates hit after restoration');
  assert.equal((await guard.afterAction()).expected,true);await shot('restored');
  assert.ok(events.some(e=>e.viewportChangedDuringAction)&&events.some(e=>e.viewportRestored));
  const refusing=makeViewportGuard({webContents:{executeJavaScript:async()=>({width:1064,height:850,scale:1})},setContentSize(){},getSize(){return [1064,850]},setMinimumSize(){},setMaximumSize(){},setResizable(){}});
  await assert.rejects(refusing.beforeInput(),/no input or frames/);
  fs.writeFileSync(path.join(dir,'playtest-viewport-ui.json'),JSON.stringify({point,events,restored:true,unrestorableRefused:true},null,2));
  console.log('PASS actual hidden-window shrink reproduces pointer miss; restoration preserves coordinate target; geometry logs and refusal pass');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
