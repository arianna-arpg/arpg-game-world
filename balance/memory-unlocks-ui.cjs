// Real Vault input, isolated saves. Run after npm run build.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `memory-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `memory-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = source => win.webContents.executeJavaScript(source);
  const open = async () => { await js(`__game.ui.showAccountScreen(); document.querySelector('[data-vtab="gems"]')?.click(); void 0`); await wait(100); };
  const receipt = id => js(`__game.account().memoryReceipts[${JSON.stringify(id)}] ?? null`);
  try {
    await win.loadURL(server.url); await wait(800);
    await js(`Object.assign(__game.account(), {credits:10000,level:20}); __game.account().ledger.account_deaths=1; void 0`);
    await open();
    assert.equal(await js(`document.querySelectorAll('[data-invest^="gem_skills_"], [data-invest^="sup_"]').length`), 0);
    assert.equal(await js(`document.querySelectorAll('[data-invest^="memory_"]').length`), 2);
    await js(`document.querySelector('[data-invest="memory_discovery"]').click(); void 0`);
    const first = await receipt('memory_discovery');
    assert(first && first.sequence === 1, 'click grants one result');
    await js(`document.querySelector('[data-invest="memory_discovery"]').click(); void 0`);
    const second = await receipt('memory_discovery');
    assert.equal(second.sequence, 2);
    assert.notEqual(first.kind + ':' + first.id, second.kind + ':' + second.id);
    // A held pointer must stop at ONE completion, even though the card is repeatable.
    await js(`document.querySelector('[data-invest="memory_discovery"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,pointerId:1})); void 0`);
    await wait(4000);
    assert.equal((await receipt('memory_discovery')).sequence, 3, 'hold stops at one purchase');
    await js(`document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,pointerId:1})); void 0`);
    await wait(600);
    await js(`document.querySelector('[data-invest="memory_secondary"]').click(); void 0`);
    const awakened = await receipt('memory_secondary');
    assert.equal(awakened.kind, 'skill');
    assert(await js(`__game.account().memorySecondary.has('skill:'+__game.account().memoryReceipts.memory_secondary.id)`));
    await wait(200);
    fs.writeFileSync(path.join(dir, 'memory-unlocks.png'), (await win.webContents.capturePage()).toPNG());
    await win.loadURL(server.url); await wait(800); await open();
    assert.equal((await receipt('memory_discovery')).sequence, 3, 'result persists after reload');
    assert.equal((await receipt('memory_secondary')).id, awakened.id);
    assert(await js(`document.querySelector('[data-memory-result="memory_secondary"]').textContent.includes('Last awakened')`));
    // The real skill-tree pane shows the same gate enforced by the engine.
    const tree = await js(`(() => {
      __game.devStartRun('warrior');
      const w=__game.world(), ui=__game.ui;
      const inst=[...w.localSeat.meta.knownSkills.values()].find(s=>s.def.tree);
      inst.level=100; __game.account().memorySecondary.delete('skill:'+inst.def.id);
      ui.openSkillTree(inst.def.id);
      return {id:inst.def.id, blocked:document.querySelectorAll('.st-node.available').length===0,
        reason:document.body.textContent.includes('Awaken this skill')};
    })()`);
    assert(tree.blocked && tree.reason, 'locked tree previews but cannot spend');
    assert(await js(`(() => { __game.account().memorySecondary.add('skill:'+${JSON.stringify(tree.id)}); __game.ui.refreshSkillTree(${JSON.stringify(tree.id)}); return document.querySelectorAll('.st-node.available').length>0; })()`), 'awakening enables tree nodes');
    console.log('PASS memory UI: mixed discovery / repeat click / one draw per hold / awakening / persistence / tree gate');
  } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
