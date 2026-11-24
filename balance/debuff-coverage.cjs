// node balance/debuff-coverage.cjs — build in memory, then sample the live renderer.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports');

async function serveGame() {
  const { build } = await import('vite');
  const result = await build({ logLevel:'error', build:{write:false,emptyOutDir:false},
    plugins:[{name:'debuff-inspection',transform(source,id) {
      if (!id.replaceAll('\\','/').endsWith('/src/main.ts')) return;
      return source + "\nimport {STATUS_DEFS as qaDefs} from './engine/status';" +
        "\nimport {statusIcons as qaIcons,drawStatusIcons as qaDraw} from './render/vis/statusIcons';" +
        "\nwindow.debuffInspection = {defs:qaDefs,icons:qaIcons,draw:qaDraw};";
    }}] });
  const files = new Map([result].flat().flatMap(r => r.output).map(f => ['/'+f.fileName, f]));
  const mime = {'.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
  const server = require('node:http').createServer((req,res) => {
    const key = new URL(req.url,'http://localhost').pathname;
    if (key.startsWith('/__save/')) { res.end('{}'); return; }
    const file = files.get(key === '/' ? '/index.html' : key);
    if (!file) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type',mime[path.extname(file.fileName)] ?? 'application/octet-stream');
    res.end(file.type === 'chunk' ? file.code : file.source);
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  return server;
}

async function launch() {
  const server = await serveGame();
  try {
    fs.mkdirSync(reports,{recursive:true});
    const profile = fs.mkdtempSync(path.join(reports,'debuff-inspection-'));
    try {
      const child = require('node:child_process').spawn(require('electron'),[__filename],{
        windowsHide:true,stdio:'inherit',env:{...process.env,DEBUFF_INSPECTION_PROFILE:profile,
          DEBUFF_INSPECTION_URL:'http://127.0.0.1:'+server.address().port}});
      const code = await new Promise((resolve,reject) => {child.once('error',reject); child.once('exit',resolve);});
      assert.equal(code,0,'game inspection failed');
    } finally {
      assert.equal(path.dirname(profile),reports);
      assert.ok(path.basename(profile).startsWith('debuff-inspection-'));
      fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
    }
  } finally {server.close();}
}

// Runs inside the actual game. Only the camera crop and gallery labels belong to this harness.
function inspectActors() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('guardian'); __game.ui.hideAll(); __game.step(240);
  Object.defineProperty(performance,'now',{value:()=>4200,configurable:true});
  const w = __game.world(), r = __game.renderer, qa = window.debuffInspection;
  const zombie = w.createMonster('zombie',5,'enemy'), hero = w.player;
  zombie.pos = {...hero.pos}; zombie.facing = zombie.facingPrev = .6; zombie.spawnedAt = -50;
  zombie.skills = []; w.actors.push(zombie);
  const tile = document.createElement('canvas'); tile.width = 152; tile.height = 104;
  const c = tile.getContext('2d',{willReadFrequently:true});
  const ids = Object.keys(qa.defs).filter(id => !qa.defs[id].beneficial).sort((a,b) => qa.defs[a].label.localeCompare(qa.defs[b].label) || a.localeCompare(b));
  function draw(a, ids, stacks=1) {
    for (const id of new Set(a.statuses.map(s => s.id))) a.endStatus(id);
    for (const id of ids) a.applyStatus(id,0,1,'Specimen');
    for (const s of a.statuses) {
      s.stacks = stacks; s.remaining *= .56;
      if (qa.defs[s.id]?.bank) s.bankFrac = .55;
    }
    c.resetTransform(); c.fillStyle = '#2b3035'; c.fillRect(0,0,tile.width,tile.height);
    c.save(); c.translate(76,51); c.scale(2,2); c.translate(-a.pos.x,-a.pos.y);
    r.drawActor(a,w); c.restore();
  }
  function sheet(columns,rows) {
    const canvas = document.createElement('canvas'); canvas.width=columns*152; canvas.height=rows*128;
    const g = canvas.getContext('2d'); g.fillStyle='#171d22'; g.fillRect(0,0,canvas.width,canvas.height);
    return {canvas,g,columns};
  }
  function stamp(sheet,index,a,label) {
    const x=index%sheet.columns*152, y=Math.floor(index/sheet.columns)*128;
    sheet.g.drawImage(tile,x,y);
    // The swatches use the same icon painter, durations and stack labels as the Life HUD.
    const icons=qa.icons(a.statuses,{});
    qa.draw(sheet.g,icons.map((icon,i)=>({icon,x:x+5+i*20,y:y+78,w:19,h:21})));
    sheet.g.fillStyle='#e9dfc8'; sheet.g.font='13px Verdana'; sheet.g.textAlign='center';
    sheet.g.fillText(label,x+76,y+120,145);
  }
  const hud=document.createElement('canvas'); hud.width=hud.height=24;
  const h=hud.getContext('2d',{willReadFrequently:true});
  function hasVisibleGlyph(a) {
    const [icon]=qa.icons(a.statuses,{});
    if (!icon) return false;
    h.clearRect(0,0,24,24); qa.draw(h,[{icon,x:0,y:0,w:24,h:24}]);
    // Sample inside the frame, away from stacks and the duration track.
    const data=h.getImageData(4,5,15,13).data;
    let lit=0;
    for(let i=0;i<data.length;i+=4) if(Math.max(data[i],data[i+1],data[i+2])>100 && data[i+3]>180) lit++;
    return lit>=3;
  }
  const atlas=sheet(8,Math.ceil(ids.length/8)), samples=sheet(4,4), failures=[];
  const original=r.ctx;
  try {
    r.ctx=c;
    // The crop ends above the colored status pips. A pip alone cannot pass.
    const rows=Math.min(104,Math.floor(51+2*(zombie.radius+3)));
    const pixels=()=>c.getImageData(0,0,152,rows).data;
    draw(zombie,[]); const reference=pixels();
    for (const [i,id] of ids.entries()) {
      draw(zombie,[id]);
      const actual=pixels();
      let changed=0;
      for (let j=0;j<actual.length;j+=4) {
        if(Math.abs(actual[j]-reference[j])+Math.abs(actual[j+1]-reference[j+1])+Math.abs(actual[j+2]-reference[j+2])>12) changed++;
      }
      if(changed<5 || !hasVisibleGlyph(zombie)) failures.push(id);
      stamp(atlas,i,zombie,qa.defs[id].label);
      draw(zombie,[]);
      if (!pixels().every((v,j)=>v===reference[j])) failures.push(id+' after cleanse');
    }
    for (const group of [
      ['silence','doom','jinxed'], ['frozen','impaled','shock'],
      ['infected_miasma','scalded','infected_adrenal'], ['living_bomb','doombrand','powder_charge'],
    ]) {
      draw(zombie,group); const combined=pixels();
      draw(zombie,[...group].reverse());
      if (!pixels().every((v,j)=>v===combined[j])) failures.push(group.join('+')+' reordered');
      for (const id of group) {
        draw(zombie,group.filter(other=>other!==id));
        if (pixels().every((v,j)=>v===combined[j])) failures.push(id+' hidden in '+group.join('+'));
      }
    }
    const examples=[
      ['Healthy',[]],['Ignited',['burn']],['Chilled',['chill']],['Frozen',['frozen']],
      ['Silenced',['silence']],['Disarmed',['disarm']],['Rooted',['rooted']],['Stunned',['stun']],
      ['Petrifying ×3',['petrifying'],3],['Petrified',['petrified']],['Bogged',['bogged']],['Horrified',['horrified']],
      ['Powder Charge',['powder_charge']],['Doombrand',['doombrand']],['Silence + Jinx',['silence','jinxed']],['Impale + Shock',['impaled','shock']],
    ];
    for (const [i,[label,effects,n]] of examples.entries()) {
      const actor=i>=12 ? hero : zombie;
      draw(actor,effects,n); stamp(samples,i,actor,label);
    }
    return {count:ids.length,failures,atlas:atlas.canvas.toDataURL(),samples:samples.canvas.toDataURL(),fatal:__game.crash().fatal};
  } finally { r.ctx=original; }
}

async function inspect() {
  const {app,BrowserWindow} = require('electron');
  app.setPath('userData',process.env.DEBUFF_INSPECTION_PROFILE); app.disableHardwareAcceleration();
  await app.whenReady();
  const win = new BrowserWindow({show:false,width:1200,height:900,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const timeout=setTimeout(()=>app.exit(1),120000);
  try {
    await win.loadURL(process.env.DEBUFF_INSPECTION_URL);
    const result = await win.webContents.executeJavaScript('(()=>{try{return ('+inspectActors+')()}catch(e){return {error:e.stack}}})()');
    if (result.error) throw new Error(result.error);
    assert.equal(result.fatal,null);
    for(const [name,image] of [['debuff-coverage',result.samples],['debuff-atlas',result.atlas]]) {
      fs.writeFileSync(path.join(reports,name+'.png'),Buffer.from(image.split(',')[1],'base64'));
    }
    assert.deepEqual(result.failures,[],'statuses with no visible body change or HUD icon');
    console.log(result.count+' debuffs painted in the game, with player and mixed-status samples.');
  } finally {clearTimeout(timeout);win.destroy();}
}

if(process.versions.electron) {
  inspect().then(()=>require('electron').app.exit(0),error=>{console.error(error);require('electron').app.exit(1);});
} else {
  launch().catch(error=>{console.error(error);process.exitCode=1;});
}
