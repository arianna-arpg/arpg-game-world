const {app,BrowserWindow}=require('electron');
const {buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'walk-gallery-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1050,height:710,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:
   "export {bodySprite} from './src/render/vis/body';export {drawWalkParts,applyWalkBodyPose} from './src/render/vis/walkParts';export {drawActionParts} from './src/render/vis/actionParts';export {LOOKS} from './src/data/looks';export {paintLook,lookPalette} from './src/render/vis/parts';export {visCacheStats,trimVisCaches} from './src/render/vis/caches';export {BODY_WALK_CFG} from './src/data/bodyWalk';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'WalkQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {bodySprite,drawWalkParts,applyWalkBodyPose,drawActionParts,LOOKS,paintLook,lookPalette,visCacheStats,trimVisCaches,BODY_WALK_CFG}=WalkQA;
   const c=document.createElement('canvas');c.width=1050;c.height=710;const ctx=c.getContext('2d');
   ctx.fillStyle='#34392c';ctx.fillRect(0,0,c.width,c.height);
   ctx.font='17px sans-serif';ctx.fillStyle='#ffffff';ctx.fillText('Native bodies: rest, left step, right step, side step, native size',18,27);
   const ids=['class_warrior','class_magician','class_rogue','goblin','skeleton_warrior'];
   const cache=new Set();let blits=0;
   ids.forEach((id,row)=>{
    const def=LOOKS[id],y=97+row*130;
    ctx.fillStyle='#ece2c8';ctx.font='14px sans-serif';ctx.fillText(id,16,y-37);
    [0,1,3,1,1,3,1].forEach((quarter,col)=>{
     const radius=col>=4?15:35;
     const look={shape:'circle',radius,color:id==='class_magician'?'#6983ae':id==='goblin'?'#688650':'#ae9e83',look:id,separateActionParts:true,separateWalkParts:true};
     const pose=quarter?{travel:def.walk.cycle*quarter/4,direction:col===3?Math.PI/2:0,weight:1}:undefined;
     ctx.save();ctx.translate(125+col*139,y);
     const blit=ctx.drawImage;
     ctx.drawImage=function(...args){cache.add(args[0]);blits++;return blit.apply(this,args)};
     drawWalkParts(ctx,look,def.walk,0,pose);
     ctx.save();applyWalkBodyPose(ctx,radius,def.walk,pose);
     const img=bodySprite(look);ctx.drawImage(img,-img.width/2,-img.height/2);
     drawActionParts(ctx,look,def);ctx.restore();ctx.drawImage=blit;ctx.restore();
    });
   });
   const footPixels=runtime=>{
    const c=document.createElement('canvas');c.width=c.height=150;const x=c.getContext('2d');x.translate(75,75);
    const gait={...LOOKS.class_warrior.walk,parts:[{...LOOKS.class_warrior.walk.parts[0],alpha:.4,mirror:true}]};
    if(runtime)drawWalkParts(x,{radius:24,shape:'circle',color:'#617e99',look:'qa_mirrored_foot'},gait,0);
    else paintLook(x,24,{parts:[],walk:gait},lookPalette('#617e99'));
    return Array.from(x.getImageData(0,0,150,150).data);
   };
   const staticPixels=footPixels(false),livePixels=footPixels(true);
   const mismatch=staticPixels.filter((p,i)=>p!==livePixels[i]).length;
   const oldLimit=BODY_WALK_CFG.paletteEntries;BODY_WALK_CFG.paletteEntries=4;
   const scratch=document.createElement('canvas').getContext('2d');
   for(let i=0;i<20;i++)drawWalkParts(scratch,{radius:15,shape:'circle',look:'class_warrior',color:'#'+(0x334455+i*100).toString(16)},LOOKS.class_warrior.walk,0);
   const bounded=visCacheStats().find(c=>c.id==='walkPalettes').n;
   trimVisCaches('run');const cleared=visCacheStats().find(c=>c.id==='walkPalettes').n;BODY_WALK_CFG.paletteEntries=oldLimit;
   return {png:c.toDataURL(),cache:cache.size,blits,mismatch,maxDelta:Math.max(...staticPixels.map((p,i)=>i%4===3?0:Math.abs(p*staticPixels[(i&~3)+3]-livePixels[i]*livePixels[(i&~3)+3])/255)),maxAlpha:Math.max(...staticPixels.filter((p,i)=>i%4===3).map((p,i)=>Math.abs(p-livePixels[i*4+3]))),bounded,cleared};
  })+')()');
  fs.writeFileSync(path.join(dir,'walking-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));
  console.log(JSON.stringify({...result,png:undefined}));
  assert.ok(result.blits>result.cache*2);
  // Cached transparent layers quantize their internal blends before compositing.
  assert.ok(result.maxAlpha<=1&&result.maxDelta<=3,'neutral mirrored/translucent anatomy preserves coverage and color within 8-bit compositing tolerance');
  assert.equal(result.bounded,4);assert.equal(result.cleared,0);
  console.log('PASS fixed foot sprites, neutral anatomy parity, bounded palettes and run cleanup');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
