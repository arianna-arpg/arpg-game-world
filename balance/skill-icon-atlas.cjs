// Real Chromium raster QA for the entire skill catalog; no gameplay save access.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports','skill-icon-atlas');
fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:1100,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const timer=setTimeout(()=>app.exit(1),180000);
 const save=(name,data)=>fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:"export {SKILLS} from './src/data/skills';export {CLASSES} from './src/data/classes';export {SKILL_ICONS,SKILL_ICON_VIEW,configureSkillArtwork,skillIconKey,drawSkillIcon,skillIconSvg} from './src/render/skillIcons';",resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'IconQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+ (async()=>{
   const {SKILLS,CLASSES,SKILL_ICONS,SKILL_ICON_VIEW:cfg,configureSkillArtwork,skillIconKey,drawSkillIcon:draw,skillIconSvg:svg}=IconQA;
   configureSkillArtwork(()=>true);
   const canvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
   const backdrop=c=>{const g=c.getContext('2d');g.fillStyle='#101820';g.fillRect(0,0,c.width,c.height);return g;};
   const pages=[],rows=[],fingerprints=new Map(),collisions=[],tinyCollisions=[],tinyHashes=new Map();
   const all=Object.values(SKILLS),saved=JSON.stringify([SKILLS,cfg,SKILL_ICONS]),random=Math.random;
   Math.random=()=>{throw Error('art consumed gameplay randomness');};
   let sheet,g;
   try{
    for(const [i,face]of all.entries()){
     if(i%80===0){if(sheet)pages.push(sheet.toDataURL());sheet=canvas(1440,1052);g=backdrop(sheet);g.fillStyle='#f4ebd7';g.font='bold 20px sans-serif';g.fillText('HOLLOW WAKE / SKILL IDENTITIES   '+(1+Math.floor(i/80)),20,28);g.font='12px sans-serif';g.fillStyle='#9daeb8';g.fillText('48px art · 32px monochrome · 22px Memory · 15px rack · 12px chips',20,49);}
     const x=i%8*180,y=66+Math.floor(i%80/8)*98;
     g.font='11px sans-serif';g.fillStyle='#e5ded0';g.fillText(face.name,x+8,y+14,165);
     draw(g,face,x+8,y+25,48);draw(g,face,x+108,y+39,22);draw(g,face,x+139,y+44,15);draw(g,face,x+162,y+46,12);
     draw(g,{...face,color:'#f4ebd7'},x+65,y+33,32);
     const a=canvas(48),b=canvas(48),ag=a.getContext('2d'),bg=b.getContext('2d');
     ag.globalAlpha=.81;ag.lineWidth=7;ag.fillStyle='#123456';ag.translate(0,0);
     const prior=JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]);draw(ag,face,0,0,48);
     if(prior!==JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]))throw Error('Canvas state changed: '+face.id);
     const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(face,48));});bg.globalAlpha=.81;bg.drawImage(img,0,0);
     const aa=ag.getImageData(0,0,48,48).data,bb=bg.getImageData(0,0,48,48).data;let total=0;
     for(let j=0;j<aa.length;j++)total+=Math.abs(aa[j]-bb[j]);
     const mono={...face,color:'#f4ebd7'};
     for(const size of [12,32]){
      const c=canvas(size),cg=c.getContext('2d');draw(cg,mono,0,0,size);
      const pixels=cg.getImageData(0,0,size,size).data;let bright=0;
      for(let j=0;j<pixels.length;j+=4)if(pixels[j]>130)bright++;
      if(bright<size*size*.025)throw Error('Empty face: '+face.id+' at '+size);
      const key=c.toDataURL(),map=size===32?fingerprints:tinyHashes,dups=size===32?collisions:tinyCollisions;
      if(map.has(key))dups.push([map.get(key),face.id]);map.set(key,face.id);
     }
     rows.push({id:face.id,key:skillIconKey(face),mean:total/aa.length});
    }
    pages.push(sheet.toDataURL());
    const starters=canvas(1440,Math.ceil(CLASSES.length/6)*140+40),sg=backdrop(starters);
    sg.font='bold 20px sans-serif';sg.fillStyle='#f4ebd7';sg.fillText('ALL CLASS OPENING BARS / COLOR + MONOCHROME',15,26);
    for(const [i,c]of CLASSES.entries()){
     const x=i%6*240,y=40+Math.floor(i/6)*140;sg.font='13px sans-serif';sg.fillStyle='#f4ebd7';sg.fillText(c.name,x+8,y+17);
     c.bar.filter(Boolean).forEach((id,j)=>{draw(sg,SKILLS[id],x+8+j*65,y+26,48);draw(sg,{...SKILLS[id],color:'#f4ebd7'},x+16+j*65,y+83,32);});
    }
    // Alpha is applied to the complete cached face; all runtime paint state stays owned by the caller.
    const preview=canvas(960,240),pg=backdrop(preview),examples=['cleave','frost_nova','summon_skeleton_mage','life_flask','shield_up','shadow_step'];
    for(const [i,id]of examples.entries()){pg.globalAlpha=1;draw(pg,SKILLS[id],i*160+12,12,96);pg.globalAlpha=.3;draw(pg,SKILLS[id],i*160+12,125,96);}
    pg.globalAlpha=1;
    const stable=saved===JSON.stringify([SKILLS,cfg,SKILL_ICONS]);
    return {pages,starters:starters.toDataURL(),preview:preview.toDataURL(),rows,collisions,tinyCollisions,stable};
   }finally{Math.random=random;}
  })+')()');
  result.pages.forEach((data,i)=>save('atlas-'+String(i+1).padStart(2,'0'),data));delete result.pages;
  save('class-bars',result.starters);delete result.starters;save('alpha-preview',result.preview);delete result.preview;
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(result,null,2));
  assert.ok(result.stable,'registry and palette must stay unchanged');
  assert.deepEqual(result.collisions,[],'monochrome 32px duplicate artwork');
  assert.deepEqual(result.tinyCollisions,[],'monochrome 12px duplicate artwork');
  for(const r of result.rows)assert.ok(r.mean<3,'SVG/Canvas parity: '+JSON.stringify(r));
  console.log('PASS '+result.rows.length+' unique 12/32px monochrome faces; all SVG/Canvas parity, nonempty pixels, state/RNG preservation; 39 class bars and full atlas rendered.');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();app.exit(process.exitCode||0);}
});
