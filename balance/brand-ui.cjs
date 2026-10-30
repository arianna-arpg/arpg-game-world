// Brand acceptance: real static pages and launcher preload, isolated saves.
// Remote fonts/network are blocked: the original vector title must stand alone.
const {app, BrowserWindow, ipcMain}=require('electron');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const root=path.resolve(__dirname,'..'), out=path.join(__dirname,'reports','brand');
fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-brand-'));
app.setPath('userData',path.join(temp,'profile'));app.disableHardwareAcceleration();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  const server=await startGameServer({root:path.join(root,'site'),savesDir:path.join(temp,'saves')});
  const win=new BrowserWindow({show:false,width:1280,height:900,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}});
  win.webContents.session.webRequest.onBeforeRequest({urls:['https://*/*']},(_d,cb)=>cb({cancel:true}));
  const shot=async(w,name)=>{await pause(300);w.webContents.invalidate();await pause(100);fs.writeFileSync(path.join(out,name+'.png'),(await w.webContents.capturePage()).toPNG());};
  let launcher;
  const timeout=setTimeout(()=>app.exit(1),120000);
  try{
    for(const route of ['', 'database/', 'tree/', 'systems/']){
      await win.loadURL(new URL(route+'index.html',server.url).href);
      await win.webContents.executeJavaScript('Promise.all([...document.querySelectorAll("img[src*=brand]")].map(i=>i.decode()))');
      for(const width of [1280,390]){
        win.setContentSize(width,900);await pause(150);
        assert(await win.webContents.executeJavaScript("(()=>{const img=document.querySelector('.hwnav-mark'),r=img.getBoundingClientRect();return img.naturalWidth>0 && r.left>=0 && r.right<=innerWidth && img.closest('a').getAttribute('aria-label')==='Hollow Wake home';})()"),route+' brand fits');
        if(!route)await shot(win,'website-'+width);
      }
    }
    const state={title:'Hollow Wake',dev:{},mainBranch:'main',selectedBranch:'main',branch:'main',version:'0.6.0',hash:'brand-qa',platform:'win32',checkOnLaunch:false,branches:[{name:'main'}]};
    ipcMain.handle('launcher:status',()=>state);ipcMain.handle('launcher:branches',()=>state);
    launcher=new BrowserWindow({show:false,width:620,height:740,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'launcher','preload.cjs')}});
    await launcher.loadFile(path.join(root,'launcher','launcher.html'));
    await launcher.webContents.executeJavaScript('refresh()');
    await launcher.webContents.executeJavaScript("document.querySelector('#title img').decode()");
    assert(await launcher.webContents.executeJavaScript("document.querySelector('#title img').naturalWidth>0 && document.querySelector('#title').getAttribute('aria-label')==='Hollow Wake'"),'launcher refresh preserves the artwork');
    await shot(launcher,'launcher');
    console.log('BRAND UI OK: shared artwork across all four website pages at desktop/mobile widths, remote fonts blocked; real launcher preload/status refresh retains its identity.');
  }catch(e){console.error(e.stack||e);await shot(win,'failure');process.exitCode=1;}
  finally{clearTimeout(timeout);launcher?.destroy();win.destroy();server.server.close();app.exit(process.exitCode||0);}
});
