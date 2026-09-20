// Build first. Real renderer, hidden client, isolated saves/profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'exhaustion-cues-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'exhaustion-cues-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'exhaustion-cues-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    await win.webContents.executeJavaScript(`(() => {
      const w=__game.world(); w.player.invulnerable=true;
      w.zoneMap.qa_exhaustion={ id:'qa_exhaustion',name:'Proving Ground',level:6,size:{w:1600,h:1200},
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
      w.loadZone('qa_exhaustion'); w.player.pos={x:800,y:600}; __game.step(300);
      w.actors=[w.player]; w.projectiles=[];
      for(const [i,id] of ['bandit_matchlock','fumelung','skeleton_archer'].entries()){
        const a=w.createMonster(id,6,'enemy'); a.pos={x:620+i*180,y:510};
        a.anchored=true; a.skills=[]; a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=0.7; a.spawnedAt=-1; w.actors.push(a);
      }
    })()`);
    for (const phase of ['rested', 'effort', 'gasping', 'recovered']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(), [a,f,bone]=w.actors.slice(1);
        for(const m of [a,f,bone]){m.aiWindedUntil=0;m.aiKiteAcc=0;m.tellNextAt=0;}
        a.brain={...a.brain,tempo:{kite:2}}; a.aiKiteSpec={kite:2}; a.aiLastRetreatAt=w.time;
        if('${phase}'==='effort') a.aiKiteAcc=1.85;
        if('${phase}'==='gasping') {
          a.aiWindedUntil=w.time+3;
          const r=f.reserves.get('breath');r.cur=0;r.ventUntil=w.time+3;
          f.applyStatus('winded_gasp',0,3/2.6,'probe');
        } else { const r=f.reserves.get('breath'); r.cur=3;r.ventUntil=0;f.endStatus('winded_gasp'); }
        // Step updates the real tells and the real renderer. The fixture
        // freezes AI only; no screenshot-only painter or replacement HUD.
        const labels=[],original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
        const frames=[];
        try{
          __game.step(1);
          if(['effort','gasping'].includes('${phase}')) for(let i=0;i<6;i++){
            frames.push(document.getElementById('game').toDataURL('image/png')); __game.step(5);
          }
        }finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return { phase:'${phase}',labels,fatal:__game.crash().fatal,
          bodies:[a,f,bone].map(m=>({id:m.defId,values:m.tells,parts:m.tellVis?.parts,lean:m.tellVis?.lean})),
          frames,image:document.getElementById('game').toDataURL('image/png') };
      })()`);
      const { image, frames, ...facts } = result; log(facts);
      assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/winded!|out of breath!/i.test(t)));
      const puffs = body => (body.parts ?? []).filter(p=>p.kind==='breathPuff'&&(p.alpha??1)>0);
      assert.equal(puffs(result.bodies[2]).length,0);
      if(phase==='effort') assert.ok(puffs(result.bodies[0]).length>0);
      if(phase==='gasping') {
        assert.ok(puffs(result.bodies[0]).length>0 && result.bodies[0].lean>0);
        assert.ok(puffs(result.bodies[1]).some(p=>p.mirror));
        assert.ok(result.bodies[1].parts.filter(p=>p.kind==='bellowsLung').every(p=>p.params.fill===0));
      }
      if(['rested','recovered'].includes(phase)) assert.ok(result.bodies.every(b=>puffs(b).length===0));
      fs.writeFileSync(path.join(dir,`exhaustion-${phase}.png`),Buffer.from(image.split(',')[1],'base64'));
      frames.forEach((frame,i)=>fs.writeFileSync(path.join(dir,`exhaustion-${phase}-${i}.png`),Buffer.from(frame.split(',')[1],'base64')));
    }
    log('PASS rested, effort, gasp, recovery; quiet tireless control; captions absent');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
