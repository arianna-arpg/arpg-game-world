// Real production renderer, hidden window, disposable saves. Run the probe and
// build first. Exports a portable animated study and native-size contact sheets.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
fs.mkdirSync(dir, { recursive: true });
const catalogue = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8'));
app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.disableHardwareAcceleration();
const selected = ['frost_nova', 'pyre_nova', 'shock_nova', 'ground_slam', 'whirlwind',
  'hex_pulse', 'spore_burst', 'sanguine_burst', 'challenging_shout', 'aegis_ward',
  'benediction', 'communion', 'dark_pact', 'ironbell_toll', 'absolute_zero',
  'thunderclap', 'hurricane', 'winters_sweep', 'corpse_explosion', 'soul_harvest'];
const saveImage = (name, url) => fs.writeFileSync(path.join(dir, name), Buffer.from(url.split(',')[1], 'base64'));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 90000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
    await win.webContents.executeJavaScript(`(() => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior');
      __game.ui.hideAll(); __game.hold(true);
      window.__burstCatalogue=${JSON.stringify(catalogue)};
      window.__burstDraw=(ctx,row,t,shape=0,color=row.color,radius=72)=>{
        const r=__game.renderer, old=r.ctx;
        try { r.ctx=ctx; r.drawFlash({pos:{x:112,y:112},radius,color,life:t*0.3,maxLife:0.3,
          fx:row.fx,edgeFrac:row.edgeFrac,shape,facing:0}); } finally {r.ctx=old;}
      };
    })()`);
    const pixels = await win.webContents.executeJavaScript(`(() => {
      const c=document.createElement('canvas');c.width=c.height=224;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      let checked=0;const failures=[];
      for(const id of ['shock_nova','hurricane']) for(const shape of [0,1,2,3,4,5]) for(const t of [1,0.75,0.35,0.05]) {
        const row=__burstCatalogue.find(s=>s.id===id);ctx.clearRect(0,0,224,224);
        __burstDraw(ctx,row,t,shape);
        const data=ctx.getImageData(0,0,224,224).data, hole=72*row.edgeFrac-2;
        let ink=0,leak=0;
        for(let y=0;y<224;y++)for(let x=0;x<224;x++) {
          const a=data[(y*224+x)*4+3]; if(!a)continue; ink++;
          if(Math.hypot(x+0.5-112,y+0.5-112)<hole)leak++;
          if(shape===0&&Math.hypot(x+0.5-112,y+0.5-112)>73)leak++;
          if(shape===1&&(Math.abs(x+0.5-112)>73||Math.abs(y+0.5-112)>73))leak++;
        }
        if(leak||!ink)failures.push({id,shape,t,leak,ink});checked++;
      }
      // Canvas state and ordinary unknown-voice fallback remain usable.
      ctx.clearRect(0,0,224,224);ctx.globalAlpha=0.7;ctx.lineWidth=13;
      __burstDraw(ctx,__burstCatalogue[0],0.5);
      const restored=ctx.lineWidth===13;ctx.globalAlpha=1;
      __burstDraw(ctx,{color:'#ffffff',fx:'unknown-skill-voice'},0.5);
      const fallback=ctx.getImageData(112,112,1,1).data[3]>0;
      return {checked,failures,restored,fallback};
    })()`);
    assert.deepEqual(pixels.failures, []); assert(pixels.restored && pixels.fallback);
    fs.writeFileSync(path.join(dir, 'pixel-checks.json'), JSON.stringify(pixels,null,2));

    const images = await win.webContents.executeJavaScript(`(() => {
      const selected=${JSON.stringify(selected)};
      const out={};
      for(const gray of [false,true]) {
        const c=document.createElement('canvas');c.width=1120;c.height=1036;
        const ctx=c.getContext('2d');ctx.fillStyle='#101719';ctx.fillRect(0,0,c.width,c.height);
        ctx.fillStyle='#e5e4d8';ctx.font='24px sans-serif';ctx.fillText(gray?'Shape test · one shared color':'Hollow Wake · skill burst study',24,34);
        ctx.fillStyle='#93a5a7';ctx.font='13px sans-serif';ctx.fillText('Same radius and age · real game renderer · 20 of '+__burstCatalogue.length+' authored burst profiles',24,57);
        selected.forEach((id,i)=>{
          const row=__burstCatalogue.find(s=>s.id===id),x=(i%5)*224,y=76+Math.floor(i/5)*240;
          ctx.save();ctx.translate(x,y);ctx.fillStyle='#162023';ctx.fillRect(6,0,212,231);
          ctx.strokeStyle='#26383c';ctx.lineWidth=1;
          for(let g=16;g<218;g+=24){ctx.beginPath();ctx.moveTo(g,8);ctx.lineTo(g,202);ctx.stroke();ctx.beginPath();ctx.moveTo(8,g);ctx.lineTo(216,g);ctx.stroke();}
          __burstDraw(ctx,row,0.62,0,gray?'#bac4cc':row.color);
          ctx.fillStyle='#e5e4d8';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText(row.name,112,218);ctx.restore();
        });out[gray?'monochrome.png':'overview.png']=c.toDataURL();
      }
      return out;
    })()`);
    for (const [name, url] of Object.entries(images)) saveImage(name, url);

    const frames = await win.webContents.executeJavaScript(`(() => {
      const rows=[];
      for(const row of __burstCatalogue) {
        const c=document.createElement('canvas');c.width=224*10;c.height=224;
        const ctx=c.getContext('2d');
        for(let i=0;i<10;i++){ctx.save();ctx.translate(i*224,0);__burstDraw(ctx,row,1-i/10);ctx.restore();}
        rows.push({id:row.id,name:row.name,sheet:c.toDataURL()});
      }
      return rows;
    })()`);
    const study = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Hollow Wake · Skill bursts</title>
