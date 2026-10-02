// Geographic painter QA, independent of the gameplay critic's native-input client.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'surface-detail-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1200,height:660,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:"export {paintMassSurfaceDetail,MASS_SURFACE_VIEW} from './src/worldmass/surfaceDetail';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'SurfaceQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {paintMassSurfaceDetail:paint,MASS_SURFACE_VIEW:cfg}=SurfaceQA;
   const random=Math.random;Math.random=()=>{throw Error('simulation RNG used');};
   const create=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
   const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const hash=c=>{let h=2166136261;for(const b of read(c))h=Math.imul(h^b,16777619);return h>>>0;};
   const initial=JSON.stringify(cfg),rows=[];
   const draw=(region,x,y,w,h,settings=cfg,seed=42)=>{
    const c=create(w,h),g=c.getContext('2d');g.fillStyle='#566664';g.fillRect(0,0,w,h);
    g.translate(-x,-y);g.globalAlpha=.79;g.lineWidth=7;g.lineCap='butt';
    const before=JSON.stringify([g.getTransform().toString(),g.globalAlpha,g.lineWidth,g.lineCap]);
    paint(g,{x,y,w,h},seed,region,settings);
    if(before!==JSON.stringify([g.getTransform().toString(),g.globalAlpha,g.lineWidth,g.lineCap]))throw Error('Canvas state changed');
    return c;
   };
   try{
    const gallery=create(1200,660),gg=gallery.getContext('2d');
    for(const [i,region] of ['ice','swamp','mud'].entries()){
     const whole=draw(region,-512,-256,1024,768),tiled=create(1024,768),g=tiled.getContext('2d');
     for(let y=0;y<3;y++)for(let x=0;x<4;x++)g.drawImage(draw(region,-512+x*256,-256+y*256,256,256),x*256,y*256);
     const a=read(whole),b=read(tiled);let different=0,max=0,total=0;
     for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);if(d)different++;max=Math.max(max,d);total+=d;}
     const tuned=JSON.parse(initial);tuned.regions[region].extent*=.5;
     rows.push({region,max,total,different,hash:hash(whole),repeat:hash(draw(region,-512,-256,1024,768)),
      otherSeed:hash(draw(region,-512,-256,1024,768,cfg,43)),tuned:hash(draw(region,-512,-256,1024,768,tuned))});
     gg.save();gg.beginPath();gg.rect(i*400,0,400,660);gg.clip();gg.translate(i*400,0);
     gg.fillStyle=['#82999f','#30483d','#1a2a1a'][i];gg.fillRect(0,0,400,660);
     paint(gg,{x:0,y:0,w:400,h:660},42,region);
     gg.fillStyle='#eee';gg.font='18px sans-serif';gg.fillText(region,20,32);gg.restore();
    }
    const alpha=(region,settings)=>{const c=create(128,128);paint(c.getContext('2d'),{x:0,y:0,w:128,h:128},42,region,settings);
     return read(c).filter((_,i)=>i%4===3).reduce((n,v)=>n+v,0);};
    return {rows,disabled:alpha('ice',{...cfg,enabled:false}),unknown:alpha('unregistered',cfg),
     invalid:alpha('ice',{...cfg,regions:{ice:{...cfg.regions.ice,spacing:0}}}),unchanged:initial===JSON.stringify(cfg),png:gallery.toDataURL()};
   }finally{Math.random=random;}
  })+')()');
  fs.writeFileSync(path.join(dir,'surface-detail-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(path.join(dir,'surface-detail-ui.json'),JSON.stringify(result,null,2));
  for(const row of result.rows){
   assert.equal(row.hash,row.repeat);assert.notEqual(row.hash,row.otherSeed);assert.notEqual(row.hash,row.tuned);
   assert.ok(row.max<=5&&row.total/(1024*768*4)<.003,'tile seams: '+JSON.stringify(row));
  }
  assert.ok(result.unchanged);assert.equal(result.disabled,0);assert.equal(result.unknown,0);assert.equal(result.invalid,0);
  console.log(JSON.stringify(result));console.log('PASS geographic surface motifs across negative pages, configuration, deterministic redraw, silence and state/RNG preservation');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
