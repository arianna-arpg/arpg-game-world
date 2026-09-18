// Hidden, isolated client: real route clicks, readable support discovery and
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
        const q=document.querySelector('#tree-search');q.value='hurled into the void';q.dispatchEvent(new Event('input'));
        return [...document.querySelectorAll('.tree-node.search-hit')].filter(n=>n.dataset.node.startsWith('route_')).map(n=>({id:n.dataset.node,tooltip:__game.ui.passiveNodeTooltip(n.dataset.node).description}));
      })()`);
      assert.ok(search.length>=1);assert.ok(search.every(n=>n.tooltip.includes('hurled into the void')));
      const conduit=await win.webContents.executeJavaScript(`(() => {
        const q=document.querySelector('#tree-search');q.value='Feed Your Footing';q.dispatchEvent(new Event('input'));
        return document.querySelectorAll('.tree-node.search-hit').length;
      })()`);
      assert.ok(conduit>0);
      await win.webContents.executeJavaScript(`(() => { const q=document.querySelector('#tree-search');q.value='';q.dispatchEvent(new Event('input')); })()`);
      await wait(150);
      fs.writeFileSync(path.join(dir,`passive-routes-allocated-${width}.png`),(await win.webContents.capturePage()).toPNG());
    }
    const editor=buildSync({entryPoints:[path.resolve(__dirname,'../src/dev/passiveEditor.ts')],bundle:true,write:false,platform:'browser',format:'iife',globalName:'__routeEditor'}).outputFiles[0].text;
    const serialized=await win.webContents.executeJavaScript(`(() => { ${editor}\n __routeEditor.mountPassiveEditor(__game.ui); return window.__passiveEditor.serializeTree(); })()`);
    assert.ok(serialized.includes("import './passiveCrossroads';"));assert.ok(serialized.includes('conduit:'));
    const bundle=contents=>buildSync({stdin:{contents,resolveDir:path.resolve(__dirname,'../src/data'),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',globalName:'__routeRoundtrip'}).outputFiles[0].text;
    const snapshot=code=>win.webContents.executeJavaScript(`(() => { ${code}\n const {PASSIVE_NODES:n,PASSIVE_ADJACENCY:a}=__routeRoundtrip; return Object.values(n).filter(n=>n.id.startsWith('route_')).map(n=>({...n,links:[...new Set(a[n.id])].sort()})).sort((a,b)=>a.id.localeCompare(b.id)); })()`);
    const before=await snapshot(bundle("export * from './passives';"));
    const after=await snapshot(bundle(serialized));
    // Constructors restore absent optional properties as undefined; they have
    // identical semantics and serialize identically on disk and on the wire.
    assert.equal(after.length,379);assert.deepEqual(JSON.parse(JSON.stringify(after)),JSON.parse(JSON.stringify(before)));
    assert.deepEqual(errors,[]);
    log('PASS: physical opening clicks at both sizes, graft/conduit discovery, all 379 editor payloads and links round-trip');
    console.log('Passive routes UI PASS');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
