// Real Wardrobe/body renderer, disposable saves, hidden window. Run after build.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
app.disableHardwareAcceleration();
app.setPath('userData', path.join(dir, `golems-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `golems-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 960, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const js = source => win.webContents.executeJavaScript(source);
  const painted = () => js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const click = async selector => { await js(`document.querySelector(${JSON.stringify(selector)}).click(); void 0`); await painted(); };
  const shot = async name => {
    // Resizing an offscreen surface can briefly discard its compositor frame.
    for (let attempt=0;attempt<3;attempt++) {
      try { fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG()); return; }
      catch(error) { if(attempt===2)throw error; await wait(250); }
    }
  };
  const choose = skill => js(`(() => { const s=document.querySelector('[data-wd-skill]'); s.value=${JSON.stringify(skill)}; s.dispatchEvent(new Event('change')); })()`);
  try {
    await win.loadURL(server.url); await wait(1200);
    await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0`);
    await js(`__game.account().ledger.prologue_lived=1; __game.ui.hideAll(); __game.devStartRun('necromancer');
      for(const type of ['stone','fire','ice','blood','bone']) __game.account().unlockedSkills.add('summon_'+type+'_golem');
      __game.ui.showWardrobe(); void 0`);
    await click('[data-wd-slot="skillSkin"]');
    await click('[data-wd-id="legacy_golems"]');
    assert(await js("!!document.querySelector('[data-wd-summon=legacy_golems]')"));
    assert.equal(await js('__game.account().cosmetics.loadout.slots.skillSkin'), undefined, 'preview does not equip');
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.skillSkin'), 'legacy_golems');
    assert.equal(await js("document.querySelector('[data-wd-equip]').textContent"), 'Equipped', 'restricted account default is visibly equipped');
    // The contact sheet samples the live Wardrobe canvas, which uses the world baker.
    await js(`window.golemSheet=document.createElement('canvas'); golemSheet.width=1100; golemSheet.height=700;
      window.golemCtx=golemSheet.getContext('2d'); golemCtx.fillStyle='#101820'; golemCtx.fillRect(0,0,1100,700);
      golemCtx.fillStyle='#ede3ce'; golemCtx.font='24px sans-serif'; golemCtx.fillText('HOLLOW WAKE  /  GOLEMS',32,40);
      golemCtx.font='14px sans-serif'; golemCtx.fillStyle='#9eacb7';
      golemCtx.fillText('New material bodies · enlarged study and gameplay scale',32,69);
      golemCtx.fillText('Legacy Wardrobe · original bodies retained',32,393); void 0`);
    const types = ['stone','fire','ice','blood','bone'];
    for (let i=0;i<types.length;i++) {
      const type=types[i], skill=`summon_${type}_golem`;
      await choose(skill);
      await click('[data-wd-id=""]'); await wait(130);
      const native = await js("document.querySelector('.wardrobe canvas').toDataURL()");
      await js(`(() => { const c=document.querySelector('.wardrobe canvas'), x=${i*215+30};
        golemCtx.drawImage(c,102,50,144,144,x,109,144,144);
        golemCtx.drawImage(c,102,50,144,144,x+45,265,66,66);
        golemCtx.fillStyle='#ddd7c6'; golemCtx.font='16px sans-serif'; golemCtx.fillText(${JSON.stringify(type.toUpperCase())},x+35,99);
      })()`);
      await click('[data-wd-equip]');
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}].skillSkin`), null);
      await click('[data-wd-id="legacy_golems"]'); await wait(130);
      const legacy = await js("document.querySelector('.wardrobe canvas').toDataURL()");
      assert(native !== legacy, `${type} legacy and material bodies differ`);
      await js(`(() => { const c=document.querySelector('.wardrobe canvas'), x=${i*215+30};
        golemCtx.drawImage(c,102,50,144,144,x,423,144,144);
        golemCtx.drawImage(c,102,50,144,144,x+45,579,66,66);
      })()`);
      await click('[data-wd-inherit]');
      assert.equal(await js(`__game.account().cosmetics.loadout.skills[${JSON.stringify(skill)}]`), undefined);
    }
    const png = await js("golemSheet.toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(dir, 'golems-comparison.png'), Buffer.from(png,'base64'));
    await choose('summon_fire_golem'); await click('[data-wd-id=""]'); await click('[data-wd-equip]');
    await choose('summon_bone_golem'); await click('[data-wd-id="legacy_golems"]'); await click('[data-wd-equip]');
    await shot('golems-wardrobe.png');
    win.setSize(760,900); await wait(180);
    assert(await js("document.querySelector('.wardrobe').scrollWidth <= document.querySelector('.wardrobe').clientWidth+1"));
    await shot('golems-compact.png');
    await wait(250); await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.slots.skillSkin'), 'legacy_golems');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_fire_golem.skillSkin'), null);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_bone_golem.skillSkin'), 'legacy_golems');
    // Render five owned display fixtures with resolved skin attribution. Gameplay
    // contracts are exercised in the probe; fixtures must not claim unbound slots.
    win.setSize(1280,960);
    await js(`__game.ui.hideAll(); __game.devStartRun('necromancer'); __game.step(180);
      const w=__game.world();
      w.zoneMap.qa_golems={id:'qa_golems',name:'Golem Study',level:1,size:{w:1600,h:1200},seed:72190,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_golems'); w.player.pos={x:800,y:700}; __game.step(180); w.actors=[w.player];
      window.golemActors=['stone','fire','ice','blood','bone'].map((type,i)=>{
        const w=__game.world(), a=w.createMonster(type+'_golem',1,'player',w.player);
        a.cosmeticSourceSkill='summon_'+type+'_golem'; a.pos={x:800+(i-2)*105,y:565};
        a.anchored=true; a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=-Math.PI/2; a.spawnedAt=-1; w.actors.push(a); return a;
      }); w.texts=[]; w.flashes=[]; __game.step(120); void 0`);
    for (const [name, loadout] of [['native',{slots:{},skills:{}}], ['legacy',{slots:{skillSkin:'legacy_golems'},skills:{}}]]) {
      const frame = await js(`(() => { __game.account().cosmetics.loadout=${JSON.stringify(loadout)}; __game.step(2);
        return { bodies:golemActors.map(a=>({id:a.defId,dead:a.dead,radius:a.radius,present:__game.world().actors.includes(a)})),
          png:document.querySelector('#game').toDataURL('image/png').split(',')[1] };
      })()`);
      assert(frame.bodies.every(a=>!a.dead&&a.present&&a.radius>0),JSON.stringify(frame.bodies));
      fs.writeFileSync(path.join(dir,`golems-world-${name}.png`),Buffer.from(frame.png,'base64'));
    }
    assert.equal(await js('!!__game.crash().fatal'), false);
    assert.deepEqual(errors, []);
    console.log('GOLEMS UI OK: five native/legacy bodies, previews, default/per-skill choices, disk reload, compact layout, world rendering');
  } catch(error) { console.error(error,errors); await shot('golems-failure.png'); process.exitCode=1; }
  finally { win.destroy(); server.server.close(); app.exit(process.exitCode||0); }
}).catch(error=>{console.error(error);app.exit(1);});
