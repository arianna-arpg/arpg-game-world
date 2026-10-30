// Hidden Chromium input regression: build first (an isolated output may be passed
// as argv[2]). Uses real mouse input so capture/retargeting/click order are tested.
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'tree-gestures-ui.log');
fs.writeFileSync(logfile, 'START\n');
const log = value => { console.log(value); fs.appendFileSync(logfile, JSON.stringify(value) + '\n'); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.setPath('userData', path.join(dir, 'tree-gestures-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({
    root: path.resolve(process.argv[2] || path.join(__dirname, '../dist')),
    savesDir: path.join(dir, 'tree-gestures-saves-' + process.pid),
  });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async code => {
    const result = await win.webContents.executeJavaScript(`(async()=>{try{return await (0,eval)(${JSON.stringify(code)});}catch(e){return {qaError:String(e.stack??e)};}})()`);
    if (result?.qaError) throw Error(result.qaError);
    return result;
  };
  let pressedButton = null;
  const input = async (type, p, button = 'left') => {
    if (type === 'mouseDown') pressedButton = button;
    if (type === 'mouseUp') pressedButton = null;
    win.webContents.sendInputEvent({ type, x: Math.round(p.x), y: Math.round(p.y), button, clickCount: 1,
      modifiers: pressedButton ? [pressedButton + 'ButtonDown'] : [] });
    await wait(35);
    await js('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  };
  const gesture = async (p, offsets, button = 'left') => {
    await input('mouseMove', p);
    await input('mouseDown', p, button);
    let end = p;
    for (const [x, y] of offsets) {
      end = { x: p.x + x, y: p.y + y };
      await input('mouseMove', end, button);
    }
    await input('mouseUp', end, button);
  };
  const setup = async () => {
    await js(`(() => {
      __game.account().ledger.prologue_lived=1;
      __game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world(),ui=__game.ui;
      w.player.invulnerable=true;w.meta.passivePoints=10;ui.toggleTree();
      ui.treeRefundMode=false;ui.centerTreeOnStart();ui.treeZoom=4;ui.refreshTree();
      window.gestureIntents=[];
      const request=w.requestMeta.bind(w);
      w.requestMeta=(intent)=>{gestureIntents.push(intent);return request(intent);};
      window.treeGestureState=()=>({box:document.querySelector('#tree-svg').getAttribute('viewBox'),
        points:w.meta.passivePoints,allocated:[...w.meta.allocated].sort(),choices:JSON.stringify(w.meta.choices),
        popup:!!document.querySelector('.choice-popup'),intents:gestureIntents.length});
      window.treeGestureTarget=(selector)=>{
        const svg=document.querySelector(selector.startsWith('.st-node')?'#skill-tree-cleave .st-svg':'#tree-svg'),b=svg.getBoundingClientRect();
        for(const el of svg.querySelectorAll(selector)){
          const r=el.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
          if(x>b.left+65&&x<b.right-65&&y>b.top+65&&y<b.bottom-65&&document.elementFromPoint(x,y)===el)
            return {x,y,id:el.dataset.node};
        }
        throw Error('No visible target: '+selector);
      };
    })()`);
    await wait(100);
  };
  const unchanged = (before, after) => {
    for (const key of ['points', 'allocated', 'choices', 'popup', 'intents'])
      assert.deepEqual(after[key], before[key], key + ' changed during navigation');
  };
  try {
    await win.loadURL(server.url);
    await js("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});void 0;");
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      for (const [name, selector] of [
        ['unavailable', '.tree-node:not(.available):not(.allocated)'],
        ['available', '.tree-node.available'],
        ['allocated', '.tree-node.allocated'],
      ]) {
        await setup();
        const p = await js(`treeGestureTarget(${JSON.stringify(selector)})`);
        const before = await js('treeGestureState()');
        await gesture(p, [[12, 8], [45, 24]]);
        const after = await js('treeGestureState()');
        assert.notEqual(after.box, before.box, name + ' node must allow panning');
        unchanged(before, after);
        log({ name, width, id: p.id, result: 'PASS' });
      }
      await setup();
      const p = await js('treeGestureTarget(".tree-node.available")');
      const before = await js('treeGestureState()');
      await gesture(p, [[1, 1], [2, 1]]);
      const after = await js('treeGestureState()');
      assert.equal(after.box, before.box, 'click jitter must not pan');
      assert(after.popup || after.points === before.points - 1, 'click still opens a choice or spends one point');
      log({ width, click: 'PASS' });

      // Reaching off a small node still selects the node its hover card names.
      await setup();
      const near = await js(`(() => {
        const p=treeGestureTarget('.tree-node.available:not([stroke-dasharray])');
        const r=document.querySelector('[data-node="'+p.id+'"]').getBoundingClientRect();
        const nodes=[...document.querySelectorAll('#tree-svg .tree-node')].map(el=>({el,r:el.getBoundingClientRect()}));
        for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){
          const x=Math.round(r.x+r.width/2+Math.cos(angle)*(r.width/2+3));
          const y=Math.round(r.y+r.height/2+Math.sin(angle)*(r.height/2+3));
          if(document.elementFromPoint(x,y)?.closest('.tree-node'))continue;
          const nearest=nodes.reduce((best,n)=>{
            const d=Math.hypot(x-n.r.x-n.r.width/2,y-n.r.y-n.r.height/2);
            return d<best.d?{d,id:n.el.dataset.node}:best;
          },{d:34,id:null});
          if(nearest.id===p.id)return {...p,x,y,center:{x:p.x,y:p.y}};
        }
        throw Error('No empty proximity point for '+p.id);
      })()`);
      await input('mouseMove', near.center);
      await input('mouseMove', near);
      await wait(60);
      await input('mouseMove', near);
      const anchor = await js("document.querySelector('#tree-svg .tt-anchor')?.dataset.node");
      assert.equal(anchor, near.id, 'near click must match the visible tooltip');
      assert.equal(await js(`document.elementFromPoint(${near.x},${near.y}).matches('.tree-node')`), false);
      const nearBefore = await js('treeGestureState()');
      await gesture(near, []);
      const nearAfter = await js('treeGestureState()');
      assert.equal(nearAfter.points, nearBefore.points - 1);
      assert(nearAfter.allocated.includes(near.id));

      // Even a drag that returns to its origin cannot open a choice popup.
      await setup();
      const choice = await js('treeGestureTarget(".tree-node.available[stroke-dasharray]")');
      const choiceBefore = await js('treeGestureState()');
      await gesture(choice, [[20, 10], [0, 0]]);
      unchanged(choiceBefore, await js('treeGestureState()'));
      const choiceNow = await js(`treeGestureTarget('.tree-node[data-node="${choice.id}"]')`);
      await gesture(choiceNow, []);
      const choiceAfter = await js('treeGestureState()');
      assert(choiceAfter.popup, 'the next deliberate choice click must work');
      assert.equal(choiceAfter.points, choiceBefore.points, 'opening choices does not spend');
      log({ width, proximityAndChoices: 'PASS' });

      // Refund mode uses the same gesture gate before sending its action.
      await setup();
      const refund = await js(`(() => {
        const w=__game.world(),ui=__game.ui;w.loadZone('lastlight');
        const f=w.fonts[0];w.player.pos={...f.pos};w.player.tier=f.tier||0;
        const p=treeGestureTarget('.tree-node.available:not([stroke-dasharray])');
        if(!w.allocateNode(p.id))throw Error('Could not prepare refundable node');
        ui.treeRefundMode=true;ui.refreshTree();return treeGestureTarget('.tree-node.allocated.available');
      })()`);
      const refundBefore = await js('treeGestureState()');
      await gesture(refund, [[18, 12], [0, 0]]);
      unchanged(refundBefore, await js('treeGestureState()'));
      const refundNow = await js(`treeGestureTarget('.tree-node[data-node="${refund.id}"]')`);
      await gesture(refundNow, []);
      assert.equal((await js('treeGestureState()')).points, refundBefore.points + 1);
      log({ width, refund: 'PASS' });

      await setup();
      await js(`(() => {
        const w=__game.world(),ui=__game.ui;ui.closeTree();
        w.account.memorySecondary.add('skill:cleave');w.account.ledger.odyssey_stage_2=1;
        const inst=w.meta.knownSkills.get('cleave');inst.level=20;
        ui.openSkillTree('cleave');const pane=ui.skillTreePanes.get('cleave');
        const node=pane.el.querySelector('.st-node.available'),b=pane.box;
        if(!node)throw Error('No skill points available');
        pane.zoom=2;pane.pan={x:+node.getAttribute('cx')-b.minX-b.w/2,y:+node.getAttribute('cy')-b.minY-b.h/2};
        ui.refreshSkillTree('cleave');ui.folioSync();
        window.skillGestureState=()=>({box:document.querySelector('#skill-tree-cleave .st-svg').getAttribute('viewBox'),
          spent:JSON.stringify(inst.treeNodes||[]),intents:gestureIntents.length});
      })()`);
      await wait(100);
      const skill = await js('treeGestureTarget(".st-node.available")');
      const skillBefore = await js('skillGestureState()');
      await gesture(skill, [[18, 8], [0, 0]]);
      const skillAfter = await js('skillGestureState()');
      assert.equal(skillAfter.spent, skillBefore.spent);
      assert.equal(skillAfter.intents, skillBefore.intents);
      const skillNow = await js(`treeGestureTarget('.st-node[data-node="${skill.id}"]')`);
      await gesture(skillNow, [[1, 1]]);
      assert.notEqual((await js('skillGestureState()')).spent, skillBefore.spent);
      log({ width, skillTree: 'PASS' });
    }

    // Small shared-handler fixture: actual browser capture + configurable
    // movement tolerance, plus synthetic controller/touch cancellation paths.
    const gestures = buildSync({ entryPoints: [path.resolve(__dirname, '../src/ui/panzoom.ts')],
      bundle: true, write: false, platform: 'browser', format: 'iife', globalName: '__gestures' }).outputFiles[0].text;
    await js(`${gestures}\nwindow.gestures=__gestures;void 0;`);
    const fixture = async () => {
      await js(`(() => {
        document.querySelector('#gesture-fixture')?.remove();
        const host=document.createElement('div');host.id='gesture-fixture';
        host.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#111';
        host.innerHTML='<svg width="500" height="300" viewBox="0 0 500 300" style="touch-action:none"><circle id="gesture-node" cx="150" cy="140" r="20"/><circle class="owned-drag" cx="340" cy="140" r="20"/></svg>';
        document.body.append(host);const svg=host.firstChild,node=svg.firstChild,owned=svg.lastChild;
        window.gestureFixture={pan:[0,0],clicks:0,owned:0,held:[],zoom:1};const q=gestureFixture;
        node.addEventListener('click',()=>q.clicks++);owned.addEventListener('click',()=>q.owned++);
        gestures.attachPanZoom(svg,{getZoom:()=>q.zoom,setZoom:z=>q.zoom=z,box:()=>({w:500,h:300}),
          panBy:(x,y)=>{q.pan[0]+=x;q.pan[1]+=y;},apply:()=>{},ignore:'.owned-drag',onDragState:d=>q.held.push(d)},
          {...gestures.PANZOOM_DEFAULTS,dragThresholdPx:8});
        window.fixturePointer=(type,values={})=>node.dispatchEvent(new PointerEvent(type,
          {bubbles:true,cancelable:true,pointerId:41,pointerType:'touch',button:0,buttons:1,clientX:150,clientY:140,...values}));
      })()`);
    };
    await fixture();
    await gesture({ x: 150, y: 140 }, [[6, 0]]);
    assert.deepEqual(await js('gestureFixture.pan'), [0, 0]);
    assert.equal(await js('gestureFixture.clicks'), 1, 'custom tolerance must apply');
    await gesture({ x: 150, y: 140 }, [[15, 0], [0, 0]]);
    assert.equal(await js('gestureFixture.clicks'), 1, 'child handler must not receive a drag-ending click');
    await gesture({ x: 150, y: 140 }, [[40, 0]], 'right');
    assert.deepEqual(await js('gestureFixture.pan'), [0, 0], 'right button is not a pan');
    await gesture({ x: 150, y: 140 }, [[40, 0]], 'middle');
    assert.deepEqual(await js('gestureFixture.pan'), [-40, 0]);
    await gesture({ x: 340, y: 140 }, []);
    assert.equal(await js('gestureFixture.owned'), 1, 'ignored editor/waypoint target keeps its click');
    await fixture();
    await gesture({ x: 150, y: 140 }, [[420, 0]]);
    assert.deepEqual(await js('gestureFixture.pan'), [-420, 0], 'capture must retain movement outside the SVG');
    assert.equal(await js('gestureFixture.clicks'), 0);
    for (const end of ['pointercancel', 'lostpointercapture', 'chord', 'release-distance', 'wheel']) {
      await fixture();
      await js(`(() => {
        fixturePointer('pointerdown');
        fixturePointer('pointermove',{pointerId:42,clientX:190});
        fixturePointer('pointerup',{pointerId:42,buttons:0});
        if(${JSON.stringify(end)}==='chord')fixturePointer('pointermove',{clientX:190,buttons:4});
        else if(${JSON.stringify(end)}==='wheel')document.querySelector('#gesture-node').dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-100}));
        else fixturePointer(${JSON.stringify(end === 'release-distance' ? 'pointerup' : end)},
          ${end === 'release-distance' ? '{clientX:190,buttons:0}' : '{}'});
        document.querySelector('#gesture-node').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      })()`);
      const q = await js('gestureFixture');
      assert.equal(q.clicks, 0, end + ' must suppress activation');
      assert.deepEqual(q.held, [true, false], 'unrelated pointer cannot finish the gesture');
      assert.deepEqual(q.pan, end === 'release-distance' ? [-40, 0] : [0, 0]);
      await gesture({ x: 150, y: 140 }, []);
      assert.equal(await js('gestureFixture.clicks'), 1, 'a fresh click must recover after ' + end);
    }
    log('Shared gesture capture, button discipline, cancellation, pointer ownership and configurable tolerance PASS');
    await win.loadURL(server.url+'?dev=editor');
    await setup();
    const editorNode = await js('treeGestureTarget(".tree-node")');
    const editorState = () => js(`(() => {
      const node=document.querySelector('.tree-node[data-node="${editorNode.id}"]');
      return {x:node.getAttribute('cx'),y:node.getAttribute('cy'),...treeGestureState()};
    })()`);
    const editorBefore = await editorState();
    await gesture(editorNode, [[20, 12]]);
    const editorAfter = await editorState();
    assert.notEqual(editorAfter.x, editorBefore.x, 'editor drag must still move the authored node');
    assert.equal(editorAfter.box, editorBefore.box, 'editor node drag must not pan');
    unchanged(editorBefore, editorAfter);
    log('Editor node-position drag PASS');
    assert.equal(await js('__game.crash().fatal'), null);
    log('TREE GESTURES UI PASS');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  } catch (error) {
    log({ error: String(error.stack || error) });
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(1);
  }
});
