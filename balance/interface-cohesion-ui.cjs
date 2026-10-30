// Build first. Exercise shared menu paint, real hover, navigation and reduced motion.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'interface-cohesion-profile-' + process.pid));
app.disableHardwareAcceleration();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Interface cohesion timed out'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(dir, 'interface-cohesion-saves-' + process.pid) });
  const win = new BrowserWindow({ show:false, width:1600, height:1000, useContentSize:true, webPreferences:{ offscreen:true, backgroundThrottling:false } });
  const checks = [], errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:e.stack};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  const check = (name, value) => { assert.ok(value, name); checks.push(name); };
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`);
  const shot = async name => { await wait(300); fs.writeFileSync(path.join(dir, 'interface-cohesion-' + name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const paint = selector => js(`(()=>{const s=getComputedStyle(document.querySelector(${JSON.stringify(selector)}));return [s.color,s.borderTopColor,s.backgroundImage,s.backgroundColor,s.borderRadius,s.boxShadow]})()`);
  const hover = async selector => {
    const r = await js(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    win.webContents.sendInputEvent({type:'mouseMove', ...r}); await wait(220);
    await js(`document.querySelector(${JSON.stringify(selector)}).getAnimations().filter(a=>a instanceof CSSTransition).forEach(a=>a.finish());void 0`);
    return paint(selector);
  };
  const leave = async () => { win.webContents.sendInputEvent({type:'mouseMove',x:1,y:1}); await js('document.activeElement?.blur();void 0'); await wait(220); await js('document.getAnimations().filter(a=>a instanceof CSSTransition).forEach(a=>a.finish());void 0'); };
  const footer = selector => js(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}),f=b.closest('footer,.side-foot,.interface-footer'),r=b.getBoundingClientRect(),fr=f?.getBoundingClientRect();if(!fr)return false;const inset=parseFloat(getComputedStyle(f).paddingRight)*fr.width/f.offsetWidth;return Math.abs(fr.right-r.right-inset)<3&&r.bottom<=innerHeight&&r.left>=0&&r.top>=0&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`);
  const entrance = selector => js(`(()=>{const p=document.querySelector(${JSON.stringify(selector)}),a=p.getAnimations().find(a=>a.animationName==='interface-arrive'||a.id==='interface-arrive');if(!a)return false;a.pause();a.currentTime=100;const opacity=+getComputedStyle(p).opacity;const frames=a.effect.getKeyframes();a.finish();return opacity>0&&opacity<1&&+frames[0].opacity===0&&+frames.at(-1).opacity===1})()`);
  try {
    await win.loadURL(server.url);
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});
    await js(`(async()=>{for(let i=0;!window.__game&&i<200;i++)await new Promise(r=>setTimeout(r,100));await __game.hydrated()})()`);
    await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');const w=__game.world();w.update=()=>{};w.player.invulnerable=true;__game.ui.hideAll();__game.ui.showEscapeMenu();void 0`);
    check('Pause has a real opacity entrance without changing placement', await entrance('#escape-menu'));
    await leave(); const idle = await paint('#esc-resume'), lit = await hover('#esc-resume');
    check('Pause uses bone text and a visible themed hover', idle[0]==='rgb(231, 229, 217)' && JSON.stringify(idle)!==JSON.stringify(lit));
    await shot('pause'); await click('#esc-close');
    check('Save and Exit keeps Back in the lower-right footer', await footer('#esc-back2'));
    await click('#esc-back2'); await click('#esc-keys');
    check('Options navigation fades without replaying on settings refresh',await entrance('#escape-menu'));
    await click('[data-opttab="visuals"]');
    check('Options tab changes retain a steady page',await js(`document.querySelector('#escape-menu').getAnimations().length===0`));
    check('In-game Options keeps Back in the lower-right footer', await footer('#escape-menu #esc-back'));
    await click('#escape-menu #esc-back'); await click('#esc-codex');
    check('Codex shares the menu entrance', await entrance('.side-pane'));
    await leave(); assert.deepEqual(await paint('[data-cx-back]'), idle); assert.deepEqual(await hover('[data-cx-back]'), lit);
    checks.push('Codex Back shares Pause ink, border, material and real hover glow');
    await leave(); win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});
    await js(`document.querySelector('[data-cx-back]').focus();void 0`); await wait(220);
    check('Keyboard focus receives a visible Codex outline',await js(`const s=getComputedStyle(document.querySelector('[data-cx-back]'));s.outlineStyle==='solid'&&parseFloat(s.outlineWidth)>=2`));
    check('Codex Back stays last in its footer', await js(`document.querySelector('.cx-foot').lastElementChild.matches('[data-cx-back]')`));
    await shot('codex'); await click('[data-cx-back]'); await click('#esc-resume');
    await js('__game.ui.showWardrobe();void 0'); check('Wardrobe shares the menu entrance', await entrance('.wardrobe'));
    await leave(); assert.deepEqual(await paint('[data-wd-back]'), idle); assert.deepEqual(await hover('[data-wd-back]'), lit);
    checks.push('Wardrobe Back shares the same material and hover glow');
    check('Wardrobe Back is reachable in the lower-right footer', await footer('[data-wd-back]'));
    await js('window.savedWardrobe=document.querySelector(".wardrobe");void 0'); await wait(300); await click('[data-wd-slot="playerModel"]');
    check('Changing a cosmetic category does not replay the entrance', await js('savedWardrobe===document.querySelector(".wardrobe")&&savedWardrobe.getAnimations().length===0'));
    await shot('wardrobe'); await click('[data-wd-interface]');
    check('Interface subpage fades in and anchors its Back button', await entrance('.wardrobe') && await footer('[data-interface-back]'));
    for (const [width,height,scale] of [[640,900,1],[1280,720,2],[390,844,1],[390,844,2]]) {
      win.setContentSize(width,height); await js(`document.documentElement.style.setProperty('--ui-scale','${scale}')`); await wait(150);
      check('Wardrobe footer remains reachable at '+[width,height,scale], await footer('[data-interface-back]'));
      const overflow = await js(`(()=>{const p=document.querySelector('.interface-page-body'),r=p.getBoundingClientRect();return {width:p.clientWidth,scroll:p.scrollWidth,offenders:[...p.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>r.right+1).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width,text:e.textContent.slice(0,40)})).slice(0,12)}})()`);
      check('Wardrobe content has no horizontal overflow at '+[width,height,scale]+' '+JSON.stringify(overflow), overflow.scroll<=overflow.width+1);
    }
    win.setContentSize(1600,1000); await js(`document.documentElement.style.setProperty('--ui-scale','1');const s=document.querySelector('[data-interface-choice="frame"]');s.value='astral';s.dispatchEvent(new Event('change',{bubbles:true}));void 0`);
    await leave(); check('A preview does not recolor the surrounding menu', (await paint('[data-interface-back]'))[1]===idle[1]);
    await click('[data-interface-save]'); await leave(); const astral = await paint('[data-interface-back]');
    check('Saving recolors navigation with the selected frame', astral[1]==='rgb(125, 114, 151)' && astral[0]===idle[0]);
    await shot('interface'); await click('[data-interface-back]'); await click('[data-wd-back]'); await js('__game.ui.showEscapeMenu();void 0');
    await leave(); assert.deepEqual(await paint('#esc-resume'),astral); checks.push('The saved theme reaches Pause immediately');
    await click('#esc-resume'); await js(`__game.ui.showMuClassCard('warrior',()=>{});void 0`);
    check('The Mu vessel card shares the menu entrance', await entrance('#mu-card'));
    await leave(); assert.deepEqual(await paint('#mu-wake'),astral); assert.deepEqual(await paint('#mu-name-clear'),astral);
    checks.push('Mu Wake and Nameless use the shared button material'); await shot('mu-vessel');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await js('__game.ui.hideAll();__game.ui.showWardrobe();void 0');
    check('Reduced motion removes the Wardrobe entrance and button transitions', await js(`getComputedStyle(document.querySelector('.wardrobe')).animationName==='none'&&getComputedStyle(document.querySelector('[data-wd-back]')).transitionDuration==='0s'`));
    await click('[data-wd-back]'); await js('__game.ui.showCodex();void 0');
    check('Reduced motion also removes the Codex entrance', await js(`getComputedStyle(document.querySelector('.side-pane')).animationName==='none'`));
    await click('[data-cx-back]');
    await js('__game.account().ledger.account_deaths=1;__game.ui.showAccountScreen();void 0'); await click('#acct-wardrobe'); await click('[data-wd-interface]'); await click('[data-interface-back]'); await click('[data-wd-back]');
    check('Nested Wardrobe navigation preserves the Vault return',await js(`!!document.querySelector('#acct-wardrobe')&&!document.querySelector('.wardrobe')`));
    await js(`__game.ui.hideAll();window.cohesionLease=__game.loading.begin({kind:'travel',label:'Theme check',cancel:()=>{}});cohesionLease.paint()`);
    const crossing = win.webContents.mainFrame.frames.find(f=>f.url==='about:srcdoc');
    assert.ok(crossing,'isolated loading frame exists');
    const loadingPaint = await crossing.executeJavaScript(`(()=>{const s=getComputedStyle(document.querySelector('#mu-loading-screen button'));return [s.color,s.borderTopColor,s.backgroundImage,s.backgroundColor,s.borderRadius,s.boxShadow]})()`);
    assert.deepEqual(loadingPaint,astral); checks.push('The isolated Crossing shares the saved navigation material');
    await js('cohesionLease.finish();void 0');
    assert.deepEqual(errors,[]); check('No fatal game error',await js('__game.crash().fatal===null'));
    fs.writeFileSync(path.join(dir,'interface-cohesion-review.json'),JSON.stringify({checks},null,2)); console.log('INTERFACE COHESION OK: '+checks.length+' checks');
  } catch(error) { console.error(error); await shot('failure'); process.exitCode=1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode||0); }
});
