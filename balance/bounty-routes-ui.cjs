// Production board copy, hidden window and isolated saves/profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'bounty-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 55000);
  const server = await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'bounty-ui-saves-'+process.pid)});
  const win = new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[];
  win.webContents.on('console-message',(_event,level,message)=>{if(level>=3) errors.push(message);});
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(); w.account.features.add('bounty_board');
      w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
      Object.assign(w.player.pos,w.townSeat('bounty_board')); w.armBountyBoard();
      __game.ui.showBounties(undefined,'lastlight'); __game.step(2);
    })()`);
    for(const [width,height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height);
      await new Promise(r=>setTimeout(r,200));
      const result=await win.webContents.executeJavaScript(`(() => {
        const p=document.getElementById('bounty-menu'),r=p.getBoundingClientRect();
        return {text:p.innerText,rect:[r.x,r.y,r.width,r.height],scroll:p.scrollWidth,client:p.clientWidth};
      })()`);
      assert(result.text.includes('Approach:')); assert(result.text.includes('reward level'));
      assert(result.rect[0]>=-1 && result.rect[0]+result.rect[2]<=width+1);
      assert(result.scroll<=result.client+1);
      fs.writeFileSync(path.join(dir,`bounty-board-${width}.png`),(await win.webContents.capturePage()).toPNG());
      fs.writeFileSync(path.join(dir,`bounty-board-${width}.json`),JSON.stringify(result,null,2));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS production bounty board: approach/reward copy, two viewport widths, no errors');
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e=>{console.error(e);app.exit(1);});
