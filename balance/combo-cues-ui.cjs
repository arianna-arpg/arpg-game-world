// Build first. Real hidden renderer, disposable profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'combo-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'combo-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'combo-cues-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'combo-cues-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = code => win.webContents.executeJavaScript(code);
  async function capture(name) {
    const result = await run(`(() => {
      const w=__game.world(),r=__game.renderer,labels=[],fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return fill.call(this,text,...args);};
      try{r.render(w);}finally{CanvasRenderingContext2D.prototype.fillText=fill;}
      const full=document.getElementById('game').toDataURL('image/png');
      const originalCanvas=r.canvas,originalCtx=r.ctx,canvas=document.createElement('canvas');
      canvas.width=originalCanvas.width;canvas.height=originalCanvas.height;
      r.canvas=canvas;r.ctx=canvas.getContext('2d');
      let hud,body;
      try {
        r.drawHud(w);hud=canvas.toDataURL('image/png');
        r.ctx.clearRect(0,0,canvas.width,canvas.height);
        r.ctx.translate(220-w.player.pos.x,180-w.player.pos.y);r.drawActor(w.player,w);
        body=canvas.toDataURL('image/png');
      } finally {r.canvas=originalCanvas;r.ctx=originalCtx;}
      return {full,hud,body,labels,fatal:__game.crash().fatal,fire:[...w.player.comboFire??[]],ring:w.player.castRing?.length};
    })()`);
    const { full, hud, body, ...facts } = result; log({ name, ...facts });
    save(name, full); save(name + '-hud', hud); save(name + '-body', body);
    assert.equal(result.fatal, null);
    assert.ok(!result.labels.some(text => /^(Drumbeat|Blade-and-Vein|Prismatic Round|Twin Measures)!$/.test(text)));
    return result;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(() => {
      const w=__game.world();window.comboBase=w.player.skills.find(Boolean);
      w.zoneMap.qa_combo={id:'qa_combo',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:736,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_combo');w.player.pos={x:900,y:700};__game.step(240);
      w.actors=[w.player];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      for(const [id,x,y] of [['cadence_fencer',760,535],['cadence_cantor',1040,535],['cadence_maestro',900,430]]){
        const a=w.createMonster(id,1,'enemy');a.pos={x,y};a.skills=[];a.casting=null;a.anchored=true;a.spawnedAt=-1;a.aiCooldown=9999;a.tier=w.player.tier;w.actors.push(a);
      }
      for(const a of w.actors){a.statuses=[];a.sheet.setSource('combo-rig',[{stat:'life',kind:'override',value:1000},{stat:'mana',kind:'override',value:10000}]);a.fillResources();}
      w.devComboGrant('drumbeat');w.devComboGrant('spellblade_weave');w.devComboGrant('elemental_round');
      window.comboCast=(a,id,tags) => {
        const inst={...comboBase,sockets:[],tree:undefined,state:{},def:{...comboBase.def,id,tags,baseDamage:undefined,effects:[],components:undefined,comboChain:undefined,innateMods:[],manaCost:0,cooldown:0}};
        if(!w.executeSkill(a,inst,{x:a.pos.x+100,y:a.pos.y}))throw new Error('cast refused');
      };
      window.comboFinish=() => {
        w.time+=2;
        for(const a of w.actors){a.comboWatchAt=0;a.castRing=null;a.comboFire=null;
          if(a===w.player||a.defId==='cadence_fencer'){for(let i=0;i<3;i++)comboCast(a,'qa_strike',['attack','physical']);}
          if(a===w.player||a.defId==='cadence_cantor'){for(const el of ['fire','cold','lightning'])comboCast(a,'qa_'+el,['spell',el]);}
          if(a.defId==='cadence_maestro'){comboCast(a,'qa_strike',['attack']);comboCast(a,'qa_fire',['spell','fire']);}
        }
        w.flashes=[];w.texts=[];w.projectiles=[];w.time+=0.22;
      };
      __game.settings().lowLifePulse=false;
      Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const idle = await capture('idle');
    await run("comboCast(__game.world().player,'qa_strike',['attack','physical']);comboCast(__game.world().player,'qa_strike',['attack','physical']);void 0;");
    const partial = await capture('partial'); assert.notEqual(partial.hud, idle.hud);
    await run('comboFinish();void 0;');
    const complete = await capture('complete'); assert.ok(complete.fire.length === 3); assert.notEqual(complete.hud, partial.hud); assert.notEqual(complete.body, partial.body);
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(960,640); await new Promise(resolve => setTimeout(resolve,150));
    await run("window.dispatchEvent(new Event('resize'));void 0;"); await capture('bright-small');
    win.setContentSize(1500,1000); await new Promise(resolve => setTimeout(resolve,150));
    await run("window.dispatchEvent(new Event('resize'));__game.world().time+=1;void 0;");
    const expired = await capture('expired'); assert.notEqual(expired.body, complete.body);
    await run("comboFinish();__game.world().player.downed=true;void 0;"); await capture('downed');
    await run("__game.world().player.downed=false;__game.world().devComboClear();void 0;");
    await capture('unequipped');
    log('PASS: actual combo completion, world/HUD gestures, no name captions, bright/small rendering, expiry/down/unequip.');
    clearTimeout(timeout); win.destroy(); server.server.close(); app.exit(0);
  } catch(error) { log(String(error.stack||error)); clearTimeout(timeout); win.destroy(); server.server.close(); app.exit(1); }
});
