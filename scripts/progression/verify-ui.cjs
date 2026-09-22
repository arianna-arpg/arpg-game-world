// Run against a visualize render.py preview. No game launch, account writes or network.
const {app,BrowserWindow}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'balance/reports/progression-refresh');
app.setPath('userData',path.join(out,'preview-profile-'+process.pid));
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:790,height:1500,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message)});
 try{
  await win.loadFile(path.join(out,'overview-preview.html'));
  await new Promise(r=>setTimeout(r,600));
  const frame=win.webContents.mainFrame.framesInSubtree.find(f=>f!==win.webContents.mainFrame);
  assert(frame,'preview iframe');const run=s=>frame.executeJavaScript(s);
  const expected=JSON.parse(fs.readFileSync(path.join(out,'overview-data.json'),'utf8'));
  assert.equal(await run('document.querySelectorAll("[data-node]").length'),expected.nodes.length);
  assert.equal(await run('document.querySelectorAll("path[data-from]").length'),expected.edges.length);
  fs.writeFileSync(path.join(out,'overview-desktop.png'),(await win.webContents.capturePage()).toPNG());
  const represented=new Set();
  for(const n of expected.nodes){
   await run(`document.querySelector('[data-node="${n.id}"]').click()`);
   assert.equal(await run('document.querySelectorAll("#hw-whole-detail").length'),1);
   const ids=await run('[...document.querySelectorAll("[data-catalog-row]")].map(e=>e.dataset.catalogRow)');
   assert.deepEqual(ids.sort(),[...n.rows].sort(),n.id+' catalog');ids.forEach(id=>represented.add(id));
   assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),n.id+' desktop width');
  }
  assert.equal(represented.size,expected.rows.length);
  await run(`document.querySelector('[data-node="power"]').click()`);
  await run(`document.querySelector('[data-node="power"]').scrollIntoView({block:'start'})`);
  fs.writeFileSync(path.join(out,'overview-detail.png'),(await win.webContents.capturePage()).toPNG());
  win.setSize(320,1300);await new Promise(r=>setTimeout(r,200));
  for(const n of expected.nodes){
   await run(`document.querySelector('[data-node="${n.id}"]').click();document.querySelectorAll('#hw-whole-detail details').forEach(e=>e.open=true)`);
   const fits=await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1');
   if(!fits)console.log(await run('({sizes:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.body.scrollWidth,window.innerWidth],els:[...document.querySelectorAll("*")].filter(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,15).map(e=>({tag:e.tagName,cl:e.className,w:e.getBoundingClientRect().width,sw:e.scrollWidth,cw:e.clientWidth,text:e.textContent.slice(0,100)}))})'));
   assert(fits,n.id+' mobile width');
  }
  await run(`document.querySelector('[data-node="seal"]').click();window.scrollTo(0,0)`);
  await win.webContents.executeJavaScript('window.scrollTo(0,0)');
  await new Promise(r=>setTimeout(r,100));
  fs.writeFileSync(path.join(out,'overview-mobile.png'),(await win.webContents.capturePage()).toPNG());
  // Restoration should select without writing back to the host.
  await run(`window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{privateContent:{overviewNode:'power'}}}}}))`);
  assert.equal(await run('document.querySelector("[aria-pressed=true]").dataset.node'),'power');
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${expected.nodes.length} systems, ${expected.edges.length} relationships, all ${represented.size} catalog entries, selection/state restoration, 790px and 320px layouts, no browser errors`);
 }finally{win.destroy();app.quit()}
}).catch(e=>{console.error(e.stack);app.exit(1)});
