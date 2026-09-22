// Build first. Real renderer/input, hidden window, isolated save directory.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'brandt-progression-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'brandt-progression-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'brandt-progression-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `brandt-progression-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    await js(`(() => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world();w.loadZone('lastlight');w.player.invulnerable=true;
      const smith=w.actors.find(a=>a.defId==='townsfolk_smith');
      const q=window.brandtQA={w,smith,home:{x:smith.pos.x+10,y:smith.pos.y}};
      q.box=()=>{const r=document.getElementById('npc-dialogue');return {open:!r.hidden,name:r.querySelector('h2').textContent,text:r.querySelector('.dialogue-accessible').textContent,
        vendor:__game.ui.vendorOpen,inventory:__game.ui.inventoryOpen,look:q.smith.look,stock:w.vendorStock.map(e=>e.kind==='item'?{rarity:e.item.rarity,base:e.item.baseId}:e.kind)};};
      q.run=(n,pos)=>{for(let i=0;i<n;i++){if(pos)w.player.pos={...pos};w.player.tier=0;w.mireilleCd=999;__game.step(1);}return q.box();};
      q.reveal=()=>document.querySelector('.dialogue-next').click();
      return q.run(100,q.home);
    })()`);
    let box=await js('brandtQA.box()');log({stage:'starter',...box});
    assert.equal(box.open,true);assert.match(box.text,/hammer/);assert.equal(box.look,'npc_smith_unarmed');
    assert.equal(box.vendor,true);assert.equal(box.inventory,true);
    assert.ok(box.stock.length && box.stock.every(e=>e.rarity==='common'&&!e.base.includes('memory')));
    await js('brandtQA.reveal()');await capture('starter');
    // The player's close gesture leaves the shop and selling inventory available.
    box=await js('document.querySelector(".dialogue-close").click();brandtQA.run(2,brandtQA.home)');
    assert.equal(box.open,false);assert.equal(box.vendor,true);assert.equal(box.inventory,true);
    await capture('shop');
    const board=await js(`(() => {
      const q=brandtQA,w=q.w;__game.ui.hideAll();w.account.features.add('bounty_board');w.account.ledger.mireille_flasks_filled=1;
      w.loadZone('lastlight');q.smith=w.actors.find(a=>a.defId==='townsfolk_smith');q.home={x:q.smith.pos.x+10,y:q.smith.pos.y};
      q.board=w.boardIntroduction()[0];if(!q.board)throw Error('No introductory board');
      const far={x:q.board.pos.x+750,y:q.board.pos.y};q.run(4,far);
      return {intro:w.boardIntroduction().length,board:q.board,position:w.player.pos};
    })()`);assert.equal(board.intro,1);log({stage:'board-chevron',...board});await capture('board-chevron');
    await js('brandtQA.run(3,{x:brandtQA.board.pos.x+220,y:brandtQA.board.pos.y})');await capture('board-glow');
    await js('brandtQA.run(90,brandtQA.board.pos)');
    assert.equal(await js('__game.ui.bountiesOpen'),true,'dwelling still opens the board');
    const accepted=await js(`(() => {const w=brandtQA.w,v=w.bountyBoardView(),o=v.offers[0];if(!o)throw Error('No board offers');
      return {ok:w.acceptBounty(o.id),receipt:w.account.ledger.bounty_board_introduced,intro:w.boardIntroduction().length};})()`);
    assert.equal(accepted.ok,true);assert.equal(accepted.receipt,1);assert.equal(accepted.intro,0);
    box=await js('__game.ui.hideAll();brandtQA.run(3,{x:brandtQA.home.x+400,y:brandtQA.home.y});brandtQA.run(90,brandtQA.home)');
    assert.match(box.text,/hammer|writ/i);await js('brandtQA.reveal()');await capture('writ-hint');
    box=await js(`(() => {const q=brandtQA;__game.ui.hideAll();q.run(3,{x:q.home.x+400,y:q.home.y});
      q.w.account.features.add('brandt_magic_wares');q.w.restockVendor();return q.run(90,q.home);})()`);
    assert.match(box.text,/writs|magic/i);assert.equal(box.look,'npc_smith_unarmed');
    await js('brandtQA.reveal()');await capture('magic-wares');
    box=await js(`(() => {const q=brandtQA;__game.ui.hideAll();q.run(3,{x:q.home.x+400,y:q.home.y});
      q.w.account.ledger['quest_done:brandt_hammer']=1;return q.run(90,q.home);})()`);
    assert.equal(box.look,'npc_smith');await js('brandtQA.reveal()');await capture('hammer-returned');
    assert.equal(await js('__game.crash().fatal'),null);
    log('PASS: introductory dialogue and selling UI, white shelves, board chevron/glow, real board acceptance, magic-ware dialogue and quest appearance');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
