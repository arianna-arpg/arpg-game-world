// Controlled service/quest coexistence using the actual native dialogue reader.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'service-prompts-before':'service-prompts';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/service-prompts-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const box=()=>{
  const root=document.getElementById('npc-dialogue'),w=__game.world();
  return {open:!root.hidden,text:root.querySelector('.dialogue-accessible').textContent,ink:root.querySelector('.dialogue-ink').textContent,
   rect:root.getBoundingClientRect().toJSON(),flasks:w.meta.items.filter(i=>i.gem?.kind==='skill'&&['life_flask','mana_flask'].includes(i.gem.skillId)).map(i=>i.gem.skillId),
   quests:w.activeQuests.map(q=>q.questId),lesson:w.mireilleGiftLesson(),fatal:__game.crash().fatal};
 };
 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
  });
  for(const ordinary of [false,true]){
   await run(ordinary=>{
    __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();
    if(ordinary){w.massRuntime=null;w.loadZone('lastlight');}else w.startWorldMass(42);
    w.player.invulnerable=true;
    const npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.landPartyAt(npc.pos,{tier:npc.tier});
    __game.step(240);
   },ordinary);
   const pages=[];
   for(let i=0;i<12;i++){
    const state=await run(box);assert.equal(state.fatal,null);
    if(state.open){
     pages.push(state.text);assert.ok(state.rect.x>=0&&state.rect.right<=1280&&state.rect.y>=0&&state.rect.bottom<=850);
     if((/Find your flasks/.test(state.text)||legacy&&i===0)&&!results.some(r=>r.ordinary===ordinary)){
      // Finish this page's typing without advancing it, for inspectable ink.
      if(state.ink!==state.text)await run(()=>{document.querySelector('.dialogue-next').click();__game.step(1);});
      await shot(ordinary?'ordinary':'continuous');results.push({ordinary,evidence:await run(box)});
     }
     await run(()=>{document.querySelector('.dialogue-next').click();__game.step(2);});
    }else{await run(()=>__game.step(30));}
   }
   const final=await run(box);
   assert.deepEqual([...final.flasks].sort(),['life_flask','mana_flask']);assert.equal(final.lesson,'learn');
   assert.equal(final.quests.includes('frontier_western_watch'),!ordinary,'native quest gate and gift both still operate');
   const taught=pages.some(p=>/Find your flasks.*pack/.test(p));
   assert.equal(taught,!legacy,'service guidance is visible through the actual paged reader');
   if(!ordinary)assert.ok(pages.some(p=>/work for you|hunts await/.test(p)),'additional quest prompt remains a readable page');
   results.push({ordinary,pages,final});
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.filter(r=>r.pages).map(r=>({ordinary:r.ordinary,pages:r.pages,flasks:r.final.flasks,quests:r.final.quests}))));
  console.log(legacy?'PASS prior client reproduces lost native service guidance in both geographies':'PASS actual native flask teaching and quest pages coexist; ordinary geography retains the inn service without experimental offers');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
