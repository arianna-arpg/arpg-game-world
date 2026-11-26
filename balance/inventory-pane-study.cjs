const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Use the same frozen character and eight skills as the template comparison.
module.exports = async function paneStudy({win, run, wait, phase}) {
  const out = path.join(__dirname, 'reports', 'inventory-pane-study');
  fs.mkdirSync(out,{recursive:true});
  const before = phase === 'study-before';
  const openWardrobe = () => run(() => {
    __game.ui.showWardrobe(); document.querySelector('[data-wd-interface]').click();
  });
  const choices = [{id:'before', name:'Previous pass'}];
  if (!before) {
    await openWardrobe();
    const faces=await run(() => [...document.querySelector('[data-interface-choice="typeface"]').options].map(o=>({id:o.value,name:o.text+' · Warded vellum',face:o.value,finish:'warded'})));
    choices.splice(0,1,...faces,{id:'original-finish',name:'Classic · Original finish',face:'classic',finish:'frame'});
    await run(()=>__game.ui.hideEscapeMenu());
  }
  const metrics = {};
  for (const choice of choices) {
    if (!before) {
      await openWardrobe();
      await run(choice=>{
        for (const [key,value] of [['finish',choice.finish],['typeface',choice.face]]) {
          const s=document.querySelector('[data-interface-choice="'+key+'"]');s.value=value;s.dispatchEvent(new Event('change'));
        }
        document.querySelector('[data-interface-save]').click();__game.ui.hideEscapeMenu();
      },choice);
    }
    for (const [page,id] of [['inventory','inventory'],['skills','skills-panel'],['character','char-sheet']]) {
      await run(page=>{
        const ui=__game.ui, seat=__game.world().localSeat;
        if(document.getElementById('inventory').classList.contains('hidden'))ui.toggleInventory();
        if(page!=='inventory')ui.inventoryPages.request(page,seat.id,'show');
        else for(const p of ui.inventoryPages.entries())if(ui.inventoryPages.isOpen(p.id))ui.inventoryPages.close(p.id);
        ui.folioSync();
        const skill=document.querySelector('[data-sheet-inspect]');
        if(page==='character' && skill){skill.value='cleave';skill.dispatchEvent(new Event('change'));document.activeElement.blur();}
      },page);
      await wait(350);
      const {clip,layout}=await run(async id=>{
        await document.fonts.ready; const el=document.getElementById(id), r=el.getBoundingClientRect();
        const rail=el.querySelector('.build-ribbons')?.getBoundingClientRect();
        const ribbons=el.querySelector('.build-ribbons');
        if(ribbons && ribbons.scrollHeight>ribbons.clientHeight+1)throw Error('Inventory lettering clipped the ribbons');
        const x=Math.max(0,Math.floor(Math.min(r.left,rail?.left??r.left))-3),y=Math.max(0,Math.floor(r.top)-3);
        const list=el.querySelector('.build-scroll');
        const rows=[...el.querySelectorAll('.skill-entry[data-skill-id]')];
        if(!r.width||!r.height) throw Error('Hidden pane '+id);
        return {clip:{x,y,width:Math.ceil(r.right)-x+3,height:Math.ceil(r.bottom)-y+3},
          layout:list?{count:rows.length,listHeight:list.scrollHeight,visible:rows.filter(row=>{
            const box=row.getBoundingClientRect(), viewport=list.getBoundingClientRect();
            return box.top>=viewport.top-1&&box.bottom<=viewport.bottom+1;
          }).length}:null};
      },id);
      if(layout)metrics[choice.id]=layout;
      fs.writeFileSync(path.join(out,choice.id+'-'+page+'.png'),(await win.webContents.capturePage(clip)).toPNG());
    }
  }
  fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify(metrics,null,2));
  console.log(phase,metrics);
  if(before)return;
  const baseline=JSON.parse(fs.readFileSync(path.join(out,'study-before.json'),'utf8')).before;
  for(const m of Object.values(metrics)){assert.equal(m.count,8);assert.equal(m.listHeight,metrics.classic.listHeight,'Lettering preserves the live Skills layout');}
  const keyboard=await run(()=>{
    const s=document.querySelector('[data-sheet-inspect]'), r=s.getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    s.focus();
    return {cardReceivesClicks:hit===s,next:s.options[s.selectedIndex+1].value};
  });
  assert(keyboard.cardReceivesClicks,'Clicking the card reaches the skill selector');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Down'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Down'});
  await wait(80);
  assert.equal(await run(()=>document.querySelector('[data-sheet-inspect]').value),keyboard.next,'Keyboard selects the adjacent learned skill');
  const checks=await run(()=>{
    const ui=__game.ui,w=__game.world(),seat=w.localSeat,hero=w.seatHero(seat),root=document.getElementById('char-sheet');
    const picker=()=>root.querySelector('[data-sheet-inspect]'), stats=()=>root.querySelector('[data-sheet-skill-facts]').textContent;
    const select=id=>{const s=picker();s.value=id;s.dispatchEvent(new Event('change'));};
    const bar=()=>hero.skills.map(s=>s?.def.id).join(',');
    const initial=bar(), checks={};
    select('whirlwind');checks.channel=stats().includes('Pulse interval')&&stats().includes('hit per pulse');
    const summon=[...seat.meta.knownSkills.values()].find(s=>s.def.delivery.type==='summon').def.id;
    select(summon);checks.summon=stats().includes('Minions at once')&&!stats().includes('DPS');
    select('war_cry');checks.buff=stats().includes('Effect duration')&&!stats().includes('DPS');
    select('cleave');const s=picker(),hit=stats();s.focus();
    hero.sheet.setSource('pane-study',[{stat:'damage',kind:'increased',value:1,tags:['melee']}]);ui.refreshCharSheet();
    checks.live=s===picker()&&document.activeElement===s&&stats()!==hit;
    hero.sheet.setSource('pane-study',[]);checks.bar=bar()===initial;
    root.querySelector('[data-stattab="misc"]').click();
    checks.move=root.querySelector('.sheet-stat-list [data-stat-id="moveSpeed"]')!==null&&root.querySelectorAll('.sheet-vitals .stat-row').length===2;
    ui.inventoryPages.request('skills',seat.id,'show');ui.inventoryPages.request('character',seat.id,'show');ui.folioSync();
    checks.returned=picker().value==='cleave';
    w.unlearnSkill('cleave',seat);ui.refreshCharSheet();
    checks.fallback=picker().value!=='cleave'&&![...picker().options].some(o=>o.value==='cleave');
    for(const id of [...seat.meta.knownSkills.keys()]) w.unlearnSkill(id,seat);
    ui.refreshCharSheet();checks.empty=!picker()&&!!root.querySelector('.sheet-skill-empty');
    return checks;
  });
  for(const [name,ok] of Object.entries(checks))assert.equal(ok,true,name);
  const html=fs.readFileSync(path.join(__dirname,'inventory-pane-study.html'),'utf8');
  fs.writeFileSync(path.join(out,'index.html'),html.replace('/* choices */[]',JSON.stringify(choices))
    .replace('/* metrics */{}', JSON.stringify({before:baseline,...metrics})));
  await win.loadFile(path.join(out,'index.html'));
  const loaded=await run(async ()=>{
    const select=document.querySelectorAll('figure select')[1], img=document.querySelectorAll('figure img')[1];
    for(const button of document.querySelectorAll('[data-pane]')){
      location.hash=button.dataset.pane;window.dispatchEvent(new Event('hashchange'));
      for(const option of select.options){
        select.value=option.value;select.dispatchEvent(new Event('change'));await img.decode();
        if(!img.naturalWidth||!img.src.endsWith(option.value+'-'+button.dataset.pane+'.png'))return false;
      }
    }
    return true;
  });
  assert(loaded,'Every gallery page and lettering opens its matching capture');
};
