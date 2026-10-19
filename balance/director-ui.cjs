// Real client lifecycle checks for restored Director hooks. Disposable account/profile only.
// Run: npx electron balance/director-ui.cjs [--worldmass]
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startGameServer}=require('../launcher/server.cjs');
const native=process.argv.includes('--worldmass'),results=[];
const check=(name,ok,detail)=>{results.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' '+JSON.stringify(detail):''}`);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
app.whenReady().then(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-director-qa-'));
 app.setPath('userData',path.join(temp,'user'));
 const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(temp,'saves')});
 const win=new BrowserWindow({show:true,x:-4200,y:40,width:1000,height:650,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{partition:'director-qa-'+process.pid,backgroundThrottling:false}});
 const js=code=>win.webContents.executeJavaScript(code),logs=[];
 win.webContents.on('console-message',e=>{if(e.level==='error')logs.push(String(e.message));});
 try{
  await win.loadURL(server.url+(native?'?worldmass':''));
  for(let i=0;i<200&&!await js('!!window.__game?.hydrated');i++)await sleep(100);
  await js('window.__game.hydrated()');
  await js(`(()=>{const g=window.__game;g.settings().renderScale=1;g.settings().cameraZoom=1.17;window.directorSpec={id:'lifecycle',seed:713,zone:'town',hero:{id:'warrior',classId:'warrior',level:8,skills:[{id:'cleave',level:5}]},warmup:0,duration:1,fps:30,guard:false,clear:'all',agent:{enabled:false},camera:{follow:'hero',zoom:2.1}};})()`);
  const prep=await js(`(()=>{const g=window.__game,d=g.director();window.stagePromise=d.stage(window.directorSpec);window.stagePromise.catch(()=>{});let refusal='';try{d.frame()}catch(e){refusal=e.message}return{promise:typeof window.stagePromise.then==='function',refusal}})()`);
  check('staging is asynchronous and frame refuses before admission',prep.promise&&/prepar/.test(prep.refusal),prep);
  const staged=await js('window.stagePromise');
  check('actual entry completes with loading released and native readiness satisfied',await js('!window.__game.loading.active && window.__game.world().nativeWorldReady()'),staged);
  check('entry policy preserved',await js(`!!window.__game.world().massRuntime === ${native}`));
  const held=await js('window.__game.world().time');await sleep(180);
  check('capture holds the live clock',Math.abs(await js('window.__game.world().time')-held)<1e-8);
  const stepped=await js(`(()=>{const g=window.__game,w=g.world(),d=g.director(),before=w.time;const frame=d.frame();return{advanced:w.time>before,index:frame.index,canvas:[d.canvas.width,d.canvas.height]}})()`);
  check('director frame advances one real tick',stepped.advanced&&stepped.index===1,stepped);
  // The pilot is polled by the same guarded read path; UI and loading still own the hands.
  const pilot=await js(`(()=>{const g=window.__game;let calls=0;g.pilot({poll(p,w,dt){calls++;return{dx:0,dy:0,aim:{...p.pos},held:[],edge:[]}}});g.step();const live=calls;g.ui.escapeMenuOpen=true;g.step();const blocked=calls===live;g.ui.escapeMenuOpen=false;g.step();return{live,blocked,resumed:calls>live}})()`);
  check('pilot obeys current pause input guard and resumes',pilot.live>0&&pilot.blocked&&pilot.resumed,pilot);
  const rejected=await js(`(()=>{const g=window.__game;g.pilot({poll(){return{dx:NaN,dy:0,aim:{x:0,y:0},held:[],edge:[]}}});let bad=false;try{g.step()}catch(e){bad=true}g.step();return bad})()`);
  check('invalid pilot input refuses and the failed source detaches',rejected);
  const restore=await js(`(()=>{const g=window.__game,d=g.director();d.setViewport(1600,900);g.settings().cameraZoom=1.23;d.end();g.step();const a=g.renderer.toScreen({x:0,y:0}),b=g.renderer.toScreen({x:100,y:0});return{worldOnly:g.renderer.worldOnly,focus:g.renderer.directorFocus,clean:g.renderer.directorClean,width:g.renderer.canvas.width,height:g.renderer.canvas.height,delta:Math.hypot(b.x-a.x,b.y-a.y),scale:g.renderer.pixelScale}})()`);
  check('end restores main game scale despite a legacy zoom value, window viewport and renderer flags',!restore.worldOnly&&!restore.focus&&!restore.clean&&restore.width===1000&&restore.height===650&&Math.abs(restore.delta-100*1.3*restore.scale)<0.01,restore);
  const cancel=await js(`(async()=>{const g=window.__game,d=g.director(),p=d.stage(window.directorSpec);p.catch(()=>{});d.end();let cancelled=false;try{await p}catch{cancelled=true}return{cancelled,clean:!g.renderer.worldOnly&&!g.renderer.directorFocus}})()`);
  check('end cancels pending stage and releases capture flags',cancel.cancelled&&cancel.clean,cancel);
  await js('window.__game.director().stage(window.directorSpec)');
  const second=await js('window.__game.director().frame().index');
  check('restaging after cancellation produces a fresh usable take',second===1);
  await js('window.__game.director().end()');
  const ground=await js(`(async()=>{const g=window.__game,d=g.director();try{const result=await d.stage({...window.directorSpec,id:'ground',zone:{tileset:'meadow',seed:311,level:8},at:'open'});return{ok:true,tileset:g.world().zone.tileset,result}}catch(e){return{ok:false,message:e.message,flags:!g.renderer.worldOnly&&!g.renderer.directorFocus}}finally{d.end()}})()`);
  check(native?'native tileset request refuses explicitly without claiming admission':'classic tileset request admits and names actual ground',native?!ground.ok&&/retained-area admission/.test(ground.message)&&ground.flags:ground.ok&&ground.tileset==='meadow',ground);
  check('no fatal client errors',await js('!window.__game.crash().fatal')&&logs.length===0,logs);
 }catch(e){check('client course completed',false,String(e.stack||e));}
 finally{try{await js('window.__game?.director().end()')}catch{};win.destroy();server.server.close();}
 const out=path.join(__dirname,'reports','director-ui'+(native?'-native':'')+'.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({native,results},null,2));
 console.log(`DIRECTOR ${results.filter(r=>r.ok).length}/${results.length}`);app.exit(results.every(r=>r.ok)?0:1);
});
