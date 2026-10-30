// Real browser-engine interactions, with disposable saves and native pointer events.
// Build first: npx electron balance/codex-scroll-ui.cjs
const {app,BrowserWindow}=require('electron');
const {startGameServer}=require('../launcher/server.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-codex-scroll-'));
const out=path.join(__dirname,'reports','codex-scroll');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(temp,'profile'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(temp,'saves')});
 const win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const js=s=>win.webContents.executeJavaScript(s),errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 const wait=async(s,limit=15000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await js(`!!(${s})`))return;await sleep(80);}throw Error('Timed out: '+s);};
 const shot=async(name)=>{await sleep(350);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const click=async(sel)=>{await js(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'nearest',inline:'nearest'});void 0`);await sleep(160);const p=await js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}),r=e.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})()`);assert(p.hit,'Control is reachable: '+sel);win.webContents.sendInputEvent({type:'mouseMove',x:p.x,y:p.y});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:p.x,y:p.y});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:p.x,y:p.y});await sleep(100);};
 const key=async keyCode=>{win.webContents.sendInputEvent({type:'keyDown',keyCode});win.webContents.sendInputEvent({type:'keyUp',keyCode});await sleep(100);};
 const search=value=>js(`(()=>{const e=document.querySelector('[data-cx-search]');e.focus();e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const select=async name=>{await search(name);await click('.cx-card');await js("document.querySelector('.cx-stage')?.scrollIntoView({block:'nearest'});void 0");};
 const ready="document.querySelector('.cx-stage')?.dataset.cxPreviewState==='ready'";
 const sample="(()=>{const c=document.querySelector('.cx-stage canvas');if(!c)return null;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0,lit=0;for(let i=0;i<d.length;i+=16){const v=d[i]+d[i+1]+d[i+2];sum+=v;if(v>90)lit++;}return {sum,lit};})()";
 let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name);};
 const timer=setTimeout(()=>{console.error('CODEX SCROLL timed out');app.exit(1);},210000);
 try{
  await win.loadURL(server.url);await js("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});");await wait('window.__game');await js('__game.hydrated()');await click('#sm-codex');await sleep(400);
  check('continuous list has no numbered paging controls',await js("!document.querySelector('.cx-pager,[data-cx-next],[data-cx-prev]') && Number(document.querySelector('.cx-grid').dataset.total)>500"));
  check('only a bounded nearby window is mounted',await js("document.querySelectorAll('.cx-card').length>0 && document.querySelectorAll('.cx-card').length<80"));
  for(const name of ['Cleave','Firebolt','Frost Nova']){
   await select(name);await wait(ready,25000);await sleep(1000);const a=await js(sample);await sleep(500);const b=await js(sample);
   check(name+' autoplays real moving frames without Play',a?.lit>20 && a.sum!==b?.sum);
   check(name+' executes the real skill on the baseline stage',await js("document.querySelector('iframe[data-skill-showcase-engine]').contentWindow.__hwShowcase.report().casts>0"));
  }
  check('all selections share a single isolated engine',await js("document.querySelectorAll('iframe[data-skill-showcase-engine]').length===1 && __skillShowcases.stats().mounts===1"));await shot('01-autoplay');
  await click('.cx-stage');await wait('!__skillShowcases.stats().running');
  check('clicking the playing preview stops it',await js("document.querySelector('.cx-stage').dataset.cxPreviewState==='idle'"));
  await click('.cx-stage');await wait(ready);check('clicking the idle preview plays it again',await js("__skillShowcases.stats().running"));
  await js("document.querySelector('.cx-stage').focus();void 0");await key('Space');await wait('!__skillShowcases.stats().running');
  check('Space stops the stage without losing keyboard focus',await js("document.activeElement.matches('.cx-stage') && document.querySelector('.cx-stage').dataset.cxPreviewState==='idle'"));
  await key('Enter');await wait(ready);check('Enter restarts the focused stage',await js("__skillShowcases.stats().running"));
  await click('[data-cx-autoplay]');await select('Firebolt');await sleep(500);
  check('autoplay preference survives selecting another skill',await js("!document.querySelector('[data-cx-autoplay]').checked && document.querySelector('.cx-stage').dataset.cxPreviewState==='idle' && !document.querySelector('.cx-stage canvas')"));
  await click('[data-cx-autoplay]');await wait(ready);
  check('enabling autoplay starts the current selection',await js("__skillShowcases.stats().playing.startsWith('firebolt|1|')"));
  await click('[data-cx-replay]');await wait(ready);check('Restart retains native keyboard focus',await js("document.activeElement.matches('[data-cx-replay]')"));
  await search('');await wait(ready);await js("window.previewNode=document.querySelector('.skill-showcase');window.shellNode=document.querySelector('.side-screen');window.firstCardNode=document.querySelector('.cx-card');document.querySelector('.cx-grid').scrollTop=80;void 0");await sleep(100);
  check('small scrolls reuse overlapping icon nodes',await js("firstCardNode.isConnected && firstCardNode===document.querySelector('.cx-card')"));
  const wheel=await js("(()=>{const r=document.querySelector('.cx-grid').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),top:document.querySelector('.cx-grid').scrollTop};})()");
  win.webContents.sendInputEvent({type:'mouseMove',x:wheel.x,y:wheel.y});win.webContents.sendInputEvent({type:'mouseWheel',x:wheel.x,y:wheel.y,deltaY:-500,deltaX:0,canScroll:true});await sleep(250);
  check('native wheel scroll advances through the collection',await js(`document.querySelector('.cx-grid').scrollTop>${wheel.top}`));
  await js("window.previewNode=document.querySelector('.skill-showcase');document.querySelector('.cx-grid').scrollTop=10000;void 0");await sleep(200);
  check('large scrolls replace the window without growing the DOM',await js("Number(document.querySelector('.cx-grid').dataset.windowStart)>100 && document.querySelectorAll('.cx-card').length<80 && !firstCardNode.isConnected"));
  check('scrolling results does not restart the selected demonstration',await js("!!previewNode && previewNode===document.querySelector('.skill-showcase')"));
  await js("document.querySelector('.cx-grid').scrollTop=1e7;void 0");await sleep(150);
  check('scrolling reaches the real end without loading every card',await js("(()=>{const g=document.querySelector('.cx-grid');return g.dataset.windowEnd===g.dataset.total && document.querySelectorAll('.cx-card').length<80;})()"));
  await js("document.querySelector('.cx-card:last-child').focus();void 0");await key('Home');
  check('Home reaches the first entry across the entire collection',await js("document.activeElement.parentElement.getAttribute('aria-posinset')==='1' && document.querySelector('.cx-grid').scrollTop===0"));
  await key('End');check('End reaches the last entry without mounting the middle',await js("document.activeElement.parentElement.getAttribute('aria-posinset')===document.querySelector('.cx-grid').dataset.total && document.querySelectorAll('.cx-card').length<80"));
  await key('Home');await key('PageDown');const down=await js("Number(document.activeElement.parentElement.getAttribute('aria-posinset'))");
  check('PageDown moves by the visible window and retains focus',down>1&&down<30);await key('PageUp');check('PageUp returns to the first row',await js("document.activeElement.parentElement.getAttribute('aria-posinset')==='1'"));
  await js("document.querySelector('[data-cx-search]').focus();document.querySelector('.cx-grid').scrollTop=7000;void 0");await sleep(120);
  await js("window.scrollBefore=document.querySelector('.cx-grid').scrollTop;void 0");await click('[data-cx-section="classes"]');await click('[data-cx-section="abilities"]');
  check('tabs restore the continuous scroll position and retain the shell',await js("Math.abs(document.querySelector('.cx-grid').scrollTop-scrollBefore)<2 && shellNode===document.querySelector('.side-screen')"));
  await search('Cleave');await wait(ready);await js("window.previewNode=document.querySelector('.skill-showcase');__game.account().features.add('unlock_all_gems');void 0");await wait("document.querySelector('.cx-detail').textContent.includes('Awakened')");
  check('live entry refresh preserves the running player',await js("!!previewNode && previewNode===document.querySelector('.skill-showcase')"));
  await search('');await js("document.querySelector('.cx-grid').scrollTop=12000;void 0");await sleep(150);
  check('the fully discovered catalog still keeps a bounded DOM',await js("Number(document.querySelector('.cx-grid').dataset.total)>500 && document.querySelectorAll('.cx-card').length<80 && !document.querySelector('.cx-locked')"));await shot('02-continuous-catalog');
  const browsing=await js("(async()=>{const g=document.querySelector('.cx-grid'),times=[];let maxCards=0;for(let i=0;i<24;i++){const t=performance.now();g.scrollTop=(g.scrollHeight-g.clientHeight)*((i*7)%24)/23;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));times.push(performance.now()-t);maxCards=Math.max(maxCards,g.querySelectorAll('.cx-card').length);}return{maxCards,framesMs:times};})()");
  fs.writeFileSync(path.join(out,'browsing.json'),JSON.stringify(browsing,null,2));check('repeated long-distance scrolling never accumulates cards',browsing.maxCards<80);
  await js("window.resizeTop=document.querySelector('.cx-grid').scrollTop;void 0");
  // Reflow between desktop columns and compact results, then back, keeping the same anchor.
  const anchorKey=await js("(()=>{const g=document.querySelector('.cx-grid'),r=g.getBoundingClientRect();return [...g.querySelectorAll('.cx-card')].find(c=>{const b=c.getBoundingClientRect();return b.top<=r.top+1&&b.bottom>r.top;})?.dataset.cxEntry;})()");
  assert(anchorKey,'A visible top entry is available before reflow');
  const anchorVisible=`(()=>{const c=document.querySelector('[data-cx-entry="${anchorKey}"]'),g=document.querySelector('.cx-grid');if(!c)return false;const a=c.getBoundingClientRect(),b=g.getBoundingClientRect();return a.top<=b.top+1&&a.bottom>b.top;})()`;
  // Native resize delivery and ResizeObserver are asynchronous. Await the real
  // renderer geometry rather than treating a fixed sleep as readiness.
  for(let turn=0;turn<4;turn++){
   win.setContentSize(700,1000);await wait("innerWidth===700 && getComputedStyle(document.querySelector('.cx-body')).display==='block' && "+anchorVisible);
   win.setContentSize(1600,1000);await wait("innerWidth===1600 && getComputedStyle(document.querySelector('.cx-body')).display==='grid' && Math.abs(document.querySelector('.cx-grid').scrollTop-resizeTop)<2 && "+anchorVisible);
  }
  const reflow=await js(`(()=>{const c=document.querySelector('[data-cx-entry="${anchorKey}"]'),g=document.querySelector('.cx-grid'),a=c?.getBoundingClientRect(),b=g.getBoundingClientRect();return{key:${JSON.stringify(anchorKey??null)},before:resizeTop,after:g.scrollTop,cardTop:a?.top,cardBottom:a?.bottom,gridTop:b.top};})()`);
  check('column reflow preserves the top entry and scroll anchor: '+JSON.stringify(reflow),!!anchorKey && reflow.cardTop<=reflow.gridTop+1 && reflow.cardBottom>reflow.gridTop && Math.abs(reflow.before-reflow.after)<2);
  await js("__game.account().features.delete('unlock_all_gems');void 0");await sleep(1100);await search('Infernal Ray');
  check('empty searches remove stale cards and protected identities',await js("document.querySelectorAll('.cx-card').length===0 && !!document.querySelector('[data-cx-reset]') && !document.querySelector('.codex [data-skill-showcase]')"));
  await click('[data-cx-reset]');
  for(const [w,h,scale] of [[800,600,1.5],[390,844,1],[390,844,2],[320,568,2]]){
   win.setContentSize(w,h);await js(`document.documentElement.style.setProperty('--ui-scale','${scale}');void 0`);await sleep(160);
   await js("document.querySelector('.cx-grid').scrollTop=3500;void 0");await sleep(100);
   await js("(()=>{const g=document.querySelector('.cx-grid'),r=g.getBoundingClientRect(),c=[...g.querySelectorAll('.cx-card')].find(c=>{const t=c.getBoundingClientRect();return t.top>=r.top&&t.top<r.bottom;})||g.querySelector('.cx-card:last-child');window.readerScroll=g.scrollTop;window.readerKey=c.dataset.cxEntry;c.click();})()");
   check(`compact reading is reachable at ${w}/${scale}`,await js("getComputedStyle(document.querySelector('.cx-detail')).display==='block' && document.querySelector('.codex').scrollWidth<=document.querySelector('.codex').clientWidth+1"));
   await key('Escape');check(`compact return restores the selected entry at ${w}/${scale}`,await js("document.activeElement.dataset.cxEntry===readerKey && document.querySelectorAll('.cx-card').length<80 && getComputedStyle(document.querySelector('.cx-list')).display!=='none'"));
  }
  win.setContentSize(390,844);await js("document.documentElement.style.setProperty('--ui-scale','1');void 0");await sleep(100);await select('Cleave');await wait(ready);await shot('03-compact-autoplay');
  await click('[data-cx-results-footer]');await wait('!__skillShowcases.stats().running');
  check('hidden compact previews stop consuming frames',await js("!__skillShowcases.stats().running"));
  await click('[data-cx-back]');await sleep(1100);
  check('closing cleans up media and rendering callbacks',await js("!document.querySelector('.codex') && __skillShowcases.stats().mounts===0 && !__game.crash().fatal")&&errors.length===0);
  console.log(`CODEX SCROLL OK: ${checks} checks; ${out}`);
 }catch(e){console.error(e.stack||e);console.error('RENDERER ERRORS',errors);await shot('failure');process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.server.close();app.exit(process.exitCode||0);}
});
