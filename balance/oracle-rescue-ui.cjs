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
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
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
    await js(`(() => {
      __game.account().ledger.prologue_lived=1;__game.account().ledger['tutorial_faction:goblin']=1;
      __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.player.invulnerable=true;w.player.level=14;
      w.odyssey.update();w.loadZone('quest_revenge_commander_goblin');w.questRescues.update();
      const q=window.oracleQA={w,id:'revenge_commander_goblin'};
      q.box=()=>{const r=document.getElementById('npc-dialogue');return {open:!r.hidden,name:r.querySelector('h2').textContent,text:r.querySelector('.dialogue-accessible').textContent,oracle:__game.ui.oracleOpen,fatal:__game.crash().fatal};};
      q.approach=()=>{const a=w.actors.find(a=>a.defId==='townsfolk_oracle');w.player.pos={x:a.pos.x+30,y:a.pos.y};w.player.tier=a.tier;return a;};
      q.step=n=>{for(let i=0;i<n;i++){q.approach();__game.step(1);}return q.box();};
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
    const home = await js(`(() => {
      const q=oracleQA,w=q.w;w.loadZone('lastlight');q.approach();w.updateQuestGiver(4);__game.ui.hideAll();__game.ui.showQuestReward();
      return {buttons:document.querySelectorAll('[data-quest-reward]').length,look:q.approach().look};
    })()`);log({stage:'home',...home});assert.equal(home.buttons,3);await capture('charm-choice');
    const reward = await js(`(() => {
      const q=oracleQA,w=q.w;document.querySelector('[data-reward-choice="hearth"]').click();
      const charm=w.meta.items.find(i=>i.baseId==='relic_charm');if(!charm)throw Error('No chosen charm');
      w.containerPlace(w.localSeat,'reliquary',charm.uid);__game.ui.hideAll();
      w.player.pos={x:w.player.pos.x+400,y:w.player.pos.y};__game.step(4);
      return {lesson:w.account.ledger.reliquary_lesson,items:w.meta.containers.reliquary.length};
    })()`);log({stage:'seated',...reward});assert.equal(reward.items,1);
    box = await js('oracleQA.step(120)');log({stage:'resident',...box});assert.equal(box.open,true);assert.equal(box.oracle,true);assert.match(box.name,/Oracle/);assert.equal(box.fatal,null);
    await js('document.querySelector(".dialogue-next").click()');await capture('resident');
    const storage = await js(`(() => {
      const w=oracleQA.w;__game.ui.hideAll();w.player.pos={...w.stationAnchor('oracle').pos};__game.ui.showOracle();
      document.querySelector('[data-oracle-attune]').click();
      const relic=w.meta.containers.reliquary[0];
      document.querySelector('[data-relic-operation="unseat"]').click();
      if(w.meta.containers.reliquary.length!==0||w.meta.items.some(i=>i.uid===relic.uid))throw Error('Unseat did not enter reserve');
      const search=document.querySelector('[data-relic-search]');search.value=relic.name;search.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('[data-relic-operation="equip"]').click();
      const loose=JSON.parse(JSON.stringify(relic));delete loose.relicKey;loose.uid=900001;loose.x=0;loose.y=0;loose.name='Reserve test charm';w.meta.items.push(loose);
      __game.ui.refreshOracle();document.querySelector('[data-relic-operation="store"]').click();
      if(w.meta.items.some(i=>i.uid===loose.uid))throw Error('Deposit left duplicate');
      const clear=document.querySelector('[data-relic-search]');clear.value='';clear.dispatchEvent(new Event('input',{bubbles:true}));
      return {attuned:w.account.ledger.oracle_reliquary_attuned,stored:w.account.reliquary.items.length,equipped:w.meta.containers.reliquary.length};
    })()`);log({stage:'account-storage',...storage});assert.equal(storage.attuned,1);assert.equal(storage.stored,2);assert.equal(storage.equipped,1);await capture('account-storage');
    const investment=await js(`(() => {
      __game.ui.hideAll();const a=__game.account();a.ledger.account_deaths=1;a.credits=10;__game.ui.showAccountScreen();
      document.querySelector('[data-reliquary-invest]').click();
      if(a.reliquary.invested!==10||a.reliquary.rank!==0)throw Error('Partial pour lost');
      a.credits=20;__game.ui.showAccountScreen();document.querySelector('[data-reliquary-invest]').click();
      return {rank:a.reliquary.rank,partial:a.reliquary.invested,credits:a.credits,text:document.querySelector('.vault-body .vault-lesson').textContent};
    })()`);log({stage:'investment',...investment});assert.equal(investment.rank,1);assert.equal(investment.partial,0);assert.equal(investment.credits,5);assert.match(investment.text,/\+5%/);await capture('account-investment');
    await js(`__game.ui.hideAll();document.getElementById('account-screen').classList.add('hidden');__game.saveAccount();__game.save();`);
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
      w.player.pos={x:oracle.pos.x+20,y:oracle.pos.y};w.updateQuestGiver(4);__game.ui.hideAll();__game.ui.showQuestReward();
      window.oracleRepeatQA={w,id:aq.questId};const search=document.querySelector('[data-reward-search]');if(!search)throw Error('No skill search');
      const buttons=[...document.querySelectorAll('[data-quest-reward]')];const pick=buttons[0];
      oracleRepeatQA.chosen=pick.dataset.rewardChoice;search.value=pick.querySelector('strong').textContent;
      search.dispatchEvent(new Event('input',{bubbles:true}));return {captive,offered:buttons.length,visible:buttons.filter(b=>!b.hidden).length};
    })()`);log({stage:'next-life-choice',...again});assert.equal(again.captive,false);assert.ok(again.offered>1);assert.equal(again.visible,1);await capture('magic-choice');
    const memory = await js(`(() => {
      const q=oracleRepeatQA;document.querySelector('[data-quest-reward]:not([hidden])').click();
      const item=q.w.meta.items.find(i=>i.gem?.skillId===q.chosen);return {done:q.w.completedQuests.has(q.id),rarity:item?.gem?.rarity,level:item?.gem?.level,fatal:__game.crash().fatal};
    })()`);log({stage:'magic-claimed',...memory});assert.equal(memory.done,true);assert.equal(memory.rarity,'magic');assert.equal(memory.level,1);assert.equal(memory.fatal,null);
    await js(`(async()=>{__game.saveAccount();__game.save();for(let i=0;i<40;i++){const a=await fetch('/__save/0').then(r=>r.json());if(a.reliquary?.rank===1&&a.reliquary.items.length===2&&a.reliquary.seated.length===1)return;await new Promise(r=>setTimeout(r,50));}throw Error('Account write did not settle');})()`);
    await win.loadURL(server.url);
    const reloaded=await js(`({rank:__game.account().reliquary.rank,items:__game.account().reliquary.items.length,seated:__game.account().reliquary.seated.length,fatal:__game.crash().fatal})`);
    log({stage:'disk-reload',...reloaded});assert.equal(reloaded.rank,1);assert.equal(reloaded.items,2);assert.equal(reloaded.seated,1);assert.equal(reloaded.fatal,null);
    log('PASS: account reserve, equipped selection and empowerment survive a real app reload');
    log('PASS: captive dialogue, real commander kill, freed body, home choice, reward button, relic seating and Oracle service dialogue coexist');
    log('PASS: furnished residence, service sign, same-life expansion and searchable next-life magic skill reward');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
