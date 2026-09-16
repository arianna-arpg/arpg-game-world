// Vault reveal order through the real shell, with isolated account/run saves.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `vault-progression-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root:path.resolve(__dirname,'../dist'), savesDir:path.join(dir,`vault-progression-saves-${process.pid}`) });
 const win = new BrowserWindow({ show:false, width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false} });
 const js = async source => {
  try { return await win.webContents.executeJavaScript(source); }
  catch(error) { console.error('FAILED UI STEP',source);throw error; }
 };
 win.webContents.on('console-message', details => { if(details.level==='error')console.error(details.message); });
 const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click();void 0`);
 const sealed = async label => {
  const result = await js(`(()=>{
   const ui=__game.ui,a=__game.account();
   const visible=[...document.querySelectorAll('.panel')].filter(e=>e.getClientRects().length && !e.classList.contains('hidden')).map(e=>e.id);
   ui.showAccountScreen();
   return {visible,after:[...document.querySelectorAll('.panel')].filter(e=>e.getClientRects().length && !e.classList.contains('hidden')).map(e=>e.id),
    closed:document.querySelector('#account-screen').classList.contains('hidden'),
    prompted:!!a.ledger.bounty_lesson_prompted,board:a.features.has('bounty_board'),deaths:a.ledger.account_deaths||0};
  })()`);
  assert(result.closed && !result.prompted && !result.board && result.deaths===0,label);
  assert.deepEqual(result.after,result.visible,`${label}: refused entry leaves current page intact`);
 };
 try {
  await win.loadURL(server.url);await wait(1200);
  assert(!(await js(`!!document.querySelector('#sm-vault')`)),'fresh main menu has no Vault');
  await sealed('fresh account');
  await js(`__game.devStartRun('warrior');void 0`);await wait(150);
  assert(await js(`__game.world().scene?.def.id==='prologue'`),'first run enters tutorial');
  await js(`__game.ui.showEscapeMenu();void 0`);
  await sealed('tutorial pause');
  assert(!(await js(`/Vault/.test(document.querySelector('#escape-menu').textContent)`)),'pause does not advertise Vault');
  await js(`(()=>{__game.ui.hideEscapeMenu();const w=__game.world();w.kill(w.player);})()`);
  await sealed('tutorial fall');
  // Advance the director to its actual Mu threshold; full combat pacing is
  // covered by probe_mu. This exercises its real prologue completion stamp.
  await js(`(()=>{const w=__game.world(),sc=w.scene;sc.stageIx=sc.def.stages.findIndex(s=>s.kind==='mu');sc.begun=false;sc.stageT=0;sc.state={};sc.card=null;sc.cardAck=false;sc.fadeTarget=0;w.screenFade=0;w.timeflow.releaseKind('menu');w.update(0.1);})()`);
  assert(await js(`__game.account().ledger.prologue_lived===1`),'tutorial completion is stamped');
  await sealed('first Mu arrival');
  await js(`__game.ui.showClassSelect(()=>{});void 0`);
  assert(!(await js(`/Vault/.test(document.querySelector('#class-select').textContent)`)),'class screen does not advertise Vault');
  assert(!(await js(`!!document.querySelector('#account-btn')`)),'class screen has no Vault link');
  await sealed('first class selection');
  await js(`__game.ui.showExpeditionSetup(()=>{});void 0`);
  assert(!(await js(`/Vault/.test(document.querySelector('#expedition-setup').textContent)`)),'event settings do not advertise Vault');
  await js(`__game.devStartRun('warrior');void 0`);await wait(150);
  assert(await js(`!__game.world().scene`),'selected class enters proper run');
  await sealed('first proper run');
  assert(!(await js(`/Vault/.test(__game.world().vendorTradeRefusal()||'')`)),'fresh counter hint keeps Vault undisclosed');
  // A voluntary End Run must neither reveal the Vault nor strand its button.
  await js(`__game.world().endRun();__game.step(2);void 0`);await wait(100);
  await sealed('forfeit');
  await click('#reckon-btn');await wait(100);
  assert(await js(`document.querySelector('#account-screen').classList.contains('hidden')`));
  await js(`__game.devStartRun('warrior');void 0`);await wait(100);
  await js(`(()=>{const w=__game.world();w.kill(w.player);__game.step(2);})()`);
  assert.equal(await js(`__game.account().ledger.account_deaths`),1,'actual death reveals the account gate');
  // Let the ordinary death presentation reveal and enable its onward action.
  let ready=false;
  for(let i=0;i<80;i++) {
   await js(`__game.step(8);void 0`);await wait(60);
   ready=await js(`(()=>{const b=document.querySelector('#reckon-btn');return !!b&&!b.disabled&&!document.querySelector('#death-screen').classList.contains('hidden');})()`);
   if(ready)break;
  }
  assert(ready,'actual death reaches its epilogue');
  assert.equal(await js(`__game.account().credits`),0,'fixture dies empty-handed');
  await click('#reckon-btn');await wait(150);
  assert(await js(`!document.querySelector('#account-screen').classList.contains('hidden')`),'first real death opens Vault even without essence');
  assert(await js(`!!__game.account().ledger.bounty_lesson_prompted`),'first Vault visit introduces the board');
  assert(await js(`!!document.querySelector('[data-invest="feat_bounty_board"]')`),'free board is now offered');
  await click('[data-invest="feat_bounty_board"]');
  assert(await js(`__game.account().features.has('bounty_board')`),'board can be claimed after reveal');
  await win.loadURL(server.url);await wait(1200);
  assert(await js(`!!document.querySelector('#sm-vault')`),'Vault remains available after reload');
  await click('#sm-vault');
  assert(await js(`!document.querySelector('#account-screen').classList.contains('hidden')`));
  // A reset must remove the reveal along with the account, without a UI cache.
  await js(`__game.resetAccount();void 0`);await wait(1500);
  assert(!(await js(`!!document.querySelector('#sm-vault')`)),'reset hides Vault again');
  await sealed('reset account');
  console.log('VAULT PROGRESSION UI PASS');
 } catch(e) { console.error(e);process.exitCode=1; }
 finally { win.destroy();server.server.close();app.exit(process.exitCode||0); }
});
