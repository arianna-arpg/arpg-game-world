// Shared sentinel anatomy at actual sizes and in native action/walking poses.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'sentinel-gallery-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1050,height:460,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const bundle=buildSync({stdin:{contents:
   "import './src/data/glyphParts';export {bodySprite,spriteHalf} from './src/render/vis/body';export {drawWalkParts,applyWalkBodyPose} from './src/render/vis/walkParts';export {drawActionParts} from './src/render/vis/actionParts';export {LOOKS} from './src/data/looks';export {PART_PAINTERS} from './src/render/vis/parts';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'SentinelQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(bundle);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {bodySprite,drawWalkParts,applyWalkBodyPose,drawActionParts,LOOKS,PART_PAINTERS}=SentinelQA;
   const c=document.createElement('canvas');c.width=1050;c.height=460;const ctx=c.getContext('2d'),def=LOOKS.sentinel;
   ctx.fillStyle='#333b32';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f5ebda';ctx.font='18px sans-serif';
   ctx.fillText('Sentinels · rest / windup / strike / step / native size / portrait',20,32);
   const missing=[...def.parts,...def.walk.parts].filter(p=>!PART_PAINTERS[p.kind]).map(p=>p.kind);
   ['#9a988a','#a8d8e8'].forEach((color,row)=>{
    const y=140+row*205;
    ctx.font='14px sans-serif';ctx.fillStyle=color;ctx.fillText(row?'Glassguard palette':'Stone palette',20,y-50);
    for(let col=0;col<6;col++){
     const r=col===4?(row?18:19):col===5?35:40,look={shape:'rectangle',radius:r,color,look:'sentinel',
      separateActionParts:col!==5,separateWalkParts:col!==5};
     const action=col===1?{prepare:1,strike:0}:col===2?{prepare:0,strike:1}:undefined;
     const walk=col===3?{travel:def.walk.cycle/4,direction:0,weight:1}:undefined;
     ctx.save();ctx.translate(120+col*169,y);ctx.rotate(-Math.PI/2);
     if(col!==5){drawWalkParts(ctx,look,def.walk,-Math.PI/2,walk);applyWalkBodyPose(ctx,r,def.walk,walk);}
     const img=bodySprite(look);ctx.drawImage(img,-img.width/2,-img.height/2);
     if(col!==5)drawActionParts(ctx,look,def,action);ctx.restore();
    }
   });
   return {png:c.toDataURL(),missing,parts:def.parts.length,feet:def.walk.parts.length};
  })+')()');
  fs.writeFileSync(path.join(dir,'sentinel-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));
  assert.deepEqual(result.missing,[]);console.log(JSON.stringify({...result,png:undefined}));
  console.log('PASS shared native parts resolve for both sentinel palettes, articulated poses and complete static portraits');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
