// Actual native canopy painter/cache, plus deterministic visual gallery.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const report=path.join(__dirname,'reports');
app.setPath('userData',path.join(report,'needle-crown-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:680,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:
   "export {CANOPY_PAINTERS,crownSprite} from './src/render/vis/painters'; export {DOODAD_VISUALS} from './src/data/doodadVisuals';",
   resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'NeedleQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+(()=>{
   const {CANOPY_PAINTERS,crownSprite,DOODAD_VISUALS}=NeedleQA;
   const current=DOODAD_VISUALS.conifer.canopy.params;
   const legacy={fill:current.fill},theme={tree:'#345438',floor:'#242b20'};
   const radius=64,hash=bytes=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
   const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=680;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#20251c';ctx.fillRect(0,0,1280,680);
   const rows=[],random=Math.random;Math.random=()=>{throw Error('Rendering consumed combat randomness');};
   try{
    for(const [row,params] of [legacy,current].entries()){
     ctx.fillStyle='#e2d6ad';ctx.font='20px sans-serif';
     ctx.fillText(row?'Seeded needle boughs':'Existing star-ring canopy',28,row*320+32);
     const hashes=[];
     for(let variant=0;variant<8;variant++){
      const sprite=crownSprite('pineCrown',CANOPY_PAINTERS.pineCrown,theme,params,radius,variant);
      if(crownSprite('pineCrown',CANOPY_PAINTERS.pineCrown,theme,params,radius,variant)!==sprite)throw Error('Cache missed');
      hashes.push(hash(read(sprite)));
      const col=variant%4,y=Math.floor(variant/4);
      ctx.drawImage(sprite,50+col*310,row*320+48+y*133,192,192);
     }
     rows.push({variantHashes:hashes,unique:new Set(hashes).size});
    }
    const alphas=[];
    for(const alpha of [0,.25,.65,1]){
     const c=document.createElement('canvas');c.width=c.height=192;
     const x=c.getContext('2d');x.globalAlpha=.37;
     const o={pos:{x:96,y:96},radius,kind:'conifer',rot:.13};
     const before=JSON.stringify(o);
     CANOPY_PAINTERS.pineCrown({ctx:x,theme,time:0,world:null},o,alpha,current);
     if(JSON.stringify(o)!==before||x.globalAlpha!==.37)throw Error('Painter leaked state');
     const bytes=read(c);let sum=0,outside=0;
     for(let i=3;i<bytes.length;i+=4){
      sum+=bytes[i];
      const pixel=(i-3)/4,px=pixel%192,py=Math.floor(pixel/192);
      if(Math.hypot(px+.5-96,py+.5-96)>radius+2)outside+=bytes[i];
     }
     alphas.push({alpha,sum,outside});
    }
    const changed=crownSprite('pineCrown',CANOPY_PAINTERS.pineCrown,theme,
      {fill:current.fill,needles:{...current.needles,boughs:6}},radius,0);
    const palette=crownSprite('pineCrown',CANOPY_PAINTERS.pineCrown,
      {...theme,tree:'#765638'},current,radius,0);
    return {rows,alphas,tunedHash:hash(read(changed)),paletteHash:hash(read(palette)),png:canvas.toDataURL()};
   }finally{Math.random=random;}
  })+')()');
  assert.equal(result.rows[0].unique,1);assert.equal(result.rows[1].unique,8);
  assert.notEqual(result.rows[0].variantHashes[0],result.rows[1].variantHashes[0]);
  assert.equal(result.alphas[0].sum,0);assert.ok(result.alphas.every(v=>v.outside===0));
  assert.ok(result.alphas.every((v,i,a)=>!i||v.sum>a[i-1].sum));
  assert.notEqual(result.tunedHash,result.rows[1].variantHashes[0]);
  assert.notEqual(result.paletteHash,result.rows[1].variantHashes[0]);
  fs.writeFileSync(path.join(report,'needle-crown-gallery.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  fs.writeFileSync(path.join(report,'needle-crown-ui.json'),JSON.stringify(result,null,2));
  console.log('PASS native crown cache, eight seeded variants, alpha/extent, untouched painter state and RNG, palette and authored shape');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
