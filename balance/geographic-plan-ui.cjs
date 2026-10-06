// Real module worker parity and ordinary walking across a fresh reservation frontier.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'geographic-plan-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..','dist-preview'),report={seed:901743,consoleErrors:[]};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(event.level==='error')report.consoleErrors.push(event.message);if(event.message.startsWith('GEO_PROGRESS '))console.log(event.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const save=()=>fs.writeFileSync(path.join(dir,'geographic-plan-ui.json'),JSON.stringify(report,null,2));
 const timer=setTimeout(()=>{save();console.error('geographic browser timeout');app.exit(1);},300000);
 try{
  await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Game bootstrap unavailable');await new Promise(r=>setTimeout(r,250));});
  report.workerParity=await run(async()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(901743);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,g=m.geography,q=g.warm;if(!q)throw Error('Production geographic module worker missing');const results=[];
   for(const [x,y]of [[3,1],[6,2],[-3,14]]){
    const at={dimension:'surface',cx:String(Math.floor((x*5400+2700)/960)),cy:String(Math.floor((y*5400+2700)/960)),x:((x*5400+2700)%960+960)%960,y:((y*5400+2700)%960+960)%960};
    const input=g.preparationInput(at),expected=g.plannedAt(at);if(!input||!expected)throw Error('Native parity source absent');q.offer([input]);let ready;const start=performance.now();
    for(let i=0;i<15000&&!ready;i++){await new Promise(r=>setTimeout(r,4));if(q.stats.error)throw Error(q.stats.error);const row=q.takeReady();if(row&&row.input.owner.id===input.owner.id)ready=row;}
    if(!ready||!ready.preparation.plan)throw Error('Actual worker did not return the native access plan');
    const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
    if(canonical(ready.preparation.plan)!==canonical(expected))throw Error('Actual module worker differs from synchronous plan');
    results.push({owner:input.owner.id,kind:expected.context.zone.objective.kind,proof:expected.access.hash,workerMs:ready.preparation.compileMs,wallMs:performance.now()-start,bytes:ready.preparation.bytes});
   }
   return{results,stats:q.stats};
  });save();
  for(const enabled of [false,true]){
   report[enabled?'warm':'cold']=await run(async enabled=>{
    __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(901743);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
    const m=w.massRuntime,g=m.geography;if(!enabled)g.warm.dispose();const span=m.config.terrain.addressSpan;
    const local=(x,y)=>({x:x-Number(BigInt(m.origin.cx))*span,y:y-Number(BigInt(m.origin.cy))*span});
    const targetAt={dimension:'surface',cx:'36',cy:'14',x:540,y:60},target=g.hierarchy.at(targetAt).zone.id;
    // Only search inside the previous physical zone. This cannot touch target
    // country candidates, and no objective/provider/terrain is substituted.
    const initiallyCached=g.plans.has(target);let setupTrace=null;const setupPlan=g.plan;g.plan=function(owner){if(owner.id===target&&!this.plans.has(target))setupTrace=new Error('target cold setup').stack;return setupPlan.call(this,owner);};
    const sx=21660,ex=24660,lo=11400,hi=15600,step=60,cols=(ex-sx)/step+1,rows=(hi-lo)/step+1;
    const clearCache=new Map(),clear=(x,y)=>{const key=x+','+y;if(clearCache.has(key))return clearCache.get(key);const p=local(x,y),yes=m.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius);clearCache.set(key,yes);return yes;};
    let route;
    for(const startY of [13500,12900,14100,12300,14700]){
     if(!clear(sx,startY))continue;const start=(startY-lo)/step*cols,queue=[start],parents=new Map([[start,-1]]);let end;
     for(let head=0;head<queue.length&&!end;head++){
      const i=queue[head],ix=i%cols,iy=Math.floor(i/cols);if(ix===cols-1){end=i;break;}
      for(const [dx,dy]of [[1,0],[0,-1],[0,1],[-1,0]]){const nx=ix+dx,ny=iy+dy,j=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||parents.has(j))continue;
       const x=sx+ix*step,y=lo+iy*step;if(![.25,.5,.75,1].every(t=>clear(x+dx*step*t,y+dy*step*t)))continue;parents.set(j,i);queue.push(j);
      }
     }
     if(end!==undefined){route=[];for(let i=end;i!==-1;i=parents.get(i))route.push(local(sx+i%cols*step,lo+Math.floor(i/cols)*step));route.reverse();break;}
    }
    if(!route)throw Error('No body-clear natural walking course in bounded preceding zone');
    if(g.plans.has(target))throw Error('Setup accidentally queried future target before ordinary walking: '+JSON.stringify({initiallyCached,origin:m.origin,setupTrace}));
    w.landPartyAt(route[0]);m.update(w,true);g.plan=setupPlan;if(g.plans.has(target))throw Error('Initial residency already queried target; course lacks a cold frontier: '+JSON.stringify({pos:w.player.pos,routeStart:route[0],setupTrace}));
    const start={...w.player.pos},frames=[],events=[],coldPlans=[],calls={},original=[];let frame=0,goal=1;
    const stats=a=>{const s=[...a].sort((a,b)=>a-b);return{count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,median:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1),over50:s.filter(x=>x>50).length};};
    const wrap=(owner,name,label)=>{const fn=owner[name];original.push([owner,name,fn]);owner[name]=function(...args){const before=performance.now();try{return fn.apply(this,args);}finally{const ms=performance.now()-before,c=calls[label]||(calls[label]={n:0,total:0,max:0});c.n++;c.total+=ms;c.max=Math.max(c.max,ms);}};};
    const plan=g.plan;original.push([g,'plan',plan]);g.plan=function(owner){const cold=!this.plans.has(owner.id),prepared=this.preparedOwners.has(owner.id),t=performance.now();const result=plan.call(this,owner);if(cold||prepared)coldPlans.push({frame,id:owner.id,cold,prepared,ms:performance.now()-t,accepted:!!result});return result;};
    wrap(g,'prepare','geography.prepare');wrap(m,'update','runtime.update');wrap(__game.renderer,'drawFloor','Renderer.drawFloor');
    const before={warm:g.warmStats,access:g.accessStats};let lastAdopted=g.warmStats.adopted,lastUsed=g.warmStats.used;
    __game.devInput(()=>{while(goal<route.length-1&&Math.hypot(route[goal].x-w.player.pos.x,route[goal].y-w.player.pos.y)<32)goal++;const p=route[goal],dx=p.x-w.player.pos.x,dy=p.y-w.player.pos.y,d=Math.hypot(dx,dy);let steering={dx,dy};
     if(d>16){for(const turn of [0,.55,-.55,1.1,-1.1,1.57,-1.57]){const a=Math.atan2(dy,dx)+turn,x=Math.cos(a),y=Math.sin(a);if([12,24,36].every(r=>{const q={x:w.player.pos.x+x*r,y:w.player.pos.y+y*r};return m.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius); })){steering={dx:x,dy:y};break;}}}return{...steering,aim:p,held:[],edge:[]};});
    try{
     for(;frame<1800;frame++){
      const begin=performance.now();__game.step(1);frames.push(performance.now()-begin);
      if(g.warmStats.adopted!==lastAdopted||g.warmStats.used!==lastUsed){events.push({frame,pos:{...w.player.pos},adopted:g.warmStats.adopted,used:g.warmStats.used,lastAdopted:g.warmStats.lastAdopted,lastUsed:g.warmStats.lastUsed});lastAdopted=g.warmStats.adopted;lastUsed=g.warmStats.used;}
      if(frame%300===0)console.log('GEO_PROGRESS '+JSON.stringify({enabled,frame,goal,pos:w.player.pos,used:g.warmStats.used,adopted:g.warmStats.adopted}));
      if(__game.crash().fatal)throw Error(__game.crash().fatal);if(w.massRuntime!==m)throw Error('Walking unexpectedly changed scenes');
      if(goal===route.length-1&&Math.hypot(route[goal].x-w.player.pos.x,route[goal].y-w.player.pos.y)<10)break;
      await new Promise(r=>setTimeout(r,4));
     }
    }finally{__game.devInput(null);for(const [o,n,fn]of original)o[n]=fn;}
    return{enabled,target,start,end:{...w.player.pos},route,goal,reached:goal===route.length-1&&Math.hypot(route[goal].x-w.player.pos.x,route[goal].y-w.player.pos.y)<10,frames:stats(frames),calls,events,coldPlans,before,after:{warm:g.warmStats,access:g.accessStats},crash:__game.crash().fatal};
   },enabled);save();
   assert.equal(report[enabled?'warm':'cold'].crash,null);assert.ok(report[enabled?'warm':'cold'].reached,'ordinary movement must complete the same natural course');
  }
  assert.deepEqual(report.warm.route,report.cold.route,'worker scheduling cannot move the natural walking course');
  assert.ok(report.warm.coldPlans.some(p=>p.id===report.warm.target&&p.prepared&&p.accepted),'normal production walking must consume the accepted prepared target');
  assert.ok(report.cold.coldPlans.some(p=>p.id===report.cold.target&&p.cold&&p.accepted),'reference walking must synchronously compile the same target');
  await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));report.image=path.join(dir,'geographic-plan-walking.png');fs.writeFileSync(report.image,(await win.webContents.capturePage()).toPNG());save();
  console.log('PASS actual geographic module-worker parity and prepared native access consumed during identical ordinary walking frontier');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.error=String(error.stack||error);save();console.error(error);clearTimeout(timer);app.exit(1);}
});
