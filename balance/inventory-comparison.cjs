// Capture matching in-game pages. Build each revision and run with "before" or "after".
// HOLLOW_WAKE_QA_DIST selects the build; profiles and saves are disposable.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const phase = process.argv[2];
assert(['before','after','study-before','study-after'].includes(phase), 'Choose a capture phase');
const scratch = makeTempDir('hollow-inventory-review-');
const repo = path.resolve(__dirname, '..'), out = path.join(__dirname, 'reports', 'inventory-comparison');
fs.mkdirSync(out, { recursive:true });
const pages = { inventory:'Inventory', skills:'Skills', character:'Character', passives:'Passive Tree', tree:'Skill tree' };
const gems = JSON.parse(execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e',
  "import { SKILLS } from './src/data/skills.ts'; import { makeSkillGem } from './src/engine/skills.ts'; console.log(JSON.stringify(Object.values(SKILLS).filter(s=>s.tree).slice(0,8).map(s=>makeSkillGem(s,20,'rare'))));"],
  { cwd:repo, encoding:'utf8', env:{...process.env,ELECTRON_RUN_AS_NODE:'1'} }));
app.setPath('userData', path.join(scratch,'profile'));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const server = await startGameServer({root:path.resolve(repo,process.env.HOLLOW_WAKE_QA_DIST || 'dist'),savesDir:path.join(scratch,'saves')});
  const win = new BrowserWindow({show:false,width:1680,height:1000,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run = (fn,...args) => win.webContents.executeJavaScript(`(${fn})(${args.map(a=>JSON.stringify(a)).join(',')})`);
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  try {
    await win.loadURL(server.url);
    await run(async gems => {
      await __game.hydrated();
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1;
      await __game.devStartLoadingRun('warrior'); __game.hold(true);
      const w=__game.world(), seat=w.localSeat, m=seat.meta, ui=__game.ui;
      w.update=()=>{}; w.devIgnoreSkillAttributes=true; w.account.ledger.odyssey_stage_2=1;
      w.account.features.add('reliquary');
      for(const id of [...m.knownSkills.keys()]) w.unlearnSkill(id);
      for(const [slot,gem] of gems.entries()){
        const item=w.grantSkillGemItem(seat,gem,true);
        if(!item || !w.learnSkill(item.uid,seat,slot)) throw Error('Could not seat '+gem.def.id);
        w.account.memorySecondary.add('skill:'+gem.def.id);
      }
      m.items=[];
      const item=(uid,baseId,name,rarity,x,y)=>({uid,baseId,name,rarity,x,y,tier:1,ilvl:12,baseRoll:0,implicitRolls:[],affixes:[]});
      m.equipped.helmet=item(80001,'helmet_mi_undead','Gravebound Casque','rare',0,0);
      m.items.push(item(80002,'chest_mi_undead','Gravebound Plate','magic',0,0),item(80003,'ring_mi_gnoll','Gnoll Ring','rare',2,0),
        item(80004,'helmet_mi_undead','Gravebound Casque','common',4,1),item(80005,'relic_charm','Ward Charm','rare',7,0));
      m.items[1].locked=true; m.passivePoints=3;
      ui.hideAll(); ui.toggleInventory(); __game.step(2); ui.folioSync();
    },gems);
    if(phase.startsWith('study-')){
      await require('./inventory-pane-study.cjs')({win,run,wait,phase});
      return;
    }
    const templates=phase==='before' ? [] : await run(()=>{
      __game.ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
      const choices=[...document.querySelectorAll('[data-interface-template]')].map(b=>({
        id:b.dataset.interfaceTemplate, name:b.querySelector('b').textContent, isDefault:b.getAttribute('aria-pressed')==='true',
      }));
      __game.ui.hideEscapeMenu();return choices;
    });
    const captures=phase==='before' ? [{id:'before',name:'Original'}] : templates;
    for(const template of captures) {
      const prefix=template.isDefault ? 'after' : template.id;
      if(phase==='after'){
        await run(id=>{
          const ui=__game.ui;
          ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
          document.querySelector('[data-interface-template="'+id+'"]').click();
          document.querySelector('[data-interface-save]').click();ui.hideEscapeMenu();
          if(document.getElementById('inventory').classList.contains('hidden'))ui.toggleInventory();
          for(const page of ui.inventoryPages.entries())if(ui.inventoryPages.isOpen(page.id))ui.inventoryPages.close(page.id);
          ui.folioSync();
        },template.id);
      }
      for(const key of [...Object.keys(pages),...(phase==='after'?['reliquary']:[])]) {
        const id=await run(key=>{
          const ui=__game.ui;
          if(key==='tree') ui.openSkillTree([...__game.world().meta.knownSkills.keys()][0]);
          else if(key==='reliquary') document.querySelector('[data-containerflap="reliquary"]').click();
          else if(key!=='inventory') ui.inventoryPages.request(key,__game.world().localSeat.id,'show');
          ui.folioSync();
          if(key==='reliquary')return document.querySelector('[data-containerflap="reliquary"]').getAttribute('aria-controls');
          return key==='tree'?ui.skillTreePanes.values().next().value.el.id:{inventory:'inventory',skills:'skills-panel',character:'char-sheet',passives:'passive-tree'}[key];
        },key);
        await wait(350);
        const clip=await run(async (id,phase)=>{
          await document.fonts.ready;
          const el=document.getElementById(id);
          if(!el)throw Error('Missing comparison page '+id);
          const r=el.getBoundingClientRect();
          const rail=el.querySelector('.build-ribbons')?.getBoundingClientRect(), strip=el.querySelector('.folio-strip')?.getBoundingClientRect();
          const left=Math.max(0,Math.floor(Math.min(r.left,rail?.left??r.left))-4);
          const top=Math.max(0,Math.floor(Math.min(r.top,strip?.top??r.top))-4);
          if(r.width<=0||r.height<=0)throw Error('Hidden page '+id);
          if(phase==='after'){
            const icon=el.querySelector('h2 .folio-heading-icon');
            if(icon && icon.getBoundingClientRect().height>30) throw Error('Heading icon sized like a map on '+id);
            if(id==='passive-tree' && el.querySelector('.tree-viewport').getBoundingClientRect().top>r.top+r.height/2) throw Error('Tree controls displaced the chart');
            if(el.matches('.skill-tree')){
              const chart=el.querySelector('.st-svg').getBoundingClientRect();
              for(const label of el.querySelectorAll('.st-label')){
                const box=label.getBoundingClientRect();
                if(box.left<chart.left-1||box.right>chart.right+1) throw Error('Clipped node label: '+label.textContent);
              }
            }
          }
          return {x:left,y:top,width:Math.min(innerWidth-left,Math.ceil(r.right)-left+4),height:Math.min(innerHeight-top,Math.ceil(r.bottom)-top+4)};
        },id,phase);
        fs.writeFileSync(path.join(out,`${prefix}-${key}.png`),(await win.webContents.capturePage(clip)).toPNG());
      }
    }
    if(phase==='after'){
      // Reach the actual theme picker, then exercise the full rack above the live HUD.
      const themed=await run(()=>{
        __game.ui.showWardrobe();document.querySelector('[data-wd-interface]').click();
        const frame=document.querySelector('[data-interface-choice="frame"]');frame.value='astral';frame.dispatchEvent(new Event('change'));
        document.querySelector('[data-interface-save]').click();__game.ui.hideEscapeMenu();
        __game.ui.inventoryPages.request('skills',__game.world().localSeat.id,'show');__game.ui.folioSync();
        return document.getElementById('skills-panel').dataset.uiFrame;
      });
      assert.equal(themed,'astral');
      win.setContentSize(1366,768);await wait(180);
      const layout=await run(()=>{
        __game.ui.showEscapeMenu();document.getElementById('esc-keys').click();document.querySelector('[data-opttab="interface"]').click();
        const scale=document.getElementById('opt-uiscale');scale.value=125;scale.dispatchEvent(new Event('input',{bubbles:true}));
        __game.ui.hideEscapeMenu();__game.step(3);__game.ui.folioSync();
        const panel=document.getElementById('skills-panel'),scroll=panel.querySelector('.build-scroll'),r=panel.getBoundingClientRect();
        const b=panel.querySelector('[data-rackunbind]'),box=b.getBoundingClientRect();
        return {visible:r.width>0,seats:panel.querySelectorAll('[data-rackunbind]').length,scrolls:scroll.scrollHeight>scroll.clientHeight,
          clearsHud:r.bottom<=__game.ui.hudCluster().y+1,hit:b.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2))};
      });
      console.log('Enlarged Skills',layout);
      assert(layout.visible&&layout.seats===8&&layout.scrolls&&layout.clearsHud&&layout.hit);
      for(const key of Object.keys(pages))assert(fs.existsSync(path.join(out,'before-'+key+'.png')), 'Capture the baseline for '+key);
      assert.equal(templates.filter(t=>t.isDefault).length,1,'New settings must match one default template');
      const galleryChoices=templates.map(t=>({id:t.isDefault?'after':t.id,name:t.name}));
      const gallery=fs.readFileSync(path.join(__dirname,'inventory-comparison.html'),'utf8').replace('/* templateComparisons */[]',JSON.stringify(galleryChoices).replace(/</g,'\\u003c'));
      const studyLink=fs.existsSync(path.join(out,'../inventory-pane-study/index.html'))
        ? '<a href="../inventory-pane-study/index.html" style="color:#cfeee0">Compare lettering and pane revisions</a>' : '';
      fs.writeFileSync(path.join(out,'index.html'),gallery.replace('<!-- pane-study -->',studyLink));
      await win.loadFile(path.join(out,'index.html'));
      for(const key of [...Object.keys(pages),'reliquary']){
        const ready=await run(async (key,choices)=>{
          document.querySelector('[data-page="'+key+'"]').click();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const select=document.querySelector('[data-compare="after"]');
          for(const {id} of choices){
            select.value=id;select.dispatchEvent(new Event('change'));
            await Promise.all([...document.images].map(image=>image.decode()));
            if(!document.getElementById('after').src.endsWith(id+'-'+key+'.png'))return false;
          }
          return true;
        },key,galleryChoices);
        assert(ready, 'Comparison images for '+key);
      }
      win.setContentSize(1480,680);
      await run(async second=>{
        location.hash='inventory';
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const select=document.querySelector('[data-compare="after"]');select.value=second;select.dispatchEvent(new Event('change'));
        await Promise.all([...document.images].map(image=>image.decode()));
      },galleryChoices[1].id);
      const height=await run(()=>Math.min(innerHeight,Math.ceil(document.querySelector('figure').getBoundingClientRect().bottom)+18));
      fs.writeFileSync(path.join(out,'templates-side-by-side.png'),(await win.webContents.capturePage({x:0,y:0,width:1480,height})).toPNG());
      win.setContentSize(1240,1120);
      await wait(250);
      const overview=await run(async ()=>{
        const select=document.getElementById('view');select.value='all';select.dispatchEvent(new Event('change'));
        await Promise.all([...document.querySelectorAll('#overview img')].map(image=>image.decode()));
        scrollTo(0,0);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const r=document.querySelector('#overview').getBoundingClientRect();
        if(r.top<0||r.bottom>innerHeight+1)throw Error('Overview did not fit the capture viewport: '+JSON.stringify(r.toJSON()));
        return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)};
      });
      const galleryShot=await win.webContents.capturePage();
      fs.writeFileSync(path.join(out,'wardrobe-templates.png'),galleryShot.crop(overview).toPNG());
    }
    console.log('Captured '+phase+' for '+Object.values(pages).join(', '));
  }catch(e){console.error(e);process.exitCode=1;}
  finally{win.destroy();server.server.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
