// Real client walkthrough. All account writes use a throwaway profile and saves directory.
// npm run build && npx electron balance/codex-ui.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const out = path.join(__dirname, 'reports', 'codex'); fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-codex-'));
app.setPath('userData', path.join(temp, 'profile'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(temp, 'saves') });
  const win = new BrowserWindow({ show: false, width: 1280, height: 900, useContentSize: true,
    webPreferences: { offscreen: true, backgroundThrottling: false, partition: 'codex-' + process.pid } });
  const js = source => win.webContents.executeJavaScript(source);
  const click = async sel => { assert.ok(await js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`), `Missing clickable ${sel}`); };
  const search = value => js(`(()=>{const e=document.querySelector('[data-cx-search]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const shot = async name => { await sleep(180); fs.writeFileSync(path.join(out, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const waitFor = async (source, limit = 15000) => { const end = Date.now()+limit; while(Date.now()<end){if(await js(`!!(${source})`))return; await sleep(100);} throw Error('Timed out: '+source); };
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  let checks=0; const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name);};
  const timer=setTimeout(()=>{console.error('CODEX UI timed out');app.exit(1);},150000);
  try {
    // A hidden walkthrough must not consume physical controller input from the desktop.
    await win.loadURL(server.url);
    await js("Object.defineProperty(navigator, 'getGamepads', { value: () => [] });");
    await waitFor('window.__game'); await js('__game.hydrated()');
    check('Codex is accessible from a fresh account main menu', await js(`!!document.querySelector('#sm-codex') && !document.querySelector('#sm-vault')`));
    await click('#sm-codex');
    check('all five sections are accessible and locked entries have no identity markup', await js(`document.querySelectorAll('[data-cx-section]').length===5 && [...document.querySelectorAll('.cx-locked')].every(c=>!c.querySelector('svg,[data-skill-showcase],[data-skill-acronym]'))`));
    await shot('01-skills');
    await search('Infernal Ray');
    check('search cannot reveal a locked skill', await js(`document.querySelectorAll('.cx-card').length===0 && !document.querySelector('[data-skill-showcase]')`));
    await search('Cleave');
    check('known skill displays its game icon and live base information', await js(`document.querySelector('.cx-detail h2').textContent==='Cleave' && document.querySelector('.cx-detail').textContent.includes('Base cooldown') && !!document.querySelector('.cx-card svg,.cx-card [data-skill-acronym]')`));
    await click('[data-cx-play]');
    await waitFor(`window.__skillShowcases?.stats().blits > 5`,25000);
    check('the current skill plays inside the Codex', await js(`window.__skillShowcases.stats().playing.startsWith('cleave|') && document.querySelectorAll('iframe[data-skill-showcase-engine]').length===1`));
    check('demonstration is fully visible after pressing Play', await js(`(()=>{const p=document.querySelector('.cx-detail').getBoundingClientRect(), r=document.querySelector('.skill-showcase').getBoundingClientRect();return r.top>=p.top && r.bottom<=p.bottom+1;})()`));
    await shot('02-demonstration');
    await click('[data-cx-page="supports"]');
    await waitFor(`!window.__skillShowcases.stats().running`);
    await search('Piercing');
    check('support shows discovered compatible demonstration hosts', await js(`document.querySelector('[data-cx-host]').options.length>0 && document.querySelector('.cx-detail').textContent.includes('Per additional level')`));
    await click('[data-cx-play]');
    await waitFor(`(window.__skillShowcases.stats().playing||'').includes('piercing')`);
    await shot('03-support');
    await click('[data-cx-section="classes"]');
    check('locked classes retain runic names', await js(`document.querySelectorAll('.cx-locked').length>0 && [...document.querySelectorAll('.cx-locked b')].every(c=>/[\u16a0-\u16ff]/.test(c.textContent))`));
    await shot('04-classes');
    await click('[data-cx-section="bestiary"]');
    await js(`__game.account().ledger['codex:sighted:zombie']=1;void 0`);
    await sleep(1100); await search('Shambling Zombie');
    check('an encounter without a kill opens only the basic creature page', await js(`document.querySelector('.cx-detail h2').textContent==='Shambling Zombie' && document.querySelectorAll('.cx-detail dt').length===1 && !document.querySelector('.cx-detail').textContent.includes('Base life')`));
    await shot('05-encounter');
    await js(`__game.account().ledger['bestiary:zombie']=500;__game.account().features.add('tracker');void 0`);
    await waitFor(`document.querySelector('.cx-detail').textContent.includes('Base armor')`);
    check('Tracker recruitment refreshes research in place', await js(`document.querySelector('.cx-detail').textContent.includes('Mastered') && document.querySelector('[data-cx-search]').value==='Shambling Zombie'`));
    await shot('06-research');
    await click('[data-cx-page="magic"]'); await search('Footfall');
    check('magic-pack reference contains the authored counterplay and live warning', await js(`document.querySelector('.cx-detail').textContent.includes('interrupt') && document.querySelector('.cx-detail').textContent.includes('1.65s')`));
    await click('[data-cx-page="affixes"]'); await search('Swift');
    check('elite affixes show their real modifiers', await js(`document.querySelector('.cx-detail').textContent.includes('35%')`));
    await click('[data-cx-section="mechanics"]');
    await search('Strength');
    check('attributes show per-point effects', await js(`document.querySelector('.cx-detail').textContent.includes('+2 Maximum Life')`));
    await click('[data-cx-page="conversions"]'); await search('Damage conversion');
    check('conversion calculator uses current damage types and rules', await js(`document.querySelector('[data-cx-output]').textContent==='50 physical + 50 fire'`));
    await js(`const p=document.querySelector('[data-cx-percent]');p.value='75';p.dispatchEvent(new Event('input'));void 0`);
    check('conversion calculator responds to edited inputs', await js(`document.querySelector('[data-cx-output]').textContent==='25 physical + 75 fire'`));
    await shot('07-mechanics');
    await click('[data-cx-section="abilities"]'); await click('[data-cx-page="skills"]'); await click('[data-cx-clear]');
    await js(`const tag=document.querySelector('[data-cx-tag]');tag.value='spell';tag.dispatchEvent(new Event('change'));void 0`);
    check('tag filters exclude undiscovered entries', await js(`document.querySelectorAll('.cx-locked').length===0 && document.querySelector('.cx-tags').textContent.includes('spell')`));
    await click('[data-cx-clear]'); await click('[data-cx-next]');
    check('pagination advances', await js(`document.querySelector('.cx-pager span').textContent.startsWith('Page 2')`));
    // Actual scaling, narrow screens and restored sizes; every root stays in bounds.
    for(const [width,height,scale] of [[800,600,1.5],[640,480,1],[1280,900,1]]) {
      win.setContentSize(width,height);await sleep(100);
      await js(`document.documentElement.style.setProperty('--ui-scale','${scale}');void 0`);
      const fit=await js(`(()=>{const r=document.querySelector('.codex').parentElement.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};})()`);
      check(`Codex fits ${width}×${height} at UI scale ${scale}`,fit.x>=0&&fit.y>=0&&fit.right<=fit.w+1&&fit.bottom<=fit.h+1);
      await shot(`08-layout-${width}-${scale}`);
      await js(`document.querySelector('.cx-card').scrollIntoView({block:'center'});document.querySelector('.cx-card').click();void 0`);
      check(`entry details remain reachable at ${width} and scale ${scale}`,await js(`(()=>{const r=document.querySelector('.cx-detail h2').getBoundingClientRect(), c=document.querySelector('.codex');return r.top>=0&&r.bottom<=innerHeight&&c.scrollWidth<=c.clientWidth+1;})()`));
      await shot(`08-detail-${width}-${scale}`);
      await js(`document.querySelector('.codex').scrollTop=0;void 0`);
    }
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});
    await waitFor(`!!document.querySelector('#sm-codex')`);
    check('Escape returns to the main menu',await js(`!document.querySelector('.codex')`));
    await js(`__game.account().ledger.account_deaths=1;__game.account().credits=25;__game.ui.showAccountScreen();void 0`);
    check('Vault directs owned browsing into the Codex',await js(`!document.querySelector('[data-vtab="owned"]') && !!document.querySelector('#acct-codex')`));
    await click('#acct-codex');await click('[data-cx-clear]');
    check('Owned contains permanent Tracker receipt',await js(`[...document.querySelectorAll('.cx-card')].some(e=>e.textContent.includes('Weslan'))`));
    await shot('09-owned');await click('[data-cx-back]');
    check('returning from Codex preserves the Reckoning and its unassigned essence',await js(`!!document.querySelector('#acct-close') && __game.account().credits===25`));
    await js(`__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');void 0`);await sleep(500);
    await js(`__game.ui.hideAll();__game.ui.toggleMenu();void 0`);
    check('in-game menu exposes the Codex without Tracker proximity',await js(`!!document.querySelector('[data-menu-entry="codex"]')`));
    await click('[data-menu-entry="codex"]');
    const t=await js('__game.world().time');await sleep(250);
    check('Codex participates in gameplay input blocking and solo pause',await js(`__game.ui.uiBlocking() && __game.ui.escapeMenuOpen && __game.world().time===${t}`));
    await click('[data-cx-back]');
    const resumed=await js('__game.world().time');await sleep(200);
    check('closing releases the menu hold and removes the reader',await js(`!document.querySelector('.codex') && !__game.ui.escapeMenuOpen && __game.world().time>${resumed}`));
    await js('__game.ui.showEscapeMenu();void 0');await click('#esc-codex');await click('[data-cx-back]');
    check('pause-menu Codex returns to its origin',await js(`!!document.querySelector('#esc-resume') && __game.ui.escapeMenuOpen`));
    check('no fatal or console errors',await js(`!__game.crash().fatal`) && errors.length===0);
    console.log(`CODEX UI OK: ${checks} checks; screenshots ${out}`);
  } catch(e) { console.error(e.stack||e); console.error('RENDERER ERRORS',errors);console.error(await js('JSON.stringify(__game.crash())')); await shot('failure'); process.exitCode=1; }
  finally { clearTimeout(timer); win.destroy();server.server.close();app.exit(process.exitCode||0); }
});
