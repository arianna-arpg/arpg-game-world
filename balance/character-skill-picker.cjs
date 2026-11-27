// Real starting Magician, before the summon/construct fixtures are learned.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifySkillPicker({win,run,wait,capture}) {
  const picker = '#char-sheet [data-sheet-inspect]';
  const click = async selector => {
    const point = await run(selector => {
      const el = document.querySelector(selector);
      if (!el) throw Error('Missing '+selector);
      const r = el.getBoundingClientRect(), x = Math.floor(r.left+r.width/2), y = Math.floor(r.top+r.height/2);
      if (!el.contains(document.elementFromPoint(x,y))) throw Error('Cannot reach '+selector+' at '+x+', '+y);
      return {x,y};
    },selector);
    win.webContents.sendInputEvent({type:'mouseMove',...point});
    for (const type of ['mouseDown','mouseUp']) win.webContents.sendInputEvent({type,button:'left',clickCount:1,...point});
    await wait(65);
  };
  const key = async keyCode => {
    for (const type of ['keyDown','keyUp']) win.webContents.sendInputEvent({type,keyCode});
    await wait(60);
  };
  const initial = await run(() => {
    const world=__game.world(),seat=world.localSeat,ui=__game.ui;
    ui.inventoryPages.request('character',seat.id,'show');ui.folioSync();
    const select=document.querySelector('[data-sheet-inspect]');
    select.scrollIntoView({block:'nearest'});
    window.pickerFixture={select,header:document.querySelector('.sheet-heading'),drawer:document.querySelector('[data-skill-drawer]')};
    return {classId:seat.meta.classDef.id, ids:[...select.options].map(o=>o.value), bar:seat.actor.skills.map(s=>s?.def.id)};
  });
  assert.equal(initial.classId,'magician');
  assert.ok(initial.ids.includes('firebolt') && initial.ids.includes('frost_nova') && initial.ids.includes('chain_lightning'));
  const state = () => run(() => {
    const {select,header,drawer}=window.pickerFixture, selected=select.value;
    return {selected, heading:document.querySelector('.sheet-skill-face b').innerText, open:!drawer.hidden && __game.ui.charSheetOpen,
      expanded:document.querySelector('[data-skill-ribbon]').getAttribute('aria-expanded'),
      details:[...drawer.querySelectorAll('[data-inspect-topic^="learned/"]')].map(el=>el.dataset.inspectTopic.split('/')[1]),
      stable:select===document.querySelector('[data-sheet-inspect]') && header===document.querySelector('.sheet-heading') && drawer===document.querySelector('[data-skill-drawer]'),
      name:__game.world().localSeat.meta.knownSkills.get(selected).def.name};
  });
  const confirm = async (id,expanded) => {
    const s=await state();
    assert.equal(s.selected,id);assert.equal(s.heading,s.name);assert.equal(s.open,expanded);assert.equal(s.expanded,String(expanded));assert.ok(s.stable);
    if(expanded) assert.deepEqual([...new Set(s.details)],[id],'every cast detail belongs to the new selection');
  };

  await run(()=>document.querySelector('[data-sheet-inspect]').focus());
  await key('Down');
  await confirm(initial.ids[1],false);
  await key('Up');
  await confirm(initial.ids[0],false);
  const skillPickerHint = () => run(() => {
    const tip=document.querySelector('#tooltip');
    return !tip.classList.contains('hidden') && tip.textContent.includes('Inspect learned skill');
  });
  const hoverPicker = async () => {
    const p=await run(()=>{const r=document.querySelector('[data-sheet-inspect]').getBoundingClientRect();return {x:Math.floor(r.left+r.width/2),y:Math.floor(r.top+r.height/2)};});
    win.webContents.sendInputEvent({type:'mouseMove',x:1,y:1});
    win.webContents.sendInputEvent({type:'mouseMove',...p});await wait(500);
    assert(await skillPickerHint(),'a fresh hover explains the learned skill');
  };
  await hoverPicker();
  await click(picker);
  assert.ok(await run(()=>document.querySelector('[data-sheet-inspect]').matches(':open')),'native picker opened on a real click');
  assert.equal(await skillPickerHint(),false,'the opening press dismisses its hover hint');
  await run(()=>document.querySelector('[data-sheet-inspect] option:checked').dispatchEvent(new MouseEvent('mouseover',{bubbles:true})));
  await wait(500);
  assert.equal(await skillPickerHint(),false,'hovering picker options cannot bring back the hint');
  const bounds=await run(()=>{
    const select=document.querySelector('[data-sheet-inspect]'), r=select.closest('.sheet-skill-card').getBoundingClientRect(), options=[...select.options].map(el=>el.getBoundingClientRect());
    const p=getComputedStyle(select,'::picker(select)'), theme=getComputedStyle(select.closest('.inventory-surface'));
    const surface=document.createElement('i');surface.style.color='var(--inv-surface)';select.parentElement.append(surface);
    const color=getComputedStyle(surface).color;surface.remove();
    if(p.backgroundColor!==color || !theme.getPropertyValue('--inv-light').trim())throw Error('Picker lost its Wardrobe surface');
    if(getComputedStyle(select).backgroundColor!=='rgba(0, 0, 0, 0)')throw Error('Selector covers the learned-skill face');
    if(options.some(o=>!o.width || o.x<0 || o.right>innerWidth+1 || o.y<0 || o.bottom>innerHeight+1))throw Error('Offscreen picker option');
    const x=Math.max(0,Math.floor(r.x)-1), y=Math.max(0,Math.floor(Math.min(r.y,...options.map(o=>o.y-4)))-1);
    return {x,y,width:Math.min(innerWidth-x,Math.ceil(r.right)-x+1),height:Math.min(innerHeight-y,Math.ceil(Math.max(r.bottom,...options.map(o=>o.bottom+4)))-y+1)};
  });
  if (capture) { fs.mkdirSync(path.dirname(capture),{recursive:true});fs.writeFileSync(capture,(await win.webContents.capturePage(bounds)).toPNG()); }
  await click(picker+' option[value="frost_nova"]');
  await confirm('frost_nova',false);
  await hoverPicker();
  await run(()=>document.querySelector('[data-sheet-inspect]').focus());
  for (const type of ['keyDown','char','keyUp']) win.webContents.sendInputEvent({type,keyCode:' '});
  await wait(65);
  assert(await run(()=>document.querySelector('[data-sheet-inspect]').matches(':open')),'keyboard opens the picker');
  assert.equal(await skillPickerHint(),false,'keyboard opening also dismisses a stationary hover hint');
  await key('Escape');
  await click('#char-sheet [data-skill-ribbon]');
  await confirm('frost_nova',true);
  const idleWrites=await run(()=>{
    const slot=document.querySelector('[data-sheet-skill-slot]'), ui=__game.ui;
    const observer=new MutationObserver(()=>{});
    observer.observe(slot,{attributes:true,characterData:true,childList:true,subtree:true});
    try {
      for(let i=0;i<12;i++) ui.refreshLearnedSkill();
      return observer.takeRecords().length;
    } finally { observer.disconnect(); }
  });
  assert.equal(idleWrites,0,'an unchanged open card performs no DOM writes');
  await click(picker);await click(picker+' option[value="chain_lightning"]');
  await confirm('chain_lightning',true);
  await click(picker);await key('Escape');
  await run(()=>{__game.step(1);if(!__game.ui.charSheetOpen || document.querySelector('[data-sheet-inspect]').matches(':open'))throw Error('Escape must cancel only the picker');});
  await confirm('chain_lightning',true);

  // A system picker can commit without returning its pointerup to the game window.
  await run(()=>{
    const {select}=window.pickerFixture;
    select.dispatchEvent(new PointerEvent('pointerdown',{pointerId:71,bubbles:true,buttons:1}));
    select.value='firebolt';select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await confirm('firebolt',true);
  const live = await run(()=>{
    const {select}=window.pickerFixture, hero=__game.world().localSeat.actor;
    const value=()=>document.querySelector('[data-sheet-skill-facts] strong').textContent;
    const before=value();
    hero.sheet.setSource('picker-test',[{stat:'damage',kind:'more',value:1}]);
    __game.step(32,25);
    const boosted=value();
    hero.sheet.setSource('picker-test',[]);__game.step(32,25);
    return {before,boosted,after:value(),same:select===document.querySelector('[data-sheet-inspect]'),bar:hero.skills.map(s=>s?.def.id)};
  });
  assert.notEqual(live.boosted,live.before,JSON.stringify(live));assert.equal(live.after,live.before);assert.ok(live.same);assert.deepEqual(live.bar,initial.bar);

  await click(picker);await key('Home');await key('Down');await key('Enter');
  await confirm(initial.ids[1],true);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Alt'});await wait(45);
  const fallback = await run(()=>{
    const ui=__game.ui,w=__game.world(),seat=w.localSeat,{select,drawer}=window.pickerFixture;
    const forgotten=select.value;
    drawer.querySelector('[data-inspect-topic^="learned/"]').click();
    const pinned=!!document.querySelector('.inspection-tooltip:popover-open');
    w.unlearnSkill(forgotten,seat);ui.refreshLearnedSkill();
    return {pinned,stale:!!document.querySelector('.inspection-tooltip:popover-open'),
      selected:select.value,removed:![...select.options].some(o=>o.value===forgotten)};
  });
  assert.ok(fallback.pinned && !fallback.stale && fallback.removed);
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Alt'});await wait(45);
  await confirm(fallback.selected,true);
  await run(()=>{
    const ui=__game.ui,w=__game.world(),seat=w.localSeat;
    for (const id of [...seat.meta.knownSkills.keys()]) w.unlearnSkill(id,seat);
    ui.refreshLearnedSkill();
    if (!document.querySelector('.sheet-skill-empty') || document.querySelector('[data-sheet-inspect]')) throw Error('Empty learned book retained stale controls');
  });
  await run(()=>{delete window.pickerFixture; __game.ui.hideAll();});
  console.log('PASS Magician skill picker: mouse, keyboard, cancel, missing pointerup, immediate closed/open details, stable controls, live damage, unchanged hotbar');
};
