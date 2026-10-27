'use strict';
// Real browser loader + the desktop catalog client, using disposable saves only.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const releases=require('../launcher/releases.cjs');
const {startGameServer}=require('../launcher/server.cjs');
const root=path.resolve(process.env.RELEASE_SMOKE_SITE||'site');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'releases.json'),'utf8'));
releases.validateCatalog(catalog,catalog.repository);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'coordinated-smoke-'));
app.setPath('userData',path.join(tmp,'profile'));app.disableHardwareAcceleration();
app.on('window-all-closed',()=>{}); // Continue to the next branch between pairs.
app.commandLine.appendSwitch('disable-gpu');
const servers=[],windows=[],errors=[];
const deadline=setTimeout(()=>{console.error('Coordinated release smoke timed out');app.exit(1)},180000);
function staticServer(){return http.createServer((req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const data=fs.readFileSync(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'content-type':type,'content-length':data.length});res.end(data);
 }catch{res.writeHead(404).end();}
});}
async function ready(win){
 const until=Date.now()+60000;
 while(Date.now()<until){
  if(await win.webContents.executeJavaScript("!!window.__game && !!document.querySelector('#start-menu:not(.hidden)') && !!document.querySelector('#game-build-identity')"))return;
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('Game did not reach its labeled start menu');
}
function windowFor(webPreferences){
 const win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,...webPreferences}});
 windows.push(win);win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});return win;
}
app.whenReady().then(async()=>{
 try{
  const web=staticServer();servers.push(web);await new Promise(r=>web.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+web.address().port+'/';
  const profiles=JSON.parse(fs.readFileSync('scripts/browser-previews.json','utf8'));
  for(const entry of catalog.entries){
   const id=entry.identity,alias=id.branch==='main'?'play/':'dev/'+profiles.find(p=>p.ref===id.branch).id+'/';
   const browser=windowFor({partition:'persist:coordinated-web'});
   await browser.loadURL(base+alias+'?release-smoke=1');await ready(browser);
   const webInfo=await browser.webContents.executeJavaScript('({identity:window.__HOLLOW_WAKE_BUILD__,scope:window.__HOLLOW_WAKE_STORAGE_SCOPE__,label:document.getElementById("game-build-identity").textContent,visible:!document.getElementById("game-build-identity").hidden,url:location.href})');
   if(JSON.stringify(webInfo.identity)!==JSON.stringify(id)||webInfo.scope!==id.storageScope||!webInfo.visible||!webInfo.label.includes(id.commit.slice(0,8))||!webInfo.url.includes(alias+'?'))throw Error('Browser identity, scope or entry URL mismatch');
   const home=path.join(tmp,id.buildId);
   const installed=await releases.prepareGame({gh:catalog.repository,branch:id.branch,home,url:base+'releases.json'});
   if(installed.offline||!installed.game||installed.game.identity.buildId!==id.buildId)throw Error('Desktop did not select the browser revision');
   const game=await startGameServer({root:installed.game.root,savesDir:path.join(home,'saves')});servers.push(game.server);
   const desktop=windowFor({partition:'persist:coordinated-desktop-'+id.buildId,preload:path.resolve('launcher/game-preload.cjs'),additionalArguments:['--hollow-storage-scope='+id.desktopStorageScope,'--hollow-offline=false']});
   await desktop.loadURL(game.url);await ready(desktop);
   const desktopInfo=await desktop.webContents.executeJavaScript('({identity:window.__HOLLOW_WAKE_BUILD__,scope:window.__HOLLOW_WAKE_STORAGE_SCOPE__,label:document.getElementById("game-build-identity").textContent})');
   if(JSON.stringify(desktopInfo.identity)!==JSON.stringify(webInfo.identity)||desktopInfo.scope!==id.desktopStorageScope||desktopInfo.label!==webInfo.label)throw Error('Desktop/browser version or preserved desktop save scope mismatch');
   const saves=await desktop.webContents.executeJavaScript(`(async()=>{const w=await fetch('/__save/releasesmoke',{method:'POST',body:JSON.stringify({saved:true})});const r=await fetch('/__save/releasesmoke');return w.ok&&(await r.json()).saved})()`);
   if(!saves)throw Error('Desktop save round trip failed');
   const offline=await releases.prepareGame({gh:catalog.repository,branch:id.branch,home,fetchImpl:async()=>{throw Error('offline')}});
   if(!offline.offline||offline.game?.identity.buildId!==id.buildId)throw Error('Offline game did not retain its verified identity');
   const output=path.resolve('balance/reports/coordinated-release');fs.mkdirSync(output,{recursive:true});
   fs.writeFileSync(path.join(output,id.buildId+'.png'),(await browser.webContents.capturePage()).toPNG());
   console.log('PASS browser + desktop: '+id.branch+' @ '+id.commit.slice(0,8));
   browser.destroy();desktop.destroy();
  }
  if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
  clearTimeout(deadline);for(const server of servers){server.closeAllConnections();server.close();}app.exit(0);
 }catch(error){console.error(error);clearTimeout(deadline);for(const win of windows)if(!win.isDestroyed())win.destroy();for(const server of servers){server.closeAllConnections();server.close();}app.exit(1);}
});
