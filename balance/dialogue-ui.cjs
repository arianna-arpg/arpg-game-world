// Build first. The real game, a hidden window and isolated saves/profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'dialogue-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'dialogue-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'dialogue-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (result?.qaError) throw new Error(result.qaError);
    return result;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `dialogue-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    await js(`(() => {
      window.qaPad = null;
      Object.defineProperty(navigator,'getGamepads',{value:()=>qaPad ? [qaPad] : []});
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.loadZone('lastlight'); w.player.invulnerable = true;
      const keeper = w.actors.find(a=>a.defId==='townsfolk_innkeep'), patron=w.actors.find(a=>a.defId==='townsfolk_patron');
      if (!keeper || !patron) throw new Error('Missing inn company');
      const kpos={...keeper.pos}, home={x:kpos.x,y:kpos.y+70};
      for (const a of w.actors) if (![keeper,patron,w.player].includes(a)) a.pos={x:20,y:20};
      const q=window.dialogueQA={w,keeper,patron,kpos,home,here:true,keeperHere:true};
      q.box=()=>{
        const root=document.getElementById('npc-dialogue'), rect=root.getBoundingClientRect();
        const cv=root.querySelector('canvas'), px=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
        return {open:!root.hidden, speaker:Number(root.dataset.speakerId), name:root.querySelector('h2').textContent,
          full:root.querySelector('.dialogue-accessible').textContent, shown:root.querySelector('.dialogue-ink').textContent,
          next:root.querySelector('.dialogue-next').textContent, page:root.querySelector('.dialogue-progress').textContent,
          portraitPainted:px.some((v,i)=>i%4===3&&v>0), rect:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},
          viewport:{w:innerWidth,h:innerHeight}, fatal:__game.crash().fatal};
      };
      q.run=(n,moving=false)=>{
        for(let i=0;i<n;i++){
          w.player.pos=q.here?{...home}:{x:home.x-600,y:home.y}; w.player.tier=0;
          keeper.pos=q.keeperHere?{...kpos}:{x:20,y:20}; patron.pos={x:home.x+25,y:home.y}; patron.tier=0;
          w.mireilleCd=999;
          if(moving)w.localSeat.lastActedAt=w.time;
          __game.step(1);
        }
        return q.box();
      };
      q.key=key=>{
        window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key==='Enter'?'Enter':key==='Escape'?'Escape':'Key'+key.toUpperCase(),bubbles:true}));
        q.run(1);
        window.dispatchEvent(new KeyboardEvent('keyup',{key,code:key==='Enter'?'Enter':key==='Escape'?'Escape':'Key'+key.toUpperCase(),bubbles:true}));
        return q.box();
      };
      q.approach=()=>{q.here=false;q.run(3);q.here=true;return q.run(60);};
      q.wait=seconds=>{for(let i=0;i<seconds*4;i++){w.time+=.25;q.run(1);}return q.box();};
    })()`);
    assert.equal((await js('dialogueQA.run(45,true)')).open, false, 'pass-by stays quiet');
    assert.equal((await js('dialogueQA.run(12)')).open, false, 'brief stop stays quiet');
    let box = await js('dialogueQA.run(55)'); log({ stage: 'opened', ...box });
    assert.equal(box.open, true); assert.match(box.name, /Mireille/); assert.equal(box.portraitPainted, true);
    assert.ok(box.shown.length < box.full.length, 'typewriter begins gradually');
    box = await js('dialogueQA.key("Enter")');
    assert.equal(box.shown, box.full, 'first advance reveals without closing');
    await js('dialogueQA.wait((__game.settings().noticeSec ?? 8)+1)');
    await capture('mireille');
    box = await js('dialogueQA.key("Escape")');
    assert.equal(box.open, false); assert.equal(await js('__game.ui.escapeMenuOpen'), false, 'Escape closes dialogue before pause');
    assert.equal((await js('dialogueQA.run(120)')).open, false, 'dismissed conversation stays dismissed in range');
    assert.equal((await js('dialogueQA.approach()')).open, true, 'new approach rearms functional dialogue');
    // A long authored line exercises automatic pages and queued live changes.
    await js(`dialogueQA.key('Escape'); dialogueQA.w.innkeepPrompt=()=>('A Memory is a skill waiting to be learned. Keep it close, and choose when to put it to use. ').repeat(6); dialogueQA.approach();`);
    box = await js('dialogueQA.key("Enter")');
    assert.match(box.page, /^1 \/ [2-9]/);
    box = await js('dialogueQA.key("Enter")'); assert.match(box.page, /^2 \/ /);
    const previous = box.full;
    box = await js(`dialogueQA.w.innkeepPrompt=()=> 'The next lesson waits until you finish reading.'; dialogueQA.run(2);`);
    assert.equal(box.full, previous, 'new state cannot replace the page being read');
    const latest = await js(`(() => { let seen=false; for(let i=0;i<24;i++){const b=dialogueQA.key('Enter'); seen ||= b.full==='The next lesson waits until you finish reading.'; if(!b.open)break;}return {seen,box:dialogueQA.box()};})()`);
    assert.equal(latest.seen, true); assert.equal(latest.box.open, false);
    // An ambient reader outlives the old bubble window; cooldown starts at close.
    await js('dialogueQA.keeperHere=false; dialogueQA.run(60);');
    box = await js('dialogueQA.wait(20)'); log({ stage: 'ambient-held', ...box });
    assert.equal(box.open, true); assert.match(box.name, /Patron/);
    await capture('patron');
    await js('dialogueQA.key("Escape"); dialogueQA.approach();');
    assert.equal((await js('dialogueQA.box()')).open, false, 'closing after a long read still starts a fresh cooldown');
    log(await js('({time:dialogueQA.w.time, mem:dialogueQA.w.speechMemory.get(dialogueQA.patron.id), blocking:__game.ui.uiBlocking()})'));
    await js('dialogueQA.here=false; dialogueQA.wait(15); dialogueQA.here=true; dialogueQA.run(70);');
    log(await js('({time:dialogueQA.w.time, mem:dialogueQA.w.speechMemory.get(dialogueQA.patron.id), focus:dialogueQA.w.speechFocusTarget(),blocking:__game.ui.uiBlocking(),box:dialogueQA.box()})'));
    assert.equal((await js('dialogueQA.box()')).open, true, 'returning after cooldown and dwell works');
    // Controller advance consumes the shared combat button through release.
    const padResult = await js(`(() => {
      const q=dialogueQA,w=q.w,original=w.useSkill.bind(w); let casts=0;
      w.useSkill=(...args)=>{if(args[0]===w.player)casts++;return original(...args);};
      window.qaPad={id:'QA pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
      q.run(2); qaPad.buttons[0]={pressed:true,touched:true,value:1}; q.run(4);
      const revealed=q.box(); qaPad.buttons[0]={pressed:false,touched:false,value:0};q.run(2);
      qaPad.buttons[0]={pressed:true,touched:true,value:1}; q.run(8); const finished=q.box();
      qaPad.buttons[0]={pressed:false,touched:false,value:0};q.run(2);window.qaPad=null;
      w.useSkill=original; return {casts,revealed,finished};
    })()`);
    assert.equal(padResult.casts, 0, 'dialogue A never casts its shared skill');
    assert.equal(padResult.revealed.shown, padResult.revealed.full);
    assert.equal(padResult.finished.open, false);
    // Compact viewport and larger UI: all controls remain on screen.
    await win.setSize(820, 650);
    box = await js(`dialogueQA.keeperHere=true; __game.settings().speechTyping=false; dialogueQA.approach();`);
    assert.ok(box.rect.x >= 0 && box.rect.y >= 0 && box.rect.x+box.rect.w<=box.viewport.w+1 && box.rect.y+box.rect.h<=box.viewport.h+1);
    assert.equal(box.shown, box.full); await capture('compact');
    const suspended = await js(`(() => {const before=dialogueQA.box();__game.ui.toggleInventory();const hidden=dialogueQA.run(10);__game.ui.toggleInventory();const resumed=dialogueQA.run(2);return {before,hidden,resumed};})()`);
    assert.equal(suspended.hidden.open, false, 'inventory suspends dialogue');
    assert.equal(suspended.resumed.open, true); assert.equal(suspended.resumed.full, suspended.before.full);
    box = await js(`(() => {
      __game.ui.showEscapeMenu(); document.getElementById('esc-keys').click();
      document.querySelector('[data-opttab="interface"]').click();
      const slider=document.getElementById('opt-uiscale');slider.value='175';slider.dispatchEvent(new Event('input',{bubbles:true}));
      __game.ui.hideEscapeMenu(); return dialogueQA.run(3);
    })()`);
    log({stage:'scaled',...box});
    assert.ok(box.open && box.rect.x >= -1 && box.rect.y >= -1 && box.rect.x+box.rect.w<=box.viewport.w+1 && box.rect.y+box.rect.h<=box.viewport.h+1, 'scaled reader remains inside the viewport');
    await capture('scaled');
    const cancel = await js(`(() => {
      const q=dialogueQA,w=q.w,original=w.useSkill.bind(w);let casts=0;
      w.useSkill=(...args)=>{if(args[0]===w.player)casts++;return original(...args);};
      window.qaPad={id:'QA pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
      q.run(2);qaPad.buttons[1]={pressed:true,touched:true,value:1};q.run(6);
      const box=q.box();qaPad.buttons[1]={pressed:false,touched:false,value:0};q.run(2);window.qaPad=null;w.useSkill=original;
      return {box,casts};
    })()`);
    assert.equal(cancel.box.open, false, 'controller B closes');assert.equal(cancel.casts,0,'controller close never casts');
    await js('dialogueQA.w.loadZone("lastlight"); __game.step(1);');
    assert.equal((await js('dialogueQA.box()')).open, false, 'same-zone reload clears conversation');
    assert.equal(await js('__game.crash().fatal'), null);
    log('PASS dialogue: dwell, priority, portraits, reveal/pages, pending state, Escape, dismissal, reading lifetime, cooldown, pad isolation, compact layout, zone reset');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
