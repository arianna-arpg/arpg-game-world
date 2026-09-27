// Canine kit: real hidden renderer and Wardrobe, disposable saves.
// Run after building: npx electron balance/canines-ui.cjs
const { app, BrowserWindow }=require('electron');
const path=require('node:path'), fs=require('node:fs'), assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const dogs=[['Pain Hound','pain_hound',10],['Plains Wolf','plains_wolf',12],['Fen Hound','fen_hound',12],
  ['Hound That Was Never Wild','shepherds_hound',12],['Gravemaw Hound','gravemaw_hound',13]];
fs.mkdirSync(dir,{recursive:true});
app.disableHardwareAcceleration();app.setPath('userData',path.join(dir,`canines-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Canine UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`canines-saves-${process.pid}`)});
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
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('tamer');
      for(const id of ['pain_hounds','cast_falcon'])__game.account().unlockedSkills.add(id);__game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');await choose('[data-wd-skill]','pain_hounds');
    const before=await js('JSON.stringify(__game.account().cosmetics)');
    const native=await js("document.querySelector('.wardrobe canvas').toDataURL()");
    await click('[data-wd-id="legacy_hounds"]');
    assert.notEqual(native,await js("document.querySelector('.wardrobe canvas').toDataURL()"));
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.pain_hounds.skillSkin'),'legacy_hounds');
    await choose('[data-wd-skill]','tame_beast');
    assert.deepEqual((await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)")).filter(id=>['gravemaw_hound','plains_wolf','shepherds_hound'].includes(id)).sort(),['gravemaw_hound','plains_wolf','shepherds_hound']);
    const choicesBefore=await js('JSON.stringify(__game.account().cosmetics)');
    for(const id of ['plains_wolf','shepherds_hound','gravemaw_hound']){
      await choose('[data-wd-body]',id);await click('[data-wd-id=""]');
      const body=await js("document.querySelector('.wardrobe canvas').toDataURL()");
      await click('[data-wd-id="legacy_hounds"]');assert.notEqual(body,await js("document.querySelector('.wardrobe canvas').toDataURL()"));
    }
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),choicesBefore);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),'legacy_hounds');
    await click('[data-wd-id=""]');await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),null);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.pain_hounds.skillSkin'),'legacy_hounds');
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast'),undefined);
    await click('[data-wd-id="legacy_hounds"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','cast_falcon');assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_hounds]')"),false);
    await choose('[data-wd-skill]','tame_beast');await choose('[data-wd-body]','shepherds_hound');await click('[data-wd-id=""]');
    await shot('canines-wardrobe.png');win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));await shot('canines-compact.png');
    await win.reload();await wait(1200);
    for(const id of ['tame_beast','pain_hounds'])assert.equal(await js(`__game.account().cosmetics.loadout.skills.${id}.skillSkin`),'legacy_hounds');
    win.setSize(1280,960);
    await js(`__game.ui.hideAll();__game.devStartRun('tamer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_canines={id:'qa_canines',name:'Hound Studies',level:1,size:{w:1600,h:1200},seed:62919,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_canines');w.player.pos={x:800,y:700};__game.step(180);
      const companion=w.actors.find(a=>a.companion&&a.owner===w.player);if(!companion)throw Error('Starting hound missing');
      w.actors=[w.player];window.canineActors=${JSON.stringify(dogs)}.map(([,id],i)=>{
        const a=i===3?companion:w.createMonster(id,1,i===0?'player':'enemy',i===0?w.player:undefined);
        if(i===0)a.cosmeticSourceSkill='pain_hounds';a.pos={x:800+(i-2)*106,y:555};a.anchored=true;a.invulnerable=true;
        a.skills=[];a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};a.facing=a.facingPrev=-Math.PI/2;
        a.spawnedAt=-1;w.actors.push(a);return a});__game.step(120);void 0`);
    // Wild scale variance is real; the portrait pass must restore the actual radii.
    const baselineRadii=await js('canineActors.map(a=>a.radius)');
    const sheet=await js(`(()=>{
      const w=__game.world(),r=__game.renderer,c=document.createElement('canvas');c.width=1460;c.height=760;
      const ctx=c.getContext('2d'),oldCanvas=r.canvas,oldCtx=r.ctx,loadout=__game.account().cosmetics.loadout;
      ctx.fillStyle='#101820';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ede3ce';ctx.font='24px sans-serif';
      ctx.fillText('HOLLOW WAKE  /  TEETH OF THE PACK',30,40);ctx.fillStyle='#9eacb7';ctx.font='14px sans-serif';
      ctx.fillText('Refreshed bodies · enlarged and actual-size studies',30,68);
      ctx.fillText('Preserved original bodies · Legacy Hounds covers Pain Hounds and the three tameable breeds',30,404);
      const names=${JSON.stringify(dogs.map(b=>b[0]))};r.canvas=c;r.ctx=ctx;
      try{for(let i=0;i<canineActors.length;i++){
        const a=canineActors[i],original={look:a.look,radius:a.radius,facing:a.facing,facingPrev:a.facingPrev};
        try{for(let row=0;row<2;row++){
          __game.account().cosmetics.loadout={slots:row?{skillSkin:'legacy_hounds'}:{},skills:{}};
          a.look=row&&!a.owner?'hound':original.look;a.facing=a.facingPrev=-Math.PI/2;
          for(const [y,radius] of [[216+row*328,42],[344+row*328,original.radius]]){
            a.radius=radius;ctx.save();ctx.translate(146+i*292-a.pos.x,y-a.pos.y);r.drawActor(a,w);ctx.restore();
          }
        }}finally{Object.assign(a,original)}
        ctx.fillStyle='#ddd7c6';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(names[i],146+i*292,98);ctx.textAlign='left';
      }}finally{r.canvas=oldCanvas;r.ctx=oldCtx;__game.account().cosmetics.loadout=loadout}
      return c.toDataURL();})()`);save('canines-comparison.png',sheet);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_hounds'}]]){
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:canineActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius,look:a.look})),
          png:document.querySelector('#game').toDataURL()}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===baselineRadii[i]),JSON.stringify(frame.bodies));
      assert.equal(frame.bodies[1].look,'wolf_coursing');assert.equal(frame.bodies[2].look,'hound_reedcoat');assert.equal(frame.bodies[4].look,'hound_gravemaw');
      save(`canines-world-${name}.png`,frame.png);
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('CANINE UI OK: five native/original bodies, wild/companion rendering, retaliation and tame previews, per-skill legacy/native/inherit, disk reload and compact Wardrobe');
  }catch(error){console.error(error,errors);try{await shot('canines-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
