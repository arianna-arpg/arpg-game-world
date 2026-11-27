// Review artifact from real client screenshots; no game files or saves change.
// npx electron balance/reliquary-comparison.cjs
const {app,BrowserWindow,nativeImage}=require('electron');
const {makeTempDir}=require('../scripts/temp-dir.cjs');
const fs=require('node:fs'),path=require('node:path');
const {build}=require('esbuild');
const scratch=makeTempDir('hollow-relic-comparison-');
app.setPath('userData',path.join(scratch,'profile'));app.disableHardwareAcceleration();
const root=path.join(__dirname,'reports','reliquary-comparison');
const current=path.join(__dirname,'reports','reliquary-presentation');
// Prefer the preceding art pass; retain the original approved baseline too.
const baseline=['living-seal','wardrobe','ancient','before'].find(name=>fs.existsSync(path.join(root,name,'report.json')))||'before';
function crop(file,rect){
  const img=nativeImage.createFromPath(file),size=img.getSize();
  if(img.isEmpty())throw Error('Missing comparison source: '+file);
  const x=Math.max(0,rect.x-8),y=Math.max(0,rect.y-8);
  return img.crop({x,y,width:Math.min(size.width-x,rect.width+16),height:Math.min(size.height-y,rect.height+16)}).toDataURL();
}
app.whenReady().then(async()=>{
  let win;
  const timer=setTimeout(()=>app.exit(1),30000);
  try{
    const report=JSON.parse(fs.readFileSync(path.join(current,'report.json'),'utf8'));
    if(report.errors.length)throw Error('Compare only a passing UI run.');
    const previous=baseline!=='before'?JSON.parse(fs.readFileSync(path.join(root,baseline,'report.json'),'utf8')).shots:null;
    const cases=['equipped','first-cell'].map(name=>({
      before:crop(path.join(root,baseline,name+'.png'),previous?.[name]??{x:422,y:56,width:300,height:616}),
      after:crop(path.join(current,name+'.png'),report.shots[name]),
    }));
    // Captured markup + the production stylesheet: no parallel art renderer.
    const scene=JSON.parse(fs.readFileSync(path.join(current,'equipped-case.json'),'utf8'));
    const tokens=scene.tokens.split(';').filter(s=>/^\s*--(?:inv|relic)-/.test(s)).join(';');
    // The preview bundles the same small field controller used in the game.
    // Captured sheets supply the rest of the pane; authored art rules avoid
    // CSSOM's lossy serialization of var()-based animation shorthands.
    const artCss=['runeField.css','reliquary.css'].map(file=>fs.readFileSync(path.join(__dirname,'..','src','ui',file),'utf8').replace(/^@import[^;]+;\s*/gm,'')).join('\n');
    const runtime=(await build({entryPoints:[path.join(__dirname,'..','src','ui','runeField.ts')],bundle:true,write:false,format:'iife',globalName:'HollowRuneField',minify:true})).outputFiles[0].text;
    fs.writeFileSync(path.join(root,'motion-preview.html'),`<!doctype html><html lang="en" data-interface-theme="true"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reliquary motion study</title>
      <style>${scene.css}\n${artCss}
      *{box-sizing:border-box}html,body{height:auto;overflow:auto}body{${tokens};margin:0;padding:28px 20px;background:#101719;color:var(--inv-text)}
      main{display:grid;grid-template-columns:300px minmax(0,280px);grid-template-areas:'pane tuning';gap:28px;max-width:608px;margin:auto;align-items:start}
      .preview-pane{grid-area:pane;min-width:0}.rune-tuning{grid-area:tuning;position:sticky;top:28px;padding:22px;border:1px solid var(--inv-edge);background:radial-gradient(ellipse at top,var(--inv-bloom),transparent 75%),var(--inv-surface);box-shadow:inset 0 0 0 3px var(--inv-surface),inset 0 0 0 4px var(--inv-line);font:12px/1.6 'Segoe UI',sans-serif}
      .rune-tuning h1{font:22px/1.2 Georgia,serif;color:var(--inv-title);margin:0 0 12px}.rune-tuning p{font:12px/1.6 'Segoe UI',sans-serif;color:var(--inv-muted);margin:0 0 18px}
      .intensity-label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;color:var(--inv-text)}
      #rune-intensity-value{font:26px/1 Georgia,serif;font-variant-numeric:tabular-nums;color:var(--inv-light)}
      #rune-intensity{display:block;width:100%;height:28px;margin:0;accent-color:var(--inv-light);cursor:pointer}
      .intensity-scale{display:flex;justify-content:space-between;color:var(--inv-muted);font-size:10px;margin:3px 0 18px}
      .intensity-presets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}.rune-tuning button{margin:0;border:1px solid var(--inv-edge);background:var(--inv-surface);color:var(--inv-text);padding:7px 10px;font:12px/1.4 'Segoe UI',sans-serif;cursor:pointer}
      .rune-tuning button:hover{background:var(--inv-raised)}.rune-tuning button[aria-pressed=true]{border-color:var(--inv-light);background:var(--inv-bloom);color:var(--inv-light)}
      .rune-tuning :is(button,input):focus-visible{outline:2px solid var(--inv-light);outline-offset:3px}.rune-tuning button:disabled{opacity:.6;cursor:default}
      .rune-tuning .preview-note{padding-top:16px;margin:18px 0 0;border-top:1px solid var(--inv-line);font-size:11px}
      .activity-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 18px;padding-block:14px;border-block:1px solid var(--inv-line)}.activity-stats dt{font-size:10px;color:var(--inv-muted)}.activity-stats dd{margin:4px 0 0;color:var(--inv-light);font:23px/1.2 Georgia,serif}
      #container-panel-reliquary{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:100%!important;height:auto!important;max-height:none!important;transform:none!important;pointer-events:none}
      #preview-motion{display:block;width:100%}
      @media(max-width:650px){body{padding:20px 16px}main{max-width:340px;grid-template-columns:minmax(0,1fr);grid-template-areas:'tuning' 'pane';gap:20px}.rune-tuning{position:static;padding:20px}.preview-pane{width:300px;max-width:100%;justify-self:center}}
      </style><main><aside class="rune-tuning" aria-labelledby="tuning-title"><h1 id="tuning-title">Rune atmosphere</h1>
      <p id="intensity-help">Raise the number of runes and how often fresh ones appear. Each birth finds a new glyph and position.</p>
      <div class="intensity-label"><label for="rune-intensity">Rune activity</label><output id="rune-intensity-value" for="rune-intensity" aria-live="off">50</output></div>
      <input id="rune-intensity" type="range" min="0" max="100" step="1" value="50" aria-describedby="intensity-help">
      <div class="intensity-scale" aria-hidden="true"><span>Off</span><span>Torrent</span></div>
      <div class="intensity-presets" role="group" aria-label="Activity presets"><button type="button" data-activity="quiet" aria-pressed="false">Quiet</button><button type="button" data-activity="lively" aria-pressed="true">Lively</button><button type="button" data-activity="torrent" aria-pressed="false">Matrix</button></div>
      <dl class="activity-stats"><div><dt>Up to this many runes</dt><dd id="rune-population">—</dd></div><div><dt>New runes / second ≈</dt><dd id="rune-rate">—</dd></div></dl>
      <button id="preview-motion" type="button" aria-pressed="false">Pause motion</button>
      <p class="preview-note">Lively is the game default. Adjust rune activity in Wardrobe → Interface. The case keeps its own motion.</p></aside><div class="preview-pane">${scene.pane}</div></main>
      <script>${runtime}</script>
      <script>let paused=false;const button=document.getElementById('preview-motion'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
      const pane=document.getElementById('container-panel-reliquary'),slider=document.getElementById('rune-intensity'),readout=document.getElementById('rune-intensity-value');pane.inert=true;
      const activity=HollowRuneField.RUNE_FIELD_ACTIVITY,fieldGroup=HollowRuneField.mountRuneFields(pane,[pane.querySelector('.relic-casket')]);window.runePreview=fieldGroup;
      function intensity(value){const level=Math.max(0,Math.min(activity.torrent,Number(value)||0));slider.value=String(level);readout.value=String(level);slider.setAttribute('aria-valuetext',level+' out of '+activity.torrent);fieldGroup.setActivity(level);document.querySelectorAll('[data-activity]').forEach(b=>b.setAttribute('aria-pressed',String(activity[b.dataset.activity]===level)));const stats=fieldGroup.fields.map(f=>f.status);document.getElementById('rune-population').textContent=String(stats.reduce((n,s)=>n+s.count,0));document.getElementById('rune-rate').textContent=stats.reduce((n,s)=>n+s.birthsPerSecond,0).toFixed(1)}
      slider.max=String(activity.torrent);slider.addEventListener('input',()=>intensity(slider.value));document.querySelectorAll('[data-activity]').forEach(b=>b.addEventListener('click',()=>intensity(activity[b.dataset.activity])));intensity(activity.lively);
      function sync(){document.querySelectorAll('.relic-ambient-motion').forEach(e=>e.style.animationPlayState=paused||document.hidden?'paused':'running');fieldGroup.setPaused(paused);button.disabled=reduced.matches;button.textContent=reduced.matches?'Reduced motion':paused?'Resume motion':'Pause motion';button.setAttribute('aria-pressed',String(paused||reduced.matches))}
      button.onclick=()=>{paused=!paused;sync()};document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);sync();</script></html>`);
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reliquary — before and after</title>
      <style>
      *{box-sizing:border-box}body{margin:0;background:#0c1113;color:#e7e1d3;font:14px/1.55 system-ui,sans-serif}
      main{max-width:850px;margin:auto;padding:32px 35px}header{border-bottom:1px solid #3b4746;padding-bottom:18px;margin-bottom:24px}
      .eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#b39c76}h1{font:32px/1.2 Georgia,serif;margin:9px 0}
      p{margin:8px 0;color:#a9b5b1}nav{display:flex;gap:8px;margin-top:18px}button{border:1px solid #516763;background:#182522;color:#d3d8cf;padding:7px 16px;border-radius:3px;cursor:pointer}
      button[aria-pressed=true]{border-color:#c4ac80;background:#36382a;color:#f4ead7}button:focus-visible{outline:2px solid #e4c78d;outline-offset:3px}
      .pair{display:grid;grid-template-columns:1fr 1fr;gap:32px}figure{margin:0;min-width:0}figcaption{font:19px Georgia,serif;margin:0 0 9px}figcaption small{display:block;margin-top:6px;font:11px system-ui,sans-serif;color:#a9b5b1}
      img{display:block;width:100%;max-width:316px;height:auto;margin:auto}.image{padding:15px 8px;border:1px solid #293936;background:#101719;min-height:760px}
      footer{border-top:1px solid #293936;padding-top:14px;margin-top:24px;color:#9ca9a4;font-size:11px}
      details{margin-top:24px;border:1px solid #293936;padding:14px}summary{cursor:pointer;color:#d3d8cf}iframe{display:block;width:100%;height:860px;border:0;margin-top:12px}
      @media(max-width:620px){main{padding:22px 16px}.pair{gap:12px}.image{padding:8px 0;min-height:0}figcaption{font-size:16px}}
      </style><main><header><div class="eyebrow">Hollow Wake · Reliquary</div><h1>Reliquary refinement</h1>
      <p>The approved case animation beside the new ghost inscriptions across the surrounding pane.</p>
      <nav aria-label="Comparison state"><button aria-pressed="true" data-case="0">Equipped</button><button aria-pressed="false" data-case="1">First cell</button></nav></header>
      <div class="pair"><figure><figcaption>Previous pass<small>${baseline==='living-seal'?'Animated case · quiet surrounding pane':baseline==='wardrobe'?'Runic inscription · static engraved case':baseline==='ancient'?'Bronze casing · English ornament':'Shared frame · simple grid'}</small></figcaption><div class="image"><img id="before" alt="Earlier Reliquary design"></div></figure>
      <figure><figcaption>Ghost inscriptions<small>Ephemeral runes · gentle drift · preserved case</small></figcaption><div class="image"><img id="after" alt="Reliquary pane with ephemeral runes in its backdrop"></div></figure></div>
      <details><summary>Adjust the rune activity live</summary><iframe src="motion-preview.html" title="Reliquary rune activity control" sandbox="allow-scripts"></iframe></details>
      <footer>Item footprints, rarity colors and gameplay rules are preserved. Wardrobe controls the entire case palette.</footer></main>
      <script>const states=${JSON.stringify(cases)};function show(n){document.getElementById('before').src=states[n].before;document.getElementById('after').src=states[n].after;document.querySelectorAll('button[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.case)===n)))}document.querySelectorAll('button[data-case]').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.case))));show(0);</script></html>`;
    fs.writeFileSync(path.join(root,'comparison.html'),html);
    win=new BrowserWindow({show:false,width:900,height:1200,webPreferences:{offscreen:true,backgroundThrottling:false}});
    await win.loadFile(path.join(root,'comparison.html'));
    await win.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))');
    const height=await win.webContents.executeJavaScript('document.documentElement.scrollHeight');
    win.setContentSize(900,height);await new Promise(r=>setTimeout(r,150));
    fs.writeFileSync(path.join(root,'comparison.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript('document.querySelectorAll("button[data-case]")[1].click();Promise.all([...document.images].map(i=>i.decode()))');
    const selected=await win.webContents.executeJavaScript('document.querySelectorAll("button[data-case]")[1].getAttribute("aria-pressed")');
    if(selected!=='true')throw Error('Comparison switch did not respond.');
    await win.loadFile(path.join(root,'motion-preview.html'));win.setContentSize(760,800);
    const preview=await win.webContents.executeJavaScript(`(async()=>{
      await document.fonts.ready;await new Promise(r=>setTimeout(r,150));
      const band=document.querySelector('.relic-rune-band'),before=getComputedStyle(band).transform;
      const motes=[...document.querySelectorAll('.rune-field-mote')],ghostBefore=motes.map(e=>getComputedStyle(e).transform);
      await new Promise(r=>setTimeout(r,200));
      const turning=before!==getComputedStyle(band).transform;
      const drifting=motes.some((e,i)=>ghostBefore[i]!==getComputedStyle(e).transform);
      const ghostDebug=drifting?undefined:motes.slice(0,4).map((e,i)=>{const s=getComputedStyle(e);return {before:ghostBefore[i],after:s.transform,name:s.animationName,state:s.animationPlayState,time:e.getAnimations()[0]?.currentTime,keyframes:e.getAnimations()[0]?.effect.getKeyframes()};});
      document.getElementById('preview-motion').click();
      const root=document.getElementById('container-panel-reliquary');
      const paused=[...root.querySelectorAll('.rune-field,.relic-casket')].flatMap(e=>e.getAnimations({subtree:true})).every(a=>a.playState==='paused');
      const r=root.getBoundingClientRect();
      return {turning,drifting,paused,ghostDebug,inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};
    })()`);
    if(!preview.turning||!preview.drifting||!preview.paused||!preview.inside)throw Error('Motion preview failed: '+JSON.stringify(preview));
    const tuning=await win.webContents.executeJavaScript(`(async()=>{
      const slider=document.getElementById('rune-intensity'),output=document.getElementById('rune-intensity-value');
      const sample=value=>{slider.value=String(value);slider.dispatchEvent(new Event('input',{bubbles:true}));return runePreview.fields.map(f=>f.status);};
      const caseEl=document.querySelector('.relic-arcana'),caseBefore=getComputedStyle(caseEl).opacity,quiet=sample(15);
      const first=document.querySelector('.rune-field-mote'),animation=first.getAnimations()[0];await animation.ready;
      const before={glyph:first.textContent,alpha:first.style.getPropertyValue('--rune-alpha'),duration:animation.effect.getTiming().duration,progress:animation.effect.getComputedTiming().progress};
      const dense=sample(100);await animation.ready;
      const stable=first===document.querySelector('.rune-field-mote')&&animation===first.getAnimations()[0]&&Math.abs(before.progress-animation.effect.getComputedTiming().progress)<.002;
      const brightness=first.style.getPropertyValue('--rune-alpha')===before.alpha&&first.textContent===before.glyph;
      const counts=quiet.reduce((n,s)=>n+s.count,0)===12&&dense.reduce((n,s)=>n+s.count,0)===112;
      const rate=dense.every((s,i)=>s.birthsPerSecond>quiet[i].birthsPerSecond*20)&&animation.effect.getTiming().duration<before.duration/10;
      sample(0);const off=!document.querySelector('.rune-field-mote')&&animation.playState==='idle';
      sample(73);const readout=output.value==='73'&&slider.getAttribute('aria-valuetext')==='73 out of 100';
      document.querySelector('[data-activity="quiet"]').click();
      const reset=slider.value==='15'&&document.querySelector('[data-activity="quiet"]').getAttribute('aria-pressed')==='true';
      return {checks:{counts,rate,off,stable,brightness,readout,reset,caseUnchanged:caseBefore===getComputedStyle(caseEl).opacity},quiet,dense};
    })()`);
    if(Object.values(tuning.checks).some(value=>!value))throw Error('Activity tuning failed: '+JSON.stringify(tuning));
    const renewal=await win.webContents.executeJavaScript(`(async()=>{
      document.querySelector('[data-activity="torrent"]').click();document.getElementById('preview-motion').click();
      await new Promise(r=>setTimeout(r,80));
      const before=runePreview.fields.reduce((n,f)=>n+f.status.births,0),first=document.querySelector('.rune-field-mote'),animation=first.getAnimations()[0];
      await new Promise(r=>setTimeout(r,2300));
      const after=runePreview.fields.reduce((n,f)=>n+f.status.births,0);
      const bounded=document.querySelectorAll('.rune-field-mote').length===112&&[...document.querySelectorAll('.rune-field')].flatMap(e=>e.getAnimations({subtree:true})).length<=112;
      const reused=first===document.querySelector('.rune-field-mote')&&animation===first.getAnimations()[0];
      document.getElementById('preview-motion').click();
      const stopped=runePreview.fields.reduce((n,f)=>n+f.status.births,0);await new Promise(r=>setTimeout(r,250));
      return {births:after-before,bounded,reused,paused:stopped===runePreview.fields.reduce((n,f)=>n+f.status.births,0)};
    })()`);
    if(renewal.births<112||!renewal.bounded||!renewal.reused||!renewal.paused)throw Error('Random renewal failed: '+JSON.stringify(renewal));
    await win.webContents.executeJavaScript('document.getElementById("rune-intensity").focus()');
    const keyboard=[];
    for(const keyCode of ['End','Left','Home']){
      win.webContents.sendInputEvent({type:'keyDown',keyCode});win.webContents.sendInputEvent({type:'keyUp',keyCode});
      keyboard.push(await win.webContents.executeJavaScript('document.getElementById("rune-intensity").value'));
    }
    if(keyboard.join(',')!=='100,99,0')throw Error('Range keyboard controls failed: '+keyboard);
    win.webContents.debugger.attach('1.3');
    let reduced;
    try{
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      reduced=await win.webContents.executeJavaScript(`(async()=>{
        document.querySelector('[data-activity="torrent"]').click();
        const before=runePreview.fields.reduce((n,f)=>n+f.status.births,0);await new Promise(r=>setTimeout(r,150));
        return {still:document.getElementById('container-panel-reliquary').getAnimations({subtree:true}).length===0,
          unchanged:before===runePreview.fields.reduce((n,f)=>n+f.status.births,0),visible:[...document.querySelectorAll('.rune-field-mote')].every(e=>Number(getComputedStyle(e).opacity)>0)};
      })()`);
    }finally{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]});win.webContents.debugger.detach();}
    if(!reduced.still||!reduced.unchanged||!reduced.visible)throw Error('Reduced-motion tuning failed: '+JSON.stringify(reduced));
    win.setContentSize(390,844);
    const narrow=await win.webContents.executeJavaScript(`(async()=>{
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const slider=document.getElementById('rune-intensity');slider.scrollIntoView({block:'center'});const r=slider.getBoundingClientRect();
      const pane=document.getElementById('container-panel-reliquary').getBoundingClientRect();
      return document.documentElement.scrollWidth<=innerWidth&&pane.left>=0&&pane.right<=innerWidth&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===slider;
    })()`);
    if(!narrow)throw Error('Narrow activity widget overflowed or blocked its slider.');
    win.setContentSize(760,800);
    await win.webContents.executeJavaScript(`(async()=>{document.querySelector('[data-activity="lively"]').click();document.getElementById('preview-motion').click();window.scrollTo(0,0);await new Promise(r=>setTimeout(r,450));document.getElementById('preview-motion').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
    fs.writeFileSync(path.join(root,'motion-preview.png'),(await win.webContents.capturePage()).toPNG());
    const disposed=await win.webContents.executeJavaScript(`(()=>{const animations=[...document.querySelectorAll('.rune-field')].flatMap(e=>e.getAnimations({subtree:true}));runePreview.dispose();return !document.querySelector('.rune-field-mote')&&animations.every(a=>a.playState==='idle');})()`);
    if(!disposed)throw Error('Rune activity retained work after disposal.');
    fs.writeFileSync(path.join(root,'comparison-report.json'),JSON.stringify({scratch,source:current,baseline,states:cases.length,preview,tuning,renewal,keyboard,reduced,narrow,disposed,errors:[]},null,2));
    console.log('Verified activity population/rate, fresh random births, bounded animation reuse, fixed brightness, pause/disposal, keyboard control, reduced motion and narrow layout.');
  }catch(error){console.error(error);process.exitCode=1;}
  finally{clearTimeout(timer);win?.destroy();app.exit(process.exitCode||0);}
});
