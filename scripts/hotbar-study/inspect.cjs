// Run after build.mjs. An offscreen window exercises the delivered offline page.
const {app, BrowserWindow} = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const {writeFileSync} = require('node:fs');
const {makeTempDir} = require('../temp-dir.cjs');

app.setPath('userData', makeTempDir('hollow-hotbar-study-'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
const reports = path.resolve(__dirname, '../../balance/reports');
async function inspect() {
  await app.whenReady();
  const win = new BrowserWindow({width:1120,height:810,useContentSize:true,show:false,
    webPreferences:{offscreen:true,backgroundThrottling:false}});
  const page = win.webContents;
  const js = s => page.executeJavaScript(s);
  const tick = () => js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const choose = (id, value) => js(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change'))})()`);
  const click = id => js(`document.getElementById(${JSON.stringify(id)}).click()`);
  const deadline=setTimeout(()=>app.exit(1),45000);
  try {
    const open = async () => { await win.loadFile(path.join(reports,'hotbar-workshop.html')); await tick(); };
    await open();
    await js('Promise.all([...document.images].map(i=>i.decode()))');
    assert.equal(await js("document.querySelectorAll('#current .slot').length"),8);
    const counter = (id,slot) => js(`document.querySelector('#${id} [data-skill="${slot}"] .charge')?.dataset.held ?? null`);
    assert.equal(await js("document.querySelector('#current h2').textContent"),'Heraldic Signet');
    const attr=(selector,name)=>js(`document.querySelector(${JSON.stringify('#current '+selector)})?.dataset[${JSON.stringify(name)}]`);
    assert.equal(await attr('[data-buff="War Cry"]','shape'),'square');
    assert.equal(await attr('[data-buff="Tempo"]','shape'),'diamond');
    assert.equal(await attr('[data-behavior=condition]','shape'),'diamond');
    assert.equal(await js("document.querySelector('#current .buff .clock')===null"),true);
    await choose('timers','shown');assert.ok(await js("!!document.querySelector('#current .buff .clock')"));
    const counters=()=>js("[...document.querySelectorAll('#counter-grid canvas')].map(c=>[c.getAttribute('aria-label'),c.toDataURL()])");
    const setFill=value=>js("document.getElementById('counter-fill').value="+value+";document.getElementById('counter-fill').dispatchEvent(new Event('input'))");
    await setFill(0);const empty=await counters();
    await setFill(100);const full=await counters();
    assert.ok(empty.length===new Set((await js("[...document.querySelectorAll('#counter-grid .counter-tile span')].map(s=>s.textContent)"))).size && empty.length>0 && empty.every(([label,raster],i)=>label.includes(' · 0 of ') && raster!==full[i][1]));
    assert.ok(full.some(([label])=>label==='Chambered Casting · 3 of 3'));
    assert.ok(full.some(([label])=>label==='Building Rhythm · 6 of 6'));
    for (const density of ['1','2']) for(const width of ['54','38','28']) {
      await choose('fit-density',density);
      await choose('fit-width',width);
      await setFill(95);
      const values=()=>js("document.getElementById('fit-pair-values').textContent");
      assert.match(await values(),/11\/12/);assert.match(await values(),/5\/6/);assert.match(await values(),/14\/15/);
      const fit=()=>js("[...document.querySelectorAll('#fit-pair .face')].map(f=>({x:f.offsetLeft,w:f.offsetWidth,overlay:f.querySelector('canvas').offsetWidth,ink:f.querySelector('canvas').toDataURL()}))");
      const nearGallery=await counters();
      const near=await fit();assert.equal(near.length,2);assert.ok(near.every(f=>f.w===Number(width) && f.overlay===f.w));
      await setFill(100);const ready=await fit();assert.ok(ready.every((f,i)=>f.ink!==near[i].ink));
      const fullGallery=await counters();
      assert.ok(fullGallery.every(([,raster],i)=>raster!==nearGallery[i][1]),'near-full and full differ throughout the gallery at '+width+' / '+density);
      assert.match(await values(),/6\/6/);assert.match(await values(),/15\/15/);
    }
    await choose('fit-density','1');await choose('fit-width','54');
    await setFill(50);
    await choose('socket-state','3');assert.ok(await js("document.querySelector('#socket-readout').textContent.includes('0 / 3')"));
    await choose('socket-state','0');
    const host=()=>js("document.querySelector('#current [data-skill=cleave]').getAttribute('aria-label')");
    assert.match(await host(),/Building Rhythm 0 .*Ravening 3/);
    const miniatures=()=>js("document.querySelector('#current .socket-overlay').toDataURL()");
    const portraits=await miniatures();await choose('socket-art','engraved');assert.notEqual(await miniatures(),portraits);
    await choose('socket-art','painted');
    await choose('socket-state','1');assert.match(await host(),/Building Rhythm 1 .*Ravening 0/);
    await choose('metal','inherit');await choose('skin','watchtower_iron');
    assert.ok(await js("document.querySelector('#current').classList.contains('metal-iron')"));
    await click('stationary'); assert.equal(await attr('[data-behavior=condition]','buff'),undefined);
    assert.equal(await attr('[data-behavior=proc][data-buff="The Still Hand"]','shape'),'diamond');
    await click('stationary');
    const total=await js("document.querySelectorAll('.direction').length");assert.equal(total,8);
    for(let i=0;i<total;i++){
      await js(`document.querySelectorAll('.direction')[${i}].click()`);
      assert.equal(await counter('current','flame_imbuement'),'4');
      assert.equal(await js("document.querySelector('#current [data-buff=\"Deep Carve\"] .stack').textContent"),'×9');
      assert.equal(await js("document.querySelector('#current [data-skill=dash] .clock').textContent"),'1.8s');
    }
    await js("document.querySelectorAll('.direction')[3].click()");
    await click('pin'); await choose('charges','seal'); await choose('stacks','band');
    await choose('condition','hexagon');await choose('skin','rose_vellum');await choose('expiry','rim');
    assert.equal(await attr('[data-behavior=condition]','shape'),'hexagon');
    assert.equal(await attr('[data-buff="War Cry"]','expiry'),'rim');
    assert.equal(await js("getComputedStyle(document.querySelector('#current')).getPropertyValue('--edge').trim()"),'#9a718b');
    await choose('library-group','Supports');
    assert.equal(await js("document.querySelectorAll('#support-gallery button').length"),12);
    await js("Promise.all([...document.querySelectorAll('#support-gallery img')].map(i=>i.decode()))");
    const first=await js("document.querySelector('#support-gallery button').dataset.support");
    await click('support-next');
    assert.notEqual(await js("document.querySelector('#support-gallery button').dataset.support"),first);
    await js("document.querySelector('#support-gallery button').click()");
    assert.equal(await js("document.querySelectorAll('#support-gallery [aria-pressed=true]').length"),1);
    await choose('library-item','support/metronome/proc/tempo');
    assert.ok(await js("!document.querySelector('#library-badge .effect-emblem') && document.querySelector('#library-badge .buff .enamel img').src===document.querySelector('#library-badge img').src"));
    assert.equal(await js("document.querySelector('#library-badge .buff').dataset.behavior"),'proc');
    await choose('library-item','support/colossus_stance/stationary|||');
    assert.equal(await js("document.querySelector('#library-badge .buff').dataset.shape"),'hexagon');
    await choose('support-role','Skill charges');
    assert.ok(await js("Array.from(document.querySelector('#library-item').options,o=>o.value).includes('support/chambered_casting')"));
    await choose('support-role','');await choose('library-item','support/splitting');
    assert.ok(await js("!document.querySelector('#library-badge .buff') && document.querySelector('#library-context').textContent.includes('Mechanic description')"));
    assert.equal(await js("document.querySelector('#reference h2').textContent"),'Field ledger');
    assert.equal(await js("document.querySelector('#current h2').textContent"),'Custom mix');
    await choose('encounter','Last charge'); await click('strike');
    for (const id of ['current','reference']) {
      assert.equal(await counter(id,'flame_imbuement'),null);
      assert.equal(await js(`document.querySelector('#${id} [data-buff="Deep Carve"] .stack').textContent`),'×11');
    }
    await choose('encounter','Spent & expired');
    assert.equal(await counter('current','life_flask'),'0');
    assert.equal(await js("document.querySelectorAll('#current .buff').length"),1);
    await choose('encounter','Full banks');
    assert.equal(await counter('reference','flame_imbuement'),'6');
    assert.equal(await js("document.querySelector('#current [data-buff=\"Deep Carve\"] .stack').textContent"),'×12');
    await click('compact'); await click('crowd'); await open();
    assert.ok(await js("compact.checked && !crowd.checked && compare.checked && document.querySelector('#current h2').textContent==='Custom mix' && document.querySelector('#condition').value==='hexagon' && document.querySelector('#skin').value==='rose_vellum'"));
    await click('replay'); await new Promise(r=>setTimeout(r,1250)); await click('replay');
    assert.equal(await counter('current','flame_imbuement'),'5');
    await choose('encounter','Mid-fight');
    for (const width of [1024,736,375,320]) {
      win.setContentSize(width,810); await tick();
      assert.ok(await js("document.documentElement.scrollWidth<=innerWidth"),'page overflow at '+width);
      assert.ok(await js(`[...document.querySelectorAll('.scene')].every(scene=>{
        const r=scene.getBoundingClientRect();return [...scene.querySelectorAll('.slot,.buff,.charge,.orb')].every(n=>{
          const b=n.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom
        })})`),'HUD overflow at '+width);
    }
    await js("localStorage.setItem('hollow-wake.hotbar-study.v1',JSON.stringify({current:{charges:'seal',stacks:'coin',metal:'silver'},reference:{charges:'rail',stacks:'corner',metal:'brass'}}))");await open();
    assert.equal(await js("document.querySelector('#current h2').textContent"),'Signet');
    await click('compare');assert.equal(await js("document.querySelector('#reference h2').textContent"),'Armory');
    await js("localStorage.removeItem('hollow-wake.hotbar-study.v1')"); win.setContentSize(1120,1080); await open();
    if(process.argv.includes('--capture')){
      await js('Promise.all([...document.images].map(i=>i.decode()))'); await tick();
      const h=await js("Math.ceil(document.querySelector('#current').getBoundingClientRect().bottom)+12");
      writeFileSync(path.join(reports,'hotbar-workshop.png'),(await page.capturePage({x:0,y:0,width:1120,height:h})).toPNG());
    }
    await win.loadFile(path.join(reports,'hotbar-workshop.html'),{hash:'supports'});
    await tick();
    assert.ok(await js("document.querySelector('#supports').open && !document.querySelector('#support-browser').hidden"));
    await choose('library-item','support/metronome/proc/tempo');
    await js('Promise.all([...document.images].map(i=>i.decode()))');
    await tick();
    if(process.argv.includes('--capture')) {
      const bounds=await js("(()=>{const d=document.getElementById('supports');d.scrollIntoView({block:'center'});const r=d.getBoundingClientRect();return {x:Math.floor(r.x)-4,y:Math.max(0,Math.floor(r.y)-6),width:Math.ceil(r.width)+8,height:Math.ceil(r.height)+12}})()");
      await tick();
      writeFileSync(path.join(reports,'support-gallery.png'),(await page.capturePage(bounds)).toPNG());
      const counters=await js("(()=>{const n=document.getElementById('support-counters');n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:Math.floor(r.x)-4,y:Math.max(0,Math.floor(r.y)-6),width:Math.ceil(r.width)+8,height:Math.ceil(r.height)+12}})()");
      await tick();
      writeFileSync(path.join(reports,'support-counters.png'),(await page.capturePage(counters)).toPNG());
    }
    win.setContentSize(320,810);await tick();
    assert.ok(await js("document.documentElement.scrollWidth<=innerWidth"),'open gallery fits 320px');
    await js("const search=document.getElementById('library-search');search.value='Teeming Vein';search.dispatchEvent(new Event('input'))");
    assert.equal(await js("document.querySelector('#support-gallery button').dataset.support"),'teeming_vein');
    console.log('PASS eight presets, semantic shapes, stationary and triggered overlap, support samples, Wardrobe palettes, expiry, legacy mixes, shared comparison, exact counts, replay and narrow layouts.');
  } finally { clearTimeout(deadline); win.destroy(); }
}
inspect().then(()=>app.exit(0),e=>{console.error(e);app.exit(1);});
