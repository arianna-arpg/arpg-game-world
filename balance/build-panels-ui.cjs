const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
app.setPath('userData', path.join(__dirname, 'reports', `build-panels-profile-${process.pid}`));
const dir = path.join(__dirname, 'reports');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(__dirname, 'reports', `build-panels-saves-${process.pid}`) });
 const win = new BrowserWindow({ show:false, width:1600,height:1000, webPreferences:{ offscreen:true,backgroundThrottling:false } });
 const js = async s => {
  const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(s)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
  if (result?.qaError) throw Error(result.qaError);
  return result;
 };
 try {
  await win.loadURL(server.url); await wait(1200);
  await js(`Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0`);
  await js(`__game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.ui.toggleInventory(); void 0`);
  await js(`(()=>{const w=__game.world();w.update=()=>{};w.account.ledger.odyssey_stage_2=1;
    for(const s of w.localSeat.meta.knownSkills.values())if(s.def.tree)w.account.memorySecondary.add('skill:'+s.def.id);
    __game.ui.refreshInventory();})()`);
  await wait(300);
  const tiers = await js(`document.querySelectorAll('[data-buildflap] .build-essence').length`); assert(tiers > 0);
  await js(`document.querySelector('[data-buildflap]').click(); void 0`); await wait(150);
  assert.equal(await js(`document.querySelectorAll('.build-wallet-header .build-essence').length`), tiers);
  const geometry = await js(`(()=>{const b=document.querySelector('[data-rackunbind]'),r=b.getBoundingClientRect(),p=document.querySelector('#skills-panel').getBoundingClientRect(),h=document.querySelector('.build-ribbons').getBoundingClientRect(); return {button:{x:r.x,y:r.y,w:r.width,h:r.height}, panel:{x:p.x,y:p.y,w:p.width,right:p.right},rail:{x:h.x,y:h.y}, skills:__game.world().localSeat.meta.knownSkills.size}})()`);
  console.log('GEOMETRY',geometry); assert(geometry.button.w>=24 && geometry.button.h>=24); assert(Math.abs(geometry.panel.right-geometry.rail.x)<2);
  const dropSize = await js(`(()=>{const box=document.querySelector('[data-drop="rackFree"]'),old=box.cloneNode(false);old.style.display='block';old.style.minHeight='20px';old.innerHTML='<span>drag seats to reorder · drop a seat here (or press its ✕) to unlearn — the skill returns to your pack</span>';box.after(old);const sizes={current:box.getBoundingClientRect().height,original:old.getBoundingClientRect().height};old.remove();return sizes;})()`);
  console.log('UNLEARN DROP',dropSize); assert.equal(dropSize.current,dropSize.original);
  // Hints inside rich skill tiles must win, then yield back to the rich card.
  await js(`(()=>{const b=document.querySelector('[data-rackunbind]'),r=b.getBoundingClientRect();b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+2}));})()`);
  assert.match(await js(`document.querySelector('#tooltip').textContent`),/Unlearn/);
  await js(`(()=>{const b=document.querySelector('button[data-lvl]') || [...document.querySelectorAll('#skills-panel button')].find(e=>e.textContent.includes('Level Up')); if(!b)throw Error('No level button');const r=b.getBoundingClientRect(); b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+2}));})()`);
  assert.match(await js(`document.querySelector('#tooltip').textContent`),/Level up by spending/);
  assert.equal(await js(`document.querySelectorAll('#skills-panel [title]').length`),0);
  await js(`(()=>{const b=document.querySelector('[data-tip="skill"]'),r=b.getBoundingClientRect();b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+30}));})()`);
  assert(!(await js(`document.querySelector('#tooltip').classList.contains('hidden')`)));
  // Cards must keep their content and dimensions past the former 550ms expansion.
  await js(`window.__steadyAnchor=[...document.querySelectorAll('#skills-panel [data-tip="skill"]')].find(e=>__game.ui.skillTooltip(e.dataset.skillId,true)?.wide); if(!__steadyAnchor)throw Error('Fixture needs a skill with detail rows'); __steadyAnchor.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:600,clientY:400})); void 0`);
  const card = () => js(`(()=>{const t=document.querySelector('#tooltip'),r=t.getBoundingClientRect();return {html:t.innerHTML,w:r.width,h:r.height,wide:t.classList.contains('tt-wide')}})()`);
  const compact = await card();
  await wait(1100); assert.deepEqual(await card(), compact);
  assert.equal(compact.wide,false);
  // The same card moved toward screen edges must not shrink to available space.
  for(const x of [1580,20,1400,600]) {
   await js(`__steadyAnchor.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:${x},clientY:400})); void 0`);
   await wait(30); assert.deepEqual(await card(),compact);
   assert(await js(`(()=>{const r=document.querySelector('#tooltip').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`));
  }
  // Full is explicit and complete at first reveal, then just as steady.
  await js(`__game.settings().tooltipDetail='full'; __steadyAnchor.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));__steadyAnchor.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:600,clientY:400})); void 0`);
  const full = await card(); assert.notEqual(full.html,compact.html); assert.equal(full.wide,true);
  await wait(1100); assert.deepEqual(await card(),full);
  await js(`__game.settings().tooltipDetail='compact'; void 0`);
  // Allocating an identity must preserve the skill's core description, while
  // each point reads its own payload (including repeated ranks) without a pane.
  const treeCase = await js(`(()=>{
   const w=__game.world(),s=w.localSeat.meta.knownSkills.get('cleave');
   const identity=s.def.tree.nodes.find(n=>n.excludes?.length),ranked=s.def.tree.nodes.find(n=>n.ranks>1);
   s.level=15; w.pickTreeNode(s.def.id,identity.id); w.pickTreeNode(s.def.id,ranked.id);
   w.pickTreeNode(s.def.id,ranked.id); __game.ui.refreshInventory();
   return {id:s.def.id,base:s.def.description,identity:identity.name,ranked:ranked.name,spent:s.treeNodes.length};
  })()`);
  assert.equal(treeCase.spent,3);
  assert(await js(`__game.ui.skillTooltip(${JSON.stringify(treeCase.id)}).description.startsWith(${JSON.stringify(treeCase.base)})`));
  const hover = async selector => {
   await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing hover target');const r=e.getBoundingClientRect();e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+2}));})()`);
   return js(`document.querySelector('#tooltip').textContent`);
  };
  const point = i => '.skill-entry[data-skill-id="cleave"] [data-point="'+i+'"]';
  assert((await hover(point(0))).includes(treeCase.identity));
  assert((await hover(point(1))).includes(treeCase.ranked));
  assert.match(await hover(point(2)),/rank 2\/4/);
  assert.match(await hover(point(3)),/Unlocks at skill level 20/);
  const baseCard=await hover('.skill-entry[data-skill-id="cleave"] .name');
  assert(baseCard.includes(treeCase.base)); assert.match(baseCard,/Cost/);
  assert.match(await hover('.support-slot'),/Socket a support here/);
  const clean = await js(`(()=>{const p=document.querySelector('#skills-panel');return {text:p.textContent,unlearn:p.querySelectorAll('[data-unlearn]').length,levels:[...p.querySelectorAll('.skill-entry[data-skill-id="cleave"] .tree-point-level')].map(e=>e.textContent),tags:p.querySelector('.skill-entry .tags').textContent};})()`);
  assert.equal(clean.unlearn,0); assert.deepEqual(clean.levels,['5','10','15','20']); assert(clean.tags.length);
  assert(!/empty socket|\d+ sockets|the path opens|returns to your pack|\d+ mana|\d+s cd/i.test(clean.text));
  // An earned, unallocated point updates its hover as the skill levels.
  await js(`__game.world().localSeat.meta.knownSkills.get('cleave').level=20;__game.ui.refreshInventory();void 0`);
  assert.match(await hover(point(3)),/An Ability point is ready/);
  await js(`document.querySelector('#tooltip').classList.add('hidden');void 0`);
  fs.writeFileSync(path.join(dir,'build-panels-skill-points.png'),(await win.webContents.capturePage()).toPNG());
  await js(`document.querySelector('[data-passiveflap]').click(); void 0`); await wait(100);
  console.log('BOOK',await js(`__game.ui.folio.bookFor('passives')`));
  assert.equal(await js(`__game.ui.folio.bookFor('passives').front`),'passives');
  assert(await js(`__game.ui.folio.bookFor('passives').tabs.some(t=>t.id==='skills')`));
  await js(`document.querySelector('[data-buildflap]').click(); void 0`); await wait(100);
  assert.equal(await js(`__game.ui.folio.bookFor('skills').front`),'skills');
  await js(`__game.world().account.features.add('reliquary'); __game.ui.refreshInventory(); void 0`);
  await js(`__game.ui.openSkillTree(__game.world().localSeat.actor.skills.find(s=>s?.def.tree).def.id); void 0`); await wait(100);
  assert(await js(`__game.ui.folio.bookFor('skills').tabs.length >= 3`));
  // Docked skill trees obey the same measured berth as Passives, including
  // after refresh, resize and returning from another inventory ribbon.
  for(const [width,height] of [[1600,1000],[1280,800],[1920,1080]]) {
   win.setContentSize(width,height); await wait(150);
   await js(`__game.ui.refreshSkillTree(); void 0`); await wait(50);
   const dock = await js(`(()=>{
    const pane=document.querySelector('.skill-tree.inventory-page:not(.hidden):not(.folio-shelved)'),r=pane.getBoundingClientRect();
    const rail=document.querySelector('.build-ribbons').getBoundingClientRect();
    const ribbons=['[data-buildflap]','[data-passiveflap]','[data-containerflap="reliquary"]'].map(sel=>{
     const e=document.querySelector(sel),b=e.getBoundingClientRect();return {sel,reachable:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
    });return {left:r.left,right:r.right,railLeft:rail.left,ribbons};
   })()`);
   console.log('SKILL TREE DOCK',width,dock);
   assert(dock.left>=0 && dock.right<=dock.railLeft+1);
   assert(dock.ribbons.every(r=>r.reachable));
  }
  win.setContentSize(1600,1000); await wait(150);
  fs.writeFileSync(path.join(dir,'build-panels-skill-tree.png'),(await win.webContents.capturePage()).toPNG());
  await js(`document.querySelector('[data-containerflap="reliquary"]').click(); void 0`); await wait(100);
  assert.equal(await js(`__game.ui.folio.bookFor('skills').front`),'container:reliquary');
  await js(`document.querySelector('[data-buildflap]').click(); void 0`); await wait(100);
  // Click inside the added corner, away from the glyph; no drag should arm.
  const r=await js(`(()=>{const r=document.querySelector('[data-rackunbind]').getBoundingClientRect();return {x:Math.round(r.x+3),y:Math.round(r.y+3)}})()`);
  win.webContents.sendInputEvent({type:'mouseDown',...r,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',...r,button:'left',clickCount:1}); await wait(200);
  assert.equal(await js(`__game.world().localSeat.meta.knownSkills.size`),geometry.skills-1);
  assert(!(await js(`document.body.classList.contains('dnd-active')`)));
  const drag = await js(`(()=>{const a=document.querySelector('[data-drag^="rackSeat:"]'),b=document.querySelector('[data-drop="rackSeat:7"]'),r=a.getBoundingClientRect(),q=b.getBoundingClientRect();return{from:{x:Math.round(r.x+8),y:Math.round(r.y+35)},to:{x:Math.round(q.x+q.width/2),y:Math.round(q.y+q.height/2)},id:a.dataset.skillId}})()`);
  win.webContents.sendInputEvent({type:'mouseMove',...drag.from});
  win.webContents.sendInputEvent({type:'mouseDown',...drag.from,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseMove',...drag.to}); await wait(80);
  win.webContents.sendInputEvent({type:'mouseUp',...drag.to,button:'left',clickCount:1}); await wait(180);
  assert.equal(await js(`__game.world().localSeat.actor.skills[7]?.def.id`),drag.id);
  assert.deepEqual(await js(`[...document.querySelectorAll('#skills-panel .skill-entry[data-skill-id]')].map(e=>e.dataset.skillId)`),
   await js(`__game.world().localSeat.actor.skills.filter(Boolean).map(s=>s.def.id)`));
  await js(`document.querySelector('#tooltip').classList.add('hidden'); void 0`);
  fs.writeFileSync(path.join(dir,'build-panels-skills.png'),(await win.webContents.capturePage()).toPNG());
  await js(`document.querySelector('[data-passiveflap]').click(); void 0`); await wait(100);
  fs.writeFileSync(path.join(dir,'build-panels-passives.png'),(await win.webContents.capturePage()).toPNG());
  for(const [width,height] of [[1280,800],[1920,1080]]) {
   win.setContentSize(width,height); await wait(150);
   const box=await js(`(()=>{const r=document.querySelector('#passive-tree').getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}})()`);
   assert(box.x>=0 && box.right<=width && box.width>0);console.log('RESIZE',width,box);
  }
  await js(`__game.ui.hideAll(); void 0`);
  assert(await js(`document.querySelector('#skills-panel').classList.contains('hidden')`));
  console.log('BUILD PANELS UI PASS');
 } catch(e) { console.error(e); process.exitCode=1; }
 finally { win.destroy();server.server.close();app.exit(process.exitCode||0); }
});
