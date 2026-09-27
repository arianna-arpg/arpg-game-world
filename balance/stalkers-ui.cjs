// Longlimb kit: hidden renderer + Wardrobe, with disposable saves.
// Run after building: npx electron balance/stalkers-ui.cjs
const { app, BrowserWindow }=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'),wait=ms=>new Promise(r=>setTimeout(r,ms));
const forms=[['Gloom Stalker','gloom_stalker'],['Steppe Strider','migration_strider'],
  ['Veilstalker','veilstalker'],['Alpha Stalker','alpha_stalker']];
fs.mkdirSync(dir,{recursive:true});
app.disableHardwareAcceleration();app.setPath('userData',path.join(dir,`stalkers-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Stalker UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`stalkers-saves-${process.pid}`)});
  const win=new BrowserWindow({show:false,width:1280,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message)});
  const js=s=>win.webContents.executeJavaScript(s);
  const painted=()=>js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const click=async s=>{await js(`document.querySelector(${JSON.stringify(s)}).click();void 0`);await painted()};
  const choose=async(s,v)=>{await js(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change'))})()`);await painted()};
  const save=(name,png)=>fs.writeFileSync(path.join(dir,name),Buffer.from(png.split(',')[1],'base64'));
  const shot=async name=>{await painted();fs.writeFileSync(path.join(dir,name),(await win.webContents.capturePage()).toPNG())};
  const preview=()=>js("document.querySelector('.wardrobe canvas').toDataURL()");
  const selectedBody=()=>js("document.querySelector('[data-wd-body]').value");
  try{
    await win.loadURL(server.url);await wait(1200);
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('tamer');
      for(const id of ['tame_beast','pain_hounds'])__game.account().unlockedSkills.add(id);__game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');await choose('[data-wd-skill]','tame_beast');
    const options=await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)");
    for(const id of ['migration_strider','veilstalker'])assert(options.includes(id));
    for(const id of ['gloom_stalker','alpha_stalker'])assert(!options.includes(id));
    const before=await js('JSON.stringify(__game.account().cosmetics)');
    await choose('[data-wd-body]','plains_wolf');await click('[data-wd-id="legacy_stalkers"]');
    assert.equal(await selectedBody(),'migration_strider');
    const thumb=await js("document.querySelector('[data-wd-summon=legacy_stalkers]').toDataURL()");
    await choose('[data-wd-body]','spiderling');
    assert.equal(await js("document.querySelector('[data-wd-summon=legacy_stalkers]').toDataURL()"),thumb);
    for(const id of ['migration_strider','veilstalker']){
      await choose('[data-wd-body]',id);await click('[data-wd-id=""]');const native=await preview();
      await click('[data-wd-id="legacy_stalkers"]');assert.equal(await selectedBody(),id);assert.notEqual(native,await preview());
    }
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),'legacy_stalkers');
    await choose('[data-wd-skill]','pain_hounds');assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_stalkers]')"),false);
    await click('[data-wd-id="legacy_hounds"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','tame_beast');await click('[data-wd-id=""]');await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),null);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.pain_hounds.skillSkin'),'legacy_hounds');
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast'),undefined);
    await click('[data-wd-id="legacy_stalkers"]');await click('[data-wd-equip]');
    await choose('[data-wd-body]','veilstalker');await click('[data-wd-id=""]');await shot('stalkers-wardrobe.png');
    win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));await shot('stalkers-compact.png');
    await win.reload();await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),'legacy_stalkers');
    assert.equal(await js('__game.account().cosmetics.loadout.skills.pain_hounds.skillSkin'),'legacy_hounds');
    win.setSize(1280,960);
    await js(`__game.ui.hideAll();__game.devStartRun('tamer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_stalkers={id:'qa_stalkers',name:'The Longlimbs',level:1,size:{w:1600,h:1200},seed:63103,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_stalkers');w.player.pos={x:800,y:700};__game.step(180);
      w.actors=[w.player];window.stalkerActors=${JSON.stringify(forms)}.map(([,id],i)=>{
        const a=w.createMonster(id,1,'enemy');w.actors.push(a);if(i===1)w.tameCompanion(w.player,a,'tame_beast');
        a.pos={x:800+(i-1.5)*120,y:555};a.anchored=true;a.invulnerable=true;
        a.skills=[];a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};a.facing=a.facingPrev=-Math.PI/2;
        a.spawnedAt=-1;return a});__game.step(120);void 0`);
    const radii=await js('stalkerActors.map(a=>a.radius)');
    const sheet=await js(`(()=>{
      const w=__game.world(),r=__game.renderer,c=document.createElement('canvas');c.width=1280;c.height=760;
      const ctx=c.getContext('2d'),oldCanvas=r.canvas,oldCtx=r.ctx,loadout=__game.account().cosmetics.loadout;
      ctx.fillStyle='#101820';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ede3ce';ctx.font='24px sans-serif';
      ctx.fillText('HOLLOW WAKE  /  THE LONGLIMBS',30,40);ctx.fillStyle='#9eacb7';ctx.font='14px sans-serif';
      ctx.fillText('Refreshed bodies · enlarged and actual-size studies',30,68);
      ctx.fillText('Preserved original bodies · Legacy Stalkers covers bonded Steppe Striders and Veilstalkers',30,404);
      const names=${JSON.stringify(forms.map(f=>f[0]))};r.canvas=c;r.ctx=ctx;
      try{for(let i=0;i<stalkerActors.length;i++){
        const a=stalkerActors[i],original={look:a.look,radius:a.radius,facing:a.facing,facingPrev:a.facingPrev};
        try{for(let row=0;row<2;row++){
          __game.account().cosmetics.loadout={slots:row?{skillSkin:'legacy_stalkers'}:{},skills:{}};
          a.look=row&&!a.owner?'stalker':original.look;a.facing=a.facingPrev=-Math.PI/2;
          for(const [y,radius] of [[216+row*328,42],[344+row*328,original.radius]]){
            a.radius=radius;ctx.save();ctx.translate(160+i*320-a.pos.x,y-a.pos.y);r.drawActor(a,w);ctx.restore();
          }
        }}finally{Object.assign(a,original)}
        ctx.fillStyle='#ddd7c6';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(names[i],160+i*320,98);ctx.textAlign='left';
      }}finally{r.canvas=oldCanvas;r.ctx=oldCtx;__game.account().cosmetics.loadout=loadout}
      return c.toDataURL();})()`);save('stalkers-comparison.png',sheet);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_stalkers'}]]){
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:stalkerActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius,look:a.look})),
          png:document.querySelector('#game').toDataURL()}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===radii[i]),JSON.stringify(frame.bodies));
      assert.equal(frame.bodies[0].look,'stalker_gloomblade');assert.equal(frame.bodies[2].look,'stalker_veilmantle');assert.equal(frame.bodies[3].look,'stalker_packalpha');
      save(`stalkers-world-${name}.png`,frame.png);
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('STALKER UI OK: four native/original bodies, two tame forms, relevant family previews, equip/native/inherit, disk reload, actual-size/world frames and compact Wardrobe');
  }catch(error){console.error(error,errors);try{await shot('stalkers-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
