// Build first. Real renderer/input, hidden window, isolated save directory.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'town-welcome-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'town-welcome-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'town-welcome-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `town-welcome-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    await js(`(() => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      __game.settings().speechTyping=false;
      const w=__game.world();w.loadZone('lastlight');w.player.invulnerable=true;
      const exit=w.exits.find(e=>e.to==='crossroads');if(!exit)throw Error('No Crossroads exit');
      const center={x:w.arena.w/2,y:w.arena.h/2}, dx=center.x-exit.pos.x,dy=center.y-exit.pos.y,len=Math.hypot(dx,dy);
      const q=window.townQA={w,exit,point:d=>({x:exit.pos.x+dx/len*d,y:exit.pos.y+dy/len*d})};
      q.box=()=>{const r=document.getElementById('npc-dialogue');return {open:!r.hidden,name:r.querySelector('h2').textContent,text:r.querySelector('.dialogue-accessible').textContent,zone:w.zone.id,blocking:__game.ui.uiBlocking(),vendor:__game.ui.vendorOpen};};
      q.run=(n,pos)=>{for(let i=0;i<n;i++){if(pos)w.player.pos={...pos};w.player.tier=0;w.mireilleCd=999;__game.step(1);}return q.box();};
      q.key=key=>{window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key,bubbles:true}));__game.step(1);window.dispatchEvent(new KeyboardEvent('keyup',{key,code:key,bubbles:true}));return q.box();};
      q.run(3,q.point(410));
    })()`);
    let box = await js('townQA.run(3,townQA.point(230))'); log({ stage: 'road', ...box });
    assert.equal(box.open, true); assert.match(box.name, /Mireille/); assert.equal(box.blocking, false);
    await js('document.querySelector(".dialogue-next").click()'); await capture('mireille');
    box = await js('townQA.key("Escape")'); assert.equal(box.open, false);
    box = await js('townQA.run(3,townQA.point(230))'); assert.equal(box.open, false);
    // Re-arm the fixture to test departure while the invitation is still open.
    box = await js('delete townQA.w.ledger["dialogue_seen:mireille_road_welcome"];townQA.w.npcDialogues.leaveZone();townQA.run(3,townQA.point(410));townQA.run(3,townQA.point(230))');
    assert.equal(box.open, true);
    // Trigger the ordinary exit by actually stepping inside its travel radius.
    box = await js(`(() => {for(let i=0;i<240 && townQA.w.zone.id==='lastlight';i++)townQA.run(1,townQA.exit.pos);return townQA.box();})()`);
    assert.equal(box.zone, 'crossroads', 'ignoring the invitation leaves travel available');
    assert.equal(box.open, false, 'town invitation ends on departure');
    box = await js(`(() => {
      const q=townQA,w=q.w;w.loadZone('lastlight');__game.ui.hideAll();
      q.smith=w.actors.find(a=>a.defId==='townsfolk_smith');if(!q.smith)throw Error('Brandt missing');
      for(const r of [60,90,120])for(let i=0;i<16;i++){
        w.player.pos={x:q.smith.pos.x+Math.cos(i*Math.PI/8)*r,y:q.smith.pos.y+Math.sin(i*Math.PI/8)*r};
        if(!q.home && w.nearSmith())q.home={...w.player.pos};
      }
      if(!q.home)throw Error('No reachable smith counter');
      return q.run(100,q.home);
    })()`); log({ stage: 'brandt', ...box });
    log(await js('({player:townQA.w.player.pos,smith:townQA.smith.pos,tier:townQA.smith.tier,candidates:townQA.w.speechCandidates(townQA.w.localSeat).map(c=>({id:c.id,text:c.text})),focus:townQA.w.speechFocusTarget(),scene:townQA.w.scene,near:townQA.w.nearSmith()})'));
    assert.equal(box.open, true); assert.match(box.name, /Brandt/); assert.match(box.text, /hammer/);
    await js('document.querySelector(".dialogue-next").click()'); await capture('brandt');
    // A menu may be opened explicitly even on a fresh account with no stock.
    box = await js('__game.ui.showVendor();townQA.run(2,townQA.home)');
    assert.equal(box.vendor, true); assert.equal(box.open, true, 'shop does not hide the greeting');
    await capture('brandt-shop');
    box = await js('townQA.key("Escape")'); assert.equal(box.open, false);
    await js('__game.ui.hideAll();townQA.run(3,{x:townQA.home.x+400,y:townQA.home.y});townQA.w.account.ledger.odyssey_stage_1=1;');
    box = await js('townQA.run(80,townQA.home)'); log({ stage: 'progression', ...box });
    assert.equal(box.open, true); assert.match(box.text, /roads|quieter/);
    const provision = await js(`(() => {
      __game.account().ledger.mireille_flasks_filled=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
      const w=__game.world();return ['life_flask','mana_flask'].map(id=>{
        const inst=w.player.skills.find(s=>s?.def.id===id);return {id,seated:!!inst,charges:inst&&w.player.charges.get(inst.def.chargeCost.charge),cap:inst&&w.player.chargeCapFor(inst.def.chargeCost.charge,inst)};
      });
    })()`);
    for(const f of provision){assert.ok(f.seated);assert.equal(f.charges,f.cap);}
    log({stage:'fresh-veteran',provision});
    assert.equal(await js('__game.crash().fatal'), null);
    log('PASS: optional road portrait, Escape, real exit travel, Brandt greeting, shop coexistence, progression');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
