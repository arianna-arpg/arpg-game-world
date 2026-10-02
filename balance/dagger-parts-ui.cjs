const {app,BrowserWindow}=require('electron');
const {buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path');
const report=path.join(__dirname,'reports');
app.setPath('userData',path.join(report,'rogue-neutral-'+process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:
    "import {paintLook,lookPalette} from './src/render/vis/parts'; import {LOOKS} from './src/data/looks'; export {paintLook,lookPalette,LOOKS};",
    resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'NeutralQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
    const {paintLook,lookPalette,LOOKS}=NeutralQA;
    const now=LOOKS.class_rogue;
    // Keep the current body composition; compare paired and articulated blades.
    const before={parts:now.parts.flatMap(part=>part.kind!=='daggers'?[part]
      :part.params.side===1?[{...part,action:undefined,params:{len:part.params.len}}]:[])};
    const rows=[];
    for(const radius of [12,18,40])for(const color of ['#5a5c57','#d8b06a','#7a9aff']){
      const paint=look=>{
        const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.translate(128,128);
        paintLook(x,radius,look,lookPalette(color));return x.getImageData(0,0,256,256).data;
      };
      const old=paint(before),current=paint(now);let changed=0;
      for(let i=0;i<old.length;i++)if(old[i]!==current[i])changed++;
      rows.push({radius,color,changed});
    }
    return rows;
  })+')()');
  fs.writeFileSync(path.join(report,'rogue-neutral-ui.json'),JSON.stringify(result,null,2));
  if(result.some(r=>r.changed))throw Error(JSON.stringify(result));
  console.log('PASS nine native neutral portraits are pixel-identical after separating the dagger pair');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
