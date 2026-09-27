// Hidden real Wardrobe/world; disposable profiles and saves. Run after building.
const { app, BrowserWindow } = require('electron');
const path=require('node:path'), fs=require('node:fs'), assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const bodies=[['Sentinel','skeletal_sentinel',15,'summon_skeleton'],['Duelist','skeletal_duelist',12,'summon_skeleton'],
  ['Stitched Abomination','court_abomination',26,'raise_dead'],['Frenzied Ember','court_ember',8,'summon_raging_spirit'],
  ['Vigil Flame','court_vigil_flame',12,'summon_raging_spirit'],['Hexwoven Shade','court_hex_wraith',12,'summon_wraith'],
  ['Soul Reaver','court_reaper_wraith',13,'summon_wraith']];
app.disableHardwareAcceleration();app.setPath('userData',path.join(dir,`courts-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Undead courts UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`courts-saves-${process.pid}`)});
  const win=new BrowserWindow({show:false,width:1400,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message)});
  const js=s=>win.webContents.executeJavaScript(s);
  const painted=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const click=async s=>{await js(`document.querySelector(${JSON.stringify(s)}).click();void 0`);await painted()};
  const choose=async(s,v)=>{await js(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change'))})()`);await painted()};
  const shot=async name=>{await painted();fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG())};
  try {
    await win.loadURL(server.url);await wait(1200);
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('necromancer');
      for(const id of ['summon_skeleton','raise_dead','summon_raging_spirit','spirit_pyre','summon_wraith','summon_stone_golem'])__game.account().unlockedSkills.add(id);
      __game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');
    const before=await js('JSON.stringify(__game.account().cosmetics)');
    await js(`window.courtSheet=document.createElement('canvas');courtSheet.width=1440;courtSheet.height=720;
      window.courtCtx=courtSheet.getContext('2d');courtCtx.fillStyle='#101820';courtCtx.fillRect(0,0,1440,720);
      courtCtx.fillStyle='#ede3ce';courtCtx.font='24px sans-serif';courtCtx.fillText('HOLLOW WAKE  /  THE UNDEAD COURTS',30,40);
      courtCtx.fillStyle='#9eacb7';courtCtx.font='14px sans-serif';courtCtx.fillText('Refreshed bodies · enlarged and relative-size studies',30,68);
      courtCtx.fillText('Legacy Wardrobe · preserved original bodies',30,399);void 0`);
    for(let i=0;i<bodies.length;i++) {
      const [name,id,radius,skill]=bodies[i];await choose('[data-wd-skill]',skill);await choose('[data-wd-body]',id);
      for(const [row,skin] of [[0,''],[1,'legacy_undead_courts']]) {
        await click(`[data-wd-id="${skin}"]`);
        assert.equal(await js("document.querySelector('[data-wd-body]').value"),id);
        await js(`(()=>{const c=document.querySelector('.wardrobe canvas'),x=${i*201+20},s=${180*radius/38},row=${row};
          courtCtx.drawImage(c,83,32,180,180,x,110+row*310,180,180);
          courtCtx.drawImage(c,83,32,180,180,x+(180-s)/2,332+row*320-s/2,s,s);
          if(!row){courtCtx.fillStyle='#ddd7c6';courtCtx.font='15px sans-serif';courtCtx.fillText(${JSON.stringify(name)},x+5,98)}
        })()`);
      }
    }
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before,'browsing forms and skins only previews');
    fs.writeFileSync(path.join(dir,'undead-courts-comparison.png'),Buffer.from(await js("courtSheet.toDataURL().split(',')[1]"),'base64'));
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_wraith.skillSkin'),'legacy_undead_courts');
    await click('[data-wd-id=""]');await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_wraith.skillSkin'),null);
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_wraith'),undefined);
    for(const skill of ['summon_skeleton','raise_dead','summon_raging_spirit','spirit_pyre','summon_wraith']) {
      await choose('[data-wd-skill]',skill);await click('[data-wd-id="legacy_undead_courts"]');await click('[data-wd-equip]');
      if(skill==='spirit_pyre')assert((await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)")).includes('court_ember'));
    }
    await choose('[data-wd-skill]','summon_stone_golem');
    assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_undead_courts]')"),false);
    await choose('[data-wd-skill]','summon_skeleton');await choose('[data-wd-body]','skeletal_sentinel');await click('[data-wd-id=""]');
    await shot('undead-courts-wardrobe.png');win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));
    await shot('undead-courts-compact.png');await win.reload();await wait(1200);
    for(const skill of ['summon_skeleton','raise_dead','summon_raging_spirit','spirit_pyre','summon_wraith'])
      assert.equal(await js(`__game.account().cosmetics.loadout.skills.${skill}.skillSkin`),'legacy_undead_courts');
    win.setSize(1400,960);
    await js(`__game.ui.hideAll();__game.devStartRun('necromancer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_courts={id:'qa_courts',name:'Undead Courts',level:1,size:{w:1800,h:1200},seed:71382,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_courts');w.player.pos={x:900,y:700};__game.step(180);w.actors=[w.player];
      window.courtActors=${JSON.stringify(bodies)}.map(([,id,,skill],i)=>{const a=w.createMonster(id,1,'player',w.player);
        a.cosmeticSourceSkill=skill;a.pos={x:900+(i-3)*100,y:565};a.anchored=true;
        a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=-Math.PI/2;a.spawnedAt=-1;w.actors.push(a);return a});__game.step(120);void 0`);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_undead_courts'}]]) {
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:courtActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius})),
          png:document.querySelector('#game').toDataURL().split(',')[1]}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===bodies[i][2]));
      fs.writeFileSync(path.join(dir,`undead-courts-world-${name}.png`),Buffer.from(frame.png,'base64'));
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('UNDEAD COURTS UI OK: seven forms, native/legacy art, five source skills, preview-only browsing, saved overrides, compact layout and world rendering');
  } catch(error) {console.error(error,errors);try{await shot('undead-courts-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
