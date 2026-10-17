// Native browser acceptance: unchanged country source, original geometry and
// real Firebolt input/hit routing. Controlled teleports and invulnerability only.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const fixtures=[{"kind":"accord","x":24,"y":-15,"at":{"dimension":"surface","cx":"137","cy":"-82","x":791.5682591870427,"y":408.2252762373537}},{"kind":"refrain","x":4,"y":44,"at":{"dimension":"surface","cx":"24","cy":"250","x":83.73617732897401,"y":719.6298936009407}},{"kind":"ember","x":76,"y":67,"at":{"dimension":"surface","cx":"430","cy":"378","x":748.6413792707026,"y":948.5643328819424}},{"kind":"tempo","x":86,"y":5,"at":{"dimension":"surface","cx":"486","cy":"31","x":959.6919559780508,"y":73.94211256876588}}];
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'native-courts-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..','dist-preview'),report={seed:713,fixtures,results:[],consoleErrors:[],methodology:'Natural seed713 provider and native source specs unchanged; controlled arrival teleports and invulnerable player. Native Firebolt casts, mana, projectile collision, puzzle hit/hum routing, clocks, effects, rewards and durable Continue remain enabled.'};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.consoleErrors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const save=()=>fs.writeFileSync(path.join(dir,'native-courts-ui.json'),JSON.stringify(report,null,2));
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Game unavailable');await new Promise(r=>setTimeout(r,250));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));const file=path.join(dir,'native-court-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const observe=()=>{const w=__game.world();window.__courtObserve={hits:0,hitSeats:{},payments:0,narration:[]};const h=w.puzzleStruck,p=w.completePuzzle,t=w.text;
  w.puzzleStruck=function(node,...args){if(node.puzzleNode&&this.puzzles.some(r=>r.owner===window.__courtOwner&&r.id===node.puzzleNode.id)){window.__courtObserve.hits++;const i=node.puzzleNode.idx;window.__courtObserve.hitSeats[i]=(window.__courtObserve.hitSeats[i]||0)+1;}return h.call(this,node,...args);};
  w.completePuzzle=function(r){if(r.owner===window.__courtOwner&&!r.done)window.__courtObserve.payments++;return p.call(this,r);};
  w.text=function(at,message,...args){if(/answer the refrain|listen…|refrain falters|refrain fades|measure breaks|accord slips|resolves!/.test(message))window.__courtObserve.narration.push(message);return t.call(this,at,message,...args);};
 };
 const snapshot=()=>{const w=__game.world(),owner=window.__courtOwner,r=w.puzzles.find(r=>r.owner===owner);if(!r)throw Error('Court missing');const b=w.massRuntime.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===owner);return{owner,kind:r.kind.id,hash:b.descriptor.hash,progress:b.changes.native.courts.puzzles[0].progress,geometry:r.nodes.map(n=>({def:n.defId,pos:n.pos,level:n.level})),at:r.at,xp:w.meta.xp,done:r.done,drops:w.drops.map(d=>({pos:d.pos,item:d.item.kind})),crash:__game.crash().fatal};};
 const waitAnswer=async()=>run(async()=>{const w=__game.world(),r=w.puzzles.find(r=>r.owner===window.__courtOwner);if(r.kind.id!=='refrain')return 0;let frames=0;try{__game.devInput(()=>({dx:0,dy:0,aim:r.at,held:[],edge:[]}));for(;r.state.phase==='play'&&frames<1600;frames++){__game.step(1);if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}if(r.state.phase!=='answer')throw Error('Native refrain never finished playback');return frames;});
 const strike=async index=>run(async index=>{const w=__game.world(),r=w.puzzles.find(r=>r.owner===window.__courtOwner),n=r.nodes[index],before=window.__courtObserve.hitSeats[index]||0,old=JSON.stringify(r.state);let frames=0;
  try{__game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[true,false,false],edge:[]}));for(;(window.__courtObserve.hitSeats[index]||0)===before&&frames<420;frames++){__game.step(1);if(w.projectiles.some(p=>p.caster===w.player))__game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[],edge:[]}));if(frames%30===0)await new Promise(r=>setTimeout(r,0));if(__game.crash().fatal)throw Error(__game.crash().fatal);}
   __game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[],edge:[]}));__game.step(2);
  }finally{__game.devInput(null);}
  if((window.__courtObserve.hitSeats[index]||0)===before)throw Error('Native Firebolt never hit node '+index);
  return {index,frames,before:JSON.parse(old),after:JSON.parse(JSON.stringify(r.state)),done:r.done,mana:w.player.mana,hitCount:window.__courtObserve.hits,targetHits:(window.__courtObserve.hitSeats[index]||0)-before};
 },index);
 const resume=async()=>{const before=await run(snapshot),owner=before.owner;await run(async()=>{__game.save();await __game.flushRunSave();});await boot();await run(async owner=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Durable Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();__game.world().player.invulnerable=true;window.__courtOwner=owner;},owner);const after=await run(snapshot);assert.deepEqual(after,before,'exact saved ring, source, progress, reward contents and world clock must Continue');await run(observe);return after;};
 const timer=setTimeout(()=>{save();console.error('Native court browser timeout');app.exit(1);},600000);
 try{
  await boot();
  for(const f of fixtures){const result={kind:f.kind,hits:[]};report.results.push(result);save();
   result.arrival=await run(f=>{__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(713);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
    const m=w.massRuntime,owner=JSON.stringify(['expedition:713','native-country',1,'surface',String(f.x),String(f.y)]),p=m.nativeCountry.near(f.at,0).find(p=>p.id===owner);if(!p)throw Error('Natural court provider changed');if(!m.nativeFeatures.intersects(f.at,0))throw Error('Natural court source refused');
    const pos={x:Number(BigInt(f.at.cx)-BigInt(m.origin.cx))*960+f.at.x,y:Number(BigInt(f.at.cy)-BigInt(m.origin.cy))*960+f.at.y};w.landPartyAt(pos);m.update(w,true);const r=w.puzzles.find(r=>r.owner===owner);if(!r||r.kind.id!==f.kind)throw Error('Natural court inner changed');
    if(!w.walk.isWalkable(pos.x,pos.y)||w.pointInSolid(pos.x,pos.y,w.player.radius))throw Error('Natural court center is not a legal firing stand');w.landPartyAt(pos);window.__courtOwner=owner;
    return {owner,request:p.request,stand:{...w.player.pos},source:JSON.parse(JSON.stringify(r.spec)),positions:r.nodes.map(n=>n.pos),fatal:__game.crash().fatal};
   },f);assert.equal(result.arrival.fatal,null);await run(observe);result.arrivalImage=await shot(f.kind+'-arrival');
   await waitAnswer();
   if(f.kind==='refrain'||f.kind==='tempo'){
    const wrong=await run(()=>{const r=__game.world().puzzles.find(r=>r.owner===window.__courtOwner);return r.kind.id==='tempo'?r.state.order[1]:(r.state.seq[0]+1)%r.nodes.length;});result.wrong=await strike(wrong);assert.equal(result.wrong.done,false);result.wrongImage=await shot(f.kind+'-mistake');await waitAnswer();
   }
   const first=await run(()=>{const r=__game.world().puzzles.find(r=>r.owner===window.__courtOwner);return r.kind.id==='refrain'?r.state.seq[0]:r.kind.id==='tempo'?r.state.order[0]:0;});result.hits.push(await strike(first));result.partial=await resume();assert.equal(result.partial.done,false);result.partialImage=await shot(f.kind+'-partial-continue');save();
   for(let guard=0;guard<24;guard++){
    const next=await run(()=>{const r=__game.world().puzzles.find(r=>r.owner===window.__courtOwner);if(r.done)return -1;if(r.kind.id==='refrain')return r.state.phase==='answer'?r.state.seq[r.state.progress]:-2;if(r.kind.id==='tempo')return r.state.order[r.state.progress];if(r.kind.id==='ember')return r.state.litUntil.findIndex(t=>t<=__game.world().time);const pairs=r.nodes.length/2,p=r.state.bound.findIndex(v=>!v),pending=r.state.pending[p];return pending?(pending.half+pairs)%r.nodes.length:p;});
    if(next===-1)break;if(next===-2){await waitAnswer();continue;}result.hits.push(await strike(next));
   }
   result.solved=await run(snapshot);assert.equal(result.solved.done,true);assert.equal(result.solved.xp,result.partial.xp,'native puzzle has no invented XP');result.observation=await run(()=>window.__courtObserve);assert.equal(result.observation.payments,1);assert.deepEqual(result.observation.narration,[]);result.solvedImage=await shot(f.kind+'-solved');result.solvedContinue=await resume();
   await strike(0);const quietAfter=await run(snapshot);assert.equal(quietAfter.done,true);assert.equal((await run(()=>window.__courtObserve)).payments,0,'striking a continued solved ring cannot repay');result.noRepayment=true;save();console.log('COURT_PASS '+f.kind);
  }
  assert.deepEqual(report.consoleErrors,[]);save();console.log('PASS four natural court families through native Firebolt, wrong/correct notes, quiet visuals, exact partial/solved durable Continue and one-shot native rewards');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.error=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});
