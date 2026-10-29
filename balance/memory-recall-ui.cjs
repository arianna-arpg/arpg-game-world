// Build first. Hidden renderer, real pane controls, isolated profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname, '..'), dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'memory-recall-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
const fixtures = JSON.parse(execFileSync('node', ['--import', 'tsx', '--input-type=module', '-e', `
  import { makeMemoryItem } from './src/engine/memories.ts';
  import { makeSupportGemItem } from './src/engine/gemitems.ts';
  import { SUPPORTS } from './src/data/supports.ts';
  import { ITEM_CFG } from './src/engine/items.ts';
  process.stdout.write(JSON.stringify({ rough: makeMemoryItem('rough', []), preformed: makeMemoryItem('preformed', []),
    gem: makeSupportGemItem({def: SUPPORTS.arcing, level: 1}), board: ITEM_CFG.inventory }));`],
  { cwd: root, encoding: 'utf8', windowsHide: true }));
app.setPath('userData', path.join(dir, 'memory-recall-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.join(root, 'dist'), savesDir: path.join(dir, 'memory-recall-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1800, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return {value:await eval(${JSON.stringify(code)})};}catch(e){return {error:e.stack};}})()`);
    if (result.error) throw Error(result.error);
    return result.value;
  };
  const capture = async name => {
    await run('__game.renderer.render(__game.world());__game.ui.folioSync();void 0;');
    await new Promise(resolve => setTimeout(resolve, 80));
    fs.writeFileSync(path.join(dir, 'memory-recall-' + name + '.png'), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    await run('__game.hold(true);__game.hydrated()');
    await run(`(() => {
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.step(360);
      const ui=__game.ui,w=__game.world();ui.hideAll();w.update=()=>{};
      __game.renderer.render(w);
      const fixtures=${JSON.stringify(fixtures)};
      window.recallQA={ui,w,fixtures,checks:[],nextUid:900000,
        check(name,ok){if(!ok)throw Error(name);this.checks.push(name);},
        plant(n,kind='rough',full=false){
          ui.closeRecall();
          const pouch={...structuredClone(fixtures[kind]),uid:this.nextUid++,x:0,y:0,
            mem:Array.from({length:n},(_,i)=>({d:i%2?'crypt_lich':'zombie',s:710+i}))};
          w.localSeat.meta.items=[pouch];
          if(full)for(let y=0;y<fixtures.board.h;y++)for(let x=0;x<fixtures.board.w;x++)if(x||y)
            w.localSeat.meta.items.push({...structuredClone(fixtures.gem),uid:this.nextUid++,x,y});
          this.pouch=pouch;ui.refreshInventory();ui.showRecall(pouch.uid);ui.folioSync();return pouch;
        },
        beat(){ui.recallBatch.nextAt=0;ui.recallRefreshAt=0;ui.folioSync();},
        scale(value){const el=document.createElement('div');ui.optionsTab='interface';ui.renderOptions(el,()=>{});
          const slider=el.querySelector('#opt-uiscale');slider.value=value;slider.dispatchEvent(new Event('input'));},
        rect(el){const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},
        hit(el){const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}
      };
      recallQA.plant(12);
    })()`);
    for (const [width, height, scale] of [[1800, 1000, 100], [1400, 1000, 100], [1000, 720, 100], [2000, 1100, 125]]) {
      win.setContentSize(width, height);
      await new Promise(resolve => setTimeout(resolve, 80));
      await run(`recallQA.scale(${scale});void 0;`);
      for (const page of ['skills', 'character', 'passives']) for (const recallFirst of [false, true]) {
        const facts = await run(`(() => {
          const q=recallQA,{ui,w}=q;ui.hideAll();
          if(${recallFirst})ui.showRecall(q.pouch.uid);
          ui.inventoryPages.request('${page}',w.localSeat.id,'show');ui.folioSync();
          const page=ui.inventoryPages.entries().find(p=>p.id==='${page}').el;
          const before=JSON.stringify([q.rect(ui.inventory),q.rect(page)]);
          if(!${recallFirst})ui.showRecall(q.pouch.uid);
          ui.folioSync();
          const r=q.rect(ui.recallMenu),bag=q.rect(ui.inventory),p=q.rect(page);
          q.check('arrival preserves inventory and page geometry',before===JSON.stringify([bag,p]));
          q.check('separate folio',ui.folio.bookFor('recall')!==ui.folio.bookFor('${page}'));
          q.check('page stays selected',ui.inventoryPages.isOpen('${page}')&&page.getBoundingClientRect().width>0);
          q.check('pane on screen',r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1);
          q.check('Open all clickable',q.hit(ui.recallMenu.querySelector('[data-mem-all]')));
          q.check('Recall clickable',q.hit(ui.recallMenu.querySelector('[data-mem-recall]')));
          const room=Math.max(Math.min(bag.left,p.left)-8,innerWidth-Math.max(bag.right,p.right)-8);
          if(room>=(280+14)*${scale}/100)q.check('clear of bag and selected page',[bag,p].every(o=>r.right<=o.left||r.left>=o.right||r.bottom<=o.top||r.top>=o.bottom));
          return {width:innerWidth,scale:${scale},page:'${page}',recallFirst:${recallFirst},recall:r,bag,pageBounds:p};
        })()`);
        log(facts);
        if (!recallFirst && ((width === 1800 && page === 'skills') || (width === 1400 && page === 'character')
          || (width === 1000 && page === 'passives') || (scale === 125 && page === 'skills'))) await capture(page + '-' + width + '-' + scale);
      }
    }
    win.setContentSize(1800, 1000);
    await run(`(() => {
      const q=recallQA,{ui,w}=q;q.scale(100);ui.hideAll();q.plant(6);
      const alone=q.rect(ui.recallMenu);
      ui.inventoryPages.request('skills',w.localSeat.id,'show');ui.folioSync();
      q.check('live page opening moves recall aside',q.rect(ui.recallMenu).left!==alone.left&&ui.recallOpen);
      ui.closeInventory();ui.folioSync();q.check('closing workspace restores preferred place',q.rect(ui.recallMenu).left===alone.left);
      __game.settings().layout.movable=true;__game.settings().layout.seats['recall-menu']={fx:0.1,fy:0.2};
      ui.closeRecall();ui.folioSync();ui.showRecall(q.pouch.uid);ui.folioSync();
      const moved=q.rect(ui.recallMenu);ui.inventoryPages.request('skills',w.localSeat.id,'show');ui.folioSync();
      q.check('explicit moved place respected',ui.recallMenu.dataset.moved&&q.rect(ui.recallMenu).left===moved.left&&q.rect(ui.recallMenu).top===moved.top);
      __game.settings().layout.movable=false;delete __game.settings().layout.seats['recall-menu'];
      ui.closeRecall();ui.folioSync();ui.showRecall(q.pouch.uid);ui.folioSync();
      window.recallButton=ui.recallMenu.querySelector('[data-mem-all]');
    })()`);
    // Real pointer input opens the batch, then deterministic frame beats exercise its UI lifecycle.
    const point = await run(`(() => {const r=recallButton.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
    win.webContents.sendInputEvent({ type: 'mouseDown', ...point, button: 'left', clickCount: 1 });
    win.webContents.sendInputEvent({ type: 'mouseUp', ...point, button: 'left', clickCount: 1 });
    await run(`(() => {
      const q=recallQA,{ui,w}=q;
      q.check('pointer starts opening',ui.recallBatch.active&&recallButton.textContent==='Stop');
      const before=q.rect(ui.recallMenu);q.beat();
      q.check('one reveal per beat',q.pouch.mem.length===5);
      q.check('stable Stop control',recallButton===ui.recallMenu.querySelector('[data-mem-all]'));
      q.check('reveals do not shift controls',before.left===q.rect(ui.recallMenu).left&&before.top===q.rect(ui.recallMenu).top);
      recallButton.click();q.beat();q.check('Stop cancels',!ui.recallBatch.active&&q.pouch.mem.length===5);
      recallButton.click();ui.closeRecall();q.beat();q.check('close cancels',!ui.recallBatch.active&&q.pouch.mem.length===5);
      q.plant(3,'rough',true);recallButton.click();q.beat();
      q.check('full bag pauses',ui.recallBatch.active&&ui.recallBatch.paused&&q.pouch.mem.length===3);
      q.check('pause visible',ui.recallMenu.querySelector('[data-mem-progress]').textContent.includes('Paused'));
      w.localSeat.meta.items.pop();q.beat();q.check('room resumes',q.pouch.mem.length===2&&!ui.recallBatch.paused);
      q.beat();q.check('pauses again when filled',q.pouch.mem.length===2&&!!ui.recallBatch.paused);
      const index=w.localSeat.meta.items.findIndex(i=>i.uid!==q.pouch.uid);w.localSeat.meta.items.splice(index,1);
      q.beat();q.beat();q.check('finishes and retains reveal',!ui.recallBatch.active&&ui.recallOpen&&!w.memoryRecallView(w.localSeat,q.pouch.uid));
      q.check('spent control disabled',recallButton.disabled);
      q.plant(4,'preformed');q.check('facet required',recallButton.disabled);
      ui.recallMenu.querySelector('[data-mem-facet]').click();q.check('facet arms batch',!recallButton.disabled);
      recallButton.click();q.beat();q.check('facet stable while running',[...ui.recallMenu.querySelectorAll('[data-mem-facet]')].every(e=>e.disabled));
      ui.hideAll();q.beat();q.check('global close cancels',!ui.recallBatch.active&&q.pouch.mem.length===3);
      q.plant(5);ui.recallMenu.querySelector('[data-mem-recall]').click();q.check('individual recall still works',q.pouch.mem.length===4);
      ui.recallMenu.querySelector('[data-mem-find]').click();q.check('view in bag still works',!ui.recallOpen&&ui.inventoryOpen);
      const guest=w.addSeat('qa-recall-guest',w.localSeat.meta.classDef,w.localSeat.input);guest.couch={pad:1,side:'right'};
      const guestPouch={...structuredClone(q.fixtures.rough),uid:q.nextUid++,x:0,y:0,mem:[{d:'zombie',s:910},{d:'zombie',s:911}]};
      guest.meta.items=[guestPouch];ui.openInventory(guest.id);ui.showRecall(guestPouch.uid,guest.id);ui.folioSync();
      q.check('guest pane control reachable',q.hit(recallButton));recallButton.click();q.beat();
      q.check('guest automatic reveal stays with guest',guestPouch.mem.length===1&&q.pouch.mem.length===4&&w.memoryRecallLast.seat===guest.id);
      ui.hideAllFor(guest.id);q.beat();q.check('guest dismissal cancels batch',!ui.recallBatch.active&&!ui.recallOpen);
      q.check('no fatal errors',!__game.crash().fatal);
    })()`);
    log({ result: 'PASS', checks: await run('recallQA.checks') });
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
