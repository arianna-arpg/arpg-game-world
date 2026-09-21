// Build first. Hidden client and isolated saves; captures the real inn.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'speech-focus-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'speech-focus-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'speech-focus-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    const result = await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(), r = __game.renderer;
      w.loadZone('lastlight');
      const keeper = w.actors.find(a => a.defId === 'townsfolk_innkeep');
      const patron = w.actors.find(a => a.defId === 'townsfolk_patron');
      if (!keeper || !patron) throw new Error('Missing inn speakers');
      const kpos = { ...keeper.pos };
      const hero = { x: kpos.x, y: kpos.y + 70 };
      const ppos = { x: hero.x + 25, y: hero.y };
      for (const a of w.actors) if (a !== keeper && a !== patron && a !== w.player) a.pos = { x: 20, y: 20 };
      w.player.pos = { ...hero }; w.player.tier = 0;
      if (!w.dwellReachable(hero, kpos, 'roof', { from: 0, to: 0 })) throw new Error('Inn counter fixture unreachable');
      if (!w.dwellReachable(hero, ppos, 'sight', { from: 0, to: 0 })) throw new Error('Patron fixture unreachable');
      const captures = [];
      const run = (frames, moving, keepKeeper = true) => {
        for (let i = 0; i < frames; i++) {
          w.player.pos = { ...hero }; patron.pos = { ...ppos }; patron.tier = 0;
          keeper.pos = keepKeeper ? { ...kpos } : { x: 20, y: 20 };
          w.mireilleCd = 999; // Keep the welcome state stable without granting a gift.
          if (moving) w.localSeat.lastActedAt = w.time;
          __game.step(1);
        }
        const box=document.getElementById('npc-dialogue'); return box && !box.hidden ? [{ id: Number(box.dataset.speakerId), text: box.querySelector('.dialogue-accessible').textContent }] : [...r.speechClocks].filter(([, c]) => c.startedAt !== null).map(([a, c]) => ({ id: a.id, text: c.text }));
      };
      const snap = name => captures.push({ name, image: document.getElementById('game').toDataURL('image/png') });
      const passing = run(45, true); snap('passing');
      const early = run(12, false);
      const keeperView = run(150, false); snap('keeper');
      const patronEarly = run(1, false, false);
      const patronView = run(110, false, false); snap('patron');
      return { passing, early, keeperView, patronEarly, patronView,
        keeperId: keeper.id, patronId: patron.id, fatal: __game.crash().fatal, captures };
    })()`);
    const { captures, ...facts } = result; log(facts);
    for (const capture of captures) fs.writeFileSync(path.join(dir, `speech-focus-${capture.name}.png`), Buffer.from(capture.image.split(',')[1], 'base64'));
    assert.equal(result.fatal, null);
    assert.equal(result.passing.length, 0, 'walking past stays quiet');
    assert.equal(result.early.length, 0, 'brief stop stays quiet');
    assert.deepEqual(result.keeperView.map(x => x.id), [result.keeperId], 'Mireille wins over the closer patron');
    assert.equal(result.patronEarly.length, 0, 'new focus earns its own dwell');
    assert.deepEqual(result.patronView.map(x => x.id), [result.patronId], 'patron speaks after its own dwell');
    log('PASS speech focus: pass-by, brief stop, functional priority, ambient dwell, real inn rendering');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
