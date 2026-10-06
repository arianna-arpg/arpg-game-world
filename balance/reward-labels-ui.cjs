// Controlled renderer regression for restoring main's world text. Uses an
// isolated profile and preview build; no ordinary-input playthrough claim.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const dir=path.join(__dirname,'reports'),tag='fixed-world-text';
fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
const source=fs.readFileSync(path.join(__dirname,'../src/render/renderer.ts'),'utf8').replace(/\r\n/g,'\n');
const main=cp.execFileSync('git',['show','651d7e05:src/render/renderer.ts'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}).replace(/\r\n/g,'\n');
const block=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
for(const [start,end] of [['  private drawEliteNameHover','  /** The pad\'s VISIBLE cursor:'],['  private drawDrops','  private drawTownPortals'],['  private drawTexts','    ctx.globalAlpha = 1;']]){
 assert.equal(block(source,start,end),block(main,start,end),'original main painter: '+start);
}
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/fixed-world-text-dist');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world(),r=__game.renderer;
   const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch'),at=m.journey.local(place);
   w.landPartyAt({x:at.x,y:at.y+350});m.update(w,true);w.player.invulnerable=true;
   w.actors=[w.player];w.drops=[];w.texts=[];w.notices=[];for(const kind of ['dmg','gains','xp','drop','pickup','progression'])__game.settings().floatKinds[kind]=true;
   const enemy=w.createMonster('gnoll_prowler',1,'enemy');enemy.name='QA named prowler';enemy.pos={x:w.player.pos.x+90,y:w.player.pos.y+20};w.actors.push(enemy);
   window.fixedQA={enemy};
   for(const [i,name] of ['Windtrews','Brigandine','Rough Memory'].entries()){
    const item={uid:99111+i,baseId:['legs_evasion_es','chest_armor_evasion','rough_memory'][i],name,ilvl:1,tier:1,rarity:'common',baseRoll:0,implicitRolls:[],affixes:[],...(i===2?{mem:[{d:'chest',s:6412}]}:{})};
    w.dropGearAt({x:w.player.pos.x+(i-1)*130,y:w.player.pos.y+90},item,undefined,true);
   }
   for(const d of w.drops)d.bob=0;
   for(const [i,kind]of ['dmg','gains','xp','pickup','progression'].entries())w.text({...enemy.pos},'QA float '+kind,'#fff',14,kind,10);
   r.render(w);r.hudMouse=r.toScreen(enemy.pos);
  });
  results.anchors=await run(()=>{
   const w=__game.world(),r=__game.renderer,c=r.ctx,rows=[],links=[];
   const fill=c.fillText,stroke=c.stroke,move=c.moveTo,line=c.lineTo,reveal=r.labelRevealAt;
   let segment=[];c.moveTo=function(x,y){segment=[{x,y}];return move.call(this,x,y);};c.lineTo=function(x,y){segment.push({x,y});return line.call(this,x,y);};
   c.stroke=function(...args){if(c.strokeStyle==='#b5aca0')links.push(segment.slice());return stroke.apply(this,args);};
   c.fillText=function(text,x,y,...rest){rows.push({text:String(text),x,y,font:c.font,color:c.fillStyle,alpha:c.globalAlpha});return fill.call(this,text,x,y,...rest);};
   const state=()=>JSON.stringify([w.time,w.player.pos,w.player.life,w.texts,w.drops,w.meta.items,w.actors.map(a=>[a.id,a.pos,a.life,a.name])]);
   const before=state(),frames=[];
   try{
    for(const shown of [1,.5,0,1]){
     r.labelRevealAt=()=>shown;
     rows.length=0;r.drawDrops(w);r.drawEliteNameHover(w);r.drawTexts(w);
     frames.push({shown,rows:rows.slice()});
    }
   }finally{c.fillText=fill;c.stroke=stroke;c.moveTo=move;c.lineTo=line;r.labelRevealAt=reveal;}
   return {frames,links,same:before===state(),enemy:{name:fixedQA.enemy.name,pos:fixedQA.enemy.pos,radius:fixedQA.enemy.radius},drops:w.drops.map(d=>({name:d.item.item.name,pos:d.pos})),texts:w.texts.map(t=>({text:t.text,pos:t.pos})),fatal:__game.crash().fatal};
  });
  const a=results.anchors;assert.ok(a.same);assert.equal(a.fatal,null);assert.equal(a.links.length,0);
  for(const f of a.frames){
   for(const d of a.drops){const rows=f.rows.filter(r=>r.text===d.name);assert.equal(rows.length,1);assert.equal(rows[0].x,d.pos.x);assert.equal(rows[0].y,d.pos.y-20);assert.equal(rows[0].font,'bold 10px Verdana');}
   assert.ok(!f.rows.some(r=>r.text==='Unrevealed gem'));
   const name=f.rows.filter(r=>r.text===a.enemy.name);assert.equal(name.length,f.shown?1:0);
   if(f.shown){assert.equal(name[0].x,a.enemy.pos.x);assert.equal(name[0].y,a.enemy.pos.y-a.enemy.radius-20);assert.equal(name[0].alpha,f.shown);}
   for(const t of a.texts){const rows=f.rows.filter(r=>r.text===t.text);assert.equal(rows.length,1);assert.equal(rows[0].x,t.pos.x);assert.equal(rows[0].y,t.pos.y);}
  }
  results.crowd=await run(()=>{
   const w=__game.world(),r=__game.renderer,c=r.ctx,fill=c.fillText,reveal=r.labelRevealAt,frames=[];
   const obstacles=Array.from({length:8},(_,i)=>{const a=w.createMonster('gnoll_prowler',1,'enemy');a.pos={x:fixedQA.enemy.pos.x+(i%3-1)*24,y:fixedQA.enemy.pos.y-Math.floor(i/3)*24};return a;});
   const initial=w.actors,rows=[];
   c.fillText=function(text,x,y,...rest){if(text===fixedQA.enemy.name||w.drops.some(d=>text===d.item.item.name))rows.push({text,x,y});return fill.call(this,text,x,y,...rest);};
   try{r.labelRevealAt=()=>1;for(const bodies of [obstacles,[],obstacles.slice(0,3)]){w.actors=[...initial,...bodies];rows.length=0;r.drawDrops(w);r.drawEliteNameHover(w);frames.push(rows.slice());}}
   finally{w.actors=initial;c.fillText=fill;r.labelRevealAt=reveal;}
   return frames;
  });
  assert.deepEqual(results.crowd[0],results.crowd[1]);assert.deepEqual(results.crowd[1],results.crowd[2]);
  results.npc=await run(()=>{
   const w=__game.world(),r=__game.renderer,c=r.ctx,a=fixedQA.enemy,fill=c.fillText,reveal=r.labelRevealAt,settings=__game.settings(),old=settings.hoverNameplates,team=a.team;
   const rows=[];c.fillText=function(text,x,y,...rest){rows.push({text,x,y});return fill.call(this,text,x,y,...rest);};
   try{a.team='neutral';settings.hoverNameplates='all';r.labelRevealAt=()=>1;r.drawEliteNameHover(w);const all=rows.slice();rows.length=0;settings.hoverNameplates='named';r.drawEliteNameHover(w);return {all,named:rows.slice()};}
   finally{a.team=team;settings.hoverNameplates=old;c.fillText=fill;r.labelRevealAt=reveal;}
  });
  assert.ok(results.npc.all.some(r=>r.text===a.enemy.name&&r.x===a.enemy.pos.x&&r.y===a.enemy.pos.y-a.enemy.radius-20));assert.equal(results.npc.named.length,0);
  await run(()=>{const r=__game.renderer,w=__game.world();r.render(w);r.hudMouse=r.toScreen(fixedQA.enemy.pos);r.render(w);});
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  results.pickup=await run(()=>{const w=__game.world(),d=w.drops.find(d=>d.item.item.uid===99112);w.player.pos={...d.pos};w.pickupNearestGear(w.localSeat);return {items:w.meta.items.map(i=>i.uid),drops:w.drops.map(d=>d.item.item.uid)};});
  assert.ok(results.pickup.items.includes(99112));assert.ok(!results.pickup.drops.includes(99112));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS exact main painters, fixed item/name/float anchors across visibility and crowd changes, original NPC selection, no item tethers or extra Memory line, unchanged simulation and native pickup');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
