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
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'magic-packs-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await win.webContents.executeJavaScript("__game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    const scenarios = ['wardbound', 'chorus', 'vendetta', 'breachbearers', 'shifting_breach', 'arclink', 'arclink_fire', 'gravewheel', 'gravewheel_active', 'siphon',
      'cinderchain', 'cinderchain_fire', 'mending_relay', 'mending_relay_active', 'encirclement', 'encirclement_fire', 'hollow_choir', 'hollow_choir_fire'];
    for (const scenario of scenarios.filter(s => !process.env.MAGIC_PACK_SCENARIOS || process.env.MAGIC_PACK_SCENARIOS.split(',').includes(s))) {
      const recipe = scenario.replace(/_(fire|active)$/, '');
      const result = await win.webContents.executeJavaScript(`(() => {
        const w = __game.world(); w.player.invulnerable = true;
        w.zoneMap.qa_magic_packs = {
          id:'qa_magic_packs',name:'Magic Pack Proving Ground',level:12,size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}
        };
        w.loadZone('qa_magic_packs'); w.player.pos={x:800,y:600}; __game.step(300);
        w.actors = w.actors.filter(a => a === w.player);
        const origin = { ...w.player.pos };
        const pack = Array.from({length: 4}, (_, i) => {
          const a = w.createMonster('skeleton_warrior', 20, 'enemy');
          a.pos = w.findFreeSpot({x: origin.x + (i - 1.5) * 60, y: origin.y - 150}, a.radius);
          a.sheet.setSource('qa-still', [{stat:'moveSpeed',kind:'more',value:-1}]);
          a.anchored = true;
          a.spawnedAt = -1;
          w.actors.push(a); return a;
        });
        if (!w.promoteMagicPack(pack, '${recipe}')) throw new Error('promotion failed');
        if ('${recipe}' === 'encirclement') {
          pack[0].pos={x:origin.x-150,y:origin.y-210}; pack[1].pos={x:origin.x+150,y:origin.y-210};
          pack[2].pos={x:origin.x,y:origin.y-10};
        }
        if ('${recipe}' === 'mending_relay') pack[1].life = pack[1].maxLife()*0.4;
        if ('${recipe}' === 'vendetta') { w.kill(pack[0], false, w.player); w.kill(pack[1], false, w.player); }
        if ('${recipe}' === 'gravewheel') { w.kill(pack[0], false, w.player); w.kill(pack[2], false, w.player); }
        w.drops = [];
        const seconds = '${recipe}' === 'cinderchain' ? ('${scenario}' === 'cinderchain_fire' ? 4.45 : 3.7)
          : '${recipe}' === 'mending_relay' ? ('${scenario}' === 'mending_relay_active' ? 3.95 : 2.8)
          : '${recipe}' === 'encirclement' ? ('${scenario}' === 'encirclement_fire' ? 5.35 : 4.3)
          : '${recipe}' === 'hollow_choir' ? ('${scenario}' === 'hollow_choir_fire' ? 4.75 : 3.8)
          : '${recipe}' === 'shifting_breach' ? 5.3 : '${scenario}' === 'arclink_fire' ? 4.4
          : '${recipe}' === 'arclink' ? 3.5 : '${scenario}' === 'gravewheel_active' ? 2.5 : 0.5;
        for (let t=0; t<Math.round(seconds*60); t++) w.refreshMagicPacks(1/60);
        const a = pack.find(a => !a.dead), r = __game.renderer;
        // Drive the real hover plate through its ordinary pointer input.
        const screen = r.toScreen(a.pos), canvas = document.getElementById('game');
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('mousemove', {bubbles:true,clientX:rect.left+screen.x*rect.width/canvas.width, clientY:rect.top+screen.y*rect.height/canvas.height}));
        __game.step(1);
        return { recipe: '${recipe}', names: pack.map(a=>a.name), powers: pack.filter(a=>!a.dead).map(a=>a.magicPackPower),
          roles: pack.filter(a=>!a.dead).map(a=>a.magicPackRole), pending: pack.map(a=>a.magicPackPending),
          effects: w.magicPackEffects, donors:pack.map(a=>a.magicPackDonors),
          links: pack.filter(a=>a.magicPackFrom).length, fatal:__game.crash().fatal,
          image:document.getElementById('game').toDataURL('image/png') };
      })()`);
      const { image, ...facts } = result; log(facts);
      assert.equal(result.fatal, null);
      if (['wardbound','chorus','vendetta'].includes(recipe)) assert.ok(result.powers.every(p => p === (recipe === 'vendetta' ? 2 : 1)));
      if (['wardbound','chorus'].includes(recipe)) assert.ok(result.links > 0);
      if (['breachbearers','shifting_breach','siphon'].includes(recipe)) assert.equal(result.roles.filter(r=>r==='bearer').length,1);
      if (recipe === 'shifting_breach') assert.ok(result.pending.some(p=>p>0));
      if (recipe === 'siphon') assert.ok(result.donors.some(n=>n===3));
      if (['arclink','gravewheel'].includes(recipe)) {
        assert.ok(result.effects.length > 0);
        assert.ok(result.effects.every(e=>e.warning === !(scenario.endsWith('_fire') || scenario.endsWith('_active'))));
      }
      if (['cinderchain','mending_relay','encirclement','hollow_choir'].includes(recipe)) {
        assert.ok(result.effects.length > 0);
        const firing = scenario.endsWith('_fire') || scenario.endsWith('_active');
        assert.ok(result.effects.some(e=>e.warning !== firing));
        if (recipe === 'encirclement') assert.ok(result.effects.some(e=>e.points?.length === 3));
        if (recipe === 'hollow_choir') assert.ok(result.effects.every(e=>e.innerRadius === 85));
      }
      fs.writeFileSync(path.join(dir, `magic-pack-${scenario}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS: selected magic pack recipes and hazard phases render in the real client');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
