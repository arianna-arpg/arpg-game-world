// Build first. Hidden renderer, isolated profile/saves, real dialogue and reward controls.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'oracle-rescue-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'oracle-rescue-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'oracle-rescue-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1920, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `oracle-rescue-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    // Let initial save hydration finish before seeding the disposable run.
    await new Promise(resolve=>setTimeout(resolve,1200));
    await js(`(() => {
      // This DOM course owns its idle hero; physical input cannot cancel dwell.
      Object.defineProperty(navigator,'getGamepads',{value:()=>[],configurable:true});
      __game.pilot({poll:()=>null});
      // Keep terrain, loot and dwell fixtures reproducible across UI runs.
      let seed=27811;Math.random=()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
      __game.account().ledger.prologue_lived=1;__game.account().ledger['tutorial_faction:goblin']=1;
      __game.devStartRun('warrior');__game.hold(true);__game.ui.hideAll();const w=__game.world();w.player.invulnerable=true;w.player.level=14;
      w.odyssey.update();w.loadZone('quest_revenge_commander_goblin');w.questRescues.update();
      const q=window.oracleQA={w,id:'revenge_commander_goblin'};
      q.box=()=>{const r=document.getElementById('npc-dialogue');return {open:!r.hidden,name:r.querySelector('h2').textContent,text:r.querySelector('.dialogue-accessible').textContent,oracle:__game.ui.oracleOpen,fatal:__game.crash().fatal};};
      q.approach=()=>{const a=w.actors.find(a=>a.defId==='townsfolk_oracle');w.player.pos={...a.pos};w.player.tier=a.tier;return a;};
      q.step=n=>{w.localSeat.lastMovedAt=w.time;for(let i=0;i<n;i++){q.approach();__game.step(1,50);}return q.box();};
      for(const a of w.actors)if(a.team==='enemy')a.pos={x:50,y:50};
    })()`);
    let box = await js('oracleQA.step(100)'); log({stage:'captive',...box});
    assert.equal(box.open,true); assert.match(box.name,/Captive Oracle/); assert.match(box.text,/break Lastlight/);
    await js('document.querySelector(".dialogue-next").click()'); await capture('captive');
    box = await js(`(() => {
      const q=oracleQA,w=q.w;__game.ui.hideAll();
      for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead&&!a.invulnerable)w.kill(a,false,w.player);
      __game.step(2);w.questRescues.update();return {rescued:w.account.ledger.oracle_rescued,features:[...w.account.features],look:q.approach().look};
    })()`);log({stage:'freed',...box});assert.equal(box.rescued,1);assert.equal(box.look,'npc_scholar');assert.ok(box.features.includes('reliquary'));
    // The manual reward view still needs a tick to consume the queued request,
    // otherwise it can reopen the journal after claiming and block dialogue.
    const home = await js(`(() => {
      const q=oracleQA,w=q.w;w.loadZone('lastlight');q.approach();w.updateQuestGiver(4);__game.ui.hideAll();__game.ui.showQuestReward();__game.step(1);
      return {buttons:document.querySelectorAll('[data-quest-reward]').length,look:q.approach().look};
    })()`);log({stage:'home',...home});assert.equal(home.buttons,3);await capture('charm-choice');
    const reward = await js(`(() => {
      const q=oracleQA,w=q.w;document.querySelector('[data-reward-choice="hearth"]').click();
      const charm=w.meta.items.find(i=>i.baseId==='relic_charm');if(!charm)throw Error('No chosen charm');
      w.containerPlace(w.localSeat,'reliquary',charm.uid);__game.ui.hideAll();
      w.player.pos={x:w.player.pos.x+400,y:w.player.pos.y};__game.step(4);
      return {lesson:w.account.ledger.reliquary_lesson,items:w.meta.containers.reliquary.length};
    })()`);log({stage:'seated',...reward});assert.equal(reward.items,1);
    box = await js("oracleQA.step(120);document.querySelector('[data-folio-tab=\"conversation\"]')?.click();oracleQA.box()");log({stage:'resident',...box});assert.equal(box.open,true);assert.match(box.name,/Oracle/);assert.equal(box.fatal,null);
    await js('document.querySelector(".dialogue-next").click()');await capture('resident');
    // A fresh approach checks Oracle dwell independently of the claimed reward;
    // held animation frames cannot add extra simulation ticks.
    await js('document.querySelector(".dialogue-finish").click();__game.ui.hideAll();oracleQA.w.player.pos.x+=700;__game.step(10)');
    box=await js('oracleQA.step(120)');assert.equal(box.oracle,true,'Oracle service opens after a fresh approach');
    const storage = await js(`(() => {
      const w=oracleQA.w;__game.ui.hideAll();w.player.pos={...w.stationAnchor('oracle').pos};__game.ui.showOracle();
      document.querySelector('.dialogue-finish').click();
      document.querySelector('[data-oracle-attune]').click();
      const relic=w.meta.containers.reliquary[0];
      w.lastCombatAt=-999;__game.ui.containerPane.toggle('reliquary',w.localSeat.id,'show');
      const toggle=document.querySelector('[data-reliquary-toggle]');if(!toggle||toggle.disabled)throw Error('No enabled inventory toggle');toggle.click();
      if(w.meta.relicEnabled!==false)throw Error('Reliquary did not disable');
      document.querySelector('[data-reliquary-toggle]').click();if(w.meta.relicEnabled!==true)throw Error('Reliquary did not enable');
      document.querySelector('[data-containerflap="reliquary"]').click();
      if(!__game.ui.inventoryOpen)throw Error('Closing the Reliquary page closed Inventory');
      // Inventory pages keep their own book; Oracle remains the active service.
      // Select its tab when other services are present.
      document.querySelector('[data-folio-tab="oracle"]')?.click();
      if(__game.ui.folio.bookFor("oracle")?.front!=="oracle")throw Error("Oracle is not the active service");
      if(document.querySelector('[data-drop^="relicSeat:"]'))throw Error('Oracle still exposes equipped board');
      const loose=JSON.parse(JSON.stringify(relic));delete loose.relicKey;loose.uid=900001;loose.x=0;loose.y=0;loose.name='Reserve test charm';w.meta.items.push(loose);
      __game.ui.refreshOracle();document.querySelector('[data-relic-operation="store"]').click();
      if(w.meta.items.some(i=>i.uid===loose.uid))throw Error('Deposit left duplicate');
      const clear=document.querySelector('[data-relic-search]');clear.value='';clear.dispatchEvent(new Event('input',{bubbles:true}));
      oracleQA.clickTile=sel=>{const el=document.querySelector(sel);if(!el)throw Error('Missing '+sel);el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+8,r.top+8);el.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+8,clientY:r.top+8}));oracleQA.lastClick={sel,hit:hit?.outerHTML?.slice(0,250),classes:document.body.className,x:r.left,y:r.top};};
      oracleQA.clickTile('[data-drag="relicTile:'+loose.uid+'"]');
      oracleQA.clickTile('[data-drop="relicCell:0:5:3"]');
      const cell=w.account.reliquary.stash.cells[loose.relicKey];if(cell.x!==5||cell.y!==3)throw Error('Grid click-lift did not move '+JSON.stringify({cell,last:oracleQA.lastClick}));
      oracleQA.clickTile('[data-drag="relicTile:'+loose.uid+'"]');
      oracleQA.clickTile('[data-drop="bagCell:11:7"]');
      if(!w.meta.items.includes(loose))throw Error('Storage drag did not reach inventory '+JSON.stringify({last:oracleQA.lastClick,bag:w.meta.items.map(i=>({uid:i.uid,x:i.x,y:i.y})),reach:w.canManageAccountRelics(w.localSeat)}));
      document.querySelector('[data-containerflap="reliquary"]').click();
      oracleQA.clickTile('[data-drag="gearItem:'+loose.uid+'"]');
      oracleQA.clickTile('[data-drop="containerCell:reliquary:1:1"]');
      if(w.meta.containers.reliquary[0].uid!==loose.uid||!w.meta.items.includes(relic))throw Error('Inventory swap failed');
      document.querySelector('[data-folio-tab="oracle"]')?.click();
      if(__game.ui.folio.bookFor("oracle")?.front!=="oracle")throw Error("Oracle is not the active service");
      oracleQA.clickTile('[data-drag="gearItem:'+relic.uid+'"]');
      oracleQA.clickTile('[data-drop="relicCell:0:5:3"]');
      if(w.meta.items.includes(relic)||!w.account.reliquary.stash.cells[relic.relicKey])throw Error('Inventory drag did not store');
      return {attuned:w.account.ledger.oracle_reliquary_attuned,stored:w.account.reliquary.items.length,equipped:w.meta.containers.reliquary.length};
    })()`);log({stage:'account-storage',...storage});assert.equal(storage.attuned,1);assert.equal(storage.stored,2);assert.equal(storage.equipped,1);await capture('account-storage');
    const investment=await js(`(() => {
      const w=oracleQA.w;__game.ui.hideAll();const a=__game.account();a.ledger.account_deaths=1;a.credits=10;__game.ui.showAccountScreen();document.querySelector('[data-vtab="gems"]')?.click();
      document.querySelector('[data-invest="reliquary_power_1"]').click();
      if(a.reliquary.invested!==10||a.reliquary.rank!==0)throw Error('Partial pour lost');
      a.credits=20;__game.ui.showAccountScreen();document.querySelector('[data-invest="reliquary_power_1"]').click();
      const credits=a.credits;a.credits=15;__game.ui.showAccountScreen();document.querySelector('[data-vtab="town"]')?.click();document.querySelector('[data-invest="relic_stash_2"]').click();
      if(a.reliquary.stash.invested!==15||a.reliquary.stash.pages!==1)throw Error('Stash partial pour lost');
      a.credits=30;__game.ui.showAccountScreen();document.querySelector('[data-invest="relic_stash_2"]').click();
      if(a.reliquary.stash.pages!==2||a.credits!==5)throw Error('Stash page purchase failed');
      return {rank:a.reliquary.rank,partial:a.reliquary.invested,credits,power:w.meta.relicEmpowerment};
    })()`);log({stage:'investment',...investment});assert.equal(investment.rank,1);assert.equal(investment.partial,0);assert.equal(investment.credits,5);assert.equal(investment.power,.02);await capture('account-investment');
    await js(`(() => {__game.ui.hideAll();document.getElementById('account-screen').classList.add('hidden');const w=oracleQA.w;w.player.pos={...w.stationAnchor('oracle').pos};__game.ui.showOracle();})()`);
    await capture('stash-page-one');
    await js(`(() => {const w=oracleQA.w;document.querySelector('[data-folio-tab="oracle"]')?.click();
      const item=w.account.reliquary.items.find(i=>!w.account.reliquary.seated.includes(i.relicKey));oracleQA.storedKey=item.relicKey;
      oracleQA.clickTile('[data-drag="relicTile:'+item.uid+'"]');document.querySelector('[data-relic-page="1"]').click();
      oracleQA.clickTile('[data-drop="relicCell:1:4:2"]');
      const cell=w.account.reliquary.stash.cells[item.relicKey];if(cell.page!==1||cell.x!==4||cell.y!==2)throw Error('Cross-page drag failed '+JSON.stringify({cell,last:oracleQA.lastClick}));
      __game.saveAccount();__game.save();})()`);
    await capture('stash-page-two');
    const residence = await js(`(() => {
      const w=oracleQA.w;__game.ui.hideAll();const home=w.zone.fixtures.find(f=>f.structure==='oracle_home');
      if(!home)throw Error('Oracle has no house');w.player.pos={x:home.x,y:home.y+95};
      __game.step(5);return {tier:w.townTierIndex(),width:w.arena.w,sign:w.doodads.some(d=>d.kind==='service_sign_oracle')};
    })()`);log({stage:'residence',...residence});assert.ok(residence.tier>=1);assert.ok(residence.sign);await capture('house');
    const again = await js(`(() => {
      __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.player.invulnerable=true;w.player.level=14;w.odyssey.update();
      if(w.account.reliquary.items.length!==2||w.meta.containers.reliquary.length!==1||w.account.reliquary.rank!==1)throw Error('Account Relics did not cross lives');const aq=w.activeQuests.find(q=>q.questId==='oracle_commander_goblin');if(!aq)throw Error('No next-life commander');
      w.loadZone(aq.zoneId);w.questRescues.update();const captive=w.actors.some(a=>a.defId==='townsfolk_oracle');
      for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead&&!a.invulnerable)w.kill(a,false,w.player);
      __game.step(2);w.loadZone('lastlight');const oracle=w.actors.find(a=>a.defId==='townsfolk_oracle');
      w.player.pos={x:oracle.pos.x+20,y:oracle.pos.y};w.updateQuestGiver(4);__game.ui.hideAll();__game.ui.showQuestReward();__game.step(1);
      window.oracleRepeatQA={w,id:aq.questId};const search=document.querySelector('[data-reward-search]');if(!search)throw Error('No skill search');
      const buttons=[...document.querySelectorAll('[data-quest-reward]')];const pick=buttons[0];
      oracleRepeatQA.chosen=pick.dataset.rewardChoice;search.value=pick.querySelector('strong').textContent;
      search.dispatchEvent(new Event('input',{bubbles:true}));return {captive,offered:buttons.length,visible:buttons.filter(b=>!b.hidden).length};
    })()`);log({stage:'next-life-choice',...again});assert.equal(again.captive,false);assert.ok(again.offered>1);assert.equal(again.visible,1);await capture('magic-choice');
    const memory = await js(`(() => {
      const q=oracleRepeatQA;document.querySelector('[data-quest-reward]:not([hidden])').click();
      const item=q.w.meta.items.find(i=>i.gem?.skillId===q.chosen);return {done:q.w.completedQuests.has(q.id),rarity:item?.gem?.rarity,level:item?.gem?.level,fatal:__game.crash().fatal};
    })()`);log({stage:'magic-claimed',...memory});assert.equal(memory.done,true);assert.equal(memory.rarity,'magic');assert.equal(memory.level,1);assert.equal(memory.fatal,null);
    const locker=await js(`(() => {const w=oracleRepeatQA.w;__game.ui.hideAll();w.meta.modeId='immortal';w.player.pos={...w.stationAnchor('oracle').pos};__game.ui.showOracle();
      const item=w.meta.items.find(i=>i.gem);document.querySelector('[data-personal-stash-store="'+item.uid+'"]').click();
      if(w.meta.items.includes(item)||w.meta.stash.items.length!==1)throw Error('Personal stash deposit failed');
      document.querySelector('.dialogue-finish').click();
      const source=document.querySelector('[data-drag="personalStashTile:'+item.uid+'"]'),target=document.querySelector('[data-drop="personalStashCell:3:2"]');
      source.scrollIntoView({block:'center',behavior:'instant'});const start=source.getBoundingClientRect();
      source.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:start.left+8,clientY:start.top+8}));
      target.scrollIntoView({block:'center',behavior:'instant'});const end=target.getBoundingClientRect();
      document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:end.left+8,clientY:end.top+8}));
      document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,clientX:end.left+8,clientY:end.top+8}));
      // A native pointer release also emits click; consume the drag's trailing click.
      document.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:end.left+8,clientY:end.top+8}));
      if(w.meta.stash.layout.cells[item.uid].x!==3)throw Error('Personal stash grid move failed');
      return {count:w.meta.stash.items.length,uid:item.uid};})()`);log({stage:'immortal-locker',...locker});assert.equal(locker.count,1);await capture('immortal-locker');
    await js(`(() => {const w=oracleRepeatQA.w;document.querySelector('[data-personal-stash-take]').click();if(w.meta.stash.items.length!==0)throw Error('Personal stash retrieval failed');w.meta.modeId='mortal';__game.ui.hideAll();})()`);
    await js(`(async()=>{__game.saveAccount();__game.save();for(let i=0;i<40;i++){const a=await fetch('/__save/0').then(r=>r.json());if(a.reliquary?.rank===1&&a.reliquary.items.length===2&&a.reliquary.seated.length===1)return;await new Promise(r=>setTimeout(r,50));}throw Error('Account write did not settle');})()`);
    await win.loadURL(server.url);
    const reloaded=await js(`({rank:__game.account().reliquary.rank,items:__game.account().reliquary.items.length,seated:__game.account().reliquary.seated.length,pages:__game.account().reliquary.stash.pages,cells:Object.values(__game.account().reliquary.stash.cells),fatal:__game.crash().fatal})`);
    log({stage:'disk-reload',...reloaded});assert.equal(reloaded.rank,1);assert.equal(reloaded.items,2);assert.equal(reloaded.seated,1);assert.equal(reloaded.fatal,null);
    assert.equal(reloaded.pages,2);assert.deepEqual(reloaded.cells,[{page:1,x:4,y:2}]);
    const death = await js(`(() => {
      __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.loadZone('lastlight');
      w.player.pos={...w.stationAnchor('oracle').pos};w.player.invulnerable=false;w.lastCombatAt=-999;
      const r=w.account.reliquary, withdrawn=r.items.find(i=>!r.seated.includes(i.relicKey));
      const stored=structuredClone(withdrawn);delete stored.relicKey;stored.uid=900101;stored.x=10;stored.y=7;
      w.meta.items.push(stored);w.oracleRelic(w.localSeat,stored.uid,'store');
      w.withdrawRelic(w.localSeat,withdrawn.uid);if(!w.meta.items.includes(withdrawn))throw Error('Death fixture did not withdraw');
      const fresh=structuredClone(withdrawn);delete fresh.relicKey;fresh.uid=900102;fresh.x=11;fresh.y=7;w.meta.items.push(fresh);
      __game.save();w.kill(w.player);__game.step(2);
      if(r.items.length!==2||r.carried.length||w.meta.items.some(i=>i.uid===withdrawn.uid||i.uid===fresh.uid))throw Error('Death retained a pack Relic');
      return {lost:withdrawn.relicKey,equipped:r.seated[0],stored:stored.relicKey};
    })()`);
    await js(`(async()=>{for(let i=0;i<60;i++){const a=await fetch('/__save/0').then(r=>r.json());if(a.reliquary?.released.includes(${JSON.stringify(death.lost)})&&a.reliquary.items.length===2&&a.reliquary.carried.length===0)return;await new Promise(r=>setTimeout(r,50));}throw Error('Death loss was not persisted');})()`);
    await win.loadURL(server.url);
    const afterDeath=await js(`({keys:__game.account().reliquary.items.map(i=>i.relicKey),seated:__game.account().reliquary.seated,carried:__game.account().reliquary.carried,lost:__game.account().reliquary.released,fatal:__game.crash().fatal})`);
    assert.deepEqual(afterDeath.keys.sort(),[death.equipped,death.stored].sort());assert.deepEqual(afterDeath.carried,[]);
    assert.deepEqual(afterDeath.seated,[death.equipped]);assert(afterDeath.lost.includes(death.lost));assert.equal(afterDeath.fatal,null);
    log({stage:'death-disk-reload',...afterDeath});
    const sale = await js(`(() => {
      __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.loadZone('lastlight');w.player.invulnerable=true;
      w.account.features.add('salvage_station');w.loadZone('lastlight');w.player.pos={...w.stationAnchor('oracle').pos};
      w.meta.items.length=0;const r=w.account.reliquary,template=r.items[0];
      window.relicSaleQA={w,keys:[],protected:r.items.map(i=>i.relicKey)};
      for(let n=0;n<3;n++){
        const i=structuredClone(template);delete i.relicKey;i.uid=900110+n;i.x=n;i.y=0;
        w.meta.items.push(i);w.oracleRelic(w.localSeat,i.uid,'store');w.withdrawRelic(w.localSeat,i.uid);
        if(!i.relicKey||!w.meta.items.includes(i))throw Error('Sale fixture not account-carried');
        relicSaleQA.keys.push(i.relicKey);if(n===2)i.locked=true;
      }
      const vendor=w.actors.find(a=>a.defId==='townsfolk_smith');w.player.pos={...vendor.pos};w.player.tier=vendor.tier;
      __game.ui.showVendor();document.querySelector('.dialogue-finish')?.click();
      document.querySelector('[data-folio-tab="vendor"]')?.click();
      const toggle=document.querySelector('#vendor-menu [data-breaker]');if(!toggle.classList.contains('bound'))toggle.click();
      const bulk=document.querySelector('#vendor-menu [data-bulk="item"]');
      const preview=bulk.textContent,receipt=Number(bulk.querySelector('span').textContent.match(/\\d+/)[0]);
      const wallet=w.meta.essences.coarse??0;
      const tile=document.querySelector('[data-salv-uid="900110"]');if(!tile)throw Error('No Relic sell tile');tile.click();
      if(w.meta.items.some(i=>i.uid===900110)||!r.released.includes(relicSaleQA.keys[0]))throw Error('UI sale did not consume account Relic');
      return {preview,receipt,paid:(w.meta.essences.coarse??0)-wallet,keys:relicSaleQA.keys};
    })()`);log({stage:'relic-vendor-sale',...sale});assert.match(sale.preview,/Sell all \(2\)/);assert.equal(sale.paid*2,sale.receipt);assert(sale.paid>0);await capture('relic-vendor-sale');
    const salvage = await js(`(() => {
      const q=relicSaleQA,w=q.w;__game.ui.hideAll();w.player.pos={...w.townSeat('salvage')};__game.ui.showSalvage();
      document.querySelector('.dialogue-finish')?.click();document.querySelector('[data-folio-tab="salvage"]')?.click();
      const bulk=document.querySelector('#salvage-menu [data-bulk="item"]'),preview=bulk.textContent;
      bulk.click();
      if(w.meta.items.some(i=>i.uid===900111)||!w.account.reliquary.released.includes(q.keys[1]))throw Error('UI salvage did not consume account Relic');
      if(!w.meta.items.some(i=>i.uid===900112&&i.locked))throw Error('Sweep consumed locked Relic');
      __game.save();return {preview,protected:q.protected,locked:q.keys[2],fatal:__game.crash().fatal};
    })()`);log({stage:'relic-bench-salvage',...salvage});assert.match(salvage.preview,/Break all \(1\)/);assert.equal(salvage.fatal,null);await capture('relic-bench-salvage');
    await js(`(async()=>{for(let i=0;i<60;i++){const a=await fetch('/__save/0').then(r=>r.json());if(${JSON.stringify(sale.keys.slice(0,2))}.every(k=>a.reliquary?.released.includes(k))&&a.reliquary.items.length===3)return;await new Promise(r=>setTimeout(r,50));}throw Error('Relic consumption was not persisted');})()`);
    await win.loadURL(server.url);
    const afterSale=await js(`({keys:__game.account().reliquary.items.map(i=>i.relicKey),carried:__game.account().reliquary.carried,released:__game.account().reliquary.released,fatal:__game.crash().fatal})`);
    assert.deepEqual(afterSale.keys.sort(),[...salvage.protected,salvage.locked].sort());assert.deepEqual(afterSale.carried,[salvage.locked]);
    assert(sale.keys.slice(0,2).every(k=>afterSale.released.includes(k)));assert.equal(afterSale.fatal,null);
    log({stage:'sale-disk-reload',...afterSale});
    log('PASS: vendor single-click and bench bulk controls consume account Relics, preview normal proceeds, preserve locks and survive disk reload');
    log('PASS: actual death destroys withdrawn/new pack Relics durably; equipped and stored Relics survive app reload');
    log('PASS: grid moves, capacity-preserving equipment swaps, cross-page drag, Vault page investment and personal Immortal storage');
    log('PASS: account reserve, equipped selection and empowerment survive a real app reload');
    log('PASS: captive dialogue, real commander kill, freed body, home choice, reward button, relic seating and Oracle service dialogue coexist');
    log('PASS: furnished residence, service sign, same-life expansion and searchable next-life magic skill reward');
  } catch(error) { await capture('failure'); throw error; }
  finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
