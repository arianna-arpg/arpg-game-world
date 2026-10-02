// Actual renderer acceptance in an isolated preview profile. Controlled crowd
// placement is integration QA, separate from the critic's ordinary-input play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const role=process.env.HOLLOW_WAKE_QA_CLASS||'warrior';
assert.ok(['warrior','rogue'].includes(role),'unsupported body-action QA class');
const skillId=role==='rogue'?'backstab':'cleave';
const dir=path.join(__dirname,'reports'),label=process.env.HOLLOW_WAKE_QA_LABEL||'body-action';fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
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
    fs.writeFileSync(path.join(dir,label+'-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
  };
  const timer=setTimeout(()=>app.exit(1),180000);
  try {


    await win.loadURL('http://127.0.0.1:'+server.address().port);
    await run(role=>{
      window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.devStartRun(role);__game.ui.hideAll();
      const w=__game.world();w.startWorldMass(42);w.actors=[w.player];
      __game.step(2);
      window.actionQA={origin:{...w.player.pos},radius:w.player.radius};
    },role);
    const capture=async name=>{
      const result=await run(()=>{
        const w=__game.world(),r=__game.renderer,p=w.player,ctx=r.ctx;
        const draw=r.drawActor,blit=ctx.drawImage,rows=[];let active=false,base;
        const state=JSON.stringify([p.pos,p.facing,p.radius,p.life,p.mana,p.casting?.elapsed,w.time]);
        r.drawActor=function(a,...rest){active=a===p;base=ctx.getTransform();try{return draw.call(this,a,...rest);}finally{active=false;}};
        ctx.drawImage=function(...args){
          if(active){const m=ctx.getTransform();rows.push({kind:args.length===3?'body':'ground',a:m.a/base.a,b:m.b/base.a,c:m.c/base.d,d:m.d/base.d,x:(m.e-base.e)/base.a,y:(m.f-base.f)/base.d});}
          return blit.apply(this,args);
        };
        try{r.render(w);}finally{r.drawActor=draw;ctx.drawImage=blit;}
        return {rows,statePreserved:state===JSON.stringify([p.pos,p.facing,p.radius,p.life,p.mana,p.casting?.elapsed,w.time]),
          casting:p.casting?{elapsed:p.casting.elapsed,total:p.casting.total}:null,stamp:p.bodyAction,life:p.life,pos:p.pos,fatal:__game.crash().fatal};
      });
      assert.ok(result.statePreserved,'render must preserve combat and native geometry');
      assert.equal(result.fatal,null);assert.ok(result.rows.some(row=>row.kind==='body'));
      await shot(name);return result;
    };
    const idle=await capture('idle');
    const start=await run(skillId=>{
      const w=__game.world(),p=w.player,skill=p.skills.find(s=>s?.def.id===skillId);
      if(!skill)throw Error('Native starting skill absent: '+skillId);
      return w.useSkill(p,skill,{x:p.pos.x+100,y:p.pos.y});
    },skillId);assert.ok(start);
    await run(()=>{
      const p=__game.world().player;let i=0;
      while(p.casting&&p.casting.elapsed/p.casting.total<.7&&i++<180)__game.step(1);
    });
    const prepare=await capture('prepare');assert.ok(prepare.casting);
    await run(()=>{let i=0;while(__game.world().player.casting&&i++<180)__game.step(1);});
    const contact=await capture('contact');assert.ok(contact.stamp&&!contact.casting);
    await run(()=>__game.step(4));
    const release=await capture('release');assert.ok(release.stamp&&!release.casting);
    await run(()=>__game.step(30));
    const settled=await capture('settled');
    for(const result of [prepare,release,settled])assert.deepEqual(result.pos,idle.pos,'paint cannot relocate native actor');
    const pose=result=>result.rows.find(row=>row.kind==='body');
    const ground=result=>result.rows.find(row=>row.kind==='ground');
    assert.notDeepEqual(pose(prepare),pose(idle),'native windup changes the actual painted body');
    assert.notDeepEqual(pose(release),pose(prepare),'successful release changes the painted body again');
    assert.deepEqual(ground(prepare),ground(idle),'ground anchor does not follow the body pose');
    assert.deepEqual(ground(release),ground(idle),'ground anchor stays at collision through release');
    assert.ok(pose(prepare).x<pose(idle).x,'preparation draws back');
    assert.ok(pose(release).x>pose(idle).x,'native completion follows through');
    assert.ok(Math.abs(pose(settled).x-pose(idle).x)<.001,'settled body returns to native position');
    const jointAngle=(result,index=1)=>{
      const rows=result.rows.filter(row=>row.kind==='body');
      assert.equal(rows.length,role==='rogue'?3:2,'one body plus exactly the native articulated weapons');
      const angle=Math.atan2(rows[index].b,rows[index].a)-Math.atan2(rows[0].b,rows[0].a);
      return Math.atan2(Math.sin(angle),Math.cos(angle));
    };
    assert.ok(Math.abs(jointAngle(idle))<.001,'neutral joint preserves its authored placement');
    assert.ok(jointAngle(prepare)<-.1,'blade draws back independently of torso');
    assert.ok(jointAngle(release)>(role==='rogue'?.1:.3),'actual completion carries blade through its joint');
    assert.ok(Math.abs(jointAngle(settled))<.001,'joint settles without a lingering weapon copy');
    if(role==='rogue'){
      assert.ok(Math.abs(jointAngle(idle,2))<.001,'second blade begins neutral');
      assert.ok(jointAngle(prepare,2)>.1,'second blade prepares on its own opposite joint');
      assert.ok(jointAngle(release,2)<-.1,'second blade follows through symmetrically');
      assert.ok(Math.abs(jointAngle(settled,2))<.001,'second blade settles without duplication');
    }
    fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({idle,prepare,contact,release,settled},null,2));
    console.log('PASS actual native '+skillId+' preparation, completion and settle paint distinct body and weapon poses while ground anchors and gameplay state remain unchanged');

  }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
  finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
