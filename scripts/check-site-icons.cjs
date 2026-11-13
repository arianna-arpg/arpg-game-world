// npx electron scripts/check-site-icons.cjs (after the normal web-data export)
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {makeTempDir}=require('./temp-dir.cjs');
app.setPath('userData',makeTempDir('hollow-site-icons-'));
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const root=path.resolve(__dirname,'../site'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
let requests=[],failImages=false;const checks=[];
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';requests.push(name);
 if(name==='/assets/cinema.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 if(failImages&&name.includes('/art/icons/')){res.writeHead(503);return res.end();}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(name,ok){checks.push(!!ok);console.log((ok?'PASS ':'FAIL ')+name);}
app.whenReady().then(async()=>{let win;const timeout=setTimeout(()=>{console.error('Icon checks timed out');app.exit(1);},90000);
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  win=new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
  const js=code=>win.webContents.executeJavaScript(code),until=async code=>{for(let i=0;i<140;i++){if(await js('!!('+code+')'))return;await wait(50);}throw new Error('Timed out: '+code);};
  await win.loadURL(base);await until('window.HWIcons&&document.querySelector(".hero-scenery.memory-ready")');
  check('initial page requests no item images or provenance catalogue',!requests.some(p=>p.includes('/art/icons/')));
  await js('document.querySelector(".collection").scrollIntoView({behavior:"instant",block:"center"});true');
  await until('document.querySelectorAll(".hwsc-rack .hw-icon.is-ready").length===18');
  for(const [kind,key]of[['skill','skills'],['support','supports'],['unique','uniques']]){
   await js(`document.querySelector('.hwsc-tab[data-key="${key}"]').click();true`);await until('document.querySelectorAll(".hwsc-rack .hw-icon.is-ready").length===18');
   check(kind+' keeps 18 distinct exact-ID pictures and accessible names',await js(`(()=>{const buttons=[...document.querySelectorAll('.hwsc-chip')];return buttons.length===18&&new Set(buttons.map(b=>b.querySelector('img').src)).size===18&&buttons.every(b=>b.querySelector('img').src.includes('/${kind}/'+b.dataset.id+'.')&&b.getAttribute('aria-label')===b.querySelector('.hwsc-item-name').textContent)})()`));
  }
  // The offscreen test window cannot take OS focus; deliver the same delegated event.
  await js('document.querySelector(".hwsc-chip").focus();document.querySelector(".hwsc-chip").dispatchEvent(new FocusEvent("focusin",{bubbles:true}));true');await until('document.querySelector(".hwsc-tip .hw-icon.is-ready")');
  check('focused tooltip retains item details and selected artwork',await js('document.querySelector(".hwsc-tip").textContent.includes(document.querySelector(".hwsc-chip").getAttribute("aria-label"))&&document.querySelector(".hwsc-tip img").src===document.querySelector(".hwsc-chip img").src'));
  const before=await js('[...document.querySelectorAll(".hwsc-chip")].map(b=>b.dataset.id).join(",")');await js('document.querySelector(".hwsc-shuffle").click();true');await until('document.querySelectorAll(".hwsc-rack .hw-icon.is-ready").length===18');
  check('shuffle keeps matching images on a new spread',before!==await js('[...document.querySelectorAll(".hwsc-chip")].map(b=>b.dataset.id).join(",")'));
  check('unknown identities keep a semantic fallback without guessing an image',await js('!HWIcons.html({id:"new_future_skill"},"skill").includes("<img")&&HWIcons.url({id:"../escape",icon:"123456789abc"},"skill")===null'));
  for(const width of [320,390,760,1440]){win.setContentSize(width,900);await wait(100);check('collection labels and icons fit '+width,await js('document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll(".hwsc-chip")].every(b=>b.scrollWidth<=b.clientWidth&&b.querySelector(".hwsc-item-name").scrollWidth<=b.querySelector(".hwsc-item-name").clientWidth)'));}
  failImages=true;await js('document.querySelector(".hwsc-tab[data-key=skills]").click();document.querySelector(".hwsc-shuffle").click();true');await wait(500);
  check('failed artwork keeps visible semantic fallback and usable tooltip',await js('(()=>{const b=document.querySelector(".hwsc-chip"),icon=b.querySelector(".hw-icon");b.focus();b.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));return !icon.classList.contains("is-ready")&&!!icon.querySelector("svg")&&document.querySelector(".hwsc-tip").textContent.includes(b.getAttribute("aria-label"))})()'));
  failImages=false;requests=[];await win.loadURL(base+'/database/?type=skill');await until('document.querySelector(".card.has-icon .hw-icon.is-ready")');await wait(250);
  check('database imagery is bounded to nearby results',requests.filter(p=>p.includes('/art/icons/')&&p.endsWith('.webp')).length<80);
  check('nested database paths resolve to the site asset root',await js('[...document.querySelectorAll(".card img[src]")].every(img=>new URL(img.src).pathname.startsWith("/assets/art/icons/skill/"))'));
  await win.loadURL(base+'/database/?type=skill&id=shield_up');await until('document.querySelector("#drawer .hw-icon.is-ready")');
  check('deep-linked skill detail shows its selected icon and canonical description',await js('document.querySelector("#drawer-title").textContent==="Shield Up"&&document.querySelector("#drawer img").src.includes("/skill/shield_up.")&&document.querySelector("#drawer .desc").textContent.length>20'));
  await win.loadURL(base+'/database/?type=unique&id=emberbrand');await until('document.querySelector("#drawer .hw-icon.is-ready")');
  check('unique database detail retains its ring base, modifiers and distinct image',await js('document.querySelector("#drawer img").src.includes("/unique/emberbrand.")&&document.querySelector("#drawer").textContent.includes("Ruby Ring")&&document.querySelectorAll(".db-unique-mods li").length>0'));
  await js('document.querySelector("#drawer .close").click();true');await wait(300);
  const uniques=JSON.parse(fs.readFileSync(path.join(root,'data/uniques.json')));
  check('unique tab covers the current exported roster',await js('document.querySelectorAll(".card[data-type=unique]").length')===uniques.length);
  await js('document.querySelector("#q").value="Ruby Ring";document.querySelector("#q").dispatchEvent(new Event("input",{bubbles:true}));true');await wait(220);
  check('unique search finds its canonical item base',await js('document.querySelectorAll(".card").length>0&&document.querySelectorAll(".card").length<'+uniques.length));
  for(const width of [320,390,760,1440]){win.setContentSize(width,900);await wait(100);check('database cards fit '+width,await js('document.documentElement.scrollWidth<=innerWidth'));}
  check('no page downloads the provenance manifest',!requests.some(p=>p.endsWith('/icons/manifest.json')));
  console.log('ICONS '+checks.filter(Boolean).length+'/'+checks.length);if(checks.some(ok=>!ok))process.exitCode=1;
 }catch(error){console.error(error);process.exitCode=1;}
 finally{clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
