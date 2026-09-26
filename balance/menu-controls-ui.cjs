const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `menu-controls-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root:path.resolve(__dirname,'../dist'), savesDir:path.join(dir,`menu-controls-saves-${process.pid}`) });
 const win = new BrowserWindow({ show:false, width:1280, height:720, webPreferences:{ offscreen:true, backgroundThrottling:false } });
 const js = s => win.webContents.executeJavaScript(s);
 const click = async selector => { await js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`); await wait(80); };
 const shot = async name => { await wait(150); fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG()); };
 try {
  await win.loadURL(server.url); await wait(1200);
  await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0`);
  // Use a short viewport so the inventory page must exercise its inner scroller.
  win.setContentSize(1280, 560); await wait(100);
  await js(`__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.ui.toggleInventory();void 0`);
  await click('[data-buildflap]');
  const scroll = await js(`(()=>{
   const root=document.querySelector('#skills-panel'),body=root.querySelector('.build-scroll'),rack=root.querySelector('.build-rack');
   const seat=rack.querySelector('[data-rackunbind]'),drop=rack.querySelector('[data-drop="rackFree"]');
   const before=[seat.getBoundingClientRect().y,drop.getBoundingClientRect().y,body.firstElementChild.getBoundingClientRect().y];
   body.scrollTop=body.scrollHeight;
   const after=[seat.getBoundingClientRect().y,drop.getBoundingClientRect().y,body.firstElementChild.getBoundingClientRect().y];
   const r=drop.getBoundingClientRect();
   return {before,after,top:body.scrollTop,reachable:drop.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),outer:root.scrollHeight<=root.clientHeight+1};
  })()`);
  assert(scroll.top>0);assert.deepEqual(scroll.before.slice(0,2),scroll.after.slice(0,2));
  assert(scroll.after[2]<scroll.before[2]);assert(scroll.reachable && scroll.outer);
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
   for(const tab of ['controls','interface','visuals','controller']) {
    await click(root+' [data-opttab="'+tab+'"]');
    const layout = await js(`(()=>{
     const root=document.querySelector('${root}'),body=root.querySelector('.options-body'),back=root.querySelector('#esc-back');
     const before=back.getBoundingClientRect().y;body.scrollTop=body.scrollHeight;
     const r=back.getBoundingClientRect();return {before,after:r.y,bottom:r.bottom,outer:root.scrollHeight<=root.clientHeight+1,
      reachable:back.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),close:!!root.querySelector('[data-panel-x]')};
    })()`);
    assert.equal(layout.before,layout.after);assert(layout.reachable && layout.outer && !layout.close);assert(layout.bottom<=720);
   }
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
