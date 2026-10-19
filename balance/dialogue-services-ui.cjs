// Real client: actual dwell and clicks, independent panel groups, unchanged player geometry.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'dialogue-services-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'dialogue-services-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 480000);
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'), savesDir: path.join(dir, 'dialogue-services-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 2560, height: 1440, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    for(let attempt=0;attempt<3;attempt++) {
      await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      try { fs.writeFileSync(path.join(dir, `dialogue-services-${name}.png`), (await win.webContents.capturePage()).toPNG()); return; }
      catch(error) { if(!String(error).includes('UnknownVizError')||attempt===2)throw error; await new Promise(resolve=>setTimeout(resolve,100)); }
    }
  };
  const click = async selector => {
    const point = await js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing '+${JSON.stringify(selector)});
      el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();if(!r.width||!r.height)throw Error('Hidden '+${JSON.stringify(selector)});
      const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);if(!el.contains(document.elementFromPoint(x,y)))throw Error('Obscured '+${JSON.stringify(selector)});return {x,y};})()`);
    win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});
    win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});
    await new Promise(resolve=>setTimeout(resolve,40)); await js('serviceQA.run(3)');
  };
  const stable = row => {
    assert.ok(row.available, 'player pages cannot block dialogue');
    assert.equal(row.selected, row.page, 'NPC arrival cannot change the selected player ribbon');
    assert.deepEqual(row.bag, row.before.bag, 'NPC arrival cannot resize/reseat Inventory');
    assert.deepEqual(row.player, row.before.player, 'NPC arrival cannot resize/reseat the player page');
    assert.ok(row.books.every(b=>!b.tabs.some(t=>t.id===row.page)||!b.tabs.some(t=>['vendor','conversation'].includes(t.id))), 'NPC and player books are independent');
    assert.ok(row.npc.width>0 && row.npc.left>=0 && row.npc.right<=row.width+1 && row.npc.top>=0, 'NPC controls remain in the viewport');
  };
  try {
    await win.loadURL(server.url);
    await js(`(async()=>{
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      await new Promise(resolve=>setTimeout(resolve,700));
      Object.defineProperty(navigator,'getGamepads',{value:()=>[],configurable:true});
      __game.settings().speechTyping=false; __game.settings().renderScale=1; __game.settings().npcShopVisits=[];
      const w=__game.world();w.account.features.add('salvage_station');w.account.features.add('oracle_stone');w.account.features.add('reliquary');
      if(!w.massRuntime)w.loadZone('lastlight');w.player.invulnerable=true;
      const smith=w.actors.find(a=>a.defId==='townsfolk_smith'),inn=w.actors.find(a=>a.defId==='townsfolk_innkeep');
      const q=window.serviceQA={w,smith,inn,pos:{x:smith.pos.x+10,y:smith.pos.y},away:{x:smith.pos.x+700,y:smith.pos.y}};
      q.rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      q.run=(n,pos=q.pos)=>{q.pos={...pos};if(w.massRuntime)w.landPartyAt(pos);for(let i=0;i<Math.ceil(n/3);i++){w.player.pos={...pos};w.player.tier=0;w.mireilleCd=999;__game.step(1,50);}};
      q.clear=()=>{__game.ui.hideAll();q.run(3,q.away);__game.ui.toggleInventory();for(const p of __game.ui.inventoryPages.entries())__game.ui.inventoryPages.close(p.id);__game.ui.closeInventory();q.run(2);};
      q.page=id=>{const ui=__game.ui;if(!ui.inventoryOpen)ui.toggleInventory();if(id==='container:reliquary')ui.containerPane.toggle('reliquary',w.localSeat.id,'show');ui.inventoryPages.request(id,w.localSeat.id,'show');q.run(2);};
      q.snapshot=page=>{const ui=__game.ui,root=document.getElementById('npc-dialogue'),vendor=document.getElementById('vendor-menu');return {
        page,width:innerWidth,available:ui.dialogueContext().available,selected:ui.folio.bookFor(page)?.front,books:ui.folio.views(),
        bag:q.rect(document.getElementById('inventory')),player:q.rect(ui.inventoryPages.entries().find(p=>p.id===page).el),
        npc:q.rect(!vendor.classList.contains('hidden')&&!vendor.classList.contains('folio-shelved')?vendor:root),
        hudTop:ui.conversation.host.hudTop(),close:q.rect(root.querySelector('[data-panel-x]')),
        speaker:root.dataset.speakerId,conversation:root.getBoundingClientRect().width>0,vendor:ui.vendorOpen};};
      q.scale=value=>{__game.ui.showEscapeMenu();document.getElementById('esc-keys').click();document.querySelector('[data-opttab="interface"]').click();
        const slider=document.getElementById('opt-uiscale');slider.value=String(value);slider.dispatchEvent(new Event('input',{bubbles:true}));__game.ui.hideEscapeMenu();q.run(3);};
      q.clear();q.run(120,{x:smith.pos.x+10,y:smith.pos.y});
    })()`);
    let first=await js(`({vendor:__game.ui.vendorOpen,visible:document.getElementById('npc-dialogue').getBoundingClientRect().width>0,shop:!!document.querySelector('[data-conversation-shop]'),name:document.querySelector('#npc-dialogue h2').textContent,books:__game.ui.folio.views()})`);
    log({stage:'first-visit',...first});
    assert.ok(first.visible&&first.shop&&!first.vendor,'first Brandt visit offers Shop in conversation'); assert.match(first.name,/Brandt/);
    await capture('first-visit'); await click('[data-conversation-shop]');
    assert.equal(await js('__game.ui.vendorOpen'),true);
    assert.equal(await js('__game.ui.folio.bookFor("vendor").front'),'vendor');
    assert.equal(await js('__game.settings().npcShopVisits.length'),1);
    await click('[data-folio-tab="conversation"]');
    assert.ok(await js('document.querySelector("[data-conversation-shop]").getBoundingClientRect().width>0'));
    await click('[data-folio-tab="vendor"]');
    // Existing stock, purchase and station-suite controls remain real services.
    await js(`(()=>{const w=serviceQA.w;for(const id of Object.keys(w.meta.essences))w.meta.essences[id]=10000;__game.ui.refreshVendor();serviceQA.itemsBefore=w.meta.items.length;})()`);
    await click('[data-vbuy^="brandt:"]:not([disabled])');
    assert.equal(await js('serviceQA.w.meta.items.length-serviceQA.itemsBefore'),1,'actual purchase grants one item');
    for(const tab of ['salvage','oracle','vendor'])await click('[data-folio-tab="'+tab+'"]');
    await js('serviceQA.clear();serviceQA.run(120,{x:serviceQA.smith.pos.x+10,y:serviceQA.smith.pos.y})');
    assert.equal(await js('__game.ui.folio.bookFor("vendor")?.front'),'vendor','return visit opens original shop directly');
    assert.ok(await js('__game.ui.folio.bookFor("vendor").tabs.some(t=>t.id==="conversation")'),'conversation stays accessible from shop');
    // Close as soon as the return shop opens, before the old service dwell
    // could issue a second open request. A real X click must stay closed.
    const arrival=await js(`(()=>{const q=serviceQA;q.clear();q.w.localSeat.lastActedAt=q.w.time;
      const start=q.w.time;for(let n=0;n<40&&!__game.ui.vendorOpen;n++)q.run(1,q.smith.pos);
      return {elapsed:q.w.time-start,open:__game.ui.vendorOpen};})()`);
    log({stage:'return-dwell',...arrival});assert.ok(arrival.open&&arrival.elapsed<0.8,'one short dwell opens the return shop');
    await click('#vendor-menu [data-panel-x]');
    await js('serviceQA.run(120)');
    assert.equal(await js('__game.ui.vendorOpen'),false,'closing the shop cannot be undone by a second dwell timer');
    await click('#npc-dialogue [data-panel-x]');
    await js('serviceQA.w.account.features.add("brandt_magic_wares");serviceQA.run(120)');
    assert.equal(await js('document.getElementById("npc-dialogue").hidden'),true,'explicit close dismisses changing prompts for this visit');
    const rows=[];
    for(const [width,height,scale] of [[2560,1440,100],[1280,800,100],[820,650,175]]) {
      win.setContentSize(width,height);await new Promise(resolve=>setTimeout(resolve,100));
      await js(`serviceQA.clear();serviceQA.scale(${scale})`);
      for(const npc of ['smith','inn'])for(const page of ['skills','passives','container:reliquary','character'])for(const order of width===2560?['open','remembered']:['open']) {
        const row=await js(`(()=>{const q=serviceQA,ui=__game.ui;q.clear();q.page('${page}');const before=q.snapshot('${page}');
          if('${order}'==='remembered'){ui.toggleInventory();q.run(2);}
          q.run(120,{x:q.${npc}.pos.x+10,y:q.${npc}.pos.y});
          if('${order}'==='remembered'&&!ui.inventoryOpen){ui.toggleInventory();q.run(3);}
          return {...q.snapshot('${page}'),before,npcName:'${npc}',order:'${order}',scale:${scale}};})()`);
        log({stage:'matrix',npc,page,order,width,scale,selected:row.selected,speaker:row.speaker});
        stable(row);if(npc==='inn')assert.ok(row.conversation,'Mireille dialogue opens with the player page');else assert.ok(row.vendor,'Brandt shop opens with the player page');
        if(width===2560)assert.ok(row.npc.right<=row.player.left || row.player.right<=row.npc.left
          || row.npc.top>=row.player.bottom || row.player.top>=row.npc.bottom,'full desktop panels do not overlap');
        rows.push(row);
        if(order==='open'&&(width===2560||page==='skills'))await capture(`${npc}-${page.replace(':','-')}-${width}-${scale}`);
        if(npc==='inn') {
          assert.ok(Math.abs((row.npc.left+row.npc.right)/2-width/2)<1,'conversation is centered at the bottom');
          assert.ok(Math.abs(row.hudTop-row.npc.bottom-18*scale/100)<2,'conversation has a consistent gap above the HUD');
          assert.ok(Math.abs(row.close.width-28*scale/100)<1,'conversation uses the standard close target');
          await click('#npc-dialogue [data-panel-x]');await js('serviceQA.run(120)');
          assert.equal(await js('document.getElementById("npc-dialogue").hidden'),true,'X stays closed with the player ribbon open');
          assert.equal(await js('__game.ui.folio.bookFor('+JSON.stringify(page)+')?.front'),page,'X preserves the player ribbon');
        }
      }
    }
    fs.writeFileSync(path.join(dir,'dialogue-panel-matrix.json'),JSON.stringify(rows,null,2));
    // Native work remains engine-owned: all available Mireille contracts are
    // listed together and acceptance uses the real validated quest command.
    if(await js('!!serviceQA.w.massRuntime')) {
      win.setContentSize(2560,1440);await js('serviceQA.clear();serviceQA.scale(100);serviceQA.page("skills");serviceQA.run(120,serviceQA.inn.pos)');
      const work=await js('serviceQA.w.questOfferChoices().filter(q=>serviceQA.w.questDefOf(q.questId)?.giver==="townsfolk_innkeep").map(q=>q.questId)');
      assert.ok(work.length>0,'native Mireille has work available');
      for(const id of work)assert.ok(await js(`!!document.querySelector('[data-conversation-activity="work:${id}"]')`),'every available contract is a topic');
      await click('[data-conversation-activity="work:'+work[0]+'"]');
      await click('[data-conversation-accept="'+work[0]+'"]');
      assert.equal(await js(`serviceQA.w.activeQuests.filter(q=>q.questId==='${work[0]}').length`),1);
      assert.equal(await js('__game.ui.folio.bookFor("skills").front'),'skills');
      await click('.dialogue-next');
    }
    // A real character ribbon click uses the existing sheet and close semantics.
    win.setContentSize(2560,1440);await js('serviceQA.clear();serviceQA.scale(100);serviceQA.page("skills")');
    await click('[data-characterflap]');
    assert.equal(await js('__game.ui.folio.bookFor("character")?.front'),'character');
    assert.ok(await js('document.querySelector("#char-sheet").textContent.length>100'),'existing character details remain populated');
    await click('#char-sheet [data-panel-x]');
    assert.equal(await js('__game.ui.inventoryOpen'),true,'character close keeps Inventory open');
    assert.equal(await js('__game.ui.charSheetOpen'),false);
    await js('serviceQA.run(120,{x:serviceQA.smith.pos.x+10,y:serviceQA.smith.pos.y});serviceQA.w.account.features.add("brandt_magic_wares");serviceQA.run(4)');
    assert.equal(await js('__game.ui.folio.bookFor("vendor")?.front'),'vendor','new quest state cannot steal the shop');
    await js('__game.ui.showEscapeMenu();serviceQA.run(2);__game.ui.hideEscapeMenu();serviceQA.run(3)');
    assert.equal(await js('__game.ui.folio.bookFor("vendor")?.front'),'vendor','pause resumes the selected NPC tab');
    await js('serviceQA.run(5,serviceQA.away)');
    assert.equal(await js('__game.ui.vendorOpen'),false);assert.equal(await js('document.getElementById("npc-dialogue").hidden'),true);
    assert.equal(await js('__game.ui.inventoryOpen'),true);
    assert.equal(await js('__game.crash().fatal'),null);
    log('PASS: first visit, Shop click, purchase, suite, return preference, single dwell, persistent close, conversation tab, 32 NPC/page/arrival/size cases, bottom alignment, standard X, character ribbon, pause, quest refresh, departure');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
