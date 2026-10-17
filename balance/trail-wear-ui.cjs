// Native trail painter: geographic continuity and visual configuration.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const report=path.join(__dirname,'reports');
app.setPath('userData',path.join(report,'trail-wear-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:700,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:
   "export {paintMassTrailWear,MASS_TRAIL_VIEW} from './src/worldmass/trailWear';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'TrailQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {paintMassTrailWear,MASS_TRAIL_VIEW}=TrailQA;
   const trails=[{id:'curved',width:120,points:[{x:-780,y:-120},{x:-420,y:220},{x:0,y:200},{x:480,y:-100},{x:1000,y:270}]},
     {id:'junction',width:120,points:[{x:0,y:200},{x:0,y:200},{x:180,y:470}]}];
   const before=JSON.stringify(trails),random=Math.random;Math.random=()=>{throw Error('Painter consumed simulation RNG');};
   const create=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
   const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const hash=c=>{let h=2166136261;for(const b of read(c))h=Math.imul(h^b,16777619);return h>>>0;};
   const draw=(x,y,w,h,cfg=MASS_TRAIL_VIEW,seed=42)=>{
    const c=create(w,h),ctx=c.getContext('2d');ctx.fillStyle='#62573e';ctx.fillRect(0,0,w,h);ctx.translate(-x,-y);ctx.globalAlpha=.73;ctx.lineWidth=5;ctx.lineCap='butt';
    const state=JSON.stringify([ctx.getTransform().toString(),ctx.globalAlpha,ctx.lineWidth,ctx.lineCap]);
    paintMassTrailWear(ctx,trails,{x,y,w,h},seed,cfg);
    if(state!==JSON.stringify([ctx.getTransform().toString(),ctx.globalAlpha,ctx.lineWidth,ctx.lineCap]))throw Error('Canvas state leaked');
    return c;
   };
   try{
    const whole=draw(-768,-128,1536,768),tiled=create(1536,768),tctx=tiled.getContext('2d');
    for(let y=0;y<3;y++)for(let x=0;x<6;x++)tctx.drawImage(draw(-768+x*256,-128+y*256,256,256),x*256,y*256);
    const a=read(whole),b=read(tiled);let different=0,max=0,total=0;
    for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)different++;max=Math.max(max,d);total+=d;}
    const disabled=draw(-768,-128,1536,768,{...MASS_TRAIL_VIEW,enabled:false});
    const tuned=draw(-768,-128,1536,768,{...MASS_TRAIL_VIEW,laneOffset:.30,grassChance:0});
    const changedSeed=draw(-768,-128,1536,768,MASS_TRAIL_VIEW,43);
    const empty=create(200,200);
    paintMassTrailWear(empty.getContext('2d'),[{id:'empty',width:120,points:[]},{id:'still',width:120,points:[{x:0,y:0},{x:0,y:0}]}],
      {x:0,y:0,w:200,h:200},42);
    const gallery=create(1280,700),g=gallery.getContext('2d');g.fillStyle='#353b2a';g.fillRect(0,0,1280,700);
    for(const side of [0,1]){
     g.save();g.beginPath();g.rect(side*640,0,640,700);g.clip();g.translate(side*640+160,140);
     g.scale(.72,.72);g.lineWidth=120;g.strokeStyle='#62573e';g.lineJoin='round';g.lineCap='round';
     for(const trail of trails){g.beginPath();trail.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();}
     if(side)paintMassTrailWear(g,trails,{x:-768,y:-128,w:1536,h:768},42);
     g.restore();g.fillStyle='#e2d6ad';g.font='18px sans-serif';g.fillText(side?'Saved routes with surface wear':'Existing route fill',side*640+24,35);
    }
    return {different,max,total,wholeHash:hash(whole),tileHash:hash(tiled),repeatHash:hash(draw(-768,-128,1536,768)),
      disabledDistinct:(()=>{const d=read(disabled),colors=new Set();for(let i=0;i<d.length;i+=4)colors.add(d.slice(i,i+4).toString());return colors.size;})(),emptyAlpha:read(empty).filter((_,i)=>i%4===3).reduce((n,v)=>n+v,0),
      tunedHash:hash(tuned),seedHash:hash(changedSeed),preserved:before===JSON.stringify(trails),png:gallery.toDataURL()};
   }finally{Math.random=random;}
  })+')()');
  assert.equal(result.disabledDistinct,1);assert.equal(result.emptyAlpha,0);assert.ok(result.preserved);
  assert.equal(result.repeatHash,result.wholeHash);assert.notEqual(result.tunedHash,result.wholeHash);assert.notEqual(result.seedHash,result.wholeHash);
  fs.writeFileSync(path.join(report,'trail-wear-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(path.join(report,'trail-wear-ui.json'),JSON.stringify(result,null,2));
  // Canvas rasterizers may round subpixel edge coverage differently after clipping.
  // The tile comparison records this explicitly rather than accepting arbitrary seams.
  assert.ok(result.max<=5&&result.total/(1536*768*4)<.003,'tiled geographic paint diverged: '+JSON.stringify(result));
  console.log(JSON.stringify(result));
  console.log('PASS native trail surfaces, geographic page comparison, repeatability, configuration, degenerates and unchanged painter inputs/RNG');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
