// Real DOM regression for immediate menu placement, independent of another sim tick.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
app.setPath('userData',path.join(dir,'menu-tray-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>win.webContents.executeJavaScript('('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')');
 const timer=setTimeout(()=>app.exit(1),120000),rows=[];
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});
  await run(async()=>{window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));__game.devStartRun('magician');__game.ui.hideAll();__game.step(3);});
  if(!legacy){
   const wait=()=>new Promise(r=>setTimeout(r,220));
   const paint=()=>run(()=>{
    const b=document.querySelector('[data-menu-toggle]'),s=getComputedStyle(b);
    return {open:__game.ui.menuTrayOpen(),paused:__game.ui.escapeMenuOpen,focused:document.activeElement===b,
     focusVisible:b.matches(':focus-visible'),hovered:b.matches(':hover'),pips:b.classList.contains('menu-pips'),
     paint:[s.backgroundImage,s.backgroundColor,s.borderTopColor,s.boxShadow,s.outlineStyle,s.outlineWidth]};
   });
   const key=async keyCode=>{
    win.webContents.sendInputEvent({type:'keyDown',keyCode});
    if(keyCode==='Return')win.webContents.sendInputEvent({type:'char',keyCode:'\r'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode});
    await run(()=>__game.step(2));await wait();
   };
   win.webContents.sendInputEvent({type:'mouseMove',x:1,y:1});await wait();
   const idle=await paint();assert.ok(!idle.pips,'focus fixture has no unspent-point pulse');
   const point=await run(()=>{const r=document.querySelector('[data-menu-toggle]').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};});
   win.webContents.sendInputEvent({type:'mouseMove',...point});
   win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
   win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
   await wait();assert.ok((await paint()).open,'real pointer click opens the tray');
   win.webContents.sendInputEvent({type:'mouseMove',x:1,y:1});await key('Escape');
   const closed=await paint();rows.push({focusAfterEscape:closed});console.log(JSON.stringify({focusAfterEscape:closed}));
   assert.ok(!closed.open&&!closed.paused,'Escape closes just the tray');
   assert.ok(!closed.focused&&!closed.focusVisible,'closing the tray releases its trigger focus');
   assert.deepEqual(closed.paint,idle.paint,'Escape restores idle paint after the pointer leaves');
   await key('Tab');
   await run(()=>{__game.ui.menuBar.closeTray();document.querySelector('[data-menu-toggle]').focus();});
   await wait();assert.ok((await paint()).focusVisible,'deliberate keyboard focus still has a visible cue');
   await key('Return');assert.ok((await paint()).open,'keyboard activation still opens the tray');
   await key('Escape');assert.ok(!(await paint()).focused,'keyboard dismissal returns focus to gameplay');
   await run(()=>{__game.world().meta.passivePoints=1;__game.ui.menuBar.invalidate();__game.step(2);__game.ui.menuBar.openTray();});
   await key('Escape');assert.ok((await paint()).pips,'closing preserves the real unspent-point attention pulse');
   await run(()=>{__game.world().meta.passivePoints=0;__game.ui.menuBar.invalidate();__game.step(2);});
  }
  for(const [width,height,scale,anchor] of [[1064,850,1,'bar'],[800,600,1.5,'bar'],[640,480,2,'right'],[640,480,.75,'left'],[320,360,2,'bar']]){
   win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));
   const row=await run((scale,anchor)=>{
    const ui=__game.ui;ui.menuBar.closeTray();ui.showEscapeMenu();document.querySelector('#esc-keys').click();
    document.querySelector('#escape-menu [data-opttab="interface"]').click();
    const slider=document.querySelector('#opt-uiscale');if(!slider)throw Error('No UI scale option');
    slider.value=String(scale*100);slider.dispatchEvent(new Event('input',{bubbles:true}));
    ui.hideEscapeMenu();__game.settings().menuBar.anchor=anchor;__game.step(2);
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const bar=document.querySelector('#menu-bar'),before=rect(bar);
    document.querySelector('[data-menu-toggle]').click();
    // Deliberately no frame/refresh between the actual click and measurement.
    const tray=document.querySelector('.menu-tray'),r=rect(tray),keys=[...tray.querySelectorAll('.menu-key')].map(rect);
    const after=rect(bar);return {viewport:[innerWidth,innerHeight],scale,anchor,before,after,tray:r,keys};
   },scale,anchor);
   rows.push(row);console.log(JSON.stringify(row));
   if(legacy){assert.ok(row.tray.right>row.viewport[0],'old build must reproduce the reported right clipping');break;}
   assert.deepEqual(row.before,row.after,'placing tray must not move its button');
   assert.ok(row.tray.x>=15&&row.tray.right<=row.viewport[0]-15);
   assert.ok(row.tray.y>=15&&row.tray.bottom<=row.viewport[1]-15);
   assert.ok(row.keys.every(r=>r.x>=0&&r.right<=row.viewport[0]));
   await run(()=>document.querySelector('[data-stations-toggle]').click());
   const expanded=await run(()=>{const r=document.querySelector('.menu-tray').getBoundingClientRect();return {top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};});
   assert.ok(expanded.top>=15&&expanded.right<=expanded.width-15&&expanded.bottom<=expanded.height-15);
   win.webContents.invalidate();await new Promise(r=>setTimeout(r,200));
   fs.writeFileSync(path.join(dir,'menu-tray-'+width+'-'+scale+'.png'),(await win.webContents.capturePage()).toPNG());
   const accessible=await run(()=>{
    const pause=document.querySelector('[data-menu-entry="pause"]');if(!pause)throw Error('Missing pause menu');
    pause.scrollIntoView({block:'nearest'});const r=pause.getBoundingClientRect();
    const reachable=pause.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
    pause.click();const opened=__game.ui.escapeMenuOpen;__game.ui.hideEscapeMenu();
    return {reachable,opened};
   });assert.ok(accessible.reachable&&accessible.opened,'scrolling keeps the final page reachable');
  }
  fs.writeFileSync(path.join(dir,'menu-tray-'+(legacy?'legacy':'fixed')+'.json'),JSON.stringify(rows,null,2));
  console.log(legacy?'PASS old build reproduces immediate clipped menu':'PASS first-click tray and expanded stations remain inside actual viewport across anchors and UI scales');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