<style>body{margin:28px;background:#101719;color:#e5e4d8;font:16px system-ui}header{max-width:940px;margin:auto}h1{font-size:30px;margin-bottom:8px}p{color:#a8b8b9;line-height:1.5}button,input{background:#223237;color:inherit;border:1px solid #476068;border-radius:6px;padding:10px;margin:6px 8px 14px 0}main{display:grid;grid-template-columns:repeat(auto-fit,224px);justify-content:center;gap:12px}.card{background:#172328;border:1px solid #2d4045;border-radius:10px;overflow:hidden}.art{width:224px;height:224px;background-size:2240px 224px}.label{text-align:center;padding:0 5px 15px;font-size:14px}.gray .art{filter:grayscale(1)}small{color:#98aaad}</style>
<header><small>HOLLOW WAKE / VISUAL STUDY</small><h1>Recognize the skill by its motion.</h1><p>${catalogue.length} burst profiles drawn by the game renderer. Shared radius for comparison; the game uses each skill’s actual reach. Animation plays the existing 0.3-second cast, then pauses. This is the burst family; projectiles, beams and persistent fields retain their current art.</p><button id="pause">Pause</button><button id="gray">Grayscale</button><input id="search" placeholder="Find a skill" aria-label="Find a skill"></header><main></main>
<script>const rows=${JSON.stringify(frames).replace(/</g,'\u003c')};const root=document.querySelector('main');for(const row of rows){const c=document.createElement('div');c.className='card';c.dataset.name=row.name.toLowerCase();const a=document.createElement('div');a.className='art';a.style.backgroundImage='url('+row.sheet+')';const l=document.createElement('div');l.className='label';l.textContent=row.name;c.append(a,l);root.append(c)}let paused=false,phase=0,prev=performance.now();document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};document.querySelector('#gray').onclick=()=>root.classList.toggle('gray');document.querySelector('#search').oninput=e=>{for(const c of root.children)c.hidden=!c.dataset.name.includes(e.target.value.toLowerCase())};function frame(now){if(!paused)phase=(phase+now-prev)%1450;prev=now;const n=Math.min(9,Math.floor(phase/30));for(const a of document.querySelectorAll('.art')){a.style.backgroundPosition=(-n*224)+'px 0';a.style.opacity=phase>300?'0':'1'}requestAnimationFrame(frame)}requestAnimationFrame(frame);</script></html>`;
    fs.writeFileSync(path.join(dir, 'study.html'), study);

    // Actual cast -> world flash -> renderer, on an empty arena at gameplay scale.
    await win.webContents.executeJavaScript(`(() => {
      const w=__game.world(),p=w.player;
      w.zoneMap.qa_bursts={id:'qa_bursts',name:'Proving Ground',level:1,size:{w:1600,h:1200},seed:9283,
        theme:{floor:'#303a37',grid:'#35433e',border:'#44544c',obstacle:'#444',obstacleEdge:'#555',accent:'#8cbba5'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_bursts');p.pos={x:800,y:600};w.actors=[p];w.doodads=[];w.markDoodadsChanged();
      __game.hold(false);__game.step(90);w.update=()=>{};
    })()`);
    for (const id of ['frost_nova', 'shock_nova', 'ground_slam']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(),p=w.player;__game.devGrantSkill('${id}',1,2);
        w.flashes=[];w.zones=[];p.casting=null;p.cooldowns.clear();p.useLock=0;
        w.executeSkill(p,p.skills[2],{x:p.pos.x+150,y:p.pos.y});
        for(const f of w.flashes)f.life=f.maxLife*0.62;__game.step(1);
        return w.flashes.some(f=>f.fx==='skillBurst:${id}');
      })()`);
      assert(result, `${id} did not emit its real cast voice`);
      await new Promise(resolve => setTimeout(resolve, 180)); // let the offscreen compositor present the stepped frame
      fs.writeFileSync(path.join(dir, `live-${id}.png`), (await win.webContents.capturePage()).toPNG());
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${catalogue.length} rendered profiles; ${pixels.checked} footprint/safe-center pixel checks; 3 live casts; contact sheets and animated study`);
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(e => { console.error(e); app.exit(1); });
