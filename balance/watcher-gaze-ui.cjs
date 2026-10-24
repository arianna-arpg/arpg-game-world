const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'reports');
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
const label='watcher-gaze'+(baseline?'-baseline':'');
app.setPath('userData',path.join(dir,label+'-profile-'+process.pid));
app.disableHardwareAcceleration();
const timer=setTimeout(()=>{console.error('Watcher visual check timed out');app.exit(1)},180000);
app.whenReady().then(async()=>{
  fs.mkdirSync(dir,{recursive:true});
  const plugins=baseline?[{name:'baseline',setup(b){
    b.onLoad({filter:/[\\/]src[\\/](engine[\\/](ai|world)|data[\\/]monsters)\.ts$/},args=>({
      contents:execFileSync('git',['show',baseline+':'+path.relative(root,args.path).replaceAll('\\','/')],{cwd:root,encoding:'utf8',maxBuffer:8e6}),
      loader:'ts',resolveDir:path.dirname(args.path)
    }));
  }}]:[];
  await require('esbuild').build({entryPoints:[path.join(__dirname,'watcherGazeFixture.ts')],bundle:true,format:'iife',outfile:path.join(dir,label+'.js'),plugins});
  fs.writeFileSync(path.join(dir,label+'.html'),'<!doctype html><script src="'+label+'.js"></script>');
  const win=new BrowserWindow({show:false,width:1000,height:620,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
  await win.loadFile(path.join(dir,label+'.html'));
  const result=await win.webContents.executeJavaScript('watcherGazeQA.run()');
  result.shots.forEach((png,i)=>fs.writeFileSync(path.join(dir,label+'-'+i+'.png'),Buffer.from(png.split(',')[1],'base64')));
  delete result.shots;
  fs.writeFileSync(path.join(dir,label+'.json'),JSON.stringify({...result,errors},null,2));
  console.log(JSON.stringify({...result,errors},null,2));clearTimeout(timer);
  app.exit(result.failures.length||errors.length?1:0);
}).catch(e=>{console.error(e);clearTimeout(timer);app.exit(1)});
