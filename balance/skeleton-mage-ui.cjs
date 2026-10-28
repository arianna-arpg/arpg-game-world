// Hidden disposable client: actual tree clicks, saved school choices, and ritual rendering.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'mage-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 65000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'mage-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const run = code => win.webContents.executeJavaScript(code);
  const capture = async name => { await wait(150); fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  try {
    await win.loadURL(server.url); await wait(500);
    await run("(()=>{__game.account().ledger.prologue_lived=1;__game.devStartRun('necromancer');__game.ui.hideAll();__game.devGrantSkill('summon_skeleton_mage',20,0);const w=__game.world();w.netMemoryAccess={progression:true,tree:null};__game.ui.openSkillTree('summon_skeleton_mage');__game.step(2);})()");
    for (const [width,height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height); await wait(100);
      const tree = await run("(()=>{__game.step(2);const pane=document.getElementById('skill-tree-summon_skeleton_mage'),r=pane.getBoundingClientRect();const labels=[...pane.querySelectorAll('.st-label')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height};});return {nodes:pane.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels};})()");
      assert.equal(tree.nodes,15); assert.ok(tree.labels.some(l=>l.text==='Lich Ascendant')); assert.ok(tree.labels.some(l=>l.text==='Grave Conclave'));
      const [x,y,w,h]=tree.rect;assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
      assert.equal(tree.labels.flatMap((a,i)=>tree.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)).length,0);
      await capture('skeleton-mage-tree-'+width);
    }
    await run("(()=>{for(const id of ['grave_academy','storm_curriculum','rolling_thunder','expanded_faculty']){document.querySelector('#skill-tree-summon_skeleton_mage circle[data-node=\"'+id+'\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));__game.step(1);}document.querySelector('#skill-tree-summon_skeleton_mage circle[data-node=\"grave_academy\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));for(const id of ['cold','lightning','chaos']){const w=__game.world(),p=w.player,i=p.skills[0];w.executeSkill(p,i,p.pos);const bodies=w.actors.filter(a=>!a.dead&&a.owner===p&&a.summonInst===i);if(!bodies.length)throw Error('Expected a mage before each choice');document.querySelector('[data-st-school=\"'+id+'\"]').click();if(bodies.some(a=>!a.dead))throw Error('Choice did not immediately dismiss mages');}})()");
    const chosen=await run("(()=>{const i=__game.world().player.skills[0];return {nodes:i.treeNodes,schools:i.summonSchools,buttons:[...document.querySelectorAll('[data-st-school]')].map(b=>[b.dataset.stSchool,b.getAttribute('aria-pressed')])};})()");
    assert.equal(chosen.nodes.length,4);assert.deepEqual(chosen.schools,['fire']);assert.equal(chosen.buttons.filter(x=>x[1]==='true').length,1);
    await capture('skeleton-mage-conclave-schools');
    assert.equal(await run("document.querySelector('[data-school-apply]')===null"),true);
    assert.equal(await run("document.querySelector('[data-st-school=\"fire\"]').disabled"),true);
    await run("document.querySelector('[data-school-close]').click();__game.step(1)");
    assert.deepEqual(await run("__game.world().player.skills[0].summonSchools"),['fire']);
    assert.equal(await run("document.querySelector('.choice-popup')===null"),true);
    const couch = await run("(()=>{const w=__game.world(),p=w.player,i=p.skills[0];w.executeSkill(p,i,p.pos);const own=w.actors.find(a=>!a.dead&&a.owner===p&&a.summonInst===i);const guest=w.addSeat('choice-guest',w.meta.classDef,{poll:()=>null});guest.couch={pad:1,side:'right'};const gi={...i,treeNodes:[...i.treeNodes],summonSchools:['fire','cold']};guest.meta.knownSkills.set(i.def.id,gi);guest.actor.skills.fill(null);guest.actor.skills[0]=gi;w.executeSkill(guest.actor,gi,guest.actor.pos);const body=w.actors.find(a=>!a.dead&&a.owner===guest.actor&&a.summonInst===gi);__game.ui.hideAll();__game.ui.openSkillTree(i.def.id,guest.id);__game.ui.refreshSkillTree(i.def.id);document.querySelector('#skill-tree-summon_skeleton_mage circle[data-node=\"grave_academy\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));document.querySelector('[data-st-school=\"cold\"]').click();const result={guestDismissed:!!body?.dead,ownerAlive:!!own&&!own.dead,guestSchools:gi.summonSchools,ownerSchools:i.summonSchools};__game.ui.hideAll();w.removeSeat(guest.id);return result;})()");
    assert.deepEqual(couch,{guestDismissed:true,ownerAlive:true,guestSchools:['fire'],ownerSchools:['fire']});
    win.setContentSize(1400,1000);
    await run("(()=>{__game.ui.hideAll();const w=__game.world(),p=w.player,inst=p.skills[0];w.zoneMap.qa_mage={id:'qa_mage',name:'Ossuary Lessons',level:6,size:{w:1800,h:1300},seed:8642,theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};w.loadZone('qa_mage');p.pos={x:650,y:650};__game.step(180);const update=w.update.bind(w);w.update=()=>{};w.applyInputs=()=>{};w.walk=null;w.doodads=[];w.markDoodadsChanged();w.devIgnoreSkillAttributes=true;p.sheet.setSource('mage-ui',[{stat:'mana',kind:'flat',value:100000},{stat:'life',kind:'flat',value:100000}]);p.fillResources();const aim={x:p.pos.x+260,y:p.pos.y};const advance=seconds=>{for(let t=0;t<seconds;t+=1/60)update(1/60);};const start=nodes=>{w.summonArts.clear();p.casting=null;p.cooldowns.clear();p.useLock=0;p.fillResources();w.actors=[p];w.projectiles=[];w.zones=[];w.flashes=[];inst.treeNodes=nodes;delete inst.summonSchools;w.executeSkill(p,inst,aim);};window.__mageQA={w,p,inst,aim,advance,start};start(['lich_ascendant','fused_intellect','winter_crown','storm_crown']);const lich=w.actors.find(a=>a.owner===p);lich.pos={x:p.pos.x+90,y:p.pos.y};w.executeSkill(lich,lich.skills.find(s=>s?.def.id==='skeletal_grand_rite'),aim);advance(.8);__game.step(1);})()");
    const ritual=await run("(()=>{const q=__mageQA;return {lich:q.w.actors.filter(a=>!a.dead&&a.defId==='ossuary_lich').length,fields:q.w.zones.map(z=>z.inst.def.id),face:q.w.slotFaceOf(q.p,q.inst).id};})()");
    assert.equal(ritual.lich,1);assert.equal(ritual.face,'skeletal_grand_command');
    assert.ok(ritual.fields.includes('skeletal_rite_blizzard'));assert.ok(ritual.fields.includes('skeletal_rite_boundary'));await capture('skeleton-mage-winter-rite');
    await run("(()=>{const q=__mageQA,b=q.w.actors.find(a=>a.owner===q.p);q.w.executeSkill(b,b.skills.find(s=>s?.def.id==='skeletal_grand_rite'),{x:q.aim.x,y:q.aim.y-180});__game.step(1);})()");
    await capture('skeleton-mage-storm-succession');
    const anchor=await run("(()=>{const q=__mageQA;q.start(['lich_ascendant','deathless_regent','court_of_one']);const b=q.w.actors.find(a=>a.owner===q.p);q.w.kill(b,false);q.advance(.1);__game.step(1);return q.w.actors.some(a=>!a.dead&&a.summonArtAnchor&&a.activeAuras.has('ossuary_command'));})()");
    assert.ok(anchor);await capture('skeleton-mage-phylactery');
    const returned=await run("(()=>{const q=__mageQA;q.advance(8.2);return q.w.actors.filter(a=>!a.dead&&a.defId==='ossuary_lich').length;})()");
    assert.equal(returned,1);
    await run("(()=>{const q=__mageQA;q.start(['grave_academy','storm_curriculum','rolling_thunder','expanded_faculty']);q.w.executeSkill(q.p,q.inst,q.aim);let n=0;for(const mage of q.w.actors.filter(a=>a.owner===q.p)){mage.pos={x:q.p.pos.x+90+(n%2)*75,y:q.p.pos.y-70+Math.floor(n/2)*140};n++;q.w.executeSkill(mage,mage.skills[0],q.aim);}q.advance(.2);__game.step(1);})()");
    await capture('skeleton-mage-conclave');
    assert.deepEqual(errors,[]);console.log('Skeleton Mage UI PASS: four-point tree, school selector, ritual effects, reconstruction and elemental conclave');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{console.error(error);app.exit(1);});
