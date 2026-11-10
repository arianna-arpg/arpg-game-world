// npx electron scripts/check-site-memory.cjs
// Measures real shader output, including pixels outside the source-image box.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { makeTempDir } = require('./temp-dir.cjs');
app.setPath('userData', makeTempDir('hollow-memory-profile-'));
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
const root = path.resolve(__dirname, '../site');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.json':'application/json' };
const server = http.createServer((req,res) => {
  let name = new URL(req.url,'http://localhost').pathname;
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root,'.'+name);
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404);res.end();return; }
  res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
const results = [];
function check(name,pass) { results.push(Boolean(pass)); console.log((pass?'PASS ':'FAIL ')+name); }
app.whenReady().then(async()=>{
  let win;
  const timeout = setTimeout(()=>{console.error('Memory art checks timed out');app.exit(1);},45000);
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    win = new BrowserWindow({show:true,x:-4200,y:40,width:1440,height:1000,useContentSize:true,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});
    win.webContents.setAudioMuted(true);
    win.webContents.debugger.attach('1.3');
    await win.loadURL('about:blank');
    await win.webContents.debugger.sendCommand('Page.enable');
    await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`
      const original=WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays=function(...args){
        const result=original.apply(this,args),c=this.canvas;
        if(!c.classList.contains('memory-canvas'))return result;
        c.qaDraws=(c.qaDraws||0)+1;
        if(c.dataset.scan!=='1')return result;
        c.dataset.scan='0';
        const w=c.width,h=c.height,pixels=new Uint8Array(w*h*4);
        this.readPixels(0,0,w,h,this.RGBA,this.UNSIGNED_BYTE,pixels);
        const b=c.getBoundingClientRect(),host=c.parentElement.getBoundingClientRect();
        const padX=(host.left-b.left)/b.width*w,padY=(host.top-b.top)/b.height*h;
        let edgeMax=0,outer=0,centerMax=0,hash=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          const a=pixels[(y*w+x)*4+3];
          if(x===0||y===0||x===w-1||y===h-1)edgeMax=Math.max(edgeMax,a);
          if(x<padX||x>=w-padX||y<padY||y>=h-padY){if(a>1)outer++;hash=(Math.imul(hash,31)+a)>>>0;}
          else centerMax=Math.max(centerMax,a);
        }
        c.qaPixels={w,h,edgeMax,outer,centerMax,hash,padX,padY};return result;
      };`});
    await win.loadURL('http://127.0.0.1:'+server.address().port+'/observer-study.html');
    const js = code=>win.webContents.executeJavaScript(code);
    const until = async code=>{for(let i=0;i<80;i++){if(await js('!!('+code+')'))return true;await wait(60);}return false;};
    const canvas='document.querySelector(".memory-canvas")';
    await until('document.querySelector(".memory-ready")');
    await js('document.querySelector(".study-painting").scrollIntoView({block:"center",behavior:"instant"});true');
    const scan = async()=>{await js(canvas+'.qaPixels=null;'+canvas+'.dataset.scan="1";true');await until(canvas+'.qaPixels');return js(canvas+'.qaPixels');};
    let pixels = await scan();
    console.log('Desktop pixels',JSON.stringify(pixels));
    if(!pixels)throw new Error(await js('JSON.stringify({draws:'+canvas+'.qaDraws,scan:'+canvas+'.dataset.scan,hidden:document.hidden,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,rect:'+canvas+'.getBoundingClientRect().toJSON()})'));
    check('canvas extends beyond all four image edges',pixels.padX>20&&pixels.padY>20);
    check('expanded shader stays within one million pixels',pixels.w*pixels.h<=1000000);
    check('outer swirl contains visible pixels outside the image box',pixels.outer>300);
    check('all four outermost canvas edges are fully transparent',pixels.edgeMax===0);
    check('painting center remains opaque',pixels.centerMax>250);
    check('readability overlay cannot paint an independent rectangle',await js('getComputedStyle(document.querySelector(".class-art"),"::after").display==="none"'));
    check('desktop has no horizontal page overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
    await wait(200);const next=await scan();
    check('outer swirl moves over time',pixels.hash!==next.hash);
    await js('document.querySelector("[data-scene=refuge]").click();true');
    await until('document.querySelector(".memory-ready img")?.src.includes("refuge.webp")');
    check('swapping paintings reuses the same canvas',await js('document.querySelectorAll(".memory-canvas").length===1'));
    win.setContentSize(390,844);await wait(250);
    await js('document.querySelector(".study-painting").scrollIntoView({block:"center",behavior:"instant"});true');
    pixels=await scan();
    check('mobile outer edges remain fully transparent',pixels.edgeMax===0&&pixels.outer>300);
    check('mobile has no horizontal page overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await wait(150);const before=await js(canvas+'.qaDraws');await wait(250);
    check('reduced motion stops repeated shader draws',await js(canvas+'.qaDraws')===before);
    await js('window.qaLoss='+canvas+'.getContext("webgl").getExtension("WEBGL_lose_context");qaLoss.loseContext();true');
    await wait(100);
    check('context loss restores the static painting',await js('!document.querySelector(".class-art").classList.contains("memory-ready") && getComputedStyle(document.querySelector(".class-art img")).opacity!=="0"'));
    await js('qaLoss.restoreContext();true');
    check('restored graphics rebuilds the painting',await until('document.querySelector(".class-art.memory-ready")'));
    await js('document.querySelector("#replay-all").click();true');
    check('Observer preview respects reduced motion',await js('document.querySelector("#hold-open").checked && [...document.querySelectorAll(".hw-eyeg")].every(e=>e.getAttribute("opacity")==="1")'));
    console.log('MEMORY / OBSERVER '+results.filter(Boolean).length+'/'+results.length);
    if(results.some(ok=>!ok))process.exitCode=1;
  } catch(error) {console.error(error);process.exitCode=1;}
  finally {clearTimeout(timeout);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0);}
});
