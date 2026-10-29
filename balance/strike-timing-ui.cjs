// Build first. Real supports, cast transitions and renderer; disposable profile/saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname, '..'), dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'strike-timing-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
const supports = JSON.parse(execFileSync('node', ['--import', 'tsx', '--input-type=module', '-e',
  "import { SUPPORTS } from './src/data/supports.ts'; process.stdout.write(JSON.stringify(Object.fromEntries(['perfect_draw','wandering_mark','overcharge'].map(id=>[id,SUPPORTS[id]]))));"],
  { cwd: root, encoding: 'utf8', windowsHide: true }));
app.setPath('userData', path.join(dir, 'strike-timing-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.join(root, 'dist'), savesDir: path.join(dir, 'strike-timing-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = code => win.webContents.executeJavaScript(code);
  try {
    await win.loadURL(server.url);
    await run("__game.hold(true);Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(() => {
      const w=__game.world();
      w.zoneMap.qa_striketiming={id:'qa_striketiming',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_striketiming'); w.player.pos={x:800,y:660}; __game.step(240);
      w.actors=[w.player];w.doodads=[];w.markDoodadsChanged();w.walk=null;
      __game.devGrantSkill('fireball',1,2); window.timingBase=w.player.skills[2];
      window.timingSupports=${JSON.stringify(supports)};
      window.timingStart=(order,held)=>{
        const p=w.player;p.casting=null;p.useLock=0;p.cooldowns.clear();p.statuses=[];p.fillResources();
        w.flashes=[];w.projectiles=[];w.zones=[];
        const ids=held?[...order,'overcharge']:order;
        const inst={...timingBase,sockets:ids.map(id=>({def:timingSupports[id],level:1})),
          def:{...timingBase.def,requirements:undefined,manaCost:0,cooldown:0,useTime:1}};
        if(!w.useSkill(p,inst,{x:p.pos.x+200,y:p.pos.y},true))throw Error('cast failed');
        const cs=p.casting;cs.indicatorAt=0.8;cs.elapsed=cs.total*0.8;if(held)cs.stage=1;
      };
      window.timingCapture=()=>{
        const r=__game.renderer,rect=r.ctx.fillRect.bind(r.ctx),bars=[];
        r.ctx.fillRect=(x,y,width,height)=>{if((Math.abs(width-12.32)<1e-6&&height===5)||(width===2&&height===9))bars.push({x,y,width,height,color:r.ctx.fillStyle});return rect(x,y,width,height);};
        try{r.render(w);}finally{r.ctx.fillRect=rect;}
        return {bars,fatal:__game.crash().fatal,empowered:w.player.casting?.empowered,
          cast:!!w.player.casting,cues:w.flashes.flatMap(f=>f.combatCue?[f.combatCue.style]:[]),
          image:document.getElementById('game').toDataURL('image/png')};
      };
    })()`);
    for (const reverse of [false, true]) for (const held of [false, true]) {
      const name=(reverse?'mark-first':'draw-first')+(held?'-release':'-press');
      const order=reverse?['wandering_mark','perfect_draw']:['perfect_draw','wandering_mark'];
      await run('timingStart('+JSON.stringify(order)+','+held+');void 0;');
      for (const phase of ['windows','success']) {
        if(phase==='success')await run(held
          ? '__game.world().player.casting.held=false;__game.world().updateCasting(__game.world().player,0);void 0;'
          : '__game.world().castPress(__game.world().player);void 0;');
        const result=await run('timingCapture()');
        const {image,...facts}=result;log({name,phase,...facts});assert.equal(result.fatal,null);
        if(phase==='windows'){
          assert.ok(result.bars.some(b=>Math.abs(b.width-12.32)<1e-6),'golden tail drawn');
          const gold=result.bars.find(b=>Math.abs(b.width-12.32)<1e-6);
          assert.ok(result.bars.some(b=>b.width===2&&b.height===9&&Math.abs(b.x-gold.x-2.52)<1e-6&&b.y===gold.y-2),'marker lies in the golden tail of the same bar');
        }else{
          assert.ok(result.cues.includes('perfect')&&result.cues.includes('flawless'),'both earned cues');
          if(!held)assert.ok(Math.abs(result.empowered-3.74)<1e-9);else assert.equal(result.cast,false);
        }
        fs.writeFileSync(path.join(dir,'strike-timing-'+name+'-'+phase+'.png'),Buffer.from(image.split(',')[1],'base64'));
      }
    }
    log('PASS both socket orders, simultaneous cast-bar windows and earned press/release cues');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
