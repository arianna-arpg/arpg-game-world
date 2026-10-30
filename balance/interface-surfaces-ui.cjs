// Real UI theme changes through Wardrobe; isolated saves and a hidden renderer.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'interface-surfaces-profile-' + process.pid));
app.disableHardwareAcceleration();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Interface surfaces timed out'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(dir, 'interface-surfaces-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000, useContentSize: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:e.stack};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  const shot = async name => { await wait(350); fs.writeFileSync(path.join(dir, 'interface-surfaces-' + name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`);
  const choose = (key, value) => js(`(()=>{const s=document.querySelector('[data-interface-choice="${key}"]');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const checks = [], check = (label, value) => { assert.ok(value, label); checks.push(label); };
  try {
    await win.loadURL(server.url); await wait(1000);
    await js(`__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');const w=__game.world();w.update=()=>{};w.player.invulnerable=true;__game.ui.hideAll();__game.ui.toggleInventory();document.querySelector('[data-buildflap]').click();document.querySelector('[data-characterflap]').click();void 0`);
    await wait(100);
    const geometry = await js(`(()=>{const selectors=['#inventory','.folio-strip','.folio-tab','#char-sheet'];const read=()=>selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height}});const themed=read();const sheet=document.getElementById('interface-surface-theme');sheet.disabled=true;const plain=read();sheet.disabled=false;return {themed,plain}})()`);
    assert.deepEqual(geometry.themed, geometry.plain); checks.push('Folio tabs and panels keep exact native geometry');
    check('Top tabs use the pennant material', await js(`getComputedStyle(document.querySelector('.folio-tab')).backgroundImage.includes('135deg')`));
    await click('[data-folio-tab="skills"]');
    check('Native tab selection still fronts Skills', await js(`document.querySelector('[data-folio-tab="skills"]').getAttribute('aria-selected')==='true'&&!document.querySelector('#skills-panel').classList.contains('folio-shelved')`));
    await shot('tabs');
    await js(`__game.ui.showWardrobe();void 0`); await click('[data-wd-interface]');
    await choose('frame', 'astral'); await choose('divider', 'runic'); await choose('ribbon', 'runic');
    check('Draft tab motif is isolated from actual tabs', await js(`getComputedStyle(document.querySelector('[data-interface-preview] .folio-tab')).backgroundImage.includes('repeating-linear-gradient')&&!getComputedStyle(document.querySelector('body > .folio-strip .folio-tab')).backgroundImage.includes('repeating-linear-gradient')`));
    check('Draft leaves global palette unchanged', await js(`getComputedStyle(document.documentElement).getPropertyValue('--inv-edge').trim()==='#527e78'`));
    await click('[data-interface-save]');
    check('Saving updates live folio tabs', await js(`getComputedStyle(document.querySelector('body > .folio-strip .folio-tab')).backgroundImage.includes('repeating-linear-gradient')`));
    const coverage = await js(`['vendor-menu','salvage-menu','font-menu','recall-menu','oracle-menu','bestiary-menu','borough-menu','bounty-menu','caravan-menu','sail-menu','hold-menu','merc-menu','vocation-menu','world-map','story-card','mu-card','death-screen','class-select','expedition-setup','npc-dialogue'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el);return {id,edge:s.borderLeftColor,fill:s.backgroundImage}})`);
    const missed = coverage.filter(row => row.edge !== 'rgb(125, 114, 151)' || !row.fill.includes('radial-gradient'));
    check('All station, dialogue, map and journey roots inherit the saved frame: ' + JSON.stringify(missed), missed.length === 0);
    check('New panels inherit immediately without extra render hooks', await js(`(()=>{const p=document.createElement('div');p.className='panel';p.innerHTML='<h2>New activity</h2><input value="draft"><button>Act</button>';document.body.append(p);const s=getComputedStyle(p),h=getComputedStyle(p.querySelector('h2'),'::after');const ok=s.borderLeftColor==='rgb(125, 114, 151)'&&h.backgroundImage.includes('repeating-linear-gradient');p.remove();return ok})()`));
    check('Chosen, bound and inline skill actions keep their native emphasis', await js(`(()=>{const p=document.createElement('div');p.className='panel choice-popup';p.innerHTML='<button class="choice-opt chosen">Chosen</button><button class="bound">Bound</button><button class="skill-tree-link">Skill</button>';document.body.append(p);const read=()=>[...p.children].map(el=>{const s=getComputedStyle(el);return [s.backgroundImage,s.backgroundColor]});const themed=read();const sheet=document.getElementById('interface-surface-theme');sheet.disabled=true;const plain=read();sheet.disabled=false;p.remove();return JSON.stringify(themed)===JSON.stringify(plain)})()`));
    await shot('wardrobe');
    await click('[data-interface-back]'); await click('[data-wd-back]');
    await js(`__game.ui.showEscapeMenu();void 0`);
    check('Pause menu uses shared controls and still has Resume', await js(`getComputedStyle(document.querySelector('#esc-resume')).backgroundImage.includes('linear-gradient')`));
    await shot('pause'); await click('#esc-resume');
    await js(`__game.ui.menuBar.openTray();void 0`);
    check('Menu tray inherits saved frame', await js(`getComputedStyle(document.querySelector('.menu-tray')).borderLeftColor==='rgb(125, 114, 151)'`));
    await shot('menu'); await js(`__game.ui.menuBar.closeTray();__game.ui.hideAll();const w=__game.world();const smith=w.actors.find(a=>a.defId==='townsfolk_smith');w.player.pos={...smith.pos};w.player.tier=smith.tier;__game.ui.showVendor();void 0`);
    check('Vendor opens with real stock', await js(`!document.querySelector('#vendor-menu').classList.contains('hidden')&&!!document.querySelector('[data-vware],[data-vgem]')`));
    check('Vendor neutral item fills share the inventory material', await js(`getComputedStyle(document.querySelector('[data-vware],[data-vgem]')).backgroundImage.includes('radial-gradient')`));
    await shot('vendor');
    await js(`__game.ui.hideAll();__game.account().ledger.account_deaths=1;__game.ui.showAccountScreen();void 0`);
    check('Vault side shell inherits saved palette', await js(`getComputedStyle(document.querySelector('.side-pane')).getPropertyValue('--side-accent').trim()==='#d3c5ef'`));
    await shot('vault');
    await js(`__game.ui.hideAll();window.themeLease=__game.loading.begin({kind:'travel',label:'Theme check',cancel:()=>{}});themeLease.paint()`);
    const crossing = win.webContents.mainFrame.frames.find(f => f.url === 'about:srcdoc');
    assert.ok(crossing, 'isolated loading frame exists');
    check('Loading controls receive the saved palette across frame isolation', await crossing.executeJavaScript(`getComputedStyle(document.querySelector('#mu-loading-screen button')).borderTopColor==='rgb(125, 114, 151)'`));
    await js(`themeLease.finish();void 0`); await wait(200);
    check('No fatal game error', await js(`__game.crash().fatal===null`));
    fs.writeFileSync(path.join(dir, 'interface-surfaces-review.json'), JSON.stringify({ checks, coverage, geometry }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, details: checks }, null, 2));
  } catch (error) { console.error(error); process.exitCode=1; await shot('failure'); }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode||0); }
});
