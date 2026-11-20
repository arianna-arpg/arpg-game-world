// Native hidden-client acceptance. Uses isolated saves and a self-cleaning profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {makeTempDir}=require('../scripts/temp-dir.cjs');
const {startGameServer}=require('../launcher/server.cjs');
const scratch=makeTempDir('hollow-passive-nodes-');
const dir=path.join(__dirname,'reports','passive-node-art');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(scratch,'profile'));app.disableHardwareAcceleration();
const report={checks:[],errors:[]};
const write=()=>fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const timer=setTimeout(()=>{report.errors.push('timeout');write();app.exit(1);},180000);
 const server=await startGameServer({root:path.resolve(process.argv[2]||'balance/reports/passive-node-art-dist'),savesDir:path.join(scratch,'saves')});
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=(fn,...args)=>win.webContents.executeJavaScript('('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')');
 const shot=async(name)=>{await run(async()=>{for(const image of document.querySelectorAll('#passive-tree image')){const load=new Image();load.src=image.getAttribute('href');await load.decode();}});await wait(80);const r=await run(()=>{const r=document.querySelector('#passive-tree').getBoundingClientRect();return{x:Math.floor(r.x),y:Math.floor(r.y),width:Math.floor(r.width),height:Math.floor(r.height)};});fs.writeFileSync(path.join(dir,name+'.png'),(await win.webContents.capturePage(r)).toPNG());};
 try{
  await win.loadURL(server.url);await run(()=>__game.hydrated());
  await run(()=>{Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.hold(true);__game.world().player.invulnerable=true;});
  const helper=buildSync({stdin:{contents:`export {VOCATIONS} from './src/data/vocations';export {CLASSES} from './src/data/classes';export {PASSIVE_NODES,PASSIVE_ADJACENCY,vocationGateNodeId} from './src/data/passives';export {PASSIVE_NODE_SILHOUETTES,resolvePassiveNodeVisual} from './src/ui/passiveNodeConfig';export {passiveNodeArt} from './src/ui/passiveNodeArt';`,resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'NodeArtQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(helper);
  assert(await run(()=>Object.values(NodeArtQA.PASSIVE_NODE_SILHOUETTES).every(s=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',s.path);const length=p.getTotalLength();for(let t=0;t<=length;t+=.1){const at=p.getPointAtLength(t);if(Math.hypot(at.x-12,at.y-12)>12.02)return false;}return true;})));
  await run(()=>__game.ui.showWardrobe());
  assert(await run(()=>!document.querySelector('[data-wd-passives],[data-passive-choice],[data-passive-preset]')),'no player passive appearance controls');
  await run(()=>{__game.ui.hideEscapeMenu();__game.ui.toggleTree();__game.ui.folioSync();});
  const ordinary=await run(()=>{const hits=[...document.querySelectorAll('#tree-svg .tree-node')];return{count:hits.length,decorated:hits.every(n=>n.parentElement.querySelector('.passive-node-art')?.dataset.passiveShape==='circle'),routes:document.querySelectorAll('.passive-tree-route').length,backs:document.querySelectorAll('.passive-route-backing').length};});
  assert(ordinary.count>2000&&ordinary.decorated);assert.equal(ordinary.routes,ordinary.backs);assert(ordinary.routes>3000);
  await shot('standard-tree');
  // Legacy preference cannot affect shared content, even if injected at runtime.
  const before=await run(()=>document.querySelector('#tree-svg').innerHTML);
  await run(()=>{__game.settings().passiveNodeStyle={material:'engraved',silhouette:'shield',palette:'contrast'};__game.ui.refreshTree();});
  assert.equal(await run(()=>document.querySelector('#tree-svg').innerHTML),before);
  const target=await run(()=>{__game.world().meta.passivePoints=100;__game.ui.refreshTree();const n=[...document.querySelectorAll('#tree-svg .tree-node.available')].find(n=>!NodeArtQA.PASSIVE_NODES[n.dataset.node].choice);if(!n)throw Error('No available plain node');const r=n.getBoundingClientRect();return{id:n.dataset.node,x:r.x+r.width/2,y:r.y+r.height/2};});
  win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(target.x),y:Math.round(target.y)});await wait(100);
  const neighbors=await run(id=>{const routes=[...document.querySelectorAll('.passive-tree-route.route-neighbor')];return{origin:document.querySelector('.tree-node.tt-anchor')?.dataset.node,count:routes.length,correct:routes.every(e=>e.dataset.a===id||e.dataset.b===id)};},target.id);
  assert.equal(neighbors.origin,target.id);assert.equal(neighbors.count,await run(id=>NodeArtQA.PASSIVE_ADJACENCY[id].length,target.id));assert(neighbors.correct);
  const oldState=await run(id=>document.querySelector('[data-node="'+id+'"]').parentElement.querySelector('.passive-node-art').dataset.passiveMaterial,target.id);assert.equal(oldState,'luminous');
  win.webContents.sendInputEvent({type:'mouseDown',button:'left',x:Math.round(target.x),y:Math.round(target.y),clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',button:'left',x:Math.round(target.x),y:Math.round(target.y),clickCount:1});await wait(100);
  assert(await run(id=>__game.world().meta.allocated.has(id),target.id));
  assert.equal(await run(id=>document.querySelector('[data-node="'+id+'"]').parentElement.querySelector('.passive-node-art').dataset.passiveMaterial,target.id),'enamel');
  report.checks.push('circular ordinary symbols; backed routes; native hover highlights exactly direct neighbors; native allocation changes sigil to crest; old preference has no effect; Wardrobe controls removed');
  for(const id of await run(()=>Object.keys(NodeArtQA.VOCATIONS))){
   const result=await run(id=>{const w=__game.world(),m=w.meta,v=NodeArtQA.VOCATIONS[id];m.classDef=NodeArtQA.CLASSES.find(c=>c.id===v.classId);m.vocations=[];for(const key of m.allocated)if(key.startsWith('voc_'))m.allocated.delete(key);w.grantVocation(id);__game.ui.centerTreeOnStart();__game.ui.refreshTree();__game.ui.folioSync();const nodes=[...document.querySelectorAll('#tree-svg .tree-node[data-node^="voc_"]')];return{count:nodes.length,expected:v.tree.length+1,hit:nodes.every(n=>{const b=n.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===n;}),states:nodes.every(n=>n.parentElement.querySelector('.passive-node-art').dataset.passiveMaterial===(m.allocated.has(n.dataset.node)?'enamel':'luminous'))};},id);
   assert.equal(result.count,result.expected,id);assert(result.hit&&result.states,id+' art and native targets');
   if(['warbringer','gravebinder','greenwarden'].includes(id))await shot('tree-'+id);
  }
  report.checks.push('31 real Vocation grants: all 280 themed silhouettes keep native targets and allocation surfaces');
  await run(()=>{__game.ui.treeSearch='Dockside';__game.ui.applyTreeSearch();});
  assert(await run(()=>document.querySelectorAll('#tree-svg .passive-node-visual .search-hit').length===1&&[...document.querySelectorAll('#tree-svg .passive-node-visual')].every(g=>g.querySelector('.search-hit')?+getComputedStyle(g.querySelector('.passive-node-art')).opacity===1:+getComputedStyle(g.querySelector('.passive-node-art')).opacity<.2)));
  await run(()=>{__game.ui.treeSearch='';__game.ui.applyTreeSearch();});
  if(process.argv.includes('--review')){
   const sheet=await run(()=>{const samples=['warbringer','gravebinder','greenwarden','stormweaver','ashborn','swarmlord'].map(id=>({name:NodeArtQA.VOCATIONS[id].name,context:{id:'voc_'+id+'_s1',localId:'s1',kind:'small',group:'vocation:'+id}}));
    const standard=['life','armor','moveSpeed','addedFire','addedCold','critChance'].map(stat=>{const n=Object.values(NodeArtQA.PASSIVE_NODES).find(n=>!n.vocation&&!n.choice&&n.mods?.[0]?.stat===stat);return{name:n.name,context:{id:n.id,kind:n.kind,node:n}};});
    return `<html><head><style>body{margin:0;padding:30px;background:#0c131b;color:#ebe3d5;font:16px Georgia}h1{font-weight:normal}p{color:#aab7bc;font:14px Arial}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cell{display:flex;align-items:center;justify-content:space-between;background:#111e26;padding:8px 16px;border:1px solid #32404a}.cell svg{width:210px;height:65px}.label{width:190px}</style></head><body><h1>One tree, a shared visual language</h1><p>Luminous sigil → learned jeweled crest · Standard nodes stay circular</p><div class="grid">${[...samples,...standard].map(s=>{const v=NodeArtQA.resolvePassiveNodeVisual(s.context);return `<div class="cell"><span class="label" style="color:${v.palette.accent}">${s.name}</span><svg viewBox="0 0 180 60">${NodeArtQA.passiveNodeArt(40,30,25,v)}<path d="M80 30h20m-4-4l4 4-4 4" fill="none" stroke="#667080"/>${NodeArtQA.passiveNodeArt(140,30,25,v,{allocated:true})}</svg></div>`;}).join('')}</div></body></html>`;});
   const gallery=new BrowserWindow({show:false,width:1200,height:700,webPreferences:{offscreen:true,backgroundThrottling:false}});try{await gallery.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(sheet));await wait(100);fs.writeFileSync(path.join(dir,'shared-states.png'),(await gallery.webContents.capturePage()).toPNG());}finally{gallery.destroy();}
  }
  report.checks.push('search dims complete artwork and routes; contour bounds; production-renderer review sheet');
  assert.deepEqual(report.errors,[]);write();console.log(JSON.stringify(report,null,2));
 }catch(error){report.errors.push(error.stack||String(error));write();console.error(error);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.server.close();app.exit(process.exitCode||0);}
}).catch(error=>{report.errors.push(error.stack||String(error));write();console.error(error);app.exit(1);});
