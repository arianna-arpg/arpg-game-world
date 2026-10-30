// Controlled preference integration. No claim of an ordinary-input playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'classic-feedback-r62';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/classic-feedback-r62-dist');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const options=tab=>run(tab=>{__game.ui.showEscapeMenu();document.querySelector('#esc-keys').click();document.querySelector('[data-opttab="'+tab+'"]').click();},tab);
 const click=id=>run(id=>{const e=document.getElementById(id);if(!e)throw Error('Missing '+id);e.click();},id);
 const prefs=()=>run(()=>{const s=__game.settings();return {artwork:s.skillArtwork,details:s.statusReadout};});
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};


 const snapshot=()=>{const w=__game.world(),p=w.player;return {seed:w.massRuntime.generator.run.seed,pos:p.pos,life:p.life,mana:p.mana,items:w.meta.items,skills:p.skills.map(i=>i&&{id:i.def.id,level:i.level,sockets:i.sockets})};};
 const resume=async()=>{await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Missing Continue');b.click();__game.ui.hideAll();});return run(snapshot);};
 const presentationPrefs=()=>run(()=>{const s=__game.settings();return {aim:s.aimTick,art:s.skillArtwork};});
 const capture=async(name)=>{
  const data=await run(()=>{const r=__game.renderer,w=__game.world(),p=w.player,words=[],markers=[];
   const contexts=[r.ctx,r.octx],saved=contexts.map(c=>({fillText:c.fillText,stroke:c.stroke,beginPath:c.beginPath,moveTo:c.moveTo,lineTo:c.lineTo}));
   const state=()=>JSON.stringify([w.time,p.pos,p.life,p.mana,p.statuses,w.texts]);const before=state();
   contexts.forEach((c,i)=>{let points=[];const orig=saved[i];
    c.fillText=function(text,x,y,...rest){words.push({text,x,y,color:c.fillStyle,font:c.font,alpha:c.globalAlpha});return orig.fillText.call(this,text,x,y,...rest);};
    c.beginPath=function(){points=[];return orig.beginPath.call(this);};
    c.moveTo=function(x,y){points.push({x,y});return orig.moveTo.call(this,x,y);};
    c.lineTo=function(x,y){points.push({x,y});return orig.lineTo.call(this,x,y);};
    c.stroke=function(...args){if(c.strokeStyle==='#edf9e9')markers.push({points:[...points],alpha:c.globalAlpha});return orig.stroke.apply(this,args);};
   });
   try{r.render(w);}finally{contexts.forEach((c,i)=>Object.assign(c,saved[i]));}
   const floats=w.texts.filter(t=>/^9[0-9][0-9]$/.test(t.text)).map(t=>({text:t.text,x:t.pos.x,y:t.pos.y}));
   return {words,markers,floats,icons:r.statusIconRects,fx:r.frameFx.map(f=>({id:f.id,kind:f.def.kind,motif:f.def.motif})),same:before===state(),fatal:__game.crash().fatal};
  });assert.ok(data.same);assert.equal(data.fatal,null);await shot(name);return data;
 };
 const nativeNumbers=data=>{for(const t of data.floats){const drawn=data.words.filter(d=>d.text===t.text);assert.equal(drawn.length,1,t.text);assert.equal(drawn[0].x,t.x);assert.equal(drawn[0].y,t.y);}};
 const tick=async(style)=>{await options('interface');await run(style=>document.querySelector('[data-aimtick-style="'+style+'"]').click(),style);await run(()=>__game.ui.hideAll());};
 const alpha=async(value)=>{await options('interface');await run(value=>{const e=document.getElementById('opt-aimtick');e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);await run(()=>__game.ui.hideAll());};
 const effects=()=>run(()=>{const r=__game.renderer,w=__game.world(),cv=document.createElement('canvas');cv.width=600;cv.height=400;const g=cv.getContext('2d'),oldCanvas=r.canvas,oldCtx=r.ctx;
  r.canvas=cv;r.ctx=g;try{r.drawStatusFx();r.drawAfflictionOverlays(w);}finally{r.canvas=oldCanvas;r.ctx=oldCtx;}
  const px=g.getImageData(0,0,600,400).data;let energy=0;for(let i=3;i<px.length;i+=4)energy+=px[i];return {energy,center:g.getImageData(300,200,1,1).data[3],pixels:cv.toDataURL()};});
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 try{
  await boot();await run(()=>{for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');__game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);const w=__game.world(),p=w.player,m=w.massRuntime,q=m.journey.local(m.journey.places.find(p=>p.content==='cinderwatch'));w.landPartyAt(q);m.update(w,true);w.actors=[p];p.invulnerable=true;p.fillResources();w.texts=[];
   window.originalSkills=[...p.skills];window.originalKnown=new Map(w.meta.knownSkills);
   for(const [i,id]of ['cleave','sunder_maul','frenzy'].entries())__game.devGrantSkill(id,1,i);
   for(let i=0;i<12;i++)w.text({x:p.pos.x,y:p.pos.y-20},String(901+i),'#f2ebcf',15,'dmg',10);
  });
  assert.equal((await presentationPrefs()).aim.style,'line');
  results.classic=await capture('classic-default');nativeNumbers(results.classic);assert.equal(results.classic.markers.length,0);
  await run(()=>__game.step(3));results.moving=await capture('classic-moving');nativeNumbers(results.moving);
  await options('visuals');assert.equal(await run(()=>!!document.getElementById('opt-spreadcombattext')),false);await run(()=>__game.ui.hideAll());
  await tick('dot');assert.equal((await capture('dot')).markers.length,0);await tick('focus');await run(()=>__game.world().player.facing=0);results.focus=await capture('focus-right');assert.equal(results.focus.markers.length,1);assert.ok(results.focus.markers[0].points[13].x>0);assert.equal(results.focus.markers[0].points[13].y,0);
  await run(()=>__game.world().player.facing=Math.PI/2);results.turned=await capture('focus-down');assert.ok(Math.abs(results.turned.markers[0].points[13].x)<1e-8);assert.ok(results.turned.markers[0].points[13].y>0);
  await alpha(25);results.dim=await capture('focus-dim');assert.ok(Math.abs(results.dim.markers[0].alpha/results.focus.markers[0].alpha-.25/.8)<.001);await alpha(0);assert.equal((await capture('focus-hidden')).markers.length,0);await alpha(80);
  for(const flag of ['dead','downed','burrow']){await run(flag=>__game.world().player[flag]=true,flag);assert.equal((await capture('focus-'+flag)).markers.length,0);await run(flag=>__game.world().player[flag]=false,flag);}
  await run(()=>__game.world().player.applyStatus('swallowed',0,1,'Veil'));assert.equal((await capture('focus-concealed')).markers.length,0);await run(()=>__game.world().player.endStatus('swallowed'));await tick('line');
  // Compare the exact classic face painter with the source on main, not a new approximation.
  const cp=require('node:child_process'),{buildSync}=require('esbuild');const main=cp.execFileSync('git',['show','main:src/render/renderer.ts'],{encoding:'utf8'});
  const start=main.indexOf('        ctx.fillStyle = face.color;',main.indexOf('const gated = face === def'));
  const end=main.indexOf('        // Cooldown sweep',start);assert.ok(start>0&&end>start);
  const initials=main.match(/function initials\(name: string\): string \{[\s\S]*?\n\}/)[0];
  const code=buildSync({stdin:{contents:"export {drawSkillIcon,configureSkillArtwork} from './src/render/skillIcons';"+initials+'\nexport function mainFace(ctx:any,face:any,inst:any,p:any,cost:any,gated:boolean,runningOn:boolean,x:number,by:number,slot:number){'+main.slice(start,end)+'}',resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'ClassicQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  results.faceParity=await run(()=>{ClassicQA.configureSkillArtwork(()=>false);let cases=0;for(const name of ['Cleave','Sunder Maul','Frenzy','One Two Three Four'])for(const mode of ['ready','gated','poor','running','recall']){
   const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=54;a.height=b.height=54;const x=a.getContext('2d'),y=b.getContext('2d');x.textAlign=y.textAlign='center';const face={name,color:'#e9aa53'},inst=mode==='recall'?{state:{markPos:{x:0,y:0}}}:{};
   ClassicQA.mainFace(x,face,inst,{life:20,mana:mode==='poor'?0:20},{life:0,mana:10},mode==='gated',mode==='running',0,0,54);
   y.globalAlpha=mode==='gated'?.15:mode==='poor'?.3:.9;ClassicQA.drawSkillIcon(y,mode==='recall'?{...face,icon:'recall'}:face,4,4,46);
   if(a.toDataURL()!==b.toDataURL())throw Error('main face differs: '+name+' '+mode);cases++;
  }return cases;});assert.equal(results.faceParity,20);
  await options('visuals');if((await presentationPrefs()).art)await click('opt-skillartwork');await run(()=>__game.ui.hideAll());results.fallback=await capture('classic-faces');for(const name of ['C','SM','F'])assert.ok(results.fallback.words.some(t=>t.text===name&&t.font==='bold 13px Verdana'&&t.color==='#0a0a0e'&&t.alpha===1));
  await run(()=>{__game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory(true);});assert.ok(await run(()=>[...document.querySelectorAll('[data-skill-acronym]')].filter(e=>e.dataset.skillAcronym==='SM').some(e=>getComputedStyle(e).fontSize==='7px'&&getComputedStyle(e).color==='rgb(10, 10, 14)')));await shot('classic-rack');await run(()=>__game.ui.hideAll());
  await run(()=>{const p=__game.world().player;for(const id of ['poison','mired','vulnerable'])p.applyStatus(id,id==='poison'?2:0,20,'Native');});results.statuses=await capture('paired-effects');assert.deepEqual(results.statuses.icons.map(i=>i.id).sort(),results.statuses.fx.map(f=>f.id).sort());results.gentle=await effects();assert.ok(results.gentle.energy>0);assert.equal(results.gentle.center,0);
  await options('visuals');await click('opt-affliction');await run(()=>__game.ui.hideAll());await capture('paired-still');const first=await effects();await new Promise(r=>setTimeout(r,100));assert.equal((await effects()).pixels,first.pixels);
  await options('visuals');await click('opt-affliction');await run(()=>__game.ui.hideAll());assert.equal((await effects()).energy,0);assert.equal((await capture('icons-effects-off')).icons.length,3);
  await options('visuals');await click('opt-affliction');await run(()=>{__game.ui.hideAll();__game.world().player.endStatus('poison');});results.cleansed=await capture('paired-cleanse');assert.ok(!results.cleansed.icons.some(i=>i.id==='poison'));assert.ok(!results.cleansed.fx.some(i=>i.id==='poison'));
  await run(()=>__game.world().player.updateTimers(Math.max(...__game.world().player.statuses.map(s=>s.remaining))+1));results.expired=await capture('paired-expiry');assert.equal(results.expired.icons.length,0);assert.equal(results.expired.fx.length,0);assert.equal((await effects()).energy,0);
  await tick('focus');await alpha(35);await run(()=>{__game.ui.hideAll();const w=__game.world(),p=w.player;p.skills=originalSkills;w.meta.knownSkills=originalKnown;p.fillResources();w.texts=[];__game.save();});
  results.saved=await run(snapshot);const prefs=await presentationPrefs();results.resumed=await resume();assert.deepEqual(results.resumed,results.saved);assert.deepEqual(await presentationPrefs(),prefs);
  await run(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith(':arpg_settings_v1'));const s=JSON.parse(localStorage.getItem(key));s.spreadCombatText=true;localStorage.setItem(key,JSON.stringify(s));});await resume();assert.equal(await run(()=>__game.settings().spreadCombatText),undefined);assert.equal((await presentationPrefs()).aim.style,'focus');
  assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
  delete results.gentle.pixels;fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS exact main face pixels (20 cases), real classic rack/hotbar, native damage trajectories and ignored legacy spreading; Aim Tick choices/facing/opacity/concealment; paired debuff/vignette lifecycle and comfort modes; Options persistence, exact Continue, legacy migration and save sentinels');
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
