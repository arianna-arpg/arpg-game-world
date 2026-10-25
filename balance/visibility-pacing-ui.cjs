const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
app.setPath('userData',path.join(dir,'visibility-pacing-profile-'+process.pid));
if(process.env.VIS_GPU!=='1')app.disableHardwareAcceleration();
const timer=setTimeout(()=>{console.error('Visibility pacing QA timed out');app.exit(1)},240000);
app.whenReady().then(async()=>{
 const plugins=[{name:'reference',setup(b){
  if(baseline)b.onLoad({filter:/[\\/]src[\\/]render[\\/](renderer|vis[\\/](sightVeil|lights|roomVeil|foresightLayer))\.ts$/},args=>({contents:execFileSync('git',['show',baseline+':'+path.relative(root,args.path).replaceAll('\\','/')],{cwd:root,encoding:'utf8',maxBuffer:8e6}),loader:'ts',resolveDir:path.dirname(args.path)}));
 }}];
 await require('esbuild').build({entryPoints:[path.join(__dirname,'visibilityPacingFixture.ts')],bundle:true,format:'iife',outfile:path.join(dir,'visibility-pacing-fixture.js'),plugins});
 fs.writeFileSync(path.join(dir,'visibility-pacing-fixture.html'),'<!doctype html><script src="visibility-pacing-fixture.js"></script>');
 const win=new BrowserWindow({show:false,width:1307,height:1196,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 await win.loadFile(path.join(dir,'visibility-pacing-fixture.html'));
 const result=await win.webContents.executeJavaScript('(async()=>{try{return await window.visibilityPacing.run()}catch(e){return {failures:[{message:String(e),stack:e.stack}]}}})()');
 fs.writeFileSync(path.join(dir,'visibility-pacing'+(baseline?'-baseline':'')+'.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));
 clearTimeout(timer);app.exit(result.failures.length||errors.length?1:0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1)});
