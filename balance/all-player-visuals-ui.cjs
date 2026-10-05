// Shared vector artwork and every class's inherited anatomy; controlled render QA.
const {app,BrowserWindow}=require('electron'),{buildSync}=require('esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='all-player-visuals-r55';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true}});
 try{
  await win.loadURL('about:blank');
  const code=buildSync({stdin:{contents:"export {SKILLS} from './src/data/skills';export {CLASSES} from './src/data/classes';export {SKILL_ICONS,skillIconKey,drawSkillIcon,skillIconSvg} from './src/render/skillIcons';export {LOOKS} from './src/data/looks';export {bodySprite} from './src/render/vis/body';export {drawWalkParts,applyWalkBodyPose} from './src/render/vis/walkParts';export {drawActionParts} from './src/render/vis/actionParts';",resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'VisualQA'}).outputFiles[0].text;
  await win.webContents.executeJavaScript(code);
  const result=await win.webContents.executeJavaScript('('+ (async()=>{
   const {SKILLS,CLASSES,SKILL_ICONS,skillIconKey,drawSkillIcon,skillIconSvg,LOOKS,bodySprite,drawWalkParts,applyWalkBodyPose,drawActionParts}=VisualQA;
   const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
   const gallery=make(1200,Math.ceil(CLASSES.length/4)*122),ctx=gallery.getContext('2d');ctx.fillStyle='#30372b';ctx.fillRect(0,0,gallery.width,gallery.height);
   const before=JSON.stringify([SKILLS,LOOKS]),bodyChecks=[];
   function paint(g,cls,phase,radius){
    const def=LOOKS[cls.look],look={shape:'circle',radius,color:cls.color,look:cls.look,separateWalkParts:true,separateActionParts:true};
    const pose=phase?{travel:def.walk.cycle*phase/4,direction:0,weight:1}:undefined;
    drawWalkParts(g,look,def.walk,0,pose);g.save();applyWalkBodyPose(g,radius,def.walk,pose);const sprite=bodySprite(look);g.drawImage(sprite,-sprite.width/2,-sprite.height/2);drawActionParts(g,look,def);g.restore();
   }
   for(const [i,cls]of CLASSES.entries()){
    const x=i%4*300,y=Math.floor(i/4)*122;ctx.fillStyle='#f0e4cf';ctx.font='13px sans-serif';ctx.fillText(cls.name,x+10,y+18);
    for(const [col,phase]of [0,1,3].entries()){ctx.save();ctx.translate(x+48+col*88,y+71);paint(ctx,cls,phase,22);ctx.restore();}
    const a=make(100,100),b=make(100,100);const ag=a.getContext('2d'),bg=b.getContext('2d');ag.translate(50,50);bg.translate(50,50);paint(ag,cls,1,18);paint(bg,cls,3,18);
    bodyChecks.push({id:cls.id,limbs:LOOKS[cls.look].walk.parts.length,alternates:a.toDataURL()!==b.toDataURL()});
   }
   const faces=Object.keys(SKILL_ICONS).map(icon=>({icon,color:'#d6aa67',name:icon})),icons=make(1000,Math.ceil(faces.length/5)*116),ig=icons.getContext('2d');ig.fillStyle='#171a21';ig.fillRect(0,0,icons.width,icons.height);const parity=[];
   for(const [i,face]of faces.entries()){
    const a=make(48,48),b=make(48,48),ag=a.getContext('2d'),bg=b.getContext('2d');
    ag.globalAlpha=.8;ag.lineWidth=7;ag.fillStyle='#123456';const prior=JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]);drawSkillIcon(ag,face,0,0,48);
    if(prior!==JSON.stringify([ag.globalAlpha,ag.lineWidth,ag.fillStyle,ag.getTransform().toString()]))throw Error('canvas state changed');
    const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(skillIconSvg(face,48));});bg.globalAlpha=.8;bg.drawImage(img,0,0);
    const aa=ag.getImageData(0,0,48,48).data,bb=bg.getImageData(0,0,48,48).data;let total=0;for(let j=0;j<aa.length;j++)total+=Math.abs(aa[j]-bb[j]);parity.push({icon:face.icon,mean:total/aa.length});
    const x=i%5*200,y=Math.floor(i/5)*116;ig.font='13px sans-serif';ig.fillStyle='#f0e4cf';ig.fillText(face.name,x+10,y+18);ig.drawImage(a,x+10,y+30);ig.drawImage(b,x+68,y+30);drawSkillIcon(ig,face,x+128,y+43,22);drawSkillIcon(ig,face,x+164,y+47,15);
   }
   const starter=make(1200,Math.ceil(CLASSES.length/6)*92),sg=starter.getContext('2d');sg.fillStyle='#171a21';sg.fillRect(0,0,starter.width,starter.height);
   for(const [i,cls]of CLASSES.entries()){const x=i%6*200,y=Math.floor(i/6)*92;sg.font='12px sans-serif';sg.fillStyle='#f0e4cf';sg.fillText(cls.name,x+10,y+17);cls.bar.filter(Boolean).forEach((id,j)=>drawSkillIcon(sg,SKILLS[id],x+10+j*45,y+29,38));}
   // Census the actual Canvas path, not only the pure SVG string.
   let painted=0;const tiny=make(32,32),tg=tiny.getContext('2d');
   for(const def of Object.values(SKILLS)){tg.clearRect(0,0,32,32);drawSkillIcon(tg,def,0,0,32);if(tg.getImageData(16,16,1,1).data[3]!==255)throw Error('missing painted '+def.id);painted++;}
   return {bodies:gallery.toDataURL(),icons:icons.toDataURL(),starters:starter.toDataURL(),bodyChecks,parity,painted,same:before===JSON.stringify([SKILLS,LOOKS])};
  })+')()');
  for(const key of ['bodies','icons','starters']){fs.writeFileSync(path.join(dir,tag+'-'+key+'.png'),Buffer.from(result[key].split(',')[1],'base64'));delete result[key];}
  assert.ok(result.same);assert.ok(result.bodyChecks.every(c=>c.limbs===2&&c.alternates));for(const p of result.parity)assert.ok(p.mean<3,JSON.stringify(p));
  fs.writeFileSync(path.join(dir,tag+'.json'),JSON.stringify(result,null,2));
  console.log('PASS '+result.bodyChecks.length+' classes with alternating limbs, '+result.painted+' Canvas skill icons, '+result.parity.length+' SVG/Canvas families, state and registry preservation');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{win.destroy();app.exit(process.exitCode||0);}
});
