// Build first. Actual page renderers and Wardrobe, isolated profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const scratch = makeTempDir('hollow-interface-style-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Interface style timed out'); app.exit(1); }, 60000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(scratch, 'saves') });
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
    const defaults = { frame:'aether', divider:'silver', ribbon:'pennants', palette:'frame', finish:'frame', marks:'engraved', typeface:'classic', runeActivity:50 };
    assert.deepEqual(JSON.parse(base), defaults); checks.push('Approved defaults apply at boot');
    for (const [selector,id] of [['[data-buildflap]','skills-panel'],['[data-passiveflap]','passive-tree'],['[data-characterflap]','char-sheet'],['[data-containerflap="reliquary"]','container-reliquary']]) {
      await click(selector); await wait(100);
      const result = await js(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}),p=document.getElementById(b.getAttribute('aria-controls'));const x=p.querySelector('[data-panel-x]'),r=x.getBoundingClientRect();return {id:p.id,frame:p.dataset.uiFrame,divider:p.dataset.uiDivider,chrome:p.querySelectorAll('.inv-frame-chrome').length,ornament:p.querySelectorAll('.inv-heading-ornament').length,clickable:x.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),expanded:b.getAttribute('aria-expanded')}})()`);
      check(id + ' shares theme and native controls', result.frame === 'aether' && result.divider === 'silver' && result.chrome === 1 && result.ornament === 1 && result.clickable && result.expanded === 'true');
      if (id === 'passive-tree') {
        check('Updating passive points preserves the Wardrobe divider', await js(`(()=>{
          const meta=__game.world().localSeat.meta, original=meta.passivePoints;
          const heading=document.querySelector('#passive-tree h2'), ornament=heading.querySelector('.inv-heading-ornament');
          try {
            meta.passivePoints=2;__game.ui.refreshTree();
            const showsPoints=heading.querySelector('.passive-points')?.textContent.includes('2 points');
            meta.passivePoints=0;__game.ui.refreshTree();
            return showsPoints&&!heading.querySelector('.passive-points')&&ornament===heading.querySelector('.inv-heading-ornament');
          } finally { meta.passivePoints=original;__game.ui.refreshTree(); }
        })()`));
      }
      await shot(id);
    }
    await js(`__game.ui.hideAll();__game.ui.toggleInventory();document.querySelector('[data-buildflap]').click();void 0`);
    const geometry = await js(`(()=>{const roots=[...document.querySelectorAll('.inventory-surface')];const selectors=['#inventory','[data-bag-grid]','.build-ribbons','[data-doll="helmet"]','#skills-panel'];const read=()=>selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height}});const themed=read();roots.forEach(p=>p.classList.remove('inventory-surface'));const plain=read();roots.forEach(p=>p.classList.add('inventory-surface'));return {themed,plain};})()`);
    // Border and ornament choices must not change control geometry or panel placement.
    console.log('GEOMETRY', JSON.stringify(geometry));
    assert.deepEqual(geometry.themed, geometry.plain); checks.push('Styling preserves panel, rail, grid and equipment geometry');
    check('Idle refresh retains focus, nodes and one decoration', await js(`(()=>{const b=document.querySelector('[data-bag-sort]');b.focus();__game.ui.refreshInventory(true);return b===document.querySelector('[data-bag-sort]')&&document.activeElement===b&&document.querySelectorAll('#inventory > .inv-frame-chrome').length===1})()`));
    const lessonStyle = () => js(`(()=>{const b=document.querySelector('[data-buildflap]');b.classList.add('tut-glow');const style=getComputedStyle(b,'::after');const result={pulse:style.animationName,glow:getComputedStyle(b).boxShadow};b.classList.remove('tut-glow');return result})()`);
    win.webContents.debugger.attach('1.3');
    try {
      const motion = value => win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value}]});
      await motion('no-preference');
      check('Tutorial ribbon pulses', (await lessonStyle()).pulse === 'tut-glow');
      await motion('reduce');
      const still = await lessonStyle();
      check('Reduced motion keeps a steady tutorial highlight', still.pulse === 'none' && still.glow !== 'none');
    } finally { win.webContents.debugger.detach(); }
    await js(`__game.ui.showWardrobe();void 0`); await click('[data-wd-interface]');
    await shot('wardrobe');
    assert.deepEqual(await js(`[...document.querySelectorAll('[data-interface-choice]')].map(s=>s.dataset.interfaceChoice).sort()`),Object.keys(defaults).filter(key=>key!=='runeActivity').sort());
    await js(`const slider=document.querySelector('[data-rune-activity]');slider.value='73';slider.dispatchEvent(new Event('input'));void 0`);
    await js(`const face=document.querySelector('[data-interface-choice="typeface"]');face.value='book';face.dispatchEvent(new Event('change'));void 0`);
    await click('[data-interface-template="brass-ledger"]');
    check('Changing templates preserves the reading face',await js(`document.querySelector('[data-interface-preview]').dataset.uiTypeface==='book' && getComputedStyle(document.querySelector('[data-interface-preview] .name')).fontFamily.includes('Georgia')`));
    check('Template previews the whole mix and preserves rune activity', await js(`document.querySelector('[data-interface-preview]').dataset.uiFinish==='ledger' && document.querySelector('[data-interface-choice="marks"]').value==='struck' && document.querySelector('[data-rune-activity]').value==='73' && __game.settings().interfaceStyle.runeActivity===50`));
    check('Draft equipment ink and page lining are isolated',await js(`(()=>{
      const preview=document.querySelector('[data-interface-preview]'),inventory=document.getElementById('inventory');
      const fill=root=>getComputedStyle(root.querySelector('.equipment-stamp path')).fillOpacity;
      return fill(preview)==='0.86' && fill(inventory)==='0.17'
        && getComputedStyle(preview.querySelector('.equipment-figure')).backgroundImage.includes('repeating-linear-gradient');
    })()`));
    await click('[data-interface-tab="Skills"]');
    check('Preview tabs show the learned skill cards',await js(`!document.querySelector('[data-preview-pane="Skills"]').hidden && document.querySelector('[data-preview-pane="Inventory"]').hidden`));
    await js(`for(const [key,value] of Object.entries({frame:'relic',divider:'runic',ribbon:'silver'})){const s=document.querySelector('[data-interface-choice="'+key+'"]');s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));}void 0`);
    check('Preview leaves settings and actual pages untouched', await js(`JSON.stringify(__game.settings().interfaceStyle)===${JSON.stringify(base)}&&document.querySelector('#inventory').dataset.uiFrame==='aether'&&document.querySelector('[data-interface-preview]').dataset.uiFrame==='relic'`));
    check('Mixing choices clears the matching template',await js(`document.querySelector('[data-template-name]').textContent==='Custom mix' && !document.querySelector('[data-interface-template][aria-pressed=true]')`));
    await click('[data-interface-back]'); await click('[data-wd-interface]');
    check('Leaving discards unsaved preview', await js(`document.querySelector('[data-interface-choice="frame"]').value==='aether'`));
    await js(`for(const [key,value] of Object.entries({frame:'astral',divider:'crest',ribbon:'runic',typeface:'clear'})){const s=document.querySelector('[data-interface-choice="'+key+'"]');s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));}void 0`);
    await js(`const slider=document.querySelector('[data-rune-activity]');slider.value='0';slider.dispatchEvent(new Event('input'));void 0`);
    await click('[data-interface-save]');
    check('Saving applies every existing page without rebuilding controls', await js(`[...document.querySelectorAll('.inventory-surface:not([data-interface-preview])')].every(p=>p.dataset.uiFrame==='astral'&&p.dataset.uiDivider==='crest'&&p.dataset.uiRibbon==='runic')`));
    await shot('wardrobe-astral');
    for (const width of [1000,640]) {
      win.setContentSize(width,900); await wait(150);
      check('Wardrobe fits width '+width, await js(`(()=>{const e=document.querySelector('.wardrobe');return e.scrollWidth<=e.clientWidth+1})()`));
    }
    win.setContentSize(1600,1000);
    await wait(250); await win.reload(); await wait(1400);
    assert.deepEqual(await js('__game.settings().interfaceStyle'),{...defaults,frame:'astral',divider:'crest',ribbon:'runic',typeface:'clear',runeActivity:0});checks.push('Saved lettering, style and disabled backdrop survive reload');
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
