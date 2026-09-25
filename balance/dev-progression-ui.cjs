// Build first. Real developer buttons, isolated saves, hidden Electron renderer.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'dev-progression-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'dev-progression-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 150000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'dev-progression-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `dev-progression-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url + '?dev');
    await js(`(() => {
      const button = name => [...document.querySelectorAll('button')].find(b => b.textContent === name);
      button('🔧 Dev').click();button('Progression').click();
      if([...document.querySelectorAll('[data-progression-grant]')].some(b=>!b.disabled))throw Error('Grant enabled before a run');
      __game.account().ledger.prologue_lived=1;__game.account().ledger['tutorial_faction:goblin']=1;
      __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.player.invulnerable=true;
      __game.step(2);button('Progression').click();
      const skill=[...w.meta.knownSkills.values()].find(i=>i.def.tree).def.id;
      window.progressionQA={button,skill};
      if(!w.memorySecondaryRefusal(skill))throw Error('Fresh skill tree already open');
      if(w.account.features.has('reliquary'))throw Error('Fresh Reliquary already open');
      __game.ui.showEscapeMenu();button('Core access + learned trees').click();
      if(w.memorySecondaryRefusal(skill))throw Error('Core action did not open the skill tree');
      if(!w.account.features.has('reliquary')||!w.account.ledger.oracle_rescued)throw Error('Rescue access missing');
      if(w.account.credits!==0)throw Error('Action fabricated currency');
      button('Core access + learned trees').click();
      const filter=document.querySelector('[aria-label="Filter progression"]');filter.value='Reliquary';filter.dispatchEvent(new Event('input'));
      document.querySelector('[data-progression-grant="container:reliquary:4"]').click();
      document.querySelector('[data-progression-grant="reliquary:attunement"]').click();
      if(!w.account.features.has('reliquary_case')||!w.account.ledger.oracle_reliquary_attuned)throw Error('Reliquary grants missing');
      const panel=document.querySelector('[data-dev-progression]').parentElement;
      const r=panel.getBoundingClientRect();if(r.right>innerWidth||r.top<0||panel.scrollWidth>panel.clientWidth+2)throw Error('Dev panel overflow');
      return {skill,receipt:w.account.ledger['dev_progression:power:awakening'],rows:document.querySelectorAll('[data-progression-grant]').length};
    })()`).then(log);
    await capture('controls');
    await js(`(() => {
      const {button,skill}=progressionQA;button('🔧 Dev').click();__game.ui.hideEscapeMenu();const w=__game.world();w.loadZone('lastlight');
      if(!w.actors.some(a=>a.defId==='townsfolk_oracle'))throw Error('Oracle did not settle on return');
      __game.ui.toggleInventory();
      if(!document.querySelector('[data-containerflap="reliquary"]'))throw Error('Reliquary drawer missing');
      __game.ui.openSkillTree(skill);
      if(document.getElementById('skill-tree-'+skill)?.classList.contains('hidden')!==false)throw Error('Skill tree panel missing');
      return {fatal:__game.crash().fatal};
    })()`).then(result => assert.equal(result.fatal, null));
    await capture('tree');
    // No explicit save call: the actual developer action must persist even paused.
    await js(`(async()=>{for(let i=0;i<80;i++){const a=await fetch('/__save/0').then(r=>r.json());if(a.ledger?.oracle_reliquary_attuned&&a.features.includes('reliquary_case'))return;await new Promise(r=>setTimeout(r,50));}throw Error('Developer account save did not settle');})()`);
    await win.loadURL(server.url + '?dev');
    const reload = await js(`(() => {
      const a=__game.account();__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();
      const skill=[...w.meta.knownSkills.values()].find(i=>i.def.tree).def.id;
      return {rescue:a.ledger.oracle_rescued,fullCase:a.features.has('reliquary_case'),tree:w.memorySecondaryRefusal(skill),
        receipt:a.ledger['dev_progression:power:awakening'],fatal:__game.crash().fatal};
    })()`);
    assert.equal(reload.rescue,1); assert.equal(reload.fullCase,true); assert.equal(reload.tree,null);
    assert.equal(reload.receipt,1); assert.equal(reload.fatal,null); log(reload);
    log('PASS: fresh-account Dev clicks, filtering, wrapped tabs, real skill tree/Relic UI, residency and paused-action disk persistence across reload');
  } catch(error) { await capture('failure'); throw error; }
  finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
