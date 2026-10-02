// Actual renderer acceptance in an isolated preview profile. Controlled crowd
// placement is integration QA, separate from the critic's ordinary-input play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'combat-identity-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist-preview'),server=http.createServer((req,res)=>{
    const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=async(fn,...args)=>{
    const result=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(error){return {ok:false,error:error.stack||String(error)}}})()');
    if(!result.ok)throw Error(result.error);return result.value;
  };
  const shot=async name=>{
    const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
    fs.writeFileSync(path.join(dir,'combat-identity-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
  };
  const timer=setTimeout(()=>app.exit(1),180000);
  try {

    await win.loadURL('http://127.0.0.1:'+server.address().port);
    await run(()=>{
      window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
      const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='fallen-court');
      w.landPartyAt(m.journey.local(p));m.update(w,true);__game.step(2);
      const enemies=w.actors.filter(a=>a.magicPack?.mechanic==='bloodfont'),h=w.player;
      w.actors=[h,...enemies];
      for(const [i,a] of enemies.entries()){
        a.pos={x:h.pos.x+(i%2?24:-24),y:h.pos.y-30-Math.floor(i/2)*32};
        a.life=a.maxLife();
      }
      w.texts=[];window.identityQA={enemies};
      __game.renderer.render(w);
      __game.renderer.hudMouse=__game.renderer.toScreen(enemies[0].pos);
    });
    const name=await run(()=>{
      const w=__game.world(),r=__game.renderer,ctx=r.ctx,fill=ctx.fillText,seen=[];
      const target=identityQA.enemies[0],state=JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting]));
      r.hudMouse=r.toScreen(target.pos);
      ctx.fillText=function(text,x,y,...rest){
        if(text===target.name)seen.push({text,x,y,width:ctx.measureText(text).width});
        return fill.call(this,text,x,y,...rest);
      };
      try{r.render(w);}finally{ctx.fillText=fill;}
      return {seen,hover:r.hudMouse,pad:r.padAim,target:target.name,actors:w.actors.map(a=>({name:a.name,def:a.defId,rarity:a.rarity})),rect:r.hoverNameRect,bodies:w.actors.map(a=>({x:a.pos.x-a.radius,y:a.pos.y-a.radius,w:a.radius*2,h:a.radius*2})),
        meters:r.combatMeters.footprints,unchanged:state===JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting]))};
    });
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    assert.equal(name.seen.length,1,'one native hover name must remain readable');
    assert.ok(name.rect&&!name.bodies.some(b=>overlap(name.rect,b)),'hover name clears every visible body');
    assert.ok(!name.meters.some(b=>overlap(name.rect,b)),'hover name clears displaced native meters');
    assert.ok(name.unchanged);await shot('crowd-name');
    const threats=await run(()=>{
      const w=__game.world(),r=__game.renderer,h=w.player,ctx=r.ctx,fill=ctx.fillRect;
      const armed=w.createMonster('warren_rat',1,'enemy'),prey=w.createMonster('gutter_rat',1,'enemy');
      armed.pos={x:h.pos.x+100,y:h.pos.y+10};prey.pos={x:h.pos.x-100,y:h.pos.y+10};
      armed.life=armed.maxLife();prey.life=prey.maxLife();w.actors=[h,armed,prey];w.texts=[];
      r.hudMouse={x:-1000,y:-1000};
      const bars=()=>{
        const rows=[];ctx.fillRect=function(x,y,width,height){if(ctx.fillStyle==='#c03030'&&height===4)rows.push({width,height});return fill.call(this,x,y,width,height);};
        try{r.render(w);}finally{ctx.fillRect=fill;}return rows;
      };
      const normal=bars(),kit=armed.skills;
      armed.skills=[];const unarmed=bars();armed.skills=kit;
      armed.passive=true;const passive=bars();armed.passive=false;
      armed.untargetable=true;const untargetable=bars();armed.untargetable=false;
      armed.tier=1;const otherStory=bars();armed.tier=0;
      armed.pos.x=h.pos.x+550;const distant=bars();armed.pos.x=h.pos.x+100;bars();
      return {normal,unarmed,passive,untargetable,otherStory,distant,
        armed:{radius:armed.radius,life:armed.life,max:armed.maxLife()},prey:{life:prey.life,max:prey.maxLife()},fatal:__game.crash().fatal};
    });
    assert.equal(threats.normal.length,1,'a healthy armed rat is identified while healthy unarmed wildlife stays quiet');
    assert.ok(threats.normal[0].width>=22,'the smallest threat retains a readable native meter');
    for(const key of ['unarmed','passive','untargetable','otherStory','distant'])assert.equal(threats[key].length,0,key+' must not advertise a nearby armed threat');
    assert.equal(threats.armed.life,threats.armed.max);assert.equal(threats.prey.life,threats.prey.max);
    assert.equal(threats.fatal,null);await shot('healthy-threat');
    fs.writeFileSync(path.join(dir,'combat-identity-ui.json'),JSON.stringify({name,threats},null,2));
    console.log('PASS actual hover-name clearance and healthy armed threat identification, with passive/prey/range/story exclusions and unchanged combat state');
  }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
  finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
