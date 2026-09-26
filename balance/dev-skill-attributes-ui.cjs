// Build first. Real developer toggle, hidden renderer, isolated test saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'dev-skill-attributes-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'dev-skill-attributes-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 90000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'dev-skill-attributes-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  try {
    await win.loadURL(server.url + '?dev');
    const initial = await js(`(() => {
      const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name);
      button('🔧 Dev').click();button('Gems').click();
      window.skillAttributeQA={button};
      const b=document.querySelector('[data-dev-skill-attributes]');
      return {disabled:b.disabled,pressed:b.getAttribute('aria-pressed')};
    })()`);
    assert(initial.disabled);assert.equal(initial.pressed,'false');
    const enabled = await js(`(() => {
      __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world();w.player.invulnerable=true;skillAttributeQA.button('Gems').click();
      const b=document.querySelector('[data-dev-skill-attributes]');
      const blocked=!!w.reqShortfall('firebolt'),attrs=JSON.stringify(w.meta.attrs);
      const row=[...document.querySelectorAll('[data-search]')].find(e=>e.dataset.search.startsWith('firebolt '));
      if(!row)throw Error('Firebolt dev spawn missing');row.click();
      const item=w.meta.items.find(i=>i.gem?.kind==='skill'&&i.gem.skillId==='firebolt');
      const refused=!w.learnSkill(item.uid);b.click();
      const learned=w.learnSkill(item.uid),inst=w.meta.knownSkills.get('firebolt');
      return {blocked,refused,learned,on:w.devIgnoreSkillAttributes,pressed:b.getAttribute('aria-pressed'),
        noShortfall:w.reqShortfall('firebolt')===undefined,castAllowed:w.castReqRefusal(w.player,inst)===undefined,
        unchanged:attrs===JSON.stringify(w.meta.attrs)};
    })()`);
    log(enabled);assert(enabled.blocked&&enabled.refused&&enabled.learned&&enabled.on&&enabled.noShortfall&&enabled.castAllowed&&enabled.unchanged);
    assert.equal(enabled.pressed,'true');
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir,'dev-skill-attributes-enabled.png'),(await win.webContents.capturePage()).toPNG());
    const disabled = await js(`(() => {
      document.querySelector('[data-dev-skill-attributes]').click();
      const w=__game.world(),inst=w.meta.knownSkills.get('firebolt');
      const normal=!w.devIgnoreSkillAttributes&&!!w.reqShortfall('firebolt')&&!!w.castReqRefusal(w.player,inst);
      document.querySelector('[data-dev-skill-attributes]').click();
      w.clientActionHook=()=>{};skillAttributeQA.button('Gems').click();
      const client=document.querySelector('[data-dev-skill-attributes]').disabled&&!!w.reqShortfall('firebolt');
      w.clientActionHook=undefined;__game.devStartRun('warrior');skillAttributeQA.button('Gems').click();
      const b=document.querySelector('[data-dev-skill-attributes]');
      return {normal,client,newRun:!__game.world().devIgnoreSkillAttributes,pressed:b.getAttribute('aria-pressed'),fatal:__game.crash().fatal};
    })()`);
    log(disabled);assert(disabled.normal&&disabled.client&&disabled.newRun);assert.equal(disabled.pressed,'false');assert.equal(disabled.fatal,null);
    log('PASS real Dev/Gems toggle: default off, no-run/client disabled, learning and casting bypass, unchanged stats, switch-off and new-run reset');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error => { log(error.stack??String(error));app.exit(1); });
