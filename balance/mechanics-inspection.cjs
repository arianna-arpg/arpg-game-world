// Exercise the real inventory and Codex with native pointer/keyboard input.
const assert = require('node:assert/strict');

module.exports = async function mechanicsInspection({win,run,wait,item,lattice}) {
  const layers = () => run(() => document.querySelectorAll('.inspection-tooltip:popover-open').length);
  const count = async n => { await wait(80); assert.equal(await layers(),n,'open inspection depth'); };
  const point = selector => run(selector => {
    const el = document.querySelector(selector);
    if (!el) throw Error('Missing '+selector);
    el.scrollIntoView({block:'nearest'});
    const r=el.getBoundingClientRect();
    const x=Math.floor(r.x+r.width/2), y=Math.floor(r.y+r.height/2);
    if (!el.contains(document.elementFromPoint(x,y))) throw Error('Obstructed '+selector+' by '+document.elementFromPoint(x,y)?.outerHTML.slice(0,170));
    return {x,y};
  },selector);
  const move = p => win.webContents.sendInputEvent({type:'mouseMove',...p});
  const dragTitle = async header => {
    const start=await point(header);
    const dx=await run(selector=>document.querySelector(selector).getBoundingClientRect().left>innerWidth/2?-55:55,header);
    move(start);await wait(25);
    win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...start});
    win.webContents.sendInputEvent({type:'mouseMove',x:start.x+dx,y:start.y+16,modifiers:['leftButtonDown']});
    win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:start.x+dx,y:start.y+16});
    await wait(80);
    const end=await point(header);
    assert.ok(Math.abs(end.x-start.x-dx)<=2,header+' follows a title drag');
  };
  const click = async selector => {
    const p=await point(selector); move(p); await wait(30);
    for (const type of ['mouseDown','mouseUp']) win.webContents.sendInputEvent({type,button:'left',clickCount:1,...p});
    await wait(65);
  };
  const key = async keyCode => {
    for (const type of ['keyDown','keyUp']) win.webContents.sendInputEvent({type,keyCode});
    await wait(60);
  };
  const topic = key => '[data-inspect-topic="'+key+'"]';
  const alt = async down => {
    win.webContents.sendInputEvent({type:down?'keyDown':'keyUp',keyCode:'Alt'});
    await wait(45);
    assert.equal(await run(()=>document.documentElement.hasAttribute('data-inspecting')),down);
  };
  await run(() => { const ui=__game.ui;ui.inventoryPages.request('character',__game.world().localSeat.id,'show');ui.folioSync(); });
  await run(function characterFrameExtent() {
    const sheet = document.querySelector('#char-sheet');
    const frame = sheet.querySelector('.inv-frame-chrome');
    const originalTab = sheet.querySelector('[data-stattab].active')?.dataset.stattab;
    const checkbox = () => sheet.querySelector('[data-statshowall]');
    const initial = checkbox().checked;
    const originalScroll = sheet.scrollTop;
    const measure = () => {
      const rect = frame.getBoundingClientRect();
      const last = sheet.querySelector('[data-sheet-breakdown]').lastElementChild.getBoundingClientRect();
      const crest = frame.querySelector('.inv-frame-crest.bottom').getBoundingClientRect();
      if (crest.top < last.bottom || Math.abs(crest.bottom - rect.bottom) > 1)
        throw Error('Character crest overlaps the statistics footer');
      if (Math.abs(frame.offsetHeight - sheet.scrollHeight) > 1)
        throw Error('Character frame does not cover the scrollable sheet');
      if (sheet.scrollTop && crest.bottom > sheet.getBoundingClientRect().bottom + 1)
        throw Error('Character footer is unreachable at the end of the list');
      return rect.height;
    };
    try {
      sheet.querySelector('[data-stattab="offense"]').click();
      if (checkbox().checked) checkbox().click();
      sheet.scrollTop = 0;
      const compact = measure();
      checkbox().click();
      sheet.scrollTop = sheet.scrollHeight;
      if (measure() <= compact || !sheet.scrollTop) throw Error('Unused statistics did not extend the frame');
      checkbox().click();
      sheet.scrollTop = 0;
      if (Math.abs(measure() - compact) > 1) throw Error('Character frame retained the old list height');
    } finally {
      if (originalTab) sheet.querySelector('[data-stattab="'+originalTab+'"]').click();
      if (checkbox().checked !== initial) checkbox().click();
      sheet.scrollTop = originalScroll;
    }
  });
  await run(function assertAttributeLayout() {
    const grid=document.querySelector('#char-sheet .sheet-attributes');
    const originalWidth=grid.style.inlineSize;
    try {
      for (const width of [275,205]) {
        grid.style.inlineSize=width+'px';
        for (const row of grid.children) {
          const link=row.querySelector('[data-inspect-topic]'), value=row.querySelector('.val');
          const reading=row.querySelector('.inspect-label'), text=document.createRange();text.selectNodeContents(reading);
          const name=text.getBoundingClientRect(), total=value.getBoundingClientRect(), cell=row.getBoundingClientRect();
          if(text.getClientRects().length!==1 || name.right>total.left+1 ||
            total.top>=name.bottom || total.right>cell.right+1 || row.scrollWidth>row.clientWidth+1)
            throw Error('Attribute does not fit at '+width+'px: '+link.textContent);
        }
        const [first,second]=grid.children;
        if ((first.offsetTop===second.offsetTop)!==(width===275)) throw Error('Attributes did not adapt to '+width+'px');
      }
    } finally { grid.style.inlineSize=originalWidth; }
  });
  const attack='#char-sheet .stat-row '+topic('stat/attackSpeed');
  const plain=await run(selector=>{
    const link=document.querySelector(selector), el=link.closest('.inspect-term').querySelector('.inspect-label');el.scrollIntoView({block:'nearest'});
    const r=el.getBoundingClientRect();
    return {x:Math.floor(r.left+r.width/2),y:Math.floor(r.top+r.height/2),decoration:getComputedStyle(el).textDecorationLine};
  },attack);
  assert.equal(plain.decoration,'none');
  move({x:plain.x,y:plain.y});await wait(80);
  assert.ok(await run(()=>document.querySelector('#tooltip:not(.hidden) .tt-title')?.textContent.includes('Attack Speed')));
  for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,button:'left',x:plain.x,y:plain.y,clickCount:1});
  await count(0);
  await alt(true);
  await click(attack); await count(1);
  await dragTitle('.inspection-tooltip:popover-open .tt-title');
  const cardX=()=>run(()=>document.querySelector('.inspection-tooltip:popover-open').getBoundingClientRect().left);
  const fromX=await cardX();
  const direction=await run(()=>document.querySelector('.inspection-tooltip').getBoundingClientRect().left>innerWidth/2?'Left':'Right');
  for(const type of ['keyDown','keyUp']) win.webContents.sendInputEvent({type,keyCode:direction,modifiers:['shift']});
  await wait(60);
  assert.ok(Math.abs(await cardX()-fromX)>=14,'Shift and an arrow move the focused detail');
  await alt(false);await count(1);await alt(true);
  await run(() => __game.step(32,25)); await count(1);
  await click('.inspection-tooltip '+topic('stat/castSpeed')); await count(2);
  await click('.inspection-tooltip:last-of-type '+topic('stat/attackSpeed')); await count(1);
  await key('Escape'); await count(0);
  assert.equal(await run(()=>document.activeElement.dataset.inspectTopic),'stat/attackSpeed');
  const complete=await run(()=>{
    const tabs=[...document.querySelectorAll('[data-stattab]')].map(el=>el.dataset.stattab);
    for (const tab of tabs) {
      document.querySelector('[data-stattab="'+tab+'"]').click();
      for (const row of document.querySelectorAll('#char-sheet .stat-row,#char-sheet .attr-row'))
        if (!row.querySelector('[data-inspect-topic]')) return false;
    }
    return true;
  });
  assert.ok(complete,'every visible Character row is inspectable across tabs');
  const face='#char-sheet .sheet-skill-face [data-inspect-topic]';
  await click(face);await count(1);
  assert.match(await run(()=>document.querySelector('.skill-reference-source').innerText),/Learned skill/);
  const originalLevel=await run(()=>{
    const seat=__game.world().localSeat,id=document.querySelector('[data-sheet-inspect]').value;
    const skill=seat.meta.knownSkills.get(id),previous=skill.level;
    skill.level=1;
    return previous;
  });
  await wait(750);
  assert.match(await run(()=>document.querySelector('.skill-reference-source').innerText),/Lv 1\b/);
  await run(level=>{
    const seat=__game.world().localSeat,id=document.querySelector('[data-sheet-inspect]').value;
    seat.meta.knownSkills.get(id).level=level;
  },originalLevel);
  await key('Escape');await count(0);
  await run(() => {
    const select=document.querySelector('[data-sheet-inspect]');select.value='shield_up';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const guard='stat/guardStrength';
  await click('#char-sheet .sheet-skill-metric '+topic(guard)); await count(1);
  assert.match(await run(()=>document.querySelector('.inspection-tooltip:popover-open').innerText),/Block Value/);
  await key('Escape');await count(0);
  await click('#char-sheet .sheet-skill-face '+topic('skill/shield_up'));await count(1);
  await click('.skill-reference-values dd '+topic(guard));await count(2);
  await key('Escape');await key('Escape');await count(0);
  await run(()=>{const ui=__game.ui;ui.openSkillTree('shield_up');ui.folioSync();});
  move(await point('#skill-tree-shield_up .st-node[data-node="shield_drill"]'));await wait(130);
  assert.match(await run(()=>document.querySelector('#tooltip:not(.hidden) .tt-title')?.textContent),/Shield Drill/);
  await click('#tooltip '+topic(guard));await count(1);
  await click('.inspection-tooltip '+topic('stat/blockValue'));await count(2);
  await key('Escape');await key('Escape');await count(0);
  await run(item=>{
    const ui=__game.ui,w=__game.world(),seat=w.localSeat;
    w.unlearnSkill('firebolt');
    ui.hideAll(); Object.assign(item,{uid:88888,x:0,y:0});seat.meta.items=[item];ui.toggleInventory();ui.folioSync();
  },item);
  const tile='[data-bag-item][data-item-uid="88888"]', proc='proc/emberbrand_rekindle';
  await alt(false);
  const tilePoint=await point(tile);move(tilePoint);await wait(150);
  const effect='#tooltip '+topic(proc);
  const ordinary=await run(effect=>{
    const card=document.querySelector('#tooltip'),names=card.querySelectorAll(effect);
    return {sticky:card.classList.contains('tt-interactive'),count:names.length,line:names[0]?.closest('div')?.innerText,
      linkedStats:card.querySelectorAll('[data-inspect-topic^="stat/"]').length,
      footer:card.textContent.includes('Triggered effects')};
  },effect);
  assert.equal(ordinary.sticky,false);assert.equal(ordinary.count,1);assert.equal(ordinary.footer,false);
  assert.ok(ordinary.linkedStats>0,'the same card exposes ordinary item modifiers for inspection');
  assert.match(ordinary.line,/\d+(?:\.\d+)?% chance to trigger The Rekindling/);
  await alt(true);assert.ok(await run(()=>document.querySelector('#tooltip').classList.contains('tt-interactive')));
  await alt(false);assert.ok(await run(()=>!document.querySelector('#tooltip').classList.contains('tt-interactive')));
  await alt(true);
  const linkPoint=await point(effect);
  for(let i=1;i<=8;i++) { move({x:Math.round(tilePoint.x+(linkPoint.x-tilePoint.x)*i/8),y:Math.round(tilePoint.y+(linkPoint.y-tilePoint.y)*i/8)}); await wait(35); }
  await wait(350);
  await dragTitle('#tooltip .tt-title');
  await click(effect);await count(1);
  const title=await run(()=>document.querySelector('.inspection-tooltip .tt-title').textContent);
  await click('.inspection-tooltip '+topic('skill/firebolt'));await count(2);
  assert.match(await run(()=>document.querySelector('.skill-reference-source').innerText),/Skill reference · Lv 1/);
  assert.match(await run(()=>document.querySelector('.skill-reference-metric').innerText),/Average direct hit/);
  await click('.inspection-tooltip:last-of-type '+topic('status/burn'));await count(3);
  await key('Escape');await count(2);
  await key('Escape');await count(1);await key('Escape');await count(0);
  assert.ok(await run(()=>!!document.querySelector('[data-bag-item][data-item-uid="88888"]')),'reading a proc preserves the item');
  await alt(false);move({x:1,y:1});await key('Tab');
  await run(tile=>document.querySelector(tile).focus(),tile);
  const focusIsInItem = () => run(()=>document.activeElement.matches('#tooltip [data-inspect-topic]'));
  const bind='#escape-menu [data-rebind="focusItemTooltip"]';
  const tooltipOptions = () => run(()=>{
    const ui=__game.ui;ui.showEscapeMenu();document.getElementById('esc-keys').click();
    document.querySelector('#escape-menu [data-opttab="interface"]').click();
  });
  await key('F2'); assert.equal(await focusIsInItem(),false,'F2 starts unassigned');
  await tooltipOptions();
  assert.match(await run(s=>document.querySelector(s).textContent,bind),/Unbound/i);
  move(await point(bind));await wait(180);
  assert.match(await run(()=>document.querySelector('#tooltip:not(.hidden)')?.textContent),/first linked stat or effect/);
  await click('#escape-menu [data-opttab="controls"]');
  assert.equal(await run(s=>!!document.querySelector(s),bind),false);
  await click('#escape-menu [data-opttab="interface"]');
  await click(bind);await key('F2');
  assert.equal(await run(()=>__game.settings().keybinds.focusItemTooltip),'f2');
  await run(()=>__game.ui.hideEscapeMenu());
  await run(tile=>document.querySelector(tile).focus(),tile);
  for (const dwell of [0,500]) {
    await key('F2');
    assert.ok(await run(()=>document.activeElement.matches('#tooltip [data-inspect-topic]')),'keyboard focus enters item details');
    await key('Enter');await count(1);await key('Escape');await count(0);
    await wait(dwell);
    assert.ok(await run(()=>document.activeElement.matches('#tooltip:not(.hidden) [data-inspect-topic]')),'the item keeps focus through the pointer crossing delay');
    await key('Escape');
    assert.ok(await run(tile=>document.activeElement.matches(tile),tile),'keyboard returns to the gear tile');
  }
  await tooltipOptions();await click(bind);await key('Y');
  await run(()=>{__game.ui.hideEscapeMenu();document.activeElement.blur();});
  move({x:1,y:1});await wait(70);move(await point(tile));await wait(130);
  await key('F2');assert.equal(await focusIsInItem(),false,'previous binding is released');
  await key('Y');assert.equal(await focusIsInItem(),true,'new binding enters a pointer-hovered item');
  await key('Tab');assert.equal(await focusIsInItem(),true,'Tab moves between item links');
  await key('Escape');
  await tooltipOptions();await click(bind);await key('Delete');
  assert.equal(await run(()=>__game.settings().keybinds.focusItemTooltip),'');
  await run(()=>__game.ui.hideEscapeMenu());
  await run(lattice=>{
    const ui=__game.ui,seat=__game.world().localSeat;
    ui.hideAll(); seat.meta.items=[{...lattice,uid:88889,x:0,y:0}]; ui.toggleInventory(); ui.folioSync();
  },lattice);
  move({x:1,y:1});await wait(60);
  move(await point('[data-bag-item][data-item-uid="88889"]'));await wait(150);await alt(true);
  const relay='#tooltip '+topic('stat/relayStatus_grounding');
  assert.match(await run(selector=>document.querySelector(selector).innerText,relay),/Redirects incoming Shock/);
  await click(relay);await count(1);
  await click('.inspection-tooltip '+topic('status/shock'));await count(2);
  await key('Escape');await key('Escape');await count(0);await alt(false);
  await run(()=>{
    const ui=__game.ui;ui.showEscapeMenu();document.getElementById('esc-keys').click();
    document.querySelector('[data-opttab="interface"]').click();
  });
  await click('#escape-menu [data-rebind="inspectTooltips"]');
  await key('J');
  assert.equal(await run(()=>__game.settings().keybinds.inspectTooltips),'j');
  const inspecting = ()=>run(()=>document.documentElement.hasAttribute('data-inspecting'));
  for (const [keyCode,expected] of [['Alt',false],['J',true]]) {
    win.webContents.sendInputEvent({type:'keyDown',keyCode});await wait(45);
    assert.equal(await inspecting(),expected);
    win.webContents.sendInputEvent({type:'keyUp',keyCode});await wait(45);
    assert.equal(await inspecting(),false);
  }
  await click('#escape-menu [data-opttab="controls"]');
  assert.equal(await run(()=>document.querySelector('#escape-menu [data-rebind="inspectTooltips"]').textContent),'J');
  await click('#escape-menu [data-rebind="inspectTooltips"]');await key('Escape');
  assert.equal(await run(()=>__game.settings().keybinds.inspectTooltips),'j');
  await click('#escape-menu [data-rebind="inspectTooltips"]');await key('Alt');
  await click('#escape-menu [data-opttab="interface"]');
  await run(()=>{
    const ui=__game.ui, option=document.querySelector('#escape-menu #opt-inspectionAlways');option.click();
    if (!__game.settings().inspectionAlways || !document.documentElement.hasAttribute('data-inspecting')) throw Error('Always-on inspection not applied');
    ui.hideEscapeMenu();
  });
  await run(()=>{__game.ui.hideAll();__game.ui.showCodex('reference');});
  await run(title=>{
    const input=document.querySelector('[data-cx-search]');input.value=title;input.dispatchEvent(new Event('input'));
  },title);
  assert.equal(await run(()=>document.querySelector('#cx-entry-title').textContent),title);
  await click('.cx-related '+topic('status/burn'));await count(1);
  await click('.inspection-tooltip '+topic('stat/effectDuration'));await count(2);
  await key('Escape');await count(1);await key('Escape');await count(0);
  assert.equal(await run(()=>document.querySelector('#cx-entry-title')?.textContent),title);
  win.setContentSize(854,620); await wait(180);
  await run(()=>{document.querySelector('.cx-grid button')?.click();});
  await click('.cx-related '+topic('status/burn'));await count(1);
  assert.ok(await run(()=>{const card=document.querySelector('.inspection-tooltip'),r=card.getBoundingClientRect();
    return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&!!getComputedStyle(card).getPropertyValue('--inv-light').trim();}));
  await key('Escape');await count(0);
  await run(()=>{
    const ui=__game.ui;ui.hideAll();ui.showEscapeMenu();document.getElementById('esc-keys').click();
    document.querySelector('[data-opttab="interface"]').click();document.getElementById('opt-inspectionAlways').click();
    if (__game.settings().inspectionAlways || document.documentElement.hasAttribute('data-inspecting')) throw Error('Hold Alt preference did not resume');
    ui.hideEscapeMenu();
  });
  await alt(true);
  await run(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await run(()=>document.documentElement.hasAttribute('data-inspecting')),false,'switching windows releases Alt');
  await alt(false);
  console.log('PASS Character layout, ordinary hover, Alt inspection, movable details, learned and triggered skills, Shield Up and Shield Drill to Guard Strength and Block Value, item links, opt-in F2, rebinding, hovered item entry, clearing, Codex and narrow viewport.');
};
