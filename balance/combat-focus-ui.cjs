// Actual renderer acceptance in an isolated preview profile. Controlled crowd
// placement is integration QA, separate from the critic's ordinary-input play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'combat-focus-'+process.pid));app.disableHardwareAcceleration();
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
  const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(dir,'combat-focus-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
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
      for(const [i,a] of enemies.entries()){a.pos={x:h.pos.x+(i%2?25:-23),y:h.pos.y-32-Math.floor(i/2)*32};a.life=a.maxLife()*.6;}
      w.texts=[];window.focusQA={enemies};
      for(let i=0;i<12;i++)w.text({x:h.pos.x+(i%3)*9-9,y:h.pos.y-20},String(111+i),'#f2ebcf',15,'dmg',2);
      w.grantEssence(w.localSeat,{essence:'coarse',count:2});
      w.grantAbilityEssence(w.localSeat,1,3);
      w.text(h.pos,'+7 Life','#00ff00',12,'gains',2);
      window.focusQA.rewardTexts=w.texts.filter(t=>t.yieldToCombat).map(t=>t.text);
      window.focusQA.wallets=JSON.stringify([w.meta.essences,w.meta.abilityEssences,w.pickupFeed]);
      __game.step(1);
    });
    const result=await run(()=>{
      const w=__game.world(),ctx=__game.renderer.ctx,fill=ctx.fillText,stroke=ctx.stroke,rows=[];
      let markers=0;const feedback=[];
      ctx.fillText=function(text,x,y,...rest){if(focusQA.rewardTexts.includes(String(text))||text==='+7 Life')feedback.push(String(text));if(/^1(1[1-9]|2[0-2])$/.test(String(text)))rows.push({text:String(text),x,y,width:ctx.measureText(String(text)).width});return fill.call(this,text,x,y,...rest);};
      ctx.stroke=function(...args){if(ctx.strokeStyle==='#edf9e9')markers++;return stroke.apply(this,args);};
      try{__game.step(1);}finally{ctx.fillText=fill;ctx.stroke=stroke;}
      return {rows,markers,feedback,rewards:focusQA.rewardTexts,walletsUnchanged:focusQA.wallets===JSON.stringify([w.meta.essences,w.meta.abilityEssences,w.pickupFeed]),bodies:[w.player,...focusQA.enemies].map(a=>({x:a.pos.x,y:a.pos.y,r:a.radius})),fatal:__game.crash().fatal};
    });
    assert.equal(result.fatal,null);assert.equal(result.rows.length,12);assert.ok(result.markers>0);
    const meters=await run(()=>{
      const w=__game.world(),r=__game.renderer,ctx=r.ctx,fill=ctx.fillRect,draw=r.drawActor,actors=w.actors;
      const painted=[];let base;
      w.actors=[w.player,...focusQA.enemies];
      r.drawActor=function(...args){base??=ctx.getTransform();return draw.apply(this,args);};
      ctx.fillRect=function(x,y,width,height){
        if(base&&ctx.fillStyle==='#c03030'&&height===4){
          const m=ctx.getTransform();
          painted.push({x:(m.a*x+m.e-base.e)/base.a,y:(m.d*y+m.f-base.f)/base.d,width,height});
        }
        return fill.call(this,x,y,width,height);
      };
      let result;
      try{
        r.render(w);
        result={painted,bodies:w.actors.map(a=>({x:a.pos.x,y:a.pos.y,r:a.radius})),
          expected:focusQA.enemies.map(a=>a.radius*2.2*Math.max(0,Math.min(1,a.life/a.maxLife()))),
          state:JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting]))};
        r.render(w);
        result.statePreserved=result.state===JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting]));
        result.painted=painted.slice(0,painted.length/2);
      }finally{ctx.fillRect=fill;r.drawActor=draw;w.actors=actors;}
      return result;
    });
    assert.ok(meters.statePreserved,'rendering may not move bodies or alter native pools/casts');
    assert.equal(meters.painted.length,meters.expected.length,'every wounded crowd member retains its native life bar');
    for(const [i,t] of meters.painted.entries()){
      assert.ok(Math.abs(t.width-meters.expected[i])<.001,'meter keeps the exact native life fraction');
      for(const b of meters.bodies)assert.ok(!(t.x+t.width>b.x-b.r&&t.x<b.x+b.r&&t.y+t.height>b.y-b.r&&t.y<b.y+b.r),'life meter covers a visible body');
    }
    for(const t of result.rows)for(const b of result.bodies){
      assert.ok(!(t.x+t.width/2>b.x-b.r&&t.x-t.width/2<b.x+b.r&&t.y>b.y-b.r&&t.y-15<b.y+b.r),'damage text covers a body');
    }
    assert.ok(result.feedback.includes('+7 Life'),'actual healing feedback stays visible');
    assert.ok(result.rewards.length===2&&!result.rewards.some(t=>result.feedback.includes(t)),'resource reward text yields near combat');
    assert.ok(result.walletsUnchanged,'presentation does not consume currency or pickup-feed records');
    await shot('crowd');
    const quiet=await run(()=>{
      const w=__game.world(),ctx=__game.renderer.ctx,fill=ctx.fillText,seen=[];
      const actors=w.actors;w.actors=[w.player];
      ctx.fillText=function(text,...rest){if(focusQA.rewardTexts.includes(String(text)))seen.push(String(text));return fill.call(this,text,...rest);};
      try{__game.renderer.render(w);}finally{ctx.fillText=fill;w.actors=actors;}
      return seen;
    });
    assert.deepEqual(quiet.sort(),result.rewards.sort(),'resource counters return when nearby combat is absent');
    const alive=await run(()=>{
      const w=__game.world(),e=focusQA.enemies[0];
      __game.devInput(()=>({dx:0,dy:0,aim:{...e.pos},held:[true],edge:[]}));
      __game.step(80);__game.devInput(null);
      return {fatal:__game.crash().fatal,life:w.player.life,dead:w.player.dead};
    });
    assert.equal(alive.fatal,null);await shot('fight');
    fs.writeFileSync(path.join(dir,'combat-focus-ui.json'),JSON.stringify({result,meters,alive},null,2));
    console.log('PASS real renderer retains 12 damage values outside the crowd and draws the local-player marker above combat; currency yields with healing and pickup records preserved; native crowd meters clear bodies with exact fractions and unchanged simulation');
  }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
  finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
