// Build first. Hidden renderer, isolated account and saves; real Font/tree clicks.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'skill-empowerment-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'skill-empowerment-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const savesDir = path.join(dir, 'skill-empowerment-saves-' + process.pid);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1100, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const r = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (r?.qaError) throw Error(r.qaError); return r;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `skill-empowerment-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  // The start menu appears before the authoritative disk account is reconciled.
  // Wait for its three reads so test setup cannot be overwritten by that reconcile.
  const bootReady = () => js(`(async()=>{
    for(let i=0;i<100;i++) {
      const reads=performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname);
      if([0,1,2].every(slot=>reads.includes('/__save/'+slot))) {
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); return;
      }
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    throw Error('Initial disk reads did not finish');
  })()`);
  try {
    await win.loadURL(server.url);
    await bootReady();
    const start = await js(`(() => {
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(); w.loadZone('lastlight'); w.player.invulnerable=true; w.update=()=>{};
      const inst=w.meta.knownSkills.get('cleave');
      w.account.memorySecondary.add('skill:cleave'); w.account.ledger.odyssey_stage_2=1;
      for(const id of Object.keys(w.meta.baseAttrs)) w.meta.baseAttrs[id]=999;
      w.recalcSeat(w.localSeat);
      const f=w.fonts[0]; w.player.pos={...f.pos}; w.player.tier=f.tier||0;
      const copy=()=>({...inst,level:20,rarity:'legendary',granted:undefined,treeNodes:undefined,sockets:[null,null,null,null],state:undefined});
      w.grantSkillGemItem(w.localSeat,copy()); w.grantSkillGemItem(w.localSeat,copy());
      __game.ui.showFont();
      window.empowerQA={w,passive:inst.def.tree.nodes.find(n=>n.empowermentPassive).id};
      const button=document.querySelector('[data-fontmerge="cleave:legendary"]');
      return {enabled:!!button&&!button.disabled,label:button?.textContent,preview:button?.closest('.skill-entry').textContent};
    })()`); log(start); assert(start.enabled); assert.equal(start.label, 'Empower'); assert.match(start.preview, /Cleave I/);
    await capture('font');
    const merged = await js(`(() => {
      document.querySelector('[data-fontmerge="cleave:legendary"]').click();
      const {w}=empowerQA;
      const item=w.meta.items.find(i=>i.gem?.kind==='skill'&&i.gem.empowermentRank===1);
      if(!item)throw Error('No empowered result');
      const name=item.name; const learned=w.learnSkill(item.uid);
      __game.ui.closeFont(); __game.ui.openSkillTree('cleave'); __game.ui.folioSync();
      return {name,learned,title:document.querySelector('#skill-tree-cleave h2')?.textContent,treeRefusal:w.memorySecondaryRefusal('cleave'),inventoryRefusal:w.panelSealed('inventory')};
    })()`); log(merged); assert.equal(merged.name, 'Cleave I'); assert(merged.learned); assert.match(merged.title, /Cleave I/);
    const spent = await js(`(() => {
      const {w,passive}=empowerQA;
      for(let i=0;i<5;i++){
        const node=document.querySelector('#skill-tree-cleave [data-node="'+passive+'"]');
        if(!node?.classList.contains('available'))throw Error('Passive unavailable at '+i);
        node.dispatchEvent(new MouseEvent('click'));
      }
      const node=document.querySelector('#skill-tree-cleave [data-node="'+passive+'"]');
      const pane=document.querySelector('#skill-tree-cleave');
      return {count:w.meta.knownSkills.get('cleave').treeNodes.length,available:node.classList.contains('available'),text:pane.textContent,fatal:__game.crash().fatal};
    })()`); log(spent); assert.equal(spent.count, 5); assert.equal(spent.available, false); assert.match(spent.text, /5\/5/); assert.match(spent.text, /Empowerment:.*passive only/); assert.equal(spent.fatal, null);
    await capture('tree');
    const moved = await js(`(() => {
      const {w}=empowerQA; w.unlearnSkill('cleave');
      const item=w.meta.items.find(i=>i.gem?.kind==='skill'&&i.gem.empowermentRank===1);
      if(!item)throw Error('Unlearn lost empowerment');
      const count=item.gem.treeNodes.length; const learned=w.learnSkill(item.uid);
      __game.saveAccount(); __game.save();
      return {name:item.name,count,learned,fatal:__game.crash().fatal};
    })()`); log(moved); assert.equal(moved.count, 5); assert(moved.learned); assert.equal(moved.fatal, null);
    let disk = false;
    for (let i = 0; i < 100 && !disk; i++) {
      disk = fs.readdirSync(savesDir).filter(name => name.endsWith('.json')).some(name => {
        try { const row = JSON.parse(fs.readFileSync(path.join(savesDir, name), 'utf8')).knownSkills?.find(s => s.skillId === 'cleave');
          return row?.empowermentRank === 1 && row.treeNodes?.length === 5;
        } catch { return false; }
      });
      if (!disk) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert(disk, 'empowerment and expanded allocations reached the isolated disk save');
    const loaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    win.reload(); await loaded;
    await bootReady();
    const restored = await js(`(() => {
      const button=document.querySelector('#sm-continue');
      if(!button||button.disabled)throw Error('No saved run to resume'); button.click();
      const inst=__game.world().meta.knownSkills.get('cleave');
      return {rank:inst?.empowermentRank,nodes:inst?.treeNodes?.length,fatal:__game.crash().fatal};
    })()`); log(restored); assert.equal(restored.rank,1); assert.equal(restored.nodes,5); assert.equal(restored.fatal,null);
    log('PASS: real Font merge, Roman name, real passive clicks beyond cap, inventory moves, disk save and reload');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{log(error.stack??String(error)); app.exit(1);});
