// Real passive panel, isolated hidden window and disposable save/profile paths.
// Run after npm run build: electron balance/passive-crossroads-ui.cjs
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'passive-crossroads-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'passive-crossroads-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'passive-crossroads-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(300);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        __game.world().meta.passivePoints = 4;
        __game.ui.toggleTree(); __game.step(2);
        document.querySelector('[data-node="cross_str_pursuit"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      })()`);
      await wait(150);
      const result = await win.webContents.executeJavaScript(`(() => {
        const pop = document.querySelector('.choice-popup'), r=pop.getBoundingClientRect();
        const input=pop.querySelector('.choice-search'); input.value='healed'; input.dispatchEvent(new Event('input'));
        return { options: pop.querySelectorAll('.choice-opt').length, visible:[...pop.querySelectorAll('.choice-opt')].filter(b=>getComputedStyle(b).display!=='none').map(b=>b.dataset.opt), rect:[r.x,r.y,r.width,r.height], text:pop.querySelector('.choice-search-count').textContent };
      })()`);
      log(result);
      assert.equal(result.options, 12);
      assert.deepEqual(result.visible, ['healer']);
      const [x,y,w,h]=result.rect;
      assert.ok(x>=0 && y>=0 && x+w<=width+1 && y+h<=height+1);
      await wait(150);
      fs.writeFileSync(path.join(dir, `passive-pursuit-${width}.png`), (await win.webContents.capturePage()).toPNG());
      const second = await win.webContents.executeJavaScript(`(() => {
        document.querySelector('.choice-popup [data-opt="healer"]').click();
        document.querySelector('[data-node="cross_str_technique"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        const pop=document.querySelector('.choice-popup');
        const count=pop.querySelectorAll('.choice-opt').length;
        const input=pop.querySelector('.choice-search'); input.value='ward'; input.dispatchEvent(new Event('input'));
        const visible=[...pop.querySelectorAll('.choice-opt')].filter(b=>!b.hidden).map(b=>b.dataset.opt);
        pop.querySelector('[data-opt="ward"]').click();
        return {count,visible,points:__game.world().meta.passivePoints,choices:__game.world().meta.choices};
      })()`);
      log(second);
      assert.equal(second.count,18); assert.deepEqual(second.visible,['ward']); assert.equal(second.points,2);
      assert.deepEqual(second.choices.cross_str_pursuit,['healer']); assert.deepEqual(second.choices.cross_str_technique,['ward']);
      const search = await win.webContents.executeJavaScript(`(() => {
        const input=document.querySelector('#tree-search'); input.value='hurled into the void'; input.dispatchEvent(new Event('input'));
        return document.querySelector('[data-node="cross_str_practice"]').classList.contains('search-hit');
      })()`);
      assert.equal(search,true);
      await wait(150);
      fs.writeFileSync(path.join(dir, `passive-search-${width}.png`), (await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`(() => {
        const input=document.querySelector('#tree-search');input.value='';input.dispatchEvent(new Event('input'));
        document.querySelector('[data-node="cross_str_practice"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      })()`);
      const school=await win.webContents.executeJavaScript(`(() => {
        const pop=document.querySelector('.choice-popup'), input=pop.querySelector('.choice-search');
        input.value='graft';input.dispatchEvent(new Event('input'));
        const grafts=[...pop.querySelectorAll('.choice-opt')].filter(b=>!b.hidden).length;
        input.value='no-such-choice';input.dispatchEvent(new Event('input'));
        const empty=pop.querySelector('.choice-search-count').textContent;
        input.value='';input.dispatchEvent(new Event('input'));
        return {grafts,empty,restored:[...pop.querySelectorAll('.choice-opt')].filter(b=>!b.hidden).length};
      })()`);
      assert.equal(school.grafts,6);assert.equal(school.empty,'No matching choices');assert.equal(school.restored,12);
      await wait(150);
      fs.writeFileSync(path.join(dir, `passive-school-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    // Execute the actual visual editor's serializer, then compile and load
    // its output. No source or user saves are overwritten by this check.
    const editorBundle=buildSync({ entryPoints:[path.resolve(__dirname,'../src/dev/passiveEditor.ts')], bundle:true, write:false, platform:'browser', format:'iife', globalName:'__crossroadsEditorQA' }).outputFiles[0].text;
    const serialized=await win.webContents.executeJavaScript(`(() => { ${editorBundle}\n __crossroadsEditorQA.mountPassiveEditor(__game.ui); return window.__passiveEditor.serializeTree(); })()`);
    assert.ok(serialized.includes("import './passiveCrossroads';"));
    const roundTrip=buildSync({ stdin:{contents:serialized,resolveDir:path.resolve(__dirname,'../src/data'),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',globalName:'__crossroadsRoundTripQA' }).outputFiles[0].text;
    const restored=await win.webContents.executeJavaScript(`(() => { ${roundTrip}\n const {PASSIVE_NODES:nodes,PASSIVE_ADJACENCY:adj}=__crossroadsRoundTripQA; return Object.values(nodes).filter(n=>n.id.startsWith('cross_')).map(n=>({id:n.id,group:n.choice.group,neighbors:adj[n.id]})); })()`);
    assert.equal(restored.length,36);
    assert.equal(new Set(restored.map(n=>n.id)).size,36);
    assert.equal(new Set(restored.map(n=>n.group)).size,11);
    for(const n of restored) {
      assert.ok(n.neighbors.length>0);
      if(n.id.endsWith('_mastery')) assert.ok(n.neighbors.some(id=>!id.startsWith('cross_')));
    }
    assert.deepEqual(errors,[]);
    log('PASS: choice filtering, real two-point allocation, nested tree search and school graft descriptions at two viewport sizes');
    console.log('Passive crossroads UI PASS');
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
