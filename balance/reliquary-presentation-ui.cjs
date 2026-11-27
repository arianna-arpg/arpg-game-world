// Isolated build, saves and profile. The temp janitor removes all scratch data
// after Electron releases its locks, including failed or timed-out runs.
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const { execFile } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), scratch = makeTempDir('hollow-reliquary-');
const out = path.join(__dirname, 'reports', 'reliquary-presentation'); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(scratch, 'profile')); app.disableHardwareAcceleration();
const report = { scratch, checks: [], errors: [], shots: {} };
const entry = path.join(scratch, 'qa.ts');
const imports = { 'engine/itemgen': ['forgeItem'], 'data/containers': ['RELIQUARY'],
  'data/runescript': ['decipher', 'isRune'],
  'ui/uiScale': ['applyUiScale'], 'ui/interfaceStyle': ['applyInterfaceStyle'],
  'render/itemIcons': ['itemFaceHtml'], 'render/relicArt': ['RELIC_ART', 'relicFaceSvg'],
  'render/runeField': ['runeFieldProfile'],
  'meta/persistence': ['flushPendingDiskSaves'],
  'ui/reliquary': ['oracleReliquaryHtml', 'reliquarySummaryHtml'] };
fs.writeFileSync(entry, Object.entries(imports).map(([file, ids]) => `import {${ids}} from ${JSON.stringify(path.join(repo,'src',file).replaceAll('\\','/'))};`).join('\n')
  + '\nwindow.RelicQA={' + Object.values(imports).flat().join(',') + '};');
const prepared = new Promise((resolve,reject) => execFile(process.env.npm_node_execpath || 'node',
  [path.join(repo,'scripts/build-ability-artwork-qa.mjs'),repo,scratch,entry],
  {cwd:repo,windowsHide:true,timeout:480000,maxBuffer:4*1024*1024}, (error,stdout,stderr) => {
    if(stdout)console.log(stdout);if(stderr)console.error(stderr);error?reject(error):resolve();
  })); void prepared.catch(()=>{});
