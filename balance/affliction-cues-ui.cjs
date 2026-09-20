// Build first. Real renderer, hidden window, disposable saves and profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const logfile=path.join(dir,'affliction-cues-ui.log');fs.writeFileSync(logfile,'START\n');
const log=v=>fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'affliction-cues-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'affliction-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=code=>win.webContents.executeJavaScript(code);
  async function capture(name,{active=true,washes=0}={}) {
    const result=await run(`(()=>{
      const w=__game.world(),r=__game.renderer;r.render(w);
      const image=document.getElementById('game').toDataURL('image/png');
      const originalCanvas=r.canvas,originalCtx=r.ctx,c=document.createElement('canvas');c.width=900;c.height=600;
      const ctx=c.getContext('2d');let blits=0;const ink=new Set(),draw=ctx.drawImage.bind(ctx),fill=ctx.fill.bind(ctx),stroke=ctx.stroke.bind(ctx);
      ctx.drawImage=(...args)=>{blits++;return draw(...args);};
      ctx.fill=(...args)=>{if(ctx.globalAlpha>0)ink.add(ctx.fillStyle);return fill(...args);};
      ctx.stroke=(...args)=>{if(ctx.globalAlpha>0)ink.add(ctx.strokeStyle);return stroke(...args);};
      const measure=()=>{const data=ctx.getImageData(0,0,c.width,c.height).data;let energy=0,peak=0,hash=0;
        for(let i=0;i<data.length;i++){hash=Math.imul(hash,31)+data[i]|0;if(i%4===3){energy+=data[i];peak=Math.max(peak,data[i]);}}
        return {energy,peak,hash,center:ctx.getImageData(450,300,1,1).data[3]};};
      r.canvas=c;r.ctx=ctx;let pixels,lowLife;
      try{r.drawAfflictionOverlays(w);pixels=measure();ctx.clearRect(0,0,c.width,c.height);r.drawLowLifeGlow(w);lowLife=measure();}
      finally{r.canvas=originalCanvas;r.ctx=originalCtx;}
      return {image,fatal:__game.crash().fatal,blits,...pixels,lowLife,ink:[...ink],
        statuses:w.player.statuses.map(s=>s.id),mode:__game.settings().afflictionOverlays};
    })()`);
    const {image,...facts}=result;log({name,...facts});assert.equal(result.fatal,null);
    assert.equal(result.center,0,'combat center remains transparent');
    // low-life blits were included by instrumentation after the ailment pass.
    assert.equal(result.blits,washes+(result.lowLife.energy>0?1:0),'only actual vignette families use a fullscreen wash');
    assert.equal(result.energy>0,active,'ailment presence independent of low life');
    fs.writeFileSync(path.join(dir,'affliction-'+name+'.png'),Buffer.from(image.split(',')[1],'base64'));
    return result;
  }
  const setup=async(statuses,life=300)=>run(`__game.world().player.statuses=[${statuses}];__game.world().player.life=${life};void 0;`);
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('guardian');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world();w.zoneMap.qa_affliction={id:'qa_affliction',name:'Proving Ground',level:18,tileset:'highland',size:{w:1800,h:1400},seed:991,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_affliction');w.player.pos={x:900,y:700};__game.step(240);
      w.actors=[w.player];w.projectiles=[];w.zones=[];w.texts=[];w.flashes=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      const p=w.player;p.sheet.setSource('affliction-qa',[{stat:'life',kind:'override',value:300},{stat:'damageTaken',kind:'override',value:1},
        ...['manaShield','esDotResist','esDotBypass'].map(stat=>({stat,kind:'override',value:0}))]);
      p.fillResources();p.life=300;p.es=p.ward=p.absorb=0;p.statuses=[];w.lowLifeHitFlash=0;
      __game.settings().afflictionOverlays='still';__game.settings().lowLifePulse=true;
      window.afxTime=20;Object.defineProperty(performance,'now',{value:()=>afxTime*1000,configurable:true});
      window.ail=(id,dps=60,rupture)=>({id,dps,remaining:6,stacks:1,sourceName:'UI probe',rupture});
    })()`);
    await capture('healthy',{active:false});
    for(const id of ['bleed','burn','poison']) {
      const washes=id==='poison'?1:0;
      await setup(`ail('${id}',1)`);const mild=await capture('mild-'+id,{washes});
      await setup(`ail('${id}',100)`);const strong=await capture('urgent-'+id,{washes});
      assert.ok(strong.energy>mild.energy*2,id+' intensity scales its own pixels');
      assert.equal(strong.lowLife.energy,0,'full-life ailment is independent');
      await run("afxTime+=2;void 0;");const still=await capture('still-'+id,{washes});
      assert.equal(strong.hash,still.hash,id+' still stops motion');
      await run("__game.settings().afflictionOverlays='gentle';void 0;");const a=await capture('moving-'+id,{washes});
      await run("afxTime+=2;void 0;");const b=await capture('moving-later-'+id,{washes});
      assert.notEqual(a.hash,b.hash,id+' material animates');
      await run("__game.settings().afflictionOverlays='still';void 0;");
    }
    await setup("ail('doom',0,240)");await capture('armed-doom');
    const all=["ail('bleed')","ail('burn')","ail('poison')","ail('doom',0,70)"];
    await setup(all.join(','));const mixed=await capture('mixed-healthy',{washes:1});
    assert.ok(mixed.ink.includes('#b03030'),'blood actually draws while other families are present');
    assert.ok(mixed.ink.includes('#7a48c8'),'Doom actually draws alongside all three ailments');
    for(let i=0;i<all.length;i++) {
      await setup(all.filter((_,j)=>j!==i).join(','));const less=await capture('mixed-minus-'+['bleed','burn','poison','doom'][i],{washes:i===2?0:1});
      assert.notEqual(mixed.hash,less.hash,'each family contributes visible pixels');
    }
    await setup(all.join(','),45);const low=await capture('mixed-low-life',{washes:1});
    await run("__game.settings().afflictionOverlays='off';void 0;");const off=await capture('ailments-off-low-life',{active:false});
    assert.equal(low.lowLife.hash,off.lowLife.hash,'ailments never tint or replace low-life warning');
    await run("__game.settings().lowLifePulse=false;void 0;");await capture('both-off',{active:false});
    await run("__game.settings().afflictionOverlays='still';__game.world().player.es=500;void 0;");
    await setup(all.slice(0,3).join(','));await capture('shielded',{washes:1});
    await setup('');await capture('cleansed',{active:false});
    await setup("ail('burn')");await run("__game.world().player.dead=true;void 0;");await capture('dead',{active:false});
    await run("__game.world().player.dead=false;__game.world().player.downed=true;void 0;");await capture('downed',{active:false});
    const settingsResult=await run(`(()=>{
      const root=document.createElement('div');document.body.appendChild(root);__game.ui.optionsTab='visuals';
      __game.settings().afflictionOverlays='gentle';__game.ui.renderOptions(root,()=>{});
      const labels=[];for(let i=0;i<3;i++){root.querySelector('#opt-affliction').click();labels.push(__game.settings().afflictionOverlays);}
      root.remove();return labels;
    })()`);
    assert.deepEqual(settingsResult,['still','off','gentle']);
    log('PASS independent blood/kindling/poison/Doom pixels, individual severity/motion, all four simultaneous, low-life separation, cure and comfort controls');
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});
