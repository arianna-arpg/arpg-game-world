// Companion + wild bird art: real hidden renderer and Wardrobe, disposable saves.
// Run after building: npx electron balance/avians-ui.cjs
const { app, BrowserWindow }=require('electron');
const path=require('node:path'), fs=require('node:fs'), assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const birds=[['Hunting Falcon','hunting_falcon',7],['Dune Vulture','dune_vulture',13],['Carrion Shrike','carrion_shrike',12]];
fs.mkdirSync(dir,{recursive:true});
app.disableHardwareAcceleration();app.setPath('userData',path.join(dir,`avians-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Avian UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`avians-saves-${process.pid}`)});
  const win=new BrowserWindow({show:false,width:1280,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message)});
  const js=s=>win.webContents.executeJavaScript(s);
  const painted=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const click=async s=>{await js(`document.querySelector(${JSON.stringify(s)}).click();void 0`);await painted()};
  const choose=async(s,v)=>{await js(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change'))})()`);await painted()};
  const save=(name,png)=>fs.writeFileSync(path.join(dir,name),Buffer.from(png.split(',')[1],'base64'));
  const shot=async name=>{await painted();fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG())};
  try {
    await win.loadURL(server.url);await wait(1200);
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('falconer');
      for(const id of ['cast_falcon','summon_stone_golem'])__game.account().unlockedSkills.add(id);
      __game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');await choose('[data-wd-skill]','cast_falcon');
    const before=await js('JSON.stringify(__game.account().cosmetics)');
    const native=await js("document.querySelector('.wardrobe canvas').toDataURL()");
    await click('[data-wd-id="legacy_hunting_falcon"]');
    const legacy=await js("document.querySelector('.wardrobe canvas').toDataURL()");assert.notEqual(native,legacy);
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.cast_falcon.skillSkin'),'legacy_hunting_falcon');
    await click('[data-wd-id=""]');await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.cast_falcon.skillSkin'),null);
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.cast_falcon'),undefined);
    await click('[data-wd-id="legacy_hunting_falcon"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','summon_stone_golem');assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_hunting_falcon]')"),false);
    await choose('[data-wd-skill]','cast_falcon');await click('[data-wd-id=""]');await shot('avians-wardrobe.png');
    win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));
    await shot('avians-compact.png');await win.reload();await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.cast_falcon.skillSkin'),'legacy_hunting_falcon');
    win.setSize(1280,960);
    await js(`__game.ui.hideAll();__game.devStartRun('falconer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_avians={id:'qa_avians',name:'Bird Studies',level:1,size:{w:1600,h:1200},seed:62171,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_avians');w.player.pos={x:800,y:700};__game.step(180);w.actors=[w.player];
      window.avianActors=${JSON.stringify(birds)}.map(([,id],i)=>{const a=w.createMonster(id,1,i?'enemy':'player',i?undefined:w.player);
        if(!i)a.cosmeticSourceSkill='cast_falcon';a.pos={x:800+(i-1)*125,y:565};a.anchored=true;a.invulnerable=true;
        a.skills=[];a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=-Math.PI/2;a.spawnedAt=-1;w.actors.push(a);return a});__game.step(120);void 0`);
    // Portraits call the game's real actor renderer at enlarged and true radii.
    // Only temporary fixture actors are changed, and all fields are restored.
    const sheet=await js(`(()=>{
      const w=__game.world(),r=__game.renderer,c=document.createElement('canvas');c.width=1020;c.height=720;
      const ctx=c.getContext('2d'),oldCanvas=r.canvas,oldCtx=r.ctx,loadout=__game.account().cosmetics.loadout;
      ctx.fillStyle='#101820';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ede3ce';ctx.font='24px sans-serif';
      ctx.fillText('HOLLOW WAKE  /  HUNTERS ON THE WING',30,40);ctx.fillStyle='#9eacb7';ctx.font='14px sans-serif';
      ctx.fillText('Refreshed bodies · enlarged and actual-size studies',30,68);
      ctx.fillText('Preserved original bodies · the Falcon is selectable in the Legacy Wardrobe',30,398);
      const names=${JSON.stringify(birds.map(b=>b[0]))};r.canvas=c;r.ctx=ctx;
      try {
        for(let i=0;i<avianActors.length;i++){
          const a=avianActors[i],original={look:a.look,radius:a.radius,facing:a.facing,facingPrev:a.facingPrev};
          try {
            for(let row=0;row<2;row++){
              __game.account().cosmetics.loadout={slots:row?{skillSkin:'legacy_hunting_falcon'}:{},skills:{}};
              a.look=row&&i?'vulture':original.look;a.facing=a.facingPrev=-Math.PI/2;
              for(const [y,radius] of [[209+row*320,42],[332+row*320,original.radius]]){
                a.radius=radius;ctx.save();ctx.translate(170+i*340-a.pos.x,y-a.pos.y);r.drawActor(a,w);ctx.restore();
              }
            }
          } finally {Object.assign(a,original)}
          ctx.fillStyle='#ddd7c6';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(names[i],170+i*340,98);ctx.textAlign='left';
        }
      } finally {r.canvas=oldCanvas;r.ctx=oldCtx;__game.account().cosmetics.loadout=loadout}
      return c.toDataURL();})()`);save('avians-comparison.png',sheet);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_hunting_falcon'}]]){
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:avianActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius,look:a.look})),
          png:document.querySelector('#game').toDataURL()}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===birds[i][2]));
      assert.equal(frame.bodies[1].look,'vulture_carrion');assert.equal(frame.bodies[2].look,'shrike_masked');
      save(`avians-world-${name}.png`,frame.png);
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('AVIAN UI OK: three native/original bodies, real wild/companion rendering, legacy Falcon, native/inherit overrides, disk reload and compact Wardrobe');
  } catch(error){console.error(error,errors);try{await shot('avians-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
