// Shared icon artwork and native bar/rack integration; controlled UI QA, not gameplay.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'skill-faces';
app.setPath('userData',path.join(dir,'skill-faces-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/skill-faces-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>win.webContents.executeJavaScript('('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')');
 const timer=setTimeout(()=>app.exit(1),180000),rows=[],faces=[];
 const png=(name,data)=>fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),Buffer.from(data.split(',')[1],'base64'));
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});
  for(const role of ['warrior','magician','rogue']){
   const row=await run(role=>{
    __game.devStartRun(role);__game.ui.hideAll();__game.step(2);
    const w=__game.world(),p=w.player,r=__game.renderer,c=document.getElementById('game'),ctx=c.getContext('2d');
    const state=JSON.stringify([p.life,p.mana,p.skills.map(s=>s&&[s.def.id,s.level,s.sockets])]);
    const render=()=>{
     const words=[],fill=ctx.fillText;ctx.fillText=function(value,...rest){words.push(String(value));return fill.call(this,value,...rest);};
     try{r.render(w);}finally{ctx.fillText=fill;}return words;
    };
    const normal=render(),png=c.toDataURL(),f=p.skills.filter(Boolean).map(s=>({name:s.def.name,icon:s.def.icon,color:s.def.color}));
    const inst=p.skills[0],saved=inst.def.icon;inst.def.icon=false;const fallback=render();inst.def.icon='missing';const unknown=render();inst.def.icon=saved;
    const oldState=inst.state;inst.state={...oldState,markPos:{x:1,y:1}};const recall=render();inst.state=oldState;
    const cd=p.cooldowns.get(inst.def.id),total=p.cooldownTotals.get(inst.def.id);
    p.cooldowns.set(inst.def.id,2);p.cooldownTotals.set(inst.def.id,4);
    render();const cooling=c.toDataURL();
    if(cd===undefined)p.cooldowns.delete(inst.def.id);else p.cooldowns.set(inst.def.id,cd);
    if(total===undefined)p.cooldownTotals.delete(inst.def.id);else p.cooldownTotals.set(inst.def.id,total);
    const mana=p.mana;p.mana=0;render();const empty=c.toDataURL();p.mana=mana;
    render();
    const same=state===JSON.stringify([p.life,p.mana,p.skills.map(s=>s&&[s.def.id,s.level,s.sockets])]);
    __game.ui.toggleBuildPanel(undefined,'show');
    const rack=[...document.querySelectorAll('[data-drag^="rackSeat:"]')].map(e=>({name:e.innerText,svg:!!e.querySelector('svg'),paths:[...e.querySelectorAll('svg path')].map(p=>p.getAttribute('d'))}));
    const priorItems=new Set(w.meta.items.map(i=>i.uid));
    document.querySelector('[data-rackunbind="0"]').click();
    const memory=w.meta.items.find(i=>!priorItems.has(i.uid));
    const memorySvg=memory&&!!document.querySelector('[data-item-uid="'+memory.uid+'"] svg');
    return {role,normal,fallback,unknown,recall,same,faces:f,png,cooling,empty,rack,memorySvg,unseated:!p.skills[0],fatal:__game.crash().fatal};
   },role);
   assert.equal(row.fatal,null);assert.ok(row.same);
   const initials=row.faces[0].name.split(' ').map(s=>s[0]).join('').slice(0,3).toUpperCase();
   assert.ok(!row.normal.includes(initials));assert.ok(!row.fallback.includes(initials)&&!row.unknown.includes(initials));
   assert.ok(!row.recall.includes('REC'));assert.notEqual(row.png,row.cooling);assert.notEqual(row.png,row.empty);
   assert.equal(row.rack.filter(r=>r.svg).length,3,'all equipped native starter rack faces use shared vectors');
   assert.ok(row.unseated&&row.memorySvg,'native unlearning returns the same illustrated Memory to the bag');
   png(role,row.png);png(role+'-cooldown',row.cooling);png(role+'-unaffordable',row.empty);
   delete row.png;delete row.cooling;delete row.empty;faces.push(...row.faces);rows.push(row);
  }
  const code=buildSync({stdin:{contents:"export {SKILL_ICONS,SKILL_ICON_VIEW,drawSkillIcon,skillIconSvg} from './src/render/skillIcons';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'IconQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const gallery=await run(async faces=>{
   const {drawSkillIcon:draw,skillIconSvg:svg,SKILL_ICON_VIEW:cfg,SKILL_ICONS:defs}=IconQA;
   const c=document.createElement('canvas');c.width=810;c.height=342;const g=c.getContext('2d');g.fillStyle='#171a21';g.fillRect(0,0,c.width,c.height);
   const results=[],saved=JSON.stringify([cfg,defs]),random=Math.random;Math.random=()=>{throw Error('icon used simulation RNG');};
   const canvas=()=>{const x=document.createElement('canvas');x.width=x.height=48;return x;};
   try{
    for(const [i,face]of faces.entries()){
     const a=canvas(),b=canvas(),ag=a.getContext('2d'),bg=b.getContext('2d');
     ag.globalAlpha=.81;ag.lineWidth=7;ag.fillStyle='#123456';
     const before=JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]);
     if(!draw(ag,face,0,0,48))throw Error('missing face');
     if(before!==JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]))throw Error('canvas state changed');
     const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(face,48));});
     bg.globalAlpha=.81;bg.drawImage(img,0,0);
     const aa=ag.getImageData(0,0,48,48).data,bb=bg.getImageData(0,0,48,48).data;let max=0,total=0,hash=2166136261;
     for(let j=0;j<aa.length;j++){const d=Math.abs(aa[j]-bb[j]);max=Math.max(max,d);total+=d;hash=Math.imul(hash^aa[j],16777619);}
     const x=i%3*270,y=Math.floor(i/3)*114;
     g.fillStyle='#eee4ce';g.font='14px sans-serif';g.fillText(face.name,x+10,y+20);
     g.drawImage(a,x+10,y+34);g.drawImage(b,x+72,y+34);g.drawImage(a,x+140,y+45,22,22);g.drawImage(b,x+180,y+48,15,15);
     results.push({id:face.icon,source:defs[face.icon].source,max,mean:total/aa.length,hash:hash>>>0});
    }
    const off=canvas(),og=off.getContext('2d');const legacy=draw(og,{...faces[0],icon:false},0,0,48);
    const missing=draw(og,{color:'#fff',icon:'missing'},0,0,48);
    return {results,legacy,missing,unchanged:saved===JSON.stringify([cfg,defs]),png:c.toDataURL()};
   }finally{Math.random=random;}
  },faces);
  png('gallery',gallery.png);delete gallery.png;
  assert.equal(gallery.legacy,true);assert.equal(gallery.missing,true);assert.ok(gallery.unchanged);
  assert.equal(new Set(gallery.results.map(r=>r.hash)).size,9);
  // SVG and Canvas use different raster paths; compare total coverage, not bit identity.
  for(const r of gallery.results)assert.ok(r.mean<3,'canvas/SVG mismatch: '+JSON.stringify(r));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({rows,gallery},null,2));
  console.log(JSON.stringify(gallery));console.log('PASS shared native starter bar/rack faces, automatic artwork/recall, affordability/cooldown overlays, SVG/canvas vocabulary and state/RNG preservation');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