app.whenReady().then(async()=>{
  let win,server;
  const timer=setTimeout(()=>{console.error('Reliquary UI timed out');app.exit(1);},540000);
  const run=(fn,...args)=>win.webContents.executeJavaScript(`(async()=>{try{return await (${fn})(${args.map(v=>JSON.stringify(v)).join(',')})}catch(e){return {qaError:e.stack||String(e)}}})()`)
    .then(r=>{if(r?.qaError)throw Error(r.qaError);return r;});
  const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS '+name);};
  const resize=async(width,height)=>{
    win.setContentSize(width,height);
    // Chromium delivers resize after executeJavaScript can already see the new
    // inner size. Let the canvas resize settle before driving the held client.
    await run(()=>new Promise(resolve=>{
      requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)));
    }));
  };
  const capture=async name=>{
    // Capture the settled screen, not a partially transparent entrance frame.
    await run(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity&&!a.effect?.target?.closest('.rune-field'))a.finish();});
    await new Promise(r=>setTimeout(r,100));
    if(!name.startsWith('theme-'))fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
    report.shots[name]=await run(()=>{const r=document.getElementById('container-panel-reliquary').getBoundingClientRect();return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)};});
    if(name==='equipped'||name==='first-cell'||name.startsWith('theme-'))fs.writeFileSync(path.join(out,name+'-detail.png'),(await win.webContents.capturePage(report.shots[name])).toPNG());
  };
  try {
    await prepared;
    server=await startGameServer({root:scratch,savesDir:path.join(scratch,'saves')});
    win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
    await win.loadURL(server.url+'dist/index.html');await run(()=>__game.hydrated());
    await run(async url=>{await import(url);return true;},server.url+'dist/'+JSON.parse(fs.readFileSync(path.join(scratch,'qa-entry.json'),'utf8')));
    await run(async()=>{
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1;await __game.devStartLoadingRun('warrior');__game.hold(true);
      const w=__game.world();__game.ui.hideAll();w.account.features.add('reliquary');w.account.features.add('oracle_stone');
      w.account.ledger.oracle_rescued=1;w.loadZone('lastlight');w.player.pos={...w.stationAnchor('oracle').pos};
      w.actors=w.actors.filter(a=>a.team!=='enemy');w.lastCombatAt=-999;w.player.invulnerable=true;w.update=()=>{};
      w.meta.items=[];w.account.ledger.reliquary_lesson=1;
      window.relicTest={w,make:(baseId,name)=>{const i=RelicQA.forgeItem({baseId,ilvl:25,rarity:'magic',affixes:[{id:'relic_life'}],quality:.7});i.name=name;return i;}};
      __game.ui.containerPane.toggle('reliquary',w.localSeat.id,'show');__game.ui.folioSync();
    });
    const empty=await run(()=>({cells:document.querySelector('[data-relic-cells]').textContent,xp:document.querySelector('[data-relic-xp]').textContent,sealed:document.querySelectorAll('.relic-cell-sealed').length}));
    check('Empty first cell: no XP cost, 24 sealed cells',empty.cells==='0 / 1'&&empty.xp==='0%'&&empty.sealed===24);
    check('An empty case keeps its inscriptions still',await run(()=>document.querySelector('.relic-casket').getAnimations({subtree:true}).length===0));
    await capture('first-cell');
    const equipped=await run(()=>{
      const {w,make}=relicTest;for(const rung of RelicQA.RELIQUARY.ladder)w.account.features.add(rung.feature);
      for(const [base,name,x,y] of [['relic_effigy','Ashen Effigy',0,0],['relic_talisman','Wayfarer’s Talisman',2,0],['relic_charm','Hearth Charm',4,0]]){
        const i=make(base,name);i.x=0;i.y=0;w.meta.items.push(i);w.containerPlace(w.localSeat,'reliquary',i.uid,x,y);
      }
      __game.ui.refreshInventory();__game.ui.folioSync();
      return {cells:document.querySelector('[data-relic-cells]').textContent,xp:document.querySelector('[data-relic-xp]').textContent,count:w.meta.containers.reliquary.length};
    });
    check('Mixed footprints count seven occupied cells, three Relics and 14% XP',equipped.cells==='7 / 25'&&equipped.xp==='−14%'&&equipped.count===3);
    const art=await run(()=>{
      const root=document.getElementById('container-panel-reliquary'),caseEl=root.querySelector('[data-relic-awake]');
      const faces=['charm','talisman','idol','effigy'].map(tag=>RelicQA.itemFaceHtml('relic_'+tag));
      const tile=root.querySelector('[data-drag]'),r=tile.getBoundingClientRect();
      const cell=root.querySelector('[data-cell="4:4"]'),c=cell.getBoundingClientRect();
      return {distinct:new Set(faces).size,tagged:faces.every((html,i)=>html.includes(`data-relic-art="${['charm','talisman','idol','effigy'][i]}"`)),
        fallback:RelicQA.relicFaceSvg(['future_family']).includes('data-relic-art="ward"'),ordinary:RelicQA.itemFaceHtml('not_a_base')==='?',
        awake:caseEl.dataset.relicAwake==='true',tileHit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===tile,
        cellHit:document.elementFromPoint(c.left+c.width/2,c.top+c.height/2)===cell};
    });
    check('Shared family art has a fallback and never blocks native tiles/cells',art.distinct===4&&art.tagged&&art.fallback&&art.ordinary&&art.awake&&art.tileHit&&art.cellHit);
    const motion=await run(async()=>{
      await new Promise(r=>setTimeout(r,150));
      const root=document.querySelector('.relic-casket'),bands=[...root.querySelectorAll('.relic-rune-band')];
      const animations=root.getAnimations({subtree:true});
      const before=bands.map(e=>getComputedStyle(e).transform),rect=root.querySelector('[data-container-grid]').getBoundingClientRect();
      const first=bands[0];__game.ui.refreshInventory(true);
      await new Promise(r=>setTimeout(r,300));
      const after=bands.map(e=>getComputedStyle(e).transform),next=root.querySelector('[data-container-grid]').getBoundingClientRect();
      return {count:animations.length,expected:RelicQA.RELIC_ART.ambience.bands.length+RelicQA.RELIC_ART.ambience.columns.length+1,
        playing:animations.every(a=>a.playState==='running'),turns:before.every((value,i)=>value!==after[i]),
        transformOnly:animations.every(a=>a.effect.getKeyframes().every(f=>Object.keys(f).every(k=>['offset','computedOffset','easing','composite','transform','opacity'].includes(k)))),
        runic:[...root.querySelectorAll('.relic-rune-glyphs text,.relic-rune-column span')].every(e=>RelicQA.isRune(e.textContent)),
        decorative:bands.every(e=>e.closest('[aria-hidden=true]')&&getComputedStyle(e).pointerEvents==='none'),
        stationary:rect.x===next.x&&rect.y===next.y&&rect.width===next.width&&rect.height===next.height,
        stable:first===document.querySelector('.relic-rune-band'),visible:root.dataset.ambientRunning};
    });
    report.motion=motion;
    check('Visible case runs bounded, transform/opacity-only rune motion behind stationary native controls',motion.count===motion.expected&&motion.playing&&motion.turns&&motion.transformOnly&&motion.runic&&motion.decorative&&motion.stationary&&motion.stable);
    const ghosts=await run(async()=>{
      const root=document.getElementById('container-panel-reliquary'),caseRect=root.querySelector('.relic-casket').getBoundingClientRect();
      const fields=[...root.querySelectorAll('.rune-field')],motes=[...root.querySelectorAll('.rune-field-mote')];
      const animations=fields.flatMap(e=>e.getAnimations({subtree:true}));
      const first=motes[0],animation=first.getAnimations()[0];
      const before=motes.map(e=>getComputedStyle(e).transform);__game.ui.refreshInventory(true);
      await new Promise(r=>setTimeout(r,250));
      const drifts=motes.some((e,i)=>getComputedStyle(e).transform!==before[i]);
      const stable=root.querySelector('.rune-field-mote')===first&&first.getAnimations()[0]===animation;
      const initial=animations.map(a=>({a,time:a.currentTime,state:a.playState}));
      for(const a of animations)a.pause();
      await Promise.all(animations.map(a=>a.ready));
      const at=async phase=>{
        for(const a of animations){const t=a.effect.getTiming();a.currentTime=t.duration*phase;}
        await new Promise(requestAnimationFrame);
        return motes.map(e=>Number(getComputedStyle(e).opacity));
      };
      let born,lit,gone;
      try{born=await at(0);lit=await at(.24);gone=await at(.9999);}
      finally{for(const s of initial){s.a.currentTime=s.time;if(s.state==='running')s.a.play();}}
      const prior={glyph:first.textContent,x:first.style.left,y:first.style.top};animation.finish();
      await new Promise(r=>setTimeout(r,80));
      const renewed=first.textContent!==prior.glyph&&first.style.left!==prior.x&&first.style.top!==prior.y&&first.getAnimations()[0]===animation;
      const toggle=root.querySelector('[data-reliquary-toggle]'),t=toggle.getBoundingClientRect();
      return {count:motes.length,expected:fields.reduce((n,e)=>n+RelicQA.runeFieldProfile(JSON.parse(e.dataset.runeField)).count,0),
        distinct:new Set(motes.map(e=>e.textContent)).size,canonical:motes.every(e=>RelicQA.isRune(e.textContent)),drifts,stable,renewed,
        born,lit,gone,fade:born.every(a=>a===0)&&gone.every(a=>a<.001)&&lit.every(a=>a>0&&a<=.2)&&animations.every(a=>Number(a.effect.getKeyframes().at(-1).opacity)===0),
        bounded:animations.length===motes.length&&animations.every(a=>a.effect.getKeyframes().every(f=>Object.keys(f).every(k=>['offset','computedOffset','easing','composite','transform','opacity'].includes(k)))),
        excluded:fields.every(e=>{const r=e.getBoundingClientRect();return r.bottom<=caseRect.top+.1||r.top>=caseRect.bottom-.1;}),
        decorative:fields.every(e=>e.getAttribute('aria-hidden')==='true')&&motes.every(e=>getComputedStyle(e).pointerEvents==='none'),
        controls:document.elementFromPoint(t.left+t.width/2,t.top+t.height/2)===toggle};
    });
    report.ghosts=ghosts;
    check('Pane ghosts renew glyphs and positions after fading, reuse bounded native animations and preserve controls',ghosts.count===ghosts.expected&&ghosts.canonical&&ghosts.drifts&&ghosts.stable&&ghosts.renewed&&ghosts.fade&&ghosts.bounded&&ghosts.excluded&&ghosts.decorative&&ghosts.controls);
    win.webContents.debugger.attach('1.3');
    try{
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      check('Reduced motion retains the runic artwork with no ambient animations',await run(async()=>{
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const root=document.getElementById('container-panel-reliquary');return root.getAnimations({subtree:true}).length===0&&root.querySelectorAll('.relic-rune-band').length===RelicQA.RELIC_ART.ambience.bands.length&&[...root.querySelectorAll('.rune-field-mote')].every(e=>Number(getComputedStyle(e).opacity)>0);
      }));
    }finally{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]});win.webContents.debugger.detach();}
    const hidden=await run(async()=>{
      __game.ui.hideAll();await new Promise(r=>setTimeout(r,150));
      const root=document.getElementById('container-panel-reliquary');
      const resting=[...root.querySelectorAll('[data-ambient-running]')].every(e=>e.dataset.ambientRunning==='false')&&root.getAnimations({subtree:true}).every(a=>a.playState!=='running');
      __game.ui.containerPane.toggle('reliquary',relicTest.w.localSeat.id,'show');__game.ui.folioSync();
      await new Promise(r=>setTimeout(r,150));
      return {resting,resumed:[...root.querySelectorAll('.rune-field,.relic-casket')].flatMap(e=>e.getAnimations({subtree:true})).every(a=>a.playState==='running')};
    });
    check('Closing Inventory suspends the atmosphere; reopening resumes it',hidden.resting&&hidden.resumed);
    const visibility=await run(async()=>{
      const root=document.querySelector('.relic-casket'),descriptor=Object.getOwnPropertyDescriptor(document,'hidden');
      let stopped=false,resumed=false;
      try{
        Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
        stopped=[...document.querySelectorAll('#container-panel-reliquary [data-ambient-running]')].every(e=>e.dataset.ambientRunning==='false'&&e.getAnimations({subtree:true}).every(a=>a.playState==='paused'));
      }finally{
        if(descriptor)Object.defineProperty(document,'hidden',descriptor);else delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
        resumed=root.dataset.ambientRunning==='true';
      }
      const panel=document.getElementById('container-panel-reliquary'),style=panel.getAttribute('style'),scroll=panel.scrollTop;
      const rules=panel.querySelector('[data-relic-details=rules]'),wasOpen=rules.open;
      let clipped=false;
      try{
        rules.open=true;panel.style.height='100px';panel.style.maxHeight='100px';panel.scrollTop=panel.scrollHeight;
        await new Promise(r=>setTimeout(r,150));
        clipped=root.getBoundingClientRect().bottom<panel.getBoundingClientRect().top&&root.dataset.ambientRunning==='false'&&root.getAnimations({subtree:true}).every(a=>a.playState==='paused');
      }finally{panel.setAttribute('style',style);rules.open=wasOpen;panel.scrollTop=scroll;}
      await new Promise(r=>setTimeout(r,150));
      return {stopped,resumed,clipped,returned:root.dataset.ambientRunning==='true'};
    });
    report.visibility=visibility;
    check('Background-document events and scroll clipping pause the atmosphere without a frame loop',visibility.stopped&&visibility.resumed&&visibility.clipped&&visibility.returned);
    await capture('equipped');
    const inscription=await run(()=>{
      const root=document.getElementById('container-panel-reliquary'),runes=root.querySelector('.relic-casket-inscription');
      return {decoded:RelicQA.decipher(runes.textContent),runic:[...runes.textContent].every(c=>RelicQA.isRune(c)||/\s/.test(c)),
        decorative:runes.getAttribute('aria-hidden')==='true',clean:!root.querySelector('.relic-subtitle,.relic-casket-title')&&!/Old power|Not all things|The inner seal/i.test(root.textContent)};
    });
    check('Decorative inscription uses the shared Runescript; plain-text ornament is absent',inscription.decoded==='not all things should wake'&&inscription.runic&&inscription.decorative&&inscription.clean);
    const themeColors=[];
    for(const frame of ['aether','relic','astral','simple']){
      const theme=await run(frame=>{
        const root=document.getElementById('container-panel-reliquary'),inventory=document.getElementById('inventory');
        const tile=root.querySelector('[data-drag]'),art=tile.querySelector('.relic-art-body');
        RelicQA.applyInterfaceStyle({frame,divider:'silver',ribbon:'pennants'});
        const style=e=>getComputedStyle(e),light=style(root.querySelector('.relic-state-label')).color;
        return {light,samePanel:style(root).backgroundImage===style(inventory).backgroundImage,
          sameHeading:style(root.querySelector('h2')).color===style(inventory.querySelector('h2')).color,
          ornament:style(root.querySelector('.relic-case-etching')).color===light,
          face:style(art).stroke===light,ward:style(root.querySelector('.relic-case-wards')).fill===light,
          runes:style(root.querySelector('.relic-rune-glyphs')).fill===light&&style(root.querySelector('.relic-rune-column')).color===light&&style(root.querySelector('.rune-field-mote')).color===light,
          edge:style(root.querySelector('.relic-casket')).borderTopColor===style(root.querySelector('.relic-return')).borderTopColor,
          stable:root.querySelector('[data-drag]')===tile&&tile.querySelector('.relic-art-body')===art};
      },frame);
      check(`${frame}: case, item art, wards and moving runes follow Wardrobe without rebuilding controls`,theme.samePanel&&theme.sameHeading&&theme.ornament&&theme.face&&theme.ward&&theme.runes&&theme.edge&&theme.stable);
      themeColors.push(theme.light);await capture('theme-'+frame);
      if(frame==='aether')fs.writeFileSync(path.join(out,'equipped-case.json'),JSON.stringify(await run(()=>{
        const root=document.getElementById('container-panel-reliquary');
        return {html:root.querySelector('.relic-casket').outerHTML,tokens:root.getAttribute('style'),pane:root.outerHTML,
          css:[...document.styleSheets].map(sheet=>[...sheet.cssRules].map(rule=>rule.cssText).join('\n')).join('\n')};
      }),null,2));
    }
    check('Wardrobe changes the live ornament palette across theme families',new Set(themeColors).size>=3);
    await run(()=>RelicQA.applyInterfaceStyle({frame:'aether',divider:'silver',ribbon:'pennants'}));
    const toggle=await run(()=>{
      const ui=__game.ui,b=document.querySelector('[data-reliquary-toggle]');b.focus();
      document.querySelector('[data-relic-details=rules]').open=true;b.click();ui.folioSync();
      const off={xp:document.querySelector('[data-relic-xp]').textContent,enabled:relicTest.w.meta.relicEnabled,
        focus:document.activeElement.matches('[data-reliquary-toggle]'),details:document.querySelector('[data-relic-details=rules]').open,
        dormant:document.querySelector('[data-relic-awake]').dataset.relicAwake==='false'&&document.querySelector('.relic-casket').getAnimations({subtree:true}).length===0};
      document.querySelector('[data-reliquary-toggle]').click();ui.folioSync();return off;
    });
    check('Toggle preserves focus/rules and quiets the case while pausing powers and XP',toggle.xp==='0%'&&toggle.enabled===false&&toggle.focus&&toggle.details&&toggle.dormant);
    const calm=await run(()=>{const w=relicTest.w;w.lastCombatAt=w.time;__game.ui.refreshInventory();
      const disabled=document.querySelector('[data-reliquary-toggle]').disabled;
      const reason=document.querySelector('.relic-refusal')?.textContent;w.lastCombatAt=-999;__game.ui.refreshInventory();return {disabled,reason};});
    check('Combat refusal is visible and disables the existing toggle',calm.disabled&&!!calm.reason);
    for(const [width,height,scale,frame] of [[1366,768,1,'aether'],[820,650,1.5,'astral'],[1920,1080,1,'relic']]){
      await resize(width,height);
      const layout=await run((scale,frame)=>{
        RelicQA.applyUiScale(scale);RelicQA.applyInterfaceStyle({frame,divider:'silver',ribbon:'pennants'});
        // Drive the real HUD after resizing; a frozen HUD would give the page
        // its old bottom boundary and conceal overlaps with hotbar/orbs.
        __game.step(2);__game.ui.folioSync();
        const root=document.getElementById('container-panel-reliquary');document.querySelector('[data-relic-details=rules]').open=false;
        const grid=root.querySelector('[data-container-grid]'),r=root.getBoundingClientRect(),g=grid.getBoundingClientRect();
        const target=root.querySelector('[data-drop="containerUnseat:reliquary"]');target.scrollIntoView({block:'nearest'});
        const t=target.getBoundingClientRect();const hit=document.elementFromPoint(t.left+t.width/2,t.top+t.height/2);
        const first=root.querySelector('[data-reliquary-toggle]');first.focus();__game.ui.refreshInventory(true);
        const hud=__game.ui.hudCluster?.();
        const c=root.querySelector('.relic-casket').getBoundingClientRect();
        const excluded=[...root.querySelectorAll('.rune-field')].every(e=>{const f=e.getBoundingClientRect();return f.bottom<=c.top+.1||f.top>=c.bottom-.1;});
        return {inside:r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&!!hud&&hud.y<innerHeight&&r.bottom<=hud.y,grid:g.left>=r.left&&g.right<=r.right,excluded,
          hit:target===hit||target.contains(hit),stable:first===root.querySelector('[data-reliquary-toggle]'),overflow:root.scrollWidth-root.clientWidth};
      },scale,frame);
      (report.layouts??=[]).push({width,height,scale,frame,...layout});
      check(`${width}px / ${scale}: page clears live HUD, grid fits, ghosts exclude case, return target works, idle controls stable`,layout.inside&&layout.grid&&layout.excluded&&layout.hit&&layout.stable&&layout.overflow<=1);
      await run(()=>document.getElementById('container-panel-reliquary').scrollTop=0);await capture(`board-${width}-${frame}`);
    }
    await resize(1440,1000);
    const store=await run(()=>{
      RelicQA.applyUiScale(1);RelicQA.applyInterfaceStyle({frame:'aether',divider:'silver',ribbon:'pennants'});
      const {w,make}=relicTest;__game.ui.hideAll();w.account.reliquary.stash.pages=8;
      for(const [i,name]of ['Quiet Ember','Silver Thread','Long <script> & keepsake name that wraps safely'].entries()){
        const item=make('relic_charm',name);item.x=i;item.y=0;w.meta.items.push(item);if(i<2)w.oracleRelic(w.localSeat,item.uid,'store');
      }
      __game.ui.showOracle();__game.ui.folio.front('oracle');__game.ui.folioSync();
      const button=document.querySelector('[data-relic-operation=store]');button.click();
      document.querySelector('[data-relic-details=contents]').open=true;
      return {count:w.account.reliquary.items.length,pack:w.meta.items.filter(i=>i.baseId==='relic_charm').length,
        copy:document.querySelector('.relic-storage').textContent,scripts:document.querySelectorAll('.relic-storage script').length};
    });
    check('Storage actions retain account custody and escape names',store.count===6&&store.pack===0&&store.scripts===0&&!store.copy.includes('Store permanently'));
    await capture('oracle-storage');
    await resize(820,650);
    const compactStorage=await run(()=>{
      RelicQA.applyUiScale(1.5);__game.step(2);__game.ui.folioSync();
      const root=document.getElementById('oracle-menu'),button=root.querySelector('[data-relic-operation=withdraw]');
      button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect();
      const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {overflow:root.scrollWidth-root.clientWidth,reachable:button===hit||button.contains(hit),within:r.right<=innerWidth&&r.bottom<=innerHeight};
    });
    check('Enlarged storage keeps long names and actions inside a reachable scrolling page',compactStorage.overflow<=1&&compactStorage.reachable&&compactStorage.within);
    await capture('oracle-storage-enlarged');
    await resize(1440,1000);await run(()=>{RelicQA.applyUiScale(1);__game.step(2);__game.ui.folioSync();});
    const search=await run(()=>{
      const input=document.querySelector('[data-relic-search]');input.value='  ember ';input.dispatchEvent(new Event('input',{bubbles:true}));
      const result={focus:document.activeElement.matches('[data-relic-search]'),matches:document.querySelector('[data-relic-page="0"]').getAttribute('aria-label'),open:document.querySelector('[data-relic-details=contents]').open,
        bright:[...document.querySelectorAll('[data-stash-tile]')].filter(e=>e.style.opacity==='1').length};
      const next=document.querySelector('[data-relic-search]');next.value='';next.dispatchEvent(new Event('input',{bubbles:true}));return result;
    });
    check('Trimmed search preserves grid positions, caret focus and expanded contents',search.focus&&search.open&&search.bright===1&&search.matches.includes('1 matches'));
    const release=await run(()=>{
      const w=relicTest.w,button=document.querySelector('[data-relic-release]'),uid=Number(button.dataset.relicRelease);
      button.click();const before=w.account.reliquary.items.some(i=>i.uid===uid),confirmation=button.textContent;
      button.click();const removed=!w.account.reliquary.items.some(i=>i.uid===uid);
      const locked=w.account.reliquary.items.find(i=>i.name==='Silver Thread');locked.locked=true;__game.ui.refreshOracle();
      return {before,confirmation,removed,locked:document.querySelector(`[data-relic-release="${locked.uid}"]`).disabled};
    });
    check('Release remains a two-press destructive action and respects locks',release.before&&release.removed&&release.locked&&release.confirmation==='Confirm permanent release');
    const withdraw=await run(()=>{const w=relicTest.w,b=document.querySelector('[data-relic-operation=withdraw]'),uid=Number(b.dataset.relicUid);b.click();return w.meta.items.some(i=>i.uid===uid);});
    check('To pack still withdraws through the shared action',withdraw);
    await run(()=>{
      const ui=__game.ui;
      ui.hideAll();ui.containerPane.toggle('reliquary',relicTest.w.localSeat.id,'show');ui.folioSync();
      ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
    });
    await capture('wardrobe-rune-activity');
    const wardrobe=await run(async()=>{
      const root=document.getElementById('container-panel-reliquary');
      const count=()=>root.querySelectorAll('.rune-field-mote').length;
      const saved=()=>__game.settings().interfaceStyle.runeActivity;
      const sample=()=>document.querySelector('wardrobe-rune-sample');
      const slider=()=>document.querySelector('[data-rune-activity]');
      const adjust=n=>{slider().value=String(n);slider().dispatchEvent(new Event('input'));};
      const save=()=>document.querySelector('[data-interface-save]').click();
      const lively=saved()===50&&slider().value==='50'&&slider().getAttribute('aria-valuetext').includes('Lively')&&count()===49;
      const first=sample();
      adjust(100);
      const max=first.querySelectorAll('.rune-field-mote').length===64&&saved()===50&&count()===49;
      document.querySelector('[data-interface-back]').click();document.querySelector('[data-wd-interface]').click();
      const discarded=slider().value==='50'&&first.querySelectorAll('.rune-field-mote').length===0;
      const tile=root.querySelector('[data-drag]');
      adjust(100);save();
      const applied=count()===112&&saved()===100&&root.querySelector('[data-drag]')===tile;
      adjust(0);save();
      const off=count()===0&&saved()===0&&sample().querySelectorAll('.rune-field-mote').length===0;
      document.querySelector('[data-interface-default]').click();
      const restore=slider().value==='50'&&sample().querySelectorAll('.rune-field-mote').length===28&&count()===0&&saved()===0;
      await RelicQA.flushPendingDiskSaves();
      return {lively,max,discarded,applied,off,restore};
    });
    for(const [name,ok] of Object.entries(wardrobe))check('Wardrobe rune activity: '+name,ok);
    await win.loadURL(server.url+'dist/index.html');await run(()=>__game.hydrated());
    check('Saved Off survives reload and reopening the Wardrobe',await run(()=>{
      __game.ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
      const slider=document.querySelector('[data-rune-activity]');
      return __game.settings().interfaceStyle.runeActivity===0&&slider.value==='0'&&slider.getAttribute('aria-valuetext').includes('Off')&&!document.querySelector('wardrobe-rune-sample .rune-field-mote');
    }));
    check('No fatal client errors',await run(()=>__game.crash().fatal===null));
  }catch(error){report.errors.push(error.stack||String(error));console.error(error);}
  finally{clearTimeout(timer);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));win?.destroy();server?.server.close();app.exit(report.errors.length?1:0);}
}).catch(error=>{console.error(error);app.exit(1);});
