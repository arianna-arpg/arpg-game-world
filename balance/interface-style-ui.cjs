// Build first. Actual page renderers and Wardrobe, isolated profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `interface-style-profile-${process.pid}`));
app.disableHardwareAcceleration();
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Interface style timed out'); app.exit(1); }, 60000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(dir, `interface-style-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000, useContentSize: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async source => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(source)});}catch(e){return {qaError:e.stack};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`);
  const shot = async name => { await wait(120); fs.writeFileSync(path.join(dir, `interface-style-${name}.png`), (await win.webContents.capturePage()).toPNG()); };
  const checks = [];
  const check = (name, ok) => { assert(ok, name); checks.push(name); };
  try {
    await win.loadURL(server.url); await wait(1400);
    await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');const w=__game.world();w.update=()=>{};w.account.features.add('reliquary');w.account.ledger.odyssey_stage_2=1;__game.ui.hideAll();__game.ui.toggleInventory();void 0`);
    const base = await js(`JSON.stringify(__game.settings().interfaceStyle)`);
    check('Approved defaults apply at boot', base === JSON.stringify({ frame: 'aether', divider: 'silver', ribbon: 'pennants' }));
    for (const [selector,id] of [['[data-buildflap]','skills-panel'],['[data-passiveflap]','passive-tree'],['[data-characterflap]','char-sheet'],['[data-containerflap="reliquary"]','container-reliquary']]) {
      await click(selector); await wait(100);
      const result = await js(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}),p=document.getElementById(b.getAttribute('aria-controls'));const x=p.querySelector('[data-panel-x]'),r=x.getBoundingClientRect();return {id:p.id,frame:p.dataset.uiFrame,divider:p.dataset.uiDivider,chrome:p.querySelectorAll(':scope > .inv-frame-chrome').length,ornament:p.querySelectorAll('.inv-heading-ornament').length,clickable:x.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),expanded:b.getAttribute('aria-expanded')}})()`);
      check(id + ' shares theme and native controls', result.frame === 'aether' && result.divider === 'silver' && result.chrome === 1 && result.ornament === 1 && result.clickable && result.expanded === 'true');
      await shot(id);
    }
    await js(`__game.ui.hideAll();__game.ui.toggleInventory();document.querySelector('[data-buildflap]').click();void 0`);
    const geometry = await js(`(()=>{const roots=[...document.querySelectorAll('.inventory-surface')];const selectors=['#inventory','[data-bag-grid]','.build-ribbons','[data-doll="helmet"]','#skills-panel'];const read=()=>selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height}});const themed=read();roots.forEach(p=>p.classList.remove('inventory-surface'));const plain=read();roots.forEach(p=>p.classList.add('inventory-surface'));return {themed,plain};})()`);
    // Border and ornament choices must not change control geometry or panel placement.
    console.log('GEOMETRY', JSON.stringify(geometry));
    assert.deepEqual(geometry.themed, geometry.plain); checks.push('Styling preserves panel, rail, grid and equipment geometry');
    check('Idle refresh retains focus, nodes and one decoration', await js(`(()=>{const b=document.querySelector('[data-bag-sort]');b.focus();__game.ui.refreshInventory(true);return b===document.querySelector('[data-bag-sort]')&&document.activeElement===b&&document.querySelectorAll('#inventory > .inv-frame-chrome').length===1})()`));
    check('Tutorial pulse retains its animation', await js(`(()=>{const b=document.querySelector('[data-buildflap]');b.classList.add('tut-glow');const ok=getComputedStyle(b).animationName==='tut-glow';b.classList.remove('tut-glow');return ok})()`));
    await js(`__game.ui.showWardrobe();void 0`); await click('[data-wd-interface]');
    await shot('wardrobe');
    check('Wardrobe offers independent choices', await js(`document.querySelectorAll('[data-interface-choice]').length===3`));
    await js(`for(const [key,value] of Object.entries({frame:'relic',divider:'runic',ribbon:'silver'})){const s=document.querySelector('[data-interface-choice="'+key+'"]');s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));}void 0`);
    check('Preview leaves settings and actual pages untouched', await js(`JSON.stringify(__game.settings().interfaceStyle)===${JSON.stringify(base)}&&document.querySelector('#inventory').dataset.uiFrame==='aether'&&document.querySelector('[data-interface-preview]').dataset.uiFrame==='relic'`));
    await click('[data-interface-back]'); await click('[data-wd-interface]');
    check('Leaving discards unsaved preview', await js(`document.querySelector('[data-interface-choice="frame"]').value==='aether'`));
    await js(`for(const [key,value] of Object.entries({frame:'astral',divider:'crest',ribbon:'runic'})){const s=document.querySelector('[data-interface-choice="'+key+'"]');s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));}void 0`);
    await click('[data-interface-save]');
    check('Saving applies every existing page without rebuilding controls', await js(`[...document.querySelectorAll('.inventory-surface:not([data-interface-preview])')].every(p=>p.dataset.uiFrame==='astral'&&p.dataset.uiDivider==='crest'&&p.dataset.uiRibbon==='runic')`));
    await shot('wardrobe-astral');
    for (const width of [1000,640]) {
      win.setContentSize(width,900); await wait(150);
      check('Wardrobe fits width '+width, await js(`(()=>{const e=document.querySelector('.wardrobe');return e.scrollWidth<=e.clientWidth+1})()`));
    }
    win.setContentSize(1600,1000);
    await wait(250); await win.reload(); await wait(1400);
    check('Saved style survives disk hydration and reload', await js(`JSON.stringify(__game.settings().interfaceStyle)===JSON.stringify({frame:'astral',divider:'crest',ribbon:'runic'})`));
    await js(`__game.account().ledger.account_deaths=1;__game.ui.showAccountScreen();void 0`);await click('#acct-wardrobe');await click('[data-wd-interface]');
    await click('[data-interface-default]');
    check('Default restore also waits for Save', await js(`__game.settings().interfaceStyle.frame==='astral'`));
    await click('[data-interface-save]');await click('[data-interface-back]');await click('[data-wd-back]');
    check('Account Wardrobe preserves Vault return', await js(`!document.querySelector('.wardrobe')&&!!document.querySelector('#acct-wardrobe')`));
    fs.writeFileSync(path.join(dir,'interface-style-review.json'),JSON.stringify({checks,geometry},null,2));
    console.log(JSON.stringify({checks:checks.length,details:checks},null,2));
  }catch(error){console.error(error);process.exitCode=1;await shot('failure');}
  finally{clearTimeout(timer);win.destroy();server.server.close();app.exit(process.exitCode||0);}
});
