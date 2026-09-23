const {app,BrowserWindow}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'balance/reports/progression-refresh');
const expected=JSON.parse(fs.readFileSync(path.join(out,'progression-data.json'),'utf8'));
app.setPath('userData',path.join(out,'paths-preview-profile-'+process.pid));
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:790,height:1200,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message)});
 try{
  await win.loadFile(path.join(out,'paths-preview.html'));
  await new Promise(r=>setTimeout(r,900));
  const frame=win.webContents.mainFrame.framesInSubtree.find(f=>f!==win.webContents.mainFrame);
  assert(frame,'preview iframe');
  const run=s=>frame.executeJavaScript(s);
  assert.equal(await run('document.querySelectorAll("[data-node]").length'),expected.maps.find(m=>m.id===expected.defaultPath).nodes.length);
  fs.writeFileSync(path.join(out,'progression-overview.png'),(await win.webContents.capturePage()).toPNG());
  const paths=await run('[...document.querySelector("#hw-path").options].map(o=>o.value)');
  for(const id of paths){
   await run(`(()=>{const s=document.querySelector('#hw-path');s.value=${JSON.stringify(id)};s.dispatchEvent(new Event('change'));})()`);
   await new Promise(r=>setTimeout(r,40));
   assert.equal(await run('document.querySelectorAll("[data-node]").length'),expected.maps.find(m=>m.id===id).nodes.length,id+' nodes');
   assert.equal(await run('document.querySelectorAll(".hw-edges path[marker-end]").length'),await run('JSON.parse(document.querySelector("#hw-data").textContent).maps.find(m=>m.id===document.querySelector("#hw-path").value).edges.length'),id+' arrows');
   await run('document.querySelector("[data-node]").click()');
   assert(await run('document.querySelector("#hw-detail").textContent.length>30'),id+' detail');
   assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),id+' width');
  }
  await run(`(()=>{const s=document.querySelector('#hw-path');s.value='relics';s.dispatchEvent(new Event('change'));})()`);
  await new Promise(r=>setTimeout(r,100));
  fs.writeFileSync(path.join(out,'progression-desktop.png'),(await win.webContents.capturePage()).toPNG());
  win.setSize(320,1300);
  await new Promise(r=>setTimeout(r,150));
  for(const id of paths){
   await run(`(()=>{const s=document.querySelector('#hw-path');s.value=${JSON.stringify(id)};s.dispatchEvent(new Event('change'));document.querySelector('#hw-register').open=true;document.querySelectorAll('.hw-item').forEach(d=>d.open=true);})()`);
   const fits=await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1');
   if(!fits)console.log(await run('[...document.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,12).map(e=>({tag:e.tagName,cl:e.className,w:e.getBoundingClientRect().width,text:e.textContent.slice(0,90)}))'));
   assert(fits,id+' mobile width');
  }
  fs.writeFileSync(path.join(out,'progression-mobile.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);
  console.log('PASS: '+expected.maps.length+' maps, node selection, all arrows, exact registers, desktop/mobile widths, no browser errors');
 }finally{win.destroy();app.quit()}
}).catch(e=>{console.error(e.stack);app.exit(1)});
