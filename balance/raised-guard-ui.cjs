// Isolated native shield artwork and mechanical guard acceptance.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const report=path.join(__dirname,'reports');
app.setPath('userData',path.join(report,'raised-guard-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:640,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:"export {drawRaisedGuard,RAISED_GUARD_VIEW} from './src/render/vis/raisedGuard';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'RaisedQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {drawRaisedGuard,RAISED_GUARD_VIEW}=RaisedQA,create=()=>{const c=document.createElement('canvas');c.width=c.height=160;return c;};
   const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const hash=c=>{let h=2166136261;for(const b of read(c))h=Math.imul(h^b,16777619);return h>>>0;};
   const paint=(fraction,alpha=1,arc=Math.PI*2/3)=>{
    const c=create(),x=c.getContext('2d');x.translate(80,80);x.lineWidth=3;x.globalAlpha=.29;
    const before=JSON.stringify([x.getTransform().toString(),x.globalAlpha,x.lineWidth,x.fillStyle,x.strokeStyle]);
    drawRaisedGuard(x,32,0,arc,fraction,'#8ab8d8',alpha);
    if(before!==JSON.stringify([x.getTransform().toString(),x.globalAlpha,x.lineWidth,x.fillStyle,x.strokeStyle]))throw Error('Leaked state');
    return c;
   };
   const gallery=document.createElement('canvas');gallery.width=1280;gallery.height=640;
   const ctx=gallery.getContext('2d');ctx.fillStyle='#283328';ctx.fillRect(0,0,1280,640);
   const random=Math.random;Math.random=()=>{throw Error('Paint consumed combat RNG');};
   try{
    const rows=[];
    for(const [i,fraction] of [1,.5,.1].entries()){
     const c=paint(fraction);let behind=0,outside=0,total=0;const d=read(c);
     for(let n=3;n<d.length;n+=4){total+=d[n];const p=(n-3)/4,x=p%160-80+.5,y=Math.floor(p/160)-80+.5;
      if(x<0)behind+=d[n];if(Math.hypot(x,y)>36)outside+=d[n];}
     ctx.drawImage(c,i*410+40,85,320,320);ctx.fillStyle='#e1dfbd';ctx.font='20px sans-serif';
     ctx.fillText(Math.round(fraction*100)+'% native shield remaining',i*410+25,52);
     rows.push({fraction,hash:hash(c),behind,outside,total});
    }
    const zeros=read(paint(1,0)).reduce((n,v)=>n+v,0),faded=read(paint(1,.25)).filter((_,i)=>i%4===3).reduce((n,v)=>n+v,0);
    const wide=paint(1,1,Math.PI*4/3);ctx.drawImage(wide,45,370,200,200);
    ctx.font='16px sans-serif';ctx.fillStyle='#e1dfbd';ctx.fillText('Native 240° coverage',245,480);
    RAISED_GUARD_VIEW.enabled=false;const disabled=read(paint(1)).reduce((n,v)=>n+v,0);
    return {rows,zeros,faded,disabled,wideHash:hash(wide),png:gallery.toDataURL()};
   }finally{Math.random=random;RAISED_GUARD_VIEW.enabled=true;}
  })+')()');
  fs.writeFileSync(path.join(report,'raised-guard-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(path.join(report,'raised-guard-ui.json'),JSON.stringify(result,null,2));
  assert.equal(result.zeros,0);assert.equal(result.disabled,0);assert.ok(result.faded<result.rows[0].total);
  assert.equal(new Set(result.rows.map(r=>r.hash)).size,3);
  assert.ok(result.rows.every(r=>r.behind===0&&r.outside===0));assert.notEqual(result.wideHash,result.rows[0].hash);
  console.log(JSON.stringify(result));
  console.log('PASS actual shield face strengths, native arc extent, opacity/disable controls and unchanged canvas state/RNG');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
