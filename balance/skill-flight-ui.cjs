const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
// Production-renderer pixels, contact sheets, real casts and portable catalogue.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'flights.json'), 'utf8'));
const bursts = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8')).map(s => ({ ...s, family: 'burst' }));
const catalogue = [...rows, ...bursts];
app.setPath('userData', path.join(dir, 'flight-profile-' + process.pid));
app.disableHardwareAcceleration();
const save = (name, url) => fs.writeFileSync(path.join(dir, name), Buffer.from(url.split(',')[1], 'base64'));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'flight-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 3) errors.push(message); });
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())'); await installVisualHarnessHold(win);
    await win.webContents.executeJavaScript('window.__catalogue=' + JSON.stringify(catalogue));
    await run(() => {
      __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);
      window.__draw=(ctx,row,age=0.7,color=row.color,extra={})=>{
        const r=__game.renderer, old={ctx:r.ctx,cam:r.cam,zoom:r.zoom},d=row.delivery||{};
        try {r.ctx=ctx;r.cam={x:0,y:0};r.zoom=1;
          if(row.family==='projectile') {
            r.drawProjectiles({shake:0,tethers:[],projectiles:[{skillVisualId:row.id,
              pos:{x:110,y:64},dir:0,radius:9,shape:d.shape||'circle',age,color,...extra}]});
          } else if(row.family==='beam') {
            r.drawFlash({pos:{x:12,y:64},radius:152,color,life:.22*(1-age%1),maxLife:.22,
              beam:true,fx:'skillBeam:'+row.id,facing:0,arc:{facing:0,arcRad:(d.arcDeg||8)*Math.PI/180},...extra});
          } else if(row.family==='burst') {
            r.drawFlash({pos:{x:90,y:64},radius:48,color,life:.3*(1-age%1),maxLife:.3,fx:row.fx,edgeFrac:row.edgeFrac,...extra});
          } else {
            const view={skillId:row.id,pos:{x:90,y:64},radius:48,color,shape:0,facing:0,delay:0,
              exploded:true,linger:3,tier:0,telegraph:0,...extra};
            if(row.family==='aura') r.drawAuras({seats:[],time:age,actors:[{
              pos:view.pos,facing:0,tier:0,activeAuras:new Map([['preview',{radius:48,shape:0,inst:{def:{id:row.id,color}}}]])
            }]});
            else r.drawZones({actors:[],remoteSkillFields:[view],zones:[],time:age});
          }
        } finally {r.ctx=old.ctx;r.cam=old.cam;r.zoom=old.zoom;}
      };
    });
    const pixels = await run(() => {
      const c=document.createElement('canvas');c.width=240;c.height=180;
      const ctx=c.getContext('2d',{willReadFrequently:true}),failures=[];let checked=0;
      const scan=(test)=>{const data=ctx.getImageData(0,0,c.width,c.height).data;let leak=0,ink=0;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>5){ink++;if(test(x+.5,y+.5))leak++;}
        return {leak,ink};};
      for(const id of ['entangle','cold_vortex','pillar_of_flame'])for(const shape of [0,1,2,3,4,5])for(const time of [0,.7,3]) {
        ctx.clearRect(0,0,c.width,c.height);__draw(ctx,__catalogue.find(s=>s.id===id),time,'#bbbbbb',{shape,edgeFrac:.6});
        const result=scan((x,y)=>Math.hypot(x-90,y-64)<27);
        if(result.leak||!result.ink)failures.push({id,shape,time,...result});checked++;
      }
      for(const row of __catalogue.filter(s=>s.family==='beam'))for(const age of [.1,.5,.9]) {
        ctx.clearRect(0,0,c.width,c.height);__draw(ctx,row,age,'#bbbbbb');
        const result=scan((x)=>x>165||x<11);
        if(result.leak||!result.ink)failures.push({id:row.id,age,...result});checked++;
      }
      for(const row of __catalogue.filter(s=>s.family==='projectile')) {
        ctx.clearRect(0,0,c.width,c.height);__draw(ctx,row,.7,'#bbbbbb');
        const result=scan((x,y)=>Math.hypot(x-110,y-64)>49);
        if(result.leak||!result.ink)failures.push({id:row.id,...result});checked++;
      }
      // A shared wardrobe body may replace the head, but not the signature
      // wake. Compare only the wake beyond that body's extent.
      const wakes=[];
      for(const id of ['firebolt','frostbolt','chain_lightning']) {
        ctx.clearRect(0,0,c.width,c.height);__draw(ctx,__catalogue.find(s=>s.id===id),.7,'#bbbbbb',{cosmeticProjectile:'crystal_bolt'});
        wakes.push(Array.from(ctx.getImageData(64,48,29,32).data).join(','));
      }
      if(new Set(wakes).size!==3)failures.push({wardrobe:'shared body erased a source wake'});checked++;
      // Closing square/triangle cages keep their shaped centers empty.
      for(const shape of [0,1,2]) {
        ctx.clearRect(0,0,c.width,c.height);
        __draw(ctx,__catalogue.find(s=>s.id==='pillar_of_flame'),.7,'#bbbbbb',{shape,edge:.7});
        const result=scan((x,y)=>Math.hypot(x-90,y-64)<14);
        if(result.leak||!result.ink)failures.push({cage:shape,...result});checked++;
      }
      ctx.clearRect(0,0,c.width,c.height);ctx.globalAlpha=.73;ctx.lineWidth=17;
      __draw(ctx,__catalogue.find(s=>s.id==='fireball'),.7);
      // The renderer owns its alpha; the authored beam painter restores its own
      // state, including a caller's unrelated line width.
      ctx.globalAlpha=.73;ctx.lineWidth=17;
      __draw(ctx,__catalogue.find(s=>s.id==='umbral_lance'),.7);
      if(ctx.lineWidth!==17)failures.push({state:'beam line width leaked'});ctx.globalAlpha=1;checked++;
      return {checked,failures};
    });
    assert.deepEqual(pixels.failures, []); fs.writeFileSync(path.join(dir,'flight-pixels.json'),JSON.stringify(pixels,null,2));
    const sheets = await run(() => {
      const chosen=['firebolt','frostbolt','chain_lightning','essence_drain','vine_lash','spectral_helix',
        'fireball','frozen_orb','web_shot','gyreblade','bone_arrow','galewright_twister',
        'sunpiercer','umbral_lance','gaze_beam','stone_gaze','prismatic_ray','petrifying_gaze',
        'toxic_cloud','entangle','consecration','earthquake','cold_vortex','flame_wall',
        'righteous_fire','static_field','bristleback','unholy_aura','winters_mantle','vampiric_presence'];
      return [false,true].map(mono=>{
        const c=document.createElement('canvas');c.width=1080;c.height=870;const ctx=c.getContext('2d');
        ctx.fillStyle='#101719';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e7eeee';ctx.font='23px sans-serif';
        ctx.fillText(mono?'Shape & motion · one shared color':'Hollow Wake · flights, beams & fields',20,32);
        chosen.forEach((id,i)=>{const row=__catalogue.find(s=>s.id===id);
          const x=i%6*180,y=54+Math.floor(i/6)*160;ctx.save();ctx.translate(x,y);
          ctx.fillStyle='#172328';ctx.fillRect(3,0,174,153);__draw(ctx,row,.6,mono?'#b6c5cc':row.color);
          ctx.fillStyle='#e7eeee';ctx.textAlign='center';ctx.font='12px sans-serif';ctx.fillText(row.name,90,145);ctx.restore();});return c.toDataURL();
      });
    });
    save('flight-overview.png',sheets[0]);save('flight-monochrome.png',sheets[1]);
    const frames=[];
    for(let start=0;start<catalogue.length;start+=40) {
      await win.webContents.executeJavaScript('window.__batch='+start);
      const batch=await run(()=>__catalogue.slice(__batch,__batch+40).map(row=>{
        const sheets=[];for(const mono of [false,true]){const c=document.createElement('canvas');c.width=180*8;c.height=128;const ctx=c.getContext('2d');
          for(let i=0;i<8;i++){ctx.save();ctx.translate(i*180,0);__draw(ctx,row,row.family==='beam'||row.family==='burst'?i/8:i*.28,mono?'#b6c5cc':row.color);ctx.restore();}sheets.push(c.toDataURL());}
        return {id:row.id,name:row.name,family:row.family,sheets};
      }));frames.push(...batch);
    }
    const html=fs.readFileSync(path.join(__dirname,'skill-flight-study.html'),'utf8')
      .replace('/*__DATA__*/[]',JSON.stringify(frames).replaceAll('<','\\u003c'));
    fs.writeFileSync(path.join(dir,'study.html'),html);
    await run(() => {
      const w=__game.world(),p=w.player;w.zoneMap.qa_flights={id:'qa_flights',name:'Proving Ground',level:1,size:{w:1600,h:1200},seed:9283,
        theme:{floor:'#303a37',grid:'#35433e',border:'#44544c',obstacle:'#444',obstacleEdge:'#555',accent:'#8cbba5'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_flights');p.pos={x:800,y:600};w.actors=[p];w.doodads=[];w.markDoodadsChanged();
      __game.hold(false);__game.step(90);w.update=()=>{};
    });
    for(const id of ['fireball','umbral_lance','entangle','righteous_fire']) {
      await win.webContents.executeJavaScript('window.__castId='+JSON.stringify(id));
      const counts=await run(() => {const w=__game.world(),p=w.player;__game.devGrantSkill(__castId,1,2);
        w.flashes=[];w.zones=[];w.projectiles=[];p.activeAuras.clear();p.casting=null;p.cooldowns.clear();p.useLock=0;
        w.executeSkill(p,p.skills[2],{x:p.pos.x+150,y:p.pos.y});
        for(const f of w.flashes)f.life=f.maxLife*.6;for(const p of w.projectiles){p.age=.6;p.pos.x+=100}for(const z of w.zones){z.exploded=true;z.delay=0}
        __game.step(1);return {projectiles:w.projectiles.length,flashes:w.flashes.length,zones:w.zones.length,auras:p.activeAuras.size};
      });
      assert(Object.values(counts).some(n=>n>0),id);await new Promise(r=>setTimeout(r,180));
      fs.writeFileSync(path.join(dir,'live-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
    }
    assert.deepEqual(errors,[]);
    await win.loadFile(path.join(dir,'study.html'));
    const ui=await run(() => {const f=document.querySelector('#family');f.value='beam';f.dispatchEvent(new Event('change'));
      const count=document.querySelector('#count').textContent;document.querySelector('#pause').click();document.querySelector('#mono').click();document.querySelector('#labels').click();
      return {count,paused:document.querySelector('#pause').textContent,mode:document.querySelector('#mono').textContent,names:document.querySelector('.label').style.visibility};
    });
    assert.deepEqual(ui,{count:'6 skills',paused:'Play',mode:'Skill colors',names:'hidden'});
    console.log('PASS '+rows.length+' new identities; '+pixels.checked+' pixel checks; 4 live casts; catalogue controls; '+catalogue.length+'-skill study ('+(Buffer.byteLength(html)/1048576).toFixed(1)+' MB)');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1)});
