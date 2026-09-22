// Build first. Hidden renderer and isolated saves; never touches the player's run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'font-passives-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'font-passives-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'font-passives-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `font-passives-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    const ready = await js(`(() => {
      __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world();w.loadZone('lastlight');w.player.invulnerable=true;w.meta.passivePoints=8;
      const f=w.fonts[0];if(!f)throw Error('No Font');w.player.pos={...f.pos};w.player.tier=f.tier||0;
      __game.ui.toggleTree();
      const plain=()=>[...document.querySelectorAll('.tree-node.available')].find(e=>!e.getAttribute('stroke-dasharray'));
      const node=plain();if(!node)throw Error('No available passive');const id=node.dataset.node;node.dispatchEvent(new MouseEvent('click'));
      window.fontQA={w,id,points:w.meta.passivePoints};__game.ui.closeTree();__game.ui.showFont();
      return {open:__game.ui.fontOpen,button:!!document.querySelector('[data-fontpassives]'),points:w.meta.passivePoints};
    })()`);log(ready);assert.equal(ready.points,7);assert(ready.button);await capture('station');
    const mode = await js(`(() => {
      document.querySelector('[data-fontpassives]').click();
      const q=fontQA,button=document.querySelector('[data-passive-refund-mode]');
      return {open:__game.ui.treeOpen,mode:button?.getAttribute('aria-pressed'),node:document.querySelector('[data-node="'+q.id+'"]')?.classList.contains('available')};
    })()`);log(mode);assert.equal(mode.mode,'true');assert(mode.node);await capture('refund-tree');
    const refunded = await js(`(() => {
      const q=fontQA;document.querySelector('.tree-node[data-node="'+q.id+'"]').dispatchEvent(new MouseEvent('click'));
      return {points:q.w.meta.passivePoints,allocated:q.w.meta.allocated.has(q.id),mode:document.querySelector('[data-passive-refund-mode]').getAttribute('aria-pressed')};
    })()`);log(refunded);assert.equal(refunded.points,8);assert.equal(refunded.allocated,false);assert.equal(refunded.mode,'true');
    const away = await js(`(() => {
      fontQA.w.player.pos.x+=1000;__game.ui.refreshTree();
      const b=document.querySelector('[data-passive-refund-mode]');return {disabled:b.disabled,mode:b.getAttribute('aria-pressed'),fatal:__game.crash().fatal};
    })()`);log(away);assert(away.disabled);assert.equal(away.mode,'false');assert.equal(away.fatal,null);
    log('PASS: Font opens refund mode; real node click refunds its point; moving away disables service');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
