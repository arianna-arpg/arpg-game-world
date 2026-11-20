// Native hidden-client acceptance and review images. No personal saves/profile.
const {app,BrowserWindow} = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {buildSync} = require('esbuild');
const {makeTempDir} = require('../scripts/temp-dir.cjs');
const {startGameServer} = require('../launcher/server.cjs');
const scratch = makeTempDir('hollow-passive-nodes-');
const dir = path.join(__dirname,'reports','passive-node-art'); fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(scratch,'profile')); app.disableHardwareAcceleration();
const report = {checks:[],errors:[]};
const write = () => fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
const wait = ms => new Promise(r => setTimeout(r,ms));
app.whenReady().then(async () => {
  const timer = setTimeout(() => {report.errors.push('timeout');write();app.exit(1);},150000);
  const server = await startGameServer({root:path.resolve(process.argv[2] || 'balance/reports/passive-node-art-dist'),savesDir:path.join(scratch,'saves')});
  const win = new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  win.webContents.on('console-message',e => {if(e.level === 'error') report.errors.push(e.message);});
  const run = (fn,...args) => win.webContents.executeJavaScript('('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')');
  const click = sel => run(s => {const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click();},sel);
  const shot = async (name,selector) => {
    await wait(120);
    const rect = await run(s => {const r=document.querySelector(s).getBoundingClientRect();return {x:Math.max(0,Math.floor(r.x)),y:Math.max(0,Math.floor(r.y)),width:Math.min(innerWidth-Math.ceil(r.x),Math.floor(r.width)),height:Math.min(innerHeight-Math.ceil(r.y),Math.floor(r.height))};},selector);
    fs.writeFileSync(path.join(dir,name+'.png'),(await win.webContents.capturePage(rect)).toPNG());
  };
  const boot = async () => {
    await win.loadURL(server.url); await run(() => __game.hydrated());
    await run(() => {Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);__game.world().player.invulnerable=true;});
  };
  try {
    await boot();
    const helper=buildSync({stdin:{contents:`export {VOCATIONS} from './src/data/vocations'; export {CLASSES} from './src/data/classes'; export {PASSIVE_NODE_SILHOUETTES,PASSIVE_NODE_PRESETS,resolvePassiveNodeVisual} from './src/ui/passiveNodeConfig';export {passiveNodeArt} from './src/ui/passiveNodeArt';`,resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'NodeArtQA'}).outputFiles[0].text;
    await win.webContents.executeJavaScript(helper);
    assert(await run(() => Object.values(NodeArtQA.PASSIVE_NODE_SILHOUETTES).every(s => {
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',s.path);const length=p.getTotalLength();
      for(let t=0;t<=length;t+=.1){const at=p.getPointAtLength(t);if(Math.hypot(at.x-12,at.y-12)>12.02)return false;}return true;
    })), 'all silhouette contours stay inside shared node radius');
    await run(() => {__game.world().grantVocation('warbringer');__game.world().meta.vocationPoints=10;__game.ui.toggleTree();__game.ui.folioSync();});
    const initial = await run(() => JSON.stringify(__game.settings().passiveNodeStyle));
    await run(() => __game.ui.showWardrobe()); await click('[data-wd-passives]');
    await shot('options','#escape-menu');
    for(const preset of ['seals','crests','sigils']) {
      await click('[data-passive-preset="'+preset+'"]');
      assert.equal(await run(() => JSON.stringify(__game.settings().passiveNodeStyle)),initial,'draft cannot change live settings');
      assert.equal(await run(id => document.querySelector('[data-passive-preset="'+id+'"]').getAttribute('aria-pressed'),preset),'true');
      await shot('preview-'+preset,'#escape-menu');
    }
    await run(() => {const s=document.querySelector('[data-passive-choice="silhouette"]');s.value='shield';s.dispatchEvent(new Event('change'));});
    await click('[data-passive-save]');
    assert.deepEqual(await run(() => __game.settings().passiveNodeStyle),{material:'luminous',silhouette:'shield',symbols:'bold',palette:'vocation'});
    await click('[data-passive-back]'); await click('[data-wd-passives]');
    assert.equal(await run(() => document.querySelector('[data-passive-choice="silhouette"]').value),'shield');
    // Leave a different draft unsaved, and verify it cannot leak on navigation.
    await click('[data-passive-preset="seals"]'); await click('[data-passive-back]'); await click('[data-wd-passives]');
    assert.equal(await run(() => document.querySelector('[data-passive-choice="material"]').value),'luminous');
    await run(async () => {for(const option of document.querySelector('[data-passive-vocation]').options){const s=document.querySelector('[data-passive-vocation]');s.value=option.value;s.dispatchEvent(new Event('change'));if(document.querySelectorAll('[data-passive-tree-preview] .passive-node-art').length!==NodeArtQA.VOCATIONS[option.value].tree.length+1)throw Error(option.value);}});
    report.checks.push('31 preview trees; three presets; component mixing, explicit save and discarded drafts');
    await win.setSize(1000,720); await shot('options-narrow','#escape-menu');
    assert(await run(() => {const page=document.querySelector('.wardrobe');return page.scrollWidth<=page.clientWidth+1 && document.querySelector('[data-passive-back]').getBoundingClientRect().bottom<=innerHeight;}),'narrow preview scrolls with visible Back');
    await win.setSize(1440,1000);
    await click('[data-passive-preset="crests"]'); await click('[data-passive-save]');
    await run(() => {__game.ui.hideEscapeMenu();if(!__game.ui.treeOpen)__game.ui.toggleTree();__game.ui.refreshTree();__game.ui.folioSync();});
    const vocationIds = await run(() => Object.keys(NodeArtQA.VOCATIONS));
    for(const id of vocationIds) {
      const result=await run(id => {
        const w=__game.world(),m=w.meta,v=NodeArtQA.VOCATIONS[id];m.classDef=NodeArtQA.CLASSES.find(c=>c.id===v.classId);m.vocations=[];
        for(const key of m.allocated)if(key.startsWith('voc_'))m.allocated.delete(key);
        w.grantVocation(id);__game.ui.centerTreeOnStart();__game.ui.refreshTree();__game.ui.folioSync();
        const nodes=[...document.querySelectorAll('#tree-svg .passive-node-hit')];
        return {count:nodes.length,expected:v.tree.length+1,hit:nodes.every(n=>{const b=n.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===n;}),icons:[...document.querySelectorAll('#tree-svg .passive-node-art')].every(a=>!!a.dataset.passiveIcon && a.querySelectorAll('path').length>=4)};
      },id);
      assert.equal(result.count,result.expected,id); assert(result.hit && result.icons,id+' keeps visible symbols and direct targets');
      if(['warbringer','gravebinder','greenwarden','ashborn','swarmlord'].includes(id))await shot('tree-'+id,'#passive-tree');
    }
    report.checks.push('31 real Vocation grants render all 280 icons with unobstructed native hit circles');
    await run(() => {__game.ui.treeSearch='Dockside';__game.ui.applyTreeSearch();});
    assert(await run(() => document.querySelectorAll('#tree-svg .passive-node-visual .search-hit').length===1 && [...document.querySelectorAll('#tree-svg .passive-node-visual')].every(g=>g.querySelector('.search-hit') ? +getComputedStyle(g.querySelector('.passive-node-art')).opacity===1 : +getComputedStyle(g.querySelector('.passive-node-art')).opacity<.2)),'search lights its match and dims other artwork with its hit circle');
    await run(() => {__game.ui.treeSearch='';__game.ui.applyTreeSearch();});
    if(process.argv.includes('--review')) {
      // A comparison sheet uses the production vector renderer, not mock icons.
      const sheet=await run(() => {
        const ids=['warbringer','gravebinder','greenwarden','stormweaver','ashborn','swarmlord'];
        return `<html><head><style>body{margin:0;padding:32px;background:#0c131b;color:#ebe3d5;font:14px Georgia}h1{font-weight:normal;font-size:30px;margin:0 0 8px}p{color:#aab7bc;margin:0 0 24px;font:14px Arial}.grid{display:grid;grid-template-columns:170px repeat(3,1fr);gap:12px;align-items:center}.head{font-size:19px;color:#e5d6b9;padding:12px 0}.label{font-size:18px}.label small{display:block;color:#aab7bc;font:11px Arial;margin-top:8px}.cell{background:#111e26;border:1px solid #32404a;padding:8px}.cell svg{display:block;width:100%;height:78px}.foot{margin-top:20px}</style></head><body><h1>Marks of your calling</h1><p>Three directions · Mix surfaces, silhouettes, symbols and palettes in Wardrobe → Passive nodes</p><div class="grid"><div></div>${NodeArtQA.PASSIVE_NODE_PRESETS.map(p=>'<div class="head">'+p.name+'</div>').join('')}${ids.map(id=>{
          const v=NodeArtQA.VOCATIONS[id];return `<div class="label" style="color:${v.color}">${v.name}<small>Emblem · First node · Keystone</small></div>`+NodeArtQA.PASSIVE_NODE_PRESETS.map(p=>`<div class="cell"><svg viewBox="0 0 240 72">${['root','s1','k1'].map((local,i)=>NodeArtQA.passiveNodeArt(40+i*80,36,i===1?23:27,NodeArtQA.resolvePassiveNodeVisual({id:'voc_'+id+'_'+local,localId:local,kind:i===0?'vocation':i===1?'small':'keystone',group:'vocation:'+id}),p.style,{allocated:i===0,available:i===1,keystone:i===2})).join('')}</svg></div>`).join('');}).join('')}</div><p class="foot">Original Hollow Wake symbols · Shared palette and frame per Vocation, individual symbol per node</p></body></html>`;
      });
      const gallery=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{offscreen:true,backgroundThrottling:false}});
      try{await gallery.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(sheet));await wait(100);fs.writeFileSync(path.join(dir,'directions.png'),(await gallery.webContents.capturePage()).toPNG());}finally{gallery.destroy();}
    }
    const saved = await run(() => JSON.stringify(__game.settings().passiveNodeStyle));
    await boot(); assert.equal(await run(() => JSON.stringify(__game.settings().passiveNodeStyle)),saved,'saved style survives reload');
    report.checks.push('node contour bounds, narrow controls, search and persisted style after reload');
    assert.deepEqual(report.errors,[]); write(); console.log(JSON.stringify(report,null,2));
  } catch(error) {report.errors.push(error.stack || String(error));write();console.error(error);process.exitCode=1;}
  finally {clearTimeout(timer);win.destroy();server.server.close();app.exit(process.exitCode || 0);}
}).catch(error => {report.errors.push(error.stack || String(error));write();console.error(error);app.exit(1);});
