// Build first. Pixel-level menu materials and real HUD overlap, with isolated saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'menu-presentation-profile-' + process.pid));
if (process.env.HOLLOW_WAKE_QA_GPU !== '1') app.disableHardwareAcceleration();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Menu presentation timed out'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(dir, 'menu-presentation-saves-' + process.pid) });
  const win = new BrowserWindow({ show:false, width:2048, height:1031, useContentSize:true, webPreferences:{ offscreen:true, backgroundThrottling:false } });
  const js = code => win.webContents.executeJavaScript(`(async()=>{${code}})()`);
  const rows = [], checks = [];
  const check = (name, value) => { assert.ok(value, name); checks.push(name); };
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click();`);
  const palette = async (label, scale, selector = '#escape-menu .side-pane') => {
    await js(`document.documentElement.style.setProperty('--ui-scale','${scale}');`); await wait(400);
    const point = await js(`const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.round(r.x+r.width*.75),y:Math.round(r.y+15*${scale})};`);
    const screenshot = await win.webContents.capturePage();
    const pixel = [...screenshot.crop({...point,width:1,height:1}).toBitmap()];
    rows.push({label,scale,point,pixel});
    check(label + ': dark material survives at ' + scale + ' scale (' + pixel + ')', Math.max(...pixel.slice(0,3)) < 64);
    if (scale === .8) fs.writeFileSync(path.join(dir,'menu-presentation-'+label+'.png'),screenshot.toPNG());
  };
  const covered = async (rootSelector, moveMenu = false) => {
    await js(`const ui=__game.ui;ui.menuBarSync(1,true);ui.menuBarSync(0,true);
      ${moveMenu ? `const r=document.querySelector(${JSON.stringify(rootSelector)}).getBoundingClientRect(),b=ui.menuBar.root;
      Object.assign(b.style,{left:(r.x+r.width/2)+'px',top:(r.y+r.height/2)+'px',right:'auto',bottom:'auto'});ui.portalButton.seat();` : ''}`);
    return js(`const root=document.querySelector(${JSON.stringify(rootSelector)});
      return ['[data-menu-toggle]','#town-portal-button'].every(sel=>{
        const b=document.querySelector(sel),r=b.getBoundingClientRect();
        return r.width>0&&root.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      });`);
  };
  try {
    await win.loadURL(server.url);
    if (process.env.HOLLOW_WAKE_QA_DARKREADER) {
      await win.webContents.executeJavaScript(fs.readFileSync(process.env.HOLLOW_WAKE_QA_DARKREADER,'utf8'));
      await js('DarkReader.enable({brightness:100,contrast:100,sepia:0});');
    }
    await js(`for(let i=0;!window.__game&&i<200;i++)await new Promise(r=>setTimeout(r,100));await __game.hydrated();
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');
      __game.world().update=()=>{};__game.ui.hideAll();__game.ui.showCodex();`);
    for (const scale of [1,.8,.75,.85,1.25,1.5,2]) await palette('codex',scale);
    check('Game declares its authored dark palette before application boot', await js(`return !!document.querySelector('head meta[name="darkreader-lock"]')&&document.querySelector('head meta[name="color-scheme"]')?.content==='dark';`));
    if (process.env.HOLLOW_WAKE_QA_DARKREADER) check('External recoloring leaves the authored game palette alone',await js(`return !document.querySelector('style.darkreader');`));
    // Freeze only the test's frame loop so native placement does not undo a dragged HUD fixture.
    await js(`window.requestAnimationFrame=()=>0;document.documentElement.style.setProperty('--ui-scale','1');`); await wait(100);
    for (const anchor of ['beside','menu','right']) {
      await js(`__game.settings().portalButton.anchor='${anchor}';__game.settings().portalButton.visibility='always';`);
      check('Codex covers Menu and Portal in the '+anchor+' seat',await covered('#escape-menu'));
      await click('[data-cx-back]');
      await js('__game.ui.menuBarSync(1,true);__game.ui.menuBarSync(0,true);');
      check('Closing Codex restores HUD hit targets in the '+anchor+' seat',await js(`return ['[data-menu-toggle]','#town-portal-button'].every(sel=>{const b=document.querySelector(sel),r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});`));
      await js('__game.ui.showCodex();');
    }
    await click('[data-cx-back]');
    await js(`__game.settings().portalButton.anchor='beside';__game.ui.showEscapeMenu();`);
    check('Pause covers a Menu/Portal pair dragged beneath it',await covered('#escape-menu',true));
    await click('#esc-keys');
    check('Options retains the same navigation layer',await covered('#escape-menu',true));
    await click('#esc-back'); await click('#esc-resume'); await js('__game.ui.showWardrobe();');
    check('Wardrobe covers a Menu/Portal pair dragged beneath it',await covered('#escape-menu',true));
    await click('[data-wd-interface]');
    for (const frame of ['relic','astral','simple','aether']) {
      await js(`const s=document.querySelector('[data-interface-choice="frame"]');s.value='${frame}';s.dispatchEvent(new Event('change',{bubbles:true}));`);
      await click('[data-interface-save]');
      await palette('wardrobe-'+frame,.8,'.wardrobe');
    }
    await js(`document.documentElement.style.setProperty('--ui-scale','1');`);
    await click('[data-interface-back]'); await click('[data-wd-back]');
    await js(`__game.ui.hideAll();__game.ui.showMuClassCard('warrior',()=>{});`);
    check('Mu vessel selection covers the HUD at overlapping seats',await covered('#mu-card',true));
    check('Front-door and journey roots all share navigation order; ordinary books retain their order',await js(`const z=sel=>+getComputedStyle(document.querySelector(sel)).zIndex;
      return ['#escape-menu','#start-menu','#account-screen','#class-select','#expedition-setup','#mu-card','#story-card','#death-screen'].every(sel=>z(sel)>z('#menu-bar'))&&z('#inventory')<z('#menu-bar');`));
    await js(`__game.ui.hideAll();window.presentationLease=__game.loading.begin({kind:'travel',label:'Palette check',cancel:()=>{}});presentationLease.paint();`);
    const loading = win.webContents.mainFrame.frames.find(f=>f.url==='about:srcdoc');
    check('The isolated Crossing keeps the same authored palette declaration',!!loading&&await loading.executeJavaScript(`!!document.querySelector('meta[name="darkreader-lock"]')&&document.querySelector('meta[name="color-scheme"]')?.content==='dark'`));
    await js('presentationLease.finish();');
    const showcaseHtml = await (await fetch(server.url+'showcase.html')).text();
    check('Standalone showcases retain their authored palette',showcaseHtml.includes('name="darkreader-lock"')&&showcaseHtml.includes('name="color-scheme" content="dark"'));
    check('No fatal game error',await js('return __game.crash().fatal===null;'));
    console.log('MENU PRESENTATION OK: '+checks.length+' checks');
  } catch(error) { console.error(error); process.exitCode=1; }
  finally { fs.writeFileSync(path.join(dir,'menu-presentation-review.json'),JSON.stringify({checks,rows},null,2)); clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode||0); }
});
