// Controlled real-client acceptance; ordinary critic play uses separate profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'passive-frontier-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../dist-preview'),server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,200));fs.writeFileSync(path.join(dir,'passive-frontier-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const timer=setTimeout(()=>app.exit(1),180000),url='http://127.0.0.1:'+server.address().port,results=[];
 try{
  await win.loadURL(url);let last;
  for(const id of ['warrior','magician','rogue']){
   const before=await run(id=>{
    window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});
    __game.devStartRun(id);__game.ui.hideAll();const w=__game.world();
    w.startWorldMass(42);w.player.invulnerable=true;w.meta.passivePoints=1;
    __game.ui.toggleTree();__game.step(2);
    const root=document.getElementById('passive-tree'),cards=[...root.querySelectorAll('[data-passive-choice]')];
    const graph=[...root.querySelectorAll('.tree-node.available')].map(n=>n.dataset.node);
    return {ids:cards.map(c=>c.dataset.passiveChoice),graph,text:cards.map(c=>c.textContent),points:w.meta.passivePoints};
   },id);
   assert.ok(before.ids.length>0);assert.deepEqual([...before.ids].sort(),before.graph.sort());assert.equal(before.points,1);
   await shot(id);
   const after=await run(()=>{
    const root=document.getElementById('passive-tree'),w=__game.world(),cards=[...root.querySelectorAll('[data-passive-choice]')];
    const card=cards.find(c=>c.textContent.includes('Change the Rhythm'))||cards.find(c=>c.textContent.includes('Allocate'));
    if(!card)throw Error('No ordinary starting passive');
    const id=card.dataset.passiveChoice,name=card.querySelector('strong').textContent,input=root.querySelector('#tree-search');
    input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));
    const filtered=[...root.querySelectorAll('[data-passive-choice]:not([hidden])')].map(c=>c.textContent);
    if(!filtered.length||!filtered.every(t=>t.toLowerCase().includes(name.toLowerCase())))throw Error('Choice search did not filter');
    input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
    card.click();__game.step(2);card.click();__game.step(1);
    return {id,owned:w.meta.allocated.has(id),named:!!root.querySelector('[data-passive-owned-node="'+id+'"]')?.textContent.includes(name),points:w.meta.passivePoints,pending:root.querySelectorAll('[data-passive-choice]').length,fatal:__game.crash().fatal};
   });
   assert.ok(after.owned&&after.named,'purchased passive remains named after the point is spent');assert.equal(after.points,0);assert.equal(after.pending,0);assert.equal(after.fatal,null);
   results.push({id,before,after});last=after;
  }
  await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);
  const continued=await run(async id=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
   const w=__game.world();__game.step(2);return {owned:w.meta.allocated.has(id),points:w.meta.passivePoints,fatal:__game.crash().fatal};
  },last.id);
  assert.ok(continued.owned);assert.equal(continued.points,0);assert.equal(continued.fatal,null);
  win.setContentSize(1000,720);
  await run(()=>{const w=__game.world();w.meta.passivePoints=1;__game.ui.toggleTree();__game.step(3);});
  await shot('small-viewport');
  const small=await run(()=>{
   const r=document.querySelector('[data-passive-frontier]').getBoundingClientRect();
   const svg=document.getElementById('tree-svg').getBoundingClientRect();
   return {inside:r.left>=0&&r.right<=innerWidth,graphBelow:svg.top>=r.bottom};
  });assert.ok(small.inside&&small.graphBelow);
  win.setContentSize(1280,850);
  for(const id of ['memorial-grove','broken-gate','cinderwatch']){
   await run(id=>{
    __game.ui.hideAll();const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content===id);
    w.player.invulnerable=true;w.landPartyAt(m.journey.local(p));m.update(w,true);__game.step(3);
   },id);await shot(id);
  }
  fs.writeFileSync(path.join(dir,'passive-frontier-ui.json'),JSON.stringify({results,continued,small},null,2));
  console.log('PASS native available-node parity, readable/searchable cards, single debit, Continue and small-viewport graph access for all starter classes');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
