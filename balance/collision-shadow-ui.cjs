const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
app.setPath('userData',path.join(dir,'collision-shadow-profile-'+process.pid));
if(process.env.VIS_GPU!=='1')app.disableHardwareAcceleration();
const timer=setTimeout(()=>{console.error('Collision/shadow QA timed out');app.exit(1)},240000);
app.whenReady().then(async()=>{
 const plugins=baseline?[{name:'baseline',setup(build){build.onLoad({filter:/[\\/]src[\\/](engine[\\/]world|render[\\/]vis[\\/]sightVeil)\.ts$/},args=>({
  contents:execFileSync('git',['show',baseline+':'+path.relative(root,args.path).replaceAll('\\','/')],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}),loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[];
 await require('esbuild').build({entryPoints:[path.join(__dirname,'collisionShadowFixture.ts')],bundle:true,format:'iife',outfile:path.join(dir,'collision-shadow-fixture.js'),plugins});
 fs.writeFileSync(path.join(dir,'collision-shadow-fixture.html'),'<!doctype html><script src="collision-shadow-fixture.js"></script>');
 const win=new BrowserWindow({show:false,width:1280,height:960,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 await win.loadFile(path.join(dir,'collision-shadow-fixture.html'),{query:{lightingDiagnostics:'1'}});
 const result=await win.webContents.executeJavaScript('window.collisionShadowFixture.run()');
 fs.writeFileSync(path.join(dir,'collision-shadow'+(baseline?'-baseline':'')+'.json'),JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,errors},null,2));clearTimeout(timer);app.exit(result.failures.length||errors.length?1:0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1)});
