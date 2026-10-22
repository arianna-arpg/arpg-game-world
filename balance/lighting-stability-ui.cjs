const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'reports');
fs.mkdirSync(dir,{recursive:true});
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
app.setPath('userData',path.join(dir,'lighting-profile-'+process.pid));
if(process.env.VIS_GPU!=='1')app.disableHardwareAcceleration();
const timer=setTimeout(()=>{console.error('Lighting QA timed out');app.exit(1)},240000);
app.whenReady().then(async()=>{
 const plugins=baseline?[{name:'baseline',setup(build){build.onLoad({filter:/[\\/]src[\\/]render[\\/]vis[\\/](sight|sightVeil|lights|visConfig)\.ts$|[\\/]src[\\/]data[\\/]feedingCues\.ts$|[\\/]src[\\/]engine[\\/]world\.ts$/},args=>({
  contents:execFileSync('git',['show',baseline+':'+path.relative(root,args.path).replaceAll('\\','/')],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}),
  loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[];
 await require('esbuild').build({entryPoints:[path.join(__dirname,'lightingFixture.ts')],bundle:true,format:'iife',outfile:path.join(dir,'lighting-fixture.js'),plugins});
 fs.writeFileSync(path.join(dir,'lighting-fixture.html'),'<!doctype html><script src="lighting-fixture.js"></script>');
 const win=new BrowserWindow({show:false,width:1280,height:960,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 await win.loadFile(path.join(dir,'lighting-fixture.html'));
 const result=await win.webContents.executeJavaScript('(()=>{try{return window.lightingFixture.run()}catch(e){return {failures:[{error:String(e),stack:e.stack}]}}})()');
 if(process.argv.includes('--combat')) result.combat=await win.webContents.executeJavaScript('window.lightingFixture.combatProfile('+process.argv.includes('--profile-movement')+')');
 fs.writeFileSync(path.join(dir,'lighting-stability'+(baseline?'-baseline':'')+'.json'),JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,errors},null,2));clearTimeout(timer);app.exit(result.failures.length||errors.length?1:0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1)});
