// Arachnid kit: real hidden renderer and Wardrobe, disposable saves.
// Run after building: npx electron balance/arachnids-ui.cjs
const { app, BrowserWindow }=require('electron');
const path=require('node:path'), fs=require('node:fs'), assert=require('node:assert/strict');
const { startGameServer }=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const spiders=[['Spiderling','spiderling','spider_small'],['Broodmother','broodmother','spider_big'],
  ['Orb Weaver','orb_weaver','orb_weaver'],['Widow Matron','widow_matron','widow_matron'],['Spider Nest','spider_nest','spider_nest']];
fs.mkdirSync(dir,{recursive:true});
app.disableHardwareAcceleration();app.setPath('userData',path.join(dir,`arachnids-profile-${process.pid}`));
const timeout=setTimeout(()=>{console.error('Arachnid UI timed out');app.exit(1)},120000);
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,`arachnids-saves-${process.pid}`)});
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
  try {
    await win.loadURL(server.url);await wait(1200);
    await js(`__game.account().ledger.prologue_lived=1;__game.ui.hideAll();__game.devStartRun('tamer');
      for(const id of ['lay_brood_egg','tame_beast','cast_falcon'])__game.account().unlockedSkills.add(id);__game.ui.showWardrobe();void 0`);
    await click('[data-wd-slot="skillSkin"]');await choose('[data-wd-skill]','lay_brood_egg');
    const before=await js('JSON.stringify(__game.account().cosmetics)'), native=await preview();
    assert(await js("document.querySelector('.wardrobe').textContent.includes('Preview · Spiderling')"));
    await click('[data-wd-id="legacy_spiders"]');assert.notEqual(native,await preview());
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),before);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.lay_brood_egg.skillSkin'),'legacy_spiders');
    await choose('[data-wd-skill]','tame_beast');
    const options=await js("[...document.querySelector('[data-wd-body]').options].map(o=>o.value)");
    for(const [,id] of spiders)assert(options.includes(id));
    // A shared capture skill exposes multiple families. Cards/defaults focus their own map.
    await choose('[data-wd-body]','plains_wolf');await click('[data-wd-id="legacy_spiders"]');
    assert.equal(await selectedBody(),'spiderling');
    await click('[data-wd-id="legacy_hounds"]');assert.equal(await selectedBody(),'plains_wolf');
    const thumb=await js("document.querySelector('[data-wd-summon=legacy_spiders]').toDataURL()");
    await choose('[data-wd-body]','shepherds_hound');
    assert.equal(await js("document.querySelector('[data-wd-summon=legacy_spiders]').toDataURL()"),thumb,'unmapped family does not change the spider card');
    const choicesBefore=await js('JSON.stringify(__game.account().cosmetics)');
    for(const [,id] of spiders){
      await choose('[data-wd-body]',id);await click('[data-wd-id=""]');const body=await preview();
      await click('[data-wd-id="legacy_spiders"]');assert.equal(await selectedBody(),id);assert.notEqual(body,await preview());
    }
    assert.equal(await js('JSON.stringify(__game.account().cosmetics)'),choicesBefore);
    await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),'legacy_spiders');
    await click('[data-wd-id=""]');await click('[data-wd-equip]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast.skillSkin'),null);
    assert.equal(await js('__game.account().cosmetics.loadout.skills.lay_brood_egg.skillSkin'),'legacy_spiders');
    await click('[data-wd-inherit]');assert.equal(await js('__game.account().cosmetics.loadout.skills.tame_beast'),undefined);
    await click('[data-wd-id="legacy_spiders"]');await click('[data-wd-equip]');
    await choose('[data-wd-skill]','cast_falcon');assert.equal(await js("!!document.querySelector('[data-wd-id=legacy_spiders]')"),false);
    await choose('[data-wd-skill]','tame_beast');await choose('[data-wd-body]','widow_matron');await click('[data-wd-id=""]');
    await shot('arachnids-wardrobe.png');win.setSize(760,900);await wait(250);
    assert(await js("document.querySelector('.wardrobe').scrollWidth<=document.querySelector('.wardrobe').clientWidth+1"));await shot('arachnids-compact.png');
    await win.reload();await wait(1200);
    for(const id of ['tame_beast','lay_brood_egg'])assert.equal(await js(`__game.account().cosmetics.loadout.skills.${id}.skillSkin`),'legacy_spiders');
    win.setSize(1280,960);
    await js(`__game.ui.hideAll();__game.devStartRun('tamer');__game.step(180);const w=__game.world();
      w.zoneMap.qa_arachnids={id:'qa_arachnids',name:'Silken Kin',level:1,size:{w:1600,h:1200},seed:63017,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_arachnids');w.player.pos={x:800,y:700};__game.step(180);
      w.actors=[w.player];window.spiderActors=${JSON.stringify(spiders)}.map(([,id],i)=>{
        const a=w.createMonster(id,1,i===0?'player':'enemy',i===0?w.player:undefined);
        if(i===0)a.cosmeticSourceSkill='lay_brood_egg';w.actors.push(a);
        if(i===1)w.tameCompanion(w.player,a,'tame_beast');
        a.pos={x:800+(i-2)*106,y:555};a.anchored=true;a.invulnerable=true;
        a.skills=[];a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};a.facing=a.facingPrev=-Math.PI/2;
        a.spawnedAt=-1;return a});__game.step(120);void 0`);
    const baselineRadii=await js('spiderActors.map(a=>a.radius)');
    const sheet=await js(`(()=>{
      const w=__game.world(),r=__game.renderer,c=document.createElement('canvas');c.width=1460;c.height=760;
      const ctx=c.getContext('2d'),oldCanvas=r.canvas,oldCtx=r.ctx,loadout=__game.account().cosmetics.loadout;
      ctx.fillStyle='#101820';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ede3ce';ctx.font='24px sans-serif';
      ctx.fillText('HOLLOW WAKE  /  SILKEN KIN',30,40);ctx.fillStyle='#9eacb7';ctx.font='14px sans-serif';
      ctx.fillText('Refreshed bodies · enlarged and actual-size studies',30,68);
      ctx.fillText('Preserved original bodies · Legacy Spiders covers bonded forms and brood-egg hatchlings',30,404);
      const forms=${JSON.stringify(spiders)};r.canvas=c;r.ctx=ctx;
      try{for(let i=0;i<spiderActors.length;i++){
        const a=spiderActors[i],original={look:a.look,radius:a.radius,facing:a.facing,facingPrev:a.facingPrev};
        try{for(let row=0;row<2;row++){
          __game.account().cosmetics.loadout={slots:row?{skillSkin:'legacy_spiders'}:{},skills:{}};
          a.look=row&&!a.owner?forms[i][2]:original.look;a.facing=a.facingPrev=-Math.PI/2;
          for(const [y,radius] of [[216+row*328,42],[344+row*328,original.radius]]){
            a.radius=radius;ctx.save();ctx.translate(146+i*292-a.pos.x,y-a.pos.y);r.drawActor(a,w);ctx.restore();
          }
        }}finally{Object.assign(a,original)}
        ctx.fillStyle='#ddd7c6';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(forms[i][0],146+i*292,98);ctx.textAlign='left';
      }}finally{r.canvas=oldCanvas;r.ctx=oldCtx;__game.account().cosmetics.loadout=loadout}
      return c.toDataURL();})()`);save('arachnids-comparison.png',sheet);
    for(const [name,slots] of [['native',{}],['legacy',{skillSkin:'legacy_spiders'}]]){
      const frame=await js(`(()=>{__game.account().cosmetics.loadout={slots:${JSON.stringify(slots)},skills:{}};__game.step(2);
        return {bodies:spiderActors.map(a=>({present:__game.world().actors.includes(a),dead:a.dead,radius:a.radius,look:a.look})),
          png:document.querySelector('#game').toDataURL()}})()`);
      assert(frame.bodies.every((a,i)=>a.present&&!a.dead&&a.radius===baselineRadii[i]),JSON.stringify(frame.bodies));
      assert.equal(frame.bodies[2].look,'spider_orbweaver');assert.equal(frame.bodies[3].look,'spider_redwidow');assert.equal(frame.bodies[4].look,'spider_silkcradle');
      save(`arachnids-world-${name}.png`,frame.png);
    }
    assert.equal(await js('!!__game.crash().fatal'),false);assert.deepEqual(errors,[]);
    console.log('ARACHNID UI OK: five native/original bodies, world companions, egg/tame previews, multiple families, per-skill legacy/native/inherit, disk reload and compact Wardrobe');
  }catch(error){console.error(error,errors);try{await shot('arachnids-failure.png')}catch{}process.exitCode=1}
  finally{clearTimeout(timeout);win.destroy();server.server.close();app.exit(process.exitCode||0)}
}).catch(error=>{console.error(error);app.exit(1)});
