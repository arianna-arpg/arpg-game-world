const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function inspector({win,run,wait,out = path.join(__dirname,'reports','character-skill-inspector')}) {
  fs.mkdirSync(out,{recursive:true});
  async function capture(name) {
    await wait(120);
    const clip = await run(() => {
      const rects = [document.querySelector('#char-sheet'),...document.querySelectorAll('.inspection-tooltip')].map(el=>el.getBoundingClientRect());
      const x=Math.max(0,Math.floor(Math.min(...rects.map(r=>r.left)))-6), y=Math.max(0,Math.floor(Math.min(...rects.map(r=>r.top)))-6);
      return {x,y,width:Math.min(innerWidth-x,Math.ceil(Math.max(...rects.map(r=>r.right)))-x+6),height:Math.min(innerHeight-y,Math.ceil(Math.max(...rects.map(r=>r.bottom)))-y+6)};
    });
    fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage(clip)).toPNG());
  }
  async function clickVisible(selector, aimAt=selector) {
    const point=await run((selector,aimAt)=>{
      const el=document.querySelector(selector),r=document.querySelector(aimAt).getBoundingClientRect();
      const x=Math.floor(r.left+r.width/2),y=Math.floor(r.top+r.height/2);
      return {x,y,hit:el.contains(document.elementFromPoint(x,y))};
    },selector,aimAt);
    assert.ok(point.hit,selector+' is reachable');
    for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,button:'left',x:point.x,y:point.y,clickCount:1});
    await wait(50);
  }
  const setup = await run(() => {
    const w=__game.world(),seat=w.localSeat,hero=w.seatHero(seat),ui=__game.ui;
    ui.inventoryPages.request('character',seat.id,'show');ui.folioSync();
    const pick=id=>{const el=document.querySelector('[data-sheet-inspect]');el.value=id;el.dispatchEvent(new Event('change'));};
    pick('summon_skeleton_mage');
    const host=seat.meta.knownSkills.get('raise_spectre');
    const bar=hero.skills.map(s=>s?.def.id).join(',');
    window.inspectorTest={pick,bar};
    return {bar, closed:document.querySelector('[data-skill-drawer]').hidden, cardHeight:document.querySelector('.sheet-skill-card').getBoundingClientRect().height, host:host.def.id};
  });
  assert.equal(setup.closed,true);assert.equal(setup.host,'raise_spectre');
  await capture('compact');
  const builds=await run(()=>{
    const world=__game.world(),seat=world.localSeat,hero=world.seatHero(seat);
    window.inspectorTest.pick('revive');
    const skill=seat.meta.knownSkills.get('revive');
    const picker=document.querySelector('[data-sheet-inspect]');
    const measure=(quantity,duration,haste)=>{
      hero.sheet.setSource('card-build',[
        {stat:'minionMaxCount',kind:'flat',value:quantity,tags:['minion']},
        {stat:'effectDuration',kind:'increased',value:duration,tags:['minion']},
        {stat:'castSpeed',kind:'increased',value:haste,tags:['spell']},
      ]);
      __game.step(32,25);
      if(picker!==document.querySelector('[data-sheet-inspect]'))throw Error('A build change replaced the active selector');
      const el=document.querySelector('[data-sheet-skill-facts]');
      const facts=Object.fromEntries([...el.querySelectorAll('dl div')].map(row=>[row.querySelector('dt').innerText,parseFloat(row.querySelector('dd').innerText)]));
      const body=world.spawnMinion(hero,skill,{monsterId:'skeleton_warrior'});
      return {cap:Number(el.querySelector('strong').textContent),lifespan:facts['Minion lifespan'],actualLifespan:body.lifespan,
        cast:facts['Cast time'],actualCast:hero.skillUseTime(skill)};
    };
    const readings=[measure(0,0,0),measure(4,1,.5),measure(-2,-.4,-.2)];
    hero.sheet.setSource('card-build',[]);
    return readings;
  });
  assert.deepEqual(builds.map(b=>b.cap),[6,10,4]);
  assert.deepEqual(builds.map(b=>b.lifespan),[15,30,9]);
  for(const b of builds){
    assert.ok(Math.abs(b.lifespan-b.actualLifespan)<.01);
    assert.ok(Math.abs(b.cast-b.actualCast)<.006);
  }
  assert.ok(builds[1].cast<builds[0].cast && builds[2].cast>builds[0].cast);
  await run(()=>window.inspectorTest.pick('raise_spectre'));
  await clickVisible('[data-skill-ribbon]');
  const roster = await run(() => {
    const w=__game.world(),seat=w.localSeat,hero=w.seatHero(seat),ui=__game.ui;
    const host=seat.meta.knownSkills.get('raise_spectre');
    if(document.querySelector('[data-skill-drawer]').hidden)throw Error('The ribbon did not open on a real click');
    const empty=document.querySelector('[data-skill-drawer]').textContent;
    hero.sheet.setSource('ribbon-cap',[{stat:'minionMaxCount',kind:'flat',value:4}]);
    const bodies=['skeleton_warrior','skeleton_archer'].map(monsterId=>w.spawnMinion(hero,host,{monsterId,tier:12}));
    if(bodies.some(b=>!b))throw Error('Missing spectre fixture');
    __game.step(32,25);
    const select=document.querySelector('[data-inspect-body]');
    select.value='body/'+bodies[1].id;select.dispatchEvent(new Event('change',{bubbles:true}));
    window.inspectorTest.bodies=bodies;
    return {empty, options:[...select.options].map(o=>o.text), skillNames:bodies[1].skills.filter(Boolean).map(s=>s.def.name),
      text:document.querySelector('.inspect-abilities').textContent};
  });
  assert.match(roster.empty,/Raise a corpse/);
  assert.equal(roster.options.length,2);
  for(const name of roster.skillNames)assert.ok(roster.text.includes(name),name);
  assert.match(roster.text,/hit DPS/);
  await capture('summon');
  const archerDps=await run(()=>{
    const select=document.querySelector('[data-inspect-body]');select.focus();
    const body=window.inspectorTest.bodies[1];
    const dps=()=>Number(document.querySelector('.inspect-abilities strong').textContent.match(/[\d,.]+/)[0].replaceAll(',',''));
    const base=dps();
    body.sheet.setSource('ribbon-test',[{stat:'damage',kind:'more',value:1}]);__game.step(32,25);
    const higher=dps();
    body.sheet.setSource('ribbon-test',[{stat:'damage',kind:'more',value:-.5}]);__game.step(32,25);
    const lower=dps();
    if(document.activeElement!==select)throw Error('A damage change interrupted the summon selector');
    body.sheet.setSource('ribbon-test',[]);__game.step(32,25);
    return {base,higher,lower,restored:dps()};
  });
  assert.ok(archerDps.higher>archerDps.base && archerDps.lower<archerDps.base);
  assert.equal(archerDps.restored,archerDps.base);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Alt'});await wait(50);
  await clickVisible('.inspect-abilities [data-inspect-topic]');
  await clickVisible('.inspection-tooltip [data-inspect-topic="basis"]');
  await clickVisible('.inspection-tooltip:last-of-type [data-inspect-topic="stat/critChance"]');
  const layers = () => run(()=>[...document.querySelectorAll('.inspection-tooltip:popover-open')].map(el=>{
    const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label'),fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1};
  }));
  assert.equal((await layers()).length,3);
  assert.ok((await layers()).every(p=>p.fits));
  await capture('mechanics');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await wait(50);
  assert.equal((await layers()).length,2);
  assert.equal(await run(()=>document.activeElement.dataset.inspectTopic),'stat/critChance');
  const fallback = await run(()=>{
    const w=__game.world(),seat=w.localSeat,hero=w.seatHero(seat),ui=__game.ui;
    window.inspectorTest.bodies[1].dead=true;__game.step(32,25);
    const selected=document.querySelector('.inspect-body-picker').textContent;
    const stacks=document.querySelectorAll('.inspection-tooltip').length;
    window.inspectorTest.pick('fire_mine');
    if (document.querySelector('[data-skill-drawer]').hidden) throw Error('Switching to a construct collapsed skill details');
    const mine=seat.meta.knownSkills.get('fire_mine');
    w.executeSkill(hero,mine,hero.pos);ui.refreshCharSheet();
    return {selected,stacks,mine:document.querySelector('[data-skill-drawer]').textContent,bar:hero.skills.map(s=>s?.def.id).join(',')};
  });
  assert.match(fallback.selected,/Warrior/);assert.equal(fallback.stacks,0);
  assert.match(fallback.mine,/Immolation Blast.*avg\. hit/i);assert.doesNotMatch(fallback.mine,/hit DPS/);
  assert.equal(fallback.bar,setup.bar);
  const palette=await run(()=>{
    const ui=__game.ui;
    const root=document.getElementById('char-sheet'),ink=()=>getComputedStyle(root).getPropertyValue('--inv-light').trim();
    const before=ink();
    ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
    for(const [key,value] of [['palette','brass'],['typeface','clear']]){
      const control=document.querySelector('[data-interface-choice="'+key+'"]');
      control.value=value;control.dispatchEvent(new Event('change'));
    }
    document.querySelector('[data-interface-save]').click();ui.hideEscapeMenu();
    ui.inventoryPages.request('character',__game.world().localSeat.id,'show');ui.folioSync();
    return {before,after:ink()};
  });
  assert.notEqual(palette.before,palette.after);
  win.setContentSize(854,620);await wait(200);
  await run(()=>{__game.ui.folioSync();document.querySelector('[data-sheet-inspect]').scrollIntoView({block:'nearest'});});
  await clickVisible('[data-sheet-inspect]','.sheet-skill-chevron');
  const themedPicker=await run(()=>{
    const select=document.querySelector('[data-sheet-inspect]'),active=select.selectedOptions[0];
    const r=active.getBoundingClientRect(),style=getComputedStyle(active);
    return {open:select.matches(':open'),fits:r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.x>=0&&r.y>=0,
      ink:style.getPropertyValue('--inv-light').trim(),font:style.fontFamily};
  });
  assert.ok(themedPicker.open && themedPicker.fits);assert.equal(themedPicker.ink,palette.after);assert.match(themedPicker.font,/Verdana/i);
  for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:'Escape'});await wait(50);
  await run(()=>{__game.ui.folioSync();const el=document.querySelector('.inspect-abilities .inspect-link');el.scrollIntoView({block:'nearest'});el.click();});
  assert.ok((await layers()).length===1 && (await layers()).every(p=>p.fits));
  const theme = await run(()=>{
    const style=getComputedStyle(document.querySelector('.inspection-tooltip'));
    return {ink:style.getPropertyValue('--inv-light').trim(),font:style.fontFamily};
  });
  assert.equal(theme.ink,palette.after);assert.match(theme.font,/Verdana/i);
  await run(()=>{__game.ui.inventoryPages.request('skills',__game.world().localSeat.id,'show');__game.ui.folioSync();});
  await wait(80);assert.equal((await layers()).length,0);
  const figures = [
    ['Approved Character pane','../inventory-comparison/after-character.png'],
    ['Compact learned skill','compact.png'],
    ['Raise Spectre · selected archer','summon.png'],
    ['Bone Arrow · linked mechanics','mechanics.png'],
  ].filter(([,file])=>fs.existsSync(path.resolve(out,file)));
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Character · Learned skill inspection</title>
    <style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:clamp(12px,3vw,40px);color:#ece7d5;background:#0b1416;font:16px Georgia,serif}main{max-width:1260px;margin:auto}h1{font-size:clamp(22px,3vw,32px);font-weight:500;margin:0 0 24px}section{display:flex;flex-wrap:wrap;gap:22px 30px;align-items:flex-start}figure{margin:0;max-width:100%}figcaption{padding:0 0 8px;color:#c2d4cf}img{display:block;width:auto;height:auto;max-width:100%;border:1px solid #385458}</style>
    <main><h1>Character · Learned skill inspection</h1><section>${figures.map(([caption,file])=>`<figure><figcaption>${caption}</figcaption><a href="${file}"><img src="${file}" alt="${caption}"></a></figure>`).join('')}</section></main></html>`);
  console.log('CHARACTER INSPECTOR PASS', {builds,archerDps,cardHeight:setup.cardHeight, ...roster, mine:fallback.mine});
};
