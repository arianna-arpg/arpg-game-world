// Hidden disposable browser; production pixels and light collection, no player saves.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'layer-profile-'+process.pid));app.disableHardwareAcceleration();
const timeout=setTimeout(()=>app.exit(1),120000);
app.whenReady().then(async()=>{
  await require('esbuild').build({entryPoints:[path.join(__dirname,'layerVisualFixture.ts')],bundle:true,
    format:'iife',outfile:path.join(dir,'layer-fixture.js')});
  fs.writeFileSync(path.join(dir,'layer-fixture.html'),'<html><body><script src="layer-fixture.js"></script></body></html>');
  const win=new BrowserWindow({show:false,width:1536,height:1000,webPreferences:{offscreen:true,contextIsolation:true}});
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  await win.loadFile(path.join(dir,'layer-fixture.html'));
  const result=await win.webContents.executeJavaScript('window.layerQA');
  if(!result)throw new Error('Fixture did not initialize: '+errors.join('\n'));
  fs.writeFileSync(path.join(dir,'layer-visuals.png'),Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
  result.errors=errors;fs.writeFileSync(path.join(dir,'layer-visuals.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));clearTimeout(timeout);app.exit(result.failures.length||errors.length?1:0);
}).catch(e=>{console.error(e);clearTimeout(timeout);app.exit(1);});
