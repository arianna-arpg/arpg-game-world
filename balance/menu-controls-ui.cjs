const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const scratch = makeTempDir('hollow-menu-controls-');
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(scratch,'profile'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root:path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir:path.join(scratch,'saves') });
 const win = new BrowserWindow({ show:false, width:1280, height:720, webPreferences:{ offscreen:true, backgroundThrottling:false } });
 const js = s => win.webContents.executeJavaScript(s);
 const click = async selector => { await js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`); await wait(80); };
 const shot = async name => { if (!process.argv.includes('--verify')) { await wait(150); fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG()); } };
 try {
  await win.loadURL(server.url); await wait(1200);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});
  await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0`);
  // Use a short viewport so the inventory page must exercise its inner scroller.
  win.setContentSize(1280, 560); await wait(100);
  await js(`__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.ui.toggleInventory();void 0`);
  await click('[data-buildflap]');
  const scroll = await js(`(()=>{
   const root=document.querySelector('#skills-panel'),body=root.querySelector('.build-scroll'),rack=root.querySelector('.build-rack');
   const seat=rack.querySelector('[data-rackunbind]'),drop=rack.querySelector('[data-drop="rackFree"]');
   const entry=[...body.children].find(el=>el.getClientRects().length);
   body.scrollTop=0;
   const before=[seat.getBoundingClientRect().y,drop.getBoundingClientRect().y,entry.getBoundingClientRect().y];
   body.scrollTop=body.scrollHeight;
   const after=[seat.getBoundingClientRect().y,drop.getBoundingClientRect().y,entry.getBoundingClientRect().y];
   const r=drop.getBoundingClientRect();
   return {before,after,top:body.scrollTop,reachable:drop.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),outer:root.scrollHeight<=root.clientHeight+1};
  })()`);
  assert(scroll.top>0);assert.deepEqual(scroll.before.slice(0,2),scroll.after.slice(0,2));
  assert(scroll.after[2]<scroll.before[2], JSON.stringify(scroll));assert(scroll.reachable && scroll.outer, JSON.stringify(scroll));
  await js(`__game.ui.refreshInventory();void 0`);
  await wait(250);
  assert.equal(await js(`document.querySelector('.build-scroll').scrollTop`),scroll.top);
  console.log('SKILLS SCROLL',scroll);
  await shot('menu-controls-skills.png');
  win.setContentSize(1280, 720); await wait(100);
  await js(`__game.ui.hideAll();__game.ui.showEscapeMenu();void 0`);await click('#esc-keys');
  // Both Options entry points keep Back visible and return to their own menu.
  for(const root of ['#escape-menu','#start-menu']) {
   if(root==='#start-menu') {
    await js(`__game.ui.hideEscapeMenu();__game.ui.showStartMenu(()=>{},()=>{});void 0`);
    await click('#sm-keys');
   }
   const tabs=await js(`Array.from(document.querySelectorAll('${root} [data-opttab]'),b=>b.dataset.opttab)`);
   assert.ok(tabs.includes('gameplay') && tabs.includes('saves'));
   const checkRibbon=async () => {
    const state=await js(`(()=>{
      const root=document.querySelector('${root}'),nav=root.querySelector('[role=tablist]'),body=root.querySelector('.options-body');
      const top=nav.getBoundingClientRect().top;
      body.scrollTop=body.scrollHeight;
      const clipped=[...nav.children].filter(button=>{
        const r=button.getBoundingClientRect();
        return !button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
      }).map(button=>button.textContent);
      const header=nav.closest('.side-head') || nav;
      return {clipped,pinned:top===nav.getBoundingClientRect().top,
        fits:header.scrollHeight<=header.clientHeight+1 && header.scrollWidth<=header.clientWidth+1,
        bodyHeight:body.clientHeight};
    })()`);
    assert(state.fits && state.pinned && !state.clipped.length && state.bodyHeight>0,JSON.stringify(state));
   };
   let tabBarTop;
   for(const tab of tabs) {
    await click(root+' [data-opttab="'+tab+'"]');
    const layout = await js(`(()=>{
     const root=document.querySelector('${root}'),body=root.querySelector('.options-body'),back=root.querySelector('#esc-back');
     const before=back.getBoundingClientRect().y;body.scrollTop=body.scrollHeight;
     const r=back.getBoundingClientRect();return {before,after:r.y,bottom:r.bottom,tabsTop:root.querySelector('[role=tablist]').getBoundingClientRect().top,outer:root.scrollHeight<=root.clientHeight+1,
      reachable:back.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),close:!!root.querySelector('[data-panel-x]')};
    })()`);
    assert.equal(layout.before,layout.after);assert(layout.reachable && layout.outer && !layout.close);assert(layout.bottom<=720);
    if(tabBarTop===undefined) tabBarTop=layout.tabsTop;
    assert.equal(layout.tabsTop,tabBarTop,'Options tabs stay seated while switching pages');
    await checkRibbon();
   }
   if(root==='#start-menu') {
    for(const [width,height,scale] of [[960,540,1],[390,700,1],[1280,720,2],[320,568,2]]) {
     win.setContentSize(width,height);
     await js(`document.documentElement.style.setProperty('--ui-scale','${scale}')`);
     await click(root+' [data-opttab="controls"]');await checkRibbon();
    }
    win.setContentSize(1280,720);await js("document.documentElement.style.setProperty('--ui-scale','1')");
   }
   const key = async keyCode => { for(const type of ['keyDown','keyUp']) win.webContents.sendInputEvent({type,keyCode});await wait(80); };
   await js(`document.querySelector('${root} [role=tab][aria-selected=true]').focus();void 0`);
   await key('Home');assert.equal(await js('document.activeElement.dataset.opttab'),'gameplay');
   await key('Right');assert.equal(await js('document.activeElement.dataset.opttab'),'controls');
   await key('Tab');assert(await js(`!!document.activeElement.closest('${root} [role=tabpanel]')`),'Tab reaches settings');
   if(root==='#escape-menu') {
    await click(root+' [data-opttab="controller"]');
    await js('window.__fakePad={buttons:Array(17).fill(0),axes:[0,0,0,0]};void 0');
    await click(root+' [data-padrebind="inspectTooltips"]');
    const pressPad=async (index, value)=>{await js(`window.__fakePad.buttons[${index}]=${value};void 0`);await wait(100);};
    await pressPad(1,1);await pressPad(1,0);
    assert.match(await js(`document.querySelector('${root} [data-pad-bind-help]').textContent`),/back button/);
    await pressPad(5,1);
    assert.equal(await js('__game.settings().padBinds.inspectTooltips'),'pad:rb');
    assert(await js(`document.documentElement.hasAttribute('data-inspecting')`),'a bound controller button enables inspection');
    await pressPad(5,0);
    assert(!(await js(`document.documentElement.hasAttribute('data-inspecting')`)),'releasing the button ends inspection');
    await js('delete window.__fakePad;void 0');
   }
   await click(root+' [data-opttab="interface"]');
   await click(root+' [data-options-wardrobe]');await click(root+' [data-wd-cursor]');
   assert(await js(`(() => { const swatches=[...document.querySelectorAll('${root} [data-cursor-color]')];return swatches.length>1 && new Set(swatches.map(b=>getComputedStyle(b,'::after').backgroundColor)).size===swatches.length; })()`),'every cursor preset displays its own tint');
   const prior=await js('__game.settings().cursor.color');
   const tint=await js(`[...document.querySelectorAll('${root} [data-cursor-color]')].find(b=>b.dataset.cursorColor!=='${prior}').dataset.cursorColor`);
   await click(root+' [data-cursor-color="'+tint+'"]');await click(root+' [data-hud-back]');
   assert.equal(await js('__game.settings().cursor.color'),prior,'leaving a preview discards the draft');
   await click(root+' [data-wd-cursor]');await click(root+' [data-cursor-color="'+tint+'"]');
   await click(root+' [data-hud-save]');assert.equal(await js('__game.settings().cursor.color'),tint);
   await click(root+' [data-hud-back]');await click(root+' [data-wd-back]');
   assert.equal(await js(`document.querySelector('${root} [aria-selected=true]').dataset.opttab`),'interface');
   await shot(root==='#escape-menu'?'menu-controls-options.png':'menu-controls-start-options.png');
   await click(root+' #esc-back');
   assert(await js(`!!document.querySelector('${root} ${root==='#escape-menu'?'#esc-keys':'#sm-keys'}')`));
  }
  await js(`__game.ui.hideAll();const w=__game.world();w.localSeat.actor.pos={x:-5000,y:-5000};__game.ui.menuBar.invalidate();__game.ui.menuBar.sync(1,true);__game.ui.toggleMenu();void 0`);
  assert.equal(await js(`document.querySelector('[data-stations-toggle]').getAttribute('aria-expanded')`),'false');
  assert.equal(await js(`document.querySelector('#menu-station-children').getBoundingClientRect().height`),0);
  assert.equal(await js(`document.querySelector('[data-nearby-station]').getAttribute('aria-disabled')`),'true');
  await shot('menu-controls-stations-collapsed.png');
  await click('[data-stations-toggle]');
  assert(await js(`document.querySelector('#menu-station-children').getBoundingClientRect().height>0`));
  assert(!(await js(`!!document.querySelector('#menu-station-children [data-menu-entry="salvage"]')`)));
  await js(`__game.world().account.features.add('salvage_station');__game.ui.menuBar.invalidate();__game.ui.menuBar.sync(1,true);void 0`);
  assert(await js(`document.querySelector('#menu-station-children [data-menu-entry="salvage"]').classList.contains('sealed')`));
  assert.equal(await js(`document.querySelector('[data-stations-toggle]').getAttribute('aria-expanded')`),'true');
  await shot('menu-controls-stations-expanded.png');
  await click('[data-stations-toggle]');
  // Real station geometry drives the primary action, and a stale enabled
  // button cannot open the font after the player has left its range.
  await js(`(()=>{const w=__game.world();w.localSeat.actor.pos={...w.fonts[0].pos};__game.ui.menuBar.invalidate();__game.ui.menuBar.sync(1,true);})()`);
  assert(!(await js(`document.querySelector('[data-nearby-station]').hasAttribute('aria-disabled')`)));
  await js(`__game.world().localSeat.actor.pos={x:-5000,y:-5000};document.querySelector('[data-nearby-station]').click();void 0`);
  assert(!(await js(`__game.ui.fontOpen`)));
  await js(`(()=>{const w=__game.world();w.localSeat.actor.pos={...w.fonts[0].pos};__game.ui.menuBar.invalidate();__game.ui.menuBar.sync(1,true);document.querySelector('[data-nearby-station]').click();})()`);
  assert(await js(`__game.ui.fontOpen`));assert(!(await js(`__game.ui.menuTrayOpen()`)));
  console.log('MENU CONTROLS UI PASS');
 } catch(e) { console.error(e); process.exitCode=1; }
 finally { win.destroy();server.server.close();app.exit(process.exitCode||0); }
});
