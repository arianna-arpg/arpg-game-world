// Summon refresh: real Wardrobe and world renderer, hidden window, disposable saves.
// Run after npm run build: npx electron balance/summons-ui.cjs
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
const bodies = [
  ['Amalgamation', 'the_amalgam', 'amalgam_horror', 'legacy_amalgam', 24],
  ['Arcane Familiar', 'bind_familiar', 'arcane_familiar', 'legacy_spirit_companions', 10],
  ['Cherub', 'summon_cherub', 'cherub', 'legacy_spirit_companions', 9],
  ['Spirit Mender', 'spirit_mender', 'mender_sprite', 'legacy_spirit_companions', 8],
  ['Raging Spirit', 'summon_raging_spirit', 'raging_spirit', 'legacy_spirit_companions', 8],
  ['Flame Sprite', 'summon_flame_sprite', 'flame_sprite', 'legacy_spirit_companions', 10],
];
fs.mkdirSync(dir, { recursive: true });
app.disableHardwareAcceleration();
app.setPath('userData', path.join(dir, `summons-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const timeout = setTimeout(() => { console.error('Summon UI timed out'); app.exit(1); }, 120000);
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `summons-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1380, height: 960, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const js = source => win.webContents.executeJavaScript(source);
  const painted = () => js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const click = async selector => { await js(`document.querySelector(${JSON.stringify(selector)}).click(); void 0`); await painted(); };
  const choose = skill => js(`(() => { const s=document.querySelector('[data-wd-skill]'); s.value=${JSON.stringify(skill)}; s.dispatchEvent(new Event('change')); })()`);
  const shot = async name => {
    for (let attempt=0;attempt<3;attempt++) {
      try { fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG()); return; }
      catch(error) { if(attempt===2)throw error; await wait(250); }
    }
  };
  const saveCanvas = async (name, expression) => {
    const data = await js(`(${expression}).toDataURL('image/png').split(',')[1]`);
    fs.writeFileSync(path.join(dir,name),Buffer.from(data,'base64'));
  };
  try {
    await win.loadURL(server.url); await wait(1200);
    await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0`);
    await js(`__game.account().ledger.prologue_lived=1; __game.ui.hideAll(); __game.devStartRun('necromancer');
      for(const skill of ${JSON.stringify(bodies.map(b=>b[1]).concat('spirit_pyre'))}) __game.account().unlockedSkills.add(skill);
      __game.ui.showWardrobe(); void 0`);
    await click('[data-wd-slot="skillSkin"]');
    await js(`window.summonSheet=document.createElement('canvas'); summonSheet.width=1320; summonSheet.height=720;
      window.summonCtx=summonSheet.getContext('2d'); summonCtx.fillStyle='#101820'; summonCtx.fillRect(0,0,1320,720);
      summonCtx.fillStyle='#ede3ce'; summonCtx.font='24px sans-serif'; summonCtx.fillText('HOLLOW WAKE  /  SUMMONS',32,40);
      summonCtx.font='14px sans-serif'; summonCtx.fillStyle='#9eacb7';
      summonCtx.fillText('Refreshed bodies · enlarged study and native gameplay scale',32,69);
      summonCtx.fillText('Legacy Wardrobe · original bodies retained',32,401); void 0`);
    for(let i=0;i<bodies.length;i++) {
      const [name,skill,,legacyId,radius] = bodies[i];
      await choose(skill);
      assert(await js(`!!document.querySelector('[data-wd-id="${legacyId}"]')`));
      await click('[data-wd-id=""]'); await wait(160);
      const native = await js("document.querySelector('.wardrobe canvas').toDataURL()");
      await js(`(() => { const c=document.querySelector('.wardrobe canvas'), x=${i*216+25}, s=${160*radius/38};
        summonCtx.drawImage(c,93,42,160,160,x,115,160,160);
        summonCtx.drawImage(c,93,42,160,160,x+(160-s)/2,321-s/2,s,s);
        summonCtx.fillStyle='#ddd7c6'; summonCtx.font='16px sans-serif'; summonCtx.fillText(${JSON.stringify(name)},x,102);
      })()`);
      await click('[data-wd-equip]');
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}].skillSkin`), null);
      await click(`[data-wd-id="${legacyId}"]`); await wait(160);
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}].skillSkin`), null, 'preview does not equip');
      const legacy = await js("document.querySelector('.wardrobe canvas').toDataURL()");
      assert(native !== legacy,`${name}: new and legacy appearances differ`);
      await js(`(() => { const c=document.querySelector('.wardrobe canvas'), x=${i*216+25}, s=${160*radius/38};
        summonCtx.drawImage(c,93,42,160,160,x,428,160,160);
        summonCtx.drawImage(c,93,42,160,160,x+(160-s)/2,653-s/2,s,s);
      })()`);
      await click('[data-wd-equip]');
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}].skillSkin`), legacyId);
      await click('[data-wd-inherit]');
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}]`), undefined);
    }
    await saveCanvas('summons-comparison.png','summonSheet');
    await choose('the_amalgam'); await click('[data-wd-id="legacy_amalgam"]'); await click('[data-wd-equip]');
    await choose('spirit_pyre'); await click('[data-wd-id="legacy_spirit_companions"]'); await click('[data-wd-equip]');
    await choose('bind_familiar'); await click('[data-wd-id=""]'); await click('[data-wd-equip]');
    await choose('the_amalgam'); await click('[data-wd-id=""]');
    await wait(200); // Let the real preview and offscreen compositor show the selected native body.
    await shot('summons-wardrobe.png');
    win.setSize(760,900); await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth <= document.querySelector('.wardrobe').clientWidth+1"));
    await shot('summons-compact.png');
    await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.the_amalgam.skillSkin'),'legacy_amalgam');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.spirit_pyre.skillSkin'),'legacy_spirit_companions');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.bind_familiar.skillSkin'),null);
    win.setSize(1380,960);
    // These are visual fixtures: cosmetic source only, never a claim on an unbound skill slot.
    await js(`__game.ui.hideAll(); __game.devStartRun('necromancer'); __game.step(180);
      const w=__game.world();
      w.zoneMap.qa_summons={id:'qa_summons',name:'Summon Study',level:1,size:{w:1600,h:1200},seed:82190,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_summons'); w.player.pos={x:800,y:700}; __game.step(180); w.actors=[w.player];
      window.summonActors=${JSON.stringify(bodies)}.map(([,skill,id,,radius],i)=>{
        const a=w.createMonster(id,1,'player',w.player);
        a.cosmeticSourceSkill=skill; a.pos={x:800+(i-2.5)*110,y:565};
        a.anchored=true; a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=-Math.PI/2; a.spawnedAt=-1; w.actors.push(a); return a;
      }); w.texts=[]; w.flashes=[]; __game.step(120); void 0`);
    const legacySkills=Object.fromEntries(bodies.map(([,skill,,id])=>[skill,{skillSkin:id}]));
    for(const [name,loadout] of [['native',{slots:{},skills:{}}],['legacy',{slots:{},skills:legacySkills}]]) {
      const frame=await js(`(() => { __game.account().cosmetics.loadout=${JSON.stringify(loadout)}; __game.step(2);
        return {bodies:summonActors.map(a=>({id:a.defId,dead:a.dead,radius:a.radius,present:__game.world().actors.includes(a)})),
          png:document.querySelector('#game').toDataURL('image/png').split(',')[1]}; })()`);
      assert(frame.bodies.every((a,i)=>!a.dead&&a.present&&a.radius===bodies[i][4]),JSON.stringify(frame.bodies));
      fs.writeFileSync(path.join(dir,`summons-world-${name}.png`),Buffer.from(frame.png,'base64'));
    }
    assert.equal(await js('!!__game.crash().fatal'),false);
    assert.deepEqual(errors,[]);
    console.log('SUMMONS UI OK: six native/legacy bodies, Amalgam and Spirit Pyre previews, choices, disk reload, compact layout and world rendering');
  } catch(error) { console.error(error,errors); try { await shot('summons-failure.png'); } catch{} process.exitCode=1; }
  finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.exit(process.exitCode||0); }
}).catch(error=>{console.error(error);app.exit(1);});
