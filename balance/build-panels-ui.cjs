const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
app.setPath('userData', path.join(__dirname, 'reports', `build-panels-profile-${process.pid}`));
const dir = path.join(__dirname, 'reports');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(__dirname, 'reports', `build-panels-saves-${process.pid}`) });
 const win = new BrowserWindow({ show:false, width:1600,height:1000, webPreferences:{ offscreen:true,backgroundThrottling:false } });
 const js = s => win.webContents.executeJavaScript(s);
 try {
  await win.loadURL(server.url); await wait(1200);
  await js(`__game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.ui.toggleInventory(); void 0`);
  await wait(300);
  const tiers = await js(`document.querySelectorAll('[data-buildflap] .build-essence').length`); assert(tiers > 0);
  await js(`document.querySelector('[data-buildflap]').click(); void 0`); await wait(150);
  assert.equal(await js(`document.querySelectorAll('.build-wallet-header .build-essence').length`), tiers);
  const geometry = await js(`(()=>{const b=document.querySelector('[data-rackunbind]'),r=b.getBoundingClientRect(),p=document.querySelector('#skills-panel').getBoundingClientRect(),h=document.querySelector('.build-ribbons').getBoundingClientRect(); return {button:{x:r.x,y:r.y,w:r.width,h:r.height}, panel:{x:p.x,y:p.y,w:p.width,right:p.right},rail:{x:h.x,y:h.y}, skills:__game.world().localSeat.meta.knownSkills.size}})()`);
  console.log('GEOMETRY',geometry); assert(geometry.button.w>=24 && geometry.button.h>=24); assert(Math.abs(geometry.panel.right-geometry.rail.x)<2);
  // Hints inside rich skill tiles must win, then yield back to the rich card.
  await js(`(()=>{const b=document.querySelector('[data-rackunbind]'),r=b.getBoundingClientRect();b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+2}));})()`);
  assert.match(await js(`document.querySelector('#tooltip').textContent`),/Unlearn/);
  await js(`(()=>{const b=document.querySelector('button[data-lvl]') || [...document.querySelectorAll('#skills-panel button')].find(e=>e.textContent.includes('Level Up')); if(!b)throw Error('No level button');const r=b.getBoundingClientRect(); b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+2}));})()`);
  assert.match(await js(`document.querySelector('#tooltip').textContent`),/Level up by spending/);
  assert.equal(await js(`document.querySelectorAll('#skills-panel [title]').length`),0);
  await js(`(()=>{const b=document.querySelector('[data-tip="skill"]'),r=b.getBoundingClientRect();b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+2,clientY:r.y+30}));})()`);
  assert(!(await js(`document.querySelector('#tooltip').classList.contains('hidden')`)));
  await js(`document.querySelector('[data-passiveflap]').click(); void 0`); await wait(100);
  console.log('BOOK',await js(`__game.ui.folio.bookFor('passives')`));
  assert.equal(await js(`__game.ui.folio.bookFor('passives').front`),'passives');
  assert(await js(`__game.ui.folio.bookFor('passives').tabs.some(t=>t.id==='skills')`));
  await js(`document.querySelector('[data-buildflap]').click(); void 0`); await wait(100);
  assert.equal(await js(`__game.ui.folio.bookFor('skills').front`),'skills');
  await js(`__game.ui.openSkillTree(__game.world().localSeat.actor.skills.find(s=>s?.def.tree).def.id); void 0`); await wait(100);
  assert(await js(`__game.ui.folio.bookFor('skills').tabs.length >= 3`));
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
