// Skeletal mage visuals: hidden real Wardrobe/world, disposable profiles and saves.
// Run after building: npx electron balance/skeletal-mages-ui.cjs
const { app, BrowserWindow } = require('electron');
const path=require('node:path'), fs=require('node:fs'), assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const bodies=[['Pyromancer','skeletal_pyromancer',12],['Cryomancer','skeletal_cryomancer',12],
  ['Stormcaller','skeletal_stormcaller',12],['Venomancer','skeletal_venomancer',12],['Ossuary Lich','ossuary_lich',21]];
app.disableHardwareAcceleration(); app.setPath('userData',path.join(dir,`mages-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Skeletal mage UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`mages-saves-${process.pid}`)});
  const win=new BrowserWindow({show:false,width:1280,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[]; win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message)});
  const js=s=>win.webContents.executeJavaScript(s);
  const painted=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const click=async s=>{await js(`document.querySelector(${JSON.stringify(s)}).click(); void 0`);await painted()};
  const choose=async(s,v)=>{await js(`(()=>{const e=document.querySelector(${JSON.stringify(s)}); e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change'))})()`);await painted()};
  const shot=async name=>{await painted();fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG())};
  try {
    await win.loadURL(server.url);await wait(1200);
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('necromancer');
      for(const id of ['summon_skeleton_mage','summon_skeleton_archer','summon_stone_golem'])__game.account().unlockedSkills.add(id);
      __game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');await choose('[data-wd-skill]','summon_skeleton_mage');
    assert.deepEqual(await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)"),bodies.map(b=>b[1]));
    const before=await js('JSON.stringify(__game.account().cosmetics)');
    await js(`window.mageSheet=document.createElement('canvas');mageSheet.width=1200;mageSheet.height=720;
      window.mageCtx=mageSheet.getContext('2d');mageCtx.fillStyle='#101820';mageCtx.fillRect(0,0,1200,720);
      mageCtx.fillStyle='#ede3ce';mageCtx.font='24px sans-serif';mageCtx.fillText('HOLLOW WAKE  /  THE SKELETAL SCHOOLS',30,40);
      mageCtx.fillStyle='#9eacb7';mageCtx.font='14px sans-serif';mageCtx.fillText('Refreshed bodies · enlarged and relative-size studies',30,68);
      mageCtx.fillText('Legacy Wardrobe · original crowned lich bodies',30,399);void 0`);
    for(let i=0;i<bodies.length;i++) {
      const [name,id,radius]=bodies[i]; await choose('[data-wd-body]',id);
      for(const [row,skin] of [[0,''],[1,'legacy_skeletal_mages']]) {
        await click(`[data-wd-id="${skin}"]`);
        assert.equal(await js("document.querySelector('[data-wd-body]').value"),id,'skin selection retains preview form');
        await js(`(()=>{const c=document.querySelector('.wardrobe canvas'),x=${i*235+24},s=${180*radius/38},row=${row};
          mageCtx.drawImage(c,83,32,180,180,x,110+row*310,180,180);
          mageCtx.drawImage(c,83,32,180,180,x+(180-s)/2,332+row*320-s/2,s,s);
          if(!row){mageCtx.fillStyle='#ddd7c6';mageCtx.font='16px sans-serif';mageCtx.fillText(${JSON.stringify(name)},x+10,98)}
        })()`);
      }
    }
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before,'browsing forms/skins spends nothing and changes no equipment');
    fs.writeFileSync(path.join(dir,'skeletal-mages-comparison.png'),Buffer.from(await js("mageSheet.toDataURL().split(',')[1]"),'base64'));
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_skeleton_mage.skillSkin'),'legacy_skeletal_mages');
    await click('[data-wd-id=""]');await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_skeleton_mage.skillSkin'),null);
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.summon_skeleton_mage'),undefined);
    await click('[data-wd-id="legacy_skeletal_mages"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','summon_skeleton_archer');
    assert.deepEqual(await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)"),['skeleton_archer',...bodies.slice(0,4).map(b=>b[1])]);
    await choose('[data-wd-body]','skeletal_venomancer');await click('[data-wd-id="legacy_skeletal_mages"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','summon_stone_golem');
    assert.equal(await js("!!document.querySelector('[data-wd-body]')"),false,'single-body skill has no redundant picker');
    assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_skeletal_mages]')"),false,'incompatible skin is absent');
    await choose('[data-wd-skill]','summon_skeleton_mage');await choose('[data-wd-body]','ossuary_lich');await click('[data-wd-id=""]');
    await shot('skeletal-mages-wardrobe.png');win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));
    await shot('skeletal-mages-compact.png');await win.reload();await wait(1200);
    for(const skill of ['summon_skeleton_mage','summon_skeleton_archer'])assert.equal(await js(`__game.account().cosmetics.loadout.skills.${skill}.skillSkin`),'legacy_skeletal_mages');
    win.setSize(1280,960);
    await js(`__game.ui.hideAll();__game.devStartRun('necromancer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_mages={id:'qa_mages',name:'Skeletal Schools',level:1,size:{w:1600,h:1200},seed:93821,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_mages');w.player.pos={x:800,y:700};__game.step(180);w.actors=[w.player];
      window.mageActors=${JSON.stringify(bodies)}.map(([,id],i)=>{const a=w.createMonster(id,1,'player',w.player);
        a.cosmeticSourceSkill=i<2?'summon_skeleton_archer':'summon_skeleton_mage';
        a.pos={x:800+(i-2)*110,y:565};a.anchored=true;a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=-Math.PI/2;a.spawnedAt=-1;w.actors.push(a);return a});__game.step(120);void 0`);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_skeletal_mages'}]]) {
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:mageActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius})),
          png:document.querySelector('#game').toDataURL().split(',')[1]}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===bodies[i][2]));
      fs.writeFileSync(path.join(dir,`skeletal-mages-world-${name}.png`),Buffer.from(frame.png,'base64'));
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('SKELETAL MAGES UI OK: all five forms, native/legacy art, pool/tree previews, source isolation, disk reload, compact layout and world rendering');
  } catch(error) {console.error(error,errors);try{await shot('skeletal-mages-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
