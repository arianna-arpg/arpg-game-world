// Build first. Hidden renderer, isolated profile and saves, real tree clicks.
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'passive-attributes-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'passive-attributes-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
const bundle = (contents, globalName) => buildSync({ stdin: { contents, resolveDir: path.resolve(__dirname, '../src/data'), loader: 'ts' }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName }).outputFiles[0].text;
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'passive-attributes-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (result?.qaError) throw Error(result.qaError); return result;
  };
  const capture = async name => {
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(dir, `passive-attributes-${name}.png`), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    const data = bundle("export { PASSIVE_NODES, PASSIVE_ADJACENCY } from './passives'; export { passiveWalkingGraph } from './passiveTopology'; export { choicePathing } from './passiveChoices';", '__attributeData');
    await js(`${data}\nwindow.attributeData=__attributeData; void 0;`);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      const setup = await js(`(() => {
        __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();
        const w=__game.world(),ui=__game.ui,{PASSIVE_NODES:N,passiveWalkingGraph,choicePathing}=attributeData;
        w.loadZone('lastlight');w.player.invulnerable=true;w.meta.passivePoints=50;
        const f=w.fonts[0];w.player.pos={...f.pos};w.player.tier=f.tier||0;
        const graph=passiveWalkingGraph(N),queue=[...w.meta.allocated],seen=new Set(queue),parents={};let target;
        for(let i=0;i<queue.length&&!target;i++)for(const next of graph[queue[i]]||[]){
          if(seen.has(next))continue;seen.add(next);parents[next]=queue[i];queue.push(next);
          if(choicePathing(N[next])){target=next;break;}
        }
        const route=[];for(let id=target;!w.meta.allocated.has(id);id=parents[id])route.unshift(id);
        for(const id of route.slice(0,-1))if(!w.allocateNode(id))throw Error('Route refused '+id);
        ui.toggleTree();const node=N[target],b=ui.treeBox;
        ui.treeZoom=5;ui.treePan={x:node.x-b.minX-b.w/2,y:node.y-b.minY-b.h/2};ui.refreshTree();
        window.attributeQA={id:target,points:w.meta.passivePoints,attrs:{...w.meta.attrs}};
        const el=document.querySelector('[data-node="'+target+'"]');el.dispatchEvent(new MouseEvent('click'));
        const pop=document.querySelector('.choice-popup'),r=pop.getBoundingClientRect();
        return {count:pop.querySelectorAll('.choice-opt').length,ring:el.getAttribute('stroke-dasharray'),points:w.meta.passivePoints,
          owned:w.meta.allocated.has(target),inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
          intelligence:pop.querySelector('[data-opt="intelligence"]').textContent,
          prowess:pop.querySelector('[data-opt="prowess"]').textContent};
      })()`);
      log(setup);assert.equal(setup.count,10);assert(setup.ring&&setup.inside);assert.equal(setup.owned,false);
      assert(setup.intelligence.includes('+2 Intelligence')&&setup.intelligence.toLowerCase().includes('mana'));
      assert(setup.prowess.includes('+0.004 Critical Strike Multiplier'));
      await capture('choices-'+width);
      await js('new Promise(resolve=>requestAnimationFrame(resolve))');
      const cancel = await js(`(() => { document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return {closed:!document.querySelector('.choice-popup'),points:__game.world().meta.passivePoints===attributeQA.points}; })()`);
      assert(cancel.closed&&cancel.points);
      const selected = await js(`(() => {
        const w=__game.world(),ui=__game.ui,q=attributeQA;
        document.querySelector('[data-node="'+q.id+'"]').dispatchEvent(new MouseEvent('click'));
        const pop=document.querySelector('.choice-popup'),input=pop.querySelector('.choice-search');
        input.value='Intelligence';input.dispatchEvent(new Event('input'));
        const visible=[...pop.querySelectorAll('.choice-opt')].filter(b=>!b.hidden).map(b=>b.dataset.opt);
        pop.querySelector('[data-opt="intelligence"]').click();
        return {visible,choice:w.meta.choices[q.id],delta:w.meta.attrs.intelligence-q.attrs.intelligence,
          cost:q.points-w.meta.passivePoints,closed:!document.querySelector('.choice-popup'),tooltip:ui.passiveNodeTooltip(q.id).description};
      })()`);
      log(selected);assert.deepEqual(selected.visible,['intelligence']);assert.deepEqual(selected.choice,['intelligence']);
      assert.equal(selected.delta,2);assert.equal(selected.cost,1);assert(selected.closed&&selected.tooltip.includes('✓ Intelligence'));
      const refunded = await js(`(() => {
        const w=__game.world(),q=attributeQA;
        document.querySelector('[data-passive-refund-mode]').click();
        document.querySelector('[data-node="'+q.id+'"]').dispatchEvent(new MouseEvent('click'));
        document.querySelector('[data-passive-refund-mode]').click();
        document.querySelector('[data-node="'+q.id+'"]').dispatchEvent(new MouseEvent('click'));
        const pop=document.querySelector('.choice-popup');pop.querySelector('[data-opt="vitality"]').scrollIntoView({block:'nearest'});
        return {points:w.meta.passivePoints===q.points,removed:!w.meta.choices[q.id],restored:w.meta.attrs.intelligence===q.attrs.intelligence};
      })()`);
      assert(refunded.points&&refunded.removed&&refunded.restored);
      await capture('vitality-'+width);
      const repick = await js(`(() => {
        document.querySelector('.choice-popup [data-opt="vitality"]').click();
        const w=__game.world(),q=attributeQA;return {choice:w.meta.choices[q.id],delta:w.meta.attrs.vitality-q.attrs.vitality,points:w.meta.passivePoints===q.points-1,fatal:__game.crash().fatal};
      })()`);
      assert.deepEqual(repick.choice,['vitality']);assert.equal(repick.delta,2);assert(repick.points);assert.equal(repick.fatal,null);
    }
    const editor = buildSync({ entryPoints:[path.resolve(__dirname,'../src/dev/passiveEditor.ts')], bundle:true, write:false, platform:'browser', format:'iife', globalName:'__attributeEditor' }).outputFiles[0].text;
    const serialized = await js(`(() => { ${editor}\n__attributeEditor.mountPassiveEditor(__game.ui);return window.__passiveEditor.serializeTree(); })()`);
    assert(serialized.includes("import './passiveAttributes';"));assert(serialized.includes('allocatedDefault:'));
    const snapshot = code => js(`(() => { ${code}\nconst {PASSIVE_NODES:N,PASSIVE_ADJACENCY:A}=__attributeRoundtrip;return Object.values(N).filter(n=>n.choice?.group.startsWith('attribute_training')).map(n=>({...n,links:[...new Set(A[n.id])].sort()})).sort((a,b)=>a.id.localeCompare(b.id)); })()`);
    const before = await snapshot(bundle("export * from './passives';", '__attributeRoundtrip'));
    const after = await snapshot(bundle(serialized, '__attributeRoundtrip'));
    assert.equal(before.length,136);assert.deepEqual(after,before);
    log('PASS: real clicks, cancel, all ten options, filter, exact gains/cost, Font refund/reselection, viewport containment and 136 editor round trips');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error => { log(error.stack??String(error));app.exit(1); });
