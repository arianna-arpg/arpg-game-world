// Actual HUD geometry and old-client control, isolated from human saves.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'notice-layout-before':'notice-layout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/notice-layout-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime,p=m.journey.places.find(p=>p.recipe==='north-stoneward');w.landPartyAt(m.journey.local(p));__game.step(2);
   w.notices=[];w.notice('New cosmetics unlocked in your Wardrobe.','#b399dc',16,'civic');
   const text='The Stone Sentinel has fallen. Return to Mireille at the Lastlight inn for a passive point and experience.';
   w.notice(text,'#ffcd7a',18,'civic');
   const r=__game.renderer,settings=r.getSettings;
   window.noticeQA={anchor:'top',scale:1,muted:false,text};
   r.getSettings=()=>{const base=settings?.();return {...base,uiScale:noticeQA.scale,noticeAnchor:noticeQA.anchor,
    noticeSec:3,noticeChannels:{...base?.noticeChannels,civic:!noticeQA.muted}};};
   noticeQA.measure=()=>{
    const before=JSON.stringify([w.time,w.notices,w.player.pos,w.player.life,w.player.mana,w.meta.xp]),rows=[];let measures=0;
    const instrument=(group,fn)=>{
     const ctx=r.ctx,fill=ctx.fillText,measure=ctx.measureText;
     ctx.measureText=function(...args){if(group==='notice')measures++;return measure.apply(this,args);};
     ctx.fillText=function(text,x,y,...rest){
      const box=measure.call(this,String(text)),t=ctx.getTransform();
      rows.push({group,text:String(text),color:ctx.fillStyle,left:t.a*(x-box.actualBoundingBoxLeft)+t.e,
       right:t.a*(x+box.actualBoundingBoxRight)+t.e,top:t.d*(y-box.actualBoundingBoxAscent)+t.f,
       bottom:t.d*(y+box.actualBoundingBoxDescent)+t.f});
      return fill.call(this,text,x,y,...rest);
     };
     try{return fn();}finally{ctx.fillText=fill;ctx.measureText=measure;}
    };
    const news=r.drawNoticeFeed,status=r.drawHudStatus;
    r.drawNoticeFeed=function(...a){return instrument('notice',()=>news.apply(this,a));};
    r.drawHudStatus=function(...a){return instrument('status',()=>status.apply(this,a));};
    try{r.render(w);}finally{r.drawNoticeFeed=news;r.drawHudStatus=status;}
    return {rows,measures,clusters:r.hudClusterRects.map(b=>({left:b.x,right:b.x+b.w,top:b.y,bottom:b.y+b.h})),
     same:before===JSON.stringify([w.time,w.notices,w.player.pos,w.player.life,w.player.mana,w.meta.xp]),fatal:__game.crash().fatal,
     cacheSize:r.noticeLineCache?.size};
   };
  });
  for(const view of [{width:1280,height:850,scale:1},{width:800,height:600,scale:1.5}]){
   win.setSize(view.width,view.height);await new Promise(r=>setTimeout(r,200));
   for(const anchor of ['top','topLeft','topRight','bottom']){
    const a=await run((scale,anchor)=>{noticeQA.scale=scale;noticeQA.anchor=anchor;__game.renderer.resize();return noticeQA.measure();},view.scale,anchor);
    const notices=a.rows.filter(r=>r.group==='notice'),status=a.rows.filter(r=>r.group==='status');
    const conflicts=notices.filter(n=>status.some(s=>overlap(n,s))||a.clusters.some(s=>overlap(n,s))).length;
    const clipped=notices.filter(n=>n.left<0||n.right>view.width||n.top<0||n.bottom>view.height).length;
    assert.ok(a.same);assert.equal(a.fatal,null);assert.ok(notices.length>0);
    if(!legacy){
     assert.equal(conflicts,0,'notices clear actual status and skill clusters');assert.equal(clipped,0,'all drawn glyphs stay in the viewport');
     assert.ok(notices.length<=8);
     if(view.scale===1)assert.equal(notices.filter(n=>n.color==='#ffcd7a').map(n=>n.text).join(' '),await run(()=>noticeQA.text),'full quest instruction remains intact');
     const warm=await run(()=>noticeQA.measure());assert.deepEqual(warm.rows,a.rows);assert.equal(warm.measures,0,'warm text uses bounded measured cache');
    }
    results.push({view,anchor,conflicts,clipped,notices});
    if(anchor==='top'||anchor==='bottom')await shot(view.width+'-'+anchor);
   }
  }
  if(legacy)assert.ok(results.some(r=>r.conflicts||r.clipped),'actual prior renderer reproduces clipped/overlapping news');
  else {
   const mute=await run(()=>{noticeQA.muted=true;const r=noticeQA.measure();noticeQA.muted=false;return r;});
   assert.equal(mute.rows.filter(r=>r.group==='notice').length,0,'native channel preference remains authoritative');
   const stress=await run(()=>{
    const w=__game.world();w.notices=[];
    for(let i=0;i<75;i++){w.notices=[];w.notice('W'.repeat(600)+i,'#ffcd7a',18,'civic');noticeQA.measure();}
    return noticeQA.measure();
   });
   assert.ok(stress.cacheSize<=64);assert.ok(stress.rows.filter(r=>r.group==='notice').every(n=>n.left>=0&&n.right<=800));
   assert.ok(stress.rows.filter(r=>r.group==='notice').some(n=>n.text.endsWith('…')),'bounded output marks omitted text');
   const aged=await run(()=>{__game.world().time+=4;return noticeQA.measure();});
   assert.equal(aged.rows.filter(r=>r.group==='notice').length,0,'native lifetime still expires');
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(({view,anchor,conflicts,clipped})=>({view,anchor,conflicts,clipped}))));
  console.log(legacy?'PASS actual prior client reproduces notice collisions/clipping':'PASS actual four-anchor HUD layout, narrow/enlarged view, exact quest text, native curation/lifetime, read-only redraw and bounded warm cache');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
