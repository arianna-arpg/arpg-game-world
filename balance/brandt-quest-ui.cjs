// Build first. Hidden renderer and isolated saves; never touches a player's run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'brandt-quest-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'brandt-quest-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'brandt-quest-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `brandt-quest-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    const begin = await js(`(() => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(); w.player.invulnerable=true; w.player.level=12;
      w.account.features.add('brandt_magic_wares'); w.account.features.add('vendor_gems'); w.loadZone('lastlight');
      const q=window.hammerQA={w};
      q.home=()=>{const s=w.actors.find(a=>a.defId==='townsfolk_smith');w.player.pos={x:s.pos.x+10,y:s.pos.y};w.player.tier=0;return s;};
      q.home(); for(const id of ['coarse','glimmering','brilliant','pristine'])w.meta.essences[id]=999999;
      let ix=-1;for(let n=0;n<60&&ix<0;n++){w.time=n*900;w.restockVendor();ix=w.vendorStock.findIndex(e=>e.kind==='item'&&e.item.rarity==='magic'&&e.item.affixes.length===1);}
      if(ix<0)throw Error('No single-affix magic stock');
      q.item=w.vendorStock[ix].item;if(!w.buyVendorGem(ix))throw Error('Purchase failed');
      q.before=JSON.stringify(q.item.affixes);
      w.updateQuestGiver(4);q.quest=w.activeQuests.find(e=>e.questId==='brandt_hammer');
      if(!q.quest)throw Error('No Brandt quest from actual dwell');
      return {label:w.questDefOf(q.quest.questId).offerLabel,item:q.item.name,level:w.questOfferLevel(w.questDefOf(q.quest.questId))};
    })()`); log({stage:'accepted',...begin});
    const field = await js(`(() => {
      const q=hammerQA,w=q.w;__game.ui.hideAll();w.loadZone(q.quest.zoneId);
      const boss=w.actors.find(a=>a.defId==='cindermaw_toolthief');if(!boss)throw Error('No unique quarry');
      boss.dead=true;w.completeObjective('Cindermaw defeated');
      q.drop=w.drops.find(d=>d.item.kind==='gear'&&d.item.item.questId==='brandt_hammer');
      w.player.pos={x:q.drop.pos.x+70,y:q.drop.pos.y};__game.step(1);
      return {ready:w.questStanding(q.quest),name:q.drop.item.item.name};
    })()`);assert.equal(field.ready,'afield');assert.equal(field.name,'Brandt’s Hammer');
    await capture('hammer-found');
    const returned = await js(`(() => {
      const q=hammerQA,w=q.w;w.player.pos={...q.drop.pos};w.player.tier=q.drop.tier??0;
      for(let n=0;n<50&&w.drops.includes(q.drop);n++)w.pickupNearestGear(w.localSeat);
      w.loadZone('lastlight');q.home();w.updateQuestGiver(4);w.npcDialogues.refreshAppearances();
      __game.ui.hideAll();__game.ui.showQuestReward();
      const button=document.querySelector('[data-quest-imbue]');if(!button)throw Error('No real imbue button');
      const details=button.closest('details');details.open=true;
      q.uid=Number(button.dataset.itemUid);q.affix=button.dataset.affixId;
      return {owed:w.questImbues.length,look:q.home().look,done:w.account.ledger['quest_done:brandt_hammer'],text:details.textContent};
    })()`);log({stage:'returned',...returned});assert.equal(returned.owed,1);assert.equal(returned.look,'npc_smith');assert.ok(returned.done);assert.match(returned.text,/Unstudied family/);
    await capture('imbue-offers');
    const finish = await js(`(() => {
      const q=hammerQA,w=q.w;const before=JSON.stringify(w.questImbues);__game.ui.hideAll();w.player.level=100;
      __game.ui.showQuestReward();if(before!==JSON.stringify(w.questImbues))throw Error('Reward scaled or rerolled');
      document.querySelector('[data-quest-imbue]').click();
      const item=w.meta.items.find(i=>i.uid===q.uid);
      return {owed:w.questImbues.length,rarity:item.rarity,count:item.affixes.length,preserved:JSON.stringify(item.affixes.slice(0,1))===q.before,added:item.affixes.at(-1).id};
    })()`);log({stage:'imbued',...finish});assert.equal(finish.owed,0);assert.equal(finish.rarity,'rare');assert.equal(finish.count,2);assert.equal(finish.preserved,true);
    await capture('imbue-complete');
    assert.equal(await js('__game.crash().fatal'),null);
    log('PASS: real stock purchase, Brandt quest, physical hammer, return, armed model, deferred journal choices, fixed reward at level 100 and button-driven two-affix rare');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
