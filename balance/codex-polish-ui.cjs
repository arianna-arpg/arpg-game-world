// Focused Codex interaction course. All writes stay in a throwaway account.
// Build first; npx electron balance/codex-polish-ui.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const out = path.join(__dirname, 'reports', 'codex-polish'); fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-codex-polish-'));
app.setPath('userData', path.join(temp, 'profile'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(temp, 'saves') });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000, useContentSize: true,
    webPreferences: { offscreen: true, backgroundThrottling: false, partition: 'codex-polish-' + process.pid } });
  const js = source => win.webContents.executeJavaScript(source);
  const click = sel => js(`document.querySelector(${JSON.stringify(sel)}).click();void 0`);
  const focus = sel => js(`document.querySelector(${JSON.stringify(sel)}).focus();void 0`);
  const search = value => js(`(()=>{const e=document.querySelector('[data-cx-search]');e.focus();e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await sleep(80); };
  const wait = async (source, limit = 15000) => { const end=Date.now()+limit;while(Date.now()<end){if(await js(`!!(${source})`))return;await sleep(80);}throw Error('Timed out: '+source); };
  const shot = async name => { await sleep(450); fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG()); };
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name);};
  const timer=setTimeout(()=>{console.error('CODEX POLISH timed out');app.exit(1);},210000);
  try {
    await win.loadURL(server.url);await js("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});");
    await wait('window.__game');await js('__game.hydrated()');await click('#sm-codex');await sleep(450);
    await js("window.savedShell=document.querySelector('.side-screen');window.savedBrand=document.querySelector('.side-masthead');void 0");
    check('no automatic demonstration on entry',await js("!document.querySelector('.codex [data-skill-showcase]')"));
    await focus('[data-cx-section="abilities"]');await key('Right');
    check('ribbon arrows navigate with focus on the selected section',await js("document.activeElement.dataset.cxSection==='account' && document.activeElement.getAttribute('aria-current')==='true'"));
    await key('End');check('ribbon End reaches classes',await js("document.activeElement.dataset.cxSection==='classes'"));await key('Home');
    check('full navigation retains the shell and masthead nodes',await js("savedShell===document.querySelector('.side-screen') && savedBrand===document.querySelector('.side-masthead')"));
    await key('/');check('slash focuses search',await js("document.activeElement.matches('[data-cx-search]')"));
    await search('firebolt spell');
    check('multi-term search combines name and tag and retains typing focus',await js("document.querySelector('.cx-detail h2').textContent==='Firebolt' && document.querySelectorAll('.cx-card').length===1 && document.activeElement.matches('[data-cx-search]')"));
    await key('Escape');check('Escape first clears a focused query',await js("document.querySelector('[data-cx-search]').value==='' && !!document.querySelector('.codex')"));
    await key('Down');check('search Down reaches the selected result',await js("document.activeElement.matches('.cx-card[aria-pressed=true]')"));
    await key('End');check('grid End reaches the last visible entry',await js("document.activeElement===document.querySelector('.cx-card:last-child')"));
    await key('PageDown');check('keyboard paging preserves result focus',await js("document.querySelector('.cx-pager span').textContent.startsWith('Page 2') && document.activeElement.matches('.cx-card')"));
    await key('f',['control']);check('Ctrl+F returns to search',await js("document.activeElement.matches('[data-cx-search]')"));
    await search('Cleave');await click('[data-cx-play]');
    await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'",25000);
    await js("window.savedPreview=document.querySelector('.skill-showcase');window.savedPlay=document.querySelector('[data-cx-play]');void 0");
    await search('cleave melee');await js("__game.account().ledger['codex:sighted:zombie']=1;void 0");await sleep(1100);
    check('matching search and account refresh retain the playing node',await js("savedPreview===document.querySelector('.skill-showcase') && savedPlay===document.querySelector('[data-cx-play]') && document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'"));
    await js("__game.account().features.add('unlock_all_gems');void 0");
    await wait("document.querySelector('.cx-detail').textContent.includes('Awakened')");
    check('changed entry facts retain the live preview and its controls',await js("savedPreview===document.querySelector('.skill-showcase') && savedPlay===document.querySelector('[data-cx-play]') && document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'"));
    await js("__game.account().features.delete('unlock_all_gems');void 0");await wait("document.querySelector('.cx-detail').textContent.includes('Dormant')");
    await focus('[data-cx-replay]');await click('[data-cx-replay]');
    await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('Restart restages while keeping keyboard focus',await js("savedPreview!==document.querySelector('.skill-showcase') && document.activeElement.matches('[data-cx-replay]')"));
    check('playing stage and stop control fit in the reading pane',await js("(()=>{const p=document.querySelector('.cx-detail').getBoundingClientRect(),s=document.querySelector('.cx-stage').getBoundingClientRect(),c=document.querySelector('[data-cx-play]').getBoundingClientRect();return s.top>=p.top-1 && s.bottom<=p.bottom+1 && c.top>=p.top-1 && c.bottom<=p.bottom+1;})()"));
    await shot('01-skill-playing');
    await click('[data-cx-play]');await wait('!__skillShowcases.stats().running');
    check('Stop restores a stable idle stage and removes the player',await js("document.querySelector('.cx-stage').dataset.cxPreviewState==='idle' && !document.querySelector('.codex .skill-showcase')"));
    await click('[data-cx-page="supports"]');await search('Piercing');await click('[data-cx-play]');
    await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('support demonstration includes its real support spec',await js("document.querySelector('.skill-showcase').dataset.showcaseSupports.includes('piercing') && __skillShowcases.stats().playing.includes('piercing')"));
    await click('[data-cx-support]');await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('comparison plays the same base skill without the support',await js("!document.querySelector('.skill-showcase').dataset.showcaseSupports && !__skillShowcases.stats().playing.includes('piercing')"));
    await js("(()=>{const e=document.querySelector('[data-cx-host]');e.focus();e.selectedIndex=e.options.length-1;e.dispatchEvent(new Event('change'));window.lastHost=e.value;})()");
    await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('changing a compatible host preserves its control and focus',await js("document.activeElement.matches('[data-cx-host]') && document.querySelector('.skill-showcase').dataset.skillShowcase===lastHost"));
    await shot('02-support-comparison');
    // Inject the shared host's failure signal to test the surface's real recovery path.
    await js("document.querySelector('.skill-showcase').setAttribute('data-showcase-empty','');void 0");
    await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='unavailable'");
    check('unavailable demonstrations expose a retry action',await js("document.querySelector('[data-cx-play]').textContent==='Retry demonstration'"));
    await click('[data-cx-play]');await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('Retry recovers through a fresh native showcase',await js("!document.querySelector('.skill-showcase').hasAttribute('data-showcase-empty')"));
    await click('[data-cx-section="mechanics"]');await wait('!__skillShowcases.stats().running');
    await click('[data-cx-page="conversions"]');await search('Damage conversion');
    await js("(()=>{const e=document.querySelector('[data-cx-percent]');e.focus();e.value='73';e.dispatchEvent(new Event('input'));__game.account().ledger['codex:sighted:bandit']=1;})()");await sleep(1100);
    check('account refresh preserves a calculator edit and focus',await js("document.activeElement.matches('[data-cx-percent]') && document.querySelector('[data-cx-output]').textContent==='27 physical + 73 fire'"));
    await click('[data-cx-section="abilities"]');await click('[data-cx-page="skills"]');await click('[data-cx-clear]');
    await js("(()=>{const e=document.querySelector('[data-cx-tag]');e.value='spell';e.dispatchEvent(new Event('change'));})()");await search('firebolt');await click('[data-cx-clear-query]');
    check('clear search retains tags and tag privacy',await js("document.querySelector('.cx-tags').textContent.includes('spell') && !document.querySelector('.cx-locked') && document.querySelector('[data-cx-tag] option[value=spell]').disabled"));
    await click('[data-cx-remove]');check('removing a tag makes it available again',await js("!document.querySelector('[data-cx-tag] option[value=spell]').disabled"));
    await search('<img src=x onerror=alert(1)>');check('query markup remains text and has a useful empty state',await js("!document.querySelector('.cx-card') && !document.querySelector('.codex img') && !!document.querySelector('[data-cx-reset]')"));
    await click('[data-cx-reset]');await shot('03-desktop-browser');
    for(const [width,height,scale] of [[800,600,1.5],[640,480,1],[390,844,1],[390,844,2],[320,568,2]]) {
      win.setContentSize(width,height);await js(`document.documentElement.style.setProperty('--ui-scale','${scale}');void 0`);await sleep(120);
      await click('[data-cx-clear]');await click('[data-cx-next]');
      await js("(()=>{const g=getComputedStyle(document.querySelector('.cx-list')).overflowY==='auto'?document.querySelector('.cx-list'):document.querySelector('.cx-grid');g.scrollTop=g.scrollHeight;document.querySelector('.cx-card:last-child').scrollIntoView({block:'nearest'});})()");await sleep(80);
      await js("window.scrollBox=getComputedStyle(document.querySelector('.cx-list')).overflowY==='auto'?document.querySelector('.cx-list'):document.querySelector('.cx-grid');window.savedScroll=scrollBox.scrollTop;document.querySelector('.cx-card:last-child').click();void 0");
      check(`compact reading at ${width}/${scale} hides results and keeps the title reachable`,await js("(()=>{const d=document.querySelector('.cx-detail'),t=d.querySelector('h2').getBoundingClientRect(),b=d.getBoundingClientRect();return getComputedStyle(document.querySelector('.cx-list')).display==='none' && getComputedStyle(d).display==='block' && t.top>=b.top-1 && t.top< b.bottom;})()"));
      check(`footer and pane stay in bounds at ${width}/${scale}`,await js("(()=>{const c=document.querySelector('.codex'),b=document.querySelector('[data-cx-back]').getBoundingClientRect();return c.scrollWidth<=c.clientWidth+1 && b.top>=0 && b.bottom<=innerHeight+1 && b.left>=0 && b.right<=innerWidth+1;})()"));
      if(width===390&&scale===1) await shot('04-compact-reading');
      await key('Escape');
      check(`Escape returns to the same page, scroll and card at ${width}/${scale}`,await js("document.querySelector('.codex').dataset.cxReading==='false' && document.querySelector('.cx-pager span').textContent.startsWith('Page 2') && Math.abs(scrollBox.scrollTop-savedScroll)<2 && document.activeElement.matches('.cx-card:last-child')"));
      if(width===320) await shot('05-smallest-browser');
    }
    win.setContentSize(390,844);await js("document.documentElement.style.setProperty('--ui-scale','1');void 0");await sleep(100);
    await search('Cleave');await click('.cx-card');await click('[data-cx-play]');await wait("document.querySelector('.cx-stage').dataset.cxPreviewState==='ready'");
    check('compact demonstration and stop control fit the reader',await js("(()=>{const p=document.querySelector('.cx-detail').getBoundingClientRect(),s=document.querySelector('.cx-stage').getBoundingClientRect(),c=document.querySelector('[data-cx-play]').getBoundingClientRect();return s.top>=p.top-1 && s.bottom<=p.bottom+1 && c.top>=p.top-1 && c.bottom<=p.bottom+1;})()"));await shot('06-compact-demonstration');
    await key('f',['control']);
    check('compact search shortcut reveals the browse controls',await js("document.activeElement.matches('[data-cx-search]') && document.activeElement.getClientRects().length>0 && document.querySelector('.codex').dataset.cxReading==='false'"));
    await click('.cx-card');
    await click('[data-cx-results-footer]');await wait('!__skillShowcases.stats().running');
    check('returning to compact results pauses the hidden demonstration',await js("document.activeElement.matches('.cx-card')"));
    await click('.cx-card');await click('[data-cx-filter="melee"]');check('detail tags return to visible results with focus',await js("getComputedStyle(document.querySelector('.cx-list')).display!=='none' && document.activeElement.matches('.cx-card')"));
    await click('[data-cx-back]');await wait("!document.querySelector('.codex')");await sleep(1100);
    check('leaving removes the reader and its media without late errors',await js("!document.querySelector('.codex') && !__skillShowcases.stats().running && !__game.crash().fatal")&&errors.length===0);
    console.log(`CODEX POLISH OK: ${checks} checks; screenshots ${out}`);
  }catch(e){console.error(e.stack||e);console.error('RENDERER ERRORS',errors);await shot('failure');process.exitCode=1;}
  finally{clearTimeout(timer);win.destroy();server.server.close();app.exit(process.exitCode||0);}
});
