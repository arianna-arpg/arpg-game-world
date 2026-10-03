// Real client acceptance, isolated saves; the independent critic uses a separate profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const rewardCase=process.env.HOLLOW_WAKE_QA_CLASS==='rogue'
 ? {classId:'rogue',skill:'backstab',skillName:'Backstab',choice:'splash',name:'Splintering Impact',choices:['precision','splash','battering_ram']}
 : {classId:'warrior',skill:'cleave',skillName:'Cleave',choice:'concentrated',name:'Concentrated Power',choices:['concentrated','precision','splash','battering_ram']};
const file=path.join(dir,'worldmass-rewards-ui.log');fs.writeFileSync(file,'START\n');
const log=v=>fs.appendFileSync(file,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'rewards-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const root=path.resolve(__dirname,process.env.HOLLOW_WAKE_QA_BUILD||'../dist-preview'),server=http.createServer((req,res)=>{
    const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=async(fn,...args)=>{
    const result=await win.webContents.executeJavaScript('(async()=>{try{window.rewardCase='+JSON.stringify(rewardCase)+';return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(error){return {ok:false,error:error.stack||String(error)}}})()');
    if(!result.ok)throw Error(result.error);return result.value;
  };
  const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(dir,'worldmass-rewards-'+rewardCase.classId+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  const url=process.argv[2]||'http://127.0.0.1:'+server.address().port;
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},240000);
  try{
    await win.loadURL(url);
    const earned=await run(()=>{
      window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.devStartRun(rewardCase.classId);__game.ui.hideAll();const w=__game.world();
      w.startWorldMass(42);w.player.invulnerable=true;__game.step(2);
      const m=w.massRuntime,p=m.journey.places[0];w.landPartyAt(m.journey.local(p));m.update(w,true);
      const c=w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache']));
      if(!c)throw Error('Missing physical cache');w.landPartyAt(c.pos);
      for(let i=0;i<350&&!c.opened;i++)__game.step(1);
      if(!c.opened)throw Error('Native timed cache did not open');
      return {offers:w.explorationRewardOffers(),saved:m.rewards.snapshot(),seed:m.generator.run.seed};
    });
    log({earned});assert.equal(earned.offers.length,1);
    assert.deepEqual(earned.offers[0].choices.map(c=>c.id),rewardCase.choices);
    await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});
    const resume=async()=> {
      await win.loadURL(url);
      return run(async()=>{
        window.requestAnimationFrame=()=>0;
        for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
        document.querySelector('#sm-continue:not([disabled])').click();
        for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
        const w=__game.world();w.player.invulnerable=true;__game.step(2);
        return {offers:w.massRuntime.rewards.snapshot(),fatal:__game.crash().fatal};
      });
    };
    const continued=await resume();log({continued});assert.equal(continued.fatal,null);assert.deepEqual(continued.offers,earned.saved);
    const cards=await run(()=>{
      __game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(2);
      const el=document.querySelector('[data-exploration-offer]');
      return {text:el.textContent,buttons:el.querySelectorAll('[data-exploration-reward]').length};
    });
    log({cards});assert.equal(cards.buttons,rewardCase.choices.length);assert.ok(cards.text.includes(rewardCase.skillName));
    assert.equal(await run(()=>document.getElementById('world-map').textContent.includes('leaders defeated')),false);await shot('choice');
    const workspace=await run(()=>{
      __game.ui.hideAll();__game.ui.toggleInventory();__game.step(2);
      const shortcut=document.querySelector('[data-exploration-choose]');
      if(!shortcut?.textContent.includes('Cinderwatch Camp'))throw Error('Recovered choice missing beside bag');
      shortcut.click();__game.step(2);
      const panel=document.getElementById('skills-panel'),offer=panel.querySelector('[data-exploration-offer]');
      if(getComputedStyle(panel).display==='none'||!offer?.textContent.includes(rewardCase.skillName))
        throw Error('Bag shortcut did not show choices beside native skills');
      const a=offer.getBoundingClientRect(),b=panel.getBoundingClientRect();
      return {choices:offer.querySelectorAll('[data-exploration-reward]').length,
        panel:{x:b.x,y:b.y,w:b.width,h:b.height},offer:{x:a.x,y:a.y,w:a.width,h:a.height}};
    });
    log({workspace});assert.equal(workspace.choices,rewardCase.choices.length);assert.ok(workspace.panel.x>=0);
    assert.ok(workspace.panel.y+workspace.panel.h<=850);await shot('workspace');
    const claimed=await run(()=>{
      const button=document.querySelector('#skills-panel [data-exploration-reward][data-reward-choice="'+rewardCase.choice+'"]');
      button.scrollIntoView({block:'center',behavior:'instant'});
      const box=button.getBoundingClientRect();
      if(box.top<0 || box.bottom>innerHeight)throw Error('Reward choice cannot scroll into the viewport');
      button.click();__game.step(2);
      const w=__game.world(),item=w.meta.items.find(i=>i.gem?.supportId===rewardCase.choice);
      if(!item)throw Error('Reward did not reach native inventory');
      if(document.querySelector('#skills-panel [data-exploration-offer]') || document.querySelector('[data-exploration-choose]'))
        throw Error('Paid choice still displayed in inventory workspace');
      if(!document.querySelector('[data-drop="gemSock:'+rewardCase.skill+'"]') || !document.querySelector('[data-drag="gearItem:'+item.uid+'"]'))
        throw Error('Chosen gem and native socket are not together');
      __game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(2);
      const receipt=document.querySelector('[data-exploration-receipt]');
      if(!receipt?.textContent.includes(rewardCase.name) || document.querySelector('#world-map [data-exploration-offer]'))
        throw Error('Chosen receipt did not replace the journal offer');
      w.lastCombatAt=w.time;
      document.querySelector('[data-exploration-skills]').click();__game.step(2);
      if(getComputedStyle(document.getElementById('skills-panel')).display==='none'
        || getComputedStyle(document.getElementById('world-map')).display!=='none')
        throw Error('Receipt did not navigate to native Skills and inventory');
      const refusal=document.querySelector('[data-socket-refusal]');
      if(!refusal || !refusal.textContent.includes('the blood is still hot'))throw Error('Socket reason hidden from the Skills panel');
      __game.ui.hideAll();
      // The fixture has live enemies: return to sanctuary for native cold-blades socket discipline.
      w.landPartyAt(w.massRuntime.settlement.spawn);__game.step(3);
      __game.ui.toggleInventory();
      if(getComputedStyle(document.getElementById('skills-panel')).display==='none')document.querySelector('[data-buildflap]').click();
      __game.step(2);
      window.rewardQA={uid:item.uid};
      return {pending:w.massRuntime.rewards.pending,uid:item.uid,
        sanctuary:w.swapRefusal(w.localSeat,'socket'),
        source:!!document.querySelector('[data-drag="gearItem:'+item.uid+'"]'),
        target:!!document.querySelector('[data-drop="gemSock:'+rewardCase.skill+'"]')};
    });
    log({claimed});assert.ok(claimed.source&&claimed.target&&!claimed.pending);assert.equal(claimed.sanctuary,null);await shot('bag');
    const socket=await run(()=>{
      const source=document.querySelector('[data-drag="gearItem:'+rewardQA.uid+'"]'),target=document.querySelector('[data-drop="gemSock:'+rewardCase.skill+'"]');
      source.scrollIntoView({block:'center',behavior:'instant'});const a=source.getBoundingClientRect();
      source.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:a.left+8,clientY:a.top+8}));
      target.scrollIntoView({block:'center',behavior:'instant'});const b=target.getBoundingClientRect();
      document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:b.left+12,clientY:b.top+12}));
      document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,clientX:b.left+12,clientY:b.top+12}));
      document.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.left+12,clientY:b.top+12}));
      __game.step(2);const w=__game.world();
      return {supports:w.meta.knownSkills.get(rewardCase.skill).sockets.map(s=>s?.def.id),
        bag:w.meta.items.some(i=>i.uid===rewardQA.uid),fatal:__game.crash().fatal};
    });
    log({socket});assert.ok(socket.supports.includes(rewardCase.choice));assert.equal(socket.bag,false);assert.equal(socket.fatal,null);await shot('socketed');
    await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
    const paid=await resume();assert.equal(paid.offers[0].claimed,rewardCase.choice);
    const final=await run(()=>({receipts:__game.world().explorationRewardReceipts(),pending:__game.world().explorationRewardOffers().length,
      supports:__game.world().meta.knownSkills.get(rewardCase.skill).sockets.map(s=>s?.def.id)}));
    log({paid:paid.offers,final});assert.equal(final.pending,0);assert.ok(final.supports.includes(rewardCase.choice));assert.equal(final.receipts[0].name,rewardCase.name);
    await run(()=>{__game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(2);});
    await shot('receipt');
    log('PASS physical cache, fixed pending Continue, Journal/Skills choices, bag shortcut, once-only native claim, receipt handoff, bag drag/socket and claimed/socketed Continue');
  }catch(error){log(error.stack||String(error));process.exitCode=1;}
  finally{clearTimeout(timeout);win.destroy();server.close();app.exit(process.exitCode||0);}
});
