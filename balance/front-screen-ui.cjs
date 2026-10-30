// Real built-client front-door acceptance. No personal saves or shared profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const reports = path.join(__dirname, 'reports');
fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'front-screen-profile-' + process.pid));
app.disableHardwareAcceleration();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({
    root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(reports, 'front-screen-saves-' + process.pid),
  });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { checks: [], errors: [], images: [] };
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(v => JSON.stringify(v)).join(',') + ')');
  const click = async sel => { await run(s => { const el=document.querySelector(s); if (!el) throw Error('Missing control: '+s); el.click(); }, sel); await pause(100); };
  const shot = async name => {
    await pause(180); win.webContents.invalidate(); await pause(100);
    const file = path.join(reports, 'front-screen-' + name + '.png');
    fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG()); report.images.push(file);
  };
  const save = () => fs.writeFileSync(path.join(reports, 'front-screen-ui.json'), JSON.stringify(report, null, 2));
  const timer = setTimeout(() => { save(); app.exit(1); }, 180000);
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; !window.__game && i < 200; i++) await new Promise(r => setTimeout(r, 100));
      if (!window.__game) throw Error('Game failed to boot');
      await __game.hydrated();
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
      const ui = __game.ui;
      window.__frontQA = { handlers: ui.startHandlers, begin: ui.onBeginRun, account: structuredClone(__game.account()), action: '' };
      ui.onBeginRun = () => { __frontQA.action = 'begin'; };
      window.__frontShow = () => ui.showStartMenu(
        () => { __frontQA.action = 'start'; }, s => { __frontQA.action = 'continue:' + s.name; },
        () => { __frontQA.action = 'coop'; }, e => { __frontQA.action = 'roster:' + e.name; });
      __frontShow();
      const image = new Image();
      image.src = getComputedStyle(document.querySelector('.front-landscape')).backgroundImage.slice(5, -2);
      await image.decode();
    });
    await pause(250);
    assert.deepEqual(await run(() => ({
      begin: document.querySelector('.front-primary').id,
      locked: document.querySelector('#sm-continue').disabled,
      vault: !!document.querySelector('#sm-vault'),
      vessels: !!document.querySelector('#sm-immortals'),
    })), { begin: 'sm-start', locked: true, vault: false, vessels: false });
    await shot('fresh-1600');
    report.checks.push('Fresh account gates and original artwork load');
    // Real keyboard input: skip the disabled Continue and invoke Options with Enter.
    await run(() => document.querySelector('#sm-start').focus());
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' });
    await pause(80);
    assert.equal(await run(() => document.activeElement.id), 'sm-chronicle');
    await run(() => document.querySelector('#sm-start').focus());
    for (let i = 0; i < 3; i++) {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' });
    }
    await pause(80);
    assert.equal(await run(() => document.activeElement.id), 'sm-keys');
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
    win.webContents.sendInputEvent({ type: 'char', keyCode: '\r' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
    await pause(150);
    assert(await run(() => !!document.querySelector('#start-menu .options-body')));
    await run(() => __game.ui.setContinueSave({ classId: 'warrior', name: 'Returning soul', level: 12, modeId: 'mortal' }));
    assert(await run(() => !!document.querySelector('#start-menu .options-body')));
    await shot('options');
    await click('#start-menu #esc-back');
    assert.equal(await run(() => document.querySelector('.front-primary').id), 'sm-continue');
    await run(() => {
      document.querySelector('#sm-chronicle').focus();
      __game.ui.setStartMenuNotice('A saved journey was restored.');
    });
    await pause(60);
    assert.equal(await run(() => document.activeElement.id), 'sm-chronicle');
    report.checks.push('Keyboard navigation, activation, Options hydration isolation and focus preservation');
    await click('#front-motion');
    assert.equal(await run(() => getComputedStyle(document.querySelector('.front-haze')).animationPlayState), 'paused');
    await click('#sm-coop');
    assert.equal(await run(() => __frontQA.action), 'coop');
    await click('#sm-continue');
    assert.equal(await run(() => __frontQA.action), 'continue:Returning soul');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'none');
    await run(() => __frontShow());
    assert.equal(await run(() => document.querySelector('#front-motion').getAttribute('aria-pressed')), 'true');
    await click('#sm-start');
    assert.equal(await run(() => __frontQA.action), 'begin');
    report.checks.push('Begin, Continue and co-op dispatch; atmosphere pauses, survives refresh and hides during play');
    await run(() => {
      const a = __game.account(); a.level = 24; a.ledger.prologue_lived = 1; a.ledger.account_deaths = 1;
      a.credits = 120;
      a.roster = [{ charId: 'qa-living', name: 'Aster', classId: 'warrior', level: 18, modeId: 'immortal', stage: 1, slot: 101, savedAt: 0 },
        { charId: 'qa-fallen', name: 'The Fallen', classId: 'warrior', level: 11, modeId: 'immortal', stage: 1, slot: 102, savedAt: 0, fallen: { fee: 60, level: 11, at: 0 } }];
      __game.ui.setContinueSave({ classId: 'warrior', name: 'Aster of the Hollow', level: 18, modeId: 'mortal' });
      __frontShow();
    });
    assert(await run(() => !!document.querySelector('#sm-vault') && document.querySelector('#sm-immortals').textContent.includes('fallen')));
    await shot('returning-1600');
    await click('#sm-immortals');

    assert.equal(await run(() => document.querySelector('#start-menu .side-screen').dataset.screen),'immortals');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display),'block');
    await shot('immortals-1600');
    await run(() => {
      __frontQA.roster = structuredClone(__game.account().roster);
      __frontQA.action = 'roster-untouched';
      document.querySelector('#sm-roster-go-qa-fallen').focus();
    });
    await click('[data-cid="qa-fallen"].sm-roster-go');
    assert(await run(() => document.querySelector('#start-menu').textContent.includes('resurrect')));

    assert.equal(await run(() => __frontQA.action),'roster-untouched');
    assert.equal(await run(() => document.activeElement.id),'sm-roster-go-qa-fallen');
    assert(await run(() => !!document.querySelector('.roster-notice[role="status"]')));
    await click('#sm-imm-vault');
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context),'entrance');
    await click('#acct-close'); await click('#seal-back');
    assert.equal(await run(() => __game.account().credits),120);
    await click('#acct-close'); await click('#seal-go');
    assert(await run(() => !!document.querySelector('#start-menu:not(.hidden) [data-screen="immortals"]')));

    await click('[data-cid="qa-living"].sm-roster-go');
    assert.equal(await run(() => __frontQA.action), 'roster:Aster');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'none');
    await run(() => __frontShow());

    await click('#sm-immortals');
    await run(() => {
      __frontQA.confirm = window.confirm;
      window.confirm = () => false;
      __game.account().invested['resurrect_qa-fallen'] = 12;
    });
    await click('#sm-roster-del-qa-fallen');
    assert.equal(await run(() => __game.account().roster.length),2,'Cancelling release preserves the vessel');
    await run(() => { window.confirm=()=>true; });
    await click('#sm-roster-del-qa-fallen');
    assert(await run(() => __game.account().roster.length===1 && !('resurrect_qa-fallen' in __game.account().invested)));
    await click('#sm-roster-del-qa-living');
    assert(await run(() => !!document.querySelector('#start-menu .front-screen') && !document.querySelector('#sm-immortals')));
    await run(() => { window.confirm=__frontQA.confirm; __game.account().roster=structuredClone(__frontQA.roster); __frontShow(); });
    await click('#sm-immortals'); await click('#start-menu .panel-x');
    assert(await run(() => !!document.querySelector('#start-menu .front-screen')));
    report.checks.push('Immortal shell, fallen focus/notice, Vault seal round trip, release cancellation/removal and last-vessel return');

    await click('#sm-vault');
    assert(await run(() => !document.querySelector('#account-screen').classList.contains('hidden')));
    await click('#acct-close');
    if (await run(() => !!document.querySelector('#seal-go'))) await click('#seal-go');
    assert(await run(() => !!document.querySelector('#start-menu:not(.hidden) .front-screen')));
    await click('#sm-chronicle');
    assert(await run(() => !document.querySelector('#account-screen').classList.contains('hidden')));
    await click('#chron-close');
    report.checks.push('Veteran gates, fallen vessel protection, roster resume, Vault and Chronicle routes');


    // The same surface survives purchases, nested views and real sealing rules.
    await run(() => { __game.account().credits=120; });
    await click('#sm-vault');
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context), 'entrance');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'block');
    await shot('side-vault-1600');
    await click('[data-vtab="town"]');
    await click('[data-invest="feat_bounty_board"]');
    assert.equal(await run(() => __game.account().credits), 120, 'The free claim must retain the essence pool');
    assert.equal(await run(() => document.querySelectorAll('#account-screen .side-screen').length), 1);
    await run(() => {
      document.querySelector('.vault-body').scrollTop=90;
      __frontQA.vaultScroll=document.querySelector('.vault-body').scrollTop;
      __frontQA.invested=JSON.stringify(__game.account().invested);
    });
    await click('#acct-codex');
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.screen),'codex');
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context),'entrance');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display),'block');
    assert(await run(() => document.querySelector('[data-cx-page="owned"]').getAttribute('aria-current')==='true'));
    await run(() => { document.querySelector('[data-cx-section="abilities"]').focus(); });
    await click('[data-cx-section="abilities"]'); await pause(60);
    assert.equal(await run(() => document.activeElement.dataset.cxSection),'abilities');
    assert.equal(await run(() => document.querySelectorAll('#account-screen .side-screen').length),1);
    await run(() => { const b=document.querySelector('[data-cx-search]');b.focus(); });
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});
    await pause(80);
    assert(await run(() => document.activeElement.matches('[data-cx-tag]')));
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});
    await pause(120);
    assert(await run(() => !!document.querySelector('#acct-close') && __game.account().credits===120 &&
      JSON.stringify(__game.account().invested)===__frontQA.invested &&
      document.querySelector('.vault-body').scrollTop===__frontQA.vaultScroll));
    await click('#acct-codex'); await click('[data-cx-back]');
    assert.equal(await run(() => __game.account().credits),120);
    await click('#acct-wardrobe'); await click('[data-wd-back]');
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context), 'entrance');
    await click('#acct-close');
    assert(await run(() => !!document.querySelector('#seal-go')));
    await click('#seal-back');
    assert.equal(await run(() => __game.account().credits), 120);
    await click('#acct-close'); await click('#seal-go');
    assert.equal(await run(() => __game.account().credits), 0);
    report.checks.push('Shared Vault shell preserves free claim, Codex Back/Escape, investments, shelf scroll, native keyboard focus, Wardrobe return and explicit Reckoning seal');

    await run(() => {
      __game.account().runRecords = Array.from({ length: 20 }, (_, i) => ({
        schema:1, at:1700000000000 + i * 86400000,
        name:i === 0 ? '<img src=x onerror="window.__injected=1">' : ['Aster of Lastlight','The Ashen Wanderer','Arianna'][i % 3],
        classId:'warrior', level:12 + i, zones:3 + i, kills:130 + i * 17,
        reason:i % 2 ? 'death' : 'retire', essence:40 + i * 9, renown:200 + i * 25,
      }));
    });
    await run(() => {
      __game.account().roster.push(...Array.from({length:16},(_,i)=>({
        charId:'qa-extra-'+i, name:i===15 ? '<img src=x onerror="window.__rosterInjected=1">'.repeat(5) : 'Vessel '+(i+3),
        classId:'warrior', level:i+2, modeId:'immortal', stage:1, slot:200+i, savedAt:0,
      })));
    });
    for (const [width,height,scale] of [[1600,1000,1],[1280,720,1],[390,844,1],[390,844,2],[320,568,2]]) {
      win.setContentSize(width,height);
      await run(s => document.documentElement.style.setProperty('--ui-scale',String(s)), scale);
      for (const [open,close,kind] of [['#sm-vault','#acct-close','vault'],['#sm-chronicle','#chron-close','chronicle'],['#sm-keys','#start-menu #esc-back','options'],['#sm-immortals','#sm-imm-back','immortals'],['#sm-codex','[data-cx-back]','codex']]) {
        await click(open); if (kind==='codex') await click('[data-cx-section="abilities"]'); await pause(250);
        const bounds = await run(() => {
          const shell = document.querySelector('.panel:not(.hidden) > .side-screen');
          const pane = shell.querySelector('.side-pane'), body = shell.querySelector('.side-scroll'), foot = shell.querySelector('.side-foot');
          const r=foot.getBoundingClientRect(), b=body.getBoundingClientRect();
          const button=foot.querySelector('button'), br=button.getBoundingClientRect();
          return { fits:shell.getBoundingClientRect().right <= innerWidth+1 && pane.scrollWidth <= pane.clientWidth+1 && shell.scrollWidth <= shell.clientWidth+1,
            bodyHeight:b.height, footer:r.toJSON(), viewport:[innerWidth,innerHeight],
            reachable:br.bottom<=innerHeight && br.left>=0 && br.right<=innerWidth &&
              button.contains(document.elementFromPoint(br.x+br.width/2,br.y+br.height/2)) };
        });
        assert(bounds.fits && bounds.bodyHeight > 24 && bounds.reachable, kind+' '+[width,height,scale]+' '+JSON.stringify(bounds));
        if (kind==='codex' && width>=1280 && scale===1) {
          assert(await run(() => {
            const input=document.querySelector('[data-cx-search]'), r=input.getBoundingClientRect();
            return input===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          }), 'Desktop Codex search is visible without scrolling the header');
        }
        if (kind==='immortals') {
          assert(await run(() => !window.__rosterInjected && !document.querySelector('.sm-roster img')));
          await run(() => { const b=document.querySelector('#sm-roster-del-qa-extra-15'); b.scrollIntoView({block:'nearest'}); });
          assert(await run(() => { const b=document.querySelector('#sm-roster-del-qa-extra-15'), r=b.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), 'Last vessel release remains reachable');
        }
        const before = bounds.footer.top;
        await run(() => { const b=document.querySelector('.panel:not(.hidden) .side-scroll'); b.scrollTop=b.scrollHeight; });
        assert.equal(await run(() => document.querySelector('.panel:not(.hidden) .side-foot').getBoundingClientRect().top), before, 'Footer stays put');
        await run(() => { document.querySelector('.panel:not(.hidden) .side-scroll').scrollTop=0; });
        if ((width===1600 || width===390) && scale===1) await shot('side-'+kind+'-'+width);
        await click(close);
      }
    }
    report.checks.push('Vault, Chronicle, Options, Immortal Vessels and Codex keep readable scrolling regions and reachable fixed controls across five viewport/scale combinations');
    win.setContentSize(1600,1000);
    await run(() => document.documentElement.style.setProperty('--ui-scale','1'));
    await click('#sm-chronicle');
    await click('[data-chron-sort="latest"]');
    assert(await run(() => document.querySelector('.chron-row:not(.chron-head) .chron-who').textContent.includes('The Ashen Wanderer')));
    assert(await run(() => !window.__injected && !document.querySelector('.chron-table img')));
    await click('#chron-close');
    await click('#sm-keys'); await click('[data-opttab="interface"]');
    await run(() => { const b=document.querySelector('#opt-tooltipDetail'); b.focus(); b.scrollIntoView({block:'center'}); });
    const oldTip = await run(() => document.querySelector('#opt-tooltipDetail').textContent);
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'});
    win.webContents.sendInputEvent({type:'char',keyCode:'\r'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'});
    await pause(300);
    assert.notEqual(await run(() => document.querySelector('#opt-tooltipDetail').textContent),oldTip);
    assert.equal(await run(() => document.activeElement.id),'opt-tooltipDetail');
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});
    await pause(80);
    assert.equal(await run(() => document.activeElement.id),'opt-escapecloses');
    await click('#start-menu #esc-back');
    await run(() => { __game.ui.hideAll(); __game.ui.showAccountScreen(() => __frontShow()); });
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context),'world');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display),'none');
    await click('#acct-close');
    await run(() => { __game.ui.hideAll(); __game.ui.showChronicle(() => __frontShow()); });
    assert.equal(await run(() => document.querySelector('#account-screen .side-screen').dataset.context),'world');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display),'none');
    await click('#chron-close');
    report.checks.push('Chronicle sorts safely; Options retains native keyboard focus; in-world visits do not revive entrance artwork');

    // Responsive widths AND the existing accessibility scale, with all destinations shown.
    for (const [width, height, scale] of [[1920,1080,1], [1280,720,1], [800,600,1], [390,844,1], [320,568,1], [1280,720,2], [390,844,2], [1280,720,.75]]) {
      win.setContentSize(width, height);
      await run(s => { document.documentElement.style.setProperty('--ui-scale', String(s)); document.querySelector('#start-menu').scrollTop = 0; }, scale);
      await pause(180);
      const bounds = await run(() => {
        const root = document.querySelector('#start-menu'), r = root.getBoundingClientRect();
        return { width: r.width, height: r.height, viewport: innerWidth, horizontal: root.scrollWidth <= root.clientWidth + 1, vertical: root.scrollHeight <= root.clientHeight + 1 };
      });
      if (width >= 800 && height >= 600 && scale === 1) assert(bounds.vertical, 'Standard desktop menu must fit without scrolling: ' + [width, height] + ' ' + JSON.stringify(bounds));
      assert(bounds.horizontal, JSON.stringify({ width, height, scale, bounds }));
      assert(Math.abs(bounds.width - width) < 2 && Math.abs(bounds.height - height) < 2);
      const reachable = await run(() => {
        const b = document.querySelector('#sm-exit'); b.scrollIntoView({ block: 'nearest' });
        const r = b.getBoundingClientRect();
        return { ok: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1
          && b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
          rect: r.toJSON(), viewport: [innerWidth,innerHeight],
          covering: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,300) };
      });
      assert(reachable.ok, 'Exit must remain reachable at ' + [width, height, scale] + ': ' + JSON.stringify(reachable));
      await run(() => { document.querySelector('#start-menu').scrollTop = 0; });
      await shot(width + '-' + height + '-scale-' + scale);
    }
    report.checks.push('Responsive layout, reachable actions and no horizontal overflow at eight viewport/scale combinations');
    win.setContentSize(1280,720);
    await run(() => {
      document.documentElement.style.setProperty('--ui-scale', '1');
      const hostile = '<img src=x onerror="window.__injected=1">';
      __game.ui.setContinueSave({ classId:'warrior', name:hostile.repeat(8), level:99 });
      __game.ui.setStartMenuNotice(hostile);
    });
    assert(await run(() => !window.__injected && !document.querySelector('.front-screen img') && document.querySelector('.front-memory').textContent.includes('<img')));
    report.checks.push('Player names and boot notices remain text, including long hostile content');
    // Poll the real controller input and click through the existing virtual pointer.
    const pad = await run(() => {
      __game.fakePad({ axes: [.7,0,0,0], buttons: Array(17).fill(0) }); __game.step(2);
      const pointer=__game.padPointer(), button=document.querySelector('#sm-coop'), r=button.getBoundingClientRect();
      pointer.place(r.x+r.width/2,r.y+r.height/2);
      const buttons=Array(17).fill(0); buttons[0]=1;
      __game.fakePad({ axes:[0,0,0,0], buttons }); __game.step(2);
      __game.fakePad({ axes:[0,0,0,0], buttons:Array(17).fill(0) }); __game.step(2);
      const active=pointer.active; __game.fakePad(null); pointer.retire(); return active;
    });
    assert(pad, 'Controller pointer must activate over the front screen');
    assert.equal(await run(() => __frontQA.action), 'coop');
    report.checks.push('Controller pointer selects the existing co-op action');
    // Browser-close fallback returns to the same menu without a trapped full-screen state.
    await run(() => { window.close = () => {}; });
    await click('#sm-exit');
    assert(await run(() => !!document.querySelector('#sm-exit-back')));
    await click('#sm-exit-back');
    // Electron versions differ in whether the nativeTheme test setter drives media;
    // CDP explicitly emulates the user preference for this regression.
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
    await pause(80);
    assert.equal(await run(() => getComputedStyle(document.querySelector('.front-haze')).animationName), 'none');
    assert.equal(await run(() => document.querySelector('#front-motion').disabled), true);
    await click('#sm-keys');
    assert.equal(await run(() => getComputedStyle(document.querySelector('.side-pane')).animationName), 'none');
    assert.equal(await run(() => document.querySelector('.side-screen [data-front-motion]').disabled), true);
    await click('#start-menu #esc-back');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'no-preference'}] });
    await pause(80);
    assert.equal(await run(() => document.querySelector('#front-motion').disabled), false);
    win.webContents.debugger.detach();
    report.checks.push('Browser exit fallback and operating-system reduced motion');

    // Finally walk the actual first-account entry, not a callback stand-in.
    await run(() => {
      const a = __game.account();
      for (const key of Object.keys(a)) delete a[key];
      Object.assign(a, __frontQA.account);
      const ui = __game.ui, h = __frontQA.handlers;
      ui.onBeginRun = __frontQA.begin; ui.setContinueSave(null);
      ui.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster);
    });
    // The opaque crossing frame owns its own navigator: isolate physical pads
    // there too, as in loading-screen-ui.cjs. The parent shim cannot cross origins.
    const crossing = win.webContents.mainFrame.frames.find(f => f.url === 'about:srcdoc');
    assert(crossing, 'The isolated crossing frame must be present');
    await crossing.executeJavaScript("Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] })");
    await click('#sm-start');
    const entered = await run(async () => {
      for (let i=0; __game.loading.active && i<800; i++) await new Promise(r=>setTimeout(r,25));
      __game.step(2);
      return { hidden: document.querySelector('#start-menu').classList.contains('hidden'),
        scene: __game.world().scene?.def?.id ?? __game.world().scene?.id ?? !!__game.world().scene,
        loading: __game.loading.active, fatal: __game.crash().fatal };
    });
    assert(entered.hidden && entered.scene && !entered.loading && !entered.fatal, JSON.stringify(entered));
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'none');
    report.checks.push('Real Begin enters the account tutorial with no front-screen overlay');
    await win.loadURL(server.url + '?dev=forges');
    await run(async () => {
      for(let i=0; !window.__game && i<200; i++) await new Promise(r=>setTimeout(r,100));
      if (!window.__game) throw Error('Developer game failed to boot');
      await __game.hydrated();
    });
    assert(await run(() => !!document.querySelector('.front-dev #sm-forge') && !!document.querySelector('.front-dev #sm-glyph-forge')));
    report.checks.push('Developer forge hooks remain available in their own menu slot');
    assert.deepEqual(report.errors, []);
    console.log('FRONT SCREEN OK:', report.checks.join('; '));
    save(); clearTimeout(timer); server.server.close(); win.destroy(); app.exit(0);
  } catch (error) {
    await shot('failure'); report.errors.push(error.stack || String(error)); save(); console.error(error);
    clearTimeout(timer); server.server.close(); app.exit(1);
  }
});
