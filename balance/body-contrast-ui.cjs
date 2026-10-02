// Controlled rendering comparison; independent critics use separate fixed builds/profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'body-contrast-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/body-contrast-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'body-contrast-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);
   const p=w.massRuntime.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(w.massRuntime.journey.local(p));__game.step(2);
   const h=w.player,m=w.massRuntime;
   for(let y=h.pos.y-650;y<h.pos.y+650;y+=30)for(let x=h.pos.x-750;x<h.pos.x+750;x+=30)
    m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#242722',cause:'qa/contrast'});
   w.doodads=[];w.markDoodadsChanged();w.texts=[];w.projectiles=[];w.zones=[];
   const foes=['skeleton_warrior','warren_rat','stone_sentinel'].map((id,i)=>{
    const a=w.createMonster(id,1,'enemy');a.pos={x:h.pos.x+115+i*70,y:h.pos.y-70+i*70};
    a.facing=Math.PI;a.aiAnchor={...a.pos};return a;
   });
   w.actors=[h,...foes];
   const r=__game.renderer;r.hudMouse={x:-1000,y:-1000};
   window.bodyQA={foes,edge:r.drawCombatBodyEdge};
   for(let i=0;i<30;i++)r.render(w);
   bodyQA.compare=()=>{
    const state=JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.mana,a.casting,a.statuses]));
    r.drawCombatBodyEdge=()=>{};r.render(w);
    const off=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
    r.drawCombatBodyEdge=bodyQA.edge;r.render(w);
    const on=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
    const readings=bodyQA.foes.map(a=>{
      const at=r.toScreen(a.pos),rad=Math.ceil((a.radius*2+5)*r.zoom);
      let pixels=0,lift=0;
      for(let y=Math.max(0,Math.floor(at.y-rad));y<Math.min(r.canvas.height,at.y+rad);y++)
       for(let x=Math.max(0,Math.floor(at.x-rad));x<Math.min(r.canvas.width,at.x+rad);x++){
        const i=(y*r.canvas.width+x)*4,d=on[i]+on[i+1]+on[i+2]-off[i]-off[i+1]-off[i+2];
        if(d>3){pixels++;lift+=d;}
       }
      return {id:a.defId,pixels,lift,shade:r.sightVeil.occludedAt(a.pos,a.tier),bodyShade:r.sightVeil.actorShade(a,0)};
    });
    if(state!==JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.mana,a.casting,a.statuses])))throw Error('Rendering mutated combat state');
    return readings;
   };
  });
  const visible=await run(()=>bodyQA.compare());
  assert.ok(visible.every(v=>v.pixels>12),'each actual native silhouette gets visible edge pixels');
  await shot('visible');
  await run(()=>{__game.renderer.drawCombatBodyEdge=()=>{};__game.renderer.render(__game.world());});
  await shot('disabled');
  await run(()=>{__game.renderer.drawCombatBodyEdge=bodyQA.edge;});
  const exclusions=await run(()=>{
   const a=bodyQA.foes[0],checks={};
   const test=(name,patch,undo)=>{patch();checks[name]=bodyQA.compare()[0];undo();};
   test('passive',()=>a.passive=true,()=>a.passive=false);
   test('untargetable',()=>a.untargetable=true,()=>a.untargetable=false);
   const skills=a.skills;test('unarmed',()=>a.skills=[],()=>a.skills=skills);
   const pos={...a.pos};test('distant',()=>a.pos.x+=500,()=>a.pos=pos);
   test('otherTier',()=>a.tier=1,()=>a.tier=0);
   return checks;
  });
  for(const [name,v] of Object.entries(exclusions))assert.equal(v.pixels,0,name+' has no threat edge');
  const hidden=await run(()=>{
   const w=__game.world(),h=w.player,m=w.massRuntime,a=bodyQA.foes[0];
   a.pos={x:h.pos.x+170,y:h.pos.y};bodyQA.foes=[a];w.actors=[h,a];
   for(let y=h.pos.y-180;y<h.pos.y+180;y+=30)for(let x=h.pos.x+60;x<h.pos.x+120;x+=30)
    m.state.paint({address:m.walk.at(x,y),region:'wall',color:'#343834',cause:'qa/cover'});
   // The native body fade uses world-clock deltas; repeated renders at one
   // instant deliberately do not finish its transition.
   for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
   return bodyQA.compare();
  });
  console.log(JSON.stringify({visible,exclusions,hidden}));
  assert.ok(hidden[0].shade>.95 && hidden[0].bodyShade>.999,'native wall and body fade actually conceal the body');
  assert.equal(hidden[0].pixels,0,'edge cannot reveal a body hidden by native wall');
  await shot('occluded');
  const result={visible,exclusions,hidden,fatal:await run(()=>__game.crash().fatal)};
  assert.equal(result.fatal,null);fs.writeFileSync(path.join(dir,'body-contrast-ui.json'),JSON.stringify(result,null,2));
  console.log('PASS native body contrast pixels, exact disabled/exclusion controls, unchanged combat state and wall concealment');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
