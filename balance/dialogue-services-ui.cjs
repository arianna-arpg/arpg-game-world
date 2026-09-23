// Build first. Real dwell, panels and input, hidden window, isolated profile/saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'dialogue-services-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'dialogue-services-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'dialogue-services-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `dialogue-services-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  const fits = box => {
    assert.equal(box.open, true, 'reader stays visible beside services');
    for (const r of [box.reader, box.next, box.close, ...box.panels]) {
      assert.ok(r.left >= -1 && r.top >= -1 && r.right <= box.width + 1 && r.bottom <= box.height + 1, `inside viewport: ${JSON.stringify(r)}`);
    }
    for (const panel of box.panels) assert.ok(panel.bottom <= box.reader.top - 1, 'service cannot cover dialogue');
    for (let i = 0; i < box.panels.length; i++) for (const b of box.panels.slice(i + 1)) {
      const a = box.panels[i];
      assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'services and bag do not overlap');
    }
    assert.ok(box.next.top >= box.reader.top && box.next.bottom <= box.reader.bottom + 1, 'advance stays visible without scrolling');
    assert.ok(box.readingHeight >= box.lineHeight, 'at least one text line remains readable below the fixed name');
  };
  try {
    await win.loadURL(server.url);
    await js(`(async () => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      await new Promise(resolve=>setTimeout(resolve,700));
      __game.settings().speechTyping=false;
      const w=__game.world(); w.account.features.add('salvage_station'); w.account.features.add('oracle_stone');
      w.loadZone('lastlight'); w.account.features.add('salvage_station'); w.account.features.add('oracle_stone'); w.player.invulnerable=true;
      const smith=w.actors.find(a=>a.defId==='townsfolk_smith');
      const q=window.serviceQA={w,smith,home:{x:smith.pos.x+10,y:smith.pos.y},trace:[]};
      q.rect=el=>{const r=el.getBoundingClientRect();return {id:el.id,left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
      q.box=()=>{const root=document.getElementById('npc-dialogue');return {
        open:!root.hidden,text:root.querySelector('.dialogue-accessible').textContent,name:root.querySelector('h2').textContent,
        reader:q.rect(root),next:q.rect(root.querySelector('.dialogue-next')),close:q.rect(root.querySelector('.dialogue-close')),
        readingHeight:root.querySelector('.dialogue-layout').clientHeight,nameHeight:root.querySelector('h2').offsetHeight+5,
        lineHeight:parseFloat(getComputedStyle(root.querySelector('.dialogue-page')).lineHeight),
        panels:[...document.querySelectorAll('.dialogue-companion')].map(q.rect),width:innerWidth,height:innerHeight,
        vendor:__game.ui.vendorOpen,salvage:__game.ui.salvageOpen,oracle:__game.ui.oracleOpen,inventory:__game.ui.inventoryOpen};};
      q.run=(n,pos=q.home)=>{for(let i=0;i<n;i++){w.player.pos={...pos};w.player.tier=0;w.mireilleCd=999;__game.step(1);
        q.trace.push({open:!document.getElementById('npc-dialogue').hidden,vendor:__game.ui.vendorOpen,near:w.nearSmith(),focus:w.speechFocusTarget()?.id});}return q.box();};
      q.targets=()=>[...document.querySelectorAll('#vendor-menu [data-vbuy],#inventory [data-uid],.folio-strip')]
        .filter(el=>el.getBoundingClientRect().width>0).map(el=>({...q.rect(el),key:el.dataset.vbuy??el.dataset.uid??el.textContent}));
      q.key=key=>{window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key,bubbles:true}));q.run(1);window.dispatchEvent(new KeyboardEvent('keyup',{key,code:key,bubbles:true}));return q.box();};
      q.tab=id=>{const tab=document.querySelector('[data-folio-tab="'+id+'"]');if(!tab)throw Error('Missing tab '+id);tab.click();return q.run(3);};
      q.scale=value=>{__game.ui.showEscapeMenu();document.getElementById('esc-keys').click();document.querySelector('[data-opttab="interface"]').click();
        const slider=document.getElementById('opt-uiscale');slider.value=String(value);slider.dispatchEvent(new Event('input',{bubbles:true}));__game.ui.hideEscapeMenu();return q.run(3);};
    })()`);
    let box = await js('serviceQA.run(110)'); log({stage:'dwell',...box}); fits(box);
    const trace = await js('serviceQA.trace');
    const began = trace.findIndex(f=>f.open);
    assert.ok(began>=0 && trace.slice(began).some(f=>f.vendor));
    assert.ok(trace.slice(began).every(f=>f.open), 'no single-frame dismissal during actual vendor/suite dwell');
    log(await js('({features:[...serviceQA.w.account.features],salvage:serviceQA.w.hasSalvage(),oracle:serviceQA.w.hasOracle(),summons:serviceQA.w.suiteSummons()})'));
    assert.ok(box.vendor && box.salvage && box.oracle && box.inventory, 'actual dwell opens stocked shop, bag and summoned suite');
    assert.match(box.name, /Brandt/); assert.match(box.text, /hammer/);
    const first = box.text; await capture('brandt');
    // Roof/label visibility admits an offer, but cannot revoke an admitted
    // page while the world's interaction focus and counter reach still hold.
    const covered = await js(`(() => {const r=__game.renderer,read=r.labelRevealAt;
      r.labelRevealAt=function(w,p){return p===serviceQA.smith.pos?0:read.call(this,w,p);};
      try{return serviceQA.run(5);}finally{r.labelRevealAt=read;}})()`);
    fits(covered); assert.equal(covered.text,first);
    // The dialogue and shop must agree at BOTH sides of every roof edge.
    const edges = await js(`(() => {const q=serviceQA,w=q.w,home=w.roofedStructureAt(q.smith.pos);let samples=0;
      for(const roof of home.roofs)for(let x=roof.x-2;x<=roof.x+roof.w+2;x+=8)for(let y=roof.y-2;y<=roof.y+roof.h+2;y+=8){
        w.player.pos={x,y};w.player.tier=0;const near=w.nearSmith(),talk=w.speechCandidates(w.localSeat).some(c=>c.id===q.smith.id);
        if(near!==talk)throw Error('Counter/dialogue reach disagreement at '+JSON.stringify({x,y,near,talk}));samples++;
      }w.player.pos={...q.home};return samples;})()`);
    assert.ok(edges>100); log({stage:'roof-reach',samples:edges});
    for (const id of ['salvage','oracle','vendor']) {
      box = await js(`serviceQA.tab('${id}')`); fits(box); assert.equal(box.text, first, 'tab switches preserve page');
    }
    // A real buy action remains available while the same page is being read.
    const bought = await js(`(() => {const q=serviceQA,w=q.w;for(const id of Object.keys(w.meta.essences))w.meta.essences[id]=10000;__game.ui.refreshVendor();
      const before=w.meta.items.length,button=document.querySelector('[data-vbuy^="brandt:"]:not([disabled])');
      if(!button)throw Error('No buyable stock');button.click();q.run(3);return {before,after:w.meta.items.length,box:q.box()};})()`);
    assert.equal(bought.after, bought.before + 1); assert.equal(bought.box.text, first); fits(bought.box);
    // Focused service controls retain their native Enter behavior.
    const key = await js(`(() => {const q=serviceQA,button=document.querySelector('#vendor-menu button');
      button.focus();const e=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true});button.dispatchEvent(e);
      button.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));button.blur();return {prevented:e.defaultPrevented,text:q.box().text};})()`);
    assert.equal(key.prevented, false); assert.equal(key.text, first);
    const dismissal = await js(`(() => {const q=serviceQA,scroll=document.querySelector('#inventory .inv-scroll');
      scroll.scrollTop=80;const top=scroll.scrollTop,panels=q.box().panels,targets=q.targets();q.key('Escape');q.run(4);
      return {panels,targets,top,after:q.box(),afterTargets:q.targets(),afterTop:scroll.scrollTop};})()`);
    box=dismissal.after;assert.equal(box.open,false);assert.ok(box.vendor&&box.inventory);
    assert.deepEqual(box.panels,dismissal.panels,'dismissal must not move or resize service panels');
    assert.deepEqual(dismissal.afterTargets,dismissal.targets,'buy/sell hit targets stay fixed');
    assert.equal(dismissal.afterTop,dismissal.top,'dismissal preserves the inventory scroll');
    assert.equal((await js('serviceQA.run(90)')).open, false, 'same line stays dismissed');
    // A genuine new state can speak while the player still works the counter.
    box = await js('serviceQA.w.account.features.add("brandt_magic_wares");serviceQA.w.restockVendor();serviceQA.run(3)');
    fits(box); assert.notEqual(box.text, first); assert.match(box.text, /magic|writs/i);
    // Modal pause suspends and resumes this exact page without moving controls.
    const pause = await js('(() => {const before=serviceQA.box();__game.ui.showEscapeMenu();const hidden=serviceQA.run(2);__game.ui.hideEscapeMenu();return {before,hidden,after:serviceQA.run(2)};})()');
    assert.equal(pause.hidden.open, false); assert.deepEqual(pause.hidden.panels,pause.before.panels);
    assert.deepEqual(pause.after.panels,pause.before.panels);assert.equal(pause.after.text, pause.before.text); fits(pause.after);
    // A remembered Skills drawer behind the shop is quiet; an explicit front
    // page suspends conversation, then restores it when the station returns.
    const page = await js(`(() => {const q=serviceQA,before=q.box().text;__game.ui.toggleBuildPanel();const hidden=q.run(2);
      q.tab('vendor');return {before,hidden,after:q.box()};})()`);
    assert.equal(page.hidden.open,false); assert.equal(page.after.text,page.before); fits(page.after);
    await win.setSize(820, 650); box = await js('serviceQA.run(3)'); fits(box); await capture('compact');
    box = await js('serviceQA.scale(175)'); log({stage:'scaled',...box}); fits(box); await capture('scaled');
    log(await js('__game.crash()'));
    assert.equal(await js('__game.crash().fatal'), null);
    // Controller A hits the displaced service tabs, without also advancing.
    const pad = await js(`(() => {const q=serviceQA;window.qaPad={id:'QA pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>qaPad?[qaPad]:[]});q.run(2);
      const r=document.querySelector('[data-folio-tab="salvage"]').getBoundingClientRect();__game.padPointer().place(r.left+r.width/2,r.top+r.height/2);const text=q.box().text;
      const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML;
      qaPad.buttons[0]={pressed:true,touched:true,value:1};q.run(3);qaPad.buttons[0]={pressed:false,touched:false,value:0};q.run(2);window.qaPad=null;
      return {before:text,after:q.box().text,open:q.box().open,hit,pointer:__game.padPointer().position(),tab:q.rect(document.querySelector('[data-folio-tab="salvage"]')),front:!document.getElementById('salvage-menu').classList.contains('folio-shelved')};})()`);
    log({stage:'controller',...pad});
    assert.equal(pad.before, pad.after); assert.equal(pad.open, true); assert.equal(pad.front,true,'controller hits the drawn displaced tab');
    // Both pointer close and finishing the last page preserve the controls,
    // including at accessibility scale. Neither gesture performs a trade.
    for (const mode of ['close','finish']) {
      const stable = await js(`(() => {const q=serviceQA;q.w.dialogueScene++;q.run(3);
        const before=q.box().panels,targets=q.targets(),items=q.w.meta.items.length;
        if('${mode}'==='close')document.querySelector('.dialogue-close').click();
        else for(let i=0;i<10&&q.box().open;i++){document.querySelector('.dialogue-next').click();q.run(1);}
        return {before,targets,items,after:q.run(3),afterTargets:q.targets(),afterItems:q.w.meta.items.length};})()`);
      assert.equal(stable.after.open,false); assert.deepEqual(stable.after.panels,stable.before);
      assert.deepEqual(stable.afterTargets,stable.targets);assert.equal(stable.afterItems,stable.items);
    }
    await win.setSize(1400, 1000); await js('serviceQA.scale(100)');
    box = await js(`(() => {const q=serviceQA;const dwell=q.w.npcDialogues.dwell,quest=q.w.questGiverPrompt;
      q.w.npcDialogues.dwell=()=>null;q.w.questGiverPrompt=()=>null;q.w.dialogueScene++;const box=q.run(5);
      q.w.npcDialogues.dwell=dwell;q.w.questGiverPrompt=quest;return box;})()`);
    assert.equal(box.open,false,'service alone never manufactures dialogue');assert.ok(box.vendor && box.inventory);
    box = await js('serviceQA.run(4,{x:serviceQA.home.x+700,y:serviceQA.home.y})');
    assert.equal(box.open, false); assert.equal(box.vendor, false);
    await js('__game.ui.hideAll();serviceQA.run(2,{x:serviceQA.home.x+700,y:serviceQA.home.y})');
    assert.equal((await js('serviceQA.box()')).panels.length,0,'closed panels release their reservations');
    assert.equal(await js('__game.crash().fatal'), null);
    log('PASS: service dwell, suite tabs, purchase, independent dismissal, new state, pause, compact/scaled layout, controller, departure');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
