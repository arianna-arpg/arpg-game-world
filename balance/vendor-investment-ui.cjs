// Build first. Hidden renderer and isolated saves; never touches the player's run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'vendor-investment-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'vendor-investment-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'vendor-investment-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `vendor-investment-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    const ready = await js(`(() => {
      const a=__game.account();a.ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();
      for(const flag of ['brandt_magic_wares','brandt_rare_wares','vendor_gems','brandt_extra_gems','brandt_fast_restock','bounty_board','vendor_lock_1','vendor_lock_2','vendor_lock_3'])a.features.add(flag);
      for(let i=2;i<=10;i++){a.features.add('vendor_wares_'+i);a.features.add('vendor_restock_'+i);}
      for(let i=1;i<=5;i++)a.features.add('vendor_quality_'+i);
      const w=__game.world();w.loadZone('lastlight');w.player.invulnerable=true;w.player.level=20;
      const smith=w.actors.find(x=>x.defId==='townsfolk_smith');w.player.pos={...smith.pos};w.player.tier=smith.tier||0;
      for(const id of Object.keys(w.meta.essences))w.meta.essences[id]=100000;
      w.restockVendor();__game.ui.showVendor();window.vendorQA={w};
      const pack=w.vendorGridPack(w.vendorStock);
      return {pages:pack.pages,stock:w.vendorStock.length,buttons:document.querySelectorAll('[data-vpage]').length,
        headline:document.querySelector('[data-vheadline="brandt"]').textContent};
    })()`); log(ready); assert(ready.pages > 1); assert.equal(ready.stock,54); assert.equal(ready.buttons,2);
    assert(ready.headline.includes('10 curated')); await capture('page-one');
    const page = await js(`(() => {
      document.querySelector('[data-vpage="brandt:1"]').click();
      const w=vendorQA.w,pack=w.vendorGridPack(w.vendorStock);
      const tiles=[...document.querySelectorAll('[data-vware^="brandt:"]')];
      if(!tiles.length)throw Error('No second-page equipment');
      for(const tile of tiles){const i=Number(tile.dataset.vware.split(':')[1]);if(pack.cells.get(w.vendorStock[i].item.uid).page!==1)throw Error('Mixed pages');}
      const tile=tiles.find(t=>t.hasAttribute('data-vbuy'));if(!tile)throw Error('No buyable tile');
      const i=Number(tile.dataset.vware.split(':')[1]);vendorQA.buyUid=w.vendorStock[i].item.uid;
      tile.click();return {uid:vendorQA.buyUid,pageCount:tiles.length};
    })()`); log(page);
    const purchase = await js(`new Promise(resolve=>requestAnimationFrame(()=>{
      const w=vendorQA.w;resolve({owned:w.meta.items.some(i=>i.uid===vendorQA.buyUid),
        onShelf:w.vendorStock.some(e=>e.kind==='item'&&e.item.uid===vendorQA.buyUid)});
    }))`); log(purchase);assert(purchase.owned);assert(!purchase.onShelf);await capture('page-two');
    const reservation = await js(`(() => {
      const w=vendorQA.w;const pack=w.vendorGridPack(w.vendorStock);
      const i=w.vendorStock.findIndex(e=>e.kind==='item'&&!e.item.mem&&pack.cells.get(e.item.uid).page>0);
      if(!w.setVendorLock('brandt',i,true))throw Error('Reservation refused');
      const snapshot=JSON.stringify(w.vendorStock[i].item);w.time+=300;w.restockVendor();
      const state=w.serializeWorldState();w.adoptWorldState(state);w.loadZone('lastlight');
      const row=w.vendorHolds.brandt.locks[0];return {same:JSON.stringify(row.entry.item)===snapshot,locks:w.vendorLockCap()};
    })()`);log(reservation);assert(reservation.same);assert.equal(reservation.locks,3);
    const bounty = await js(`(() => {
      const w=vendorQA.w;__game.ui.hideAll();w.player.level=1;w.loadZone('crossroads');w.loadZone('lastlight');
      w.time=Math.ceil(w.time/1200)*1200;w.completedObjectives.delete('crossroads');w.armBountyBoard();
      const board=w.bountyBoardsHere()[0];w.player.pos={...board.pos};__game.ui.showBounties();
      return {offers:w.bountyOffers.map(p=>p.pay),text:__game.ui.bountyMenu?.textContent,
        buttons:document.querySelectorAll('[data-bounty-accept]').length,fatal:__game.crash().fatal};
    })()`);log(bounty);assert(bounty.offers.some(p=>p.craft&&p.essence?.length));assert(bounty.offers.some(p=>!p.craft&&p.essence?.length));
    assert.equal(bounty.buttons,2);assert.equal(bounty.fatal,null);await capture('bounty-choices');
    log('PASS: page navigation, later-page purchase, reservation reload, curated header and mixed bounty choices');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
