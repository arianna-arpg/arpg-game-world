// Build first: npx electron balance/magic-packs-ui.cjs
// Hidden renderer, isolated saves/profile. Screenshots are ignored QA artifacts.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'magic-packs-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'magic-packs-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'magic-packs-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    for (const recipe of ['wardbound', 'chorus', 'vendetta']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        const w = __game.world(); w.player.invulnerable = true;
        __game.step(360);
        w.zoneMap.qa_magic_packs = {
          id:'qa_magic_packs',name:'Magic Pack Proving Ground',level:12,size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}
        };
        w.loadZone('qa_magic_packs'); w.player.pos={x:800,y:600}; __game.step(120);
        w.actors = w.actors.filter(a => a === w.player);
        const origin = { ...w.player.pos };
        const pack = Array.from({length: 4}, (_, i) => {
          const a = w.createMonster('skeleton_warrior', 12, 'enemy');
          a.pos = w.findFreeSpot({x: origin.x + (i - 1.5) * 60, y: origin.y - 150}, a.radius);
          a.sheet.setSource('qa-still', [{stat:'moveSpeed',kind:'more',value:-1}]);
          w.actors.push(a); return a;
        });
        if (!w.promoteMagicPack(pack, '${recipe}')) throw new Error('promotion failed');
        if ('${recipe}' === 'vendetta') { w.kill(pack[0], false, w.player); w.kill(pack[1], false, w.player); }
        w.drops = []; __game.step(180);
        const a = pack.find(a => !a.dead), r = __game.renderer;
        // Drive the real hover plate through its ordinary pointer input.
        const screen = r.toScreen(a.pos), canvas = document.getElementById('game');
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('mousemove', {bubbles:true,clientX:rect.left+screen.x*rect.width/canvas.width, clientY:rect.top+screen.y*rect.height/canvas.height}));
        __game.step(1);
        return { recipe: '${recipe}', names: pack.map(a=>a.name), powers: pack.filter(a=>!a.dead).map(a=>a.magicPackPower),
          links: pack.filter(a=>a.magicPackFrom).length, fatal:__game.crash().fatal,
          image:document.getElementById('game').toDataURL('image/png') };
      })()`);
      const { image, ...facts } = result; log(facts);
      assert.equal(result.fatal, null);
      assert.ok(result.powers.every(p => p === (recipe === 'vendetta' ? 2 : 1)));
      if (recipe !== 'vendetta') assert.ok(result.links > 0);
      fs.writeFileSync(path.join(dir, `magic-pack-${recipe}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS: all three magic pack recipes render in the real client');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
