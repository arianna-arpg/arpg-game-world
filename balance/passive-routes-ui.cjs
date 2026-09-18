// Hidden, isolated client: real route clicks, native powers, investment and
// the actual visual editor's lossless write/read of every new node and edge.
// Run after npm run build: electron balance/passive-routes-ui.cjs
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'passive-routes-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'passive-routes-ui-profile-' + process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},55000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'passive-routes-ui-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const errors=[];
  win.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    for(const [width,height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height);
      await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();
        __game.world().meta.passivePoints=2;__game.ui.toggleTree();__game.step(2);
      })()`);
      await wait(150);
      const before=await win.webContents.executeJavaScript(`(() => {
        const nodes=[...document.querySelectorAll('.tree-node.available')].filter(n=>n.dataset.node.startsWith('route_'));
        return nodes.map(n=>({id:n.dataset.node,rect:[n.getBoundingClientRect().x,n.getBoundingClientRect().y]}));
      })()`);
      assert.ok(before.length>=3);assert.ok(before.every(n=>n.rect[0]>=0&&n.rect[1]>=0&&n.rect[0]<=width&&n.rect[1]<=height));
      fs.writeFileSync(path.join(dir,`passive-routes-opening-${width}.png`),(await win.webContents.capturePage()).toPNG());
      const result=await win.webContents.executeJavaScript(`(() => {
        document.querySelector('[data-node="route_str_pursuit_dance"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        const onward=document.querySelector('[data-node="route_str_technique_momentum"]').classList.contains('available');
        document.querySelector('[data-node="route_str_technique_momentum"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        return {onward,points:__game.world().meta.passivePoints,allocated:[...__game.world().meta.allocated],menu:!!document.querySelector('.choice-popup'),choices:__game.world().meta.choices};
      })()`);
      log(result);assert.ok(result.onward);assert.equal(result.points,0);assert.equal(result.menu,false);assert.deepEqual(result.choices,{});
      assert.ok(result.allocated.includes('route_str_pursuit_dance')&&result.allocated.includes('route_str_technique_momentum'));
      const search=await win.webContents.executeJavaScript(`(() => {
        const q=document.querySelector('#tree-search');q.value='pull the victim';q.dispatchEvent(new Event('input'));
        return [...document.querySelectorAll('.tree-node.search-hit')].filter(n=>n.dataset.node.startsWith('route_')).map(n=>({id:n.dataset.node,tooltip:__game.ui.passiveNodeTooltip(n.dataset.node).description}));
      })()`);
      assert.ok(search.length>=1);assert.ok(search.every(n=>n.tooltip.includes('pull the victim')&&!n.tooltip.includes('Bind to')));
      const conduit=await win.webContents.executeJavaScript(`(() => {
        const q=document.querySelector('#tree-search');q.value='Feed Your Footing';q.dispatchEvent(new Event('input'));
        return document.querySelectorAll('.tree-node.search-hit').length;
      })()`);
      assert.ok(conduit>0);
      await win.webContents.executeJavaScript(`(() => { const q=document.querySelector('#tree-search');q.value='';q.dispatchEvent(new Event('input')); })()`);
      await wait(150);
      fs.writeFileSync(path.join(dir,`passive-routes-allocated-${width}.png`),(await win.webContents.capturePage()).toPNG());
      const investment=await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(),id='route_str_school_graft_crushing_impact',entry='prep_'+id+'_entry',feeder='prep_'+id+'_a';
        w.meta.allocated=new Set(['str_start','route_str_accent_broken_cast']);w.meta.choices={};w.meta.passivePoints=3;w.recalcSeat(w.localSeat);__game.ui.refreshTree();
        const el=id=>document.querySelector('[data-node="'+id+'"]'),click=id=>el(id).dispatchEvent(new MouseEvent('click',{bubbles:true}));
        const locked=!el(id).classList.contains('available');click(id);
        const refused=w.meta.passivePoints===3;click(entry);
        const afterEntry=!el(id).classList.contains('available')&&w.meta.passivePoints===2;
        click(feeder);const unlocked=el(id).classList.contains('available')&&w.meta.passivePoints===1;
        const differentiated=Number(el(feeder).getAttribute('r'))<Number(el(id).getAttribute('r'));
        click(id);return {locked,refused,afterEntry,unlocked,differentiated,points:w.meta.passivePoints,owned:w.meta.allocated.has(id)};
      })()`);
      log(investment);assert.ok(investment.locked&&investment.refused&&investment.afterEntry&&investment.unlocked&&investment.differentiated&&investment.owned);assert.equal(investment.points,0);
      await win.webContents.executeJavaScript(`(() => {
        const ui=__game.ui,el=document.querySelector('[data-node="route_str_school_graft_crushing_impact"]');
        const x=Number(el.getAttribute('cx')),y=Number(el.getAttribute('cy')),b=ui.treeBox;
        ui.treeZoom=8;ui.treePan={x:x-b.minX-b.w/2,y:y-b.minY-b.h/2};ui.refreshTree();
      })()`);
      await wait(150);
      fs.writeFileSync(path.join(dir,`passive-investment-cluster-${width}.png`),(await win.webContents.capturePage()).toPNG());
      const mastery=await win.webContents.executeJavaScript(`(() => {
        const w=__game.world();w.meta.allocated=new Set(['str_start','cross_str_practice']);w.meta.choices={};w.meta.passivePoints=3;w.recalcSeat(w.localSeat);__game.ui.refreshTree();
        const click=id=>document.querySelector('[data-node="'+id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        click('prep_cross_str_mastery_entry');click('prep_cross_str_mastery_b');click('cross_str_mastery');
        const pop=document.querySelector('.choice-popup'),q=pop.querySelector('.choice-search');q.value='pull the victim';q.dispatchEvent(new Event('input'));
        const visible=[...pop.querySelectorAll('.choice-opt')].filter(b=>!b.hidden).map(b=>b.dataset.opt);
        const count=pop.querySelectorAll('.choice-opt').length;pop.querySelector('[data-opt="undertow_fist"]').click();
        return {visible,count,points:w.meta.passivePoints,chosen:w.meta.choices.cross_str_mastery};
      })()`);
      assert.deepEqual(mastery.visible,['undertow_fist']);assert.equal(mastery.count,12);assert.equal(mastery.points,0);assert.deepEqual(mastery.chosen,['undertow_fist']);
      const weave=await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(),ui=__game.ui,id='weave_rooted_three_beat_siege';
        w.meta.allocated=new Set(['str_start','route_int_accent_shield_cast']);w.meta.choices={};w.meta.passivePoints=3;w.recalcSeat(w.localSeat);ui.refreshTree();
        const el=id=>document.querySelector('[data-node="'+id+'"]'),click=id=>el(id).dispatchEvent(new MouseEvent('click',{bubbles:true}));
        click(id);const locked=w.meta.passivePoints===3;
        click(id+'_entry');const crossing=el('prep_route_int_accent_mana_heal_entry').classList.contains('available');
        const stillLocked=!el(id).classList.contains('available');click(id+'_b');click(id);
        const q=document.querySelector('#tree-search');q.value='Three Beats of Silence';q.dispatchEvent(new Event('input'));
        const found=document.querySelectorAll('.tree-node.search-hit').length;
        const b=ui.treeBox,x=Number(el(id+'_entry').getAttribute('cx')),y=Number(el(id+'_entry').getAttribute('cy'));
        ui.treeZoom=7;ui.treePan={x:x-b.minX-b.w/2,y:y-b.minY-b.h/2};ui.refreshTree();
        const dimmed=[...document.querySelectorAll('#tree-svg line[data-a]')].filter(e=>e.style.opacity==='0.1').length;
        const entryLines=[...document.querySelectorAll('#tree-svg line[data-a]')].filter(e=>e.dataset.a===id+'_entry'||e.dataset.b===id+'_entry');
        return {locked,crossing,stillLocked,found,dimmed,entryVisible:entryLines.every(e=>e.style.opacity===''),owned:w.meta.allocated.has(id),points:w.meta.passivePoints,tooltip:ui.passiveNodeTooltip(id).description};
      })()`);
      log(weave);assert.ok(weave.locked&&weave.crossing&&weave.stillLocked&&weave.owned);assert.equal(weave.points,0);assert.ok(weave.found>=4&&weave.tooltip.includes('3 whole seconds'));
      assert.ok(weave.dimmed>0&&weave.entryVisible);
      await wait(150);
      fs.writeFileSync(path.join(dir,`passive-weave-cluster-${width}.png`),(await win.webContents.capturePage()).toPNG());
      const restored=await win.webContents.executeJavaScript(`(() => {const q=document.querySelector('#tree-search');q.value='';q.dispatchEvent(new Event('input'));return [...document.querySelectorAll('#tree-svg line[data-a]')].every(e=>e.style.opacity==='');})()`);
      assert.ok(restored);
    }
    const editor=buildSync({entryPoints:[path.resolve(__dirname,'../src/dev/passiveEditor.ts')],bundle:true,write:false,platform:'browser',format:'iife',globalName:'__routeEditor'}).outputFiles[0].text;
    const serialized=await win.webContents.executeJavaScript(`(() => { ${editor}\n __routeEditor.mountPassiveEditor(__game.ui); return window.__passiveEditor.serializeTree(); })()`);
    assert.ok(serialized.includes("import './passiveCrossroads';"));assert.ok(serialized.includes('conduit:'));assert.ok(serialized.includes('nodes.push('));
    assert.ok(serialized.includes("import './passiveWeave';")&&serialized.includes('gaugeGateMod('));
    const bundle=contents=>buildSync({stdin:{contents,resolveDir:path.resolve(__dirname,'../src/data'),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',globalName:'__routeRoundtrip'}).outputFiles[0].text;
    const snapshot=code=>win.webContents.executeJavaScript(`(() => { ${code}\n const {PASSIVE_NODES:n,PASSIVE_ADJACENCY:a}=__routeRoundtrip; return Object.values(n).filter(n=>/^(route_|prep_|cross_|weave_)/.test(n.id)).map(n=>({...n,links:[...new Set(a[n.id])].sort()})).sort((a,b)=>a.id.localeCompare(b.id)); })()`);
    const before=await snapshot(bundle("export * from './passives';"));
    const after=await snapshot(bundle(serialized));
    // Constructors restore absent optional properties as undefined; they have
    // identical semantics and serialize identically on disk and on the wire.
    assert.equal(after.length,1072);assert.deepEqual(JSON.parse(JSON.stringify(after)),JSON.parse(JSON.stringify(before)));
    assert.deepEqual(errors,[]);
    log('PASS: opening clicks, investment, native mastery and weave cross-connections at both sizes; all 1072 changed editor payloads, thresholds and links round-trip');
    console.log('Passive routes UI PASS');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
